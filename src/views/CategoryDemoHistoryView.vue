<template>
  <div class="cathist">
    <!-- ─────────────────────────────────────────────────────────────
         LIVE LOAD STATUS — strict live mode shows the full-page
         loading state until the adapter resolves. Without it, the
         fixture-derived render leaks into the screen (champion names,
         eras, receipts) before the real league data lands. Mirrors
         the Beat / Issue loading template so the three surfaces feel
         like one publication.
    ────────────────────────────────────────────────────────────── -->
    <LiveLoadError v-if="liveError" :message="liveError" />
    <UnsupportedFormatPanel
      v-if="unsupportedFormat"
      :format="unsupportedFormat"
      :league-name="unsupportedLeagueName ?? undefined"
      :platform="livePlatform ?? undefined"
    />
    <div
      v-else-if="isStrictLiveMode && !liveData && !liveError"
      class="cathist-loading"
      role="status"
      aria-live="polite"
    >
      <div class="cathist-loading-bar" aria-hidden="true">
        <span class="cathist-loading-bar-fill"></span>
      </div>
      <div class="cathist-loading-stage">
        <!-- Wobble approach — see IssueView for the rationale.
             The full Y rotation kept showing the back side mirrored;
             the wobble swings ±50° so the back is never revealed. -->
        <div class="cathist-loading-logo-shadow">
          <div class="cathist-loading-logo" aria-hidden="true">
            <img src="/tlb-favicon.png" alt="" />
          </div>
        </div>
        <p class="cathist-loading-title">{{ loadingTitle }}</p>
        <p class="cathist-loading-sub">{{ loadingSubline }}</p>
      </div>
    </div>

    <template v-else>
    <!-- Season-one info banner — shown after data loads in strict
         live mode when the league has no completed seasons yet. -->
    <div
      v-if="liveData && displaySeasonCount === 0"
      class="live-banner live-banner-info"
      role="status"
    >
      Season one, in progress. The record book opens when the first champion is crowned.
    </div>

    <!-- Chronicles is now the editorial archive directly — the
         breadcrumb that used to link "back" to a hub page is gone
         because the hub is gone. -->

    <!-- ─────────────────────────────────────────────────────────────
         SECTION 1 — PAGE HEAD
    ────────────────────────────────────────────────────────────── -->
    <header class="page-head" aria-labelledby="page-headline">
      <div class="page-head-copy">
        <p class="page-eyebrow">
          <span class="page-eyebrow-bar" aria-hidden="true"></span>
          Chronicles
        </p>
        <h1 id="page-headline" class="page-headline">{{ pageHeadline }}</h1>
        <p class="page-sub">Champions, eras, and the constants that survive across years.</p>
      </div>
      <ul class="page-context" role="list">
        <li class="page-context-pill"><span class="page-context-num">{{ pageContext.seasons }}</span><span class="page-context-lbl">Seasons</span></li>
        <li class="page-context-pill"><span class="page-context-num">{{ pageContext.champions }}</span><span class="page-context-lbl">Champions</span></li>
        <li class="page-context-pill"><span class="page-context-num">{{ pageContext.teamsCount }}</span><span class="page-context-lbl">Teams</span></li>
      </ul>
    </header>

    <!-- ─────────────────────────────────────────────────────────────
         RECORD WATCH — the weekly reason to check back (live chases)
    ────────────────────────────────────────────────────────────── -->
    <section v-if="recordWatch.length" class="watch" aria-label="Record watch">
      <div class="watch-head-row">
        <span class="watch-pulse" aria-hidden="true"></span>
        <p class="watch-title">Record watch</p>
        <p class="watch-sub">Moves every week</p>
      </div>
      <div class="watch-grid">
        <button
          v-for="w in recordWatch"
          :key="w.label"
          type="button"
          class="watch-item"
          @click="onWatchClick(w)"
          :aria-label="w.route ? `${w.label}: ${w.text} — go to Home` : `${w.label}: ${w.text} — jump to the team`"
        >
          <div
            class="watch-logo"
            :style="{ background: `linear-gradient(135deg, ${w.avatarColor})` }"
          >
            <img v-if="w.logoUrl" :src="w.logoUrl" alt="" />
            <span v-else>{{ w.ownerInitials }}</span>
          </div>
          <div class="watch-body">
            <p class="watch-label">{{ w.label }}<span class="watch-jump" aria-hidden="true">{{ w.route ? '→' : '↓' }}</span></p>
            <p class="watch-text">{{ w.text }}</p>
          </div>
        </button>
      </div>
    </section>

    <!-- ─────────────────────────────────────────────────────────────
         SECTION 2 — HALL OF CHAMPIONS
    ────────────────────────────────────────────────────────────── -->
    <section id="sec-champs" class="champs" aria-labelledby="champs-heading">
      <header class="section-head">
        <p class="section-eyebrow section-eyebrow-gold" id="champs-heading">Hall of champions</p>
        <h2 class="section-headline">{{ trophiesHeadline }}</h2>
      </header>

      <div class="champs-rail-wrap">
        <button
          type="button"
          class="rail-arrow rail-arrow-prev"
          aria-label="Scroll to earlier seasons"
          @click="scrollChamps(-1)"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <button
          type="button"
          class="rail-arrow rail-arrow-next"
          aria-label="Scroll to later seasons"
          @click="scrollChamps(1)"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      <div ref="champsRail" class="champs-rail" role="list">
        <!-- Current, undecided season — the live "chase" card. -->
        <article
          v-if="currentSeasonCard"
          class="champ-card champ-card-live"
          role="listitem"
          :aria-label="`${currentSeasonCard.year} season in progress, ${getTeam(currentSeasonCard.leaderId).name} leads`"
        >
          <p class="champ-year">{{ currentSeasonCard.year }}</p>
          <p class="champ-era champ-era-live">In progress</p>

          <div
            class="champ-avatar"
            :style="{ background: `linear-gradient(135deg, ${getTeam(currentSeasonCard.leaderId).avatarColor})` }"
          >
            <img v-if="getTeam(currentSeasonCard.leaderId).avatarUrl" :src="getTeam(currentSeasonCard.leaderId).avatarUrl" class="champ-avatar-img" alt="" />
            <span v-else>{{ getTeam(currentSeasonCard.leaderId).ownerInitials }}</span>
          </div>

          <p class="champ-team">{{ getTeam(currentSeasonCard.leaderId).name }}</p>
          <p class="champ-score">Leads the chase through Week {{ currentSeasonCard.week }}.</p>

          <footer class="champ-foot">
            <p class="champ-foot-row">
              <span class="champ-foot-lbl">Chasing</span>
              <span class="champ-foot-val">{{ getTeam(currentSeasonCard.secondId).name }}</span>
            </p>
            <p class="champ-foot-row">
              <span class="champ-foot-lbl">Crown</span>
              <span class="champ-foot-val">Undecided</span>
            </p>
          </footer>
        </article>

        <article
          v-for="rec in seasonsNewestFirst"
          :key="rec.year"
          class="champ-card"
          role="listitem"
          :aria-label="`${rec.year} champion ${champInfo(rec).name}`"
        >
          <p class="champ-year">{{ rec.year }}</p>
          <p class="champ-era">{{ champEra(rec) }}</p>

          <div
            class="champ-avatar"
            :style="{ background: `linear-gradient(135deg, ${champInfo(rec).color})` }"
          >
            <img v-if="champInfo(rec).logo" :src="champInfo(rec).logo" class="champ-avatar-img" alt="" />
            <span v-else>{{ champInfo(rec).initials }}</span>
          </div>

          <p class="champ-team">{{ champInfo(rec).name }}</p>
          <p class="champ-score">{{ champLine(rec) }}</p>

          <footer class="champ-foot">
            <p class="champ-foot-row">
              <span class="champ-foot-lbl">Runner-up</span>
              <span class="champ-foot-val">{{ runnerUpInfo(rec).name }}</span>
            </p>
            <p class="champ-foot-row">
              <span class="champ-foot-lbl">Basement</span>
              <span class="champ-foot-val">{{ basementInfo(rec).name }}</span>
            </p>
          </footer>
        </article>
      </div>
      </div>
    </section>

    <!-- ─────────────────────────────────────────────────────────────
         SECTION 3 — THE ERAS
         Narrative arcs across years. Only fires when a real pattern
         is in the data (back-to-back runs, founding-year origins,
         dormant champions, etc). Silent on a league with too few
         seasons for any era to have formed.
    ────────────────────────────────────────────────────────────── -->
    <section v-if="eras.length > 0" class="eras" aria-labelledby="eras-heading">
      <header class="section-head">
        <p class="section-eyebrow section-eyebrow-teal" id="eras-heading">The eras</p>
        <h2 class="section-headline">{{ erasHeadline }}</h2>
        <p class="section-sub">
          Where the patterns are. The named periods that shaped this league.
        </p>
      </header>

      <ol class="era-list" role="list">
        <li
          v-for="era in eras"
          :key="era.id"
          class="era-card"
          :data-tone="era.tone"
        >
          <p class="era-eyebrow">{{ era.eyebrow }}</p>
          <h3 class="era-title">{{ era.title }}</h3>
          <p class="era-body">{{ era.body }}</p>
          <p v-if="era.signature" class="era-signature">
            <span class="era-signature-label">Signature</span>
            <span class="era-signature-value">{{ era.signature }}</span>
          </p>
        </li>
      </ol>
    </section>

    <!-- ─────────────────────────────────────────────────────────────
         SECTION 4 — THE RECEIPTS
         Typographic one-line records. The constants of league lore —
         numbers that survive across years, written like pull-quotes
         rather than database rows.
    ────────────────────────────────────────────────────────────── -->
    <section v-if="receipts.length > 0" class="receipts" aria-labelledby="receipts-heading">
      <header class="section-head">
        <p class="section-eyebrow section-eyebrow-magenta" id="receipts-heading">The receipts</p>
        <h2 class="section-headline">The constants.</h2>
        <p class="section-sub">
          The numbers that don't move. League lore, written in one line.
        </p>
      </header>

      <ol class="receipt-list" role="list">
        <li v-for="r in receipts" :key="r.id" class="receipt-row">
          <span class="receipt-label">{{ r.label }}</span>
          <span class="receipt-name">{{ r.name }}</span>
          <span class="receipt-value">{{ r.value }}</span>
        </li>
      </ol>
    </section>

    <!-- ─────────────────────────────────────────────────────────────
         The dashboard-style content that used to live here (All-time
         Legacy podium + leaderboard, Across-the-years bump chart,
         Who-owns-who h2h matrices, Category crowns, Hall of Fame /
         Hall of Shame numeric record book) belongs in Ultimate
         Fantasy Dashboard, not in The League Beat's editorial
         magazine voice. Stripped 2026-06-08.
    ────────────────────────────────────────────────────────────── -->

    <!-- Modals -->
    <CategoryTeamLegacyModal
      v-if="activeLegacyTeamId"
      :team-id="activeLegacyTeamId"
      @close="activeLegacyTeamId = null"
      @open-signup="$emit('open-signup')"
    />
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, shallowRef, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  teams,
  getTeam as getFixtureTeam,
  seasonHistory,
  teamCareerStats,
  legacyBreakdowns,
  legacyTrend,
  h2hMatrix,
  recordBook,
  categoryDynastyBeats,
  type CategoryRecordBookEntry,
} from '@/fixtures/categoriesLeague'
import CategoryTeamLegacyModal from '@/components/demo/CategoryTeamLegacyModal.vue'
import { linearPath, type Point } from '@/utils/svgPath'
import { renderHistoryPage, type RenderedHistoryCopy } from '@/editorial/render-history'
import { categoriesFixtureToLeagueData } from '@/editorial/fixtureAdapter'
import { sleeperLeagueToCategoryData } from '@/editorial/adapters/sleeperAdapter'
import { espnLeagueToCategoryData } from '@/editorial/adapters/espnAdapter'
import { yahooLeagueToCategoryData } from '@/editorial/adapters/yahooAdapter'
import { LEGACY_FORMULA_LABEL, computeLegacyScore } from '@/editorial/legacy'
import type { CategoryLeagueData, CategoryLeagueDataTeam } from '@/editorial/types'
import { usePlatformsStore } from '@/stores/platforms'
import { useLeaguesStore } from '@/stores/leaguesNew'
import LiveLoadError from '@/components/demo/LiveLoadError.vue'
import UnsupportedFormatPanel from '@/components/editorial/UnsupportedFormatPanel.vue'
import { hasPlayedGames } from '@/editorial/leagueCore'

defineEmits<{ (e: 'open-signup'): void }>()

const route = useRoute()
const router = useRouter()

/** Breadcrumb back to the Chronicles landing page when this view was
 *  opened from /chronicles. Anchors /history as a deeper view inside
 *  Chronicles rather than a standalone surface. */
const chroniclesBackLink = computed<string | null>(() => {
  const leagueId = route.params.leagueId
  if (typeof leagueId !== 'string' || leagueId.length === 0) return null
  return `/leagues/${leagueId}/chronicles`
})

/* ─────────────────────────────────────────────────────────────────
   LIVE DATA — same pattern as CategoryDemoHomeView.

   Default: fixture-derived render so the page is visually populated
   on every load. When `?leagueId=…&platform=sleeper` is present, we
   refetch via the adapter and swap the editorial copy. The rest of
   the view (chart, matrix, career table) reads from the same fixture
   refs today; the editorial is the first surface to go live.
───────────────────────────────────────────────────────────────── */
const liveData = shallowRef<CategoryLeagueData | null>(null)
const liveEditorial = shallowRef<RenderedHistoryCopy>(
  renderHistoryPage(categoriesFixtureToLeagueData()),
)
const liveLoading = ref(false)
const liveError = ref<string | null>(null)
// Set when the adapter resolves to a non-category format (Phase 0:
// h2h-points). Drives the UnsupportedFormatPanel.
const unsupportedFormat = ref<string | null>(null)
const unsupportedLeagueName = ref<string | null>(null)

/** Live-aware team lookup. Prefers the connected league's teams, falls
 *  back to the fixture (demo + transitional renders), then a synthesized
 *  stub so the template never crashes on an unknown id. Shadows the
 *  fixture import so every getTeam(...) call in this view is live-aware. */
function getTeam(id: string): CategoryLeagueDataTeam {
  const live = liveData.value?.teams.find((t) => t.id === id)
  if (live) return live
  // The fixture getTeam RETURNS undefined (not throws) for unknown ids,
  // so guard the result — never hand the template an undefined team.
  let fixture: CategoryLeagueDataTeam | undefined
  try {
    fixture = getFixtureTeam(id)
  } catch {
    fixture = undefined
  }
  if (fixture) return fixture
  return {
    id,
    name: `Team ${id}`,
    ownerName: '',
    ownerInitials: (id || '?').slice(0, 2).toUpperCase(),
    avatarUrl: undefined,
    avatarColor: 'oklch(0.40 0.05 90), oklch(0.25 0.05 90)',
    isMyTeam: false,
  }
}

// Two ways to bind to a real league (mirrors CategoryDemoHomeView):
//   - Strict:  /leagues/:leagueId/history — leagueId is the Supabase
//     leagues.id UUID; resolve platform + platform_league_id from the
//     leagues store.
//   - Soft (legacy): /demo-categories/history?leagueId=…&platform=…
const leaguesStore = useLeaguesStore()
const strictLeagueRecord = computed(() => {
  const uuid = route.params.leagueId
  if (typeof uuid !== 'string' || uuid.length === 0) return null
  return leaguesStore.leagues.find((l) => l.id === uuid) ?? null
})
const isStrictLiveMode = computed(() => typeof route.params.leagueId === 'string')

/* ─── Multi-season aggregation from the user's connected leagues ────
   Yahoo (and ESPN/Sleeper) register each season as a separate league.
   We match the current league's siblings by name + platform + sport,
   so a 3-year-old league shows 3 seasons even when the platform's
   renew chain is empty. */
const siblingLeagues = computed(() => {
  const cur = strictLeagueRecord.value
  if (!cur) return []
  return leaguesStore.leagues.filter(
    (l) =>
      l.platform === cur.platform &&
      l.sport === cur.sport &&
      l.league_name === cur.league_name,
  )
})

/** Connected prior-season league keys (one per season, excluding the
 *  current season). Passed to the adapter to build real history. */
const priorSeasonKeys = computed<string[]>(() => {
  const cur = strictLeagueRecord.value
  if (!cur) return []
  const bySeason = new Map<string, string>()
  for (const l of siblingLeagues.value) {
    if (l.id === cur.id || String(l.season) === String(cur.season)) continue
    if (!bySeason.has(String(l.season))) {
      bySeason.set(String(l.season), l.platform_league_id)
    }
  }
  return [...bySeason.values()]
})

/** Distinct seasons this league has existed (connected), including the
 *  current one. Drives the page-head count + adaptive sparse states. */
const liveSeasonCount = computed<number>(() => {
  const cur = strictLeagueRecord.value
  if (!cur) return 0
  const seasons = new Set(siblingLeagues.value.map((l) => String(l.season)))
  seasons.add(String(cur.season))
  return seasons.size
})

/**
 * Fixture fallbacks are for the DEMO only.
 *
 * Every `liveData.value?.x ?? fixtureX` on this page silently prints
 * the demo league when a real league has no value for `x` — and a real
 * league legitimately has none: a first-season league has no prior
 * champions, and a points league had no seasonHistory at all until the
 * adapter learned to build one. Bound to a live league, absent must
 * render as absent, never as somebody else's history.
 */
const isLiveBound = computed(() => liveData.value !== null)
function liveOr<T>(live: T | undefined | null, fixture: T): T {
  if (isLiveBound.value) return (live ?? (Array.isArray(fixture) ? ([] as unknown as T) : live)) as T
  return (live ?? fixture) as T
}

/** Season count for display. Reads from data.seasonHistory.length —
 *  the canonical count across the page. Previously the strict-live
 *  branch used liveSeasonCount (counts only leagues connected to TLB),
 *  which under-counted on leagues where the adapter pulled past
 *  seasons we don't have separate connect rows for. The Chronicles
 *  landing page reads the seasonHistory count too; aligning both
 *  surfaces removes the "5 seasons" vs "3 seasons" inconsistency. */
const displaySeasonCount = computed<number>(() => {
  return liveOr(liveData.value?.seasonHistory, seasonHistory)?.length ?? 0
})

/* Champion / runner-up / basement display — prefer the denormalized
   name + logo on the season record (past-season team keys don't
   resolve against the current league's teams), fall back to getTeam. */
function champInfo(rec: any) {
  const t = getTeam(rec.championTeamId)
  return {
    name: rec.championName ?? t.name,
    logo: rec.championLogo ?? t.avatarUrl,
    initials: t.ownerInitials,
    color: t.avatarColor,
  }
}
function runnerUpInfo(rec: any) {
  return { name: rec.runnerUpName ?? getTeam(rec.runnerUpTeamId).name }
}
function basementInfo(rec: any) {
  return { name: rec.basementName ?? getTeam(rec.basementTeamId).name }
}

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

// Editorial-voice loading copy. Same shape as Beat / Issue so the
// three surfaces feel like one publication.
const loadingTitle = computed(() => `Opening the record book.`)
const loadingSubline = computed(() => {
  const league = strictLeagueRecord.value?.league_name
  if (league) return `Pulling ${league} from ${platformLabel.value}.`
  return `Pulling the league's history from ${platformLabel.value}.`
})

async function loadChronicles() {
  // Strict route deep-link / refresh: the leagues store may not be
  // hydrated yet, so fetch it before we can resolve the platform +
  // platform_league_id for this league row.
  if (isStrictLiveMode.value) {
    // Resolve by id, not by emptiness: a league connected moments ago
    // is absent from an already-populated store.
    await leaguesStore.ensureLeagueLoaded(
      typeof route.params.leagueId === 'string' ? route.params.leagueId : undefined,
    )
  }

  // Reset prior render state — when switching leagues the component
  // instance is reused (same route component, different :leagueId
  // param). Without clearing liveData here, the previous league's
  // chronicles stay on screen until the new fetch resolves, and the
  // loading guard never appears.
  liveData.value = null
  liveError.value = null
  unsupportedFormat.value = null
  unsupportedLeagueName.value = null

  const id = liveLeagueId.value
  const platform = livePlatform.value
  if (!id || (platform !== 'sleeper' && platform !== 'espn' && platform !== 'yahoo')) {
    return   // fixture-only path (demo, or league row not resolved yet)
  }

  liveLoading.value = true
  liveError.value = null
  try {
    // leagueRowId is the Supabase UUID (route param) — passed for parity
    // with the home view's adapter options.
    const leagueRowId =
      typeof route.params.leagueId === 'string' ? route.params.leagueId : undefined
    const opts = {
      userIdentity: collectUserIdentity(),
      leagueRowId,
      priorSeasonKeys: priorSeasonKeys.value,
    }
    const data =
      platform === 'espn'
        ? await espnLeagueToCategoryData(id, opts)
        : platform === 'yahoo'
        ? await yahooLeagueToCategoryData(id, opts)
        : await sleeperLeagueToCategoryData(id, opts)
    // Points leagues render the format-agnostic Chronicles sections
    // (champions / eras / receipts / record watch) from the same
    // computeds: seasonHistory + managerLegacy + standings + teams all
    // exist on the points contract now. The category-only sections
    // (rivalries / category crowns) are already stripped from this view,
    // so no per-section guards are needed. `liveEditorial`
    // (renderHistoryPage) is category-only and unused by the visible
    // template, so it's skipped. The cast is safe: every field the
    // visible computeds read is present on the points shape.
    if (data.format === 'h2h-points') {
      liveData.value = data as unknown as CategoryLeagueData
      if (leagueRowId && data.leagueName) {
        void leaguesStore.maybeBackfillLeagueName(leagueRowId, data.leagueName)
      }
      return
    }
    // Format gate. Written as a positive check on the format we CAN
    // render: with points handled above, `!== 'h2h-category'` narrows
    // to never today and would silently fall through to the category
    // path if a third format were added to the union.
    const format = (data as { format: string }).format
    if (format !== 'h2h-category') {
      unsupportedFormat.value = format
      unsupportedLeagueName.value = data.leagueName
      if (leagueRowId && data.leagueName) {
        void leaguesStore.maybeBackfillLeagueName(leagueRowId, data.leagueName)
      }
      return
    }
    liveData.value = data
    liveEditorial.value = renderHistoryPage(data)
    // Backfill a stale ESPN placeholder league_name once the real name
    // resolves. Mirrors BeatFeedView so the switcher chip and masthead
    // align across surfaces.
    if (leagueRowId && data.leagueName) {
      void leaguesStore.maybeBackfillLeagueName(leagueRowId, data.leagueName)
    }
  } catch (err) {
    const label =
      platform === 'espn' ? 'ESPN' : platform === 'yahoo' ? 'Yahoo' : 'Sleeper'
    liveError.value = (err as Error).message || `Failed to load ${label} league data.`
  } finally {
    liveLoading.value = false
  }
}

onMounted(() => {
  void loadChronicles()
})

// Watch for league-switcher navigation. Same component on every
// `/leagues/:leagueId/chronicles` route, so the instance is reused
// — onMounted does NOT fire when the user switches leagues. Without
// this watcher, the previous league's record book stays on screen
// until a hard refresh.
watch(
  () => route.params.leagueId,
  (next, prev) => {
    if (next === prev) return
    void loadChronicles()
  },
)

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

/* ─── Page head — reactive to live data when present ───────── */
const pageHeadline = computed(() => {
  const n = displaySeasonCount.value
  if (n <= 0) return 'A fresh ledger.'
  // n counts COMPLETED seasons. One completed season means a champion is
  // already on the books and the current season is the second, so it's
  // not "season one, in progress" (that's n === 0).
  if (n === 1) return 'One year on the books.'
  return `${numberToWord(n)} years of receipts.`
})
function numberToWord(n: number): string {
  const words = ['zero','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve']
  return words[n] ?? `${n}`
}
const pageContext = computed(() => {
  const seasonsArr = liveOr(liveData.value?.seasonHistory, seasonHistory) ?? []
  const championsCount = new Set(seasonsArr.map((s) => s.championTeamId)).size
  const teamsCount = (liveOr(liveData.value?.teams, teams) ?? []).length
  return { seasons: displaySeasonCount.value, champions: championsCount, teamsCount }
})

/* ─── Record watch — the weekly reason to check back ───────────
   Live chases computed from data we already have (no new fetches):
   an all-time milestone closing in, the current-season title race, and
   the viewer's own climb up the all-time ladder. Recomputes every week
   as cats accrue, so the top of the page is never the same twice.
   Live-only (a chase needs real, current numbers). */
interface WatchItem {
  label: string
  logoUrl?: string
  avatarColor: string
  ownerInitials: string
  text: string
  anchor?: string        // element id to scroll to + highlight (same page)
  route?: string         // route to navigate to (current-season → Home)
}

/** Home ("today") route for current-season chases, matched to how this
 *  view was reached. */
function liveHomeHref(): string {
  if (isStrictLiveMode.value && typeof route.params.leagueId === 'string') {
    return `/leagues/${route.params.leagueId}/the-beat`
  }
  const q: string[] = []
  if (typeof route.query.leagueId === 'string') q.push(`leagueId=${encodeURIComponent(route.query.leagueId)}`)
  if (typeof route.query.platform === 'string') q.push(`platform=${encodeURIComponent(route.query.platform)}`)
  return q.length ? `/demo-categories/home?${q.join('&')}` : '/demo-categories/home'
}

const recordWatch = computed<WatchItem[]>(() => {
  const d = liveData.value
  const live = d?.managerLegacy
  if (!d || !live || live.length === 0) return []
  // Points leagues carry matchup wins in the cat-named fields, so the
  // unit reads as "win" not "cat".
  const unit = (d.format as string) === 'h2h-points' ? 'win' : 'cat'
  const items: WatchItem[] = []
  // Self-contained avatar bits from a manager (works for departed
  // managers too — they carry their own logo on the legacy record).
  const mgr = (m: (typeof live)[number]) => ({
    logoUrl: m.logoUrl, avatarColor: m.avatarColor, ownerInitials: m.ownerInitials,
  })

  // 1. Milestone watch — the most imminent round-number all-time total.
  //    Jumps to (and highlights) that manager's row in the Legacy list.
  let milestone: { m: (typeof live)[number]; target: number; gap: number } | null = null
  for (const m of live) {
    if (m.totalCatWins < 100) continue            // skip trivial milestones
    const next = Math.ceil((m.totalCatWins + 1) / 50) * 50
    const gap = next - m.totalCatWins
    if (gap > 0 && (!milestone || gap < milestone.gap)) milestone = { m, target: next, gap }
  }
  if (milestone) {
    items.push({
      label: 'Milestone watch',
      ...mgr(milestone.m),
      text: `${milestone.m.name} is ${milestone.gap} ${unit}${milestone.gap === 1 ? '' : 's'} from ${milestone.target} all-time.`,
      anchor: `legacy-${milestone.m.managerGuid}`,
    })
  }

  // 2. Title race — current-season cat gap between #1 and #2.
  //    This is a *today* story, so it routes to the Home page.
  const std = [...d.standings].sort((a, b) => a.rank - b.rank)
  if (std.length >= 2) {
    const lead = d.teams.find((t) => t.id === std[0].teamId)
    const chase = d.teams.find((t) => t.id === std[1].teamId)
    if (lead && chase) {
      const gap = (std[0].catWins ?? 0) - (std[1].catWins ?? 0)
      items.push({
        label: `${d.currentSeason} title race`,
        logoUrl: chase.avatarUrl, avatarColor: chase.avatarColor, ownerInitials: chase.ownerInitials,
        text: gap <= 0
          ? `${chase.name} is dead even with ${lead.name} atop ${d.currentSeason}.`
          : `${chase.name} trails ${lead.name} by ${gap} ${unit}${gap === 1 ? '' : 's'} for the ${d.currentSeason} lead.`,
        route: liveHomeHref(),
      })
    }
  }

  // 3. Your climb — legacy gap to the manager directly above you.
  //    Jumps to (and highlights) your own row in the Legacy list.
  const meIdx = live.findIndex((m) => m.isMyTeam)
  if (meIdx > 0) {
    const me = live[meIdx]
    const above = live[meIdx - 1]
    const gap = above.legacyScore - me.legacyScore
    items.push({
      label: 'Your climb',
      ...mgr(me),
      text: `${me.name} are ${gap} behind ${above.name} for #${above.rank} all-time.`,
      anchor: `legacy-${me.managerGuid}`,
    })
  } else if (meIdx === 0 && live.length > 1) {
    const me = live[0]
    const below = live[1]
    const gap = me.legacyScore - below.legacyScore
    items.push({
      label: 'Holding the throne',
      ...mgr(me),
      text: `${me.name} lead ${below.name} by ${gap} for the all-time top spot.`,
      anchor: `legacy-${me.managerGuid}`,
    })
  }

  return items
})

/** A watch item either routes to Home (current-season chases) or
 *  smooth-scrolls to + highlights the specific team it names. */
function onWatchClick(w: WatchItem): void {
  if (w.route) {
    router.push(w.route)
    return
  }
  if (!w.anchor) return
  const el = document.getElementById(w.anchor)
  if (!el) return
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' })
  el.classList.add('watch-flash')
  window.setTimeout(() => el.classList.remove('watch-flash'), 1600)
}


/* ─── Seasons / champions ──────────────────────────────────── */
const seasonsNewestFirst = computed(() => {
  const src = liveOr(liveData.value?.seasonHistory, seasonHistory) ?? []
  return [...src].sort((a, b) => b.year - a.year)
})

/** Champions-section headline, scaled to how many crowns exist. */
const trophiesHeadline = computed(() => {
  const n = seasonsNewestFirst.value.length
  if (n === 0) return 'The record opens soon.'
  const word = numberToWord(n)
  const cap = word.charAt(0).toUpperCase() + word.slice(1)
  return `${cap} ${n === 1 ? 'trophy' : 'trophies'}.`
})

/* ─── Champion-card copy + era, derived from the real season data ─── */

/** Specific, varied line per champion — number-anchored, and rotated
 *  by year so consecutive cards don't share a shape (or repeat "crown"
 *  next to the era tag). */
function champLine(rec: any): string {
  const runner = rec.runnerUpName ?? getTeam(rec.runnerUpTeamId).name
  const hasRunner = !!runner && !String(runner).startsWith('Team ')
  const r = rec.championRecord
  const opts: string[] = []
  if (r && hasRunner) opts.push(`Finished ${r}. ${runner} a step back.`)
  if (r) opts.push(`Closed the season at ${r}.`)
  if (hasRunner) opts.push(`Beat out ${runner} for the title.`)
  opts.push('Champions, and the book remembers.')
  return opts[rec.year % opts.length] ?? opts[0]
}

/** Earliest season this league has existed (across connected seasons). */
const foundingYear = computed<number>(() => {
  const years = seasonsNewestFirst.value.map((s) => s.year)
  if (isStrictLiveMode.value && strictLeagueRecord.value) {
    for (const l of siblingLeagues.value) {
      const y = Number(l.season)
      if (Number.isFinite(y)) years.push(y)
    }
    const cy = Number(strictLeagueRecord.value.season)
    if (Number.isFinite(cy)) years.push(cy)
  }
  return years.length ? Math.min(...years) : 0
})

/** Era tag — every champion gets a real, varied one (keeps the card
 *  row aligned and adds editorial texture instead of a blank slot). */
function champEra(rec: any): string {
  const key = (r: any) => r.championName ?? r.championTeamId
  if (rec.year === foundingYear.value) return 'The founding'
  const prior = seasonsNewestFirst.value.find((s) => s.year === rec.year - 1)
  if (prior && key(prior) === key(rec)) return 'Back-to-back'
  const wonEarlier = seasonsNewestFirst.value.some((s) => s.year < rec.year && key(s) === key(rec))
  return wonEarlier ? 'Back on top' : 'First crown'
}

/** The current, undecided season — rendered as a "the chase" card so
 *  the champions rail isn't half-empty and the past ties to the now. */
/** The champions rail overflows horizontally. A trackpad can swipe it,
 *  but a mouse cannot scroll a horizontal container at all — so the
 *  arrows are the only way most people can reach earlier seasons. */
const champsRail = ref<HTMLElement | null>(null)
function scrollChamps(direction: 1 | -1): void {
  const el = champsRail.value
  if (!el) return
  // One card plus its gap, so a click advances exactly one season.
  el.scrollBy({ left: direction * 296, behavior: 'smooth' })
}

const currentSeasonCard = computed(() => {
  const d = liveData.value
  if (!d || !isStrictLiveMode.value) return null
  // "In progress" means no champion yet. A finished season already has
  // a crown card built from its playoff bracket, and rendering both
  // showed the same year twice with two DIFFERENT teams — the
  // best-record leader on the live card and the actual bracket winner
  // on the crown. The bracket is the truth; suppress the live card.
  const decided = (d.seasonHistory ?? []).some((h) => h.year === d.currentSeason)
  if (decided) return null
  // Nobody "leads the chase" at 0-0. Before a game is played the
  // standings are a sort order, so naming a leader and a chaser invents
  // a race — the same fabrication the ladder and the cellar had.
  if (!hasPlayedGames(d)) return null
  const sorted = [...d.standings].sort((a, b) => a.rank - b.rank)
  const leader = sorted[0]
  if (!leader) return null
  return {
    year: d.currentSeason,
    week: d.currentWeek,
    leaderId: leader.teamId,
    secondId: sorted[1]?.teamId ?? '',
  }
})

/* ─────────────────────────────────────────────────────────────────
   THE ERAS — multi-year narrative arcs detected from real patterns.

   Only fires when the data actually supports the story. The pool:
     - Back-to-back runs ("The X Era, year1-year2").
     - Founding-year origin champion still active ("Origin Story").
     - Comet — championship year with no titles before or after.
     - Constant — team in every season the league has played.
     - Drought — multi-year stretch with no repeat champion.

   The wire is silent when no pattern fires. Better silent than
   fabricating an era from thin data.
───────────────────────────────────────────────────────────────── */
interface Era {
  id: string
  eyebrow: string
  title: string
  body: string
  signature?: string
  tone: 'gold' | 'pink' | 'teal' | 'ink'
}

/** Identity key for a champion across yearly records — prefers name
 *  (stable across team-id reshuffles), falls back to teamId. */
function champKey(r: any): string {
  return String(r.championName ?? r.championTeamId ?? '')
}

const eras = computed<Era[]>(() => {
  const recs = seasonsNewestFirst.value
  if (recs.length < 2) return []
  const out: Era[] = []

  // 1. Back-to-back runs. Walk the chronological order looking for
  //    consecutive same-champion stretches of length >= 2. Each run
  //    becomes one era card.
  const chronological = [...recs].sort((a, b) => a.year - b.year)
  let runStart: number | null = null
  let runKey: string | null = null
  let runName: string | null = null
  const closeRun = (endYear: number) => {
    if (runStart != null && runKey && runName && endYear - runStart >= 1) {
      const span = endYear - runStart + 1
      out.push({
        id: `era:run:${runKey}:${runStart}`,
        eyebrow: span >= 3 ? 'Dynasty' : 'Back-to-back',
        title: `The ${runName} run.`,
        body: span >= 3
          ? `${runName} hoisted the trophy ${numberToWord(span)} years in a row, ${runStart}-${endYear}. The longest run in this league's history.`
          : `${runName} went back-to-back in ${runStart} and ${endYear}. Two crowns. Two years.`,
        signature: `${span} consecutive titles`,
        tone: 'gold',
      })
    }
    runStart = null
    runKey = null
    runName = null
  }
  for (let i = 0; i < chronological.length; i++) {
    const r = chronological[i]
    const k = champKey(r)
    if (!k) continue
    if (k === runKey) continue
    // New champion — close any active run that ended at i-1.
    if (runKey != null) closeRun(chronological[i - 1].year)
    runStart = r.year
    runKey = k
    runName = String(r.championName ?? '')
  }
  // Close trailing run.
  if (runKey != null) {
    const last = chronological[chronological.length - 1]
    const span = last.year - (runStart as number) + 1
    if (span >= 2) closeRun(last.year)
  }

  // 2. Founding-year origin champion. The team that won the league's
  //    first season has a special place even if they never won again.
  const founding = chronological[0]
  if (founding && champKey(founding)) {
    const name = String(founding.championName ?? '')
    const wonAgain = chronological.some(
      (r, i) => i > 0 && champKey(r) === champKey(founding),
    )
    if (!wonAgain) {
      out.push({
        id: `era:origin:${founding.year}`,
        eyebrow: 'Origin story',
        title: `${name}, where it started.`,
        body: `${name} took the inaugural crown in ${founding.year} and never won again. The first name in the book.`,
        signature: `Founding champion · ${founding.year}`,
        tone: 'teal',
      })
    } else {
      out.push({
        id: `era:origin:${founding.year}`,
        eyebrow: 'Origin story',
        title: `${name}, from the jump.`,
        body: `${name} won the inaugural ${founding.year} season and came back for more. The original.`,
        signature: `Founding champion · ${founding.year}`,
        tone: 'teal',
      })
    }
  }

  // 3. Comet — a one-time champion sandwiched between others' runs.
  //    Identifies sleeper stories: the team that surprised everyone
  //    once and went back to being mortal.
  const nameToYears = new Map<string, number[]>()
  for (const r of chronological) {
    const k = champKey(r)
    if (!k) continue
    const arr = nameToYears.get(k) ?? []
    arr.push(r.year)
    nameToYears.set(k, arr)
  }
  const cometThreshold = recs.length >= 5 ? 1 : null
  if (cometThreshold != null) {
    for (const [k, years] of nameToYears) {
      if (years.length !== 1) continue
      // Only flag comets when at least 2 seasons exist before AND
      // after the comet year — gives the "lone bright spot" framing
      // some surrounding context.
      const year = years[0]
      const before = chronological.filter((r) => r.year < year).length
      const after = chronological.filter((r) => r.year > year).length
      if (before < 2 || after < 2) continue
      // Skip if this would duplicate an existing run-era card.
      const dup = out.some((e) => e.id.includes(`:${k}:`))
      if (dup) continue
      out.push({
        id: `era:comet:${k}:${year}`,
        eyebrow: 'The comet',
        title: `${k}'s one bright year.`,
        body: `${k} took the ${year} crown and slipped back into the field. The kind of season that becomes a story.`,
        signature: `Lone title · ${year}`,
        tone: 'ink',
      })
    }
  }

  // Cap output so the section doesn't sprawl on long-lived leagues.
  return out.slice(0, 5)
})

const erasHeadline = computed(() => {
  const n = eras.value.length
  if (n === 0) return ''
  if (n === 1) return 'One arc to track.'
  if (n === 2) return 'Two arcs, two stories.'
  return `${capitalize(numberToWord(n))} arcs across the years.`
})

/* ─────────────────────────────────────────────────────────────────
   THE RECEIPTS — typographic one-line records.

   The constants that survive across years. Rendered as a list of
   plain-text lines (label + name + value) rather than a card grid.
   The point is league lore in one sentence — pull-quote shape, not
   database row.
───────────────────────────────────────────────────────────────── */
interface Receipt {
  id: string
  label: string
  name: string
  value: string
}

const receipts = computed<Receipt[]>(() => {
  const recs = seasonsNewestFirst.value
  if (recs.length === 0) return []
  const chronological = [...recs].sort((a, b) => a.year - b.year)
  const out: Receipt[] = []

  // First champion in league history.
  const first = chronological[0]
  if (first && first.championName) {
    out.push({
      id: 'receipt:first-champion',
      label: 'First champion',
      name: String(first.championName),
      value: String(first.year),
    })
  }

  // Most rings, ranked by count of championships.
  const nameToWins = new Map<string, number>()
  for (const r of chronological) {
    const k = champKey(r)
    if (!k) continue
    nameToWins.set(k, (nameToWins.get(k) ?? 0) + 1)
  }
  if (nameToWins.size > 0) {
    const sorted = [...nameToWins.entries()].sort((a, b) => b[1] - a[1])
    const [topName, topCount] = sorted[0]
    if (topCount >= 2) {
      out.push({
        id: 'receipt:most-rings',
        label: 'Most rings',
        name: topName,
        value: `${topCount} crowns`,
      })
    }
  }

  // Years played.
  out.push({
    id: 'receipt:years-played',
    label: 'Seasons on the books',
    name: 'The League',
    value: `${recs.length}`,
  })

  // Longest title gap — the longest stretch between two
  // championships by the same team. Editorial framing: this is a
  // record about return, not absence.
  const gaps: { name: string; gap: number; from: number; to: number }[] = []
  for (const [name, years] of (() => {
    const m = new Map<string, number[]>()
    for (const r of chronological) {
      const k = champKey(r)
      if (!k) continue
      const arr = m.get(k) ?? []
      arr.push(r.year)
      m.set(k, arr)
    }
    return m
  })()) {
    if (years.length < 2) continue
    const sorted = years.slice().sort((a, b) => a - b)
    for (let i = 1; i < sorted.length; i++) {
      const gap = sorted[i] - sorted[i - 1] - 1
      if (gap >= 2) gaps.push({ name, gap, from: sorted[i - 1], to: sorted[i] })
    }
  }
  if (gaps.length > 0) {
    gaps.sort((a, b) => b.gap - a.gap)
    const g = gaps[0]
    out.push({
      id: 'receipt:longest-gap',
      label: 'Longest title gap',
      name: g.name,
      value: `${g.gap} years (${g.from}→${g.to})`,
    })
  }

  // Most recent crown — anchors the list to the present.
  const last = chronological[chronological.length - 1]
  if (last && last.championName) {
    out.push({
      id: 'receipt:most-recent',
      label: 'Most recent crown',
      name: String(last.championName),
      value: String(last.year),
    })
  }

  return out
})

function capitalize(s: string): string {
  return s.length === 0 ? s : s.charAt(0).toUpperCase() + s.slice(1)
}

/* ─── Category crowns — this season's per-cat leaders ──────────
   The old "dynasties" beat needed per-category history every season
   (which cat each team won), data we don't fetch for past years. So
   this is the honest, *current-season* version, built from the live
   categoryRanks the adapter already computes: who leads the most
   hitting cats, the most pitching cats, and who's stuck in the cellar.
   It moves every week — a freshness beat as well as a real one.
   Demo route maps the fixture dynasty beats into the same shape. */
interface CrownBeat {
  kind: 'bats' | 'arms' | 'punt'
  eyebrow: string
  teamId: string
  count: number
  cats: string[]
  caption: string
}

const categoryCrowns = computed<CrownBeat[]>(() => {
  const data = liveData.value
  if (data && data.categoryRanks?.length) {
    const numTeams = data.teams.length
    const sideOf = new Map(data.categories.map((c) => [c.id, c.side]))
    const labelOf = new Map(data.categories.map((c) => [c.id, c.label]))
    type Tally = { teamId: string; hitLed: string[]; pitLed: string[]; punted: string[] }
    const tallies: Tally[] = data.categoryRanks.map((cr) => {
      const hitLed: string[] = []
      const pitLed: string[] = []
      const punted: string[] = []
      for (const [catId, rank] of Object.entries(cr.catRanks)) {
        const lbl = labelOf.get(catId) ?? catId
        if (rank === 1) {
          if (sideOf.get(catId) === 'hit') hitLed.push(lbl)
          else if (sideOf.get(catId) === 'pit') pitLed.push(lbl)
        }
        if (numTeams > 0 && rank >= numTeams) punted.push(lbl)
      }
      return { teamId: cr.teamId, hitLed, pitLed, punted }
    })
    const bats = [...tallies].sort((a, b) => b.hitLed.length - a.hitLed.length)[0]
    const arms = [...tallies].sort((a, b) => b.pitLed.length - a.pitLed.length)[0]
    const punt = [...tallies].sort((a, b) => b.punted.length - a.punted.length)[0]
    const out: CrownBeat[] = []
    if (bats && bats.hitLed.length > 0) {
      out.push({
        kind: 'bats', eyebrow: 'The bats', teamId: bats.teamId,
        count: bats.hitLed.length, cats: bats.hitLed,
        caption: `${getTeam(bats.teamId).name} leads the league in ${bats.hitLed.length} hitting cat${bats.hitLed.length === 1 ? '' : 's'} this season.`,
      })
    }
    if (arms && arms.pitLed.length > 0) {
      out.push({
        kind: 'arms', eyebrow: 'The arms', teamId: arms.teamId,
        count: arms.pitLed.length, cats: arms.pitLed,
        caption: `${getTeam(arms.teamId).name} owns the mound, fronting ${arms.pitLed.length} pitching cat${arms.pitLed.length === 1 ? '' : 's'}.`,
      })
    }
    if (punt && punt.punted.length > 0) {
      out.push({
        kind: 'punt', eyebrow: 'The punt', teamId: punt.teamId,
        count: punt.punted.length, cats: punt.punted,
        caption: `${getTeam(punt.teamId).name} sits dead last in ${punt.punted.length} cat${punt.punted.length === 1 ? '' : 's'}. The line nobody wants.`,
      })
    }
    return out
  }
  // Demo fallback — map fixture dynasty beats into crown beats.
  const fxMeta: Record<string, { kind: CrownBeat['kind']; eyebrow: string }> = {
    'hitting-king': { kind: 'bats', eyebrow: 'The bats' },
    'pitching-king': { kind: 'arms', eyebrow: 'The arms' },
    'punt-kings': { kind: 'punt', eyebrow: 'The punt' },
  }
  return categoryDynastyBeats.map((b) => {
    const meta = fxMeta[b.kind] ?? { kind: 'bats' as const, eyebrow: 'The bats' }
    return {
      kind: meta.kind,
      eyebrow: meta.eyebrow,
      teamId: b.teamId,
      count: b.cats?.length ?? 0,
      cats: b.cats ?? [],
      caption: b.body || b.headline || '',
    }
  })
})

/* ─── Legacy podium and tail ───────────────────────────────────
   Live league: real per-manager aggregation across connected seasons
   (data.managerLegacy). Demo: the fixture teams, scored with the SAME
   defined formula so the on-page formula caption stays honest in both
   modes. Entries are self-contained for display so a manager who has
   left the league still renders (no getTeam dependency). */
interface LegacyDisplay {
  rank: number
  score: number
  key: string               // stable id (manager guid / fixture team id) for anchors
  teamId: string            // '' for managers no longer in the league
  name: string
  logoUrl?: string
  avatarColor: string
  ownerInitials: string
  isMyTeam: boolean
  seasonsPlayed: number
  titles: number
  playoffApps: number
  totalCatWins: number
  careerWinPct: number
}

const legacyFormulaLabel = LEGACY_FORMULA_LABEL

/** Live legacy cards are non-interactive for now: the detail modal is
 *  still fixture-backed, so opening it on a real team would leak demo
 *  data. The demo route keeps the modal. */
const legacyInteractive = computed(() => !isStrictLiveMode.value)

const legacyEntries = computed<LegacyDisplay[]>(() => {
  const live = liveData.value?.managerLegacy
  if (live && live.length > 0) {
    return live.map((m) => ({
      rank: m.rank,
      score: m.legacyScore,
      key: m.managerGuid,
      teamId: m.teamId ?? '',
      name: m.name,
      logoUrl: m.logoUrl,
      avatarColor: m.avatarColor,
      ownerInitials: m.ownerInitials,
      isMyTeam: m.isMyTeam,
      seasonsPlayed: m.seasonsPlayed,
      titles: m.titles,
      playoffApps: m.playoffApps,
      totalCatWins: m.totalCatWins,
      careerWinPct: m.careerWinPct,
    }))
  }
  return Object.values(legacyBreakdowns)
    .map((b) => {
      const c = teamCareerStats[b.teamId]
      const t = getTeam(b.teamId)
      const careerWinPct = c?.careerWinPct ?? 0
      return {
        rank: 0,
        score: computeLegacyScore({
          titles: c?.titles ?? 0,
          playoffApps: c?.playoffApps ?? 0,
          careerWinPct,
          totalCatWins: c?.totalCatWins ?? 0,
        }),
        key: b.teamId,
        teamId: b.teamId,
        name: t.name,
        logoUrl: t.avatarUrl,
        avatarColor: t.avatarColor,
        ownerInitials: t.ownerInitials,
        isMyTeam: t.isMyTeam,
        seasonsPlayed: c?.seasonsPlayed ?? 0,
        titles: c?.titles ?? 0,
        playoffApps: c?.playoffApps ?? 0,
        totalCatWins: c?.totalCatWins ?? 0,
        careerWinPct,
      } as LegacyDisplay
    })
    .sort((a, b) => b.score - a.score || b.titles - a.titles || b.totalCatWins - a.totalCatWins)
    .map((e, i) => ({ ...e, rank: i + 1 }))
})

const podium = computed(() => legacyEntries.value.slice(0, 3))
const legacyTail = computed(() => legacyEntries.value.slice(3))

/** Lead OKLCH stop of an entry's gradient — the card's glow accent. */
function accentOfEntry(e: LegacyDisplay): string {
  const stops = e.avatarColor
    .split(/\)\s*,\s*/)
    .map((s) => (s.endsWith(')') ? s : `${s})`))
  return stops[0]
}

function onLegacyClick(e: LegacyDisplay): void {
  if (legacyInteractive.value && e.teamId) openLegacyModal(e.teamId)
}

/** Win% as a leading-dot rate, e.g. .598. */
function legacyPct(n: number): string {
  return n.toFixed(3).replace(/^0\./, '.')
}

/** "1 playoff" / "2 playoffs" — correct pluralization. */
function playoffWord(n: number): string {
  return `${n} playoff${n === 1 ? '' : 's'}`
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/** Number-anchored lede for the #1 hero card. Title-holders lead with
 *  the ring; the ringless lead with the positive so it never opens on
 *  "0 titles". Seasons show as their own tag, so they stay out of here. */
function podiumLede(e: LegacyDisplay): string {
  if (e.titles > 0) {
    const r = `${numberToWord(e.titles)} ${e.titles === 1 ? 'ring' : 'rings'}`
    return `${cap(r)}, ${legacyPct(e.careerWinPct)} lifetime.`
  }
  if (e.playoffApps > 0) {
    const p = `${numberToWord(e.playoffApps)} playoff berth${e.playoffApps === 1 ? '' : 's'}`
    return `${cap(p)}, ${legacyPct(e.careerWinPct)} lifetime, still ringless.`
  }
  return `${e.totalCatWins} cat wins, ${legacyPct(e.careerWinPct)} lifetime.`
}

/** Distinct managers across all connected seasons — reconciles the
 *  16-deep legacy list with the current-season "12 teams" pill. */
const legacyManagerCount = computed(() => legacyEntries.value.length)

/* ─── Across the years — finish-position bump chart ──────────────
   The page already ranks managers two ways (champions, legacy). The one
   thing those can't show is *movement*: who climbed, who fell, who won
   the founding year and vanished. So this plots each manager's FINISH
   (1 = top) per season — lines cross as teams pass each other, logos sit
   at every node. Featured = top-3 by legacy + you; the rest are faint
   connectors. Real ranks from managerLegacy.seasons; the demo derives a
   finish order from fixture cumulative volume. */
const TX_W = 1000
const TX_H = 380
const TX_PAD_L = 64           // room for the "1ST" y-axis label
const TX_PAD_R = 96
const TX_PAD_T = 26
const TX_PAD_B = 52           // keeps last-place logo nodes off the year ticks
const trendGold = 'oklch(0.84 0.16 90)'

interface BumpRawNode { i: number; rank: number }
interface BumpRaw {
  key: string
  name: string
  logoUrl?: string
  avatarColor: string
  ownerInitials: string
  isMyTeam: boolean
  featured: boolean
  nodes: BumpRawNode[]
}

const trendYears = computed<number[]>(() => {
  const live = liveData.value?.managerLegacy
  if (live && live.length) {
    const ys = new Set<number>()
    for (const m of live) for (const s of m.seasons) ys.add(s.year)
    return [...ys].sort((a, b) => a - b)
  }
  return [2021, 2022, 2023, 2024, 2025, 2026]
})

const bumpRaw = computed<BumpRaw[]>(() => {
  const years = trendYears.value
  const live = liveData.value?.managerLegacy
  if (live && live.length) {
    return live.map((m) => {
      const nodes: BumpRawNode[] = []
      years.forEach((yr, i) => {
        const s = m.seasons.find((x) => x.year === yr)
        if (s && s.rank > 0 && s.rank < 900) nodes.push({ i, rank: s.rank })
      })
      return {
        key: m.managerGuid,
        name: m.name,
        logoUrl: m.logoUrl,
        avatarColor: m.avatarColor,
        ownerInitials: m.ownerInitials,
        isMyTeam: m.isMyTeam,
        featured: m.rank <= 3 || m.isMyTeam,
        nodes,
      }
    })
  }
  // Demo: derive a per-season finish order from fixture cumulative volume.
  const n = years.length
  const ranksByTeam = new Map<string, number[]>()
  for (let i = 0; i < n; i++) {
    const order = legacyTrend
      .map((r) => ({ teamId: r.teamId, v: r.cumulative[i] ?? 0 }))
      .sort((a, b) => b.v - a.v)
    order.forEach((o, idx) => {
      const arr = ranksByTeam.get(o.teamId) ?? new Array(n).fill(0)
      arr[i] = idx + 1
      ranksByTeam.set(o.teamId, arr)
    })
  }
  const top3 = new Set(podium.value.slice(0, 3).map((p) => p.teamId))
  return legacyTrend.map((r) => {
    const t = getTeam(r.teamId)
    const ranks = ranksByTeam.get(r.teamId) ?? []
    return {
      key: r.teamId,
      name: t.name,
      logoUrl: t.avatarUrl,
      avatarColor: t.avatarColor,
      ownerInitials: t.ownerInitials,
      isMyTeam: t.isMyTeam,
      featured: top3.has(r.teamId) || t.isMyTeam,
      nodes: ranks.map((rank, i) => ({ i, rank })).filter((x) => x.rank > 0),
    }
  })
})

const bumpMaxRank = computed(() => {
  let max = 2
  for (const s of bumpRaw.value) for (const nd of s.nodes) if (nd.rank > max) max = nd.rank
  return max
})

function xFor(i: number) {
  const span = Math.max(1, trendYears.value.length - 1)
  return TX_PAD_L + (TX_W - TX_PAD_L - TX_PAD_R) * (i / span)
}
function yForRank(rank: number) {
  const yRange = TX_H - TX_PAD_T - TX_PAD_B
  const span = Math.max(1, bumpMaxRank.value - 1)
  return TX_PAD_T + yRange * ((rank - 1) / span)   // rank 1 at top
}
/** Lead OKLCH stop of any gradient string — the line/node color. */
function firstStop(avatarColor: string): string {
  const stops = avatarColor
    .split(/\)\s*,\s*/)
    .map((s) => (s.endsWith(')') ? s : `${s})`))
  return stops[0]
}
interface BumpDisplayNode { i: number; rank: number; xPct: number; yPct: number }
interface BumpLine extends BumpRaw {
  path: string
  displayNodes: BumpDisplayNode[]
  lineColor: string
}
const bumpSeries = computed<BumpLine[]>(() =>
  bumpRaw.value.map((s) => {
    const pts: Point[] = s.nodes.map((nd) => ({ x: xFor(nd.i), y: yForRank(nd.rank) }))
    return {
      ...s,
      path: linearPath(pts),
      displayNodes: s.nodes.map((nd) => ({
        i: nd.i,
        rank: nd.rank,
        xPct: (xFor(nd.i) / TX_W) * 100,
        yPct: (yForRank(nd.rank) / TX_H) * 100,
      })),
      lineColor: s.isMyTeam ? trendGold : firstStop(s.avatarColor),
    }
  }),
)

const featuredBump = computed(() => bumpSeries.value.filter((s) => s.featured))
const dimBump = computed(() => bumpSeries.value.filter((s) => !s.featured))

/* Name labels at each featured line's last node, staggered vertically
   so neighbors don't collide. Positions are container percentages. */
const bumpLabels = computed(() => {
  type Lbl = { key: string; name: string; color: string; xPct: number; yPct: number }
  const lbls: Lbl[] = []
  for (const s of featuredBump.value) {
    const last = s.displayNodes[s.displayNodes.length - 1]
    if (!last) continue
    lbls.push({
      key: s.key,
      name: s.name.split(' ')[0],
      color: s.lineColor,
      xPct: ((xFor(last.i) + 14) / TX_W) * 100,
      yPct: last.yPct,
    })
  }
  lbls.sort((a, b) => a.yPct - b.yPct)
  for (let i = 1; i < lbls.length; i++) {
    if (lbls[i].yPct - lbls[i - 1].yPct < 5.5) lbls[i].yPct = lbls[i - 1].yPct + 5.5
  }
  return lbls
})

/* ─── The rivalries — current-season head-to-head story cards ──
   Recast from the 12x12 all-time matrix (which would have required
   expensive cross-season matchup fetching) into a few real rivalry
   stories built from the current season's h2h matrix the adapter
   already computes: who owns you, who you own, and the league's most
   lopsided non-you series. Honest scope (this season), magazine shape. */

interface RivalryDisplay {
  kind: 'owned-by' | 'you-own' | 'blowout'
  eyebrow: string
  leftId: string            // displayed left; this is the *dominant* team
  rightId: string           // displayed right; the dominated team
  leftWins: number
  rightWins: number
  ties: number
  meetings: number
  dominantCatDiff: number   // absolute; left's cat advantage over right
  caption: string
}

const rivalries = computed<RivalryDisplay[]>(() => {
  const matrix = liveOr(liveData.value?.h2hMatrix, h2hMatrix) ?? []
  const teamsList = liveOr(liveData.value?.teams, teams) ?? []
  if (!matrix || matrix.length === 0) return []
  const myId = teamsList.find((t) => t.isMyTeam)?.id ?? null

  const parseRec = (r: string) => {
    const m = r.match(/^(\d+)-(\d+)(?:-(\d+))?$/)
    if (!m) return { w: 0, l: 0, t: 0 }
    return { w: parseInt(m[1], 10), l: parseInt(m[2], 10), t: parseInt(m[3] ?? '0', 10) }
  }
  const nameOf = (id: string) => teamsList.find((t) => t.id === id)?.name ?? 'Them'

  // Re-shape each of-the-viewer entry from my perspective.
  const myEntries = myId
    ? matrix
        .map((e) => {
          const rec = parseRec(e.recordA)
          const aIsMe = e.teamA === myId
          const bIsMe = e.teamB === myId
          if (!aIsMe && !bIsMe) return null
          const oppId = aIsMe ? e.teamB : e.teamA
          const myWins = aIsMe ? rec.w : rec.l
          const oppWins = aIsMe ? rec.l : rec.w
          const myCatDiff = aIsMe ? e.catDiffA : -e.catDiffA
          return { oppId, myWins, oppWins, ties: rec.t, meetings: e.meetings, myCatDiff }
        })
        .filter((x): x is NonNullable<typeof x> => x !== null)
    : []

  const out: RivalryDisplay[] = []

  // Your tormentor — opponent with the biggest net wins over you.
  const tormentor = myEntries
    .filter((x) => x.oppWins > x.myWins)
    .sort((a, b) => (b.oppWins - b.myWins) - (a.oppWins - a.myWins))[0]
  if (tormentor && myId) {
    out.push({
      kind: 'owned-by',
      eyebrow: 'Owned by',
      leftId: tormentor.oppId,
      rightId: myId,
      leftWins: tormentor.oppWins,
      rightWins: tormentor.myWins,
      ties: tormentor.ties,
      meetings: tormentor.meetings,
      dominantCatDiff: Math.abs(tormentor.myCatDiff),
      caption: `${nameOf(tormentor.oppId)} has your number.`,
    })
  }

  // Your prey — your most lopsided winning series.
  const prey = myEntries
    .filter((x) => x.myWins > x.oppWins)
    .sort((a, b) => (b.myWins - b.oppWins) - (a.myWins - a.oppWins))[0]
  if (prey && myId) {
    out.push({
      kind: 'you-own',
      eyebrow: 'You own',
      leftId: myId,
      rightId: prey.oppId,
      leftWins: prey.myWins,
      rightWins: prey.oppWins,
      ties: prey.ties,
      meetings: prey.meetings,
      dominantCatDiff: Math.abs(prey.myCatDiff),
      caption: `${nameOf(prey.oppId)} is your customer.`,
    })
  }

  // League's biggest non-you blowout — keeps the third card neutral
  // when you're already represented in the first two.
  const blowoutCand = matrix
    .filter((e) => !myId || (e.teamA !== myId && e.teamB !== myId))
    .map((e) => {
      const rec = parseRec(e.recordA)
      return { e, rec, diff: Math.abs(rec.w - rec.l) }
    })
    .filter((x) => x.diff > 0)
    .sort((a, b) => b.diff - a.diff)[0]
  if (blowoutCand) {
    const { e, rec } = blowoutCand
    const aWinsMore = rec.w >= rec.l
    const dominantId = aWinsMore ? e.teamA : e.teamB
    const dominatedId = aWinsMore ? e.teamB : e.teamA
    const domWins = aWinsMore ? rec.w : rec.l
    const dedWins = aWinsMore ? rec.l : rec.w
    const domCatDiff = aWinsMore ? e.catDiffA : -e.catDiffA
    out.push({
      kind: 'blowout',
      eyebrow: 'League blowout',
      leftId: dominantId,
      rightId: dominatedId,
      leftWins: domWins,
      rightWins: dedWins,
      ties: rec.t,
      meetings: e.meetings,
      dominantCatDiff: Math.abs(domCatDiff),
      caption: `${nameOf(dominantId)} owns ${nameOf(dominatedId)}.`,
    })
  }

  return out
})

/* ─── Record book — real, all-time trophy case ────────────────
   Self-contained entries (carry their own name/logo/color) so a record
   held by a manager who has left the league still renders. Live: real
   all-time records from managerLegacy + per-season detail. Demo: the
   fixture record book, resolved through getTeam. Four fame + four shame
   so the bold asymmetric layout always has its slots filled. */
interface RecordDisplay {
  id: string
  eyebrow: string
  value: string
  metric: string
  context?: string
  name: string
  avatarUrl?: string
  avatarColor: string
  ownerInitials: string
  isMyTeam: boolean
}

const recordBookCards = computed<{ fame: RecordDisplay[]; shame: RecordDisplay[] }>(() => {
  const live = liveData.value?.managerLegacy
  if (live && live.length) {
    const disp = (m: NonNullable<typeof live>[number]) => ({
      name: m.name, avatarUrl: m.logoUrl, avatarColor: m.avatarColor,
      ownerInitials: m.ownerInitials, isMyTeam: m.isMyTeam,
    })
    const pct = (n: number) => n.toFixed(3).replace(/^0\./, '.')
    const maxBy = (f: (m: typeof live[number]) => number) => [...live].sort((a, b) => f(b) - f(a))[0]
    const minBy = (f: (m: typeof live[number]) => number) => [...live].sort((a, b) => f(a) - f(b))[0]

    // Single-season extremes across everyone's per-season detail.
    let big = { m: live[0], year: 0, cats: -1 }
    let worstS = { m: live[0], year: 0, cats: Infinity }
    for (const m of live) {
      for (const s of m.seasons) {
        if (s.catWins > big.cats) big = { m, year: s.year, cats: s.catWins }
        if (s.completed && s.catWins < worstS.cats) worstS = { m, year: s.year, cats: s.catWins }
      }
    }

    const catKing = maxBy((m) => m.totalCatWins)
    const bestPct = maxBy((m) => m.careerWinPct)
    const mostPlayoffs = maxBy((m) => m.playoffApps)
    const mostLosses = maxBy((m) => m.totalCatLosses)
    const worstPct = minBy((m) => m.careerWinPct)
    const drought = [...live]
      .filter((m) => m.titles === 0)
      .sort((a, b) => b.seasonsPlayed - a.seasonsPlayed || b.totalCatWins - a.totalCatWins)[0] ?? live[0]

    const fame: RecordDisplay[] = [
      { id: 'most-cat-wins', eyebrow: 'MOST CAREER CAT WINS', metric: 'Total cat wins, all seasons',
        value: String(catKing.totalCatWins), context: `${catKing.seasonsPlayed} seasons of receipts.`, ...disp(catKing) },
      { id: 'best-ratio', eyebrow: 'BEST CAT W-L RATIO', metric: 'Career cat-win rate',
        value: pct(bestPct.careerWinPct),
        context: bestPct.titles > 0 ? `${bestPct.titles} ring${bestPct.titles > 1 ? 's' : ''} to back it up.` : 'Dominant, ring or not.',
        ...disp(bestPct) },
      { id: 'most-playoffs', eyebrow: 'MOST PLAYOFF BERTHS', metric: 'Trips to the bracket',
        value: String(mostPlayoffs.playoffApps),
        context: mostPlayoffs.titles > 0 ? `Cashed ${mostPlayoffs.titles} into a title.` : 'Always there. No ring yet.',
        ...disp(mostPlayoffs) },
      { id: 'biggest-season', eyebrow: 'BIGGEST SEASON', metric: `Cat wins in ${big.year}`,
        value: String(big.cats), context: 'The high-water mark.', ...disp(big.m) },
    ]
    const shame: RecordDisplay[] = [
      { id: 'most-losses', eyebrow: 'MOST CAREER CAT LOSSES', metric: 'Total cat losses, all seasons',
        value: String(mostLosses.totalCatLosses), context: 'Somebody has to wear it.', ...disp(mostLosses) },
      { id: 'worst-ratio', eyebrow: 'WORST CAT W-L RATIO', metric: 'Career cat-win rate',
        value: pct(worstPct.careerWinPct), ...disp(worstPct) },
      { id: 'worst-season', eyebrow: 'WORST SEASON', metric: `Cat wins in ${worstS.year}`,
        value: String(worstS.cats), context: 'A year to bury.', ...disp(worstS.m) },
      { id: 'drought', eyebrow: 'LONGEST TITLE DROUGHT', metric: 'Seasons, zero titles',
        value: String(drought.seasonsPlayed), context: 'Still chasing the first.', ...disp(drought) },
    ]
    return { fame, shame }
  }

  // Demo fallback — fixture record book, resolved through getTeam.
  const map = (e: CategoryRecordBookEntry): RecordDisplay => {
    const t = getTeam(e.teamId)
    return {
      id: e.id, eyebrow: e.eyebrow, value: e.value, metric: e.metric, context: e.context,
      name: t.name, avatarUrl: t.avatarUrl, avatarColor: t.avatarColor,
      ownerInitials: t.ownerInitials, isMyTeam: t.isMyTeam,
    }
  }
  return {
    fame: recordBook.filter((e) => e.kind === 'fame').map(map),
    shame: recordBook.filter((e) => e.kind === 'shame').map(map),
  }
})

const fameEntries = computed(() => recordBookCards.value.fame)
const shameEntries = computed(() => recordBookCards.value.shame)

// Click handler — no top-10 modal scope yet; intentional no-op.
function onRecordClick(_entry: RecordDisplay) {
  // Cards remain interactive (focus/active states) for discoverability.
}

/* ─── Modals state ─────────────────────────────────────────── */
const activeLegacyTeamId = ref<string | null>(null)

function openLegacyModal(id: string) { activeLegacyTeamId.value = id }
</script>

<style scoped>
.cathist {
  --gold:   oklch(0.84 0.16 90);
  --silver: oklch(0.80 0.012 90);
  --bronze: oklch(0.62 0.12 50);

  display: flex;
  flex-direction: column;
  gap: 56px;
  font-family: 'Barlow', sans-serif;
  color: var(--ink-1);
}

/* ─── SECTION REVEAL STAGGER ──────────────────────────────────── */
/* Once the loading guard releases, direct children stagger in so the
   archive reads as "turning pages" rather than slamming on screen.
   Slightly slower than Beat (45ms) or Issue (60ms) — suits the
   publication register. */
.cathist > *:not(.cathist-loading) {
  animation: cathist-section-in 380ms cubic-bezier(0.23, 1, 0.32, 1) both;
}
.cathist > *:not(.cathist-loading):nth-child(1) { animation-delay: 0ms; }
.cathist > *:not(.cathist-loading):nth-child(2) { animation-delay: 70ms; }
.cathist > *:not(.cathist-loading):nth-child(3) { animation-delay: 140ms; }
.cathist > *:not(.cathist-loading):nth-child(4) { animation-delay: 210ms; }
.cathist > *:not(.cathist-loading):nth-child(n+5) { animation-delay: 280ms; }
@keyframes cathist-section-in {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
}
@media (prefers-reduced-motion: reduce) {
  .cathist > *:not(.cathist-loading) { animation: none; }
}

/* ─── LOADING STATE ───────────────────────────────────────────── */
/* Mirrors Beat / Issue's loading treatment — the TLB lockup, the
   indeterminate progress bar at the top, the soft brand glow. Keeps
   the three surfaces feeling like one publication. */
.cathist-loading {
  position: relative;
  min-height: 70vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 80px 24px;
  background:
    radial-gradient(
      ellipse 600px 400px at 50% 35%,
      oklch(0.66 0.22 0 / 0.10),
      transparent 70%
    ),
    radial-gradient(
      ellipse 700px 400px at 50% 95%,
      oklch(0.78 0.18 92 / 0.06),
      transparent 70%
    );
  animation: cathist-loading-glow 4s ease-in-out infinite alternate;
}
@keyframes cathist-loading-glow {
  0%   { opacity: 0.85; }
  100% { opacity: 1.00; }
}
.cathist-loading-bar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: oklch(0.18 0.015 90);
  overflow: hidden;
  z-index: 100;
  pointer-events: none;
}
.cathist-loading-bar-fill {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  width: 40%;
  background: linear-gradient(
    90deg,
    transparent 0%,
    var(--accent-primary) 50%,
    transparent 100%
  );
  animation: cathist-loading-slide 1.4s cubic-bezier(0.65, 0, 0.35, 1) infinite;
}
@keyframes cathist-loading-slide {
  0%   { transform: translateX(-100%); }
  100% { transform: translateX(350%); }
}
.cathist-loading-stage {
  max-width: 560px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.cathist-loading-logo-shadow {
  margin: 0 0 28px;
  filter: drop-shadow(0 12px 32px oklch(0 0 0 / 0.45));
}
.cathist-loading-logo {
  position: relative;
  width: 88px;
  height: 88px;
  perspective: 800px;
}
.cathist-loading-logo img {
  width: 100%;
  height: 100%;
  display: block;
  border-radius: 18px;
  animation:
    cathist-loading-logo-in 320ms cubic-bezier(0.23, 1, 0.32, 1) both,
    cathist-loading-spin 2.4s cubic-bezier(0.65, 0, 0.35, 1) infinite 320ms;
}
@keyframes cathist-loading-logo-in {
  0%   { opacity: 0; transform: scale(0.85); }
  100% { opacity: 1; transform: scale(1); }
}
@keyframes cathist-loading-spin {
  0%, 100% { transform: rotateY(-50deg); }
  50%      { transform: rotateY( 50deg); }
}
.cathist-loading-title {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: clamp(1.8rem, 3.4vw, 2.6rem);
  line-height: 1.05;
  letter-spacing: -0.014em;
  color: var(--ink-1);
  margin: 0 0 10px;
  animation: cathist-loading-text-in 360ms cubic-bezier(0.23, 1, 0.32, 1) 320ms both;
}
.cathist-loading-sub {
  font-size: 1rem;
  line-height: 1.5;
  color: var(--ink-3);
  margin: 0;
  max-width: 42ch;
  animation: cathist-loading-text-in 360ms cubic-bezier(0.23, 1, 0.32, 1) 400ms both;
}
@keyframes cathist-loading-text-in {
  from { opacity: 0; transform: translateY(4px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* Chronicles back-breadcrumb — small, dim, sits above the page head. */
.chronicles-back {
  align-self: flex-start;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--accent-tertiary);
  text-decoration: none;
  border-bottom: 1px solid transparent;
  margin: -16px 0 -32px;
  transition: border-color 160ms cubic-bezier(0.22, 1, 0.36, 1);
}
@media (hover: hover) and (pointer: fine) {
  .chronicles-back:hover { border-bottom-color: currentColor; }
}

/* ─── Shared section heading typography ───────────────────────── */
.section-head { margin-bottom: 18px; }
.section-eyebrow {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.78rem; font-weight: 800;
  letter-spacing: 0.14em; text-transform: uppercase;
  color: var(--ink-2);
  margin: 0 0 6px;
}
.section-eyebrow-teal    { color: var(--accent-tertiary); }
.section-eyebrow-magenta { color: var(--accent-secondary); }
.section-eyebrow-mute    { color: var(--ink-3); }
.section-eyebrow-gold    { color: var(--gold); }

/* ─── THE ERAS ──────────────────────────────────────────────────
   Narrative blocks. Each card is a paragraph of editorial text
   anchored by an eyebrow + title. Visual weight is in the prose,
   not in numbers or chips. */
.eras {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.era-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 18px;
}
.era-card {
  position: relative;
  padding: 22px 24px 24px;
  border-radius: 16px;
  border: 1px solid oklch(0.20 0.015 90);
  background:
    radial-gradient(120% 180% at 0% 0%, oklch(0.14 0.013 90), transparent 60%),
    oklch(0.09 0.013 90);
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.era-card[data-tone='gold']::before {
  content: '';
  position: absolute;
  left: 0; top: 18px; bottom: 18px;
  width: 2px;
  border-radius: 2px;
  background: var(--gold);
}
.era-card[data-tone='pink']::before {
  content: '';
  position: absolute;
  left: 0; top: 18px; bottom: 18px;
  width: 2px;
  border-radius: 2px;
  background: var(--accent-secondary);
}
.era-card[data-tone='teal']::before {
  content: '';
  position: absolute;
  left: 0; top: 18px; bottom: 18px;
  width: 2px;
  border-radius: 2px;
  background: var(--accent-tertiary);
}
.era-eyebrow {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.70rem;
  font-weight: 800;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--ink-3);
  margin: 0;
}
.era-card[data-tone='gold']  .era-eyebrow { color: var(--gold); }
.era-card[data-tone='pink']  .era-eyebrow { color: var(--accent-secondary); }
.era-card[data-tone='teal']  .era-eyebrow { color: var(--accent-tertiary); }
.era-title {
  margin: 0;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 1.4rem;
  line-height: 1.05;
  color: var(--ink-1);
  letter-spacing: -0.005em;
}
.era-body {
  margin: 0;
  font-size: 0.96rem;
  line-height: 1.5;
  color: var(--ink-2);
  max-width: 56ch;
}
.era-signature {
  display: inline-flex;
  align-items: baseline;
  gap: 8px;
  margin: 6px 0 0;
}
.era-signature-label {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--ink-3);
}
.era-signature-value {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 700;
  font-size: 0.92rem;
  color: var(--ink-1);
}

/* ─── THE RECEIPTS ──────────────────────────────────────────────
   Pull-quote-style one-line records. Plain typography. No cards,
   no chips, no charts. League lore in one sentence per line. */
.receipts {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.receipt-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
}
.receipt-row {
  display: grid;
  grid-template-columns: minmax(0, 0.42fr) minmax(0, 1fr) auto;
  align-items: baseline;
  gap: 18px;
  padding: 14px 0;
  border-bottom: 1px solid oklch(0.16 0.015 90);
}
.receipt-row:last-child { border-bottom: 0; }
.receipt-label {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--ink-3);
}
.receipt-name {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: 1.18rem;
  color: var(--ink-1);
  letter-spacing: -0.005em;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.receipt-value {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 700;
  font-size: 1.02rem;
  color: var(--accent-secondary);
  font-variant-numeric: tabular-nums;
  text-align: right;
}

@media (max-width: 720px) {
  .receipt-row {
    grid-template-columns: 1fr;
    gap: 4px;
    padding: 12px 0;
  }
  .receipt-value {
    text-align: left;
  }
}
.section-headline {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: clamp(1.8rem, 3.6vw, 2.4rem);
  line-height: 0.96;
  letter-spacing: -0.012em;
  color: var(--ink-1);
  margin: 0 0 4px;
}
.section-sub {
  font-size: 0.88rem;
  color: var(--ink-3);
  margin: 0;
  max-width: 65ch;
  line-height: 1.5;
}

/* ─── Live load banner (mirrors CategoryDemoHomeView) ──────────── */
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
.live-banner-info {
  color: var(--ink-2);
  border-color: oklch(0.22 0.015 90);
}
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
  color: var(--accent-secondary);
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

/* ─── Page header ─────────────────────────────────────────────── */
.page-head {
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) auto;
  align-items: end;
  gap: 32px;
  padding: 24px 0 18px;
  border-bottom: 1px solid oklch(0.16 0.015 90);
}
.page-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.78rem; font-weight: 800;
  letter-spacing: 0.16em; text-transform: uppercase;
  color: var(--accent-secondary);
  margin: 0 0 10px;
}
.page-eyebrow-bar { width: 24px; height: 1px; background: var(--accent-secondary); }
.page-headline {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: clamp(2rem, 5.4vw, 2.6rem);
  line-height: 0.94;
  letter-spacing: -0.015em;
  color: var(--ink-1);
  margin: 0 0 8px;
}
.page-sub {
  font-size: 1rem;
  color: var(--ink-2);
  margin: 0;
  max-width: 56ch;
  line-height: 1.5;
}
.page-context {
  list-style: none;
  padding: 0;
  margin: 0;
  display: inline-flex;
  align-items: stretch;
  gap: 0;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid oklch(0.18 0.015 90);
  background: oklch(0.10 0.015 90);
}
.page-context-pill {
  padding: 10px 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  border-right: 1px solid oklch(0.18 0.015 90);
}
.page-context-pill:last-child { border-right: none; }
.page-context-num {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900; font-size: 1.4rem;
  line-height: 1;
  color: var(--ink-1);
  font-variant-numeric: tabular-nums;
}
.page-context-lbl {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.66rem; font-weight: 800;
  letter-spacing: 0.14em; text-transform: uppercase;
  color: var(--ink-3);
  margin-top: 4px;
}
@media (max-width: 720px) {
  .page-head { grid-template-columns: 1fr; gap: 18px; }
  .page-context { align-self: flex-start; flex-wrap: wrap; }
  .page-context-pill { padding: 8px 14px; }
}

/* ─── RECORD WATCH — live "what to watch" strip ──────────────── */
.watch {
  margin-top: -30px;          /* pull up toward the page head (container gap is 56px) */
  border: 1px solid oklch(0.22 0.03 145 / 0.5);
  border-radius: 16px;
  padding: 16px 18px;
  background:
    linear-gradient(180deg, oklch(0.74 0.18 145 / 0.05), transparent 60%),
    oklch(0.10 0.015 90);
}
.watch-head-row {
  display: flex;
  align-items: center;
  gap: 9px;
  margin-bottom: 14px;
}
.watch-pulse {
  width: 9px; height: 9px;
  border-radius: 50%;
  background: var(--accent-up);
  box-shadow: 0 0 0 0 oklch(0.74 0.18 145 / 0.6);
}
@media (prefers-reduced-motion: no-preference) {
  .watch-pulse { animation: watch-pulse 2s ease-out infinite; }
}
@keyframes watch-pulse {
  0%   { box-shadow: 0 0 0 0 oklch(0.74 0.18 145 / 0.55); }
  70%  { box-shadow: 0 0 0 7px oklch(0.74 0.18 145 / 0); }
  100% { box-shadow: 0 0 0 0 oklch(0.74 0.18 145 / 0); }
}
.watch-title {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.82rem; font-weight: 800;
  letter-spacing: 0.16em; text-transform: uppercase;
  color: var(--accent-up);
  margin: 0;
}
.watch-sub {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.7rem; font-weight: 700;
  letter-spacing: 0.1em; text-transform: uppercase;
  color: var(--ink-4);
  margin: 0 0 0 auto;
}
.watch-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}
@media (max-width: 820px) {
  .watch-grid { grid-template-columns: 1fr; }
}
.watch-item {
  display: flex;
  align-items: flex-start;
  gap: 11px;
  text-align: left;
  width: 100%;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 11px;
  padding: 8px;
  margin: -8px;
  color: inherit;
  font: inherit;
  cursor: pointer;
}
.watch-item:focus-visible { outline: 2px solid var(--accent-up); outline-offset: 2px; }
@media (prefers-reduced-motion: no-preference) {
  .watch-item { transition: background 140ms cubic-bezier(0.22, 1, 0.36, 1), border-color 140ms cubic-bezier(0.22, 1, 0.36, 1), transform 140ms cubic-bezier(0.22, 1, 0.36, 1); }
}
.watch-item:active { transform: scale(0.98); transition-duration: 100ms; }
@media (hover: hover) and (pointer: fine) {
  .watch-item:hover { background: oklch(0.14 0.02 145 / 0.5); border-color: oklch(0.30 0.04 145 / 0.5); }
  .watch-item:hover .watch-jump { opacity: 1; transform: translateY(1px); }
}
.watch-jump {
  display: inline-block;
  margin-left: 6px;
  color: var(--accent-up);
  opacity: 0;
  transition: opacity 140ms ease, transform 140ms ease;
}
.watch-logo {
  width: 34px; height: 34px;
  border-radius: 9px;
  overflow: hidden;
  flex: none;
  display: flex; align-items: center; justify-content: center;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900; font-size: 0.72rem;
  color: oklch(0.12 0.012 90);
}
.watch-logo img { width: 100%; height: 100%; object-fit: cover; display: block; }
.watch-body { min-width: 0; }
.watch-label {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.66rem; font-weight: 800;
  letter-spacing: 0.12em; text-transform: uppercase;
  color: var(--ink-3);
  margin: 0 0 3px;
}
.watch-text {
  font-size: 0.9rem;
  line-height: 1.35;
  color: var(--ink-1);
  margin: 0;
}

/* Scroll-anchor targets clear the masthead, and the specific team a
   Record Watch item names flashes briefly when jumped to. */
#sec-champs, #sec-legacy, .legacy-row, .podium-card { scroll-margin-top: 96px; }
.watch-flash {
  position: relative;
  z-index: 1;
  border-radius: 12px;
}
@media (prefers-reduced-motion: no-preference) {
  .watch-flash { animation: watch-flash 1.6s ease-out; }
}
@keyframes watch-flash {
  0%   { box-shadow: 0 0 0 2px oklch(0.74 0.18 145 / 0.7), 0 0 26px oklch(0.74 0.18 145 / 0.35); }
  100% { box-shadow: 0 0 0 2px oklch(0.74 0.18 145 / 0), 0 0 26px oklch(0.74 0.18 145 / 0); }
}

/* ─── 2. HALL OF CHAMPIONS ────────────────────────────────────── */
.champs-rail-wrap { position: relative; }
.champs-rail {
  display: flex;
  gap: 16px;
  overflow-x: auto;
  /* `mandatory` fights the user on a trackpad — a partial swipe snaps
     back to where it started. `proximity` snaps when they land near a
     card and otherwise leaves the scroll alone. */
  scroll-snap-type: x proximity;
  padding: 4px 4px 12px;
  margin: 0 -4px;
  scroll-behavior: smooth;
}
.rail-arrow {
  position: absolute;
  top: 170px;
  z-index: 2;
  width: 40px;
  height: 40px;
  display: grid;
  place-items: center;
  border-radius: 999px;
  cursor: pointer;
  color: oklch(0.92 0.005 90);
  background: oklch(0.12 0.015 90 / 0.94);
  border: 1px solid oklch(0.30 0.015 90);
  backdrop-filter: blur(6px);
  transition: background-color 140ms ease, border-color 140ms ease;
}
.rail-arrow:hover { background: oklch(0.18 0.015 90); border-color: oklch(0.78 0.18 92 / 0.5); }
.rail-arrow-prev { left: -6px; }
.rail-arrow-next { right: -6px; }
@media (max-width: 640px) {
  /* Touch devices swipe natively; the arrows would only cover cards. */
  .rail-arrow { display: none; }
}
.champs-rail::-webkit-scrollbar { height: 6px; }
.champs-rail::-webkit-scrollbar-thumb { background: oklch(0.20 0.015 90); border-radius: 3px; }
.champ-card {
  flex: 0 0 280px;
  height: 380px;
  scroll-snap-align: start;
  position: relative;
  border: 1px solid oklch(0.22 0.04 90);
  border-radius: 18px;
  padding: 22px 22px 18px;
  background:
    radial-gradient(ellipse at top, oklch(0.84 0.16 90 / 0.12), transparent 60%),
    linear-gradient(180deg, oklch(0.13 0.015 90), oklch(0.08 0.014 90));
  display: flex;
  flex-direction: column;
  align-items: center;
  overflow: hidden;
}
.champ-year {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 4rem;
  line-height: 0.88;
  color: var(--gold);
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
  margin: 0;
  align-self: flex-start;
}
.champ-era {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.7rem; font-weight: 800;
  letter-spacing: 0.16em; text-transform: uppercase;
  color: var(--accent-secondary);
  margin: 4px 0 18px;
  align-self: flex-start;
}

/* Live "chase" card — the undecided current season. Green identity so
   it reads as in-progress, not a trophy. */
.champ-card-live {
  border-color: oklch(0.50 0.16 145 / 0.55);
  background:
    radial-gradient(ellipse at top, oklch(0.74 0.18 145 / 0.12), transparent 60%),
    linear-gradient(180deg, oklch(0.13 0.015 90), oklch(0.08 0.014 90));
}
.champ-card-live .champ-year { color: oklch(0.78 0.16 145); }
.champ-era-live { color: oklch(0.74 0.18 145); }
.champ-avatar {
  width: 88px; height: 88px;
  border-radius: 18px;
  display: grid; place-items: center;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900; font-size: 1.6rem;
  color: oklch(0.12 0.012 90);
  overflow: hidden;
  border: 2px solid var(--gold);
  box-shadow:
    0 0 0 4px oklch(0.84 0.16 90 / 0.12),
    0 12px 32px -12px oklch(0 0 0 / 0.6);
  margin-bottom: 14px;
}
.champ-avatar-img { width: 100%; height: 100%; object-fit: cover; display: block; }
.champ-team {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 1.2rem;
  line-height: 1.1;
  letter-spacing: -0.005em;
  color: var(--ink-1);
  margin: 0 0 6px;
  text-align: center;
}
.champ-score {
  font-size: 0.84rem;
  color: var(--ink-3);
  margin: 0 0 auto;
  text-align: center;
  max-width: 26ch;
  line-height: 1.4;
}
.champ-foot {
  margin-top: 18px;
  padding-top: 12px;
  border-top: 1px solid oklch(0.18 0.015 90);
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.champ-foot-row {
  margin: 0;
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 8px;
  font-size: 0.74rem;
}
.champ-foot-lbl {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--ink-4);
}
.champ-foot-val {
  color: var(--ink-2);
  font-weight: 600;
  text-align: right;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ─── 3. LEGACY ──────────────────────────────────────────────── */
.podium {
  display: grid;
  grid-template-columns: 1fr 1.18fr 1fr;
  align-items: end;
  gap: 14px;
  margin-bottom: 24px;
}
.podium-card {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  border-radius: 16px;
  padding: 18px 16px 16px;
  cursor: pointer;
  color: inherit;
  font: inherit;
  border: 1px solid;
}
.podium-card:focus-visible {
  outline: 2px solid var(--accent-primary);
  outline-offset: 3px;
}
@media (prefers-reduced-motion: no-preference) {
  .podium-card { transition: transform 180ms cubic-bezier(0.22, 1, 0.36, 1); }
}
@media (prefers-reduced-motion: no-preference) and (hover: hover) and (pointer: fine) {
  .podium-card:hover { transform: translateY(-2px); }
}
.podium-card:active { transform: scale(0.99); transition-duration: 100ms; }

/* Live mode: legacy cards are display-only (the detail modal is still
   fixture-backed), so suppress the click affordances — no pointer, no
   hover lift, no press. */
.podium-card.is-static,
.legacy-row.is-static { cursor: default; }
.podium-card.is-static:active,
.legacy-row.is-static:active { transform: none; }
@media (prefers-reduced-motion: no-preference) {
  .podium-card.is-static:hover { transform: none; }
  .legacy-row.is-static:hover { transform: none; border-color: oklch(0.16 0.015 90); }
  .legacy-row-me.is-static:hover { border-color: oklch(0.78 0.18 92 / 0.55); }
}

/* Manager count — reconciles the 16-deep list with the 12-team pill. */
.legacy-context {
  margin: 10px 0 0;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.98rem;
  font-weight: 700;
  letter-spacing: 0.01em;
  color: var(--ink-2);
}

/* The defined legacy formula, shown so the score is never a black box. */
.legacy-formula {
  margin: 4px 0 0;
  font-size: 0.72rem;
  letter-spacing: 0.03em;
  color: var(--ink-3);
  font-variant-numeric: tabular-nums;
}

/* The signed-in manager's own card — findable at a glance on a page
   that is explicitly "your league". Magenta ring stays distinct from
   the gold #1 treatment and the per-card accent borders. */
.podium-card-me {
  box-shadow: inset 0 0 0 2px oklch(0.72 0.16 330 / 0.85);
}

/* Column header above the tail, so the right-hand number stays labeled
   once the formula caption has scrolled out of view. */
.legacy-rows-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin: 22px 2px 8px;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--ink-3);
}
.legacy-rows-head-score { color: var(--ink-2); }
.podium-1 {
  order: 2;
  border-color: oklch(0.50 0.10 90);
  background:
    radial-gradient(ellipse at top, oklch(0.84 0.16 90 / 0.22), transparent 65%),
    linear-gradient(180deg, oklch(0.16 0.04 90), oklch(0.10 0.02 90));
  padding-top: 26px;
  padding-bottom: 22px;
  min-height: 260px;
}
.podium-2 { order: 1; border-color: oklch(0.30 0.012 90);
  background:
    radial-gradient(ellipse at top, color-mix(in oklch, var(--podium-accent) 14%, transparent), transparent 65%),
    linear-gradient(180deg, oklch(0.13 0.012 90), oklch(0.10 0.012 90));
  min-height: 220px;
}
.podium-3 { order: 3; border-color: oklch(0.30 0.06 50);
  background:
    radial-gradient(ellipse at top, color-mix(in oklch, var(--podium-accent) 12%, transparent), transparent 60%),
    linear-gradient(180deg, oklch(0.13 0.02 90), oklch(0.10 0.012 90));
  min-height: 200px;
}
.podium-rank-badge {
  position: absolute;
  top: 12px;
  left: 14px;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.74rem; font-weight: 900;
  letter-spacing: 0.08em;
  color: var(--ink-3);
}
.podium-rank-1 { color: var(--gold); }
.podium-avatar {
  border-radius: 16px;
  display: grid; place-items: center;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  color: oklch(0.12 0.012 90);
  overflow: hidden;
  box-shadow: 0 10px 28px -12px oklch(0 0 0 / 0.6);
  margin-bottom: 8px;
}
.podium-avatar-1 { width: 80px; height: 80px; font-size: 1.4rem; border: 2px solid var(--gold); }
.podium-avatar-2 { width: 64px; height: 64px; font-size: 1.1rem; border: 2px solid var(--silver); }
.podium-avatar-3 { width: 56px; height: 56px; font-size: 1rem;   border: 2px solid var(--bronze); }
.podium-avatar img { width: 100%; height: 100%; object-fit: cover; display: block; }
.podium-score {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  line-height: 0.86;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
  margin: 0 0 4px;
}
.podium-score-1 { font-size: 4rem; color: var(--gold); }
.podium-score-2 { font-size: 3rem; color: var(--silver); }
.podium-score-3 { font-size: 2.4rem; color: var(--bronze); }
.podium-team {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 1.05rem;
  line-height: 1.1;
  color: var(--ink-1);
  margin: 0 0 3px;
}
.podium-seasons {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--ink-3);
  margin: 0 0 10px;
}
.podium-badges {
  list-style: none;
  padding: 0;
  margin: 0;
  display: inline-flex;
  gap: 6px;
  flex-wrap: wrap;
  justify-content: center;
}
.podium-badge {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.72rem; font-weight: 800;
  letter-spacing: 0.08em; text-transform: uppercase;
  color: var(--ink-2);
  background: oklch(0.18 0.015 90 / 0.7);
  border: 1px solid oklch(0.22 0.015 90);
  padding: 3px 8px;
  border-radius: 999px;
}
.podium-badge-gold {
  color: var(--gold);
  border-color: oklch(0.50 0.12 90 / 0.5);
  background: oklch(0.84 0.16 90 / 0.10);
}
.podium-1-sub {
  margin: 12px 0 0;
  font-size: 0.8rem;
  color: var(--ink-3);
  max-width: 24ch;
}

.legacy-rows { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 6px; }
.legacy-row {
  display: grid;
  grid-template-columns: 28px 16px 36px minmax(160px, 1.8fr) minmax(0, 1.7fr) 70px;
  align-items: center;
  gap: 12px;
  padding: 8px 14px;
  background: oklch(0.10 0.015 90);
  border: 1px solid oklch(0.16 0.015 90);
  border-radius: 12px;
  cursor: pointer;
  color: inherit;
  font: inherit;
  text-align: left;
  width: 100%;
}
.legacy-row-me {
  border-color: oklch(0.78 0.18 92 / 0.55);
  background:
    linear-gradient(90deg, oklch(0.78 0.18 92 / 0.06), oklch(0.78 0.18 92 / 0)),
    oklch(0.10 0.015 90);
}
.legacy-row:focus-visible { outline: 2px solid var(--accent-primary); outline-offset: 2px; }
@media (prefers-reduced-motion: no-preference) {
  .legacy-row { transition: transform 160ms cubic-bezier(0.22, 1, 0.36, 1), border-color 160ms cubic-bezier(0.22, 1, 0.36, 1); }
}
@media (prefers-reduced-motion: no-preference) and (hover: hover) and (pointer: fine) {
  .legacy-row:hover { transform: translateY(-1px); border-color: oklch(0.30 0.015 90); }
}
.legacy-row:active { transform: scale(0.99); transition-duration: 100ms; }
.legacy-rank {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900; font-size: 1rem;
  color: var(--ink-3);
  font-variant-numeric: tabular-nums;
  text-align: center;
}
.legacy-mepin { color: oklch(0.84 0.16 90); display: inline-flex; align-items: center; }
.legacy-row:not(.legacy-row-me) .legacy-mepin { visibility: hidden; }
.legacy-avatar {
  width: 36px; height: 36px; border-radius: 9px;
  display: grid; place-items: center;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900; font-size: 0.78rem;
  color: oklch(0.12 0.012 90);
  overflow: hidden;
}
.legacy-avatar-img { width: 100%; height: 100%; object-fit: cover; display: block; }
.legacy-meta { min-width: 0; }
.legacy-team {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 0.96rem;
  line-height: 1.1;
  color: var(--ink-1);
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.legacy-seasons {
  font-size: 0.74rem;
  color: var(--ink-4);
  margin: 2px 0 0;
}
.legacy-badges {
  list-style: none; padding: 0; margin: 0;
  display: inline-flex; gap: 6px; flex-wrap: wrap;
}
.legacy-badge {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.7rem; font-weight: 700;
  letter-spacing: 0.06em; text-transform: uppercase;
  color: var(--ink-3);
  background: oklch(0.13 0.015 90);
  border: 1px solid oklch(0.18 0.015 90);
  padding: 3px 7px;
  border-radius: 999px;
}
.legacy-badge-gold {
  color: var(--gold);
  border-color: oklch(0.50 0.12 90 / 0.5);
  background: oklch(0.84 0.16 90 / 0.08);
}
.legacy-score {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900; font-size: 1.4rem;
  color: var(--ink-1);
  font-variant-numeric: tabular-nums;
  text-align: right;
  letter-spacing: -0.005em;
}

@media (max-width: 720px) {
  .podium {
    grid-template-columns: 1fr;
    gap: 10px;
  }
  .podium-1, .podium-2, .podium-3 { order: 0; min-height: auto; }
  .legacy-row {
    grid-template-columns: 24px 0 32px minmax(0, 1fr) 60px;
    gap: 8px;
  }
  .legacy-mepin { display: none; }
  .legacy-badges { grid-column: 1 / -1; padding-left: 56px; }
}

/* ─── 4. ACROSS THE YEARS — bump chart ───────────────────────── */
.bump-wrap {
  position: relative;
  background: oklch(0.10 0.015 90);
  border: 1px solid oklch(0.16 0.015 90);
  border-radius: 14px;
  padding: 10px 8px 4px;
}
.bump-chart {
  width: 100%;
  height: 400px;
  display: block;
}
@media (max-width: 720px) {
  .bump-chart { height: 300px; }
}
.bump-grid line {
  stroke: oklch(0.17 0.012 90);
  stroke-width: 1;
}
.bump-xticks text {
  fill: var(--ink-3);
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 0.08em;
}
.bump-line-dim {
  stroke: oklch(0.42 0.012 90 / 0.30);
  stroke-width: 1.3;
}
.bump-line {
  stroke-width: 2.6;
  opacity: 0.95;
}
.bump-line.is-me {
  stroke-width: 3.4;
  filter: drop-shadow(0 0 5px oklch(0.84 0.16 90 / 0.5));
}

/* Y-axis hints — finish 1 at top, last at bottom. */
.bump-axis {
  position: absolute;
  left: 12px;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--ink-4);
}
.bump-axis-top { top: 16px; }
.bump-axis-bot { bottom: 30px; }

/* Logo-node overlay — positioned in % to track the stretched SVG.
   Inset matches .bump-wrap padding so the box equals the chart box. */
.bump-overlay {
  position: absolute;
  inset: 10px 8px 4px;
  pointer-events: none;
}
.bump-node {
  position: absolute;
  transform: translate(-50%, -50%);
}
.bump-node-avatar {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: 11px;
  color: oklch(0.97 0.01 90);
  box-shadow: 0 0 0 2px oklch(0.08 0.01 90), 0 0 0 3.5px var(--node-accent);
}
.bump-node-avatar img { width: 100%; height: 100%; object-fit: cover; display: block; }
.bump-node.is-me .bump-node-avatar {
  width: 32px;
  height: 32px;
  box-shadow:
    0 0 0 2px oklch(0.08 0.01 90),
    0 0 0 4px oklch(0.84 0.16 90),
    0 0 10px oklch(0.84 0.16 90 / 0.5);
}
.bump-dot-dim {
  position: absolute;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: oklch(0.55 0.012 90 / 0.65);
  transform: translate(-50%, -50%);
}
.bump-line-dim { opacity: 0.55; }
.bump-label {
  position: absolute;
  transform: translateY(-50%);
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: 14px;
  letter-spacing: 0.02em;
  white-space: nowrap;
}

/* ─── 5. THE RIVALRIES — head-to-head story cards ──────────── */
.rivalry-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}
@media (max-width: 820px) {
  .rivalry-grid { grid-template-columns: 1fr; }
}
.rivalry-card {
  display: flex;
  flex-direction: column;
  background: oklch(0.10 0.015 90);
  border: 1px solid oklch(0.16 0.015 90);
  border-radius: 14px;
  padding: 16px 14px 14px;
}
.rivalry-card-me {
  border-color: oklch(0.78 0.18 92 / 0.45);
  background:
    radial-gradient(ellipse at top, oklch(0.78 0.18 92 / 0.06), transparent 65%),
    oklch(0.10 0.015 90);
}
.rivalry-eyebrow {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--ink-3);
  margin: 0 0 12px;
}
.rivalry-card-me .rivalry-eyebrow { color: oklch(0.84 0.16 90); }

.rivalry-faces {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}
.rivalry-face {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  min-width: 0;
}
.rivalry-avatar {
  width: 44px;
  height: 44px;
  border-radius: 11px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 0.85rem;
  color: oklch(0.12 0.012 90);
  margin-bottom: 6px;
}
.rivalry-avatar img { width: 100%; height: 100%; object-fit: cover; display: block; }
.rivalry-avatar-me {
  box-shadow: 0 0 0 2px oklch(0.10 0.015 90), 0 0 0 3px oklch(0.84 0.16 90);
}
.rivalry-name {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: 0.82rem;
  letter-spacing: 0.01em;
  color: var(--ink-1);
  margin: 0;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.rivalry-record {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 2rem;
  line-height: 1;
  color: var(--ink-1);
  font-variant-numeric: tabular-nums;
  margin: 0;
  text-align: center;
}
.rivalry-dash {
  margin: 0 4px;
  color: var(--ink-3);
  font-weight: 700;
}
.rivalry-ties {
  font-size: 0.85rem;
  color: var(--ink-3);
  font-weight: 700;
  margin-left: 4px;
}
.rivalry-meta {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--ink-3);
  text-align: center;
  margin: 0 0 8px;
}
.rivalry-dot { margin: 0 6px; opacity: 0.5; }
.rivalry-caption {
  font-size: 0.86rem;
  line-height: 1.35;
  color: var(--ink-2);
  text-align: center;
  margin: 0;
}
.rivalry-empty {
  font-style: italic;
  color: var(--ink-3);
  text-align: center;
  padding: 24px 12px;
  border: 1px dashed oklch(0.18 0.015 90);
  border-radius: 12px;
}

/* ─── 6. CATEGORY CROWNS — this season's per-cat leaders ──────── */
.crown-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}
@media (max-width: 820px) {
  .crown-grid { grid-template-columns: 1fr; }
}
.crown-card {
  display: flex;
  flex-direction: column;
  background: oklch(0.10 0.015 90);
  border: 1px solid oklch(0.18 0.015 90);
  border-radius: 16px;
  padding: 18px 18px 16px;
}
.crown-bats  { background: linear-gradient(160deg, oklch(0.74 0.18 145 / 0.07), oklch(0.10 0.015 90) 55%); border-color: oklch(0.74 0.18 145 / 0.30); }
.crown-arms  { background: linear-gradient(160deg, oklch(0.72 0.18 195 / 0.08), oklch(0.10 0.015 90) 55%); border-color: oklch(0.72 0.18 195 / 0.30); }
.crown-punt  { background: linear-gradient(160deg, oklch(0.70 0.27 350 / 0.07), oklch(0.10 0.015 90) 55%); border-color: oklch(0.70 0.27 350 / 0.30); }
.crown-eyebrow {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.74rem; font-weight: 800;
  letter-spacing: 0.16em; text-transform: uppercase;
  margin: 0 0 12px;
}
.crown-bats .crown-eyebrow { color: var(--accent-up); }
.crown-arms .crown-eyebrow { color: var(--accent-tertiary); }
.crown-punt .crown-eyebrow { color: var(--accent-secondary); }

.crown-id {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}
.crown-avatar {
  width: 44px; height: 44px;
  border-radius: 11px;
  overflow: hidden;
  display: flex; align-items: center; justify-content: center;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900; font-size: 0.85rem;
  color: oklch(0.12 0.012 90);
  flex: none;
}
.crown-avatar img { width: 100%; height: 100%; object-fit: cover; display: block; }
.crown-avatar-me { box-shadow: 0 0 0 2px oklch(0.10 0.015 90), 0 0 0 3px oklch(0.84 0.16 90); }
.crown-name {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800; font-size: 1rem;
  color: var(--ink-1);
  margin: 0;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.crown-count {
  display: flex; align-items: baseline; gap: 8px;
  margin: 0 0 12px;
}
.crown-num {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900; font-size: 2.4rem; line-height: 1;
  color: var(--ink-1);
  font-variant-numeric: tabular-nums;
}
.crown-label {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.7rem; font-weight: 700;
  letter-spacing: 0.12em; text-transform: uppercase;
  color: var(--ink-3);
}
.crown-cats {
  list-style: none; padding: 0; margin: 0 0 12px;
  display: flex; flex-wrap: wrap; gap: 5px;
}
.crown-cat-chip {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900; font-size: 0.72rem;
  letter-spacing: 0.06em;
  padding: 3px 9px; border-radius: 999px;
  border: 1px solid;
}
.crown-cat-bats { color: var(--accent-up); border-color: oklch(0.74 0.18 145 / 0.4); background: oklch(0.74 0.18 145 / 0.08); }
.crown-cat-arms { color: var(--accent-tertiary); border-color: oklch(0.72 0.18 195 / 0.4); background: oklch(0.72 0.18 195 / 0.08); }
.crown-cat-punt { color: var(--accent-secondary); border-color: oklch(0.70 0.27 350 / 0.4); background: oklch(0.70 0.27 350 / 0.08); }
.crown-caption {
  font-size: 0.88rem; line-height: 1.4;
  color: var(--ink-2);
  margin: auto 0 0;
}
.crown-empty {
  font-style: italic;
  color: var(--ink-3);
  text-align: center;
  padding: 24px 12px;
  border: 1px dashed oklch(0.18 0.015 90);
  border-radius: 12px;
}

/* ─── 7. AWARDS ──────────────────────────────────────────────── */
.awards-filters {
  display: inline-flex;
  gap: 4px;
  padding: 4px;
  border-radius: 999px;
  background: oklch(0.10 0.015 90);
  border: 1px solid oklch(0.16 0.015 90);
  margin-bottom: 18px;
}
.awards-filter {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.78rem; font-weight: 800;
  letter-spacing: 0.08em; text-transform: uppercase;
  color: var(--ink-3);
  background: transparent;
  border: none;
  padding: 5px 14px;
  border-radius: 999px;
  cursor: pointer;
}
.awards-filter-active {
  background: oklch(0.18 0.015 90);
  color: var(--ink-1);
}
.awards-filter:active { transform: scale(0.97); transition-duration: 100ms; }
.awards-filter:focus-visible { outline: 2px solid var(--accent-primary); outline-offset: 2px; }

.awards-years {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 12px;
  margin-left: 4px;
  flex-wrap: wrap;
}
.awards-years-label {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--ink-4);
  margin-right: 6px;
}
.awards-year {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: 0.86rem;
  letter-spacing: 0.04em;
  font-variant-numeric: tabular-nums;
  color: var(--ink-3);
  background: transparent;
  border: 1px solid oklch(0.18 0.015 90);
  border-radius: 999px;
  padding: 4px 12px;
  cursor: pointer;
}
.awards-year:hover { color: var(--ink-1); border-color: oklch(0.30 0.018 90); }
.awards-year:active { transform: scale(0.99); transition-duration: 100ms; }
.awards-year:focus-visible { outline: 2px solid var(--accent-secondary); outline-offset: 2px; }
.awards-year-active {
  color: oklch(0.10 0.012 90);
  background: var(--accent-secondary);
  border-color: var(--accent-secondary);
}

.awards-sub {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.86rem; font-weight: 800;
  letter-spacing: 0.18em; text-transform: uppercase;
  margin: 26px 0 12px;
}
.awards-sub-fame  { color: var(--accent-up); }
.awards-sub-shame { color: var(--accent-secondary); }

.fame-grid, .shame-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 14px;
}
.fame-a { grid-column: 1 / -1; }
.fame-d { grid-column: 1 / -1; }
.shame-c { grid-column: 1 / -1; }
.shame-d { grid-column: 1 / -1; }

.fame-a, .fame-b, .fame-c, .fame-d,
.shame-a, .shame-b, .shame-c, .shame-d {
  text-align: left;
  background: oklch(0.10 0.015 90);
  border: 1px solid oklch(0.16 0.015 90);
  border-radius: 14px;
  padding: 16px 18px;
  cursor: pointer;
  color: inherit;
  font: inherit;
}
.fame-a, .fame-b, .fame-c, .fame-d { border-left: 3px solid var(--accent-up); }
.shame-a, .shame-b, .shame-c, .shame-d { border-left: 3px solid var(--accent-secondary); }
.fame-a:focus-visible, .fame-b:focus-visible, .fame-c:focus-visible, .fame-d:focus-visible,
.shame-a:focus-visible, .shame-b:focus-visible, .shame-c:focus-visible, .shame-d:focus-visible {
  outline: 2px solid var(--accent-primary); outline-offset: 2px;
}
@media (prefers-reduced-motion: no-preference) {
  .fame-a, .fame-b, .fame-c, .fame-d,
  .shame-a, .shame-b, .shame-c, .shame-d {
    transition: transform 160ms cubic-bezier(0.22, 1, 0.36, 1), border-color 160ms cubic-bezier(0.22, 1, 0.36, 1);
  }
}
@media (prefers-reduced-motion: no-preference) and (hover: hover) and (pointer: fine) {
  .fame-a:hover, .fame-b:hover, .fame-c:hover, .fame-d:hover { transform: translateY(-1px); border-color: oklch(0.30 0.015 90); border-left-color: var(--accent-up); }
  .shame-a:hover, .shame-b:hover, .shame-c:hover, .shame-d:hover { transform: translateY(-1px); border-color: oklch(0.30 0.015 90); border-left-color: var(--accent-secondary); }
}
.fame-a:active, .fame-b:active, .fame-c:active, .fame-d:active,
.shame-a:active, .shame-b:active, .shame-c:active, .shame-d:active {
  transform: scale(0.99); transition-duration: 100ms;
}

.fame-tile-eyebrow, .fame-a-eyebrow, .fame-d-eyebrow,
.shame-tile-eyebrow, .shame-c-eyebrow, .shame-d-eyebrow {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.72rem; font-weight: 800;
  letter-spacing: 0.14em; text-transform: uppercase;
  display: block;
  margin-bottom: 8px;
}
.fame-tile-eyebrow, .fame-a-eyebrow, .fame-d-eyebrow { color: var(--accent-up); }
.shame-tile-eyebrow, .shame-c-eyebrow, .shame-d-eyebrow { color: var(--accent-secondary); }

.fame-a {
  background:
    radial-gradient(ellipse at right, oklch(0.74 0.18 145 / 0.08), transparent 60%),
    oklch(0.10 0.015 90);
}
.fame-a-body {
  display: flex;
  align-items: center;
  gap: 22px;
  justify-content: space-between;
  flex-wrap: wrap;
}
.fame-a-id { display: flex; align-items: center; gap: 12px; }
.fame-a-avatar {
  width: 48px; height: 48px;
  border-radius: 12px;
  display: grid; place-items: center;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900; font-size: 1rem;
  color: oklch(0.12 0.012 90);
  overflow: hidden;
}
.fame-a-avatar img { width: 100%; height: 100%; object-fit: cover; display: block; }
.fame-a-team {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 1.1rem;
  color: var(--ink-1);
  margin: 0;
}
.fame-a-when {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.78rem; font-weight: 700;
  letter-spacing: 0.08em; text-transform: uppercase;
  color: var(--ink-3);
  margin: 2px 0 0;
}
.fame-a-value {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: clamp(3.4rem, 9vw, 5rem);
  line-height: 0.86;
  letter-spacing: -0.02em;
  color: var(--accent-up);
  font-variant-numeric: tabular-nums;
  margin: 0;
}
.fame-a-trail {
  margin: 12px 0 0;
  font-size: 0.86rem;
  color: var(--ink-3);
}

.fame-b-mid {
  display: flex; flex-direction: column; align-items: flex-start; gap: 8px;
  margin-bottom: 8px;
}
.fame-b-avatar {
  width: 40px; height: 40px; border-radius: 10px;
  display: grid; place-items: center;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900; font-size: 0.92rem;
  color: oklch(0.12 0.012 90);
  overflow: hidden;
}
.fame-b-avatar img { width: 100%; height: 100%; object-fit: cover; display: block; }
.fame-b-team {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 0.96rem;
  color: var(--ink-1);
  margin: 0;
}
.fame-b-value {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 2.4rem;
  line-height: 0.9;
  color: var(--ink-1);
  font-variant-numeric: tabular-nums;
  margin: 0;
}
.fame-b-sub {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.74rem; font-weight: 800;
  letter-spacing: 0.14em; text-transform: uppercase;
  color: var(--ink-3);
  margin: 4px 0 0;
}

.fame-c {
  background:
    linear-gradient(135deg, oklch(0.14 0.04 145 / 0.18), oklch(0.10 0.015 90) 70%);
}
.fame-c-row { display: flex; align-items: baseline; gap: 14px; flex-wrap: wrap; }
.fame-c-value {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 2.6rem;
  line-height: 0.86;
  color: var(--accent-up);
  font-variant-numeric: tabular-nums;
  margin: 0;
}
.fame-c-id { display: inline-flex; align-items: center; gap: 8px; }
.fame-c-avatar {
  width: 32px; height: 32px; border-radius: 8px;
  display: grid; place-items: center;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900; font-size: 0.78rem;
  color: oklch(0.12 0.012 90);
  overflow: hidden;
}
.fame-c-avatar img { width: 100%; height: 100%; object-fit: cover; display: block; }
.fame-c-team {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800; font-size: 0.92rem;
  color: var(--ink-1);
  margin: 0;
}
.fame-c-sub {
  font-size: 0.82rem;
  color: var(--ink-3);
  margin: 10px 0 0;
}

.fame-d { padding: 12px 16px; display: flex; align-items: baseline; gap: 14px; flex-wrap: wrap; }
.fame-d-text {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.96rem;
  color: var(--ink-2);
  margin: 0;
}
.fame-d-text strong { color: var(--ink-1); font-weight: 900; }
.fame-d-pct { color: var(--accent-up); font-weight: 900; }
.fame-d-rec { color: var(--ink-3); }
.fame-d-dot { color: var(--ink-5); margin: 0 6px; }

.shame-a-value {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 3.4rem;
  line-height: 0.86;
  letter-spacing: -0.02em;
  color: var(--accent-secondary);
  font-variant-numeric: tabular-nums;
  margin: 0 0 12px;
}
.shame-a-foot { display: flex; align-items: center; gap: 10px; }
.shame-a-avatar {
  width: 40px; height: 40px; border-radius: 10px;
  display: grid; place-items: center;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900; font-size: 0.92rem;
  color: oklch(0.12 0.012 90);
  overflow: hidden;
}
.shame-a-avatar img { width: 100%; height: 100%; object-fit: cover; display: block; }
.shame-a-team {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 0.96rem;
  color: var(--ink-1);
  margin: 0;
}
.shame-a-when {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.74rem; font-weight: 700;
  letter-spacing: 0.08em; text-transform: uppercase;
  color: var(--ink-3);
  margin: 2px 0 0;
}

.shame-b-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.shame-b-text { min-width: 0; }
.shame-b-value {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 2.6rem;
  line-height: 0.86;
  color: var(--ink-1);
  font-variant-numeric: tabular-nums;
  margin: 0;
}
.shame-b-sub {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.74rem; font-weight: 800;
  letter-spacing: 0.14em; text-transform: uppercase;
  color: var(--ink-3);
  margin: 4px 0 6px;
}
.shame-b-team {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 0.96rem;
  color: var(--ink-2);
  margin: 0;
}
.shame-b-avatar {
  width: 48px; height: 48px;
  border-radius: 12px;
  display: grid; place-items: center;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900; font-size: 1rem;
  color: oklch(0.12 0.012 90);
  overflow: hidden;
  flex-shrink: 0;
}
.shame-b-avatar img { width: 100%; height: 100%; object-fit: cover; display: block; }

.shame-c { padding: 14px 18px; }
.shame-c-text {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 1.05rem;
  color: var(--ink-2);
  margin: 0;
  display: flex; flex-wrap: wrap; align-items: baseline; gap: 8px;
}
.shame-c-text strong { color: var(--ink-1); font-weight: 900; }
.shame-c-value {
  font-weight: 900;
  font-size: 1.5rem;
  color: var(--accent-secondary);
  font-variant-numeric: tabular-nums;
}
.shame-c-trail { color: var(--ink-3); font-weight: 600; font-size: 0.92rem; }
.shame-c-dot { color: var(--ink-5); margin: 0 6px; }

.shame-d { padding: 12px 16px; display: flex; align-items: baseline; gap: 14px; flex-wrap: wrap; }
.shame-d-text {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.96rem;
  color: var(--ink-2);
  margin: 0;
}
.shame-d-text strong { color: var(--ink-1); font-weight: 900; }
.shame-d-pct { color: var(--accent-secondary); font-weight: 900; }
.shame-d-rec { color: var(--ink-3); }
.shame-d-dot { color: var(--ink-5); margin: 0 6px; }

@media (max-width: 720px) {
  .fame-grid, .shame-grid { grid-template-columns: 1fr; }
  .fame-a-value { font-size: 3rem; }
  .shame-a-value { font-size: 2.8rem; }
}

/* ─── 8. CAREER TABLE ────────────────────────────────────────── */
.career-table-wrap {
  background: oklch(0.10 0.015 90);
  border: 1px solid oklch(0.16 0.015 90);
  border-radius: 14px;
  padding: 6px 0;
  overflow-x: auto;
}
.career-table {
  width: 100%;
  min-width: 820px;
  border-collapse: collapse;
}
.career-table thead th {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.72rem; font-weight: 800;
  letter-spacing: 0.14em; text-transform: uppercase;
  color: var(--ink-3);
  text-align: left;
  padding: 12px 12px;
  border-bottom: 1px solid oklch(0.18 0.015 90);
  white-space: nowrap;
}
.career-table thead th.th-num,
.career-table thead th.th-cat { text-align: right; }
.career-table tbody tr { border-bottom: 1px solid oklch(0.14 0.015 90); }
.career-table tbody tr:last-child { border-bottom: none; }
.career-row-me {
  background:
    linear-gradient(90deg, oklch(0.78 0.18 92 / 0.06), oklch(0.78 0.18 92 / 0)),
    transparent;
}
.career-table .td-team { padding: 0 12px; text-align: left; font-weight: inherit; }
.career-row-btn {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  background: transparent;
  border: none;
  color: inherit;
  font: inherit;
  cursor: pointer;
  padding: 10px 0;
  text-align: left;
}
.career-row-btn:focus-visible { outline: 2px solid var(--accent-primary); outline-offset: 2px; }
.career-avatar {
  width: 32px; height: 32px; border-radius: 8px;
  display: grid; place-items: center;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900; font-size: 0.78rem;
  color: oklch(0.12 0.012 90);
  overflow: hidden;
}
.career-avatar img { width: 100%; height: 100%; object-fit: cover; display: block; }
.career-team-name {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: 0.94rem;
  color: var(--ink-1);
  white-space: nowrap;
}
.career-table .td-num {
  padding: 10px 12px;
  text-align: right;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 700;
  font-size: 0.92rem;
  color: var(--ink-2);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.career-table .td-cat {
  padding: 10px 12px;
  text-align: right;
}
.career-table .td-pos { color: var(--accent-up); }
.career-table .td-neg { color: var(--accent-secondary); }
.career-title-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 22px;
  padding: 2px 6px;
  border-radius: 6px;
  background: oklch(0.84 0.16 90 / 0.14);
  color: var(--gold);
  font-weight: 900;
  font-size: 0.86rem;
}
.career-dash { color: var(--ink-5); }
.career-cat-chip {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.7rem; font-weight: 900;
  letter-spacing: 0.06em;
  padding: 3px 8px;
  border-radius: 999px;
  border: 1px solid;
  font-variant-numeric: tabular-nums;
}
.career-cat-best {
  color: var(--accent-up);
  border-color: oklch(0.74 0.18 145 / 0.4);
  background: oklch(0.74 0.18 145 / 0.08);
}
.career-cat-worst {
  color: var(--accent-secondary);
  border-color: oklch(0.70 0.27 350 / 0.4);
  background: oklch(0.70 0.27 350 / 0.08);
}

/* ─── 9. FOOTNOTES ───────────────────────────────────────────── */
.pills {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex; flex-wrap: wrap; gap: 8px;
}
.pill {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 8px 14px;
  border-radius: 999px;
  background: oklch(0.10 0.015 90);
  border: 1px solid oklch(0.18 0.015 90);
  font-size: 0.84rem;
  color: var(--ink-2);
}
.pill-dot { width: 8px; height: 8px; border-radius: 50%; }
.pill-dot-gold { background: var(--gold); }
.pill-dot-secondary { background: var(--accent-secondary); }
.pill-dot-tertiary { background: var(--accent-tertiary); }
.pill-dot-mute { background: var(--ink-4); }
.pill-label {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.72rem; font-weight: 800;
  letter-spacing: 0.12em; text-transform: uppercase;
  color: var(--ink-3);
}
.pill-value { color: var(--ink-1); font-weight: 600; }
</style>
