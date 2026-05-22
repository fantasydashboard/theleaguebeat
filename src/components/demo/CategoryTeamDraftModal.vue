<template>
  <Teleport to="body">
    <div class="ctd-root" role="presentation">
      <div class="ctd-backdrop" @click="onClose" aria-hidden="true"></div>
      <div
        ref="dialogRef"
        class="ctd-dialog"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="`ctd-title-${team.id}`"
      >
        <!-- HEADER -->
        <header class="ctd-head">
          <div class="ctd-head-id">
            <div
              class="ctd-avatar"
              :style="{ background: `linear-gradient(135deg, ${team.avatarColor})` }"
            >
              <img v-if="team.avatarUrl" :src="team.avatarUrl" class="ctd-avatar-img" alt="" />
              <span v-else>{{ team.ownerInitials }}</span>
            </div>
            <div>
              <h2 :id="`ctd-title-${team.id}`" class="ctd-title">{{ team.name }}</h2>
              <p class="ctd-sub">
                Draft breakdown
                <span class="ctd-sub-dot" aria-hidden="true">·</span>
                <span class="ctd-sub-owner">{{ team.ownerName }}</span>
              </p>
            </div>
          </div>
          <button
            ref="closeBtnRef"
            type="button"
            class="ctd-close"
            aria-label="Close draft breakdown"
            @click="onClose"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <line x1="5" y1="5" x2="19" y2="19" />
              <line x1="19" y1="5" x2="5" y2="19" />
            </svg>
          </button>
        </header>

        <!-- HERO grade + narrative -->
        <section class="ctd-hero" :class="`ctd-hero-${gradeBand}`">
          <span class="ctd-hero-glow" aria-hidden="true"></span>
          <span v-if="gradeBand === 'aplus'" class="ctd-hero-chrome-top" aria-hidden="true"></span>
          <span v-if="gradeBand === 'aplus'" class="ctd-hero-chrome-bottom" aria-hidden="true"></span>
          <span v-if="gradeBand === 'd'" class="ctd-hero-tape" aria-hidden="true"></span>

          <div class="ctd-hero-row">
            <p class="ctd-hero-grade" :class="`ctd-hero-grade-${gradeBand}`" :aria-label="`Draft grade ${grade.grade}`">{{ grade.grade }}</p>
            <div class="ctd-hero-meta">
              <p class="ctd-hero-rank">#{{ grade.rank }} of 10</p>
              <h3 class="ctd-hero-headline">{{ grade.headline }}</h3>
              <p class="ctd-hero-narrative">{{ grade.narrative }}</p>
            </div>
          </div>
          <ul class="ctd-hero-stats" role="list">
            <li class="ctd-hero-stat">
              <span class="ctd-hero-stat-num ctd-hero-stat-num-pos">{{ grade.stats.steals }}</span>
              <span class="ctd-hero-stat-label">Steals</span>
            </li>
            <li class="ctd-hero-stat-sep" aria-hidden="true"></li>
            <li class="ctd-hero-stat">
              <span class="ctd-hero-stat-num">{{ grade.stats.hits }}</span>
              <span class="ctd-hero-stat-label">Hits</span>
            </li>
            <li class="ctd-hero-stat-sep" aria-hidden="true"></li>
            <li class="ctd-hero-stat">
              <span class="ctd-hero-stat-num">{{ grade.stats.misses }}</span>
              <span class="ctd-hero-stat-label">Misses</span>
            </li>
            <li class="ctd-hero-stat-sep" aria-hidden="true"></li>
            <li class="ctd-hero-stat">
              <span class="ctd-hero-stat-num ctd-hero-stat-num-neg">{{ grade.stats.busts }}</span>
              <span class="ctd-hero-stat-label">Busts</span>
            </li>
          </ul>
        </section>

        <!-- PICKS list -->
        <section class="ctd-picks" aria-labelledby="ctd-picks-label">
          <p id="ctd-picks-label" class="ctd-eyebrow">All eighteen picks</p>
          <ul class="ctd-pick-rows" role="list">
            <li
              v-for="p in teamPicks"
              :key="p.pickOverall"
              class="ctd-pick-row"
              :style="{ background: rowBg(p.valueScore), borderColor: rowBorder(p.valueScore) }"
              tabindex="0"
              role="button"
              :aria-label="`Open ${p.playerName} pick detail`"
              @click="$emit('open-pick', p.pickOverall)"
              @keydown.enter.prevent="$emit('open-pick', p.pickOverall)"
              @keydown.space.prevent="$emit('open-pick', p.pickOverall)"
            >
              <span class="ctd-pick-round">R{{ p.round }}</span>
              <span class="ctd-pick-pos" :style="{ background: posBg(p.position), color: posFg(p.position) }">{{ p.position }}</span>
              <div class="ctd-pick-text">
                <p class="ctd-pick-name">{{ p.playerName }}</p>
                <p class="ctd-pick-meta">{{ p.mlbTeam }} · #{{ p.pickOverall }} overall</p>
              </div>
              <span class="ctd-pick-value" :style="{ color: valueColor(p.valueScore) }">
                {{ p.valueScore > 0 ? '+' : '' }}{{ p.valueScore }}
              </span>
              <span class="ctd-pick-tier" :class="`ctd-pick-tier-${p.tier}`">{{ p.tier.toUpperCase() }}</span>
            </li>
          </ul>
        </section>

        <!-- FOOTER share -->
        <footer class="ctd-foot">
          <button type="button" class="ctd-share" @click="emit('open-signup')">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
              <polyline points="16 6 12 2 8 6" />
              <line x1="12" y1="2" x2="12" y2="15" />
            </svg>
            Share team draft card
          </button>
        </footer>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  getTeam,
  draftPicks2026,
  categoryTeamDraftGrades,
  type PlayerPosition,
} from '@/fixtures/categoriesLeague'
import { useDemoModal } from '@/composables/useDemoModal'

const props = defineProps<{ teamId: string }>()
const emit = defineEmits<{
  (e: 'close'): void
  (e: 'open-signup'): void
  (e: 'open-pick', pickOverall: number): void
}>()

const team = computed(() => getTeam(props.teamId))
const grade = computed(() => {
  const g = categoryTeamDraftGrades.find((x) => x.teamId === props.teamId)
  if (!g) throw new Error(`No draft grade for team ${props.teamId}`)
  return g
})

const teamPicks = computed(() =>
  draftPicks2026
    .filter((p) => p.draftedByTeamId === props.teamId)
    .sort((a, b) => a.round - b.round),
)

const gradeBand = computed<'aplus' | 'a' | 'b' | 'c' | 'd'>(() => {
  const g = grade.value.grade
  if (g === 'A+') return 'aplus'
  if (g.startsWith('A')) return 'a'
  if (g.startsWith('B')) return 'b'
  if (g.startsWith('C')) return 'c'
  return 'd'
})

function rowBg(val: number): string {
  if (val >= 25) return 'linear-gradient(to right, oklch(0.72 0.18 145 / 0.18), oklch(0.72 0.18 145 / 0.04))'
  if (val >= 5)  return 'linear-gradient(to right, oklch(0.72 0.18 145 / 0.10), oklch(0.72 0.18 145 / 0.02))'
  if (val <= -25)return 'linear-gradient(to right, oklch(0.70 0.27 350 / 0.18), oklch(0.70 0.27 350 / 0.04))'
  if (val <= -5) return 'linear-gradient(to right, oklch(0.70 0.27 350 / 0.10), oklch(0.70 0.27 350 / 0.02))'
  return 'oklch(0.12 0.015 90 / 0.6)'
}
function rowBorder(val: number): string {
  if (val >= 5)  return 'oklch(0.72 0.18 145 / 0.30)'
  if (val <= -5) return 'oklch(0.70 0.27 350 / 0.30)'
  return 'oklch(0.18 0.015 90)'
}
function valueColor(val: number): string {
  if (val >= 5)  return 'oklch(0.82 0.18 145)'
  if (val <= -5) return 'oklch(0.78 0.20 350)'
  return 'oklch(0.78 0.008 90)'
}

function posBg(pos: PlayerPosition): string {
  switch (pos) {
    case 'C':  return 'oklch(0.74 0.15 60 / 0.20)'
    case '1B': return 'oklch(0.68 0.18 245 / 0.20)'
    case '2B': return 'oklch(0.68 0.18 220 / 0.20)'
    case '3B': return 'oklch(0.65 0.20 25 / 0.20)'
    case 'SS': return 'oklch(0.65 0.20 295 / 0.20)'
    case 'OF': return 'oklch(0.72 0.18 145 / 0.20)'
    case 'DH': return 'oklch(0.78 0.18 92 / 0.20)'
    case 'SP': return 'oklch(0.72 0.18 195 / 0.22)'
    case 'RP': return 'oklch(0.70 0.27 350 / 0.20)'
  }
}
function posFg(pos: PlayerPosition): string {
  switch (pos) {
    case 'C':  return 'oklch(0.84 0.15 60)'
    case '1B': return 'oklch(0.82 0.18 245)'
    case '2B': return 'oklch(0.82 0.18 220)'
    case '3B': return 'oklch(0.80 0.20 25)'
    case 'SS': return 'oklch(0.80 0.20 295)'
    case 'OF': return 'oklch(0.84 0.18 145)'
    case 'DH': return 'oklch(0.88 0.18 92)'
    case 'SP': return 'oklch(0.84 0.18 195)'
    case 'RP': return 'oklch(0.82 0.22 350)'
  }
}

const dialogRef = ref<HTMLElement | null>(null)
const closeBtnRef = ref<HTMLElement | null>(null)

function onClose() {
  emit('close')
}
useDemoModal({ dialogRef, closeBtnRef, onClose })

// Reference props to satisfy lint without affecting reactivity.
void props
</script>

<style scoped>
.ctd-root {
  position: fixed;
  inset: 0;
  z-index: 215;
  display: grid;
  place-items: center;
  padding: 24px;
  --ink-1: oklch(0.97 0.005 90);
  --ink-2: oklch(0.78 0.008 90);
  --ink-3: oklch(0.55 0.010 90);
  --ink-4: oklch(0.40 0.012 90);
  --ink-5: oklch(0.20 0.015 90);
  --ink-6: oklch(0.14 0.018 90);
  --ink-7: oklch(0.10 0.015 90);
  --accent-primary:   oklch(0.78 0.18 92);
  --accent-secondary: oklch(0.70 0.27 350);
  --accent-tertiary:  oklch(0.72 0.18 195);
  font-family: 'Barlow', sans-serif;
  color: var(--ink-1);
}
.ctd-backdrop {
  position: absolute; inset: 0;
  background: oklch(0.04 0.014 90 / 0.80);
  opacity: 0;
  animation: ctd-fade-in 140ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
}
.ctd-dialog {
  position: relative;
  width: 100%;
  max-width: 780px;
  max-height: calc(100vh - 48px);
  overflow-y: auto;
  background: oklch(0.10 0.015 90);
  border: 1px solid oklch(0.22 0.015 90);
  border-radius: 18px;
  padding: 22px 26px 18px;
  box-shadow:
    0 28px 72px -28px oklch(0 0 0 / 0.85),
    inset 0 1px 0 oklch(1 0 0 / 0.04);
  opacity: 0;
  transform: scale(0.96) translateY(8px);
  animation: ctd-dialog-in 180ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
  animation-delay: 30ms;
}
@media (prefers-reduced-motion: reduce) {
  .ctd-backdrop, .ctd-dialog { animation: none; opacity: 1; transform: none; }
}
@keyframes ctd-fade-in { to { opacity: 1; } }
@keyframes ctd-dialog-in { to { opacity: 1; transform: scale(1) translateY(0); } }

.ctd-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  margin-bottom: 18px;
}
.ctd-head-id { display: flex; align-items: center; gap: 14px; min-width: 0; }
.ctd-avatar {
  width: 56px; height: 56px;
  border-radius: 14px;
  display: grid; place-items: center;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 1.2rem;
  color: oklch(0.12 0.012 90);
  flex-shrink: 0;
  overflow: hidden;
  box-shadow: 0 8px 24px -10px oklch(0 0 0 / 0.6);
}
.ctd-avatar-img { width: 100%; height: 100%; object-fit: cover; display: block; }
.ctd-title {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 1.55rem;
  line-height: 1.0;
  letter-spacing: -0.008em;
  margin: 0;
}
.ctd-sub {
  margin: 5px 0 0;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--ink-3);
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.ctd-sub-dot { color: var(--ink-4); }
.ctd-sub-owner { color: var(--ink-3); }

.ctd-close {
  width: 32px; height: 32px;
  display: grid; place-items: center;
  background: transparent;
  border: 1px solid oklch(0.22 0.015 90);
  border-radius: 8px;
  color: var(--ink-2);
  cursor: pointer;
  flex-shrink: 0;
  transition: color 160ms cubic-bezier(0.22, 1, 0.36, 1),
              border-color 160ms cubic-bezier(0.22, 1, 0.36, 1);
}
.ctd-close:hover { color: var(--ink-1); border-color: oklch(0.36 0.015 90); }
.ctd-close:focus-visible { outline: 2px solid var(--accent-primary); outline-offset: 2px; }

/* HERO */
.ctd-hero {
  position: relative;
  padding: 22px 24px 18px;
  border-radius: 14px;
  border: 1px solid oklch(0.20 0.015 90);
  background: oklch(0.12 0.015 90);
  margin-bottom: 22px;
  overflow: hidden;
}
.ctd-hero-glow {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 0;
}
.ctd-hero-aplus .ctd-hero-glow { background: radial-gradient(ellipse 60% 80% at 80% 50%, oklch(0.78 0.18 92 / 0.18), transparent 70%); }
.ctd-hero-a     .ctd-hero-glow { background: radial-gradient(ellipse 60% 80% at 80% 50%, oklch(0.78 0.18 145 / 0.10), transparent 70%); }
.ctd-hero-b     .ctd-hero-glow { background: radial-gradient(ellipse 60% 80% at 80% 50%, oklch(0.72 0.18 195 / 0.08), transparent 70%); }
.ctd-hero-c     .ctd-hero-glow { background: radial-gradient(ellipse 60% 80% at 80% 50%, oklch(0.70 0.27 350 / 0.08), transparent 70%); }
.ctd-hero-d     .ctd-hero-glow { background: radial-gradient(ellipse 60% 80% at 80% 50%, oklch(0.70 0.27 350 / 0.18), transparent 70%); }

.ctd-hero-chrome-top, .ctd-hero-chrome-bottom {
  position: absolute;
  left: 0; right: 0;
  height: 2px;
  background: linear-gradient(90deg,
    transparent,
    oklch(0.78 0.18 92 / 0.7) 30%,
    oklch(0.88 0.16 92) 50%,
    oklch(0.78 0.18 92 / 0.7) 70%,
    transparent);
  pointer-events: none;
  z-index: 2;
}
.ctd-hero-chrome-top { top: 0; }
.ctd-hero-chrome-bottom { bottom: 0; }
.ctd-hero-tape {
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 8px;
  background-image: repeating-linear-gradient(
    -45deg,
    oklch(0.78 0.18 92) 0 12px,
    oklch(0.16 0.018 90) 12px 24px
  );
  z-index: 2;
}
.ctd-hero-aplus { border-color: oklch(0.78 0.18 92 / 0.35); }
.ctd-hero-d     { border-color: oklch(0.70 0.27 350 / 0.30); }

.ctd-hero-row {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 22px;
  flex-wrap: wrap;
}
.ctd-hero-grade {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: clamp(5rem, 16vw, 7.5rem);
  line-height: 0.84;
  letter-spacing: -0.04em;
  margin: 0;
  flex-shrink: 0;
}
.ctd-hero-grade-aplus { color: oklch(0.88 0.18 92); filter: drop-shadow(0 0 28px oklch(0.78 0.18 92 / 0.55)); }
.ctd-hero-grade-a     { color: oklch(0.86 0.16 145); }
.ctd-hero-grade-b     { color: oklch(0.86 0.10 195); }
.ctd-hero-grade-c     { color: oklch(0.78 0.20 25); }
.ctd-hero-grade-d     { color: oklch(0.74 0.22 350); filter: drop-shadow(0 0 12px oklch(0.70 0.27 350 / 0.40)); }

.ctd-hero-meta { flex: 1; min-width: 220px; }
.ctd-hero-rank {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: 0.78rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--ink-3);
  margin: 0 0 6px;
}
.ctd-hero-headline {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 1.35rem;
  line-height: 1.05;
  letter-spacing: -0.005em;
  color: var(--ink-1);
  margin: 0 0 8px;
}
.ctd-hero-narrative {
  font-size: 0.98rem;
  line-height: 1.5;
  color: var(--ink-2);
  margin: 0;
  max-width: 50ch;
}

.ctd-hero-stats {
  position: relative;
  z-index: 1;
  list-style: none;
  padding: 14px 0 0;
  margin: 14px 0 0;
  display: inline-flex;
  align-items: center;
  gap: 18px;
  flex-wrap: wrap;
  border-top: 1px solid oklch(0.18 0.015 90);
  width: 100%;
}
.ctd-hero-stat { display: inline-flex; align-items: baseline; gap: 6px; }
.ctd-hero-stat-num {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 1.2rem;
  font-variant-numeric: tabular-nums;
  color: var(--ink-1);
  letter-spacing: -0.01em;
}
.ctd-hero-stat-num-pos { color: oklch(0.82 0.18 145); }
.ctd-hero-stat-num-neg { color: oklch(0.78 0.20 350); }
.ctd-hero-stat-label {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--ink-3);
}
.ctd-hero-stat-sep { width: 1px; height: 14px; background: var(--ink-5); display: inline-block; }

/* picks list */
.ctd-eyebrow {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--ink-3);
  margin: 0 0 10px;
}
.ctd-pick-rows {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.ctd-pick-row {
  display: grid;
  grid-template-columns: 36px 36px minmax(0, 1fr) auto auto;
  align-items: center;
  gap: 12px;
  padding: 9px 12px;
  border-radius: 10px;
  border: 1px solid oklch(0.18 0.015 90);
  cursor: pointer;
  transition: transform 160ms cubic-bezier(0.22, 1, 0.36, 1);
}
@media (prefers-reduced-motion: no-preference) {
  .ctd-pick-row:hover { transform: translateY(-1px); }
}
.ctd-pick-row:active { transform: scale(0.99); transition-duration: 100ms; }
.ctd-pick-row:focus-visible { outline: 2px solid var(--accent-primary); outline-offset: 2px; }
.ctd-pick-round {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 0.88rem;
  letter-spacing: 0.04em;
  color: var(--ink-3);
  text-align: center;
}
.ctd-pick-pos {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 0.74rem;
  letter-spacing: 0.06em;
  padding: 4px 0;
  border-radius: 6px;
  text-align: center;
  width: 36px;
}
.ctd-pick-text { min-width: 0; }
.ctd-pick-name {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: 0.98rem;
  color: var(--ink-1);
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ctd-pick-meta {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.70rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ink-4);
  margin: 1px 0 0;
}
.ctd-pick-value {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 1.05rem;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.005em;
  min-width: 42px;
  text-align: right;
}
.ctd-pick-tier {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: 0.64rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  padding: 4px 8px;
  border-radius: 999px;
  border: 1px solid transparent;
  min-width: 80px;
  text-align: center;
}
.ctd-pick-tier-jackpot   { color: oklch(0.10 0.012 90); background: oklch(0.82 0.18 145); }
.ctd-pick-tier-steal     { color: oklch(0.86 0.18 145); background: oklch(0.72 0.18 145 / 0.14); border-color: oklch(0.72 0.18 145 / 0.40); }
.ctd-pick-tier-hit       { color: oklch(0.86 0.18 145); background: oklch(0.72 0.18 145 / 0.08); border-color: oklch(0.72 0.18 145 / 0.25); }
.ctd-pick-tier-solid     { color: var(--ink-2); background: oklch(0.18 0.015 90); border-color: oklch(0.22 0.015 90); }
.ctd-pick-tier-miss      { color: oklch(0.82 0.20 350); background: oklch(0.70 0.27 350 / 0.08); border-color: oklch(0.70 0.27 350 / 0.25); }
.ctd-pick-tier-bust      { color: oklch(0.82 0.20 350); background: oklch(0.70 0.27 350 / 0.14); border-color: oklch(0.70 0.27 350 / 0.40); }
.ctd-pick-tier-disaster  { color: oklch(0.10 0.012 90); background: oklch(0.74 0.22 350); }

.ctd-foot {
  display: flex;
  justify-content: flex-end;
  margin-top: 18px;
  padding-top: 14px;
  border-top: 1px solid oklch(0.16 0.015 90);
}
.ctd-share {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: 0.82rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ink-2);
  background: transparent;
  border: 1px solid oklch(0.28 0.015 90);
  padding: 8px 14px;
  border-radius: 999px;
  cursor: pointer;
  transition: color 160ms cubic-bezier(0.22, 1, 0.36, 1),
              border-color 160ms cubic-bezier(0.22, 1, 0.36, 1);
}
.ctd-share:hover { color: var(--ink-1); border-color: oklch(0.44 0.015 90); }
.ctd-share:focus-visible { outline: 2px solid var(--accent-primary); outline-offset: 2px; }
.ctd-share:active { transform: scale(0.97); transition-duration: 100ms; }

@media (max-width: 560px) {
  .ctd-dialog { padding: 18px 16px; }
  .ctd-pick-row {
    grid-template-columns: 28px 32px minmax(0, 1fr) auto;
    grid-template-rows: auto auto;
    gap: 8px 10px;
  }
  .ctd-pick-tier {
    grid-column: 2 / -1;
    grid-row: 2;
    justify-self: start;
    min-width: 0;
  }
  .ctd-hero-grade { font-size: clamp(4.5rem, 22vw, 6rem); }
}
</style>
