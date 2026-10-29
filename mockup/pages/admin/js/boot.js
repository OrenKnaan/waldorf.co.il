/* boot.js: starts the admin once the content store is loaded, and keeps the
 * user widget, the views and the store in step afterwards. Loaded last. */
(function () {
  'use strict';
  var A = window.WAdmin, el = A.el;

  /* ---- who is signed in, and signing out ---- */
  A.showUser = function () {
    var u = WStore.currentUser(), keyed = WStore.hasAdminKey();
    var who = A.$('.user .who b'), role = A.$('.user .who span'), av = A.$('.user .avatar');
    // The markup leaves the widget blank; every state is filled in here.
    if (who) who.textContent = u ? u.name : keyed ? 'מפתח ניהול' : 'לא מחובר';
    if (role) role.textContent = u ? (A.ROLE_NAMES[u.role] || u.role) : keyed ? A.ROLE_NAMES.super_admin : 'צפייה בלבד';
    if (av) av.textContent = u ? (u.name || '?').trim().charAt(0) : keyed ? 'מ' : '?';
    if (A.canWrite()) {
      var ro = document.querySelector('#adminNotice[data-kind="readonly"]');
      if (ro) ro.remove();
    } else if (!document.querySelector('#adminNotice[data-kind="signin"], #adminNotice[data-kind="fail"]')) {
      // Said before the first edit, not after it bounces.
      A.notify('מצב צפייה בלבד:', el('span', {}, [document.createTextNode('אינכם מחוברים, ולכן שינויים לא יישמרו. '), A.signInHelp()]), 'readonly');
    }
  };
  // A sign-in, a sign-out or a key entered or cleared: everything that depends on
  // who is asking draws again.
  A.authChanged = function () {
    A.showUser();
    A.refreshAll();
    A.views.forEach(function (v) { if (v.auth) v.auth(); });
  };

  A.showUser();
  // A stored session can outlive the server's copy of it. Asking now drops a dead
  // one (store.js does that on 401), so the page says "signed out" on arrival.
  if (WStore.isSignedIn()) WStore.me().catch(function () { A.showUser(); });
  var out = A.$('#logoutBtn');
  if (out) out.addEventListener('click', function (e) {
    e.preventDefault();
    WStore.logout().then(function () { location.href = './'; });
  });

  /* ---- start ---- */
  // The content comes from D1 through the API, so it is not there at once: every
  // view waits on WStore.ready, or each table would load empty and report an error.
  function boot() {
    A.views.forEach(function (v) { if (v.render) v.render(); });
    A.renderSiteLinks();
  }
  WStore.ready.then(boot).catch(function (err) { A.fail(err, false); });

  // A write the server refused reloads the store; draw again so the screen does
  // not keep an edit that did not save.
  WStore.onChange(function (err) {
    if (!WStore.isLoaded()) return;
    A.refreshAll();
    if (err) A.fail(err, true);
  });

  // Views that draw on demand, each time they are shown (the dashboard's router
  // fires 'adminview'). Before the store is loaded boot() has yet to run, and it
  // renders them itself.
  window.addEventListener('adminview', function (e) {
    if (!WStore.isLoaded()) return;
    A.views.forEach(function (v) { if (v.name === e.detail && v.show) v.show(); });
  });

  // Back to the tab: content may have been edited elsewhere.
  window.addEventListener('focus', function () { WStore.reload().catch(function () {}); });
})();
