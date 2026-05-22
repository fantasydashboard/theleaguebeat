// api/share/[shareSlug].js
//
// Public, read-only endpoint that returns a single `leagues` row keyed
// by the URL `shareSlug` (the league's Supabase UUID). Used by the
// PublicShareView SPA route at `/i/:shareSlug` so anonymous visitors
// can read someone else's league issue without signing in or having
// the row's RLS rewritten.
//
// Uses the SERVICE_ROLE key server-side to bypass per-user RLS. We
// only return the minimum fields the public view needs — `user_id`
// is intentionally stripped from the response so we don't leak the
// owner's identity to the recipient.
//
// Env vars required (set in Vercel project settings):
//   - VITE_SUPABASE_URL                (already configured for the proxy)
//   - SUPABASE_SERVICE_ROLE_KEY        (new — service-role key for cross-user reads)

export const config = { runtime: 'nodejs' }

export default async function handler(req, res) {
  const SUPABASE_URL = process.env.VITE_SUPABASE_URL
  const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300')

  if (req.method === 'OPTIONS') {
    return res.status(204).end()
  }

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return res.status(500).json({
      error: 'Server is missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.',
    })
  }

  // Parse the slug from either the dynamic param (Vercel) or the URL
  // path (in case the function is hit directly).
  let shareSlug = req.query?.shareSlug
  if (Array.isArray(shareSlug)) shareSlug = shareSlug[0]
  if (!shareSlug) {
    const segments = (req.url || '').split('/').filter(Boolean)
    shareSlug = segments[segments.length - 1]?.split('?')[0]
  }

  // UUID-ish validation — keeps the proxy from forwarding arbitrary
  // path tokens (basic v4 shape; tolerant of v1/v5 etc).
  if (!shareSlug || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(shareSlug)) {
    return res.status(400).json({ error: 'Invalid share slug.' })
  }

  // Restrict the columns to what the public view needs. Notably we
  // OMIT `user_id` and `settings` so we don't leak the owner's identity
  // or any commissioner-only configuration.
  const SELECT_COLS = [
    'id',
    'platform',
    'sport',
    'platform_league_id',
    'league_name',
    'season',
    'team_name',
    'team_id',
    'league_size',
    'is_active',
    'last_synced_at',
  ].join(',')

  const targetUrl = `${SUPABASE_URL}/rest/v1/leagues?id=eq.${encodeURIComponent(shareSlug)}&select=${encodeURIComponent(SELECT_COLS)}&limit=1`

  try {
    const upstream = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        apikey: SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        Accept: 'application/json',
      },
    })

    if (!upstream.ok) {
      const text = await upstream.text()
      return res.status(upstream.status).json({
        error: 'Upstream Supabase error.',
        detail: text.slice(0, 500),
      })
    }

    const rows = await upstream.json()
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(404).json({ error: 'League not found.' })
    }

    return res.status(200).json({ league: rows[0] })
  } catch (err) {
    console.error('[api/share] error:', err)
    return res.status(502).json({ error: 'Proxy error', message: err?.message })
  }
}
