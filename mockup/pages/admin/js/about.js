/* about.js: אודות הפורום, three editable sections of forum.html, with drafts,
 * publishing, a version history and a way back to the page's own text.
 *
 * A field left empty shows the page's fixed text in its place, both on the site
 * and as the field's placeholder here. Publishing an empty document is therefore
 * how the page goes back to its original text, and such a save is not kept as a
 * version (the Worker skips it: it holds nothing to restore).
 */
(function () {
  'use strict';
  var A = window.WAdmin, el = A.el, td = A.td;

  var HINT = 'שדה ריק: יוצג הטקסט הקבוע של העמוד. שורות שמתחילות ב"- " יהפכו לרשימה.';
  var SECTIONS = [['intro', 'מבוא'], ['activities', 'פעילויות שוטפות'], ['admission', 'קבלת בתי ספר לארגון']];
  function hasText(obj) {
    return Boolean(obj) && SECTIONS.some(function (p) { return String(obj[p[0]] || '').trim(); });
  }
  function excerpt(text, max) {
    text = String(text || '').trim();
    if (text.length <= max) return text;
    var cut = text.slice(0, max);
    return cut.slice(0, cut.lastIndexOf(' ') > max * 0.6 ? cut.lastIndexOf(' ') : max) + '...';
  }
  // The page's fixed text, read out of forum.html on the site itself, so the admin
  // never keeps a second copy that drifts from the page. A list comes back in the
  // same "- " form the editor turns into a list.
  function original() {
    return fetch(A.SITE + '/forum.html').then(function (r) { return r.text(); }).then(function (html) {
      var doc = new DOMParser().parseFromString(html, 'text/html');
      var out = {};
      SECTIONS.forEach(function (p) {
        var node = doc.getElementById('about-' + p[0]);
        if (!node) return;
        var lis = node.querySelectorAll('li');
        out[p[0]] = lis.length
          ? [].map.call(lis, function (li) { return '- ' + li.textContent.trim(); }).join('\n')
          : [].map.call(node.querySelectorAll('p'), function (x) { return x.textContent.trim(); }).join('\n\n');
      });
      return out;
    }).catch(function () { return {}; });
  }

  function render() {
    var host = A.$('#aboutAdmin');
    if (!host) return;
    host.textContent = '';
    var areas = {};

    function values() {
      var out = {};
      Object.keys(areas).forEach(function (k) { if (areas[k].value.trim()) out[k] = areas[k].value.trim(); });
      return out;
    }
    function fill(obj) { SECTIONS.forEach(function (p) { areas[p[0]].value = (obj && obj[p[0]]) || ''; }); }

    var editor = el('form', { class: 'aform', style: 'border-bottom:none' }, SECTIONS.map(function (pair) {
      var ta = el('textarea', { style: 'min-height:110px' });
      areas[pair[0]] = ta;
      return el('label', { class: 'wide' }, [document.createTextNode(pair[1]), ta]);
    }));
    editor.addEventListener('submit', function (e) { e.preventDefault(); });

    var btnDraft = el('button', { class: 'btn btn-ghost btn-sm', type: 'button', text: 'שמירה כטיוטה' });
    var btnPublish = el('button', { class: 'btn btn-primary btn-sm', type: 'button', style: 'width:auto', text: 'פרסום' });
    var btnDiscard = el('button', { class: 'btn btn-ghost btn-sm', type: 'button', text: 'ביטול הטיוטה' });
    var btnOriginal = el('button', { class: 'btn btn-ghost btn-sm', type: 'button', text: 'שחזור הטקסט המקורי' });
    var statusPill = el('span', { class: 'pill neutral', text: A.NONE });
    var msg = el('span', { class: 'empty-hint', style: 'align-self:center', role: 'status' });
    function say(text, tone) { msg.textContent = text || ''; msg.className = 'empty-hint' + (tone ? ' ' + tone : ''); }

    host.appendChild(el('div', { class: 'panel' }, [
      el('div', { class: 'panel-head' }, [el('h2', { text: 'תוכן העמוד' }), statusPill, el('div', { class: 'grow' })]),
      editor,
      el('p', { class: 'empty-hint', style: 'padding-top:0', text: HINT }),
      el('div', { class: 'actions', style: 'padding:0 20px 18px;display:flex;gap:10px;flex-wrap:wrap' }, [btnPublish, btnDraft, btnDiscard, btnOriginal, msg])
    ]));
    var historyBody = el('div');
    host.appendChild(el('div', { class: 'panel' }, [
      el('div', { class: 'panel-head' }, [el('h2', { text: 'היסטוריית שינויים' }), el('div', { class: 'grow' })]),
      historyBody
    ]));

    // An empty field shows the start of the text the site carries in its place.
    original().then(function (orig) {
      SECTIONS.forEach(function (p) { if (orig[p[0]]) areas[p[0]].placeholder = excerpt(orig[p[0]], 160); });
    });

    function refreshState() {
      return WStore.aboutState().then(function (st) {
        // A draft, if one exists, is what the editor should be working on, or it
        // would be silently overwritten with the published text.
        fill(st.hasDraft ? st.draft : st.published);
        var custom = hasText(st.published);
        statusPill.textContent = st.hasDraft ? 'יש טיוטה שלא פורסמה' : (custom ? 'מפורסם' : 'מוצג הטקסט המקורי');
        statusPill.className = 'pill ' + (st.hasDraft ? 'warn' : custom ? 'ok' : 'neutral');
        btnDiscard.style.display = st.hasDraft ? '' : 'none';
        btnOriginal.style.display = custom || st.hasDraft ? '' : 'none';
      });
    }

    function refreshHistory() {
      historyBody.textContent = '';
      return WStore.aboutVersions().then(function (list) {
        historyBody.textContent = '';
        if (!list.length) {
          historyBody.appendChild(el('p', { class: 'empty-hint', text: 'טרם נשמרו גרסאות. כל שמירה או פרסום ייווספו כאן.' }));
          return;
        }
        var t = A.makeTable(['מתי', 'סוג', 'מי', 'תחילת הטקסט', '']);
        list.forEach(function (v) {
          var when = new Date(v.created_at * 1000);
          // One line per field, under its own name, so three texts never run
          // together into one string.
          var fields = SECTIONS.filter(function (p) { return v.value && String(v.value[p[0]] || '').trim(); })
            .map(function (p) { return el('div', { class: 'hist-field' }, [el('b', { text: p[1] + ': ' }), document.createTextNode(excerpt(v.value[p[0]], 70))]); });
          var preview = el('td', { class: 'muted' }, (v.note ? [el('div', { class: 'hist-note', text: v.note })] : [])
            .concat(fields.length ? fields : [document.createTextNode('(ריק)')]));
          var restore = A.actBtn('restore', 'שחזור', function () {
            if (!A.canWrite()) return A.needSignIn();
            if (!confirm('לשחזר את הגרסה הזו ולפרסם אותה? הגרסה הנוכחית תישמר בהיסטוריה.')) return;
            WStore.restoreAbout(v.id).then(function () {
              say('הגרסה שוחזרה ופורסמה');
              return Promise.all([refreshState(), refreshHistory()]);
            }).catch(function () { say('השחזור נכשל', 'crit'); });
          });
          var remove = A.actBtn('del', 'מחיקת הרשומה', function () {
            if (!A.canWrite()) return A.needSignIn();
            if (!confirm('למחוק את הרשומה הזו מההיסטוריה? הטקסט שבאתר לא ישתנה.\n\nהמחיקה סופית: אי אפשר לשחזר את הרשומה.')) return;
            WStore.deleteAboutVersion(v.id).then(refreshHistory).catch(function () { say('מחיקת הרשומה נכשלה', 'crit'); });
          }, true);
          t.tbody.appendChild(el('tr', {}, [
            td(when.toLocaleDateString('he-IL') + ' ' + when.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }), 'muted tnum'),
            td(A.pill(v.status === 'published' ? 'פורסם' : 'טיוטה', v.status === 'published' ? 'ok' : 'neutral')),
            td(v.author || A.NONE, 'muted'),
            preview,
            td(el('div', { class: 'row-actions' }, [restore, remove]))
          ]));
        });
        historyBody.appendChild(t.wrap);
      }).catch(function () {
        historyBody.textContent = '';
        historyBody.appendChild(el('p', { class: 'empty-hint', text: 'לא ניתן לטעון היסטוריה (נדרשת התחברות).' }));
      });
    }

    function save(run, busy, done) {
      if (!A.canWrite()) return A.needSignIn();
      say(busy);
      run().then(function () {
        say(done);
        return Promise.all([refreshState(), refreshHistory()]);
      }).catch(function () { say('הפעולה נכשלה: נדרשת התחברות', 'crit'); });
    }
    btnDraft.addEventListener('click', function () {
      save(function () { return WStore.saveAboutDraft(values()); }, 'שומר…', 'נשמר כטיוטה. העמוד באתר לא השתנה.');
    });
    btnPublish.addEventListener('click', function () {
      save(function () { return WStore.publishAbout(values()); }, 'מפרסם…', 'פורסם. העמוד באתר עודכן.');
    });
    btnOriginal.addEventListener('click', function () {
      if (!confirm('להחזיר לעמוד את הטקסט המקורי? הטקסט המותאם יוסר מהאתר, וגרסאות קודמות יישארו בהיסטוריה.')) return;
      save(function () { return WStore.publishAbout({}); }, 'משחזר…', 'העמוד מציג שוב את הטקסט המקורי.');
    });
    btnDiscard.addEventListener('click', function () {
      if (!confirm('לבטל את הטיוטה ולחזור לגרסה המפורסמת?')) return;
      WStore.discardAboutDraft().then(function () { say('הטיוטה בוטלה'); return refreshState(); })
        .catch(function () { say('הפעולה נכשלה', 'crit'); });
    });

    refreshState().catch(function () { say('לא ניתן לטעון את התוכן: נדרשת התחברות', 'crit'); });
    refreshHistory();
  }

  A.view({ name: 'about', render: render, auth: render });
})();
