/**
 * Your Players, football.
 *
 * `buildYourPlayers` is baseball: it scores innings pitched, earned
 * runs, hits and stolen bases off a `PlayerNight`. Football has none
 * of those, and no free box-score feed to build them from — so this
 * is a second builder returning the SAME block shape, rather than a
 * branch inside the first that would leave both halves reading around
 * the other's stat lines.
 *
 * JUDGED AGAINST THE POSITION, THAT WEEK. Fixed thresholds are wrong
 * twice over: 18 points is a poor week for a quarterback and a huge
 * one for a tight end, and every league scores differently. The
 * median starter at the same position in the same week is free — the
 * whole field is already in hand — and it self-corrects for scoring
 * settings, bye weeks and a low-scoring Sunday.
 *
 * THE BENCH IS FAIR GAME, ONE WAY ONLY. Leaving 30 points on the
 * bench is a real story a manager wants told. Benching someone who
 * then scored 2 is not — nobody is owed credit for a correct
 * non-decision, and printing it would make the block read as filler.
 */
import type { PlayerWeek } from '@/editorial/players/playerWeek'
import { positionMedians } from '@/editorial/players/playerWeek'
import type { YourPlayerRow, YourPlayersBlock } from './buildYourPlayers'

/** Above this multiple of the positional median, a start is a standout. */
const STANDOUT = 1.6
/** Below this, it cost you the week. */
const DUD = 0.5
/** A benched player only makes the block if he beat the median by this
 *  much — otherwise "you benched an average tight end" is not news. */
const BENCH_BURN = 1.5
/** Positions where the median is too noisy to judge against. */
const SKIP = new Set(['K', 'DEF'])

const pts = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1))

function row(w: PlayerWeek, tone: 'up' | 'down', line: string): YourPlayerRow {
  return {
    name: w.name,
    line,
    detail: [w.position, w.proTeam].filter(Boolean).join(' · ') || undefined,
    tone,
  }
}

export function buildYourFootballPlayers(
  weeks: readonly PlayerWeek[],
  teamId: string,
): YourPlayersBlock | undefined {
  if (!weeks.length) return undefined
  // One week only — these arrive already scoped to the last closed
  // week, but a caller passing more should not get them blended.
  const latest = weeks.reduce((w, x) => (x.week > w ? x.week : w), 0)
  const field = weeks.filter((w) => w.week === latest)
  const mine = field.filter((w) => w.teamId === teamId)
  if (!mine.length) return undefined

  const median = positionMedians(field)
  const ratio = (w: PlayerWeek): number | undefined => {
    if (!w.position || SKIP.has(w.position)) return undefined
    const m = median.get(w.position)
    // A median of zero cannot be divided into; every ratio would be
    // infinite and the whole position would read as a standout.
    return m && m > 0 ? w.points / m : undefined
  }

  const starters = mine.filter((w) => w.started)
  const scored = starters
    .map((w) => ({ w, r: ratio(w) }))
    .filter((x): x is { w: PlayerWeek; r: number } => x.r !== undefined)

  const rows: YourPlayerRow[] = []

  for (const { w, r } of scored.filter((x) => x.r >= STANDOUT).sort((a, b) => b.r - a.r).slice(0, 2)) {
    rows.push(row(w, 'up', `${pts(w.points)} pts — ${r.toFixed(1)}× what the position returned`))
  }

  // The best thing left on the bench, if it beat what started.
  const benched = mine
    .filter((w) => !w.started)
    .map((w) => ({ w, r: ratio(w) }))
    .filter((x): x is { w: PlayerWeek; r: number } => x.r !== undefined && x.r >= BENCH_BURN)
    .sort((a, b) => b.r - a.r)[0]
  if (benched && rows.length < 2) {
    rows.push(row(benched.w, 'up', `${pts(benched.w.points)} pts — on your bench`))
  }

  const dud = scored.filter((x) => x.r <= DUD).sort((a, b) => a.r - b.r)[0]
  if (dud) {
    rows.push(row(dud.w, 'down', `${pts(dud.w.points)} pts — started, and the position averaged ${pts(median.get(dud.w.position!)!)}`))
  }

  if (!rows.length) return undefined
  return {
    label: 'Your players',
    eyebrow: rows[0].tone === 'down' ? 'THE DAMAGE' : 'YOUR WEEK',
    players: rows,
  }
}
