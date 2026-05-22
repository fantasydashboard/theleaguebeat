// api/i/[shareSlug].js
//
// Server-rendered shell for the public share route `/i/:shareSlug`.
//
// Why this exists: link-preview bots (iMessage, Slack, Discord,
// Twitter, etc) don't execute the SPA's JavaScript, so any OG meta
// tags injected client-side in PublicShareView are invisible to them.
// This function intercepts the same URL on the server, fetches the
// league row server-side, and returns the SPA's index.html with the
// per-issue OG tags already inlined. The SPA still mounts and takes
// over interactivity once JS runs in a real browser.
//
// Flow:
//   1. Pull the league row via the same SERVICE_ROLE Supabase channel
//      /api/share uses.
//   2. Fetch /index.html from this same deployment (so we always serve
//      the latest built shell — no need to bundle it with the function).
//   3. Replace the static OG / Twitter / title tags with per-issue
//      versions pointing at /api/og/:shareSlug for the rich preview.
//
// Vercel wiring: paired with a rewrite in vercel.json so /i/:slug
// resolves here instead of falling through to the SPA catch-all.
//
// Env vars required:
//   - VITE_SUPABASE_URL
//   - SUPABASE_SERVICE_ROLE_KEY

export const config = { runtime: 'nodejs' }

const SELECT_COLS = [
  'id', 'platform', 'sport', 'league_name', 'season',
].join(',')

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

function escapeHtml(s) {
  if (s == null) return ''
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

async function fetchLeague(shareSlug) {
  const SUPABASE_URL = process.env.VITE_SUPABASE_URL
  const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) return null

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

/** Strip the default OG / title / description tags from the index.html
 *  shell so we can replace them with per-issue values. Targets are
 *  pinned to specific attribute matches to avoid removing the
 *  fb-pixel script's tags or the JSON-LD blocks. */
function stripDefaultMeta(html) {
  return html
    .replace(/<title>[\s\S]*?<\/title>/, '')
    .replace(/<meta[^>]+name=["']description["'][^>]*>\s*/i, '')
    .replace(/<link[^>]+rel=["']canonical["'][^>]*>\s*/i, '')
    .replace(/<meta[^>]+property=["']og:type["'][^>]*>\s*/i, '')
    .replace(/<meta[^>]+property=["']og:title["'][^>]*>\s*/i, '')
    .replace(/<meta[^>]+property=["']og:description["'][^>]*>\s*/i, '')
    .replace(/<meta[^>]+property=["']og:url["'][^>]*>\s*/i, '')
    .replace(/<meta[^>]+property=["']og:image["'][^>]*>\s*/i, '')
    .replace(/<meta[^>]+property=["']og:image:width["'][^>]*>\s*/i, '')
    .replace(/<meta[^>]+property=["']og:image:height["'][^>]*>\s*/i, '')
    .replace(/<meta[^>]+name=["']twitter:card["'][^>]*>\s*/i, '')
    .replace(/<meta[^>]+name=["']twitter:title["'][^>]*>\s*/i, '')
    .replace(/<meta[^>]+name=["']twitter:description["'][^>]*>\s*/i, '')
    .replace(/<meta[^>]+name=["']twitter:image["'][^>]*>\s*/i, '')
}

function buildMetaBlock({ title, description, pageUrl, ogImage }) {
  return `
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <link rel="canonical" href="${escapeHtml(pageUrl)}" />
    <meta property="og:type" content="article" />
    <meta property="og:site_name" content="The League Beat" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:url" content="${escapeHtml(pageUrl)}" />
    <meta property="og:image" content="${escapeHtml(ogImage)}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(title)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    <meta name="twitter:image" content="${escapeHtml(ogImage)}" />
  `
}

export default async function handler(req, res) {
  // Parse slug — Vercel exposes it in req.query when the file is
  // named with brackets, but fall back to URL parsing for safety.
  let shareSlug = req.query?.shareSlug
  if (Array.isArray(shareSlug)) shareSlug = shareSlug[0]
  if (!shareSlug) {
    const segments = (req.url || '').split('/').filter(Boolean)
    shareSlug = segments[segments.length - 1]?.split('?')[0]
  }

  const host = req.headers['x-forwarded-host'] || req.headers.host
  const proto = req.headers['x-forwarded-proto'] || 'https'
  const origin = `${proto}://${host}`
  const pageUrl = `${origin}/i/${encodeURIComponent(shareSlug || '')}`
  const ogImage = `${origin}/api/og/${encodeURIComponent(shareSlug || '')}`

  const isUuid = shareSlug && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(shareSlug)
  const league = isUuid ? await fetchLeague(shareSlug) : null

  const title = league
    ? `${league.league_name} — The League Beat`
    : 'The League Beat — Your league story, chronicled.'
  const description = league
    ? `This week's issue for ${league.league_name}. ${platformLabel(league.platform)} · ${titleizeSport(league.sport)} · ${league.season}.`
    : 'The online magazine your fantasy league deserves.'

  // Pull the SPA shell from the same deployment. We do this rather
  // than bundling index.html into the function so a Vite rebuild with
  // updated assets is reflected without redeploying this handler.
  let shellHtml = ''
  try {
    const shellRes = await fetch(`${origin}/index.html`, {
      headers: { 'cache-control': 'no-cache' },
    })
    if (shellRes.ok) {
      shellHtml = await shellRes.text()
    }
  } catch (err) {
    console.error('[api/i] failed to fetch SPA shell:', err)
  }

  // Defensive: if the shell fetch failed (cold deploy, edge issue),
  // emit a minimal stub that still carries the OG tags so previews
  // work even if the page itself takes a moment to render.
  if (!shellHtml) {
    const fallback = `<!doctype html><html lang="en"><head><meta charset="UTF-8" />${buildMetaBlock({ title, description, pageUrl, ogImage })}</head><body><div id="app"></div></body></html>`
    res.setHeader('content-type', 'text/html; charset=utf-8')
    res.setHeader('cache-control', 'public, s-maxage=60, stale-while-revalidate=300')
    return res.status(200).send(fallback)
  }

  const stripped = stripDefaultMeta(shellHtml)
  const metaBlock = buildMetaBlock({ title, description, pageUrl, ogImage })

  // Insert our per-issue meta right after <head> so it overrides
  // anything Vite may inject. Bots read top-down; first match wins
  // for most parsers but we keep it as the only matching block to
  // avoid surprises.
  const out = stripped.replace(/<head>/i, `<head>\n    ${metaBlock.trim()}\n`)

  res.setHeader('content-type', 'text/html; charset=utf-8')
  res.setHeader('cache-control', 'public, s-maxage=60, stale-while-revalidate=300')
  return res.status(league ? 200 : 404).send(out)
}
