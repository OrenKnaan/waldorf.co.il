// Assembles the admin's own site (see wrangler.toml) into admin-site/dist:
// mockup/pages/admin as /admin/, the shared scripts its pages load from one
// level up (../store.js and friends) at the root, and the headers and
// redirects in admin-site/static. dist is rebuilt from scratch every time and
// is not committed.
//
//   node admin-site/build.mjs && (cd admin-site && npx wrangler@4 deploy)
import { cpSync, rmSync, mkdirSync, readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const pages = join(here, '..', 'mockup', 'pages');
const dist = join(here, 'dist');

rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });
cpSync(join(pages, 'admin'), join(dist, 'admin'), { recursive: true });
cpSync(join(here, 'static'), dist, { recursive: true });

// Whatever the admin pages reference as ../<file>.js, so a script added to them
// later is picked up without touching this list.
const shared = new Set();
for (const f of readdirSync(join(pages, 'admin')).filter((n) => n.endsWith('.html'))) {
  for (const m of readFileSync(join(pages, 'admin', f), 'utf8').matchAll(/src="\.\.\/([\w.-]+\.js)"/g)) shared.add(m[1]);
}
for (const f of shared) cpSync(join(pages, f), join(dist, f));
console.log(`admin-site/dist: admin/ plus ${[...shared].sort().join(', ')}`);
