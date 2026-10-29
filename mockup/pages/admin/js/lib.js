/* lib.js: ספריית תוכן (works and articles, teaching materials, forms).
 *
 * A work with a page of its own (url ./lib-<id>.html) gets a preview button
 * while it is hidden. The page on the site is a shell that fetches the text from
 * the Worker, which refuses it to visitors once the work is not published; the
 * button mints a short-lived pass and opens the page with it, so an editor sees
 * the hidden work exactly as it would look, without the site ever holding their
 * credentials.
 */
(function () {
  'use strict';
  var A = window.WAdmin, td = A.td, el = A.el;

  var PANELS = [
    { col: 'library', title: 'עבודות ומאמרים', fields: [
      { name: 'title', label: 'כותרת' },
      // 'עבודה' is the unresolved bucket: a work whose title page never says which
      // of the three it is. Leaving it on the list lets an editor close the gap.
      { name: 'kind', label: 'סוג', type: 'select', options: ['מאמר', 'עבודה לתואר שני', 'עבודה סמינריונית', 'עבודה של מורי ולדורף', 'עבודה', 'ספר'] },
      { name: 'author', label: 'מחבר/ת' },
      { name: 'date', label: 'שנה' },
      // Where the item opens: a PDF, a Drive link, or its own page on the site.
      { name: 'url', label: 'קישור למסמך', placeholder: 'https://…',
        hint: 'הדביקו כתובת של קובץ PDF או של מסמך ב-Google Drive. העלאת קובץ ישירות מהמחשב תתאפשר רק אחרי שיחובר אחסון קבצים (R2); כרגע אין לאן לשמור אותו.' },
      { name: 'description', label: 'תיאור', type: 'textarea', wide: true }
    ], cols: ['סוג', 'כותרת', 'מחבר/ת', 'שנה', ''],
    row: function (it) { return [td(it.kind || A.NONE, 'muted'), A.titleCell(it.title, it.demo, it), td(it.author || A.NONE, 'muted'), td(it.date || A.NONE, 'muted')]; } },
    { col: 'teaching', title: 'חומרי הוראה', fields: [
      { name: 'title', label: 'כותרת' },
      { name: 'group', label: 'קבוצה', type: 'select', options: ['סיפורים, שירים ודקלומים', 'דפי עבודה להדפסה', 'מצגות ותמונות להוראה', 'חומרי העשרה לתיכון'] },
      { name: 'url', label: 'קישור לקובץ' }
    ], cols: ['קבוצה', 'כותרת', 'קובץ', ''],
    row: function (it) { return [td(it.group || A.NONE, 'muted'), A.titleCell(it.title, it.demo, it), td(it.url ? 'מקושר' : 'חסר', 'muted')]; } },
    { col: 'forms', title: 'מאגר טפסים', fields: [
      { name: 'title', label: 'שם הטופס' },
      { name: 'category', label: 'קטגוריה', type: 'select', options: ['הרשמה', 'בקשות', 'אישורים'] },
      { name: 'url', label: 'קישור לקובץ' },
      { name: 'description', label: 'תיאור', type: 'textarea', wide: true }
    ], cols: ['קטגוריה', 'שם', 'קובץ', ''],
    row: function (it) { return [td(it.category || A.NONE, 'muted'), A.titleCell(it.title, it.demo, it), td(it.url ? 'מקושר' : 'חסר', 'muted')]; } }
  ];

  var PAGE = /^\.\/(lib-[\w-]+\.html)$/;
  function previewBtn(it) {
    var m = PAGE.exec(it.url || '');
    if (!m || it.status === 'published') return null;
    return A.actBtn('preview', 'תצוגה מקדימה באתר (הפריט מוסתר)', function () {
      if (!A.canWrite()) return A.needSignIn();
      // Opened now, while the click still counts as one, and pointed at the page
      // once the pass arrives: a window opened after an await is a popup.
      var w = window.open('', 'waldorf-site');
      WStore.previewWork(it.id).then(function (r) {
        var url = A.SITE + '/' + m[1] + '#preview=' + r.token;
        if (w) w.location.href = url; else location.href = url;
      }).catch(function (e) { if (w) w.close(); A.fail(e, true); });
    });
  }

  var lists = [];
  A.view({
    name: 'lib',
    render: function () {
      var view = A.$('.view[data-view="lib"]');
      view.textContent = '';
      view.appendChild(el('p', { class: 'crumb', text: 'עבודות ומאמרים, חומרי הוראה ומאגר הטפסים, כפי שהם מוצגים בעמוד "ספריית תוכן"' }));
      lists = PANELS.map(function (cfg) {
        var list = A.listPanel({
          col: cfg.col, title: cfg.title, fields: cfg.fields, cols: cfg.cols, row: cfg.row,
          actions: cfg.col === 'library' ? function (it) { return [previewBtn(it)]; } : null
        });
        view.appendChild(list.panel);
        return list;
      });
    },
    draw: function () { lists.forEach(function (l) { l.draw(); }); }
  });
})();
