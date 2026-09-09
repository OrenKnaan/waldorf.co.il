/* library.js: ספריית תוכן כארכיון.
 *
 * Two jobs, one file, because they share the download code:
 *
 *   1. On an item page (<main data-lib-item>), wire the "הורדת הפריט" button.
 *   2. On the index page (<div data-lib-archive>), render the browser: filter
 *      by category, sort, search, select several items and download them as one
 *      zip.
 *
 * Injects its own CSS, like search.js and sorting.js, so no page markup carries
 * it. Deferred: nothing here has to run before first paint.
 *
 * The index half reads WStore, so it waits on WStore.ready the way the
 * renderers in dynamic.js do. The item half touches neither, so an item page
 * does not load store.js at all.
 */
(function () {
  'use strict';

  /* ---------- CSS ---------- */
  var CSS = [
    /* An item page renders nothing out of D1 and so never loads dynamic.js,
       where .dyn-chip is defined. Restate it here, scoped, so the metadata
       reads as chips on both halves rather than as a run of loose words. */
    '.lib-meta .dyn-chip,.lib-card .dyn-chip{background:var(--beige);color:var(--brown);border-radius:var(--radius-organic-sm,999px);padding:2px 11px;font-weight:500}',
    '.lib-meta .dyn-chip.cat,.lib-card .dyn-chip.cat{background:color-mix(in oklab,var(--wash-gold) 34%,var(--white));color:var(--brown-dark)}',
    /* --- item page --- */
    /* Title, source, metadata and actions read as one masthead over the text,
       centred, rather than as four left-aligned rows of unrelated things. */
    '.lib-head{max-width:72ch;margin:0 auto 6px;text-align:center}',
    '.lib-head h1{margin-bottom:6px}',
    '.lib-book{margin:0 0 12px;font-family:var(--font-head);font-size:1rem;color:var(--brown)}',
    '.lib-book cite{font-style:normal}',
    '.lib-meta{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 14px;font-size:.78rem;justify-content:center}',
    '.lib-actions{margin:0 0 22px;justify-content:center}',
    /* Reading progress. Decorative by design: it repeats what the scrollbar
       already tells assistive technology, and a live percentage announced on
       every scroll tick would be noise, so it is hidden from the a11y tree.
       The four washes are the same rail the homepage hero uses for its slides. */
    '.lib-progress{position:fixed;inset-block-start:0;inset-inline:0;height:4px;z-index:30;pointer-events:none;background:color-mix(in oklab,var(--tan) 20%,transparent)}',
    '.lib-progress .fill{display:block;height:100%;width:100%;transform:scaleX(0);transform-origin:right center;background:linear-gradient(270deg,var(--wash-rose),var(--wash-gold),var(--wash-sage),var(--wash-sky))}',
    '.lib-attach{padding-block:16px}',
    '.lib-attach h2{margin-top:0}',
    '.lib-files{list-style:none;margin:8px 0 0;padding:0;display:flex;flex-direction:column;gap:7px}',
    '.lib-files li{display:flex;align-items:center;gap:8px;font-size:.9rem}',
    '.lib-ext{font-size:.7rem;font-weight:600;color:var(--brown);background:var(--beige);border-radius:var(--radius-pill);padding:1px 9px}',
    /* The reading column. The site runs full-bleed, which suits a grid and ruins
       a 9,000-word paper: a line of Hebrew at 1400px is unreadable.
       The surface is restated here rather than inherited: the page stylesheet
       qualifies its card rule as section.card, so this <article class="card">
       was picking up no background, radius or shadow at all and the chapter sat
       straight on the page while every other block on the site sat on white.
       <article> is the right element for a self-contained document, so the
       styles come to it instead of the element changing to suit the selector. */
    '.lib-body{max-width:68ch;margin-inline:auto;padding:26px 30px;background:var(--white);border:1px solid var(--tan-dark);border-radius:var(--radius-lg);box-shadow:var(--shadow)}',
    '.lib-body h2{font-size:1.35rem;margin:26px 0 10px}',
    '.lib-body h3{font-size:1.1rem;margin:22px 0 8px;font-family:var(--font-head);color:var(--brown)}',
    '.lib-body h4,.lib-body h5,.lib-body h6{font-size:1rem;margin:18px 0 6px;font-family:var(--font-head);color:var(--brown)}',
    '.lib-body p{margin:0 0 14px}',
    '.lib-body ul,.lib-body ol{margin:0 0 14px;padding-inline-start:22px}',
    '.lib-body li{margin:0 0 6px}',
    '.lib-body img{height:auto;border-radius:var(--radius);margin:6px 0}',
    '.lib-body figure{margin:16px 0}',
    '.lib-body figcaption{font-size:.82rem;color:var(--text-muted);margin-top:5px}',
    '.lib-body blockquote{margin:16px 0;padding:10px 18px;border-inline-start:3px solid var(--tan);background:var(--beige);border-radius:var(--radius)}',
    '.lib-body table{border-collapse:collapse;width:100%;margin:14px 0;font-size:.9rem}',
    '.lib-body th,.lib-body td{border:1px solid var(--beige);padding:7px 10px;text-align:start}',
    '.lib-body sup{font-size:.7em}',
    /* --- the book's chapter rail ---
       The rail is taken out of flow so the chapter keeps the page's own centred
       measure instead of being pushed off-centre by a reserved column. The
       wrapper is absolute and full height, starting at the article's own top
       edge; the nav inside it is sticky, so the rail follows a long chapter
       down instead of scrolling away at the first screen.
       It sticks at 54px, not 16px: the breadcrumb is itself sticky at 8px,
       spans the full width and carries z-index 15, so at 16px it was painted
       over the rail's heading. The breadcrumb rests 38px tall at a fixed
       12.5px font that the accessibility text scale does not touch, so a
       constant clears it safely. */
    '.lib-with-toc{position:relative}',
    '.lib-col{max-width:68ch;margin-inline:auto;min-width:0}',
    '.lib-with-toc .lib-body{max-width:none;margin-inline:0}',
    '.lib-toc-wrap{position:absolute;inset-block:0 auto;inset-inline-start:0;width:214px;height:100%}',
    '.lib-toc{position:sticky;inset-block-start:54px;background:var(--white);border:1.5px solid var(--beige);border-radius:var(--radius-organic);box-shadow:var(--shadow);padding:14px 6px 12px 12px;max-height:calc(100vh - 72px);overflow:auto;overscroll-behavior:contain}',
    '.lib-toc-title{margin:0 0 8px;padding:0 8px;font-family:var(--font-head);font-size:.88rem;color:var(--brown-dark);border:0}',
    '.lib-toc ol{list-style:none;margin:0;padding:0;counter-reset:none}',
    '.lib-toc li{margin:0}',
    '.lib-toc a{display:flex;align-items:flex-start;gap:8px;padding:5px 8px;border-radius:var(--radius);font-size:.8rem;line-height:1.38;color:var(--text-muted);text-decoration:none}',
    '.lib-toc a:hover{background:var(--beige);color:var(--brown-dark)}',
    /* The hero's dot, at rest and current, in the palette this page uses. */
    '.lib-toc .dot{flex:none;width:9px;height:9px;margin-block-start:6px;border-radius:50%;background:var(--tan);transition:background .2s,transform .2s}',
    '.lib-toc a:hover .dot{background:var(--tan-dark)}',
    '.lib-toc a[aria-current]{color:var(--brown-dark);font-weight:600;background:color-mix(in oklab,var(--wash-gold) 20%,var(--white))}',
    '.lib-toc a[aria-current] .dot{background:var(--brown);transform:scale(1.35)}',
    '@media (prefers-reduced-motion:reduce){.lib-toc .dot{transition:none}}',
    'html.a11y-stopanim .lib-toc .dot{transition:none}',
    /* --- chapter pager ---
       Two cards, each naming where it goes. "הבא" on its own asks a reader to
       take the jump on trust; the chapter title lets them decide. */
    '.lib-pager{display:flex;flex-wrap:wrap;gap:12px;margin:18px 0 0}',
    /* Sized to their content, capped, not stretched across the row. The title
       is clamped to two lines so a long chapter name cannot widen the card. */
    '.lib-pager a{flex:0 1 auto;max-width:min(30ch,calc(50% - 6px));min-width:0;display:flex;flex-direction:column;gap:2px;padding:9px 14px;background:var(--white);border:1.5px solid var(--beige);border-radius:var(--radius-organic);box-shadow:var(--shadow);text-decoration:none;color:var(--text)}',
    '.lib-pager .t{display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;line-clamp:2;overflow:hidden}',
    '.lib-pager a:hover{color:var(--text);border-color:var(--tan);box-shadow:var(--shadow-lg)}',
    '.lib-pager .dir{display:flex;align-items:center;gap:4px;font-size:.72rem;font-weight:600;color:var(--brown)}',
    '.lib-pager .t{font-family:var(--font-head);font-size:.88rem;line-height:1.3;color:var(--brown-dark)}',
    '.lib-pager a:hover .t{color:var(--brown)}',
    /* When only one side exists the remaining card must not stretch across the
       row: a lone "next" belongs at the end, a lone "previous" at the start. */
    '.lib-pager a.next{text-align:end}',
    '.lib-pager a.next .dir{flex-direction:row-reverse}',
    '.lib-pager a.next:only-child{margin-inline-start:auto;flex-grow:0}',
    '.lib-pager a.prev:only-child{margin-inline-end:auto;flex-grow:0}',
    /* --- the book's cover, on its opening chapter ---
       162x157 is the only size that exists, so it is framed rather than
       enlarged, and the frame carries the title page's information with it. */
    '.lib-cover{display:flex;flex-wrap:wrap;align-items:center;gap:20px;margin:0 0 24px;padding:20px 22px;border-radius:var(--radius-organic);background:radial-gradient(90% 120% at 88% 0%,color-mix(in oklab,var(--wash-gold) 26%,transparent),transparent 62%),radial-gradient(80% 120% at 6% 100%,color-mix(in oklab,var(--wash-sage) 20%,transparent),transparent 60%),var(--beige)}',
    '.lib-cover .shot{flex:none;display:block;padding:7px;background:var(--white);border-radius:6px;box-shadow:var(--shadow-lg)}',
    '.lib-cover img{display:block;border-radius:2px;margin:0}',
    '.lib-cover figcaption{display:flex;flex-direction:column;gap:3px;min-width:0}',
    '.lib-cover figcaption b{font-family:var(--font-head);font-size:1.12rem;line-height:1.3;color:var(--brown-dark)}',
    '.lib-cover figcaption span{font-size:.86rem;color:var(--text-muted)}',
    /* Below this the centred column and the rail would collide, so the rail
       returns to the flow above the chapter. The threshold is measured, not
       guessed: the article is 68ch wide and centred, so the free margin either
       side is (viewport - 48 - column) / 2, and the rail needs 214 + 24 of it. */
    '@media (max-width:1220px){',
    '  .lib-toc-wrap{position:static;width:auto;height:auto}',
    '  .lib-col{max-width:68ch}',
    '  .lib-toc{position:static;max-height:none;overflow:visible;margin:0 auto 20px;max-width:68ch;padding:16px 14px}',
    '  .lib-toc ol{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:2px}',
    '}',
    /* --- index page: toolbar --- */
    '.lib-bar{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin:0 0 12px}',
    '.lib-bar input[type=search],.lib-bar select{font-family:var(--font-body);font-size:.88rem;color:var(--text);background:var(--white);border:1.5px solid var(--beige);border-radius:var(--radius-pill);padding:8px 16px;min-width:0}',
    '.lib-bar input[type=search]{flex:1;min-width:190px}',
    '.lib-bar input[type=search]:focus,.lib-bar select:focus{outline:none;border-color:var(--tan)}',
    '.lib-filters{display:flex;flex-wrap:wrap;gap:7px;margin:0 0 16px;padding:0;list-style:none}',
    '.lib-filter{font-family:var(--font-body);font-size:.82rem;font-weight:500;color:var(--brown);background:var(--white);border:1.5px solid var(--beige);border-radius:var(--radius-pill);padding:6px 15px;cursor:pointer}',
    '.lib-filter:hover{border-color:var(--tan)}',
    '.lib-filter[aria-pressed=true]{background:var(--brown);border-color:var(--brown);color:#fff}',
    // No opacity here. Fading the count to .72 to sit it behind the label put
    // --brown at 3.9:1 on the card, under the 4.5:1 AA asks of small text, and
    // it failed again as white on the pressed button. Size carries the
    // hierarchy instead; colour is inherited and stays at full strength.
    '.lib-filter .n{font-size:.92em;margin-inline-start:5px}',
    '.lib-count{font-size:.82rem;color:var(--text-muted);margin:0 0 12px}',
    /* --- index page: selection --- */
    '.lib-selbar{display:flex;flex-wrap:wrap;gap:10px;align-items:center;background:color-mix(in oklab,var(--wash-gold) 22%,var(--white));border:1.5px solid var(--tan);border-radius:var(--radius-organic);padding:10px 16px;margin:0 0 14px;font-size:.88rem}',
    // A class-level display beats the UA stylesheet's [hidden]{display:none},
    // so the empty selection bar sat on the page until this rule was added.
    '.lib-selbar[hidden]{display:none}',
    '.lib-selbar b{color:var(--brown-dark)}',
    '.lib-selbar .spacer{flex:1}',
    /* --- index page: cards --- */
    '.lib-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;align-items:stretch;padding:0;margin:0;list-style:none}',
    '.lib-card{display:flex;flex-direction:column;gap:5px;padding:13px 15px;background:var(--white);border:1.5px solid var(--beige);border-inline-start:3px solid var(--tan);border-radius:var(--radius-organic-sm,var(--radius));box-shadow:var(--shadow)}',
    '.lib-card h3{margin:0;font-family:var(--font-head);font-size:.98rem;line-height:1.35}',
    '.lib-card h3 a{color:var(--brown-dark);text-decoration:none}',
    '.lib-card h3 a:hover{color:var(--brown);text-decoration:underline}',
    '.lib-card .by{margin:0;font-size:.78rem;color:var(--brown);font-weight:500}',
    '.lib-card .desc{margin:0;font-size:.82rem;line-height:1.5;color:var(--text-muted)}',
    '.lib-card .foot{margin-top:auto;padding-top:8px;display:flex;flex-wrap:wrap;gap:6px;align-items:center;font-size:.76rem}',
    '.lib-pick{display:flex;align-items:center;gap:6px;font-size:.78rem;color:var(--text-muted);cursor:pointer}',
    '.lib-pick input{width:17px;height:17px;accent-color:var(--brown);cursor:pointer;margin:0}',
    '.lib-empty{grid-column:1/-1;background:var(--beige);border-radius:var(--radius-lg);padding:22px;text-align:center;color:var(--text-muted);font-size:.92rem}',
    /* These all sit on custom surfaces, so the ring is stated rather than left
       to whatever the UA draws over a tinted pill or a white card. */
    '.lib-toc a:focus-visible,.lib-pager a:focus-visible,.lib-filter:focus-visible,.lib-card h3 a:focus-visible,.lib-pick input:focus-visible{outline:2px solid var(--brown);outline-offset:2px}',
    '@media (max-width:1100px){.lib-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}',
    '@media (max-width:820px){.lib-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}',
    '@media (max-width:520px){.lib-grid{grid-template-columns:1fr}.lib-body{padding:18px 16px}}'
  ].join('\n');

  function injectCSS() {
    if (document.getElementById('lib-css')) return;
    var s = document.createElement('style');
    s.id = 'lib-css';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  function el(tag, attrs, kids) {
    var n = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === 'text') n.textContent = attrs[k];
      else if (k.indexOf('on') === 0) n.addEventListener(k.slice(2), attrs[k]);
      else n.setAttribute(k, attrs[k]);
    });
    (kids || []).forEach(function (c) { if (c) n.appendChild(c); });
    return n;
  }

  function escapeHTML(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /* ---------- download ---------- */

  /* A downloaded item is a standalone file: the reader keeps the text, not a
     bookmark into a site that may move. Styles are inlined for the same reason. */
  var DOC_CSS = 'body{font-family:Rubik,"Segoe UI","Arial Hebrew",Arial,sans-serif;line-height:1.75;' +
    'color:#3D2B1F;background:#FFFDF9;margin:0;padding:34px 22px}' +
    'main{max-width:68ch;margin:0 auto}h1{font-size:1.6rem;line-height:1.3;margin:0 0 8px}' +
    '.meta{font-size:.85rem;color:#6B5A49;margin:0 0 6px}' +
    '.src{font-size:.78rem;color:#6B5A49;border-top:1px solid #E9DFCE;margin-top:34px;padding-top:12px}' +
    'h2{font-size:1.3rem;margin:24px 0 10px}h3{font-size:1.08rem;margin:20px 0 8px}' +
    'img{max-width:100%;height:auto}' +
    'blockquote{margin:14px 0;padding:8px 16px;border-inline-start:3px solid #C4A882;background:#F0E8DC}' +
    'table{border-collapse:collapse;width:100%;font-size:.9rem}' +
    'th,td{border:1px solid #E9DFCE;padding:6px 9px;text-align:start}';

  function standalone(title, metaLine, bodyHTML, sourceUrl) {
    return '<!doctype html>\n<html lang="he" dir="rtl">\n<head>\n<meta charset="UTF-8">\n' +
      '<meta name="viewport" content="width=device-width, initial-scale=1">\n' +
      '<title>' + escapeHTML(title) + '</title>\n<style>' + DOC_CSS + '</style>\n</head>\n<body>\n<main>\n' +
      '<h1>' + escapeHTML(title) + '</h1>\n' +
      (metaLine ? '<p class="meta">' + escapeHTML(metaLine) + '</p>\n' : '') +
      bodyHTML + '\n' +
      '<p class="src">מתוך ספריית התוכן של הפורום הארצי לחינוך ולדורף' +
      (sourceUrl ? ' (' + escapeHTML(sourceUrl) + ')' : '') + '</p>\n' +
      '</main>\n</body>\n</html>\n';
  }

  /* Hebrew titles make poor filenames on some systems, but transliterating them
     makes them unrecognisable. Keep the Hebrew, strip only what a filesystem
     genuinely refuses. */
  function fileName(title, ext) {
    var t = String(title || 'item').replace(/[\/\\:*?"<>|]/g, ' ')
      .replace(/\s+/g, ' ').trim().slice(0, 80);
    return (t || 'item') + '.' + ext;
  }

  function saveBlob(name, blob) {
    var url = URL.createObjectURL(blob);
    var a = el('a', { href: url, download: name });
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
  }

  /* ---------- zip (stored, no compression) ----------
     A dependency-free writer, because the alternative is vendoring ~100 KB to
     avoid ~60 lines. No deflate: these are small HTML files, and "stored" is a
     first-class zip method that every extractor handles. */
  var CRC_TABLE = (function () {
    var t = new Uint32Array(256);
    for (var n = 0; n < 256; n += 1) {
      var c = n;
      for (var k = 0; k < 8; k += 1) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      t[n] = c >>> 0;
    }
    return t;
  })();
  function crc32(bytes) {
    var c = 0xFFFFFFFF;
    for (var i = 0; i < bytes.length; i += 1) c = CRC_TABLE[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
  }
  function u16(v) { return [v & 0xFF, (v >>> 8) & 0xFF]; }
  function u32(v) { return [v & 0xFF, (v >>> 8) & 0xFF, (v >>> 16) & 0xFF, (v >>> 24) & 0xFF]; }

  function makeZip(entries) {
    var enc = new TextEncoder();
    var parts = [];
    var central = [];
    var offset = 0;
    // Bit 11 marks the name as UTF-8. Without it a Hebrew filename arrives as
    // mojibake in every extractor that assumes CP437.
    var FLAG = 0x0800;
    entries.forEach(function (e) {
      var name = enc.encode(e.name);
      var body = enc.encode(e.text);
      var crc = crc32(body);
      var local = [].concat(
        u32(0x04034b50), u16(20), u16(FLAG), u16(0), u16(0), u16(0),
        u32(crc), u32(body.length), u32(body.length), u16(name.length), u16(0)
      );
      parts.push(new Uint8Array(local), name, body);
      central.push({ name: name, crc: crc, size: body.length, offset: offset });
      offset += local.length + name.length + body.length;
    });
    var dirStart = offset;
    var dirSize = 0;
    central.forEach(function (c) {
      var head = [].concat(
        u32(0x02014b50), u16(20), u16(20), u16(FLAG), u16(0), u16(0), u16(0),
        u32(c.crc), u32(c.size), u32(c.size), u16(c.name.length),
        u16(0), u16(0), u16(0), u16(0), u32(0), u32(c.offset)
      );
      parts.push(new Uint8Array(head), c.name);
      dirSize += head.length + c.name.length;
    });
    parts.push(new Uint8Array([].concat(
      u32(0x06054b50), u16(0), u16(0), u16(central.length), u16(central.length),
      u32(dirSize), u32(dirStart), u16(0)
    )));
    return new Blob(parts, { type: 'application/zip' });
  }

  /* ---------- item page ---------- */

  function metaLine() {
    return Array.prototype.map.call(document.querySelectorAll('.lib-meta .dyn-chip'), function (c) {
      return c.textContent.trim();
    }).filter(Boolean).join(' · ');
  }

  /* Reading progress across the document. rAF-throttled rather than CSS
     scroll-timeline: that would be the tidier answer, but Safari does not
     support it yet and a progress rail that works in two browsers out of three
     is worse than sixteen lines of JavaScript. */
  function initProgress() {
    var bar = el('div', { class: 'lib-progress', 'aria-hidden': 'true' });
    var fill = el('span', { class: 'fill' });
    bar.appendChild(fill);
    document.body.appendChild(bar);

    var ticking = false;
    function measure() {
      ticking = false;
      var doc = document.documentElement;
      var scrollable = doc.scrollHeight - window.innerHeight;
      // A chapter shorter than the viewport has nothing to progress through.
      var ratio = scrollable > 0 ? Math.min(1, Math.max(0, window.scrollY / scrollable)) : 0;
      fill.style.transform = 'scaleX(' + ratio + ')';
    }
    function onScroll() {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(measure);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    measure();
  }

  function initItemPage() {
    initProgress();
    var btn = document.querySelector('[data-lib-download]');
    if (!btn) return;
    btn.addEventListener('click', function () {
      var h1 = document.querySelector('main h1');
      var body = document.querySelector('.lib-body');
      if (!body) return;
      var title = h1 ? h1.textContent.trim() : document.title;
      saveBlob(fileName(title, 'html'), new Blob(
        [standalone(title, metaLine(), body.innerHTML, location.href)],
        { type: 'text/html;charset=utf-8' }
      ));
    });
  }

  /* ---------- index page ---------- */

  /* Fetches an item page and lifts the article out of it. Those pages are the
     only copy of the text on this side, so a bulk download reads exactly what a
     visitor reads rather than a second export that can drift from it. */
  function fetchItem(rec) {
    var href = rec.url || '';
    return fetch(href).then(function (r) {
      if (!r.ok) throw new Error(String(r.status));
      return r.text();
    }).then(function (html) {
      var doc = new DOMParser().parseFromString(html, 'text/html');
      var body = doc.querySelector('.lib-body');
      if (!body) throw new Error('no body');
      return {
        name: fileName(rec.title, 'html'),
        text: standalone(
          rec.title,
          [rec.kind, rec.author, rec.date].filter(Boolean).join(' · '),
          body.innerHTML,
          new URL(href, location.href).href
        )
      };
    });
  }

  /* Six at a time: quick enough over a hundred items, and never asks a slow
     connection for a hundred parallel requests. */
  function fetchAll(recs, onProgress) {
    var out = [];
    var failed = [];
    var i = 0;
    function next() {
      if (i >= recs.length) return Promise.resolve();
      var rec = recs[i];
      i += 1;
      return fetchItem(rec).then(
        function (f) { out.push(f); },
        function () { failed.push(rec.title); }
      ).then(function () {
        onProgress(out.length + failed.length, recs.length);
        return next();
      });
    }
    var lanes = [];
    for (var k = 0; k < Math.min(6, recs.length); k += 1) lanes.push(next());
    return Promise.all(lanes).then(function () { return { files: out, failed: failed }; });
  }

  var FILTERS = [
    { key: 'all', label: 'הכל', match: function () { return true; } },
    { key: 'ma', label: 'עבודות לתואר שני', match: function (r) { return r.kind === 'עבודה לתואר שני'; } },
    { key: 'sem', label: 'עבודות סמינריוניות', match: function (r) { return r.kind === 'עבודה סמינריונית'; } },
    { key: 'tch', label: 'עבודות של מורי ולדורף', match: function (r) { return r.kind === 'עבודה של מורי ולדורף'; } },
    { key: 'unc', label: 'עבודות ללא סיווג', match: function (r) { return r.kind === 'עבודה'; } },
    { key: 'art', label: 'מאמרים', match: function (r) { return r.kind === 'מאמר'; } }
  ];

  // Hebrew folding, same rules search.js uses: drop niqqud and abbreviation
  // marks, and fold final letters, so "גנים" is found by typing "גן".
  function norm(s) {
    return String(s || '').toLowerCase()
      .replace(/[֑-ׇ]/g, '')
      .replace(/["'׳״]/g, '')
      .replace(/ך/g, 'כ').replace(/ם/g, 'מ').replace(/ן/g, 'נ')
      .replace(/ף/g, 'פ').replace(/ץ/g, 'צ');
  }

  function initArchive(mount) {
    var scope = mount.getAttribute('data-lib-archive');   // 'works' | 'book'
    var all = window.WStore.get('library').filter(function (r) {
      return scope === 'book' ? r.kind === 'ספר' : r.kind !== 'ספר';
    });

    var state = { filter: 'all', q: '', sort: 'new', picking: false, picked: {} };

    var grid = el('ul', { class: 'lib-grid' });
    var count = el('p', { class: 'lib-count', 'aria-live': 'polite' });
    var selbar = el('div', { class: 'lib-selbar', hidden: 'hidden' });

    mount.textContent = '';

    if (scope !== 'book') {
      var filters = el('ul', { class: 'lib-filters' });
      FILTERS.forEach(function (f) {
        var n = all.filter(f.match).length;
        if (!n && f.key !== 'all') return;
        var b = el('button', {
          type: 'button', class: 'lib-filter', 'aria-pressed': String(f.key === 'all'),
          onclick: function () { state.filter = f.key; syncFilters(); draw(); }
        }, [
          el('span', { text: f.label }),
          el('span', { class: 'n', text: '(' + n + ')' })
        ]);
        b.setAttribute('data-key', f.key);
        filters.appendChild(el('li', {}, [b]));
      });
      mount.appendChild(filters);

      mount.appendChild(el('div', { class: 'lib-bar' }, [
        el('input', {
          type: 'search', placeholder: 'חיפוש לפי כותרת, מחבר/ת או תיאור…',
          'aria-label': 'חיפוש בארכיון',
          oninput: function (e) { state.q = norm(e.target.value.trim()); draw(); }
        }),
        el('label', { class: 'sr-only', for: 'lib-sort', text: 'סדר הצגה' }),
        el('select', {
          id: 'lib-sort',
          onchange: function (e) { state.sort = e.target.value; draw(); }
        }, [
          el('option', { value: 'new', text: 'מהחדש לישן' }),
          el('option', { value: 'old', text: 'מהישן לחדש' }),
          el('option', { value: 'az', text: 'לפי א״ב' })
        ]),
        el('button', {
          type: 'button', class: 'lib-filter', 'aria-pressed': 'false',
          onclick: function () {
            state.picking = !state.picking;
            this.setAttribute('aria-pressed', String(state.picking));
            if (!state.picking) state.picked = {};
            draw();
          },
          text: 'בחירה להורדה'
        })
      ]));
      mount.appendChild(selbar);
    }

    mount.appendChild(count);
    mount.appendChild(grid);

    function syncFilters() {
      Array.prototype.forEach.call(mount.querySelectorAll('.lib-filter[data-key]'), function (b) {
        b.setAttribute('aria-pressed', String(b.getAttribute('data-key') === state.filter));
      });
    }

    function visible() {
      var f = FILTERS.filter(function (x) { return x.key === state.filter; })[0] || FILTERS[0];
      var rows = all.filter(f.match);
      if (state.q) {
        rows = rows.filter(function (r) {
          return norm([r.title, r.author, r.description, r.kind, r.date].join(' ')).indexOf(state.q) !== -1;
        });
      }
      if (scope === 'book') return rows;
      return rows.slice().sort(function (a, b) {
        if (state.sort === 'az') return String(a.title).localeCompare(String(b.title), 'he');
        var av = a.date || '';
        var bv = b.date || '';
        var d = av < bv ? -1 : (av > bv ? 1 : 0);
        return state.sort === 'old' ? d : -d;
      });
    }

    function card(rec) {
      var by = [rec.author, rec.date].filter(Boolean).join(' · ');
      var pick = null;
      if (state.picking) {
        var cb = el('input', {
          type: 'checkbox',
          'aria-label': 'בחירת "' + rec.title + '" להורדה',
          onchange: function (e) {
            if (e.target.checked) state.picked[rec.id] = rec; else delete state.picked[rec.id];
            syncSel();
          }
        });
        cb.checked = !!state.picked[rec.id];
        pick = el('label', { class: 'lib-pick' }, [cb, el('span', { text: 'בחירה' })]);
      }
      return el('li', { class: 'lib-card' }, [
        el('h3', {}, [rec.url
          ? el('a', { href: rec.url, text: rec.title })
          : el('span', { text: rec.title })]),
        by ? el('p', { class: 'by', text: by }) : null,
        rec.description ? el('p', { class: 'desc', text: rec.description }) : null,
        el('div', { class: 'foot' }, [
          (scope !== 'book' && rec.kind) ? el('span', { class: 'dyn-chip cat', text: rec.kind }) : null,
          pick
        ])
      ]);
    }

    var busy = false;
    function syncSel() {
      var picked = Object.keys(state.picked);
      if (!state.picking || !picked.length) {
        selbar.hidden = true;
        selbar.textContent = '';
        return;
      }
      selbar.hidden = false;
      selbar.textContent = '';
      var status = el('span', { 'aria-live': 'polite' }, [
        el('b', { text: String(picked.length) }),
        document.createTextNode(picked.length === 1 ? ' פריט נבחר' : ' פריטים נבחרו')
      ]);
      selbar.appendChild(status);
      selbar.appendChild(el('span', { class: 'spacer' }));
      selbar.appendChild(el('button', {
        type: 'button', class: 'btn btn-primary btn-sm',
        onclick: function () {
          if (busy) return;
          busy = true;
          var self = this;
          var recs = Object.keys(state.picked).map(function (k) { return state.picked[k]; });
          self.disabled = true;
          self.textContent = 'מוריד…';
          fetchAll(recs, function (done, total) {
            self.textContent = 'מוריד… ' + done + '/' + total;
          }).then(function (res) {
            if (res.files.length) saveBlob('waldorf-library.zip', makeZip(res.files));
            self.disabled = false;
            self.textContent = 'הורדת הנבחרים';
            busy = false;
            if (res.failed.length) {
              status.textContent = res.failed.length + ' פריטים לא נטענו ולא נכללו בקובץ';
            }
          });
        },
        text: 'הורדת הנבחרים'
      }));
      selbar.appendChild(el('button', {
        type: 'button', class: 'btn btn-ghost btn-sm',
        onclick: function () { state.picked = {}; draw(); },
        text: 'ניקוי הבחירה'
      }));
    }

    function draw() {
      var rows = visible();
      grid.textContent = '';
      if (!rows.length) {
        grid.appendChild(el('li', { class: 'lib-empty', text: 'לא נמצאו פריטים מתאימים.' }));
      } else {
        rows.forEach(function (r) { grid.appendChild(card(r)); });
      }
      count.textContent = rows.length === all.length
        ? String(all.length) + ' פריטים'
        : String(rows.length) + ' מתוך ' + all.length + ' פריטים';
      syncSel();
    }

    draw();
  }

  /* ---------- boot ---------- */
  injectCSS();

  if (document.querySelector('main[data-lib-item]')) {
    initItemPage();
    return;
  }

  var mounts = document.querySelectorAll('[data-lib-archive]');
  if (!mounts.length || !window.WStore) return;
  window.WStore.ready.then(function () {
    Array.prototype.forEach.call(mounts, initArchive);
  });
})();
