/* TEMPORARY — colour-scheme exploration, item for the cutover inventory.
   Builds mockup/pages/forum-alt1..4.html from forum.html: same markup, same
   content, four different palettes, plus a switcher bar linking them.

   Each theme is appended *after* the "page overrides" marker, because
   patch-responsive.mjs rewrites everything above it verbatim on every run.

   Three files inject a <style> into <head> at runtime, all of them after this
   stylesheet, so a tie on specificity goes to them. Overrides are written to
   outrank them: `.dyn-*` rules (dynamic.js) are prefixed with `main `, and the
   accessibility widget's floating button is reached as `.a11y-root .a11y-fab`.
   scroll-top.js and search.js already read the design tokens, so those two
   follow a theme on their own.

   Re-run after editing a palette:  node mockup/forum-alts.mjs
   Do NOT run search-index.mjs while these exist — it globs pages/ and would
   index four duplicates of every forum.html section. Delete the four pages and
   this script once a direction is picked. */
import { readFileSync, writeFileSync } from 'node:fs';

const dir = new URL('./pages/', import.meta.url).pathname;
const src = readFileSync(dir + 'forum.html', 'utf8');

const THEMES = [
  { file: 'forum-alt1.html', name: 'יין ועצם' },
  { file: 'forum-alt2.html', name: 'אור ושמנת' },
  { file: 'forum-alt3.html', name: 'רישום עיפרון' },
  { file: 'forum-alt4.html', name: 'פסטל' },
];

function themebar(current) {
  const links = [{ file: 'forum.html', name: 'מקורי' }, ...THEMES]
    .map(t => `<a href="./${t.file}"${t.file === current ? ' aria-current="page"' : ''}>${t.name}</a>`)
    .join('\n');
  return `  <nav class="themebar" aria-label="ערכות עיצוב (זמני)">
<span class="themebar-lbl">ערכות עיצוב</span>
${links}
</nav>
`;
}

const BAR_CSS = `
  /* ===== theme switcher (temporary) ===== */
  .themebar{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin:0 0 18px;
    padding:9px 14px;background:var(--white);border:1px dashed var(--tan-dark);
    border-radius:var(--radius-lg);font-size:.82rem}
  .themebar-lbl{font-family:var(--font-head);font-weight:700;color:var(--brown-dark);margin-inline-end:4px}
  .themebar a{color:var(--brown);text-decoration:none;padding:5px 13px;
    border:1px solid var(--tan);border-radius:var(--radius-pill);transition:background .15s,color .15s}
  .themebar a:hover{background:var(--beige);color:var(--brown-dark)}
  .themebar a[aria-current]{background:var(--brown);color:var(--white);border-color:var(--brown)}
  .themebar a[aria-current]:hover{background:var(--brown-dark);color:var(--white)}
`;

/* ============================ 1. יין ועצם ============================
   Rudolf Steiner School NYC. One deep wine on white — no tinted ground, no
   rounding anywhere, no blur. What separates a card from the page is a
   measured hairline and a lot of air, and the page ends on a wine block. */
const ALT1 = `
  /* ===== theme: יין ועצם / Wine & Bone ===== */
  :root{
    --cream:#FFFFFF;--beige:#EFE7E6;--tan:#D6C0BD;--tan-dark:#7C5F5D;
    --brown:#8B2E33;--brown-dark:#54181C;--text:#1A1614;--text-muted:#574D4C;
    --white:#FFFFFF;
    --rule:#A28784;
    --shadow:none;--shadow-lg:0 18px 44px rgba(84,24,28,.16);
    /* Straight corners, everywhere: scroll-top.js and search.js read these
       tokens too, so the two floating controls square off with the rest. */
    --radius:0;--radius-lg:0;--radius-pill:0;
    --radius-organic-sm:0;--radius-organic:0;--radius-organic-lg:0;
    --wash-rose:oklch(0.76 0.09 18);--wash-gold:oklch(0.86 0.04 62);
    --wash-sage:oklch(0.82 0.03 30);--wash-sky:oklch(0.80 0.03 320);
  }
  body{background:#FBF8F8}
  .site-header{background:#FFFFFF;border-image:none;
    border-bottom:2px solid var(--brown);box-shadow:none}
  .nav-link:hover,.nav-link.active{border-bottom-color:var(--brown)}
  .dropdown{border:1px solid var(--rule);border-radius:0;box-shadow:var(--shadow-lg)}
  .pagebanner{background:#FFFFFF;border:1px solid var(--rule);box-shadow:none;
    font-size:.78rem;letter-spacing:.06em}
  h1{font-size:2.4rem;letter-spacing:.005em;color:var(--brown-dark)}
  /* A short masthead rule, not a soft blob. */
  h1::after{inset-inline:auto;inset-inline-start:0;width:74px;height:3px;
    border-radius:0;opacity:1;bottom:-12px;background:var(--brown)}
  h2{color:var(--brown-dark);font-size:1.06rem;letter-spacing:.045em;
    border-bottom:1px solid var(--rule);padding-bottom:11px}
  section.card{background:#FFFFFF;border:1px solid var(--rule);box-shadow:none;
    padding:28px 32px;border-radius:0}
  li::marker{color:var(--brown)}
  .art-hero{border-radius:0}
  .art-hero .bg{filter:blur(8px) saturate(.7)}
  .art-hero::after{background:linear-gradient(90deg,rgba(84,24,28,.82) 0%,rgba(84,24,28,.44) 48%,rgba(84,24,28,.10) 78%)}
  .art-hero .frame{border-radius:0;border-color:#FFFFFF}
  .btn{border-radius:0;letter-spacing:.02em}
  .btn-ghost{border-color:var(--brown);color:var(--brown)}
  .btn-ghost:hover{background:var(--brown);color:#FFFFFF}
  .btn-row .btn:nth-child(2n),.actions .btn:nth-child(2n){border-radius:0}
  .chip-row .chip:nth-child(3n+2),.dyn-meta .dyn-chip:nth-child(3n+2),
  .chip-row .chip:nth-child(3n+3),.dyn-meta .dyn-chip:nth-child(3n+3){border-radius:0}
  .fx-eyebrow{color:var(--brown);letter-spacing:.12em}
  .fx-tile{border:1px solid var(--rule);border-radius:0;
    border-top:3px solid var(--brown);background:#FFFFFF}
  .fx-tile:hover{border-color:var(--brown);border-top-color:var(--brown-dark);
    background:#FBF6F6;transform:none;box-shadow:none}
  .fx-mail{border-bottom-color:var(--brown)}
  .nav-badge,.pending-badge{background:var(--brown);color:#FFFFFF;border-radius:0}
  /* The wine block that closes the NYC page. */
  footer.site-footer{background:var(--brown-dark);color:#F3DAD9;margin-top:48px;padding:44px 24px 48px}
  footer.site-footer a{color:#FFFFFF}
  main .dyn-item{border:1px solid var(--rule);box-shadow:none;border-radius:0}
  main .dyn-item .dyn-btn{border-radius:0;background:var(--brown);color:#FFFFFF}
  main .dyn-item .dyn-btn:hover{background:var(--brown-dark);color:#FFFFFF}
  main .dyn-event .date-badge{border-radius:0;border-color:var(--rule)}
  main .dyn-empty{border-radius:0;border:1px solid var(--rule);background:#FFFFFF}
  /* accessibility.js hard-codes the floating button and injects its <style>
     after this one, so the override needs .a11y-root to outrank it. */
  .a11y-root .a11y-fab{background:var(--brown-dark);border:2px solid #FFFFFF;
    border-radius:0;color:#FFFFFF;box-shadow:0 10px 28px rgba(84,24,28,.34)}
  .a11y-root .a11y-fab:hover{background:var(--brown)}
  .a11y-root .a11y-fab:focus-visible{outline:3px solid var(--brown-dark)}
  .themebar{background:#FFFFFF;border:1px dashed var(--rule);border-radius:0}
  .themebar a{border-radius:0;letter-spacing:.03em}
`;

/* =========================== 2. אור ושמנת ===========================
   Waldorf School of Atlanta, taken toward light. White ground, nothing
   rounded, and no boxes: a card is held by a border that fades out before it
   reaches the corner, over a glow rather than a shadow. */
const ALT2 = `
  /* ===== theme: אור ושמנת / Light & Cream ===== */
  :root{
    --cream:#FFFFFF;--beige:#F1E9F3;--tan:#DCC3E2;--tan-dark:#786B84;
    --brown:#6E2B7E;--brown-dark:#46154F;--text:#2C2233;--text-muted:#5A4E63;
    --white:#FFFFFF;
    --veil:#AE72BC;
    --shadow:0 22px 50px -34px rgba(70,21,79,.45);
    --shadow-lg:0 28px 66px -30px rgba(70,21,79,.42);
    --radius:0;--radius-lg:0;--radius-pill:0;
    --radius-organic-sm:0;--radius-organic:0;--radius-organic-lg:0;
    --wash-rose:oklch(0.80 0.09 340);--wash-gold:oklch(0.92 0.06 86);
    --wash-sage:oklch(0.80 0.08 300);--wash-sky:oklch(0.86 0.06 268);
  }
  body{background:
    radial-gradient(58% 34% at 88% 0%, color-mix(in oklab,var(--wash-rose) 20%,transparent), transparent 66%),
    radial-gradient(52% 30% at 6% 8%, color-mix(in oklab,var(--wash-sky) 18%,transparent), transparent 66%),
    radial-gradient(70% 34% at 50% 100%, color-mix(in oklab,var(--wash-gold) 16%,transparent), transparent 70%),
    #FFFFFF}
  /* The header rule fades out at both ends instead of stopping. */
  .site-header{background:transparent;box-shadow:none;border-width:0 0 1px;
    border-image:linear-gradient(90deg,transparent,var(--veil) 22%,var(--brown) 50%,var(--veil) 78%,transparent) 1}
  .nav-link:hover,.nav-link.active{border-bottom-color:var(--brown)}
  .dropdown{border:1px solid color-mix(in oklab,var(--veil) 55%,transparent);border-radius:0}
  /* Every rule on this page runs out before it reaches the edge. */
  .pagebanner{background:transparent;box-shadow:none;border:0;padding-inline:2px;
    border-bottom:1px solid transparent;
    border-image:linear-gradient(90deg,color-mix(in oklab,var(--veil) 70%,transparent),transparent 72%) 1}
  h1{color:var(--brown-dark);font-size:2.4rem;font-weight:700}
  h1::after{height:8px;bottom:-4px;opacity:.7;border-radius:0;
    background:linear-gradient(90deg,transparent,color-mix(in oklab,var(--wash-rose) 75%,transparent) 30%,
      color-mix(in oklab,var(--wash-gold) 70%,transparent) 70%,transparent)}
  h2{color:var(--brown);border-bottom:none;padding-bottom:0;margin-bottom:18px;
    font-size:1.2rem;letter-spacing:.03em}
  h2::after{content:"";flex:1 1 auto;height:1px;min-width:24px;
    background:linear-gradient(90deg,color-mix(in oklab,var(--veil) 80%,transparent),transparent)}
  /* No box: the border is a gradient that runs out before the corner, and the
     lift comes from a wide low glow rather than a drop shadow. */
  section.card{background:#FFFFFF;border-radius:0;padding:30px 34px;margin-bottom:26px;
    border:1px solid transparent;
    border-image:linear-gradient(150deg,var(--brown) 0%,var(--veil) 16%,
      transparent 52%,color-mix(in oklab,var(--wash-gold) 78%,transparent) 100%) 1;
    box-shadow:var(--shadow)}
  li::marker{color:var(--veil)}
  /* Slanted band, drained and re-lit rather than saturated, dissolving into
     the white below it. The cut lifts from the end edge; the caption sits at
     the start edge, so nothing is clipped. */
  .art-hero{border-radius:0;box-shadow:none;
    clip-path:polygon(0 0,100% 0,100% 100%,0 88%)}
  .art-hero .bg{filter:blur(8px) grayscale(1) contrast(.95) brightness(1.22)}
  .art-hero::after{background:
    linear-gradient(0deg,rgba(255,255,255,.42) 0%,transparent 38%),
    linear-gradient(118deg,rgba(70,21,79,.86) 0%,rgba(126,38,124,.62) 44%,rgba(196,140,205,.34) 100%)}
  .art-hero .frame{border-radius:0;border:0;box-shadow:0 14px 40px rgba(30,10,35,.45)}
  .art-hero .cap{padding-bottom:26px}
  .btn{border-radius:0;font-weight:500;letter-spacing:.02em}
  .btn-primary:hover{background:var(--brown-dark)}
  .btn-ghost{border:1px solid var(--veil);color:var(--brown)}
  .btn-ghost:hover{background:color-mix(in oklab,var(--veil) 12%,transparent);color:var(--brown-dark)}
  .btn-row .btn:nth-child(2n),.actions .btn:nth-child(2n){border-radius:0}
  .chip-row .chip:nth-child(3n+2),.dyn-meta .dyn-chip:nth-child(3n+2),
  .chip-row .chip:nth-child(3n+3),.dyn-meta .dyn-chip:nth-child(3n+3){border-radius:0}
  .fx-eyebrow{color:var(--brown);letter-spacing:.11em}
  .fx-tile{background:#FFFFFF;border-radius:0;border:1px solid transparent;
    border-image:linear-gradient(160deg,color-mix(in oklab,var(--veil) 80%,transparent),
      transparent 70%) 1;box-shadow:none}
  .fx-tile:hover{transform:none;box-shadow:var(--shadow);
    border-image:linear-gradient(160deg,var(--brown),color-mix(in oklab,var(--veil) 40%,transparent)) 1}
  .fx-tile-go{color:var(--brown)}
  .fx-mail{border-bottom-color:var(--veil)}
  .nav-badge,.pending-badge{background:color-mix(in oklab,var(--wash-gold) 70%,#FFFFFF);
    color:var(--brown-dark);border-radius:0}
  footer.site-footer{margin-top:52px;padding-top:34px;border-top:1px solid transparent;
    border-image:linear-gradient(90deg,transparent,color-mix(in oklab,var(--veil) 70%,transparent) 50%,transparent) 1}
  main .dyn-item{border-radius:0;border:1px solid transparent;box-shadow:var(--shadow);
    border-image:linear-gradient(150deg,color-mix(in oklab,var(--veil) 70%,transparent),transparent 62%) 1}
  main .dyn-item .dyn-btn{border-radius:0;background:var(--brown);color:#FFFFFF}
  main .dyn-item .dyn-btn:hover{background:var(--brown-dark);color:#FFFFFF}
  main .dyn-event .date-badge{border-radius:0;background:color-mix(in oklab,var(--wash-gold) 34%,#FFFFFF);
    border-color:color-mix(in oklab,var(--veil) 45%,transparent)}
  main .dyn-empty{border-radius:0;background:color-mix(in oklab,var(--veil) 7%,#FFFFFF)}
  .a11y-root .a11y-fab{background:var(--brown);border:2px solid #FFFFFF;
    border-radius:0;color:#FFFFFF;box-shadow:0 14px 34px rgba(70,21,79,.34)}
  .a11y-root .a11y-fab:hover{background:var(--brown-dark)}
  .a11y-root .a11y-fab:focus-visible{outline:3px solid var(--brown)}
  .themebar{background:transparent;border:0;border-radius:0;padding-inline:2px;
    border-bottom:1px solid transparent;
    border-image:linear-gradient(90deg,color-mix(in oklab,var(--veil) 60%,transparent),transparent 72%) 1}
  .themebar a{border-radius:0;border-color:color-mix(in oklab,var(--veil) 55%,transparent)}
`;

/* ========================= 3. רישום עיפרון =========================
   A page drawn rather than printed. Warm paper with a fibre grain, boxes
   ruled by hand and traced a second time, headings underscored with a wobbly
   stroke, and four coloured pencils — sanguine, indigo, ochre, forest —
   taking one card each. Grey would have been the wrong answer: Waldorf
   children draw in block colour, so the graphite carries a blue cast and the
   accents are pencils, not neutrals. */
const SKETCH_LINE = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 180 9' preserveAspectRatio='none'%3E%3Cpath d='M0 5C20 2 40 7.6 60 4.6 80 1.7 100 7.4 120 4.4 140 1.8 160 7.2 180 5' fill='none' stroke='%23000' stroke-width='2.1' stroke-linecap='round'/%3E%3C/svg%3E")`;
const ALT3 = `
  /* ===== theme: רישום עיפרון / Pencil ===== */
  :root{
    --paper:#FCFAF4;
    --cream:#FCFAF4;--beige:#EDE9DE;--tan:#B9B3A2;--tan-dark:#565C74;
    --brown:#3F5488;--brown-dark:#2E3242;--text:#2E3242;--text-muted:#565C74;
    --white:#FFFFFF;
    --p1:#A34A32;--p2:#3F5488;--p3:#8A5F14;--p4:#3C6B4A;
    --shadow:none;--shadow-lg:0 14px 32px rgba(46,50,66,.18);
    --radius:4px;--radius-lg:6px;
    /* Ruled freehand: the browser scales these down proportionally on a wide
       box, which is exactly what makes each edge come out slightly different. */
    --hand:19px 5px 15px 7px / 6px 16px 4px 20px;
    --hand-b:6px 17px 4px 20px / 18px 5px 16px 7px;
    --hand-sm:11px 3px 9px 4px / 4px 10px 3px 12px;
    --radius-organic-sm:var(--hand-sm);--radius-organic:var(--hand-sm);--radius-organic-lg:var(--hand);
    --sketch-line:${SKETCH_LINE};
    --wash-rose:oklch(0.72 0.09 32);--wash-gold:oklch(0.80 0.09 82);
    --wash-sage:oklch(0.68 0.07 155);--wash-sky:oklch(0.66 0.09 262);
  }
  /* Paper fibre: two off-axis hatches at the threshold of visibility. */
  body{background:
    repeating-linear-gradient(3deg, rgba(46,50,66,.022) 0 1px, transparent 1px 4px),
    repeating-linear-gradient(96deg, rgba(46,50,66,.018) 0 1px, transparent 1px 5px),
    var(--paper)}
  .site-header{background:transparent;box-shadow:none;border-width:0 0 2px;border-image:none;
    border-bottom:2px solid var(--brown-dark)}
  .nav-link{color:var(--brown-dark)}
  .nav-link{position:relative}
  .nav-link:hover,.nav-link.active{border-bottom-color:transparent}
  .nav-link.active::after{content:"";position:absolute;inset-inline:6px;bottom:0;height:9px;
    background:var(--p1);
    -webkit-mask:var(--sketch-line) repeat-x left center/186px 9px;
    mask:var(--sketch-line) repeat-x left center/186px 9px}
  .dropdown{background:var(--paper);border:1.6px solid var(--brown-dark);
    border-radius:var(--hand-sm);box-shadow:var(--shadow-lg)}
  .dropdown-link:hover,.dropdown-link.active{background:color-mix(in oklab,var(--p2) 12%,transparent)}
  .pagebanner{background:transparent;box-shadow:none;border:0;padding-inline:2px}
  h1{color:var(--brown-dark);font-size:2.4rem}
  /* Pencil shading rather than a line, fading out at both ends. */
  h1::after{inset-inline:-2px;bottom:-11px;height:13px;border-radius:0;opacity:1;
    background:repeating-linear-gradient(72deg,var(--p2) 0 1.6px,transparent 1.6px 5.5px);
    -webkit-mask:linear-gradient(90deg,transparent,#000 14%,#000 86%,transparent);
    mask:linear-gradient(90deg,transparent,#000 14%,#000 86%,transparent)}
  h2{color:var(--brown-dark);border-bottom:none;padding-bottom:12px;margin-bottom:16px;
    font-size:1.16rem;position:relative}
  /* One squiggle, masked so each heading can tint it with its own pencil. */
  h2::after{content:"";position:absolute;inset-inline:0;bottom:0;height:9px;
    background:var(--pencil,var(--p2));
    -webkit-mask:var(--sketch-line) repeat-x left center/186px 9px;
    mask:var(--sketch-line) repeat-x left center/186px 9px}
  section.card{position:relative;background:#FFFFFF;box-shadow:none;padding:26px 30px;
    border:1.7px solid var(--pencil,var(--p2));border-radius:var(--hand)}
  /* The second pass of the pencil — the line you draw again because the first
     one wandered. Inset and lighter, on the opposite corner rhythm. */
  section.card::after{content:"";position:absolute;inset:4px;pointer-events:none;
    border:1px solid color-mix(in oklab,var(--pencil,var(--p2)) 38%,transparent);
    border-radius:var(--hand-b)}
  section.card:nth-of-type(1){--pencil:var(--p2)}
  section.card:nth-of-type(2){--pencil:var(--p1)}
  section.card:nth-of-type(3){--pencil:var(--p4)}
  section.card:nth-of-type(4){--pencil:var(--p3)}
  section.card:nth-of-type(5){--pencil:var(--p2)}
  section.card:nth-of-type(6){--pencil:var(--p1)}
  li::marker{color:var(--pencil,var(--p2))}
  .art-hero{border-radius:var(--hand);border:1.7px solid var(--brown-dark);box-shadow:none}
  /* Not drained to grey — desaturated to the level of a coloured-pencil study. */
  .art-hero .bg{filter:blur(7px) saturate(.45) contrast(1.12)}
  .art-hero::after{background:linear-gradient(90deg,rgba(46,50,66,.86) 0%,rgba(63,84,136,.52) 52%,rgba(63,84,136,.16) 82%)}
  /* Hatching laid over the veil, the way a study gets shaded in. */
  .art-hero::before{content:"";position:absolute;inset:0;z-index:1;pointer-events:none;
    background:repeating-linear-gradient(58deg,rgba(252,250,244,.10) 0 1px,transparent 1px 7px)}
  .art-hero .frame{border-radius:3px;border:3px solid var(--paper);box-shadow:0 10px 26px rgba(20,22,32,.45)}
  .btn{border-radius:var(--hand-sm);font-weight:600;border:1.6px solid var(--brown-dark)}
  .btn-primary{background:var(--brown-dark);color:var(--paper)}
  .btn-primary:hover{background:var(--p2);color:var(--paper)}
  .btn-ghost{background:transparent;color:var(--brown-dark);border-color:var(--brown-dark)}
  .btn-ghost:hover{background:color-mix(in oklab,var(--p2) 12%,transparent);color:var(--brown-dark)}
  .btn-row .btn:nth-child(2n),.actions .btn:nth-child(2n){border-radius:var(--hand-sm)}
  .chip-row .chip:nth-child(3n+2),.dyn-meta .dyn-chip:nth-child(3n+2),
  .chip-row .chip:nth-child(3n+3),.dyn-meta .dyn-chip:nth-child(3n+3){border-radius:var(--hand-sm)}
  .fx-eyebrow{color:var(--p1);letter-spacing:.1em}
  .fx-tile{background:#FFFFFF;border:1.6px solid var(--tile-pencil,var(--p2));
    border-radius:var(--hand-sm);box-shadow:none}
  .fx-tiles a:nth-child(1){--tile-pencil:var(--p1)}
  .fx-tiles a:nth-child(2){--tile-pencil:var(--p4)}
  .fx-tiles a:nth-child(3){--tile-pencil:var(--p3)}
  .fx-tile:hover{border-color:var(--tile-pencil);transform:none;
    background:color-mix(in oklab,var(--tile-pencil) 8%,#FFFFFF);box-shadow:none}
  .fx-tile-go{color:var(--tile-pencil);font-size:1.2rem}
  .fx-mail{border-bottom:2px solid var(--p1);color:var(--brown-dark)}
  .fx-mail:hover{color:var(--p1);border-bottom-color:var(--brown-dark)}
  .nav-badge,.pending-badge{background:color-mix(in oklab,var(--p3) 26%,#FFFFFF);
    color:var(--brown-dark);border:1px solid var(--p3);border-radius:var(--hand-sm)}
  footer.site-footer{margin-top:46px;padding-top:30px;border-top:1.7px solid var(--brown-dark)}
  main .dyn-item{background:#FFFFFF;border:1.6px solid var(--p2);
    border-radius:var(--hand-sm);box-shadow:none}
  main .dyn-item .dyn-btn{border-radius:var(--hand-sm);background:var(--brown-dark);
    color:var(--paper);border:1.6px solid var(--brown-dark)}
  main .dyn-item .dyn-btn:hover{background:var(--p2);color:var(--paper)}
  main .dyn-event .date-badge{border-radius:var(--hand-sm);background:var(--paper);
    border:1.4px solid var(--p2);color:var(--brown-dark)}
  main .dyn-event .date-badge b{color:var(--p2)}
  main .dyn-chip{background:var(--paper);border:1.2px solid color-mix(in oklab,var(--p2) 45%,transparent);
    color:var(--brown-dark)}
  main .dyn-empty{background:#FFFFFF;border:1.6px dashed var(--p2);
    border-radius:var(--hand-sm);color:var(--text-muted)}
  .a11y-root .a11y-fab{background:var(--brown-dark);border:2px solid var(--paper);
    border-radius:var(--hand-sm);color:var(--paper);box-shadow:0 10px 28px rgba(46,50,66,.34)}
  .a11y-root .a11y-fab:hover{background:var(--p2)}
  .a11y-root .a11y-fab:focus-visible{outline:3px solid var(--brown-dark)}
  .themebar{background:#FFFFFF;border:1.4px dashed var(--p2);border-radius:var(--hand-sm)}
  .themebar a{border-radius:var(--hand-sm);border-color:color-mix(in oklab,var(--p2) 55%,transparent)}
`;

/* ============================= 4. פסטל =============================
   The prism, softened. Each card is a tinted sheet of paper rather than a
   white box with a coloured bar, cut and laid down slightly out of true —
   uneven corners, a fraction of a degree off square. The ink stays a muted
   version of the same hue so the text on every sheet still carries. */
const ALT4 = `
  /* ===== theme: פסטל / Pastel ===== */
  :root{
    --cream:#FDFBF7;--beige:#F3EDE4;--tan:#D8CCBC;--tan-dark:#8A6A4E;
    --brown:#6B5495;--brown-dark:#4E3A72;--text:#3B2F52;--text-muted:#5B4F79;
    --white:#FFFFFF;
    --i1:#A8465A;--t1:#FBE6E9;
    --i2:#8C5F26;--t2:#FBEEDD;
    --i3:#456F53;--t3:#E7F1E9;
    --i4:#4A6899;--t4:#E7EDF7;
    --i5:#6B5495;--t5:#EFE9F7;
    --shadow:0 4px 16px rgba(59,47,82,.07);--shadow-lg:0 16px 38px rgba(107,84,149,.18);
    --radius:12px;--radius-lg:20px;
    --radius-organic-sm:16px 27px 13px 24px / 25px 13px 28px 15px;
    --radius-organic:24px 44px 20px 40px / 42px 20px 46px 23px;
    --radius-organic-lg:34px 62px 29px 56px / 58px 29px 66px 33px;
    --wash-rose:oklch(0.86 0.07 18);--wash-gold:oklch(0.91 0.06 82);
    --wash-sage:oklch(0.88 0.05 158);--wash-sky:oklch(0.87 0.05 258);
  }
  body{background:
    radial-gradient(70% 40% at 96% 0%, color-mix(in oklab,var(--wash-rose) 40%,transparent), transparent 64%),
    radial-gradient(62% 34% at 2% 6%, color-mix(in oklab,var(--wash-sky) 38%,transparent), transparent 64%),
    radial-gradient(80% 40% at 50% 100%, color-mix(in oklab,var(--wash-sage) 30%,transparent), transparent 68%),
    var(--cream)}
  .site-header{border-width:0 0 4px;
    background:
      radial-gradient(120% 150% at 12% 0%, color-mix(in oklab,var(--wash-rose) 52%,transparent), transparent 58%),
      radial-gradient(120% 150% at 44% 0%, color-mix(in oklab,var(--wash-gold) 52%,transparent), transparent 58%),
      radial-gradient(120% 160% at 74% 0%, color-mix(in oklab,var(--wash-sage) 46%,transparent), transparent 58%),
      radial-gradient(120% 160% at 99% 0%, color-mix(in oklab,var(--wash-sky) 44%,transparent), transparent 58%),
      #FDFBF7;
    border-image:linear-gradient(90deg,var(--t1),var(--t2) 26%,var(--t3) 52%,var(--t4) 76%,var(--t5)) 1}
  .nav-link{color:var(--brown-dark)}
  .nav-link:hover,.nav-link.active{border-bottom-color:var(--i1)}
  .pagebanner{background:#FFFFFF;border:1px solid var(--beige);
    border-radius:30px 10px 24px 14px / 12px 26px 9px 30px}
  h1{font-size:2.4rem;color:var(--brown-dark)}
  /* No rule under the title — the tinted sheets carry the colour now. */
  h1::after{content:none}
  h2{color:var(--brown-dark);border-bottom:none;padding-bottom:0;margin-bottom:15px;font-size:1.22rem}
  /* Hand-cut dot: a circle nobody quite closed. */
  h2::before{content:"";flex:0 0 auto;width:12px;height:12px;
    border-radius:62% 38% 54% 46% / 48% 58% 42% 52%;
    background:var(--ink,var(--i5))}
  /* Sheets of tinted paper, laid down a fraction off square. */
  section.card{background:var(--tint,var(--t5));box-shadow:var(--shadow);
    border:1.5px solid color-mix(in oklab,var(--ink,var(--i5)) 34%,transparent);
    border-radius:var(--sheet);transform:rotate(var(--tilt));padding:26px 30px;margin-bottom:22px}
  section.card:nth-of-type(1){--ink:var(--i1);--tint:var(--t1);--tilt:-.55deg;
    --sheet:52px 12px 36px 20px / 16px 44px 10px 50px}
  section.card:nth-of-type(2){--ink:var(--i2);--tint:var(--t2);--tilt:.45deg;
    --sheet:14px 48px 20px 34px / 46px 12px 52px 16px}
  section.card:nth-of-type(3){--ink:var(--i3);--tint:var(--t3);--tilt:-.4deg;
    --sheet:34px 18px 50px 12px / 12px 50px 16px 42px}
  section.card:nth-of-type(4){--ink:var(--i4);--tint:var(--t4);--tilt:.52deg;
    --sheet:18px 44px 12px 48px / 50px 14px 40px 12px}
  section.card:nth-of-type(5){--ink:var(--i5);--tint:var(--t5);--tilt:-.48deg;
    --sheet:46px 14px 40px 22px / 20px 48px 12px 44px}
  section.card:nth-of-type(6){--ink:var(--i1);--tint:var(--t1);--tilt:.38deg;
    --sheet:12px 50px 24px 40px / 44px 16px 46px 14px}
  li::marker{color:var(--ink,var(--i5))}
  .art-hero{border-radius:var(--radius-organic-lg)}
  .art-hero .bg{filter:blur(8px) saturate(.85)}
  .art-hero::after{background:
    linear-gradient(112deg,rgba(78,58,114,.80) 0%,rgba(168,70,90,.42) 48%,rgba(69,111,83,.24) 100%)}
  .art-hero .frame{border-radius:20px 26px 18px 24px;border-color:rgba(255,255,255,.94)}
  .btn{font-weight:600}
  .btn-primary{background:var(--i5);color:#FFFFFF}
  .btn-primary:hover{background:var(--brown-dark);color:#FFFFFF}
  .btn-ghost{border:1.5px solid var(--i3);color:var(--i3);background:#FFFFFF}
  .btn-ghost:hover{background:var(--t3);color:#33553F}
  .fx-eyebrow{color:var(--i1);letter-spacing:.1em}
  .fx-tile{background:#FFFFFF;border:1.5px solid color-mix(in oklab,var(--tile-ink) 48%,transparent);
    border-radius:var(--tile-sheet);transform:rotate(var(--tile-tilt))}
  .fx-tiles a:nth-child(1){--tile-ink:var(--i1);--tile-tilt:-.9deg;
    --tile-sheet:34px 8px 24px 14px / 10px 30px 6px 34px}
  .fx-tiles a:nth-child(2){--tile-ink:var(--i3);--tile-tilt:.75deg;
    --tile-sheet:9px 32px 13px 26px / 30px 8px 34px 11px}
  .fx-tiles a:nth-child(3){--tile-ink:var(--i4);--tile-tilt:-.65deg;
    --tile-sheet:26px 11px 34px 8px / 8px 34px 12px 28px}
  .fx-tile:hover{border-color:var(--tile-ink);box-shadow:var(--shadow-lg);
    transform:rotate(var(--tile-tilt)) translateY(-2px)}
  .fx-tile-go{color:var(--tile-ink);font-size:1.25rem}
  .fx-mail{border-bottom-color:var(--i1)}
  .nav-badge,.pending-badge{background:var(--t2);color:#6B4718;
    border:1px solid color-mix(in oklab,var(--i2) 40%,transparent)}
  footer.site-footer{margin-top:44px;padding-top:30px;border-top:3px solid transparent;
    border-image:linear-gradient(90deg,var(--t1),var(--t2) 26%,var(--t3) 52%,var(--t4) 76%,var(--t5)) 1}
  main .dyn-item{background:#FFFFFF;border:1.5px solid color-mix(in oklab,var(--i4) 40%,transparent);
    border-radius:26px 18px 22px 20px / 20px 24px 18px 26px}
  main .dyn-item .dyn-btn{background:var(--i5);color:#FFFFFF}
  main .dyn-item .dyn-btn:hover{background:var(--brown-dark);color:#FFFFFF}
  main .dyn-event .date-badge{background:var(--t4);border-color:color-mix(in oklab,var(--i4) 42%,transparent);
    border-radius:18px 11px 15px 13px / 13px 16px 11px 18px}
  main .dyn-event .date-badge b{color:var(--i4)}
  main .dyn-chip{background:var(--t5);color:var(--brown-dark)}
  main .dyn-empty{background:#FFFFFF;border:1.5px solid var(--beige)}
  .a11y-root .a11y-fab{background:var(--i5);border:2px solid #FFFFFF;
    border-radius:58% 42% 52% 48% / 46% 56% 44% 54%;color:#FFFFFF;
    box-shadow:0 12px 30px rgba(107,84,149,.36)}
  .a11y-root .a11y-fab:hover{background:var(--brown-dark)}
  .a11y-root .a11y-fab:focus-visible{outline:3px solid var(--i5)}
  .themebar{background:#FFFFFF;border:1.4px dashed color-mix(in oklab,var(--i5) 50%,transparent);
    border-radius:36px 12px 28px 16px / 14px 30px 10px 38px}
  .themebar a{border-radius:18px 7px 15px 9px / 8px 16px 6px 19px;
    border-color:color-mix(in oklab,var(--i5) 42%,transparent)}
`;

const CSS = { 'forum-alt1.html': ALT1, 'forum-alt2.html': ALT2, 'forum-alt3.html': ALT3, 'forum-alt4.html': ALT4 };

for (const t of THEMES) {
  let out = src;

  out = out.replace('<title>הפורום — מוקאפ</title>',
    `<title>הפורום — ערכת צבע: ${t.name}</title>`);

  const style = BAR_CSS + CSS[t.file];
  const i = out.lastIndexOf('</style>');
  if (i < 0) throw new Error('no </style> in ' + t.file);
  out = out.slice(0, i) + style + out.slice(i);

  const anchor = '<main id="main-content" tabindex="-1">\n';
  if (!out.includes(anchor)) throw new Error('no <main> anchor');
  out = out.replace(anchor, anchor + themebar(t.file));

  writeFileSync(dir + t.file, out);
  console.log('wrote', t.file, (out.length / 1024).toFixed(0) + 'KB');
}
