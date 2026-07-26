/* admin-app.js — חיווט ממשק הניהול של המוקאפ ל-WStore.
   כל טבלה נטענת מאותו מאגר שמזין את העמודים הציבוריים (data.js + overlay ב-localStorage),
   כך שהוספה/עריכה/אישור כאן משתקפים מיד בעמודים הציבוריים באותו דפדפן. */
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
    { name: 'link', label: 'קישור (לא חובה)' },
    { name: 'summary', label: 'תקציר', type: 'textarea', wide: true }
  ];
  function renderNewsAdmin() {
    var section = $('.view[data-view="news"] .panel');
    var t = makeTable(['תאריך', 'כותרת', 'מדור', '']);
    section.querySelector('.table-wrap').replaceWith(t.wrap);
    section.querySelector('.btn-primary').addEventListener('click', function () {
      openForm(section, NEWS_FIELDS, { date: WDyn.todayISO() }, function (out) { WStore.add('news', out); refreshAll(); });
    });
    function draw() {
      var items = WStore.get('news').slice().sort(function (a, b) { return a.date < b.date ? 1 : -1; });
      t.tbody.textContent = '';
      if (!items.length) return emptyRow(t.tbody, 4, 'אין הודעות');
      items.forEach(function (n) {
        t.tbody.appendChild(el('tr', {}, [
          td(fmtDate(n.date), 'muted tnum'),
          titleCell(n.title, n.demo),
          td(n.section, 'muted'),
          td(el('div', { class: 'row-actions' }, [
            actBtn('edit', 'עריכה', function () { openForm(section, NEWS_FIELDS, n, function (out) { WStore.update('news', n.id, out); refreshAll(); }); }),
            actBtn('del', 'מחיקה', function () { WStore.remove('news', n.id); refreshAll(); })
          ]))
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
  function renderAboutAdmin() {
    var host = $('#aboutAdmin');
    host.textContent = '';
    var about = WStore.get('about') || {};
    var areas = {};
    var panel = el('div', { class: 'panel' }, [
      el('div', { class: 'panel-head' }, [el('h2', { text: 'תוכן העמוד' }), el('div', { class: 'grow' })]),
      el('form', { class: 'aform', style: 'border-bottom:none' }, [
        ['intro', 'מבוא'], ['activities', 'פעילויות שוטפות'], ['admission', 'קבלת בתי ספר לארגון']
      ].map(function (pair) {
        var ta = el('textarea', { style: 'min-height:110px' });
        ta.value = about[pair[0]] || '';
        areas[pair[0]] = ta;
        return el('label', { class: 'wide' }, [document.createTextNode(pair[1]), ta]);
      }).concat([
        el('p', { class: 'empty-hint', style: 'padding:0;grid-column:1/-1', text: ABOUT_DEFAULT_HINT }),
        el('div', { class: 'actions' }, [
          el('button', { class: 'btn btn-primary btn-sm', type: 'submit', style: 'width:auto', text: 'שמירה ופרסום' }),
          el('button', { class: 'btn btn-ghost btn-sm', type: 'button', text: 'שחזור ברירת המחדל', onclick: function () {
            WStore.set('about', null);
            renderAboutAdmin();
          } })
        ])
      ]))
    ]);
    panel.querySelector('form').addEventListener('submit', function (e) {
      e.preventDefault();
      var out = {};
      Object.keys(areas).forEach(function (k) { if (areas[k].value.trim()) out[k] = areas[k].value.trim(); });
      WStore.set('about', Object.keys(out).length ? out : null);
      e.target.querySelector('.btn-primary').textContent = 'נשמר ✓';
      setTimeout(function () { var b = panel.querySelector('.btn-primary'); if (b) b.textContent = 'שמירה ופרסום'; }, 1600);
    });
    host.appendChild(panel);
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
  function refreshCounts() {
    var today = WDyn.todayISO();
    var upcoming = WStore.get('events').filter(function (e) { return e.status === 'published' && e.date >= today; }).length;
    var libTotal = WStore.get('library').length + WStore.get('teaching').length + WStore.get('forms').length;
    var pending = WStore.get('board').concat(WStore.get('jobs')).filter(function (i) { return i.status === 'pending'; }).length;
    var evCount = $('.nav-link[data-view="events"] .count'); if (evCount) evCount.textContent = String(WStore.get('events').length);
    var libCount = $('.nav-link[data-view="lib"] .count'); if (libCount) libCount.textContent = String(libTotal);
    var modCount = $('#modCount'); if (modCount) { modCount.textContent = String(pending); modCount.style.background = pending ? 'var(--warn)' : ''; }
    var stats = document.querySelectorAll('.view[data-view="home"] .stat .num');
    if (stats[0]) stats[0].textContent = String(upcoming);
    if (stats[2]) stats[2].textContent = String(libTotal);
    /* טבלת האירועים בלוח הבקרה */
    var homeTbody = $('.view[data-view="home"] tbody');
    if (homeTbody) {
      var evs = WStore.get('events').filter(function (e) { return e.status === 'published' && e.date >= today; })
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

  /* =============== איתחול =============== */
  renderEventsAdmin();
  renderNewsAdmin();
  renderLibAdmin();
  renderMediaAdmin();
  renderModAdmin();
  renderAboutAdmin();
  renderMapAdmin();
  refreshCounts();

  var reset = $('#resetDemo');
  if (reset) reset.addEventListener('click', function () {
    WStore.reset();
    location.reload();
  });

  /* רענון כשחוזרים לטאב (אם הוגשו מודעות מטאב אחר) */
  window.addEventListener('focus', refreshAll);
})();
