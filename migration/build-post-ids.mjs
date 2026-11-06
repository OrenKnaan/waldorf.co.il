// Writes site/post-ids.json: WordPress post and page ids -> their new address,
// for links of the form /?p=<id> and /?page_id=<id> (launch-checklist B16).
// The old pages advertise wp.me shortlinks, and those resolve to /?p=<id>;
// _redirects cannot match a query string, so the site Worker reads this map.
//
//   node migration/build-post-ids.mjs
//
// It needs the old site's REST API, which goes when the livedns hosting does.
// The result is committed, so it only has to run again if url-map.csv changes
// while the old site is still up.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const API = 'https://www.waldorf.co.il/wp-json/wp/v2';

function parseCsv(text) {
  const rows = [];
  let row = [], field = '', quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i += 1; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (c !== '\r') field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  const head = rows.shift();
  return rows.filter((r) => r.length === head.length).map((r) => Object.fromEntries(head.map((h, i) => [h, r[i]])));
}

const target = new Map(parseCsv(readFileSync(join(here, 'url-map.csv'), 'utf8')).map((r) => [r.old_path, r.new_path]));
// The homepage moved to / (launch-checklist A3).
const home = (p) => (p === '/home.html' ? '/' : p);

const ids = {};
let unmapped = 0;
for (const type of ['posts', 'pages']) {
  for (let page = 1; ; page += 1) {
    const res = await fetch(`${API}/${type}?per_page=100&page=${page}&_fields=id,link`);
    if (res.status === 400) break;
    if (!res.ok) throw new Error(`${type} page ${page}: ${res.status}`);
    for (const item of await res.json()) {
      const path = decodeURIComponent(new URL(item.link).pathname);
      const to = target.get(path);
      if (to) ids[item.id] = home(to); else unmapped += 1;
    }
    if (page >= Number(res.headers.get('x-wp-totalpages') || page)) break;
  }
}
writeFileSync(join(here, '..', 'site', 'post-ids.json'), JSON.stringify(ids, null, 0) + '\n');
console.log(`site/post-ids.json: ${Object.keys(ids).length} ids${unmapped ? `, ${unmapped} without a row in url-map.csv` : ''}`);
