// Brings the admin's status colours up to WCAG 1.4.3 AA. Idempotent - safe to
// re-run. ENABLED = false puts the original values back.
//
// --ok / --warn / --crit / --info each do two jobs: a foreground on the white
// panel, where they all pass, and a foreground on their own tint, where in the
// light theme all four fail - .pill.info reads 2.77:1 and .pill.warn 2.99:1
// against the 4.5:1 that 11.8px text needs. The dark theme is already clear at
// 5.9:1 and up, so nothing there changes.
//
// The split follows the precedent .notice set: it already hard-codes a darker
// amber with the comment "Not var(--warn): amber on amber-tint is 2.99:1 at
// this size, under AA." That one-off becomes a named token here, so the next
// thing that needs a foreground on a tint has one to reach for instead of
// discovering the problem again. In the dark theme each -ink token is just its
// base colour, which keeps every rule a single var() in both themes.
//
// .side-sec is separate: white at .42 alpha over the sidebar gradient lands
// between 3.38:1 and 4.10:1 depending on where the gradient is read, and axe
// never flagged it because it cannot resolve a gradient background and reports
// the element as "incomplete" rather than failing. .58 clears 5.03:1 at the
// lightest stop of the four (#4A3623, the light theme's gradient start).
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ENABLED = true;
const adminDir = join(dirname(fileURLToPath(import.meta.url)), 'pages', 'admin');
const FILES = ['admin-dashboard.html', 'index.html', 'set-password.html'];

const LIGHT_TOKENS = '--ok:#5E7D52; --ok-bg:#E7EEDF; --warn:#B7791F; --warn-bg:#F6E8C8;';
const DARK_TOKENS  = '--ok:#9DC08A; --ok-bg:#26301F; --warn:#E0B65E; --warn-bg:#352a12;';

const EDITS = [
  // foreground-on-tint inks, declared next to the pair they belong to
  // Both of these append to their anchor, so their `from` survives the edit and
  // the includes(from) test alone would re-append on every run - see the loop.
  { name: 'light inks', from: LIGHT_TOKENS, done: '--ok-ink:#526D48;',
    to: LIGHT_TOKENS + '\n  --ok-ink:#526D48; --warn-ink:#8A5B17; --crit-ink:#964B39; --info-ink:#446A79;' },
  { name: 'dark inks', from: DARK_TOKENS, done: '--ok-ink:var(--ok);',
    to: DARK_TOKENS + '\n  --ok-ink:var(--ok); --warn-ink:var(--warn); --crit-ink:var(--crit); --info-ink:var(--info);' },

  { name: 'pill.ok',   from: '.pill.ok{background:var(--ok-bg);color:var(--ok)}',
                       to:   '.pill.ok{background:var(--ok-bg);color:var(--ok-ink)}' },
  { name: 'pill.warn', from: '.pill.warn{background:var(--warn-bg);color:var(--warn)}',
                       to:   '.pill.warn{background:var(--warn-bg);color:var(--warn-ink)}' },
  { name: 'pill.crit', from: '.pill.crit{background:var(--crit-bg);color:var(--crit)}',
                       to:   '.pill.crit{background:var(--crit-bg);color:var(--crit-ink)}' },
  { name: 'pill.info', from: '.pill.info{background:var(--info-bg);color:var(--info)}',
                       to:   '.pill.info{background:var(--info-bg);color:var(--info-ink)}' },

  // .act.danger:hover is an icon button, so 1.4.11's 3:1 applies rather than
  // 4.5:1 and it already passes - but it is the same colour on the same tint,
  // and there is no reason for it to sit below the pills.
  { name: 'act.danger', from: '.act.danger:hover{background:var(--crit-bg);color:var(--crit)}',
                        to:   '.act.danger:hover{background:var(--crit-bg);color:var(--crit-ink)}' },

  // the hard-coded amber and its two dark-theme overrides all collapse into
  // the token now that one exists
  { name: 'notice ink', from: 'background:var(--warn-bg);color:#8A5A12;',
                        to:   'background:var(--warn-bg);color:var(--warn-ink);' },
  { name: 'notice dark override (media)',
    from: '@media (prefers-color-scheme:dark){:root:not([data-theme="light"]) .notice{color:var(--warn)}}\n',
    to: '' },
  { name: 'notice dark override (attr)',
    from: ':root[data-theme="dark"] .notice{color:var(--warn)}\n',
    to: '' },

  // The avatar's initial is white on a radial that runs var(--tan) -> var(--brown).
  // Both ends move with the theme and neither is reliable: --tan is a pale
  // #C4A882 in light (white on it is 2.27:1) and in dark --brown becomes a light
  // tan too, so the letter sits at 1.82:1 against its own darkest stop. No single
  // ink clears a gradient that wide, so the gradient is pinned to two fixed warm
  // browns instead - the same thing --sidebar already does - and white clears
  // 4.95:1 at the lightest point of it in either theme.
  { name: 'avatar gradient',
    from: 'background:radial-gradient(circle at 32% 28%,var(--tan),var(--brown))}',
    to:   'background:radial-gradient(circle at 32% 28%,#8A6A49,#4A3623)}' },

  // .chip.on paints white on var(--brown), and --brown is a light tan in dark mode,
  // so the label lands at 1.82:1. The [data-theme="dark"] override for this already
  // exists; only the prefers-color-scheme twin was missing. .btn-primary two rules
  // up carries both forms and is the shape copied here.
  { name: 'chip.on dark-media override',
    done: '@media (prefers-color-scheme:dark){:root:not([data-theme="light"]) .chip.on{color:#1a120a}}',
    from: ':root[data-theme="dark"] .chip.on{color:#1a120a}\n',
    to:   ':root[data-theme="dark"] .chip.on{color:#1a120a}\n@media (prefers-color-scheme:dark){:root:not([data-theme="light"]) .chip.on{color:#1a120a}}\n' },

  // The analytics tooltip button went white on var(--tan) when hovered or focused:
  // 2.27:1 light, 2.22:1 dark - failing in every theme, and one of the two states is
  // keyboard focus. --tan is pale in both themes, so the ink flips to the dark brown
  // rather than the background moving; that reads 5.93:1 light and 6.05:1 dark.
  // Neither axe nor a pixel probe reaches this rule, since both only ever see the
  // resting state - it was found by a static sweep of the stylesheet.
  { name: 'an-tip hover/focus ink',
    from: '.an-tip:hover,.an-tip:focus-visible{background:var(--tan);color:#fff}',
    to:   '.an-tip:hover,.an-tip:focus-visible{background:var(--tan);color:#3D2B1F}' },

  { name: 'side-sec alpha',
    from: '.side-sec{font-size:.68rem;letter-spacing:.13em;color:rgba(255,255,255,.42);',
    to:   '.side-sec{font-size:.68rem;letter-spacing:.13em;color:rgba(255,255,255,.58);' },
];

const tally = new Map();
let touched = 0;
for (const file of FILES) {
  const path = join(adminDir, file);
  const before = readFileSync(path, 'utf8');
  let html = before;
  for (const e of EDITS) {
    const [from, to] = ENABLED ? [e.from, e.to] : [e.to, e.from];
    // An edit whose `from` still matches its own output re-applies on every run.
    // `chip.on dark-media override` appended a second copy of its @media block
    // each time, because its `from` is a prefix of its `to` and the plain
    // includes(from) test below stays true once the edit has been made. Such a
    // pair needs `done`: a marker present only in the applied form.
    if (e.done) { if (ENABLED === html.includes(e.done)) continue; }
    else if (from && to && (to.includes(from) || from.includes(to)))
      throw new Error(`edit "${e.name}" overlaps its own output; give it a \`done\` marker`);
    if (!from || !html.includes(from)) continue;
    html = html.split(from).join(to);
    tally.set(e.name, (tally.get(e.name) || 0) + 1);
  }
  if (html !== before) { writeFileSync(path, html); touched++; }
}

console.log(ENABLED ? 'patch-admin-contrast: applied' : 'patch-admin-contrast: reverted');
for (const e of EDITS) console.log(`  ${e.name.padEnd(32)} ${tally.get(e.name) || 0} file(s)`);
console.log(`  ${touched} file(s) rewritten`);
