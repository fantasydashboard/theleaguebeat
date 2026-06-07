<template>
  <Teleport to="body">
    <div class="cmm-root" role="presentation">
      <div class="cmm-backdrop" @click="onClose" aria-hidden="true"></div>
      <div
        v-if="matchup && homeTeam && awayTeam && homeStanding && awayStanding"
        ref="dialogRef"
        class="cmm-dialog"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="`cmm-title-${matchup.id}`"
      >
        <!-- ─── HEADER ──────────────────────────────────────────────────
             Minimal chrome — week eyebrow + status badge + close. The
             team identification happens in the WP section below where
             the big avatars already do that work; a second small-avatar
             row up here was just duplicated identification. The screen-
             reader title is attached to the eyebrow.
        ────────────────────────────────────────────────────────────── -->
        <header class="cmm-head cmm-head-minimal">
          <p :id="`cmm-title-${matchup.id}`" class="cmm-eyebrow">
            Week {{ weekNumber }}
            <span class="cmm-sr-only"> matchup: {{ homeTeam.name }} versus {{ awayTeam.name }}</span>
          </p>

          <div class="cmm-head-status">
            <span v-if="matchup.status === 'live'" class="cmm-status cmm-status-live">
              <span class="cmm-status-dot" aria-hidden="true"></span>
              Live
            </span>
            <span v-else-if="matchup.status === 'coasting'" class="cmm-status cmm-status-coasting">
              Coasting
            </span>
            <span v-else-if="matchup.status === 'final'" class="cmm-status cmm-status-final">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              Locked
            </span>
            <span v-else class="cmm-status cmm-status-upcoming">Upcoming</span>
          </div>

          <button
            ref="closeBtnRef"
            type="button"
            class="cmm-close"
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
        <section class="cmm-wp" aria-label="Win probability">
          <div class="cmm-wp-team">
            <div
              class="cmm-wp-avatar"
              :style="{ background: `linear-gradient(135deg, ${homeTeam.avatarColor})` }"
            >
              <img v-if="homeTeam.avatarUrl" :src="homeTeam.avatarUrl" class="cmm-avatar-img" alt="" />
              <span v-else>{{ homeTeam.ownerInitials }}</span>
            </div>
            <p class="cmm-wp-name">{{ homeTeam.name }}</p>
            <span v-if="homeWinPct !== null" class="cmm-wp-pct" :style="{ color: homePctColor }">{{ homeWinPct }}%</span>
            <p class="cmm-wp-scores">
              <span class="cmm-wp-current">{{ matchup.homeCatWins }} wins</span>
              <template v-if="homeProjStr">
                <span class="cmm-wp-sep" aria-hidden="true">·</span>
                <span class="cmm-wp-proj">proj {{ homeProjStr }}</span>
              </template>
            </p>
          </div>

          <div class="cmm-wp-center">
            <span class="cmm-wp-divider" aria-hidden="true"></span>
            <p class="cmm-wp-methodology">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <polyline points="23 4 23 10 17 10"/>
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
              </svg>
              <span>{{ projectionCaption }}</span>
            </p>
          </div>

          <div class="cmm-wp-team cmm-wp-team-away">
            <div
              class="cmm-wp-avatar"
              :style="{ background: `linear-gradient(135deg, ${awayTeam.avatarColor})` }"
            >
              <img v-if="awayTeam.avatarUrl" :src="awayTeam.avatarUrl" class="cmm-avatar-img" alt="" />
              <span v-else>{{ awayTeam.ownerInitials }}</span>
            </div>
            <p class="cmm-wp-name">{{ awayTeam.name }}</p>
            <span v-if="awayWinPct !== null" class="cmm-wp-pct" :style="{ color: awayPctColor }">{{ awayWinPct }}%</span>
            <p class="cmm-wp-scores">
              <span class="cmm-wp-current">{{ matchup.awayCatWins }} wins</span>
              <template v-if="awayProjStr">
                <span class="cmm-wp-sep" aria-hidden="true">·</span>
                <span class="cmm-wp-proj">proj {{ awayProjStr }}</span>
              </template>
            </p>
          </div>
        </section>

        <!-- ─── DAILY WIN-PROB CHART — hidden on live until snapshots accrue ─── -->
        <section v-if="hasDailyTrend" class="cmm-chart" aria-labelledby="cmm-chart-eyebrow">
          <p class="cmm-section-eyebrow cmm-section-eyebrow-teal" id="cmm-chart-eyebrow">Across the week</p>
          <h3 class="cmm-section-headline">How this matchup shifted.</h3>

          <div class="cmm-chart-wrap">
            <svg
              class="cmm-chart-svg"
              :viewBox="`0 0 ${CHART_W} ${CHART_H}`"
              preserveAspectRatio="none"
              role="img"
              :aria-label="`Daily win probability across the week. ${homeTeam.name} ${homeWinPct} percent, ${awayTeam.name} ${awayWinPct} percent.`"
            >
              <!-- Gridlines at 25/50/75 -->
              <g class="cmm-grid">
                <line v-for="p in [25, 50, 75]" :key="`grid-${p}`"
                  x1="0" :y1="yForPct(p)" :x2="CHART_W" :y2="yForPct(p)" />
                <line class="cmm-grid-mid"
                  x1="0" :y1="yForPct(50)" :x2="CHART_W" :y2="yForPct(50)" />
              </g>

              <!-- NOW vertical line at Thursday -->
              <g v-if="nowX !== null" class="cmm-now">
                <line :x1="nowX" :y1="Y_TOP" :x2="nowX" :y2="CHART_H - Y_BOTTOM" />
                <rect :x="nowX - 16" :y="Y_TOP - 16" width="32" height="13" rx="3" />
                <text :x="nowX" :y="Y_TOP - 6.5" text-anchor="middle">NOW</text>
              </g>

              <!-- Home path -->
              <path class="cmm-line"
                :d="pathFor(homeSeries)"
                :stroke="homeAccent" />
              <!-- Away path -->
              <path class="cmm-line"
                :d="pathFor(awaySeries)"
                :stroke="awayAccent" />

              <!-- Endpoint dots at each day -->
              <g v-for="(v, i) in homeSeries" :key="`dot-h-${i}`">
                <circle :cx="xForDay(i)" :cy="yForPct(v)" r="3" :fill="homeAccent" />
              </g>
              <g v-for="(v, i) in awaySeries" :key="`dot-a-${i}`">
                <circle :cx="xForDay(i)" :cy="yForPct(v)" r="3" :fill="awayAccent" />
              </g>

              <!-- Value chip at current day for home -->
              <g v-if="currentDayIndex !== null">
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
                  class="cmm-chip-text"
                  :fill="homeAccent"
                >{{ homeSeries[currentDayIndex] }}%</text>
              </g>
            </svg>

            <ul class="cmm-chart-days" aria-hidden="true">
              <li v-for="(d, i) in DAY_LABELS" :key="d" :class="{ 'cmm-chart-day-now': i === currentDayIndex }">{{ d }}</li>
            </ul>

            <ul class="cmm-chart-legend" role="list">
              <li class="cmm-chart-legend-item">
                <span class="cmm-chart-legend-swatch" :style="{ background: homeAccent }" aria-hidden="true"></span>
                <span>{{ homeTeam.name }}</span>
              </li>
              <li class="cmm-chart-legend-item">
                <span class="cmm-chart-legend-swatch" :style="{ background: awayAccent }" aria-hidden="true"></span>
                <span>{{ awayTeam.name }}</span>
              </li>
            </ul>
          </div>
        </section>

        <!-- ─── SCOUTING ────────────────────────────────────────────── -->
        <section class="cmm-scout" aria-labelledby="cmm-scout-eyebrow">
          <p class="cmm-section-eyebrow" id="cmm-scout-eyebrow">Scouting</p>

          <div class="cmm-scout-grid">
            <article class="cmm-scout-col">
              <header class="cmm-scout-head">
                <div
                  class="cmm-scout-avatar"
                  :style="{ background: `linear-gradient(135deg, ${homeTeam.avatarColor})` }"
                >
                  <img v-if="homeTeam.avatarUrl" :src="homeTeam.avatarUrl" class="cmm-avatar-img" alt="" />
                  <span v-else>{{ homeTeam.ownerInitials }}</span>
                </div>
                <div class="cmm-scout-head-text">
                  <p class="cmm-scout-name">{{ homeTeam.name }}</p>
                  <p class="cmm-scout-meta">
                    {{ homeStanding.catWins }}-{{ homeStanding.catLosses }}{{ homeStanding.catTies ? `-${homeStanding.catTies}` : '' }}
                    <span class="cmm-scout-meta-dot" aria-hidden="true">·</span>
                    #{{ homeStanding.rank }}
                  </p>
                </div>
              </header>
              <p v-if="homeScout" class="cmm-scout-body">{{ homeScout }}</p>
              <p class="cmm-form-label">Last 5</p>
              <ul class="cmm-form-row" :aria-label="`Last five results for ${homeTeam.name}`" role="list">
                <li v-for="(r, i) in homeForm" :key="`hf-${i}`" :class="['cmm-form-pip', formClass(r)]">{{ r }}</li>
              </ul>
            </article>

            <article class="cmm-scout-col">
              <header class="cmm-scout-head">
                <div
                  class="cmm-scout-avatar"
                  :style="{ background: `linear-gradient(135deg, ${awayTeam.avatarColor})` }"
                >
                  <img v-if="awayTeam.avatarUrl" :src="awayTeam.avatarUrl" class="cmm-avatar-img" alt="" />
                  <span v-else>{{ awayTeam.ownerInitials }}</span>
                </div>
                <div class="cmm-scout-head-text">
                  <p class="cmm-scout-name">{{ awayTeam.name }}</p>
                  <p class="cmm-scout-meta">
                    {{ awayStanding.catWins }}-{{ awayStanding.catLosses }}{{ awayStanding.catTies ? `-${awayStanding.catTies}` : '' }}
                    <span class="cmm-scout-meta-dot" aria-hidden="true">·</span>
                    #{{ awayStanding.rank }}
                  </p>
                </div>
              </header>
              <p v-if="awayScout" class="cmm-scout-body">{{ awayScout }}</p>
              <p class="cmm-form-label">Last 5</p>
              <ul class="cmm-form-row" :aria-label="`Last five results for ${awayTeam.name}`" role="list">
                <li v-for="(r, i) in awayForm" :key="`af-${i}`" :class="['cmm-form-pip', formClass(r)]">{{ r }}</li>
              </ul>
            </article>
          </div>
        </section>

        <!-- ─── CAT-BY-CAT BATTLE ───────────────────────────────────── -->
        <section class="cmm-cats" aria-labelledby="cmm-cats-eyebrow">
          <p class="cmm-section-eyebrow" id="cmm-cats-eyebrow">Cat-by-cat battle</p>
          <p v-if="stateOfPlay" class="cmm-cats-summary">
            <strong class="cmm-cats-strong">{{ stateOfPlay }}</strong>
          </p>

          <div class="cmm-cats-wrap">
            <ul class="cmm-cats-list" role="list">
              <li
                v-for="line in matchup.catLines ?? []"
                :key="line.catId"
                class="cmm-cats-row"
                :class="rowClassFor(line)"
              >
                <span
                  class="cmm-cats-val cmm-cats-val-a"
                  :class="{ 'cmm-cats-val-lead': homeHasLead(line) }"
                  :style="homeHasLead(line) ? { color: homeAccent } : undefined"
                >{{ formatVal(line.catId, line.homeCurrent) }}</span>

                <span class="cmm-cats-margin cmm-cats-margin-a">
                  <span v-if="marginFor(line, 'home')" class="cmm-cats-chip" :style="chipStyle(line, 'home')">
                    {{ marginFor(line, 'home') }}
                  </span>
                </span>

                <span class="cmm-cats-label">{{ line.catId }}</span>

                <span class="cmm-cats-margin cmm-cats-margin-b">
                  <span v-if="marginFor(line, 'away')" class="cmm-cats-chip" :style="chipStyle(line, 'away')">
                    {{ marginFor(line, 'away') }}
                  </span>
                </span>

                <span
                  class="cmm-cats-val cmm-cats-val-b"
                  :class="{ 'cmm-cats-val-lead': awayHasLead(line) }"
                  :style="awayHasLead(line) ? { color: awayAccent } : undefined"
                >{{ formatVal(line.catId, line.awayCurrent) }}</span>

                <span class="cmm-cats-status">
                  <span
                    v-if="line.status === 'contested'"
                    class="cmm-cats-status-chip cmm-cats-status-chip-live"
                  >
                    <span class="cmm-cats-status-dot" aria-hidden="true"></span>
                    Live
                  </span>
                  <span
                    v-else-if="line.status === 'punted-home' || line.status === 'punted-away'"
                    class="cmm-cats-status-chip cmm-cats-status-chip-punt"
                  >Punt</span>
                  <span
                    v-else
                    class="cmm-cats-status-chip cmm-cats-status-chip-locked"
                  >
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    Locked
                  </span>
                </span>
              </li>
            </ul>
          </div>
        </section>

        <!-- ─── WHAT TO WATCH ──────────────────────────────────────── -->
        <section v-if="watchBody" class="cmm-watch" aria-label="What to watch">
          <p class="cmm-watch-eyebrow">{{ watchEyebrow }}</p>
          <p class="cmm-watch-body">{{ watchBody }}</p>
        </section>

        <!-- ─── SEASON SERIES ──────────────────────────────────────── -->
        <section v-if="seriesProse" class="cmm-series" aria-labelledby="cmm-series-eyebrow">
          <p class="cmm-section-eyebrow" id="cmm-series-eyebrow">{{ seriesEyebrow }}</p>
          <p class="cmm-series-body">{{ seriesProse }}</p>
        </section>

        <footer class="cmm-foot">
          <button type="button" class="cmm-share" @click="emit('open-signup')">
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
import type {
  CategoryLeagueData,
  CategoryLeagueDataMatchup,
  CategoryLeagueDataCatLine,
  CategoryLeagueDataTeam,
  CategoryLeagueDataStanding,
} from '@/editorial/types'
import {
  teamScoutingProse,
  teamLastFiveH2H,
  matchupSeriesProse,
} from '@/fixtures/categoriesLeague'
import { categoriesFixtureToLeagueData } from '@/editorial/fixtureAdapter'
// Hard left/right binary — matches the matchups view's HOME_COLOR /
// AWAY_COLOR. Decouples per-cat / margin-chip / cat-row tint signals
// from team-avatar accents, which can collide on similar palettes.
const HOME_COLOR = 'oklch(0.74 0.18 145)'   // green - left
const AWAY_COLOR = 'oklch(0.70 0.27 350)'   // magenta - right
import { smoothPath, type Point } from '@/utils/svgPath'
import { useDemoModal } from '@/composables/useDemoModal'
import {
  LOWER_BETTER_BASEBALL_CATS,
  summarizeLocks,
  daysLeftInCurrentWeek,
} from '@/editorial/matchups-projection'

const props = defineProps<{
  matchupId: string
  /** Live league data when the page is wired to a connected league.
   *  When null/undefined, the modal falls back to the fixture (same
   *  path the Matchups page follows). */
  liveData?: CategoryLeagueData | null
  whatToWatchOverride?: { eyebrow?: string; headline?: string }
  seasonSeriesOverride?: { eyebrow?: string; body?: string }
}>()
const emit = defineEmits<{ (e: 'close'): void; (e: 'open-signup'): void }>()

// Single data source: live when present, fixture-via-adapter otherwise.
let _demoCache: CategoryLeagueData | null = null
function demoData(): CategoryLeagueData {
  if (!_demoCache) _demoCache = categoriesFixtureToLeagueData()
  return _demoCache
}
const data = computed<CategoryLeagueData>(() => props.liveData ?? demoData())
const isLive = computed(() => !!props.liveData)

const matchup = computed<CategoryLeagueDataMatchup | null>(
  () => data.value.matchupsCurrentWeek?.find((m) => m.id === props.matchupId) ?? null,
)
const homeTeam = computed<CategoryLeagueDataTeam | null>(() => {
  const m = matchup.value
  return m ? data.value.teams.find((t) => t.id === m.homeTeamId) ?? null : null
})
const awayTeam = computed<CategoryLeagueDataTeam | null>(() => {
  const m = matchup.value
  return m ? data.value.teams.find((t) => t.id === m.awayTeamId) ?? null : null
})
const homeStanding = computed<CategoryLeagueDataStanding | null>(() => {
  const m = matchup.value
  return m ? data.value.standings.find((s) => s.teamId === m.homeTeamId) ?? null : null
})
const awayStanding = computed<CategoryLeagueDataStanding | null>(() => {
  const m = matchup.value
  return m ? data.value.standings.find((s) => s.teamId === m.awayTeamId) ?? null : null
})

const homeAccent = computed(() => HOME_COLOR)
const awayAccent = computed(() => AWAY_COLOR)

const homeWinPct = computed(() => {
  const p = matchup.value?.homeWinProb
  return p === undefined ? null : clampWP(p * 100)
})
const awayWinPct = computed(() =>
  homeWinPct.value === null ? null : 100 - homeWinPct.value,
)

const homePctColor = computed(() =>
  (homeWinPct.value ?? 50) >= (awayWinPct.value ?? 50)
    ? 'oklch(0.74 0.18 145)'
    : 'oklch(0.70 0.27 350)',
)
const awayPctColor = computed(() =>
  (awayWinPct.value ?? 50) >= (homeWinPct.value ?? 50)
    ? 'oklch(0.74 0.18 145)'
    : 'oklch(0.70 0.27 350)',
)

const totalCats = computed(() => data.value.categories.length)
const homeProjStr = computed(() => {
  const m = matchup.value
  if (!m || m.homeProj === undefined) return ''
  const h = Math.round(m.homeProj)
  return `${h}-${Math.max(0, totalCats.value - h)}`
})
const awayProjStr = computed(() => {
  const m = matchup.value
  if (!m || m.awayProj === undefined) return ''
  const a = Math.round(m.awayProj)
  return `${a}-${Math.max(0, totalCats.value - a)}`
})

const hasDailyTrend = computed(() => (matchup.value?.dailyTrend?.length ?? 0) > 0)
const homeSeries = computed(() =>
  (matchup.value?.dailyTrend ?? []).map((d) => clampWP(d.homeWinProb * 100)),
)
const awaySeries = computed(() =>
  (matchup.value?.dailyTrend ?? []).map((d) => clampWP(d.awayWinProb * 100)),
)
const currentDayIndex = computed(() => {
  let idx = -1
  ;(matchup.value?.dailyTrend ?? []).forEach((d, i) => {
    if (!d.isProjection) idx = i
  })
  return idx === -1 ? null : idx
})

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

// Scouting — fixture-only for now. Live shows Last-5 form derived from
// standings.lastSix; the hand-authored prose paragraph is hidden until
// a live scouting source exists.
const homeScout = computed(() => {
  const m = matchup.value
  if (!m || isLive.value) return ''
  return teamScoutingProse[m.homeTeamId] ?? ''
})
const awayScout = computed(() => {
  const m = matchup.value
  if (!m || isLive.value) return ''
  return teamScoutingProse[m.awayTeamId] ?? ''
})
const homeForm = computed<('W' | 'L' | 'T')[]>(() => {
  const m = matchup.value
  if (!m) return []
  if (isLive.value) return (homeStanding.value?.lastSix ?? []).slice(-5)
  return teamLastFiveH2H[m.homeTeamId] ?? []
})
const awayForm = computed<('W' | 'L' | 'T')[]>(() => {
  const m = matchup.value
  if (!m) return []
  if (isLive.value) return (awayStanding.value?.lastSix ?? []).slice(-5)
  return teamLastFiveH2H[m.awayTeamId] ?? []
})

function formClass(r: 'W' | 'L' | 'T') {
  if (r === 'W') return 'cmm-form-pip-win'
  if (r === 'L') return 'cmm-form-pip-loss'
  return 'cmm-form-pip-tie'
}

// State-of-play sentence — same logic as the hero's cat-strip footer
// replaces the sterile "X decided / Y contested / Z conceded" line
// that never moved mid-week. Day-aware: "Down to AVG and SB." on
// Sunday, "11 cats still in play. 0 locked." on Monday.
const stateOfPlay = computed<string | null>(() => {
  const m = matchup.value
  if (!m?.catLines?.length) return null
  const daysLeft = daysLeftInCurrentWeek()
  const summary = summarizeLocks(m.catLines, daysLeft)
  const moving = summary.movingCatIds
  const totalLocks = summary.homeLocks + summary.awayLocks
  if (moving.length === 0) return 'Mathematically over.'
  if (moving.length === 1) return `Down to ${moving[0]}.`
  if (moving.length === 2) return `Down to ${moving[0]} and ${moving[1]}.`
  if (moving.length === 3) return `Down to ${moving[0]}, ${moving[1]}, and ${moving[2]}.`
  if (totalLocks >= 5) return `${totalLocks} cats locked. ${moving.length} still in play.`
  return `${moving.length} cats still in play. ${totalLocks} locked.`
})

const decidedForAway = computed(() =>
  (matchup.value?.catLines ?? []).filter((c) => c.status === 'decided-away').length,
)
const contestedCount = computed(() =>
  (matchup.value?.catLines ?? []).filter((c) => c.status === 'contested').length,
)
const concededByAway = computed(() =>
  (matchup.value?.catLines ?? []).filter((c) => c.status === 'punted-away').length,
)

function formatVal(catId: string, v: number): string {
  if (catId === 'AVG' || catId === 'OBP' || catId === 'SLG' || catId === 'OPS') {
    return v.toFixed(3).replace(/^0/, '')
  }
  if (catId === 'ERA' || catId === 'WHIP' || catId === 'BAA' || catId === 'K/9') {
    return v.toFixed(2)
  }
  return Math.round(v).toString()
}
function lowerBetter(catId: string): boolean {
  return LOWER_BETTER_BASEBALL_CATS.has(catId)
}
function homeHasLead(line: CategoryLeagueDataCatLine): boolean {
  if (line.homeCurrent === line.awayCurrent) return false
  return lowerBetter(line.catId)
    ? line.homeCurrent < line.awayCurrent
    : line.homeCurrent > line.awayCurrent
}
function awayHasLead(line: CategoryLeagueDataCatLine): boolean {
  if (line.homeCurrent === line.awayCurrent) return false
  return lowerBetter(line.catId)
    ? line.awayCurrent < line.homeCurrent
    : line.awayCurrent > line.homeCurrent
}

function marginFor(line: CategoryLeagueDataCatLine, side: 'home' | 'away'): string | null {
  if (line.status === 'punted-home' && side === 'home') return null
  if (line.status === 'punted-away' && side === 'away') return null
  if (line.homeCurrent === line.awayCurrent) return null
  const diff = Math.abs(line.homeCurrent - line.awayCurrent)
  const sideHasLead = side === 'home' ? homeHasLead(line) : awayHasLead(line)
  if (!sideHasLead) return null
  if (line.catId === 'AVG' || line.catId === 'OBP' || line.catId === 'SLG' || line.catId === 'OPS') {
    return `+${diff.toFixed(3).replace(/^0/, '')}`
  }
  if (line.catId === 'ERA' || line.catId === 'WHIP' || line.catId === 'BAA') {
    return `-${diff.toFixed(2)}`
  }
  return `+${Math.round(diff)}`
}

function chipStyle(line: CategoryLeagueDataCatLine, side: 'home' | 'away') {
  const sideHasLead = side === 'home' ? homeHasLead(line) : awayHasLead(line)
  if (!sideHasLead) return undefined
  const isLocked =
    (line.status === 'decided-home' && side === 'home') ||
    (line.status === 'decided-away' && side === 'away')
  if (isLocked) {
    const color = side === 'home' ? homeAccent.value : awayAccent.value
    return {
      color,
      backgroundColor: tintFrom(color, 0.14),
      borderColor: tintFrom(color, 0.34),
    }
  }
  return {
    color: 'oklch(0.78 0.18 92)',
    backgroundColor: 'oklch(0.78 0.18 92 / 0.12)',
    borderColor: 'oklch(0.78 0.18 92 / 0.32)',
  }
}

function rowClassFor(line: CategoryLeagueDataCatLine): string {
  return `cmm-cats-row-${line.status}`
}

function tintFrom(oklch: string, alpha: number): string {
  const inner = oklch.replace(/^oklch\(/, '').replace(/\)$/, '').trim()
  return `oklch(${inner} / ${alpha})`
}

function clampWP(v: number): number {
  return Math.max(1, Math.min(99, Math.round(v)))
}

const weekNumber = computed(() => data.value.currentWeek)

/* ─── What-to-watch copy (editorial-aware) ──────────────────── */
const watchEyebrow = computed(() => {
  const eb = props.whatToWatchOverride?.eyebrow
  if (eb && eb.trim().length > 0) return eb
  return 'What to watch'
})
const watchBody = computed(() => {
  const body = props.whatToWatchOverride?.headline
  if (body && body.trim().length > 0) return body
  return ''   // no live "what to watch" prose source yet
})

/* ─── Season-series prose ──────────────────────────────────── */
const seriesEyebrow = computed(() => {
  const eb = props.seasonSeriesOverride?.eyebrow
  if (eb && eb.trim().length > 0) return eb
  return 'Season series'
})
const seriesProse = computed(() => {
  const overrideBody = props.seasonSeriesOverride?.body
  if (overrideBody && overrideBody.trim().length > 0) return overrideBody
  if (isLive.value) return ''
  const m = matchup.value
  if (!m || !homeTeam.value || !awayTeam.value) return ''
  const hId = m.homeTeamId
  const aId = m.awayTeamId
  const direct = matchupSeriesProse[`${hId}-${aId}`]
  if (direct) return direct.body
  const flipped = matchupSeriesProse[`${aId}-${hId}`]
  if (flipped) return flipped.body
  return `First meeting of the season. ${homeTeam.value.name} and ${awayTeam.value.name} have no recent head-to-head history on file.`
})

// Honest projection caption — replaces the prior "10,000 Monte Carlo
// sims" claim, which we never actually ran.
const projectionCaption = computed(() =>
  isLive.value
    ? 'Projected from the cats still in play, refreshed live.'
    : 'Projected from the cats still in play.',
)

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
  return Y_TOP + ((100 - p) / 100) * usable
}
const nowX = computed(() => {
  const idx = currentDayIndex.value
  if (idx === null) return null
  return xForDay(idx)
})

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
.cmm-root {
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
.cmm-backdrop {
  position: absolute;
  inset: 0;
  background: oklch(0.04 0.014 90 / 0.78);
  opacity: 0;
  animation: cmm-fade-in 140ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
}
.cmm-dialog {
  position: relative;
  width: 100%;
  max-width: 760px;
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
  animation: cmm-dialog-in 180ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
  animation-delay: 30ms;
}
@media (prefers-reduced-motion: reduce) {
  .cmm-backdrop, .cmm-dialog { animation: none; opacity: 1; transform: none; }
}
@keyframes cmm-fade-in { to { opacity: 1; } }
@keyframes cmm-dialog-in { to { opacity: 1; transform: scale(1) translateY(0); } }

.cmm-avatar-img {
  width: 100%; height: 100%; object-fit: cover; display: block;
}

/* ─── HEADER ─────────────────────────────────────────────────── */
.cmm-head {
  position: relative;
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: start;
  gap: 12px 16px;
  margin-bottom: 22px;
}
/* Minimal variant — no faceoff row; eyebrow + status + close only.
   Big WP avatars below carry the team identification. */
.cmm-head-minimal {
  align-items: center;
  margin-bottom: 14px;
}
.cmm-head-minimal .cmm-eyebrow {
  grid-column: 1;
  align-self: center;
}
.cmm-head-minimal .cmm-head-status {
  grid-column: 2;
  grid-row: 1;
  justify-self: end;
  margin-right: 44px;   /* leave room for the close button */
}
.cmm-sr-only {
  position: absolute;
  width: 1px; height: 1px;
  padding: 0; margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
.cmm-eyebrow {
  grid-column: 1 / -1;
  margin: 0;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--ink-3);
}
.cmm-head-faceoff {
  grid-column: 1;
  display: flex; align-items: center; gap: 14px; min-width: 0;
}
.cmm-head-team {
  display: flex; align-items: center; gap: 10px; min-width: 0;
}
.cmm-head-team-away { flex-direction: row-reverse; }
.cmm-head-avatar {
  width: 44px; height: 44px;
  border-radius: 11px;
  display: grid; place-items: center;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900; font-size: 1rem;
  color: oklch(0.12 0.012 90);
  flex-shrink: 0; overflow: hidden;
  box-shadow: 0 6px 18px -8px oklch(0 0 0 / 0.6);
}
.cmm-head-name {
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
.cmm-head-vs {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 700;
  font-size: 0.78rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--ink-4);
  padding: 0 2px;
}
.cmm-head-status {
  grid-column: 2;
  grid-row: 2;
  display: flex; align-items: center;
  align-self: center;
  justify-self: end;
}
.cmm-status {
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
.cmm-status-live {
  color: var(--accent-primary);
  background: oklch(0.78 0.18 92 / 0.10);
  border-color: oklch(0.78 0.18 92 / 0.35);
}
.cmm-status-dot {
  width: 6px; height: 6px; border-radius: 50%;
  background: var(--accent-primary);
}
@media (prefers-reduced-motion: no-preference) {
  @keyframes cmm-pulse {
    0%, 60%, 100% { opacity: 1; transform: scale(1); }
    30% { opacity: 0.4; transform: scale(1.4); }
  }
  .cmm-status-dot { animation: cmm-pulse 2.4s infinite cubic-bezier(0.22, 1, 0.36, 1); }
}
.cmm-status-coasting {
  color: var(--accent-secondary);
  background: oklch(0.70 0.27 350 / 0.10);
  border-color: oklch(0.70 0.27 350 / 0.30);
}
.cmm-status-final {
  color: var(--accent-up);
  background: oklch(0.74 0.18 145 / 0.10);
  border-color: oklch(0.74 0.18 145 / 0.35);
}
.cmm-status-upcoming {
  color: var(--ink-3);
  background: oklch(0.20 0.012 90 / 0.6);
  border-color: oklch(0.22 0.015 90);
}

.cmm-close {
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
.cmm-close:hover { color: var(--ink-1); border-color: oklch(0.36 0.015 90); }
.cmm-close:active {
  transform: scale(0.97);
  transition-duration: 100ms;
}
.cmm-close:focus-visible { outline: 2px solid var(--accent-primary); outline-offset: 2px; }

/* ─── WIN-PROB HERO ───────────────────────────────────────────── */
.cmm-wp {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 14px;
  padding: 18px 0 20px;
  border-bottom: 1px solid oklch(0.16 0.018 90);
  margin-bottom: 24px;
}
.cmm-wp-team {
  display: flex; flex-direction: column; align-items: flex-start; gap: 6px;
  min-width: 0;
}
.cmm-wp-team-away { align-items: flex-end; text-align: right; }
.cmm-wp-avatar {
  width: 80px; height: 80px;
  border-radius: 18px;
  display: grid; place-items: center;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900; font-size: 1.6rem;
  color: oklch(0.12 0.012 90);
  overflow: hidden;
  box-shadow: 0 8px 24px -10px oklch(0 0 0 / 0.6);
}
.cmm-wp-name {
  margin: 4px 0 0;
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
.cmm-wp-pct {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: clamp(2.4rem, 7vw, 3.2rem);
  line-height: 1;
  letter-spacing: -0.014em;
  font-variant-numeric: tabular-nums;
  margin-top: 2px;
}
.cmm-wp-scores {
  margin: 4px 0 0;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.86rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: var(--ink-3);
  display: inline-flex; align-items: center; gap: 6px;
}
.cmm-wp-current { color: var(--ink-1); font-weight: 800; }
.cmm-wp-sep { color: var(--ink-5); }
.cmm-wp-center {
  display: flex; flex-direction: column; align-items: center; gap: 6px;
  padding: 0 4px; min-width: 0;
}
.cmm-wp-divider {
  width: 1px; height: 36px;
  background: oklch(0.22 0.015 90);
}
.cmm-wp-methodology {
  margin: 0;
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 0.66rem;
  color: var(--ink-3);
  letter-spacing: 0.04em;
  text-align: center;
  line-height: 1.3;
  max-width: 200px;
}

/* ─── SECTION ──────────────────────────────────────────────── */
.cmm-section-eyebrow {
  margin: 0 0 8px;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--ink-3);
}
.cmm-section-eyebrow-teal { color: var(--accent-tertiary); }
.cmm-section-headline {
  margin: 0 0 14px;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 1.4rem;
  line-height: 1.1;
  letter-spacing: -0.008em;
  color: var(--ink-1);
}

/* ─── CHART ────────────────────────────────────────────────── */
.cmm-chart { margin-bottom: 28px; }
.cmm-chart-wrap { position: relative; }
.cmm-chart-svg { width: 100%; height: 240px; display: block; }
.cmm-grid line {
  stroke: oklch(0.18 0.015 90);
  stroke-width: 1;
  stroke-dasharray: 2 4;
}
.cmm-grid .cmm-grid-mid {
  stroke: oklch(0.22 0.015 90);
  stroke-dasharray: none;
}
.cmm-line {
  fill: none;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.cmm-now line {
  stroke: var(--accent-tertiary);
  stroke-width: 1.5;
  stroke-dasharray: 3 3;
}
.cmm-now rect {
  fill: oklch(0.72 0.18 195 / 0.16);
  stroke: var(--accent-tertiary);
  stroke-width: 1;
}
.cmm-now text {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 9px;
  font-weight: 900;
  letter-spacing: 0.10em;
  fill: var(--accent-tertiary);
}
.cmm-chip-text {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 10px;
  font-weight: 900;
  font-variant-numeric: tabular-nums;
}
.cmm-chart-days {
  display: flex; justify-content: space-between;
  padding: 4px 30px 0;
  margin: 0; list-style: none;
}
.cmm-chart-days li {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.66rem;
  font-weight: 700;
  letter-spacing: 0.10em;
  text-transform: uppercase;
  color: var(--ink-4);
}
.cmm-chart-day-now { color: var(--accent-tertiary); }
.cmm-chart-legend {
  list-style: none;
  padding: 12px 0 0; margin: 0;
  display: flex; gap: 18px; justify-content: center;
}
.cmm-chart-legend-item {
  display: inline-flex; align-items: center; gap: 6px;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  color: var(--ink-2);
}
.cmm-chart-legend-swatch {
  width: 12px; height: 3px; border-radius: 2px;
}

/* ─── SCOUT ────────────────────────────────────────────────── */
.cmm-scout { margin-bottom: 28px; }
.cmm-scout-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 22px;
}
.cmm-scout-head {
  display: flex; align-items: center; gap: 10px;
  margin-bottom: 10px;
}
.cmm-scout-avatar {
  width: 40px; height: 40px; border-radius: 10px;
  display: grid; place-items: center;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900; font-size: 0.92rem;
  color: oklch(0.12 0.012 90);
  overflow: hidden;
  box-shadow: 0 6px 16px -8px oklch(0 0 0 / 0.55);
  flex-shrink: 0;
}
.cmm-scout-head-text { min-width: 0; }
.cmm-scout-name {
  margin: 0;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 1.02rem;
  line-height: 1;
  color: var(--ink-1);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.cmm-scout-meta {
  margin: 3px 0 0;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.74rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ink-3);
  font-variant-numeric: tabular-nums;
}
.cmm-scout-meta-dot { color: var(--ink-5); margin: 0 2px; }
.cmm-scout-body {
  margin: 0 0 10px;
  font-size: 0.93rem;
  line-height: 1.55;
  color: var(--ink-2);
}
.cmm-form-label {
  margin: 0 0 6px;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.66rem;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--ink-3);
}
.cmm-form-row {
  list-style: none;
  padding: 0; margin: 0;
  display: flex; gap: 4px;
}
.cmm-form-pip {
  width: 18px; height: 18px;
  display: grid; place-items: center;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.66rem;
  font-weight: 900;
  border-radius: 4px;
}
.cmm-form-pip-win {
  color: var(--accent-up);
  background: oklch(0.74 0.18 145 / 0.14);
  border: 1px solid oklch(0.74 0.18 145 / 0.32);
}
.cmm-form-pip-loss {
  color: var(--accent-secondary);
  background: oklch(0.70 0.27 350 / 0.10);
  border: 1px solid oklch(0.70 0.27 350 / 0.28);
}
.cmm-form-pip-tie {
  color: var(--ink-3);
  background: oklch(0.20 0.012 90 / 0.5);
  border: 1px solid oklch(0.22 0.015 90);
}

/* ─── CAT-BY-CAT BATTLE ───────────────────────────────────── */
.cmm-cats { margin-bottom: 24px; }
.cmm-cats-summary {
  margin: 0 0 12px;
  font-size: 0.95rem;
  line-height: 1.55;
  color: var(--ink-2);
}
.cmm-cats-strong {
  color: var(--ink-1);
  font-weight: 800;
}
.cmm-cats-wrap {
  border: 1px solid oklch(0.16 0.018 90);
  border-radius: 12px;
  overflow: hidden;
}
.cmm-cats-list {
  list-style: none;
  margin: 0; padding: 0;
}
.cmm-cats-row {
  display: grid;
  grid-template-columns:
    minmax(64px, 1fr)
    auto
    52px
    auto
    minmax(64px, 1fr)
    74px;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-bottom: 1px solid oklch(0.14 0.018 90);
  font-family: 'Barlow Condensed', sans-serif;
  font-variant-numeric: tabular-nums;
}
.cmm-cats-row:last-child { border-bottom: none; }
.cmm-cats-row-decided-home {
  background-color: oklch(0.74 0.18 145 / 0.06);  /* green - home left */
}
.cmm-cats-row-decided-away {
  background-color: oklch(0.70 0.27 350 / 0.06);  /* magenta - away right */
}
.cmm-cats-row-contested {
  background-color: oklch(0.78 0.18 92 / 0.05);
}
.cmm-cats-row-punted-home,
.cmm-cats-row-punted-away {
  background-color: transparent;
  opacity: 0.55;
}
.cmm-cats-val {
  font-size: 1rem;
  font-weight: 700;
  color: var(--ink-3);
}
.cmm-cats-val-a { text-align: right; }
.cmm-cats-val-b { text-align: left; }
.cmm-cats-val-lead {
  color: var(--ink-1);
  font-weight: 900;
}
.cmm-cats-margin {
  display: flex; align-items: center;
}
.cmm-cats-margin-a { justify-content: flex-end; }
.cmm-cats-margin-b { justify-content: flex-start; }
.cmm-cats-chip {
  display: inline-flex; align-items: center;
  padding: 2px 7px;
  border-radius: 999px;
  border: 1px solid;
  font-size: 0.70rem;
  font-weight: 900;
  letter-spacing: 0.04em;
  white-space: nowrap;
}
.cmm-cats-label {
  text-align: center;
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.10em;
  text-transform: uppercase;
  color: var(--ink-3);
}
.cmm-cats-status {
  display: flex; justify-content: flex-end; align-items: center;
}
.cmm-cats-status-chip {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 3px 7px;
  border-radius: 999px;
  border: 1px solid transparent;
  font-size: 0.66rem;
  font-weight: 900;
  letter-spacing: 0.10em;
  text-transform: uppercase;
}
.cmm-cats-status-chip-live {
  color: var(--accent-primary);
  background: oklch(0.78 0.18 92 / 0.10);
  border-color: oklch(0.78 0.18 92 / 0.32);
}
.cmm-cats-status-dot {
  width: 5px; height: 5px; border-radius: 50%;
  background: var(--accent-primary);
}
@media (prefers-reduced-motion: no-preference) {
  .cmm-cats-status-dot { animation: cmm-pulse 2.4s infinite cubic-bezier(0.22, 1, 0.36, 1); }
}
.cmm-cats-status-chip-locked {
  color: var(--accent-up);
  background: oklch(0.74 0.18 145 / 0.10);
  border-color: oklch(0.74 0.18 145 / 0.32);
}
.cmm-cats-status-chip-punt {
  color: var(--ink-3);
  background: oklch(0.16 0.018 90 / 0.6);
  border-color: oklch(0.22 0.015 90);
}

/* ─── WHAT TO WATCH ───────────────────────────────────────── */
.cmm-watch {
  background: oklch(0.78 0.18 92 / 0.05);
  border: 1px solid oklch(0.78 0.18 92 / 0.22);
  border-radius: 12px;
  padding: 14px 16px;
  margin-bottom: 22px;
}
.cmm-watch-eyebrow {
  margin: 0 0 4px;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--accent-primary);
}
.cmm-watch-body {
  margin: 0;
  font-size: 0.96rem;
  line-height: 1.5;
  color: var(--ink-1);
  font-style: italic;
}

/* ─── SEASON SERIES ─────────────────────────────────────────── */
.cmm-series { margin-bottom: 18px; }
.cmm-series-body {
  margin: 0;
  font-size: 0.96rem;
  line-height: 1.6;
  color: var(--ink-2);
  max-width: 64ch;
}

/* ─── FOOT ─────────────────────────────────────────────────── */
.cmm-foot {
  display: flex;
  justify-content: flex-end;
  padding-top: 14px;
  border-top: 1px solid oklch(0.16 0.015 90);
}
.cmm-share {
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
.cmm-share:hover { color: var(--ink-1); border-color: oklch(0.44 0.015 90); }
.cmm-share:active {
  transform: scale(0.97);
  transition-duration: 100ms;
}
.cmm-share:focus-visible { outline: 2px solid var(--accent-primary); outline-offset: 2px; }

/* ─── MOBILE ───────────────────────────────────────────────── */
@media (max-width: 620px) {
  .cmm-dialog { padding: 20px 18px 18px; }
  .cmm-head-name { font-size: 1rem; }
  .cmm-head-avatar { width: 38px; height: 38px; border-radius: 9px; }
  .cmm-wp { grid-template-columns: 1fr; gap: 18px; }
  .cmm-wp-team-away { align-items: flex-start; text-align: left; }
  .cmm-wp-center { flex-direction: row; }
  .cmm-wp-divider { width: 36px; height: 1px; }
  .cmm-wp-avatar { width: 64px; height: 64px; border-radius: 14px; }
  .cmm-scout-grid { grid-template-columns: 1fr; gap: 18px; }
  .cmm-chart-svg { height: 200px; }

  .cmm-cats-row {
    grid-template-columns:
      minmax(48px, 1fr)
      auto
      40px
      auto
      minmax(48px, 1fr);
    gap: 6px;
    padding: 8px 10px;
  }
  .cmm-cats-status { grid-column: 1 / -1; justify-content: flex-end; padding-top: 4px; }
  .cmm-cats-val { font-size: 0.92rem; }
  .cmm-cats-chip { font-size: 0.64rem; padding: 1px 6px; }
}
</style>
