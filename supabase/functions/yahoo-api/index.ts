import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const YAHOO_API_BASE = 'https://fantasysports.yahooapis.com/fantasy/v2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
}

serve(async (req) => {
  // Handle CORS preflight - MUST return 200 OK
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 200,
      headers: corsHeaders 
    })
  }

  try {
    // Get the authorization header (Supabase JWT)
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify the user and get their ID
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    const token = authHeader.replace('Bearer ', '')
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      console.error('Auth error:', authError)
      return new Response(
        JSON.stringify({ error: 'Invalid token', details: authError?.message }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('User authenticated:', user.id)

    // Get the user's Yahoo tokens from the database
    const { data: platform, error: platformError } = await supabase
      .from('connected_platforms')
      .select('*')
      .eq('user_id', user.id)
      .eq('platform', 'yahoo')
      .single()

    if (platformError || !platform) {
      console.error('Platform error:', platformError)
      return new Response(
        JSON.stringify({ error: 'Yahoo not connected', details: platformError?.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Yahoo platform found, token expires:', platform.token_expires_at)

    // Check if token is expired and refresh if needed
    let accessToken = platform.access_token
    const tokenExpired = platform.token_expires_at && new Date(platform.token_expires_at) < new Date()
    
    if (tokenExpired) {
      console.log('Token expired, refreshing...')
      
      const YAHOO_CLIENT_ID = Deno.env.get('YAHOO_CLIENT_ID')
      const YAHOO_CLIENT_SECRET = Deno.env.get('YAHOO_CLIENT_SECRET')
      
      if (!YAHOO_CLIENT_ID || !YAHOO_CLIENT_SECRET) {
        return new Response(
          JSON.stringify({ error: 'Yahoo credentials not configured' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const refreshResponse = await fetch('https://api.login.yahoo.com/oauth2/get_token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${btoa(`${YAHOO_CLIENT_ID}:${YAHOO_CLIENT_SECRET}`)}`
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: platform.refresh_token
        })
      })

      if (!refreshResponse.ok) {
        const refreshError = await refreshResponse.text()
        console.error('Token refresh failed:', refreshError)
        return new Response(
          JSON.stringify({ error: 'Failed to refresh Yahoo token', details: refreshError }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const tokens = await refreshResponse.json()
      accessToken = tokens.access_token
      console.log('Token refreshed successfully')

      // Update tokens in database
      const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()
      await supabase
        .from('connected_platforms')
        .update({
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          token_expires_at: expiresAt
        })
        .eq('user_id', user.id)
        .eq('platform', 'yahoo')
    }

    // Parse the request body to get the Yahoo API endpoint
    const body = await req.json()
    const { endpoint } = body
    
    if (!endpoint) {
      return new Response(
        JSON.stringify({ error: 'No endpoint specified' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Make the request to Yahoo API
    const yahooUrl = `${YAHOO_API_BASE}${endpoint}`
    console.log('Fetching Yahoo API:', yahooUrl)

    const yahooResponse = await fetch(yahooUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json'
      }
    })

    console.log('Yahoo API response status:', yahooResponse.status)

    if (!yahooResponse.ok) {
      const errorText = await yahooResponse.text()
      console.error('Yahoo API error:', yahooResponse.status, errorText)
      return new Response(
        JSON.stringify({ 
          error: `Yahoo API error: ${yahooResponse.status}`, 
          details: errorText,
          message: yahooResponse.status === 400 ? 'You may not have any leagues for this sport' : 'Yahoo API request failed'
        }),
        { status: yahooResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const data = await yahooResponse.json()
    console.log('Yahoo API success')

    return new Response(
      JSON.stringify(data),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Yahoo proxy error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
