<template>
  <Teleport to="body">
    <div class="pp-root" role="presentation">
      <div class="pp-backdrop" @click="onClose" aria-hidden="true"></div>
      <div
        ref="dialogRef"
        class="pp-dialog"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="`pp-title-${pick.pickNumber}`"
      >
        <!-- HEADER: position glyph + name + round/pick + close -->
        <header class="pp-head">
          <div class="pp-head-id">
            <div class="pp-glyph" :style="{ background: glyphBg(pick.position) }" aria-hidden="true">
              <!-- inline position SVG -->
              <svg v-if="pick.position === 'QB'" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <ellipse cx="12" cy="12" rx="8" ry="5" transform="rotate(-30 12 12)"/>
                <line x1="8" y1="14" x2="16" y2="10"/>
                <line x1="10" y1="13" x2="11" y2="14"/>
                <line x1="13" y1="11" x2="14" y2="12"/>
              </svg>
              <svg v-else-if="pick.position === 'RB'" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="13" cy="4" r="2"/>
                <path d="M10 22l2-7-3-3 1-5 5 3 3 2"/>
                <path d="M9 11l-4 2"/>
              </svg>
              <svg v-else-if="pick.position === 'WR'" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="4" r="2"/>
                <path d="M6 22l3-9 3-3 4 3 3-2"/>
                <path d="M8 13l-2-4"/>
              </svg>
              <svg v-else-if="pick.position === 'TE'" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="5" r="2"/>
                <path d="M8 22l2-8 2-3 2 3 2 8"/>
                <line x1="7" y1="13" x2="17" y2="13"/>
              </svg>
              <svg v-else-if="pick.position === 'K'" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="5" r="2"/>
                <path d="M9 22l3-7 4 2 3-5"/>
                <path d="M12 15l-3 5"/>
              </svg>
              <svg v-else width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-4z"/>
              </svg>
            </div>
            <div class="pp-head-text">
              <h2 :id="`pp-title-${pick.pickNumber}`" class="pp-title">{{ pick.playerName }}</h2>
              <p class="pp-sub">
                <span class="pp-pos-pill" :style="{ background: glyphTint(pick.position), color: glyphFg(pick.position) }">
                  {{ pick.position }}{{ pick.positionRankAtDraft }}
                </span>
                <span class="pp-sub-dot" aria-hidden="true">·</span>
                Round {{ pick.round }}
                <span class="pp-sub-dot" aria-hidden="true">·</span>
                Pick #{{ pick.pickNumber }}
              </p>
            </div>
          </div>
          <button
            ref="closeBtnRef"
            type="button"
            class="pp-close"
            aria-label="Close player detail"
            @click="onClose"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <line x1="5" y1="5" x2="19" y2="19" />
              <line x1="19" y1="5" x2="5" y2="19" />
            </svg>
          </button>
        </header>

        <!-- HERO value score -->
        <section class="pp-hero" :aria-label="`Value score ${pick.valueScore}`">
          <span class="pp-hero-glow" :style="{ background: heroGlow }" aria-hidden="true"></span>
          <p class="pp-hero-eyebrow">Value over expectation</p>
          <p class="pp-hero-value" :style="{ color: valueColor }">
            {{ pick.valueScore > 0 ? '+' : '' }}{{ pick.valueScore }}
          </p>
          <p class="pp-hero-verdict" :style="{ color: valueColor }">{{ verdictLabel }}</p>
        </section>

        <!-- Editorial line -->
        <p class="pp-editorial">{{ editorial }}</p>

        <!-- Inline stats strip -->
        <ul class="pp-stats" role="list">
          <li class="pp-stats-item">
            <span class="pp-stats-num">{{ pick.seasonPoints.toFixed(1) }}</span>
            <span class="pp-stats-label">Season pts</span>
          </li>
          <li class="pp-stats-sep" aria-hidden="true"></li>
          <li class="pp-stats-item">
            <span class="pp-stats-num">{{ pick.expectedPoints.toFixed(1) }}</span>
            <span class="pp-stats-label">Expected</span>
          </li>
          <li class="pp-stats-sep" aria-hidden="true"></li>
          <li class="pp-stats-item">
            <span class="pp-stats-num pp-stats-num-mono">{{ pick.tierTransition }}</span>
            <span class="pp-stats-label">Tier</span>
          </li>
        </ul>

        <!-- Drafted by -->
        <footer class="pp-foot">
          <div class="pp-by">
            <div
              class="pp-by-avatar"
              :style="{ background: `linear-gradient(135deg, ${team.avatarColor})` }"
            >
              <img v-if="team.avatarUrl" :src="team.avatarUrl" class="pp-by-img" alt="" />
              <span v-else>{{ team.ownerInitials }}</span>
            </div>
            <div class="pp-by-text">
              <p class="pp-by-label">Drafted by</p>
              <p class="pp-by-name">{{ team.name }}</p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { draftPicks, getTeam, type PlayerPosition } from '@/fixtures/pillarsLeague'

const props = defineProps<{ pickNumber: number }>()
const emit = defineEmits<{ (e: 'close'): void }>()

const pick = computed(() => draftPicks.find(p => p.pickNumber === props.pickNumber)!)
const team = computed(() => getTeam(pick.value.draftedByTeamId))

/* Position glyph colors (NOT yellow — yellow is reserved for my-team) */
function glyphBg(pos: PlayerPosition) {
  switch (pos) {
    case 'QB': return 'oklch(0.65 0.20 25 / 0.18)'
    case 'RB': return 'oklch(0.72 0.18 145 / 0.18)'
    case 'WR': return 'oklch(0.68 0.18 245 / 0.18)'
    case 'TE': return 'oklch(0.74 0.15 60 / 0.18)'
    case 'K':  return 'oklch(0.55 0.02 270 / 0.22)'
    case 'DST':return 'oklch(0.40 0.02 270 / 0.30)'
  }
}
function glyphTint(pos: PlayerPosition) {
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

const verdictLabel = computed(() => {
  const v = pick.value.verdict
  return v.charAt(0) + v.slice(1).toLowerCase()
})

const valueColor = computed(() => {
  const v = pick.value.valueScore
  if (v >= 25) return 'oklch(0.78 0.18 145)'   // green: positive
  if (v >= 5)  return 'oklch(0.78 0.18 145)'
  if (v <= -25)return 'oklch(0.70 0.27 350)'   // magenta: negative
  if (v <= -5) return 'oklch(0.70 0.27 350)'
  return 'oklch(0.78 0.008 90)'                 // neutral
})

const heroGlow = computed(() => {
  const v = pick.value.valueScore
  if (v >= 5)  return 'radial-gradient(ellipse 70% 80% at 50% 50%, oklch(0.78 0.18 145 / 0.14), transparent 70%)'
  if (v <= -5) return 'radial-gradient(ellipse 70% 80% at 50% 50%, oklch(0.70 0.27 350 / 0.14), transparent 70%)'
  return 'radial-gradient(ellipse 70% 80% at 50% 50%, oklch(0.78 0.008 90 / 0.06), transparent 70%)'
})

// Compute the "ended at" position rank from actual season points among same-position players.
const actualPositionRank = computed(() => {
  const samePos = draftPicks.filter(p => p.position === pick.value.position)
  const sorted = [...samePos].sort((a, b) => b.seasonPoints - a.seasonPoints)
  return sorted.findIndex(p => p.pickNumber === pick.value.pickNumber) + 1
})

const editorial = computed(() => {
  const p = pick.value
  const pos = p.position
  const teamName = team.value.name
  const start = `${pos}${p.positionRankAtDraft}`
  const end = `${pos}${actualPositionRank.value}`
  let descriptor: string
  switch (p.verdict) {
    case 'JACKPOT':
      descriptor = 'A complete jackpot. The pick of the draft so far.'
      break
    case 'STEAL':
      descriptor = 'A genuine steal. Far above where they were drafted.'
      break
    case 'HIT':
      descriptor = 'Solid hit. Beat the projection and held a starting spot.'
      break
    case 'SOLID':
      descriptor = 'About what you would expect. No regrets, no fireworks.'
      break
    case 'MISS':
      descriptor = 'Underperformed the slot. Workable but not what you wanted.'
      break
    case 'BUST':
      descriptor = 'A real bust. Did not look like the player they were drafted as.'
      break
    case 'DISASTER':
      descriptor = 'A full-on disaster. Cost the team weeks at a roster spot.'
      break
  }
  return `Drafted by ${teamName} at pick ${p.pickNumber}. Came off the board as ${start}, currently sits as ${end}. ${descriptor}`
})

/* Focus management + trap */
const dialogRef = ref<HTMLElement | null>(null)
const closeBtnRef = ref<HTMLElement | null>(null)

function onClose() {
  emit('close')
}

useDemoModal({ dialogRef, closeBtnRef, onClose })
</script>

<style scoped>
.pp-root {
  position: fixed;
  inset: 0;
  z-index: 220;
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
.pp-backdrop {
  position: absolute;
  inset: 0;
  background: oklch(0.04 0.014 90 / 0.80);
  opacity: 0;
  animation: pp-fade-in 140ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
}
.pp-dialog {
  position: relative;
  width: 100%;
  max-width: 520px;
  max-height: calc(100vh - 48px);
  overflow-y: auto;
  background: oklch(0.10 0.015 90);
  border: 1px solid oklch(0.22 0.015 90);
  border-radius: 18px;
  padding: 22px 26px 20px;
  box-shadow:
    0 28px 72px -28px oklch(0 0 0 / 0.85),
    inset 0 1px 0 oklch(1 0 0 / 0.04);
  opacity: 0;
  transform: scale(0.96) translateY(8px);
  animation: pp-dialog-in 180ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
  animation-delay: 30ms;
}
@media (prefers-reduced-motion: reduce) {
  .pp-backdrop, .pp-dialog { animation: none; opacity: 1; transform: none; }
}
@keyframes pp-fade-in { to { opacity: 1; } }
@keyframes pp-dialog-in { to { opacity: 1; transform: scale(1) translateY(0); } }

.pp-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  margin-bottom: 14px;
}
.pp-head-id {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}
.pp-glyph {
  width: 48px;
  height: 48px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  color: var(--ink-1);
  flex-shrink: 0;
  border: 1px solid oklch(0.22 0.015 90);
}
.pp-head-text { min-width: 0; }
.pp-title {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 1.45rem;
  line-height: 1.0;
  letter-spacing: -0.008em;
  color: var(--ink-1);
  margin: 0;
}
.pp-sub {
  margin: 5px 0 0;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--ink-3);
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}
.pp-pos-pill {
  display: inline-flex;
  align-items: center;
  padding: 2px 7px;
  border-radius: 999px;
  font-weight: 800;
  letter-spacing: 0.08em;
  font-size: 0.72rem;
}
.pp-sub-dot { color: var(--ink-4); }

.pp-close {
  width: 32px;
  height: 32px;
  display: grid;
  place-items: center;
  background: transparent;
  border: 1px solid oklch(0.22 0.015 90);
  border-radius: 8px;
  color: var(--ink-2);
  cursor: pointer;
  flex-shrink: 0;
  transition: color 160ms cubic-bezier(0.22, 1, 0.36, 1),
              border-color 160ms cubic-bezier(0.22, 1, 0.36, 1);
}
.pp-close:hover { color: var(--ink-1); border-color: oklch(0.36 0.015 90); }
.pp-close:focus-visible { outline: 2px solid var(--accent-primary); outline-offset: 2px; }

.pp-hero {
  position: relative;
  padding: 14px 0 4px;
  text-align: left;
  margin-bottom: 4px;
}
.pp-hero-glow {
  position: absolute;
  inset: -10px -20px -10px -20px;
  pointer-events: none;
  z-index: 0;
}
.pp-hero-eyebrow {
  position: relative; z-index: 1;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.74rem; font-weight: 800;
  letter-spacing: 0.16em; text-transform: uppercase;
  color: var(--ink-3);
  margin: 0 0 4px;
}
.pp-hero-value {
  position: relative; z-index: 1;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: clamp(4.5rem, 14vw, 6rem);
  line-height: 0.9;
  letter-spacing: -0.022em;
  font-variant-numeric: tabular-nums;
  margin: 0;
}
.pp-hero-verdict {
  position: relative; z-index: 1;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: 0.92rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  margin: 4px 0 0;
}

.pp-editorial {
  font-size: 0.98rem;
  line-height: 1.55;
  color: var(--ink-2);
  margin: 14px 0 18px;
  max-width: 56ch;
}

.pp-stats {
  list-style: none;
  padding: 0;
  margin: 0 0 18px;
  display: inline-flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
}
.pp-stats-item {
  display: inline-flex;
  flex-direction: column;
  gap: 2px;
}
.pp-stats-num {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 1.05rem;
  color: var(--ink-1);
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.005em;
}
.pp-stats-num-mono {
  font-size: 0.86rem;
  letter-spacing: 0.04em;
}
.pp-stats-label {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--ink-3);
}
.pp-stats-sep {
  width: 1px; height: 18px;
  background: var(--ink-5);
  display: inline-block;
}

.pp-foot {
  padding-top: 14px;
  border-top: 1px solid oklch(0.16 0.015 90);
}
.pp-by {
  display: inline-flex;
  align-items: center;
  gap: 12px;
}
.pp-by-avatar {
  width: 40px; height: 40px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  color: oklch(0.12 0.012 90);
  overflow: hidden;
}
.pp-by-img { width: 100%; height: 100%; object-fit: cover; display: block; }
.pp-by-label {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--ink-3);
  margin: 0;
}
.pp-by-name {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 1rem;
  color: var(--ink-1);
  margin: 2px 0 0;
}

@media (max-width: 480px) {
  .pp-dialog { padding: 18px 18px 16px; }
  .pp-title { font-size: 1.25rem; }
  .pp-hero-value { font-size: clamp(3.5rem, 18vw, 5rem); }
}
</style>
