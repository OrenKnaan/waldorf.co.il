/* newsletter.js: the signup form on forum-newsletter.html.
 *
 * Posts to /api/newsletter/subscribe on the content API, which forwards to
 * ActiveTrail. The browser never sees the ActiveTrail token: it is one
 * account-wide credential that can read and delete the whole contact list, so
 * it lives as a Worker secret and the page only ever talks to our own Worker.
 *
 * Standalone rather than part of store.js, which this page does not load:
 * store.js fetches every content collection the moment it runs, and this page
 * renders nothing from D1. The API base is repeated here for that reason; if it
 * ever moves, both files change.
 *
 * Deferred, like search.js: there is nothing to apply before first paint.
 */
(function () {
  'use strict';

  var API = 'https://waldorf-content-api.orenknaan.workers.dev';

  var form = document.getElementById('nl-form');
  if (!form) return;

  var email = document.getElementById('nl-email');
  var consent = document.getElementById('nl-consent');
  var honeypot = document.getElementById('nl-website');
  var button = document.getElementById('nl-submit');
  var status = document.getElementById('nl-status');

  /* Styles ship with the behaviour, so the markup carries no <style> block and
     a page without this script shows a plain form rather than a broken one.
     Design tokens throughout: this is ordinary page chrome and should follow
     the palette, including html.a11y-contrast, which it picks up for free. */
  var css = [
    '.nl-consent label{flex-direction:row;align-items:flex-start;gap:9px;font-weight:400;font-size:.86rem;color:var(--text);line-height:1.5;display:flex;cursor:pointer}',
    '.nl-consent input{width:18px;height:18px;min-height:0;flex:0 0 auto;margin-top:2px;accent-color:var(--brown)}',
    /* Clipped rather than display:none, so a bot reading the markup still finds
       the field to fill; a screen reader skips it because of aria-hidden and
       the keyboard because of tabindex="-1". Clipping in place beats parking it
       at -9999px: an off-screen offset in an RTL page extends the scrollable
       area to the inline-end, which on a phone is a stray horizontal scrollbar. */
    '.nl-hp{position:absolute;width:1px;height:1px;margin:-1px;padding:0;border:0;overflow:hidden;clip:rect(0 0 0 0);clip-path:inset(50%)}',
    '.nl-status{grid-column:1/-1;margin:2px 0 0;font-size:.88rem;min-height:1.2em}',
    '.nl-status.err{color:oklch(0.48 0.15 25)}',
    '.nl-status.ok{color:var(--brown-dark);font-weight:500}',
    '#nl-form button[disabled]{opacity:.6;cursor:progress}'
  ].join('\n');
  var style = document.createElement('style');
  style.id = 'nl-css';
  style.textContent = css;
  document.head.appendChild(style);

  function say(text, kind) {
    status.textContent = text;
    status.className = 'nl-status' + (kind ? ' ' + kind : '');
  }

  /* One Hebrew sentence per failure the visitor can act on. 'upstream_failed'
     and 'not_configured' are both our problem rather than theirs, so neither
     tells them to check their address, and both leave the mail address as the
     way through. */
  var MESSAGES = {
    bad_email: 'כתובת הדוא"ל אינה תקינה. בדקו אותה ונסו שוב.',
    too_many_attempts: 'נשלחו כמה בקשות ברצף מהמכשיר הזה. נסו שוב בעוד שעה.',
    not_configured: 'ההרשמה לאיגרת עדיין אינה זמינה. אפשר לכתוב לנו ל-info@waldorf.co.il ונוסיף אתכם ידנית.',
    upstream_failed: 'ההרשמה נכשלה מסיבה טכנית מצדנו. נסו שוב מאוחר יותר, או כתבו ל-info@waldorf.co.il.',
    offline: 'לא הצלחנו להתחבר. בדקו את החיבור לאינטרנט ונסו שוב.'
  };

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    var value = (email.value || '').trim();
    if (!value) { say('יש להזין כתובת דוא"ל.', 'err'); email.focus(); return; }
    /* Checked here as well as by the `required` attribute, because the form is
       novalidate: the browser's own bubble is not styled, not translated and
       not announced consistently. */
    if (!consent.checked) { say('כדי להירשם יש לאשר את קבלת האיגרת.', 'err'); consent.focus(); return; }

    button.disabled = true;
    say('שולח…');

    fetch(API + '/api/newsletter/subscribe', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: value, website: honeypot ? honeypot.value : '' })
    }).then(function (r) {
      return r.json().catch(function () { return null; }).then(function (body) {
        return { ok: r.ok, body: body || {} };
      });
    }).then(function (r) {
      if (!r.ok) {
        button.disabled = false;
        say(MESSAGES[r.body.error] || MESSAGES.upstream_failed, 'err');
        return;
      }
      /* Left disabled on success: the form has done its job, and a second
         submit of the same address only produces a second confirmation mail. */
      form.reset();
      say(r.body.doubleOptin === false
        ? 'נרשמתם לאיגרת. תודה!'
        : 'שלחנו הודעת אישור לכתובת שהזנתם. ההרשמה תושלם אחרי הלחיצה על הקישור שבהודעה.', 'ok');
    }).catch(function () {
      button.disabled = false;
      say(MESSAGES.offline, 'err');
    });
  });
})();
