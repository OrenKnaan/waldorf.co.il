/* dynamic.js — שכבת הדינמיקה של המוקאפ.
   WStore: קריאה/כתיבה של אוספי תוכן — seed מ-data.js עם overlay ב-localStorage,
   כך שעריכות בממשק הניהול משתקפות מיד בעמודים הציבוריים (באותו דפדפן).
   WDyn: רינדור הרכיבים הציבוריים. בייצור WStore יוחלף בקריאות API (Workers/D1). */
(function () {
  'use strict';
  var LS_KEY = 'waldorf-mockup-cms-v1';
  var MINE_KEY = 'waldorf-mockup-mine-v1';
  var SEED = window.WALDORF_DATA || {};

  function readLS(key) {
    try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch (e) { return null; }
  }
  function writeLS(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) { /* private mode */ }
  }

  var WStore = {
    _all: function () { return readLS(LS_KEY) || {}; },
    get: function (col) {
      var all = this._all();
      var v = Object.prototype.hasOwnProperty.call(all, col) ? all[col] : SEED[col];
      return v == null ? (col === 'about' ? null : []) : JSON.parse(JSON.stringify(v));
    },
    set: function (col, val) {
      var all = this._all();
      all[col] = val;
      writeLS(LS_KEY, all);
    },
    add: function (col, item) {
      item.id = item.id || 'x' + Date.now().toString(36);
      var arr = this.get(col);
      arr.unshift(item);
      this.set(col, arr);
      return item;
    },
    update: function (col, id, patch) {
      var arr = this.get(col);
      arr.forEach(function (it) { if (it.id === id) Object.assign(it, patch); });
      this.set(col, arr);
    },
    remove: function (col, id) {
      this.set(col, this.get(col).filter(function (it) { return it.id !== id; }));
    },
    reset: function () { try { localStorage.removeItem(LS_KEY); localStorage.removeItem(MINE_KEY); } catch (e) {} },
    markMine: function (id) {
      var mine = readLS(MINE_KEY) || [];
      mine.push(id); writeLS(MINE_KEY, mine);
    },
    isMine: function (id) { return (readLS(MINE_KEY) || []).indexOf(id) !== -1; }
  };

  /* ---------- עוזרי DOM (ללא innerHTML לתוכן משתמש — מניעת XSS) ---------- */
  function el(tag, attrs, children) {
    var n = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === 'text') n.textContent = attrs[k];
      else if (k === 'html') n.innerHTML = attrs[k]; /* לשימוש פנימי בלבד, אף פעם לא עם קלט משתמש */
      else if (k.indexOf('on') === 0) n.addEventListener(k.slice(2), attrs[k]);
      else n.setAttribute(k, attrs[k]);
    });
    (children || []).forEach(function (c) { if (c) n.appendChild(c); });
    return n;
  }
  function fmtDate(iso) {
    if (!iso) return '';
    var p = String(iso).split('-');
    return p.length === 3 ? (+p[2]) + '.' + (+p[1]) + '.' + p[0] : iso;
  }
  function dayOfMonth(iso) { var p = String(iso).split('-'); return p.length === 3 ? +p[2] : '?'; }
  var HEB_MONTHS = ['ינו׳', 'פבר׳', 'מרץ', 'אפר׳', 'מאי', 'יוני', 'יולי', 'אוג׳', 'ספט׳', 'אוק׳', 'נוב׳', 'דצמ׳'];
  function monthName(iso) { var p = String(iso).split('-'); return p.length === 3 ? HEB_MONTHS[+p[1] - 1] || '' : ''; }
  function todayISO() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  /* ---------- עיצוב הרכיבים (משתמש במשתני ה-CSS הקיימים של העמודים) ---------- */
  var CSS = [
    '.dyn-toolbar{display:flex;flex-wrap:wrap;gap:10px;margin:0 0 16px}',
    '.dyn-toolbar input[type=search],.dyn-toolbar select{font-family:var(--font-body);font-size:.88rem;color:var(--text);background:var(--white);border:1.5px solid var(--beige);border-radius:var(--radius-pill);padding:8px 16px;min-width:0}',
    '.dyn-toolbar input[type=search]{flex:1;min-width:170px}',
    '.dyn-toolbar input[type=search]:focus,.dyn-toolbar select:focus{outline:none;border-color:var(--tan)}',
    '.dyn-empty{background:var(--beige);border-radius:var(--radius-lg);padding:22px;text-align:center;color:var(--text-muted);font-size:.92rem}',
    '.dyn-item{background:var(--white);border:1.5px solid var(--beige);border-radius:var(--radius-lg);padding:14px 18px;margin:0 0 12px;box-shadow:var(--shadow)}',
    '.dyn-item h3{margin:0 0 4px;font-family:var(--font-head);font-size:1.05rem;color:var(--brown-dark)}',
    '.dyn-item p{margin:4px 0;font-size:.9rem}',
    '.dyn-meta{display:flex;flex-wrap:wrap;gap:6px;margin:10px 0 0;font-size:.76rem;justify-content:flex-end}',
    '.dyn-chip{background:var(--beige);color:var(--brown);border-radius:var(--radius-pill);padding:2px 11px;font-weight:500}',
    '.dyn-chip.cat{background:color-mix(in oklab,var(--wash-gold) 34%,var(--white));color:var(--brown-dark)}',
    '.dyn-chip.pend{background:#F3DDA7;color:var(--brown-dark);font-weight:600}',
    '.dyn-chip.demo{background:color-mix(in oklab,var(--wash-sky) 26%,var(--white));color:var(--brown-dark)}',
    '.dyn-contact{font-size:.82rem;color:var(--text-muted)}',
    '.dyn-event{display:flex;gap:16px;align-items:flex-start;flex-wrap:wrap}',
    /* רקע בהיר — הגוון החום שמור לכפתורים */
    '.dyn-event .date-badge{flex:0 0 74px;text-align:center;background:color-mix(in oklab,var(--wash-gold) 26%,var(--white));color:var(--brown-dark);border:1px solid color-mix(in oklab,var(--tan) 50%,transparent);border-radius:13px;padding:10px 6px}',
    '.dyn-event .date-badge b{display:block;font-family:var(--font-head);font-size:1.7rem;font-weight:700;line-height:1.05;color:var(--brown)}',
    '.dyn-event .date-badge span{font-size:.76rem;color:var(--text-muted)}',
    '.dyn-event.past{opacity:.62}',
    '.dyn-event .body{flex:1;min-width:220px}',
    '.dyn-btn{display:inline-block;font-family:var(--font-body);font-size:.85rem;font-weight:600;color:#fff;background:var(--brown);border:none;border-radius:var(--radius-pill);padding:8px 20px;cursor:pointer;text-decoration:none}',
    '.dyn-btn:hover{background:var(--brown-dark)}',
    '.dyn-btn.ghost{background:transparent;color:var(--brown);border:1.5px solid var(--tan)}',
    '.dyn-btn.ghost:hover{background:var(--beige)}',
    'details.dyn-form{background:var(--beige);border-radius:var(--radius-lg);padding:0;margin:0 0 18px;overflow:hidden}',
    'details.dyn-form>summary{cursor:pointer;list-style:none;padding:13px 20px;font-weight:600;color:var(--brown-dark);display:flex;align-items:center;gap:8px}',
    'details.dyn-form>summary::before{content:"+";font-family:var(--font-head);font-size:1.2rem;color:var(--tan-dark)}',
    'details.dyn-form[open]>summary::before{content:"–"}',
    '.dyn-form .fields{padding:4px 20px 18px;display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px}',
    '.dyn-form .fields .wide{grid-column:1/-1}',
    '.dyn-form label{display:flex;flex-direction:column;gap:4px;font-size:.8rem;font-weight:600;color:var(--brown-dark)}',
    '.dyn-form input,.dyn-form select,.dyn-form textarea{font-family:var(--font-body);font-size:.88rem;color:var(--text);background:var(--white);border:1.5px solid transparent;border-radius:var(--radius);padding:9px 12px}',
    '.dyn-form input:focus,.dyn-form select:focus,.dyn-form textarea:focus{outline:none;border-color:var(--tan)}',
    '.dyn-form textarea{min-height:74px;resize:vertical}',
    '.dyn-form .actions{grid-column:1/-1;display:flex;align-items:center;gap:12px;flex-wrap:wrap}',
    '.dyn-form .ok-msg{color:var(--brown-dark);background:#E7EEDF;border-radius:var(--radius-pill);padding:6px 15px;font-size:.84rem;font-weight:600}',
    '.dyn-note{font-size:.8rem;color:var(--text-muted);margin:2px 0 14px}',
    '.dyn-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:14px}',
    '.dyn-video{background:var(--white);border:1.5px solid var(--beige);border-radius:var(--radius-lg);overflow:hidden;box-shadow:var(--shadow)}',
    '.dyn-video .thumb{position:relative;aspect-ratio:16/9;display:flex;align-items:center;justify-content:center;background:radial-gradient(80% 95% at 18% 12%,color-mix(in oklab,var(--wash-rose) 40%,transparent),transparent 60%),radial-gradient(85% 95% at 86% 20%,color-mix(in oklab,var(--wash-gold) 42%,transparent),transparent 60%),var(--beige);cursor:pointer;border:none;width:100%;padding:0}',
    '.dyn-video .thumb img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}',
    '.dyn-video .thumb .play{position:relative;width:46px;height:46px;border-radius:50%;background:rgba(61,43,31,.82);display:flex;align-items:center;justify-content:center}',
    '.dyn-video .thumb .play::before{content:"";border-style:solid;border-width:9px 14px 9px 0;border-color:transparent #fff transparent transparent;margin-inline-end:-3px}',
    '.dyn-video .thumb iframe{position:absolute;inset:0;width:100%;height:100%;border:0}',
    '.dyn-video .info{padding:11px 14px 13px}',
    '.dyn-video .info h3{margin:0 0 3px;font-family:var(--font-head);font-size:.98rem;color:var(--brown-dark)}',
    '.dyn-video .info p{margin:0;font-size:.82rem;color:var(--text-muted)}',
    '.dyn-episode{display:flex;gap:14px;align-items:flex-start}',
    '.dyn-episode .num{flex:0 0 44px;height:44px;border-radius:50%;background:radial-gradient(130% 150% at 18% 22%,color-mix(in oklab,var(--wash-gold) 42%,transparent),transparent 72%),var(--beige);display:flex;align-items:center;justify-content:center;font-family:var(--font-head);font-weight:700;font-size:1.15rem;color:var(--brown-dark)}',
    '.dyn-map{height:380px;border-radius:var(--radius-lg);overflow:hidden;box-shadow:var(--shadow);margin:0 0 8px;background:var(--beige)}',
    '.dyn-lib-item{display:block;padding:10px 14px;border-inline-start:3px solid var(--tan);background:var(--white);border-radius:var(--radius);margin:0 0 9px;box-shadow:var(--shadow)}',
    '.dyn-lib-item b{color:var(--brown-dark)}',
    '.dyn-lib-item small{display:block;color:var(--text-muted);font-size:.82rem;margin-top:2px}',
    '@media (max-width:560px){.dyn-event .date-badge{flex-basis:60px}}'
  ].join('\n');
  function injectCSS() {
    if (document.getElementById('dyn-css')) return;
    var s = document.createElement('style');
    s.id = 'dyn-css';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  function chip(text, cls) { return el('span', { class: 'dyn-chip' + (cls ? ' ' + cls : ''), text: text }); }
  function demoChip(item) { return item.demo ? chip('רשומת הדגמה', 'demo') : null; }
  function pendChip(item) { return item.status === 'pending' ? chip('ממתין לאישור מנהל', 'pend') : null; }
  function emptyBox(text) { return el('div', { class: 'dyn-empty', text: text }); }

  /* פריטים לתצוגה ציבורית: מאושרים + "שלי" הממתינים (הדגמת מודרציה) */
  function publicItems(col) {
    return WStore.get(col).filter(function (it) {
      return it.status === undefined || it.status === 'approved' ||
        (it.status === 'pending' && WStore.isMine(it.id));
    });
  }

  /* ---------- אירועים והודעות ---------- */
  function eventCard(ev, past) {
    var body = el('div', { class: 'body' }, [
      el('h3', { text: ev.title }),
      ev.description ? el('p', { text: ev.description }) : null,
      (!past && ev.registerUrl) ? el('a', { class: 'dyn-btn', href: ev.registerUrl, target: '_blank', rel: 'noopener', text: 'להרשמה (טופס גוגל)' }) : null,
      el('div', { class: 'dyn-meta' }, [
        ev.location ? chip(ev.location) : null,
        ev.time ? chip(ev.time) : null,
        demoChip(ev)
      ])
    ]);
    return el('div', { class: 'dyn-item dyn-event' + (past ? ' past' : '') }, [
      el('div', { class: 'date-badge' }, [
        el('b', { text: dayOfMonth(ev.date) }),
        el('span', { text: monthName(ev.date) + ' ' + String(ev.date).slice(0, 4) })
      ]),
      body
    ]);
  }

  function renderEvents(upcomingMount, pastMount) {
    var today = todayISO();
    var evs = WStore.get('events').filter(function (e) { return e.status === 'published'; });
    var up = evs.filter(function (e) { return e.date >= today; }).sort(function (a, b) { return a.date < b.date ? -1 : 1; });
    var past = evs.filter(function (e) { return e.date < today; }).sort(function (a, b) { return a.date > b.date ? -1 : 1; });
    upcomingMount.textContent = '';
    pastMount.textContent = '';
    if (up.length) up.forEach(function (e) { upcomingMount.appendChild(eventCard(e, false)); });
    else upcomingMount.appendChild(emptyBox('אין כרגע אירועים קרובים — הלוח מתעדכן דרך ממשק הניהול.'));
    if (past.length) past.forEach(function (e) { pastMount.appendChild(eventCard(e, true)); });
    else pastMount.appendChild(emptyBox('ארכיון האירועים ריק.'));
  }

  function renderNews(mount) {
    var items = WStore.get('news').slice().sort(function (a, b) { return a.date > b.date ? -1 : 1; });
    mount.textContent = '';
    if (!items.length) { mount.appendChild(emptyBox('אין הודעות כרגע.')); return; }
    items.forEach(function (n) {
      mount.appendChild(el('div', { class: 'dyn-item' }, [
        el('h3', { text: n.title }),
        n.summary ? el('p', { text: n.summary }) : null,
        n.link ? el('a', { class: 'dyn-btn ghost', href: n.link, text: 'לקריאה' }) : null,
        el('div', { class: 'dyn-meta' }, [chip(fmtDate(n.date)), chip(n.section, 'cat'), demoChip(n)])
      ]));
    });
  }

  /* ---------- לוחות (קהילתי + משרות): סינון, רשימה, טופס הגשה ---------- */
  function boardWidget(mount, cfg) {
    var state = { q: '', cat: '', region: '' };
    var toolbar = el('div', { class: 'dyn-toolbar' }, [
      el('input', { type: 'search', placeholder: cfg.searchPlaceholder || 'חיפוש חופשי…', 'aria-label': 'חיפוש', oninput: function (e) { state.q = e.target.value.trim(); draw(); } }),
      (cfg.categories && cfg.categories.length) ? sel('כל הקטגוריות', cfg.categories, function (v) { state.cat = v; draw(); }) : null,
      (cfg.regions && cfg.regions.length) ? sel('כל האזורים', cfg.regions, function (v) { state.region = v; draw(); }) : null
    ]);
    function sel(allLabel, opts, onCh) {
      var s = el('select', { 'aria-label': allLabel, onchange: function (e) { onCh(e.target.value); } },
        [el('option', { value: '', text: allLabel })].concat(opts.map(function (o) { return el('option', { value: o, text: o }); })));
      return s;
    }
    var list = el('div', { 'aria-live': 'polite' });
    var form = submitForm(cfg, function () { draw(); });
    mount.textContent = '';
    mount.appendChild(toolbar);
    mount.appendChild(form);
    mount.appendChild(list);

    var catField = cfg.categoryField || 'category';
    function matches(it) {
      var hay = [it.title, it.role, it.institution, it.description, it.summary, it.region, it[catField]].join(' ').toLowerCase();
      return (!state.q || hay.indexOf(state.q.toLowerCase()) !== -1) &&
             (!state.cat || it[catField] === state.cat) &&
             (!state.region || it.region === state.region);
    }
    function draw() {
      var items = publicItems(cfg.collection).filter(matches);
      if (cfg.sortByDateDesc) items.sort(function (a, b) { return (a.date || '') < (b.date || '') ? 1 : -1; });
      list.textContent = '';
      if (!items.length) { list.appendChild(emptyBox(cfg.emptyText)); return; }
      items.forEach(function (it) {
        list.appendChild(el('div', { class: 'dyn-item' }, [
          el('h3', { text: it.title || it.role }),
          (it.description || it.summary) ? el('p', { text: it.description || it.summary }) : null,
          it.contact ? el('p', { class: 'dyn-contact', text: 'יצירת קשר: ' + it.contact }) : null,
          it.link ? el('a', { class: 'dyn-btn ghost', href: it.link, text: 'לקריאה' }) : null,
          el('div', { class: 'dyn-meta' }, [
            it.institution ? chip(it.institution) : null,
            it[catField] ? chip(it[catField], 'cat') : null,
            it.region ? chip(it.region) : null,
            it.scope ? chip(it.scope) : null,
            it.date ? chip(fmtDate(it.date)) : null,
            pendChip(it), demoChip(it)
          ])
        ]));
      });
    }
    function submitForm(cfg2, after) {
      var msg = el('span', { class: 'ok-msg', text: cfg2.okText || 'המודעה נשלחה ותוצג לאחר אישור מנהל.', hidden: '' });
      var inputs = {};
      var fields = cfg2.fields.map(function (f) {
        var input = f.type === 'textarea' ? el('textarea', { name: f.name })
          : f.type === 'select' ? el('select', { name: f.name }, f.options.map(function (o) { return el('option', { value: o, text: o }); }))
          : el('input', { type: 'text', name: f.name, required: f.required ? '' : null });
        if (input.getAttribute('required') === null) input.removeAttribute('required');
        inputs[f.name] = input;
        return el('label', { class: f.wide ? 'wide' : '' }, [document.createTextNode(f.label), input]);
      });
      var d = el('details', { class: 'dyn-form' }, [
        el('summary', { text: cfg2.formTitle }),
        el('form', {
          class: 'fields',
          onsubmit: function (e) {
            e.preventDefault();
            var item = { date: todayISO(), status: 'pending' };
            cfg2.fields.forEach(function (f) { item[f.name] = inputs[f.name].value.trim(); });
            if (!item[cfg2.fields[0].name]) return;
            var added = WStore.add(cfg2.collection, item);
            WStore.markMine(added.id);
            e.target.reset();
            msg.hidden = false;
            after();
          }
        }, fields.concat([
          el('div', { class: 'actions' }, [
            el('button', { class: 'dyn-btn', type: 'submit', text: cfg2.submitLabel }),
            msg
          ])
        ]))
      ]);
      return d;
    }
    draw();
  }

  /* ---------- ספרייה, חומרי הוראה, טפסים ---------- */
  function libItem(node) {
    var a = node.url ? el('a', { class: 'dyn-lib-item', href: node.url, target: '_blank', rel: 'noopener' }) : el('div', { class: 'dyn-lib-item' });
    a.appendChild(el('b', { text: node.title }));
    var metaBits = [node.kind || node.group || node.category, node.demo ? 'רשומת הדגמה' : '', node.url ? '' : 'הקובץ יעלה דרך ממשק הניהול'].filter(Boolean).join(' · ');
    a.appendChild(el('small', { text: (node.description ? node.description + ' — ' : '') + metaBits }));
    return a;
  }
  function renderSearchableList(mount, col, searchLabel) {
    var q = '';
    var input = el('input', { type: 'search', placeholder: searchLabel, 'aria-label': searchLabel, oninput: function (e) { q = e.target.value.trim().toLowerCase(); draw(); } });
    var list = el('div', { 'aria-live': 'polite' });
    mount.textContent = '';
    mount.appendChild(el('div', { class: 'dyn-toolbar' }, [input]));
    mount.appendChild(list);
    function draw() {
      var items = WStore.get(col).filter(function (it) {
        return !q || [it.title, it.description, it.kind, it.group, it.category].join(' ').toLowerCase().indexOf(q) !== -1;
      });
      list.textContent = '';
      if (!items.length) { list.appendChild(emptyBox('לא נמצאו פריטים.')); return; }
      items.forEach(function (it) { list.appendChild(libItem(it)); });
    }
    draw();
  }
  function renderGroupedTeaching(mount) {
    var items = WStore.get('teaching');
    var groups = {};
    items.forEach(function (it) { (groups[it.group] = groups[it.group] || []).push(it); });
    mount.textContent = '';
    if (!items.length) { mount.appendChild(emptyBox('אין חומרי הוראה כרגע.')); return; }
    Object.keys(groups).forEach(function (g) {
      mount.appendChild(el('h3', { class: 'sub', text: g }));
      groups[g].forEach(function (it) { mount.appendChild(libItem(it)); });
    });
  }

  /* ---------- מדיה: סרטונים ופודקאסט ---------- */
  function renderVideos(mount) {
    var vids = WStore.get('videos');
    mount.textContent = '';
    if (!vids.length) { mount.appendChild(emptyBox('אין סרטונים כרגע — הגלריה מתעדכנת דרך ממשק הניהול.')); return; }
    var grid = el('div', { class: 'dyn-grid' });
    vids.forEach(function (v) {
      var thumb = el('button', { class: 'thumb', type: 'button', 'aria-label': 'ניגון: ' + v.title }, [
        v.youtubeId ? el('img', { src: 'https://img.youtube.com/vi/' + encodeURIComponent(v.youtubeId) + '/hqdefault.jpg', alt: '', loading: 'lazy' }) : null,
        el('span', { class: 'play' })
      ]);
      thumb.addEventListener('click', function () {
        if (!v.youtubeId) return;
        var f = el('iframe', {
          src: 'https://www.youtube-nocookie.com/embed/' + encodeURIComponent(v.youtubeId) + '?autoplay=1',
          title: v.title, allow: 'autoplay; encrypted-media; picture-in-picture', allowfullscreen: ''
        });
        thumb.textContent = '';
        thumb.appendChild(f);
      });
      grid.appendChild(el('div', { class: 'dyn-video' }, [
        thumb,
        el('div', { class: 'info' }, [
          el('h3', { text: v.title }),
          el('p', { text: v.description || '' }),
          el('div', { class: 'dyn-meta' }, [demoChip(v), v.youtubeId ? null : chip('הסרטון יקושר דרך ממשק הניהול')])
        ])
      ]));
    });
    mount.appendChild(grid);
  }

  function renderPodcast(mount) {
    var eps = WStore.get('podcast').slice().sort(function (a, b) { return (b.num || 0) - (a.num || 0); });
    mount.textContent = '';
    if (!eps.length) { mount.appendChild(emptyBox('אין פרקים כרגע — הפודקאסט מתעדכן דרך ממשק הניהול.')); return; }
    eps.forEach(function (p) {
      var body = el('div', { class: 'body', style: 'flex:1;min-width:200px' }, [
        el('h3', { text: 'פרק ' + p.num + ' · ' + p.title }),
        p.description ? el('p', { text: p.description }) : null,
        el('div', { class: 'dyn-meta' }, [chip(fmtDate(p.date)), p.duration ? chip(p.duration) : null, demoChip(p)])
      ]);
      if (p.url) {
        var audio = el('audio', { controls: '', preload: 'none', style: 'width:100%;margin-top:6px' });
        audio.appendChild(el('source', { src: p.url }));
        body.appendChild(audio);
      } else {
        body.appendChild(el('div', { class: 'dyn-meta' }, [chip('הנגן יופעל עם קישור הפרק בממשק הניהול')]));
      }
      mount.appendChild(el('div', { class: 'dyn-item dyn-episode' }, [
        el('div', { class: 'num', text: String(p.num) }), body
      ]));
    });
  }

  /* ---------- מפה אינטראקטיבית (Leaflet + OSM, נטען עצלה) ---------- */
  function renderMap(mount) {
    var box = el('div', { class: 'dyn-map', role: 'application', 'aria-label': 'מפת גני ולדורף' });
    mount.textContent = '';
    mount.appendChild(box);
    mount.appendChild(el('p', { class: 'dyn-note', text: 'המיקומים מקורבים (ברמת יישוב) — הנקודות מנוהלות דרך ממשק הניהול.' }));
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);
    var s = document.createElement('script');
    s.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    s.onload = function () {
      var map = L.map(box, { scrollWheelZoom: false }).setView([31.9, 34.95], 8);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 17, attribution: '&copy; OpenStreetMap'
      }).addTo(map);
      WStore.get('mapPoints').forEach(function (p) {
        if (typeof p.lat !== 'number' || typeof p.lng !== 'number') return;
        var pop = el('div', {}, [
          el('b', { text: p.name }),
          el('div', { text: p.town + (p.count > 1 ? ' · ' + p.count + ' גנים' : '') }),
          p.url ? el('a', { href: p.url, text: 'לרשימה המלאה' }) : null
        ]);
        L.marker([p.lat, p.lng]).addTo(map).bindPopup(pop);
      });
    };
    s.onerror = function () {
      box.appendChild(el('div', { class: 'dyn-empty', style: 'margin:24px', text: 'לא ניתן לטעון את המפה (אין חיבור לרשת?). הנתונים זמינים ברשימה שמתחת.' }));
    };
    document.head.appendChild(s);
  }

  /* ---------- אודות הפורום: החלת עריכות מהאדמין על הטקסט הקבוע ---------- */
  function applyAbout(map) {
    var about = WStore.get('about');
    if (!about) return;
    Object.keys(map).forEach(function (key) {
      if (!about[key]) return;
      var target = document.querySelector(map[key]);
      if (!target) return;
      target.textContent = '';
      String(about[key]).split(/\n{2,}/).forEach(function (par) {
        var lines = par.split('\n').filter(function (l) { return l.trim(); });
        if (lines.length > 1 && lines.every(function (l) { return /^[-•]\s/.test(l.trim()); })) {
          target.appendChild(el('ul', {}, lines.map(function (l) { return el('li', { text: l.trim().replace(/^[-•]\s*/, '') }); })));
        } else {
          target.appendChild(el('p', { text: par }));
        }
      });
    });
  }

  /* תקצירים לעמוד הבית: כמה פריטים אחרונים/קרובים + כפתור לעמוד המלא */
  function renderHighlights(mount, opts) {
    if (!mount) return;
    mount.textContent = '';
    var items = opts.items();
    if (!items.length) {
      mount.appendChild(emptyBox(opts.emptyText));
    } else {
      items.slice(0, opts.limit || 3).forEach(function (it) { mount.appendChild(opts.card(it)); });
    }
    mount.appendChild(el('div', { class: 'btn-row', style: 'margin-top:14px' }, [
      el('a', { class: 'btn btn-ghost btn-sm', href: opts.href, text: opts.linkText })
    ]));
  }

  function upcomingEvents() {
    var today = todayISO();
    return WStore.get('events')
      .filter(function (e) { return e.status === 'published' && e.date >= today; })
      .sort(function (a, b) { return a.date < b.date ? -1 : 1; });
  }
  function approvedNews() {
    return WStore.get('news')
      .filter(function (n) { return n.status === undefined || n.status === 'approved'; })
      .sort(function (a, b) { return a.date < b.date ? 1 : -1; });
  }

  window.WStore = WStore;
  window.WDyn = {
    injectCSS: injectCSS,
    renderEvents: renderEvents,
    renderNews: renderNews,
    boardWidget: boardWidget,
    renderSearchableList: renderSearchableList,
    renderGroupedTeaching: renderGroupedTeaching,
    renderVideos: renderVideos,
    renderPodcast: renderPodcast,
    renderMap: renderMap,
    applyAbout: applyAbout,
    renderHighlights: renderHighlights,
    upcomingEvents: upcomingEvents,
    approvedNews: approvedNews,
    eventCard: eventCard,
    chip: chip,
    fmtDate: fmtDate,
    el: el,
    todayISO: todayISO
  };
})();
