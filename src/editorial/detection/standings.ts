/**
 * Standings detectors — 18 story types covering rank changes, playoff
 * implications, and season-defining position swings.
 *
 * Each detector is a pure function that reads CategoryLeagueData +
 * IssueContext and returns zero-or-more StoryCandidate objects.
 * Detectors never throw — they return [] on missing or insufficient
 * data. The orchestrator (detection/index.ts) merges every detector's
 * output into the candidate list selection consumes.
 *
 * Existing 7 detectors (new-throne, dynasty-falling, hot-climber,
 * bubble-surprise, comeback-team, identity-shift, quiet-day) are
 * ported from the monolithic detect.ts. The remaining 11 are new
 * Tier-1 work that runs off data already exposed on
 * CategoryLeagueData.
 *
 * See docs/EDITORIAL_ARCHITECTURE.md for the full spec.
 */

import type { CategoryLeagueData } from '../types'
import type { IssueContext, SeasonStage, StoryCandidate } from './types'
import {
  consecutiveWeeksAtRank,
  currentWeekTopTeam,
  findTeamAtRank,
  freshnessForWeekAge,
  isLockedIntoCut,
  isMathematicallyEliminated,
  previousWeekTopTeam,
  rankAtWeek,
  rankDeltaSinceWeek1,
  seasonRankExtremes,
  signature,
  standingFor,
  weeksRemaining,
} from './helpers'

/* ─────────────────────────────────────────────────────────────────
   WEIGHTS
   Baseline importance per story type, 0-100. Selection multiplies
   weight by freshness and personalization to score candidates.
───────────────────────────────────────────────────────────────── */

const W = {
  /** Throne change is the biggest single-week standings event. */
  newThrone: 90,
  /** Former #1 collapse is nearly as big as the takeover itself. */
  dynastyFalling: 85,
  /** Locked top seed is the season-ending crown — slightly above
   *  new-throne because it's terminal (irreversible). */
  lockedTopSeed: 95,
  /** Elimination matters but is a sad story; below clinch. */
  mathematicalElimination: 75,
  /** Climbing 4+ spots since W1 — a season narrative. */
  hotClimber: 70,
  /** New division leader is significant in divisional leagues. */
  divisionLeadChange: 70,
  /** Three-way ties for the bubble line are good drama. */
  threeWayTieBubble: 65,
  /** First-time-playoff-position is a meaningful arc beat. */
  firstTimePlayoffs: 65,
  /** Sub-.500 newcomer sweeping 7+ cats is a feel-good upset. */
  newcomerBreakout: 60,
  /** Wild-card shift — bubble position changed hands. */
  wildCardShift: 60,
  /** Two former #1s trading the lead — short-term rivalry. */
  dethronedRivalry: 60,
  /** Moved into the bubble band from outside. */
  bubbleSurprise: 55,
  /** Rose from rank 8+ to top 6 in three weeks. */
  comebackTeam: 55,
  /** Eliminated team beating a contender — playoff implications. */
  spoilerMode: 55,
  /** Split profile (owns + bleeds) + recent rank movement. */
  identityShift: 50,
  /** Crossed .500 for the first time. */
  firstAbove500: 50,
  /** Dropped below .500 for the first time. */
  firstBelow500: 50,
  /** Fallback when nothing else fires. */
  quietDay: 20,
} as const

/* ─────────────────────────────────────────────────────────────────
   STAGE PRESETS
   Most detectors fire in the same set of stages; pre-build the
   common ones so detectors stay readable.
───────────────────────────────────────────────────────────────── */

const STAGES_IN_SEASON: SeasonStage[] = [
  'opening',
  'settling',
  'midseason',
  'stretch',
  'final',
]

const STAGES_FROM_MIDSEASON: SeasonStage[] = [
  'midseason',
  'stretch',
  'final',
]

const STAGES_FROM_SETTLING: SeasonStage[] = [
  'settling',
  'midseason',
  'stretch',
  'final',
]

const STAGES_SETTLING_AND_MID: SeasonStage[] = [
  'settling',
  'midseason',
]

const STAGES_LATE: SeasonStage[] = ['stretch', 'final']

const STAGES_FINAL_ONLY: SeasonStage[] = ['final']

/* ─────────────────────────────────────────────────────────────────
   1. NEW THRONE
   Rank-1 team this week differs from rank-1 last week.
───────────────────────────────────────────────────────────────── */

function detectNewThrone(
  data: CategoryLeagueData,
  context: IssueContext,
): StoryCandidate[] {
  const wk = data.currentWeek
  const currentTop = currentWeekTopTeam(data)
  const previousTop = previousWeekTopTeam(data)
  if (!currentTop || !previousTop || currentTop === previousTop) return []

  const weeksOpponentHeld = consecutiveWeeksAtRank(data, previousTop, 1, wk - 1)
  const extremes = seasonRankExtremes(data, currentTop)
  const fromRank = rankAtWeek(data, currentTop, wk - 1) ?? 2

  return [{
    type: 'new-throne',
    category: 'standings',
    weight: W.newThrone,
    freshness: freshnessForWeekAge(0),
    scope: 'matchup',
    teamIds: [currentTop, previousTop],
    seasonStages: STAGES_IN_SEASON,
    context: {
      teamId: currentTop,
      opponentTeamId: previousTop,
      fromRank,
      toRank: 1,
      weeksOpponentHeld,
      rankSeasonHigh: extremes.high,
      rankSeasonLow: extremes.low,
    },
    signature: signature(['new-throne', currentTop, context.currentWeek]),
  }]
}

/* ─────────────────────────────────────────────────────────────────
   2. DYNASTY FALLING
   A team that was rank-1 for >= 3 consecutive weeks has dropped to
   rank >= 4 this week.
───────────────────────────────────────────────────────────────── */

function detectDynastyFalling(
  data: CategoryLeagueData,
  context: IssueContext,
): StoryCandidate[] {
  const wk = data.currentWeek
  const out: StoryCandidate[] = []

  for (const team of data.teams) {
    const currentRank = rankAtWeek(data, team.id, wk)
    if (currentRank == null || currentRank < 4) continue

    // Longest run at rank-1 over the season so far.
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
    if (longestRunAt1 < 3) continue

    const fromRank = rankAtWeek(data, team.id, wk - 1) ?? currentRank
    const extremes = seasonRankExtremes(data, team.id)

    out.push({
      type: 'dynasty-falling',
      category: 'standings',
      weight: W.dynastyFalling,
      freshness: freshnessForWeekAge(0),
      scope: 'team',
      teamIds: [team.id],
      seasonStages: STAGES_IN_SEASON,
      context: {
        teamId: team.id,
        fromRank,
        toRank: currentRank,
        weeksAtTop: longestRunAt1,
        rankSeasonHigh: extremes.high,
        rankSeasonLow: extremes.low,
      },
      signature: signature(['dynasty-falling', team.id, context.currentWeek]),
    })
  }

  return out
}

/* ─────────────────────────────────────────────────────────────────
   3. HOT CLIMBER
   Rank delta since week 1 is 4+ spots upward.
───────────────────────────────────────────────────────────────── */

function detectHotClimber(
  data: CategoryLeagueData,
  context: IssueContext,
): StoryCandidate[] {
  const wk = data.currentWeek
  const out: StoryCandidate[] = []

  for (const team of data.teams) {
    const climbed = rankDeltaSinceWeek1(data, team.id)
    if (climbed < 4) continue

    const current = rankAtWeek(data, team.id, wk)
    const week1 = rankAtWeek(data, team.id, 1)
    if (current == null || week1 == null) continue

    const extremes = seasonRankExtremes(data, team.id)

    out.push({
      type: 'hot-climber',
      category: 'standings',
      weight: W.hotClimber,
      freshness: freshnessForWeekAge(0),
      scope: 'team',
      teamIds: [team.id],
      seasonStages: STAGES_IN_SEASON,
      context: {
        teamId: team.id,
        spotsClimbed: climbed,
        fromRank: week1,
        toRank: current,
        rankSeasonHigh: extremes.high,
        rankSeasonLow: extremes.low,
      },
      signature: signature(['hot-climber', team.id, context.currentWeek]),
    })
  }

  return out
}

/* ─────────────────────────────────────────────────────────────────
   4. BUBBLE SURPRISE
   Team is currently in the bubble band (cutoff ± 1) and moved INTO
   that band from OUTSIDE in the last 2 weeks.
───────────────────────────────────────────────────────────────── */

function detectBubbleSurprise(
  data: CategoryLeagueData,
  context: IssueContext,
): StoryCandidate[] {
  const wk = data.currentWeek
  const cutoff = data.playoffCutoff
  const out: StoryCandidate[] = []

  for (const team of data.teams) {
    const current = rankAtWeek(data, team.id, wk)
    if (current == null) continue
    if (Math.abs(current - cutoff) > 1) continue

    const twoBack = rankAtWeek(data, team.id, wk - 2)
    if (twoBack == null) continue
    if (Math.abs(twoBack - cutoff) <= 1) continue // was already in bubble

    const extremes = seasonRankExtremes(data, team.id)

    out.push({
      type: 'bubble-surprise',
      category: 'standings',
      weight: W.bubbleSurprise,
      freshness: freshnessForWeekAge(0),
      scope: 'team',
      teamIds: [team.id],
      seasonStages: STAGES_FROM_MIDSEASON,
      context: {
        teamId: team.id,
        fromRank: twoBack,
        toRank: current,
        cutoff,
        rankSeasonHigh: extremes.high,
        rankSeasonLow: extremes.low,
      },
      signature: signature(['bubble-surprise', team.id, context.currentWeek]),
    })
  }

  return out
}

/* ─────────────────────────────────────────────────────────────────
   5. COMEBACK TEAM
   Was rank >= 8 three weeks ago, now rank <= 6.
───────────────────────────────────────────────────────────────── */

function detectComebackTeam(
  data: CategoryLeagueData,
  context: IssueContext,
): StoryCandidate[] {
  const wk = data.currentWeek
  const out: StoryCandidate[] = []

  for (const team of data.teams) {
    const current = rankAtWeek(data, team.id, wk)
    const threeBack = rankAtWeek(data, team.id, Math.max(1, wk - 3))
    if (current == null || threeBack == null) continue
    if (!(threeBack >= 8 && current <= 6)) continue

    const extremes = seasonRankExtremes(data, team.id)

    out.push({
      type: 'comeback-team',
      category: 'standings',
      weight: W.comebackTeam,
      freshness: freshnessForWeekAge(0),
      scope: 'team',
      teamIds: [team.id],
      seasonStages: STAGES_FROM_SETTLING,
      context: {
        teamId: team.id,
        fromRank: threeBack,
        toRank: current,
        fromWeek: Math.max(1, wk - 3),
        toWeek: wk,
        rankSeasonHigh: extremes.high,
        rankSeasonLow: extremes.low,
      },
      signature: signature(['comeback-team', team.id, context.currentWeek]),
    })
  }

  return out
}

/* ─────────────────────────────────────────────────────────────────
   6. IDENTITY SHIFT
   Team carries both ownsCount >= 2 and bleedingCount >= 2 (split
   profile) AND has moved >= 2 spots in the last 3 weeks.
───────────────────────────────────────────────────────────────── */

function detectIdentityShift(
  data: CategoryLeagueData,
  context: IssueContext,
): StoryCandidate[] {
  const wk = data.currentWeek
  const out: StoryCandidate[] = []

  for (const team of data.teams) {
    const standing = standingFor(data, team.id)
    if (!standing) continue
    if (standing.ownsCount < 2 || standing.bleedingCount < 2) continue

    const current = rankAtWeek(data, team.id, wk)
    const threeBack = rankAtWeek(data, team.id, Math.max(1, wk - 3))
    if (current == null || threeBack == null) continue
    if (Math.abs(threeBack - current) < 2) continue

    const extremes = seasonRankExtremes(data, team.id)

    out.push({
      type: 'identity-shift',
      category: 'standings',
      weight: W.identityShift,
      freshness: freshnessForWeekAge(0),
      scope: 'team',
      teamIds: [team.id],
      seasonStages: STAGES_IN_SEASON,
      context: {
        teamId: team.id,
        ownsCount: standing.ownsCount,
        bleedingCount: standing.bleedingCount,
        fromRank: threeBack,
        toRank: current,
        rankSeasonHigh: extremes.high,
        rankSeasonLow: extremes.low,
      },
      signature: signature(['identity-shift', team.id, context.currentWeek]),
    })
  }

  return out
}

/* ─────────────────────────────────────────────────────────────────
   7. QUIET DAY
   Fallback when nothing higher-weight has fired in this module.
   We emit unconditionally because selection handles the "is this
   the best we've got?" decision — but we keep the weight low so
   any real story beats it.
───────────────────────────────────────────────────────────────── */

function detectQuietDay(
  data: CategoryLeagueData,
  context: IssueContext,
): StoryCandidate[] {
  const wk = data.currentWeek
  const topTeam = currentWeekTopTeam(data)
  if (!topTeam) return []

  const extremes = seasonRankExtremes(data, topTeam)
  const weeksAtTop = consecutiveWeeksAtRank(data, topTeam, 1, wk)

  return [{
    type: 'quiet-day',
    category: 'standings',
    weight: W.quietDay,
    freshness: freshnessForWeekAge(0),
    scope: 'league',
    teamIds: [topTeam],
    seasonStages: STAGES_IN_SEASON,
    context: {
      teamId: topTeam,
      weeksAtTop,
      rankSeasonHigh: extremes.high,
      rankSeasonLow: extremes.low,
    },
    signature: signature(['quiet-day', topTeam, context.currentWeek]),
  }]
}

/* ─────────────────────────────────────────────────────────────────
   8. NEWCOMER BREAKOUT
   Sub-.500 team won 7+ cats in this week's matchup.
───────────────────────────────────────────────────────────────── */

function detectNewcomerBreakout(
  data: CategoryLeagueData,
  context: IssueContext,
): StoryCandidate[] {
  const matchups = data.matchupsCurrentWeek
  if (!matchups || matchups.length === 0) return []

  const out: StoryCandidate[] = []

  for (const m of matchups) {
    // Only count matchups that are decided (live / coasting could still
    // change; upcoming hasn't happened). "final" and "coasting" are the
    // useful states — coasting is effectively decided once one team has
    // mathematically clinched the week.
    if (m.status !== 'final' && m.status !== 'coasting') continue

    for (const side of ['home', 'away'] as const) {
      const teamId = side === 'home' ? m.homeTeamId : m.awayTeamId
      const catWins = side === 'home' ? m.homeCatWins : m.awayCatWins
      if (catWins < 7) continue

      const standing = standingFor(data, teamId)
      if (!standing) continue
      if (standing.winPct >= 0.5) continue // not sub-.500

      const opponentId = side === 'home' ? m.awayTeamId : m.homeTeamId
      const opponentCatWins = side === 'home' ? m.awayCatWins : m.homeCatWins

      out.push({
        type: 'newcomer-breakout',
        category: 'standings',
        weight: W.newcomerBreakout,
        freshness: freshnessForWeekAge(0),
        scope: 'team',
        teamIds: [teamId, opponentId],
        seasonStages: STAGES_IN_SEASON,
        context: {
          teamId,
          opponentTeamId: opponentId,
          catWins,
          opponentCatWins,
          winPct: standing.winPct,
          rank: standing.rank,
        },
        signature: signature(['newcomer-breakout', teamId, context.currentWeek]),
      })
    }
  }

  return out
}

/* ─────────────────────────────────────────────────────────────────
   9. LOCKED TOP SEED
   Team holds rank 1 AND is mathematically locked into the cut
   (which for #1 is identical to "can't be passed by any other
   team for the top seed" given how isLockedIntoCut models the
   bubble — but #1 specifically means clinched the top seed when
   they're also the only team above the lock threshold).
   We require both: rank === 1 and isLockedIntoCut returns true.
───────────────────────────────────────────────────────────────── */

function detectLockedTopSeed(
  data: CategoryLeagueData,
  context: IssueContext,
): StoryCandidate[] {
  const out: StoryCandidate[] = []
  const weeksLeft = weeksRemaining(data.currentWeek, data.regularSeasonEndWeek)

  for (const standing of data.standings) {
    if (standing.rank !== 1) continue
    if (!isLockedIntoCut(data, standing.teamId)) continue

    // gamesAhead proxy = catWins gap from #2 (closest challenger).
    const second = data.standings.find((s) => s.rank === 2)
    const gamesAhead = second
      ? Math.max(0, standing.catWins - second.catWins)
      : standing.catWins

    out.push({
      type: 'locked-top-seed',
      category: 'standings',
      weight: W.lockedTopSeed,
      freshness: freshnessForWeekAge(0),
      scope: 'team',
      teamIds: [standing.teamId],
      seasonStages: STAGES_LATE,
      context: {
        teamId: standing.teamId,
        weeksRemaining: weeksLeft,
        gamesAhead,
        catWins: standing.catWins,
        runnerUpTeamId: second?.teamId,
        runnerUpCatWins: second?.catWins,
      },
      signature: signature(['locked-top-seed', standing.teamId, context.currentWeek]),
    })
  }

  return out
}

/* ─────────────────────────────────────────────────────────────────
   10. MATHEMATICAL ELIMINATION
   Team can no longer reach playoff cutoff.
───────────────────────────────────────────────────────────────── */

function detectMathematicalElimination(
  data: CategoryLeagueData,
  context: IssueContext,
): StoryCandidate[] {
  const out: StoryCandidate[] = []
  const weeksLeft = weeksRemaining(data.currentWeek, data.regularSeasonEndWeek)
  const cutTeam = data.standings.find((s) => s.rank === data.playoffCutoff)

  for (const standing of data.standings) {
    if (!isMathematicallyEliminated(data, standing.teamId)) continue

    const gamesBack = cutTeam
      ? Math.max(0, cutTeam.catWins - standing.catWins)
      : 0

    out.push({
      type: 'mathematical-elimination',
      category: 'standings',
      weight: W.mathematicalElimination,
      freshness: freshnessForWeekAge(0),
      scope: 'team',
      teamIds: [standing.teamId],
      seasonStages: STAGES_LATE,
      context: {
        teamId: standing.teamId,
        weeksRemaining: weeksLeft,
        gamesBack,
        rank: standing.rank,
        catWins: standing.catWins,
        cutTeamId: cutTeam?.teamId,
        cutTeamCatWins: cutTeam?.catWins,
      },
      signature: signature(['mathematical-elimination', standing.teamId, context.currentWeek]),
    })
  }

  return out
}

/* ─────────────────────────────────────────────────────────────────
   11. FIRST-TIME PLAYOFFS
   Team's rank <= playoffCutoff this week, but was > cutoff every
   prior week of the season.
───────────────────────────────────────────────────────────────── */

function detectFirstTimePlayoffs(
  data: CategoryLeagueData,
  context: IssueContext,
): StoryCandidate[] {
  const wk = data.currentWeek
  const cutoff = data.playoffCutoff
  const out: StoryCandidate[] = []

  for (const team of data.teams) {
    const current = rankAtWeek(data, team.id, wk)
    if (current == null || current > cutoff) continue

    // Every prior week (from week 1 through wk - 1) must show rank > cutoff.
    // Require at least one prior week of history to qualify — otherwise
    // every team would fire on week 1.
    let priorWeeksSeen = 0
    let everInside = false
    for (let w = 1; w < wk; w++) {
      const r = rankAtWeek(data, team.id, w)
      if (r == null) continue
      priorWeeksSeen++
      if (r <= cutoff) {
        everInside = true
        break
      }
    }
    if (priorWeeksSeen === 0 || everInside) continue

    out.push({
      type: 'first-time-playoffs',
      category: 'standings',
      weight: W.firstTimePlayoffs,
      freshness: freshnessForWeekAge(0),
      scope: 'team',
      teamIds: [team.id],
      seasonStages: STAGES_FROM_MIDSEASON,
      context: {
        teamId: team.id,
        rank: current,
        cutoff,
        priorWeeksOutside: priorWeeksSeen,
      },
      signature: signature(['first-time-playoffs', team.id, context.currentWeek]),
    })
  }

  return out
}

/* ─────────────────────────────────────────────────────────────────
   12. FIRST ABOVE .500
   Team's winPct crossed >= 0.5 this week for the first time
   all season. Without per-week winPct history on CategoryLeagueData,
   we use a rank-based proxy: this week the team is in the upper
   half of the league (rank <= floor(N/2)), and every prior week
   they were in the lower half. This isn't perfect, but it's the
   closest we can get with the data we have.
   TODO future-tier: needs per-week winPct history.
───────────────────────────────────────────────────────────────── */

function detectFirstAbove500(
  data: CategoryLeagueData,
  context: IssueContext,
): StoryCandidate[] {
  const wk = data.currentWeek
  const out: StoryCandidate[] = []
  const half = Math.floor(data.teams.length / 2)
  if (half < 1) return []

  for (const team of data.teams) {
    const standing = standingFor(data, team.id)
    if (!standing) continue
    // Require they actually be at-or-above .500 currently.
    if (standing.winPct < 0.5) continue

    const current = rankAtWeek(data, team.id, wk)
    if (current == null || current > half) continue

    let priorWeeksSeen = 0
    let everAbove = false
    for (let w = 1; w < wk; w++) {
      const r = rankAtWeek(data, team.id, w)
      if (r == null) continue
      priorWeeksSeen++
      if (r <= half) {
        everAbove = true
        break
      }
    }
    if (priorWeeksSeen === 0 || everAbove) continue

    out.push({
      type: 'first-above-500',
      category: 'standings',
      weight: W.firstAbove500,
      freshness: freshnessForWeekAge(0),
      scope: 'team',
      teamIds: [team.id],
      seasonStages: STAGES_SETTLING_AND_MID,
      context: {
        teamId: team.id,
        winPct: standing.winPct,
        rank: current,
        leagueHalf: half,
      },
      signature: signature(['first-above-500', team.id, context.currentWeek]),
    })
  }

  return out
}

/* ─────────────────────────────────────────────────────────────────
   13. FIRST BELOW .500
   Inverse of first-above-500. Team's winPct just dropped below
   0.5 for the first time all season — proxied by their first
   move from upper-half to lower-half rank.
───────────────────────────────────────────────────────────────── */

function detectFirstBelow500(
  data: CategoryLeagueData,
  context: IssueContext,
): StoryCandidate[] {
  const wk = data.currentWeek
  const out: StoryCandidate[] = []
  const half = Math.floor(data.teams.length / 2)
  if (half < 1) return []

  for (const team of data.teams) {
    const standing = standingFor(data, team.id)
    if (!standing) continue
    if (standing.winPct >= 0.5) continue

    const current = rankAtWeek(data, team.id, wk)
    if (current == null || current <= half) continue

    let priorWeeksSeen = 0
    let everBelow = false
    for (let w = 1; w < wk; w++) {
      const r = rankAtWeek(data, team.id, w)
      if (r == null) continue
      priorWeeksSeen++
      if (r > half) {
        everBelow = true
        break
      }
    }
    if (priorWeeksSeen === 0 || everBelow) continue

    out.push({
      type: 'first-below-500',
      category: 'standings',
      weight: W.firstBelow500,
      freshness: freshnessForWeekAge(0),
      scope: 'team',
      teamIds: [team.id],
      seasonStages: STAGES_SETTLING_AND_MID,
      context: {
        teamId: team.id,
        winPct: standing.winPct,
        rank: current,
        leagueHalf: half,
      },
      signature: signature(['first-below-500', team.id, context.currentWeek]),
    })
  }

  return out
}

/* ─────────────────────────────────────────────────────────────────
   14. DIVISION LEAD CHANGE
   New leader in a division this week. Requires data.divisions and
   per-team divisionId. Compares this-week and last-week division
   leaders (best-ranked team in the division by overall rank).
───────────────────────────────────────────────────────────────── */

function detectDivisionLeadChange(
  data: CategoryLeagueData,
  context: IssueContext,
): StoryCandidate[] {
  if (!data.divisions || data.divisions.length === 0) return []
  const wk = data.currentWeek
  if (wk < 2) return [] // need at least 2 weeks to compare

  const out: StoryCandidate[] = []

  for (const division of data.divisions) {
    const teamsInDivision = data.teams.filter((t) => t.divisionId === division.id)
    if (teamsInDivision.length < 2) continue

    // Find the best-ranked team in this division at the given week.
    const leaderAtWeek = (week: number): string | undefined => {
      let bestRank = Infinity
      let bestTeam: string | undefined
      for (const t of teamsInDivision) {
        const r = rankAtWeek(data, t.id, week)
        if (r == null) continue
        if (r < bestRank) {
          bestRank = r
          bestTeam = t.id
        }
      }
      return bestTeam
    }

    const currentLeader = leaderAtWeek(wk)
    const formerLeader = leaderAtWeek(wk - 1)
    if (!currentLeader || !formerLeader) continue
    if (currentLeader === formerLeader) continue

    const currentRank = rankAtWeek(data, currentLeader, wk)
    const formerRank = rankAtWeek(data, formerLeader, wk)

    out.push({
      type: 'division-lead-change',
      category: 'standings',
      weight: W.divisionLeadChange,
      freshness: freshnessForWeekAge(0),
      scope: 'team',
      teamIds: [currentLeader, formerLeader],
      seasonStages: STAGES_IN_SEASON,
      context: {
        divisionId: division.id,
        divisionName: division.name,
        newLeaderId: currentLeader,
        formerLeaderId: formerLeader,
        newLeaderRank: currentRank,
        formerLeaderRank: formerRank,
      },
      signature: signature([
        'division-lead-change',
        division.id,
        currentLeader,
        context.currentWeek,
      ]),
    })
  }

  return out
}

/* ─────────────────────────────────────────────────────────────────
   15. WILD-CARD SHIFT
   The team holding the cutoff (last playoff) seat changed between
   last week and this week.
───────────────────────────────────────────────────────────────── */

function detectWildCardShift(
  data: CategoryLeagueData,
  context: IssueContext,
): StoryCandidate[] {
  const wk = data.currentWeek
  if (wk < 2) return []

  const currentCutHolder = findTeamAtRank(data, wk, data.playoffCutoff)
  const previousCutHolder = findTeamAtRank(data, wk - 1, data.playoffCutoff)
  if (!currentCutHolder || !previousCutHolder) return []
  if (currentCutHolder === previousCutHolder) return []

  const currentStanding = standingFor(data, currentCutHolder)
  const previousStandingNow = standingFor(data, previousCutHolder)

  return [{
    type: 'wild-card-shift',
    category: 'standings',
    weight: W.wildCardShift,
    freshness: freshnessForWeekAge(0),
    scope: 'matchup',
    teamIds: [currentCutHolder, previousCutHolder],
    seasonStages: STAGES_LATE,
    context: {
      cutoff: data.playoffCutoff,
      newCutHolderId: currentCutHolder,
      formerCutHolderId: previousCutHolder,
      newCutHolderRank: currentStanding?.rank ?? data.playoffCutoff,
      formerCutHolderRank: previousStandingNow?.rank,
    },
    signature: signature([
      'wild-card-shift',
      currentCutHolder,
      previousCutHolder,
      context.currentWeek,
    ]),
  }]
}

/* ─────────────────────────────────────────────────────────────────
   16. THREE-WAY TIE BUBBLE
   3+ teams within 1 cat-win of the bubble line (the cutoff team).
───────────────────────────────────────────────────────────────── */

function detectThreeWayTieBubble(
  data: CategoryLeagueData,
  context: IssueContext,
): StoryCandidate[] {
  const cutTeam = data.standings.find((s) => s.rank === data.playoffCutoff)
  if (!cutTeam) return []

  // Teams within 1 cat-win of the cutoff team (either side). Excludes
  // the cutoff team itself for the threshold check, but includes them
  // in the cluster.
  const cluster = data.standings.filter(
    (s) => Math.abs(s.catWins - cutTeam.catWins) <= 1,
  )
  if (cluster.length < 3) return []

  return [{
    type: 'three-way-tie-bubble',
    category: 'standings',
    weight: W.threeWayTieBubble,
    freshness: freshnessForWeekAge(0),
    scope: 'league',
    teamIds: cluster.map((s) => s.teamId),
    seasonStages: STAGES_LATE,
    context: {
      cutoff: data.playoffCutoff,
      cutTeamId: cutTeam.teamId,
      cutCatWins: cutTeam.catWins,
      clusterSize: cluster.length,
      clusterTeams: cluster.map((s) => ({
        teamId: s.teamId,
        rank: s.rank,
        catWins: s.catWins,
      })),
    },
    signature: signature([
      'three-way-tie-bubble',
      ...cluster.map((s) => s.teamId).sort(),
      context.currentWeek,
    ]),
  }]
}

/* ─────────────────────────────────────────────────────────────────
   17. SPOILER MODE
   Mathematically-eliminated team beat a contender (rank <= cutoff)
   in this week's matchup.
───────────────────────────────────────────────────────────────── */

function detectSpoilerMode(
  data: CategoryLeagueData,
  context: IssueContext,
): StoryCandidate[] {
  const matchups = data.matchupsCurrentWeek
  if (!matchups || matchups.length === 0) return []

  const cutoff = data.playoffCutoff
  const out: StoryCandidate[] = []

  for (const m of matchups) {
    if (m.status !== 'final' && m.status !== 'coasting') continue

    // Determine winner by cat-wins (ties don't count as a beat).
    let winnerId: string | undefined
    let loserId: string | undefined
    if (m.homeCatWins > m.awayCatWins) {
      winnerId = m.homeTeamId
      loserId = m.awayTeamId
    } else if (m.awayCatWins > m.homeCatWins) {
      winnerId = m.awayTeamId
      loserId = m.homeTeamId
    } else {
      continue
    }

    if (!isMathematicallyEliminated(data, winnerId)) continue

    const loserStanding = standingFor(data, loserId)
    if (!loserStanding || loserStanding.rank > cutoff) continue

    const winnerStanding = standingFor(data, winnerId)

    out.push({
      type: 'spoiler-mode',
      category: 'standings',
      weight: W.spoilerMode,
      freshness: freshnessForWeekAge(0),
      scope: 'matchup',
      teamIds: [winnerId, loserId],
      seasonStages: STAGES_FINAL_ONLY,
      context: {
        spoilerTeamId: winnerId,
        contenderTeamId: loserId,
        spoilerRank: winnerStanding?.rank,
        contenderRank: loserStanding.rank,
        catWins: winnerId === m.homeTeamId ? m.homeCatWins : m.awayCatWins,
        opponentCatWins: winnerId === m.homeTeamId ? m.awayCatWins : m.homeCatWins,
      },
      signature: signature(['spoiler-mode', winnerId, loserId, context.currentWeek]),
    })
  }

  return out
}

/* ─────────────────────────────────────────────────────────────────
   18. DETHRONED RIVALRY
   Two teams traded the rank-#1 position within the last 3 weeks.
───────────────────────────────────────────────────────────────── */

function detectDethronedRivalry(
  data: CategoryLeagueData,
  context: IssueContext,
): StoryCandidate[] {
  const wk = data.currentWeek
  if (wk < 3) return []

  // Pull #1 holders for the last 3 weeks (inclusive of current).
  // Need at least one back-and-forth: A->B->A or B->A->B, or 4+ flips.
  const recentLeaders: string[] = []
  for (let w = Math.max(1, wk - 2); w <= wk; w++) {
    const leader = findTeamAtRank(data, w, 1)
    if (leader) recentLeaders.push(leader)
  }
  if (recentLeaders.length < 3) return []

  // Detect a "trade": same pair of teams flip-flopped at least twice.
  // Easiest signal: the set of distinct leaders is exactly 2 AND the
  // sequence shows an alternation (e.g. A,B,A or A,B,A,B).
  const distinct = Array.from(new Set(recentLeaders))
  if (distinct.length !== 2) return []

  // Confirm alternation — no team holds 2-in-a-row.
  let alternates = true
  for (let i = 1; i < recentLeaders.length; i++) {
    if (recentLeaders[i] === recentLeaders[i - 1]) {
      alternates = false
      break
    }
  }
  if (!alternates) return []

  const [teamA, teamB] = distinct
  const currentLeader = recentLeaders[recentLeaders.length - 1]
  const formerLeader = currentLeader === teamA ? teamB : teamA

  return [{
    type: 'dethroned-rivalry',
    category: 'standings',
    weight: W.dethronedRivalry,
    freshness: freshnessForWeekAge(0),
    scope: 'matchup',
    teamIds: [teamA, teamB],
    seasonStages: STAGES_FROM_MIDSEASON,
    context: {
      teamAId: teamA,
      teamBId: teamB,
      currentLeaderId: currentLeader,
      formerLeaderId: formerLeader,
      leadersByWeek: recentLeaders,
      windowWeeks: recentLeaders.length,
    },
    signature: signature([
      'dethroned-rivalry',
      ...[teamA, teamB].sort(),
      context.currentWeek,
    ]),
  }]
}

/* ─────────────────────────────────────────────────────────────────
   ORCHESTRATOR
───────────────────────────────────────────────────────────────── */

/**
 * Standings detection entry point. Runs every per-story-type
 * detector and concatenates the results. Pure: identical inputs
 * always produce identical output.
 */
export function detect(
  data: CategoryLeagueData,
  context: IssueContext,
): StoryCandidate[] {
  return [
    ...detectNewThrone(data, context),
    ...detectDynastyFalling(data, context),
    ...detectHotClimber(data, context),
    ...detectBubbleSurprise(data, context),
    ...detectComebackTeam(data, context),
    ...detectIdentityShift(data, context),
    ...detectNewcomerBreakout(data, context),
    ...detectLockedTopSeed(data, context),
    ...detectMathematicalElimination(data, context),
    ...detectFirstTimePlayoffs(data, context),
    ...detectFirstAbove500(data, context),
    ...detectFirstBelow500(data, context),
    ...detectDivisionLeadChange(data, context),
    ...detectWildCardShift(data, context),
    ...detectThreeWayTieBubble(data, context),
    ...detectSpoilerMode(data, context),
    ...detectDethronedRivalry(data, context),
    // quiet-day runs last because it's the fallback.
    ...detectQuietDay(data, context),
  ]
}
