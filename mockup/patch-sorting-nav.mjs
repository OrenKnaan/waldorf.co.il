// Adds the "חומר למיון" entry to the primary nav of every page, with its
// "זמני" badge, and the badge's stylesheet rule. Idempotent — safe to re-run.
//
//   node mockup/patch-sorting-nav.mjs
//
// Set ENABLED = false and re-run to strip the entry back out of every page,
// which is what launch cutover does: the section, its data and this entry all
// come out together (CLAUDE.md, "Launch cutover").
//
// It patches the nav in place rather than regenerating it from build.mjs's
// NAV_STRUCTURE, which has drifted from what the pages actually carry — the
// live nav groups four sections under «מידע ומשאבים», and that grouping exists
// only in the HTML. Regenerating would quietly revert it.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ENABLED = true;

const pagesDir = join(dirname(fileURLToPath(import.meta.url)), 'pages');

const CHEVRON = '<svg class="icon-inline" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 8.5l7 7 7-7"/></svg>';

// Last before «צור קשר», so it reads as an appendix to the site rather than as
// one of its sections — which is what it is.
const NAV_ITEM = `<div class="nav-item"><a class="nav-link" data-nav="sorting" href="./sorting.html">חומר למיון<span class="nav-badge">זמני</span>${CHEVRON}</a>
<div class="dropdown">
<a class="dropdown-link" href="./sorting.html">על המדור</a>
<div class="dropdown-sep"></div>
<a class="dropdown-link" href="./sorting-library.html">ספרייה</a>
<a class="dropdown-link" href="./sorting-articles.html">מאמרים</a>
<a class="dropdown-link" href="./sorting-subjects.html">מאמרים לפי מקצוע</a>
<a class="dropdown-link" href="./sorting-capstone.html">עבודות גמר</a>
<a class="dropdown-link" href="./sorting-announcements.html">מודעות ופרסומים</a>
<a class="dropdown-link" href="./sorting-pages.html">דפים מהאתר הישן</a>
</div></div>
`;

// Same treatment .pending-badge already gets on the page body, sized down for a
// nav row. Its own colour pair (#F3DDA7 behind --brown-dark) is 8.8:1, and it
// is set explicitly rather than inherited so the badge stays legible when the
// accessibility layer rewrites the nav's colours.
const BADGE_CSS = `  /* ===== sorting badge (temporary) ===== */
  .nav-badge{display:inline-block;background:#F3DDA7;color:var(--brown-dark);font-size:10.5px;font-weight:600;
    line-height:1.6;padding:0 8px;margin-inline-start:2px;border-radius:var(--radius-organic-sm)}
  .dropdown-link .nav-badge{margin-inline-start:6px}
`;

const MARKER = 'data-nav="sorting"';
const CSS_MARKER = '/* ===== sorting badge (temporary) ===== */';
const CONTACT = '<div class="nav-item"><a class="nav-link" data-nav="contact" href="./contact.html">צור קשר</a></div>';

let added = 0, already = 0, removed = 0, skipped = [];

for (const file of readdirSync(pagesDir).filter((f) => f.endsWith('.html'))) {
  const path = join(pagesDir, file);
  let html = readFileSync(path, 'utf8');
  const before = html;

  if (!ENABLED) {
    html = html.replace(new RegExp(`<div class="nav-item"><a class="nav-link" ${MARKER}[\\s\\S]*?</div></div>\\n`), '');
    html = html.replace(new RegExp(`${CSS_MARKER.replace(/[*/]/g, '\\$&')}[\\s\\S]*?\\n(?=\\s*/\\*|</style>)`), '');
    if (html !== before) { writeFileSync(path, html, 'utf8'); removed += 1; }
    continue;
  }

  if (!html.includes(CONTACT)) { skipped.push(file); continue; }

  if (html.includes(MARKER)) already += 1;
  else html = html.replace(CONTACT, NAV_ITEM + CONTACT);

  // Ahead of the shared responsive block, which patch-responsive.mjs rewrites
  // verbatim from responsive.mjs on every run and would otherwise swallow this.
  if (!html.includes(CSS_MARKER)) {
    html = html.includes('\n  /* ===== responsive ===== */')
      ? html.replace('\n  /* ===== responsive ===== */', `\n${BADGE_CSS}\n  /* ===== responsive ===== */`)
      : html.replace('\n</style>', `\n${BADGE_CSS}</style>`);
  }

  if (html !== before) { writeFileSync(path, html, 'utf8'); added += 1; }
}

if (ENABLED) {
  console.log(`nav entry patched into ${added} page(s); ${already} already had it.`);
  if (skipped.length) console.log(`no primary nav, skipped: ${skipped.join(', ')}`);
} else {
  console.log(`nav entry stripped from ${removed} page(s).`);
}
