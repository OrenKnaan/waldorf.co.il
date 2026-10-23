// Turns links that point at the old waldorf.co.il into links that point at this
// site, so nothing the visitor can click depends on the old host staying up.
//
// Three kinds of target, three answers:
//   /wp-content/... and /papers/...  the file itself. It is copied into
//                                    pages/ under the SAME path, so the URL a
//                                    search engine or a school website already
//                                    holds keeps working after the domain moves,
//                                    with no redirect rule needed.
//   a post or category               whatever migration/url-map.csv says its
//                                    new page is (the same table the cutover
//                                    redirects are built from).
//   the front page                   home.html.
//
// Anything it cannot place is returned as null and left alone, so the caller
// can report it instead of guessing.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function parseCsv(text) {
  const rows = [];
  let row = [], cur = '', q = false;
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { cur += '"'; i += 1; }
      else if (c === '"') q = false;
      else cur += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(cur); cur = ''; }
    else if (c === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; }
    else if (c !== '\r') cur += c;
  }
  if (cur || row.length) { row.push(cur); rows.push(row); }
  return rows;
}

const norm = (p) => p.replace(/\/+/g, '/').replace(/\/?$/, '/');
const map = new Map();
for (const [oldPath, , , newPath] of parseCsv(readFileSync(join(root, 'migration/url-map.csv'), 'utf8')).slice(1)) {
  if (oldPath && newPath) map.set(norm(decodeURIComponent(oldPath)), newPath);
}

const OLD = /^https?:\/\/(?:i\d\.wp\.com\/)?(?:www\.|teach\.)?waldorf\.co\.il(?=[/?#]|$)/i;
const unesc = (s) => s.replace(/&#0*38;|&amp;/g, '&');

export const isOld = (url) => OLD.test(unesc(url).trim());

export function localize(url) {
  const raw = unesc(url).trim();
  if (!OLD.test(raw)) return null;
  const u = new URL(raw.replace(OLD, 'https://www.waldorf.co.il'));
  let path;
  try { path = decodeURIComponent(u.pathname); } catch { return null; }
  path = path.replace(/\/+/g, '/');
  const hash = u.hash || '';
  if (/^\/(wp-content|papers)\//.test(path)) {
    return `.${path.split('/').map(encodeURIComponent).join('/')}${hash}`;
  }
  if (path === '/') return `./home.html${hash}`;
  const to = map.get(norm(path));
  return to ? `.${to}${hash}` : null;
}

// Rewrites every href/src (and drops srcset/sizes beside a rewritten src: the
// widths named there belonged to the old host's resizer). Returns the new HTML
// and the old URLs it could not place.
export function localizeHtml(html) {
  const unplaced = [];
  let changed = 0;
  let out = html.replace(/\s(href|src)=("([^"]*)"|'([^']*)')/gi, (whole, attr, q, a, b) => {
    const val = a ?? b;
    if (!isOld(val)) return whole;
    const to = localize(val);
    if (!to) { unplaced.push(val); return whole; }
    changed += 1;
    return ` ${attr}="${to}"`;
  });
  out = out.replace(/(<img\b[^>]*\ssrc="\.\/wp-content[^>]*>)/gi,
    (tag) => tag.replace(/\s(?:srcset|sizes)="[^"]*"/gi, ''));
  return { html: out, changed, unplaced };
}
