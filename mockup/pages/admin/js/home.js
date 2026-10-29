/* home.js: לוח הבקרה (the counts, upcoming events, recent activity), the sidebar
 * counters, the top-bar search, and the "view on the site" links on each view.
 * Every number here comes from the store; what has no real source is not shown
 * as a number. */
(function () {
  'use strict';
  var A = window.WAdmin, el = A.el, td = A.td;
  var live = function (it) { return !A.inBin(it); };

  function counts() {
    var today = A.todayISO();
    var events = WStore.get('events').filter(live);
    var upcoming = events.filter(function (e) { return e.status === 'published' && e.date >= today; });
    var libTotal = WStore.get('library').concat(WStore.get('teaching'), WStore.get('forms')).filter(live).length;
    var pending = WStore.get('news').concat(WStore.get('board'), WStore.get('jobs'))
      .filter(function (i) { return i.status === 'pending' && !A.expired(i); }).length;

    A.setText('#kpiEvents', String(upcoming.length));
    A.setText('#kpiEventsSub', upcoming.length ? 'מתוך ' + events.length + ' אירועים במאגר' : 'אין אירועים עתידיים');
    A.setText('#kpiPending', String(pending));
    A.setText('#kpiPendingSub', pending ? 'ממתינות לאישור מנהל' : 'הכול מאושר');
    A.setText('#kpiLibrary', String(libTotal));
    A.setText('#kpiLibrarySub', 'מאמרים, חומרי הוראה וטפסים');
    // The subscriber count lives in ActiveTrail; newsletter.js fills its KPI.

    A.setText('.nav-link[data-view="events"] .count', String(events.length));
    A.setText('.nav-link[data-view="lib"] .count', String(libTotal));
    A.setText('.nav-link[data-view="inst"] .count', String(WStore.get('institutions').filter(live).length));
    var modCount = A.$('#modCount');
    if (modCount) { modCount.textContent = String(pending); modCount.style.background = pending ? 'var(--warn)' : ''; }

    var tbody = A.$('.view[data-view="home"] tbody');
    if (tbody) {
      tbody.textContent = '';
      var next = upcoming.sort(function (a, b) { return a.date < b.date ? -1 : 1; }).slice(0, 5);
      if (!next.length) A.emptyRow(tbody, 5, 'אין אירועים קרובים');
      next.forEach(function (ev) {
        tbody.appendChild(el('tr', {}, [td(A.fmtDate(ev.date), 'muted tnum'), A.titleCell(ev.title, ev.demo), td(ev.location || A.NONE, 'muted'), td(A.statusPill(ev.status)), td(el('div'))]));
      });
    }
    activity();
  }

  // Derived from the store's own timestamps, not a list written in advance.
  var LABEL = { events: 'אירוע', news: 'הודעה', board: 'מודעה', jobs: 'משרה', library: 'פריט בספרייה', teaching: 'חומר הוראה',
                forms: 'טופס', mapPoints: 'מוסד במפה', institutions: 'מוסד', videos: 'סרטון', podcast: 'פרק פודקאסט' };
  function ago(ts) {
    var s = Math.max(0, Math.floor(Date.now() / 1000 - ts));
    if (s < 90) return 'ממש עכשיו';
    if (s < 3600) return 'לפני ' + Math.round(s / 60) + ' דק׳';
    if (s < 86400) return 'לפני ' + Math.round(s / 3600) + ' שע׳';
    return 'לפני ' + Math.round(s / 86400) + ' ימים';
  }
  function activity() {
    var host = A.$('.view[data-view="home"] .activity');
    if (!host) return;
    WStore.activity().then(function (rows) {
      host.textContent = '';
      if (!rows.length) return host.appendChild(el('p', { class: 'empty-hint', text: 'טרם בוצעו שינויים בתוכן.' }));
      rows.slice(0, 6).forEach(function (r) {
        host.appendChild(el('div', { class: 'act-item' }, [
          el('div', { class: 'act-dot' }),
          el('div', { class: 't' }, [
            el('b', { text: r.title || '(ללא כותרת)' }),
            el('div', { class: 'when', text: (LABEL[r.collection] || r.collection) + ' · ' + (r.isNew ? 'נוסף' : 'עודכן') + ' ' + ago(r.updatedAt) })
          ])
        ]));
      });
    }).catch(function () {
      host.textContent = '';
      host.appendChild(el('p', { class: 'empty-hint', text: 'היסטוריית הפעילות זמינה לאחר התחברות.' }));
    });
  }

  /* ---- top-bar search: titles across every collection, opening the view that edits the hit ---- */
  A.SEARCH_SOURCES = [
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
  // Hebrew final letters and quote marks differ between how people type and how
  // text is stored, so both sides are folded the same way before comparing.
  function fold(x) {
    return String(x || '').toLowerCase().replace(/[֑-ׇ]/g, '').replace(/["״׳'`]/g, '')
      .replace(/ך/g, 'כ').replace(/ם/g, 'מ').replace(/ן/g, 'נ').replace(/ף/g, 'פ').replace(/ץ/g, 'צ');
  }
  function wireSearch() {
    var box = A.$('.topbar .search'), input = box && box.querySelector('input');
    if (!input) return;
    var list = el('div', { class: 'search-results', id: 'searchResults', hidden: '', role: 'listbox', 'aria-label': 'תוצאות חיפוש' });
    box.appendChild(list);
    input.setAttribute('role', 'combobox');
    input.setAttribute('aria-expanded', 'false');
    input.setAttribute('aria-controls', 'searchResults');
    var active = -1;
    function close() { list.hidden = true; input.setAttribute('aria-expanded', 'false'); active = -1; }
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
      A.SEARCH_SOURCES.forEach(function (src) {
        WStore.get(src.col).forEach(function (it) {
          var text = it[src.field] || '';
          if (fold(text).indexOf(q) !== -1) hits.push({ src: src, text: text });
        });
      });
      if (!hits.length) list.appendChild(el('div', { class: 'none', text: 'לא נמצאו תוצאות' }));
      hits.slice(0, 12).forEach(function (h, i) {
        list.appendChild(el('button', { type: 'button', role: 'option', id: 'sr' + i, 'aria-selected': 'false',
          onclick: function () { close(); input.value = ''; location.hash = h.src.view; } },
          [el('span', { text: h.text }), el('small', { text: h.src.label })]));
      });
      list.hidden = false; input.setAttribute('aria-expanded', 'true'); active = -1;
    });
    input.addEventListener('keydown', function (e) {
      var o = options();
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowDown' && o.length) { e.preventDefault(); mark(Math.min(active + 1, o.length - 1)); }
      else if (e.key === 'ArrowUp' && o.length) { e.preventDefault(); mark(Math.max(active - 1, 0)); }
      else if (e.key === 'Enter' && o.length) { e.preventDefault(); o[active >= 0 ? active : 0].click(); }
    });
    document.addEventListener('click', function (e) { if (!box.contains(e.target)) close(); });
  }

  /* ---- links to the site pages that show each view's content ---- */
  // So an edit can be checked where visitors see it. Every link shares one named
  // tab, so the next click reloads that tab rather than piling up tabs.
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
  A.renderSiteLinks = function () {
    Object.keys(SITE_PAGES).forEach(function (view) {
      var host = A.$('.view[data-view="' + view + '"]');
      if (!host || host.querySelector('.site-links')) return;
      var row = el('div', { class: 'site-links' }, [el('span', { text: 'צפייה באתר (בלשונית נפרדת):' })]);
      SITE_PAGES[view].forEach(function (p) {
        var a = el('a', { href: A.SITE + '/' + p[0], target: 'waldorf-site', text: p[1] });
        a.insertAdjacentHTML('beforeend', EXT_ICON);
        row.appendChild(a);
      });
      var crumb = host.querySelector('.crumb');
      host.insertBefore(row, crumb ? crumb.nextSibling : host.firstChild);
    });
  };

  A.view({ name: 'home', render: function () { counts(); wireSearch(); }, draw: counts });
})();
