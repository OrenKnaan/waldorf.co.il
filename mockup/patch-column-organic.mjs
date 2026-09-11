/* Two site-wide design changes, in one reversible pass.

   1. The page is a centred 1200px column again, not edge to edge. One token,
      --page-max, drives the header row, the menu row and main, so the three can
      never drift apart. search.js's panel reads it too: its own comment says
      that uncommenting main's cap means uncommenting the panel's, or the panel
      floats away from the button it belongs to.

   2. Round corners are gone. The site already had an "organic" radius family -
      four corners, each a different ellipse - used on the breadcrumb bar, the
      chips and the buttons. --radius and --radius-lg now point at that family,
      which converts every card, panel, field, table and thumbnail across the
      pages AND the scripts in one move, because they all go through the tokens.

   Only the things the tokens cannot reach are touched by hand: the nav dropdown
   (a 4-value radius cannot be dropped into a shorthand slot, so it gets its own
   token), the mobile 14px overrides, the accessibility panel (styled in px on
   purpose - see CLAUDE.md), and two one-off literals in the scripts.

   Circles (50%), pills (--radius-pill, 999px) and hairline radii (2-4px: the
   focus ring, the hamburger bars, the scrollbar thumb) are deliberately left
   alone. A pill toggle that is not a pill is broken, not restyled.

   Set ENABLED = false and re-run to strip all of it back out. */

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ENABLED = true;

const pagesDir = join(dirname(fileURLToPath(import.meta.url)), 'pages');

/* Each rule is [from, to, expected occurrences per file]. Applied forwards when
   ENABLED, backwards when not, so the pair is also the documentation. */

const TOKENS_FROM = '    --radius:8px;--radius-lg:18px;--radius-pill:999px;\n';
const TOKENS_TO =
  '    /* Round corners retired site-wide: these two now point at the organic\n' +
  '       family below, so every card, field, panel and thumbnail follows. */\n' +
  '    --radius:var(--radius-organic-sm);--radius-lg:var(--radius-organic-lg);--radius-pill:999px;\n' +
  '    /* The page is a centred column, not edge to edge. The header row, the\n' +
  '       menu row and main all read this, so they cannot drift apart. */\n' +
  '    --page-max:1200px;\n';

const ORGANIC_FROM = '  --radius-organic-lg: 30px 58px 26px 52px / 52px 26px 60px 30px;\n';
const ORGANIC_TO = ORGANIC_FROM +
  '  /* The nav dropdown hangs off the menu row: square where the two meet, the\n' +
  '     organic shape only on the two free corners. A 4-value radius cannot be\n' +
  '     substituted into a shorthand slot, so the whole value is a token. */\n' +
  '  --radius-organic-bottom: 0 0 14px 26px / 0 0 30px 16px;\n';

const PAGE_RULES = [
  [TOKENS_FROM, TOKENS_TO, 1],
  [ORGANIC_FROM, ORGANIC_TO, 1],

  // ---- the 1200px column ----
  ['.brand-row{/* max-width:960px; */margin:0 auto',
   '.brand-row{max-width:var(--page-max);margin:0 auto', 1],
  ['.primary-nav{display:flex;flex-wrap:wrap;gap:2px;/* max-width:960px; */margin:0 auto',
   '.primary-nav{display:flex;flex-wrap:wrap;gap:2px;max-width:var(--page-max);margin:0 auto', 1],
  ['  main{/* max-width:760px; */margin:0 auto',
   '  main{max-width:var(--page-max);margin:0 auto', 1],

  // ---- organic corners the tokens cannot reach ----
  ['border-radius:0 0 var(--radius-lg) var(--radius-lg);min-width:252px;z-index:20;padding:8px 0;',
   'border-radius:var(--radius-organic-bottom);min-width:252px;z-index:20;padding:8px 0 12px;', 1],
  // The mobile step-downs of section.card, .pagebanner and .art-hero. A 58px
  // lobe is too big for a 320px screen, so these take the middle scale.
  ['border-radius:14px', 'border-radius:var(--radius-organic)', 3],
  // The picture frame inside the art band; the only literal 8px on the pages.
  ['border-radius:8px', 'border-radius:var(--radius-organic-sm)', 1],

  // ---- the art band, taller ----
  ['.art-hero{position:relative;height:300px;', '.art-hero{position:relative;height:400px;', 1],
];

const SCRIPT_RULES = {
  'search.js': [
    // The panel shares .primary-nav's geometry so its inline-end edge lands
    // under the button. See the comment above this line in the file.
    ["'.wsearch-inner{/* max-width:960px; */margin:0 auto",
     "'.wsearch-inner{max-width:var(--page-max,1200px);margin:0 auto", 1],
    ["'  border-radius:0 0 var(--radius-lg,18px) var(--radius-lg,18px);',",
     "'  border-radius:var(--radius-organic-bottom,0 0 14px 26px / 0 0 30px 16px);',", 1],
  ],
  'accessibility.js': [
    // Hard-coded px on purpose: this panel has to stay usable while the
    // adjustments it controls are rewriting the tokens. So the organic shapes
    // are written out here rather than referenced.
    ['border-radius:0 0 12px 12px', 'border-radius:0 0 10px 19px / 0 0 22px 11px', 1],
    ['border-radius:18px;box-shadow:0 18px 48px',
     'border-radius:22px 44px 20px 40px / 40px 20px 46px 22px;box-shadow:0 18px 48px', 1],
    ['border-radius:18px 18px 0 0', 'border-radius:22px 44px 0 0 / 40px 20px 0 0', 1],
    ['border-radius:0 0 18px 18px', 'border-radius:0 0 20px 40px / 0 0 46px 22px', 1],
    // 34px buttons; the sm scale's 21px lobe would swallow them.
    ['border-radius:9px', 'border-radius:6px 12px 5px 11px / 11px 5px 13px 6px', 2],
    ['border-radius:12px;background:#fff', 'border-radius:11px 21px 10px 19px / 19px 10px 22px 11px;background:#fff', 1],
  ],
  'dynamic.js': [
    ['border-radius:13px', 'border-radius:var(--radius-organic-sm)', 1],
  ],
  'library.js': [
    ['border-radius:6px', 'border-radius:var(--radius-organic-sm)', 1],
  ],
};

/* The hero on the homepage is the one thing that must stay edge to edge: a
   full-height photograph with the site header floating on it reads as a band of
   the window, not a card in a column. main is a 1200px column now, so the
   bleed has to clear the column's gutter AND the space beside the column.
   100vw counts the scrollbar, which is why hero.js overwrites --hero-side from
   clientWidth; this declaration is the no-JS fallback. */
const HERO_FROM = '  body.has-hero{--hero-shade:27,18,10;--gutter:clamp(20px,3.4vw,72px);--hero-bleed:var(--gutter);\n';
const HERO_TO =
  '  body.has-hero{--hero-shade:27,18,10;--gutter:clamp(20px,3.4vw,72px);\n' +
  '    --hero-side:max(0px,(100vw - var(--page-max)) / 2);\n' +
  '    --hero-bleed:calc(var(--gutter) + var(--hero-side));\n';

const HERO_JS_FROM = '  var index = 0;\n';
const HERO_JS_TO =
  '  /* The hero reaches the window edge while main is a centred 1200px column,\n' +
  '     so the bleed is the column gutter plus whatever is left beside it. The\n' +
  '     CSS fallback uses 100vw, which counts the scrollbar and so overshoots by\n' +
  '     half its width; clientWidth does not. Declared on body, which is where\n' +
  '     the stylesheet declares it, or the rule there would win. */\n' +
  '  function setHeroSide() {\n' +
  '    var cs = getComputedStyle(document.documentElement);\n' +
  '    var max = parseFloat(cs.getPropertyValue(\'--page-max\')) || 0;\n' +
  '    var free = (document.documentElement.clientWidth - max) / 2;\n' +
  '    document.body.style.setProperty(\'--hero-side\', Math.max(0, free) + \'px\');\n' +
  '  }\n' +
  '  setHeroSide();\n' +
  '  window.addEventListener(\'resize\', setHeroSide);\n' +
  '\n' +
  '  var index = 0;\n';

function apply(text, rules, label) {
  for (const [from, to, n] of rules) {
    const a = ENABLED ? from : to;
    const b = ENABLED ? to : from;
    // Idempotency, in both directions. Several replacements keep the text they
    // replace (the token block gains a sibling line rather than losing one), so
    // "a is still present" does not mean "not yet applied": the test is whether
    // the finished form is there.
    const haveB = text.split(b).length - 1;
    if (haveB >= n && b.includes(a)) continue;
    const have = text.split(a).length - 1;
    if (have === 0 && haveB >= n) continue;
    if (have !== n) throw new Error(`${label}: expected ${n} of ${JSON.stringify(a.slice(0, 60))}, found ${have}`);
    text = text.split(a).join(b);
  }
  return text;
}

let pages = 0;
for (const f of readdirSync(pagesDir).filter((f) => f.endsWith('.html'))) {
  if (f === 'index.html') continue; // a meta-refresh stub, no stylesheet
  const p = join(pagesDir, f);
  const before = readFileSync(p, 'utf8');
  let after = apply(before, PAGE_RULES, f);
  if (f === 'home.html' || f === 'home-hero-light.html') after = apply(after, [[HERO_FROM, HERO_TO, 1]], f);
  if (after !== before) { writeFileSync(p, after); pages++; }
}

let scripts = 0;
for (const [f, rules] of Object.entries(SCRIPT_RULES)) {
  const p = join(pagesDir, f);
  const before = readFileSync(p, 'utf8');
  const after = apply(before, rules, f);
  if (after !== before) { writeFileSync(p, after); scripts++; }
}

const heroPath = join(pagesDir, 'hero.js');
const heroBefore = readFileSync(heroPath, 'utf8');
const heroAfter = apply(heroBefore, [[HERO_JS_FROM, HERO_JS_TO, 1]], 'hero.js');
if (heroAfter !== heroBefore) writeFileSync(heroPath, heroAfter);

console.log(`${ENABLED ? 'applied' : 'reverted'}: ${pages} pages, ${scripts} scripts, hero.js ${heroAfter !== heroBefore ? 'changed' : 'unchanged'}`);
