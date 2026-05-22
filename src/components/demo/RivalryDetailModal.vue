<template>
  <Teleport to="body">
    <div class="rv-root" role="presentation">
      <div class="rv-backdrop" @click="onClose" aria-hidden="true"></div>
      <div
        ref="dialogRef"
        class="rv-dialog"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="`rv-title-${teamA.id}-${teamB.id}`"
      >
        <header class="rv-head">
          <h2 :id="`rv-title-${teamA.id}-${teamB.id}`" class="rv-title">
            <span class="rv-title-team">{{ teamA.name }}</span>
            <span class="rv-title-vs">vs</span>
            <span class="rv-title-team">{{ teamB.name }}</span>
          </h2>
          <button
            ref="closeBtnRef"
            type="button"
            class="rv-close"
            aria-label="Close rivalry detail"
            @click="onClose"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <line x1="5" y1="5" x2="19" y2="19" />
              <line x1="19" y1="5" x2="5" y2="19" />
            </svg>
          </button>
        </header>

        <!-- Editorial lead -->
        <p class="rv-lead">{{ lead }}</p>

        <!-- Tale of the tape -->
        <section class="rv-tape" aria-label="Tale of the tape">
          <article class="rv-side rv-side-a">
            <div class="rv-side-id">
              <div
                class="rv-avatar"
                :style="{ background: `linear-gradient(135deg, ${teamA.avatarColor})` }"
              >
                <img v-if="teamA.avatarUrl" :src="teamA.avatarUrl" class="rv-avatar-img" alt="" />
                <span v-else>{{ teamA.ownerInitials }}</span>
              </div>
              <div>
                <p class="rv-side-name">{{ teamA.name }}</p>
                <p class="rv-side-owner">{{ teamA.ownerName }}</p>
              </div>
            </div>
            <dl class="rv-stats">
              <div class="rv-stat"><dt>Championships</dt><dd>{{ careerA.championships }}</dd></div>
              <div class="rv-stat"><dt>Playoff apps</dt><dd>{{ careerA.playoffAppearances }}</dd></div>
              <div class="rv-stat"><dt>Vs opponent</dt><dd>{{ record.aWins }}-{{ record.bWins }}</dd></div>
              <div class="rv-stat"><dt>Avg vs opp</dt><dd>{{ avgA }}</dd></div>
            </dl>
          </article>

          <div class="rv-record" aria-label="Series record">
            <span class="rv-record-num" :style="{ color: leaderAccent }">
              {{ leaderRecord }}
            </span>
            <span class="rv-record-label">{{ leaderName }} leads</span>
          </div>

          <article class="rv-side rv-side-b">
            <div class="rv-side-id">
              <div
                class="rv-avatar"
                :style="{ background: `linear-gradient(135deg, ${teamB.avatarColor})` }"
              >
                <img v-if="teamB.avatarUrl" :src="teamB.avatarUrl" class="rv-avatar-img" alt="" />
                <span v-else>{{ teamB.ownerInitials }}</span>
              </div>
              <div>
                <p class="rv-side-name">{{ teamB.name }}</p>
                <p class="rv-side-owner">{{ teamB.ownerName }}</p>
              </div>
            </div>
            <dl class="rv-stats">
              <div class="rv-stat"><dt>Championships</dt><dd>{{ careerB.championships }}</dd></div>
              <div class="rv-stat"><dt>Playoff apps</dt><dd>{{ careerB.playoffAppearances }}</dd></div>
              <div class="rv-stat"><dt>Vs opponent</dt><dd>{{ record.bWins }}-{{ record.aWins }}</dd></div>
              <div class="rv-stat"><dt>Avg vs opp</dt><dd>{{ avgB }}</dd></div>
            </dl>
          </article>
        </section>

        <!-- Combined record bar -->
        <div
          class="rv-bar"
          :aria-label="`Series split: ${teamA.name} ${record.aWins} wins, ${teamB.name} ${record.bWins} wins`"
        >
          <span
            class="rv-bar-fill rv-bar-fill-a"
            :style="{ width: aPct + '%', background: accentA }"
          >
            <span class="rv-bar-num">{{ record.aWins }}</span>
          </span>
          <span
            class="rv-bar-fill rv-bar-fill-b"
            :style="{ width: bPct + '%', background: accentB }"
          >
            <span class="rv-bar-num">{{ record.bWins }}</span>
          </span>
        </div>

        <!-- Callouts -->
        <div class="rv-callouts">
          <article v-if="blowoutCopy" class="rv-callout rv-callout-blowout">
            <span class="rv-callout-eyebrow">Biggest blowout</span>
            <p class="rv-callout-text">{{ blowoutCopy }}</p>
          </article>
          <article v-if="closeCopy" class="rv-callout rv-callout-close">
            <span class="rv-callout-eyebrow">Closest game</span>
            <p class="rv-callout-text">{{ closeCopy }}</p>
          </article>
        </div>

        <!-- Recent meetings -->
        <section v-if="meetings.length" class="rv-meetings" aria-label="Recent meetings">
          <p class="rv-meetings-eyebrow">Recent meetings</p>
          <ol class="rv-meetings-list">
            <li v-for="(m, i) in meetings" :key="i" class="rv-meeting">
              <span class="rv-meeting-when">{{ m.year }} · Wk {{ m.week }}</span>
              <span
                class="rv-meeting-score"
                :class="m.aScore >= m.bScore ? 'rv-meeting-aWin' : 'rv-meeting-bWin'"
              >
                <span :style="m.aScore >= m.bScore ? { color: accentA } : null">{{ m.aScore.toFixed(1) }}</span>
                <span class="rv-meeting-dash" aria-hidden="true">to</span>
                <span :style="m.bScore >= m.aScore ? { color: accentB } : null">{{ m.bScore.toFixed(1) }}</span>
              </span>
              <span class="rv-meeting-result">
                <span v-if="m.aScore >= m.bScore">{{ teamA.name }} +{{ (m.aScore - m.bScore).toFixed(1) }}</span>
                <span v-else>{{ teamB.name }} +{{ (m.bScore - m.aScore).toFixed(1) }}</span>
              </span>
            </li>
          </ol>
        </section>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  getTeam,
  h2hMatrix,
  lifetimeH2H,
  teamCareerStats,
  type H2HRecord,
} from '@/fixtures/pillarsLeague'
import { accentFor } from '@/utils/teamColor'

const props = defineProps<{ teamAId: string; teamBId: string }>()
const emit = defineEmits<{ (e: 'close'): void }>()

const teamA = computed(() => getTeam(props.teamAId))
const teamB = computed(() => getTeam(props.teamBId))
const careerA = computed(() => teamCareerStats[props.teamAId])
const careerB = computed(() => teamCareerStats[props.teamBId])

// Find H2H record. Matrix is keyed in arbitrary direction; resolve to canonical (A,B).
const record = computed(() => {
  const direct = h2hMatrix.find(r => r.teamA === props.teamAId && r.teamB === props.teamBId)
  if (direct) return direct
  const reverse = h2hMatrix.find(r => r.teamA === props.teamBId && r.teamB === props.teamAId)
  if (reverse) {
    return {
      teamA: props.teamAId,
      teamB: props.teamBId,
      aWins: reverse.bWins,
      bWins: reverse.aWins,
      aPoints: reverse.bPoints,
      bPoints: reverse.aPoints,
      biggestBlowoutMargin: reverse.biggestBlowoutMargin,
      biggestBlowoutWinner: reverse.biggestBlowoutWinner,
      closestGameMargin: reverse.closestGameMargin,
    } as H2HRecord
  }
  // shouldn't happen, but fall back to empty record
  return {
    teamA: props.teamAId, teamB: props.teamBId,
    aWins: 0, bWins: 0, aPoints: 0, bPoints: 0,
  } as H2HRecord
})

const totalGames = computed(() => record.value.aWins + record.value.bWins)
const aPct = computed(() => totalGames.value > 0 ? (record.value.aWins / totalGames.value) * 100 : 50)
const bPct = computed(() => totalGames.value > 0 ? (record.value.bWins / totalGames.value) * 100 : 50)
const avgA = computed(() => totalGames.value > 0 ? (record.value.aPoints / totalGames.value).toFixed(1) : '—')
const avgB = computed(() => totalGames.value > 0 ? (record.value.bPoints / totalGames.value).toFixed(1) : '—')

const accentA = computed(() => accentFor(teamA.value))
const accentB = computed(() => accentFor(teamB.value))

const leaderRecord = computed(() => {
  if (record.value.aWins === record.value.bWins) return `${record.value.aWins}-${record.value.bWins}`
  return record.value.aWins > record.value.bWins
    ? `${record.value.aWins}-${record.value.bWins}`
    : `${record.value.bWins}-${record.value.aWins}`
})
const leaderName = computed(() => {
  if (record.value.aWins === record.value.bWins) return 'Series tied'
  return record.value.aWins > record.value.bWins ? teamA.value.name : teamB.value.name
})
const leaderAccent = computed(() => {
  if (record.value.aWins === record.value.bWins) return 'oklch(0.78 0.008 90)'
  return record.value.aWins > record.value.bWins ? accentA.value : accentB.value
})

// Editorial lead: prefer lifetimeH2H if present, else generate
const lead = computed(() => {
  const found = lifetimeH2H.find(l =>
    (l.teamA === props.teamAId && l.teamB === props.teamBId) ||
    (l.teamA === props.teamBId && l.teamB === props.teamAId)
  )
  if (found) return found.editorialLead
  if (record.value.aWins === record.value.bWins) {
    return `${teamA.value.name} and ${teamB.value.name} have split ${totalGames.value} meetings down the middle.`
  }
  const leader = record.value.aWins > record.value.bWins ? teamA.value : teamB.value
  const trailer = record.value.aWins > record.value.bWins ? teamB.value : teamA.value
  const wins = Math.max(record.value.aWins, record.value.bWins)
  const losses = Math.min(record.value.aWins, record.value.bWins)
  return `${leader.name} leads ${wins} to ${losses} across ${totalGames.value} meetings against ${trailer.name}.`
})

const blowoutCopy = computed(() => {
  if (!record.value.biggestBlowoutMargin || !record.value.biggestBlowoutWinner) return ''
  const winner = getTeam(record.value.biggestBlowoutWinner)
  return `${winner.name} won by ${record.value.biggestBlowoutMargin.toFixed(1)}.`
})

const closeCopy = computed(() => {
  if (!record.value.closestGameMargin) return ''
  return `Decided by ${record.value.closestGameMargin.toFixed(1)} points.`
})

// Recent meetings: pull from lifetimeH2H when available
const meetings = computed(() => {
  const found = lifetimeH2H.find(l =>
    (l.teamA === props.teamAId && l.teamB === props.teamBId) ||
    (l.teamA === props.teamBId && l.teamB === props.teamAId)
  )
  if (!found) return []
  // If reversed, swap scores
  if (found.teamA === props.teamAId) return found.recentMeetings
  return found.recentMeetings.map(m => ({ year: m.year, week: m.week, aScore: m.bScore, bScore: m.aScore }))
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
.rv-root {
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
.rv-backdrop {
  position: absolute; inset: 0;
  background: oklch(0.04 0.014 90 / 0.78);
  opacity: 0;
}
.rv-dialog {
  position: relative;
  width: 100%;
  max-width: 720px;
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
  .rv-backdrop { animation: rv-fade-in 140ms cubic-bezier(0.22, 1, 0.36, 1) forwards; }
  .rv-dialog {
    animation: rv-dialog-in 180ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
    animation-delay: 30ms;
  }
  @keyframes rv-fade-in { to { opacity: 1; } }
  @keyframes rv-dialog-in { to { opacity: 1; transform: scale(1) translateY(0); } }
}
@media (prefers-reduced-motion: reduce) {
  .rv-backdrop, .rv-dialog { opacity: 1; transform: none; }
}

/* Header */
.rv-head { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 12px; }
.rv-title {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 1.35rem;
  line-height: 1.05;
  letter-spacing: -0.005em;
  color: var(--ink-1);
  margin: 0;
  display: inline-flex;
  align-items: baseline;
  gap: 10px;
  flex-wrap: wrap;
}
.rv-title-vs {
  font-size: 0.86rem;
  font-weight: 700;
  color: var(--ink-3);
  letter-spacing: 0.12em;
  text-transform: uppercase;
}
.rv-close {
  width: 32px; height: 32px; display: grid; place-items: center;
  background: transparent;
  border: 1px solid oklch(0.22 0.015 90);
  border-radius: 8px;
  color: var(--ink-2);
  cursor: pointer;
  flex-shrink: 0;
}
.rv-close:hover { color: var(--ink-1); border-color: oklch(0.36 0.015 90); }
.rv-close:active {
  transform: scale(0.97);
  transition-duration: 100ms;
}
.rv-close:focus-visible { outline: 2px solid var(--accent-primary); outline-offset: 2px; }
@media (prefers-reduced-motion: no-preference) {
  .rv-close { transition: color 160ms cubic-bezier(0.22, 1, 0.36, 1), border-color 160ms cubic-bezier(0.22, 1, 0.36, 1); }
}

.rv-lead {
  font-size: 0.96rem;
  line-height: 1.5;
  color: var(--ink-2);
  margin: 0 0 18px;
  max-width: 64ch;
}

/* Tale of the tape */
.rv-tape {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  gap: 16px;
  align-items: center;
  margin-bottom: 16px;
}
.rv-side {
  background: oklch(0.12 0.015 90);
  border: 1px solid oklch(0.18 0.015 90);
  border-radius: 12px;
  padding: 12px 14px;
}
.rv-side-id { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
.rv-avatar {
  width: 44px; height: 44px; border-radius: 10px;
  display: grid; place-items: center;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900; font-size: 0.92rem;
  color: oklch(0.12 0.012 90);
  overflow: hidden;
  flex-shrink: 0;
  box-shadow: 0 6px 18px -8px oklch(0 0 0 / 0.5);
}
.rv-avatar-img { width: 100%; height: 100%; object-fit: cover; display: block; }
.rv-side-name {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900; font-size: 1rem;
  line-height: 1.1;
  color: var(--ink-1); margin: 0;
}
.rv-side-owner {
  font-size: 0.78rem;
  color: var(--ink-3);
  margin: 2px 0 0;
}
.rv-stats {
  margin: 0;
  display: flex; flex-direction: column; gap: 2px;
}
.rv-stat {
  display: flex; align-items: baseline; justify-content: space-between;
  padding: 4px 0;
  border-bottom: 1px dashed oklch(0.16 0.015 90);
}
.rv-stat:last-child { border-bottom: none; }
.rv-stat dt {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.74rem; font-weight: 700;
  letter-spacing: 0.1em; text-transform: uppercase;
  color: var(--ink-3); margin: 0;
}
.rv-stat dd {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900; font-size: 0.96rem;
  color: var(--ink-1);
  font-variant-numeric: tabular-nums;
  margin: 0;
}

.rv-record {
  display: flex; flex-direction: column; align-items: center;
  gap: 4px;
  min-width: 0;
}
.rv-record-num {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: clamp(2.4rem, 7vw, 3.4rem);
  line-height: 0.86;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
}
.rv-record-label {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.7rem; font-weight: 800;
  letter-spacing: 0.14em; text-transform: uppercase;
  color: var(--ink-3);
  text-align: center;
}

/* Combined bar */
.rv-bar {
  height: 26px;
  border-radius: 999px;
  overflow: hidden;
  display: flex;
  background: oklch(0.14 0.015 90);
  border: 1px solid oklch(0.18 0.015 90);
  margin-bottom: 16px;
}
.rv-bar-fill {
  display: grid; place-items: center;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900; font-size: 0.86rem;
  color: oklch(0.10 0.012 90);
  font-variant-numeric: tabular-nums;
}
.rv-bar-num { padding: 0 8px; }

/* Callouts */
.rv-callouts {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 10px;
  margin-bottom: 16px;
}
.rv-callout {
  background: oklch(0.12 0.015 90);
  border: 1px solid oklch(0.18 0.015 90);
  border-radius: 10px;
  padding: 10px 12px;
}
.rv-callout-blowout { border-left: 3px solid var(--accent-secondary); }
.rv-callout-close   { border-left: 3px solid var(--accent-tertiary); }
.rv-callout-eyebrow {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.7rem; font-weight: 800;
  letter-spacing: 0.14em; text-transform: uppercase;
  color: var(--ink-3);
}
.rv-callout-text {
  font-size: 0.92rem;
  color: var(--ink-1);
  margin: 4px 0 0;
}

/* Meetings */
.rv-meetings-eyebrow {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.72rem; font-weight: 800;
  letter-spacing: 0.14em; text-transform: uppercase;
  color: var(--ink-3); margin: 0 0 8px;
}
.rv-meetings-list {
  list-style: none; padding: 0; margin: 0;
  display: flex; flex-direction: column;
}
.rv-meeting {
  display: grid;
  grid-template-columns: 110px 1fr 1fr;
  align-items: center;
  gap: 12px;
  padding: 8px 0;
  border-bottom: 1px solid oklch(0.16 0.015 90);
}
.rv-meeting:last-child { border-bottom: none; }
.rv-meeting-when {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.78rem; font-weight: 700;
  letter-spacing: 0.06em; text-transform: uppercase;
  color: var(--ink-3);
}
.rv-meeting-score {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900; font-size: 1rem;
  color: var(--ink-2);
  font-variant-numeric: tabular-nums;
  display: inline-flex; align-items: baseline; gap: 6px;
}
.rv-meeting-dash {
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--ink-4);
}
.rv-meeting-result {
  font-size: 0.84rem;
  color: var(--ink-2);
  justify-self: end;
  text-align: right;
}

@media (max-width: 640px) {
  .rv-tape {
    grid-template-columns: 1fr;
    gap: 10px;
  }
  .rv-record { order: -1; padding: 6px 0; }
  .rv-meeting { grid-template-columns: 1fr; gap: 2px; padding: 8px 0; }
  .rv-meeting-result { justify-self: start; text-align: left; }
}
</style>
