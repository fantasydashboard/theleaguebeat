/**
 * Story detection engine — Home page.
 *
 * Pure functions that read `CategoryLeagueData` and emit
 * `StoryCandidate[]` per slot. No rendering, no globals, no I/O.
 * Selection (pick the winner per slot) lives in `render.ts`.
 *
 * Each detector returns every candidate that fired, even if the slot
 * will only render one. Weights let downstream selection compare
 * across candidates of different kinds.
 */

import type {
  CategoryLeagueData,
  CategoryLeagueDataStanding,
  CategoryLeagueDataTeam,
  StoryCandidate,
} from './types.ts'
import type { HomeKind, QuickReadKind } from './home.ts'

/* ─────────────────────────────────────────────────────────────────
   PER-DETECTOR CONTEXT SHAPES
   These are the data each candidate carries through to render.ts,
   where they are translated into a `HomeContext`.
───────────────────────────────────────────────────────────────── */

export interface HeroDetectionContext {
  teamId: string
  opponentTeamId?: string
  rankCurrent: number
  rankPrevious: number
  rankSeasonHigh: number       // best rank held this season (numerically smallest)
  rankSeasonLow: number        // worst rank held this season (numerically largest)
  weeksSinceLastChange: number // weeks the prior #1 held the top spot, if relevant
  signal: string               // short label of what fired (debug)
}

export interface TickerDetectionContext {
  teamId: string
  streakType?: 'W' | 'L' | 'T'
  streakLength?: number
  gamesFromCut?: number
  catId?: string
  catRecord?: string
  signal: string
}

export interface PlayoffPushDetectionContext {
  cutoffRank: number
  topSeatTeamIds: string[]     // teams currently holding cutoff seats (cutoff-1, cutoff)
  bubbleTeamIds: string[]      // teams immediately below the line (cutoff+1)
  weeksLeft: number
  gamesBack: number
  stakes: 'tight' | 'moderate' | 'wide'
}

export interface QuickReadDetectionContext {
  pill: QuickReadKind
  teamId: string
  opponentTeamId?: string
  catId?: string
  value?: string
  label: string                // pre-formatted compact label
}

/* ─────────────────────────────────────────────────────────────────
   SHARED HELPERS (pure)
───────────────────────────────────────────────────────────────── */

function standingFor(data: CategoryLeagueData, teamId: string): CategoryLeagueDataStanding | undefined {
  return data.standings.find((s) => s.teamId === teamId)
}

function teamFor(data: CategoryLeagueData, teamId: string): CategoryLeagueDataTeam | undefined {
  return data.teams.find((t) => t.id === teamId)
}

function rankAtWeek(data: CategoryLeagueData, teamId: string, week: number): number | undefined {
  const wk = data.seasonRankHistory.find((w) => w.week === week)
  if (wk) return wk.ranks[teamId]
  // Fall back to current standings for the current week — ESPN's
  // `buildSeasonRankHistory` only includes weeks where every matchup
  // has been decided, so mid-week loads have an unwritten `currentWeek`.
  if (week === data.currentWeek) {
    return data.standings.find((s) => s.teamId === teamId)?.rank
  }
  return undefined
}

function currentWeekTopTeam(data: CategoryLeagueData): string | undefined {
  return findTeamAtRank(data, data.currentWeek, 1)
}

function previousWeekTopTeam(data: CategoryLeagueData): string | undefined {
  const prev = findTeamAtRank(data, data.currentWeek - 1, 1)
  if (prev) return prev
  // If the prior week isn't in history yet (very early season, or the
  // adapter only wrote one snapshot), look at the most-recent completed
  // history entry so detectors that compare "now" vs "then" still fire.
  const completed = [...data.seasonRankHistory]
    .filter((w) => w.week < data.currentWeek)
    .sort((a, b) => b.week - a.week)[0]
  if (completed) {
    for (const [teamId, r] of Object.entries(completed.ranks)) {
      if (r === 1) return teamId
    }
  }
  return undefined
}

function findTeamAtRank(data: CategoryLeagueData, week: number, rank: number): string | undefined {
  const wk = data.seasonRankHistory.find((w) => w.week === week)
  if (wk) {
    for (const [teamId, r] of Object.entries(wk.ranks)) {
      if (r === rank) return teamId
    }
    return undefined
  }
  // Current-week fallback: use the season standings, which the adapters
  // always populate (ESPN / Yahoo / Sleeper all set per-team `rank`).
  // Lets `daily-hero-new-throne` / `quiet-day` still fire mid-week.
  if (week === data.currentWeek) {
    return data.standings.find((s) => s.rank === rank)?.teamId
  }
  return undefined
}

/** How many consecutive weeks (ending at endWeek) the team held the given rank. */
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

function seasonRankExtremes(data: CategoryLeagueData, teamId: string): { high: number; low: number } {
  let high = Infinity
  let low = -Infinity
  for (const w of data.seasonRankHistory) {
    const r = w.ranks[teamId]
    if (r == null) continue
    if (r < high) high = r
    if (r > low) low = r
  }
  return {
    high: isFinite(high) ? high : 10,
    low: isFinite(low) ? low : 10,
  }
}

/* ─────────────────────────────────────────────────────────────────
   DAILY HERO DETECTION
───────────────────────────────────────────────────────────────── */

export function detectDailyHero(
  data: CategoryLeagueData,
): Array<StoryCandidate<HomeKind, HeroDetectionContext>> {
  const candidates: Array<StoryCandidate<HomeKind, HeroDetectionContext>> = []
  const wk = data.currentWeek

  /* daily-hero-new-throne
     Rank-1 team this week differs from rank-1 last week. */
  const currentTop = currentWeekTopTeam(data)
  const previousTop = previousWeekTopTeam(data)
  if (currentTop && previousTop && currentTop !== previousTop) {
    const weeksPreviousHeld = consecutiveWeeksAtRank(data, previousTop, 1, wk - 1)
    const extremes = seasonRankExtremes(data, currentTop)
    candidates.push({
      kind: 'daily-hero-new-throne',
      weight: 100,
      context: {
        teamId: currentTop,
        opponentTeamId: previousTop,
        rankCurrent: 1,
        rankPrevious: rankAtWeek(data, currentTop, wk - 1) ?? 2,
        rankSeasonHigh: extremes.high,
        rankSeasonLow: extremes.low,
        weeksSinceLastChange: weeksPreviousHeld,
        signal: `new #1: ${currentTop} (was ${previousTop} for ${weeksPreviousHeld}w)`,
      },
    })
  }

  /* daily-hero-dynasty-falling
     A team that was rank-1 for N>=3 consecutive weeks has dropped to
     rank >= 4 this week. Scan every team's history. */
  for (const team of data.teams) {
    const currentRank = rankAtWeek(data, team.id, wk)
    if (currentRank == null || currentRank < 4) continue
    // Find the longest run at rank 1 ending at some prior week.
    let longestRunAt1 = 0
    let run = 0
    for (const w of data.seasonRankHistory) {
      if (w.week > wk) continue
      if (w.ranks[team.id] === 1) {
        run++
        if (run > longestRunAt1) longestRunAt1 = run
      } else {
        run = 0
      }
    }
    if (longestRunAt1 >= 3) {
      const newKing = currentWeekTopTeam(data)
      const extremes = seasonRankExtremes(data, team.id)
      candidates.push({
        kind: 'daily-hero-dynasty-falling',
        weight: 95,
        context: {
          teamId: team.id,
          opponentTeamId: newKing && newKing !== team.id ? newKing : undefined,
          rankCurrent: currentRank,
          rankPrevious: rankAtWeek(data, team.id, wk - 1) ?? currentRank,
          rankSeasonHigh: extremes.high,
          rankSeasonLow: extremes.low,
          weeksSinceLastChange: longestRunAt1,
          signal: `dynasty falling: ${team.id} held #1 for ${longestRunAt1}w, now #${currentRank}`,
        },
      })
    }
  }

  /* daily-hero-hot-climber
     Rank delta since week 1 >= 4 upward. */
  for (const team of data.teams) {
    const week1 = rankAtWeek(data, team.id, 1)
    const current = rankAtWeek(data, team.id, wk)
    if (week1 == null || current == null) continue
    const climbed = week1 - current
    if (climbed >= 4) {
      const extremes = seasonRankExtremes(data, team.id)
      candidates.push({
        kind: 'daily-hero-hot-climber',
        weight: 70,
        context: {
          teamId: team.id,
          rankCurrent: current,
          rankPrevious: rankAtWeek(data, team.id, wk - 1) ?? current,
          rankSeasonHigh: extremes.high,
          rankSeasonLow: extremes.low,
          weeksSinceLastChange: 0,
          signal: `climber: ${team.id} +${climbed} spots since W1`,
        },
      })
    }
  }

  /* daily-hero-bubble-surprise
     A team currently in the bubble band (cutoff ± 1) that moved INTO
     that band from OUTSIDE in the last 2 weeks. */
  const cutoff = data.playoffCutoff
  for (const team of data.teams) {
    const current = rankAtWeek(data, team.id, wk)
    if (current == null) continue
    const inBubbleNow = Math.abs(current - cutoff) <= 1
    if (!inBubbleNow) continue
    const twoBack = rankAtWeek(data, team.id, wk - 2)
    if (twoBack == null) continue
    const wasOutside = Math.abs(twoBack - cutoff) > 1
    if (!wasOutside) continue
    const extremes = seasonRankExtremes(data, team.id)
    candidates.push({
      kind: 'daily-hero-bubble-surprise',
      weight: 55,
      context: {
        teamId: team.id,
        rankCurrent: current,
        rankPrevious: rankAtWeek(data, team.id, wk - 1) ?? current,
        rankSeasonHigh: extremes.high,
        rankSeasonLow: extremes.low,
        weeksSinceLastChange: 0,
        signal: `bubble surprise: ${team.id} ${twoBack} -> ${current} (cutoff ${cutoff})`,
      },
    })
  }

  /* daily-hero-identity-shift
     Category-rank profile changed in last 3 weeks: a previously
     bottom-3 cat is now top-3, or vice versa. Our fixture only
     exposes current categoryRanks (no per-week history), so this
     uses standings.ownsCount + bleedingCount as a proxy: a team
     with both >=2 owns AND >=2 bleeds, with a recent rank change,
     is a candidate. */
  for (const team of data.teams) {
    const standing = standingFor(data, team.id)
    if (!standing) continue
    const owns = standing.ownsCount
    const bleeds = standing.bleedingCount
    // Identity-shift signal: team holds owns AND bleeds at the same
    // time (a "split profile"), and rank has moved >= 2 spots in the
    // last 3 weeks.
    if (owns >= 2 && bleeds >= 2) {
      const current = rankAtWeek(data, team.id, wk)
      const threeBack = rankAtWeek(data, team.id, Math.max(1, wk - 3))
      if (current == null || threeBack == null) continue
      if (Math.abs(threeBack - current) >= 2) {
        const extremes = seasonRankExtremes(data, team.id)
        candidates.push({
          kind: 'daily-hero-identity-shift',
          weight: 50,
          context: {
            teamId: team.id,
            rankCurrent: current,
            rankPrevious: rankAtWeek(data, team.id, wk - 1) ?? current,
            rankSeasonHigh: extremes.high,
            rankSeasonLow: extremes.low,
            weeksSinceLastChange: 0,
            signal: `identity shift: ${team.id} owns=${owns} bleeds=${bleeds} rank ${threeBack}->${current}`,
          },
        })
      }
    }
  }

  /* daily-hero-sweep-weekend
     Any team that won >= 7 cats in the current matchup week. The
     fixture does not expose per-week matchup-result splits at the
     CategoryLeagueData level, so this never fires today.
     TODO: needs matchup-result data — fixture exposes matchupsWeek8
     but the universal data shape does not include per-week cat
     win counts yet. */
  // (intentionally empty — see TODO above)

  /* daily-hero-comeback-team
     Team was rank >= 8 three weeks ago and is now rank <= 6. */
  for (const team of data.teams) {
    const current = rankAtWeek(data, team.id, wk)
    const threeBack = rankAtWeek(data, team.id, Math.max(1, wk - 3))
    if (current == null || threeBack == null) continue
    if (threeBack >= 8 && current <= 6) {
      const extremes = seasonRankExtremes(data, team.id)
      candidates.push({
        kind: 'daily-hero-comeback-team',
        weight: 55,
        context: {
          teamId: team.id,
          rankCurrent: current,
          rankPrevious: rankAtWeek(data, team.id, wk - 1) ?? current,
          rankSeasonHigh: extremes.high,
          rankSeasonLow: extremes.low,
          weeksSinceLastChange: 0,
          signal: `comeback: ${team.id} ${threeBack}(W${wk - 3}) -> ${current}(W${wk})`,
        },
      })
    }
  }

  /* daily-hero-quiet-day
     Fallback when no other candidate fires with weight >= 50.
     Always emit so the slot is never empty. */
  const topNonQuiet = candidates.reduce((m, c) => (c.weight > m ? c.weight : m), 0)
  if (topNonQuiet < 50) {
    const topTeam = currentWeekTopTeam(data)
    if (topTeam) {
      const extremes = seasonRankExtremes(data, topTeam)
      candidates.push({
        kind: 'daily-hero-quiet-day',
        weight: 20,
        context: {
          teamId: topTeam,
          rankCurrent: 1,
          rankPrevious: rankAtWeek(data, topTeam, wk - 1) ?? 1,
          rankSeasonHigh: extremes.high,
          rankSeasonLow: extremes.low,
          weeksSinceLastChange: consecutiveWeeksAtRank(data, topTeam, 1, wk),
          signal: 'quiet-day fallback',
        },
      })
    }
  }

  return candidates
}

/* ─────────────────────────────────────────────────────────────────
   TICKER DETECTION
───────────────────────────────────────────────────────────────── */

export function detectTicker(
  data: CategoryLeagueData,
): Array<StoryCandidate<HomeKind, TickerDetectionContext>> {
  const candidates: Array<StoryCandidate<HomeKind, TickerDetectionContext>> = []
  const cutoff = data.playoffCutoff

  for (const standing of data.standings) {
    const { type, length } = standing.streak

    // ticker-hot-streak: W>=3
    if (type === 'W' && length >= 3) {
      candidates.push({
        kind: 'ticker-hot-streak',
        weight: 40 + length,        // longer streak ranks higher
        context: {
          teamId: standing.teamId,
          streakType: type,
          streakLength: length,
          signal: `hot streak: ${standing.teamId} W${length}`,
        },
      })
    }

    // ticker-rough-patch: L>=3
    if (type === 'L' && length >= 3) {
      candidates.push({
        kind: 'ticker-rough-patch',
        weight: 35 + length,
        context: {
          teamId: standing.teamId,
          streakType: type,
          streakLength: length,
          signal: `rough patch: ${standing.teamId} L${length}`,
        },
      })
    }

    // ticker-blowout: L>=5 (more severe than rough-patch)
    if (type === 'L' && length >= 5) {
      candidates.push({
        kind: 'ticker-blowout',
        weight: 45 + length,
        context: {
          teamId: standing.teamId,
          streakType: type,
          streakLength: length,
          signal: `blowout: ${standing.teamId} L${length}`,
        },
      })
    }

    // ticker-bubble-watch: |rank - cutoff| <= 1
    if (Math.abs(standing.rank - cutoff) <= 1) {
      candidates.push({
        kind: 'ticker-bubble-watch',
        weight: 38,
        context: {
          teamId: standing.teamId,
          gamesFromCut: Math.abs(standing.rank - cutoff),
          signal: `bubble watch: ${standing.teamId} rank ${standing.rank}`,
        },
      })
    }
  }

  /* ticker-top-cat-king
     Per team: if any single cat has them at rank 1 with significant
     gap. We don't have per-team-per-cat margins, only ranks, so we
     proxy "significant gap" as: the team holds rank 1 in a cat AND
     leads that cat's side by holding it for the whole season (proxy:
     team's ownsCount >= 3 — they own several cats, so rank-1 in any
     one is likely well-held). Emit one candidate per qualifying team. */
  for (const team of data.teams) {
    const standing = standingFor(data, team.id)
    if (!standing) continue
    if (standing.ownsCount < 3) continue
    const ranks = data.categoryRanks.find((r) => r.teamId === team.id)
    if (!ranks) continue
    for (const [catId, rank] of Object.entries(ranks.catRanks)) {
      if (rank === 1) {
        candidates.push({
          kind: 'ticker-top-cat-king',
          weight: 36 + standing.ownsCount,
          context: {
            teamId: team.id,
            catId,
            signal: `top-cat king: ${team.id} #1 in ${catId}`,
          },
        })
        break  // one per team is enough for the ticker
      }
    }
  }

  return candidates
}

/* ─────────────────────────────────────────────────────────────────
   PLAYOFF-PUSH CLOSER DETECTION
───────────────────────────────────────────────────────────────── */

export function detectPlayoffPush(
  data: CategoryLeagueData,
): Array<StoryCandidate<HomeKind, PlayoffPushDetectionContext>> {
  const cutoff = data.playoffCutoff
  const wk = data.currentWeek

  // Top seats: cutoff-1 and cutoff (the last two safe seats).
  const topSeatTeamIds = [cutoff - 1, cutoff]
    .map((r) => data.standings.find((s) => s.rank === r)?.teamId)
    .filter((id): id is string => Boolean(id))

  // Bubble: cutoff+1 (immediately below). Also include cutoff+2 when
  // the gap is small, so the closer has more to chew on.
  const bubbleTeamIds = [cutoff + 1, cutoff + 2]
    .map((r) => data.standings.find((s) => s.rank === r)?.teamId)
    .filter((id): id is string => Boolean(id))

  // games-back proxy: rank-distance between bubble team #1 and cutoff team.
  const bubbleTop = data.standings.find((s) => s.rank === cutoff + 1)
  const cutTeam = data.standings.find((s) => s.rank === cutoff)
  const gamesBack = bubbleTop && cutTeam
    ? Math.max(1, Math.round((cutTeam.winPct - bubbleTop.winPct) * 8))
    : 1

  // Stakes: gap of <=1 game = tight, 2 = moderate, >=3 = wide.
  const stakes: 'tight' | 'moderate' | 'wide' =
    gamesBack <= 1 ? 'tight' : gamesBack === 2 ? 'moderate' : 'wide'

  // Weeks left: regular-season length proxy. Without an explicit
  // schedule end on CategoryLeagueData yet, infer from current week
  // and a 12-week regular season (category leagues commonly run this).
  // Prefer the adapter-provided end-of-regular-season week (Yahoo has
  // this from `metadata.end_week`; ESPN can derive from settings).
  // Falls back to the demo league's 12-week assumption.
  const REGULAR_SEASON_WEEKS = data.regularSeasonEndWeek ?? 12
  const weeksLeft = Math.max(1, REGULAR_SEASON_WEEKS - wk)

  return [{
    kind: 'playoff-push-closer',
    weight: 60,
    context: {
      cutoffRank: cutoff,
      topSeatTeamIds,
      bubbleTeamIds,
      weeksLeft,
      gamesBack,
      stakes,
    },
  }]
}

/* ─────────────────────────────────────────────────────────────────
   QUICK-READS DETECTION (4 pills)
───────────────────────────────────────────────────────────────── */

export function detectQuickReads(
  data: CategoryLeagueData,
): Array<StoryCandidate<HomeKind, QuickReadDetectionContext>> {
  const out: Array<StoryCandidate<HomeKind, QuickReadDetectionContext>> = []
  const wk = data.currentWeek

  /* top-cat-this-week
     The fixture does not expose per-week cat-wins-by-team in the
     universal shape. Use the team with the most ownsCount as the
     "leads the most cats" proxy, and pick that team's strongest
     cat (rank 1). */
  const topOwnsTeam = [...data.standings].sort((a, b) => b.ownsCount - a.ownsCount)[0]
  if (topOwnsTeam) {
    const ranks = data.categoryRanks.find((r) => r.teamId === topOwnsTeam.teamId)
    const ledCat = ranks
      ? Object.entries(ranks.catRanks).find(([, r]) => r === 1)?.[0]
      : undefined
    const team = teamFor(data, topOwnsTeam.teamId)
    if (team && ledCat) {
      out.push({
        kind: 'quick-read',
        weight: 40,
        context: {
          pill: 'top-cat-this-week',
          teamId: team.id,
          catId: ledCat,
          value: `${topOwnsTeam.ownsCount} cats owned`,
          label: `${ledCat} · ${team.name} · ${topOwnsTeam.ownsCount} cats owned`,
        },
      })
    }
  }

  /* biggest-upset
     Needs matchup-result data the universal shape does not yet
     expose. Skip with a documented gap.
     TODO: needs matchup-result data — CategoryLeagueData has no
     per-week matchup outcomes. Wire when adapters provide them. */

  /* hottest-streak
     Longest current win streak across the league. */
  const hottest = [...data.standings]
    .filter((s) => s.streak.type === 'W')
    .sort((a, b) => b.streak.length - a.streak.length)[0]
  if (hottest) {
    const team = teamFor(data, hottest.teamId)
    if (team) {
      out.push({
        kind: 'quick-read',
        weight: 40,
        context: {
          pill: 'hottest-streak',
          teamId: team.id,
          value: `W${hottest.streak.length}`,
          label: `${team.name} · W${hottest.streak.length}`,
        },
      })
    }
  }

  /* on-the-bubble
     Lowest-ranked team still mathematically in playoff contention.
     Proxy: the team at rank = cutoff + 1 (first team below the cut).
     If they're already mathematically out, fall back to the team at
     the cutoff itself (the most-in-danger qualifier). */
  const bubble = data.standings.find((s) => s.rank === data.playoffCutoff + 1)
    ?? data.standings.find((s) => s.rank === data.playoffCutoff)
  if (bubble) {
    const team = teamFor(data, bubble.teamId)
    const cutTeam = data.standings.find((s) => s.rank === data.playoffCutoff)
    const cutTeamObj = cutTeam ? teamFor(data, cutTeam.teamId) : undefined
    if (team) {
      const label = cutTeamObj && cutTeam && cutTeam.teamId !== bubble.teamId
        ? `${bubble.rank}th ${team.name} vs ${cutTeam.rank}th ${cutTeamObj.name}`
        : `${bubble.rank}th ${team.name}`
      out.push({
        kind: 'quick-read',
        weight: 40,
        context: {
          pill: 'on-the-bubble',
          teamId: team.id,
          opponentTeamId: cutTeam?.teamId,
          value: undefined,
          label,
        },
      })
    }
  }

  // Suppress unused-warning by referencing wk in a no-op when
  // we add a future per-week detector. Keeps the import live.
  void wk

  return out
}
