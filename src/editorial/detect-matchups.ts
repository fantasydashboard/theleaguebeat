/**
 * Story detection engine — Matchups page.
 *
 * Pure functions that read `CategoryLeagueData` (focused on
 * `matchupsCurrentWeek` + `standings` + `categoryRanks` +
 * `seasonRankHistory` + `h2hMatrix`) and emit `StoryCandidate[]`
 * per slot. No rendering, no globals, no I/O. Selection (pick the
 * winner per slot) lives in `render-matchups.ts`.
 *
 * Mirrors the shape of `detect.ts` (Home page detection).
 */

import type {
  CategoryLeagueData,
  CategoryLeagueDataMatchup,
  CategoryLeagueDataCatLine,
  CategoryLeagueDataH2HEntry,
  StoryCandidate,
} from './types.ts'
import type { MatchupsKind, QuickReadKind } from './matchups.ts'

/* ─────────────────────────────────────────────────────────────────
   PER-DETECTOR CONTEXT SHAPES
   These are the data each candidate carries through to render-
   matchups.ts, where they are translated into a `MatchupsContext`.
───────────────────────────────────────────────────────────────── */

/** Hero candidate — one per matchup that fires a hero flavor. */
export interface MatchupHeroDetectionContext {
  matchupId: string
  homeTeamId: string
  awayTeamId: string
  signal: string                  // short debug label
  contestedCount: number
  daysLeftInWeek: number
  homeRank?: number
  awayRank?: number
  isHomeBubble?: boolean
  isAwayBubble?: boolean
  homeWasRecentlyTop?: boolean    // for champ-collapse
  awayWasRecentlyTop?: boolean
  leaderCatWins?: number          // for sweep-in-progress
}

/** What-to-watch candidate — one per matchup × flavor combination. */
export interface MatchupWatchDetectionContext {
  matchupId: string
  homeTeamId: string
  awayTeamId: string
  catId?: string                  // the cat under watch (when applicable)
  teamOnAttack?: 'A' | 'B'        // who's pushing
  gamesLeft: number               // days/games left in the week (proxy)
  signal: string
}

/** Season-series candidate — one per featured matchup × flavor combination. */
export interface MatchupSeriesDetectionContext {
  matchupId: string
  homeTeamId: string
  awayTeamId: string
  allTimeRecord: string           // pre-formatted from H2H entry
  totalMeetings: number
  trend: string                   // "owns 5 of 7" / "even" / "first meeting" / etc.
  signal: string
}

/** Sub-headline candidate — page-level day-anchored copy. */
export interface MatchupSubHeadlineDetectionContext {
  currentDay: 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun'
  liveCount: number
  finalCount: number
  upcomingCount: number
  signal: string
}

/** Quick-read pill candidate. */
export interface MatchupQuickReadDetectionContext {
  pill: QuickReadKind
  matchupId?: string
  teamId?: string
  catId?: string
  label: string                   // pre-formatted compact label
}

/* ─────────────────────────────────────────────────────────────────
   SHARED HELPERS (pure)
───────────────────────────────────────────────────────────────── */

function standingFor(data: CategoryLeagueData, teamId: string) {
  return data.standings.find((s) => s.teamId === teamId)
}

function rankAtWeek(
  data: CategoryLeagueData,
  teamId: string,
  week: number,
): number | undefined {
  const wk = data.seasonRankHistory.find((w) => w.week === week)
  return wk?.ranks[teamId]
}

/** Was this team ranked #1 within the last `lookback` weeks? */
function wasRecentlyTop(
  data: CategoryLeagueData,
  teamId: string,
  lookback: number,
): boolean {
  const wk = data.currentWeek
  for (let w = Math.max(1, wk - lookback); w <= wk; w++) {
    if (rankAtWeek(data, teamId, w) === 1) return true
  }
  return false
}

/** Roughly: how many days are left in the matchup week? Sleeper and
 *  the universal shape both lack an explicit `currentDay`, so the
 *  detector derives it from `new Date()`. The fixture is anchored at
 *  Thursday, so we degrade to a Thursday assumption when the real
 *  date is off-season or test-frozen. */
export function deriveCurrentDay(): MatchupSubHeadlineDetectionContext['currentDay'] {
  const days: MatchupSubHeadlineDetectionContext['currentDay'][] =
    ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const idx = new Date().getDay()
  return days[idx] ?? 'Thu'
}

export function deriveDaysLeftInWeek(today: MatchupSubHeadlineDetectionContext['currentDay']): number {
  // Week ends on Sunday. Days remaining including today.
  const order: MatchupSubHeadlineDetectionContext['currentDay'][] =
    ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const idx = order.indexOf(today)
  return Math.max(0, 6 - idx)
}

/** H2H matrix lookup — entries are alphabetized by teamId pair. Returns
 *  the entry with an `aFirst` flag telling the caller which way the
 *  record is oriented relative to (home, away). */
function h2hLookup(
  data: CategoryLeagueData,
  homeTeamId: string,
  awayTeamId: string,
): { entry: CategoryLeagueDataH2HEntry; homeFirst: boolean } | null {
  if (!data.h2hMatrix) return null
  const [a, b] = [homeTeamId, awayTeamId].sort()
  const entry = data.h2hMatrix.find((e) => e.teamA === a && e.teamB === b)
  if (!entry) return null
  return { entry, homeFirst: entry.teamA === homeTeamId }
}

/** Parse a "W-L" or "W-L-T" record string into [home, away, ties]. */
function parseRecord(record: string): { wins: number; losses: number; ties: number } {
  const parts = record.split('-').map((s) => parseInt(s, 10))
  return {
    wins: Number.isFinite(parts[0]) ? parts[0] : 0,
    losses: Number.isFinite(parts[1]) ? parts[1] : 0,
    ties: Number.isFinite(parts[2]) ? parts[2] : 0,
  }
}

/** Lower-better category set — mirrors the demo modal's convention. */
const LOWER_BETTER = new Set(['ERA', 'WHIP'])

/** Per-cat-line "home has the lead" with awareness of lower-better. */
function homeLeadsCat(line: CategoryLeagueDataCatLine): boolean {
  if (line.homeCurrent === line.awayCurrent) return false
  return LOWER_BETTER.has(line.catId)
    ? line.homeCurrent < line.awayCurrent
    : line.homeCurrent > line.awayCurrent
}

/** Per-cat-line absolute lead margin (always >= 0). */
function catMargin(line: CategoryLeagueDataCatLine): number {
  return Math.abs(line.homeCurrent - line.awayCurrent)
}

/* ─────────────────────────────────────────────────────────────────
   HERO MATCHUP-OF-WEEK DETECTION
───────────────────────────────────────────────────────────────── */

export function detectMatchupHeroes(
  data: CategoryLeagueData,
): Array<StoryCandidate<MatchupsKind, MatchupHeroDetectionContext>> {
  const out: Array<StoryCandidate<MatchupsKind, MatchupHeroDetectionContext>> = []
  const matchups = data.matchupsCurrentWeek ?? []
  if (matchups.length === 0) return out

  const cutoff = data.playoffCutoff
  const today = deriveCurrentDay()
  const daysLeft = deriveDaysLeftInWeek(today)

  for (const m of matchups) {
    const homeStanding = standingFor(data, m.homeTeamId)
    const awayStanding = standingFor(data, m.awayTeamId)
    if (!homeStanding || !awayStanding) continue

    const isHomeBubble = Math.abs(homeStanding.rank - cutoff) <= 1
    const isAwayBubble = Math.abs(awayStanding.rank - cutoff) <= 1
    const homeRecentlyTop = wasRecentlyTop(data, m.homeTeamId, 4)
    const awayRecentlyTop = wasRecentlyTop(data, m.awayTeamId, 4)

    const baseCtx = {
      matchupId: m.id,
      homeTeamId: m.homeTeamId,
      awayTeamId: m.awayTeamId,
      contestedCount: m.contestedCount,
      daysLeftInWeek: daysLeft,
      homeRank: homeStanding.rank,
      awayRank: awayStanding.rank,
      isHomeBubble,
      isAwayBubble,
      homeWasRecentlyTop: homeRecentlyTop,
      awayWasRecentlyTop: awayRecentlyTop,
    }

    /* hero-top-clash — both in standings top-3 */
    if (homeStanding.rank <= 3 && awayStanding.rank <= 3) {
      out.push({
        kind: 'hero-top-clash',
        weight: 90,
        context: {
          ...baseCtx,
          signal: `top-clash: #${homeStanding.rank} vs #${awayStanding.rank}`,
        },
      })
    }

    /* hero-bubble-vs-bubble — both within ±1 of cutoff */
    if (isHomeBubble && isAwayBubble) {
      out.push({
        kind: 'hero-bubble-vs-bubble',
        weight: 75,
        context: {
          ...baseCtx,
          signal: `bubble-vs-bubble: cutoff=${cutoff} #${homeStanding.rank} vs #${awayStanding.rank}`,
        },
      })
    }

    /* hero-champ-collapsing — one team is current rank >= 6 but was
       rank 1 within last 4 weeks. */
    const homeCollapsed = homeStanding.rank >= 6 && homeRecentlyTop
    const awayCollapsed = awayStanding.rank >= 6 && awayRecentlyTop
    if (homeCollapsed || awayCollapsed) {
      out.push({
        kind: 'hero-champ-collapsing',
        weight: 85,
        context: {
          ...baseCtx,
          signal: `champ-collapse: ${homeCollapsed ? m.homeTeamId : m.awayTeamId} fell from #1 within 4w`,
        },
      })
    }

    /* hero-sweep-in-progress — leader has won 8+ cats already. */
    const leaderWins = Math.max(m.homeCatWins, m.awayCatWins)
    if (leaderWins >= 8) {
      out.push({
        kind: 'hero-sweep-in-progress',
        weight: 70,
        context: {
          ...baseCtx,
          leaderCatWins: leaderWins,
          signal: `sweep: ${leaderWins} cats won`,
        },
      })
    }

    /* hero-closest-race — contested >= 4 AND cat-record within 1. */
    const catDiff = Math.abs(m.homeCatWins - m.awayCatWins)
    if (m.contestedCount >= 4 && catDiff <= 1) {
      out.push({
        kind: 'hero-closest-race',
        weight: 60,
        context: {
          ...baseCtx,
          signal: `closest: contested=${m.contestedCount} diff=${catDiff}`,
        },
      })
    }
  }

  return out
}

/* ─────────────────────────────────────────────────────────────────
   SUB-HEADLINE DETECTION (single, day-anchored)
───────────────────────────────────────────────────────────────── */

export function detectMatchupSubHeadline(
  data: CategoryLeagueData,
): Array<StoryCandidate<MatchupsKind, MatchupSubHeadlineDetectionContext>> {
  const matchups = data.matchupsCurrentWeek ?? []
  const liveCount = matchups.filter((m) => m.status === 'live').length
  const finalCount = matchups.filter((m) => m.status === 'final').length
  const upcomingCount = matchups.filter((m) => m.status === 'upcoming').length
  const today = deriveCurrentDay()

  return [{
    kind: 'sub-headline',
    weight: 50,
    context: {
      currentDay: today,
      liveCount,
      finalCount,
      upcomingCount,
      signal: `sub-headline: ${today} live=${liveCount} final=${finalCount} upcoming=${upcomingCount}`,
    },
  }]
}

/* ─────────────────────────────────────────────────────────────────
   WHAT-TO-WATCH DETECTION (per matchup)
───────────────────────────────────────────────────────────────── */

export function detectMatchupWatch(
  data: CategoryLeagueData,
  matchup: CategoryLeagueDataMatchup,
): Array<StoryCandidate<MatchupsKind, MatchupWatchDetectionContext>> {
  const out: Array<StoryCandidate<MatchupsKind, MatchupWatchDetectionContext>> = []
  const today = deriveCurrentDay()
  const daysLeft = deriveDaysLeftInWeek(today)
  const lines = matchup.catLines ?? []

  /* what-to-watch-sweep-alert — matchup is mathematically over.
     Proxy: status === 'final', OR (status === 'coasting' AND leader has
     more cats than the opponent can theoretically catch with remaining
     contested cats). */
  const leaderWins = Math.max(matchup.homeCatWins, matchup.awayCatWins)
  const trailerWins = Math.min(matchup.homeCatWins, matchup.awayCatWins)
  const remaining = matchup.contestedCount
  const isMathematicallyOver =
    matchup.status === 'final' ||
    leaderWins - trailerWins > remaining
  if (isMathematicallyOver) {
    out.push({
      kind: 'what-to-watch-sweep-alert',
      weight: 95,                    // strongest — eclipses other watch flavors
      context: {
        matchupId: matchup.id,
        homeTeamId: matchup.homeTeamId,
        awayTeamId: matchup.awayTeamId,
        gamesLeft: daysLeft,
        teamOnAttack: matchup.homeCatWins >= matchup.awayCatWins ? 'A' : 'B',
        signal: `sweep-alert: ${leaderWins}-${trailerWins}, ${remaining} remaining`,
      },
    })
  }

  /* what-to-watch-flip — a contested cat with margin within 1.
     Pick the tightest contested cat that's close to flipping. */
  const contestedLines = lines.filter((l) => l.status === 'contested')
  const flipCandidates = contestedLines
    .map((l) => ({ line: l, margin: catMargin(l) }))
    .filter((x) => x.margin <= 1)
    .sort((a, b) => a.margin - b.margin)
  if (flipCandidates.length > 0) {
    const best = flipCandidates[0]
    out.push({
      kind: 'what-to-watch-flip',
      weight: 80,
      context: {
        matchupId: matchup.id,
        homeTeamId: matchup.homeTeamId,
        awayTeamId: matchup.awayTeamId,
        catId: best.line.catId,
        teamOnAttack: homeLeadsCat(best.line) ? 'A' : 'B',
        gamesLeft: daysLeft,
        signal: `flip: ${best.line.catId} margin=${best.margin}`,
      },
    })
  }

  /* what-to-watch-lock — a leading cat with a margin large enough that
     it's about to lock. Proxy: contested cat whose margin >= 3 and the
     team in front is the one pushing it. */
  const lockCandidates = contestedLines
    .map((l) => ({ line: l, margin: catMargin(l) }))
    .filter((x) => x.margin >= 3)
    .sort((a, b) => b.margin - a.margin)
  if (lockCandidates.length > 0) {
    const best = lockCandidates[0]
    out.push({
      kind: 'what-to-watch-lock',
      weight: 70,
      context: {
        matchupId: matchup.id,
        homeTeamId: matchup.homeTeamId,
        awayTeamId: matchup.awayTeamId,
        catId: best.line.catId,
        teamOnAttack: homeLeadsCat(best.line) ? 'A' : 'B',
        gamesLeft: daysLeft,
        signal: `lock: ${best.line.catId} margin=${best.margin}`,
      },
    })
  }

  /* what-to-watch-punt — a team has stopped contesting a cat. */
  const puntLine = lines.find(
    (l) => l.status === 'punted-home' || l.status === 'punted-away',
  )
  if (puntLine) {
    // The team that's NOT punting is the one "on attack" (they own the cat).
    const teamOnAttack: 'A' | 'B' = puntLine.status === 'punted-home' ? 'B' : 'A'
    out.push({
      kind: 'what-to-watch-punt',
      weight: 65,
      context: {
        matchupId: matchup.id,
        homeTeamId: matchup.homeTeamId,
        awayTeamId: matchup.awayTeamId,
        catId: puntLine.catId,
        teamOnAttack,
        gamesLeft: daysLeft,
        signal: `punt: ${puntLine.catId} ${puntLine.status}`,
      },
    })
  }

  return out
}

/* ─────────────────────────────────────────────────────────────────
   SEASON-SERIES DETECTION (per matchup, from h2hMatrix)
───────────────────────────────────────────────────────────────── */

export function detectMatchupSeries(
  data: CategoryLeagueData,
  matchup: CategoryLeagueDataMatchup,
): Array<StoryCandidate<MatchupsKind, MatchupSeriesDetectionContext>> {
  const out: Array<StoryCandidate<MatchupsKind, MatchupSeriesDetectionContext>> = []
  const lookup = h2hLookup(data, matchup.homeTeamId, matchup.awayTeamId)

  /* season-series-first-meeting — no prior meetings in h2hMatrix. */
  if (!lookup || lookup.entry.meetings === 0) {
    out.push({
      kind: 'season-series-first-meeting',
      weight: 60,
      context: {
        matchupId: matchup.id,
        homeTeamId: matchup.homeTeamId,
        awayTeamId: matchup.awayTeamId,
        allTimeRecord: '0-0',
        totalMeetings: 0,
        trend: 'First meeting',
        signal: 'series-first-meeting',
      },
    })
    return out
  }

  const { entry, homeFirst } = lookup
  const fromHome = parseRecord(entry.recordA)
  const homeWins = homeFirst ? fromHome.wins : fromHome.losses
  const awayWins = homeFirst ? fromHome.losses : fromHome.wins
  const ties = fromHome.ties
  const meetings = entry.meetings
  const decisive = homeWins + awayWins                       // exclude ties
  const homeShare = decisive > 0 ? homeWins / decisive : 0
  const awayShare = decisive > 0 ? awayWins / decisive : 0

  /* season-series-one-sided — one team has won >= 70% of past meetings. */
  if (decisive >= 3 && (homeShare >= 0.7 || awayShare >= 0.7)) {
    const dominantHome = homeShare >= 0.7
    const dominantWins = dominantHome ? homeWins : awayWins
    const losersWins = dominantHome ? awayWins : homeWins
    const trend = `${dominantHome ? 'Home' : 'Away'} team owns ${dominantWins} of ${meetings}`
    out.push({
      kind: 'season-series-one-sided',
      weight: 75,
      context: {
        matchupId: matchup.id,
        homeTeamId: matchup.homeTeamId,
        awayTeamId: matchup.awayTeamId,
        allTimeRecord: `${dominantWins}-${losersWins}${ties ? `-${ties}` : ''}`,
        totalMeetings: meetings,
        trend,
        signal: `series-one-sided: ${dominantHome ? 'home' : 'away'} ${dominantWins}/${meetings}`,
      },
    })
  }

  /* season-series-even — within 1 of 50/50. */
  if (meetings >= 2 && Math.abs(homeWins - awayWins) <= 1) {
    out.push({
      kind: 'season-series-even',
      weight: 55,
      context: {
        matchupId: matchup.id,
        homeTeamId: matchup.homeTeamId,
        awayTeamId: matchup.awayTeamId,
        allTimeRecord: `${homeWins}-${awayWins}${ties ? `-${ties}` : ''}`,
        totalMeetings: meetings,
        trend: 'Series even',
        signal: `series-even: ${homeWins}-${awayWins}`,
      },
    })
  }

  /* season-series-recent-reversal — heuristic: when the all-time
     record is one-sided BUT the trailing team is the one currently
     ranked higher. Without explicit per-meeting chronology in
     h2hMatrix, this is the best signal: the underdog by record is
     the team showing better current form. */
  if (decisive >= 3 && (homeShare >= 0.65 || awayShare >= 0.65)) {
    const historicalLeader = homeShare >= 0.65 ? 'home' : 'away'
    const homeStanding = standingFor(data, matchup.homeTeamId)
    const awayStanding = standingFor(data, matchup.awayTeamId)
    if (homeStanding && awayStanding) {
      const currentLeader = homeStanding.rank < awayStanding.rank ? 'home' : 'away'
      if (historicalLeader !== currentLeader) {
        out.push({
          kind: 'season-series-recent-reversal',
          weight: 70,
          context: {
            matchupId: matchup.id,
            homeTeamId: matchup.homeTeamId,
            awayTeamId: matchup.awayTeamId,
            allTimeRecord: `${homeWins}-${awayWins}${ties ? `-${ties}` : ''}`,
            totalMeetings: meetings,
            trend: `Underdog ${currentLeader === 'home' ? 'home' : 'away'} flipping the script`,
            signal: `series-reversal: historical=${historicalLeader} current=${currentLeader}`,
          },
        })
      }
    }
  }

  return out
}

/* ─────────────────────────────────────────────────────────────────
   QUICK-READ DETECTION (4 pills)
───────────────────────────────────────────────────────────────── */

export function detectMatchupQuickReads(
  data: CategoryLeagueData,
): Array<StoryCandidate<MatchupsKind, MatchupQuickReadDetectionContext>> {
  const out: Array<StoryCandidate<MatchupsKind, MatchupQuickReadDetectionContext>> = []
  const matchups = data.matchupsCurrentWeek ?? []
  if (matchups.length === 0) return out

  const cutoff = data.playoffCutoff

  /* tightest-race-today — smallest cat-record gap among live or
     coasting matchups. Ties broken by higher contested count. */
  const liveOrCoasting = matchups.filter(
    (m) => m.status === 'live' || m.status === 'coasting',
  )
  const tightest = [...liveOrCoasting].sort((a, b) => {
    const gapA = Math.abs(a.homeCatWins - a.awayCatWins)
    const gapB = Math.abs(b.homeCatWins - b.awayCatWins)
    if (gapA !== gapB) return gapA - gapB
    return b.contestedCount - a.contestedCount
  })[0]
  if (tightest) {
    out.push({
      kind: 'quick-read',
      weight: 50,
      context: {
        pill: 'tightest-race-today',
        matchupId: tightest.id,
        label: `${labelTeams(data, tightest)} · ${tightest.homeCatWins}-${tightest.awayCatWins} with ${tightest.contestedCount} contested.`,
      },
    })
  }

  /* biggest-sweep — biggest cat-record gap. */
  const biggestSweep = [...matchups].sort((a, b) => {
    const gapA = Math.abs(a.homeCatWins - a.awayCatWins)
    const gapB = Math.abs(b.homeCatWins - b.awayCatWins)
    return gapB - gapA
  })[0]
  if (biggestSweep) {
    const leaderId = biggestSweep.homeCatWins >= biggestSweep.awayCatWins
      ? biggestSweep.homeTeamId
      : biggestSweep.awayTeamId
    const leaderTeam = data.teams.find((t) => t.id === leaderId)
    const leaderName = leaderTeam?.name ?? leaderId
    const leaderWins = Math.max(biggestSweep.homeCatWins, biggestSweep.awayCatWins)
    const trailerWins = Math.min(biggestSweep.homeCatWins, biggestSweep.awayCatWins)
    out.push({
      kind: 'quick-read',
      weight: 50,
      context: {
        pill: 'biggest-sweep',
        matchupId: biggestSweep.id,
        teamId: leaderId,
        label: `${leaderName}. ${leaderWins}-${trailerWins} sweep watch.`,
      },
    })
  }

  /* bubble-watch-matchup — matchup involving the bubble team
     (cutoff or cutoff+1). Prefer matchups where BOTH teams are
     near the bubble. */
  const bubbleTeamIds = new Set(
    data.standings
      .filter((s) => Math.abs(s.rank - cutoff) <= 1)
      .map((s) => s.teamId),
  )
  const bubbleMatchups = matchups
    .map((m) => {
      const homeIn = bubbleTeamIds.has(m.homeTeamId)
      const awayIn = bubbleTeamIds.has(m.awayTeamId)
      return { m, score: (homeIn ? 1 : 0) + (awayIn ? 1 : 0) }
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
  const bubble = bubbleMatchups[0]?.m
  if (bubble) {
    out.push({
      kind: 'quick-read',
      weight: 50,
      context: {
        pill: 'bubble-watch-matchup',
        matchupId: bubble.id,
        label: `${labelTeams(data, bubble)}. Winner stays above the line.`,
      },
    })
  }

  /* biggest-punt — team conceding the most cats this week.
     We scan catLines for 'punted-home' / 'punted-away' counts per team. */
  const puntCountsByTeam = new Map<string, { count: number; cats: string[]; matchupId: string }>()
  for (const m of matchups) {
    if (!m.catLines) continue
    for (const line of m.catLines) {
      if (line.status === 'punted-home') {
        const key = m.homeTeamId
        const cur = puntCountsByTeam.get(key) ?? { count: 0, cats: [], matchupId: m.id }
        cur.count += 1
        cur.cats.push(line.catId)
        cur.matchupId = m.id
        puntCountsByTeam.set(key, cur)
      } else if (line.status === 'punted-away') {
        const key = m.awayTeamId
        const cur = puntCountsByTeam.get(key) ?? { count: 0, cats: [], matchupId: m.id }
        cur.count += 1
        cur.cats.push(line.catId)
        cur.matchupId = m.id
        puntCountsByTeam.set(key, cur)
      }
    }
  }
  const punted = [...puntCountsByTeam.entries()].sort((a, b) => b[1].count - a[1].count)[0]
  if (punted && punted[1].count > 0) {
    const [teamId, info] = punted
    const team = data.teams.find((t) => t.id === teamId)
    const teamName = team?.name ?? teamId
    out.push({
      kind: 'quick-read',
      weight: 50,
      context: {
        pill: 'biggest-punt',
        matchupId: info.matchupId,
        teamId,
        catId: info.cats[0],
        label: `${teamName}. Conceding ${info.count} ${info.count === 1 ? 'cat' : 'cats'}.`,
      },
    })
  }

  return out
}

function labelTeams(data: CategoryLeagueData, matchup: CategoryLeagueDataMatchup): string {
  const home = data.teams.find((t) => t.id === matchup.homeTeamId)?.id ?? matchup.homeTeamId
  const away = data.teams.find((t) => t.id === matchup.awayTeamId)?.id ?? matchup.awayTeamId
  return `${home} vs ${away}`
}
