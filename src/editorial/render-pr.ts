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
import { stripEmojiForEditorial } from './detect-lede.ts'

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

  /* 2. Select — with cross-slot de-duplication so no single team
     headlines two beats. Claim teams in priority order: the cover first,
     then the pulse beats, then the category dynasties. Each slot takes
     the highest-weight candidate whose team has not already been used. */
  const used = new Set<string>()
  const claim = <T extends { context: { teamId?: string } }>(w: T | null): T | null => {
    if (w?.context.teamId) used.add(w.context.teamId)
    return w
  }
  const heroWinner = claim(selectHighest(heroCandidates))
  const heaterWinner = claim(selectHighestOfKind(pulseCandidates, 'pulse-heater', used))
  const longFallWinner = claim(selectHighestOfKind(pulseCandidates, 'pulse-long-fall', used))
  const steadyWinner = claim(selectHighestOfKind(pulseCandidates, 'pulse-steady-hand', used))
  const hittingWinner = claim(selectHighestOfKind(dynastyCandidates, 'dynasty-hitting-king', used))
  const pitchingWinner = claim(selectHighestOfKind(dynastyCandidates, 'dynasty-pitching-king', used))
  const puntWinner = claim(selectHighestOfKind(dynastyCandidates, 'dynasty-punt-kings', used))
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

function selectHighestOfKind<TKind extends string, TCtx extends { teamId?: string }>(
  candidates: Array<StoryCandidate<TKind, TCtx>>,
  kind: TKind,
  used?: Set<string>,
): StoryCandidate<TKind, TCtx> | null {
  return selectHighest(
    candidates.filter(
      (c) => c.kind === kind && (!used || !c.context.teamId || !used.has(c.context.teamId)),
    ),
  )
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
  // Strip emojis from team names in editorial copy. The avatar IS
  // the visual identity; emojis like 🔥 baked into the name read as
  // unedited when they end up inside a column ("🔥 Jazz on my
  // TittyWittys holds the line"). Falls back to the raw name when
  // stripping leaves nothing (rare — happens if the team name is
  // entirely emoji). Same discipline as the LEDE detector.
  const cleaned = stripEmojiForEditorial(t.name)
  return { name: cleaned || t.name, owner: t.ownerName }
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
  // Use the league's real regular-season end when available; the 12-week
  // default is only a fallback for fixtures / leagues that don't report it.
  const seasonEnd = data.regularSeasonEndWeek && data.regularSeasonEndWeek > 0
    ? data.regularSeasonEndWeek
    : REGULAR_SEASON_WEEKS
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
    totalWeeks: seasonEnd,
    weeksUntilPlayoffs: Math.max(0, seasonEnd - wk),
    totalCategories: data.categories.length,
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

  // 'the-race' context — the leader being chased + the open seats.
  if (kind === 'hero-the-race') {
    const leader = hc.raceLeaderId ? data.teams.find((t) => t.id === hc.raceLeaderId) : undefined
    const cutlineTeam = hc.raceCutlineId ? data.teams.find((t) => t.id === hc.raceCutlineId) : undefined
    const leaderClean = leader ? stripEmojiForEditorial(leader.name) || leader.name : undefined
    const cutlineClean = cutlineTeam ? stripEmojiForEditorial(cutlineTeam.name) || cutlineTeam.name : undefined
    base.race = {
      leaderName: leaderClean ?? 'The leader',
      leaderWeeksAtTop: hc.raceLeaderWeeks ?? 0,
      contenderCount: hc.raceContenderCount ?? 0,
      seatsOpen: hc.raceSeatsOpen ?? 0,
      cutlineName: cutlineClean,
    }
  }

  // 'your-team' context — the reader's angle + nearest rival.
  if (kind === 'hero-your-team') {
    const rival = hc.rivalTeamId ? data.teams.find((t) => t.id === hc.rivalTeamId) : undefined
    const rivalClean = rival ? stripEmojiForEditorial(rival.name) || rival.name : undefined
    base.yourTeam = {
      angle: hc.yourTeamAngle ?? 'steady',
      rivalName: rivalClean,
      rivalGap: hc.rivalGap,
    }
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
  // (no movement at all). Branches by lead margin so two leagues with
  // a locked-in #1 don't read identically — a 20+ cat-win lead is a
  // different story from a 3-cat lead, and a 6-week W-streak reads
  // differently from a 10-week one.
  const sorted = [...data.standings].sort((a, b) => a.rank - b.rank)
  const top = sorted[0]
  const second = sorted[1]
  const topTeam = top ? data.teams.find((t) => t.id === top.teamId) : undefined
  const rawName = topTeam?.name ?? 'The leader'
  const name = stripEmojiForEditorial(rawName) || rawName
  const streakLabel = top && top.streak.type !== 'T' && top.streak.length > 0
    ? `${top.streak.type}${top.streak.length}`
    : '—'

  const catGap = top && second ? top.catWins - second.catWins : 0
  const winStreak = top?.streak.type === 'W' ? top.streak.length : 0
  // Tier bands tuned to typical category H2H spreads: ~20+ is a
  // genuine blowout (the chase pack has run out of weeks), 8-19 is a
  // real but workable lead, <8 is competitive.
  const tier: 'blowout' | 'comfortable' | 'tight' =
    catGap >= 20 ? 'blowout' : catGap >= 8 ? 'comfortable' : 'tight'

  const headline = pickEmptyHeroHeadline(name, tier, winStreak)
  const body = pickEmptyHeroBody(data.currentWeek, tier, winStreak, catGap, second, data)
  const eyebrow = pickEmptyHeroEyebrow(tier, winStreak)

  // First chip — for a stationary #1 the "0 SPOTS" reading is
  // tautological (the leader can't move up). Swap in the lead margin
  // when one exists; otherwise keep the spots count for non-leader
  // heroes. Promoted from CategoryDemoPowerRankingsView so the same
  // logic applies on the new Issue page.
  const leaderChip =
    top && second && catGap > 0
      ? { label: 'cats over #2', value: `+${catGap}` }
      : { label: 'spots', value: '0' }

  return {
    eyebrow,
    headline,
    body,
    statChips: [
      leaderChip,
      { label: 'streak', value: streakLabel },
      { label: 'this season', value: top ? `${top.catWins}-${top.catLosses}${top.catTies > 0 ? `-${top.catTies}` : ''}` : '—' },
    ],
    kicker: `WEEK ${data.currentWeek}`,
    teamId: top?.teamId,
  }
}

function pickEmptyHeroEyebrow(
  tier: 'blowout' | 'comfortable' | 'tight',
  winStreak: number,
): string {
  if (tier === 'blowout') return winStreak >= 5 ? 'NOBODY CLOSE' : 'LAPPING THE FIELD'
  if (tier === 'comfortable') return winStreak >= 5 ? 'THE STREAK CONTINUES' : 'THE LADDER'
  return 'ONE SWING AWAY'
}

function pickEmptyHeroHeadline(
  name: string,
  tier: 'blowout' | 'comfortable' | 'tight',
  winStreak: number,
): string {
  if (tier === 'blowout') {
    if (winStreak >= 7) return `${name} is the season.`
    return `${name} laps the field.`
  }
  if (tier === 'comfortable') {
    if (winStreak >= 5) return `${name} keeps extending.`
    return `${name} stays on top.`
  }
  return `${name} clings to it.`
}

function pickEmptyHeroBody(
  week: number,
  tier: 'blowout' | 'comfortable' | 'tight',
  winStreak: number,
  catGap: number,
  second: CategoryLeagueData['standings'][number] | undefined,
  data: CategoryLeagueData,
): string {
  if (tier === 'blowout') {
    if (winStreak >= 7) {
      return `Week ${week}. ${winStreak} straight matchup wins. The chase pack has run out of weeks.`
    }
    return `Week ${week}. ${catGap}-cat margin on #2. The gap is no longer a race.`
  }
  if (tier === 'comfortable') {
    if (winStreak >= 5) {
      return `Week ${week}. ${winStreak} straight wins and a ${catGap}-cat cushion. The chasers stay close, not closer.`
    }
    const secondTeam = second ? data.teams.find((t) => t.id === second.teamId) : undefined
    const secondName = secondTeam ? stripEmojiForEditorial(secondTeam.name) || secondTeam.name : '#2'
    return `Week ${week}. ${secondName} is the only team in the same conversation. They are still chasing.`
  }
  // tight
  return `Week ${week}. ${catGap}-cat lead on #2. The top is one swing away from flipping.`
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

  // Quiet backfill — this team is just the relative best/worst/steadiest
  // in a week with no headline-grade signal. Build a matter-of-fact line
  // directly (per EDITORIAL.md "when a story has no drama") rather than
  // draw from the streak-heavy variant pool, which would overstate.
  if (pc.quiet) {
    return renderQuietPulse(kind, base, pc)
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

/** Matter-of-fact copy for a backfilled pulse beat (no strong signal).
 *  Accurate to the team's real season movement; never overstates. */
function renderQuietPulse(
  kind: PRKind,
  base: PRContext,
  pc: PRPulseDetectionContext,
): RenderedPRBeat {
  const name = base.team.name
  const rec = `${base.catWins}-${base.catLosses}${base.catTies > 0 ? `-${base.catTies}` : ''}`
  const up = pc.rankDeltaSinceWeek1
  let eyebrow = ''
  let headline = ''
  let body = ''
  if (kind === 'pulse-heater') {
    eyebrow = 'TOP OF THE MOVEMENT'
    headline = up > 0 ? `${name} has climbed ${up} since week 1.` : `${name} holds the steadiest momentum in the league.`
    body = `${name}: ${rec}. The closest thing to a hot hand on a quiet week.`
  } else if (kind === 'pulse-long-fall') {
    eyebrow = 'COOLING OFF'
    headline = up < 0 ? `${name} has slipped ${Math.abs(up)} since week 1.` : `${name} has cooled the most lately.`
    body = `${name}: ${rec}. The board is trending the wrong way, quietly.`
  } else {
    eyebrow = 'STEADY HAND'
    headline = `${name} sits at #${base.currentRank} and rarely moves.`
    body = `${name}: ${rec}. The most predictable seed on the board.`
  }
  return { eyebrow, headline, body, teamId: pc.teamId }
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
