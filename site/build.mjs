// Builds the public site into site/dist from mockup/pages (launch-checklist B9).
//
//   node site/build.mjs && (cd site && npx wrangler@4 deploy)
//
// The mockup pages stay as they are in the repo (noindex, "מוקאפ" titles), so
// the GitHub Pages preview keeps its lockdown. The launch changes are applied
// to the copy here, every time, so a page edited in mockup/pages comes out
// right without a patch run:
//   C2/B20  no noindex meta, no "מוקאפ" suffix in titles, no "גירסה פנימית" footer
//   A3      the homepage is /, and every link to home.html points there
//   B13     an absolute canonical on every page, on www (A1)
//   B14     meta description and Open Graph tags
//   B10-12  404.html, sitemap.xml, robots.txt
//   B17     _headers;  C1 _redirects from migration/url-map.csv
// Leaves out what is not public: the admin (its own Worker), the triage data,
// _*.html probes, data.js (dead), test pages.
import { cpSync, rmSync, mkdirSync, readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const pages = join(root, 'mockup', 'pages');
const dist = join(here, 'dist');
const ORIGIN = 'https://www.waldorf.co.il';
const SITE_NAME = 'הפורום הארצי לחינוך ולדורף';
// For a page with no paragraph long enough to describe it.
const SITE_DESCRIPTION = 'מידע על חינוך ולדורף בישראל עבור הורים, מתעניינים ומחנכים: גני ילדים ובתי ספר, תוכניות לימודים, מאמרים, אירועים והפורום הארצי לחינוך ולדורף.';
const API = 'https://waldorf-content-api.orenknaan.workers.dev/api/content';
// The old site's homepage title, which Google has ranked for years.
const HOME_TITLE = 'חינוך ולדורף בישראל \u2013 מידע על חינוך ולדורף עבור הורים, מתעניינים ומחנכים';

const LEAVE_OUT = new Set(['admin', 'data.js', 'sorting.js', 'robots.txt', 'index.html', 'home.html',
  'shape-test.html', 'home-hero-light.html']);

rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });
for (const name of readdirSync(pages)) {
  if (LEAVE_OUT.has(name) || name.startsWith('_') || name === '.DS_Store') continue;
  cpSync(join(pages, name), join(dist, name), { recursive: true, filter: (s) => !s.endsWith('.DS_Store') });
}
cpSync(join(here, 'static'), dist, { recursive: true });

// The library works, for each lib-* page's title and description, and for the
// sitemap (published works only). Without the API the build stops: shipping
// 105 pages all titled "ספריית תוכן" is worse than not deploying.
let library;
try {
  library = (await (await fetch(API)).json()).library || [];
} catch (e) {
  console.error(`content API unreachable (${e.message}); not building. On this Mac: NODE_OPTIONS="--dns-result-order=ipv4first --no-network-family-autoselection"`);
  process.exit(1);
}
const works = new Map(library.filter((w) => w.status === 'published' && w.url).map((w) => [w.url.replace(/^\.\//, ''), w]));

const esc = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const text = (html) => html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
function clip(s, max = 155) {
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  return cut.slice(0, cut.lastIndexOf(' ') > 80 ? cut.lastIndexOf(' ') : max).replace(/[\s,.;:\u2013-]+$/, '') + '…';
}
// The first real paragraph of the page's own content: inside <main> (the
// real element, not the word in a CSS comment), outside its navigation, and
// not a paragraph that is mostly links.
function firstParagraph(html) {
  const main = (html.match(/<main id="main-content"[\s\S]*?<\/main>/) || [''])[0]
    .replace(/<(nav|aside|header)\b[\s\S]*?<\/\1>/g, '');
  for (const m of main.matchAll(/<p(?:\s[^>]*)?>([\s\S]*?)<\/p>/g)) {   // <p>, not <path> or <picture>
    const t = text(m[1]);
    if (t.length >= 50 && (m[1].match(/<a\b/g) || []).length < 3) return t;
  }
  return '';
}

const sitemap = [];
let count = 0;
for (const name of [...readdirSync(dist).filter((f) => f.endsWith('.html')), 'home.html']) {
  const source = name === 'home.html' ? join(pages, 'home.html') : join(dist, name);
  let html = readFileSync(source, 'utf8');
  const out = name === 'home.html' ? 'index.html' : name;
  const isHome = out === 'index.html', is404 = out === '404.html';
  const url = isHome ? `${ORIGIN}/` : `${ORIGIN}/${encodeURI(out)}`;
  const work = works.get(out);

  if (!is404) html = html.replace(/\s*<meta name="robots" content="noindex, nofollow, noarchive">/g, '');
  html = html.replace(/גירסה פנימית\s*[\u2014\u2013-]\s*/g, '');
  // Stand-ins for content the forum has not supplied yet (launch-cutover.md
  // item 13): the location in kinder-circle.html, with its pin icon and
  // separator, and the article title and summary in kinder-articles.html.
  html = html.replace(/(<svg\b[^>]*>(?:(?!<\/svg>)[\s\S])*<\/svg>\s*)?<span class="ph">מיקום<\/span>\s*\u00b7\s*/g, '')
    .replace(/(\s*[\u2014\u2013-]\s*<span class="ph">[^<]*<\/span>)+/g, '');
  html = html.replace(/href="\.\/home\.html(#[^"]*)?"/g, (m, hash) => `href="./${hash || ''}"`)
    .replace(/"item": "\.\/home\.html"/g, '"item": "./"')
    .replace(/\|\|'home\.html'\)/g, "||'')");

  let title = text((html.match(/<title>([\s\S]*?)<\/title>/) || ['', ''])[1]).replace(/\s*[\u2014\u2013-]\s*מוקאפ\s*$/, '');
  if (isHome) title = HOME_TITLE;
  else if (work) title = `${work.title} | ${title}`;
  if (!isHome && !title.includes(SITE_NAME)) title = `${title} | ${SITE_NAME}`;
  html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(title)}</title>`);

  const description = clip(work?.description ? text(work.description) : firstParagraph(html) || SITE_DESCRIPTION);
  html = html.replace(/\s*<link rel="canonical"[^>]*>/g, '');
  const tags = [
    !is404 && `<link rel="canonical" href="${url}">`,
    description && `<meta name="description" content="${esc(description)}">`,
    `<meta property="og:type" content="${work ? 'article' : 'website'}">`,
    `<meta property="og:site_name" content="${SITE_NAME}">`,
    `<meta property="og:locale" content="he_IL">`,
    `<meta property="og:title" content="${esc(title)}">`,
    description && `<meta property="og:description" content="${esc(description)}">`,
    !is404 && `<meta property="og:url" content="${url}">`,
    `<meta property="og:image" content="${ORIGIN}/img/og-default.jpg">`,
    `<meta property="og:image:width" content="1200">`,
    `<meta property="og:image:height" content="630">`,
    `<meta name="twitter:card" content="summary_large_image">`,
  ].filter(Boolean).join('\n');
  html = html.replace(/(<title>[\s\S]*?<\/title>)/, `$1\n${tags}`);

  // The not-found page is served at any depth (/a/b/c), where ./ would point
  // at the wrong folder: its own references are made absolute.
  if (is404) html = html.replace(/(href|src)="\.\//g, '$1="/').replace(/url\('\.\//g, "url('/");

  writeFileSync(join(dist, out), html);
  if (name === 'home.html') rmSync(join(dist, 'home.html'), { force: true });
  count += 1;
  if (!is404 && (!out.startsWith('lib-') || work)) sitemap.push(url);
}

// breadcrumb.js marks the current page by file name; the homepage has none now.
const bc = join(dist, 'breadcrumb.js');
writeFileSync(bc, readFileSync(bc, 'utf8').replace(/\|\| 'home\.html'\)/g, "|| '')"));

// The search index links home.html like any page.
const si = join(dist, 'search-index.json');
writeFileSync(si, readFileSync(si, 'utf8').replace(/"\.\/home\.html(#[^"]*)?"/g, (m, hash) => `"./${hash || ''}"`));

const today = new Date().toISOString().slice(0, 10);
writeFileSync(join(dist, 'sitemap.xml'), '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
  + sitemap.sort().map((u) => `  <url><loc>${u}</loc><lastmod>${today}</lastmod></url>`).join('\n') + '\n</urlset>\n');

// The old site's addresses (C1). The table maps / to /home.html; the
// homepage is / now (A3), so that row would loop.
const redirects = execFileSync('node', [join(root, 'migration', 'build-redirects.mjs')], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
  .split('\n')
  .filter((l) => !/^\/ /.test(l))
  .map((l) => l.replace(/ \/home\.html 301$/, ' / 301'))
  .join('\n');
writeFileSync(join(dist, '_redirects'), redirects
  + '\n# The admin has its own Worker.\n/admin/* https://waldorf-admin.orenknaan.workers.dev/admin/:splat 302\n');

const left = readdirSync(dist).filter((f) => f.endsWith('.html') && readFileSync(join(dist, f), 'utf8').includes('class="ph"'));
if (left.length) { console.error(`placeholder text left in: ${left.join(', ')}`); process.exit(1); }

const rules = redirects.split('\n').filter((l) => l && !l.startsWith('#')).length;
const missing = [...works.keys()].filter((f) => !existsSync(join(dist, f)));
console.log(`site/dist: ${count} pages, ${sitemap.length} in sitemap.xml, ${rules} redirects`
  + (missing.length ? `; ${missing.length} published works have no page: ${missing.join(', ')}` : ''));
