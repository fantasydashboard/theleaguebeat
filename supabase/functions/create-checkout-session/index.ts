import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // ── Auth ──────────────────────────────────────────────────────────────────
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Verify the JWT and get the user
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // ── Parse body ────────────────────────────────────────────────────────────
    const body = await req.json()
    const { plan, league_id, platform, sport, league_name } = body

    if (!plan) {
      return new Response(JSON.stringify({ error: 'Missing required field: plan' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // league_pass requires league context; individual plans do not
    if (plan === 'league_pass' && (!league_id || !platform)) {
      return new Response(JSON.stringify({ error: 'League Pass requires league_id and platform' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // ── Stripe setup ──────────────────────────────────────────────────────────
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')!
    const stripe = new Stripe(stripeKey, { apiVersion: '2024-06-20' })

    const appUrl = Deno.env.get('APP_URL') || 'https://ultimatefantasydashboard.com'

    // ── Get or create Stripe customer ─────────────────────────────────────────
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id, email')
      .eq('id', user.id)
      .single()

    let customerId = profile?.stripe_customer_id
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email || profile?.email || '',
        metadata: { supabase_user_id: user.id }
      })
      customerId = customer.id
      await supabase.from('profiles').update({ stripe_customer_id: customerId }).eq('id', user.id)
    }

    // ── Build checkout session based on plan ──────────────────────────────────
    let sessionParams: Stripe.Checkout.SessionCreateParams

    if (plan === 'league_pass') {
      // Check for duplicate league pass
      const { data: existingPass } = await supabase
        .from('league_passes')
        .select('id')
        .eq('league_id', league_id)
        .eq('active', true)
        .gte('expires_at', new Date().toISOString())
        .single()

      if (existingPass) {
        return new Response(JSON.stringify({ error: 'This league already has an active League Pass!' }), {
          status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      const priceId = Deno.env.get('STRIPE_LEAGUE_PASS_PRICE_ID')!
      sessionParams = {
        customer: customerId,
        mode: 'payment',
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${appUrl}/pricing?success=1&plan=league_pass&league=${league_id}&platform=${platform}`,
        cancel_url: `${appUrl}/pricing?cancelled=1`,
        metadata: {
          plan: 'league_pass',
          user_id: user.id,
          league_id,
          platform,
          sport: sport || '',
          league_name: league_name || league_id,
        }
      }
    } else if (plan === 'individual_monthly') {
      const priceId = Deno.env.get('STRIPE_INDIVIDUAL_MONTHLY_PRICE_ID')!
      sessionParams = {
        customer: customerId,
        mode: 'subscription',
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${appUrl}/pricing?success=1&plan=individual_monthly`,
        cancel_url: `${appUrl}/pricing?cancelled=1`,
        metadata: {
          plan: 'individual_monthly',
          user_id: user.id,
        }
      }
    } else if (plan === 'individual_annual') {
      const priceId = Deno.env.get('STRIPE_INDIVIDUAL_ANNUAL_PRICE_ID')!
      sessionParams = {
        customer: customerId,
        mode: 'subscription',
        line_items: [{ price: priceId, quantity: 1 }],
        // Surfaces the "Add promotion code" link in Stripe Checkout so
        // returning users can paste at-risk-drip codes (e.g. COMEBACK10).
        // Only enabled on annual — keeps the monthly/league-pass checkouts
        // clean and prevents discounts from being misapplied.
        allow_promotion_codes: true,
        success_url: `${appUrl}/pricing?success=1&plan=individual_annual`,
        cancel_url: `${appUrl}/pricing?cancelled=1`,
        metadata: {
          plan: 'individual_annual',
          user_id: user.id,
        }
      }
    } else {
      return new Response(JSON.stringify({ error: `Unknown plan: ${plan}` }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const session = await stripe.checkout.sessions.create(sessionParams)

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (err: any) {
    console.error('[create-checkout-session] Error:', err)
    return new Response(JSON.stringify({ error: err.message || 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
