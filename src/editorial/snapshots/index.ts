/**
 * Snapshot helper — saves a daily snapshot of a league's standings
 * + current-week matchups, fetches the most recent previous
 * snapshot, and diffs them into the SnapshotDelta shape detectors
 * use to emit "since your last visit" Wire stories.
 *
 * Lazy save: on every adapter load, save TODAY's snapshot if one
 * doesn't exist already (idempotent via unique constraint). First
 * visit each day locks in the baseline; subsequent visits reuse it.
 *
 * A future Vercel/Supabase cron can write snapshots at a stable
 * midnight ET hour and the rest of this code keeps working.
 */

import { supabase } from '@/lib/supabase'
import type { CategoryLeagueData } from '../types'
import type {
  LeagueSnapshot,
  SnapshotDelta,
  SnapshotMatchup,
  SnapshotStanding,
} from './types'

/* ─────────────────────────────────────────────────────────────────
   DATE HELPERS — snapshot key is YYYY-MM-DD in US/Eastern. We
   use ET because that's where MLB's day rolls over.
───────────────────────────────────────────────────────────────── */

/** Today's date in ET as YYYY-MM-DD. The "fantasy day" rollover is
 *  4am ET (after West Coast late games are final). */
export function todayDateEt(): string {
  const now = new Date()
  now.setHours(now.getHours() - 4)
  return formatYmd(now)
}

function formatYmd(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function daysBetween(earlier: string, later: string): number {
  const a = new Date(earlier + 'T00:00:00')
  const b = new Date(later + 'T00:00:00')
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24))
}

/* ─────────────────────────────────────────────────────────────────
   EXTRACT — pull the snapshot shape from CategoryLeagueData
───────────────────────────────────────────────────────────────── */

/**
 * Build the snapshot shape from a fully-hydrated CategoryLeagueData.
 * Pure projection — no IO. Used by both the save path (writes this
 * to Supabase) and adapter tests.
 */
export function extractSnapshot(data: CategoryLeagueData): LeagueSnapshot {
  const standings: SnapshotStanding[] = data.standings.map((s) => ({
    teamId: s.teamId,
    rank: s.rank,
    wins: s.wins,
    losses: s.losses,
    ties: s.ties,
  }))

  const matchups: SnapshotMatchup[] = (data.matchupsCurrentWeek ?? []).map((m) => ({
    matchupId: m.id,
    homeTeamId: m.homeTeamId,
    awayTeamId: m.awayTeamId,
    homeCatWins: m.homeCatWins,
    awayCatWins: m.awayCatWins,
    ties: m.ties,
    // Win probs captured at snapshot time so the matchup-trajectory
    // chart can rebuild a real day-by-day history (vs fabricating one).
    homeWinProb: m.homeWinProb,
    awayWinProb: m.awayWinProb,
  }))

  return {
    snapshotDate: todayDateEt(),
    currentWeek: data.currentWeek,
    standings,
    matchups,
  }
}

/* ─────────────────────────────────────────────────────────────────
   SAVE — idempotent per (leagueRowId, date)
───────────────────────────────────────────────────────────────── */

/**
 * Save today's snapshot for the league. Idempotent — if a snapshot
 * for (leagueRowId, today) already exists, the insert is a no-op
 * (the table's unique constraint enforces this).
 *
 * Non-fatal on any error. Adapters call this for the side-effect
 * but never block on it.
 *
 * `leagueRowId` is the Supabase `leagues.id` UUID (NOT the
 * platform's league_id). The user provides this from the layout's
 * activeLeague row.
 */
export async function saveSnapshot(
  leagueRowId: string,
  data: CategoryLeagueData,
): Promise<void> {
  if (!supabase) return
  try {
    const snapshot = extractSnapshot(data)
    const { error } = await supabase
      .from('league_snapshots')
      .insert({
        league_id: leagueRowId,
        snapshot_date: snapshot.snapshotDate,
        current_week: snapshot.currentWeek,
        standings: snapshot.standings,
        matchups: snapshot.matchups,
      })

    // Duplicate-key (idempotency) is the happy path; ignore.
    if (error && error.code !== '23505') {
      console.warn('[snapshots] save failed:', error)
    }
  } catch (err) {
    console.warn('[snapshots] save threw:', err)
  }
}

/* ─────────────────────────────────────────────────────────────────
   FETCH — most-recent snapshot before today
───────────────────────────────────────────────────────────────── */

/**
 * Fetch the most recent snapshot strictly BEFORE today. Used as the
 * "previous state" baseline for the diff. Returns null when no
 * prior snapshot exists (first visit ever to this league).
 */
export async function fetchPreviousSnapshot(
  leagueRowId: string,
): Promise<LeagueSnapshot | null> {
  if (!supabase) return null
  try {
    const today = todayDateEt()
    const { data, error } = await supabase
      .from('league_snapshots')
      .select('snapshot_date, current_week, standings, matchups')
      .eq('league_id', leagueRowId)
      .lt('snapshot_date', today)
      .order('snapshot_date', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error || !data) return null
    return {
      snapshotDate: data.snapshot_date,
      currentWeek: data.current_week,
      standings: data.standings as SnapshotStanding[],
      matchups: data.matchups as SnapshotMatchup[],
    }
  } catch (err) {
    console.warn('[snapshots] fetch failed:', err)
    return null
  }
}

/* ─────────────────────────────────────────────────────────────────
   DIFF — compare today's live data vs previous snapshot
───────────────────────────────────────────────────────────────── */

/**
 * Diff today's data against the previous snapshot. Returns null
 * when no diff is possible (no previous snapshot, or the previous
 * snapshot is from a different week so cat-flip comparisons would
 * be meaningless).
 */
export function diffSnapshot(
  today: CategoryLeagueData,
  previous: LeagueSnapshot | null,
): SnapshotDelta | null {
  if (!previous) return null

  // Cross-week comparisons aren't editorially valid for matchup
  // shifts — the matchups themselves changed. Still compute rank
  // shifts (those are season-long meaningful) but skip matchup
  // diffing when weeks differ.
  const sameWeek = previous.currentWeek === today.currentWeek
  const todayDate = todayDateEt()

  // Rank shifts — only include teams with non-zero delta.
  const previousRanks = new Map<string, number>()
  for (const s of previous.standings) previousRanks.set(s.teamId, s.rank)

  const rankShifts: SnapshotDelta['rankShifts'] = []
  for (const s of today.standings) {
    const prev = previousRanks.get(s.teamId)
    if (prev == null || prev === s.rank) continue
    rankShifts.push({
      teamId: s.teamId,
      previousRank: prev,
      currentRank: s.rank,
      // Positive = climbed (lower rank number = better).
      delta: prev - s.rank,
    })
  }

  // Matchup shifts — only when same week.
  const matchupShifts: SnapshotDelta['matchupShifts'] = []
  if (sameWeek) {
    const previousMatchups = new Map<string, SnapshotMatchup>()
    for (const m of previous.matchups) previousMatchups.set(m.matchupId, m)

    for (const m of today.matchupsCurrentWeek ?? []) {
      const prev = previousMatchups.get(m.id)
      if (!prev) continue

      const homeCatDelta = m.homeCatWins - prev.homeCatWins
      const awayCatDelta = m.awayCatWins - prev.awayCatWins
      if (homeCatDelta === 0 && awayCatDelta === 0) continue

      const leadNow = leadOf(m.homeCatWins, m.awayCatWins)
      const leadThen = leadOf(prev.homeCatWins, prev.awayCatWins)

      matchupShifts.push({
        matchupId: m.id,
        homeTeamId: m.homeTeamId,
        awayTeamId: m.awayTeamId,
        homeCatDelta,
        awayCatDelta,
        leadNow,
        leadThen,
        tipped: leadNow !== leadThen,
      })
    }
  }

  return {
    previousDate: previous.snapshotDate,
    daysSince: daysBetween(previous.snapshotDate, todayDate),
    rankShifts,
    matchupShifts,
  }
}

function leadOf(home: number, away: number): 'home' | 'away' | 'tied' {
  if (home > away) return 'home'
  if (away > home) return 'away'
  return 'tied'
}

/* ─────────────────────────────────────────────────────────────────
   WEEK SNAPSHOTS — all captured days for the current week. Drives the
   matchup-trajectory chart (real captured points, no fabrication).
───────────────────────────────────────────────────────────────── */

/** All snapshots saved for this league/week, oldest first. Empty when
 *  no history has been captured yet (first visit, first day). */
export async function fetchWeekSnapshots(
  leagueRowId: string,
  currentWeek: number,
): Promise<LeagueSnapshot[]> {
  if (!supabase) return []
  try {
    const { data, error } = await supabase
      .from('league_snapshots')
      .select('snapshot_date, current_week, standings, matchups')
      .eq('league_id', leagueRowId)
      .eq('current_week', currentWeek)
      .order('snapshot_date', { ascending: true })
    if (error || !data) return []
    return data.map((row: any) => ({
      snapshotDate: row.snapshot_date as string,
      currentWeek: row.current_week as number,
      standings: row.standings as SnapshotStanding[],
      matchups: row.matchups as SnapshotMatchup[],
    }))
  } catch (err) {
    console.warn('[snapshots] week fetch failed:', err)
    return []
  }
}

/** Convert a YYYY-MM-DD date string to a day-of-week index where Mon=0
 *  and Sun=6. Matches the matchups-projection.ts helper. */
function dayIndexFromDateString(yyyymmdd: string): number {
  const d = new Date(yyyymmdd + 'T12:00:00')
  const dow = d.getDay()   // 0=Sun..6=Sat
  return dow === 0 ? 6 : dow - 1
}

/** Build a 7-day win-prob trajectory for one matchup. Captured days
 *  come from snapshots (isProjection=false). Past days without a
 *  snapshot forward-fill from the last known point. Today is the
 *  current adapter projection (isProjection=false, since it's
 *  measured now). Future days hold the current projection forward
 *  with isProjection=true. */
export function buildDailyTrendForMatchup(
  matchupId: string,
  currentHomeWinProb: number | undefined,
  currentAwayWinProb: number | undefined,
  snapshots: LeagueSnapshot[],
  todayDayIndex: number,
): Array<{ day: number; homeWinProb: number; awayWinProb: number; isProjection: boolean }> {
  // Index captured days for THIS matchup.
  const captured = new Map<number, { homeWinProb: number; awayWinProb: number }>()
  for (const snap of snapshots) {
    const day = dayIndexFromDateString(snap.snapshotDate)
    const m = snap.matchups.find((x) => x.matchupId === matchupId)
    if (!m || m.homeWinProb === undefined || m.awayWinProb === undefined) continue
    captured.set(day, { homeWinProb: m.homeWinProb, awayWinProb: m.awayWinProb })
  }

  const points: Array<{ day: number; homeWinProb: number; awayWinProb: number; isProjection: boolean }> = []
  let lastKnown: { homeWinProb: number; awayWinProb: number } | null = null

  for (let day = 0; day <= 6; day++) {
    const snap = captured.get(day)
    if (snap) {
      lastKnown = snap
      points.push({ day, homeWinProb: snap.homeWinProb, awayWinProb: snap.awayWinProb, isProjection: false })
      continue
    }
    if (day === todayDayIndex) {
      const hp = currentHomeWinProb ?? lastKnown?.homeWinProb ?? 0.5
      const ap = currentAwayWinProb ?? lastKnown?.awayWinProb ?? 0.5
      lastKnown = { homeWinProb: hp, awayWinProb: ap }
      points.push({ day, homeWinProb: hp, awayWinProb: ap, isProjection: false })
      continue
    }
    if (day < todayDayIndex) {
      // Past day, missed snapshot — forward-fill from last known (or
      // 50/50 if nothing came before).
      const hp = lastKnown?.homeWinProb ?? 0.5
      const ap = lastKnown?.awayWinProb ?? 0.5
      points.push({ day, homeWinProb: hp, awayWinProb: ap, isProjection: false })
      continue
    }
    // Future day — current projection held forward.
    const hp = lastKnown?.homeWinProb ?? currentHomeWinProb ?? 0.5
    const ap = lastKnown?.awayWinProb ?? currentAwayWinProb ?? 0.5
    points.push({ day, homeWinProb: hp, awayWinProb: ap, isProjection: true })
  }

  return points
}

/** Attach `dailyTrend` to each current-week matchup. Reads saved
 *  week-snapshots + the current live projection. Mutates the data
 *  in place. Non-fatal on any error. */
export async function hydrateMatchupDailyTrends(
  leagueRowId: string | undefined,
  data: CategoryLeagueData,
): Promise<void> {
  if (!leagueRowId || !data.matchupsCurrentWeek?.length) return
  try {
    const snapshots = await fetchWeekSnapshots(leagueRowId, data.currentWeek)
    const todayDayIndex = dayIndexFromDateString(todayDateEt())
    for (const m of data.matchupsCurrentWeek) {
      // A "captured day" is a snapshot that physically exists in the
      // DB for this matchup on a day OTHER than today. Today's value
      // is always the current adapter projection (not a saved row),
      // so it doesn't count as history — the chart needs at least one
      // real prior day to be honest.
      let hasPriorCapture = false
      for (const snap of snapshots) {
        const matched = snap.matchups.find((x) => x.matchupId === m.id)
        if (!matched || matched.homeWinProb === undefined) continue
        const day = dayIndexFromDateString(snap.snapshotDate)
        if (day !== todayDayIndex) {
          hasPriorCapture = true
          break
        }
      }
      if (!hasPriorCapture) continue

      m.dailyTrend = buildDailyTrendForMatchup(
        m.id,
        m.homeWinProb,
        m.awayWinProb,
        snapshots,
        todayDayIndex,
      )
    }
  } catch (err) {
    console.warn('[snapshots] hydrateMatchupDailyTrends failed:', err)
  }
}

/* ─────────────────────────────────────────────────────────────────
   ADAPTER HOOK — combined fetch + save + diff
───────────────────────────────────────────────────────────────── */

/**
 * Single entry point for adapters: fetch the previous snapshot,
 * compute the delta against today's live data, and lazily save
 * today's snapshot for tomorrow's comparison. Returns the delta
 * (or null when no comparison is possible).
 *
 * Save is fire-and-forget so the adapter doesn't wait on the
 * round-trip — only the previous-snapshot fetch is awaited.
 */
export async function hydrateSnapshotDelta(
  leagueRowId: string | undefined,
  data: CategoryLeagueData,
): Promise<SnapshotDelta | null> {
  if (!leagueRowId) return null
  const previous = await fetchPreviousSnapshot(leagueRowId)
  // Fire-and-forget — don't block the page load on the save.
  void saveSnapshot(leagueRowId, data)
  return diffSnapshot(data, previous)
}
