// Generates mockup/pages/*.html from content/pages/*.md for the claude.ai/design preview.
// Re-run with `node mockup/build.mjs` whenever content/pages/*.md changes.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const contentDir = join(__dirname, '..', 'content', 'pages');
const outDir = join(__dirname, 'pages');

function parseFrontmatter(raw) {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return { data: {}, body: raw };
  const [, fm, body] = match;
  const data = {};
  for (const line of fm.split('\n')) {
    const m = line.match(/^(\w+):\s*"?([^"]*?)"?\s*$/);
    if (m) data[m[1]] = m[2];
  }
  return { data, body };
}

function inline(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\[([^\]]+)\]/g, '<span class="ph">$1</span>');
}

function mdToHtml(body) {
  const lines = body.split('\n');
  let html = '';
  let listOpen = false;
  const closeList = () => { if (listOpen) { html += '</ul>\n'; listOpen = false; } };

  for (const raw of lines) {
    const line = raw.trim();
    if (line === '') { closeList(); continue; }
    if (line === '---') { closeList(); html += '<hr>\n'; continue; }
    if (line.startsWith('# ')) { closeList(); html += `<h1>${inline(line.slice(2))}</h1>\n`; continue; }
    if (line.startsWith('## ')) { closeList(); html += `<h2>${inline(line.slice(3))}</h2>\n`; continue; }
    if (line.startsWith('> ')) { closeList(); html += `<blockquote>${inline(line.slice(2))}</blockquote>\n`; continue; }
    if (line.startsWith('- ')) {
      if (!listOpen) { html += '<ul>\n'; listOpen = true; }
      html += `<li>${inline(line.slice(2))}</li>\n`;
      continue;
    }
    closeList();
    html += `<p>${inline(line)}</p>\n`;
  }
  closeList();
  return html;
}

const SECTIONS_ORDER = [
  'ראשי', 'הפורום', 'חדשות ואירועים', 'חינוך ולדורף', 'גני ילדים',
  'בתי ספר יסודיים', 'תיכונים', 'מדיה', 'קישורים', 'לוח מודעות', 'צור קשר',
];

function shell({ title, section, status, navHtml, bodyHtml }) {
  const pending = status === 'pending-scope-confirmation';
  return `<!-- @dsCard group="${section}" -->
<!doctype html>
<html lang="he" dir="rtl">
<head>
<meta charset="UTF-8">
<title>${title} — מוקאפ</title>
<style>
  :root {
    --cream: #FAF6F0; --beige: #F0E8DC; --tan: #C4A882; --tan-dark: #A88B69;
    --brown: #6B4F35; --brown-dark: #3D2B1F; --text: #3D2B1F; --text-muted: #7A6555;
    --white: #FFFFFF; --shadow: 0 2px 12px rgba(61,43,31,0.10); --radius: 8px;
    --font: 'Segoe UI', 'Arial Hebrew', Arial, sans-serif;
  }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: var(--font); background: var(--cream); color: var(--text); line-height: 1.7; }
  .topnav { display: flex; flex-wrap: wrap; gap: 4px; background: var(--brown-dark); padding: 10px 24px; }
  .topnav a { color: var(--beige); text-decoration: none; font-size: 13px; padding: 6px 10px; border-radius: var(--radius); opacity: .75; }
  .topnav a.current { background: var(--tan); color: var(--brown-dark); opacity: 1; font-weight: 600; }
  main { max-width: 760px; margin: 0 auto; padding: 32px 24px 60px; }
  h1 { color: var(--brown-dark); font-size: 1.8rem; margin: 0 0 8px; }
  h2 { color: var(--brown-dark); font-size: 1.25rem; margin: 28px 0 10px; border-bottom: 2px solid var(--beige); padding-bottom: 6px; }
  p { margin: 0 0 12px; }
  ul { margin: 0 0 16px; padding-inline-start: 22px; }
  li { margin-bottom: 6px; }
  blockquote { background: #FCEFD9; border-inline-start: 4px solid var(--tan-dark); margin: 0 0 16px; padding: 10px 14px; border-radius: var(--radius); color: var(--brown-dark); }
  hr { border: none; border-top: 1px solid var(--beige); margin: 24px 0; }
  .ph { display: inline-block; background: var(--beige); border: 1px dashed var(--tan-dark); color: var(--text-muted); font-size: 0.85em; padding: 1px 8px; border-radius: 4px; }
  .pagebanner { display: flex; justify-content: space-between; align-items: center; background: var(--white); box-shadow: var(--shadow); border-radius: var(--radius); padding: 10px 16px; margin-bottom: 20px; font-size: 13px; color: var(--text-muted); }
  .pending-badge { background: #E8B563; color: var(--brown-dark); font-weight: 700; padding: 2px 10px; border-radius: 20px; font-size: 12px; }
</style>
</head>
<body>
<nav class="topnav">${navHtml}</nav>
<main>
  <div class="pagebanner">
    <span>מוקאפ תוכן — ${section}</span>
    ${pending ? '<span class="pending-badge">⚠ היקף לא מאושר</span>' : ''}
  </div>
  ${bodyHtml}
</main>
</body>
</html>
`;
}

const files = readdirSync(contentDir).filter((f) => f.endsWith('.md'));
const pages = files.map((f) => {
  const raw = readFileSync(join(contentDir, f), 'utf8');
  const { data, body } = parseFrontmatter(raw);
  return { ...data, order: Number(data.order ?? 0), bodyHtml: mdToHtml(body) };
});
pages.sort((a, b) => a.order - b.order);

const navHtml = pages
  .map((p) => `<a href="./${p.slug}.html" data-slug="${p.slug}">${p.title}</a>`)
  .join('\n');

for (const page of pages) {
  const pageNav = navHtml.replace(
    `data-slug="${page.slug}">`,
    `data-slug="${page.slug}" class="current">`
  );
  const html = shell({
    title: page.title,
    section: page.section,
    status: page.status,
    navHtml: pageNav,
    bodyHtml: page.bodyHtml,
  });
  writeFileSync(join(outDir, `${page.slug}.html`), html, 'utf8');
}

console.log(`Generated ${pages.length} preview pages into ${outDir}`);
console.log('Sections:', [...new Set(pages.map((p) => p.section))].join(', '));
