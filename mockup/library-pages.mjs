// Generates one page per item in ספריית תוכן — 104 of them — from an existing
// page's skeleton, so each inherits the site's stylesheet, header, nav, footer
// and the accessibility and search layers verbatim.
//
//   node mockup/library-pages.mjs         # writes pages/lib-<id>.html
//   node mockup/patch-search.mjs          # then — no-op over these, see below
//   node mockup/search-index.mjs          # then — indexes them
//
// Why pages and not an accordion: an archive item needs an address. The old
// site's 66 article URLs currently redirect to the library index, which drops a
// visitor who clicked a ten-year-old link onto a list of 104 boxes. With a page
// per item, migration/url-map.csv can point each old URL at the actual text.
//
// The body comes from pages/sorting-data/items/<id>.html, already sanitised by
// sorting-content.mjs (element ids stripped, inline handlers gone, iframes
// turned into links). Nothing here reads that directory at runtime: the body is
// baked into the generated page, so these survive the triage section's removal.
//
// Safe to re-run: it only ever writes pages/lib-*.html.
import { readFileSync, writeFileSync, readdirSync, unlinkSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pagesDir = join(__dirname, 'pages');
const itemsDir = join(pagesDir, 'sorting-data', 'items');

const API = 'https://waldorf-content-api.orenknaan.workers.dev/api/content';
const localJson = process.env.CONTENT_JSON;

let data;
try {
  data = localJson
    ? JSON.parse(readFileSync(localJson, 'utf8'))
    : await (await fetch(API, { signal: AbortSignal.timeout(20000) })).json();
} catch (err) {
  console.error(`Could not read the content API: ${err.message}`);
  console.error('Pass CONTENT_JSON=<file> with a fresh copy of /api/content, or retry.');
  process.exit(1);
}

const records = (data.library || []).filter((r) => /^lb-/.test(r.id));
if (!records.length) {
  console.error('No library records with an lb- id. Apply migrations 0007 and 0008 first.');
  process.exit(1);
}

// ---------- body preparation ----------

// The archive keeps each body exactly as WordPress served it, so 75 of the 104
// open with their own <h1>. A page carries one <h1> — the item's title — so
// every heading in the body moves down one level. Descending order matters:
// rewriting h1 first would then catch it again as h2.
const DEMOTE = { h5: 'h6', h4: 'h5', h3: 'h4', h2: 'h3', h1: 'h2' };
const demote = (html) =>
  html.replace(/<(\/?)(h[1-5])\b([^>]*)>/gi, (m, slash, tag, attrs) =>
    `<${slash}${DEMOTE[tag.toLowerCase()]}${attrs}>`);

// WordPress's file block renders a link plus a "הורד" button that repeats it,
// and the button carries aria-describedby pointing at an id sorting-content.mjs
// has already stripped — a reference to nothing, which is a WCAG failure as
// well as noise. Lift the files out into one labelled block and drop the rest.
function extractFiles(html) {
  const files = [];
  const out = html.replace(/<div class="wp-block-file"[^>]*>([\s\S]*?)<\/div>/gi, (m, inner) => {
    const first = inner.match(/<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i);
    if (first) {
      const name = first[2].replace(/<[^>]*>/g, '').trim();
      if (!files.some((f) => f.href === first[1])) files.push({ href: first[1], name: name || 'קובץ מצורף' });
    }
    return '';
  });
  return { html: out, files };
}

const ext = (href) => {
  const m = decodeURIComponent(href).match(/\.([a-z0-9]{2,4})(?:$|\?)/i);
  return m ? m[1].toUpperCase() : 'קובץ';
};

// Same FNV-1a anchor patch-search.mjs writes, generated here so that patcher
// stays a no-op over these 104 pages.
function sectionId(heading) {
  let h = 0x811c9dc5;
  for (let i = 0; i < heading.length; i += 1) {
    h ^= heading.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return `sec-${h.toString(36)}`;
}
const withAnchors = (html) =>
  html.replace(/<h2(?![^>]*\sid=)([^>]*)>([\s\S]*?)<\/h2>/gi,
    (m, attrs, text) => `<h2${attrs} id="${sectionId(text.replace(/<[^>]*>/g, '').trim())}">${text}</h2>`);

// Word exports its footnotes as <a href="#_ftn3"> pointing at an anchor further
// down. In nine of these bodies WordPress never published that block, so 425
// markers link to nothing. Keep the marker text, drop the link: a footnote
// number that reads as text is honest, one that looks clickable and goes
// nowhere is not. Anything whose target is present is left alone.
function dropDeadFragments(html) {
  const targets = new Set();
  for (const m of html.matchAll(/\sid="([^"]+)"/g)) targets.add(m[1]);
  for (const m of html.matchAll(/<a[^>]*\sname="([^"]+)"/g)) targets.add(m[1]);
  let dead = 0;
  const out = html.replace(/<a\b([^>]*)href="#([^"]*)"([^>]*)>([\s\S]*?)<\/a>/gi,
    (whole, before, frag, after, text) => {
      if (targets.has(frag)) return whole;
      dead += 1;
      const name = (`${before} ${after}`).match(/\sname="([^"]+)"/);
      // The same tag is often also the anchor its counterpart points back to,
      // so keep the name and only take the link away.
      return name ? `<a name="${name[1]}">${text}</a>` : `<span>${text}</span>`;
    });
  return { html: out, dead };
}

const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// ---------- skeleton ----------
const BOOK_TITLE = 'חינוך ולדורף – עקרונות ויישומים';

const skeleton = readFileSync(join(pagesDir, 'media.html'), 'utf8');

const ICON = {
  down: '<svg class="icon-inline" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12M7.5 10.5L12 15l4.5-4.5M4 20h16"/></svg>',
  back: '<svg class="icon-inline" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 6l-6 6 6 6"/></svg>',
  // RTL: travel runs leftwards, so "next" points to the inline-end (left) and
  // "previous" back to the inline-start (right).
  next: '<svg class="icon-inline" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 6l-6 6 6 6"/></svg>',
  prev: '<svg class="icon-inline" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 6l6 6-6 6"/></svg>',
  file: '<svg class="icon-inline" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/></svg>',
};

function schema(rec) {
  return `<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    {
      "@type": "ListItem",
      "position": 1,
      "name": "דף הבית",
      "item": "./home.html"
    },
    {
      "@type": "ListItem",
      "position": 2,
      "name": "ספריית תוכן",
      "item": "./content-library.html"
    },
    {
      "@type": "ListItem",
      "position": 3,
      "name": ${JSON.stringify(rec.title)},
      "item": ${JSON.stringify(`./lib-${rec.id.replace(/^lb-/, '')}.html`)}
    }
  ]
}
</script>`;
}

// Each chapter of the book ended with a "קדימה" link to the next one on
// waldorf.co.il, in a new tab. It is replaced by the pager below: same tab,
// local page, and it names the chapter it leads to. Left in place it would be
// 13 links off the site, all of them dead the day the domain moves.
function dropOldChapterNav(html) {
  let n = 0;
  const out = html.replace(
    /<p>\s*<a\b[^>]*href="https?:\/\/(?:www\.)?waldorf\.co\.il[^"]*"[^>]*>\s*(?:קדימה|אחורה)\s*<\/a>\s*<\/p>/gi,
    () => { n += 1; return ''; });
  return { html: out, dropped: n };
}

// The book's opening chapter carries its cover. WordPress floated it inline at
// 162x157, which is also the only size that exists: i0.wp.com serves the same
// 7,615 bytes whatever width you ask it for. So it is not enlarged, it is
// framed, and it takes the book's title and authorship with it.
function extractCover(html) {
  let cover = null;
  const out = html.replace(/<img\b[^>]*>/i, (tag) => {
    if (cover) return tag;
    const raw = (tag.match(/\ssrc="([^"]+)"/) || [])[1];
    if (!raw) return tag;
    const src = raw.replace(/&#0*38;/g, '&').replace(/&amp;/g, '&');
    cover = { src, width: (tag.match(/\swidth="(\d+)"/) || [])[1] || '', height: (tag.match(/\sheight="(\d+)"/) || [])[1] || '' };
    return '';
  });
  // The float class and the empty paragraph it leaves behind go with it.
  return { html: cover ? out.replace(/<p>\s*<\/p>/g, '') : html, cover };
}

function coverFigure(cover, rec) {
  if (!cover) return '';
  const dims = (cover.width && cover.height)
    ? ` width="${esc(cover.width)}" height="${esc(cover.height)}"` : '';
  return `    <figure class="lib-cover">
      <span class="shot"><img src="${esc(cover.src)}" alt="כריכת הספר &quot;${esc(BOOK_TITLE)}&quot;"${dims} loading="lazy" decoding="async"></span>
      <figcaption>
        <b>${esc(BOOK_TITLE)}</b>
${rec.author ? `        <span>${esc(rec.author)}</span>\n` : ''}${rec.date ? `        <span>סתיו ${esc(rec.date)}</span>\n` : ''}      </figcaption>
    </figure>
`;
}

// Previous and next, by the chapter order in D1. Same tab, local page, and each
// side names its chapter: "הבא" alone tells a reader nothing about whether to
// follow it.
function pagerFor(rec, chapters) {
  if (rec.kind !== 'ספר') return '';
  const i = chapters.findIndex((c) => c.id === rec.id);
  if (i === -1) return '';
  const link = (c, cls, label, icon) => c ? `    <a class="${cls}" rel="${cls}" href="./lib-${c.id.replace(/^lb-/, '')}.html">
      <span class="dir">${icon}${label}</span>
      <span class="t">${esc(c.title)}</span>
    </a>` : '';
  const prev = link(chapters[i - 1], 'prev', 'הפרק הקודם', ICON.prev);
  const next = link(chapters[i + 1], 'next', 'הפרק הבא', ICON.next);
  if (!prev && !next) return '';
  return `  <nav class="lib-pager" aria-label="ניווט בין פרקי הספר">
${[prev, next].filter(Boolean).join('\n')}
  </nav>
`;
}

// The book is fourteen chapters published as fourteen pages, so a reader who
// opens one has no way to see the shape of the whole or reach the next part.
// The rail borrows the homepage hero's dot language: a dot per chapter, the
// current one gold and larger. Unlike the hero it carries its labels, because
// "chapter 7" tells a reader nothing and "הערכה בחינוך ולדורף" tells them
// everything. Baked in at build time, since an item page loads no store.
function tocFor(rec, chapters) {
  if (!chapters.length || rec.kind !== 'ספר') return '';
  const rows = chapters.map((c) => {
    const href = `./lib-${c.id.replace(/^lb-/, '')}.html`;
    const here = c.id === rec.id;
    return `          <li><a href="${esc(href)}"${here ? ' aria-current="page"' : ''}>` +
      `<span class="dot" aria-hidden="true"></span><span class="t">${esc(c.title)}</span></a></li>`;
  }).join('\n');
  return `    <div class="lib-toc-wrap">
      <nav class="lib-toc" aria-label="פרקי הספר">
        <h2 class="lib-toc-title" id="${sectionId('פרקי הספר')}">פרקי הספר</h2>
        <ol>
${rows}
        </ol>
      </nav>
    </div>
`;
}

function mainFor(rec, body, files, chapters, cover) {
  const src = rec.id.replace(/^lb-/, '');
  const meta = [
    rec.kind ? `<span class="dyn-chip cat">${esc(rec.kind)}</span>` : '',
    rec.author ? `<span class="dyn-chip">${esc(rec.author)}</span>` : '',
    rec.date ? `<span class="dyn-chip">${esc(rec.date)}</span>` : '',
  ].filter(Boolean).join('\n    ');

  const toc = tocFor(rec, chapters);
  const pager = pagerFor(rec, chapters);

  const attach = files.length ? `
  <section class="card lib-attach">
    <h2 id="${sectionId('הקבצים המקוריים')}">הקבצים המקוריים</h2>
    <p>הקבצים שצורפו לפריט באתר הישן. <span class="ph">תוכן: הקבצים עדיין מתארחים ב-waldorf.co.il. יש להעביר אותם לאחסון של האתר החדש לפני מעבר הדומיין, אחרת הקישורים ימותו</span></p>
    <ul class="lib-files">
${files.map((f) => `      <li>${ICON.file} <a href="${esc(f.href)}" target="_blank" rel="noopener">${esc(f.name)}</a> <span class="lib-ext">${esc(ext(f.href))}</span></li>`).join('\n')}
    </ul>
  </section>` : '';

  return `<main id="main-content" tabindex="-1" data-lib-item="${esc(src)}">
  <nav class="pagebanner" aria-label="breadcrumb">
    <span class="crumbs">
<a class="crumb" href="./home.html">דף הבית</a>
<span class="crumb-sep" aria-hidden="true">/</span>
<a class="crumb" href="./content-library.html">ספריית תוכן</a>
<span class="crumb-sep" aria-hidden="true">/</span>
<span class="crumb current" aria-current="page">${esc(rec.title)}</span>
</span>
  </nav>
  <div class="lib-head">
    <h1>${esc(rec.title)}</h1>
${rec.kind === 'ספר' ? `    <p class="lib-book">מתוך <cite>${esc(BOOK_TITLE)}</cite></p>\n` : ''}    <div class="lib-meta">
      ${meta}
    </div>
    <div class="btn-row lib-actions">
      <button type="button" class="btn btn-primary" data-lib-download>${ICON.down} הורדת הפריט</button>
      <a class="btn btn-ghost" href="./content-library.html">${ICON.back} חזרה לספריית תוכן</a>
    </div>
  </div>
${attach}
  <div class="divider" aria-hidden="true"><svg viewBox="0 0 200 12" preserveAspectRatio="none"><path d="M0 6 C 20 0, 40 12, 60 6 S 100 0, 120 6 S 160 12, 180 6 S 200 0, 200 6" /></svg></div>
${toc ? `  <div class="lib-with-toc">
${toc}    <div class="lib-col">
      <article class="card lib-body">
${coverFigure(cover, rec)}${body}
      </article>
${pager}    </div>
  </div>` : `  <article class="card lib-body">
${body}
  </article>`}

</main>`;
}

// ---------- write ----------
for (const f of readdirSync(pagesDir)) {
  if (/^lib-.*\.html$/.test(f)) unlinkSync(join(pagesDir, f));
}

// Publication order, which for the book is chapter order: 0008 seeds position
// 100..113 over the fourteen chapters in the order the old site published them.
const chapters = records
  .filter((r) => r.kind === 'ספר')
  .sort((a, b) => (a.position || 0) - (b.position || 0));

let written = 0;
let withFiles = 0;
let deadLinks = 0;
let withToc = 0;
let oldNav = 0;
let covers = 0;
for (const rec of records) {
  const src = rec.id.replace(/^lb-/, '');
  let raw;
  try {
    raw = readFileSync(join(itemsDir, `${src}.html`), 'utf8');
  } catch {
    console.warn(`no archived body for ${rec.id} — skipped`);
    continue;
  }
  // <object> embeds a plugin document nothing on this site can render, and it
  // is the one tag sorting-content.mjs leaves alone because it never rewrote it.
  raw = raw.replace(/<object[\s\S]*?<\/object>/gi, '');
  const { html, files } = extractFiles(raw);
  const isBook = rec.kind === 'ספר';
  const nav = isBook ? dropOldChapterNav(html) : { html, dropped: 0 };
  oldNav += nav.dropped;
  // Only the book's opening chapter has a cover to lift; it is also the only
  // one of the fourteen with an image at all.
  const lifted = (isBook && chapters.length && chapters[0].id === rec.id)
    ? extractCover(nav.html) : { html: nav.html, cover: null };
  if (lifted.cover) covers += 1;
  const fixed = dropDeadFragments(withAnchors(demote(lifted.html)));
  const body = fixed.html.trim();
  deadLinks += fixed.dead;
  if (files.length) withFiles += 1;
  if (rec.kind === 'ספר') withToc += 1;

  let page = skeleton;
  page = page.replace(/<title>[^<]*<\/title>/, `<title>${esc(rec.title)} — מוקאפ</title>`);
  page = page.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/, schema(rec));
  page = page.replace(/<main[\s\S]*?<\/main>/, mainFor(rec, body, files, chapters, lifted.cover));
  // The text is baked in, so these pages have no use for the content store —
  // and store.js fetches every collection the moment it loads.
  page = page.replace('<script src="./store.js"></script>\n', '');
  page = page.replace('<script src="./dynamic.js"></script>\n', '');
  page = page.replace(/<script>\n(?:[^<]*WDyn[^<]*\n)+<\/script>\n/g, '');
  page = page.replace('<script src="./breadcrumb.js" defer></script>',
    '<script src="./library.js" defer></script>\n<script src="./breadcrumb.js" defer></script>');
  writeFileSync(join(pagesDir, `lib-${src}.html`), page, 'utf8');
  written += 1;
}
console.log(`${written} library item page(s) written, ${withFiles} with attached files, ${withToc} with the book's chapter rail.`);
if (deadLinks) console.log(`${deadLinks} footnote link(s) whose target is missing from the archive were unlinked.`);
if (oldNav) console.log(`${oldNav} cross-site "קדימה" link(s) replaced by the local chapter pager.`);
if (covers) console.log(`${covers} book cover lifted out of the text into a framed title card.`);
console.log('Now run: node mockup/patch-search.mjs && node mockup/search-index.mjs');
