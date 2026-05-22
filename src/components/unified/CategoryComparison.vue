<template>
  <div class="space-y-4">
    <!-- Summary Header -->
    <div class="flex items-center justify-between p-4 bg-dark-border/20 rounded-xl">
      <div class="text-center flex-1">
        <div class="text-2xl font-bold" :class="team1Leading ? 'text-green-400' : 'text-dark-text'">
          {{ matchup.team1Wins || 0 }}
        </div>
        <div class="text-xs text-dark-textMuted mt-1">{{ matchup.team1.name }}</div>
      </div>
      <div class="px-4">
        <div class="text-lg text-dark-textMuted">-</div>
      </div>
      <div class="text-center flex-1">
        <div class="text-2xl font-bold" :class="team2Leading ? 'text-green-400' : 'text-dark-text'">
          {{ matchup.team2Wins || 0 }}
        </div>
        <div class="text-xs text-dark-textMuted mt-1">{{ matchup.team2.name }}</div>
      </div>
      <div v-if="matchup.ties" class="px-4">
        <div class="text-lg text-dark-textMuted">-</div>
      </div>
      <div v-if="matchup.ties" class="text-center">
        <div class="text-2xl font-bold text-dark-textMuted">
          {{ matchup.ties }}
        </div>
        <div class="text-xs text-dark-textMuted mt-1">Ties</div>
      </div>
    </div>

    <!-- Category Breakdown -->
    <div class="space-y-2">
      <!-- Batting/Offense Header -->
      <div v-if="battingCategories.length > 0" class="mt-4">
        <h4 class="text-xs font-semibold text-dark-textMuted uppercase tracking-wider mb-2">
          {{ sport === 'baseball' ? 'Batting' : sport === 'hockey' ? 'Skaters' : 'Offense' }}
        </h4>
        <div class="space-y-1">
          <div 
            v-for="cat in battingCategories" 
            :key="cat.id"
            class="flex items-center gap-2 p-2 rounded-lg"
            :class="getCategoryRowClass(cat.id)"
          >
            <!-- Team 1 Value -->
            <div class="w-20 text-right">
              <span 
                class="font-semibold"
                :class="getValueClass(cat.id, 1)"
              >
                {{ formatValue(cat.id, matchup.team1Categories?.[cat.id]) }}
              </span>
            </div>

            <!-- Progress Bar -->
            <div class="flex-1 h-2 bg-dark-border/30 rounded-full overflow-hidden flex">
              <div 
                class="h-full transition-all duration-300"
                :class="getTeam1BarClass(cat.id)"
                :style="{ width: `${getTeam1Percentage(cat.id)}%` }"
              ></div>
              <div 
                class="h-full transition-all duration-300"
                :class="getTeam2BarClass(cat.id)"
                :style="{ width: `${getTeam2Percentage(cat.id)}%` }"
              ></div>
            </div>

            <!-- Category Name -->
            <div class="w-16 text-center">
              <span class="text-xs text-dark-textMuted">{{ cat.shortName }}</span>
              <span v-if="cat.isNegative" class="text-[8px] text-dark-textMuted ml-0.5">↓</span>
            </div>

            <!-- Progress Bar -->
            <div class="flex-1 h-2 bg-dark-border/30 rounded-full overflow-hidden flex">
              <div 
                class="h-full transition-all duration-300"
                :class="getTeam1BarClass(cat.id)"
                :style="{ width: `${getTeam1Percentage(cat.id)}%` }"
              ></div>
              <div 
                class="h-full transition-all duration-300"
                :class="getTeam2BarClass(cat.id)"
                :style="{ width: `${getTeam2Percentage(cat.id)}%` }"
              ></div>
            </div>

            <!-- Team 2 Value -->
            <div class="w-20 text-left">
              <span 
                class="font-semibold"
                :class="getValueClass(cat.id, 2)"
              >
                {{ formatValue(cat.id, matchup.team2Categories?.[cat.id]) }}
              </span>
            </div>

            <!-- Winner Indicator -->
            <div class="w-6 text-center">
              <span v-if="getCategoryWinner(cat.id) === 1" class="text-green-400">✓</span>
              <span v-else-if="getCategoryWinner(cat.id) === 2" class="text-blue-400">✓</span>
              <span v-else class="text-dark-textMuted">—</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Pitching/Defense Header -->
      <div v-if="pitchingCategories.length > 0" class="mt-4">
        <h4 class="text-xs font-semibold text-dark-textMuted uppercase tracking-wider mb-2">
          {{ sport === 'baseball' ? 'Pitching' : sport === 'hockey' ? 'Goalies' : 'Defense' }}
        </h4>
        <div class="space-y-1">
          <div 
            v-for="cat in pitchingCategories" 
            :key="cat.id"
            class="flex items-center gap-2 p-2 rounded-lg"
            :class="getCategoryRowClass(cat.id)"
          >
            <!-- Team 1 Value -->
            <div class="w-20 text-right">
              <span 
                class="font-semibold"
                :class="getValueClass(cat.id, 1)"
              >
                {{ formatValue(cat.id, matchup.team1Categories?.[cat.id]) }}
              </span>
            </div>

            <!-- Category Name -->
            <div class="flex-1 text-center">
              <span class="text-xs text-dark-textMuted">{{ cat.shortName }}</span>
              <span v-if="cat.isNegative" class="text-[8px] text-dark-textMuted ml-0.5">↓</span>
            </div>

            <!-- Team 2 Value -->
            <div class="w-20 text-left">
              <span 
                class="font-semibold"
                :class="getValueClass(cat.id, 2)"
              >
                {{ formatValue(cat.id, matchup.team2Categories?.[cat.id]) }}
              </span>
            </div>

            <!-- Winner Indicator -->
            <div class="w-6 text-center">
              <span v-if="getCategoryWinner(cat.id) === 1" class="text-green-400">✓</span>
              <span v-else-if="getCategoryWinner(cat.id) === 2" class="text-blue-400">✓</span>
              <span v-else class="text-dark-textMuted">—</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Legend -->
    <div class="flex items-center justify-center gap-6 pt-4 border-t border-dark-border/30 text-xs text-dark-textMuted">
      <div class="flex items-center gap-1">
        <span class="text-green-400">✓</span>
        <span>{{ matchup.team1.name }} wins</span>
      </div>
      <div class="flex items-center gap-1">
        <span class="text-blue-400">✓</span>
        <span>{{ matchup.team2.name }} wins</span>
      </div>
      <div class="flex items-center gap-1">
        <span>↓</span>
        <span>Lower is better</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { UnifiedMatchup, SportType, StatDefinition } from '@/config/sports'
import { getSportConfig, isNegativeStat, formatStatValue } from '@/config/sports'

const props = defineProps<{
  matchup: UnifiedMatchup
  sport: SportType
}>()

// Get sport config
const sportConfig = computed(() => getSportConfig(props.sport))

// Split categories into batting/pitching (or equivalent)
const allCategories = computed(() => {
  const config = sportConfig.value
  return config.categoryStatIds.map(id => {
    const stat = config.allStats[id]
    return stat ? { ...stat, id, isNegative: stat.isNegative || false } : null
  }).filter(Boolean) as (StatDefinition & { id: string; isNegative: boolean })[]
})

// For baseball: batting vs pitching
// For basketball/hockey: different groupings
const battingCategories = computed(() => {
  if (props.sport === 'baseball') {
    const battingIds = ['R', 'HR', 'RBI', 'SB', 'AVG', 'OBP', 'SLG', 'OPS', 'H', 'BB']
    return allCategories.value.filter(c => battingIds.includes(c.id))
  }
  if (props.sport === 'hockey') {
    const skaterIds = ['G', 'A', 'PTS', '+/-', 'PIM', 'PPP', 'SOG', 'HIT', 'BLK']
    return allCategories.value.filter(c => skaterIds.includes(c.id))
  }
  // Basketball - all categories are player stats
  return allCategories.value
})

const pitchingCategories = computed(() => {
  if (props.sport === 'baseball') {
    const pitchingIds = ['W', 'SV', 'K', 'ERA', 'WHIP', 'QS', 'HLD']
    return allCategories.value.filter(c => pitchingIds.includes(c.id))
  }
  if (props.sport === 'hockey') {
    const goalieIds = ['W_G', 'GAA', 'SV%', 'SO']
    return allCategories.value.filter(c => goalieIds.includes(c.id))
  }
  return []
})

const team1Leading = computed(() => (props.matchup.team1Wins || 0) > (props.matchup.team2Wins || 0))
const team2Leading = computed(() => (props.matchup.team2Wins || 0) > (props.matchup.team1Wins || 0))

// Methods
function getCategoryWinner(statId: string): 0 | 1 | 2 {
  const val1 = props.matchup.team1Categories?.[statId] || 0
  const val2 = props.matchup.team2Categories?.[statId] || 0
  
  if (val1 === val2) return 0
  
  const isNegative = isNegativeStat(props.sport, statId)
  
  if (isNegative) {
    return val1 < val2 ? 1 : 2
  }
  return val1 > val2 ? 1 : 2
}

function getCategoryRowClass(statId: string): string {
  const winner = getCategoryWinner(statId)
  if (winner === 1) return 'bg-green-500/5'
  if (winner === 2) return 'bg-blue-500/5'
  return 'bg-dark-border/10'
}

function getValueClass(statId: string, team: 1 | 2): string {
  const winner = getCategoryWinner(statId)
  if (winner === team) return team === 1 ? 'text-green-400' : 'text-blue-400'
  if (winner !== 0) return 'text-dark-textMuted'
  return 'text-dark-text'
}

function getTeam1BarClass(statId: string): string {
  const winner = getCategoryWinner(statId)
  if (winner === 1) return 'bg-green-500'
  return 'bg-green-500/30'
}

function getTeam2BarClass(statId: string): string {
  const winner = getCategoryWinner(statId)
  if (winner === 2) return 'bg-blue-500'
  return 'bg-blue-500/30'
}

function getTeam1Percentage(statId: string): number {
  const val1 = props.matchup.team1Categories?.[statId] || 0
  const val2 = props.matchup.team2Categories?.[statId] || 0
  const total = val1 + val2
  if (total === 0) return 50
  return (val1 / total) * 100
}

function getTeam2Percentage(statId: string): number {
  return 100 - getTeam1Percentage(statId)
}

function formatValue(statId: string, value: number | undefined): string {
  return formatStatValue(props.sport, statId, value)
}
</script>
