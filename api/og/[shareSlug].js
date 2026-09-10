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

/** Most-recently-archived issue number for this league, if any.
 *  Reads from `league_issues` (the new archive table). Returns null
 *  when no snapshots exist yet — caller renders the generic eyebrow
 *  ("This week's issue") instead of an issue number. */
async function fetchLatestIssueNumber(shareSlug) {
  const SUPABASE_URL = process.env.VITE_SUPABASE_URL
  const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) return null

  const url = `${SUPABASE_URL}/rest/v1/league_issues?league_id=eq.${encodeURIComponent(shareSlug)}&select=week_number,year&order=year.desc,week_number.desc&limit=1`

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
    if (!Array.isArray(rows) || rows.length === 0) return null
    return rows[0].week_number ?? null
  } catch {
    return null
  }
}

export default async function handler(req) {
  const url = new URL(req.url)
  const segments = url.pathname.split('/').filter(Boolean)
  const shareSlug = segments[segments.length - 1]

  const isUuid = shareSlug && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(shareSlug)

  const [league, latestIssue] = isUuid
    ? await Promise.all([fetchLeague(shareSlug), fetchLatestIssueNumber(shareSlug)])
    : [null, null]

  const leagueName = league?.league_name || 'A league in The League Beat'
  const metaLine = league
    ? `${platformLabel(league.platform)} · ${titleizeSport(league.sport)} · ${league.season}`
    : 'The online magazine your league deserves'
  const eyebrowText = latestIssue != null ? `Issue ${latestIssue}` : "This week's issue"

  // Brand tokens — mirror the league shell. Plain JS to avoid JSX in api.
  const INK_1 = '#f6f5f1'
  const INK_3 = '#74716b'
  const ACCENT_PRIMARY = '#e1b100'
  const ACCENT_UP = '#53c75d'
  const BG = '#020200'
  const BG_PANEL = '#050301'
  const BORDER = '#19160e'

  // The real lockup, not a monogram. Fetched from our own origin and
  // inlined, so a failed fetch degrades to the wordmark instead of
  // taking the whole render down with it.
  let logoDataUri = null
  try {
    const logoRes = await fetch(new URL('/tlb-logo-primary.png', req.url).toString())
    if (logoRes.ok) {
      const bytes = new Uint8Array(await logoRes.arrayBuffer())
      let bin = ''
      for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i])
      logoDataUri = `data:image/png;base64,${btoa(bin)}`
    }
  } catch {
    /* wordmark fallback below */
  }

  const stageLine = [platformLabel(league?.platform), titleizeSport(league?.sport), league?.season]
    .filter(Boolean)
    .join(' · ')

  const tree = h(
    'div',
    {
      style: {
        width: '1200px',
        height: '630px',
        display: 'flex',
        flexDirection: 'column',
        background: BG,
        backgroundImage: `radial-gradient(ellipse 800px 500px at 85% 15%, rgba(83, 199, 93, 0.10), transparent 70%), radial-gradient(ellipse 700px 500px at 10% 95%, rgba(225, 177, 0, 0.08), transparent 70%)`,
        color: INK_1,
        padding: '58px 72px',
        fontFamily: '"Barlow", system-ui, sans-serif',
      },
    },

    // Masthead — the real logo, at a size it can be read at.
    h(
      'div',
      { style: { display: 'flex', alignItems: 'center', flexShrink: 0 } },
      logoDataUri
        ? h('img', { src: logoDataUri, width: 340, height: 129, style: { display: 'flex' } })
        : h('div', {
            style: {
              display: 'flex',
              fontFamily: '"Barlow Condensed", "Barlow", sans-serif',
              fontSize: '34px',
              fontWeight: 900,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: INK_1,
            },
          }, 'The League Beat'),
    ),

    // The league, filling what used to be dead space.
    h(
      'div',
      {
        style: {
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          flexGrow: 1,
          gap: '14px',
        },
      },
      h('div', {
        style: {
          display: 'flex',
          fontFamily: '"Barlow Condensed", "Barlow", sans-serif',
          fontSize: '22px',
          fontWeight: 800,
          letterSpacing: '0.22em',
          textTransform: 'uppercase',
          color: ACCENT_PRIMARY,
        },
      }, eyebrowText),
      h('div', {
        style: {
          display: 'flex',
          fontFamily: '"Barlow Condensed", "Barlow", sans-serif',
          fontSize: leagueName.length > 30 ? '82px' : '104px',
          fontWeight: 900,
          letterSpacing: '-0.02em',
          lineHeight: 0.94,
          color: INK_1,
        },
      }, leagueName),
      stageLine
        ? h('div', {
            style: {
              display: 'flex',
              fontSize: '26px',
              fontWeight: 500,
              color: INK_3,
              letterSpacing: '0.02em',
            },
          }, stageLine)
        : null,
    ),

    // Foot. No fake button — the whole card is already the link.
    h(
      'div',
      {
        style: {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
          paddingTop: '24px',
          borderTop: `1px solid ${BORDER}`,
        },
      },
      h('div', {
        style: {
          display: 'flex',
          fontFamily: '"Barlow Condensed", "Barlow", sans-serif',
          fontSize: '21px',
          fontWeight: 800,
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          color: INK_3,
        },
      }, 'Your league story, chronicled.'),
      h('div', {
        style: {
          display: 'flex',
          fontFamily: '"Barlow Condensed", "Barlow", sans-serif',
          fontSize: '21px',
          fontWeight: 900,
          letterSpacing: '0.10em',
          textTransform: 'uppercase',
          color: ACCENT_PRIMARY,
        },
      }, 'theleaguebeat.com'),
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
