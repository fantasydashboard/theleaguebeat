<template>
  <div class="share-shell">
    <!-- ─────────────────────────────────────────────────────────────
         MASTHEAD — TLB monogram, league name, issue date, and a Share
         button so the recipient can forward the link onward. No
         league switcher, no settings, no sign-in entry.
    ────────────────────────────────────────────────────────────── -->
    <header class="share-bar" role="banner">
      <div class="share-bar-inner">
        <div class="share-bar-left">
          <router-link to="/" class="share-bar-brand" aria-label="The League Beat — home">
            <img src="/tlb-favicon.png" alt="The League Beat" class="share-bar-brand-mark" />
            <span class="share-bar-brand-word">The League Beat</span>
          </router-link>
        </div>
        <div class="share-bar-right">
          <button
            type="button"
            class="share-bar-share"
            :aria-label="copyState === 'copied' ? 'Link copied to clipboard' : 'Copy share link'"
            @click="copyShareLink"
          >
            <svg v-if="copyState !== 'copied'" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
              <polyline points="16 6 12 2 8 6"/>
              <line x1="12" y1="2" x2="12" y2="15"/>
            </svg>
            <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            {{ copyState === 'copied' ? 'Link copied' : 'Share' }}
          </button>
        </div>
      </div>

      <!-- Issue strap: league name + issue date as a magazine-style
           dateline. Renders even while loading so the page never feels
           empty above the fold. -->
      <div class="share-strap" v-if="leagueRow || loading">
        <p class="share-eyebrow">
          <span class="share-eyebrow-bar" aria-hidden="true"></span>
          Issue · {{ issueDateLine }}
        </p>
        <h1 class="share-headline">{{ leagueRow?.league_name || 'Loading the issue…' }}</h1>
        <p class="share-deck" v-if="leagueRow">
          {{ platformLabel(leagueRow.platform) }} · {{ titleizeSport(leagueRow.sport) }} · {{ leagueRow.season }}
        </p>
      </div>
    </header>

    <main class="share-main">
      <!-- LOADING — quiet, brand-aware. The masthead above already
           gives the page a populated feel; this is just status. -->
      <div v-if="loading" class="share-loading" role="status" aria-live="polite">
        <span class="share-loading-mark" aria-hidden="true">
          <img src="/tlb-favicon.png" alt="" />
        </span>
        Pulling the latest beat for this league.
      </div>

      <!-- ERROR / EMPTY — friendly state when the league row can't be
           read or the platform adapter fails (private ESPN, expired
           Yahoo token, etc). No technical detail leaks to the reader. -->
      <div v-else-if="errorState" class="share-empty">
        <p class="share-empty-eyebrow">
          <span class="share-eyebrow-bar" aria-hidden="true"></span>
          Issue unavailable
        </p>
        <h2 class="share-empty-headline">This issue isn't available.</h2>
        <p class="share-empty-body">{{ errorBody }}</p>
        <router-link to="/" class="share-empty-cta">Read The League Beat</router-link>
      </div>

      <!-- ISSUE BODY — dynamic section list from the composition
           pipeline, mirroring CategoryDemoHomeView's new-pipeline loop.
           The composition emits hero + supporting stories in priority
           order; we render via the existing components. -->
      <template v-else-if="issueData">
        <!-- Cover stories need games. Before kickoff the composition
             has nothing real to lead with and falls back to a
             placeholder team — which shipped "Team unknown is the team
             carrying this week" to a public link. Standings below still
             render, because a league's shape is true before kickoff
             even when its week is not. -->
        <section
          v-for="section in dynamicIssueSections"
          :key="`${section.type}:${section.story?.signature ?? 'anchor'}`"
          class="share-section"
        >
          <HeroFaceoff
            v-if="section.type === 'hero-faceoff' && section.story"
            :story="section.story"
            :data="issueData"
            @share="copyShareLink"
          />
          <HeroSolo
            v-else-if="section.type === 'hero-solo' && section.story"
            :story="section.story"
            :data="issueData"
          />
          <HeroQuiet
            v-else-if="section.type === 'hero-quiet'"
            :story="section.story"
            :data="issueData"
          />
          <MatchupOfWeek
            v-else-if="section.type === 'matchup-of-week' && section.story"
            :story="section.story"
            :data="issueData"
          />
          <StreakWatch
            v-else-if="section.type === 'streak-watch' && section.story"
            :story="section.story"
            :data="issueData"
          />
          <DivisionRace
            v-else-if="section.type === 'division-race' && section.story"
            :story="section.story"
            :data="issueData"
          />
        </section>

        <!-- POINTS COVERAGE — the draft, and this week's games.
             The composition above only emits CATEGORY story types
             (hero-faceoff, matchup-of-week, streak-watch...), so a
             football league produced no sections at all and the share
             page rendered a league name over empty standings. The
             logged-in Issue has had this content the whole time; the
             public link simply never rendered it. -->
        <section v-if="shareDraftHeadline" class="share-standings" aria-labelledby="share-draft-h">
          <header class="share-section-head">
            <p class="share-eyebrow">
              <span class="share-eyebrow-bar" aria-hidden="true"></span>
              The draft
            </p>
            <h2 id="share-draft-h" class="share-section-headline">{{ shareDraftHeadline }}</h2>
          </header>
          <ul v-if="shareDraftFacts.length" class="share-draft-facts" role="list">
            <li v-for="f in shareDraftFacts" :key="f.label" class="share-draft-fact">
              <span class="share-draft-fact-value">{{ f.value }}</span>
              <span class="share-draft-fact-label">{{ f.label }}</span>
            </li>
          </ul>
        </section>

        <!-- THIS WEEK'S GAMES. Before kickoff these are fixtures, not
             results, and the copy says so rather than printing 0.0 as
             though it were a score. -->
        <section v-if="shareMatchups.length" class="share-standings" aria-labelledby="share-games-h">
          <header class="share-section-head">
            <p class="share-eyebrow share-eyebrow-teal">
              <span class="share-eyebrow-bar" aria-hidden="true"></span>
              {{ seasonStarted ? 'This week' : 'Week one' }}
            </p>
            <h2 id="share-games-h" class="share-section-headline">
              {{ shareMatchups.length }} {{ shareMatchups.length === 1 ? 'matchup' : 'matchups' }}.
            </h2>
          </header>
          <ol class="share-standings-list" role="list">
            <li v-for="m in shareMatchups" :key="m.id" class="share-standings-row">
              <span class="share-game-side">{{ lookupTeam(m.homeTeamId).name }}</span>
              <span class="share-game-vs">{{ seasonStarted ? `${m.homePoints} – ${m.awayPoints}` : 'vs' }}</span>
              <span class="share-game-side share-game-side-away">{{ lookupTeam(m.awayTeamId).name }}</span>
            </li>
          </ol>
        </section>

        <!-- COMPACT STANDINGS — anchor section, always renders so the
             reader has the at-a-glance shape of the league. -->
        <section class="share-standings" aria-labelledby="share-standings-h">
          <header class="share-section-head">
            <p class="share-eyebrow share-eyebrow-teal">
              <span class="share-eyebrow-bar" aria-hidden="true"></span>
              Standings
            </p>
            <h2 id="share-standings-h" class="share-section-headline">
              {{ seasonStarted ? `Through week ${issueData.currentWeek}.` : 'Before a snap.' }}
            </h2>
          </header>

          <ol class="share-standings-list" role="list">
            <li
              v-for="row in issueData.standings.slice(0, 12)"
              :key="row.teamId"
              class="share-standings-row"
              :class="{ 'in-playoffs': row.rank <= (issueData.playoffCutoff ?? 6) }"
            >
              <span class="share-standings-rank">{{ row.rank }}</span>
              <div
                class="share-standings-avatar"
                :style="{ background: `linear-gradient(135deg, ${lookupTeam(row.teamId).avatarColor})` }"
              >
                <img
                  v-if="lookupTeam(row.teamId).avatarUrl"
                  :src="lookupTeam(row.teamId).avatarUrl"
                  class="avatar-image"
                  alt=""
                />
                <span v-else>{{ lookupTeam(row.teamId).ownerInitials }}</span>
              </div>
              <div class="share-standings-name-block">
                <p class="share-standings-name">{{ lookupTeam(row.teamId).name }}</p>
                <p class="share-standings-owner">{{ lookupTeam(row.teamId).ownerName }}</p>
              </div>
              <span class="share-standings-record">
                {{ row.catWins }}-{{ row.catLosses }}-{{ row.catTies }}
              </span>
              <span
                class="share-standings-streak"
                :class="row.streak.type === 'W' ? 'streak-win' : row.streak.type === 'L' ? 'streak-loss' : 'streak-tie'"
              >{{ row.streak.type }}{{ row.streak.length }}</span>
            </li>
          </ol>
        </section>

        <!-- CONVERSION CTA — pushes the reader toward starting their
             own coverage. Single button, single message, no nag. -->
        <section class="share-cta" aria-labelledby="share-cta-h">
          <h2 id="share-cta-h" class="share-cta-headline">
            Get your league covered like this.
          </h2>
          <p class="share-cta-body">
            The League Beat auto-generates this magazine every week, for any
            connected fantasy league. Sleeper, ESPN, and Yahoo — every sport.
          </p>
          <router-link to="/" class="share-cta-button">
            Cover my league
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </router-link>
        </section>
      </template>
    </main>

    <!-- Subtle footer — read-more link back to the landing only. We
         intentionally don't render the full TLB footer here (Settings
         + Connect lead to auth flows the reader can't complete). -->
    <footer class="share-footer" role="contentinfo">
      <p class="share-footer-meta">
        Read more from
        <router-link to="/" class="share-footer-link">The League Beat</router-link>.
      </p>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref, shallowRef, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import HeroFaceoff from '@/components/issue/HeroFaceoff.vue'
import HeroSolo from '@/components/issue/HeroSolo.vue'
import HeroQuiet from '@/components/issue/HeroQuiet.vue'
import MatchupOfWeek from '@/components/issue/MatchupOfWeek.vue'
import StreakWatch from '@/components/issue/StreakWatch.vue'
import DivisionRace from '@/components/issue/DivisionRace.vue'
import { detectAll } from '@/editorial/detection'
import { selectStoriesForIssue } from '@/editorial/selection'
import { composeIssue, type IssueSection } from '@/editorial/composition'
import { deriveSeasonStage } from '@/editorial/detection/helpers'
import { hasPlayedGames } from '@/editorial/leagueCore'
import { buildDraftStoryFacts, draftLede } from '@/editorial/points/draftStory'
import type { LeagueDataPointsMatchup } from '@/editorial/types'
import { sleeperLeagueToCategoryData } from '@/editorial/adapters/sleeperAdapter'
import { espnLeagueToCategoryData } from '@/editorial/adapters/espnAdapter'
import { yahooLeagueToCategoryData } from '@/editorial/adapters/yahooAdapter'
import type { CategoryLeagueData } from '@/editorial/types'

/* ─────────────────────────────────────────────────────────────────
   PUBLIC LEAGUE ROW SHAPE — mirrors what /api/share returns. We
   keep this lean (no user_id, no settings) because that endpoint
   intentionally strips them.
───────────────────────────────────────────────────────────────── */
interface PublicLeagueRow {
  id: string
  platform: 'sleeper' | 'yahoo' | 'espn' | 'fantrax'
  sport: 'football' | 'baseball' | 'basketball' | 'hockey'
  platform_league_id: string
  league_name: string
  season: string
  team_name: string | null
  team_id: string | null
  league_size: number | null
  is_active: boolean
  last_synced_at: string | null
}

const route = useRoute()
const router = useRouter()

const loading = ref(true)
const errorState = ref<
  null | 'not-found' | 'fetch-failed' | 'unsupported-platform' | 'server-error'
>(null)
const leagueRow = ref<PublicLeagueRow | null>(null)
const liveData = shallowRef<CategoryLeagueData | null>(null)

const shareSlug = computed(() => {
  const v = route.params.shareSlug
  return typeof v === 'string' ? v : Array.isArray(v) ? v[0] : ''
})

/** Friendly body copy for the empty / error state — varies slightly
 *  with the failure mode so the reader knows whether to retry or
 *  give up. Stays voice-y, never technical. */
const errorBody = computed(() => {
  switch (errorState.value) {
    case 'not-found':
      return "We couldn't find this league. It may have been moved, or the link's stale."
    case 'unsupported-platform':
      return "We couldn't open this league publicly. Ask the commissioner to forward you a fresh issue."
    case 'server-error':
      // Ours, not theirs. The old copy blamed the league for a
      // misconfigured server — which is what it said for months while
      // /api/share returned 500 because a key was never set in
      // production. Telling a reader their league might be private
      // when the fault is entirely ours sends them to debug the wrong
      // thing, and the commissioner too.
      return "Something's wrong on our end, not with your league. We're on it — try again shortly."
    case 'fetch-failed':
    default:
      return "We couldn't load this week's issue. The league may be private, or its connection may need a refresh."
  }
})

/* ─────────────────────────────────────────────────────────────────
   MASTHEAD COPY HELPERS
───────────────────────────────────────────────────────────────── */
const issueDateLine = computed(() => {
  const d = new Date()
  return d.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
})
function platformLabel(p: string) {
  if (p === 'espn') return 'ESPN'
  if (p === 'yahoo') return 'Yahoo'
  if (p === 'sleeper') return 'Sleeper'
  if (p === 'fantrax') return 'Fantrax'
  return p
}
function titleizeSport(s: string) {
  if (!s) return ''
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/* ─────────────────────────────────────────────────────────────────
   ISSUE PIPELINE — same detect → select → compose chain the live
   league home view uses. Only the dynamic section types render here;
   we deliberately skip fixture-only sections (Yesterday's Big Swings,
   etc.) because the public viewer has no fixture context.
───────────────────────────────────────────────────────────────── */
const NEW_SECTION_TYPES = new Set([
  'hero-faceoff',
  'hero-solo',
  'hero-quiet',
  'hero-trade',
  'hero-milestone',
  'matchup-of-week',
  'streak-watch',
  'division-race',
  'trade-recap',
  'player-spotlight',
])

const issueSections = computed<IssueSection[]>(() => {
  const source = liveData.value
  if (!source) return []
  const context = {
    currentWeek: source.currentWeek,
    seasonStage: deriveSeasonStage(
      source.currentWeek,
      source.regularSeasonEndWeek ?? 12,
    ),
    issueDate: new Date(),
    // No viewer for public share — every story renders league-neutral.
    viewer: undefined,
  }
  const candidates = detectAll(source, context)
  const stories = selectStoriesForIssue(candidates, context)
  return composeIssue(stories, context)
})

/**
 * Sections worth rendering publicly.
 *
 * Two filters, and the second matters more than it looks. Before a
 * single game is played the composition still emits a cover story, and
 * that story has no real team behind it — the hero components fall
 * back to a placeholder literally named "Team unknown". That shipped
 * to a public share link as "Team unknown is the team carrying this
 * week", which is the worst possible sentence to hand a stranger.
 *
 * Standings survive the filter: a league's shape is true before
 * kickoff even when its week is not.
 */
const dynamicIssueSections = computed(() => {
  const sections = issueSections.value.filter((s) => NEW_SECTION_TYPES.has(s.type))
  return seasonStarted.value ? sections : []
})

/**
 * The draft, for points leagues.
 *
 * Uses the same pure builders the logged-in Issue uses —
 * `buildDraftStoryFacts` and `draftLede` — rather than a second
 * implementation. Two copies of "what is interesting about this draft"
 * would drift, and the public link is the version strangers see.
 */
const shareDraftFactsRaw = computed(() =>
  buildDraftStoryFacts([...(liveData.value?.draft?.picks ?? [])]),
)

const shareDraftHeadline = computed(() => {
  if (!shareDraftFactsRaw.value) return ''
  return draftLede(shareDraftFactsRaw.value, (id) => lookupTeam(id).name) ?? ''
})

const shareDraftFacts = computed(() => {
  const f = shareDraftFactsRaw.value
  if (!f) return []
  const out = [{ label: 'Picks', value: `${f.totalPicks}` }, { label: 'Rounds', value: `${f.rounds}` }]
  const qb = f.firstAtPosition.find((x) => x.position === 'QB')
  if (qb) out.push({ label: 'First QB', value: `#${qb.pickOverall}` })
  return out
})

/** This week's games. Points leagues only — the category contract
 *  carries its matchups elsewhere and the composition already covers
 *  them for those leagues. */
const shareMatchups = computed(() => {
  const d = liveData.value as unknown as { currentWeekMatchups?: LeagueDataPointsMatchup[] }
  return d?.currentWeekMatchups ?? []
})

/** Whether any game has been played. The share page had no such guard,
 *  which is how a 0-0-0 preseason league got a "this week" cover. */
const seasonStarted = computed(
  () => !!liveData.value && hasPlayedGames(liveData.value),
)

const issueData = computed(() => liveData.value)

/** Lookup helper for the standings list — falls back to a stub when
 *  the adapter didn't surface the team (rare, defensive). */
function lookupTeam(teamId: string) {
  const t = liveData.value?.teams.find((x) => x.id === teamId)
  if (t) return t
  return {
    id: teamId,
    name: `Team ${teamId}`,
    ownerName: '',
    ownerInitials: teamId.slice(0, 2).toUpperCase(),
    avatarUrl: undefined,
    avatarColor: 'oklch(0.62 0.18 200), oklch(0.42 0.18 220)',
    isMyTeam: false,
  }
}

/* ─────────────────────────────────────────────────────────────────
   LOAD — public flow:
     1. Hit /api/share/:shareSlug (server-side service-role read).
     2. With the league row's platform + platform_league_id in hand,
        call the matching client-side adapter — no userIdentity so
        every team renders neutral. Sleeper is fully public; ESPN
        works for public leagues only; Yahoo requires OAuth so will
        usually fail here (and that's fine — empty state).
     3. Set OG meta tags pointing at /api/og/:shareSlug for the rich
        preview card.
───────────────────────────────────────────────────────────────── */
async function loadIssue() {
  loading.value = true
  errorState.value = null

  const slug = shareSlug.value
  if (!slug) {
    errorState.value = 'not-found'
    loading.value = false
    return
  }

  // 1. Read the row.
  let row: PublicLeagueRow | null = null
  try {
    const res = await fetch(`/api/share/${encodeURIComponent(slug)}`)
    if (res.status === 404) {
      errorState.value = 'not-found'
      loading.value = false
      return
    }
    if (!res.ok) {
      // A 5xx is our fault; anything else is plausibly the league's.
      errorState.value = res.status >= 500 ? 'server-error' : 'fetch-failed'
      loading.value = false
      return
    }
    const body = await res.json()
    row = body.league as PublicLeagueRow
  } catch {
    errorState.value = 'fetch-failed'
    loading.value = false
    return
  }

  leagueRow.value = row

  // 2. Fan out to the right adapter.
  try {
    let data: CategoryLeagueData | null = null
    if (row.platform === 'sleeper') {
      data = await sleeperLeagueToCategoryData(row.platform_league_id, {})
    } else if (row.platform === 'espn') {
      // This view already holds the league row, so the sport comes
      // straight off it — no store lookup needed here.
      data = await espnLeagueToCategoryData(row.platform_league_id, {
        sport: row.sport === 'football' ? 'football' : 'baseball',
      })
    } else if (row.platform === 'yahoo') {
      data = await yahooLeagueToCategoryData(row.platform_league_id, {})
    } else {
      errorState.value = 'unsupported-platform'
      loading.value = false
      return
    }
    liveData.value = data
  } catch (err) {
    console.warn('[PublicShareView] adapter load failed:', err)
    errorState.value = 'fetch-failed'
  } finally {
    loading.value = false
  }
}

/* ─────────────────────────────────────────────────────────────────
   OG META TAGS — mutate <head> so iMessage/Slack/Discord render a
   rich preview card pointing at /api/og/:slug. Tags are removed on
   unmount so they don't bleed into other routes.
───────────────────────────────────────────────────────────────── */
const headTags: HTMLElement[] = []
function setHeadMeta() {
  if (typeof document === 'undefined') return
  const origin = window.location.origin
  const slug = shareSlug.value
  const title = leagueRow.value
    ? `${leagueRow.value.league_name} — The League Beat`
    : 'The League Beat'
  const description = leagueRow.value
    ? `This week's issue for ${leagueRow.value.league_name}. ${platformLabel(leagueRow.value.platform)} · ${titleizeSport(leagueRow.value.sport)} · ${leagueRow.value.season}.`
    : 'The online magazine your fantasy league deserves.'
  const ogImage = `${origin}/api/og/${encodeURIComponent(slug)}`
  const pageUrl = `${origin}/i/${encodeURIComponent(slug)}`

  // Title — replace, then track for restore via the saved original.
  document.title = title

  const meta = (attr: 'property' | 'name', key: string, content: string) => {
    const el = document.createElement('meta')
    el.setAttribute(attr, key)
    el.setAttribute('content', content)
    el.setAttribute('data-share-meta', '1')
    document.head.appendChild(el)
    headTags.push(el)
  }

  meta('property', 'og:type', 'article')
  meta('property', 'og:site_name', 'The League Beat')
  meta('property', 'og:title', title)
  meta('property', 'og:description', description)
  meta('property', 'og:url', pageUrl)
  meta('property', 'og:image', ogImage)
  meta('property', 'og:image:width', '1200')
  meta('property', 'og:image:height', '630')
  meta('name', 'twitter:card', 'summary_large_image')
  meta('name', 'twitter:title', title)
  meta('name', 'twitter:description', description)
  meta('name', 'twitter:image', ogImage)
  meta('name', 'description', description)
}

function clearHeadMeta() {
  for (const el of headTags.splice(0, headTags.length)) {
    el.parentElement?.removeChild(el)
  }
}

/* ─────────────────────────────────────────────────────────────────
   SHARE BUTTON — copy link to clipboard, show a brief "copied"
   confirmation in place of the icon. No third-party share sheet
   needed; the recipient is reading on whatever surface they're on.
───────────────────────────────────────────────────────────────── */
const copyState = ref<'idle' | 'copied'>('idle')
let copyResetTimer: number | null = null
async function copyShareLink() {
  if (typeof window === 'undefined') return
  const url = window.location.href
  try {
    await navigator.clipboard.writeText(url)
  } catch {
    // Fallback for browsers without clipboard API permission —
    // create a hidden textarea and execCommand('copy').
    const ta = document.createElement('textarea')
    ta.value = url
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    try { document.execCommand('copy') } catch { /* swallow */ }
    document.body.removeChild(ta)
  }
  copyState.value = 'copied'
  if (copyResetTimer) window.clearTimeout(copyResetTimer)
  copyResetTimer = window.setTimeout(() => {
    copyState.value = 'idle'
    copyResetTimer = null
  }, 1800)
}

/* ─────────────────────────────────────────────────────────────────
   LIFECYCLE
───────────────────────────────────────────────────────────────── */
onMounted(async () => {
  await loadIssue()
  setHeadMeta()
})

watch(
  () => shareSlug.value,
  async (next, prev) => {
    if (next === prev) return
    clearHeadMeta()
    liveData.value = null
    leagueRow.value = null
    await loadIssue()
    setHeadMeta()
  },
)

onBeforeUnmount(() => {
  clearHeadMeta()
  if (copyResetTimer) {
    window.clearTimeout(copyResetTimer)
    copyResetTimer = null
  }
})

// Keep an unused router reference so future deep links from inside
// the page (e.g. clicking a hero through to a deeper view) can be
// added without re-importing.
void router
</script>

<style scoped>
/* Brand tokens — mirror MyLeagueLayout so a public reader sees the
   same surface treatments without us redefining the palette. */
.share-shell {
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
  display: flex;
  flex-direction: column;
}

/* ───── Masthead ──────────────────────────────────────────── */
.share-bar {
  background:
    radial-gradient(ellipse 800px 320px at 88% -20%, oklch(0.74 0.18 145 / 0.08), transparent 70%),
    oklch(0.06 0.014 90);
  border-bottom: 1px solid oklch(0.20 0.015 90);
}
.share-bar-inner {
  max-width: 1080px;
  margin: 0 auto;
  padding: 18px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}
.share-bar-left { display: inline-flex; align-items: center; gap: 14px; }
.share-bar-right { display: inline-flex; align-items: center; gap: 12px; }

.share-bar-brand {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  text-decoration: none;
  color: var(--ink-1);
  padding: 2px;
  border-radius: 8px;
  transition: opacity 140ms cubic-bezier(0.22, 1, 0.36, 1);
}
@media (hover: hover) and (pointer: fine) {
  .share-bar-brand:hover { opacity: 0.85; }
}
.share-bar-brand:active { transform: scale(0.97); transition-duration: 100ms; }
.share-bar-brand:focus-visible {
  outline: 2px solid var(--accent-primary);
  outline-offset: 2px;
}
.share-bar-brand-mark {
  width: 32px;
  height: 32px;
  display: block;
  border-radius: 6px;
}
.share-bar-brand-word {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.92rem;
  font-weight: 800;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--ink-1);
}

.share-bar-share {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  background: transparent;
  border: 1px solid oklch(0.32 0.012 90);
  border-radius: 999px;
  padding: 8px 14px;
  color: var(--ink-1);
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.10em;
  text-transform: uppercase;
  cursor: pointer;
  transition: border-color 160ms cubic-bezier(0.22, 1, 0.36, 1),
              background-color 160ms cubic-bezier(0.22, 1, 0.36, 1),
              color 160ms cubic-bezier(0.22, 1, 0.36, 1);
}
@media (hover: hover) and (pointer: fine) {
  .share-bar-share:hover {
    border-color: var(--accent-primary);
    color: var(--ink-1);
  }
}
.share-bar-share:active { transform: scale(0.97); transition-duration: 100ms; }
.share-bar-share:focus-visible {
  outline: 2px solid var(--accent-primary);
  outline-offset: 2px;
}

.share-strap {
  max-width: 1080px;
  margin: 0 auto;
  padding: 28px 24px 36px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.share-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  margin: 0;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--accent-up);
}
.share-eyebrow-bar {
  display: inline-block;
  width: 24px;
  height: 2px;
  background: currentColor;
  border-radius: 2px;
}
.share-eyebrow-teal { color: var(--accent-tertiary); }
.share-headline {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: clamp(2.2rem, 5vw, 3.4rem);
  line-height: 0.98;
  letter-spacing: -0.015em;
  color: var(--ink-1);
  margin: 0;
}
.share-deck {
  font-size: 0.98rem;
  color: var(--ink-3);
  margin: 0;
}

/* ───── Main body ─────────────────────────────────────────── */
.share-main {
  flex: 1;
  max-width: 1080px;
  margin: 0 auto;
  width: 100%;
  padding: 28px 24px 80px;
  display: flex;
  flex-direction: column;
  gap: 36px;
}
.share-section { display: block; }

/* Loading / error states — both quiet, masthead-led. */
.share-loading {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  padding: 14px 18px;
  border-radius: 12px;
  background: oklch(0.11 0.015 90);
  border: 1px solid oklch(0.20 0.015 90);
  color: var(--ink-2);
  font-size: 0.92rem;
  align-self: flex-start;
}
.share-loading-mark {
  width: 22px;
  height: 22px;
  display: grid;
  place-items: center;
}
.share-loading-mark img {
  width: 22px;
  height: 22px;
  border-radius: 4px;
}
@media (prefers-reduced-motion: no-preference) {
  @keyframes share-pulse {
    0%, 60%, 100% { opacity: 1; transform: scale(1); }
    30% { opacity: 0.4; transform: scale(1.08); }
  }
  .share-loading-mark img { animation: share-pulse 2.4s infinite cubic-bezier(0.22, 1, 0.36, 1); }
}

.share-empty {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 36px 28px;
  border-radius: 16px;
  background: oklch(0.10 0.015 90);
  border: 1px solid oklch(0.20 0.015 90);
  align-items: flex-start;
}
.share-empty-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  margin: 0;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--accent-secondary);
}
.share-empty-headline {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: clamp(1.8rem, 4vw, 2.6rem);
  line-height: 1;
  letter-spacing: -0.01em;
  color: var(--ink-1);
  margin: 0;
}
.share-empty-body {
  font-size: 1rem;
  line-height: 1.55;
  color: var(--ink-3);
  margin: 0;
  max-width: 60ch;
}
.share-empty-cta {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-top: 6px;
  background: var(--accent-primary);
  color: oklch(0.10 0.012 90);
  text-decoration: none;
  padding: 10px 18px;
  border-radius: 999px;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.86rem;
  font-weight: 800;
  letter-spacing: 0.06em;
  transition: transform 180ms cubic-bezier(0.22, 1, 0.36, 1);
}
@media (prefers-reduced-motion: no-preference) {
  .share-empty-cta:hover { transform: translateY(-1px); }
}
.share-empty-cta:active { transform: scale(0.97); transition-duration: 100ms; }

/* ───── Standings card ────────────────────────────────────── */
.share-standings {
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 28px 26px;
  background: oklch(0.10 0.015 90);
  border: 1px solid oklch(0.20 0.015 90);
  border-radius: 16px;
}
.share-section-head {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.share-section-headline {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: clamp(1.4rem, 2.8vw, 1.8rem);
  line-height: 1.02;
  letter-spacing: -0.01em;
  color: var(--ink-1);
  margin: 0;
}
.share-standings-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.share-standings-row {
  display: grid;
  grid-template-columns: 32px 36px minmax(0, 1fr) auto auto;
  align-items: center;
  gap: 14px;
  padding: 10px 14px;
  background: oklch(0.11 0.015 90 / 0.5);
  border: 1px solid oklch(0.18 0.015 90);
  border-radius: 10px;
}
.share-standings-row.in-playoffs {
  background: oklch(0.11 0.015 90 / 0.7);
  border-color: oklch(0.20 0.015 90);
}
.share-standings-rank {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 1.3rem;
  color: var(--ink-3);
  font-variant-numeric: tabular-nums;
  text-align: center;
}
.share-standings-row.in-playoffs .share-standings-rank { color: var(--ink-1); }
.share-standings-avatar {
  width: 36px;
  height: 36px;
  border-radius: 9px;
  display: grid;
  place-items: center;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: 0.82rem;
  color: oklch(0.12 0.012 90);
  flex-shrink: 0;
  overflow: hidden;
}
.share-standings-name-block { min-width: 0; }
.share-standings-name {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 700;
  font-size: 1.02rem;
  color: var(--ink-1);
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.share-standings-owner {
  font-size: 0.74rem;
  color: var(--ink-3);
  margin: 1px 0 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.share-standings-record {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 0.92rem;
  color: var(--ink-1);
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.02em;
}
.share-standings-streak {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: 0.74rem;
  letter-spacing: 0.04em;
  padding: 3px 8px;
  border-radius: 6px;
  font-variant-numeric: tabular-nums;
}
.streak-win  { color: var(--accent-up);        background: oklch(0.74 0.18 145 / 0.12); }
.streak-loss { color: var(--accent-secondary); background: oklch(0.70 0.27 350 / 0.12); }
.streak-tie  { color: var(--ink-3);            background: oklch(0.30 0.012 90 / 0.4); }

/* ───── CTA ───────────────────────────────────────────────── */
.share-cta {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 12px;
  padding: 36px 28px;
  background:
    radial-gradient(ellipse 600px 300px at 90% 10%, oklch(0.78 0.18 92 / 0.06), transparent 60%),
    oklch(0.09 0.015 90);
  border: 1px solid oklch(0.20 0.015 90);
  border-radius: 16px;
}
.share-cta-headline {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: clamp(1.6rem, 3.4vw, 2.2rem);
  line-height: 1;
  letter-spacing: -0.01em;
  color: var(--ink-1);
  margin: 0;
  max-width: 24ch;
}
.share-cta-body {
  font-size: 1rem;
  line-height: 1.55;
  color: var(--ink-3);
  margin: 0;
  max-width: 60ch;
}
.share-cta-button {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-top: 6px;
  background: var(--accent-primary);
  color: oklch(0.10 0.012 90);
  text-decoration: none;
  padding: 12px 20px;
  border-radius: 999px;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.92rem;
  font-weight: 800;
  letter-spacing: 0.06em;
  transition: transform 180ms cubic-bezier(0.22, 1, 0.36, 1);
}
@media (prefers-reduced-motion: no-preference) {
  .share-cta-button:hover { transform: translateY(-1px); }
}
.share-cta-button:active { transform: scale(0.97); transition-duration: 100ms; }

/* ───── Footer ────────────────────────────────────────────── */
.share-footer {
  padding: 24px;
  border-top: 1px solid oklch(0.18 0.015 90);
  text-align: center;
  background: oklch(0.06 0.014 90);
}
.share-footer-meta {
  margin: 0;
  font-size: 0.86rem;
  color: var(--ink-3);
}
.share-footer-link {
  color: var(--ink-2);
  text-decoration: none;
  font-weight: 700;
  transition: color 160ms cubic-bezier(0.22, 1, 0.36, 1);
}
.share-footer-link:hover { color: var(--ink-1); }

@media (max-width: 720px) {
  .share-bar-inner { padding: 14px 16px; }
  .share-bar-brand-word { display: none; }
  .share-strap { padding: 20px 16px 28px; }
  .share-main { padding: 22px 16px 60px; gap: 24px; }
  .share-standings { padding: 22px 16px; }
  .share-standings-row {
    grid-template-columns: 24px 32px minmax(0, 1fr) auto auto;
    gap: 10px;
    padding: 10px 12px;
  }
  .share-standings-avatar { width: 32px; height: 32px; }
  .share-cta { padding: 28px 18px; }
}

/* Draft fact chips + fixture rows — same vocabulary as the standings
   list above so the page reads as one thing, not three. */
.share-draft-facts {
  list-style: none; padding: 0; margin: 4px 0 0;
  display: flex; flex-wrap: wrap; gap: 10px;
}
.share-draft-fact {
  display: flex; flex-direction: column; gap: 2px;
  padding: 10px 16px; border-radius: 12px;
  background: oklch(0.11 0.012 90); border: 1px solid oklch(0.2 0.015 90);
}
.share-draft-fact-value { font-size: 1.35rem; font-weight: 800; line-height: 1; }
.share-draft-fact-label {
  font-size: 0.66rem; letter-spacing: 0.14em; text-transform: uppercase;
  color: oklch(0.62 0.01 90);
}
.share-game-side { flex: 1; font-weight: 700; min-width: 0; }
.share-game-side-away { text-align: right; }
.share-game-vs {
  font-size: 0.78rem; letter-spacing: 0.08em; text-transform: uppercase;
  color: oklch(0.62 0.01 90); padding: 0 14px; white-space: nowrap;
}
</style>
