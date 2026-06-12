/**
 * useViewerTeam — resolves whose team Your Column features.
 *   1. A team flagged isMyTeam (logged-in + identity-connected) wins.
 *   2. Else a previously-picked team (URL ?team= or localStorage per league).
 *   3. Else null → the view shows the team picker.
 * `pickTeam` persists the choice (URL + localStorage) so it sticks.
 */
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { CategoryLeagueDataTeam } from '@/editorial/types'

export function useViewerTeam(teams: () => CategoryLeagueDataTeam[], leagueKey: () => string) {
  const route = useRoute()
  const router = useRouter()
  const storageKey = () => `tlb:viewerTeam:${leagueKey()}`
  const picked = ref<string | null>(null)

  // Seed from URL or localStorage once teams are known.
  watch([teams, leagueKey], () => {
    if (picked.value) return
    const fromUrl = typeof route.query.team === 'string' ? route.query.team : null
    const fromStore = (() => { try { return localStorage.getItem(storageKey()) } catch { return null } })()
    const candidate = fromUrl ?? fromStore
    if (candidate && teams().some((t) => t.id === candidate)) picked.value = candidate
  }, { immediate: true })

  const viewerTeamId = computed<string | null>(() => {
    const mine = teams().find((t) => t.isMyTeam)
    if (mine) return mine.id
    return picked.value && teams().some((t) => t.id === picked.value) ? picked.value : null
  })

  const isGuestPick = computed(() => !teams().some((t) => t.isMyTeam) && !!viewerTeamId.value)

  function pickTeam(teamId: string) {
    picked.value = teamId
    try { localStorage.setItem(storageKey(), teamId) } catch { /* ignore */ }
    void router.replace({ query: { ...route.query, team: teamId } })
  }

  return { viewerTeamId, isGuestPick, pickTeam }
}
