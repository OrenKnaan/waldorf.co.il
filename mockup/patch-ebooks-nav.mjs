// Adds the "ספרים אלקטרוניים" entry to the "מידע ומשאבים" dropdown of every
// page, right after "ספריית תוכן". Idempotent, same pattern as
// patch-associations-nav.mjs: set ENABLED = false and re-run to strip it back
// out.
//
//   node mockup/patch-ebooks-nav.mjs
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ENABLED = true;

const pagesDir = join(dirname(fileURLToPath(import.meta.url)), 'pages');

const ANCHOR = '<a class="dropdown-link" href="./content-library.html">ספריית תוכן</a>\n';
const LINK = '<a class="dropdown-link" href="./ebooks.html">ספרים אלקטרוניים</a>\n';
const BLOCK = ANCHOR + LINK;

// The inline nav script lights the parent "מידע ומשאבים" tab by matching the
// filename against a group regex. Without "ebooks" in it, ebooks.html itself
// loses the "you are here" cue.
const GRP_OLD = '/^(news|content-library|media|community-board|job-board|links)/';
const GRP_NEW = '/^(news|content-library|ebooks|media|community-board|job-board|links)/';

let placed = 0, already = 0, removed = 0, skipped = [], regrouped = 0;

for (const file of readdirSync(pagesDir).filter((f) => f.endsWith('.html'))) {
  const path = join(pagesDir, file);
  let html = readFileSync(path, 'utf8');
  const before = html;

  const hadBlock = html.includes(BLOCK);

  if (ENABLED) {
    if (hadBlock) already += 1;
    else if (html.includes(ANCHOR)) { html = html.replace(ANCHOR, BLOCK); placed += 1; }
    else skipped.push(file);
  } else if (hadBlock) {
    html = html.replace(BLOCK, ANCHOR);
    removed += 1;
  }

  const beforeGrp = html;
  html = ENABLED ? html.split(GRP_OLD).join(GRP_NEW) : html.split(GRP_NEW).join(GRP_OLD);
  if (html !== beforeGrp) regrouped += 1;

  if (html !== before) writeFileSync(path, html);
}

console.log(
  ENABLED
    ? `Nav entry: ${placed} added, ${already} already had it.`
    : `Nav entry removed from ${removed} page(s).`
);
if (regrouped) console.log(`Nav group regex updated on ${regrouped} page(s).`);
if (skipped.length) console.log(`Skipped (no "ספריית תוכן" link): ${skipped.join(', ')}`);
