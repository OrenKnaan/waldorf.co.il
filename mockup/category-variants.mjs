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
   second watercolour photograph is laid across the whole page background,
   multiplied onto the category tint and hue-rotated to match it, via a
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

   Two different photographs, two different native hues, so two independent
   rotation tables: paint-top-left.webp (the corner wash) sits around 35 to
   48 degrees and needs no rotation for gold and only a small one for rose;
   watercolor-clouds.webp is already blue (~217 degrees) and needs none for
   sky. Both tuned by eye against a rendered swatch, not computed.

   Every decorative layer (the category page-wash, the corner washes, the
   full-page texture) is a real, empty, aria-hidden element with an explicit
   negative z-index, not a bare CSS background on body: a block element's own
   background paints in the same step as its in-flow children, which is
   after a negative z-index descendant's stacking context, not before it, so
   body itself carries no background at all. See baseCategoryCSS's comment.

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
  { key: 'forum',     file: 'forum.html',              label: 'הפורום',       wash: 'var(--wash-sky)',
    paintHue: '170deg', paintSat: '1',   texHue: '0deg' },
  { key: 'waldorf',   file: 'waldorf-foundations.html', label: 'חינוך ולדורף', wash: 'var(--wash-sage)',
    paintHue: '130deg', paintSat: '.55', texHue: '-87deg' },
  { key: 'inst',      file: 'kinder.html',              label: 'מוסדות חינוך', wash: 'var(--wash-gold)',
    paintHue: '0deg',   paintSat: '1',   texHue: '172deg' },
  { key: 'resources', file: 'content-library.html',     label: 'מידע ומשאבים', wash: 'var(--wash-plum)',
    paintHue: '250deg', paintSat: '1',   texHue: '73deg' },
  { key: 'contact',   file: 'contact.html',             label: 'צור קשר',      wash: 'var(--wash-rose)',
    paintHue: '-20deg', paintSat: '1',   texHue: '143deg' },
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
    border-radius:0;clip-path:${chamferPoly('--chamfer-sm')};font-size:.82rem}
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

/* ===== abstract shape: chamfered corners instead of border-radius =====
   The site (outside this experiment) now runs every card, tile and banner
   through --radius-organic-*, a rounded, hand-drawn blob shape. Asked for
   something closer to a cut, not-quite-square corner instead, the reference
   being a chamfered tabletop rather than a rounded one. border-radius has no
   way to produce a flat cut, only curves, so the elements below trade it for
   clip-path: polygon(), an octagon with the four corners sliced by
   --chamfer(-sm/-lg). Scoped to the handful of large, clearly visible
   surfaces on these pages (cards, the banner bars, the hero, the collage
   tiles) rather than every themed control site-wide, since the small pills
   and the floating buttons were never the "abstract shape" in question. */
function chamferPoly(varName) {
  const c = `var(${varName})`;
  return `polygon(${c} 0,calc(100% - ${c}) 0,100% ${c},100% calc(100% - ${c}),calc(100% - ${c}) 100%,${c} 100%,0 calc(100% - ${c}),0 ${c})`;
}

const SHAPE_CSS = `
  /* ===== abstract shape: chamfered, not rounded (זמני) ===== */
  :root{--chamfer-sm:12px;--chamfer:20px;--chamfer-lg:30px}
  section.card,.pagebanner,.fx-tile{border-radius:0;clip-path:${chamferPoly('--chamfer')}}
  .art-hero{border-radius:0;clip-path:${chamferPoly('--chamfer-lg')}}
  .collage-grid .tile{border-radius:0;clip-path:${chamferPoly('--chamfer-sm')}}
  @media (max-width:720px){
    :root{--chamfer:14px;--chamfer-lg:20px}
    section.card{padding:18px}
  }
  @media (max-width:400px){
    :root{--chamfer:12px;--chamfer-lg:16px}
  }
`;

/* Shared by both variants. body itself carries no background any more (see
   the file header comment on stacking): .page-wash is a real element with
   z-index:-2 instead, holding the same category-tinted gradient the body
   background used to. .site-header keeps its own opaque background, tinted
   the same way, since it never needed the stacking fix (it has no sibling
   painted behind it to hide). */
function baseCategoryCSS(cat) {
  return `
  /* ===== category colour: ${cat.label} (זמני) ===== */
  :root{--wash-plum:oklch(0.74 0.055 320);--cat:${cat.wash};
    --paint-hue:${cat.paintHue};--paint-sat:${cat.paintSat};--tex-hue:${cat.texHue}}
  body{background:none}
  .page-wash{pointer-events:none;background:
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

function pageWashHTML() {
  return `<div class="page-wash" aria-hidden="true"></div>`;
}

/* ===== variant 1: collage art-hero, plus top/bottom brush washes ===== */

function collageHTML(capB, capSpan) {
  return `  <div class="art-hero collage">
<div class="collage-grid" aria-hidden="true">
<div class="tile"><img src="./img/hero/hero-1.webp" alt=""></div>
<div class="tile"><img src="./img/hero/hero-2.webp" alt=""></div>
<div class="tile"><img src="./img/hero/hero-3.webp" alt=""></div>
<div class="tile"><img src="./img/hero/hero-4.webp" alt=""></div>
<div class="tile"><img src="./img/hero/hero-5.webp" alt=""></div>
</div>
<div class="cap"><b>${capB}</b><span>${capSpan}</span></div>
</div>`;
}

const COLLAGE_CSS = `
  /* ===== variant: קולאז׳ (זמני), the home page's five hero photographs,
     reused here only until the forum picks real per-page art. Decorative
     (alt="") rather than mis-describing a page they were not shot for.
     No border on the tiles: the gap between them plus their own shadow is
     enough separation without an outline drawn on top of the photos. ===== */
  .art-hero.collage{background:linear-gradient(135deg,
    color-mix(in oklab,var(--cat) 55%,var(--cream)),
    color-mix(in oklab,var(--cat) 26%,var(--beige)))}
  .collage-grid{position:absolute;inset:0;display:grid;
    grid-template-columns:1.3fr .85fr .85fr;grid-template-rows:1fr 1fr;gap:10px;padding:14px}
  /* filter:drop-shadow instead of box-shadow: clip-path clips a box-shadow
     off at the cut corners along with everything else, but drop-shadow
     traces the shape's own rendered silhouette (post-clip), so the shadow
     follows the chamfer instead of stopping dead at the old rectangle. */
  .collage-grid .tile{overflow:hidden;filter:drop-shadow(0 6px 12px rgba(30,20,12,.30))}
  .collage-grid .tile img{width:100%;height:100%;object-fit:cover;display:block}
  .collage-grid .tile:nth-child(1){grid-row:1/3;grid-column:1}
  .collage-grid .tile:nth-child(2){grid-row:1;grid-column:2}
  .collage-grid .tile:nth-child(3){grid-row:1;grid-column:3}
  .collage-grid .tile:nth-child(4){grid-row:2;grid-column:2}
  .collage-grid .tile:nth-child(5){grid-row:2;grid-column:3}
  /* Focused on the corner the caption actually sits in (bottom, the reading
     side of the RTL row) instead of a band running the width of the photos:
     the first cut was darkening tiles 2 and 3 for no reason except that the
     gradient ran edge to edge. */
  .art-hero.collage::after{background:radial-gradient(75% 92% at 100% 100%,
    rgba(20,10,8,.82) 0%,rgba(20,10,8,.52) 30%,rgba(20,10,8,.20) 54%,transparent 74%)}
  .art-hero.collage .cap{position:relative;align-self:flex-end;z-index:2;
    margin-inline-start:0;margin-inline-end:0}
  @media (max-width:720px){
    .collage-grid{grid-template-columns:1.2fr .9fr;grid-template-rows:1fr 1fr}
    .collage-grid .tile:nth-child(3),.collage-grid .tile:nth-child(5){display:none}
  }
`;

const BRUSH_CSS = `
  /* ===== variant: מכחול עליון ותחתון (זמני), forum-alt3's corner wash,
     hue-rotated per category and mirrored to bookend the page. Explicit
     z-index:-1 (below .page-wash's -2 is one layer further back still, so
     the wash always shows through it) rather than relying on DOM order to
     stay behind the header/main: an absolutely positioned, z-index:auto
     element is not guaranteed to paint behind an in-flow one, only ordinary
     document order made it look that way here.

     paint-top-left-alpha.webp replaces the earlier crop: a real alpha
     channel fading to nothing on every edge, not just a rectangle that
     happens to look faded, so it settles onto any category tint without a
     hard border of its own to fight. */
  body{position:relative}
  :root{--paint:url(./img/paint-top-left-alpha.webp)}
  .page-wash{position:absolute;inset:0;z-index:-2}
  .brush-wash{position:absolute;inset-inline:0;height:380px;z-index:-1;pointer-events:none;
    background:var(--paint) no-repeat -120px -78px/min(72vw,940px) auto;
    filter:hue-rotate(var(--paint-hue)) saturate(var(--paint-sat))}
  .brush-top{top:0}
  .brush-bottom{bottom:0;transform:scaleX(-1) scaleY(-1)}
  @media (max-width:720px){
    .brush-wash{height:260px;background-position:-70px -52px;background-size:min(112vw,560px) auto}
  }

  /* ===== chamfer outline (זמני) =====
     section.card carries a real, permanent border (patch-contrast-theme.mjs:
     --tan-dark measured against the card, so the edge reads as intentional
     rather than a browser default) and .fx-tile carries its own. A border
     is drawn on the box's original four straight sides and then clipped
     along with the rest of the box, so at each chamfered corner it simply
     stops, leaving a gap where the cut edge has no stroke at all. Rather
     than accept a broken-looking outline, both are turned off here and
     replaced with eight drop-shadow() calls: filter (unlike box-shadow)
     paints from the element's own rendered, already-clipped silhouette, so
     stacking copies of it nudged 1px in each direction reproduces a hairline
     that actually follows the cut. */
  section.card,.catbar{border:0;box-shadow:none;
    filter:
      drop-shadow(1px 0 0 var(--tan-dark)) drop-shadow(-1px 0 0 var(--tan-dark))
      drop-shadow(0 1px 0 var(--tan-dark)) drop-shadow(0 -1px 0 var(--tan-dark))
      drop-shadow(.75px .75px 0 var(--tan-dark)) drop-shadow(-.75px .75px 0 var(--tan-dark))
      drop-shadow(.75px -.75px 0 var(--tan-dark)) drop-shadow(-.75px -.75px 0 var(--tan-dark))
      drop-shadow(0 2px 8px rgba(61,43,31,.08))}
  .fx-tile{border:0;
    filter:
      drop-shadow(1px 0 0 var(--beige)) drop-shadow(-1px 0 0 var(--beige))
      drop-shadow(0 1px 0 var(--beige)) drop-shadow(0 -1px 0 var(--beige))
      drop-shadow(.75px .75px 0 var(--beige)) drop-shadow(-.75px .75px 0 var(--beige))
      drop-shadow(.75px -.75px 0 var(--beige)) drop-shadow(-.75px -.75px 0 var(--beige))}
  /* Neither ever had a border, only a box-shadow, which the same clipping
     problem cuts off at the corners; drop-shadow fixes that too, with no
     hairline needed since there was never an outline to replace. */
  .art-hero,.pagebanner{box-shadow:none;filter:drop-shadow(0 4px 14px rgba(61,43,31,.12))}
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
     cross-fading instead of tiled; art-hero-slideshow.js drives it. Same
     corner-focused scrim as the collage variant, for the same reason. ===== */
  .ah-media{position:absolute;inset:0}
  .ah-slide{position:absolute;inset:0;background-image:var(--img);background-size:cover;
    background-position:center;opacity:0;transition:opacity 1s ease}
  .ah-slide.is-active{opacity:1}
  @media (min-width:900px){.ah-slide{background-image:var(--img-lg)}}
  .art-hero.slideshow::after{background:radial-gradient(70% 88% at 100% 100%,
    rgba(20,10,8,.86) 0%,rgba(20,10,8,.60) 28%,rgba(20,10,8,.28) 50%,transparent 70%)}
  /* The band shrinks with the hero on a phone (200px, then 170px), so the
     same percentages cover a smaller run behind the caption; measured on
     the glyph pixels themselves, 375px came out at 3.81:1 against the 4.5:1
     that 15px bold needs (below 18.66px, "large text" does not apply). */
  @media (max-width:720px){
    .art-hero.slideshow::after{background:radial-gradient(78% 92% at 100% 100%,
      rgba(20,10,8,.90) 0%,rgba(20,10,8,.68) 30%,rgba(20,10,8,.34) 54%,transparent 74%)}
  }
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
  /* ===== variant: מרקם צבעי מים על פני כל הדף (זמני). Two fixed,
     viewport-covering layers, .page-wash then .page-tex on top of it, both
     z-index:-1 or deeper so the header and every card, both still opaque,
     go on covering them wherever a visitor is actually looking.

     .page-tex holds watercolor-clouds.webp (its own colour is blue) and
     needs mix-blend-mode, not background-blend-mode: the photograph is a
     single, fully opaque layer with nothing else on the same element to
     blend against, so background-blend-mode had nothing to do and the
     image was simply painting over .page-wash, whole and opaque. mix-blend
     -mode blends the element against what is already on the page behind
     it, which is .page-wash's khaki category tint, so the photograph's
     white paper picks up that colour (multiplying white leaves the tint
     untouched) and only its own blue blooms darken it further. filter has
     to stay on this element rather than move to body, or it would just as
     happily rotate .page-wash's already-correct colour a second time. */
  .page-wash{position:fixed;inset:0;z-index:-2}
  .page-tex{position:fixed;inset:0;z-index:-1;pointer-events:none;
    background:url(./img/watercolor-clouds.webp) center/cover no-repeat;
    mix-blend-mode:multiply;filter:hue-rotate(var(--tex-hue))}

  /* ===== chamfer outline (זמני): none, for this variant =====
     section.card and .fx-tile each carry a real border that clip-path cuts
     off cleanly at the chamfer, leaving a gap in the stroke; rather than
     rebuild it (as cat1 does with a stack of drop-shadow() calls), it is
     simply removed here, so the shape reads as a plain cut sheet rather
     than a shape wearing a broken outline. */
  section.card,.catbar,.fx-tile{border:0}
`;

function pageTexHTML() {
  return `<div class="page-tex" aria-hidden="true"></div>`;
}

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

    const styleBlock = BAR_CSS + SHAPE_CSS + baseCategoryCSS(cat)
      + (variant.key === 'v1' ? COLLAGE_CSS + BRUSH_CSS : SLIDESHOW_CSS + TEXTURE_CSS);
    const si = text.lastIndexOf('</style>');
    if (si < 0) throw new Error('no </style> in ' + cat.file);
    text = text.slice(0, si) + styleBlock + text.slice(si);

    const crumbAnchor = '</span>\n  </nav>\n';
    if (text.split(crumbAnchor).length !== 2) throw new Error('breadcrumb anchor not unique in ' + cat.file);
    text = text.replace(crumbAnchor, crumbAnchor + catbar(cat.key, variant.key));

    const bodyAnchor = '<body>\n';
    if (text.split(bodyAnchor).length !== 2) throw new Error('<body> anchor not unique in ' + cat.file);
    const extraDiv = variant.key === 'v1' ? brushHTML() : pageTexHTML();
    text = text.replace(bodyAnchor, bodyAnchor + pageWashHTML() + '\n' + extraDiv + '\n');

    if (variant.key === 'v2') {
      if (text.split('</body>').length !== 2) throw new Error('</body> anchor not unique in ' + cat.file);
      text = text.replace('</body>', '<script src="./art-hero-slideshow.js" defer></script>\n</body>');
    }

    const outFile = `${variant.prefix}-${cat.key}.html`;
    writeFileSync(dir + outFile, text);
    console.log('wrote', outFile, (text.length / 1024).toFixed(0) + 'KB');
  }
}
