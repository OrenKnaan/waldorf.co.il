/* Builds mockup/pages/home-hero-light.html from home.html.

   The light hero is the homepage with a different skin: cream veils instead of
   warm-black ones, and dark text instead of white. Keeping it as a generated
   file rather than a second hand-maintained copy is the same reasoning as
   sorting-pages.mjs - the hero is being iterated on, and a copy would silently
   stop matching. Change home-hero.html, then re-run this.

       node mockup/make-hero-light.mjs

   Everything below is one appended block of overrides scoped to
   body.has-hero-light, so the base hero CSS is byte-identical between the two
   pages and this file only ever adds. */
import { readFileSync, writeFileSync } from 'node:fs';

const SRC = 'mockup/pages/home.html';
const OUT = 'mockup/pages/home-hero-light.html';

let s = readFileSync(SRC, 'utf8');

// ---- 1. mark the page -------------------------------------------------------
s = s.replace('<body class="has-hero">', '<body class="has-hero has-hero-light">');
s = s.replace('<title>דף הבית — מוקאפ</title>',
              '<title>דף הבית (גרסת הירו הבהירה) — מוקאפ</title>');

// ---- 2. the skin ------------------------------------------------------------
// Alphas are inherited from the dark theme unchanged. They were tuned so the
// veil carries the text against the worst pixel in any of the five photographs,
// and that requirement is symmetrical: white text needs the veil dark enough,
// dark text needs it bright enough, and the same opacity does both jobs.
const LIGHT = `
  /* ===== light hero: cream veils, dark text (generated - see make-hero-light.mjs) ===== */
  /* --hero-shade is the only value the veils and the translucent controls read,
     so re-pointing it at the page's own cream flips all of them at once. */
  body.has-hero-light{--hero-shade:250,246,240}
  body.has-hero-light .hero-wrap{background:var(--cream)}
  /* The foot veil is a little heavier than the dark skin's. The worst pixel for
     white text is a bright one and for dark text a dark one, and three of the
     five photographs are dim - so cream at the shared setting left the paragraph
     at 4.60:1, a tenth above the floor. This buys it back. */
  body.has-hero-light .hero-veil{background:
    linear-gradient(to bottom,rgba(var(--hero-shade),.80) 0,rgba(var(--hero-shade),.52) 28%,rgba(var(--hero-shade),.08) 60%,rgba(var(--hero-shade),0) 100%),
    linear-gradient(to top,rgba(var(--hero-shade),.90) 0,rgba(var(--hero-shade),.76) 32%,rgba(var(--hero-shade),.28) 64%,rgba(var(--hero-shade),0) 100%)}

  /* Header. The shadow is a light halo rather than a dark one: it is there to
     hold the letterforms apart from a busy photograph, so it has to be the
     colour of the veil, not its opposite. */
  body.has-hero-light .brand-name,
  body.has-hero-light .nav-link{color:var(--brown-dark);text-shadow:0 1px 10px rgba(250,246,240,.9)}
  body.has-hero-light .brand-link:hover .brand-name{color:var(--brown)}
  body.has-hero-light .nav-link:hover,
  body.has-hero-light .nav-link.active{color:var(--brown-dark);border-bottom-color:var(--brown)}
  body.has-hero-light .nav-toggle .bars,
  body.has-hero-light .nav-toggle .bars::before,
  body.has-hero-light .nav-toggle .bars::after{background:var(--brown-dark)}
  body.has-hero-light .wsearch-btn{color:var(--brown-dark)}
  body.has-hero-light .wsearch-btn:hover,
  body.has-hero-light .wsearch-btn[aria-expanded="true"]{color:var(--brown-dark);border-block-end-color:var(--brown)}

  body.has-hero-light .hero-lede{color:var(--brown-dark);text-shadow:0 1px 12px rgba(250,246,240,.9)}

  /* The buttons swap round: the solid one is now the dark shape on a light
     field. Both restate their colour on hover, because the bare a:hover rule in
     this stylesheet is (0,1,1) and would otherwise repaint the label. */
  body.has-hero-light .hero-btn-primary{background:var(--brown-dark);color:var(--cream);border-color:var(--brown-dark)}
  body.has-hero-light .hero-btn-primary:hover{background:var(--brown);border-color:var(--brown);color:var(--cream)}
  body.has-hero-light .hero-btn-ghost{background:rgba(250,246,240,.62);color:var(--brown-dark);border-color:rgba(61,43,31,.5)}
  body.has-hero-light .hero-btn-ghost:hover{background:rgba(250,246,240,.85);border-color:var(--brown-dark);color:var(--brown-dark)}

  body.has-hero-light .hero-play{color:var(--brown-dark);border-color:rgba(61,43,31,.45)}
  body.has-hero-light .hero-play:hover{border-color:var(--brown-dark)}
  /* --wash-gold is a pale yellow; it reads as an accent on a dark field and
     nearly vanishes on a cream one, so the current dot is the dark token here. */
  body.has-hero-light .hero-dot::after{background:rgba(61,43,31,.42)}
  body.has-hero-light .hero-dot:hover::after{background:var(--brown-dark)}
  body.has-hero-light .hero-dot[aria-current]::after{background:var(--brown-dark)}
  body.has-hero-light .hero-rail{background:rgba(61,43,31,.16)}

  @media (max-width:720px){
    /* The base page deepens .hero-veil at this width for the taller wrapped
       paragraph, but the light rule above is a class more specific and would
       win, so the narrow case has to be restated here as well. */
    body.has-hero-light .hero-veil{background:
      linear-gradient(to bottom,rgba(var(--hero-shade),.80) 0,rgba(var(--hero-shade),.52) 28%,rgba(var(--hero-shade),.08) 60%,rgba(var(--hero-shade),0) 100%),
      linear-gradient(to top,rgba(var(--hero-shade),.94) 0,rgba(var(--hero-shade),.84) 40%,rgba(var(--hero-shade),.40) 72%,rgba(var(--hero-shade),0) 100%)}
    body.has-hero-light .site-header.nav-open{background:var(--cream)}
    body.has-hero-light .site-header.nav-open .nav-link,
    body.has-hero-light .site-header.nav-open .nav-link.active{color:var(--brown-dark)}
    body.has-hero-light .site-header.nav-open .dropdown-link{color:var(--text-muted)}
    body.has-hero-light .site-header.nav-open .dropdown-link:hover,
    body.has-hero-light .site-header.nav-open .dropdown-link.active{color:var(--brown-dark)}
    body.has-hero-light .site-header.nav-open .dropdown-head{color:var(--tan-dark)}
  }
`;

const MARK = '  /* ===== responsive ===== */';
if (!s.includes(MARK)) throw new Error('responsive marker not found');
s = s.replace(MARK, LIGHT + MARK);

writeFileSync(OUT, s);
console.log(`${OUT} written from ${SRC} (${s.length} bytes)`);
