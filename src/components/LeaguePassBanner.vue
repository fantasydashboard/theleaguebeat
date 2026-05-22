<template>
  <transition name="banner-slide">
    <div v-if="show" class="lp-banner">
      <div class="lp-inner">
        <span class="lp-icon">🏆</span>
        <span class="lp-text">
          <strong>League Pass Active</strong>
          <span class="lp-sep">·</span>
          <span class="lp-league">{{ leagueName }}</span>
          <span v-if="sport" class="lp-sep">·</span>
          <span v-if="sport" class="lp-sport">{{ sportLabel }}</span>
          <!-- Days remaining: hidden on mobile to keep single line, visible on sm+ -->
          <span class="lp-sep hidden sm:inline">·</span>
          <span class="lp-days hidden sm:inline" :class="urgencyClass">{{ expiryLabel }}</span>
          <!-- On mobile: show condensed days only -->
          <span class="lp-sep sm:hidden">·</span>
          <span class="lp-days sm:hidden" :class="urgencyClass">{{ daysShort }}</span>
        </span>
      </div>
      <button class="lp-close" @click="dismissed = true" aria-label="Dismiss">✕</button>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useLeagueStore } from '@/stores/league'
import { useLeaguePass } from '@/composables/useLeaguePass'

const leagueStore = useLeagueStore()
const { hasPass, daysRemaining, expiryLabel } = useLeaguePass()

const dismissed = ref(false)

const show = computed(() => hasPass.value && !dismissed.value && daysRemaining.value !== null)

const leagueName = computed(() => {
  const league = leagueStore.savedLeagues?.find(l => l.league_id === leagueStore.activeLeagueId)
  return league?.league_name || leagueStore.activeLeagueId || 'Your League'
})

const sport = computed(() => leagueStore.activeSport || '')

const sportLabel = computed(() => {
  const s = sport.value
  if (s === 'football') return '🏈 Football'
  if (s === 'basketball') return '🏀 Basketball'
  if (s === 'baseball') return '⚾ Baseball'
  if (s === 'hockey') return '🏒 Hockey'
  return s
})

// Short form for mobile: "365d" instead of "365 days remaining"
const daysShort = computed(() => {
  const d = daysRemaining.value
  if (d === null) return ''
  if (d <= 0) return 'Expires today'
  return `${d}d`
})

// Turn yellow when < 30 days, red when < 7
const urgencyClass = computed(() => {
  const d = daysRemaining.value
  if (d === null) return ''
  if (d <= 7) return 'lp-days--urgent'
  if (d <= 30) return 'lp-days--warning'
  return 'lp-days--ok'
})
</script>

<style scoped>
.lp-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 16px;
  background: linear-gradient(90deg, rgba(34,197,94,0.12) 0%, rgba(34,197,94,0.06) 100%);
  border-bottom: 1px solid rgba(34,197,94,0.25);
  font-size: 0.8rem;
  color: #9ca3af;
  min-height: 32px;
  /* Never allow two lines */
  white-space: nowrap;
  overflow: hidden;
}
.lp-inner {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  overflow: hidden;
}
.lp-icon { font-size: 0.9rem; flex-shrink: 0; }
.lp-text {
  display: flex;
  align-items: center;
  gap: 5px;
  min-width: 0;
  overflow: hidden;
  /* No wrapping — single line always */
  flex-wrap: nowrap;
  white-space: nowrap;
}
.lp-text strong { color: #22c55e; font-weight: 700; font-size: 0.8rem; flex-shrink: 0; }
.lp-sep { color: #374151; flex-shrink: 0; }
.lp-league { color: #d1d5db; overflow: hidden; text-overflow: ellipsis; min-width: 0; }
.lp-sport { color: #9ca3af; flex-shrink: 0; }
.lp-days--ok { color: #22c55e; font-weight: 600; flex-shrink: 0; }
.lp-days--warning { color: #eab308; font-weight: 600; flex-shrink: 0; }
.lp-days--urgent { color: #ef4444; font-weight: 700; flex-shrink: 0; }
.lp-close {
  background: none;
  border: none;
  color: #4b5563;
  cursor: pointer;
  font-size: 0.7rem;
  padding: 2px 6px;
  border-radius: 4px;
  transition: color 0.15s;
  flex-shrink: 0;
}
.lp-close:hover { color: #9ca3af; }

.banner-slide-enter-active,
.banner-slide-leave-active { transition: all 0.2s ease; }
.banner-slide-enter-from,
.banner-slide-leave-to { opacity: 0; max-height: 0; padding-top: 0; padding-bottom: 0; }
.banner-slide-enter-to,
.banner-slide-leave-from { opacity: 1; max-height: 40px; }
</style>
