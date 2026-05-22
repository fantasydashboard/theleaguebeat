<template>
  <Teleport to="body">
    <div class="td-root" role="presentation">
      <div class="td-backdrop" @click="onClose" aria-hidden="true"></div>
      <div
        ref="dialogRef"
        class="td-dialog"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="`td-title-${team.id}`"
      >
        <!-- Header -->
        <header class="td-head">
          <div class="td-head-id">
            <div
              class="td-avatar"
              :style="{ background: `linear-gradient(135deg, ${team.avatarColor})` }"
            >
              <img v-if="team.avatarUrl" :src="team.avatarUrl" class="td-avatar-img" alt="" />
              <span v-else>{{ team.ownerInitials }}</span>
            </div>
            <div class="td-head-text">
              <h2 :id="`td-title-${team.id}`" class="td-title">{{ team.name }}</h2>
              <p class="td-sub">
                Power Rank <strong>#{{ ranking.rank }}</strong>
                <span class="td-sub-dot" aria-hidden="true">·</span>
                <span>Cat record <strong>{{ standing.catWins }}-{{ standing.catLosses }}-{{ standing.catTies }}</strong></span>
                <span class="td-sub-dot" aria-hidden="true">·</span>
                <span class="td-sub-owner">{{ team.ownerName }}</span>
              </p>
            </div>
          </div>
          <button
            ref="closeBtnRef"
            type="button"
            class="td-close"
            aria-label="Close team detail"
            @click="onClose"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <line x1="5" y1="5" x2="19" y2="19" />
              <line x1="19" y1="5" x2="5" y2="19" />
            </svg>
          </button>
        </header>

        <!-- Scene-setting sentence (magazine-style, inline-bold numbers) -->
        <p class="td-scene" v-html="sceneSentence"></p>

        <!-- Power score breakdown — 6 factor bars -->
        <section class="td-breakdown" aria-labelledby="td-breakdown-label">
          <p id="td-breakdown-label" class="td-eyebrow">Power Score Breakdown</p>
          <ul class="td-rows" role="list">
            <li v-for="f in factorDefs" :key="f.id" class="td-row">
              <span class="td-row-swatch" aria-hidden="true" :style="{ background: f.color }"></span>
              <span class="td-row-name">{{ f.label }}</span>
              <div class="td-bar" role="img" :aria-label="`${f.label} ${factors[f.id]} out of 100`">
                <span
                  class="td-bar-fill"
                  :style="{ transform: `scaleX(${factors[f.id] / 100})`, background: f.color }"
                ></span>
              </div>
              <div class="td-row-meta">
                <span
                  class="td-row-value"
                  :style="{ color: scoreColor(factors[f.id]) }"
                >{{ factors[f.id] }}</span>
                <span class="td-row-weight">{{ weights[f.id] }}% weight</span>
              </div>
            </li>
          </ul>
        </section>

        <!-- Category fingerprint -->
        <section class="td-finger" aria-labelledby="td-finger-label">
          <p id="td-finger-label" class="td-eyebrow">Category fingerprint</p>
          <ul class="td-cats" role="list">
            <li v-for="c in categories" :key="c.id" class="td-cat">
              <span class="td-cat-label">{{ c.label }}</span>
              <div class="td-cat-track" role="img" :aria-label="`${c.name} rank ${rankFor(c.id)} of 10`">
                <span
                  class="td-cat-fill"
                  :style="{
                    transform: `scaleX(${(11 - rankFor(c.id)) / 10})`,
                    background: rankBandColor(rankFor(c.id)),
                  }"
                ></span>
              </div>
              <span class="td-cat-rank" :style="{ color: rankBandColor(rankFor(c.id)) }">
                #{{ rankFor(c.id) }}
              </span>
            </li>
          </ul>
        </section>

        <!-- Category trajectory: 2-3 distinctive cats, weekly W/L cells -->
        <section v-if="trajectoryCats.length" class="td-traj" aria-labelledby="td-traj-label">
          <p id="td-traj-label" class="td-eyebrow">Category trajectory · last 8 weeks</p>
          <ul class="td-traj-rows" role="list">
            <li v-for="row in trajectoryCats" :key="row.cat" class="td-traj-row">
              <span class="td-traj-label">
                <span class="td-traj-cat">{{ row.cat }}</span>
                <span class="td-traj-band" :style="{ color: row.bandColor }">{{ row.band }}</span>
              </span>
              <div class="td-traj-cells">
                <span
                  v-for="(r, i) in row.results"
                  :key="`${row.cat}-${i}`"
                  class="td-traj-cell"
                  :class="`td-traj-cell-${r.toLowerCase()}`"
                  :aria-label="`Week ${i + 1} ${r === 'W' ? 'won' : r === 'L' ? 'lost' : 'tied'} ${row.cat}`"
                >
                  <svg v-if="r === 'W'" width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
                    <path d="M5 1 L9 8 L1 8 Z" fill="currentColor"/>
                  </svg>
                  <svg v-else-if="r === 'L'" width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
                    <path d="M5 9 L1 2 L9 2 Z" fill="currentColor"/>
                  </svg>
                  <span v-else class="td-traj-dash">–</span>
                </span>
              </div>
            </li>
          </ul>
        </section>

        <!-- Footer pills -->
        <footer class="td-foot">
          <span class="td-foot-pill td-foot-pill-disabled" aria-disabled="true">View matchups</span>
          <span class="td-foot-pill td-foot-pill-disabled" aria-disabled="true">View standings</span>
          <button type="button" class="td-share" @click="emit('open-signup')">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
              <polyline points="16 6 12 2 8 6" />
              <line x1="12" y1="2" x2="12" y2="15" />
            </svg>
            Share on a card
          </button>
        </footer>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  categories,
  factorDefs,
  getTeam,
  standings2026Week8,
  teamFactorScores,
  catRanksFor,
  type CategoryFactorScores,
  type CategoryId,
} from '@/fixtures/categoriesLeague'
import { useDemoCategoryPowerRankings } from '@/composables/useDemoCategoryPowerRankings'
import { useDemoModal } from '@/composables/useDemoModal'

const props = defineProps<{ teamId: string }>()
const emit = defineEmits<{ (e: 'close'): void; (e: 'open-signup'): void }>()

const { liveRankings, weights } = useDemoCategoryPowerRankings()

const team = computed(() => getTeam(props.teamId))
const factors = computed<CategoryFactorScores>(() => teamFactorScores[props.teamId])
const standing = computed(() => standings2026Week8.find((s) => s.teamId === props.teamId)!)
const ranking = computed(() => liveRankings.value.find((r) => r.teamId === props.teamId)!)
const ranks = computed(() => catRanksFor(props.teamId))

function rankFor(catId: CategoryId): number {
  return ranks.value[catId]
}

function scoreColor(v: number) {
  if (v >= 75) return 'oklch(0.78 0.18 145)'
  if (v >= 50) return 'oklch(0.97 0.005 90)'
  if (v >= 30) return 'oklch(0.78 0.18 50)'
  return 'oklch(0.85 0.20 350)'
}

// Color band by rank bucket.
function rankBandColor(rank: number) {
  if (rank <= 3) return 'oklch(0.78 0.18 145)' // green (own)
  if (rank <= 7) return 'oklch(0.78 0.16 75)'  // yellow (middle)
  return 'oklch(0.85 0.20 350)'                // magenta (bleed)
}
function rankBandLabel(rank: number) {
  if (rank <= 3) return 'OWN'
  if (rank <= 7) return 'MID'
  return 'BLEED'
}

// Scene-setting sentence varies by rank tier.
const sceneSentence = computed(() => {
  const r = ranking.value.rank
  const s = standing.value
  if (r <= 3) {
    return `<strong>#${r}</strong> in the league. <strong>${s.catWins}-${s.catLosses}-${s.catTies}</strong> in cat matchups. <strong>Owns ${s.ownsCount}</strong> cats. Bleeding ${s.bleedingCount}.`
  }
  if (r <= 7) {
    return `<strong>${s.catWins}-${s.catLosses}-${s.catTies}</strong> in cat matchups, currently <strong>#${r}</strong>. Owns ${s.ownsCount}, bleeding ${s.bleedingCount}. ${s.streak.type === 'W' ? 'Trending up' : s.streak.type === 'L' ? 'Cooling off' : 'Holding steady'}.`
  }
  return `Bleeding <strong>${s.bleedingCount}</strong> cats. Just <strong>${s.catWins}-${s.catLosses}-${s.catTies}</strong> on the year. <strong>#${r}</strong> and looking for a reset.`
})

/* ─── Category trajectory ─── */
// Pick 3 distinctive cats: top-2 owns + the #1 bleed (if any), else top-3 owns.
interface TrajectoryRow {
  cat: CategoryId
  band: string
  bandColor: string
  results: ('W' | 'L' | 'T')[]
}
const trajectoryCats = computed<TrajectoryRow[]>(() => {
  const sorted = [...categories].sort((a, b) => ranks.value[a.id] - ranks.value[b.id])
  const tops = sorted.slice(0, 2).map((c) => c.id)
  const worstRank = Math.max(...categories.map((c) => ranks.value[c.id]))
  const worstCat = categories.find((c) => ranks.value[c.id] === worstRank)?.id
  const chosen: CategoryId[] = [...tops]
  if (worstCat && !chosen.includes(worstCat)) chosen.push(worstCat)
  return chosen.map((catId) => ({
    cat: catId,
    band: rankBandLabel(ranks.value[catId]),
    bandColor: rankBandColor(ranks.value[catId]),
    results: synthCatResults(catId),
  }))
})

// Deterministic synthesized 8-week per-cat W/L/T trail.
// Strong cats trend W, weak trend L, with a bit of variation seeded by teamId+catId.
function synthCatResults(catId: CategoryId): ('W' | 'L' | 'T')[] {
  const rank = ranks.value[catId]
  // base probability of W decays as rank grows (1 = ~92%, 10 = ~10%)
  const baseP = 1 - (rank - 1) / 11
  // Deterministic seed via cheap hash of (teamId + catId)
  const seedStr = `${props.teamId}-${catId}`
  let seed = 0
  for (let i = 0; i < seedStr.length; i++) seed = (seed * 31 + seedStr.charCodeAt(i)) & 0x7fffffff
  const results: ('W' | 'L' | 'T')[] = []
  for (let w = 0; w < 8; w++) {
    // tiny noise jitter
    seed = (seed * 1103515245 + 12345) & 0x7fffffff
    const r = (seed % 1000) / 1000
    if (r < baseP * 0.95) results.push('W')
    else if (r > baseP * 0.95 + 0.06) results.push('L')
    else results.push('T')
  }
  return results
}

/* ── Focus management + trap ───────────────────────────────────── */
const dialogRef = ref<HTMLElement | null>(null)
const closeBtnRef = ref<HTMLElement | null>(null)

function onClose() {
  emit('close')
}

useDemoModal({ dialogRef, closeBtnRef, onClose })
</script>

<style scoped>
.td-root {
  position: fixed;
  inset: 0;
  z-index: 210;
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
  --accent-up:        oklch(0.74 0.18 145);

  font-family: 'Barlow', sans-serif;
  color: var(--ink-1);
}

.td-backdrop {
  position: absolute;
  inset: 0;
  background: oklch(0.04 0.014 90 / 0.78);
  opacity: 0;
  animation: td-fade-in 140ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
}
.td-dialog {
  position: relative;
  width: 100%;
  max-width: 680px;
  max-height: calc(100vh - 48px);
  overflow-y: auto;
  background: oklch(0.10 0.015 90);
  border: 1px solid oklch(0.22 0.015 90);
  border-radius: 18px;
  padding: 24px 28px 22px;
  box-shadow:
    0 28px 72px -28px oklch(0 0 0 / 0.85),
    inset 0 1px 0 oklch(1 0 0 / 0.04);
  opacity: 0;
  transform: scale(0.96) translateY(8px);
  animation: td-dialog-in 180ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
  animation-delay: 30ms;
}

@media (prefers-reduced-motion: reduce) {
  .td-backdrop, .td-dialog {
    animation: none;
    opacity: 1;
    transform: none;
  }
}

@keyframes td-fade-in { to { opacity: 1; } }
@keyframes td-dialog-in { to { opacity: 1; transform: scale(1) translateY(0); } }

/* Header */
.td-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;
}
.td-head-id {
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
}
.td-avatar {
  width: 72px;
  height: 72px;
  border-radius: 16px;
  display: grid;
  place-items: center;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 1.4rem;
  color: oklch(0.12 0.012 90);
  flex-shrink: 0;
  overflow: hidden;
  box-shadow: 0 8px 24px -10px oklch(0 0 0 / 0.6);
}
.td-avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.td-head-text { min-width: 0; }
.td-title {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 1.6rem;
  line-height: 1.05;
  letter-spacing: -0.008em;
  color: var(--ink-1);
  margin: 0;
}
.td-sub {
  margin: 6px 0 0;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--ink-3);
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}
.td-sub strong { color: var(--ink-1); font-weight: 900; }
.td-sub-dot { color: var(--ink-4); }
.td-sub-owner { color: var(--ink-3); }

.td-close {
  width: 32px;
  height: 32px;
  display: grid;
  place-items: center;
  background: transparent;
  border: 1px solid oklch(0.22 0.015 90);
  border-radius: 8px;
  color: var(--ink-2);
  cursor: pointer;
  transition: color 160ms cubic-bezier(0.22, 1, 0.36, 1),
              border-color 160ms cubic-bezier(0.22, 1, 0.36, 1);
  flex-shrink: 0;
}
.td-close:hover { color: var(--ink-1); border-color: oklch(0.36 0.015 90); }
.td-close:active { transform: scale(0.97); transition-duration: 100ms; }
.td-close:focus-visible { outline: 2px solid var(--accent-primary); outline-offset: 2px; }

/* Scene sentence */
.td-scene {
  font-size: 1.08rem;
  line-height: 1.55;
  color: var(--ink-2);
  margin: 4px 0 22px;
  max-width: 60ch;
}
.td-scene :deep(strong) {
  color: var(--ink-1);
  font-weight: 900;
  font-variant-numeric: tabular-nums;
}

/* Eyebrow */
.td-eyebrow {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--ink-3);
  margin: 0 0 10px;
}

/* Breakdown */
.td-breakdown { margin-bottom: 22px; }
.td-rows {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.td-row {
  display: grid;
  grid-template-columns: 10px minmax(0, 1.1fr) minmax(0, 2fr) 88px;
  align-items: center;
  gap: 12px;
  padding: 8px 0;
  border-bottom: 1px solid oklch(0.14 0.018 90);
}
.td-row:last-child { border-bottom: none; }
.td-row-swatch {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  box-shadow: 0 0 0 2px oklch(0.10 0.015 90);
}
.td-row-name {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: 0.92rem;
  letter-spacing: 0.01em;
  color: var(--ink-1);
  min-width: 0;
}
.td-bar {
  position: relative;
  width: 100%;
  height: 6px;
  border-radius: 999px;
  background: oklch(0.18 0.015 90);
  overflow: hidden;
}
.td-bar-fill {
  position: absolute;
  inset: 0 auto 0 0;
  width: 100%;
  height: 100%;
  border-radius: 999px;
  transform-origin: left center;
  transform: scaleX(1);
  transition: transform 220ms cubic-bezier(0.22, 1, 0.36, 1);
}
@media (prefers-reduced-motion: reduce) {
  .td-bar-fill { transition: none; }
}
.td-row-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 1px;
  line-height: 1;
}
.td-row-value {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 1rem;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.01em;
}
.td-row-weight {
  font-size: 0.66rem;
  color: var(--ink-4);
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

/* Category fingerprint */
.td-finger { margin-bottom: 22px; }
.td-cats {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.td-cat {
  display: grid;
  grid-template-columns: 36px minmax(0, 1fr) 44px;
  align-items: center;
  gap: 10px;
  padding: 4px 0;
}
.td-cat-label {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: 0.82rem;
  letter-spacing: 0.06em;
  color: var(--ink-2);
  text-transform: uppercase;
}
.td-cat-track {
  position: relative;
  width: 100%;
  height: 8px;
  border-radius: 999px;
  background: oklch(0.16 0.015 90);
  overflow: hidden;
}
.td-cat-fill {
  position: absolute;
  inset: 0 auto 0 0;
  width: 100%;
  height: 100%;
  border-radius: 999px;
  transform-origin: left center;
  transition: transform 280ms cubic-bezier(0.22, 1, 0.36, 1);
}
@media (prefers-reduced-motion: reduce) {
  .td-cat-fill { transition: none; }
}
.td-cat-rank {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 0.92rem;
  letter-spacing: 0.01em;
  text-align: right;
  font-variant-numeric: tabular-nums;
}

/* Trajectory */
.td-traj { margin-bottom: 20px; }
.td-traj-rows {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.td-traj-row {
  display: grid;
  grid-template-columns: 92px minmax(0, 1fr);
  align-items: center;
  gap: 12px;
}
.td-traj-label {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.td-traj-cat {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 0.92rem;
  letter-spacing: 0.04em;
  color: var(--ink-1);
}
.td-traj-band {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: 0.62rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}
.td-traj-cells {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 4px;
}
.td-traj-cell {
  width: 100%;
  aspect-ratio: 1 / 1;
  max-width: 22px;
  border-radius: 4px;
  display: grid;
  place-items: center;
  background: oklch(0.14 0.015 90);
  color: var(--ink-3);
}
.td-traj-cell-w {
  background: oklch(0.74 0.18 145 / 0.18);
  color: oklch(0.86 0.16 145);
}
.td-traj-cell-l {
  background: oklch(0.70 0.27 350 / 0.16);
  color: oklch(0.85 0.20 350);
}
.td-traj-dash {
  font-size: 0.74rem;
  font-weight: 700;
}

/* Footer */
.td-foot {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 18px;
  padding-top: 14px;
  border-top: 1px solid oklch(0.16 0.015 90);
}
.td-foot-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 700;
  font-size: 0.78rem;
  letter-spacing: 0.10em;
  text-transform: uppercase;
  color: var(--ink-3);
  background: oklch(0.12 0.015 90);
  border: 1px solid oklch(0.20 0.015 90);
  padding: 7px 12px;
  border-radius: 999px;
}
.td-foot-pill-disabled { opacity: 0.5; cursor: not-allowed; }
.td-share {
  margin-left: auto;
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
.td-share:hover { color: var(--ink-1); border-color: oklch(0.44 0.015 90); }
.td-share:active { transform: scale(0.97); transition-duration: 100ms; }
.td-share:focus-visible { outline: 2px solid var(--accent-primary); outline-offset: 2px; }

@media (max-width: 560px) {
  .td-row {
    grid-template-columns: 10px minmax(0, 1fr) 70px;
    grid-template-rows: auto auto;
    gap: 6px 10px;
  }
  .td-bar {
    grid-column: 1 / -1;
    margin-top: 2px;
  }
  .td-traj-row {
    grid-template-columns: 80px minmax(0, 1fr);
  }
  .td-avatar { width: 56px; height: 56px; }
}
</style>
