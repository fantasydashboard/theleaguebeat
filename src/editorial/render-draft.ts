/**
 * Selection + rendering pipeline — Draft page.
 *
 * `renderDraftPage(data)` is the single public entry point. It:
 *   1. Runs detection (`detect-draft.ts`) for every slot.
 *   2. Selects winners (single-best per slot for hero awards;
 *      one per team for grades; first per kind for the punt /
 *      king triptychs).
 *   3. Builds a `DraftContext` from each winner's detection context.
 *   4. Calls `renderDraft(kind, context)` from `draft.ts` to produce
 *      the final copy strings.
 *
 * No string composition lives here — the library owns voice. This
 * file owns selection + the binding shape.
 *
 * Graceful degradation: when `data.draft` is undefined, every
 * award/grade/king/round value returns null or empty so the page
 * can render an inert state with a single "no draft data" banner.
 */

import type {
  CategoryLeagueData,
  CategoryLeagueDataDraftPick,
  CategoryLeagueDataTeam,
  StoryCandidate,
} from './types.ts'
import {
  detectBestDraftHero,
  detectSteal,
  detectBust,
  detectTeamGrades,
  detectPuntReports,
  detectCategoryKings,
  detectByTheRound,
  detectDraftQuickReads,
  type BestDraftDetectionContext,
  type StealBustDetectionContext,
  type TeamGradeDetectionContext,
  type PuntDetectionContext,
  type CategoryKingDetectionContext,
  type ByTheRoundDetectionContext,
  type DraftQuickReadDetectionContext,
} from './detect-draft.ts'
import {
  renderDraft,
  type DraftContext,
  type DraftKind,
  type GradeLetter,
  type CatId,
  type Position,
  type QuickReadKind,
} from './draft.ts'

/* ─────────────────────────────────────────────────────────────────
   PUBLIC OUTPUT TYPES
───────────────────────────────────────────────────────────────── */

export interface RenderedDraftCopy {
  awards: {
    bestDraft: {
      eyebrow: string
      headline: string
      body: string
      gradeStat?: string
      // Resolved meta the view needs for the hero card chrome.
      teamId: string
      gradeLetter: GradeLetter
      stats: { steals: number; hits: number; busts: number; earlyHitRate: string }
    } | null
    steal: {
      eyebrow: string
      headline: string
      body: string
      pickOverall: number
      playerId: string
      valueScore: number
      draftedByTeamId: string
    } | null
    bust: {
      eyebrow: string
      headline: string
      body: string
      pickOverall: number
      playerId: string
      valueScore: number
      draftedByTeamId: string
    } | null
  }
  teamGrades: Record<string, {
    gradeLetter: GradeLetter
    eyebrow: string
    headline: string
    body: string
    stats: { steals: number; hits: number; misses: number; busts: number }
  }>
  puntReport: {
    success: PuntCopy | null
    failure: PuntCopy | null
    balanced: PuntCopy | null
  }
  categoryKings: {
    fiveTool: KingCopy | null
    lateRoundGem: KingCopy | null
    brokenCat: KingCopy | null
  }
  byTheRound: Array<{ round: number; hits: number; misses: number; avgValue: number; narrative: string }>
  quickReads: Array<{ pill: QuickReadKind; label: string; value: string }>
}

export interface PuntCopy {
  eyebrow: string
  headline: string
  body: string
  teamId: string
  category?: string
  thisSeasonRank?: number
}

export interface KingCopy {
  eyebrow: string
  headline: string
  body: string
  pickOverall: number
  playerId: string
  draftedByTeamId: string
  cats?: string[]
  brokenCat?: string
  brokenTeamId?: string
  draftRoundPick?: string  // pre-formatted "R16 PICK #153"
}

/* ─────────────────────────────────────────────────────────────────
   DEBUG OUTPUT TYPE
───────────────────────────────────────────────────────────────── */

export interface DraftDetectionSignal {
  slot:
    | 'bestDraft'
    | 'steal'
    | 'bust'
    | 'teamGrade'
    | 'punt'
    | 'categoryKing'
    | 'byTheRound'
    | 'quickRead'
  kind: DraftKind
  weight: number
  signal: string
  selected: boolean
}

export interface RenderedDraftCopyWithSignals extends RenderedDraftCopy {
  signals: DraftDetectionSignal[]
}

/* ─────────────────────────────────────────────────────────────────
   PUBLIC API
───────────────────────────────────────────────────────────────── */

/** Empty rendered shape — used when `data.draft` is undefined. */
export function emptyDraftCopy(): RenderedDraftCopy {
  return {
    awards: { bestDraft: null, steal: null, bust: null },
    teamGrades: {},
    puntReport: { success: null, failure: null, balanced: null },
    categoryKings: { fiveTool: null, lateRoundGem: null, brokenCat: null },
    byTheRound: [],
    quickReads: [],
  }
}

export function renderDraftPage(data: CategoryLeagueData): RenderedDraftCopy {
  const { copy } = runPipeline(data)
  return copy
}

/** Same pipeline, but also returns the detection signal log so the
 *  preview / debug surface can show what fired and what was selected. */
export function renderDraftPageWithSignals(
  data: CategoryLeagueData,
): RenderedDraftCopyWithSignals {
  const { copy, signals } = runPipeline(data)
  return { ...copy, signals }
}

/* ─────────────────────────────────────────────────────────────────
   PIPELINE
───────────────────────────────────────────────────────────────── */

function runPipeline(data: CategoryLeagueData): {
  copy: RenderedDraftCopy
  signals: DraftDetectionSignal[]
} {
  const signals: DraftDetectionSignal[] = []

  // No-draft-data path. Render an empty bundle; the page-level
  // template degrades to a banner.
  if (!data.draft) {
    return { copy: emptyDraftCopy(), signals }
  }

  /* 1. Detect everything */
  const bestDraftCandidates  = detectBestDraftHero(data)
  const stealCandidates      = detectSteal(data)
  const bustCandidates       = detectBust(data)
  const teamGradeCandidates  = detectTeamGrades(data)
  const puntCandidates       = detectPuntReports(data)
  const kingCandidates       = detectCategoryKings(data)
  const roundCandidates      = detectByTheRound(data)
  const quickReadCandidates  = detectDraftQuickReads(data)

  /* 2. Select winners */
  const bestDraftWinner = selectHighest(bestDraftCandidates)
  const stealWinner     = selectHighest(stealCandidates)
  const bustWinner      = selectHighest(bustCandidates)

  // Team grades: one per team. Selection here just dedupes by teamId
  // — the detector already emits at most one per team.
  const teamGradeWinners = dedupeByTeam(teamGradeCandidates)

  // Punt report: one per kind (success / failure / balanced), highest
  // weight per kind. Each may legitimately be null if nothing fired.
  const puntSuccessWinner  = selectHighestByKind(puntCandidates, 'punt-success')
  const puntFailureWinner  = selectHighestByKind(puntCandidates, 'punt-failure')
  const puntBalancedWinner = selectHighestByKind(puntCandidates, 'punt-balanced')

  // Category kings: one per kind.
  const fiveToolWinner    = selectHighestByKind(kingCandidates, 'category-king-five-tool')
  const lateRoundWinner   = selectHighestByKind(kingCandidates, 'category-king-late-round-gem')
  const brokenCatWinner   = selectHighestByKind(kingCandidates, 'category-king-broken-cat')

  // By the round: emit one rendered narrative per round, in order.
  const roundWinners = [...roundCandidates].sort(
    (a, b) => a.context.round - b.context.round,
  )

  // Quick reads: one per pill kind, highest weight per pill.
  const quickReadWinners = selectQuickReadPills(quickReadCandidates)

  /* 3. Log signals */
  bestDraftCandidates.forEach((c) => signals.push({
    slot: 'bestDraft', kind: c.kind, weight: c.weight,
    signal: c.context.signal, selected: c === bestDraftWinner,
  }))
  stealCandidates.forEach((c) => signals.push({
    slot: 'steal', kind: c.kind, weight: c.weight,
    signal: c.context.signal, selected: c === stealWinner,
  }))
  bustCandidates.forEach((c) => signals.push({
    slot: 'bust', kind: c.kind, weight: c.weight,
    signal: c.context.signal, selected: c === bustWinner,
  }))
  teamGradeCandidates.forEach((c) => signals.push({
    slot: 'teamGrade', kind: c.kind, weight: c.weight,
    signal: c.context.signal, selected: teamGradeWinners.includes(c),
  }))
  puntCandidates.forEach((c) => signals.push({
    slot: 'punt', kind: c.kind, weight: c.weight,
    signal: c.context.signal,
    selected: c === puntSuccessWinner || c === puntFailureWinner || c === puntBalancedWinner,
  }))
  kingCandidates.forEach((c) => signals.push({
    slot: 'categoryKing', kind: c.kind, weight: c.weight,
    signal: c.context.signal,
    selected: c === fiveToolWinner || c === lateRoundWinner || c === brokenCatWinner,
  }))
  roundCandidates.forEach((c) => signals.push({
    slot: 'byTheRound', kind: c.kind, weight: c.weight,
    signal: c.context.signal, selected: true,
  }))
  quickReadCandidates.forEach((c) => signals.push({
    slot: 'quickRead', kind: c.kind, weight: c.weight,
    signal: `${c.context.pill}: ${c.context.label}`,
    selected: quickReadWinners.includes(c),
  }))

  /* 4. Render */
  const bestDraftCopy = bestDraftWinner
    ? renderBestDraft(data, bestDraftWinner)
    : null

  const stealCopy = stealWinner
    ? renderStealBust(data, stealWinner)
    : null

  const bustCopy = bustWinner
    ? renderStealBust(data, bustWinner)
    : null

  const teamGrades: RenderedDraftCopy['teamGrades'] = {}
  for (const w of teamGradeWinners) {
    const rendered = renderTeamGrade(data, w)
    if (rendered) teamGrades[w.context.teamId] = rendered
  }

  const puntReport: RenderedDraftCopy['puntReport'] = {
    success: puntSuccessWinner ? renderPunt(data, puntSuccessWinner) : null,
    failure: puntFailureWinner ? renderPunt(data, puntFailureWinner) : null,
    balanced: puntBalancedWinner ? renderPunt(data, puntBalancedWinner) : null,
  }

  const categoryKings: RenderedDraftCopy['categoryKings'] = {
    fiveTool: fiveToolWinner ? renderKing(data, fiveToolWinner) : null,
    lateRoundGem: lateRoundWinner ? renderKing(data, lateRoundWinner) : null,
    brokenCat: brokenCatWinner ? renderKing(data, brokenCatWinner) : null,
  }

  const byTheRound = roundWinners.map((c) => renderRound(data, c))
  const quickReads = quickReadWinners.map((c) => renderQuickReadPill(c))

  return {
    copy: {
      awards: { bestDraft: bestDraftCopy, steal: stealCopy, bust: bustCopy },
      teamGrades,
      puntReport,
      categoryKings,
      byTheRound,
      quickReads,
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
  return candidates.reduce((b, c) => (c.weight > b.weight ? c : b))
}

function selectHighestByKind<TKind extends string, TCtx>(
  candidates: Array<StoryCandidate<TKind, TCtx>>,
  kind: TKind,
): StoryCandidate<TKind, TCtx> | null {
  const filtered = candidates.filter((c) => c.kind === kind)
  return selectHighest(filtered)
}

function dedupeByTeam(
  candidates: Array<StoryCandidate<DraftKind, TeamGradeDetectionContext>>,
): Array<StoryCandidate<DraftKind, TeamGradeDetectionContext>> {
  const byTeam = new Map<string, StoryCandidate<DraftKind, TeamGradeDetectionContext>>()
  for (const c of candidates) {
    const existing = byTeam.get(c.context.teamId)
    if (!existing || c.weight > existing.weight) byTeam.set(c.context.teamId, c)
  }
  return Array.from(byTeam.values())
}

function selectQuickReadPills(
  candidates: Array<StoryCandidate<DraftKind, DraftQuickReadDetectionContext>>,
): Array<StoryCandidate<DraftKind, DraftQuickReadDetectionContext>> {
  const byPill = new Map<string, StoryCandidate<DraftKind, DraftQuickReadDetectionContext>>()
  for (const c of candidates) {
    const existing = byPill.get(c.context.pill)
    if (!existing || c.weight > existing.weight) byPill.set(c.context.pill, c)
  }
  return Array.from(byPill.values())
}

/* ─────────────────────────────────────────────────────────────────
   CONTEXT BUILDERS — translate detection contexts into DraftContext
───────────────────────────────────────────────────────────────── */

function teamObj(data: CategoryLeagueData, teamId: string): CategoryLeagueDataTeam | undefined {
  return data.teams.find((t) => t.id === teamId)
}

function teamMeta(data: CategoryLeagueData, teamId: string): { name: string; owner: string } {
  const t = teamObj(data, teamId)
  if (!t) return { name: `Team ${teamId}`, owner: `Manager ${teamId}` }
  return { name: t.name, owner: t.ownerName }
}

function lastNameOf(playerName: string): string {
  const parts = playerName.split(/\s+/)
  return parts.length > 1 ? parts.slice(1).join(' ') : playerName
}

function firstNameOf(playerName: string): string {
  return playerName.split(/\s+/)[0] ?? playerName
}

function valueLabel(v: number): string {
  return v >= 0 ? `+${v}` : `${v}`
}

function tierForPick(p: CategoryLeagueDataDraftPick): DraftContext['playerTier'] {
  if (p.round <= 3) return 'elite-ADP'
  if (p.round <= 8) return 'mid-ADP'
  if (p.round <= 15) return 'late-round'
  return 'waiver-wire'
}

/** Cast cat ids from the universal contract (open string) into the
 *  draft library's narrower CatId union. The fixture / Sleeper data
 *  use the same uppercase short codes so this is a safe widening. */
function asCatId(id: string | undefined): CatId | undefined {
  if (!id) return undefined
  return id as CatId
}

function asPosition(p: string | undefined): Position | undefined {
  if (!p) return undefined
  return p as Position
}

/* ─────────────────────────────────────────────────────────────────
   RENDERERS
───────────────────────────────────────────────────────────────── */

function renderBestDraft(
  data: CategoryLeagueData,
  winner: StoryCandidate<DraftKind, BestDraftDetectionContext>,
): NonNullable<RenderedDraftCopy['awards']['bestDraft']> {
  const ctx = winner.context
  const meta = teamMeta(data, ctx.teamId)
  const dctx: DraftContext = {
    teamName: meta.name,
    teamOwner: meta.owner,
    gradeRank: 1,
    gradeLetter: 'A+',
    stealsCount: ctx.stealsCount,
    hitsCount: ctx.hitsCount,
    bustsCount: ctx.bustsCount,
    missesCount: ctx.missesCount,
    earlyHitRatePct: ctx.earlyHitRatePct,
  }
  const r = renderDraft('best-draft-hero', dctx)
  return {
    ...r,
    gradeStat: `${ctx.earlyHitRatePct}% early hit rate`,
    teamId: ctx.teamId,
    gradeLetter: 'A+',
    stats: {
      steals: ctx.stealsCount,
      hits: ctx.hitsCount,
      busts: ctx.bustsCount,
      earlyHitRate: `${ctx.earlyHitRatePct}%`,
    },
  }
}

function renderStealBust(
  data: CategoryLeagueData,
  winner: StoryCandidate<DraftKind, StealBustDetectionContext>,
): NonNullable<RenderedDraftCopy['awards']['steal']> {
  const ctx = winner.context
  const meta = teamMeta(data, ctx.draftedByTeamId)
  const dctx: DraftContext = {
    playerFirstName: firstNameOf(ctx.playerName),
    playerLastName: lastNameOf(ctx.playerName),
    playerFullName: ctx.playerName,
    position: asPosition(ctx.position),
    mlbTeam: ctx.mlbTeam,
    draftPick: ctx.pickOverall,
    draftRound: ctx.round,
    valueScore: ctx.valueScore,
    valueLabel: valueLabel(ctx.valueScore),
    playerTier: tierForPick({
      pickOverall: ctx.pickOverall,
      round: ctx.round,
      playerId: ctx.playerId,
      playerName: ctx.playerName,
      position: ctx.position,
      mlbTeam: ctx.mlbTeam,
      draftedByTeamId: ctx.draftedByTeamId,
      valueScore: ctx.valueScore,
    }),
    teamName: meta.name,
    teamOwner: meta.owner,
  }
  const r = renderDraft(winner.kind, dctx)
  return {
    ...r,
    pickOverall: ctx.pickOverall,
    playerId: ctx.playerId,
    valueScore: ctx.valueScore,
    draftedByTeamId: ctx.draftedByTeamId,
  }
}

function renderTeamGrade(
  data: CategoryLeagueData,
  winner: StoryCandidate<DraftKind, TeamGradeDetectionContext>,
): NonNullable<RenderedDraftCopy['teamGrades'][string]> | null {
  const ctx = winner.context
  const meta = teamMeta(data, ctx.teamId)
  const dctx: DraftContext = {
    teamName: meta.name,
    teamOwner: meta.owner,
    gradeLetter: ctx.gradeLetter,
    stealsCount: ctx.stealsCount,
    hitsCount: ctx.hitsCount,
    bustsCount: ctx.bustsCount,
    missesCount: ctx.missesCount,
    earlyHitRatePct: ctx.hitRatePct,
  }
  const r = renderDraft('team-grade-narrative', dctx)
  return {
    gradeLetter: ctx.gradeLetter,
    ...r,
    stats: {
      steals: ctx.stealsCount,
      hits: ctx.hitsCount,
      misses: ctx.missesCount,
      busts: ctx.bustsCount,
    },
  }
}

function renderPunt(
  data: CategoryLeagueData,
  winner: StoryCandidate<DraftKind, PuntDetectionContext>,
): PuntCopy {
  const ctx = winner.context
  const meta = teamMeta(data, ctx.teamId)
  const dctx: DraftContext = {
    teamName: meta.name,
    teamOwner: meta.owner,
    puntedCat: asCatId(ctx.puntedCat),
    puntedCatRank: ctx.puntedCatRank,
    alternateCatsWon: ctx.alternateCatsWon,
    alternateCatsLost: ctx.alternateCatsLost,
  }
  const r = renderDraft(winner.kind, dctx)
  return {
    ...r,
    teamId: ctx.teamId,
    category: ctx.puntedCat,
    thisSeasonRank: ctx.puntedCatRank,
  }
}

function renderKing(
  data: CategoryLeagueData,
  winner: StoryCandidate<DraftKind, CategoryKingDetectionContext>,
): KingCopy {
  const ctx = winner.context
  const meta = teamMeta(data, ctx.draftedByTeamId)
  const dctx: DraftContext = {
    playerFirstName: firstNameOf(ctx.playerName),
    playerLastName: lastNameOf(ctx.playerName),
    playerFullName: ctx.playerName,
    position: asPosition(ctx.position),
    mlbTeam: ctx.mlbTeam,
    draftPick: ctx.pickOverall,
    draftRound: ctx.round,
    valueScore: ctx.valueScore,
    valueLabel: valueLabel(ctx.valueScore),
    teamName: meta.name,
    teamOwner: meta.owner,
    categoryKingCatsCovered: ctx.catsCovered,
    brokenCat: asCatId(ctx.brokenCat),
    brokenCatPlayerName: ctx.kind === 'broken-cat' ? lastNameOf(ctx.playerName) : undefined,
  }
  const r = renderDraft(winner.kind, dctx)
  return {
    ...r,
    pickOverall: ctx.pickOverall,
    playerId: ctx.playerId,
    draftedByTeamId: ctx.draftedByTeamId,
    brokenCat: ctx.brokenCat,
    brokenTeamId: ctx.kind === 'broken-cat' ? ctx.draftedByTeamId : undefined,
    draftRoundPick: ctx.kind === 'late-round-gem'
      ? `R${ctx.round} PICK #${ctx.pickOverall}`
      : undefined,
  }
}

function renderRound(
  _data: CategoryLeagueData,
  winner: StoryCandidate<DraftKind, ByTheRoundDetectionContext>,
): { round: number; hits: number; misses: number; avgValue: number; narrative: string } {
  const ctx = winner.context
  const dctx: DraftContext = {
    teamName: '',         // round summary doesn't anchor to a team
    teamOwner: '',
    roundNumber: ctx.round,
    roundHitCount: ctx.hits,
    roundMissCount: ctx.misses,
    roundAvgValue: ctx.avgValue,
    roundTopPlayerLastName: ctx.topPickPlayerName ? lastNameOf(ctx.topPickPlayerName) : undefined,
    roundBustPlayerLastName: ctx.bustPickPlayerName ? lastNameOf(ctx.bustPickPlayerName) : undefined,
  }
  const r = renderDraft('by-the-round-summary', dctx)
  return {
    round: ctx.round,
    hits: ctx.hits,
    misses: ctx.misses,
    avgValue: ctx.avgValue,
    narrative: r.headline,  // the round narrative renders as a single line
  }
}

function renderQuickReadPill(
  winner: StoryCandidate<DraftKind, DraftQuickReadDetectionContext>,
): { pill: QuickReadKind; label: string; value: string } {
  return {
    pill: winner.context.pill,
    label: pillLabel(winner.context.pill),
    value: winner.context.label,
  }
}

function pillLabel(pill: QuickReadKind): string {
  switch (pill) {
    case 'highest-value-pick':       return 'HIGHEST VALUE PICK'
    case 'biggest-bust':             return 'BIGGEST BUST'
    case 'best-late-round':          return 'BEST LATE ROUND'
    case 'most-categories-delivered': return 'MOST CATS DELIVERED'
  }
}

/* Re-export grade letter type so the view can type its prop bag
   without reaching back into draft.ts directly. */
export type { GradeLetter }
