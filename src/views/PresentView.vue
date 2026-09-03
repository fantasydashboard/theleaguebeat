<template>
  <div class="present" tabindex="-1" @keydown="onKey">
    <!-- Loading / error / empty states, before any deck exists. -->
    <div v-if="loading" class="present-msg">Building the deck…</div>

    <div v-else-if="error" class="present-msg">
      <p class="present-msg-head">This deck couldn't be built.</p>
      <p class="present-msg-body">{{ error }}</p>
      <router-link :to="backLink" class="present-exit">Back to the league</router-link>
    </div>

    <div v-else-if="!deck" class="present-msg">
      <p class="present-msg-head">Nothing to present yet.</p>
      <p class="present-msg-body">
        This league has no draft on record. Decks appear as the season
        gives them something to say.
      </p>
      <router-link :to="backLink" class="present-exit">Back to the league</router-link>
    </div>

    <template v-else>
      <!-- Progress. Counts revealed rows as their own step, so the bar
           advances evenly rather than jumping through list slides. -->
      <div class="present-progress" aria-hidden="true">
        <span class="present-progress-fill" :style="{ width: `${progressPct}%` }"></span>
      </div>

      <header class="present-chrome">
        <span class="present-chrome-brand">The League Beat</span>
        <span class="present-chrome-deck">{{ deck.title }}</span>
        <router-link :to="backLink" class="present-chrome-exit">Exit</router-link>
      </header>

      <main class="present-stage" role="region" :aria-label="`Slide ${slideIndex + 1} of ${deck.slides.length}`">
        <!-- The null guard has to be its own wrapper: without it the
             template cannot narrow the discriminated union below. -->
        <template v-if="slide">
        <!-- COLD OPEN -->
        <section v-if="slide.kind === 'cold-open'" class="slide slide-cold">
          <p class="cold-brand">The League Beat</p>
          <h1 class="cold-title">{{ slide.title }}</h1>
          <p class="cold-sub">{{ slide.subtitle }}</p>
          <p v-if="slide.meta" class="cold-meta">{{ slide.meta }}</p>
        </section>

        <!-- STATEMENT -->
        <section v-else-if="slide.kind === 'statement'" class="slide slide-statement">
          <p class="slide-eyebrow">{{ slide.eyebrow }}</p>
          <h2 class="slide-headline">{{ slide.headline }}</h2>
          <p v-if="slide.support" class="slide-support">{{ slide.support }}</p>
          <ul v-if="slide.chips?.length" class="slide-chips" role="list">
            <li v-for="c in slide.chips" :key="c.label" class="slide-chip">
              <span class="slide-chip-value">{{ c.value }}</span>
              <span class="slide-chip-label">{{ c.label }}</span>
            </li>
          </ul>
        </section>

        <!-- LIST -->
        <section v-else-if="slide.kind === 'list'" class="slide slide-list">
          <p class="slide-eyebrow">{{ slide.eyebrow }}</p>
          <h2 class="slide-headline">{{ slide.headline }}</h2>
          <p v-if="slide.support" class="slide-support slide-support-tight">{{ slide.support }}</p>
          <!-- Dense once a list runs long: ten rows at the roomy size
               overflow the stage, and the presenter cannot reach the
               bottom of their own grade sheet. -->
          <ol
            class="list-rows"
            :class="{
              'is-dense': slide.rows.length > 6,
              'is-split': slide.rows.length > 6,
            }"
            :style="slide.rows.length > 6
              ? { '--rows-per-column': rowsPerColumn(slide.rows.length) }
              : undefined"
            role="list"
          >
            <li
              v-for="(row, i) in slide.rows"
              :key="`${row.label}-${i}`"
              class="list-row"
              :class="{ 'is-hidden': i > revealIndex }"
            >
              <span v-if="row.lead" class="list-lead">{{ row.lead }}</span>
              <span
                v-if="row.logoUrl || row.logoColor"
                class="list-logo"
                :style="{ background: row.logoColor ? `linear-gradient(135deg, ${row.logoColor})` : undefined }"
                aria-hidden="true"
              >
                <img v-if="row.logoUrl" :src="row.logoUrl" class="list-logo-img" alt="" />
                <span v-else class="list-logo-initials">{{ row.logoInitials }}</span>
              </span>
              <span class="list-copy">
                <span class="list-label">{{ row.label }}</span>
                <span v-if="row.sub" class="list-sub">{{ row.sub }}</span>
              </span>
              <span v-if="row.value" class="list-value">{{ row.value }}</span>
            </li>
          </ol>
        </section>

        <!-- TEAM CARD — one team, one slide. -->
        <section
          v-else-if="slide.kind === 'team-card'"
          class="slide slide-team"
          :class="{ 'has-team-color': !!slide.logoColor }"
          :style="slide.logoColor ? { '--team-wash': slide.logoColor } : undefined"
        >
          <p class="slide-eyebrow">{{ slide.eyebrow }}</p>
          <div class="team-head">
            <span class="team-rank">{{ slide.rank }}</span>
            <span class="team-rank-of">of {{ slide.fieldSize }}</span>
            <span
              v-if="slide.logoUrl || slide.logoColor"
              class="team-logo"
              :style="{ background: slide.logoColor ? `linear-gradient(135deg, ${slide.logoColor})` : undefined }"
              aria-hidden="true"
            >
              <img v-if="slide.logoUrl" :src="slide.logoUrl" class="team-logo-img" alt="" />
              <span v-else class="team-logo-initials">{{ slide.logoInitials }}</span>
            </span>
            <span class="team-identity">
              <h2 class="team-name">{{ slide.teamName }}</h2>
              <span class="team-meta">
                <span v-if="slide.tier" class="team-tier">{{ slide.tier }}</span>
                <!-- Movement is omitted entirely when there is nothing
                     to report, never rendered as a hollow "+0". -->
                <span
                  v-if="slide.movement"
                  class="team-move"
                  :data-dir="slide.movement.places > 0 ? 'up' : 'down'"
                >
                  {{ slide.movement.places > 0 ? '▲' : '▼' }}
                  {{ Math.abs(slide.movement.places) }} {{ slide.movement.label }}
                </span>
              </span>
            </span>
          </div>

          <p class="team-stat">
            <span class="team-stat-value">{{ slide.statValue }}</span>
            <span class="team-stat-label">{{ slide.statLabel }}</span>
          </p>

          <ul v-if="slide.chips?.length" class="slide-chips" role="list">
            <li v-for="c in slide.chips" :key="c.label" class="slide-chip">
              <span class="slide-chip-value">{{ c.value }}</span>
              <span class="slide-chip-label">{{ c.label }}</span>
            </li>
          </ul>

          <ul v-if="slide.notes?.length" class="team-notes" role="list">
            <li v-for="n in slide.notes" :key="n" class="team-note">{{ n }}</li>
          </ul>
        </section>

        <!-- SIGN OFF -->
        <section v-else class="slide slide-signoff">
          <h2 class="signoff-headline">{{ slide.headline }}</h2>
          <p v-if="slide.sub" class="signoff-sub">{{ slide.sub }}</p>
          <!-- The presentation is over and the room is looking at the
               screen. Leaving them on a dead slide with only a small
               "Exit" in the corner strands the presenter mid-sentence. -->
          <div class="signoff-actions">
            <router-link :to="backLink" class="signoff-action signoff-action-primary">
              Back to the issue
            </router-link>
            <button type="button" class="signoff-action" @click="restart">
              Start over
            </button>
          </div>
          <p class="signoff-brand">theleaguebeat.com</p>
        </section>
        </template>
      </main>

      <!-- Click targets. Big and invisible, so a presenter can advance
           without hunting for a control on a shared screen. -->
      <button class="present-tap present-tap-prev" aria-label="Previous" @click="back"></button>
      <button class="present-tap present-tap-next" aria-label="Next" @click="advance"></button>

      <footer class="present-hint" aria-hidden="true">
        <span>{{ stepIndex + 1 }} / {{ totalSteps }}</span>
        <span class="present-hint-keys">← → to move · Esc to exit</span>
      </footer>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useLeaguesStore } from '@/stores/leaguesNew'
import { sleeperLeagueToCategoryData } from '@/editorial/adapters/sleeperAdapter'
import { espnLeagueToCategoryData } from '@/editorial/adapters/espnAdapter'
import { yahooLeagueToCategoryData } from '@/editorial/adapters/yahooAdapter'
import { buildDraftDeck } from '@/editorial/present/buildDraftDeck'
import { buildBoardDeck, type BoardDeckTeam } from '@/editorial/present/buildBoardDeck'
import {
  rankRosterStrength,
  startingSlots,
  type RosterPlayer,
} from '@/editorial/points/rosterStrength'
import {
  projectSeason,
  weeklyScoreSpread,
  type ScheduledGame,
} from '@/editorial/points/projectedSeason'
import {
  buildDraftBaseline,
  projectionsUrl,
  scoringFor,
  type DraftBaseline,
} from '@/editorial/points/sleeperProjections'
import { deckStepCount, type PresentDeck } from '@/editorial/present/types'

const route = useRoute()
const router = useRouter()
const leaguesStore = useLeaguesStore()

const loading = ref(true)
const error = ref<string | null>(null)
const deck = ref<PresentDeck | null>(null)

/** Which slide, and how many rows of it are revealed. */
const slideIndex = ref(0)
const revealIndex = ref(0)
/** Set when the presenter advances past the sign-off. */
const atEnd = ref(false)

const backLink = computed(() => {
  const id = route.params.leagueId
  return typeof id === 'string' ? `/leagues/${id}/the-issue` : '/'
})

const slide = computed(() => deck.value?.slides[slideIndex.value] ?? null)

/**
 * Rows per column for a long list.
 *
 * The grid derives its column COUNT from this — `grid-auto-flow:
 * column` with a fixed row count creates as many columns as the rows
 * need. So capping rows per column caps the list's HEIGHT, and the
 * height is the whole problem: a fourteen-team league in two columns
 * is seven rows tall, which overflows a 700px-high window by a hair
 * and takes the winner with it. Three columns at five rows is the same
 * height as a ten-team league, which fits every viewport measured.
 */
function rowsPerColumn(total: number): number {
  const columns = total > 12 ? 3 : 2
  return Math.ceil(total / columns)
}

/** A list slide with reveal-one-by-one consumes one step per row. */
const stepsBefore = computed(() => {
  const d = deck.value
  if (!d) return 0
  return d.slides.slice(0, slideIndex.value).reduce((total, s) => {
    if (s.kind === 'list' && s.revealOneByOne) return total + Math.max(1, s.rows.length)
    return total + 1
  }, 0)
})
const stepIndex = computed(() => stepsBefore.value + revealIndex.value)
const totalSteps = computed(() => (deck.value ? deckStepCount(deck.value) : 0))
const progressPct = computed(() =>
  totalSteps.value <= 1 ? 100 : ((stepIndex.value + 1) / totalSteps.value) * 100,
)

/** Rows still to reveal on the current slide, if any. */
const rowsRemaining = computed(() => {
  const s = slide.value
  if (!s || s.kind !== 'list' || !s.revealOneByOne) return 0
  return Math.max(0, s.rows.length - 1 - revealIndex.value)
})

function advance(): void {
  if (!deck.value) return
  if (rowsRemaining.value > 0) {
    revealIndex.value += 1
    return
  }
  if (slideIndex.value < deck.value.slides.length - 1) {
    slideIndex.value += 1
    revealIndex.value = 0
    return
  }
  // Already on the sign-off. Advancing again leaves the deck rather
  // than doing nothing, which reads as a broken key.
  atEnd.value = true
}

watch(atEnd, (done) => {
  if (done) void router.push(backLink.value)
})

/** Present it again without leaving the room and reloading. */
function restart(): void {
  slideIndex.value = 0
  revealIndex.value = 0
}

function back(): void {
  if (!deck.value) return
  if (revealIndex.value > 0) {
    revealIndex.value -= 1
    return
  }
  if (slideIndex.value > 0) {
    slideIndex.value -= 1
    const prev = deck.value.slides[slideIndex.value]
    // Stepping back into a list lands on its LAST row, not its first —
    // otherwise going back re-reveals rows the room has already seen.
    revealIndex.value =
      prev.kind === 'list' && prev.revealOneByOne ? Math.max(0, prev.rows.length - 1) : 0
  }
}

function onKey(e: KeyboardEvent): void {
  if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') {
    e.preventDefault()
    advance()
  } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
    e.preventDefault()
    back()
  } else if (e.key === 'Escape') {
    void router.push(backLink.value)
  }
}

/**
 * Assemble the preseason board.
 *
 * Three fetches the league contract does not carry: current rosters
 * (the contract has teams but not who is ON them), the season
 * schedule, and last season's scores for the variance estimate. All
 * public, all small, and each optional — the deck degrades from
 * "ranking plus projected records" to "ranking" to nothing rather than
 * failing.
 */
async function buildBoard(args: {
  record: { league_name?: string | null; settings?: Record<string, unknown> | null }
  data: { leagueName: string; currentSeason: number; teams: { id: string }[] }
  baseline?: DraftBaseline
  rosterPositions?: string[]
  teamName: (teamId: string) => string
  teamVisual: (teamId: string) => BoardDeckTeam | undefined
  leagueId: string
  /** From the live league object. `0` means UNSET on Sleeper, not
   *  "no playoffs", which is why this is validated rather than used. */
  playoffWeekStart?: number
  /** The draft, for the "since draft night" movement figure. */
  picks?: { playerId: string; position: string; draftedByTeamId: string }[]
}): Promise<PresentDeck | null> {
  const { baseline, rosterPositions, leagueId } = args
  if (!baseline || !rosterPositions?.length) return null

  const rostersRes = await fetch(`https://api.sleeper.app/v1/league/${leagueId}/rosters`)
  if (!rostersRes.ok) return null
  const rosters = (await rostersRes.json()) as {
    roster_id: number
    players?: string[] | null
  }[]

  // Positions come from the projections payload, which already carries
  // them — so no second player lookup, and no name matching.
  const players: RosterPlayer[] = []
  for (const r of rosters) {
    for (const playerId of r.players ?? []) {
      players.push({
        playerId,
        position: baseline.positionOf(playerId) ?? '',
        teamId: String(r.roster_id),
      })
    }
  }
  const strength = rankRosterStrength(players, baseline.pointsOf, rosterPositions)
  if (strength.length < 4) return null

  // The schedule, for projected records. Sleeper publishes every week's
  // pairings before kickoff, so this works in preseason.
  const endWeek = Math.max(1, Math.min(18, regularSeasonWeeksOf(args.playoffWeekStart)))
  let schedule: ScheduledGame[] = []
  try {
    const weeks = await Promise.all(
      Array.from({ length: endWeek }, (_, i) =>
        fetch(`https://api.sleeper.app/v1/league/${leagueId}/matchups/${i + 1}`)
          .then((r) => (r.ok ? r.json() : []))
          .then((ms) => ({ week: i + 1, ms })),
      ),
    )
    schedule = weeks.flatMap(({ week, ms }) => pairSchedule(week, ms))
  } catch {
    // No schedule — the deck ranks rosters and skips records.
  }

  // Variance from the league's OWN prior season where there is one.
  let measuredSpread: number | undefined
  const previousLeagueId = (args.record.settings as Record<string, unknown> | null)
    ?.previous_league_id
  if (previousLeagueId) {
    try {
      const prior = await Promise.all(
        Array.from({ length: endWeek }, (_, i) =>
          fetch(`https://api.sleeper.app/v1/league/${previousLeagueId}/matchups/${i + 1}`)
            .then((r) => (r.ok ? r.json() : [])),
        ),
      )
      measuredSpread = weeklyScoreSpread(
        prior.flat().map((m: { points?: number }) => m?.points ?? 0),
      )
    } catch {
      // Falls back to the documented default spread.
    }
  }

  const projected = schedule.length
    ? projectSeason(
        strength.map((t) => ({ teamId: t.teamId, pointsPerWeek: t.pointsPerWeek })),
        schedule,
        measuredSpread,
      )
    : undefined

  // Where each team ranked on the roster it DRAFTED. The difference
  // from where it ranks now is what waivers did — preseason's honest
  // analogue of week-over-week movement, since there is no last week.
  let draftRank: ((teamId: string) => number | undefined) | undefined
  if (args.picks?.length) {
    const drafted = rankRosterStrength(
      args.picks.map<RosterPlayer>((p) => ({
        playerId: p.playerId,
        position: p.position,
        teamId: p.draftedByTeamId,
      })),
      baseline.pointsOf,
      rosterPositions,
    )
    const byTeam = new Map(drafted.map((t) => [t.teamId, t.rank]))
    draftRank = (teamId) => byTeam.get(teamId)
  }

  return buildBoardDeck({
    leagueName: args.record.league_name || args.data.leagueName,
    season: args.data.currentSeason,
    strength,
    projected,
    measuredSpread,
    teamName: args.teamName,
    team: args.teamVisual,
    formatLabel: baseline.formatLabel,
    playerName: baseline.nameOf,
    startingSlotCount: startingSlots(rosterPositions).length,
    draftRank,
  })
}

/** Pair one week's raw entries into scheduled games. `matchup_id` is
 *  null for byes and unpaired teams — grouping before filtering would
 *  invent games between teams that never met. */
function pairSchedule(
  week: number,
  entries: { roster_id?: number; matchup_id?: number | null }[],
): ScheduledGame[] {
  const byId = new Map<number, string[]>()
  for (const e of entries) {
    if (e?.matchup_id == null || e.roster_id == null) continue
    byId.set(e.matchup_id, [...(byId.get(e.matchup_id) ?? []), String(e.roster_id)])
  }
  const games: ScheduledGame[] = []
  for (const pair of byId.values()) {
    if (pair.length === 2) {
      games.push({ week, homeTeamId: pair[0], awayTeamId: pair[1] })
    }
  }
  return games
}

/** Regular-season length from the league's playoff start. `0` means
 *  UNSET on Sleeper, not "no playoffs", so it falls back rather than
 *  producing a negative week count. */
function regularSeasonWeeksOf(playoffWeekStart?: number): number {
  const pws = Number(playoffWeekStart)
  return Number.isFinite(pws) && pws > 1 ? pws - 1 : 14
}

async function load(): Promise<void> {
  loading.value = true
  error.value = null
  deck.value = null
  try {
    const uuid = route.params.leagueId
    if (typeof uuid !== 'string') throw new Error('No league in the URL.')
    await leaguesStore.ensureLeagueLoaded(uuid)
    const record = leaguesStore.leagues.find((l) => l.id === uuid)
    if (!record) throw new Error("This league couldn't be resolved.")

    const id = record.platform_league_id
    const data =
      record.platform === 'espn'
        ? await espnLeagueToCategoryData(id)
        : record.platform === 'yahoo'
          ? await yahooLeagueToCategoryData(id)
          : await sleeperLeagueToCategoryData(id)

    const teamName = (teamId: string) =>
      data.teams.find((t) => t.id === teamId)?.name ?? `Team ${teamId}`

    // The baseline for the value read AND the projected-roster grade.
    //
    // Sleeper's own ADP and season projections, both on the
    // projections endpoint. Matched on player_id, so there is no name
    // matching anywhere: 100% coverage on a real 140-pick draft where
    // the third-party source this replaced managed 98.6% and needed a
    // normalizer plus a special case for defenses. It is also the ADP
    // of the platform this league drafted on.
    //
    // Best-effort. A failure costs the value and roster slides and
    // nothing else; the factual slides stand on the pick list.
    let baseline: DraftBaseline | undefined
    let rosterPositions: string[] | undefined
    let playoffWeekStart: number | undefined
    let consensusRank: ((playerId: string) => number | undefined) | undefined
    const picks = [...(data.draft?.picks ?? [])]

    if (picks.length > 0 && record.platform === 'sleeper' && record.sport === 'football') {
      try {
        // Scoring settings decide WHICH series applies — a half-PPR
        // league read against PPR ADP misvalues every receiver, and
        // superflex moves quarterbacks further than either.
        //
        // Fetched rather than read from `leagues.settings`, which only
        // persists `previous_league_id`. Backfilling that column would
        // still leave every league connected before today without it;
        // this is ~2KB, public and unauthenticated, and always current.
        const lgRes = await fetch(`https://api.sleeper.app/v1/league/${id}`)
        if (lgRes.ok) {
          const lg = (await lgRes.json()) as {
            scoring_settings?: Record<string, unknown>
            roster_positions?: string[]
            settings?: { playoff_week_start?: number }
          }
          rosterPositions = lg.roster_positions
          playoffWeekStart = lg.settings?.playoff_week_start
          const scoring = scoringFor(lg.scoring_settings, lg.roster_positions)
          const res = await fetch(projectionsUrl(data.currentSeason))
          if (res.ok) {
            baseline = buildDraftBaseline(await res.json(), scoring) ?? undefined
          }
        }
      } catch {
        // Falls through to search_rank below.
      }
    }

    // Fallback only. Sleeper publishes `search_rank` inside its full
    // player blob (~15MB), far past the localStorage quota the service
    // cache uses — so fetch it directly, keep the handful of ranks this
    // draft needs, and let the rest be garbage collected.
    if (!baseline && picks.length > 0 && record.platform === 'sleeper') {
      try {
        const res = await fetch('https://api.sleeper.app/v1/players/nfl')
        if (res.ok) {
          const blob = (await res.json()) as Record<string, { search_rank?: unknown }>
          const ranks = new Map<string, number>()
          for (const p of picks) {
            const r = blob[p.playerId]?.search_rank
            if (typeof r === 'number') ranks.set(p.playerId, r)
          }
          if (ranks.size > 0) consensusRank = (id) => ranks.get(id)
        }
      } catch {
        // Offline or rate-limited — the deck degrades to its factual
        // slides rather than failing to build.
      }
    }

    const teamVisual = (teamId: string) => {
      const t = data.teams.find((x) => x.id === teamId)
      if (!t) return undefined
      return {
        name: t.name,
        avatarUrl: t.avatarUrl,
        avatarColor: t.avatarColor,
        ownerInitials: t.ownerInitials,
      }
    }

    // Which deck the URL asked for. This used to be ignored — every
    // route built the draft deck, so /present/board silently rendered
    // the draft. Adding a second deck is what surfaced it.
    const deckId = typeof route.params.deckId === 'string' ? route.params.deckId : 'draft'

    if (deckId === 'board') {
      deck.value = await buildBoard({
        record,
        data,
        baseline,
        rosterPositions,
        teamName,
        teamVisual,
        leagueId: id,
        playoffWeekStart,
        picks,
      })
    } else {
      deck.value = buildDraftDeck({
        leagueName: record.league_name || data.leagueName,
        season: data.currentSeason,
        picks,
        teamName,
        baseline,
        rosterPositions,
        consensusRank,
        team: teamVisual,
      })
    }
  } catch (err) {
    error.value = (err as Error).message || 'Something went wrong.'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  void load()
  // Focus the container so arrow keys work without a click first.
  requestAnimationFrame(() => {
    document.querySelector<HTMLElement>('.present')?.focus()
  })
})

// Rebuild on deckId too: the picker moves between decks without
// changing the league, and watching only the league left the previous
// deck on screen.
watch(() => [route.params.leagueId, route.params.deckId], () => void load())
</script>

<style scoped>
.present {
  position: fixed;
  inset: 0;
  background: oklch(0.06 0.014 90);
  color: oklch(0.97 0.005 90);
  font-family: 'Barlow', sans-serif;
  display: flex;
  flex-direction: column;
  outline: none;
  overflow: hidden;
}

.present-progress {
  height: 3px;
  background: oklch(0.16 0.015 90);
  flex: 0 0 auto;
}
.present-progress-fill {
  display: block;
  height: 100%;
  background: oklch(0.78 0.18 92);
  transition: width 220ms cubic-bezier(0.22, 1, 0.36, 1);
}

.present-chrome {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 14px 24px;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.76rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: oklch(0.52 0.010 90);
}
.present-chrome-deck { color: oklch(0.78 0.18 92); }
.present-chrome-exit {
  margin-left: auto;
  color: oklch(0.60 0.010 90);
  text-decoration: none;
  position: relative;
  z-index: 3;
}
.present-chrome-exit:hover { color: oklch(0.95 0.005 90); }

.present-stage {
  flex: 1 1 auto;
  display: grid;
  place-items: center;
  padding: 3vh 6vw;
  min-height: 0;
  /* Last resort on a short window: the content stays reachable rather
     than being clipped at the fold. */
  overflow-y: auto;
}

.slide {
  width: min(1100px, 100%);
  display: flex;
  flex-direction: column;
  gap: 18px;
}

/* Cold open + sign-off are centred; content slides are left-aligned so
   long headlines do not wander line to line. */
.slide-cold, .slide-signoff { text-align: center; align-items: center; }

.cold-brand, .signoff-brand {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.28em;
  text-transform: uppercase;
  color: oklch(0.55 0.010 90);
  margin: 0;
}
.cold-title {
  font-weight: 900;
  font-size: clamp(2.6rem, 7vw, 5.6rem);
  letter-spacing: -0.035em;
  line-height: 0.95;
  margin: 0;
  text-wrap: balance;
}
.cold-sub {
  font-weight: 900;
  font-size: clamp(1.4rem, 3vw, 2.4rem);
  letter-spacing: -0.02em;
  color: oklch(0.78 0.18 92);
  margin: 0;
}
.cold-meta {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.95rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: oklch(0.55 0.010 90);
  margin: 0;
}

.slide-eyebrow {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.82rem;
  font-weight: 800;
  letter-spacing: 0.20em;
  text-transform: uppercase;
  color: oklch(0.70 0.27 350);
  margin: 0;
}
.slide-list .slide-headline { font-size: clamp(1.6rem, 3.6vw, 2.9rem); }
.slide-support-tight { font-size: clamp(0.85rem, 1.2vw, 1rem); margin-bottom: 2px; }
.slide-headline {
  font-weight: 900;
  font-size: clamp(2rem, 5.4vw, 4.4rem);
  letter-spacing: -0.03em;
  line-height: 1.02;
  margin: 0;
  text-wrap: balance;
}
.slide-support {
  font-size: clamp(1rem, 1.8vw, 1.4rem);
  line-height: 1.5;
  color: oklch(0.72 0.008 90);
  margin: 0;
  max-width: 46ch;
}

.slide-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  list-style: none;
  padding: 0;
  margin: 10px 0 0;
}
.slide-chip {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 12px 20px;
  border-radius: 12px;
  border: 1px solid oklch(0.22 0.015 90);
  background: oklch(0.09 0.014 90);
}
.slide-chip-value {
  font-weight: 900;
  font-size: 1.7rem;
  letter-spacing: -0.02em;
}
.slide-chip-label {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: oklch(0.55 0.010 90);
}


/* ── TEAM CARD ──────────────────────────────────────────────────────
   One team per slide. The rank is the largest thing on screen: it is
   the reason the slide exists, and in a countdown the room is tracking
   it more than the name. */
.slide-team { display: flex; flex-direction: column; gap: 18px; }
/*
 * The team's own colour behind its card.
 *
 * A wash rather than a fill, and at low opacity on purpose: these are
 * user-uploaded avatar colours, so a card has to stay readable whether
 * the team picked navy or highlighter yellow. Bleeding it from one
 * corner and fading to nothing keeps the type on near-black — where
 * the contrast is known — while still making each team's slide
 * unmistakably theirs as the deck advances.
 *
 * Sits on ::before with the content above it, so no text ever inherits
 * the tint.
 */
.slide-team.has-team-color::before {
  content: '';
  /* Fixed, not absolute: the slide sits inside a width-constrained
     stage, so an absolutely-positioned wash ended at the content edge
     and left a hard vertical seam down a full-screen presentation. */
  position: fixed;
  inset: 0;
  /* The stored value is a comma-separated pair of gradient stops, so
     it is used AS a gradient rather than parsed into a single colour —
     no string handling, and a two-tone team reads as two-tone. */
  background: linear-gradient(135deg, var(--team-wash));
  opacity: 0.3;
  /* Faded out with a mask so the colour is dense in one corner and
     gone by the time it reaches the copy. */
  -webkit-mask-image: radial-gradient(60% 75% at 8% 22%, #000 0%, transparent 75%);
  mask-image: radial-gradient(60% 75% at 8% 22%, #000 0%, transparent 75%);
  pointer-events: none;
  z-index: 0;
}
.slide-team.has-team-color { position: relative; }
.slide-team > * { position: relative; z-index: 1; }
.team-head { display: flex; align-items: center; gap: 18px; flex-wrap: wrap; }
.team-rank {
  font-size: clamp(3.5rem, 8vw, 6rem);
  font-weight: 800;
  line-height: 0.85;
  letter-spacing: -0.03em;
  color: oklch(0.85 0.17 92);
}
.team-rank-of {
  font-size: 0.82rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: oklch(0.62 0.01 90);
  align-self: flex-end;
  margin-left: -8px;
  padding-bottom: 6px;
}
.team-logo {
  width: 64px; height: 64px; border-radius: 16px;
  display: grid; place-items: center; overflow: hidden; flex: none;
}
.team-logo-img { width: 100%; height: 100%; object-fit: cover; }
.team-logo-initials { font-weight: 700; font-size: 1.2rem; }
.team-identity { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.team-name {
  font-size: clamp(1.6rem, 3.4vw, 2.6rem);
  font-weight: 800; line-height: 1.05; margin: 0;
  letter-spacing: -0.02em;
}
.team-meta { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.team-tier {
  font-size: 0.72rem; letter-spacing: 0.16em; text-transform: uppercase;
  padding: 4px 10px; border-radius: 999px;
  border: 1px solid oklch(0.3 0.02 90); color: oklch(0.78 0.01 90);
}
.team-move {
  font-size: 0.78rem; letter-spacing: 0.06em; font-weight: 600;
}
.team-move[data-dir='up'] { color: oklch(0.78 0.17 145); }
.team-move[data-dir='down'] { color: oklch(0.68 0.19 25); }
.team-stat { display: flex; align-items: baseline; gap: 12px; margin: 0; }
.team-stat-value {
  font-size: clamp(2.4rem, 5.5vw, 4rem);
  font-weight: 800; line-height: 1; letter-spacing: -0.02em;
}
.team-stat-label {
  font-size: 0.86rem; color: oklch(0.65 0.01 90);
  letter-spacing: 0.04em;
}
.team-notes {
  list-style: none; padding: 0; margin: 0;
  display: flex; flex-direction: column; gap: 8px;
  max-width: 62ch;
}
.team-note {
  font-size: 0.98rem; line-height: 1.5; color: oklch(0.72 0.01 90);
  padding-left: 14px; border-left: 2px solid oklch(0.28 0.02 90);
}

.list-rows {
  list-style: none;
  padding: 0;
  margin: 8px 0 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
}
/* Long lists: tighter rows and a smaller logo, so a ten-team grade
   sheet fits on one screen without scrolling. */
/*
 * Long lists run in two columns rather than one tall one.
 *
 * A ten-team grade sheet does not fit a laptop viewport in a single
 * column, and the countdown reveals worst-to-best — so the rows that
 * overflowed were precisely the ones the slide exists to show. The
 * presenter reached the end of their own reveal and the winner was
 * off screen.
 *
 * `grid-auto-flow: column` with a fixed row count fills DOWN the first
 * column and then down the second, which keeps reading order and keeps
 * the reveal order: rows appear in sequence, the last one lands bottom
 * right, and every row stays on screen once revealed.
 */
.list-rows.is-split {
  display: grid;
  grid-auto-flow: column;
  grid-template-rows: repeat(var(--rows-per-column, 5), auto);
  grid-auto-columns: 1fr;
  column-gap: 14px;
}
/* One column again when there is no width to split into — two columns
   on a phone would make every row too narrow to read. */
@media (max-width: 900px) {
  .list-rows.is-split {
    display: flex;
    flex-direction: column;
  }
}
.list-rows.is-dense { gap: 4px; }
.list-rows.is-dense .list-row { padding: 8px 14px; gap: 12px; }
.list-rows.is-dense .list-label { font-size: 1.02rem; }
.list-rows.is-dense .list-sub { font-size: 0.68rem; }
.list-rows.is-dense .list-value { font-size: 1.1rem; }
.list-rows.is-dense .list-logo { width: 28px; height: 28px; border-radius: 7px; }
.list-rows.is-dense .list-lead { min-width: 52px; font-size: 0.86rem; }
.list-row {
  display: flex;
  align-items: center;
  gap: 18px;
  padding: 14px 18px;
  border-radius: 12px;
  background: oklch(0.09 0.014 90);
  border: 1px solid oklch(0.18 0.015 90);
  transition: opacity 260ms cubic-bezier(0.22, 1, 0.36, 1),
              transform 260ms cubic-bezier(0.22, 1, 0.36, 1);
}
/* Hidden rows keep their space so the list does not jump as it fills. */
.list-row.is-hidden { opacity: 0; transform: translateY(6px); }
@media (prefers-reduced-motion: reduce) {
  .list-row { transition: opacity 120ms linear; }
  .list-row.is-hidden { transform: none; }
}
.list-lead {
  flex: 0 0 auto;
  min-width: 64px;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.95rem;
  font-weight: 800;
  letter-spacing: 0.10em;
  text-transform: uppercase;
  color: oklch(0.78 0.18 92);
}
.list-logo {
  flex: 0 0 auto;
  width: 38px; height: 38px;
  border-radius: 9px;
  display: grid; place-items: center;
  overflow: hidden;
  background: oklch(0.18 0.015 90);
}
.list-logo-img { width: 100%; height: 100%; object-fit: cover; display: block; }
.list-logo-initials {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.8rem; font-weight: 800; letter-spacing: 0.06em;
  color: oklch(0.97 0.005 90);
}
.list-copy { flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
.list-label { font-size: 1.25rem; font-weight: 700; letter-spacing: -0.01em; }
.list-sub {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.78rem;
  letter-spacing: 0.10em;
  text-transform: uppercase;
  color: oklch(0.55 0.010 90);
}
.list-value { flex: 0 0 auto; font-weight: 900; font-size: 1.35rem; letter-spacing: -0.02em; }

.signoff-headline {
  font-weight: 900;
  font-size: clamp(2.4rem, 6vw, 5rem);
  letter-spacing: -0.03em;
  line-height: 1;
  margin: 0;
}
.signoff-sub { font-size: 1.2rem; color: oklch(0.72 0.008 90); margin: 0; }
.signoff-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  justify-content: center;
  margin-top: 8px;
  position: relative;
  z-index: 3;
}
.signoff-action {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.86rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  padding: 11px 22px;
  border-radius: 999px;
  cursor: pointer;
  text-decoration: none;
  border: 1px solid oklch(0.30 0.015 90);
  background: transparent;
  color: oklch(0.92 0.005 90);
}
.signoff-action:hover { border-color: oklch(0.78 0.18 92 / 0.6); }
.signoff-action-primary {
  background: oklch(0.78 0.18 92);
  border-color: oklch(0.78 0.18 92);
  color: oklch(0.12 0.012 90);
}
.signoff-action-primary:hover { filter: brightness(1.06); }

/* Invisible half-screen tap targets. A presenter on a shared screen
   should not have to aim. */
.present-tap {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 50%;
  background: transparent;
  border: none;
  cursor: pointer;
  z-index: 1;
}
.present-tap-prev { left: 0; cursor: w-resize; }
.present-tap-next { right: 0; cursor: e-resize; }

.present-hint {
  flex: 0 0 auto;
  display: flex;
  justify-content: space-between;
  padding: 12px 24px 16px;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.74rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: oklch(0.40 0.010 90);
  position: relative;
  z-index: 2;
  pointer-events: none;
}

.present-msg {
  margin: auto;
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 24px;
}
.present-msg-head { font-weight: 900; font-size: 1.6rem; margin: 0; }
.present-msg-body { color: oklch(0.65 0.010 90); margin: 0; max-width: 46ch; }
.present-exit {
  margin-top: 10px;
  color: oklch(0.78 0.18 92);
  font-family: 'Barlow Condensed', sans-serif;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  font-weight: 700;
  text-decoration: none;
}
</style>
