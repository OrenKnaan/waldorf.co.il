# waldorf-analytics

Read-only bridge between Cloudflare Web Analytics and the admin dashboard
(`mockup/admin-dashboard.html` → "ניתוח תנועה").

## Why a Worker at all

The dashboard cannot call `api.cloudflare.com` from the browser:

* the GraphQL endpoint returns **no** `Access-Control-Allow-Origin` header and
  answers the CORS preflight with `400`, so the request never leaves the page;
* reading the data needs a Cloudflare API token, and anything the browser holds
  is readable by anyone who opens the page.

So the token lives here as a Worker secret. The Worker builds one fixed query
from a whitelisted `days` value and returns aggregated JSON — it never forwards
a caller-supplied query, so it cannot be used as a general Cloudflare API proxy.

## Setup

1. **Create the Web Analytics site** (Cloudflare dashboard → Analytics & Logs →
   Web Analytics → Add a site → hostname `orenknaan.github.io`, manual install).
   Copy the **site token** (public, goes in the page) and the **site tag** (the
   identifier the API reports on).

2. **Beacon** — put the site token in `mockup/analytics-config.mjs`, then:

   ```
   node mockup/patch-analytics.mjs
   ```

3. **Worker config** — put the site tag in `wrangler.toml` under `CF_SITE_TAG`.

4. **Secrets**:

   ```
   npx wrangler secret put CF_API_TOKEN   # Account Analytics: Read
   npx wrangler secret put DASH_KEY       # any random string; required, the Worker 503s without it
   npx wrangler deploy
   ```

5. **Dashboard** — open the admin, go to "ניתוח תנועה", paste the Worker URL and
   the `DASH_KEY`. Stored in `localStorage`, asked once.

## Deployed

`https://waldorf-analytics.orenknaan.workers.dev` (account `c2e5883…`, subdomain
`orenknaan`). `CF_SITE_TAG` is pinned to the `orenknaan.github.io` Web Analytics
site — note the account contains another site (`retreator.com`), so any ad-hoc
query must filter on `siteTag` or it reports the wrong website.

## Endpoints

| Path | Purpose |
|---|---|
| `GET /health` | liveness + whether `CF_SITE_TAG` is configured |
| `GET /api/analytics?days=1\|7\|30\|90` | the whole dashboard payload in one call |

`DASH_KEY` is required, and only as the `x-dash-key` header. It is not read from the query string: a key in a URL ends up in browser history, `Referer` headers and logs. With the secret unset the Worker returns 503 rather than serving the figures openly.

## What Cloudflare Web Analytics does and does not collect

It records **one event type: a page load**, plus Core Web Vitals sampled from
real visitors. There is no custom-event API — no button clicks, no form
submissions, no funnels. Anything of that sort needs a different tool.

It sets no cookies and does not fingerprint, so the site needs no consent banner
for it. Cloudflare keeps unsampled data for 7 days and aggregates it after that.

## Clearing the data at launch

There is no "delete my data" button. To start the real site with a clean slate:
delete the Web Analytics site in the dashboard and create a new one for
`waldorf.co.il`, then update `BEACON_TOKEN` and `CF_SITE_TAG`. Pre-launch
numbers from the mockup host disappear with the old site.
