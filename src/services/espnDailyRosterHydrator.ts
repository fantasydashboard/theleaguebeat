/**
 * ESPN per-day roster hydrator — parallel to dailyRosterHydrator.ts
 * (the Yahoo version). Same contract: read cache, fetch missing
 * (team, day) pairs, write back, return merged set.
 *
 * Key difference from Yahoo: ESPN's roster API takes a
 * `scoringPeriodId` (sequential day-of-season number), not a
 * YYYY-MM-DD date. We map dates onto period IDs using the league's
 * current `scoringPeriodId` as an anchor — that value corresponds
 * to "today" in ESPN's clock, so:
 *
 *    scoringPeriodId(targetDay) = todayScoringPeriodId - daysBack
 *
 * Bench detection: ESPN MLB lineup-slot IDs 16 (BE) and 17 (IL) are
 * bench/non-starting positions. Everything else is a starter.
 */

import { espnService } from './espn'
import { normalizeName } from '@/editorial/players/buildPlayerNights'
import { readDailyRosters, writeDailyRosters, type DailyRoster } from './dailyRosters'

const ESPN_BENCH_SLOT_IDS = new Set([16, 17])
const ESPN_CONCURRENCY = 3 // ESPN's proxy is slower than Yahoo's; smaller chunk

export interface EspnHydrateOpts {
  leagueRowId: string
  platformLeagueId: string
  season: number
  /** Team IDs as stringified ESPN team.id values. */
  teamIds: string[]
  /** YYYY-MM-DD strings. Usually just yesterday. */
  days: string[]
  /** ESPN scoringPeriodId for "today" — anchor for date math. */
  todayScoringPeriodId: number
}

export async function hydrateEspnDailyRosters(
  opts: EspnHydrateOpts,
): Promise<DailyRoster[]> {
  const { leagueRowId, platformLeagueId, season, teamIds, days, todayScoringPeriodId } = opts
  if (teamIds.length === 0 || days.length === 0) return []
  if (!Number.isFinite(todayScoringPeriodId) || todayScoringPeriodId < 1) {
    console.warn('[hydrateEspnDailyRosters] missing todayScoringPeriodId — skipping')
    return []
  }
  const cached = await readDailyRosters(leagueRowId, days)
  const cachedKeys = new Set(cached.map((r) => `${r.teamId}:${r.day}`))
  // Determine missing days and their corresponding scoringPeriodIds.
  // ESPN fetches one period at a time (returning ALL teams at once),
  // so we fetch by day, not by (team, day). Each missing day
  // produces one API call regardless of team count.
  const missingDays = new Set<string>()
  for (const day of days) {
    for (const teamId of teamIds) {
      if (!cachedKeys.has(`${teamId}:${day}`)) {
        missingDays.add(day)
        break
      }
    }
  }
  if (missingDays.size === 0) return cached
  const todayDate = new Date().toISOString().slice(0, 10)
  const fresh: DailyRoster[] = []
  // Bounded-concurrency per-day fetch — ESPN's proxy doesn't love
  // burst traffic so we keep this conservative.
  const missingArr = Array.from(missingDays)
  for (let i = 0; i < missingArr.length; i += ESPN_CONCURRENCY) {
    const chunk = missingArr.slice(i, i + ESPN_CONCURRENCY)
    const results = await Promise.all(
      chunk.map(async (day) => {
        const periodId = dateToScoringPeriodId(day, todayDate, todayScoringPeriodId)
        if (!Number.isFinite(periodId) || periodId < 1) {
          return { day, ok: false as const, teams: [] }
        }
        try {
          const teams = await espnService.getTeamsWithRosters(
            'baseball',
            platformLeagueId,
            season,
            periodId,
          )
          return { day, ok: true as const, teams }
        } catch (err) {
          console.warn(`[hydrateEspnDailyRosters] day ${day} (period ${periodId}) failed:`, err)
          return { day, ok: false as const, teams: [] }
        }
      }),
    )
    for (const r of results) {
      if (!r.ok) continue
      for (const t of r.teams) {
        fresh.push(parseEspnTeamRosterIntoSnapshot(String(t.id), r.day, t.roster))
      }
    }
  }
  if (fresh.length > 0) {
    void writeDailyRosters(leagueRowId, fresh)
  }
  return [...cached, ...fresh]
}

/** Date → ESPN scoringPeriodId via anchor math. todayScoringPeriodId
 *  is by definition the period for todayDate; every day back from
 *  there decrements by 1. */
function dateToScoringPeriodId(
  targetDay: string,
  todayDay: string,
  todayScoringPeriodId: number,
): number {
  const target = new Date(`${targetDay}T12:00:00Z`).getTime()
  const today = new Date(`${todayDay}T12:00:00Z`).getTime()
  if (!Number.isFinite(target) || !Number.isFinite(today)) return NaN
  const diffDays = Math.round((today - target) / (24 * 60 * 60 * 1000))
  return todayScoringPeriodId - diffDays
}

/** ESPN team.roster from parseTeamsWithRosters is a flat
 *  EspnPlayer[]. Map into the DailyRoster shape, splitting started
 *  vs benched by lineupSlotId. Names are normalized for cross-
 *  source matching with MLB Stats API output. */
function parseEspnTeamRosterIntoSnapshot(
  teamId: string,
  day: string,
  roster: any,
): DailyRoster {
  const started: string[] = []
  const benched: string[] = []
  const startersByPosition: Record<string, string[]> = {}
  // Handle both shapes parseTeamsWithRosters can produce — flat
  // EspnPlayer[] (most common) or the raw {entries:[...]} shape.
  const entries: any[] = Array.isArray(roster)
    ? roster
    : Array.isArray(roster?.entries)
    ? roster.entries
    : []
  for (const e of entries) {
    const fullName = e.fullName ?? e.playerPoolEntry?.player?.fullName
    if (!fullName) continue
    const key = normalizeName(fullName)
    const slotId = Number(e.lineupSlotId)
    if (!Number.isFinite(slotId)) continue
    if (ESPN_BENCH_SLOT_IDS.has(slotId)) {
      benched.push(key)
    } else {
      started.push(key)
      const slotLabel = e.lineupSlot ?? String(slotId)
      ;(startersByPosition[slotLabel] ??= []).push(key)
    }
  }
  return {
    teamId,
    day,
    started,
    benched,
    startersByPosition,
  }
}
