<template>
  <table class="table w-full">
    <thead>
      <tr>
        <th class="w-10 sm:w-20">Rank</th>
        <th class="min-w-[140px] sm:min-w-[180px]">Team</th>
        <th class="w-24 sm:w-28">Record</th>
        <th class="w-28 sm:w-32">All Play</th>
        <th class="w-28 sm:w-36">Points For</th>
        <th class="w-28 sm:w-36">Points Against</th>
      </tr>
    </thead>
    <tbody>
      <tr 
        v-for="team in teams" 
        :key="team.roster_id"
        @click="$emit('team-click', team)"
        class="cursor-pointer hover:bg-primary/5 transition-colors"
      >
        <td>
          <div class="flex items-center justify-center">
            <span class="inline-flex items-center justify-center w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-primary/10 text-primary font-bold text-xs sm:text-sm">
              {{ team.rank }}
            </span>
          </div>
        </td>
        <td>
          <div class="flex items-center gap-2 sm:gap-3">
            <div class="w-8 h-8 sm:w-12 sm:h-12 rounded-full overflow-hidden bg-dark-border flex-shrink-0">
              <img
                :src="team.avatar_url"
                :alt="team.team_name"
                class="w-full h-full object-cover"
                @error="handleImageError"
              />
            </div>
            <div class="flex items-center gap-2">
              <span class="font-semibold text-gray-900 dark:text-white text-xs sm:text-sm">
                {{ team.team_name }}
              </span>
              <svg class="w-4 h-4 text-primary/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </td>
        <td>
          <span class="font-semibold text-xs sm:text-sm" :class="getRecordClass(team)">
            {{ team.wins }}-{{ team.losses }}{{ team.ties > 0 ? `-${team.ties}` : '' }}
          </span>
        </td>
        <td>
          <span class="text-xs sm:text-sm" :class="getAllPlayClass(team)">
            {{ team.all_play_wins }}-{{ team.all_play_losses }}
          </span>
        </td>
        <td>
          <span class="font-semibold text-xs sm:text-sm" :class="getPointsForClass(team)">
            {{ team.points_for.toFixed(2) }}
          </span>
        </td>
        <td>
          <span class="font-semibold text-xs sm:text-sm" :class="getPointsAgainstClass(team)">
            {{ team.points_against.toFixed(2) }}
          </span>
        </td>
      </tr>
    </tbody>
  </table>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Team {
  roster_id: number
  rank: number
  team_name: string
  avatar_url: string
  wins: number
  losses: number
  ties: number
  all_play_wins: number
  all_play_losses: number
  points_for: number
  points_against: number
}

const props = defineProps<{
  teams: Team[]
  showHighlights?: boolean
}>()

defineEmits<{
  (e: 'team-click', team: Team): void
}>()

// Find best and worst for each category
const bestRecord = computed(() => {
  if (!props.showHighlights || !props.teams.length) return null
  return props.teams.reduce((best, team) => 
    (team.wins > best.wins || (team.wins === best.wins && team.losses < best.losses)) ? team : best
  )
})

const worstRecord = computed(() => {
  if (!props.showHighlights || !props.teams.length) return null
  return props.teams.reduce((worst, team) => 
    (team.wins < worst.wins || (team.wins === worst.wins && team.losses > worst.losses)) ? team : worst
  )
})

const bestAllPlay = computed(() => {
  if (!props.showHighlights || !props.teams.length) return null
  return props.teams.reduce((best, team) => 
    team.all_play_wins > best.all_play_wins ? team : best
  )
})

const worstAllPlay = computed(() => {
  if (!props.showHighlights || !props.teams.length) return null
  return props.teams.reduce((worst, team) => 
    team.all_play_wins < worst.all_play_wins ? team : worst
  )
})

const bestPointsFor = computed(() => {
  if (!props.showHighlights || !props.teams.length) return null
  return props.teams.reduce((best, team) => 
    team.points_for > best.points_for ? team : best
  )
})

const worstPointsFor = computed(() => {
  if (!props.showHighlights || !props.teams.length) return null
  return props.teams.reduce((worst, team) => 
    team.points_for < worst.points_for ? team : worst
  )
})

const bestPointsAgainst = computed(() => {
  // Best = LOWEST points against
  if (!props.showHighlights || !props.teams.length) return null
  return props.teams.reduce((best, team) => 
    team.points_against < best.points_against ? team : best
  )
})

const worstPointsAgainst = computed(() => {
  // Worst = HIGHEST points against
  if (!props.showHighlights || !props.teams.length) return null
  return props.teams.reduce((worst, team) => 
    team.points_against > worst.points_against ? team : worst
  )
})

function getRecordClass(team: Team) {
  if (!props.showHighlights) return 'text-gray-700 dark:text-gray-300'
  if (bestRecord.value && team.roster_id === bestRecord.value.roster_id) {
    return 'text-green-500 dark:text-green-400'
  }
  if (worstRecord.value && team.roster_id === worstRecord.value.roster_id) {
    return 'text-red-500 dark:text-red-400'
  }
  return 'text-gray-700 dark:text-gray-300'
}

function getAllPlayClass(team: Team) {
  if (!props.showHighlights) return 'text-gray-600 dark:text-gray-400'
  if (bestAllPlay.value && team.roster_id === bestAllPlay.value.roster_id) {
    return 'text-green-500 dark:text-green-400 font-semibold'
  }
  if (worstAllPlay.value && team.roster_id === worstAllPlay.value.roster_id) {
    return 'text-red-500 dark:text-red-400 font-semibold'
  }
  return 'text-gray-600 dark:text-gray-400'
}

function getPointsForClass(team: Team) {
  if (!props.showHighlights) return 'text-gray-700 dark:text-gray-300'
  if (bestPointsFor.value && team.roster_id === bestPointsFor.value.roster_id) {
    return 'text-green-500 dark:text-green-400'
  }
  if (worstPointsFor.value && team.roster_id === worstPointsFor.value.roster_id) {
    return 'text-red-500 dark:text-red-400'
  }
  return 'text-gray-700 dark:text-gray-300'
}

function getPointsAgainstClass(team: Team) {
  if (!props.showHighlights) return 'text-gray-700 dark:text-gray-300'
  // Best = lowest (green), Worst = highest (red)
  if (bestPointsAgainst.value && team.roster_id === bestPointsAgainst.value.roster_id) {
    return 'text-green-500 dark:text-green-400'
  }
  if (worstPointsAgainst.value && team.roster_id === worstPointsAgainst.value.roster_id) {
    return 'text-red-500 dark:text-red-400'
  }
  return 'text-gray-700 dark:text-gray-300'
}

function handleImageError(event: Event) {
  const img = event.target as HTMLImageElement
  img.src = 'https://sleepercdn.com/avatars/thumbs/default'
}
</script>
