/* mod.js: מודרציה, the three boards visitors post to (announcements, community
 * board, jobs).
 *
 * Each board lists the signed-in user's unread posts first, then tops up with
 * read ones to MOD_LIMIT lines. "Show all" lists everything, PAGE_SIZE to a page,
 * with a floating "unread only" button; "unread only" lists every unread post,
 * however many. Opening a row shows the whole post and marks it read. Read marks
 * are per user, kept by the Worker (item_reads).
 *
 * A post past its expiry date is off the site and filed under past posts, which
 * are kept. A deleted or rejected one goes to the recycle bin. Approving,
 * rejecting, freezing and binning are an admin's; an editor reads and edits.
 */
(function () {
  'use strict';
  var A = window.WAdmin, td = A.td, el = A.el;

  var MOD_LIMIT = 15;
  var PAGE_SIZE = 50;
  var REGIONS = ['צפון', 'מרכז', 'ירושלים', 'דרום'];
  var DATES = [
    { name: 'date', label: 'תאריך פרסום', type: 'date' },
    { name: 'expires', label: 'תאריך תפוגה (לא חובה)', type: 'date', hint: 'היום האחרון שבו הפרסום מוצג באתר. אחריו הוא עובר לפרסומים שפג תוקפם.' }
  ];
  var EMAIL = { name: 'submitterEmail', label: 'דוא״ל לעדכונים (לא מתפרסם)', type: 'email' };
  var expiresCell = function (it) { return td(it.expires ? A.fmtDate(it.expires) : A.NONE, 'muted tnum'); };

  // `detail` is what a moderator reads before deciding, shown when a row is opened.
  var PANELS = [
    { col: 'news', title: 'הודעות (לוח פתוח לציבור)', cols: ['תאריך פרסום', 'כותרת', 'מדור', 'מפרסם', 'תפוגה', 'סטטוס', ''],
      detail: [['summary', 'תוכן ההודעה'], ['link', 'קישור'], ['contact', 'פרטי קשר (מתפרסמים)']],
      fields: function () { return A.NEWS_FIELDS.concat([EMAIL]); },
      row: function (it, title) { return [td(A.fmtDate(it.date), 'muted tnum'), title, td(it.section || A.NONE, 'muted'), td(it.contact || A.NONE, 'muted'), expiresCell(it), td(A.statusPill(it.status || 'approved'))]; } },
    { col: 'board', title: 'לוח קהילתי', cols: ['תאריך פרסום', 'כותרת', 'קטגוריה', 'אזור', 'תפוגה', 'סטטוס', ''],
      detail: [['description', 'תיאור'], ['contact', 'פרטי קשר (מתפרסמים)']],
      fields: function () {
        return [{ name: 'title', label: 'כותרת המודעה' }].concat(DATES, [
          { name: 'category', label: 'קטגוריה', type: 'select', options: ['ציוד', 'לימוד', 'חוגים', 'שונות'] },
          { name: 'region', label: 'אזור', type: 'select', options: REGIONS },
          { name: 'contact', label: 'יצירת קשר (מתפרסם)' }, EMAIL,
          { name: 'description', label: 'תיאור', type: 'textarea', wide: true }]);
      },
      row: function (it, title) { return [td(A.fmtDate(it.date), 'muted tnum'), title, td(it.category || A.NONE, 'muted'), td(it.region || A.NONE, 'muted'), expiresCell(it), td(A.statusPill(it.status))]; } },
    { col: 'jobs', title: 'לוח משרות', cols: ['תאריך פרסום', 'תפקיד', 'מוסד', 'קטגוריה', 'תפוגה', 'סטטוס', ''],
      detail: [['description', 'תיאור'], ['scope', 'היקף'], ['region', 'אזור'], ['contact', 'פרטי קשר (מתפרסמים)']],
      fields: function () {
        return [{ name: 'role', label: 'תפקיד' }, { name: 'institution', label: 'מוסד' }].concat(DATES, [
          { name: 'category', label: 'קטגוריה', type: 'select', options: ['הוראה', 'גננות', 'ניהול', 'התנדבות'] },
          { name: 'region', label: 'אזור', type: 'select', options: REGIONS },
          { name: 'scope', label: 'היקף משרה' },
          { name: 'contact', label: 'יצירת קשר (מתפרסם)' }, EMAIL,
          { name: 'description', label: 'תיאור המשרה', type: 'textarea', wide: true }]);
      },
      row: function (it, title) { return [td(A.fmtDate(it.date), 'muted tnum'), title, td(it.institution || A.NONE, 'muted'), td(it.category || A.NONE, 'muted'), expiresCell(it), td(A.statusPill(it.status))]; } }
  ];

  /* ---- read marks ---- */
  // null means there is nobody to keep them for (signed out): no unread state.
  var READS = null;
  function loadReads() {
    if (!A.canWrite()) { READS = null; drawAll(); return Promise.resolve(); }
    return WStore.reads().then(function (r) {
      READS = {};
      Object.keys(r).forEach(function (c) { READS[c] = {}; r[c].forEach(function (id) { READS[c][id] = true; }); });
    }, function () { READS = null; }).then(drawAll);
  }
  function drawAll() { PANELS.forEach(function (c) { if (c.draw) c.draw(); }); }
  function isRead(col, id) { return Boolean(READS && READS[col] && READS[col][id]); }
  function setRead(col, ids, read) {
    if (!READS || !ids.length) return;
    READS[col] = READS[col] || {};
    ids.forEach(function (id) { if (read) READS[col][id] = true; else delete READS[col][id]; });
    WStore.markRead(col, ids, read).catch(function () {});
  }
  // The same pattern the Worker uses when a post has no separate address field.
  function addressOf(it) {
    if (it.submitterEmail) return it.submitterEmail;
    var m = String(it.contact || '').match(/[^\s@,;:<>()]+@[^\s@,;:<>()]+\.[^\s@,;:<>()]{2,}/);
    return m ? m[0] : '';
  }
  // Pending first, then newest.
  function rank(a, b) {
    var ap = a.status === 'pending' ? 0 : 1, bp = b.status === 'pending' ? 0 : 1;
    if (ap !== bp) return ap - bp;
    return (a.date || '') < (b.date || '') ? 1 : -1;
  }

  function renderPanel(host, cfg) {
    var mode = 'default';   // 'default' | 'all' | 'unread'
    var page = 0;           // in 'all'
    var open = {};          // ids whose details are showing
    // Read during this visit: kept in the unread part until the view changes,
    // so a row does not jump away the moment it is opened or approved.
    var held = {};
    var t = A.makeTable(cfg.cols);
    var unreadPill = el('span', { class: 'pill info' });
    var markAll = el('button', { class: 'btn btn-ghost btn-sm', type: 'button', text: 'סימון הכול כנקרא' });
    var hint = el('p', { class: 'empty-hint', text: 'סימון פרסומים שלא נקראו זמין לאחר התחברות.' });
    var msg = el('div', { class: 'mod-msg', role: 'status' });
    var pager = el('nav', { class: 'mod-pager', 'aria-label': 'עמודים' });
    var foot = el('div', { class: 'mod-foot' });
    var pastT = A.makeTable(['כותרת', 'פג תוקף ב־', '']);
    var pastSum = el('summary', { text: 'פרסומים שפג תוקפם' });
    var past = el('details', { class: 'archive' }, [pastSum,
      el('p', { class: 'empty-hint', text: 'פרסומים שעבר תאריך התפוגה שלהם. הם כבר לא מוצגים באתר ונשמרים כאן. כדי להחזיר אחד לאתר, ערכו את תאריך התפוגה.' }), pastT.wrap]);
    var bin = A.makeBin(cfg.col);
    var panel = el('div', { class: 'panel mod-panel' }, [
      el('div', { class: 'panel-head' }, [el('h2', { text: cfg.title }), unreadPill, el('div', { class: 'grow' }), markAll]),
      msg, hint, t.wrap, pager, foot, past, bin.node
    ]);
    function setMode(m) { mode = m; page = 0; held = {}; cfg.draw(); }
    function readNow(id) { held[id] = true; setRead(cfg.col, [id], true); }
    function footBtn(text, primary, onClick) {
      return el('button', { class: 'btn btn-sm ' + (primary ? 'btn-primary' : 'btn-ghost'), type: 'button', style: 'width:auto', text: text, onclick: onClick });
    }
    function edit(it) {
      A.openForm(panel, cfg.fields(), it, function (out) { WStore.update(cfg.col, it.id, out); A.refreshAll(); });
    }

    function drawPager(total) {
      pager.textContent = '';
      var pages = Math.ceil(total / PAGE_SIZE);
      pager.hidden = mode !== 'all' || pages < 2;
      if (pager.hidden) return;
      var go = function (p) { page = p; cfg.draw(); panel.scrollIntoView({ block: 'start' }); };
      pager.appendChild(footBtn('הקודם', false, function () { go(page - 1); }));
      for (var p = 0; p < pages; p++) (function (p) {
        var b = footBtn(String(p + 1), p === page, function () { go(p); });
        if (p === page) b.setAttribute('aria-current', 'page');
        b.setAttribute('aria-label', 'עמוד ' + (p + 1));
        pager.appendChild(b);
      })(p);
      pager.appendChild(footBtn('הבא', false, function () { go(page + 1); }));
      pager.firstChild.disabled = page === 0;
      pager.lastChild.disabled = page >= pages - 1;
    }

    function drawPast(items) {
      pastSum.textContent = 'פרסומים שפג תוקפם (' + items.length + ')';
      pastT.tbody.textContent = '';
      if (!items.length) return A.emptyRow(pastT.tbody, 3, 'אין פרסומים שפג תוקפם');
      items.sort(function (a, b) { return a.expires < b.expires ? 1 : -1; }).forEach(function (it) {
        pastT.tbody.appendChild(el('tr', {}, [
          A.titleCell(it.title || it.role, it.demo),
          td(A.fmtDate(it.expires), 'muted tnum'),
          td(el('div', { class: 'row-actions' }, [
            A.actBtn('edit', 'עריכה (למשל הארכת התפוגה)', function () { edit(it); }),
            A.binBtn(cfg.col, it)
          ]))
        ]));
      });
    }

    cfg.draw = function () {
      var all = WStore.get(cfg.col);
      bin.draw(all.filter(A.inBin));
      var kept = all.filter(function (it) { return !A.inBin(it); });
      drawPast(kept.filter(A.expired));
      var live = kept.filter(function (it) { return !A.expired(it); });
      var tracking = READS !== null;
      var first = function (it) { return !isRead(cfg.col, it.id) || held[it.id]; };
      var unread = tracking ? live.filter(first).sort(rank) : [];
      var read = live.filter(function (it) { return !tracking || !first(it); }).sort(rank);
      var unreadCount = unread.filter(function (it) { return !isRead(cfg.col, it.id); }).length;
      var ordered = unread.concat(read);
      if (mode === 'all') page = Math.min(page, Math.max(0, Math.ceil(ordered.length / PAGE_SIZE) - 1));
      var shown = mode === 'all' ? ordered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
        : mode === 'unread' ? unread
        : unread.concat(read.slice(0, Math.max(0, MOD_LIMIT - unread.length)));

      unreadPill.hidden = !tracking;
      unreadPill.textContent = unreadCount ? unreadCount + ' לא נקראו' : 'הכול נקרא';
      markAll.hidden = !tracking || !unreadCount;
      markAll.onclick = function () { setRead(cfg.col, unread.map(function (it) { return it.id; }), true); held = {}; cfg.draw(); };
      hint.hidden = tracking;
      drawPager(ordered.length);

      foot.textContent = '';
      foot.classList.remove('floating');
      if (mode === 'default' && shown.length < live.length) {
        foot.appendChild(footBtn('הצגת הכול (' + live.length + ')', false, function () { setMode('all'); }));
      } else if (mode === 'all' && tracking && unreadCount) {
        // Sticks to the bottom of the screen while the long list is in view, so
        // the way back to the short list is never a scroll away.
        foot.classList.add('floating');
        foot.appendChild(footBtn('הצגת הלא נקראים בלבד (' + unreadCount + ')', true, function () {
          setMode('unread');
          panel.scrollIntoView({ block: 'start' });
        }));
      } else if (mode === 'unread' && shown.length < live.length) {
        foot.appendChild(footBtn('הצגת הכול (' + live.length + ')', false, function () { setMode('all'); }));
      }
      foot.hidden = !foot.firstChild;

      t.tbody.textContent = '';
      if (!shown.length) return A.emptyRow(t.tbody, cfg.cols.length, mode === 'unread' ? 'אין פריטים שלא נקראו' : 'אין פריטים');
      var moderator = A.atLeast('admin');
      shown.forEach(function (it) {
        var unseen = tracking && !isRead(cfg.col, it.id);
        var titleBtn = el('button', { type: 'button', class: 'mod-title', 'aria-expanded': open[it.id] ? 'true' : 'false', text: it.title || it.role,
          onclick: function () {
            open[it.id] = !open[it.id];
            if (open[it.id] && unseen) readNow(it.id);
            cfg.draw();
          } });
        var title = el('td', { class: 'title' }, [titleBtn]);
        if (unseen) title.appendChild(el('span', { class: 'mod-sr', text: ' (לא נקרא)' }));
        if (it.demo) title.appendChild(el('span', { class: 'tag-demo', text: 'הדגמה' }));

        var tr = el('tr', { class: unseen ? 'unread' : '' });
        var actions = [];
        if (it.status === 'pending' && moderator) {
          actions.push(A.actBtn('ok', 'אישור ופרסום', function () {
            readNow(it.id);
            WStore.update(cfg.col, it.id, { status: 'approved' }); A.refreshAll();
          }));
          actions.push(A.actBtn('reject', 'דחייה', function () {
            if (!A.canWrite()) return A.needSignIn();
            openReject(cfg, it, tr, msg);
          }));
        } else if (it.status !== 'pending') {
          actions.push(A.freezeBtn(cfg.col, it));
        }
        actions.push(A.actBtn('edit', 'עריכה', function () { edit(it); }));
        if (it.status !== 'pending') actions.push(A.binBtn(cfg.col, it));
        cfg.row(it, title).concat([td(el('div', { class: 'row-actions' }, actions))]).forEach(function (c) { tr.appendChild(c); });
        t.tbody.appendChild(tr);
        if (open[it.id]) t.tbody.appendChild(detailRow(cfg, it, function () { open[it.id] = false; delete held[it.id]; setRead(cfg.col, [it.id], false); cfg.draw(); }));
      });
    };
    cfg.draw();
    host.appendChild(panel);
  }

  function detailRow(cfg, it, markUnread) {
    var kv = [];
    cfg.detail.forEach(function (d) {
      if (!it[d[0]]) return;
      kv.push(el('dt', { text: d[1] }));
      kv.push(el('dd', {}, [d[0] === 'link' ? el('a', { href: it[d[0]], target: '_blank', rel: 'noopener', text: it[d[0]] }) : document.createTextNode(it[d[0]])]));
    });
    kv.push(el('dt', { text: 'דוא״ל לעדכונים (לא מתפרסם)' }));
    // <bdi>: an address inside Hebrew text is otherwise reordered.
    kv.push(el('dd', {}, [it.submitterEmail ? el('bdi', { text: it.submitterEmail }) : document.createTextNode('לא נמסר')]));
    var kids = [el('dl', { class: 'kv' }, kv)];
    if (READS !== null) kids.push(el('button', { class: 'btn btn-ghost btn-sm', type: 'button', text: 'סימון כלא נקרא', onclick: markUnread }));
    return el('tr', { class: 'mod-detail' }, [el('td', { colspan: String(cfg.cols.length) }, kids)]);
  }

  // Rejecting asks one question first: tell the submitter, or not. Telling them
  // sends the Worker's fixed paragraph, plus whatever the moderator adds.
  function openReject(cfg, it, tr, msg) {
    var old = tr.parentNode.querySelector('.mod-reject');
    if (old) old.remove();
    var name = it.title || it.role;
    var to = addressOf(it);
    var box = el('div', { class: 'reject-box' });
    var row = el('tr', { class: 'mod-reject' }, [el('td', { colspan: String(cfg.cols.length) }, [box])]);
    tr.after(row);
    function close() { row.remove(); }
    function go(notify, extra, buttons) {
      buttons.forEach(function (b) { b.disabled = true; });
      WStore.reject(cfg.col, it.id, notify, extra).then(function (r) {
        setRead(cfg.col, [it.id], true);
        close();
        msg.textContent = '';
        msg.className = 'mod-msg';
        if (!r.notice) {
          msg.appendChild(document.createTextNode('"' + name + '" נדחה והועבר לסל המחזור.'));
        } else if (r.notice.mailed) {
          msg.appendChild(document.createTextNode('"' + name + '" נדחה, וההסבר נשלח אל '));
          msg.appendChild(el('bdi', { text: r.notice.to }));
          msg.appendChild(document.createTextNode('.'));
        } else {
          // No mail provider yet (RESEND_API_KEY on the Worker), so the notice goes
          // out through the moderator's own mail app.
          msg.className = 'mod-msg notice';
          msg.appendChild(el('span', {}, [
            document.createTextNode('"' + name + '" נדחה. ההסבר לא נשלח מהשרת, כי שליחת דוא״ל עוד לא הוגדרה: '),
            el('a', { href: 'mailto:' + encodeURIComponent(r.notice.to) + '?subject=' + encodeURIComponent(r.notice.subject) + '&body=' + encodeURIComponent(r.notice.text),
                      text: 'פתיחת ההודעה המוכנה בתוכנת הדואר' })
          ]));
        }
        A.refreshAll();
      }).catch(function (e) {
        buttons.forEach(function (b) { b.disabled = false; });
        A.fail(e, true);
      });
    }
    function ask() {
      box.textContent = '';
      var silent = el('button', { class: 'btn btn-ghost btn-sm', type: 'button', text: 'דחייה בלי הודעה' });
      var explain = el('button', { class: 'btn btn-primary btn-sm', type: 'button', style: 'width:auto', text: 'דחייה עם הסבר…' });
      var cancel = el('button', { class: 'btn btn-ghost btn-sm', type: 'button', text: 'ביטול', onclick: close });
      silent.onclick = function () { go(false, '', [silent, explain, cancel]); };
      explain.onclick = compose;
      if (!to) explain.disabled = true;
      box.appendChild(el('p', { text: 'לדחות את "' + name + '"? הפרסום יעבור לסל המחזור ולא יוצג באתר.' }));
      if (!to) box.appendChild(el('p', { class: 'muted', text: 'למפרסם אין כתובת דוא״ל שמורה, ולכן אי אפשר לשלוח לו הסבר.' }));
      box.appendChild(el('div', { class: 'btns' }, [silent, explain, cancel]));
      silent.focus();
    }
    function compose() {
      box.textContent = '';
      var area = el('textarea', { id: 'rejectExtra' + it.id, 'aria-describedby': 'rejectBase' + it.id });
      var send = el('button', { class: 'btn btn-primary btn-sm', type: 'button', style: 'width:auto', text: 'דחייה ושליחה' });
      var back = el('button', { class: 'btn btn-ghost btn-sm', type: 'button', text: 'חזרה', onclick: ask });
      var base = el('blockquote', { id: 'rejectBase' + it.id, text: 'טוען את הנוסח…' });
      var how = el('p', { class: 'muted' });
      send.onclick = function () { go(true, area.value, [send, back]); };
      box.appendChild(el('p', {}, [document.createTextNode('יישלח אל '), el('bdi', { text: to }), document.createTextNode('. הנוסח הקבוע:')]));
      box.appendChild(base);
      box.appendChild(el('label', { for: 'rejectExtra' + it.id, text: 'תוספת אישית (לא חובה). אם תישאר ריקה, יישלח רק הנוסח הקבוע.' }));
      box.appendChild(area);
      box.appendChild(how);
      box.appendChild(el('div', { class: 'btns' }, [send, back]));
      A.config().then(function (c) {
        base.textContent = c ? c.rejectDefault : 'לא ניתן לטעון את הנוסח הקבוע כרגע; הוא יצורף בכל זאת.';
        how.textContent = c && !c.mailConfigured ? 'שליחת דוא״ל מהשרת עוד לא הוגדרה, ולכן אחרי הדחייה תיפתח ההודעה המוכנה בתוכנת הדואר שלכם.' : '';
      });
      area.focus();
    }
    ask();
  }

  A.view({
    name: 'mod',
    render: function () {
      var host = A.$('#modAdmin');
      host.textContent = '';
      PANELS.forEach(function (cfg) { renderPanel(host, cfg); });
      loadReads();
    },
    draw: drawAll,
    auth: loadReads
  });
})();
