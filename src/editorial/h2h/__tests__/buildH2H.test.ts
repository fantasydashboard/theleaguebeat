import { describe, it, expect } from 'vitest'
import { buildH2H, type H2HGame } from '@/editorial/h2h/buildH2H'

describe('buildH2H', () => {
  it('tallies per-ordered-pair records across games', () => {
    const games: H2HGame[] = [
      { a: 't1', b: 't2', winner: 'a' },
      { a: 't2', b: 't1', winner: 'a' }, // t2 home, t2 wins
      { a: 't1', b: 't2', winner: 'tie' },
    ]
    const recs = buildH2H(games)
    const t1v2 = recs.find((r) => r.teamId === 't1' && r.opponentId === 't2')!
    expect(t1v2).toMatchObject({ wins: 1, losses: 1, ties: 1, meetings: 3 })
    const t2v1 = recs.find((r) => r.teamId === 't2' && r.opponentId === 't1')!
    expect(t2v1).toMatchObject({ wins: 1, losses: 1, ties: 1, meetings: 3 })
  })

  it('ignores games missing a side', () => {
    const recs = buildH2H([{ a: 't1', b: '', winner: 'a' }])
    expect(recs).toHaveLength(0)
  })
})
