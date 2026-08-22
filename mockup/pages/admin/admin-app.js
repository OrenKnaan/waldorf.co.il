/* admin-app.js — חיווט ממשק הניהול של המוקאפ ל-WStore.
   כל טבלה נטענת מאותו מאגר שמזין את העמודים הציבוריים — בסיס נתונים D1 מאחורי
   content API — כך שהוספה/עריכה/אישור כאן משתקפים בעמודים הציבוריים לכל המבקרים. */
(function () {
  'use strict';
  var el = WDyn.el, fmtDate = WDyn.fmtDate;
  function $(sel) { return document.querySelector(sel); }

  /* ---- אייקונים (מחרוזות סטטיות בלבד) ---- */
  var I = {
    edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>',
    del: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13"/></svg>',
    ok: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>'
  };
  function actBtn(kind, label, onClick) {
    var b = el('button', { class: 'act' + (kind === 'del' ? ' danger' : ''), 'aria-label': label, title: label, onclick: onClick });
    b.innerHTML = I[kind];
    return b;
  }
  function pill(text, tone) { return el('span', { class: 'pill ' + tone, text: text }); }
  function statusPill(st) {
    return st === 'published' || st === 'approved' ? pill('מפורסם', 'ok')
      : st === 'pending' ? pill('ממתין לאישור', 'warn')
      : st === 'draft' ? pill('טיוטה', 'warn')
      : pill(st || '—', 'neutral');
  }

  /* ---- סגנונות טפסים לאדמין ---- */
  var st = document.createElement('style');
  st.textContent = [
    '.aform{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:12px;padding:16px 20px;border-bottom:1px solid var(--line);background:var(--sink)}',
    '.aform label{display:flex;flex-direction:column;gap:4px;font-size:.78rem;font-weight:600;color:var(--brown-dark)}',
    '.aform .wide{grid-column:1/-1}',
    '.aform input,.aform select,.aform textarea{font-family:inherit;font-size:.88rem;color:var(--ink);background:var(--paper);border:1.5px solid var(--line);border-radius:var(--r);padding:9px 12px}',
    '.aform input:focus,.aform select:focus,.aform textarea:focus{outline:none;border-color:var(--tan)}',
    '.aform textarea{min-height:70px;resize:vertical}',
    '.aform .actions{grid-column:1/-1;display:flex;gap:10px}',
    '.tag-demo{font-size:.7rem;color:var(--muted);border:1px dashed var(--line);border-radius:var(--r-pill);padding:1px 8px;margin-inline-start:6px}'
  ].join('\n');
  document.head.appendChild(st);

  /* ---- טופס גנרי (הוספה/עריכה) ---- */
  function openForm(panel, fields, item, onSave) {
    var old = panel.querySelector('.aform');
    if (old) old.remove();
    var inputs = {};
    var form = el('form', { class: 'aform' }, fields.map(function (f) {
      var val = item && item[f.name] != null ? String(item[f.name]) : (f.value || '');
      var input = f.type === 'textarea' ? el('textarea', { name: f.name })
        : f.type === 'select' ? el('select', { name: f.name }, f.options.map(function (o) { return el('option', { value: o.v !== undefined ? o.v : o, text: o.t || o }); }))
        : el('input', { type: f.type || 'text', name: f.name });
      input.value = val;
      inputs[f.name] = input;
      return el('label', { class: f.wide ? 'wide' : '' }, [document.createTextNode(f.label), input]);
    }).concat([
      el('div', { class: 'actions' }, [
        el('button', { class: 'btn btn-primary btn-sm', type: 'submit', style: 'width:auto', text: 'שמירה' }),
        el('button', { class: 'btn btn-ghost btn-sm', type: 'button', text: 'ביטול', onclick: function () { form.remove(); } })
      ])
    ]));
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var out = {};
      fields.forEach(function (f) {
        var v = inputs[f.name].value.trim();
        out[f.name] = f.type === 'number' && v !== '' ? parseFloat(v) : v;
      });
      form.remove();
      onSave(out);
    });
    panel.insertBefore(form, panel.querySelector('.table-wrap') || null);
    inputs[fields[0].name].focus();
  }

  function makeTable(headers) {
    var tbody = el('tbody');
    var wrap = el('div', { class: 'table-wrap' }, [
      el('table', {}, [
        el('thead', {}, [el('tr', {}, headers.map(function (h) { return el('th', { text: h }); }))]),
        tbody
      ])
    ]);
    return { wrap: wrap, tbody: tbody };
  }
  function td(content, cls) {
    var c = el('td', { class: cls || '' });
    if (typeof content === 'string') c.textContent = content;
    else if (content) c.appendChild(content);
    return c;
  }
  function titleCell(text, demo) {
    var c = el('td', { class: 'title', text: text });
    if (demo) c.appendChild(el('span', { class: 'tag-demo', text: 'הדגמה' }));
    return c;
  }
  function emptyRow(tbody, cols, text) {
    tbody.appendChild(el('tr', {}, [el('td', { class: 'muted', colspan: String(cols), text: text })]));
  }

  /* =============== אירועים =============== */
  var EVENT_FIELDS = [
    { name: 'title', label: 'כותרת' },
    { name: 'date', label: 'תאריך', type: 'date' },
    { name: 'time', label: 'שעות (למשל 09:00–13:00)' },
    { name: 'location', label: 'מיקום' },
    { name: 'registerUrl', label: 'קישור הרשמה (טופס גוגל)' },
    { name: 'status', label: 'סטטוס', type: 'select', options: [{ v: 'published', t: 'מפורסם' }, { v: 'draft', t: 'טיוטה' }] },
    { name: 'description', label: 'תיאור', type: 'textarea', wide: true }
  ];
  function renderEventsAdmin() {
    var section = $('.view[data-view="events"] .panel');
    var oldWrap = section.querySelector('.table-wrap');
    var t = makeTable(['תאריך', 'כותרת', 'מיקום', 'שעות', 'סטטוס', '']);
    oldWrap.replaceWith(t.wrap);
    var chips = section.querySelectorAll('.tools .chip');
    var filter = '';
    chips.forEach(function (c) {
      c.style.cursor = 'pointer';
      c.addEventListener('click', function () {
        chips.forEach(function (x) { x.classList.remove('on'); });
        c.classList.add('on');
        filter = c.textContent === 'מפורסם' ? 'published' : c.textContent === 'טיוטה' ? 'draft' : c.textContent === 'הסתיים' ? 'past' : '';
        draw();
      });
    });
    var addBtn = section.querySelector('.btn-primary');
    addBtn.addEventListener('click', function () {
      openForm(section, EVENT_FIELDS, { status: 'published' }, function (out) { WStore.add('events', out); refreshAll(); });
    });
    function draw() {
      var today = WDyn.todayISO();
      var evs = WStore.get('events').slice().sort(function (a, b) { return a.date < b.date ? 1 : -1; });
      if (filter === 'past') evs = evs.filter(function (e) { return e.date < today; });
      else if (filter) evs = evs.filter(function (e) { return e.status === filter; });
      t.tbody.textContent = '';
      if (!evs.length) return emptyRow(t.tbody, 6, 'אין אירועים');
      evs.forEach(function (ev) {
        t.tbody.appendChild(el('tr', {}, [
          td(fmtDate(ev.date), 'muted tnum'),
          titleCell(ev.title, ev.demo),
          td(ev.location || '—', 'muted'),
          td(ev.time || '—', 'muted tnum'),
          td(ev.date < today ? pill('הסתיים', 'neutral') : statusPill(ev.status)),
          td(el('div', { class: 'row-actions' }, [
            actBtn('edit', 'עריכה', function () {
              openForm(section, EVENT_FIELDS, ev, function (out) { WStore.update('events', ev.id, out); refreshAll(); });
            }),
            actBtn('del', 'מחיקה', function () { WStore.remove('events', ev.id); refreshAll(); })
          ]))
        ]));
      });
    }
    renderEventsAdmin.draw = draw;
    draw();
  }

  /* =============== הודעות =============== */
  var NEWS_FIELDS = [
    { name: 'title', label: 'כותרת' },
    { name: 'date', label: 'תאריך', type: 'date' },
    { name: 'section', label: 'מדור', type: 'select', options: ['מאמרים', 'מודעות ופרסומים', 'איגרת', 'מוסדות', 'כללי'] },
    { name: 'contact', label: 'שם ופרטי קשר של המפרסם' },
    { name: 'link', label: 'קישור (לא חובה)' },
    { name: 'status', label: 'סטטוס', type: 'select', options: [{ v: 'approved', t: 'מפורסם' }, { v: 'pending', t: 'ממתין לאישור' }] },
    { name: 'summary', label: 'תוכן ההודעה', type: 'textarea', wide: true }
  ];
  function renderNewsAdmin() {
    var section = $('.view[data-view="news"] .panel');
    var t = makeTable(['תאריך', 'כותרת', 'מדור', 'סטטוס', '']);
    section.querySelector('.table-wrap').replaceWith(t.wrap);
    section.querySelector('.btn-primary').addEventListener('click', function () {
      openForm(section, NEWS_FIELDS, { date: WDyn.todayISO(), status: 'approved' }, function (out) { WStore.add('news', out); refreshAll(); });
    });
    function draw() {
      var items = WStore.get('news').slice().sort(function (a, b) {
        var ap = a.status === 'pending' ? 0 : 1, bp = b.status === 'pending' ? 0 : 1;
        if (ap !== bp) return ap - bp;
        return a.date < b.date ? 1 : -1;
      });
      t.tbody.textContent = '';
      if (!items.length) return emptyRow(t.tbody, 5, 'אין הודעות');
      items.forEach(function (n) {
        var actions = [];
        if (n.status === 'pending') {
          actions.push(actBtn('ok', 'אישור ופרסום', function () { WStore.update('news', n.id, { status: 'approved' }); refreshAll(); }));
        }
        actions.push(actBtn('edit', 'עריכה', function () { openForm(section, NEWS_FIELDS, n, function (out) { WStore.update('news', n.id, out); refreshAll(); }); }));
        actions.push(actBtn('del', 'מחיקה', function () { WStore.remove('news', n.id); refreshAll(); }));
        t.tbody.appendChild(el('tr', {}, [
          td(fmtDate(n.date), 'muted tnum'),
          titleCell(n.title, n.demo),
          td(n.section, 'muted'),
          td(statusPill(n.status || 'approved')),
          td(el('div', { class: 'row-actions' }, actions))
        ]));
      });
    }
    renderNewsAdmin.draw = draw;
    draw();
  }

  /* =============== ספרייה (עבודות ומאמרים / חומרי הוראה / טפסים) =============== */
  var LIB_PANELS = [
    { col: 'library', title: 'עבודות ומאמרים', fields: [
      { name: 'title', label: 'כותרת' },
      { name: 'kind', label: 'סוג', type: 'select', options: ['מאמר', 'עבודה אקדמית', 'עבודת סיום', 'ספר'] },
      { name: 'url', label: 'קישור לקובץ' },
      { name: 'description', label: 'תיאור', type: 'textarea', wide: true }
    ], cols: ['סוג', 'כותרת', 'קובץ', ''], row: function (it) { return [td(it.kind, 'muted'), titleCell(it.title, it.demo), td(it.url ? 'מקושר' : 'חסר', 'muted')]; } },
    { col: 'teaching', title: 'חומרי הוראה', fields: [
      { name: 'title', label: 'כותרת' },
      { name: 'group', label: 'קבוצה', type: 'select', options: ['סיפורים, שירים ודקלומים', 'דפי עבודה להדפסה', 'מצגות ותמונות להוראה', 'חומרי העשרה לתיכון'] },
      { name: 'url', label: 'קישור לקובץ' }
    ], cols: ['קבוצה', 'כותרת', 'קובץ', ''], row: function (it) { return [td(it.group, 'muted'), titleCell(it.title, it.demo), td(it.url ? 'מקושר' : 'חסר', 'muted')]; } },
    { col: 'forms', title: 'מאגר טפסים', fields: [
      { name: 'title', label: 'שם הטופס' },
      { name: 'category', label: 'קטגוריה', type: 'select', options: ['הרשמה', 'בקשות', 'אישורים'] },
      { name: 'url', label: 'קישור לקובץ' },
      { name: 'description', label: 'תיאור', type: 'textarea', wide: true }
    ], cols: ['קטגוריה', 'שם', 'קובץ', ''], row: function (it) { return [td(it.category, 'muted'), titleCell(it.title, it.demo), td(it.url ? 'מקושר' : 'חסר', 'muted')]; } }
  ];
  function renderLibAdmin() {
    var view = $('.view[data-view="lib"]');
    view.textContent = '';
    view.appendChild(el('p', { class: 'crumb', text: 'עבודות ומאמרים, חומרי הוראה ומאגר הטפסים — מוצגים בעמוד "ספריית תוכן"' }));
    LIB_PANELS.forEach(function (cfg) {
      var t = makeTable(cfg.cols);
      var addBtn = el('button', { class: 'btn btn-primary btn-sm', style: 'width:auto' });
      addBtn.innerHTML = I.plus;
      addBtn.appendChild(document.createTextNode('פריט חדש'));
      var panel = el('div', { class: 'panel' }, [
        el('div', { class: 'panel-head' }, [el('h2', { text: cfg.title }), el('div', { class: 'grow' }), addBtn]),
        t.wrap
      ]);
      addBtn.addEventListener('click', function () {
        openForm(panel, cfg.fields, null, function (out) { WStore.add(cfg.col, out); refreshAll(); });
      });
      cfg._draw = function () {
        var items = WStore.get(cfg.col);
        t.tbody.textContent = '';
        if (!items.length) return emptyRow(t.tbody, cfg.cols.length, 'אין פריטים');
        items.forEach(function (it) {
          t.tbody.appendChild(el('tr', {}, cfg.row(it).concat([
            td(el('div', { class: 'row-actions' }, [
              actBtn('edit', 'עריכה', function () { openForm(panel, cfg.fields, it, function (out) { WStore.update(cfg.col, it.id, out); refreshAll(); }); }),
              actBtn('del', 'מחיקה', function () { WStore.remove(cfg.col, it.id); refreshAll(); })
            ]))
          ])));
        });
      };
      cfg._draw();
      view.appendChild(panel);
    });
  }

  /* =============== מדיה (סרטונים + פודקאסט) =============== */
  var MEDIA_PANELS = [
    { col: 'videos', title: 'סרטונים', fields: [
      { name: 'title', label: 'כותרת' },
      { name: 'youtubeId', label: 'מזהה יוטיוב (למשל dQw4w9WgXcQ)' },
      { name: 'description', label: 'תיאור', type: 'textarea', wide: true }
    ], cols: ['כותרת', 'יוטיוב', ''], row: function (it) { return [titleCell(it.title, it.demo), td(it.youtubeId || 'חסר', 'muted tnum')]; } },
    { col: 'podcast', title: 'פרקי פודקאסט', fields: [
      { name: 'num', label: 'מספר פרק', type: 'number' },
      { name: 'title', label: 'כותרת' },
      { name: 'date', label: 'תאריך', type: 'date' },
      { name: 'duration', label: 'משך (למשל 42 דק׳)' },
      { name: 'url', label: 'קישור לקובץ שמע' },
      { name: 'description', label: 'תיאור', type: 'textarea', wide: true }
    ], cols: ['פרק', 'כותרת', 'תאריך', 'שמע', ''], row: function (it) { return [td(String(it.num || '—'), 'muted tnum'), titleCell(it.title, it.demo), td(fmtDate(it.date), 'muted tnum'), td(it.url ? 'מקושר' : 'חסר', 'muted')]; } }
  ];
  function renderMediaAdmin() {
    var host = $('#mediaAdmin');
    host.textContent = '';
    MEDIA_PANELS.forEach(function (cfg) {
      var t = makeTable(cfg.cols);
      var addBtn = el('button', { class: 'btn btn-primary btn-sm', style: 'width:auto' });
      addBtn.innerHTML = I.plus;
      addBtn.appendChild(document.createTextNode('הוספה'));
      var panel = el('div', { class: 'panel' }, [
        el('div', { class: 'panel-head' }, [el('h2', { text: cfg.title }), el('div', { class: 'grow' }), addBtn]),
        t.wrap
      ]);
      addBtn.addEventListener('click', function () {
        openForm(panel, cfg.fields, null, function (out) { WStore.add(cfg.col, out); refreshAll(); });
      });
      cfg._draw = function () {
        var items = WStore.get(cfg.col);
        t.tbody.textContent = '';
        if (!items.length) return emptyRow(t.tbody, cfg.cols.length, 'אין פריטים');
        items.forEach(function (it) {
          t.tbody.appendChild(el('tr', {}, cfg.row(it).concat([
            td(el('div', { class: 'row-actions' }, [
              actBtn('edit', 'עריכה', function () { openForm(panel, cfg.fields, it, function (out) { WStore.update(cfg.col, it.id, out); refreshAll(); }); }),
              actBtn('del', 'מחיקה', function () { WStore.remove(cfg.col, it.id); refreshAll(); })
            ]))
          ])));
        });
      };
      cfg._draw();
      host.appendChild(panel);
    });
  }

  /* =============== מודרציה: לוח קהילתי + לוח משרות =============== */
  var MOD_PANELS = [
    { col: 'news', title: 'הודעות (לוח פתוח לציבור)', cols: ['תאריך', 'כותרת', 'מדור', 'מפרסם', 'סטטוס', ''],
      row: function (it) { return [td(fmtDate(it.date), 'muted tnum'), titleCell(it.title, it.demo), td(it.section || '—', 'muted'), td(it.contact || '—', 'muted'), td(statusPill(it.status || 'approved'))]; } },
    { col: 'board', title: 'לוח קהילתי', cols: ['תאריך', 'כותרת', 'קטגוריה', 'אזור', 'סטטוס', ''],
      row: function (it) { return [td(fmtDate(it.date), 'muted tnum'), titleCell(it.title, it.demo), td(it.category || '—', 'muted'), td(it.region || '—', 'muted'), td(statusPill(it.status))]; } },
    { col: 'jobs', title: 'לוח משרות', cols: ['תאריך', 'תפקיד', 'מוסד', 'קטגוריה', 'סטטוס', ''],
      row: function (it) { return [td(fmtDate(it.date), 'muted tnum'), titleCell(it.role, it.demo), td(it.institution || '—', 'muted'), td(it.category || '—', 'muted'), td(statusPill(it.status))]; } }
  ];
  function renderModAdmin() {
    var host = $('#modAdmin');
    host.textContent = '';
    MOD_PANELS.forEach(function (cfg) {
      var t = makeTable(cfg.cols);
      var panel = el('div', { class: 'panel' }, [
        el('div', { class: 'panel-head' }, [el('h2', { text: cfg.title }), el('div', { class: 'grow' })]),
        t.wrap
      ]);
      cfg._draw = function () {
        var items = WStore.get(cfg.col).slice().sort(function (a, b) {
          return (a.status === 'pending' ? 0 : 1) - (b.status === 'pending' ? 0 : 1);
        });
        t.tbody.textContent = '';
        if (!items.length) return emptyRow(t.tbody, cfg.cols.length, 'אין פריטים');
        items.forEach(function (it) {
          var actions = [];
          if (it.status === 'pending') {
            actions.push(actBtn('ok', 'אישור ופרסום', function () { WStore.update(cfg.col, it.id, { status: 'approved' }); refreshAll(); }));
          }
          actions.push(actBtn('del', 'מחיקה', function () { WStore.remove(cfg.col, it.id); refreshAll(); }));
          t.tbody.appendChild(el('tr', {}, cfg.row(it).concat([td(el('div', { class: 'row-actions' }, actions))])));
        });
      };
      cfg._draw();
      host.appendChild(panel);
    });
  }

  /* =============== אודות הפורום =============== */
  var ABOUT_DEFAULT_HINT = 'ריק = יוצג הטקסט הקבוע של העמוד. שורות שמתחילות ב"- " יהפכו לרשימה.';
  /* =============== אודות הפורום — טיוטה, פרסום, היסטוריה ושחזור =============== */
  var ABOUT_SECTIONS = [['intro', 'מבוא'], ['activities', 'פעילויות שוטפות'], ['admission', 'קבלת בתי ספר לארגון']];

  function renderAboutAdmin() {
    var host = $('#aboutAdmin');
    if (!host) return;
    host.textContent = '';
    var areas = {}, statusPillEl, msgEl;

    function values() {
      var out = {};
      Object.keys(areas).forEach(function (k) { if (areas[k].value.trim()) out[k] = areas[k].value.trim(); });
      return out;
    }
    function fill(obj) {
      ABOUT_SECTIONS.forEach(function (p) { areas[p[0]].value = (obj && obj[p[0]]) || ''; });
    }
    function say(text, tone) {
      if (!msgEl) return;
      msgEl.textContent = text || '';
      msgEl.className = 'empty-hint' + (tone ? ' ' + tone : '');
    }

    var editor = el('form', { class: 'aform', style: 'border-bottom:none' },
      ABOUT_SECTIONS.map(function (pair) {
        var ta = el('textarea', { style: 'min-height:110px' });
        areas[pair[0]] = ta;
        return el('label', { class: 'wide' }, [document.createTextNode(pair[1]), ta]);
      }));
    editor.addEventListener('submit', function (e) { e.preventDefault(); });

    var btnDraft = el('button', { class: 'btn btn-ghost btn-sm', type: 'button', text: 'שמירה כטיוטה' });
    var btnPublish = el('button', { class: 'btn btn-primary btn-sm', type: 'button', style: 'width:auto', text: 'פרסום' });
    var btnDiscard = el('button', { class: 'btn btn-ghost btn-sm', type: 'button', text: 'ביטול הטיוטה' });
    statusPillEl = el('span', { class: 'pill neutral', text: '—' });
    msgEl = el('span', { class: 'empty-hint', style: 'align-self:center' });

    var panel = el('div', { class: 'panel' }, [
      el('div', { class: 'panel-head' }, [
        el('h2', { text: 'תוכן העמוד' }), statusPillEl, el('div', { class: 'grow' })
      ]),
      editor,
      el('div', { class: 'actions', style: 'padding:0 20px 18px;display:flex;gap:10px;flex-wrap:wrap' },
         [btnPublish, btnDraft, btnDiscard, msgEl])
    ]);
    var historyPanel = el('div', { class: 'panel' }, [
      el('div', { class: 'panel-head' }, [el('h2', { text: 'היסטוריית שינויים' }), el('div', { class: 'grow' })])
    ]);
    var historyBody = el('div');
    historyPanel.appendChild(historyBody);
    host.appendChild(panel);
    host.appendChild(historyPanel);

    function refreshState() {
      return WStore.aboutState().then(function (st) {
        // A draft, if one exists, is what the editor should be working on —
        // otherwise you would silently overwrite it with the published text.
        fill(st.hasDraft ? st.draft : st.published);
        statusPillEl.textContent = st.hasDraft ? 'יש טיוטה שלא פורסמה' : (st.published ? 'מפורסם' : 'לא נכתב עדיין');
        statusPillEl.className = 'pill ' + (st.hasDraft ? 'warn' : st.published ? 'ok' : 'neutral');
        btnDiscard.style.display = st.hasDraft ? '' : 'none';
      });
    }

    function refreshHistory() {
      historyBody.textContent = '';
      return WStore.aboutVersions().then(function (list) {
        historyBody.textContent = '';
        if (!list.length) {
          historyBody.appendChild(el('p', { class: 'empty-hint', text: 'טרם נשמרו גרסאות. כל שמירה או פרסום ייווספו כאן.' }));
          return;
        }
        var t = makeTable(['מתי', 'סוג', 'מי', 'תחילת הטקסט', '']);
        var tb = t.tbody;
        list.forEach(function (v) {
          var when = new Date(v.created_at * 1000);
          var preview = ABOUT_SECTIONS.map(function (p) { return v.value && v.value[p[0]]; })
            .filter(Boolean).join(' · ').slice(0, 60) || '(ריק)';
          var restore = actBtn('edit', 'שחזור', function () {
            if (!confirm('לשחזר את הגרסה הזו ולפרסם אותה? הגרסה הנוכחית תישמר בהיסטוריה.')) return;
            WStore.restoreAbout(v.id).then(function () {
              say('הגרסה שוחזרה ופורסמה', '');
              return Promise.all([refreshState(), refreshHistory()]);
            }).catch(function () { say('השחזור נכשל', 'crit'); });
          });
          tb.appendChild(el('tr', {}, [
            td(when.toLocaleDateString('he-IL') + ' ' + when.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }), 'muted tnum'),
            td(el('span', { class: 'pill ' + (v.status === 'published' ? 'ok' : 'neutral'),
                            text: v.status === 'published' ? 'פורסם' : 'טיוטה' })),
            td(v.author || '—', 'muted'),
            td(v.note ? v.note + ' — ' + preview : preview, 'muted'),
            td(el('div', { class: 'row-actions' }, [restore]))
          ]));
        });
        historyBody.appendChild(t.wrap);
      }).catch(function () {
        historyBody.textContent = '';
        historyBody.appendChild(el('p', { class: 'empty-hint', text: 'לא ניתן לטעון היסטוריה (נדרשת התחברות).' }));
      });
    }

    btnDraft.addEventListener('click', function () {
      say('שומר…');
      WStore.saveAboutDraft(values()).then(function () {
        say('נשמר כטיוטה — העמוד באתר לא השתנה');
        return Promise.all([refreshState(), refreshHistory()]);
      }).catch(function () { say('השמירה נכשלה — נדרשת התחברות', 'crit'); });
    });
    btnPublish.addEventListener('click', function () {
      say('מפרסם…');
      WStore.publishAbout(values()).then(function () {
        say('פורסם — העמוד באתר עודכן');
        return Promise.all([refreshState(), refreshHistory()]);
      }).catch(function () { say('הפרסום נכשל — נדרשת התחברות', 'crit'); });
    });
    btnDiscard.addEventListener('click', function () {
      if (!confirm('לבטל את הטיוטה ולחזור לגרסה המפורסמת?')) return;
      WStore.discardAboutDraft().then(function () {
        say('הטיוטה בוטלה');
        return refreshState();
      }).catch(function () { say('הפעולה נכשלה', 'crit'); });
    });

    refreshState().catch(function () {
      say('לא ניתן לטעון את התוכן — נדרשת התחברות', 'crit');
    });
    refreshHistory();
  }

  /* =============== נקודות מפה (בתוך "מוסדות חינוך") =============== */
  var MAP_FIELDS = [
    { name: 'name', label: 'שם הנקודה' },
    { name: 'town', label: 'יישוב' },
    { name: 'count', label: 'מספר גנים', type: 'number' },
    { name: 'lat', label: 'קו רוחב (lat)', type: 'number' },
    { name: 'lng', label: 'קו אורך (lng)', type: 'number' }
  ];
  function renderMapAdmin() {
    var view = $('.view[data-view="inst"]');
    var host = view.querySelector('#mapPointsAdmin');
    if (!host) {
      host = el('div', { id: 'mapPointsAdmin' });
      view.appendChild(host);
    }
    host.textContent = '';
    var t = makeTable(['יישוב', 'שם', 'גנים', 'קואורדינטות', '']);
    var addBtn = el('button', { class: 'btn btn-primary btn-sm', style: 'width:auto' });
    addBtn.innerHTML = I.plus;
    addBtn.appendChild(document.createTextNode('נקודה חדשה'));
    var panel = el('div', { class: 'panel' }, [
      el('div', { class: 'panel-head' }, [el('h2', { text: 'נקודות המפה האינטראקטיבית (גני ילדים)' }), el('div', { class: 'grow' }), addBtn]),
      t.wrap
    ]);
    addBtn.addEventListener('click', function () {
      openForm(panel, MAP_FIELDS, { count: 1, url: './kinder-list.html' }, function (out) { out.url = './kinder-list.html'; WStore.add('mapPoints', out); refreshAll(); });
    });
    function draw() {
      var pts = WStore.get('mapPoints');
      t.tbody.textContent = '';
      if (!pts.length) return emptyRow(t.tbody, 5, 'אין נקודות');
      pts.forEach(function (p) {
        t.tbody.appendChild(el('tr', {}, [
          td(p.town, 'muted'),
          titleCell(p.name),
          td(String(p.count || 1), 'muted tnum'),
          td((p.lat != null ? p.lat : '—') + ', ' + (p.lng != null ? p.lng : '—'), 'muted tnum'),
          td(el('div', { class: 'row-actions' }, [
            actBtn('edit', 'עריכה', function () { openForm(panel, MAP_FIELDS, p, function (out) { WStore.update('mapPoints', p.id, out); refreshAll(); }); }),
            actBtn('del', 'מחיקה', function () { WStore.remove('mapPoints', p.id); refreshAll(); })
          ]))
        ]));
      });
    }
    renderMapAdmin.draw = draw;
    draw();
    host.appendChild(panel);
  }

  /* =============== לוח הבקרה: מונים + טבלת אירועים =============== */
  /* כל מספר במסך הזה מגיע מהמאגר. מה שאין לו מקור אמיתי — לא מוצג כמספר. */
  function refreshCounts() {
    var today = WDyn.todayISO();
    var events = WStore.get('events');
    var upcoming = events.filter(function (e) { return e.status === 'published' && e.date >= today; }).length;
    var libTotal = WStore.get('library').length + WStore.get('teaching').length + WStore.get('forms').length;
    var pending = WStore.get('news').concat(WStore.get('board'), WStore.get('jobs'))
      .filter(function (i) { return i.status === 'pending'; }).length;
    var institutions = WStore.get('mapPoints').length;

    function setText(sel, val) { var n = $(sel); if (n) n.textContent = val; }
    setText('#kpiEvents', String(upcoming));
    setText('#kpiEventsSub', upcoming ? 'מתוך ' + events.length + ' אירועים במאגר' : 'אין אירועים עתידיים');
    setText('#kpiPending', String(pending));
    setText('#kpiPendingSub', pending ? 'ממתינות לאישור מנהל' : 'הכול מאושר');
    setText('#kpiLibrary', String(libTotal));
    setText('#kpiLibrarySub', 'מאמרים, חומרי הוראה וטפסים');
    /* מנויי הניוזלטר מגיעים משירות דיוור שטרם חובר — נשאר "לא מחובר" */

    var evCount = $('.nav-link[data-view="events"] .count'); if (evCount) evCount.textContent = String(events.length);
    var libCount = $('.nav-link[data-view="lib"] .count'); if (libCount) libCount.textContent = String(libTotal);
    var instCount = $('.nav-link[data-view="inst"] .count'); if (instCount) instCount.textContent = String(institutions);
    var modCount = $('#modCount'); if (modCount) { modCount.textContent = String(pending); modCount.style.background = pending ? 'var(--warn)' : ''; }

    var homeTbody = $('.view[data-view="home"] tbody');
    if (homeTbody) {
      var evs = events.filter(function (e) { return e.status === 'published' && e.date >= today; })
        .sort(function (a, b) { return a.date < b.date ? -1 : 1; }).slice(0, 5);
      homeTbody.textContent = '';
      if (!evs.length) emptyRow(homeTbody, 5, 'אין אירועים קרובים');
      evs.forEach(function (ev) {
        homeTbody.appendChild(el('tr', {}, [
          td(fmtDate(ev.date), 'muted tnum'),
          titleCell(ev.title, ev.demo),
          td(ev.location || '—', 'muted'),
          td(statusPill(ev.status)),
          td(el('div'))
        ]));
      });
    }
    renderActivity();
  }

  /* פעילות אחרונה — נגזרת מחותמות הזמן במאגר, לא רשימה כתובה מראש. */
  function renderActivity() {
    var host = document.querySelector('.view[data-view="home"] .activity');
    if (!host) return;
    var LABEL = { events: 'אירוע', news: 'הודעה', board: 'מודעה', jobs: 'משרה', library: 'פריט בספרייה',
                  teaching: 'חומר הוראה', forms: 'טופס', mapPoints: 'מוסד במפה', videos: 'סרטון', podcast: 'פרק פודקאסט' };
    function ago(ts) {
      var s = Math.max(0, Math.floor(Date.now() / 1000 - ts));
      if (s < 90) return 'ממש עכשיו';
      if (s < 3600) return 'לפני ' + Math.round(s / 60) + ' דק׳';
      if (s < 86400) return 'לפני ' + Math.round(s / 3600) + ' שע׳';
      return 'לפני ' + Math.round(s / 86400) + ' ימים';
    }
    WStore.activity().then(function (rows) {
      host.textContent = '';
      if (!rows.length) {
        host.appendChild(el('p', { class: 'empty-hint', text: 'טרם בוצעו שינויים בתוכן.' }));
        return;
      }
      rows.slice(0, 6).forEach(function (r) {
        host.appendChild(el('div', { class: 'act-item' }, [
          el('div', { class: 'act-dot' }),
          el('div', { class: 't' }, [
            el('b', { text: r.title || '(ללא כותרת)' }),
            el('div', { class: 'when', text: (LABEL[r.collection] || r.collection) + ' · ' +
              (r.isNew ? 'נוסף' : 'עודכן') + ' ' + ago(r.updatedAt) })
          ])
        ]));
      });
    }).catch(function () {
      host.textContent = '';
      host.appendChild(el('p', { class: 'empty-hint', text: 'היסטוריית הפעילות זמינה לאחר התחברות.' }));
    });
  }

  function refreshAll() {
    refreshCounts();
    if (renderEventsAdmin.draw) renderEventsAdmin.draw();
    if (renderNewsAdmin.draw) renderNewsAdmin.draw();
    LIB_PANELS.forEach(function (c) { if (c._draw) c._draw(); });
    MEDIA_PANELS.forEach(function (c) { if (c._draw) c._draw(); });
    MOD_PANELS.forEach(function (c) { if (c._draw) c._draw(); });
    if (renderMapAdmin.draw) renderMapAdmin.draw();
  }


  /* =============== נציגי פורום — משתמשי מערכת הניהול =============== */
  var ROLE_NAMES = { super_admin: 'מנהל־על', admin: 'מנהל', editor: 'עורך' };
  var ROLE_HELP = {
    super_admin: 'הרשאה מלאה, כולל ניהול משתמשים',
    admin: 'עריכת כל התוכן ואישור מודעות',
    editor: 'עריכת תוכן בלבד'
  };

  function renderPeopleAdmin() {
    var host = $('#peopleAdmin');
    if (!host) return;
    host.textContent = '';

    var me = WStore.currentUser();
    if (!me) {
      host.appendChild(el('div', { class: 'panel' }, [
        el('div', { class: 'panel-head' }, [el('h2', { text: 'נדרשת התחברות' })]),
        el('p', { class: 'empty-hint', text: 'רשימת המשתמשים זמינה רק לאחר התחברות עם שם משתמש וסיסמה.' })
      ]));
      return;
    }
    var boss = me.role === 'super_admin';

    var panel = el('div', { class: 'panel' });
    var head = el('div', { class: 'panel-head' }, [
      el('h2', { text: 'משתמשי המערכת' }), el('div', { class: 'grow' })
    ]);
    if (boss) {
      var addBtn = el('button', { class: 'btn btn-ghost btn-sm', type: 'button', text: '+ משתמש חדש' });
      addBtn.addEventListener('click', function () { openUserForm(null); });
      head.appendChild(addBtn);
    }
    panel.appendChild(head);

    var t = makeTable(['שם', 'דוא"ל', 'תפקיד', 'כניסה אחרונה', '']);
    var tbody = t.tbody;
    panel.appendChild(t.wrap);
    var formHost = el('div');
    panel.appendChild(formHost);
    host.appendChild(panel);

    function fmtLogin(ts) {
      if (!ts) return 'טרם התחבר';
      var d = new Date(ts * 1000);
      return d.toLocaleDateString('he-IL') + ' ' + d.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
    }

    function draw() {
      tbody.textContent = '';
      WStore.users().then(function (list) {
        tbody.textContent = '';
        if (!list.length) { emptyRow(tbody, 5, 'אין משתמשים'); return; }
        list.forEach(function (u) {
          var actions = el('div', { class: 'row-actions' });
          if (boss) {
            actions.appendChild(actBtn('edit', 'עריכה', function () { openUserForm(u); }));
            if (u.id !== me.id) {
              actions.appendChild(actBtn('del', 'מחיקה', function () {
                if (!confirm('למחוק את המשתמש "' + u.name + '"? הפעולה אינה הפיכה.')) return;
                WStore.deleteUser(u.id).then(draw).catch(function (e) {
                  alert(e && e.body && e.body.error === 'last_super_admin'
                    ? 'לא ניתן למחוק את מנהל־העל האחרון.' : 'המחיקה נכשלה.');
                });
              }));
            }
          } else if (u.id === me.id) {
            actions.appendChild(actBtn('edit', 'שינוי סיסמה', function () { openUserForm(u, true); }));
          }
          tbody.appendChild(el('tr', {}, [
            titleCell(u.name + (u.id === me.id ? ' (אני)' : ''), false),
            td(u.email, 'muted'),
            td(el('span', { class: 'pill ' + (u.role === 'super_admin' ? 'ok' : 'neutral'),
                            title: ROLE_HELP[u.role] || '', text: ROLE_NAMES[u.role] || u.role })),
            td(fmtLogin(u.last_login), 'muted'),
            td(actions)
          ]));
        });
      }).catch(function () {
        tbody.textContent = '';
        emptyRow(tbody, 5, 'לא ניתן לטעון את רשימת המשתמשים');
      });
    }

    /** passwordOnly: a non-super-admin editing their own account. */
    function openUserForm(u, passwordOnly) {
      formHost.textContent = '';
      var isNew = !u;
      var fields = [];
      if (!passwordOnly) {
        fields.push({ name: 'name', label: 'שם מלא', type: 'text', required: true });
        fields.push({ name: 'email', label: 'דוא"ל', type: 'email', required: true });
        fields.push({ name: 'role', label: 'תפקיד', type: 'select', options: [
          { v: 'editor', t: ROLE_NAMES.editor }, { v: 'admin', t: ROLE_NAMES.admin }, { v: 'super_admin', t: ROLE_NAMES.super_admin }
        ] });
      }
      fields.push({ name: 'password', label: isNew ? 'סיסמה' : 'סיסמה חדשה (השאירו ריק כדי לא לשנות)', type: 'password', required: isNew });

      openForm(formHost, fields, u || { role: 'editor' }, function (vals) {
        var patch = {};
        Object.keys(vals).forEach(function (k) { if (vals[k] !== '' && vals[k] != null) patch[k] = vals[k]; });
        var done = function () { formHost.textContent = ''; draw(); };
        var oops = function (e) {
          var code = e && e.body && e.body.error;
          alert(code === 'email_taken' ? 'כתובת הדוא"ל כבר קיימת במערכת.'
              : code === 'forbidden' ? 'אין לך הרשאה לפעולה הזו.'
              : 'השמירה נכשלה.');
        };
        if (isNew) WStore.createUser(patch).then(done).catch(oops);
        else WStore.updateUser(u.id, patch).then(function () {
          // Changing a password ends that user's other sessions, including your own.
          if (patch.password && u.id === me.id) {
            alert('הסיסמה עודכנה. יש להתחבר מחדש.');
            WStore.logout().then(function () { location.href = './admin.html'; });
            return;
          }
          done();
        }).catch(oops);
      });
    }

    draw();
  }

  /* =============== איתחול =============== */
  /* התוכן מגיע מ-D1 דרך ה-API, כלומר לא זמין באופן מיידי כמו קודם. כל הציור
     ממתין ל-WStore.ready; ללא זה כל טבלה הייתה נטענת ריקה ומדווחת שגיאה. */
  function boot() {
    renderEventsAdmin();
    renderNewsAdmin();
    renderLibAdmin();
    renderMediaAdmin();
    renderModAdmin();
    renderAboutAdmin();
    renderMapAdmin();
    renderPeopleAdmin();
    refreshCounts();
  }

  function fail(err) {
    // Log it: a silent notice tells the operator something broke but not what,
    // and this is the only place a boot failure surfaces.
    if (window.console) console.error('admin boot failed:', err);
    var main = document.querySelector('.content') || document.body;
    var box = el('div', { class: 'notice crit', style: 'margin:20px' }, [
      el('b', { text: 'לא ניתן לטעון את התוכן מהמאגר. ' }),
      el('span', { text: err && err.status === 401
        ? 'נדרש מפתח ניהול — הזינו אותו במסך ההגדרות.'
        : 'בדקו את החיבור לאינטרנט ונסו לרענן.' })
    ]);
    main.insertBefore(box, main.firstChild);
  }

  WStore.ready.then(boot).catch(fail);

  /* כתיבה נכשלה בשרת — הקאש נטען מחדש, אז מציירים שוב כדי לא להשאיר על המסך
     עריכה שלא נשמרה. */
  WStore.onChange(function (err) {
    if (!WStore.isLoaded()) return;
    refreshAll();
    if (err) fail(err);
  });

  /* מי מחובר + יציאה */
  (function showUser() {
    var u = WStore.currentUser();
    var who = document.querySelector('.user .who b');
    var role = document.querySelector('.user .who span');
    if (u) {
      if (who) who.textContent = u.name;
      if (role) role.textContent = ROLE_NAMES[u.role] || u.role;
      var av = document.querySelector('.user .avatar');
      if (av) av.textContent = (u.name || '?').trim().charAt(0);
    } else {
      if (who) who.textContent = 'לא מחובר';
      if (role) role.textContent = 'צפייה בלבד';
    }
    var out = document.querySelector('.topbar .icon-btn[title], .topbar a.icon-btn');
    document.querySelectorAll('.topbar .icon-btn').forEach(function (b) {
      if (/יציאה|logout/i.test(b.getAttribute('title') || b.getAttribute('aria-label') || '')) {
        b.addEventListener('click', function (e) {
          e.preventDefault();
          WStore.logout().then(function () { location.href = './admin.html'; });
        });
      }
    });
  })();

  /* מפתח הניהול — נשמר בדפדפן בלבד, לא בקוד (המאגר ציבורי ב-GitHub). */
  (function wireAdminKey() {
    var input = $('#adminKey'), save = $('#adminKeySave'), clear = $('#adminKeyClear'), msg = $('#adminKeyMsg');
    if (!input || !save) return;
    if (WStore.hasAdminKey()) { input.placeholder = '•••••••• (מפתח שמור)'; if (msg) msg.textContent = 'מחובר עם מפתח ניהול'; }
    save.addEventListener('click', function () {
      var v = input.value.trim();
      if (!v) { if (msg) msg.textContent = 'לא הוזן מפתח'; return; }
      if (msg) msg.textContent = 'בודק…';
      WStore.setAdminKey(v).then(function () {
        input.value = ''; input.placeholder = '•••••••• (מפתח שמור)';
        if (msg) msg.textContent = 'המפתח נשמר — התוכן נטען מחדש';
        refreshAll();
      }).catch(function () {
        WStore.setAdminKey('');
        if (msg) msg.textContent = 'המפתח נדחה — בדקו שהעתקתם אותו במלואו';
      });
    });
    if (clear) clear.addEventListener('click', function () {
      WStore.setAdminKey('').then(function () {
        input.value = ''; input.placeholder = 'הדביקו כאן את המפתח';
        if (msg) msg.textContent = 'המפתח נמחק מהדפדפן'; refreshAll();
      });
    });
  })();

  var reset = $('#resetDemo');
  if (reset) reset.addEventListener('click', function () {
    WStore.reset().then(function () { location.reload(); });
  });

  /* רענון כשחוזרים לטאב (אם נערך תוכן ממקום אחר) */
  window.addEventListener('focus', function () { WStore.reload().catch(function () {}); });
})();
