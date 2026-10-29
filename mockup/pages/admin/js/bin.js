/* bin.js: freezing, and the recycle bin.
 *
 * Freezing takes an item off the site without deleting it, and unfreezing puts it
 * back as it was. 'frozen' is a status of its own rather than 'draft' or
 * 'pending', so a paused item stays told apart from one never finished or
 * approved; the server withholds it because it is outside every publicStatus.
 *
 * Removing an item puts it in the recycle bin: status 'deleted', or 'rejected'
 * for a submission a moderator turned down. Both are off the site and out of the
 * working list. The bin under each list shows them, puts one back, or deletes it
 * for good; whatever is left there is purged by the Worker's daily cron after
 * BIN_DAYS (it says how many in /api/admin/config).
 */
(function () {
  'use strict';
  var A = window.WAdmin, el = A.el;

  // The status a row has while visitors see it: the one freezing leaves and
  // unfreezing returns to, and the one a binned item is restored to. A rejected
  // submission goes back to the approval queue instead, since nobody approved it.
  A.LIVE = { events: 'published', news: 'approved', board: 'approved', jobs: 'approved', institutions: 'active' };
  A.MODERATED = { news: true, board: true, jobs: true };
  // On a board every status change is a moderation decision, which the Worker
  // reserves for admins; elsewhere any signed-in editor may freeze or bin.
  A.mayChangeStatus = function (col) { return !A.MODERATED[col] || A.atLeast('admin'); };

  A.BIN = ['deleted', 'rejected'];
  A.inBin = function (it) { return A.BIN.indexOf(it.status) !== -1; };

  // Only a live or frozen row gets the toggle: a draft or a pending submission is
  // already off the site.
  A.freezeBtn = function (col, it) {
    if (!A.mayChangeStatus(col)) return null;
    var live = A.LIVE[col] || 'published', frozen = it.status === 'frozen';
    if (!frozen && it.status !== live) return null;
    return A.actBtn(frozen ? 'thaw' : 'freeze', frozen ? 'ביטול הקפאה: החזרה לאתר' : 'הקפאה: הסתרה מהאתר', function () {
      WStore.update(col, it.id, { status: frozen ? live : 'frozen' }); A.refreshAll();
    });
  };
  A.binBtn = function (col, it) {
    if (!A.mayChangeStatus(col)) return null;
    return A.actBtn('bin', 'העברה לסל המחזור', function () { WStore.update(col, it.id, { status: 'deleted' }); A.refreshAll(); });
  };

  function daysLeft(it, binDays) {
    if (!it.updatedAt || !binDays) return '';
    var left = binDays - Math.floor((Date.now() / 1000 - it.updatedAt) / 86400);
    return left <= 1 ? 'יימחק היום או מחר' : 'יימחק בעוד ' + left + ' ימים';
  }

  A.makeBin = function (col) {
    var t = A.makeTable(['כותרת', 'מצב', 'מחיקה סופית', '']);
    var sum = el('summary', { text: 'סל מחזור' });
    var hint = el('p', { class: 'empty-hint', text: 'פריטים שנמחקו או נדחו. הם אינם מוצגים באתר, ונמחקים לצמיתות אחרי תקופה קבועה. אפשר להחזיר אותם עד אז.' });
    var box = el('details', { class: 'archive' }, [sum, hint, t.wrap]);
    var binDays = 0;
    A.config().then(function (c) {
      if (!c) return;
      binDays = c.binDays;
      hint.textContent = 'פריטים שנמחקו או נדחו. הם אינם מוצגים באתר, ונמחקים לצמיתות ' + binDays + ' יום אחרי שהגיעו לכאן. אפשר להחזיר אותם עד אז.';
      if (last) draw(last);
    });
    var last = null;
    function draw(items) {
      last = items;
      sum.textContent = 'סל מחזור (' + items.length + ')';
      t.tbody.textContent = '';
      if (!items.length) return A.emptyRow(t.tbody, 4, 'סל המחזור ריק');
      items.forEach(function (it) {
        var title = A.titleCell(it.title || it.role || it.name, it.demo);
        if (it.rejectNote) { title.appendChild(document.createTextNode(' ')); title.appendChild(el('span', { class: 'pill info', title: it.rejectNote, text: 'נכתב הסבר' })); }
        var back = it.status === 'rejected' ? 'pending' : (A.LIVE[col] || 'published');
        t.tbody.appendChild(el('tr', {}, [
          title,
          A.td(A.statusPill(it.status)),
          A.td(daysLeft(it, binDays), 'muted'),
          A.td(el('div', { class: 'row-actions' }, [
            A.mayChangeStatus(col) ? A.actBtn('restore', it.status === 'rejected' ? 'החזרה לתור האישור' : 'החזרה מסל המחזור', function () { WStore.update(col, it.id, { status: back }); A.refreshAll(); }) : null,
            A.atLeast('admin') ? A.actBtn('del', 'מחיקה לצמיתות', function () { WStore.remove(col, it.id); A.refreshAll(); }) : null
          ]))
        ]));
      });
    }
    return { node: box, draw: draw };
  };
})();
