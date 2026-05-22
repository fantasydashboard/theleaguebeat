// api/supabase/[...path].js
// Proxies all Supabase requests server-side so Safari ITP doesn't block them.

export const config = { runtime: 'nodejs' }

export default async function handler(req, res) {
  const SUPABASE_URL = process.env.VITE_SUPABASE_URL

  if (!SUPABASE_URL) {
    return res.status(500).json({ error: 'VITE_SUPABASE_URL not set' })
  }

  // Strip /api/supabase prefix to get the real Supabase path
  const path = req.url.replace(/^\/api\/supabase/, '') || '/'
  const targetUrl = `${SUPABASE_URL}${path}`

  // CORS preflight
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, apikey, x-client-info, x-supabase-api-version')
  res.setHeader('Access-Control-Allow-Credentials', 'true')

  if (req.method === 'OPTIONS') {
    return res.status(204).end()
  }

  // Build forward headers — strip host, add apikey if missing
  const forwardHeaders = {}
  for (const [key, val] of Object.entries(req.headers)) {
    if (!['host', 'connection', 'transfer-encoding'].includes(key.toLowerCase())) {
      forwardHeaders[key] = val
    }
  }

  try {
    // Read body as text to avoid double-parsing issues
    let body = undefined
    if (!['GET', 'HEAD'].includes(req.method)) {
      body = await new Promise((resolve) => {
        let data = ''
        req.on('data', chunk => { data += chunk })
        req.on('end', () => resolve(data))
      })
    }

    const response = await fetch(targetUrl, {
      method: req.method,
      headers: forwardHeaders,
      body: body || undefined,
    })

    // Forward Supabase response headers (skip ones Vercel manages)
    const skipHeaders = ['transfer-encoding', 'connection', 'keep-alive', 'content-encoding']
    for (const [key, val] of response.headers.entries()) {
      if (!skipHeaders.includes(key.toLowerCase())) {
        res.setHeader(key, val)
      }
    }

    const text = await response.text()
    return res.status(response.status).send(text)

  } catch (err) {
    console.error('[supabase-proxy] error:', err)
    return res.status(502).json({ error: 'Proxy error', message: err.message })
  }
}
