/**
 * The weekly issue — every issue after the first.
 *
 * The preseason issue runs on projections because nothing else exists.
 * From week one it runs on RESULTS, and the change of evidence is the
 * point: a projection-based ranking in week six is a stale forecast
 * wearing a power ranking's clothes.
 *
 * SECTIONS GATE THEMSELVES. There is no phase table deciding that week
 * four shows X. Each builder below returns null when it has not earned
 * its place, and priority picks the lead from whatever survived. The
 * luck read knows it needs three weeks; the playoff picture knows it
 * needs a race to be close. Putting those preconditions in a calendar
 * would separate each rule from the thing it is a rule about.
 *
 * WEEK ONE IS THE TRAP. One result is not a power ranking, and week one
 * is when people look hardest. So the lead is what HAPPENED — the
 * biggest score, the closest game — and the ranking appears with its
 * evidence named rather than dressed up as a verdict.
 */
import { ordinal } from '../points/draftValue'
import { tierFor } from '../points/rosterStrength'
import type { PointsPowerRow } from '../points/powerScore'
import { describeLuck, readLuck, MIN_WEEKS_FOR_LUCK } from '../points/luck'
import { buildWireFacts, describeCost, type WireFacts } from '../points/wireFacts'
import type { LeagueTransaction } from '../transactions/types'
import type { LeagueDataPointsMatchup } from '../types'
import type { Issue, IssueCard, IssueRow, IssueSection } from './types'
import { orderSections } from './types'

export interface WeeklyIssueTeam {
  name: string
  avatarUrl?: string
  avatarColor?: string
  ownerInitials?: string
}

export interface WeeklyIssueInput {
  leagueName: string
  season: number
  /** The week just completed. */
  week: number
  /** Regular-season length, for the playoff picture. */
  regularSeasonEndWeek?: number
  /** How many teams make the playoffs. Without it there is no race to
   *  describe, so the playoff section is simply omitted. */
  playoffCutoff?: number
  /** All-play power, strongest first. */
  power: PointsPowerRow[]
  /** Actual records. */
  records?: { teamId: string; wins: number; losses: number; ties: number }[]
  /** The week's finished games. */
  results?: readonly LeagueDataPointsMatchup[]
  /** Everything that moved. */
  transactions?: readonly LeagueTransaction[]
  /** Power ranking as of last week, for movement. */
  previousPowerRank?: (teamId: string) => number | undefined
  teamName: (teamId: string) => string
  team?: (teamId: string) => WeeklyIssueTeam | undefined
  playerImage?: (playerId: string) => string | null | undefined
}

const round1 = (n: number) => Math.round(n * 10) / 10

function visual(input: WeeklyIssueInput, teamId: string) {
  const t = input.team?.(teamId)
  if (!t) return {}
  return {
    teamId,
    logoUrl: t.avatarUrl,
    logoColor: t.avatarColor,
    logoInitials: t.ownerInitials,
  }
}

/* ─────────────────────────────────────────────────────────────────
   SECTIONS — each returns null when it has not earned its place.
───────────────────────────────────────────────────────────────── */

/** What happened. The lead in week one, and always worth carrying. */
function resultsSection(input: WeeklyIssueInput): IssueSection | null {
  const finals = (input.results ?? []).filter((m) => m.status === 'final')
  if (finals.length === 0) return null

  const scores = finals.flatMap((m) => [
    { teamId: m.homeTeamId, points: m.homePoints },
    { teamId: m.awayTeamId, points: m.awayPoints },
  ])
  const top = [...scores].sort((a, b) => b.points - a.points)[0]
  const closest = [...finals].sort(
    (a, b) =>
      Math.abs(a.homePoints - a.awayPoints) - Math.abs(b.homePoints - b.awayPoints),
  )[0]
  const margin = round1(Math.abs(closest.homePoints - closest.awayPoints))

  // `lead` is the LEFT gutter — a rank, a slot, a grade. Putting a
  // stat label there printed "margin" down the left edge of every
  // list slide. The margin belongs in the sentence.
  const rows: IssueRow[] = finals.map((m) => {
    const homeWon = m.homePoints >= m.awayPoints
    const winner = homeWon ? m.homeTeamId : m.awayTeamId
    const loser = homeWon ? m.awayTeamId : m.homeTeamId
    const margin = round1(Math.abs(m.homePoints - m.awayPoints))
    return {
      label: `${input.teamName(winner)} beat ${input.teamName(loser)}`,
      sub: margin === 0 ? 'Tied' : `by ${margin}`,
      value: `${round1(Math.max(m.homePoints, m.awayPoints))} – ${round1(Math.min(m.homePoints, m.awayPoints))}`,
      ...visual(input, winner),
    }
  })

  return {
    id: 'results',
    eyebrow: 'The week',
    headline: `${input.teamName(top.teamId)} put up ${round1(top.points)}.`,
    support:
      `The week's highest score. ${input.teamName(
        closest.homePoints >= closest.awayPoints ? closest.homeTeamId : closest.awayTeamId,
      )} took the closest game by ${margin}.`,
    rows,
    priority: 10,
  }
}

/** Power rankings — the spine of every issue from week one. */
function powerSection(input: WeeklyIssueInput): IssueSection | null {
  if (input.power.length < 4) return null
  const field = input.power.length
  const weeksPlayed = input.power[0]?.weeksPlayed ?? 0
  const recordBy = new Map((input.records ?? []).map((r) => [r.teamId, r]))
  const luckBy = new Map(
    readLuck(
      input.power.map((p) => {
        const rec = recordBy.get(p.teamId)
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

  const ranked = [...input.power].sort((a, b) => b.score - a.score)
  const cards: IssueCard[] = ranked.map((p, i) => {
    const rank = i + 1
    const rec = recordBy.get(p.teamId)
    const luck = luckBy.get(p.teamId)
    const prior = input.previousPowerRank?.(p.teamId)
    const notes: string[] = []

    const luckLine = luck ? describeLuck(luck, input.teamName(p.teamId)) : null
    if (luckLine) notes.push(luckLine)
    notes.push(
      `All-play ${p.allPlayWins}-${p.allPlayLosses}: the record they would hold ` +
        'having played everyone, every week.',
    )

    return {
      teamId: p.teamId,
      rank,
      fieldSize: field,
      teamName: input.teamName(p.teamId),
      tier: tierFor(rank, field),
      statValue: `${p.score}`,
      statLabel: 'power score',
      movement:
        prior !== undefined && prior !== rank
          ? { places: prior - rank, label: 'since last week' }
          : undefined,
      chips: [
        ...(rec
          ? [{ value: `${rec.wins}-${rec.losses}${rec.ties > 0 ? `-${rec.ties}` : ''}`, label: 'record' }]
          : []),
        { value: `${p.allPlayWins}-${p.allPlayLosses}`, label: 'all-play' },
        { value: `${round1(p.pointsPerWeek)}`, label: 'pts / week' },
      ],
      notes,
      ...visual(input, p.teamId),
    }
  })

  return {
    id: 'power-rankings',
    eyebrow: 'Power rankings',
    headline:
      weeksPlayed < MIN_WEEKS_FOR_LUCK
        ? `The board after ${weeksPlayed} week${weeksPlayed === 1 ? '' : 's'}.`
        : 'Who is actually good.',
    support: [
      'Ranked on all-play — the record each team would hold having played ' +
        'everyone, every week, which is what a points league is measured on.',
      weeksPlayed < MIN_WEEKS_FOR_LUCK
        ? `${weeksPlayed} week${weeksPlayed === 1 ? '' : 's'} of evidence, so read it as a sketch.`
        : '',
    ]
      .filter(Boolean)
      .join(' '),
    cards,
    priority: 20,
  }
}

/** Trades this week. One deck, not one per trade. */
function tradesSection(input: WeeklyIssueInput, facts: WireFacts | null): IssueSection | null {
  if (!facts || facts.trades.length === 0) return null

  // One row per SIDE — a trade is argued about one side at a time, and
  // "what they got" is the sentence people actually say.
  const rows: IssueRow[] = facts.trades.flatMap((t) =>
    t.teamIds.map((teamId) => {
      const got = t.received.get(teamId) ?? []
      return {
        label: input.teamName(teamId),
        sub: got.length ? `Got ${got.join(', ')}` : 'Gave up the lot',
        ...visual(input, teamId),
      }
    }),
  )

  return {
    id: 'trades',
    eyebrow: 'Trades',
    headline:
      facts.trades.length === 1
        ? 'A trade went through.'
        : `${facts.trades.length} trades went through.`,
    support: 'What each side walked away with.',
    rows,
    priority: 30,
  }
}

/**
 * The wire — waivers, once they have run.
 *
 * Reads the most recent PROCESSING PERIOD rather than the week the
 * issue covers, and they are usually not the same. Claims made in
 * response to week N's results run on the Wednesday inside week N+1
 * and are stamped N+1 — so an issue about week N that filtered to week
 * N would show last Wednesday's wire and miss the one people actually
 * want to argue about. The support line names the period whenever it
 * differs, so the section cannot silently mislabel itself.
 */
function wireSection(input: WeeklyIssueInput, facts: WireFacts | null): IssueSection | null {
  if (!facts || facts.adds.length === 0) return null
  const period = facts.week === input.week ? '' : ` Week ${facts.week} claims.`
  return {
    id: 'the-wire',
    eyebrow: 'The wire',
    headline:
      facts.usesFaab && facts.faabSpent
        ? `$${facts.faabSpent} changed hands.`
        : `${facts.adds.length} claims went through.`,
    support:
      (facts.usesFaab
        ? 'Winning bids, biggest first. No platform publishes the losing ones.'
        : 'Claims in the order they processed.') + period,
    rows: facts.adds.slice(0, 8).map((a) => ({
      label: a.playerName,
      sub: `${input.teamName(a.teamId)}${a.position ? ` · ${a.position}` : ''}`,
      value: describeCost(a),
      imageUrl: input.playerImage?.(a.playerId) ?? undefined,
      ...visual(input, a.teamId),
    })),
    priority: 40,
  }
}

/**
 * The playoff picture.
 *
 * Gated on the race being CLOSE ENOUGH TO MATTER rather than on a week
 * number. A league where the top six are settled by week nine has no
 * picture to describe, and one that is still a scramble in week twelve
 * very much does — a calendar cannot tell those apart.
 */
function playoffSection(input: WeeklyIssueInput): IssueSection | null {
  const cutoff = input.playoffCutoff
  const endWeek = input.regularSeasonEndWeek
  if (!cutoff || !endWeek || input.power.length < 4) return null

  const remaining = endWeek - input.week
  if (remaining < 0 || remaining > 5) return null // stretch onward only

  const recordBy = new Map((input.records ?? []).map((r) => [r.teamId, r]))
  const standings = [...input.power]
    .map((p) => {
      const rec = recordBy.get(p.teamId)
      const games = (rec?.wins ?? 0) + (rec?.losses ?? 0) + (rec?.ties ?? 0)
      return {
        teamId: p.teamId,
        wins: rec?.wins ?? 0,
        losses: rec?.losses ?? 0,
        pct: games > 0 ? ((rec?.wins ?? 0) + 0.5 * (rec?.ties ?? 0)) / games : 0,
        power: p.score,
      }
    })
    .sort((a, b) => b.pct - a.pct || b.power - a.power)

  if (standings.length <= cutoff) return null

  // The bubble: the last team in and the first out. If they are far
  // apart there is no race, and a "picture" would be describing a
  // settled table as though it were live.
  const lastIn = standings[cutoff - 1]
  const firstOut = standings[cutoff]
  const gapGames = Math.round((lastIn.pct - firstOut.pct) * (lastIn.wins + lastIn.losses))
  if (gapGames > remaining) return null

  const rows: IssueRow[] = standings.slice(0, cutoff + 3).map((t, i) => ({
    lead: ordinal(i + 1),
    label: input.teamName(t.teamId),
    sub: i < cutoff ? 'In' : `${Math.max(1, gapGames)} back`,
    value: `${t.wins}-${t.losses}`,
    ...visual(input, t.teamId),
  }))

  return {
    id: 'playoff-picture',
    eyebrow: 'The race',
    headline: `${input.teamName(firstOut.teamId)} are the first team out.`,
    support:
      `${remaining} week${remaining === 1 ? '' : 's'} left and ` +
      `${gapGames === 0 ? 'nothing' : `${gapGames} game${gapGames === 1 ? '' : 's'}`} ` +
      `between ${cutoff}th and ${cutoff + 1}th.`,
    rows,
    priority: 25,
  }
}

/**
 * Returns null when the week produced nothing worth an issue.
 *
 * Better silence than an issue that opens on "nothing happened".
 */
export function buildWeeklyIssue(input: WeeklyIssueInput): Issue | null {
  // WHICH PROCESSING PERIOD THE WIRE COVERS.
  //
  // Claims answering week N's results run on the Wednesday inside week
  // N+1, so the wire worth reading is usually one week AHEAD of the
  // issue. Taking the log's most recent period gets that right on a
  // live league — and badly wrong on a stale or archived one, where it
  // reached into the playoffs and put week 17's claims under a week 14
  // headline. So: the latest period, but only within a week of what is
  // being written about; otherwise the issue's own week.
  const latest = Math.max(
    ...(input.transactions ?? []).map((t) => t.week).filter(Number.isFinite),
    -Infinity,
  )
  const wireWeek =
    Number.isFinite(latest) && Math.abs(latest - input.week) <= 1 ? latest : input.week
  const wire = buildWireFacts(input.transactions, wireWeek)

  const sections = [
    resultsSection(input),
    powerSection(input),
    playoffSection(input),
    tradesSection(input, wire),
    wireSection(input, wire),
  ].filter((s): s is IssueSection => s !== null)

  if (sections.length === 0) return null

  const weeksPlayed = input.power[0]?.weeksPlayed ?? input.week
  return {
    leagueName: input.leagueName,
    season: input.season,
    week: input.week,
    basis:
      input.power.length > 0
        ? `all-play power · ${weeksPlayed} week${weeksPlayed === 1 ? '' : 's'} played`
        : 'results',
    sections: orderSections(sections),
  }
}
