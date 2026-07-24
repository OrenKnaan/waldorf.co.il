// In-place upgrade of the hand-crafted mockup/pages/*.html to full-path
// breadcrumbs + BreadcrumbList JSON-LD, WITHOUT regenerating the pages (which
// would discard their bespoke bodies). Reuses build.mjs's IA/breadcrumb logic
// so the trails always match the generator. Idempotent — safe to re-run.
//
//   node mockup/patch-breadcrumbs.mjs
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, basename } from 'node:path';
import { pageBySlug, renderBreadcrumb, breadcrumbSchema } from './build.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pagesDir = join(__dirname, 'pages');

const CRUMB_CSS =
  '  .pagebanner .crumbs{display:flex;flex-wrap:wrap;align-items:center;gap:6px}\n' +
  '  .pagebanner .crumb{color:var(--text-muted);text-decoration:none}\n' +
  '  .pagebanner a.crumb:hover{color:var(--brown);text-decoration:underline}\n' +
  '  .pagebanner .crumb.current{color:var(--brown-dark);font-weight:600}\n' +
  '  .pagebanner .crumb-sep{color:var(--tan-dark);opacity:.7}\n';

let patched = 0;
const missing = [];

for (const file of readdirSync(pagesDir).filter((f) => f.endsWith('.html'))) {
  const slug = basename(file, '.html');
  if (!pageBySlug[slug]) { missing.push(slug); continue; }
  let html = readFileSync(join(pagesDir, file), 'utf8');

  // 1) Replace the .pagebanner block with a full breadcrumb, preserving any
  //    trailing "pending scope" badge that lived in the banner.
  const badgeMatch = html.match(/<span class="pending-badge">[\s\S]*?<\/span>/);
  const badge = badgeMatch ? `\n    ${badgeMatch[0]}` : '';
  const crumbs = renderBreadcrumb(slug).trim();
  const banner =
    `  <nav class="pagebanner" aria-label="breadcrumb">\n    ${crumbs}${badge}\n  </nav>`;
  html = html.replace(
    /[ \t]*<(?:div|nav)[^>]*class="pagebanner"[^>]*>[\s\S]*?<\/(?:div|nav)>/,
    banner,
  );

  // 2) Ensure the breadcrumb CSS exists (insert after the .pagebanner{...} rule).
  if (!html.includes('.pagebanner .crumbs')) {
    html = html.replace(/(\n[ \t]*\.pagebanner\{[^\n]*\}\n)/, `$1${CRUMB_CSS}`);
  }

  // 3) Inject/refresh the BreadcrumbList JSON-LD just before </head>.
  html = html.replace(/\s*<script type="application\/ld\+json">[\s\S]*?<\/script>/g, '');
  html = html.replace(/\n<\/head>/, `\n${breadcrumbSchema(slug)}\n</head>`);

  writeFileSync(join(pagesDir, file), html, 'utf8');
  patched++;
}

console.log(`Patched breadcrumbs + schema into ${patched} page(s).`);
if (missing.length) console.log(`No content match (skipped): ${missing.join(', ')}`);
