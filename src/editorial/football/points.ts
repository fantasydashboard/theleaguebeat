/**
 * points — finals and scoring copy in the football register.
 *
 * This is a copy library, not logic. Every export returns variant
 * strings for `pick()` to choose from; the only "logic" here is which
 * variants are true for a given week. Conditional variants return null
 * rather than a fallback sentence, because pick() filters null and a
 * fallback would be a sentence nobody wrote on purpose.
 *
 * WHAT MAKES THIS FOOTBALL rather than sport-neutral, since that is the
 * whole point of the file:
 *
 *   - Points are HUNG, not scored. "hung 140 on them" is football.
 *   - A blowout is "never a game" and the loser gets "buried" or "ran
 *     past", not "defeated by a wide margin".
 *   - A photo finish "came down to Monday night". That is the most
 *     football-specific sentence available to this engine, and it is
 *     honest: stories are sourced from the CLOSED week, so Monday night
 *     has already been played.
 *   - A bad week costs more here than in a 162-game sport. There are
 *     only 14, and the low-score line says so out loud.
 *
 * A LOSING WEEK IS NOT AUTOMATICALLY A BAD WEEK. Whether the loser gets
 * written down is a question about the LOSER'S score against the league
 * average, never about the margin. 131.7 in a 109.4 league is a good
 * week that ran into a monster, and calling it "never in it" because the
 * winner hung 170 is factually wrong, not merely unkind. Everything
 * disparaging gates on `canDisparage`; the above-average loser gets
 * their own variants instead, because "put up 131.7 and still lost" is
 * the true story of that game.
 *
 * HONESTY LIMITS. The engine sees final weekly totals and nothing else.
 * It does not know when a lead was built, who was on the bench, or what
 * the projections said. So there is no "up 40 by the 4pm slate" and no
 * bench regret in here: those read well and cannot be supported by the
 * arguments. The Monday night line survives that test only on a margin
 * small enough that the last game of the week could have flipped it,
 * which is exactly what PHOTO_FINISH_SHARE gates.
 *
 * WHY THRESHOLDS ARE SHARES OF THE LEAGUE AVERAGE, not fixed points:
 * a 40-point margin means something different in a full-PPR shootout
 * league averaging 130 than in a 95-point league. Half-PPR real data
 * (10 teams, 2025) ran a 109.4 weekly average, which puts the blowout
 * line near 38 and the photo finish near 6.6. Both match the eye test.
 *
 * Scores render to one decimal everywhere, matching the neutral path.
 */

export interface FinalArgs {
  winner: string; loser: string
  winnerPts: number; loserPts: number
  leagueAvg: number
  winnerStreak?: { type: 'W' | 'L' | 'T'; length: number }
  winnerRecord?: string
  week: number
}

/** Margin at or above this share of the league average is a burial. */
const BLOWOUT_SHARE = 0.35

/** Margin at or below this share is close enough that the last game of
 *  the week could plausibly have decided it. */
const PHOTO_FINISH_SHARE = 0.06

/** A streak is worth a sentence at three. Two is a coincidence. */
const STREAK_MIN = 3

/** One decimal, everywhere. */
const pts = (n: number) => n.toFixed(1)

export function footballFinalHeadlines(a: FinalArgs): Array<string | null> {
  const { winner: w, loser: l, week } = a
  const wp = pts(a.winnerPts)
  const lp = pts(a.loserPts)
  const margin = pts(a.winnerPts - a.loserPts)
  const avg = pts(a.leagueAvg)

  // A loser who scored nothing, or a scoreline with no gap at all, is
  // missing data rather than a story. Neither framing runs on it, and
  // neither does any line that prints the margin as a claim: "outscored
  // Scuttlebucs by 0.0" is a sentence no one should ever read.
  const gap = a.winnerPts - a.loserPts
  const decided = gap > 0
  const played = a.loserPts > 0 && decided
  const isBlowout = played && gap >= a.leagueAvg * BLOWOUT_SHARE
  const isPhotoFinish = played && gap <= a.leagueAvg * PHOTO_FINISH_SHARE
  const canDisparage = a.loserPts < a.leagueAvg
  const loserWentOff = a.loserPts >= a.leagueAvg && decided

  return [
    // "who managed 131.7" is a put-down. Whether the loser earned one is
    // a question about the LOSER'S score, not about the margin: 131.7 on
    // a 109.4 average is a good week that ran into a monster.
    isPhotoFinish || !canDisparage ? null : `${w} hung ${wp} on ${l}, who managed ${lp}.`,
    `${wp} to ${lp}. ${w} over ${l}, week ${week}.`,
    `${w} took week ${week} from ${l}, ${wp} to ${lp}.`,
    `Final: ${w} ${wp}, ${l} ${lp}.`,
    `${w} ${wp}. ${l} ${lp}. Week ${week}.`,
    decided ? `${w} outscored ${l} by ${margin}. ${wp} to ${lp}.` : null,
    `${l} put up ${lp}. ${w} answered with ${wp}.`,

    // A loser above the league average lost to a big week, not to their
    // own bad one, and gets a headline that says so.
    loserWentOff ? `${l} cleared the ${avg} average and lost. ${w} ${wp} to ${lp}.` : null,

    // "Never a game" and "no contest" describe the loser's week as
    // irrelevant, so they answer to canDisparage. "Ran past" and "buried
    // by 63.8" are claims about the margin and stand on any blowout.
    isBlowout && canDisparage ? `Never a game. ${w} ${wp}, ${l} ${lp}.` : null,
    isBlowout ? `${w} ran past ${l}, ${wp} to ${lp}.` : null,
    isBlowout && canDisparage ? `No contest: ${w} ${wp}, ${l} ${lp}.` : null,
    isBlowout ? `${w} buried ${l} by ${margin}. ${wp} to ${lp}.` : null,

    isPhotoFinish ? `${margin} points decided it. ${w} ${wp}, ${l} ${lp}.` : null,
    isPhotoFinish ? `${w} survived ${l} by ${margin}. ${wp} to ${lp}.` : null,
  ]
}

export function footballFinalBodies(a: FinalArgs): Array<string | null> {
  const { winner: w, loser: l, week } = a
  const wp = pts(a.winnerPts)
  const lp = pts(a.loserPts)
  const margin = pts(a.winnerPts - a.loserPts)
  const avg = pts(a.leagueAvg)
  const overAvg = pts(a.winnerPts - a.leagueAvg)

  const gap = a.winnerPts - a.loserPts
  const decided = gap > 0
  const played = a.loserPts > 0 && decided
  const isBlowout = played && gap >= a.leagueAvg * BLOWOUT_SHARE
  const isPhotoFinish = played && gap <= a.leagueAvg * PHOTO_FINISH_SHARE

  const canDisparage = a.loserPts < a.leagueAvg
  const loserWentOff = a.loserPts >= a.leagueAvg && decided

  const streak = a.winnerStreak
  const hot = streak?.type === 'W' && streak.length >= STREAK_MIN ? streak.length : null

  // 5% over the average, so a 0.7 edge does not get called a ceiling.
  const overPerformed = a.winnerPts >= a.leagueAvg * 1.05
  const record = a.winnerRecord

  return [
    decided ? `${l} fell ${margin} short at ${lp}.` : null,
    `${w} finished on ${wp}. ${l} on ${lp}.`,
    decided ? `Week ${week} to ${w}, ${margin} points clear.` : null,
    decided ? `${l} needed ${margin} more.` : null,

    overPerformed ? `${w} cleared the ${avg} league average by ${overAvg}.` : null,
    a.winnerPts < a.leagueAvg ? `${w} won on ${wp}, under the ${avg} average.` : null,
    canDisparage ? `Only 14 weeks. ${l} just spent one on ${lp}.` : null,

    loserWentOff ? `${l} put up ${lp} and still lost.` : null,
    loserWentOff ? `${lp} beat the ${avg} league average. ${l} lost anyway, by ${margin}.` : null,

    hot ? `${hot} straight for ${w}. ${wp} in week ${week}.` : null,
    hot && hot >= 4 ? `${w} has won ${hot} in a row. Latest: ${wp} on ${l}.` : null,

    record ? `${w} sits at ${record}.` : null,
    record ? `${w} is ${record} after ${wp} in week ${week}.` : null,

    // The one long line, and it earns the length: record, score, the
    // gap to the league average and the gap to the loser, in a single
    // analytical sentence. EDITORIAL.md allows 5% in the 20-30 band.
    record && overPerformed && decided
      ? `${w} is ${record} after ${wp}, ${overAvg} clear of the ${avg} league average, with ${l} finishing ${margin} back at ${lp}.`
      : null,

    isPhotoFinish ? `${margin} points, and it came down to Monday night.` : null,
    isPhotoFinish ? `It came down to Monday night. ${margin} points between ${w} and ${l}.` : null,

    // Both blowout bodies now carry the margin instead of asserting the
    // loser was absent, which keeps them true when the loser scored well.
    isBlowout ? `${margin} points of daylight.` : null,
    isBlowout ? `${l} stopped at ${lp}, ${margin} short of ${w}.` : null,
  ]
}

/** The week's top score. "Hung" is the football verb for it. */
export function footballHighScore(team: string, points: number, week: number): string {
  return `${team} hung ${pts(points)} in week ${week}. Top score in the league.`
}

/** The week's low score. The sting is the schedule, not the number:
 *  a wasted week costs more when the season only has 14 of them. */
export function footballLowScore(team: string, points: number, week: number): string {
  return `${team} managed ${pts(points)} in week ${week}. A wasted one, and there are only 14.`
}
