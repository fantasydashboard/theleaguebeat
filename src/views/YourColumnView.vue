<template>
  <div class="your-column">
    <!-- Live load banner -->
    <LiveLoadError v-if="liveError" :message="liveError" :platform-label="platformLabel" />

    <!-- Loading guard. In strict live mode we MUST wait for the adapter
         before rendering — without this, the fixture team names leak into
         the real league's column. Mirrors the Beat and Issue guards. -->
    <div
      v-else-if="isStrictLiveMode && !liveData && !liveError"
      class="yc-loading"
      role="status"
      aria-live="polite"
    >
      <div class="yc-loading-bar" aria-hidden="true">
        <span class="yc-loading-bar-fill"></span>
      </div>
      <div class="yc-loading-stage">
        <div class="yc-loading-logo-shadow">
          <div class="yc-loading-logo" aria-hidden="true">
            <img src="/tlb-favicon.png" alt="" />
          </div>
        </div>
        <p class="yc-loading-title">Pulling your column.</p>
        <p class="yc-loading-sub">{{ loadingSubline }}</p>
      </div>
    </div>

    <template v-else>
      <header class="yc-head">
        <p class="yc-eyebrow">
          <span class="yc-eyebrow-bar" aria-hidden="true"></span>
          Your Column
        </p>
        <h1 class="yc-headline">{{ viewerTeamName || leagueName }}</h1>
      </header>

      <!-- Guest team picker — shown when no team can be resolved -->
      <section v-if="!viewerTeamId" class="yc-picker" aria-label="Pick your team">
        <p class="yc-picker-title">Which team is yours?</p>
        <div class="yc-picker-grid">
          <button
            v-for="t in teams"
            :key="t.id"
            type="button"
            class="yc-picker-team"
            @click="pickTeam(t.id)"
          >
            <span
              class="yc-picker-avatar"
              :style="{ background: `linear-gradient(135deg, ${t.avatarColor})` }"
            >
              <img v-if="t.avatarUrl" :src="t.avatarUrl" alt="" />
              <span v-else>{{ t.ownerInitials }}</span>
            </span>
            <span class="yc-picker-name">{{ t.name }}</span>
          </button>
        </div>
      </section>

      <!-- The column blocks -->
      <template v-else-if="column">
        <p v-if="isGuestPick" class="yc-claim">
          Reading <strong>{{ viewerTeamName }}</strong>.
          <a href="#" @click.prevent="onClaim">Make this yours</a>
        </p>
        <section
          v-for="block in renderedBlocks"
          :key="block.label"
          class="yc-block"
        >
          <p class="yc-block-label">{{ block.label }}</p>
          <p v-if="block.eyebrow" class="yc-block-eyebrow">{{ block.eyebrow }}</p>
          <h2 class="yc-block-headline">{{ block.headline }}</h2>
          <p v-if="block.body" class="yc-block-body">{{ block.body }}</p>
          <ul v-if="block.chips && block.chips.length" class="yc-block-chips">
            <li v-for="(c, i) in block.chips" :key="i">
              <span class="yc-chip-num">{{ c.value }}</span>
              <span class="yc-chip-label">{{ c.label }}</span>
            </li>
          </ul>
        </section>
      </template>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, shallowRef, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { sleeperLeagueToCategoryData } from '@/editorial/adapters/sleeperAdapter'
import { espnLeagueToCategoryData } from '@/editorial/adapters/espnAdapter'
import { yahooLeagueToCategoryData } from '@/editorial/adapters/yahooAdapter'
import type { LeagueData } from '@/editorial/types'
import { useLeaguesStore } from '@/stores/leaguesNew'
import { usePlatformsStore } from '@/stores/platforms'
import LiveLoadError from '@/components/demo/LiveLoadError.vue'
import { useViewerTeam } from '@/composables/useViewerTeam'
import { buildYourColumn } from '@/editorial/yourColumn/buildYourColumn'

const route = useRoute()
const router = useRouter()
const leaguesStore = useLeaguesStore()

/* ─────────────────────────────────────────────────────────────────
   LIVE DATA — copied verbatim from BeatFeedView's hydration block.
   No format gate: both h2h-category and h2h-points are assigned
   directly to liveData and passed to buildYourColumn.
───────────────────────────────────────────────────────────────── */

const liveData = shallowRef<LeagueData | null>(null)
const liveError = ref<string | null>(null)
const liveLoading = ref(false)

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

const leagueName = computed(() => {
  const live = strictLeagueRecord.value?.league_name
  if (live) return live
  return 'Your league'
})

const loadingSubline = computed(() => {
  const league = strictLeagueRecord.value?.league_name
  if (league) return `Pulling ${league} from ${platformLabel.value}.`
  return `Pulling your column from ${platformLabel.value}.`
})

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

async function loadColumn() {
  if (isStrictLiveMode.value && leaguesStore.leagues.length === 0) {
    try {
      await leaguesStore.fetchLeagues()
    } catch (err) {
      console.warn('[YourColumnView] fetchLeagues failed:', err)
    }
  }

  // Reset prior state when switching leagues — same pattern as BeatFeedView.
  liveData.value = null
  liveError.value = null

  const id = liveLeagueId.value
  const platform = livePlatform.value
  if (!id || (platform !== 'sleeper' && platform !== 'espn' && platform !== 'yahoo')) {
    if (isStrictLiveMode.value) {
      liveError.value =
        "This league couldn't be resolved. Try refreshing, or reconnect it from the home page."
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

    // No format gate — both h2h-category and h2h-points go straight to liveData.
    // buildYourColumn handles both via the `format` discriminator internally.
    liveData.value = data

    // Backfill stale league name on the row (fire-and-forget).
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
  void loadColumn()
})

// Watch for league-switcher navigation — the component instance is reused
// when the user switches leagues (same route component, different :leagueId).
watch(
  () => route.params.leagueId,
  (next, prev) => {
    if (next === prev) return
    void loadColumn()
  },
)

/* ─────────────────────────────────────────────────────────────────
   VIEWER TEAM + COLUMN
───────────────────────────────────────────────────────────────── */

const teams = computed(() => liveData.value?.teams ?? [])
const leagueKey = computed(() =>
  typeof route.params.leagueId === 'string' ? route.params.leagueId : '',
)
const { viewerTeamId, isGuestPick, pickTeam } = useViewerTeam(
  () => teams.value,
  () => leagueKey.value,
)
const viewerTeamName = computed(
  () => teams.value.find((t) => t.id === viewerTeamId.value)?.name ?? '',
)

const column = computed(() => {
  if (!liveData.value || !viewerTeamId.value) return null
  return buildYourColumn(liveData.value as LeagueData, viewerTeamId.value)
})

const renderedBlocks = computed(() =>
  column.value
    ? [column.value.hero, column.value.matchup, column.value.rival, column.value.arc].filter(
        Boolean,
      )
    : [],
)

/* ─────────────────────────────────────────────────────────────────
   CLAIM / SIGN-UP NUDGE
   Routes guests toward /signup (the app's sign-in entry point).
   The sign-in flow under /auth/callback handles the full OAuth
   return; /signup is the marketing-friendly entry page. If neither
   the leagueId nor a user session exists, routing to /signup is
   graceful — the user lands on the connect picker without losing
   context.
───────────────────────────────────────────────────────────────── */

function onClaim() {
  void router.push({ name: 'signup-page' })
}
</script>

<style scoped>
/* Tokens (--ink-N, --accent-*) inherited from layout. */
.your-column {
  display: flex;
  flex-direction: column;
  gap: 40px;
  font-family: 'Barlow', sans-serif;
  color: var(--ink-1);
  padding: 32px 0 80px;
}

/* ─── LOADING STATE ────────────────────────────────────────────── */
/* Mirrors the Beat / Issue loading treatment: wobble lockup,
   indeterminate progress bar, ambient glow. Keeps all three
   surfaces feeling like the same publication. */
.yc-loading {
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
}
.yc-loading-bar {
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
.yc-loading-bar-fill {
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
  animation: yc-loading-slide 1.4s cubic-bezier(0.65, 0, 0.35, 1) infinite;
}
@keyframes yc-loading-slide {
  0%   { transform: translateX(-100%); }
  100% { transform: translateX(350%); }
}
.yc-loading-stage {
  max-width: 560px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.yc-loading-logo-shadow {
  margin: 0 0 28px;
  filter: drop-shadow(0 12px 32px oklch(0 0 0 / 0.45));
}
.yc-loading-logo {
  position: relative;
  width: 88px;
  height: 88px;
  perspective: 800px;
}
.yc-loading-logo img {
  width: 100%;
  height: 100%;
  display: block;
  border-radius: 18px;
  animation:
    yc-logo-in 320ms cubic-bezier(0.23, 1, 0.32, 1) both,
    yc-logo-spin 2.4s cubic-bezier(0.65, 0, 0.35, 1) infinite 320ms;
}
@keyframes yc-logo-in {
  0%   { opacity: 0; transform: scale(0.85); }
  100% { opacity: 1; transform: scale(1); }
}
@keyframes yc-logo-spin {
  0%, 100% { transform: rotateY(-50deg); }
  50%      { transform: rotateY( 50deg); }
}
.yc-loading-title {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: clamp(1.8rem, 3.4vw, 2.6rem);
  line-height: 1.05;
  letter-spacing: -0.014em;
  color: var(--ink-1);
  margin: 0 0 10px;
  animation: yc-text-in 360ms cubic-bezier(0.23, 1, 0.32, 1) 320ms both;
}
.yc-loading-sub {
  font-size: 1rem;
  line-height: 1.5;
  color: var(--ink-3);
  margin: 0;
  max-width: 42ch;
  animation: yc-text-in 360ms cubic-bezier(0.23, 1, 0.32, 1) 400ms both;
}
@keyframes yc-text-in {
  from { opacity: 0; transform: translateY(4px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* ─── HEADER ───────────────────────────────────────────────────── */
.yc-head {
  max-width: 720px;
}
.yc-eyebrow {
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
.yc-eyebrow-bar {
  width: 24px;
  height: 1px;
  background: var(--accent-secondary);
}
.yc-headline {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: clamp(2.25rem, 5vw, 3.4rem);
  line-height: 0.94;
  letter-spacing: -0.012em;
  color: var(--ink-1);
  margin: 0;
}

/* ─── CLAIM BAR ────────────────────────────────────────────────── */
/* Shown when the viewer is a guest who picked a team but hasn't
   authenticated. Soft nudge toward signing up. */
.yc-claim {
  font-size: 0.94rem;
  color: var(--ink-3);
  margin: 0;
  line-height: 1.5;
}
.yc-claim strong {
  color: var(--ink-2);
  font-weight: 700;
}
.yc-claim a {
  color: var(--accent-secondary);
  text-decoration: none;
  font-weight: 700;
}
.yc-claim a:hover {
  text-decoration: underline;
}

/* ─── TEAM PICKER ──────────────────────────────────────────────── */
.yc-picker {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.yc-picker-title {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: 1.18rem;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--ink-2);
  margin: 0;
}
.yc-picker-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 10px;
}
.yc-picker-team {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  background: oklch(0.10 0.013 90);
  border: 1px solid oklch(0.18 0.015 90);
  border-radius: 12px;
  cursor: pointer;
  text-align: left;
  transition:
    background-color 160ms cubic-bezier(0.22, 1, 0.36, 1),
    border-color 160ms cubic-bezier(0.22, 1, 0.36, 1),
    transform 160ms cubic-bezier(0.22, 1, 0.36, 1);
}
.yc-picker-team:active {
  transform: scale(0.98);
  transition-duration: 100ms;
}
@media (hover: hover) and (pointer: fine) {
  .yc-picker-team:hover {
    background: oklch(0.13 0.015 90);
    border-color: var(--accent-secondary);
  }
}
.yc-picker-avatar {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: 0.82rem;
  color: var(--ink-1);
  overflow: hidden;
  flex: 0 0 auto;
}
.yc-picker-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.yc-picker-name {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 700;
  font-size: 1rem;
  color: var(--ink-1);
  line-height: 1.2;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ─── COLUMN BLOCKS ────────────────────────────────────────────── */
/* Each block is a contained editorial card: label in the accent,
   eyebrow in caps, display headline, optional body + chips. The
   stagger-in animation mirrors the Beat's day-group entrance. */
.yc-block {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 28px 28px 24px;
  background: oklch(0.09 0.013 90);
  border: 1px solid oklch(0.18 0.015 90);
  border-radius: 16px;
  max-width: 720px;
  animation: yc-block-in 360ms cubic-bezier(0.23, 1, 0.32, 1) both;
}
.your-column > .yc-block:nth-of-type(2) { animation-delay: 60ms; }
.your-column > .yc-block:nth-of-type(3) { animation-delay: 120ms; }
.your-column > .yc-block:nth-of-type(n+4) { animation-delay: 180ms; }
@keyframes yc-block-in {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
@media (prefers-reduced-motion: reduce) {
  .yc-block { animation: none; }
}
.yc-block-label {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: 0.72rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--accent-secondary);
  margin: 0;
}
.yc-block-eyebrow {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 700;
  font-size: 0.78rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--accent-tertiary);
  margin: 0;
}
.yc-block-headline {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: clamp(1.5rem, 3.2vw, 2.2rem);
  line-height: 1.0;
  letter-spacing: -0.010em;
  color: var(--ink-1);
  margin: 4px 0 0;
}
.yc-block-body {
  font-size: 0.98rem;
  line-height: 1.52;
  color: var(--ink-2);
  margin: 6px 0 0;
  max-width: 56ch;
}

/* ─── STAT CHIPS ───────────────────────────────────────────────── */
/* Reuse the IssueView cover-stat idiom: number in large display
   weight, label below in small caps. The whole row is a horizontal
   scroll trap at narrow widths. */
.yc-block-chips {
  list-style: none;
  padding: 0;
  margin: 12px 0 0;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.yc-block-chips li {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 10px 18px;
  background: oklch(0.13 0.015 90);
  border: 1px solid oklch(0.20 0.015 90);
  border-radius: 10px;
  min-width: 72px;
}
.yc-chip-num {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 1.32rem;
  line-height: 1;
  letter-spacing: -0.01em;
  color: var(--ink-1);
  font-variant-numeric: tabular-nums;
}
.yc-chip-label {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 700;
  font-size: 0.66rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--ink-3);
  margin-top: 3px;
}

/* ─── MOBILE ───────────────────────────────────────────────────── */
@media (max-width: 600px) {
  .yc-picker-grid {
    grid-template-columns: 1fr 1fr;
  }
  .yc-block {
    padding: 20px 18px 18px;
  }
  .yc-block-chips {
    gap: 6px;
  }
  .yc-block-chips li {
    padding: 8px 14px;
    min-width: 60px;
  }
}
</style>
