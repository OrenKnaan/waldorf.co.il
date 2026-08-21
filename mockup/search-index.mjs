// Builds the client-side search index for the mockup.
//
//   node mockup/search-index.mjs
//
// Reads every content page under mockup/pages/ plus the seed records in
// data.js, and writes mockup/pages/search-index.json: a flat list of
// documents that search.js feeds to MiniSearch in the browser.
//
// The index is a list of *sections*, not pages: a page contributes one document
// for its intro (everything above the first <h2>) and one per <h2> card. That
// way a hit on a 3000-word curriculum page can name the section it matched and
// link straight to it, instead of dropping the visitor at the top of the page.
//
// The section anchors it links to are written by patch-search.mjs and read back
// out of the HTML here, so the two never have to agree on how to derive one.
// Run the patcher first; a section with no id on its <h2> simply gets a
// page-level link instead of a deep one.
//
// Deliberately NOT indexed:
//   - <span class="ph"> notes. They are open questions addressed to us and to
//     the client, not copy for readers (see CLAUDE.md, launch cutover item 12).
//     Searching "טלפון" should not surface "לא פורסמו באתר הישן, לקבל מהפורום".
//   - The breadcrumb nav, header and footer. They repeat on all 42 pages, so
//     indexing them makes every page a hit for every nav label.
//   - index.html, a meta-refresh stub with no <main>.
//
// In production this whole file is replaced: content lives in D1, so the index
// is built from the database at deploy time (or the search runs as a Worker
// query). The document shape below is what the Astro build should reproduce.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const pagesDir = join(dirname(fileURLToPath(import.meta.url)), 'pages');

const stripTags = (s) => s.replace(/<[^>]*>/g, ' ');

const decode = (s) =>
  s
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&');

const clean = (html) => decode(stripTags(html)).replace(/\s+/g, ' ').trim();

// Everything that carries no reader-facing text, or repeats on every page.
const stripNoise = (html) =>
  html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<svg[\s\S]*?<\/svg>/gi, ' ')
    .replace(/<nav class="pagebanner"[\s\S]*?<\/nav>/i, ' ')
    .replace(/<span class="ph">[\s\S]*?<\/span>/gi, ' ')
    // The art-hero caption is an image title and credit. It sits above the
    // page lede, so leaving it in makes every hero-bearing page open its
    // result snippet with "רישום צורה בגווני הצומח, ולדורף" instead of the
    // sentence that actually describes the page.
    .replace(/<div class="cap">[\s\S]*?<\/div>/gi, ' ');

function readPage(file) {
  const html = readFileSync(join(pagesDir, file), 'utf8');
  const mainStart = html.indexOf('<main');
  const mainEnd = html.indexOf('</main>');
  if (mainStart === -1 || mainEnd === -1) return null;

  const title = clean((html.match(/<title>([\s\S]*?)<\/title>/i) || [])[1] || '')
    // Every mockup title ends in the placeholder suffix; it is noise in results
    // and it disappears at launch anyway.
    .replace(/\s*\u2014\s*מוקאפ$/, '');

  // The trail between "דף הבית" and the current page, e.g. "בית הספר / תוכניות
  // לימודים". Shown under each result so two pages with similar headings are
  // still tellable apart.
  const banner = (html.match(/<nav class="pagebanner"[\s\S]*?<\/nav>/i) || [''])[0];
  const crumbs = [...banner.matchAll(/<(?:a|span) class="crumb(?: crumb-static)?"[^>]*>([\s\S]*?)<\/(?:a|span)>/g)]
    .map((m) => clean(m[1]))
    .filter((t) => t && t !== 'דף הבית')
    .join(' / ');

  const main = stripNoise(html.slice(mainStart, mainEnd));
  const h1 = clean((main.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || [])[1] || '') || title;

  // Split on <h2>, keeping the opening tags: the capture group makes String
  // .split() return them too, so each section can read its own anchor off the
  // tag that introduced it. The first chunk is the intro (h1 + lede).
  const chunks = main.split(/(<h2[^>]*>)/i);
  const intro = clean(chunks[0].replace(/<h1[^>]*>[\s\S]*?<\/h1>/i, ' '));

  const sections = [];
  for (let i = 1; i < chunks.length; i += 2) {
    const chunk = chunks[i + 1] || '';
    const close = chunk.indexOf('</h2>');
    sections.push({
      anchor: (chunks[i].match(/\sid="([^"]+)"/) || [])[1] || '',
      heading: clean(close === -1 ? '' : chunk.slice(0, close)),
      body: clean(close === -1 ? chunk : chunk.slice(close + 5)),
    });
  }

  return { file, title, h1, crumbs, intro, sections };
}

const docs = [];
const pushDoc = (doc) => docs.push({ id: docs.length, ...doc });

const pageFiles = readdirSync(pagesDir)
  .filter((f) => f.endsWith('.html') && f !== 'index.html')
  .sort();

const skipped = [];
let sectionCount = 0;
let unanchored = 0;

for (const file of pageFiles) {
  const page = readPage(file);
  if (!page) {
    skipped.push(file);
    continue;
  }

  // The page itself, so a query matching only the title still finds it even
  // when the page has no intro text above its first card.
  pushDoc({
    url: `./${file}`,
    page: page.title,
    crumbs: page.crumbs,
    heading: '',
    title: page.h1,
    text: page.intro,
  });

  for (const { anchor, heading, body } of page.sections) {
    if (!heading && !body) continue;
    if (heading && !anchor) unanchored += 1;

    pushDoc({
      url: anchor ? `./${file}#${anchor}` : `./${file}`,
      page: page.title,
      crumbs: page.crumbs,
      heading,
      title: heading || page.h1,
      text: body,
    });
    sectionCount += 1;
  }
}

// ---- seed records from data.js -------------------------------------------
//
// The dynamic collections are rendered into their host pages by dynamic.js at
// runtime, so they are not in the static HTML and the extractor above cannot
// see them. Read them from the same seed file the pages read, and point each
// record at the page that lists it. Records a visitor added through the admin
// live only in their own localStorage and are not indexed; the mockup has no
// build step to re-run when they change. In production every one of these is a
// D1 row and gets indexed like any other content.
const dataSrc = readFileSync(join(pagesDir, 'data.js'), 'utf8');
const scope = { window: {} };
new Function('window', dataSrc)(scope.window);
const data = scope.window.WALDORF_DATA || {};

// Which page renders each collection, and how to read a record's fields. Keep
// this in step with the WDyn.render* calls in the pages: a collection missing
// here is simply absent from search, silently. mapPoints is left out on
// purpose, being map markers whose towns already appear in kinder-list.html.
const COLLECTIONS = [
  { key: 'events', file: 'events.html', label: 'אירועים', title: (r) => r.title, text: (r) => [r.description, r.location, r.date, r.time].filter(Boolean).join(' · ') },
  { key: 'news', file: 'news.html', label: 'הודעות', title: (r) => r.title, text: (r) => [r.summary, r.section, r.date].filter(Boolean).join(' · ') },
  { key: 'library', file: 'content-library.html', label: 'ספריית תוכן', title: (r) => r.title, text: (r) => [r.description, r.kind].filter(Boolean).join(' · ') },
  { key: 'teaching', file: 'content-library.html', label: 'חומרי הוראה', title: (r) => r.title, text: (r) => r.group || '' },
  { key: 'forms', file: 'content-library.html', label: 'מאגר טפסים', title: (r) => r.title, text: (r) => [r.description, r.category].filter(Boolean).join(' · ') },
  { key: 'board', file: 'community-board.html', label: 'לוח קהילתי', title: (r) => r.title, text: (r) => [r.description, r.category, r.region].filter(Boolean).join(' · ') },
  { key: 'jobs', file: 'job-board.html', label: 'לוח משרות', title: (r) => r.role, text: (r) => [r.institution, r.description, r.region, r.scope].filter(Boolean).join(' · ') },
  { key: 'videos', file: 'media.html', label: 'סרטונים', title: (r) => r.title, text: (r) => r.description || '' },
  { key: 'podcast', file: 'media.html', label: 'פודקאסט', title: (r) => r.title, text: (r) => [r.description, r.date, r.duration].filter(Boolean).join(' · ') },
];

// Only what a visitor can actually see on the page. A draft event or an
// unmoderated board post is not public, so it must not be findable.
const isPublic = (r) => !r.status || r.status === 'published' || r.status === 'approved';

let recordCount = 0;
for (const c of COLLECTIONS) {
  const rows = data[c.key];
  if (!Array.isArray(rows)) continue;
  for (const row of rows) {
    if (!isPublic(row)) continue;
    const title = (c.title(row) || '').trim();
    if (!title) continue;
    pushDoc({
      url: `./${c.file}`,
      page: c.label,
      crumbs: c.label,
      heading: '',
      title,
      text: c.text(row) || '',
      // Rendered as the "רשומת הדגמה" chip, same as on the page itself, so a
      // searcher is not misled into thinking invented seed data is real.
      ...(row.demo ? { demo: true } : {}),
    });
    recordCount += 1;
  }
}

const out = { generated: new Date().toISOString().slice(0, 10), docs };
const path = join(pagesDir, 'search-index.json');
writeFileSync(path, JSON.stringify(out), 'utf8');

const kb = (Buffer.byteLength(JSON.stringify(out)) / 1024).toFixed(1);
console.log(
  `search-index.json: ${docs.length} documents (${pageFiles.length - skipped.length} pages, ` +
    `${sectionCount} sections, ${recordCount} seed records), ${kb} KB.`,
);
if (unanchored) {
  console.log(`${unanchored} section(s) have no id on their <h2>, so they link to the page top.`);
  console.log('Run node mockup/patch-search.mjs first to give them anchors.');
}
if (skipped.length) console.log(`Skipped (no <main>): ${skipped.join(', ')}`);
