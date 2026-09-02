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
  { file: 'forum-alt3.html', name: 'ציור בפינה' },
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

/* Shared across all four. The art-hero caption is white type over a blurred
   photograph, and the veil that carries it is a horizontal gradient: by the
   time the text sits at 56% width on a phone, the veil has run out. Measured
   on the glyph pixels themselves, alt3 — which is forum.html's own art-hero,
   untouched — came out at 2.62:1 at 375px and 3.78:1 at 600px, against the
   4.5:1 that 15px bold needs. A bottom scrim puts it back at every width.

   axe reports none of this. Text over a background image is "incomplete" to
   it, not failed, so the four clean axe runs never covered this caption — and
   the same measurement applies to the other 41 pages, which is a finding about
   the mockup, not about these four. The .cap and .frame are already z-index:2,
   so a z-index:1 scrim sits under them and over the veil. */
const HERO_SCRIM = `
  .art-hero::before{content:"";position:absolute;inset:0;z-index:1;pointer-events:none;
    background:linear-gradient(to top,rgba(20,8,16,.66) 0%,rgba(20,8,16,.30) 30%,transparent 58%)}
  /* The band drops to 200px and then 150px, so the same scrim covers far less
     of the caption; below 720px it has to be deeper and reach higher. */
  @media (max-width:720px){
    .art-hero::before{background:linear-gradient(to top,
      rgba(20,8,16,.84) 0%,rgba(20,8,16,.60) 44%,rgba(20,8,16,.20) 68%,transparent 88%)}
  }
`;

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
  /* floralwhite behind the content, white panels on top of it — including
     the space below main, which is body ground showing through the
     footer's top margin. */
  body{background:floralwhite}
  main#main-content{background:floralwhite}
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
  .a11y-root .a11y-fab{background:var(--brown-dark);border:0;
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
  /* Full-bleed, drained and re-lit rather than saturated, and masked so it
     fades in from the right instead of ending on an edge. main carries the
     only inset, so the negative margins are its padding at each breakpoint —
     restated at the end of this block because those media queries come later
     in the sheet and would otherwise win. */
  .art-hero{border-radius:0;box-shadow:none;margin-inline:-24px;
    -webkit-mask-image:linear-gradient(to right,#000 0%,#000 52%,rgba(0,0,0,.55) 78%,transparent 100%);
    mask-image:linear-gradient(to right,#000 0%,#000 52%,rgba(0,0,0,.55) 78%,transparent 100%)}
  .art-hero .bg{filter:blur(8px) grayscale(1) contrast(.95) brightness(1.22)}
  /* The white bottom fade was lightening exactly the corner the caption sits
     in, and white 13px type came out at 3.24:1 over it. The right-side mask
     already does the dissolving, so it goes and the veil deepens instead. */
  .art-hero::after{background:
    linear-gradient(118deg,rgba(52,12,60,.93) 0%,rgba(96,28,98,.80) 30%,
      rgba(150,62,150,.52) 62%,rgba(196,140,205,.30) 100%)}
  .art-hero .frame{border-radius:0;border:0;box-shadow:0 14px 40px rgba(30,10,35,.45);
    margin-inline-end:40px}
  .art-hero .cap{padding-bottom:22px;padding-inline:40px}
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
  main .dyn-item{background:#FFFFFF;border-radius:0;border:1px solid transparent;box-shadow:var(--shadow);
    border-image:linear-gradient(150deg,color-mix(in oklab,var(--veil) 70%,transparent),transparent 62%) 1}
  main .dyn-item .dyn-btn{border-radius:0;background:var(--brown);color:#FFFFFF}
  main .dyn-item .dyn-btn:hover{background:var(--brown-dark);color:#FFFFFF}
  main .dyn-event .date-badge{border-radius:0;background:#FFFFFF;
    border-color:color-mix(in oklab,var(--veil) 45%,transparent)}
  main .dyn-empty{border-radius:0;background:#FFFFFF}
  .a11y-root .a11y-fab{background:var(--brown);border:0;
    border-radius:0;color:#FFFFFF;box-shadow:0 14px 34px rgba(70,21,79,.34)}
  .a11y-root .a11y-fab:hover{background:var(--brown-dark)}
  .a11y-root .a11y-fab:focus-visible{outline:3px solid var(--brown)}
  .themebar{background:transparent;border:0;border-radius:0;padding-inline:2px;
    border-bottom:1px solid transparent;
    border-image:linear-gradient(90deg,color-mix(in oklab,var(--veil) 60%,transparent),transparent 72%) 1}
  .themebar a{border-radius:0;border-color:color-mix(in oklab,var(--veil) 55%,transparent)}
  @media (max-width:720px){.art-hero{margin-inline:-18px}
    .art-hero .frame{margin-inline-end:26px}.art-hero .cap{padding-inline:26px}}
  @media (max-width:560px){.art-hero{margin-inline:-14px}
    .art-hero .frame{margin-inline-end:20px}.art-hero .cap{padding-inline:20px}}
  @media (max-width:400px){.art-hero{margin-inline:-12px}}
`;

/* ========================= 3. ציור בפינה =========================
   Not a palette at all: forum.html's own colours, untouched, with the
   watercolour dropped into the page's top-left corner. The file carries a real
   alpha channel that fades to nothing, so it needs no blend mode — it settles
   onto whatever ground is already there.

   It is painted twice, on the body and on the header, because the header is
   opaque and would otherwise cut the top off it. Both boxes start at the
   page's top-left corner (the body has no margin, the header no padding of its
   own), so the two copies line up and read as one wash.

   The offset is not decoration. At 0,0 the painting's most saturated orange
   lands on the nav row, where --brown reads 4.31:1 against it — under AA for
   the 0.94rem links. Pushing the origin up and out puts the peak above the bar
   and leaves the nav over the mid-tones. */
const PAINT = './img/paint-top-left.webp';
/* The same painting at 30% alpha. Diluting it in the file rather than with
   background-blend-mode keeps one clean declaration and, more to the point,
   keeps the result predictable: multiplying the full-strength wash into a
   pastel tint turned the first sheet into saturated orange. */
const PAINT_WASH = './img/paint-wash.webp';
const ALT3 = `
  /* ===== theme: ציור בפינה / the site as it stands, plus a corner wash ===== */
  :root{--paint:url(${PAINT});--paint-w:min(72vw,940px);--paint-pos:-120px -78px}
  body{background:
      var(--paint) no-repeat var(--paint-pos)/var(--paint-w) auto,
      radial-gradient(90% 55% at 100% 0%, color-mix(in oklab,var(--wash-rose) 10%,transparent), transparent 60%),
      radial-gradient(85% 50% at 0% 3%, color-mix(in oklab,var(--wash-sage) 9%,transparent), transparent 60%),
      linear-gradient(180deg,var(--beige) 0%,var(--cream) 360px)}
  .site-header{background:
      var(--paint) no-repeat var(--paint-pos)/var(--paint-w) auto,
      radial-gradient(120% 150% at 14% 0%, color-mix(in oklab,var(--wash-rose) 30%,transparent), transparent 55%),
      radial-gradient(120% 150% at 50% 0%, color-mix(in oklab,var(--wash-gold) 30%,transparent), transparent 55%),
      radial-gradient(120% 160% at 86% 0%, color-mix(in oklab,var(--wash-sage) 26%,transparent), transparent 55%),
      var(--cream)}
  /* On a phone the header is the only place the wash can show at all, so it
     gets a size that still reads there instead of a sliver in the corner. */
  @media (max-width:720px){
    :root{--paint-w:min(112vw,560px);--paint-pos:-70px -52px}
  }
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
    --paint-wash:url(${PAINT_WASH});
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
  .pagebanner{background:#FFFFFF;border:0;
    border-radius:30px 10px 24px 14px / 12px 26px 9px 30px}
  h1{font-size:2.4rem;color:var(--brown-dark)}
  /* No rule under the title — the tinted sheets carry the colour now. */
  h1::after{content:none}
  h2{color:var(--brown-dark);border-bottom:none;padding-bottom:0;margin-bottom:15px;font-size:1.22rem}
  /* Hand-cut dot: a circle nobody quite closed. */
  h2::before{content:"";flex:0 0 auto;width:12px;height:12px;
    border-radius:62% 38% 54% 46% / 48% 58% 42% 52%;
    background:var(--ink,var(--i5))}
  /* Sheets of tinted paper — cut, not ruled: the corners are uneven, but the
     sheet sits square. A tilt read as a scrapbook, which is the wrong register
     for an umbrella organisation.
     No outline anywhere: what separates a sheet from the page is its own
     colour. The watercolour goes on as a second background layer rather than a
     pseudo-element, so nothing has to be fought out of the paint order — the
     file's own alpha does the fading, and background-blend-mode multiplies it
     into the tint below. Each sheet takes a different corner of the same
     painting, so no two are the same wash. */
  section.card{background-color:var(--tint,var(--t5));box-shadow:var(--shadow);border:0;
    background-image:var(--paint-wash);background-repeat:no-repeat;
    background-position:var(--wash,left top);background-size:var(--wash-size,175% auto);
    border-radius:var(--sheet);padding:26px 30px;margin-bottom:22px}
  section.card:nth-of-type(1){--ink:var(--i1);--tint:var(--t1);--wash:left -40px top -30px;
    --sheet:52px 12px 36px 20px / 16px 44px 10px 50px}
  section.card:nth-of-type(2){--ink:var(--i2);--tint:var(--t2);--wash:right -70px bottom -40px;
    --sheet:14px 48px 20px 34px / 46px 12px 52px 16px}
  section.card:nth-of-type(3){--ink:var(--i3);--tint:var(--t3);--wash:right -30px top -20px;
    --sheet:34px 18px 50px 12px / 12px 50px 16px 42px}
  section.card:nth-of-type(4){--ink:var(--i4);--tint:var(--t4);--wash:left -60px bottom -50px;
    --sheet:18px 44px 12px 48px / 50px 14px 40px 12px}
  section.card:nth-of-type(5){--ink:var(--i5);--tint:var(--t5);--wash:left -20px top -60px;
    --sheet:46px 14px 40px 22px / 20px 48px 12px 44px}
  section.card:nth-of-type(6){--ink:var(--i1);--tint:var(--t1);--wash:right -50px top -10px;
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
  /* The outline is what made this read as a button, so it becomes a fill
     rather than nothing at all. */
  .btn-ghost{border:0;background:var(--t3);color:#2F5240}
  .btn-ghost:hover{background:color-mix(in oklab,var(--i3) 22%,#FFFFFF);color:#2F5240}
  .fx-eyebrow{color:var(--i1);letter-spacing:.1em}
  .fx-tile{background:#FFFFFF;border:0;box-shadow:var(--shadow);
    border-radius:var(--tile-sheet)}
  .fx-tiles a:nth-child(1){--tile-ink:var(--i1);--tile-sheet:34px 8px 24px 14px / 10px 30px 6px 34px}
  .fx-tiles a:nth-child(2){--tile-ink:var(--i3);--tile-sheet:9px 32px 13px 26px / 30px 8px 34px 11px}
  .fx-tiles a:nth-child(3){--tile-ink:var(--i4);--tile-sheet:26px 11px 34px 8px / 8px 34px 12px 28px}
  .fx-tile:hover{box-shadow:var(--shadow-lg);transform:translateY(-2px)}
  .fx-tile-go{color:var(--tile-ink);font-size:1.25rem}
  .fx-mail{border-bottom-color:var(--i1)}
  .nav-badge,.pending-badge{background:var(--t2);color:#6B4718;border:0}
  footer.site-footer{margin-top:44px;padding-top:30px;border-top:3px solid transparent;
    border-image:linear-gradient(90deg,var(--t1),var(--t2) 26%,var(--t3) 52%,var(--t4) 76%,var(--t5)) 1}
  main .dyn-item{background:#FFFFFF;border:0;box-shadow:var(--shadow);
    border-radius:26px 18px 22px 20px / 20px 24px 18px 26px}
  main .dyn-item .dyn-btn{background:var(--i5);color:#FFFFFF}
  main .dyn-item .dyn-btn:hover{background:var(--brown-dark);color:#FFFFFF}
  main .dyn-event .date-badge{background:var(--t4);border:0;
    border-radius:18px 11px 15px 13px / 13px 16px 11px 18px}
  main .dyn-event .date-badge b{color:var(--i4)}
  main .dyn-chip{background:var(--t5);color:var(--brown-dark)}
  main .dyn-empty{background:#FFFFFF;border:0;box-shadow:var(--shadow)}
  .a11y-root .a11y-fab{background:var(--i5);border:0;
    border-radius:58% 42% 52% 48% / 46% 56% 44% 54%;color:#FFFFFF;
    box-shadow:0 12px 30px rgba(107,84,149,.36)}
  .a11y-root .a11y-fab:hover{background:var(--brown-dark)}
  .a11y-root .a11y-fab:focus-visible{outline:3px solid var(--i5)}
  .themebar{background:#FFFFFF;border:0;box-shadow:var(--shadow);
    border-radius:36px 12px 28px 16px / 14px 30px 10px 38px}
  .themebar a{border-radius:18px 7px 15px 9px / 8px 16px 6px 19px;
    border-color:color-mix(in oklab,var(--i5) 42%,transparent)}
`;

const CSS = { 'forum-alt1.html': ALT1, 'forum-alt2.html': ALT2, 'forum-alt3.html': ALT3, 'forum-alt4.html': ALT4 };

for (const t of THEMES) {
  let out = src;

  out = out.replace('<title>הפורום — מוקאפ</title>',
    `<title>הפורום — ערכת צבע: ${t.name}</title>`);

  const style = BAR_CSS + CSS[t.file] + HERO_SCRIM;
  const i = out.lastIndexOf('</style>');
  if (i < 0) throw new Error('no </style> in ' + t.file);
  out = out.slice(0, i) + style + out.slice(i);

  const anchor = '<main id="main-content" tabindex="-1">\n';
  if (!out.includes(anchor)) throw new Error('no <main> anchor');
  out = out.replace(anchor, anchor + themebar(t.file));

  writeFileSync(dir + t.file, out);
  console.log('wrote', t.file, (out.length / 1024).toFixed(0) + 'KB');
}
