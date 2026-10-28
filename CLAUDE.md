# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

Redesign project for the Hebrew (RTL) institutional website of "הפורום הארצי לחינוך וולדורף" (National Forum for Waldorf Education in Israel), replacing the existing live site at https://www.waldorf.co.il/.

**Current state**: Astro scaffold is in place (`package.json`, `astro.config.mjs`, `src/pages/`), but `src/pages/index.astro` is currently just a placeholder ("האתר בבנייה" / site under construction). The real content mockup lives outside Astro entirely, under `mockup/` — see "Working with the mockup" below. Astro has not yet been wired up to the actual site content.

**Target production architecture** (per `docs/PRD-forum-waldorf-site.md`): Astro (SSG) for static content pages + React islands for interactive widgets, deployed on Cloudflare Pages, backed by Cloudflare Workers (API), D1 (SQLite), R2 (file storage), and Cloudflare Access (admin auth). The Workers API and D1 schema now exist for content (`content-api/`, live at `waldorf-content-api.orenknaan.workers.dev`) and for analytics (`analytics-worker/`), but they serve the mockup, not an Astro build: Astro itself is still an empty scaffold, and R2 and Cloudflare Access are not set up. Check before referencing specific files/routes from that part of the stack.

## Commands

Standard Astro CLI scripts (`npm run dev`/`build`/`preview`) — see `package.json` for the exact commands. No test suite or linter is configured yet; see `agent-docs/scanning.md` for what to run on demand instead.

**Verify a dependency change with `npm ci` in an empty directory holding only `package.json` and `package-lock.json`, never with `npm run build`.** The build compiles against whatever `node_modules` already exists and never checks the lock file against `package.json`. `.github/workflows/ci.yml` runs `npm ci` on Linux, and npm resolves optional peer dependencies per platform: installing a package on macOS pruned `@emnapi/core`, which the Linux runner needs, and CI failed on a lock file that had passed a local build. `npm install --package-lock-only` re-prunes it on the same machine, so the repair is to restore the last passing lock file and add only the new package's two blocks to it.

## Deployment

**Commit and push finished work to `main` without being asked.** Do not stage changes and wait for a go-ahead, and do not branch first. Pushing to `main` publishes `mockup/pages/` to the public GitHub Pages URL via `.github/workflows/pages.yml`, and that is the intended outcome: the site is an unlaunched mockup with no real users, so a bad push costs a follow-up commit and nothing else. Finish the verification the change calls for (see `agent-docs/scanning.md`), then commit and push.

**Current actual state (verified 2026-07-26):**

- GitHub repo: `OrenKnaan/waldorf.co.il` (public).
- There is **no Cloudflare Pages project connected** — confirmed via `gh api repos/OrenKnaan/waldorf.co.il/hooks` returning `[]` (a Git-connected Pages project registers a webhook here) and no `wrangler.toml`/`_redirects`/`_headers` anywhere in the repo. Do not assume a `*.pages.dev` deployment exists.
- What actually deploys: `.github/workflows/pages.yml` publishes the static content of `mockup/pages/` to **GitHub Pages** on every push to `main`, live (publicly, no login wall) at `https://orenknaan.github.io/waldorf.co.il/`. `.github/workflows/ci.yml` just runs `npm run build` as a check — it does not deploy anything.
- Because of this, **most of the pre-launch lockdown (see `agent-docs/launch-cutover.md`) is not actually in effect** — the GitHub Pages URL is public with no Cloudflare Access wall. As of 2026-07-27 every page under `mockup/pages/` does carry `<meta name="robots" content="noindex, nofollow, noarchive">`, which is the only lever GitHub Pages gives us: `robots.txt` is read only from the origin root (`orenknaan.github.io/robots.txt`, which belongs to the whole account, not this project), and GitHub Pages can't set an `X-Robots-Tag` header. So the mockup is "shouldn't be indexed" but still fully public to anyone with the URL. Treat the access wall as an open item, not a solved one.

**Target architecture and the pre-launch lockdown** (Cloudflare Pages, Access wall, `robots.txt`) are not built yet; the plan is in `agent-docs/launch-cutover.md`.

## Rules that live in the topic files

Detail for each area is in `agent-docs/`. **Read the matching file before working in that area**; the rules below are the ones that must hold even when you have not.

**Launch cutover** (`agent-docs/launch-cutover.md`, the full inventory of temporary scaffolding)
- Every page under `mockup/pages/` carries `<meta name="robots" content="noindex, nofollow, noarchive">`; add it to any new page. The crawler lockdown (that meta, a future `public/robots.txt`, a future Cloudflare Access wall) is removed **all together, on cutover day**, never piecemeal.
- The same change that attaches `waldorf.co.il` must publish the old-URL redirects (`node migration/build-redirects.mjs --write`) and carry the DNS across (`migration/dns-records.md`).
- Mockup-only pieces (the `store.js`/`dynamic.js` content layer, `demo: true` seed rows, the published `/admin/`, the triage section, the patch scripts, `— מוקאפ` titles) are not carried into production; the file lists what replaces each.

**Accessibility** (`agent-docs/accessibility.md`, permanent, ports to production)
- `accessibility.js` loads from `<head>` **without `defer`**, on purpose: it applies saved preferences before first paint.
- Any `ResizeObserver` that toggles table `tabindex` lives in a module-scope variable, or the browser collects it and the toggling stops.
- A clean axe run does not mean contrast is clean (gradients, images, `color-mix()`, `:hover` states are invisible to it). Read the file before changing any colour, and scan at more than one viewport width with content settled.
- Re-running a `patch-*.mjs` must report `0 file(s) rewritten`; an edit that appends to its own anchor needs a separate `done` marker.

**Global search** (`agent-docs/global-search.md`): after adding a page run `mockup/patch-search.mjs`, then `mockup/search-index.mjs`, in that order. Any `<a>` styled as a solid button must restate its colour on `:hover`, or the page-wide `a:hover` paints its text the colour of its background.

**Newsletter** (`agent-docs/newsletter.md`): the browser never calls ActiveTrail directly; the token is a Worker secret (`npx wrangler secret put ACTIVETRAIL_TOKEN`), never a file; never pass ActiveTrail's error body to the browser.

**E-books** (`agent-docs/ebooks.md`) and **the triage section** (`agent-docs/triage.md`, admin-only, and it must be sorted before the domain moves because its files still load from the old site).

**Hero images and page hero layout** (`agent-docs/hero.md`): a new page is cloned from a finished one, never generated.

**Scanning for bugs** (`agent-docs/scanning.md`): run tools from a sandbox outside the repo; never install a linter or test tool into this project's `package.json`, which broke CI once already.

## Migration requirement (important, don't skip)

Before building the new site, the entire existing site at waldorf.co.il must be scraped/archived for content. When the new site is published, **every URL from the old site must get a permanent redirect** to its equivalent new URL where the path actually changed. Keep this in mind when planning IA/routing for the new site — old paths need a mapping table, not just a blanket redirect to home.

**The mapping table now exists**: `migration/url-map.csv`, covering all 427 URLs in the old site's sitemap plus four category pages missing from it. `migration/README.md` documents where the inventory came from (the old site is WordPress and publishes `wp-sitemap.xml` and an open REST API), what the `status` column means, the seven rows that still need the forum's answer, and the one large open question the table exposes: 169 of the 431 URLs point at `news.html` and 52 at `curriculum-capstone.html`, because the old site's two biggest categories are מודעות ופרסומים (155 posts) and עבודות גמר (51), and the new site has no per-article page.

`node migration/build-redirects.mjs --write` turns the CSV into `public/_redirects` (861 rules, each path with and without its trailing slash). Two caveats worth knowing before relying on it: the `new_path` column holds the **mockup's filenames**, so it needs one pass if production moves to clean routes; and `/wp-content/uploads/...`, which is every PDF and image the old site ever linked, is deliberately not covered, because keeping those alive means copying the files to R2 first.

## Adding a page to the mockup

`mockup/pages/associations.html` (עמותות מפעילות) is the worked example. Two things about it are worth copying.

**Clone a finished page, do not generate one.** It was built by taking `school-list.html`, swapping the `<title>`, the breadcrumb JSON-LD, the page-overrides CSS block and everything between `<main>` and `</main>`, and dropping the source page's own inline scripts. A clone inherits the skip link, `accessibility.js` (undeferred, in `<head>`), `search.js`, the breadcrumb and scroll-top scripts, the analytics beacon, the responsive block, the `noindex` meta and the nav verbatim, so the only patchers left to run are `patch-search.mjs` (for the `id="sec-…"` anchors) and then `search-index.mjs`.

**`node mockup/patch-accessibility.mjs` currently crashes**, on `home-hero-light.html`: that file is a fragment with no `<body>`, and the patcher throws rather than skipping it, the way it already skips `index.html`. It crashes partway through, so it leaves the pages it had already reached rewritten and the rest untouched. Do not run it to "wire up" a new page until that is fixed; clone instead, and check the clone against its source with a grep for each of the tags listed above. Note also that the patcher wants to move `accessibility.js` after `search.js` on all 50 pages, which suggests it has not been run since search was added.

Nav entries are patched in, never regenerated, for the reason `patch-sorting-nav.mjs` documents. `patch-associations-nav.mjs` is the smaller example: it adds one `dropdown-link` and teaches the inline nav script's group regex about the new filename, so the parent tab lights up. Both are reversible with `ENABLED = false`.

## Working with the mockup

`mockup/build.mjs` generates `mockup/pages/*.html` from `content/pages/*.md` (re-run with `node mockup/build.mjs` after editing the markdown). By default it skips pages that already exist so hand-edits to the generated HTML aren't reverted — **do not run with `FORCE=1`**, that regenerates everything from the markdown template and overwrites any hand-polished pages.

There is nothing to build, lint, or test yet — open any file under `mockup/pages/` directly in a browser to preview.

## Repo layout notes

`archive/` holds superseded drafts that use a **different colour palette** than the current mockup; when in doubt, `mockup/`'s current CSS reflects the current direction. `docs/PRD-forum-waldorf-site.md` is the authoritative PRD for the production build (and `docs/` is gitignored).

## Key open decisions (do not assume resolved)

Per PRD section 3.4, these are unresolved and need client sign-off before being treated as in/out of scope:
1. Whether "תיכונים" (high schools) is a full content tier or out of scope.
2. Whether kindergarten extras (job board, morning circles, annual plans) are in the base scope.
3. Whether "מדיה" (media) is its own top-level page or a subsection.
4. Whether the curriculum page is a class×subject matrix or a flat subject list.

## Language/direction

All content is Hebrew, `dir="rtl"`. When writing new HTML/CSS for this project, keep RTL in mind (the PRD's target architecture calls for CSS logical properties like `margin-inline-start` over `left`/`right` — the current mockup doesn't consistently do this yet since it's a throwaway prototype).
