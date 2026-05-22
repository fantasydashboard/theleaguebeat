/**
 * Selection + rendering pipeline — Power Rankings page.
 *
 * `renderPRPage(data)` is the single public entry point. It:
 *   1. Runs detection (`detect-pr.ts`) to get all candidates per slot.
 *   2. Selects winners (highest weight per slot).
 *   3. Builds a `PRContext` from each winner's detection context.
 *   4. Calls `renderPR(kind, context)` from `pr.ts` to produce the
 *      final eyebrow / headline / body / chips / kicker strings.
 *
 * Mirrors the shape of `render.ts` (Home).
 */

import type {
  CategoryLeagueData,
  CategoryLeagueDataTeam,
  StoryCandidate,
} from './types.ts'
import {
  detectPRHero,
  detectPRPulse,
  detectPRDynasty,
  detectPRSubHeadline,
  detectPRQuickReads,
  prDetectionHelpers,
  type PRHeroDetectionContext,
  type PRPulseDetectionContext,
  type PRDynastyDetectionContext,
  type PRSubHeadlineDetectionContext,
  type PRQuickReadDetectionContext,
} from './detect-pr.ts'
import {
  renderPR,
  type PRContext,
  type PRKind,
  type PRTeamIdentity,
  type PRQuickReadKind,
} from './pr.ts'

/* ─────────────────────────────────────────────────────────────────
   PUBLIC OUTPUT TYPES
───────────────────────────────────────────────────────────────── */

export interface RenderedPRHeroCopy {
  eyebrow: string
  headline: string
  body: string
  statChips: Array<{ label: string; value: string }>
  kicker: string
  /**
   * Team IDs surfaced so the PR view can render the live avatar / name /
   * accent matching the headline without re-running detection or doing a
   * fragile prefix-match on the headline string. Both optional: the
   * fallback `emptyHero` populates `teamId` with the current rank-1 team
   * but has no antagonist.
   */
  teamId?: string
  opponentTeamId?: string
}

export interface RenderedPRBeat {
  eyebrow: string
  headline: string
  body: string
  /**
   * The team the beat is about. Surfaced for the same reason as on the
   * hero copy — the PR view needs to render the matching avatar / name
   * without doing string matching.
   */
  teamId?: string
}

export interface RenderedPRLongFall extends RenderedPRBeat {
  trajectory: number[]
}

export interface RenderedPRQuickRead {
  label: string
  value: string
}

export interface RenderedPRCopy {
  hero: RenderedPRHeroCopy
  subHeadline: string
  pulse: {
    heater: RenderedPRBeat | null
    longFall: RenderedPRLongFall | null
    steadyHand: RenderedPRBeat | null
  }
  dynasties: {
    hittingKing: RenderedPRBeat | null
    pitchingKing: RenderedPRBeat | null
    puntKings: RenderedPRBeat | null
  }
  quickReads: RenderedPRQuickRead[]
}

/* ─────────────────────────────────────────────────────────────────
   DEBUG OUTPUT TYPE
───────────────────────────────────────────────────────────────── */

export interface PRDetectionSignal {
  slot: 'hero' | 'pulse' | 'dynasty' | 'subHeadline' | 'quickReads'
  kind: PRKind
  weight: number
  signal: string
  selected: boolean
}

export interface RenderedPRCopyWithSignals extends RenderedPRCopy {
  signals: PRDetectionSignal[]
}

/* ─────────────────────────────────────────────────────────────────
   PUBLIC API
───────────────────────────────────────────────────────────────── */

export function renderPRPage(data: CategoryLeagueData): RenderedPRCopy {
  const { copy } = runPipeline(data)
  return copy
}

export function renderPRPageWithSignals(data: CategoryLeagueData): RenderedPRCopyWithSignals {
  const { copy, signals } = runPipeline(data)
  return { ...copy, signals }
}

/* ─────────────────────────────────────────────────────────────────
   PIPELINE
───────────────────────────────────────────────────────────────── */

function runPipeline(data: CategoryLeagueData): {
  copy: RenderedPRCopy
  signals: PRDetectionSignal[]
} {
  const signals: PRDetectionSignal[] = []

  /* 1. Detect */
  const heroCandidates = detectPRHero(data)
  const pulseCandidates = detectPRPulse(data)
  const dynastyCandidates = detectPRDynasty(data)
  const subHeadlineCandidates = detectPRSubHeadline(data)
  const quickReadCandidates = detectPRQuickReads(data)

  /* 2. Select */
  const heroWinner = selectHighest(heroCandidates)
  const heaterWinner = selectHighestOfKind(pulseCandidates, 'pulse-heater')
  const longFallWinner = selectHighestOfKind(pulseCandidates, 'pulse-long-fall')
  const steadyWinner = selectHighestOfKind(pulseCandidates, 'pulse-steady-hand')
  const hittingWinner = selectHighestOfKind(dynastyCandidates, 'dynasty-hitting-king')
  const pitchingWinner = selectHighestOfKind(dynastyCandidates, 'dynasty-pitching-king')
  const puntWinner = selectHighestOfKind(dynastyCandidates, 'dynasty-punt-kings')
  const subHeadlineWinner = selectHighest(subHeadlineCandidates)
  const quickReadWinners = selectQuickReadPills(quickReadCandidates)

  /* 3. Log signals */
  heroCandidates.forEach((c) => signals.push({
    slot: 'hero', kind: c.kind, weight: c.weight, signal: c.context.signal,
    selected: c === heroWinner,
  }))
  pulseCandidates.forEach((c) => signals.push({
    slot: 'pulse', kind: c.kind, weight: c.weight, signal: c.context.signal,
    selected: c === heaterWinner || c === longFallWinner || c === steadyWinner,
  }))
  dynastyCandidates.forEach((c) => signals.push({
    slot: 'dynasty', kind: c.kind, weight: c.weight, signal: c.context.signal,
    selected: c === hittingWinner || c === pitchingWinner || c === puntWinner,
  }))
  subHeadlineCandidates.forEach((c) => signals.push({
    slot: 'subHeadline', kind: c.kind, weight: c.weight,
    signal: `stage=${c.context.stage} climbers=${c.context.climberCount} bleeders=${c.context.bleedingCount} bubble=${c.context.bubbleCount}`,
    selected: c === subHeadlineWinner,
  }))
  quickReadCandidates.forEach((c) => signals.push({
    slot: 'quickReads', kind: c.kind, weight: c.weight,
    signal: `${c.context.pill}: ${c.context.signal}`,
    selected: quickReadWinners.includes(c),
  }))

  /* 4. Render */
  const hero = heroWinner
    ? renderHero(data, heroWinner)
    : emptyHero(data)

  const subHeadline = subHeadlineWinner
    ? renderSubHeadline(data, subHeadlineWinner)
    : ''

  const pulse = {
    heater: heaterWinner ? renderPulseBeat(data, heaterWinner) : null,
    longFall: longFallWinner ? renderLongFallBeat(data, longFallWinner) : null,
    steadyHand: steadyWinner ? renderPulseBeat(data, steadyWinner) : null,
  }

  const dynasties = {
    hittingKing: hittingWinner ? renderDynastyBeat(data, hittingWinner) : null,
    pitchingKing: pitchingWinner ? renderDynastyBeat(data, pitchingWinner) : null,
    puntKings: puntWinner ? renderDynastyBeat(data, puntWinner) : null,
  }

  const quickReads = quickReadWinners.map((c) => renderQuickRead(data, c))

  return {
    copy: { hero, subHeadline, pulse, dynasties, quickReads },
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

function selectHighestOfKind<TKind extends string, TCtx>(
  candidates: Array<StoryCandidate<TKind, TCtx>>,
  kind: TKind,
): StoryCandidate<TKind, TCtx> | null {
  return selectHighest(candidates.filter((c) => c.kind === kind))
}

/** One winning quick-read per PRQuickReadKind pill. */
function selectQuickReadPills(
  candidates: Array<StoryCandidate<PRKind, PRQuickReadDetectionContext>>,
): Array<StoryCandidate<PRKind, PRQuickReadDetectionContext>> {
  const byPill = new Map<PRQuickReadKind, StoryCandidate<PRKind, PRQuickReadDetectionContext>>()
  for (const c of candidates) {
    const existing = byPill.get(c.context.pill)
    if (!existing || c.weight > existing.weight) byPill.set(c.context.pill, c)
  }
  // Stable ordering across pills for the footer.
  const order: PRQuickReadKind[] = ['tightest-race', 'biggest-jump', 'longest-fall', 'longest-streak']
  const out: Array<StoryCandidate<PRKind, PRQuickReadDetectionContext>> = []
  for (const k of order) {
    const v = byPill.get(k)
    if (v) out.push(v)
  }
  return out
}

/* ─────────────────────────────────────────────────────────────────
   CONTEXT BUILDERS — translate detection contexts into PRContext
───────────────────────────────────────────────────────────────── */

function teamToPRTeam(t: CategoryLeagueDataTeam): PRTeamIdentity {
  return { name: t.name, owner: t.ownerName }
}

const REGULAR_SEASON_WEEKS = 12

function basePRContext(data: CategoryLeagueData, teamId: string): PRContext {
  const team = data.teams.find((t) => t.id === teamId)
  if (!team) throw new Error(`PR renderer: unknown teamId ${teamId}`)
  const standing = data.standings.find((s) => s.teamId === teamId)
  if (!standing) throw new Error(`PR renderer: no standing for ${teamId}`)
  const ranks = prDetectionHelpers.ranksFor(data, teamId)
  const topCats = ranks
    ? Object.entries(ranks.catRanks).filter(([, r]) => r <= 3).map(([c]) => c)
    : []
  const bleedingCats = ranks
    ? Object.entries(ranks.catRanks).filter(([, r]) => r >= 8).map(([c]) => c)
    : []

  const wk = data.currentWeek
  const week1Rank = prDetectionHelpers.rankAtWeek(data, teamId, 1) ?? standing.rank
  const prevRank = prDetectionHelpers.rankAtWeek(data, teamId, wk - 1) ?? standing.rank
  const seasonBest = prDetectionHelpers.seasonBestRank(data, teamId)
  const weeksAtTop = standing.rank === 1
    ? consecutiveWeeksAtRankPublic(data, teamId, 1, wk)
    : 0

  return {
    team: teamToPRTeam(team),
    currentRank: standing.rank,
    previousRank: prevRank,
    weeksAtTop,
    allTimeBest: seasonBest,
    catWins: standing.catWins,
    catLosses: standing.catLosses,
    catTies: standing.catTies,
    winPct: standing.winPct,
    rankDeltaThisWeek: prevRank - standing.rank,
    rankDeltaSinceWeek1: week1Rank - standing.rank,
    streak: standing.streak.type === 'T'
      ? undefined
      : { type: standing.streak.type, length: standing.streak.length },
    topCats,
    bleedingCats,
    magnitude: 'solid',
    currentWeek: wk,
    totalWeeks: REGULAR_SEASON_WEEKS,
    weeksUntilPlayoffs: Math.max(0, REGULAR_SEASON_WEEKS - wk),
  }
}

// Inline reimplementation of consecutiveWeeksAtRank, kept private to
// avoid widening the detect-pr.ts public surface.
function consecutiveWeeksAtRankPublic(
  data: CategoryLeagueData,
  teamId: string,
  rank: number,
  endWeek: number,
): number {
  let count = 0
  for (let w = endWeek; w >= 1; w--) {
    if (prDetectionHelpers.rankAtWeek(data, teamId, w) === rank) count++
    else break
  }
  return count
}

/* ─────────────────────────────────────────────────────────────────
   HERO RENDERING
───────────────────────────────────────────────────────────────── */

function renderHero(
  data: CategoryLeagueData,
  winner: StoryCandidate<PRKind, PRHeroDetectionContext>,
): RenderedPRHeroCopy {
  const { context: hc, kind } = winner
  const base = basePRContext(data, hc.teamId)

  // Antagonist (if any).
  const antagonist = hc.opponentTeamId
    ? data.teams.find((t) => t.id === hc.opponentTeamId)
    : undefined

  base.hero = {
    protagonist: base.team,
    antagonist: antagonist ? teamToPRTeam(antagonist) : undefined,
    framing: hc.framing,
  }

  // Magnitude bumps for hero kinds with obvious "huge moment" signals.
  if (kind === 'hero-new-throne' && (hc.weeksHeldByOpponent ?? 0) >= 5) base.magnitude = 'historic'
  else if (kind === 'hero-defending-champ-falling' && (hc.weeksHeldByOpponent ?? 0) >= 5) base.magnitude = 'historic'
  else if (kind === 'hero-biggest-climber' && hc.rankSinceWeek1 - hc.currentRank >= 6) base.magnitude = 'huge'
  else if (kind === 'hero-dynasty-rising' && hc.weeksAtTop >= 5) base.magnitude = 'historic'

  // Override rank-related fields with the hero-specific context so
  // variant conditionals like `ctx.previousRank >= 3` fire correctly.
  base.currentRank = hc.currentRank
  base.previousRank = hc.previousRank
  base.weeksAtTop = hc.weeksAtTop
  base.rankDeltaThisWeek = hc.previousRank - hc.currentRank
  base.rankDeltaSinceWeek1 = hc.rankSinceWeek1 - hc.currentRank

  const rendered = renderPR(kind, base)

  // Hero chip slots: spots-moved / streak / last-week-record.
  const spotsMoved = base.rankDeltaSinceWeek1
  const spotsLabel = spotsMoved > 0 ? `+${spotsMoved}` : `${spotsMoved}`
  const streakLabel = base.streak ? `${base.streak.type}${base.streak.length}` : '—'
  const recordLabel = `${base.catWins}-${base.catLosses}${base.catTies > 0 ? `-${base.catTies}` : ''}`

  const statChips = [
    { label: 'spots', value: spotsLabel },
    { label: 'streak', value: streakLabel },
    { label: 'this season', value: recordLabel },
  ]

  // Kicker — prefer library-supplied, fall back to a deterministic
  // wayfinding line that matches the existing demo's tone.
  const kicker = rendered.kicker
    ?? `FROM #${hc.rankSinceWeek1} TO #${hc.currentRank} IN ${base.currentWeek} WEEK${base.currentWeek === 1 ? '' : 'S'}`

  return {
    eyebrow: rendered.eyebrow,
    headline: rendered.headline,
    body: rendered.body,
    statChips,
    kicker,
    teamId: hc.teamId,
    opponentTeamId: hc.opponentTeamId,
  }
}

function emptyHero(data: CategoryLeagueData): RenderedPRHeroCopy {
  // Safety net for the case where the hero slot has zero candidates
  // (no movement at all). Defaults to current #1 in a flat tone.
  const top = data.standings.find((s) => s.rank === 1)
  const topTeam = top ? data.teams.find((t) => t.id === top.teamId) : undefined
  const name = topTeam?.name ?? 'The leader'
  return {
    eyebrow: 'THE LADDER',
    headline: `${name} holds the line.`,
    body: `Week ${data.currentWeek}. Nobody is climbing fast enough to flip the top.`,
    statChips: [
      { label: 'spots', value: '0' },
      { label: 'streak', value: '—' },
      { label: 'this season', value: top ? `${top.catWins}-${top.catLosses}${top.catTies > 0 ? `-${top.catTies}` : ''}` : '—' },
    ],
    kicker: `WEEK ${data.currentWeek}`,
    teamId: top?.teamId,
  }
}

/* ─────────────────────────────────────────────────────────────────
   SUB-HEADLINE RENDERING
───────────────────────────────────────────────────────────────── */

function renderSubHeadline(
  data: CategoryLeagueData,
  winner: StoryCandidate<PRKind, PRSubHeadlineDetectionContext>,
): string {
  // Pick any team as the focal — sub-headline templates only read
  // ctx.subHeadline / ctx.currentWeek / ctx.weeksUntilPlayoffs, not
  // ctx.team. Use the league-leader for stable defaults.
  const focusId = data.standings.find((s) => s.rank === 1)?.teamId
    ?? data.teams[0]?.id
  if (!focusId) return ''
  const base = basePRContext(data, focusId)
  base.subHeadline = {
    stage: winner.context.stage,
    climberCount: winner.context.climberCount,
    bleedingCount: winner.context.bleedingCount,
    bubbleCount: winner.context.bubbleCount,
  }
  const rendered = renderPR('sub-headline', base)
  return rendered.headline
}

/* ─────────────────────────────────────────────────────────────────
   PULSE RENDERING
───────────────────────────────────────────────────────────────── */

function renderPulseBeat(
  data: CategoryLeagueData,
  winner: StoryCandidate<PRKind, PRPulseDetectionContext>,
): RenderedPRBeat {
  const { context: pc, kind } = winner
  const base = basePRContext(data, pc.teamId)
  // Pulse-specific overrides — these favor the detection-time
  // measurements over the snapshot derived from standings.
  base.rankDeltaThisWeek = pc.rankDeltaThisWeek
  base.rankDeltaSinceWeek1 = pc.rankDeltaSinceWeek1
  if (pc.streakType && pc.streakLength) {
    base.streak = { type: pc.streakType, length: pc.streakLength }
  }
  // Magnitude bumps so the louder variants surface.
  if (kind === 'pulse-heater' && (pc.streakLength ?? 0) >= 5) base.magnitude = 'huge'
  if (kind === 'pulse-long-fall' && Math.abs(pc.rankDeltaSinceWeek1) >= 5) base.magnitude = 'huge'

  const rendered = renderPR(kind, base)
  return {
    eyebrow: rendered.eyebrow,
    headline: rendered.headline,
    body: rendered.body,
    teamId: pc.teamId,
  }
}

function renderLongFallBeat(
  data: CategoryLeagueData,
  winner: StoryCandidate<PRKind, PRPulseDetectionContext>,
): RenderedPRLongFall {
  const beat = renderPulseBeat(data, winner)
  return {
    ...beat,
    trajectory: winner.context.trajectory ?? [],
  }
}

/* ─────────────────────────────────────────────────────────────────
   DYNASTY RENDERING
───────────────────────────────────────────────────────────────── */

function renderDynastyBeat(
  data: CategoryLeagueData,
  winner: StoryCandidate<PRKind, PRDynastyDetectionContext>,
): RenderedPRBeat {
  const { context: dc, kind } = winner
  const base = basePRContext(data, dc.teamId)
  base.dynasty = {
    cats: dc.cats,
    weeksOwning: dc.weeksOwning,
    puntedCat: dc.puntedCat,
    puntedWeeks: dc.puntedWeeks,
  }
  if (dc.weeksOwning >= 8) base.magnitude = 'huge'
  const rendered = renderPR(kind, base)
  return {
    eyebrow: rendered.eyebrow,
    headline: rendered.headline,
    body: rendered.body,
    teamId: dc.teamId,
  }
}

/* ─────────────────────────────────────────────────────────────────
   QUICK-READ RENDERING
───────────────────────────────────────────────────────────────── */

function renderQuickRead(
  data: CategoryLeagueData,
  winner: StoryCandidate<PRKind, PRQuickReadDetectionContext>,
): RenderedPRQuickRead {
  const qc = winner.context
  const base = basePRContext(data, qc.teamId)
  const teamA = base.team
  const opponent = qc.opponentTeamId
    ? data.teams.find((t) => t.id === qc.opponentTeamId)
    : undefined
  const teamB = opponent ? teamToPRTeam(opponent) : undefined

  base.quickRead = {
    kind: qc.pill,
    teamA,
    teamB,
    statValue: qc.statValue,
    statLabel: qc.statLabel,
    catId: qc.catId,
  }

  const rendered = renderPR('quick-read', base)
  return {
    label: rendered.eyebrow || pillLabel(qc.pill),
    value: rendered.headline,
  }
}

function pillLabel(pill: PRQuickReadKind): string {
  switch (pill) {
    case 'tightest-race': return 'TIGHTEST RACE'
    case 'biggest-jump': return 'BIGGEST JUMP'
    case 'longest-fall': return 'LONGEST FALL'
    case 'longest-streak': return 'LONGEST STREAK'
  }
}
