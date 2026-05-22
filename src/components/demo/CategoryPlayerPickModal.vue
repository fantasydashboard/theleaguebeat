<template>
  <Teleport to="body">
    <div class="cpp-root" role="presentation">
      <div class="cpp-backdrop" @click="onClose" aria-hidden="true"></div>
      <div
        ref="dialogRef"
        class="cpp-dialog"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="`cpp-title-${pick.pickOverall}`"
      >
        <!-- HEADER -->
        <header class="cpp-head">
          <div class="cpp-head-id">
            <div class="cpp-glyph" :style="{ background: posBg(pick.position), color: posFg(pick.position) }" aria-hidden="true">
              {{ pick.position }}
            </div>
            <div class="cpp-head-text">
              <h2 :id="`cpp-title-${pick.pickOverall}`" class="cpp-title">{{ pick.playerName }}</h2>
              <p class="cpp-sub">
                <span class="cpp-pos-pill" :style="{ background: posBg(pick.position), color: posFg(pick.position) }">
                  {{ pick.position }}
                </span>
                <span class="cpp-sub-dot" aria-hidden="true">·</span>
                {{ pick.mlbTeam }}
                <span class="cpp-sub-dot" aria-hidden="true">·</span>
                {{ tierLabel }}
              </p>
            </div>
          </div>
          <button
            ref="closeBtnRef"
            type="button"
            class="cpp-close"
            aria-label="Close player detail"
            @click="onClose"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <line x1="5" y1="5" x2="19" y2="19" />
              <line x1="19" y1="5" x2="5" y2="19" />
            </svg>
          </button>
        </header>

        <!-- TILES (deliberately varied widths — not identical grid) -->
        <section class="cpp-tiles" aria-label="Pick context">
          <article class="cpp-tile cpp-tile-pick">
            <p class="cpp-tile-eyebrow">Draft pick</p>
            <p class="cpp-tile-big">R{{ pick.round }}.{{ pick.pickInRound }}</p>
            <p class="cpp-tile-small">Overall #{{ pick.pickOverall }}</p>
          </article>
          <article class="cpp-tile cpp-tile-cat">
            <p class="cpp-tile-eyebrow">Category score</p>
            <p class="cpp-tile-big">{{ catScorePct }}</p>
            <p class="cpp-tile-small">avg percentile across 11 cats</p>
          </article>
          <article class="cpp-tile cpp-tile-value" :class="`cpp-tile-value-${pick.tier}`">
            <p class="cpp-tile-eyebrow">Value score</p>
            <p class="cpp-tile-big" :style="{ color: valueColor }">
              {{ pick.valueScore > 0 ? '+' : '' }}{{ pick.valueScore }}
            </p>
            <p class="cpp-tile-tier" :style="{ color: valueColor }">{{ tierLabel }}</p>
          </article>
        </section>

        <!-- Editorial note -->
        <p v-if="note" class="cpp-note">{{ note }}</p>

        <!-- Category performance — 11 rows -->
        <section class="cpp-perf" aria-labelledby="cpp-perf-label">
          <p id="cpp-perf-label" class="cpp-eyebrow">Category performance</p>
          <ul class="cpp-perf-rows" role="list">
            <li v-for="row in catRows" :key="row.cat" class="cpp-perf-row">
              <span class="cpp-perf-label">{{ row.cat }}</span>
              <span class="cpp-perf-value" :class="{ 'cpp-perf-value-empty': !row.hasValue }">
                {{ row.display }}
              </span>
              <span class="cpp-perf-rank" :class="{ 'cpp-perf-rank-empty': !row.hasValue }">
                #{{ row.rank }}
              </span>
              <span class="cpp-perf-delta" :style="{ color: row.hasValue ? deltaColor(row.delta) : 'var(--ink-5)' }">
                {{ row.hasValue ? (row.delta >= 0 ? '+' : '') + row.delta : '–' }}
              </span>
            </li>
          </ul>
        </section>

        <!-- Drafted by footer -->
        <footer class="cpp-foot">
          <div class="cpp-by">
            <div
              class="cpp-by-avatar"
              :style="{ background: `linear-gradient(135deg, ${team.avatarColor})` }"
            >
              <img v-if="team.avatarUrl" :src="team.avatarUrl" class="cpp-by-img" alt="" />
              <span v-else>{{ team.ownerInitials }}</span>
            </div>
            <div class="cpp-by-text">
              <p class="cpp-by-label">Drafted by</p>
              <p class="cpp-by-name">{{ team.name }}</p>
            </div>
          </div>
          <p class="cpp-by-pick">Pick #{{ pick.pickOverall }}</p>
        </footer>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  getDraftPick,
  getTeam,
  draftPicks2026,
  playerNotes,
  type PlayerPosition,
  type PlayerCatStats,
  type CategoryDraftPick,
} from '@/fixtures/categoriesLeague'
import { useDemoModal } from '@/composables/useDemoModal'

const props = defineProps<{ pickOverall: number }>()
const emit = defineEmits<{ (e: 'close'): void }>()

const pick = computed<CategoryDraftPick>(() => getDraftPick(props.pickOverall))
const team = computed(() => getTeam(pick.value.draftedByTeamId))
const note = computed<string | undefined>(() => playerNotes[pick.value.playerId])

const CATS = ['R', 'H', 'HR', 'RBI', 'SB', 'AVG', 'W', 'SV', 'K', 'HLD', 'ERA'] as const

// Compute rank for each cat across all 180 picks. For AVG/ERA lower-or-higher
// matters: AVG sorted desc, ERA sorted asc (lower better).
function rankForCat(cat: typeof CATS[number], playerId: string): number {
  const pool = draftPicks2026.filter((p) => {
    const v = (p.stats as PlayerCatStats)[cat]
    return v !== undefined && v !== null && !Number.isNaN(v)
  })
  if (pool.length === 0) return 180
  const asc = cat === 'ERA'
  const sorted = [...pool].sort((a, b) => {
    const va = (a.stats as PlayerCatStats)[cat] as number
    const vb = (b.stats as PlayerCatStats)[cat] as number
    return asc ? va - vb : vb - va
  })
  const idx = sorted.findIndex((p) => p.playerId === playerId)
  return idx === -1 ? 180 : idx + 1
}

interface CatRow {
  cat: string
  hasValue: boolean
  display: string
  rank: number
  delta: number
}

const catRows = computed<CatRow[]>(() => {
  const p = pick.value
  return CATS.map<CatRow>((cat) => {
    const raw = (p.stats as PlayerCatStats)[cat]
    if (raw === undefined || raw === null || Number.isNaN(raw)) {
      return { cat, hasValue: false, display: '—', rank: 180, delta: 0 }
    }
    const rank = rankForCat(cat, p.playerId)
    // Per-cat delta: if the rank is significantly better than draft slot, positive.
    // We treat draft slot 1..180; rank 1..180. Delta = pickOverall - rank.
    const delta = p.pickOverall - rank
    let display: string
    if (cat === 'AVG') display = raw.toFixed(3).replace(/^0/, '')
    else if (cat === 'ERA') display = raw.toFixed(2)
    else display = `${raw}`
    return { cat, hasValue: true, display, rank, delta }
  })
})

const catScorePct = computed(() => {
  // Average percentile across active cats only.
  const rows = catRows.value.filter((r) => r.hasValue)
  if (!rows.length) return 0
  const sum = rows.reduce((acc, r) => acc + (1 - (r.rank - 1) / 180) * 100, 0)
  return Math.round(sum / rows.length)
})

const tierLabel = computed(() => {
  return pick.value.tier.toUpperCase()
})

const valueColor = computed(() => {
  const v = pick.value.valueScore
  if (v >= 5) return 'oklch(0.82 0.18 145)'
  if (v <= -5) return 'oklch(0.78 0.20 350)'
  return 'oklch(0.78 0.008 90)'
})

function deltaColor(d: number): string {
  if (d >= 10) return 'oklch(0.82 0.18 145)'
  if (d <= -10) return 'oklch(0.78 0.20 350)'
  return 'oklch(0.55 0.010 90)'
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
</script>

<style scoped>
.cpp-root {
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
.cpp-backdrop {
  position: absolute; inset: 0;
  background: oklch(0.04 0.014 90 / 0.80);
  opacity: 0;
  animation: cpp-fade-in 140ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
}
.cpp-dialog {
  position: relative;
  width: 100%;
  max-width: 600px;
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
  animation: cpp-dialog-in 180ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
  animation-delay: 30ms;
}
@media (prefers-reduced-motion: reduce) {
  .cpp-backdrop, .cpp-dialog { animation: none; opacity: 1; transform: none; }
}
@keyframes cpp-fade-in { to { opacity: 1; } }
@keyframes cpp-dialog-in { to { opacity: 1; transform: scale(1) translateY(0); } }

.cpp-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  margin-bottom: 18px;
}
.cpp-head-id { display: flex; align-items: center; gap: 12px; min-width: 0; }
.cpp-glyph {
  width: 48px; height: 48px;
  border-radius: 14px;
  display: grid; place-items: center;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 1.0rem;
  letter-spacing: 0.04em;
  border: 1px solid oklch(0.22 0.015 90);
  flex-shrink: 0;
}
.cpp-head-text { min-width: 0; }
.cpp-title {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 1.45rem;
  line-height: 1.0;
  letter-spacing: -0.008em;
  margin: 0;
}
.cpp-sub {
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
.cpp-pos-pill {
  display: inline-flex; align-items: center;
  padding: 2px 7px;
  border-radius: 999px;
  font-weight: 800;
  letter-spacing: 0.08em;
  font-size: 0.72rem;
}
.cpp-sub-dot { color: var(--ink-4); }
.cpp-close {
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
.cpp-close:hover { color: var(--ink-1); border-color: oklch(0.36 0.015 90); }
.cpp-close:focus-visible { outline: 2px solid var(--accent-primary); outline-offset: 2px; }

/* Varied-width tiles row — not an equal grid */
.cpp-tiles {
  display: grid;
  grid-template-columns: 1fr 1.2fr 1.4fr;
  gap: 10px;
  margin-bottom: 16px;
}
.cpp-tile {
  padding: 12px 14px;
  border-radius: 12px;
  background: oklch(0.12 0.015 90);
  border: 1px solid oklch(0.18 0.015 90);
  position: relative;
  overflow: hidden;
}
.cpp-tile-pick { background: oklch(0.13 0.015 90); }
.cpp-tile-cat  { background: oklch(0.72 0.18 195 / 0.06); border-color: oklch(0.72 0.18 195 / 0.20); }
.cpp-tile-value-jackpot,
.cpp-tile-value-steal { background: oklch(0.72 0.18 145 / 0.10); border-color: oklch(0.72 0.18 145 / 0.30); }
.cpp-tile-value-hit { background: oklch(0.72 0.18 145 / 0.06); border-color: oklch(0.72 0.18 145 / 0.22); }
.cpp-tile-value-solid { }
.cpp-tile-value-miss { background: oklch(0.70 0.27 350 / 0.06); border-color: oklch(0.70 0.27 350 / 0.22); }
.cpp-tile-value-bust,
.cpp-tile-value-disaster { background: oklch(0.70 0.27 350 / 0.10); border-color: oklch(0.70 0.27 350 / 0.30); }
.cpp-tile-eyebrow {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--ink-3);
  margin: 0 0 6px;
}
.cpp-tile-big {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 1.85rem;
  line-height: 0.95;
  letter-spacing: -0.012em;
  color: var(--ink-1);
  margin: 0;
  font-variant-numeric: tabular-nums;
}
.cpp-tile-small {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ink-3);
  margin: 6px 0 0;
}
.cpp-tile-tier {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.74rem;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  margin: 6px 0 0;
}

.cpp-note {
  font-size: 0.98rem;
  line-height: 1.55;
  color: var(--ink-2);
  margin: 0 0 18px;
  max-width: 56ch;
  padding: 12px 14px;
  background: oklch(0.13 0.015 90);
  border-left: 2px solid var(--accent-tertiary);
  border-radius: 4px;
}

.cpp-eyebrow {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--ink-3);
  margin: 0 0 10px;
}
.cpp-perf-rows {
  list-style: none;
  padding: 0;
  margin: 0 0 18px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.cpp-perf-row {
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr) 56px 60px;
  align-items: center;
  gap: 12px;
  padding: 7px 12px;
  border-radius: 6px;
  background: oklch(0.11 0.015 90);
}
.cpp-perf-row:nth-child(odd) { background: oklch(0.13 0.015 90); }
.cpp-perf-label {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: 0.84rem;
  letter-spacing: 0.06em;
  color: var(--ink-3);
}
.cpp-perf-value {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 1.15rem;
  color: var(--ink-1);
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.005em;
}
.cpp-perf-value-empty { color: var(--ink-5); }
.cpp-perf-rank {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: 0.80rem;
  letter-spacing: 0.04em;
  text-align: right;
  color: var(--ink-3);
  padding: 2px 6px;
  border-radius: 999px;
  background: oklch(0.16 0.015 90);
  display: inline-block;
}
.cpp-perf-rank-empty { color: var(--ink-5); background: transparent; }
.cpp-perf-delta {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: 0.86rem;
  font-variant-numeric: tabular-nums;
  text-align: right;
}

.cpp-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding-top: 14px;
  border-top: 1px solid oklch(0.16 0.015 90);
}
.cpp-by { display: inline-flex; align-items: center; gap: 12px; min-width: 0; }
.cpp-by-avatar {
  width: 40px; height: 40px;
  border-radius: 10px;
  display: grid; place-items: center;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  color: oklch(0.12 0.012 90);
  overflow: hidden;
  flex-shrink: 0;
}
.cpp-by-img { width: 100%; height: 100%; object-fit: cover; display: block; }
.cpp-by-label {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--ink-3);
  margin: 0;
}
.cpp-by-name {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 1rem;
  margin: 2px 0 0;
}
.cpp-by-pick {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: 0.80rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ink-3);
  margin: 0;
}

@media (max-width: 560px) {
  .cpp-dialog { padding: 18px 18px 16px; }
  .cpp-tiles { grid-template-columns: 1fr; }
  .cpp-perf-row { grid-template-columns: 36px minmax(0, 1fr) 48px 52px; gap: 8px; padding: 7px 10px; }
}
</style>
