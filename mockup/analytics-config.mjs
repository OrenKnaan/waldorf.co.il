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
// Since 2026-11-06 this is the Web Analytics site for the live domain. The
// GitHub Pages mockup carries the same snippet, and Cloudflare drops its
// beacons because the host does not match, so only real visits count. The
// pre-launch site (token e4ea3335…, host orenknaan.github.io) still exists in
// the dashboard with the mockup's numbers.
export const BEACON_TOKEN = '7e15f3d1556a44e9bc57bdef860a9c0e';

// The hostname the Web Analytics site is registered against. Cloudflare drops
// beacons whose Referer host doesn't match (postfix match), so a mismatch here
// is the usual reason "it's installed but there's no data".
export const BEACON_HOST = 'www.waldorf.co.il';
