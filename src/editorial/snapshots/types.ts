/**
 * Snapshot shapes — what we persist to league_snapshots per day
 * and what shape the detector consumes for diffing.
 *
 * Narrow on purpose: we only persist the fields that drive Wire
 * stories (rank, W-L-T, current-week matchup cat-wins). Adding
 * fields means every adapter has to populate them and we eat the
 * row size — keep it tight.
 */

export interface SnapshotStanding {
  teamId: string
  rank: number
  wins: number
  losses: number
  ties: number
}

export interface SnapshotMatchup {
  matchupId: string
  homeTeamId: string
  awayTeamId: string
  homeCatWins: number
  awayCatWins: number
  ties: number
  /** Projected win probabilities at the time of the snapshot (0..1).
   *  Optional because older rows pre-date the field — the trend
   *  builder skips snapshots without it. */
  homeWinProb?: number
  awayWinProb?: number
}

export interface LeagueSnapshot {
  /** YYYY-MM-DD — the date this snapshot represents (US/Eastern). */
  snapshotDate: string
  currentWeek: number
  standings: SnapshotStanding[]
  matchups: SnapshotMatchup[]
}

/**
 * Result of diffing today vs the previous snapshot. Detectors
 * consume this to emit overnight Wire stories.
 */
export interface SnapshotDelta {
  /** Date of the comparison baseline (yyyy-mm-dd). */
  previousDate: string
  /** Days between previous snapshot and today. 1 = yesterday, 2+ =
   *  "since you last visited X days ago." */
  daysSince: number
  /** Per-team rank deltas. Positive = climbed (better rank).
   *  Negative = fell. Only includes teams with a non-zero delta. */
  rankShifts: Array<{
    teamId: string
    previousRank: number
    currentRank: number
    delta: number
  }>
  /** Per-matchup cat-tip events. A "tip" is when which side is
   *  leading the matchup flipped overnight. */
  matchupShifts: Array<{
    matchupId: string
    homeTeamId: string
    awayTeamId: string
    /** Cat-win delta vs previous snapshot.
     *  Positive = home gained ground; negative = home lost ground. */
    homeCatDelta: number
    awayCatDelta: number
    /** Which side leads now. 'tied' when even on cats. */
    leadNow: 'home' | 'away' | 'tied'
    /** Which side led at the previous snapshot. */
    leadThen: 'home' | 'away' | 'tied'
    /** True when leadNow !== leadThen — the editorial "tipped" event. */
    tipped: boolean
  }>
}
