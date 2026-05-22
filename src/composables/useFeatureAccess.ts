// composables/useFeatureAccess.ts
// Handles subscription tier checking and feature gating.
//
// Access model (updated):
//   Free trial    — 7 days from first login; full access during trial.
//                   Stored in profiles.trial_started_at / trial_expires_at.
//   League Pass   — purchased once per league ($29); unlocks league-wide features
//                   for ANY user who loads that league. Stored in `league_passes`.
//   Individual    — per-user subscription ($7.99/mo or $49/yr); unlocks all features
//                   for the purchasing user across all their leagues.
//                   Stored in `individual_subscriptions` + profiles.subscription_tier.
//   Admin         — full access; set via profiles.subscription_tier = 'admin'.

import { ref, computed, watch } from 'vue'
import { supabase } from '@/lib/supabase'
import { useLeagueStore } from '@/stores/league'
import { useAuthStore } from '@/stores/auth'

// ── Pricing constants (updated) ───────────────────────────────────────────────
export const PRICING = {
  leaguePass: {
    price: 2900,      // $29 one-time per league
  },
  individual: {
    monthly: 799,     // $7.99/month
    annual:  4900,    // $49/year
  },
  trial: {
    days: 7,
  }
}

export type SubscriptionTier = 'free' | 'trial' | 'individual' | 'league' | 'admin'

export function useFeatureAccess() {
  const leagueStore = useLeagueStore()
  const authStore = useAuthStore()

  // ── Loading / error state ─────────────────────────────────────────────────
  const isCheckingAccess = ref(false)
  const accessError = ref<string | null>(null)

  // ── Raw subscription state ────────────────────────────────────────────────
  const isAdmin = ref(false)
  const hasRealLeagueAccess = ref(false)        // League Pass for active league
  const hasRealIndividualAccess = ref(false)     // Individual subscription
  const isOnActiveTrial = ref(false)             // Within 7-day free trial
  const trialExpiresAt = ref<Date | null>(null)
  const trialDaysRemaining = ref(0)
  const leagueSubscription = ref<any>(null)
  const individualSubscription = ref<any>(null)

  // Dev-mode tier override (admin only)
  const devTierOverride = ref<string | null>(null)

  // ── Core access check ─────────────────────────────────────────────────────
  async function checkAllAccess() {
    if (!supabase) return

    // Reset fail-closed
    hasRealLeagueAccess.value = false
    hasRealIndividualAccess.value = false
    isOnActiveTrial.value = false
    leagueSubscription.value = null
    individualSubscription.value = null

    isCheckingAccess.value = true
    accessError.value = null

    try {
      const userId = authStore.user?.id
      if (!userId) return

      // ── 1. Profile-level checks (admin + trial + individual) ──────────────
      const profile = authStore.profile
      const tier = profile?.subscription_tier || 'free'
      isAdmin.value = tier === 'admin'

      if (isAdmin.value) {
        hasRealLeagueAccess.value = true
        hasRealIndividualAccess.value = true
      }

      // ── Trial check ───────────────────────────────────────────────────────
      // Auto-start trial if profile has no trial_started_at yet
      if (!profile?.trial_started_at && supabase) {
        await supabase.rpc('start_trial_if_new')
        // Reload profile to get the new trial dates
        await authStore.loadProfile?.()

        // Send welcome email immediately (fire and forget)
        try {
          const session = await supabase.auth.getSession()
          if (session.data.session) {
            fetch('/api/admin/send-trial-emails', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${session.data.session.access_token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ welcome_only: true })
            }).catch(() => {}) // non-critical — cron will catch up
          }
        } catch (e) {
          // non-critical — cron will catch up
        }
      }

      const expiresAt = profile?.trial_expires_at
        ? new Date(profile.trial_expires_at)
        : null

      if (expiresAt) {
        trialExpiresAt.value = expiresAt
        const now = new Date()
        const isActive = now < expiresAt
        isOnActiveTrial.value = isActive
        if (isActive) {
          const msRemaining = expiresAt.getTime() - now.getTime()
          trialDaysRemaining.value = Math.ceil(msRemaining / (1000 * 60 * 60 * 24))
        } else {
          trialDaysRemaining.value = 0
        }
      }

      // ── Individual subscription check ─────────────────────────────────────
      // Primary signal: profile.subscription_tier set by Stripe webhook
      // Secondary signal: individual_subscriptions table (also check status=trialing for Stripe trial period)
      const hasIndividualTier = ['individual_monthly', 'individual_annual', 'premium', 'pro'].includes(tier)

      if (hasIndividualTier) {
        // Profile tier is set — trust it. Webhook already confirmed payment.
        hasRealIndividualAccess.value = true
        console.log('[FeatureAccess] Individual subscription active via tier:', tier)
      } else {
        // Tier not set yet (webhook delay) — check subscriptions table directly
        const nowStr = new Date().toISOString()
        const { data: subData } = await supabase
          .from('individual_subscriptions')
          .select('id, status, tier, current_period_end')
          .eq('user_id', userId)
          .in('status', ['active', 'trialing'])  // include trialing — Stripe sometimes starts here
          .limit(1)
          .maybeSingle()

        if (subData) {
          hasRealIndividualAccess.value = true
          individualSubscription.value = subData
          console.log('[FeatureAccess] Individual subscription active via table:', subData.status)
        }
      }

      // ── League Pass check ─────────────────────────────────────────────────
      const leagueId = leagueStore.activeLeagueId
      const platform = leagueStore.activePlatform

      if (leagueId && platform && !isAdmin.value) {
        const now = new Date().toISOString()
        const parts = leagueId.split('_')
        const shortLeagueId = parts.length >= 3 ? parts[2] : leagueId

        const { data: passData, error: passError } = await supabase
          .from('league_passes')
          .select('id, expires_at')
          .in('league_id', [leagueId, shortLeagueId])
          .eq('active', true)
          .gt('expires_at', now)
          .limit(1)
          .maybeSingle()

        if (passError) console.warn('[FeatureAccess] league_passes query error:', passError)

        if (passData) {
          console.log('[FeatureAccess] League pass found ✓')
          hasRealLeagueAccess.value = true
          leagueSubscription.value = passData
        } else {
          // Fallback: legacy league_subscriptions table
          const { data: subData } = await supabase
            .from('league_subscriptions')
            .select('*')
            .in('league_id', [leagueId, shortLeagueId])
            .eq('status', 'active')
            .maybeSingle()

          if (subData) {
            hasRealLeagueAccess.value = true
            leagueSubscription.value = subData
            console.log('[FeatureAccess] League pass found in legacy table ✓')
          }
        }
      } else if (!leagueId) {
        hasRealLeagueAccess.value = isAdmin.value
      }

    } catch (err: any) {
      console.error('[FeatureAccess] checkAllAccess error:', err)
      accessError.value = err?.message || 'Access check failed'
      hasRealLeagueAccess.value = isAdmin.value
    } finally {
      isCheckingAccess.value = false
    }
  }

  // Re-check when league or profile changes
  watch(
    () => [leagueStore.activeLeagueId, leagueStore.activePlatform],
    () => checkAllAccess(),
    { immediate: true }
  )
  watch(
    () => authStore.profile?.subscription_tier,
    () => checkAllAccess(),
    { immediate: true }
  )
  // Also watch trial expiry date in case profile reloads
  watch(
    () => authStore.profile?.trial_expires_at,
    () => checkAllAccess()
  )

  // ── Effective access ──────────────────────────────────────────────────────
  const isPaid = computed(() =>
    isAdmin.value || hasRealLeagueAccess.value || hasRealIndividualAccess.value
  )

  // Full access = paid OR on active trial
  const hasFullAccess = computed(() => isPaid.value || isOnActiveTrial.value)

  const effectiveTier = computed((): SubscriptionTier => {
    if (isAdmin.value) return 'admin'
    if (hasRealIndividualAccess.value) return 'individual'
    if (hasRealLeagueAccess.value) return 'league'
    if (isOnActiveTrial.value) return 'trial'
    return 'free'
  })

  // Dev-mode override (admin only)
  const effectiveAccess = computed(() => {
    if (isAdmin.value && devTierOverride.value) {
      const t = devTierOverride.value as SubscriptionTier
      return { tier: t, hasLeague: t !== 'free', hasPremium: t === 'individual' || t === 'admin' }
    }
    return {
      tier: effectiveTier.value,
      hasLeague: hasFullAccess.value,
      hasPremium: hasFullAccess.value,
    }
  })

  // ── New gating properties ─────────────────────────────────────────────────

  // canExpand: can click to expand any section (paid OR trial)
  const canExpand = computed(() => {
    if (isAdmin.value && devTierOverride.value) return devTierOverride.value !== 'free'
    return hasFullAccess.value
  })

  // canDownload: can download graphics (paid OR trial)
  const canDownload = computed(() => {
    if (isAdmin.value && devTierOverride.value) return devTierOverride.value !== 'free'
    return hasFullAccess.value
  })

  // Trial status helpers
  const isTrialExpired = computed(() =>
    !!trialExpiresAt.value && new Date() >= trialExpiresAt.value && !isPaid.value
  )

  const currentTierLabel = computed(() => {
    if (isAdmin.value && devTierOverride.value) return `Dev: ${devTierOverride.value}`
    switch (effectiveTier.value) {
      case 'admin':      return 'Admin'
      case 'individual': return 'Individual'
      case 'league':     return 'League Pass'
      case 'trial':      return `Free Trial (${trialDaysRemaining.value}d left)`
      default:           return 'Free'
    }
  })

  // Dev-mode helpers
  function setDevTier(tier: string | null) {
    if (!isAdmin.value) return
    devTierOverride.value = tier
  }
  function clearDevMode() {
    devTierOverride.value = null
  }

  return {
    // Loading state
    isCheckingAccess,
    accessError,

    // Raw subscription data
    isAdmin,
    hasRealLeagueAccess,
    hasRealIndividualAccess,
    isOnActiveTrial,
    isTrialExpired,
    trialExpiresAt,
    trialDaysRemaining,
    leagueSubscription,
    individualSubscription,

    // Effective access
    isPaid,
    hasFullAccess,
    hasLeagueAccess: computed(() => effectiveAccess.value.hasLeague),
    hasPremiumAccess: computed(() => effectiveAccess.value.hasPremium),
    currentTier: computed(() => effectiveAccess.value.tier),
    currentTierLabel,

    // ── NEW: key gating flags ──
    canExpand,    // expand any section (trial OR paid)
    canDownload,  // download graphics (trial OR paid)

    // Dev mode
    devTierOverride: computed(() => devTierOverride.value),
    isDevMode: computed(() => isAdmin.value && !!devTierOverride.value),
    setDevTier,
    clearDevMode,

    // Feature flags (all now unified under hasFullAccess)
    canViewHomepage: computed(() => true),
    canViewBasicMatchups: computed(() => true),
    canViewFullMatchups: computed(() => effectiveAccess.value.hasLeague),
    canViewHistory: computed(() => effectiveAccess.value.hasLeague),
    canViewPowerRankings: computed(() => effectiveAccess.value.hasLeague),
    canViewH2HRecords: computed(() => effectiveAccess.value.hasLeague),
    canViewCareerStats: computed(() => effectiveAccess.value.hasLeague),
    canDownloadGraphics: computed(() => canDownload.value),
    canUseMyTeamTools: computed(() => effectiveAccess.value.hasPremium),
    canViewProjections: computed(() => effectiveAccess.value.hasPremium),
    canUseStartSit: computed(() => effectiveAccess.value.hasPremium),
    canUseWaiverAnalysis: computed(() => effectiveAccess.value.hasPremium),
    canUseTradeAnalyzer: computed(() => effectiveAccess.value.hasPremium),

    // Refresh
    refreshAccess: checkAllAccess,
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export function calculateLeaguePrice(): number {
  return PRICING.leaguePass.price
}

export function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`
}

export function applyDiscount(
  basePrice: number,
  discount: { discount_type: string; discount_value: number } | null
): { finalPrice: number; discountAmount: number } {
  if (!discount) return { finalPrice: basePrice, discountAmount: 0 }
  let discountAmount = 0
  if (discount.discount_type === 'fixed') {
    discountAmount = discount.discount_value
  } else if (discount.discount_type === 'percentage') {
    discountAmount = Math.round(basePrice * (discount.discount_value / 100))
  }
  return { finalPrice: Math.max(0, basePrice - discountAmount), discountAmount }
}
