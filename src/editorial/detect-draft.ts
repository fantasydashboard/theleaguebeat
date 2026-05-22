/**
 * Story detection engine — Draft page.
 *
 * Pure functions that read `CategoryLeagueData` (with the optional
 * `draft` extension) and emit `StoryCandidate[]` per slot. No
 * rendering, no globals, no I/O. Selection (pick the winner per
 * slot) lives in `render-draft.ts`.
 *
 * Mirrors the Home page pattern in `detect.ts`. Every detector
 * returns every candidate that fired, even if the slot will only
 * render one; weights let downstream selection compare candidates
 * across kinds.
 *
 * Note: when `data.draft` is undefined, every detector returns an
 * empty array. The page-level renderer (`render-draft.ts`) handles
 * the no-draft-data fallback. Detectors are written assuming a
 * present `data.draft`; they early-return before any work otherwise.
 */

import type {
  CategoryLeagueData,
  CategoryLeagueDataDraft,
  CategoryLeagueDataDraftPick,
  CategoryLeagueDataTeam,
  StoryCandidate,
} from './types.ts'
import type { DraftKind, GradeLetter, QuickReadKind } from './draft.ts'

/* ─────────────────────────────────────────────────────────────────
   PER-DETECTOR CONTEXT SHAPES
   These are the data each candidate carries through to
   `render-draft.ts`, where they are translated into a `DraftContext`.
───────────────────────────────────────────────────────────────── */

export interface BestDraftDetectionContext {
  teamId: string
  totalValue: number          // sum of valueScores across all picks (undef = 0)
  stealsCount: number          // picks with value >= +30
  hitsCount: number            // picks with value in [-5, +30)
  bustsCount: number           // picks with value <= -50
  missesCount: number          // picks with value in (-50, -5]
  earlyHitRatePct: number      // % of R1-R5 picks with value >= -5
  signal: string
}

export interface StealBustDetectionContext {
  pickOverall: number
  round: number
  playerId: string
  playerName: string
  position: string
  mlbTeam: string
  draftedByTeamId: string
  valueScore: number           // signed
  signal: string
}

export interface TeamGradeDetectionContext {
  teamId: string
  gradeLetter: GradeLetter
  totalValue: number
  stealsCount: number
  hitsCount: number
  bustsCount: number
  missesCount: number
  hitRatePct: number           // % of picks with value >= -5
  signal: string
}

export interface PuntDetectionContext {
  kind: 'success' | 'failure' | 'balanced'
  teamId: string
  puntedCat?: string           // present for success / failure
  puntedCatRank?: number       // 1-10
  alternateCatsWon?: number    // # of cats team ranks <= 3 in
  alternateCatsLost?: number   // # of cats team ranks >= 8 in (excluding punted)
  signal: string
}

export interface CategoryKingDetectionContext {
  kind: 'five-tool' | 'late-round-gem' | 'broken-cat'
  pickOverall: number
  playerId: string
  playerName: string
  position: string
  mlbTeam: string
  round: number
  draftedByTeamId: string
  valueScore: number
  catsCovered?: number         // five-tool: how many cats the player is contributing across
  brokenCat?: string           // broken-cat: which cat broke
  signal: string
}

export interface ByTheRoundDetectionContext {
  round: number
  hits: number                 // picks with value >= +5
  misses: number               // picks with value <= -5
  neutral: number              // |value| < 5
  avgValue: number             // mean of all valueScores in the round
  topPickPlayerName?: string
  bustPickPlayerName?: string
  signal: string
}

export interface DraftQuickReadDetectionContext {
  pill: QuickReadKind
  playerId?: string
  playerName?: string
  round?: number
  pickOverall?: number
  valueScore?: number
  teamId?: string
  label: string                // pre-formatted compact label
}

/* ─────────────────────────────────────────────────────────────────
   SHARED HELPERS (pure)
───────────────────────────────────────────────────────────────── */

const REGULAR_SEASON_WEEKS = 12  // matches detect.ts assumption

/** Treat missing valueScore as 0 — adapters that can't compute it
 *  (Sleeper without season-stats overlay) should still get a render
 *  rather than a stack of NaNs. */
function valueOf(pick: CategoryLeagueDataDraftPick): number {
  return pick.valueScore ?? 0
}

function teamFor(data: CategoryLeagueData, teamId: string): CategoryLeagueDataTeam | undefined {
  return data.teams.find((t) => t.id === teamId)
}

function picksForTeam(
  draft: CategoryLeagueDataDraft,
  teamId: string,
): CategoryLeagueDataDraftPick[] {
  return draft.picks.filter((p) => p.draftedByTeamId === teamId)
}

interface TeamDraftSummary {
  teamId: string
  picks: CategoryLeagueDataDraftPick[]
  totalValue: number
  stealsCount: number          // value >= +30
  hitsCount: number            // value in [-5, +30)
  missesCount: number          // value in (-50, -5]
  bustsCount: number           // value <= -50
  earlyHitRatePct: number      // % of R1-R5 picks with value >= -5
  hitRatePct: number           // % of all picks with value >= -5
}

function summarizeTeam(
  draft: CategoryLeagueDataDraft,
  teamId: string,
): TeamDraftSummary {
  const picks = picksForTeam(draft, teamId)
  let totalValue = 0
  let steals = 0
  let hits = 0
  let misses = 0
  let busts = 0
  let earlyPicks = 0
  let earlyHits = 0
  let okPicks = 0
  for (const p of picks) {
    const v = valueOf(p)
    totalValue += v
    if (v >= 30) steals++
    else if (v >= -5) hits++
    else if (v > -50) misses++
    else busts++
    if (v >= -5) okPicks++
    if (p.round <= 5) {
      earlyPicks++
      if (v >= -5) earlyHits++
    }
  }
  const earlyHitRatePct = earlyPicks === 0
    ? 0
    : Math.round((earlyHits / earlyPicks) * 100)
  const hitRatePct = picks.length === 0
    ? 0
    : Math.round((okPicks / picks.length) * 100)
  return {
    teamId,
    picks,
    totalValue,
    stealsCount: steals,
    hitsCount: hits,
    missesCount: misses,
    bustsCount: busts,
    earlyHitRatePct,
    hitRatePct,
  }
}

/** Map a team's draft summary to a grade letter.
 *
 *  Combines total value (primary) with hit rate (secondary). Returns
 *  a fixed-ish ladder so 12 teams can spread across the 12 grade
 *  buckets reasonably. Tweak the thresholds when real-league
 *  distributions surface — for now they match what the fixture
 *  produces (top draft ≈ +200 cumulative, worst ≈ -80). */
export function gradeFromSummary(summary: TeamDraftSummary): GradeLetter {
  const { totalValue, hitRatePct, bustsCount } = summary
  // Penalty for busts — a single -50 has already hit totalValue, but
  // having multiple busts caps the achievable grade.
  if (totalValue >= 180 && bustsCount === 0) return 'A+'
  if (totalValue >= 130) return 'A'
  if (totalValue >= 90)  return 'A-'
  if (totalValue >= 60)  return 'B+'
  if (totalValue >= 30)  return 'B'
  if (totalValue >= 10)  return 'B-'
  if (totalValue >= -10) return 'C+'
  if (totalValue >= -30) return 'C'
  if (totalValue >= -50) return 'C-'
  if (totalValue >= -80) return 'D+'
  if (totalValue >= -120 || hitRatePct >= 40) return 'D'
  return 'F'
}

/* ─────────────────────────────────────────────────────────────────
   BEST-DRAFT HERO DETECTION
───────────────────────────────────────────────────────────────── */

export function detectBestDraftHero(
  data: CategoryLeagueData,
): Array<StoryCandidate<DraftKind, BestDraftDetectionContext>> {
  if (!data.draft) return []
  const out: Array<StoryCandidate<DraftKind, BestDraftDetectionContext>> = []
  // Score every team. The winner is the highest totalValue.
  let best: TeamDraftSummary | null = null
  for (const team of data.teams) {
    const s = summarizeTeam(data.draft, team.id)
    if (s.picks.length === 0) continue
    if (!best || s.totalValue > best.totalValue) best = s
  }
  if (!best) return out
  out.push({
    kind: 'best-draft-hero',
    weight: 100,
    context: {
      teamId: best.teamId,
      totalValue: best.totalValue,
      stealsCount: best.stealsCount,
      hitsCount: best.hitsCount,
      bustsCount: best.bustsCount,
      missesCount: best.missesCount,
      earlyHitRatePct: best.earlyHitRatePct,
      signal: `best draft: ${best.teamId} totalValue=${best.totalValue} steals=${best.stealsCount} busts=${best.bustsCount}`,
    },
  })
  return out
}

/* ─────────────────────────────────────────────────────────────────
   STEAL / BUST DETECTION
───────────────────────────────────────────────────────────────── */

export function detectSteal(
  data: CategoryLeagueData,
): Array<StoryCandidate<DraftKind, StealBustDetectionContext>> {
  if (!data.draft) return []
  const out: Array<StoryCandidate<DraftKind, StealBustDetectionContext>> = []
  // Highest positive value across all picks. If no positive picks, slot stays empty.
  const positives = data.draft.picks.filter((p) => valueOf(p) > 0)
  if (positives.length === 0) return out
  const top = positives.reduce((b, p) => (valueOf(p) > valueOf(b) ? p : b))
  const v = valueOf(top)
  // Weight scales with magnitude: a +60 pick is a stronger story than a +12.
  const weight = Math.min(100, 40 + v)
  out.push({
    kind: 'steal-of-draft',
    weight,
    context: {
      pickOverall: top.pickOverall,
      round: top.round,
      playerId: top.playerId,
      playerName: top.playerName,
      position: top.position,
      mlbTeam: top.mlbTeam,
      draftedByTeamId: top.draftedByTeamId,
      valueScore: v,
      signal: `steal: ${top.playerName} (${top.draftedByTeamId}) +${v} at R${top.round}`,
    },
  })
  return out
}

export function detectBust(
  data: CategoryLeagueData,
): Array<StoryCandidate<DraftKind, StealBustDetectionContext>> {
  if (!data.draft) return []
  const out: Array<StoryCandidate<DraftKind, StealBustDetectionContext>> = []
  const negatives = data.draft.picks.filter((p) => valueOf(p) < 0)
  if (negatives.length === 0) return out
  const worst = negatives.reduce((b, p) => (valueOf(p) < valueOf(b) ? p : b))
  const v = valueOf(worst)
  const weight = Math.min(100, 40 + Math.abs(v))
  out.push({
    kind: 'bust-of-draft',
    weight,
    context: {
      pickOverall: worst.pickOverall,
      round: worst.round,
      playerId: worst.playerId,
      playerName: worst.playerName,
      position: worst.position,
      mlbTeam: worst.mlbTeam,
      draftedByTeamId: worst.draftedByTeamId,
      valueScore: v,
      signal: `bust: ${worst.playerName} (${worst.draftedByTeamId}) ${v} at R${worst.round}`,
    },
  })
  return out
}

/* ─────────────────────────────────────────────────────────────────
   TEAM-GRADE NARRATIVES (one candidate per team)
───────────────────────────────────────────────────────────────── */

export function detectTeamGrades(
  data: CategoryLeagueData,
): Array<StoryCandidate<DraftKind, TeamGradeDetectionContext>> {
  if (!data.draft) return []
  const out: Array<StoryCandidate<DraftKind, TeamGradeDetectionContext>> = []
  for (const team of data.teams) {
    const s = summarizeTeam(data.draft, team.id)
    if (s.picks.length === 0) continue
    const grade = gradeFromSummary(s)
    // Weight = 60 (mid feature) so grades win their own slot but
    // never compete with the hero awards. Selection here is per-team,
    // not best-of, so weight only matters as a default tier.
    out.push({
      kind: 'team-grade-narrative',
      weight: 60,
      context: {
        teamId: team.id,
        gradeLetter: grade,
        totalValue: s.totalValue,
        stealsCount: s.stealsCount,
        hitsCount: s.hitsCount,
        bustsCount: s.bustsCount,
        missesCount: s.missesCount,
        hitRatePct: s.hitRatePct,
        signal: `grade ${grade}: ${team.id} totalValue=${s.totalValue} hits=${s.hitsCount} busts=${s.bustsCount}`,
      },
    })
  }
  return out
}

/* ─────────────────────────────────────────────────────────────────
   PUNT DETECTION (retrospective lens via categoryRanks)
───────────────────────────────────────────────────────────────── */

/** A cat is "punted/bled" when the team ranks bottom-3 (8, 9, 10).
 *  A cat is "owned" when the team ranks top-3 (1, 2, 3). */
function profileFor(data: CategoryLeagueData, teamId: string): {
  bledCats: string[]
  ownedCats: string[]
  midCount: number
} {
  const ranks = data.categoryRanks.find((r) => r.teamId === teamId)
  if (!ranks) return { bledCats: [], ownedCats: [], midCount: 0 }
  const bled: string[] = []
  const owned: string[] = []
  let mid = 0
  for (const [catId, rank] of Object.entries(ranks.catRanks)) {
    if (rank <= 3) owned.push(catId)
    else if (rank >= 8) bled.push(catId)
    else mid++
  }
  return { bledCats: bled, ownedCats: owned, midCount: mid }
}

export function detectPuntReports(
  data: CategoryLeagueData,
): Array<StoryCandidate<DraftKind, PuntDetectionContext>> {
  const out: Array<StoryCandidate<DraftKind, PuntDetectionContext>> = []
  // Note: this detector does not strictly require draft data —
  // it reads categoryRanks. But the punt report only renders on the
  // Draft page, and the page guards on data.draft presence at the
  // copy layer. We still run it without a draft so a future
  // standalone "punt report" surface can reuse it.

  for (const team of data.teams) {
    const profile = profileFor(data, team.id)
    const ranks = data.categoryRanks.find((r) => r.teamId === team.id)
    if (!ranks) continue

    // punt-success: one bled cat, but multiple owned cats
    if (profile.bledCats.length === 1 && profile.ownedCats.length >= 3) {
      const punted = profile.bledCats[0]
      const puntedRank = ranks.catRanks[punted]
      out.push({
        kind: 'punt-success',
        weight: 70 + profile.ownedCats.length,
        context: {
          kind: 'success',
          teamId: team.id,
          puntedCat: punted,
          puntedCatRank: puntedRank,
          alternateCatsWon: profile.ownedCats.length,
          alternateCatsLost: 0,
          signal: `punt-success: ${team.id} punted ${punted} (#${puntedRank}), owns ${profile.ownedCats.length}`,
        },
      })
    }

    // punt-failure: bled >= 3 (the punt blew up into a category hole)
    if (profile.bledCats.length >= 3) {
      // Pick the worst-ranked cat as the "punted" focus.
      const sorted = [...profile.bledCats].sort(
        (a, b) => (ranks.catRanks[b] ?? 0) - (ranks.catRanks[a] ?? 0),
      )
      const punted = sorted[0]
      const puntedRank = ranks.catRanks[punted]
      out.push({
        kind: 'punt-failure',
        weight: 60 + profile.bledCats.length,
        context: {
          kind: 'failure',
          teamId: team.id,
          puntedCat: punted,
          puntedCatRank: puntedRank,
          alternateCatsWon: profile.ownedCats.length,
          alternateCatsLost: profile.bledCats.length - 1,
          signal: `punt-failure: ${team.id} bled=${profile.bledCats.length} owned=${profile.ownedCats.length}`,
        },
      })
    }

    // punt-balanced: no bled cats at all
    if (profile.bledCats.length === 0 && profile.ownedCats.length >= 2) {
      out.push({
        kind: 'punt-balanced',
        weight: 55 + profile.ownedCats.length,
        context: {
          kind: 'balanced',
          teamId: team.id,
          alternateCatsWon: profile.ownedCats.length,
          alternateCatsLost: 0,
          signal: `punt-balanced: ${team.id} owned=${profile.ownedCats.length} mid=${profile.midCount}`,
        },
      })
    }
  }

  return out
}

/* ─────────────────────────────────────────────────────────────────
   CATEGORY-KING DETECTION
───────────────────────────────────────────────────────────────── */

export function detectCategoryKings(
  data: CategoryLeagueData,
): Array<StoryCandidate<DraftKind, CategoryKingDetectionContext>> {
  if (!data.draft) return []
  const out: Array<StoryCandidate<DraftKind, CategoryKingDetectionContext>> = []

  /* category-king-five-tool
     Per-player cat-contribution data is not exposed on
     CategoryLeagueData. Adapters may add it in a future wave, but
     until then this detector cannot fire. Skip silently.
     TODO: needs per-player season-stats — pipeline will pick this
     up when adapters publish a `playerCategoryStats` field. */

  /* category-king-late-round-gem
     Pick with value >= +20 taken in R12 or later. Highest value wins. */
  const lateGems = data.draft.picks.filter((p) => p.round >= 12 && valueOf(p) >= 20)
  if (lateGems.length > 0) {
    const winner = lateGems.reduce((b, p) => (valueOf(p) > valueOf(b) ? p : b))
    const v = valueOf(winner)
    out.push({
      kind: 'category-king-late-round-gem',
      weight: 60 + Math.min(30, v),
      context: {
        kind: 'late-round-gem',
        pickOverall: winner.pickOverall,
        playerId: winner.playerId,
        playerName: winner.playerName,
        position: winner.position,
        mlbTeam: winner.mlbTeam,
        round: winner.round,
        draftedByTeamId: winner.draftedByTeamId,
        valueScore: v,
        signal: `late-round gem: ${winner.playerName} R${winner.round} +${v}`,
      },
    })
  }

  /* category-king-broken-cat
     The single most-negative-value pick (the same source player as
     bust-of-draft) is treated as having broken one of their team's
     cats. We use the team's bottom-ranked cat as the "broken" cat,
     since the bust is the load-bearing reason the team can't win it.

     This is heuristic — without per-player cat stats we can't say
     definitively which cat broke. We mark the team's worst-ranked
     cat as the casualty and let the variant pool absorb the
     attribution. */
  const negatives = data.draft.picks.filter((p) => valueOf(p) <= -30)
  if (negatives.length > 0) {
    const worst = negatives.reduce((b, p) => (valueOf(p) < valueOf(b) ? p : b))
    const v = valueOf(worst)
    const teamRanks = data.categoryRanks.find((r) => r.teamId === worst.draftedByTeamId)
    let brokenCat: string | undefined
    if (teamRanks) {
      const entries = Object.entries(teamRanks.catRanks)
      // Worst-ranked cat (highest rank number = worst).
      const worstEntry = entries.reduce((b, e) => (e[1] > b[1] ? e : b))
      brokenCat = worstEntry[0]
    }
    out.push({
      kind: 'category-king-broken-cat',
      weight: 60 + Math.min(30, Math.abs(v)),
      context: {
        kind: 'broken-cat',
        pickOverall: worst.pickOverall,
        playerId: worst.playerId,
        playerName: worst.playerName,
        position: worst.position,
        mlbTeam: worst.mlbTeam,
        round: worst.round,
        draftedByTeamId: worst.draftedByTeamId,
        valueScore: v,
        brokenCat,
        signal: `broken cat: ${worst.playerName} ${v} broke ${brokenCat ?? 'a cat'} for ${worst.draftedByTeamId}`,
      },
    })
  }

  return out
}

/* ─────────────────────────────────────────────────────────────────
   BY-THE-ROUND SUMMARIES
───────────────────────────────────────────────────────────────── */

export function detectByTheRound(
  data: CategoryLeagueData,
): Array<StoryCandidate<DraftKind, ByTheRoundDetectionContext>> {
  if (!data.draft) return []
  const out: Array<StoryCandidate<DraftKind, ByTheRoundDetectionContext>> = []
  // Bucket all picks by round.
  const byRound = new Map<number, CategoryLeagueDataDraftPick[]>()
  for (const p of data.draft.picks) {
    const arr = byRound.get(p.round) ?? []
    arr.push(p)
    byRound.set(p.round, arr)
  }
  const rounds = [...byRound.keys()].sort((a, b) => a - b)
  for (const round of rounds) {
    const picks = byRound.get(round)!
    let hits = 0
    let misses = 0
    let neutral = 0
    let sum = 0
    let top: CategoryLeagueDataDraftPick | null = null
    let bust: CategoryLeagueDataDraftPick | null = null
    for (const p of picks) {
      const v = valueOf(p)
      sum += v
      if (v >= 5) hits++
      else if (v <= -5) misses++
      else neutral++
      if (!top || v > valueOf(top)) top = p
      if (!bust || v < valueOf(bust)) bust = p
    }
    out.push({
      kind: 'by-the-round-summary',
      weight: 50,
      context: {
        round,
        hits,
        misses,
        neutral,
        avgValue: picks.length === 0 ? 0 : sum / picks.length,
        topPickPlayerName: top?.playerName,
        bustPickPlayerName: bust?.playerName,
        signal: `R${round}: ${hits}H/${misses}M/${neutral}N avg=${(sum / Math.max(1, picks.length)).toFixed(1)}`,
      },
    })
  }
  return out
}

/* ─────────────────────────────────────────────────────────────────
   QUICK-READS DETECTION (4 pills)
───────────────────────────────────────────────────────────────── */

export function detectDraftQuickReads(
  data: CategoryLeagueData,
): Array<StoryCandidate<DraftKind, DraftQuickReadDetectionContext>> {
  if (!data.draft) return []
  const out: Array<StoryCandidate<DraftKind, DraftQuickReadDetectionContext>> = []

  /* highest-value-pick */
  const positives = data.draft.picks.filter((p) => valueOf(p) > 0)
  if (positives.length > 0) {
    const top = positives.reduce((b, p) => (valueOf(p) > valueOf(b) ? p : b))
    const v = valueOf(top)
    out.push({
      kind: 'quick-read',
      weight: 40,
      context: {
        pill: 'highest-value-pick',
        playerId: top.playerId,
        playerName: top.playerName,
        round: top.round,
        pickOverall: top.pickOverall,
        valueScore: v,
        teamId: top.draftedByTeamId,
        label: `${top.playerName}, R${top.round}. +${v} value.`,
      },
    })
  }

  /* biggest-bust */
  const negatives = data.draft.picks.filter((p) => valueOf(p) < 0)
  if (negatives.length > 0) {
    const worst = negatives.reduce((b, p) => (valueOf(p) < valueOf(b) ? p : b))
    const v = valueOf(worst)
    out.push({
      kind: 'quick-read',
      weight: 40,
      context: {
        pill: 'biggest-bust',
        playerId: worst.playerId,
        playerName: worst.playerName,
        round: worst.round,
        pickOverall: worst.pickOverall,
        valueScore: v,
        teamId: worst.draftedByTeamId,
        label: `${worst.playerName}, R${worst.round}. ${v} value.`,
      },
    })
  }

  /* best-late-round (R12+, highest value) */
  const lates = data.draft.picks.filter((p) => p.round >= 12 && valueOf(p) > 0)
  if (lates.length > 0) {
    const top = lates.reduce((b, p) => (valueOf(p) > valueOf(b) ? p : b))
    const v = valueOf(top)
    out.push({
      kind: 'quick-read',
      weight: 40,
      context: {
        pill: 'best-late-round',
        playerId: top.playerId,
        playerName: top.playerName,
        round: top.round,
        pickOverall: top.pickOverall,
        valueScore: v,
        teamId: top.draftedByTeamId,
        label: `${top.playerName}, R${top.round}. +${v} value.`,
      },
    })
  }

  /* most-categories-delivered
     Per-player cat-contribution stats are unavailable. We pick the
     team with the most owned cats (top-3 ranks) as a stand-in
     surface for the pill and use the team's highest-positive-value
     pick as its featured player. */
  const ownedCounts = data.teams.map((t) => {
    const profile = profileFor(data, t.id)
    return { teamId: t.id, owned: profile.ownedCats.length }
  })
  ownedCounts.sort((a, b) => b.owned - a.owned)
  const champ = ownedCounts[0]
  if (champ && champ.owned > 0) {
    const teamPicks = picksForTeam(data.draft, champ.teamId)
      .filter((p) => valueOf(p) > 0)
    const featured = teamPicks.length > 0
      ? teamPicks.reduce((b, p) => (valueOf(p) > valueOf(b) ? p : b))
      : undefined
    const teamObj = teamFor(data, champ.teamId)
    const label = featured
      ? `${featured.playerName}. Top-3 in ${champ.owned} categories.`
      : `${teamObj?.name ?? champ.teamId}. Top-3 in ${champ.owned} categories.`
    out.push({
      kind: 'quick-read',
      weight: 40,
      context: {
        pill: 'most-categories-delivered',
        playerId: featured?.playerId,
        playerName: featured?.playerName,
        round: featured?.round,
        pickOverall: featured?.pickOverall,
        valueScore: featured ? valueOf(featured) : undefined,
        teamId: champ.teamId,
        label,
      },
    })
  }

  return out
}

/* Keep a single source of truth for the regular-season constant. */
export { REGULAR_SEASON_WEEKS as DRAFT_DETECT_REGULAR_SEASON_WEEKS }
