/* core.js: what every admin view shares.
 *
 * The admin is one page of views (admin-dashboard.html#<view>), each in its own
 * file under js/, all hanging off one namespace, WAdmin, the way the site hangs
 * off WStore and WDyn. A view registers itself with WAdmin.view({...}); boot.js
 * renders them in order once the content store is loaded, and WAdmin.refreshAll()
 * redraws every list after a change.
 *
 * Load order: config.js, core.js, bin.js, list.js, the views, boot.js.
 */
(function () {
  'use strict';
  var el = WDyn.el;
  var A = window.WAdmin = {
    el: el,
    fmtDate: WDyn.fmtDate,
    SITE: window.WAdminConfig.site,
    // An empty cell. Spelled as an escape so the source reads unambiguously.
    NONE: '—',
    views: []
  };
  A.$ = function (sel) { return document.querySelector(sel); };

  /* ---- view registry ---- */
  // A view is { name, render(), draw(), auth() }: render builds it once, draw
  // repaints its lists after a change, auth reacts to a sign-in or a key change.
  A.view = function (v) { A.views.push(v); return v; };
  A.refreshAll = function () { A.views.forEach(function (v) { if (v.draw) v.draw(); }); };

  /* ---- who is signed in, and what they may do ---- */
  // The management key is a super_admin to the server (whoami in content-api).
  var RANK = { editor: 1, admin: 2, super_admin: 3 };
  A.ROLE_NAMES = { super_admin: 'מנהל־על', admin: 'מנהל', editor: 'עורך' };
  A.me = function () {
    return WStore.currentUser() || (WStore.hasAdminKey() ? { id: 'key', name: 'מפתח ניהול', role: 'super_admin' } : null);
  };
  // Mirrors atLeast() in the Worker, which is what actually enforces it: an
  // editor edits content; an admin also moderates and deletes for good.
  A.atLeast = function (role) { var m = A.me(); return Boolean(m) && (RANK[m.role] || 0) >= RANK[role]; };
  A.canWrite = function () { return WStore.isSignedIn() || WStore.hasAdminKey(); };

  /* ---- icons (static strings only) ---- */
  var P = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">';
  var I = A.icons = {
    edit: P + '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>',
    del: P + '<path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13"/></svg>',
    ok: P + '<path d="M20 6L9 17l-5-5"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
    freeze: P + '<path d="M12 2v20M4.2 7l15.6 10M4.2 17L19.8 7"/><path d="M9.5 3.5L12 6l2.5-2.5M9.5 20.5L12 18l2.5 2.5"/></svg>',
    thaw: P + '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>',
    restore: P + '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg>',
    reject: P + '<circle cx="12" cy="12" r="9"/><path d="M5.6 5.6l12.8 12.8"/></svg>',
    key: P + '<circle cx="7.5" cy="15.5" r="4.5"/><path d="M10.7 12.3L20 3M16 7l3 3M18 5l2 2"/></svg>',
    preview: P + '<path d="M14 4h6v6M20 4l-9 9"/><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg>'
  };
  I.bin = I.del;

  // 'del' deletes for good, so it asks first, naming the row it sits on; a
  // caller that asks in its own words passes ownConfirm. 'bin' looks the same
  // but is undoable for 30 days, so it does not ask.
  A.actBtn = function (kind, label, onClick, ownConfirm) {
    var handler = onClick;
    if (kind === 'del' && !ownConfirm) handler = function () {
      if (!A.canWrite()) return A.needSignIn();
      var cell = b.closest('tr') && b.closest('tr').querySelector('td.title');
      var name = cell && cell.firstChild ? cell.firstChild.textContent.trim() : '';
      if (!confirm((name ? 'למחוק את "' + name + '" לצמיתות?' : 'למחוק את הפריט לצמיתות?') + '\n\nאי אפשר לבטל את המחיקה או לשחזר את הפריט.')) return;
      onClick();
    };
    var b = el('button', { type: 'button', class: 'act' + (kind === 'del' ? ' danger' : ''), 'aria-label': label, title: label, onclick: handler });
    b.innerHTML = I[kind];
    return b;
  };

  /* ---- small builders ---- */
  A.setText = function (sel, val) { var n = A.$(sel); if (n) n.textContent = val; };
  A.pill = function (text, tone) { return el('span', { class: 'pill ' + tone, text: text }); };
  A.statusPill = function (st) {
    var pill = A.pill;
    return st === 'published' || st === 'approved' ? pill('מפורסם', 'ok')
      : st === 'pending' ? pill('ממתין לאישור', 'warn')
      : st === 'draft' ? pill('טיוטה', 'warn')
      : st === 'frozen' ? pill('מוקפא', 'info')
      : st === 'active' ? pill('פעיל', 'ok')
      : st === 'inactive' ? pill('לא פעיל', 'neutral')
      : st === 'rejected' ? pill('נדחה', 'crit')
      : st === 'deleted' ? pill('נמחק', 'neutral')
      : st === 'expired' ? pill('פג תוקף', 'neutral')
      : pill(st || A.NONE, 'neutral');
  };
  A.makeTable = function (headers) {
    var tbody = el('tbody');
    var wrap = el('div', { class: 'table-wrap' }, [
      el('table', {}, [el('thead', {}, [el('tr', {}, headers.map(function (h) { return el('th', { text: h }); }))]), tbody])
    ]);
    return { wrap: wrap, tbody: tbody };
  };
  A.td = function (content, cls) {
    var c = el('td', { class: cls || '' });
    if (typeof content === 'string') c.textContent = content;
    else if (content) c.appendChild(content);
    return c;
  };
  // `it`, when given, is the row: a table with no status column marks a frozen row here.
  A.titleCell = function (text, demo, it) {
    var c = el('td', { class: 'title', text: text });
    if (demo) c.appendChild(el('span', { class: 'tag-demo', text: 'הדגמה' }));
    if (it && it.status === 'frozen') { c.appendChild(document.createTextNode(' ')); c.appendChild(A.pill('מוקפא', 'info')); }
    return c;
  };
  A.emptyRow = function (tbody, cols, text) {
    tbody.appendChild(el('tr', {}, [el('td', { class: 'muted', colspan: String(cols), text: text })]));
  };
  A.todayISO = WDyn.todayISO;
  // A board post whose last day has passed. Kept, filed under past posts.
  A.expired = function (it) { return Boolean(it.expires) && it.expires < A.todayISO(); };

  // Filter chips. The markup is <button class="chip"> inside a role="group"; exactly
  // one carries .on, and aria-pressed moves with it, or the active filter is told
  // apart by colour alone. `map` turns the chip's own label into what the caller
  // filters by, so the labels stay the one place a chip's meaning is written.
  A.wireChips = function (root, map, onChange) {
    var chips = root.querySelectorAll('.tools .chip');
    chips.forEach(function (c) {
      c.addEventListener('click', function () {
        chips.forEach(function (x) {
          var on = x === c;
          x.classList.toggle('on', on);
          x.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
        onChange(map(c.textContent.trim()));
      });
    });
  };

  /* ---- the add/edit form ---- */
  var hintSeq = 0;
  A.openForm = function (panel, fields, item, onSave) {
    var old = panel.querySelector('.aform');
    if (old) old.remove();
    var inputs = {};
    var form = el('form', { class: 'aform' }, fields.map(function (f) {
      var val = item && item[f.name] != null ? String(item[f.name]) : (f.value || '');
      var input = f.type === 'textarea' ? el('textarea', { name: f.name })
        : f.type === 'select' ? el('select', { name: f.name }, f.options.map(function (o) { return el('option', { value: o.v !== undefined ? o.v : o, text: o.t || o }); }))
        : el('input', { type: f.type || 'text', name: f.name });
      input.value = val;
      if (f.placeholder) input.setAttribute('placeholder', f.placeholder);
      if (f.autocomplete) input.setAttribute('autocomplete', f.autocomplete);
      inputs[f.name] = input;
      // A hint belongs to its field, so it is wired with aria-describedby: a screen
      // reader reaching the input by Tab reads the label and nothing else otherwise.
      var kids = [document.createTextNode(f.label), input];
      if (f.hint) {
        var hid = 'fh' + (++hintSeq);
        input.setAttribute('aria-describedby', hid);
        kids.push(el('small', { class: 'field-hint', id: hid, text: f.hint }));
      }
      return el('label', { class: f.wide ? 'wide' : '' }, kids);
    }).concat([
      el('div', { class: 'actions' }, [
        el('button', { class: 'btn btn-primary btn-sm', type: 'submit', style: 'width:auto', text: 'שמירה' }),
        el('button', { class: 'btn btn-ghost btn-sm', type: 'button', text: 'ביטול', onclick: function () { form.remove(); } })
      ])
    ]));
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      // Refused here rather than after the form closes, so what was typed survives.
      if (!A.canWrite()) return A.needSignIn();
      var out = {};
      fields.forEach(function (f) {
        var v = inputs[f.name].value.trim();
        // `clean` normalises what a human pasted into what the field stores, at the
        // one point every value passes through.
        if (f.clean) v = f.clean(v);
        out[f.name] = f.type === 'number' && v !== '' ? parseFloat(v) : v;
      });
      form.remove();
      onSave(out);
    });
    panel.insertBefore(form, panel.querySelector('.table-wrap') || null);
    inputs[fields[0].name].focus();
  };

  /* ---- notices ---- */
  // How to get write access, said the way an editor would act on it.
  A.signInHelp = function () {
    return el('span', {}, [
      el('a', { href: './', text: 'התחברו עם הדוא״ל והסיסמה שלכם' }),
      document.createTextNode(', או הזינו מפתח ניהול '),
      el('a', { href: '#set', text: 'במסך ההגדרות' }),
      document.createTextNode('.')
    ]);
  };
  // One notice at a time, at the top of the content, scrolled into view when it
  // answers something the editor just did.
  A.notify = function (lead, rest, kind, show) {
    var main = document.querySelector('.content') || document.body;
    var old = document.getElementById('adminNotice');
    if (old) old.remove();
    main.insertBefore(el('div', { id: 'adminNotice', 'data-kind': kind, class: 'notice crit', role: 'alert', style: 'margin:0 0 18px' }, [
      el('span', {}, [el('b', { text: lead + ' ' }), rest])
    ]), main.firstChild);
    if (show) { var m = document.querySelector('.main'); if (m) m.scrollIntoView({ block: 'start' }); }
  };
  A.needSignIn = function () {
    A.notify('השינוי לא נשמר:', el('span', {}, [document.createTextNode('אינכם מחוברים למערכת הניהול. '), A.signInHelp()]), 'signin', true);
  };
  A.fail = function (err, saving) {
    // Logged: a notice tells the operator something broke, the console says what.
    if (window.console) console.error(saving ? 'admin save failed:' : 'admin boot failed:', err);
    var status = err && err.status;
    A.notify(saving ? 'השינוי לא נשמר.' : 'לא ניתן לטעון את התוכן מהמאגר.',
      status === 401 ? el('span', {}, [document.createTextNode('אינכם מחוברים למערכת הניהול, או שההתחברות פגה. '), A.signInHelp()])
        : status === 403 ? document.createTextNode('לפעולה הזו נדרשת הרשאת מנהל. עורך יכול לערוך תוכן, אבל לא לאשר, לדחות או למחוק.')
        : document.createTextNode(saving ? 'השרת לא אישר את השינוי. נסו שוב בעוד רגע.' : 'בדקו את החיבור לאינטרנט ונסו לרענן.'),
      'fail', saving);
    // A refused save has also dropped a session the server no longer accepts.
    if (status === 401 && A.showUser) A.showUser();
  };

  // Writes are optimistic: the screen changes first and is put back if the server
  // refuses. Signed out, every write is refused, so it is refused here, before
  // the screen changes, which says what is wrong at the moment it matters.
  ['add', 'update', 'remove'].forEach(function (m) {
    var write = WStore[m];
    WStore[m] = function () { if (!A.canWrite()) { A.needSignIn(); return null; } return write.apply(WStore, arguments); };
  });

  /* ---- server-side settings the admin words things from ---- */
  // The rejection notice's fixed text, whether mail is set up, how long the bin
  // keeps things. Asked once; the Worker is the one source for all three.
  var configP = null;
  A.config = function () {
    if (!configP) configP = WStore.adminConfig().catch(function () { configP = null; return null; });
    return configP;
  };
})();
