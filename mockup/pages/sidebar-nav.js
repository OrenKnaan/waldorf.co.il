/* תפריט צד שנפתח אחרי גלילה מתחת לכותרת — דוגמה, לא חלק מהאתר.

   Demonstrates one pattern: once the page header has scrolled entirely out of
   view, a narrow rail takes over navigation. It is pinned to the inline-end of
   the window, which on this RTL page is the left edge, and each of its items
   opens a panel alongside it.

   The rail is built by reading .primary-nav rather than by repeating the menu,
   so it cannot list something the real navigation does not. Level-1 entries with
   a .dropdown become buttons that open a panel; the two without one stay plain
   links.

   The search is not reimplemented. Its button and its panel are moved out of the
   header and into the rail while the rail is up, and moved back when it comes
   down, so search.js keeps ownership of the engine, the Hebrew tokenising, the
   combobox keys and the focus handling. Rebuilding any of that here would be a
   second copy of the hardest code on the site.

   Hover alone is not enough for a menu. WCAG 1.4.13 wants a pointer-revealed
   panel to be hoverable, dismissible and persistent, and 2.1.1 wants it reachable
   without a pointer, so the panels open on focus as well, survive the pointer
   travelling across the gap into them, and close on Escape. */
(function () {
  'use strict';

  var header = document.querySelector('.site-header');
  var nav = header && header.querySelector('.primary-nav');
  var main = document.querySelector('main');
  if (!header || !nav || !main) return;

  var RAIL_W = 224;       // px
  var LEAVE_GRACE = 220;  // ms the panel survives the pointer leaving

  /* ---------- styles ---------- */

  var style = document.createElement('style');
  style.textContent = [
    ':root{--fsb-w:' + RAIL_W + 'px}',

    // inset-inline-end is the left edge on this page. Logical rather than
    // physical so the component still reads correctly if it is ever lifted into
    // an LTR context, where it would sit on the right.
    '.fsb{position:fixed;inset-block-start:0;inset-block-end:0;inset-inline-end:0;',
    '  width:var(--fsb-w);z-index:45;display:flex;align-items:center;',
    '  pointer-events:none;opacity:0;visibility:hidden;',
    '  transition:opacity .24s ease,transform .24s ease,visibility .24s ease}',
    '.fsb.is-up{opacity:1;transform:none;visibility:visible;pointer-events:auto}',
    // In RTL a positive translateX moves toward the physical right, so the rail
    // arrives from off the left edge with a negative one.
    '.fsb{transform:translateX(-18px)}',

    // The page gives the rail its own column rather than sliding underneath it.
    // Both properties are longhand: main carries a padding shorthand on every
    // page and would otherwise win the inline-end edge back.
    'body.fsb-active main,body.fsb-active .site-footer',
    '  {padding-inline-end:calc(var(--fsb-w) + 30px)}',
    'main,.site-footer{transition:padding-inline-end .24s ease}',

    /* ---- the rail ---- */
    // Flush to the edge, with the same four washes the site runs under its
    // header - the rail is standing in for that header, so it wears its stripe.
    // border-image and border-radius do not combine, which is why the rail is a
    // slab and the panels are the things with rounded corners.
    '.fsb-rail{position:relative;width:100%;padding:16px 0;',
    '  background:linear-gradient(180deg,var(--surface,#FFFDF9) 0%,',
    '    color-mix(in oklab,var(--beige,#F0E8DC) 46%,var(--surface,#FFFDF9)) 100%);',
    '  border-style:solid;border-width:0 0 0 3px;',
    '  border-image:linear-gradient(180deg,var(--wash-rose),var(--wash-gold),var(--wash-sage),var(--wash-sky)) 1;',
    '  box-shadow:-14px 0 34px rgba(61,43,31,.13)}',
    '.fsb-list{list-style:none;margin:0;padding:0}',
    '.fsb-item{position:relative;padding:0 8px}',

    '.fsb-link{display:flex;align-items:center;gap:9px;width:100%;',
    '  min-height:44px;padding:11px 14px;border:0;background:transparent;',
    '  font-family:var(--font-head,inherit);font-size:.97rem;font-weight:500;',
    '  color:var(--brown,#6B4F35);text-align:start;text-decoration:none;cursor:pointer;',
    '  border-radius:var(--radius-organic-sm,11px 21px 10px 19px / 19px 10px 22px 11px);',
    '  transition:background .16s,color .16s}',
    '.fsb-link:hover,.fsb-item.is-open>.fsb-link',
    '  {background:var(--beige,#F0E8DC);color:var(--brown-dark,#3D2B1F)}',
    // The page you are on is stated, not merely tinted: a filled wash marker.
    '.fsb-link.is-current{color:var(--brown-dark,#3D2B1F);font-weight:600}',
    '.fsb-link.is-current::before{content:"";width:7px;height:7px;flex:none;',
    '  border-radius:50%;background:var(--wash-gold,#E8C877);',
    '  box-shadow:0 0 0 3px color-mix(in oklab,var(--wash-gold,#E8C877) 30%,transparent)}',
    '.fsb-link .fsb-caret{margin-inline-start:auto;width:13px;height:13px;flex:none;',
    '  opacity:.55;transition:transform .16s,opacity .16s}',
    '.fsb-item.is-open>.fsb-link .fsb-caret{transform:rotate(-90deg);opacity:1}',
    '.fsb-badge{font-size:.66rem;font-weight:500;padding:2px 8px;',
    '  border-radius:var(--radius-pill,999px);background:#F3DDA7;color:var(--brown-dark,#3D2B1F)}',

    /* ---- the panel ---- */
    // inset-inline-end:100% maps to left:100% in RTL, which is the edge the rail
    // is pinned to, so the panel opens across the page rather than off-screen.
    '.fsb-panel{position:absolute;inset-inline-end:100%;inset-block-start:-10px;',
    '  min-width:268px;max-width:330px;display:none;',
    '  background:linear-gradient(165deg,var(--surface,#FFFDF9) 0%,',
    '    color-mix(in oklab,var(--beige,#F0E8DC) 34%,var(--surface,#FFFDF9)) 100%);',
    '  border:1px solid var(--tan-dark,#A88B69);',
    '  border-radius:var(--radius-organic,22px 44px 20px 40px / 40px 20px 46px 22px);',
    '  box-shadow:0 16px 40px rgba(61,43,31,.2);padding:12px 10px;margin-inline-end:14px}',
    '.fsb-item.is-open>.fsb-panel{display:block;animation:fsb-in .16s ease both}',
    '@keyframes fsb-in{from{opacity:0;transform:translateX(-6px)}to{opacity:1;transform:none}}',
    // The gap the pointer has to cross is part of the panel's hit area, or
    // reaching a link inside it becomes a race.
    '.fsb-panel::after{content:"";position:absolute;inset-block:0;',
    '  inset-inline-start:100%;width:16px}',
    '.fsb-panel a{display:block;padding:9px 15px;font-size:.9rem;',
    '  color:var(--text-muted,#6B5A49);text-decoration:none;',
    '  border-radius:var(--radius-organic-sm,11px 21px 10px 19px / 19px 10px 22px 11px);',
    '  transition:background .16s,color .16s}',
    '.fsb-panel a:hover{background:var(--beige,#F0E8DC);color:var(--brown-dark,#3D2B1F)}',
    '.fsb-panel a.is-current{color:var(--brown-dark,#3D2B1F);font-weight:600}',
    '.fsb-panel .fsb-head{padding:10px 15px 4px;font-family:var(--font-head,inherit);',
    '  font-size:.71rem;letter-spacing:.09em;color:var(--tan-dark,#A88B69)}',
    '.fsb-panel .fsb-sep{height:1px;margin:8px 15px;',
    '  background:linear-gradient(90deg,transparent,var(--tan,#C4A882),transparent)}',

    /* ---- the search, while it is living in the rail ---- */
    '.fsb-search .wsearch-btn{margin:0;width:100%;justify-content:flex-start;',
    '  gap:9px;padding:11px 14px;min-height:44px;border-block-end:0;',
    '  border-radius:var(--radius-organic-sm,11px 21px 10px 19px / 19px 10px 22px 11px);',
    '  font-family:var(--font-head,inherit);color:var(--brown,#6B4F35)}',
    '.fsb-search .wsearch-btn::after{content:"חיפוש";font-size:.97rem;font-weight:500}',
    '.fsb-search .wsearch-btn:hover,.fsb-search .wsearch-btn[aria-expanded="true"]',
    '  {background:var(--beige,#F0E8DC);color:var(--brown-dark,#3D2B1F)}',
    '.fsb-search .wsearch{position:absolute;inset-inline-end:100%;inset-block-start:-10px;',
    '  inset-inline-start:auto;width:min(430px,calc(100vw - var(--fsb-w) - 48px));',
    '  margin-inline-end:14px}',
    '.fsb-search .wsearch-inner{max-width:none;padding:0;justify-content:flex-start}',
    '.fsb-search .wsearch-panel{width:100%;border:1px solid var(--tan-dark,#A88B69);',
    '  border-radius:var(--radius-organic,22px 44px 20px 40px / 40px 20px 46px 22px)}',

    // The rail overlaps the content at narrow widths and the header's own
    // hamburger is a better answer there, so it simply does not appear.
    '@media (max-width:900px){.fsb{display:none}',
    '  body.fsb-active main,body.fsb-active .site-footer{padding-inline-end:inherit}}',
    '@media (prefers-reduced-motion:reduce){.fsb,main,.site-footer{transition:none}',
    '  .fsb-item.is-open>.fsb-panel{animation:none}}',

    // The rail hangs off <body>, outside main/.site-header/.site-footer, so the
    // sweeping overrides in accessibility.js do not reach it and every rule it
    // needs has to be written here. Skipping this left the badge's hard-coded
    // #F3DDA7 fill under text the mode had turned white: 1.33:1.
    'html.a11y-contrast .fsb-rail,html.a11y-contrast .fsb-panel',
    '  {background:#000!important;border:1px solid #fff!important;box-shadow:none!important;',
    '   border-image:none!important}',
    'html.a11y-contrast .fsb-link,html.a11y-contrast .fsb-head',
    '  {background:transparent!important;color:#fff!important}',
    'html.a11y-contrast .fsb-panel a{color:#FFE14D!important;background:transparent!important;',
    '  text-decoration:underline!important}',
    'html.a11y-contrast .fsb-badge{background:#000!important;color:#FFE14D!important;',
    '  border:1px solid #FFE14D!important}',
    'html.a11y-contrast .fsb-link.is-current::before{background:#FFE14D!important;box-shadow:none!important}',
    'html.a11y-contrast .fsb-panel .fsb-sep{background:#fff!important}',
    'html.a11y-contrast .fsb-link:hover,html.a11y-contrast .fsb-item.is-open>.fsb-link,',
    'html.a11y-contrast .fsb-panel a:hover{outline:2px solid #FFE14D!important}',
  ].join('');
  document.head.appendChild(style);

  /* ---------- build the rail from the real menu ---------- */

  var CARET = '<svg class="fsb-caret" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
    'stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M5 8.5l7 7 7-7"/></svg>';

  var wrap = document.createElement('div');
  wrap.className = 'fsb';
  var rail = document.createElement('nav');
  rail.className = 'fsb-rail';
  rail.setAttribute('aria-label', 'ניווט צדי');
  var list = document.createElement('ul');
  list.className = 'fsb-list';
  rail.appendChild(list);
  wrap.appendChild(rail);

  // The badge has to come out of the clone before the text is read, or its
  // wording lands in the label as well as in the badge - "חומר למיוןזמני".
  function labelOf(navLink) {
    var clone = navLink.cloneNode(true);
    [].forEach.call(clone.querySelectorAll('svg'), function (s) { s.remove(); });
    var badge = clone.querySelector('.nav-badge');
    var badgeText = badge ? badge.textContent.trim() : null;
    if (badge) badge.remove();
    return { text: (clone.textContent || '').trim(), badge: badgeText };
  }

  // Nothing on this site marks the current page in the menu - .nav-link.active
  // is styled but never set - so it is derived from the address instead of read
  // off a class that is always absent.
  var here = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  function isHere(href) {
    if (!href) return false;
    return (href.split('/').pop() || '').split('#')[0].toLowerCase() === here;
  }

  var items = [];
  [].forEach.call(nav.querySelectorAll(':scope > .nav-item'), function (navItem, i) {
    var navLink = navItem.querySelector('.nav-link');
    var dropdown = navItem.querySelector('.dropdown');
    if (!navLink) return;

    var li = document.createElement('li');
    li.className = 'fsb-item';
    var info = labelOf(navLink);
    var badge = info.badge ? '<span class="fsb-badge">' + info.badge + '</span>' : '';

    if (!dropdown) {
      var a = document.createElement('a');
      a.className = 'fsb-link';
      a.href = navLink.getAttribute('href') || '#';
      a.innerHTML = '<span>' + info.text + '</span>' + badge;
      if (isHere(a.getAttribute('href'))) a.classList.add('is-current');
      li.appendChild(a);
      list.appendChild(li);
      return;
    }

    var id = 'fsb-panel-' + i;
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'fsb-link';
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-controls', id);
    btn.innerHTML = '<span>' + info.text + '</span>' + badge + CARET;

    var panel = document.createElement('div');
    panel.className = 'fsb-panel';
    panel.id = id;
    [].forEach.call(dropdown.children, function (node) {
      if (node.classList.contains('dropdown-link')) {
        var link = document.createElement('a');
        link.href = node.getAttribute('href');
        link.textContent = node.textContent.trim();
        if (isHere(link.getAttribute('href'))) {
          link.classList.add('is-current');
          btn.classList.add('is-current');   // the section, as well as the page
        }
        panel.appendChild(link);
      } else if (node.classList.contains('dropdown-head')) {
        var head = document.createElement('div');
        head.className = 'fsb-head';
        head.textContent = node.textContent.trim();
        panel.appendChild(head);
      } else if (node.classList.contains('dropdown-sep')) {
        var sep = document.createElement('div');
        sep.className = 'fsb-sep';
        panel.appendChild(sep);
      }
    });

    li.appendChild(btn);
    li.appendChild(panel);
    list.appendChild(li);
    items.push({ li: li, btn: btn });
  });

  // The search keeps its own button; it only changes address.
  var searchLi = document.createElement('li');
  searchLi.className = 'fsb-item fsb-search';
  list.appendChild(searchLi);
  document.body.appendChild(wrap);

  /* ---------- opening and closing ---------- */

  var leaveTimer = null;

  function closeAll(except) {
    items.forEach(function (it) {
      if (it.li === except) return;
      it.li.classList.remove('is-open');
      it.btn.setAttribute('aria-expanded', 'false');
    });
  }

  function openItem(it) {
    window.clearTimeout(leaveTimer);
    closeAll(it.li);
    it.li.classList.add('is-open');
    it.btn.setAttribute('aria-expanded', 'true');
  }

  items.forEach(function (it) {
    it.li.addEventListener('pointerenter', function () { openItem(it); });
    it.li.addEventListener('pointerleave', function () {
      // Persistent, per WCAG 1.4.13: a panel does not vanish the moment the
      // pointer strays off it, or reaching a link inside becomes a race.
      window.clearTimeout(leaveTimer);
      leaveTimer = window.setTimeout(function () {
        if (!it.li.contains(document.activeElement)) {
          it.li.classList.remove('is-open');
          it.btn.setAttribute('aria-expanded', 'false');
        }
      }, LEAVE_GRACE);
    });
    it.btn.addEventListener('focus', function () { openItem(it); });
    it.btn.addEventListener('click', function () {
      var open = it.li.classList.contains('is-open');
      if (open) { it.li.classList.remove('is-open'); it.btn.setAttribute('aria-expanded', 'false'); }
      else openItem(it);
    });
    it.li.addEventListener('focusout', function (e) {
      if (it.li.contains(e.relatedTarget)) return;
      it.li.classList.remove('is-open');
      it.btn.setAttribute('aria-expanded', 'false');
    });
  });

  // Dismissible, per WCAG 1.4.13.
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    var open = wrap.querySelector('.fsb-item.is-open');
    if (!open) return;
    var btn = open.querySelector('.fsb-link');
    closeAll(null);
    if (btn && open.contains(document.activeElement)) btn.focus();
  });

  /* ---------- the search moves in and out with the rail ---------- */

  function searchParts() {
    return {
      btn: document.querySelector('.wsearch-btn'),
      panel: document.querySelector('.wsearch'),
    };
  }

  function adoptSearch(into) {
    var p = searchParts();
    if (!p.btn || !p.panel) return;
    if (into) {
      if (p.btn.parentElement !== searchLi) {
        searchLi.appendChild(p.btn);
        searchLi.appendChild(p.panel);
        // Only two things can occupy the space beside the rail, so opening one
        // puts the other away. search.js already closes itself on a pointerdown
        // outside its panel, which covers the other direction.
        p.btn.addEventListener('click', function () { closeAll(null); });
      }
    } else if (p.btn.parentElement === searchLi) {
      // Closed on the way out: the panel is anchored to the header again, and
      // leaving it open would strand it behind the rail as that fades.
      if (p.panel.classList.contains('is-open')) p.btn.click();
      nav.appendChild(p.btn);
      header.appendChild(p.panel);
    }
  }

  /* ---------- appear once the header has gone ---------- */

  var up = false;
  function setUp(next) {
    if (next === up) return;
    up = next;
    wrap.classList.toggle('is-up', up);
    document.body.classList.toggle('fsb-active', up);
    if (!up) closeAll(null);
    adoptSearch(up);
  }

  // The header is the thing that has to leave, so watch the header rather than
  // guessing a scroll offset - it is a different height on every breakpoint and
  // taller again while the mobile drawer is open.
  function headerGone() { return header.getBoundingClientRect().bottom <= 0; }
  function sync() { setUp(headerGone()); }

  // Three sources, all reading the live geometry rather than trusting an event's
  // payload. The observer on its own left the rail down in roughly one page load
  // in six: its callbacks, like rAF, can be withheld while a tab is not being
  // rendered, and a scroll inside that window leaves no crossing to catch up on.
  // The scroll listener is the one that always fires; the observer covers the
  // header changing height without a scroll, which is what the mobile drawer
  // does; visibilitychange covers coming back to a backgrounded tab.
  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(function () { ticking = false; sync(); });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  document.addEventListener('visibilitychange', sync);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(sync, { threshold: 0 }).observe(header);
  }
  sync();
})();
