<script setup lang="ts">
import { computed } from 'vue'
import { getTeam } from '@/fixtures/pillarsLeague'

interface Props {
  teamId: string
  size?: number
  showStar?: boolean
  rounded?: 'circle' | 'square'
}

const props = withDefaults(defineProps<Props>(), {
  size: 40,
  showStar: false,
  rounded: 'circle',
})

const team = computed(() => getTeam(props.teamId))
const sizePx = computed(() => `${props.size}px`)
const initialsSize = computed(() => `${Math.round(props.size * 0.4)}px`)
const radius = computed(() =>
  props.rounded === 'circle' ? '50%' : `${Math.round(props.size * 0.18)}px`,
)
const bgValue = computed(() =>
  team.value.avatarColor.includes(',')
    ? `linear-gradient(135deg, ${team.value.avatarColor})`
    : team.value.avatarColor,
)
const initials = computed(
  () => team.value.ownerInitials ?? team.value.name.slice(0, 2).toUpperCase(),
)
</script>

<template>
  <div class="team-avatar" :style="{ width: sizePx, height: sizePx }">
    <div
      class="team-avatar__bg"
      :class="[`team-avatar__bg--${rounded}`]"
      :style="{ borderRadius: radius, background: bgValue }"
    >
      <img v-if="team.avatarUrl" :src="team.avatarUrl" :alt="team.name" />
      <span v-else class="team-avatar__initials" :style="{ fontSize: initialsSize }">
        {{ initials }}
      </span>
    </div>
    <span v-if="showStar" class="team-avatar__star" aria-hidden="true">
      <svg viewBox="0 0 12 12" width="10" height="10">
        <path
          d="M6 1 L7.3 4.5 L11 4.7 L8.2 7 L9 10.8 L6 8.8 L3 10.8 L3.8 7 L1 4.7 L4.7 4.5 Z"
          fill="var(--accent-primary)"
        />
      </svg>
    </span>
  </div>
</template>

<style scoped>
.team-avatar {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  overflow: visible;
  flex-shrink: 0;
}
.team-avatar__bg {
  position: absolute;
  inset: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
.team-avatar__bg img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.team-avatar__initials {
  color: oklch(0.98 0.005 90);
  font-family: var(--font-display, 'Barlow Condensed', sans-serif);
  font-weight: 800;
  letter-spacing: 0.02em;
  text-transform: uppercase;
}
.team-avatar__star {
  position: absolute;
  top: -2px;
  right: -2px;
  width: 12px;
  height: 12px;
  background: oklch(0.16 0.01 280);
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  z-index: 1;
}
</style>
