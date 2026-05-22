<template>
  <tr class="bg-dark-bg/80">
    <td :colspan="colspan" class="p-0">
      <div class="p-4 space-y-4 border-y border-primary/30">
        <!-- Header Row -->
        <div class="flex items-start justify-between">
          <div class="flex items-center gap-4">
            <div class="w-16 h-16 rounded-full bg-dark-border overflow-hidden ring-2 ring-primary/50">
              <img :src="playerImageUrl" :alt="player.full_name" class="w-full h-full object-cover" @error="handleImageError" />
            </div>
            <div>
              <h3 class="text-xl font-bold text-dark-text">{{ player.full_name }}</h3>
              <div class="flex items-center gap-3 text-sm text-dark-textMuted">
                <span class="px-2 py-0.5 rounded text-xs font-bold" :class="positionClass">{{ player.position }}</span>
                <span>{{ player.team || 'FA' }}</span>
                <span v-if="player.byeWeek">• Bye: Week {{ player.byeWeek }}</span>
              </div>
            </div>
          </div>
          <button @click="$emit('close')" class="p-2 hover:bg-dark-border/50 rounded-lg transition-colors">
            <svg class="w-5 h-5 text-dark-textMuted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Stats Grid -->
        <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          <div class="bg-dark-card rounded-lg p-3 text-center">
            <div class="text-2xl font-bold text-primary">#{{ player.rosRank }}</div>
            <div class="text-xs text-dark-textMuted">Overall Rank</div>
          </div>
          <div class="bg-dark-card rounded-lg p-3 text-center">
            <div class="text-2xl font-bold text-dark-text">{{ player.positionRank }}</div>
            <div class="text-xs text-dark-textMuted">{{ player.position }} Rank</div>
          </div>
          <div class="bg-dark-card rounded-lg p-3 text-center">
            <div class="text-2xl font-bold" :class="rankChangeClass">
              {{ rankChangeDisplay }}
            </div>
            <div class="text-xs text-dark-textMuted">vs Last Week</div>
          </div>
          <div class="bg-dark-card rounded-lg p-3 text-center">
            <div class="text-2xl font-bold text-dark-text">{{ player.ppg?.toFixed(1) || '0.0' }}</div>
            <div class="text-xs text-dark-textMuted">Season PPG</div>
          </div>
          <div class="bg-dark-card rounded-lg p-3 text-center">
            <div class="text-2xl font-bold" :class="trendClass">{{ recentPpgDisplay }}</div>
            <div class="text-xs text-dark-textMuted">Last 4 Wks PPG</div>
          </div>
          <div class="bg-dark-card rounded-lg p-3 text-center">
            <div class="text-2xl font-bold" :class="vorClass">{{ vorDisplay }}</div>
            <div class="text-xs text-dark-textMuted">VOR</div>
          </div>
        </div>

        <!-- Main Content Grid -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <!-- Performance Chart -->
          <div class="lg:col-span-2 bg-dark-card rounded-xl p-4">
            <h4 class="font-semibold text-dark-text mb-3 flex items-center gap-2">
              <span>📈</span> Weekly Performance
            </h4>
            <div v-if="weeklyData.length > 0" class="h-48 relative">
              <!-- Simple bar chart -->
              <div class="flex items-end justify-between h-full gap-1 px-2">
                <div 
                  v-for="(week, idx) in weeklyData" 
                  :key="idx"
                  class="flex-1 flex flex-col items-center gap-1"
                >
                  <div class="text-[10px] text-dark-textMuted">{{ week.actual.toFixed(1) }}</div>
                  <div 
                    class="w-full rounded-t transition-all"
                    :class="week.actual >= week.projected ? 'bg-green-500' : 'bg-red-400'"
                    :style="{ height: `${Math.max(4, (week.actual / maxScore) * 120)}px` }"
                  ></div>
                  <div class="text-[10px] text-dark-textMuted">Wk {{ week.week }}</div>
                </div>
              </div>
              <!-- Projection line reference -->
              <div 
                class="absolute left-0 right-0 border-t-2 border-dashed border-primary/50"
                :style="{ bottom: `${(player.ppg / maxScore) * 120 + 24}px` }"
              >
                <span class="absolute -top-3 right-0 text-[10px] text-primary">Avg: {{ player.ppg?.toFixed(1) }}</span>
              </div>
            </div>
            <div v-else class="h-48 flex items-center justify-center text-dark-textMuted text-sm">
              Loading weekly performance data...
            </div>
            <div class="flex items-center justify-center gap-6 mt-3 text-xs">
              <div class="flex items-center gap-2">
                <div class="w-3 h-3 rounded bg-green-500"></div>
                <span class="text-dark-textMuted">Beat Projection</span>
              </div>
              <div class="flex items-center gap-2">
                <div class="w-3 h-3 rounded bg-red-400"></div>
                <span class="text-dark-textMuted">Below Projection</span>
              </div>
            </div>
          </div>

          <!-- Upcoming Schedule -->
          <div class="bg-dark-card rounded-xl p-4">
            <h4 class="font-semibold text-dark-text mb-3 flex items-center gap-2">
              <span>📅</span> Schedule & Matchups
            </h4>
            <div class="space-y-2">
              <div 
                v-for="(matchup, idx) in upcomingMatchups" 
                :key="idx"
                class="flex items-center justify-between p-2 rounded-lg"
                :class="matchup.difficulty === 'easy' ? 'bg-green-500/10' : matchup.difficulty === 'hard' ? 'bg-red-500/10' : 'bg-dark-border/30'"
              >
                <div class="flex items-center gap-2">
                  <span class="text-xs text-dark-textMuted">Wk {{ matchup.week }}</span>
                  <span class="font-medium text-dark-text">{{ matchup.opponent }}</span>
                </div>
                <div class="text-right">
                  <div class="text-sm font-bold" :class="matchup.difficulty === 'easy' ? 'text-green-400' : matchup.difficulty === 'hard' ? 'text-red-400' : 'text-dark-text'">
                    {{ matchup.sosLabel }}
                  </div>
                  <div class="text-[10px] text-dark-textMuted">
                    {{ matchup.defenseRank }}
                  </div>
                </div>
              </div>
              <div v-if="upcomingMatchups.length === 0" class="text-center py-4 text-dark-textMuted text-sm">
                No upcoming matchups available
              </div>
            </div>
          </div>
        </div>

        <!-- Bottom Row: Transaction History & Factor Breakdown -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <!-- Transaction History -->
          <div class="bg-dark-card rounded-xl p-4">
            <h4 class="font-semibold text-dark-text mb-3 flex items-center gap-2">
              <span>📋</span> Transaction History
            </h4>
            <div v-if="isLoadingTransactions" class="flex items-center justify-center py-4">
              <LoadingSpinner size="sm" />
            </div>
            <div v-else-if="transactionHistory.length === 0" class="text-center py-4 text-dark-textMuted text-sm">
              No transaction history available
            </div>
            <div v-else class="space-y-2 max-h-40 overflow-y-auto">
              <div 
                v-for="(tx, idx) in transactionHistory" 
                :key="idx"
                class="flex items-center gap-3 p-2 rounded-lg text-sm"
                :class="getTransactionClass(tx.type)"
              >
                <span class="text-lg">{{ getTransactionIcon(tx.type) }}</span>
                <div class="flex-1">
                  <div class="font-medium text-dark-text">{{ tx.description }}</div>
                  <div class="text-xs text-dark-textMuted">
                    {{ tx.date }}
                    <span v-if="tx.faab" class="text-yellow-400 ml-1">${{ tx.faab }} FAAB</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Factor Breakdown -->
          <div class="bg-dark-card rounded-xl p-4">
            <h4 class="font-semibold text-dark-text mb-3 flex items-center gap-2">
              <span>🎛️</span> Ranking Factor Breakdown
            </h4>
            <div v-if="player.factorBreakdown && player.factorBreakdown.length > 0" class="space-y-2">
              <div 
                v-for="factor in player.factorBreakdown" 
                :key="factor.factor"
                class="flex items-center justify-between text-sm"
              >
                <span class="text-dark-textMuted">{{ factor.factor }}</span>
                <span 
                  class="font-medium"
                  :class="factor.contribution > 0 ? 'text-green-400' : factor.contribution < 0 ? 'text-red-400' : 'text-dark-text'"
                >
                  {{ factor.contribution >= 0 ? '+' : '' }}{{ factor.contribution.toFixed(2) }}
                </span>
              </div>
            </div>
            <div v-else class="text-center py-4 text-dark-textMuted text-sm">
              No factor breakdown available
            </div>
            
            <!-- Consistency & Trend Info -->
            <div class="mt-4 pt-3 border-t border-dark-border/30 grid grid-cols-2 gap-3 text-sm">
              <div>
                <span class="text-dark-textMuted">Consistency:</span>
                <span class="ml-2 font-medium" :class="consistencyClass">{{ consistencyLabel }}</span>
              </div>
              <div>
                <span class="text-dark-textMuted">Trend:</span>
                <span class="ml-2 font-medium" :class="trendClass">{{ trendLabel }}</span>
              </div>
              <div>
                <span class="text-dark-textMuted">Ceiling:</span>
                <span class="ml-2 font-medium text-dark-text">{{ player.ceiling?.toFixed(1) || 'N/A' }}</span>
              </div>
              <div>
                <span class="text-dark-textMuted">Floor:</span>
                <span class="ml-2 font-medium text-dark-text">{{ player.floor?.toFixed(1) || 'N/A' }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </td>
  </tr>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { sleeperService } from '@/services/sleeper'
import { useLeagueStore } from '@/stores/league'
import LoadingSpinner from '@/components/LoadingSpinner.vue'

const props = defineProps<{
  player: any
  colspan: number
  currentWeek: number
  leagueId?: string
}>()

defineEmits<{
  (e: 'close'): void
}>()

const leagueStore = useLeagueStore()

// Refs
const isLoadingTransactions = ref(false)
const transactionHistory = ref<any[]>([])
const weeklyData = ref<{ week: number; actual: number; projected: number }[]>([])

// Computed
const playerImageUrl = computed(() => 
  `https://sleepercdn.com/content/nfl/players/thumb/${props.player.player_id}.jpg`
)

const positionClass = computed(() => {
  const classes: Record<string, string> = {
    QB: 'bg-red-500/20 text-red-400',
    RB: 'bg-green-500/20 text-green-400',
    WR: 'bg-blue-500/20 text-blue-400',
    TE: 'bg-yellow-500/20 text-yellow-400'
  }
  return classes[props.player.position] || 'bg-gray-500/20 text-gray-400'
})

const rankChangeClass = computed(() => {
  if (!props.player.rankChange) return 'text-dark-textMuted'
  return props.player.rankChange > 0 ? 'text-green-400' : 'text-red-400'
})

const rankChangeDisplay = computed(() => {
  if (!props.player.rankChange) return '—'
  const arrow = props.player.rankChange > 0 ? '↑' : '↓'
  return `${arrow}${Math.abs(props.player.rankChange)}`
})

const recentPpgDisplay = computed(() => {
  return props.player.recentPPG?.toFixed(1) || props.player.ppg?.toFixed(1) || '0.0'
})

const trendClass = computed(() => {
  if (props.player.trendIndicator === 'hot') return 'text-orange-400'
  if (props.player.trendIndicator === 'cold') return 'text-blue-400'
  return 'text-dark-text'
})

const trendLabel = computed(() => {
  if (props.player.trendIndicator === 'hot') return '🔥 Hot'
  if (props.player.trendIndicator === 'cold') return '❄️ Cold'
  return 'Neutral'
})

const vorDisplay = computed(() => {
  const vor = props.player.vor || 0
  return `${vor >= 0 ? '+' : ''}${vor.toFixed(1)}`
})

const vorClass = computed(() => {
  const vor = props.player.vor || 0
  if (vor > 0) return 'text-green-400'
  if (vor < -2) return 'text-red-400'
  return 'text-primary'
})

const consistencyClass = computed(() => {
  switch (props.player.consistencyRating) {
    case 'elite': return 'text-green-400'
    case 'stable': return 'text-blue-400'
    case 'volatile': return 'text-yellow-400'
    case 'boom-bust': return 'text-purple-400'
    default: return 'text-dark-text'
  }
})

const consistencyLabel = computed(() => {
  switch (props.player.consistencyRating) {
    case 'elite': return '🎯 Elite'
    case 'stable': return '✓ Stable'
    case 'volatile': return '⚡ Volatile'
    case 'boom-bust': return '💥 Boom/Bust'
    default: return 'Unknown'
  }
})

const maxScore = computed(() => {
  if (weeklyData.value.length === 0) return 30
  const max = Math.max(...weeklyData.value.map(w => w.actual), props.player.ppg || 0)
  return Math.max(max * 1.1, 10)
})

// Upcoming matchups - simplified to show SOS for next games
const upcomingMatchups = computed(() => {
  const matchups = []
  
  // Calculate per-week SOS if player has rosSOS data
  // rosSOS is normalized (-0.5 to +0.5), multiply by 12 to get actual points
  const avgSosPoints = (props.player.rosSOS || 0) * 12
  
  for (let i = 0; i < 3; i++) {
    const week = props.currentWeek + i
    if (week > 17) break
    
    // Use a slight variation for each week (simulating different opponents)
    // In practice, this should pull actual schedule data
    const weekVariance = (i - 1) * (avgSosPoints * 0.3)
    const weekSos = avgSosPoints + weekVariance
    const difficulty = weekSos > 1 ? 'easy' : weekSos < -1 ? 'hard' : 'neutral'
    
    matchups.push({
      week,
      opponent: props.player.team ? `Week ${week} Opponent` : 'TBD',
      difficulty,
      sosLabel: weekSos >= 0 ? `+${weekSos.toFixed(1)}` : weekSos.toFixed(1),
      defenseRank: `vs ${props.player.position}`
    })
  }
  return matchups
})

function handleImageError(event: Event) {
  const img = event.target as HTMLImageElement
  img.src = 'https://sleepercdn.com/avatars/thumbs/default'
}

function getTransactionClass(type: string): string {
  switch (type) {
    case 'draft': return 'bg-primary/10'
    case 'waiver': return 'bg-blue-500/10'
    case 'trade': return 'bg-purple-500/10'
    case 'drop': return 'bg-red-500/10'
    case 'add': return 'bg-green-500/10'
    default: return 'bg-dark-border/30'
  }
}

function getTransactionIcon(type: string): string {
  switch (type) {
    case 'draft': return '📋'
    case 'waiver': return '📥'
    case 'trade': return '🔄'
    case 'drop': return '⬇️'
    case 'add': return '➕'
    default: return '📝'
  }
}

async function loadTransactionHistory() {
  if (!props.leagueId) return
  
  isLoadingTransactions.value = true
  const history: any[] = []
  
  try {
    for (let week = 1; week <= props.currentWeek; week++) {
      try {
        const transactions = await sleeperService.getTransactions(props.leagueId, week)
        
        transactions.forEach((tx: any) => {
          const playerId = props.player.player_id
          
          const wasAdded = tx.adds && Object.keys(tx.adds).includes(playerId)
          const wasDropped = tx.drops && Object.keys(tx.drops).includes(playerId)
          
          if (!wasAdded && !wasDropped) return
          
          const rosters = leagueStore.rosters
          const users = leagueStore.users
          
          const getTeamName = (rosterId: number) => {
            const roster = rosters.find(r => r.roster_id === rosterId)
            if (!roster) return `Team ${rosterId}`
            const user = users.find(u => u.user_id === roster.owner_id)
            return sleeperService.getTeamName(roster, user)
          }
          
          if (tx.type === 'trade') {
            if (wasAdded) {
              const toRosterId = tx.adds[playerId]
              history.push({
                type: 'trade',
                description: `Traded to ${getTeamName(toRosterId)}`,
                date: `Week ${week}`,
                week
              })
            }
          } else if (tx.type === 'waiver' || tx.type === 'free_agent') {
            if (wasAdded) {
              const toRosterId = tx.adds[playerId]
              const faab = tx.settings?.waiver_bid || 0
              history.push({
                type: 'waiver',
                description: `Claimed by ${getTeamName(toRosterId)}`,
                date: `Week ${week}`,
                week,
                faab: faab > 0 ? faab : null
              })
            }
            if (wasDropped) {
              const fromRosterId = tx.drops[playerId]
              history.push({
                type: 'drop',
                description: `Dropped by ${getTeamName(fromRosterId)}`,
                date: `Week ${week}`,
                week
              })
            }
          }
        })
      } catch {
        // Continue if individual week fails
      }
    }
    
    history.sort((a, b) => b.week - a.week)
    transactionHistory.value = history
    
  } catch (err) {
    console.error('Failed to load transaction history:', err)
  } finally {
    isLoadingTransactions.value = false
  }
}

async function loadWeeklyData() {
  if (!props.leagueId) return
  
  const data: { week: number; actual: number; projected: number }[] = []
  
  try {
    for (let week = 1; week < props.currentWeek; week++) {
      try {
        const matchups = await sleeperService.getMatchups(props.leagueId, week)
        
        let actualPoints = 0
        matchups.forEach((matchup: any) => {
          if (matchup.players_points && matchup.players_points[props.player.player_id] !== undefined) {
            actualPoints = matchup.players_points[props.player.player_id]
          }
        })
        
        const projected = props.player.ppg || 0
        
        if (actualPoints > 0) {
          data.push({
            week,
            actual: actualPoints,
            projected
          })
        }
      } catch {
        // Continue if individual week fails
      }
    }
    
    weeklyData.value = data
    
  } catch (err) {
    console.error('Failed to load weekly data:', err)
  }
}

onMounted(() => {
  loadTransactionHistory()
  loadWeeklyData()
})

watch(() => props.player.player_id, () => {
  loadTransactionHistory()
  loadWeeklyData()
})
</script>
