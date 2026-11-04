# Books page (e-books and the book store)

Moved out of the root `CLAUDE.md` (2026-10-28) so it loads only when a task needs it. The root file keeps the rules; this is the detail behind them.

## Books page (ספרים)

Permanent, requested by the forum on 2026-10-11 as its own page: one book is read on this
site for free, and future e-books are bought elsewhere. On 2026-11-04 the forum renamed it
from "ספרים אלקטרוניים" (`ebooks.html`) to "ספרים" (`books.html`), merged its two sections
into one, "ספרים אלקטרוניים פתוחים לקריאה", and added a second, "חנות ספרים", a single link
to the forum's own store for the books it publishes (`pay.sumit.co.il/539e34/53mo9d/`).
Nothing redirects from `ebooks.html`: the mockup had no visitors to keep.

- `mockup/pages/books.html` hardcodes the one fully open book, "חינוך ולדורף, עקרונות
  ויישומים", as the featured first entry (`.book-feature`, its cover framed like
  `library.js`'s `.lib-cover`; CSS below the page's `page overrides` marker), with a link
  to its first chapter, `lib-p2038.html`, since there is exactly one of those and it predates
  this page. (A "ספר מומלץ" badge and a link to its chapters on `content-library.html` were
  removed at the forum's request the same day.)
  Everything after it comes from D1's `library` collection with `kind = 'ספר אלקטרוני'`,
  rendered by `WDyn.renderEbooks` in `mockup/pages/dynamic.js`.
- The `library` table gained a `purchase_url` column (migration `0013_library_ebooks.sql`,
  content API field `purchaseUrl`). A row with `purchase_url` set renders a "לרכישה" link
  that opens in a new tab (leaving the site to buy); a row with only `url` set renders a
  same-tab "קריאה חופשית" link to its own page on this site. A row with neither is a future
  book not yet linked to anything, and renders "בקרוב". Two rows are open today: "22 שאלות
  ותשובות על חינוך ולדורף" (`lb-p2323`, moved here out of the general `מאמר` kind), and
  "אמנות הדיבור" (`lb-speech-arts`, migration `0014_library_speech_arts.sql`), the subject
  the forum found no curriculum page for and asked to put here instead (see
  `agent-docs/triage.md`). Unlike every other library item, `lib-speech-arts.html` has no single
  WordPress post behind it: it combines five pieces from the triage archive (an intro, a
  curriculum summary, and three age-group chapters) by hand into one page, the same way the
  main book's cover and chapter rail are hand-built rather than generated per record.
- Those two rows' `page_html` carries a breadcrumb and a "חזרה לספרים" button back to
  `books.html`. It lives in D1 and in `content-api/seed/library-pages.sql`, and
  `library-shells.mjs` cannot regenerate it (it skips pages that are already shells), so a
  change to either link is a hand edit to the seed plus the same `replace()` run against
  the remote database.
- `mockup/pages/library.js` excludes `kind = 'ספר אלקטרוני'` from `content-library.html`'s own
  works/book grids, so an e-book shows up on `books.html` only, not twice.
- `mockup/patch-books-nav.mjs` adds the nav entry (idempotent, `ENABLED = false` to strip).
- Migrations `0012` through `0014` are applied to the production D1 database (confirmed
  2026-10-28, when `wrangler d1 migrations list --remote` showed only `0015` pending).
