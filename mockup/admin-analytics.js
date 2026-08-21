/* ניתוח תנועה — לוח הסטטיסטיקה של מערכת הניהול.
 *
 * הנתונים מגיעים מ-Cloudflare Web Analytics דרך ה-Worker שב-analytics-worker/.
 * הדפדפן אינו יכול לפנות ל-Cloudflare ישירות (חסימת CORS ואסור לחשוף מפתח API),
 * ולכן כל הפניות עוברות דרך ה-Worker.
 *
 * הערה על סוגי הנתונים: ל-Cloudflare Web Analytics אין "אירועים מותאמים אישית".
 * כל מה שנאסף הוא צפייה בדף (pageview) + מדדי מהירות (Core Web Vitals) שנמדדים
 * אוטומטית אצל הגולש. אין מעקב אחרי לחיצות על כפתורים — זו מגבלה של הכלי, לא באג.
 */
(function () {
  'use strict';

  var CFG_KEY = 'waldorf-analytics-cfg-v1';
  var TIP_KEY = 'waldorf-analytics-tips-v1';

  /* ---------- שמות דפים בעברית במקום כתובות ---------- */
  var PAGE_NAMES = {
      "community-board.html": "לוח קהילתי",
      "contact.html": "צור קשר",
      "content-library.html": "ספריית תוכן",
      "curriculum-capstone.html": "פרויקט גמר ומסע בוגרים",
      "curriculum-crafts.html": "אמנויות יישומיות",
      "curriculum-drama.html": "תיאטרון והצגות כיתה",
      "curriculum-eurythmy.html": "אאוריתמיה",
      "curriculum-form-drawing.html": "ציור טופסי ורישום",
      "curriculum-gardening.html": "גינון וחקלאות",
      "curriculum-geography.html": "גיאוגרפיה",
      "curriculum-handwork.html": "עבודת יד ומלאכה",
      "curriculum-hebrew.html": "שפה עברית",
      "curriculum-history.html": "היסטוריה",
      "curriculum-languages.html": "שפות זרות",
      "curriculum-literature.html": "ספרות ומקורות",
      "curriculum-math.html": "מתמטיקה",
      "curriculum-music.html": "מוזיקה",
      "curriculum-painting.html": "ציור בצבעי מים",
      "curriculum-pe.html": "חינוך גופני",
      "curriculum-science.html": "מדעי הטבע",
      "curriculum-woodwork.html": "נגרות ועבודות עץ",
      "curriculum.html": "תוכניות לימודים",
      "events.html": "אירועים",
      "forum-newsletter.html": "איגרת תקופתית",
      "forum-roles.html": "נציגי הפורום",
      "forum-workgroups.html": "קבוצות עבודה",
      "forum.html": "הפורום",
      "home.html": "דף הבית",
      "index.html": "הפורום הארצי לחינוך ולדורף",
      "job-board.html": "לוח משרות",
      "kinder-articles.html": "מאמרים וחומרי קריאה",
      "kinder-circle.html": "מעגל הגנים הארצי",
      "kinder-list.html": "רשימת גני ילדים",
      "kinder.html": "גני ילדים",
      "links.html": "קישורים לאתרים אחרים",
      "media.html": "מדיה",
      "news.html": "הודעות",
      "school-list.html": "רשימת בתי ספר",
      "school.html": "בית הספר",
      "teacher-training.html": "הכשרת מורים",
      "waldorf-characteristics.html": "אפיונים מרכזיים",
      "waldorf-foundations.html": "יסודות חינוך וולדורף"
  };

  function prettyPage(path) {
    if (!path) return 'לא ידוע';
    var file = String(path).split('?')[0].split('#')[0].replace(/\/+$/, '');
    file = file.slice(file.lastIndexOf('/') + 1) || 'index.html';
    if (PAGE_NAMES[file]) return PAGE_NAMES[file];
    if (file === '' || file === 'index.html') return 'דף הבית';
    return file.replace(/\.html?$/, '');
  }

  /* ---------- עזרי DOM ---------- */
  function el(tag, attrs, kids) {
    var n = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === 'text') n.textContent = attrs[k];
      else if (k === 'html') n.innerHTML = attrs[k];
      else if (attrs[k] != null) n.setAttribute(k, attrs[k]);
    });
    (kids || []).forEach(function (c) { if (c) n.appendChild(c); });
    return n;
  }
  var fmt = function (n) { return Number(n || 0).toLocaleString('he-IL'); };

  /* ---------- הסברים (טולטיפים) ---------- */
  var tipsOn = localStorage.getItem(TIP_KEY) !== 'off';
  var tipSeq = 0;

  /** כפתור "?" עם הסבר. נפתח בלחיצה, במעבר עכבר ובמיקוד מקלדת. */
  function tip(text) {
    var id = 'tip-' + (++tipSeq);
    var bubble = el('span', { class: 'an-tip-bubble', id: id, role: 'tooltip', text: text });
    var btn = el('button', {
      type: 'button', class: 'an-tip', 'aria-label': 'הסבר', 'aria-describedby': id,
      'aria-expanded': 'false', text: '?'
    });
    var wrap = el('span', { class: 'an-tip-wrap' }, [btn, bubble]);
    function show(v) {
      wrap.classList.toggle('open', v);
      btn.setAttribute('aria-expanded', v ? 'true' : 'false');
    }
    btn.addEventListener('click', function (e) { e.stopPropagation(); show(!wrap.classList.contains('open')); });
    btn.addEventListener('mouseenter', function () { show(true); });
    wrap.addEventListener('mouseleave', function () { show(false); });
    btn.addEventListener('focus', function () { show(true); });
    btn.addEventListener('blur', function () { show(false); });
    btn.addEventListener('keydown', function (e) { if (e.key === 'Escape') { show(false); btn.blur(); } });
    return wrap;
  }

  function applyTipVisibility(root) {
    root.classList.toggle('tips-off', !tipsOn);
  }

  /* ---------- רכיבים ---------- */
  function kpi(label, value, help, sub) {
    return el('div', { class: 'an-kpi' }, [
      el('div', { class: 'an-kpi-top' }, [el('span', { class: 'an-kpi-lbl', text: label }), tip(help)]),
      el('div', { class: 'an-kpi-num tnum', text: value }),
      sub ? el('div', { class: 'an-kpi-sub', text: sub }) : null
    ]);
  }

  function panel(title, help, body, note) {
    return el('section', { class: 'panel an-panel' }, [
      el('div', { class: 'panel-head' }, [
        el('h2', { text: title }), tip(help), el('span', { class: 'grow' })
      ]),
      note ? el('p', { class: 'an-note', text: note }) : null,
      body
    ]);
  }

  /** טבלת "שם / מספר" עם פס יחסי — קריאה מהירה בלי להבין אחוזים. */
  function barList(items, nameFn, emptyText) {
    if (!items || !items.length) return el('p', { class: 'an-empty', text: emptyText || 'אין נתונים בטווח הזה עדיין.' });
    var max = Math.max.apply(null, items.map(function (i) { return i.views; })) || 1;
    return el('ul', { class: 'an-bars' }, items.map(function (i) {
      return el('li', {}, [
        el('span', { class: 'an-bar-name', title: i.name || '', text: nameFn ? nameFn(i.name) : (i.name || 'לא ידוע') }),
        el('span', { class: 'an-bar-track' }, [
          el('span', { class: 'an-bar-fill', style: 'width:' + Math.max(2, (i.views / max) * 100) + '%' })
        ]),
        el('span', { class: 'an-bar-num tnum', text: fmt(i.views) })
      ]);
    }));
  }

  /** גרף עמודות יומי — SVG פשוט, בלי ספריות חיצוניות. */
  function dayChart(rows) {
    if (!rows || !rows.length) return el('p', { class: 'an-empty', text: 'אין עדיין נתונים להצגה.' });
    var w = 720, h = 190, padB = 26, padR = 8, padL = 8;
    var max = Math.max.apply(null, rows.map(function (r) { return r.views; })) || 1;
    var bw = (w - padL - padR) / rows.length;
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
    svg.setAttribute('class', 'an-chart');
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label',
      'גרף צפיות יומיות. ' + rows.map(function (r) { return r.date + ': ' + r.views; }).join(', '));
    rows.forEach(function (r, i) {
      var bh = Math.max(1, ((h - padB) * r.views) / max);
      // RTL: היום העדכני ביותר בצד שמאל, כמו בלוח שנה עברי שנקרא מימין לשמאל
      var x = w - padR - (i + 1) * bw + bw * 0.18;
      var g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      var rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', x); rect.setAttribute('y', h - padB - bh);
      rect.setAttribute('width', bw * 0.64); rect.setAttribute('height', bh);
      rect.setAttribute('rx', 3); rect.setAttribute('class', 'an-chart-bar');
      var t = document.createElementNS('http://www.w3.org/2000/svg', 'title');
      t.textContent = r.date + ' — ' + r.views + ' צפיות, ' + r.visits + ' ביקורים';
      g.appendChild(rect); g.appendChild(t);
      if (rows.length <= 14 || i % Math.ceil(rows.length / 10) === 0) {
        var lab = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        lab.setAttribute('x', x + bw * 0.32); lab.setAttribute('y', h - 8);
        lab.setAttribute('class', 'an-chart-lbl'); lab.setAttribute('text-anchor', 'middle');
        lab.textContent = r.date.slice(8) + '.' + r.date.slice(5, 7);
        g.appendChild(lab);
      }
      svg.appendChild(g);
    });
    return svg;
  }

  /* ---------- מדדי מהירות ---------- */
  // ספי Google לחוויית משתמש. מוצגים כמילים, לא כמספרים גולמיים.
  var VITALS = [
    { key: 'lcp', name: 'זמן טעינת התוכן הראשי', unit: 'ms', good: 2500, poor: 4000,
      help: 'כמה זמן לוקח עד שהחלק המרכזי של הדף מופיע על המסך. מתחת ל-2.5 שניות נחשב טוב.' },
    { key: 'inp', name: 'מהירות התגובה ללחיצה', unit: 'ms', good: 200, poor: 500,
      help: 'כמה זמן עובר מרגע שגולש לוחץ ועד שהאתר מגיב. מתחת ל-0.2 שניות נחשב טוב.' },
    { key: 'cls', name: 'יציבות העמוד', unit: '', good: 0.1, poor: 0.25,
      help: 'עד כמה תוכן "קופץ" ומזיז את מה שקוראים בזמן הטעינה. ככל שהמספר נמוך יותר — יציב יותר.' }
  ];
  function vitalTone(v, d) { return v == null ? 'neutral' : v <= d.good ? 'ok' : v <= d.poor ? 'warn' : 'crit'; }
  function vitalWord(t) { return { ok: 'טוב', warn: 'סביר', crit: 'דורש שיפור', neutral: 'אין מספיק נתונים' }[t]; }
  function vitalValue(v, d) {
    if (v == null) return '—';
    return d.unit === 'ms' ? (v / 1000).toFixed(2) + ' שנ׳' : Number(v).toFixed(3);
  }

  /* ---------- טעינת נתונים ---------- */
  function cfg() {
    try { return JSON.parse(localStorage.getItem(CFG_KEY)) || {}; } catch (e) { return {}; }
  }
  function saveCfg(c) { localStorage.setItem(CFG_KEY, JSON.stringify(c)); }

  function load(days) {
    var c = cfg();
    if (!c.workerUrl) return Promise.reject({ kind: 'unconfigured' });
    var u = c.workerUrl.replace(/\/+$/, '') + '/api/analytics?days=' + days;
    return fetch(u, { headers: c.dashKey ? { 'x-dash-key': c.dashKey } : {} })
      .then(function (r) {
        return r.json().then(function (j) {
          if (!r.ok) throw { kind: 'api', status: r.status, body: j };
          return j;
        });
      })
      .catch(function (e) {
        if (e && e.kind) throw e;
        throw { kind: 'network', detail: String(e) };
      });
  }

  /* ---------- מסך ההגדרה הראשוני ---------- */
  function setupScreen(mount, onDone) {
    var c = cfg();
    var url = el('input', { type: 'url', placeholder: 'https://waldorf-analytics.<שם>.workers.dev', value: c.workerUrl || '' });
    var key = el('input', { type: 'password', placeholder: 'מפתח גישה (אם הוגדר)', value: c.dashKey || '' });
    var msg = el('p', { class: 'an-empty' });
    var save = el('button', { class: 'btn btn-primary', type: 'button', text: 'שמירה ובדיקת חיבור' });
    save.addEventListener('click', function () {
      saveCfg({ workerUrl: url.value.trim(), dashKey: key.value.trim() });
      msg.textContent = 'בודק חיבור…';
      load(7).then(onDone).catch(function (e) {
        msg.textContent = 'לא הצלחנו להתחבר: ' + describeError(e);
      });
    });
    mount.appendChild(panel('חיבור למערכת המדידה',
      'כתובת ה-Worker שמביא את נתוני הגלישה מ-Cloudflare. מגדירים פעם אחת והמערכת זוכרת.',
      el('div', { class: 'an-setup' }, [
        el('label', {}, [el('span', { text: 'כתובת ה-Worker' }), url]),
        el('label', {}, [el('span', { text: 'מפתח גישה' }), key]),
        save, msg
      ])));
  }

  function describeError(e) {
    if (!e) return 'שגיאה לא ידועה.';
    if (e.kind === 'unconfigured') return 'החיבור עדיין לא הוגדר.';
    if (e.kind === 'network') return 'אין תקשורת עם ה-Worker. בדקו את הכתובת.';
    if (e.kind === 'api') {
      var b = e.body || {};
      if (b.error === 'unauthorized') return 'מפתח הגישה שגוי.';
      if (b.error === 'site_tag_missing') return 'לא הוגדר עדיין אתר ב-Cloudflare Web Analytics.';
      if (b.error === 'graphql_error') return 'Cloudflare החזיר שגיאה: ' + [].concat(b.detail || []).join('; ');
      return 'שגיאה ' + e.status + ' (' + (b.error || 'לא ידוע') + ').';
    }
    return String(e.detail || e);
  }

  /* ---------- ציור המסך ---------- */
  function render(mount, data, days, reload) {
    mount.textContent = '';

    var perVisit = data.totals.visits ? (data.totals.views / data.totals.visits) : 0;
    var countries = (data.countries || []).filter(function (c) { return c.name; });

    // סרגל כלים
    var rangeSel = el('select', { class: 'an-range', 'aria-label': 'טווח זמן' });
    [[1, 'היממה האחרונה'], [7, '7 הימים האחרונים'], [30, '30 הימים האחרונים'], [90, '90 הימים האחרונים']]
      .forEach(function (o) {
        var op = el('option', { value: o[0], text: o[1] });
        if (o[0] === days) op.setAttribute('selected', 'selected');
        rangeSel.appendChild(op);
      });
    rangeSel.addEventListener('change', function () { reload(Number(rangeSel.value)); });

    var tipBtn = el('button', {
      type: 'button', class: 'btn btn-ghost btn-sm an-tips-toggle',
      'aria-pressed': tipsOn ? 'true' : 'false',
      text: tipsOn ? 'הסברים: מוצגים' : 'הסברים: מוסתרים'
    });
    tipBtn.addEventListener('click', function () {
      tipsOn = !tipsOn;
      localStorage.setItem(TIP_KEY, tipsOn ? 'on' : 'off');
      tipBtn.textContent = tipsOn ? 'הסברים: מוצגים' : 'הסברים: מוסתרים';
      tipBtn.setAttribute('aria-pressed', tipsOn ? 'true' : 'false');
      applyTipVisibility(mount);
    });

    var refresh = el('button', { type: 'button', class: 'btn btn-ghost btn-sm', text: 'רענון' });
    refresh.addEventListener('click', function () { reload(days); });

    mount.appendChild(el('div', { class: 'an-toolbar' }, [
      rangeSel, el('span', { class: 'grow' }), tipBtn, refresh
    ]));

    mount.appendChild(el('p', { class: 'an-updated', text:
      'הנתונים מ-' + data.range.from + ' עד ' + data.range.to +
      ' · עודכן ב-' + new Date(data.generatedAt).toLocaleString('he-IL') }));

    // מדדים ראשיים
    mount.appendChild(el('div', { class: 'an-kpis' }, [
      kpi('ביקורים', fmt(data.totals.visits),
        'כל כניסה לאתר נספרת כביקור אחד, גם אם הגולש קרא כמה דפים. זה המספר שמשקף "כמה אנשים הגיעו".'),
      kpi('צפיות בדפים', fmt(data.totals.views),
        'סך כל הדפים שנפתחו. גולש אחד שקרא ארבעה דפים מוסיף ארבע צפיות אבל ביקור אחד בלבד.'),
      kpi('דפים לביקור', perVisit ? perVisit.toFixed(1) : '—',
        'כמה דפים בממוצע קורא כל מבקר. מספר גבוה מרמז שהגולשים מתעניינים וממשיכים לגלוש.'),
      kpi('מדינות', fmt(countries.length),
        'מכמה מדינות שונות הגיעו גולשים בטווח הזמן שנבחר.')
    ]));

    // גרף יומי
    mount.appendChild(panel('תנועה לאורך זמן',
      'כל עמודה היא יום. גובה העמודה = מספר הצפיות באותו יום. מעבר עכבר על עמודה מציג את המספר המדויק.',
      el('div', { class: 'an-chart-wrap' }, [dayChart(data.byDate)])));

    // דפים
    mount.appendChild(panel('הדפים הנצפים ביותר',
      'אילו דפים באתר נפתחו הכי הרבה פעמים. עוזר להבין מה מעניין את הקהל ומה פחות.',
      barList(data.topPages, prettyPage)));

    // מקורות
    var refs = (data.referrers || []).map(function (r) {
      return { name: r.name || '(כניסה ישירה)', views: r.views };
    });
    mount.appendChild(panel('מאיפה הגיעו הגולשים',
      'האתר שממנו הגיע הגולש. "כניסה ישירה" = הקלידו את הכתובת, הגיעו ממועדפים או מקישור בוואטסאפ/מייל.',
      barList(refs)));

    mount.appendChild(el('div', { class: 'two-col' }, [
      panel('מדינות', 'מאיפה בעולם גולשים באתר.', barList(countries)),
      panel('סוג מכשיר', 'מחשב שולחני, טלפון נייד או טאבלט. חשוב כדי לדעת עבור איזה מסך לתכנן.',
        barList(data.devices, function (n) {
          return { desktop: 'מחשב', mobile: 'טלפון נייד', tablet: 'טאבלט' }[n] || n || 'לא ידוע';
        }))
    ]));

    mount.appendChild(el('div', { class: 'two-col' }, [
      panel('דפדפנים', 'התוכנה שבה הגולשים פותחים את האתר (כרום, ספארי וכדומה).', barList(data.browsers)),
      panel('מערכות הפעלה', 'מערכת ההפעלה של המכשיר (Windows, iOS, אנדרואיד וכדומה).', barList(data.systems))
    ]));

    // מהירות
    var v = data.vitals || {};
    var vitalsBody = v.samples
      ? el('div', { class: 'an-vitals' }, VITALS.map(function (d) {
          var val = v[d.key], tone = vitalTone(val, d);
          return el('div', { class: 'an-vital' }, [
            el('div', { class: 'an-kpi-top' }, [el('span', { class: 'an-kpi-lbl', text: d.name }), tip(d.help)]),
            el('div', { class: 'an-vital-val tnum', text: vitalValue(val, d) }),
            el('span', { class: 'pill ' + tone, text: vitalWord(tone) })
          ]);
        }))
      : el('p', { class: 'an-empty', text: 'עדיין לא נאספו מספיק מדידות מהירות. הן מצטברות ככל שגולשים נכנסים.' });

    mount.appendChild(panel('מהירות וחוויית גלישה',
      'נמדד אצל הגולשים עצמם, לא במעבדה. אלה שלושת המדדים שגוגל משתמש בהם גם לדירוג בתוצאות החיפוש.',
      vitalsBody,
      v.samples ? 'מבוסס על ' + fmt(v.samples) + ' מדידות. הערך המוצג הוא זה שחוו 75% מהגולשים או טוב ממנו.' : null));

    // הבהרה על מה שהכלי לא מודד
    mount.appendChild(panel('מה לא נמדד כאן',
      'שקיפות לגבי גבולות הכלי, כדי שלא תחפשו נתון שאינו קיים.',
      el('ul', { class: 'an-limits' }, [
        el('li', { text: 'לחיצות על כפתורים וקישורים — Cloudflare Web Analytics מודד פתיחת דפים בלבד.' }),
        el('li', { text: 'זהות הגולשים — לא נאספים שמות, כתובות IP או עוגיות. אי אפשר לדעת מי ביקר.' }),
        el('li', { text: 'גולשים עם חוסם פרסומות — חלקם לא נספרים, כמו בכל מערכת מדידה מבוססת דפדפן.' }),
        el('li', { text: 'הנתונים מתעדכנים בהשהיה קצרה — ביקור שקרה ממש עכשיו עשוי להופיע רק בעוד כמה דקות.' })
      ])));

    applyTipVisibility(mount);
  }

  /* ---------- נקודת כניסה ---------- */
  function renderAnalytics() {
    var mount = document.getElementById('analyticsAdmin');
    if (!mount) return;

    function go(days) {
      mount.textContent = '';
      mount.appendChild(el('p', { class: 'an-empty', text: 'טוען נתונים…' }));
      load(days).then(function (data) {
        render(mount, data, days, go);
      }).catch(function (e) {
        mount.textContent = '';
        if (e.kind === 'unconfigured') { setupScreen(mount, function () { go(7); }); return; }
        mount.appendChild(panel('לא ניתן להציג נתונים כרגע', 'מה השתבש והיכן לתקן.',
          el('div', {}, [
            el('p', { class: 'an-empty', text: describeError(e) }),
            (function () {
              var b = el('button', { class: 'btn btn-ghost btn-sm', type: 'button', text: 'שינוי הגדרות החיבור' });
              b.addEventListener('click', function () { mount.textContent = ''; setupScreen(mount, function () { go(7); }); });
              return b;
            })()
          ])));
      });
    }
    go(7);
  }

  window.WAnalytics = { render: renderAnalytics };
  document.addEventListener('DOMContentLoaded', function () {
    var btn = document.querySelector('.nav-link[data-view="analytics"]');
    if (btn) btn.addEventListener('click', renderAnalytics);
  });
})();
