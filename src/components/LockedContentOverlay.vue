<template>
  <div class="relative">
    <!-- Visible content -->
    <div v-if="$slots.visible">
      <slot name="visible" />
    </div>

    <!-- Locked content preview -->
    <div v-if="showLockedPreview" class="relative mt-4">
      <!-- Blurred preview rows -->
      <div class="blur-sm select-none pointer-events-none opacity-40">
        <div v-for="i in previewRowCount" :key="i" class="flex items-center gap-4 py-3 border-b border-dark-border/20">
          <div class="w-10 h-10 rounded-full bg-dark-border/50"></div>
          <div class="flex-1 space-y-2">
            <div class="h-4 w-32 bg-dark-border/40 rounded"></div>
            <div class="h-3 w-24 bg-dark-border/30 rounded"></div>
          </div>
          <div class="h-6 w-20 bg-dark-border/30 rounded"></div>
        </div>
      </div>

      <!-- Upgrade overlay -->
      <div class="absolute inset-0 flex items-center justify-center bg-gradient-to-t from-dark-bg via-dark-bg/90 to-transparent">
        <div class="text-center p-6 max-w-md">
          <div class="text-4xl mb-3">{{ icon }}</div>
          <h3 class="text-lg font-bold text-dark-text mb-2">{{ title }}</h3>
          <p class="text-sm text-dark-textMuted mb-4">{{ description }}</p>
          <button 
            @click="handleUpgrade"
            class="px-6 py-2.5 font-bold rounded-lg transition-all transform hover:scale-105"
            :class="isUltimateTier 
              ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-gray-900' 
              : 'bg-primary hover:bg-primary/90 text-gray-900'"
          >
            {{ buttonText }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useFeatureAccess } from '@/composables/useFeatureAccess'

const props = withDefaults(defineProps<{
  // What this section contains
  lockedItemCount?: number
  lockedItemLabel?: string  // e.g., "teams", "seasons", "players"
  
  // Display options
  previewRowCount?: number
  icon?: string
  customTitle?: string
  customDescription?: string
  
  // Tier type (for styling)
  isUltimateTier?: boolean
}>(), {
  lockedItemCount: 0,
  lockedItemLabel: 'items',
  previewRowCount: 3,
  icon: '🔒',
  isUltimateTier: false,
})

const router = useRouter()
const { hasLeagueAccess, hasPremiumAccess } = useFeatureAccess()

const showLockedPreview = computed(() => {
  if (props.isUltimateTier) {
    return !hasPremiumAccess.value && props.lockedItemCount > 0
  }
  return !hasLeagueAccess.value && props.lockedItemCount > 0
})

const title = computed(() => {
  if (props.customTitle) return props.customTitle
  if (props.lockedItemCount > 0) {
    return `${props.lockedItemCount} More ${props.lockedItemLabel}`
  }
  return props.isUltimateTier ? 'Ultimate Feature' : 'League Pass Required'
})

const description = computed(() => {
  if (props.customDescription) return props.customDescription
  return 'Unlock full access to this feature for your entire league.'
})

const buttonText = computed(() => {
  return 'Get League Pass'
})

function handleUpgrade() {
  router.push('/pricing')
}
</script>
