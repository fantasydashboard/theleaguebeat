<template>
  <div class="relative">
    <!-- Preview content (blurred) -->
    <div
      class="select-none"
      :class="[
        isLocked ? 'blur-sm pointer-events-none' : '',
        previewClass
      ]"
    >
      <slot name="preview" />
    </div>

    <!-- Overlay with upgrade prompt -->
    <Transition name="fade">
      <div
        v-if="isLocked"
        class="absolute inset-0 flex items-center justify-center bg-dark-bg/70 backdrop-blur-sm rounded-xl z-10"
      >
        <div class="text-center p-6 max-w-sm">
          <!-- Icon -->
          <div class="text-5xl mb-4">
            🔒
          </div>

          <!-- Title -->
          <h3 class="text-xl font-bold text-dark-text mb-2">
            {{ title || 'League Pass Required' }}
          </h3>

          <!-- Description -->
          <p class="text-sm text-dark-textMuted mb-4">
            {{ description || defaultDescription }}
          </p>



          <!-- CTA Button -->
          <button
            @click="handleUpgradeClick"
            class="px-6 py-3 rounded-lg font-bold transition-all transform hover:scale-105"
            :class="isLeagueFeature ? 'bg-primary hover:bg-primary/90 text-white' : 'bg-yellow-500 hover:bg-yellow-400 text-black'"
          >
            {{ buttonText || 'Get League Pass' }}
          </button>

          <!-- Secondary link -->
          <p v-if="isLeagueFeature" class="text-xs text-dark-textMuted mt-3">
            Ask your commissioner if your league is already unlocked
          </p>
        </div>
      </div>
    </Transition>

    <!-- Full content (when unlocked) -->
    <div v-if="!isLocked">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useFeatureAccess } from '@/composables/useFeatureAccess'

const props = defineProps<{
  // What type of feature is this?
  featureType: 'league' | 'premium'

  // Optional customizations
  title?: string
  description?: string
  buttonText?: string
  showPrice?: boolean
  previewClass?: string

  // Override the lock state (for testing)
  forceLocked?: boolean
}>()

const emit = defineEmits<{
  (e: 'upgrade-click'): void
}>()

const router = useRouter()
const { hasLeagueAccess, hasPremiumAccess } = useFeatureAccess()

// Is this a league-level feature?
const isLeagueFeature = computed(() => props.featureType === 'league')

// Should this content be locked?
const isLocked = computed(() => {
  if (props.forceLocked !== undefined) return props.forceLocked

  if (props.featureType === 'league') {
    return !hasLeagueAccess.value
  } else {
    return !hasLeagueAccess.value
  }
})

// Default description based on feature type
const defaultDescription = computed(() => {
  if (isLeagueFeature.value) {
    return 'Unlock full access to power rankings, league history, career stats, and downloadable graphics for your entire league.'
  }
  return 'Get AI-powered projections, start/sit recommendations, waiver analysis, and trade tools for your team.'
})

// Handle upgrade button click
function handleUpgradeClick() {
  emit('upgrade-click')

  // Navigate to appropriate upgrade page
  if (isLeagueFeature.value) {
    router.push('/upgrade/league')
  } else {
    router.push('/pricing')
  }
}
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
