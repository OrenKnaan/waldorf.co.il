/* Cross-fading photo slideshow for the art-hero band on the category-variant
   demo pages (cat2-*.html). A small, simpler cousin of hero.js on home.html:
   opacity cross-fade instead of a translated push, no dots and no progress
   rail, because this hero is a decorative band, not the page's main image.

   The pause control is not optional, though. The slideshow auto-advances for
   longer than five seconds, so WCAG 2.2.2 requires a way to stop it, and that
   requirement does not shrink because the element is smaller. */
(function () {
  'use strict';

  document.querySelectorAll('[data-art-slideshow]').forEach(function (root) {
    var slides = [].slice.call(root.querySelectorAll('.ah-slide'));
    if (slides.length < 2) return;

    var playBtn = root.querySelector('.ah-play');
    var DWELL = 5200;
    var FADE = 1000;

    var index = 0;
    var paused = false;
    var cycleStart = 0;
    var switched = false;
    var lastFrame = 0;

    var mqMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    function motionOff() {
      return mqMotion.matches || document.documentElement.classList.contains('a11y-stopanim');
    }
    function running() {
      return !paused && !motionOff() && !document.hidden;
    }
    function restart() {
      cycleStart = window.performance.now();
      switched = false;
    }
    function advance() {
      var next = (index + 1) % slides.length;
      slides[index].classList.remove('is-active');
      slides[next].classList.add('is-active');
      index = next;
    }
    function frame(now) {
      var gap = lastFrame ? now - lastFrame : 0;
      lastFrame = now;
      if (gap > 500 || !running()) cycleStart += gap;

      var elapsed = now - cycleStart;
      if (!switched && elapsed >= DWELL) { switched = true; advance(); }
      if (elapsed >= DWELL + FADE) { cycleStart = now; switched = false; }

      window.requestAnimationFrame(frame);
    }
    function setPaused(next) {
      paused = next;
      root.classList.toggle('is-paused', paused);
      if (playBtn) {
        playBtn.setAttribute('aria-pressed', paused ? 'true' : 'false');
        playBtn.setAttribute('aria-label', paused ? 'הפעלת מצגת התמונות' : 'עצירת מצגת התמונות');
      }
      if (!paused) restart();
    }

    if (playBtn) playBtn.addEventListener('click', function () { setPaused(!paused); });
    mqMotion.addEventListener('change', function () { if (!motionOff()) restart(); });
    new MutationObserver(function () { if (!motionOff()) restart(); })
      .observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    setPaused(motionOff());
    window.requestAnimationFrame(frame);
  });
})();
