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
import { buildWireFacts, latestWireRun, describeCost, describeContest, type WireFacts } from '../points/wireFacts'
import { detectUpsets } from '../points/upsets'
import { buildWeeklyRecordBook } from '../points/recordWatch'
import { seriesFor, describeSeries, type HeadToHead } from '../points/headToHead'
import type { CareerRecord } from '../points/recordBook'
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
  /** The board to use when there is no previous week to rewind to —
   *  the projection board, for the first weekly issue of a season. */
  fallbackPriorRank?: (teamId: string) => number | undefined
  /** Every manager's record against every other, all-time. */
  headToHead?: HeadToHead
  /** teamId → the platform's stable owner id, which is what the
   *  head-to-head tally is keyed on. */
  ownerOf?: (teamId: string) => string | undefined
  /** Careers including the week just covered, and as they stood
   *  before it — the record book needs both tenses. */
  careers?: readonly CareerRecord[]
  careersBefore?: readonly CareerRecord[]
  /** Completed seasons behind this one. */
  seasonsPlayed?: number
  teamName: (teamId: string) => string
  team?: (teamId: string) => WeeklyIssueTeam | undefined
  playerImage?: (playerId: string) => string | null | undefined
}

const round1 = (n: number) => Math.round(n * 10) / 10

/**
 * The board a team sat on going INTO the covered week.
 *
 * Last week's board when there is one; the projection board in the
 * first weekly issue of a season, where rewinding has nothing behind
 * it. Never the board the week produced — that would let a win
 * justify its own number.
 */
const priorRank = (input: WeeklyIssueInput, teamId: string): number | undefined =>
  input.previousPowerRank?.(teamId) ?? input.fallbackPriorRank?.(teamId)

/**
 * Section artwork.
 *
 * The weekly sections carried none, so the cover — which reads its
 * portrait off the lead section — rendered as text against an empty
 * half-screen, while the preseason issue had a crest. Every section
 * with a subject now names it.
 */
function artFor(input: WeeklyIssueInput, teamIds: string[]) {
  return {
    teamIds,
    logos: teamIds.map((teamId) => {
      const t = input.team?.(teamId)
      return { teamId, url: t?.avatarUrl, color: t?.avatarColor, initials: t?.ownerInitials }
    }),
  }
}

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

/**
 * What happened.
 *
 * LEADS WITH ITS BEST HOOK, not with the same one every week. "Who
 * scored most" is true every week by definition, so a section that
 * always opens on it opens on the least rare thing on the page — and
 * because this section also led every issue, all three leagues
 * published the same shape of cover on the same morning.
 *
 * So the headline is whichever of the week's angles is actually
 * unusual: a game decided by under a point, a team that scored near
 * the top and still lost, a hiding. The highest score is the floor,
 * not the default.
 */
function resultsSection(input: WeeklyIssueInput): IssueSection | null {
  const finals = (input.results ?? []).filter((m) => m.status === 'final')
  if (finals.length === 0) return null

  const scores = [...finals.flatMap((m) => [
    { teamId: m.homeTeamId, points: m.homePoints, won: m.homePoints >= m.awayPoints },
    { teamId: m.awayTeamId, points: m.awayPoints, won: m.awayPoints > m.homePoints },
  ])].sort((a, b) => b.points - a.points)
  const top = scores[0]
  const byMargin = [...finals].sort(
    (a, b) => Math.abs(a.homePoints - a.awayPoints) - Math.abs(b.homePoints - b.awayPoints),
  )
  const closest = byMargin[0]
  const widest = byMargin[byMargin.length - 1]
  const closestMargin = round1(Math.abs(closest.homePoints - closest.awayPoints))
  const widestMargin = round1(Math.abs(widest.homePoints - widest.awayPoints))
  const nameOf = (m: LeagueDataPointsMatchup, wantWinner: boolean) => {
    const homeWon = m.homePoints >= m.awayPoints
    return input.teamName(homeWon === wantWinner ? m.homeTeamId : m.awayTeamId)
  }

  // The unluckiest side of the week: scored near the top of the board
  // and lost anyway. Only counts in the top third — losing with the
  // sixth-best score is just losing.
  const unlucky = scores.find((s, i) => !s.won && i < Math.max(1, Math.floor(scores.length / 3)))

  let headline: string
  let support: string
  if (closestMargin < 1) {
    headline = `${nameOf(closest, true)} won it by ${closestMargin}.`
    support =
      `The closest game the league has had this season. ` +
      `${input.teamName(top.teamId)} put up the week's best on ${round1(top.points)}.`
  } else if (unlucky) {
    headline = `${input.teamName(unlucky.teamId)} scored ${round1(unlucky.points)} and lost.`
    support =
      `The ${ordinal(scores.indexOf(unlucky) + 1)}-best score in the league, and it bought nothing. ` +
      `${input.teamName(top.teamId)} led the week on ${round1(top.points)}.`
  } else if (widestMargin >= 60) {
    headline = `${nameOf(widest, true)} beat ${nameOf(widest, false)} by ${widestMargin}.`
    support =
      `The widest margin of the week. ` +
      `${input.teamName(top.teamId)} put up the best score on ${round1(top.points)}.`
  } else {
    headline = `${input.teamName(top.teamId)} put up ${round1(top.points)}.`
    support =
      `The week's highest score. ${nameOf(closest, true)} took the closest game by ${closestMargin}.`
  }

  // `lead` is the LEFT gutter — a rank, a slot, a grade. Putting a
  // stat label there printed "margin" down the left edge of every
  // list slide. The margin belongs in the sentence.
  const rows: IssueRow[] = finals.map((m) => {
    const homeWon = m.homePoints >= m.awayPoints
    const winner = homeWon ? m.homeTeamId : m.awayTeamId
    const loser = homeWon ? m.awayTeamId : m.homeTeamId
    const margin = round1(Math.abs(m.homePoints - m.awayPoints))
    // Rank going INTO the week. Using the board this result produced
    // would let a win quietly justify its own number.
    const wr = priorRank(input, winner)
    const lr = priorRank(input, loser)
    const named =
      wr && lr
        ? `No. ${wr} ${input.teamName(winner)} beat No. ${lr} ${input.teamName(loser)}`
        : `${input.teamName(winner)} beat ${input.teamName(loser)}`
    // The rivalry, when there is one. A result is a fact; a result
    // with a series behind it is a story.
    const rivalry = describeSeries(
      seriesFor(input.headToHead, input.ownerOf?.(winner), input.ownerOf?.(loser)),
      input.teamName(winner),
    )
    const marginText = margin === 0 ? 'Tied' : `by ${margin}`
    return {
      label: named,
      sub: rivalry ? `${marginText} · ${rivalry}` : marginText,
      value: `${round1(Math.max(m.homePoints, m.awayPoints)).toFixed(1)} – ${round1(Math.min(m.homePoints, m.awayPoints)).toFixed(1)}`,
      ...visual(input, winner),
    }
  })

  const subject =
    closestMargin < 1
      ? (closest.homePoints >= closest.awayPoints ? closest.homeTeamId : closest.awayTeamId)
      : unlucky
        ? unlucky.teamId
        : widestMargin >= 60
          ? (widest.homePoints >= widest.awayPoints ? widest.homeTeamId : widest.awayTeamId)
          : top.teamId
  return {
    id: 'results',
    eyebrow: 'The week',
    headline,
    support,
    visual: artFor(input, [subject]),
    rows,
    priority: 10,
  }
}

/**
 * The result the board said should not happen.
 *
 * Gated on pregame probability rather than rank distance — the top
 * two of a tight board are a coin flip, and No. 2 over No. 1 is not
 * a story. The ranks still write the sentence, because "No. 5 took
 * down No. 2" is how the sentence goes; the probability is printed
 * with it so the claim is checkable.
 */
function upsetSection(input: WeeklyIssueInput): IssueSection | null {
  if ((!input.previousPowerRank && !input.fallbackPriorRank) || input.power.length === 0) return null
  const upsets = detectUpsets({
    results: input.results,
    priorRank: (id) => priorRank(input, id),
    fieldSize: input.power.length,
  })
  if (upsets.length === 0) return null

  const lead = upsets[0]
  // The headline already says "No. 7 took down No. 1" and the support
  // already says how far below they sat. Rows repeating both was the
  // same sentence three times in one section.
  const rows: IssueRow[] = upsets.map((u) => ({
    label: `No. ${u.winnerRank} ${input.teamName(u.winnerId)} over No. ${u.loserRank} ${input.teamName(u.loserId)}`,
    sub: `by ${round1(u.margin)}`,
    value: `${round1(u.winnerPoints).toFixed(1)} – ${round1(u.loserPoints).toFixed(1)}`,
    ...visual(input, u.winnerId),
  }))

  return {
    id: 'upset',
    eyebrow: lead.heist ? 'The heist' : 'The upset',
    visual: artFor(input, [lead.winnerId, lead.loserId]),
    headline: `No. ${lead.winnerRank} took down No. ${lead.loserRank}.`,
    support:
      `${input.teamName(lead.winnerId)} beat ${input.teamName(lead.loserId)} ` +
      `by ${round1(lead.margin)}, from ${lead.gap} spots below them on the board. ` +
      `The board gets a rewrite this week.`,
    rows,
    priority: 15,
  }
}

/**
 * The record book: what moved on Sunday, what is close next week.
 *
 * PRIORITY IS DYNAMIC. A record that actually changed hands is news
 * and sits above the rankings; a chase or a milestone is a preview
 * and sits below the trades. The same section earns a different slot
 * depending on whether it is reporting or forecasting, which is the
 * honest way to rank it against everything else on the page.
 */
function recordSection(input: WeeklyIssueInput): IssueSection | null {
  if (!input.careers || !input.careersBefore) return null
  const notes = buildWeeklyRecordBook({
    careers: input.careers,
    before: input.careersBefore,
    seasonsPlayed: input.seasonsPlayed ?? 0,
  })
  if (notes.length === 0) return null

  const lead = notes[0]
  const moved = lead.kind === 'moved'
  const rows: IssueRow[] = notes.map((n) => ({
    label: n.teamId ? input.teamName(n.teamId) : n.headline,
    value: n.headline,
    sub: n.detail,
    progress: n.progress
      ? {
          ...n.progress,
          against: n.against
            ? (() => {
                const t = n.against.teamId ? input.team?.(n.against.teamId) : undefined
                return {
                  name: n.against.name,
                  value: n.against.value,
                  logoUrl: t?.avatarUrl,
                  logoColor: t?.avatarColor,
                  logoInitials: t?.ownerInitials,
                }
              })()
            : undefined,
          neighbour: n.neighbour
            ? (() => {
                const t = n.neighbour.teamId ? input.team?.(n.neighbour.teamId) : undefined
                return {
                  name: n.neighbour.name,
                  gap: n.neighbour.gap,
                  leader: n.neighbour.leader,
                  logoUrl: t?.avatarUrl,
                  logoColor: t?.avatarColor,
                  logoInitials: t?.ownerInitials,
                }
              })()
            : undefined,
        }
      : undefined,
    ...(n.teamId ? visual(input, n.teamId) : {}),
  }))

  return {
    id: 'record-book',
    eyebrow: 'The record book',
    ...(lead.teamId ? { visual: artFor(input, [lead.teamId]) } : {}),
    headline: moved
      ? `${input.teamName(lead.teamId ?? '')} moved the all-time record.`
      : lead.detail.split('.')[0] + '.',
    support: moved
      ? 'The league has a new line in its history, and it happened on Sunday.'
      : 'Nothing here is a forecast about football. These are numbers already ' +
        'on the board, close enough to move inside a week.',
    rows,
    priority: moved ? 18 : 35,
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
    // Movement against last week's board, or — in the first weekly
    // issue, where there is no last week — against the projection the
    // preseason published. Labelled either way, so a reader is never
    // guessing what the arrow is measured from.
    const lastWeek = input.previousPowerRank?.(p.teamId)
    const prior = lastWeek ?? input.fallbackPriorRank?.(p.teamId)
    const moveLabel = lastWeek !== undefined ? 'since last week' : 'since preseason'
    const notes: string[] = []

    // WHAT THE ROW SAYS ABOUT THIS TEAM, not what all-play means.
    // Every row used to carry the same sentence defining all-play —
    // ten times in a ten-team league, twelve in a twelve — under a
    // support paragraph that had already explained it. The definition
    // belongs once, at the top; the row owes the reader whatever is
    // true of THIS team and nobody else.
    const luckLine = luck ? describeLuck(luck, input.teamName(p.teamId)) : null
    if (luckLine) notes.push(luckLine)
    const record = rec ? `${rec.wins}-${rec.losses}${rec.ties ? `-${rec.ties}` : ''}` : null
    const allPlay = `${p.allPlayWins}-${p.allPlayLosses} all-play`
    notes.push(
      record
        ? `${record} on the season, ${allPlay}, ${round1(p.pointsPerWeek)} a week.`
        : `${allPlay}, ${round1(p.pointsPerWeek)} a week.`,
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
          ? { places: prior - rank, label: moveLabel }
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
    ...(ranked[0] ? { visual: artFor(input, [ranked[0].teamId]) } : {}),
    headline:
      weeksPlayed < MIN_WEEKS_FOR_LUCK
        ? `The board after ${weeksPlayed} week${weeksPlayed === 1 ? '' : 's'}.`
        : 'Who is actually good.',
    support: [
      'What each team has done and what its roster projects to do. The done ' +
        'half is all-play — the record they would hold having played everyone, ' +
        'every week, which is what a points league is measured on.',
      // Say what it is running on. Every results component reads the
      // same games, so on a thin sample the projection carries the
      // board — without it a team projected first and held to one bad
      // week fell to eighth, which is a scoreboard, not a ranking.
      weeksPlayed < MIN_WEEKS_FOR_LUCK
        ? `With ${weeksPlayed} week${weeksPlayed === 1 ? '' : 's'} played the projection is ` +
          'carrying most of this. Results take over as they arrive.'
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
        ? 'Winning bids, biggest first — and what each one had to beat.'
        : 'Claims in the order they processed.') + period,
    rows: facts.adds.slice(0, 8).map((a) => {
      // The team line is the row's identity; what the bid beat is the
      // story. Both, when there is a story — the team alone when there
      // is not, rather than padding every row to the same length.
      const who = `${input.teamName(a.teamId)}${a.position ? ` · ${a.position}` : ''}`
      const contest = describeContest(a)
      return {
        label: a.playerName,
        sub: contest ? `${who} — ${contest}` : who,
        value: describeCost(a),
        imageUrl: input.playerImage?.(a.playerId) ?? undefined,
        ...visual(input, a.teamId),
      }
    }),
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
/**
 * Which story earns the cover.
 *
 * RARITY, NOT SECTION ORDER. The results section always led, and its
 * headline was always the week's highest score — a thing that happens
 * every week by definition. So every league published the same shape
 * of cover on the same morning, which is the loudest way a generated
 * page announces itself.
 *
 * A record changing hands happens once or twice a season. A game
 * inside a point, about as often. Those earn the front; "somebody
 * scored the most" is the floor. Whichever section owns the rarest
 * thing that actually happened is moved to the top, and the page
 * leads with it.
 *
 * Note the scores are about HOW OFTEN, not how loud. A blowout is
 * more spectacular than an upset and rarer than a high score, and
 * sits between them.
 */
function promoteCover(sections: IssueSection[], input: WeeklyIssueInput): void {
  const finals = (input.results ?? []).filter((m) => m.status === 'final')
  const margins = finals.map((m) => Math.abs(m.homePoints - m.awayPoints))
  const closest = margins.length ? Math.min(...margins) : Infinity
  const widest = margins.length ? Math.max(...margins) : 0

  const has = (id: string) => sections.find((s) => s.id === id)
  const record = has('record-book')
  const upset = has('upset')

  const candidates: { id: string; score: number }[] = []
  // A record that MOVED, not one merely being chased.
  if (record && record.priority === 18) candidates.push({ id: 'record-book', score: 100 })
  if (upset) candidates.push({ id: 'upset', score: upset.eyebrow === 'The heist' ? 90 : 55 })
  if (closest < 1) candidates.push({ id: 'results', score: 85 })
  else if (widest >= 60) candidates.push({ id: 'results', score: 60 })
  else candidates.push({ id: 'results', score: 10 })

  const winner = candidates.sort((a, b) => b.score - a.score)[0]
  if (!winner) return
  const lead = has(winner.id)
  if (lead) lead.priority = 0
}

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
  // THE MOST RECENT RUN, not a week. Sleeper stamps a claim with the
  // `leg` it was submitted in, but a waiver run settles everything
  // outstanding at once — one Wednesday run in the captured league
  // settled a $15 claim stamped leg 1 and a $1 claim stamped leg 2 in
  // the same second. Asking for `week + 1` got the $1 half and
  // headlined the issue "$1 changed hands" on a week somebody had
  // spent fifteen. See `latestWireRun`.
  //
  // WAIT FOR THE WIRE still holds: the issue covering week N publishes
  // on the Tuesday of week N+1, before waivers have run. The guard is
  // now freshness rather than week arithmetic — the run has to be
  // newer than anything that had already settled when the week's games
  // finished, which on a stale or archived league is never true.
  void latest
  // The run has to be THIS week's. A run reports into the week after
  // the one being written about — claims answering week N's results
  // settle on the Wednesday inside week N+1 — so that is the only run
  // worth printing.
  //
  // Both ends matter. Without the lower bound the section fires on the
  // Tuesday, reprinting claims everyone saw days ago as news. Without
  // the upper bound an archived league reaches forward and puts week
  // 17's playoff claims under a week 14 headline. A run is stamped by
  // the LATEST week among its claims, because one run settles claims
  // submitted across more than one leg.
  const run = latestWireRun(input.transactions)
  const runWeek = run.length
    ? Math.max(...run.map((t) => t.week).filter(Number.isFinite))
    : NaN
  const wire = runWeek === input.week + 1 ? buildWireFacts(run) : null

  const sections = [
    resultsSection(input),
    upsetSection(input),
    recordSection(input),
    powerSection(input),
    playoffSection(input),
    tradesSection(input, wire),
    wireSection(input, wire),
  ].filter((s): s is IssueSection => s !== null)

  if (sections.length === 0) return null
  promoteCover(sections, input)

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
