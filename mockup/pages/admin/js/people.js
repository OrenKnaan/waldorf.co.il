/* people.js: נציגי פורום, the admin's user accounts. super_admin only, on the
 * server as well as here. */
(function () {
  'use strict';
  var A = window.WAdmin, el = A.el, td = A.td;
  var ROLE_NAMES = A.ROLE_NAMES;
  var ROLE_HELP = {
    super_admin: 'הרשאה מלאה, כולל ניהול משתמשים',
    admin: 'עריכת כל התוכן, אישור ודחייה של פרסומים ומחיקה סופית',
    editor: 'עריכת תוכן בלבד'
  };

  function fmtLogin(ts) {
    if (!ts) return 'טרם התחבר';
    var d = new Date(ts * 1000);
    return d.toLocaleDateString('he-IL') + ' ' + d.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
  }

  /* A freshly minted set-password link, selected and ready to copy. This stands in
     for an email until a mail provider exists: a super_admin creates the link and
     sends it by whatever channel they already use. The link is a credential for
     the few hours it lives, so it is shown once, here, and never stored. */
  function showInviteLink(host, u, r) {
    host.textContent = '';
    var box = el('div', { class: 'panel', style: 'padding:16px;margin-top:12px' });
    box.appendChild(el('h3', { text: (r.kind === 'invite' ? 'קישור להגדרת סיסמה עבור ' : 'קישור לאיפוס סיסמה עבור ') + u.name }));
    box.appendChild(el('p', { class: 'empty-hint', style: 'padding:6px 0',
      text: r.mailed ? 'הקישור נשלח בדוא"ל. אפשר גם להעתיק אותו מכאן.' : 'טרם מוגדר שירות דוא"ל, ולכן הקישור לא נשלח. העתיקו ושלחו אותו למשתמש.' }));
    var input = el('input', { type: 'text', readonly: 'readonly', value: r.link, style: 'width:100%;font-family:monospace;font-size:.8rem;direction:ltr;padding:8px' });
    box.appendChild(input);
    var copy = el('button', { class: 'btn btn-primary btn-sm', type: 'button', text: 'העתקת הקישור' });
    copy.addEventListener('click', function () {
      input.select();
      var done = function () { copy.textContent = 'הועתק'; setTimeout(function () { copy.textContent = 'העתקת הקישור'; }, 1800); };
      // execCommand is the fallback: navigator.clipboard needs a secure context.
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(r.link).then(done, function () { try { document.execCommand('copy'); done(); } catch (e) {} });
      } else { try { document.execCommand('copy'); done(); } catch (e) {} }
    });
    var close = el('button', { class: 'btn btn-ghost btn-sm', type: 'button', text: 'סגירה', onclick: function () { host.textContent = ''; } });
    box.appendChild(el('div', { class: 'btn-row', style: 'margin-top:10px;gap:8px' }, [copy, close]));
    box.appendChild(el('p', { class: 'empty-hint', style: 'padding:8px 0 0', text: 'תקף ל-' + r.expiresInHours + ' שעות ולשימוש אחד. יצירת קישור חדש מבטלת את הקודם.' }));
    host.appendChild(box);
    input.select();
  }

  function render() {
    var host = A.$('#peopleAdmin');
    if (!host) return;
    host.textContent = '';
    var me = A.me();
    if (!me) {
      host.appendChild(el('div', { class: 'panel' }, [
        el('div', { class: 'panel-head' }, [el('h2', { text: 'נדרשת התחברות' })]),
        el('p', { class: 'empty-hint', text: 'רשימת המשתמשים זמינה רק לאחר התחברות עם שם משתמש וסיסמה, או אחרי הזנת מפתח הניהול במסך ההגדרות.' })
      ]));
      return;
    }
    // The roster is super_admin-only on the server: say so, rather than drawing a
    // table whose only possible content is a 403.
    if (me.role !== 'super_admin') {
      host.appendChild(el('div', { class: 'panel' }, [
        el('div', { class: 'panel-head' }, [el('h2', { text: 'משתמשי המערכת' })]),
        el('p', { class: 'empty-hint', text: 'ניהול המשתמשים שמור למנהל־על. את הסיסמה שלכם משנים במסך ההגדרות.' })
      ]));
      return;
    }

    var addBtn = el('button', { class: 'btn btn-ghost btn-sm', type: 'button', text: '+ משתמש חדש' });
    var t = A.makeTable(['שם', 'דוא"ל', 'סטטוס', 'תפקיד', 'כניסה אחרונה', '']);
    var formHost = el('div');
    host.appendChild(el('div', { class: 'panel' }, [
      el('div', { class: 'panel-head' }, [el('h2', { text: 'משתמשי המערכת' }), el('div', { class: 'grow' }), addBtn]),
      t.wrap, formHost
    ]));
    addBtn.addEventListener('click', function () { openUserForm(null); });

    function draw() {
      t.tbody.textContent = '';
      WStore.users().then(function (list) {
        t.tbody.textContent = '';
        if (!list.length) return A.emptyRow(t.tbody, 6, 'אין משתמשים');
        list.forEach(function (u) {
          var actions = el('div', { class: 'row-actions' }, [
            A.actBtn('edit', 'עריכה', function () { openUserForm(u); }),
            // The delivery path that works while no mail provider is configured:
            // mint the link here and hand it over.
            A.actBtn('key', u.hasPassword ? 'קישור לאיפוס' : 'קישור להגדרת סיסמה', function () {
              WStore.inviteUser(u.id).then(function (r) { showInviteLink(formHost, u, r); })
                .catch(function () { alert('יצירת הקישור נכשלה.'); });
            }),
            u.id === me.id ? null : A.actBtn('del', 'מחיקה', function () {
              if (!confirm('למחוק את המשתמש "' + u.name + '"? הפעולה אינה הפיכה.')) return;
              WStore.deleteUser(u.id).then(draw).catch(function (e) {
                alert(e && e.body && e.body.error === 'last_super_admin' ? 'לא ניתן למחוק את מנהל־העל האחרון.' : 'המחיקה נכשלה.');
              });
            }, true)
          ]);
          t.tbody.appendChild(el('tr', {}, [
            A.titleCell(u.name + (u.id === me.id ? ' (אני)' : ''), false),
            td(u.email, 'muted'),
            // An account with no password yet cannot be logged into at all.
            td(u.hasPassword ? A.pill('פעיל', 'neutral')
              : el('span', { class: 'pill warn', title: 'טרם הוגדרה סיסמה: יש לשלוח קישור', text: 'ממתין להגדרת סיסמה' })),
            td(el('span', { class: 'pill ' + (u.role === 'super_admin' ? 'ok' : 'neutral'), title: ROLE_HELP[u.role] || '', text: ROLE_NAMES[u.role] || u.role })),
            td(fmtLogin(u.last_login), 'muted'),
            td(actions)
          ]));
        });
      }).catch(function () {
        t.tbody.textContent = '';
        A.emptyRow(t.tbody, 6, 'לא ניתן לטעון את רשימת המשתמשים');
      });
    }

    function openUserForm(u) {
      formHost.textContent = '';
      var isNew = !u;
      var fields = [
        { name: 'name', label: 'שם מלא', type: 'text' },
        { name: 'email', label: 'דוא"ל', type: 'email' },
        { name: 'role', label: 'תפקיד', type: 'select', options: [
          { v: 'editor', t: ROLE_NAMES.editor + ': ' + ROLE_HELP.editor },
          { v: 'admin', t: ROLE_NAMES.admin + ': ' + ROLE_HELP.admin },
          { v: 'super_admin', t: ROLE_NAMES.super_admin + ': ' + ROLE_HELP.super_admin }
        ] }
      ];
      // Never required. A new user gets a link and chooses their own, so nobody else
      // ever knows it. Your own password is changed in settings, which asks for the
      // current one; the server refuses a self-change without it.
      if (!u || u.id !== me.id) {
        fields.push({ name: 'password', label: isNew ? 'סיסמה (אפשר להשאיר ריק ולשלוח קישור)' : 'סיסמה חדשה (השאירו ריק כדי לא לשנות)',
          type: 'password', autocomplete: 'new-password', hint: 'לפחות 10 תווים.' });
      }
      A.openForm(formHost, fields, u || { role: 'editor' }, function (vals) {
        var patch = {};
        Object.keys(vals).forEach(function (k) { if (vals[k] !== '' && vals[k] != null) patch[k] = vals[k]; });
        var oops = function (e) {
          var code = e && e.body && e.body.error;
          alert(code === 'email_taken' ? 'כתובת הדוא"ל כבר קיימת במערכת.'
            : code === 'forbidden' ? 'אין לך הרשאה לפעולה הזו.'
            : code === 'password_too_short' ? 'הסיסמה קצרה מדי: נדרשים לפחות 10 תווים.'
            : 'השמירה נכשלה.');
        };
        if (isNew) WStore.createUser(patch).then(function (created) {
          draw();
          // An account made without a password cannot be used until its link is
          // delivered, so the link goes on screen straight away.
          if (created && created.invite && !created.hasPassword) {
            showInviteLink(formHost, created, { link: created.invite.link, kind: 'invite', mailed: created.invite.mailed, expiresInHours: created.invite.expiresInHours });
          }
        }).catch(oops);
        else WStore.updateUser(u.id, patch).then(function () { formHost.textContent = ''; draw(); }).catch(oops);
      });
    }

    draw();
  }

  // Redrawn on every visit (boot.js): a key entered in settings, or a sign-in in
  // another tab, changes who may see the roster.
  A.view({ name: 'people', render: render, auth: render, show: render });
})();
