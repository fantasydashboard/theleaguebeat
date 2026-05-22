// supabase/functions/espn-api/index.ts
// 
// ESPN Fantasy API Proxy
// Handles CORS and authentication for ESPN's unofficial API
//
// Deploy with: supabase functions deploy espn-api

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// ESPN API base URL (updated April 2024)
const ESPN_API_BASE = 'https://lm-api-reads.fantasy.espn.com/apis/v3'

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create Supabase client to verify the user
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    })

    // Verify the user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse request body
    const body = await req.json()
    const { endpoint, espn_s2, swid } = body

    if (!endpoint) {
      return new Response(
        JSON.stringify({ error: 'Missing endpoint parameter' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Build the full ESPN URL
    const espnUrl = `${ESPN_API_BASE}${endpoint}`
    console.log(`[ESPN API] Fetching: ${espnUrl}`)

    // Build headers for ESPN request
    const espnHeaders: Record<string, string> = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    }

    // Determine which cookies to use:
    // 1. User-provided cookies (for private leagues)
    // 2. Server-side service account cookies (for public league historical data)
    let useServiceCookies = false
    let finalS2 = espn_s2
    let finalSwid = swid

    if (espn_s2 && swid) {
      // User provided their own cookies
      console.log('[ESPN API] Using user-provided credentials')
    } else {
      // Try server-side service account cookies
      const serviceS2 = Deno.env.get('ESPN_SERVICE_S2')
      const serviceSwid = Deno.env.get('ESPN_SERVICE_SWID')
      
      if (serviceS2 && serviceSwid) {
        finalS2 = serviceS2
        finalSwid = serviceSwid
        useServiceCookies = true
        console.log('[ESPN API] Using service account credentials for public league access')
      } else {
        console.log('[ESPN API] No credentials available - requesting without auth')
      }
    }

    // Add cookies if available
    if (finalS2 && finalSwid) {
      // Format SWID - ensure it has curly braces
      const formattedSwid = finalSwid.startsWith('{') ? finalSwid : `{${finalSwid}}`
      espnHeaders['Cookie'] = `espn_s2=${finalS2}; SWID=${formattedSwid}`
    }

    // Make request to ESPN
    const espnResponse = await fetch(espnUrl, {
      method: 'GET',
      headers: espnHeaders,
    })

    // Log response status
    console.log(`[ESPN API] Response status: ${espnResponse.status}`)

    // Handle different response statuses
    if (!espnResponse.ok) {
      const errorText = await espnResponse.text()
      console.error(`[ESPN API] Error response: ${errorText}`)

      // Map ESPN error responses to helpful messages
      if (espnResponse.status === 401) {
        return new Response(
          JSON.stringify({ 
            error: 'ESPN authentication failed. Your cookies may have expired.',
            status: 401 
          }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if (espnResponse.status === 403) {
        return new Response(
          JSON.stringify({ 
            error: 'This is a private league. Please provide ESPN cookies (espn_s2 and SWID).',
            status: 403,
            isPrivate: true
          }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if (espnResponse.status === 404) {
        return new Response(
          JSON.stringify({ 
            error: 'League not found. Please check the league ID and season.',
            status: 404 
          }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ 
          error: `ESPN API error: ${espnResponse.status}`,
          details: errorText.substring(0, 500)
        }),
        { status: espnResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse and return successful response
    const data = await espnResponse.json()
    
    return new Response(
      JSON.stringify(data),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('[ESPN API] Unexpected error:', error)
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
