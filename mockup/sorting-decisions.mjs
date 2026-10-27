// The forum's decisions on "חומר למיון", 2026-10-11, applied to the raw scrape
// sorting-content.mjs builds before it is sorted and written. Kept separate so
// a re-run against the WordPress API does not lose them.
//
// Three kinds of decision:
//  - MOVES: an item changes group and/or bucket.
//  - DROPS: an item is excluded entirely (superseded, or explicitly rejected).
//  - NOTES: an item stays put but carries a short reviewer's note.
// Capstone's year buckets are replaced by three content-type buckets by rule,
// not by id, since the forum's instruction was "everything from year X".

export const GROUP_TITLE_OVERRIDE = {
  library: 'ספרים אלקטרוניים',
  subjects: 'תוכניות לימודים לפי מקצוע',
};

// All six groups are admin-only as of 2026-10-18: the forum's classification
// work is done, but at least two subject buckets (בוטמר ומשחקים, אמנות
// הדיבור) turned out to have no confirmed home on the new site yet, so the
// whole pile stays off the public site until that is resolved, visible only
// from the admin dashboard (see mockup/sorting-pages.mjs). announcements and
// articles were already admin-only before that, for a different reason: the
// forum does not want that material considered for the new site at all.
export const ADMIN_ONLY_GROUPS = ['library', 'subjects', 'capstone', 'pages', 'announcements', 'articles'];

export const DROP_IDS = new Set([
  'p1913', // "חלום חדש", פרוייקט חינוך לקיימות: הפורום ביקש להוריד אותו.
  'g1927', // "על סינתזה ואנליזה...": כפילות של p2320, שכבר בעבודות גמר.
  'g1928', // "התפתחות לימודי השירה והמוזיקה...": כפילות של p2319, שם.
]);

export const MOVES = {
  // "22 שאלות ותשובות": הפורום ביקש לשבץ אותו עם הספר, במדור החדש.
  g1925: { group: 'library', bucket: '22 שאלות ותשובות על חינוך ולדורף', order: 0 },
  // "תוכניות לימודים" (עמוד מהאתר הישן): שייך לתוכניות הלימוד, לא לדפים כלליים.
  g1345: { group: 'subjects', bucket: 'כללי' }, // מבוא ליסודי
  g1695: { group: 'subjects', bucket: 'כללי' }, // מבוא לתיכון
  g585: { group: 'subjects', bucket: 'מלאכות יד' }, // תוכנית המלאכות בתיכון
  // מאמרים פדגוגיים של מורים, לא מאמרי ירון שהפורום החליט לא להעביר.
  g1921: { bucket: 'מאמרים של מורים בחינוך ולדורף' },
  g1924: { bucket: 'מאמרים של מורים בחינוך ולדורף' },
};

const THESIS_IDS = new Set(['p2812', 'p2764', 'm1']);
const TEACHER_IDS = new Set(['p2903']);

// Items that live only in this repo, never on the old site's WordPress API:
// handed to us directly rather than scraped. Metadata here, body in
// mockup/manual-items/<id>.html; sorting-content.mjs merges them into the
// scrape before grouping and sorting, so a re-run against the API does not
// lose them.
export const MANUAL_ITEMS = [
  {
    id: 'm1',
    group: 'capstone',
    title: 'העמקת העבודה הפנימית והתרגול המדיטטיבי בקרב מורים בחינוך ולדורף',
    author: 'שחר סלע',
    date: '2026-09-01',
    cats: ['עבודות גמר'],
  },
];

// Applied only within the capstone group, after MOVES/DROPS, replacing the
// year bucket with one of three content-type buckets.
function capstoneBucket(item) {
  if (THESIS_IDS.has(item.id)) return 'עבודות תזה לתואר שני';
  if (item.bucket === '2023' || TEACHER_IDS.has(item.id)) return 'עבודות על חינוך ולדורף של מורים שונים';
  return 'עבודות סמינריוניות';
}

const BLANKET_NOTE = 'הפורום: חלק מהרשימה הראשונית שאינה רלוונטית להעברה.';
const SCHOOL_KINDER_NOTE = 'הפורום: החומר הזה כבר קיים באתר החדש.';
const FORUM_EVENTS_NOTE = 'הפורום: לא רלוונטי כרגע (לוח אירועים/פורום).';
// 2026-10-18: Gilad's answer to the two subject buckets with no confirmed
// home anywhere on the new site (see CLAUDE.md, "The triage section").
const BOTHMER_NOTE = 'גלעד: אפשר לוותר, לא יועבר לאתר החדש.';
const SPEECH_ARTS_NOTE = 'גלעד: הועבר למדור הספרים האלקטרוניים (lib-speech-arts.html).';

export const NOTES = {
  g2087: 'הפורום: כבר טופל, הספר במדור "ספרים אלקטרוניים".',
  g1295: 'הפורום: באתר החדש צריך להיות דף קישורים, לבדוק אם קיים.',
  p3003: BOTHMER_NOTE,
  p3001: BOTHMER_NOTE,
  p1602: SPEECH_ARTS_NOTE,
  p1604: SPEECH_ARTS_NOTE,
  p1605: SPEECH_ARTS_NOTE,
  p1606: SPEECH_ARTS_NOTE,
  p1607: SPEECH_ARTS_NOTE,
  g1051: BLANKET_NOTE,
  g779: BLANKET_NOTE,
  g1001: BLANKET_NOTE,
  g2776: BLANKET_NOTE,
  g1799: BLANKET_NOTE,
  g654: BLANKET_NOTE,
  g1848: BLANKET_NOTE,
  g1054: BLANKET_NOTE,
  g2710: SCHOOL_KINDER_NOTE,
  g1008: SCHOOL_KINDER_NOTE,
  g1046: SCHOOL_KINDER_NOTE,
  g607: SCHOOL_KINDER_NOTE,
  g1045: SCHOOL_KINDER_NOTE,
  g1078: SCHOOL_KINDER_NOTE,
  g1005: SCHOOL_KINDER_NOTE,
  g1084: SCHOOL_KINDER_NOTE,
  g1076: SCHOOL_KINDER_NOTE,
  g563: SCHOOL_KINDER_NOTE,
  g1332: FORUM_EVENTS_NOTE,
  g1505: FORUM_EVENTS_NOTE,
  g2594: FORUM_EVENTS_NOTE,
};

// items: the raw array sorting-content.mjs builds, before the final sort.
// Mutates nothing; returns a new array.
export function applyDecisions(items) {
  const out = [];
  for (const raw of items) {
    if (DROP_IDS.has(raw.id)) continue;
    let item = raw;
    const move = MOVES[item.id];
    if (move) item = { ...item, ...move };
    if (item.group === 'capstone') item = { ...item, bucket: capstoneBucket(item) };
    const note = NOTES[item.id];
    if (note) item = { ...item, note };
    out.push(item);
  }
  return out;
}
