<template>
  <!-- Always renders slot (the preview content). -->
  <!-- When locked: shows a fade + inline upgrade bar instead of expanding. -->
  <div class="expand-gate">
    <slot />

    <!-- Locked state: just a fade + subtle hint — banner handles upgrade CTA -->
    <div v-if="locked && !isCheckingAccess" class="eg-locked">
      <div class="eg-fade"></div>
      <div class="eg-hint">
        <span class="eg-icon">🔒</span>
        <span class="eg-text">Upgrade to see the full list</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useLeagueStore } from '@/stores/league'
import { useFeatureAccess } from '@/composables/useFeatureAccess'

const props = withDefaults(defineProps<{
  // Override lock state from parent (pass !canExpand from useFeatureAccess)
  // If omitted, component checks canExpand itself
  locked?: boolean
  // Custom message shown in the gate bar
  message?: string
}>(), {
  message: 'See the full list — upgrade to unlock everything.'
})

const router = useRouter()
const leagueStore = useLeagueStore()
const { canExpand, isCheckingAccess, isTrialExpired } = useFeatureAccess()

const locked = computed(() => {
  if (props.locked !== undefined) return props.locked
  return !canExpand.value
})

function goToPricing(intent: 'trial' | 'plans') {
  const params = new URLSearchParams()
  if (leagueStore.activeLeagueId) params.set('league', leagueStore.activeLeagueId)
  if (leagueStore.activePlatform) params.set('platform', leagueStore.activePlatform)
  if (intent === 'trial') params.set('intent', 'trial')
  const qs = params.toString()
  router.push(qs ? `/pricing?${qs}` : '/pricing')
}
</script>

<style scoped>
.expand-gate { position: relative; }

.eg-locked { position: relative; margin-top: -40px; }
.eg-fade {
  height: 60px;
  background: linear-gradient(to bottom, transparent, #0a0c14);
  pointer-events: none;
}
.eg-hint {
  display: flex; align-items: center; justify-content: center; gap: 6px;
  background: #0a0c14; border-top: 1px solid #1e2130;
  padding: 10px 20px;
}
.eg-icon { font-size: 12px; }
.eg-text { font-size: 12px; color: #374151; font-style: italic; }
</style>
