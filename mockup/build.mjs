// Generates mockup/pages/*.html from content/pages/*.md for the claude.ai/design preview.
// Re-run with `node mockup/build.mjs` whenever content/pages/*.md changes.
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { RESPONSIVE_CSS, NAV_TOGGLE_HTML, NAV_TOGGLE_JS, VIEWPORT_META } from './responsive.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const contentDir = join(__dirname, '..', 'content', 'pages');
const outDir = join(__dirname, 'pages');

// ---------- Embedded assets (inlined so pages render in any preview context,
// e.g. claude.ai/design, where relative asset/font URLs don't resolve) ----------
const fontPath = join(__dirname, '..', 'fonts', 'AntroposHebrew.otf');
export const titleFontFace = existsSync(fontPath)
  ? `  @font-face { font-family: 'Antropos Hebrew'; src: url(data:font/otf;base64,${readFileSync(fontPath).toString('base64')}) format('opentype'); font-display: swap; }\n`
  : '';
const FAVICON_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="7" fill="#3D2B1F"/><path d="M16 6c-6 3-8 8-8 13 5-1 9-5 10-13-1 0-1 0-2 0z" fill="#C4A882"/></svg>';
export const FAVICON = `<link rel="icon" href="data:image/svg+xml;base64,${Buffer.from(FAVICON_SVG).toString('base64')}">`;

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

// ---------- Icon library (inline Lucide-style stroke SVGs — no CDN) ----------
const ICON_PATHS = {
  pin: '<path d="M12 21s7-7.2 7-12.5A7 7 0 0 0 5 8.5C5 13.8 12 21 12 21z"/><circle cx="12" cy="8.5" r="2.4"/>',
  phone: '<path d="M6.6 10.8c1.4 2.8 3.8 5.2 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.5.6.6 0 1 .5 1 1v3.4c0 .6-.5 1-1 1C10.9 21 3 13.1 3 3.9c0-.5.5-1 1-1h3.4c.6 0 1 .4 1 1 0 1.2.2 2.4.6 3.5.1.4 0 .8-.2 1.1z"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 6.5l9 6.5 9-6.5"/>',
  mic: '<rect x="9" y="2.5" width="6" height="11" rx="3"/><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0"/><path d="M12 18v3.5M9 21.5h6"/>',
  briefcase: '<rect x="2.5" y="7.5" width="19" height="12" rx="2"/><path d="M8.5 7.5V6a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v1.5"/><path d="M2.5 13h19"/>',
  book: '<path d="M4 4.5C6 3.6 9 3.3 12 4.5c3-1.2 6-.9 8 0v14.5c-2-.9-5-1.2-8 0-3-1.2-6-.9-8 0V4.5z"/><path d="M12 4.5v14.5"/>',
  music: '<circle cx="6.5" cy="18" r="2.3"/><circle cx="17" cy="16" r="2.3"/><path d="M8.8 18V5.5L19.3 3.5V16"/>',
  users: '<circle cx="9" cy="8" r="3.2"/><path d="M2.8 20c.6-3.4 3.3-5.5 6.2-5.5s5.6 2.1 6.2 5.5"/><circle cx="17" cy="8.5" r="2.6"/><path d="M15.5 14.7c2.6.3 4.8 2.2 5.3 5.3"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>',
  ticket: '<path d="M3 9a2 2 0 0 1 0-4h18a2 2 0 0 1 0 4 2 2 0 0 0 0 6 2 2 0 0 1 0 4H3a2 2 0 0 1 0-4 2 2 0 0 0 0-6z"/><path d="M14 5.5v13" stroke-dasharray="2.4 2.4"/>',
  map: '<path d="M9 4.5L3 6.5v13l6-2 6 2 6-2v-13l-6 2-6-2z"/><path d="M9 4.5v13M15 6.5v13"/>',
  play: '<path d="M6.5 4.2v15.6l13-7.8-13-7.8z"/>',
  tag: '<path d="M3 11.2V5a2 2 0 0 1 2-2h6.2a2 2 0 0 1 1.4.6l8 8a2 2 0 0 1 0 2.8l-6.2 6.2a2 2 0 0 1-2.8 0l-8-8a2 2 0 0 1-.6-1.4z"/><circle cx="7.5" cy="7.5" r="1.4"/>',
  'chevron-down': '<path d="M5 8.5l7 7 7-7"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.01"/>',
  facebook: '<path d="M14.5 21v-8h2.6l.4-3.2h-3V7.7c0-.9.3-1.5 1.7-1.5h1.5V3.3c-.3 0-1.2-.1-2.3-.1-2.3 0-3.9 1.4-3.9 4v2.6H8.9v3.2h2.6V21z"/>',
  instagram: '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" stroke="none"/>',
  youtube: '<rect x="2.5" y="5.5" width="19" height="13" rx="3.5"/><path d="M10.5 9.2l5 3-5 3z" fill="currentColor" stroke="none"/>',
  leaf: '<path d="M20 4C10 4 4 10 4 18c0 1 0 2 .3 2.7C5 21 6 21 7 21c8 0 14-6 14-16 0-.4 0-.7-.1-1z"/><path d="M6 20C10 15 14 11 19 6"/>',
};

function icon(name) {
  const path = ICON_PATHS[name];
  if (!path) return '';
  return `<svg class="icon-inline" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;
}

function inline(text) {
  let out = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    .replace(/\[([^\]]+)\]/g, '<span class="ph">$1</span>');
  out = out.replace(/:([a-z-]+):/g, (m, name) => (ICON_PATHS[name] ? icon(name) : m));
  return out;
}

// ---------- Tables ----------
function renderTable(tableLines) {
  const rows = tableLines.map((l) =>
    l.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim())
  );
  const header = rows[0];
  const isSeparator = (r) => r.every((c) => /^:?-+:?$/.test(c));
  let bodyRows = rows.slice(1);
  if (bodyRows.length && isSeparator(bodyRows[0])) bodyRows = bodyRows.slice(1);
  let html = '<div class="table-wrap"><table>\n<thead><tr>\n';
  for (const cell of header) html += `<th>${inline(cell)}</th>\n`;
  html += '</tr></thead>\n<tbody>\n';
  for (const row of bodyRows) {
    html += '<tr>';
    for (const cell of row) html += `<td>${inline(cell)}</td>`;
    html += '</tr>\n';
  }
  html += '</tbody></table></div>\n';
  return html;
}

// ---------- Tabs (:::tabs ... :::) ----------
let tabGroupCounter = 0;
function extractTabs(body) {
  const tabsStore = {};
  const newBody = body.replace(/:::tabs\n([\s\S]*?)\n:::/g, (_m, inner) => {
    const id = tabGroupCounter++;
    const sections = inner.split(/\n(?=## )/).map((s) => s.trim()).filter(Boolean);
    const tabs = sections.map((sec, idx) => {
      const headerMatch = sec.match(/^## (.+)\n?([\s\S]*)$/);
      const label = headerMatch ? headerMatch[1].trim() : `לשונית ${idx + 1}`;
      const contentMd = headerMatch ? headerMatch[2] : sec;
      return { label, html: mdToHtml(contentMd) };
    });
    let tabHtml = `<div class="tabs" data-group="${id}">\n<div class="tab-buttons" role="tablist">\n`;
    tabs.forEach((t, idx) => {
      tabHtml += `<button type="button" class="tab-btn${idx === 0 ? ' active' : ''}" data-target="tab-${id}-${idx}">${inline(t.label)}</button>\n`;
    });
    tabHtml += '</div>\n';
    tabs.forEach((t, idx) => {
      tabHtml += `<div class="tab-panel${idx === 0 ? ' active' : ''}" id="tab-${id}-${idx}">\n${t.html}</div>\n`;
    });
    tabHtml += '</div>\n';
    tabsStore[id] = tabHtml;
    return `\n@@TABS_${id}@@\n`;
  });
  return { newBody, tabsStore };
}

// ---------- Markdown ----------
function mdToHtml(body, tabsStore = {}) {
  const lines = body.split('\n');
  let html = '';
  let listOpen = false;
  let sectionOpen = false;
  let heroDividerInserted = false;
  const closeList = () => { if (listOpen) { html += '</ul>\n'; listOpen = false; } };
  const closeSection = () => { if (sectionOpen) { html += '</section>\n'; sectionOpen = false; } };
  const openSection = () => {
    if (!heroDividerInserted) {
      html += '<div class="divider" aria-hidden="true"><svg viewBox="0 0 200 12" preserveAspectRatio="none"><path d="M0 6 C 20 0, 40 12, 60 6 S 100 0, 120 6 S 160 12, 180 6 S 200 0, 200 6" /></svg></div>\n';
      heroDividerInserted = true;
    }
    html += '<section class="card">\n';
    sectionOpen = true;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line === '') { closeList(); continue; }
    const tabsMatch = line.match(/^@@TABS_(\d+)@@$/);
    if (tabsMatch) {
      closeList(); closeSection(); openSection();
      html += tabsStore[tabsMatch[1]] ?? '';
      continue;
    }
    if (/^\|.*\|$/.test(line)) {
      closeList();
      const tableLines = [];
      let j = i;
      while (j < lines.length && /^\s*\|.*\|\s*$/.test(lines[j])) { tableLines.push(lines[j]); j++; }
      html += renderTable(tableLines);
      i = j - 1;
      continue;
    }
    if (line === '---') { closeList(); html += '<hr>\n'; continue; }
    if (line.startsWith('# ')) { closeList(); closeSection(); html += `<h1>${inline(line.slice(2))}</h1>\n`; continue; }
    if (line.startsWith('### ')) { closeList(); html += `<h3 class="sub">${inline(line.slice(4))}</h3>\n`; continue; }
    if (line.startsWith('## ')) { closeList(); closeSection(); openSection(); html += `<h2>${inline(line.slice(3))}</h2>\n`; continue; }
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
  closeSection();
  return html;
}

// ---------- Nav structure (explicit tree, independent of frontmatter section/parent) ----------
const NAV_STRUCTURE = [
  { slug: 'home' },
  { slug: 'forum', children: ['forum-roles', 'forum-workgroups', 'forum-newsletter'] },
  { slug: 'news' },
  { label: 'חינוך ולדורף', children: ['waldorf-characteristics', 'waldorf-foundations'] },
  { slug: 'kinder', children: ['kinder-list'] },
  { slug: 'school', children: ['curriculum', 'school-list'] },
  { slug: 'teacher-training' },
  { slug: 'content-library' },
  { slug: 'media' },
  { label: 'לוח מודעות', children: ['community-board', 'job-board'] },
  { slug: 'links' },
  { slug: 'contact' },
];

// ---------- Load pages ----------
const files = readdirSync(contentDir).filter((f) => f.endsWith('.md'));
const pages = files.map((f) => {
  const raw = readFileSync(join(contentDir, f), 'utf8');
  const { data, body } = parseFrontmatter(raw);
  const { newBody, tabsStore } = extractTabs(body);
  return { ...data, order: Number(data.order ?? 0), bodyHtml: mdToHtml(newBody, tabsStore) };
});
pages.sort((a, b) => a.order - b.order);

const pageBySlug = Object.fromEntries(pages.map((p) => [p.slug, p]));
const parentMap = Object.fromEntries(pages.filter((p) => p.parent).map((p) => [p.slug, p.parent]));

function topAncestor(slug) {
  let s = slug;
  const seen = new Set();
  while (parentMap[s] && !seen.has(s)) { seen.add(s); s = parentMap[s]; }
  return s;
}

function renderNav(currentSlug) {
  const topSlug = topAncestor(currentSlug);
  let html = '<div class="primary-nav" id="primary-nav">\n';
  for (const entry of NAV_STRUCTURE) {
    const hasChildren = Boolean(entry.children && entry.children.length);
    const isActive = entry.slug
      ? entry.slug === topSlug || entry.slug === currentSlug
      : hasChildren && entry.children.includes(topSlug);
    html += '<div class="nav-item">\n';
    if (entry.slug) {
      const page = pageBySlug[entry.slug];
      if (!page) continue;
      html += `<a class="nav-link${isActive ? ' active' : ''}" href="./${entry.slug}.html">${inline(page.title)}${hasChildren ? icon('chevron-down') : ''}</a>\n`;
    } else {
      html += `<span class="nav-link nav-label${isActive ? ' active' : ''}">${inline(entry.label)}${hasChildren ? icon('chevron-down') : ''}</span>\n`;
    }
    if (hasChildren) {
      html += '<div class="dropdown">\n';
      for (const childSlug of entry.children) {
        const child = pageBySlug[childSlug];
        if (!child) continue;
        const activeChild = childSlug === currentSlug;
        html += `<a class="dropdown-link${activeChild ? ' active' : ''}" href="./${childSlug}.html">${inline(child.title)}</a>\n`;
      }
      html += '</div>\n';
    }
    html += '</div>\n';
  }
  html += '</div>\n';
  return html;
}

// ---------- Breadcrumb ----------
function findBreadcrumbPath(slug) {
  const chain = [];
  let s = slug;
  const seen = new Set();
  while (s && !seen.has(s)) {
    seen.add(s);
    const page = pageBySlug[s];
    if (!page) break;
    chain.unshift({ title: page.title, slug: s });
    s = parentMap[s];
  }
  if (chain.length === 1) {
    const entry = NAV_STRUCTURE.find((e) => !e.slug && e.children && e.children.includes(slug));
    if (entry) chain.unshift({ title: entry.label, slug: null });
  }
  return chain;
}

// Full path from home down to the current page, shared by the visible
// breadcrumb and the JSON-LD schema so the two can never drift apart.
function breadcrumbCrumbs(currentSlug) {
  return currentSlug === 'home'
    ? [{ title: pageBySlug.home.title, slug: 'home' }]
    : [{ title: pageBySlug.home.title, slug: 'home' }, ...findBreadcrumbPath(currentSlug)];
}

function renderBreadcrumb(currentSlug) {
  const crumbs = breadcrumbCrumbs(currentSlug);
  let html = '<span class="crumbs">\n';
  crumbs.forEach((c, idx) => {
    if (idx > 0) html += '<span class="crumb-sep" aria-hidden="true">/</span>\n';
    const isLast = idx === crumbs.length - 1;
    if (isLast) {
      html += `<span class="crumb current" aria-current="page">${inline(c.title)}</span>\n`;
    } else if (c.slug) {
      html += `<a class="crumb" href="./${c.slug}.html">${inline(c.title)}</a>\n`;
    } else {
      html += `<span class="crumb crumb-static">${inline(c.title)}</span>\n`;
    }
  });
  html += '</span>\n';
  return html;
}

// BreadcrumbList structured data (schema.org JSON-LD) mirroring the visible
// trail exactly. Slugged crumbs carry a relative `item` URL; the "לוח מודעות"
// style label-only groups have no page of their own, so they get a name only.
function breadcrumbSchema(currentSlug) {
  const textOf = (s) => String(s).replace(/<[^>]*>/g, '').trim();
  const itemListElement = breadcrumbCrumbs(currentSlug).map((c, idx) => {
    const el = { '@type': 'ListItem', position: idx + 1, name: textOf(c.title) };
    if (c.slug) el.item = `./${c.slug}.html`;
    return el;
  });
  const data = { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement };
  return `<script type="application/ld+json">\n${JSON.stringify(data, null, 2)}\n</script>`;
}

// ---------- Page shell ----------
function shell({ title, section, status, slug, navHtml, bodyHtml }) {
  const pending = status === 'pending-scope-confirmation';
  return `<!-- @dsCard group="${section}" -->
<!doctype html>
<html lang="he" dir="rtl">
<head>
<meta charset="UTF-8">
${VIEWPORT_META}
${FAVICON}
<title>${title} — מוקאפ</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Frank+Ruhl+Libre:wght@500;700&family=Rubik:wght@400;500;600&display=swap" rel="stylesheet">
${breadcrumbSchema(slug)}
<style>
${titleFontFace}  :root {
    --cream: #FAF6F0; --beige: #F0E8DC; --tan: #C4A882; --tan-dark: #A88B69;
    --brown: #6B4F35; --brown-dark: #3D2B1F; --text: #3D2B1F; --text-muted: #7A6555;
    --white: #FFFFFF; --shadow: 0 2px 12px rgba(61,43,31,0.10); --shadow-lg: 0 10px 30px rgba(61,43,31,0.14);
    --radius: 8px; --radius-lg: 18px; --radius-pill: 999px;
    --font-body: 'Rubik', 'Segoe UI', 'Arial Hebrew', Arial, sans-serif;
    --font-head: 'Antropos Hebrew', 'Frank Ruhl Libre', 'Segoe UI', 'Arial Hebrew', Arial, serif;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0; font-family: var(--font-body); color: var(--text); line-height: 1.75;
    background: linear-gradient(180deg, var(--beige) 0%, var(--cream) 320px);
  }

  /* header / brand */
  .site-header { background: linear-gradient(135deg, var(--brown-dark), var(--brown)); }
  .brand-row { /* max-width: 960px; */ margin: 0 auto; padding: 18px 24px 10px; }
  .brand-name {
    color: var(--white); font-family: var(--font-head); font-weight: 700; font-size: 1.3rem;
    letter-spacing: 0.02em; margin: 0;
  }
  .brand-tagline { color: var(--tan); font-size: 0.8rem; letter-spacing: 0.08em; text-transform: uppercase; margin: 2px 0 0; }

  /* nav */
  .primary-nav { display: flex; flex-wrap: wrap; gap: 2px; /* max-width: 960px; */ margin: 0 auto; padding: 0 16px; }
  .nav-item { position: relative; }
  .nav-link {
    display: flex; align-items: center; gap: 4px; padding: 12px 12px; font-size: 0.85rem;
    color: var(--beige); text-decoration: none; cursor: pointer; white-space: nowrap;
    border-bottom: 3px solid transparent; opacity: .85; transition: opacity .2s, border-color .2s;
  }
  .nav-link .icon-inline { width: 13px; height: 13px; }
  .nav-link:hover, .nav-link.active { opacity: 1; border-bottom-color: var(--tan); color: var(--white); }
  .nav-label { user-select: none; }

  .dropdown {
    display: none; position: absolute; top: 100%; right: 0; background: var(--white);
    box-shadow: var(--shadow-lg); border-radius: 0 0 var(--radius-lg) var(--radius-lg);
    min-width: 230px; z-index: 20; padding: 8px 0; border-top: 3px solid var(--tan);
  }
  .nav-item:hover .dropdown { display: block; }
  .dropdown-link {
    display: block; padding: 10px 20px; font-size: 0.88rem; color: var(--text-muted);
    text-decoration: none; transition: background .15s, color .15s;
  }
  .dropdown-link:hover, .dropdown-link.active { background: var(--beige); color: var(--brown); }

  main { /* max-width: 760px; */ margin: 0 auto; padding: 28px 24px 70px; }

  .pagebanner {
    display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 12px;
    background: var(--white); box-shadow: var(--shadow); border-radius: var(--radius-pill);
    padding: 8px 18px; margin-bottom: 24px; font-size: 12.5px; color: var(--text-muted);
  }
  /* Flush against the header. main's padding-block-start is the gap, so the
     breadcrumb is pulled up through it — scoped to :first-child so home.html,
     which carries no breadcrumb, keeps its top padding. Restated at every
     breakpoint in responsive.mjs, because the padding changes there. */
  main > .pagebanner:first-child { margin-block-start: -28px; }
  .pagebanner .crumbs {
    display: flex; flex-wrap: wrap; align-items: center; gap: 6px;
  }
  .crumb {
    color: var(--text-muted); text-decoration: none;
  }
  a.crumb:hover { color: var(--brown); text-decoration: underline; }
  .crumb.current { color: var(--brown-dark); font-weight: 600; }
  .crumb-sep { color: var(--tan-dark); opacity: .7; }
  .pending-badge {
    display: inline-flex; align-items: center; gap: 5px; background: #F3DDA7; color: var(--brown-dark);
    font-weight: 600; padding: 3px 12px; border-radius: var(--radius-pill); font-size: 12px;
  }
  .pending-badge .icon-inline { width: 13px; height: 13px; }

  h1 {
    font-family: var(--font-head); color: var(--brown-dark); font-size: 2rem; font-weight: 700;
    margin: 0 0 10px; letter-spacing: 0.01em;
  }
  main > p:first-of-type { font-size: 1.05rem; color: var(--text-muted); /* max-width: 60ch; */ }

  .divider { margin: 22px 0 8px; color: var(--tan); }
  .divider svg { width: 100%; height: 12px; display: block; }
  .divider path { fill: none; stroke: currentColor; stroke-width: 1.6; }

  section.card {
    background: var(--white); border-radius: var(--radius-lg); box-shadow: var(--shadow);
    padding: 22px 26px; margin: 0 0 18px;
  }
  h2 {
    font-family: var(--font-head); color: var(--brown-dark); font-size: 1.2rem; font-weight: 700;
    margin: 0 0 14px; padding-bottom: 10px; border-bottom: 2px solid var(--beige);
    display: flex; align-items: center; gap: 8px;
  }
  h3.sub { font-family: var(--font-head); color: var(--brown); font-size: 1.02rem; font-weight: 700; margin: 18px 0 8px; }
  p { margin: 0 0 12px; }
  ul { margin: 0 0 4px; padding-inline-start: 22px; }
  li { margin-bottom: 8px; display: flex; align-items: flex-start; gap: 6px; }
  li .icon-inline { flex: none; margin-top: 3px; }

  blockquote {
    background: #FCEFD9; border-inline-start: 4px solid var(--tan-dark); margin: 0 0 16px;
    padding: 12px 16px; border-radius: var(--radius); color: var(--brown-dark);
    display: flex; align-items: flex-start; gap: 8px;
  }
  hr { border: none; border-top: 1px solid var(--beige); margin: 24px 0; }

  .ph {
    display: inline-block; background: var(--beige); border: 1px dashed var(--tan-dark);
    color: var(--text-muted); font-size: 0.85em; padding: 2px 12px; border-radius: var(--radius-pill);
  }

  .icon-inline { width: 16px; height: 16px; vertical-align: -3px; color: var(--tan-dark); flex: none; }
  h2 .icon-inline { color: var(--brown); width: 18px; height: 18px; }

  /* tables */
  .table-wrap { overflow-x: auto; margin: 0 0 6px; border-radius: var(--radius); }
  table { width: 100%; border-collapse: collapse; font-size: 0.92rem; }
  th, td { text-align: start; padding: 10px 12px; border-bottom: 1px solid var(--beige); vertical-align: top; }
  th {
    background: var(--beige); color: var(--brown-dark); font-family: var(--font-head); font-weight: 700;
    font-size: 0.8rem; letter-spacing: 0.02em; white-space: nowrap;
  }
  tbody tr:nth-child(even) { background: #FBF8F3; }
  tbody tr:hover { background: var(--beige); }
  td a { color: var(--brown); }

  /* tabs */
  .tabs { margin: 4px 0 6px; }
  .tab-buttons { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 16px; }
  .tab-btn {
    font-family: var(--font-body); font-size: 0.85rem; font-weight: 500; color: var(--text-muted);
    background: var(--beige); border: none; border-radius: var(--radius-pill); padding: 8px 18px;
    cursor: pointer; transition: background .15s, color .15s;
  }
  .tab-btn:hover { background: var(--tan); color: var(--white); }
  .tab-btn.active { background: var(--brown); color: var(--white); }
  .tab-panel { display: none; }
  .tab-panel.active { display: block; }

  a { color: var(--brown); }

  footer.site-footer { text-align: center; padding: 30px 24px 50px; color: var(--text-muted); font-size: 0.8rem; }
${RESPONSIVE_CSS}</style>
</head>
<body>
<header class="site-header">
${NAV_TOGGLE_HTML}
  <div class="brand-row">
    <p class="brand-name">הפורום הארצי לחינוך ולדורף</p>
  </div>
  <nav>${navHtml}</nav>
</header>
${NAV_TOGGLE_JS}
<main>
  <nav class="pagebanner" aria-label="breadcrumb">
    ${renderBreadcrumb(slug)}
    ${pending ? `<span class="pending-badge">${icon('info')} טעון אישור היקף</span>` : ''}
  </nav>
  ${bodyHtml}
</main>
<footer class="site-footer">גירסה פנימית — הפורום הארצי לחינוך ולדורף</footer>
<script>
document.addEventListener('click', function (e) {
  var btn = e.target.closest('.tab-btn');
  if (!btn) return;
  var group = btn.closest('.tabs');
  group.querySelectorAll('.tab-btn').forEach(function (b) { b.classList.remove('active'); });
  group.querySelectorAll('.tab-panel').forEach(function (p) { p.classList.remove('active'); });
  btn.classList.add('active');
  var target = group.querySelector('#' + btn.dataset.target);
  if (target) target.classList.add('active');
});
</script>
</body>
</html>
`;
}

// The mockup/pages/*.html files have been hand-tuned well beyond what this
// generator emits from the plain Markdown (art heroes, entity cards, forms,
// galleries, maps, etc.). By default we therefore only SCAFFOLD pages that
// don't exist yet — never overwrite an existing one — so a stray build run
// can't revert the hand-crafted design. Set FORCE=1 to regenerate everything
// from scratch (only when you intend to throw away those hand edits).
// Reusable helpers for in-place patch scripts (e.g. patch-breadcrumbs.mjs),
// which need the exact same IA/breadcrumb logic without triggering a build.
export { pages, pageBySlug, renderNav, renderBreadcrumb, breadcrumbSchema, breadcrumbCrumbs };

// Only run the generator when invoked directly (`node mockup/build.mjs`),
// not when imported by a patch script.
const isMain = Boolean(process.argv[1]) && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  const force = process.env.FORCE === '1' || process.argv.includes('--force');
  let written = 0;
  const skipped = [];

  for (const page of pages) {
    const outPath = join(outDir, `${page.slug}.html`);
    if (!force && existsSync(outPath)) {
      skipped.push(page.slug);
      continue;
    }
    const html = shell({
      title: page.title,
      section: page.section,
      status: page.status,
      slug: page.slug,
      navHtml: renderNav(page.slug),
      bodyHtml: page.bodyHtml,
    });
    writeFileSync(outPath, html, 'utf8');
    written++;
  }

  if (force) {
    console.log(`Regenerated ${written} preview pages into ${outDir} (FORCE — hand edits overwritten).`);
  } else {
    console.log(`Scaffolded ${written} new preview page(s) into ${outDir}.`);
    if (skipped.length) {
      console.log(`Kept ${skipped.length} existing page(s) untouched (run with FORCE=1 to regenerate them).`);
    }
  }
  console.log('Sections:', [...new Set(pages.map((p) => p.section))].join(', '));
}
