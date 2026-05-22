<template>
  <Teleport to="body">
    <div class="ts-root" role="presentation">
      <div class="ts-backdrop" @click="onClose" aria-hidden="true"></div>
      <div
        ref="dialogRef"
        class="ts-dialog"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="`ts-title-${team.id}`"
      >
        <!-- ────────────────────────────────────────────────
             HEADER STRIP — avatar, name, manager, share/close
        ──────────────────────────────────────────────── -->
        <header class="ts-head">
          <div class="ts-head-id">
            <div
              class="ts-avatar"
              :style="{ background: `linear-gradient(135deg, ${team.avatarColor})` }"
            >
              <img v-if="team.avatarUrl" :src="team.avatarUrl" class="ts-avatar-img" alt="" />
              <span v-else>{{ team.ownerInitials }}</span>
            </div>
            <div class="ts-head-text">
              <h2 :id="`ts-title-${team.id}`" class="ts-title">{{ team.name }}</h2>
              <p class="ts-sub">{{ team.ownerName }} <span class="ts-sub-dot" aria-hidden="true">·</span> 2025 season</p>
            </div>
          </div>
          <div class="ts-head-actions">
            <button
              type="button"
              class="ts-share"
              aria-label="Share team season recap"
              @click="emit('open-signup')"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                <polyline points="16 6 12 2 8 6" />
                <line x1="12" y1="2" x2="12" y2="15" />
              </svg>
              Share
            </button>
            <button
              ref="closeBtnRef"
              type="button"
              class="ts-close"
              aria-label="Close team season detail"
              @click="onClose"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <line x1="5" y1="5" x2="19" y2="19" />
                <line x1="19" y1="5" x2="5" y2="19" />
              </svg>
            </button>
          </div>
        </header>

        <!-- ────────────────────────────────────────────────
             SECTION 1 — Scene-setting sentence (no KPI grid)
        ──────────────────────────────────────────────── -->
        <p class="ts-sentence">
          <template v-for="(part, i) in sceneParts" :key="i">
            <span v-if="part.type === 'kpi'" class="kpi-inline" :style="{ color: 'var(--accent-tertiary)' }">{{ part.text }}</span>
            <template v-else>{{ part.text }}</template>
          </template>
        </p>

        <!-- ────────────────────────────────────────────────
             SECTION 2 — Points per Week chart
        ──────────────────────────────────────────────── -->
        <section class="ts-chart-wrap" aria-labelledby="ts-chart-label">
          <header class="ts-chart-head">
            <p id="ts-chart-label" class="ts-eyebrow">Points per Week</p>
            <div class="ts-legend">
              <span class="ts-legend-item">
                <span class="ts-legend-dot" :style="{ background: teamAccent }" aria-hidden="true"></span>
                {{ team.name }}
              </span>
              <span class="ts-legend-item">
                <span class="ts-legend-dash" aria-hidden="true"></span>
                League avg
              </span>
            </div>
          </header>

          <svg
            class="ts-chart"
            :viewBox="`0 0 ${CHART_W} ${CHART_H}`"
            role="img"
            :aria-label="`Points per week for ${team.name} versus league average`"
            preserveAspectRatio="none"
          >
            <!-- Gridlines -->
            <g class="ts-grid" aria-hidden="true">
              <line
                v-for="gy in gridY"
                :key="`gl-${gy.value}`"
                :x1="CHART_PAD_L"
                :x2="CHART_W - CHART_PAD_R"
                :y1="gy.y"
                :y2="gy.y"
              />
              <text
                v-for="gy in gridY"
                :key="`gt-${gy.value}`"
                class="ts-grid-label"
                :x="CHART_PAD_L - 8"
                :y="gy.y + 3"
                text-anchor="end"
              >{{ gy.value }}</text>
            </g>

            <!-- League average dashed line -->
            <path
              class="ts-line-avg"
              :d="avgPath"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-dasharray="4 4"
            />

            <!-- Team line -->
            <path
              class="ts-line-team"
              :d="teamPath"
              fill="none"
              :stroke="teamAccent"
              stroke-width="2.5"
              stroke-linecap="round"
              stroke-linejoin="round"
              opacity="0.95"
            />

            <!-- X axis week labels -->
            <g class="ts-x-labels" aria-hidden="true">
              <text
                v-for="(_, i) in weekXs"
                :key="`xl-${i}`"
                class="ts-x-label"
                :x="weekXs[i]"
                :y="CHART_H - 6"
                text-anchor="middle"
              >Wk {{ i + 1 }}</text>
            </g>

            <!-- Season high marker -->
            <g v-if="seasonHigh" class="ts-marker">
              <circle :cx="seasonHigh.x" :cy="seasonHigh.y" r="4" fill="var(--accent-up)" />
              <text
                class="ts-marker-label"
                :x="seasonHigh.labelX"
                :y="seasonHigh.labelY"
                :text-anchor="seasonHigh.anchor"
                fill="var(--accent-up)"
              >Season high: {{ seasonHigh.value.toFixed(1) }} (Wk {{ seasonHigh.week }})</text>
            </g>

            <!-- Season low marker -->
            <g v-if="seasonLow" class="ts-marker">
              <circle :cx="seasonLow.x" :cy="seasonLow.y" r="4" fill="var(--accent-secondary)" />
              <text
                class="ts-marker-label"
                :x="seasonLow.labelX"
                :y="seasonLow.labelY"
                :text-anchor="seasonLow.anchor"
                fill="var(--accent-secondary)"
              >Season low: {{ seasonLow.value.toFixed(1) }} (Wk {{ seasonLow.week }})</text>
            </g>
          </svg>
        </section>

        <!-- ────────────────────────────────────────────────
             SECTION 3 — Schedule timeline (11 weekly cells)
        ──────────────────────────────────────────────── -->
        <section class="ts-timeline-wrap" aria-labelledby="ts-timeline-label">
          <p id="ts-timeline-label" class="ts-eyebrow">Schedule</p>
          <div class="ts-timeline" role="list">
            <div
              v-for="cell in scheduleCells"
              :key="cell.week"
              class="ts-cell"
              role="listitem"
              :aria-label="cell.aria"
            >
              <div
                class="ts-cell-opp"
                :style="{ background: `linear-gradient(135deg, ${cell.opponent.avatarColor})` }"
              >
                <img v-if="cell.opponent.avatarUrl" :src="cell.opponent.avatarUrl" class="ts-cell-opp-img" alt="" />
                <span v-else>{{ cell.opponent.ownerInitials }}</span>
              </div>
              <span
                class="ts-cell-pill"
                :class="cell.played ? `ts-cell-pill-${cell.result.toLowerCase()}` : 'ts-cell-pill-pending'"
              >{{ cell.played ? cell.result : '·' }}</span>
              <span class="ts-cell-score">
                <template v-if="cell.played">{{ cell.teamScore.toFixed(1) }}<span class="ts-cell-dash" aria-hidden="true">-</span>{{ cell.opponentScore.toFixed(1) }}</template>
                <template v-else>Wk {{ cell.week }}</template>
              </span>
              <span class="ts-cell-week" aria-hidden="true">{{ cell.week }}</span>
            </div>
          </div>
        </section>

        <!-- ────────────────────────────────────────────────
             SECTION 4 — Quick stats (text lines, not tiles)
        ──────────────────────────────────────────────── -->
        <section class="ts-facts" aria-labelledby="ts-facts-label">
          <p id="ts-facts-label" class="ts-eyebrow">Season at a glance</p>
          <p class="ts-fact">
            <span class="ts-fact-key">High:</span>
            <strong>{{ highVal.toFixed(1) }}</strong> (Wk {{ highWeek }}).
            <span class="ts-fact-key">Low:</span>
            <strong>{{ lowVal.toFixed(1) }}</strong> (Wk {{ lowWeek }}).
          </p>
          <p class="ts-fact">
            <span class="ts-fact-key">Point differential:</span>
            <strong :style="{ color: pointDiff >= 0 ? 'var(--accent-up)' : 'var(--accent-secondary)' }">
              {{ pointDiff >= 0 ? '+' : '' }}{{ pointDiff.toFixed(1) }}
            </strong>
            across the season.
          </p>
          <p class="ts-fact">
            <span class="ts-fact-key">Streak:</span>
            <strong :style="{ color: standing.streak.startsWith('W') ? 'var(--accent-up)' : 'var(--accent-secondary)' }">{{ standing.streak }}</strong>.
            <span class="ts-fact-key">Last 5:</span>
            <span class="ts-fact-last5">
              <span
                v-for="(r, i) in lastFive"
                :key="i"
                class="ts-fact-l5"
                :class="r === 'W' ? 'ts-fact-l5-w' : 'ts-fact-l5-l'"
              >{{ r }}</span>
            </span>.
          </p>
        </section>

        <!-- ────────────────────────────────────────────────
             SECTION 5 — Footer pills (cross-page nav)
        ──────────────────────────────────────────────── -->
        <footer class="ts-foot">
          <button type="button" class="ts-pill" @click="goMatchups">
            View matchups
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </button>
          <button type="button" class="ts-pill" @click="goPower">
            View in power rankings
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </button>
        </footer>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  getTeam,
  playoffCutoff,
  standings2025Week11,
  teamSeasonStats,
  teamLastFiveResults,
  teamWeeklyResults,
  weeklyPF,
  weeklyLeagueAverage,
} from '@/fixtures/pillarsLeague'
import { accentFor } from '@/utils/teamColor'
import { smoothPath, type Point } from '@/utils/svgPath'

const props = defineProps<{ teamId: string }>()
const emit = defineEmits<{ (e: 'close'): void; (e: 'open-signup'): void }>()
const router = useRouter()

const team = computed(() => getTeam(props.teamId))
const standing = computed(() => standings2025Week11.find((s) => s.teamId === props.teamId)!)
const stats = computed(() => teamSeasonStats[props.teamId])
const teamPF = computed(() => weeklyPF[props.teamId])
const results = computed(() => teamWeeklyResults[props.teamId])
const lastFive = computed(() => teamLastFiveResults[props.teamId] ?? [])

// First OKLCH stop in the avatar gradient = team accent.
const teamAccent = computed(() => accentFor(team.value))

/* ─── Scene-setting sentence ─────────────────────────────────────
   Three rank-tiered variants so all 10 modals don't read the same.
   Top 3: lead with rank, end with PPG.
   Mid 4-7: lead with record, end with all-play.
   Bottom 3: lead with PPG, end with rank.
   "You're 1 game from the playoff bubble." is appended for jc only.
─────────────────────────────────────────────────────────────────── */
interface SentencePart { type: 'text' | 'kpi'; text: string }

const sceneParts = computed<SentencePart[]>(() => {
  const s = standing.value
  const ps = stats.value
  const rank = s.rank
  const record = `${s.wins}-${s.losses}${s.ties ? `-${s.ties}` : ''}`
  const rankStr = `#${rank}`
  const allPlay = `${ps.allPlayWins}-${ps.allPlayLosses} all-play`
  const ppg = `${ps.pointsPerWeek.toFixed(1)} points per game`

  let parts: SentencePart[]

  if (rank <= 3) {
    // Lead with rank, end with PPG.
    parts = [
      { type: 'kpi', text: rankStr },
      { type: 'text', text: ' in the league, ' },
      { type: 'kpi', text: record },
      { type: 'text', text: ' record, ' },
      { type: 'kpi', text: allPlay },
      { type: 'text', text: ', ' },
      { type: 'kpi', text: ppg },
      { type: 'text', text: '.' },
    ]
  } else if (rank <= 7) {
    // Lead with record, end with all-play.
    parts = [
      { type: 'kpi', text: record },
      { type: 'text', text: ' record, ' },
      { type: 'kpi', text: rankStr },
      { type: 'text', text: ' in the league, ' },
      { type: 'kpi', text: ppg },
      { type: 'text', text: ', ' },
      { type: 'kpi', text: allPlay },
      { type: 'text', text: '.' },
    ]
  } else {
    // Lead with PPG, end with rank.
    parts = [
      { type: 'kpi', text: ppg },
      { type: 'text', text: ', ' },
      { type: 'kpi', text: record },
      { type: 'text', text: ' record, ' },
      { type: 'kpi', text: allPlay },
      { type: 'text', text: ', ' },
      { type: 'kpi', text: rankStr },
      { type: 'text', text: ' in the league.' },
    ]
  }

  // jc tail: "You're 1 game from the playoff bubble."
  if (team.value.isMyTeam) {
    const cutoffTeam = standings2025Week11.find((t) => t.rank === playoffCutoff)
    const gamesBack = cutoffTeam ? Math.max(0, cutoffTeam.wins - s.wins) : 0
    parts = [
      ...parts,
      { type: 'text', text: " You're " },
      { type: 'kpi', text: `${gamesBack} game${gamesBack === 1 ? '' : 's'}` },
      { type: 'text', text: ' from the playoff bubble.' },
    ]
  }

  return parts
})

/* ─── Chart geometry ─────────────────────────────────────────────
   720×220 SVG canvas; Y-domain 50→160; gridlines at 75/100/125/150.
─────────────────────────────────────────────────────────────────── */
const CHART_W = 720
const CHART_H = 220
const CHART_PAD_L = 38
const CHART_PAD_R = 18
const CHART_PAD_T = 16
const CHART_PAD_B = 22
const Y_MIN = 50
const Y_MAX = 160
const WEEKS = 11

function xForWeek(week: number): number {
  // week 1..11 → padded x
  return CHART_PAD_L + ((week - 1) / (WEEKS - 1)) * (CHART_W - CHART_PAD_L - CHART_PAD_R)
}
function yForValue(v: number): number {
  const clamped = Math.max(Y_MIN, Math.min(Y_MAX, v))
  const t = (clamped - Y_MIN) / (Y_MAX - Y_MIN)
  // Higher value = higher on chart (smaller y).
  return CHART_PAD_T + (1 - t) * (CHART_H - CHART_PAD_T - CHART_PAD_B)
}

const gridY = computed(() =>
  [75, 100, 125, 150].map((v) => ({ value: v, y: yForValue(v) })),
)
const weekXs = computed(() => Array.from({ length: WEEKS }, (_, i) => xForWeek(i + 1)))

// Points filtered to weeks the team has played (PF > 0). Keeps the line from crashing to 0 at W11 for upcoming.
interface ChartPoint { x: number; y: number; value: number; week: number }
function pointsFor(arr: number[]): ChartPoint[] {
  const out: ChartPoint[] = []
  arr.forEach((v, idx) => {
    if (v > 0) out.push({ x: xForWeek(idx + 1), y: yForValue(v), value: v, week: idx + 1 })
  })
  return out
}

const teamPoints = computed(() => pointsFor(teamPF.value))
const avgPoints = computed(() =>
  weeklyLeagueAverage.map((v, idx) => ({ x: xForWeek(idx + 1), y: yForValue(v), value: v, week: idx + 1 })),
)

const teamPath = computed(() => smoothPath(teamPoints.value as Point[]))
const avgPath = computed(() => smoothPath(avgPoints.value as Point[]))

/* ─── Season high / low markers ───────────────────────────────── */
interface MarkerInfo { x: number; y: number; value: number; week: number; labelX: number; labelY: number; anchor: 'start' | 'middle' | 'end' }

function markerFor(value: number, week: number, isHigh: boolean): MarkerInfo {
  const x = xForWeek(week)
  const y = yForValue(value)
  // Keep labels inside the canvas. Anchor flips based on x position.
  const nearLeft = x < CHART_PAD_L + 90
  const nearRight = x > CHART_W - CHART_PAD_R - 90
  const anchor: 'start' | 'middle' | 'end' = nearLeft ? 'start' : nearRight ? 'end' : 'middle'
  const labelX = anchor === 'start' ? x + 8 : anchor === 'end' ? x - 8 : x
  // High labels above the dot, low labels below.
  const labelY = isHigh ? y - 8 : y + 16
  return { x, y, value, week, labelX, labelY, anchor }
}

const seasonHigh = computed<MarkerInfo | null>(() => {
  const played = teamPF.value
    .map((v, i) => ({ v, week: i + 1 }))
    .filter((p) => p.v > 0)
  if (played.length === 0) return null
  const top = played.reduce((a, b) => (b.v > a.v ? b : a))
  return markerFor(top.v, top.week, true)
})

const seasonLow = computed<MarkerInfo | null>(() => {
  const played = teamPF.value
    .map((v, i) => ({ v, week: i + 1 }))
    .filter((p) => p.v > 0)
  if (played.length === 0) return null
  const bot = played.reduce((a, b) => (b.v < a.v ? b : a))
  return markerFor(bot.v, bot.week, false)
})

/* ─── Schedule timeline cells ───────────────────────────────── */
interface ScheduleCell {
  week: number
  opponent: ReturnType<typeof getTeam>
  played: boolean
  result: 'W' | 'L'
  teamScore: number
  opponentScore: number
  aria: string
}

const scheduleCells = computed<ScheduleCell[]>(() => {
  return results.value.map((r) => {
    const opp = getTeam(r.opponentId)
    const played = !(r.teamScore === 0 && r.opponentScore === 0)
    return {
      week: r.week,
      opponent: opp,
      played,
      result: r.result,
      teamScore: r.teamScore,
      opponentScore: r.opponentScore,
      aria: played
        ? `Week ${r.week}: ${r.result === 'W' ? 'win' : 'loss'} versus ${opp.name}, ${r.teamScore.toFixed(1)} to ${r.opponentScore.toFixed(1)}`
        : `Week ${r.week}: upcoming versus ${opp.name}`,
    }
  })
})

/* ─── Quick stats numbers ─────────────────────────────────────── */
const played = computed(() => teamPF.value.map((v, i) => ({ v, week: i + 1 })).filter((p) => p.v > 0))
const highVal = computed(() => played.value.reduce((a, b) => (b.v > a.v ? b : a)).v)
const highWeek = computed(() => played.value.reduce((a, b) => (b.v > a.v ? b : a)).week)
const lowVal = computed(() => played.value.reduce((a, b) => (b.v < a.v ? b : a)).v)
const lowWeek = computed(() => played.value.reduce((a, b) => (b.v < a.v ? b : a)).week)
const pointDiff = computed(() => standing.value.pointsFor - standing.value.pointsAgainst)

/* ─── Navigation ──────────────────────────────────────────────── */
function goMatchups() {
  emit('close')
  void router.push('/demo/matchups')
}
function goPower() {
  emit('close')
  void router.push('/demo/power-rankings')
}

/* ─── Focus management + trap ─────────────────────────────────── */
const dialogRef = ref<HTMLElement | null>(null)
const closeBtnRef = ref<HTMLElement | null>(null)

function onClose() {
  emit('close')
}

useDemoModal({ dialogRef, closeBtnRef, onClose })
</script>

<style scoped>
.ts-root {
  position: fixed;
  inset: 0;
  z-index: 210;
  display: grid;
  place-items: center;
  padding: 24px;

  --ink-1: oklch(0.97 0.005 90);
  --ink-2: oklch(0.84 0.008 90);
  --ink-3: oklch(0.62 0.010 90);
  --ink-4: oklch(0.44 0.012 90);
  --ink-5: oklch(0.22 0.015 90);
  --ink-6: oklch(0.14 0.018 90);
  --ink-7: oklch(0.10 0.015 90);

  --accent-primary:   oklch(0.78 0.18 92);   /* YELLOW — my-team identity */
  --accent-secondary: oklch(0.70 0.27 350);  /* MAGENTA — negative / down */
  --accent-tertiary:  oklch(0.72 0.18 195);  /* TEAL — kpi accent */
  --accent-up:        oklch(0.74 0.18 145);  /* GREEN — wins / up */

  font-family: 'Barlow', sans-serif;
  color: var(--ink-1);
}

.ts-backdrop {
  position: absolute;
  inset: 0;
  background: oklch(0.04 0.014 90 / 0.78);
  opacity: 0;
  animation: ts-fade-in 140ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
}
.ts-dialog {
  position: relative;
  width: 100%;
  max-width: 960px;
  max-height: 90vh;
  overflow-y: auto;
  background: oklch(0.10 0.015 90);
  border: 1px solid oklch(0.22 0.015 90);
  border-radius: 20px;
  padding: 26px 30px 24px;
  box-shadow:
    0 28px 72px -28px oklch(0 0 0 / 0.85),
    inset 0 1px 0 oklch(1 0 0 / 0.04);
  opacity: 0;
  transform: scale(0.96) translateY(8px);
  animation: ts-dialog-in 180ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
  animation-delay: 30ms;
}

@media (prefers-reduced-motion: reduce) {
  .ts-backdrop,
  .ts-dialog {
    animation: none;
    opacity: 1;
    transform: none;
  }
}
@keyframes ts-fade-in   { to { opacity: 1; } }
@keyframes ts-dialog-in { to { opacity: 1; transform: scale(1) translateY(0); } }

/* ─── Header ──────────────────────────────────────────────────── */
.ts-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 22px;
  min-height: 64px;
}
.ts-head-id {
  display: flex;
  align-items: center;
  gap: 16px;
  min-width: 0;
}
.ts-avatar {
  width: 64px;
  height: 64px;
  border-radius: 16px;
  display: grid;
  place-items: center;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 1.3rem;
  color: oklch(0.12 0.012 90);
  flex-shrink: 0;
  overflow: hidden;
  box-shadow: 0 10px 28px -12px oklch(0 0 0 / 0.6);
}
.ts-avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.ts-head-text { min-width: 0; }
.ts-title {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 1.75rem;
  line-height: 1.02;
  letter-spacing: -0.012em;
  color: var(--ink-1);
  margin: 0;
}
.ts-sub {
  margin: 4px 0 0;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.84rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ink-3);
}
.ts-sub-dot { color: var(--ink-5); padding: 0 4px; }

.ts-head-actions {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.ts-share {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: 0.78rem;
  letter-spacing: 0.10em;
  text-transform: uppercase;
  color: var(--ink-2);
  background: transparent;
  border: 1px solid oklch(0.28 0.015 90);
  padding: 7px 13px;
  border-radius: 999px;
  cursor: pointer;
  transition: color 160ms cubic-bezier(0.22, 1, 0.36, 1),
              border-color 160ms cubic-bezier(0.22, 1, 0.36, 1);
}
.ts-share:hover { color: var(--ink-1); border-color: oklch(0.44 0.015 90); }
.ts-share:focus-visible { outline: 2px solid var(--accent-primary); outline-offset: 2px; }

.ts-close {
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  background: transparent;
  border: 1px solid oklch(0.22 0.015 90);
  border-radius: 9px;
  color: var(--ink-2);
  cursor: pointer;
  transition: color 160ms cubic-bezier(0.22, 1, 0.36, 1),
              border-color 160ms cubic-bezier(0.22, 1, 0.36, 1);
}
.ts-close:hover { color: var(--ink-1); border-color: oklch(0.36 0.015 90); }
.ts-close:focus-visible { outline: 2px solid var(--accent-primary); outline-offset: 2px; }

/* ─── Section 1: sentence ─────────────────────────────────────── */
.ts-sentence {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 500;
  font-size: 1.4rem;
  line-height: 1.32;
  letter-spacing: -0.002em;
  color: var(--ink-2);
  margin: 0 0 28px;
  max-width: 60ch;
}
.kpi-inline {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 1.6rem;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.004em;
}

/* ─── Section eyebrow (shared) ────────────────────────────────── */
.ts-eyebrow {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--ink-3);
  margin: 0 0 12px;
}

/* ─── Section 2: chart ────────────────────────────────────────── */
.ts-chart-wrap {
  margin-bottom: 32px;
}
.ts-chart-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 6px;
  flex-wrap: wrap;
}
.ts-legend {
  display: inline-flex;
  align-items: center;
  gap: 14px;
}
.ts-legend-item {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.76rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--ink-3);
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.ts-legend-dot {
  width: 9px;
  height: 9px;
  border-radius: 999px;
}
.ts-legend-dash {
  width: 14px;
  height: 2px;
  background: linear-gradient(to right, var(--ink-4) 0 4px, transparent 4px 8px, var(--ink-4) 8px 12px, transparent 12px 14px);
}

.ts-chart {
  width: 100%;
  height: 220px;
  display: block;
  color: var(--ink-4);  /* drives stroke for league avg */
}
.ts-grid line {
  stroke: oklch(0.18 0.015 90);
  stroke-width: 1;
}
.ts-grid-label {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 10px;
  fill: var(--ink-4);
  letter-spacing: 0.04em;
}
.ts-x-label {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 10px;
  fill: var(--ink-4);
  letter-spacing: 0.04em;
}
.ts-marker-label {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.04em;
}

/* ─── Section 3: timeline ─────────────────────────────────────── */
.ts-timeline-wrap {
  margin-bottom: 32px;
}
.ts-timeline {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  scroll-snap-type: x proximity;
  padding-bottom: 6px;
}
.ts-cell {
  flex: 1 1 0;
  min-width: 64px;
  display: grid;
  grid-template-rows: auto auto auto auto;
  justify-items: center;
  gap: 6px;
  padding: 8px 4px 10px;
  border-radius: 10px;
  border-bottom: 1px solid oklch(0.16 0.015 90);
  scroll-snap-align: start;
}
.ts-cell-opp {
  width: 24px;
  height: 24px;
  border-radius: 7px;
  display: grid;
  place-items: center;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 0.6rem;
  color: oklch(0.12 0.012 90);
  overflow: hidden;
  box-shadow: 0 3px 8px -3px oklch(0 0 0 / 0.5);
}
.ts-cell-opp-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.ts-cell-pill {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 0.66rem;
  line-height: 1;
  letter-spacing: 0.08em;
  padding: 3px 7px;
  border-radius: 999px;
  min-height: 12px;
}
.ts-cell-pill-w {
  background: oklch(0.74 0.18 145 / 0.18);
  color: var(--accent-up);
  border: 1px solid oklch(0.74 0.18 145 / 0.4);
}
.ts-cell-pill-l {
  background: oklch(0.70 0.27 350 / 0.18);
  color: var(--accent-secondary);
  border: 1px solid oklch(0.70 0.27 350 / 0.4);
}
.ts-cell-pill-pending {
  background: oklch(0.18 0.015 90);
  color: var(--ink-4);
  border: 1px solid oklch(0.22 0.015 90);
}
.ts-cell-score {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.7rem;
  font-weight: 700;
  color: var(--ink-3);
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.02em;
  white-space: nowrap;
}
.ts-cell-dash {
  color: var(--ink-5);
  padding: 0 2px;
}
.ts-cell-week {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.10em;
  text-transform: uppercase;
  color: var(--ink-4);
}

/* ─── Section 4: facts ────────────────────────────────────────── */
.ts-facts {
  margin-bottom: 28px;
}
.ts-fact {
  font-size: 1rem;
  line-height: 1.55;
  color: var(--ink-2);
  margin: 0 0 6px;
}
.ts-fact:last-child { margin-bottom: 0; }
.ts-fact strong {
  color: var(--ink-1);
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}
.ts-fact-key {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: 0.84rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--ink-3);
  margin-right: 4px;
}
.ts-fact-last5 {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-left: 4px;
}
.ts-fact-l5 {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 0.78rem;
  line-height: 1;
  padding: 3px 6px;
  border-radius: 6px;
  letter-spacing: 0.06em;
}
.ts-fact-l5-w {
  background: oklch(0.74 0.18 145 / 0.18);
  color: var(--accent-up);
}
.ts-fact-l5-l {
  background: oklch(0.70 0.27 350 / 0.18);
  color: var(--accent-secondary);
}

/* ─── Section 5: footer pills ─────────────────────────────────── */
.ts-foot {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  padding-top: 18px;
  border-top: 1px solid oklch(0.16 0.015 90);
}
.ts-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: 0.82rem;
  letter-spacing: 0.10em;
  text-transform: uppercase;
  color: var(--ink-2);
  background: transparent;
  border: 1px solid oklch(0.28 0.015 90);
  padding: 9px 16px;
  border-radius: 999px;
  cursor: pointer;
  transition: color 160ms cubic-bezier(0.22, 1, 0.36, 1),
              border-color 160ms cubic-bezier(0.22, 1, 0.36, 1),
              transform 160ms cubic-bezier(0.22, 1, 0.36, 1);
}
.ts-pill:hover { color: var(--ink-1); border-color: oklch(0.44 0.015 90); }
@media (prefers-reduced-motion: no-preference) {
  .ts-pill:hover { transform: translateX(2px); }
}
.ts-pill:focus-visible { outline: 2px solid var(--accent-primary); outline-offset: 2px; }

/* ─── Responsive ──────────────────────────────────────────────── */
@media (max-width: 640px) {
  .ts-dialog { padding: 20px 18px 18px; }
  .ts-title { font-size: 1.5rem; }
  .ts-sentence { font-size: 1.2rem; }
  .kpi-inline { font-size: 1.35rem; }
  .ts-avatar { width: 56px; height: 56px; }
  .ts-share span { display: none; }
}
</style>
