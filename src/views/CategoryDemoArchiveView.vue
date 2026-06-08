<template>
  <div class="archive">
    <!-- Chronicles is a sibling tab in the sub-nav now, not a parent.
         The old "← Chronicles" breadcrumb pointed at a hub that no
         longer exists, so it's gone. -->
    <header class="archive-head">
      <p class="archive-eyebrow">
        <span class="archive-eyebrow-dot" aria-hidden="true"></span>
        Chronicles · Past issues
      </p>
      <h1 class="archive-headline">The issues on the shelf.</h1>
      <p class="archive-deck">
        Each weekly visit during an issue's run earns a slot on the shelf.
        Missed weeks stay empty.
      </p>

      <div v-if="coverCount > 0" class="archive-counts">
        <span class="archive-count">
          <strong>{{ coverCount }}</strong>
          {{ coverCount === 1 ? 'issue' : 'issues' }} collected
        </span>
        <span v-if="leagueCount > 1" class="archive-count archive-count-dim">
          across <strong>{{ leagueCount }}</strong> leagues
        </span>
      </div>
    </header>

    <!-- Empty state — no issues collected on any league yet. Direct
         second-person framing acceptable here for clarity (a single
         "you" beats arch detachment when the user is being told what
         to do next). -->
    <div v-if="coverCount === 0" class="archive-empty">
      <div class="archive-empty-mark" aria-hidden="true">
        <svg width="40" height="48" viewBox="0 0 40 48" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <rect x="4" y="4" width="32" height="40" rx="2"/>
          <line x1="10" y1="14" x2="30" y2="14"/>
          <line x1="10" y1="22" x2="26" y2="22"/>
          <line x1="10" y1="30" x2="22" y2="30"/>
        </svg>
      </div>
      <h2 class="archive-empty-headline">No issues yet.</h2>
      <p class="archive-empty-body">
        The shelf starts filling once you visit during an issue's live week.
        Next Monday is the next issue.
      </p>
    </div>

    <!-- One section per league — each league is its own "publication"
         on the shelf, with the active league first. Seasons stack
         within a league, newest first. -->
    <section
      v-for="col in collections"
      :key="col.key"
      class="archive-league"
    >
      <header class="archive-league-head">
        <div class="archive-league-id">
          <h2 class="archive-league-name">{{ col.name }}</h2>
          <span v-if="col.platform || col.sport" class="archive-league-meta">
            <span v-if="col.platform">{{ platformLabel(col.platform) }}</span>
            <template v-if="col.platform && col.sport"> · </template>
            <span v-if="col.sport" class="archive-league-sport">{{ col.sport }}</span>
          </span>
        </div>
        <span v-if="col.isActive" class="archive-league-viewing">Viewing</span>
      </header>

      <div
        v-for="sb in col.seasons"
        :key="sb.season"
        class="archive-season"
      >
        <header class="archive-season-head">
          <h3 class="archive-season-title">{{ sb.season }} Season</h3>
          <p class="archive-season-stats">{{ sb.claimedCount }} / {{ sb.totalCount }} collected</p>
        </header>

        <div class="archive-shelf">
          <div
            v-for="entry in sb.entries"
            :key="entry.cover.id"
            class="archive-slot"
            :aria-label="`Issue ${entry.cover.issueWeek}, ${entry.cover.headline}`"
          >
            <MagazineCoverThumbnail
              :cover="entry.cover"
              :state="entry.state"
              :vol="sb.vol"
            />
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import MagazineCoverThumbnail from '@/components/issue/MagazineCoverThumbnail.vue'
import {
  getArchivedCovers,
  getClaimedIssues,
  type ArchivedCover,
} from '@/services/coverArchive'
import { useLeaguesStore } from '@/stores/leaguesNew'
import { useIssueStore } from '@/stores/issueState'
import { leagueFoundedSeason } from '@/utils/leagueAge'

const route = useRoute()
const leaguesStore = useLeaguesStore()
const issueStore = useIssueStore()

// `chroniclesBackLink` removed — Chronicles is a sibling tab now, not
// a parent surface.

/** The league whose page we're on (the one the user is "in"). Null on
 *  the demo route. Drives ordering (active first) + "Live now". */
const activeLeagueId = computed<string | null>(() => {
  const fromUrl = route.params.leagueId
  return typeof fromUrl === 'string' && fromUrl ? fromUrl : null
})

/* ─────────────────────────────────────────────────────────────────
   STORAGE — read every league's shelf. Snapshots are keyed by the
   Supabase league UUID (matching what the home view writes); off-route
   the demo shelf lives under 'demo'.
───────────────────────────────────────────────────────────────── */

interface RawShelf {
  covers: ArchivedCover[]
  claims: Set<string>
}
const shelves = ref<Map<string, RawShelf>>(new Map())

function reloadFromStorage() {
  const keys = new Set<string>()
  for (const lg of leaguesStore.leagues) keys.add(lg.id)
  if (activeLeagueId.value) keys.add(activeLeagueId.value)
  // Off-route (demo) shelf only when not viewing a real league.
  if (!activeLeagueId.value) keys.add('demo')

  const map = new Map<string, RawShelf>()
  for (const key of keys) {
    map.set(key, {
      covers: getArchivedCovers(key),
      claims: new Set(getClaimedIssues(key).map((c) => c.id)),
    })
  }
  shelves.value = map
}

onMounted(async () => {
  // Hydrate leagues so we can name every shelf + sit the masthead right.
  if (leaguesStore.leagues.length === 0) {
    await leaguesStore.fetchLeagues().catch(() => { /* silent */ })
  }
  reloadFromStorage()
})

/** Current issue id for the ACTIVE league — drives "Live now". Other
 *  leagues have no known current week here, so they only show
 *  claimed/missed. */
const currentIssueId = computed<string | null>(() => {
  const w = issueStore.currentWeek
  const s = issueStore.currentSeason
  if (!w || !s) return null
  return `${s}-${w}`
})

/* ─────────────────────────────────────────────────────────────────
   COLLECTIONS — group by league, then season within each league.
───────────────────────────────────────────────────────────────── */

interface SeasonBucket {
  season: number
  vol: number
  totalCount: number
  claimedCount: number
  entries: { cover: ArchivedCover; state: 'claimed' | 'missed' | 'live' }[]
}
interface LeagueCollection {
  key: string
  name: string
  platform?: string
  sport?: string
  isActive: boolean
  seasons: SeasonBucket[]
  totalCount: number
  claimedCount: number
}

const collections = computed<LeagueCollection[]>(() => {
  const leagueById = new Map(leaguesStore.leagues.map((l) => [l.id, l]))
  const result: LeagueCollection[] = []

  for (const [key, shelf] of shelves.value) {
    if (shelf.covers.length === 0) continue
    const lg = leagueById.get(key)
    const founded = lg
      ? leagueFoundedSeason(lg, leaguesStore.leagues)
      : new Date().getFullYear()
    const isActive = key === activeLeagueId.value

    const bySeason = new Map<number, ArchivedCover[]>()
    for (const c of shelf.covers) {
      const list = bySeason.get(c.season) ?? []
      list.push(c)
      bySeason.set(c.season, list)
    }

    const seasons: SeasonBucket[] = Array.from(bySeason.keys())
      .sort((a, b) => b - a) // newest first
      .map((season) => {
        const list = bySeason.get(season)!.sort((a, b) => a.issueWeek - b.issueWeek)
        const vol = Math.max(1, season - founded + 1)
        const entries = list.map((cover) => {
          let state: 'claimed' | 'missed' | 'live'
          if (isActive && cover.id === currentIssueId.value) state = 'live'
          else if (shelf.claims.has(cover.id)) state = 'claimed'
          else state = 'missed'
          return { cover, state }
        })
        return {
          season,
          vol,
          totalCount: list.length,
          claimedCount: entries.filter((e) => e.state !== 'missed').length,
          entries,
        }
      })

    result.push({
      key,
      name: lg?.league_name ?? (key === 'demo' ? 'Demo League' : 'League'),
      platform: lg?.platform,
      sport: lg?.sport,
      isActive,
      seasons,
      totalCount: shelf.covers.length,
      claimedCount: seasons.reduce((n, s) => n + s.claimedCount, 0),
    })
  }

  // Active league first; the rest keep insertion order.
  result.sort((a, b) => Number(b.isActive) - Number(a.isActive))
  return result
})

const coverCount = computed(() =>
  collections.value.reduce((n, c) => n + c.totalCount, 0),
)
const leagueCount = computed(() => collections.value.length)

function platformLabel(p?: string): string {
  if (p === 'yahoo') return 'Yahoo'
  if (p === 'espn') return 'ESPN'
  if (p === 'sleeper') return 'Sleeper'
  return p ?? ''
}
</script>

<style scoped>
.archive {
  max-width: 1200px;
  margin: 0 auto;
  padding: 40px 24px 80px;
  color: oklch(0.97 0.005 90);
}

/* ─── SECTION REVEAL STAGGER ──────────────────────────────────── */
/* Matches Beat / Issue / Chronicles / Power Rankings / Matchups /
   Draft. Archive doesn't have a live-data loading guard (the
   collection comes from a local store), but the stagger on
   first-paint still helps the shelf assemble rather than slam. */
.archive > * {
  animation: archive-section-in 360ms cubic-bezier(0.23, 1, 0.32, 1) both;
}
.archive > *:nth-child(1) { animation-delay: 0ms; }
.archive > *:nth-child(2) { animation-delay: 70ms; }
.archive > *:nth-child(3) { animation-delay: 140ms; }
.archive > *:nth-child(4) { animation-delay: 210ms; }
.archive > *:nth-child(n+5) { animation-delay: 280ms; }
@keyframes archive-section-in {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
}
@media (prefers-reduced-motion: reduce) {
  .archive > * { animation: none; }
}

/* `.chronicles-back` style removed — the breadcrumb pointed at a hub
   page that no longer exists after the three-tab collapse. */

.archive-head {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 48px;
  max-width: 720px;
}
.archive-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: 0.80rem;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: oklch(0.70 0.27 350);
}
.archive-eyebrow-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}
.archive-headline {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: clamp(2.0rem, 4.4vw, 3.2rem);
  line-height: 1.02;
  letter-spacing: -0.018em;
  color: oklch(0.97 0.005 90);
  margin: 0;
  text-wrap: balance;
}
.archive-deck {
  font-family: 'Barlow', sans-serif;
  font-size: 1.0rem;
  line-height: 1.55;
  color: oklch(0.72 0.010 90);
  margin: 0;
  max-width: 60ch;
}

.archive-counts {
  display: inline-flex;
  align-items: center;
  gap: 18px;
  margin-top: 6px;
}
.archive-count {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 700;
  font-size: 0.84rem;
  letter-spacing: 0.10em;
  text-transform: uppercase;
  color: oklch(0.78 0.18 92);
}
.archive-count strong {
  font-weight: 900;
  color: oklch(0.97 0.005 90);
  font-variant-numeric: tabular-nums;
}
.archive-count-dim { color: oklch(0.62 0.010 90); }

/* ── Empty state ──────────────────────────────────────────── */
.archive-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  padding: 60px 20px;
  text-align: center;
  color: oklch(0.62 0.010 90);
  border: 1px dashed oklch(0.22 0.010 90);
  border-radius: 14px;
  max-width: 480px;
  margin: 0 auto;
}
.archive-empty-mark { color: oklch(0.42 0.010 90); }
.archive-empty-headline {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 1.4rem;
  color: oklch(0.92 0.005 90);
  margin: 0;
}
.archive-empty-body {
  font-family: 'Barlow', sans-serif;
  font-size: 0.95rem;
  line-height: 1.55;
  color: oklch(0.62 0.010 90);
  margin: 0;
  max-width: 36ch;
}

/* ── League sections — each league a "publication" ────────── */
.archive-league {
  margin-bottom: 56px;
}
.archive-league-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  padding-bottom: 14px;
  margin-bottom: 26px;
  border-bottom: 2px solid oklch(0.22 0.015 90);
}
.archive-league-id {
  display: flex;
  align-items: baseline;
  gap: 14px;
  flex-wrap: wrap;
  min-width: 0;
}
.archive-league-name {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: clamp(1.4rem, 3vw, 2.0rem);
  letter-spacing: -0.01em;
  color: oklch(0.97 0.005 90);
  margin: 0;
}
.archive-league-meta {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 700;
  font-size: 0.80rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: oklch(0.56 0.010 90);
}
.archive-league-sport { text-transform: capitalize; }
.archive-league-viewing {
  flex-shrink: 0;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: 0.66rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: oklch(0.74 0.18 145);
  padding: 3px 10px;
  border: 1px solid oklch(0.74 0.18 145 / 0.42);
  border-radius: 999px;
}

/* ── Season rows within a league ──────────────────────────── */
.archive-season {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 32px;
}
.archive-season:last-child { margin-bottom: 0; }
.archive-season-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 16px;
}
.archive-season-title {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: 0.95rem;
  letter-spacing: 0.04em;
  color: oklch(0.82 0.008 90);
  margin: 0;
}
.archive-season-stats {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 700;
  font-size: 0.74rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: oklch(0.52 0.010 90);
  margin: 0;
  font-variant-numeric: tabular-nums;
}

/* ── Shelf — grid of magazine covers ──────────────────────── */
.archive-shelf {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
  gap: 18px;
}
.archive-slot {
  display: block;
  text-decoration: none;
  color: inherit;
  border-radius: 6px;
  outline: none;
}
.archive-slot:focus-visible {
  outline: 2px solid oklch(0.78 0.18 92);
  outline-offset: 3px;
}

@media (max-width: 720px) {
  .archive { padding: 28px 16px 60px; }
  .archive-head { margin-bottom: 32px; }
  .archive-shelf {
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: 14px;
  }
}
</style>
