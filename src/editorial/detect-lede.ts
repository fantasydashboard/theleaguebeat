/**
 * THE LEDE detector — scores every Kind candidate for the day's
 * league state and returns ranked candidates. Renderer takes the
 * winner.
 *
 * Scoring is base-weight + day-of-week bias + freshness multipliers.
 * The lower the winning weight, the quieter the day editorially —
 * past a floor we fall through to lede-quiet-day so the column
 * always has SOMETHING (no empty hero on dry days).
 */

import type {
  CategoryLeagueData,
  CategoryLeagueDataStanding,
  CategoryLeagueDataMatchup,
  StoryCandidate,
} from './types.ts'
import {
  weeksRemaining,
  isMathematicallyEliminated,
  isLockedIntoCut,
} from './detection/helpers.ts'
import type {
  LedeKind,
  LedeContext,
  LedeTeamSnapshot,
  LedeMatchupSnapshot,
  LedeDayBucket,
} from './lede.ts'

/* ─────────────────────────────────────────────────────────────────
   DAY HELPER (shared shape with detect-matchups)
───────────────────────────────────────────────────────────────── */

function deriveCurrentDay(now: Date = new Date()): LedeDayBucket {
  const dow = now.getDay()   // 0=Sun..6=Sat
  const names: LedeDayBucket[] = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  return names[dow]
}

function deriveDaysLeftInWeek(today: LedeDayBucket): number {
  const i = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].indexOf(today)
  return 7 - i   // Mon=7..Sun=1
}

/* ─────────────────────────────────────────────────────────────────
   TEAM SNAPSHOT BUILDER
───────────────────────────────────────────────────────────────── */

/** Strip emojis from team names for editorial copy. The standings,
 *  ON YOUR LINE strip, and Wire cards keep the original team name
 *  (the emoji is the user's team identity). THE LEDE doesn't — a
 *  magazine column reads as "Jazz on my TittyWittys is on a 10-game
 *  heater" not "🔥 Jazz on my TittyWittys is on a 10-game heater."
 *
 *  Uses the Unicode `Extended_Pictographic` property to catch all
 *  emoji code points, plus variation selectors (U+FE0F) and
 *  zero-width joiners (U+200D) for compound emoji sequences. */
export function stripEmojiForEditorial(name: string): string {
  return name
    .replace(/[\p{Extended_Pictographic}\u{FE0F}\u{200D}]+/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function buildTeamSnapshot(
  data: CategoryLeagueData,
  standing: CategoryLeagueDataStanding,
): LedeTeamSnapshot {
  const team = data.teams.find((t) => t.id === standing.teamId)
  const rawName = team?.name ?? `Team ${standing.teamId}`
  return {
    id: standing.teamId,
    name: stripEmojiForEditorial(rawName) || rawName,
    rank: standing.rank,
    catRecord: standing.catTies > 0
      ? `${standing.catWins}-${standing.catLosses}-${standing.catTies}`
      : `${standing.catWins}-${standing.catLosses}`,
    winPctSeason: standing.winPct,
    streakType: standing.streak.type,
    streakLength: standing.streak.length,
    // Defending champ inferred from seasonHistory when present.
    isDefendingChamp: data.seasonHistory?.some(
      (s) => s.championTeamId === standing.teamId &&
             s.year === data.currentSeason - 1,
    ),
    // Visual identity — feeds the inline avatar in THE LEDE column.
    // All three fields are best-effort: adapters populate them when
    // the platform provides data, the rendering layer handles missing
    // values by falling back to a colored block + initials.
    avatarUrl: team?.avatarUrl,
    avatarColor: team?.avatarColor,
    ownerInitials: team?.ownerInitials,
  }
}

function buildMatchupSnapshot(
  data: CategoryLeagueData,
  m: CategoryLeagueDataMatchup,
): LedeMatchupSnapshot {
  const home = data.teams.find((t) => t.id === m.homeTeamId)
  const away = data.teams.find((t) => t.id === m.awayTeamId)
  const rawHome = home?.name ?? `Team ${m.homeTeamId}`
  const rawAway = away?.name ?? `Team ${m.awayTeamId}`
  return {
    matchupId: m.id,
    homeTeamId: m.homeTeamId,
    awayTeamId: m.awayTeamId,
    homeName: stripEmojiForEditorial(rawHome) || rawHome,
    awayName: stripEmojiForEditorial(rawAway) || rawAway,
    homeCatWins: m.homeCatWins,
    awayCatWins: m.awayCatWins,
    contestedCount: m.contestedCount,
    homeWinProb: m.homeWinProb,
    awayWinProb: m.awayWinProb,
  }
}

/* ─────────────────────────────────────────────────────────────────
   STREAK-WATCH DETECTION
───────────────────────────────────────────────────────────────── */

function detectStreakWatch(
  data: CategoryLeagueData,
): StoryCandidate<LedeKind, LedeContext> | null {
  // Find the longest active winning streak. Lose-streaks are picked
  // only when no win streak is loud enough.
  const standings = data.standings
  if (standings.length === 0) return null

  const longestWin = [...standings]
    .filter((s) => s.streak.type === 'W')
    .sort((a, b) => b.streak.length - a.streak.length)[0]

  const longestLoss = [...standings]
    .filter((s) => s.streak.type === 'L')
    .sort((a, b) => b.streak.length - a.streak.length)[0]

  // Pick the more noteworthy streak. Win streaks weight higher than
  // losing streaks at equal length — winning is the louder magazine
  // story.
  let subject: CategoryLeagueDataStanding | null = null
  let streakScore = 0
  if (longestWin && longestWin.streak.length >= 5) {
    subject = longestWin
    streakScore = 50 + longestWin.streak.length * 5
  }
  if (longestLoss && longestLoss.streak.length >= 5) {
    const lossScore = 40 + longestLoss.streak.length * 4
    if (lossScore > streakScore) {
      subject = longestLoss
      streakScore = lossScore
    }
  }
  if (!subject) return null

  // Build the context for the renderer.
  const today = deriveCurrentDay()
  const daysLeft = deriveDaysLeftInWeek(today)

  const subjectSnapshot = buildTeamSnapshot(data, subject)
  const subjectMatchup = (data.matchupsCurrentWeek ?? []).find(
    (m) => m.homeTeamId === subject!.teamId || m.awayTeamId === subject!.teamId,
  )
  const matchupSnapshot = subjectMatchup
    ? buildMatchupSnapshot(data, subjectMatchup)
    : undefined

  // Foil = the opponent in the matchup if they're also on a streak.
  let foilSnapshot: LedeTeamSnapshot | undefined
  if (subjectMatchup) {
    const foilTeamId = subjectMatchup.homeTeamId === subject.teamId
      ? subjectMatchup.awayTeamId
      : subjectMatchup.homeTeamId
    const foilStanding = data.standings.find((s) => s.teamId === foilTeamId)
    if (foilStanding && foilStanding.streak.length >= 2) {
      foilSnapshot = buildTeamSnapshot(data, foilStanding)
    }
  }

  // Streak meta — longest-active + season-high are the two flags
  // that unlock the loudest variants ("longest active in the league").
  // Also expose the SECOND-best streak length so body/headline copy
  // can name the comparison ("nobody else has more than 3") instead
  // of leaning on vague intensifiers.
  const allStreakLengths = data.standings
    .filter((s) => s.streak.type === subject!.streak.type && s.teamId !== subject!.teamId)
    .map((s) => s.streak.length)
  const subjectStreakLen = subject.streak.length
  const isLongestActive = subjectStreakLen >= Math.max(subjectStreakLen, ...allStreakLengths)
  const nextLongestSameType = allStreakLengths.length > 0
    ? Math.max(...allStreakLengths)
    : undefined

  // Standings gap to second — only when the subject is the #1 seed,
  // since the "16 games clear" framing only fits the leader. Uses
  // the standard games-back formula on cat W-L.
  let gamesAheadOfSecond: number | undefined
  if (subject.rank === 1 && data.standings.length >= 2) {
    const second = data.standings.find((s) => s.rank === 2)
    if (second) {
      gamesAheadOfSecond = Math.round(
        ((subject.catWins - second.catWins) + (second.catLosses - subject.catLosses)) / 2,
      )
    }
  }

  const context: LedeContext = {
    currentDay: today,
    currentWeek: data.currentWeek,
    daysLeftInWeek: daysLeft,
    subject: subjectSnapshot,
    subjectMatchup: matchupSnapshot,
    foil: foilSnapshot,
    foilMatchup: matchupSnapshot,
    totalTeams: data.teams.length,
    playoffCutoff: data.playoffCutoff,
    streak: {
      length: subject.streak.length,
      isLongestActive,
      isSeasonHigh: false,   // requires seasonRankHistory inspection; deferred
      nextLongestSameType,
    },
    standings: {
      gamesAheadOfSecond,
    },
  }

  return {
    kind: 'lede-streak-watch',
    weight: streakScore,
    context,
  }
}

/* ─────────────────────────────────────────────────────────────────
   SWEEP-IN-PROGRESS DETECTION

   Fires when a current-week matchup is mathematically locked or
   carrying a sweep-style margin. Two qualifying shapes:
     1. LOCKED — leader.catWins > trailer.catWins + contestedCount.
        The trailer can't catch up even if they win every remaining
        cat. Strongest editorial signal.
     2. HEADING — leader.catWins - trailer.catWins >= 5 AND
        contestedCount > 0. Not strictly closed, but the margin is
        sweep-shaped. Lower weight.

   Day-of-week bias matters: a sweep called Monday is suspicious
   (the week barely started), one called Thursday-Friday is the
   peak landing for the framing. Sundays the news is already known.
───────────────────────────────────────────────────────────────── */

const SWEEP_DAY_BIAS: Record<LedeDayBucket, number> = {
  Mon: -25,   // too early, half-day-old box scores
  Tue:  -5,
  Wed:  10,
  Thu:  20,   // peak "week called early" landing
  Fri:  15,
  Sat:   5,
  Sun: -10,   // results essentially decided across the league
}

function detectSweepInProgress(
  data: CategoryLeagueData,
): StoryCandidate<LedeKind, LedeContext> | null {
  const matchups = data.matchupsCurrentWeek ?? []
  if (matchups.length === 0) return null

  // Score every matchup, pick the loudest. We don't emit multiple
  // sweep candidates — the Lede surfaces one per day, and the
  // loudest lock wins.
  let bestCandidate: {
    matchup: CategoryLeagueDataMatchup
    leaderId: string
    trailerId: string
    leaderCatWins: number
    trailerCatWins: number
    margin: number
    isLocked: boolean
    score: number
  } | null = null

  for (const m of matchups) {
    if (m.status === 'final') continue   // already over — not a lede
    const homeAhead = m.homeCatWins > m.awayCatWins
    const tied = m.homeCatWins === m.awayCatWins
    if (tied) continue
    const leaderCatWins = homeAhead ? m.homeCatWins : m.awayCatWins
    const trailerCatWins = homeAhead ? m.awayCatWins : m.homeCatWins
    const leaderId = homeAhead ? m.homeTeamId : m.awayTeamId
    const trailerId = homeAhead ? m.awayTeamId : m.homeTeamId
    const margin = leaderCatWins - trailerCatWins
    const isLocked = leaderCatWins > trailerCatWins + m.contestedCount
    const heading = !isLocked && margin >= 5 && m.contestedCount > 0
    if (!isLocked && !heading) continue

    // Score: locks are louder than headings. Rank of the involved
    // teams adjusts the volume — top-of-table teams produce louder
    // stories than basement matchups.
    let score = isLocked ? 75 : 55
    const leaderStanding = data.standings.find((s) => s.teamId === leaderId)
    const trailerStanding = data.standings.find((s) => s.teamId === trailerId)
    if (leaderStanding && leaderStanding.rank <= 3) score += 8
    if (trailerStanding && trailerStanding.rank <= 3) score += 6
    if (margin >= 7) score += 6   // blowout flavor
    if (m.contestedCount === 0) score += 4  // every cat decided

    if (!bestCandidate || score > bestCandidate.score) {
      bestCandidate = {
        matchup: m,
        leaderId,
        trailerId,
        leaderCatWins,
        trailerCatWins,
        margin,
        isLocked,
        score,
      }
    }
  }

  if (!bestCandidate) return null

  const today = deriveCurrentDay()
  const dayBias = SWEEP_DAY_BIAS[today] ?? 0
  const finalScore = bestCandidate.score + dayBias
  // Floor — Monday locks rarely beat a real streak-watch and we'd
  // rather a quiet day fall back to streak-watch than ship a Lede
  // that reads as premature.
  if (finalScore < 35) return null

  const leaderStanding = data.standings.find((s) => s.teamId === bestCandidate!.leaderId)
  const trailerStanding = data.standings.find((s) => s.teamId === bestCandidate!.trailerId)
  if (!leaderStanding || !trailerStanding) return null

  const subjectSnapshot = buildTeamSnapshot(data, leaderStanding)
  const foilSnapshot = buildTeamSnapshot(data, trailerStanding)
  const matchupSnapshot = buildMatchupSnapshot(data, bestCandidate.matchup)

  const context: LedeContext = {
    currentDay: today,
    currentWeek: data.currentWeek,
    daysLeftInWeek: deriveDaysLeftInWeek(today),
    subject: subjectSnapshot,
    subjectMatchup: matchupSnapshot,
    foil: foilSnapshot,
    foilMatchup: matchupSnapshot,
    totalTeams: data.teams.length,
    playoffCutoff: data.playoffCutoff,
    sweep: {
      leaderCatWins: bestCandidate.leaderCatWins,
      trailerCatWins: bestCandidate.trailerCatWins,
      contestedCount: bestCandidate.matchup.contestedCount,
      isFunctionallyOver: bestCandidate.isLocked,
    },
  }

  return {
    kind: 'lede-sweep-in-progress',
    weight: finalScore,
    context,
  }
}

/* ─────────────────────────────────────────────────────────────────
   BUBBLE-DRAMA DETECTION

   Fires when playoff-line teams are in motion. Three triggering
   shapes, ranked loudest to quietest:
     1. MATCHUP   — a bubble-vs-bubble draw this week (the matchup
                    itself decides who's inside the cut). Base 70.
     2. CROSSING  — a team crossed the cutoff overnight (snapshot
                    delta). Base 65.
     3. STANDING  — no acute trigger, just tight bubble pressure.
                    Base 50.

   Week-of-season modulates everything: bubble framing is premature
   when weeks remaining > 12 (the math doesn't matter yet) and most
   relevant when weeks remaining ≤ 7 (the homestretch).
───────────────────────────────────────────────────────────────── */

const BUBBLE_DAY_BIAS: Record<LedeDayBucket, number> = {
  Mon: -5,
  Tue:  0,
  Wed:  5,
  Thu: 10,
  Fri: 15,
  Sat: 20,    // weekend's the playoff-talk peak
  Sun: 20,
}

/** Weight contribution from weeks-remaining. The closer to the
 *  finish line, the louder a bubble story is. >12 weeks left = too
 *  early, return null to skip the candidate. */
function weeksRemainingBonus(weeks: number): number | null {
  if (weeks <= 0) return null   // playoffs already / season over
  if (weeks <= 3) return 25     // crunch time
  if (weeks <= 7) return 15     // homestretch
  if (weeks <= 12) return 5     // mid-season pressure starting
  return null                    // too early for bubble framing
}

function detectBubbleDrama(
  data: CategoryLeagueData,
): StoryCandidate<LedeKind, LedeContext> | null {
  const cutoff = data.playoffCutoff
  if (!cutoff || cutoff < 2) return null

  const remaining = weeksRemaining(data.currentWeek, data.regularSeasonEndWeek)
  const weeksBonus = weeksRemainingBonus(remaining)
  if (weeksBonus === null) return null

  // Identify the bubble band: rank within 2 of cutoff AND not
  // mathematically locked-in / eliminated. The math helpers handle
  // the "clinched" / "out" cases; we only fire for teams that can
  // still move.
  const bubbleTeams = data.standings.filter((s) => {
    const dist = s.rank - cutoff   // negative = above, positive = below
    if (Math.abs(dist) > 2) return false
    if (isMathematicallyEliminated(data, s.teamId)) return false
    if (isLockedIntoCut(data, s.teamId)) return false
    return true
  })
  if (bubbleTeams.length === 0) return null

  const bubbleIds = new Set(bubbleTeams.map((t) => t.teamId))
  const matchups = data.matchupsCurrentWeek ?? []

  // Triggering shape #1: bubble-vs-bubble matchup this week.
  const bubbleMatchup = matchups.find(
    (m) => m.status !== 'final' && bubbleIds.has(m.homeTeamId) && bubbleIds.has(m.awayTeamId),
  )

  // Triggering shape #2: an overnight rank shift across the line.
  const crossings = (data.snapshotDelta?.rankShifts ?? []).filter((r) => {
    const prev = r.previousRank
    const now = r.currentRank
    return (prev <= cutoff && now > cutoff) || (prev > cutoff && now <= cutoff)
  })

  // Pick the framing. Loudest first.
  let subject: CategoryLeagueDataStanding | undefined
  let foil: CategoryLeagueDataStanding | undefined
  let subjectMatchup: CategoryLeagueDataMatchup | undefined
  let framing: 'matchup' | 'crossing' | 'standing'
  let baseScore: number

  if (bubbleMatchup) {
    const home = data.standings.find((s) => s.teamId === bubbleMatchup.homeTeamId)
    const away = data.standings.find((s) => s.teamId === bubbleMatchup.awayTeamId)
    if (!home || !away) return null
    const homeHigher = home.rank < away.rank
    subject = homeHigher ? home : away
    foil = homeHigher ? away : home
    subjectMatchup = bubbleMatchup
    framing = 'matchup'
    baseScore = 70
  } else if (crossings.length > 0) {
    // Most recent crossing — `rankShifts` is generally newest first
    // but we don't trust order, so pick the largest-magnitude one.
    const biggest = [...crossings].sort(
      (a, b) => Math.abs(b.delta) - Math.abs(a.delta),
    )[0]
    const crossed = data.standings.find((s) => s.teamId === biggest.teamId)
    if (!crossed) return null
    subject = crossed
    framing = 'crossing'
    baseScore = 65
  } else {
    // Pure standings pressure — pick the team closest to the cut as
    // the subject. Tie-breaker: above the line (clinging to seat)
    // before below (chasing back in) — the "defending it" angle is
    // slightly louder than the "chasing it" angle.
    const sorted = [...bubbleTeams].sort((a, b) => {
      const distA = Math.abs(a.rank - cutoff)
      const distB = Math.abs(b.rank - cutoff)
      if (distA !== distB) return distA - distB
      return (a.rank - cutoff) - (b.rank - cutoff)   // above before below
    })
    subject = sorted[0]
    framing = 'standing'
    baseScore = 50
  }

  if (!subject) return null

  // Score the candidate.
  let score = baseScore + weeksBonus
  if (bubbleTeams.length >= 3) score += 8
  if (bubbleTeams.length >= 4) score += 4   // log-jam flavor

  const today = deriveCurrentDay()
  const dayBias = BUBBLE_DAY_BIAS[today] ?? 0
  const finalScore = score + dayBias

  // Floor — quiet-day fallback should beat a too-early bubble pick.
  if (finalScore < 40) return null

  const subjectSnapshot = buildTeamSnapshot(data, subject)
  const foilSnapshot = foil ? buildTeamSnapshot(data, foil) : undefined
  const matchupSnapshot = subjectMatchup ? buildMatchupSnapshot(data, subjectMatchup) : undefined
  const subjectDistance = subject.rank - cutoff
  // Negate so positive = above the line (in the cut), negative = below.
  const subjectDistanceToLine = -subjectDistance

  const context: LedeContext = {
    currentDay: today,
    currentWeek: data.currentWeek,
    daysLeftInWeek: deriveDaysLeftInWeek(today),
    subject: subjectSnapshot,
    subjectMatchup: matchupSnapshot,
    foil: foilSnapshot,
    foilMatchup: matchupSnapshot,
    totalTeams: data.teams.length,
    playoffCutoff: cutoff,
    weeksRemaining: remaining,
    bubble: {
      subjectDistanceToLine,
      bubbleTeamCount: bubbleTeams.length,
      framing,
    },
  }

  return {
    kind: 'lede-bubble-drama',
    weight: finalScore,
    context,
  }
}

/* ─────────────────────────────────────────────────────────────────
   QUIET-DAY DETECTION

   The honest floor. Always returns a candidate at weight 35 — high
   enough to clear renderLede's fact-gating fallthrough, low enough
   that any real Kind beats it. Picks #1 team as the nominal subject
   since the body never references the subject name.

   The point of this Kind: never let THE LEDE render null. A blank
   column on a slow day reads as broken; an honest "nothing dramatic
   today" column reads as edited.
───────────────────────────────────────────────────────────────── */

function detectQuietDay(
  data: CategoryLeagueData,
): StoryCandidate<LedeKind, LedeContext> | null {
  // Need at least one team to build a subject snapshot, even a
  // nominal one. Below 1 team the league hasn't started.
  if (data.standings.length === 0) return null
  // Pick #1 team as nominal subject. Body variants don't reference
  // the subject name; this is just to satisfy the context shape.
  const nominalSubject = data.standings.find((s) => s.rank === 1) ?? data.standings[0]
  const today = deriveCurrentDay()
  const remaining = weeksRemaining(data.currentWeek, data.regularSeasonEndWeek)

  return {
    kind: 'lede-quiet-day',
    weight: 35,
    context: {
      currentDay: today,
      currentWeek: data.currentWeek,
      daysLeftInWeek: deriveDaysLeftInWeek(today),
      subject: buildTeamSnapshot(data, nominalSubject),
      totalTeams: data.teams.length,
      playoffCutoff: data.playoffCutoff,
      weeksRemaining: remaining,
    },
  }
}

/* ─────────────────────────────────────────────────────────────────
   PUBLIC ENTRY — score every Kind, return ranked candidates
───────────────────────────────────────────────────────────────── */

/** Score every Lede Kind and return ranked candidates. Caller (the
 *  render-lede pipeline) takes the winner. Day-of-week bias is
 *  applied per-Kind inside the detector functions; this entry point
 *  just collects them. */
export function detectLedeCandidates(
  data: CategoryLeagueData,
): Array<StoryCandidate<LedeKind, LedeContext>> {
  const out: Array<StoryCandidate<LedeKind, LedeContext>> = []
  const streak = detectStreakWatch(data)
  if (streak) out.push(streak)
  const sweep = detectSweepInProgress(data)
  if (sweep) out.push(sweep)
  const bubble = detectBubbleDrama(data)
  if (bubble) out.push(bubble)
  // Quiet-day always emits at the floor (weight 35). Any real Kind
  // beats it; on truly slow days it owns the column instead of
  // letting THE LEDE render blank.
  const quiet = detectQuietDay(data)
  if (quiet) out.push(quiet)
  // Remaining detectors (history, week-preview, closer, standings-
  // shift) will land here as they ship. Order doesn't matter —
  // selection is by weight.
  return out
}
