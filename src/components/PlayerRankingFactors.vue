<template>
  <div class="card">
    <div class="card-body">
      <!-- Header -->
      <div class="flex items-center justify-between mb-6">
        <div>
          <h3 class="text-xl font-bold text-dark-text flex items-center gap-2">
            <span class="text-2xl">🎚️</span> Customize Rankings
          </h3>
          <p class="text-sm text-dark-textMuted mt-1">Adjust factor weights to create your perfect ranking formula</p>
        </div>
        <button 
          @click="isExpanded = !isExpanded"
          class="px-4 py-2 rounded-lg bg-dark-border/50 hover:bg-dark-border text-dark-textSecondary transition-colors flex items-center gap-2"
        >
          <span>{{ isExpanded ? 'Collapse' : 'Expand' }}</span>
          <svg :class="{ 'rotate-180': isExpanded }" class="w-4 h-4 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      <!-- Presets (always visible) -->
      <div class="flex flex-wrap gap-2 mb-4">
        <button
          v-for="preset in presets"
          :key="preset.id"
          @click="applyPreset(preset)"
          :class="[
            'px-4 py-2 rounded-xl font-medium transition-all flex items-center gap-2',
            activePreset === preset.id 
              ? 'bg-yellow-400 text-gray-900' 
              : 'bg-dark-border/50 text-dark-textSecondary hover:bg-dark-border'
          ]"
        >
          <span class="text-lg">{{ preset.icon }}</span>
          <span>{{ preset.name }}</span>
        </button>
      </div>

      <!-- Current Formula Display -->
      <div class="bg-dark-bg/50 rounded-xl p-3 mb-4">
        <div class="text-xs text-dark-textMuted uppercase tracking-wider mb-1">Current Formula</div>
        <div class="text-sm text-dark-text">{{ currentFormulaDescription }}</div>
      </div>

      <!-- Expanded Factor Controls -->
      <div v-if="isExpanded" class="space-y-6 pt-4 border-t border-dark-border">
        <!-- Factor Category Tabs -->
        <div class="flex gap-2 overflow-x-auto pb-2">
          <button
            v-for="category in factorCategories"
            :key="category.id"
            @click="activeCategory = category.id"
            :class="[
              'px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap flex items-center gap-2',
              activeCategory === category.id
                ? 'bg-primary/20 text-primary border border-primary/30'
                : 'bg-dark-border/30 text-dark-textSecondary hover:bg-dark-border/50'
            ]"
          >
            <span>{{ category.icon }}</span>
            <span>{{ category.name }}</span>
          </button>
        </div>

        <!-- Factors for Active Category -->
        <div class="space-y-4">
          <div
            v-for="factor in factorsForCategory"
            :key="factor.id"
            class="bg-dark-bg/30 rounded-xl p-4 border border-dark-border/50"
          >
            <div class="flex items-center justify-between mb-2">
              <div class="flex items-center gap-3">
                <span class="text-xl">{{ factor.icon }}</span>
                <div>
                  <span class="font-semibold text-dark-text">{{ factor.name }}</span>
                  <span v-if="!factor.available" class="ml-2 text-xs bg-dark-border px-2 py-0.5 rounded text-dark-textMuted">Coming Soon</span>
                </div>
              </div>
              <label class="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  v-model="factor.enabled" 
                  :disabled="!factor.available"
                  class="sr-only peer" 
                  @change="onFactorChange"
                >
                <div class="w-11 h-6 bg-dark-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary peer-disabled:opacity-50"></div>
              </label>
            </div>
            <p class="text-xs text-dark-textMuted mb-3">{{ factor.description }}</p>
            <div v-if="factor.enabled && factor.available" class="flex items-center gap-3">
              <input
                type="range"
                v-model.number="factor.weight"
                min="0"
                max="100"
                step="5"
                @input="onFactorChange"
                class="flex-1 h-2 bg-dark-border rounded-lg appearance-none cursor-pointer accent-primary"
                :style="{ '--tw-ring-color': factor.color }"
              >
              <div 
                class="text-sm font-bold w-14 text-right px-2 py-1 rounded"
                :style="{ backgroundColor: factor.color + '20', color: factor.color }"
              >
                {{ factor.weight }}%
              </div>
            </div>
            <div v-else-if="!factor.available" class="text-xs text-dark-textMuted italic">
              Advanced data required - available in future update
            </div>
          </div>
        </div>

        <!-- Total Weight Warning -->
        <div v-if="totalWeight !== 100" class="bg-orange-500/10 border border-orange-500/30 rounded-xl p-3 flex items-center gap-3">
          <span class="text-orange-400 text-xl">⚠️</span>
          <div>
            <div class="text-orange-400 font-medium">Weights don't add up to 100%</div>
            <div class="text-sm text-orange-400/80">Current total: {{ totalWeight }}%. Rankings will be normalized.</div>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="flex items-center justify-between pt-4 border-t border-dark-border">
          <button 
            @click="resetToDefault" 
            class="text-sm text-dark-textMuted hover:text-dark-text transition-colors flex items-center gap-2"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Reset to Default
          </button>
          <div class="flex gap-2">
            <button 
              @click="saveCustomPreset" 
              class="px-4 py-2 rounded-lg bg-dark-border/50 hover:bg-dark-border text-dark-textSecondary transition-colors flex items-center gap-2"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
              </svg>
              Save Custom
            </button>
            <button 
              @click="applyChanges" 
              class="px-4 py-2 rounded-lg bg-primary text-gray-900 font-semibold hover:bg-primary/90 transition-colors flex items-center gap-2"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
              Apply Rankings
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'

const props = defineProps<{
  sport: 'football' | 'baseball' | 'basketball' | 'hockey'
  leagueType?: 'points' | 'category'
}>()

const emit = defineEmits<{
  (e: 'update:factors', factors: RankingFactor[]): void
  (e: 'recalculate'): void
}>()

interface RankingFactor {
  id: string
  name: string
  description: string
  category: string
  enabled: boolean
  weight: number
  icon: string
  color: string
  available: boolean
}

interface Preset {
  id: string
  name: string
  icon: string
  factors: Record<string, number>
}

interface FactorCategory {
  id: string
  name: string
  icon: string
}

const isExpanded = ref(false)
const activePreset = ref('balanced')
const activeCategory = ref('volume')

// Factor categories
const factorCategories: FactorCategory[] = [
  { id: 'volume', name: 'Volume & Opportunity', icon: '📊' },
  { id: 'production', name: 'Production', icon: '⚡' },
  { id: 'efficiency', name: 'Quality & Efficiency', icon: '🎯' },
  { id: 'trending', name: 'Trending & Form', icon: '🔥' },
  { id: 'advanced', name: 'Advanced Metrics', icon: '🧪' }
]

// Sport-specific factors
const getFactorsForSport = (sport: string): RankingFactor[] => {
  const baseFactors: RankingFactor[] = [
    // Volume factors (all sports)
    { id: 'seasonPoints', name: 'Season Points', description: 'Total fantasy points accumulated this season', category: 'volume', enabled: true, weight: 25, icon: '📈', color: '#22c55e', available: true },
    { id: 'gamesPlayed', name: 'Games Played', description: 'Number of games played - more games = more opportunity', category: 'volume', enabled: true, weight: 5, icon: '🎮', color: '#3b82f6', available: true },
    
    // Production factors
    { id: 'ppg', name: 'Points Per Game', description: 'Average fantasy points per game played', category: 'production', enabled: true, weight: 30, icon: '📊', color: '#f5c451', available: true },
    { id: 'vor', name: 'Value Over Replacement', description: 'Points above a replacement-level player at same position', category: 'production', enabled: true, weight: 15, icon: '💎', color: '#a855f7', available: true },
    
    // Trending factors
    { id: 'recentForm', name: 'Recent Form (7 Days)', description: 'Performance over last 7 days vs season average', category: 'trending', enabled: true, weight: 15, icon: '🔥', color: '#ef4444', available: true },
    { id: 'last14', name: 'Last 14 Days', description: 'Performance trend over last 2 weeks', category: 'trending', enabled: false, weight: 10, icon: '📅', color: '#f97316', available: true },
    { id: 'ownershipTrend', name: 'Ownership Trend', description: 'Rising or falling ownership percentage', category: 'trending', enabled: false, weight: 5, icon: '📈', color: '#06b6d4', available: true },
    
    // Efficiency factors  
    { id: 'consistency', name: 'Consistency', description: 'Lower variance in scoring = more reliable', category: 'efficiency', enabled: true, weight: 10, icon: '🎯', color: '#ec4899', available: true },
  ]

  // Add sport-specific factors
  if (sport === 'football') {
    return [
      ...baseFactors,
      // Football-specific volume
      { id: 'targetShare', name: 'Target Share', description: 'Percentage of team targets (WR/TE)', category: 'volume', enabled: false, weight: 0, icon: '🎯', color: '#8b5cf6', available: false },
      { id: 'opportunityShare', name: 'Opportunity Share', description: 'Percentage of team RB touches (RB)', category: 'volume', enabled: false, weight: 0, icon: '🏃', color: '#10b981', available: false },
      { id: 'snapPct', name: 'Snap Percentage', description: 'Percentage of offensive snaps played', category: 'volume', enabled: false, weight: 0, icon: '⏱️', color: '#6366f1', available: false },
      // Football-specific efficiency
      { id: 'redZoneShare', name: 'Red Zone Involvement', description: 'Targets/touches inside the 20-yard line', category: 'efficiency', enabled: false, weight: 0, icon: '🔴', color: '#dc2626', available: false },
      // Football-specific advanced
      { id: 'adot', name: 'Avg Depth of Target', description: 'Average depth of targets for receivers', category: 'advanced', enabled: false, weight: 0, icon: '📏', color: '#0ea5e9', available: false },
      { id: 'airYards', name: 'Air Yards', description: 'Total air yards on targets', category: 'advanced', enabled: false, weight: 0, icon: '✈️', color: '#14b8a6', available: false },
      { id: 'wopr', name: 'WOPR', description: 'Weighted Opportunity Rating (target + air yard share)', category: 'advanced', enabled: false, weight: 0, icon: '⚡', color: '#f59e0b', available: false },
      { id: 'yac', name: 'Yards After Catch', description: 'Yards gained after the catch', category: 'advanced', enabled: false, weight: 0, icon: '🏈', color: '#84cc16', available: false },
    ]
  }

  if (sport === 'baseball') {
    return [
      ...baseFactors,
      // Baseball-specific volume
      { id: 'plateAppearances', name: 'Plate Appearances', description: 'Total plate appearances (more = more counting stats)', category: 'volume', enabled: false, weight: 0, icon: '🏏', color: '#8b5cf6', available: false },
      { id: 'atBats', name: 'At Bats', description: 'Total at bats', category: 'volume', enabled: false, weight: 0, icon: '⚾', color: '#6366f1', available: false },
      // Baseball-specific efficiency
      { id: 'xwoba', name: 'xwOBA', description: 'Expected weighted on-base average based on contact quality', category: 'advanced', enabled: false, weight: 0, icon: '🎯', color: '#22c55e', available: false },
      { id: 'barrelRate', name: 'Barrel Rate', description: 'Percentage of batted balls that are barrels (98+ mph, optimal angle)', category: 'advanced', enabled: false, weight: 0, icon: '💥', color: '#ef4444', available: false },
      { id: 'hardHitRate', name: 'Hard Hit Rate', description: 'Percentage of balls hit 95+ mph', category: 'advanced', enabled: false, weight: 0, icon: '🔨', color: '#f97316', available: false },
      { id: 'exitVelo', name: 'Exit Velocity', description: 'Average exit velocity on batted balls', category: 'advanced', enabled: false, weight: 0, icon: '🚀', color: '#dc2626', available: false },
      { id: 'sprintSpeed', name: 'Sprint Speed', description: 'Speed in feet per second (stolen base indicator)', category: 'advanced', enabled: false, weight: 0, icon: '⚡', color: '#0ea5e9', available: false },
      { id: 'kRate', name: 'K%', description: 'Strikeout rate (lower is better for hitters)', category: 'efficiency', enabled: false, weight: 0, icon: '🚫', color: '#64748b', available: false },
      { id: 'bbRate', name: 'BB%', description: 'Walk rate (plate discipline)', category: 'efficiency', enabled: false, weight: 0, icon: '🚶', color: '#10b981', available: false },
    ]
  }

  if (sport === 'basketball') {
    return [
      ...baseFactors,
      // Basketball-specific volume
      { id: 'minutes', name: 'Minutes Per Game', description: 'Average minutes played per game', category: 'volume', enabled: false, weight: 0, icon: '⏰', color: '#8b5cf6', available: false },
      { id: 'usageRate', name: 'Usage Rate', description: 'Percentage of team possessions used while on court', category: 'volume', enabled: false, weight: 0, icon: '🏀', color: '#f97316', available: false },
      // Basketball-specific efficiency
      { id: 'per', name: 'PER', description: 'Player Efficiency Rating (league avg: 15)', category: 'advanced', enabled: false, weight: 0, icon: '📊', color: '#22c55e', available: false },
      { id: 'trueShooting', name: 'True Shooting %', description: 'Shooting efficiency including FTs and 3s', category: 'efficiency', enabled: false, weight: 0, icon: '🎯', color: '#3b82f6', available: false },
      { id: 'assistRate', name: 'Assist Rate', description: 'Percentage of teammate FGs assisted', category: 'advanced', enabled: false, weight: 0, icon: '🤝', color: '#a855f7', available: false },
      { id: 'reboundRate', name: 'Rebound Rate', description: 'Percentage of available rebounds grabbed', category: 'advanced', enabled: false, weight: 0, icon: '🔄', color: '#06b6d4', available: false },
      { id: 'turnoverRate', name: 'Turnover Rate', description: 'Turnovers per 100 possessions (lower is better)', category: 'efficiency', enabled: false, weight: 0, icon: '❌', color: '#ef4444', available: false },
    ]
  }

  if (sport === 'hockey') {
    return [
      ...baseFactors,
      // Hockey-specific volume
      { id: 'toi', name: 'Time on Ice', description: 'Average ice time per game', category: 'volume', enabled: false, weight: 0, icon: '⏱️', color: '#8b5cf6', available: false },
      { id: 'ppToi', name: 'Power Play TOI', description: 'Time on ice during power plays', category: 'volume', enabled: false, weight: 0, icon: '⚡', color: '#f97316', available: false },
      // Hockey-specific advanced
      { id: 'corsi', name: 'Corsi For %', description: 'Shot attempt percentage (possession indicator)', category: 'advanced', enabled: false, weight: 0, icon: '🏒', color: '#22c55e', available: false },
      { id: 'fenwick', name: 'Fenwick For %', description: 'Corsi without blocked shots', category: 'advanced', enabled: false, weight: 0, icon: '📈', color: '#3b82f6', available: false },
      { id: 'xgf', name: 'Expected Goals For %', description: 'Expected goal share based on shot quality', category: 'advanced', enabled: false, weight: 0, icon: '🎯', color: '#a855f7', available: false },
      { id: 'pdo', name: 'PDO', description: 'On-ice shooting + save % (luck indicator, avg: 1000)', category: 'advanced', enabled: false, weight: 0, icon: '🍀', color: '#10b981', available: false },
      { id: 'hdChances', name: 'High-Danger Chances', description: 'Scoring chances from prime areas', category: 'efficiency', enabled: false, weight: 0, icon: '🔥', color: '#ef4444', available: false },
    ]
  }

  return baseFactors
}

// Initialize factors based on sport
const factors = ref<RankingFactor[]>(getFactorsForSport(props.sport))

// Presets
const presets = computed<Preset[]>(() => {
  const basePresets: Preset[] = [
    { 
      id: 'balanced', 
      name: 'Balanced', 
      icon: '⚖️', 
      factors: { seasonPoints: 25, ppg: 30, vor: 15, recentForm: 15, consistency: 10, gamesPlayed: 5 } 
    },
    { 
      id: 'seasonTotal', 
      name: 'Season Total', 
      icon: '📊', 
      factors: { seasonPoints: 50, ppg: 25, vor: 10, recentForm: 5, consistency: 5, gamesPlayed: 5 } 
    },
    { 
      id: 'hotHand', 
      name: 'Hot Hand', 
      icon: '🔥', 
      factors: { seasonPoints: 15, ppg: 20, vor: 10, recentForm: 40, consistency: 5, gamesPlayed: 5, last14: 5 } 
    },
    { 
      id: 'rosValue', 
      name: 'ROS Value', 
      icon: '💎', 
      factors: { seasonPoints: 10, ppg: 35, vor: 30, recentForm: 10, consistency: 10, gamesPlayed: 5 } 
    },
    { 
      id: 'consistent', 
      name: 'Floor Play', 
      icon: '🛡️', 
      factors: { seasonPoints: 20, ppg: 25, vor: 15, recentForm: 10, consistency: 25, gamesPlayed: 5 } 
    },
  ]

  // Add sport-specific presets
  if (props.sport === 'football') {
    basePresets.push({
      id: 'volumePlay',
      name: 'Volume Play',
      icon: '📈',
      factors: { seasonPoints: 20, ppg: 20, vor: 10, recentForm: 10, gamesPlayed: 5, targetShare: 20, snapPct: 15 }
    })
  }

  return basePresets
})

// Computed
const factorsForCategory = computed(() => {
  return factors.value.filter(f => f.category === activeCategory.value)
})

const totalWeight = computed(() => {
  return factors.value.filter(f => f.enabled).reduce((sum, f) => sum + f.weight, 0)
})

const currentFormulaDescription = computed(() => {
  const enabled = factors.value.filter(f => f.enabled && f.weight > 0)
  if (enabled.length === 0) return 'No factors enabled'
  
  const total = enabled.reduce((sum, f) => sum + f.weight, 0)
  return enabled
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 4)
    .map(f => `${f.name} (${Math.round(f.weight / total * 100)}%)`)
    .join(' + ') + (enabled.length > 4 ? ` + ${enabled.length - 4} more` : '')
})

// Methods
function applyPreset(preset: Preset) {
  activePreset.value = preset.id
  
  // Reset all factors
  factors.value.forEach(f => {
    f.enabled = false
    f.weight = 0
  })
  
  // Apply preset weights
  Object.entries(preset.factors).forEach(([factorId, weight]) => {
    const factor = factors.value.find(f => f.id === factorId)
    if (factor && factor.available) {
      factor.enabled = true
      factor.weight = weight
    }
  })
  
  onFactorChange()
}

function onFactorChange() {
  activePreset.value = 'custom'
  emit('update:factors', factors.value)
}

function applyChanges() {
  saveToLocalStorage()
  emit('recalculate')
}

function resetToDefault() {
  factors.value = getFactorsForSport(props.sport)
  applyPreset(presets.value[0])
}

function saveCustomPreset() {
  // Could open a modal to name and save the preset
  const customPresets = JSON.parse(localStorage.getItem('customRankingPresets') || '[]')
  const newPreset = {
    id: `custom_${Date.now()}`,
    name: `Custom ${customPresets.length + 1}`,
    icon: '⭐',
    factors: factors.value.filter(f => f.enabled).reduce((acc, f) => {
      acc[f.id] = f.weight
      return acc
    }, {} as Record<string, number>)
  }
  customPresets.push(newPreset)
  localStorage.setItem('customRankingPresets', JSON.stringify(customPresets))
  alert('Custom preset saved!')
}

function saveToLocalStorage() {
  const key = `playerRankingFactors_${props.sport}`
  localStorage.setItem(key, JSON.stringify(factors.value))
}

function loadFromLocalStorage() {
  const key = `playerRankingFactors_${props.sport}`
  const saved = localStorage.getItem(key)
  if (saved) {
    try {
      const parsed = JSON.parse(saved)
      // Merge saved settings with current factors (in case new factors were added)
      factors.value.forEach(f => {
        const savedFactor = parsed.find((sf: RankingFactor) => sf.id === f.id)
        if (savedFactor) {
          f.enabled = savedFactor.enabled
          f.weight = savedFactor.weight
        }
      })
      activePreset.value = 'custom'
    } catch (e) {
      console.error('Error loading saved ranking factors:', e)
    }
  }
}

// Watch for sport changes
watch(() => props.sport, (newSport) => {
  factors.value = getFactorsForSport(newSport)
  loadFromLocalStorage()
}, { immediate: true })

// Initialize
onMounted(() => {
  loadFromLocalStorage()
  emit('update:factors', factors.value)
})

// Expose factors for parent component
defineExpose({
  factors,
  getEnabledFactors: () => factors.value.filter(f => f.enabled && f.available),
  getNormalizedWeights: () => {
    const enabled = factors.value.filter(f => f.enabled && f.available)
    const total = enabled.reduce((sum, f) => sum + f.weight, 0)
    return enabled.reduce((acc, f) => {
      acc[f.id] = f.weight / total
      return acc
    }, {} as Record<string, number>)
  }
})
</script>

<style scoped>
input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--color-primary, #f5c451);
  cursor: pointer;
  border: 2px solid white;
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
}

input[type="range"]::-moz-range-thumb {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--color-primary, #f5c451);
  cursor: pointer;
  border: 2px solid white;
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
}
</style>
