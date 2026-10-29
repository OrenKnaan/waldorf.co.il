/* media.js: מדיה (videos and podcast episodes) */
(function () {
  'use strict';
  var A = window.WAdmin, td = A.td;

  var PANELS = [
    { col: 'videos', title: 'סרטונים', fields: [
      { name: 'title', label: 'כותרת' },
      { name: 'youtubeId', label: 'מזהה יוטיוב (למשל dQw4w9WgXcQ)' },
      { name: 'description', label: 'תיאור', type: 'textarea', wide: true }
    ], cols: ['כותרת', 'יוטיוב', ''],
    row: function (it) { return [A.titleCell(it.title, it.demo, it), td(it.youtubeId || 'חסר', 'muted tnum')]; } },
    { col: 'podcast', title: 'פרקי פודקאסט', fields: [
      { name: 'num', label: 'מספר פרק', type: 'number' },
      { name: 'title', label: 'כותרת' },
      { name: 'date', label: 'תאריך', type: 'date' },
      { name: 'duration', label: 'משך (למשל 42 דק׳)' },
      // Spotify is the only way offered to attach an episode. The field takes
      // whichever of Spotify's shapes was copied (share URL, spotify:episode: URI,
      // or a bare id) and stores the bare id, which is what the embed needs.
      { name: 'spotifyId', label: 'פרק ב-Spotify', placeholder: 'https://open.spotify.com/episode/…',
        hint: 'הדביקו את כתובת הפרק מ-Spotify (כפתור Share ואז Copy link), או את המזהה בלבד. זו הדרך היחידה להוסיף פרק כרגע.',
        clean: function (v) { return WDyn.spotifyEpisodeId(v); } },
      { name: 'description', label: 'תיאור', type: 'textarea', wide: true }
    ], cols: ['פרק', 'כותרת', 'תאריך', 'Spotify', ''],
    row: function (it) { return [td(String(it.num || A.NONE), 'muted tnum'), A.titleCell(it.title, it.demo, it), td(A.fmtDate(it.date), 'muted tnum'), td(it.spotifyId ? 'מקושר' : 'חסר', 'muted')]; } }
  ];

  var lists = [];
  A.view({
    name: 'media',
    render: function () {
      var host = A.$('#mediaAdmin');
      host.textContent = '';
      lists = PANELS.map(function (cfg) {
        var list = A.listPanel({ col: cfg.col, title: cfg.title, addLabel: 'הוספה', fields: cfg.fields, cols: cfg.cols, row: cfg.row });
        host.appendChild(list.panel);
        return list;
      });
    },
    draw: function () { lists.forEach(function (l) { l.draw(); }); }
  });
})();
