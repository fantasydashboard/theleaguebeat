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
import { numberWord } from '../points/draftStory'
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
  /** Headshot for a player id. Optional: without it a waiver slide
   *  shows the acquiring team's crest instead of a face. */
  playerImage?: (playerId: string) => string | null | undefined
}

const sentenceCase = (w: string) => w.charAt(0).toUpperCase() + w.slice(1)

/** Section artwork for one or two teams. */
function artFor(input: PreseasonIssueInput, teamIds: string[]) {
  return {
    teamIds,
    logos: teamIds.map((teamId) => {
      const t = input.team?.(teamId)
      return {
        teamId,
        url: t?.avatarUrl,
        color: t?.avatarColor,
        initials: t?.ownerInitials,
      }
    }),
  }
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
    visual: artFor(input, [best.teamId]),
    chips: [
      { value: `${best.pointsPerWeek}`, label: 'projected pts / week' },
      { value: `+${best.vsLeaguePerWeek}`, label: 'vs league average' },
      { value: ordinal(1), label: 'of ' + field },
    ],
    priority: 10,
  })

  // ── 2. THE DRAFT, GRADED ───────────────────────────────────────
  //
  // Was a twist that only ran when the draft winner and the projected
  // roster leader differed. That made the page assert a winner and a
  // figure with nothing to check it against, and in the years the two
  // measures agreed there were no draft grades on the page at all.
  //
  // So it always runs when there are grades, and it brings the whole
  // board with it. The disagreement is still the better headline when
  // it exists; when it does not, "won the draft and has the team to
  // show for it" is a duller fact but a true one.
  //
  // Named "Draft grades" rather than "The draft" because the page also
  // carries a draft-NIGHT section further down — first quarterback,
  // opening pick, who loaded up. Two sections with one name read as a
  // page that has looped.
  if (bestDraft) {
    const alsoBestRoster = bestDraft.teamId === best.teamId
    const rosterRank = input.strength.findIndex((t) => t.teamId === bestDraft.teamId) + 1

    sections.push({
      id: 'draft-grades',
      eyebrow: 'Draft grades',
      headline: alsoBestRoster
        ? `${input.teamName(bestDraft.teamId)} won the draft and the room knows it.`
        : `${input.teamName(bestDraft.teamId)} won the draft and don't have the best team.`,
      support: alsoBestRoster
        ? `${bestDraft.vsLeague > 0 ? '+' : ''}${bestDraft.vsLeague} rounds per pick ` +
          'against ADP, the best in the room — and the best roster on projection ' +
          'as well. Beating the market and owning the best team are different ' +
          'achievements; this year one manager did both.'
        : `${bestDraft.vsLeague > 0 ? '+' : ''}${bestDraft.vsLeague} rounds per pick ` +
          `against ADP, the best in the room — and ${ordinal(rosterRank)} on ` +
          'projection. Beating the market and owning the best roster are ' +
          'different achievements, and this room split them.',
      // Every graded team, so the claim above is checkable. A letter is
      // league-relative and says little alone, which is why the rounds
      // figure travels with it on every row.
      rows: input.graded!.map((g) => ({
        lead: g.grade !== '—' ? g.grade : undefined,
        label: input.teamName(g.teamId),
        sub: `${g.picksCompared} picks compared`,
        value: `${g.vsLeague > 0 ? '+' : ''}${g.vsLeague}`,
        ...visual(input, g.teamId),
      })),
      // Two marks set against each other when the measures split; the
      // winner alone when they agree.
      visual: artFor(input, alsoBestRoster ? [bestDraft.teamId] : [bestDraft.teamId, best.teamId]),
      priority: 20,
      // The rows are the evidence, but the DECK is the ten-card
      // countdown — richer than a table, and already built.
      deckId: 'draft',
    })
  }

  // ── 2b. WHERE THE FIELD BREAKS ─────────────────────────────────
  //
  // The cover names a favourite and section 3 lists all ten, but
  // neither says what SHAPE the league is — and that is the thing a
  // power ranking is actually for. A projection is only interesting
  // where it clusters: four teams inside a point of each other is a
  // race, and a three-point cliff underneath them is a different
  // league below the line.
  //
  // Found rather than assumed: take the biggest drop between
  // consecutive teams and check it is genuinely a break rather than
  // the largest of ten similar gaps. Every board has a biggest gap;
  // only some have a cliff.
  const gaps = input.strength.slice(0, -1).map((t, i) => ({
    after: i + 1,
    size: Math.round((t.pointsPerWeek - input.strength[i + 1].pointsPerWeek) * 10) / 10,
  }))
  if (gaps.length >= 3) {
    const sorted = [...gaps].map((g) => g.size).sort((a, b) => a - b)
    const median = sorted[Math.floor(sorted.length / 2)]
    const biggest = gaps.reduce((m, g) => (g.size > m.size ? g : m), gaps[0])

    // Twice the typical gap, and not a rounding artefact on a flat
    // board. Below either bar the field is evenly spread, and calling
    // that a tier would be inventing a story about noise.
    const isCliff = biggest.size >= Math.max(1.5, median * 2)
    if (isCliff) {
      const n = biggest.after
      const above = input.strength[n - 1]
      const below = input.strength[n]
      const topSpread =
        Math.round((input.strength[0].pointsPerWeek - above.pointsPerWeek) * 10) / 10

      sections.push({
        id: 'power-rankings',
        eyebrow: 'Power rankings',
        headline:
          n === 1
            ? `${input.teamName(best.teamId)} are out on their own.`
            // `numberWord` is lowercase for mid-sentence use; this one
            // opens a headline.
            : `${sentenceCase(numberWord(n))} teams have a case. Then it drops.`,
        support:
          n === 1
            ? `${biggest.size} points a week clear of ${input.teamName(below.teamId)} in second. ` +
              'Nobody else in the room projects within that.'
            : `The top ${numberWord(n)} are separated by ${topSpread} points a week. ` +
              `The gap from ${input.teamName(above.teamId)} down to ` +
              `${input.teamName(below.teamId)} is ${biggest.size} on its own — ` +
              'wider than the whole race above it. Projections are a forecast, ' +
              'not a result, but that is where this board breaks.',
        // The two teams the line runs between: the section IS that gap.
        visual: artFor(input, [above.teamId, below.teamId]),
        chips: [
          { value: `${n}`, label: n === 1 ? 'clear leader' : 'in the mix' },
          { value: `${biggest.size}`, label: 'pts / week cliff' },
          { value: `${Math.round((input.strength[0].pointsPerWeek - worst.pointsPerWeek) * 10) / 10}`, label: 'top to bottom' },
        ],
        priority: 25,
      })
    }
  }

  // ── 3. EVERY TEAM ──────────────────────────────────────────────
  // The part people actually read, because they read their own first.
  // Each card needs one true, specific, slightly uncomfortable line.
  const cards: IssueCard[] = input.strength.map((t) => {
    const notes: string[] = []
    const g = input.graded?.find((x) => x.teamId === t.teamId)
    const p = projectedBy.get(t.teamId)
    const prior = input.draftRank?.(t.teamId)

    // Which line leads depends on where the team sits. Introducing the
    // projected league winner with "gets 8.4 fewer points from
    // receiver" reads as a correction rather than a verdict; the top of
    // the board is defined by what it is good at, the bottom by what it
    // is not. Ten identical "gets X less from Y" lines in a row also
    // read as a form letter, and alternating the framing breaks that.
    const leadWithStrength = t.rank <= Math.ceil(field / 2)
    const strengthLine =
      t.bestPosition && t.bestPosition.vsLeague > 0
        ? `${t.bestPosition.vsLeague} points a week clear of the league at ${t.bestPosition.position}.`
        : null
    const weaknessLine =
      t.worstPosition && t.worstPosition.vsLeague < 0
        ? `Thinnest at ${t.worstPosition.position} — ${Math.abs(t.worstPosition.vsLeague)} points a week behind the league.`
        : null
    for (const line of leadWithStrength
      ? [strengthLine, weaknessLine]
      : [weaknessLine, strengthLine]) {
      if (line) notes.push(line)
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
      visual: artFor(input, [...new Set(w.adds.slice(0, 3).map((a) => a.teamId))]),
      rows: w.adds.slice(0, 5).map((a) => ({
        label: a.playerName,
        sub: input.teamName(a.teamId),
        value: a.faabBid ? `$${a.faabBid}` : undefined,
        teamId: a.teamId,
        imageUrl: input.playerImage?.(a.playerId) ?? undefined,
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
