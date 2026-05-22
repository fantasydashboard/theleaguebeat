<template>
  <span
    v-if="isLocked"
    class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium cursor-pointer transition-all hover:scale-105"
    :class="badgeClass"
    @click="handleClick"
    :title="tooltip"
  >
    <span>{{ icon }}</span>
    <span>{{ label }}</span>
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useFeatureAccess } from '@/composables/useFeatureAccess'

const props = defineProps<{
  featureType: 'league' | 'premium'
  label?: string
}>()

const router = useRouter()
const { hasLeagueAccess, hasPremiumAccess } = useFeatureAccess()

const isLocked = computed(() => {
  if (props.featureType === 'league') {
    return !hasLeagueAccess.value
  }
  return !hasPremiumAccess.value
})

const isLeagueFeature = computed(() => props.featureType === 'league')

const icon = computed(() => isLeagueFeature.value ? '🔒' : '⭐')

const label = computed(() => {
  if (props.label) return props.label
  return isLeagueFeature.value ? 'League Pass' : 'Premium'
})

const tooltip = computed(() => {
  return isLeagueFeature.value
    ? 'Requires League Pass - Click to upgrade'
    : 'Requires Premium - Click to upgrade'
})

const badgeClass = computed(() => {
  return isLeagueFeature.value
    ? 'bg-primary/20 text-primary hover:bg-primary/30'
    : 'bg-yellow-500/20 text-yellow-500 hover:bg-yellow-500/30'
})

function handleClick() {
  router.push(isLeagueFeature.value ? '/upgrade/league' : '/upgrade/premium')
}
</script>
