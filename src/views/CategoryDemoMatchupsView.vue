<template>
  <div class="cmlist">
    <!-- ─────────────────────────────────────────────────────────────
         LIVE LOAD STATUS — strict live mode shows the full-page loading
         state until the adapter resolves. Mirrors Beat / Issue /
         Chronicles / Power Rankings so the surfaces feel like one
         publication.
    ────────────────────────────────────────────────────────────── -->
    <LiveLoadError v-if="liveError" :message="liveError" />
    <div
      v-if="isStrictLiveMode && !liveData && !liveError"
      class="matchups-loading"
      role="status"
      aria-live="polite"
    >
      <div class="matchups-loading-bar" aria-hidden="true">
        <span class="matchups-loading-bar-fill"></span>
      </div>
      <div class="matchups-loading-stage">
        <div class="matchups-loading-logo-shadow">
          <div class="matchups-loading-logo" aria-hidden="true">
            <img src="/tlb-favicon.png" alt="" />
          </div>
        </div>
        <p class="matchups-loading-title">{{ loadingTitle }}</p>
        <p class="matchups-loading-sub">{{ loadingSubline }}</p>
      </div>
    </div>

    <template v-else>

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
        <li v-if="liveCount" class="page-status-item">
          <span class="page-status-dot page-status-dot-live" aria-hidden="true"></span>
          <span class="page-status-num">{{ liveCount }}</span>
          <span class="page-status-label">live</span>
        </li>
        <li v-if="coinFlipCount" class="page-status-sep" aria-hidden="true"></li>
        <li v-if="coinFlipCount" class="page-status-item">
          <span class="page-status-num">{{ coinFlipCount }}</span>
          <span class="page-status-label">coin flip</span>
        </li>
        <li v-if="sealedCount" class="page-status-sep" aria-hidden="true"></li>
        <li v-if="sealedCount" class="page-status-item">
          <span class="page-status-num">{{ sealedCount }}</span>
          <span class="page-status-label">sealed</span>
        </li>
        <li v-if="lockedCount" class="page-status-sep" aria-hidden="true"></li>
        <li v-if="lockedCount" class="page-status-item">
          <span class="page-status-num">{{ lockedCount }}</span>
          <span class="page-status-label">locked</span>
        </li>
      </ul>
    </header>

    <!-- ─────────────────────────────────────────────────────────────
         1B. DAILY BEATS — the morning paper. What flipped overnight,
             who lit it up, what to watch today. Hidden when none of
             the three beats have data (first visit, no MLB games).
    ────────────────────────────────────────────────────────────── -->
    <section v-if="hasBeats" class="beats" aria-label="Today's beats">
      <header class="beats-head">
        <p class="beats-eyebrow">
          <span class="beats-eyebrow-bar" aria-hidden="true"></span>
          Today's beats
        </p>
        <p class="beats-day">{{ todayLabel }} morning</p>
      </header>
      <ul class="beats-list" role="list">
        <li v-if="lastDeltaBeat" class="beats-item beats-item-last">
          <p class="beats-tag">{{ lastDeltaBeat.tag }}</p>
          <p class="beats-line">{{ lastDeltaBeat.line }}</p>
        </li>
        <li v-if="bigNightBeat" class="beats-item beats-item-big">
          <p class="beats-tag">Big night</p>
          <p class="beats-line">{{ bigNightBeat }}</p>
        </li>
        <li v-if="watchBeat" class="beats-item beats-item-watch">
          <p class="beats-tag">Watch today</p>
          <p class="beats-line">{{ watchBeat }}</p>
        </li>
      </ul>
    </section>

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

      <div v-if="heroHomeTeam && heroAwayTeam && heroHomeStanding && heroAwayStanding" class="hero-faceoff">
        <!-- HOME -->
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
          <p v-if="heroHomePct !== null" class="hero-wp" :style="{ color: heroHomePctColor }">{{ heroHomePct }}%</p>
          <p v-if="heroHomePct !== null" class="hero-wp-label">win prob</p>
        </article>

        <!-- CENTER COLUMN -->
        <div class="hero-center">
          <p class="hero-score-block">
            <span class="hero-score">{{ heroMatchup.homeCatWins }}</span>
            <span class="hero-score-sep" aria-hidden="true">·</span>
            <span class="hero-score">{{ heroMatchup.awayCatWins }}</span>
          </p>
          <p class="hero-score-label">cat record</p>
          <p class="hero-contested">{{ heroMatchup.contestedCount }} still contested</p>
        </div>

        <!-- AWAY -->
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
          <p v-if="heroAwayPct !== null" class="hero-wp" :style="{ color: heroAwayPctColor }">{{ heroAwayPct }}%</p>
          <p v-if="heroAwayPct !== null" class="hero-wp-label">win prob</p>
        </article>
      </div>

      <!-- Cat battle tiles — each cat is its own little story with a
           margin chip + proportional bar. -->
      <ul
        v-if="heroHomeTeam && heroAwayTeam"
        class="cat-strip"
        :aria-label="`Category battle for ${heroHomeTeam.name} versus ${heroAwayTeam.name}`"
        role="list"
      >
        <li
          v-for="line in heroMatchup.catLines ?? []"
          :key="line.catId"
          class="cat-tile"
          :class="tileBgClass(line)"
        >
          <div class="cat-tile-head">
            <span class="cat-tile-label">{{ line.catId }}</span>
            <span
              v-if="tileChip(line)"
              class="cat-tile-chip"
              :class="[`cat-tile-chip-${tileLeaderSide(line)}`, tileChipExtraClass(line)]"
            >{{ tileChip(line) }}</span>
            <span v-else class="cat-tile-evens">EVEN</span>
          </div>
          <div class="cat-tile-values">
            <span
              class="cat-tile-val cat-tile-val-home"
              :class="{ 'cat-tile-val-lead': heroHomeHasLead(line) }"
            >{{ formatVal(line.catId, line.homeCurrent) }}</span>
            <span class="cat-tile-vs" aria-hidden="true">·</span>
            <span
              class="cat-tile-val cat-tile-val-away"
              :class="{ 'cat-tile-val-lead': heroAwayHasLead(line) }"
            >{{ formatVal(line.catId, line.awayCurrent) }}</span>
          </div>
          <div class="cat-tile-bar" aria-hidden="true">
            <span class="cat-tile-bar-home" :style="{ width: tileHomeBarPct(line) }"></span>
            <span class="cat-tile-bar-away" :style="{ width: tileAwayBarPct(line) }"></span>
          </div>
        </li>
      </ul>
      <p v-if="heroStateOfPlay" class="cat-strip-context">
        <strong class="cat-strip-strong">{{ heroStateOfPlay }}</strong>
      </p>
      <p v-if="heroSubContext" class="hero-sub-context">{{ heroSubContext }}</p>

      <!-- Daily trend chart — only when real day-by-day history exists.
           Live leagues hide this until daily snapshots accrue. -->
      <div v-if="hasDailyTrend" class="hero-chart-wrap">
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
              <p class="feed-cats" :style="m.homeCatWins > m.awayCatWins ? { color: feedAccentHome(m) } : undefined">
                {{ m.homeCatWins }}<span class="feed-cats-suf">cats</span>
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

              <span v-if="feedHomePct(m) !== null" class="feed-wp">
                <span class="feed-wp-pct" :style="{ color: feedAccentHome(m) }">{{ feedHomePct(m) }}%</span>
                <span class="feed-wp-pct-sep" aria-hidden="true">·</span>
                <span class="feed-wp-pct" :style="{ color: feedAccentAway(m) }">{{ 100 - (feedHomePct(m) ?? 50) }}%</span>
              </span>
            </div>

            <!-- AWAY -->
            <div class="feed-team feed-team-away">
              <p class="feed-cats" :style="m.awayCatWins > m.homeCatWins ? { color: feedAccentAway(m) } : undefined">
                {{ m.awayCatWins }}<span class="feed-cats-suf">cats</span>
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
      :live-data="liveData"
      :what-to-watch-override="detailWhatToWatch"
      :season-series-override="detailSeasonSeries"
      @close="closeDetail"
      @open-signup="$emit('open-signup')"
    />
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, shallowRef, watch } from 'vue'
import { useRoute } from 'vue-router'
import type {
  CategoryLeagueData,
  CategoryLeagueDataMatchup,
  CategoryLeagueDataCatLine,
  CategoryLeagueDataTeam,
  CategoryLeagueDataStanding,
} from '@/editorial/types'
import CategoryMatchupDetailModal from '@/components/demo/CategoryMatchupDetailModal.vue'
// Hard left/right binary for per-cat signals (cat-tile leaders, margin
// chips, feed-card tints, modal cat values). Decouples the matchup
// display from team-avatar accents, which can collide when two teams
// happen to share a hue (a real photo + a green skull both reading as
// green-ish). HOME (left) is always green, AWAY (right) is always
// magenta — predictable scan, no collisions.
const HOME_COLOR = 'oklch(0.74 0.18 145)'
const AWAY_COLOR = 'oklch(0.70 0.27 350)'
import { smoothPath, type Point } from '@/utils/svgPath'
import {
  renderMatchupsPage,
  type RenderedMatchupsCopy,
} from '@/editorial/render-matchups'
import { categoriesFixtureToLeagueData } from '@/editorial/fixtureAdapter'
import { sleeperLeagueToCategoryData } from '@/editorial/adapters/sleeperAdapter'
import { espnLeagueToCategoryData } from '@/editorial/adapters/espnAdapter'
import { yahooLeagueToCategoryData } from '@/editorial/adapters/yahooAdapter'
import {
  LOWER_BETTER_BASEBALL_CATS,
  effectiveCatStatus,
  summarizeLocks,
  daysLeftInCurrentWeek,
} from '@/editorial/matchups-projection'
import { usePlatformsStore } from '@/stores/platforms'
import { useLeaguesStore } from '@/stores/leaguesNew'
import LiveLoadError from '@/components/demo/LiveLoadError.vue'

defineEmits<{ (e: 'open-signup'): void }>()

const route = useRoute()

/* ─────────────────────────────────────────────────────────────────
   DATA SOURCES — universal contract from either platform adapter or
   the fixture (via the same fixture→contract adapter). The view never
   reads the raw fixture shape; everything below speaks
   CategoryLeagueData so live + demo paths share one code path.

   The hero matchup, editorial copy, projections, and trajectory chart
   all degrade gracefully when their optional fields are absent — live
   leagues have win prob + projections from the adapter but no daily
   history yet, so the trajectory chart simply hides itself.
───────────────────────────────────────────────────────────────── */
const demoData: CategoryLeagueData = categoriesFixtureToLeagueData()
const liveData = shallowRef<CategoryLeagueData | null>(null)
const data = computed<CategoryLeagueData>(() => liveData.value ?? demoData)

const liveEditorial = shallowRef<RenderedMatchupsCopy>(renderMatchupsPage(demoData))
const liveLoading = ref(false)
const liveError = ref<string | null>(null)

// Strict route (`/leagues/:leagueId/matchups`) resolves the league via
// the leagues store; soft mode (`?leagueId=&platform=`) reads the query
// directly. Without the strict path, deep-linked live leagues silently
// fall back to fixtures — that's the bug that showed demo team names
// on a real Yahoo league here.
const leaguesStore = useLeaguesStore()
const strictLeagueRecord = computed(() => {
  const uuid = route.params.leagueId
  if (typeof uuid !== 'string' || uuid.length === 0) return null
  return leaguesStore.leagues.find((l) => l.id === uuid) ?? null
})
const isStrictLiveMode = computed(() => typeof route.params.leagueId === 'string')

const liveLeagueId = computed<string | null>(() => {
  if (isStrictLiveMode.value) {
    return strictLeagueRecord.value?.platform_league_id ?? null
  }
  const v = route.query.leagueId
  return typeof v === 'string' && v.trim().length > 0 ? v.trim() : null
})
const livePlatform = computed<string | null>(() => {
  if (isStrictLiveMode.value) {
    return strictLeagueRecord.value?.platform ?? null
  }
  const v = route.query.platform
  return typeof v === 'string' && v.trim().length > 0 ? v.trim() : null
})

const platformLabel = computed(() => {
  const p = livePlatform.value
  if (p === 'yahoo') return 'Yahoo'
  if (p === 'espn') return 'ESPN'
  if (p === 'sleeper') return 'Sleeper'
  return 'your league'
})

const currentWeek = computed(() => data.value.currentWeek)

// Editorial-voice loading copy. Same shape as Beat / Issue / Chronicles
// / Power Rankings so the surfaces feel like one publication.
const loadingTitle = computed(() => `Catching the games.`)
const loadingSubline = computed(() => {
  const league = strictLeagueRecord.value?.league_name
  if (league) return `Pulling ${league} from ${platformLabel.value}.`
  return `Pulling this week's matchups from ${platformLabel.value}.`
})

async function loadMatchups() {
  // Strict deep-link / refresh: hydrate the leagues store first so we
  // can resolve the platform + platform_league_id for the URL UUID.
  if (isStrictLiveMode.value && leaguesStore.leagues.length === 0) {
    try {
      await leaguesStore.fetchLeagues()
    } catch (err) {
      console.warn('[CategoryDemoMatchupsView] fetchLeagues failed:', err)
    }
  }

  // Reset prior render state — component is reused across leagues,
  // so without this the previous league's matchups stay on screen
  // until the new fetch resolves and the loading guard never appears.
  liveData.value = null
  liveError.value = null

  const id = liveLeagueId.value
  const platform = livePlatform.value
  if (!id || (platform !== 'sleeper' && platform !== 'espn' && platform !== 'yahoo')) {
    return  // fixture-only path (demo, or league row not resolved yet)
  }
  liveLoading.value = true
  liveError.value = null
  try {
    const leagueRowId =
      typeof route.params.leagueId === 'string' ? route.params.leagueId : undefined
    const opts = { userIdentity: collectUserIdentity(), leagueRowId }
    const fetched =
      platform === 'espn'   ? await espnLeagueToCategoryData(id, opts)
      : platform === 'yahoo' ? await yahooLeagueToCategoryData(id, opts)
      :                        await sleeperLeagueToCategoryData(id, opts)
    liveData.value = fetched
    liveEditorial.value = renderMatchupsPage(fetched)
    // Backfill placeholder league_name once the real name resolves —
    // mirrors Beat / Chronicles so the switcher chip stays in sync.
    if (leagueRowId && fetched.leagueName) {
      void leaguesStore.maybeBackfillLeagueName(leagueRowId, fetched.leagueName)
    }
  } catch (err) {
    const labelFor =
      platform === 'espn' ? 'ESPN' : platform === 'yahoo' ? 'Yahoo' : 'Sleeper'
    liveError.value = (err as Error).message || `Failed to load ${labelFor} league data.`
  } finally {
    liveLoading.value = false
  }
}

onMounted(() => {
  void loadMatchups()
})

// Watch for league-switcher navigation. Same component is reused on
// every `/leagues/:leagueId/matchups` route, so onMounted does NOT
// fire on switcher navigation.
watch(
  () => route.params.leagueId,
  (next, prev) => {
    if (next === prev) return
    void loadMatchups()
  },
)

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

/* ─── Helpers over `data` ────────────────────────────────────── */
const allMatchups = computed<CategoryLeagueDataMatchup[]>(
  () => data.value.matchupsCurrentWeek ?? [],
)
function teamById(id: string): CategoryLeagueDataTeam {
  const found = data.value.teams.find((t) => t.id === id)
  if (found) return found
  return {
    id,
    name: `Team ${id}`,
    ownerName: '',
    ownerInitials: '?',
    avatarColor: 'oklch(0.40 0 90)',
    isMyTeam: false,
  }
}
function standingById(id: string): CategoryLeagueDataStanding {
  const found = data.value.standings.find((s) => s.teamId === id)
  if (found) return found
  return {
    rank: 0,
    teamId: id,
    catWins: 0,
    catLosses: 0,
    catTies: 0,
    winPct: 0,
    streak: { type: 'W', length: 0 },
    lastSix: [],
    ownsCount: 0,
    bleedingCount: 0,
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

/* ─── Status counts ─────────────────────────────────────────────
   Yahoo's status flags only know "live vs final" (final = winner_team_key
   set, which doesn't happen until Monday rollover). For mid-week
   reading we need a richer bucket: SEALED matchups (one side has
   ≥90% win prob — mathematically over but not officially), COIN
   FLIP matchups (45-55% — the genuinely tight ones), LIVE for the
   middle, LOCKED for Yahoo-final. The whole page becomes day-aware.
─────────────────────────────────────────────────────────────── */

function matchupBucket(m: CategoryLeagueDataMatchup): 'locked' | 'sealed' | 'coin-flip' | 'live' {
  if (m.status === 'final') return 'locked'
  const wp = m.homeWinProb ?? 0.5
  if (wp >= 0.90 || wp <= 0.10) return 'sealed'
  if (wp >= 0.45 && wp <= 0.55) return 'coin-flip'
  return 'live'
}

const liveCount     = computed(() => allMatchups.value.filter((m) => matchupBucket(m) === 'live').length)
const sealedCount   = computed(() => allMatchups.value.filter((m) => matchupBucket(m) === 'sealed').length)
const coinFlipCount = computed(() => allMatchups.value.filter((m) => matchupBucket(m) === 'coin-flip').length)
const lockedCount   = computed(() => allMatchups.value.filter((m) => matchupBucket(m) === 'locked').length)

/* ─── Hero matchup — picked by editorial ────────────────────── */
const heroMatchupId = computed(() => {
  const editorialId = liveEditorial.value.matchupOfWeek.matchupId
  if (editorialId && allMatchups.value.some((m) => m.id === editorialId)) return editorialId
  return allMatchups.value[0]?.id ?? null
})
const heroMatchup = computed<CategoryLeagueDataMatchup | null>(
  () => allMatchups.value.find((m) => m.id === heroMatchupId.value) ?? null,
)

const heroEyebrow = computed(() => liveEditorial.value.matchupOfWeek.eyebrow || 'Matchup of the Week')
const heroHeadline = computed(() => liveEditorial.value.matchupOfWeek.headline)
const heroBody = computed(() => liveEditorial.value.matchupOfWeek.body)
const heroSubContext = computed(() => liveEditorial.value.matchupOfWeek.subContext)

/* ─── Daily Beats ────────────────────────────────────────────
   The "morning paper" strip: three short narrative beats above
   the hero. Answers different daily questions — what flipped
   overnight, who lit it up, what to watch today. Each degrades
   independently when its data source is empty (first visit, no
   MLB games, no overnight motion). When all three are empty the
   whole section hides — better than a placeholder.
─────────────────────────────────────────────────────────────── */

const DAY_NAMES_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const todayLabel = computed(() => DAY_NAMES_LONG[new Date().getDay()])

/** Find the editorial-grade headline storyline from a just-closed
 *  week's matchups. Priority: upset (low seed beat high seed by 4+
 *  rank slots) → sweep (final gap ≥ 5) → thriller (decided by ≤ 1
 *  cat) → biggest result as fallback. Returns null when nothing rises
 *  to the surface (rare — most weeks have at least a sweep). */
function findLastWeekStoryline(): string | null {
  const matchups = data.value.matchupsPreviousWeek ?? []
  if (matchups.length === 0) return null
  const prevWeek = data.value.currentWeek - 1
  const standing = (id: string) => data.value.standings.find((s) => s.teamId === id)

  type Result = {
    winnerId: string
    loserId: string
    winnerScore: number
    loserScore: number
    gap: number
    rankDiff: number   // positive = winner has worse rank (upset)
  }
  const results: Result[] = []
  for (const m of matchups) {
    if (m.homeCatWins === m.awayCatWins) continue
    const homeWon = m.homeCatWins > m.awayCatWins
    const winnerId = homeWon ? m.homeTeamId : m.awayTeamId
    const loserId  = homeWon ? m.awayTeamId : m.homeTeamId
    const winnerRank = standing(winnerId)?.rank ?? 99
    const loserRank  = standing(loserId)?.rank ?? 99
    results.push({
      winnerId, loserId,
      winnerScore: Math.max(m.homeCatWins, m.awayCatWins),
      loserScore:  Math.min(m.homeCatWins, m.awayCatWins),
      gap: Math.abs(m.homeCatWins - m.awayCatWins),
      rankDiff: winnerRank - loserRank,
    })
  }
  if (results.length === 0) return null

  // 1. Upset — winner ranked at least 4 slots below loser.
  const upsets = results.filter((r) => r.rankDiff >= 4)
  if (upsets.length > 0) {
    upsets.sort((a, b) => b.rankDiff - a.rankDiff)
    const u = upsets[0]
    return `${teamById(u.winnerId).name} took ${teamById(u.loserId).name} ${u.winnerScore}-${u.loserScore} — the upset of week ${prevWeek}.`
  }

  // 2. Sweep — gap of 5+ cats.
  const sweeps = results.filter((r) => r.gap >= 5)
  if (sweeps.length > 0) {
    sweeps.sort((a, b) => b.gap - a.gap)
    const s = sweeps[0]
    return `${teamById(s.winnerId).name} closed ${teamById(s.loserId).name} ${s.winnerScore}-${s.loserScore} in week ${prevWeek}.`
  }

  // 3. Thriller — decided by 1 cat.
  const thrillers = results.filter((r) => r.gap <= 1)
  if (thrillers.length > 0) {
    const t = thrillers[0]
    return `${teamById(t.winnerId).name} edged ${teamById(t.loserId).name} ${t.winnerScore}-${t.loserScore} — week ${prevWeek}'s closest call.`
  }

  // 4. Fallback — biggest gap of the week, even if not technically a sweep.
  results.sort((a, b) => b.gap - a.gap)
  const r = results[0]
  return `${teamById(r.winnerId).name} took ${teamById(r.loserId).name} ${r.winnerScore}-${r.loserScore} in week ${prevWeek}.`
}

/** Overnight-shift summary — what flipped in the current week since
 *  the last visit. Empty on Day 1 of a new week (the snapshot diff
 *  can only compare same-week matchups). */
function findLastNightStoryline(): string | null {
  const delta = data.value.snapshotDelta
  if (!delta) return null
  const tipped = delta.matchupShifts.filter((s) => s.tipped)
  if (tipped.length > 0) {
    const m = tipped[0]
    const winner = m.leadNow === 'home' ? teamById(m.homeTeamId) : teamById(m.awayTeamId)
    if (tipped.length === 1) {
      return `${winner.name}'s matchup tipped in their favor overnight.`
    }
    return `${tipped.length} matchups tipped overnight. ${winner.name} flipped a lead.`
  }
  let bestTeamId: string | null = null
  let bestGain = 0
  for (const s of delta.matchupShifts) {
    if (s.homeCatDelta > bestGain) { bestGain = s.homeCatDelta; bestTeamId = s.homeTeamId }
    if (s.awayCatDelta > bestGain) { bestGain = s.awayCatDelta; bestTeamId = s.awayTeamId }
  }
  if (!bestTeamId || bestGain <= 0) return null
  const gainer = teamById(bestTeamId)
  return `${gainer.name} picked up ${bestGain} ${bestGain === 1 ? 'cat' : 'cats'} overnight.`
}

/** The "delta" beat — pivots between LAST WEEK recap (Monday only)
 *  and LAST NIGHT overnight shifts (other days). Returns the tag
 *  string + the editorial line, or null when neither has content. */
const lastDeltaBeat = computed<{ tag: string; line: string } | null>(() => {
  const dayIdx = new Date().getDay()   // 0=Sun..6=Sat
  // Monday — pivot to last-week recap. This is the magazine's "weekend
  // wrap" — what closed Sunday night, what's worth remembering.
  if (dayIdx === 1) {
    const line = findLastWeekStoryline()
    return line ? { tag: 'Last week', line } : null
  }
  // Tuesday through Sunday — overnight shifts in the current week.
  const line = findLastNightStoryline()
  return line ? { tag: 'Last night', line } : null
})

// Backwards-compat: keep the old `lastNightBeat` name as an alias for
// any template binding I miss. Removed once the template fully reads
// `lastDeltaBeat` instead.
const lastNightBeat = computed(() => lastDeltaBeat.value?.line ?? null)

const bigNightBeat = computed<string | null>(() => {
  const nights = data.value.playerNights ?? []
  if (nights.length === 0) return null
  // Score performances. Owned-by-someone gets a bias so the beat
  // surfaces league-relevant lines over random monster nights.
  const scored = nights.map((n) => {
    let score = 0
    if (n.hitting) {
      score += (n.hitting.homeRuns ?? 0) * 8
      score += (n.hitting.hits ?? 0) * 1.5
      score += (n.hitting.rbi ?? 0) * 2
      score += (n.hitting.stolenBases ?? 0) * 2
    }
    if (n.pitching) {
      score += (n.pitching.strikeouts ?? 0) * 1.5
      if (n.pitching.qualityStart) score += 5
      if (n.pitching.completeGame) score += 12
      if (n.pitching.noHitter) score += 50
      if (n.pitching.perfectGame) score += 100
    }
    if (n.ownedByTeamIds.length > 0) score += 6
    return { night: n, score }
  })
  scored.sort((a, b) => b.score - a.score)
  const top = scored[0]
  if (!top || top.score < 8) return null
  const n = top.night
  const ownerName = n.ownedByTeamIds.length > 0
    ? teamById(n.ownedByTeamIds[0]).name
    : null
  let line: string | null = null
  if (n.hitting && (n.hitting.homeRuns >= 1 || n.hitting.hits >= 3)) {
    const parts: string[] = [`${n.hitting.hits}-for-${n.hitting.atBats}`]
    if (n.hitting.homeRuns > 0) parts.push(`${n.hitting.homeRuns} HR`)
    if (n.hitting.rbi > 0) parts.push(`${n.hitting.rbi} RBI`)
    line = `${n.name}: ${parts.join(', ')}.`
  } else if (n.pitching && n.pitching.strikeouts >= 6) {
    const parts: string[] = [`${n.pitching.inningsPitched} IP`, `${n.pitching.strikeouts} K`]
    if (n.pitching.earnedRuns !== undefined) parts.push(`${n.pitching.earnedRuns} ER`)
    line = `${n.name}: ${parts.join(', ')}.`
  }
  if (!line) return null
  return ownerName ? `${line} Rostered by ${ownerName}.` : line
})

/** Lowest-margin contested cat across all live matchups, gated by
 *  "could realistically flip with one game" — counting cats ≤ 2,
 *  rate cats ≤ a small absolute. Otherwise the beat over-claims. */
function isFlippableCatLine(line: CategoryLeagueDataCatLine): boolean {
  if (line.status === 'punted-home' || line.status === 'punted-away') return false
  const margin = Math.abs(line.homeCurrent - line.awayCurrent)
  if (margin === 0) return false   // truly even — not a "watch", a "tied"
  if (line.catId === 'AVG' || line.catId === 'OBP' || line.catId === 'SLG' || line.catId === 'OPS') {
    return margin <= 0.012
  }
  if (line.catId === 'ERA' || line.catId === 'WHIP' || line.catId === 'BAA') {
    return margin <= 0.25
  }
  return margin <= 2
}

const watchBeat = computed<string | null>(() => {
  const matchups = allMatchups.value
  if (matchups.length === 0) return null

  // Primary: find the tightest flippable cat across live matchups.
  // This is the mid/late-week "swing cat" reading.
  const live = matchups.filter((m) => m.status === 'live')
  let best: { matchup: CategoryLeagueDataMatchup; line: CategoryLeagueDataCatLine } | null = null
  let bestRel = Infinity
  for (const m of live) {
    for (const line of m.catLines ?? []) {
      if (!isFlippableCatLine(line)) continue
      const margin = Math.abs(line.homeCurrent - line.awayCurrent)
      const sum = line.homeCurrent + line.awayCurrent
      const rel = sum > 0 ? margin / sum : 1
      if (rel < bestRel) { bestRel = rel; best = { matchup: m, line } }
    }
  }
  if (best) {
    const home = teamById(best.matchup.homeTeamId)
    const away = teamById(best.matchup.awayTeamId)
    const lb = lowerBetter(best.line.catId)
    const homeLeads = lb
      ? best.line.homeCurrent < best.line.awayCurrent
      : best.line.homeCurrent > best.line.awayCurrent
    const leader = homeLeads ? home : away
    const trailer = homeLeads ? away : home
    return `${best.line.catId} in ${leader.name} vs ${trailer.name} is on a knife edge. One game flips it.`
  }

  // Fallback (Day 1/2 — no cat motion yet): pivot to the biggest
  // projection mismatch on the slate. Still forward-looking, still
  // editorial, doesn't pretend cats have been moving.
  let mismatch: CategoryLeagueDataMatchup | null = null
  let mismatchDelta = 0
  for (const m of matchups) {
    const wp = m.homeWinProb
    if (wp === undefined) continue
    const delta = Math.abs(wp - 0.5)
    if (delta > mismatchDelta) {
      mismatchDelta = delta
      mismatch = m
    }
  }
  if (!mismatch || mismatchDelta < 0.10) {
    // Slate is too balanced to flag a mismatch — emit a generic
    // setup-day reminder instead. Better than an empty slot.
    return `Lineups lock at first pitch. Set yours before the slate opens.`
  }
  const wp = mismatch.homeWinProb!
  const favoredHome = wp > 0.5
  const favorite = teamById(favoredHome ? mismatch.homeTeamId : mismatch.awayTeamId)
  const underdog = teamById(favoredHome ? mismatch.awayTeamId : mismatch.homeTeamId)
  const favPct = Math.round((favoredHome ? wp : 1 - wp) * 100)
  return `${favorite.name} is the projection's favorite over ${underdog.name} (${favPct}%). Biggest mismatch on the slate.`
})

const hasBeats = computed(
  () => !!lastDeltaBeat.value || !!bigNightBeat.value || !!watchBeat.value,
)

function pillDotFor(i: number): 'primary' | 'secondary' | 'tertiary' | 'mute' {
  switch (i) {
    case 0: return 'primary'
    case 1: return 'secondary'
    case 2: return 'tertiary'
    default: return 'mute'
  }
}
function formatPillLabel(label: string): string {
  return label.charAt(0) + label.slice(1).toLowerCase()
}

const heroHomeTeam = computed(() =>
  heroMatchup.value ? teamById(heroMatchup.value.homeTeamId) : null,
)
const heroAwayTeam = computed(() =>
  heroMatchup.value ? teamById(heroMatchup.value.awayTeamId) : null,
)
const heroHomeStanding = computed(() =>
  heroMatchup.value ? standingById(heroMatchup.value.homeTeamId) : null,
)
const heroAwayStanding = computed(() =>
  heroMatchup.value ? standingById(heroMatchup.value.awayTeamId) : null,
)
const heroHomeAccent = computed(() => HOME_COLOR)
const heroAwayAccent = computed(() => AWAY_COLOR)

const heroHomePct = computed(() => {
  const p = heroMatchup.value?.homeWinProb
  return p === undefined ? null : clampWP(p * 100)
})
const heroAwayPct = computed(() =>
  heroHomePct.value === null ? null : 100 - heroHomePct.value,
)
const heroHomePctColor = computed(() =>
  (heroHomePct.value ?? 50) >= (heroAwayPct.value ?? 50)
    ? 'oklch(0.74 0.18 145)'
    : 'oklch(0.70 0.27 350)',
)
const heroAwayPctColor = computed(() =>
  (heroAwayPct.value ?? 50) >= (heroHomePct.value ?? 50)
    ? 'oklch(0.74 0.18 145)'
    : 'oklch(0.70 0.27 350)',
)

const heroDecidedAway = computed(() =>
  (heroMatchup.value?.catLines ?? []).filter((c) => c.status === 'decided-away').length,
)
const heroContested = computed(() =>
  (heroMatchup.value?.catLines ?? []).filter((c) => c.status === 'contested').length,
)
const heroConcededAway = computed(() =>
  (heroMatchup.value?.catLines ?? []).filter((c) => c.status === 'punted-away').length,
)

/* State-of-play: a single magazine sentence describing where the
 *  matchup actually stands. Replaces the sterile "0 decided / 11
 *  contested / 0 conceded" line that never changed mid-week. Updates
 *  daily as locks accumulate. */
const heroLockSummary = computed(() => {
  const m = heroMatchup.value
  if (!m?.catLines?.length) return null
  return summarizeLocks(m.catLines, daysLeftInWeek.value)
})
const heroStateOfPlay = computed(() => {
  const summary = heroLockSummary.value
  if (!summary) return null
  const moving = summary.movingCatIds
  const totalLocks = summary.homeLocks + summary.awayLocks
  if (moving.length === 0) return 'Mathematically over.'
  if (moving.length === 1) return `Down to ${moving[0]}.`
  if (moving.length === 2) return `Down to ${moving[0]} and ${moving[1]}.`
  if (moving.length === 3) return `Down to ${moving[0]}, ${moving[1]}, and ${moving[2]}.`
  if (totalLocks >= 5) return `${totalLocks} cats locked. ${moving.length} still in play.`
  return `${moving.length} cats still in play. ${totalLocks} locked.`
})

/* ─── Cat-strip helpers ─────────────────────────────────────── */
function lowerBetter(catId: string): boolean {
  return LOWER_BETTER_BASEBALL_CATS.has(catId)
}
function heroHomeHasLead(line: CategoryLeagueDataCatLine): boolean {
  if (line.homeCurrent === line.awayCurrent) return false
  return lowerBetter(line.catId)
    ? line.homeCurrent < line.awayCurrent
    : line.homeCurrent > line.awayCurrent
}
function heroAwayHasLead(line: CategoryLeagueDataCatLine): boolean {
  if (line.homeCurrent === line.awayCurrent) return false
  return lowerBetter(line.catId)
    ? line.awayCurrent < line.homeCurrent
    : line.awayCurrent > line.homeCurrent
}
function formatVal(catId: string, v: number): string {
  if (catId === 'AVG' || catId === 'OBP' || catId === 'SLG' || catId === 'OPS') {
    return v.toFixed(3).replace(/^0/, '')
  }
  if (catId === 'ERA' || catId === 'WHIP' || catId === 'BAA' || catId === 'K/9') {
    return v.toFixed(2)
  }
  return Math.round(v).toString()
}
/* ─── Cat-tile helpers ─────────────────────────────────────── */

const daysLeftInWeek = computed(() => daysLeftInCurrentWeek())

function tileEffectiveStatus(line: CategoryLeagueDataCatLine) {
  return effectiveCatStatus(line, daysLeftInWeek.value)
}

function tileBgClass(line: CategoryLeagueDataCatLine): string {
  const s = tileEffectiveStatus(line)
  if (s === 'punted-home' || s === 'punted-away') return 'cat-tile-punted'
  if (s === 'locked-home') return 'cat-tile-home-leads cat-tile-locked-home'
  if (s === 'locked-away') return 'cat-tile-away-leads cat-tile-locked-away'
  if (s === 'tied') return 'cat-tile-even'
  // s === 'live' — still in play, color by current direction
  if (heroHomeHasLead(line)) return 'cat-tile-home-leads'
  if (heroAwayHasLead(line)) return 'cat-tile-away-leads'
  return 'cat-tile-even'
}

function tileLeaderSide(line: CategoryLeagueDataCatLine): 'home' | 'away' | null {
  if (heroHomeHasLead(line)) return 'home'
  if (heroAwayHasLead(line)) return 'away'
  return null
}

function tileChipExtraClass(line: CategoryLeagueDataCatLine): string {
  const s = tileEffectiveStatus(line)
  return s === 'locked-home' || s === 'locked-away' ? 'cat-tile-chip-locked' : ''
}

function tileIsLocked(line: CategoryLeagueDataCatLine): boolean {
  const s = tileEffectiveStatus(line)
  return s === 'locked-home' || s === 'locked-away'
}

function tileChip(line: CategoryLeagueDataCatLine): string | null {
  if (line.homeCurrent === line.awayCurrent) return null
  const diff = Math.abs(line.homeCurrent - line.awayCurrent)
  if (line.catId === 'AVG' || line.catId === 'OBP' || line.catId === 'SLG' || line.catId === 'OPS') {
    return `+${diff.toFixed(3).replace(/^0/, '')}`
  }
  if (line.catId === 'ERA' || line.catId === 'WHIP' || line.catId === 'BAA' || line.catId === 'K/9') {
    return `-${diff.toFixed(2)}`
  }
  return `+${Math.round(diff)}`
}

function tileHomeBarPct(line: CategoryLeagueDataCatLine): string {
  return `${computeTileBarHomePct(line).toFixed(1)}%`
}
function tileAwayBarPct(line: CategoryLeagueDataCatLine): string {
  return `${(100 - computeTileBarHomePct(line)).toFixed(1)}%`
}
/** Home's share of the proportional bar. Counting cats: home / total.
 *  Lower-better cats: inverted (the team with the LOWER value gets a
 *  bigger share). Clamped 18..82 so neither side disappears at the
 *  extremes of a sweep. */
function computeTileBarHomePct(line: CategoryLeagueDataCatLine): number {
  if (line.status === 'punted-home') return 12
  if (line.status === 'punted-away') return 88
  const h = line.homeCurrent
  const a = line.awayCurrent
  if (h === a) return 50
  const total = h + a
  if (total <= 0) return 50
  const homeShare = lowerBetter(line.catId) ? a / total : h / total
  return Math.max(18, Math.min(82, homeShare * 100))
}

/* ─── Feed ──────────────────────────────────────────────────── */
const feedMatchups = computed(() =>
  allMatchups.value.filter((m) => m.id !== heroMatchupId.value),
)
function homeOf(m: CategoryLeagueDataMatchup) { return teamById(m.homeTeamId) }
function awayOf(m: CategoryLeagueDataMatchup) { return teamById(m.awayTeamId) }
function standingOf(teamId: string) { return standingById(teamId) }
function feedAccentHome(_m: CategoryLeagueDataMatchup) { return HOME_COLOR }
function feedAccentAway(_m: CategoryLeagueDataMatchup) { return AWAY_COLOR }
function feedCardBg(m: CategoryLeagueDataMatchup) {
  // Card slants toward the leader's POSITION (left = green when home
  // leads, right = magenta when away leads). Never collides with team
  // avatar palettes.
  const homeLeads = m.homeCatWins > m.awayCatWins
  const stop = homeLeads ? HOME_COLOR : AWAY_COLOR
  const angle = homeLeads ? 135 : 225
  return `linear-gradient(${angle}deg, ${tintFrom(stop, 0.045)}, oklch(0.10 0.015 90 / 0.4))`
}
function feedCardBorder(m: CategoryLeagueDataMatchup) {
  const homeLeads = m.homeCatWins > m.awayCatWins
  return tintFrom(homeLeads ? HOME_COLOR : AWAY_COLOR, 0.20)
}
function feedHomePct(m: CategoryLeagueDataMatchup): number | null {
  return m.homeWinProb === undefined ? null : clampWP(m.homeWinProb * 100)
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

// Only render the trajectory chart when the data carries a real
// daily history. Live leagues won't, until daily-snapshot capture is
// wired — see matchups-projection.ts and the project's snapshot path.
const hasDailyTrend = computed(() => (heroMatchup.value?.dailyTrend?.length ?? 0) > 0)
const heroHomeSeries = computed(() =>
  (heroMatchup.value?.dailyTrend ?? []).map((d) => clampWP(d.homeWinProb * 100)),
)
const heroAwaySeries = computed(() =>
  (heroMatchup.value?.dailyTrend ?? []).map((d) => clampWP(d.awayWinProb * 100)),
)
const heroCurrentDayIndex = computed(() => {
  let idx = -1
  ;(heroMatchup.value?.dailyTrend ?? []).forEach((d, i) => {
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

/* ─── LOADING STATE ───────────────────────────────────────────── */
/* Mirrors Beat / Issue / Chronicles / Power Rankings. */
.matchups-loading {
  position: relative;
  min-height: 70vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 80px 24px;
  background:
    radial-gradient(ellipse 600px 400px at 50% 35%, oklch(0.66 0.22 0 / 0.10), transparent 70%),
    radial-gradient(ellipse 700px 400px at 50% 95%, oklch(0.78 0.18 92 / 0.06), transparent 70%);
  animation: matchups-loading-glow 4s ease-in-out infinite alternate;
}
@keyframes matchups-loading-glow {
  0%   { opacity: 0.85; }
  100% { opacity: 1.00; }
}
.matchups-loading-bar {
  position: fixed;
  top: 0; left: 0; right: 0;
  height: 2px;
  background: oklch(0.18 0.015 90);
  overflow: hidden;
  z-index: 100;
  pointer-events: none;
}
.matchups-loading-bar-fill {
  position: absolute;
  top: 0; left: 0;
  height: 100%;
  width: 40%;
  background: linear-gradient(90deg, transparent 0%, var(--accent-primary) 50%, transparent 100%);
  animation: matchups-loading-slide 1.4s cubic-bezier(0.65, 0, 0.35, 1) infinite;
}
@keyframes matchups-loading-slide {
  0%   { transform: translateX(-100%); }
  100% { transform: translateX(350%); }
}
.matchups-loading-stage {
  max-width: 560px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.matchups-loading-logo-shadow {
  margin: 0 0 28px;
  filter: drop-shadow(0 12px 32px oklch(0 0 0 / 0.45));
}
.matchups-loading-logo {
  position: relative;
  width: 88px;
  height: 88px;
  perspective: 800px;
}
.matchups-loading-logo img {
  width: 100%;
  height: 100%;
  display: block;
  border-radius: 18px;
  animation:
    matchups-loading-logo-in 320ms cubic-bezier(0.23, 1, 0.32, 1) both,
    matchups-loading-spin 2.4s cubic-bezier(0.65, 0, 0.35, 1) infinite 320ms;
}
@keyframes matchups-loading-logo-in {
  0%   { opacity: 0; transform: scale(0.85); }
  100% { opacity: 1; transform: scale(1); }
}
@keyframes matchups-loading-spin {
  0%, 100% { transform: rotateY(-50deg); }
  50%      { transform: rotateY( 50deg); }
}
.matchups-loading-title {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: clamp(1.8rem, 3.4vw, 2.6rem);
  line-height: 1.05;
  letter-spacing: -0.014em;
  color: var(--ink-1);
  margin: 0 0 10px;
  animation: matchups-loading-text-in 360ms cubic-bezier(0.23, 1, 0.32, 1) 320ms both;
}
.matchups-loading-sub {
  font-size: 1rem;
  line-height: 1.5;
  color: var(--ink-3);
  margin: 0;
  max-width: 42ch;
  animation: matchups-loading-text-in 360ms cubic-bezier(0.23, 1, 0.32, 1) 400ms both;
}
@keyframes matchups-loading-text-in {
  from { opacity: 0; transform: translateY(4px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* ─── SECTION REVEAL STAGGER ──────────────────────────────────── */
.cmlist > *:not(.matchups-loading) {
  animation: matchups-section-in 360ms cubic-bezier(0.23, 1, 0.32, 1) both;
}
.cmlist > *:not(.matchups-loading):nth-child(1) { animation-delay: 0ms; }
.cmlist > *:not(.matchups-loading):nth-child(2) { animation-delay: 60ms; }
.cmlist > *:not(.matchups-loading):nth-child(3) { animation-delay: 120ms; }
.cmlist > *:not(.matchups-loading):nth-child(4) { animation-delay: 180ms; }
.cmlist > *:not(.matchups-loading):nth-child(n+5) { animation-delay: 240ms; }
@keyframes matchups-section-in {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
@media (prefers-reduced-motion: reduce) {
  .cmlist > *:not(.matchups-loading) { animation: none; }
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

/* ─── DAILY BEATS ─────────────────────────────────────────────
   Three short narrative cards above the hero. Each card carries a
   subtle full-border + corner-gradient accent (no side stripes per
   the brand rules) so the three beats read as distinct without
   looking like alert callouts.
─────────────────────────────────────────────────────────────── */
.beats {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 16px 18px 18px;
  border: 1px solid oklch(0.18 0.015 90);
  border-radius: 14px;
  background:
    radial-gradient(60% 80% at 50% 0%, oklch(0.72 0.18 195 / 0.04) 0%, transparent 70%),
    oklch(0.10 0.015 90 / 0.6);
}
.beats-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
}
.beats-eyebrow {
  margin: 0;
  display: inline-flex; align-items: center; gap: 10px;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.74rem;
  font-weight: 800;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--accent-tertiary);
}
.beats-eyebrow-bar {
  width: 22px; height: 2px;
  background: var(--accent-tertiary);
  display: inline-block;
}
.beats-day {
  margin: 0;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.70rem;
  font-weight: 700;
  letter-spacing: 0.10em;
  text-transform: uppercase;
  color: var(--ink-4);
}
.beats-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}
.beats-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px 14px 12px;
  border: 1px solid oklch(0.20 0.015 90);
  border-radius: 10px;
  background: oklch(0.11 0.015 90 / 0.55);
  min-width: 0;
}
.beats-item-last {
  border-color: oklch(0.70 0.27 350 / 0.30);
  background: linear-gradient(135deg, oklch(0.70 0.27 350 / 0.06), oklch(0.11 0.015 90 / 0.5) 80%);
}
.beats-item-big {
  border-color: oklch(0.78 0.18 92 / 0.32);
  background: linear-gradient(135deg, oklch(0.78 0.18 92 / 0.06), oklch(0.11 0.015 90 / 0.5) 80%);
}
.beats-item-watch {
  border-color: oklch(0.72 0.18 195 / 0.32);
  background: linear-gradient(135deg, oklch(0.72 0.18 195 / 0.06), oklch(0.11 0.015 90 / 0.5) 80%);
}
.beats-tag {
  margin: 0;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.66rem;
  font-weight: 900;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--ink-3);
}
.beats-item-last  .beats-tag { color: oklch(0.74 0.22 350); }
.beats-item-big   .beats-tag { color: oklch(0.78 0.18 92);  }
.beats-item-watch .beats-tag { color: oklch(0.72 0.18 195); }
.beats-line {
  margin: 0;
  font-size: 0.94rem;
  line-height: 1.45;
  color: var(--ink-1);
  font-weight: 500;
}

@media (max-width: 720px) {
  .beats-list {
    grid-template-columns: 1fr;
    gap: 8px;
  }
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

/* ─── Cat tiles ──────────────────────────────────────────────
   Each cat is its own little story: label + margin chip up top,
   both team values side-by-side (leader in their position color),
   proportional bar underneath. Eleven uniform boxes lost the story;
   tiles give every cat a sense of weight + direction.
─────────────────────────────────────────────────────────────── */
.cat-strip {
  position: relative; z-index: 1;
  list-style: none;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
  padding: 0;
  margin: 4px 0 10px;
}
.cat-tile {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 11px 12px 10px;
  border-radius: 10px;
  border: 1px solid oklch(0.20 0.015 90);
  background: oklch(0.11 0.015 90 / 0.5);
  transition: border-color 200ms cubic-bezier(0.22, 1, 0.36, 1);
}
.cat-tile-home-leads {
  border-color: oklch(0.74 0.18 145 / 0.32);
  background: linear-gradient(95deg, oklch(0.74 0.18 145 / 0.10) 0%, oklch(0.11 0.015 90 / 0.4) 75%);
}
.cat-tile-away-leads {
  border-color: oklch(0.70 0.27 350 / 0.32);
  background: linear-gradient(265deg, oklch(0.70 0.27 350 / 0.10) 0%, oklch(0.11 0.015 90 / 0.4) 75%);
}
/* Locked variants — same direction tint as the live versions but
 * stronger, plus a filled chip below. Tells the reader "this cat is
 * functionally out of reach, not just currently leading." */
.cat-tile-locked-home {
  border-color: oklch(0.74 0.18 145 / 0.55);
  background: linear-gradient(95deg, oklch(0.74 0.18 145 / 0.18) 0%, oklch(0.11 0.015 90 / 0.4) 78%);
}
.cat-tile-locked-away {
  border-color: oklch(0.70 0.27 350 / 0.55);
  background: linear-gradient(265deg, oklch(0.70 0.27 350 / 0.18) 0%, oklch(0.11 0.015 90 / 0.4) 78%);
}
.cat-tile-even {
  border-color: oklch(0.30 0.015 90);
  background: oklch(0.13 0.015 90 / 0.6);
}
.cat-tile-punted { opacity: 0.55; }

.cat-tile-head {
  display: flex; align-items: center; justify-content: space-between;
  gap: 6px;
  min-height: 18px;
}
.cat-tile-label {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.78rem;
  font-weight: 900;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--ink-2);
}
.cat-tile-chip {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.68rem;
  font-weight: 900;
  letter-spacing: 0.04em;
  padding: 2px 8px;
  border-radius: 999px;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.cat-tile-chip-home {
  color: oklch(0.78 0.18 145);
  background: oklch(0.74 0.18 145 / 0.14);
  border: 1px solid oklch(0.74 0.18 145 / 0.35);
}
.cat-tile-chip-away {
  color: oklch(0.74 0.22 350);
  background: oklch(0.70 0.27 350 / 0.14);
  border: 1px solid oklch(0.70 0.27 350 / 0.35);
}
/* Locked chip — filled in the team's accent, dark text. The visual
 * weight tells the reader "this margin can't realistically close." */
.cat-tile-chip-home.cat-tile-chip-locked {
  color: oklch(0.10 0.012 90);
  background: oklch(0.74 0.18 145 / 0.90);
  border-color: oklch(0.74 0.18 145);
}
.cat-tile-chip-away.cat-tile-chip-locked {
  color: oklch(0.10 0.012 90);
  background: oklch(0.70 0.27 350 / 0.90);
  border-color: oklch(0.70 0.27 350);
}
.cat-tile-evens {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.62rem;
  font-weight: 800;
  letter-spacing: 0.16em;
  color: var(--ink-4);
}

.cat-tile-values {
  display: flex; align-items: baseline; justify-content: space-between;
  gap: 6px;
  font-family: 'Barlow Condensed', sans-serif;
  font-variant-numeric: tabular-nums;
}
.cat-tile-val {
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--ink-4);
}
.cat-tile-val-home.cat-tile-val-lead {
  color: oklch(0.78 0.18 145);
  font-weight: 900;
  font-size: 1.2rem;
}
.cat-tile-val-away.cat-tile-val-lead {
  color: oklch(0.74 0.22 350);
  font-weight: 900;
  font-size: 1.2rem;
}
.cat-tile-vs {
  color: var(--ink-5);
  font-weight: 500;
  font-size: 0.84rem;
}

.cat-tile-bar {
  display: flex;
  height: 3px;
  border-radius: 2px;
  overflow: hidden;
  background: oklch(0.16 0.015 90 / 0.5);
}
.cat-tile-bar-home {
  background: oklch(0.74 0.18 145);
  height: 100%;
  transition: width 280ms cubic-bezier(0.22, 1, 0.36, 1);
}
.cat-tile-bar-away {
  background: oklch(0.70 0.27 350);
  height: 100%;
  transition: width 280ms cubic-bezier(0.22, 1, 0.36, 1);
}

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
@media (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference) {
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
@media (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference) {
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
@media (hover: hover) and (pointer: fine) {
  .feed-share:hover { color: var(--ink-1); border-color: oklch(0.36 0.015 90); }
}
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
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 6px;
  }
  .cat-tile { padding: 9px 11px 8px; }
  .cat-tile-label { font-size: 0.72rem; }
  .cat-tile-val { font-size: 0.98rem; }
  .cat-tile-val-home.cat-tile-val-lead,
  .cat-tile-val-away.cat-tile-val-lead { font-size: 1.10rem; }

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
