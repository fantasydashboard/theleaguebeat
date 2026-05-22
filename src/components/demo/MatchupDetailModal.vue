<template>
  <Teleport to="body">
    <div class="mm-root" role="presentation">
      <div class="mm-backdrop" @click="onClose" aria-hidden="true"></div>
      <div
        ref="dialogRef"
        class="mm-dialog"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="`mm-title-${matchup.id}`"
      >
        <!-- ─── HEADER ──────────────────────────────────────────────── -->
        <header class="mm-head">
          <p class="mm-eyebrow">Week {{ matchup.week }}</p>
          <div class="mm-head-faceoff">
            <div class="mm-head-team">
              <div
                class="mm-head-avatar"
                :style="{ background: `linear-gradient(135deg, ${homeTeam.avatarColor})` }"
              >
                <img v-if="homeTeam.avatarUrl" :src="homeTeam.avatarUrl" class="mm-avatar-img" alt="" />
                <span v-else>{{ homeTeam.ownerInitials }}</span>
              </div>
              <h2 :id="`mm-title-${matchup.id}`" class="mm-head-name">{{ homeTeam.name }}</h2>
            </div>
            <span class="mm-head-vs" aria-hidden="true">vs</span>
            <div class="mm-head-team mm-head-team-away">
              <h2 class="mm-head-name">{{ awayTeam.name }}</h2>
              <div
                class="mm-head-avatar"
                :style="{ background: `linear-gradient(135deg, ${awayTeam.avatarColor})` }"
              >
                <img v-if="awayTeam.avatarUrl" :src="awayTeam.avatarUrl" class="mm-avatar-img" alt="" />
                <span v-else>{{ awayTeam.ownerInitials }}</span>
              </div>
            </div>
          </div>

          <div class="mm-head-status">
            <span v-if="matchup.status === 'live'" class="mm-status mm-status-live">
              <span class="mm-status-dot" aria-hidden="true"></span>
              Live
            </span>
            <span v-else-if="matchup.status === 'final'" class="mm-status mm-status-final">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              Final
            </span>
            <span v-else class="mm-status mm-status-upcoming">Upcoming</span>
          </div>

          <button
            ref="closeBtnRef"
            type="button"
            class="mm-close"
            aria-label="Close matchup detail"
            @click="onClose"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <line x1="5" y1="5" x2="19" y2="19" />
              <line x1="19" y1="5" x2="5" y2="19" />
            </svg>
          </button>
        </header>

        <!-- ─── WIN PROBABILITY HERO ────────────────────────────────── -->
        <section class="mm-wp" aria-label="Win probability">
          <div class="mm-wp-team">
            <div
              class="mm-wp-avatar"
              :style="{ background: `linear-gradient(135deg, ${homeTeam.avatarColor})` }"
            >
              <img v-if="homeTeam.avatarUrl" :src="homeTeam.avatarUrl" class="mm-avatar-img" alt="" />
              <span v-else>{{ homeTeam.ownerInitials }}</span>
            </div>
            <p class="mm-wp-name">{{ homeTeam.name }}</p>
            <span class="mm-wp-pct" :style="{ color: homeAccent }">{{ homeWinPct }}%</span>
            <p class="mm-wp-scores">
              <span class="mm-wp-current">{{ matchup.homeScore.toFixed(1) }}</span>
              <span class="mm-wp-sep" aria-hidden="true">·</span>
              <span class="mm-wp-proj">proj {{ matchup.homeProjected.toFixed(1) }}</span>
            </p>
          </div>

          <div class="mm-wp-center">
            <span class="mm-wp-divider" aria-hidden="true"></span>
            <p class="mm-wp-methodology">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <polyline points="23 4 23 10 17 10"/>
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
              </svg>
              <span>{{ methodology }}</span>
            </p>
          </div>

          <div class="mm-wp-team mm-wp-team-away">
            <div
              class="mm-wp-avatar"
              :style="{ background: `linear-gradient(135deg, ${awayTeam.avatarColor})` }"
            >
              <img v-if="awayTeam.avatarUrl" :src="awayTeam.avatarUrl" class="mm-avatar-img" alt="" />
              <span v-else>{{ awayTeam.ownerInitials }}</span>
            </div>
            <p class="mm-wp-name">{{ awayTeam.name }}</p>
            <span class="mm-wp-pct" :style="{ color: awayAccent }">{{ awayWinPct }}%</span>
            <p class="mm-wp-scores">
              <span class="mm-wp-current">{{ matchup.awayScore.toFixed(1) }}</span>
              <span class="mm-wp-sep" aria-hidden="true">·</span>
              <span class="mm-wp-proj">proj {{ matchup.awayProjected.toFixed(1) }}</span>
            </p>
          </div>
        </section>

        <!-- ─── DAILY WIN-PROB CHART ────────────────────────────────── -->
        <section class="mm-chart" aria-labelledby="mm-chart-eyebrow">
          <p class="mm-section-eyebrow mm-section-eyebrow-teal" id="mm-chart-eyebrow">Across the week</p>
          <h3 class="mm-section-headline">How this game shifted.</h3>

          <div class="mm-chart-wrap">
            <svg
              class="mm-chart-svg"
              :viewBox="`0 0 ${CHART_W} ${CHART_H}`"
              preserveAspectRatio="none"
              role="img"
              :aria-label="`Daily win probability across the week. ${homeTeam.name} ${homeWinPct} percent, ${awayTeam.name} ${awayWinPct} percent.`"
            >
              <!-- Gridlines at 25/50/75 -->
              <g class="mm-grid">
                <line v-for="p in [25, 50, 75]" :key="`grid-${p}`"
                  x1="0" :y1="yForPct(p)" :x2="CHART_W" :y2="yForPct(p)" />
                <line class="mm-grid-mid"
                  x1="0" :y1="yForPct(50)" :x2="CHART_W" :y2="yForPct(50)" />
              </g>

              <!-- NOW vertical line -->
              <g v-if="nowX !== null" class="mm-now">
                <line :x1="nowX" :y1="Y_TOP" :x2="nowX" :y2="CHART_H - Y_BOTTOM" />
                <rect :x="nowX - 16" :y="Y_TOP - 16" width="32" height="13" rx="3" />
                <text :x="nowX" :y="Y_TOP - 6.5" text-anchor="middle">NOW</text>
              </g>

              <!-- Home path -->
              <path class="mm-line"
                :d="pathFor(homeSeries)"
                :stroke="homeAccent" />
              <!-- Away path -->
              <path class="mm-line"
                :d="pathFor(awaySeries)"
                :stroke="awayAccent" />

              <!-- Endpoint dots at each day for home -->
              <g v-for="(v, i) in homeSeries" :key="`dot-h-${i}`">
                <circle
                  :cx="xForDay(i)"
                  :cy="yForPct(v)"
                  r="3"
                  :fill="homeAccent"
                />
              </g>
              <g v-for="(v, i) in awaySeries" :key="`dot-a-${i}`">
                <circle
                  :cx="xForDay(i)"
                  :cy="yForPct(v)"
                  r="3"
                  :fill="awayAccent"
                />
              </g>

              <!-- Home value chip at current day -->
              <g v-if="currentDayIndex !== undefined">
                <rect
                  :x="xForDay(currentDayIndex) - 18"
                  :y="yForPct(homeSeries[currentDayIndex]) - 22"
                  width="36" height="15" rx="3"
                  :fill="`oklch(from ${homeAccent} l c h / 0.14)`"
                />
                <text
                  :x="xForDay(currentDayIndex)"
                  :y="yForPct(homeSeries[currentDayIndex]) - 11"
                  text-anchor="middle"
                  class="mm-chip-text"
                  :fill="homeAccent"
                >{{ homeSeries[currentDayIndex] }}%</text>
              </g>
            </svg>

            <ul class="mm-chart-days" aria-hidden="true">
              <li v-for="(d, i) in DAY_LABELS" :key="d" :class="{ 'mm-chart-day-now': i === currentDayIndex }">{{ d }}</li>
            </ul>

            <ul class="mm-chart-legend" role="list">
              <li class="mm-chart-legend-item">
                <span class="mm-chart-legend-swatch" :style="{ background: homeAccent }" aria-hidden="true"></span>
                <span>{{ homeTeam.name }}</span>
              </li>
              <li class="mm-chart-legend-item">
                <span class="mm-chart-legend-swatch" :style="{ background: awayAccent }" aria-hidden="true"></span>
                <span>{{ awayTeam.name }}</span>
              </li>
            </ul>
          </div>
        </section>

        <!-- ─── SCOUTING ────────────────────────────────────────────── -->
        <section class="mm-scout" aria-labelledby="mm-scout-eyebrow">
          <p class="mm-section-eyebrow" id="mm-scout-eyebrow">Scouting</p>

          <div class="mm-scout-grid">
            <article class="mm-scout-col">
              <header class="mm-scout-head">
                <div
                  class="mm-scout-avatar"
                  :style="{ background: `linear-gradient(135deg, ${homeTeam.avatarColor})` }"
                >
                  <img v-if="homeTeam.avatarUrl" :src="homeTeam.avatarUrl" class="mm-avatar-img" alt="" />
                  <span v-else>{{ homeTeam.ownerInitials }}</span>
                </div>
                <div class="mm-scout-head-text">
                  <p class="mm-scout-name">{{ homeTeam.name }}</p>
                  <p class="mm-scout-meta">{{ homeStandings.wins }}-{{ homeStandings.losses }} · #{{ homeStandings.rank }}</p>
                </div>
              </header>
              <p class="mm-scout-body">{{ homeScout }}</p>
              <ul class="mm-form-row" :aria-label="`Last five results for ${homeTeam.name}`" role="list">
                <li v-for="(r, i) in homeForm" :key="`hf-${i}`" :class="['mm-form-pip', r === 'W' ? 'mm-form-pip-win' : 'mm-form-pip-loss']">{{ r }}</li>
              </ul>
            </article>

            <article class="mm-scout-col">
              <header class="mm-scout-head">
                <div
                  class="mm-scout-avatar"
                  :style="{ background: `linear-gradient(135deg, ${awayTeam.avatarColor})` }"
                >
                  <img v-if="awayTeam.avatarUrl" :src="awayTeam.avatarUrl" class="mm-avatar-img" alt="" />
                  <span v-else>{{ awayTeam.ownerInitials }}</span>
                </div>
                <div class="mm-scout-head-text">
                  <p class="mm-scout-name">{{ awayTeam.name }}</p>
                  <p class="mm-scout-meta">{{ awayStandings.wins }}-{{ awayStandings.losses }} · #{{ awayStandings.rank }}</p>
                </div>
              </header>
              <p class="mm-scout-body">{{ awayScout }}</p>
              <ul class="mm-form-row" :aria-label="`Last five results for ${awayTeam.name}`" role="list">
                <li v-for="(r, i) in awayForm" :key="`af-${i}`" :class="['mm-form-pip', r === 'W' ? 'mm-form-pip-win' : 'mm-form-pip-loss']">{{ r }}</li>
              </ul>
            </article>
          </div>
        </section>

        <!-- ─── STATISTICAL COMPARISON ──────────────────────────────── -->
        <section class="mm-stats" aria-labelledby="mm-stats-eyebrow">
          <p class="mm-section-eyebrow" id="mm-stats-eyebrow">Statistical comparison</p>

          <div class="mm-stats-wrap">
            <table class="mm-stats-table">
              <thead>
                <tr>
                  <th scope="col" class="mm-stats-stat">Stat</th>
                  <th scope="col" class="mm-stats-home">{{ homeTeam.name }}</th>
                  <th scope="col" class="mm-stats-adv">Advantage</th>
                  <th scope="col" class="mm-stats-away">{{ awayTeam.name }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in statRows" :key="row.label">
                  <td class="mm-stats-stat">{{ row.label }}</td>
                  <td class="mm-stats-home" :class="{ 'is-winner': row.winner === 'home' }">{{ row.homeDisplay }}</td>
                  <td class="mm-stats-adv">
                    <span
                      v-if="row.winner !== 'tie'"
                      class="mm-adv-chip"
                      :style="{
                        color: row.winner === 'home' ? homeAccent : awayAccent,
                        backgroundColor: row.winner === 'home' ? homeAccentTint : awayAccentTint,
                        borderColor: row.winner === 'home' ? homeAccentBorder : awayAccentBorder,
                      }"
                    >
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <polyline v-if="row.winner === 'home'" points="15 6 9 12 15 18"/>
                        <polyline v-else points="9 6 15 12 9 18"/>
                      </svg>
                      {{ row.magnitude }}
                    </span>
                    <span v-else class="mm-adv-tie">even</span>
                  </td>
                  <td class="mm-stats-away" :class="{ 'is-winner': row.winner === 'away' }">{{ row.awayDisplay }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <!-- ─── LIFETIME SERIES ─────────────────────────────────────── -->
        <section class="mm-lifetime" aria-labelledby="mm-lifetime-eyebrow">
          <p class="mm-section-eyebrow" id="mm-lifetime-eyebrow">Lifetime series</p>

          <template v-if="h2h">
            <p class="mm-lifetime-lead">{{ h2h.editorialLead }}</p>

            <div class="mm-lifetime-record">
              <div class="mm-lifetime-side" :class="{ 'mm-lifetime-side-winner': h2hHomeIsA ? h2h.aWins > h2h.bWins : h2h.bWins > h2h.aWins }">
                <span class="mm-lifetime-name">{{ homeTeam.name }}</span>
                <span class="mm-lifetime-num">{{ h2hHomeIsA ? h2h.aWins : h2h.bWins }}</span>
              </div>
              <span class="mm-lifetime-vs" aria-hidden="true">·</span>
              <div class="mm-lifetime-side" :class="{ 'mm-lifetime-side-winner': h2hHomeIsA ? h2h.bWins > h2h.aWins : h2h.aWins > h2h.bWins }">
                <span class="mm-lifetime-num">{{ h2hHomeIsA ? h2h.bWins : h2h.aWins }}</span>
                <span class="mm-lifetime-name">{{ awayTeam.name }}</span>
              </div>
            </div>

            <ul class="mm-lifetime-meetings" role="list">
              <li v-for="m in h2hMeetings" :key="`${m.year}-${m.week}`" class="mm-lifetime-meeting">
                <span class="mm-lifetime-meeting-year">{{ m.year }}</span>
                <span class="mm-lifetime-meeting-dot" aria-hidden="true">·</span>
                <span class="mm-lifetime-meeting-week">Week {{ m.week }}</span>
                <span class="mm-lifetime-meeting-dot" aria-hidden="true">·</span>
                <span class="mm-lifetime-meeting-body">{{ m.body }}</span>
              </li>
            </ul>
          </template>

          <p v-else class="mm-lifetime-first">
            <span class="mm-lifetime-first-tag">First meeting</span>
            No prior head-to-head history between these two.
          </p>
        </section>

        <!-- ─── WATCH LIST / FOOTER ─────────────────────────────────── -->
        <section class="mm-watch" aria-label="What to watch">
          <p class="mm-watch-eyebrow">What to watch</p>
          <p class="mm-watch-body">{{ watchKey }}</p>
        </section>

        <footer class="mm-foot">
          <button type="button" class="mm-share" @click="emit('open-signup')">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
              <polyline points="16 6 12 2 8 6" />
              <line x1="12" y1="2" x2="12" y2="15" />
            </svg>
            Share matchup
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
  matchupsWeek11,
  dailyWinProb,
  teamScoutingReports,
  teamLastFiveResults,
  lifetimeH2H,
  matchupComparison,
  matchupWatchKey,
  standings2025Week11,
} from '@/fixtures/pillarsLeague'
import { accentFor } from '@/utils/teamColor'
import { smoothPath, type Point } from '@/utils/svgPath'
import { useDemoModal } from '@/composables/useDemoModal'

const props = defineProps<{ matchupId: string }>()
const emit = defineEmits<{ (e: 'close'): void; (e: 'open-signup'): void }>()

const matchup = computed(() => matchupsWeek11.find((m) => m.id === props.matchupId)!)
const homeTeam = computed(() => getTeam(matchup.value.homeTeamId))
const awayTeam = computed(() => getTeam(matchup.value.awayTeamId))
const homeStandings = computed(() => standings2025Week11.find((s) => s.teamId === matchup.value.homeTeamId)!)
const awayStandings = computed(() => standings2025Week11.find((s) => s.teamId === matchup.value.awayTeamId)!)

// Build a same-hue tint at lower lightness/chroma for backgrounds.
function tintFrom(oklch: string, alpha: number) {
  // oklch(L C H) -> oklch(L C H / alpha)
  const inner = oklch.replace(/^oklch\(/, '').replace(/\)$/, '').trim()
  return `oklch(${inner} / ${alpha})`
}
const homeAccent = computed(() => accentFor(homeTeam.value))
const awayAccent = computed(() => accentFor(awayTeam.value))
const homeAccentTint = computed(() => tintFrom(homeAccent.value, 0.12))
const awayAccentTint = computed(() => tintFrom(awayAccent.value, 0.12))
const homeAccentBorder = computed(() => tintFrom(homeAccent.value, 0.35))
const awayAccentBorder = computed(() => tintFrom(awayAccent.value, 0.35))

// Win prob — clamp 1..99, whole percent.
function clampWP(v: number) {
  return Math.max(1, Math.min(99, Math.round(v)))
}
const homeWinPct = computed(() => clampWP(matchup.value.winProb))
const awayWinPct = computed(() => 100 - homeWinPct.value)

// Daily series
const series = computed(() => dailyWinProb.find((d) => d.matchupId === props.matchupId))
const homeSeries = computed(() => (series.value?.homeProbByDay ?? []).map(clampWP))
const awaySeries = computed(() => homeSeries.value.map((v) => 100 - v))
const currentDayIndex = computed(() => series.value?.currentDayIndex)
const methodology = computed(() => series.value?.methodologyNote ?? '5,000 Monte Carlo sims')

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

// Scouting
const homeScout = computed(() => teamScoutingReports[matchup.value.homeTeamId] ?? '')
const awayScout = computed(() => teamScoutingReports[matchup.value.awayTeamId] ?? '')
const homeForm = computed(() => teamLastFiveResults[matchup.value.homeTeamId] ?? [])
const awayForm = computed(() => teamLastFiveResults[matchup.value.awayTeamId] ?? [])

// Stat comparison
interface StatRow {
  label: string
  homeDisplay: string
  awayDisplay: string
  winner: 'home' | 'away' | 'tie'
  magnitude: string
}
const statRows = computed<StatRow[]>(() => {
  const h = matchupComparison[matchup.value.homeTeamId]
  const a = matchupComparison[matchup.value.awayTeamId]
  if (!h || !a) return []

  function recordWins(s: string) {
    const [w] = s.split('-').map(Number)
    return w
  }

  function compareHigher(hVal: number, aVal: number, fmt: (n: number) => string, unit = ''): Pick<StatRow, 'winner' | 'magnitude'> {
    if (hVal === aVal) return { winner: 'tie', magnitude: '0' }
    const diff = Math.abs(hVal - aVal)
    return { winner: hVal > aVal ? 'home' : 'away', magnitude: `+${fmt(diff)}${unit}` }
  }
  function compareLower(hVal: number, aVal: number, fmt: (n: number) => string, unit = ''): Pick<StatRow, 'winner' | 'magnitude'> {
    if (hVal === aVal) return { winner: 'tie', magnitude: '0' }
    const diff = Math.abs(hVal - aVal)
    return { winner: hVal < aVal ? 'home' : 'away', magnitude: `${fmt(diff)}${unit} lower` }
  }
  const f1 = (n: number) => n.toFixed(1)
  const f0 = (n: number) => n.toFixed(0)

  return [
    { label: 'Record', homeDisplay: h.record, awayDisplay: a.record, ...compareHigher(recordWins(h.record), recordWins(a.record), f0, ' W') },
    { label: 'Points / wk', homeDisplay: f1(h.pointsPerWeek), awayDisplay: f1(a.pointsPerWeek), ...compareHigher(h.pointsPerWeek, a.pointsPerWeek, f1, ' PPW') },
    { label: 'Total points', homeDisplay: f1(h.totalPoints), awayDisplay: f1(a.totalPoints), ...compareHigher(h.totalPoints, a.totalPoints, f0, ' PF') },
    { label: 'High score', homeDisplay: f1(h.highScore), awayDisplay: f1(a.highScore), ...compareHigher(h.highScore, a.highScore, f1) },
    { label: 'Low score', homeDisplay: f1(h.lowScore), awayDisplay: f1(a.lowScore), ...compareHigher(h.lowScore, a.lowScore, f1) },
    { label: 'All-Play', homeDisplay: h.allPlayRecord, awayDisplay: a.allPlayRecord, ...compareHigher(recordWins(h.allPlayRecord), recordWins(a.allPlayRecord), f0, ' W') },
    { label: 'Consistency', homeDisplay: f1(h.consistencyStdDev), awayDisplay: f1(a.consistencyStdDev), ...compareLower(h.consistencyStdDev, a.consistencyStdDev, f1, ' StdDev') },
    { label: 'Last 3 avg', homeDisplay: f1(h.last3Avg), awayDisplay: f1(a.last3Avg), ...compareHigher(h.last3Avg, a.last3Avg, f1) },
  ]
})

// Lifetime H2H — match either order, remember whether home is A.
const h2hRecord = computed(() => {
  const hId = matchup.value.homeTeamId
  const aId = matchup.value.awayTeamId
  for (const row of lifetimeH2H) {
    if (row.teamA === hId && row.teamB === aId) return { row, homeIsA: true }
    if (row.teamA === aId && row.teamB === hId) return { row, homeIsA: false }
  }
  return null
})
const h2h = computed(() => h2hRecord.value?.row ?? null)
const h2hHomeIsA = computed(() => h2hRecord.value?.homeIsA ?? true)
const h2hMeetings = computed(() => {
  if (!h2h.value) return []
  return h2h.value.recentMeetings.map((m) => {
    const homeIsA = h2hHomeIsA.value
    const homeScore = homeIsA ? m.aScore : m.bScore
    const awayScore = homeIsA ? m.bScore : m.aScore
    const homeWon = homeScore > awayScore
    const winner = homeWon ? homeTeam.value.name : awayTeam.value.name
    const winnerScore = homeWon ? homeScore : awayScore
    const loserScore = homeWon ? awayScore : homeScore
    const margin = (winnerScore - loserScore).toFixed(1)
    return {
      year: m.year,
      week: m.week,
      body: `${winner} won ${winnerScore.toFixed(1)} to ${loserScore.toFixed(1)}. Margin ${margin}.`,
    }
  })
})

// Watch key
const watchKey = computed(() => matchupWatchKey[matchup.value.id] ?? 'Specific players in flex slots will swing this one. Check the bench.')

/* ─── Chart geometry ──────────────────────────────────────────── */
const CHART_W = 640
const CHART_H = 240
const X_LEFT = 30
const X_RIGHT = 30
const Y_TOP = 28
const Y_BOTTOM = 18
const N_DAYS = 7
function xForDay(i: number) {
  const usable = CHART_W - X_LEFT - X_RIGHT
  return X_LEFT + (i / (N_DAYS - 1)) * usable
}
function yForPct(p: number) {
  const usable = CHART_H - Y_TOP - Y_BOTTOM
  // 0% bottom, 100% top.
  return Y_TOP + ((100 - p) / 100) * usable
}
const nowX = computed(() => {
  const idx = currentDayIndex.value
  if (idx === undefined) return null
  return xForDay(idx)
})

// Smooth cubic Bezier path through 7 points (canonical smoothPath).
function pathFor(values: number[]): string {
  const pts: Point[] = values.map((v, i) => ({ x: xForDay(i), y: yForPct(v) }))
  return smoothPath(pts)
}

/* ─── Focus management ──────────────────────────────────────── */
const dialogRef = ref<HTMLElement | null>(null)
const closeBtnRef = ref<HTMLElement | null>(null)

function onClose() {
  emit('close')
}

useDemoModal({ dialogRef, closeBtnRef, onClose })
</script>

<style scoped>
.mm-root {
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
  --accent-down:      oklch(0.70 0.22 0);

  font-family: 'Barlow', sans-serif;
  color: var(--ink-1);
}
.mm-backdrop {
  position: absolute;
  inset: 0;
  background: oklch(0.04 0.014 90 / 0.78);
  opacity: 0;
  animation: mm-fade-in 140ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
}
.mm-dialog {
  position: relative;
  width: 100%;
  max-width: 720px;
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
  animation: mm-dialog-in 180ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
  animation-delay: 30ms;
}
@media (prefers-reduced-motion: reduce) {
  .mm-backdrop, .mm-dialog { animation: none; opacity: 1; transform: none; }
}
@keyframes mm-fade-in { to { opacity: 1; } }
@keyframes mm-dialog-in { to { opacity: 1; transform: scale(1) translateY(0); } }

.mm-avatar-img {
  width: 100%; height: 100%;
  object-fit: cover; display: block;
}

/* ─── HEADER ─────────────────────────────────────────────────── */
.mm-head {
  position: relative;
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: start;
  gap: 12px 16px;
  margin-bottom: 22px;
}
.mm-eyebrow {
  grid-column: 1 / -1;
  margin: 0;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--ink-3);
}
.mm-head-faceoff {
  grid-column: 1;
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
}
.mm-head-team {
  display: flex; align-items: center; gap: 10px; min-width: 0;
}
.mm-head-team-away { flex-direction: row-reverse; }
.mm-head-avatar {
  width: 44px; height: 44px;
  border-radius: 11px;
  display: grid; place-items: center;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900; font-size: 1rem;
  color: oklch(0.12 0.012 90);
  flex-shrink: 0; overflow: hidden;
  box-shadow: 0 6px 18px -8px oklch(0 0 0 / 0.6);
}
.mm-head-name {
  margin: 0;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 1.15rem;
  line-height: 1.1;
  letter-spacing: -0.006em;
  color: var(--ink-1);
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.mm-head-vs {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 700;
  font-size: 0.78rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--ink-4);
  padding: 0 2px;
}

.mm-head-status {
  grid-column: 2;
  grid-row: 2;
  display: flex; align-items: center;
  align-self: center;
  justify-self: end;
}
.mm-status {
  display: inline-flex; align-items: center; gap: 6px;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px solid transparent;
}
.mm-status-live {
  color: oklch(0.74 0.22 25);
  background: oklch(0.74 0.22 25 / 0.10);
  border-color: oklch(0.74 0.22 25 / 0.35);
}
.mm-status-dot {
  width: 6px; height: 6px; border-radius: 50%;
  background: oklch(0.74 0.22 25);
}
@media (prefers-reduced-motion: no-preference) {
  @keyframes mm-pulse {
    0%, 60%, 100% { opacity: 1; transform: scale(1); }
    30% { opacity: 0.4; transform: scale(1.4); }
  }
  .mm-status-dot { animation: mm-pulse 2.4s infinite cubic-bezier(0.22, 1, 0.36, 1); }
}
.mm-status-final {
  color: var(--accent-up);
  background: oklch(0.74 0.18 145 / 0.10);
  border-color: oklch(0.74 0.18 145 / 0.35);
}
.mm-status-upcoming {
  color: var(--ink-3);
  background: oklch(0.20 0.012 90 / 0.6);
  border-color: oklch(0.22 0.015 90);
}

.mm-close {
  grid-column: 2;
  grid-row: 1;
  width: 32px; height: 32px;
  display: grid; place-items: center;
  background: transparent;
  border: 1px solid oklch(0.22 0.015 90);
  border-radius: 8px;
  color: var(--ink-2);
  cursor: pointer;
  transition: color 160ms cubic-bezier(0.22, 1, 0.36, 1),
              border-color 160ms cubic-bezier(0.22, 1, 0.36, 1);
}
.mm-close:hover { color: var(--ink-1); border-color: oklch(0.36 0.015 90); }
.mm-close:focus-visible { outline: 2px solid var(--accent-primary); outline-offset: 2px; }

/* ─── WIN PROBABILITY HERO ───────────────────────────────────── */
.mm-wp {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 14px;
  padding: 18px 0 20px;
  border-bottom: 1px solid oklch(0.16 0.018 90);
  margin-bottom: 24px;
}
.mm-wp-team {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
  min-width: 0;
}
.mm-wp-team-away { align-items: flex-end; text-align: right; }
.mm-wp-avatar {
  width: 56px; height: 56px;
  border-radius: 14px;
  display: grid; place-items: center;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900; font-size: 1.2rem;
  color: oklch(0.12 0.012 90);
  overflow: hidden;
  box-shadow: 0 8px 24px -10px oklch(0 0 0 / 0.6);
}
.mm-wp-name {
  margin: 2px 0 0;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.84rem;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--ink-2);
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.mm-wp-pct {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: clamp(2rem, 6vw, 2.8rem);
  line-height: 1;
  letter-spacing: -0.014em;
  font-variant-numeric: tabular-nums;
  margin-top: 2px;
}
.mm-wp-scores {
  margin: 4px 0 0;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.86rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: var(--ink-3);
  display: inline-flex; align-items: center; gap: 6px;
}
.mm-wp-current { color: var(--ink-1); font-weight: 800; font-variant-numeric: tabular-nums; }
.mm-wp-proj { font-variant-numeric: tabular-nums; }
.mm-wp-sep { color: var(--ink-5); }

.mm-wp-center {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 0 4px;
  min-width: 0;
}
.mm-wp-divider {
  width: 1px;
  height: 36px;
  background: oklch(0.22 0.015 90);
}
.mm-wp-methodology {
  margin: 0;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.66rem;
  color: var(--ink-3);
  letter-spacing: 0.04em;
  text-align: center;
  line-height: 1.3;
  max-width: 180px;
}

/* ─── SECTION ──────────────────────────────────────────────── */
.mm-section-eyebrow {
  margin: 0 0 8px;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--ink-3);
}
.mm-section-eyebrow-teal { color: var(--accent-tertiary); }
.mm-section-headline {
  margin: 0 0 14px;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 1.4rem;
  line-height: 1.1;
  letter-spacing: -0.008em;
  color: var(--ink-1);
}

/* ─── CHART ────────────────────────────────────────────────── */
.mm-chart {
  margin-bottom: 28px;
}
.mm-chart-wrap {
  position: relative;
}
.mm-chart-svg {
  width: 100%;
  height: 240px;
  display: block;
}
.mm-grid line {
  stroke: oklch(0.18 0.015 90);
  stroke-width: 1;
  stroke-dasharray: 2 4;
}
.mm-grid .mm-grid-mid {
  stroke: oklch(0.22 0.015 90);
  stroke-dasharray: none;
}
.mm-line {
  fill: none;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.mm-now line {
  stroke: var(--accent-secondary);
  stroke-width: 1.5;
  stroke-dasharray: 3 3;
}
.mm-now rect {
  fill: oklch(0.70 0.27 350 / 0.18);
  stroke: var(--accent-secondary);
  stroke-width: 1;
}
.mm-now text {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 9px;
  font-weight: 900;
  letter-spacing: 0.10em;
  fill: var(--accent-secondary);
}
.mm-chip-text {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 10px;
  font-weight: 900;
  font-variant-numeric: tabular-nums;
}

.mm-chart-days {
  display: flex;
  justify-content: space-between;
  padding: 4px 30px 0;
  margin: 0;
  list-style: none;
}
.mm-chart-days li {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.66rem;
  font-weight: 700;
  letter-spacing: 0.10em;
  text-transform: uppercase;
  color: var(--ink-4);
}
.mm-chart-day-now { color: var(--accent-secondary); }
.mm-chart-legend {
  list-style: none;
  padding: 12px 0 0;
  margin: 0;
  display: flex;
  gap: 18px;
  justify-content: center;
}
.mm-chart-legend-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  color: var(--ink-2);
}
.mm-chart-legend-swatch {
  width: 12px; height: 3px; border-radius: 2px;
}

/* ─── SCOUT ────────────────────────────────────────────────── */
.mm-scout { margin-bottom: 28px; }
.mm-scout-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 22px;
}
.mm-scout-head {
  display: flex; align-items: center; gap: 10px;
  margin-bottom: 10px;
}
.mm-scout-avatar {
  width: 40px; height: 40px; border-radius: 10px;
  display: grid; place-items: center;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900; font-size: 0.92rem;
  color: oklch(0.12 0.012 90);
  overflow: hidden;
  box-shadow: 0 6px 16px -8px oklch(0 0 0 / 0.55);
  flex-shrink: 0;
}
.mm-scout-head-text { min-width: 0; }
.mm-scout-name {
  margin: 0;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 1.02rem;
  line-height: 1;
  color: var(--ink-1);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.mm-scout-meta {
  margin: 3px 0 0;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.74rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ink-3);
}
.mm-scout-body {
  margin: 0 0 10px;
  font-size: 0.93rem;
  line-height: 1.55;
  color: var(--ink-2);
}
.mm-form-row {
  list-style: none;
  padding: 0; margin: 0;
  display: flex; gap: 4px;
}
.mm-form-pip {
  width: 18px; height: 18px;
  display: grid; place-items: center;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.66rem;
  font-weight: 900;
  letter-spacing: 0;
  border-radius: 4px;
}
.mm-form-pip-win {
  color: var(--accent-up);
  background: oklch(0.74 0.18 145 / 0.14);
  border: 1px solid oklch(0.74 0.18 145 / 0.32);
}
.mm-form-pip-loss {
  color: var(--accent-secondary);
  background: oklch(0.70 0.27 350 / 0.10);
  border: 1px solid oklch(0.70 0.27 350 / 0.28);
}

/* ─── STATS TABLE ──────────────────────────────────────────── */
.mm-stats { margin-bottom: 28px; }
.mm-stats-wrap {
  border: 1px solid oklch(0.16 0.018 90);
  border-radius: 12px;
  overflow: hidden;
}
.mm-stats-table {
  width: 100%;
  border-collapse: collapse;
  font-family: 'Barlow Condensed', sans-serif;
  font-variant-numeric: tabular-nums;
}
.mm-stats-table thead th {
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--ink-3);
  text-align: left;
  padding: 10px 12px;
  background: oklch(0.12 0.015 90 / 0.6);
  border-bottom: 1px solid oklch(0.18 0.015 90);
}
.mm-stats-table thead .mm-stats-home { text-align: right; }
.mm-stats-table thead .mm-stats-away { text-align: left; }
.mm-stats-table thead .mm-stats-adv  { text-align: center; }
.mm-stats-table tbody tr {
  border-bottom: 1px solid oklch(0.14 0.018 90);
}
.mm-stats-table tbody tr:last-child { border-bottom: none; }
.mm-stats-table tbody td {
  padding: 9px 12px;
  font-size: 0.92rem;
  font-weight: 700;
  color: var(--ink-2);
}
.mm-stats-table .mm-stats-stat {
  width: 30%;
  color: var(--ink-3);
  font-size: 0.74rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.mm-stats-table .mm-stats-home { text-align: right; width: 22%; }
.mm-stats-table .mm-stats-away { text-align: left;  width: 22%; }
.mm-stats-table .mm-stats-adv  { text-align: center; width: 26%; }
.mm-stats-table tbody td.is-winner { color: var(--ink-1); font-weight: 900; }

.mm-adv-chip {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 3px 8px;
  border-radius: 999px;
  border: 1px solid;
  font-size: 0.72rem;
  font-weight: 900;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  white-space: nowrap;
}
.mm-adv-tie {
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.10em;
  text-transform: uppercase;
  color: var(--ink-4);
}

/* ─── LIFETIME ─────────────────────────────────────────────── */
.mm-lifetime { margin-bottom: 24px; }
.mm-lifetime-lead {
  margin: 0 0 14px;
  font-size: 1rem;
  line-height: 1.55;
  color: var(--ink-2);
  max-width: 64ch;
}
.mm-lifetime-record {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 18px;
  padding: 12px 0;
  border-top: 1px solid oklch(0.16 0.018 90);
  border-bottom: 1px solid oklch(0.16 0.018 90);
  margin-bottom: 14px;
}
.mm-lifetime-side {
  display: inline-flex;
  align-items: baseline;
  gap: 10px;
}
.mm-lifetime-name {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.86rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--ink-3);
}
.mm-lifetime-num {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 1.8rem;
  line-height: 1;
  font-variant-numeric: tabular-nums;
  color: var(--ink-3);
}
.mm-lifetime-side-winner .mm-lifetime-name { color: var(--ink-1); }
.mm-lifetime-side-winner .mm-lifetime-num  { color: var(--accent-primary); }
.mm-lifetime-vs {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 700;
  font-size: 1.2rem;
  color: var(--ink-5);
}
.mm-lifetime-meetings {
  list-style: none;
  padding: 0; margin: 0;
  display: flex; flex-direction: column; gap: 6px;
}
.mm-lifetime-meeting {
  display: flex; align-items: baseline; gap: 6px;
  flex-wrap: wrap;
  font-size: 0.88rem;
  color: var(--ink-2);
  line-height: 1.4;
}
.mm-lifetime-meeting-year {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  letter-spacing: 0.06em;
  color: var(--ink-1);
  font-variant-numeric: tabular-nums;
}
.mm-lifetime-meeting-week {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--ink-3);
}
.mm-lifetime-meeting-dot { color: var(--ink-5); }
.mm-lifetime-meeting-body {
  color: var(--ink-2);
  font-variant-numeric: tabular-nums;
}
.mm-lifetime-first {
  margin: 0;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-size: 0.92rem;
  color: var(--ink-3);
}
.mm-lifetime-first-tag {
  display: inline-flex;
  align-items: center;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.10em;
  text-transform: uppercase;
  color: var(--accent-tertiary);
  background: oklch(0.72 0.18 195 / 0.10);
  border: 1px solid oklch(0.72 0.18 195 / 0.30);
  padding: 4px 9px;
  border-radius: 999px;
}

/* ─── WATCH LIST ───────────────────────────────────────────── */
.mm-watch {
  background: oklch(0.12 0.015 90 / 0.6);
  border: 1px solid oklch(0.18 0.018 90);
  border-radius: 12px;
  padding: 14px 16px;
  margin-bottom: 18px;
}
.mm-watch-eyebrow {
  margin: 0 0 4px;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--accent-primary);
}
.mm-watch-body {
  margin: 0;
  font-size: 0.96rem;
  line-height: 1.5;
  color: var(--ink-1);
  font-style: italic;
}

/* ─── FOOT ─────────────────────────────────────────────────── */
.mm-foot {
  display: flex;
  justify-content: flex-end;
  padding-top: 14px;
  border-top: 1px solid oklch(0.16 0.015 90);
}
.mm-share {
  display: inline-flex; align-items: center; gap: 8px;
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
.mm-share:hover { color: var(--ink-1); border-color: oklch(0.44 0.015 90); }
.mm-share:focus-visible { outline: 2px solid var(--accent-primary); outline-offset: 2px; }

/* ─── MOBILE ───────────────────────────────────────────────── */
@media (max-width: 620px) {
  .mm-dialog { padding: 20px 18px 18px; }
  .mm-head-name { font-size: 1.0rem; }
  .mm-head-avatar { width: 38px; height: 38px; border-radius: 9px; }
  .mm-wp { grid-template-columns: 1fr; gap: 18px; }
  .mm-wp-team-away { align-items: flex-start; text-align: left; }
  .mm-wp-center { flex-direction: row; }
  .mm-wp-divider { width: 36px; height: 1px; }
  .mm-scout-grid { grid-template-columns: 1fr; gap: 18px; }
  .mm-stats-table .mm-stats-stat { font-size: 0.66rem; }
  .mm-stats-table tbody td { padding: 8px 8px; font-size: 0.85rem; }
  .mm-chart-svg { height: 200px; }
}
</style>
