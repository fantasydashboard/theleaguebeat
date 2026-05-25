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
        <button
          v-for="league in leaguesStore.leagues"
          :key="league.id"
          type="button"
          class="league-switch-item"
          :class="{ 'is-current': league.id === activeLeague?.id }"
          role="option"
          :aria-selected="league.id === activeLeague?.id"
          @click="pickLeague(league.id)"
        >
          <span class="league-switch-item-name">{{ league.league_name }}</span>
          <span class="league-switch-item-meta">
            {{ platformLabel(league.platform) }} · {{ league.sport }} · {{ league.season }}
          </span>
        </button>
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

    <!-- Secondary nav: page tabs scoped to the active league's UUID. -->
    <nav class="league-nav" aria-label="League pages">
      <div class="league-nav-inner">
        <router-link
          class="league-nav-tab"
          :to="`/leagues/${routeLeagueId}/home`"
          active-class="league-nav-tab-active"
        >Home</router-link>
        <router-link
          class="league-nav-tab"
          :to="`/leagues/${routeLeagueId}/power-rankings`"
          active-class="league-nav-tab-active"
        >Power Rankings</router-link>
        <router-link
          class="league-nav-tab"
          :to="`/leagues/${routeLeagueId}/matchups`"
          active-class="league-nav-tab-active"
        >Matchups</router-link>
        <router-link
          class="league-nav-tab"
          :to="`/leagues/${routeLeagueId}/draft`"
          active-class="league-nav-tab-active"
        >Draft</router-link>
        <router-link
          class="league-nav-tab"
          :to="`/leagues/${routeLeagueId}/history`"
          active-class="league-nav-tab-active"
        >History</router-link>
        <router-link
          class="league-nav-tab"
          :to="`/leagues/${routeLeagueId}/archive`"
          active-class="league-nav-tab-active"
        >Archive</router-link>
      </div>
    </nav>

    <!-- Magazine masthead — reads live issue context from the
         useIssueStore (set by whichever view loaded the league).
         Falls back to cached league-row data for first-paint state
         before the view's adapter populates the store. -->
    <IssueMasthead
      :fallback-week="mastheadFallback?.week"
      :fallback-season="mastheadFallback?.season"
      :fallback-founded-season="mastheadFoundedSeason"
      :fallback-updated="mastheadUpdatedAt"
      :league-id="routeLeagueId || undefined"
    />

    <main class="league-main">
      <router-view @open-signup="$emit('open-signup')" />
    </main>

    <TLBFooter />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useLeaguesStore } from '@/stores/leaguesNew'
import { useAuthStore } from '@/stores/auth'
import IssueMasthead from '@/components/issue/IssueMasthead.vue'
import TLBFooter from '@/components/TLBFooter.vue'
import { leagueFoundedSeason } from '@/utils/leagueAge'

defineEmits<{ (e: 'open-signup'): void }>()

const route = useRoute()
const router = useRouter()
const leaguesStore = useLeaguesStore()
const authStore = useAuthStore()

const switcherOpen = ref(false)

// The league UUID currently in the URL — drives the nav tab links so
// they preserve context as the user clicks between pages.
const routeLeagueId = computed(
  () => (route.params.leagueId as string | undefined) ?? leaguesStore.activeLeagueId ?? '',
)

const activeLeague = computed(() =>
  leaguesStore.leagues.find((l) => l.id === routeLeagueId.value) ?? null,
)

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
.league-shell {
  --ink-1: oklch(0.97 0.005 90);
  --ink-2: oklch(0.78 0.008 90);
  --ink-3: oklch(0.55 0.010 90);
  --ink-4: oklch(0.32 0.012 90);
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
.league-switch-item-name { font-size: 0.95rem; font-weight: 700; color: var(--ink-1); }
.league-switch-item-meta { font-size: 0.78rem; color: var(--ink-3); }
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
  padding: 36px 24px 80px;
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

@media (max-width: 720px) {
  .league-bar-inner { padding: 10px 16px; gap: 10px; }
  .league-bar-back { display: none; }
  .league-switch-meta { display: none; }
  .league-main { padding: 24px 16px 60px; }
  .league-nav-inner { padding: 0 16px; gap: 18px; }
  .league-nav-tab { font-size: 0.76rem; padding: 10px 2px 9px; }
  .league-nav { top: 45px; }
  .league-switch-menu { left: 16px; right: 16px; min-width: 0; }
}
</style>
