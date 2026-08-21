/* כפתור חזרה לראש העמוד. קובץ משותף לכל עמודי המוקאפ — נטען בסוף ה-body. */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // 44x44 is the tap-target floor. This block is injected after the page
  // stylesheet, so it owns the button's sizing and offsets outright — don't
  // try to override them from the shared responsive layer.
  var style = document.createElement('style');
  style.textContent = [
    '.scroll-top-btn{position:fixed;inset-block-end:24px;inset-inline-end:24px;width:46px;height:46px;',
    '  border-radius:var(--radius-pill,999px);border:0;background:var(--brown,#6B4F35);color:var(--white,#fff);',
    '  display:flex;align-items:center;justify-content:center;cursor:pointer;padding:0;',
    '  box-shadow:var(--shadow-lg,0 12px 34px rgba(0,0,0,.2));',
    '  opacity:0;visibility:hidden;transform:translateY(10px);',
    '  transition:opacity .2s ease,transform .2s ease,visibility .2s ease,background .15s ease;z-index:30}',
    '.scroll-top-btn.is-visible{opacity:1;visibility:visible;transform:translateY(0)}',
    '.scroll-top-btn:hover,.scroll-top-btn:focus-visible{background:var(--brown-dark,#3D2B1F)}',
    '@media (max-width:560px){.scroll-top-btn{inset-block-end:max(16px,env(safe-area-inset-bottom,0px));',
    '  inset-inline-end:16px;width:44px;height:44px}}',
    '@media (prefers-reduced-motion:reduce){.scroll-top-btn{transition:none}}'
  ].join('');
  document.head.appendChild(style);

  var btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'scroll-top-btn';
  btn.setAttribute('aria-label', 'חזרה לראש העמוד');
  btn.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M12 5l-7 7h4v7h6v-7h4z"/></svg>';
  document.body.appendChild(btn);

  function scrollThreshold() {
    var scrollable = document.documentElement.scrollHeight - window.innerHeight;
    return Math.max(500, scrollable * 0.3);
  }

  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      ticking = false;
      btn.classList.toggle('is-visible', window.pageYOffset > scrollThreshold());
    });
  }

  function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  function scrollToTop() {
    var start = window.pageYOffset;
    if (reduceMotion || start === 0) {
      window.scrollTo(0, 0);
      return;
    }
    var duration = 2000;
    var startTime = null;
    function step(ts) {
      if (startTime === null) startTime = ts;
      var progress = Math.min((ts - startTime) / duration, 1);
      window.scrollTo(0, Math.round(start * (1 - easeInOutCubic(progress))));
      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  btn.addEventListener('click', scrollToTop);
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  onScroll();
})();
