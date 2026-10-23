// One local page per issue in the איגרת archive (forum-newsletter.html), so the
// archive no longer links to waldorf.co.il. The bodies come from the triage
// archive (pages/admin/sorting-data/items), already sanitised; the page skeleton
// and the item layout are the library's, so an issue reads like any other item.
//
//   node mockup/newsletter-pages.mjs && node mockup/patch-old-site-links.mjs
//
// The second command rewrites the attachment links inside the bodies and copies
// the files. Re-run both after changing the list below.
//
// Old URL -> new page is recorded in migration/url-map.csv, which is what the
// cutover redirects are built from, so the old addresses keep resolving.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const pagesDir = join(here, 'pages');
const dataDir = join(pagesDir, 'admin', 'sorting-data');

// The sixth issue, "ליווי יוזמות 2017" (p2193), is password-protected on the old
// site: the API returns an empty body, so there is nothing to copy. It has no page.
const ISSUES = ['p2588', 'p2488', 'p2111', 'p1902', 'p1798'];

const index = JSON.parse(readFileSync(join(dataDir, 'index.json'), 'utf8')).items;
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const decode = (s) => s.replace(/&quot;/g, '"').replace(/&#0*38;|&amp;/g, '&').replace(/&#8211;/g, '–').replace(/&#0*39;|&#8217;/g, '’').replace(/&nbsp;/g, ' ');

const DEMOTE = { h5: 'h6', h4: 'h5', h3: 'h4', h2: 'h3', h1: 'h2' };
const demote = (html) => html.replace(/<(\/?)(h[1-5])\b([^>]*)>/gi, (m, s, t, a) => `<${s}${DEMOTE[t.toLowerCase()]}${a}>`);

function sectionId(heading) {
  let h = 0x811c9dc5;
  for (let i = 0; i < heading.length; i += 1) { h ^= heading.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return `sec-${h.toString(36)}`;
}
const withAnchors = (html) => html.replace(/<h2(?![^>]*\sid=)([^>]*)>([\s\S]*?)<\/h2>/gi,
  (m, a, t) => `<h2${a} id="${sectionId(t.replace(/<[^>]*>/g, '').trim())}">${t}</h2>`);

const fmt = (iso) => { const [y, m, d] = iso.split('-').map(Number); return `${d}.${m}.${y}`; };
const ICON_DOWN = '<svg class="icon-inline" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12M7.5 10.5L12 15l4.5-4.5M4 20h16"/></svg>';
const ICON_BACK = '<svg class="icon-inline" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 6l-6 6 6 6"/></svg>';

const skeleton = readFileSync(join(pagesDir, 'media.html'), 'utf8');

function schema(title, file) {
  const items = [['דף הבית', './home.html'], ['הפורום', './forum.html'], ['איגרת תקופתית', './forum-newsletter.html'], [title, `./${file}`]];
  return `<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
${items.map(([name, item], i) => `    {\n      "@type": "ListItem",\n      "position": ${i + 1},\n      "name": ${JSON.stringify(name)},\n      "item": ${JSON.stringify(item)}\n    }`).join(',\n')}
  ]
}
</script>`;
}

for (const id of ISSUES) {
  const rec = index.find((i) => i.id === id);
  const file = `nl-${id}.html`;
  const title = decode(rec.title);
  let body = readFileSync(join(dataDir, 'items', `${id}.html`), 'utf8').replace(/<object[\s\S]*?<\/object>/gi, '');
  body = withAnchors(demote(body)).trim();

  const main = `<main id="main-content" tabindex="-1" data-lib-item="${id}">
  <nav class="pagebanner" aria-label="breadcrumb">
    <span class="crumbs">
<a class="crumb" href="./home.html">דף הבית</a>
<span class="crumb-sep" aria-hidden="true">/</span>
<a class="crumb" href="./forum.html">הפורום</a>
<span class="crumb-sep" aria-hidden="true">/</span>
<a class="crumb" href="./forum-newsletter.html">איגרת תקופתית</a>
<span class="crumb-sep" aria-hidden="true">/</span>
<span class="crumb current" aria-current="page">${esc(title)}</span>
</span>
  </nav>
  <div class="lib-head">
    <h1>${esc(title)}</h1>
    <div class="lib-meta">
      <span class="dyn-chip cat">איגרת</span>
      <span class="dyn-chip"><time datetime="${rec.date}">${fmt(rec.date)}</time></span>
    </div>
    <div class="btn-row lib-actions">
      <button type="button" class="btn btn-primary" data-lib-download>${ICON_DOWN} הורדת הפריט</button>
      <a class="btn btn-ghost" href="./forum-newsletter.html">${ICON_BACK} חזרה לארכיון האיגרות</a>
    </div>
  </div>
  <div class="divider" aria-hidden="true"><svg viewBox="0 0 200 12" preserveAspectRatio="none"><path d="M0 6 C 20 0, 40 12, 60 6 S 100 0, 120 6 S 160 12, 180 6 S 200 0, 200 6" /></svg></div>
  <article class="card lib-body">
${body}
  </article>

</main>`;

  let page = skeleton;
  page = page.replace(/<title>[^<]*<\/title>/, `<title>${esc(title)} — מוקאפ</title>`);
  page = page.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/, schema(title, file));
  page = page.replace(/<main id="main-content"[\s\S]*?<\/main>/, main);
  page = page.replace('<script src="./store.js"></script>\n', '');
  page = page.replace('<script src="./dynamic.js"></script>\n', '');
  page = page.replace(/<script>\n(?:[^<]*WDyn[^<]*\n)+<\/script>\n/g, '');
  page = page.replace('<script src="./breadcrumb.js" defer></script>',
    '<script src="./library.js" defer></script>\n<script src="./breadcrumb.js" defer></script>');
  writeFileSync(join(pagesDir, file), page, 'utf8');
  console.log(`${file}  ${rec.oldPath}  ${title}`);
}
