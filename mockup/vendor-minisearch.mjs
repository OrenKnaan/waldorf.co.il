// Rebuilds mockup/pages/minisearch.min.js from the installed npm package.
//
//   node mockup/vendor-minisearch.mjs
//
// The mockup is plain static HTML on GitHub Pages with no bundler, so the
// search widget cannot `import 'minisearch'` and resolve it from node_modules.
// It loads a vendored file instead, which this script produces: the ESM build,
// bundled and minified with the esbuild that already ships inside Astro's
// dependency tree, so vendoring adds no new dependency of its own.
//
// Committed to the repo on purpose. GitHub Pages serves mockup/pages/ verbatim,
// with no install step, so the file has to be there. Re-run this after bumping
// minisearch in package.json.
//
// A CDN would spare us the file, but it would put a third-party origin in the
// critical path of a site that is meant to work in schools with patchy
// connectivity, and it would leak a request per visitor to an origin the forum
// has no agreement with.
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pkgDir = join(root, 'node_modules', 'minisearch');
const out = join(root, 'mockup', 'pages', 'minisearch.min.js');

const { version } = JSON.parse(readFileSync(join(pkgDir, 'package.json'), 'utf8'));
const license = readFileSync(join(pkgDir, 'LICENSE.txt'), 'utf8').trim();

execFileSync(
  join(root, 'node_modules', '.bin', 'esbuild'),
  [
    join(pkgDir, 'dist', 'es', 'index.js'),
    '--bundle',
    '--format=esm',
    '--minify',
    '--legal-comments=none',
    '--target=es2020',
    `--outfile=${out}`,
  ],
  { stdio: ['ignore', 'ignore', 'inherit'] },
);

// esbuild strips the package's own notice, and MIT requires it to travel with
// the copy, so put it back at the top of the file we actually ship.
const banner =
  `/*! MiniSearch v${version} | MIT License | https://github.com/lucaong/minisearch\n` +
  ` * Vendored build, do not edit. Regenerate with: node mockup/vendor-minisearch.mjs\n *\n` +
  license
    .split('\n')
    .map((line) => ` * ${line}`.trimEnd())
    .join('\n') +
  '\n */\n';

const code = readFileSync(out, 'utf8');
writeFileSync(out, banner + code, 'utf8');

const kb = (Buffer.byteLength(banner + code) / 1024).toFixed(1);
console.log(`minisearch.min.js: v${version}, ${kb} KB.`);
