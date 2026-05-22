<template>
  <Teleport to="body">
    <div class="tdm-root" role="presentation">
      <div class="tdm-backdrop" @click="onClose" aria-hidden="true"></div>
      <div
        ref="dialogRef"
        class="tdm-dialog"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="`tdm-title-${team.id}`"
      >
        <!-- HEADER -->
        <header class="tdm-head">
          <div class="tdm-head-id">
            <div
              class="tdm-avatar"
              :style="{ background: `linear-gradient(135deg, ${team.avatarColor})` }"
            >
              <img v-if="team.avatarUrl" :src="team.avatarUrl" class="tdm-avatar-img" alt="" />
              <span v-else>{{ team.ownerInitials }}</span>
            </div>
            <div>
              <h2 :id="`tdm-title-${team.id}`" class="tdm-title">{{ team.name }}</h2>
              <p class="tdm-sub">Draft Breakdown
                <span class="tdm-sub-dot" aria-hidden="true">·</span>
                <span class="tdm-sub-owner">{{ team.ownerName }}</span>
              </p>
            </div>
          </div>
          <button
            ref="closeBtnRef"
            type="button"
            class="tdm-close"
            aria-label="Close team draft breakdown"
            @click="onClose"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <line x1="5" y1="5" x2="19" y2="19" />
              <line x1="19" y1="5" x2="5" y2="19" />
            </svg>
          </button>
        </header>

        <!-- HERO grade -->
        <section class="tdm-hero" :class="`tdm-hero-${gradeBand}`">
          <span class="tdm-hero-glow" aria-hidden="true"></span>
          <span v-if="gradeBand === 'aplus'" class="tdm-hero-chrome-top" aria-hidden="true"></span>
          <span v-if="gradeBand === 'aplus'" class="tdm-hero-chrome-bottom" aria-hidden="true"></span>
          <span v-if="gradeBand === 'd'" class="tdm-hero-tape" aria-hidden="true"></span>
          <div class="tdm-hero-row">
            <p class="tdm-hero-grade" :class="`tdm-hero-grade-${gradeBand}`" :aria-label="`Draft grade ${grade.grade}`">{{ grade.grade }}</p>
            <div class="tdm-hero-meta">
              <p class="tdm-hero-rank">#{{ grade.rank }} of 10</p>
              <p class="tdm-hero-editorial">{{ grade.editorialCopy }}</p>
            </div>
          </div>
          <ul class="tdm-hero-stats" role="list" aria-label="Draft outcome counts">
            <li class="tdm-hero-stat">
              <span class="tdm-hero-stat-num tdm-hero-stat-num-pos">{{ grade.steals }}</span>
              <span class="tdm-hero-stat-label">Steals</span>
            </li>
            <li class="tdm-hero-stat-sep" aria-hidden="true"></li>
            <li class="tdm-hero-stat">
              <span class="tdm-hero-stat-num">{{ grade.hits }}</span>
              <span class="tdm-hero-stat-label">Hits</span>
            </li>
            <li class="tdm-hero-stat-sep" aria-hidden="true"></li>
            <li class="tdm-hero-stat">
              <span class="tdm-hero-stat-num">{{ grade.misses }}</span>
              <span class="tdm-hero-stat-label">Misses</span>
            </li>
            <li class="tdm-hero-stat-sep" aria-hidden="true"></li>
            <li class="tdm-hero-stat">
              <span class="tdm-hero-stat-num tdm-hero-stat-num-neg">{{ grade.busts }}</span>
              <span class="tdm-hero-stat-label">Busts</span>
            </li>
          </ul>
        </section>

        <!-- DRAFT PICKS heat-map -->
        <section class="tdm-picks" aria-labelledby="tdm-picks-label">
          <p id="tdm-picks-label" class="tdm-eyebrow">All ten picks</p>
          <ul class="tdm-pick-rows" role="list">
            <li
              v-for="p in teamPicks"
              :key="p.pickNumber"
              class="tdm-pick-row"
              :style="{ background: rowBg(p.valueScore), borderColor: rowBorder(p.valueScore) }"
            >
              <span class="tdm-pick-round">R{{ p.round }}</span>
              <span class="tdm-pick-glyph" :style="{ background: glyphBg(p.position), color: glyphFg(p.position) }">
                {{ p.position }}
              </span>
              <div class="tdm-pick-text">
                <p class="tdm-pick-name">{{ p.playerName }}</p>
                <p class="tdm-pick-tier">{{ p.tierTransition }}</p>
              </div>
              <span class="tdm-pick-value" :style="{ color: valueColor(p.valueScore) }">
                {{ p.valueScore > 0 ? '+' : '' }}{{ p.valueScore }}
              </span>
              <span class="tdm-pick-verdict" :class="`tdm-pick-verdict-${p.verdict.toLowerCase()}`">
                {{ p.verdict }}
              </span>
            </li>
          </ul>
        </section>

        <!-- FOOTER share CTA -->
        <footer class="tdm-foot">
          <button type="button" class="tdm-share" @click="emit('open-signup')">
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
import { draftPicks, getTeam, teamDraftGrades, type PlayerPosition } from '@/fixtures/pillarsLeague'
import { useDemoModal } from '@/composables/useDemoModal'

const props = defineProps<{ teamId: string }>()
const emit = defineEmits<{ (e: 'close'): void; (e: 'open-signup'): void }>()

const team = computed(() => getTeam(props.teamId))
const grade = computed(() => teamDraftGrades.find(g => g.teamId === props.teamId)!)

const teamPicks = computed(() =>
  draftPicks
    .filter(p => p.draftedByTeamId === props.teamId)
    .sort((a, b) => a.round - b.round)
)

const gradeBand = computed<'aplus' | 'a' | 'b' | 'c' | 'd'>(() => {
  const g = grade.value.grade
  if (g === 'A+') return 'aplus'
  if (g.startsWith('A')) return 'a'
  if (g.startsWith('B')) return 'b'
  if (g.startsWith('C')) return 'c'
  return 'd'
})

function glyphBg(pos: PlayerPosition) {
  switch (pos) {
    case 'QB': return 'oklch(0.65 0.20 25 / 0.18)'
    case 'RB': return 'oklch(0.72 0.18 145 / 0.18)'
    case 'WR': return 'oklch(0.68 0.18 245 / 0.20)'
    case 'TE': return 'oklch(0.74 0.15 60 / 0.20)'
    case 'K':  return 'oklch(0.55 0.02 270 / 0.22)'
    case 'DST':return 'oklch(0.40 0.02 270 / 0.30)'
  }
}
function glyphFg(pos: PlayerPosition) {
  switch (pos) {
    case 'QB': return 'oklch(0.78 0.20 25)'
    case 'RB': return 'oklch(0.82 0.18 145)'
    case 'WR': return 'oklch(0.80 0.18 245)'
    case 'TE': return 'oklch(0.82 0.15 60)'
    case 'K':  return 'oklch(0.80 0.02 90)'
    case 'DST':return 'oklch(0.80 0.02 90)'
  }
}

function rowBg(val: number) {
  if (val >= 25) return 'linear-gradient(to right, oklch(0.72 0.18 145 / 0.18), oklch(0.72 0.18 145 / 0.04))'
  if (val >= 5)  return 'linear-gradient(to right, oklch(0.72 0.18 145 / 0.10), oklch(0.72 0.18 145 / 0.02))'
  if (val <= -25)return 'linear-gradient(to right, oklch(0.70 0.27 350 / 0.18), oklch(0.70 0.27 350 / 0.04))'
  if (val <= -5) return 'linear-gradient(to right, oklch(0.70 0.27 350 / 0.10), oklch(0.70 0.27 350 / 0.02))'
  return 'oklch(0.12 0.015 90 / 0.6)'
}
function rowBorder(val: number) {
  if (val >= 5)  return 'oklch(0.72 0.18 145 / 0.30)'
  if (val <= -5) return 'oklch(0.70 0.27 350 / 0.30)'
  return 'oklch(0.18 0.015 90)'
}
function valueColor(val: number) {
  if (val >= 5)  return 'oklch(0.82 0.18 145)'
  if (val <= -5) return 'oklch(0.78 0.20 350)'
  return 'oklch(0.78 0.008 90)'
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
.tdm-root {
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
.tdm-backdrop {
  position: absolute;
  inset: 0;
  background: oklch(0.04 0.014 90 / 0.80);
  opacity: 0;
  animation: tdm-fade-in 140ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
}
.tdm-dialog {
  position: relative;
  width: 100%;
  max-width: 720px;
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
  animation: tdm-dialog-in 180ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
  animation-delay: 30ms;
}
@media (prefers-reduced-motion: reduce) {
  .tdm-backdrop, .tdm-dialog { animation: none; opacity: 1; transform: none; }
}
@keyframes tdm-fade-in { to { opacity: 1; } }
@keyframes tdm-dialog-in { to { opacity: 1; transform: scale(1) translateY(0); } }

.tdm-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  margin-bottom: 18px;
}
.tdm-head-id { display: flex; align-items: center; gap: 14px; min-width: 0; }
.tdm-avatar {
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
.tdm-avatar-img { width: 100%; height: 100%; object-fit: cover; display: block; }
.tdm-title {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 1.55rem;
  line-height: 1.0;
  letter-spacing: -0.008em;
  color: var(--ink-1);
  margin: 0;
}
.tdm-sub {
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
.tdm-sub-dot { color: var(--ink-4); }
.tdm-sub-owner { color: var(--ink-3); }

.tdm-close {
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
.tdm-close:hover { color: var(--ink-1); border-color: oklch(0.36 0.015 90); }
.tdm-close:focus-visible { outline: 2px solid var(--accent-primary); outline-offset: 2px; }

/* HERO grade */
.tdm-hero {
  position: relative;
  padding: 22px 24px 18px;
  border-radius: 14px;
  border: 1px solid oklch(0.20 0.015 90);
  background: oklch(0.12 0.015 90);
  margin-bottom: 22px;
  overflow: hidden;
}
.tdm-hero-glow {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 0;
}
.tdm-hero-aplus .tdm-hero-glow {
  background: radial-gradient(ellipse 60% 80% at 80% 50%, oklch(0.78 0.18 92 / 0.18), transparent 70%);
}
.tdm-hero-a .tdm-hero-glow {
  background: radial-gradient(ellipse 60% 80% at 80% 50%, oklch(0.78 0.18 145 / 0.10), transparent 70%);
}
.tdm-hero-b .tdm-hero-glow {
  background: radial-gradient(ellipse 60% 80% at 80% 50%, oklch(0.72 0.18 195 / 0.08), transparent 70%);
}
.tdm-hero-c .tdm-hero-glow {
  background: radial-gradient(ellipse 60% 80% at 80% 50%, oklch(0.70 0.27 350 / 0.08), transparent 70%);
}
.tdm-hero-d .tdm-hero-glow {
  background: radial-gradient(ellipse 60% 80% at 80% 50%, oklch(0.70 0.27 350 / 0.18), transparent 70%);
}

/* A+ chrome treatment: gold top + bottom borders */
.tdm-hero-chrome-top, .tdm-hero-chrome-bottom {
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
.tdm-hero-chrome-top { top: 0; }
.tdm-hero-chrome-bottom { bottom: 0; }

/* D-band disaster tape: diagonal yellow-and-black stripe along the top edge */
.tdm-hero-tape {
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
.tdm-hero-aplus { border-color: oklch(0.78 0.18 92 / 0.35); }
.tdm-hero-d     { border-color: oklch(0.70 0.27 350 / 0.30); }

.tdm-hero-row {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 22px;
  flex-wrap: wrap;
}
.tdm-hero-grade {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: clamp(5rem, 16vw, 7.5rem);
  line-height: 0.84;
  letter-spacing: -0.04em;
  margin: 0;
  flex-shrink: 0;
}
.tdm-hero-grade-aplus {
  color: oklch(0.88 0.18 92);
  filter: drop-shadow(0 0 28px oklch(0.78 0.18 92 / 0.55));
}
.tdm-hero-grade-a {
  color: oklch(0.86 0.16 145);
}
.tdm-hero-grade-b {
  color: oklch(0.86 0.10 195);
}
.tdm-hero-grade-c {
  color: oklch(0.78 0.20 25);
}
.tdm-hero-grade-d {
  color: oklch(0.74 0.22 350);
  filter: drop-shadow(0 0 12px oklch(0.70 0.27 350 / 0.40));
}

.tdm-hero-meta { flex: 1; min-width: 200px; }
.tdm-hero-rank {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: 0.78rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--ink-3);
  margin: 0 0 6px;
}
.tdm-hero-editorial {
  font-size: 0.98rem;
  line-height: 1.5;
  color: var(--ink-2);
  margin: 0;
  max-width: 42ch;
}

.tdm-hero-stats {
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
.tdm-hero-stat {
  display: inline-flex;
  align-items: baseline;
  gap: 6px;
}
.tdm-hero-stat-num {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 1.2rem;
  font-variant-numeric: tabular-nums;
  color: var(--ink-1);
  letter-spacing: -0.01em;
}
.tdm-hero-stat-num-pos { color: oklch(0.82 0.18 145); }
.tdm-hero-stat-num-neg { color: oklch(0.78 0.20 350); }
.tdm-hero-stat-label {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--ink-3);
}
.tdm-hero-stat-sep {
  width: 1px; height: 14px;
  background: var(--ink-5);
  display: inline-block;
}

/* picks heat map */
.tdm-eyebrow {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--ink-3);
  margin: 0 0 10px;
}
.tdm-pick-rows {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.tdm-pick-row {
  display: grid;
  grid-template-columns: 36px 36px minmax(0, 1fr) auto auto;
  align-items: center;
  gap: 12px;
  padding: 9px 12px;
  border-radius: 10px;
  border: 1px solid oklch(0.18 0.015 90);
}
.tdm-pick-round {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 0.88rem;
  letter-spacing: 0.04em;
  color: var(--ink-3);
  text-align: center;
}
.tdm-pick-glyph {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 0.74rem;
  letter-spacing: 0.06em;
  padding: 4px 0;
  border-radius: 6px;
  text-align: center;
  width: 36px;
}
.tdm-pick-text { min-width: 0; }
.tdm-pick-name {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: 0.98rem;
  color: var(--ink-1);
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.tdm-pick-tier {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.10em;
  text-transform: uppercase;
  color: var(--ink-4);
  margin: 1px 0 0;
}
.tdm-pick-value {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 1.05rem;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.005em;
  min-width: 42px;
  text-align: right;
}
.tdm-pick-verdict {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: 0.66rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  padding: 4px 8px;
  border-radius: 999px;
  border: 1px solid transparent;
  min-width: 78px;
  text-align: center;
}
.tdm-pick-verdict-jackpot {
  color: oklch(0.10 0.012 90);
  background: oklch(0.82 0.18 145);
}
.tdm-pick-verdict-steal {
  color: oklch(0.86 0.18 145);
  background: oklch(0.72 0.18 145 / 0.14);
  border-color: oklch(0.72 0.18 145 / 0.40);
}
.tdm-pick-verdict-hit {
  color: oklch(0.86 0.18 145);
  background: oklch(0.72 0.18 145 / 0.08);
  border-color: oklch(0.72 0.18 145 / 0.25);
}
.tdm-pick-verdict-solid {
  color: var(--ink-2);
  background: oklch(0.18 0.015 90);
  border-color: oklch(0.22 0.015 90);
}
.tdm-pick-verdict-miss {
  color: oklch(0.82 0.20 350);
  background: oklch(0.70 0.27 350 / 0.08);
  border-color: oklch(0.70 0.27 350 / 0.25);
}
.tdm-pick-verdict-bust {
  color: oklch(0.82 0.20 350);
  background: oklch(0.70 0.27 350 / 0.14);
  border-color: oklch(0.70 0.27 350 / 0.40);
}
.tdm-pick-verdict-disaster {
  color: oklch(0.10 0.012 90);
  background: oklch(0.74 0.22 350);
}

.tdm-foot {
  display: flex;
  justify-content: flex-end;
  margin-top: 18px;
  padding-top: 14px;
  border-top: 1px solid oklch(0.16 0.015 90);
}
.tdm-share {
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
.tdm-share:hover { color: var(--ink-1); border-color: oklch(0.44 0.015 90); }
.tdm-share:focus-visible { outline: 2px solid var(--accent-primary); outline-offset: 2px; }

@media (max-width: 560px) {
  .tdm-dialog { padding: 18px 16px; }
  .tdm-pick-row {
    grid-template-columns: 28px 32px minmax(0, 1fr) auto;
    grid-template-rows: auto auto;
    gap: 8px 10px;
  }
  .tdm-pick-verdict {
    grid-column: 2 / -1;
    grid-row: 2;
    justify-self: start;
    min-width: 0;
  }
  .tdm-hero-grade { font-size: clamp(4.5rem, 22vw, 6rem); }
}
</style>
