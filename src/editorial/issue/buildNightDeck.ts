/**
 * The Night Desk — Monday night, presented.
 *
 * A newsroom's night desk works the story while it is still moving,
 * before the morning edition goes out. That is exactly what Monday
 * night is to Tuesday's issue, and it is a different job from the
 * page: a commissioner stands up in front of the league and talks
 * through what is still live.
 *
 * WHY NOT `buildLiveDeck`. That emits one list of rows sorted by
 * margin — fine as a scoreboard, useless as a presentation. It cannot
 * say that No. 11 is about to take down No. 9, that these two have
 * met six times, or that a win puts somebody on the all-time record.
 * Those are the only reasons to gather people round a screen.
 *
 * THE ORDER IS THE ARGUMENT.
 *
 *   1. Upsets first, always. The thing most likely to be remembered
 *      opens the deck rather than arriving ninth.
 *   2. Then the rest of the live games, closest first.
 *   3. Decided games last, compressed into one slide. They are
 *      context, not drama, and a deck that opens on a blowout that
 *      ended at four o'clock has lost the room.
 *
 * It reads the Monday desk rather than recomputing it, so the page
 * and the presentation can never disagree about who is still alive.
 */
import type { MondayDesk, MondayDeskRow } from './buildMondayDesk'
import type { PresentDeck, PresentSlide } from '../present/types'

export interface NightDeckInput {
  desk: MondayDesk
  week: number
  leagueName: string
  /**
   * The all-time series between two teams, already written as a
   * clause — "X lead the all-time series 4-2". Supplied rather than
   * computed so this module stays pure and the caller owns the
   * owner-id plumbing. Null when they have not met enough.
   */
  seriesBetween?: (teamIdA: string, teamIdB: string) => string | null
  /**
   * Anything the issue would report about this team tomorrow: a
   * record in reach, a streak, a milestone. One clause, already
   * written. The desk is the first place a league hears it.
   */
  stakeFor?: (teamId: string) => string | null
}

/** Every storyline we can attach to one game, best first, de-duped. */
function storylines(row: MondayDeskRow, input: NightDeckInput): string[] {
  const out: string[] = []
  const series = input.seriesBetween?.(row.left.teamId, row.right.teamId)
  if (series) out.push(series)
  for (const side of [row.left, row.right]) {
    const stake = input.stakeFor?.(side.teamId)
    if (stake && !out.includes(stake)) out.push(stake)
  }
  return out
}

/** "No. 5 · 2-1" — who they are on the board, in one line. */
const standing = (s: MondayDeskRow['left']): string =>
  [s.rank ? `No. ${s.rank}` : null, s.record].filter(Boolean).join(' · ')

function gameSlide(
  row: MondayDeskRow,
  input: NightDeckInput,
  eyebrow: string,
): PresentSlide {
  const lines = storylines(row, input)
  return {
    kind: 'statement',
    eyebrow,
    // The scoreline is on the chips. The headline is the QUESTION —
    // what has to happen — because that is what a room argues about.
    headline: row.sub,
    support: lines.length ? lines.join(' · ') : undefined,
    chips: [
      { value: `${row.left.points.toFixed(1)}`, label: row.left.name },
      { value: `${row.right.points.toFixed(1)}`, label: row.right.name },
      { value: standing(row.left), label: 'on the board' },
      { value: standing(row.right), label: 'on the board' },
    ],
  }
}

export function buildNightDeck(input: NightDeckInput): PresentDeck | null {
  const { desk } = input
  if (desk.alive.length === 0 && desk.decided.length === 0) return null

  // Upsets lead. `upsetAlert` is one that could still happen; `watch`
  // is one already happening — both belong at the front, and the one
  // in progress outranks the one merely available.
  const upsets = desk.alive.filter((r) => r.watch || r.upsetAlert)
  const rest = desk.alive.filter((r) => !r.watch && !r.upsetAlert)
  upsets.sort((a, b) => (a.watch ? 0 : 1) - (b.watch ? 0 : 1))

  const slides: PresentSlide[] = [
    {
      kind: 'cold-open',
      title: 'The Night Desk',
      subtitle:
        desk.alive.length === 1
          ? 'One game still alive.'
          : `${desk.alive.length} games still alive.`,
      meta: `${input.leagueName} · Week ${input.week}`,
    },
  ]

  upsets.forEach((row, i) => {
    const level = row.watch ?? row.upsetAlert
    const live = !!row.watch
    slides.push({
      kind: 'statement',
      eyebrow: upsets.length > 1 ? `Upset alert · ${i + 1} of ${upsets.length}` : 'Upset alert',
      // Say which way round it is. "No. 11 leads No. 9" and "No. 11
      // could still take No. 9" are different nights.
      headline: live
        ? `No. ${row.left.rank} ${row.left.name} are beating No. ${row.right.rank} ${row.right.name}.`
        : `No. ${row.right.rank} ${row.right.name} can still take down No. ${row.left.rank} ${row.left.name}.`,
      support: [row.sub, ...storylines(row, input)].filter(Boolean).join(' · '),
      chips: [
        { value: `${row.left.points.toFixed(1)}`, label: row.left.name },
        { value: `${row.right.points.toFixed(1)}`, label: row.right.name },
        { value: level === 'heist' ? 'Heist' : 'Upset', label: live ? 'in progress' : 'in play' },
      ],
    })
  })

  rest.forEach((row, i) => {
    slides.push(gameSlide(row, input, rest.length > 1 ? `Still alive · ${i + 1} of ${rest.length}` : 'Still alive'))
  })

  if (desk.decided.length > 0) {
    slides.push({
      kind: 'list',
      eyebrow: 'Done and dusted',
      headline:
        desk.decided.length === 1 ? 'One game is in the book.' : `${desk.decided.length} games are in the book.`,
      support: 'Settled before tonight. The write-up lands with the issue.',
      revealOneByOne: false,
      rows: desk.decided.map((r) => ({
        label: `${r.left.name} beat ${r.right.name}`,
        sub: standing(r.left),
        value: `${r.left.points.toFixed(1)} – ${r.right.points.toFixed(1)}`,
        teamId: r.left.teamId,
      })),
    })
  }

  slides.push({
    kind: 'sign-off',
    headline: 'That is the desk.',
    support: 'Live numbers — they move until the last whistle. The issue lands tomorrow.',
  })

  return { id: 'night', title: 'The Night Desk', slides }
}
