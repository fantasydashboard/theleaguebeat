<template>
  <div class="archive">
    <header class="archive-head">
      <p class="archive-eyebrow">
        <span class="archive-eyebrow-dot" aria-hidden="true"></span>
        The collection
      </p>
      <h1 class="archive-headline">Every issue you've held.</h1>
      <p class="archive-deck">
        Every week you visit during an issue's run, that issue joins your shelf.
        Miss a week and the slot stays empty.
      </p>

      <div v-if="coverCount > 0" class="archive-counts">
        <span class="archive-count">
          <strong>{{ coverCount }}</strong>
          {{ coverCount === 1 ? 'issue' : 'issues' }} in your collection
        </span>
        <span v-if="missedCount > 0" class="archive-count archive-count-missed">
          <strong>{{ missedCount }}</strong>
          missed
        </span>
      </div>
    </header>

    <!-- Empty state — first-time visitor, no issues collected yet. -->
    <div v-if="coverCount === 0 && missedCount === 0" class="archive-empty">
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
        Your collection starts when you visit during an issue's live week.
        Come back next Monday for the new issue.
      </p>
    </div>

    <!-- Group by season. Most leagues will only have one season for
         now — extra structure scales when multiple seasons exist. -->
    <section
      v-for="seasonBucket in coversBySeason"
      :key="seasonBucket.season"
      class="archive-season"
    >
      <header class="archive-season-head">
        <h2 class="archive-season-title">{{ seasonBucket.season }} Season</h2>
        <p class="archive-season-stats">
          {{ seasonBucket.claimedCount }} / {{ seasonBucket.totalCount }} collected
        </p>
      </header>

      <div class="archive-shelf">
        <!-- Slots render as plain elements for v1. Click-to-open-issue
             behavior is a future ship — would need a per-issue route
             that loads the snapshot view. -->
        <div
          v-for="entry in seasonBucket.entries"
          :key="entry.cover.id"
          class="archive-slot"
          :aria-label="`Issue ${entry.cover.issueWeek}, ${entry.cover.headline}`"
        >
          <MagazineCoverThumbnail
            :cover="entry.cover"
            :state="entry.state"
            :vol="vol"
          />
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

const route = useRoute()
const leaguesStore = useLeaguesStore()
const issueStore = useIssueStore()

/** League id the archive is showing. In demo mode (no leagueId in
 *  URL) we use a sentinel "demo" key so localStorage namespacing
 *  stays consistent. */
const leagueId = computed<string>(() => {
  const fromUrl = route.params.leagueId
  if (typeof fromUrl === 'string' && fromUrl) return fromUrl
  return 'demo'
})

const coversRaw = ref<ArchivedCover[]>([])
const claimedIds = ref<Set<string>>(new Set())

function reloadFromStorage() {
  coversRaw.value = getArchivedCovers(leagueId.value)
  claimedIds.value = new Set(
    getClaimedIssues(leagueId.value).map((c) => c.id),
  )
}

onMounted(() => {
  // Make sure leagues are hydrated so the masthead has context.
  if (leaguesStore.leagues.length === 0) {
    leaguesStore.fetchLeagues().catch(() => { /* silent */ })
  }
  reloadFromStorage()
})

/** Magazine volume — same derivation as the home view. Reads
 *  from the issue store, which the home view populates on load. */
const vol = computed<number>(() => {
  const founded = issueStore.leagueFoundedSeason
  const cur = issueStore.currentSeason ?? new Date().getFullYear()
  if (!founded) return 1
  return Math.max(1, cur - founded + 1)
})

/** Current issue week — drives "Live now" highlighting. */
const currentIssueId = computed<string | null>(() => {
  const w = issueStore.currentWeek
  const s = issueStore.currentSeason
  if (!w || !s) return null
  return `${s}-${w}`
})

const coverCount = computed(() => coversRaw.value.length)
const missedCount = computed(() =>
  coversRaw.value.filter((c) => !claimedIds.value.has(c.id) && c.id !== currentIssueId.value).length,
)

/** Group covers by season. Each season is its own row on the shelf. */
interface SeasonBucket {
  season: number
  totalCount: number
  claimedCount: number
  entries: { cover: ArchivedCover; state: 'claimed' | 'missed' | 'live' }[]
}
const coversBySeason = computed<SeasonBucket[]>(() => {
  const bySeason = new Map<number, ArchivedCover[]>()
  for (const c of coversRaw.value) {
    const list = bySeason.get(c.season) ?? []
    list.push(c)
    bySeason.set(c.season, list)
  }
  const seasons = Array.from(bySeason.keys()).sort((a, b) => b - a)  // newest first
  return seasons.map((season) => {
    const list = bySeason.get(season)!.sort((a, b) => a.issueWeek - b.issueWeek)
    const entries = list.map((cover) => {
      let state: 'claimed' | 'missed' | 'live'
      if (cover.id === currentIssueId.value) state = 'live'
      else if (claimedIds.value.has(cover.id)) state = 'claimed'
      else state = 'missed'
      return { cover, state }
    })
    return {
      season,
      totalCount: list.length,
      claimedCount: entries.filter((e) => e.state === 'claimed' || e.state === 'live').length,
      entries,
    }
  })
})
</script>

<style scoped>
.archive {
  max-width: 1200px;
  margin: 0 auto;
  padding: 40px 24px 80px;
  color: oklch(0.97 0.005 90);
}

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
.archive-count-missed { color: oklch(0.62 0.010 90); }

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

/* ── Season buckets ───────────────────────────────────────── */
.archive-season {
  display: flex;
  flex-direction: column;
  gap: 18px;
  margin-bottom: 56px;
}
.archive-season-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 16px;
  padding-bottom: 14px;
  border-bottom: 1px solid oklch(0.18 0.015 90);
}
.archive-season-title {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: 1.2rem;
  letter-spacing: 0.04em;
  color: oklch(0.92 0.005 90);
  margin: 0;
}
.archive-season-stats {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 700;
  font-size: 0.78rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: oklch(0.55 0.010 90);
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
