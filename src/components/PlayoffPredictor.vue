<template>
  <div class="space-y-6">
    <!-- Playoff Predictor Section -->
    <div class="card">
      <div class="card-header flex items-center justify-between">
        <div class="flex items-center gap-2">
          <span class="text-2xl">🏆</span>
          <h2 class="card-title">Playoff Predictor</h2>
        </div>
        <button @click="showSettings = !showSettings" class="btn-secondary text-sm">
          <svg class="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Settings
        </button>
      </div>

      <!-- Settings Panel -->
      <div v-if="showSettings" class="px-6 py-4 bg-dark-border/30 border-b border-dark-border">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <!-- Playoff Format -->
          <div>
            <label class="block text-xs font-semibold text-dark-textMuted mb-2 uppercase">Playoff Format</label>
            <select v-model="settings.format" class="select w-full text-sm">
              <option value="top_overall">Top Teams Overall</option>
              <option value="division">Division Winners + Wild Cards</option>
            </select>
          </div>

          <!-- Playoff Teams -->
          <div>
            <label class="block text-xs font-semibold text-dark-textMuted mb-2 uppercase">Playoff Teams</label>
            <input v-model.number="settings.playoffTeams" type="number" min="2" max="12" class="select w-full text-sm" />
          </div>

          <!-- Bye Weeks -->
          <div>
            <label class="block text-xs font-semibold text-dark-textMuted mb-2 uppercase">First Round Byes</label>
            <select v-model="settings.byeRule" class="select w-full text-sm">
              <option value="top2">Top 2 Overall</option>
              <option value="divisionWinners" v-if="hasDivisions">Top from Each Division</option>
              <option value="top2DivWinners" v-if="divisions.size >= 3">Top 2 Division Winners</option>
            </select>
          </div>
        </div>

        <!-- Division Info -->
        <div v-if="hasDivisions && settings.format === 'division'" class="mt-4 pt-4 border-t border-dark-border">
          <div class="text-xs font-semibold text-dark-textMuted mb-3 uppercase">Detected Divisions</div>
          <div class="flex flex-wrap gap-3">
            <div v-for="[divId, division] of divisions" :key="divId" 
                 class="px-3 py-2 bg-dark-bg rounded-lg border border-dark-border">
              <div class="text-sm font-bold text-primary">{{ division.name }}</div>
              <div class="text-xs text-dark-textMuted">{{ division.teams.length }} teams</div>
            </div>
          </div>
        </div>
      </div>

      <div class="card-body">
        <!-- Simulation Controls -->
        <div class="flex items-center justify-between mb-6 pb-4 border-b border-dark-border">
          <div>
            <div class="text-sm text-dark-textMuted mb-1">Simulate remaining games to calculate playoff odds</div>
            <div class="text-xs text-dark-textMuted">
              {{ remainingGames }} games remaining • {{ settings.simulations.toLocaleString() }} simulations
            </div>
          </div>
          <button 
            @click="runSimulation" 
            :disabled="isSimulating || remainingGames === 0"
            class="btn-primary"
          >
            {{ isSimulating ? 'Simulating...' : 'Run Simulation' }}
          </button>
        </div>

        <!-- Results Table -->
        <div v-if="simulationResults.length > 0" class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-dark-border">
                <th class="text-left py-3 px-2 font-semibold text-dark-textSecondary uppercase text-xs">Team</th>
                <th class="text-center py-3 px-2 font-semibold text-dark-textSecondary uppercase text-xs">Current</th>
                <th class="text-center py-3 px-2 font-semibold text-dark-textSecondary uppercase text-xs">Projected</th>
                <th class="text-center py-3 px-2 font-semibold text-dark-textSecondary uppercase text-xs">Playoff %</th>
                <th class="text-center py-3 px-2 font-semibold text-dark-textSecondary uppercase text-xs">Bye %</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="result in simulationResults" :key="result.roster_id"
                  class="border-b border-dark-border hover:bg-dark-border/30 transition-colors">
                <td class="py-3 px-2">
                  <div class="flex items-center gap-2">
                    <img :src="result.avatar" :alt="result.name" 
                         class="w-8 h-8 rounded-full" @error="handleImageError" />
                    <div>
                      <div class="font-semibold text-dark-text">{{ result.name }}</div>
                      <div v-if="result.division" class="text-xs text-dark-textMuted">{{ result.division }}</div>
                    </div>
                  </div>
                </td>
                <td class="text-center py-3 px-2">
                  <div class="font-semibold text-dark-text">{{ result.currentWins }}-{{ result.currentLosses }}</div>
                </td>
                <td class="text-center py-3 px-2">
                  <div class="font-semibold text-dark-text">{{ result.avgWins.toFixed(1) }}-{{ result.avgLosses.toFixed(1) }}</div>
                </td>
                <td class="text-center py-3 px-2">
                  <div class="flex items-center justify-center gap-2">
                    <div class="flex-1 max-w-[100px] bg-dark-border rounded-full h-2">
                      <div class="bg-primary h-2 rounded-full transition-all" 
                           :style="{ width: `${result.playoffProbability}%` }"></div>
                    </div>
                    <div class="font-bold min-w-[45px]" 
                         :class="result.playoffProbability >= 95 ? 'text-green-400' : 
                                 result.playoffProbability >= 50 ? 'text-primary' : 
                                 result.playoffProbability >= 10 ? 'text-orange-400' : 'text-red-400'">
                      {{ result.playoffProbability.toFixed(0) }}%
                    </div>
                  </div>
                </td>
                <td class="text-center py-3 px-2">
                  <div class="font-semibold" 
                       :class="result.byeProbability >= 50 ? 'text-primary' : 'text-dark-textMuted'">
                    {{ result.byeProbability ? result.byeProbability.toFixed(0) + '%' : '-' }}
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- No Results Message -->
        <div v-else class="text-center py-12">
          <div class="text-4xl mb-4">🎲</div>
          <p class="text-dark-textMuted">Click "Run Simulation" to calculate playoff probabilities</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useLeagueStore } from '@/stores/league'

const props = defineProps<{
  season: string
}>()

const leagueStore = useLeagueStore()

// State
const showSettings = ref(false)
const isSimulating = ref(false)

const settings = ref({
  format: 'top_overall' as 'top_overall' | 'division',
  playoffTeams: 6,
  byeRule: 'top2' as 'top2' | 'divisionWinners' | 'top2DivWinners',
  simulations: 10000
})

interface SimulationResult {
  roster_id: number
  name: string
  avatar: string
  division?: string
  currentWins: number
  currentLosses: number
  avgWins: number
  avgLosses: number
  playoffProbability: number
  byeProbability: number
}

const simulationResults = ref<SimulationResult[]>([])

// Get divisions from rosters
const divisions = computed(() => {
  const divs = new Map<number, { id: number; name: string; teams: any[] }>()
  
  const rosters = leagueStore.historicalRosters.get(props.season) || []
  const users = leagueStore.historicalUsers.get(props.season) || []
  const seasonInfo = leagueStore.historicalSeasons.find(s => s.season === props.season)
  const divisionNames = seasonInfo?.metadata?.divisions || {}
  
  rosters.forEach(roster => {
    const divId = roster.settings?.division || 0
    
    if (!divs.has(divId)) {
      divs.set(divId, {
        id: divId,
        name: divisionNames[divId] || `Division ${divId}`,
        teams: []
      })
    }
    
    const user = users.find(u => u.user_id === roster.owner_id)
    divs.get(divId)!.teams.push({ roster, user })
  })
  
  return divs
})

const hasDivisions = computed(() => divisions.value.size > 1)

const currentWeekInfo = computed(() => {
  const matchups = leagueStore.historicalMatchups.get(props.season)
  const seasonInfo = leagueStore.historicalSeasons.find(s => s.season === props.season)
  const playoffStart = seasonInfo?.settings?.playoff_week_start || 15
  
  if (!matchups) return { lastCompletedWeek: 0, currentWeek: 1, playoffStart }
  
  // Find the last week with completed matchups (all teams have scores)
  let lastCompletedWeek = 0
  const rosters = leagueStore.historicalRosters.get(props.season) || []
  const teamCount = rosters.length
  
  for (let week = 1; week < playoffStart; week++) {
    const weekMatchups = matchups.get(week) || []
    // Check if all teams have scores for this week
    if (weekMatchups.length === teamCount && weekMatchups.every(m => m.points && m.points > 0)) {
      lastCompletedWeek = week
    } else {
      break // Stop at first incomplete week
    }
  }
  
  return {
    lastCompletedWeek,
    currentWeek: lastCompletedWeek + 1,
    playoffStart
  }
})

const remainingGames = computed(() => {
  const matchups = leagueStore.historicalMatchups.get(props.season)
  if (!matchups) return 0
  
  const rosters = leagueStore.historicalRosters.get(props.season) || []
  const teamCount = rosters.length
  const matchupsPerWeek = teamCount / 2
  const weeksRemaining = currentWeekInfo.value.playoffStart - currentWeekInfo.value.currentWeek
  
  console.log('🎲 Playoff Predictor:', {
    season: props.season,
    playoffStart: currentWeekInfo.value.playoffStart,
    lastCompletedWeek: currentWeekInfo.value.lastCompletedWeek,
    currentWeek: currentWeekInfo.value.currentWeek,
    weeksRemaining,
    matchupsPerWeek,
    totalRemainingGames: Math.max(0, weeksRemaining * matchupsPerWeek)
  })
  
  return Math.max(0, weeksRemaining * matchupsPerWeek)
})

function handleImageError(event: Event) {
  const img = event.target as HTMLImageElement
  img.src = 'https://sleepercdn.com/avatars/thumbs/default'
}

async function runSimulation() {
  isSimulating.value = true
  simulationResults.value = []
  
  try {
    const rosters = leagueStore.historicalRosters.get(props.season) || []
    const users = leagueStore.historicalUsers.get(props.season) || []
    const matchups = leagueStore.historicalMatchups.get(props.season)
    
    if (!matchups) return
    
    const { currentWeek, playoffStart } = currentWeekInfo.value
    
    console.log('🎲 Starting simulation:', { currentWeek, playoffStart, remainingWeeks: playoffStart - currentWeek })
    
    // Calculate current standings
    const standings = rosters.map(roster => {
      let wins = 0
      let losses = 0
      let pointsFor = 0
      
      // Count actual wins/losses from completed weeks
      matchups.forEach((weekMatchups, week) => {
        if (week >= currentWeek) return // Only count completed weeks
        const match = weekMatchups.find(m => m.roster_id === roster.roster_id)
        if (match && match.points) {
          pointsFor += match.points
          
          // Find opponent and compare scores
          const matchupId = match.matchup_id
          const opponent = weekMatchups.find(m => m.matchup_id === matchupId && m.roster_id !== roster.roster_id)
          if (opponent && opponent.points) {
            if (match.points > opponent.points) {
              wins++
            } else if (match.points < opponent.points) {
              losses++
            }
          }
        }
      })
      
      const user = users.find(u => u.user_id === roster.owner_id)
      const division = divisions.value.get(roster.settings?.division || 0)
      
      return {
        roster_id: roster.roster_id,
        name: user?.metadata?.team_name || user?.display_name || `Team ${roster.roster_id}`,
        avatar: user?.avatar ? `https://sleepercdn.com/avatars/thumbs/${user.avatar}` : 'https://sleepercdn.com/avatars/thumbs/default',
        division: division?.name,
        wins,
        losses,
        pointsFor
      }
    })
    
    // Run Monte Carlo simulation
    const results: SimulationResult[] = []
    const numSimulations = settings.value.simulations
    
    for (const team of standings) {
      let playoffAppearances = 0
      let byeAppearances = 0
      let totalWins = 0
      let totalLosses = 0
      
      for (let sim = 0; sim < numSimulations; sim++) {
        // Simulate remaining games (simplified - random 50/50)
        let simWins = team.wins
        let simLosses = team.losses
        
        for (let week = currentWeek; week < playoffStart; week++) {
          // Simplified: 50/50 win probability
          if (Math.random() > 0.5) {
            simWins++
          } else {
            simLosses++
          }
        }
        
        totalWins += simWins
        totalLosses += simLosses
        
        // Determine playoff qualification (simplified)
        const finalRecord = simWins
        
        // Top N teams make playoffs
        if (finalRecord >= playoffStart - 8) { // Simplified threshold
          playoffAppearances++
          
          // Top 2 get byes
          if (finalRecord >= playoffStart - 6) {
            byeAppearances++
          }
        }
      }
      
      results.push({
        roster_id: team.roster_id,
        name: team.name,
        avatar: team.avatar,
        division: team.division,
        currentWins: team.wins,
        currentLosses: team.losses,
        avgWins: totalWins / numSimulations,
        avgLosses: totalLosses / numSimulations,
        playoffProbability: (playoffAppearances / numSimulations) * 100,
        byeProbability: (byeAppearances / numSimulations) * 100
      })
    }
    
    // Sort by playoff probability
    simulationResults.value = results.sort((a, b) => b.playoffProbability - a.playoffProbability)
    
  } catch (error) {
    console.error('Simulation failed:', error)
  } finally {
    isSimulating.value = false
  }
}

// Watch for season changes
watch(() => props.season, () => {
  simulationResults.value = []
})
</script>
