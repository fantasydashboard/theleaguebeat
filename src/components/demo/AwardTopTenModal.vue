<template>
  <Teleport to="body">
    <div class="aw-root" role="presentation">
      <div class="aw-backdrop" @click="onClose" aria-hidden="true"></div>
      <div
        ref="dialogRef"
        class="aw-dialog"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="`aw-title-${record.id}`"
      >
        <header class="aw-head">
          <div class="aw-head-text">
            <p class="aw-eyebrow" :class="record.category === 'fame' ? 'aw-eyebrow-fame' : 'aw-eyebrow-shame'">
              League of record · {{ record.category === 'fame' ? 'All-time best' : 'All-time worst' }}
            </p>
            <h2 :id="`aw-title-${record.id}`" class="aw-title">{{ record.label }}</h2>
          </div>
          <button
            ref="closeBtnRef"
            type="button"
            class="aw-close"
            aria-label="Close award detail"
            @click="onClose"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <line x1="5" y1="5" x2="19" y2="19" />
              <line x1="19" y1="5" x2="5" y2="19" />
            </svg>
          </button>
        </header>

        <!-- Hero: #1 holder -->
        <section class="aw-hero">
          <div
            class="aw-hero-avatar"
            :style="{ background: `linear-gradient(135deg, ${headlineTeam.avatarColor})` }"
          >
            <img v-if="headlineTeam.avatarUrl" :src="headlineTeam.avatarUrl" class="aw-hero-img" alt="" />
            <span v-else>{{ headlineTeam.ownerInitials }}</span>
          </div>
          <div class="aw-hero-text">
            <p class="aw-hero-name">{{ headlineTeam.name }}</p>
            <p v-if="record.headline.season" class="aw-hero-when">
              {{ record.headline.season }}<span v-if="record.headline.week">, Week {{ record.headline.week }}</span>
            </p>
            <p v-else class="aw-hero-when">Career record</p>
          </div>
          <div class="aw-hero-value-wrap">
            <span
              class="aw-hero-value"
              :class="record.category === 'fame' ? 'aw-value-fame' : 'aw-value-shame'"
            >{{ formatValue(record.headline.value) }}</span>
            <span class="aw-hero-unit">{{ unit }}</span>
          </div>
        </section>

        <!-- Top 10 list -->
        <section class="aw-list-wrap" aria-label="Top ten holders">
          <p class="aw-list-eyebrow">Top 10</p>
          <ol class="aw-list">
            <li
              v-for="(entry, i) in record.topTen"
              :key="`${entry.teamId}-${entry.season ?? ''}-${entry.week ?? ''}-${i}`"
              class="aw-row"
              :class="i === 0 ? 'aw-row-head' : ''"
            >
              <span class="aw-row-rank">{{ i + 1 }}</span>
              <div
                class="aw-row-avatar"
                :style="{ background: `linear-gradient(135deg, ${getTeam(entry.teamId).avatarColor})` }"
              >
                <img v-if="getTeam(entry.teamId).avatarUrl" :src="getTeam(entry.teamId).avatarUrl" class="aw-row-img" alt="" />
                <span v-else>{{ getTeam(entry.teamId).ownerInitials }}</span>
              </div>
              <div class="aw-row-name">
                <p class="aw-row-team">{{ getTeam(entry.teamId).name }}</p>
                <p v-if="entry.season" class="aw-row-when">
                  {{ entry.season }}<span v-if="entry.week"> · Week {{ entry.week }}</span>
                </p>
              </div>
              <div class="aw-row-bar" aria-hidden="true">
                <span
                  class="aw-row-bar-fill"
                  :class="record.category === 'fame' ? 'aw-bar-fame' : 'aw-bar-shame'"
                  :style="{ transform: 'scaleX(' + (barWidth(entry.value) / 100) + ')' }"
                ></span>
              </div>
              <span class="aw-row-value">{{ formatValue(entry.value) }}</span>
            </li>
          </ol>
        </section>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { getTeam, type AllTimeRecord } from '@/fixtures/pillarsLeague'

const props = defineProps<{ record: AllTimeRecord }>()
const emit = defineEmits<{ (e: 'close'): void }>()

const headlineTeam = computed(() => getTeam(props.record.headline.teamId))

const unit = computed(() => {
  switch (props.record.id) {
    case 'highest-single-week':
    case 'lowest-single-week': return 'points'
    case 'most-career-wins':   return 'wins'
    case 'most-career-losses': return 'losses'
    case 'highest-career-ppw':
    case 'lowest-career-ppw':  return 'PPW'
    case 'best-win-pct':
    case 'worst-win-pct':      return 'win %'
    default: return ''
  }
})

function formatValue(v: number) {
  if (props.record.id === 'best-win-pct' || props.record.id === 'worst-win-pct') {
    return `${v.toFixed(1)}%`
  }
  // Integers for wins/losses; one decimal for ppw and single-week scores
  if (props.record.id === 'most-career-wins' || props.record.id === 'most-career-losses') {
    return Math.round(v).toString()
  }
  return v.toFixed(1)
}

const maxValue = computed(() => {
  const vals = props.record.topTen.map(e => e.value)
  return Math.max(...vals)
})
const minValue = computed(() => {
  const vals = props.record.topTen.map(e => e.value)
  return Math.min(...vals)
})

function barWidth(v: number) {
  // For "shame" records that grow with badness, invert so worst (highest count) reads bigger.
  // For win % we want fame=higher-is-better, shame=lower-is-worse but visually we still want the
  // record-holder (rank 1) to show the longest bar. Anchor: rank 1 = 100%, scale linearly to min.
  const max = maxValue.value
  const min = minValue.value
  if (max === min) return 100
  // If category is fame (or list is descending), rank 1 holds max. If shame and descending by badness, rank 1 holds max.
  // We always want rank 1 longest. Normalize: (v - min) / (max - min) -> 0..1
  // If rank-1 holds max, that gives 100%. If rank-1 holds min (only true for ppw shame and win-pct shame which both
  // list worst -> best ascending), invert.
  const firstIsMax = props.record.topTen[0].value === max
  const norm = firstIsMax ? (v - min) / (max - min) : 1 - (v - min) / (max - min)
  return Math.max(8, Math.round(norm * 100))
}

/* Focus management + trap */
const dialogRef = ref<HTMLElement | null>(null)
const closeBtnRef = ref<HTMLElement | null>(null)

function onClose() {
  emit('close')
}

useDemoModal({ dialogRef, closeBtnRef, onClose })
</script>

<style scoped>
.aw-root {
  position: fixed;
  inset: 0;
  z-index: 220;
  display: grid;
  place-items: center;
  padding: 24px;
  --ink-1: oklch(0.97 0.005 90);
  --ink-2: oklch(0.78 0.008 90);
  --ink-3: oklch(0.55 0.010 90);
  --ink-4: oklch(0.32 0.012 90);
  --ink-5: oklch(0.20 0.015 90);
  --ink-6: oklch(0.14 0.018 90);
  --ink-7: oklch(0.10 0.015 90);
  --accent-primary:   oklch(0.78 0.18 92);
  --accent-secondary: oklch(0.70 0.27 350);
  --accent-tertiary:  oklch(0.72 0.18 195);
  --accent-up:        oklch(0.74 0.18 145);

  font-family: 'Barlow', sans-serif;
  color: var(--ink-1);
}
.aw-backdrop {
  position: absolute; inset: 0;
  background: oklch(0.04 0.014 90 / 0.78);
  opacity: 0;
}
.aw-dialog {
  position: relative;
  width: 100%;
  max-width: 680px;
  max-height: calc(100vh - 48px);
  overflow-y: auto;
  background: oklch(0.10 0.015 90);
  border: 1px solid oklch(0.22 0.015 90);
  border-radius: 18px;
  padding: 22px 26px 22px;
  box-shadow:
    0 28px 72px -28px oklch(0 0 0 / 0.85),
    inset 0 1px 0 oklch(1 0 0 / 0.04);
  opacity: 0;
  transform: scale(0.96) translateY(8px);
}
@media (prefers-reduced-motion: no-preference) {
  .aw-backdrop { animation: aw-fade-in 140ms cubic-bezier(0.22, 1, 0.36, 1) forwards; }
  .aw-dialog {
    animation: aw-dialog-in 180ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
    animation-delay: 30ms;
  }
  @keyframes aw-fade-in { to { opacity: 1; } }
  @keyframes aw-dialog-in { to { opacity: 1; transform: scale(1) translateY(0); } }
}
@media (prefers-reduced-motion: reduce) {
  .aw-backdrop, .aw-dialog { opacity: 1; transform: none; }
}

.aw-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 16px; }
.aw-eyebrow {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.72rem; font-weight: 800;
  letter-spacing: 0.14em; text-transform: uppercase;
  color: var(--ink-3); margin: 0 0 4px;
}
.aw-eyebrow-fame  { color: var(--accent-up); }
.aw-eyebrow-shame { color: var(--accent-secondary); }
.aw-title {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 1.5rem;
  line-height: 1.05;
  letter-spacing: -0.008em;
  color: var(--ink-1);
  margin: 0;
}
.aw-close {
  width: 32px; height: 32px; display: grid; place-items: center;
  background: transparent;
  border: 1px solid oklch(0.22 0.015 90);
  border-radius: 8px;
  color: var(--ink-2);
  cursor: pointer;
  flex-shrink: 0;
}
.aw-close:hover { color: var(--ink-1); border-color: oklch(0.36 0.015 90); }
.aw-close:active {
  transform: scale(0.97);
  transition-duration: 100ms;
}
.aw-close:focus-visible { outline: 2px solid var(--accent-primary); outline-offset: 2px; }
@media (prefers-reduced-motion: no-preference) {
  .aw-close { transition: color 160ms cubic-bezier(0.22, 1, 0.36, 1), border-color 160ms cubic-bezier(0.22, 1, 0.36, 1); }
}

/* Hero */
.aw-hero {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 16px;
  padding: 14px 0;
  margin-bottom: 18px;
  border-top: 1px solid oklch(0.16 0.015 90);
  border-bottom: 1px solid oklch(0.16 0.015 90);
}
.aw-hero-avatar {
  width: 56px; height: 56px; border-radius: 12px;
  display: grid; place-items: center;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900; font-size: 1.1rem;
  color: oklch(0.12 0.012 90);
  overflow: hidden;
  box-shadow: 0 8px 24px -10px oklch(0 0 0 / 0.5);
}
.aw-hero-img { width: 100%; height: 100%; object-fit: cover; display: block; }
.aw-hero-name {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900; font-size: 1.15rem;
  line-height: 1.1;
  color: var(--ink-1); margin: 0;
}
.aw-hero-when {
  margin: 4px 0 0;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.78rem; font-weight: 700;
  letter-spacing: 0.08em; text-transform: uppercase;
  color: var(--ink-3);
}
.aw-hero-value-wrap {
  display: flex; flex-direction: column;
  align-items: flex-end;
  line-height: 0.86;
}
.aw-hero-value {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: clamp(3rem, 9vw, 4rem);
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
}
.aw-value-fame  { color: var(--accent-up); }
.aw-value-shame { color: var(--accent-secondary); }
.aw-hero-unit {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.7rem; font-weight: 800;
  letter-spacing: 0.18em; text-transform: uppercase;
  color: var(--ink-3);
  margin-top: 4px;
}

/* Top 10 */
.aw-list-eyebrow {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.72rem; font-weight: 800;
  letter-spacing: 0.14em; text-transform: uppercase;
  color: var(--ink-3); margin: 0 0 6px;
}
.aw-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; }
.aw-row {
  display: grid;
  grid-template-columns: 26px 32px minmax(0, 1.3fr) minmax(0, 2.4fr) 70px;
  align-items: center;
  gap: 10px;
  padding: 8px 0;
  border-bottom: 1px solid oklch(0.14 0.018 90);
}
.aw-row:last-child { border-bottom: none; }
.aw-row-head { background: oklch(0.13 0.015 90); border-radius: 8px; padding: 8px; margin: 0 -8px 4px; border-bottom: none; }
.aw-row-rank {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900; font-size: 0.92rem;
  color: var(--ink-3);
  font-variant-numeric: tabular-nums;
  text-align: center;
}
.aw-row-head .aw-row-rank { color: var(--ink-1); }
.aw-row-avatar {
  width: 32px; height: 32px; border-radius: 8px;
  display: grid; place-items: center;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900; font-size: 0.78rem;
  color: oklch(0.12 0.012 90);
  overflow: hidden;
}
.aw-row-img { width: 100%; height: 100%; object-fit: cover; display: block; }
.aw-row-name { min-width: 0; }
.aw-row-team {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800; font-size: 0.92rem;
  letter-spacing: 0.01em;
  color: var(--ink-1);
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.aw-row-when {
  font-size: 0.74rem;
  color: var(--ink-3);
  margin: 1px 0 0;
}
.aw-row-bar {
  height: 8px;
  border-radius: 999px;
  background: oklch(0.18 0.015 90);
  overflow: hidden;
}
.aw-row-bar-fill {
  display: block;
  width: 100%;
  height: 100%;
  border-radius: 999px;
  transform-origin: left center;
  transform: scaleX(1);
}
.aw-bar-fame  { background: var(--accent-up); }
.aw-bar-shame { background: var(--accent-secondary); }
@media (prefers-reduced-motion: no-preference) {
  .aw-row-bar-fill { transition: transform 240ms cubic-bezier(0.22, 1, 0.36, 1); }
}
.aw-row-value {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900; font-size: 1rem;
  color: var(--ink-1);
  font-variant-numeric: tabular-nums;
  text-align: right;
}

@media (max-width: 560px) {
  .aw-hero { grid-template-columns: auto 1fr; }
  .aw-hero-value-wrap { grid-column: 1 / -1; align-items: flex-start; }
  .aw-row { grid-template-columns: 22px 28px minmax(0, 1.3fr) 64px; }
  .aw-row-bar { grid-column: 1 / -1; height: 6px; }
}
</style>
