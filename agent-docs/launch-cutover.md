# Launch cutover

Moved out of the root `CLAUDE.md` (2026-10-28) so it loads only when a task needs it. The root file keeps the rules; this is the detail behind them.

## Launch cutover: temporary scaffolding that must be removed

Everything below exists **only because this is a pre-launch mockup on GitHub Pages**. When the real site moves to Cloudflare Pages and `waldorf.co.il` is attached, each item has to be removed or replaced — not carried over. Inventory verified 2026-07-27; re-check counts before acting, they drift.

> **On the day we migrate to Cloudflare, publish the redirects from `migration/url-map.csv` so nothing 404s.**
>
> The old site has 431 live URLs and every one of them is linked from somewhere we do not control: Google's index, school websites, Facebook posts, printed newsletters. The moment `waldorf.co.il` points at the new site, any path without a redirect is a 404, and a 404 loses both the visitor and the search ranking that URL had built up.
>
> Run `node migration/build-redirects.mjs --write` to generate `public/_redirects` (861 rules), and deploy it **in the same change** that attaches the custom domain. Before running it, do the two things `migration/README.md` lists: point `new_path` at the production routes if they are no longer the mockup's `.html` filenames, and answer the seven `review` rows. Afterwards, add the `www` to apex Redirect Rule on the zone, which `_redirects` cannot do, and decide what happens to `/wp-content/uploads/...`, which is every PDF and image the old site ever linked.
>
> Verify by crawling the CSV's `old_path` column against the live site and asserting every response is a 301 to a 200. A spot check is not enough at this volume.

> **Old-site links are already local (2026-10-23).** No page under `mockup/pages/` links to `waldorf.co.il` any more. The 40 attachments that library items and the newsletter point to live in `mockup/pages/wp-content/uploads/...` (and one in `papers/`) under their **original paths**, so those URLs keep working after the move with no redirect. The five newsletter issues are `nl-p*.html` (`mockup/newsletter-pages.mjs`), and `migration/url-map.csv` points their old URLs at them. After regenerating library pages run `node mockup/patch-old-site-links.mjs` (idempotent; expect `0 file(s) rewritten`). Still open: `/ליווי_יוזמות_2017/` is password-protected on the old site, so it has no body to copy. The admin triage pile (`pages/admin/sorting-data`) still links to old-site files, and `/wp-content/uploads/` has more files than the 40 copied, so the rest of that decision remains.

> **The same day, carry the DNS across: `migration/dns-records.md`.**
>
> The zone is at livedns and so is the mailbox (`MX -> mail.waldorf.co.il`). Moving nameservers to Cloudflare means recreating every record, and Cloudflare's import scan builds its list from public queries, so anything that does not currently resolve is silently not imported. Export the zone file from livedns first and diff it after. Moving DNS does not require moving the mailbox: keep the MX pointing at livedns and mail is unaffected.
>
> That file also holds the four ActiveTrail authentication records (return-path CNAME, two DKIM CNAMEs, DMARC). As of 2026-08-24 **none of them resolve**, which does not block the signup but will put newsletter campaigns in spam folders once they start going out.

**Crawler lockdown — remove all of it together, on cutover day, at the same time the custom domain goes live and the old-URL redirects are published.** Removing any one piece early exposes an unfinished site; leaving any piece in place after launch silently keeps the real site out of Google.

1. `<meta name="robots" content="noindex, nofollow, noarchive">` — in all 50 `mockup/pages/*.html` and in `src/pages/index.astro`.
2. `public/robots.txt` disallowing everything — **not created yet** (pointless on GitHub Pages, see Deployment in the root `CLAUDE.md`; add it when the Cloudflare Pages project exists, then remove at cutover).
3. Cloudflare Access (Zero Trust) wall over `*.pages.dev` — **not set up yet**.

**Mockup-only implementation that the production build replaces:**

4. `mockup/pages/store.js` + `mockup/pages/dynamic.js`: `WStore` now reads the D1 content API at `https://waldorf-content-api.orenknaan.workers.dev/api/content` (Worker and migrations in `content-api/`). `mockup/pages/data.js` is **dead**: it is still on disk but no page loads it, so do not read it and do not treat it as the content source. The only thing still in localStorage is which noticeboard submissions came from this browser (`waldorf-mockup-mine-v1`), which is a per-device fact with no server-side identity.
5. Invented seed records flagged `demo: true`, which render a "רשומת הדגמה" chip. They now live in D1 (seeded from `content-api/migrations/0002_seed.sql`), not in `data.js`. These are not real forum content, so do not migrate them.
6. `mockup/pages/admin/` (`index.html` is the login page, plus `set-password.html`, `admin-dashboard.html`, the views under `admin/js/`, `admin.css`, `admin-analytics.js`) — admin UI against `WStore`. Served from its own origin since 2026-10-29 (`admin-site/`, the Worker `waldorf-admin.orenknaan.workers.dev`), with GitHub Pages carrying only redirects at `/admin/`; it was published with the site from 2026-08-22, which put the session token in the public origin's localStorage. The login page is publicly reachable there. Sign-in is real (corrected 2026-10-28; this item used to call the password box decorative and the data localStorage-only, both long untrue): accounts live in D1's `users` table with roles `super_admin`, `admin` and `editor`, a login mints a session the content API checks on every write, and the Worker's `ADMIN_KEY` secret works as a fallback "management key" entered in the dashboard's settings view. Reads are public; a write without a valid session or key gets 401, so a stranger can open the dashboard but change nothing. The analytics view is the one part reading real data, and it needs `DASH_KEY` from localStorage, which strangers do not have (the Worker 401s without it). Production admin sits behind Cloudflare Access as well — **do not carry a publicly reachable login page over as the only barrier**. It lives under `pages/` in a subdirectory on purpose: every patcher globs `readdirSync(pagesDir)` non-recursively, so the admin never picks up the site nav CSS or the analytics beacon.
   Two things here that production does need to carry over: every admin view has its own address (`admin-dashboard.html#events`, routed by `hashchange` in the dashboard's inline script, with views that render on demand listening for an `adminview` event), and every list the site renders has a freeze toggle that sets status `frozen`: the item is hidden from the site but not deleted, and unfreezing restores its live status. Events, news, both boards and institutions already had a status column; library, teaching, forms, map points, videos and podcast gain one in migration `0015_freeze.sql`, which must be applied to D1 **before** the Worker that filters on it is deployed. Until then those six lists simply show no freeze button. Public pages never send the admin's credentials (`store.js`), so a signed-in editor sees the site exactly as a visitor does.
6a. **Addresses that change on cutover day**, each written once: the public site in `mockup/pages/admin/js/config.js` (`WAdminConfig.site`); the admin's origin in `mockup/pages/store.js` (`ADMIN_ORIGIN`), `content-api/wrangler.toml` (`ADMIN_BASE_URL`), the CORS allowlists of both Workers, `admin-site/static/_headers` (CSP `connect-src`) and the redirect step in `pages.yml`; the content API in `store.js` and `library.js` (an item page does not load `store.js`). Cloudflare Access belongs in front of the admin hostname as well (`admin-site/wrangler.toml` says where).
6b. **Library work pages are shells** (`mockup/library-shells.mjs`): the text is in D1, served by `GET /api/content/library/:id/page` while the work is published, or with a preview pass the admin mints. Production generates published works statically at build time and excludes hidden ones, with a rebuild on change; carry the rule (a hidden work's text is in no public file), not the shell.
7. `mockup/pages/breadcrumb.js` resolves the JSON-LD `item` URLs to absolute at runtime because the mockup and production sit on different origins. In Astro this belongs at **build time** via `Astro.site`, not in a client script — port it, don't copy it.
8. `mockup/build.mjs`, `mockup/responsive.mjs`, `mockup/embed-assets.mjs`, `mockup/patch-*.mjs` — generator/patch scripts for the prototype only. So are `mockup/search-index.mjs` and `mockup/vendor-minisearch.mjs`, which exist because the mockup has no build step; the search behaviour they produce is permanent, the scripts are not. See `agent-docs/global-search.md`.
9. `.github/workflows/pages.yml` — publishes `mockup/pages/` to GitHub Pages. Decide explicitly whether to retire it or keep it as a design reference; if it stays, the GitHub Pages URL stays public.
10. Cloudflare Web Analytics is pointed at the **mockup host** (`orenknaan.github.io`), token in `mockup/analytics-config.mjs`, injected by `mockup/patch-analytics.mjs`. Cloudflare has no "clear data" action, so at cutover: delete the Web Analytics site, create a fresh one for `waldorf.co.il`, put the new token in the config and the new site tag in `analytics-worker/wrangler.toml`, re-run the patcher. Pre-launch numbers vanish with the old site — which is the intent.

11. **`חומר למיון`, the triage section.** Admin-only as of 2026-10-18: seven pages under `mockup/pages/admin/sorting*.html` (one overview plus six groups), a shared widget (`pages/sorting.js`), content items under `pages/admin/sorting-data/`, three generators (`mockup/sorting-content.mjs`, `mockup/sorting-decisions.mjs`, `mockup/sorting-pages.mjs`) and a nav patcher (`mockup/patch-sorting-nav.mjs`, currently `ENABLED = false`, having already stripped the entry from the public nav). It holds every piece of old-site content that has no home on the new site, so the forum can decide item by item what ships, where, and what is retired. See `agent-docs/triage.md`. Remove the whole thing together: the `pages/admin/sorting*` files, the data directory, and the generators.


**Placeholder content that must not ship:**

12. Page titles all end in `— מוקאפ`, and the footer of all 49 content pages reads `גירסה פנימית — הפורום הארצי לחינוך ולדורף`. The `מוקאפ תוכן` header tagline was removed on 2026-08-24; its `.brand-tagline` CSS rule is still in every page's stylesheet, unused.
13. The open questions that used to sit in the pages as visible `<span class="ph">` notes were removed on 2026-10-04 and are listed, with a link to the page each one belongs to and split into forum questions and developer tasks, in `migration/mockup-notes.md`. Each one still needs an answer. Three stand-in labels (`כותרת מאמר`, `תקציר קצר`, `מיקום`) remain in `kinder-articles.html` and `kinder-circle.html`: they hold the place of missing content rather than ask a question.
14. The town→region lookup in `mockup/pages/kinder-list.html` is our own guess, flagged in a comment; it needs confirmation from the forum before it drives a real filter.

(The generic Hebrew filler that used to be here — `[שם]`, `תוכן מלא יוכנס כאן` — is gone; it was replaced by real scraped copy. Only the specific gaps in 12–13 remain.)

## Target architecture (from Deployment)

**Target architecture (per the PRD, section 9 — not yet built):**

- A Cloudflare Pages project, Git-connected (build command `npm run build`, output directory `dist`), so every push to `main` deploys to production and every PR/branch gets an automatic preview URL.
- **Pre-launch lockdown**: until the real domain cuts over, the site must stay off Google/AI crawlers and mostly private:
  - `public/robots.txt` disallows everything.
  - Every page's `<head>` should carry `<meta name="robots" content="noindex, nofollow, noarchive">` (already on all 50 `mockup/pages/*.html` and on `src/pages/index.astro` — add it to any new page you create pre-launch).
  - A Cloudflare Access (Zero Trust) login wall sits in front of the whole `*.pages.dev` deployment as the actual access control (robots/meta are just backup signals — well-behaved crawlers only, not a real barrier on their own).
  - **All three must be removed together at launch cutover**, at the same time the custom domain `waldorf.co.il` is attached to the Pages project and the old-site URL redirects (see below) go live.
- The live site at waldorf.co.il is untouched throughout — the custom domain is only attached to the new Cloudflare Pages project on launch day, not before.
- Setting up the actual Cloudflare Pages project (and deciding what to do with the currently-public GitHub Pages mockup in the meantime) is still an open task.
