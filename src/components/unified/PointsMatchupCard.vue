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
              class="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full flex items-center justify-center"
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
          <div 
            class="text-xl font-bold"
            :class="getTeamTextClass(1)"
          >
            {{ formatScore(matchup.team1Score) }}
          </div>
          <div 
            v-if="matchup.team1Projected && !matchup.isCompleted" 
            class="text-xs text-dark-textMuted"
          >
            proj {{ formatScore(matchup.team1Projected) }}
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
              class="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full flex items-center justify-center"
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
          <div 
            class="text-xl font-bold"
            :class="getTeamTextClass(2)"
          >
            {{ formatScore(matchup.team2Score) }}
          </div>
          <div 
            v-if="matchup.team2Projected && !matchup.isCompleted" 
            class="text-xs text-dark-textMuted"
          >
            proj {{ formatScore(matchup.team2Projected) }}
          </div>
        </div>
      </div>

      <!-- Win Probability Bar (if not completed and has projections) -->
      <div 
        v-if="!matchup.isCompleted && matchup.team1Projected && matchup.team2Projected"
        class="mt-3 pt-3 border-t border-dark-border/30"
      >
        <div class="flex items-center justify-between text-xs text-dark-textMuted mb-1">
          <span>{{ team1WinProbability }}%</span>
          <span>Win Probability</span>
          <span>{{ team2WinProbability }}%</span>
        </div>
        <div class="h-1.5 bg-dark-border/50 rounded-full overflow-hidden flex">
          <div 
            class="h-full bg-gradient-to-r from-primary to-cyan-500 transition-all duration-300"
            :style="{ width: `${team1WinProbability}%` }"
          ></div>
          <div 
            class="h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-300"
            :style="{ width: `${team2WinProbability}%` }"
          ></div>
        </div>
      </div>

      <!-- Margin indicator (if completed) -->
      <div 
        v-if="matchup.isCompleted"
        class="mt-3 pt-3 border-t border-dark-border/30 text-center"
      >
        <span class="text-xs text-dark-textMuted">
          {{ winnerName }} wins by {{ marginOfVictory.toFixed(1) }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { UnifiedMatchup } from '@/config/sports'

const props = defineProps<{
  matchup: UnifiedMatchup
  isSelected?: boolean
  myTeamId?: string
  headerLabel?: string
}>()

defineEmits<{
  (e: 'select', matchup: UnifiedMatchup): void
}>()

// Computed properties
const team1Won = computed(() => {
  if (!props.matchup.isCompleted) return false
  return (props.matchup.team1Score || 0) > (props.matchup.team2Score || 0)
})

const team2Won = computed(() => {
  if (!props.matchup.isCompleted) return false
  return (props.matchup.team2Score || 0) > (props.matchup.team1Score || 0)
})

const statusLabel = computed(() => {
  if (props.matchup.isCompleted) return 'Final'
  if (props.matchup.isPlayoff) return 'Playoff'
  if ((props.matchup.team1Score || 0) > 0 || (props.matchup.team2Score || 0) > 0) return 'Live'
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

const team1WinProbability = computed(() => {
  const proj1 = props.matchup.team1Projected || 0
  const proj2 = props.matchup.team2Projected || 0
  if (proj1 + proj2 === 0) return 50
  return Math.round((proj1 / (proj1 + proj2)) * 100)
})

const team2WinProbability = computed(() => {
  return 100 - team1WinProbability.value
})

const marginOfVictory = computed(() => {
  return Math.abs((props.matchup.team1Score || 0) - (props.matchup.team2Score || 0))
})

const winnerName = computed(() => {
  if (team1Won.value) return props.matchup.team1.name
  if (team2Won.value) return props.matchup.team2.name
  return 'Tie'
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

function formatScore(score: number | undefined): string {
  if (score === undefined || score === null) return '0.0'
  return score.toFixed(1)
}
</script>
