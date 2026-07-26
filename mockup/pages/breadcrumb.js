/* פירורי לחם דביקים + מעקב אחר החלק הנקרא כרגע.
   קובץ משותף לכל עמודי המוקאפ — נטען בסוף ה-body. */
(function () {
  'use strict';

  var banner = document.querySelector('main .pagebanner');
  if (!banner) return;
  var crumbs = banner.querySelector('.crumbs');
  if (!crumbs) return;
  var main = banner.closest('main');
  if (!main) return;

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- עיצוב מוזרק (כדי לא לשכפל CSS ב-41 עמודים) ---------- */
  var style = document.createElement('style');
  style.textContent = [
    '.pagebanner{position:sticky;top:10px;z-index:15;transition:box-shadow .18s}',
    '.pagebanner.is-stuck{box-shadow:var(--shadow-lg)}',
    /* רקע רך מאחורי הפילול כדי שהתוכן לא יציץ בפינות המעוגלות */
    '.pagebanner.is-stuck::before{content:"";position:absolute;inset:-18px -12px -10px;z-index:-1;pointer-events:none;',
    '  background:linear-gradient(180deg,var(--cream) 56%,color-mix(in oklab,var(--cream) 55%,transparent) 82%,transparent)}',
    'main h2,main h3{scroll-margin-top:84px}',
    '.crumb-sections{display:contents}',
    '.crumb-sec{max-width:30ch;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '.pagebanner a.crumb,.pagebanner button.crumb{cursor:pointer}',
    '.pagebanner button.crumb{font:inherit;background:none;border:0;padding:0;color:var(--text-muted);display:inline-flex;align-items:center;gap:3px}',
    '.pagebanner button.crumb:hover,.pagebanner button.crumb[aria-expanded="true"]{color:var(--brown);text-decoration:underline}',
    '.pagebanner button.crumb .caret{width:9px;height:9px;flex:0 0 9px;opacity:.75}',
    '.crumb-menu-wrap{position:relative;display:inline-flex}',
    '.crumb-menu{position:absolute;top:calc(100% + 9px);inset-inline-start:50%;transform:translateX(50%);min-width:190px;',
    '  background:var(--white);border:1px solid var(--beige);border-radius:var(--radius-lg);box-shadow:var(--shadow-lg);',
    '  padding:6px 0;z-index:40;display:none}',
    '.crumb-menu.open{display:block}',
    '.crumb-menu a{display:block;padding:8px 18px;font-size:.86rem;color:var(--text-muted);text-decoration:none;white-space:nowrap}',
    '.crumb-menu a:hover,.crumb-menu a:focus-visible{background:var(--beige);color:var(--brown-dark)}',
    '@media (max-width:560px){.pagebanner{top:6px}.crumb-sec{max-width:15ch}}'
  ].join('');
  document.head.appendChild(style);

  function sep() {
    var s = document.createElement('span');
    s.className = 'crumb-sep';
    s.setAttribute('aria-hidden', 'true');
    s.textContent = '/';
    return s;
  }

  function stickyTop() {
    return parseFloat(window.getComputedStyle(banner).top) || 0;
  }

  function scrollToY(y) {
    window.scrollTo({ top: Math.max(0, y), behavior: reduceMotion ? 'auto' : 'smooth' });
  }

  function goToHeading(h) {
    var offset = banner.getBoundingClientRect().height + stickyTop() + 16;
    scrollToY(window.pageYOffset + h.getBoundingClientRect().top - offset);
  }

  /* ---------- 1. פירור העמוד הנוכחי: לחיצה מחזירה לראש העמוד ---------- */
  var pageCrumb = crumbs.querySelector('.crumb.current');
  if (pageCrumb && pageCrumb.tagName !== 'A') {
    var a = document.createElement('a');
    a.className = pageCrumb.className;
    a.setAttribute('aria-current', 'page');
    a.href = '#top';
    a.title = 'חזרה לראש העמוד';
    a.textContent = pageCrumb.textContent;
    pageCrumb.parentNode.replaceChild(a, pageCrumb);
    pageCrumb = a;
    pageCrumb.addEventListener('click', function (e) { e.preventDefault(); scrollToY(0); });
  }

  /* ---------- 2. פירור קטגוריה ללא עמוד משלה: תפריט עמודי המדור ---------- */
  var nav = document.getElementById('primary-nav');

  function sectionLinks(label) {
    if (!nav) return [];
    var out = [], i, el;
    var labels = nav.querySelectorAll('.nav-label');
    for (i = 0; i < labels.length; i++) {
      if (labels[i].textContent.trim() === label) {
        var item = labels[i].closest('.nav-item');
        var dd = item && item.querySelector('.dropdown');
        if (dd) {
          dd.querySelectorAll('.dropdown-link').forEach(function (l) {
            out.push({ href: l.getAttribute('href'), text: l.textContent.trim() });
          });
        }
        return out;
      }
    }
    /* כותרת בתוך תפריט נפתח — נאסוף את הקישורים שאחריה עד המפריד הבא */
    var heads = nav.querySelectorAll('.dropdown-head');
    for (i = 0; i < heads.length; i++) {
      if (heads[i].textContent.trim() !== label) continue;
      el = heads[i].nextElementSibling;
      while (el && !el.classList.contains('dropdown-head') && !el.classList.contains('dropdown-sep')) {
        if (el.classList.contains('dropdown-link')) {
          out.push({ href: el.getAttribute('href'), text: el.textContent.trim() });
        }
        el = el.nextElementSibling;
      }
      return out;
    }
    return out;
  }

  crumbs.querySelectorAll('.crumb-static').forEach(function (node) {
    var label = node.textContent.trim();
    var links = sectionLinks(label);
    if (!links.length) return;

    var wrap = document.createElement('span');
    wrap.className = 'crumb-menu-wrap';

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = node.className;
    btn.setAttribute('aria-haspopup', 'true');
    btn.setAttribute('aria-expanded', 'false');
    btn.appendChild(document.createTextNode(label));
    var caret = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    caret.setAttribute('class', 'caret');
    caret.setAttribute('viewBox', '0 0 24 24');
    caret.setAttribute('fill', 'none');
    caret.setAttribute('stroke', 'currentColor');
    caret.setAttribute('stroke-width', '3');
    caret.setAttribute('aria-hidden', 'true');
    var cpath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    cpath.setAttribute('d', 'M5 9l7 7 7-7');
    caret.appendChild(cpath);
    btn.appendChild(caret);

    var menu = document.createElement('div');
    menu.className = 'crumb-menu';
    links.forEach(function (l) {
      var link = document.createElement('a');
      link.href = l.href;
      link.textContent = l.text;
      menu.appendChild(link);
    });

    wrap.appendChild(btn);
    wrap.appendChild(menu);
    node.parentNode.replaceChild(wrap, node);

    function close() { menu.classList.remove('open'); btn.setAttribute('aria-expanded', 'false'); }
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      var open = menu.classList.toggle('open');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    document.addEventListener('click', function (e) { if (!wrap.contains(e.target)) close(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
  });

  /* ---------- 3. מעקב אחר הכותרת הנקראת כרגע ---------- */
  var sections = document.createElement('span');
  sections.className = 'crumb-sections';
  crumbs.appendChild(sections);

  var headings = [];
  var usedIds = {};

  function slug(text) {
    return text.trim().replace(/["'׳״]/g, '').replace(/[\s ]+/g, '-')
      .replace(/[^֐-׿a-zA-Z0-9\-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '');
  }

  function collect() {
    headings = [];
    main.querySelectorAll('h2,h3').forEach(function (h) {
      if (banner.contains(h)) return;
      var text = h.textContent.trim();
      if (!text) return;
      if (!h.id) {
        var base = slug(text) || 'section';
        var id = base, n = 2;
        while (usedIds[id] || document.getElementById(id)) { id = base + '-' + n; n++; }
        usedIds[id] = true;
        h.id = id;
      }
      headings.push(h);
    });
  }

  function secCrumb(h, deepest) {
    var link = document.createElement('a');
    link.className = 'crumb crumb-sec';
    link.href = '#' + encodeURIComponent(h.id);
    var text = h.textContent.trim();
    link.textContent = text;
    link.title = text;
    if (deepest) link.setAttribute('aria-current', 'location');
    link.addEventListener('click', function (e) { e.preventDefault(); goToHeading(h); });
    return link;
  }

  var lastSig = null;

  function update() {
    var limit = banner.getBoundingClientRect().bottom + 14;
    var cur2 = null, cur3 = null;
    for (var i = 0; i < headings.length; i++) {
      var h = headings[i];
      if (h.getBoundingClientRect().top > limit) break;
      if (h.tagName === 'H2') { cur2 = h; cur3 = null; } else { cur3 = h; }
    }
    var sig = (cur2 ? cur2.id : '') + '|' + (cur3 ? cur3.id : '');
    if (sig === lastSig) return;
    lastSig = sig;

    sections.textContent = '';
    var active = [cur2, cur3].filter(Boolean);
    active.forEach(function (h, idx) {
      sections.appendChild(sep());
      sections.appendChild(secCrumb(h, idx === active.length - 1));
    });
  }

  var ticking = false;
  function schedule() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      ticking = false;
      banner.classList.toggle('is-stuck', banner.getBoundingClientRect().top <= stickyTop() + 1);
      update();
    });
  }

  collect();
  schedule();
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule);

  /* תוכן שנטען דינמית (dynamic.js) עשוי להוסיף כותרות */
  if (window.MutationObserver) {
    var mo = new MutationObserver(function (muts) {
      for (var i = 0; i < muts.length; i++) {
        if (!banner.contains(muts[i].target)) { collect(); schedule(); return; }
      }
    });
    mo.observe(main, { childList: true, subtree: true });
  }
})();
