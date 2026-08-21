// Cloudflare Web Analytics — single source of truth for the beacon token.
//
// This token is NOT a secret. It identifies which Web Analytics site the
// pageview belongs to and is visible in the page source by design; anyone can
// read it off the deployed HTML. The token that *is* secret is the API token
// the dashboard Worker uses to read the data back — that one lives as a Worker
// secret (see analytics-worker/README.md), never in this repo.
//
// To change it: edit here, then `node mockup/patch-analytics.mjs`.
// To remove the beacon entirely: set the token to '' and re-run the patcher.
//
// AT LAUNCH CUTOVER: this site tracks the GitHub Pages mockup host. Cloudflare
// has no "delete my data" button, so clearing the pre-launch numbers means
// deleting the Web Analytics site in the dashboard and creating a fresh one for
// waldorf.co.il — then putting the new token here. See CLAUDE.md.
export const BEACON_TOKEN = 'e4ea3335f4ae4f55bacc328eb40c12c9';

// The hostname the Web Analytics site is registered against. Cloudflare drops
// beacons whose Referer host doesn't match (postfix match), so a mismatch here
// is the usual reason "it's installed but there's no data".
export const BEACON_HOST = 'orenknaan.github.io';
