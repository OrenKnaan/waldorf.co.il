// www.waldorf.co.il: the static site (site/dist, built by site/build.mjs) plus
// the few things static files cannot do on their own. Runs before every asset
// (run_worker_first), so each branch here is cheap and returns early.
import POST_IDS from '../post-ids.json';

const CANONICAL = 'www.waldorf.co.il';
const UPLOADS = '/wp-content/uploads/';
// Files uploaded from the admin (content-api, POST /api/uploads). Only these two
// prefixes of the bucket are ever served; its wp-export/ backup is not.
const FILES = '/files/';

// The workers.dev address serves the same pages without the noindex meta, so
// it says noindex in a header instead: one public copy for Google, not two.
const noindex = (res) => {
  const out = new Response(res.body, res);
  out.headers.set('X-Robots-Tag', 'noindex, nofollow');
  return out;
};

// Where an address this site does not have should go instead, or null. Zone
// analytics after the launch (launch-checklist E4) showed old links arriving
// with WordPress's extras on the end: a post's comment feed (/feed/) or
// oEmbed (/embed/), page N of an old listing (/page/4/), a stray double slash
// at the start, and thumbnail sizes WordPress generated (-300x225.jpg), of
// which only the originals were copied. Strip those, and answer only if what
// is left exists or is an old address with its own redirect.
async function oldAddress(env, origin, path) {
  const base = path
    .replace(/^\/{2,}/, '/')
    .replace(/\/(?:feed(?:\/atom|\/rss2?)?|embed|page\/\d+)\/?$/, '/');
  if (base.startsWith(UPLOADS)) {
    let key, asked;
    try { key = decodeURIComponent(base).slice(1); asked = decodeURIComponent(path).slice(1); } catch { return null; }
    for (const k of new Set([key, key.replace(/-\d+x\d+(\.[a-z0-9]+)$/i, '$1')])) {
      if (k !== asked && await env.UPLOADS.head(k)) {
        return '/' + k.split('/').map(encodeURIComponent).join('/');
      }
    }
    return null;
  }
  // The homepage is never the answer: a bare /feed/ is not a page anyone lost.
  if (base === path || base === '/') return null;
  // manual, or the lookup follows the redirect itself and the visitor gets two hops.
  const hit = await env.ASSETS.fetch(new Request(origin + base, { redirect: 'manual' }));
  if (hit.status === 200) return base;
  if (hit.status >= 301 && hit.status <= 308) {
    const to = new URL(hit.headers.get('location'), origin);
    return to.pathname + to.search;
  }
  return null;
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // 1. One address for every page: https on www (launch-checklist A1, C6).
    //    The workers.dev rehearsal address is left alone.
    const onDomain = url.hostname === CANONICAL || url.hostname === 'waldorf.co.il';
    if (onDomain && (url.hostname !== CANONICAL || url.protocol === 'http:')) {
      return Response.redirect(`https://${CANONICAL}${url.pathname}${url.search}`, 301);
    }

    // 2. WordPress links by id, /?p=123 and /?page_id=45, which is what the
    //    wp.me shortlinks shared on Facebook resolve to (B16). _redirects
    //    cannot read a query string.
    if (url.pathname === '/') {
      const id = url.searchParams.get('p') || url.searchParams.get('page_id');
      if (id) return Response.redirect(`${url.origin}${POST_IDS[id] || '/'}`, 301);
    }

    // 3. /index.html and /home.html are the homepage's other names (A3).
    if (url.pathname === '/index.html' || url.pathname === '/home.html') {
      return Response.redirect(`${url.origin}/${url.search}`, 301);
    }

    // 4. The old site's Hebrew addresses arrive percent-encoded in either
    //    case (%D7 or %d7), and the _redirects rules are written in upper
    //    case. Normalise, so a rule matches however the link was written.
    const path = url.pathname.replace(/%[0-9a-f]{2}/gi, (m) => m.toUpperCase());

    // html_handling is "none" (the .html addresses are kept, A2), so the
    // homepage has to be named here. Only /: every other address ending in /
    // is an old WordPress one, and _redirects has to see it as it came.
    const file = path === '/' ? '/index.html' : path;
    const res = await env.ASSETS.fetch(new Request(new URL(file + url.search, url.origin), request));

    // 5. Every file the old site ever uploaded, at its original address (A6):
    //    the bucket holds the mirror (migration/mirror-uploads.mjs); the 40
    //    attachments committed under mockup/pages/wp-content are served first.
    //    Files uploaded from the admin come from the same bucket, under files/.
    if (res.status === 404 && (path.startsWith(UPLOADS) || path.startsWith(FILES))) {
      let key;
      try { key = decodeURIComponent(path).slice(1); } catch { return res; }
      const obj = await env.UPLOADS.get(key);
      if (obj) {
        const headers = new Headers();
        obj.writeHttpMetadata(headers);
        headers.set('etag', obj.httpEtag);
        headers.set('cache-control', 'public, max-age=31536000, immutable');
        headers.set('x-content-type-options', 'nosniff');
        const file = new Response(request.method === 'HEAD' ? null : obj.body, { headers });
        // When it was last downloaded, for content-api's quarterly cleanup of
        // uploads nobody uses (cleanFiles). At most one write per file a day:
        // the update only lands when the stored day is older. After the response,
        // and a failure here never costs the visitor the file.
        if (onDomain) {
          ctx.waitUntil(env.DB.prepare(
            `INSERT INTO file_hits (key, last_hit) VALUES (?, strftime('%s','now'))
             ON CONFLICT(key) DO UPDATE SET last_hit = excluded.last_hit
             WHERE excluded.last_hit - file_hits.last_hit > 86400`,
          ).bind(key).run().catch(() => {}));
        }
        return onDomain ? file : noindex(file);
      }
    }

    // 6. Old links with WordPress's extras on the end (see oldAddress).
    if (res.status === 404 && onDomain) {
      const to = await oldAddress(env, url.origin, path);
      if (to) return Response.redirect(url.origin + to, 301);
    }
    return onDomain ? res : noindex(res);
  },
};
