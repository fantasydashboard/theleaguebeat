/**
 * daily_rosters cache — per-team per-day roster snapshots that
 * power Phase 2 cross-team bench-blunder detection.
 *
 * Read-write contract:
 *   - readDailyRosters: returns whatever rows exist for the (league,
 *     day-range) keyset. Caller dedupes against the requested set to
 *     know which (team,day) pairs still need fetching from the
 *     platform API.
 *   - writeDailyRosters: idempotent upsert on (league, team, day).
 *     Safe to call concurrently — Supabase's unique constraint
 *     handles the race.
 *
 * Schema: supabase/migrations/20260608_daily_rosters.sql
 */

import { supabase } from '@/lib/supabase'

/** A single per-team-per-day roster snapshot. All name lists are
 *  normalized (lowercase, accents stripped, suffixes dropped) so
 *  cross-source matching with MLB Stats API names is reliable. */
export interface DailyRoster {
  /** Platform team id/key (Yahoo team_key, ESPN team id stringified). */
  teamId: string
  /** YYYY-MM-DD in US/Eastern. */
  day: string
  /** Normalized names of players in a starting lineup slot. */
  started: string[]
  /** Normalized names of players on bench/IL/NA. */
  benched: string[]
  /** Optional: which starter occupies each position slot. Used by
   *  the bench-blunder detector to identify the "missed alternative"
   *  for a benched notable performer. */
  startersByPosition?: Record<string, string[]>
}

/** Read all daily-roster rows for the given league across the given
 *  day range. Returns an empty array when Supabase isn't configured
 *  or the read errors — caller treats empty as "fetch everything". */
export async function readDailyRosters(
  leagueId: string,
  days: string[],
): Promise<DailyRoster[]> {
  if (!supabase || days.length === 0) return []
  try {
    const { data, error } = await supabase
      .from('daily_rosters')
      .select('team_id, day, started_player_names, benched_player_names, starters_by_position')
      .eq('league_id', leagueId)
      .in('day', days)
    if (error || !data) return []
    return data.map((r) => ({
      teamId: r.team_id,
      day: r.day,
      started: (r.started_player_names ?? []) as string[],
      benched: (r.benched_player_names ?? []) as string[],
      startersByPosition: (r.starters_by_position ?? undefined) as
        | Record<string, string[]>
        | undefined,
    }))
  } catch (e) {
    console.warn('[dailyRosters] read failed', e)
    return []
  }
}

/** Upsert a batch of daily-roster rows. Idempotent on
 *  (league_id, team_id, day) — re-writes overwrite older values
 *  without dupe rows. Fire-and-forget; the caller is the background
 *  fetch path. */
export async function writeDailyRosters(
  leagueId: string,
  rows: DailyRoster[],
): Promise<void> {
  if (!supabase || rows.length === 0) return
  const payload = rows.map((r) => ({
    league_id: leagueId,
    team_id: r.teamId,
    day: r.day,
    started_player_names: r.started,
    benched_player_names: r.benched,
    starters_by_position: r.startersByPosition ?? null,
    updated_at: new Date().toISOString(),
  }))
  try {
    const { error } = await supabase
      .from('daily_rosters')
      .upsert(payload, { onConflict: 'league_id,team_id,day' })
    if (error) {
      console.warn('[dailyRosters] upsert failed', error)
    }
  } catch (e) {
    console.warn('[dailyRosters] upsert threw', e)
  }
}
