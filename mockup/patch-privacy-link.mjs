// Adds the "מדיניות פרטיות" link to the footer of every page, after "הצהרת נגישות".
// Idempotent — safe to re-run.
//
//   node mockup/patch-privacy-link.mjs
//
// Set ENABLED = false and re-run to strip the link back out.
//
// The footer is patched in place, like the nav, rather than regenerated: each
// page carries its own copy of it. Pages without the accessibility link
// (index.html, the shape-test fragment) have no footer to add to and are skipped.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ENABLED = true;

const pagesDir = join(dirname(fileURLToPath(import.meta.url)), 'pages');

const ANCHOR = '<a class="footer-a11y" href="./accessibility-statement.html">הצהרת נגישות</a>';
const LINK =
  '<span class="footer-sep" aria-hidden="true"> · </span>' +
  '<a class="footer-privacy" href="./privacy.html">מדיניות פרטיות</a>';

let changed = 0, unchanged = 0;
const skipped = [];

for (const file of readdirSync(pagesDir).filter((f) => f.endsWith('.html'))) {
  const path = join(pagesDir, file);
  const html = readFileSync(path, 'utf8');
  if (!html.includes(ANCHOR)) { skipped.push(file); continue; }
  const has = html.includes(ANCHOR + LINK);
  let out = html;
  if (ENABLED && !has) out = html.replace(ANCHOR, ANCHOR + LINK);
  if (!ENABLED && has) out = html.replace(ANCHOR + LINK, ANCHOR);
  if (out === html) { unchanged++; continue; }
  writeFileSync(path, out);
  changed++;
}

console.log(`${changed} file(s) rewritten, ${unchanged} unchanged`);
if (skipped.length) console.log(`skipped (no footer link): ${skipped.join(', ')}`);
