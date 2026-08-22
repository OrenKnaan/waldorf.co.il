/* חיפוש גלובלי לכל עמודי המוקאפ.
   כפתור זכוכית מגדלת בשורת הכותרת פותח שדה חיפוש, וההצעות מתעדכנות תוך כדי הקלדה.

   The engine is MiniSearch (MIT), vendored beside this file as
   minisearch.min.js; the corpus is search-index.json, built by
   mockup/search-index.mjs. Both are fetched lazily, on the first time the
   panel is opened, so a visitor who never searches pays nothing for the
   feature. Without JavaScript the button is never inserted at all, which is
   the honest outcome: the search is entirely client-side, so a button that
   rendered server-side here would simply be dead.

   Hebrew needs two things the default tokenizer does not do, both handled in
   tokenize()/processTerm() below: abbreviation marks have to be folded away
   rather than treated as word breaks (תשפ"ז is one word, not two), and final
   letters have to be folded to their medial forms, or "גן" would never prefix-
   match "גנים".

   Styled with the site's design tokens on purpose, unlike the accessibility
   panel: this is ordinary site chrome, so it should follow the palette, and
   under html.a11y-contrast it picks up the redefined tokens for free. */
(function () {
  'use strict';

  var script = document.currentScript;
  var header = document.querySelector('.site-header');
  // The menu row, which the button becomes the last item of.
  var nav = header && header.querySelector('.primary-nav');
  if (!script || !header || !nav) return;

  // Resolve against this script rather than the document: it keeps working if
  // a page is ever served from a path other than the one holding the assets.
  var base = script.src;
  var LIB_URL = new URL('./minisearch.min.js', base).href;
  var INDEX_URL = new URL('./search-index.json', base).href;

  var MIN_QUERY = 2;
  var MAX_RESULTS = 8;
  var DEBOUNCE_MS = 120;
  var SNIPPET_BEFORE = 55;
  var SNIPPET_LENGTH = 170;

  /* ---------- Hebrew-aware tokenising ---------- */

  // Geresh/gershayim and the ASCII quotes that stand in for them. Stripped
  // before the split, so תשפ"ז and א׳ stay single tokens.
  var MARKS = /['"`׳״‘’“”]/g;
  // Unicode separators and punctuation, i.e. MiniSearch's own default split.
  var BREAKS = /[\n\r\p{Z}\p{P}]+/u;
  var FINAL_TO_MEDIAL = {
    'ך': 'כ', // ך > כ
    'ם': 'מ', // ם > מ
    'ן': 'נ', // ן > נ
    'ף': 'פ', // ף > פ
    'ץ': 'צ', // ץ > צ
  };
  var FINALS = /[ךםןףץ]/g;

  function tokenize(text) {
    return String(text).replace(MARKS, '').split(BREAKS).filter(Boolean);
  }

  // Runs over both the indexed text and the query, so the two always agree.
  function processTerm(term) {
    var t = term
      .toLowerCase()
      .normalize('NFKD')
      // Combining marks: niqqud and te'amim in Hebrew, accents in Latin.
      // A visitor typing unpointed text should still find pointed text.
      .replace(/\p{M}/gu, '')
      .replace(MARKS, '')
      .replace(FINALS, function (c) { return FINAL_TO_MEDIAL[c]; });
    return t || null;
  }

  /* ---------- styles ---------- */

  var style = document.createElement('style');
  style.textContent = [
    // A flex item at the end of .primary-nav, so it sits on the menu row and
    // inside the same 960px column as the links. margin-inline-start:auto is
    // what pushes it past them to the inline-end.
    //
    // Borrows the nav links' own idiom rather than inventing one: transparent
    // 3px bottom border that turns gold on hover, so it reads as the last item
    // of the menu instead of a control parked next to it.
    '.wsearch-btn{margin-inline-start:auto;flex:none;width:44px;min-height:44px;',
    '  display:flex;align-items:center;justify-content:center;padding:0;',
    '  border:0;border-block-end:3px solid transparent;background:transparent;',
    '  color:var(--brown,#6B4F35);cursor:pointer;',
    '  transition:color .2s,border-color .2s}',
    '.wsearch-btn:hover,.wsearch-btn[aria-expanded="true"]',
    '  {color:var(--brown-dark,#3D2B1F);border-block-end-color:var(--wash-gold,#E8C877)}',

    // Drops out of the header, clearing its 3px gradient border, and sits above
    // the nav dropdowns (z-index 20) without leaving the header's own context.
    '.wsearch{position:absolute;inset-block-start:calc(100% + 3px);inset-inline:0;z-index:60;display:none}',
    '.wsearch.is-open{display:block}',
    '.wsearch-inner{max-width:960px;margin:0 auto;padding:0 16px;display:flex;justify-content:flex-end}',
    '.wsearch-panel{width:min(560px,100%);background:var(--white,#fff);',
    '  border-radius:0 0 var(--radius-lg,18px) var(--radius-lg,18px);',
    '  box-shadow:var(--shadow-lg,0 12px 34px rgba(0,0,0,.2));overflow:hidden;',
    '  font-size:.95rem;line-height:1.6}',

    '.wsearch-form{display:flex;align-items:center;gap:8px;padding:10px 14px;',
    '  border-block-end:1px solid var(--beige,#EFE6D8)}',
    // --tan-dark reads at 3.2:1 on white, under the 3:1 floor for a meaningful
    // graphic once antialiasing is allowed for, and under AA wherever it is
    // used as small text (see .wsearch-hit-where). --text-muted throughout.
    '.wsearch-form .wsearch-glass{color:var(--text-muted,#7A6555);flex:none}',
    '.wsearch-input{flex:1;min-width:0;border:0;background:transparent;padding:8px 2px;',
    '  font:inherit;font-family:var(--font-body,inherit);color:var(--text,#3D2B1F)}',
    '.wsearch-input::placeholder{color:var(--text-muted,#6F6257);opacity:1}',
    '.wsearch-input:focus{outline:none}',
    '.wsearch-form:focus-within{box-shadow:inset 0 0 0 2px var(--brown,#6B4F35)}',
    '.wsearch-close{flex:none;width:34px;height:34px;display:flex;align-items:center;',
    '  justify-content:center;padding:0;border:0;border-radius:var(--radius-pill,999px);',
    '  background:transparent;color:var(--text-muted,#6F6257);cursor:pointer}',
    '.wsearch-close:hover{background:var(--beige,#EFE6D8);color:var(--brown-dark,#3D2B1F)}',

    '.wsearch-list{padding:6px 0;max-height:min(62vh,430px);',
    '  overflow-y:auto;overscroll-behavior:contain}',
    '.wsearch-hit{display:block;padding:9px 16px;text-decoration:none;color:inherit;cursor:pointer}',
    '.wsearch-hit:hover,.wsearch-hit.is-active{background:var(--beige,#EFE6D8)}',
    '.wsearch-hit-title{display:block;font-family:var(--font-head,inherit);font-weight:700;',
    '  color:var(--brown-dark,#3D2B1F);font-size:.98rem}',
    '.wsearch-hit-where{display:block;font-size:.75rem;color:var(--text-muted,#7A6555);margin-block-start:1px}',
    '.wsearch-hit-snip{display:block;font-size:.84rem;color:var(--text-muted,#6F6257);margin-block-start:3px}',
    // Not color:inherit. The snippet is --text-muted (#7A6555), and over the
    // gold highlight that lands at 3.5:1 against #ddcdb2, under AA for 13px
    // text; the title escaped only because it is already --brown-dark. Setting
    // the dark token here fixes the snippet and makes a highlight read as
    // emphasis rather than as a wash over faint text.
    '.wsearch-hit mark{background:color-mix(in oklab,var(--wash-gold,#E8C877) 55%,transparent);',
    '  color:var(--brown-dark,#3D2B1F);border-radius:3px;padding:0 1px}',
    '.wsearch-demo{display:inline-block;margin-inline-start:6px;vertical-align:1px;font-family:var(--font-body,inherit);',
    '  font-size:.68rem;font-weight:500;padding:1px 8px;border-radius:var(--radius-pill,999px);',
    '  background:#F3DDA7;color:var(--brown-dark,#3D2B1F)}',
    '.wsearch-note{margin:0;padding:14px 16px;font-size:.86rem;color:var(--text-muted,#6F6257)}',
    '.wsearch-note b{color:var(--brown-dark,#3D2B1F);font-weight:600}',

    '@media (max-width:720px){',
    // Below this width .primary-nav collapses to a max-height:0 drawer, so an
    // item sitting in it is unreachable until the hamburger is tapped. Lift the
    // button out to the header's own bar, in the corner the hamburger does not
    // occupy. Its containing block is .site-header (position:relative), not the
    // drawer, so the drawer's overflow does not clip it.
    '  .wsearch-btn{position:absolute;inset-block-start:14px;inset-inline-end:10px;z-index:30;',
    '    height:44px;border-block-end:0;border-radius:var(--radius,8px)}',
    '  .wsearch-btn:hover,.wsearch-btn[aria-expanded="true"]',
    '    {border-block-end-color:transparent;',
    '     background:color-mix(in oklab,var(--tan,#C4A882) 22%,transparent)}',
    // Keep the brand text clear of it; the hamburger already owns the far side.
    '  .brand-row{padding-inline-end:60px}',
    '  .wsearch-inner{padding:0 8px}',
    '  .wsearch-panel{width:100%}',
    '}',
    '@media (prefers-reduced-motion:reduce){.wsearch-btn{transition:none}}',

    // High contrast blanks every background inside .site-header, which would
    // leave the panel transparent over the page. Put its own back, at a higher
    // specificity than the token override that removed it.
    'html.a11y-contrast .wsearch .wsearch-panel,',
    'html.a11y-contrast .wsearch .wsearch-panel .wsearch-list',
    '  {background-color:#000!important;border:1px solid #fff!important}',
    'html.a11y-contrast .wsearch .wsearch-hit.is-active,',
    'html.a11y-contrast .wsearch .wsearch-hit:hover{outline:2px solid #FFE14D!important}',
    'html.a11y-contrast .wsearch .wsearch-hit mark{background:#FFE14D!important;color:#000!important}',
    'html.a11y-contrast .wsearch-btn{color:#FFE14D!important}',
  ].join('');
  document.head.appendChild(style);

  /* ---------- markup ---------- */

  function svg(paths, extra) {
    var s = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" ' +
      'stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"' +
      (extra ? ' class="' + extra + '"' : '') + '>' + paths + '</svg>';
    return s;
  }
  var GLASS = '<circle cx="11" cy="11" r="6.6"/><path d="M16.1 16.1L21 21"/>';
  var CROSS = '<path d="M6 6l12 12M18 6L6 18"/>';

  var btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'wsearch-btn';
  btn.setAttribute('aria-label', 'חיפוש באתר');
  btn.setAttribute('aria-expanded', 'false');
  btn.setAttribute('aria-controls', 'wsearch-panel');
  btn.innerHTML = svg(GLASS);

  var wrap = document.createElement('div');
  wrap.className = 'wsearch';
  wrap.innerHTML =
    '<div class="wsearch-inner"><div class="wsearch-panel" id="wsearch-panel">' +
    '<form class="wsearch-form" role="search">' +
    svg(GLASS, 'wsearch-glass') +
    '<input class="wsearch-input" id="wsearch-input" type="search" autocomplete="off" ' +
    'autocapitalize="off" spellcheck="false" placeholder="חיפוש בתוכן האתר…" ' +
    'aria-label="חיפוש בתוכן האתר" role="combobox" aria-expanded="false" ' +
    'aria-autocomplete="list" aria-controls="wsearch-list">' +
    '<button type="button" class="wsearch-close" aria-label="סגירת החיפוש">' + svg(CROSS) + '</button>' +
    '</form>' +
    '<div class="wsearch-list" id="wsearch-list" role="listbox" aria-label="תוצאות חיפוש" hidden></div>' +
    '<p class="wsearch-note" role="status" aria-live="polite"></p>' +
    '</div></div>';

  nav.appendChild(btn);
  header.appendChild(wrap);

  var form = wrap.querySelector('.wsearch-form');
  var input = wrap.querySelector('.wsearch-input');
  var closeBtn = wrap.querySelector('.wsearch-close');
  var list = wrap.querySelector('.wsearch-list');
  var note = wrap.querySelector('.wsearch-note');

  /* ---------- lazy engine ---------- */

  var loading = null;
  var mini = null;
  var byId = null;

  function load() {
    if (loading) return loading;
    loading = Promise.all([
      import(LIB_URL),
      fetch(INDEX_URL).then(function (r) {
        if (!r.ok) throw new Error('search-index.json: HTTP ' + r.status);
        return r.json();
      }),
    ]).then(function (parts) {
      var MiniSearch = parts[0].default || parts[0].MiniSearch;
      var docs = parts[1].docs || [];

      byId = {};
      docs.forEach(function (d) { byId[d.id] = d; });

      mini = new MiniSearch({
        idField: 'id',
        fields: ['title', 'heading', 'page', 'crumbs', 'text'],
        tokenize: tokenize,
        processTerm: processTerm,
        searchOptions: {
          // A hit in a heading is worth far more than one buried in a
          // paragraph, and the section heading is what the result line shows.
          boost: { title: 5, heading: 3, page: 2, crumbs: 1.5 },
          prefix: true,
          // Typo tolerance only once a word is long enough to be sure what was
          // meant. On a 3-letter Hebrew root one edit reaches half the lexicon.
          fuzzy: function (term) { return term.length >= 5 ? 1 : false; },
          // Below MiniSearch's defaults, so a word the visitor actually typed
          // outranks one merely reachable by prefix or by a repair.
          weights: { fuzzy: 0.15, prefix: 0.5 },
          combineWith: 'AND',
        },
      });
      mini.addAll(docs);
      return true;
    }).catch(function (err) {
      loading = null; // let a later attempt retry rather than fail forever
      throw err;
    });
    return loading;
  }

  /* ---------- rendering ---------- */

  // Matches the query terms in either spelling of a Hebrew letter that has a
  // final form, so highlighting survives the fold that made the match.
  var MEDIAL_TO_FINAL = { 'כ': 'ך', 'מ': 'ם', 'נ': 'ן', 'פ': 'ף', 'צ': 'ץ' };

  function termPattern(term) {
    var out = '';
    for (var i = 0; i < term.length; i += 1) {
      var ch = term[i];
      var pair = FINAL_TO_MEDIAL[ch] || MEDIAL_TO_FINAL[ch];
      out += pair ? '[' + ch + pair + ']' : ch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
    return out;
  }

  function buildMatcher(terms) {
    var parts = terms.filter(Boolean).map(termPattern);
    if (!parts.length) return null;
    return new RegExp('(' + parts.join('|') + ')', 'gi');
  }

  // Appends text to `parent`, wrapping matches in <mark>. Built as nodes rather
  // than innerHTML so the query, which is visitor input, is never parsed as
  // markup.
  function appendMarked(parent, text, matcher) {
    if (!matcher) { parent.appendChild(document.createTextNode(text)); return; }
    matcher.lastIndex = 0;
    var last = 0;
    var m;
    while ((m = matcher.exec(text)) !== null) {
      if (m.index > last) parent.appendChild(document.createTextNode(text.slice(last, m.index)));
      var mark = document.createElement('mark');
      mark.textContent = m[0];
      parent.appendChild(mark);
      last = m.index + m[0].length;
      if (m[0].length === 0) matcher.lastIndex += 1; // guard against an empty match looping
    }
    if (last < text.length) parent.appendChild(document.createTextNode(text.slice(last)));
  }

  // A window of the section text around its first match, so the result shows
  // the sentence the query hit rather than the opening of the page.
  function snippet(text, matcher) {
    if (!text) return '';
    var at = 0;
    if (matcher) {
      matcher.lastIndex = 0;
      var m = matcher.exec(text);
      if (m) at = m.index;
    }
    var start = Math.max(0, at - SNIPPET_BEFORE);
    // Do not cut a word in half at the start of the window.
    if (start > 0) {
      var space = text.indexOf(' ', start);
      if (space !== -1 && space - start < 15) start = space + 1;
    }
    var slice = text.slice(start, start + SNIPPET_LENGTH);
    return (start > 0 ? '…' : '') + slice.trim() + (start + SNIPPET_LENGTH < text.length ? '…' : '');
  }

  var hits = [];
  var active = -1;

  function setActive(i) {
    if (hits[active]) {
      hits[active].classList.remove('is-active');
      hits[active].setAttribute('aria-selected', 'false');
    }
    active = i;
    var el = hits[active];
    if (!el) { input.removeAttribute('aria-activedescendant'); return; }
    el.classList.add('is-active');
    el.setAttribute('aria-selected', 'true');
    input.setAttribute('aria-activedescendant', el.id);
    // block:'nearest' keeps the panel from jumping when the item is already
    // visible, which it usually is.
    el.scrollIntoView({ block: 'nearest' });
  }

  function clearResults() {
    list.textContent = '';
    list.hidden = true;
    hits = [];
    active = -1;
    input.setAttribute('aria-expanded', 'false');
    input.removeAttribute('aria-activedescendant');
  }

  function render(results, terms) {
    clearResults();
    var matcher = buildMatcher(terms);

    results.forEach(function (r) {
      var doc = byId[r.id];
      if (!doc) return;
      // Position in `hits`, not in `results`: a result whose document went
      // missing is skipped, and the two would drift apart from there on.
      var i = hits.length;

      // A real <a> so the result behaves like a link (middle-click, copy
      // address, status bar), carrying role="option" so assistive tech hears
      // the listbox it is part of. tabindex -1 keeps it out of the tab order:
      // in this pattern the input keeps focus and points at the active option
      // through aria-activedescendant.
      var a = document.createElement('a');
      a.className = 'wsearch-hit';
      a.id = 'wsearch-opt-' + i;
      a.href = doc.url;
      a.tabIndex = -1;
      a.setAttribute('role', 'option');
      a.setAttribute('aria-selected', 'false');

      var title = document.createElement('span');
      title.className = 'wsearch-hit-title';
      appendMarked(title, doc.title, matcher);
      if (doc.demo) {
        var chip = document.createElement('span');
        chip.className = 'wsearch-demo';
        chip.textContent = 'רשומת הדגמה';
        title.appendChild(chip);
      }
      a.appendChild(title);

      // Where the hit lives: the breadcrumb trail, plus the page name when the
      // hit is a section rather than the page itself.
      var whereBits = [];
      if (doc.heading && doc.page && doc.page !== doc.title) whereBits.push(doc.page);
      if (doc.crumbs) whereBits.push(doc.crumbs);
      if (whereBits.length) {
        var where = document.createElement('span');
        where.className = 'wsearch-hit-where';
        where.textContent = whereBits.join(' · ');
        a.appendChild(where);
      }

      var text = snippet(doc.text, matcher);
      if (text) {
        var snip = document.createElement('span');
        snip.className = 'wsearch-hit-snip';
        appendMarked(snip, text, matcher);
        a.appendChild(snip);
      }

      a.addEventListener('mouseenter', function () { setActive(i); });
      list.appendChild(a);
      hits.push(a);
    });

    if (!hits.length) return;
    list.hidden = false;
    input.setAttribute('aria-expanded', 'true');
    setActive(0);
  }

  function say(html) {
    note.textContent = '';
    if (!html) { note.hidden = true; return; }
    note.hidden = false;
    note.appendChild(html.nodeType ? html : document.createTextNode(html));
  }

  function sayNoResults(query) {
    var frag = document.createDocumentFragment();
    frag.appendChild(document.createTextNode('לא נמצאו תוצאות עבור '));
    var b = document.createElement('b');
    b.textContent = query;
    frag.appendChild(b);
    frag.appendChild(document.createTextNode('. נסו ניסוח אחר או מילה בודדת.'));
    say(frag);
  }

  /* ---------- querying ---------- */

  var seq = 0;

  function run(raw) {
    var query = raw.trim();
    if (query.length < MIN_QUERY) {
      clearResults();
      say('הקלידו לפחות ' + MIN_QUERY + ' תווים כדי לחפש בתוכן האתר.');
      return;
    }

    var mine = ++seq;
    load().then(function () {
      if (mine !== seq) return; // a newer keystroke already took over

      var results = mini.search(query);
      // AND is right while a phrase is being typed, but it also means one
      // stray word empties the list. Fall back to OR before giving up.
      if (!results.length) results = mini.search(query, { combineWith: 'OR' });

      var terms = tokenize(query);
      render(results.slice(0, MAX_RESULTS), terms);

      if (!hits.length) sayNoResults(query);
      else say(hits.length === 1 ? 'תוצאה אחת' : 'נמצאו ' + hits.length + ' תוצאות'
        + (results.length > MAX_RESULTS ? ' (מוצגות הראשונות)' : ''));
    }).catch(function (err) {
      if (mine !== seq) return;
      clearResults();
      say('לא ניתן לטעון את מפתח החיפוש כרגע. נסו לרענן את העמוד.');
      if (window.console) console.error('[wsearch]', err);
    });
  }

  var timer = null;
  input.addEventListener('input', function () {
    var value = input.value;
    clearTimeout(timer);
    timer = setTimeout(function () { run(value); }, DEBOUNCE_MS);
  });

  /* ---------- open / close ---------- */

  var isOpen = false;

  function open() {
    if (isOpen) return;
    isOpen = true;
    wrap.classList.add('is-open');
    btn.setAttribute('aria-expanded', 'true');
    input.focus();
    input.select();
    // Reopening keeps whatever was typed before, so put its results back
    // rather than showing the empty prompt over a filled field. run() warms
    // the engine on its own; when there is nothing to re-run, warm it here so
    // the fetch is under way before the first keystroke.
    if (input.value.trim().length >= MIN_QUERY) run(input.value);
    else {
      say('הקלידו לפחות ' + MIN_QUERY + ' תווים כדי לחפש בתוכן האתר.');
      load().catch(function () { /* reported when a query is actually run */ });
    }
  }

  function close(returnFocus) {
    if (!isOpen) return;
    isOpen = false;
    wrap.classList.remove('is-open');
    btn.setAttribute('aria-expanded', 'false');
    clearTimeout(timer);
    seq += 1; // discard any search still in flight
    clearResults();
    if (returnFocus) btn.focus();
  }

  // Safari does not move focus to a <button> on mousedown, so the panel's own
  // focusout fires before this click handler runs. Without the flag, the blur
  // would close the panel and the click would immediately reopen it.
  var togglePending = false;
  btn.addEventListener('pointerdown', function () { togglePending = true; });
  document.addEventListener('pointerup', function () { togglePending = false; });
  btn.addEventListener('click', function () {
    togglePending = false;
    if (isOpen) close(true); else open();
  });
  // Both the button and the panel are inside the header, so hovering the
  // button is a reliable "about to search" signal; start fetching then.
  btn.addEventListener('pointerenter', function () {
    load().catch(function () {});
  }, { once: true });

  closeBtn.addEventListener('click', function () { close(true); });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var target = hits[active] || hits[0];
    if (target) target.click();
  });

  input.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { e.preventDefault(); close(true); return; }
    if (!hits.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((active + 1) % hits.length); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((active - 1 + hits.length) % hits.length); }
    else if (e.key === 'Home') { e.preventDefault(); setActive(0); }
    else if (e.key === 'End') { e.preventDefault(); setActive(hits.length - 1); }
  });

  // Tabbing past the last control in the panel means the visitor has moved on.
  wrap.addEventListener('focusout', function (e) {
    if (!isOpen || togglePending) return;
    if (e.relatedTarget && (wrap.contains(e.relatedTarget) || e.relatedTarget === btn)) return;
    close(false);
  });

  document.addEventListener('pointerdown', function (e) {
    if (!isOpen) return;
    if (wrap.contains(e.target) || btn.contains(e.target)) return;
    close(false);
  });

  document.addEventListener('keydown', function (e) {
    if (isOpen && e.key === 'Escape') close(true);
  });
})();
