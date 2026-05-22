<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    stroke-width="1.5"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <!-- Trophy: winLoss -->
    <g v-if="factor === 'winLoss'">
      <path d="M4 2.5h8v3a4 4 0 1 1-8 0v-3Z" />
      <path d="M4 4H2v1a2 2 0 0 0 2 2" />
      <path d="M12 4h2v1a2 2 0 0 1-2 2" />
      <path d="M6.5 13.5h3" />
      <path d="M8 10v3.5" />
    </g>
    <!-- Bar chart: totalPoints -->
    <g v-else-if="factor === 'totalPoints'">
      <path d="M2.5 13.5h11" />
      <rect x="3.5" y="9"  width="2" height="4" />
      <rect x="7"   y="6"  width="2" height="7" />
      <rect x="10.5" y="3" width="2" height="10" />
    </g>
    <!-- Crossed swords: allPlay -->
    <g v-else-if="factor === 'allPlay'">
      <path d="M2.5 2.5l6 6" />
      <path d="M13.5 2.5l-6 6" />
      <path d="M2 2.5h2.5L6 4" />
      <path d="M14 2.5h-2.5L10 4" />
      <path d="M5 9l2.5 2.5" />
      <path d="M11 9l-2.5 2.5" />
      <path d="M4 13.5l2-2" />
      <path d="M12 13.5l-2-2" />
    </g>
    <!-- Flame: recentForm -->
    <g v-else-if="factor === 'recentForm'">
      <path d="M8 1.5s3 2.5 3 5.5a3 3 0 0 1-6 0c0-1.2.5-2 1-2.5C6 6 7 7 7 7s-.5-1.5 0-3c.5-1.5 1-2.5 1-2.5Z" />
      <path d="M8 14.5a3.5 3.5 0 0 0 3.5-3.5c0-1-.4-1.8-.9-2.4C10.5 9.5 9.5 10 9.5 10S10 9 9.5 8c-.5 1-1.5 2-1.5 2s-1-1-1.5-2C6 9 6.5 10 6.5 10S5.5 9.5 5.4 8.6c-.5.6-.9 1.4-.9 2.4A3.5 3.5 0 0 0 8 14.5Z" />
    </g>
    <!-- Target: consistency -->
    <g v-else-if="factor === 'consistency'">
      <circle cx="8" cy="8" r="6" />
      <circle cx="8" cy="8" r="3.5" />
      <circle cx="8" cy="8" r="1" fill="currentColor" stroke="none" />
    </g>
    <!-- Die: schedLuck -->
    <g v-else-if="factor === 'schedLuck'">
      <rect x="2.5" y="2.5" width="11" height="11" rx="2" />
      <circle cx="5.5" cy="5.5" r="0.6" fill="currentColor" stroke="none" />
      <circle cx="10.5" cy="5.5" r="0.6" fill="currentColor" stroke="none" />
      <circle cx="8" cy="8" r="0.6" fill="currentColor" stroke="none" />
      <circle cx="5.5" cy="10.5" r="0.6" fill="currentColor" stroke="none" />
      <circle cx="10.5" cy="10.5" r="0.6" fill="currentColor" stroke="none" />
    </g>
  </svg>
</template>

<script setup lang="ts">
import type { TeamFactorScores } from '@/fixtures/pillarsLeague'

defineProps<{
  factor: keyof TeamFactorScores
  size?: number | string
}>()
</script>
