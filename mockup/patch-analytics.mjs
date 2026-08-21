// Adds (or removes) the Cloudflare Web Analytics beacon on every mockup page,
// in place, without regenerating them. Idempotent — safe to re-run.
//
//   node mockup/patch-analytics.mjs
//
// The beacon is a single deferred script that Cloudflare serves; it records a
// pageview plus Core Web Vitals for the page it loads on. There is nothing to
// call from application code — Web Analytics has no custom-event API — so this
// patcher is the whole client-side integration.
//
// Setting BEACON_TOKEN to '' and re-running strips the snippet back out, which
// is what the launch cutover wants once the mockup host is retired.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { BEACON_TOKEN } from './analytics-config.mjs';

const pagesDir = join(dirname(fileURLToPath(import.meta.url)), 'pages');

const START = '<!-- Cloudflare Web Analytics -->';
const END = '<!-- End Cloudflare Web Analytics -->';
// Swallows the newlines on BOTH sides of the block. Consuming only the leading
// one and re-adding it meant every run grew the file by a byte, so the patcher
// never converged and every run showed up as a diff.
const BLOCK_RE = /\n*<!-- Cloudflare Web Analytics -->[\s\S]*?<!-- End Cloudflare Web Analytics -->\n*/;

const snippet = BEACON_TOKEN
  // Byte-for-byte the snippet Cloudflare hands out in the dashboard, token
  // substituted. type="module" (not defer) is what they currently issue.
  ? `${START}\n<script type="module" src="https://static.cloudflareinsights.com/beacon.min.js" ` +
    `data-cf-beacon='${JSON.stringify({ token: BEACON_TOKEN })}'></script>\n${END}`
  : '';

let added = 0, removed = 0, unchanged = 0;

for (const file of readdirSync(pagesDir).filter((f) => f.endsWith('.html'))) {
  const path = join(pagesDir, file);
  const html = readFileSync(path, 'utf8');
  const had = BLOCK_RE.test(html);

  // Strip any existing block first, then re-add — that way a token change is
  // an update rather than a duplicate.
  // Normalise to a single newline where the block was, then re-insert. Doing it
  // in this order means a token change is an update, not a second copy, and a
  // re-run with the same token is a genuine no-op.
  let next = had ? html.replace(BLOCK_RE, '\n') : html;
  if (snippet) {
    if (!next.includes('</body>')) throw new Error(`${file}: no </body> to anchor the beacon to`);
    next = next.replace('</body>', `${snippet}\n</body>`);
  }

  if (next === html) { unchanged += 1; continue; }
  writeFileSync(path, next, 'utf8');
  if (snippet) added += 1; else removed += 1;
}

if (!BEACON_TOKEN) {
  console.log(`No BEACON_TOKEN set — beacon removed from ${removed} page(s), ${unchanged} already clean.`);
  console.log('Set BEACON_TOKEN in mockup/analytics-config.mjs to switch analytics on.');
} else {
  console.log(`Beacon (token ${BEACON_TOKEN.slice(0, 6)}…) written to ${added} page(s), ${unchanged} unchanged.`);
}
