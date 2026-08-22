// Wires the accessibility layer into every mockup page, in place, without
// regenerating them. Idempotent, safe to re-run.
//
//   node mockup/patch-accessibility.mjs
//
// Five separate edits, each guarded so a second run is a genuine no-op:
//
//   1. accessibility.js in <head>. Deliberately NOT deferred: the script
//      applies the visitor's saved preferences to <html> before the first
//      paint. Deferring it means a visitor who asked for 160% text watches the
//      page render at 100% first.
//   2. A skip link as the first thing inside <body> (WCAG 2.4.1).
//   3. id + tabindex on <main> so the skip link has somewhere to land, and so
//      focus actually moves there rather than only the scroll position.
//   4. A footer link to the accessibility statement, which Israeli service
//      accessibility regulations require to be reachable from every page.
//   5. aria-label on the main <nav>. Every page carries two nav landmarks, the
//      menu and the breadcrumb, and only the breadcrumb was named. Two
//      landmarks of the same role are told apart by their names, so an
//      unnamed one leaves a screen-reader user choosing between "navigation"
//      and "breadcrumb" with no idea which is the menu.
//   6. tabindex on the <span> nav triggers. They have no page of their own, so
//      build.mjs emits them as spans, which are not in the tab order at all,
//      which left every dropdown link unreachable by keyboard (WCAG 2.1.1).
//      The `.nav-item:focus-within > .dropdown` rule in accessibility.js is the
//      other half of that fix.
//
// Setting ENABLED to false and re-running strips the whole layer back out.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ENABLED = true;

const pagesDir = join(dirname(fileURLToPath(import.meta.url)), 'pages');

const SCRIPT_TAG = '<script src="./accessibility.js"></script>';
const SKIP_LINK = '<a class="skip-link" href="#main-content">דילוג לתוכן המרכזי</a>';
const FOOTER_LINK =
  '<span class="footer-sep" aria-hidden="true"> · </span>' +
  '<a class="footer-a11y" href="./accessibility-statement.html">הצהרת נגישות</a>';

// Anchored to the exact strings the patcher writes, so removal is exact and a
// hand-edited page is left alone rather than half-stripped.
const SCRIPT_RE = /\n?<script src="\.\/accessibility\.js"><\/script>/;
const SKIP_RE = /\n?<a class="skip-link" href="#main-content">[^<]*<\/a>/;
const FOOTER_RE = /<span class="footer-sep"[^>]*>[^<]*<\/span><a class="footer-a11y"[^>]*>[^<]*<\/a>/;
const NAV_LABEL = ' aria-label="ניווט ראשי"';

let changed = 0;
let unchanged = 0;
const skipped = [];

for (const file of readdirSync(pagesDir).filter((f) => f.endsWith('.html'))) {
  const path = join(pagesDir, file);
  const html = readFileSync(path, 'utf8');

  // index.html is a meta-refresh stub with no header, main or footer. There is
  // nothing on it to make accessible and nothing for the widget to sit on.
  if (!html.includes('<main')) {
    skipped.push(file);
    continue;
  }

  // Always strip first, then re-add when enabled. A changed snippet is then an
  // update rather than a second copy.
  let next = html
    .replace(SCRIPT_RE, '')
    .replace(SKIP_RE, '')
    .replace(FOOTER_RE, '')
    .replace(/<main id="main-content" tabindex="-1">/g, '<main>')
    .replace(/(<span class="nav-link nav-label")\s+tabindex="0"/g, '$1')
    .replace(/<nav aria-label="ניווט ראשי">(\s*<div class="primary-nav")/g, '<nav>$1');

  if (ENABLED) {
    if (!next.includes('</head>')) throw new Error(`${file}: no </head> to anchor the script to`);
    next = next.replace('</head>', `${SCRIPT_TAG}\n</head>`);

    if (!next.includes('<body>')) throw new Error(`${file}: no <body> to anchor the skip link to`);
    next = next.replace('<body>', `<body>\n${SKIP_LINK}`);

    next = next.replace('<main>', '<main id="main-content" tabindex="-1">');

    if (!next.includes('</footer>')) throw new Error(`${file}: no </footer> to anchor the link to`);
    next = next.replace('</footer>', `${FOOTER_LINK}</footer>`);

    next = next.replace(/<span class="nav-link nav-label"/g, '<span class="nav-link nav-label" tabindex="0"');

    // Anchored on the wrapper the menu actually lives in, so the breadcrumb
    // <nav> (already labelled) is never touched.
    next = next.replace(/<nav>(\s*<div class="primary-nav")/g, `<nav${NAV_LABEL}>$1`);
  }

  if (next === html) { unchanged += 1; continue; }
  writeFileSync(path, next, 'utf8');
  changed += 1;
}

const verb = ENABLED ? 'wired into' : 'stripped from';
console.log(`Accessibility layer ${verb} ${changed} page(s), ${unchanged} already up to date.`);
if (skipped.length) console.log(`Skipped (no <main>): ${skipped.join(', ')}`);
