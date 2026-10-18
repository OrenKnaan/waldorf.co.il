// Generates the seven "חומר למיון" pages, all of them admin-only as of
// 2026-10-18: the forum's classification work is done, but at least two
// subject buckets turned out to have no confirmed home on the new site yet
// (see CLAUDE.md, "The triage section"), so the whole pile stays off the
// public site and reachable only from the admin dashboard.
//
//   node mockup/sorting-content.mjs     # first, writes pages/admin/sorting-data/
//   node mockup/sorting-pages.mjs       # then, writes pages/admin/sorting*.html
//
// Safe to re-run: it only ever writes pages/admin/sorting*.html. Re-running
// discards hand edits to those seven.
//
// A lightweight skeleton of its own, not a clone of a public page: an admin
// page carries none of the site's nav, accessibility layer or search, the
// same way admin/set-password.html does not. sorting.js is loaded unmodified
// (shared with nothing public any more, but still the one widget, not forked)
// against the admin palette's own tokens, aliased to the names sorting.js's
// injected CSS expects.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pagesDir = join(__dirname, 'pages');
const adminDir = join(pagesDir, 'admin');

const index = JSON.parse(readFileSync(join(adminDir, 'sorting-data', 'index.json'), 'utf8'));
const n = (key) => index.groups[key].count.toLocaleString('he-IL');
const total = index.items.length.toLocaleString('he-IL');

const PAGES = [
  {
    slug: 'sorting',
    title: 'חומר למיון',
    lead: `כל מה שהתפרסם ב־waldorf.co.il ועדיין אין לו מקום סופי באתר החדש, ${total} פריטים, מרוכז כאן. הפורום עבר על הערימה וסיווג כל פריט; חלקה, בעיקר מודעות ופרסומים ומאמרים כלליים, לא יועבר לאתר החדש בכלל. השאר ממתין למקום שלו.`,
    body: `
<h2>העמודים</h2>
<ul class="g-list">
<li><a href="./sorting-library.html">ספרים אלקטרוניים</a>: ${n('library')} פריטים.</li>
<li><a href="./sorting-subjects.html">תוכניות לימודים לפי מקצוע</a>: ${n('subjects')} פריטים.</li>
<li><a href="./sorting-capstone.html">עבודות גמר</a>: ${n('capstone')} פריטים.</li>
<li><a href="./sorting-pages.html">דפים מהאתר הישן</a>: ${n('pages')} פריטים.</li>
<li><a href="./sorting-announcements.html">מודעות ופרסומים</a> (לא יועבר לאתר החדש): ${n('announcements')} פריטים.</li>
<li><a href="./sorting-articles.html">מאמרים</a> (לא יועבר לאתר החדש): ${n('articles')} פריטים.</li>
</ul>
<p class="hint">הרשימה נבנתה מה־API של האתר הישן, לא מסריקה, ולכן היא מלאה. עודכנה לאחרונה ב־${index.generated}. לפריטים שהפורום הכריע עליהם מופיעה הערה קצרה.</p>`,
  },
  {
    slug: 'sorting-library',
    group: 'library',
    title: 'ספרים אלקטרוניים',
    lead: `ספרים שפורסמו במלואם באתר הישן: הספר "חינוך ולדורף, עקרונות ויישומים" על כל פרקיו, ולצדו "22 שאלות ותשובות על חינוך ולדורף", ${n('library')} פריטים בסך הכל. שניהם כבר באתר החדש (content-library.html ו-ebooks.html); הרשימה הזאת היא ארכיון, לא רשימת משימות.`,
  },
  {
    slug: 'sorting-subjects',
    group: 'subjects',
    title: 'תוכניות לימודים לפי מקצוע',
    lead: `${n('subjects')} מאמרים שקשורים למקצוע לימוד מסוים. הפורום קבע שאלה תוכניות הלימוד של אותו מקצוע, לא מאמרים כלליים, ורוב המקצועות כבר יש להם עמוד תוכנית באתר החדש. שני מקצועות, בוטמר ומשחקים ואמנות הדיבור, לא נמצאו בשום עמוד תוכנית קיים ועדיין צריכים מקום.`,
  },
  {
    slug: 'sorting-capstone',
    group: 'capstone',
    title: 'עבודות גמר',
    lead: `${n('capstone')} עבודות הגמר שפורסמו באתר הישן. הפורום מיין אותן לשלוש קבוצות (עבודות סמינריוניות, עבודות של מורי ולדורף, עבודות לתואר שני), וכמעט כולן כבר באתר החדש בעמוד משלהן תחת ספריית התוכן.`,
  },
  {
    slug: 'sorting-pages',
    group: 'pages',
    title: 'דפים מהאתר הישן',
    lead: `${n('pages')} עמודי תוכן קבועים של האתר הישן שאין להם מקבילה מלאה באתר החדש. חלקם נכנסו לאתר החדש בגרסה מקוצרת; אחרים סומנו על ידי הפורום כלא רלוונטיים, או ככבר קיימים באתר בצורה אחרת.`,
  },
  {
    slug: 'sorting-announcements',
    group: 'announcements',
    title: 'מודעות ופרסומים',
    lead: `חלק מ"חומר למיון": חומר מהאתר הישן שהפורום החליט שלא יועבר לאתר החדש. נשמר כאן לעיון פנימי בלבד. ${n('announcements')} פריטים.`,
  },
  {
    slug: 'sorting-articles',
    group: 'articles',
    title: 'מאמרים',
    lead: `חלק מ"חומר למיון": חומר מהאתר הישן שהפורום החליט שרובו כבר מתפרסם באתר אחר ולא יועבר לאתר החדש. נשמר כאן לעיון פנימי בלבד. ${n('articles')} פריטים.`,
  },
];

const HEAD = `<!doctype html>
<html lang="he" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow, noarchive">
<link rel="icon" href="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAzMiAzMiI+PHJlY3Qgd2lkdGg9IjMyIiBoZWlnaHQ9IjMyIiByeD0iNyIgZmlsbD0iIzNEMkIxRiIvPjxwYXRoIGQ9Ik0xNiA2Yy02IDMtOCA4LTggMTMgNS0xIDktNSAxMC0xMy0xIDAtMSAwLTIgMHoiIGZpbGw9IiNDNEE4ODIiLz48L3N2Zz4=">
<title>{{TITLE}} (חומר למיון) · מערכת ניהול · ולדורף</title>
<style>
:root{
  --cream:#FAF6F0; --beige:#F0E8DC; --paper:#FFFFFF; --sink:#F4EEE4;
  --tan:#C4A882; --tan-dark:#A88B69; --brown:#6B4F35; --brown-dark:#3D2B1F;
  --ink:#3D2B1F; --muted:#7A6555; --line:#E7DECE;
  --shadow:0 2px 12px rgba(61,43,31,.08);
  --r:9px; --r-lg:16px;
  --font-head:'Frank Ruhl Libre','Arial Hebrew',serif;
  --font-body:'Assistant','Segoe UI','Arial Hebrew',Arial,sans-serif;
  /* aliases so sorting.js's injected CSS, written against the site's own
     token names, resolves correctly against the admin's palette instead */
  --text: var(--ink); --white: var(--paper); --text-muted: var(--muted);
  --radius: var(--r); --radius-lg: var(--r-lg); --radius-organic-sm: 8px;
}
@media (prefers-color-scheme:dark){
  :root{
    --cream:#1F1710; --beige:#2A2019; --paper:#2C221A; --sink:#251C15;
    --tan:#C9A97E; --tan-dark:#D8BE97; --brown:#D8BC93; --brown-dark:#F2E7D8;
    --ink:#F2E7D8; --muted:#B39C84; --line:#3A2D21;
    --shadow:0 2px 12px rgba(0,0,0,.4);
  }
}
*{box-sizing:border-box}
body{margin:0;font-family:var(--font-body);color:var(--ink);background:var(--cream);line-height:1.6}
.wrap{max-width:900px;margin:0 auto;padding:28px 20px 60px}
.crumbs{font-size:.8rem;color:var(--muted);margin:0 0 14px}
.crumbs a{color:var(--brown);text-decoration:none}
.crumbs a:hover{text-decoration:underline}
h1{font-family:var(--font-head);font-size:1.5rem;margin:10px 0 6px}
h2{font-family:var(--font-head);font-size:1.15rem;margin:22px 0 8px}
.lead{color:var(--muted);margin:0 0 20px;max-width:70ch}
.note{background:var(--beige);border-radius:var(--r);padding:10px 16px;font-size:.85rem;color:var(--brown-dark);margin:0 0 20px}
.hint{font-size:.82rem;color:var(--muted)}
.g-list{list-style:none;margin:0 0 16px;padding:0;display:flex;flex-direction:column;gap:6px}
.g-list a{color:var(--brown);font-weight:600;text-decoration:none}
.g-list a:hover{text-decoration:underline}
:focus-visible{outline:2.5px solid var(--tan-dark);outline-offset:2px;border-radius:4px}
</style>
</head>
<body>
<div class="wrap">
<p class="crumbs"><a href="./index.html">מערכת הניהול</a> / <a href="./sorting.html">חומר למיון</a>{{CRUMB_TAIL}}</p>
<h1>{{TITLE}}</h1>
<p class="lead">{{LEAD}}</p>
<p class="note">זמני ופנימי: לא חלק מהאתר הציבורי, ולא מופיע בתפריט הניווט.</p>
{{BODY}}
</div>
<script src="../sorting.js" defer></script>
</body>
</html>
`;

let written = 0;
for (const page of PAGES) {
  const crumbTail = page.slug === 'sorting' ? '' : ` / ${page.title}`;
  const docTitle = page.slug === 'sorting' ? page.title : `${page.title} (חומר למיון)`;
  const body = page.group
    ? `<main data-sorting-group="${page.group}"><div class="si-app"></div></main>`
    : page.body;
  let html = HEAD
    .replace('<title>{{TITLE}} (חומר למיון) · מערכת ניהול · ולדורף</title>',
      `<title>${docTitle} · מערכת ניהול · ולדורף</title>`)
    .replaceAll('{{TITLE}}', page.title)
    .replaceAll('{{CRUMB_TAIL}}', crumbTail)
    .replaceAll('{{LEAD}}', page.lead)
    .replaceAll('{{BODY}}', body);
  writeFileSync(join(adminDir, `${page.slug}.html`), html, 'utf8');
  written += 1;
}
console.log(`${written} sorting page(s) written to pages/admin/.`);
