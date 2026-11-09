/* forms.js: the contact form (contact.html) and the work-group form
 * (forum-workgroups.html).
 *
 * Each <form data-site-form="contact|workgroup"> posts its named fields to
 * /api/forms/<name> on the content API, which mails them to the forum through
 * Resend with Reply-To set to the visitor. Nothing is stored.
 *
 * Built like newsletter.js: standalone (these pages render nothing from D1, so
 * they do not load store.js, and the API base is repeated here), deferred, and
 * carrying its own CSS so a page without the script shows a plain form.
 */
(function () {
  'use strict';

  var API = 'https://waldorf-content-api.orenknaan.workers.dev';

  var forms = document.querySelectorAll('form[data-site-form]');
  if (!forms.length) return;

  /* Same rules as newsletter.js: the honeypot is clipped in place rather than
     hidden, so bots still find it, and kept off the RTL page's scroll area. */
  var style = document.createElement('style');
  style.id = 'fm-css';
  style.textContent = [
    '.fm-hp{position:absolute;width:1px;height:1px;margin:-1px;padding:0;border:0;overflow:hidden;clip:rect(0 0 0 0);clip-path:inset(50%)}',
    '.fm-status{grid-column:1/-1;margin:2px 0 0;font-size:.88rem;min-height:1.2em}',
    '.fm-status.err{color:oklch(0.48 0.15 25)}',
    '.fm-status.ok{color:var(--brown-dark);font-weight:500}',
    'form[data-site-form] button[disabled]{opacity:.6;cursor:progress}'
  ].join('\n');
  document.head.appendChild(style);

  var MESSAGES = {
    bad_email: 'כתובת הדוא"ל אינה תקינה. בדקו אותה ונסו שוב.',
    missing_fields: 'יש למלא את כל שדות החובה.',
    too_many_attempts: 'נשלחו כמה פניות ברצף מהמכשיר הזה. נסו שוב בעוד שעה.',
    not_configured: 'השליחה מהאתר אינה זמינה כרגע. אפשר לכתוב לנו ישירות ל-info@waldorf.co.il.',
    upstream_failed: 'השליחה נכשלה מסיבה טכנית מצדנו. נסו שוב מאוחר יותר, או כתבו ל-info@waldorf.co.il.',
    offline: 'לא הצלחנו להתחבר. בדקו את החיבור לאינטרנט ונסו שוב.'
  };
  var SENT = {
    contact: 'הפנייה נשלחה. נחזור אליכם בהקדם.',
    workgroup: 'הבקשה נשלחה. הפורום יעביר אותה לרכז/ת הקבוצה, שייצרו אתכם קשר.'
  };
  var EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  Array.prototype.forEach.call(forms, function (form) {
    var name = form.getAttribute('data-site-form');
    var button = form.querySelector('button[type="submit"]');
    var status = form.querySelector('.fm-status');

    function say(text, kind) {
      status.textContent = text;
      status.className = 'fm-status' + (kind ? ' ' + kind : '');
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      /* Checked here because the form is novalidate: the browser's own bubble
         is not styled, not translated and not announced consistently. */
      var fields = form.querySelectorAll('input[name], select[name], textarea[name]');
      var data = {};
      for (var i = 0; i < fields.length; i++) {
        var el = fields[i];
        var value = (el.value || '').trim();
        if (el.required && !value) { say(MESSAGES.missing_fields, 'err'); el.focus(); return; }
        if (el.type === 'email' && value && !EMAIL.test(value)) { say(MESSAGES.bad_email, 'err'); el.focus(); return; }
        data[el.name] = value;
      }

      button.disabled = true;
      say('שולח…');

      fetch(API + '/api/forms/' + name, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(data)
      }).then(function (r) {
        return r.json().catch(function () { return null; }).then(function (body) {
          return { ok: r.ok, body: body || {} };
        });
      }).then(function (r) {
        button.disabled = false;
        if (!r.ok) { say(MESSAGES[r.body.error] || MESSAGES.upstream_failed, 'err'); return; }
        form.reset();
        say(SENT[name] || SENT.contact, 'ok');
      }).catch(function () {
        button.disabled = false;
        say(MESSAGES.offline, 'err');
      });
    });
  });
})();
