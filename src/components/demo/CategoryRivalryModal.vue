<template>
  <Teleport to="body">
    <div class="crv-root" role="presentation">
      <div class="crv-backdrop" @click="onClose" aria-hidden="true"></div>
      <div
        ref="dialogRef"
        class="crv-dialog"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="`crv-title-${teamA.id}-${teamB.id}`"
      >
        <header class="crv-head">
          <div class="crv-head-text">
            <p class="crv-head-eyebrow">Tale of the Tape</p>
            <h2 :id="`crv-title-${teamA.id}-${teamB.id}`" class="crv-title">
              {{ teamA.name }} <span class="crv-title-vs">vs</span> {{ teamB.name }}
            </h2>
            <p class="crv-head-sub">All-time comparison across {{ totalMeetings }} meetings.</p>
          </div>
          <button
            ref="closeBtnRef"
            type="button"
            class="crv-close"
            aria-label="Close rivalry detail"
            @click="onClose"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <line x1="5" y1="5" x2="19" y2="19" />
              <line x1="19" y1="5" x2="5" y2="19" />
            </svg>
          </button>
        </header>

        <p v-if="props.overrideNarrative" class="crv-lead">{{ props.overrideNarrative }}</p>
        <p v-else-if="profile?.narrative" class="crv-lead">{{ profile.narrative }}</p>
        <p v-else class="crv-lead">{{ proceduralLead }}</p>

        <!-- Tale of the tape -->
        <section class="crv-tape" aria-label="Tale of the tape">
          <article class="crv-side">
            <div class="crv-side-id">
              <div
                class="crv-avatar"
                :style="{ background: `linear-gradient(135deg, ${teamA.avatarColor})` }"
              >
                <img v-if="teamA.avatarUrl" :src="teamA.avatarUrl" class="crv-avatar-img" alt="" />
                <span v-else>{{ teamA.ownerInitials }}</span>
              </div>
              <div>
                <p class="crv-side-name">{{ teamA.name }}</p>
                <p class="crv-side-owner">{{ teamA.ownerName }}</p>
              </div>
            </div>
            <dl class="crv-stats">
              <div class="crv-stat"><dt>Championships</dt><dd>{{ careerA.titles }}</dd></div>
              <div class="crv-stat"><dt>Seasons</dt><dd>{{ careerA.seasonsPlayed }}</dd></div>
              <div class="crv-stat"><dt>Vs opponent</dt><dd>{{ recordA }}</dd></div>
              <div class="crv-stat"><dt>Cat diff</dt><dd :class="catDiffA >= 0 ? 'crv-stat-pos' : 'crv-stat-neg'">{{ formatDiff(catDiffA) }}</dd></div>
            </dl>
          </article>

          <div class="crv-record" aria-label="Series record">
            <span class="crv-record-eyebrow">Head-to-head</span>
            <span
              class="crv-record-num"
              :style="{ color: leaderAccent }"
            >{{ recordA }}</span>
            <span class="crv-record-label">{{ leaderLabel }}</span>
            <span class="crv-record-meetings">{{ totalMeetings }} meetings</span>
          </div>

          <article class="crv-side">
            <div class="crv-side-id">
              <div
                class="crv-avatar"
                :style="{ background: `linear-gradient(135deg, ${teamB.avatarColor})` }"
              >
                <img v-if="teamB.avatarUrl" :src="teamB.avatarUrl" class="crv-avatar-img" alt="" />
                <span v-else>{{ teamB.ownerInitials }}</span>
              </div>
              <div>
                <p class="crv-side-name">{{ teamB.name }}</p>
                <p class="crv-side-owner">{{ teamB.ownerName }}</p>
              </div>
            </div>
            <dl class="crv-stats">
              <div class="crv-stat"><dt>Championships</dt><dd>{{ careerB.titles }}</dd></div>
              <div class="crv-stat"><dt>Seasons</dt><dd>{{ careerB.seasonsPlayed }}</dd></div>
              <div class="crv-stat"><dt>Vs opponent</dt><dd>{{ recordB }}</dd></div>
              <div class="crv-stat"><dt>Cat diff</dt><dd :class="-catDiffA >= 0 ? 'crv-stat-pos' : 'crv-stat-neg'">{{ formatDiff(-catDiffA) }}</dd></div>
            </dl>
          </article>
        </section>

        <!-- Asymmetric stat callouts (varied widths) -->
        <div class="crv-callouts">
          <article class="crv-callout crv-callout-blowout">
            <span class="crv-callout-eyebrow">Biggest blowout</span>
            <p class="crv-callout-text">{{ blowoutText }}</p>
          </article>
          <article class="crv-callout crv-callout-close">
            <span class="crv-callout-eyebrow">Closest game</span>
            <p class="crv-callout-text">{{ closestText }}</p>
          </article>
          <article class="crv-callout crv-callout-margin">
            <span class="crv-callout-eyebrow">Series margin</span>
            <p class="crv-callout-text">
              <strong :style="{ color: catDiffA >= 0 ? 'var(--accent-up)' : 'var(--accent-secondary)' }">{{ formatDiff(catDiffA) }}</strong>
              cats from A's view.
            </p>
          </article>
        </div>

        <!-- Recent meetings -->
        <section v-if="meetings.length" class="crv-meetings" aria-label="Recent meetings">
          <p class="crv-meetings-eyebrow">Recent meetings</p>
          <ol class="crv-meetings-list">
            <li v-for="(m, i) in meetings" :key="i" class="crv-meeting">
              <span class="crv-meeting-when">{{ m.year }} · Wk {{ m.week }}</span>
              <span class="crv-meeting-cats">
                <span class="crv-meeting-team">{{ teamA.name.split(' ')[0] }}</span>
                <span
                  class="crv-meeting-num"
                  :style="m.catDiffA >= 0 ? { color: accentA } : null"
                >{{ aWinsOf(m.recordA) }}</span>
                <span class="crv-meeting-dash" aria-hidden="true">vs</span>
                <span
                  class="crv-meeting-num"
                  :style="m.catDiffA <= 0 ? { color: accentB } : null"
                >{{ bWinsOf(m.recordA) }}</span>
                <span class="crv-meeting-team">{{ teamB.name.split(' ')[0] }}</span>
              </span>
              <span class="crv-meeting-margin">
                <span v-if="m.catDiffA > 0" :style="{ color: accentA }">+{{ m.catDiffA }} cats</span>
                <span v-else-if="m.catDiffA < 0" :style="{ color: accentB }">{{ m.catDiffA }} cats</span>
                <span v-else class="crv-meeting-tie">tied</span>
              </span>
            </li>
          </ol>
        </section>

        <footer class="crv-foot">
          <button type="button" class="crv-share" @click="emit('open-signup')">
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
  getTeam,
  h2hMatrix,
  teamCareerStats,
  rivalryProfiles,
} from '@/fixtures/categoriesLeague'
import { accentFor } from '@/utils/teamColor'
import { useDemoModal } from '@/composables/useDemoModal'

const props = defineProps<{
  teamAId: string
  teamBId: string
  /** Editorial-supplied narrative override. When present, takes precedence
   *  over both the authored profile narrative and the procedural fallback —
   *  the live-data pipeline supplies this when wiring against real leagues. */
  overrideNarrative?: string | null
}>()
const emit = defineEmits<{ (e: 'close'): void; (e: 'open-signup'): void }>()

const teamA = computed(() => getTeam(props.teamAId))
const teamB = computed(() => getTeam(props.teamBId))
const careerA = computed(() => teamCareerStats[props.teamAId])
const careerB = computed(() => teamCareerStats[props.teamBId])

// Resolve H2H cell from the canonical alphabetized matrix.
// If A > B alphabetically, swap and invert.
const resolved = computed(() => {
  const a = props.teamAId
  const b = props.teamBId
  if (a < b) {
    const cell = h2hMatrix.find((c) => c.teamA === a && c.teamB === b)
    if (cell) return { recordA: cell.recordA, catDiffA: cell.catDiffA, meetings: cell.meetings, swapped: false }
  } else {
    const cell = h2hMatrix.find((c) => c.teamA === b && c.teamB === a)
    if (cell) {
      // invert: aWins-bWins-ties → bWins-aWins-ties; catDiff sign flips
      const m = cell.recordA.match(/^(\d+)-(\d+)-(\d+)$/)
      const inverted = m ? `${m[2]}-${m[1]}-${m[3]}` : cell.recordA
      return { recordA: inverted, catDiffA: -cell.catDiffA, meetings: cell.meetings, swapped: true }
    }
  }
  return { recordA: '0-0-0', catDiffA: 0, meetings: 0, swapped: false }
})

const recordA = computed(() => resolved.value.recordA)
const catDiffA = computed(() => resolved.value.catDiffA)
const totalMeetings = computed(() => resolved.value.meetings)

const recordB = computed(() => {
  const m = recordA.value.match(/^(\d+)-(\d+)-(\d+)$/)
  return m ? `${m[2]}-${m[1]}-${m[3]}` : recordA.value
})

function aWinsOf(rec: string): string { return rec.split('-')[0] ?? '0' }
function bWinsOf(rec: string): string { return rec.split('-')[1] ?? '0' }

function parseAWins(rec: string): number {
  const m = rec.match(/^(\d+)-(\d+)-(\d+)$/)
  return m ? parseInt(m[1], 10) : 0
}
function parseBWins(rec: string): number {
  const m = rec.match(/^(\d+)-(\d+)-(\d+)$/)
  return m ? parseInt(m[2], 10) : 0
}

const accentA = computed(() => accentFor(teamA.value))
const accentB = computed(() => accentFor(teamB.value))

const leaderLabel = computed(() => {
  const aw = parseAWins(recordA.value)
  const bw = parseBWins(recordA.value)
  if (aw === bw) return 'Series even'
  return aw > bw ? `${teamA.value.name} leads` : `${teamB.value.name} leads`
})
const leaderAccent = computed(() => {
  const aw = parseAWins(recordA.value)
  const bw = parseBWins(recordA.value)
  if (aw === bw) return 'var(--ink-2)'
  return aw > bw ? accentA.value : accentB.value
})

/* Profile lookup — featured rivalries carry authored prose + meeting list. */
const profile = computed(() => {
  const a = props.teamAId
  const b = props.teamBId
  const pk1 = a < b ? `${a}-${b}` : `${b}-${a}`
  const found = rivalryProfiles.find((p) => p.pairKey === pk1)
  if (!found) return null
  // If the call-site swapped team order versus authored profile, invert meetings.
  if (found.teamA === a && found.teamB === b) return found
  // Need to invert: swap teamA/B view of meetings
  return {
    ...found,
    teamA: a,
    teamB: b,
    recordA: invertRecord(found.recordA),
    catDiffA: -found.catDiffA,
    mostRecentMeetings: found.mostRecentMeetings.map((m) => ({
      ...m,
      recordA: invertRecord(m.recordA, true),
      catDiffA: -m.catDiffA,
    })),
  }
})

function invertRecord(rec: string, dashSeparator = false): string {
  if (dashSeparator) {
    // "7-4" style (cat wins per matchup, no ties)
    const m = rec.match(/^(\d+)-(\d+)$/)
    return m ? `${m[2]}-${m[1]}` : rec
  }
  const m = rec.match(/^(\d+)-(\d+)-(\d+)$/)
  return m ? `${m[2]}-${m[1]}-${m[3]}` : rec
}

const proceduralLead = computed(() => {
  if (totalMeetings.value === 0) {
    return `${teamA.value.name} and ${teamB.value.name} have not met.`
  }
  const aw = parseAWins(recordA.value)
  const bw = parseBWins(recordA.value)
  if (aw === bw) {
    return `${teamA.value.name} and ${teamB.value.name} are tied at ${aw}-${bw} across ${totalMeetings.value} meetings. No marquee history yet.`
  }
  const leader = aw > bw ? teamA.value.name : teamB.value.name
  const trailer = aw > bw ? teamB.value.name : teamA.value.name
  const diffText = catDiffA.value === 0 ? 'even in cats' :
    catDiffA.value > 0 ? `${teamA.value.name.split(' ')[0]} +${catDiffA.value} cats` :
    `${teamB.value.name.split(' ')[0]} +${Math.abs(catDiffA.value)} cats`
  return `${leader} leads ${Math.max(aw, bw)}-${Math.min(aw, bw)} across ${totalMeetings.value} meetings against ${trailer}. ${diffText} in the series.`
})

const blowoutText = computed(() => {
  if (profile.value?.biggestBlowoutDescription) return profile.value.biggestBlowoutDescription
  if (totalMeetings.value === 0) return 'No meetings on record.'
  return 'No marquee blowout in the archive.'
})
const closestText = computed(() => {
  if (profile.value?.closestGameDescription) return profile.value.closestGameDescription
  if (totalMeetings.value === 0) return 'No meetings on record.'
  return 'No marquee close game in the archive.'
})

const meetings = computed(() => profile.value?.mostRecentMeetings ?? [])

function formatDiff(n: number): string {
  if (n > 0) return `+${n}`
  if (n < 0) return `${n}`
  return '0'
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
.crv-root {
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
  --accent-primary:   oklch(0.78 0.18 92);
  --accent-secondary: oklch(0.70 0.27 350);
  --accent-tertiary:  oklch(0.72 0.18 195);
  --accent-up:        oklch(0.74 0.18 145);
  font-family: 'Barlow', sans-serif;
  color: var(--ink-1);
}
.crv-backdrop {
  position: absolute; inset: 0;
  background: oklch(0.04 0.014 90 / 0.78);
  opacity: 0;
}
.crv-dialog {
  position: relative;
  width: 100%;
  max-width: 760px;
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
  .crv-backdrop { animation: crv-fade-in 140ms cubic-bezier(0.22, 1, 0.36, 1) forwards; }
  .crv-dialog {
    animation: crv-dialog-in 180ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
    animation-delay: 30ms;
  }
  @keyframes crv-fade-in { to { opacity: 1; } }
  @keyframes crv-dialog-in { to { opacity: 1; transform: scale(1) translateY(0); } }
}
@media (prefers-reduced-motion: reduce) {
  .crv-backdrop, .crv-dialog { opacity: 1; transform: none; }
}

/* Header */
.crv-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 12px; }
.crv-head-text { min-width: 0; }
.crv-head-eyebrow {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.72rem; font-weight: 800;
  letter-spacing: 0.16em; text-transform: uppercase;
  color: var(--accent-tertiary);
  margin: 0 0 4px;
}
.crv-title {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 1.4rem;
  line-height: 1.05;
  letter-spacing: -0.005em;
  color: var(--ink-1);
  margin: 0 0 4px;
  display: inline-flex;
  align-items: baseline;
  gap: 10px;
  flex-wrap: wrap;
}
.crv-title-vs {
  font-size: 0.86rem;
  font-weight: 700;
  color: var(--ink-3);
  letter-spacing: 0.12em;
  text-transform: uppercase;
}
.crv-head-sub { margin: 0; font-size: 0.86rem; color: var(--ink-3); }
.crv-close {
  width: 32px; height: 32px; display: grid; place-items: center;
  background: transparent;
  border: 1px solid oklch(0.22 0.015 90);
  border-radius: 8px;
  color: var(--ink-2);
  cursor: pointer;
  flex-shrink: 0;
}
.crv-close:hover { color: var(--ink-1); border-color: oklch(0.36 0.015 90); }
.crv-close:active { transform: scale(0.97); transition-duration: 100ms; }
.crv-close:focus-visible { outline: 2px solid var(--accent-primary); outline-offset: 2px; }
@media (prefers-reduced-motion: no-preference) {
  .crv-close { transition: color 160ms cubic-bezier(0.22, 1, 0.36, 1), border-color 160ms cubic-bezier(0.22, 1, 0.36, 1); }
}

.crv-lead {
  font-size: 0.96rem;
  line-height: 1.5;
  color: var(--ink-2);
  margin: 0 0 18px;
  max-width: 64ch;
}

/* Tale of the tape — 3 columns */
.crv-tape {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  gap: 14px;
  align-items: stretch;
  margin-bottom: 16px;
}
.crv-side {
  background: oklch(0.12 0.015 90);
  border: 1px solid oklch(0.18 0.015 90);
  border-radius: 12px;
  padding: 12px 14px;
}
.crv-side-id { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
.crv-avatar {
  width: 44px; height: 44px; border-radius: 10px;
  display: grid; place-items: center;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900; font-size: 0.92rem;
  color: oklch(0.12 0.012 90);
  overflow: hidden;
  flex-shrink: 0;
  box-shadow: 0 6px 18px -8px oklch(0 0 0 / 0.5);
}
.crv-avatar-img { width: 100%; height: 100%; object-fit: cover; display: block; }
.crv-side-name {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900; font-size: 1rem;
  line-height: 1.1;
  color: var(--ink-1); margin: 0;
}
.crv-side-owner {
  font-size: 0.78rem;
  color: var(--ink-3);
  margin: 2px 0 0;
}
.crv-stats {
  margin: 0;
  display: flex; flex-direction: column; gap: 2px;
}
.crv-stat {
  display: flex; align-items: baseline; justify-content: space-between;
  padding: 4px 0;
  border-bottom: 1px dashed oklch(0.16 0.015 90);
}
.crv-stat:last-child { border-bottom: none; }
.crv-stat dt {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.74rem; font-weight: 700;
  letter-spacing: 0.1em; text-transform: uppercase;
  color: var(--ink-3); margin: 0;
}
.crv-stat dd {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900; font-size: 0.96rem;
  color: var(--ink-1);
  font-variant-numeric: tabular-nums;
  margin: 0;
}
.crv-stat-pos { color: var(--accent-up) !important; }
.crv-stat-neg { color: var(--accent-secondary) !important; }

.crv-record {
  display: flex; flex-direction: column; align-items: center;
  justify-content: center;
  gap: 4px;
  min-width: 0;
  padding: 8px 6px;
}
.crv-record-eyebrow {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.68rem; font-weight: 800;
  letter-spacing: 0.14em; text-transform: uppercase;
  color: var(--ink-3);
}
.crv-record-num {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: clamp(2.4rem, 7vw, 3.2rem);
  line-height: 0.86;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
}
.crv-record-label {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.7rem; font-weight: 800;
  letter-spacing: 0.14em; text-transform: uppercase;
  color: var(--ink-2);
  text-align: center;
  max-width: 14ch;
}
.crv-record-meetings {
  font-size: 0.74rem;
  color: var(--ink-4);
  margin-top: 4px;
}

/* Callouts — varied widths via auto-fit, but the third spans wider */
.crv-callouts {
  display: grid;
  grid-template-columns: 1fr 1fr 1.4fr;
  gap: 10px;
  margin-bottom: 16px;
}
.crv-callout {
  background: oklch(0.12 0.015 90);
  border: 1px solid oklch(0.18 0.015 90);
  border-radius: 10px;
  padding: 10px 12px;
}
.crv-callout-blowout { border-left: 3px solid var(--accent-secondary); }
.crv-callout-close   { border-left: 3px solid var(--accent-tertiary); }
.crv-callout-margin  { border-left: 3px solid var(--accent-up); }
.crv-callout-eyebrow {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.7rem; font-weight: 800;
  letter-spacing: 0.14em; text-transform: uppercase;
  color: var(--ink-3);
}
.crv-callout-text {
  font-size: 0.92rem;
  color: var(--ink-1);
  margin: 4px 0 0;
  line-height: 1.4;
}
.crv-callout-text strong {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 1rem;
  font-variant-numeric: tabular-nums;
}

@media (max-width: 720px) {
  .crv-tape { grid-template-columns: 1fr; gap: 10px; }
  .crv-record { order: -1; padding: 6px 0; }
  .crv-callouts { grid-template-columns: 1fr; }
}

/* Meetings */
.crv-meetings-eyebrow {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.72rem; font-weight: 800;
  letter-spacing: 0.14em; text-transform: uppercase;
  color: var(--ink-3); margin: 0 0 8px;
}
.crv-meetings-list {
  list-style: none; padding: 0; margin: 0;
  display: flex; flex-direction: column;
}
.crv-meeting {
  display: grid;
  grid-template-columns: 100px 1fr auto;
  align-items: center;
  gap: 12px;
  padding: 8px 0;
  border-bottom: 1px solid oklch(0.16 0.015 90);
}
.crv-meeting:last-child { border-bottom: none; }
.crv-meeting-when {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.78rem; font-weight: 700;
  letter-spacing: 0.06em; text-transform: uppercase;
  color: var(--ink-3);
}
.crv-meeting-cats {
  display: inline-flex; align-items: baseline; gap: 8px;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: 0.88rem;
  color: var(--ink-2);
}
.crv-meeting-team {
  font-size: 0.72rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ink-4);
  font-weight: 700;
}
.crv-meeting-num {
  font-weight: 900; font-size: 1.1rem;
  color: var(--ink-1);
  font-variant-numeric: tabular-nums;
}
.crv-meeting-dash {
  font-size: 0.74rem;
  font-weight: 700;
  color: var(--ink-4);
  letter-spacing: 0.1em; text-transform: uppercase;
}
.crv-meeting-margin {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: 0.86rem;
  letter-spacing: 0.04em;
  color: var(--ink-2);
  font-variant-numeric: tabular-nums;
  text-align: right;
}
.crv-meeting-tie { color: var(--ink-4); }

@media (max-width: 640px) {
  .crv-meeting { grid-template-columns: 1fr; gap: 4px; padding: 10px 0; }
  .crv-meeting-margin { text-align: left; }
}

/* Footer */
.crv-foot {
  display: flex;
  justify-content: flex-end;
  margin-top: 18px;
  padding-top: 14px;
  border-top: 1px solid oklch(0.16 0.015 90);
}
.crv-share {
  display: inline-flex; align-items: center; gap: 8px;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800; font-size: 0.82rem;
  letter-spacing: 0.08em; text-transform: uppercase;
  color: var(--ink-2);
  background: transparent;
  border: 1px solid oklch(0.28 0.015 90);
  padding: 8px 14px;
  border-radius: 999px;
  cursor: pointer;
}
.crv-share:hover { color: var(--ink-1); border-color: oklch(0.44 0.015 90); }
.crv-share:active { transform: scale(0.97); transition-duration: 100ms; }
.crv-share:focus-visible { outline: 2px solid var(--accent-primary); outline-offset: 2px; }
@media (prefers-reduced-motion: no-preference) {
  .crv-share { transition: color 160ms cubic-bezier(0.22, 1, 0.36, 1), border-color 160ms cubic-bezier(0.22, 1, 0.36, 1); }
}
</style>
