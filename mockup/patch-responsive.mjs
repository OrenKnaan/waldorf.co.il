// In-place responsive upgrade of the hand-crafted mockup/pages/*.html, WITHOUT
// regenerating the pages (which would discard their bespoke bodies). Adds the
// viewport meta, the responsive stylesheet block, the hamburger button and the
// drawer script. Idempotent — safe to re-run.
//
//   node mockup/patch-responsive.mjs
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { RESPONSIVE_CSS, NAV_TOGGLE_HTML, NAV_TOGGLE_JS, VIEWPORT_META } from './responsive.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pagesDir = join(__dirname, 'pages');

let patched = 0;

for (const file of readdirSync(pagesDir).filter((f) => f.endsWith('.html'))) {
  const path = join(pagesDir, file);
  let html = readFileSync(path, 'utf8');

  // 1) Viewport meta — without it mobile browsers lay the page out at 980px
  //    and shrink it, so none of the media queries below ever fire.
  if (!html.includes('name="viewport"')) {
    html = html.replace('<meta charset="UTF-8">', `<meta charset="UTF-8">\n${VIEWPORT_META}`);
  }

  // 2) Responsive rules, appended to the page's inline stylesheet so they win
  //    over the base rules they override without needing !important.
  if (!html.includes('/* ===== responsive =====')) {
    html = html.replace('\n</style>', `\n${RESPONSIVE_CSS}</style>`);
  }

  // 3) Hamburger button (absolutely positioned inside .site-header, so the
  //    existing .brand-row markup is left untouched) + an id for aria-controls.
  if (!html.includes('class="nav-toggle"')) {
    html = html.replace(
      '<header class="site-header">',
      `<header class="site-header">\n${NAV_TOGGLE_HTML}`,
    );
  }
  html = html.replace('<div class="primary-nav">', '<div class="primary-nav" id="primary-nav">');

  // 4) Drawer + accordion script, right after the nav-highlighting one.
  if (!html.includes('nav-toggle')) throw new Error(`no toggle in ${file}`);
  if (!html.includes("classList.toggle('nav-open')")) {
    html = html.replace('</header>\n', `</header>\n${NAV_TOGGLE_JS}\n`);
  }

  writeFileSync(path, html, 'utf8');
  patched++;
}

console.log(`Patched responsive layout into ${patched} page(s).`);
