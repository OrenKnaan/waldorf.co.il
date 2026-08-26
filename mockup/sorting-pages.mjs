// Generates the seven "חומר למיון" pages from an existing page's skeleton, so
// they inherit the site's stylesheet, header, nav, footer and the accessibility
// and search layers verbatim instead of a second copy that can drift.
//
//   node mockup/sorting-content.mjs     # first — writes pages/sorting-data/
//   node mockup/sorting-pages.mjs       # then — writes pages/sorting-*.html
//   node mockup/patch-sorting-nav.mjs   # then — nav entry on every page
//   node mockup/patch-accessibility.mjs && node mockup/patch-search.mjs && …
//
// Safe to re-run: it only ever writes pages/sorting*.html, never an existing
// page. Re-running does discard hand edits to those seven, and drops whatever
// the patchers added to them — so re-run the patchers afterwards, as above.
//
// TEMPORARY, like everything else in this section (CLAUDE.md, "Launch cutover").
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pagesDir = join(__dirname, 'pages');

const index = JSON.parse(readFileSync(join(pagesDir, 'sorting-data', 'index.json'), 'utf8'));
const n = (key) => index.groups[key].count.toLocaleString('he-IL');
const total = index.items.length.toLocaleString('he-IL');

// The one place the section's temporariness is stated in the page itself. Every
// page of the section carries it; it is the visible half of the note in
// CLAUDE.md that says this whole thing comes out at cutover.
const BADGE = '<p><span class="pending-badge">זמני<span class="sr-only"> — מדור למיון תוכן, אינו חלק מהאתר הסופי</span></span></p>';

const PAGES = [
  {
    slug: 'sorting',
    title: 'חומר למיון',
    lead: `כל מה שמתפרסם היום ב־waldorf.co.il ואין לו עדיין מקום באתר החדש — ${total} פריטים — מרוכז כאן, כדי שאפשר יהיה לעבור עליו ולהחליט מה נכנס לאתר, לאן, ומה נגנז.`,
    body: `
<section class="card">
<h2>מה זה המדור הזה</h2>
<p>האתר החדש נכתב מחדש, והתוכן שלו קצר ומסודר יותר מזה של האתר הישן. בדרך נשארו מאחור מאמרים, עבודות גמר, פרקי ספר, מודעות ועמודי תוכן שלמים — חומר שאיש עוד לא החליט לגביו.</p>
<p>המדור הזה הוא ערימת המיון. הוא לא נועד לקוראי האתר אלא לצוות שעובר על התוכן, ולכן הוא מסומן <b>זמני</b> ואינו מופיע במנועי חיפוש. כשהמיון יסתיים — המדור כולו יוסר, יחד עם הנתונים שמאחוריו והקישור בתפריט.</p>
<p>שום דבר כאן לא הועתק על חשבון תוכן קיים: העמודים הקיימים באתר לא נגעו, והחומר כאן נוסף לצדם.</p>
</section>

<section class="card">
<h2>העמודים</h2>
<div class="grid cols-2">
<p><a href="./sorting-library.html">ספרייה</a> — ספרים שפורסמו במלואם באתר הישן (<span data-si-count="library">${n('library')}</span> פרקים).</p>
<p><a href="./sorting-articles.html">מאמרים</a> — מאמרים פדגוגיים כלליים (<span data-si-count="articles">${n('articles')}</span>).</p>
<p><a href="./sorting-subjects.html">מאמרים לפי מקצוע</a> — מאמרים הקשורים למקצוע לימוד מסוים (<span data-si-count="subjects">${n('subjects')}</span>).</p>
<p><a href="./sorting-capstone.html">עבודות גמר</a> — עבודות הגמר של סמינר המורים (<span data-si-count="capstone">${n('capstone')}</span>).</p>
<p><a href="./sorting-announcements.html">מודעות ופרסומים</a> — הודעות, אירועים ואיגרות מהשנים האחרונות (<span data-si-count="announcements">${n('announcements')}</span>).</p>
<p><a href="./sorting-pages.html">דפים מהאתר הישן</a> — עמודי תוכן קבועים שאין להם מקבילה מלאה (<span data-si-count="pages">${n('pages')}</span>).</p>
</div>
</section>

<section class="card">
<h2>מאיפה החומר הגיע, ומה כדאי לדעת עליו</h2>
<ul>
<li>הרשימה נבנתה מה־API של האתר הישן עצמו, ולא מסריקה — כלומר היא מלאה. עודכנה לאחרונה ב־${index.generated}.</li>
<li>לכל פריט מופיע קישור לעמוד המקורי, וגם היעד שאליו ההפניה מהכתובת הישנה מובילה כיום לפי <code>migration/url-map.csv</code>.</li>
<li>קבצים ותמונות עדיין נטענים מהאתר הישן. ביום המעבר הם יפסיקו לעבוד עד שיועתקו — זו אותה שאלה פתוחה שמסמך ההגירה מעלה לגבי <code>/wp-content/uploads</code>.</li>
<li>עמודים שנכנסו לאתר החדש בגרסה מקוצרת מסומנים ככאלה. בהם מעניין דווקא מה שנחתך.</li>
</ul>
</section>`,
  },
  {
    slug: 'sorting-library',
    group: 'library',
    title: 'ספרייה',
    lead: `ספרים שפורסמו במלואם באתר הישן. כרגע יש כאן ספר אחד — «חינוך ולדורף – עקרונות ויישומים» — על כל ${n('library')} פרקיו; ספרים נוספים שיימצאו ייכנסו לאותו עמוד.`,
  },
  {
    slug: 'sorting-articles',
    group: 'articles',
    title: 'מאמרים',
    lead: `${n('articles')} מאמרים פדגוגיים כלליים מהאתר הישן. חלק מהמאמרים החדשים הם פסקת פתיחה וקישור למאמר המלא באתר חיצוני; הוותיקים מהם מובאים במלואם.`,
  },
  {
    slug: 'sorting-subjects',
    group: 'subjects',
    title: 'מאמרים לפי מקצוע',
    lead: `${n('subjects')} מאמרים שקשורים למקצוע לימוד מסוים — מוזיקה, היסטוריה, מלאכות יד וכן הלאה. לכל אחד מהמקצועות האלה כבר יש עמוד באתר החדש, תחת «תוכניות לימודים», והשאלה לגבי כל מאמר היא אם מקומו שם.`,
  },
  {
    slug: 'sorting-capstone',
    group: 'capstone',
    title: 'עבודות גמר',
    lead: `${n('capstone')} עבודות הגמר שפורסמו באתר הישן, רובן בטקסט מלא ובהיקף של עשרות עמודים. באתר החדש יש עמוד «עבודות גמר» אחד, בלי עמוד לעבודה בודדת — וזו ההחלטה הגדולה שהערימה הזאת מציבה.`,
  },
  {
    slug: 'sorting-announcements',
    group: 'announcements',
    title: 'מודעות ופרסומים',
    lead: `${n('announcements')} מודעות, הזמנות לכנסים, איגרות ועדכוני פורום מ־2015 ואילך. חלק גדול מהן קשור לאירוע שכבר עבר, ולכן זו הערימה שסביר שרובה תיגנז — אבל לא לפני שמישהו יעבור עליה.`,
  },
  {
    slug: 'sorting-pages',
    group: 'pages',
    title: 'דפים מהאתר הישן',
    lead: `${n('pages')} עמודי תוכן קבועים של האתר הישן שאין להם מקבילה מלאה באתר החדש. חלקם נכנסו לאתר החדש בגרסה מקוצרת, ואז החומר המעניין הוא מה שנחתך; אחרים לא נכנסו כלל.`,
  },
];

// ---------- skeleton ----------
// media.html: a page with no `page overrides` CSS block of its own, so nothing
// page-specific rides along.
const skeleton = readFileSync(join(pagesDir, 'media.html'), 'utf8');

// Same FNV-1a anchor patch-search.mjs writes onto every other page's <h2>.
// Generating them here rather than letting the patcher do it keeps that run a
// no-op over this section: it only touches an <h2> that has no id yet.
function sectionId(heading) {
  let h = 0x811c9dc5;
  for (let i = 0; i < heading.length; i += 1) {
    h ^= heading.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return `sec-${h.toString(36)}`;
}

const withAnchors = (html) => html.replace(/<h2>([^<]+)<\/h2>/g,
  (m, text) => `<h2 id="${sectionId(text.trim())}">${text}</h2>`);

function crumbs(page) {
  const home = '<a class="crumb" href="./home.html">דף הבית</a>\n<span class="crumb-sep" aria-hidden="true">/</span>\n';
  const section = page.slug === 'sorting' ? '' :
    '<a class="crumb" href="./sorting.html">חומר למיון</a>\n<span class="crumb-sep" aria-hidden="true">/</span>\n';
  return `${home}${section}<span class="crumb current" aria-current="page">${page.title}</span>`;
}

function schema(page) {
  const list = [{ name: 'דף הבית', item: './home.html' }];
  if (page.slug !== 'sorting') list.push({ name: 'חומר למיון', item: './sorting.html' });
  if (page.slug !== 'sorting') list.push({ name: page.title, item: `./${page.slug}.html` });
  else list[1] = undefined;
  const items = list.filter(Boolean).map((c, i) => `    {
      "@type": "ListItem",
      "position": ${i + 1},
      "name": "${c.name}",
      "item": "${c.item}"
    }`).join(',\n');
  return `<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
${items}
  ]
}
</script>`;
}

function mainFor(page) {
  const attr = page.group ? ` data-sorting-group="${page.group}"` : ' data-sorting-group="index"';
  const body = page.group
    ? `  <div class="si-app">
    <noscript><p>רשימת החומרים נטענת עם JavaScript. בלעדיו אפשר לגשת לחומר המקורי ישירות באתר הישן, <a href="https://www.waldorf.co.il/">waldorf.co.il</a>.</p></noscript>
  </div>`
    : withAnchors(page.body.trim());
  return `<main id="main-content" tabindex="-1"${attr}>
  <nav class="pagebanner" aria-label="breadcrumb">
    <span class="crumbs">
${crumbs(page)}
</span>
  </nav>
  <h1>${page.title}</h1>
<p>${page.lead}</p>
${BADGE}

${body}

</main>`;
}

let written = 0;
for (const page of PAGES) {
  let html = skeleton;
  html = html.replace(/<title>[^<]*<\/title>/, `<title>${page.title} — מוקאפ</title>`);
  html = html.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/, schema(page));
  html = html.replace(/<main[\s\S]*?<\/main>/, mainFor(page));
  // This section renders nothing out of D1, so it has no use for the content
  // store — and store.js fetches every collection the moment it loads.
  html = html.replace('<script src="./store.js"></script>\n', '');
  html = html.replace('<script src="./dynamic.js"></script>\n', '');
  // …and with them the skeleton page's own render calls, which would otherwise
  // throw on every page of this section: WDyn is defined by dynamic.js.
  html = html.replace(/<script>\n(?:[^<]*WDyn[^<]*\n)+<\/script>\n/g, '');
  html = html.replace('<script src="./breadcrumb.js" defer></script>',
    '<script src="./sorting.js" defer></script>\n<script src="./breadcrumb.js" defer></script>');
  writeFileSync(join(pagesDir, `${page.slug}.html`), html, 'utf8');
  written += 1;
}
console.log(`${written} sorting page(s) written.`);
