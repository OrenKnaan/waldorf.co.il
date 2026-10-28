# The triage section (חומר למיון)

Moved out of the root `CLAUDE.md` (2026-10-28) so it loads only when a task needs it. The root file keeps the rules; this is the detail behind them.

## The triage section (חומר למיון)

**Admin-only as of 2026-10-18.** It used to have four public pages and two admin-only ones;
all six groups are admin-only now, reachable only from the admin dashboard sidebar
("חומר למיון (ארכיון)" → "סקירה כללית"), not from the public nav at all. It exists because
the new site is a rewrite: its pages are shorter and better organised than the old ones, and
in the process items were left behind that nobody had decided about.

The forum reviewed the pile on 2026-10-11 and answered item by item (`mockup/sorting-decisions.mjs`
records every answer, so a future re-scrape does not lose them), but "classified" turned out
not to mean "has a confirmed home." Checking the forum's reading of **תוכניות לימודים לפי
מקצוע** (was "מאמרים לפי מקצוע": each subject bucket *is* that subject's curriculum, not a
separate article, per the forum) against the actual `curriculum-*.html` pages found two
subject buckets with no match anywhere: בוטמר ומשחקים (2 items) and אמנות הדיבור (5 items,
only a passing mention of "דקלום" in `curriculum-hebrew.html`). Everything else checked out:
**ספרים אלקטרוניים** (was "ספרייה") and **עבודות גמר** turned out to already be fully covered
by `content-library.html` and `ebooks.html` (built before this reorg), the other 15 subject
categories map onto real `curriculum-*.html` content, and the "pages" group's "already on the
new site" notes held up against `school.html`/`kinder.html`/`school-list.html`/`kinder-list.html`.
Both gaps were put to Gilad on 2026-10-19 and are resolved now: בוטמר ומשחקים is dropped
(`BOTHMER_NOTE` in the decisions module, no further action), and אמנות הדיבור moved to the
e-books showcase instead of a curriculum page (`lb-speech-arts`, see
`agent-docs/ebooks.md`). Neither change brought the pile back to the public site: once moved, it stays
admin-only regardless of how many open items remain, since nothing was deleted, only moved
behind the admin login, so re-exposing any of it later is a nav-entry toggle, not a rebuild.

- **עבודות גמר is bucketed by type, not by year.** The old year buckets are replaced by three:
  עבודות סמינריוניות, עבודות של מורים שונים, and עבודות לתואר שני, decided by the forum rather
  than guessed (`capstoneBucket()` in the decisions module).
- A handful of items moved group or bucket entirely (the book's chapters gained a sibling,
  "22 שאלות ותשובות"; a few old-site pages turned out to duplicate capstone entries already
  in the pile and were dropped), and items the forum called "not relevant" or "already on the
  new site" keep a short `note` field, rendered on the card by `sorting.js` so the reason stays
  visible rather than silently vanishing from the pile.

Nothing in it edits existing content. The generators only ever write `pages/admin/sorting*.html`
and `pages/admin/sorting-data/`.

- `mockup/sorting-content.mjs` — pulls the content from the old site's **WordPress REST
  API**, the same one `migration/README.md` documents, so the inventory is complete rather
  than crawled, then applies `sorting-decisions.mjs`. The public/admin split machinery is
  still there (`ADMIN_ONLY_GROUPS` now lists all six groups, so the public write is a no-op)
  rather than deleted, since a future group could again go public without rewriting this.
  Writes `pages/admin/sorting-data/index.json` (metadata) and `items/<id>.html` (one
  sanitised body each, fetched only when opened). Re-run it to refresh; the forum is still
  publishing, so the counts move, but the forum's standing decisions do not.
  - **What counts as missing.** All posts, plus the structural pages whose text the new
    site does not carry. That second judgement is measured, not guessed: eight-word shingles
    of the old page are looked for across all the static pages and the D1 collections, and
    anything above 50% coverage is treated as already migrated. Pages between 15% and 50%
    are kept and flagged, the new site carries a shortened version, and the interesting
    part is what was cut. The same measured standard is what caught the בוטמר/אמנות הדיבור
    gap above; the forum's "I think we already have this" is a lead, not a finding.
  - **Sanitising.** Element ids are stripped (several bodies open on one page would collide),
    inline handlers go, and every `<iframe>` becomes a plain link, nine third parties, one
    of them a `javascript:` src. Two accessibility repairs happen here rather than in the
    page: an `<img>` with no `alt` at all gets one naming the gap, and a link whose only
    content is a decorative image is named from the file it points at. Both are failures in
    the source HTML; fixing them downstream is not possible.
- `mockup/sorting-decisions.mjs` — the forum's editorial decisions, kept separate from the
  scraper so a re-run against the WordPress API does not lose them: `GROUP_TITLE_OVERRIDE`,
  `ADMIN_ONLY_GROUPS`, `DROP_IDS`, `MOVES`, `NOTES`, and the capstone bucket rule.
- `mockup/sorting-pages.mjs` — generates all seven pages (one overview plus the six groups)
  with a skeleton of its own, not a clone of a public page: an admin page carries none of
  the site's nav, accessibility layer or search, the same way `admin/set-password.html`
  does not. `sorting.js` is loaded unmodified against the admin palette's own tokens,
  aliased to the names its injected CSS expects (`--white`, `--text`,
  `--radius-organic-sm`, …), rather than forking the widget's stylesheet.
  - **The `<main>` replace used to be anchored on a bare `<main`.** `media.html`'s own
    "hero: inset slideshow" CSS comment mentions `<main>` in prose before the real tag, and
    a loose `/<main[\s\S]*?<\/main>/` latches onto that instead, consuming everything from
    the comment through the real closing tag and silently writing a corrupted page. Hit once
    while this section was still public-page based and fixed by anchoring on
    `<main id="main-content"`; `library-pages.mjs` had the identical regex and the identical
    latent bug, fixed the same way. Now moot for this generator, since its own skeleton has
    no such comment, but re-check any future `<main>` replace in a generator against this
    trap before trusting its output unseen.
  - Template substitution is `String.replaceAll`, not `replace`: the skeleton's own
    `{{TITLE}}` placeholder appears twice (`<title>` and `<h1>`), and `replace` silently
    fills in only the first.
- `mockup/patch-sorting-nav.mjs` — added the nav entry and its badge CSS to every public
  page; `ENABLED = false` is the resting state now, having stripped both back out. Flip it
  back to `true` and re-run only if some part of the pile goes public again.
  - **Its CSS strip only escaped `*` and `/` before building a regex from the marker
    string, not the parentheses in "(temporary)".** An unescaped `(...)` in a regex is a
    capture group, not two literal characters, so the pattern never matched and
    `ENABLED = false` had silently left the badge CSS on every page it ever ran on, since
    this patcher was first written. Fixed with a proper escape-all-metacharacters helper;
    confirmed by re-running and finding zero remaining `.nav-badge` rules.
- `mockup/pages/sorting.js` — the widget: injects its own CSS (like `search.js`), renders the
  list for whichever group `<main data-sorting-group>` names, buckets it, filters it, shows
  an item's `note` when the forum left one, and fetches an item's body on first open. Hebrew
  filtering folds niqqud, quote marks and final letters, for the reason the search section
  gives. Unmodified since it was a public-facing widget; only the pages around it moved.
  - It re-implements the overflowing-table `tabindex` toggle from `accessibility.js` for the
    tables it injects. That file observes only the wraps present when it initialises, and
    these arrive when somebody opens an item, the alternative was exporting a re-scan hook
    from a permanent file, which this section must not need. Keep the `ResizeObserver` at
    module scope, exactly as the accessibility section warns.

Two things to know before relying on it:

- **Files and images still load from the old site.** Every `href` and `src` resolves against
  `waldorf.co.il`, which is live today and will not be after cutover. `migration/README.md`
  (section "Two things the file deliberately does not cover", point 2) carries the counting
  command and the consequence: **this pile has to be sorted before the domain moves, not
  after**, or whatever the forum decides to keep has nowhere left to be copied from.
- **The index is a snapshot**, like the search index. Something published on the old site
  today does not appear until `sorting-content.mjs` runs again, and this sandbox has no
  network access to the old site's API, so the 2026-10-11 decisions above were applied by
  hand to the existing snapshot rather than by a fresh scrape; re-run `sorting-content.mjs`
  itself once network access is available, to confirm it reproduces the same split.

Not re-verified after the 2026-10-18 move to admin-only: the "seven pages, 364 items, 0
console errors, 0 axe violations" audit this section used to report was run against the
*original* public, six-group structure, two reorgs ago. Re-run the Chrome-over-CDP and
axe-core passes described in "Scanning for bugs and violations" before trusting that result
again.
