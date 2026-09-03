/**
 * The Board — power rankings.
 *
 * The deck that carries the season. The draft deck is a one-off and
 * becomes an archive the moment games start; this one is presented
 * every week, and it changes its EVIDENCE rather than its claim as the
 * season gives it better material:
 *
 *   preseason  projected points per week from current rosters
 *   in season  all-play power from real results (computePointsPowerScores)
 *
 * This file builds the preseason edition. It exists because preseason
 * is the one moment a projection-based ranking is the honest answer
 * rather than a substitute for one — before kickoff, projections are
 * the only evidence there is. A week-one ranking, by contrast, throws
 * the projections away and replaces them with a single noisy result.
 *
 * ROSTERS, NOT DRAFT PICKS. The draft deck ranks what teams drafted.
 * This ranks what they currently hold, so it diverges the first time
 * anyone drops a starter. On the real league at the time of writing
 * four of ten rosters had already changed since draft night — all
 * bench churn, so the two rankings agreed that day. They will not stay
 * agreed, and the one that stays correct is this one.
 */
import type { PresentDeck, PresentSlide } from './types'
import { ordinal } from '../points/draftValue'
import type { TeamStrength } from '../points/rosterStrength'
import {
  scheduleWeight,
  type ProjectedSeasonRow,
} from '../points/projectedSeason'

/** What the deck needs to draw a team. Resolved by the caller. */
export interface BoardDeckTeam {
  name: string
  avatarUrl?: string
  avatarColor?: string
  ownerInitials?: string
}

export interface BoardDeckInput {
  leagueName: string
  season: number
  /** Projected roster strength, strongest first. */
  strength: TeamStrength[]
  /** Projected season from the schedule. Optional: without a schedule
   *  the deck still ranks rosters, it just cannot talk about records. */
  projected?: ProjectedSeasonRow[]
  /** Week-to-week scoring spread used for the record projection, when
   *  it was MEASURED from the league's own prior season. Undefined
   *  means a default was used, and the copy then declines to claim a
   *  measured figure. */
  measuredSpread?: number
  teamName: (teamId: string) => string
  team?: (teamId: string) => BoardDeckTeam | undefined
  /** Scoring format label for the basis line, e.g. "half-PPR". */
  formatLabel?: string
}

function teamVisual(input: BoardDeckInput, teamId: string) {
  const t = input.team?.(teamId)
  if (!t) return {}
  return {
    teamId,
    logoUrl: t.avatarUrl,
    logoColor: t.avatarColor,
    logoInitials: t.ownerInitials,
  }
}

/** "7.9-6.1" — fractional on purpose. Rounding to whole games implies
 *  a precision a projection does not have, and the fraction is what
 *  signals this is an estimate rather than a fixture list. */
function recordLabel(row: ProjectedSeasonRow): string {
  const losses = Math.round((row.gamesScheduled - row.expectedWins) * 10) / 10
  return `${row.expectedWins}-${losses}`
}

/**
 * Returns null when there is nothing to rank — the caller then omits
 * this deck from the picker rather than offering an empty one.
 */
export function buildBoardDeck(input: BoardDeckInput): PresentDeck | null {
  if (input.strength.length < 4) return null

  const slides: PresentSlide[] = []
  const format = input.formatLabel ? `${input.formatLabel} ` : ''
  const projectedBy = new Map(
    (input.projected ?? []).map((r) => [r.teamId, r]),
  )

  slides.push({
    kind: 'cold-open',
    title: input.leagueName,
    subtitle: 'The board',
    meta: `${input.season} · preseason · ${input.strength.length} teams`,
  })

  // The ranking, revealed a team at a time, worst to best. The
  // countdown is the whole point of presenting rather than sending a
  // link: the room waits for first place instead of reading it.
  const countdown = [...input.strength].reverse()
  slides.push({
    kind: 'list',
    eyebrow: 'Power rankings',
    headline: 'Where everyone stands before a snap.',
    support:
      `Projected points per week from the best lineup each roster can ` +
      `field, on Sleeper's ${format}projections` +
      (projectedBy.size ? ', with the record that schedule projects.' : '.') +
      ' Counting up to the strongest team in the league.',
    revealOneByOne: true,
    rows: countdown.map((t) => {
      const p = projectedBy.get(t.teamId)
      return {
        lead: ordinal(t.rank),
        label: input.teamName(t.teamId),
        sub: p ? `projects ${recordLabel(p)}` : `${t.projectedPoints.toLocaleString()} projected pts`,
        value: `${t.pointsPerWeek}/wk`,
        ...teamVisual(input, t.teamId),
      }
    }),
  })

  // The crown.
  const best = input.strength[0]
  const worst = input.strength[input.strength.length - 1]
  const gap = Math.round((best.pointsPerWeek - worst.pointsPerWeek) * 10) / 10
  const bestProjected = projectedBy.get(best.teamId)
  slides.push({
    kind: 'statement',
    eyebrow: 'The verdict',
    headline: `${input.teamName(best.teamId)} enter week 1 on top.`,
    support:
      `${best.pointsPerWeek} projected points a week, ${gap} more than ` +
      `${input.teamName(worst.teamId)} at the bottom of the board. ` +
      'Projections are a forecast, not a result — this is where the ' +
      'season starts an argument, not where it settles one.',
    chips: [
      { value: `${best.pointsPerWeek}`, label: 'pts / week' },
      { value: `+${best.vsLeaguePerWeek}`, label: 'vs league' },
      ...(bestProjected
        ? [{ value: recordLabel(bestProjected), label: 'projected' }]
        : []),
    ],
  })

  // The kicker: does the schedule change any of it?
  //
  // Worth a slide either way. A league where the schedule moves nobody
  // has been told something real — every complaint about the schedule
  // this season is now on record as having been wrong in advance. A
  // league where it moves people has been told something better.
  if (input.projected && input.projected.length >= 4) {
    const weight = scheduleWeight(input.projected)
    const helped = [...input.projected]
      .filter((r) => r.scheduleSwing > 0)
      .sort((a, b) => b.scheduleSwing - a.scheduleSwing)[0]

    slides.push(
      weight.movesAnyone && helped
        ? {
            kind: 'statement',
            eyebrow: 'The schedule',
            headline: `${input.teamName(helped.teamId)} drew the easy road.`,
            support:
              `${ordinal(helped.powerRank)} on roster, ${ordinal(helped.seasonRank)} once ` +
              `the schedule is counted — ${helped.scheduleSwing} ` +
              `place${helped.scheduleSwing === 1 ? '' : 's'} of pure draw. ` +
              `Their opponents project ${helped.opponentPointsPerWeek} points a week.`,
          }
        : {
            kind: 'statement',
            eyebrow: 'The schedule',
            headline: 'Nobody’s schedule saves them.',
            support:
              `${weight.scheduleSpread} points separate the easiest road from the ` +
              `hardest, against ${weight.rosterSpread} points between the best roster ` +
              'and the worst. Everyone plays nearly everyone, so the schedule ' +
              'moves no one. Every complaint about it this season is already ' +
              'on record as wrong.',
            chips: [
              { value: `${weight.scheduleSpread}`, label: 'schedule spread' },
              { value: `${weight.rosterSpread}`, label: 'roster spread' },
            ],
          },
    )
  }

  slides.push({
    kind: 'sign-off',
    headline: 'The board is set.',
    sub: 'It only counts once they play.',
  })

  return { id: 'board', title: 'The board', slides }
}
