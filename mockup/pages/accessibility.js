/* ===================================================================
   רכיב נגישות: תפריט התאמות תצוגה, לפי WCAG 2.1 AA / ת"י 5568.
   קובץ משותף לכל עמודי המוקאפ.

   נטען ב-<head> ובלי defer, במכוון ובניגוד ל-scroll-top.js ול-
   breadcrumb.js: ההעדפות השמורות מוחלות על <html> לפני הציור הראשון.
   עם defer המשתמש שביקש טקסט מוגדל היה רואה הבהוב של העמוד בגודל
   הרגיל לפני שההגדלה נכנסת לתוקף, בדיוק המשתמש שהכי נפגע מזה.
   בניית ה-UI עצמה נדחית ל-DOMContentLoaded, כך שהחסימה היא רק על
   הרצת הקובץ ולא על שום דבר אחר.

   ההתאמות נשמרות ב-localStorage תחת waldorf-a11y-v1 ומוחלות כמחלקות
   ומשתני CSS על <html>. הן נשענות על ה-design tokens של העמוד
   (--text, --cream, --font-body …) ולא על override לכל רכיב בנפרד.
   לכן "ניגודיות גבוהה" ו"גופן קריא" הם דריסה של עשרה משתנים, לא של
   מאות כללים.

   התפריט עצמו מסורגל ב-px ובצבעים קשיחים ולא ב-tokens, כי הוא חייב
   להישאר קריא ויציב גם כשההתאמות שהוא עצמו מפעיל משנות את ה-tokens
   ואת גודל הבסיס של <html>.
   =================================================================== */
(function () {
  'use strict';

  // הקובץ מוזרק לכל עמוד; שמירה מפני הכללה כפולה.
  if (window.__waldorfA11y) return;
  window.__waldorfA11y = true;

  var KEY = 'waldorf-a11y-v1';
  var root = document.documentElement;

  /* ---------- מצב ---------- */

  var DEFAULTS = {
    textScale: 0,    // 0..6, כל צעד +10%
    lineSpace: 0,    // 0..3
    letterSpace: 0,  // 0..3
    contrast: false,
    mono: false,
    links: false,
    titles: false,
    font: false,
    cursor: false,
    stopAnim: false,
    guide: false
  };

  // ריווח שורות ואותיות: הצעד הראשון מגיע בדיוק לערכי המינימום של
  // WCAG 1.4.12 Text Spacing (שורה 1.5, אות 0.12em, מילה 0.16em),
  // והצעדים הבאים ממשיכים מעבר להם.
  var LINE = ['', '1.8', '2.1', '2.4'];
  var LETTER = [['', ''], ['.12em', '.16em'], ['.18em', '.24em'], ['.24em', '.32em']];

  var TOGGLES = [
    { key: 'contrast', cls: 'a11y-contrast', label: 'ניגודיות גבוהה', icon: 'contrast' },
    { key: 'mono',     cls: 'a11y-mono',     label: 'גווני אפור',     icon: 'mono' },
    { key: 'links',    cls: 'a11y-links',    label: 'הדגשת קישורים',  icon: 'link' },
    { key: 'titles',   cls: 'a11y-titles',   label: 'הדגשת כותרות',   icon: 'title' },
    { key: 'font',     cls: 'a11y-font',     label: 'גופן קריא',      icon: 'font' },
    { key: 'cursor',   cls: 'a11y-cursor',   label: 'סמן גדול',       icon: 'cursor' },
    { key: 'stopAnim', cls: 'a11y-stopanim', label: 'עצירת אנימציות', icon: 'anim' },
    { key: 'guide',    cls: 'a11y-guide',    label: 'סרגל קריאה',     icon: 'guide' }
  ];

  var STEPPERS = [
    {
      key: 'textScale', label: 'גודל טקסט', max: 6,
      incLabel: 'הגדלת הטקסט', decLabel: 'הקטנת הטקסט',
      read: function (v) { return (100 + v * 10) + '%'; }
    },
    {
      key: 'lineSpace', label: 'ריווח שורות', max: 3,
      incLabel: 'הגדלת ריווח השורות', decLabel: 'הקטנת ריווח השורות',
      read: function (v) { return v ? 'רמה ' + v : 'רגיל'; }
    },
    {
      key: 'letterSpace', label: 'ריווח אותיות', max: 3,
      incLabel: 'הגדלת ריווח האותיות', decLabel: 'הקטנת ריווח האותיות',
      read: function (v) { return v ? 'רמה ' + v : 'רגיל'; }
    }
  ];

  var state = load();

  function load() {
    var s = {};
    for (var k in DEFAULTS) s[k] = DEFAULTS[k];
    try {
      var raw = window.localStorage.getItem(KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        for (var k2 in DEFAULTS) {
          if (Object.prototype.hasOwnProperty.call(parsed, k2)) s[k2] = parsed[k2];
        }
      }
    } catch (e) { /* מצב פרטי / אחסון חסום, נופלים לברירות המחדל */ }
    return s;
  }

  function save() {
    try { window.localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
  }

  /* ---------- החלת המצב על העמוד ---------- */

  function apply() {
    // גודל טקסט: שינוי font-size של <html> מזיז כל מה שמסורגל ב-rem,
    // וזה כמעט כל הטיפוגרפיה של המוקאפ.
    root.style.fontSize = state.textScale ? (100 + state.textScale * 10) + '%' : '';

    if (state.lineSpace) {
      root.setAttribute('data-a11y-line', '');
      root.style.setProperty('--a11y-line', LINE[state.lineSpace]);
    } else {
      root.removeAttribute('data-a11y-line');
      root.style.removeProperty('--a11y-line');
    }

    if (state.letterSpace) {
      root.setAttribute('data-a11y-letter', '');
      root.style.setProperty('--a11y-letter', LETTER[state.letterSpace][0]);
      root.style.setProperty('--a11y-word', LETTER[state.letterSpace][1]);
    } else {
      root.removeAttribute('data-a11y-letter');
      root.style.removeProperty('--a11y-letter');
      root.style.removeProperty('--a11y-word');
    }

    TOGGLES.forEach(function (t) {
      root.classList.toggle(t.cls, !!state[t.key]);
    });

    syncGuide();
  }

  /* ---------- סרגל קריאה ---------- */

  var guideEl = null;

  function syncGuide() {
    if (state.guide) {
      if (!guideEl && document.body) {
        guideEl = document.createElement('div');
        guideEl.className = 'a11y-guide-bar';
        guideEl.setAttribute('aria-hidden', 'true');
        document.body.appendChild(guideEl);
        document.addEventListener('pointermove', moveGuide, { passive: true });
      }
      if (guideEl) guideEl.style.display = 'block';
    } else if (guideEl) {
      guideEl.style.display = 'none';
    }
  }

  function moveGuide(e) {
    if (guideEl && state.guide) guideEl.style.transform = 'translateY(' + e.clientY + 'px)';
  }

  /* ---------- גיליון הסגנון ---------- */

  // סמן גדול כ-data URI. נבנה עם encodeURIComponent במקום ידנית, כדי
  // שהתווים < > " # לא ישברו את ערך ה-url().
  function cursorUrl(path) {
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="46" height="46" viewBox="0 0 24 24">' +
      '<path d="' + path + '" fill="#fff" stroke="#000" stroke-width="1.3" stroke-linejoin="round"/></svg>';
    return 'url("data:image/svg+xml,' + encodeURIComponent(svg) + '")';
  }
  var CURSOR_ARROW = cursorUrl('M5 2.5l13.5 8.6-6.2 1.3-2.6 6.4z') + ' 4 3, auto';
  var CURSOR_HAND = cursorUrl('M10 12V5.2a1.7 1.7 0 013.4 0V11m0-1.2a1.7 1.7 0 013.4 0V11m0-.8a1.7 1.7 0 013.4 0v4.6c0 3.4-2.4 6.2-6 6.2s-6-2.8-6-6.2V13l-2-1.6a1.6 1.6 0 012-2.4z') + ' 12 3, pointer';

  // "עמוד" = כל מה שאינו התפריט עצמו. השימוש ב-:is(main, .site-header,
  // .site-footer) הוא הדרך הקצרה להחריג את .a11y-root מכל ההתאמות.
  var PAGE = ':is(main,.site-header,.site-footer)';

  var CSS = [
    /* ===== דילוג לתוכן (WCAG 2.4.1 Bypass Blocks) ===== */
    '.skip-link{position:absolute;inset-block-start:-200px;inset-inline-start:0;z-index:10000;',
    '  background:#3D2B1F;color:#fff;padding:12px 22px;border-radius:0 0 12px 12px;font-weight:600;',
    '  text-decoration:underline;transition:inset-block-start .15s ease}',
    '.skip-link:focus{inset-block-start:0}',

    /* ===== קישור הצהרת הנגישות בתחתית העמוד ===== */
    '.site-footer .footer-a11y{color:inherit;text-decoration:underline;text-underline-offset:3px}',
    '.site-footer .footer-a11y:hover{color:var(--brown-dark)}',

    /* ===== תפריטי הניווט נפתחים גם במקלדת (WCAG 2.1.1) ===== */
    /* בלי זה .dropdown נשאר display:none ולינקים שבתוכו כלל אינם בסדר ה-Tab. */
    '.nav-item:focus-within>.dropdown{display:block}',
    '@media (max-width:720px){.nav-item:focus-within>.dropdown{max-height:680px;padding:2px 0 10px}}',

    /* ===== התאמות תצוגה ===== */
    'html[data-a11y-line] ' + PAGE + ' :is(p,li,dd,dt,td,th,blockquote,figcaption,label)',
    '  {line-height:var(--a11y-line)!important}',
    'html[data-a11y-letter] ' + PAGE + ' :is(p,li,dd,dt,td,th,blockquote,figcaption,label,a,h1,h2,h3,h4,h5,h6)',
    '  {letter-spacing:var(--a11y-letter)!important;word-spacing:var(--a11y-word)!important}',

    'html.a11y-font{--font-body:"Arial Hebrew",Arial,"Segoe UI",system-ui,sans-serif;',
    '  --font-head:"Arial Hebrew",Arial,"Segoe UI",system-ui,sans-serif}',

    'html.a11y-links ' + PAGE + ' a{text-decoration:underline!important;text-underline-offset:3px;',
    '  text-decoration-thickness:2px!important}',

    'html.a11y-titles main :is(h1,h2,h3,h4,h5,h6){outline:2px solid var(--tan-dark,#A88B69);',
    '  outline-offset:6px;border-radius:4px}',

    // filter על <html> או על <body> היה הופך אותם ל-containing block
    // ומנתק את position:fixed של הכפתורים הצפים. סינון כל ילד ישיר של
    // <body> חוץ מהתפריט משיג את אותו אפקט בלי לשבור אותם.
    'html.a11y-mono body>*:not(.a11y-root){filter:grayscale(1)}',

    'html.a11y-cursor,html.a11y-cursor *{cursor:' + CURSOR_ARROW + '!important}',
    'html.a11y-cursor :is(a,button,summary,[role="button"],input[type="submit"]),',
    'html.a11y-cursor :is(a,button,summary,[role="button"]) *{cursor:' + CURSOR_HAND + '!important}',

    'html.a11y-stopanim *,html.a11y-stopanim *::before,html.a11y-stopanim *::after',
    '  {animation-duration:.001ms!important;animation-iteration-count:1!important;',
    '   transition-duration:.001ms!important;scroll-behavior:auto!important}',

    '.a11y-guide-bar{position:fixed;inset-inline:0;inset-block-start:0;height:0;pointer-events:none;',
    '  z-index:9998;display:none;border-block-start:3px solid #3D2B1F;',
    '  box-shadow:0 0 0 1px rgba(255,255,255,.9)}',
    'html.a11y-contrast .a11y-guide-bar{border-block-start-color:#FFE14D;box-shadow:0 0 0 1px #000}',

    /* ===== ניגודיות גבוהה: דריסת ה-tokens בלבד ===== */
    'html.a11y-contrast{--cream:#000;--beige:#000;--white:#000;--text:#fff;--text-muted:#fff;',
    '  --brown:#FFE14D;--brown-dark:#fff;--tan:#FFE14D;--tan-dark:#FFE14D;',
    '  --wash-rose:#000;--wash-gold:#000;--wash-sage:#000;--wash-sky:#000;',
    '  --shadow:0 0 0 1px #fff;--shadow-lg:0 0 0 2px #fff;background:#000}',
    'html.a11y-contrast body{background:#000!important;color:#fff}',
    // הרקעים של המוקאפ הם gradients ותמונות data-URI; ביטול התמונה
    // ושקיפות הרקע מחזירים את כל הטקסט לשחור מלא מאחוריו.
    'html.a11y-contrast ' + PAGE + ',html.a11y-contrast ' + PAGE + ' *,',
    'html.a11y-contrast ' + PAGE + ' *::before,html.a11y-contrast ' + PAGE + ' *::after',
    '  {background-image:none!important;background-color:transparent!important;box-shadow:none!important}',
    'html.a11y-contrast ' + PAGE + ' :is(h1,h2,h3,h4,h5,h6,p,li,span,dt,dd,td,th,label,strong,em,figcaption)',
    '  {color:#fff!important}',
    'html.a11y-contrast ' + PAGE + ' a{color:#FFE14D!important;text-decoration:underline!important}',
    'html.a11y-contrast ' + PAGE + ' :is(.card,.ecard,section,article,.pagebanner,.dropdown)',
    '  {border:1px solid #fff!important;background-color:#000!important}',
    'html.a11y-contrast .site-header{border-image:none!important;border-block-end:2px solid #fff!important}',
    'html.a11y-contrast ' + PAGE + ' :is(input,select,textarea,button)',
    '  {background-color:#000!important;color:#fff!important;border:1px solid #fff!important}',
    'html.a11y-contrast :focus-visible{outline:3px solid #FFE14D!important;outline-offset:2px}',

    /* ===== התפריט עצמו: px וצבעים קשיחים, לא tokens ===== */
    '.a11y-root{position:fixed;inset-block-end:24px;inset-inline-start:24px;z-index:9999;direction:rtl;',
    '  font-family:"Rubik","Segoe UI","Arial Hebrew",Arial,sans-serif;font-size:15px;line-height:1.5}',
    '.a11y-root *{box-sizing:border-box}',

    // Light at rest, darker on hover, matching .scroll-top-btn in the opposite
    // corner - the two floating buttons now behave the same way round. Hex
    // rather than tokens, like the rest of this file: the widget has to stay
    // legible while the adjustments it controls are rewriting those tokens.
    // No ring and 46px, so the pair is the same object in both corners; the
    // ring was the only thing that made them look like two different controls.
    '.a11y-fab{width:46px;height:46px;border-radius:999px;border:0;background:#6B4F35;',
    '  color:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;padding:0;',
    '  box-shadow:0 10px 28px rgba(61,43,31,.34);transition:background .15s ease,transform .15s ease}',
    '.a11y-fab:hover{background:#3D2B1F;transform:translateY(-2px)}',
    '.a11y-fab:focus-visible{outline:3px solid #6B4F35;outline-offset:3px}',

    '.a11y-panel{position:absolute;inset-block-end:60px;inset-inline-start:0;width:320px;',
    '  max-height:min(74vh,540px);overflow-y:auto;background:#FAF6F0;color:#3D2B1F;',
    '  border:1px solid #E2D6C4;border-radius:18px;box-shadow:0 18px 48px rgba(61,43,31,.32);display:block}',
    '.a11y-panel[hidden]{display:none}',

    '.a11y-head{display:flex;align-items:center;justify-content:space-between;gap:8px;',
    '  padding:14px 16px 10px;border-block-end:1px solid #E2D6C4;position:sticky;inset-block-start:0;',
    '  background:#FAF6F0;border-radius:18px 18px 0 0}',
    '.a11y-title{margin:0;font-size:17px;font-weight:700;color:#3D2B1F}',
    '.a11y-close{width:34px;height:34px;flex:0 0 auto;border:0;border-radius:999px;background:#F0E8DC;',
    '  color:#3D2B1F;display:flex;align-items:center;justify-content:center;cursor:pointer;padding:0}',
    '.a11y-close:hover{background:#E2D6C4}',

    '.a11y-body{padding:12px 16px}',
    '.a11y-step{display:flex;align-items:center;justify-content:space-between;gap:10px;',
    '  padding:7px 0;border-block-end:1px solid #EDE3D4}',
    '.a11y-step-label{font-size:14.5px;font-weight:500}',
    '.a11y-step-ctl{display:flex;align-items:center;gap:6px;flex:0 0 auto}',
    '.a11y-step-btn{width:34px;height:34px;border:1px solid #C4A882;border-radius:9px;background:#fff;',
    '  color:#3D2B1F;font-size:19px;font-weight:600;line-height:1;cursor:pointer;padding:0;',
    '  display:flex;align-items:center;justify-content:center}',
    '.a11y-step-btn:hover:not(:disabled){background:#F0E8DC}',
    '.a11y-step-btn:disabled{opacity:.4;cursor:default}',
    '.a11y-step-val{min-width:58px;text-align:center;font-size:13.5px;font-weight:600;color:#6B4F35}',

    '.a11y-grid{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-block-start:12px}',
    '.a11y-toggle{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;',
    '  min-height:70px;padding:9px 6px;border:1px solid #E2D6C4;border-radius:12px;background:#fff;',
    '  color:#3D2B1F;font:inherit;font-size:12.5px;font-weight:500;text-align:center;cursor:pointer;',
    '  transition:background .12s ease,border-color .12s ease}',
    '.a11y-toggle:hover{background:#F0E8DC}',
    '.a11y-toggle[aria-pressed="true"]{background:#6B4F35;border-color:#3D2B1F;color:#fff}',
    '.a11y-toggle svg{width:22px;height:22px;flex:0 0 auto}',

    // Sticky, because with eight toggles the panel scrolls on most screens and
    // "reset" plus the statement link are exactly what a stuck user reaches for.
    '.a11y-foot{display:flex;align-items:center;justify-content:space-between;gap:10px;',
    '  padding:10px 16px 14px;border-block-start:1px solid #E2D6C4;position:sticky;',
    '  inset-block-end:0;background:#FAF6F0;border-radius:0 0 18px 18px}',
    '.a11y-reset{border:1px solid #C4A882;border-radius:9px;background:#fff;color:#3D2B1F;font:inherit;',
    '  font-size:13.5px;font-weight:500;padding:9px 14px;cursor:pointer}',
    '.a11y-reset:hover{background:#F0E8DC}',
    '.a11y-stmt{color:#6B4F35;font-size:13.5px;font-weight:500;text-decoration:underline;',
    '  text-underline-offset:3px;padding:9px 2px}',
    '.a11y-stmt:hover{color:#3D2B1F}',

    '.a11y-root :is(button,a):focus-visible{outline:3px solid #6B4F35;outline-offset:2px}',
    // .sr-only rides along: only 5 of the 43 pages defined it for themselves,
    // so a heading added to fix an outline could not rely on it existing. This
    // file is on every page, which makes it the one place the class is certain.
    '.a11y-sr,.sr-only{position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;',
    '  clip:rect(0 0 0 0);clip-path:inset(50%);white-space:nowrap;border:0}',

    // מתחת ל-560px התפריט הופך ליריעה תחתונה ברוחב מלא, והכפתורים
    // מקבלים 44px גובה מינימלי, רצפת שטח המגע של WCAG 2.5.5.
    '@media (max-width:560px){',
    '  .a11y-root{inset-block-end:max(16px,env(safe-area-inset-bottom,0px));inset-inline-start:16px}',
    '  .a11y-panel{position:fixed;inset-inline:8px;inset-block-end:74px;width:auto;max-height:72vh}',
    '  .a11y-step-btn,.a11y-close{width:44px;height:44px}',
    '  .a11y-toggle{min-height:84px}}',

    '@media (prefers-reduced-motion:reduce){.a11y-fab,.a11y-toggle,.skip-link{transition:none}}'
  ].join('');

  var styleEl = document.createElement('style');
  styleEl.id = 'a11y-styles';
  styleEl.textContent = CSS;
  document.head.appendChild(styleEl);

  // מוחל מיד, לפני הציור הראשון. זו כל הסיבה שהקובץ יושב ב-<head>.
  apply();

  /* ---------- אייקונים ---------- */

  var ICONS = {
    access: '<circle cx="12" cy="4.1" r="2.2" fill="currentColor" stroke="none"/>' +
            '<path d="M3.7 8.3c2.6 1 5.4 1.5 8.3 1.5s5.7-.5 8.3-1.5"/>' +
            '<path d="M12 9.8v4.5m0 0l-2.7 7m2.7-7l2.7 7"/>',
    contrast: '<circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 010 18z" fill="currentColor" stroke="none"/>',
    mono: '<circle cx="9.2" cy="12" r="5.8"/><circle cx="14.8" cy="12" r="5.8"/>',
    link: '<path d="M10.2 13.4a4.6 4.6 0 006.6 0l2.6-2.6a4.6 4.6 0 00-6.6-6.6l-1 1"/>' +
          '<path d="M13.8 10.6a4.6 4.6 0 00-6.6 0l-2.6 2.6a4.6 4.6 0 006.6 6.6l1-1"/>',
    title: '<path d="M6.5 4.5v15M17.5 4.5v15M6.5 12h11"/>',
    font: '<path d="M4.5 19.5l6.4-15h2.2l6.4 15M8 14.2h8"/>',
    cursor: '<path d="M5.5 3l12 7.6-5.4 1.2-2.3 5.7z"/>',
    anim: '<path d="M9.2 5v14M14.8 5v14"/>',
    guide: '<path d="M3 12h18"/><path d="M3 7.5h18M3 16.5h18" opacity=".38"/>',
    reset: '<path d="M4.2 12a7.8 7.8 0 102.4-5.6L3.4 9.5"/><path d="M3.2 4.6v5.1h5.1"/>',
    close: '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>'
  };

  function icon(name) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' +
      ICONS[name] + '</svg>';
  }

  /* ---------- בניית התפריט ---------- */

  var wrap, fab, panel, closeBtn;

  function build() {
    wrap = document.createElement('div');
    wrap.className = 'a11y-root';

    var steppers = STEPPERS.map(function (s) {
      return '<div class="a11y-step" role="group" aria-labelledby="a11y-lbl-' + s.key + '">' +
        '<span class="a11y-step-label" id="a11y-lbl-' + s.key + '">' + s.label + '</span>' +
        '<span class="a11y-step-ctl">' +
          '<button type="button" class="a11y-step-btn" data-step="' + s.key + '" data-dir="-1" ' +
            'aria-label="' + s.decLabel + '">&#8722;</button>' +
          '<span class="a11y-step-val" data-val="' + s.key + '" aria-live="polite" aria-atomic="true"></span>' +
          '<button type="button" class="a11y-step-btn" data-step="' + s.key + '" data-dir="1" ' +
            'aria-label="' + s.incLabel + '">+</button>' +
        '</span></div>';
    }).join('');

    var grid = TOGGLES.map(function (t) {
      return '<button type="button" class="a11y-toggle" data-toggle="' + t.key + '" aria-pressed="false">' +
        icon(t.icon) + '<span>' + t.label + '</span></button>';
    }).join('');

    wrap.innerHTML =
      '<button type="button" class="a11y-fab" id="a11y-fab" aria-controls="a11y-panel" ' +
        'aria-expanded="false" aria-label="תפריט נגישות">' + icon('access') + '</button>' +
      '<div class="a11y-panel" id="a11y-panel" role="dialog" aria-modal="true" ' +
        'aria-labelledby="a11y-title" hidden>' +
        '<div class="a11y-head">' +
          '<h2 class="a11y-title" id="a11y-title">התאמות נגישות</h2>' +
          '<button type="button" class="a11y-close" aria-label="סגירת תפריט הנגישות">' + icon('close') + '</button>' +
        '</div>' +
        '<div class="a11y-body">' + steppers + '<div class="a11y-grid">' + grid + '</div></div>' +
        '<div class="a11y-foot">' +
          '<button type="button" class="a11y-reset">' + icon('reset') + ' איפוס הגדרות</button>' +
          '<a class="a11y-stmt" href="./accessibility-statement.html">הצהרת נגישות</a>' +
        '</div>' +
      '</div>';

    document.body.appendChild(wrap);

    fab = wrap.querySelector('.a11y-fab');
    panel = wrap.querySelector('.a11y-panel');
    closeBtn = wrap.querySelector('.a11y-close');

    // אייקון האיפוס יושב בתוך הכפתור לצד טקסט, מרווח קטן שלא שווה כלל CSS.
    wrap.querySelector('.a11y-reset').style.cssText +=
      ';display:inline-flex;align-items:center;gap:6px';
    wrap.querySelector('.a11y-reset svg').style.cssText = 'width:16px;height:16px';

    fab.addEventListener('click', function () { panel.hidden ? open() : close(); });
    closeBtn.addEventListener('click', function () { close(true); });

    wrap.addEventListener('click', function (e) {
      var toggle = e.target.closest('.a11y-toggle');
      if (toggle) {
        var key = toggle.getAttribute('data-toggle');
        state[key] = !state[key];
        commit();
        return;
      }
      var step = e.target.closest('.a11y-step-btn');
      if (step) {
        var sKey = step.getAttribute('data-step');
        var spec = STEPPERS.filter(function (s) { return s.key === sKey; })[0];
        var next = state[sKey] + Number(step.getAttribute('data-dir'));
        state[sKey] = Math.max(0, Math.min(spec.max, next));
        commit();
        return;
      }
      if (e.target.closest('.a11y-reset')) {
        for (var k in DEFAULTS) state[k] = DEFAULTS[k];
        commit();
        announce('הגדרות הנגישות אופסו');
      }
    });

    // Esc סוגר מכל מקום בתפריט, כולל מהכפתור הצף.
    wrap.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !panel.hidden) {
        e.stopPropagation();
        close(true);
        return;
      }
      if (e.key === 'Tab' && !panel.hidden) trapTab(e);
    });

    // לחיצה מחוץ לתפריט סוגרת אותו. pointerdown ולא click, כדי שהסגירה
    // תקרה לפני שהלחיצה מפעילה משהו אחר בעמוד.
    document.addEventListener('pointerdown', function (e) {
      if (!panel.hidden && !wrap.contains(e.target)) close();
    });

    syncGuide();
    render();
  }

  function commit() {
    apply();
    save();
    render();
  }

  function render() {
    STEPPERS.forEach(function (s) {
      var v = state[s.key];
      wrap.querySelector('[data-val="' + s.key + '"]').textContent = s.read(v);
      wrap.querySelectorAll('[data-step="' + s.key + '"]').forEach(function (btn) {
        var dir = Number(btn.getAttribute('data-dir'));
        btn.disabled = dir < 0 ? v === 0 : v === s.max;
      });
    });
    TOGGLES.forEach(function (t) {
      wrap.querySelector('[data-toggle="' + t.key + '"]')
        .setAttribute('aria-pressed', state[t.key] ? 'true' : 'false');
    });
  }

  /* ---------- פתיחה, סגירה, מלכודת פוקוס ---------- */

  function focusables() {
    return Array.prototype.filter.call(
      panel.querySelectorAll('button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])'),
      function (el) { return !el.disabled && el.getClientRects().length > 0; }
    );
  }

  function trapTab(e) {
    var list = focusables();
    if (!list.length) return;
    var first = list[0];
    var last = list[list.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  function open() {
    panel.hidden = false;
    fab.setAttribute('aria-expanded', 'true');
    var list = focusables();
    if (list.length) list[0].focus();
  }

  // returnFocus רק כשהסגירה יזומה (Esc / כפתור סגירה). בסגירה מלחיצה
  // בחוץ אין להחזיר פוקוס. המשתמש כבר בחר לאן ללכת.
  function close(returnFocus) {
    if (panel.hidden) return;
    panel.hidden = true;
    fab.setAttribute('aria-expanded', 'false');
    if (returnFocus) fab.focus();
  }

  /* ---------- הכרזה לקוראי מסך ---------- */

  var liveEl = null;

  function announce(msg) {
    if (!liveEl) {
      liveEl = document.createElement('div');
      liveEl.className = 'a11y-sr';
      liveEl.setAttribute('role', 'status');
      liveEl.setAttribute('aria-live', 'polite');
      document.body.appendChild(liveEl);
    }
    liveEl.textContent = '';
    window.setTimeout(function () { liveEl.textContent = msg; }, 60);
  }

  /* ---------- טבלאות נגללות: גישה מהמקלדת ---------- */

  // A .table-wrap that overflows is a scroll container holding no focusable
  // element, so a keyboard user has no way to reach the columns past its edge
  // (WCAG 2.1.1). Giving it tabindex="0" makes the container itself focusable,
  // and the arrow keys then scroll it.
  //
  // Toggled from a measurement rather than baked into the markup, because
  // whether it overflows depends on the viewport: the kindergarten table
  // scrolls between roughly 561px and 670px, and outside that band it either
  // fits or has already restacked into cards at 560px. An unconditional
  // tabindex would put a tab stop on every table at every width, nearly always
  // on nothing scrollable.
  function tableLabel(el) {
    var caption = el.querySelector('caption');
    var section = el.closest ? el.closest('section,article') : null;
    // The card's own heading first. Falling back to the page h1 matters on a
    // single-table page like kinder-list, whose one <section class="card"> has
    // no heading inside it at all: "טבלה נגללת: רשימת גני ילדים" beats a bare
    // "טבלה נגללת", and beats it more when a page grows a second table.
    var head = (section && section.querySelector('h2,h3')) || document.querySelector('main h1');
    var name = ((caption && caption.textContent) || (head && head.textContent) || '')
      .replace(/\s+/g, ' ').trim();
    return name ? 'טבלה נגללת: ' + name : 'טבלה נגללת';
  }

  function syncScrollableTables() {
    var wraps = document.querySelectorAll('.table-wrap');
    for (var i = 0; i < wraps.length; i += 1) {
      var el = wraps[i];
      // A pixel of slack: sub-pixel layout leaves scrollWidth a hair over
      // clientWidth on tables that visibly fit, which would otherwise flicker
      // a tab stop in and out on every resize.
      var scrolls = el.scrollWidth - el.clientWidth > 1;
      if (scrolls === (el.getAttribute('tabindex') === '0')) continue;
      if (scrolls) {
        el.setAttribute('tabindex', '0');
        // Named, because a focusable region announced as nothing at all is its
        // own problem. The section heading keeps two tables on one page apart.
        el.setAttribute('role', 'region');
        el.setAttribute('aria-label', tableLabel(el));
      } else {
        el.removeAttribute('tabindex');
        el.removeAttribute('role');
        el.removeAttribute('aria-label');
      }
    }
    return wraps;
  }

  // Module scope, not a local. A ResizeObserver whose only reference is a
  // variable inside the function that created it is unreachable once that
  // function returns, and Chrome collects it: the tables stopped picking up
  // resizes a few navigations in, which looked like a flaky test rather than
  // the leak-shaped bug it is.
  var tableObserver = null;

  function watchScrollableTables() {
    var wraps = syncScrollableTables();
    if (typeof ResizeObserver !== 'function') {
      window.addEventListener('resize', syncScrollableTables);
      return;
    }
    // Observing each wrapper catches both a viewport resize and a reflow from
    // the text-size adjustments above, without a resize listener firing on
    // every page whether or not it has a table.
    tableObserver = new ResizeObserver(function () { syncScrollableTables(); });
    for (var i = 0; i < wraps.length; i += 1) tableObserver.observe(wraps[i]);
  }

  function init() {
    build();
    watchScrollableTables();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
