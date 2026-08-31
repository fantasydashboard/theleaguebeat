/**
 * streaks — run copy and last-place copy in the football register.
 *
 * A copy library, not logic. Every export returns variant strings for
 * `pick()`; the only decisions here are which variants are TRUE for a
 * given streak. Conditional variants return null rather than a fallback,
 * because pick() filters null and a fallback is a sentence nobody wrote
 * on purpose.
 *
 * WHY A STREAK READS DIFFERENTLY IN FOOTBALL. A run of four in baseball
 * is four of 162. Here it is four of 14, and that is the whole sentence:
 * four straight wins is a bye-week case, four straight losses is most of
 * a season spent losing. So the longer variants stop describing the
 * streak and start describing what it cost, in weeks, out loud.
 *
 * WHERE THE COPY STOPS. This function is handed a team, a direction and
 * a length. It does not know the record, the standings, the schedule or
 * the scores. So there is no "the basement is calling" (canonical #13
 * earns that from a last-place team, not from a streak: a 9-2 roster can
 * drop five straight and still be second) and no "nobody is catching
 * them". Every line here is provable from three arguments.
 *
 * THREE IS WHERE A STREAK BECOMES A STORY, matching points.ts's
 * STREAK_MIN. Two of anything is a coincidence, and the two libraries
 * render into the same issue, so they agree on the threshold rather than
 * one calling a two-week run a streak while the other stays quiet.
 *
 * DIGITS, NOT WORDS, for the count. EDITORIAL.md's canonical set spells
 * some counts ("Three straight wins"), but points.ts ships "4 straight
 * for Gridiron Man" today and the two files land in the same column. An
 * issue that spells the number in one paragraph and prints it in the
 * next is a copy-desk mistake, so this file follows the file already in
 * production.
 */

/** A streak is worth a sentence at three. Two is a coincidence. */
const STREAK_MIN = 3

/** Length of a fantasy football regular season. Hardcoded here exactly
 *  as it is in points.ts, and for the same reason: the sting of a wasted
 *  week is the schedule, and the schedule is the one number the caller
 *  does not pass. Only the two variants where that weight is the point
 *  reach for it, so a 13-week league loses two variants, not the set. */
const REGULAR_SEASON_WEEKS = 14

/**
 * Variants for a team on a run. `type` is the direction, `length` the
 * number of games. Returns an empty array below STREAK_MIN: a two-game
 * run has no story, and silence is the correct output.
 */
export function footballStreakLines(
  team: string,
  type: 'W' | 'L',
  length: number,
): Array<string | null> {
  if (!Number.isFinite(length) || length < STREAK_MIN) return []

  const n = length

  // Every variant below is either verb-free or built on simple past tense
  // ("won", "dropped", "lost", "burned"), never present tense or present
  // perfect ("is riding", "has won", "has not lost"). Team names are
  // arbitrary user strings this engine cannot classify as singular or
  // plural ("The Aman-Ra Stars", "Mighty Mallards" vs. "Gridiron Man",
  // "OverDrive"), and English present-tense verbs conjugate for number
  // while simple past does not — "the Stars has won" is wrong, "the
  // Stars won" is correct regardless of which team's name in the league
  // reads plural. Canonical #13's construction (below) already sidestepped
  // this by avoiding a verb entirely; every other variant now does too.
  if (type === 'W') {
    return [
      `${n} in a row for ${team}.`,
      `${team} won ${n} straight.`,
      `${team}: ${n} straight wins.`,
      `${n}-game win streak for ${team}.`,
      `No loss for ${team} in ${n} weeks.`,

      // Four is the point where opponents stop being unlucky. The claim
      // is exactly what the argument supports: n teams have tried.
      n >= 4 ? `${n} straight. Nobody has solved ${team} yet.` : null,

      // At five, the run is a third of the season and the schedule
      // becomes the story.
      n >= 5
        ? `${team} won ${n} straight. That is ${n} of ${REGULAR_SEASON_WEEKS} weeks without a loss.`
        : null,
    ]
  }

  return [
    `${n} straight losses for ${team}.`,
    `${team}: ${n}-game losing streak.`,
    `${team} dropped ${n} in a row.`,
    `No win for ${team} in ${n} weeks.`,
    `${n} weeks into a skid for ${team}.`,

    n >= 4
      ? `${team} lost ${n} in a row. The season only runs ${REGULAR_SEASON_WEEKS} weeks.`
      : null,

    n >= 5
      ? `${n} straight losses. There are only ${REGULAR_SEASON_WEEKS} weeks, and ${team} burned ${n}.`
      : null,
  ]
}

/**
 * The team at the bottom of the table.
 *
 * A name and a record, and nothing else. It cannot say why they are
 * last, how far back they are, or whether anyone has given up, so it
 * says none of that. Verb-free construction — "owns" was a present-tense
 * verb that needed to agree with the team name's grammatical number,
 * which this engine cannot determine from an arbitrary user string. The
 * record carries the weight on its own.
 */
export function footballCellarLine(team: string, record: string): string {
  return `Last place: ${team}, at ${record}.`
}
