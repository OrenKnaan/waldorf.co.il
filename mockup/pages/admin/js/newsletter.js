/* newsletter.js: ניוזלטר. The list lives in ActiveTrail, not D1. The Worker holds
 * the token and always answers 200 with a `state`, so the panel can say exactly
 * what is missing rather than "error". Also fills the home view's subscriber KPI. */
(function () {
  'use strict';
  var A = window.WAdmin, el = A.el;

  var MSG = {
    not_configured: 'הטוקן של ActiveTrail עדיין לא הוגדר ב-Worker, ולכן ההרשמה באתר מחזירה ״לא זמין״ ואי אפשר לקרוא את מספר המנויים. ' +
      'מתוך תיקיית content-api מריצים: npx wrangler secret put ACTIVETRAIL_TOKEN',
    bad_token: 'ActiveTrail דחה את הטוקן שהוגדר ב-Worker. יש להפיק טוקן חדש ולהגדיר אותו מחדש.',
    unreachable: 'לא ניתן להגיע ל-ActiveTrail כרגע. נסו שוב בעוד מספר דקות.',
    upstream_error: 'ActiveTrail החזיר שגיאה בקריאת הקבוצה. ודאו שמספר הקבוצה נכון.',
    count_unavailable: 'החיבור ל-ActiveTrail תקין, אך לא נמצא בתשובה שלהם שדה שמכיל את מספר המנויים.'
  };

  function render() {
    var host = A.$('#nlAdmin');
    if (!host) return;
    WStore.newsletterStats().then(function (r) { return r; }, function (e) {
      return { state: e && e.status === 401 ? 'login' : 'unreachable' };
    }).then(function (r) {
      host.textContent = '';
      var ok = r.state === 'ok';
      var kids = [el('div', { class: 'panel-head' }, [el('h2', { text: 'שירות הדיוור' }), A.pill(ok ? 'מחובר' : 'ממתין לחיבור', ok ? 'ok' : 'warn'), el('div', { class: 'grow' })])];
      if (ok) {
        kids.push(el('dl', { class: 'kv' }, [
          el('dt', { text: 'שירות' }), el('dd', { text: 'ActiveTrail' }),
          el('dt', { text: 'קבוצת התפוצה' }), el('dd', { text: r.name || A.NONE }),
          el('dt', { text: 'מספר מנויים' }), el('dd', { text: String(r.count) }),
          el('dt', { text: 'אישור כפול במייל' }), el('dd', { text: r.doubleOptin ? 'פעיל' : 'כבוי' })
        ]));
        kids.push(el('p', { class: 'empty-hint', text: 'טופס ההרשמה בעמוד ״ניוזלטר״ שולח ל-Worker, וזה מעביר את הנרשם ל-ActiveTrail. שליחת הדיוור עצמה, ניהול הרשימה והסרות נעשים במערכת של ActiveTrail.' }));
      } else {
        kids.push(el('p', { class: 'empty-hint', text: r.state === 'login' ? 'יש להתחבר כדי לראות את מצב הדיוור.' : MSG[r.state] || 'מצב הדיוור לא ידוע.' }));
      }
      host.appendChild(el('div', { class: 'panel' }, kids));
      A.setText('#kpiNewsletter', ok ? String(r.count) : A.NONE);
      A.setText('#kpiNewsletterSub', ok ? 'בקבוצה ' + (r.name || 'הראשית') : r.state === 'login' ? 'נדרשת התחברות' : 'הדיוור טרם חובר ל-ActiveTrail');
    });
  }

  A.view({ name: 'nl', render: render, auth: render, show: render });
})();
