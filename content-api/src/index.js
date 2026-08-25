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


/* ---------------- passwords & sessions ---------------- */
// PBKDF2-SHA256 via WebCrypto. Format: pbkdf2$iterations$saltB64$hashB64 — the
// parameters travel with the hash so iterations can be raised later without
// invalidating existing users.
const b64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));
const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function pbkdf2(password, salt, iterations) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  return crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations, hash: 'SHA-256' }, key, 256);
}
// 100k is the ceiling: Workers' WebCrypto rejects anything above it with
// "iteration counts above 100000 are not supported". Node has no such limit,
// so a hash generated locally at a higher count verifies fine off-Workers and
// throws in production — which is exactly how this surfaced.
const PBKDF2_ITERATIONS = 100000;
async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iterations = PBKDF2_ITERATIONS;
  return `pbkdf2$${iterations}$${b64(salt)}$${b64(await pbkdf2(password, salt, iterations))}`;
}
async function verifyPassword(password, stored) {
  const [scheme, iter, salt, hash] = String(stored).split('$');
  if (scheme !== 'pbkdf2') return false;
  if (Number(iter) > PBKDF2_ITERATIONS) return false;   // unverifiable here — see note above
  const got = b64(await pbkdf2(password, unb64(salt), Number(iter)));
  // Constant-time-ish: compare every byte rather than bailing on the first miss.
  if (got.length !== hash.length) return false;
  let diff = 0;
  for (let i = 0; i < got.length; i += 1) diff |= got.charCodeAt(i) ^ hash.charCodeAt(i);
  return diff === 0;
}
const sha256hex = async (s) => {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, '0')).join('');
};
const SESSION_DAYS = 14;

/* ---------------- password setup links ---------------- */
// An invite (a new account's first password) and a reset (an existing one's
// replacement) are the same mechanism. Both mint a single-use token, hashed at
// rest like a session token, because a leaked row must not be a usable
// credential.
const RESET_TTL_HOURS = { invite: 72, reset: 2 };

// '' is how an account with no password yet is stored. It never parses as a
// pbkdf2 string, so verifyPassword rejects every password against it, the empty
// one included, without needing its own guard.
const NO_PASSWORD = '';
const hasPassword = (row) => Boolean(row && row.password_hash && row.password_hash !== NO_PASSWORD);

async function mintSetupToken(env, userId, kind) {
  const token = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '');
  const hours = RESET_TTL_HOURS[kind] || 2;
  // Any earlier unused link for this user stops working: asking for a second
  // reset should invalidate the first, or a stale mail stays live for days.
  await env.DB.prepare('DELETE FROM password_resets WHERE user_id = ? AND used_at IS NULL').bind(userId).run();
  await env.DB.prepare(
    `INSERT INTO password_resets (token_hash,user_id,kind,created_at,expires_at)
     VALUES (?,?,?,strftime('%s','now'),strftime('%s','now') + ?)`,
  ).bind(await sha256hex(token), userId, kind, hours * 3600).run();
  return token;
}

// Where the set-password page lives. ADMIN_BASE_URL wins; otherwise fall back
// to the calling origin, which is right for both the GitHub Pages host now and
// the real domain later, and wrong only for a request with no Origin, where
// there is no browser to send anywhere.
function setupLink(env, token, origin) {
  const base = (env.ADMIN_BASE_URL || origin || '').replace(/\/+$/, '');
  return `${base}/admin/set-password.html?token=${token}`;
}

/**
 * Mails a set-password link. Returns whether it actually went anywhere.
 *
 * There is no mail provider configured for this project, so with no
 * RESEND_API_KEY set this returns false and the caller tells the visitor to ask
 * an administrator for the link. That is deliberately not a silent failure: a
 * password flow that claims to have sent mail it never sent is worse than one
 * that admits it cannot.
 *
 * Resend because it is one HTTPS call with no SDK, which is all a Worker can do
 * without pulling in a runtime it does not have. Swapping it for another
 * provider is this one function.
 */
async function sendSetupLink(env, email, token, kind, origin) {
  if (!env.RESEND_API_KEY || !env.MAIL_FROM) return false;
  const link = setupLink(env, token, origin);
  const invite = kind === 'invite';
  const subject = invite ? 'הזמנה למערכת הניהול של הפורום' : 'איפוס סיסמה למערכת הניהול';
  const lead = invite
    ? 'נפתח עבורך חשבון במערכת הניהול של הפורום הארצי לחינוך ולדורף. כדי להיכנס, בחרו סיסמה:'
    : 'התקבלה בקשה לאיפוס הסיסמה שלכם במערכת הניהול. כדי לבחור סיסמה חדשה:';
  const hours = RESET_TTL_HOURS[kind];
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        from: env.MAIL_FROM,
        to: [email],
        subject,
        html:
          `<div dir="rtl" style="font-family:Arial,sans-serif;line-height:1.7;color:#3D2B1F">` +
          `<p>${lead}</p>` +
          `<p><a href="${link}" style="background:#6B4F35;color:#fff;padding:10px 22px;` +
          `border-radius:999px;text-decoration:none;display:inline-block">בחירת סיסמה</a></p>` +
          `<p style="font-size:13px;color:#7A6555">הקישור תקף ל-${hours} שעות ולשימוש אחד בלבד.` +
          ` אם לא ביקשתם זאת, אפשר להתעלם מההודעה.</p></div>`,
      }),
    });
    return res.ok;
  } catch {
    // A provider outage must not turn into a 500 on a password flow; the caller
    // falls back to "ask an administrator".
    return false;
  }
}

/** The row behind a token, or null if it is unknown, spent or expired. */
async function readSetupToken(env, token) {
  if (!token) return null;
  return env.DB.prepare(
    `SELECT r.user_id, r.kind, u.name, u.email
       FROM password_resets r JOIN users u ON u.id = r.user_id
      WHERE r.token_hash = ? AND r.used_at IS NULL
        AND r.expires_at > strftime('%s','now') AND u.active = 1`,
  ).bind(await sha256hex(token)).first();
}

/* ---------------- login throttling ---------------- */
// Without this, /api/auth/login is an unlimited guessing oracle against an
// address an attacker already knows. Five misses buys a fifteen-minute pause
// for that (email, ip) pair; a success clears the counter immediately, so a
// legitimate user who mistypes twice and then gets it right is never delayed.
const MAX_FAILS = 5;
const LOCK_SECONDS = 15 * 60;

const clientIp = (request) =>
  request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || 'unknown';

/** Seconds the caller must wait, or 0 if they may try now. */
async function loginRetryAfter(env, email, ip) {
  const row = await env.DB.prepare(
    'SELECT fails, first_fail FROM login_attempts WHERE email = ? AND ip = ?',
  ).bind(email, ip).first();
  if (!row || row.fails < MAX_FAILS) return 0;
  const elapsed = Math.floor(Date.now() / 1000) - row.first_fail;
  if (elapsed >= LOCK_SECONDS) {
    // Window expired: clear it so the next miss starts a fresh count.
    await env.DB.prepare('DELETE FROM login_attempts WHERE email = ? AND ip = ?').bind(email, ip).run();
    return 0;
  }
  return LOCK_SECONDS - elapsed;
}

async function noteLoginFailure(env, email, ip) {
  const now = Math.floor(Date.now() / 1000);
  await env.DB.prepare(
    `INSERT INTO login_attempts (email, ip, fails, first_fail, last_fail)
     VALUES (?, ?, 1, ?, ?)
     ON CONFLICT(email, ip) DO UPDATE SET
       fails = CASE WHEN ? - first_fail >= ? THEN 1 ELSE fails + 1 END,
       first_fail = CASE WHEN ? - first_fail >= ? THEN ? ELSE first_fail END,
       last_fail = ?`,
  ).bind(email, ip, now, now, now, LOCK_SECONDS, now, LOCK_SECONDS, now, now).run();
}

const clearLoginFailures = (env, email, ip) =>
  env.DB.prepare('DELETE FROM login_attempts WHERE email = ? AND ip = ?').bind(email, ip).run();

/* ---------------- generic per-IP throttle ---------------- */
// For the public endpoints that have no account behind them, where the thing
// worth limiting is the caller rather than the target. Counts one window per
// (bucket, ip); see migrations/0005_rate_limits.sql.
//
// Returns the seconds the caller must wait, or 0 if the request may proceed,
// counting the request when it may, so the caller needs no second call.
async function rateLimit(env, bucket, ip, max, windowSeconds) {
  const now = Math.floor(Date.now() / 1000);
  const row = await env.DB.prepare(
    'SELECT hits, window_start FROM rate_limits WHERE bucket = ? AND ip = ?',
  ).bind(bucket, ip).first();
  if (row && now - row.window_start < windowSeconds && row.hits >= max) {
    return windowSeconds - (now - row.window_start);
  }
  await env.DB.prepare(
    `INSERT INTO rate_limits (bucket, ip, hits, window_start)
     VALUES (?, ?, 1, ?)
     ON CONFLICT(bucket, ip) DO UPDATE SET
       hits = CASE WHEN ? - window_start >= ? THEN 1 ELSE hits + 1 END,
       window_start = CASE WHEN ? - window_start >= ? THEN ? ELSE window_start END`,
  ).bind(bucket, ip, now, now, windowSeconds, now, windowSeconds, now).run();
  return 0;
}

const tooMany = (wait, origin) =>
  new Response(JSON.stringify({ error: 'too_many_attempts', retryAfter: wait }), {
    status: 429,
    headers: { 'content-type': 'application/json; charset=utf-8', 'Retry-After': String(wait), ...cors(origin) },
  });

/* ---------------- newsletter (ActiveTrail) ---------------- */
// Five signups an hour from one address is far more than a person needs and far
// less than a script wants. The window is per IP, so a school or an office
// behind one NAT could in principle hit it; at this volume that is theoretical,
// and the failure mode is a Hebrew "try again later", not a lost subscriber.
const NEWSLETTER_MAX = 5;
const NEWSLETTER_WINDOW = 60 * 60;
const ACTIVETRAIL_BASE = 'https://webapi.mymarketing.co.il';

// Deliberately loose. The only claim worth checking here is "this could be an
// address"; whether it *is* one is settled by the confirmation mail, which is
// the point of double opt-in. A stricter pattern rejects real addresses.
const isEmail = (s) => s.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s);

/** Resolves the caller: a session bearer token, or the ADMIN_KEY escape hatch. */
async function whoami(request, env) {
  const auth = request.headers.get('authorization') || '';
  if (auth.startsWith('Bearer ')) {
    const row = await env.DB.prepare(
      `SELECT u.id, u.name, u.email, u.role FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = ? AND s.expires_at > strftime('%s','now') AND u.active = 1`,
    ).bind(await sha256hex(auth.slice(7))).first();
    if (row) return row;
  }
  if (env.ADMIN_KEY && request.headers.get('x-admin-key') === env.ADMIN_KEY) {
    return { id: 'key', name: 'מפתח ניהול', email: null, role: 'super_admin' };
  }
  return null;
}

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

// Origins allowed to call this API from a browser. An allowlist, not a mirror:
// reflecting whatever Origin arrives means any page on the web can script calls
// against this API using a visitor's browser. Credentials are not sent
// cross-origin here, so the old behaviour was not an account-takeover hole, but
// it does hand out the whole surface for free.
//
// *.pages.dev is matched by pattern because Cloudflare Pages mints a new
// hostname for every branch and PR preview, which is where this is heading.
const ALLOWED_ORIGINS = [
  'https://orenknaan.github.io',
  'https://waldorf.co.il',
  'https://www.waldorf.co.il',
];
const originAllowed = (o) =>
  Boolean(o) && (
    ALLOWED_ORIGINS.includes(o) ||
    /^https:\/\/[a-z0-9-]+\.[a-z0-9-]+\.pages\.dev$/.test(o) ||
    /^https:\/\/[a-z0-9-]+\.pages\.dev$/.test(o) ||
    /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(o)
  );

const cors = (origin) => {
  const h = {
    // PUT is here because the singleton draft/publish endpoints use it; a method
    // missing from this list fails the preflight, which looks like an auth error
    // in the UI rather than a CORS one.
    'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    // 'authorization' matters: session logins send a bearer token, and a header
    // missing from this list makes the browser fail the preflight before the
    // request is ever sent, which reads as "login is broken", not "CORS".
    'Access-Control-Allow-Headers': 'content-type,x-admin-key,authorization',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
  // No header at all for anything else. A request with no Origin (curl, another
  // Worker) is not subject to CORS and is unaffected.
  if (originAllowed(origin)) h['Access-Control-Allow-Origin'] = origin;
  return h;
};
const json = (body, status, origin) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', ...cors(origin) } });

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
    const user = await whoami(request, env);
    const admin = Boolean(user);

    if (url.pathname === '/health') {
      const n = await env.DB.prepare('SELECT COUNT(*) c FROM events').first();
      return json({ ok: true, db: 'waldorf-content', eventsRows: n.c, adminKeySet: Boolean(env.ADMIN_KEY) }, 200, origin);
    }


    // ---- POST /api/newsletter/subscribe ----
    //
    // Public and unauthenticated, because it sits behind a signup form that
    // anyone may use. It exists as a proxy rather than a direct call from the
    // page because ActiveTrail authenticates with one account-wide token that
    // can read, edit and delete the entire contact list: in a page script that
    // token is published to every visitor. Here it is a Worker secret
    // (ACTIVETRAIL_TOKEN) and never leaves the Worker.
    if (parts[0] === 'api' && parts[1] === 'newsletter' && parts[2] === 'subscribe') {
      if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405, origin);
      const body = (await request.json().catch(() => ({}))) || {};

      // Honeypot: a field positioned off-screen and hidden from assistive tech,
      // so a human never fills it and a form-filling bot usually does. The
      // answer is the same one a success gives, or the bot learns what tripped
      // it and drops the field next time.
      if (body.website) return json({ ok: true }, 200, origin);

      const email = String(body.email || '').trim().toLowerCase();
      if (!isEmail(email)) return json({ error: 'bad_email' }, 400, origin);

      const ip = clientIp(request);
      const wait = await rateLimit(env, 'newsletter', ip, NEWSLETTER_MAX, NEWSLETTER_WINDOW);
      if (wait) return tooMany(wait, origin);

      if (!env.ACTIVETRAIL_TOKEN || !env.ACTIVETRAIL_GROUP_ID) {
        // Distinct from a failed call on purpose: this one is our
        // misconfiguration, and the page says so rather than blaming the
        // visitor's address. See wrangler.toml for what has to be set.
        console.error('newsletter: ACTIVETRAIL_TOKEN or ACTIVETRAIL_GROUP_ID is not set');
        return json({ error: 'not_configured' }, 503, origin);
      }

      // Double opt-in by default: ActiveTrail sends a confirmation mail and only
      // adds the contact once the link is clicked. That is what makes the list
      // defensible under the Israeli anti-spam rule (חוק התקשורת, סעיף 30א),
      // which wants consent that can be evidenced, and it also means a typo or
      // a malicious signup with somebody else's address never becomes a
      // subscription. Set ACTIVETRAIL_DOUBLE_OPTIN="false" to add directly.
      const doubleOptin = String(env.ACTIVETRAIL_DOUBLE_OPTIN || 'true') !== 'false';
      const payload = {
        email,
        status: doubleOptin ? 'None' : 'Subscribe',
        subscribe_ip: ip === 'unknown' ? undefined : ip,
      };
      if (doubleOptin) {
        payload.double_optin = {
          subject: 'אישור הרשמה לאיגרת הפורום הארצי לחינוך ולדורף',
          message: 'קיבלנו בקשה לצרף את כתובת הדוא"ל הזו לרשימת התפוצה של האיגרת התקופתית של הפורום הארצי לחינוך ולדורף. כדי להשלים את ההרשמה יש לאשר בקישור שלמטה. אם לא ביקשתם להירשם, אפשר פשוט להתעלם מההודעה.',
          confirmation_link_text: 'אישור ההרשמה לאיגרת',
        };
      }

      let res;
      try {
        res = await fetch(`${ACTIVETRAIL_BASE}/api/groups/${encodeURIComponent(env.ACTIVETRAIL_GROUP_ID)}/members`, {
          method: 'POST',
          headers: {
            // No 'Bearer' prefix: ActiveTrail takes the bare token as the value.
            Authorization: env.ACTIVETRAIL_TOKEN,
            'content-type': 'application/json',
            accept: 'application/json',
          },
          body: JSON.stringify(payload),
        });
      } catch (e) {
        console.error('newsletter: ActiveTrail unreachable', String(e));
        return json({ error: 'upstream_failed' }, 502, origin);
      }

      if (!res.ok) {
        // Logged, not returned. Their body can carry account details, and the
        // visitor can do nothing with a 403 from a service they never heard of.
        const detail = await res.text().catch(() => '');
        console.error('newsletter: ActiveTrail rejected', res.status, detail.slice(0, 300));
        return json({ error: 'upstream_failed' }, 502, origin);
      }
      return json({ ok: true, doubleOptin }, 200, origin);
    }

    // ---- auth ----
    if (parts[0] === 'api' && parts[1] === 'auth') {
      if (parts[2] === 'login' && request.method === 'POST') {
        const { email, password } = (await request.json().catch(() => ({}))) || {};
        if (!email || !password) return json({ error: 'missing_credentials' }, 400, origin);

        const ip = clientIp(request);
        const wait = await loginRetryAfter(env, email, ip);
        if (wait) {
          return new Response(JSON.stringify({ error: 'too_many_attempts', retryAfter: wait }), {
            status: 429,
            headers: { 'content-type': 'application/json; charset=utf-8', 'Retry-After': String(wait), ...cors(origin) },
          });
        }

        const row = await env.DB.prepare('SELECT * FROM users WHERE email = ? AND active = 1').bind(email).first();
        // Same answer either way, so the response cannot be used to enumerate
        // which addresses have accounts.
        if (!row || !(await verifyPassword(password, row.password_hash))) {
          // Counted for unknown addresses too, or the throttle itself would
          // answer the enumeration question the 401 refuses to.
          await noteLoginFailure(env, email, ip);
          return json({ error: 'bad_credentials' }, 401, origin);
        }
        await clearLoginFailures(env, email, ip);
        const token = crypto.randomUUID() + crypto.randomUUID().replace(/-/g, '');
        await env.DB.prepare(
          `INSERT INTO sessions (token_hash,user_id,created_at,expires_at)
           VALUES (?,?,strftime('%s','now'),strftime('%s','now') + ?)`,
        ).bind(await sha256hex(token), row.id, SESSION_DAYS * 86400).run();
        await env.DB.prepare("UPDATE users SET last_login = strftime('%s','now') WHERE id = ?").bind(row.id).run();
        return json({ token, expiresInDays: SESSION_DAYS, user: { id: row.id, name: row.name, email: row.email, role: row.role } }, 200, origin);
      }
      // Step one of the two-step sign-in: does this address have an account,
      // and does it have a password yet?
      //
      // This deliberately gives up the enumeration protection the login
      // response is careful to keep. There is no way to ask "should I show a
      // password box or an invite notice" without answering "does this address
      // exist". Throttled on the same counter as login so it cannot be used to
      // sweep a list of addresses quickly.
      if (parts[2] === 'lookup' && request.method === 'POST') {
        const { email } = (await request.json().catch(() => ({}))) || {};
        if (!email) return json({ error: 'missing_email' }, 400, origin);
        const ip = clientIp(request);
        const wait = await loginRetryAfter(env, email, ip);
        if (wait) {
          return new Response(JSON.stringify({ error: 'too_many_attempts', retryAfter: wait }), {
            status: 429,
            headers: { 'content-type': 'application/json; charset=utf-8', 'Retry-After': String(wait), ...cors(origin) },
          });
        }
        const row = await env.DB.prepare('SELECT id, password_hash FROM users WHERE email = ? AND active = 1').bind(email).first();
        if (!row) {
          // Counted, so a scan of many addresses runs into the same wall a
          // password guess does.
          await noteLoginFailure(env, email, ip);
          return json({ status: 'unknown' }, 200, origin);
        }
        return json({ status: hasPassword(row) ? 'has_password' : 'needs_password' }, 200, origin);
      }

      // Ask for a link, either to set a first password or to replace one.
      // Always 200 with the same body: this one does not need to leak anything,
      // so it does not.
      if (parts[2] === 'request-reset' && request.method === 'POST') {
        const { email } = (await request.json().catch(() => ({}))) || {};
        if (!email) return json({ error: 'missing_email' }, 400, origin);
        const row = await env.DB.prepare('SELECT id, password_hash FROM users WHERE email = ? AND active = 1').bind(email).first();
        let delivered = false;
        if (row) {
          const token = await mintSetupToken(env, row.id, hasPassword(row) ? 'reset' : 'invite');
          delivered = await sendSetupLink(env, email, token, hasPassword(row) ? 'reset' : 'invite', origin);
        }
        // `delivered:false` with a 200 tells the UI to say "if that address has
        // an account, a link is on its way" and, when no mail provider is
        // configured, to add that an administrator has to hand the link over.
        return json({ ok: true, delivered }, 200, origin);
      }

      // Spend a token and set the password on it.
      if (parts[2] === 'set-password' && request.method === 'POST') {
        const { token, password } = (await request.json().catch(() => ({}))) || {};
        if (!token || !password) return json({ error: 'missing_fields' }, 400, origin);
        if (String(password).length < 10) return json({ error: 'password_too_short', minimum: 10 }, 400, origin);
        const row = await readSetupToken(env, token);
        if (!row) return json({ error: 'invalid_or_expired' }, 400, origin);
        await env.DB.prepare('UPDATE users SET password_hash = ?, updated_at = strftime(\'%s\',\'now\') WHERE id = ?')
          .bind(await hashPassword(password), row.user_id).run();
        await env.DB.prepare("UPDATE password_resets SET used_at = strftime('%s','now') WHERE token_hash = ?")
          .bind(await sha256hex(token)).run();
        // Every session for this user ends: if the reset was because the
        // password leaked, whoever holds a token from it is logged out too.
        await env.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(row.user_id).run();
        await env.DB.prepare('DELETE FROM login_attempts WHERE email = ?').bind(row.email).run();
        return json({ ok: true, email: row.email }, 200, origin);
      }

      // What a link is for, so the page can say "set your password" or
      // "choose a new password" and greet the right person. Reveals nothing an
      // unexpired token does not already carry.
      if (parts[2] === 'setup-token' && request.method === 'GET') {
        const row = await readSetupToken(env, url.searchParams.get('token'));
        return row
          ? json({ valid: true, kind: row.kind, name: row.name, email: row.email }, 200, origin)
          : json({ valid: false }, 200, origin);
      }

      if (parts[2] === 'me' && request.method === 'GET') {
        return user ? json({ user }, 200, origin) : json({ error: 'unauthorized' }, 401, origin);
      }
      if (parts[2] === 'logout' && request.method === 'POST') {
        const auth = request.headers.get('authorization') || '';
        if (auth.startsWith('Bearer ')) {
          await env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(await sha256hex(auth.slice(7))).run();
        }
        return json({ ok: true }, 200, origin);
      }
      return json({ error: 'not_found' }, 404, origin);
    }

    // ---- users (super_admin only; a user may always change their own password) ----
    if (parts[0] === 'api' && parts[1] === 'users') {
      if (!user) return json({ error: 'unauthorized' }, 401, origin);
      const boss = user.role === 'super_admin';
      const uid = parts[2];

      if (request.method === 'GET' && !uid) {
        // super_admin, like every other method here. Without this an editor
        // could read the whole roster: names, addresses, roles, last-login.
        if (!boss) return json({ error: 'forbidden' }, 403, origin);
        const { results } = await env.DB.prepare(
          'SELECT id,name,email,role,active,last_login,created_at,password_hash FROM users ORDER BY created_at',
        ).all();
        // hasPassword, never the hash itself. The admin needs to show which
        // accounts are still waiting on their invite; it has no use for the
        // material behind that answer.
        return json(results.map(({ password_hash, ...u }) => ({ ...u, hasPassword: hasPassword({ password_hash }) })), 200, origin);
      }
      if (request.method === 'POST' && !uid) {
        if (!boss) return json({ error: 'forbidden' }, 403, origin);
        const body = (await request.json().catch(() => ({}))) || {};
        if (!body.name || !body.email) return json({ error: 'missing_fields' }, 400, origin);
        // No password is the normal way to create someone: they set their own
        // through an invite link, so nobody else ever knows it. A password may
        // still be passed, for seeding a first super_admin without mail.
        const hash = body.password ? await hashPassword(body.password) : NO_PASSWORD;
        const id = 'u-' + crypto.randomUUID().slice(0, 8);
        try {
          await env.DB.prepare(
            `INSERT INTO users (id,name,email,role,password_hash,active,created_at,updated_at)
             VALUES (?,?,?,?,?,1,strftime('%s','now'),strftime('%s','now'))`,
          ).bind(id, body.name, body.email, body.role || 'editor', hash).run();
        } catch (e) {
          return json({ error: 'email_taken' }, 409, origin);
        }
        // An invite goes out straight away when mail is configured; when it is
        // not, `invite.mailed` is false and the admin shows the link to hand
        // over instead.
        const kind = body.password ? 'reset' : 'invite';
        const token = await mintSetupToken(env, id, kind);
        const mailed = await sendSetupLink(env, body.email, token, kind, origin);
        return json({
          id, name: body.name, email: body.email, role: body.role || 'editor', active: 1,
          hasPassword: Boolean(body.password),
          invite: { link: setupLink(env, token, origin), mailed, expiresInHours: RESET_TTL_HOURS[kind] },
        }, 201, origin);
      }
      if (request.method === 'PATCH' && uid) {
        const self = user.id === uid;
        if (!boss && !self) return json({ error: 'forbidden' }, 403, origin);
        const body = (await request.json().catch(() => ({}))) || {};
        const sets = [], binds = [];
        if (boss && body.name !== undefined) { sets.push('name = ?'); binds.push(body.name); }
        if (boss && body.email !== undefined) { sets.push('email = ?'); binds.push(body.email); }
        if (boss && body.role !== undefined) { sets.push('role = ?'); binds.push(body.role); }
        if (boss && body.active !== undefined) { sets.push('active = ?'); binds.push(body.active ? 1 : 0); }
        if (body.password) { sets.push('password_hash = ?'); binds.push(await hashPassword(body.password)); }
        if (!sets.length) return json({ error: 'nothing_to_update' }, 400, origin);
        sets.push("updated_at = strftime('%s','now')");
        binds.push(uid);
        const res = await env.DB.prepare(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`).bind(...binds).run();
        if (!res.meta.changes) return json({ error: 'not_found' }, 404, origin);
        // Changing a password ends every other session for that user.
        if (body.password) await env.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(uid).run();
        const row = await env.DB.prepare('SELECT id,name,email,role,active,last_login FROM users WHERE id = ?').bind(uid).first();
        return json(row, 200, origin);
      }
      // POST /api/users/:id/invite — mint a set-password link for someone else.
      // The delivery path that works today: super_admin generates it and sends
      // it by whatever channel they already use. Also the fallback when mail is
      // configured but bouncing.
      if (request.method === 'POST' && uid && parts[3] === 'invite') {
        if (!boss) return json({ error: 'forbidden' }, 403, origin);
        const target = await env.DB.prepare('SELECT id, email, password_hash FROM users WHERE id = ? AND active = 1').bind(uid).first();
        if (!target) return json({ error: 'not_found' }, 404, origin);
        const kind = hasPassword(target) ? 'reset' : 'invite';
        const token = await mintSetupToken(env, target.id, kind);
        const mailed = await sendSetupLink(env, target.email, token, kind, origin);
        return json({ link: setupLink(env, token, origin), kind, mailed, expiresInHours: RESET_TTL_HOURS[kind] }, 200, origin);
      }

      if (request.method === 'DELETE' && uid) {
        if (!boss) return json({ error: 'forbidden' }, 403, origin);
        if (uid === user.id) return json({ error: 'cannot_delete_self' }, 400, origin);
        const left = await env.DB.prepare("SELECT COUNT(*) c FROM users WHERE role='super_admin' AND active=1 AND id <> ?").bind(uid).first();
        if (!left.c) return json({ error: 'last_super_admin' }, 400, origin);
        await env.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(uid).run();
        const res = await env.DB.prepare('DELETE FROM users WHERE id = ?').bind(uid).run();
        if (!res.meta.changes) return json({ error: 'not_found' }, 404, origin);
        return json({ ok: true, id: uid }, 200, origin);
      }
      return json({ error: 'method_not_allowed' }, 405, origin);
    }

    // ---- singletons: /api/singleton/about ----
    if (parts[0] === 'api' && parts[1] === 'singleton' && SINGLETONS.includes(parts[2])) {
      const key = parts[2];
      const sub = parts[3];   // undefined | 'draft' | 'versions' | 'restore'

      // GET /api/singleton/about — the published document (what the site shows)
      if (request.method === 'GET' && !sub) {
        const row = await env.DB.prepare('SELECT value FROM singletons WHERE key = ?').bind(key).first();
        return json(row && row.value ? JSON.parse(row.value) : null, 200, origin);
      }
      // GET /api/singleton/about/draft — the working copy, admin only
      if (request.method === 'GET' && sub === 'draft') {
        if (!admin) return json({ error: 'unauthorized' }, 401, origin);
        const row = await env.DB.prepare('SELECT value, draft_value FROM singletons WHERE key = ?').bind(key).first();
        const draft = row && row.draft_value ? JSON.parse(row.draft_value) : null;
        return json({ draft, published: row && row.value ? JSON.parse(row.value) : null, hasDraft: Boolean(draft) }, 200, origin);
      }
      // GET /api/singleton/about/versions — newest first
      if (request.method === 'GET' && sub === 'versions') {
        if (!admin) return json({ error: 'unauthorized' }, 401, origin);
        const { results } = await env.DB.prepare(
          'SELECT id,status,note,author,created_at,value FROM singleton_versions WHERE key = ? ORDER BY id DESC LIMIT 50',
        ).bind(key).all();
        return json(results.map((r) => ({ ...r, value: JSON.parse(r.value) })), 200, origin);
      }

      if (!admin) return json({ error: 'unauthorized' }, 401, origin);

      // PUT /api/singleton/about        — publish
      // PUT /api/singleton/about/draft  — save as draft, site unchanged
      if (request.method === 'PUT' && (!sub || sub === 'draft')) {
        const body = await request.json().catch(() => null);
        if (!body || typeof body !== 'object') return json({ error: 'bad_body' }, 400, origin);
        const value = JSON.stringify(body.value !== undefined ? body.value : body);
        const note = body.note || null;
        const publish = !sub;

        await env.DB.prepare(
          publish
            ? `INSERT INTO singletons (key,value,draft_value,updated_at) VALUES (?,?,NULL,strftime('%s','now'))
               ON CONFLICT(key) DO UPDATE SET value=excluded.value, draft_value=NULL, updated_at=excluded.updated_at`
            : `INSERT INTO singletons (key,value,draft_value,updated_at) VALUES (?,COALESCE((SELECT value FROM singletons WHERE key=?),''),?,strftime('%s','now'))
               ON CONFLICT(key) DO UPDATE SET draft_value=excluded.draft_value, updated_at=excluded.updated_at`,
        ).bind(...(publish ? [key, value] : [key, key, value])).run();

        // Every save is a version, so nothing an editor typed is ever lost.
        await env.DB.prepare(
          `INSERT INTO singleton_versions (key,value,status,note,author,created_at)
           VALUES (?,?,?,?,?,strftime('%s','now'))`,
        ).bind(key, value, publish ? 'published' : 'draft', note, user ? user.name : null).run();

        return json({ ok: true, status: publish ? 'published' : 'draft', value: JSON.parse(value) }, 200, origin);
      }

      // POST /api/singleton/about/restore {versionId} — re-publish an old version.
      // Restoring appends rather than rewinds: history stays append-only.
      if (request.method === 'POST' && sub === 'restore') {
        const { versionId } = (await request.json().catch(() => ({}))) || {};
        const v = await env.DB.prepare('SELECT * FROM singleton_versions WHERE id = ? AND key = ?').bind(versionId, key).first();
        if (!v) return json({ error: 'version_not_found' }, 404, origin);
        await env.DB.prepare(
          `INSERT INTO singletons (key,value,draft_value,updated_at) VALUES (?,?,NULL,strftime('%s','now'))
           ON CONFLICT(key) DO UPDATE SET value=excluded.value, draft_value=NULL, updated_at=excluded.updated_at`,
        ).bind(key, v.value).run();
        await env.DB.prepare(
          `INSERT INTO singleton_versions (key,value,status,note,author,created_at)
           VALUES (?,?,'published',?,?,strftime('%s','now'))`,
        ).bind(key, v.value, 'שוחזר מגרסה #' + versionId, user ? user.name : null).run();
        return json({ ok: true, restoredFrom: versionId, value: JSON.parse(v.value) }, 200, origin);
      }

      // DELETE /api/singleton/about/draft — discard the working copy
      if (request.method === 'DELETE' && sub === 'draft') {
        await env.DB.prepare('UPDATE singletons SET draft_value = NULL WHERE key = ?').bind(key).run();
        return json({ ok: true }, 200, origin);
      }
      return json({ error: 'method_not_allowed' }, 405, origin);
    }

    // ---- GET /api/activity — the most recently touched records, for the
    // dashboard's activity panel. Real timestamps only; if nothing has been
    // edited the panel says so rather than inventing entries. ----
    if (parts[0] === 'api' && parts[1] === 'activity' && request.method === 'GET') {
      if (!admin) return json({ error: 'unauthorized' }, 401, origin);
      // Not every table has a `title`: jobs calls it `role`, map_points `name`.
      // Derive it from the spec so adding a collection cannot break this.
      const labelCol = (spec) => spec.fields.title ? 'title' : (spec.fields.role ? 'role' : 'name');
      // One query per table rather than a UNION: D1 rejects a compound SELECT
      // with this many terms ("too many terms in compound SELECT"). batch()
      // still sends them as a single round trip, and merging ten short lists in
      // JS costs nothing.
      const names = Object.keys(COLLECTIONS);
      const batch = await env.DB.batch(names.map((name) => {
        const spec = COLLECTIONS[name];
        return env.DB.prepare(
          `SELECT id, ${labelCol(spec)} AS title, updated_at, created_at
           FROM ${spec.table} ORDER BY updated_at DESC LIMIT 12`,
        );
      }));
      const merged = [];
      batch.forEach((res, i) => {
        (res.results || []).forEach((r) => merged.push({
          collection: names[i], id: r.id, title: r.title,
          updatedAt: r.updated_at, createdAt: r.created_at,
          isNew: r.updated_at === r.created_at,
        }));
      });
      merged.sort((a, b) => b.updatedAt - a.updatedAt);
      return json(merged.slice(0, 12), 200, origin);
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
