import { describe, it, expect } from 'vitest'
import { buildRecordBook, MAX_RECORD_NOTES, type CareerRecord } from '../recordBook'

const mgr = (over: Partial<CareerRecord> & { managerId: string }): CareerRecord => ({
  name: over.managerId,
  teamId: over.managerId,
  seasons: 8,
  wins: 0,
  losses: 0,
  ties: 0,
  pointsFor: 0,
  titles: 0,
  lasts: 0,
  ...over,
})

/** The real League of Record, eight seasons deep. */
const REAL: CareerRecord[] = [
  mgr({ managerId: 'mallards', name: 'Mighty Mallards', wins: 60, losses: 36, pointsFor: 11367, titles: 1 }),
  mgr({ managerId: 'gridiron', name: 'Gridiron Man', wins: 59, losses: 37, pointsFor: 11242, titles: 2 }),
  mgr({ managerId: 'amanra', name: 'The Aman-Ra Stars', wins: 53, losses: 43, pointsFor: 10837, titles: 1 }),
  mgr({ managerId: 'scuttle', name: 'Scuttlebucs', wins: 52, losses: 44, pointsFor: 11540, titles: 1 }),
  mgr({ managerId: 'juggs', name: 'The Juggernauts', seasons: 6, wins: 42, losses: 28, pointsFor: 7853 }),
]

describe('the record book', () => {
  it('finds the race that is actually close', () => {
    // 60 to 59 across eight seasons. This is the best line the league
    // has and nothing surfaced it.
    const out = buildRecordBook(REAL, { seasonsPlayed: 8 })
    const wins = out.find((n) => n.headline.includes('all-time wins'))
    expect(wins).toBeDefined()
    expect(wins!.headline).toBe('60 all-time wins')
    expect(wins!.detail).toContain('1 win clear of Gridiron Man')
  })

  it('says nothing about a lead nobody can close', () => {
    // A 400-win lead is a fact. Facts are not stories.
    const runaway = [
      mgr({ managerId: 'a', name: 'A', wins: 500, pointsFor: 90000, seasons: 40 }),
      mgr({ managerId: 'b', name: 'B', wins: 100, pointsFor: 20000, seasons: 40 }),
    ]
    const out = buildRecordBook(runaway, { seasonsPlayed: 40 })
    expect(out.some((n) => n.kind === 'race')).toBe(false)
  })

  it('reports a milestone even when nothing is contested', () => {
    // The point of milestones: a league can have no close race at all
    // and still have somebody about to pass a round number.
    const solo = [
      mgr({ managerId: 'a', name: 'A', wins: 500, pointsFor: 11900, seasons: 40 }),
      mgr({ managerId: 'b', name: 'B', wins: 100, pointsFor: 2000, seasons: 40 }),
    ]
    const out = buildRecordBook(solo, { seasonsPlayed: 40 })
    const ms = out.find((n) => n.kind === 'milestone')
    expect(ms).toBeDefined()
    expect(ms!.headline).toContain('12,000 career points')
  })

  it('leads with a contested record, not the most arithmetically urgent', () => {
    // Points tick over every week and titles do not, so sorting on
    // imminence alone buried "two titles, and nobody has gone back to
    // back" under three interchangeable points milestones.
    const kinds = buildRecordBook(REAL, { seasonsPlayed: 8 }).map((n) => n.kind)
    const rank = { race: 0, title: 1, milestone: 2 } as const
    expect(kinds.map((k) => rank[k])).toEqual([...kinds.map((k) => rank[k])].sort())
    expect(kinds[0]).toBe('race')
    expect(kinds).toContain('title')
  })

  it('gives one row per manager, so nobody fills the section alone', () => {
    // Mallards lead all-time wins AND are near a points milestone. The
    // section should say the closer of the two, once.
    const out = buildRecordBook(REAL, { seasonsPlayed: 8 })
    const ids = out.map((n) => n.managerId)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('caps itself before it becomes a statistics page', () => {
    const many = Array.from({ length: 20 }, (_, i) =>
      mgr({ managerId: `m${i}`, name: `M${i}`, wins: 49 - i, pointsFor: 10990 - i * 5 }),
    )
    expect(buildRecordBook(many, { seasonsPlayed: 8 }).length).toBeLessThanOrEqual(MAX_RECORD_NOTES)
  })

  it('has nothing to say about a first-year league', () => {
    // No history is not a bug and must not be dressed as one.
    const rookies = [mgr({ managerId: 'a', seasons: 1 }), mgr({ managerId: 'b', seasons: 1 })]
    expect(buildRecordBook(rookies, { seasonsPlayed: 1 })).toEqual([])
    expect(buildRecordBook([], { seasonsPlayed: 8 })).toEqual([])
  })

  it('will not hand a record to somebody who left the league', () => {
    // Black Panther has two titles and was relegated out of this tier.
    // A race they cannot run is not a race.
    const departed = [
      mgr({ managerId: 'gone', name: 'Black Panther', teamId: undefined, wins: 90, pointsFor: 20000 }),
      mgr({ managerId: 'here', name: 'Here', wins: 88, pointsFor: 19900 }),
    ]
    const out = buildRecordBook(departed, { seasonsPlayed: 8 })
    expect(out.every((n) => n.managerId !== 'gone')).toBe(true)
  })

  it('names the title holders and the back-to-back drought', () => {
    const out = buildRecordBook(REAL, { seasonsPlayed: 8 })
    const titles = out.find((n) => n.headline.includes('title'))
    // Gridiron Man is the only two-title manager still in this league.
    expect(titles?.managerId).toBe('gridiron')
    expect(titles?.headline).toBe('2 titles')
  })
})

describe('titles counted honestly', () => {
  it('does not promote a tie into an outright lead', () => {
    // Black Panther has two titles and was relegated out of this tier.
    // Counting only present managers made Gridiron Man — level with
    // him — read as the outright record holder.
    const withDeparted = [
      ...REAL,
      mgr({ managerId: 'panther', name: 'Black Panther', teamId: undefined, titles: 2, wins: 43, pointsFor: 7894, seasons: 5 }),
    ]
    const out = buildRecordBook(withDeparted, { seasonsPlayed: 8 })
    const titles = out.find((n) => n.kind === 'title')!
    expect(titles.managerId).toBe('gridiron')
    expect(titles.detail).toContain('Level with Black Panther')
    expect(titles.detail).not.toContain('More than anybody')
  })

  it('claims an outright lead only when it is one', () => {
    // The title holder must not also lead every other record, or the
    // one-row-per-manager rule collapses them into a single note.
    const sole = [
      mgr({ managerId: 'a', name: 'A', titles: 3, wins: 40, pointsFor: 9000 }),
      mgr({ managerId: 'b', name: 'B', titles: 1, wins: 55, pointsFor: 10500 }),
    ]
    const titles = buildRecordBook(sole, { seasonsPlayed: 8 }).find((n) => n.kind === 'title')!
    expect(titles.detail).toContain('More than anybody else')
  })

  it('never asserts back-to-back, which career totals cannot know', () => {
    // Whether anybody went consecutive is a question about SEASONS.
    // Answering it from career totals would be a guess printed as fact.
    const out = buildRecordBook(REAL, { seasonsPlayed: 8 })
    expect(out.some((n) => /back.to.back|consecutive/i.test(n.detail))).toBe(false)
  })
})

describe('a milestone states where it stands', () => {
  it('says the rank, so a round number does not read as a league best', () => {
    // "147 from 8,000" sounds like a record until it says sixth.
    const out = buildRecordBook(REAL, { seasonsPlayed: 8 })
    const ms = out.find((n) => n.kind === 'milestone' && n.headline.includes('career points'))!
    expect(ms).toBeDefined()
    expect(ms.detail).toMatch(/\d+(st|nd|rd|th)-highest scorer/)
  })

  it('ranks across everybody who has played, not just who is left', () => {
    // A departed manager's total does not stop counting because they
    // were relegated — so their presence pushes the others down.
    const withDeparted = [
      ...REAL,
      mgr({ managerId: 'ghost', name: 'Ghost', teamId: undefined, pointsFor: 99999, wins: 200, seasons: 8 }),
    ]
    const out = buildRecordBook(withDeparted, { seasonsPlayed: 8 })
    const ms = out.find((n) => n.kind === 'milestone' && n.headline.includes('career points'))
    if (ms) {
      const rank = parseInt(ms.detail.match(/(\d+)(?:st|nd|rd|th)-highest/)![1], 10)
      expect(rank).toBeGreaterThanOrEqual(2)
    }
  })
})
