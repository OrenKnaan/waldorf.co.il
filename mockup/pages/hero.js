/* מצגת תמונות ברקע הכותרת של דף הבית.

   The markup ships with all five slides already in the DOM and the first one
   marked active, so the hero is a finished picture before this file runs and
   stays one if it never does. Everything here is enhancement: the auto-advance,
   the dots, the pause control and the progress rail.

   Direction. The page is RTL, so the slide strip runs right-to-left: slide 2
   sits to the LEFT of slide 1. Advancing therefore brings the incoming slide in
   from the left and pushes the outgoing one out to the right, which is the
   mirror of the same widget in an LTR page. PUSH below is the signed offset and
   every transform is derived from it, so the whole reversal is one constant.

   Motion is a WCAG 2.2.2 obligation here, not a preference: slides advance on
   their own for longer than five seconds, so a pause control is required. It is
   a real button, not a hover affordance. Auto-advance never starts at all when
   the visitor asked for less motion, either through the OS setting or through
   the site's own "עצירת אנימציות" toggle, which sets html.a11y-stopanim. */
(function () {
  'use strict';

  var root = document.querySelector('[data-hero]');
  if (!root) return;

  var media = root.querySelector('.hero-media');
  var slides = [].slice.call(root.querySelectorAll('.hero-slide'));
  if (slides.length < 2) return;

  var DWELL = 6000;     // how long a slide is held, ms
  var FADE = 1100;      // cross-fade duration, ms; must match the CSS transition
  var PUSH = -3;        // percent; negative = incoming enters from the left (RTL)

  var index = 0;
  var timer = null;
  var railStart = 0;
  var paused = false;     // the visitor pressed pause
  var keyboardIn = false; // keyboard focus is inside the hero
  function held() { return keyboardIn; }

  /* ---------- respect the motion preferences ---------- */

  var mqMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  function motionOff() {
    return mqMotion.matches || document.documentElement.classList.contains('a11y-stopanim');
  }

  /* ---------- controls ---------- */

  var controls = root.querySelector('.hero-controls');
  var playBtn = root.querySelector('.hero-play');
  var dotsWrap = root.querySelector('.hero-dots');
  var rail = root.querySelector('.hero-rail-fill');

  var dots = slides.map(function (slide, i) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'hero-dot';
    b.setAttribute('aria-label', 'מעבר לתמונה ' + (i + 1) + ' מתוך ' + slides.length);
    if (i === 0) b.setAttribute('aria-current', 'true');
    b.addEventListener('click', function () { goTo(i, true); });
    dotsWrap.appendChild(b);
    return b;
  });

  /* ---------- slide transition ---------- */

  // forward: the incoming slide arrives from the inline-end of the strip.
  function goTo(next, fromUser) {
    if (next === index) return;
    var forward = next > index;
    var enter = (forward ? PUSH : -PUSH) + '%';
    var leave = (forward ? -PUSH : PUSH) + '%';

    var out = slides[index];
    var into = slides[next];

    // Place the incoming slide off-centre with transitions suppressed, force a
    // reflow, then let it animate home. Without the reflow the browser collapses
    // both style changes into one frame and nothing moves.
    into.style.transition = 'none';
    into.style.transform = 'translateX(' + enter + ') scale(1.035)';
    void into.offsetWidth;
    into.style.transition = '';

    out.classList.remove('is-active');
    out.style.transform = 'translateX(' + leave + ') scale(1.035)';
    into.classList.add('is-active');
    into.style.transform = '';

    // Park the outgoing slide back at the origin once it is invisible, so the
    // next turn does not animate it across the frame.
    window.setTimeout(function () {
      if (!out.classList.contains('is-active')) {
        out.style.transition = 'none';
        out.style.transform = '';
        void out.offsetWidth;
        out.style.transition = '';
      }
    }, FADE);

    dots[index].removeAttribute('aria-current');
    dots[next].setAttribute('aria-current', 'true');
    index = next;

    if (fromUser) restart();
    else resetRail();
  }

  function advance() { goTo((index + 1) % slides.length, false); }

  /* ---------- the wash rail ---------- */

  // Fills from the inline-start edge (the right, in RTL) across the dwell. It is
  // driven by rAF rather than a CSS animation so that pausing leaves it where it
  // stood instead of snapping back.
  function resetRail() { railStart = performance.now(); }

  // The veil descends on the same clock, so the picture darkens as the slide
  // runs out and is at its darkest the moment before the change. It is a
  // gradient stop rather than a transform, so it is repainted at about 15fps
  // instead of 60: over six seconds the step is invisible, and a full-viewport
  // gradient is not something to re-rasterise on every frame.
  var lastSweep = -1;
  var lastFrame = 0;
  function paintRail(now) {
    // While the clock is not running - paused, held, or the tab in the
    // background - the start marker is dragged along with the frame so the
    // elapsed time stops growing. The rail and the veil hold where they stood
    // rather than rewinding to nothing, which is what a stopped clock should
    // look like. Resuming calls restart() and begins a fresh dwell.
    if (!running() && lastFrame) railStart += now - lastFrame;
    lastFrame = now;
    var done = Math.min(1, (now - railStart) / DWELL);
    if (rail) rail.style.transform = 'scaleX(' + done + ')';
    // Eased, unlike the rail. Linear darkening spends most of a slide's life
    // dim; the cue is meant to say "about to change", so it stays out of the
    // way and then arrives quickly over the last second or so.
    var stepped = Math.round(Math.pow(done, 2.4) * 90) / 90;
    if (stepped !== lastSweep) {
      lastSweep = stepped;
      root.style.setProperty('--sweep', String(stepped));
    }
    window.requestAnimationFrame(paintRail);
  }

  /* ---------- the clock ---------- */

  function running() { return !paused && !held() && !motionOff() && !document.hidden; }

  function tick() {
    if (running()) advance();
    timer = window.setTimeout(tick, DWELL);
  }

  function restart() {
    window.clearTimeout(timer);
    resetRail();
    timer = window.setTimeout(tick, DWELL);
  }

  function setPaused(next) {
    paused = next;
    playBtn.setAttribute('aria-pressed', paused ? 'true' : 'false');
    playBtn.setAttribute('aria-label', paused ? 'הפעלת מצגת התמונות' : 'עצירת מצגת התמונות');
    root.classList.toggle('is-paused', paused);
    if (!paused) restart();
  }

  playBtn.addEventListener('click', function () { setPaused(!paused); });

  // Tabbing into the hero holds the current slide: a keyboard visitor working
  // through the buttons should not have the ground move under them. Hovering
  // deliberately does not - the timer runs on with the pointer over the hero.
  //
  // The test is :focus-visible rather than focus. Clicking a dot leaves focus
  // sitting on that dot, and holding on plain focus meant one click stopped the
  // slideshow for good - the visitor asked to see a slide, not to end the
  // sequence.
  root.addEventListener('focusin', function (e) {
    keyboardIn = !!(e.target.matches && e.target.matches(':focus-visible'));
  });
  root.addEventListener('focusout', function (e) {
    if (root.contains(e.relatedTarget)) return;
    keyboardIn = false;
    resetRail();
  });

  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) resetRail();
  });

  function syncMotion() {
    root.classList.toggle('is-static', motionOff());
    if (motionOff()) { window.clearTimeout(timer); }
    else { restart(); }
  }
  mqMotion.addEventListener('change', syncMotion);

  // The a11y panel toggles a class on <html>; there is no event for that, so
  // watch the attribute rather than exporting a hook from accessibility.js.
  new MutationObserver(syncMotion)
    .observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

  controls.hidden = false;
  setPaused(false);
  syncMotion();
  window.requestAnimationFrame(paintRail);
})();
