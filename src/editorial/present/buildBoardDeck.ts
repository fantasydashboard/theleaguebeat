/**
 * The Board — power rankings.
 *
 * The deck that carries the season. The draft deck is a one-off and
 * becomes an archive the moment games start; this one is presented
 * every week, and it changes its EVIDENCE rather than its claim as the
 * season gives it better material:
 *
 *   preseason  projected points per week from current rosters
 *   in season  record, all-play, and the luck read from real results
 *              (computePointsPowerScores already computes the first two)
 *
 * The preseason card deliberately carries NEITHER projected record nor
 * opponent average. Across a real 10-team league they span 6.1-7.9 to
 * 7.9-6.1 and 105.2 to 106.7 — ten cards showing the same two numbers,
 * which costs the card its best space and teaches a room nothing. Once
 * games are played there is a real record to show, an all-play record
 * beside it, and a luck verdict between them; those earn the space
 * that a projection of them never could.
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
import type { PointsPowerRow } from '../points/powerScore'
import { describeLuck, readLuck, MIN_WEEKS_FOR_LUCK } from '../points/luck'
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
  /**
   * Real results, once there are any. When present the deck ranks on
   * these instead of projections — the same deck, better evidence.
   * A projection is what you say before the games; ignoring the games
   * afterwards is just a stale forecast.
   */
  power?: PointsPowerRow[]
  /** Actual standings, for the record ranking the luck read needs. */
  records?: { teamId: string; wins: number; losses: number; ties: number; pointsFor?: number }[]
  /** Power ranking as of last week, for movement. */
  previousPowerRank?: (teamId: string) => number | undefined
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
  // In season the deck runs on results; before it, on projections.
  // Either is a valid board — an empty one is not.
  const power = input.power ?? []
  const inSeason = power.length >= 4
  if (!inSeason && input.strength.length < 4) return null

  const slides: PresentSlide[] = []
  const format = input.formatLabel ? `${input.formatLabel} ` : ''
  const projectedBy = new Map(
    (input.projected ?? []).map((r) => [r.teamId, r]),
  )
  const weeksPlayed = power[0]?.weeksPlayed ?? 0
  const luckBy = new Map(
    readLuck(
      power.map((p) => {
        const rec = input.records?.find((r) => r.teamId === p.teamId)
        return {
          teamId: p.teamId,
          power: p.score,
          wins: rec?.wins ?? 0,
          losses: rec?.losses ?? 0,
          ties: rec?.ties ?? 0,
          pointsFor: p.pointsPerWeek * p.weeksPlayed,
        }
      }),
      weeksPlayed,
    ).map((l) => [l.teamId, l]),
  )
  const recordBy = new Map((input.records ?? []).map((r) => [r.teamId, r]))

  slides.push({
    kind: 'cold-open',
    title: input.leagueName,
    subtitle: 'Power rankings',
    // The basis stated once, up front, rather than repeated on ten
    // cards. Every number after this is projected points per week.
    // Says which evidence it is running on. A board that claims
    // "preseason" in week six would be lying about its own basis.
    meta: inSeason
      ? `${input.season} · week ${weeksPlayed} · all-play power`
      : `${input.season} · preseason · ${format}projections`,
  })

  // One slide per team, worst to best.
  //
  // This was a single ten-row list. A table read off a screen gives
  // every team two seconds and the room no reason to react to any of
  // them; a card each turns a ranking into ten moments, and the moment
  // is the whole reason to present rather than send a link.
  const countdown = inSeason
    ? [...power].sort((a, b) => a.score - b.score) // worst first
    : [...input.strength].reverse()
  const field = countdown.length

  for (const [i, entry] of countdown.entries()) {
    const teamId = entry.teamId
    const rank = field - i
    const notes: string[] = []
    const p = projectedBy.get(teamId)

    if (inSeason) {
      const row = entry as PointsPowerRow
      const rec = recordBy.get(teamId)
      const luck = luckBy.get(teamId)
      const prior = input.previousPowerRank?.(teamId)

      const luckLine = luck ? describeLuck(luck, input.teamName(teamId)) : null
      if (luckLine) notes.push(luckLine)
      else if (weeksPlayed < MIN_WEEKS_FOR_LUCK) {
        // Said once, on the cards, rather than letting a reader assume
        // the absence of a verdict means the team is unremarkable.
        notes.push(
          `Too early for a luck read — that needs ${MIN_WEEKS_FOR_LUCK} weeks, ` +
            `and this is week ${weeksPlayed}.`,
        )
      }
      notes.push(
        `All-play ${row.allPlayWins}-${row.allPlayLosses}` +
          `${row.allPlayTies > 0 ? `-${row.allPlayTies}` : ''}: the record they ` +
          'would hold having played everyone, every week.',
      )

      slides.push({
        kind: 'team-card',
        eyebrow: 'Power rankings',
        rank,
        fieldSize: field,
        teamName: input.teamName(teamId),
        tier: tierFor(rank, field),
        // The figure that sorts, as everywhere else in these decks.
        statValue: `${row.score}`,
        statLabel: 'power score',
        movement:
          prior !== undefined && prior !== rank
            ? { places: prior - rank, label: 'since last week' }
            : undefined,
        chips: [
          ...(rec
            ? [
                {
                  value: `${rec.wins}-${rec.losses}${rec.ties > 0 ? `-${rec.ties}` : ''}`,
                  label: 'record',
                },
              ]
            : []),
          {
            value: `${row.allPlayWins}-${row.allPlayLosses}`,
            label: 'all-play',
          },
          { value: `${Math.round(row.pointsPerWeek * 10) / 10}`, label: 'pts / week' },
        ],
        notes,
        ...teamVisual(input, teamId),
      })
      continue
    }

    // Preseason: projections, and the draft-night comparison.
    const t = entry as TeamStrength
    const priorRank = input.draftRank?.(teamId)
    const edgeName = t.edgePlayerId ? input.playerName?.(t.edgePlayerId) : undefined
    if (edgeName && t.edgePlayerVsLeague !== undefined && t.edgePlayerVsLeague > 0) {
      notes.push(
        `${edgeName} is the edge — ${t.edgePlayerVsLeague} points a week clear of ` +
          `the average starting ${t.edgePlayerPosition} in this league.`,
      )
    }
    if (input.startingSlotCount && t.slotsFilled < input.startingSlotCount) {
      const holes = input.startingSlotCount - t.slotsFilled
      notes.push(
        `${holes} starting slot${holes === 1 ? '' : 's'} with nobody to fill ` +
          `${holes === 1 ? 'it' : 'them'} — counted as zero here.`,
      )
    }
    if (t.worstPosition && t.worstPosition.vsLeague < 0) {
      notes.push(
        `Gets ${Math.abs(t.worstPosition.vsLeague)} points a week less from ` +
          `${t.worstPosition.position} than the league does.`,
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
      teamName: input.teamName(teamId),
      tier: tierFor(t.rank, field),
      statValue: `${t.pointsPerWeek}`,
      statLabel: 'projected points per week',
      movement:
        priorRank !== undefined && priorRank !== t.rank
          ? { places: priorRank - t.rank, label: 'since draft night' }
          : undefined,
      chips: [
        {
          value: `${t.vsLeaguePerWeek > 0 ? '+' : ''}${t.vsLeaguePerWeek}`,
          label: 'vs league avg',
        },
        ...(t.bestPosition && t.bestPosition.vsLeague > 0
          ? [{ value: `+${t.bestPosition.vsLeague}`, label: `/wk at ${t.bestPosition.position}` }]
          : []),
        ...(t.worstPosition && t.worstPosition.vsLeague < 0
          ? [{ value: `${t.worstPosition.vsLeague}`, label: `/wk at ${t.worstPosition.position}` }]
          : []),
      ],
      notes,
      ...teamVisual(input, teamId),
    })
  }

  // The crown, on whichever evidence the deck is running. In season
  // it must not reach into `strength` at all — that array is empty
  // once results exist, and the preseason verdict would crash on it.
  if (inSeason) {
    const top = [...power].sort((a, b) => b.score - a.score)[0]
    const topLuck = luckBy.get(top.teamId)
    const luckiest = [...luckBy.values()]
      .filter((l) => l.verdict === 'riding-luck')
      .sort((a, b) => b.delta - a.delta)[0]
    const topRecord = recordBy.get(top.teamId)
    slides.push({
      kind: 'statement',
      eyebrow: 'The verdict',
      headline: `${input.teamName(top.teamId)} are the best team in the league.`,
      support:
        `All-play ${top.allPlayWins}-${top.allPlayLosses} through ` +
        `${weeksPlayed} week${weeksPlayed === 1 ? '' : 's'} — the record they ` +
        'would hold having played everyone, every week, which is what a ' +
        'points league is actually measured on. ' +
        (luckiest && luckiest.teamId !== top.teamId
          ? `${input.teamName(luckiest.teamId)} sit higher in the standings than ` +
            'they have earned, and schedules even out.'
          : topLuck?.verdict === 'better-than-record'
            ? 'Their record does not show it yet. It will.'
            : 'The standings agree.'),
      chips: [
        { value: `${top.score}`, label: 'power score' },
        ...(topRecord
          ? [{ value: `${topRecord.wins}-${topRecord.losses}`, label: 'record' }]
          : []),
        { value: `${top.allPlayWins}-${top.allPlayLosses}`, label: 'all-play' },
      ],
    })
  } else {
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
  }

  // The kicker: does the schedule change any of it?
  //
  // Worth a slide either way. A league where the schedule moves nobody
  // has been told something real — every complaint about the schedule
  // this season is now on record as having been wrong in advance. A
  // league where it moves people has been told something better.
  if (!inSeason && input.projected && input.projected.length >= 4) {
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
    headline: inSeason ? 'That is the board.' : 'The board is set.',
    sub: inSeason ? 'It changes again on Sunday.' : 'It only counts once they play.',
  })

  return { id: 'board', title: 'Power rankings', slides }
}
