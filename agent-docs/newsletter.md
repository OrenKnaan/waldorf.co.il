# Newsletter signup (ActiveTrail)

Moved out of the root `CLAUDE.md` (2026-10-28) so it loads only when a task needs it. The root file keeps the rules; this is the detail behind them.

## Newsletter signup (ActiveTrail)

Permanent, like the accessibility layer and global search (`agent-docs/accessibility.md`, `agent-docs/global-search.md`): the signup on `forum-newsletter.html` is real, not a placeholder.

- `mockup/pages/newsletter.js` owns the behaviour and injects its own CSS; the form markup lives in the page. Deferred, and standalone rather than part of `store.js`, which this page does not load: `store.js` fetches every content collection the moment it runs and this page renders nothing from D1. The API base is therefore repeated in both files.
- `POST /api/newsletter/subscribe` on the content API forwards to ActiveTrail. **The browser never calls ActiveTrail directly**, and no future page should: their API authenticates with one account-wide token that can read, edit and delete the entire contact list, so in a page script it is published to every visitor.
- **The token is a Worker secret, never a file.** `npx wrangler secret put ACTIVETRAIL_TOKEN` from `content-api/`. `ACTIVETRAIL_GROUP_ID` and `ACTIVETRAIL_DOUBLE_OPTIN` are identifiers rather than credentials and sit in `wrangler.toml`. With the token or the group id unset the endpoint answers 503 and the form says the signup is not available yet, which is the state a fresh clone is in.
- Double opt-in is on by default: ActiveTrail sends the confirmation mail and only subscribes an address once the link is clicked. That is what makes the list defensible under חוק התקשורת סעיף 30א, and it also means a typo or a signup with someone else's address never becomes a subscription.
- Abuse controls, in order: a honeypot field (clipped, `aria-hidden`, `tabindex="-1"`) that answers exactly as a success does, then server-side address validation, then a per-IP throttle of 5 an hour from the `rate_limits` table (migration 0005). The table is keyed `(bucket, ip)` so the contact form can reuse it.
- Upstream failures return a generic 502 and log the real reply, which can name the account. Never pass ActiveTrail's error body to the browser.

Verified against the live ActiveTrail API with a deliberately invalid token: their 401 says specifically "invalid API Key", which confirms the path and the bare `Authorization` header (no `Bearer` prefix) are right. Also verified 405/400/429/503, the honeypot, and axe-core at the four WCAG tags at 375px, 600px and 1792px, in the default state and with an error showing: **0 violations**.
