/**
 * buildYourPlayers — the viewer's roster's best and worst from the most
 * recent game date. Pure. Reuses the shared formatNightStats so the lines
 * match The Beat. Two-way players are scored/rendered on their pitching
 * line (matching formatNightStats' pitcher-first priority).
 */
import type { PlayerNight } from '@/editorial/players/types'
import { formatNightStats } from '@/editorial/players/formatNightStats'

export interface YourPlayerRow {
  name: string
  line: string
  detail?: string // "OF · NYY"
  tone: 'up' | 'down'
}
export interface YourPlayersBlock {
  label: string
  eyebrow: string
  players: YourPlayerRow[] // standouts (up to 2) then the dud (0-1)
}

interface Scored {
  good: number
  bad: number
  isStandout: boolean
  isDud: boolean
}

function scoreNight(n: PlayerNight): Scored {
  if (n.pitching) {
    const p = n.pitching
    const ip = p.inningsPitched
    const gem = !!p.noHitter || !!p.perfectGame
    return {
      isStandout: gem || (ip >= 6 && p.earnedRuns <= 1) || (p.strikeouts >= 8 && p.earnedRuns <= 2),
      isDud: p.earnedRuns >= 5 || (ip <= 3 && p.earnedRuns >= 4),
      good: p.strikeouts + ip - p.earnedRuns * 2 + (gem ? 10 : 0),
      bad: p.earnedRuns * 2 + (ip <= 3 ? 3 : 0) + p.homeRunsAllowed,
    }
  }
  if (n.hitting) {
    const h = n.hitting
    return {
      isStandout: (h.hits >= 2 && h.homeRuns >= 1) || h.hits >= 3 || h.rbi >= 4 || h.homeRuns >= 2 || h.stolenBases >= 3,
      isDud: h.atBats >= 4 && h.hits === 0 && h.strikeouts >= 2,
      good: h.homeRuns * 4 + h.rbi * 1.5 + h.hits + h.stolenBases * 1.5 + h.runs * 0.5,
      bad: h.atBats + h.strikeouts,
    }
  }
  return { good: 0, bad: 0, isStandout: false, isDud: false }
}

function toRow(n: PlayerNight, tone: 'up' | 'down'): YourPlayerRow {
  let line = formatNightStats(n)
  // formatNightStats omits hitter strikeouts; a dud hitter reads better with them.
  if (tone === 'down' && n.hitting && !n.pitching && n.hitting.strikeouts > 0) {
    line += `, ${n.hitting.strikeouts} K`
  }
  const detail = [n.position, n.mlbTeam].filter(Boolean).join(' · ') || undefined
  return { name: n.name, line, detail, tone }
}

export function buildYourPlayers(nights: PlayerNight[], teamId: string): YourPlayersBlock | undefined {
  if (!nights.length) return undefined
  const latest = nights.reduce((d, n) => (n.gameDate > d ? n.gameDate : d), '')
  const mine = nights.filter((n) => n.gameDate === latest && n.ownedByTeamIds.includes(teamId))
  if (!mine.length) return undefined

  const scored = mine.map((n) => ({ n, ...scoreNight(n) }))
  const standouts = scored
    .filter((s) => s.isStandout)
    .sort((a, b) => b.good - a.good)
    .slice(0, 2)
  const standoutIds = new Set(standouts.map((s) => s.n.mlbId))
  const dud = scored
    .filter((s) => s.isDud && !standoutIds.has(s.n.mlbId))
    .sort((a, b) => b.bad - a.bad)[0]

  const players: YourPlayerRow[] = standouts.map((s) => toRow(s.n, 'up'))
  if (dud) players.push(toRow(dud.n, 'down'))
  if (!players.length) return undefined
  return { label: 'Your Players', eyebrow: 'YESTERDAY', players }
}
