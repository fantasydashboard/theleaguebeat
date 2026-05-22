/**
 * Selection + rendering pipeline — Home page.
 *
 * `renderHomePage(data)` is the single public entry point. It:
 *   1. Runs detection (`detect.ts`) to get all candidates per slot.
 *   2. Selects winners (highest weight; ticker takes top 5 with a
 *      uniqueness rule).
 *   3. Builds a `HomeContext` from each winner's detection context.
 *   4. Calls `renderHome(kind, context)` from `home.ts` to produce
 *      the final copy strings.
 *
 * No string composition lives here — the library owns voice. This
 * file owns selection + the binding shape.
 */

import type {
  CategoryLeagueData,
  CategoryLeagueDataTeam,
  StoryCandidate,
} from './types.ts'
import {
  detectDailyHero,
  detectTicker,
  detectPlayoffPush,
  detectQuickReads,
  type HeroDetectionContext,
  type TickerDetectionContext,
  type PlayoffPushDetectionContext,
  type QuickReadDetectionContext,
} from './detect.ts'
import {
  renderHome,
  type HomeContext,
  type HomeKind,
  type HomeTeam,
  type HomeCatId,
} from './home.ts'

/* ─────────────────────────────────────────────────────────────────
   PUBLIC OUTPUT TYPES
───────────────────────────────────────────────────────────────── */

export interface RenderedHeroCopy {
  eyebrow: string
  headline: string
  body: string
  /**
   * Team IDs of the protagonist and antagonist in the hero story, so the
   * Home page's hero face-off avatars can swap their visuals to match
   * the live editorial. Both are optional because:
   *   - On the fallback / quiet-day path no hero candidate fires and we
   *     return an empty copy block with neither set.
   *   - Some heroes (e.g. quiet-day) have no opponent — only the
   *     protagonist is meaningful.
   * Consumers should fall back to a fixture-driven visual when either
   * field is missing rather than rendering a broken avatar.
   */
  protagonistTeamId?: string
  antagonistTeamId?: string
}

export interface RenderedTickerRow {
  eyebrow?: string
  headline: string
}

export interface RenderedQuickRead {
  label: string
  value: string
}

export interface RenderedHomeCopy {
  hero: RenderedHeroCopy
  playoffPushCloser: string
  ticker: RenderedTickerRow[]
  quickReads: RenderedQuickRead[]
}

/* ─────────────────────────────────────────────────────────────────
   DEBUG OUTPUT TYPE (for the preview script)
───────────────────────────────────────────────────────────────── */

export interface DetectionSignal {
  slot: 'hero' | 'playoffPush' | 'ticker' | 'quickReads'
  kind: HomeKind
  weight: number
  signal: string
  selected: boolean
}

export interface RenderedHomeCopyWithSignals extends RenderedHomeCopy {
  signals: DetectionSignal[]
}

/* ─────────────────────────────────────────────────────────────────
   PUBLIC API
───────────────────────────────────────────────────────────────── */

export function renderHomePage(data: CategoryLeagueData): RenderedHomeCopy {
  const { copy } = runPipeline(data)
  return copy
}

/** Same pipeline, but also returns the detection signal log so the
 *  preview/debug surface can show what fired and what was selected. */
export function renderHomePageWithSignals(
  data: CategoryLeagueData,
): RenderedHomeCopyWithSignals {
  const { copy, signals } = runPipeline(data)
  return { ...copy, signals }
}

/* ─────────────────────────────────────────────────────────────────
   PIPELINE
───────────────────────────────────────────────────────────────── */

function runPipeline(data: CategoryLeagueData): {
  copy: RenderedHomeCopy
  signals: DetectionSignal[]
} {
  const signals: DetectionSignal[] = []

  /* 1. Detect everything */
  const heroCandidates = detectDailyHero(data)
  const tickerCandidates = detectTicker(data)
  const playoffCandidates = detectPlayoffPush(data)
  const quickReadCandidates = detectQuickReads(data)

  /* 2. Select winners */
  const heroWinner = selectHighest(heroCandidates)
  const playoffWinner = selectHighest(playoffCandidates)
  const tickerWinners = selectTickerTop(tickerCandidates, 5)
  const quickReadWinners = selectQuickReadPills(quickReadCandidates)

  /* 3. Log signals (debug) */
  heroCandidates.forEach((c) => signals.push({
    slot: 'hero', kind: c.kind, weight: c.weight, signal: c.context.signal,
    selected: c === heroWinner,
  }))
  playoffCandidates.forEach((c) => signals.push({
    slot: 'playoffPush', kind: c.kind, weight: c.weight,
    signal: `stakes=${c.context.stakes} gamesBack=${c.context.gamesBack} weeksLeft=${c.context.weeksLeft}`,
    selected: c === playoffWinner,
  }))
  tickerCandidates.forEach((c) => signals.push({
    slot: 'ticker', kind: c.kind, weight: c.weight, signal: c.context.signal,
    selected: tickerWinners.includes(c),
  }))
  quickReadCandidates.forEach((c) => signals.push({
    slot: 'quickReads', kind: c.kind, weight: c.weight,
    signal: `${c.context.pill}: ${c.context.label}`,
    selected: quickReadWinners.includes(c),
  }))

  /* 4. Render */
  const hero = heroWinner
    ? renderHeroSlot(data, heroWinner)
    : { eyebrow: '', headline: '', body: '' }

  const playoffPushCloser = playoffWinner
    ? renderPlayoffSlot(data, playoffWinner)
    : ''

  const ticker = tickerWinners.map((c) => renderTickerRow(data, c))

  const quickReads = quickReadWinners.map((c) => renderQuickReadPill(data, c))

  return {
    copy: { hero, playoffPushCloser, ticker, quickReads },
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

/** Top N ticker candidates, with a uniqueness rule: no two rows with
 *  the same (kind, teamId) tuple. */
function selectTickerTop(
  candidates: Array<StoryCandidate<HomeKind, TickerDetectionContext>>,
  limit: number,
): Array<StoryCandidate<HomeKind, TickerDetectionContext>> {
  const sorted = [...candidates].sort((a, b) => b.weight - a.weight)
  const out: Array<StoryCandidate<HomeKind, TickerDetectionContext>> = []
  const seen = new Set<string>()
  for (const c of sorted) {
    const key = `${c.kind}:${c.context.teamId}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push(c)
    if (out.length >= limit) break
  }
  return out
}

/** One winning candidate per QuickReadKind pill. */
function selectQuickReadPills(
  candidates: Array<StoryCandidate<HomeKind, QuickReadDetectionContext>>,
): Array<StoryCandidate<HomeKind, QuickReadDetectionContext>> {
  const byPill = new Map<string, StoryCandidate<HomeKind, QuickReadDetectionContext>>()
  for (const c of candidates) {
    const existing = byPill.get(c.context.pill)
    if (!existing || c.weight > existing.weight) byPill.set(c.context.pill, c)
  }
  return Array.from(byPill.values())
}

/* ─────────────────────────────────────────────────────────────────
   CONTEXT BUILDERS — translate detection contexts into HomeContext
───────────────────────────────────────────────────────────────── */

function teamToHomeTeam(t: CategoryLeagueDataTeam): HomeTeam {
  return { name: t.name, owner: t.ownerName }
}

function seasonStageFor(data: CategoryLeagueData): HomeContext['seasonStage'] {
  // Use the platform-supplied end week when available; the demo
  // league's 12-week assumption is only the fallback.
  const REGULAR_SEASON_WEEKS = data.regularSeasonEndWeek ?? 12
  const remaining = REGULAR_SEASON_WEEKS - data.currentWeek
  if (remaining <= 1) return 'final-stretch'
  if (remaining <= 3) return 'late'
  if (data.currentWeek <= 3) return 'early'
  return 'mid'
}

/** Build the shared `HomeContext` fields every kind needs. The
 *  per-kind builders below stack the slot-specific fields on top. */
function baseHomeContext(
  data: CategoryLeagueData,
  teamId: string,
): HomeContext {
  const team = data.teams.find((t) => t.id === teamId)
  if (!team) throw new Error(`renderer: unknown teamId ${teamId}`)
  const standing = data.standings.find((s) => s.teamId === teamId)
  if (!standing) throw new Error(`renderer: no standing for ${teamId}`)
  const ranks = data.categoryRanks.find((r) => r.teamId === teamId)
  const topCats = ranks
    ? (Object.entries(ranks.catRanks).filter(([, r]) => r <= 3).map(([c]) => c) as HomeCatId[])
    : []
  const bleedingCats = ranks
    ? (Object.entries(ranks.catRanks).filter(([, r]) => r >= 8).map(([c]) => c) as HomeCatId[])
    : []

  return {
    team: teamToHomeTeam(team),
    rank: {
      current: standing.rank,
      previous: standing.rank,         // overridden per-kind
      weeksAtCurrent: 0,
      delta: 0,
      seasonHigh: standing.rank,
      seasonLow: standing.rank,
    },
    record: {
      wins: standing.catWins,
      losses: standing.catLosses,
      ties: standing.catTies,
      winPct: standing.winPct,
      streak: `${standing.streak.type}${standing.streak.length}`,
      streakLength: standing.streak.length,
      streakDirection: standing.streak.type,
    },
    category: {
      topCats,
      bleedingCats,
      recentlyChangedCats: [],
    },
    magnitude: 'solid',
    seasonStage: seasonStageFor(data),
    weekNumber: data.currentWeek,
    daysPlayedThisWeek: 4,             // mid-week proxy; not surfaced in any current variant we hit
    daysLeftThisWeek: 3,
    isQuietDay: false,
  }
}

/* ─────────────────────────────────────────────────────────────────
   HERO RENDERING
───────────────────────────────────────────────────────────────── */

function renderHeroSlot(
  data: CategoryLeagueData,
  winner: StoryCandidate<HomeKind, HeroDetectionContext>,
): RenderedHeroCopy {
  const ctx = buildHeroContext(data, winner)
  const copy = renderHome(winner.kind, ctx)
  // Surface the detected protagonist + antagonist team IDs so the Home
  // page's face-off visual stays in sync with the headline copy. We do
  // this here (not in renderHome) because the home.ts library is
  // string-only by contract — IDs live on the rendering layer.
  return {
    ...copy,
    protagonistTeamId: winner.context.teamId,
    antagonistTeamId: winner.context.opponentTeamId,
  }
}

function buildHeroContext(
  data: CategoryLeagueData,
  winner: StoryCandidate<HomeKind, HeroDetectionContext>,
): HomeContext {
  const { context: hc, kind } = winner
  const base = baseHomeContext(data, hc.teamId)

  // Opponent (if detected)
  const opponentTeam = hc.opponentTeamId
    ? data.teams.find((t) => t.id === hc.opponentTeamId)
    : undefined

  base.opponent = opponentTeam ? teamToHomeTeam(opponentTeam) : undefined

  base.rank = {
    current: hc.rankCurrent,
    previous: hc.rankPrevious,
    weeksAtCurrent: 0,
    delta: hc.rankPrevious - hc.rankCurrent,
    seasonHigh: hc.rankSeasonHigh,
    seasonLow: hc.rankSeasonLow,
  }

  // Magnitude — a couple of kinds have an obvious "this is a huge
  // moment" signal we can promote.
  if (kind === 'daily-hero-dynasty-falling' && hc.weeksSinceLastChange >= 4) {
    base.magnitude = 'historic'
  } else if (kind === 'daily-hero-new-throne' && hc.weeksSinceLastChange >= 5) {
    base.magnitude = 'historic'
  } else if (kind === 'daily-hero-hot-climber' && hc.rankSeasonLow - hc.rankCurrent >= 6) {
    base.magnitude = 'huge'
  }

  // History — the variant pool uses `history.weeksSinceLastChange`
  // heavily for new-throne / dynasty-falling, so we wire it.
  base.history = {
    weeksSinceLastChange: hc.weeksSinceLastChange,
  }

  base.isQuietDay = kind === 'daily-hero-quiet-day'

  return base
}

/* ─────────────────────────────────────────────────────────────────
   PLAYOFF-PUSH CLOSER RENDERING
───────────────────────────────────────────────────────────────── */

function renderPlayoffSlot(
  data: CategoryLeagueData,
  winner: StoryCandidate<HomeKind, PlayoffPushDetectionContext>,
): string {
  const pc = winner.context
  const topSeatTeams: HomeTeam[] = pc.topSeatTeamIds
    .map((id) => data.teams.find((t) => t.id === id))
    .filter((t): t is CategoryLeagueDataTeam => Boolean(t))
    .map(teamToHomeTeam)
  const bubbleTeams: HomeTeam[] = pc.bubbleTeamIds
    .map((id) => data.teams.find((t) => t.id === id))
    .filter((t): t is CategoryLeagueDataTeam => Boolean(t))
    .map(teamToHomeTeam)

  // The closer needs a focal team for `ctx.team`. Use the first
  // bubble team — the variants overwhelmingly read `ctx.bubble.*`,
  // but a few read `ctx.team.name` as a fallback.
  const focusTeamId = pc.bubbleTeamIds[0] ?? pc.topSeatTeamIds[0]
  if (!focusTeamId) {
    return ''
  }

  const base = baseHomeContext(data, focusTeamId)
  base.bubble = {
    cutoffRank: pc.cutoffRank,
    topSeatTeams,
    bubbleTeams,
    weeksLeft: pc.weeksLeft,
    stakes: pc.stakes,
    gamesBack: pc.gamesBack,
  }

  const rendered = renderHome('playoff-push-closer', base)
  return rendered.headline
}

/* ─────────────────────────────────────────────────────────────────
   TICKER RENDERING
───────────────────────────────────────────────────────────────── */

function renderTickerRow(
  data: CategoryLeagueData,
  winner: StoryCandidate<HomeKind, TickerDetectionContext>,
): RenderedTickerRow {
  const tc = winner.context
  const base = baseHomeContext(data, tc.teamId)
  const standing = data.standings.find((s) => s.teamId === tc.teamId)!

  base.ticker = {
    cat: tc.catId as HomeCatId | undefined,
    streakDescription: tc.streakLength
      ? formatStreakDescription(tc.streakType ?? standing.streak.type, tc.streakLength)
      : undefined,
    gamesFromCut: tc.gamesFromCut,
  }

  const rendered = renderHome(winner.kind, base)
  return {
    eyebrow: eyebrowForTicker(winner.kind),
    headline: rendered.headline,
  }
}

function formatStreakDescription(type: 'W' | 'L' | 'T', length: number): string {
  if (type === 'W') return `${length} straight wins`
  if (type === 'L') return `${length}-game losing streak`
  return `${length} straight`
}

function eyebrowForTicker(kind: HomeKind): string {
  switch (kind) {
    case 'ticker-hot-streak': return 'HOT STREAK'
    case 'ticker-rough-patch': return 'ROUGH PATCH'
    case 'ticker-bubble-watch': return 'BUBBLE WATCH'
    case 'ticker-top-cat-king': return 'TOP CAT KING'
    case 'ticker-blowout': return 'BLOWOUT'
    default: return ''
  }
}

/* ─────────────────────────────────────────────────────────────────
   QUICK-READ RENDERING
───────────────────────────────────────────────────────────────── */

function renderQuickReadPill(
  data: CategoryLeagueData,
  winner: StoryCandidate<HomeKind, QuickReadDetectionContext>,
): RenderedQuickRead {
  const qc = winner.context
  const base = baseHomeContext(data, qc.teamId)
  const opponentTeam = qc.opponentTeamId
    ? data.teams.find((t) => t.id === qc.opponentTeamId)
    : undefined
  base.opponent = opponentTeam ? teamToHomeTeam(opponentTeam) : undefined

  base.quickRead = {
    pill: qc.pill,
    label: qc.label,
    cat: qc.catId as HomeCatId | undefined,
    teamName: base.team.name,
    value: qc.value,
  }

  if (qc.pill === 'on-the-bubble') {
    base.bubble = {
      cutoffRank: data.playoffCutoff,
      topSeatTeams: [],
      bubbleTeams: [base.team],
      weeksLeft: Math.max(1, (data.regularSeasonEndWeek ?? 12) - data.currentWeek),
      stakes: 'tight',
      gamesBack: 1,
    }
  }

  const rendered = renderHome('quick-read', base)
  return {
    label: pillLabel(qc.pill),
    value: rendered.headline,
  }
}

function pillLabel(pill: QuickReadDetectionContext['pill']): string {
  switch (pill) {
    case 'top-cat-this-week': return 'TOP CAT THIS WEEK'
    case 'biggest-upset': return 'BIGGEST UPSET'
    case 'hottest-streak': return 'HOTTEST STREAK'
    case 'on-the-bubble': return 'ON THE BUBBLE'
  }
}
