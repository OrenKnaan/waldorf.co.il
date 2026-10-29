/* list.js: one list of one collection, the shape most views share.
 *
 * A table, an add button that opens the form above it, and per row: freeze,
 * edit, move to the recycle bin, plus whatever the view adds. The bin sits under
 * the table. Events, news, institutions, map points, the three library lists and
 * the two media lists are all this; the moderation view is not, having unread
 * tracking, paging and rejection of its own (mod.js).
 *
 *   A.listPanel({
 *     col, cols, row(it) -> [td...], fields, defaults,
 *     title, addLabel        a new panel, or
 *     panel                  an existing one from the dashboard markup, whose
 *                            .table-wrap is replaced and whose .btn-primary adds
 *     filter(items), sort(a, b), empty, actions(it) -> [button...]
 *   })  -> { panel, draw }
 */
(function () {
  'use strict';
  var A = window.WAdmin, el = A.el;

  A.listPanel = function (cfg) {
    var t = A.makeTable(cfg.cols);
    var bin = A.makeBin(cfg.col);
    var panel = cfg.panel, addBtn;
    if (panel) {
      panel.querySelector('.table-wrap').replaceWith(t.wrap);
      addBtn = panel.querySelector('.btn-primary');
      panel.appendChild(bin.node);
    } else {
      addBtn = el('button', { class: 'btn btn-primary btn-sm', type: 'button', style: 'width:auto' });
      addBtn.innerHTML = A.icons.plus;
      addBtn.appendChild(document.createTextNode(cfg.addLabel || 'פריט חדש'));
      panel = el('div', { class: 'panel' }, [
        el('div', { class: 'panel-head' }, [el('h2', { text: cfg.title }), el('div', { class: 'grow' }), addBtn]),
        t.wrap,
        bin.node
      ]);
    }
    if (addBtn) addBtn.addEventListener('click', function () {
      var defaults = typeof cfg.defaults === 'function' ? cfg.defaults() : cfg.defaults;
      A.openForm(panel, cfg.fields, defaults || null, function (out) {
        if (cfg.beforeSave) cfg.beforeSave(out);
        WStore.add(cfg.col, out); A.refreshAll();
      });
    });

    function draw() {
      var all = WStore.get(cfg.col);
      var items = all.filter(function (it) { return !A.inBin(it); });
      bin.draw(all.filter(A.inBin));
      if (cfg.filter) items = cfg.filter(items);
      if (cfg.sort) items.sort(cfg.sort);
      t.tbody.textContent = '';
      if (!items.length) return A.emptyRow(t.tbody, cfg.cols.length, typeof cfg.empty === 'function' ? cfg.empty() : (cfg.empty || 'אין פריטים'));
      items.forEach(function (it) {
        var actions = (cfg.actions ? cfg.actions(it) : []).concat([
          A.freezeBtn(cfg.col, it),
          A.actBtn('edit', 'עריכה', function () {
            A.openForm(panel, cfg.fields, it, function (out) { WStore.update(cfg.col, it.id, out); A.refreshAll(); });
          }),
          A.binBtn(cfg.col, it)
        ]);
        t.tbody.appendChild(el('tr', {}, cfg.row(it).concat([A.td(el('div', { class: 'row-actions' }, actions))])));
      });
    }
    draw();
    return { panel: panel, draw: draw };
  };
})();
