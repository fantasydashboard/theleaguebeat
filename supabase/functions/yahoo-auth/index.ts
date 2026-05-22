import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const YAHOO_CLIENT_ID = Deno.env.get('YAHOO_CLIENT_ID')!
const SITE_URL = Deno.env.get('SITE_URL') || 'https://www.ultimatefantasydashboard.com'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const returnTo = url.searchParams.get('returnTo') || '/'
    
    // Generate state parameter to prevent CSRF and store return URL
    const state = btoa(JSON.stringify({
      returnTo,
      timestamp: Date.now()
    }))

    // Yahoo OAuth authorization URL
    const yahooAuthUrl = new URL('https://api.login.yahoo.com/oauth2/request_auth')
    yahooAuthUrl.searchParams.set('client_id', YAHOO_CLIENT_ID)
    yahooAuthUrl.searchParams.set('redirect_uri', `${Deno.env.get('SUPABASE_URL')}/functions/v1/yahoo-callback`)
    yahooAuthUrl.searchParams.set('response_type', 'code')
    yahooAuthUrl.searchParams.set('scope', 'fspt-r') // Fantasy Sports read access
    yahooAuthUrl.searchParams.set('state', state)

    // Redirect to Yahoo
    return new Response(null, {
      status: 302,
      headers: {
        ...corsHeaders,
        'Location': yahooAuthUrl.toString()
      }
    })
  } catch (error) {
    console.error('Yahoo auth error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
