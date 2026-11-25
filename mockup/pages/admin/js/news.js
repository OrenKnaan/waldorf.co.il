/* news.js: לוח מודעות, the forum's announcements and visitors' submissions.
 *
 * The board itself is drawn by mod.js, which also reads, approves and rejects
 * the submissions, so writing, editing and moderating are one table in one tab.
 * This file holds what is particular to announcements: their fields, and how a
 * new one starts out.
 */
(function () {
  'use strict';
  var A = window.WAdmin;

  A.NEWS_FIELDS = [
    { name: 'title', label: 'כותרת' },
    { name: 'date', label: 'תאריך פרסום', type: 'date' },
    { name: 'expires', label: 'תאריך תפוגה (לא חובה)', type: 'date', hint: 'היום האחרון שבו ההודעה מוצגת באתר. אחריו היא עוברת לפרסומים שפג תוקפם.' },
    { name: 'section', label: 'מדור', type: 'select', options: ['מאמרים', 'מודעות ופרסומים', 'איגרת', 'מוסדות', 'כללי'] },
    { name: 'contact', label: 'שם ופרטי קשר של המפרסם' },
    { name: 'link', label: 'קישור (לא חובה)', upload: 'news' },
    { name: 'summary', label: 'תוכן ההודעה', type: 'textarea', wide: true }
  ];

  A.NEWS_ADD = {
    label: 'הודעה חדשה',
    // An admin's announcement goes straight up; an editor's waits for one
    // (the Worker sets it to pending either way).
    defaults: function () { return { date: A.todayISO(), status: 'approved' }; },
    beforeSave: function (out) { out.status = 'approved'; }
  };
})();
