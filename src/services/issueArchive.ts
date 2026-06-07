/**
 * Issue archive — read / write per-week snapshots of CategoryLeagueData
 * so The Issue's archive nav loads real frozen issues instead of
 * relabeling live data (the V0 theater).
 *
 * Strategy: lazy. IssueView writes on first read for any concluded
 * week. The first reader on or after Monday morning becomes the
 * canonical snapshotter. Subsequent reads hit the snapshot
 * (idempotent via the unique constraint on (league_id, year, week)).
 *
 * Past weeks that nobody visits yet remain unarchived until first
 * read after publish day — we don't backfill.
 *
 * Schema: see supabase/migrations/20260606_league_issues.sql
 */

import { supabase } from '@/lib/supabase'
import type { CategoryLeagueData } from '@/editorial/types'

export interface IssueSnapshot {
  data: CategoryLeagueData
  publishedAt: Date
}

/** Fetch a snapshot for (league, year, week). Returns null when no
 *  snapshot exists yet (the issue hasn't been canonically read
 *  after its publish day), when Supabase isn't configured, or on
 *  network error — caller decides whether to fall back to a live
 *  adapter load or render an "archive not yet available" state. */
export async function readIssueSnapshot(
  leagueId: string,
  year: number,
  weekNumber: number,
): Promise<IssueSnapshot | null> {
  if (!supabase) return null
  try {
    const { data, error } = await supabase
      .from('league_issues')
      .select('data, published_at')
      .eq('league_id', leagueId)
      .eq('year', year)
      .eq('week_number', weekNumber)
      .maybeSingle()
    if (error || !data) return null
    return {
      data: data.data as CategoryLeagueData,
      publishedAt: new Date(data.published_at),
    }
  } catch (e) {
    console.warn('[issueArchive] read failed', e)
    return null
  }
}

/** Write a snapshot. Upserts on (league_id, year, week_number) so
 *  stale snapshots get corrected on subsequent reads. Because the
 *  caller always passes data that's been through `synthesizeIssue`
 *  (which is deterministic from match history), the upsert is
 *  self-healing: the same (league, week) always produces the same
 *  payload, so re-writes are no-ops except when fixing a stale row. */
export async function writeIssueSnapshot(
  leagueId: string,
  year: number,
  weekNumber: number,
  data: CategoryLeagueData,
): Promise<void> {
  if (!supabase) return
  try {
    const { error } = await supabase
      .from('league_issues')
      .upsert(
        {
          league_id: leagueId,
          year,
          week_number: weekNumber,
          data,
          published_at: new Date().toISOString(),
        },
        { onConflict: 'league_id,year,week_number' },
      )
    if (error) {
      console.warn('[issueArchive] upsert failed', error)
    }
  } catch (e) {
    console.warn('[issueArchive] upsert threw', e)
  }
}
