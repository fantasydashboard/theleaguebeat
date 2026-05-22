<template>
  <div 
    class="rounded-xl border transition-all cursor-pointer"
    :class="[
      isSelected 
        ? 'bg-dark-card border-primary/50 shadow-lg shadow-primary/10' 
        : 'bg-dark-card/50 border-dark-border/50 hover:border-dark-border hover:bg-dark-card/80'
    ]"
    @click="$emit('select', matchup)"
  >
    <div class="p-4">
      <!-- Header -->
      <div class="flex items-center justify-between mb-3">
        <span class="text-xs font-semibold text-dark-textMuted uppercase tracking-wide">
          {{ headerLabel }}
        </span>
        <span 
          class="text-xs px-2 py-0.5 rounded-full"
          :class="statusClass"
        >
          {{ statusLabel }}
        </span>
      </div>

      <!-- Team 1 -->
      <div class="flex items-center justify-between mb-2">
        <div class="flex items-center gap-3 flex-1 min-w-0">
          <div class="relative">
            <img 
              v-if="matchup.team1.avatar"
              :src="matchup.team1.avatar" 
              :alt="matchup.team1.name" 
              class="w-10 h-10 rounded-full ring-2"
              :class="team1Won ? 'ring-green-500' : 'ring-dark-border'"
            />
            <div 
              v-else
              class="w-10 h-10 rounded-full ring-2 flex items-center justify-center text-sm font-bold"
              :class="[
                team1Won ? 'ring-green-500' : 'ring-dark-border',
                'bg-gradient-to-br from-primary/20 to-cyan-500/20 text-primary'
              ]"
            >
              {{ matchup.team1.name.substring(0, 2).toUpperCase() }}
            </div>
            <div 
              v-if="isMyTeam(matchup.team1.teamId)" 
              class="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full flex items-center justify-center"
            >
              <span class="text-[8px] text-gray-900 font-bold">★</span>
            </div>
          </div>
          <div class="min-w-0">
            <span 
              class="font-semibold truncate block"
              :class="getTeamTextClass(1)"
            >
              {{ matchup.team1.name }}
            </span>
            <span class="text-xs text-dark-textMuted">
              {{ matchup.team1.record?.wins }}-{{ matchup.team1.record?.losses }}
              <span v-if="matchup.team1.record?.ties">-{{ matchup.team1.record.ties }}</span>
            </span>
          </div>
        </div>
        <div class="text-right">
          <!-- Category Score (Wins-Losses-Ties) -->
          <div class="flex items-center gap-1 justify-end">
            <span class="text-xl font-bold text-green-400">{{ matchup.team1Wins || 0 }}</span>
            <span class="text-dark-textMuted">-</span>
            <span class="text-xl font-bold text-red-400">{{ matchup.team2Wins || 0 }}</span>
            <span v-if="matchup.ties" class="text-dark-textMuted">-</span>
            <span v-if="matchup.ties" class="text-xl font-bold text-dark-textMuted">{{ matchup.ties }}</span>
          </div>
        </div>
      </div>

      <!-- Team 2 -->
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3 flex-1 min-w-0">
          <div class="relative">
            <img 
              v-if="matchup.team2.avatar"
              :src="matchup.team2.avatar" 
              :alt="matchup.team2.name" 
              class="w-10 h-10 rounded-full ring-2"
              :class="team2Won ? 'ring-green-500' : 'ring-dark-border'"
            />
            <div 
              v-else
              class="w-10 h-10 rounded-full ring-2 flex items-center justify-center text-sm font-bold"
              :class="[
                team2Won ? 'ring-green-500' : 'ring-dark-border',
                'bg-gradient-to-br from-blue-500/20 to-purple-500/20 text-blue-400'
              ]"
            >
              {{ matchup.team2.name.substring(0, 2).toUpperCase() }}
            </div>
            <div 
              v-if="isMyTeam(matchup.team2.teamId)" 
              class="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full flex items-center justify-center"
            >
              <span class="text-[8px] text-gray-900 font-bold">★</span>
            </div>
          </div>
          <div class="min-w-0">
            <span 
              class="font-semibold truncate block"
              :class="getTeamTextClass(2)"
            >
              {{ matchup.team2.name }}
            </span>
            <span class="text-xs text-dark-textMuted">
              {{ matchup.team2.record?.wins }}-{{ matchup.team2.record?.losses }}
              <span v-if="matchup.team2.record?.ties">-{{ matchup.team2.record.ties }}</span>
            </span>
          </div>
        </div>
        <div class="text-right">
          <!-- Category Score (Wins-Losses-Ties) - from Team 2's perspective -->
          <div class="flex items-center gap-1 justify-end">
            <span class="text-xl font-bold text-green-400">{{ matchup.team2Wins || 0 }}</span>
            <span class="text-dark-textMuted">-</span>
            <span class="text-xl font-bold text-red-400">{{ matchup.team1Wins || 0 }}</span>
            <span v-if="matchup.ties" class="text-dark-textMuted">-</span>
            <span v-if="matchup.ties" class="text-xl font-bold text-dark-textMuted">{{ matchup.ties }}</span>
          </div>
        </div>
      </div>

      <!-- Category Breakdown (compact) -->
      <div 
        v-if="showCategories && categories.length > 0"
        class="mt-3 pt-3 border-t border-dark-border/30"
      >
        <div class="grid gap-1" :style="{ gridTemplateColumns: `repeat(${Math.min(categories.length, 5)}, 1fr)` }">
          <div 
            v-for="cat in displayCategories" 
            :key="cat.id"
            class="text-center p-1.5 rounded-lg"
            :class="getCategoryClass(cat.id)"
          >
            <div class="text-[10px] text-dark-textMuted uppercase tracking-wider truncate">
              {{ cat.shortName }}
            </div>
            <div class="text-xs font-semibold mt-0.5">
              {{ formatCategoryValue(cat.id, matchup.team1Categories?.[cat.id]) }}
            </div>
            <div class="text-xs mt-0.5">
              {{ formatCategoryValue(cat.id, matchup.team2Categories?.[cat.id]) }}
            </div>
          </div>
        </div>
        <div v-if="categories.length > 5" class="text-center mt-2">
          <button 
            @click.stop="showAllCategories = !showAllCategories"
            class="text-xs text-primary hover:text-primary/80"
          >
            {{ showAllCategories ? 'Show Less' : `+${categories.length - 5} more` }}
          </button>
        </div>
      </div>

      <!-- Win/Loss Summary -->
      <div 
        v-if="matchup.isCompleted"
        class="mt-3 pt-3 border-t border-dark-border/30 text-center"
      >
        <span class="text-xs text-dark-textMuted">
          <template v-if="team1Won">
            {{ matchup.team1.name }} wins {{ matchup.team1Wins }}-{{ matchup.team2Wins }}<template v-if="matchup.ties">-{{ matchup.ties }}</template>
          </template>
          <template v-else-if="team2Won">
            {{ matchup.team2.name }} wins {{ matchup.team2Wins }}-{{ matchup.team1Wins }}<template v-if="matchup.ties">-{{ matchup.ties }}</template>
          </template>
          <template v-else>
            Tied {{ matchup.team1Wins }}-{{ matchup.team2Wins }}-{{ matchup.ties }}
          </template>
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { UnifiedMatchup, SportType, StatDefinition } from '@/config/sports'
import { getSportConfig, isNegativeStat, formatStatValue } from '@/config/sports'

const props = defineProps<{
  matchup: UnifiedMatchup
  sport: SportType
  isSelected?: boolean
  myTeamId?: string
  headerLabel?: string
  showCategories?: boolean
}>()

defineEmits<{
  (e: 'select', matchup: UnifiedMatchup): void
}>()

const showAllCategories = ref(false)

// Get sport config for category definitions
const sportConfig = computed(() => getSportConfig(props.sport))

// Get category definitions
const categories = computed((): (StatDefinition & { id: string })[] => {
  const config = sportConfig.value
  return config.categoryStatIds
    .map(id => {
      const stat = config.allStats[id]
      return stat ? { ...stat, id } : null
    })
    .filter(Boolean) as (StatDefinition & { id: string })[]
})

const displayCategories = computed(() => {
  if (showAllCategories.value) return categories.value
  return categories.value.slice(0, 5)
})

// Computed properties
const team1Won = computed(() => {
  const t1 = props.matchup.team1Wins || 0
  const t2 = props.matchup.team2Wins || 0
  return t1 > t2
})

const team2Won = computed(() => {
  const t1 = props.matchup.team1Wins || 0
  const t2 = props.matchup.team2Wins || 0
  return t2 > t1
})

const statusLabel = computed(() => {
  if (props.matchup.isCompleted) return 'Final'
  if (props.matchup.isPlayoff) return 'Playoff'
  const hasStats = props.matchup.team1Categories && Object.keys(props.matchup.team1Categories).length > 0
  if (hasStats) return 'Live'
  return 'Upcoming'
})

const statusClass = computed(() => {
  switch (statusLabel.value) {
    case 'Final':
      return 'bg-dark-border/50 text-dark-textMuted'
    case 'Live':
      return 'bg-green-500/20 text-green-400'
    case 'Playoff':
      return 'bg-yellow-500/20 text-yellow-400'
    default:
      return 'bg-blue-500/20 text-blue-400'
  }
})

// Methods
function isMyTeam(teamId: string): boolean {
  return props.myTeamId === teamId
}

function getTeamTextClass(teamNum: 1 | 2): string {
  const isTeam1 = teamNum === 1
  const won = isTeam1 ? team1Won.value : team2Won.value
  const lost = isTeam1 ? team2Won.value : team1Won.value
  const isMine = isTeam1 
    ? isMyTeam(props.matchup.team1.teamId) 
    : isMyTeam(props.matchup.team2.teamId)
  
  if (props.matchup.isCompleted) {
    if (won) return 'text-green-400'
    if (lost) return 'text-dark-textMuted'
  }
  
  if (isMine) return 'text-primary'
  return 'text-dark-text'
}

function getCategoryClass(statId: string): string {
  const val1 = props.matchup.team1Categories?.[statId] || 0
  const val2 = props.matchup.team2Categories?.[statId] || 0
  
  if (val1 === val2) return 'bg-dark-border/20'
  
  const isNegative = isNegativeStat(props.sport, statId)
  const team1Better = isNegative ? val1 < val2 : val1 > val2
  
  // We're showing from team 1's perspective at top
  return team1Better ? 'bg-green-500/10' : 'bg-red-500/10'
}

function formatCategoryValue(statId: string, value: number | undefined): string {
  return formatStatValue(props.sport, statId, value)
}
</script>
