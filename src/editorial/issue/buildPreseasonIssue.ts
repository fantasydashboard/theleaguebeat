/**
 * Issue 1 — after the draft, before a snap.
 *
 * The only issue of the season with NO results. Everything here runs on
 * the draft, the current rosters, the published schedule and last
 * season. That is a constraint and also the brief: this issue's job is
 * to start arguments that week one begins settling.
 *
 * WHAT IT COMMITS TO. A preseason issue that opens with "here is the
 * board" is a table, not an issue. This one names a favourite and puts
 * a number behind it, because a claim someone can disagree with is the
 * only thing worth forwarding to a league chat.
 *
 * WHAT IT REFUSES TO SAY. No busts, no steals-that-will-win-you-the-
 * year, no "power rankings" label on what is a projection. Those need
 * results, and a verdict issued in week zero is exactly the
 * noise-dressed-as-provocation that spends credibility the first issue
 * has not earned yet. Provocation here has to be arithmetic: "gets 14
 * points a week less from running back than the league does" is a
 * fact, and it stings more than an adjective would.
 */
import { ordinal, type TeamDraftValue } from '../points/draftValue'
import { tierFor, type TeamStrength } from '../points/rosterStrength'
import { scheduleWeight, type ProjectedSeasonRow } from '../points/projectedSeason'
import type { WireFacts } from '../points/wireFacts'
import type { Issue, IssueCard, IssueSection } from './types'
import { orderSections } from './types'

export interface PreseasonIssueTeam {
  name: string
  avatarUrl?: string
  avatarColor?: string
  ownerInitials?: string
}

export interface PreseasonIssueInput {
  leagueName: string
  season: number
  /** Projected roster strength, strongest first. */
  strength: TeamStrength[]
  /** Draft value against ADP, best first. Optional — without a
   *  baseline there is no draft grade and the issue simply omits the
   *  sections that would have needed one. */
  graded?: TeamDraftValue[]
  /** Projected season from the schedule. */
  projected?: ProjectedSeasonRow[]
  /** Moves since the draft. */
  wire?: WireFacts | null
  /** Rank on draft night, for "since draft night" movement. */
  draftRank?: (teamId: string) => number | undefined
  teamName: (teamId: string) => string
  team?: (teamId: string) => PreseasonIssueTeam | undefined
  /** e.g. "half-PPR" — names the projection basis. */
  formatLabel?: string
}

function visual(input: PreseasonIssueInput, teamId: string) {
  const t = input.team?.(teamId)
  if (!t) return {}
  return {
    logoUrl: t.avatarUrl,
    logoColor: t.avatarColor,
    logoInitials: t.ownerInitials,
  }
}

/**
 * Returns null when there is not enough of a league to write about.
 * Four teams is the floor every other builder here uses.
 */
export function buildPreseasonIssue(input: PreseasonIssueInput): Issue | null {
  if (input.strength.length < 4) return null

  const sections: IssueSection[] = []
  const field = input.strength.length
  const best = input.strength[0]
  const worst = input.strength[field - 1]
  const gap = Math.round((best.pointsPerWeek - worst.pointsPerWeek) * 10) / 10
  const bestDraft = input.graded?.[0]
  const projectedBy = new Map((input.projected ?? []).map((r) => [r.teamId, r]))

  // ── 1. THE LEAD ────────────────────────────────────────────────
  // A named favourite with a number behind it. "Here is the board" is
  // not a lead; this is a claim the room can argue with.
  sections.push({
    id: 'favourite',
    eyebrow: 'The verdict',
    headline: `${input.teamName(best.teamId)} project to win this league.`,
    support:
      `${best.pointsPerWeek} points a week from the best lineup they can field — ` +
      `${gap} more than ${input.teamName(worst.teamId)} at the bottom of the room. ` +
      'A projection is a forecast, not a result. This is where the season ' +
      'starts an argument, not where it settles one.',
    chips: [
      { value: `${best.pointsPerWeek}`, label: 'projected pts / week' },
      { value: `+${best.vsLeaguePerWeek}`, label: 'vs league average' },
      { value: ordinal(1), label: 'of ' + field },
    ],
    priority: 10,
  })

  // ── 2. THE TWIST ───────────────────────────────────────────────
  // Only exists when two independent measures disagree, which is what
  // makes it the most interesting fact available before kickoff.
  if (bestDraft && bestDraft.teamId !== best.teamId) {
    sections.push({
      id: 'draft-vs-roster',
      eyebrow: 'The draft',
      headline: `${input.teamName(bestDraft.teamId)} won the draft and don't have the best team.`,
      support:
        `${bestDraft.vsLeague > 0 ? '+' : ''}${bestDraft.vsLeague} rounds per pick ` +
        `against ADP, the best in the room — and ${ordinal(
          input.strength.findIndex((t) => t.teamId === bestDraft.teamId) + 1,
        )} on projection. Beating the market and owning the best roster are ` +
        'different achievements, and this room split them.',
      priority: 20,
    })
  }

  // ── 3. EVERY TEAM ──────────────────────────────────────────────
  // The part people actually read, because they read their own first.
  // Each card needs one true, specific, slightly uncomfortable line.
  const cards: IssueCard[] = input.strength.map((t) => {
    const notes: string[] = []
    const g = input.graded?.find((x) => x.teamId === t.teamId)
    const p = projectedBy.get(t.teamId)
    const prior = input.draftRank?.(t.teamId)

    if (t.worstPosition && t.worstPosition.vsLeague < 0) {
      notes.push(
        `Gets ${Math.abs(t.worstPosition.vsLeague)} points a week less from ` +
          `${t.worstPosition.position} than the league does.`,
      )
    }
    if (t.bestPosition && t.bestPosition.vsLeague > 0) {
      notes.push(
        `${t.bestPosition.vsLeague} points a week ahead of the league at ` +
          `${t.bestPosition.position}.`,
      )
    }
    if (p && p.scheduleSwing !== 0) {
      notes.push(
        p.scheduleSwing > 0
          ? `The draw helps: ${ordinal(p.powerRank)} on roster, ${ordinal(p.seasonRank)} once the schedule counts.`
          : `The draw hurts: ${ordinal(p.powerRank)} on roster, ${ordinal(p.seasonRank)} once the schedule counts.`,
      )
    }

    return {
      teamId: t.teamId,
      rank: t.rank,
      fieldSize: field,
      teamName: input.teamName(t.teamId),
      tier: tierFor(t.rank, field),
      statValue: `${t.pointsPerWeek}`,
      statLabel: 'projected points per week',
      movement:
        prior !== undefined && prior !== t.rank
          ? { places: prior - t.rank, label: 'since draft night' }
          : undefined,
      chips: [
        {
          value: `${t.vsLeaguePerWeek > 0 ? '+' : ''}${t.vsLeaguePerWeek}`,
          label: 'vs league',
        },
        ...(g ? [{ value: g.grade, label: 'draft grade' }] : []),
      ],
      notes,
      ...visual(input, t.teamId),
    }
  })

  sections.push({
    id: 'the-field',
    eyebrow: 'The field',
    headline: 'Every team, before a snap.',
    support:
      `Projected points per week from the best lineup each roster can field, on ` +
      `${input.formatLabel ? `${input.formatLabel} ` : ''}projections.`,
    cards,
    priority: 30,
  })

  // ── 4. THE SCHEDULE ────────────────────────────────────────────
  // Worth a section either way, and pre-emptive when it is neutral:
  // it puts every future complaint on record as wrong in advance.
  if (input.projected && input.projected.length >= 4) {
    const weight = scheduleWeight(input.projected)
    const helped = [...input.projected]
      .filter((r) => r.scheduleSwing > 0)
      .sort((a, b) => b.scheduleSwing - a.scheduleSwing)[0]

    sections.push(
      weight.movesAnyone && helped
        ? {
            id: 'schedule',
            eyebrow: 'The schedule',
            headline: `${input.teamName(helped.teamId)} drew the easy road.`,
            support:
              `${ordinal(helped.powerRank)} on roster, ${ordinal(helped.seasonRank)} once ` +
              `the schedule is counted — ${helped.scheduleSwing} place` +
              `${helped.scheduleSwing === 1 ? '' : 's'} of pure draw.`,
            priority: 40,
          }
        : {
            id: 'schedule',
            eyebrow: 'The schedule',
            headline: 'Nobody’s schedule saves them.',
            support:
              `${weight.scheduleSpread} points separate the easiest road from the ` +
              `hardest, against ${weight.rosterSpread} points between the best roster ` +
              'and the worst. Everyone plays nearly everyone. Every complaint about ' +
              'the schedule this season is already on record as wrong.',
            chips: [
              { value: `${weight.scheduleSpread}`, label: 'schedule spread' },
              { value: `${weight.rosterSpread}`, label: 'roster spread' },
            ],
            priority: 40,
          },
    )
  }

  // ── 5. SINCE DRAFT NIGHT ───────────────────────────────────────
  // The first live signal that anything is happening, and the section
  // that becomes The Wire once waivers run for real.
  if (input.wire && input.wire.totalMoves > 0) {
    const w = input.wire
    sections.push({
      id: 'since-the-draft',
      eyebrow: 'Since the draft',
      headline: `${w.totalMoves} move${w.totalMoves === 1 ? '' : 's'} already.`,
      support:
        'The board has not stopped changing since draft night. ' +
        (w.usesFaab && w.faabSpent ? `$${w.faabSpent} spent so far. ` : '') +
        'Waivers run properly once the games do.',
      rows: w.adds.slice(0, 5).map((a) => ({
        label: a.playerName,
        sub: input.teamName(a.teamId),
        value: a.faabBid ? `$${a.faabBid}` : undefined,
        teamId: a.teamId,
        ...visual(input, a.teamId),
      })),
      priority: 50,
    })
  }

  return {
    leagueName: input.leagueName,
    season: input.season,
    week: 0,
    basis: `${input.formatLabel ? `${input.formatLabel} ` : ''}projections · no games played`,
    sections: orderSections(sections),
  }
}
