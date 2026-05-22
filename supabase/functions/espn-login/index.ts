import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const DISNEY_LOGIN_URL = 'https://registerdisney.go.com/jgc/v8/client/ESPN-ONESITE.WEB-PROD/guest/login?langPref=en-US&feature=no-password-reuse'
const ESPN_API_KEY = 'KZfMm912rIFB8AGzBwrUdsmNq/XBrI2L4FiTEIGwjq3id9ly4FF+lFgdOwtD2bErvzMK5/r+9CUpDvxlf/pi/VIa8FXN'

function uuid() {
  return crypto.randomUUID()
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS })
  }

  let email: string, password: string

  try {
    const body = await req.json()
    if (body.action === 'ping') {
      return new Response(JSON.stringify({ status: 'ok', message: 'espn-login is deployed' }), {
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }
    email = body.email?.trim()
    password = body.password
    if (!email || !password) {
      return new Response(JSON.stringify({ error: 'missing_fields' }), {
        status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }
  } catch {
    return new Response(JSON.stringify({ error: 'invalid_body' }), {
      status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }

  console.log(`[espn-login] Attempt for: ${email.substring(0, 4)}***`)

  const conversationId = uuid()
  const correlationId = uuid()

  let loginResp: Response
  let responseText: string

  try {
    loginResp = await fetch(DISNEY_LOGIN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': '*/*',
        'Authorization': `APIKEY ${ESPN_API_KEY}`,
        'Cache-Control': 'no-cache',
        'Conversation-Id': conversationId,
        'Correlation-Id': correlationId,
        'Expires': '-1',
        'Origin': 'https://cdn.registerdisney.go.com',
        'Referer': 'https://cdn.registerdisney.go.com/',
        'Pragma': 'no-cache',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36',
      },
      body: JSON.stringify({ loginValue: email, password }),
    })
    responseText = await loginResp.text()
  } catch (err: any) {
    console.error('[espn-login] Network error:', err.message)
    return new Response(JSON.stringify({
      error: 'network_error',
      message: 'Could not reach ESPN authentication servers. Please try again.',
    }), {
      status: 502, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }

  console.log(`[espn-login] Status: ${loginResp.status}`)
  console.log(`[espn-login] Response: ${responseText.substring(0, 400)}`)

  if (!loginResp.ok) {
    let parsed: any = {}
    try { parsed = JSON.parse(responseText) } catch {}

    const errors = parsed?.error?.errors || []
    const errorCode = errors[0]?.code || parsed?.error?.code || parsed?.code || ''
    const errorMsg = (parsed?.error?.message || parsed?.message || '').toLowerCase()

    if (
      loginResp.status === 401 ||
      errorCode === 'INVALID_CREDENTIALS' ||
      errorCode === 'ACCOUNT_NOT_FOUND' ||
      errorMsg.includes('invalid') ||
      errorMsg.includes('incorrect')
    ) {
      return new Response(JSON.stringify({ error: 'invalid_credentials', message: 'Incorrect email or password.' }), {
        status: 401, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    if (loginResp.status === 429) {
      return new Response(JSON.stringify({ error: 'rate_limited', message: 'Too many attempts. Please wait a few minutes.' }), {
        status: 429, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    // Recaptcha required — can't solve server-side
    if (errorCode === 'RECAPTCHA_REQUIRED' || errorCode === 'CAPTCHA_REQUIRED') {
      return new Response(JSON.stringify({
        error: 'recaptcha_required',
        message: 'ESPN requires a security challenge for this login. Please use the manual cookie method instead.',
      }), {
        status: 422, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({
      error: 'auth_failed',
      message: `ESPN login failed (${loginResp.status}).`,
      debug: { status: loginResp.status, errorCode, body: responseText.substring(0, 500) },
    }), {
      status: 502, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }

  // Parse successful response
  let loginData: any
  try {
    loginData = JSON.parse(responseText)
  } catch {
    return new Response(JSON.stringify({ error: 'parse_error', message: 'Unexpected response from ESPN.' }), {
      status: 502, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }

  const d = loginData?.data || {}
  console.log('[espn-login] Top keys:', Object.keys(loginData).join(', '))
  console.log('[espn-login] data keys:', Object.keys(d).join(', '))

  let espn_s2: string | null = d.s2 || d.token || d.espn_s2 || loginData?.token || loginData?.s2 || null
  let swid: string | null = d.swid || d.profile?.swid || loginData?.swid || null
  if (swid) swid = swid.replace(/^\{/, '').replace(/\}$/, '')

  if (!espn_s2 || !swid) {
    return new Response(JSON.stringify({
      error: 'credentials_not_found',
      message: 'Login succeeded but credentials could not be extracted.',
      debug: { topKeys: Object.keys(loginData), dataKeys: Object.keys(d), sample: JSON.stringify(d).substring(0, 400) },
    }), {
      status: 502, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }

  console.log(`[espn-login] ✓ Success for ${email.substring(0, 4)}***`)
  return new Response(JSON.stringify({ espn_s2, swid }), {
    status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
})
