/* TEMPORARY — colour-scheme exploration, item for the cutover inventory.
   Builds mockup/pages/forum-alt1..4.html from forum.html: same markup, same
   content, four different palettes, plus a switcher bar linking them.

   Each theme is appended *after* the "page overrides" marker, because
   patch-responsive.mjs rewrites everything above it verbatim on every run.
   Overrides of .dyn-* rules are prefixed with `main ` on purpose: dynamic.js
   appends its <style> to <head> at runtime, after this stylesheet, so a tie on
   specificity goes to it.

   Re-run after editing a palette:  node mockup/forum-alts.mjs
   Do NOT run search-index.mjs while these exist — it globs pages/ and would
   index four duplicates of every forum.html section. Delete the four pages and
   this script once a direction is picked. */
import { readFileSync, writeFileSync } from 'node:fs';

const dir = new URL('./pages/', import.meta.url).pathname;
const src = readFileSync(dir + 'forum.html', 'utf8');

const THEMES = [
  { file: 'forum-alt1.html', name: 'יין ועצם' },
  { file: 'forum-alt2.html', name: 'שזיף ושמנת' },
  { file: 'forum-alt3.html', name: 'ניגודיות גבוהה' },
  { file: 'forum-alt4.html', name: 'פריזמה' },
];

/* ---------- the switcher bar (identical everywhere, token-driven) ---------- */
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
   Rudolf Steiner School NYC: one deep wine against bone-white, hairline
   rules instead of shadows, square corners, a full-bleed wine footer. */
const ALT1 = `
  /* ===== theme: יין ועצם / Wine & Bone ===== */
  :root{
    --cream:#F8F1F0;--beige:#EFE3E1;--tan:#DCC6C3;--tan-dark:#7C5F5D;
    --brown:#8B2E33;--brown-dark:#54181C;--text:#1F1A19;--text-muted:#5B5150;
    --white:#FFFFFF;
    --shadow:0 1px 3px rgba(31,26,25,.06);--shadow-lg:0 16px 42px rgba(84,24,28,.16);
    --radius:5px;--radius-lg:10px;
    --radius-organic-sm:6px;--radius-organic:6px;--radius-organic-lg:12px;
    --wash-rose:oklch(0.74 0.10 18);--wash-gold:oklch(0.84 0.05 62);
    --wash-sage:oklch(0.80 0.03 30);--wash-sky:oklch(0.78 0.04 320);
  }
  body{background:linear-gradient(180deg,#FFFFFF 0%,var(--cream) 520px)}
  /* No rainbow: one wine rule under a plain white bar. */
  .site-header{background:#FFFFFF;border-image:none;
    border-bottom:2px solid var(--brown);box-shadow:none}
  .nav-link:hover,.nav-link.active{border-bottom-color:var(--brown)}
  .dropdown{border:1px solid var(--beige);border-radius:0 0 var(--radius-lg) var(--radius-lg)}
  .brand-name{letter-spacing:.005em}
  h1{font-size:2.35rem;letter-spacing:.005em}
  /* A short wine rule reads as a masthead; the soft blob did not. */
  h1::after{inset-inline:auto;inset-inline-start:0;width:74px;height:3px;
    border-radius:0;opacity:1;bottom:-12px;background:var(--brown)}
  h2{color:var(--brown-dark);font-size:1.06rem;letter-spacing:.045em;
    border-bottom:1px solid var(--beige);padding-bottom:11px}
  section.card{border:1px solid #AA908D;box-shadow:none;padding:26px 30px}
  li::marker{color:var(--brown)}
  .art-hero{border-radius:var(--radius-lg)}
  .art-hero .bg{filter:blur(8px) saturate(.7)}
  .art-hero::after{background:linear-gradient(90deg,rgba(84,24,28,.80) 0%,rgba(84,24,28,.42) 48%,rgba(84,24,28,.10) 78%)}
  .art-hero .frame{border-radius:3px;border-color:rgba(255,255,255,.9)}
  .btn{border-radius:3px;letter-spacing:.02em}
  .btn-ghost{border-color:var(--brown);color:var(--brown)}
  .btn-ghost:hover{background:var(--brown);color:#FFFFFF}
  .btn-row .btn:nth-child(2n),.actions .btn:nth-child(2n){border-radius:3px}
  .chip-row .chip:nth-child(3n+2),.dyn-meta .dyn-chip:nth-child(3n+2),
  .chip-row .chip:nth-child(3n+3),.dyn-meta .dyn-chip:nth-child(3n+3){border-radius:var(--radius-pill)}
  .fx-eyebrow{color:var(--brown);letter-spacing:.12em}
  .fx-tile{border:1px solid #AA908D;border-radius:var(--radius);
    border-top:3px solid var(--brown);background:#FFFFFF}
  .fx-tile:hover{border-color:var(--brown);border-top-color:var(--brown-dark);
    background:var(--cream);transform:none;box-shadow:none}
  .fx-mail{border-bottom-color:var(--brown)}
  .nav-badge,.pending-badge{background:var(--brown);color:#FFFFFF;border-radius:2px}
  /* The wine block that closes the NYC page. */
  footer.site-footer{background:var(--brown-dark);color:#F3DAD9;margin-top:40px;padding:44px 24px 48px}
  footer.site-footer a{color:#FFFFFF}
  main .dyn-item{border:1px solid #AA908D;box-shadow:none;border-radius:var(--radius)}
  main .dyn-item .dyn-btn{border-radius:3px;background:var(--brown);color:#FFFFFF}
  main .dyn-item .dyn-btn:hover{background:var(--brown-dark);color:#FFFFFF}
`;

/* ========================== 2. שזיף ושמנת ==========================
   Waldorf School of Atlanta: plum on cream, a duotone hero cut off on a
   slant, squircle buttons, headings that trail a rule across the card. */
const ALT2 = `
  /* ===== theme: שזיף ושמנת / Plum & Cream ===== */
  :root{
    --cream:#FBF1DE;--beige:#F2E3C9;--tan:#DEC49B;--tan-dark:#7A6146;
    --brown:#6E2B7E;--brown-dark:#46154F;--text:#2C2233;--text-muted:#5A4E63;
    --white:#FFFCF5;
    --shadow:0 2px 10px rgba(70,21,79,.07);--shadow-lg:0 16px 40px rgba(70,21,79,.18);
    --radius:9px;--radius-lg:16px;
    --radius-organic-sm:12px 12px 12px 3px;
    --radius-organic:20px 20px 20px 5px;
    --radius-organic-lg:28px 28px 28px 7px;
    --wash-rose:oklch(0.68 0.18 340);--wash-gold:oklch(0.85 0.11 82);
    --wash-sage:oklch(0.62 0.15 300);--wash-sky:oklch(0.72 0.12 282);
  }
  body{background:
    radial-gradient(70% 40% at 100% 0%, color-mix(in oklab,var(--wash-rose) 8%,transparent), transparent 60%),
    linear-gradient(180deg,var(--cream) 0%,#FDF6E9 420px)}
  .site-header{background:var(--cream);border-width:0 0 4px;
    border-image:linear-gradient(90deg,var(--brown-dark),var(--brown) 45%,var(--wash-rose)) 1}
  .nav-link:hover,.nav-link.active{border-bottom-color:var(--brown)}
  h1{color:var(--brown-dark);font-size:2.3rem}
  h1::after{height:9px;bottom:-6px;opacity:.85;
    background:radial-gradient(60% 100% at 25% 50%, color-mix(in oklab,var(--wash-rose) 70%,transparent), transparent 74%),
               radial-gradient(60% 100% at 74% 50%, color-mix(in oklab,var(--wash-gold) 72%,transparent), transparent 74%)}
  /* "A Day at WSA ————" — the rule runs out from the heading to the card edge. */
  h2{color:var(--brown);border-bottom:none;padding-bottom:0;margin-bottom:16px;font-size:1.24rem}
  h2::after{content:"";flex:1 1 auto;height:1.5px;min-width:24px;
    background:color-mix(in oklab,var(--brown) 40%,transparent)}
  section.card{border:1px solid #B08B57;padding:24px 28px}
  li::marker{color:var(--brown)}
  /* The slanted band the Atlanta hero ends on. The cut lifts from the end edge,
     where only blurred backdrop sits — the caption is at the start edge. */
  .art-hero{isolation:isolate;border-radius:0;
    clip-path:polygon(0 0,100% 0,100% 100%,0 93%)}
  .art-hero .bg{filter:blur(7px) grayscale(1) contrast(1.08)}
  .art-hero::after{mix-blend-mode:multiply;
    background:linear-gradient(115deg,rgba(70,21,79,.92) 0%,rgba(126,38,124,.82) 45%,rgba(190,60,150,.66) 100%)}
  .art-hero .frame{border-radius:14px 14px 14px 4px;border-color:rgba(255,252,245,.9)}
  .art-hero .cap{padding-bottom:26px}
  .btn{font-weight:600}
  .btn-primary:hover{background:var(--brown-dark)}
  .btn-ghost{border-color:var(--brown);color:var(--brown)}
  .btn-ghost:hover{background:color-mix(in oklab,var(--brown) 10%,transparent);color:var(--brown-dark)}
  .fx-eyebrow{color:var(--brown);letter-spacing:.1em}
  .fx-tile{background:var(--white);border:1px solid #B08B57;
    border-inline-start:4px solid var(--brown);border-radius:16px 16px 16px 4px}
  .fx-tile:hover{border-color:var(--brown);background:#FFFFFF}
  .fx-tile-go{font-size:1.25rem;color:var(--brown)}
  .fx-mail{border-bottom-color:var(--brown)}
  .nav-badge,.pending-badge{background:var(--wash-gold);color:var(--brown-dark)}
  footer.site-footer{background:var(--brown-dark);color:#EBD9F0;margin-top:44px;padding:40px 24px 46px}
  footer.site-footer a{color:#FFFFFF}
  main .dyn-item{border:1px solid #B08B57}
  main .dyn-item .dyn-btn{background:var(--brown);color:#FFFFFF}
  main .dyn-item .dyn-btn:hover{background:var(--brown-dark);color:#FFFFFF}
`;

/* ========================= 3. ניגודיות גבוהה =========================
   Ink on paper with one amber. Every edge is a 2px black line, every
   shadow is a hard offset — nothing carries meaning by colour alone. */
const ALT3 = `
  /* ===== theme: ניגודיות גבוהה / Ink & Amber ===== */
  :root{
    --cream:#FFFFFF;--beige:#E8E8E4;--tan:#111111;--tan-dark:#2B2B2B;
    --brown:#111111;--brown-dark:#000000;--text:#000000;--text-muted:#333333;
    --white:#FFFFFF;
    --amber:#FFC400;
    --shadow:none;--shadow-lg:5px 5px 0 #000000;
    --radius:3px;--radius-lg:4px;
    --radius-organic-sm:3px;--radius-organic:3px;--radius-organic-lg:4px;
    --wash-rose:oklch(0.92 0 0);--wash-gold:oklch(0.85 0.17 88);
    --wash-sage:oklch(0.94 0 0);--wash-sky:oklch(0.90 0 0);
  }
  body{background:#FFFFFF}
  .site-header{background:#FFFFFF;border-width:0 0 3px;border-image:none;
    border-bottom:3px solid #000000;box-shadow:none}
  .nav-link{color:#000000;font-weight:600}
  .nav-link:hover,.nav-link.active{border-bottom-color:var(--amber);color:#000000}
  .dropdown{border:2px solid #000000;border-radius:0;box-shadow:5px 5px 0 #000000}
  .dropdown-link{color:#111111}
  .dropdown-link:hover,.dropdown-link.active{background:var(--amber);color:#000000}
  .dropdown-head{color:#000000;font-weight:700}
  .dropdown-sep{background:#000000}
  .pagebanner{border:2px solid #000000;box-shadow:none;border-radius:3px}
  .pagebanner .crumb{color:#333333}
  h1{font-size:2.4rem}
  /* An amber bar behind the baseline, not a wash under it. */
  h1::after{height:14px;bottom:-2px;border-radius:0;opacity:1;
    background:var(--amber);z-index:-1}
  h2{border-bottom:3px solid #000000;padding-bottom:9px;letter-spacing:.01em}
  section.card{border:2px solid #000000;box-shadow:none;border-radius:4px;padding:24px 28px}
  li::marker{color:#000000}
  /* Underline the links that sit inside running text — colour is never the
     only cue. Scoped to <main>: an underlined nav bar reads as noise, and a
     blanket a:hover would paint amber behind the brand name and the tiles. */
  main p a,main li a,main td a{text-decoration:underline;text-underline-offset:3px}
  main p a:hover,main li a:hover,main td a:hover{background:var(--amber);color:#000000}
  .pagebanner a.crumb:hover{background:var(--amber);color:#000000;text-decoration:underline}
  .art-hero{border-radius:4px;border:2px solid #000000;box-shadow:none}
  .art-hero .bg{filter:blur(6px) grayscale(1) contrast(1.2)}
  .art-hero::after{background:linear-gradient(90deg,rgba(0,0,0,.88) 0%,rgba(0,0,0,.66) 50%,rgba(0,0,0,.34) 82%)}
  .art-hero .frame{border-radius:2px;border:3px solid #FFFFFF}
  .art-hero .cap{text-shadow:none}
  .btn{border-radius:3px;font-weight:700;border:2px solid #000000;text-decoration:none}
  .btn:hover{background:var(--amber)}
  .btn-primary{background:#000000;color:#FFFFFF}
  .btn-primary:hover{background:var(--amber);color:#000000}
  .btn-ghost{background:#FFFFFF;color:#000000}
  .btn-ghost:hover{background:var(--amber);color:#000000}
  .btn-row .btn:nth-child(2n),.actions .btn:nth-child(2n){border-radius:3px}
  .chip-row .chip:nth-child(3n+2),.dyn-meta .dyn-chip:nth-child(3n+2),
  .chip-row .chip:nth-child(3n+3),.dyn-meta .dyn-chip:nth-child(3n+3){border-radius:3px}
  .fx-eyebrow{color:#000000;letter-spacing:.12em;text-decoration:underline;
    text-decoration-color:var(--amber);text-decoration-thickness:4px;text-underline-offset:3px}
  .fx-tile{border:2px solid #000000;border-radius:3px;background:#FFFFFF;text-decoration:none}
  .fx-tile:hover{background:var(--amber);border-color:#000000;transform:none;box-shadow:4px 4px 0 #000000}
  .fx-tile-sub{color:#333333}
  .fx-mail{border-bottom:3px solid var(--amber);color:#000000;text-decoration:none}
  .fx-mail:hover{background:var(--amber);color:#000000;border-bottom-color:#000000}
  .nav-badge,.pending-badge{background:var(--amber);color:#000000;border:1px solid #000000;border-radius:2px}
  footer.site-footer{color:#333333;border-top:3px solid #000000;margin-top:44px;padding-top:28px}
  main .dyn-item{border:2px solid #000000;box-shadow:none;border-radius:3px}
  main .dyn-item .dyn-btn{background:#000000;color:#FFFFFF;border:2px solid #000000;border-radius:3px;text-decoration:none}
  main .dyn-item .dyn-btn:hover{background:var(--amber);color:#000000}
  main .dyn-event .date-badge{background:var(--amber);border:2px solid #000000;border-radius:3px;color:#000000}
  main .dyn-event .date-badge b{color:#000000}
  main .dyn-event .date-badge span{color:#000000}
  main .dyn-chip{background:#FFFFFF;border:1.5px solid #000000;color:#000000}
  main .dyn-empty{background:#FFFFFF;border:2px dashed #000000;color:#000000}
  :focus-visible{outline:3px solid #000000;outline-offset:3px;box-shadow:0 0 0 6px var(--amber)}
`;

/* ============================ 4. פריזמה ============================
   Every card takes one hue off a five-colour wheel, so the page reads as a
   spectrum rather than as one accent repeated. Text stays deep indigo. */
const ALT4 = `
  /* ===== theme: פריזמה / Prism ===== */
  :root{
    --cream:#FFF3E6;--beige:#FFE6D2;--tan:#FFBE93;--tan-dark:#A83E12;
    --brown:#7C3AED;--brown-dark:#4C1D95;--text:#241B45;--text-muted:#4E4470;
    --white:#FFFFFF;
    --c1:#E11D48;--c2:#CC6D00;--c3:#0B8E7D;--c4:#2563EB;--c5:#7C3AED;
    --shadow:0 3px 14px rgba(36,27,69,.09);--shadow-lg:0 18px 44px rgba(124,58,237,.24);
    --radius:10px;--radius-lg:22px;
    --radius-organic-sm:14px 26px 12px 24px / 24px 12px 27px 14px;
    --radius-organic:26px 52px 24px 48px / 48px 24px 54px 26px;
    --radius-organic-lg:36px 70px 32px 64px / 64px 32px 72px 36px;
    --wash-rose:oklch(0.70 0.20 20);--wash-gold:oklch(0.83 0.17 78);
    --wash-sage:oklch(0.74 0.14 175);--wash-sky:oklch(0.70 0.17 258);
  }
  body{background:
    radial-gradient(75% 45% at 100% 0%, color-mix(in oklab,var(--wash-rose) 22%,transparent), transparent 62%),
    radial-gradient(70% 40% at 0% 4%, color-mix(in oklab,var(--wash-sky) 20%,transparent), transparent 62%),
    radial-gradient(90% 50% at 50% 100%, color-mix(in oklab,var(--wash-sage) 16%,transparent), transparent 66%),
    linear-gradient(180deg,#FFF9F3 0%,var(--cream) 480px)}
  .site-header{border-width:0 0 5px;
    background:
      radial-gradient(120% 150% at 10% 0%, color-mix(in oklab,var(--wash-rose) 40%,transparent), transparent 56%),
      radial-gradient(120% 150% at 40% 0%, color-mix(in oklab,var(--wash-gold) 42%,transparent), transparent 56%),
      radial-gradient(120% 160% at 72% 0%, color-mix(in oklab,var(--wash-sage) 36%,transparent), transparent 56%),
      radial-gradient(120% 160% at 98% 0%, color-mix(in oklab,var(--wash-sky) 34%,transparent), transparent 56%),
      #FFF9F3;
    border-image:linear-gradient(90deg,var(--c1),var(--c2) 26%,var(--c3) 52%,var(--c4) 76%,var(--c5)) 1}
  .nav-link{color:var(--brown-dark)}
  .nav-link:hover,.nav-link.active{border-bottom-color:var(--c1)}
  h1{font-size:2.4rem;color:var(--brown-dark)}
  h1::after{height:14px;bottom:-8px;opacity:.9;border-radius:999px;
    background:linear-gradient(90deg,var(--c1),var(--c2) 28%,var(--c3) 55%,var(--c4) 78%,var(--c5))}
  h2{color:var(--brown-dark);border-bottom:none;padding-bottom:0;margin-bottom:15px;font-size:1.24rem}
  /* Each card owns a hue: a bar across the top and a matching heading dot. */
  h2::before{content:"";flex:0 0 auto;width:11px;height:11px;border-radius:50%;
    background:var(--card-hue,var(--c5))}
  section.card{position:relative;overflow:hidden;padding:26px 28px 24px;
    border:1px solid color-mix(in oklab,var(--card-hue,var(--c5)) 55%,var(--white))}
  section.card::before{content:"";position:absolute;inset-block-start:0;inset-inline:0;height:5px;
    background:var(--card-hue,var(--c5))}
  section.card:nth-of-type(1){--card-hue:var(--c1)}
  section.card:nth-of-type(2){--card-hue:var(--c2)}
  section.card:nth-of-type(3){--card-hue:var(--c3)}
  section.card:nth-of-type(4){--card-hue:var(--c4)}
  section.card:nth-of-type(5){--card-hue:var(--c5)}
  section.card:nth-of-type(6){--card-hue:var(--c1)}
  li::marker{color:var(--card-hue,var(--c5))}
  .art-hero{border-radius:var(--radius-lg)}
  .art-hero .bg{filter:blur(7px) saturate(1.5)}
  .art-hero::after{background:
    linear-gradient(110deg,rgba(76,29,149,.86) 0%,rgba(225,29,72,.52) 46%,rgba(14,159,140,.32) 100%)}
  .art-hero .frame{border-radius:18px;border-color:rgba(255,255,255,.92)}
  .btn{font-weight:600}
  .btn-primary{background:linear-gradient(115deg,var(--c5),var(--c1));color:#FFFFFF}
  .btn-primary:hover{background:linear-gradient(115deg,var(--brown-dark),#BE123C);color:#FFFFFF;
    box-shadow:0 8px 22px rgba(124,58,237,.35)}
  .btn-ghost{border:2px solid var(--c3);color:var(--c3)}
  .btn-ghost:hover{background:color-mix(in oklab,var(--c3) 14%,transparent);color:#095F53}
  .fx-eyebrow{color:var(--c1);letter-spacing:.11em}
  .fx-tile{background:#FFFFFF;border:2px solid color-mix(in oklab,var(--tile-hue) 65%,var(--white));
    border-radius:var(--radius-organic-sm)}
  .fx-tiles a:nth-child(1){--tile-hue:var(--c1)}
  .fx-tiles a:nth-child(2){--tile-hue:var(--c3)}
  .fx-tiles a:nth-child(3){--tile-hue:var(--c4)}
  .fx-tile:hover{border-color:var(--tile-hue);
    background:color-mix(in oklab,var(--tile-hue) 7%,#FFFFFF);
    box-shadow:0 12px 26px color-mix(in oklab,var(--tile-hue) 22%,transparent)}
  .fx-tile-go{color:var(--tile-hue);font-size:1.3rem}
  .fx-mail{border-bottom-color:var(--c1)}
  .nav-badge,.pending-badge{background:var(--c2);color:#2B1200}
  footer.site-footer{margin-top:40px;padding-top:30px;
    border-top:4px solid transparent;
    border-image:linear-gradient(90deg,var(--c1),var(--c2) 26%,var(--c3) 52%,var(--c4) 76%,var(--c5)) 1}
  main .dyn-item{border:1.5px solid color-mix(in oklab,var(--c4) 55%,var(--white))}
  main .dyn-item .dyn-btn{background:linear-gradient(115deg,var(--c5),var(--c1));color:#FFFFFF}
  main .dyn-item .dyn-btn:hover{background:linear-gradient(115deg,var(--brown-dark),#BE123C);color:#FFFFFF}
  main .dyn-event .date-badge{background:color-mix(in oklab,var(--c4) 14%,#FFFFFF);
    border-color:color-mix(in oklab,var(--c4) 45%,transparent)}
  main .dyn-event .date-badge b{color:#1D4ED8}
`;

const CSS = { 'forum-alt1.html': ALT1, 'forum-alt2.html': ALT2, 'forum-alt3.html': ALT3, 'forum-alt4.html': ALT4 };

for (const t of THEMES) {
  let out = src;

  out = out.replace('<title>הפורום — מוקאפ</title>',
    `<title>הפורום — ערכת צבע: ${t.name}</title>`);

  const style = CSS[t.file] + BAR_CSS;
  const i = out.lastIndexOf('</style>');
  if (i < 0) throw new Error('no </style> in ' + t.file);
  out = out.slice(0, i) + style + out.slice(i);

  const anchor = '<main id="main-content" tabindex="-1">\n';
  if (!out.includes(anchor)) throw new Error('no <main> anchor');
  out = out.replace(anchor, anchor + themebar(t.file));

  writeFileSync(dir + t.file, out);
  console.log('wrote', t.file, (out.length / 1024).toFixed(0) + 'KB');
}
