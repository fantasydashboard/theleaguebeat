/**
 * Slump reports — multi-day cold-streak detection for rostered
 * players. Distinct from single-game blow-ups (handled by the
 * player-night pipeline): a slump is a trend, not a moment.
 *
 * Pipeline:
 *   getRollingStats(start, end) → filter by ownership →
 *   filter by slump thresholds → SlumpReport[]
 *
 * Editorial output: "Yelich is .120 over the last week" or
 * "Skubal is sitting on a 7.20 ERA over 14 days."
 *
 * MVP: owned-only (no free-agent slumps — those aren't actionable).
 * Hitter window: 7 days. Pitcher window: 14 days (starters only go
 * once or twice per week, so the sample size needs longer).
 */

import {
  dateNDaysBefore,
  getRollingStats,
  yesterdayDate,
} from '@/services/mlbStats'
import { normalizeName, type NameRosterIndex, type RosterIndex } from './buildPlayerNights'

export interface SlumpReport {
  mlbId: number
  playerName: string
  position?: string
  mlbTeam?: string
  kind: 'hitter' | 'pitcher'
  /** Inclusive window the slump was measured over. */
  windowDays: number
  startDate: string
  endDate: string
  ownedByTeamIds: string[]
  summary: SlumpSummary
}

export interface SlumpSummary {
  games: number
  // Hitter fields
  atBats?: number
  hits?: number
  homeRuns?: number
  battingAverage?: number
  ops?: number
  strikeouts?: number
  // Pitcher fields
  inningsPitched?: number
  earnedRuns?: number
  era?: number
  whip?: number
}

export interface BuildSlumpReportsOpts {
  /** Inclusive end date. Default = yesterday in US/Eastern. */
  endDate?: string
  /** Days of rolling window for hitters. Default 7. */
  hitterWindow?: number
  /** Days of rolling window for pitchers. Default 14. */
  pitcherWindow?: number
  /** mlbId → ownedByTeamIds. Same shape as buildPlayerNights. */
  rosterByMlbId?: RosterIndex
  /** Fallback name-based roster index. */
  rosterByName?: NameRosterIndex
  /** Include unowned slumpers. Default false — slumps are only
   *  editorially interesting when someone has to start the player. */
  includeUnowned?: boolean
}

/**
 * Fetch + filter rolling stats into SlumpReport[]. Non-fatal: any
 * failure returns [] and downstream rendering continues unchanged.
 */
export async function buildSlumpReports(
  opts: BuildSlumpReportsOpts,
): Promise<SlumpReport[]> {
  try {
    const endDate = opts.endDate ?? yesterdayDate()
    const hitterWindow = opts.hitterWindow ?? 7
    const pitcherWindow = opts.pitcherWindow ?? 14
    const includeUnowned = opts.includeUnowned === true

    // Two windows. Pitcher window is longer because starters work
    // less frequently — a 7-day pitcher sample is usually one start.
    const [hitterStats, pitcherStats] = await Promise.all([
      getRollingStats(dateNDaysBefore(endDate, hitterWindow - 1), endDate),
      getRollingStats(dateNDaysBefore(endDate, pitcherWindow - 1), endDate),
    ])

    const out: SlumpReport[] = []

    for (const h of hitterStats.hitters) {
      if (!isHitterSlump(h)) continue
      const owned = ownersFor(h.mlbId, h.name, opts)
      if (!includeUnowned && owned.length === 0) continue
      out.push({
        mlbId: h.mlbId,
        playerName: h.name,
        position: h.position,
        mlbTeam: h.mlbTeam,
        kind: 'hitter',
        windowDays: hitterWindow,
        startDate: hitterStats.startDate,
        endDate: hitterStats.endDate,
        ownedByTeamIds: owned,
        summary: {
          games: h.games,
          atBats: h.atBats,
          hits: h.hits,
          homeRuns: h.homeRuns,
          battingAverage: h.battingAverage,
          ops: h.ops,
          strikeouts: h.strikeouts,
        },
      })
    }

    for (const p of pitcherStats.pitchers) {
      if (!isPitcherSlump(p)) continue
      const owned = ownersFor(p.mlbId, p.name, opts)
      if (!includeUnowned && owned.length === 0) continue
      out.push({
        mlbId: p.mlbId,
        playerName: p.name,
        position: p.position,
        mlbTeam: p.mlbTeam,
        kind: 'pitcher',
        windowDays: pitcherWindow,
        startDate: pitcherStats.startDate,
        endDate: pitcherStats.endDate,
        ownedByTeamIds: owned,
        summary: {
          games: p.games,
          inningsPitched: p.inningsPitched,
          earnedRuns: p.earnedRuns,
          era: p.era,
          whip: p.whip,
          strikeouts: p.strikeouts,
        },
      })
    }

    return out
  } catch (err) {
    console.warn('[buildSlumpReports] failed:', err)
    return []
  }
}

/* ─────────────────────────────────────────────────────────────────
   THRESHOLDS — what counts as a slump worth surfacing
───────────────────────────────────────────────────────────────── */

/**
 * Hitter slump: sample size ≥20 AB AND BA ≤ .180 AND OPS ≤ .550
 * over the rolling window. Bench guys and call-ups won't have
 * 20 AB in 7 days; this filters for regulars in a real funk.
 */
function isHitterSlump(h: {
  atBats: number
  battingAverage: number
  ops: number
}): boolean {
  if (h.atBats < 20) return false
  if (h.battingAverage > 0.180) return false
  if (h.ops > 0.550) return false
  return true
}

/**
 * Pitcher slump: sample size ≥10 IP AND ERA ≥ 6.00 AND WHIP ≥ 1.70
 * over the rolling window. Catches both blow-up starters and
 * unreliable relievers giving up runs across multiple outings.
 */
function isPitcherSlump(p: {
  inningsPitched: number
  era: number
  whip: number
}): boolean {
  if (p.inningsPitched < 10) return false
  if (p.era < 6.0) return false
  if (p.whip < 1.7) return false
  return true
}

/* ─────────────────────────────────────────────────────────────────
   ROSTER MATCHING — mirrors buildPlayerNights
───────────────────────────────────────────────────────────────── */

function ownersFor(
  mlbId: number,
  name: string,
  opts: BuildSlumpReportsOpts,
): string[] {
  if (opts.rosterByMlbId) {
    const direct = opts.rosterByMlbId.get(mlbId)
    if (direct && direct.length > 0) return direct
  }
  if (opts.rosterByName) {
    const key = normalizeName(name)
    const byName = opts.rosterByName.get(key)
    if (byName && byName.length > 0) return byName
  }
  return []
}
