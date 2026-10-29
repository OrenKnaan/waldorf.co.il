/* settings.js: הגדרות (who is signed in, the content server, demo rows, my
 * password) and the management key field the dashboard markup carries. */
(function () {
  'use strict';
  var A = window.WAdmin, el = A.el;

  // The one place a signed-in user changes their own password. The server wants
  // the current password for a self-change and keeps this session alive while
  // ending the others, so nobody is signed out by changing it.
  var PW_FIELDS = [
    { name: 'currentPassword', label: 'הסיסמה הנוכחית', type: 'password', autocomplete: 'current-password' },
    { name: 'password', label: 'סיסמה חדשה', type: 'password', autocomplete: 'new-password', hint: 'לפחות 10 תווים.' },
    { name: 'confirm', label: 'הסיסמה החדשה שוב', type: 'password', autocomplete: 'new-password' }
  ];
  function passwordChange(host, me) {
    var status = el('p', { class: 'empty-hint', role: 'status' });
    var open = el('button', { class: 'btn btn-ghost btn-sm', type: 'button', text: 'שינוי סיסמה' });
    var box = el('div', {}, [el('div', { class: 'panel-head' }, [el('h2', { text: 'הסיסמה שלי' }), el('div', { class: 'grow' }), open]), status]);
    host.appendChild(box);
    function say(text) { status.textContent = text; }
    open.addEventListener('click', function () {
      say('');
      A.openForm(box, PW_FIELDS, null, function (out) {
        if (out.password !== out.confirm) return say('הסיסמה החדשה ואימותה אינם זהים. לא בוצע שינוי.');
        if (out.password.length < 10) return say('הסיסמה החדשה קצרה מדי: נדרשים לפחות 10 תווים. לא בוצע שינוי.');
        say('שומר…');
        WStore.updateUser(me.id, { password: out.password, currentPassword: out.currentPassword }).then(function () {
          say('הסיסמה עודכנה. החיבור הנוכחי נשאר פעיל, וחיבורים אחרים לחשבון נותקו.');
        }).catch(function (e) {
          var code = e && e.body && e.body.error;
          say(code === 'wrong_password' ? 'הסיסמה הנוכחית שגויה. לא בוצע שינוי.'
            : code === 'password_too_short' ? 'הסיסמה החדשה קצרה מדי: נדרשים לפחות 10 תווים.'
            : e && e.status === 401 ? 'ההתחברות פגה. התחברו מחדש ונסו שוב.'
            : 'השינוי נכשל. נסו שוב.');
        });
      });
    });
  }

  function render() {
    var host = A.$('#settingsAdmin');
    if (!host) return;
    var user = WStore.currentUser(), me = A.me();
    var demo = 0;
    A.SEARCH_SOURCES.forEach(function (src) { WStore.get(src.col).forEach(function (it) { if (it.demo) demo++; }); });
    var api = el('dd', { text: 'בודק…' });
    host.textContent = '';
    host.appendChild(el('div', { class: 'panel-head' }, [el('h2', { text: 'החשבון והמערכת' })]));
    host.appendChild(el('dl', { class: 'kv' }, [
      el('dt', { text: 'משתמש מחובר' }), el('dd', { text: user ? user.name + ' · ' + (user.email || '') : me ? 'מפתח ניהול (ללא חשבון אישי)' : 'לא מחובר' }),
      el('dt', { text: 'הרשאה' }), el('dd', { text: me ? (A.ROLE_NAMES[me.role] || me.role) : 'צפייה בלבד' }),
      el('dt', { text: 'שרת התוכן' }), api,
      el('dt', { text: 'רשומות הדגמה במאגר' }), el('dd', { text: demo ? demo + ' (מסומנות ״הדגמה״ בטבלאות; יש למחוק אותן לפני ההשקה)' : 'אין' })
    ]));
    host.appendChild(el('p', { class: 'empty-hint', text: 'ניהול משתמשים והרשאות נמצא במסך ״נציגי פורום״, והחיבור לדיוור במסך ״ניוזלטר״.' }));
    if (user) passwordChange(host, user);
    fetch(WStore.apiBase + '/health').then(function (r) { return r.json(); }).then(function (j) {
      api.textContent = j && j.ok ? 'פועל' : 'תשובה לא תקינה';
    }).catch(function () { api.textContent = 'לא זמין'; });
  }

  /* The management key: kept in this browser only, never in the code (the repo is
     public on GitHub). */
  function wireKey() {
    var input = A.$('#adminKey'), save = A.$('#adminKeySave'), clear = A.$('#adminKeyClear'), msg = A.$('#adminKeyMsg');
    if (!input || !save) return;
    if (WStore.hasAdminKey()) { input.placeholder = '•••••••• (מפתח שמור)'; if (msg) msg.textContent = 'מחובר עם מפתח ניהול'; }
    save.addEventListener('click', function () {
      var v = input.value.trim();
      if (!v) { if (msg) msg.textContent = 'לא הוזן מפתח'; return; }
      if (msg) msg.textContent = 'בודק…';
      WStore.setAdminKey(v).then(function () {
        input.value = ''; input.placeholder = '•••••••• (מפתח שמור)';
        if (msg) msg.textContent = 'המפתח נשמר, והתוכן נטען מחדש';
        A.authChanged();
      }).catch(function () {
        WStore.setAdminKey('');
        if (msg) msg.textContent = 'המפתח נדחה. בדקו שהעתקתם אותו במלואו.';
      });
    });
    if (clear) clear.addEventListener('click', function () {
      WStore.setAdminKey('').then(function () {
        input.value = ''; input.placeholder = 'הדביקו כאן את המפתח';
        if (msg) msg.textContent = 'המפתח נמחק מהדפדפן';
        A.authChanged();
      });
    });
  }

  A.view({ name: 'set', render: function () { render(); wireKey(); }, auth: render, show: render });
})();
