// Wires the global search into every mockup page, in place, without
// regenerating them. Idempotent, safe to re-run.
//
//   node mockup/patch-search.mjs        # then: node mockup/search-index.mjs
//
// Two edits, each guarded so a second run is a genuine no-op:
//
//   1. search.js in <head>, deferred. Unlike accessibility.js it has nothing to
//      apply before first paint, and it inserts its own button, so there is no
//      reason to block parsing for it.
//   2. id="sec-…" on every <h2> that lacks one. The <h2> cards are the sections
//      the index is built from, and without an anchor a result can only drop
//      the visitor at the top of a page that may run to several screens.
//
// Run order matters: this patcher owns the anchors, and search-index.mjs reads
// the ids back out of the HTML rather than recomputing them. Add a page, patch,
// then rebuild the index. Rebuilding the index first just costs those sections
// their deep links until the next run.
//
// Setting ENABLED to false and re-running strips both edits back out.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ENABLED = true;

const pagesDir = join(dirname(fileURLToPath(import.meta.url)), 'pages');

const SCRIPT_TAG = '<script src="./search.js" defer></script>';
const SCRIPT_RE = /\n?<script src="\.\/search\.js" defer><\/script>/;

// Only ids this patcher wrote, so a hand-written anchor on some <h2> survives
// a disable-and-re-run instead of being swept away with ours.
const OUR_ID_RE = / id="sec-[0-9a-z]+(?:-\d+)?"/g;

// Short ASCII anchor derived from the heading text. A Hebrew id is legal, but
// it percent-encodes into a 60-character fragment in the address bar, so hash
// instead. FNV-1a: stable across runs, no dependency, short output.
function sectionId(heading) {
  let h = 0x811c9dc5;
  for (let i = 0; i < heading.length; i += 1) {
    h ^= heading.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return `sec-${h.toString(36)}`;
}

// The heading as a reader sees it: the icon and any inline markup gone.
function headingText(inner) {
  return inner
    .replace(/<svg[\s\S]*?<\/svg>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

let changed = 0;
let unchanged = 0;
let anchors = 0;
const skipped = [];

for (const file of readdirSync(pagesDir).filter((f) => f.endsWith('.html'))) {
  const path = join(pagesDir, file);
  const html = readFileSync(path, 'utf8');

  // index.html is a meta-refresh stub: no header to hang the button on and no
  // content to find.
  if (!html.includes('<main')) {
    skipped.push(file);
    continue;
  }

  // Strip ours first, then re-add. A changed hash is then an update rather
  // than a second id on the same element.
  let next = html.replace(SCRIPT_RE, '').replace(/<h2([^>]*)>/g, (m, attrs) => `<h2${attrs.replace(OUR_ID_RE, '')}>`);

  if (ENABLED) {
    if (!next.includes('</head>')) throw new Error(`${file}: no </head> to anchor the script to`);
    next = next.replace('</head>', `${SCRIPT_TAG}\n</head>`);

    // Two cards headed "רקע" on one page would otherwise claim the same id and
    // the browser would send every result for either to the first.
    const seen = new Map();
    next = next.replace(/<h2([^>]*)>([\s\S]*?)<\/h2>/g, (match, attrs, inner) => {
      if (/\sid=/.test(attrs)) return match;
      // A visually-hidden heading exists to repair the outline for screen
      // readers, not to name a place on the page. Anchoring a search result to
      // one would send the visitor to a heading they cannot see.
      if (/\bclass="[^"]*\bsr-only\b/.test(attrs)) return match;
      const text = headingText(inner);
      if (!text) return match;
      const base = sectionId(text);
      const n = (seen.get(base) || 0) + 1;
      seen.set(base, n);
      anchors += 1;
      return `<h2${attrs} id="${n === 1 ? base : `${base}-${n}`}">${inner}</h2>`;
    });
  }

  if (next === html) { unchanged += 1; continue; }
  writeFileSync(path, next, 'utf8');
  changed += 1;
}

const verb = ENABLED ? 'wired into' : 'stripped from';
console.log(`Search ${verb} ${changed} page(s), ${unchanged} already up to date.`);
if (ENABLED) console.log(`${anchors} section anchor(s) written. Now run: node mockup/search-index.mjs`);
if (skipped.length) console.log(`Skipped (no <main>): ${skipped.join(', ')}`);
