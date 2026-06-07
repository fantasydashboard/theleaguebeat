/**
 * Selection + rendering pipeline — Matchups page.
 *
 * `renderMatchupsPage(data)` is the single public entry point. It:
 *   1. Runs detection (`detect-matchups.ts`) for hero + sub-headline +
 *      per-matchup watch/series + quick-reads.
 *   2. Selects winners — highest weight per slot. The hero slot picks
 *      from across every matchup; per-matchup watch + series pick the
 *      highest-weight candidate for THAT matchup specifically.
 *   3. Builds a `MatchupsContext` from each winner's detection context
 *      and calls `renderMatchups(kind, ctx)` from `matchups.ts` to
 *      produce the final copy strings.
 *
 * Mirrors the shape of `render.ts` (Home page rendering). The library
 * `matchups.ts` owns voice — this file owns selection + the binding
 * shape only.
 */

import type {
  CategoryLeagueData,
  CategoryLeagueDataMatchup,
  CategoryLeagueDataTeam,
  CategoryLeagueDataStanding,
  StoryCandidate,
} from './types.ts'
import {
  detectMatchupHeroes,
  detectMatchupSubHeadline,
  detectMatchupWatch,
  detectMatchupSeries,
  detectMatchupQuickReads,
  deriveCurrentDay,
  deriveDaysLeftInWeek,
  type MatchupHeroDetectionContext,
  type MatchupSubHeadlineDetectionContext,
  type MatchupWatchDetectionContext,
  type MatchupSeriesDetectionContext,
  type MatchupQuickReadDetectionContext,
} from './detect-matchups.ts'
import {
  renderMatchups,
  type MatchupsContext,
  type MatchupsKind,
  type CatId,
  type DayBucket,
  type MatchupStatus,
  type TeamProfile,
} from './matchups.ts'

/* ─────────────────────────────────────────────────────────────────
   PUBLIC OUTPUT TYPES
───────────────────────────────────────────────────────────────── */

export interface RenderedMatchupOfWeek {
  matchupId: string
  eyebrow: string
  headline: string
  body: string
  subContext: string
}

export interface RenderedMatchupWhatToWatch {
  eyebrow: string
  headline: string
}

export interface RenderedMatchupSeasonSeries {
  eyebrow: string
  body: string
}

export interface RenderedMatchupCopy {
  whatToWatch?: RenderedMatchupWhatToWatch
  seasonSeries?: RenderedMatchupSeasonSeries
}

export interface RenderedQuickRead {
  label: string
  value: string
}

export interface RenderedMatchupsCopy {
  matchupOfWeek: RenderedMatchupOfWeek
  subHeadline: string
  matchupCopy: Record<string, RenderedMatchupCopy>
  quickReads: RenderedQuickRead[]
}

/* ─────────────────────────────────────────────────────────────────
   DEBUG OUTPUT TYPE (mirrors render.ts)
───────────────────────────────────────────────────────────────── */

export interface MatchupsDetectionSignal {
  slot: 'hero' | 'subHeadline' | 'watch' | 'series' | 'quickReads'
  matchupId?: string
  kind: MatchupsKind
  weight: number
  signal: string
  selected: boolean
}

export interface RenderedMatchupsCopyWithSignals extends RenderedMatchupsCopy {
  signals: MatchupsDetectionSignal[]
}

/* ─────────────────────────────────────────────────────────────────
   PUBLIC API
───────────────────────────────────────────────────────────────── */

export function renderMatchupsPage(data: CategoryLeagueData): RenderedMatchupsCopy {
  const { copy } = runPipeline(data)
  return copy
}

export function renderMatchupsPageWithSignals(
  data: CategoryLeagueData,
): RenderedMatchupsCopyWithSignals {
  const { copy, signals } = runPipeline(data)
  return { ...copy, signals }
}

/* ─────────────────────────────────────────────────────────────────
   PIPELINE
───────────────────────────────────────────────────────────────── */

function runPipeline(data: CategoryLeagueData): {
  copy: RenderedMatchupsCopy
  signals: MatchupsDetectionSignal[]
} {
  const signals: MatchupsDetectionSignal[] = []
  const matchups = data.matchupsCurrentWeek ?? []

  /* 1. Detect across the page */
  const heroCandidates = detectMatchupHeroes(data)
  const subHeadlineCandidates = detectMatchupSubHeadline(data)
  const quickReadCandidates = detectMatchupQuickReads(data)

  /* 2. Select page-level winners */
  const heroWinner = selectHighest(heroCandidates)
  const subHeadlineWinner = selectHighest(subHeadlineCandidates)
  const quickReadWinners = selectQuickReadPills(quickReadCandidates)

  /* 3. Log page-level signals */
  heroCandidates.forEach((c) => signals.push({
    slot: 'hero',
    matchupId: c.context.matchupId,
    kind: c.kind,
    weight: c.weight,
    signal: c.context.signal,
    selected: c === heroWinner,
  }))
  subHeadlineCandidates.forEach((c) => signals.push({
    slot: 'subHeadline',
    kind: c.kind,
    weight: c.weight,
    signal: c.context.signal,
    selected: c === subHeadlineWinner,
  }))
  quickReadCandidates.forEach((c) => signals.push({
    slot: 'quickReads',
    matchupId: c.context.matchupId,
    kind: c.kind,
    weight: c.weight,
    signal: `${c.context.pill}: ${c.context.label}`,
    selected: quickReadWinners.includes(c),
  }))

  /* 4. Per-matchup watch + series. Each matchup gets at most one
     watch + one series. Degrade gracefully — many matchups will have
     neither, which is the correct outcome. */
  const matchupCopy: Record<string, RenderedMatchupCopy> = {}
  for (const m of matchups) {
    const watchCands = detectMatchupWatch(data, m)
    const seriesCands = detectMatchupSeries(data, m)
    const watchWinner = selectHighest(watchCands)
    const seriesWinner = selectHighest(seriesCands)

    watchCands.forEach((c) => signals.push({
      slot: 'watch',
      matchupId: c.context.matchupId,
      kind: c.kind,
      weight: c.weight,
      signal: c.context.signal,
      selected: c === watchWinner,
    }))
    seriesCands.forEach((c) => signals.push({
      slot: 'series',
      matchupId: c.context.matchupId,
      kind: c.kind,
      weight: c.weight,
      signal: c.context.signal,
      selected: c === seriesWinner,
    }))

    const entry: RenderedMatchupCopy = {}
    if (watchWinner) {
      entry.whatToWatch = renderWatchSlot(data, m, watchWinner)
    }
    if (seriesWinner) {
      entry.seasonSeries = renderSeriesSlot(data, m, seriesWinner)
    }
    matchupCopy[m.id] = entry
  }

  /* 5. Render page-level slots */
  const matchupOfWeek = heroWinner
    ? renderHeroSlot(data, heroWinner)
    : fallbackHero(data, matchups[0])

  const subHeadline = subHeadlineWinner
    ? renderSubHeadlineSlot(data, subHeadlineWinner)
    : `Week ${data.currentWeek}. Live cat math.`

  const quickReads = quickReadWinners.map((c) => renderQuickReadPill(data, c))

  return {
    copy: {
      matchupOfWeek,
      subHeadline,
      matchupCopy,
      quickReads,
    },
    signals,
  }
}

/* ─────────────────────────────────────────────────────────────────
   SELECTION
───────────────────────────────────────────────────────────────── */

function selectHighest<TKind extends string, TCtx>(
  candidates: Array<StoryCandidate<TKind, TCtx>>,
): StoryCandidate<TKind, TCtx> | null {
  if (candidates.length === 0) return null
  return candidates.reduce((best, c) => (c.weight > best.weight ? c : best))
}

/** One winning candidate per QuickReadKind pill. */
function selectQuickReadPills(
  candidates: Array<StoryCandidate<MatchupsKind, MatchupQuickReadDetectionContext>>,
): Array<StoryCandidate<MatchupsKind, MatchupQuickReadDetectionContext>> {
  const byPill = new Map<string, StoryCandidate<MatchupsKind, MatchupQuickReadDetectionContext>>()
  for (const c of candidates) {
    const existing = byPill.get(c.context.pill)
    if (!existing || c.weight > existing.weight) byPill.set(c.context.pill, c)
  }
  return Array.from(byPill.values())
}

/* ─────────────────────────────────────────────────────────────────
   CONTEXT BUILDERS — translate detection contexts into MatchupsContext
───────────────────────────────────────────────────────────────── */

function teamFor(data: CategoryLeagueData, teamId: string): CategoryLeagueDataTeam | undefined {
  return data.teams.find((t) => t.id === teamId)
}

function standingFor(data: CategoryLeagueData, teamId: string): CategoryLeagueDataStanding | undefined {
  return data.standings.find((s) => s.teamId === teamId)
}

function recordFor(data: CategoryLeagueData, teamId: string): string {
  const s = standingFor(data, teamId)
  if (!s) return '0-0-0'
  return s.catTies > 0
    ? `${s.catWins}-${s.catLosses}-${s.catTies}`
    : `${s.catWins}-${s.catLosses}`
}

/** Best-effort mascot — last word of the team name, capitalized. */
function mascotFor(team: CategoryLeagueDataTeam | undefined): string {
  if (!team) return 'Team'
  const parts = team.name.trim().split(/\s+/)
  return parts[parts.length - 1] ?? team.name
}

function topAndBleedingCats(
  data: CategoryLeagueData,
  teamId: string,
): { topCats: CatId[]; bleedingCats: CatId[] } {
  const ranks = data.categoryRanks.find((r) => r.teamId === teamId)
  if (!ranks) return { topCats: [], bleedingCats: [] }
  const topCats = Object.entries(ranks.catRanks)
    .filter(([, r]) => r <= 3)
    .map(([c]) => c) as CatId[]
  const bleedingCats = Object.entries(ranks.catRanks)
    .filter(([, r]) => r >= 8)
    .map(([c]) => c) as CatId[]
  return { topCats, bleedingCats }
}

/** Per-team win probability for the editorial layer. Prefers the
 *  honest projection populated by adapters (`matchup.homeWinProb`),
 *  falling back to a naive cat-record ratio when the field is absent
 *  (older adapter outputs, partial test fixtures). The templates only
 *  ask for "is it inside the margin" / "is it lopsided", not precision. */
function teamWinProbForMatchup(
  matchup: CategoryLeagueDataMatchup,
  side: 'home' | 'away',
): number {
  if (matchup.homeWinProb !== undefined && matchup.awayWinProb !== undefined) {
    const p = side === 'home' ? matchup.homeWinProb : matchup.awayWinProb
    return Math.max(0.01, Math.min(0.99, p))
  }
  const homeWins = matchup.homeCatWins
  const awayWins = matchup.awayCatWins
  const total = homeWins + awayWins + Math.max(0, matchup.contestedCount)
  if (total <= 0) return 0.5
  const num = side === 'home'
    ? homeWins + matchup.contestedCount / 2
    : awayWins + matchup.contestedCount / 2
  return Math.max(0.01, Math.min(0.99, num / total))
}

function teamProfileFor(
  data: CategoryLeagueData,
  matchup: CategoryLeagueDataMatchup,
  side: 'home' | 'away',
): TeamProfile {
  const teamId = side === 'home' ? matchup.homeTeamId : matchup.awayTeamId
  const team = teamFor(data, teamId)
  const standing = standingFor(data, teamId)
  const { topCats, bleedingCats } = topAndBleedingCats(data, teamId)
  const onBubble = standing
    ? Math.abs(standing.rank - data.playoffCutoff) <= 1
    : false
  return {
    name: team?.name ?? `Team ${teamId}`,
    owner: team?.ownerName ?? `Manager ${teamId}`,
    mascot: mascotFor(team),
    catRecord: recordFor(data, teamId),
    winProb: teamWinProbForMatchup(matchup, side),
    topCats,
    bleedingCats,
    seedRank: standing?.rank,
    isOnBubble: onBubble,
  }
}

/** Fallback for adapters that don't yet populate `regularSeasonEndWeek`
 *  (legacy fixtures). The demo league is 12 weeks, the real Yahoo
 *  Triple Crown league is 24. The contract carries the right number
 *  when known; this is only used as last-resort. */
const REGULAR_SEASON_WEEKS_FALLBACK = 12

function weeksLeft(data: CategoryLeagueData): number {
  const endWeek = data.regularSeasonEndWeek ?? REGULAR_SEASON_WEEKS_FALLBACK
  return Math.max(0, endWeek - data.currentWeek)
}

/** Universal MatchupStatus → library MatchupStatus. The library only
 *  exposes 'live' | 'coasting' | 'locked'. Map 'final' and 'upcoming'
 *  to their nearest library-recognized state. */
function mapStatus(status: CategoryLeagueDataMatchup['status']): MatchupStatus {
  switch (status) {
    case 'live':     return 'live'
    case 'coasting': return 'coasting'
    case 'final':    return 'locked'
    case 'upcoming': return 'live'   // pre-week: nothing has happened yet
  }
}

function buildLiveCatLists(matchup: CategoryLeagueDataMatchup): {
  contestedCats: CatId[]
  decidedCats: CatId[]
  puntedCats: CatId[]
} {
  const contested: CatId[] = []
  const decided: CatId[] = []
  const punted: CatId[] = []
  for (const line of matchup.catLines ?? []) {
    const cat = line.catId as CatId
    switch (line.status) {
      case 'contested':     contested.push(cat); break
      case 'decided-home':
      case 'decided-away':  decided.push(cat); break
      case 'punted-home':
      case 'punted-away':   punted.push(cat); break
    }
  }
  return { contestedCats: contested, decidedCats: decided, puntedCats: punted }
}

/** Build the shared `MatchupsContext` fields each kind needs. The
 *  per-kind builders below stack the slot-specific fields on top. */
function baseMatchupsContext(
  data: CategoryLeagueData,
  matchup: CategoryLeagueDataMatchup,
): MatchupsContext {
  const teamA = teamProfileFor(data, matchup, 'home')
  const teamB = teamProfileFor(data, matchup, 'away')
  const today = deriveCurrentDay()
  const daysLeft = deriveDaysLeftInWeek(today)
  const { contestedCats, decidedCats, puntedCats } = buildLiveCatLists(matchup)
  const ties = matchup.ties
  const catRecord = ties > 0
    ? `${matchup.homeCatWins}-${matchup.awayCatWins}-${ties}`
    : `${matchup.homeCatWins}-${matchup.awayCatWins}`

  return {
    teamA,
    teamB,
    catRecord,
    contestedCats,
    decidedCats,
    puntedCats,
    status: mapStatus(matchup.status),
    daysLeftInWeek: daysLeft,
    currentDay: today as DayBucket,
    weeksLeftInRegularSeason: weeksLeft(data),
    isTopOfStandings: (teamA.seedRank ?? 99) <= 2 && (teamB.seedRank ?? 99) <= 2,
    isBubbleClash: teamA.isOnBubble === true && teamB.isOnBubble === true,
  }
}

/* ─────────────────────────────────────────────────────────────────
   HERO MATCHUP-OF-WEEK RENDERING
───────────────────────────────────────────────────────────────── */

function renderHeroSlot(
  data: CategoryLeagueData,
  winner: StoryCandidate<MatchupsKind, MatchupHeroDetectionContext>,
): RenderedMatchupOfWeek {
  const matchup = (data.matchupsCurrentWeek ?? []).find(
    (m) => m.id === winner.context.matchupId,
  )
  if (!matchup) {
    return {
      matchupId: winner.context.matchupId,
      eyebrow: 'MATCHUP OF THE WEEK',
      headline: 'Featured matchup',
      body: '',
      subContext: '',
    }
  }
  const ctx = baseMatchupsContext(data, matchup)
  const rendered = renderMatchups(winner.kind, ctx)
  return {
    matchupId: matchup.id,
    eyebrow: rendered.eyebrow,
    headline: rendered.headline,
    body: rendered.body,
    subContext: rendered.subContext ?? '',
  }
}

function fallbackHero(
  data: CategoryLeagueData,
  matchup: CategoryLeagueDataMatchup | undefined,
): RenderedMatchupOfWeek {
  if (!matchup) {
    return {
      matchupId: '',
      eyebrow: 'MATCHUP OF THE WEEK',
      headline: `Week ${data.currentWeek}. Live cat math.`,
      body: '',
      subContext: '',
    }
  }
  const ctx = baseMatchupsContext(data, matchup)
  const rendered = renderMatchups('hero-top-clash', ctx)
  return {
    matchupId: matchup.id,
    eyebrow: rendered.eyebrow,
    headline: rendered.headline,
    body: rendered.body,
    subContext: rendered.subContext ?? '',
  }
}

/* ─────────────────────────────────────────────────────────────────
   SUB-HEADLINE RENDERING
───────────────────────────────────────────────────────────────── */

function renderSubHeadlineSlot(
  data: CategoryLeagueData,
  winner: StoryCandidate<MatchupsKind, MatchupSubHeadlineDetectionContext>,
): string {
  const { currentDay, liveCount, finalCount, upcomingCount } = winner.context
  const matchups = data.matchupsCurrentWeek ?? []
  // Need an anchor matchup so the context has teamA/teamB filled in;
  // the sub-headline variants only read `currentDay` + `dayCounts`,
  // but `baseMatchupsContext` still needs a matchup to build from.
  const anchor = matchups[0]
  const ctx: MatchupsContext = anchor
    ? baseMatchupsContext(data, anchor)
    : {
        teamA: { name: '', owner: '', mascot: '', catRecord: '', winProb: 0.5, topCats: [], bleedingCats: [] },
        teamB: { name: '', owner: '', mascot: '', catRecord: '', winProb: 0.5, topCats: [], bleedingCats: [] },
        catRecord: '0-0',
        contestedCats: [],
        decidedCats: [],
        puntedCats: [],
        status: 'live',
        daysLeftInWeek: deriveDaysLeftInWeek(currentDay),
        currentDay,
      }
  ctx.currentDay = currentDay as DayBucket
  ctx.dayCounts = { liveCount, finalCount, upcomingCount }
  const rendered = renderMatchups('sub-headline', ctx)
  return rendered.headline
}

/* ─────────────────────────────────────────────────────────────────
   WHAT-TO-WATCH RENDERING (per matchup)
───────────────────────────────────────────────────────────────── */

function renderWatchSlot(
  data: CategoryLeagueData,
  matchup: CategoryLeagueDataMatchup,
  winner: StoryCandidate<MatchupsKind, MatchupWatchDetectionContext>,
): RenderedMatchupWhatToWatch {
  const wc = winner.context
  const ctx = baseMatchupsContext(data, matchup)
  ctx.watch = wc.catId
    ? {
        cat: wc.catId as CatId,
        gamesLeft: wc.gamesLeft,
        teamOnAttack: wc.teamOnAttack,
      }
    : undefined
  const rendered = renderMatchups(winner.kind, ctx)
  return {
    eyebrow: rendered.eyebrow,
    headline: rendered.headline,
  }
}

/* ─────────────────────────────────────────────────────────────────
   SEASON-SERIES RENDERING (per matchup)
───────────────────────────────────────────────────────────────── */

function renderSeriesSlot(
  data: CategoryLeagueData,
  matchup: CategoryLeagueDataMatchup,
  winner: StoryCandidate<MatchupsKind, MatchupSeriesDetectionContext>,
): RenderedMatchupSeasonSeries {
  const sc = winner.context
  const ctx = baseMatchupsContext(data, matchup)
  ctx.series = {
    allTimeRecord: sc.allTimeRecord,
    totalMeetings: sc.totalMeetings,
    trend: sc.trend,
    lastFew: [],
    isFirstMeeting: winner.kind === 'season-series-first-meeting',
  }
  const rendered = renderMatchups(winner.kind, ctx)
  return {
    eyebrow: rendered.eyebrow,
    body: rendered.body,
  }
}

/* ─────────────────────────────────────────────────────────────────
   QUICK-READ RENDERING
───────────────────────────────────────────────────────────────── */

function renderQuickReadPill(
  data: CategoryLeagueData,
  winner: StoryCandidate<MatchupsKind, MatchupQuickReadDetectionContext>,
): RenderedQuickRead {
  const qc = winner.context
  const matchups = data.matchupsCurrentWeek ?? []
  const matchup = qc.matchupId
    ? matchups.find((m) => m.id === qc.matchupId)
    : matchups[0]
  if (!matchup) {
    return { label: pillLabel(qc.pill), value: qc.label }
  }

  const ctx = baseMatchupsContext(data, matchup)
  const sweepGap = Math.abs(matchup.homeCatWins - matchup.awayCatWins)
  ctx.quickRead = {
    pillKind: qc.pill,
    label: qc.label,
    primaryCat: qc.catId as CatId | undefined,
    sweepScore: qc.pill === 'biggest-sweep'
      ? `${Math.max(matchup.homeCatWins, matchup.awayCatWins)}-${Math.min(matchup.homeCatWins, matchup.awayCatWins)}`
      : undefined,
  }
  void sweepGap
  const rendered = renderMatchups('quick-read', ctx)
  // The variant pool sometimes returns a short stock phrase like
  // "Left on the table" when the pre-built `qc.label` carries the
  // actual matchup data. Prefer the longer of the two so the pill
  // never reads as flavor without context.
  const candidate = rendered.headline?.trim() ?? ''
  const fallback = qc.label
  const value = candidate.length > fallback.length ? candidate : fallback
  return {
    label: pillLabel(qc.pill),
    value,
  }
}

function pillLabel(pill: MatchupQuickReadDetectionContext['pill']): string {
  switch (pill) {
    case 'tightest-race-today':   return 'TIGHTEST RACE TODAY'
    case 'biggest-sweep':         return 'BIGGEST SWEEP IN PROGRESS'
    case 'bubble-watch-matchup':  return 'BUBBLE-WATCH MATCHUP'
    case 'biggest-punt':          return 'BIGGEST PUNT'
  }
}
