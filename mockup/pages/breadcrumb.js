/* פירורי לחם דביקים + מעקב אחר החלק הנקרא כרגע.
   קובץ משותף לכל עמודי המוקאפ — נטען בסוף ה-body. */
(function () {
  'use strict';

  /* ---------- JSON-LD: כתובות יחסיות -> מוחלטות בזמן ריצה ----------
     גוגל דורש כתובת מלאה ב-item של BreadcrumbList. המוקאפ מתפרסם היום
     בכתובת אחת והאתר יעלה בסופו של דבר בכתובת אחרת, ולכן אין לקבע דומיין
     בקוד — הדפדפן (וגם ה-renderer של גוגל) משלים אותו מכתובת העמוד. */
  try {
    document.querySelectorAll('script[type="application/ld+json"]').forEach(function (node) {
      var data = JSON.parse(node.textContent);
      if (!data || data['@type'] !== 'BreadcrumbList' || !Array.isArray(data.itemListElement)) return;
      var touched = false;
      data.itemListElement.forEach(function (li) {
        if (typeof li.item === 'string' && !/^[a-z][a-z0-9+.-]*:/i.test(li.item)) {
          li.item = new URL(li.item, location.href).href;
          touched = true;
        }
      });
      if (touched) node.textContent = JSON.stringify(data);
    });
  } catch (e) { /* לא קריטי — שאר העמוד ממשיך לעבוד */ }

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
    // 8px, matching the gap the banner sits at when the page is at rest
    // (main's padding-block-start less the negative margin on the first child).
    // At 10px the pill dropped 2px the moment it stuck.
    '.pagebanner{position:sticky;top:8px;z-index:15;transition:box-shadow .18s}',
    '.pagebanner.is-stuck{box-shadow:var(--shadow-lg)}',
    /* רקע רך מאחורי הפילול כדי שהתוכן לא יציץ בפינות המעוגלות. רוחב מלא של
       העמוד ולא רק של הפיל עצמו: left:50%+margin-left:-50vw הוא הטריק
       הרגיל לפרוץ מהעמודה הממורכזת (main) לרוחב ה-viewport המלא, ועובד כאן
       כי .pagebanner עצמו ממורכז אופקית באותו אופן: top/bottom
       נשארים יחסיים לגובה הפיל עצמו, כולל גלישה לשתי שורות. */
    '.pagebanner.is-stuck::before{content:"";position:absolute;top:-8px;bottom:-20px;left:50%;width:100vw;margin-left:-50vw;z-index:-2;pointer-events:none;',
    '  background:linear-gradient(180deg,var(--cream) 56%,color-mix(in oklab,var(--cream) 55%,transparent) 82%,transparent)}',
    /* הפילול נשאר לבן: פסאודו שלילי נצבע מעל רקע האלמנט עצמו, ולכן הרקע
       הלבן מצויר שוב מעל הרך ומתחת לטקסט */
    '.pagebanner.is-stuck::after{content:"";position:absolute;inset:0;z-index:-1;pointer-events:none;',
    '  border-radius:inherit;background:var(--white)}',
    'main h2,main h3{scroll-margin-top:84px}',
    '.crumb-sections{display:contents}',
    // One row, always: the trail takes all the width the pill has. Every crumb keeps
    // its full label except the last one in the trail (.crumb-end, set by markEnd()),
    // which takes whatever room is left and is clipped with a single ellipsis.
    '.pagebanner{flex-wrap:nowrap}',
    '.pagebanner .crumbs{flex:1 1 0;min-width:0;flex-wrap:nowrap}',
    '.pagebanner .crumbs>*,.pagebanner .crumbs .crumb-sec{flex:none;white-space:nowrap}',
    '.pagebanner .crumbs .crumb-end{flex:0 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis}',
    // Hamburger that slides in at the start (right, in RTL) edge once the pill is
    // stuck. Closed it is 0 wide with a negative end margin that cancels the
    // banner's gap, so the trail is not nudged; open it is a square as tall as the
    // pill (--sm-size, measured in JS), flush with the pill's edge. Width, margin,
    // opacity and offset all ease out together, so the trail shrinks as it arrives.
    // visibility keeps the hidden button out of the tab order.
    '.stick-menu-btn{flex:none;box-sizing:border-box;width:0;height:var(--sm-size,44px);',
    '  margin-block:calc(var(--sm-pad-b,0px) * -1);margin-inline:0 -12px;padding:0;border:0;border-radius:inherit;',
    '  background:var(--brown);color:#fff;display:flex;align-items:center;justify-content:center;overflow:hidden;',
    '  cursor:pointer;opacity:0;transform:translateX(16px);visibility:hidden;',
    '  transition:width .35s ease-out,margin .35s ease-out,opacity .35s ease-out,transform .35s ease-out,visibility 0s linear .35s}',
    '.pagebanner.is-stuck .stick-menu-btn{width:var(--sm-size,44px);margin-inline:calc(var(--sm-pad-s,0px) * -1) 0;',
    '  opacity:1;transform:none;visibility:visible;transition-delay:0s}',
    '.stick-menu-btn:hover,.stick-menu-btn[aria-expanded="true"]{background:var(--brown-dark)}',
    '.stick-menu-btn:focus-visible{outline:3px solid var(--brown-dark);outline-offset:2px}',
    '.stick-menu-btn svg{width:42%;height:42%;flex:none}',
    '.stick-menu{position:absolute;top:calc(100% + 9px);inset-inline-start:0;width:min(300px,calc(100vw - 32px));',
    '  max-height:min(70vh,520px);overflow:auto;background:var(--white);border:1px solid var(--beige);',
    '  border-radius:var(--radius-lg);box-shadow:var(--shadow-lg);padding:8px 0;z-index:40;white-space:normal}',
    '.stick-menu[hidden]{display:none}',
    '.stick-menu .sm-head{padding:10px 24px 2px;font-family:var(--font-head);font-size:.8rem;color:var(--text-muted)}',
    '.stick-menu .sm-sep{height:1px;background:var(--beige);margin:6px 0}',
    '.stick-menu a{display:block;margin-inline:10px;padding:8px 14px;border-radius:var(--radius-organic-sm);font-size:.9rem;color:var(--text);text-decoration:none}',
    '.stick-menu a.sm-top{font-weight:600}',
    '.stick-menu a:focus-visible{outline:none}',
    '.stick-menu a:hover,.stick-menu a:focus-visible{background:var(--beige);color:var(--brown-dark)}',
    '.stick-menu a[aria-current="page"]{color:var(--brown-dark);font-weight:700}',
    '@media (prefers-reduced-motion:reduce){.stick-menu-btn{transition:none}}',
    '.pagebanner a.crumb,.pagebanner button.crumb{cursor:pointer}',
    '.pagebanner button.crumb{font:inherit;background:none;border:0;padding:0;color:var(--text-muted);display:inline-flex;align-items:center;gap:3px}',
    '.pagebanner button.crumb:hover,.pagebanner button.crumb[aria-expanded="true"]{color:var(--brown);text-decoration:underline}',
    '.pagebanner button.crumb .caret{width:9px;height:9px;flex:0 0 9px;opacity:.75}',
    '.crumb-menu-wrap{position:relative;display:inline-flex}',
    '.crumb-menu{position:absolute;top:calc(100% + 9px);inset-inline-start:50%;transform:translateX(50%);min-width:190px;',
    '  background:var(--white);border:1px solid var(--beige);border-radius:var(--radius-lg);box-shadow:var(--shadow-lg);',
    '  padding:10px 0;z-index:40;display:none}',
    '.crumb-menu.open{display:block}',
    // Items are inset pills in the site's organic shape, so the hover fill follows
    // the blob of the menu instead of running square into its curved corners.
    '.crumb-menu a{display:block;margin-inline:10px;padding:8px 14px;border-radius:var(--radius-organic-sm);font-size:.86rem;color:var(--text-muted);text-decoration:none;white-space:nowrap}',
    '.crumb-menu a:hover,.crumb-menu a:focus-visible{background:var(--beige);color:var(--brown-dark)}',
    '.crumb-menu a:focus-visible{outline:none}',
    // The trigger gets no focus box; keyboard focus shows as the underline instead.
    '.pagebanner button.crumb:focus-visible{outline:none;text-decoration:underline;color:var(--brown)}',
    // The resting gap is 8px at every breakpoint, so the sticky offset is too:
    // at 6px the pill rose 2px here for the same reason it dropped 2px above.
    '@media (max-width:560px){.pagebanner{top:8px}}'
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
    var lbl = document.createElement('span');
    lbl.className = 'crumb-label';
    lbl.textContent = label;
    btn.appendChild(lbl);
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

  /* Only the last crumb in the trail may be clipped with an ellipsis: the
     current page, or the deepest section once one is showing. */
  function markEnd() {
    var all = crumbs.querySelectorAll('.crumb');
    var last = all[all.length - 1];
    for (var i = 0; i < all.length; i++) all[i].classList.toggle('crumb-end', all[i] === last);
  }

  /* ---------- hamburger: appears when the pill sticks ---------- */
  var navRoot = document.querySelector('.primary-nav');
  var menuBtn = null, menuPanel = null;

  function buildMenu() {
    var panel = document.createElement('div');
    panel.className = 'stick-menu';
    panel.id = 'stick-menu';
    panel.hidden = true;
    var here = (location.pathname.split('/').pop() || 'home.html').toLowerCase();
    function link(src, top) {
      var a = document.createElement('a');
      a.href = src.getAttribute('href');
      a.textContent = src.textContent.trim();
      if (top) a.className = 'sm-top';
      if ((a.getAttribute('href') || '').split('/').pop().toLowerCase() === here) a.setAttribute('aria-current', 'page');
      return a;
    }
    navRoot.querySelectorAll('.nav-item').forEach(function (item, i) {
      var head = item.querySelector('.nav-link');
      var dd = item.querySelector('.dropdown');
      if (!head) return;
      if (i) { var s = document.createElement('div'); s.className = 'sm-sep'; panel.appendChild(s); }
      if (!dd) { if (head.getAttribute('href')) panel.appendChild(link(head, true)); return; }
      var h = document.createElement('div');
      h.className = 'sm-head';
      h.textContent = head.textContent.trim();
      panel.appendChild(h);
      Array.prototype.forEach.call(dd.children, function (el) {
        if (el.tagName === 'A') panel.appendChild(link(el, false));
        else if (el.classList.contains('dropdown-head')) { var sh = document.createElement('div'); sh.className = 'sm-head'; sh.textContent = el.textContent.trim(); panel.appendChild(sh); }
        else if (el.classList.contains('dropdown-sep')) { var sp = document.createElement('div'); sp.className = 'sm-sep'; panel.appendChild(sp); }
      });
    });
    return panel;
  }

  function setMenu(open) {
    if (!menuBtn) return;
    if (open && !menuPanel) { menuPanel = buildMenu(); banner.appendChild(menuPanel); menuBtn.setAttribute('aria-controls', 'stick-menu'); }
    if (menuPanel) menuPanel.hidden = !open;
    menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    menuBtn.setAttribute('aria-label', open ? 'סגירת תפריט' : 'פתיחת תפריט');
  }

  function sizeMenuBtn() {
    var cs = window.getComputedStyle(banner);
    banner.style.setProperty('--sm-size', banner.offsetHeight + 'px');
    banner.style.setProperty('--sm-pad-b', cs.paddingTop);
    banner.style.setProperty('--sm-pad-s', cs.paddingInlineStart);
  }

  if (navRoot && navRoot.querySelector('.nav-item')) {
    menuBtn = document.createElement('button');
    menuBtn.type = 'button';
    menuBtn.className = 'stick-menu-btn';
    menuBtn.setAttribute('aria-expanded', 'false');
    menuBtn.setAttribute('aria-label', 'פתיחת תפריט');
    menuBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M4 6.5h16M4 12h16M4 17.5h16"/></svg>';
    banner.insertBefore(menuBtn, banner.firstChild);
    sizeMenuBtn();
    window.addEventListener('resize', sizeMenuBtn);
    menuBtn.addEventListener('click', function () { setMenu(menuBtn.getAttribute('aria-expanded') !== 'true'); });
    document.addEventListener('click', function (e) { if (menuPanel && !menuPanel.hidden && !banner.contains(e.target)) setMenu(false); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && menuPanel && !menuPanel.hidden) { setMenu(false); menuBtn.focus(); }
    });
  }

  var ticking = false;
  function schedule() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      ticking = false;
      banner.classList.toggle('is-stuck', banner.getBoundingClientRect().top <= stickyTop() + 1);
      if (!banner.classList.contains('is-stuck')) setMenu(false);
      update();
      markEnd();
    });
  }

  collect();
  markEnd();
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
