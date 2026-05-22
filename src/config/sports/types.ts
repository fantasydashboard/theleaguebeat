/**
 * Sport Configuration Types
 * 
 * This defines the unified structure for all sports.
 * Each sport config provides the data needed to render
 * points leagues and category leagues consistently.
 */

export type SportType = 'football' | 'baseball' | 'basketball' | 'hockey'
export type LeagueType = 'points' | 'categories' | 'roto'
export type Platform = 'sleeper' | 'yahoo' | 'espn'

/**
 * Stat definition for display and calculation
 */
export interface StatDefinition {
  id: string
  name: string
  shortName: string
  description?: string
  // For category leagues: is lower better? (e.g., ERA, WHIP, TO)
  isNegative?: boolean
  // Decimal places for display
  precision?: number
  // How to format (number, percentage, ratio)
  format?: 'number' | 'percentage' | 'ratio'
}

/**
 * Position definition
 */
export interface PositionDefinition {
  id: string
  name: string
  shortName: string
  // Can this position be filled by multiple position types?
  eligible?: string[]
  // Is this a flex/utility position?
  isFlex?: boolean
}

/**
 * Category group (e.g., Batting vs Pitching, Offense vs Defense)
 */
export interface StatCategory {
  id: string
  name: string
  stats: StatDefinition[]
}

/**
 * Points league scoring configuration
 */
export interface PointsScoringConfig {
  // Default scoring values (can be overridden by league settings)
  defaults: Record<string, number>
  // Stat keys used for points calculation
  statKeys: string[]
}

/**
 * Platform-specific stat ID mappings
 */
export interface PlatformStatMapping {
  sleeper?: Record<string, string>
  yahoo?: Record<string, string>
  espn?: Record<string, string>
}

/**
 * Main sport configuration
 */
export interface SportConfig {
  // Basic info
  id: SportType
  name: string
  emoji: string
  color: string
  
  // Roster positions
  positions: PositionDefinition[]
  
  // Stats organized by category
  statCategories: StatCategory[]
  
  // All stats flattened for quick lookup
  allStats: Record<string, StatDefinition>
  
  // Points league configuration
  pointsConfig: PointsScoringConfig
  
  // Category league stat IDs (which stats count as categories)
  categoryStatIds: string[]
  
  // Platform-specific mappings
  platformMappings: PlatformStatMapping
  
  // Season configuration
  seasonConfig: {
    regularSeasonWeeks: number
    playoffWeeks: number
    typicalPlayoffTeams: number
  }
}

/**
 * Unified matchup data structure (normalized from any platform)
 */
export interface UnifiedMatchup {
  matchupId: string
  week: number
  
  team1: UnifiedTeam
  team2: UnifiedTeam
  
  // For points leagues
  team1Score?: number
  team2Score?: number
  team1Projected?: number
  team2Projected?: number
  
  // For category leagues
  team1Categories?: Record<string, number>
  team2Categories?: Record<string, number>
  team1Wins?: number
  team2Wins?: number
  ties?: number
  
  isPlayoff?: boolean
  isCompleted?: boolean
}

/**
 * Unified team data structure
 */
export interface UnifiedTeam {
  teamId: string
  name: string
  owner?: string
  avatar?: string
  record?: {
    wins: number
    losses: number
    ties?: number
  }
  pointsFor?: number
  pointsAgainst?: number
  // For category leagues
  categoryWins?: number
  categoryLosses?: number
  categoryTies?: number
}

/**
 * Unified player data structure
 */
export interface UnifiedPlayer {
  playerId: string
  name: string
  position: string
  team?: string // NFL/MLB/NBA/NHL team
  avatar?: string
  
  // Current week stats
  stats?: Record<string, number>
  points?: number
  projected?: number
  
  // Season totals
  seasonStats?: Record<string, number>
  seasonPoints?: number
}

/**
 * Unified standings entry
 */
export interface UnifiedStandingsEntry {
  team: UnifiedTeam
  rank: number
  wins: number
  losses: number
  ties?: number
  pointsFor: number
  pointsAgainst: number
  // Category-specific
  categoryWins?: number
  categoryLosses?: number
  categoryTies?: number
  // Calculated
  winPercentage: number
  gamesBack?: number
  streak?: string
  playoffSeed?: number
}
