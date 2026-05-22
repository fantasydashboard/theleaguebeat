/**
 * Story detection engine — Power Rankings page.
 *
 * Pure functions that read `CategoryLeagueData` and emit
 * `StoryCandidate[]` per slot. No rendering, no globals, no I/O.
 * Selection (pick the winner per slot) lives in `render-pr.ts`.
 *
 * Mirrors the shape of `detect.ts` (Home). Each detector returns
 * every candidate that fired, even if the slot will only render one.
 * Weights let downstream selection compare across candidates of
 * different kinds.
 */

import type {
  CategoryLeagueData,
  CategoryLeagueDataCategoryRank,
  CategoryLeagueDataStanding,
  StoryCandidate,
} from './types.ts'
import type { PRKind, PRQuickReadKind, PRSeasonStage } from './pr.ts'

/* ─────────────────────────────────────────────────────────────────
   PER-DETECTOR CONTEXT SHAPES
   These are the data each candidate carries through to render-pr.ts,
   where they are translated into a `PRContext`.
───────────────────────────────────────────────────────────────── */

export interface PRHeroDetectionContext {
  teamId: string
  opponentTeamId?: string            // antagonist (e.g., displaced #1)
  currentRank: number
  previousRank: number               // rank one week ago
  rankSinceWeek1: number             // rank in week 1
  weeksAtTop: number                 // current consecutive run at #1 (0 if not #1)
  weeksHeldByOpponent?: number       // for new-throne: how long antagonist held #1
  framing: 'overtake' | 'collapse' | 'extend' | 'jump' | 'surprise'
  signal: string
}

export interface PRPulseDetectionContext {
  teamId: string
  streakType?: 'W' | 'L'
  streakLength?: number
  rankDeltaThisWeek: number
  rankDeltaSinceWeek1: number
  fromRank?: number                  // pulse-long-fall: peak-of-3wk rank
  toRank?: number                    // pulse-long-fall: current rank
  trajectory?: number[]              // full-season rank series for sparkline
  meanRank?: number                  // pulse-steady-hand
  rankVariance?: number              // pulse-steady-hand
  signal: string
}

export interface PRDynastyDetectionContext {
  teamId: string
  cats: string[]                     // categories this team owns this season
  weeksOwning: number                // weeks they have held those cats
  puntedCat?: string                 // dynasty-punt-kings only
  puntedWeeks?: number               // dynasty-punt-kings only
  signal: string
}

export interface PRSubHeadlineDetectionContext {
  stage: PRSeasonStage
  climberCount: number               // teams with positive rank delta vs W1
  bleedingCount: number              // teams currently on L3+
  bubbleCount: number                // teams within 1 spot of cutoff
}

export interface PRQuickReadDetectionContext {
  pill: PRQuickReadKind
  teamId: string
  opponentTeamId?: string
  statValue?: number
  statLabel?: string
  catId?: string
  signal: string
}

/* ─────────────────────────────────────────────────────────────────
   SHARED HELPERS (pure)
───────────────────────────────────────────────────────────────── */

const REGULAR_SEASON_WEEKS = 12

function standingFor(data: CategoryLeagueData, teamId: string): CategoryLeagueDataStanding | undefined {
  return data.standings.find((s) => s.teamId === teamId)
}

function ranksFor(data: CategoryLeagueData, teamId: string): CategoryLeagueDataCategoryRank | undefined {
  return data.categoryRanks.find((r) => r.teamId === teamId)
}

function rankAtWeek(data: CategoryLeagueData, teamId: string, week: number): number | undefined {
  const wk = data.seasonRankHistory.find((w) => w.week === week)
  return wk?.ranks[teamId]
}

function findTeamAtRank(data: CategoryLeagueData, week: number, rank: number): string | undefined {
  const wk = data.seasonRankHistory.find((w) => w.week === week)
  if (!wk) return undefined
  for (const [teamId, r] of Object.entries(wk.ranks)) {
    if (r === rank) return teamId
  }
  return undefined
}

function consecutiveWeeksAtRank(
  data: CategoryLeagueData,
  teamId: string,
  rank: number,
  endWeek: number,
): number {
  let count = 0
  for (let w = endWeek; w >= 1; w--) {
    if (rankAtWeek(data, teamId, w) === rank) count++
    else break
  }
  return count
}

/** Has this team held rank <= maxRank for every week in [start, end]? */
function heldRankAtMostFor(
  data: CategoryLeagueData,
  teamId: string,
  maxRank: number,
  start: number,
  end: number,
): boolean {
  for (let w = start; w <= end; w++) {
    const r = rankAtWeek(data, teamId, w)
    if (r == null || r > maxRank) return false
  }
  return true
}

/** Best (lowest) rank the team has held across the season. */
function seasonBestRank(data: CategoryLeagueData, teamId: string): number {
  let best = Infinity
  for (const w of data.seasonRankHistory) {
    const r = w.ranks[teamId]
    if (r != null && r < best) best = r
  }
  return isFinite(best) ? best : 10
}

/** Best rank held in the last `windowWeeks` weeks (inclusive of currentWeek). */
function rollingPeakRank(
  data: CategoryLeagueData,
  teamId: string,
  endWeek: number,
  windowWeeks: number,
): number {
  let best = Infinity
  for (let w = Math.max(1, endWeek - windowWeeks + 1); w <= endWeek; w++) {
    const r = rankAtWeek(data, teamId, w)
    if (r != null && r < best) best = r
  }
  return isFinite(best) ? best : 10
}

/** Mean of a team's per-week ranks across the full season. */
function meanRank(data: CategoryLeagueData, teamId: string): number {
  const values: number[] = []
  for (const w of data.seasonRankHistory) {
    const r = w.ranks[teamId]
    if (r != null) values.push(r)
  }
  if (values.length === 0) return 10
  return values.reduce((a, b) => a + b, 0) / values.length
}

/** Sample variance of a team's per-week ranks across the full season. */
function rankVariance(data: CategoryLeagueData, teamId: string): number {
  const values: number[] = []
  for (const w of data.seasonRankHistory) {
    const r = w.ranks[teamId]
    if (r != null) values.push(r)
  }
  if (values.length < 2) return 0
  const mean = values.reduce((a, b) => a + b, 0) / values.length
  const sq = values.reduce((acc, v) => acc + (v - mean) * (v - mean), 0)
  return sq / values.length
}

/** Map cat-side ('hit' | 'pit') -> list of catIds in that side. */
function catsBySide(data: CategoryLeagueData, side: 'hit' | 'pit'): string[] {
  return data.categories.filter((c) => c.side === side).map((c) => c.id)
}

/** Number of cats the team is currently top-3 in for the given side. */
function topCatsOnSide(
  ranks: CategoryLeagueDataCategoryRank | undefined,
  sideCats: string[],
): string[] {
  if (!ranks) return []
  return sideCats.filter((c) => (ranks.catRanks[c] ?? 99) <= 3)
}

function seasonStageFor(data: CategoryLeagueData): PRSeasonStage {
  const remaining = Math.max(0, REGULAR_SEASON_WEEKS - data.currentWeek)
  if (remaining <= 1) return 'final-stretch'
  if (remaining <= 3) return 'late'
  if (data.currentWeek <= 3) return 'early'
  return 'mid'
}

/* ─────────────────────────────────────────────────────────────────
   HERO DETECTION (rank-movement driven)
───────────────────────────────────────────────────────────────── */

export function detectPRHero(
  data: CategoryLeagueData,
): Array<StoryCandidate<PRKind, PRHeroDetectionContext>> {
  const out: Array<StoryCandidate<PRKind, PRHeroDetectionContext>> = []
  const wk = data.currentWeek

  /* hero-new-throne
     rank-1 team this week differs from rank-1 previous week. */
  const currentTop = findTeamAtRank(data, wk, 1)
  const previousTop = findTeamAtRank(data, wk - 1, 1)
  if (currentTop && previousTop && currentTop !== previousTop) {
    const heldFor = consecutiveWeeksAtRank(data, previousTop, 1, wk - 1)
    out.push({
      kind: 'hero-new-throne',
      weight: 95 + Math.min(10, heldFor), // longer prior reign = bigger story
      context: {
        teamId: currentTop,
        opponentTeamId: previousTop,
        currentRank: 1,
        previousRank: rankAtWeek(data, currentTop, wk - 1) ?? 2,
        rankSinceWeek1: rankAtWeek(data, currentTop, 1) ?? 10,
        weeksAtTop: consecutiveWeeksAtRank(data, currentTop, 1, wk),
        weeksHeldByOpponent: heldFor,
        framing: 'overtake',
        signal: `new throne: ${currentTop} took #1 from ${previousTop} (held ${heldFor}w)`,
      },
    })
  }

  /* hero-dynasty-rising
     Same rank-1 team for 3+ consecutive weeks. */
  if (currentTop) {
    const runAtTop = consecutiveWeeksAtRank(data, currentTop, 1, wk)
    if (runAtTop >= 3) {
      out.push({
        kind: 'hero-dynasty-rising',
        weight: 70 + Math.min(15, runAtTop * 2),
        context: {
          teamId: currentTop,
          currentRank: 1,
          previousRank: rankAtWeek(data, currentTop, wk - 1) ?? 1,
          rankSinceWeek1: rankAtWeek(data, currentTop, 1) ?? 1,
          weeksAtTop: runAtTop,
          framing: 'extend',
          signal: `dynasty rising: ${currentTop} held #1 for ${runAtTop}w`,
        },
      })
    }
  }

  /* hero-biggest-climber
     A team's rank delta since week 1 >= 4 spots upward. Emit one per
     qualifier so selection can pick the largest mover. */
  for (const team of data.teams) {
    const week1 = rankAtWeek(data, team.id, 1)
    const current = rankAtWeek(data, team.id, wk)
    if (week1 == null || current == null) continue
    const climbed = week1 - current
    if (climbed >= 4) {
      out.push({
        kind: 'hero-biggest-climber',
        weight: 60 + Math.min(15, climbed * 2),
        context: {
          teamId: team.id,
          currentRank: current,
          previousRank: rankAtWeek(data, team.id, wk - 1) ?? current,
          rankSinceWeek1: week1,
          weeksAtTop: current === 1 ? consecutiveWeeksAtRank(data, team.id, 1, wk) : 0,
          framing: 'jump',
          signal: `biggest climber: ${team.id} #${week1} -> #${current} (+${climbed})`,
        },
      })
    }
  }

  /* hero-defending-champ-falling
     A team that was rank <= 2 for N >= 3 weeks dropped to rank >= 5 now. */
  for (const team of data.teams) {
    const current = rankAtWeek(data, team.id, wk)
    if (current == null || current < 5) continue
    // Find the longest run at rank <= 2 ending anywhere prior to now.
    let longestRunTop2 = 0
    let run = 0
    for (const w of data.seasonRankHistory) {
      if (w.week > wk) continue
      const r = w.ranks[team.id]
      if (r != null && r <= 2) {
        run++
        if (run > longestRunTop2) longestRunTop2 = run
      } else {
        run = 0
      }
    }
    if (longestRunTop2 >= 3) {
      const newKing = findTeamAtRank(data, wk, 1)
      out.push({
        kind: 'hero-defending-champ-falling',
        weight: 85 + Math.min(10, longestRunTop2),
        context: {
          teamId: team.id,
          opponentTeamId: newKing && newKing !== team.id ? newKing : undefined,
          currentRank: current,
          previousRank: rankAtWeek(data, team.id, wk - 1) ?? current,
          rankSinceWeek1: rankAtWeek(data, team.id, 1) ?? current,
          weeksAtTop: 0,
          weeksHeldByOpponent: longestRunTop2,
          framing: 'collapse',
          signal: `champ falling: ${team.id} held top-2 for ${longestRunTop2}w, now #${current}`,
        },
      })
    }
  }

  /* hero-bubble-surprise
     A team currently in bubble band (cutoff ± 1) that moved INTO that
     band from OUTSIDE in the last 2 weeks. */
  const cutoff = data.playoffCutoff
  for (const team of data.teams) {
    const current = rankAtWeek(data, team.id, wk)
    if (current == null) continue
    const inBubbleNow = Math.abs(current - cutoff) <= 1
    if (!inBubbleNow) continue
    const twoBack = rankAtWeek(data, team.id, wk - 2)
    if (twoBack == null) continue
    if (Math.abs(twoBack - cutoff) <= 1) continue // was already in bubble
    out.push({
      kind: 'hero-bubble-surprise',
      weight: 55,
      context: {
        teamId: team.id,
        currentRank: current,
        previousRank: rankAtWeek(data, team.id, wk - 1) ?? current,
        rankSinceWeek1: rankAtWeek(data, team.id, 1) ?? current,
        weeksAtTop: 0,
        framing: 'surprise',
        signal: `bubble surprise: ${team.id} ${twoBack} -> ${current} (cutoff ${cutoff})`,
      },
    })
  }

  return out
}

/* ─────────────────────────────────────────────────────────────────
   PULSE DETECTION (3 beats — heater / long-fall / steady-hand)
───────────────────────────────────────────────────────────────── */

export function detectPRPulse(
  data: CategoryLeagueData,
): Array<StoryCandidate<PRKind, PRPulseDetectionContext>> {
  const out: Array<StoryCandidate<PRKind, PRPulseDetectionContext>> = []
  const wk = data.currentWeek

  for (const team of data.teams) {
    const standing = standingFor(data, team.id)
    if (!standing) continue
    const current = rankAtWeek(data, team.id, wk)
    if (current == null) continue
    const previous = rankAtWeek(data, team.id, wk - 1) ?? current
    const week1 = rankAtWeek(data, team.id, 1) ?? current
    const rankDeltaThisWeek = previous - current
    const rankDeltaSinceWeek1 = week1 - current

    /* pulse-heater: W >= 3 */
    if (standing.streak.type === 'W' && standing.streak.length >= 3) {
      out.push({
        kind: 'pulse-heater',
        weight: 40 + standing.streak.length * 4,
        context: {
          teamId: team.id,
          streakType: 'W',
          streakLength: standing.streak.length,
          rankDeltaThisWeek,
          rankDeltaSinceWeek1,
          signal: `heater: ${team.id} W${standing.streak.length}`,
        },
      })
    }

    /* pulse-long-fall: rank delta from rolling 3-week peak >= 3 spots downward */
    const peak3wk = rollingPeakRank(data, team.id, wk, 3)
    const fellFromPeak = current - peak3wk
    if (fellFromPeak >= 3) {
      const trajectory: number[] = data.seasonRankHistory
        .filter((w) => w.week <= wk)
        .map((w) => w.ranks[team.id] ?? 10)
      out.push({
        kind: 'pulse-long-fall',
        weight: 40 + fellFromPeak * 4,
        context: {
          teamId: team.id,
          streakType: standing.streak.type === 'L' ? 'L' : undefined,
          streakLength: standing.streak.type === 'L' ? standing.streak.length : undefined,
          rankDeltaThisWeek,
          rankDeltaSinceWeek1,
          fromRank: peak3wk,
          toRank: current,
          trajectory,
          signal: `long fall: ${team.id} peak #${peak3wk} -> now #${current}`,
        },
      })
    }

    /* pulse-steady-hand: rank variance over season <= 1.5 AND mean rank <= 5 */
    const mean = meanRank(data, team.id)
    const variance = rankVariance(data, team.id)
    if (variance <= 1.5 && mean <= 5) {
      out.push({
        kind: 'pulse-steady-hand',
        // Lower variance + better mean -> higher weight. Cap so a true
        // heater still wins selection within its own slot.
        weight: 40 + Math.max(0, Math.round((1.5 - variance) * 10)) + Math.max(0, Math.round((5 - mean) * 2)),
        context: {
          teamId: team.id,
          rankDeltaThisWeek,
          rankDeltaSinceWeek1,
          meanRank: mean,
          rankVariance: variance,
          signal: `steady hand: ${team.id} mean=${mean.toFixed(1)} var=${variance.toFixed(2)}`,
        },
      })
    }
  }

  return out
}

/* ─────────────────────────────────────────────────────────────────
   DYNASTY DETECTION (3 cards)
───────────────────────────────────────────────────────────────── */

export function detectPRDynasty(
  data: CategoryLeagueData,
): Array<StoryCandidate<PRKind, PRDynastyDetectionContext>> {
  const out: Array<StoryCandidate<PRKind, PRDynastyDetectionContext>> = []
  const wk = data.currentWeek
  const hitCats = catsBySide(data, 'hit')
  const pitCats = catsBySide(data, 'pit')

  /* dynasty-hitting-king
     Team with the most hitting-cat wins (top-3 finishes) across the
     current category ranks. Tie-broken by team id for determinism. */
  let bestHitter: { teamId: string; cats: string[] } | null = null
  for (const ranks of data.categoryRanks) {
    const owned = topCatsOnSide(ranks, hitCats)
    if (!bestHitter || owned.length > bestHitter.cats.length) {
      bestHitter = { teamId: ranks.teamId, cats: owned }
    }
  }
  if (bestHitter && bestHitter.cats.length >= 1) {
    out.push({
      kind: 'dynasty-hitting-king',
      weight: 50 + bestHitter.cats.length * 6,
      context: {
        teamId: bestHitter.teamId,
        cats: bestHitter.cats,
        weeksOwning: wk,    // proxy — current rank assumed held ~all season
        signal: `hitting king: ${bestHitter.teamId} owns ${bestHitter.cats.join(',')}`,
      },
    })
  }

  /* dynasty-pitching-king
     Same logic, pitching side. */
  let bestPitcher: { teamId: string; cats: string[] } | null = null
  for (const ranks of data.categoryRanks) {
    const owned = topCatsOnSide(ranks, pitCats)
    if (!bestPitcher || owned.length > bestPitcher.cats.length) {
      bestPitcher = { teamId: ranks.teamId, cats: owned }
    }
  }
  if (bestPitcher && bestPitcher.cats.length >= 1) {
    out.push({
      kind: 'dynasty-pitching-king',
      weight: 50 + bestPitcher.cats.length * 6,
      context: {
        teamId: bestPitcher.teamId,
        cats: bestPitcher.cats,
        weeksOwning: wk,
        signal: `pitching king: ${bestPitcher.teamId} owns ${bestPitcher.cats.join(',')}`,
      },
    })
  }

  /* dynasty-punt-kings
     Team currently bottom-3 in same cat for 3+ consecutive weeks. We
     proxy "consecutive bottom-3" with current rank + the team's
     bleeding-count signal — the data shape only exposes current
     per-cat ranks, not per-cat-per-week history. */
  let bestPunter: { teamId: string; cat: string; bleedingTotal: number } | null = null
  for (const ranks of data.categoryRanks) {
    // Find a cat where this team is currently dead last in the league.
    let dominantPunt: string | undefined
    for (const cat of data.categories) {
      if (ranks.catRanks[cat.id] === 10) { dominantPunt = cat.id; break }
    }
    // Fall back: any cat where they're 9 or worse and standing.bleedingCount >= 1
    if (!dominantPunt) {
      const standing = standingFor(data, ranks.teamId)
      if (!standing || standing.bleedingCount < 1) continue
      for (const cat of data.categories) {
        if ((ranks.catRanks[cat.id] ?? 0) >= 9) { dominantPunt = cat.id; break }
      }
    }
    if (!dominantPunt) continue
    const standing = standingFor(data, ranks.teamId)
    const bleedingTotal = standing?.bleedingCount ?? 0
    if (!bestPunter || bleedingTotal > bestPunter.bleedingTotal) {
      bestPunter = { teamId: ranks.teamId, cat: dominantPunt, bleedingTotal }
    }
  }
  if (bestPunter) {
    // Use season weeks as a proxy for puntedWeeks; the data shape does
    // not track per-cat-per-week history yet.
    out.push({
      kind: 'dynasty-punt-kings',
      weight: 45 + bestPunter.bleedingTotal * 3,
      context: {
        teamId: bestPunter.teamId,
        cats: [],
        weeksOwning: 0,
        puntedCat: bestPunter.cat,
        puntedWeeks: wk,
        signal: `punt kings: ${bestPunter.teamId} bottom in ${bestPunter.cat}, ${bestPunter.bleedingTotal} bleeding cats`,
      },
    })
  }

  return out
}

/* ─────────────────────────────────────────────────────────────────
   SUB-HEADLINE DETECTION (always fires once)
───────────────────────────────────────────────────────────────── */

export function detectPRSubHeadline(
  data: CategoryLeagueData,
): Array<StoryCandidate<PRKind, PRSubHeadlineDetectionContext>> {
  const wk = data.currentWeek
  let climberCount = 0
  let bleedingCount = 0
  let bubbleCount = 0
  const cutoff = data.playoffCutoff

  for (const team of data.teams) {
    const w1 = rankAtWeek(data, team.id, 1)
    const cur = rankAtWeek(data, team.id, wk)
    if (w1 != null && cur != null && w1 - cur >= 1) climberCount++
    const standing = standingFor(data, team.id)
    if (standing && standing.streak.type === 'L' && standing.streak.length >= 3) bleedingCount++
    if (cur != null && Math.abs(cur - cutoff) <= 1) bubbleCount++
  }

  return [{
    kind: 'sub-headline',
    weight: 10,                       // always-fire, low weight is fine
    context: {
      stage: seasonStageFor(data),
      climberCount,
      bleedingCount,
      bubbleCount,
    },
  }]
}

/* ─────────────────────────────────────────────────────────────────
   QUICK-READ DETECTION (4 pills)
───────────────────────────────────────────────────────────────── */

export function detectPRQuickReads(
  data: CategoryLeagueData,
): Array<StoryCandidate<PRKind, PRQuickReadDetectionContext>> {
  const out: Array<StoryCandidate<PRKind, PRQuickReadDetectionContext>> = []
  const wk = data.currentWeek

  /* tightest-race
     The two adjacent teams in the standings with the smallest cat-win
     gap — typically the playoff cutoff seam. */
  let tightest: { a: CategoryLeagueDataStanding; b: CategoryLeagueDataStanding; gap: number } | null = null
  const byRank = [...data.standings].sort((a, b) => a.rank - b.rank)
  for (let i = 0; i < byRank.length - 1; i++) {
    const a = byRank[i]
    const b = byRank[i + 1]
    const gap = Math.abs(a.catWins - b.catWins)
    if (!tightest || gap < tightest.gap) tightest = { a, b, gap }
  }
  if (tightest) {
    out.push({
      kind: 'quick-read',
      weight: 40,
      context: {
        pill: 'tightest-race',
        teamId: tightest.a.teamId,
        opponentTeamId: tightest.b.teamId,
        statValue: tightest.gap,
        statLabel: `${tightest.gap}-cat gap`,
        signal: `tightest race: ${tightest.a.teamId} vs ${tightest.b.teamId} (${tightest.gap})`,
      },
    })
  }

  /* biggest-jump
     Largest positive rank delta since week 1. */
  let topJump: { teamId: string; spots: number } | null = null
  for (const team of data.teams) {
    const w1 = rankAtWeek(data, team.id, 1)
    const cur = rankAtWeek(data, team.id, wk)
    if (w1 == null || cur == null) continue
    const climbed = w1 - cur
    if (!topJump || climbed > topJump.spots) topJump = { teamId: team.id, spots: climbed }
  }
  if (topJump && topJump.spots >= 1) {
    out.push({
      kind: 'quick-read',
      weight: 40,
      context: {
        pill: 'biggest-jump',
        teamId: topJump.teamId,
        statValue: topJump.spots,
        statLabel: `+${topJump.spots} spots`,
        signal: `biggest jump: ${topJump.teamId} +${topJump.spots}`,
      },
    })
  }

  /* longest-fall
     Largest negative rank delta since week 1. */
  let topFall: { teamId: string; spots: number } | null = null
  for (const team of data.teams) {
    const w1 = rankAtWeek(data, team.id, 1)
    const cur = rankAtWeek(data, team.id, wk)
    if (w1 == null || cur == null) continue
    const dropped = cur - w1
    if (!topFall || dropped > topFall.spots) topFall = { teamId: team.id, spots: dropped }
  }
  if (topFall && topFall.spots >= 1) {
    out.push({
      kind: 'quick-read',
      weight: 40,
      context: {
        pill: 'longest-fall',
        teamId: topFall.teamId,
        statValue: topFall.spots,
        statLabel: `-${topFall.spots} spots`,
        signal: `longest fall: ${topFall.teamId} -${topFall.spots}`,
      },
    })
  }

  /* longest-streak
     The single longest active streak (either direction; W wins ties). */
  let topStreak: { teamId: string; type: 'W' | 'L'; length: number } | null = null
  for (const standing of data.standings) {
    if (standing.streak.length < 2) continue
    if (
      !topStreak
      || standing.streak.length > topStreak.length
      || (standing.streak.length === topStreak.length && standing.streak.type === 'W' && topStreak.type === 'L')
    ) {
      topStreak = {
        teamId: standing.teamId,
        type: standing.streak.type === 'T' ? 'W' : standing.streak.type,
        length: standing.streak.length,
      }
    }
  }
  if (topStreak) {
    out.push({
      kind: 'quick-read',
      weight: 40,
      context: {
        pill: 'longest-streak',
        teamId: topStreak.teamId,
        statValue: topStreak.length,
        statLabel: `${topStreak.type}${topStreak.length}`,
        signal: `longest streak: ${topStreak.teamId} ${topStreak.type}${topStreak.length}`,
      },
    })
  }

  return out
}

/* ─────────────────────────────────────────────────────────────────
   EXPORTED FOR RENDERER (so it can compose without re-deriving)
───────────────────────────────────────────────────────────────── */

export const prDetectionHelpers = {
  seasonStageFor,
  meanRank,
  rankVariance,
  seasonBestRank,
  heldRankAtMostFor,
  ranksFor,
  standingFor,
  catsBySide,
  topCatsOnSide,
  rankAtWeek,
}
