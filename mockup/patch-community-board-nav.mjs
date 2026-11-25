// Takes "לוח קהילתי" out of the "מידע ומשאבים" dropdown of every page, with the
// "לוח מודעות" heading above it, and gives news.html that name instead of
// "הודעות". The board is hidden for now, not deleted: the entry is commented
// out rather than removed, community-board.html stays in mockup/pages, and
// site/build.mjs leaves it out of the build and redirects it to news.html.
// Set ENABLED = false and re-run to put the menu back as it was.
//
//   node mockup/patch-community-board-nav.mjs
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ENABLED = true;

const pagesDir = join(dirname(fileURLToPath(import.meta.url)), 'pages');

const BOARD = '<div class="dropdown-head">לוח מודעות</div>\n<a class="dropdown-link" href="./community-board.html">לוח קהילתי</a>\n';
const BOARD_OFF = '<!-- hidden until the community board returns (patch-community-board-nav.mjs)\n' + BOARD + '-->\n';
const NEWS = '<a class="dropdown-link" href="./news.html">הודעות</a>\n';
const NEWS_NEW = '<a class="dropdown-link" href="./news.html">לוח מודעות</a>\n';

const swaps = ENABLED ? [[BOARD, BOARD_OFF], [NEWS, NEWS_NEW]] : [[BOARD_OFF, BOARD], [NEWS_NEW, NEWS]];

let rewritten = 0, skipped = [];

for (const file of readdirSync(pagesDir).filter((f) => f.endsWith('.html'))) {
  const path = join(pagesDir, file);
  let html = readFileSync(path, 'utf8');
  const before = html;

  // BOARD is a substring of BOARD_OFF, so a page already done is recognised
  // first, or a re-run would wrap the comment in another one.
  for (const [from, to] of swaps) {
    if (ENABLED && html.includes(to)) continue;
    html = html.replace(from, to);
  }
  if (!html.includes(ENABLED ? NEWS_NEW : NEWS)) skipped.push(file);

  if (html !== before) { writeFileSync(path, html); rewritten += 1; }
}

console.log(`${rewritten} file(s) rewritten.`);
if (skipped.length) console.log(`Skipped (no "מידע ומשאבים" menu): ${skipped.join(', ')}`);
