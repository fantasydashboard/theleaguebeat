// api/adp.js
//
// ADP proxy for the draft slides.
//
// Fantasy Football Calculator publishes average draft position from
// the drafts run on its site — currently ~8,000 a week in season, and
// broken out per scoring format. It is the baseline the draft deck
// measures steals and reaches against, replacing Sleeper's
// `search_rank` (a prominence ordering that correlates with real draft
// order at 0.54, against ADP's 0.91).
//
// It exists as a proxy for one reason: FFC returns no
// `Access-Control-Allow-Origin` header, so the browser cannot fetch it
// directly. Everything else here is caching and validation.
//
// Caching is deliberately aggressive. ADP moves slowly — it is an
// average over thousands of drafts — and every viewer of a given
// league's draft deck wants the identical payload. Six hours at the
// edge means one upstream request per format per six hours across all
// users, rather than one per page view.

export const config = { runtime: 'nodejs' }

/* The formats FFC publishes. Validated as an allowlist rather than
   interpolated, so this endpoint can't be pointed at arbitrary paths. */
const FORMATS = new Set(['standard', 'half-ppr', 'ppr', '2qb', 'dynasty'])

/* Sanity bounds on the season. Keeps a malformed `year` from becoming
   part of the upstream URL. */
const MIN_YEAR = 2010
const MAX_YEAR = 2100

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')

  if (req.method === 'OPTIONS') {
    return res.status(204).end()
  }

  const format = typeof req.query.format === 'string' ? req.query.format : 'ppr'
  if (!FORMATS.has(format)) {
    return res.status(400).json({ error: `Unknown format: ${format}` })
  }

  const year = Number(req.query.year)
  if (!Number.isInteger(year) || year < MIN_YEAR || year > MAX_YEAR) {
    return res.status(400).json({ error: 'Missing or malformed year.' })
  }

  // FFC also accepts a `teams` parameter, and deliberately not passed:
  // it is ignored upstream. Requesting 8-team and 14-team ADP returns
  // byte-identical payloads (verified: 264 players, 8,007 drafts, zero
  // differing values). League size is instead applied on our side, by
  // scaling ADP against the sample's own league size — see
  // `buildAdpLookup` in src/editorial/points/adp.ts.
  const url = `https://fantasyfootballcalculator.com/api/v1/adp/${format}?year=${year}`

  try {
    const upstream = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'theleaguebeat.com (+https://theleaguebeat.com)',
      },
    })

    if (!upstream.ok) {
      // Short cache on failure so a transient upstream problem doesn't
      // get pinned at the edge for six hours.
      res.setHeader('Cache-Control', 'public, max-age=60')
      return res
        .status(upstream.status >= 500 ? 502 : upstream.status)
        .json({ error: `Upstream returned ${upstream.status}.` })
    }

    const body = await upstream.json()

    res.setHeader('Content-Type', 'application/json')
    res.setHeader(
      'Cache-Control',
      'public, max-age=3600, s-maxage=21600, stale-while-revalidate=86400',
    )
    return res.status(200).json(body)
  } catch (err) {
    console.error('[adp] fetch failed:', err)
    res.setHeader('Cache-Control', 'public, max-age=60')
    return res.status(502).json({ error: 'ADP fetch failed.' })
  }
}
