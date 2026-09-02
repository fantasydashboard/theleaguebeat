import { describe, it, expect } from 'vitest'
import {
  buildDraftStoryFacts,
  draftLede,
  findConcentrations,
  findFirstAtPosition,
  findPositionRuns,
} from '../draftStory'
import { voiceViolations } from '@/editorial/football/voice'
import { buildSleeperPointsData } from '@/editorial/adapters/sleeperAdapter'
import { sleeperFootballFixture } from '@/fixtures/sleeperFootball'
import type { CategoryLeagueDataDraftPick } from '@/editorial/types'

const pick = (
  pickOverall: number,
  round: number,
  teamId: string,
  position: string,
  playerName = `Player ${pickOverall}`,
): CategoryLeagueDataDraftPick => ({
  pickOverall, round, playerId: `p${pickOverall}`, playerName,
  position, mlbTeam: 'PHI', draftedByTeamId: teamId,
})

describe('position runs', () => {
  it('finds three of a position inside five picks', () => {
    const runs = findPositionRuns([
      pick(1, 1, 'a', 'RB'), pick(2, 1, 'b', 'WR'), pick(3, 1, 'c', 'RB'),
      pick(4, 1, 'd', 'RB'), pick(5, 1, 'e', 'TE'),
    ])
    expect(runs).toHaveLength(1)
    expect(runs[0]).toMatchObject({ position: 'RB', count: 3, fromPick: 1, toPick: 4 })
  })

  it('does not call two a run', () => {
    expect(findPositionRuns([
      pick(1, 1, 'a', 'RB'), pick(2, 1, 'b', 'WR'), pick(3, 1, 'c', 'RB'),
    ])).toEqual([])
  })

  it('reports one run rather than every overlapping window', () => {
    // A four-deep run is seen by several sliding windows; it is still
    // one thing that happened.
    const runs = findPositionRuns([
      pick(1, 1, 'a', 'RB'), pick(2, 1, 'b', 'RB'),
      pick(3, 1, 'c', 'RB'), pick(4, 1, 'd', 'RB'),
    ])
    expect(runs).toHaveLength(1)
    expect(runs[0].count).toBe(4)
  })
})

describe('first at position', () => {
  it('records where each position first went', () => {
    const first = findFirstAtPosition([
      pick(1, 1, 'a', 'RB', 'Early Back'),
      pick(2, 1, 'b', 'RB', 'Second Back'),
      pick(3, 1, 'c', 'QB', 'First QB'),
    ])
    expect(first.map((f) => [f.position, f.pickOverall, f.playerName])).toEqual([
      ['RB', 1, 'Early Back'],
      ['QB', 3, 'First QB'],
    ])
  })
})

describe('concentrations', () => {
  it('is relative to the league, not an absolute count', () => {
    // Everyone takes two RBs; one team takes five. Five is the story
    // only because the rest took two — the same absolute number would
    // be unremarkable in a deeper-roster league.
    const picks = [
      ...Array.from({ length: 5 }, (_, i) => pick(i + 1, 1, 'hoarder', 'RB')),
      ...['b', 'c', 'd', 'e'].flatMap((t, ti) =>
        [0, 1].map((k) => pick(10 + ti * 2 + k, 2, t, 'RB')),
      ),
    ]
    const conc = findConcentrations(picks)
    expect(conc.map((c) => c.teamId)).toEqual(['hoarder'])
    expect(conc[0]).toMatchObject({ position: 'RB', count: 5 })
  })

  it('does not flag a lone pick as hoarding', () => {
    // One team takes a single kicker and nobody else takes any. That is
    // not a story.
    const picks = [
      pick(1, 1, 'a', 'K'),
      ...['b', 'c', 'd'].map((t, i) => pick(2 + i, 1, t, 'RB')),
    ]
    expect(findConcentrations(picks).some((c) => c.position === 'K')).toBe(false)
  })
})

describe('draft facts and lede', () => {
  it('returns null for a league with no draft', () => {
    expect(buildDraftStoryFacts([])).toBeNull()
    expect(draftLede(null, () => 'X')).toBeNull()
  })

  it('leads with the biggest run when there is one', () => {
    const facts = buildDraftStoryFacts([
      pick(1, 1, 'a', 'RB'), pick(2, 1, 'b', 'RB'), pick(3, 1, 'c', 'RB'),
      pick(4, 1, 'd', 'WR'),
    ])
    expect(draftLede(facts, () => 'Team')).toBe(
      'Three running backs came off the board between picks 1 and 3.',
    )
  })

  it('falls back to the opening pick when nothing else stands out', () => {
    const facts = buildDraftStoryFacts([
      pick(1, 1, 'a', 'QB', 'Opening Name'),
      pick(2, 1, 'b', 'RB'),
    ])
    expect(draftLede(facts, (id) => (id === 'a' ? 'The Openers' : 'Other')))
      .toBe('The Openers opened the draft with Opening Name.')
  })
})

describe('the real captured draft', () => {
  const data = buildSleeperPointsData(
    sleeperFootballFixture as unknown as Parameters<typeof buildSleeperPointsData>[0],
  )
  const picks = [...(data.draft?.picks ?? [])]
  const facts = buildDraftStoryFacts(picks)
  const nameOf = (id: string) => data.teams.find((t) => t.id === id)?.name ?? `Team ${id}`

  it('describes the draft that actually happened', () => {
    expect(facts).not.toBeNull()
    expect(facts!.totalPicks).toBe(picks.length)
    expect(facts!.teamCount).toBe(data.teams.length)
    expect(facts!.rounds).toBeGreaterThan(1)
    // A 14-round football draft always has runs somewhere.
    expect(facts!.runs.length).toBeGreaterThan(0)
    for (const r of facts!.runs) {
      expect(r.count).toBeGreaterThanOrEqual(3)
      expect(r.toPick).toBeGreaterThanOrEqual(r.fromPick)
    }
  })

  it('names only teams that exist in the league', () => {
    const ids = new Set(data.teams.map((t) => t.id))
    for (const c of facts!.concentrations) expect(ids.has(c.teamId)).toBe(true)
    for (const f of facts!.firstAtPosition) expect(ids.has(f.teamId)).toBe(true)
  })

  it('writes a lede that clears the football voice checker', () => {
    const line = draftLede(facts, nameOf)
    expect(line).toBeTruthy()
    // The same mechanical checker the rest of the football copy passes:
    // no em-dashes, no second person, no clichés, no hedges.
    expect(voiceViolations(line!)).toEqual([])
  })
})
