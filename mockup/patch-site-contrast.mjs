// Fixes the two places on the public site where near-white text is painted onto a
// pale warm background, so both clear WCAG 1.4.3. Idempotent - safe to re-run.
// ENABLED = false puts both declarations back the way they were.
//
// Neither of these could be caught by the axe sweep that the accessibility
// section reports as clean, and for two different reasons.
//
// .tab-btn:hover paints var(--white) on var(--tan): #FFFDF9 on #C4A882 is
// 2.23:1 against the 4.5:1 that .85rem body text needs. axe only ever measures
// the resting state, so a colour pair that exists solely under :hover is
// invisible to it - this one was found by resolving the stylesheet's own tokens
// statically. .tab-btn.active is fine and is left alone: var(--brown) is dark
// enough to carry white at 7.5:1. The 20 pages with tabs are the ones affected;
// the rule ships in the shared stylesheet on all 160.
//
// .avatar paints var(--white) on a radial of two color-mix() values over the
// oklch wash tokens. axe cannot resolve a gradient at all, so it reported this
// as "incomplete" rather than failing and it was never counted. Sampling the
// rendered disc puts it between #D1B29A and #DDCDB0, which carries #FFFDF9 at
// 1.54:1 - the initial was very nearly invisible. It renders on forum-roles.html
// only, at 20px bold (needs 3:1) shrinking to 16.8px bold at 375px (needs 4.5:1),
// and it failed both.
//
// Both flip the ink to var(--brown-dark) rather than darkening the background,
// because the pale gold-and-rose disc and the tan hover tint are deliberate and
// the text is what has to move. On the sampled disc that reads 6.74:1 at the
// lightest pixel and 8.59:1 at the darkest; on var(--tan) it reads 5.93:1. Using
// the token and not a literal is safe here: unlike the admin, the site has one
// theme, so --brown-dark is #3D2B1F everywhere.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ENABLED = true;
const pagesDir = join(dirname(fileURLToPath(import.meta.url)), 'pages');

const EDITS = [
  { name: 'tab-btn hover ink',
    from: '.tab-btn:hover{background:var(--tan);color:var(--white)}',
    to:   '.tab-btn:hover{background:var(--tan);color:var(--brown-dark)}' },

  // The footer is the one run of body text with no opaque background of its own,
  // so it sits straight on the two fixed layers behind the page: .page-wash
  // (an oklab radial) and .page-tex (watercolor-clouds.webp at .8 opacity).
  // Sampling the background at the glyph pixels across 6 pages x 3 viewports -
  // 17,743 samples - puts it between #AC8084 and #E9DFCE, and var(--text-muted)
  // at .8rem measures 2.73:1 against the 1st percentile of that. axe reported
  // the whole footer "incomplete" rather than failing, because it cannot resolve
  // a background image, which is why it never appeared in the 0-violations run.
  // var(--brown-dark) reads 5.55:1 at the same percentile and 10.17:1 at the
  // lightest. Measuring at a realistic viewport matters here: both layers are
  // position:fixed, so a tall viewport stretches the texture into a rendering no
  // visitor ever sees and gives a different answer.
  { name: 'footer ink',
    from: 'footer.site-footer{text-align:center;padding:30px 24px 50px;color:var(--text-muted);font-size:.8rem}',
    to:   'footer.site-footer{text-align:center;padding:30px 24px 50px;color:var(--brown-dark);font-size:.8rem}' },

  // Anchored on the declarations either side of the colour so the long
  // gradient does not have to be repeated here.
  { name: 'avatar ink',
    from: 'color:var(--white);font-size:1.25rem;background:radial-gradient(circle at 34% 28%,color-mix(',
    to:   'color:var(--brown-dark);font-size:1.25rem;background:radial-gradient(circle at 34% 28%,color-mix(' },
];

let touched = 0;
const tally = new Map();
for (const file of readdirSync(pagesDir).filter(f => f.endsWith('.html'))) {
  const path = join(pagesDir, file);
  const before = readFileSync(path, 'utf8');
  let html = before;
  for (const e of EDITS) {
    const [from, to] = ENABLED ? [e.from, e.to] : [e.to, e.from];
    if (!html.includes(from)) continue;
    html = html.split(from).join(to);
    tally.set(e.name, (tally.get(e.name) || 0) + 1);
  }
  if (html !== before) { writeFileSync(path, html); touched++; }
}

console.log(ENABLED ? 'patch-site-contrast: applied' : 'patch-site-contrast: reverted');
for (const e of EDITS) console.log(`  ${e.name.padEnd(22)} ${tally.get(e.name) || 0} page(s)`);
console.log(`  ${String(touched).padStart(3)} file(s) rewritten`);
