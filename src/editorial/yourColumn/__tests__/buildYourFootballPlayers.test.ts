import { describe, it, expect } from 'vitest'
import { buildYourFootballPlayers } from '../buildYourFootballPlayers'
import type { PlayerWeek } from '@/editorial/players/playerWeek'

const p = (over: Partial<PlayerWeek> & { name: string; points: number }): PlayerWeek => ({
  playerId: over.name, position: 'RB', proTeam: 'BUF', week: 1,
  teamId: 'me', started: true, ...over,
})

/** A field where the median RB start is 10 and the median QB is 20. */
const field = (extra: PlayerWeek[] = []): PlayerWeek[] => [
  p({ name: 'rb a', points: 8, teamId: 'x' }),
  p({ name: 'rb b', points: 10, teamId: 'y' }),
  p({ name: 'rb c', points: 12, teamId: 'z' }),
  p({ name: 'qb a', points: 18, position: 'QB', teamId: 'x' }),
  p({ name: 'qb b', points: 20, position: 'QB', teamId: 'y' }),
  p({ name: 'qb c', points: 22, position: 'QB', teamId: 'z' }),
  ...extra,
]

describe('judging a week against the position', () => {
  it('calls a start a standout only when it beats what the position returned', () => {
    // 18 is a huge week for a running back and a poor one for a
    // quarterback. A fixed threshold gets one of them wrong.
    const out = buildYourFootballPlayers(
      field([p({ name: 'My RB', points: 18 }), p({ name: 'My QB', points: 18, position: 'QB' })]),
      'me',
    )!
    expect(out.players.map((r) => r.name)).toEqual(['My RB'])
    expect(out.players[0].tone).toBe('up')
  })

  it('names the dud against the position average, not a made-up bar', () => {
    const out = buildYourFootballPlayers(field([p({ name: 'My RB', points: 3 })]), 'me')!
    const dud = out.players.find((r) => r.tone === 'down')!
    expect(dud.name).toBe('My RB')
    // Four RB starts now — 3, 8, 10, 12 — so the median is 9. The
    // team's own player counts in the field; he started too.
    expect(dud.line).toContain('the position averaged 9')
  })

  it('says nothing at all about an ordinary week', () => {
    // Every start near the median is not a story, and a block that
    // fires anyway is filler.
    expect(buildYourFootballPlayers(field([p({ name: 'My RB', points: 10 })]), 'me')).toBeUndefined()
  })
})

describe('the bench', () => {
  it('reports points left on it', () => {
    const out = buildYourFootballPlayers(
      field([p({ name: 'Benched', points: 24, started: false }), p({ name: 'My RB', points: 10 })]),
      'me',
    )!
    expect(out.players[0].name).toBe('Benched')
    expect(out.players[0].line).toContain('on your bench')
  })

  it('never credits a correct benching', () => {
    // "You benched someone who scored 2" is not a story anyone wants.
    const out = buildYourFootballPlayers(
      field([p({ name: 'Benched', points: 2, started: false }), p({ name: 'My RB', points: 10 })]),
      'me',
    )
    expect(out).toBeUndefined()
  })

  it('keeps bench points out of what the position "returned"', () => {
    // A manager benches whoever he expects to score least, so counting
    // the bench drags the median down and turns average starts into
    // standouts.
    // Non-zero on purpose. At 0 the median collapses to zero and the
    // divide-by-zero guard catches it instead — which passes the test
    // while proving nothing about the bench.
    //
    // Starters alone: 8, 10, 12, 12 -> median 11, so a 12 is ordinary.
    // Counting the bench: 1x6 then 8, 10, 12, 12 -> median 4.5, and
    // the same ordinary 12 reads as 2.7x the position.
    const benchNoise = Array.from({ length: 6 }, (_, i) =>
      p({ name: `scrub ${i}`, points: 1, started: false, teamId: 'x' }),
    )
    const out = buildYourFootballPlayers(
      field([...benchNoise, p({ name: 'My RB', points: 12 })]),
      'me',
    )
    expect(out).toBeUndefined()
  })
})

describe('what it refuses to do', () => {
  it('skips kickers and defences', () => {
    const k = [
      p({ name: 'k a', points: 4, position: 'K', teamId: 'x' }),
      p({ name: 'k b', points: 5, position: 'K', teamId: 'y' }),
      p({ name: 'My K', points: 19, position: 'K' }),
    ]
    expect(buildYourFootballPlayers(field(k), 'me')).toBeUndefined()
  })

  it('does not divide into a zero median', () => {
    // Every ratio would be infinite and the whole position would read
    // as a standout.
    const te = [
      p({ name: 'te a', points: 0, position: 'TE', teamId: 'x' }),
      p({ name: 'te b', points: 0, position: 'TE', teamId: 'y' }),
      p({ name: 'My TE', points: 14, position: 'TE' }),
    ]
    expect(buildYourFootballPlayers(field(te), 'me')).toBeUndefined()
  })

  it('reads only the most recent week', () => {
    const out = buildYourFootballPlayers(
      [
        ...field().map((w) => ({ ...w, week: 2 })),
        p({ name: 'Last week hero', points: 40, week: 1 }),
        p({ name: 'My RB', points: 19, week: 2 }),
      ],
      'me',
    )!
    expect(out.players.map((r) => r.name)).toEqual(['My RB'])
  })

  it('stays silent for a team with nobody in the feed', () => {
    expect(buildYourFootballPlayers(field(), 'nobody')).toBeUndefined()
    expect(buildYourFootballPlayers([], 'me')).toBeUndefined()
  })
})
