// Points every page at store.js (D1-backed) instead of data.js (hardcoded seed).
// Idempotent — safe to re-run.
//
//   node mockup/patch-store.mjs
//
// store.js must load before dynamic.js, which reads window.WStore at definition
// time. data.js is left in the repo as the reproducible source for the one-time
// migration in content-api/seed-from-data-js.mjs, but nothing loads it any more.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const pagesDir = join(dirname(fileURLToPath(import.meta.url)), 'pages');
let changed = 0, already = 0;

for (const file of readdirSync(pagesDir).filter((f) => f.endsWith('.html'))) {
  const path = join(pagesDir, file);
  const html = readFileSync(path, 'utf8');
  if (!html.includes('./data.js')) { if (html.includes('./store.js')) already += 1; continue; }
  const next = html.replace('<script src="./data.js"></script>', '<script src="./store.js"></script>');
  if (next === html) throw new Error(`${file}: data.js referenced in an unexpected form`);
  writeFileSync(path, next, 'utf8');
  changed += 1;
}
console.log(`store.js wired into ${changed} page(s); ${already} already done.`);
