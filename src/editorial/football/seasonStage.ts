/**
 * seasonStage — where the football calendar is, said the way a football
 * manager measures it.
 *
 * THE WHOLE POINT OF THIS FILE IS THE ARITHMETIC IT REFUSES TO PRINT.
 * "Week 11 of 14" is arithmetic. "Three games left" is a number someone
 * feels in their chest, and it is the same fact. A 14-week season has no
 * spare weeks in it, so this library counts what is LEFT (endWeek minus
 * week) rather than what has elapsed. That is the one thing that makes
 * football's calendar copy different from a 22-week category season,
 * where week 11 is genuinely mid-journey.
 *
 * WHY 'quarter' RETURNS NULL. Football has real named landmarks: kickoff,
 * the halfway turn, the stretch run, the last week of the regular
 * season, the bracket, the title game. The quarter pole is not one of
 * them — it is borrowed from horse racing, and a quarter of 14 weeks is
 * 3.5 games, which is not a sentence. There is no football-specific
 * framing to write, so the renderer falls through to the neutral copy.
 * That is the correct outcome, not a gap.
 *
 * NEGATIVE AND ZERO COUNTS NEVER RENDER. 'playoffs' and 'championship'
 * arrive at weeks past endWeek, so any remaining-count in those weeks is
 * zero or negative. The two lines that could print one are gated on
 * `remaining >= 1`; the bracket lines are written off `endWeek` instead,
 * which is true whatever week they run in.
 */

export type FootballStage =
  | 'opening'
  | 'quarter'
  | 'half'
  | 'stretch'
  | 'final-week'
  | 'playoffs'
  | 'championship'

/**
 * One line for the stage, or null where football has nothing specific to
 * say and the neutral copy should run instead.
 */
export function footballStageLine(
  stage: FootballStage,
  week: number,
  endWeek: number,
): string | null {
  const remaining = endWeek - week
  const hasRemaining = Number.isFinite(remaining) && remaining >= 1

  switch (stage) {
    // Kickoff. The count is enormous and the sentence is still the count,
    // because that is the frame the rest of the season is measured in.
    case 'opening':
      return hasRemaining ? `Week ${week} down, ${remaining} to play.` : null

    // See the header: the quarter pole is a horse racing landmark, and
    // 3.5 games is not a football sentence.
    case 'quarter':
      return null

    // The turn. Seven games is enough to know what a roster is, and it is
    // also everything that is left, which is the half-season's real
    // weight in a schedule this short.
    case 'half':
      return hasRemaining
        ? `${week} weeks in, ${remaining} to go. Half a season is enough to know what a team is.`
        : null

    // The stretch run, and the reason this file exists. Games left, not
    // weeks played.
    case 'stretch':
      return hasRemaining ? `${remaining} games left before the bracket locks.` : null

    // Written off endWeek, not off `remaining`, so it stays true in the
    // week it actually describes (where remaining is 0).
    case 'final-week':
      return `One week left of ${endWeek}. It decides the bracket.`

    // Single elimination is the defining fact of the fantasy postseason,
    // and the number that makes it hurt is the season it erases.
    case 'playoffs':
      return `${endWeek} weeks of work, and one bad Sunday ends it.`

    case 'championship':
      return `The title game. One Sunday decides ${endWeek} weeks.`
  }
}
