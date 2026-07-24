// Inlines art images + the Antropos title font as data URIs into the
// hand-crafted mockup/pages/*.html, and adds a favicon. This makes the pages
// render correctly in any preview context (e.g. claude.ai/design), where
// relative "../assets/..." URLs don't resolve — the source of the 404s.
// Reuses the same font/favicon assets as build.mjs. Idempotent — safe to re-run.
//
//   node mockup/embed-assets.mjs
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, basename } from 'node:path';
import { titleFontFace, FAVICON } from './build.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pagesDir = join(__dirname, 'pages');
const artDir = join(__dirname, 'assets', 'art');

// name -> data: URI for every art image on disk.
const artUri = {};
for (const f of readdirSync(artDir).filter((f) => /\.jpe?g$/i.test(f))) {
  artUri[f] = `data:image/jpeg;base64,${readFileSync(join(artDir, f)).toString('base64')}`;
}

let patched = 0;
for (const file of readdirSync(pagesDir).filter((f) => f.endsWith('.html'))) {
  let html = readFileSync(join(pagesDir, file), 'utf8');

  // 1) Embed the title @font-face at the top of <style> (once).
  if (titleFontFace && !html.includes("@font-face { font-family: 'Antropos Hebrew'")) {
    html = html.replace(/(<style>\n)/, `$1${titleFontFace}`);
  }

  // 2) Make Antropos the first choice for headings.
  html = html.replace(
    /(--font-head:\s*)('M PLUS Rounded 1c')/,
    `$1'Antropos Hebrew',$2`,
  );

  // 3) Inline every art image (both <img src> and CSS url()).
  html = html.replace(/\.\.\/assets\/art\/([a-z0-9-]+\.jpe?g)/gi, (m, name) =>
    artUri[name] || m,
  );

  // 4) Favicon (kills the favicon.ico 404), once.
  if (!html.includes('rel="icon"')) {
    html = html.replace(/(<meta charset="UTF-8">\n)/i, `$1${FAVICON}\n`);
  }

  writeFileSync(join(pagesDir, file), html, 'utf8');
  patched++;
}

console.log(`Embedded font + favicon + ${Object.keys(artUri).length} art image(s) into ${patched} page(s).`);
if (!existsSync(join(__dirname, '..', 'fonts', 'AntroposHebrew.otf'))) {
  console.warn('WARNING: title font not found — pages fall back to Frank Ruhl Libre.');
}
