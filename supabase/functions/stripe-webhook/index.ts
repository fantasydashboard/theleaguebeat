// supabase/functions/stripe-webhook/index.ts
// Deploy with: supabase functions deploy stripe-webhook --no-verify-jwt
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const STRIPE_WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

serve(async (req) => {
  const signature = req.headers.get('stripe-signature')
  if (!signature) return new Response('Missing stripe-signature header', { status: 400 })

  const body = await req.text()
  let event: any
  try {
    event = await verifyStripeWebhook(body, signature, STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return new Response('Invalid signature', { status: 400 })
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  // ── checkout.session.completed ─────────────────────────────────────────────
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object
    const meta = session.metadata || {}
    const plan = meta.plan || ''

    console.log(`[webhook] checkout.session.completed — plan: ${plan}, session: ${session.id}`)

    // ── Individual plan (monthly or annual) ──
    if (plan === 'individual_monthly' || plan === 'individual_annual') {
      return await handleIndividualCheckout(supabase, session, plan)
    }

    // ── League Pass ──
    if (plan === 'league_pass') {
      return await handleLeaguePassCheckout(supabase, session, meta)
    }

    // Legacy: no plan in metadata but has league_id → treat as league pass
    if (meta.league_id && meta.platform) {
      return await handleLeaguePassCheckout(supabase, session, meta)
    }

    console.warn(`[webhook] Unknown plan type: "${plan}" for session ${session.id}`)
    return new Response(JSON.stringify({ received: true }), { status: 200 })
  }

  // ── customer.subscription.updated ─────────────────────────────────────────
  // Fires when a subscription renews, upgrades, or is cancelled
  if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
    const sub = event.data.object
    return await handleSubscriptionUpdate(supabase, sub, event.type)
  }

  // All other events — acknowledge and ignore
  return new Response(JSON.stringify({ received: true }), { status: 200 })
})

// ── Individual plan handler ────────────────────────────────────────────────────
async function handleIndividualCheckout(supabase: any, session: any, plan: string) {
  const userId = session.metadata?.user_id || null
  const customerEmail = session.customer_email || session.customer_details?.email || null

  if (!userId && !customerEmail) {
    console.error('[webhook] Individual checkout missing user_id and email:', session.id)
    return new Response('Missing user identity', { status: 400 })
  }

  // Idempotency: check if we already processed this session
  const { data: existing } = await supabase
    .from('individual_subscriptions')
    .select('id')
    .eq('stripe_session_id', session.id)
    .maybeSingle()

  if (existing) {
    console.log('[webhook] Already processed individual session:', session.id)
    return new Response(JSON.stringify({ received: true }), { status: 200 })
  }

  // Resolve user_id from email if not in metadata
  let resolvedUserId = userId
  if (!resolvedUserId && customerEmail) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', customerEmail)
      .maybeSingle()
    resolvedUserId = profile?.id || null
  }

  if (!resolvedUserId) {
    console.error('[webhook] Could not resolve user_id for email:', customerEmail)
    return new Response('User not found', { status: 400 })
  }

  // Calculate period end — 1 month or 1 year from now
  const now = new Date()
  const periodEnd = new Date(now)
  if (plan === 'individual_annual') {
    periodEnd.setFullYear(periodEnd.getFullYear() + 1)
  } else {
    periodEnd.setMonth(periodEnd.getMonth() + 1)
  }

  // Stripe subscription ID if available (for subscription mode)
  const stripeSubscriptionId = session.subscription || null

  // Insert into individual_subscriptions
  const { error: insertError } = await supabase
    .from('individual_subscriptions')
    .insert({
      user_id: resolvedUserId,
      stripe_customer_id: session.customer || null,
      stripe_subscription_id: stripeSubscriptionId,
      stripe_session_id: session.id,
      tier: plan, // 'individual_monthly' or 'individual_annual'
      status: 'active',
      current_period_end: periodEnd.toISOString(),
      created_at: now.toISOString(),
    })

  if (insertError) {
    console.error('[webhook] Failed to insert individual_subscriptions:', insertError)
    return new Response('Database error', { status: 500 })
  }

  // Update profiles.subscription_tier
  const { error: profileError } = await supabase
    .from('profiles')
    .update({
      subscription_tier: plan,
      stripe_customer_id: session.customer || null,
    })
    .eq('id', resolvedUserId)

  if (profileError) {
    console.error('[webhook] Failed to update profile tier:', profileError)
    // Non-fatal — subscription row is already inserted
  }

  console.log(`[webhook] Individual plan activated: ${plan} for user ${resolvedUserId}`)
  return new Response(JSON.stringify({ received: true }), { status: 200 })
}

// ── League pass handler ────────────────────────────────────────────────────────
async function handleLeaguePassCheckout(supabase: any, session: any, meta: any) {
  const { league_id, platform, sport, league_name, purchased_by_user_id, expires_at } = meta

  if (!league_id || !platform) {
    console.error('[webhook] League pass missing league_id/platform:', session.id)
    return new Response('Missing metadata', { status: 400 })
  }

  // Idempotency check
  const { data: existing } = await supabase
    .from('league_passes')
    .select('id')
    .eq('stripe_session_id', session.id)
    .maybeSingle()

  if (existing) {
    console.log('[webhook] Already processed league pass session:', session.id)
    return new Response(JSON.stringify({ received: true }), { status: 200 })
  }

  const expiresAt = expires_at || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()

  const { error } = await supabase.from('league_passes').insert({
    league_id,
    platform,
    sport: sport || '',
    season_key: `365day_${new Date().getFullYear()}`,
    purchased_by_user_id: purchased_by_user_id || null,
    stripe_session_id: session.id,
    stripe_payment_intent: session.payment_intent || null,
    active: true,
    expires_at: expiresAt,
  })

  if (error) {
    console.error('[webhook] League pass insert error:', error)
    return new Response('Database error', { status: 500 })
  }

  console.log(`[webhook] League Pass activated: ${league_id} (${platform}/${sport})`)
  return new Response(JSON.stringify({ received: true }), { status: 200 })
}

// ── Subscription update/cancellation handler ──────────────────────────────────
async function handleSubscriptionUpdate(supabase: any, sub: any, eventType: string) {
  const stripeSubId = sub.id
  const status = sub.status // active, past_due, canceled, unpaid
  const periodEnd = sub.current_period_end
    ? new Date(sub.current_period_end * 1000).toISOString()
    : null

  console.log(`[webhook] ${eventType}: sub ${stripeSubId}, status: ${status}`)

  const { data: existingSub, error: findError } = await supabase
    .from('individual_subscriptions')
    .select('id, user_id, tier')
    .eq('stripe_subscription_id', stripeSubId)
    .maybeSingle()

  if (findError || !existingSub) {
    console.warn('[webhook] Subscription not found in DB:', stripeSubId)
    return new Response(JSON.stringify({ received: true }), { status: 200 })
  }

  const isActive = status === 'active' || status === 'trialing'
  const newStatus = isActive ? 'active' : status

  // Update subscription record
  const { error: updateError } = await supabase
    .from('individual_subscriptions')
    .update({
      status: newStatus,
      ...(periodEnd && { current_period_end: periodEnd }),
    })
    .eq('id', existingSub.id)

  if (updateError) {
    console.error('[webhook] Failed to update subscription:', updateError)
    return new Response('Database error', { status: 500 })
  }

  // Update profile tier — set to 'free' if cancelled/lapsed
  const newTier = isActive ? (existingSub.tier || 'individual_monthly') : 'free'
  await supabase
    .from('profiles')
    .update({ subscription_tier: newTier })
    .eq('id', existingSub.user_id)

  console.log(`[webhook] Subscription updated: ${stripeSubId} → ${newStatus}, tier → ${newTier}`)
  return new Response(JSON.stringify({ received: true }), { status: 200 })
}

// ── Stripe webhook signature verification ─────────────────────────────────────
async function verifyStripeWebhook(payload: string, signature: string, secret: string): Promise<any> {
  const parts = Object.fromEntries(
    signature.split(',').map(part => {
      const [key, ...rest] = part.split('=')
      return [key, rest.join('=')]
    })
  )
  const timestamp = parts['t']
  const expectedSig = parts['v1']
  if (!timestamp || !expectedSig) throw new Error('Malformed signature')
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) throw new Error('Timestamp too old')

  const signedPayload = `${timestamp}.${payload}`
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false, ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(signedPayload))
  const computedSig = Array.from(new Uint8Array(sig))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')

  if (computedSig !== expectedSig) throw new Error('Signature mismatch')
  return JSON.parse(payload)
}
