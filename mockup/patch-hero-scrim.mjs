// Strengthens the art-hero scrim so the white caption clears WCAG 1.4.3 on any
// photograph, at any viewport. Idempotent - safe to re-run. ENABLED = false
// puts the three rules back the way they were.
//
// Two separate failures are being fixed here.
//
// The base .art-hero::after ran its gradient at 90deg, dark at 0% and clear by
// 70%, which darkens the LEFT of the band. The caption is align-self:flex-end
// inside an RTL flex row, so it sits on the RIGHT, in the part the scrim had
// already faded out of. Measured on accessibility-statement.html - the page
// Israeli regulations require - the caption read 1.41:1 at 375px with every
// glyph pixel under the threshold. A linear-gradient angle is not flipped by
// `direction`, so this was never going to work on an RTL page.
//
// The 41 slideshow pages do anchor their radial at the caption corner, but it
// is a percentage of a box that shrinks to 255px tall: at 375px the caption
// reached past the dark core and onto the bare photo. Every one of the 41
// failed at 375px on at least one of the eight slides, worst 1.65:1, and 21 of
// them failed at 600px too.
//
// The fix both rules now share is a band measured in px, not percentages, so
// it tracks the caption rather than the hero's height - the same shape
// home.html's .hero-veil already uses, which is why that hero measured clean
// across all five slides and four widths while this one did not. .82 alpha of
// rgb(20,10,8) over a pure white photo composites to #3E3634, which carries
// white at 11.8:1; the floor holds even if a future image is brighter than
// anything in img/hero today.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ENABLED = true;
const pagesDir = join(dirname(fileURLToPath(import.meta.url)), 'pages');

// Declared on .art-hero rather than :root so it rides along with the rule that
// is already in every file, and inherits down into all three ::after rules.
const BAND = 'linear-gradient(to top,rgba(20,10,8,.9) 0,rgba(20,10,8,.82) 64px,rgba(20,10,8,.46) 118px,rgba(20,10,8,0) 180px)';
const TOKEN = `--cap-scrim:${BAND};`;

const EDITS = [
  { name: 'token',
    from: '.art-hero{position:relative;height:400px;',
    to:   `.art-hero{${TOKEN}position:relative;height:400px;` },

  { name: 'base scrim',
    from: '.art-hero::after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,rgba(61,43,31,.62) 0%,rgba(61,43,31,.18) 46%,rgba(61,43,31,0) 70%)}',
    to:   '.art-hero::after{content:"";position:absolute;inset:0;background:var(--cap-scrim),radial-gradient(70% 88% at 100% 100%,rgba(20,10,8,.62) 0%,rgba(20,10,8,.34) 34%,rgba(20,10,8,.12) 56%,transparent 74%)}' },

  { name: 'alt1 scrim',
    from: '.art-hero::after{background:linear-gradient(90deg,rgba(84,24,28,.82) 0%,rgba(84,24,28,.44) 48%,rgba(84,24,28,.10) 78%)}',
    to:   '.art-hero::after{background:var(--cap-scrim),radial-gradient(70% 88% at 100% 100%,rgba(84,24,28,.70) 0%,rgba(84,24,28,.38) 34%,rgba(84,24,28,.14) 56%,transparent 74%)}' },

  { name: 'slideshow scrim',
    from: '.art-hero.slideshow::after{background:radial-gradient(70% 88% at 100% 100%,',
    to:   '.art-hero.slideshow::after{background:var(--cap-scrim),radial-gradient(70% 88% at 100% 100%,' },

  { name: 'slideshow scrim (<=720px)',
    from: '.art-hero.slideshow::after{background:radial-gradient(78% 92% at 100% 100%,',
    to:   '.art-hero.slideshow::after{background:var(--cap-scrim),radial-gradient(78% 92% at 100% 100%,' },
];

let touched = 0;
const tally = new Map();
for (const file of readdirSync(pagesDir).filter(f => f.endsWith('.html'))) {
  const path = join(pagesDir, file);
  const before = readFileSync(path, 'utf8');
  let html = before;
  for (const e of EDITS) {
    const [from, to] = ENABLED ? [e.from, e.to] : [e.to, e.from];
    if (!html.includes(from)) continue;
    html = html.split(from).join(to);
    tally.set(e.name, (tally.get(e.name) || 0) + 1);
  }
  if (html !== before) { writeFileSync(path, html); touched++; }
}

console.log(ENABLED ? 'patch-hero-scrim: applied' : 'patch-hero-scrim: reverted');
for (const e of EDITS) console.log(`  ${e.name.padEnd(26)} ${tally.get(e.name) || 0} page(s)`);
console.log(`  ${String(touched).padStart(3)} file(s) rewritten`);
