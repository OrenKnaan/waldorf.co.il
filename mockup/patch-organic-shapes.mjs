// Replaces the capsule (999px) background shape on buttons, tabs and labels with
// the organic hand-drawn shape the `.ph` notes already used. Idempotent.
//
//   node mockup/patch-organic-shapes.mjs
//
// Why: the capsule is a mechanical form. The asymmetric elliptical radius reads
// as drawn rather than generated, which is the register the rest of this site
// works in — the veil paintings, the Antropos title face, the wash gradients.
// The shape was already in the design, just quarantined on editorial notes.
//
// Deliberately NOT converted:
//   * .an-bar-track / .an-bar-fill — analytics bars. A measurement should look
//     measured; wobbling its ends makes the value look approximate.
//   * .scroll-top-btn, avatars, status dots — true circles (50%), unaffected.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const pagesDir = join(dirname(fileURLToPath(import.meta.url)), 'pages');

// Three sizes so the curvature stays proportional to the element. Browsers
// scale radii down when they would overlap, so a too-large value degrades into
// a rounder blob rather than breaking — but choosing per size keeps the
// asymmetry visible instead of clamped away.
// Repeating one asymmetric shape across a row reads as a skewed template rather
// than something drawn — the eye picks up the identical lean immediately. Three
// variants cycled by position break that up; each is the same family, just
// mirrored/rotated, so the row still feels like one hand.
const VARIANTS = `
  .chip-row .chip:nth-child(3n+2),.dyn-meta .dyn-chip:nth-child(3n+2){
    border-radius:19px 10px 22px 11px / 11px 21px 10px 19px}
  .chip-row .chip:nth-child(3n+3),.dyn-meta .dyn-chip:nth-child(3n+3){
    border-radius:10px 19px 11px 22px / 21px 11px 19px 10px}
  .btn-row .btn:nth-child(2n),.actions .btn:nth-child(2n){
    border-radius:40px 20px 46px 22px / 22px 44px 20px 40px}`;

const TOKENS = `
  --radius-organic-sm: 11px 21px 10px 19px / 19px 10px 22px 11px;
  --radius-organic: 22px 44px 20px 40px / 40px 20px 46px 22px;
  --radius-organic-lg: 30px 58px 26px 52px / 52px 26px 60px 30px;`;

// selector -> which size. Matched against the rule's own text so a selector
// that never used the pill token is left alone.
const TARGETS = [
  ['.btn', '--radius-organic'],
  ['.tab-btn', '--radius-organic'],
  ['.chip', '--radius-organic-sm'],
  ['.pending-badge', '--radius-organic-sm'],
  ['.ecard .thumb .tagpin', '--radius-organic-sm'],
  ['.ph-image span', '--radius-organic-sm'],
  ['.pagebanner', '--radius-organic-lg'],
];

let patched = 0;
for (const file of readdirSync(pagesDir).filter((f) => f.endsWith('.html'))) {
  const path = join(pagesDir, file);
  let html = readFileSync(path, 'utf8');
  const before = html;

  if (!html.includes('--radius-organic:')) {
    html = html.replace(/(--radius-pill:\s*999px;)/, `$1${TOKENS}`);
  }
  if (!html.includes('.chip-row .chip:nth-child(3n+2)')) {
    html = html.replace('\n  /* ===== responsive ===== */', `${VARIANTS}\n  /* ===== responsive ===== */`);
  }

  for (const [sel, token] of TARGETS) {
    // Rewrite only inside that selector's own rule block.
    const re = new RegExp(`(${sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\{[^}]*?border-radius:)var\\(--radius-pill\\)`, 'g');
    html = html.replace(re, `$1var(${token})`);
  }

  if (html !== before) { writeFileSync(path, html, 'utf8'); patched += 1; }
}
console.log(`Organic shape applied on ${patched} page(s).`);
