// api/og/[shareSlug].js
//
// Rich Open Graph preview image for the public share route at
// /i/:shareSlug. Renders a 1200×630 PNG using @vercel/og so that
// iMessage / Slack / Discord / etc show a magazine-style preview
// card when a recipient pastes the share URL.
//
// Behavior:
//   - Reads the `leagues` row via the same service-role channel the
//     /api/share endpoint uses (no per-user RLS exposure — the column
//     allowlist below mirrors that endpoint).
//   - Composes a brand-consistent card: TLB monogram up top, league
//     name in Barlow Black, then a "Read the latest issue" affordance.
//   - Falls back to the static /tlb-og.png semantics (TLB-only
//     branding, no league name) when the row can't be fetched.
//
// Env vars (Vercel project settings):
//   - VITE_SUPABASE_URL
//   - SUPABASE_SERVICE_ROLE_KEY

import { ImageResponse } from '@vercel/og'

export const config = { runtime: 'edge' }

function h(type, props, ...children) {
  return { type, props: { ...(props || {}), children: children.flat().filter((c) => c !== null && c !== undefined && c !== false) } }
}

function platformLabel(p) {
  if (p === 'espn') return 'ESPN'
  if (p === 'yahoo') return 'Yahoo'
  if (p === 'sleeper') return 'Sleeper'
  if (p === 'fantrax') return 'Fantrax'
  return p ? p[0].toUpperCase() + p.slice(1) : ''
}

function titleizeSport(s) {
  if (!s) return ''
  return s[0].toUpperCase() + s.slice(1)
}

async function fetchLeague(shareSlug) {
  const SUPABASE_URL = process.env.VITE_SUPABASE_URL
  const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) return null

  const SELECT_COLS = [
    'id', 'platform', 'sport', 'league_name', 'season', 'team_name', 'league_size',
  ].join(',')

  const url = `${SUPABASE_URL}/rest/v1/leagues?id=eq.${encodeURIComponent(shareSlug)}&select=${encodeURIComponent(SELECT_COLS)}&limit=1`

  try {
    const r = await fetch(url, {
      headers: {
        apikey: SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        Accept: 'application/json',
      },
    })
    if (!r.ok) return null
    const rows = await r.json()
    return Array.isArray(rows) && rows.length > 0 ? rows[0] : null
  } catch {
    return null
  }
}

export default async function handler(req) {
  const url = new URL(req.url)
  const segments = url.pathname.split('/').filter(Boolean)
  const shareSlug = segments[segments.length - 1]

  const isUuid = shareSlug && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(shareSlug)

  const league = isUuid ? await fetchLeague(shareSlug) : null

  const leagueName = league?.league_name || 'A league in The League Beat'
  const metaLine = league
    ? `${platformLabel(league.platform)} · ${titleizeSport(league.sport)} · ${league.season}`
    : 'The online magazine your league deserves'

  // Brand tokens — mirror the league shell. Plain JS to avoid JSX in api.
  const INK_1 = 'oklch(0.97 0.005 90)'
  const INK_3 = 'oklch(0.55 0.010 90)'
  const ACCENT_PRIMARY = 'oklch(0.78 0.18 92)'
  const ACCENT_UP = 'oklch(0.74 0.18 145)'
  const BG = 'oklch(0.08 0.014 90)'
  const BG_PANEL = 'oklch(0.10 0.015 90)'

  const tree = h(
    'div',
    {
      style: {
        width: '1200px',
        height: '630px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        background: BG,
        backgroundImage: `radial-gradient(ellipse 800px 500px at 85% 15%, oklch(0.74 0.18 145 / 0.10), transparent 70%), radial-gradient(ellipse 700px 500px at 10% 95%, oklch(0.78 0.18 92 / 0.08), transparent 70%)`,
        color: INK_1,
        padding: '64px 72px',
        fontFamily: '"Barlow", system-ui, sans-serif',
      },
    },
    // Masthead row
    h(
      'div',
      { style: { display: 'flex', alignItems: 'center', gap: '14px' } },
      h('div', {
        style: {
          width: '44px',
          height: '44px',
          borderRadius: '8px',
          background: ACCENT_PRIMARY,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: BG,
          fontWeight: 900,
          fontSize: '24px',
          letterSpacing: '-0.02em',
        },
      }, 'TLB'),
      h('div', {
        style: {
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontFamily: '"Barlow Condensed", "Barlow", sans-serif',
          fontSize: '22px',
          fontWeight: 800,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: INK_1,
        },
      }, 'The League Beat'),
      h('div', {
        style: {
          marginLeft: '8px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 12px',
          borderRadius: '999px',
          border: `1px solid oklch(0.74 0.18 145 / 0.35)`,
          background: `oklch(0.74 0.18 145 / 0.10)`,
          color: ACCENT_UP,
          fontFamily: '"Barlow Condensed", "Barlow", sans-serif',
          fontSize: '16px',
          fontWeight: 800,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
        },
      },
        h('div', { style: { width: '8px', height: '8px', borderRadius: '50%', background: ACCENT_UP } }),
        'Live issue',
      ),
    ),

    // Headline block
    h(
      'div',
      { style: { display: 'flex', flexDirection: 'column', gap: '18px', maxWidth: '1000px' } },
      h('div', {
        style: {
          fontFamily: '"Barlow Condensed", "Barlow", sans-serif',
          fontSize: '20px',
          fontWeight: 800,
          letterSpacing: '0.20em',
          textTransform: 'uppercase',
          color: ACCENT_PRIMARY,
        },
      }, 'This week\'s issue'),
      h('div', {
        style: {
          fontFamily: '"Barlow Condensed", "Barlow", sans-serif',
          fontSize: leagueName.length > 32 ? '74px' : '96px',
          fontWeight: 900,
          letterSpacing: '-0.015em',
          lineHeight: 0.96,
          color: INK_1,
          display: 'flex',
        },
      }, leagueName),
      h('div', {
        style: {
          fontSize: '24px',
          fontWeight: 500,
          color: INK_3,
          letterSpacing: '0.02em',
          display: 'flex',
        },
      }, metaLine),
    ),

    // Footer row
    h(
      'div',
      {
        style: {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingTop: '24px',
          borderTop: `1px solid oklch(0.20 0.015 90)`,
        },
      },
      h('div', {
        style: {
          fontFamily: '"Barlow Condensed", "Barlow", sans-serif',
          fontSize: '20px',
          fontWeight: 800,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: INK_3,
        },
      }, 'Your league story, chronicled.'),
      h('div', {
        style: {
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '10px 18px',
          borderRadius: '999px',
          background: ACCENT_PRIMARY,
          color: BG_PANEL,
          fontFamily: '"Barlow Condensed", "Barlow", sans-serif',
          fontSize: '20px',
          fontWeight: 900,
          letterSpacing: '0.06em',
        },
      }, 'Read the issue →'),
    ),
  )

  return new ImageResponse(tree, {
    width: 1200,
    height: 630,
    headers: {
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=86400',
    },
  })
}
