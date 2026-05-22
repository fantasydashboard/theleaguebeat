import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const YAHOO_CLIENT_ID = Deno.env.get('YAHOO_CLIENT_ID')!
const YAHOO_CLIENT_SECRET = Deno.env.get('YAHOO_CLIENT_SECRET')!
const SITE_URL = Deno.env.get('SITE_URL') || 'https://www.ultimatefantasydashboard.com'
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

serve(async (req) => {
  try {
    const url = new URL(req.url)
    const code = url.searchParams.get('code')
    const state = url.searchParams.get('state')
    const error = url.searchParams.get('error')

    // Handle error from Yahoo
    if (error) {
      console.error('Yahoo OAuth error:', error)
      return new Response(null, {
        status: 302,
        headers: {
          'Location': `${SITE_URL}/auth/yahoo-error?error=${encodeURIComponent(error)}`
        }
      })
    }

    if (!code) {
      return new Response(null, {
        status: 302,
        headers: {
          'Location': `${SITE_URL}/auth/yahoo-error?error=no_code`
        }
      })
    }

    // Parse state to get return URL
    let returnTo = '/'
    if (state) {
      try {
        const stateData = JSON.parse(atob(state))
        returnTo = stateData.returnTo || '/'
      } catch (e) {
        console.error('Error parsing state:', e)
      }
    }

    // Exchange code for tokens
    const tokenResponse = await fetch('https://api.login.yahoo.com/oauth2/get_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${btoa(`${YAHOO_CLIENT_ID}:${YAHOO_CLIENT_SECRET}`)}`
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: `${SUPABASE_URL}/functions/v1/yahoo-callback`
      })
    })

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      console.error('Token exchange failed:', errorText)
      return new Response(null, {
        status: 302,
        headers: {
          'Location': `${SITE_URL}/auth/yahoo-error?error=token_exchange_failed`
        }
      })
    }

    const tokens = await tokenResponse.json()
    
    // Get Yahoo user GUID from the token response
    let yahooUserId = tokens.xoauth_yahoo_guid || null
    
    // Redirect back to the app with tokens in QUERY STRING (not hash)
    // Using "yahoo_" prefix to avoid conflicts with Supabase auth
    const callbackUrl = new URL(`${SITE_URL}/auth/yahoo-callback`)
    callbackUrl.searchParams.set('yahoo_access_token', tokens.access_token)
    callbackUrl.searchParams.set('yahoo_refresh_token', tokens.refresh_token)
    callbackUrl.searchParams.set('yahoo_expires_in', tokens.expires_in.toString())
    callbackUrl.searchParams.set('yahoo_user_id', yahooUserId || '')
    callbackUrl.searchParams.set('return_to', returnTo)

    return new Response(null, {
      status: 302,
      headers: {
        'Location': callbackUrl.toString()
      }
    })
  } catch (error) {
    console.error('Yahoo callback error:', error)
    return new Response(null, {
      status: 302,
      headers: {
        'Location': `${SITE_URL}/auth/yahoo-error?error=${encodeURIComponent(error.message)}`
      }
    })
  }
})
