<template>
  <div class="cmlist">
    <!-- ─────────────────────────────────────────────────────────────
         LIVE LOAD STATUS — only renders when a leagueId is in the URL
         and the live adapter is fetching or has errored. The
         underlying editorial keeps a fixture-derived render as its
         initial value, so the page remains visually populated.
    ────────────────────────────────────────────────────────────── -->
    <div v-if="liveLoading" class="live-banner live-banner-loading" role="status" aria-live="polite">
      <span class="live-banner-mark" aria-hidden="true">
        <img src="/tlb-favicon.png" alt="" class="live-banner-mark-img" />
      </span>
      Loading your league from {{ platformLabel }}. Hang tight.
    </div>
    <LiveLoadError v-else-if="liveError" :message="liveError" />

    <!-- ─────────────────────────────────────────────────────────────
         1. PAGE HEADER
    ────────────────────────────────────────────────────────────── -->
    <header class="page-head">
      <div class="page-head-copy">
        <p class="page-eyebrow">
          <span class="page-eyebrow-bar" aria-hidden="true"></span>
          Week {{ currentWeek }}
        </p>
        <h1 class="page-headline">{{ liveEditorial.subHeadline }}</h1>
        <p class="page-sub">Daily scores. Live cat math. Who's flipping, who's folded.</p>
      </div>
      <ul class="page-status" role="list" aria-label="Status overview">
        <li class="page-status-item">
          <span class="page-status-dot page-status-dot-live" aria-hidden="true"></span>
          <span class="page-status-num">{{ liveCount }}</span>
          <span class="page-status-label">live</span>
        </li>
        <li class="page-status-sep" aria-hidden="true"></li>
        <li class="page-status-item">
          <span class="page-status-num">{{ coastingCount }}</span>
          <span class="page-status-label">coasting</span>
        </li>
        <li class="page-status-sep" aria-hidden="true"></li>
        <li class="page-status-item">
          <span class="page-status-num">{{ lockedCount }}</span>
          <span class="page-status-label">locked</span>
        </li>
      </ul>
    </header>

    <!-- ─────────────────────────────────────────────────────────────
         2. MATCHUP OF THE WEEK — hero
    ────────────────────────────────────────────────────────────── -->
    <section
      v-if="heroMatchup"
      class="hero"
      :aria-labelledby="`hero-title-${heroMatchup.id}`"
    >
      <span class="hero-glow" aria-hidden="true"></span>

      <div class="hero-bar">
        <span class="hero-pill">{{ heroEyebrow }}</span>
        <span class="hero-live">
          <span class="hero-live-dot" aria-hidden="true"></span>
          Live
        </span>
      </div>

      <h2 :id="`hero-title-${heroMatchup.id}`" class="hero-headline">
        {{ heroHeadline }}
      </h2>

      <p v-if="heroBody" class="hero-body">{{ heroBody }}</p>

      <div class="hero-faceoff">
        <!-- HOME (team A) -->
        <article class="hero-team hero-team-home">
          <div
            class="hero-avatar"
            :style="{ background: `linear-gradient(135deg, ${heroHomeTeam.avatarColor})` }"
          >
            <img v-if="heroHomeTeam.avatarUrl" :src="heroHomeTeam.avatarUrl" class="avatar-img" alt="" />
            <span v-else>{{ heroHomeTeam.ownerInitials }}</span>
          </div>
          <h3 class="hero-team-name">{{ heroHomeTeam.name }}</h3>
          <p class="hero-team-meta">
            {{ heroHomeStanding.catWins }}-{{ heroHomeStanding.catLosses }}
            <span class="hero-team-meta-dot" aria-hidden="true">·</span>
            #{{ heroHomeStanding.rank }}
          </p>
          <p class="hero-wp" :style="{ color: heroHomePctColor }">{{ heroHomePct }}%</p>
          <p class="hero-wp-label">win prob</p>
        </article>

        <!-- CENTER COLUMN -->
        <div class="hero-center">
          <p class="hero-score-block">
            <span class="hero-score">{{ heroMatchup.aWins }}</span>
            <span class="hero-score-sep" aria-hidden="true">·</span>
            <span class="hero-score">{{ heroMatchup.bWins }}</span>
          </p>
          <p class="hero-score-label">cat record</p>
          <p class="hero-contested">{{ heroMatchup.contestedCount }} still contested</p>
        </div>

        <!-- AWAY (team B) -->
        <article class="hero-team hero-team-away">
          <div
            class="hero-avatar"
            :style="{ background: `linear-gradient(135deg, ${heroAwayTeam.avatarColor})` }"
          >
            <img v-if="heroAwayTeam.avatarUrl" :src="heroAwayTeam.avatarUrl" class="avatar-img" alt="" />
            <span v-else>{{ heroAwayTeam.ownerInitials }}</span>
          </div>
          <h3 class="hero-team-name">{{ heroAwayTeam.name }}</h3>
          <p class="hero-team-meta">
            {{ heroAwayStanding.catWins }}-{{ heroAwayStanding.catLosses }}
            <span class="hero-team-meta-dot" aria-hidden="true">·</span>
            #{{ heroAwayStanding.rank }}
          </p>
          <p class="hero-wp" :style="{ color: heroAwayPctColor }">{{ heroAwayPct }}%</p>
          <p class="hero-wp-label">win prob</p>
        </article>
      </div>

      <!-- Cat battle strip -->
      <ul class="cat-strip" :aria-label="`Category battle for ${heroHomeTeam.name} versus ${heroAwayTeam.name}`" role="list">
        <li
          v-for="line in heroMatchup.catLines"
          :key="line.catId"
          :class="['cat-cell', `cat-cell-${line.status}`]"
          :style="catCellStyle(line)"
        >
          <span class="cat-cell-label">{{ line.catId }}</span>
          <span class="cat-cell-values">
            <span
              class="cat-cell-val"
              :class="{ 'cat-cell-val-lead': heroAHasLead(line) && line.status !== 'punted-a' }"
              :style="heroAHasLead(line) ? { color: heroHomeAccent } : undefined"
            >{{ formatVal(line.catId, line.aCurrent) }}</span>
            <span class="cat-cell-sep" aria-hidden="true">·</span>
            <span
              class="cat-cell-val"
              :class="{ 'cat-cell-val-lead': heroBHasLead(line) && line.status !== 'punted-b' }"
              :style="heroBHasLead(line) ? { color: heroAwayAccent } : undefined"
            >{{ formatVal(line.catId, line.bCurrent) }}</span>
          </span>
          <span v-if="line.status === 'punted-a' || line.status === 'punted-b'" class="cat-cell-tag">Punt</span>
        </li>
      </ul>
      <p class="cat-strip-context">
        <strong class="cat-strip-strong">{{ heroDecidedB }} decided</strong> for {{ heroAwayTeam.name }}.
        <strong class="cat-strip-strong">{{ heroContested }} contested</strong>.
        <strong class="cat-strip-strong">{{ heroConcededB }} conceded</strong> by {{ heroAwayTeam.name }}.
      </p>
      <p v-if="heroSubContext" class="hero-sub-context">{{ heroSubContext }}</p>

      <!-- Daily trend chart -->
      <div class="hero-chart-wrap">
        <svg
          class="hero-chart"
          :viewBox="`0 0 ${HERO_W} ${HERO_H}`"
          preserveAspectRatio="none"
          role="img"
          :aria-label="`Daily win probability across the week.`"
        >
          <line
            class="hero-chart-mid"
            x1="0" :y1="heroChartY(50)" :x2="HERO_W" :y2="heroChartY(50)"
          />
          <path
            class="hero-chart-line"
            :d="heroChartPath(heroHomeSeries)"
            :stroke="heroHomeAccent"
          />
          <path
            class="hero-chart-line"
            :d="heroChartPath(heroAwaySeries)"
            :stroke="heroAwayAccent"
          />
          <g v-if="heroNowX !== null" class="hero-chart-now">
            <line :x1="heroNowX" y1="6" :x2="heroNowX" :y2="HERO_H - 4" />
          </g>
        </svg>
        <ul class="hero-chart-days" aria-hidden="true">
          <li
            v-for="(d, i) in DAY_LABELS"
            :key="d"
            :class="{ 'hero-chart-day-now': i === heroCurrentDayIndex }"
          >{{ d }}</li>
        </ul>
      </div>

      <div class="hero-foot">
        <button
          type="button"
          class="hero-cta"
          @click="openDetail(heroMatchup.id, $event)"
        >
          View full matchup
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </button>
      </div>
    </section>

    <!-- ─────────────────────────────────────────────────────────────
         3. THE REST OF THE WEEK — feed
    ────────────────────────────────────────────────────────────── -->
    <section class="feed" aria-labelledby="feed-heading">
      <header class="section-head">
        <p class="section-eyebrow section-eyebrow-teal" id="feed-heading">The rest of the week</p>
        <h2 class="feed-headline">Four more battles. Three storylines.</h2>
      </header>

      <ul class="feed-list" role="list">
        <li v-for="m in feedMatchups" :key="m.id">
          <article
            class="feed-card"
            :class="[`feed-card-${m.status}`]"
            :style="{
              background: feedCardBg(m),
              borderColor: feedCardBorder(m),
            }"
            tabindex="0"
            role="button"
            :aria-label="`Open ${homeOf(m).name} vs ${awayOf(m).name}`"
            @click="openDetail(m.id, $event)"
            @keydown.enter.prevent="openDetail(m.id, $event)"
            @keydown.space.prevent="openDetail(m.id, $event)"
          >
            <span class="feed-card-edge" :class="`feed-card-edge-${m.status}`" aria-hidden="true"></span>

            <!-- HOME -->
            <div class="feed-team feed-team-home">
              <div
                class="feed-avatar"
                :style="{ background: `linear-gradient(135deg, ${homeOf(m).avatarColor})` }"
              >
                <img v-if="homeOf(m).avatarUrl" :src="homeOf(m).avatarUrl" class="avatar-img" alt="" />
                <span v-else>{{ homeOf(m).ownerInitials }}</span>
              </div>
              <div class="feed-team-text">
                <p class="feed-team-name">{{ homeOf(m).name }}</p>
                <p class="feed-team-meta">
                  {{ standingOf(m.homeTeamId).catWins }}-{{ standingOf(m.homeTeamId).catLosses }}
                  <span class="feed-team-meta-dot" aria-hidden="true">·</span>
                  #{{ standingOf(m.homeTeamId).rank }}
                </p>
              </div>
              <p class="feed-cats" :style="m.aWins > m.bWins ? { color: feedAccentHome(m) } : undefined">
                {{ m.aWins }}<span class="feed-cats-suf">cats</span>
              </p>
            </div>

            <!-- CENTER -->
            <div class="feed-center">
              <span
                v-if="m.status === 'live'"
                class="feed-status feed-status-live"
              >
                <span class="feed-status-dot" aria-hidden="true"></span>
                Live
              </span>
              <span
                v-else-if="m.status === 'coasting'"
                class="feed-status feed-status-coasting"
              >Coasting</span>
              <span
                v-else-if="m.status === 'final'"
                class="feed-status feed-status-final"
              >
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                Locked
              </span>
              <span v-else class="feed-status feed-status-upcoming">Upcoming</span>

              <span class="feed-vs" aria-hidden="true">vs</span>

              <span class="feed-wp">
                <span class="feed-wp-pct" :style="{ color: feedAccentHome(m) }">{{ clampWP(m.homeWinProb) }}%</span>
                <span class="feed-wp-pct-sep" aria-hidden="true">·</span>
                <span class="feed-wp-pct" :style="{ color: feedAccentAway(m) }">{{ 100 - clampWP(m.homeWinProb) }}%</span>
              </span>
            </div>

            <!-- AWAY -->
            <div class="feed-team feed-team-away">
              <p class="feed-cats" :style="m.bWins > m.aWins ? { color: feedAccentAway(m) } : undefined">
                {{ m.bWins }}<span class="feed-cats-suf">cats</span>
              </p>
              <div class="feed-team-text feed-team-text-right">
                <p class="feed-team-name">{{ awayOf(m).name }}</p>
                <p class="feed-team-meta">
                  {{ standingOf(m.awayTeamId).catWins }}-{{ standingOf(m.awayTeamId).catLosses }}
                  <span class="feed-team-meta-dot" aria-hidden="true">·</span>
                  #{{ standingOf(m.awayTeamId).rank }}
                </p>
              </div>
              <div
                class="feed-avatar"
                :style="{ background: `linear-gradient(135deg, ${awayOf(m).avatarColor})` }"
              >
                <img v-if="awayOf(m).avatarUrl" :src="awayOf(m).avatarUrl" class="avatar-img" alt="" />
                <span v-else>{{ awayOf(m).ownerInitials }}</span>
              </div>
            </div>

            <!-- SHARE -->
            <button
              type="button"
              class="feed-share"
              :aria-label="`Share ${homeOf(m).name} vs ${awayOf(m).name}`"
              @click.stop="$emit('open-signup')"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
                <polyline points="16 6 12 2 8 6"/>
                <line x1="12" y1="2" x2="12" y2="15"/>
              </svg>
            </button>
          </article>
        </li>
      </ul>
    </section>

    <!-- ─────────────────────────────────────────────────────────────
         4. QUICK READS — the board
    ────────────────────────────────────────────────────────────── -->
    <section class="quick" aria-labelledby="quick-heading">
      <h2 class="section-eyebrow section-eyebrow-mute" id="quick-heading">The board</h2>
      <ul class="pills" role="list">
        <li
          v-for="(pill, i) in liveEditorial.quickReads"
          :key="pill.label"
          class="pill"
          role="listitem"
        >
          <div class="pill-head">
            <span class="pill-dot" :class="`pill-dot-${pillDotFor(i)}`" aria-hidden="true"></span>
            <span class="pill-label">{{ formatPillLabel(pill.label) }}</span>
          </div>
          <span class="pill-value">{{ pill.value }}</span>
        </li>
      </ul>
    </section>

    <!-- Modal -->
    <CategoryMatchupDetailModal
      v-if="detailMatchupId"
      :matchup-id="detailMatchupId"
      :what-to-watch-override="detailWhatToWatch"
      :season-series-override="detailSeasonSeries"
      @close="closeDetail"
      @open-signup="$emit('open-signup')"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, shallowRef } from 'vue'
import { useRoute } from 'vue-router'
import {
  currentWeek,
  getTeam,
  matchupsWeek8,
  matchupOfTheWeekId,
  standings2026Week8,
  type CategoryMatchup,
  type CategoryMatchupCatLine,
  type CategoryId,
} from '@/fixtures/categoriesLeague'
import CategoryMatchupDetailModal from '@/components/demo/CategoryMatchupDetailModal.vue'
import { accentFor } from '@/utils/teamColor'
import { smoothPath, type Point } from '@/utils/svgPath'
import {
  renderMatchupsPage,
  type RenderedMatchupsCopy,
} from '@/editorial/render-matchups'
import { categoriesFixtureToLeagueData } from '@/editorial/fixtureAdapter'
import { sleeperLeagueToCategoryData } from '@/editorial/adapters/sleeperAdapter'
import { espnLeagueToCategoryData } from '@/editorial/adapters/espnAdapter'
import { yahooLeagueToCategoryData } from '@/editorial/adapters/yahooAdapter'
import { usePlatformsStore } from '@/stores/platforms'
import LiveLoadError from '@/components/demo/LiveLoadError.vue'

defineEmits<{ (e: 'open-signup'): void }>()

const route = useRoute()

/* ─────────────────────────────────────────────────────────────────
   EDITORIAL — live copy from the detection + rendering pipeline.

   Source of truth:
   - Default: the hand-authored fixture (the demo experience).
   - When `?leagueId=…&platform=sleeper` is present in the URL:
     fetch live data via the matching adapter and re-render copy.
     The fixture render is kept as the synchronous initial value
     so the template never sees a null editorial during load.

   `shallowRef` mirrors the Home view pattern — the rendered tree is
   always replaced wholesale, never mutated in place.
───────────────────────────────────────────────────────────────── */
const liveEditorial = shallowRef<RenderedMatchupsCopy>(
  renderMatchupsPage(categoriesFixtureToLeagueData()),
)
const liveLoading = ref(false)
const liveError = ref<string | null>(null)
const liveLeagueId = computed(() => {
  const v = route.query.leagueId
  return typeof v === 'string' && v.trim().length > 0 ? v.trim() : null
})
const livePlatform = computed(() => {
  const v = route.query.platform
  return typeof v === 'string' && v.trim().length > 0 ? v.trim() : null
})

// Human-readable platform label, surfaced by the loading banner so the
// "Loading your league from X" copy matches the platform the user
// actually picked on the Connect screen.
const platformLabel = computed(() => {
  const p = livePlatform.value
  if (p === 'yahoo') return 'Yahoo'
  if (p === 'espn') return 'ESPN'
  if (p === 'sleeper') return 'Sleeper'
  return 'your league'
})

onMounted(async () => {
  const id = liveLeagueId.value
  const platform = livePlatform.value
  if (!id || (platform !== 'sleeper' && platform !== 'espn' && platform !== 'yahoo')) {
    return  // fixture-only path
  }

  liveLoading.value = true
  liveError.value = null
  try {
    // See CategoryDemoHomeView for why we pass identity explicitly.
    const opts = { userIdentity: collectUserIdentity() }
    const data =
      platform === 'espn'
        ? await espnLeagueToCategoryData(id, opts)
        : platform === 'yahoo'
        ? await yahooLeagueToCategoryData(id, opts)
        : await sleeperLeagueToCategoryData(id, opts)
    liveEditorial.value = renderMatchupsPage(data)
  } catch (err) {
    const platformLabel =
      platform === 'espn' ? 'ESPN' : platform === 'yahoo' ? 'Yahoo' : 'Sleeper'
    liveError.value = (err as Error).message || `Failed to load ${platformLabel} league data.`
  } finally {
    liveLoading.value = false
  }
})

/** See CategoryDemoHomeView.collectUserIdentity for the rationale. */
function collectUserIdentity() {
  try {
    const platformsStore = usePlatformsStore()
    return {
      sleeperUserId: platformsStore.getConnection('sleeper')?.platform_user_id ?? undefined,
      yahooGuid: platformsStore.getConnection('yahoo')?.platform_user_id ?? undefined,
      espnSwid: platformsStore.getEspnCredentials()?.swid ?? undefined,
    }
  } catch {
    return {}
  }
}

/* ─── Modal state ───────────────────────────────────────────── */
const detailMatchupId = ref<string | null>(null)
const lastClickedRef = ref<HTMLElement | null>(null)

const detailWhatToWatch = computed(() => {
  const id = detailMatchupId.value
  if (!id) return undefined
  return liveEditorial.value.matchupCopy[id]?.whatToWatch
})
const detailSeasonSeries = computed(() => {
  const id = detailMatchupId.value
  if (!id) return undefined
  return liveEditorial.value.matchupCopy[id]?.seasonSeries
})

function openDetail(id: string, ev: Event) {
  detailMatchupId.value = id
  const target = ev.currentTarget as HTMLElement | null
  if (target) lastClickedRef.value = target
}
function closeDetail() {
  detailMatchupId.value = null
  lastClickedRef.value?.focus?.()
}

/* ─── Status counts ─────────────────────────────────────────── */
const liveCount     = computed(() => matchupsWeek8.filter((m) => m.status === 'live').length)
const coastingCount = computed(() => matchupsWeek8.filter((m) => m.status === 'coasting').length)
const lockedCount   = computed(() => matchupsWeek8.filter((m) => m.status === 'final').length)

/* ─── Hero matchup ──────────────────────────────────────────── */
const heroMatchup = computed(() => matchupsWeek8.find((m) => m.id === matchupOfTheWeekId)!)

/* Editorial hero copy — driven by the renderer, which picked the
 *  matchup it considers the strongest hero. The hero face-off, cat
 *  strip, and chart still bind to the data-driven `heroMatchup`
 *  fixture entry; only the eyebrow / headline / body / sub-context
 *  strings come from the editorial pipeline. */
const heroEyebrow = computed(() => liveEditorial.value.matchupOfWeek.eyebrow || 'Matchup of the Week')
const heroHeadline = computed(() => liveEditorial.value.matchupOfWeek.headline)
const heroBody = computed(() => liveEditorial.value.matchupOfWeek.body)
const heroSubContext = computed(() => liveEditorial.value.matchupOfWeek.subContext)

/** Map quick-read pill index to the existing pill-dot color tokens.
 *  Matches the order: tightest, sweep, bubble, punt. */
function pillDotFor(i: number): 'primary' | 'secondary' | 'tertiary' | 'mute' {
  switch (i) {
    case 0: return 'primary'
    case 1: return 'secondary'
    case 2: return 'tertiary'
    default: return 'mute'
  }
}

/** Pill labels render in sentence case in the template; the renderer
 *  hands us the uppercase pill identifier. */
function formatPillLabel(label: string): string {
  return label.charAt(0) + label.slice(1).toLowerCase()
}
const heroHomeTeam = computed(() => getTeam(heroMatchup.value.homeTeamId))
const heroAwayTeam = computed(() => getTeam(heroMatchup.value.awayTeamId))
const heroHomeStanding = computed(
  () => standings2026Week8.find((s) => s.teamId === heroMatchup.value.homeTeamId)!,
)
const heroAwayStanding = computed(
  () => standings2026Week8.find((s) => s.teamId === heroMatchup.value.awayTeamId)!,
)
const heroHomeAccent = computed(() => accentFor(heroHomeTeam.value))
const heroAwayAccent = computed(() => accentFor(heroAwayTeam.value))
const heroHomePct = computed(() => clampWP(heroMatchup.value.homeWinProb))
const heroAwayPct = computed(() => 100 - heroHomePct.value)
const heroHomePctColor = computed(() =>
  heroHomePct.value >= heroAwayPct.value
    ? 'oklch(0.74 0.18 145)'
    : 'oklch(0.70 0.27 350)',
)
const heroAwayPctColor = computed(() =>
  heroAwayPct.value >= heroHomePct.value
    ? 'oklch(0.74 0.18 145)'
    : 'oklch(0.70 0.27 350)',
)

const heroDecidedB = computed(
  () => heroMatchup.value.catLines.filter((c) => c.status === 'decided-b').length,
)
const heroContested = computed(
  () => heroMatchup.value.catLines.filter((c) => c.status === 'contested').length,
)
const heroConcededB = computed(
  () => heroMatchup.value.catLines.filter((c) => c.status === 'punted-b').length,
)

/* ─── Cat-strip helpers ─────────────────────────────────────── */
function lowerBetter(catId: CategoryId): boolean {
  return catId === 'ERA'
}
function heroAHasLead(line: CategoryMatchupCatLine): boolean {
  if (line.aCurrent === line.bCurrent) return false
  return lowerBetter(line.catId)
    ? line.aCurrent < line.bCurrent
    : line.aCurrent > line.bCurrent
}
function heroBHasLead(line: CategoryMatchupCatLine): boolean {
  if (line.aCurrent === line.bCurrent) return false
  return lowerBetter(line.catId)
    ? line.bCurrent < line.aCurrent
    : line.bCurrent > line.aCurrent
}
function formatVal(catId: CategoryId, v: number): string {
  if (catId === 'AVG') return v.toFixed(3).replace(/^0/, '')
  if (catId === 'ERA') return v.toFixed(2)
  return Math.round(v).toString()
}
function catCellStyle(line: CategoryMatchupCatLine) {
  if (line.status === 'decided-a') {
    return {
      background: `linear-gradient(90deg, ${tintFrom(heroHomeAccent.value, 0.20)} 0%, oklch(0.13 0.018 90 / 0.6) 100%)`,
      borderColor: tintFrom(heroHomeAccent.value, 0.30),
    }
  }
  if (line.status === 'decided-b') {
    return {
      background: `linear-gradient(270deg, ${tintFrom(heroAwayAccent.value, 0.20)} 0%, oklch(0.13 0.018 90 / 0.6) 100%)`,
      borderColor: tintFrom(heroAwayAccent.value, 0.30),
    }
  }
  if (line.status === 'contested') {
    return {
      background: 'oklch(0.78 0.18 92 / 0.10)',
      borderColor: 'oklch(0.78 0.18 92 / 0.34)',
    }
  }
  return {
    background: 'transparent',
    borderColor: 'oklch(0.22 0.015 90)',
  }
}

/* ─── Feed ──────────────────────────────────────────────────── */
const feedMatchups = computed(() =>
  matchupsWeek8.filter((m) => m.id !== matchupOfTheWeekId),
)
function homeOf(m: CategoryMatchup) { return getTeam(m.homeTeamId) }
function awayOf(m: CategoryMatchup) { return getTeam(m.awayTeamId) }
function standingOf(teamId: string) {
  return standings2026Week8.find((s) => s.teamId === teamId)!
}
function feedAccentHome(m: CategoryMatchup) { return accentFor(homeOf(m)) }
function feedAccentAway(m: CategoryMatchup) { return accentFor(awayOf(m)) }
function feedCardBg(m: CategoryMatchup) {
  // The card slants toward the leader's accent.
  const leader = m.aWins > m.bWins ? homeOf(m) : awayOf(m)
  const stop = accentFor(leader)
  return `linear-gradient(135deg, ${tintFrom(stop, 0.045)}, oklch(0.10 0.015 90 / 0.4))`
}
function feedCardBorder(m: CategoryMatchup) {
  const leader = m.aWins > m.bWins ? homeOf(m) : awayOf(m)
  return tintFrom(accentFor(leader), 0.20)
}

/* ─── Helpers ──────────────────────────────────────────────── */
function clampWP(v: number) {
  return Math.max(1, Math.min(99, Math.round(v)))
}
function tintFrom(oklch: string, alpha: number) {
  const inner = oklch.replace(/^oklch\(/, '').replace(/\)$/, '').trim()
  return `oklch(${inner} / ${alpha})`
}

/* ─── Hero mini chart geometry ─────────────────────────────── */
const HERO_W = 600
const HERO_H = 80
const HERO_X_LEFT = 12
const HERO_X_RIGHT = 12
const HERO_Y_TOP = 6
const HERO_Y_BOTTOM = 6
const N_DAYS = 7
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const heroHomeSeries = computed(() =>
  heroMatchup.value.dailyTrend.map((d) => clampWP(d.aWinProb)),
)
const heroAwaySeries = computed(() =>
  heroMatchup.value.dailyTrend.map((d) => clampWP(d.bWinProb)),
)
const heroCurrentDayIndex = computed(() => {
  let idx = -1
  heroMatchup.value.dailyTrend.forEach((d, i) => {
    if (!d.isProjection) idx = i
  })
  return idx === -1 ? null : idx
})

function heroChartX(i: number) {
  const usable = HERO_W - HERO_X_LEFT - HERO_X_RIGHT
  return HERO_X_LEFT + (i / (N_DAYS - 1)) * usable
}
function heroChartY(p: number) {
  const usable = HERO_H - HERO_Y_TOP - HERO_Y_BOTTOM
  return HERO_Y_TOP + ((100 - p) / 100) * usable
}
function heroChartPath(values: number[]) {
  const pts: Point[] = values.map((v, i) => ({ x: heroChartX(i), y: heroChartY(v) }))
  return smoothPath(pts)
}
const heroNowX = computed(() => {
  const idx = heroCurrentDayIndex.value
  if (idx === null) return null
  return heroChartX(idx)
})
</script>

<style scoped>
.cmlist {
  --ink-4: oklch(0.40 0.012 90);
  --accent-down: oklch(0.70 0.27 350); /* magenta — falling team */

  display: flex;
  flex-direction: column;
  gap: 40px;
  color: var(--ink-1);
  font-family: 'Barlow', sans-serif;
}
.avatar-img {
  width: 100%; height: 100%; object-fit: cover; display: block;
}

/* ─── Live load banners ─────────────────────────────────────── */
.live-banner {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 10px;
  border: 1px solid oklch(0.20 0.015 90);
  background: oklch(0.10 0.014 90);
  font-size: 0.92rem;
  color: var(--ink-2);
}
.live-banner-loading { color: var(--accent-tertiary); }
.live-banner-spinner {
  width: 14px; height: 14px; border-radius: 50%;
  border: 2px solid oklch(0.72 0.18 195 / 0.30);
  border-top-color: var(--accent-tertiary);
}
@media (prefers-reduced-motion: no-preference) {
  @keyframes live-spin { to { transform: rotate(360deg); } }
  .live-banner-spinner { animation: live-spin 0.9s linear infinite; }
}
.live-banner-mark {
  display: inline-flex; align-items: center; justify-content: center;
  width: 22px; height: 22px; border-radius: 4px; overflow: hidden; flex-shrink: 0;
}
.live-banner-mark-img { width: 100%; height: 100%; display: block; }
@media (prefers-reduced-motion: no-preference) {
  @keyframes live-pulse {
    0%, 100% { opacity: 0.55; transform: scale(0.96); }
    50%      { opacity: 1;    transform: scale(1.02); }
  }
  .live-banner-mark { animation: live-pulse 1.6s cubic-bezier(0.22, 1, 0.36, 1) infinite; }
}
.live-banner-error {
  flex-wrap: wrap;
  border-color: oklch(0.65 0.20 25 / 0.45);
  background: oklch(0.65 0.20 25 / 0.08);
}
.live-banner-error-headline {
  margin: 0;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.86rem;
  font-weight: 800;
  letter-spacing: 0.10em;
  text-transform: uppercase;
  color: var(--accent-down);
}
.live-banner-error-body {
  margin: 0;
  font-size: 0.92rem;
  color: var(--ink-2);
  flex: 1 1 240px;
}
.live-banner-action {
  display: inline-flex; align-items: center; gap: 5px;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.82rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ink-1);
  text-decoration: none;
  padding: 6px 12px;
  border-radius: 999px;
  background: oklch(0.20 0.015 90);
  border: 1px solid oklch(0.32 0.012 90);
  transition: background-color 160ms cubic-bezier(0.22, 1, 0.36, 1);
}
@media (hover: hover) and (pointer: fine) {
  .live-banner-action:hover { background: oklch(0.26 0.015 90); }
}

/* ─── PAGE HEAD ────────────────────────────────────────────── */
.page-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
  flex-wrap: wrap;
}
.page-head-copy { min-width: 0; max-width: 720px; }
.page-eyebrow {
  display: inline-flex; align-items: center; gap: 10px;
  margin: 0 0 8px;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.74rem;
  font-weight: 800;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--accent-secondary);
}
.page-eyebrow-bar {
  width: 22px; height: 2px;
  background: var(--accent-secondary);
  display: inline-block;
}
.page-headline {
  margin: 0 0 6px;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: clamp(2.1rem, 5.2vw, 3rem);
  line-height: 1.02;
  letter-spacing: -0.02em;
  color: var(--ink-1);
}
.page-sub {
  margin: 0;
  font-size: 1rem;
  color: var(--ink-2);
  line-height: 1.4;
}
.page-status {
  list-style: none; margin: 0; padding: 0;
  display: flex; align-items: center; gap: 10px;
}
.page-status-item {
  display: inline-flex; align-items: baseline; gap: 6px;
}
.page-status-num {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 1.4rem;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.008em;
  color: var(--ink-1);
}
.page-status-label {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.74rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--ink-3);
}
.page-status-sep {
  width: 4px; height: 4px; border-radius: 50%;
  background: var(--ink-5);
  display: inline-block;
}
.page-status-dot {
  width: 7px; height: 7px; border-radius: 50%;
  display: inline-block;
}
.page-status-dot-live { background: var(--accent-primary); }
@media (prefers-reduced-motion: no-preference) {
  @keyframes cmlist-pulse {
    0%, 60%, 100% { opacity: 1; transform: scale(1); }
    30% { opacity: 0.4; transform: scale(1.5); }
  }
  .page-status-dot-live { animation: cmlist-pulse 2.4s infinite cubic-bezier(0.22, 1, 0.36, 1); }
}

/* ─── SECTION HEAD shared ────────────────────────────────── */
.section-head { margin-bottom: 14px; }
.section-eyebrow {
  margin: 0 0 4px;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--ink-3);
}
.section-eyebrow-teal { color: var(--accent-tertiary); }
.section-eyebrow-mute { color: var(--ink-3); }
.feed-headline {
  margin: 0;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 1.5rem;
  line-height: 1.05;
  letter-spacing: -0.008em;
  color: var(--ink-1);
}

/* ─── HERO ────────────────────────────────────────────────── */
.hero {
  position: relative;
  padding: 22px 24px 18px;
  border: 1px solid oklch(0.72 0.18 195 / 0.28);
  border-radius: 20px;
  background:
    linear-gradient(155deg,
      oklch(0.72 0.18 195 / 0.07),
      oklch(0.10 0.015 90 / 0.4) 60%
    ),
    oklch(0.11 0.015 90);
  overflow: hidden;
}
.hero-glow {
  position: absolute;
  inset: -30% -10% auto -10%;
  height: 180px;
  background: radial-gradient(ellipse 60% 80% at 50% 0%, oklch(0.72 0.18 195 / 0.16), transparent 70%);
  pointer-events: none;
  z-index: 0;
}
.hero-bar {
  position: relative; z-index: 1;
  display: flex; align-items: center; justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}
.hero-pill {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.70rem;
  font-weight: 800;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--accent-secondary);
  background: oklch(0.70 0.27 350 / 0.12);
  border: 1px solid oklch(0.70 0.27 350 / 0.34);
  padding: 5px 11px;
  border-radius: 999px;
}
.hero-live {
  display: inline-flex; align-items: center; gap: 6px;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.72rem;
  font-weight: 900;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--accent-primary);
  padding: 4px 10px;
  border-radius: 999px;
  background: oklch(0.78 0.18 92 / 0.10);
  border: 1px solid oklch(0.78 0.18 92 / 0.35);
}
.hero-live-dot {
  width: 6px; height: 6px; border-radius: 50%;
  background: var(--accent-primary);
}
@media (prefers-reduced-motion: no-preference) {
  .hero-live-dot { animation: cmlist-pulse 2.4s infinite cubic-bezier(0.22, 1, 0.36, 1); }
}
.hero-headline {
  position: relative;
  z-index: 1;
  margin: 0 0 16px;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: clamp(1.7rem, 3.8vw, 2.4rem);
  line-height: 1.04;
  letter-spacing: -0.014em;
  color: var(--ink-1);
  max-width: 32ch;
}
.hero-body {
  position: relative;
  z-index: 1;
  margin: -6px 0 16px;
  font-size: 1rem;
  line-height: 1.5;
  color: var(--ink-2);
  max-width: 56ch;
}
.hero-sub-context {
  position: relative;
  z-index: 1;
  margin: -4px 0 12px;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.84rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: var(--ink-3);
}

.hero-faceoff {
  position: relative; z-index: 1;
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 18px;
  margin-bottom: 16px;
}
.hero-team {
  display: flex; flex-direction: column;
  min-width: 0;
}
.hero-team-home { align-items: flex-start; }
.hero-team-away { align-items: flex-end; text-align: right; }
.hero-avatar {
  width: 100px; height: 100px;
  border-radius: 22px;
  display: grid; place-items: center;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 1.9rem;
  color: oklch(0.12 0.012 90);
  overflow: hidden;
  box-shadow: 0 14px 36px -14px oklch(0 0 0 / 0.75);
  margin-bottom: 10px;
}
.hero-team-name {
  margin: 0;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 1.2rem;
  line-height: 1.05;
  letter-spacing: -0.006em;
  color: var(--ink-1);
}
.hero-team-meta {
  margin: 3px 0 0;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.74rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ink-3);
  font-variant-numeric: tabular-nums;
}
.hero-team-meta-dot { color: var(--ink-5); margin: 0 4px; }
.hero-wp {
  margin: 10px 0 0;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: clamp(2.4rem, 5.6vw, 3.2rem);
  line-height: 1;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.014em;
}
.hero-wp-label {
  margin: 2px 0 0;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--ink-4);
}

.hero-center {
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  gap: 2px;
  padding: 0 6px;
  min-width: 0;
}
.hero-score-block {
  margin: 0;
  display: inline-flex; align-items: baseline; gap: 10px;
}
.hero-score {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: clamp(2.2rem, 5vw, 2.8rem);
  line-height: 1;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.012em;
  color: var(--ink-1);
}
.hero-score-sep {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 700;
  font-size: 1.2rem;
  color: var(--ink-5);
}
.hero-score-label {
  margin: 6px 0 0;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--ink-4);
}
.hero-contested {
  margin: 4px 0 0;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: var(--accent-tertiary);
  text-align: center;
}

/* ─── Cat strip ──────────────────────────────────────────── */
.cat-strip {
  position: relative; z-index: 1;
  list-style: none;
  display: grid;
  grid-template-columns: repeat(11, minmax(0, 1fr));
  gap: 4px;
  padding: 0;
  margin: 4px 0 6px;
}
.cat-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  padding: 8px 4px 7px;
  border-radius: 8px;
  border: 1px solid;
  min-height: 58px;
  text-align: center;
}
.cat-cell-label {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.66rem;
  font-weight: 900;
  letter-spacing: 0.10em;
  text-transform: uppercase;
  color: var(--ink-3);
}
.cat-cell-values {
  display: inline-flex; align-items: baseline; gap: 4px;
  font-family: 'Barlow Condensed', sans-serif;
  font-variant-numeric: tabular-nums;
}
.cat-cell-val {
  font-size: 0.84rem;
  font-weight: 700;
  color: var(--ink-3);
}
.cat-cell-val-lead {
  font-weight: 900;
  color: var(--ink-1);
}
.cat-cell-sep { color: var(--ink-5); font-weight: 500; }
.cat-cell-tag {
  margin-top: 1px;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.60rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--ink-4);
}
.cat-cell-punted-a .cat-cell-label,
.cat-cell-punted-b .cat-cell-label,
.cat-cell-punted-a .cat-cell-val,
.cat-cell-punted-b .cat-cell-val { opacity: 0.65; }

.cat-strip-context {
  position: relative; z-index: 1;
  margin: 6px 0 14px;
  font-size: 0.92rem;
  line-height: 1.5;
  color: var(--ink-2);
}
.cat-strip-strong {
  color: var(--ink-1);
  font-weight: 800;
}

/* ─── Hero chart ─────────────────────────────────────────── */
.hero-chart-wrap {
  position: relative; z-index: 1;
  margin: 8px 0 0;
  padding-top: 14px;
  border-top: 1px solid oklch(0.18 0.018 90);
}
.hero-chart {
  width: 100%;
  height: 80px;
  display: block;
}
.hero-chart-mid {
  stroke: oklch(0.20 0.015 90);
  stroke-width: 1;
  stroke-dasharray: 2 4;
}
.hero-chart-line {
  fill: none;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.hero-chart-now line {
  stroke: var(--accent-tertiary);
  stroke-width: 1.5;
  stroke-dasharray: 3 3;
}
.hero-chart-days {
  display: flex;
  justify-content: space-between;
  margin: 4px 12px 0;
  padding: 0;
  list-style: none;
}
.hero-chart-days li {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.64rem;
  font-weight: 700;
  letter-spacing: 0.10em;
  text-transform: uppercase;
  color: var(--ink-4);
}
.hero-chart-day-now { color: var(--accent-tertiary); }

.hero-foot {
  position: relative; z-index: 1;
  display: flex;
  justify-content: flex-end;
  margin-top: 14px;
}
.hero-cta {
  display: inline-flex; align-items: center; gap: 6px;
  background: oklch(0.78 0.18 92);
  color: oklch(0.10 0.012 90);
  border: none;
  padding: 8px 14px;
  border-radius: 999px;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.84rem;
  font-weight: 900;
  letter-spacing: 0.06em;
  cursor: pointer;
  transition: transform 180ms cubic-bezier(0.22, 1, 0.36, 1),
              background-color 180ms cubic-bezier(0.22, 1, 0.36, 1);
}
@media (prefers-reduced-motion: no-preference) {
  .hero-cta:hover { transform: translateY(-1px); }
}
.hero-cta:active {
  transform: scale(0.97);
  transition-duration: 100ms;
}
.hero-cta:focus-visible {
  outline: 2px solid oklch(0.97 0.005 90);
  outline-offset: 2px;
}

/* ─── FEED ────────────────────────────────────────────────── */
.feed-list {
  list-style: none;
  margin: 0; padding: 0;
  display: flex; flex-direction: column;
  gap: 10px;
}
.feed-card {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr) 32px;
  align-items: center;
  gap: 16px;
  padding: 14px 18px;
  border: 1px solid;
  border-radius: 14px;
  cursor: pointer;
  transition: transform 180ms cubic-bezier(0.22, 1, 0.36, 1),
              border-color 180ms cubic-bezier(0.22, 1, 0.36, 1);
  overflow: hidden;
}
@media (prefers-reduced-motion: no-preference) {
  .feed-card:hover { transform: translateY(-1px); }
}
.feed-card:active {
  transform: scale(0.99);
  transition-duration: 100ms;
}
.feed-card:focus-visible {
  outline: 2px solid var(--accent-primary);
  outline-offset: 2px;
}
.feed-card-upcoming { opacity: 0.86; }
.feed-card-edge {
  position: absolute;
  inset: 0 auto 0 0;
  width: 1px;
}
.feed-card-edge-live      { background: var(--accent-tertiary); }
.feed-card-edge-coasting  { background: var(--accent-secondary); }
.feed-card-edge-final     { background: var(--accent-up); }
.feed-card-edge-upcoming  { background: oklch(0.30 0.015 90); }

.feed-team {
  display: flex; align-items: center; gap: 12px; min-width: 0;
}
.feed-team-home { justify-content: flex-start; }
.feed-team-away { justify-content: flex-end; }
.feed-avatar {
  width: 48px; height: 48px;
  border-radius: 12px;
  display: grid; place-items: center;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 1.1rem;
  color: oklch(0.12 0.012 90);
  overflow: hidden;
  flex-shrink: 0;
  box-shadow: 0 6px 16px -8px oklch(0 0 0 / 0.55);
}
.feed-team-text { min-width: 0; }
.feed-team-text-right { text-align: right; }
.feed-team-name {
  margin: 0;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 1rem;
  line-height: 1.1;
  letter-spacing: -0.004em;
  color: var(--ink-1);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.feed-team-meta {
  margin: 2px 0 0;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ink-3);
  font-variant-numeric: tabular-nums;
}
.feed-team-meta-dot { color: var(--ink-5); margin: 0 4px; }
.feed-cats {
  margin: 0 0 0 auto;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 1.5rem;
  line-height: 1;
  letter-spacing: -0.008em;
  color: var(--ink-1);
  font-variant-numeric: tabular-nums;
  display: inline-flex; align-items: baseline; gap: 4px;
}
.feed-team-away .feed-cats { margin: 0 auto 0 0; }
.feed-cats-suf {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.66rem;
  font-weight: 800;
  letter-spacing: 0.10em;
  text-transform: uppercase;
  color: var(--ink-4);
}

.feed-center {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
}
.feed-status {
  display: inline-flex; align-items: center; gap: 5px;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.66rem;
  font-weight: 900;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  padding: 2px 8px;
  border-radius: 999px;
  border: 1px solid transparent;
}
.feed-status-live {
  color: var(--accent-tertiary);
  background: oklch(0.72 0.18 195 / 0.10);
  border-color: oklch(0.72 0.18 195 / 0.35);
}
.feed-status-dot {
  width: 5px; height: 5px; border-radius: 50%;
  background: var(--accent-tertiary);
}
@media (prefers-reduced-motion: no-preference) {
  .feed-status-dot { animation: cmlist-pulse 2.4s infinite cubic-bezier(0.22, 1, 0.36, 1); }
}
.feed-status-coasting {
  color: var(--accent-secondary);
  background: oklch(0.70 0.27 350 / 0.10);
  border-color: oklch(0.70 0.27 350 / 0.30);
}
.feed-status-final {
  color: var(--accent-up);
  background: oklch(0.74 0.18 145 / 0.10);
  border-color: oklch(0.74 0.18 145 / 0.35);
}
.feed-status-upcoming {
  color: var(--ink-3);
  background: oklch(0.16 0.015 90);
  border-color: oklch(0.22 0.015 90);
}
.feed-vs {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.66rem;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--ink-4);
}
.feed-wp {
  display: inline-flex; align-items: baseline; gap: 6px;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.92rem;
  font-weight: 900;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.005em;
}
.feed-wp-pct-sep {
  color: var(--ink-5);
  font-weight: 600;
}

.feed-share {
  width: 28px; height: 28px;
  display: grid; place-items: center;
  background: transparent;
  border: 1px solid oklch(0.22 0.015 90);
  border-radius: 8px;
  color: var(--ink-3);
  cursor: pointer;
  transition: color 160ms cubic-bezier(0.22, 1, 0.36, 1),
              border-color 160ms cubic-bezier(0.22, 1, 0.36, 1);
}
.feed-share:hover { color: var(--ink-1); border-color: oklch(0.36 0.015 90); }
.feed-share:active {
  transform: scale(0.97);
  transition-duration: 100ms;
}
.feed-share:focus-visible { outline: 2px solid var(--accent-primary); outline-offset: 2px; }

/* ─── PILLS / FOOTER ──────────────────────────────────────── */
.pills {
  list-style: none;
  margin: 8px 0 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}
.pill {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px 14px;
  border-radius: 12px;
  background: oklch(0.12 0.015 90);
  border: 1px solid oklch(0.18 0.015 90);
}
.pill-head {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.pill-dot {
  width: 6px; height: 6px; border-radius: 50%;
  display: inline-block;
}
.pill-dot-primary   { background: var(--accent-primary); }
.pill-dot-secondary { background: var(--accent-secondary); }
.pill-dot-tertiary  { background: var(--accent-tertiary); }
.pill-dot-mute      { background: var(--ink-4); }
.pill-label {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.70rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--ink-3);
}
.pill-value {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.92rem;
  font-weight: 800;
  letter-spacing: 0.02em;
  color: var(--ink-1);
  font-variant-numeric: tabular-nums;
}

/* ─── MOBILE ───────────────────────────────────────────────── */
@media (max-width: 720px) {
  .hero { padding: 18px 16px 14px; border-radius: 16px; }
  .hero-faceoff { grid-template-columns: 1fr; gap: 14px; }
  .hero-team-home, .hero-team-away { align-items: flex-start; text-align: left; }
  .hero-team-away { align-items: flex-start; text-align: left; }
  .hero-avatar { width: 72px; height: 72px; border-radius: 16px; font-size: 1.4rem; }
  .hero-center { flex-direction: row; flex-wrap: wrap; justify-content: flex-start; gap: 12px; padding: 8px 0; border-top: 1px solid oklch(0.18 0.018 90); border-bottom: 1px solid oklch(0.18 0.018 90); }
  .hero-score-label, .hero-contested { width: 100%; text-align: left; }

  .cat-strip {
    grid-template-columns: repeat(6, minmax(0, 1fr));
    gap: 3px;
  }
  .cat-cell { min-height: 50px; padding: 6px 2px; }
  .cat-cell-label { font-size: 0.60rem; }
  .cat-cell-val { font-size: 0.76rem; }

  .feed-card {
    grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
    grid-template-rows: auto auto;
    gap: 8px 12px;
    padding: 12px 14px;
  }
  .feed-share { grid-row: 2; grid-column: 1 / -1; justify-self: end; }
  .feed-avatar { width: 38px; height: 38px; border-radius: 10px; }
  .feed-cats { font-size: 1.2rem; }
  .feed-team-name { font-size: 0.92rem; }
  .feed-center { gap: 3px; }

  .pills { grid-template-columns: 1fr; }
}
</style>
