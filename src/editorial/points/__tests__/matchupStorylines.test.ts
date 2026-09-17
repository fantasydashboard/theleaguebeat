import { describe, it, expect } from 'vitest'
import {
  buildMatchupStorylines, matchOfTheWeek, RUNG,
  type StorylineMatchup, type StorylineTeam,
} from '../matchupStorylines'

const team = (over: Partial<StorylineTeam> & { teamId: string; name: string }): StorylineTeam => ({
  wins: 1, losses: 0, ties: 0, ...over,
})

const game = (
  id: string, home: StorylineTeam, away: StorylineTeam, over: Partial<StorylineMatchup> = {},
): StorylineMatchup => ({ matchupId: id, home, away, ...over })

const one = (m: StorylineMatchup, extra: Partial<Parameters<typeof buildMatchupStorylines>[0]> = {}) =>
  buildMatchupStorylines({ matchups: [m], fieldSize: 10, ...extra })[0]

describe('the ladder', () => {
  it('leads with a record that changes hands on the result', () => {
    // The real case: two managers level at the top of the all-time
    // wins list, both playing, neither against the other.
    const s = one(
      game('m', team({ teamId: 'grid', name: 'Gridiron Man', careerWins: 60, rank: 4 }),
                 team({ teamId: 'od', name: 'OverDrive', careerWins: 12, rank: 5 })),
      { winsRecord: { holders: ['grid', 'mal'], wins: 60 } },
    )
    expect(s.rung).toBe(RUNG.record)
    expect(s.lines[0]).toBe(
      'Gridiron Man is level on 60 career wins, the league record. A win takes it outright.',
    )
  })

  it('says nothing about a record nobody is sharing', () => {
    // Sole holder playing a nobody: the record is not at stake, it is
    // just a fact about one team, and the card is about a game.
    const s = one(
      game('m', team({ teamId: 'grid', name: 'Gridiron Man', careerWins: 60 }),
                 team({ teamId: 'od', name: 'OverDrive', careerWins: 12 })),
      { winsRecord: { holders: ['grid'], wins: 60 } },
    )
    expect(s.lines.some((l) => l.includes('record'))).toBe(false)
  })

  it('reports a chaser one win short', () => {
    const s = one(
      game('m', team({ teamId: 'mal', name: 'Mighty Mallards', careerWins: 59 }),
                 team({ teamId: 'od', name: 'OverDrive', careerWins: 12 })),
      { winsRecord: { holders: ['grid'], wins: 60 } },
    )
    expect(s.lines[0]).toContain('one career win off the league record of 60')
  })

  it('puts the top of the board above the all-time series', () => {
    const s = one(game('m',
      team({ teamId: 'a', name: 'A', rank: 1 }),
      team({ teamId: 'b', name: 'B', rank: 3 }),
      { series: 'A lead the all-time series 3-1' },
    ))
    expect(s.lines[0]).toBe('No. 1 against No. 3 — two of the best three teams in the league.')
    expect(s.lines[1]).toBe('A lead the all-time series 3-1.')
  })

  it('calls a first meeting what it is', () => {
    const s = one(game('m',
      team({ teamId: 'a', name: 'Mighty Mallards', rank: 3 }),
      team({ teamId: 'b', name: 'Chancla Warriors', rank: 8 }),
      { neverMet: true },
    ))
    expect(s.lines).toContain('They have never met.')
  })

  it('reads the basement only from the bottom of the field', () => {
    const bottom = one(game('m',
      team({ teamId: 'a', name: 'A', rank: 9, wins: 0, losses: 1 }),
      team({ teamId: 'b', name: 'B', rank: 10, wins: 0, losses: 1 }),
    ))
    expect(bottom.lines[0]).toContain('The bottom of the board')

    // Mid-table is not the basement, however bad the teams feel.
    const middle = one(game('m',
      team({ teamId: 'a', name: 'A', rank: 5, wins: 0, losses: 1 }),
      team({ teamId: 'b', name: 'B', rank: 6, wins: 0, losses: 1 }),
    ))
    expect(middle.lines.some((l) => l.includes('bottom of the board'))).toBe(false)
  })
})

describe('form', () => {
  it('bills two unbeaten teams', () => {
    const s = one(game('m',
      team({ teamId: 'a', name: 'A', wins: 3, losses: 0 }),
      team({ teamId: 'b', name: 'B', wins: 3, losses: 0 }),
    ))
    expect(s.lines[0]).toContain('Both unbeaten')
  })

  it('reports a run of three, not of two', () => {
    const three = one(game('m',
      team({ teamId: 'a', name: 'A', wins: 3, losses: 1, streak: { type: 'W', length: 3 } }),
      team({ teamId: 'b', name: 'B', wins: 1, losses: 3 }),
    ))
    expect(three.lines[0]).toBe('A arrives on 3 straight wins.')

    const two = one(game('m',
      team({ teamId: 'a', name: 'A', wins: 3, losses: 1, streak: { type: 'W', length: 2 } }),
      team({ teamId: 'b', name: 'B', wins: 1, losses: 3 }),
    ))
    expect(two.lines).toEqual([])
  })

  it('never calls a run of draws a run', () => {
    const s = one(game('m',
      team({ teamId: 'a', name: 'A', wins: 1, losses: 1, ties: 3, streak: { type: 'T', length: 3 } }),
      team({ teamId: 'b', name: 'B', wins: 1, losses: 3 }),
    ))
    expect(s.lines).toEqual([])
  })
})

describe('what it refuses to do', () => {
  it('stays silent on a game with nothing to say', () => {
    // Two mid-table teams who have never been mentioned in the same
    // sentence. Inventing "both will want to bounce back" is the thing
    // this layer exists to prevent.
    const s = one(game('m',
      team({ teamId: 'a', name: 'A', rank: 5, wins: 1, losses: 1 }),
      team({ teamId: 'b', name: 'B', rank: 6, wins: 1, losses: 1 }),
    ))
    expect(s.lines).toEqual([])
    expect(s.rung).toBe(Infinity)
  })

  it('never says the same thing twice in two registers', () => {
    const s = one(game('m',
      team({ teamId: 'a', name: 'A', rank: 1, wins: 2, losses: 0 }),
      team({ teamId: 'b', name: 'B', rank: 2, wins: 2, losses: 0 }),
      { series: 'A lead the all-time series 4-2' },
    ))
    expect(s.lines).toHaveLength(2)
    expect(new Set(s.lines).size).toBe(2)
  })

  it('gives the billing to the best story, not the first game', () => {
    const stories = buildMatchupStorylines({
      fieldSize: 10,
      winsRecord: { holders: ['grid', 'mal'], wins: 60 },
      matchups: [
        game('dull', team({ teamId: 'x', name: 'X', rank: 5, wins: 1, losses: 1 }),
                     team({ teamId: 'y', name: 'Y', rank: 6, wins: 1, losses: 1 })),
        game('big', team({ teamId: 'grid', name: 'Gridiron Man', careerWins: 60, rank: 4 }),
                    team({ teamId: 'od', name: 'OverDrive', rank: 5 })),
      ],
    })
    expect(matchOfTheWeek(stories)!.matchupId).toBe('big')
  })

  it('bills nothing when no game cleared a rung', () => {
    const stories = buildMatchupStorylines({
      fieldSize: 10,
      // 1-1 deliberately: the helper defaults to 1-0, which makes any
      // pair of teams "both unbeaten" and quietly gives every fixture
      // a storyline it was not meant to have.
      matchups: [game('a',
        team({ teamId: 'x', name: 'X', rank: 5, wins: 1, losses: 1 }),
        team({ teamId: 'y', name: 'Y', rank: 6, wins: 1, losses: 1 }))],
    })
    expect(matchOfTheWeek(stories)).toBeNull()
  })
})

describe('last week at both extremes', () => {
  const field = (pts: number[]) => pts.map((p, i) =>
    game(`m${i}`, team({ teamId: `h${i}`, name: `H${i}`, lastWeekPoints: p, rank: 4 + i }),
                  team({ teamId: `a${i}`, name: `A${i}`, lastWeekPoints: p - 1, rank: 5 + i })))

  it('notices the two biggest scores meeting', () => {
    const ms = [
      game('top', team({ teamId: 'a', name: 'A', lastWeekPoints: 152, rank: 4 }),
                  team({ teamId: 'b', name: 'B', lastWeekPoints: 151, rank: 5 })),
      ...field([100, 90]),
    ]
    const out = buildMatchupStorylines({ matchups: ms, fieldSize: 10 })
    expect(out.find((s) => s.matchupId === 'top')!.lines)
      .toContain('The two highest scores of last week, in the same game.')
  })
})
