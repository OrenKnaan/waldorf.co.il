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
// The entry sits after «רשימת בתי ספר» and before the separator that precedes
// «הכשרת מורים», because an association is the body behind the kindergartens
// and the school alike, not a third kind of institution.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ENABLED = true;

const pagesDir = join(dirname(fileURLToPath(import.meta.url)), 'pages');

const LINK = '<a class="dropdown-link" href="./associations.html">עמותות מפעילות</a>\n';
const ANCHOR = '<a class="dropdown-link" href="./school-list.html">רשימת בתי ספר</a>\n';

// The inline nav script lights the parent «מוסדות חינוך» tab by matching the
// filename against a group regex. A page it does not name leaves that tab dark,
// so the reader loses the "you are here" cue on the one page reached only from
// that menu.
const GRP_OLD = '/^(kinder|school|curriculum|teacher-training)/';
const GRP_NEW = '/^(kinder|school|curriculum|teacher-training|associations)/';

let added = 0, already = 0, removed = 0, skipped = [], regrouped = 0;

for (const file of readdirSync(pagesDir).filter((f) => f.endsWith('.html'))) {
  const path = join(pagesDir, file);
  let html = readFileSync(path, 'utf8');
  const before = html;

  if (!ENABLED) {
    html = html.split(LINK).join('');
    if (html !== before) removed++;
  } else if (html.includes(LINK)) {
    // Test against the whole dropdown link, not just its href: school-list.html
    // and kinder-list.html carry a body link to the same page, and a looser
    // test reads those as "already navigated" and skips the two pages that
    // most need the entry.
    already++;
  } else if (!html.includes(ANCHOR)) {
    skipped.push(file);
  } else {
    html = html.replace(ANCHOR, ANCHOR + LINK);
    added++;
  }

  const beforeGrp = html;
  html = ENABLED ? html.split(GRP_OLD).join(GRP_NEW) : html.split(GRP_NEW).join(GRP_OLD);
  if (html !== beforeGrp) regrouped++;

  if (html !== before) writeFileSync(path, html);
}

console.log(
  ENABLED
    ? `Nav entry added to ${added} page(s), ${already} already had it.`
    : `Nav entry removed from ${removed} page(s).`
);
console.log(`Nav group regex updated on ${regrouped} page(s).`);
if (skipped.length) console.log(`Skipped (no «מוסדות חינוך» dropdown): ${skipped.join(', ')}`);
