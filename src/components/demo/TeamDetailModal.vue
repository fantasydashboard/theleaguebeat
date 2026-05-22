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
                Power Rank <strong>#{{ ranking.rank }}</strong> of {{ totalTeams }}
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

        <!-- HERO METRIC: one big Power Score, NOT a 4-quadrant grid -->
        <section class="td-hero" :aria-label="`Power score ${ranking.score}`">
          <span class="td-hero-glow" aria-hidden="true"></span>
          <div class="td-hero-num">
            <span class="td-hero-eyebrow">Power Score</span>
            <span class="td-hero-value" :style="{ color: teamAccent }">{{ formatScore(ranking.score) }}</span>
          </div>
          <p class="td-meta">
            <span class="td-meta-item">Record <strong>{{ standing.wins }}-{{ standing.losses }}</strong></span>
            <span class="td-meta-dot" aria-hidden="true">·</span>
            <span class="td-meta-item">All-Play <strong>{{ stats.allPlayWins }}-{{ stats.allPlayLosses }}</strong></span>
            <span class="td-meta-dot" aria-hidden="true">·</span>
            <span class="td-meta-item">PPW <strong>{{ stats.pointsPerWeek.toFixed(1) }}</strong></span>
          </p>
        </section>

        <!-- Editorial copy -->
        <p class="td-editorial">{{ editorial }}</p>

        <!-- Breakdown -->
        <section class="td-breakdown" aria-labelledby="td-breakdown-label">
          <p id="td-breakdown-label" class="td-eyebrow">Power Score Breakdown</p>
          <ul class="td-rows" role="list">
            <li v-for="f in factorDefs" :key="f.id" class="td-row">
              <span class="td-row-icon" aria-hidden="true">
                <FactorIcon :factor="f.id" :size="14" />
              </span>
              <span class="td-row-name">{{ f.name }}</span>
              <div class="td-bar" role="img" :aria-label="`${f.name} ${factors[f.id]} out of 100`">
                <span
                  class="td-bar-fill"
                  :style="{ transform: 'scaleX(' + (factors[f.id] / 100) + ')', background: teamAccent }"
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

        <footer class="td-foot">
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
  factorDefs,
  getTeam,
  standings2025Week11,
  teamFactorScores,
  teamSeasonStats,
  teams,
  type TeamFactorScores,
} from '@/fixtures/pillarsLeague'
import { useDemoPowerRankings } from '@/composables/useDemoPowerRankings'
import { useDemoModal } from '@/composables/useDemoModal'
import { accentFor } from '@/utils/teamColor'
import FactorIcon from './FactorIcon.vue'

const props = defineProps<{ teamId: string }>()
const emit = defineEmits<{ (e: 'close'): void; (e: 'open-signup'): void }>()

const { liveRankings, weights } = useDemoPowerRankings()

const team = computed(() => getTeam(props.teamId))
const factors = computed<TeamFactorScores>(() => teamFactorScores[props.teamId])
const stats = computed(() => teamSeasonStats[props.teamId])
const standing = computed(() => standings2025Week11.find((s) => s.teamId === props.teamId)!)
const ranking = computed(() => liveRankings.value.find((r) => r.teamId === props.teamId)!)
const totalTeams = teams.length

// Extract the first OKLCH stop from the team's avatar gradient as their accent color.
const teamAccent = computed(() => accentFor(team.value))

function formatScore(n: number) {
  return n.toFixed(1)
}

function scoreColor(v: number) {
  if (v >= 75) return 'oklch(0.78 0.18 145)'
  if (v >= 50) return 'oklch(0.97 0.005 90)'
  if (v >= 30) return 'oklch(0.78 0.18 50)'
  return 'oklch(0.74 0.20 25)'
}

// Pick the team's highest- and lowest-scoring factor for editorial copy.
function adjFor(v: number) {
  if (v >= 90) return 'league-best'
  if (v >= 75) return 'elite'
  if (v >= 60) return 'solid'
  if (v >= 45) return 'still fine'
  return 'shaky'
}
function lowPhraseFor(v: number) {
  if (v >= 60) return 'is right there too'
  if (v >= 45) return 'is hanging on'
  return 'needs work'
}

const editorial = computed(() => {
  const entries = factorDefs.map((f) => ({ id: f.id, name: f.name, val: factors.value[f.id] }))
  const sortedDesc = [...entries].sort((a, b) => b.val - a.val)
  const top = sortedDesc[0]
  const bot = sortedDesc[sortedDesc.length - 1]
  const topAdj = adjFor(top.val)
  const lowPhrase = lowPhraseFor(bot.val)
  const everythingSolid = entries.every((e) => e.val >= 60)
  const rank = ranking.value.rank
  const name = team.value.name

  // Three deterministic templates, chosen by rank parity so each team gets a stable read.
  if (everythingSolid) {
    return `${name} sits at #${rank} because their ${top.name.toLowerCase()} is ${topAdj}, and there's no real weakness to point at.`
  }
  const variant = rank % 3
  if (variant === 1) {
    return `${name} sits at #${rank} because their ${top.name.toLowerCase()} is ${topAdj}, even though their ${bot.name.toLowerCase()} ${lowPhrase}.`
  }
  if (variant === 2) {
    return `${name} lands at #${rank}: ${topAdj} ${top.name.toLowerCase()}, ${lowPhrase} ${bot.name.toLowerCase()}.`
  }
  return `${name} holds #${rank} on the strength of ${topAdj} ${top.name.toLowerCase()}, while ${bot.name.toLowerCase()} ${lowPhrase}.`
})

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
  max-width: 640px;
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
  .td-backdrop,
  .td-dialog {
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
  align-items: center;
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
  width: 56px;
  height: 56px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 1.2rem;
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
  font-size: 1.5rem;
  line-height: 1.05;
  letter-spacing: -0.008em;
  color: var(--ink-1);
  margin: 0;
}
.td-sub {
  margin: 4px 0 0;
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
.td-close:focus-visible { outline: 2px solid var(--accent-primary); outline-offset: 2px; }

/* Hero metric */
.td-hero {
  position: relative;
  padding: 8px 0 14px;
  margin-bottom: 4px;
}
.td-hero-glow {
  position: absolute;
  inset: -10px -10px 0 -10px;
  background: radial-gradient(ellipse 60% 80% at 20% 50%, oklch(0.78 0.18 92 / 0.10), transparent 70%);
  pointer-events: none;
  z-index: 0;
}
.td-hero-num {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: baseline;
  gap: 14px;
  flex-wrap: wrap;
}
.td-hero-eyebrow {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.74rem;
  font-weight: 800;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--ink-3);
}
.td-hero-value {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: clamp(4rem, 11vw, 5.5rem);
  line-height: 0.9;
  letter-spacing: -0.018em;
  font-variant-numeric: tabular-nums;
}
.td-meta {
  position: relative;
  z-index: 1;
  margin: 6px 0 0;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.92rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: var(--ink-3);
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.td-meta-item strong {
  color: var(--ink-1);
  font-weight: 900;
  font-variant-numeric: tabular-nums;
  margin-left: 4px;
}
.td-meta-dot { color: var(--ink-5); }

/* Editorial copy */
.td-editorial {
  font-size: 1.02rem;
  line-height: 1.55;
  color: var(--ink-2);
  margin: 14px 0 22px;
  max-width: 56ch;
}

/* Breakdown */
.td-eyebrow {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--ink-3);
  margin: 0 0 10px;
}
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
  grid-template-columns: 18px minmax(0, 1.05fr) minmax(0, 2fr) 86px;
  align-items: center;
  gap: 12px;
  padding: 8px 0;
  border-bottom: 1px solid oklch(0.14 0.018 90);
}
.td-row:last-child { border-bottom: none; }
.td-row-icon { color: var(--ink-3); display: grid; place-items: center; }
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

/* Footer */
.td-foot {
  display: flex;
  justify-content: flex-end;
  margin-top: 18px;
  padding-top: 14px;
  border-top: 1px solid oklch(0.16 0.015 90);
}
.td-share {
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
.td-share:focus-visible { outline: 2px solid var(--accent-primary); outline-offset: 2px; }

@media (max-width: 560px) {
  .td-row {
    grid-template-columns: 18px minmax(0, 1fr) 70px;
    grid-template-rows: auto auto;
    gap: 6px 10px;
  }
  .td-bar {
    grid-column: 1 / -1;
    margin-top: 2px;
  }
}
</style>
