<template>
  <div class="space-y-6">
    <!-- Header -->
    <div>
      <h1 class="text-3xl font-bold text-dark-text mb-2">Settings</h1>
      <p class="text-base text-dark-textMuted">
        Manage your connected platforms and customize your dashboard
      </p>
    </div>

    <!-- ── Add League Banner ─────────────────────────────────────────────── -->
    <div class="add-league-banner">
      <div class="alb-icon">☝️</div>
      <div class="alb-body">
        <div class="alb-title">Want to add a new league?</div>
        <div class="alb-text">
          Use the <strong>league dropdown in the top-right corner</strong> of the header — look for your league name next to the sport icon. Tap it and select <strong>"Add League"</strong> to connect a new ESPN, Yahoo, or Sleeper league.
        </div>
      </div>
      <div class="alb-arrow">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M5 12h14M12 5l7 7-7 7"/>
        </svg>
        <div class="alb-arrow-label">Top right ↗</div>
      </div>
    </div>

    <!-- Connected Platforms Section -->
    <div class="card">
      <div class="card-header">
        <div class="flex items-center gap-2">
          <span class="text-2xl">🔗</span>
          <h2 class="card-title">Connected Platforms</h2>
        </div>
      </div>
      <div class="card-body">
        <div class="space-y-4">
          <!-- Yahoo Connection -->
          <div class="flex items-center justify-between p-4 bg-dark-border/20 rounded-lg">
            <div class="flex items-center gap-4">
              <div class="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center">
                <span class="text-2xl">Y!</span>
              </div>
              <div>
                <div class="font-semibold text-dark-text">Yahoo Fantasy</div>
                <p class="text-sm text-dark-textMuted">
                  {{ platformsStore.isYahooConnected ? 'Connected' : 'Not connected' }}
                </p>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <button 
                v-if="platformsStore.isYahooConnected"
                @click="syncYahooLeagues"
                :disabled="syncingYahoo"
                class="btn-primary text-sm"
              >
                <span v-if="syncingYahoo">Syncing...</span>
                <span v-else>Sync Leagues</span>
              </button>
              <button 
                v-if="!platformsStore.isYahooConnected"
                @click="connectYahoo"
                class="btn-primary text-sm"
              >
                Connect Yahoo
              </button>
              <button 
                v-if="platformsStore.isYahooConnected"
                @click="disconnectYahoo"
                class="btn-secondary text-sm"
              >
                Disconnect
              </button>
            </div>
          </div>

          <!-- Yahoo Leagues (if connected) -->
          <div v-if="platformsStore.isYahooConnected && yahooLeagues.length > 0" class="ml-16 space-y-2">
            <div class="text-sm font-semibold text-dark-textMuted uppercase mb-2">Your Yahoo Leagues</div>
            <div v-for="league in yahooLeagues" :key="league.id" 
                 class="flex items-center justify-between p-3 bg-dark-card rounded-lg border border-dark-border">
              <div>
                <div class="font-medium text-dark-text">{{ league.league_name }}</div>
                <div class="text-xs text-dark-textMuted">
                  {{ league.sport }} • {{ league.season }} • {{ league.league_size }} teams
                </div>
              </div>
              <span class="text-xs px-2 py-1 rounded-full" 
                    :class="league.is_active ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'">
                {{ league.is_active ? 'Active' : 'Finished' }}
              </span>
            </div>
          </div>

          <!-- Sleeper Connection -->
          <div class="flex items-center justify-between p-4 bg-dark-border/20 rounded-lg">
            <div class="flex items-center gap-4">
              <div class="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
                <span class="text-xl">💤</span>
              </div>
              <div>
                <div class="font-semibold text-dark-text">Sleeper</div>
                <p class="text-sm text-dark-textMuted">
                  {{ platformsStore.isSleeperConnected ? 'Connected' : 'Connect via league selector' }}
                </p>
              </div>
            </div>
            <span v-if="platformsStore.isSleeperConnected" class="text-green-400 text-sm">✓ Connected</span>
          </div>

          <!-- ESPN Coming Soon -->
          <div class="flex items-center justify-between p-4 bg-dark-border/20 rounded-lg opacity-50">
            <div class="flex items-center gap-4">
              <div class="w-12 h-12 bg-red-600 rounded-lg flex items-center justify-center">
                <span class="text-xl font-bold">E</span>
              </div>
              <div>
                <div class="font-semibold text-dark-text">ESPN Fantasy</div>
                <p class="text-sm text-dark-textMuted">Coming soon</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="flex items-center justify-center py-20">
      <LoadingSpinner size="xl" />
    </div>

    <!-- Your Leagues Section -->
    <div class="card">
      <div class="card-header">
        <div class="flex items-center gap-2">
          <span class="text-2xl">🏆</span>
          <h2 class="card-title">Your Leagues</h2>
        </div>
      </div>
      <div class="card-body">
        <p class="text-sm text-dark-textMuted mb-4">
          All features are <span class="text-blue-400 font-semibold">free during beta</span>. 
          Every connected league has full access to Ultimate Tools.
        </p>

        <!-- No leagues -->
        <div v-if="!leagueStore.savedLeagues || leagueStore.savedLeagues.length === 0"
             class="text-center py-8 text-dark-textMuted">
          <div class="text-4xl mb-3">📋</div>
          <p class="text-sm">No leagues connected yet. Add a league to get started.</p>
        </div>

        <!-- League list -->
        <div v-else class="space-y-2">
          <div
            v-for="league in leagueStore.savedLeagues"
            :key="league.league_id"
            class="flex items-center justify-between p-4 bg-dark-border/20 rounded-lg border border-dark-border/30"
          >
            <div class="flex items-center gap-3">
              <!-- Platform icon -->
              <div class="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                   :class="league.platform === 'yahoo' ? 'bg-purple-600/30' : league.platform === 'sleeper' ? 'bg-blue-600/30' : 'bg-red-600/30'"
              >
                <span class="text-base">{{ league.platform === 'yahoo' ? 'Y!' : league.platform === 'sleeper' ? '💤' : 'E' }}</span>
              </div>
              <div>
                <div class="font-medium text-dark-text text-sm">{{ league.league_name || league.league_id }}</div>
                <div class="text-xs text-dark-textMuted capitalize">
                  {{ league.sport }} · {{ league.season }} · {{ league.platform }}
                </div>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <span class="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-blue-500/15 text-blue-400 font-semibold">
                <span class="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                Beta Access
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Cache Management Section -->
    <div class="card">
      <div class="card-header">
        <div class="flex items-center gap-2">
          <span class="text-2xl">💾</span>
          <h2 class="card-title">Cache Management</h2>
        </div>
      </div>
      <div class="card-body">
        <div class="space-y-4">
          <div class="flex items-center justify-between p-4 bg-dark-border/20 rounded-lg">
            <div class="flex-1">
              <div class="font-semibold text-dark-text">Local Data Cache</div>
              <p class="text-sm text-dark-textMuted mt-1">
                Data is cached locally to speed up page loads. Historical data is stored for up to 24 hours.
              </p>
              <div v-if="cacheStats" class="mt-2 text-xs text-dark-textMuted">
                <span class="mr-4">Memory: {{ cacheStats.memoryEntries }} entries</span>
                <span class="mr-4">Storage: {{ cacheStats.localStorageEntries }} entries</span>
                <span>Size: {{ cacheStats.totalSize }}</span>
              </div>
            </div>
            <button 
              @click="clearCache"
              :disabled="clearingCache"
              class="btn-secondary text-sm"
            >
              {{ clearingCache ? 'Clearing...' : 'Clear Cache' }}
            </button>
          </div>
          <p class="text-xs text-dark-textMuted px-4">
            Clear the cache if you're seeing outdated data or experiencing issues. This will cause pages to reload data from scratch on next visit.
          </p>
        </div>
      </div>
    </div>

    <!-- Success Message -->
    <div v-if="showSuccess" 
         class="fixed bottom-6 right-6 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-3 z-50">
      <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
      </svg>
      <span class="font-semibold">{{ successMessage }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useLeagueStore } from '@/stores/league'
import { usePlatformsStore } from '@/stores/platforms'
import { useAuthStore } from '@/stores/auth'
import { supabase } from '@/lib/supabase'
import { cache } from '@/services/cache'
import LoadingSpinner from '@/components/LoadingSpinner.vue'

const leagueStore = useLeagueStore()
const platformsStore = usePlatformsStore()
const authStore = useAuthStore()

const isLoading = ref(false)
const showSuccess = ref(false)
const successMessage = ref('Settings saved!')
const syncingYahoo = ref(false)
const yahooLeagues = ref<any[]>([])
const clearingCache = ref(false)
const cacheStats = ref<{ memoryEntries: number; localStorageEntries: number; totalSize: string } | null>(null)

// Initialize platforms store
onMounted(async () => {
  loadCacheStats()
  
  if (authStore.isAuthenticated) {
    await platformsStore.fetchConnectedPlatforms()
    await loadYahooLeagues()
  }
})

// Load cache statistics
function loadCacheStats() {
  cacheStats.value = cache.getStats()
}

// Clear all cached data
async function clearCache() {
  clearingCache.value = true
  try {
    cache.clearAll()
    cacheStats.value = cache.getStats()
    successMessage.value = 'Cache cleared successfully!'
    showSuccess.value = true
    setTimeout(() => showSuccess.value = false, 3000)
  } finally {
    clearingCache.value = false
  }
}

// Connect Yahoo
function connectYahoo() {
  platformsStore.connectYahoo()
}

// Disconnect Yahoo
async function disconnectYahoo() {
  if (!confirm('Disconnect Yahoo? Your Yahoo leagues will be removed.')) return
  
  await platformsStore.disconnectPlatform('yahoo')
  yahooLeagues.value = []
  showSuccessMessage('Yahoo disconnected')
}

// Sync Yahoo leagues
async function syncYahooLeagues() {
  syncingYahoo.value = true
  
  try {
    // Sync football leagues
    const result = await platformsStore.syncYahooLeagues('football')
    
    if (result.success) {
      await loadYahooLeagues()
      showSuccessMessage(`Synced ${result.leagues.length} Yahoo leagues!`)
    } else {
      console.error('Sync failed:', result.error)
      showSuccessMessage('Failed to sync: ' + result.error)
    }
  } catch (err) {
    console.error('Sync error:', err)
  } finally {
    syncingYahoo.value = false
  }
}

// Load Yahoo leagues from database
async function loadYahooLeagues() {
  if (!supabase || !authStore.user) return
  
  const { data, error } = await supabase
    .from('leagues')
    .select('*')
    .eq('user_id', authStore.user.id)
    .eq('platform', 'yahoo')
    .order('season', { ascending: false })
  
  if (!error && data) {
    yahooLeagues.value = data
  }
}

// Show success message
function showSuccessMessage(message: string) {
  successMessage.value = message
  showSuccess.value = true
  setTimeout(() => {
    showSuccess.value = false
  }, 3000)
}

// Watch for auth changes
watch(() => authStore.isAuthenticated, async (isAuth) => {
  if (isAuth) {
    await platformsStore.fetchConnectedPlatforms()
    await loadYahooLeagues()
  }
})
</script>

<style scoped>
/* ── Add League Banner ── */
.add-league-banner {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 18px 22px;
  background: linear-gradient(135deg, rgba(234,179,8,0.12) 0%, rgba(234,179,8,0.05) 100%);
  border: 1.5px solid rgba(234,179,8,0.45);
  border-left: 4px solid #eab308;
  border-radius: 14px;
  box-shadow: 0 0 24px rgba(234,179,8,0.08);
}
.alb-icon {
  font-size: 2rem;
  flex-shrink: 0;
  line-height: 1;
}
.alb-body {
  flex: 1;
  min-width: 0;
}
.alb-title {
  font-size: 1rem;
  font-weight: 800;
  color: #eab308;
  margin-bottom: 4px;
  letter-spacing: 0.01em;
}
.alb-text {
  font-size: 0.875rem;
  color: #9ca3af;
  line-height: 1.55;
}
.alb-text strong {
  color: #e5e7eb;
  font-weight: 700;
}
.alb-arrow {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  color: #eab308;
  flex-shrink: 0;
  opacity: 0.85;
}
.alb-arrow-label {
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #eab308;
  white-space: nowrap;
}
</style>
