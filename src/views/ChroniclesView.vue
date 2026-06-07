<template>
  <div class="chronicles">
    <LiveLoadError v-if="liveError" :message="liveError" :platform-label="platformLabel" />

    <header class="chronicles-masthead">
      <p class="chronicles-eyebrow">
        <span class="chronicles-eyebrow-bar" aria-hidden="true"></span>
        Chronicles
      </p>
      <h1 class="chronicles-title">{{ leagueName }}</h1>
      <p class="chronicles-sub">
        The all-time archive of {{ leagueName }}.
        Champions, records, dynasties, rivalries — the story across the seasons.
        <span v-if="seasonsCount > 0">{{ seasonsCount }} seasons on the books.</span>
      </p>
    </header>

    <!-- ─── HALL OF FAME — past champions ──────────────────────── -->
    <section v-if="orderedHistory.length > 0" class="section" aria-labelledby="hof-heading">
      <header class="section-head">
        <p class="section-eyebrow">01 — Hall of Fame</p>
        <h2 class="section-headline" id="hof-heading">The champions.</h2>
        <p class="section-sub">
          Every manager who hoisted the trophy in {{ leagueName }}.
          The all-time record of who took home the title.
        </p>
      </header>

      <ol class="hof-list" role="list">
        <li
          v-for="entry in orderedHistory"
          :key="entry.year"
          class="hof-row"
        >
          <span class="hof-year">{{ entry.year }}</span>
          <span
            v-if="entry.championLogo"
            class="hof-avatar"
            :style="{ backgroundImage: `url(${entry.championLogo})` }"
            aria-hidden="true"
          ></span>
          <span v-else class="hof-avatar hof-avatar-fallback" aria-hidden="true">
            {{ initialsFor(entry.championName) }}
          </span>
          <div class="hof-text">
            <p class="hof-name">{{ entry.championName || 'Champion' }}</p>
            <p v-if="entry.championRecord" class="hof-record">{{ entry.championRecord }}</p>
          </div>
          <span v-if="entry.runnerUpName" class="hof-runner-up">
            <span class="hof-runner-up-label">Runner-up</span>
            <span class="hof-runner-up-name">{{ entry.runnerUpName }}</span>
          </span>
        </li>
      </ol>
    </section>

    <!-- ─── DEPARTMENTS — the deeper views live here ───────────── -->
    <section class="section" aria-labelledby="dept-heading">
      <header class="section-head">
        <p class="section-eyebrow">02 — Departments</p>
        <h2 class="section-headline" id="dept-heading">More from the archive.</h2>
        <p class="section-sub">
          Every champion, every records-book entry, every rivalry across the league's history.
        </p>
      </header>

      <div class="chr-departments-grid" role="list">
        <router-link
          v-for="dept in departments"
          :key="dept.path"
          :to="`/leagues/${routeLeagueId}/${dept.path}`"
          class="chr-department-card"
          role="listitem"
        >
          <p class="chr-department-label">{{ dept.label }}</p>
          <p class="chr-department-body">{{ dept.body }}</p>
          <span class="chr-department-link">{{ dept.cta }} →</span>
        </router-link>
      </div>
    </section>

    <footer class="chronicles-footer">
      <p class="chronicles-footer-tagline">
        The League Beat · Your league story, chronicled.
      </p>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, shallowRef } from 'vue'
import { useRoute } from 'vue-router'
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

defineEmits<{ (e: 'open-signup'): void }>()

const route = useRoute()
const leaguesStore = useLeaguesStore()
const issueStore = useIssueStore()

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

const data = computed<CategoryLeagueData>(() => liveData.value ?? fixtureData)

const leagueName = computed(
  () => strictLeagueRecord.value?.league_name ?? data.value.leagueName ?? 'Your league',
)

const seasonHistory = computed(() => data.value.seasonHistory ?? [])
const seasonsCount = computed(() => seasonHistory.value.length)

/** Sorted newest → oldest for the Hall of Fame. Reads visually like
 *  a magazine's "past champions" column. */
const orderedHistory = computed(() =>
  [...seasonHistory.value].sort((a, b) => b.year - a.year),
)

const departments = computed(() => [
  {
    path: 'history',
    label: 'Seasons',
    body: 'Every season this league has played, with the champion, the runner-up, the basement, and the year\'s biggest story.',
    cta: 'Open the seasons archive',
  },
  {
    path: 'archive',
    label: 'Records',
    body: 'Single-season records, all-time leaders, longest streaks, biggest weeks. The numbers that survive across years.',
    cta: 'Open the records book',
  },
])

function initialsFor(name: string | undefined): string {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

onMounted(async () => {
  if (isStrictLiveMode.value && leaguesStore.leagues.length === 0) {
    try {
      await leaguesStore.fetchLeagues()
    } catch (err) {
      console.warn('[ChroniclesView] fetchLeagues failed:', err)
    }
  }

  const id = liveLeagueId.value
  const platform = livePlatform.value
  if (!id || (platform !== 'sleeper' && platform !== 'espn' && platform !== 'yahoo')) {
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
    const adapted =
      platform === 'espn'
        ? await espnLeagueToCategoryData(id, opts)
        : platform === 'yahoo'
        ? await yahooLeagueToCategoryData(id, opts)
        : await sleeperLeagueToCategoryData(id, opts)
    liveData.value = adapted
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
  } catch (err) {
    const label =
      platform === 'espn' ? 'ESPN' : platform === 'yahoo' ? 'Yahoo' : 'Sleeper'
    liveError.value = (err as Error).message || `Failed to load ${label} league data.`
  } finally {
    liveLoading.value = false
  }
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
</script>

<style scoped>
.chronicles {
  display: flex;
  flex-direction: column;
  gap: 56px;
  font-family: 'Barlow', sans-serif;
  color: var(--ink-1);
  padding: 32px 0 80px;
}

.chronicles-masthead {
  max-width: 720px;
}
.chronicles-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--accent-tertiary);
  margin: 0 0 14px;
}
.chronicles-eyebrow-bar {
  width: 24px;
  height: 1px;
  background: var(--accent-tertiary);
}
.chronicles-title {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: clamp(2.25rem, 5vw, 3.4rem);
  line-height: 0.94;
  letter-spacing: -0.012em;
  color: var(--ink-1);
  margin: 0 0 10px;
}
.chronicles-sub {
  font-size: 1.02rem;
  line-height: 1.5;
  color: var(--ink-2);
  margin: 0;
  max-width: 62ch;
}

.section {
  display: flex;
  flex-direction: column;
  gap: 24px;
}
.section-head { max-width: 720px; }
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
.section-sub {
  font-size: 1rem;
  line-height: 1.5;
  color: var(--ink-2);
  margin: 0;
  max-width: 60ch;
}

/* ─── HALL OF FAME ────────────────────────────────────────────── */
.hof-list {
  list-style: none;
  padding: 0;
  margin: 0;
  background: oklch(0.10 0.015 90);
  border: 1px solid oklch(0.20 0.015 90);
  border-radius: 16px;
  overflow: hidden;
}
.hof-row {
  display: grid;
  grid-template-columns: 64px 44px minmax(0, 1fr) auto;
  gap: 16px;
  align-items: center;
  padding: 14px 18px;
  border-bottom: 1px solid oklch(0.14 0.015 90);
}
.hof-row:last-child { border-bottom: 0; }
.hof-year {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 1.2rem;
  color: var(--accent-primary, oklch(0.78 0.18 92));
  font-variant-numeric: tabular-nums;
}
.hof-avatar {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background-size: cover;
  background-position: center;
  background-color: oklch(0.14 0.015 90);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: 0.86rem;
  color: var(--ink-1);
}
.hof-avatar-fallback {
  background: linear-gradient(135deg, oklch(0.62 0.18 200), oklch(0.42 0.18 220));
}
.hof-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.hof-name {
  margin: 0;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: 1.1rem;
  color: var(--ink-1);
  letter-spacing: -0.002em;
}
.hof-record {
  margin: 0;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.84rem;
  letter-spacing: 0.04em;
  color: var(--ink-3);
  font-variant-numeric: tabular-nums;
}
.hof-runner-up {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
  text-align: right;
}
.hof-runner-up-label {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.66rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--ink-3);
  font-weight: 700;
}
.hof-runner-up-name {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 700;
  font-size: 0.92rem;
  color: var(--ink-2);
}

/* ─── DEPARTMENTS ─────────────────────────────────────────────── */
.chr-departments-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(320px, 100%), 1fr));
  gap: 14px;
}
.chr-department-card {
  padding: 22px 24px 20px;
  border-radius: 14px;
  background: oklch(0.09 0.013 90);
  border: 1px solid oklch(0.18 0.015 90);
  border-left: 3px solid var(--accent-tertiary);
  display: flex;
  flex-direction: column;
  gap: 8px;
  text-decoration: none;
  color: var(--ink-1);
  transition: border-color 200ms ease, background 200ms ease;
}
.chr-department-card:hover {
  border-color: var(--accent-tertiary);
  background: oklch(0.10 0.013 90);
}
.chr-department-label {
  margin: 0;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: 0.78rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--accent-tertiary);
}
.chr-department-body {
  margin: 0;
  font-family: 'Barlow', sans-serif;
  font-size: 0.96rem;
  line-height: 1.5;
  color: var(--ink-2);
}
.chr-department-link {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 700;
  font-size: 0.86rem;
  letter-spacing: 0.06em;
  color: var(--accent-tertiary);
  margin-top: 4px;
}

/* ─── FOOTER ─────────────────────────────────────────────────── */
.chronicles-footer {
  padding: 28px 0 0;
  border-top: 1px solid oklch(0.20 0.015 90);
  text-align: center;
}
.chronicles-footer-tagline {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 700;
  font-size: 1rem;
  letter-spacing: 0.04em;
  color: var(--ink-1);
  margin: 0;
}

@media (max-width: 720px) {
  .hof-row {
    grid-template-columns: 56px 36px minmax(0, 1fr);
    gap: 12px;
  }
  .hof-runner-up { display: none; }
}
</style>
