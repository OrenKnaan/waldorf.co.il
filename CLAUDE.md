# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

Redesign project for the Hebrew (RTL) institutional website of "הפורום הארצי לחינוך וולדורף" (National Forum for Waldorf Education in Israel), replacing the existing live site at https://www.waldorf.co.il/.

**Current state**: Astro scaffold is in place (`package.json`, `astro.config.mjs`, `src/pages/`), but `src/pages/index.astro` is currently just a placeholder ("האתר בבנייה" / site under construction). The real content mockup lives outside Astro entirely, under `mockup/` — see "Working with the mockup" below. Astro has not yet been wired up to the actual site content.

**Target production architecture** (per `docs/PRD-forum-waldorf-site.md`): Astro (SSG) for static content pages + React islands for interactive widgets, deployed on Cloudflare Pages, backed by Cloudflare Workers (API), D1 (SQLite), R2 (file storage), and Cloudflare Access (admin auth). Only the Astro/Pages half exists so far — the Workers API, D1 schema, and R2 pieces are not yet scaffolded. Check before referencing specific files/routes from that part of the stack.

## Commands

Standard Astro CLI scripts (`npm run dev`/`build`/`preview`) — see `package.json` for the exact commands. No test suite or linter is configured yet.

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

4. `mockup/pages/data.js` + `mockup/pages/dynamic.js` — the client-side stand-in for the Workers/D1 API: seed content plus a localStorage overlay (`WStore`, keys `waldorf-mockup-cms-v1` and `waldorf-mockup-mine-v1`). Real content lives in D1; the localStorage layer has no production equivalent.
5. 22 invented seed records flagged `demo: true` in `data.js`, which render a "רשומת הדגמה" chip. These are not real forum content — do not migrate them.
6. `mockup/admin.html`, `mockup/admin-dashboard.html`, `mockup/admin-app.js` — local-only admin UI against `WStore`. Production admin is a real app behind Cloudflare Access.
7. `mockup/pages/breadcrumb.js` resolves the JSON-LD `item` URLs to absolute at runtime because the mockup and production sit on different origins. In Astro this belongs at **build time** via `Astro.site`, not in a client script — port it, don't copy it.
8. `mockup/build.mjs`, `mockup/responsive.mjs`, `mockup/embed-assets.mjs`, `mockup/patch-*.mjs` — generator/patch scripts for the prototype only.
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
- `mockup/pages/tabs.js` — shared tab widget following the WAI-ARIA APG pattern (roles, roving tabindex, arrow/Home/End keys, RTL-aware arrow direction). Replaced a per-page inline click handler that left `role="tablist"` with no `role="tab"` children.
- `mockup/patch-accessibility.mjs` — idempotent patcher wiring the layer into every page (script tag, skip link, `id`/`tabindex` on `<main>`, footer link, `tabindex` on the `<span>` nav triggers). Setting `ENABLED = false` and re-running strips it back out. Re-run it after adding a page.

Verified with axe-core 4.13 at `wcag2a, wcag2aa, wcag21a, wcag21aa` across all 42 content pages: **0 violations**, both in the default state and with every adjustment switched on. When changing markup, re-check rather than assuming — the audit also caught and fixed pre-existing failures (unlabelled contact-form fields, `--tan-dark` at 3.2:1 used as small body text, and the broken tablists).

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
