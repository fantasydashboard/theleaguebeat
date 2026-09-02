/**
 * Sleeper draft mapping.
 *
 * The real captured draft is the main witness — 140 picks over 14
 * rounds for 10 teams — plus hand-built cases for the shapes a real
 * league eventually produces but this one happens not to.
 */
import { describe, it, expect } from 'vitest'
import { buildSleeperPointsData } from '../sleeperAdapter'
import { sleeperFootballFixture } from '@/fixtures/sleeperFootball'

const raw = sleeperFootballFixture as unknown as Parameters<typeof buildSleeperPointsData>[0]

describe('sleeper draft', () => {
  it('maps the real captured draft', () => {
    const data = buildSleeperPointsData(raw)
    const draft = data.draft
    expect(draft, 'the captured league has a draft').toBeDefined()
    expect(draft!.totalPicks).toBe(140)
    expect(draft!.year).toBe(data.currentSeason)

    // Picks arrive in board order, which the page renders top to bottom.
    for (let i = 1; i < draft!.picks.length; i++) {
      expect(draft!.picks[i].pickOverall).toBeGreaterThan(draft!.picks[i - 1].pickOverall)
    }
  })

  it('names every player and attributes every pick to a real team', () => {
    const data = buildSleeperPointsData(raw)
    const teamIds = new Set(data.teams.map((t) => t.id))
    for (const p of data.draft!.picks) {
      expect(p.playerName.trim().length, `pick ${p.pickOverall} has no name`).toBeGreaterThan(0)
      expect(p.playerName).not.toMatch(/undefined|null|NaN/)
      expect(teamIds.has(p.draftedByTeamId), `pick ${p.pickOverall} has no team`).toBe(true)
      expect(p.round).toBeGreaterThan(0)
    }
  })

  it('carries position and pro team through from pick metadata', () => {
    const data = buildSleeperPointsData(raw)
    const first = data.draft!.picks[0]
    // Football positions, not baseball ones — proof the metadata is
    // being read rather than a baseball default leaking in.
    expect(['QB', 'RB', 'WR', 'TE', 'K', 'DEF']).toContain(first.position)
    expect(first.mlbTeam.length).toBeGreaterThan(0)

    const positions = new Set(data.draft!.picks.map((p) => p.position))
    expect(positions.size, 'a real draft spans several positions').toBeGreaterThan(3)
  })

  it('returns undefined when the league has no draft', () => {
    // An imported or orphaned league genuinely has none. That is a fact
    // about the league, not a reason to synthesise an empty board.
    const noDraft = { ...raw, draft: null } as typeof raw
    expect(buildSleeperPointsData(noDraft).draft).toBeUndefined()

    const emptyPicks = { ...raw, draft: { picks: [] } } as unknown as typeof raw
    expect(buildSleeperPointsData(emptyPicks).draft).toBeUndefined()
  })

  it('drops a pick belonging to nobody but keeps one missing metadata', () => {
    const withHoles = {
      ...raw,
      draft: {
        picks: [
          { round: 1, pick_no: 1, roster_id: 1, player_id: '4866',
            metadata: { first_name: 'Saquon', last_name: 'Barkley', position: 'RB', team: 'PHI' } },
          // No roster: a pick belongs to a team by definition, and one
          // attributed to nobody renders as an orphan row.
          { round: 1, pick_no: 2, roster_id: null, player_id: '99' },
          // No metadata: keep the slot — dropping it would silently
          // renumber the draft — and fall back to something true.
          { round: 1, pick_no: 3, roster_id: 2, player_id: '1234' },
        ],
      },
    } as unknown as typeof raw

    const draft = buildSleeperPointsData(withHoles).draft!
    expect(draft.totalPicks).toBe(2)
    expect(draft.picks.map((p) => p.pickOverall)).toEqual([1, 3])
    expect(draft.picks[1].playerName).toBe('Player 1234')
    expect(draft.picks[1].position).toBe('')
  })
})
