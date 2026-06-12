import type { H2HRecord } from '@/editorial/types'

/** One decided game between two teams, already reduced to a winner. */
export interface H2HGame {
  a: string
  b: string
  winner: 'a' | 'b' | 'tie'
}

/** Per-ordered-pair all-time records. Each game updates BOTH directions
 *  (a-vs-b and b-vs-a) so a lookup by either team finds the row. */
export function buildH2H(games: H2HGame[]): H2HRecord[] {
  const map = new Map<string, H2HRecord>()
  const get = (teamId: string, opponentId: string): H2HRecord => {
    const key = `${teamId}|${opponentId}`
    let rec = map.get(key)
    if (!rec) {
      rec = { teamId, opponentId, wins: 0, losses: 0, ties: 0, meetings: 0 }
      map.set(key, rec)
    }
    return rec
  }
  for (const g of games) {
    if (!g.a || !g.b) continue
    const ab = get(g.a, g.b)
    const ba = get(g.b, g.a)
    ab.meetings++; ba.meetings++
    if (g.winner === 'tie') { ab.ties++; ba.ties++ }
    else if (g.winner === 'a') { ab.wins++; ba.losses++ }
    else { ab.losses++; ba.wins++ }
  }
  return [...map.values()]
}
