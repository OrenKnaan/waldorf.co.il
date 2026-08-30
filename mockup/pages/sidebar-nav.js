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

  var RAIL_W = 232;       // px
  var LEAVE_GRACE = 220;  // ms the panel survives the pointer leaving

  /* ---------- styles ---------- */

  var style = document.createElement('style');
  style.textContent = [
    // The rail is a card in a column of its own: 24px in from the window, the
    // card, then 24px before the content starts.
    ':root{--fsb-w:' + RAIL_W + 'px;--fsb-gap:24px}',

    // The rail is a column beside the text, not an overlay pinned to the window,
    // so it lines up with the content it belongs to. Everything above the first
    // card - header, breadcrumb, artwork, the h1 - and the footer below keep the
    // full width, because the wrapper starts at the first card and ends at the
    // last thing in main.
    '.fsb-layout{display:block}',
    '.fsb{display:none}',
    '@media (min-width:901px){',
    '  .fsb-layout{display:flex;align-items:flex-start;gap:var(--fsb-gap)}',
    // min-width:0 or a long unbroken string in the text would refuse to shrink
    // and push the rail off the side.
    '  .fsb-col{flex:1 1 auto;min-width:0}',
    // Sticky rather than scrolling away: the menu stays with you down a long
    // page, which is what it is for, and stops at the end of the column.
    '  .fsb.is-on{display:block;flex:0 0 var(--fsb-w);',
    '    position:sticky;inset-block-start:var(--fsb-gap)}',
    '}',
    // .scroll-top-btn is fixed to this corner of the window and would land on
    // the rail; it steps aside by the width of the column.
    'body.fsb-static .scroll-top-btn{inset-inline-end:calc(var(--fsb-w) + var(--fsb-gap) * 2)}',
    // The rail carries the whole menu, so the header's copy of it would be a
    // second set of the same links. The brand row stays.
    'body.fsb-static .site-header > nav{display:none}',

    /* ---- the rail: the site's card, in a column ---- */
    '.fsb-rail{width:100%;background:var(--white);border:1px solid var(--tan-dark);',
    '  border-radius:var(--radius-lg);box-shadow:var(--shadow);padding:10px 0}',
    '.fsb-list{list-style:none;margin:0;padding:0}',
    '.fsb-item{position:relative}',

    // Matches .nav-link in the header: same face, size, weight and colour, with
    // the gold moved from an underline to the inline-start edge, which is the
    // one a vertical menu has.
    '.fsb-link{display:flex;align-items:center;gap:6px;width:100%;min-height:44px;',
    '  padding:12px 20px;border:0;background:transparent;',
    '  font-family:var(--font-body,inherit);font-size:.94rem;font-weight:500;',
    '  color:var(--brown);text-align:start;text-decoration:none;cursor:pointer;',
    '  border-inline-start:3px solid transparent;',
    '  transition:background .15s,color .15s,border-color .15s}',
    '.fsb-link:hover,.fsb-item.is-open>.fsb-link',
    '  {background:var(--beige);color:var(--brown-dark);border-inline-start-color:var(--wash-gold)}',
    '.fsb-link.is-current{color:var(--brown-dark);font-weight:600;',
    '  border-inline-start-color:var(--wash-gold);',
    '  background:color-mix(in oklab,var(--tan) 20%,transparent)}',
    '.fsb-link .fsb-caret{margin-inline-start:auto;width:13px;height:13px;flex:none;',
    '  transition:transform .2s}',
    '.fsb-item.is-open>.fsb-link .fsb-caret{transform:rotate(90deg)}',
    '.fsb-badge{font-size:.72rem;font-weight:600;padding:3px 10px;',
    '  border-radius:var(--radius-organic-sm);background:#F3DDA7;color:var(--brown-dark)}',

    /* ---- the panel: the site's own dropdown, turned sideways ---- */
    // Same white, same shadow, same 252px floor, same 8px padding. The 3px gold
    // moves from the top edge to the edge facing the rail, which in RTL is the
    // inline-end one, so it still marks the side the panel came from.
    '.fsb-panel{position:absolute;inset-inline-end:100%;inset-block-start:-10px;',
    '  min-width:252px;max-width:320px;display:none;background:var(--white);',
    '  box-shadow:var(--shadow-lg);border-radius:var(--radius-lg);',
    '  border-inline-end:3px solid var(--wash-gold);',
    '  padding:8px 0;margin-inline-end:10px;z-index:20}',
    '.fsb-item.is-open>.fsb-panel{display:block}',
    // The gap the pointer crosses belongs to the panel, or reaching a link
    // inside it becomes a race.
    '.fsb-panel::after{content:"";position:absolute;inset-block:0;',
    '  inset-inline-start:100%;width:13px}',
    '.fsb-panel a{display:block;padding:9px 22px;font-size:.9rem;',
    '  color:var(--text-muted);text-decoration:none;transition:background .15s,color .15s}',
    '.fsb-panel a:hover,.fsb-panel a.is-current{background:var(--beige);color:var(--brown-dark)}',
    // --brown, not the --tan-dark the site's own .dropdown-head uses: that is
    // 3.14:1 on the card at 11.5px, under the 4.5 small text needs. It goes
    // unreported in the header because a closed dropdown is display:none and
    // axe does not measure what it cannot see - the same colours are sitting
    // in .dropdown-head on all 50 pages.
    '.fsb-panel .fsb-head{padding:9px 22px 3px;font-family:var(--font-head);',
    '  font-size:.72rem;letter-spacing:.08em;color:var(--brown)}',
    '.fsb-panel .fsb-sep{height:1px;background:var(--beige);margin:6px 0}',

    /* ---- the search, living in the rail ---- */
    '.fsb-search .wsearch-btn{margin:0;width:100%;justify-content:flex-start;gap:6px;',
    '  padding:12px 20px;min-height:44px;border-block-end:0;',
    '  border-inline-start:3px solid transparent;color:var(--brown)}',
    '.fsb-search .wsearch-btn::after{content:"חיפוש";font-family:var(--font-body,inherit);',
    '  font-size:.94rem;font-weight:500}',
    '.fsb-search .wsearch-btn:hover,.fsb-search .wsearch-btn[aria-expanded="true"]',
    '  {background:var(--beige);color:var(--brown-dark);border-inline-start-color:var(--wash-gold)}',
    '.fsb-search .wsearch{position:absolute;inset-inline-end:100%;inset-block-start:-10px;',
    '  inset-inline-start:auto;width:min(430px,calc(100vw - var(--fsb-w) - 90px));',
    '  margin-inline-end:10px}',
    '.fsb-search .wsearch-inner{max-width:none;padding:0;justify-content:flex-start}',
    '.fsb-search .wsearch-panel{width:100%;border-radius:var(--radius-lg);',
    '  border-inline-end:3px solid var(--wash-gold)}',

    '@media (prefers-reduced-motion:reduce){.fsb-link,.fsb-caret,.fsb-panel a{transition:none}}',

    // The rail hangs off <body>, outside main/.site-header/.site-footer, so the
    // sweeping overrides in accessibility.js do not reach it and every rule it
    // needs has to be written here. Skipping this left the badge's hard-coded
    // #F3DDA7 fill under text the mode had turned white: 1.33:1.
    'html.a11y-contrast .fsb-rail,html.a11y-contrast .fsb-panel',
    '  {background:#000!important;border:1px solid #fff!important;box-shadow:none!important}',
    'html.a11y-contrast .fsb-link,html.a11y-contrast .fsb-head',
    '  {background:transparent!important;color:#fff!important}',
    'html.a11y-contrast .fsb-panel a{color:#FFE14D!important;background:transparent!important;',
    '  text-decoration:underline!important}',
    'html.a11y-contrast .fsb-badge{background:#000!important;color:#FFE14D!important;',
    '  border:1px solid #FFE14D!important}',
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

  /* ---------- put the rail beside the text, not over it ---------- */

  // The column starts at the first card. Everything before it - the breadcrumb,
  // the artwork, the h1 - is left where it is and keeps the full width, which is
  // what makes the header and those bands read as one full-width stack with the
  // two-column body beneath.
  var anchor = main.querySelector(':scope > section.card, :scope > .card');
  if (!anchor) return;

  var layout = document.createElement('div');
  layout.className = 'fsb-layout';
  var col = document.createElement('div');
  col.className = 'fsb-col';
  layout.appendChild(col);
  main.insertBefore(layout, anchor);

  // Everything from the anchor to the end of main moves into the column. The
  // nodes are moved, not cloned, so anything store.js and dynamic.js are holding
  // on to keeps working.
  var node = layout.nextSibling;
  while (node) {
    var next = node.nextSibling;
    col.appendChild(node);
    node = next;
  }
  // Second child, so in RTL it lands on the left, where the reference has it.
  layout.appendChild(wrap);

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

  // The rail no longer waits for a scroll. Above the breakpoint it simply is the
  // navigation, and the header's horizontal copy of the same menu is hidden -
  // two sets of the same seven links, one of them permanently on screen, would
  // be a redundancy rather than a convenience. Below it the rail would sit on
  // the content, so it goes away and the header menu and its hamburger return.
  var mq = window.matchMedia('(min-width:901px)');
  var on = null;

  function apply() {
    var next = mq.matches;
    if (next === on) return;
    on = next;
    wrap.classList.toggle('is-on', on);
    document.body.classList.toggle('fsb-static', on);
    if (!on) closeAll(null);
    adoptSearch(on);
  }

  mq.addEventListener('change', apply);
  apply();
})();
