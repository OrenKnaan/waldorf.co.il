// Pulls every piece of old-site content that has no home on the new site and
// writes it into mockup/pages/sorting-data/ for the "חומר למיון" section.
//
//   node mockup/sorting-content.mjs
//
// TEMPORARY — this whole section is a triage holding area (see CLAUDE.md,
// "Launch cutover"). It exists so nothing from waldorf.co.il is lost while the
// forum decides what keeps a place on the new site. Once every item has been
// sorted into a real page or retired, the section, this script, its data
// directory and its nav entry all come out together.
//
// Source of truth is the old site's own WordPress REST API, the same one
// migration/README.md documents — not a crawl, so the inventory is complete.
// Nothing here touches an existing page's content; the generator only ever
// writes under pages/sorting-data/.
import { readFileSync, writeFileSync, mkdirSync, readdirSync, rmSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');
const pagesDir = join(__dirname, 'pages');
const outDir = join(pagesDir, 'sorting-data');
const itemsDir = join(outDir, 'items');

const OLD = 'https://www.waldorf.co.il';
const API = `${OLD}/wp-json/wp/v2`;

// ---------- fetch ----------
async function api(path) {
  const res = await fetch(`${API}/${path}`);
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
  return res.json();
}

async function allPosts() {
  const out = [];
  for (let page = 1; ; page += 1) {
    const batch = await api(`posts?per_page=100&page=${page}&_fields=id,slug,link,date,title,categories,content`);
    out.push(...batch);
    if (batch.length < 100) break;
  }
  return out;
}

// ---------- text helpers ----------
const entities = (s) => s
  .replace(/&#8211;|&#8212;/g, '–').replace(/&#8217;|&#8216;/g, '’')
  .replace(/&#8220;|&#8221;/g, '”').replace(/&quot;/g, '"')
  .replace(/&nbsp;/g, ' ').replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

const plain = (html) => entities(html.replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();

// Fold away everything that varies between two copies of the same sentence, so
// the coverage check below compares words and nothing else.
const norm = (s) => s.replace(/[֑-ׇ]/g, '')
  .replace(/[^\p{L}\p{N}]+/gu, ' ').replace(/\s+/g, ' ').trim();

// ---------- what the new site already says ----------
// An old page counts as already migrated when most of its sentences are
// findable on the new site. Eight-word shingles: long enough that a shared
// stock phrase ("חינוך ולדורף בישראל") does not register as a match, short
// enough to survive the light copy-editing the migrated pages went through.
function buildCorpus(d1) {
  const parts = [];
  for (const file of readdirSync(pagesDir).filter((f) => f.endsWith('.html'))) {
    const html = readFileSync(join(pagesDir, file), 'utf8');
    parts.push(plain(html.slice(html.indexOf('<body'))
      .replace(/<script[\s\S]*?<\/script>/g, ' ')
      .replace(/<style[\s\S]*?<\/style>/g, ' ')));
  }
  parts.push(plain(JSON.stringify(d1).replace(/[\\"]/g, ' ')));
  const words = norm(parts.join(' ')).split(' ');
  const shingles = new Set();
  for (let i = 0; i + 8 <= words.length; i += 1) shingles.add(words.slice(i, i + 8).join(' '));
  return shingles;
}

function coverage(shingles, text) {
  const words = norm(text).split(' ');
  if (words.length < 40) return null; // too short to judge either way
  let hit = 0, total = 0;
  for (let i = 0; i + 8 <= words.length; i += 4) { total += 1; if (shingles.has(words.slice(i, i + 8).join(' '))) hit += 1; }
  return total ? hit / total : null;
}

// ---------- sanitising an old post body ----------
// The old bodies are WordPress block markup: safe enough, but they arrive with
// element ids that would collide once several are open on one page, with inline
// handlers, and with iframes pointing at nine different third parties. Ids and
// handlers go; every iframe becomes an ordinary link, which keeps the reference
// without pulling an embed (and one of them is a `javascript:` src).
function sanitise(html) {
  let out = html;
  out = out.replace(/<(script|style|link|meta|form|input|button)\b[\s\S]*?<\/\1>/gi, '');
  out = out.replace(/<(script|style|link|meta|input)\b[^>]*>/gi, '');
  out = out.replace(/<iframe\b[^>]*\bsrc="([^"]*)"[^>]*>[\s\S]*?<\/iframe>/gi, (m, src) => {
    if (!/^https?:/i.test(src)) return '';
    const host = src.replace(/^https?:\/\/([^/]+).*/, '$1');
    return `<p class="si-embed"><a href="${src}" target="_blank" rel="noopener">תוכן מוטמע מ־${host}<span class="sr-only"> (נפתח בחלון חדש)</span></a></p>`;
  });
  out = out.replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi, '');
  out = out.replace(/\s(?:id|on\w+)="[^"]*"/gi, '');
  out = out.replace(/<img\b[^>]*>/gi, (tag) => {
    let t = tag.replace(/<img\b/i, '<img loading="lazy" decoding="async"');
    // Six of the old images carry no alt at all, which axe reports as a
    // critical failure. Naming the gap beats alt="" — that would hide the image
    // from a screen reader as if it were decorative, and these are posters and
    // scans that carry the whole point of the post. Writing the real alt text
    // is part of sorting the item, not of copying it across.
    if (!/\salt=/i.test(t)) t = t.replace(/<img\b/i, '<img alt="תמונה ללא תיאור חלופי באתר הישן"');
    return t;
  });
  // Every link and asset resolves against the old site, which is still live.
  // At cutover these break with the old host; that is the same open question
  // migration/README.md raises about /wp-content/uploads.
  out = out.replace(/(<a\b[^>]*\bhref=")\/(?!\/)/gi, `$1${OLD}/`);
  out = out.replace(/(<(?:img|source)\b[^>]*\bsrc=")\/(?!\/)/gi, `$1${OLD}/`);
  out = out.replace(/(<a\b[^>]*\bhref="https?:\/\/(?:www\.)?waldorf\.co\.il[^"]*")/gi, '$1 target="_blank" rel="noopener"');
  // A picture wrapped in a link, with the picture marked decorative, leaves the
  // link with no accessible name at all (WCAG 2.4.4) — a keyboard user reaches
  // a tab stop that announces nothing. The old site does this for every poster
  // that links to its own PDF. Name the link from the file it points at and
  // leave the image decorative, which is the right way round: the destination
  // is what the link is for. <a> cannot nest, so the lazy match is safe.
  out = out.replace(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi, (tag, attrs, inner) => {
    if (/aria-label=/i.test(attrs)) return tag;
    if (inner.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim()) return tag;
    if (/<img\b[^>]*\salt="[^"]+"/i.test(inner)) return tag;
    // Word exports leave a trail of <a name="_Toc…"> with no href. They are not
    // links, are not focusable, and naming them would be noise.
    const href = (attrs.match(/href="([^"]*)"/i) || [])[1] || '';
    if (!href) return tag;
    const file = decodeURIComponent(href.split('?')[0].split('/').filter(Boolean).pop() || '').trim();
    const label = file ? `קישור אל ${file}` : 'קישור מהאתר הישן';
    return `<a${attrs} aria-label="${label.replace(/"/g, '')}">${inner}</a>`;
  });
  return out.replace(/\n{3,}/g, '\n\n').trim();
}

function countAssets(html) {
  const pdf = (html.match(/href="[^"]*\.pdf(?:\?|")/gi) || []).length;
  const doc = (html.match(/href="[^"]*\.(?:docx?|pptx?)(?:\?|")/gi) || []).length;
  const img = (html.match(/<img\b/gi) || []).length;
  return { pdf, doc, img };
}

// A trailing `| שם הכותב` is the old site's byline convention. Only treat it as
// one when it reads like a name: a date or a venue after the pipe is part of
// the title ("כנס … | יום ה 10 בינואר 2019").
function splitByline(title) {
  const at = title.lastIndexOf(' | ');
  if (at === -1) return { title, author: '' };
  const tail = title.slice(at + 3).trim();
  if (/\d/.test(tail) || tail.split(/\s+/).length > 4 || tail.length > 34) return { title, author: '' };
  return { title: title.slice(0, at).trim(), author: tail };
}

// ---------- grouping ----------
// Category id -> which page of the section the item lands on. Ordered by
// priority: a post carrying two categories goes to the first one that matches.
const BOOK_CAT = 204;
const GROUP_BY_CAT = [
  [BOOK_CAT, 'library'],
  [207, 'capstone'],
  [140, 'subjects'], [104, 'subjects'], [7, 'subjects'], [64, 'subjects'], [72, 'subjects'],
  [15, 'subjects'], [23, 'subjects'], [31, 'subjects'], [55, 'subjects'], [80, 'subjects'],
  [88, 'subjects'], [96, 'subjects'], [47, 'subjects'], [120, 'subjects'], [194, 'subjects'],
  [133, 'subjects'], [39, 'subjects'], [170, 'subjects'],
  [216, 'articles'], [1, 'articles'],
  [199, 'announcements'], [197, 'announcements'], [196, 'announcements'],
  [209, 'announcements'], [210, 'announcements'], [198, 'announcements'],
];

const GROUPS = {
  library: { title: 'ספרייה', groupBy: 'book' },
  articles: { title: 'מאמרים', groupBy: 'year' },
  subjects: { title: 'מאמרים לפי מקצוע', groupBy: 'subject' },
  capstone: { title: 'עבודות גמר', groupBy: 'year' },
  announcements: { title: 'מודעות ופרסומים', groupBy: 'year' },
  pages: { title: 'דפים מהאתר הישן', groupBy: 'section' },
};

// The redirect target each old URL already has, so a triage reader can see
// where someone following an old link lands today.
function loadUrlMap() {
  const text = readFileSync(join(repoRoot, 'migration', 'url-map.csv'), 'utf8');
  const rows = [];
  let row = [], field = '', quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];
    if (quoted) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i += 1; } else quoted = false; } else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (c !== '\r') field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  const head = rows.shift();
  const map = new Map();
  for (const r of rows) {
    if (r.length < 2) continue;
    const o = Object.fromEntries(head.map((h, i) => [h, r[i]]));
    map.set(o.old_path.replace(/\/$/, ''), { newPath: o.new_path, status: o.status });
  }
  return map;
}

// The D1 collections count as part of "what the new site already says", so an
// old page whose text was migrated into a content item is not reported missing.
// They are a handful of records: if the Worker is unreachable, say so and carry
// on rather than failing the whole run.
async function liveContent() {
  const url = 'https://waldorf-content-api.orenknaan.workers.dev/api/content';
  try {
    return await fetch(url).then((r) => r.json());
  } catch {
    try {
      return JSON.parse(execFileSync('curl', ['-fsS', '--max-time', '20', url], { encoding: 'utf8' }));
    } catch {
      console.warn('warning: content API unreachable — coverage measured against the static pages only');
      return {};
    }
  }
}

// ---------- main ----------
const [posts, wpPages, categories, d1] = await Promise.all([
  allPosts(),
  api('pages?per_page=100&_fields=id,slug,link,title,parent,content'),
  api('categories?per_page=100&_fields=id,name'),
  liveContent(),
]);

const catName = Object.fromEntries(categories.map((c) => [c.id, entities(c.name)]));
const groupForCat = new Map(GROUP_BY_CAT);
const shingles = buildCorpus(d1);
const urlMap = loadUrlMap();

const items = [];
const bodies = new Map();

function relPath(link) {
  return decodeURIComponent(link).replace(OLD, '').replace(/^https?:\/\/[^/]+/, '');
}

for (const p of posts) {
  const cats = p.categories || [];
  const group = cats.map((c) => groupForCat.get(c)).find(Boolean) || 'announcements';
  const body = sanitise(p.content.rendered);
  const text = plain(body);
  const raw = entities(p.title.rendered.replace(/<[^>]*>/g, ''));
  const { title, author } = splitByline(raw);
  const oldPath = relPath(p.link);
  const known = urlMap.get(oldPath.replace(/\/$/, '')) || {};
  let bucket;
  if (group === 'library') bucket = catName[BOOK_CAT];
  else if (group === 'subjects') bucket = catName[cats.find((c) => groupForCat.get(c) === 'subjects')];
  else bucket = p.date.slice(0, 4);
  items.push({
    id: `p${p.id}`,
    group,
    bucket,
    // Chapter order rides in the slug ("…-07"); anything else sorts by date.
    order: group === 'library' ? Number((p.slug.match(/(\d+)$/) || [0, 0])[1]) : 0,
    title,
    author,
    date: p.date.slice(0, 10),
    kind: 'post',
    cats: cats.map((c) => catName[c]).filter(Boolean),
    oldPath,
    oldUrl: p.link,
    redirectsTo: known.newPath || '',
    chars: text.length,
    assets: countAssets(body),
    excerpt: text.slice(0, 240),
    hasBody: text.length > 0 || /<img|si-embed/.test(body),
  });
  bodies.set(`p${p.id}`, body);
}

// The 62 structural pages are the ones the new site was written from, so most
// are already said better somewhere. Only the ones the new site does not carry
// belong in the triage pile — plus the ones it carries in a much shortened
// form, which are flagged rather than dropped: the cut material is exactly what
// somebody has to decide about.
for (const p of wpPages) {
  const body = sanitise(p.content.rendered);
  const text = plain(body);
  if (text.length < 100 && !/<img|si-embed/.test(body)) continue;
  const cov = coverage(shingles, text);
  if (cov !== null && cov > 0.5) continue;
  const oldPath = relPath(p.link);
  const known = urlMap.get(oldPath.replace(/\/$/, '')) || {};
  const segments = oldPath.split('/').filter(Boolean);
  const section = segments.length > 1 ? segments[0].replace(/-/g, ' ') : 'עמודים עצמאיים';
  items.push({
    id: `g${p.id}`,
    group: 'pages',
    bucket: section,
    order: 0,
    title: entities(p.title.rendered.replace(/<[^>]*>/g, '')),
    author: '',
    date: '',
    kind: 'page',
    cats: [],
    oldPath,
    oldUrl: p.link,
    redirectsTo: known.newPath || '',
    // A page the new site half-covers: worth reading against its shorter
    // counterpart rather than treating as brand-new material.
    condensedInto: cov !== null && cov > 0.15 ? (known.newPath || '') : '',
    chars: text.length,
    assets: countAssets(body),
    excerpt: text.slice(0, 240),
    hasBody: true,
  });
  bodies.set(`g${p.id}`, body);
}

// ---------- write ----------
if (existsSync(itemsDir)) rmSync(itemsDir, { recursive: true });
mkdirSync(itemsDir, { recursive: true });
for (const [id, body] of bodies) writeFileSync(join(itemsDir, `${id}.html`), body, 'utf8');

items.sort((a, b) => (a.order - b.order) || b.date.localeCompare(a.date) || a.title.localeCompare(b.title, 'he'));

const index = {
  generated: new Date().toISOString().slice(0, 10),
  source: OLD,
  groups: Object.fromEntries(Object.entries(GROUPS).map(([k, v]) => [k, {
    title: v.title,
    groupBy: v.groupBy,
    count: items.filter((i) => i.group === k).length,
  }])),
  items,
};
writeFileSync(join(outDir, 'index.json'), JSON.stringify(index), 'utf8');

for (const [k, v] of Object.entries(index.groups)) console.log(String(v.count).padStart(4), k, '—', v.title);
console.log(`${items.length} items, ${bodies.size} bodies -> pages/sorting-data/`);
