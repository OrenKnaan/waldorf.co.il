/* TEMPORARY, colour-by-category exploration, item for the cutover inventory.
   Builds ten pages, one per (category x variant), from five existing content
   pages (one representative page per main-menu category). Same markup, same
   copy as the source page; each gets a category-tinted background and a
   variant-specific art-hero treatment, plus a switcher bar linking all ten.

   variant 1 (cat1-*): the art-hero becomes a five-image collage (the same
   photographs the home page hero rotates through), and two watercolour
   washes (the same file forum-alt3.html uses in its top-left corner)
   bookend the page, top and bottom, hue-rotated to the category colour.

   variant 2 (cat2-*): the art-hero becomes a slideshow of the same five
   photographs (a smaller, simpler cousin of home.html's hero.js), and a
   soft watercolour texture is laid across the whole page background via a
   fixed, viewport-covering layer, so it holds still while the page scrolls
   past it rather than repeating with seams.

   Category to wash mapping (all five sit at the same lightness/chroma as the
   site's existing wash-rose/gold/sage/sky quartet, so --wash-plum extends
   the family rather than clashing with it):
     forum      (הפורום)        sky,  blue
     waldorf    (חינוך ולדורף)   sage, green
     inst       (מוסדות חינוך)   gold, amber
     resources  (מידע ומשאבים)  plum, violet (new token)
     contact    (צור קשר)        rose, rose

   The watercolour asset's own hue sits around 35 to 48 degrees (warm
   orange/rose), so it needs no rotation for gold and only a small one for
   rose; sage and sky and plum need real rotation, tuned by eye against a
   rendered swatch. Sage also wanted its saturation pulled down, or the
   rotation lands on a near-neon green nothing else on the page uses.

   Both variants inject a <style> after this stylesheet: accessibility.js
   and search.js already read the design tokens, so they follow a category
   on their own; nothing here needs the .a11y-root-style specificity fight
   the four forum-alt pages had to fight, because none of these overrides
   touch the floating button.

   Re-run after editing a palette or a variant: node mockup/category-variants.mjs
   Do NOT run search-index.mjs while these exist, it globs pages/ and would
   index ten duplicates of five pages' sections. Delete the ten pages and this
   script once a direction is picked. */
import { readFileSync, writeFileSync } from 'node:fs';

const dir = new URL('./pages/', import.meta.url).pathname;

const CATS = [
  { key: 'forum',     file: 'forum.html',              label: 'הפורום',       wash: 'var(--wash-sky)',  hue: '170deg', sat: '1' },
  { key: 'waldorf',   file: 'waldorf-foundations.html', label: 'חינוך ולדורף', wash: 'var(--wash-sage)', hue: '130deg', sat: '.55' },
  { key: 'inst',      file: 'kinder.html',              label: 'מוסדות חינוך', wash: 'var(--wash-gold)', hue: '0deg',   sat: '1' },
  { key: 'resources', file: 'content-library.html',     label: 'מידע ומשאבים', wash: 'var(--wash-plum)', hue: '250deg', sat: '1' },
  { key: 'contact',   file: 'contact.html',             label: 'צור קשר',      wash: 'var(--wash-rose)', hue: '-20deg', sat: '1' },
];

const VARIANTS = [
  { key: 'v1', prefix: 'cat1', label: 'קולאז׳ ומכחול' },
  { key: 'v2', prefix: 'cat2', label: 'מצגת ומרקם' },
];

function catbar(catKey, variantKey) {
  const cats = CATS.map(c => {
    const href = `./${VARIANTS.find(v => v.key === variantKey).prefix}-${c.key}.html`;
    const cur = c.key === catKey ? ' aria-current="page"' : '';
    return `<a href="${href}"${cur}><span class="cat-dot" style="background:${c.wash}"></span>${c.label}</a>`;
  }).join('\n');
  const variants = VARIANTS.map(v => {
    const href = `./${v.prefix}-${catKey}.html`;
    const cur = v.key === variantKey ? ' aria-current="page"' : '';
    return `<a href="${href}"${cur}>${v.label}</a>`;
  }).join('\n');
  return `  <nav class="catbar" aria-label="ערכת נושא לפי קטגוריה (זמני)">
<span class="catbar-lbl">קטגוריה</span>
${cats}
<span class="catbar-sep" aria-hidden="true"></span>
<span class="catbar-lbl">גרסה</span>
${variants}
</nav>
`;
}

const BAR_CSS = `
  /* ===== category/variant switcher (temporary) ===== */
  .catbar{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin:0 0 18px;
    padding:9px 14px;background:var(--white);border:1px dashed var(--tan-dark);
    border-radius:var(--radius-lg);font-size:.82rem}
  .catbar-lbl{font-family:var(--font-head);font-weight:700;color:var(--brown-dark);margin-inline-end:2px}
  .catbar-sep{width:1px;align-self:stretch;background:var(--beige);margin:0 2px}
  .catbar a{display:inline-flex;align-items:center;color:var(--brown);text-decoration:none;padding:5px 13px;
    border:1px solid var(--tan);border-radius:var(--radius-pill);transition:background .15s,color .15s}
  .catbar a:hover{background:var(--beige);color:var(--brown-dark)}
  .catbar a[aria-current]{background:var(--brown);color:var(--white);border-color:var(--brown)}
  .catbar a[aria-current]:hover{background:var(--brown-dark);color:var(--white)}
  .catbar a[aria-current] .cat-dot{outline:1px solid rgba(255,255,255,.7)}
  .cat-dot{width:9px;height:9px;border-radius:50%;display:inline-block;margin-inline-end:6px;flex:none}
`;

/* Shared by both variants: the category tint on the page and header washes,
   already-verified-safe opacities carried over from forum-alt3 (rose 30%,
   sage 26%, gold as the constant middle tone), just re-hued per category
   rather than fixed. The body wash used to fade out by 360px; it now runs
   the length of a normal card stack so the category reads past the hero,
   not just at the very top of the page. */
function baseCategoryCSS(cat) {
  return `
  /* ===== category colour: ${cat.label} (זמני) ===== */
  :root{--wash-plum:oklch(0.74 0.055 320);--cat:${cat.wash};--paint-hue:${cat.hue};--paint-sat:${cat.sat}}
  body{background:
      radial-gradient(120% 70% at 100% 0%, color-mix(in oklab,var(--cat) 34%,transparent), transparent 62%),
      radial-gradient(100% 60% at 0% 10%, color-mix(in oklab,var(--cat) 24%,transparent), transparent 62%),
      linear-gradient(180deg,var(--beige) 0%,var(--cream) 640px,var(--cream) 100%)}
  .site-header{background:
      radial-gradient(120% 150% at 14% 0%, color-mix(in oklab,var(--cat) 34%,transparent), transparent 55%),
      radial-gradient(120% 150% at 50% 0%, color-mix(in oklab,var(--wash-gold) 16%,transparent), transparent 55%),
      radial-gradient(120% 160% at 86% 0%, color-mix(in oklab,var(--cat) 30%,transparent), transparent 55%),
      var(--cream)}
`;
}

/* ===== variant 1: collage art-hero, plus top/bottom brush washes ===== */

function collageHTML(capB, capSpan) {
  return `  <div class="art-hero collage">
<div class="collage-grid" aria-hidden="true">
<div class="tile"><img src="./img/hero/hero-1.webp" alt="" loading="lazy"></div>
<div class="tile"><img src="./img/hero/hero-2.webp" alt="" loading="lazy"></div>
<div class="tile"><img src="./img/hero/hero-3.webp" alt="" loading="lazy"></div>
<div class="tile"><img src="./img/hero/hero-4.webp" alt="" loading="lazy"></div>
<div class="tile"><img src="./img/hero/hero-5.webp" alt="" loading="lazy"></div>
</div>
<div class="cap"><b>${capB}</b><span>${capSpan}</span></div>
</div>`;
}

const COLLAGE_CSS = `
  /* ===== variant: קולאז׳ (זמני), the home page's five hero photographs,
     reused here only until the forum picks real per-page art. Decorative
     (alt="") rather than mis-describing a page they were not shot for. ===== */
  .art-hero.collage{background:linear-gradient(135deg,
    color-mix(in oklab,var(--cat) 55%,var(--cream)),
    color-mix(in oklab,var(--cat) 26%,var(--beige)))}
  .collage-grid{position:absolute;inset:0;display:grid;
    grid-template-columns:1.3fr .85fr .85fr;grid-template-rows:1fr 1fr;gap:10px;padding:14px}
  .collage-grid .tile{border-radius:var(--radius-organic-sm);overflow:hidden;
    box-shadow:0 8px 20px rgba(30,20,12,.28);border:3px solid rgba(255,255,255,.88)}
  .collage-grid .tile img{width:100%;height:100%;object-fit:cover;display:block}
  .collage-grid .tile:nth-child(1){grid-row:1/3;grid-column:1}
  .collage-grid .tile:nth-child(2){grid-row:1;grid-column:2}
  .collage-grid .tile:nth-child(3){grid-row:1;grid-column:3}
  .collage-grid .tile:nth-child(4){grid-row:2;grid-column:2}
  .collage-grid .tile:nth-child(5){grid-row:2;grid-column:3}
  .art-hero.collage::after{background:linear-gradient(to top,
    rgba(20,10,8,.78) 0%,rgba(20,10,8,.34) 42%,transparent 74%)}
  .art-hero.collage .cap{position:relative;align-self:flex-end;z-index:2;
    margin-inline-start:0;margin-inline-end:0}
  @media (max-width:720px){
    .collage-grid{grid-template-columns:1.2fr .9fr;grid-template-rows:1fr 1fr}
    .collage-grid .tile:nth-child(3),.collage-grid .tile:nth-child(5){display:none}
  }
`;

const BRUSH_CSS = `
  /* ===== variant: מכחול עליון ותחתון (זמני), forum-alt3's corner wash,
     hue-rotated per category and mirrored to bookend the page. It sits
     behind the header/main in DOM order, so it only shows in the side
     gutters at wide widths and in the gaps between cards, the same places
     the category wash above already shows through. */
  :root{--paint:url(./img/paint-top-left.webp)}
  body{position:relative}
  .brush-wash{position:absolute;inset-inline:0;height:380px;pointer-events:none;
    background:var(--paint) no-repeat -120px -78px/min(72vw,940px) auto;
    filter:hue-rotate(var(--paint-hue)) saturate(var(--paint-sat))}
  .brush-top{top:0}
  .brush-bottom{bottom:0;transform:scaleX(-1) scaleY(-1)}
  @media (max-width:720px){
    .brush-wash{height:260px;background-position:-70px -52px;background-size:min(112vw,560px) auto}
  }
`;

function brushHTML() {
  return `<div class="brush-wash brush-top" aria-hidden="true"></div>
<div class="brush-wash brush-bottom" aria-hidden="true"></div>`;
}

/* ===== variant 2: slideshow art-hero, plus full-page watercolour texture ===== */

function slideshowHTML(capB, capSpan) {
  const n = [1, 2, 3, 4, 5];
  const slides = n.map(i => `<div class="ah-slide${i === 1 ? ' is-active' : ''}" style="--img:url('./img/hero/hero-${i}-sm.webp');--img-lg:url('./img/hero/hero-${i}.webp')"></div>`).join('\n');
  return `  <div class="art-hero slideshow" data-art-slideshow>
<div class="ah-media" aria-hidden="true">
${slides}
</div>
<button type="button" class="ah-play" aria-pressed="false" aria-label="עצירת מצגת התמונות">
<svg class="ico-pause" viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true"><rect x="6.5" y="5" width="4" height="14" rx="1.2"/><rect x="13.5" y="5" width="4" height="14" rx="1.2"/></svg>
<svg class="ico-play" viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true"><path d="M8 5.2v13.6l11-6.8z"/></svg>
</button>
<div class="cap"><b>${capB}</b><span>${capSpan}</span></div>
</div>`;
}

const SLIDESHOW_CSS = `
  /* ===== variant: מצגת (זמני), the home page's hero photographs again,
     cross-fading instead of tiled; art-hero-slideshow.js drives it. ===== */
  .ah-media{position:absolute;inset:0}
  .ah-slide{position:absolute;inset:0;background-image:var(--img);background-size:cover;
    background-position:center;opacity:0;transition:opacity 1s ease}
  .ah-slide.is-active{opacity:1}
  @media (min-width:900px){.ah-slide{background-image:var(--img-lg)}}
  .art-hero.slideshow::after{background:linear-gradient(to top,
    rgba(20,10,8,.74) 0%,rgba(20,10,8,.30) 42%,transparent 70%)}
  .art-hero.slideshow .cap{position:relative;align-self:flex-end;z-index:2}
  .ah-play{position:absolute;z-index:2;top:12px;inset-inline-start:12px;width:34px;height:34px;
    border-radius:50%;border:0;background:rgba(20,10,8,.52);color:#fff;display:flex;
    align-items:center;justify-content:center;cursor:pointer;padding:0}
  .ah-play:hover{background:rgba(20,10,8,.72)}
  .ah-play:focus-visible{outline:2px solid #fff;outline-offset:2px}
  .ah-play .ico-pause{display:block}
  .ah-play .ico-play{display:none}
  .art-hero.slideshow.is-paused .ah-play .ico-pause{display:none}
  .art-hero.slideshow.is-paused .ah-play .ico-play{display:block}
  @media (prefers-reduced-motion:reduce){.ah-slide{transition:none}}
`;

const TEXTURE_CSS = `
  /* ===== variant: מרקם צבעי מים על פני כל הדף (זמני), a fixed layer, not a
     tiled one, so a long page never shows a seam and the wash holds still
     while the content scrolls past it.

     body keeps its own opaque gradient from baseCategoryCSS above, and a
     block box's own background paints in the same step as its in-flow
     children, which comes after a negative z-index descendant's stacking
     context, not before it. That ordering silently hid the whole layer
     behind body's own ground. Clearing it to none here (later, so the
     cascade favours it) lets header and main, both still opaque where a
     card actually sits, go on covering the texture there.

     The first attempt scattered five small colour blooms across the fixed
     viewport by percentage, the way forum-alt3 places its one corner wash.
     Nearly all of them landed under the header or the hero, which are both
     opaque and both close to the top of every one of these pages, so almost
     none of them ever reached a pixel a visitor could see. A full-bleed
     radial tint plus the alpha texture on top reaches every gap and gutter
     the page actually has, at any scroll position, instead of gambling on
     five fixed points. */
  body{background:none}
  body::before{content:"";position:fixed;inset:0;z-index:-1;pointer-events:none;
    background:
      url(./img/watercolor-spread.webp) center/cover no-repeat,
      radial-gradient(120% 100% at 12% 0%, color-mix(in oklab,var(--cat) 55%,transparent), transparent 62%),
      radial-gradient(110% 90% at 88% 100%, color-mix(in oklab,var(--cat) 48%,transparent), transparent 62%),
      radial-gradient(140% 120% at 50% 45%, color-mix(in oklab,var(--wash-gold) 20%,transparent), transparent 70%),
      linear-gradient(180deg,color-mix(in oklab,var(--cat) 18%,var(--beige)) 0%,color-mix(in oklab,var(--cat) 11%,var(--cream)) 100%)}
`;

for (const cat of CATS) {
  const src = readFileSync(dir + cat.file, 'utf8');
  const lines = src.split('\n');
  const heroIdx = lines.findIndex(l => l.includes('<div class="art-hero">'));
  if (heroIdx < 0) throw new Error('no art-hero in ' + cat.file);
  const capMatch = lines[heroIdx].match(/<b>(.*?)<\/b><span>(.*?)<\/span>/);
  if (!capMatch) throw new Error('no caption in ' + cat.file);
  const [, capB, capSpan] = capMatch;

  for (const variant of VARIANTS) {
    const out = lines.slice();
    out[heroIdx] = variant.key === 'v1' ? collageHTML(capB, capSpan) : slideshowHTML(capB, capSpan);
    let text = out.join('\n');

    text = text.replace(/\u2014 מוקאפ<\/title>/, `, ${variant.label} · ${cat.label}</title>`);

    const styleBlock = BAR_CSS + baseCategoryCSS(cat)
      + (variant.key === 'v1' ? COLLAGE_CSS + BRUSH_CSS : SLIDESHOW_CSS + TEXTURE_CSS);
    const si = text.lastIndexOf('</style>');
    if (si < 0) throw new Error('no </style> in ' + cat.file);
    text = text.slice(0, si) + styleBlock + text.slice(si);

    const crumbAnchor = '</span>\n  </nav>\n';
    if (text.split(crumbAnchor).length !== 2) throw new Error('breadcrumb anchor not unique in ' + cat.file);
    text = text.replace(crumbAnchor, crumbAnchor + catbar(cat.key, variant.key));

    if (variant.key === 'v1') {
      const bodyAnchor = '<body>\n';
      if (text.split(bodyAnchor).length !== 2) throw new Error('<body> anchor not unique in ' + cat.file);
      text = text.replace(bodyAnchor, bodyAnchor + brushHTML() + '\n');
    } else {
      if (text.split('</body>').length !== 2) throw new Error('</body> anchor not unique in ' + cat.file);
      text = text.replace('</body>', '<script src="./art-hero-slideshow.js" defer></script>\n</body>');
    }

    const outFile = `${variant.prefix}-${cat.key}.html`;
    writeFileSync(dir + outFile, text);
    console.log('wrote', outFile, (text.length / 1024).toFixed(0) + 'KB');
  }
}
