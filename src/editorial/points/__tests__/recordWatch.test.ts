import { describe, it, expect } from 'vitest'
import { buildWeeklyRecordBook } from '../recordWatch'
import type { CareerRecord } from '../recordBook'

const mgr = (over: Partial<CareerRecord> & { managerId: string }): CareerRecord => ({
  name: over.managerId, teamId: over.managerId, seasons: 8,
  wins: 0, losses: 0, ties: 0, pointsFor: 0, titles: 0, lasts: 0,
  ...over,
})

/** The real League of Record, before week 1. */
const BEFORE: CareerRecord[] = [
  mgr({ managerId: 'mallards', name: 'Mighty Mallards', wins: 60, pointsFor: 11367 }),
  mgr({ managerId: 'gridiron', name: 'Gridiron Man', wins: 59, pointsFor: 11242 }),
  mgr({ managerId: 'scuttle', name: 'Scuttlebucs', wins: 52, pointsFor: 11540 }),
  mgr({ managerId: 'juggs', name: 'The Juggernauts', wins: 42, pointsFor: 7853, seasons: 6 }),
]

/** Same league with a week applied. */
const after = (deltas: Record<string, { w?: number; pf?: number }>) =>
  BEFORE.map((c) => ({
    ...c,
    wins: c.wins + (deltas[c.managerId]?.w ?? 0),
    pointsFor: c.pointsFor + (deltas[c.managerId]?.pf ?? 0),
  }))

const base = { seasonsPlayed: 8 }

describe('the chase keeps being reported', () => {
  it('says the gap held when both the leader and the chaser win', () => {
    // 61 to 60 is still one apart, and that is still the story. A
    // section that only speaks when a record CHANGES goes quiet on
    // exactly the weeks a reader is watching hardest.
    const notes = buildWeeklyRecordBook({
      ...base,
      before: BEFORE,
      careers: after({ mallards: { w: 1, pf: 120 }, gridiron: { w: 1, pf: 118 } }),
    })
    const race = notes.find((n) => n.kind === 'chase')!
    expect(race).toBeDefined()
    expect(race.detail).toContain('Still one back')
    // Both sides of the race, so the row can draw the comparison
    // rather than a lone bar the reader has to interpret.
    expect(race.progress).toEqual({ value: 60, target: 61 })
    expect(race.against).toEqual({ name: 'Mighty Mallards', value: 61, teamId: 'mallards' })
  })

  it('reports the gap closing', () => {
    const notes = buildWeeklyRecordBook({
      ...base,
      before: BEFORE,
      careers: after({ gridiron: { w: 1, pf: 118 } }),
    })
    const moved = notes.find((n) => n.kind === 'moved')!
    expect(moved.detail).toContain('Level')
    expect(moved.headline).toBe('60 wins')
  })

  it('reports the gap widening', () => {
    const notes = buildWeeklyRecordBook({
      ...base,
      before: BEFORE,
      careers: after({ mallards: { w: 1, pf: 120 } }),
    })
    const race = notes.find((n) => n.kind === 'chase')!
    expect(race.detail).toContain('two back')
  })

  it('reports an outright overtake as news', () => {
    const notes = buildWeeklyRecordBook({
      ...base,
      before: after({ gridiron: { w: 1 } }),      // level at 60
      careers: after({ gridiron: { w: 2 } }),     // 61, clear
    })
    const moved = notes.find((n) => n.kind === 'moved')!
    expect(moved.managerId).toBe('gridiron')
    expect(moved.detail).toMatch(/alone at the top|outright/i)
  })
})

describe('milestones inside a week', () => {
  it('draws the chase as well as stating it', () => {
    // 7,986 of 8,000 — the bar is the point.
    const notes = buildWeeklyRecordBook({
      ...base,
      before: BEFORE,
      careers: after({ juggs: { pf: 133 } }),
    })
    const ms = notes.find((n) => n.kind === 'milestone')!
    expect(ms.headline).toBe('8,000 pts')
    expect(ms.detail).toMatch(/14 away/)
    // Scaled to a WEEK, not to 8,000 — otherwise 14-away and 140-away
    // both render as a bar at ~99% and the drawing says nothing.
    const pace = ms.progress!.target
    expect(pace).toBeGreaterThan(80)
    expect(pace).toBeLessThan(120)
    expect(ms.progress!.value / pace).toBeGreaterThan(0.8)
  })

  it('says nothing about a number three seasons out', () => {
    const notes = buildWeeklyRecordBook({
      ...base,
      before: BEFORE,
      careers: after({ juggs: { pf: 1 } }),   // 7,854 — 146 short
    })
    // 146 at ~131 a week is over a week away; it can wait.
    expect(notes.some((n) => n.kind === 'milestone' && n.managerId === 'juggs')).toBe(false)
  })
})

describe('what it refuses to do', () => {
  it('stays silent on a league with no history', () => {
    expect(buildWeeklyRecordBook({ before: [], careers: [], seasonsPlayed: 0 })).toEqual([])
    expect(
      buildWeeklyRecordBook({ before: BEFORE, careers: BEFORE, seasonsPlayed: 1 }),
    ).toEqual([])
  })

  it('never hands a record to somebody who left the league', () => {
    const gone = [...BEFORE, mgr({ managerId: 'ghost', name: 'Ghost', teamId: undefined, wins: 99 })]
    const notes = buildWeeklyRecordBook({ ...base, before: gone, careers: gone })
    expect(notes.every((n) => n.managerId !== 'ghost')).toBe(true)
  })

  it('gives one row per manager, most urgent first', () => {
    const notes = buildWeeklyRecordBook({
      ...base,
      before: BEFORE,
      careers: after({ gridiron: { w: 1, pf: 118 }, juggs: { pf: 133 } }),
    })
    const ids = notes.map((n) => n.managerId)
    expect(new Set(ids).size).toBe(ids.length)
    // Something that HAPPENED outranks something that might.
    expect(notes[0].kind).toBe('moved')
  })
})

describe('a rank says what it is worth', () => {
  it('names how far back the team above is', () => {
    // "6th-highest scorer all time" is a placing. The distance to
    // fifth is the thing that makes it a race.
    const notes = buildWeeklyRecordBook({
      ...base,
      before: BEFORE,
      careers: after({ juggs: { pf: 133 } }),
    })
    const ms = notes.find((n) => n.kind === 'milestone' && n.managerId === 'juggs')!
    expect(ms.detail).toMatch(/behind .+ in 3rd/)
  })

  it('gives the leader their daylight instead', () => {
    const top = [
      mgr({ managerId: 'king', name: 'King', pointsFor: 11_960, seasons: 8 }),
      mgr({ managerId: 'second', name: 'Second', pointsFor: 11_000, seasons: 8 }),
    ]
    const notes = buildWeeklyRecordBook({ ...base, before: top, careers: top })
    const ms = notes.find((n) => n.kind === 'milestone' && n.managerId === 'king')!
    expect(ms.detail).toContain('The most in league history')
    expect(ms.detail).toContain('960 clear of Second')
  })
})
