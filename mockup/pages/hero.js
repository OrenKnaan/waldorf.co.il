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

  /* ---------- knobs ---------- */
  // The veil's colour and depth are CSS, in the hero block of the page; these
  // are the timings. See the note above .hero-sweep in home-hero.html.
  var DWELL = 6000;     // how long a slide is held, ms
  var FADE = 1100;      // cross-fade duration, ms; must match the CSS transition
  var PUSH = -3;        // percent; negative = incoming enters from the left (RTL)
  var SWEEP_EASE = 2.4; // >1 delays the darkening; 1 makes it linear

  var index = 0;
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
  var sweepEl = root.querySelector('.hero-sweep');

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
  }

  function advance() { goTo((index + 1) % slides.length, false); }

  /* ---------- the clock ---------- */

  // One rAF loop drives the rail, the veil and the change itself, so the three
  // can never disagree about where in a slide's life we are.
  //
  // A cycle is DWELL + FADE long rather than DWELL. The change fires partway
  // through it, at DWELL, and the remaining FADE is the cross-fade: the veil
  // keeps falling across it, so the incoming photograph arrives underneath the
  // darkness and the darkness lifts off it. The veil used to be reset the
  // instant the slide changed, which threw it off the picture in a single frame
  // exactly when the eye was on it - that is the jump this replaces.

  var cycleStart = 0;
  var switched = false;   // has this cycle already changed the slide?
  var lastFrame = 0;
  var lastSweep = -1;

  function running() { return !paused && !held() && !motionOff() && !document.hidden; }

  function restart() {
    cycleStart = window.performance.now();
    switched = false;
  }

  function frame(now) {
    var gap = lastFrame ? now - lastFrame : 0;
    lastFrame = now;

    // Drag the start marker along instead of letting elapsed grow, so a stopped
    // clock holds where it stood rather than rewinding. A long gap means rAF was
    // not running at all - a background tab - and is frozen through whatever the
    // clock says, or the slideshow skips several slides the moment the visitor
    // comes back to it.
    if (gap > 500 || !running()) cycleStart += gap;

    var elapsed = now - cycleStart;

    if (!switched && elapsed >= DWELL) { switched = true; advance(); }
    if (elapsed >= DWELL + FADE) { cycleStart = now; switched = false; elapsed = 0; }

    var fading = elapsed > DWELL;
    var out = fading ? (elapsed - DWELL) / FADE : 0;

    if (rail) {
      // The rail holds full through the cross-fade and fades out rather than
      // snapping back to empty; it returns already empty for the new slide.
      // Draining it would read as the slideshow running backwards.
      rail.style.transform = 'scaleX(' + Math.min(1, elapsed / DWELL) + ')';
      rail.style.opacity = fading ? String(Math.max(0, 1 - out)) : '1';
    }

    // Rising across the dwell, eased so the darkening stays out of the way and
    // then arrives over the last moment. Written every frame at full precision:
    // quantising it moved the gradient's soft edge in visible steps.
    //
    // Across the cross-fade it does not travel back. Winding the gradient up
    // the picture was a second movement laid over the cross-fade, and the veil
    // has no reason to go anywhere - so it holds where it ended and dissolves
    // with the photograph it was covering. By the time the change has finished
    // the veil is already gone, and the next slide starts from nothing.
    var sweep;
    if (fading) {
      sweep = 1;
      if (sweepEl) sweepEl.style.opacity = String(Math.max(0, 1 - out));
    } else {
      sweep = Math.pow(elapsed / DWELL, SWEEP_EASE);
      if (sweepEl) sweepEl.style.opacity = '1';
    }
    if (sweep !== lastSweep) {
      lastSweep = sweep;
      root.style.setProperty('--sweep', sweep.toFixed(6));
    }

    window.requestAnimationFrame(frame);
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
  });

  function syncMotion() {
    root.classList.toggle('is-static', motionOff());
    if (!motionOff()) restart();
  }
  mqMotion.addEventListener('change', syncMotion);

  // The a11y panel toggles a class on <html>; there is no event for that, so
  // watch the attribute rather than exporting a hook from accessibility.js.
  new MutationObserver(syncMotion)
    .observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

  controls.hidden = false;
  setPaused(false);
  syncMotion();
  restart();
  window.requestAnimationFrame(frame);
})();
