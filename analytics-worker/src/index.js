/**
 * Cloudflare Web Analytics -> admin dashboard.
 *
 * The admin screen needs numbers that only Cloudflare's GraphQL Analytics API
 * has, but the browser can't fetch them itself: api.cloudflare.com returns no
 * Access-Control-Allow-Origin and rejects the CORS preflight, and the API token
 * required to read the data would be exposed to anyone opening the page. So the
 * token lives here as a Worker secret and the browser talks only to this Worker.
 *
 * This is deliberately NOT a general GraphQL proxy. It builds one fixed query
 * from a whitelisted day count and returns aggregated JSON, so a leaked
 * dashboard key can't be turned into arbitrary access to the Cloudflare account.
 *
 * Bindings:
 *   CF_ACCOUNT_ID  var     account the Web Analytics site belongs to
 *   CF_SITE_TAG    var     which Web Analytics site to report on
 *   CF_API_TOKEN   secret  Cloudflare API token, Account Analytics: Read
 *   DASH_KEY       secret  shared key the dashboard sends; omit to leave open
 */

const GRAPHQL = 'https://api.cloudflare.com/client/v4/graphql';
const ALLOWED_DAYS = [1, 7, 30, 90];

const cors = (origin) => ({
  // The admin page is opened from disk during the mockup phase, which sends
  // `Origin: null`, so echoing the origin back is the only thing that works.
  'Access-Control-Allow-Origin': origin || '*',
  'Access-Control-Allow-Methods': 'GET,OPTIONS',
  'Access-Control-Allow-Headers': 'content-type,x-dash-key',
  'Access-Control-Max-Age': '86400',
  Vary: 'Origin',
});

const json = (body, status, origin) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', ...cors(origin) },
  });

/** One query for the whole screen — a dashboard refresh is a single round trip. */
const QUERY = `
query Dash($account: String!, $site: String!, $start: Time!, $end: Time!, $startDate: Date!, $endDate: Date!) {
  viewer {
    accounts(filter: { accountTag: $account }) {
      totals: rumPageloadEventsAdaptiveGroups(
        filter: { siteTag: $site, datetime_geq: $start, datetime_leq: $end, bot: 0 }, limit: 1
      ) { count sum { visits } }

      byDate: rumPageloadEventsAdaptiveGroups(
        filter: { siteTag: $site, date_geq: $startDate, date_leq: $endDate, bot: 0 }
        limit: 200, orderBy: [date_ASC]
      ) { count sum { visits } dimensions { date } }

      topPages: rumPageloadEventsAdaptiveGroups(
        filter: { siteTag: $site, datetime_geq: $start, datetime_leq: $end, bot: 0 }
        limit: 20, orderBy: [count_DESC]
      ) { count sum { visits } dimensions { requestPath } }

      referrers: rumPageloadEventsAdaptiveGroups(
        filter: { siteTag: $site, datetime_geq: $start, datetime_leq: $end, bot: 0 }
        limit: 20, orderBy: [count_DESC]
      ) { count dimensions { refererHost } }

      countries: rumPageloadEventsAdaptiveGroups(
        filter: { siteTag: $site, datetime_geq: $start, datetime_leq: $end, bot: 0 }
        limit: 20, orderBy: [count_DESC]
      ) { count sum { visits } dimensions { countryName } }

      devices: rumPageloadEventsAdaptiveGroups(
        filter: { siteTag: $site, datetime_geq: $start, datetime_leq: $end, bot: 0 }
        limit: 10, orderBy: [count_DESC]
      ) { count dimensions { deviceType } }

      browsers: rumPageloadEventsAdaptiveGroups(
        filter: { siteTag: $site, datetime_geq: $start, datetime_leq: $end, bot: 0 }
        limit: 10, orderBy: [count_DESC]
      ) { count dimensions { userAgentBrowser } }

      systems: rumPageloadEventsAdaptiveGroups(
        filter: { siteTag: $site, datetime_geq: $start, datetime_leq: $end, bot: 0 }
        limit: 10, orderBy: [count_DESC]
      ) { count dimensions { userAgentOS } }

      vitals: rumWebVitalsEventsAdaptiveGroups(
        filter: { siteTag: $site, datetime_geq: $start, datetime_leq: $end, bot: 0 }, limit: 1
      ) {
        count
        quantiles {
          largestContentfulPaintP75
          interactionToNextPaintP75
          cumulativeLayoutShiftP75
          firstContentfulPaintP75
          timeToFirstByteP75
        }
      }
    }
  }
}`;

/** Collapses a grouped result into [{name, views, visits}], newest concerns first. */
const rows = (list, key) =>
  (list || []).map((r) => ({
    name: r.dimensions?.[key] ?? '',
    views: Number(r.count || 0),
    visits: Number(r.sum?.visits || 0),
  }));

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin');
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(origin) });
    if (request.method !== 'GET') return json({ error: 'method_not_allowed' }, 405, origin);

    const url = new URL(request.url);
    if (url.pathname === '/health') return json({ ok: true, siteConfigured: Boolean(env.CF_SITE_TAG) }, 200, origin);
    if (url.pathname !== '/api/analytics') return json({ error: 'not_found' }, 404, origin);

    if (env.DASH_KEY) {
      const given = request.headers.get('x-dash-key') || url.searchParams.get('key');
      if (given !== env.DASH_KEY) return json({ error: 'unauthorized' }, 401, origin);
    }
    if (!env.CF_SITE_TAG) return json({ error: 'site_tag_missing' }, 503, origin);
    // Without this the fetch below sends `Bearer undefined` and Cloudflare
    // answers with an opaque auth error, which reads as "the dashboard is
    // broken" rather than "one secret has not been set yet".
    if (!env.CF_API_TOKEN) return json({ error: 'api_token_missing' }, 503, origin);

    const days = Number(url.searchParams.get('days') || 7);
    if (!ALLOWED_DAYS.includes(days)) {
      return json({ error: 'bad_days', allowed: ALLOWED_DAYS }, 400, origin);
    }

    const end = new Date();
    const start = new Date(end.getTime() - days * 864e5);
    const iso = (d) => d.toISOString().replace(/\.\d{3}Z$/, 'Z');
    const day = (d) => d.toISOString().slice(0, 10);

    let payload;
    try {
      const res = await fetch(GRAPHQL, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${env.CF_API_TOKEN}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          query: QUERY,
          variables: {
            account: env.CF_ACCOUNT_ID,
            site: env.CF_SITE_TAG,
            start: iso(start),
            end: iso(end),
            startDate: day(start),
            endDate: day(end),
          },
        }),
      });
      payload = await res.json();
    } catch (err) {
      return json({ error: 'upstream_unreachable', detail: String(err) }, 502, origin);
    }

    if (payload.errors?.length) {
      // Surface Cloudflare's own message — "no such site tag" and "token lacks
      // Analytics:Read" are the two failures worth telling the operator about.
      return json({ error: 'graphql_error', detail: payload.errors.map((e) => e.message) }, 502, origin);
    }

    const acc = payload.data?.viewer?.accounts?.[0];
    if (!acc) return json({ error: 'no_account_data' }, 502, origin);

    const totals = acc.totals?.[0];
    const vitals = acc.vitals?.[0];

    return json(
      {
        range: { days, from: day(start), to: day(end) },
        totals: {
          views: Number(totals?.count || 0),
          visits: Number(totals?.sum?.visits || 0),
        },
        byDate: (acc.byDate || []).map((r) => ({
          date: r.dimensions.date,
          views: Number(r.count || 0),
          visits: Number(r.sum?.visits || 0),
        })),
        topPages: rows(acc.topPages, 'requestPath'),
        referrers: rows(acc.referrers, 'refererHost'),
        countries: rows(acc.countries, 'countryName'),
        devices: rows(acc.devices, 'deviceType'),
        browsers: rows(acc.browsers, 'userAgentBrowser'),
        systems: rows(acc.systems, 'userAgentOS'),
        vitals: {
          samples: Number(vitals?.count || 0),
          lcp: vitals?.quantiles?.largestContentfulPaintP75 ?? null,
          inp: vitals?.quantiles?.interactionToNextPaintP75 ?? null,
          cls: vitals?.quantiles?.cumulativeLayoutShiftP75 ?? null,
          fcp: vitals?.quantiles?.firstContentfulPaintP75 ?? null,
          ttfb: vitals?.quantiles?.timeToFirstByteP75 ?? null,
        },
        generatedAt: new Date().toISOString(),
      },
      200,
      origin,
    );
  },
};
