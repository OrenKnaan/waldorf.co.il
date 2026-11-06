# Launch checklist: from mockup to waldorf.co.il

Written 2026-11-05 from the repo and from live checks run that day (DNS, the old site's
sitemap and headers, Worker secrets). `agent-docs/launch-cutover.md` is the inventory of
temporary scaffolding; this file is the order of work. Items are tagged with who acts:
**[forum]**, **[Oren]** (accounts, dashboards, registrar), **[code]** (a repo change).

Each item has an id (A1, B4…) so it can be referred to. Tick it when done and verified.

## What the live checks found (2026-11-05)

- The old site's canonical host is **`https://www.waldorf.co.il/`**: the homepage carries
  `<link rel="canonical" href="https://www.waldorf.co.il/">` and `https://waldorf.co.il/`
  answers 301 to `www`. Google has indexed the `www` URLs.
- DNS at livedns: `A` for the apex, `www` and `mail` all point to **62.219.78.151**, the
  same shared-hosting server that runs WordPress. `MX 0 mail.waldorf.co.il`. No TXT records
  at all (no SPF, no DMARC, none of the ActiveTrail or Resend records), no CAA, and **no DS
  record, so DNSSEC is off** and changing nameservers needs no DNSSEC step.
- The old sitemap now lists 63 pages, 334 posts, 27 categories, 5 program categories and
  1 calendar entry. **Three posts published since the inventory are missing from
  `migration/url-map.csv`**: ids 3248 (`אסופה-לחגי-תשרי`), 3251 and 3254 (newest dated
  2026-10-24).
- `waldorf-co-il-backup-2026-07-26.zip` in the repo root is **not** a backup of the old
  site. It holds 194 files of this repository. No WordPress backup (files and database)
  exists here.
- Cloudflare static assets, with the default `html_handling`, answer `/file.html` with a
  **307** to `/file`. Every `new_path` in the URL map and every internal link ends in
  `.html`, so with the default setting each redirect would become 301 then 307, and every
  internal click would cost a temporary redirect.
- `mockup/pages/index.html` is a meta refresh to `home.html`, so the most valuable URL on
  the site, `/`, has no content of its own.
- The contact form (`contact.html`) and the work-group form (`forum-workgroups.html`) are
  `onsubmit="return false"`: **they send nothing**.
- SEO tags across the 158 pages: canonical on 1 (`index.html`, relative), meta description
  on 0, Open Graph on 0, no `sitemap.xml`, no 404 page, no privacy policy page.
- `mockup/pages/robots.txt` says `Disallow: /`. GitHub Pages ignores it because it is not
  at the origin root. **On waldorf.co.il it will be at the root and will block all of Google.**
- Worker secrets: `content-api` has `ACTIVETRAIL_TOKEN` and `ADMIN_KEY`, but **no
  `RESEND_API_KEY`**, so invitation, password-reset and rejection mails are not sent.
- WordPress also answers `/?p=<id>` URLs, and the old pages advertise `wp.me` shortlinks
  (`wp.me/6Dn2d`) that resolve to them. `_redirects` cannot match a query string, so on the
  new site those would all land on the homepage with a 200.

## A. Decisions, before any build work

- [ ] **A00 [forum] Hosting ends about 2026-11-12, not extended (Oren, 2026-11-06)** (Oren, 2026-11-05: "in a week"). Extend it
  by a month: the old site, the mail server and the only full backup are all on it (E6).
- [ ] **A0 [Oren] Renew the domain.** ISOC's whois shows `validity: 13-11-2026` (checked
  2026-11-05). If it lapses, the site and the mail both stop.

- [x] **A1 [Oren] Canonical host: keep `www`.** Decided 2026-11-05. Recommendation: keep `https://www.waldorf.co.il`
  as canonical and redirect the apex to it, which is what the old site does. Switching to
  the apex would change the host of every indexed URL on top of the path changes.
  (The older docs said "www to apex"; corrected to follow this item.)
- [x] **A2 [Oren] URL form.** Decided 2026-11-05: (a), keep `.html`, `html_handling = "none"`. Either (a) keep the `.html` URLs and set
  `html_handling = "none"` on the site Worker, which needs no change to any page, or
  (b) move to clean URLs, which means rewriting `new_path`, every internal link, the links
  built in `store.js`/`dynamic.js`/`library.js` and the search index. Recommendation: (a).
  Whichever is chosen is permanent: changing it later is a second migration for Google.
- [x] **A3 [Oren] Homepage at `/`.** Serve the home page content as `index.html`, 301 **Done 2026-11-06: `site/build.mjs` serves `home.html` as `index.html`, rewrites every `./home.html` link to `./`; the Worker 301s `/home.html` and `/index.html` to `/`.**
  `/home.html` to `/`, and point internal links to `./` instead of `home.html`.
- [x] **A4 [Oren] Hosting.** Recommendation: a Workers static-assets project, the same kind **Decided and built 2026-11-06: the Worker `waldorf-site` (`site/`), static assets with `html_handling = "none"`, `not_found_handling = "404-page"`, and a script that runs first.**
  as `waldorf-admin`. It supports `_redirects`, `_headers`, a 404 page and a configurable
  `html_handling` (Pages cannot turn off the `.html` redirect). Either way the apex needs the
  zone on Cloudflare, so the nameservers move (C4).
- [ ] **A5 [Oren] GitHub Pages after launch.** Recommendation: switch it off, so there is no
  second public copy of the site. The daily search-index rebuild, the `_*.html` drop and the
  admin-redirect step in `pages.yml` move into the new deploy (B9).
- [x] **A6 [forum + Oren] `/wp-content/uploads/`.** Recommendation: copy the whole uploads **Done 2026-11-06: `migration/mirror-uploads.mjs` copied all 430 files (215 MiB) from the media library; they are in the R2 bucket `waldorf-uploads` and the Worker serves them at their original paths. Posts and pages link no other uploads. Files put on the server outside WordPress are not covered (B1 still needed for those).**
  directory out of the WordPress backup (B1) and serve it at its original paths. That keeps
  every PDF and image link from Google, Facebook and school sites alive with no redirect,
  and covers the 205 triage files. Static assets cap a single file at 25 MiB, so anything
  larger goes to R2.
- [ ] **A7 [forum] The seven `review` rows** in `migration/url-map.csv` (`migration/README.md`).
- [ ] **A8 [forum] The 206 articles** (155 announcements, 51 capstone works): migrate into D1
  or retire. Affects their redirect targets, not whether they get one.
- [ ] **A9 [forum + Oren] Contact and work-group forms.** Decided 2026-11-05: fixed after launch, so they ship not sending. Build a sending endpoint (B8), or
  replace the forms with the email address. Shipping forms that discard what people type is
  the one option that should not reach launch.
- [ ] **A10 [forum] Which inbox receives mail**, and whether any `@waldorf.co.il` mailbox is
  in real use. Oren, 2026-11-05: yes, in use. `info@waldorf.co.il` is published on the old
  site and on the new one (`forum.html`, `forum-sidebar.html`, the error messages in
  `newsletter.js`), while `contact.html` shows `haforumwaldorf@gmail.com`. The mailbox list
  is in cPanel (`https://www.waldorf.co.il:2083`, Email Accounts and Forwarders), not in the
  livedns panel. The site publishes `haforumwaldorf@gmail.com`. This decides whether the livedns
  hosting can ever be cancelled (E6).
- [ ] **A11 [forum] Privacy policy page.** The site collects names, emails and phone numbers
  (newsletter, noticeboard submissions, the forms). A privacy page is likely required under
  the Privacy Protection Law; the wording is the forum's (or their lawyer's).
- [ ] **A12 [forum] Accessibility statement**: postal address, the exemption from appointing a
  coordinator, and the audit by a certified auditor (`migration/mockup-notes.md`, forum item 2
  and developer item 1).
- [ ] **A13 [forum] The open content questions** in `migration/mockup-notes.md` (18 forum items)
  and the triage section (`agent-docs/triage.md`), which must be sorted before C4 because its
  files load from the old server.

## B. Preparation (no public effect, can start now)

### Old site
- [ ] **B1 [Oren] Full WordPress backup from livedns**: files (including all of
  `wp-content/uploads`) and a database export. Store it outside the repo.
- [x] **B2 [forum + code] Content freeze** on the old WordPress from an agreed date, then **Rows added 2026-11-06 for 3248, 3251, 3254 (the sitemap had no others). The freeze itself is the forum's: anything posted on WordPress from now on is not on the new site.**
  re-pull the sitemap and add the missing rows (3248, 3251, 3254 and anything newer) to
  `url-map.csv`.

### DNS and mail authentication
- [x] **B3 [Oren] Export the zone file from livedns** and keep it. Done 2026-11-05, in `migration/dns-records.md`; it adds `teach.waldorf.co.il`. Compare against the list
  above: apex, `www`, `mail` A records, the MX, and anything not publicly visible.
- [x] **B4 [Oren] Create the Cloudflare zone** Done 2026-11-05; nameservers `karina` and
  `terin.ns.cloudflare.com`, accepted by the registry the same day (that is C4, done early). (free plan), let it import, diff against B3.
  `mail` and the MX stay **DNS only (grey cloud)**, pointing at 62.219.78.151. Do not change
  nameservers yet.
  **2026-11-06:** Oren cannot download it and has asked livedns; the hosting will **not** be
  extended. Stopgap: everything the public REST API gives (334 posts, 62 pages, 278 media
  records, 26 comments, 31 categories) is in `migration/wp-export/` (gitignored) and in R2 at
  `waldorf-uploads/wp-export/wp-export-2026-11-06.zip`, which the site Worker never serves.
  Not in it: the database, user accounts, drafts, and the Jetpack contact-form entries
  (post type `feedback`), which need a login.
- [ ] **B5 [Oren] Lower TTLs to 300 seconds** at livedns a day before C4, so a rollback (F1)
  takes effect in minutes.
- [ ] **B6 [Oren] Mail authentication records**, in the Cloudflare zone (and at livedns if they
  are wanted before the move):
  - B6.i ActiveTrail: the four records in `migration/dns-records.md`.
  - B6.ii Resend: the DKIM and `send.` MX/SPF records Resend shows when the domain is added.
  - B6.iii Apex SPF for the livedns mailbox: ask livedns for their include, e.g.
    `v=spf1 a mx include:<livedns> ~all`. Only one SPF record per name.
  - B6.iv DMARC: `v=DMARC1; p=none; rua=mailto:<forum inbox>` so reports arrive.
- [ ] **B7 [Oren] Resend**: account, add and verify `waldorf.co.il`,
  `npx wrangler secret put RESEND_API_KEY` in `content-api/`, add `MAIL_FROM` and `REPLY_TO`
  under `[vars]`, deploy.

### Code
- [ ] **B8 [code] Contact and work-group endpoint** (if A9 says build): `POST` on the content API,
  sending through Resend to the A10 inbox with `Reply-To` set to the visitor. Reuse the
  newsletter's honeypot, validation and the `rate_limits` table; never pass the provider's
  error body to the browser.
- [x] **B9 [code] Production deploy**: a `wrangler.toml` and a workflow for the site Worker. **Done 2026-11-06, by hand (`node site/build.mjs && cd site && npx wrangler@4 deploy`), not a workflow: a workflow needs a Cloudflare API token as a GitHub secret (Oren). The daily search-index rebuild still runs only in `pages.yml`.**
  It copies `mockup/pages/` without `_*.html`, replaces `admin/` with redirect stubs (or drops
  it), drops the triage data, rebuilds `search-index.json` from D1, and sets `html_handling`
  (A2) and `not_found_handling = "404-page"`. Keep the daily schedule.
- [x] **B10 [code] `404.html`**, cloned from a finished page (`agent-docs/hero.md`), with search **Done 2026-11-06: `mockup/pages/404.html`, cloned from `accessibility-statement.html`; the build makes its references absolute so it works at any depth.**
  and links to the main sections.
- [x] **B11 [code] `sitemap.xml` generator**: every public page plus the **published** `lib-*` **Done 2026-11-06, rebuilt on every `site/build.mjs` run (155 URLs), not daily.**
  works, absolute URLs on the A1 host, rebuilt on each deploy and daily with the search index.
- [x] **B12 [code] Production `robots.txt`**: `Allow: /` plus `Sitemap: https://www.waldorf.co.il/sitemap.xml`, **Done 2026-11-06: `site/static/robots.txt`.**
  replacing the `Disallow: /` file at C2.
- [x] **B13 [code] Absolute `<link rel="canonical">` on every page**, on the A1 host. **Done 2026-11-06, in the build.**
- [x] **B14 [code] Meta description and Open Graph tags** (`og:title`, `og:description`, **Done 2026-11-06 on every page, in the build: description from the page's first paragraph (library works: their own), one shared 1200x630 image `site/static/img/og-default.jpg`. Per-section images are still open.**
  `og:image`, `og:url`) at least on the main section pages. Facebook is a large referrer
  for this site, and today a shared link shows no image or summary.
- [ ] **B15 [code] Library work pages**: the text of each `lib-*` page loads from D1 by script.
  Google renders scripts, but later and less reliably than plain HTML. Recommendation:
  write published works into the HTML at deploy time (as `launch-cutover.md` 6b already
  plans), or at least check a few with URL Inspection after launch (E3).
- [x] **B16 [code] `/?p=<id>` redirects**: one Cloudflare redirect rule or a few lines in a **Done 2026-11-06: `migration/build-post-ids.mjs` -> `site/post-ids.json` (396 ids), read by the Worker.**
  Worker mapping post ids (all known from the REST API) to their `new_path`. Optional but
  cheap, and it rescues every `wp.me` link shared on Facebook.
- [x] **B17 [code] `_headers`** for the site: long cache on fonts and images, short on HTML. **Done 2026-11-06: `site/static/_headers`.**
- [ ] **B18 [code] Addresses that change** (`launch-cutover.md` 6a): `WAdminConfig.site`,
  `ADMIN_ORIGIN`, `ADMIN_BASE_URL`, both CORS lists (both already allow `waldorf.co.il` and
  `www`), the admin CSP and the admin redirect step.
- [ ] **B19 [Oren] Cloudflare Access on the admin** hostname (`admin-site/wrangler.toml`).
  Optional: an `admin.waldorf.co.il` custom domain, which adds a pass over B18.
- [x] **B20 [code] Placeholder removal, prepared as a script ready for C2**: **Done 2026-11-06, in the build rather than a script (the mockup keeps its markers): titles, footer, the stand-in labels. Demo rows: hidden from visitors by `HIDE_DEMO = "1"` in `content-api`, not deleted, so the admin can delete or replace them.**
  the `מוקאפ` suffix in 157 titles, the `גירסה פנימית` footer on 156 pages, the stand-in labels in
  `kinder-articles.html` and `kinder-circle.html`, and the `demo: true` rows in D1.
- [ ] **B21 [Oren] Web Analytics**: create the `waldorf.co.il` site now so the token is ready
  for C9 (`launch-cutover.md` item 10).
- [ ] **B22 [Oren] Search Console access**: find out who owns the existing property for
  `waldorf.co.il`. If nobody can be found, verify a **Domain property** by DNS TXT. A newly
  verified property still shows the history Google holds for the site.
- [x] **B23 [code] Rehearsal on the Worker's `workers.dev` URL**, with `noindex` still on: run **Done 2026-11-06 on `https://waldorf-site.orenknaan.workers.dev`: 906 of 906 old addresses (plus 40 lowercase-encoded variants) give one 301 to a 200, 98 of 98 internal targets answer 200, key pages without script errors at 1440 and 390 px.**
  the full redirect crawl (every `old_path` gives one 301 to a 200), the internal-link crawl,
  and the scans in `agent-docs/scanning.md`. Fix everything here, before the domain moves.

## C. Cutover day, in this order

- [ ] **C1** Confirm the old site is frozen and B2's rows are complete; regenerate
  `public/_redirects` (`node migration/build-redirects.mjs --write`) into the deploy.
- [x] **C2 [code]** In one commit: remove the `noindex` meta from all pages (and **Done 2026-11-06, in the build: the mockup keeps `noindex` for the GitHub Pages preview, the deployed copy has none.**
  `src/pages/index.astro`), replace `robots.txt` (B12), apply B20, add the redirects. Deploy
  to the Worker (still only on `workers.dev`) and re-run the B23 crawl.
- [ ] **C3 [Oren]** Mail check before the switch: send and receive one message on each
  `@waldorf.co.il` mailbox in use, as a baseline.
- [x] **C4 [Oren]** Change the nameservers at the registrar to Cloudflare's pair. The imported
  A records still point at 62.219.78.151, so the old site keeps serving while the change
  spreads. Wait for the zone to show Active.
- [x] **C5 [Oren]** Done 2026-11-06, the other way round: both hostnames were attached as
  custom domains of the empty Pages project `waldorf-co-il`, so the site answered 404. The
  Worker now sits in front through zone routes (`site/wrangler.toml`), and the Pages
  project's two domains must stay until they are replaced by custom domains on the Worker
  (needs DNS edit rights).
- [x] **C6 [Oren]** Redirect rule apex to `www` (path and query kept), and turn on **Done 2026-11-06 in the Worker instead of a zone rule (the session token cannot edit zone rules): apex and http 301 to `https://www.waldorf.co.il`, path and query kept.**
  Always Use HTTPS.
- [x] **C7 [code]** Done 2026-11-06: 434 old paths, 1,264 checks, all one 301 to a 200 on
  `www`; PDF from R2 200; sitemap 155 URLs on `www`. Live redirect crawl against `https://www.waldorf.co.il` and the apex:
  every `old_path` gives one 301 to a 200 on `www`. Internal-link crawl: no 404s and no
  redirects. Spot-check `/wp-content/uploads/...` (A6) and `/?p=` (B16).
- [ ] **C8 [Oren]** Mail check after the switch: repeat C3, and confirm the MX resolves to
  `mail.waldorf.co.il` from a public resolver.
- [ ] **C9 [code]** New Web Analytics token and site tag (B21), re-run `patch-analytics.mjs`.
- [ ] **C10 [code]** Deploy `content-api` and the admin with the B18 addresses.
- [ ] **C11 [Oren]** Switch off GitHub Pages (A5).

## D. Email tests (after C8; check inbox **and** spam, and read the headers)

For each mail below, open it in Gmail and use "Show original" to confirm SPF, DKIM and
DMARC all say PASS.

- [ ] **D1** Newsletter: sign up on `forum-newsletter.html` with a real address, receive
  ActiveTrail's confirmation, click it, and see the contact in group 715085.
- [ ] **D2** An ActiveTrail test campaign to Gmail, Outlook and one Israeli provider, sent
  from a `waldorf.co.il` address. Check its score on a tester such as mail-tester.com.
- [ ] **D3** Admin invitation: create a user, receive the set-password mail through Resend,
  and confirm the link opens the admin's origin and works only once.
- [ ] **D4** Password reset request.
- [ ] **D5** A noticeboard rejection notice reaches the submitter, and replying to it reaches
  the forum inbox (`REPLY_TO`).
- [ ] **D6** Contact form and work-group form (B8) reach the forum inbox; replying reaches
  the visitor.
- [ ] **D7** After two to four weeks of clean DMARC reports, raise `p=none` to `p=quarantine`.

## E. Search Console and the weeks after

- [ ] **E1** Submit `https://www.waldorf.co.il/sitemap.xml`. Also submit a sitemap of the
  **old** URLs (generated from `url-map.csv`) for the first weeks: it makes Google recrawl
  the old URLs sooner and see the 301s, which Google's own site-move guide recommends.
- [ ] **E2** Do **not** use the Change of Address tool. It is for moving to a different domain;
  this move keeps the domain.
- [ ] **E3** URL Inspection on the homepage, the main section pages and two or three `lib-*`
  works (B15): check the rendered HTML contains the text, then Request Indexing.
- [ ] **E4** Weekly for six weeks: the Worker's daily request count (`run_worker_first` makes
  every file, not only every page, a Worker request: about 9 per page view against the free
  plan's 100,000 a day), and the Pages report (Not found, Page with redirect, Duplicate
  without user-selected canonical) and the Worker's 404 paths. Add a redirect for any 404
  that had traffic.
- [ ] **E5** Keep the redirects permanently. They cost nothing; Google asks for at least a year.
- [ ] **E6 [forum + Oren] Cancel the livedns hosting only after all of these**: the new site has
  been live for two weeks without a rollback (F1); the full WordPress backup and the uploads
  are downloaded (B1, A6); and the mail on `mail.waldorf.co.il`, which runs on the same server,
  is either unused or moved (A10). The forum said on 2026-11-05 it will stop paying for the
  hosting. **The domain registration is a separate payment and must continue**: Cloudflare's
  registrar does not sell `.il`, so the domain stays with an ISOC-accredited registrar.
- [ ] **E7** Bing Webmaster Tools: import the property from Search Console.
- [ ] **E8** Update the links the forum controls (Facebook page, YouTube, ActiveTrail
  templates, Google business profile) to the new URLs. They redirect anyway, so this is low
  priority.
- [ ] **E9** Update the accessibility statement's date after the audit (A12).

## F. Rollback

- [ ] **F1** If C7 fails badly: detach the custom domains and set the apex and `www` A records
  back to 62.219.78.151 (DNS only). With B5's TTLs the old WordPress is back within minutes,
  as long as the hosting account (E6) and the content freeze (B2) are still in place.
