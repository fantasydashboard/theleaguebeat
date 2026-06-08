<template>
  <div class="beat-feed">
    <!-- Live load banner (mirrors PR view pattern) -->
    <LiveLoadError v-if="liveError" :message="liveError" :platform-label="platformLabel" />

    <!-- Loading guard. In strict live mode we MUST wait for the
         adapter before rendering, otherwise the fixture team names
         leak into the real league's wire (the page silently falls
         back to `fixtureData` when `liveData` is null). Mirrors the
         Issue's loading template so the two surfaces feel like the
         same publication. -->
    <div
      v-if="isStrictLiveMode && !liveData && !liveError"
      class="beat-loading"
      role="status"
      aria-live="polite"
    >
      <div class="beat-loading-bar" aria-hidden="true">
        <span class="beat-loading-bar-fill"></span>
      </div>
      <div class="beat-loading-stage">
        <!-- Two-face spinning TLB monogram. See IssueView for the
             pre-rotated back-face rationale — keeps "TLB" readable
             through every frame of the rotation. -->
        <div class="beat-loading-logo" aria-hidden="true">
          <img
            src="/tlb-favicon.png"
            alt=""
            class="beat-loading-logo-face beat-loading-logo-face-front"
          />
          <img
            src="/tlb-favicon.png"
            alt=""
            class="beat-loading-logo-face beat-loading-logo-face-back"
          />
        </div>
        <p class="beat-loading-title">{{ loadingTitle }}</p>
        <p class="beat-loading-sub">{{ loadingSubline }}</p>
      </div>
    </div>

    <template v-else>
    <header class="beat-head">
      <p class="beat-eyebrow">
        <span class="beat-eyebrow-bar" aria-hidden="true"></span>
        The Beat
      </p>
      <h1 class="beat-headline">{{ leagueName }}</h1>
      <p class="beat-sub">
        The wire on your league. Updated continuously.
        <span v-if="lastUpdatedLabel" class="beat-updated">
          · <span aria-hidden="true">●</span> {{ lastUpdatedLabel }}
        </span>
      </p>
    </header>

    <section
      v-if="beat.days.length === 0"
      class="beat-empty"
      aria-label="The Beat is quiet"
    >
      <p class="beat-empty-headline">No events on the wire yet.</p>
      <p class="beat-empty-body">
        The Beat fills in as your league's week unfolds — finalized matchups,
        streak crossings, throne changes. Check back after Sunday night.
      </p>
    </section>

    <section
      v-for="day in beat.days"
      :key="day.date.toISOString()"
      class="beat-day"
      :aria-labelledby="`beat-day-${day.date.getTime()}`"
    >
      <h2
        class="beat-day-label"
        :id="`beat-day-${day.date.getTime()}`"
      >{{ day.label }}</h2>
      <div class="beat-day-rule" aria-hidden="true"></div>

      <ol class="beat-list" role="list">
        <li
          v-for="item in day.items"
          :key="item.id"
          class="beat-item"
          :class="{ 'beat-item-featured': item.isFeatured }"
          :data-importance="item.importance"
          :data-category="item.category"
        >
          <!-- Featured items: lead-avatar block (left), then content stack.
               Player-photo widgets get a dedicated treatment so the
               player's face is the focal point, not the fantasy team. -->
          <div
            v-if="item.isFeatured && item.widget && item.widget.kind === 'player-photo'"
            class="beat-feature-portrait beat-feature-portrait-player"
            aria-hidden="true"
          >
            <span class="beat-feature-player">
              <img
                v-if="item.widget.photoUrl"
                :src="item.widget.photoUrl"
                class="beat-feature-player-img"
                alt=""
              />
              <span v-else class="beat-feature-player-initials">
                {{ playerInitials(item.widget.playerName) }}
              </span>
            </span>
            <!-- Owning fantasy team avatar tucked behind the player. -->
            <span
              v-if="item.widget.teamIds && item.widget.teamIds.length > 0"
              class="beat-feature-avatar beat-feature-avatar-back"
              :style="{ background: `linear-gradient(135deg, ${lookupTeam(item.widget.teamIds[0]).avatarColor})` }"
            >
              <img
                v-if="lookupTeam(item.widget.teamIds[0]).avatarUrl"
                :src="lookupTeam(item.widget.teamIds[0]).avatarUrl"
                class="avatar-image"
                alt=""
              />
              <span v-else>{{ lookupTeam(item.widget.teamIds[0]).ownerInitials }}</span>
            </span>
          </div>
          <div
            v-else-if="item.isFeatured && item.widget && item.widget.teamIds && item.widget.teamIds.length > 0"
            class="beat-feature-portrait"
            :class="{ 'beat-feature-portrait-vs': item.category === 'RACE' || item.category === 'LIVE' }"
            aria-hidden="true"
          >
            <span
              v-for="(tid, i) in item.widget.teamIds.slice(0, 2)"
              :key="`feat-${item.id}-${tid}`"
              class="beat-feature-avatar"
              :class="{ 'beat-feature-avatar-back': i === 1 }"
              :style="{ background: `linear-gradient(135deg, ${lookupTeam(tid).avatarColor})` }"
            >
              <img
                v-if="lookupTeam(tid).avatarUrl"
                :src="lookupTeam(tid).avatarUrl"
                class="avatar-image"
                alt=""
              />
              <span v-else>{{ lookupTeam(tid).ownerInitials }}</span>
            </span>
          </div>

          <time class="beat-time" :datetime="item.timestamp.toISOString()">
            {{ formatTime(item.timestamp) }}
          </time>
          <span class="beat-category-pill" :data-category="item.category">
            {{ item.categoryLabel }}
          </span>
          <div class="beat-content">
            <p class="beat-item-headline">{{ item.headline }}</p>
            <p v-if="item.body" class="beat-item-body">{{ item.body }}</p>
            <!-- Featured items always include a stat chip when one is
                 available, to give the lead some numeric weight. -->
            <span
              v-if="item.isFeatured && item.widget && item.widget.kind === 'streak-chip' && item.widget.text"
              class="beat-feature-stat"
              :data-tone="item.widget.tone"
            >{{ item.widget.text }}</span>
          </div>

          <!-- Non-featured: small widget on the right (logos / streak chip / player photo) -->
          <div v-if="!item.isFeatured && item.widget" class="beat-widget" aria-hidden="true">
            <span
              v-if="item.widget.kind === 'streak-chip' || item.widget.kind === 'score-chip'"
              class="beat-widget-chip"
              :data-tone="item.widget.tone"
            >{{ item.widget.text }}</span>
            <template v-if="item.widget.kind === 'team-logo' || item.widget.kind === 'two-logos'">
              <span
                v-for="tid in item.widget.teamIds"
                :key="`${item.id}-${tid}`"
                class="beat-widget-avatar"
                :style="{ background: `linear-gradient(135deg, ${lookupTeam(tid).avatarColor})` }"
              >
                <img
                  v-if="lookupTeam(tid).avatarUrl"
                  :src="lookupTeam(tid).avatarUrl"
                  class="avatar-image"
                  alt=""
                />
                <span v-else>{{ lookupTeam(tid).ownerInitials }}</span>
              </span>
            </template>
            <!-- Player photo widget — used by HUGE_GAME and BENCH_BLUNDER. -->
            <span
              v-if="item.widget.kind === 'player-photo'"
              class="beat-widget-player"
              :title="item.widget.playerName"
            >
              <img
                v-if="item.widget.photoUrl"
                :src="item.widget.photoUrl"
                class="beat-widget-player-img"
                alt=""
              />
              <span v-else class="beat-widget-player-initials">
                {{ playerInitials(item.widget.playerName) }}
              </span>
            </span>
          </div>
        </li>
      </ol>
    </section>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, shallowRef, watch } from 'vue'
import { useRoute } from 'vue-router'
import { renderBeat, type RenderedBeat } from '@/editorial/render-beat'
import { categoriesFixtureToLeagueData } from '@/editorial/fixtureAdapter'
import { sleeperLeagueToCategoryData } from '@/editorial/adapters/sleeperAdapter'
import { espnLeagueToCategoryData } from '@/editorial/adapters/espnAdapter'
import { yahooLeagueToCategoryData } from '@/editorial/adapters/yahooAdapter'
import type { CategoryLeagueData } from '@/editorial/types'
import { useLeaguesStore } from '@/stores/leaguesNew'
import { useIssueStore } from '@/stores/issueState'
import { usePlatformsStore } from '@/stores/platforms'
import { deriveSeasonStage } from '@/editorial/detection/helpers'
import LiveLoadError from '@/components/demo/LiveLoadError.vue'
import { getTeam } from '@/fixtures/categoriesLeague'

defineEmits<{ (e: 'open-signup'): void }>()

const route = useRoute()
const leaguesStore = useLeaguesStore()
const issueStore = useIssueStore()

/* ─────────────────────────────────────────────────────────────────
   LIVE DATA — same pattern as the PR view. Default to fixture so the
   demo experience works; swap in live league data when a leagueId is
   resolvable from the route (strict mode) or the query (soft mode).
───────────────────────────────────────────────────────────────── */

const liveData = shallowRef<CategoryLeagueData | null>(null)
const fixtureData = categoriesFixtureToLeagueData()
const liveError = ref<string | null>(null)
const liveLoading = ref(false)
const renderedAt = ref<Date>(new Date())

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

/** Editorial-voice copy for the loading state. Same shape as
 *  IssueView so the two surfaces feel like one publication. */
const loadingTitle = computed(() => `Pulling the wire.`)
const loadingSubline = computed(() => {
  const league = strictLeagueRecord.value?.league_name
  if (league) return `Pulling ${league} from ${platformLabel.value}.`
  return `Pulling the day's events from ${platformLabel.value}.`
})

const activeData = computed<CategoryLeagueData>(
  () => liveData.value ?? fixtureData,
)

/* ─────────────────────────────────────────────────────────────────
   EDITORIAL — render the beat from the active data. The renderer is
   pure; we re-run it whenever activeData changes.
───────────────────────────────────────────────────────────────── */

const beat = computed<RenderedBeat>(
  () => renderBeat(activeData.value, renderedAt.value),
)

/* ─────────────────────────────────────────────────────────────────
   LOOKUPS + FORMATTERS
───────────────────────────────────────────────────────────────── */

const leagueName = computed(() => {
  const live = strictLeagueRecord.value?.league_name
  if (live) return live
  return 'Your league'
})

const lastUpdatedLabel = computed(() => {
  if (liveLoading.value) return 'loading'
  // V0: timestamp is "right now" since data is fetched at mount.
  const now = renderedAt.value
  return formatTime(now)
})

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

function playerInitials(name?: string): string {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function formatTime(d: Date): string {
  const h = d.getHours()
  const m = d.getMinutes()
  const suffix = h >= 12 ? 'PM' : 'AM'
  const display = ((h + 11) % 12) + 1
  return `${display}:${m.toString().padStart(2, '0')} ${suffix}`
}

/* ─────────────────────────────────────────────────────────────────
   LIVE DATA HYDRATION
───────────────────────────────────────────────────────────────── */

async function loadBeat() {
  if (isStrictLiveMode.value && leaguesStore.leagues.length === 0) {
    try {
      await leaguesStore.fetchLeagues()
    } catch (err) {
      console.warn('[BeatFeedView] fetchLeagues failed:', err)
    }
  }

  // Reset prior render state — when switching leagues the component
  // instance is reused (same route component, different :leagueId
  // param). Without clearing liveData here, the previous league's
  // wire stays on screen until the new fetch resolves. Worse, when
  // the new league has the same default render path the user can't
  // tell the switch happened.
  liveData.value = null
  liveError.value = null

  const id = liveLeagueId.value
  const platform = livePlatform.value
  if (!id || (platform !== 'sleeper' && platform !== 'espn' && platform !== 'yahoo')) {
    // In strict live mode an unresolved league record would leave
    // the loading guard spinning forever. Surface as a friendly
    // error so the user can refresh or reconnect.
    if (isStrictLiveMode.value) {
      liveError.value =
        'This league couldn\'t be resolved. Try refreshing, or reconnect it from the home page.'
    }
    return
  }

  liveLoading.value = true
  liveError.value = null
  try {
    const leagueRowId =
      typeof route.params.leagueId === 'string' ? route.params.leagueId : undefined
    const opts = {
      userIdentity: collectUserIdentity(),
      leagueRowId,
    }
    const data =
      platform === 'espn'
        ? await espnLeagueToCategoryData(id, opts)
        : platform === 'yahoo'
        ? await yahooLeagueToCategoryData(id, opts)
        : await sleeperLeagueToCategoryData(id, opts)
    liveData.value = data
    renderedAt.value = new Date()
    // Backfill a stale ESPN placeholder league_name once the real
    // name resolves. No-op for Yahoo / Sleeper / already-named ESPN
    // rows; see leaguesStore.maybeBackfillLeagueName for the guard
    // logic. Fire-and-forget — UI updates reactively when the row
    // does, no need to await.
    if (leagueRowId && data.leagueName) {
      void leaguesStore.maybeBackfillLeagueName(leagueRowId, data.leagueName)
    }
    // Founded year — derive from the adapter's seasonHistory so the
    // masthead Vol stays consistent regardless of which tab loaded
    // first. Omitting this field resets the store's value to null
    // (the store treats `undefined` as a clear), which would knock
    // every subsequent tab back to Vol. 1.
    const historyYears = (data.seasonHistory ?? [])
      .map((s) => s.year)
      .filter((y): y is number => Number.isFinite(y))
    const foundedFromHistory = historyYears.length > 0
      ? Math.min(data.currentSeason, ...historyYears)
      : data.currentSeason
    issueStore.setIssue({
      currentWeek: data.currentWeek,
      currentSeason: data.currentSeason,
      regularSeasonEndWeek: data.regularSeasonEndWeek,
      seasonStage: deriveSeasonStage(data.currentWeek, data.regularSeasonEndWeek),
      leagueFoundedSeason: foundedFromHistory,
      lastUpdated: new Date(),
    })
  } catch (err) {
    const label =
      platform === 'espn' ? 'ESPN' : platform === 'yahoo' ? 'Yahoo' : 'Sleeper'
    liveError.value = (err as Error).message || `Failed to load ${label} league data.`
  } finally {
    liveLoading.value = false
  }
}

onMounted(() => {
  void loadBeat()
})

// Watch for league-switcher navigation. BeatFeedView is the same
// component on every `/leagues/:leagueId/the-beat` route, so the
// component instance is reused — onMounted does NOT fire when the
// user switches leagues from the global switcher. Without this
// watcher, liveData stays stuck on the previous league's data
// until a hard refresh. Re-running loadBeat resets state and
// pulls the new league's events.
watch(
  () => route.params.leagueId,
  (next, prev) => {
    if (next === prev) return
    void loadBeat()
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
</script>

<style scoped>
/* Tokens (--ink-N, --accent-*) inherited from layout. */
.beat-feed {
  display: flex;
  flex-direction: column;
  gap: 48px;
  font-family: 'Barlow', sans-serif;
  color: var(--ink-1);
  padding: 32px 0 80px;
}

/* ─── LOADING STATE ───────────────────────────────────────────── */
/* Mirrors IssueView's loading treatment — the TLB lockup, indeterminate
   progress bar at the top, soft brand glow. Keeps the two surfaces
   feeling like the same publication. */
.beat-loading {
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
  animation: beat-loading-glow 4s ease-in-out infinite alternate;
}
@keyframes beat-loading-glow {
  0%   { opacity: 0.85; }
  100% { opacity: 1.00; }
}
.beat-loading-bar {
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
.beat-loading-bar-fill {
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
  animation: beat-loading-slide 1.4s cubic-bezier(0.4, 0, 0.2, 1) infinite;
}
@keyframes beat-loading-slide {
  0%   { transform: translateX(-100%); }
  100% { transform: translateX(350%); }
}
.beat-loading-stage {
  max-width: 560px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  /* See IssueView for the perspective rationale — keeps the two
     loading surfaces visually identical. */
  perspective: 800px;
}
.beat-loading-logo {
  position: relative;
  width: 88px;
  height: 88px;
  margin: 0 0 28px;
  filter: drop-shadow(0 12px 32px oklch(0 0 0 / 0.45));
  transform-style: preserve-3d;
  animation:
    beat-loading-logo-in 320ms cubic-bezier(0.23, 1, 0.32, 1) both,
    beat-loading-spin 2.4s linear infinite 320ms;
}
.beat-loading-logo-face {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  border-radius: 18px;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
}
.beat-loading-logo-face-back {
  transform: rotateY(180deg);
}
@keyframes beat-loading-logo-in {
  0%   { opacity: 0; transform: scale(0.85); }
  100% { opacity: 1; transform: scale(1); }
}
@keyframes beat-loading-spin {
  0%   { transform: rotateY(0deg); }
  100% { transform: rotateY(360deg); }
}
.beat-loading-title {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: clamp(1.8rem, 3.4vw, 2.6rem);
  line-height: 1.05;
  letter-spacing: -0.014em;
  color: var(--ink-1);
  margin: 0 0 10px;
}
.beat-loading-sub {
  font-size: 1rem;
  line-height: 1.5;
  color: var(--ink-3);
  margin: 0;
  max-width: 42ch;
}

/* ─── Header ──────────────────────────────────────────────────── */
.beat-head {
  max-width: 720px;
}
.beat-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--accent-secondary);
  margin: 0 0 14px;
}
.beat-eyebrow-bar {
  width: 24px;
  height: 1px;
  background: var(--accent-secondary);
}
.beat-headline {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: clamp(2.25rem, 5vw, 3.4rem);
  line-height: 0.94;
  letter-spacing: -0.012em;
  color: var(--ink-1);
  margin: 0 0 10px;
}
.beat-sub {
  font-size: 1.02rem;
  line-height: 1.5;
  color: var(--ink-2);
  margin: 0;
}
.beat-updated {
  color: var(--ink-3);
  font-size: 0.92rem;
}
.beat-updated [aria-hidden] {
  color: oklch(0.74 0.18 145);
  margin-right: 2px;
}

/* ─── Empty state ─────────────────────────────────────────────── */
.beat-empty {
  padding: 32px 28px;
  background: oklch(0.09 0.013 90);
  border: 1px solid oklch(0.18 0.015 90);
  border-radius: 14px;
}
.beat-empty-headline {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: 1.2rem;
  color: var(--ink-1);
  margin: 0 0 8px;
}
.beat-empty-body {
  font-size: 0.96rem;
  color: var(--ink-2);
  line-height: 1.5;
  margin: 0;
  max-width: 56ch;
}

/* ─── Day groups ──────────────────────────────────────────────── */
.beat-day {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.beat-day-label {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: 0.82rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--accent-tertiary);
  margin: 0;
  padding: 0 0 8px;
}
.beat-day-rule {
  height: 1px;
  background: oklch(0.20 0.015 90);
  margin-bottom: 4px;
}

/* ─── Feed list ───────────────────────────────────────────────── */
.beat-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
}

/* Each item is a 4-column grid: time | category pill | content | widget.
   On narrow viewports the time + pill stack inline above the content. */
.beat-item {
  display: grid;
  grid-template-columns: 84px 80px minmax(0, 1fr) auto;
  gap: 16px;
  align-items: start;
  padding: 18px 0;
  border-bottom: 1px solid oklch(0.16 0.015 90);
  position: relative;
}
.beat-item:last-child { border-bottom: 0; }
.beat-item[data-importance='high']:not(.beat-item-featured)::before {
  content: '';
  position: absolute;
  left: -14px;
  top: 22px;
  width: 4px;
  height: calc(100% - 40px);
  border-radius: 2px;
  background: var(--accent-secondary);
}

/* ─── Featured lead item ──────────────────────────────────────── */
/* One per day. Larger avatar block on the left, bigger headline,
   body always rendered. Creates a focal point per day so the wire
   reads as edited rather than as an undifferentiated stream. */
.beat-item-featured {
  grid-template-columns: 88px 1fr;
  grid-template-areas:
    'portrait header'
    'portrait content';
  column-gap: 22px;
  row-gap: 6px;
  /* Tighter bottom-padding so the featured card reads as the LEAD
     of its day group, not as an island detached from the rows beneath
     it. The non-featured peers just below should feel like a sequence
     continuing from the lead. */
  padding: 18px 0 14px;
  border-bottom: 1px solid oklch(0.20 0.015 90);
  background:
    linear-gradient(90deg, oklch(0.10 0.013 90), transparent 75%);
  border-radius: 12px;
  margin: 2px -16px 0;
  padding-left: 16px;
  padding-right: 16px;
}
.beat-item-featured .beat-time {
  grid-area: header;
  align-self: center;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding-top: 0;
  font-size: 0.78rem;
}
.beat-item-featured .beat-category-pill {
  grid-area: header;
  justify-self: end;
  align-self: center;
}
.beat-item-featured .beat-content {
  grid-area: content;
  gap: 8px;
}
.beat-item-featured .beat-item-headline {
  font-size: 1.42rem;
  font-weight: 800;
  line-height: 1.2;
  letter-spacing: -0.008em;
}
.beat-item-featured .beat-item-body {
  font-size: 1.0rem;
  color: var(--ink-2);
}
.beat-feature-portrait {
  grid-area: portrait;
  width: 88px;
  height: 88px;
  position: relative;
  display: block;
}
.beat-feature-avatar {
  position: absolute;
  width: 72px;
  height: 72px;
  border-radius: 14px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--ink-1);
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: 1.05rem;
  overflow: hidden;
  flex: 0 0 auto;
  top: 8px;
  left: 0;
  box-shadow: 0 4px 12px oklch(0 0 0 / 0.4);
}
.beat-feature-avatar-back {
  width: 52px;
  height: 52px;
  font-size: 0.85rem;
  top: 28px;
  left: 38px;
  opacity: 0.78;
  z-index: -1;
}

/* RACE / LIVE variant — both teams are equal subjects (a race
   has no winner, a live game has no result yet), so the stacked
   "primary / secondary" treatment misreads. Render them side by
   side at equal size; both deserve the same visual weight. */
.beat-feature-portrait-vs .beat-feature-avatar {
  width: 42px;
  height: 42px;
  top: 23px;
  left: 0;
  border-radius: 10px;
}
.beat-feature-portrait-vs .beat-feature-avatar-back {
  width: 42px;
  height: 42px;
  top: 23px;
  left: 46px;
  opacity: 1;
  z-index: 0;
}
.beat-feature-portrait-player {
  position: relative;
  width: 88px;
  height: 88px;
}
.beat-feature-player {
  position: absolute;
  top: 0;
  left: 0;
  width: 72px;
  height: 72px;
  border-radius: 50%;
  overflow: hidden;
  background: oklch(0.18 0.015 90);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px oklch(0 0 0 / 0.4);
}
.beat-feature-player-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.beat-feature-player-initials {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: 1.1rem;
  color: var(--ink-1);
}
.beat-feature-avatar .avatar-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.beat-feature-stat {
  display: inline-flex;
  align-items: center;
  margin-top: 4px;
  padding: 5px 12px;
  border-radius: 7px;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: 0.96rem;
  letter-spacing: 0.04em;
  background: oklch(0.13 0.015 90);
  color: var(--ink-1);
  align-self: flex-start;
  font-variant-numeric: tabular-nums;
}
.beat-feature-stat[data-tone='win']  { color: oklch(0.86 0.16 145); background: oklch(0.74 0.18 145 / 0.12); }
.beat-feature-stat[data-tone='loss'] { color: oklch(0.85 0.20 350); background: oklch(0.70 0.27 350 / 0.12); }

.beat-time {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 700;
  font-size: 0.82rem;
  letter-spacing: 0.04em;
  color: var(--ink-3);
  font-variant-numeric: tabular-nums;
  padding-top: 2px;
}

.beat-category-pill {
  display: inline-flex;
  align-items: center;
  justify-self: start;
  padding: 3px 8px;
  border-radius: 4px;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: 0.7rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  border: 1px solid currentColor;
  white-space: nowrap;
}
.beat-category-pill[data-category='FINAL']         { color: oklch(0.74 0.18 145); }
.beat-category-pill[data-category='STREAK']        { color: oklch(0.74 0.18 145); }
.beat-category-pill[data-category='THRONE']        { color: var(--accent-primary, oklch(0.78 0.18 92)); }
.beat-category-pill[data-category='CELLAR']        { color: oklch(0.70 0.22 0); }
.beat-category-pill[data-category='RACE']          { color: var(--accent-tertiary); }
.beat-category-pill[data-category='ISSUE']         { color: var(--accent-secondary); }
.beat-category-pill[data-category='BRIEFING']      { color: var(--ink-2); }
.beat-category-pill[data-category='LIVE']          { color: var(--accent-tertiary); }
.beat-category-pill[data-category='HUGE_GAME']     { color: oklch(0.78 0.18 92); }
.beat-category-pill[data-category='BENCH_BLUNDER'] { color: var(--accent-secondary); }

.beat-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}
.beat-item-headline {
  margin: 0;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 700;
  font-size: 1.05rem;
  line-height: 1.3;
  color: var(--ink-1);
  letter-spacing: -0.003em;
}
.beat-item[data-importance='high'] .beat-item-headline {
  font-size: 1.18rem;
  font-weight: 800;
}
.beat-item-body {
  margin: 0;
  font-size: 0.92rem;
  line-height: 1.45;
  color: var(--ink-2);
}

/* ─── Widgets ─────────────────────────────────────────────────── */
.beat-widget {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding-top: 2px;
}
.beat-widget-chip {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 6px;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: 0.88rem;
  letter-spacing: 0.02em;
  font-variant-numeric: tabular-nums;
  background: oklch(0.13 0.015 90);
  color: var(--ink-1);
}
.beat-widget-chip[data-tone='win']  { color: oklch(0.86 0.16 145); }
.beat-widget-chip[data-tone='loss'] { color: oklch(0.85 0.20 350); }
.beat-widget-avatar {
  width: 26px;
  height: 26px;
  border-radius: 7px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--ink-1);
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: 0.68rem;
  overflow: hidden;
  flex: 0 0 auto;
}
.beat-widget-avatar .avatar-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.beat-widget-player {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background: oklch(0.18 0.015 90);
  flex: 0 0 auto;
}
.beat-widget-player-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.beat-widget-player-initials {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: 0.66rem;
  letter-spacing: 0.04em;
  color: var(--ink-1);
}

/* ─── Mobile ──────────────────────────────────────────────────── */
@media (max-width: 720px) {
  .beat-item {
    grid-template-columns: 1fr auto;
    grid-template-areas:
      'time pill'
      'content content'
      'widget widget';
    gap: 8px;
  }
  .beat-time { grid-area: time; }
  .beat-category-pill { grid-area: pill; justify-self: end; }
  .beat-content { grid-area: content; }
  .beat-widget { grid-area: widget; }

  .beat-item-featured {
    grid-template-columns: 1fr;
    grid-template-areas:
      'portrait'
      'header'
      'content';
    column-gap: 0;
    padding: 20px 14px 24px;
    margin: 4px -10px;
  }
  .beat-feature-portrait {
    width: 72px;
    height: 72px;
  }
  .beat-feature-avatar {
    width: 58px;
    height: 58px;
  }
  .beat-feature-avatar-back {
    width: 42px;
    height: 42px;
    top: 22px;
    left: 30px;
  }
  .beat-item-featured .beat-item-headline { font-size: 1.18rem; }
}
</style>
