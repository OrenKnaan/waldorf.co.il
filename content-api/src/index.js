/**
 * Content API — D1-backed store for the Waldorf forum mockup.
 *
 * Read scopes:
 *   public  (default)  only what a visitor may see: published/approved rows.
 *   admin   (X-Admin-Key)  everything, including drafts and pending submissions.
 *
 * Write rules:
 *   Anyone may POST to `board` and `jobs` — that is the public noticeboard
 *   submission on the live pages, and it is forced to status 'pending' no
 *   matter what the caller sends. Everything else needs the admin key.
 *
 * Columns are snake_case in SQLite and camelCase over the wire, because the
 * renderers and the admin were written against the old JS object shape and
 * there is no reason to churn them for a storage detail.
 */

const COLLECTIONS = {
  events:   { table: 'events',     order: 'date DESC',      statuses: ['draft', 'published'], publicStatus: ['published'],
              fields: { title: 'title', date: 'date', time: 'time', location: 'location', description: 'description', registerUrl: 'register_url', status: 'status', demo: 'demo' } },
  // News is moderated like the boards, not drafted like events: the seed and the
  // admin's own status dropdown both use pending/approved. Filtering it on
  // 'published' returned zero rows and would have emptied the homepage feed.
  news:     { table: 'news',       order: 'date DESC',      statuses: ['pending', 'approved'], publicStatus: ['approved'],
              fields: { title: 'title', date: 'date', section: 'section', summary: 'summary', link: 'link', status: 'status', demo: 'demo' } },
  board:    { table: 'board',      order: 'date DESC',      statuses: ['pending', 'approved'], publicStatus: ['approved'], publicSubmit: true,
              fields: { title: 'title', category: 'category', description: 'description', region: 'region', contact: 'contact', date: 'date', status: 'status', demo: 'demo' } },
  jobs:     { table: 'jobs',       order: 'date DESC',      statuses: ['pending', 'approved'], publicStatus: ['approved'], publicSubmit: true,
              fields: { role: 'role', institution: 'institution', category: 'category', region: 'region', scope: 'scope', contact: 'contact', description: 'description', date: 'date', status: 'status', demo: 'demo' } },
  library:  { table: 'library',    order: 'position ASC',
              fields: { title: 'title', kind: 'kind', description: 'description', url: 'url', demo: 'demo' } },
  teaching: { table: 'teaching',   order: 'position ASC',
              fields: { title: 'title', group: 'grp', url: 'url', demo: 'demo' } },
  forms:    { table: 'forms',      order: 'position ASC',
              fields: { title: 'title', category: 'category', description: 'description', url: 'url', demo: 'demo' } },
  mapPoints:{ table: 'map_points', order: 'position ASC',
              fields: { name: 'name', town: 'town', count: 'count', lat: 'lat', lng: 'lng', url: 'url', demo: 'demo' } },
  videos:   { table: 'videos',     order: 'position ASC',
              fields: { title: 'title', youtubeId: 'youtube_id', description: 'description', demo: 'demo' } },
  podcast:  { table: 'podcast',    order: 'num DESC',
              fields: { title: 'title', num: 'num', date: 'date', duration: 'duration', description: 'description', url: 'url', demo: 'demo' } },
};

const SINGLETONS = ['about'];

const cors = (origin) => ({
  'Access-Control-Allow-Origin': origin || '*',
  'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'content-type,x-admin-key',
  'Access-Control-Max-Age': '86400',
  Vary: 'Origin',
});
const json = (body, status, origin) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', ...cors(origin) } });

const isAdmin = (req, env) => Boolean(env.ADMIN_KEY) && req.headers.get('x-admin-key') === env.ADMIN_KEY;
const newId = () => 'x' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

/** DB row -> the camelCase object the renderers expect. Nulls are dropped so
 *  `if (item.link)` keeps behaving the way it did with the old seed objects. */
function toApi(row, spec) {
  const out = { id: row.id };
  for (const [api, col] of Object.entries(spec.fields)) {
    let v = row[col];
    if (v === null || v === undefined) continue;
    if (api === 'demo') { if (v) out.demo = true; continue; }
    out[api] = v;
  }
  if (row.position !== undefined) out.position = row.position;
  return out;
}

async function listAll(env, admin) {
  const out = {};
  for (const [name, spec] of Object.entries(COLLECTIONS)) {
    let sql = `SELECT * FROM ${spec.table}`;
    const binds = [];
    if (!admin && spec.publicStatus) {
      sql += ` WHERE status IN (${spec.publicStatus.map(() => '?').join(',')})`;
      binds.push(...spec.publicStatus);
    }
    sql += ` ORDER BY ${spec.order}`;
    const { results } = await env.DB.prepare(sql).bind(...binds).all();
    out[name] = results.map((r) => toApi(r, spec));
  }
  for (const key of SINGLETONS) {
    const row = await env.DB.prepare('SELECT value FROM singletons WHERE key = ?').bind(key).first();
    out[key] = row ? JSON.parse(row.value) : null;
  }
  return out;
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin');
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(origin) });

    const url = new URL(request.url);
    const parts = url.pathname.split('/').filter(Boolean);   // ['api','content',...]
    const admin = isAdmin(request, env);

    if (url.pathname === '/health') {
      const n = await env.DB.prepare('SELECT COUNT(*) c FROM events').first();
      return json({ ok: true, db: 'waldorf-content', eventsRows: n.c, adminKeySet: Boolean(env.ADMIN_KEY) }, 200, origin);
    }

    // ---- singletons: /api/singleton/about ----
    if (parts[0] === 'api' && parts[1] === 'singleton' && SINGLETONS.includes(parts[2])) {
      const key = parts[2];
      if (request.method === 'GET') {
        const row = await env.DB.prepare('SELECT value FROM singletons WHERE key = ?').bind(key).first();
        return json(row ? JSON.parse(row.value) : null, 200, origin);
      }
      if (request.method === 'PUT') {
        if (!admin) return json({ error: 'unauthorized' }, 401, origin);
        const body = await request.json().catch(() => null);
        if (!body || typeof body !== 'object') return json({ error: 'bad_body' }, 400, origin);
        await env.DB.prepare(
          `INSERT INTO singletons (key,value,updated_at) VALUES (?,?,strftime('%s','now'))
           ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at`,
        ).bind(key, JSON.stringify(body)).run();
        return json(body, 200, origin);
      }
      return json({ error: 'method_not_allowed' }, 405, origin);
    }

    if (parts[0] !== 'api' || parts[1] !== 'content') return json({ error: 'not_found' }, 404, origin);

    // ---- GET /api/content  (everything, one round trip) ----
    if (parts.length === 2 && request.method === 'GET') {
      return json(await listAll(env, admin), 200, origin);
    }

    const name = parts[2];
    const spec = COLLECTIONS[name];
    if (!spec) return json({ error: 'unknown_collection', name }, 404, origin);
    const id = parts[3];

    // ---- GET /api/content/:collection ----
    if (request.method === 'GET' && !id) {
      let sql = `SELECT * FROM ${spec.table}`;
      const binds = [];
      if (!admin && spec.publicStatus) {
        sql += ` WHERE status IN (${spec.publicStatus.map(() => '?').join(',')})`;
        binds.push(...spec.publicStatus);
      }
      sql += ` ORDER BY ${spec.order}`;
      const { results } = await env.DB.prepare(sql).bind(...binds).all();
      return json(results.map((r) => toApi(r, spec)), 200, origin);
    }

    // ---- POST /api/content/:collection ----
    if (request.method === 'POST' && !id) {
      // The public boards accept submissions from visitors; everything else is admin-only.
      if (!admin && !spec.publicSubmit) return json({ error: 'unauthorized' }, 401, origin);
      const body = await request.json().catch(() => null);
      if (!body || typeof body !== 'object') return json({ error: 'bad_body' }, 400, origin);

      const rec = { ...body, id: body.id || newId() };
      // A visitor cannot publish itself onto the site, whatever it posts.
      if (!admin) { rec.status = 'pending'; rec.demo = false; }

      const cols = ['id'], vals = ['?'], binds = [rec.id];
      for (const [api, col] of Object.entries(spec.fields)) {
        if (rec[api] === undefined) continue;
        cols.push(col); vals.push('?');
        binds.push(api === 'demo' ? (rec[api] ? 1 : 0) : rec[api]);
      }
      if (spec.statuses && rec.status === undefined) { cols.push('status'); vals.push('?'); binds.push(spec.statuses[0]); }
      cols.push('created_at', 'updated_at'); vals.push("strftime('%s','now')", "strftime('%s','now')");

      await env.DB.prepare(`INSERT INTO ${spec.table} (${cols.join(',')}) VALUES (${vals.join(',')})`).bind(...binds).run();
      const row = await env.DB.prepare(`SELECT * FROM ${spec.table} WHERE id = ?`).bind(rec.id).first();
      return json(toApi(row, spec), 201, origin);
    }

    // ---- PATCH /api/content/:collection/:id ----
    if (request.method === 'PATCH' && id) {
      if (!admin) return json({ error: 'unauthorized' }, 401, origin);
      const body = await request.json().catch(() => null);
      if (!body || typeof body !== 'object') return json({ error: 'bad_body' }, 400, origin);

      const sets = [], binds = [];
      for (const [api, col] of Object.entries(spec.fields)) {
        if (body[api] === undefined) continue;
        sets.push(`${col} = ?`);
        binds.push(api === 'demo' ? (body[api] ? 1 : 0) : body[api]);
      }
      if (body.position !== undefined) { sets.push('position = ?'); binds.push(Number(body.position)); }
      if (!sets.length) return json({ error: 'nothing_to_update' }, 400, origin);
      sets.push("updated_at = strftime('%s','now')");
      binds.push(id);

      const res = await env.DB.prepare(`UPDATE ${spec.table} SET ${sets.join(', ')} WHERE id = ?`).bind(...binds).run();
      if (!res.meta.changes) return json({ error: 'not_found', id }, 404, origin);
      const row = await env.DB.prepare(`SELECT * FROM ${spec.table} WHERE id = ?`).bind(id).first();
      return json(toApi(row, spec), 200, origin);
    }

    // ---- DELETE /api/content/:collection/:id ----
    if (request.method === 'DELETE' && id) {
      if (!admin) return json({ error: 'unauthorized' }, 401, origin);
      const res = await env.DB.prepare(`DELETE FROM ${spec.table} WHERE id = ?`).bind(id).run();
      if (!res.meta.changes) return json({ error: 'not_found', id }, 404, origin);
      return json({ ok: true, id }, 200, origin);
    }

    return json({ error: 'method_not_allowed' }, 405, origin);
  },
};
