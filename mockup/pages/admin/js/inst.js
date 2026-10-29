/* inst.js: מוסדות חינוך, and the kindergarten map's points under them.
 *
 * Institutions are a real collection (migration 0011). The chips are labelled in
 * the plural and the stored stage is a code, so the label is mapped, not compared.
 */
(function () {
  'use strict';
  var A = window.WAdmin, td = A.td, el = A.el;

  var STAGES = [{ v: 'gan', t: 'גן' }, { v: 'elementary', t: 'יסודי' }, { v: 'high', t: 'תיכון' }];
  var STAGE_LABEL = { gan: 'גן', elementary: 'יסודי', high: 'תיכון' };
  var FIELDS = [
    { name: 'name', label: 'שם המוסד' },
    { name: 'town', label: 'יישוב' },
    { name: 'stage', label: 'שלב', type: 'select', options: STAGES },
    { name: 'status', label: 'סטטוס', type: 'select', options: [{ v: 'active', t: 'פעיל' }, { v: 'frozen', t: 'מוקפא (מוסתר מהאתר)' }, { v: 'pending', t: 'ממתין לאישור' }, { v: 'inactive', t: 'לא פעיל' }] },
    { name: 'url', label: 'אתר המוסד (כתובת)' },
    { name: 'contact', label: 'איש קשר או טלפון' },
    { name: 'description', label: 'תיאור', type: 'textarea', wide: true }
  ];
  var MAP_FIELDS = [
    { name: 'name', label: 'שם הנקודה' },
    { name: 'town', label: 'יישוב' },
    { name: 'count', label: 'מספר גנים', type: 'number' },
    { name: 'lat', label: 'קו רוחב (lat)', type: 'number' },
    { name: 'lng', label: 'קו אורך (lng)', type: 'number' }
  ];

  var inst, map, filter = '';
  A.view({
    name: 'inst',
    render: function () {
      var view = A.$('.view[data-view="inst"]');
      var panel = view.querySelector('.panel');
      A.wireChips(panel, function (label) {
        return { 'גנים': 'gan', 'יסודי': 'elementary', 'תיכון': 'high' }[label] || '';
      }, function (v) { filter = v; inst.draw(); });
      inst = A.listPanel({
        col: 'institutions', panel: panel, fields: FIELDS, defaults: { stage: 'gan', status: 'active' },
        cols: ['שם המוסד', 'יישוב', 'שלב', 'סטטוס', ''],
        empty: function () { return filter ? 'אין מוסדות בשלב הזה' : 'עדיין לא נוספו מוסדות'; },
        filter: function (items) { return filter ? items.filter(function (i) { return i.stage === filter; }) : items; },
        row: function (it) {
          return [A.titleCell(it.name, it.demo), td(it.town || A.NONE, 'muted'), td(STAGE_LABEL[it.stage] || it.stage || A.NONE, 'muted'), td(A.statusPill(it.status))];
        }
      });

      map = A.listPanel({
        col: 'mapPoints', title: 'נקודות המפה האינטראקטיבית (גני ילדים)', addLabel: 'נקודה חדשה', fields: MAP_FIELDS,
        defaults: { count: 1 },
        // Every point leads to the kindergarten list; it is not a field to fill in.
        beforeSave: function (out) { out.url = './kinder-list.html'; },
        cols: ['יישוב', 'שם', 'גנים', 'קואורדינטות', ''],
        empty: 'אין נקודות',
        row: function (p) {
          return [
            td(p.town || A.NONE, 'muted'),
            A.titleCell(p.name, false, p),
            td(String(p.count || 1), 'muted tnum'),
            td((p.lat != null ? p.lat : A.NONE) + ', ' + (p.lng != null ? p.lng : A.NONE), 'muted tnum')
          ];
        }
      });
      view.appendChild(el('div', { id: 'mapPointsAdmin' }, [map.panel]));
    },
    draw: function () { if (inst) { inst.draw(); map.draw(); } }
  });
})();
