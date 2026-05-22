<template>
  <!-- ── WRAP MODE: blurs content, no buttons — banner handles upgrade CTA ── -->
  <div v-if="wrap" class="lgw">
    <div :class="effectiveLocked ? 'lgw-blur' : ''"><slot /></div>
    <div v-if="effectiveLocked && !checking" class="lgw-overlay">
      <div class="lgw-lock-badge">
        <span class="lgw-lock-icon">🔒</span>
        <span class="lgw-lock-label">{{ label || 'Upgrade to unlock' }}</span>
      </div>
    </div>
  </div>

  <!-- ── INLINE MODE: just a fade, no buttons ── -->
  <div v-else-if="effectiveLocked && !checking" class="lgi">
    <div class="lgi-fade"></div>
    <div class="lgi-hint">
      <span class="lgi-lock">🔒</span>
      <span class="lgi-text">Upgrade to see the full list</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useLeagueStore } from '@/stores/league'
import { supabase } from '@/lib/supabase'

const props = withDefaults(defineProps<{
  wrap?: boolean
  /**
   * Optional locked override from the parent:
   *   - Pass :locked="false"  → always unlocked (parent already checked access)
   *   - Pass :locked="true"   → always locked   (no need for a second DB query)
   *   - Omit entirely         → this component checks Supabase itself
   *
   * Most views use useFeatureAccess and pass :locked="!hasLeagueAccess", which
   * means this component's internal Supabase check only fires when the parent
   * hasn't already resolved the state — preventing redundant queries.
   */
  locked?: boolean
  label?: string
}>(), { wrap: false })

const router = useRouter()
const leagueStore = useLeagueStore()

// ── Internal state ──────────────────────────────────────────────────────────
// Only used when props.locked is undefined (parent didn't pass an override).
const supabaseLocked = ref(true) // assume locked until proven otherwise (fail-closed)
const checking = ref(false)

/**
 * Effective lock state:
 *   1. If parent explicitly passes :locked="false" → never locked
 *   2. If parent explicitly passes :locked="true"  → always locked (skip DB check)
 *   3. If parent omits the prop                    → use our internal Supabase result
 */
const effectiveLocked = computed(() => {
  if (props.locked === false) return false   // parent says unlocked
  if (props.locked === true)  return true    // parent says locked, trust it
  return supabaseLocked.value                // parent didn't say — use our DB check
})

// ── Check Supabase for active league pass ───────────────────────────────────
// Uses a module-level cache to avoid hitting Supabase on every render.
// Cache key uses league_id + platform (NOT season_key — the Stripe webhook
// never writes season_key; it only writes active + expires_at).
const _cache = new Map<string, { locked: boolean; ts: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

async function checkLeaguePass(leagueId: string, platform: string) {
  if (!leagueId || !platform) {
    supabaseLocked.value = true
    return
  }

  const cacheKey = `${leagueId}::${platform}`
  const cached = _cache.get(cacheKey)
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    supabaseLocked.value = cached.locked
    return
  }

  checking.value = true
  try {
    const now = new Date().toISOString()

    // IMPORTANT: filter by platform AND expires_at — NOT season_key.
    // The Stripe webhook (stripe-webhook edge function) writes:
    //   league_id, platform, active=true, expires_at
    // It does NOT write season_key, so filtering on that column always returns
    // null and makes this gate permanently locked even for paying leagues.
    const { data, error } = await supabase
      .from('league_passes')
      .select('id')
      .eq('league_id', leagueId)
      .eq('platform', platform)
      .eq('active', true)
      .gt('expires_at', now)
      .limit(1)
      .maybeSingle()

    if (error) throw error

    const locked = !data
    supabaseLocked.value = locked
    _cache.set(cacheKey, { locked, ts: Date.now() })
  } catch (err) {
    console.warn('[LeagueGate] Could not check league pass — defaulting to locked', err)
    supabaseLocked.value = true // fail-closed
  } finally {
    checking.value = false
  }
}

// ── Watch for league/platform changes ───────────────────────────────────────
// Only run the internal DB check when the parent hasn't provided a locked prop.
// If the parent is already passing :locked from useFeatureAccess, skip the
// redundant query entirely.
function runCheck() {
  if (props.locked !== undefined) return // parent owns the state, don't double-query
  const leagueId = leagueStore.activeLeagueId
  const platform = leagueStore.activePlatform || ''
  if (leagueId) checkLeaguePass(leagueId, platform)
}

onMounted(runCheck)
watch(() => [leagueStore.activeLeagueId, leagueStore.activePlatform], runCheck)

// ── Navigation ───────────────────────────────────────────────────────────────
const pricingUrl = computed(() => {
  const params = new URLSearchParams()
  if (leagueStore.activeLeagueId) params.set('league', leagueStore.activeLeagueId)
  if (leagueStore.activePlatform) params.set('platform', leagueStore.activePlatform)
  if (leagueStore.activeSport) params.set('sport', leagueStore.activeSport)
  const qs = params.toString()
  return qs ? `/pricing?${qs}` : '/pricing'
})

function goToPricing() {
  router.push(pricingUrl.value)
}

function goToTrial() {
  const params = new URLSearchParams()
  if (leagueStore.activeLeagueId) params.set('league', leagueStore.activeLeagueId)
  if (leagueStore.activePlatform) params.set('platform', leagueStore.activePlatform)
  params.set('intent', 'trial')
  const qs = params.toString()
  router.push(qs ? `/pricing?${qs}` : '/pricing')
}

// ── Cache invalidation (call after successful purchase) ──────────────────────
function invalidateCache(leagueId?: string) {
  if (leagueId) {
    const platform = leagueStore.activePlatform || ''
    _cache.delete(`${leagueId}::${platform}`)
  } else {
    _cache.clear()
  }
}

defineExpose({ invalidateCache })
</script>

<style scoped>
.lgw { position: relative; border-radius: 12px; overflow: hidden; }
.lgw-blur { filter: blur(5px); pointer-events: none; user-select: none; opacity: 0.4; }
.lgw-overlay {
  position: absolute; inset: 0;
  display: flex; align-items: center; justify-content: center;
  background: rgba(5,6,10,0.45);
}
.lgw-lock-badge {
  display: flex; align-items: center; gap: 8px;
  background: rgba(10,12,20,0.85);
  border: 1px solid #1e2130;
  border-radius: 10px; padding: 10px 16px;
}
.lgw-lock-icon { font-size: 1rem; }
.lgw-lock-label { font-size: 13px; font-weight: 700; color: #9ca3af; }

.lgi { position: relative; margin-top: -32px; }
.lgi-fade { height: 60px; background: linear-gradient(to bottom, transparent, #0a0c14); pointer-events: none; }
.lgi-hint {
  display: flex; align-items: center; justify-content: center; gap: 6px;
  background: #0a0c14; border-top: 1px solid #1e2130;
  padding: 10px 20px;
}
.lgi-lock { font-size: 12px; }
.lgi-text { font-size: 12px; color: #374151; font-style: italic; }
</style>
