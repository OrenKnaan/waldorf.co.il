/* data.js — נתוני seed לאלמנטים הדינמיים של המוקאפ.
   בייצור: כל אוסף כאן הופך לטבלת D1 מאחורי Workers API (ראו docs/plan-dynamic-elements-technical.md).
   פריטים שאינם מהאתר הישן מסומנים demo:true ומוצגים עם הבהרת "רשומת הדגמה". */
window.WALDORF_DATA = {

  /* לוח אירועים — לא אותרו אירועים פעילים באתר הישן; כל הרשומות הדגמה */
  events: [
    { id: 'ev1', title: 'כנס המורים הארצי תשפ"ז', date: '2026-11-15', time: '09:00–17:00',
      location: 'הרדוף', description: 'הכנס השנתי לכל המחנכים העוסקים בעבודה פעילה בגנים ובבתי ספר ולדורף.',
      registerUrl: 'https://forms.google.com/', status: 'published', demo: true },
    { id: 'ev2', title: 'כנס גננות ולדורף', date: '2026-11-22', time: '08:30–15:00',
      location: 'קריית טבעון', description: 'יום עיון ארצי לגננות: התפתחות הילד בגיל הרך, שירים ומעגלי בוקר.',
      registerUrl: 'https://forms.google.com/', status: 'published', demo: true },
    { id: 'ev3', title: 'סדנת הכשרת מורים — מתמטיקה', date: '2026-12-05', time: '10:00–16:00',
      location: 'ירושלים', description: 'סדנה מעשית להוראת חשבון בכיתות א׳–ד׳ ברוח ולדורף.',
      registerUrl: '', status: 'draft', demo: true },
    { id: 'ev4', title: 'יום עיון להורים', date: '2027-01-18', time: '09:00–13:00',
      location: 'תל אביב', description: 'מפגש פתוח להורים: מהו חינוך ולדורף וכיצד בוחרים מסגרת לילד.',
      registerUrl: 'https://forms.google.com/', status: 'published', demo: true },
    { id: 'ev5', title: 'פתיחת שנת הלימודים תשפ"ז', date: '2026-09-01', time: '',
      location: '', description: 'ברכת הפורום הארצי לפתיחת שנת הלימודים בכל מוסדות ולדורף.',
      registerUrl: '', status: 'published', demo: true }
  ],

  /* הודעות — פריטים אמיתיים שנסרקו מהאתר הישן (מאמרים + מודעות ופרסומים) */
  news: [
    { id: 'nw1', date: '2026-07-22', section: 'מאמרים', title: 'איך נולדת תקופה?',
      summary: 'הצצה אל מאחורי הקלעים של עבודת מחנך ולדורף בבניית תקופת לימוד.', link: '' },
    { id: 'nw2', date: '2026-07-20', section: 'מודעות ופרסומים', title: 'אסופת קישורים בנושא החופש הגדול',
      summary: 'כלים ורעיונות למשפחות לקראת חופשת הקיץ.', link: '' },
    { id: 'nw3', date: '2026-07-20', section: 'מודעות ופרסומים', title: 'שלום כיתה א\'',
      summary: 'מדריך מקיף להורים לקראת המעבר לבית הספר.', link: '' },
    { id: 'nw4', date: '2026-06-27', section: 'מאמרים', title: '"זה היה בחברות"',
      summary: 'מדריך למחנך להתמודדות עם אלימות ומשחקי נערים בגיל המצווה.', link: '' },
    { id: 'nw5', date: '2026-05-08', section: 'מאמרים', title: 'ימי מונדיאל: מה בין כדורגל ובין חינוך ולדורף?',
      summary: '', link: '' },
    { id: 'nw6', date: '2026-04-15', section: 'מודעות ופרסומים', title: 'יום הזיכרון לחללי מערכות ישראל ולנפגעי פעולות איבה',
      summary: 'אסופת מאמרים ומשאבים.', link: '' }
  ],

  /* אודות הפורום — ברירת המחדל היא הטקסט הקבוע בעמוד; כאן נשמרות עריכות מהאדמין */
  about: null,

  /* לוח קהילתי — פתוח, ללא הרשמה, מודרציה ידנית. רשומת הדגמה אחת */
  board: [
    { id: 'bd1', title: 'ציוד יצירה לכיתת גן — למסירה', category: 'ציוד',
      description: 'צמר סרוק, גושי שעווה וקרשי ציור במצב טוב, ממשפחה שילדיה סיימו את הגן.',
      region: 'מרכז', contact: 'demo@example.com', date: '2026-07-10', status: 'approved', demo: true }
  ],

  /* לוח משרות — עמוד חדש (אין מקבילה באתר הישן). רשומת הדגמה אחת */
  jobs: [
    { id: 'jb1', role: 'מחנך/ת כיתה א\'', institution: 'בית ספר ולדורף (דוגמה)', category: 'הוראה',
      region: 'צפון', scope: 'משרה מלאה', contact: 'jobs-demo@example.com',
      description: 'דרוש/ה מחנך/ת לכיתה א\' לשנת הלימודים תשפ"ז. עדיפות לבוגרי הכשרת ולדורף.',
      date: '2026-07-01', status: 'approved', demo: true }
  ],

  /* עבודות ומאמרים — כותרים אמיתיים מהאתר הישן; קישורים יתקבלו מהפורום */
  library: [
    { id: 'lb1', kind: 'מאמר', title: 'איך נולדת תקופה?',
      description: 'הצצה אל מאחורי הקלעים של עבודת מחנך ולדורף בבניית תקופת לימוד.', url: '' },
    { id: 'lb2', kind: 'מאמר', title: '"זה היה בחברות"',
      description: 'מדריך למחנך להתמודדות עם אלימות ומשחקי נערים בגיל המצווה.', url: '' },
    { id: 'lb3', kind: 'מאמר', title: 'ימי מונדיאל: מה בין כדורגל ובין חינוך ולדורף?',
      description: '', url: '' },
    { id: 'lb4', kind: 'עבודה אקדמית', title: 'עבודה סמינריונית — הכשרות ולדורף במכללת דוד ילין (דוגמה)',
      description: 'ייצוג לעבודות הסמינריוניות שנכתבו במסגרות ההכשרה האקדמיות.', url: '', demo: true },
    { id: 'lb5', kind: 'עבודת סיום', title: 'עבודת סיום הכשרה לחינוך ולדורף (דוגמה)',
      description: 'ייצוג לעבודות סיום של הכשרות לא-אקדמיות ועבודות פנימיות של מחנכים.', url: '', demo: true }
  ],

  /* חומרי הוראה — לפי הקבוצות שבעמוד; הקבצים בפועל יתקבלו מהפורום */
  teaching: [
    { id: 'tc1', group: 'סיפורים, שירים ודקלומים', title: 'דקלומי בוקר לכיתות א\'–ג\' (דוגמה)', url: '', demo: true },
    { id: 'tc2', group: 'דפי עבודה להדפסה', title: 'דפי ציור צורות — כיתה א\' (דוגמה)', url: '', demo: true },
    { id: 'tc3', group: 'מצגות ותמונות להוראה', title: 'תמונות לתקופת הבניה — כיתה ג\' (דוגמה)', url: '', demo: true },
    { id: 'tc4', group: 'חומרי העשרה לתיכון', title: 'מקורות לתקופת תולדות האמנות (דוגמה)', url: '', demo: true }
  ],

  /* מאגר טפסים — לא אותרו טפסים באתר הישן; רשומות הדגמה */
  forms: [
    { id: 'fm1', category: 'הרשמה', title: 'טופס הרשמה לגן ולדורף', description: 'טופס הרשמה אחיד לשנת הלימודים.', url: '', demo: true },
    { id: 'fm2', category: 'בקשות', title: 'בקשת הצטרפות מוסד לפורום הארצי', description: 'עבור יוזמות ומוסדות המבקשים ליווי.', url: '', demo: true },
    { id: 'fm3', category: 'אישורים', title: 'אישור הורים לפעילות חוץ', description: 'נוסח מומלץ למוסדות.', url: '', demo: true }
  ],

  /* נקודות מפה — גני ילדים לפי יישוב, מהמאגר שנסרק מאנתרו. מיקום מקורב ברמת יישוב */
  mapPoints: [
    { id: 'mp1',  name: 'גני ולדורף בירושלים',      town: 'ירושלים',      count: 7, lat: 31.778, lng: 35.212, url: './kinder-list.html' },
    { id: 'mp2',  name: 'גני ולדורף בתל אביב',      town: 'תל אביב',      count: 6, lat: 32.075, lng: 34.780, url: './kinder-list.html' },
    { id: 'mp3',  name: 'גני ולדורף ברמת גן',       town: 'רמת-גן',       count: 6, lat: 32.070, lng: 34.824, url: './kinder-list.html' },
    { id: 'mp4',  name: 'גני ולדורף בפרדס חנה',     town: 'פרדס חנה',     count: 6, lat: 32.474, lng: 34.970, url: './kinder-list.html' },
    { id: 'mp5',  name: 'גני ולדורף בקריית טבעון',  town: 'קריית טבעון',  count: 5, lat: 32.716, lng: 35.127, url: './kinder-list.html' },
    { id: 'mp6',  name: 'גני ולדורף בפתח תקווה',    town: 'פתח תקווה',    count: 5, lat: 32.089, lng: 34.886, url: './kinder-list.html' },
    { id: 'mp7',  name: 'גני ולדורף בכפר הירוק',    town: 'הכפר הירוק',   count: 5, lat: 32.135, lng: 34.837, url: './kinder-list.html' },
    { id: 'mp8',  name: 'גני ולדורף בנס ציונה',     town: 'נס ציונה',     count: 4, lat: 31.930, lng: 34.798, url: './kinder-list.html' },
    { id: 'mp9',  name: 'גני ולדורף בהוד השרון',    town: 'הוד השרון',    count: 4, lat: 32.150, lng: 34.893, url: './kinder-list.html' },
    { id: 'mp10', name: 'גני ולדורף בבית קשת',      town: 'בית קשת',      count: 4, lat: 32.680, lng: 35.397, url: './kinder-list.html' },
    { id: 'mp11', name: 'גני ולדורף בבאר שבע',      town: 'באר-שבע',      count: 4, lat: 31.252, lng: 34.791, url: './kinder-list.html' },
    { id: 'mp12', name: 'גני ולדורף בתעוז',         town: 'תעוז',         count: 3, lat: 31.766, lng: 34.955, url: './kinder-list.html' },
    { id: 'mp13', name: 'גני ולדורף בעמק חפר',      town: 'עמק חפר',      count: 3, lat: 32.343, lng: 34.926, url: './kinder-list.html' },
    { id: 'mp14', name: 'גני ולדורף בשוהם',         town: 'שוהם',         count: 2, lat: 31.999, lng: 34.946, url: './kinder-list.html' },
    { id: 'mp15', name: 'גני ולדורף ברמת השרון',    town: 'רמת השרון',    count: 2, lat: 32.146, lng: 34.839, url: './kinder-list.html' },
    { id: 'mp16', name: 'גני ולדורף ברחובות',       town: 'רחובות',       count: 2, lat: 31.894, lng: 34.809, url: './kinder-list.html' },
    { id: 'mp17', name: 'גני ולדורף בציפורי',       town: 'ציפורי',       count: 2, lat: 32.753, lng: 35.278, url: './kinder-list.html' },
    { id: 'mp18', name: 'גני ולדורף בגדרה',         town: 'גדרה',         count: 2, lat: 31.813, lng: 34.777, url: './kinder-list.html' },
    { id: 'mp19', name: 'גני ולדורף בגבעתיים',      town: 'גבעתיים',      count: 2, lat: 32.072, lng: 34.810, url: './kinder-list.html' },
    { id: 'mp20', name: 'גן שירת מדבר — אילת',      town: 'אילת',         count: 1, lat: 29.558, lng: 34.948, url: './kinder-list.html' },
    { id: 'mp21', name: 'גן ולדורף — שבי ציון',     town: 'שבי ציון',     count: 1, lat: 32.982, lng: 35.084, url: './kinder-list.html' }
  ],

  /* סרטונים — לא אותרה ספריית סרטונים באתר הישן; רשומות הדגמה (בלי מזהי יוטיוב אמיתיים) */
  videos: [
    { id: 'vd1', title: 'מהו חינוך ולדורף? (דוגמה)', youtubeId: '',
      description: 'סרטון היכרות קצר להורים — יוחלף בסרטון אמיתי של הפורום.', demo: true },
    { id: 'vd2', title: 'יום בגן ולדורף (דוגמה)', youtubeId: '',
      description: 'מצלמה מלווה בוקר שלם בגן: מעגל בוקר, משחק חופשי ויצירה.', demo: true },
    { id: 'vd3', title: 'סיור בבית ספר ולדורף (דוגמה)', youtubeId: '',
      description: 'הצצה לכיתות, למרחבי היצירה ולחצר.', demo: true }
  ],

  /* פודקאסט — לא אותר פודקאסט קיים; רשומות הדגמה */
  podcast: [
    { id: 'pd1', num: 1, title: 'למה ולדורף? שיחה עם מחנכת ותיקה (דוגמה)', date: '2026-06-01',
      duration: '42 דק\'', description: 'פרק פתיחה: שורשי החינוך, ההתפתחות בארץ ומה קורה בכיתה.', url: '', demo: true },
    { id: 'pd2', num: 2, title: 'התפתחות הילד בשבע השנים הראשונות (דוגמה)', date: '2026-06-15',
      duration: '38 דק\'', description: 'על חיקוי, קצב ומשחק חופשי בגיל הרך.', url: '', demo: true },
    { id: 'pd3', num: 3, title: 'הכשרת מורים — איך נעשים מחנך ולדורף? (דוגמה)', date: '2026-07-01',
      duration: '45 דק\'', description: 'שיחה עם צוות המכון בירושלים על מסלול ההכשרה.', url: '', demo: true }
  ]
};
