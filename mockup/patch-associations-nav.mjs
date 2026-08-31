// Adds the "עמותות מפעילות" entry to the «מוסדות חינוך» dropdown of every page.
// Idempotent — safe to re-run.
//
//   node mockup/patch-associations-nav.mjs
//
// Set ENABLED = false and re-run to strip the entry back out.
//
// It patches the nav in place rather than regenerating it from build.mjs's
// NAV_STRUCTURE, for the reason patch-sorting-nav.mjs gives: the live nav has
// drifted from that structure, and regenerating would quietly revert it.
//
// The entry sits at the top of the dropdown, above «גני ילדים» and «בית הספר»
// both, with its own separator. An association runs the kindergartens and the
// school as one body, so filing it under either group tells the reader the
// wrong thing about what it is.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ENABLED = true;

const pagesDir = join(dirname(fileURLToPath(import.meta.url)), 'pages');

const LINK = '<a class="dropdown-link" href="./associations.html">עמותות מפעילות</a>\n';
const SEP = '<div class="dropdown-sep"></div>\n';

// The opening of the «מוסדות חינוך» dropdown. «<div class="dropdown">» alone
// repeats once per nav item, so the first group heading is carried along to
// make the anchor unique.
const ANCHOR = '<div class="dropdown">\n<div class="dropdown-head">גני ילדים</div>\n';
const BLOCK = '<div class="dropdown">\n' + LINK + SEP + '<div class="dropdown-head">גני ילדים</div>\n';

// The inline nav script lights the parent «מוסדות חינוך» tab by matching the
// filename against a group regex. A page it does not name leaves that tab dark,
// so the reader loses the "you are here" cue on the one page reached only from
// that menu.
const GRP_OLD = '/^(kinder|school|curriculum|teacher-training)/';
const GRP_NEW = '/^(kinder|school|curriculum|teacher-training|associations)/';

let placed = 0, removed = 0, moved = 0, skipped = [], regrouped = 0;

for (const file of readdirSync(pagesDir).filter((f) => f.endsWith('.html'))) {
  const path = join(pagesDir, file);
  let html = readFileSync(path, 'utf8');
  const before = html;

  // Strip every existing placement before inserting, so a re-run after the
  // entry moves relocates it instead of leaving one copy behind and adding
  // a second. Undo our own block first: otherwise the bare-link sweep below
  // would gut it and leave a stray separator at the top of the menu.
  const hadBlock = html.includes(BLOCK);
  html = html.split(BLOCK).join(ANCHOR);
  const hadLink = html.includes(LINK);
  html = html.split(LINK).join('');

  if (ENABLED) {
    if (html.includes(ANCHOR)) {
      html = html.replace(ANCHOR, BLOCK);
      if (hadLink) moved++;
      else if (!hadBlock) placed++;
    } else {
      skipped.push(file);
    }
  } else if (hadBlock || hadLink) {
    removed++;
  }

  const beforeGrp = html;
  html = ENABLED ? html.split(GRP_OLD).join(GRP_NEW) : html.split(GRP_NEW).join(GRP_OLD);
  if (html !== beforeGrp) regrouped++;

  if (html !== before) writeFileSync(path, html);
}

console.log(
  ENABLED
    ? `Nav entry: ${placed} added, ${moved} moved to the top of the dropdown.`
    : `Nav entry removed from ${removed} page(s).`
);
if (regrouped) console.log(`Nav group regex updated on ${regrouped} page(s).`);
if (skipped.length) console.log(`Skipped (no «מוסדות חינוך» dropdown): ${skipped.join(', ')}`);
