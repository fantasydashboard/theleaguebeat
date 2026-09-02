// Sleeper API Types
export interface SleeperUser {
  user_id: string
  username: string
  display_name: string
  avatar: string
  /** Sleeper sends a per-league metadata blob here; `team_name` is the
   *  user's custom team name and is the first naming tier. */
  metadata?: { team_name?: string | null; [k: string]: unknown } | null
}

export interface SleeperLeague {
  league_id: string
  name: string
  season: string
  status: string
  avatar: string
  /** 'nfl' | 'mlb' | 'nba' | 'nhl'. Optional because older captured
   *  shapes predate it; treat an absent value as unknown, not as MLB. */
  sport?: string
  /** Roster count. Sleeper sends it on the league payload; optional
   *  because older captured shapes predate the field. */
  total_rosters?: number
  /** Previous season's league id — Sleeper's own season lineage. */
  previous_league_id?: string | null
  settings: {
    playoff_week_start: number
    playoff_teams: number
    leg: number
    divisions?: number
    type?: number // 0 = redraft, 1 = keeper, 2 = dynasty
    [key: string]: any
  }
  scoring_settings: Record<string, number>
  roster_positions: string[]
  previous_league_id?: string
  metadata?: {
    latest_league_winner_roster_id?: number
    [key: string]: any
  }
}

export interface SleeperRoster {
  roster_id: number
  owner_id: string
  league_id: string
  players: string[]
  starters: string[]
  settings: {
    wins: number
    losses: number
    ties: number
    fpts: number
    fpts_decimal: number
    fpts_against: number
    fpts_against_decimal: number
    ppts: number
    ppts_decimal: number
    division?: number
    avatar?: string
    [key: string]: any
  }
  metadata?: {
    streak?: string
    [key: string]: any
  }
}

export interface SleeperMatchup {
  roster_id: number
  // Real data: teams outside the playoff bracket (or on a bye) carry
  // matchup_id: null -- verified against a real capture (6 of 10
  // entries in week 17, 2 in week 15). Previously typed as a bare
  // `number`, which made `pairSleeperMatchups`'s null-filter in
  // sleeperAdapter.ts look like provably-dead code.
  matchup_id: number | null
  points: number
  starters: string[]
  starters_points: number[]
  players: string[]
  players_points: Record<string, number>
  custom_points: number | null
}

export interface SleeperPlayer {
  player_id: string
  first_name: string
  last_name: string
  full_name: string
  position: string
  team: string | null
  status: string
  injury_status: string | null
  number: number
  age: number
  years_exp: number
  [key: string]: any
}

export interface SleeperTransaction {
  transaction_id: string
  type: 'trade' | 'waiver' | 'free_agent'
  status: 'complete' | 'failed'
  roster_ids: number[]
  settings: any
  adds: Record<string, number> | null
  drops: Record<string, number> | null
  draft_picks: any[]
  waiver_budget: any[]
  leg: number
  created: number
  status_updated: number
  [key: string]: any
}

// App-specific types
export interface TeamStats {
  roster_id: number
  owner_id: string
  team_name: string
  avatar_url: string
  wins: number
  losses: number
  ties: number
  points_for: number
  points_against: number
  all_play_wins: number
  all_play_losses: number
  division?: number
}

export interface PowerRanking {
  roster_id: number
  team_name: string
  avatar_url: string
  rank: number
  power_score: number
  avg_score: number
  standings_rank: number
  all_play_avg: number
  change: number
}

export interface HistoricalStats {
  user_id: string
  username: string
  avatar_url: string
  wins: number
  losses: number
  playoff_wins: number
  championships: number
  second_place: number
  third_place: number
  efficiency: number
}

export interface MatchupData {
  week: number
  team1: TeamStats
  team2: TeamStats
  team1_score: number
  team2_score: number
  projected_winner?: string
}
