<template>
  <!-- Only show for admins -->
  <div v-if="isAdmin" class="fixed bottom-4 right-4 z-50">
    <!-- Collapsed: Just a small button -->
    <button
      v-if="!expanded"
      @click="expanded = true"
      class="bg-yellow-500 text-black p-3 rounded-full shadow-lg hover:bg-yellow-400 transition-all hover:scale-110"
      title="Dev Mode - Test Subscription Tiers"
    >
      🧪
    </button>

    <!-- Expanded panel -->
    <Transition name="slide-up">
      <div
        v-if="expanded"
        class="bg-dark-elevated border border-yellow-500/50 rounded-xl shadow-2xl w-72 overflow-hidden"
      >
        <!-- Header -->
        <div class="bg-yellow-500/10 px-4 py-3 flex items-center justify-between border-b border-yellow-500/30">
          <div class="flex items-center gap-2">
            <span class="text-xl">🧪</span>
            <span class="font-bold text-yellow-500">Dev Mode</span>
          </div>
          <button
            @click="expanded = false"
            class="text-dark-textMuted hover:text-white transition-colors p-1"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Content -->
        <div class="p-4">
          <p class="text-xs text-dark-textMuted mb-4">
            Simulate different subscription tiers to see what users experience.
          </p>

          <!-- Tier Selection -->
          <div class="space-y-2 mb-4">
            <label
              v-for="tier in tiers"
              :key="tier.value"
              class="flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors"
              :class="selectedTier === tier.value ? 'bg-yellow-500/20' : 'hover:bg-dark-border/30'"
            >
              <input
                type="radio"
                v-model="selectedTier"
                :value="tier.value"
                class="accent-yellow-500 w-4 h-4"
              />
              <div class="flex-1">
                <div class="flex items-center gap-2">
                  <span>{{ tier.icon }}</span>
                  <span class="font-medium text-dark-text">{{ tier.label }}</span>
                </div>
                <p class="text-xs text-dark-textMuted mt-0.5">{{ tier.description }}</p>
              </div>
            </label>
          </div>

          <!-- Current Status -->
          <div class="bg-dark-border/30 rounded-lg p-3 mb-4">
            <div class="text-xs text-dark-textMuted uppercase tracking-wider mb-2">Current View</div>
            <div class="flex items-center gap-2">
              <span
                class="px-2 py-1 rounded text-xs font-bold"
                :class="tierBadgeClass"
              >
                {{ currentTierLabel }}
              </span>
              <span v-if="isDevMode" class="text-xs text-yellow-500">(Simulated)</span>
            </div>
          </div>

          <!-- Feature Access Preview -->
          <div class="bg-dark-border/30 rounded-lg p-3 mb-4">
            <div class="text-xs text-dark-textMuted uppercase tracking-wider mb-2">Access Preview</div>
            <div class="space-y-1 text-xs">
              <div class="flex items-center justify-between">
                <span class="text-dark-textMuted">Homepage</span>
                <span class="text-green-400">✓</span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-dark-textMuted">Power Rankings</span>
                <span :class="hasLeagueAccess ? 'text-green-400' : 'text-red-400'">
                  {{ hasLeagueAccess ? '✓' : '✗' }}
                </span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-dark-textMuted">History</span>
                <span :class="hasLeagueAccess ? 'text-green-400' : 'text-red-400'">
                  {{ hasLeagueAccess ? '✓' : '✗' }}
                </span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-dark-textMuted">Downloads</span>
                <span :class="hasLeagueAccess ? 'text-green-400' : 'text-red-400'">
                  {{ hasLeagueAccess ? '✓' : '✗' }}
                </span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-dark-textMuted">My Team Tools</span>
                <span :class="hasPremiumAccess ? 'text-green-400' : 'text-red-400'">
                  {{ hasPremiumAccess ? '✓' : '✗' }}
                </span>
              </div>
            </div>
          </div>

          <!-- Reset Button -->
          <button
            @click="resetToReal"
            class="w-full text-sm bg-dark-border hover:bg-dark-border/70 text-dark-textMuted py-2 rounded-lg transition-colors"
            :disabled="!isDevMode"
            :class="{ 'opacity-50 cursor-not-allowed': !isDevMode }"
          >
            Reset to Real Access
          </button>
        </div>

        <!-- Footer -->
        <div class="bg-dark-border/20 px-4 py-2 text-xs text-dark-textMuted border-t border-dark-border">
          Only visible to admins
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useFeatureAccess } from '@/composables/useFeatureAccess'

const {
  isAdmin,
  hasLeagueAccess,
  hasPremiumAccess,
  currentTierLabel,
  devTierOverride,
  isDevMode,
  setDevTier,
  clearDevMode
} = useFeatureAccess()

const expanded = ref(false)
const selectedTier = ref(devTierOverride.value || 'real')

const tiers = [
  {
    value: 'free',
    label: 'Free User',
    icon: '👤',
    description: 'Basic access, blurred premium content'
  },
  {
    value: 'league',
    label: 'League Pass',
    icon: '🏆',
    description: 'Full league access, no premium tools'
  },
  {
    value: 'premium',
    label: 'Premium',
    icon: '⭐',
    description: 'League Pass + My Team Tools'
  },
  {
    value: 'real',
    label: 'Real Access (Admin)',
    icon: '👑',
    description: 'Your actual admin access'
  }
]

// Update dev tier when selection changes
watch(selectedTier, (newTier) => {
  if (newTier === 'real') {
    clearDevMode()
  } else {
    setDevTier(newTier)
  }
})

// Sync selection with actual dev tier override
watch(devTierOverride, (newOverride) => {
  selectedTier.value = newOverride || 'real'
}, { immediate: true })

// Reset to real access
function resetToReal() {
  selectedTier.value = 'real'
  clearDevMode()
}

// Badge class based on tier
const tierBadgeClass = computed(() => {
  if (isDevMode.value) {
    switch (devTierOverride.value) {
      case 'free': return 'bg-gray-500/20 text-gray-400'
      case 'league': return 'bg-primary/20 text-primary'
      case 'premium': return 'bg-yellow-500/20 text-yellow-500'
    }
  }
  return 'bg-green-500/20 text-green-400'
})
</script>

<style scoped>
.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.3s ease;
}

.slide-up-enter-from,
.slide-up-leave-to {
  opacity: 0;
  transform: translateY(20px);
}
</style>
