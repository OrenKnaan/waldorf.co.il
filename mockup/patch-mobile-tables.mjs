// Annotates the data tables so the shared responsive layer can restack them as
// cards on a phone, WITHOUT regenerating the pages. Idempotent — safe to re-run.
//
//   node mockup/patch-mobile-tables.mjs
//
// Why the markup needs touching at all: a stacked table has no visible column
// header, so each cell has to carry its own label. The CSS reads it back out of
// a data- attribute via ::before. Nothing here changes desktop rendering.
//
//   * school-list / kinder-list — `stack-sm` on the table + `data-label` per
//     cell, taken from that column's <th>. 3 and 5 columns of contact detail
//     are unreadable in a 375px-wide sideways scroller.
//   * curriculum's `.matrix` — `data-grade` per cell, taken from the grade
//     already spelled out in the cell's own .sr-only text ("כיתה ט': נלמד"),
//     so the visible label and the screen-reader label can never disagree.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const pagesDir = join(dirname(fileURLToPath(import.meta.url)), 'pages');
const strip = (s) => s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
// Hebrew grade labels contain a double quote (י"א, י"ב) and column heads can
// too (דוא"ל) — unescaped, that silently truncates the attribute it lands in.
const esc = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
// Recompute rather than skip-if-present, so a re-run repairs a bad value
// instead of preserving it.
const dropAttr = (attrs, name) =>
  attrs.replace(new RegExp(`\\s${name}="[^"]*"`, 'g'), '');

/** Rewrites the first <table> in `html` that matches `open`, cell by cell. */
function eachCell(html, tableRe, fn) {
  return html.replace(tableRe, (table) =>
    table.replace(/<tbody>([\s\S]*?)<\/tbody>/, (tbody, inner) =>
      '<tbody>' +
      inner.replace(/<tr>([\s\S]*?)<\/tr>/g, (tr, cells) => {
        let i = -1;
        return (
          '<tr>' +
          cells.replace(/<td([^>]*)>([\s\S]*?)<\/td>/g, (td, attrs, body) => {
            i += 1;
            return fn(attrs, body, i) ?? td;
          }) +
          '</tr>'
        );
      }) +
      '</tbody>'),
  );
}

let touched = 0;

// ---- 1. school-list / kinder-list: label every cell with its column head ----
for (const file of ['school-list.html', 'kinder-list.html']) {
  const path = join(pagesDir, file);
  let html = readFileSync(path, 'utf8');

  const heads = [...(html.match(/<thead><tr>([\s\S]*?)<\/tr><\/thead>/)?.[1] ?? '')
    .matchAll(/<th[^>]*>([\s\S]*?)<\/th>/g)].map((m) => strip(m[1]));
  if (!heads.length) throw new Error(`${file}: no <thead> found`);

  // `stack-sm` is the hook the shared CSS keys off; adding it twice is a no-op.
  html = html.replace(/<table(?![^>]*class=)>/, '<table class="stack-sm">');

  html = eachCell(html, /<table class="stack-sm">[\s\S]*?<\/table>/, (attrs, body, i) => {
    const label = heads[i] ?? '';
    const kept = dropAttr(attrs, 'data-label');
    return `<td${kept}${label ? ` data-label="${esc(label)}"` : ''}>${body}</td>`;
  });

  writeFileSync(path, html, 'utf8');
  touched += 1;
  console.log(`${file}: ${heads.length} columns → ${heads.join(' / ')}`);
}

// ---- 2. curriculum matrix: label every cell with its grade ----
{
  const path = join(pagesDir, 'curriculum.html');
  let html = readFileSync(path, 'utf8');
  let missing = 0;

  html = eachCell(html, /<table class="matrix">[\s\S]*?<\/table>/, (attrs, body) => {
    if (/m-corner/.test(attrs)) return null;               // the empty top-left cell
    // "כיתה ט': נלמד באופן חלקי" -> ט'
    const grade = body.match(/כיתה\s+([^:<]+):/)?.[1]?.trim();
    if (!grade) { missing += 1; return null; }
    return `<td${dropAttr(attrs, 'data-grade')} data-grade="${esc(grade)}">${body}</td>`;
  });

  if (missing) throw new Error(`curriculum matrix: ${missing} cell(s) had no grade in their .sr-only text`);
  writeFileSync(path, html, 'utf8');
  touched += 1;
  console.log('curriculum.html: matrix cells labelled with their grade');
}

console.log(`Annotated tables on ${touched} page(s).`);
