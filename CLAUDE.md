# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

Redesign project for the Hebrew (RTL) institutional website of "הפורום הארצי לחינוך וולדורף" (National Forum for Waldorf Education in Israel), replacing the existing live site at https://www.waldorf.co.il/.

**Current state**: Astro scaffold is in place (`package.json`, `astro.config.mjs`, `src/pages/`), but `src/pages/index.astro` is currently just a placeholder ("האתר בבנייה" / site under construction). The real content mockup lives outside Astro entirely, under `mockup/` — see "Working with the mockup" below. Astro has not yet been wired up to the actual site content.

**Target production architecture** (per `docs/PRD-forum-waldorf-site.md`): Astro (SSG) for static content pages + React islands for interactive widgets, deployed on Cloudflare Pages, backed by Cloudflare Workers (API), D1 (SQLite), R2 (file storage), and Cloudflare Access (admin auth). The Workers API and D1 schema now exist for content (`content-api/`, live at `waldorf-content-api.orenknaan.workers.dev`) and for analytics (`analytics-worker/`), but they serve the mockup, not an Astro build: Astro itself is still an empty scaffold, and R2 and Cloudflare Access are not set up. Check before referencing specific files/routes from that part of the stack.

## Commands

Standard Astro CLI scripts (`npm run dev`/`build`/`preview`) — see `package.json` for the exact commands. No test suite or linter is configured yet; see "Scanning for bugs and violations" below for what to run on demand instead.

**Verify a dependency change with `npm ci` in an empty directory holding only `package.json` and `package-lock.json`, never with `npm run build`.** The build compiles against whatever `node_modules` already exists and never checks the lock file against `package.json`. `.github/workflows/ci.yml` runs `npm ci` on Linux, and npm resolves optional peer dependencies per platform: installing a package on macOS pruned `@emnapi/core`, which the Linux runner needs, and CI failed on a lock file that had passed a local build. `npm install --package-lock-only` re-prunes it on the same machine, so the repair is to restore the last passing lock file and add only the new package's two blocks to it.

## Deployment

**Current actual state (verified 2026-07-26):**

- GitHub repo: `OrenKnaan/waldorf.co.il` (public).
- There is **no Cloudflare Pages project connected** — confirmed via `gh api repos/OrenKnaan/waldorf.co.il/hooks` returning `[]` (a Git-connected Pages project registers a webhook here) and no `wrangler.toml`/`_redirects`/`_headers` anywhere in the repo. Do not assume a `*.pages.dev` deployment exists.
- What actually deploys: `.github/workflows/pages.yml` publishes the static content of `mockup/pages/` to **GitHub Pages** on every push to `main`, live (publicly, no login wall) at `https://orenknaan.github.io/waldorf.co.il/`. `.github/workflows/ci.yml` just runs `npm run build` as a check — it does not deploy anything.
- Because of this, **most of the pre-launch lockdown below is not actually in effect** — the GitHub Pages URL is public with no Cloudflare Access wall. As of 2026-07-27 every page under `mockup/pages/` does carry `<meta name="robots" content="noindex, nofollow, noarchive">`, which is the only lever GitHub Pages gives us: `robots.txt` is read only from the origin root (`orenknaan.github.io/robots.txt`, which belongs to the whole account, not this project), and GitHub Pages can't set an `X-Robots-Tag` header. So the mockup is "shouldn't be indexed" but still fully public to anyone with the URL. Treat the access wall as an open item, not a solved one.

**Target architecture (per the PRD, section 9 — not yet built):**

- A Cloudflare Pages project, Git-connected (build command `npm run build`, output directory `dist`), so every push to `main` deploys to production and every PR/branch gets an automatic preview URL.
- **Pre-launch lockdown**: until the real domain cuts over, the site must stay off Google/AI crawlers and mostly private:
  - `public/robots.txt` disallows everything.
  - Every page's `<head>` should carry `<meta name="robots" content="noindex, nofollow, noarchive">` (already on all 43 `mockup/pages/*.html` and on `src/pages/index.astro` — add it to any new page you create pre-launch).
  - A Cloudflare Access (Zero Trust) login wall sits in front of the whole `*.pages.dev` deployment as the actual access control (robots/meta are just backup signals — well-behaved crawlers only, not a real barrier on their own).
  - **All three must be removed together at launch cutover**, at the same time the custom domain `waldorf.co.il` is attached to the Pages project and the old-site URL redirects (see below) go live.
- The live site at waldorf.co.il is untouched throughout — the custom domain is only attached to the new Cloudflare Pages project on launch day, not before.
- Setting up the actual Cloudflare Pages project (and deciding what to do with the currently-public GitHub Pages mockup in the meantime) is still an open task.

## Launch cutover: temporary scaffolding that must be removed

Everything below exists **only because this is a pre-launch mockup on GitHub Pages**. When the real site moves to Cloudflare Pages and `waldorf.co.il` is attached, each item has to be removed or replaced — not carried over. Inventory verified 2026-07-27; re-check counts before acting, they drift.

**Crawler lockdown — remove all of it together, on cutover day, at the same time the custom domain goes live and the old-URL redirects are published.** Removing any one piece early exposes an unfinished site; leaving any piece in place after launch silently keeps the real site out of Google.

1. `<meta name="robots" content="noindex, nofollow, noarchive">` — in all 43 `mockup/pages/*.html` and in `src/pages/index.astro`.
2. `public/robots.txt` disallowing everything — **not created yet** (pointless on GitHub Pages, see Deployment above; add it when the Cloudflare Pages project exists, then remove at cutover).
3. Cloudflare Access (Zero Trust) wall over `*.pages.dev` — **not set up yet**.

**Mockup-only implementation that the production build replaces:**

4. `mockup/pages/store.js` + `mockup/pages/dynamic.js`: `WStore` now reads the D1 content API at `https://waldorf-content-api.orenknaan.workers.dev/api/content` (Worker and migrations in `content-api/`). `mockup/pages/data.js` is **dead**: it is still on disk but no page loads it, so do not read it and do not treat it as the content source. The only thing still in localStorage is which noticeboard submissions came from this browser (`waldorf-mockup-mine-v1`), which is a per-device fact with no server-side identity.
5. Invented seed records flagged `demo: true`, which render a "רשומת הדגמה" chip. They now live in D1 (seeded from `content-api/migrations/0002_seed.sql`), not in `data.js`. These are not real forum content, so do not migrate them.
6. `mockup/pages/admin/` (`admin.html`, `admin-dashboard.html`, `admin-app.js`, `admin-analytics.js`) — admin UI against `WStore`. **Published** at `/admin/` since 2026-08-22, so it is publicly reachable with no authentication — the password box on `admin.html` is decorative, there is no auth logic behind it. That is tolerable only because `WStore` is localStorage-only: a stranger's edits change their own browser and nothing else, there is no shared state. The analytics view is the one part reading real data, and it needs `DASH_KEY` from localStorage, which strangers do not have (the Worker 401s without it). Production admin is a real app behind Cloudflare Access — **do not carry this arrangement over**. It lives under `pages/` in a subdirectory on purpose: every patcher globs `readdirSync(pagesDir)` non-recursively, so the admin never picks up the site nav CSS or the analytics beacon.
7. `mockup/pages/breadcrumb.js` resolves the JSON-LD `item` URLs to absolute at runtime because the mockup and production sit on different origins. In Astro this belongs at **build time** via `Astro.site`, not in a client script — port it, don't copy it.
8. `mockup/build.mjs`, `mockup/responsive.mjs`, `mockup/embed-assets.mjs`, `mockup/patch-*.mjs` — generator/patch scripts for the prototype only. So are `mockup/search-index.mjs` and `mockup/vendor-minisearch.mjs`, which exist because the mockup has no build step; the search behaviour they produce is permanent, the scripts are not. See "Global search" below.
9. `.github/workflows/pages.yml` — publishes `mockup/pages/` to GitHub Pages. Decide explicitly whether to retire it or keep it as a design reference; if it stays, the GitHub Pages URL stays public.
10. Cloudflare Web Analytics is pointed at the **mockup host** (`orenknaan.github.io`), token in `mockup/analytics-config.mjs`, injected by `mockup/patch-analytics.mjs`. Cloudflare has no "clear data" action, so at cutover: delete the Web Analytics site, create a fresh one for `waldorf.co.il`, put the new token in the config and the new site tag in `analytics-worker/wrangler.toml`, re-run the patcher. Pre-launch numbers vanish with the old site — which is the intent.

**Placeholder content that must not ship:**

11. Page titles all end in `— מוקאפ`; the header tagline is `מוקאפ תוכן` on 41 pages.
12. 11 pages carry 30 `<span class="ph">` notes. These are open questions addressed to us and to the client, rendered as visible page text — not copy for readers. They flag genuinely missing information, e.g. `contact.html` has no office address, phone or opening hours (never published on the old site) and three unresolved `קישור` targets. Each one needs an answer, not deletion.
13. The town→region lookup in `mockup/pages/kinder-list.html` is our own guess, flagged in a comment; it needs confirmation from the forum before it drives a real filter.

(The generic Hebrew filler that used to be here — `[שם]`, `תוכן מלא יוכנס כאן` — is gone; it was replaced by real scraped copy. Only the specific gaps in 12–13 remain.)

## Accessibility (WCAG 2.1 AA / ת"י 5568)

This layer is **permanent** — it ports to production, unlike everything in the cutover inventory above.

- `mockup/pages/accessibility.js` — the accessibility widget: a floating button plus a settings panel (text size, line/letter spacing, high contrast, monochrome, link/heading highlighting, readable font, big cursor, stop animations, reading guide). Preferences persist in `localStorage` under `waldorf-a11y-v1`. It also injects the skip-link styles, the `:focus-within` rule that makes the nav dropdowns keyboard-reachable, and the footer link styles.
  Loaded from `<head>` **without `defer`, on purpose**: it applies saved preferences to `<html>` before first paint. Deferring it makes a visitor who chose 160% text watch the page render at 100% first. Don't "optimize" this into a deferred script.
  The panel is styled in `px` with hard-coded colours rather than the site's design tokens, because it has to stay legible while the adjustments it controls are rewriting those tokens and the root font size.
- `mockup/pages/accessibility-statement.html` — הצהרת נגישות. Israeli service-accessibility regulations require it to be reachable from every page (it is, from the footer and from the widget). Two `<span class="ph">` gaps in it need real answers before launch: the accessibility coordinator's name and contact details (mandatory), and the statement date, which should be set when a certified מורשה נגישות signs off.
- `mockup/pages/accessibility.js` also keeps overflowing tables reachable from the keyboard. A `.table-wrap` that scrolls holds nothing focusable, so arrow keys can never reach the columns past its edge (WCAG 2.1.1). It gets `tabindex="0"`, `role="region"` and a label from its section heading, but only while it actually overflows, which a `ResizeObserver` re-checks. Toggling beats a hard-coded `tabindex`: the kindergarten table only scrolls between roughly 561px and 670px, and outside that band a permanent attribute would be a tab stop on nothing. Keep the observer in a variable at module scope, or the browser collects it and the toggling silently stops.
- `mockup/pages/dynamic.js` underlines the links in Leaflet's map attribution. They sit inside a run of plain text and are told apart from it by colour alone, at 2.55:1, under the 3:1 WCAG 1.4.1 wants when colour is the only cue (`link-in-text-block`). Leaflet's stylesheet comes from unpkg, so the override has to live on our side.
- `mockup/pages/tabs.js` — shared tab widget following the WAI-ARIA APG pattern (roles, roving tabindex, arrow/Home/End keys, RTL-aware arrow direction). Replaced a per-page inline click handler that left `role="tablist"` with no `role="tab"` children.
- `mockup/patch-accessibility.mjs` — idempotent patcher wiring the layer into every page (script tag, skip link, `id`/`tabindex` on `<main>`, footer link, `tabindex` on the `<span>` nav triggers). Setting `ENABLED = false` and re-running strips it back out. Re-run it after adding a page.

Verified with axe-core 4.13 at `wcag2a, wcag2aa, wcag21a, wcag21aa` across all 42 content pages at 1280px and 600px, with content settled: **0 violations**, in the default state, with the search panel open on live results, and with every adjustment switched on. When changing markup, re-check rather than assuming — the audit also caught and fixed pre-existing failures (unlabelled contact-form fields, `--tan-dark` at 3.2:1 used as small body text, and the broken tablists).

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

## Scanning for bugs and violations

There is no test suite and no linter in `package.json`, and adding one is not the point: the tools below are run on demand, from a sandbox outside the repo so `package-lock.json` is never touched. Installing a linter into this project is what broke CI once already (see the note in Commands).

    mkdir -p /tmp/scan && cd /tmp/scan && npm init -y
    npm install eslint@9 html-validate@9 axe-core@4

Nine layers, in rough order of how much they find here:

1. **Server-side review by hand.** Every real security finding so far came from reading `content-api/src/index.js`, not from a tool: an authorisation check that had drifted from its own comment, a credential in a migration, a login endpoint with no throttle. Read the auth and the write paths whenever they change.
2. **Dependency CVEs.** `npm audit`. Everything flagged so far is transitive through astro/vite and build-time only.
3. **Secrets.** Grep the tracked files for key/token/password patterns. The repo is public, so anything committed is published, and deleting it later does not unpublish it.
4. **JS static analysis.** ESLint with correctness rules only, no style rules. Roughly 6,000 lines of vanilla JS across `mockup/pages/`, `mockup/*.mjs` and both Workers. It has found nothing but dead variables, which is a useful thing to know.
5. **HTML validity.** `html-validate` over `mockup/pages/*.html`. This is what caught an unclosed `<form>` in the admin and 42 unnamed nav landmarks. Ignore its `doctype-style` rule: the repo is consistently `<!doctype html>`, and HTML5 defines the doctype as case-insensitive.
6. **Link, anchor and asset integrity.** Walk every `href` and `src` in the 43 pages, resolve relative paths on disk, and check that each `#fragment` matches an `id` on the page it points at. Cheap, and it guards the search index's deep links.
7. **Runtime health.** Drive Chrome over CDP across all 43 pages and collect console errors and failed requests. Filter the Cloudflare beacon, which cannot pass CORS from localhost and fails on every page.
8. **Accessibility.** axe-core, covered in its own section above.
9. **Live endpoint probing.** Unauthenticated requests against the deployed API, checking that protected routes 401 and that an arbitrary `Origin` is not reflected.

Two things that decide whether a scan finds anything:

- **Scan at more than one viewport width.** Both violations that sat unfixed on `kinder-list.html` were invisible at 1280px.
- **Let the content settle first.** The pages fill from D1 after load. A scan that races the fetch measures an empty page, and an axe run that races the render reported an open search panel as clean when six of its elements were failing.

Headless Chrome has two traps worth knowing. Changing `Emulation.setDeviceMetricsOverride`, navigating, then changing it again resizes the viewport without dispatching `resize` or `ResizeObserver` at all, so resize behaviour has to be tested one override and one navigation at a time. And with no network, requests to Google Fonts and unpkg hang, so `readyState` never reaches `complete`; wait for `interactive` and carry on.

## Migration requirement (important, don't skip)

Before building the new site, the entire existing site at waldorf.co.il must be scraped/archived for content. When the new site is published, **every URL from the old site must get a permanent redirect** to its equivalent new URL where the path actually changed. Keep this in mind when planning IA/routing for the new site — old paths need a mapping table, not just a blanket redirect to home.

## Repo layout

- `mockup/` — the current mockup: `mockup/pages/*.html` (43 static pages, one per section/topic) is what actually publishes to GitHub Pages (see Deployment above). Generated by `mockup/build.mjs` from `content/pages/*.md`; also has `admin.html`/`admin-dashboard.html`/`admin-app.js` (local-only admin tooling, not published) and `responsive.mjs`/`patch-*.mjs` helper scripts. This is the primary reference for site structure/navigation/copy placeholders right now.
- `docs/PRD-forum-waldorf-site.md` — the authoritative PRD (Hebrew) for the production build: architecture, page inventory, D1 schema, accessibility/security/SEO requirements, external services, open questions. Read this before scoping any real implementation work.
- `docs/` — also contains pricing proposal PDFs/DOCX (historical, for context only).
- `archive/` — older drafts: a previous PRD, an earlier homepage mockup (`awaldorf-homepage.html`), a brand/design-system doc (`aWaldorf_UX_UI_Design_System.md`), and `brand-assets.md`/`global-styles.css`. **These use a different color palette than the current mockup** — treat archive contents as superseded reference material, not source of truth. When in doubt, `mockup/`'s current CSS reflects the current direction.
- `Rav Messer API.txt` — OpenAPI spec for "Responder" (responder.co.il), an Israeli email marketing platform. Relevant to the PRD's still-undecided newsletter tool choice (section 10 of the PRD).

## Working with the mockup

`mockup/build.mjs` generates `mockup/pages/*.html` from `content/pages/*.md` (re-run with `node mockup/build.mjs` after editing the markdown). By default it skips pages that already exist so hand-edits to the generated HTML aren't reverted — **do not run with `FORCE=1`**, that regenerates everything from the markdown template and overwrites any hand-polished pages.

The generic Hebrew filler (`[שם]`, `תוכן מלא יוכנס כאן`) is **gone** — pages now carry real copy scraped from the old site and from the client's documents. What remains is narrower: `<span class="ph">` notes on 10 pages marking information nobody has yet (see "Launch cutover" above, item 11), pending answers from the client (Gilad, per the PRD's open questions in section 3.4).

There is nothing to build, lint, or test yet — open any file under `mockup/pages/` directly in a browser to preview.

## Key open decisions (do not assume resolved)

Per PRD section 3.4, these are unresolved and need client sign-off before being treated as in/out of scope:
1. Whether "תיכונים" (high schools) is a full content tier or out of scope.
2. Whether kindergarten extras (job board, morning circles, annual plans) are in the base scope.
3. Whether "מדיה" (media) is its own top-level page or a subsection.
4. Whether the curriculum page is a class×subject matrix or a flat subject list.

## Language/direction

All content is Hebrew, `dir="rtl"`. When writing new HTML/CSS for this project, keep RTL in mind (the PRD's target architecture calls for CSS logical properties like `margin-inline-start` over `left`/`right` — the current mockup doesn't consistently do this yet since it's a throwaway prototype).
