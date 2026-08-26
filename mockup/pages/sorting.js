/* "חומר למיון" — תצוגת חומרי הביניים מהאתר הישן.
   סקריפט משותף לכל עמודי המדור. מזריק את ה-CSS שלו (כמו search.js), כדי
   שלא לשכפל אותו בשבעה עמודים. נטען עם defer: אין לו מה להחיל לפני הציור
   הראשון, בניגוד ל-accessibility.js.

   התוכן עצמו יושב ב-pages/sorting-data/: index.json עם המטא-דאטה של כל
   הפריטים, ו-items/<id>.html עם גוף הפריט, שנטען רק כשפותחים אותו. שני
   הקבצים נוצרים ע"י mockup/sorting-content.mjs מתוך ה-API של האתר הישן.

   כל המדור זמני — ראו CLAUDE.md, "Launch cutover". */
(function () {
  'use strict';

  var main = document.querySelector('main[data-sorting-group]');
  if (!main) return;
  var group = main.getAttribute('data-sorting-group');
  var root = main.querySelector('.si-app');

  var DATA = './sorting-data/';

  /* עמוד השער מציג רק את המספרים, כדי שלא יתיישנו מול המחולל */
  if (group === 'index') {
    var slots = main.querySelectorAll('[data-si-count]');
    if (!slots.length) return;
    fetch(DATA + 'index.json')
      .then(function (r) { return r.json(); })
      .then(function (index) {
        slots.forEach(function (slot) {
          var g = index.groups[slot.getAttribute('data-si-count')];
          if (g) slot.textContent = g.count.toLocaleString('he-IL');
        });
      })
      .catch(function () { /* המספרים שנכתבו בזמן היצירה נשארים */ });
    return;
  }
  if (!root) return;

  /* ---------- עיצוב ---------- */
  /* משתמש ב-design tokens של האתר, כמו search.js ובניגוד לפאנל הנגישות:
     זו כרומה רגילה של האתר, ולכן היא צריכה להשתנות יחד עם הפלטה — וכך היא
     מקבלת את html.a11y-contrast בחינם. */
  var style = document.createElement('style');
  style.textContent = [
    '.si-app{margin-top:22px}',
    '.si-tools{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin:0 0 14px}',
    '.si-search{flex:1 1 220px;min-width:0;font:inherit;font-size:.95rem;color:var(--text);',
    '  background:var(--white);border:1.5px solid var(--beige);border-radius:var(--radius-organic-sm);padding:10px 15px}',
    '.si-search:focus{outline:2px solid var(--brown);outline-offset:2px;border-color:var(--tan)}',
    '.si-count{font-size:.85rem;color:var(--text-muted)}',
    '.si-bucket{margin:26px 0 0}',
    '.si-bucket > h2{display:flex;flex-wrap:wrap;align-items:baseline;gap:9px}',
    '.si-bucket-n{font-family:var(--font-body);font-size:.8rem;font-weight:500;color:var(--text-muted)}',
    '.si-list{list-style:none;margin:0;padding:0}',
    '.si-item{background:var(--white);border-radius:var(--radius-lg);box-shadow:var(--shadow);',
    '  padding:14px 18px;margin:0 0 10px}',
    '.si-item > h3{margin:0;font-size:1.02rem;line-height:1.5}',
    '.si-toggle{font:inherit;font-size:inherit;font-family:var(--font-head);font-weight:700;color:var(--brown-dark);',
    '  background:none;border:0;padding:0;text-align:start;cursor:pointer;display:flex;gap:8px;align-items:baseline;width:100%}',
    '.si-toggle:hover{color:var(--brown)}',
    '.si-toggle .si-caret{flex:0 0 11px;width:11px;height:11px;transition:transform .18s}',
    '.si-toggle[aria-expanded="true"] .si-caret{transform:rotate(-90deg)}',
    '.si-item[data-empty="1"] .si-toggle{cursor:default;color:var(--text-muted)}',
    '.si-meta{display:flex;flex-wrap:wrap;gap:6px 10px;align-items:center;margin:7px 0 0;font-size:.8rem;color:var(--text-muted)}',
    '.si-by{color:var(--brown);font-weight:500}',
    '.si-tag{background:var(--beige);color:var(--brown);border-radius:var(--radius-organic-sm);padding:2px 10px;font-size:.75rem}',
    '.si-excerpt{margin:8px 0 0;font-size:.88rem;color:var(--text-muted);line-height:1.65}',
    '.si-links{display:flex;flex-wrap:wrap;gap:6px 16px;margin:9px 0 0;font-size:.8rem}',
    '.si-body{margin:14px 0 2px;padding:14px 0 0;border-top:1px solid var(--beige);line-height:1.8}',
    '.si-body[hidden]{display:none}',
    '.si-body img{max-width:100%;height:auto;border-radius:var(--radius)}',
    '.si-body table{width:100%;border-collapse:collapse}',
    '.si-body figure{margin:14px 0}',
    '.si-body iframe{max-width:100%}',
    '.si-body h1,.si-body h2,.si-body h3,.si-body h4{font-family:var(--font-head);color:var(--brown-dark);line-height:1.4}',
    '.si-body h1{font-size:1.15rem}.si-body h2{font-size:1.08rem}.si-body h3{font-size:1rem}',
    '.si-body pre{white-space:pre-wrap;word-break:break-word}',
    '.si-scroll{overflow-x:auto}',
    '.si-status{color:var(--text-muted);font-size:.88rem;margin:10px 0}',
    /* גלישת הגוף המקורי: תוכן וורדפרס ישן מגיע לעתים עם רוחב קבוע */
    '.si-body *{max-width:100%}',
    '@media (max-width:560px){.si-item{padding:12px 13px}}'
  ].join('');
  document.head.appendChild(style);

  /* ---------- עזרי טקסט ---------- */
  /* קיפול ניקוד, גרשיים וסופיות — אותה בעיה שה-tokenizer של החיפוש הראשי
     פותר: בלי קיפול הסופיות "גן" לא ימצא את "גנים". */
  var FINALS = { 'ך': 'כ', 'ם': 'מ', 'ן': 'נ', 'ף': 'פ', 'ץ': 'צ' };
  function fold(s) {
    return String(s || '').replace(/[֑-ׇ]/g, '')
      .replace(/["'״׳`]/g, '')
      .replace(/[ךםןףץ]/g, function (c) { return FINALS[c]; })
      .toLowerCase();
  }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function caret() {
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'si-caret');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '3');
    svg.setAttribute('aria-hidden', 'true');
    var p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    p.setAttribute('d', 'M5 9l7 7 7-7');
    svg.appendChild(p);
    return svg;
  }

  function words(chars) {
    // ממוצע של כ-5.4 תווים למילה בעברית כולל רווחים — מספיק לאומדן היקף.
    return Math.max(1, Math.round(chars / 5.4));
  }

  function heName(path) {
    return decodeURIComponent(path || '').replace(/-/g, ' ');
  }

  /* ---------- ציור פריט ---------- */
  function renderItem(item) {
    var li = el('li', 'si-item');
    if (!item.hasBody) li.setAttribute('data-empty', '1');
    li.setAttribute('data-hay', fold([item.title, item.author, item.excerpt, item.bucket].join(' ')));

    var h = el('h3');
    var btn = el('button', 'si-toggle');
    btn.type = 'button';
    btn.appendChild(caret());
    btn.appendChild(document.createTextNode(item.title));
    h.appendChild(btn);
    li.appendChild(h);

    var meta = el('div', 'si-meta');
    if (item.author) meta.appendChild(el('span', 'si-by', item.author));
    if (item.date) {
      var t = el('time', null, item.date.split('-').reverse().join('.'));
      t.setAttribute('datetime', item.date);
      meta.appendChild(t);
    }
    if (item.chars > 400) meta.appendChild(el('span', 'si-tag', 'כ־' + words(item.chars).toLocaleString('he-IL') + ' מילים'));
    if (item.assets.pdf) meta.appendChild(el('span', 'si-tag', item.assets.pdf + ' PDF'));
    if (item.assets.doc) meta.appendChild(el('span', 'si-tag', item.assets.doc + ' מסמכים'));
    if (item.assets.img) meta.appendChild(el('span', 'si-tag', item.assets.img + ' תמונות'));
    if (!item.hasBody) meta.appendChild(el('span', 'si-tag', 'ללא תוכן בגוף העמוד'));
    li.appendChild(meta);

    if (item.excerpt) li.appendChild(el('p', 'si-excerpt', item.excerpt + '…'));

    var links = el('div', 'si-links');
    var orig = el('a', null, 'העמוד המקורי באתר הישן');
    orig.href = item.oldUrl;
    orig.target = '_blank';
    orig.rel = 'noopener';
    orig.appendChild(el('span', 'sr-only', ' (נפתח בחלון חדש)'));
    links.appendChild(orig);
    if (item.redirectsTo) {
      var to = el('a', null, 'ההפניה מובילה כיום אל ' + item.redirectsTo.replace(/^\//, ''));
      to.href = '.' + item.redirectsTo;
      links.appendChild(to);
    }
    li.appendChild(links);

    if (item.hasBody) {
      var body = el('div', 'si-body');
      body.hidden = true;
      body.setAttribute('role', 'region');
      li.appendChild(body);

      btn.setAttribute('aria-expanded', 'false');
      btn.addEventListener('click', function () {
        var open = btn.getAttribute('aria-expanded') === 'true';
        btn.setAttribute('aria-expanded', open ? 'false' : 'true');
        body.hidden = open;
        if (!open) loadBody(item, body, h);
      });
    }

    return li;
  }

  /* ---------- טבלאות נגללות בגוף שנטען ---------- */
  // accessibility.js already gives an overflowing .table-wrap tabindex, role
  // and a label — but it observes only the wraps that exist when it
  // initialises, and these arrive later, when somebody opens an item. So the
  // same measurement is repeated here for the wraps this file creates. The
  // alternative was exporting a re-scan hook from accessibility.js, and this
  // section has to be removable without leaving a trace in a permanent file.
  //
  // Module scope, for the reason accessibility.js spells out: a ResizeObserver
  // referenced only from inside the function that made it gets collected, and
  // the toggling silently stops a few interactions later.
  var tableObserver = null;
  var watched = [];

  function syncWraps() {
    watched.forEach(function (entry) {
      var el = entry.wrap;
      // A pixel of slack, as in accessibility.js: sub-pixel layout otherwise
      // flickers a tab stop in and out on tables that visibly fit.
      var scrolls = el.scrollWidth - el.clientWidth > 1;
      if (scrolls === (el.getAttribute('tabindex') === '0')) return;
      if (scrolls) {
        el.setAttribute('tabindex', '0');
        el.setAttribute('role', 'region');
        el.setAttribute('aria-label', 'טבלה נגללת: ' + entry.title);
      } else {
        el.removeAttribute('tabindex');
        el.removeAttribute('role');
        el.removeAttribute('aria-label');
      }
    });
  }

  function watchWrap(wrap, title) {
    watched.push({ wrap: wrap, title: title });
    if (typeof ResizeObserver !== 'function') {
      if (watched.length === 1) window.addEventListener('resize', syncWraps);
      return;
    }
    if (!tableObserver) tableObserver = new ResizeObserver(function () { syncWraps(); });
    tableObserver.observe(wrap);
  }

  var loaded = {};
  function loadBody(item, body, heading) {
    if (loaded[item.id]) return;
    loaded[item.id] = true;
    if (!heading.id) heading.id = 'si-h-' + item.id;
    body.setAttribute('aria-labelledby', heading.id);
    body.appendChild(el('p', 'si-status', 'טוען…'));
    fetch(DATA + 'items/' + item.id + '.html')
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.text(); })
      .then(function (html) {
        body.innerHTML = html;
        // טבלאות רחבות מהאתר הישן — עוטפים אותן כדי שהעמוד עצמו לא יגלוש.
        // .table-wrap מקבל tabindex מ-accessibility.js כשהוא באמת גולש.
        body.querySelectorAll('table').forEach(function (tbl) {
          if (tbl.closest('.table-wrap')) return;
          var wrap = el('div', 'table-wrap');
          tbl.parentNode.insertBefore(wrap, tbl);
          wrap.appendChild(tbl);
          watchWrap(wrap, item.title);
        });
        syncWraps();
      })
      .catch(function () {
        loaded[item.id] = false;
        body.innerHTML = '';
        var p = el('p', 'si-status', 'לא ניתן לטעון את התוכן. ');
        var a = el('a', null, 'לעמוד המקורי');
        a.href = item.oldUrl;
        a.target = '_blank';
        a.rel = 'noopener';
        p.appendChild(a);
        body.appendChild(p);
      });
  }

  /* ---------- ציור העמוד ---------- */
  function bucketLabel(key, meta) {
    if (meta.groupBy === 'year') return 'שנת ' + key;
    if (meta.groupBy === 'section') return heName(key);
    return key;
  }

  function render(index) {
    var meta = index.groups[group];
    var items = index.items.filter(function (i) { return i.group === group; });

    root.textContent = '';

    var tools = el('div', 'si-tools');
    var search = el('input', 'si-search');
    search.type = 'search';
    search.id = 'si-filter';
    search.placeholder = 'סינון לפי כותרת, כותב או תקציר';
    var label = el('label', 'sr-only', 'סינון הרשימה');
    label.htmlFor = 'si-filter';
    tools.appendChild(label);
    tools.appendChild(search);
    var count = el('p', 'si-count');
    count.setAttribute('aria-live', 'polite');
    tools.appendChild(count);
    root.appendChild(tools);

    // סדר המדורים: לפי שנה — מהחדש לישן; אחרת לפי גודל, שזה הסדר שמועיל
    // למי שבא למיין. פרקי ספר שומרים על סדר הפרקים כפי שהגיע מהמחולל.
    var order = [];
    var byBucket = {};
    items.forEach(function (i) {
      if (!byBucket[i.bucket]) { byBucket[i.bucket] = []; order.push(i.bucket); }
      byBucket[i.bucket].push(i);
    });
    if (meta.groupBy === 'year') order.sort(function (a, b) { return b.localeCompare(a); });
    else if (meta.groupBy !== 'book') {
      order.sort(function (a, b) {
        return byBucket[b].length - byBucket[a].length || a.localeCompare(b, 'he');
      });
    }

    var sections = [];
    order.forEach(function (key) {
      var sec = el('section', 'si-bucket');
      var h2 = el('h2');
      h2.appendChild(document.createTextNode(bucketLabel(key, meta)));
      h2.appendChild(el('span', 'si-bucket-n', byBucket[key].length + ' פריטים'));
      sec.appendChild(h2);
      var ul = el('ul', 'si-list');
      byBucket[key].forEach(function (i) { ul.appendChild(renderItem(i)); });
      sec.appendChild(ul);
      root.appendChild(sec);
      sections.push(sec);
    });

    function applyFilter() {
      var q = fold(search.value.trim());
      var shown = 0;
      sections.forEach(function (sec) {
        var visible = 0;
        sec.querySelectorAll('.si-item').forEach(function (li) {
          var hit = !q || li.getAttribute('data-hay').indexOf(q) !== -1;
          li.hidden = !hit;
          if (hit) visible += 1;
        });
        sec.hidden = visible === 0;
        shown += visible;
      });
      count.textContent = q
        ? shown + ' מתוך ' + items.length + ' פריטים'
        : items.length + ' פריטים';
    }

    var timer;
    search.addEventListener('input', function () {
      clearTimeout(timer);
      timer = setTimeout(applyFilter, 120);
    });
    applyFilter();
  }

  root.textContent = '';
  root.appendChild(el('p', 'si-status', 'טוען את רשימת החומרים…'));
  fetch(DATA + 'index.json')
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(render)
    .catch(function () {
      root.textContent = '';
      root.appendChild(el('p', 'si-status', 'לא ניתן לטעון את רשימת החומרים כרגע. החומרים המקוריים נמצאים באתר הישן, waldorf.co.il.'));
    });
})();
