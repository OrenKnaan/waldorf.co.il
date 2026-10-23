/* Cross-fading photo slideshow for the art-hero band on the category pages.
   A small, simpler cousin of hero.js on
   home.html: opacity cross-fade instead of a translated push, no dots and no
   progress rail, because this hero is a decorative band, not the page's main
   image.

   The pause control is not optional, though. The slideshow auto-advances for
   longer than five seconds, so WCAG 2.2.2 requires a way to stop it, and that
   requirement does not shrink because the element is smaller. */
(function () {
  'use strict';

  /* Which pictures a page shows is chosen by its data-art-set, not by markup:
     the pages carry no slides, this file builds them. Each set is a folder under
     img/slides/ holding <key>-01.webp ... <key>-NN.webp; the number here is the
     NN, so adding a picture means dropping the file in and raising the count.
     The order is shuffled on every load, so the first picture is random too.

     elementary and highschool stay separate sets for the pages that will want
     one or the other; "school" is both, for the pages that want either. */
  var COUNTS = {
    kinder: 9, foundations: 7, associations: 6, resources: 6, forum: 7,
    elementary: 6, highschool: 10
  };
  function files(key) {
    var out = [];
    for (var i = 1; i <= COUNTS[key]; i++) {
      out.push('./img/slides/' + key + '/' + key + '-' + (i < 10 ? '0' : '') + i + '.webp');
    }
    return out;
  }
  var SETS = {};
  Object.keys(COUNTS).forEach(function (k) { SETS[k] = files(k); });
  SETS.school = SETS.elementary.concat(SETS.highschool);

  function shuffle(list) {
    for (var i = list.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = list[i]; list[i] = list[j]; list[j] = t;
    }
    return list;
  }

  document.querySelectorAll('[data-art-slideshow]').forEach(function (root) {
    var media = root.querySelector('.ah-media');
    var set = SETS[root.getAttribute('data-art-set')];
    if (!media || !set) return;

    /* Only the picture on screen and the next one are given an image; the rest
       stay empty until their turn, so a page does not download sixteen of them. */
    var slides = shuffle(set.slice()).map(function (url) {
      var el = document.createElement('div');
      el.className = 'ah-slide';
      el.setAttribute('data-src', url);
      media.appendChild(el);
      return el;
    });
    function load(el) {
      var url = el.getAttribute('data-src');
      if (!url || el.style.getPropertyValue('--img')) return;
      el.style.setProperty('--img', "url('" + url + "')");
      el.style.setProperty('--img-lg', "url('" + url + "')");
    }
    load(slides[0]);
    load(slides[1]);
    slides[0].classList.add('is-active');

    var playBtn = root.querySelector('.ah-play');
    var DWELL = 4200;
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
      load(slides[next]);
      slides[next].classList.add('is-active');
      load(slides[(next + 1) % slides.length]);
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
