/**
 * Selection + rendering pipeline — History page.
 *
 * `renderHistoryPage(data)` is the single public entry point. It:
 *   1. Runs every detector in `detect-history.ts`.
 *   2. Selects winners (history detection mostly emits one candidate
 *      per slot; selection is trivial except for rivalry profiles,
 *      where every pair survives and is keyed by alphabetized id).
 *   3. Builds a `HistoryContext` per winner and calls
 *      `renderHistory(kind, ctx)` from `history.ts` to produce the
 *      final copy strings.
 *
 * Like `render.ts` for the Home page, this file owns selection + the
 * binding shape. The library owns voice — no string composition here.
 *
 * Degradation:
 *   - Empty `seasonHistory` → year cards = [], all-time-legacy-hero
 *     still renders from teamCareerStats when present, dynasties run
 *     from career totals, footnotes return [] when the underlying
 *     scan finds nothing. The view shows a "first season — no history
 *     yet" banner.
 */

import type {
  CategoryLeagueData,
  CategoryLeagueDataTeam,
  StoryCandidate,
} from './types.ts'
import {
  detectYearCards,
  detectAllTimeLegacyHero,
  detectDynastyHitting,
  detectDynastyPitching,
  detectDynastyPuntKings,
  detectRecordBookFame,
  detectRecordBookShame,
  detectRivalryProfiles,
  detectFootnoteLongestDynasty,
  detectFootnoteBiggestBlowout,
  detectFootnoteClosestChampionship,
  detectFootnoteMostConsistent,
  detectFootnoteMostVolatile,
  type YearCardDetectionContext,
  type AllTimeLegacyDetectionContext,
  type DynastyDetectionContext,
  type RecordBookDetectionContext,
  type RivalryDetectionContext,
  type FootnoteDetectionContext,
} from './detect-history.ts'
import {
  renderHistory,
  type HistoryContext,
  type HistoryKind,
  type HistoryTeam,
} from './history.ts'

/* ─────────────────────────────────────────────────────────────────
   PUBLIC OUTPUT TYPES
───────────────────────────────────────────────────────────────── */

export interface RenderedYearCard {
  year: number
  eraLabel: string
  headline: string
}

export interface RenderedLegacyHero {
  teamId: string
  eyebrow: string
  headline: string
  body: string
}

export interface RenderedDynastyBeat {
  eyebrow: string
  headline: string
  body: string
}

export interface RenderedRecordEntry {
  recordType: string
  eyebrow: string
  headline: string
  body: string
}

export interface RenderedRivalryProfile {
  eyebrow: string
  headline: string
  body: string
  isMarquee: boolean
}

export interface RenderedFootnote {
  kind: string
  label: string
  value: string
}

export interface RenderedHistoryCopy {
  yearCards: RenderedYearCard[]
  allTimeLegacyHero: RenderedLegacyHero | null
  dynasties: {
    hitting: RenderedDynastyBeat | null
    pitching: RenderedDynastyBeat | null
    puntKings: RenderedDynastyBeat | null
  }
  recordBook: {
    fame: RenderedRecordEntry[]
    shame: RenderedRecordEntry[]
  }
  rivalryProfiles: Record<string, RenderedRivalryProfile>   // keyed by `${a}-${b}` (alphabetized)
  footnotes: RenderedFootnote[]
}

/* ─────────────────────────────────────────────────────────────────
   DEBUG OUTPUT TYPE
───────────────────────────────────────────────────────────────── */

export interface HistoryDetectionSignal {
  slot:
    | 'yearCards'
    | 'allTimeLegacy'
    | 'dynastyHitting'
    | 'dynastyPitching'
    | 'dynastyPunt'
    | 'recordBookFame'
    | 'recordBookShame'
    | 'rivalryProfiles'
    | 'footnoteLongestDynasty'
    | 'footnoteBiggestBlowout'
    | 'footnoteClosestChampionship'
    | 'footnoteMostConsistent'
    | 'footnoteMostVolatile'
  kind: HistoryKind
  weight: number
  signal: string
  selected: boolean
}

export interface RenderedHistoryCopyWithSignals extends RenderedHistoryCopy {
  signals: HistoryDetectionSignal[]
}

/* ─────────────────────────────────────────────────────────────────
   PUBLIC API
───────────────────────────────────────────────────────────────── */

export function renderHistoryPage(data: CategoryLeagueData): RenderedHistoryCopy {
  const { copy } = runPipeline(data)
  return copy
}

export function renderHistoryPageWithSignals(
  data: CategoryLeagueData,
): RenderedHistoryCopyWithSignals {
  const { copy, signals } = runPipeline(data)
  return { ...copy, signals }
}

/* ─────────────────────────────────────────────────────────────────
   PIPELINE
───────────────────────────────────────────────────────────────── */

function runPipeline(data: CategoryLeagueData): {
  copy: RenderedHistoryCopy
  signals: HistoryDetectionSignal[]
} {
  const signals: HistoryDetectionSignal[] = []

  /* 1. Detect everything */
  const yearCardCandidates  = detectYearCards(data)
  const legacyCandidates    = detectAllTimeLegacyHero(data)
  const hittingCandidates   = detectDynastyHitting(data)
  const pitchingCandidates  = detectDynastyPitching(data)
  const puntCandidates      = detectDynastyPuntKings(data)
  const fameCandidates      = detectRecordBookFame(data)
  const shameCandidates     = detectRecordBookShame(data)
  const rivalryCandidates   = detectRivalryProfiles(data)
  const longestDynastyCand  = detectFootnoteLongestDynasty(data)
  const biggestBlowoutCand  = detectFootnoteBiggestBlowout(data)
  const closestChampCand    = detectFootnoteClosestChampionship(data)
  const mostConsistentCand  = detectFootnoteMostConsistent(data)
  const mostVolatileCand    = detectFootnoteMostVolatile(data)

  /* 2. Render */

  /* YEAR CARDS — pair era-label + headline per year. */
  const yearCards = buildYearCards(data, yearCardCandidates)

  /* LEGACY HERO — single winner. */
  const legacyWinner = selectHighest(legacyCandidates)
  const allTimeLegacyHero = legacyWinner
    ? renderLegacyHero(data, legacyWinner)
    : null

  /* DYNASTY BEATS — one winner per kind. */
  const hittingWinner  = selectHighest(hittingCandidates)
  const pitchingWinner = selectHighest(pitchingCandidates)
  const puntWinner     = selectHighest(puntCandidates)

  const dynasties = {
    hitting:  hittingWinner  ? renderDynastyBeat(data, hittingWinner)  : null,
    pitching: pitchingWinner ? renderDynastyBeat(data, pitchingWinner) : null,
    puntKings: puntWinner    ? renderDynastyBeat(data, puntWinner)     : null,
  }

  /* RECORD BOOK — all candidates render; the view picks ordering. */
  const fame  = fameCandidates.map((c)  => renderRecordEntry(data, c))
  const shame = shameCandidates.map((c) => renderRecordEntry(data, c))

  /* RIVALRY PROFILES — every pair becomes one entry, keyed by alphabetized id. */
  const rivalryProfiles: Record<string, RenderedRivalryProfile> = {}
  for (const c of rivalryCandidates) {
    const rendered = renderRivalryProfile(data, c)
    rivalryProfiles[keyForPair(c.context.teamAId, c.context.teamBId)] = rendered
  }

  /* FOOTNOTES — 5 pills. Maintain stable order. */
  const footnotes: RenderedFootnote[] = []
  const longestPill          = selectHighest(longestDynastyCand)
  const biggestBlowoutPill   = selectHighest(biggestBlowoutCand)
  const closestChampPill     = selectHighest(closestChampCand)
  const mostConsistentPill   = selectHighest(mostConsistentCand)
  const mostVolatilePill     = selectHighest(mostVolatileCand)

  if (longestPill)        footnotes.push(renderFootnote(data, longestPill,        'LONGEST DYNASTY'))
  if (biggestBlowoutPill) footnotes.push(renderFootnote(data, biggestBlowoutPill, 'BIGGEST BLOWOUT'))
  if (closestChampPill)   footnotes.push(renderFootnote(data, closestChampPill,   'CLOSEST CHAMPIONSHIP'))
  if (mostConsistentPill) footnotes.push(renderFootnote(data, mostConsistentPill, 'MOST CONSISTENT'))
  if (mostVolatilePill)   footnotes.push(renderFootnote(data, mostVolatilePill,   'MOST VOLATILE'))

  /* 3. Log signals (debug) */
  yearCardCandidates.forEach((c) => signals.push({
    slot: 'yearCards', kind: c.kind, weight: c.weight, signal: c.context.signal, selected: true,
  }))
  legacyCandidates.forEach((c) => signals.push({
    slot: 'allTimeLegacy', kind: c.kind, weight: c.weight, signal: c.context.signal, selected: c === legacyWinner,
  }))
  hittingCandidates.forEach((c) => signals.push({
    slot: 'dynastyHitting', kind: c.kind, weight: c.weight, signal: c.context.signal, selected: c === hittingWinner,
  }))
  pitchingCandidates.forEach((c) => signals.push({
    slot: 'dynastyPitching', kind: c.kind, weight: c.weight, signal: c.context.signal, selected: c === pitchingWinner,
  }))
  puntCandidates.forEach((c) => signals.push({
    slot: 'dynastyPunt', kind: c.kind, weight: c.weight, signal: c.context.signal, selected: c === puntWinner,
  }))
  fameCandidates.forEach((c) => signals.push({
    slot: 'recordBookFame', kind: c.kind, weight: c.weight, signal: c.context.signal, selected: true,
  }))
  shameCandidates.forEach((c) => signals.push({
    slot: 'recordBookShame', kind: c.kind, weight: c.weight, signal: c.context.signal, selected: true,
  }))
  rivalryCandidates.forEach((c) => signals.push({
    slot: 'rivalryProfiles', kind: c.kind, weight: c.weight, signal: c.context.signal, selected: true,
  }))
  longestDynastyCand.forEach((c) => signals.push({
    slot: 'footnoteLongestDynasty', kind: c.kind, weight: c.weight, signal: c.context.signal, selected: c === longestPill,
  }))
  biggestBlowoutCand.forEach((c) => signals.push({
    slot: 'footnoteBiggestBlowout', kind: c.kind, weight: c.weight, signal: c.context.signal, selected: c === biggestBlowoutPill,
  }))
  closestChampCand.forEach((c) => signals.push({
    slot: 'footnoteClosestChampionship', kind: c.kind, weight: c.weight, signal: c.context.signal, selected: c === closestChampPill,
  }))
  mostConsistentCand.forEach((c) => signals.push({
    slot: 'footnoteMostConsistent', kind: c.kind, weight: c.weight, signal: c.context.signal, selected: c === mostConsistentPill,
  }))
  mostVolatileCand.forEach((c) => signals.push({
    slot: 'footnoteMostVolatile', kind: c.kind, weight: c.weight, signal: c.context.signal, selected: c === mostVolatilePill,
  }))

  return {
    copy: {
      yearCards,
      allTimeLegacyHero,
      dynasties,
      recordBook: { fame, shame },
      rivalryProfiles,
      footnotes,
    },
    signals,
  }
}

/* ─────────────────────────────────────────────────────────────────
   SELECTION HELPERS
───────────────────────────────────────────────────────────────── */

function selectHighest<TKind extends string, TCtx>(
  candidates: Array<StoryCandidate<TKind, TCtx>>,
): StoryCandidate<TKind, TCtx> | null {
  if (candidates.length === 0) return null
  return candidates.reduce((best, c) => (c.weight > best.weight ? c : best))
}

function keyForPair(a: string, b: string): string {
  return a < b ? `${a}-${b}` : `${b}-${a}`
}

/* ─────────────────────────────────────────────────────────────────
   CONTEXT BUILDERS
───────────────────────────────────────────────────────────────── */

function teamToHistoryTeam(t: CategoryLeagueDataTeam): HistoryTeam {
  return { name: t.name, owner: t.ownerName }
}

function lookupTeam(data: CategoryLeagueData, teamId: string): HistoryTeam | null {
  const t = data.teams.find((x) => x.id === teamId)
  return t ? teamToHistoryTeam(t) : null
}

/* ─────────────────────────────────────────────────────────────────
   YEAR CARDS
───────────────────────────────────────────────────────────────── */

function buildYearCards(
  data: CategoryLeagueData,
  candidates: Array<StoryCandidate<HistoryKind, YearCardDetectionContext>>,
): RenderedYearCard[] {
  // Group by year — each year has one era-label and one headline.
  const byYear = new Map<number, {
    eraLabel?: StoryCandidate<HistoryKind, YearCardDetectionContext>
    headline?: StoryCandidate<HistoryKind, YearCardDetectionContext>
  }>()
  for (const c of candidates) {
    const slot = byYear.get(c.context.year) ?? {}
    if (c.kind === 'year-card-era-label') slot.eraLabel = c
    else if (c.kind === 'year-card-headline') slot.headline = c
    byYear.set(c.context.year, slot)
  }

  const years = [...byYear.keys()].sort((a, b) => b - a)   // newest first
  const out: RenderedYearCard[] = []
  for (const year of years) {
    const { eraLabel, headline } = byYear.get(year) ?? {}
    if (!eraLabel || !headline) continue
    const ctx = buildYearCardContext(data, eraLabel.context)
    const eraRendered = renderHistory('year-card-era-label', ctx)
    const headlineRendered = renderHistory('year-card-headline', ctx)
    out.push({
      year,
      eraLabel: eraRendered.headline,         // era label lives in the headline slot of the template
      headline: headlineRendered.headline,
    })
  }
  return out
}

function buildYearCardContext(
  data: CategoryLeagueData,
  c: YearCardDetectionContext,
): HistoryContext {
  return {
    year: c.year,
    championTeam: lookupTeam(data, c.championTeamId) ?? undefined,
    runnerUp: lookupTeam(data, c.runnerUpTeamId) ?? undefined,
    basement: lookupTeam(data, c.basementTeamId) ?? undefined,
    championRecord: c.championRecord,
    era: c.era,
    championStreakLen: c.championStreakLen,
    championshipCatMargin: c.championshipCatMargin,
  }
}

/* ─────────────────────────────────────────────────────────────────
   ALL-TIME LEGACY HERO
───────────────────────────────────────────────────────────────── */

function renderLegacyHero(
  data: CategoryLeagueData,
  winner: StoryCandidate<HistoryKind, AllTimeLegacyDetectionContext>,
): RenderedLegacyHero | null {
  const team = lookupTeam(data, winner.context.teamId)
  if (!team) return null
  const ctx: HistoryContext = {
    legacyTeam: team,
    totalLegacyScore: winner.context.totalLegacyScore,
    titlesCount: winner.context.titlesCount,
    playoffAppearances: winner.context.playoffAppearances,
    seasonsPlayed: winner.context.seasonsPlayed,
    legacyEra: winner.context.legacyEra,
    legacyLeadMargin: winner.context.legacyLeadMargin,
  }
  const r = renderHistory('all-time-legacy-hero', ctx)
  return {
    teamId: winner.context.teamId,
    eyebrow: r.eyebrow,
    headline: r.headline,
    body: r.body,
  }
}

/* ─────────────────────────────────────────────────────────────────
   DYNASTY BEAT (hitting / pitching / punt)
───────────────────────────────────────────────────────────────── */

function renderDynastyBeat(
  data: CategoryLeagueData,
  winner: StoryCandidate<HistoryKind, DynastyDetectionContext>,
): RenderedDynastyBeat | null {
  const team = lookupTeam(data, winner.context.teamId)
  if (!team) return null
  const ctx: HistoryContext = {
    dynastyTeam: team,
    dynastyYears: winner.context.dynastyYears,
    dynastyCats: winner.context.cats,
    seasonsConsidered: winner.context.dynastyYears,
    topFinishes: winner.context.dynastyYears,
  }
  const r = renderHistory(winner.kind, ctx)
  return { eyebrow: r.eyebrow, headline: r.headline, body: r.body }
}

/* ─────────────────────────────────────────────────────────────────
   RECORD BOOK
───────────────────────────────────────────────────────────────── */

function renderRecordEntry(
  data: CategoryLeagueData,
  winner: StoryCandidate<HistoryKind, RecordBookDetectionContext>,
): RenderedRecordEntry {
  const team = lookupTeam(data, winner.context.teamId)
  const ctx: HistoryContext = {
    recordType: winner.context.recordType,
    recordTeam: team ?? undefined,
    recordValue: winner.context.recordValue,
    recordNumber: winner.context.recordNumber,
    recordYearSpan: winner.context.recordYearSpan,
    recordMargin: winner.context.recordMargin,
  }
  const r = renderHistory(winner.kind, ctx)
  return {
    recordType: winner.context.recordType,
    eyebrow: r.eyebrow,
    headline: r.headline,
    body: r.body,
  }
}

/* ─────────────────────────────────────────────────────────────────
   RIVALRY PROFILES
───────────────────────────────────────────────────────────────── */

function renderRivalryProfile(
  data: CategoryLeagueData,
  winner: StoryCandidate<HistoryKind, RivalryDetectionContext>,
): RenderedRivalryProfile {
  const teamA = lookupTeam(data, winner.context.teamAId)
  const teamB = lookupTeam(data, winner.context.teamBId)
  const ctx: HistoryContext = {
    rivalryTeamA: teamA ?? undefined,
    rivalryTeamB: teamB ?? undefined,
    rivalry: {
      allTimeRecord: winner.context.allTimeRecord,
      meetings: winner.context.meetings,
      catMarginNet: winner.context.catMarginNet,
      trend: winner.context.trend,
    },
  }
  const r = renderHistory(winner.kind, ctx)
  return {
    eyebrow: r.eyebrow,
    headline: r.headline,
    body: r.body,
    isMarquee: winner.context.isMarquee,
  }
}

/* ─────────────────────────────────────────────────────────────────
   FOOTNOTES
───────────────────────────────────────────────────────────────── */

function renderFootnote(
  data: CategoryLeagueData,
  winner: StoryCandidate<HistoryKind, FootnoteDetectionContext>,
  label: string,
): RenderedFootnote {
  const team = lookupTeam(data, winner.context.teamId)
  const opponent = winner.context.opponentTeamId
    ? lookupTeam(data, winner.context.opponentTeamId)
    : null
  const ctx: HistoryContext = {
    footnoteTeam: team ?? undefined,
    footnoteOpponent: opponent ?? undefined,
    footnoteValue: winner.context.value,
    footnoteYearSpan: winner.context.yearSpan,
    footnoteYear: winner.context.year,
  }
  const r = renderHistory(winner.kind, ctx)
  return {
    kind: winner.kind,
    label,
    value: r.headline,
  }
}
