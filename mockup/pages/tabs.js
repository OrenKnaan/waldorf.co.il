/* ===================================================================
   לשוניות נגישות לפי דפוס Tabs של WAI-ARIA APG.
   קובץ משותף לכל עמודי המוקאפ, מחליף את סקריפט הלשוניות שהיה מוטמע
   בכל עמוד וטיפל בלחיצות עכבר בלבד.

   שני דברים היו חסרים שם. הראשון: ל-.tab-buttons היה role="tablist"
   אבל לילדיו לא היה role="tab", כך שהמבנה שהוכרז לקורא מסך היה שבור
   (axe: aria-required-children). השני: אי אפשר היה להחליף לשונית
   במקלדת חוץ מ-Tab לכל כפתור בנפרד.

   התיקון מוסיף את כל התפקידים בזמן ריצה במקום בתוך ה-HTML של 21
   עמודים, ומוסיף ניווט בחצים עם roving tabindex: רק הלשונית הפעילה
   נמצאת בסדר ה-Tab, והחצים מזיזים ביניהן.
   =================================================================== */
(function () {
  'use strict';

  var groups = document.querySelectorAll('.tabs');
  if (!groups.length) return;

  var rtl = (document.documentElement.getAttribute('dir') || '').toLowerCase() === 'rtl';

  Array.prototype.forEach.call(groups, function (group, gi) {
    var list = group.querySelector('.tab-buttons');
    // רק ילדים ישירים של הקבוצה הזו, כדי שקבוצה מקוננת לא תיגנב.
    var tabs = list ? Array.prototype.filter.call(list.children, function (el) {
      return el.classList.contains('tab-btn');
    }) : [];
    if (!list || !tabs.length) return;

    list.setAttribute('role', 'tablist');

    var panels = tabs.map(function (tab, ti) {
      var panel = document.getElementById(tab.getAttribute('data-target'));
      var tabId = 'tabbtn-' + gi + '-' + ti;

      tab.id = tabId;
      tab.setAttribute('role', 'tab');
      if (panel) tab.setAttribute('aria-controls', panel.id);

      if (panel) {
        panel.setAttribute('role', 'tabpanel');
        panel.setAttribute('aria-labelledby', tabId);
        // הפאנל עצמו מקבל פוקוס, אחרת משתמש מקלדת שהחליף לשונית לא
        // יכול לגלול את התוכן שנחשף אלא אם יש בו קישור.
        panel.setAttribute('tabindex', '0');
      }
      return panel;
    });

    function select(index, moveFocus) {
      tabs.forEach(function (tab, i) {
        var on = i === index;
        tab.classList.toggle('active', on);
        tab.setAttribute('aria-selected', on ? 'true' : 'false');
        tab.setAttribute('tabindex', on ? '0' : '-1');
        if (panels[i]) panels[i].classList.toggle('active', on);
      });
      if (moveFocus) tabs[index].focus();
    }

    list.addEventListener('click', function (e) {
      var tab = e.target.closest('.tab-btn');
      var i = tabs.indexOf(tab);
      if (i > -1) select(i, false);
    });

    list.addEventListener('keydown', function (e) {
      var i = tabs.indexOf(document.activeElement);
      if (i < 0) return;

      // ב-RTL חץ שמאלה הוא "הבא" וימינה הוא "הקודם", כפי שה-APG מגדיר.
      var next = rtl ? 'ArrowLeft' : 'ArrowRight';
      var prev = rtl ? 'ArrowRight' : 'ArrowLeft';
      var to;

      if (e.key === next) to = (i + 1) % tabs.length;
      else if (e.key === prev) to = (i - 1 + tabs.length) % tabs.length;
      else if (e.key === 'Home') to = 0;
      else if (e.key === 'End') to = tabs.length - 1;
      else return;

      e.preventDefault();
      select(to, true);
    });

    // מסנכרן את ה-ARIA עם ה-class="active" שכבר קיים ב-HTML.
    var initial = tabs.findIndex(function (t) { return t.classList.contains('active'); });
    select(initial > -1 ? initial : 0, false);
  });
})();
