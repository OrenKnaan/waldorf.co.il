/* events.js: אירועים */
(function () {
  'use strict';
  var A = window.WAdmin, td = A.td;

  var FIELDS = [
    { name: 'title', label: 'כותרת' },
    { name: 'date', label: 'תאריך', type: 'date' },
    { name: 'time', label: 'שעות (למשל 09:00-13:00)' },
    { name: 'location', label: 'מיקום' },
    { name: 'registerUrl', label: 'קישור הרשמה (טופס גוגל)' },
    { name: 'status', label: 'סטטוס', type: 'select', options: [{ v: 'published', t: 'מפורסם' }, { v: 'frozen', t: 'מוקפא (מוסתר מהאתר)' }, { v: 'draft', t: 'טיוטה' }] },
    { name: 'description', label: 'תיאור', type: 'textarea', wide: true }
  ];

  var list, filter = '';
  A.view({
    name: 'events',
    render: function () {
      var panel = A.$('.view[data-view="events"] .panel');
      A.wireChips(panel, function (label) {
        return { 'מפורסם': 'published', 'מוקפא': 'frozen', 'טיוטה': 'draft', 'הסתיים': 'past' }[label] || '';
      }, function (v) { filter = v; list.draw(); });
      list = A.listPanel({
        col: 'events', panel: panel, fields: FIELDS, defaults: { status: 'published' },
        cols: ['תאריך', 'כותרת', 'מיקום', 'שעות', 'סטטוס', ''],
        empty: 'אין אירועים',
        sort: function (a, b) { return a.date < b.date ? 1 : -1; },
        filter: function (items) {
          var today = A.todayISO();
          return filter === 'past' ? items.filter(function (e) { return e.date < today; })
            : filter ? items.filter(function (e) { return e.status === filter; }) : items;
        },
        row: function (ev) {
          var past = ev.date < A.todayISO();
          return [
            td(A.fmtDate(ev.date), 'muted tnum'),
            A.titleCell(ev.title, ev.demo),
            td(ev.location || A.NONE, 'muted'),
            td(ev.time || A.NONE, 'muted tnum'),
            td(ev.status === 'frozen' ? A.statusPill('frozen') : past ? A.pill('הסתיים', 'neutral') : A.statusPill(ev.status))
          ];
        }
      });
    },
    draw: function () { if (list) list.draw(); }
  });
})();
