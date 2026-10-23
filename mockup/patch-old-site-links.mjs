// Idempotent. Rewrites links to the old waldorf.co.il across pages/*.html (see
// old-site-links.mjs), drops the "files still live on the old site" warning the
// library pages carried, then copies each file a rewritten link needs into
// pages/ under the path it had on the old site.
//
//   node mockup/patch-old-site-links.mjs
//
// Re-running should say "0 file(s) rewritten" and "0 downloaded".
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { localizeHtml } from './old-site-links.mjs';

const pagesDir = join(dirname(fileURLToPath(import.meta.url)), 'pages');
// Dead on the old site too (404 before the move): the article is already the page
// itself, so the pointer to a second copy of it goes rather than ship a 404.
const DEAD = /\n\[המאמר ב<a href="\.\/papers\/waldorf_chalanges\.doc"[^>]*>קובץ word<\/a>\]/g;
// teach.waldorf.co.il was the forum's temporary teachers' site and no longer
// answers. Its pages have nowhere to go, so a link to one becomes plain text; its
// uploaded files still exist on www.waldorf.co.il under the same path, and those
// are handled by localizeHtml like any other attachment.
const TEACH_PAGE = /<a\b[^>]*\shref="https?:\/\/teach\.waldorf\.co\.il(?!\/wp-content\/)[^"]*"[^>]*>([\s\S]*?)<\/a>/gi;
const NOTE = /(<p>הקבצים שצורפו לפריט באתר הישן\.) <span class="ph">[^<]*<\/span>(<\/p>)/g;

let rewritten = 0, links = 0;
const unplaced = new Map();
const needed = new Set();
for (const f of readdirSync(pagesDir)) {
  if (!f.endsWith('.html')) continue;
  const p = join(pagesDir, f);
  const src = readFileSync(p, 'utf8');
  const r = localizeHtml(src.replace(TEACH_PAGE, '$1'));
  const out = r.html.replace(NOTE, '$1$2').replace(DEAD, '');
  for (const u of r.unplaced) unplaced.set(u, f);
  for (const m of out.matchAll(/\s(?:href|src)="(\.\/(?:wp-content|papers)\/[^"#]*)"/g)) needed.add(m[1]);
  if (out !== src) { writeFileSync(p, out, 'utf8'); rewritten += 1; links += r.changed; }
}
console.log(`${rewritten} file(s) rewritten, ${links} link(s) now local.`);

let downloaded = 0;
for (const rel of needed) {
  const disk = join(pagesDir, ...rel.slice(2).split('/').map(decodeURIComponent));
  if (existsSync(disk) && statSync(disk).size > 0) continue;
  const url = `https://www.waldorf.co.il/${rel.slice(2)}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(120000) });
  if (!res.ok) { console.error(`FAILED ${res.status} ${decodeURIComponent(url)}`); continue; }
  mkdirSync(dirname(disk), { recursive: true });
  writeFileSync(disk, Buffer.from(await res.arrayBuffer()));
  downloaded += 1;
}
console.log(`${downloaded} downloaded, ${needed.size} referenced.`);
for (const [u, f] of unplaced) console.log(`UNPLACED in ${f}: ${decodeURIComponent(u)}`);
