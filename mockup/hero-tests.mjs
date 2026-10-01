/* TEMPORARY: hero-slideshow layout exploration, an item for the cutover inventory.
   Builds mockup/pages/forum-hero-full.html and forum-hero-inset.html from
   forum.html: same content, two ways of laying out the art-hero slideshow.

   full   the slides run edge to edge, from the bottom of the header to both sides
          of the viewport, square-cornered.
   inset  the slides stop 10px under the header and 100px from the sides, rounded,
          and the breadcrumb pill rests on top of the slide.

   Both: the painting caption is gone and the page title (the <h1>) sits inside the
   slide, bottom-centre; text containers are tinted from the page's watercolour
   colour; and <main> is as wide as the slides' margins, 100px a side.

   The breadcrumb is positioned the way it is because breadcrumb.js looks for
   `main .pagebanner` and makes it `position:sticky` against <main>. Moving the
   pill into the hero would end its stickiness when the hero scrolls away, so it
   stays in <main> and is pulled up onto the slide by a negative margin instead.
   That drags the following content up with it, which is why the bar has a fixed
   height and the bottom margin gives the pulled-up distance back.

   Each override is appended after the "page overrides" marker, because
   patch-responsive.mjs rewrites everything above it verbatim on every run.

   Re-run after editing:  node mockup/hero-tests.mjs
   Do NOT run search-index.mjs while these exist: it globs pages/ and would index
   two duplicates of every forum.html section. Delete both pages and this script
   once a direction is picked. */
import { readFileSync, writeFileSync } from 'node:fs';

const dir = new URL('./pages/', import.meta.url).pathname;
const src = readFileSync(dir + 'forum.html', 'utf8');

const PAGES = [
  { file: 'forum-hero-full.html', key: 'full', name: 'סליידר ברוחב מלא' },
  { file: 'forum-hero-inset.html', key: 'inset', name: 'סליידר עם שוליים' },
];

const BAR_CSS = `
  /* ===== layout switcher (temporary) ===== */
  .testbar{display:flex;flex-wrap:wrap;align-items:center;gap:8px;padding:8px 16px;
    background:var(--white);border-bottom:1px dashed var(--tan-dark);font-size:.82rem}
  .testbar-lbl{font-family:var(--font-head);font-weight:700;color:var(--brown-dark);margin-inline-end:4px}
  .testbar a{color:var(--brown);text-decoration:none;padding:4px 13px;
    border:1px solid var(--tan);border-radius:var(--radius-pill)}
  .testbar a:hover{background:var(--beige);color:var(--brown-dark)}
  .testbar a[aria-current]{background:var(--brown);color:var(--white);border-color:var(--brown)}
  .testbar a[aria-current]:hover{background:var(--brown-dark);color:var(--white)}
`;

/* Prefixed with body.ht so each rule outranks the single-class and media-query
   rules above the marker (.art-hero{height:300px} at 720px and so on) without
   needing !important. */
const SHARED_CSS = `
  /* ===== hero test: shared ===== */
  :root{--side:clamp(16px,7.5vw,100px);--hero-h:clamp(240px,38vw,600px);--bar-h:44px;--bar-gap:14px}

  /* 3. text containers as wide as the slides' margins allow */
  body.ht main{max-width:none;padding-inline:var(--side)}

  /* 2. text containers: a light tint of the page's watercolour colour */
  body.ht section.card{background:color-mix(in oklab,var(--cat) 13%,var(--white))}

  body.ht .art-hero{height:var(--hero-h);margin:0;width:auto}
  body.ht .ah-slide{background-size:cover}

  /* 1b. the caption is gone; the title sits bottom-centre over a bottom scrim.
     The old bottom-right radial is dropped, nothing sits there any more. */
  body.ht .art-hero.slideshow::after{background:var(--cap-scrim)}
  body.ht .hero-title{position:absolute;z-index:2;inset-inline:0;bottom:0;margin:0;
    padding:0 64px 22px;text-align:center;display:block;color:#fff;
    font-size:clamp(1.35rem,3.4vw,2.4rem);line-height:1.25;text-shadow:0 1px 10px rgba(0,0,0,.55)}
  body.ht .hero-title::after{display:none}

  /* The pause control moves from top-start (where the inset page's breadcrumb
     rests) to bottom-end, clear of the centred title. */
  body.ht .ah-play{top:auto;bottom:16px;inset-inline-start:auto;inset-inline-end:16px}
`;

const FULL_CSS = `
  /* ===== hero test 1: full width ===== */
  body.ht-full .art-hero{border-radius:0;box-shadow:none}
`;

const INSET_CSS = `
  /* ===== hero test 2: inset ===== */
  body.ht-inset main{padding-top:10px}

  /* 1c. The pill rests on the slide, --bar-gap from its top and sides. A fixed
     bar height is what lets the bottom margin hand back exactly the distance
     the top margin pulled up. */
  body.ht-inset .pagebanner{height:var(--bar-h);padding-block:0;white-space:nowrap;
    margin:calc(var(--bar-gap) - var(--hero-h)) var(--bar-gap)
           calc(var(--hero-h) - var(--bar-gap) - var(--bar-h) + 24px)}
`;

function testbar(current) {
  const links = PAGES
    .map(p => `<a href="./${p.file}"${p.file === current ? ' aria-current="page"' : ''}>${p.name}</a>`)
    .join('\n');
  return `<nav class="testbar" aria-label="בדיקות עיצוב (זמני)">
<span class="testbar-lbl">בדיקת סליידר</span>
${links}
<a href="./forum.html">העמוד הנוכחי</a>
</nav>
`;
}

/* The hero block runs from its opening <div> to the page <h1>; the h1 and the
   divider after it are removed from the flow and the h1 moves into the slide. */
const heroStart = src.indexOf('  <div class="art-hero slideshow"');
const h1Start = src.indexOf('  <h1>');
const dividerEnd = src.indexOf('</div>\n', src.indexOf('<div class="divider"', h1Start)) + '</div>\n'.length;
if (heroStart < 0 || h1Start < heroStart || dividerEnd < h1Start) throw new Error('hero/h1/divider anchors not found');

const h1Text = /<h1>([^<]+)<\/h1>/.exec(src.slice(h1Start, dividerEnd))?.[1];
if (!h1Text) throw new Error('no h1 text');

const capRe = /<div class="cap">[\s\S]*?<\/div>\n/;
const heroSrc = src.slice(heroStart, h1Start);
if (!capRe.test(heroSrc)) throw new Error('no .cap in hero');
const hero = heroSrc.replace(capRe, `<h1 class="hero-title">${h1Text}</h1>\n`);

const rest = src.slice(0, heroStart) + src.slice(dividerEnd);   // page without hero, h1, divider

for (const p of PAGES) {
  let out = rest;

  // the whole <title>, not its text: forum.html's own title has a dash this file avoids
  out = out.replace(/<title>[^<]*<\/title>/, `<title>הפורום: בדיקת ${p.name}</title>`);

  const style = BAR_CSS + SHARED_CSS + (p.key === 'full' ? FULL_CSS : INSET_CSS);
  const i = out.lastIndexOf('</style>');
  if (i < 0) throw new Error('no </style> in ' + p.file);
  out = out.slice(0, i) + style + out.slice(i);

  if (!out.includes('<body>')) throw new Error('no <body> in ' + p.file);
  out = out.replace('<body>', `<body class="ht ht-${p.key}">`);

  // switcher strip at the very top of the page, above the header
  const hdr = '<header class="site-header">';
  if (out.split(hdr).length !== 2) throw new Error('header anchor not unique');
  out = out.replace(hdr, testbar(p.file) + hdr);

  const mainOpen = '<main id="main-content" tabindex="-1">\n';
  if (out.split(mainOpen).length !== 2) throw new Error('main anchor not unique');
  if (p.key === 'full') {
    // between the header and <main>: edge to edge, flush with the header
    out = out.replace(mainOpen, hero + mainOpen);
  } else {
    // first thing in <main>, so the breadcrumb that follows can be pulled onto it
    out = out.replace(mainOpen, mainOpen + hero);
  }

  writeFileSync(dir + p.file, out);
  console.log('wrote', p.file, (out.length / 1024).toFixed(0) + 'KB');
}
