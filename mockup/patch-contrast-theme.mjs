/* Raises the contrast of the site's surfaces across every page.

   The page background and the cards shipped at #FAF6F0 and #FFFFFF, which is
   1.07:1 - the cards had no edge to read. This drops the background onto a
   warmer, deeper sand, lifts the cards to a warm off-white, and gives them a
   border that is actually visible.

   The three values are changed in :root rather than on <body>. That matters:
   high-contrast mode redefines the same tokens on <html>, and html.a11y-contrast
   (0,1,1) outranks :root (0,1,0), so the accessibility mode still wins. Setting
   them on <body> instead shadows it for the whole page and silently breaks that
   mode - which is exactly what happened when this theme was first tried scoped
   to body.has-hero.

   Idempotent. Set ENABLED = false and re-run to strip it back out.

       node mockup/patch-contrast-theme.mjs
*/
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ENABLED = true;
const pagesDir = 'mockup/pages';

// [token, shipped value, raised value]
const TOKENS = [
  ['--cream', '#FAF6F0', '#E9DFCE'],   // page background
  ['--white', '#FFFFFF', '#FFFDF9'],   // cards, dropdowns, the search panel
  // #7A6555 is 4.20:1 on the deeper background and is used for the intro
  // paragraph on every page, which sits directly on it.
  ['--text-muted', '#7A6555', '#6B5A49'],
];

const OPEN = '  /* ===== contrast theme (patch-contrast-theme.mjs) ===== */';
const CLOSE = '  /* ===== end contrast theme ===== */';
const BLOCK = [
  OPEN,
  '  /* --tan-dark is 3.16:1 against the card, so the edge is a real one rather',
  '     than a suggestion. --tan sits at 2.25:1 and reads as a smudge. */',
  '  section.card{border:1px solid var(--tan-dark)}',
  '  .ecard{border-color:var(--tan-dark)}',
  '  .stat{border-color:var(--tan-dark)}',
  '  h2{border-bottom-color:var(--tan)}',
  '  .table-wrap table th{border-bottom-color:var(--tan-dark)}',
  CLOSE,
  '',
].join('\n');

const MARK = '  /* ===== responsive ===== */';

let touched = 0;
const skipped = [];
for (const file of readdirSync(pagesDir).filter((f) => f.endsWith('.html')).sort()) {
  const path = join(pagesDir, file);
  const src = readFileSync(path, 'utf8');
  let out = src;

  for (const [name, shipped, raised] of TOKENS) {
    const from = ENABLED ? `${name}:${shipped}` : `${name}:${raised}`;
    const to = ENABLED ? `${name}:${raised}` : `${name}:${shipped}`;
    if (out.includes(from)) out = out.split(from).join(to);
  }

  // the block, inserted before the marker patch-responsive.mjs rewrites
  const start = out.indexOf(OPEN);
  if (start !== -1) {
    const end = out.indexOf(CLOSE, start) + CLOSE.length + 1;
    out = out.slice(0, start) + out.slice(end);
  }
  if (ENABLED && out.includes(MARK)) out = out.replace(MARK, BLOCK + MARK);

  if (out === src) { skipped.push(file); continue; }
  writeFileSync(path, out);
  touched++;
}

console.log(`${ENABLED ? 'applied to' : 'stripped from'} ${touched} pages`);
if (skipped.length) console.log(`unchanged: ${skipped.join(', ')}`);
