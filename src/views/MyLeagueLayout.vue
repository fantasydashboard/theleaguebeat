<template>
  <div class="league-shell">
    <!-- Sticky top bar: identifies which of your leagues is loaded
         and surfaces the switcher when you have more than one. -->
    <header class="league-bar" role="banner">
      <div class="league-bar-inner">
        <div class="league-bar-left">
          <!-- Masthead — TLB monogram, always-visible, clickable to /.
               Plays the "you're inside The League Beat" role on every
               working page. Wayfinding ("Your league" pill) lives next
               to it; the two are different signals stacked side by side. -->
          <router-link to="/" class="league-bar-brand" aria-label="The League Beat — back to home">
            <img src="/tlb-favicon.png" alt="The League Beat" class="league-bar-brand-mark" />
          </router-link>
          <span class="league-bar-pill" aria-label="Live league experience">
            <span class="league-bar-dot" aria-hidden="true"></span>
            Your league
          </span>

          <!-- Switcher trigger -->
          <button
            v-if="leaguesStore.leagues.length > 0"
            type="button"
            class="league-switch-trigger"
            :aria-expanded="switcherOpen"
            aria-haspopup="listbox"
            @click="toggleSwitcher"
          >
            <span class="league-switch-name">
              {{ activeLeague?.league_name || 'Choose a league' }}
            </span>
            <span class="league-switch-meta" v-if="activeLeague">
              {{ platformLabel(activeLeague.platform) }} · {{ activeLeague.sport }}
            </span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>

          <span v-else class="league-bar-name">No connected leagues yet.</span>
        </div>

        <div class="league-bar-right">
          <router-link to="/" class="league-bar-back">Back to homepage</router-link>
          <router-link to="/demo-categories/connect" class="league-bar-cta">
            Connect another
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </router-link>
        </div>
      </div>

      <!-- Switcher dropdown -->
      <div
        v-if="switcherOpen"
        class="league-switch-menu"
        role="listbox"
        :aria-label="`${leaguesStore.leagues.length} connected leagues`"
        @click.stop
      >
        <!-- Current season only, grouped by sport. A switcher is for
             getting to the league you are reading THIS week; fifteen
             rows spanning four years buries that. Earlier seasons stay
             one click away below. -->
        <div
          v-for="block in currentSportBlocks"
          :key="block.sport"
          class="league-switch-block"
        >
          <p class="league-switch-block-label">{{ block.sport }}</p>
          <div
            v-for="group in block.groups"
            :key="group.key"
            class="league-switch-row"
          >
            <button
              type="button"
              class="league-switch-line"
              :class="{ 'is-current': group.current.id === activeLeague?.id }"
              role="option"
              :aria-selected="group.current.id === activeLeague?.id"
              @click="pickLeague(group.current.id)"
            >
              <img
                :src="platformLogo(group.current.platform)"
                :alt="platformLabel(group.current.platform)"
                class="league-switch-logo"
                width="20"
                height="20"
              />
              <span class="league-switch-name">{{ group.current.league_name }}</span>
              <span class="league-switch-year">{{ group.current.season }}</span>
            </button>
            <button
              type="button"
              class="league-switch-remove"
              :aria-label="`Remove ${group.current.league_name}`"
              :title="`Remove ${group.current.league_name}`"
              @click.stop="confirmRemove(group.current)"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true">
                <path d="M18 6 6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>
        </div>

        <!-- Earlier seasons, collapsed. Counted so the button says what
             it will reveal rather than being a mystery. -->
        <button
          v-if="earlierLeagues.length > 0 && !showEarlier"
          type="button"
          class="league-switch-more"
          @click="showEarlier = true"
        >
          Earlier seasons ({{ earlierLeagues.length }})
        </button>

        <div v-if="showEarlier && earlierLeagues.length" class="league-switch-block">
          <p class="league-switch-block-label">Earlier seasons</p>
          <div
            v-for="league in earlierLeagues"
            :key="league.id"
            class="league-switch-row"
          >
            <button
              type="button"
              class="league-switch-line league-switch-line-past"
              :class="{ 'is-current': league.id === activeLeague?.id }"
              role="option"
              :aria-selected="league.id === activeLeague?.id"
              @click="pickLeague(league.id)"
            >
              <img
                :src="platformLogo(league.platform)"
                :alt="platformLabel(league.platform)"
                class="league-switch-logo"
                width="20"
                height="20"
              />
              <span class="league-switch-name">{{ league.league_name }}</span>
              <span class="league-switch-year">{{ league.season }}</span>
            </button>
            <button
              type="button"
              class="league-switch-remove"
              :aria-label="`Remove ${league.league_name} ${league.season}`"
              @click.stop="confirmRemove(league)"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true">
                <path d="M18 6 6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>
        </div>

        <router-link
          to="/demo-categories/connect"
          class="league-switch-item league-switch-add"
          @click="closeSwitcher"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>
          Connect another league
        </router-link>
      </div>
    </header>

    <!-- Magazine masthead nav. Three top-level sections — THE BEAT
         (daily home), THE ISSUE (weekly analysis: power rankings,
         matchups, draft), CHRONICLES (history + archive). A second
         row appears underneath when the user is inside ISSUE or
         CHRONICLES, surfacing the sub-page tabs.

         Underlying routes are unchanged — the 6 leaf pages still
         live at /power-rankings, /matchups, etc. The nav restructure
         is presentation-only so deep links keep working. -->
    <nav class="league-nav" aria-label="League sections">
      <div class="league-nav-inner">
        <router-link
          class="league-nav-tab"
          :to="`/leagues/${routeLeagueId}/your-column`"
          :class="{ 'league-nav-tab-active': activeSection === 'column' }"
        >Your Column</router-link>
        <router-link
          class="league-nav-tab"
          :to="`/leagues/${routeLeagueId}/the-beat`"
          :class="{ 'league-nav-tab-active': activeSection === 'beat' }"
        >The Beat</router-link>
        <router-link
          class="league-nav-tab"
          :to="`/leagues/${routeLeagueId}/the-issue`"
          :class="{ 'league-nav-tab-active': activeSection === 'issue' }"
        >The Issue</router-link>
        <router-link
          class="league-nav-tab"
          :to="`/leagues/${routeLeagueId}/chronicles`"
          :class="{ 'league-nav-tab-active': activeSection === 'chronicles' }"
        >Chronicles</router-link>
      </div>
    </nav>

    <nav
      v-if="subNav.length > 0"
      class="league-subnav"
      :aria-label="`${activeSection === 'issue' ? 'The Issue' : 'Chronicles'} pages`"
    >
      <div class="league-subnav-inner">
        <router-link
          v-for="tab in subNav"
          :key="tab.path"
          class="league-subnav-tab"
          :to="`/leagues/${routeLeagueId}/${tab.path}`"
          active-class="league-subnav-tab-active"
        >{{ tab.label }}</router-link>
      </div>
    </nav>

    <!-- Magazine masthead — reads live issue context from the
         useIssueStore (set by whichever view loaded the league).
         Falls back to cached league-row data for first-paint state
         before the view's adapter populates the store.
         On the new Issue route, we override the display week to
         currentWeek - 1 so the masthead reflects the most-recently
         published issue (not the in-progress week). -->
    <IssueMasthead
      v-if="showMasthead"
      :fallback-week="mastheadFallback?.week"
      :fallback-season="mastheadFallback?.season"
      :fallback-founded-season="mastheadFoundedSeason"
      :fallback-updated="mastheadUpdatedAt"
      :league-id="routeLeagueId || undefined"
      :show-published-issue="onIssuePage"
    />

    <main class="league-main">
      <UnsupportedLeagueNotice
        v-if="isUnsupportedLeague && supportStatus.ok === false"
        :kind="supportStatus.kind"
        :sport="supportStatus.sport"
        :scoring-type="supportStatus.scoringType"
        @open-signup="$emit('open-signup')"
      />
      <router-view v-else @open-signup="$emit('open-signup')" />
    </main>

    <TLBFooter />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { groupLeaguesBySeason, platformLogo } from '@/utils/leagueGrouping'
import { useRoute, useRouter } from 'vue-router'
import { useLeaguesStore } from '@/stores/leaguesNew'
import { useAuthStore } from '@/stores/auth'
import IssueMasthead from '@/components/issue/IssueMasthead.vue'
import TLBFooter from '@/components/TLBFooter.vue'
import { useIssueStore } from '@/stores/issueState'
import { leagueFoundedSeason } from '@/utils/leagueAge'
import { classifyLeagueSupport } from '@/utils/leagueSupport'
import UnsupportedLeagueNotice from '@/components/league/UnsupportedLeagueNotice.vue'

defineEmits<{ (e: 'open-signup'): void }>()

const route = useRoute()
const router = useRouter()
const leaguesStore = useLeaguesStore()
const authStore = useAuthStore()

const switcherOpen = ref(false)

/** Seasons of one league collapse into a single entry, shared with the
 *  connect screen so both answer "which rows are the same league" the
 *  same way. */
const leagueGroups = computed(() => groupLeaguesBySeason(leaguesStore.leagues))

const showEarlier = ref(false)

/**
 * The season the switcher treats as "now" — the newest any connected
 * league reaches, not the calendar year. A user who has not connected
 * anything this year still gets a populated switcher rather than an
 * empty one above a "show earlier" button.
 */
const latestSeason = computed(() => {
  const seasons = leaguesStore.leagues
    .map((l) => Number(l.season))
    .filter((n) => Number.isFinite(n))
  return seasons.length ? Math.max(...seasons) : null
})

const SPORT_ORDER = ['football', 'baseball', 'basketball', 'hockey'] as const

/** Current-season leagues, bucketed by sport. Sports appear in a fixed
 *  order so the list does not reshuffle as leagues come and go. */
const currentSportBlocks = computed(() => {
  const season = latestSeason.value
  const groups = leagueGroups.value.filter(
    (g) => season == null || Number(g.current.season) === season,
  )
  const bySport = new Map<string, typeof groups>()
  for (const g of groups) {
    const sport = String(g.current.sport ?? 'other')
    const list = bySport.get(sport) ?? []
    list.push(g)
    bySport.set(sport, list)
  }
  return [...bySport.entries()]
    .map(([sport, list]) => ({
      sport,
      groups: list.sort((a, b) =>
        (a.current.league_name ?? '').localeCompare(b.current.league_name ?? ''),
      ),
    }))
    .sort((a, b) => {
      const ai = SPORT_ORDER.indexOf(a.sport as (typeof SPORT_ORDER)[number])
      const bi = SPORT_ORDER.indexOf(b.sport as (typeof SPORT_ORDER)[number])
      return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi)
    })
})

/** Everything not in the current season, newest first. Flat rather than
 *  grouped: this is an archive to dip into, not a list to browse. */
const earlierLeagues = computed(() => {
  const season = latestSeason.value
  if (season == null) return []
  return leaguesStore.leagues
    .filter((l) => Number(l.season) !== season)
    .sort(
      (a, b) =>
        Number(b.season) - Number(a.season) ||
        (a.league_name ?? '').localeCompare(b.league_name ?? ''),
    )
})

/**
 * Removing a league is destructive and the row sits next to the one
 * that switches to it, so it confirms first. Reconnecting takes a
 * username, which is why this deletes rather than hides.
 */
async function confirmRemove(league: { id: string; league_name: string }): Promise<void> {
  const ok = window.confirm(
    `Remove ${league.league_name} from The League Beat?\n\n` +
    `Its issues stop being generated. You can reconnect it any time.`,
  )
  if (!ok) return
  const wasActive = league.id === routeLeagueId.value
  const removed = await leaguesStore.removeLeague(league.id)
  if (!removed) return
  closeSwitcher()
  // Standing on the page for a league that no longer exists would show
  // "couldn't be resolved"; move somewhere real instead.
  if (wasActive) {
    const next = leaguesStore.leagues[0]
    void router.push(next ? `/leagues/${next.id}/the-beat` : '/demo-categories/connect')
  }
}

// The league UUID currently in the URL — drives the nav tab links so
// they preserve context as the user clicks between pages.
const routeLeagueId = computed(
  () => (route.params.leagueId as string | undefined) ?? leaguesStore.activeLeagueId ?? '',
)

const activeLeague = computed(() =>
  leaguesStore.leagues.find((l) => l.id === routeLeagueId.value) ?? null,
)

/* ─────────────────────────────────────────────────────────────────
   3-section nav model.

   Top-level tabs map to 3 buckets, each of which contains one or
   more underlying routes. Active section is derived from the current
   route path; the sub-nav row is the bucket's contents (empty for
   THE BEAT since it's a single view).
───────────────────────────────────────────────────────────────── */

type SectionKey = 'column' | 'beat' | 'issue' | 'chronicles'

const ISSUE_PATHS = ['the-issue', 'power-rankings', 'matchups', 'draft'] as const
const CHRONICLES_PATHS = ['chronicles', 'history', 'archive'] as const

const activeSection = computed<SectionKey>(() => {
  // Match path SEGMENTS so deep routes (e.g. /the-issue/:weekNumber)
  // still resolve to their section. The previous endsWith check
  // missed those and fell through to 'beat'.
  const segments = route.path.split('/').filter(Boolean)
  if (segments.includes('your-column')) return 'column'
  if (ISSUE_PATHS.some((slug) => segments.includes(slug))) return 'issue'
  if (CHRONICLES_PATHS.some((slug) => segments.includes(slug))) return 'chronicles'
  return 'beat'
})

const subNav = computed<Array<{ path: string; label: string }>>(() => {
  if (activeSection.value === 'issue') {
    // The Issue is one cohesive magazine spread. PR / Matchups /
    // Draft live AS SECTIONS within it (not as sub-tabs). Direct
    // URLs to the legacy dashboard views still resolve — they're
    // "deeper-view" cross-links from within the Issue.
    return []
  }
  if (activeSection.value === 'chronicles') {
    // Two-tab structure: Chronicles IS the editorial archive
    // (year-cards + eras + receipts), Past Issues is the issue
    // library. The previous third tab (a hub linking to its own
    // siblings) was circular UX.
    return [
      { path: 'chronicles', label: 'Chronicles' },
      { path: 'archive',    label: 'Past issues' },
    ]
  }
  return []
})

/* ─────────────────────────────────────────────────────────────────
   Coverage gate — TLB renders the full editorial pipeline ONLY for
   H2H Categories baseball today. For any other league type (roto,
   points, football, other sports) we surface a magazine-voiced
   "not yet" notice in place of the view content. This protects
   readers from broken cat-shaped editorial and gives us a clean
   waitlist signal for the formats we haven't built yet.
───────────────────────────────────────────────────────────────── */
const supportStatus = computed(() => classifyLeagueSupport(activeLeague.value))
const isUnsupportedLeague = computed(() => supportStatus.value.ok === false)

/* ─────────────────────────────────────────────────────────────────
   Masthead fallback — feeds the masthead its first-paint state from
   the cached `leagues` row before the active view's adapter loads
   and writes the live week/season into the issue store. Pulled from
   `settings.current_week` if present; otherwise the masthead's "ISSUE"
   number renders empty until live data arrives.
───────────────────────────────────────────────────────────────── */
const mastheadFallback = computed(() => {
  const league = activeLeague.value
  if (!league) return null
  const year = parseSeasonYear(league.season)
  const settings = (league.settings ?? {}) as Record<string, unknown>
  const rawWeek = Number(settings.current_week ?? 0)
  const week = Number.isFinite(rawWeek) && rawWeek > 0 ? rawWeek : undefined
  return { week, season: year }
})

/** Use the league row's `last_synced_at` if present so the
 *  "UPDATED X AGO" timestamp reflects real freshness; otherwise
 *  fall back to now (every visit reads as just-published). */
const mastheadUpdatedAt = computed(() => {
  const ts = activeLeague.value?.last_synced_at
  if (!ts) return new Date()
  const parsed = new Date(ts)
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed
})

/** Earliest season we have stored for this league (same name +
 *  platform). Drives the magazine volume number — Vol 3 in 2026 for
 *  a league we've also stored 2024 + 2025 for. Falls back to the
 *  active league's own season (giving Vol. 1) when no siblings
 *  exist. */
const mastheadFoundedSeason = computed<number | undefined>(() => {
  const league = activeLeague.value
  if (!league) return undefined
  return leagueFoundedSeason(league, leaguesStore.leagues)
})

/** True when the active route is the new Issue page (latest or an
 *  archived week). The masthead flips into "show most-recently-
 *  published issue" mode (currentWeek − 1) so it agrees with the
 *  page's title. Other routes leave it in default mode (in-progress
 *  week). */
const onIssuePage = computed(() => {
  const segments = route.path.split('/').filter(Boolean)
  return segments.includes('the-issue')
})

const issueStore = useIssueStore()
/** True when the masthead should render. On the issue page we hide
 *  it until the IssueView publishes live data — otherwise the
 *  cached `leagues.settings.current_week` row drives `VOL. 3 ·
 *  ISSUE 8` flashes that turn into `VOL. 6 · ISSUE 10` half a
 *  second later, building reader distrust. On every other route
 *  the masthead always shows (fallback or live). */
const showMasthead = computed(() => {
  // Your Column carries its own header band, and the issue/share masthead
  // framing ("Issue 12", "Share issue") doesn't apply to a personal column.
  if (activeSection.value === 'column') return false
  if (!onIssuePage.value) return true
  return issueStore.currentWeek != null
})

function parseSeasonYear(season: unknown): number {
  if (typeof season === 'number') return season
  if (typeof season === 'string') {
    const n = parseInt(season, 10)
    if (!Number.isNaN(n)) return n
  }
  return new Date().getFullYear()
}

onMounted(async () => {
  // Pull the connected-leagues list once the layout mounts. If the
  // user lands here cold (deep link), this is what fills the switcher.
  if (authStore.user?.id && leaguesStore.leagues.length === 0) {
    await leaguesStore.fetchLeagues()
  }
  // Sync the store's active league pointer to whatever's in the URL,
  // so other consumers of the store agree on which league is "current."
  if (routeLeagueId.value && routeLeagueId.value !== leaguesStore.activeLeagueId) {
    const found = leaguesStore.leagues.find((l) => l.id === routeLeagueId.value)
    if (found) leaguesStore.setActiveLeague(routeLeagueId.value)
  }
})

watch(
  () => route.params.leagueId,
  (newId) => {
    if (typeof newId === 'string' && newId && newId !== leaguesStore.activeLeagueId) {
      const found = leaguesStore.leagues.find((l) => l.id === newId)
      if (found) leaguesStore.setActiveLeague(newId)
    }
  },
)

function toggleSwitcher() {
  switcherOpen.value = !switcherOpen.value
}
function closeSwitcher() {
  switcherOpen.value = false
}
function pickLeague(leagueId: string) {
  closeSwitcher()
  if (leagueId === routeLeagueId.value) return
  // Preserve the current page (home/power-rankings/etc) when switching.
  const segments = route.path.split('/')
  const pageSegment = segments[3] || 'home'
  router.push(`/leagues/${leagueId}/${pageSegment}`)
}

function platformLabel(p: string) {
  if (p === 'espn') return 'ESPN'
  if (p === 'yahoo') return 'Yahoo'
  if (p === 'sleeper') return 'Sleeper'
  if (p === 'fantrax') return 'Fantrax'
  return p
}

// Close the switcher when the user clicks anywhere outside it.
function onDocClick(e: MouseEvent) {
  if (!switcherOpen.value) return
  const t = e.target as HTMLElement | null
  if (!t) return
  if (t.closest('.league-switch-trigger') || t.closest('.league-switch-menu')) return
  closeSwitcher()
}
onMounted(() => {
  document.addEventListener('click', onDocClick)
})
</script>

<style scoped>
/* Switcher rows — one line each. The previous version stacked the
   logo above the name because `.league-switch-item` further down sets
   flex-direction: column; these use their own class rather than
   fighting that rule. */
.league-switch-block { display: flex; flex-direction: column; gap: 1px; }
.league-switch-block + .league-switch-block { margin-top: 8px; }
.league-switch-block-label {
  margin: 6px 0 2px;
  padding: 0 10px;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: oklch(0.48 0.010 90);
}
.league-switch-row { display: flex; align-items: center; }
.league-switch-line {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px 10px;
  border-radius: 8px;
  background: transparent;
  border: none;
  cursor: pointer;
  text-align: left;
  color: oklch(0.92 0.005 90);
}
.league-switch-line:hover { background: oklch(0.13 0.015 90); }
.league-switch-line.is-current { background: oklch(0.16 0.02 90); }
.league-switch-line-past { color: oklch(0.72 0.008 90); }
.league-switch-logo {
  width: 20px; height: 20px; border-radius: 5px;
  object-fit: contain; flex-shrink: 0;
}
.league-switch-name {
  flex: 1 1 auto;
  min-width: 0;
  font-size: 0.9rem;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.league-switch-year {
  flex: 0 0 auto;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.74rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: oklch(0.52 0.010 90);
}
.league-switch-remove {
  flex: 0 0 auto;
  display: grid; place-items: center;
  width: 24px; height: 24px; margin-right: 4px;
  border-radius: 6px; cursor: pointer;
  background: transparent; border: 1px solid transparent;
  color: oklch(0.46 0.010 90);
  opacity: 0;
  transition: opacity 120ms ease, color 120ms ease, border-color 120ms ease;
}
/* Revealed on hover or focus so a destructive control is never the
   first thing the eye lands on, but stays keyboard-reachable. */
.league-switch-row:hover .league-switch-remove,
.league-switch-remove:focus-visible { opacity: 1; }
.league-switch-remove:hover {
  color: oklch(0.72 0.20 25);
  border-color: oklch(0.72 0.20 25 / 0.45);
}
.league-switch-more {
  margin: 8px 4px 2px;
  padding: 7px 10px;
  border-radius: 8px;
  cursor: pointer;
  background: transparent;
  border: 1px dashed oklch(0.24 0.015 90);
  color: oklch(0.62 0.010 90);
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.10em;
  text-transform: uppercase;
}
.league-switch-more:hover { color: oklch(0.92 0.005 90); border-color: oklch(0.34 0.015 90); }
.league-shell {
  --ink-1: oklch(0.97 0.005 90);
  --ink-2: oklch(0.78 0.008 90);
  --ink-3: oklch(0.55 0.010 90);
  --ink-4: oklch(0.48 0.012 90);   /* tertiary text (captions, deck, owner names, week labels) — ~5:1 contrast on L=0.08 bg, distinct from --ink-3 */
  --ink-5: oklch(0.20 0.015 90);
  --ink-6: oklch(0.14 0.018 90);
  --ink-7: oklch(0.10 0.015 90);
  --ink-8: oklch(0.08 0.014 90);
  --accent-primary:   oklch(0.78 0.18 92);
  --accent-secondary: oklch(0.70 0.27 350);
  --accent-tertiary:  oklch(0.72 0.18 195);
  --accent-up:        oklch(0.74 0.18 145);
  --accent-down:      oklch(0.65 0.20 25);

  min-height: 100vh;
  background: oklch(0.08 0.014 90);
  color: var(--ink-1);
  font-family: 'Barlow', sans-serif;
}

.league-bar {
  position: sticky;
  top: 0;
  z-index: 100;
  background: oklch(0.06 0.014 90 / 0.96);
  border-bottom: 1px solid oklch(0.20 0.015 90);
  backdrop-filter: blur(6px);
}
.league-bar-inner {
  max-width: 1280px;
  margin: 0 auto;
  padding: 12px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}
.league-bar-left, .league-bar-right { display: inline-flex; align-items: center; gap: 14px; }

/* Masthead — small monogram, persistent across every product page. */
.league-bar-brand {
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
  text-decoration: none;
  border-radius: 8px;
  padding: 2px;
  transition: opacity 140ms cubic-bezier(0.22, 1, 0.36, 1);
}
@media (hover: hover) and (pointer: fine) {
  .league-bar-brand:hover { opacity: 0.85; }
}
.league-bar-brand:active { transform: scale(0.97); transition-duration: 100ms; }
.league-bar-brand:focus-visible {
  outline: 2px solid var(--accent-primary);
  outline-offset: 2px;
}
.league-bar-brand-mark {
  width: 32px;
  height: 32px;
  display: block;
  border-radius: 6px;
}

/* Green pill differentiates "your league" (live) from the teal demo pill. */
.league-bar-pill {
  display: inline-flex; align-items: center; gap: 6px;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.72rem; font-weight: 800;
  letter-spacing: 0.10em; text-transform: uppercase;
  color: var(--accent-up);
  background: oklch(0.74 0.18 145 / 0.10);
  border: 1px solid oklch(0.74 0.18 145 / 0.35);
  padding: 4px 10px;
  border-radius: 999px;
}
.league-bar-dot {
  width: 6px; height: 6px; border-radius: 50%;
  background: var(--accent-up);
}
@media (prefers-reduced-motion: no-preference) {
  @keyframes league-pulse {
    0%, 60%, 100% { opacity: 1; transform: scale(1); }
    30% { opacity: 0.4; transform: scale(1.4); }
  }
  .league-bar-dot { animation: league-pulse 2.4s infinite cubic-bezier(0.22, 1, 0.36, 1); }
}

/* League switcher trigger — looks like a name + meta with a chevron. */
.league-switch-trigger {
  display: inline-flex; align-items: center; gap: 8px;
  background: transparent;
  border: 1px solid oklch(0.20 0.015 90);
  border-radius: 8px;
  padding: 6px 12px;
  color: var(--ink-1);
  font-family: 'Barlow', sans-serif;
  cursor: pointer;
  transition: border-color 160ms cubic-bezier(0.22, 1, 0.36, 1), background-color 160ms cubic-bezier(0.22, 1, 0.36, 1);
}
@media (hover: hover) and (pointer: fine) {
  .league-switch-trigger:hover {
    border-color: oklch(0.32 0.012 90);
    background: oklch(0.10 0.015 90);
  }
}
.league-switch-trigger:active { transform: scale(0.97); transition-duration: 100ms; }
.league-switch-trigger:focus-visible {
  outline: 2px solid var(--accent-primary);
  outline-offset: 2px;
}
.league-switch-name {
  font-size: 0.92rem;
  font-weight: 700;
  color: var(--ink-1);
}
.league-switch-meta {
  font-size: 0.75rem;
  color: var(--ink-3);
}
.league-bar-name {
  font-size: 0.82rem;
  color: var(--ink-3);
  font-weight: 600;
}

/* Dropdown menu */
.league-switch-menu {
  position: absolute;
  top: calc(100% - 1px);
  left: 24px;
  z-index: 110;
  min-width: 320px;
  background: oklch(0.08 0.014 90);
  border: 1px solid oklch(0.20 0.015 90);
  border-radius: 12px;
  padding: 6px;
  box-shadow: 0 12px 40px oklch(0 0 0 / 0.5);
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.league-switch-item {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  padding: 10px 12px;
  border-radius: 8px;
  background: transparent;
  border: none;
  color: var(--ink-1);
  text-align: left;
  font-family: 'Barlow', sans-serif;
  cursor: pointer;
  text-decoration: none;
  transition: background-color 120ms cubic-bezier(0.22, 1, 0.36, 1);
}
@media (hover: hover) and (pointer: fine) {
  .league-switch-item:hover { background: oklch(0.14 0.018 90); }
}
.league-switch-item:active { transform: scale(0.98); transition-duration: 90ms; }
.league-switch-item.is-current { background: oklch(0.78 0.18 92 / 0.10); }
.league-switch-add {
  flex-direction: row;
  align-items: center;
  gap: 8px;
  color: var(--accent-primary);
  font-weight: 700;
  font-size: 0.85rem;
  border-top: 1px solid oklch(0.20 0.015 90);
  margin-top: 4px;
  padding-top: 12px;
}

.league-bar-back {
  font-size: 0.82rem;
  color: oklch(0.55 0.010 90);
  text-decoration: none;
  font-weight: 600;
  transition: color 160ms cubic-bezier(0.22, 1, 0.36, 1);
}
@media (hover: hover) and (pointer: fine) {
  .league-bar-back:hover { color: var(--ink-1); }
}
.league-bar-cta {
  display: inline-flex; align-items: center; gap: 6px;
  background: var(--accent-primary);
  color: oklch(0.10 0.012 90);
  border: none;
  padding: 8px 14px;
  border-radius: 999px;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.84rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  cursor: pointer;
  text-decoration: none;
  transition: transform 180ms cubic-bezier(0.22, 1, 0.36, 1), background-color 180ms cubic-bezier(0.22, 1, 0.36, 1);
}
@media (prefers-reduced-motion: no-preference) {
  .league-bar-cta:hover { transform: translateY(-1px); }
}
.league-bar-cta:active { transform: scale(0.97); transition-duration: 100ms; }

.league-main {
  max-width: 1280px;
  margin: 0 auto;
  /* Reduced top padding from 36px → 20px. The IssueMasthead strip
     already provides its own 12px bottom padding, and individual
     views handle their own internal top spacing — the extra 36px
     was pushing the cover hero well below the fold. */
  padding: 20px 24px 80px;
}

/* Secondary nav: page tabs */
.league-nav {
  position: sticky;
  top: 49px;
  z-index: 90;
  background: oklch(0.07 0.014 90 / 0.94);
  border-bottom: 1px solid oklch(0.18 0.015 90);
  backdrop-filter: blur(6px);
}
.league-nav-inner {
  max-width: 1280px;
  margin: 0 auto;
  padding: 0 24px;
  display: flex;
  align-items: stretch;
  gap: 24px;
  overflow-x: auto;
  scrollbar-width: none;
}
.league-nav-inner::-webkit-scrollbar { display: none; }
.league-nav-tab {
  position: relative;
  display: inline-flex;
  align-items: center;
  padding: 12px 2px 11px;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: 0.10em;
  text-transform: uppercase;
  color: oklch(0.55 0.010 90);
  text-decoration: none;
  white-space: nowrap;
  border-bottom: 2px solid transparent;
  transition: color 160ms cubic-bezier(0.22, 1, 0.36, 1), border-color 160ms cubic-bezier(0.22, 1, 0.36, 1);
  cursor: pointer;
}
@media (hover: hover) and (pointer: fine) {
  .league-nav-tab:hover:not(.league-nav-tab-active) {
    color: var(--ink-1);
  }
}
.league-nav-tab-active {
  color: var(--ink-1);
  border-bottom-color: var(--accent-up);
}
.league-nav-tab:focus-visible {
  outline: 2px solid var(--accent-primary);
  outline-offset: 2px;
  border-radius: 4px;
}

/* Sub-nav row — quieter than the primary nav so it reads as a
   department-level breadcrumb, not a competing tab strip. */
.league-subnav {
  position: sticky;
  top: 96px;
  z-index: 89;
  background: oklch(0.06 0.012 90 / 0.96);
  border-bottom: 1px solid oklch(0.16 0.013 90);
  backdrop-filter: blur(6px);
}
.league-subnav-inner {
  max-width: 1280px;
  margin: 0 auto;
  padding: 0 24px;
  display: flex;
  align-items: stretch;
  gap: 18px;
  overflow-x: auto;
  scrollbar-width: none;
}
.league-subnav-inner::-webkit-scrollbar { display: none; }
.league-subnav-tab {
  position: relative;
  display: inline-flex;
  align-items: center;
  padding: 8px 2px 7px;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.74rem;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: oklch(0.50 0.010 90);
  text-decoration: none;
  white-space: nowrap;
  border-bottom: 2px solid transparent;
  transition: color 160ms cubic-bezier(0.22, 1, 0.36, 1), border-color 160ms cubic-bezier(0.22, 1, 0.36, 1);
}
@media (hover: hover) and (pointer: fine) {
  .league-subnav-tab:hover:not(.league-subnav-tab-active) {
    color: var(--ink-2);
  }
}
.league-subnav-tab-active {
  color: var(--ink-1);
  border-bottom-color: var(--accent-secondary);
}
.league-subnav-tab:focus-visible {
  outline: 2px solid var(--accent-primary);
  outline-offset: 2px;
  border-radius: 4px;
}

@media (max-width: 720px) {
  .league-bar-inner { padding: 10px 16px; gap: 10px; }
  .league-bar-back { display: none; }
  .league-switch-meta { display: none; }
  .league-main { padding: 16px 16px 60px; }
  .league-nav-inner { padding: 0 16px; gap: 18px; }
  .league-nav-tab { font-size: 0.76rem; padding: 10px 2px 9px; }
  .league-nav { top: 45px; }
  .league-subnav { top: 86px; }
  .league-subnav-inner { padding: 0 16px; gap: 14px; }
  .league-subnav-tab { font-size: 0.68rem; padding: 7px 2px 6px; }
  .league-switch-menu { left: 16px; right: 16px; min-width: 0; }
}
</style>
