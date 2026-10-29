// Idempotent. The "hero: inset slideshow" block pulls the breadcrumb up onto the
// slide by the slide's height and gives that height back underneath. On a page with
// no art-hero (the newsletter issues and ebooks.html shipped that way) the same
// margins lifted the bar over the header and left an empty slide-sized gap. This
// scopes the pull to a bar that follows an art-hero; without one the bar stays in
// the flow, 10px under the header like a slide would be.
//
//   node mockup/patch-hero-optional.mjs
//
// Re-running should say "0 file(s) rewritten".
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const pagesDir = join(dirname(fileURLToPath(import.meta.url)), 'pages');

const OLD = `  main > .pagebanner{height:var(--bar-h);padding-block:0;white-space:nowrap;
    margin:calc(var(--bar-gap) - var(--hero-h)) var(--bar-gap)
           calc(var(--hero-h) - var(--bar-gap) - var(--bar-h) + 24px)}
`;
const NEW = `  main > .pagebanner{height:var(--bar-h);padding-block:0;white-space:nowrap}
  main > .pagebanner:first-child{margin-block-start:0}
  /* Only a slide gives the bar something to sit on: without one it stays in the flow. */
  main > .art-hero + .pagebanner{
    margin:calc(var(--bar-gap) - var(--hero-h)) var(--bar-gap)
           calc(var(--hero-h) - var(--bar-gap) - var(--bar-h) + 24px)}
`;

let rewritten = 0;
for (const f of readdirSync(pagesDir)) {
  if (!f.endsWith('.html')) continue;
  const p = join(pagesDir, f);
  const src = readFileSync(p, 'utf8');
  if (!src.includes(OLD)) continue;
  writeFileSync(p, src.replace(OLD, NEW), 'utf8');
  rewritten += 1;
}
console.log(`${rewritten} file(s) rewritten.`);
