# Global search

Moved out of the root `CLAUDE.md` (2026-10-28) so it loads only when a task needs it. The root file keeps the rules; this is the detail behind them.

## Global search

Like the accessibility layer, this is **permanent**: the behaviour ports to production. The three mockup scripts that produce it do not; see below.

A magnifying-glass button at the inline-end of the menu row opens a search field that suggests results as you type. It is a flex item of `.primary-nav`, so it sits with the menu links and inside their 960px column. Below 720px `.primary-nav` collapses to a `max-height:0` drawer, so the button is absolutely positioned into the header bar there instead, in the corner the hamburger does not occupy; otherwise it would be unreachable until the menu was opened. The engine is **MiniSearch 7.2** (MIT), chosen over the alternatives for concrete reasons worth keeping: Fuse.js scores fuzzily with no inverted index or real prefix semantics, Lunr forces an English stemmer, and Pagefind wants a build step and per-platform binaries the mockup has no place for. Pagefind is still the obvious candidate for the Astro build, where a build step exists.

- `mockup/pages/search.js`: the widget. Injects its own `<style>` and its own button, so no page markup carries it. Loaded **deferred**, unlike `accessibility.js`: it has nothing to apply before first paint. Without JavaScript no button appears at all, which is the honest outcome for a search that is entirely client-side.
  - The engine and the index are fetched lazily, on first open (and prefetched on hover), so a visitor who never searches pays nothing.
  - Follows the ARIA 1.2 combobox pattern: `aria-expanded`/`aria-activedescendant` on the input, options as direct children of the listbox, arrow/Home/End/Escape, focus returned to the button on close.
  - Styled with the site's **design tokens**, deliberately unlike the accessibility panel. This is ordinary chrome, so it should follow the palette, and it picks up `html.a11y-contrast` for free. The one hand-written exception is the high-contrast rule that puts the panel's background back, because the a11y layer blanks every background inside `.site-header`.
- **Hebrew needs two things** the default tokenizer does not do, both in `tokenize()`/`processTerm()`. Abbreviation marks are folded away rather than treated as word breaks, so `תשפ"ז` stays one token. Final letters are folded to their medial forms, or `גן` would never prefix-match `גנים`, the single most common Hebrew search there is. Niqqud is stripped too, so unpointed typing finds pointed text.
- `mockup/pages/minisearch.min.js`: vendored ESM bundle, 18.5 KB (5.9 KB gzipped). Committed because GitHub Pages serves `mockup/pages/` verbatim with no install step. Regenerate with `node mockup/vendor-minisearch.mjs` after bumping the dependency; do not hand-edit.
- `mockup/patch-search.mjs`: idempotent patcher, adding the script tag plus `id="sec-…"` on every `<h2>` so a result can link to the section it matched instead of the top of a long page. `ENABLED = false` strips both back out. Re-run it after adding a page.
- `mockup/search-index.mjs`: builds `mockup/pages/search-index.json`. **Run it after the patcher**, which owns the anchors; this script reads the ids back out of the HTML rather than recomputing them, so the two can never disagree.
  - Indexes *sections*, not pages: one document per page intro plus one per `<h2>` card. 127 documents, 213 KB raw / 57 KB gzipped.
  - Reads the dynamic collections from the **D1 content API**, not from `data.js` (see the content layer note in the cutover list; `data.js` is dead). Needs the network; without it the page half is still written, with a warning and a non-zero exit.
  - Deliberately **not** indexed: `<span class="ph">` notes (questions addressed to us, not copy for readers), the breadcrumb/header/footer, and art-hero image captions.
  - The index is therefore a **snapshot**. An item published through the admin changes D1 immediately but stays unfindable until this script runs again. In Astro that wants to be a deploy-time step, or the search moves behind a Worker querying D1 per request.

Verified in headless Chrome over CDP: 30 functional checks, and axe-core 4.13 at the same four WCAG tags across all 42 pages closed, four pages with live results, the no-results state, and every accessibility adjustment switched on: **0 violations**. Re-check rather than assuming; the audit caught `--tan-dark` used as small text here too, exactly as the accessibility section warns.

Two traps this feature hit, both worth knowing before touching button or highlight colours anywhere on the site:

- The page stylesheet carries a bare `a:hover{color:var(--brown-dark)}`. Any `<a>` styled as a solid button has to restate its own colour on hover, because `a:hover` at (0,1,1) outranks a single class at (0,1,0). `.dyn-btn` did not, so hovering "להרשמה (טופס גוגל)" painted `--brown-dark` text on a `--brown-dark` background: **1:1, the label disappeared**. `.btn-primary` in the page stylesheet had already learned this.
- Highlight and label colours have to be checked against the colour they land on, not the colour they were designed against. `--tan-dark` and `--text-muted` both failed AA once used as small text on the search results, in two separate rounds.

**Scan at more than one viewport width.** Both of the violations that were sitting unfixed on `kinder-list.html` were invisible at 1280px: the table only overflows between roughly 561px and 670px, and the Leaflet rule only fires once the map control wraps. Scan with content settled, too; a scan that races the D1 fetch reports a page that is not the page a visitor sees.
