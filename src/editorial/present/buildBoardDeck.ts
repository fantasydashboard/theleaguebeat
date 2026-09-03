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
import { tierFor, type TeamStrength } from '../points/rosterStrength'
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
  /** Player display name, for the "best starter" line. */
  playerName?: (playerId: string) => string | undefined
  /** How many starting slots the league requires — a team below this
   *  has a hole its projection is quietly counting as zero. */
  startingSlotCount?: number
  /**
   * Rank on draft night, for the movement figure. Preseason's honest
   * analogue of "since last week": there is no last week yet, but
   * there IS a draft, and the gap between the team someone drafted and
   * the team they hold now is exactly what waivers did.
   */
  draftRank?: (teamId: string) => number | undefined
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
    // The basis stated once, up front, rather than repeated on ten
    // cards. Every number after this is projected points per week.
    meta: `${input.season} · preseason · ${format}projections`,
  })

  // One slide per team, worst to best.
  //
  // This was a single ten-row list. A table read off a screen gives
  // every team two seconds and the room no reason to react to any of
  // them; a card each turns a ranking into ten moments, and the moment
  // is the whole reason to present rather than send a link.
  const countdown = [...input.strength].reverse()
  const field = input.strength.length
  for (const t of countdown) {
    const p = projectedBy.get(t.teamId)
    const priorRank = input.draftRank?.(t.teamId)
    const notes: string[] = []

    const bestName = t.bestStarterId ? input.playerName?.(t.bestStarterId) : undefined
    if (bestName && t.bestStarterPoints) {
      notes.push(`Leans on ${bestName} — ${t.bestStarterPoints} projected points.`)
    }
    // A hole is a starting slot with nobody eligible for it. The
    // projection counts it as zero, so saying so explains a low number
    // rather than leaving the team looking merely bad.
    if (input.startingSlotCount && t.slotsFilled < input.startingSlotCount) {
      const holes = input.startingSlotCount - t.slotsFilled
      notes.push(
        `${holes} starting slot${holes === 1 ? '' : 's'} with nobody to fill ` +
          `${holes === 1 ? 'it' : 'them'} — counted as zero here.`,
      )
    }
    if (p && p.scheduleSwing !== 0) {
      notes.push(
        p.scheduleSwing > 0
          ? `The schedule is kind: ${ordinal(p.powerRank)} on roster, ${ordinal(p.seasonRank)} once it is counted.`
          : `The schedule is not kind: ${ordinal(p.powerRank)} on roster, ${ordinal(p.seasonRank)} once it is counted.`,
      )
    }

    slides.push({
      kind: 'team-card',
      eyebrow: 'Power rankings',
      rank: t.rank,
      fieldSize: field,
      teamName: input.teamName(t.teamId),
      tier: tierFor(t.rank, field),
      statValue: `${t.pointsPerWeek}`,
      statLabel: 'projected points per week',
      movement:
        priorRank !== undefined && priorRank !== t.rank
          ? { places: priorRank - t.rank, label: 'since draft night' }
          : undefined,
      chips: [
        ...(p ? [{ value: recordLabel(p), label: 'projected record' }] : []),
        {
          value: `${t.vsLeaguePerWeek > 0 ? '+' : ''}${t.vsLeaguePerWeek}`,
          label: 'vs league avg',
        },
        ...(p ? [{ value: `${p.opponentPointsPerWeek}`, label: 'opponents avg' }] : []),
      ],
      notes,
      ...teamVisual(input, t.teamId),
    })
  }

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
