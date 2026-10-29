/* news.js: הודעות, the forum's own announcements.
 *
 * The same rows as the announcements board in the moderation view, which is
 * where visitors' submissions are read, approved and rejected. This view is for
 * writing and editing; its bin is the same bin.
 */
(function () {
  'use strict';
  var A = window.WAdmin, td = A.td;

  var FIELDS = [
    { name: 'title', label: 'כותרת' },
    { name: 'date', label: 'תאריך פרסום', type: 'date' },
    { name: 'expires', label: 'תאריך תפוגה (לא חובה)', type: 'date', hint: 'היום האחרון שבו ההודעה מוצגת באתר. אחריו היא עוברת לפרסומים שפג תוקפם.' },
    { name: 'section', label: 'מדור', type: 'select', options: ['מאמרים', 'מודעות ופרסומים', 'איגרת', 'מוסדות', 'כללי'] },
    { name: 'contact', label: 'שם ופרטי קשר של המפרסם' },
    { name: 'link', label: 'קישור (לא חובה)' },
    { name: 'summary', label: 'תוכן ההודעה', type: 'textarea', wide: true }
  ];
  A.NEWS_FIELDS = FIELDS;

  var list;
  A.view({
    name: 'news',
    render: function () {
      list = A.listPanel({
        col: 'news', panel: A.$('.view[data-view="news"] .panel'), fields: FIELDS,
        // An admin's announcement goes straight up; an editor's waits for one
        // (the Worker sets it to pending either way).
        defaults: function () { return { date: A.todayISO(), status: 'approved' }; },
        beforeSave: function (out) { out.status = 'approved'; },
        cols: ['תאריך פרסום', 'כותרת', 'מדור', 'תפוגה', 'סטטוס', ''],
        empty: 'אין הודעות',
        sort: function (a, b) {
          var ap = a.status === 'pending' ? 0 : 1, bp = b.status === 'pending' ? 0 : 1;
          if (ap !== bp) return ap - bp;
          return a.date < b.date ? 1 : -1;
        },
        actions: function (n) {
          return n.status === 'pending' && A.atLeast('admin') ? [A.actBtn('ok', 'אישור ופרסום', function () {
            WStore.update('news', n.id, { status: 'approved' }); A.refreshAll();
          })] : [];
        },
        row: function (n) {
          return [
            td(A.fmtDate(n.date), 'muted tnum'),
            A.titleCell(n.title, n.demo),
            td(n.section || A.NONE, 'muted'),
            td(n.expires ? A.fmtDate(n.expires) : A.NONE, 'muted tnum'),
            td(A.statusPill(A.expired(n) ? 'expired' : n.status || 'approved'))
          ];
        }
      });
    },
    draw: function () { if (list) list.draw(); }
  });
})();
