// api/proxy-image.js
//
// Image proxy for cross-origin team logos that browsers can't fetch
// directly. The headline use case is ESPN custom-uploaded league
// logos served from `mystique-api.fantasy.espn.com`, which require
// the user's ESPN auth cookies AND don't return permissive CORS
// headers — so a plain <img> tag from our domain 401s.
//
// This proxy:
//   1. Takes a `url` query param (the upstream image URL).
//   2. Whitelists the source domain to prevent SSRF.
//   3. For ESPN URLs, forwards the user's `espn_s2` + `swid` cookies
//      passed in as query params (the user already has them in the
//      browser via the platforms store; we just hand them off
//      server-side so the fetch succeeds).
//   4. Streams the image bytes back with permissive CORS + an
//      aggressive cache header so the browser only hits the proxy
//      once per image per day.
//
// Security note: passing ESPN cookies in query strings means they
// land in server access logs. The cookies are scoped to the user's
// ESPN account and only grant read access to fantasy data they
// already have. The tradeoff is acceptable for image fetching;
// nothing more sensitive is exposed.
//
// To extend to a new platform, add the domain to ALLOWED_HOSTS and
// (if it needs auth) add the cookie-forwarding logic below.

export const config = { runtime: 'nodejs' }

/* Hostnames we're willing to proxy. Anything else returns 400 so the
   endpoint can't be used as an open SSRF relay. */
const ALLOWED_HOSTS = new Set([
  // ESPN custom-uploaded league + team logos (auth-gated)
  'mystique-api.fantasy.espn.com',
  // ESPN public CDN (no auth) — included for consistency
  'a.espncdn.com',
  'g.espncdn.com',
  // Yahoo CDNs
  's.yimg.com',
  'l.yimg.com',
  // Sleeper CDN
  'sleepercdn.com',
  // Fantrax CDNs
  'www.fantrax.com',
  'images.fantrax.com',
])

/* Hostnames that REQUIRE ESPN auth cookies to return content. */
const ESPN_AUTH_HOSTS = new Set([
  'mystique-api.fantasy.espn.com',
])

/* 1x1 transparent PNG, returned when the upstream fetch fails so the
   browser doesn't render a "broken image" icon. */
const TRANSPARENT_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64',
)

export default async function handler(req, res) {
  // CORS — proxy is called from our own SPA but allow all so future
  // public-share URLs work too.
  res.setHeader('Access-Control-Allow-Origin', '*')

  if (req.method === 'OPTIONS') {
    return res.status(204).end()
  }

  const url = typeof req.query.url === 'string' ? req.query.url : null
  if (!url) {
    return res.status(400).json({ error: 'Missing url query param.' })
  }

  let target
  try {
    target = new URL(url)
  } catch {
    return res.status(400).json({ error: 'Malformed url.' })
  }

  if (!ALLOWED_HOSTS.has(target.hostname)) {
    return res
      .status(400)
      .json({ error: `Host not whitelisted: ${target.hostname}` })
  }

  // Build fetch headers. For ESPN-authed hosts, fold the user's
  // espn_s2 + swid query params into a Cookie header.
  const fetchHeaders = {
    // ESPN occasionally serves different responses depending on UA;
    // a normal browser UA is what we want.
    'User-Agent':
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
      '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    Accept: 'image/avif,image/webp,image/png,image/*,*/*;q=0.8',
  }

  if (ESPN_AUTH_HOSTS.has(target.hostname)) {
    const espnS2 = typeof req.query.espn_s2 === 'string' ? req.query.espn_s2 : null
    const swid = typeof req.query.swid === 'string' ? req.query.swid : null
    if (espnS2 && swid) {
      // ESPN expects the SWID with surrounding curly braces. Tolerate
      // either form coming in (with or without braces) and normalize.
      const swidNormalized = swid.startsWith('{') ? swid : `{${swid}}`
      fetchHeaders.Cookie = `espn_s2=${espnS2}; SWID=${swidNormalized}`
    }
  }

  try {
    const upstream = await fetch(target.toString(), {
      headers: fetchHeaders,
      redirect: 'follow',
    })

    if (!upstream.ok) {
      // Image fetch failed (401 from ESPN, 404 from anywhere). Return
      // a transparent PNG so the <img> tag's @error handler fires
      // cleanly instead of showing a broken icon. The caller can
      // still detect the failure via the response status if needed.
      res.setHeader('Content-Type', 'image/png')
      res.setHeader('Cache-Control', 'public, max-age=300')
      res.setHeader('X-Proxy-Status', String(upstream.status))
      return res.status(upstream.status >= 500 ? 502 : 404).send(TRANSPARENT_PNG)
    }

    const contentType = upstream.headers.get('content-type') || 'image/png'
    const buffer = Buffer.from(await upstream.arrayBuffer())

    res.setHeader('Content-Type', contentType)
    // Cache aggressively — team logos rarely change. 1 day client +
    // 7 days at the CDN edge with stale-while-revalidate.
    res.setHeader(
      'Cache-Control',
      'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400',
    )
    return res.status(200).send(buffer)
  } catch (err) {
    console.error('[proxy-image] fetch failed:', err)
    res.setHeader('Content-Type', 'image/png')
    res.setHeader('Cache-Control', 'public, max-age=60')
    return res.status(502).send(TRANSPARENT_PNG)
  }
}
