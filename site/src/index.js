// www.waldorf.co.il: the static site (site/dist, built by site/build.mjs) plus
// the few things static files cannot do on their own. Runs before every asset
// (run_worker_first), so each branch here is cheap and returns early.
import POST_IDS from '../post-ids.json';

const CANONICAL = 'www.waldorf.co.il';
const UPLOADS = '/wp-content/uploads/';

// The workers.dev address serves the same pages without the noindex meta, so
// it says noindex in a header instead: one public copy for Google, not two.
const noindex = (res) => {
  const out = new Response(res.body, res);
  out.headers.set('X-Robots-Tag', 'noindex, nofollow');
  return out;
};

export default {
  async fetch(request, env) {
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
    if (res.status === 404 && path.startsWith(UPLOADS)) {
      let key;
      try { key = decodeURIComponent(path).slice(1); } catch { return res; }
      const obj = await env.UPLOADS.get(key);
      if (obj) {
        const headers = new Headers();
        obj.writeHttpMetadata(headers);
        headers.set('etag', obj.httpEtag);
        headers.set('cache-control', 'public, max-age=31536000, immutable');
        const file = new Response(request.method === 'HEAD' ? null : obj.body, { headers });
        return onDomain ? file : noindex(file);
      }
    }
    return onDomain ? res : noindex(res);
  },
};
