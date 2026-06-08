<template>
  <div class="issue">
    <!-- Live load banner — copied pattern from the Beat -->
    <LiveLoadError v-if="liveError" :message="liveError" :platform-label="platformLabel" />

    <!-- Loading guard. In strict live mode we MUST wait for the
         adapter before rendering, otherwise the fixture team names
         leak into the real league's issue (the page silently
         falls back to `fixtureData` when `liveData` is null). -->
    <div
      v-if="isStrictLiveMode && !liveData && !liveError"
      class="issue-loading"
      role="status"
      aria-live="polite"
    >
      <!-- 2px indeterminate progress bar at the very top of the
           page. Universal "something is happening" signal — the
           ambient void with one line of text used to read as
           broken. -->
      <div class="issue-loading-bar" aria-hidden="true">
        <span class="issue-loading-bar-fill"></span>
      </div>
      <div class="issue-loading-stage">
        <!-- Spinning TLB monogram. The square favicon spins cleanly
             (the wide lockup would look broken rotating). A linear
             1.6s rotation reads as "alive, working" rather than
             frozen. Subtle pulse on scale completes the breathing
             feel without competing with the rotation. -->
        <img
          src="/tlb-favicon.png"
          alt="The League Beat"
          class="issue-loading-logo"
        />
        <p class="issue-loading-title">{{ loadingTitle }}</p>
        <p class="issue-loading-sub">{{ loadingSubline }}</p>
      </div>
    </div>

    <template v-else>
    <!-- Issue masthead. "Published Monday" frames this as a frozen
         artifact, not a live dashboard. The Beat tab is where live
         updates live; the Issue is the published recap. -->
    <header class="issue-masthead">
      <h1 class="issue-title">
        Issue {{ issueNumber }}
        <span class="issue-title-meta">· Week {{ issueWeek }} · {{ data.currentSeason }}</span>
      </h1>
      <!-- The title above already establishes Week N · Year; the sub
           focuses on cadence and league identity. Previously this
           repeated "Week N" within ~50px of the same word in the
           title, which read as auto-generated. -->
      <p class="issue-sub">
        Published Monday morning. The recap of the week in
        {{ leagueName }}, chronicled.
      </p>
    </header>

    <!-- ─── THE COVER ──────────────────────────────────────────────
         Single hero: one declarative narrative for the week. Reuses
         the LADDER hero from the existing PR pipeline as the cover
         story for V0. In V1, a wider cover-story detector will
         choose from a richer candidate set (throne / wild arc /
         cellar lock / final-week race), but the existing margin-aware
         hero is the right starting point.
    ──────────────────────────────────────────────────────────────── -->
    <section v-if="livePR.hero" class="cover" :aria-labelledby="`cover-headline`">
      <div class="cover-portrait" v-if="coverTeam">
        <div
          class="cover-portrait-frame"
          :style="{ background: `linear-gradient(155deg, ${coverTeam.avatarColor})` }"
        >
          <img
            v-if="coverTeam.avatarUrl"
            :src="coverTeam.avatarUrl"
            class="avatar-image"
            alt=""
          />
          <span v-else class="cover-portrait-initials">{{ coverTeam.ownerInitials }}</span>
        </div>
      </div>

      <div class="cover-copy">
        <p class="cover-eyebrow">
          <span class="cover-eyebrow-bar" aria-hidden="true"></span>
          {{ livePR.hero.eyebrow }}
        </p>
        <h2 class="cover-headline" id="cover-headline">{{ livePR.hero.headline }}</h2>
        <p class="cover-body">{{ livePR.hero.body }}</p>

        <ul class="cover-stats" role="list">
          <li
            v-for="(chip, i) in livePR.hero.statChips"
            :key="`cover-stat-${i}`"
            class="cover-stat"
          >
            <span class="cover-stat-num">{{ chip.value }}</span>
            <span class="cover-stat-label">{{ chip.label }}</span>
          </li>
        </ul>
      </div>
    </section>

    <!-- ─── TABLE OF CONTENTS ────────────────────────────────────── -->
    <nav class="issue-toc" aria-label="In this issue">
      <p class="issue-toc-label">In this issue</p>
      <ol class="issue-toc-list" role="list">
        <li><a href="#section-power">01 — Power Rankings</a></li>
        <li><a href="#section-matchups">02 — Matchups</a></li>
        <li v-if="showDraftSection"><a href="#section-draft">03 — Draft</a></li>
        <li><a href="#section-departments">{{ departmentsSectionNumber }} — Departments</a></li>
      </ol>
    </nav>

    <!-- ─── 01 — POWER RANKINGS ──────────────────────────────────── -->
    <section id="section-power" class="section" aria-labelledby="section-power-heading">
      <header class="section-head">
        <p class="section-eyebrow">01 — Power Rankings</p>
        <h2 class="section-headline" id="section-power-heading">
          {{ data.teams.length }} teams. One ladder.
        </h2>
        <p v-if="prCommentary" class="section-lede">
          {{ prCommentary }}
        </p>
        <p class="section-sub">
          Ranked by official standings (win percentage). Cat record shown
          for context. The chart, the head-to-head matrix, and the full
          sort-and-filter board live in
          <a href="https://ultimatefantasydashboard.com" target="_blank" rel="noopener">Ultimate Fantasy Dashboard</a>.
        </p>
      </header>

      <ol class="standings" role="list" aria-label="Final standings of Week ${issueWeek}">
        <li
          v-for="(s, idx) in sortedStandings"
          :key="s.teamId"
          class="standings-row"
          :class="{ 'standings-row-leader': idx === 0 }"
        >
          <span class="standings-rank">{{ s.rank }}</span>
          <span
            class="standings-avatar"
            :style="{ background: `linear-gradient(135deg, ${lookupTeam(s.teamId).avatarColor})` }"
          >
            <img
              v-if="lookupTeam(s.teamId).avatarUrl"
              :src="lookupTeam(s.teamId).avatarUrl"
              class="avatar-image"
              alt=""
            />
            <span v-else>{{ lookupTeam(s.teamId).ownerInitials }}</span>
          </span>
          <span class="standings-name">{{ stripEmoji(lookupTeam(s.teamId).name) }}</span>
          <span class="standings-record">{{ s.catWins }}-{{ s.catLosses }}{{ s.catTies > 0 ? `-${s.catTies}` : '' }}</span>
          <span
            class="standings-streak"
            :data-tone="s.streak.type === 'W' ? 'win' : s.streak.type === 'L' ? 'loss' : 'neutral'"
          >{{ s.streak.type !== 'T' ? `${s.streak.type}${s.streak.length}` : '—' }}</span>
        </li>
      </ol>

      <!-- Cellar callout — tightened to match the editorial weight of
           the content (single editorial line + a thin meta strip). -->
      <aside
        v-if="cellarTeam && cellarStanding"
        class="cellar-callout"
        aria-label="Cellar watch"
      >
        <span class="cellar-eyebrow">The cellar</span>
        <div class="cellar-body">
          <div
            class="cellar-avatar"
            :style="{ background: `linear-gradient(135deg, ${cellarTeam.avatarColor})` }"
          >
            <img v-if="cellarTeam.avatarUrl" :src="cellarTeam.avatarUrl" class="avatar-image" alt="" />
            <span v-else>{{ cellarTeam.ownerInitials }}</span>
          </div>
          <div class="cellar-text">
            <p class="cellar-caption">
              <strong>{{ stripEmoji(cellarTeam.name) }}</strong>
              <!-- "owns nothing" is unrecoverable for synthesized
                   issues — phrase it as plain bottom-of-the-ladder
                   instead so we don't claim per-cat data we don't
                   have. -->
              {{ data.synthesized
                ? 'sits at the bottom'
                : (cellarStanding.ownsCount === 0 ? 'owns nothing' : 'sits at the bottom') }}.
              <span v-if="cellarStanding.streak.type === 'L' && cellarStanding.streak.length >= 4">
                {{ cellarStanding.streak.length }} weeks deep in the cold.
              </span>
              <span v-else-if="!data.synthesized && cellarStanding.bleedingCount >= 5">
                Trailing in {{ cellarStanding.bleedingCount }} categories.
              </span>
              <span v-if="cellarStakes" class="cellar-caption-stakes">
                {{ cellarStakes }}
              </span>
            </p>
            <ul class="cellar-meta" role="list">
              <li><span class="cellar-meta-num">{{ cellarStanding.streak.type !== 'T' ? `${cellarStanding.streak.type}${cellarStanding.streak.length}` : '—' }}</span><span class="cellar-meta-lbl">streak</span></li>
              <!-- Per-cat ownership chips hidden on synthesized
                   issues — those numbers aren't reconstructable
                   from match history. -->
              <template v-if="!data.synthesized">
                <li><span class="cellar-meta-num">{{ cellarStanding.ownsCount }}</span><span class="cellar-meta-lbl">owns</span></li>
                <li><span class="cellar-meta-num">{{ cellarStanding.bleedingCount }}</span><span class="cellar-meta-lbl">trailing</span></li>
              </template>
            </ul>
          </div>
        </div>
      </aside>
    </section>

    <!-- ─── 02 — MATCHUPS ────────────────────────────────────────
         "Game of the week" feature spread. Picks the most decisive
         result from the just-finished week (highest cat-margin) as
         the marquee. Smaller capsules for the rest of the league
         underneath. Full sortable view lives in /matchups.
    ──────────────────────────────────────────────────────────────── -->
    <section
      v-if="gameOfTheWeek"
      id="section-matchups"
      class="section"
      aria-labelledby="section-matchups-heading"
    >
      <header class="section-head">
        <p class="section-eyebrow">02 — Matchups</p>
        <h2 class="section-headline" id="section-matchups-heading">Game of the week.</h2>
      </header>

      <article class="game" :aria-label="`Featured matchup: ${stripEmoji(lookupTeam(gameOfTheWeek.winnerId).name)} over ${stripEmoji(lookupTeam(gameOfTheWeek.loserId).name)}`">
        <div class="game-teams">
          <div class="game-team game-team-winner">
            <div
              class="game-team-avatar"
              :style="{ background: `linear-gradient(135deg, ${lookupTeam(gameOfTheWeek.winnerId).avatarColor})` }"
            >
              <img v-if="lookupTeam(gameOfTheWeek.winnerId).avatarUrl" :src="lookupTeam(gameOfTheWeek.winnerId).avatarUrl" class="avatar-image" alt="" />
              <span v-else>{{ lookupTeam(gameOfTheWeek.winnerId).ownerInitials }}</span>
            </div>
            <div class="game-team-text">
              <p class="game-team-name">{{ stripEmoji(lookupTeam(gameOfTheWeek.winnerId).name) }}</p>
              <p class="game-team-record">Winner · {{ gameOfTheWeek.winnerCats }} {{ gameOfTheWeek.winnerCats === 1 ? 'cat' : 'cats' }}</p>
            </div>
          </div>
          <span class="game-vs" aria-hidden="true">vs</span>
          <div class="game-team game-team-loser">
            <div
              class="game-team-avatar"
              :style="{ background: `linear-gradient(135deg, ${lookupTeam(gameOfTheWeek.loserId).avatarColor})` }"
            >
              <img v-if="lookupTeam(gameOfTheWeek.loserId).avatarUrl" :src="lookupTeam(gameOfTheWeek.loserId).avatarUrl" class="avatar-image" alt="" />
              <span v-else>{{ lookupTeam(gameOfTheWeek.loserId).ownerInitials }}</span>
            </div>
            <div class="game-team-text">
              <p class="game-team-name">{{ stripEmoji(lookupTeam(gameOfTheWeek.loserId).name) }}</p>
              <p class="game-team-record">{{ gameOfTheWeek.loserCats }} {{ gameOfTheWeek.loserCats === 1 ? 'cat' : 'cats' }}</p>
            </div>
          </div>
        </div>
        <p class="game-summary">{{ gameOfTheWeek.summary }}</p>
      </article>

      <aside v-if="aroundTheLeague.length > 0" class="around" aria-label="Around the league">
        <p class="around-label">Around the league</p>
        <ul class="around-list" role="list">
          <li v-for="cap in aroundTheLeague" :key="cap.id" class="around-item">
            <span class="around-score">{{ cap.winnerCats }}-{{ cap.loserCats }}</span>
            <span class="around-text">
              <strong>{{ stripEmoji(lookupTeam(cap.winnerId).name) }}</strong>
              over {{ stripEmoji(lookupTeam(cap.loserId).name) }}
            </span>
          </li>
        </ul>
        <div v-if="closestCall" class="close-call" role="note">
          <p class="close-call-label">Closest call</p>
          <p class="close-call-body">
            <strong>{{ stripEmoji(lookupTeam(closestCall.winnerId).name) }}</strong>
            over {{ stripEmoji(lookupTeam(closestCall.loserId).name) }},
            {{ closestCall.winnerCats }}-{{ closestCall.loserCats }}.
            <span class="close-call-tag">{{
              closestCall.winnerCats - closestCall.loserCats === 1
                ? 'Decided by one cat.'
                : 'Split the categories down the middle.'
            }}</span>
          </p>
        </div>
        <p class="around-link-line">
          <router-link :to="`/leagues/${routeLeagueId}/matchups`">
            Open the full matchups view →
          </router-link>
        </p>
      </aside>
    </section>

    <!-- ─── 03 — DRAFT (week-aware) ──────────────────────────────
         Early weeks: prominent. Mid-season: compact retrospective.
         Late season: hidden. Player-level retrospective ("how the
         picks have aged") requires per-player performance data — see
         docs/player-events-scope.md for that spike. For V0 this
         section orients the reader and hands off to the full draft
         board.
    ──────────────────────────────────────────────────────────────── -->
    <section
      v-if="showDraftSection"
      id="section-draft"
      class="section"
      aria-labelledby="section-draft-heading"
    >
      <header class="section-head">
        <p class="section-eyebrow">{{ draftSectionNumber }} — Draft</p>
        <h2 class="section-headline" id="section-draft-heading">
          {{ draftHeadline }}
        </h2>
        <p class="section-sub">
          {{ draftBody }}
          <router-link :to="`/leagues/${routeLeagueId}/draft`">
            {{ draftLinkLabel }} →
          </router-link>
        </p>
      </header>
    </section>

    <!-- ─── DEPARTMENTS (renumbered when Draft is shown) ───────── -->
    <section
      v-if="displayedDepartmentCards.length"
      id="section-departments"
      class="section"
      aria-labelledby="section-departments-heading"
    >
      <header class="section-head">
        <p class="section-eyebrow">{{ departmentsSectionNumber }} — Departments</p>
        <h2 class="section-headline" id="section-departments-heading">Quick reads.</h2>
      </header>
      <div class="departments-grid" role="list">
        <article
          v-for="pill in displayedDepartmentCards"
          :key="pill.key"
          class="department-card"
          role="listitem"
        >
          <p class="department-label">{{ pill.label }}</p>
          <p class="department-value">{{ pill.value }}</p>
        </article>
      </div>
    </section>

    <!-- ─── CHRONICLES TEASE — multi-season cross-link ─────────── -->
    <aside v-if="showChroniclesTease && chroniclesTease" class="chronicles-tease" aria-label="This week in league history">
      <p class="chronicles-tease-eyebrow">This week, in the league's history</p>
      <p class="chronicles-tease-body">{{ chroniclesTease }}</p>
      <router-link :to="`/leagues/${routeLeagueId}/history`" class="chronicles-tease-link">
        Read more in Chronicles →
      </router-link>
    </aside>

    <!-- ─── FOOTER — end of issue ───────────────────────────────── -->
    <footer class="issue-footer">
      <p class="issue-footer-end">End of Issue {{ issueNumber }}</p>
      <p class="issue-footer-tagline">
        The League Beat · Your league story, chronicled.
      </p>
      <p v-if="data.synthesized" class="issue-footer-reconstructed">
        Reconstructed from platform data.
        Per-cat ownership numbers and live transactions aren't included.
      </p>
      <!-- Archive nav. Each prev/next link points at a real frozen
           snapshot stored in `league_issues`. Earliest-issue prev
           is rendered as a non-link disabled chip; latest-issue
           next is hidden entirely (the "Latest ▶" treatment used
           to read as recursive). -->
      <nav
        v-if="routeLeagueId"
        class="issue-footer-archive"
        aria-label="Issue archive navigation"
      >
        <router-link
          v-if="hasPrevIssue"
          :to="prevIssueLink()"
          class="issue-footer-archive-btn"
          :aria-label="`Read Issue ${issueNumber - 1}`"
        >
          ◀ Issue {{ issueNumber - 1 }}
        </router-link>
        <span
          v-else
          class="issue-footer-archive-btn issue-footer-archive-btn-disabled"
          aria-label="No earlier issue"
        >
          ◀ Issue 0
        </span>
        <span class="issue-footer-archive-sep" aria-hidden="true">·</span>
        <span class="issue-footer-archive-now">Issue {{ issueNumber }}</span>
        <span class="issue-footer-archive-sep" aria-hidden="true">·</span>
        <router-link
          v-if="hasNextIssue"
          :to="nextIssueLink()"
          class="issue-footer-archive-btn"
          :aria-label="`Read Issue ${issueNumber + 1}`"
        >
          Issue {{ issueNumber + 1 }} ▶
        </router-link>
      </nav>
    </footer>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, shallowRef, watch } from 'vue'
import { useRoute } from 'vue-router'
import { renderPRPage, type RenderedPRCopy } from '@/editorial/render-pr'
import { detectCoverStory } from '@/editorial/cover-story'
import { categoriesFixtureToLeagueData } from '@/editorial/fixtureAdapter'
import { sleeperLeagueToCategoryData } from '@/editorial/adapters/sleeperAdapter'
import { espnLeagueToCategoryData } from '@/editorial/adapters/espnAdapter'
import { yahooLeagueToCategoryData } from '@/editorial/adapters/yahooAdapter'
import type { CategoryLeagueData } from '@/editorial/types'
import { useLeaguesStore } from '@/stores/leaguesNew'
import { useIssueStore } from '@/stores/issueState'
import { usePlatformsStore } from '@/stores/platforms'
import { deriveSeasonStage } from '@/editorial/detection/helpers'
import { stripEmojiForEditorial } from '@/editorial/detect-lede'
import LiveLoadError from '@/components/demo/LiveLoadError.vue'
import { getTeam } from '@/fixtures/categoriesLeague'
import { readIssueSnapshot, writeIssueSnapshot } from '@/services/issueArchive'
import { synthesizeIssue, canSynthesizeIssue } from '@/editorial/synthesizeIssue'

defineEmits<{ (e: 'open-signup'): void }>()

const route = useRoute()
const leaguesStore = useLeaguesStore()
const issueStore = useIssueStore()

/* ─────────────────────────────────────────────────────────────────
   LIVE DATA — same pattern as BeatFeedView. Fixture is the default;
   live league data swaps in when a leagueId resolves.
───────────────────────────────────────────────────────────────── */

const fixtureData = categoriesFixtureToLeagueData()
const liveData = shallowRef<CategoryLeagueData | null>(null)
const liveError = ref<string | null>(null)
const liveLoading = ref(false)

const routeLeagueId = computed(
  () => (route.params.leagueId as string | undefined) ?? '',
)

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

/** Editorial-voice copy for the loading state. Avoids the
 *  "LOADING YAHOO ISSUE…" string the previous copy used, which
 *  parsed as "there's an issue loading Yahoo" — the word "issue"
 *  collides between the magazine sense and the SaaS sense. We
 *  name the issue number explicitly when the URL specifies one,
 *  and fall back to "this week's issue" for the latest. */
const loadingTitle = computed(() => {
  const archived = route.params.weekNumber
  if (typeof archived === 'string' && archived.length > 0) {
    const parsed = parseInt(archived, 10)
    if (Number.isFinite(parsed) && parsed >= 1) return `Setting Issue ${parsed} for press.`
  }
  return `Setting this week's issue for press.`
})
const loadingSubline = computed(() => {
  const league = strictLeagueRecord.value?.league_name
  if (league) return `Pulling ${league} from ${platformLabel.value}.`
  return `Pulling the week's results from ${platformLabel.value}.`
})

const data = computed<CategoryLeagueData>(() => liveData.value ?? fixtureData)

/* ─────────────────────────────────────────────────────────────────
   EDITORIAL PIPELINE
───────────────────────────────────────────────────────────────── */

/** Run the editorial pipeline on the raw data so detection (quick
 *  reads, etc.) sees the full season history. The cover body's "Week
 *  N" references are post-processed to match the issue number
 *  (currentWeek - 1) — see liveHeroForIssue below. */
const rawPR = computed<RenderedPRCopy>(() => renderPRPage(data.value))

/** Cover-story winner — picked from a wider candidate pool than the
 *  LADDER empty-hero alone. THRONE_CHANGE / WILD_ARC / CELLAR_LOCK /
 *  RACE_FINALE / DYNASTY_LOCK all compete for the cover; LEADER_HOLD
 *  is the baseline that wins only when nothing else fires. */
const coverWinner = computed(() => detectCoverStory(data.value))

/** The cover hero as rendered for display. When the cover-story
 *  detector produces a winner, we use its prebuilt copy directly.
 *  When it doesn't (rare — the LEADER_HOLD candidate is a baseline
 *  that almost always fires), we fall back to the rawPR hero with a
 *  week-label substitution. */
const issueHero = computed(() => {
  const winner = coverWinner.value
  const inProgress = data.value.currentWeek
  const displayed = issueWeek.value
  if (winner) {
    return {
      eyebrow: winner.eyebrow,
      headline: winner.headline,
      body: winner.body,
      statChips: winner.chips.map(([value, label]) => ({ value, label })),
      kicker: '',
      teamId: winner.teamId,
      opponentTeamId: winner.opponentTeamId,
    }
  }
  const hero = rawPR.value.hero
  if (!hero) return hero
  if (inProgress === displayed) return hero
  const wkPattern = new RegExp(`\\bWeek ${inProgress}\\b`, 'g')
  return {
    ...hero,
    body: hero.body.replace(wkPattern, `Week ${displayed}`),
    headline: hero.headline.replace(wkPattern, `Week ${displayed}`),
  }
})

const livePR = computed<RenderedPRCopy>(() => ({
  ...rawPR.value,
  hero: issueHero.value,
}))

const leagueName = computed(
  () => strictLeagueRecord.value?.league_name ?? data.value.leagueName ?? 'Your league',
)

// Issue number resolves from the URL (`/the-issue/:weekNumber`) when
// present, else defaults to the most recently published issue
// (currentWeek - 1). V0 renders the same live data for every week —
// past-issue persistence lands in V1 — but the route structure is in
// place now so prev/next nav and shareable archive URLs work.
const issueNumber = computed(() => {
  const raw = route.params.weekNumber
  if (typeof raw === 'string' && raw.length > 0) {
    const parsed = parseInt(raw, 10)
    if (Number.isFinite(parsed) && parsed >= 1) return parsed
  }
  return Math.max(1, data.value.currentWeek - 1)
})
const issueWeek = computed(() => issueNumber.value)
/** True when the active route shows an explicit past issue rather
 *  than the latest. Drives the "(viewing archive)" affordance and
 *  affects how the cover body's week labels are post-processed. */
const isArchiveRoute = computed(() => typeof route.params.weekNumber === 'string')
/** Latest published issue number — even when viewing an archived
 *  one, we expose this so the "next" button can navigate forward
 *  toward the latest, and to know whether the user is on the most
 *  recent issue (no "next" available).
 *
 *  Order of preference:
 *   1. issueStore.currentWeek — populated by the live adapter path
 *      (real-time truth, but null on first load of an archive URL).
 *   2. strictLeagueRecord.settings.current_week — Supabase-cached
 *      copy of the league's current week, present whenever the
 *      league row is loaded (works even on first archive page-load).
 *   3. data.currentWeek — last-resort fallback. SAFE only when the
 *      data isn't synthesized: synth's currentWeek is the synthetic
 *      "weekN + 1", which would make "latest" resolve to the very
 *      archive being viewed and hide the forward arrow. */
const latestIssueNumber = computed(() => {
  if (issueStore.currentWeek != null) {
    return Math.max(1, issueStore.currentWeek - 1)
  }
  const cached = strictLeagueRecord.value?.settings?.current_week
  if (typeof cached === 'number' && cached >= 1) {
    return Math.max(1, cached - 1)
  }
  if (data.value.synthesized) {
    // Without store or cache, we still know at least one issue exists
    // past the synthesized one (we wouldn't have synthesized it
    // otherwise). Return issueNumber + 1 as a safe floor.
    return issueNumber.value + 1
  }
  return Math.max(1, data.value.currentWeek - 1)
})

const coverTeam = computed(() => {
  const id = livePR.value.hero?.teamId
  if (!id) return null
  return lookupTeam(id)
})

const sortedStandings = computed(() =>
  [...data.value.standings].sort((a, b) => a.rank - b.rank),
)

/** Editorial lede for the Power Rankings section. Reads the SHAPE
 *  of the standings — leader's separation, middle pack
 *  compression, cellar gap — and writes one short paragraph the
 *  reader can scan before the table. Without it, the section was
 *  a bare leaderboard; with it, the table has narrative context.
 *  Returns null when we can't say something useful (very small
 *  leagues, or freshly-tied standings). */
const prCommentary = computed<string | null>(() => {
  const sorted = sortedStandings.value
  if (sorted.length < 4) return null

  const leader = sorted[0]
  const second = sorted[1]
  const cellar = sorted[sorted.length - 1]
  const secondToLast = sorted[sorted.length - 2]
  const leaderName = stripEmoji(lookupTeam(leader.teamId).name)
  const cellarName = stripEmoji(lookupTeam(cellar.teamId).name)

  const leaderLead = leader.catWins - second.catWins
  const cellarGap = secondToLast.catWins - cellar.catWins

  // Middle cluster — how many consecutive teams below the leader
  // sit within 5 cats of each other. Captures the "the chase pack
  // is tight" story when present. Math.abs because standings are
  // sorted by winPct, and a lower-ranked team can have more raw
  // catWins (different decision counts across the season). Without
  // abs, a negative gap silently satisfied `<= 5` and inflated the
  // cluster count.
  let middleCluster = 0
  for (let i = 1; i < sorted.length - 1; i++) {
    if (Math.abs(sorted[i].catWins - sorted[i + 1].catWins) <= 5) {
      middleCluster++
    } else {
      break
    }
  }

  // Tight chase pair — #2 and #3 within 2 cats of each other and
  // separated from #4 by a real gap. Names the pursuit so the lede
  // doesn't skip from "leader" straight to "cellar" when there's a
  // genuine race underneath. Captures the story the previous version
  // missed when middleCluster was only 1.
  //
  // ALSO Math.abs: same reason as middleCluster. ESPN issue 9 case
  // had Dem Bums (#2, 93-71) and Port Angeles (#3, 97-78). Subtracting
  // raw wins gave -4, which printed as "chase -4 cats apart" before
  // this fix.
  const third = sorted[2]
  const fourth = sorted[3]
  const chasePairGap = Math.abs(second.catWins - third.catWins)
  const chasePairBreakaway = Math.abs(third.catWins - fourth.catWins)
  const tightChasePair =
    chasePairGap <= 2 && chasePairBreakaway >= 4
      ? {
          firstName: stripEmoji(lookupTeam(second.teamId).name),
          secondName: stripEmoji(lookupTeam(third.teamId).name),
          gap: chasePairGap,
        }
      : null

  const parts: string[] = []
  if (leaderLead >= 15) {
    parts.push(`${leaderName} leads by ${leaderLead} cats — a separation that's hardened into a tier of its own.`)
  } else if (leaderLead >= 7) {
    parts.push(`${leaderName} carries a ${leaderLead}-cat lead over the chasers.`)
  } else if (leaderLead >= 3) {
    parts.push(`${leaderName} sits on top by ${leaderLead} cats — close enough that the chasers can still see them.`)
  } else if (leaderLead >= 1) {
    parts.push(`${leaderName} holds the top by ${leaderLead}.`)
  } else {
    parts.push(`The top is a coin flip.`)
  }

  // Order matters: a tight chase pair is the story when present —
  // takes precedence over the broader "cluster" or "middle thins"
  // framing because it names the pursuit specifically.
  if (tightChasePair) {
    if (tightChasePair.gap === 0) {
      // Special case: "chase tied in pursuit" parses as malformed.
      // Use a separate verb so the sentence holds together.
      parts.push(`${tightChasePair.firstName} and ${tightChasePair.secondName} are tied in pursuit.`)
    } else {
      const gapWord =
        tightChasePair.gap === 1 ? '1 cat apart' : `${tightChasePair.gap} cats apart`
      parts.push(`${tightChasePair.firstName} and ${tightChasePair.secondName} chase ${gapWord} in pursuit.`)
    }
  } else if (middleCluster >= 4) {
    parts.push(`Below the leader, ${middleCluster + 1} teams cluster within striking distance of each other.`)
  } else if (middleCluster >= 2) {
    parts.push(`Below, the middle thins out fast.`)
  }

  if (cellarGap >= 8) {
    parts.push(`${cellarName} sits ${cellarGap} cats adrift at the bottom.`)
  }

  return parts.join(' ')
})

const hasPrevIssue = computed(() => issueNumber.value > 1)
const hasNextIssue = computed(() => issueNumber.value < latestIssueNumber.value)

function prevIssueLink() {
  return `/leagues/${routeLeagueId.value}/the-issue/${issueNumber.value - 1}`
}
function nextIssueLink() {
  const next = issueNumber.value + 1
  // If "next" equals the latest, route to the canonical /the-issue
  // URL (no week param) so the latest issue lives at one URL.
  if (next === latestIssueNumber.value) {
    return `/leagues/${routeLeagueId.value}/the-issue`
  }
  return `/leagues/${routeLeagueId.value}/the-issue/${next}`
}

/* ─────────────────────────────────────────────────────────────────
   DRAFT SECTION — week-aware visibility
   Weeks 1-3: prominent. Weeks 4-7: compact retrospective. Weeks 8+:
   hidden unless something newsworthy fires (deferred — needs player
   performance data). Section numbering stays consistent: when Draft
   appears it's 03 and Departments becomes 04; otherwise Departments
   stays at 03.
───────────────────────────────────────────────────────────────── */

const showDraftSection = computed(() => {
  const wk = issueWeek.value
  return wk >= 1 && wk <= 7
})

const draftSectionNumber = computed(() => '03')
const departmentsSectionNumber = computed(() => showDraftSection.value ? '04' : '03')

const draftHeadline = computed(() => {
  const wk = issueWeek.value
  if (wk <= 1) return `The draft, in the rearview.`
  if (wk <= 3) return `Three weeks in. How the picks are aging.`
  return `${wk} weeks later, the draft revisited.`
})

const draftBody = computed(() => {
  const wk = issueWeek.value
  if (wk <= 1) return `The week-one picture is starting to take shape. Best picks, the steal of the night, the early bust.`
  if (wk <= 3) return `Three weeks of evidence. Some picks are paying off; others aren't.`
  return `Enough sample size to see who's earned their draft slot and who hasn't.`
})

const draftLinkLabel = computed(() => {
  const wk = issueWeek.value
  if (wk <= 3) return `See the full draft board`
  return `Open the draft board`
})

/* ─────────────────────────────────────────────────────────────────
   CHRONICLES TEASE
   Multi-season insight. Hidden when this is the league's first
   season (no Chronicles data to pull from). For V0 the copy is
   league-agnostic; V1 pulls a real cross-season insight (e.g.
   "Two seasons ago, the cellar at L8 finished 3rd").
───────────────────────────────────────────────────────────────── */

const showChroniclesTease = computed(() => {
  const history = data.value.seasonHistory ?? []
  return history.length >= 1
})

const chroniclesTease = computed(() => {
  const history = data.value.seasonHistory ?? []
  if (history.length === 0) return null
  // Surface the most recent prior season's champion as the tease.
  // When the champion name is missing, skip the named sentence — the
  // fallback ("Last season's champion won it all in 2025") reads as
  // tautological and signals missing data to the reader.
  const sorted = [...history].sort((a, b) => b.year - a.year)
  const last = sorted[0]
  if (!last.championName) {
    return `Past champions, records, and dynasties live in Chronicles.`
  }
  return `${last.championName} won it all in ${last.year}. Past champions, records, and dynasties live in Chronicles.`
})

const cellarStanding = computed(() => {
  const sorted = [...data.value.standings].sort((a, b) => b.rank - a.rank)
  const last = sorted[0]
  if (!last) return null
  const lStreak = last.streak.type === 'L' ? last.streak.length : 0
  const cold = last.ownsCount === 0 || lStreak >= 4 || last.bleedingCount >= 5
  return cold ? last : null
})

const cellarTeam = computed(() => {
  const id = cellarStanding.value?.teamId
  return id ? lookupTeam(id) : null
})

/** Forward-looking stakes line for the cellar callout. Distance
 *  from the playoff cutline, framed as cat-record. Falls silent
 *  when the math isn't clean (no cutline known, or cutline team
 *  not in standings — should be rare). The cellar block was
 *  reading as pure observation before; this gives it consequence. */
const cellarStakes = computed<string | null>(() => {
  const last = cellarStanding.value
  if (!last) return null
  const cutoff = data.value.playoffCutoff
  if (!cutoff || cutoff <= 0) return null
  const sorted = [...data.value.standings].sort((a, b) => a.rank - b.rank)
  // The team currently on the playoff bubble (last in, first out).
  const cutlineTeam = sorted[cutoff - 1]
  if (!cutlineTeam) return null
  const winsBehind = cutlineTeam.catWins - last.catWins
  if (winsBehind <= 0) {
    // Cellar is somehow inside the cut — silence the stakes line.
    return null
  }
  // Weeks remaining drives the framing: late season = "math has run
  // out"; early-mid = required pace to climb.
  const endWeek = data.value.regularSeasonEndWeek
  const week = data.value.currentWeek
  const weeksLeft = endWeek != null ? Math.max(0, endWeek - week) : null
  if (winsBehind >= 30 || (weeksLeft != null && winsBehind > weeksLeft * 7)) {
    return `Mathematically out — the playoff math has closed.`
  }
  if (weeksLeft != null && weeksLeft <= 4) {
    return `${winsBehind} cats behind the playoff cutline with ${weeksLeft} ${weeksLeft === 1 ? 'week' : 'weeks'} left.`
  }
  return `${winsBehind} cats behind the playoff cutline.`
})

/* ─────────────────────────────────────────────────────────────────
   GAME OF THE WEEK + AROUND THE LEAGUE
   Pick the marquee matchup from the just-finished week's results.
   The marquee is the matchup with the highest absolute cat-margin
   (the most decisive result tends to be the story of the week).
   Around-the-league = every other matchup as a one-line capsule.
───────────────────────────────────────────────────────────────── */

interface GameOfTheWeek {
  matchupId: string
  winnerId: string
  loserId: string
  winnerCats: number
  loserCats: number
  summary: string
}

const previousMatchups = computed(() => data.value.matchupsPreviousWeek ?? [])

/** Standings rank lookup — the matchup payload doesn't carry ranks,
 *  but the editorial summary needs them to detect upsets ("the #8
 *  beat the #2") that are way more newsworthy than the raw margin. */
function rankOf(teamId: string): number | null {
  const s = data.value.standings.find((x) => x.teamId === teamId)
  return s ? s.rank : null
}

const gameOfTheWeek = computed<GameOfTheWeek | null>(() => {
  const finals = previousMatchups.value.filter((m) => m.status === 'final')
  if (finals.length === 0) return null
  // Score each final on a "newsworthiness" axis that mixes margin
  // and upset-magnitude — a #7 beating a #1 by 1 cat is a bigger
  // story than #1 beating #10 by 9. Sort by that, biggest first.
  const scored = finals.map((m) => {
    const homeWin = m.homeCatWins > m.awayCatWins
    const winnerId = homeWin ? m.homeTeamId : m.awayTeamId
    const loserId = homeWin ? m.awayTeamId : m.homeTeamId
    const margin = Math.abs(m.homeCatWins - m.awayCatWins)
    const winnerRank = rankOf(winnerId)
    const loserRank = rankOf(loserId)
    // Upset weight: how many spots higher is the loser than the
    // winner. Positive = upset; 0 or negative = chalk.
    const upsetSpread =
      winnerRank != null && loserRank != null ? winnerRank - loserRank : 0
    // Score: margin + 2x upset weight (when positive). Pure chalk
    // blowouts still surface; pure upsets surface too.
    const score = margin + (upsetSpread > 0 ? upsetSpread * 2 : 0)
    return { m, winnerId, loserId, margin, upsetSpread, score }
  })
  scored.sort((a, b) => b.score - a.score)
  const top = scored[0]
  const m = top.m
  const homeWin = m.homeCatWins > m.awayCatWins
  const winnerCats = homeWin ? m.homeCatWins : m.awayCatWins
  const loserCats = homeWin ? m.awayCatWins : m.homeCatWins
  const margin = top.margin
  const winnerName = stripEmoji(lookupTeam(top.winnerId).name)
  const loserName = stripEmoji(lookupTeam(top.loserId).name)
  const winnerRank = rankOf(top.winnerId)
  const loserRank = rankOf(top.loserId)

  // Pick a lede. Upset takes priority — a top-half team losing to a
  // bottom-half team is the story of the week even when the margin
  // is modest. Otherwise the lede is margin-driven, same shape as
  // before but with sharper copy.
  let lede: string
  if (top.upsetSpread >= 4) {
    // Clear upset — name the rank story explicitly.
    lede = `${winnerName}, the #${winnerRank}, took down the #${loserRank} ${loserName} ${winnerCats}-${loserCats}.`
  } else if (margin >= 7) {
    lede = `${winnerName} swept the week from ${loserName}, ${winnerCats}-${loserCats}.`
  } else if (margin >= 4) {
    lede = `${winnerName} handled ${loserName} across the categories, ${winnerCats}-${loserCats}.`
  } else if (margin === 1) {
    lede = `${winnerName} edged ${loserName} by a single cat, ${winnerCats}-${loserCats}.`
  } else {
    lede = `${winnerName} took the week from ${loserName}, ${winnerCats}-${loserCats}.`
  }

  // Stakes — a second sentence that names the consequence. We don't
  // have real "after this week" standings deltas in V0, so we lean
  // on shape: the size of the margin/upset and the current standings
  // position. Keeps it honest without fabricating numbers.
  // Half-line: in an N-team league, the boundary is N/2. A team is
  // "top-half" if rank ≤ half, "bottom-half" otherwise. The
  // "top-half lost to bottom-half" phrasing only fires when the
  // loser is clearly above and the winner clearly below; the #6
  // losing to #11 in a 12-team league reads as borderline, not
  // cross-half, so we use numeric framing there instead.
  const teamCount = data.value.teams.length || 12
  const half = teamCount / 2
  const isClearCrossHalfUpset =
    winnerRank != null && loserRank != null &&
    loserRank <= half - 0.5 && winnerRank >= half + 1.5

  let stakes = ''
  if (isClearCrossHalfUpset) {
    stakes = `A top-half name lost to a bottom-half one — the kind of result that bends the standings.`
  } else if (top.upsetSpread >= 4) {
    stakes = `The #${loserRank} falling to the #${winnerRank} reorders the middle of the ladder.`
  } else if (margin >= 7) {
    stakes = `The kind of margin that reshapes the standings.`
  } else if (margin >= 4 && winnerRank != null && winnerRank <= 3) {
    stakes = `Statement work from a contender.`
  } else if (margin === 1) {
    stakes = `Decided by the last cat to fall.`
  }

  const summary = stakes ? `${lede} ${stakes}` : lede

  return {
    matchupId: m.id,
    winnerId: top.winnerId,
    loserId: top.loserId,
    winnerCats,
    loserCats,
    summary,
  }
})

const aroundTheLeague = computed(() => {
  const marqueeId = gameOfTheWeek.value?.matchupId
  return previousMatchups.value
    .filter((m) => m.status === 'final' && m.id !== marqueeId)
    .map((m) => {
      const homeWin = m.homeCatWins > m.awayCatWins
      return {
        id: m.id,
        winnerId: homeWin ? m.homeTeamId : m.awayTeamId,
        loserId: homeWin ? m.awayTeamId : m.homeTeamId,
        winnerCats: homeWin ? m.homeCatWins : m.awayCatWins,
        loserCats: homeWin ? m.awayCatWins : m.homeCatWins,
      }
    })
    .sort((a, b) => (b.winnerCats - b.loserCats) - (a.winnerCats - a.loserCats))
    .slice(0, 5)
})

/** Closest call — the tightest non-marquee result. Surfaces a
 *  second narrative beat under Matchups (e.g. "Decided by 1 cat:
 *  Goof Juice over SVT") that the descending Around-the-League
 *  sort would otherwise bury or omit when there are 6+ matchups.
 *  Suppressed when the marquee was already the tightest. */
interface CloseCall {
  winnerId: string
  loserId: string
  winnerCats: number
  loserCats: number
}
const closestCall = computed<CloseCall | null>(() => {
  const marqueeId = gameOfTheWeek.value?.matchupId
  const finals = previousMatchups.value.filter(
    (m) => m.status === 'final' && m.id !== marqueeId,
  )
  if (finals.length === 0) return null
  const sorted = [...finals].sort((a, b) => {
    const ma = Math.abs(a.homeCatWins - a.awayCatWins)
    const mb = Math.abs(b.homeCatWins - b.awayCatWins)
    return ma - mb
  })
  const tightest = sorted[0]
  const margin = Math.abs(tightest.homeCatWins - tightest.awayCatWins)
  // Only show the callout when the margin actually is close. A 3-cat
  // gap doesn't read as "close call" — that's a normal matchup.
  if (margin > 2) return null
  const homeWin = tightest.homeCatWins > tightest.awayCatWins
  return {
    winnerId: homeWin ? tightest.homeTeamId : tightest.awayTeamId,
    loserId: homeWin ? tightest.awayTeamId : tightest.homeTeamId,
    winnerCats: homeWin ? tightest.homeCatWins : tightest.awayCatWins,
    loserCats: homeWin ? tightest.awayCatWins : tightest.homeCatWins,
  }
})

/* ─────────────────────────────────────────────────────────────────
   DEPARTMENTS — quick-reads pool + rotation.
   The PR pipeline contributes 4 fixed pills (TIGHTEST RACE, BIGGEST
   JUMP, LONGEST FALL, LONGEST STREAK). Showing the same 4 every
   week kills the magazine's variety, so we mix in 3 additional
   pills computed here (BLOWOUT, CAT KING, WEEK SWEEPER) and
   deterministically pick 4 of 7 per (leagueId, week) — the same
   reader sees the same mix every visit, different weeks rotate.
───────────────────────────────────────────────────────────────── */

interface DepartmentCard {
  /** Used as the rotation hash key — kept stable across weeks for
   *  the same kind so the seed picks correctly. */
  key: string
  label: string
  value: string
}

/** BLOWOUT — biggest single-matchup margin from the just-finished
 *  week. Suppressed when the margin is small (≤ 3 cats) so we
 *  don't claim a "blowout" that wasn't. */
const blowoutCard = computed<DepartmentCard | null>(() => {
  const finals = previousMatchups.value.filter((m) => m.status === 'final')
  if (finals.length === 0) return null
  const sorted = [...finals].sort((a, b) => {
    const ma = Math.abs(a.homeCatWins - a.awayCatWins)
    const mb = Math.abs(b.homeCatWins - b.awayCatWins)
    return mb - ma
  })
  const m = sorted[0]
  const margin = Math.abs(m.homeCatWins - m.awayCatWins)
  if (margin <= 3) return null
  const homeWin = m.homeCatWins > m.awayCatWins
  const winnerName = stripEmoji(
    lookupTeam(homeWin ? m.homeTeamId : m.awayTeamId).name,
  )
  const loserName = stripEmoji(
    lookupTeam(homeWin ? m.awayTeamId : m.homeTeamId).name,
  )
  return {
    key: 'blowout',
    label: 'Blowout of the week',
    value: `${winnerName} over ${loserName} by ${margin} cats.`,
  }
})

/** CAT KING — team owning (top-3 in) the most categories. The
 *  flip side of the cellar's "trailing in N categories" — names
 *  the most well-rounded roster in the league. */
const catKingCard = computed<DepartmentCard | null>(() => {
  const sorted = [...data.value.standings].sort(
    (a, b) => b.ownsCount - a.ownsCount,
  )
  const top = sorted[0]
  if (!top || top.ownsCount === 0) return null
  // Suppress when it's a tie at the top (no clear king).
  if (sorted[1] && sorted[1].ownsCount === top.ownsCount) return null
  const name = stripEmoji(lookupTeam(top.teamId).name)
  return {
    key: 'cat-king',
    label: 'Cat king',
    value: `${name} owns ${top.ownsCount} categories.`,
  }
})

/** WEEK SWEEPER — team that won the most cats across their
 *  matchup this week. Not the same as LONGEST STREAK (season-long)
 *  or BLOWOUT (margin) — this is "best single-week performance." */
const weekSweeperCard = computed<DepartmentCard | null>(() => {
  const finals = previousMatchups.value.filter((m) => m.status === 'final')
  if (finals.length === 0) return null
  let best: { teamId: string; cats: number } | null = null
  for (const m of finals) {
    if (m.homeCatWins > (best?.cats ?? -1)) {
      best = { teamId: m.homeTeamId, cats: m.homeCatWins }
    }
    if (m.awayCatWins > (best?.cats ?? -1)) {
      best = { teamId: m.awayTeamId, cats: m.awayCatWins }
    }
  }
  if (!best) return null
  // Need a meaningful single-week haul — 5 cats out of 11 isn't a
  // "week sweep." Threshold scales loosely with category count.
  const catCount = data.value.categories.length || 11
  if (best.cats < Math.ceil(catCount * 0.7)) return null
  const name = stripEmoji(lookupTeam(best.teamId).name)
  return {
    key: 'week-sweeper',
    label: 'Week sweeper',
    value: `${name} took ${best.cats} of ${catCount} cats this week.`,
  }
})

/** Combined pool — PR's 4 fixed pills + the up-to-3 extras
 *  computed above. Extras that don't fire (returned null) drop
 *  out, so the pool sometimes has fewer than 7. */
const departmentCardsPool = computed<DepartmentCard[]>(() => {
  const pillsFromPR: DepartmentCard[] = livePR.value.quickReads.map(
    (q, i) => ({ key: `pr-${q.label.toLowerCase().replace(/\s+/g, '-')}-${i}`, label: q.label, value: q.value }),
  )
  const extras = [
    blowoutCard.value,
    catKingCard.value,
    weekSweeperCard.value,
  ].filter((c): c is DepartmentCard => c !== null)
  return [...pillsFromPR, ...extras]
})

/** Seed-based rotation — the same (leagueId, week) always produces
 *  the same 4 cards, so a reader who refreshes sees consistency.
 *  Different weeks rotate the pool. When the pool has ≤4 entries
 *  we just show all of them. */
function hashSeed(s: string): number {
  let h = 5381
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h) ^ s.charCodeAt(i)
    h |= 0
  }
  return Math.abs(h)
}

const displayedDepartmentCards = computed<DepartmentCard[]>(() => {
  const pool = departmentCardsPool.value
  if (pool.length <= 4) return pool
  // Always include the PR-pipeline pills the editorial team
  // committed to (tightest race, etc.) — those are the anchor.
  // Then rotate the extras into the remaining slots.
  const anchored: DepartmentCard[] = []
  const rotatable: DepartmentCard[] = []
  for (const c of pool) {
    if (c.key.startsWith('pr-')) anchored.push(c)
    else rotatable.push(c)
  }
  // If anchored is already ≥4, take the first 4.
  if (anchored.length >= 4) return anchored.slice(0, 4)
  const slotsLeft = 4 - anchored.length
  if (rotatable.length <= slotsLeft) return [...anchored, ...rotatable]
  const seed = hashSeed(
    `${data.value.leagueId}:${issueWeek.value}`,
  )
  // Pick `slotsLeft` distinct rotatable cards using the seed as a
  // start index. Deterministic, repeatable.
  const picked: DepartmentCard[] = []
  for (let i = 0; i < slotsLeft; i++) {
    picked.push(rotatable[(seed + i) % rotatable.length])
  }
  return [...anchored, ...picked]
})

/* ─────────────────────────────────────────────────────────────────
   LOOKUPS
───────────────────────────────────────────────────────────────── */

function lookupTeam(teamId: string) {
  const t = liveData.value?.teams.find((x) => x.id === teamId)
  if (t) return t
  try {
    return getTeam(teamId)
  } catch {
    return {
      id: teamId,
      name: `Team ${teamId}`,
      ownerName: `Manager ${teamId}`,
      ownerInitials: teamId.slice(0, 2).toUpperCase(),
      avatarUrl: undefined,
      avatarColor: 'oklch(0.62 0.18 200), oklch(0.42 0.18 220)',
      isMyTeam: false,
    }
  }
}

function stripEmoji(name: string): string {
  return stripEmojiForEditorial(name) || name
}

/* ─────────────────────────────────────────────────────────────────
   LIVE DATA HYDRATION
───────────────────────────────────────────────────────────────── */

async function loadIssue() {
  if (isStrictLiveMode.value && leaguesStore.leagues.length === 0) {
    try {
      await leaguesStore.fetchLeagues()
    } catch (err) {
      console.warn('[IssueView] fetchLeagues failed:', err)
    }
  }

  // Reset prior render state — when navigating between issues the
  // component instance is reused, so stale liveData would otherwise
  // leak from the previous issue into the new one (the bug behind
  // "Issue 9 shows Issue 10 standings").
  liveData.value = null
  liveError.value = null

  const id = liveLeagueId.value
  const platform = livePlatform.value
  if (!id || (platform !== 'sleeper' && platform !== 'espn' && platform !== 'yahoo')) {
    // In strict live mode, an unresolved league record would leave
    // the loading guard spinning forever. Surface that as an error so
    // the user can refresh or reconnect, rather than silently masking
    // it with fixture content.
    if (isStrictLiveMode.value) {
      liveError.value =
        'This league couldn\'t be resolved. Try refreshing, or reconnect it from the home page.'
    }
    return
  }

  liveLoading.value = true
  liveError.value = null
  const leagueRowId =
    typeof route.params.leagueId === 'string' ? route.params.leagueId : undefined
  // Parse the archive route param. When set to a finite week ≥ 1
  // and STRICTLY past the current "latest" (resolved after the
  // adapter runs), we try the snapshot read first.
  const weekParam = route.params.weekNumber
  const archivedWeek =
    typeof weekParam === 'string' && parseInt(weekParam, 10) >= 1
      ? parseInt(weekParam, 10)
      : null
  const cachedSeason = parseSeasonYearFromLeague()

  try {
    // ─── Archive read path ──────────────────────────────────────
    // If the URL specifies a past week, try the snapshot first.
    // When it exists we render entirely from the snapshot and skip
    // the adapter — that's the whole point of the archive: a
    // frozen artifact, not a relabel of live data.
    if (archivedWeek != null && leagueRowId && cachedSeason != null) {
      const snap = await readIssueSnapshot(
        leagueRowId,
        cachedSeason,
        archivedWeek,
      )
      if (snap) {
        // Trust assessment. Two signals can make us trust the
        // snapshot for navigation:
        //  - looksLikeLive: snap.data.currentWeek > archivedWeek+1
        //    (post-fix snapshots persist the LIVE currentWeek).
        //  - cachedSaysLater: the cached league row's current_week
        //    is past archivedWeek+1 (independent confirmation that
        //    a later issue exists, even if the snapshot's metadata
        //    is stale).
        // When neither holds, the snapshot could either be (a) a
        // legitimate just-published archive (no forward arrow
        // correct) or (b) a pre-fix stale archive masking a
        // forward arrow that should exist. We can't tell from
        // metadata alone — fall through to the live adapter path,
        // which will re-synth and rewrite the snapshot with the
        // correct currentWeek. One slow load per stale snapshot,
        // then fast forever after.
        const looksLikeLive = snap.data.currentWeek > archivedWeek + 1
        const cachedLiveWeek =
          strictLeagueRecord.value?.settings?.current_week
        const cachedSaysLater =
          typeof cachedLiveWeek === 'number' &&
          cachedLiveWeek > archivedWeek + 1
        const trustSnapshot = looksLikeLive || cachedSaysLater

        if (trustSnapshot) {
          // For rendering: force currentWeek to the synthetic
          // "weekN + 1" value. The editorial pipeline (cover body,
          // PR commentary) uses `currentWeek - 1` to label the
          // week just played. Post-fix snapshots store the LIVE
          // currentWeek so navigation knows where "latest" sits;
          // without this override the cover body for Issue 9
          // would read "Week 10" instead of "Week 9".
          liveData.value = { ...snap.data, currentWeek: archivedWeek + 1 }
          const historyYears = (snap.data.seasonHistory ?? [])
            .map((s) => s.year)
            .filter((y): y is number => Number.isFinite(y))
          const foundedFromHistory = historyYears.length > 0
            ? Math.min(snap.data.currentSeason, ...historyYears)
            : snap.data.currentSeason
          const storeWeek = looksLikeLive
            ? snap.data.currentWeek
            : (cachedLiveWeek as number) // cachedSaysLater branch
          issueStore.setIssue({
            currentWeek: storeWeek,
            currentSeason: snap.data.currentSeason,
            regularSeasonEndWeek: snap.data.regularSeasonEndWeek,
            seasonStage: deriveSeasonStage(storeWeek, snap.data.regularSeasonEndWeek),
            leagueFoundedSeason: foundedFromHistory,
            lastUpdated: snap.publishedAt,
          })
          liveLoading.value = false
          return
        }
        // Snapshot exists but we can't trust its navigation
        // metadata — drop through to the live adapter, which will
        // overwrite the stale row.
      }
      // Snapshot miss — we'll fall through to the adapter so we can
      // (a) decide whether this archived week is actually too old to
      // recover, or (b) just use live data when archivedWeek happens
      // to equal currentWeek - 1 (the latest published).
    }

    // ─── Live adapter path ─────────────────────────────────────
    const opts = {
      userIdentity: collectUserIdentity(),
      leagueRowId,
    }
    const adapted =
      platform === 'espn'
        ? await espnLeagueToCategoryData(id, opts)
        : platform === 'yahoo'
        ? await yahooLeagueToCategoryData(id, opts)
        : await sleeperLeagueToCategoryData(id, opts)

    // Archived week deeper than the just-published one: no snapshot
    // exists, but we may still be able to reconstruct it from the
    // adapter's per-week match history. Try synthesis first; only
    // surface "isn't archived yet" when the data we'd need is gone.
    if (
      archivedWeek != null &&
      archivedWeek < adapted.currentWeek - 1
    ) {
      if (canSynthesizeIssue(adapted, archivedWeek)) {
        const synth = synthesizeIssue(adapted, archivedWeek)
        if (synth) {
          liveData.value = synth
          // Publish the LIVE adapter's currentWeek to the store —
          // NOT the synth's synthetic `weekN + 1`. The synth value
          // would make `latestIssueNumber` resolve to the very
          // archive being viewed and hide the forward arrow. The
          // masthead is route-aware (uses URL `:weekNumber` when
          // archive routes), so it still renders the right "ISSUE N"
          // label; the store just needs to know the real latest.
          const historyYears = (adapted.seasonHistory ?? [])
            .map((s) => s.year)
            .filter((y): y is number => Number.isFinite(y))
          const foundedFromHistory = historyYears.length > 0
            ? Math.min(adapted.currentSeason, ...historyYears)
            : adapted.currentSeason
          issueStore.setIssue({
            currentWeek: adapted.currentWeek,
            currentSeason: adapted.currentSeason,
            regularSeasonEndWeek: adapted.regularSeasonEndWeek,
            seasonStage: deriveSeasonStage(adapted.currentWeek, adapted.regularSeasonEndWeek),
            leagueFoundedSeason: foundedFromHistory,
            lastUpdated: new Date(),
          })
          // Persist the reconstruction so the next reader skips
          // synthesis altogether. Idempotent — wins the race only
          // on the first save.
          //
          // IMPORTANT: override the synth's currentWeek with the
          // LIVE adapter value before writing. synth.currentWeek
          // is the synthetic "weekN + 1" used for in-memory render
          // math; persisting it would clobber navigation — the
          // next reader would resolve "latest issue" to the very
          // archive being viewed and hide the forward arrow. The
          // editorial pipeline still renders correctly on read
          // because the reader patches currentWeek back to the
          // synthetic value before assigning to liveData.
          if (leagueRowId) {
            void writeIssueSnapshot(
              leagueRowId,
              synth.currentSeason,
              archivedWeek,
              { ...synth, currentWeek: adapted.currentWeek },
            )
          }
          liveLoading.value = false
          return
        }
      }
      liveError.value = `Issue ${archivedWeek} can't be reconstructed — the platform no longer exposes the per-week match data we'd need.`
      liveLoading.value = false
      return
    }

    liveData.value = adapted
    // Founded year — prefer the platform-API truth from seasonHistory
    // over the conservative connected-leagues estimate. The latter
    // reports Vol. 1 for every league whose prior seasons the user
    // never connected to TLB as separate rows; the former knows about
    // every season the platform records, so it's the better anchor
    // when present.
    const historyYears = (adapted.seasonHistory ?? [])
      .map((s) => s.year)
      .filter((y): y is number => Number.isFinite(y))
    const foundedFromHistory = historyYears.length > 0
      ? Math.min(adapted.currentSeason, ...historyYears)
      : adapted.currentSeason
    issueStore.setIssue({
      currentWeek: adapted.currentWeek,
      currentSeason: adapted.currentSeason,
      regularSeasonEndWeek: adapted.regularSeasonEndWeek,
      seasonStage: deriveSeasonStage(adapted.currentWeek, adapted.regularSeasonEndWeek),
      leagueFoundedSeason: foundedFromHistory,
      lastUpdated: new Date(),
    })

    // ─── Snapshot write — lazy, fire-and-forget ────────────────
    // The just-published issue (currentWeek - 1) is the canonical
    // freeze target. We DO NOT write the raw adapter data — that
    // payload reflects whatever standings looked like at write
    // time, which can include partial results from the in-progress
    // week. Instead we synthesize from match history so the
    // snapshot is always exactly end-of-week-N. The writer upserts
    // by (league, year, week), so any stale snapshot from earlier
    // code paths gets self-healed on the next visit.
    if (leagueRowId && adapted.currentWeek >= 2) {
      const justPublishedWeek = adapted.currentWeek - 1
      if (canSynthesizeIssue(adapted, justPublishedWeek)) {
        const frozen = synthesizeIssue(adapted, justPublishedWeek)
        if (frozen) {
          // Same currentWeek override as the synth render path:
          // persist the LIVE currentWeek so future readers know
          // where "latest" sits. The reader patches it back to the
          // synthetic value at render time so editorial copy stays
          // anchored to the archived week.
          void writeIssueSnapshot(
            leagueRowId,
            frozen.currentSeason,
            justPublishedWeek,
            { ...frozen, currentWeek: adapted.currentWeek },
          )
        }
      }
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
  void loadIssue()
})

// Watch for archive-route navigation (Issue 10 → ◀ Issue 9 etc.).
// IssueView is the same component on both URLs, so the component
// instance is reused — onMounted does NOT fire on a second visit.
// Without this watcher, liveData stays stuck on whatever the
// previous URL loaded, and the new "Issue N" page renders the
// previous issue's standings. Re-running loadIssue resets state
// and either reads the snapshot for week N or synthesizes it.
watch(
  () => route.params.weekNumber,
  (next, prev) => {
    if (next === prev) return
    void loadIssue()
  },
)

/** Cached league row season — for the archive read path before the
 *  adapter runs (snapshot key needs (leagueId, year, week)). */
function parseSeasonYearFromLeague(): number | null {
  const league = strictLeagueRecord.value
  if (!league) return null
  const raw = league.season
  if (typeof raw === 'number') return raw
  if (typeof raw === 'string') {
    const n = parseInt(raw, 10)
    if (Number.isFinite(n)) return n
  }
  return null
}

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
</script>

<style scoped>
.issue {
  display: flex;
  flex-direction: column;
  gap: 40px;
  font-family: 'Barlow', sans-serif;
  color: var(--ink-1);
  /* Zero top padding — the layout already provides space under the
     masthead strip, and the issue-masthead block's own margins handle
     the editorial breathing room. The previous 24px was double-spacing
     and pushed the cover hero significantly below the fold. */
  padding: 0 0 80px;
}

/* ─── LOADING STATE ───────────────────────────────────────────── */
.issue-loading {
  position: relative;
  min-height: 70vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 80px 24px;
  /* Soft brand glow — radial pink wash + bottom yellow wash so the
     screen has atmosphere, not just text on void. Pulses gently so
     the user reads it as "alive, working" rather than frozen. */
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
  animation: issue-loading-glow 4s ease-in-out infinite alternate;
}
@keyframes issue-loading-glow {
  0%   { opacity: 0.85; }
  100% { opacity: 1.00; }
}
/* Indeterminate progress bar — fixed to the viewport top so it
   sits above the layout's masthead and reads as the universal
   "things are happening" signal. */
.issue-loading-bar {
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
.issue-loading-bar-fill {
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
  animation: issue-loading-slide 1.4s cubic-bezier(0.4, 0, 0.2, 1) infinite;
}
@keyframes issue-loading-slide {
  0%   { transform: translateX(-100%); }
  100% { transform: translateX(350%); }
}
.issue-loading-stage {
  max-width: 560px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0;
  /* Perspective so the logo's rotateY reads as 3D depth, not a
     flat squash-and-stretch. ~800px gives a moderate sense of
     dimensionality without making the rotation feel exaggerated. */
  perspective: 800px;
}
/* Spinning TLB monogram — square favicon, continuous rotation
   around its vertical Y axis (like a sign on a spindle, not a
   flat clockwise spin). 2.4s is the sweet spot: edge-on at 0.6s
   and 1.8s creates a natural rhythm, slow enough to read as
   deliberate rather than buzzy. preserve-3d + backface-visibility
   make sure the back of the monogram is rendered identically as
   it passes through. */
.issue-loading-logo {
  width: 88px;
  height: 88px;
  margin: 0 0 28px;
  display: block;
  border-radius: 18px;
  filter: drop-shadow(0 12px 32px oklch(0 0 0 / 0.45));
  transform-style: preserve-3d;
  backface-visibility: visible;
  animation:
    issue-loading-logo-in 320ms cubic-bezier(0.23, 1, 0.32, 1) both,
    issue-loading-spin 2.4s linear infinite 320ms;
}
@keyframes issue-loading-logo-in {
  0%   { opacity: 0; transform: scale(0.85); }
  100% { opacity: 1; transform: scale(1); }
}
@keyframes issue-loading-spin {
  0%   { transform: rotateY(0deg); }
  100% { transform: rotateY(360deg); }
}
.issue-loading-title {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: clamp(1.8rem, 3.4vw, 2.6rem);
  line-height: 1.05;
  letter-spacing: -0.014em;
  color: var(--ink-1);
  margin: 0 0 10px;
}
.issue-loading-sub {
  font-size: 1rem;
  line-height: 1.5;
  color: var(--ink-3);
  margin: 0;
  max-width: 42ch;
}

/* ─── MASTHEAD ────────────────────────────────────────────────── */
.issue-masthead {
  max-width: 720px;
}
.issue-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--accent-secondary);
  margin: 0 0 10px;
}
.issue-eyebrow-bar {
  width: 24px;
  height: 1px;
  background: var(--accent-secondary);
}
.issue-title {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: clamp(1.8rem, 4vw, 2.8rem);
  line-height: 0.96;
  letter-spacing: -0.012em;
  color: var(--ink-1);
  margin: 0 0 8px;
}
.issue-title-meta {
  display: inline-block;
  font-weight: 600;
  font-size: 0.62em;
  color: var(--ink-2);
  letter-spacing: 0;
  /* Manual baseline lift so the small meta optically aligns with the
     cap-height of "Issue N", not the descender baseline. Without this
     the meta sat slightly low against the big title text. */
  vertical-align: 0.32em;
}
.issue-sub {
  font-size: 1rem;
  line-height: 1.45;
  color: var(--ink-2);
  margin: 0;
  max-width: 62ch;
}

/* ─── COVER ───────────────────────────────────────────────────── */
.cover {
  display: grid;
  /* Slightly more weight on the copy column — the portrait used to
     dominate, pushing the TOC and PR section #1 below the fold on
     standard desktops. Shifting the ratio + capping the portrait
     surfaces the lede inside the first viewport. */
  grid-template-columns: minmax(0, 0.72fr) minmax(0, 1.28fr);
  gap: 36px;
  align-items: center;
  padding: 0 0 8px;
}
.cover-portrait {
  position: relative;
  aspect-ratio: 1 / 1;
  max-width: 380px;
  width: 100%;
}
.cover-portrait-frame {
  width: 100%;
  height: 100%;
  border-radius: 24px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--ink-1);
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: 3rem;
  position: relative;
  box-shadow: 0 24px 60px oklch(0 0 0 / 0.6);
}
.cover-portrait-frame::after {
  content: '';
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 50% 50%, transparent 35%, oklch(0.08 0.014 90 / 0.85) 100%),
    linear-gradient(180deg, transparent 78%, oklch(0.08 0.014 90 / 0.7)),
    linear-gradient(0deg, transparent 78%, oklch(0.08 0.014 90 / 0.7));
  pointer-events: none;
}
.cover-portrait-frame .avatar-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.cover-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.82rem;
  font-weight: 800;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--accent-secondary);
  margin: 0 0 14px;
}
.cover-eyebrow-bar {
  width: 24px;
  height: 1px;
  background: var(--accent-secondary);
}
.cover-headline {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: clamp(2.2rem, 4.6vw, 3.2rem);
  line-height: 0.96;
  letter-spacing: -0.014em;
  color: var(--ink-1);
  margin: 0 0 14px;
}
.cover-body {
  font-size: 1.05rem;
  line-height: 1.5;
  color: var(--ink-2);
  max-width: 56ch;
  margin: 0 0 22px;
}
.cover-stats {
  list-style: none;
  padding: 0 16px 0 0;
  margin: 0;
  display: inline-flex;
  align-items: flex-end;
  gap: 26px;
  flex-wrap: wrap;
}
.cover-stat {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.cover-stat-num {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 1.8rem;
  line-height: 1;
  color: var(--ink-1);
  font-variant-numeric: tabular-nums;
}
.cover-stat-label {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--ink-3);
}

/* ─── TOC ─────────────────────────────────────────────────────── */
.issue-toc {
  border-top: 1px solid oklch(0.20 0.015 90);
  border-bottom: 1px solid oklch(0.20 0.015 90);
  padding: 18px 0;
  display: flex;
  align-items: center;
  gap: 24px;
  flex-wrap: wrap;
}
.issue-toc-label {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--ink-3);
  margin: 0;
}
.issue-toc-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  gap: 28px;
  flex-wrap: wrap;
}
.issue-toc-list a {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 700;
  font-size: 0.96rem;
  letter-spacing: 0.04em;
  color: var(--ink-1);
  text-decoration: none;
  border-bottom: 1px solid transparent;
  transition: border-color 200ms ease;
}
.issue-toc-list a:hover { border-bottom-color: var(--accent-secondary); }

/* ─── SECTIONS ────────────────────────────────────────────────── */
.section {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.section-head {
  max-width: 720px;
}
.section-eyebrow {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--accent-secondary);
  margin: 0 0 12px;
}
.section-headline {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: clamp(1.8rem, 3.4vw, 2.4rem);
  line-height: 1;
  letter-spacing: -0.008em;
  color: var(--ink-1);
  margin: 0 0 10px;
}
.section-lede {
  font-size: 1.08rem;
  line-height: 1.55;
  color: var(--ink-1);
  margin: 0 0 14px;
  max-width: 60ch;
  font-weight: 500;
}
.section-sub {
  font-size: 0.92rem;
  line-height: 1.5;
  color: var(--ink-3);
  margin: 0;
  max-width: 60ch;
}
.section-sub a {
  color: var(--accent-tertiary);
  text-decoration: none;
  border-bottom: 1px solid currentColor;
}

.section-skeleton {
  opacity: 0.85;
}

/* ─── STANDINGS LIST ─────────────────────────────────────────── */
.standings {
  list-style: none;
  padding: 0;
  margin: 0;
  background: oklch(0.10 0.015 90);
  border: 1px solid oklch(0.20 0.015 90);
  border-radius: 16px;
  overflow: hidden;
}
.standings-row {
  display: grid;
  grid-template-columns: 36px 36px minmax(0, 1fr) auto auto;
  gap: 14px;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid oklch(0.14 0.015 90);
}
.standings-row:last-child { border-bottom: 0; }
.standings-row-leader { background: oklch(0.12 0.013 90); }
.standings-rank {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: 0.95rem;
  color: var(--ink-3);
  font-variant-numeric: tabular-nums;
}
.standings-row-leader .standings-rank { color: var(--accent-primary, oklch(0.78 0.18 92)); }
.standings-avatar {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--ink-1);
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.78rem;
  font-weight: 800;
  overflow: hidden;
}
.standings-avatar .avatar-image { width: 100%; height: 100%; object-fit: cover; }
.standings-name {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 700;
  font-size: 1rem;
  color: var(--ink-1);
  letter-spacing: 0.005em;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.standings-record {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 700;
  font-size: 0.9rem;
  color: var(--ink-2);
  font-variant-numeric: tabular-nums;
}
.standings-streak {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: 0.82rem;
  letter-spacing: 0.04em;
  padding: 3px 8px;
  border-radius: 5px;
  background: oklch(0.14 0.015 90);
  color: var(--ink-1);
  font-variant-numeric: tabular-nums;
}
.standings-streak[data-tone='win']  { color: oklch(0.86 0.16 145); background: oklch(0.74 0.18 145 / 0.14); }
.standings-streak[data-tone='loss'] { color: oklch(0.85 0.20 350); background: oklch(0.70 0.27 350 / 0.14); }

/* ─── CELLAR CALLOUT ──────────────────────────────────────────── */
.cellar-callout {
  padding: 14px 18px;
  border-radius: 14px;
  background:
    radial-gradient(120% 200% at 0% 0%, oklch(0.70 0.22 0 / 0.10), transparent 55%),
    oklch(0.09 0.015 20);
  border: 1px solid oklch(0.70 0.22 0 / 0.22);
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.cellar-eyebrow {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.7rem;
  font-weight: 800;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: oklch(0.70 0.22 0);
}
.cellar-body {
  display: flex;
  align-items: center;
  gap: 14px;
}
.cellar-avatar {
  width: 40px; height: 40px;
  border-radius: 10px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--ink-1);
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.82rem;
  font-weight: 800;
  overflow: hidden;
  opacity: 0.78;
  filter: grayscale(0.28);
  flex: 0 0 auto;
}
.cellar-avatar .avatar-image { width: 100%; height: 100%; object-fit: cover; }
.cellar-text {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1 1 auto;
  min-width: 0;
}
.cellar-caption {
  margin: 0;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 1rem;
  font-weight: 600;
  color: var(--ink-1);
  line-height: 1.4;
}
.cellar-caption strong { font-weight: 800; }
.cellar-caption-stakes {
  display: block;
  margin-top: 4px;
  color: var(--ink-3);
  font-weight: 500;
}
.cellar-meta {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  gap: 14px;
  flex-wrap: wrap;
}
.cellar-meta li {
  display: inline-flex;
  align-items: baseline;
  gap: 5px;
}
.cellar-meta-num {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 0.92rem;
  color: var(--ink-1);
  font-variant-numeric: tabular-nums;
}
.cellar-meta-lbl {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 700;
  font-size: 0.66rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--ink-3);
}

/* ─── GAME OF THE WEEK ────────────────────────────────────────── */
.game {
  background:
    radial-gradient(120% 180% at 0% 0%, oklch(0.74 0.18 145 / 0.06), transparent 60%),
    oklch(0.09 0.013 90);
  border: 1px solid oklch(0.18 0.015 90);
  border-radius: 18px;
  padding: 28px 28px 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.game-teams {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: center;
  gap: 28px;
}
.game-team {
  display: flex;
  align-items: center;
  gap: 16px;
  min-width: 0;
}
.game-team-loser { justify-self: end; flex-direction: row-reverse; text-align: right; }
.game-team-avatar {
  width: 64px;
  height: 64px;
  border-radius: 14px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--ink-1);
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: 1.1rem;
  overflow: hidden;
  flex: 0 0 auto;
}
.game-team-loser .game-team-avatar { opacity: 0.85; filter: grayscale(0.2); }
.game-team-avatar .avatar-image { width: 100%; height: 100%; object-fit: cover; }
.game-team-text {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}
.game-team-name {
  margin: 0;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: 1.32rem;
  line-height: 1.1;
  color: var(--ink-1);
  letter-spacing: -0.005em;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.game-team-record {
  margin: 0;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 700;
  font-size: 0.78rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--ink-3);
}
.game-team-winner .game-team-record { color: oklch(0.86 0.16 145); }
.game-vs {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: 0.82rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--ink-3);
  padding: 0 4px;
}
.game-summary {
  margin: 0;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 600;
  font-size: 1.08rem;
  line-height: 1.45;
  color: var(--ink-1);
  border-top: 1px solid oklch(0.16 0.015 90);
  padding-top: 16px;
}

/* ─── AROUND THE LEAGUE ───────────────────────────────────────── */
.around {
  display: flex;
  flex-direction: column;
  gap: 12px;
  /* Sub-section margin so "AROUND THE LEAGUE" reads as its own
     editorial chunk beneath the Game-of-the-Week card, not as a
     trailing footer to it. */
  margin-top: 12px;
}
.around-label {
  margin: 0;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.74rem;
  font-weight: 800;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--ink-3);
}
.around-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
}
.around-item {
  display: grid;
  grid-template-columns: 56px minmax(0, 1fr);
  gap: 14px;
  align-items: baseline;
  padding: 10px 0;
  border-bottom: 1px solid oklch(0.14 0.015 90);
}
.around-item:last-child { border-bottom: 0; }
.around-score {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: 0.9rem;
  color: var(--ink-3);
  font-variant-numeric: tabular-nums;
}
.around-text {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 600;
  font-size: 0.96rem;
  color: var(--ink-2);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.around-text strong { color: var(--ink-1); font-weight: 800; }
.close-call {
  margin: 14px 0 0;
  padding: 12px 14px;
  border-radius: 10px;
  background: linear-gradient(
    180deg,
    oklch(0.10 0.014 200 / 0.6),
    oklch(0.07 0.010 200 / 0.4)
  );
  border: 1px solid oklch(0.22 0.04 200 / 0.5);
}
.close-call-label {
  margin: 0 0 4px;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.10em;
  text-transform: uppercase;
  color: var(--accent-tertiary);
}
.close-call-body {
  margin: 0;
  font-size: 0.96rem;
  line-height: 1.5;
  color: var(--ink-2);
}
.close-call-body strong { color: var(--ink-1); font-weight: 800; }
.close-call-tag {
  display: inline;
  color: var(--ink-3);
  font-size: 0.88rem;
}
.around-link-line {
  margin: 6px 0 0;
  font-size: 0.92rem;
}
.around-link-line a {
  color: var(--accent-tertiary);
  text-decoration: none;
  border-bottom: 1px solid currentColor;
}

@media (max-width: 720px) {
  .game-teams {
    grid-template-columns: 1fr;
    gap: 14px;
  }
  .game-team-loser { justify-self: stretch; flex-direction: row; text-align: left; }
  .game-vs { justify-self: center; }
}

/* ─── DEPARTMENTS ─────────────────────────────────────────────── */
.departments-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(280px, 100%), 1fr));
  gap: 14px;
}
.department-card {
  padding: 18px 20px 16px;
  border-radius: 14px;
  background: oklch(0.09 0.013 90);
  border: 1px solid oklch(0.18 0.015 90);
  border-left: 3px solid var(--accent-tertiary);
  display: flex;
  flex-direction: column;
  gap: 6px;
  /* Belt-and-suspenders: keep all 4 cards visually balanced even
     when one variant fires a single-line and another wraps to two
     lines. The min-height is tuned to fit two lines of the value
     text comfortably. */
  min-height: 116px;
}
.department-label {
  margin: 0;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: 0.72rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--accent-tertiary);
}
.department-value {
  margin: 0;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 700;
  font-size: 1.18rem;
  line-height: 1.25;
  color: var(--ink-1);
}

/* ─── CHRONICLES TEASE ───────────────────────────────────────── */
.chronicles-tease {
  padding: 24px 28px;
  border-radius: 16px;
  background:
    radial-gradient(120% 180% at 0% 0%, oklch(0.72 0.18 195 / 0.06), transparent 60%),
    oklch(0.09 0.013 90);
  border: 1px solid oklch(0.18 0.015 90);
  border-left: 3px solid var(--accent-tertiary);
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.chronicles-tease-eyebrow {
  margin: 0;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: 0.74rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--accent-tertiary);
}
.chronicles-tease-body {
  margin: 0;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 600;
  font-size: 1.04rem;
  line-height: 1.5;
  color: var(--ink-1);
}
.chronicles-tease-link {
  align-self: flex-start;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 700;
  font-size: 0.86rem;
  letter-spacing: 0.04em;
  color: var(--accent-tertiary);
  text-decoration: none;
  border-bottom: 1px solid currentColor;
}

/* ─── FOOTER ─────────────────────────────────────────────────── */
.issue-footer {
  padding: 28px 0 0;
  border-top: 1px solid oklch(0.20 0.015 90);
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: center;
}
.issue-footer-end {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: 0.86rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--accent-secondary);
  margin: 0;
}
.issue-footer-tagline {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 700;
  font-size: 1rem;
  letter-spacing: 0.04em;
  color: var(--ink-1);
  margin: 0;
}
.issue-footer-reconstructed {
  margin: 8px 0 0;
  max-width: 480px;
  font-size: 0.78rem;
  line-height: 1.45;
  color: var(--ink-3);
  font-style: italic;
}
.issue-footer-archive {
  display: inline-flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
  justify-content: center;
  margin: 4px 0 0;
}
.issue-footer-archive-btn {
  appearance: none;
  background: transparent;
  border: 1px solid oklch(0.20 0.015 90);
  border-radius: 8px;
  color: var(--ink-2);
  padding: 8px 14px;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 700;
  font-size: 0.86rem;
  letter-spacing: 0.06em;
  cursor: pointer;
  text-decoration: none;
  transition: border-color 200ms ease, color 200ms ease;
}
.issue-footer-archive-btn:hover {
  border-color: var(--accent-secondary);
  color: var(--ink-1);
}
.issue-footer-archive-btn-disabled {
  opacity: 0.42;
  cursor: not-allowed;
  pointer-events: none;
}
.issue-footer-archive-note {
  margin: 10px 0 0;
  font-size: 0.78rem;
  color: var(--ink-3);
  font-style: italic;
  text-align: center;
}
.issue-footer-archive-now {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: 0.86rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--accent-secondary);
}
.issue-footer-archive-sep { color: var(--ink-5); }

/* ─── MOBILE ─────────────────────────────────────────────────── */
@media (max-width: 720px) {
  .cover {
    grid-template-columns: 1fr;
    gap: 24px;
  }
  .cover-portrait { max-width: 240px; }
  .standings-row {
    grid-template-columns: 28px 28px minmax(0, 1fr) auto;
    gap: 10px;
    padding: 10px 14px;
  }
  .standings-record { display: none; }
}
</style>
