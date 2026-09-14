/**
 * The record book, week to week.
 *
 * The preseason record book says what is at stake for a season. This
 * one covers the two things a reader wants on a Tuesday: what moved
 * on Sunday, and what is close enough to move next week.
 *
 * THE CHASE KEEPS BEING REPORTED. An earlier sketch only spoke when a
 * record actually changed hands, which goes quiet on exactly the
 * weeks people watch hardest — the leader and the chaser both win,
 * the gap holds at one, and the section says nothing as though
 * nothing happened. A race that survives a week IS the week's news
 * about that race, so it prints either way: still one back, now two
 * back, level.
 *
 * DRAWN, NOT JUST STATED. "14 from 8,000" is a number a reader has to
 * do arithmetic on. The same fact as a bar at 99.8% is felt before it
 * is read, which is why every chase carries `progress`.
 *
 * WHAT IT WILL NOT DO. Hand a record to somebody who has left the
 * league, print a milestone nobody reaches inside a week, or fire at
 * all in a league with no history to break. Same refusals as the
 * preseason book, for the same reason: a manufactured chase is worse
 * than an absent section.
 */
import type { CareerRecord } from './recordBook'

export type WeeklyRecordKind = 'moved' | 'chase' | 'milestone'

export interface WeeklyRecordNote {
  kind: WeeklyRecordKind
  managerId: string
  teamId?: string
  /** The figure, short enough for a stat column. */
  headline: string
  /** What it means and how close it is. */
  detail: string
  /** The chase, for drawing. */
  progress?: { value: number; target: number; held?: boolean }
  /** Smaller sorts first. */
  urgency: number
}

export interface WeeklyRecordInput {
  /** Careers including the week just completed. */
  careers: readonly CareerRecord[]
  /** The same careers as they stood before it. */
  before: readonly CareerRecord[]
  seasonsPlayed: number
}

const POINT_STEP = 1000
const GAMES_IN_SEASON = 14
/** Rows past this are a statistics page. */
export const MAX_WEEKLY_RECORD_NOTES = 3
/** A race still worth reporting. Beyond this the chase is notional. */
const MAX_RACE_GAMES = 12

const nextRung = (v: number, step: number) => (Math.floor(v / step) + 1) * step
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`
const ORD = (n: number) => {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`
}
const WORD = ['none', 'one', 'two', 'three', 'four', 'five', 'six']
const word = (n: number) => WORD[n] ?? String(n)

function rankBy(
  careers: readonly CareerRecord[],
  of: (c: CareerRecord) => number,
): Map<string, number> {
  const out = new Map<string, number>()
  ;[...careers].sort((a, b) => of(b) - of(a)).forEach((c, i) => out.set(c.managerId, i + 1))
  return out
}

export function buildWeeklyRecordBook(input: WeeklyRecordInput): WeeklyRecordNote[] {
  if (input.seasonsPlayed < 2 || input.careers.length < 2) return []

  const notes: WeeklyRecordNote[] = []
  const active = input.careers.filter((c) => c.teamId)
  const beforeBy = new Map(input.before.map((c) => [c.managerId, c]))
  const pointRank = rankBy(input.careers, (c) => c.pointsFor)

  /* ── The all-time wins lead ─────────────────────────────────── */

  const byWins = [...input.careers].sort((a, b) => b.wins - a.wins)
  const wasByWins = [...input.before].sort((a, b) => b.wins - a.wins)
  if (byWins.length >= 2 && byWins[0].wins > 0) {
    const [lead, second] = byWins
    const gap = lead.wins - second.wins
    const wasLead = wasByWins[0]
    const changedHands = wasLead && wasLead.managerId !== lead.managerId

    if (changedHands && lead.teamId) {
      // Somebody took the record. That is the week's biggest fact.
      notes.push({
        kind: 'moved',
        urgency: -100,
        managerId: lead.managerId,
        teamId: lead.teamId,
        headline: `${lead.wins} wins`,
        detail:
          gap === 0
            ? `Level with ${second.name} at the top of the league's history.`
            : `Alone at the top of the league's history, ${plural(gap, 'win')} clear of ${second.name}.`,
        progress: { value: lead.wins, target: lead.wins, held: true },
      })
    } else if (gap === 0 && lead.teamId && second.teamId) {
      // Drew level this week: news whoever got there first.
      const climber = (beforeBy.get(second.managerId)?.wins ?? 0) < second.wins ? second : lead
      const other = climber.managerId === second.managerId ? lead : second
      notes.push({
        kind: 'moved',
        urgency: -90,
        managerId: climber.managerId,
        teamId: climber.teamId,
        headline: `${climber.wins} wins`,
        detail: `Level with ${other.name} at the top of the league's history.`,
        progress: { value: climber.wins, target: climber.wins, held: true },
      })
    } else if (gap > 0 && gap <= MAX_RACE_GAMES && second.teamId) {
      // The chase survived the week, which is itself the report.
      const wasGap = wasByWins.length >= 2 ? wasByWins[0].wins - wasByWins[1].wins : gap
      const movement =
        gap === wasGap
          ? `still ${word(gap)} back`
          : gap < wasGap
            ? `now ${word(gap)} back, a game closer`
            : `now ${word(gap)} back`
      notes.push({
        kind: 'chase',
        urgency: gap,
        managerId: second.managerId,
        teamId: second.teamId,
        headline: `${second.wins} wins`,
        detail:
          `${lead.name} hold the all-time record on ${lead.wins}. ` +
          `${second.name} are ${movement}.`,
        progress: { value: second.wins, target: lead.wins },
      })
    }
  }

  /* ── Points milestones inside a week ────────────────────────── */

  for (const c of active) {
    const perGame = c.seasons > 0 ? c.pointsFor / (c.seasons * GAMES_IN_SEASON) : 0
    if (perGame <= 0) continue
    const target = nextRung(c.pointsFor, POINT_STEP)
    const away = target - c.pointsFor
    // One week, at their own pace. Anything further can wait a week.
    if (away > perGame) continue
    notes.push({
      kind: 'milestone',
      urgency: away,
      managerId: c.managerId,
      teamId: c.teamId,
      headline: `${target.toLocaleString()} pts`,
      detail:
        `${Math.round(away)} away — one ordinary week does it. ` +
        `${ORD(pointRank.get(c.managerId) ?? 0)}-highest scorer all time.`,
      progress: { value: Math.round(c.pointsFor), target },
    })
  }

  // Most urgent first, one row per manager: a team chasing three
  // numbers should say the closest, not fill the section alone.
  const seen = new Set<string>()
  return notes
    .sort((a, b) => a.urgency - b.urgency)
    .filter((n) => {
      if (seen.has(n.managerId)) return false
      seen.add(n.managerId)
      return true
    })
    .slice(0, MAX_WEEKLY_RECORD_NOTES)
}
