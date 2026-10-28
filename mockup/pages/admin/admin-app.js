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
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
    freeze: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M4.2 7l15.6 10M4.2 17L19.8 7"/><path d="M9.5 3.5L12 6l2.5-2.5M9.5 20.5L12 18l2.5 2.5"/></svg>',
    thaw: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>'
  };
  // A delete is final: the API removes the row and nothing keeps a copy. So every
  // trash button asks first, naming the row it sits on. A caller that already asks
  // in its own words passes ownConfirm so the question is not put twice.
  function actBtn(kind, label, onClick, ownConfirm) {
    var handler = onClick;
    if (kind === 'del' && !ownConfirm) handler = function () {
      if (!canWrite()) return needSignIn();
      var cell = b.closest('tr') && b.closest('tr').querySelector('td.title');
      var name = cell && cell.firstChild ? cell.firstChild.textContent.trim() : '';
      if (!confirm((name ? 'למחוק את "' + name + '"?' : 'למחוק את הפריט?') + '\n\nהמחיקה סופית: אי אפשר לבטל אותה או לשחזר את הפריט.')) return;
      onClick();
    };
    var b = el('button', { class: 'act' + (kind === 'del' ? ' danger' : ''), 'aria-label': label, title: label, onclick: handler });
    b.innerHTML = I[kind];
    return b;
  }
  function setText(sel, val) { var n = $(sel); if (n) n.textContent = val; }
  function pill(text, tone) { return el('span', { class: 'pill ' + tone, text: text }); }
  function statusPill(st) {
    return st === 'published' || st === 'approved' ? pill('מפורסם', 'ok')
      : st === 'pending' ? pill('ממתין לאישור', 'warn')
      : st === 'draft' ? pill('טיוטה', 'warn')
      : st === 'frozen' ? pill('מוקפא', 'info')
      : st === 'active' ? pill('פעיל', 'ok')
      : st === 'inactive' ? pill('לא פעיל', 'neutral')
      : pill(st || '—', 'neutral');
  }

  /* ---- הקפאה: הסתרה מהאתר בלי מחיקה ---- */
  // Freezing takes an item off the site without deleting it, and unfreezing puts it
  // back. 'frozen' is a status of its own rather than 'draft' or 'pending', so a
  // paused item stays told apart from one that was never finished or approved. The
  // server withholds it from visitors because it is outside every publicStatus.
  // LIVE is the status a row has while visitors see it, the one freezing leaves and
  // unfreezing returns to. Only a live or frozen row gets the toggle: a draft or a
  // pending submission is already off the site. A row with no status at all comes
  // from a Worker that predates migration 0015 and cannot be frozen yet, so it gets
  // no button rather than one that fails.
  var LIVE = { events: 'published', news: 'approved', board: 'approved', jobs: 'approved', institutions: 'active' };
  function freezeBtn(col, it) {
    var live = LIVE[col] || 'published', frozen = it.status === 'frozen';
    if (!frozen && it.status !== live) return null;
    return actBtn(frozen ? 'thaw' : 'freeze', frozen ? 'ביטול הקפאה — החזרה לאתר' : 'הקפאה — הסתרה מהאתר', function () {
      WStore.update(col, it.id, { status: frozen ? live : 'frozen' }); refreshAll();
    });
  }

  /* ---- סגנונות טפסים לאדמין ---- */
  var st = document.createElement('style');
  st.textContent = [
    '.aform{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:12px;padding:16px 20px;border-bottom:1px solid var(--line);background:var(--sink)}',
    // --ink, not --brown-dark: this is label text, and --ink is the label ink in
    // all four :root blocks - the same token .field label uses in the page
    // stylesheet. --brown-dark used to mean two different things on the two dark
    // paths (#120C07 under @media (prefers-color-scheme:dark), #F2E7D8 under
    // [data-theme="dark"]), so these labels came up near-black on the dark panel
    // and only became readable once a theme toggle moved the page onto the
    // attribute path. patch-admin-contrast.mjs has since made the paths agree,
    // but the right token for label text was never that one.
    '.aform label{display:flex;flex-direction:column;gap:4px;font-size:.78rem;font-weight:600;color:var(--ink)}',
    '.aform .wide{grid-column:1/-1}',
    '.aform input,.aform select,.aform textarea{font-family:inherit;font-size:.88rem;color:var(--ink);background:var(--paper);border:1.5px solid var(--line);border-radius:var(--r);padding:9px 12px}',
    // The focus ring has to be visible against the field it rings: --tan measured
    // 2.27:1 on --paper in light mode, under the 3:1 WCAG 1.4.11 asks of a focus
    // indicator, and dropping the outline left that border as the only cue. --tan-dark
    // plus a ring of its own gives a mark that survives both dark paths too.
    '.aform input:focus-visible,.aform select:focus-visible,.aform textarea:focus-visible{outline:none;border-color:var(--tan-dark);box-shadow:0 0 0 3px color-mix(in oklab,var(--tan-dark) 45%,transparent)}',
    '.aform textarea{min-height:70px;resize:vertical}',
    '.aform .field-hint{font-size:.74rem;font-weight:400;color:var(--muted);line-height:1.45}',
    '.aform .actions{grid-column:1/-1;display:flex;gap:10px}',
    '.search{position:relative}',
    '.search-results{position:absolute;inset-inline:0;top:calc(100% + 6px);z-index:30;background:var(--paper);border:1px solid var(--line);border-radius:var(--r);box-shadow:var(--shadow);max-height:340px;overflow:auto;padding:4px}',
    '.search-results[hidden]{display:none}',
    '.search-results button{display:flex;width:100%;gap:8px;align-items:baseline;justify-content:space-between;text-align:start;background:none;border:0;border-radius:var(--r);padding:8px 10px;font:inherit;font-size:.84rem;color:var(--ink);cursor:pointer}',
    '.search-results button:hover,.search-results button:focus-visible,.search-results button[aria-selected=true]{background:var(--sink);outline:none}',
    '.search-results small{color:var(--muted);font-size:.74rem;white-space:nowrap}',
    '.search-results .none{padding:10px;color:var(--muted);font-size:.84rem}',
    '.kv{display:grid;grid-template-columns:max-content 1fr;gap:6px 18px;padding:14px 20px 18px;font-size:.88rem}',
    '.kv dt{color:var(--muted)}.kv dd{margin:0;color:var(--ink)}',
    '.tag-demo{font-size:.7rem;color:var(--muted);border:1px dashed var(--line);border-radius:var(--r-pill);padding:1px 8px;margin-inline-start:6px}'
  ].join('\n');
  document.head.appendChild(st);

  /* ---- טופס גנרי (הוספה/עריכה) ---- */
  openForm.hintSeq = 0;
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
      if (f.placeholder) input.setAttribute('placeholder', f.placeholder);
      if (f.autocomplete) input.setAttribute('autocomplete', f.autocomplete);
      inputs[f.name] = input;
      // A hint belongs to the field, so it is wired with aria-describedby rather than
      // left as loose text after it: a screen reader reaching the input by Tab reads
      // the label and nothing else otherwise, and the hint is where the format lives.
      var kids = [document.createTextNode(f.label), input];
      if (f.hint) {
        var hid = 'fh' + (++openForm.hintSeq);
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
      if (!canWrite()) return needSignIn();
      var out = {};
      fields.forEach(function (f) {
        var v = inputs[f.name].value.trim();
        // `clean` normalises what a human pasted into what the field actually stores,
        // at the one point every value passes through. Doing it here rather than in the
        // renderer means the stored value is the canonical one and nothing downstream
        // has to re-parse it.
        if (f.clean) v = f.clean(v);
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
  // `it`, when given, is the row: a table with no status column marks a frozen row here.
  function titleCell(text, demo, it) {
    var c = el('td', { class: 'title', text: text });
    if (demo) c.appendChild(el('span', { class: 'tag-demo', text: 'הדגמה' }));
    if (it && it.status === 'frozen') { c.appendChild(document.createTextNode(' ')); c.appendChild(pill('מוקפא', 'info')); }
    return c;
  }
  function emptyRow(tbody, cols, text) {
    tbody.appendChild(el('tr', {}, [el('td', { class: 'muted', colspan: String(cols), text: text })]));
  }

  // Filter chips. The markup is <button class="chip"> inside a role="group"; exactly one
  // carries .on. aria-pressed has to move with it, or the active filter is announced
  // identically to the inactive ones and the state is left to colour alone. `map` turns
  // the chip's own label into whatever the caller filters by, so the labels stay the
  // single source of truth for what a chip means.
  function wireChips(root, map, onChange) {
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
  }

  /* =============== אירועים =============== */
  var EVENT_FIELDS = [
    { name: 'title', label: 'כותרת' },
    { name: 'date', label: 'תאריך', type: 'date' },
    { name: 'time', label: 'שעות (למשל 09:00–13:00)' },
    { name: 'location', label: 'מיקום' },
    { name: 'registerUrl', label: 'קישור הרשמה (טופס גוגל)' },
    { name: 'status', label: 'סטטוס', type: 'select', options: [{ v: 'published', t: 'מפורסם' }, { v: 'frozen', t: 'מוקפא (מוסתר מהאתר)' }, { v: 'draft', t: 'טיוטה' }] },
    { name: 'description', label: 'תיאור', type: 'textarea', wide: true }
  ];
  function renderEventsAdmin() {
    var section = $('.view[data-view="events"] .panel');
    var oldWrap = section.querySelector('.table-wrap');
    var t = makeTable(['תאריך', 'כותרת', 'מיקום', 'שעות', 'סטטוס', '']);
    oldWrap.replaceWith(t.wrap);
    var filter = '';
    wireChips(section, function (label) {
      return label === 'מפורסם' ? 'published' : label === 'מוקפא' ? 'frozen' : label === 'טיוטה' ? 'draft' : label === 'הסתיים' ? 'past' : '';
    }, function (v) { filter = v; draw(); });
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
          td(ev.status === 'frozen' ? statusPill('frozen') : ev.date < today ? pill('הסתיים', 'neutral') : statusPill(ev.status)),
          td(el('div', { class: 'row-actions' }, [
            freezeBtn('events', ev),
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

  /* =============== מוסדות חינוך =============== */
  // A real collection (`institutions`, migration 0011), read and written through WStore
  // like every other view. The chips are labelled in the plural and the stored stage is
  // a code, so the label is mapped rather than compared.
  var STAGES = [{ v: 'gan', t: 'גן' }, { v: 'elementary', t: 'יסודי' }, { v: 'high', t: 'תיכון' }];
  var STAGE_LABEL = { gan: 'גן', elementary: 'יסודי', high: 'תיכון' };
  var INST_FIELDS = [
    { name: 'name', label: 'שם המוסד' },
    { name: 'town', label: 'יישוב' },
    { name: 'stage', label: 'שלב', type: 'select', options: STAGES },
    { name: 'status', label: 'סטטוס', type: 'select', options: [{ v: 'active', t: 'פעיל' }, { v: 'frozen', t: 'מוקפא (מוסתר מהאתר)' }, { v: 'pending', t: 'ממתין לאישור' }, { v: 'inactive', t: 'לא פעיל' }] },
    { name: 'url', label: 'אתר המוסד (כתובת)' },
    { name: 'contact', label: 'איש קשר / טלפון' },
    { name: 'description', label: 'תיאור', type: 'textarea', wide: true }
  ];
  function renderInstAdmin() {
    var section = $('.view[data-view="inst"] .panel');
    if (!section) return;
    var oldWrap = section.querySelector('.table-wrap');
    var t = makeTable(['שם המוסד', 'יישוב', 'שלב', 'סטטוס', '']);
    oldWrap.replaceWith(t.wrap);
    var filter = '';
    wireChips(section, function (label) {
      return { 'גנים': 'gan', 'יסודי': 'elementary', 'תיכון': 'high' }[label] || '';
    }, function (v) { filter = v; draw(); });
    section.querySelector('#instAddBtn').addEventListener('click', function () {
      openForm(section, INST_FIELDS, { stage: 'gan', status: 'active' }, function (out) { WStore.add('institutions', out); refreshAll(); });
    });
    function draw() {
      var items = WStore.get('institutions');
      if (filter) items = items.filter(function (i) { return i.stage === filter; });
      t.tbody.textContent = '';
      if (!items.length) return emptyRow(t.tbody, 5, filter ? 'אין מוסדות בשלב הזה' : 'עדיין לא נוספו מוסדות');
      items.forEach(function (it) {
        t.tbody.appendChild(el('tr', {}, [
          titleCell(it.name, it.demo),
          td(it.town || '—', 'muted'),
          td(STAGE_LABEL[it.stage] || it.stage || '—', 'muted'),
          td(statusPill(it.status)),
          td(el('div', { class: 'row-actions' }, [
            freezeBtn('institutions', it),
            actBtn('edit', 'עריכה', function () { openForm(section, INST_FIELDS, it, function (out) { WStore.update('institutions', it.id, out); refreshAll(); }); }),
            actBtn('del', 'מחיקה', function () { WStore.remove('institutions', it.id); refreshAll(); })
          ]))
        ]));
      });
    }
    renderInstAdmin.draw = draw;
    draw();
  }

  /* =============== הודעות =============== */
  var NEWS_FIELDS = [
    { name: 'title', label: 'כותרת' },
    { name: 'date', label: 'תאריך', type: 'date' },
    { name: 'section', label: 'מדור', type: 'select', options: ['מאמרים', 'מודעות ופרסומים', 'איגרת', 'מוסדות', 'כללי'] },
    { name: 'contact', label: 'שם ופרטי קשר של המפרסם' },
    { name: 'link', label: 'קישור (לא חובה)' },
    { name: 'status', label: 'סטטוס', type: 'select', options: [{ v: 'approved', t: 'מפורסם' }, { v: 'frozen', t: 'מוקפא (מוסתר מהאתר)' }, { v: 'pending', t: 'ממתין לאישור' }] },
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
        actions.push(freezeBtn('news', n));
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
      // 'עבודה' is the unresolved bucket: a work whose title page never says
      // which of the three it is. Leaving it on the list is what lets an editor
      // close the gap instead of the site guessing.
      { name: 'kind', label: 'סוג', type: 'select', options: ['מאמר', 'עבודה לתואר שני', 'עבודה סמינריונית', 'עבודה של מורי ולדורף', 'עבודה', 'ספר'] },
      { name: 'author', label: 'מחבר/ת' },
      { name: 'date', label: 'שנה' },
      // Was labelled 'קישור לעמוד הפריט', which named an implementation detail: for
      // the 104 works migrated in 0008 this holds the generated lib-<id>.html page, and
      // an editor adding a new work has no such page to point at. What the field really
      // is, is where the item opens - a PDF, a Drive link, or that generated page.
      // Attaching a file straight from the computer needs somewhere to put it; see the
      // hint, and the note in CLAUDE.md about R2 not being set up.
      { name: 'url', label: 'קישור למסמך', placeholder: 'https://…',
        hint: 'הדביקו כתובת של קובץ PDF או של מסמך ב-Google Drive. העלאת קובץ ישירות מהמחשב תתאפשר רק אחרי שיחובר אחסון קבצים (R2) — כרגע אין לאן לשמור אותו.' },
      { name: 'description', label: 'תיאור', type: 'textarea', wide: true }
    ], cols: ['סוג', 'כותרת', 'מחבר/ת', 'שנה', ''], row: function (it) { return [td(it.kind, 'muted'), titleCell(it.title, it.demo, it), td(it.author || '—', 'muted'), td(it.date || '—', 'muted')]; } },
    { col: 'teaching', title: 'חומרי הוראה', fields: [
      { name: 'title', label: 'כותרת' },
      { name: 'group', label: 'קבוצה', type: 'select', options: ['סיפורים, שירים ודקלומים', 'דפי עבודה להדפסה', 'מצגות ותמונות להוראה', 'חומרי העשרה לתיכון'] },
      { name: 'url', label: 'קישור לקובץ' }
    ], cols: ['קבוצה', 'כותרת', 'קובץ', ''], row: function (it) { return [td(it.group, 'muted'), titleCell(it.title, it.demo, it), td(it.url ? 'מקושר' : 'חסר', 'muted')]; } },
    { col: 'forms', title: 'מאגר טפסים', fields: [
      { name: 'title', label: 'שם הטופס' },
      { name: 'category', label: 'קטגוריה', type: 'select', options: ['הרשמה', 'בקשות', 'אישורים'] },
      { name: 'url', label: 'קישור לקובץ' },
      { name: 'description', label: 'תיאור', type: 'textarea', wide: true }
    ], cols: ['קטגוריה', 'שם', 'קובץ', ''], row: function (it) { return [td(it.category, 'muted'), titleCell(it.title, it.demo, it), td(it.url ? 'מקושר' : 'חסר', 'muted')]; } }
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
              freezeBtn(cfg.col, it),
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
    ], cols: ['כותרת', 'יוטיוב', ''], row: function (it) { return [titleCell(it.title, it.demo, it), td(it.youtubeId || 'חסר', 'muted tnum')]; } },
    { col: 'podcast', title: 'פרקי פודקאסט', fields: [
      { name: 'num', label: 'מספר פרק', type: 'number' },
      { name: 'title', label: 'כותרת' },
      { name: 'date', label: 'תאריך', type: 'date' },
      { name: 'duration', label: 'משך (למשל 42 דק׳)' },
      // Spotify is the only way offered to attach an episode. The field takes whichever
      // of Spotify's shapes was copied - the share URL, the spotify:episode: URI, or a
      // bare id - and stores the bare id, because that is what the embed needs.
      { name: 'spotifyId', label: 'פרק ב-Spotify', placeholder: 'https://open.spotify.com/episode/…',
        hint: 'הדביקו את כתובת הפרק מ-Spotify (כפתור Share ← Copy link), או את המזהה בלבד. זו הדרך היחידה להוסיף פרק כרגע.',
        clean: function (v) { return WDyn.spotifyEpisodeId(v); } },
      { name: 'description', label: 'תיאור', type: 'textarea', wide: true }
    ], cols: ['פרק', 'כותרת', 'תאריך', 'Spotify', ''], row: function (it) { return [td(String(it.num || '—'), 'muted tnum'), titleCell(it.title, it.demo, it), td(fmtDate(it.date), 'muted tnum'), td(it.spotifyId ? 'מקושר' : 'חסר', 'muted')]; } }
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
              freezeBtn(cfg.col, it),
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
          actions.push(freezeBtn(cfg.col, it));
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
          titleCell(p.name, false, p),
          td(String(p.count || 1), 'muted tnum'),
          td((p.lat != null ? p.lat : '—') + ', ' + (p.lng != null ? p.lng : '—'), 'muted tnum'),
          td(el('div', { class: 'row-actions' }, [
            freezeBtn('mapPoints', p),
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
    var institutions = WStore.get('institutions').length;

    setText('#kpiEvents', String(upcoming));
    setText('#kpiEventsSub', upcoming ? 'מתוך ' + events.length + ' אירועים במאגר' : 'אין אירועים עתידיים');
    setText('#kpiPending', String(pending));
    setText('#kpiPendingSub', pending ? 'ממתינות לאישור מנהל' : 'הכול מאושר');
    setText('#kpiLibrary', String(libTotal));
    setText('#kpiLibrarySub', 'מאמרים, חומרי הוראה וטפסים');
    /* אין כאן מונה מנויים: הרשימה יושבת ב-ActiveTrail, לא ב-D1, ולקריאת המספר
       משם צריך קריאה נוספת ל-API שלהם שטרם נבנתה. ראו את הפאנל של "שירות הדיוור". */

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
    if (renderInstAdmin.draw) renderInstAdmin.draw();
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

    // The management key is a super_admin to the server (whoami in content-api),
    // so it gets the roster too. It is also the way back in for someone locked
    // out while no mail provider is configured: enter the key, then mint a
    // reset link for yourself here.
    var me = WStore.currentUser() || (WStore.hasAdminKey() ? { id: 'key', name: 'מפתח ניהול', role: 'super_admin' } : null);
    if (!me) {
      host.appendChild(el('div', { class: 'panel' }, [
        el('div', { class: 'panel-head' }, [el('h2', { text: 'נדרשת התחברות' })]),
        el('p', { class: 'empty-hint', text: 'רשימת המשתמשים זמינה רק לאחר התחברות עם שם משתמש וסיסמה, או אחרי הזנת מפתח הניהול במסך ההגדרות.' })
      ]));
      return;
    }
    var boss = me.role === 'super_admin';
    // The roster is super_admin-only on the server. Say so, rather than drawing
    // a table whose only possible content is a 403.
    if (!boss) {
      host.appendChild(el('div', { class: 'panel' }, [
        el('div', { class: 'panel-head' }, [el('h2', { text: 'משתמשי המערכת' })]),
        el('p', { class: 'empty-hint', text: 'ניהול המשתמשים שמור למנהל־על. לשינוי הסיסמה שלכם פנו למנהל־על.' })
      ]));
      return;
    }

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

    var t = makeTable(['שם', 'דוא"ל', 'סטטוס', 'תפקיד', 'כניסה אחרונה', '']);
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
        if (!list.length) { emptyRow(tbody, 6, 'אין משתמשים'); return; }
        list.forEach(function (u) {
          var actions = el('div', { class: 'row-actions' });
          if (boss) {
            actions.appendChild(actBtn('edit', 'עריכה', function () { openUserForm(u); }));
            // The delivery path that works while no mail provider is
            // configured: mint the link here and hand it over.
            actions.appendChild(actBtn('edit', u.hasPassword ? 'קישור לאיפוס' : 'קישור להגדרת סיסמה', function () {
              WStore.inviteUser(u.id).then(function (r) { showInviteLink(formHost, u, r); })
                .catch(function () { alert('יצירת הקישור נכשלה.'); });
            }));
            if (u.id !== me.id) {
              actions.appendChild(actBtn('del', 'מחיקה', function () {
                if (!confirm('למחוק את המשתמש "' + u.name + '"? הפעולה אינה הפיכה.')) return;
                WStore.deleteUser(u.id).then(draw).catch(function (e) {
                  alert(e && e.body && e.body.error === 'last_super_admin'
                    ? 'לא ניתן למחוק את מנהל־העל האחרון.' : 'המחיקה נכשלה.');
                });
              }, true));
            }
          } else if (u.id === me.id) {
            actions.appendChild(actBtn('edit', 'שינוי סיסמה', function () { location.hash = 'set'; }));
          }
          tbody.appendChild(el('tr', {}, [
            titleCell(u.name + (u.id === me.id ? ' (אני)' : ''), false),
            td(u.email, 'muted'),
            // An account with no password yet cannot be logged into at all, so
            // say so plainly rather than leaving it looking active.
            td(u.hasPassword
              ? el('span', { class: 'pill neutral', text: 'פעיל' })
              : el('span', { class: 'pill warn', title: 'טרם הוגדרה סיסמה — יש לשלוח קישור', text: 'ממתין להגדרת סיסמה' })),
            td(el('span', { class: 'pill ' + (u.role === 'super_admin' ? 'ok' : 'neutral'),
                            title: ROLE_HELP[u.role] || '', text: ROLE_NAMES[u.role] || u.role })),
            td(fmtLogin(u.last_login), 'muted'),
            td(actions)
          ]));
        });
      }).catch(function () {
        tbody.textContent = '';
        emptyRow(tbody, 6, 'לא ניתן לטעון את רשימת המשתמשים');
      });
    }

    /* Shows a freshly minted set-password link, selected and ready to copy.
       This is what stands in for an email until a mail provider exists: a
       super_admin creates the link and sends it by whatever channel they
       already use. The link is a credential for the few hours it lives, so it
       is shown once, here, and never stored anywhere. */
    function showInviteLink(host, u, r) {
      host.textContent = '';
      var box = el('div', { class: 'panel', style: 'padding:16px;margin-top:12px' });
      box.appendChild(el('h3', { text: (r.kind === 'invite' ? 'קישור להגדרת סיסמה עבור ' : 'קישור לאיפוס סיסמה עבור ') + u.name }));
      box.appendChild(el('p', { class: 'empty-hint', style: 'padding:6px 0',
        text: r.mailed
          ? 'הקישור נשלח בדוא"ל. אפשר גם להעתיק אותו מכאן.'
          : 'טרם מוגדר שירות דוא"ל, ולכן הקישור לא נשלח. העתיקו ושלחו אותו למשתמש.' }));
      var input = el('input', { type: 'text', readonly: 'readonly', value: r.link,
        style: 'width:100%;font-family:monospace;font-size:.8rem;direction:ltr;padding:8px' });
      box.appendChild(input);
      var row = el('div', { class: 'btn-row', style: 'margin-top:10px;gap:8px' });
      var copy = el('button', { class: 'btn btn-primary btn-sm', type: 'button', text: 'העתקת הקישור' });
      copy.addEventListener('click', function () {
        input.select();
        var done = function () { copy.textContent = 'הועתק'; setTimeout(function () { copy.textContent = 'העתקת הקישור'; }, 1800); };
        // execCommand is the fallback: navigator.clipboard needs a secure
        // context, and the admin is opened over plain http often enough.
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(r.link).then(done, function () { try { document.execCommand('copy'); done(); } catch (e) {} });
        } else { try { document.execCommand('copy'); done(); } catch (e) {} }
      });
      row.appendChild(copy);
      var close = el('button', { class: 'btn btn-ghost btn-sm', type: 'button', text: 'סגירה' });
      close.addEventListener('click', function () { host.textContent = ''; });
      row.appendChild(close);
      box.appendChild(row);
      box.appendChild(el('p', { class: 'empty-hint', style: 'padding:8px 0 0',
        text: 'תקף ל-' + r.expiresInHours + ' שעות ולשימוש אחד. יצירת קישור חדש מבטלת את הקודם.' }));
      host.appendChild(box);
      input.select();
    }

    function openUserForm(u) {
      formHost.textContent = '';
      var isNew = !u;
      var fields = [];
      fields.push({ name: 'name', label: 'שם מלא', type: 'text', required: true });
      fields.push({ name: 'email', label: 'דוא"ל', type: 'email', required: true });
      fields.push({ name: 'role', label: 'תפקיד', type: 'select', options: [
        { v: 'editor', t: ROLE_NAMES.editor }, { v: 'admin', t: ROLE_NAMES.admin }, { v: 'super_admin', t: ROLE_NAMES.super_admin }
      ] });
      // Never required. A new user gets a link and chooses their own, so that
      // nobody but them ever knows it; an existing one is only changed here by
      // its owner. Left blank on create, the account is made without a password
      // and the invite link comes back with the response.
      // Your own password is changed in settings, which asks for the current one;
      // the server refuses a self-change without it.
      if (!u || u.id !== me.id) {
        fields.push({ name: 'password', label: isNew ? 'סיסמה (אפשר להשאיר ריק ולשלוח קישור)' : 'סיסמה חדשה (השאירו ריק כדי לא לשנות)',
          type: 'password', required: false, autocomplete: 'new-password', hint: 'לפחות 10 תווים.' });
      }

      openForm(formHost, fields, u || { role: 'editor' }, function (vals) {
        var patch = {};
        Object.keys(vals).forEach(function (k) { if (vals[k] !== '' && vals[k] != null) patch[k] = vals[k]; });
        var done = function () { formHost.textContent = ''; draw(); };
        var oops = function (e) {
          var code = e && e.body && e.body.error;
          alert(code === 'email_taken' ? 'כתובת הדוא"ל כבר קיימת במערכת.'
              : code === 'forbidden' ? 'אין לך הרשאה לפעולה הזו.'
              : code === 'password_too_short' ? 'הסיסמה קצרה מדי: נדרשים לפחות 10 תווים.'
              : 'השמירה נכשלה.');
        };
        if (isNew) WStore.createUser(patch).then(function (created) {
          draw();
          // An account made without a password cannot be logged into until
          // somebody delivers its link, so put the link on screen straight
          // away rather than making the admin go find the row and ask again.
          if (created && created.invite && !created.hasPassword) {
            showInviteLink(formHost, created, {
              link: created.invite.link, kind: 'invite',
              mailed: created.invite.mailed, expiresInHours: created.invite.expiresInHours,
            });
          } else {
            formHost.textContent = '';
          }
        }).catch(oops);
        else WStore.updateUser(u.id, patch).then(done).catch(oops);
      });
    }

    draw();
  }

  /* =============== ניוזלטר (ActiveTrail) =============== */
  /* הרשימה יושבת ב-ActiveTrail, לא ב-D1. ה-Worker מחזיק את הטוקן ועונה תמיד 200 עם
     `state`, כדי שאפשר יהיה לנסח במדויק מה חסר במקום להציג "שגיאה". */
  var NL_MSG = {
    not_configured: 'הטוקן של ActiveTrail עדיין לא הוגדר ב-Worker, ולכן ההרשמה באתר מחזירה ״לא זמין״ ואי אפשר לקרוא את מספר המנויים. ' +
      'מתוך תיקיית content-api מריצים: npx wrangler secret put ACTIVETRAIL_TOKEN',
    bad_token: 'ActiveTrail דחה את הטוקן שהוגדר ב-Worker. יש להפיק טוקן חדש ולהגדיר אותו מחדש.',
    unreachable: 'לא ניתן להגיע ל-ActiveTrail כרגע. נסו שוב בעוד מספר דקות.',
    upstream_error: 'ActiveTrail החזיר שגיאה בקריאת הקבוצה. ודאו שמספר הקבוצה נכון.',
    count_unavailable: 'החיבור ל-ActiveTrail תקין, אך לא נמצא בתשובה שלהם שדה שמכיל את מספר המנויים.'
  };
  function loadNewsletter() {
    return WStore.newsletterStats().then(function (r) { return r; }, function (e) {
      return { state: e && e.status === 401 ? 'login' : 'unreachable' };
    });
  }
  function renderNewsletterAdmin() {
    var host = $('#nlAdmin');
    if (!host) return;
    function draw(r) {
      host.textContent = '';
      var kids = [el('div', { class: 'panel-head' }, [el('h2', { text: 'שירות הדיוור' }), el('span', { class: 'pill ' + (r.state === 'ok' ? 'ok' : 'warn'), text: r.state === 'ok' ? 'מחובר' : 'ממתין לחיבור' }), el('div', { class: 'grow' })])];
      if (r.state === 'ok') {
        kids.push(el('dl', { class: 'kv' }, [
          el('dt', { text: 'שירות' }), el('dd', { text: 'ActiveTrail' }),
          el('dt', { text: 'קבוצת התפוצה' }), el('dd', { text: r.name || '—' }),
          el('dt', { text: 'מספר מנויים' }), el('dd', { text: String(r.count) }),
          el('dt', { text: 'אישור כפול במייל' }), el('dd', { text: r.doubleOptin ? 'פעיל' : 'כבוי' })
        ]));
        kids.push(el('p', { class: 'empty-hint', text: 'טופס ההרשמה בעמוד ״ניוזלטר״ שולח ל-Worker, וזה מעביר את הנרשם ל-ActiveTrail. שליחת הדיוור עצמה, ניהול הרשימה והסרות נעשים במערכת של ActiveTrail.' }));
      } else if (r.state === 'login') {
        kids.push(el('p', { class: 'empty-hint', text: 'יש להתחבר כדי לראות את מצב הדיוור.' }));
      } else {
        kids.push(el('p', { class: 'empty-hint', text: NL_MSG[r.state] || 'מצב הדיוור לא ידוע.' }));
      }
      host.appendChild(el('div', { class: 'panel' }, kids));
      setText('#kpiNewsletter', r.state === 'ok' ? String(r.count) : '—');
      setText('#kpiNewsletterSub', r.state === 'ok' ? 'בקבוצה ' + (r.name || 'הראשית') : r.state === 'login' ? 'נדרשת התחברות' : 'הדיוור טרם חובר ל-ActiveTrail');
    }
    return loadNewsletter().then(draw);
  }

  /* =============== חיפוש בסרגל העליון =============== */
  /* מחפש בכותרות של כל האוספים ופותח את המסך שבו הפריט נערך. */
  var SEARCH_SOURCES = [
    { col: 'events', view: 'events', label: 'אירוע', field: 'title' },
    { col: 'news', view: 'news', label: 'הודעה', field: 'title' },
    { col: 'institutions', view: 'inst', label: 'מוסד', field: 'name' },
    { col: 'mapPoints', view: 'inst', label: 'נקודת מפה', field: 'name' },
    { col: 'library', view: 'lib', label: 'ספרייה', field: 'title' },
    { col: 'teaching', view: 'lib', label: 'חומר הוראה', field: 'title' },
    { col: 'forms', view: 'lib', label: 'טופס', field: 'title' },
    { col: 'videos', view: 'media', label: 'סרטון', field: 'title' },
    { col: 'podcast', view: 'media', label: 'פודקאסט', field: 'title' },
    { col: 'board', view: 'mod', label: 'מודעה', field: 'title' },
    { col: 'jobs', view: 'mod', label: 'משרה', field: 'role' }
  ];
  function wireSearch() {
    var box = $('.topbar .search'), input = box && box.querySelector('input');
    if (!input) return;
    var list = el('div', { class: 'search-results', id: 'searchResults', hidden: '', role: 'listbox', 'aria-label': 'תוצאות חיפוש' });
    box.appendChild(list);
    input.setAttribute('role', 'combobox');
    input.setAttribute('aria-expanded', 'false');
    input.setAttribute('aria-controls', 'searchResults');
    var active = -1;
    // Hebrew final letters and quote marks differ between how people type and how
    // text is stored, so both sides are folded the same way before comparing.
    function fold(x) {
      return String(x || '').toLowerCase().replace(/[\u0591-\u05C7]/g, '').replace(/["״׳'`]/g, '')
        .replace(/ך/g, 'כ').replace(/ם/g, 'מ').replace(/ן/g, 'נ').replace(/ף/g, 'פ').replace(/ץ/g, 'צ');
    }
    function close() { list.hidden = true; input.setAttribute('aria-expanded', 'false'); active = -1; }
    function go(src) {
      close(); input.value = '';
      var nav = document.querySelector('.nav-link[data-view="' + src.view + '"]');
      if (nav) nav.click();
    }
    function options() { return [].slice.call(list.querySelectorAll('button')); }
    function mark(i) {
      var o = options();
      o.forEach(function (b, k) { b.setAttribute('aria-selected', k === i ? 'true' : 'false'); });
      active = i;
      if (o[i]) { o[i].scrollIntoView({ block: 'nearest' }); input.setAttribute('aria-activedescendant', o[i].id); }
    }
    input.addEventListener('input', function () {
      var q = fold(input.value.trim());
      list.textContent = '';
      if (!q || !WStore.isLoaded()) return close();
      var hits = [];
      SEARCH_SOURCES.forEach(function (src) {
        WStore.get(src.col).forEach(function (it) {
          var text = it[src.field] || '';
          if (fold(text).indexOf(q) !== -1) hits.push({ src: src, text: text });
        });
      });
      if (!hits.length) list.appendChild(el('div', { class: 'none', text: 'לא נמצאו תוצאות' }));
      hits.slice(0, 12).forEach(function (h, i) {
        var b = el('button', { type: 'button', role: 'option', id: 'sr' + i, 'aria-selected': 'false' }, [el('span', { text: h.text }), el('small', { text: h.src.label })]);
        b.addEventListener('click', function () { go(h.src); });
        list.appendChild(b);
      });
      list.hidden = false; input.setAttribute('aria-expanded', 'true'); active = -1;
    });
    input.addEventListener('keydown', function (e) {
      var o = options();
      if (e.key === 'Escape') { close(); }
      else if (e.key === 'ArrowDown' && o.length) { e.preventDefault(); mark(Math.min(active + 1, o.length - 1)); }
      else if (e.key === 'ArrowUp' && o.length) { e.preventDefault(); mark(Math.max(active - 1, 0)); }
      else if (e.key === 'Enter' && o.length) { e.preventDefault(); o[active >= 0 ? active : 0].click(); }
    });
    document.addEventListener('click', function (e) { if (!box.contains(e.target)) close(); });
  }

  /* =============== הגדרות =============== */
  function renderSettingsAdmin() {
    var host = $('#settingsAdmin');
    if (!host) return;
    var me = WStore.currentUser();
    var demo = 0;
    SEARCH_SOURCES.forEach(function (src) { WStore.get(src.col).forEach(function (it) { if (it.demo) demo++; }); });
    var api = el('dd', { text: 'בודק…' });
    host.textContent = '';
    host.appendChild(el('div', { class: 'panel-head' }, [el('h2', { text: 'החשבון והמערכת' })]));
    host.appendChild(el('dl', { class: 'kv' }, [
      el('dt', { text: 'משתמש מחובר' }), el('dd', { text: me ? me.name + ' · ' + (me.email || '') : WStore.hasAdminKey() ? 'מפתח ניהול (ללא חשבון אישי)' : 'לא מחובר' }),
      el('dt', { text: 'הרשאה' }), el('dd', { text: me ? (ROLE_NAMES[me.role] || me.role) : WStore.hasAdminKey() ? 'מנהל־על' : 'צפייה בלבד' }),
      el('dt', { text: 'שרת התוכן' }), api,
      el('dt', { text: 'רשומות הדגמה במאגר' }), el('dd', { text: demo ? demo + ' (מסומנות ״הדגמה״ בטבלאות; יש למחוק אותן לפני ההשקה)' : 'אין' })
    ]));
    host.appendChild(el('p', { class: 'empty-hint', text: 'ניהול משתמשים והרשאות נמצא במסך ״נציגי פורום״, והחיבור לדיוור במסך ״ניוזלטר״.' }));
    if (me) renderPasswordChange(host, me);
    fetch(WStore.apiBase + '/health').then(function (r) { return r.json(); }).then(function (j) {
      api.textContent = j && j.ok ? 'פועל' : 'תשובה לא תקינה';
    }).catch(function () { api.textContent = 'לא זמין'; });
  }

  /* =============== שינוי הסיסמה שלי =============== */
  // The one place a signed-in user changes their own password. The server wants
  // the current password for a self-change and keeps this session alive while
  // ending the others, so nobody is signed out by changing it.
  var PW_FIELDS = [
    { name: 'currentPassword', label: 'הסיסמה הנוכחית', type: 'password', autocomplete: 'current-password' },
    { name: 'password', label: 'סיסמה חדשה', type: 'password', autocomplete: 'new-password', hint: 'לפחות 10 תווים.' },
    { name: 'confirm', label: 'הסיסמה החדשה שוב', type: 'password', autocomplete: 'new-password' }
  ];
  function renderPasswordChange(host, me) {
    var status = el('p', { class: 'empty-hint', role: 'status' });
    var open = el('button', { class: 'btn btn-ghost btn-sm', type: 'button', text: 'שינוי סיסמה' });
    var box = el('div', {}, [el('div', { class: 'panel-head' }, [el('h2', { text: 'הסיסמה שלי' }), el('div', { class: 'grow' }), open]), status]);
    host.appendChild(box);
    function say(text) { status.textContent = text; }
    open.addEventListener('click', function () {
      say('');
      openForm(box, PW_FIELDS, null, function (out) {
        if (out.password !== out.confirm) return say('הסיסמה החדשה ואימותה אינם זהים. לא בוצע שינוי.');
        if (out.password.length < 10) return say('הסיסמה החדשה קצרה מדי: נדרשים לפחות 10 תווים. לא בוצע שינוי.');
        say('שומר…');
        WStore.updateUser(me.id, { password: out.password, currentPassword: out.currentPassword }).then(function () {
          say('הסיסמה עודכנה. החיבור הנוכחי נשאר פעיל, וחיבורים אחרים לחשבון נותקו.');
        }).catch(function (e) {
          var code = e && e.body && e.body.error;
          say(code === 'wrong_password' ? 'הסיסמה הנוכחית שגויה. לא בוצע שינוי.'
            : code === 'password_too_short' ? 'הסיסמה החדשה קצרה מדי: נדרשים לפחות 10 תווים.'
            : e && e.status === 401 ? 'ההתחברות פגה. התחברו מחדש ונסו שוב.'
            : 'השינוי נכשל. נסו שוב.');
        });
      });
    });
  }

  /* =============== קישורים לעמודים באתר =============== */
  // The public pages that show each view's content, so an edit can be checked where
  // visitors see it. Institutions link to the two lists although only the kindergarten
  // map reads D1 today: the lists themselves are still static markup.
  var SITE_PAGES = {
    home: [['home.html', 'דף הבית']],
    events: [['events.html', 'אירועים'], ['home.html', 'דף הבית'], ['forum.html', 'הפורום']],
    news: [['news.html', 'הודעות'], ['home.html', 'דף הבית']],
    inst: [['kinder-list.html', 'רשימת גני ילדים'], ['school-list.html', 'רשימת בתי ספר']],
    lib: [['content-library.html', 'ספריית תוכן'], ['ebooks.html', 'ספרים אלקטרוניים']],
    media: [['media.html', 'מדיה']],
    about: [['forum.html', 'הפורום']],
    mod: [['news.html', 'הודעות'], ['community-board.html', 'לוח קהילתי'], ['job-board.html', 'לוח משרות']],
    nl: [['forum-newsletter.html', 'איגרת תקופתית']]
  };
  var EXT_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 4h6v6M20 4l-9 9"/><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg>';
  // Idempotent: renderLibAdmin empties its view at boot, so this runs again after it.
  // Every link shares one named tab, so the next click reloads that tab with fresh
  // content instead of piling up a tab per check.
  function renderSiteLinks() {
    Object.keys(SITE_PAGES).forEach(function (view) {
      var host = $('.view[data-view="' + view + '"]');
      if (!host || host.querySelector('.site-links')) return;
      var row = el('div', { class: 'site-links' }, [el('span', { text: 'צפייה באתר (בלשונית נפרדת):' })]);
      SITE_PAGES[view].forEach(function (p) {
        var a = el('a', { href: '../' + p[0], target: 'waldorf-site', text: p[1] });
        a.insertAdjacentHTML('beforeend', EXT_ICON);
        row.appendChild(a);
      });
      var crumb = host.querySelector('.crumb');
      host.insertBefore(row, crumb ? crumb.nextSibling : host.firstChild);
    });
  }
  renderSiteLinks();

  /* =============== איתחול =============== */
  /* התוכן מגיע מ-D1 דרך ה-API, כלומר לא זמין באופן מיידי כמו קודם. כל הציור
     ממתין ל-WStore.ready; ללא זה כל טבלה הייתה נטענת ריקה ומדווחת שגיאה. */
  function boot() {
    renderEventsAdmin();
    renderNewsAdmin();
    renderInstAdmin();
    renderLibAdmin();
    renderMediaAdmin();
    renderModAdmin();
    renderAboutAdmin();
    renderMapAdmin();
    renderPeopleAdmin();
    renderSettingsAdmin();
    wireSearch();
    renderNewsletterAdmin();
    refreshCounts();
    renderSiteLinks();
  }

  // How to get write access, said the way an editor would act on it: sign in with
  // their own account. The management key is the developer's fallback and comes
  // second, with a link, since the settings view sits at the foot of the sidebar.
  function signInHelp() {
    return el('span', {}, [
      el('a', { href: './', text: 'התחברו עם הדוא״ל והסיסמה שלכם' }),
      document.createTextNode(', או הזינו מפתח ניהול '),
      el('a', { href: '#set', text: 'במסך ההגדרות' }),
      document.createTextNode('.')
    ]);
  }
  // One notice at a time: a second failed save replaces the first rather than stacking.
  // It sits at the top of the content, so a notice answering something the editor just
  // did is scrolled into view: one that appears off-screen reads as nothing happening.
  function notify(lead, rest, kind, show) {
    var main = document.querySelector('.content') || document.body;
    var old = document.getElementById('adminNotice');
    if (old) old.remove();
    main.insertBefore(el('div', { id: 'adminNotice', 'data-kind': kind, class: 'notice crit', role: 'alert', style: 'margin:0 0 18px' }, [
      el('span', {}, [el('b', { text: lead + ' ' }), rest])
    ]), main.firstChild);
    if (show) { var m = document.querySelector('.main'); if (m) m.scrollIntoView({ block: 'start' }); }
  }
  // Writes are optimistic: the screen changes first and is put back if the server
  // refuses. Signed out, every write is refused, so the editor saw a delete or a
  // freeze take effect and then undo itself a moment later. Refusing up front, before
  // the screen changes, says what is wrong at the moment it matters.
  function canWrite() { return WStore.isSignedIn() || WStore.hasAdminKey(); }
  function needSignIn() {
    notify('השינוי לא נשמר:', el('span', {}, [document.createTextNode('אינכם מחוברים למערכת הניהול. '), signInHelp()]), 'signin', true);
  }
  ['add', 'update', 'remove'].forEach(function (m) {
    var write = WStore[m];
    WStore[m] = function () { if (!canWrite()) { needSignIn(); return null; } return write.apply(WStore, arguments); };
  });
  function fail(err, saving) {
    // Log it: a silent notice tells the operator something broke but not what,
    // and this is the only place a boot or save failure surfaces.
    if (window.console) console.error(saving ? 'admin save failed:' : 'admin boot failed:', err);
    var denied = err && err.status === 401;
    notify(saving ? 'השינוי לא נשמר.' : 'לא ניתן לטעון את התוכן מהמאגר.', denied
      ? el('span', {}, [document.createTextNode('אינכם מחוברים למערכת הניהול, או שההתחברות פגה. '), signInHelp()])
      : document.createTextNode(saving ? 'השרת לא אישר את השינוי. נסו שוב בעוד רגע.' : 'בדקו את החיבור לאינטרנט ונסו לרענן.'),
      'fail', saving);
    // A refused save has also dropped a session the server no longer accepts.
    if (denied) showUser();
  }

  WStore.ready.then(boot).catch(function (err) { fail(err, false); });

  /* כתיבה נכשלה בשרת — הקאש נטען מחדש, אז מציירים שוב כדי לא להשאיר על המסך
     עריכה שלא נשמרה. */
  WStore.onChange(function (err) {
    if (!WStore.isLoaded()) return;
    refreshAll();
    if (err) fail(err, true);
  });

  /* מי מחובר + יציאה */
  function showUser() {
    var u = WStore.currentUser();
    var who = document.querySelector('.user .who b');
    var role = document.querySelector('.user .who span');
    if (u) {
      if (who) who.textContent = u.name;
      if (role) role.textContent = ROLE_NAMES[u.role] || u.role;
      var av = document.querySelector('.user .avatar');
      if (av) av.textContent = (u.name || '?').trim().charAt(0);
    }
    if (canWrite()) {
      var ro = document.querySelector('#adminNotice[data-kind="readonly"]');
      if (ro) ro.remove();
    }
    if (!u) {
      // A management key is a full login with no personal account behind it.
      var keyed = WStore.hasAdminKey();
      if (who) who.textContent = keyed ? 'מפתח ניהול' : 'לא מחובר';
      if (role) role.textContent = keyed ? 'מנהל־על' : 'צפייה בלבד';
      // Say so before the first edit, not after it bounces.
      if (!keyed && !document.querySelector('#adminNotice[data-kind="signin"], #adminNotice[data-kind="fail"]')) {
        notify('מצב צפייה בלבד:', el('span', {}, [document.createTextNode('אינכם מחוברים, ולכן שינויים לא יישמרו. '), signInHelp()]), 'readonly');
      }
    }
  }
  showUser();
  // A stored session can outlive the server's copy of it (expired, or signed out
  // elsewhere). Asking the server now drops a dead one (store.js does that on 401),
  // so the page says "signed out" on arrival instead of after the first refused edit.
  if (WStore.isSignedIn()) WStore.me().catch(function () { showUser(); });
  document.querySelectorAll('.topbar .icon-btn').forEach(function (b) {
    if (/יציאה|logout/i.test(b.getAttribute('title') || b.getAttribute('aria-label') || '')) {
      b.addEventListener('click', function (e) {
        e.preventDefault();
        WStore.logout().then(function () { location.href = './'; });
      });
    }
  });

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
        showUser();
        refreshAll();
      }).catch(function () {
        WStore.setAdminKey('');
        if (msg) msg.textContent = 'המפתח נדחה — בדקו שהעתקתם אותו במלואו';
      });
    });
    if (clear) clear.addEventListener('click', function () {
      WStore.setAdminKey('').then(function () {
        input.value = ''; input.placeholder = 'הדביקו כאן את המפתח';
        if (msg) msg.textContent = 'המפתח נמחק מהדפדפן'; showUser(); refreshAll();
      });
    });
  })();

  // Before WStore is loaded boot() has yet to run, and it renders both itself.
  window.addEventListener('adminview', function (e) {
    if (!WStore.isLoaded()) return;
    if (e.detail === 'nl') renderNewsletterAdmin();
    else if (e.detail === 'set') renderSettingsAdmin();
    // Redrawn on every visit: a key entered in settings, or a sign-in in another
    // tab, changes who may see the roster.
    else if (e.detail === 'people') renderPeopleAdmin();
  });

  /* רענון כשחוזרים לטאב (אם נערך תוכן ממקום אחר) */
  window.addEventListener('focus', function () { WStore.reload().catch(function () {}); });
})();
