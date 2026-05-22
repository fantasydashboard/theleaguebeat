// src/composables/useLeaguePass.ts
import { ref, computed, watch } from 'vue'
import { supabase } from '@/lib/supabase'
import { useLeagueStore } from '@/stores/league'

// ── In-memory cache ──────────────────────────────────────────────────────────
const cache = new Map<string, { hasPass: boolean; daysRemaining: number | null; expiresAt: string | null; ts: number }>()
const CACHE_TTL_MS = 5 * 60 * 1000

export function useLeaguePass() {
  const leagueStore = useLeagueStore()

  const hasPass = ref(false)
  const loading = ref(true)
  const error = ref<string | null>(null)
  const daysRemaining = ref<number | null>(null)
  const expiresAt = ref<string | null>(null)

  const isLocked = computed(() => !hasPass.value)

  // Human-readable expiry string e.g. "287 days remaining"
  const expiryLabel = computed(() => {
    if (!hasPass.value || daysRemaining.value === null) return null
    if (daysRemaining.value <= 0) return 'Expires today'
    if (daysRemaining.value === 1) return '1 day remaining'
    return `${daysRemaining.value} days remaining`
  })

  async function checkPass(leagueId: string, platform: string, sport: string) {
    if (!leagueId) {
      loading.value = false
      hasPass.value = false
      return
    }

    const cacheKey = `${leagueId}::pass`
    const cached = cache.get(cacheKey)
    if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
      hasPass.value = cached.hasPass
      daysRemaining.value = cached.daysRemaining
      expiresAt.value = cached.expiresAt
      loading.value = false
      return
    }

    loading.value = true
    error.value = null

    try {
      const now = new Date().toISOString()
      const { data, error: dbError } = await supabase
        .from('league_passes')
        .select('id, expires_at')
        .eq('league_id', leagueId)
        .eq('active', true)
        .gt('expires_at', now)
        .order('expires_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (dbError) throw dbError

      if (data) {
        hasPass.value = true
        expiresAt.value = data.expires_at
        const msLeft = new Date(data.expires_at).getTime() - Date.now()
        daysRemaining.value = Math.max(0, Math.ceil(msLeft / (1000 * 60 * 60 * 24)))
      } else {
        hasPass.value = false
        daysRemaining.value = null
        expiresAt.value = null
      }

      cache.set(cacheKey, {
        hasPass: hasPass.value,
        daysRemaining: daysRemaining.value,
        expiresAt: expiresAt.value,
        ts: Date.now()
      })
    } catch (err: any) {
      console.error('useLeaguePass: Supabase error', err)
      error.value = err.message
      hasPass.value = false
    } finally {
      loading.value = false
    }
  }

  watch(
    () => [leagueStore.activeLeagueId, leagueStore.activePlatform, leagueStore.activeSport],
    ([id, platform, sport]) => {
      if (id) checkPass(id as string, platform as string, sport as string)
    },
    { immediate: true }
  )

  function invalidateCache(leagueId?: string) {
    if (leagueId) {
      cache.delete(`${leagueId}::pass`)
    } else {
      cache.clear()
    }
  }

  async function refresh() {
    invalidateCache(leagueStore.activeLeagueId)
    await checkPass(
      leagueStore.activeLeagueId,
      leagueStore.activePlatform,
      leagueStore.activeSport
    )
  }

  return { hasPass, isLocked, loading, error, daysRemaining, expiresAt, expiryLabel, checkPass, refresh, invalidateCache }
}
