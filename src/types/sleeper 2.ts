// Sleeper API Types
export interface SleeperUser {
  user_id: string
  username: string
  display_name: string
  avatar: string
}

export interface SleeperLeague {
  league_id: string
  name: string
  season: string
  status: string
  avatar: string
  settings: {
    playoff_week_start: number
    playoff_teams: number
    leg: number
    divisions?: number
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
  matchup_id: number
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
