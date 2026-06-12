import type { PlayerNight } from './types'

/** "6.2" not "6.6666" — IP is base-10 in source but reads as base-3 outs. */
function formatIP(ip: number): string {
  const whole = Math.floor(ip)
  const frac = Math.round((ip - whole) * 10)
  return frac > 0 ? `${whole}.${frac}` : `${whole}`
}

/** Format a PlayerNight stat line into editorial-ready display.
 *  Hitter: "4-for-5, 2 HR, 6 RBI" / "3 H, 1 HR, 4 RBI" when no AB.
 *  Pitcher: "7 IP, 11 K, 0 ER" / "1 SV" / "6 IP, 0 H, 7 K" (no-hit). */
export function formatNightStats(n: PlayerNight): string {
  if (n.pitching) {
    const p = n.pitching
    const pieces: string[] = []
    if (p.noHitter || p.perfectGame) pieces.push(p.perfectGame ? 'PERFECT GAME' : 'NO-HITTER')
    if (p.inningsPitched > 0) pieces.push(`${formatIP(p.inningsPitched)} IP`)
    if (p.strikeouts > 0) pieces.push(`${p.strikeouts} K`)
    if (p.decision === 'S') pieces.push('SV')
    else if (p.decision === 'W') pieces.push('W')
    if (typeof p.earnedRuns === 'number') pieces.push(`${p.earnedRuns} ER`)
    return pieces.join(', ') || 'big start'
  }
  if (n.hitting) {
    const h = n.hitting
    const pieces: string[] = []
    if (typeof h.atBats === 'number' && h.atBats > 0) {
      pieces.push(`${h.hits}-for-${h.atBats}`)
    } else if (h.hits > 0) {
      pieces.push(`${h.hits} H`)
    }
    if (h.homeRuns > 0) pieces.push(`${h.homeRuns} HR`)
    if (h.rbi > 0) pieces.push(`${h.rbi} RBI`)
    if (h.stolenBases > 0) pieces.push(`${h.stolenBases} SB`)
    return pieces.join(', ') || 'big day'
  }
  return 'big day'
}
