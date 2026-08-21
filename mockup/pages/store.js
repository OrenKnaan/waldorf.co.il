/* store.js — WStore, backed by the D1 content API.
 *
 * Replaces two things that used to live in the browser: the hardcoded seed
 * arrays in data.js, and the per-browser localStorage overlay that sat on top
 * of them. Content now has one home — the D1 database behind
 * waldorf-content-api — so what an editor changes in the admin is the same
 * record the public pages render, instead of a copy in one person's browser.
 *
 * Keeping get() synchronous is deliberate. Every call site in dynamic.js and
 * admin-app.js was written against a synchronous store, so instead of making
 * them all async we load every collection once into memory and let get() read
 * from that cache. Callers wait on WStore.ready, which the renderers do for
 * them, so page code did not have to change.
 *
 * Writes are optimistic: the cache updates immediately so the admin redraws
 * without a round trip, and the request follows. If the server rejects it the
 * cache is reloaded and onError fires, so the screen cannot keep showing an
 * edit that did not save.
 */
(function () {
  'use strict';

  var API = 'https://waldorf-content-api.orenknaan.workers.dev';
  var KEY_ADMIN = 'waldorf-admin-key-v1';   // admin key, entered once per browser
  var MINE_KEY = 'waldorf-mockup-mine-v1';  // ids this browser submitted — genuinely per-device

  var cache = null;
  var listeners = [];

  function readLS(k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } }
  function writeLS(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }

  function adminKey() { try { return localStorage.getItem(KEY_ADMIN) || ''; } catch (e) { return ''; } }
  function headers(extra) {
    var h = extra || {};
    var k = adminKey();
    if (k) h['x-admin-key'] = k;
    return h;
  }

  function req(path, opts) {
    opts = opts || {};
    opts.headers = headers(opts.body ? { 'content-type': 'application/json' } : {});
    return fetch(API + path, opts).then(function (r) {
      return r.json().catch(function () { return null; }).then(function (body) {
        if (!r.ok) throw { status: r.status, body: body };
        return body;
      });
    });
  }

  function emit(err) { listeners.forEach(function (fn) { try { fn(err || null); } catch (e) {} }); }

  var ready = req('/api/content')
    .then(function (data) { cache = data; return data; })
    .catch(function (err) {
      cache = null;             // no silent fall back to seed data — that is the thing we removed
      throw err;
    });

  function requireCache() {
    if (cache === null) throw new Error('WStore: content not loaded — wait on WStore.ready');
    return cache;
  }

  /** Re-fetch everything; used after a failed write so the screen matches the server. */
  function reload() {
    return req('/api/content').then(function (d) { cache = d; emit(); return d; });
  }

  var WStore = {
    ready: ready,
    reload: reload,
    isLoaded: function () { return cache !== null; },
    onChange: function (fn) { listeners.push(fn); },

    hasAdminKey: function () { return Boolean(adminKey()); },
    setAdminKey: function (k) {
      try { k ? localStorage.setItem(KEY_ADMIN, k) : localStorage.removeItem(KEY_ADMIN); } catch (e) {}
      return reload();
    },

    get: function (col) {
      var all = requireCache();
      var v = Object.prototype.hasOwnProperty.call(all, col) ? all[col] : null;
      if (v == null) return col === 'about' ? null : [];
      return JSON.parse(JSON.stringify(v));
    },

    add: function (col, item) {
      var all = requireCache();
      var rec = JSON.parse(JSON.stringify(item));
      if (!rec.id) rec.id = 'tmp' + Date.now().toString(36);
      (all[col] = all[col] || []).unshift(rec);          // optimistic
      emit();
      req('/api/content/' + col, { method: 'POST', body: JSON.stringify(item) })
        .then(function (saved) {
          var arr = cache[col] || [];
          for (var i = 0; i < arr.length; i++) if (arr[i].id === rec.id) { arr[i] = saved; break; }
          rec.id = saved.id;                              // callers hold this for markMine
          emit();
        })
        .catch(function (e) { reload().finally(function () { emit(e); }); });
      return rec;
    },

    update: function (col, id, patch) {
      var all = requireCache();
      (all[col] || []).forEach(function (it) { if (it.id === id) Object.assign(it, patch); });
      emit();
      req('/api/content/' + col + '/' + encodeURIComponent(id), { method: 'PATCH', body: JSON.stringify(patch) })
        .catch(function (e) { reload().finally(function () { emit(e); }); });
    },

    remove: function (col, id) {
      var all = requireCache();
      all[col] = (all[col] || []).filter(function (it) { return it.id !== id; });
      emit();
      req('/api/content/' + col + '/' + encodeURIComponent(id), { method: 'DELETE' })
        .catch(function (e) { reload().finally(function () { emit(e); }); });
    },

    /** Whole-collection replace, used by the admin's reorder/bulk paths. */
    set: function (col, val) {
      var all = requireCache();
      var before = all[col] || [];
      all[col] = val;
      emit();
      var byId = {};
      val.forEach(function (it, i) { byId[it.id] = i; });
      var ops = [];
      before.forEach(function (it) {
        if (!(it.id in byId)) ops.push(req('/api/content/' + col + '/' + encodeURIComponent(it.id), { method: 'DELETE' }));
      });
      val.forEach(function (it, i) {
        var patch = JSON.parse(JSON.stringify(it)); patch.position = i; delete patch.id;
        ops.push(req('/api/content/' + col + '/' + encodeURIComponent(it.id), { method: 'PATCH', body: JSON.stringify(patch) }));
      });
      Promise.all(ops).catch(function (e) { reload().finally(function () { emit(e); }); });
    },

    /** "אודות הפורום" is a single document rather than a list. */
    setSingleton: function (key, value) {
      var all = requireCache();
      all[key] = value;
      emit();
      return req('/api/singleton/' + key, { method: 'PUT', body: JSON.stringify(value) })
        .catch(function (e) { reload().finally(function () { emit(e); }); });
    },

    // Which submissions came from this browser is a device fact, not content,
    // so it stays local — the server has no identity to attach it to.
    markMine: function (id) { var m = readLS(MINE_KEY) || []; m.push(id); writeLS(MINE_KEY, m); },
    isMine: function (id) { return (readLS(MINE_KEY) || []).indexOf(id) !== -1; },

    reset: function () { try { localStorage.removeItem(MINE_KEY); } catch (e) {} return reload(); },
    apiBase: API
  };

  window.WStore = WStore;
})();
