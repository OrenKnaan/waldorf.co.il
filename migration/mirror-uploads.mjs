// Copies every file the old WordPress site serves under /wp-content/uploads/
// into migration/uploads-mirror/ (gitignored), so those links keep working
// after the domain moves (launch-checklist A6). The old site stays the source
// until its hosting ends; after that this mirror and the R2 bucket are the copy.
//
//   node migration/mirror-uploads.mjs          download what is missing
//   node migration/mirror-uploads.mjs --list   only print what it would fetch
//
// Two sources, because neither is complete alone: the media library (every
// file with each resized copy), and every uploads link inside the posts and
// pages, which also catches files put there outside the library.
import { mkdirSync, existsSync, writeFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const OUT = join(here, 'uploads-mirror');
const API = 'https://www.waldorf.co.il/wp-json/wp/v2';
const PREFIX = '/wp-content/uploads/';

async function all(type, fields) {
  const items = [];
  for (let page = 1; ; page += 1) {
    const res = await fetch(`${API}/${type}?per_page=100&page=${page}&_fields=${fields}`);
    if (res.status === 400) break;               // past the last page
    if (!res.ok) throw new Error(`${type} page ${page}: ${res.status}`);
    items.push(...await res.json());
    // A page can hold fewer than 100 (WordPress drops items it will not show),
    // so the end is the page count it reports, not a short page.
    if (page >= Number(res.headers.get('x-wp-totalpages') || page)) break;
  }
  return items;
}

// A path under /wp-content/uploads/, decoded, or null.
function uploadsPath(url) {
  try {
    const u = new URL(url, 'https://www.waldorf.co.il');
    if (!/(^|\.)waldorf\.co\.il$/.test(u.hostname)) return null;
    const p = decodeURIComponent(u.pathname);
    return p.startsWith(PREFIX) && !p.endsWith('/') ? p : null;
  } catch { return null; }
}

const paths = new Set();
for (const m of await all('media', 'source_url,media_details')) {
  for (const u of [m.source_url, ...Object.values(m.media_details?.sizes || {}).map((s) => s.source_url)]) {
    const p = uploadsPath(u);
    if (p) paths.add(p);
  }
}
const inLibrary = paths.size;
const LINK = /https?:\/\/(?:www\.)?waldorf\.co\.il\/wp-content\/uploads\/[^"'\s<>)]+/g;
for (const type of ['posts', 'pages']) {
  for (const item of await all(type, 'content,excerpt')) {
    const html = `${item.content?.rendered || ''} ${item.excerpt?.rendered || ''}`.replace(/&#038;|&amp;/g, '&');
    for (const m of html.matchAll(LINK)) {
      const p = uploadsPath(m[0].replace(/[.,;]+$/, ''));
      if (p) paths.add(p);
    }
  }
}
console.log(`${paths.size} files (${inLibrary} from the media library, ${paths.size - inLibrary} more linked from posts and pages)`);
if (process.argv.includes('--list')) { for (const p of [...paths].sort()) console.log(p); process.exit(0); }

let fetched = 0, kept = 0, bytes = 0;
const failed = [];
const queue = [...paths].sort();
async function worker() {
  for (let p; (p = queue.shift()); ) {
    const file = join(OUT, p.slice(PREFIX.length));
    if (existsSync(file)) { kept += 1; bytes += statSync(file).size; continue; }
    try {
      const res = await fetch('https://www.waldorf.co.il' + encodeURI(p));
      if (!res.ok) { failed.push(`${res.status} ${p}`); continue; }
      const buf = Buffer.from(await res.arrayBuffer());
      mkdirSync(dirname(file), { recursive: true });
      writeFileSync(file, buf);
      fetched += 1; bytes += buf.length;
    } catch (e) { failed.push(`${e.message} ${p}`); }
  }
}
await Promise.all(Array.from({ length: 6 }, worker));
console.log(`fetched ${fetched}, already here ${kept}, failed ${failed.length}, ${(bytes / 1048576).toFixed(1)} MiB in ${OUT}`);
if (failed.length) { console.log('failed:'); for (const f of failed) console.log('  ' + f); }
