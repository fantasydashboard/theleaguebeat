/**
 * dailyRosterHydrator — cache-aware fetch of per-team per-day
 * roster snapshots for Phase 2 cross-team bench-blunder detection.
 *
 * Flow:
 *   1. Read the daily_rosters cache for (league, day-range).
 *   2. Identify (team, day) pairs not in the cache.
 *   3. Fetch missing pairs from the platform API (Yahoo today, ESPN
 *      later) with bounded concurrency to stay polite to the API.
 *   4. Write fresh rows back to the cache (idempotent upsert).
 *   5. Return the full merged set.
 *
 * Non-fatal: any platform-fetch failure logs a warning and skips
 * that (team, day) pair. The detector handles missing rosters by
 * not firing — no false-positive blunders.
 */

import { yahooService } from './yahoo'
import { readDailyRosters, writeDailyRosters, type DailyRoster } from './dailyRosters'
import { normalizeName } from '@/editorial/players/buildPlayerNights'

/** Yahoo's lineup-slot codes that mean "not in a starting position". */
const YAHOO_BENCH_CODES = new Set(['BN', 'IL', 'NA'])

/** Max concurrent requests to Yahoo's roster endpoint. The endpoint
 *  is per-team-per-day so we'd otherwise burst 84 calls at once
 *  for a 12-team week. Five at a time keeps total wall-time around
 *  3-5s while staying well under any reasonable rate limit. */
const YAHOO_CONCURRENCY = 5

export interface YahooHydrateOpts {
  leagueRowId: string
  teamKeys: string[]
  /** YYYY-MM-DD strings — typically a single day (yesterday) but
   *  the helper supports multi-day for future "this week" coverage. */
  days: string[]
}

/** Hydrate Yahoo daily rosters into the cache, returning every row
 *  (cached + freshly fetched) the caller needs. Safe to call
 *  redundantly — cache hits skip the network. */
export async function hydrateYahooDailyRosters(
  opts: YahooHydrateOpts,
): Promise<DailyRoster[]> {
  const { leagueRowId, teamKeys, days } = opts
  if (teamKeys.length === 0 || days.length === 0) return []
  const cached = await readDailyRosters(leagueRowId, days)
  const cachedKeys = new Set(cached.map((r) => `${r.teamId}:${r.day}`))
  const missing: { teamKey: string; day: string }[] = []
  for (const teamKey of teamKeys) {
    for (const day of days) {
      if (!cachedKeys.has(`${teamKey}:${day}`)) {
        missing.push({ teamKey, day })
      }
    }
  }
  if (missing.length === 0) return cached
  const fresh: DailyRoster[] = []
  // Bounded concurrency via chunked Promise.all. Simpler than a
  // proper p-limit and good enough for ~84 max requests.
  for (let i = 0; i < missing.length; i += YAHOO_CONCURRENCY) {
    const chunk = missing.slice(i, i + YAHOO_CONCURRENCY)
    const results = await Promise.all(
      chunk.map(async (m) => {
        try {
          const players = await yahooService.getRosterForDay(m.teamKey, m.day)
          return { ...m, players, ok: true as const }
        } catch (err) {
          console.warn(`[hydrateYahooDailyRosters] ${m.teamKey} ${m.day} failed:`, err)
          return { ...m, ok: false as const }
        }
      }),
    )
    for (const r of results) {
      if (!r.ok) continue
      fresh.push(parseYahooRosterIntoSnapshot(r.teamKey, r.day, r.players))
    }
  }
  if (fresh.length > 0) {
    // Fire-and-forget write. Failing to cache isn't fatal — the
    // detector got its data this call; the next call will just
    // re-fetch from Yahoo.
    void writeDailyRosters(leagueRowId, fresh)
  }
  return [...cached, ...fresh]
}

/** Map a Yahoo team roster (lineup-slot-decorated YahooPlayer list)
 *  into our platform-agnostic DailyRoster shape. Normalizes names
 *  so cross-source matching with MLB Stats API is reliable. */
function parseYahooRosterIntoSnapshot(
  teamKey: string,
  day: string,
  players: Awaited<ReturnType<typeof yahooService.getRosterForDay>>,
): DailyRoster {
  const started: string[] = []
  const benched: string[] = []
  const startersByPosition: Record<string, string[]> = {}
  for (const p of players) {
    const fullName = p.name?.full
    if (!fullName) continue
    const key = normalizeName(fullName)
    const pos = p.selected_position
    if (!pos) continue
    if (YAHOO_BENCH_CODES.has(pos)) {
      benched.push(key)
    } else {
      started.push(key)
      ;(startersByPosition[pos] ??= []).push(key)
    }
  }
  return {
    teamId: teamKey,
    day,
    started,
    benched,
    startersByPosition,
  }
}
