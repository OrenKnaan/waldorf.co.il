# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

Redesign project for the Hebrew (RTL) institutional website of "הפורום הארצי לחינוך וולדורף" (National Forum for Waldorf Education in Israel), replacing the existing live site at https://www.waldorf.co.il/.

**Current state**: Astro scaffold is in place (`package.json`, `astro.config.mjs`, `src/pages/`). The former single-file `index.html` mockup was moved as-is into `src/pages/index.astro` (still the vanilla-JS SPA-style page-toggle mockup — see "Working with the mockup page" below) so there'd be something real to deploy immediately. It has not yet been broken up into proper multi-page Astro routes.

**Target production architecture** (per `docs/PRD-forum-waldorf-site.md`): Astro (SSG) for static content pages + React islands for interactive widgets, deployed on Cloudflare Pages, backed by Cloudflare Workers (API), D1 (SQLite), R2 (file storage), and Cloudflare Access (admin auth). Only the Astro/Pages half exists so far — the Workers API, D1 schema, and R2 pieces are not yet scaffolded. Check before referencing specific files/routes from that part of the stack.

## Commands

```bash
npm install      # install dependencies
npm run dev      # local dev server with live reload
npm run build    # build static site to dist/
npm run preview  # serve the dist/ build locally
```

No test suite or linter is configured yet.

## Deployment

- GitHub repo: `OrenKnaan/waldorf.co.il` (public).
- Cloudflare Pages project is Git-connected (build command `npm run build`, output directory `dist`) so every push to `main` deploys to production and every PR/branch gets an automatic preview URL — matches the PRD's CI/CD plan (section 9).
- **Pre-launch lockdown**: until the real domain cuts over, the site must stay off Google/AI crawlers and mostly private:
  - `public/robots.txt` disallows everything.
  - Every page's `<head>` should carry `<meta name="robots" content="noindex, nofollow, noarchive">` (currently only on the homepage in `src/pages/index.astro` — add it to any new page you create pre-launch).
  - A Cloudflare Access (Zero Trust) login wall sits in front of the whole `*.pages.dev` deployment as the actual access control (robots/meta are just backup signals — well-behaved crawlers only, not a real barrier on their own).
  - **All three must be removed together at launch cutover**, at the same time the custom domain `waldorf.co.il` is attached to the Pages project and the old-site URL redirects (see below) go live.
- The live site at waldorf.co.il is untouched throughout — the custom domain is only attached to this new Cloudflare Pages project on launch day, not before.

## Migration requirement (important, don't skip)

Before building the new site, the entire existing site at waldorf.co.il must be scraped/archived for content. When the new site is published, **every URL from the old site must get a permanent redirect** to its equivalent new URL where the path actually changed. Keep this in mind when planning IA/routing for the new site — old paths need a mapping table, not just a blanket redirect to home.

## Repo layout

- `index.html` — the current mockup: single HTML file, inline `<style>` and inline `<script>`, no external dependencies. This is the primary reference for site structure/navigation/copy placeholders right now.
- `docs/PRD-forum-waldorf-site.md` — the authoritative PRD (Hebrew) for the production build: architecture, page inventory, D1 schema, accessibility/security/SEO requirements, external services, open questions. Read this before scoping any real implementation work.
- `docs/` — also contains pricing proposal PDFs/DOCX (historical, for context only).
- `archive/` — older drafts: a previous PRD, an earlier homepage mockup (`awaldorf-homepage.html`), a brand/design-system doc (`aWaldorf_UX_UI_Design_System.md`), and `brand-assets.md`/`global-styles.css`. **These use a different color palette than the current `index.html`** — treat archive contents as superseded reference material, not source of truth. When in doubt, `index.html`'s CSS custom properties (`--cream`, `--tan`, `--brown`, etc.) reflect the current direction.
- `Rav Messer API.txt` — OpenAPI spec for "Responder" (responder.co.il), an Israeli email marketing platform. Relevant to the PRD's still-undecided newsletter tool choice (section 10 of the PRD).

## Working with `index.html`

The mockup is a fake single-page app implemented with vanilla JS:
- All "pages" are `<div id="page-{slug}" class="page">` elements, toggled via `showPage(id)` which shows one and hides the rest (`.page.active`).
- Top nav items map to page slugs via the `navMap` object — if you add a new page, add it there too so nav highlighting works.
- In-page tabs (e.g. news/events tabs) use `switchTab(el, targetContentId)` scoped to the nearest `.section` or `.page` ancestor.
- Styling is entirely custom CSS via `:root` custom properties — no framework (no Tailwind/Bootstrap).
- Content is Hebrew placeholder text (`[שם]`, `תוכן מלא יוכנס כאן`, etc.) — this is intentionally a content-free skeleton pending real copy and approval from the client (Gilad, per the PRD's open questions in section 3.4).

There is nothing to build, lint, or test yet — open `index.html` directly in a browser to preview.

## Key open decisions (do not assume resolved)

Per PRD section 3.4, these are unresolved and need client sign-off before being treated as in/out of scope:
1. Whether "תיכונים" (high schools) is a full content tier or out of scope.
2. Whether kindergarten extras (job board, morning circles, annual plans) are in the base scope.
3. Whether "מדיה" (media) is its own top-level page or a subsection.
4. Whether the curriculum page is a class×subject matrix or a flat subject list.

## Language/direction

All content is Hebrew, `dir="rtl"`. When writing new HTML/CSS for this project, keep RTL in mind (the PRD's target architecture calls for CSS logical properties like `margin-inline-start` over `left`/`right` — the current mockup doesn't consistently do this yet since it's a throwaway prototype).
