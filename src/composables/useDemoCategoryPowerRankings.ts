import { ref, computed, readonly } from 'vue'
import {
  factorDefs,
  categoryPresets,
  teamFactorScores,
  teams,
  seasonRankHistory,
  currentWeek,
  type CategoryFactorScores,
} from '@/fixtures/categoriesLeague'

/* ─────────────────────────────────────────────────────────────────
   Module-scoped reactive state so the Customize modal and the
   Category Power Rankings page share a single source of truth.
   Parallel to useDemoPowerRankings (football) but bound to the
   6 category-league factors and the 4 category presets.
───────────────────────────────────────────────────────────────── */

type FactorId = keyof CategoryFactorScores

const weights = ref<Record<FactorId, number>>(
  Object.fromEntries(factorDefs.map((f) => [f.id, f.defaultWeight])) as Record<FactorId, number>,
)

const enabled = ref<Record<FactorId, boolean>>(
  Object.fromEntries(factorDefs.map((f) => [f.id, true])) as Record<FactorId, boolean>,
)

const activePresetId = ref<string | null>('balanced')

function applyPreset(presetId: string) {
  const preset = categoryPresets.find((p) => p.id === presetId)
  if (!preset) return
  for (const f of factorDefs) {
    weights.value[f.id] = preset.weights[f.id]
    enabled.value[f.id] = preset.weights[f.id] > 0
  }
  activePresetId.value = presetId
}

function setWeight(id: FactorId, value: number) {
  weights.value[id] = Math.max(0, Math.min(100, Math.round(value)))
  activePresetId.value = null
}

function toggleFactor(id: FactorId) {
  enabled.value[id] = !enabled.value[id]
  activePresetId.value = null
}

function resetToDefaults() {
  applyPreset('balanced')
}

// Per-team weighted power score, 0..100 (one decimal).
const teamPowerScores = computed<Record<string, number>>(() => {
  const result: Record<string, number> = {}
  const totalEnabledWeight =
    factorDefs
      .filter((f) => enabled.value[f.id])
      .reduce((sum, f) => sum + weights.value[f.id], 0) || 1
  for (const team of teams) {
    const factor = teamFactorScores[team.id]
    let score = 0
    for (const f of factorDefs) {
      if (!enabled.value[f.id]) continue
      score += (factor[f.id] * weights.value[f.id]) / totalEnabledWeight
    }
    result[team.id] = Math.round(score * 10) / 10
  }
  return result
})

export interface LiveRankingEntry {
  teamId: string
  score: number
  rank: number
  prevRank: number
  change: number
}

// Ranked array of teams under the current weights. `prevRank` comes from
// the previous week (currentWeek - 1) so the MOVE column shows real
// week-over-week movement until the user changes weights.
const liveRankings = computed<LiveRankingEntry[]>(() => {
  const scored = teams
    .map((t) => ({
      teamId: t.id,
      score: teamPowerScores.value[t.id],
    }))
    .sort((a, b) => b.score - a.score)
  const prevWeekIdx = seasonRankHistory.findIndex((w) => w.week === currentWeek - 1)
  const prevWeekRanks =
    prevWeekIdx >= 0
      ? seasonRankHistory[prevWeekIdx].ranks
      : seasonRankHistory[seasonRankHistory.length - 2]?.ranks ?? {}
  return scored.map((entry, idx) => {
    const prevRank = prevWeekRanks[entry.teamId] ?? idx + 1
    const rank = idx + 1
    return {
      teamId: entry.teamId,
      score: entry.score,
      rank,
      prevRank,
      change: prevRank - rank, // positive = moved up
    }
  })
})

export function useDemoCategoryPowerRankings() {
  return {
    weights: readonly(weights),
    enabled: readonly(enabled),
    activePresetId: readonly(activePresetId),
    teamPowerScores,
    liveRankings,
    applyPreset,
    setWeight,
    toggleFactor,
    resetToDefaults,
  }
}
