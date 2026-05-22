/**
 * Sports Configuration Index
 * 
 * Central export point for all sport configurations.
 * Provides helper functions for accessing sport-specific data.
 */

import { footballConfig } from './football'
import { baseballConfig } from './baseball'
import { basketballConfig } from './basketball'
import { hockeyConfig } from './hockey'
import type { SportConfig, SportType, LeagueType, StatDefinition } from './types'

// Re-export types
export * from './types'

// Export individual configs
export { footballConfig } from './football'
export { baseballConfig } from './baseball'
export { basketballConfig } from './basketball'
export { hockeyConfig } from './hockey'

// =============================================================================
// SPORT CONFIG MAP
// =============================================================================

export const sportConfigs: Record<SportType, SportConfig> = {
  football: footballConfig,
  baseball: baseballConfig,
  basketball: basketballConfig,
  hockey: hockeyConfig,
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get sport configuration by sport type
 */
export function getSportConfig(sport: SportType): SportConfig {
  const config = sportConfigs[sport]
  if (!config) {
    console.warn(`[SportConfig] Unknown sport: ${sport}, defaulting to football`)
    return footballConfig
  }
  return config
}

/**
 * Get stat definition for a specific sport
 */
export function getStatDefinition(sport: SportType, statId: string): StatDefinition | undefined {
  return getSportConfig(sport).allStats[statId]
}

/**
 * Get all category stat definitions for a sport
 */
export function getCategoryStats(sport: SportType): StatDefinition[] {
  const config = getSportConfig(sport)
  return config.categoryStatIds
    .map(id => config.allStats[id])
    .filter(Boolean)
}

/**
 * Format a stat value according to its definition
 */
export function formatStatValue(
  sport: SportType, 
  statId: string, 
  value: number | undefined | null
): string {
  if (value === undefined || value === null) return '-'
  
  const stat = getStatDefinition(sport, statId)
  if (!stat) return String(value)
  
  const precision = stat.precision ?? 0
  
  switch (stat.format) {
    case 'percentage':
      return `${value.toFixed(precision)}%`
    case 'ratio':
      return value.toFixed(precision)
    default:
      return precision === 0 ? String(Math.round(value)) : value.toFixed(precision)
  }
}

/**
 * Determine if a stat is "negative" (lower is better)
 * Used for category league win/loss calculation
 */
export function isNegativeStat(sport: SportType, statId: string): boolean {
  const stat = getStatDefinition(sport, statId)
  return stat?.isNegative ?? false
}

/**
 * Get the color for a sport
 */
export function getSportColor(sport: SportType): string {
  return getSportConfig(sport).color
}

/**
 * Get the emoji for a sport
 */
export function getSportEmoji(sport: SportType): string {
  return getSportConfig(sport).emoji
}

/**
 * Get display name for a sport
 */
export function getSportName(sport: SportType): string {
  return getSportConfig(sport).name
}

/**
 * Determine league type from scoring type string
 */
export function getLeagueType(scoringType: string | undefined): LeagueType {
  if (!scoringType) return 'points'
  
  const type = scoringType.toLowerCase()
  
  if (type.includes('roto')) return 'roto'
  if (type.includes('cat') || type === 'head' || type === 'headone') return 'categories'
  
  return 'points'
}

/**
 * Check if a sport typically supports category leagues
 */
export function supportsCategoryLeagues(sport: SportType): boolean {
  const config = getSportConfig(sport)
  return config.categoryStatIds.length > 0
}

/**
 * Get positions for a sport
 */
export function getPositions(sport: SportType) {
  return getSportConfig(sport).positions
}

/**
 * Get starter positions (non-bench, non-IR)
 */
export function getStarterPositions(sport: SportType) {
  return getSportConfig(sport).positions.filter(p => 
    !['BN', 'IR', 'IR+', 'IL', 'IL+', 'NA'].includes(p.id)
  )
}

/**
 * Calculate points for a player based on their stats and league scoring settings
 */
export function calculatePoints(
  sport: SportType,
  stats: Record<string, number>,
  scoringSettings?: Record<string, number>
): number {
  const config = getSportConfig(sport)
  const scoring = { ...config.pointsConfig.defaults, ...scoringSettings }
  
  let points = 0
  
  for (const statKey of config.pointsConfig.statKeys) {
    const statValue = stats[statKey] || 0
    const scoringValue = scoring[statKey] || 0
    points += statValue * scoringValue
  }
  
  return points
}

/**
 * Compare two category values and determine winner
 * Returns: 1 if team1 wins, -1 if team2 wins, 0 if tie
 */
export function compareCategoryValues(
  sport: SportType,
  statId: string,
  team1Value: number,
  team2Value: number
): number {
  const isNegative = isNegativeStat(sport, statId)
  
  if (team1Value === team2Value) return 0
  
  if (isNegative) {
    // Lower is better (ERA, WHIP, TO, etc.)
    return team1Value < team2Value ? 1 : -1
  } else {
    // Higher is better
    return team1Value > team2Value ? 1 : -1
  }
}

/**
 * Calculate category matchup result
 */
export function calculateCategoryMatchup(
  sport: SportType,
  team1Stats: Record<string, number>,
  team2Stats: Record<string, number>,
  categoryIds?: string[]
): { team1Wins: number; team2Wins: number; ties: number } {
  const config = getSportConfig(sport)
  const categories = categoryIds || config.categoryStatIds
  
  let team1Wins = 0
  let team2Wins = 0
  let ties = 0
  
  for (const statId of categories) {
    const result = compareCategoryValues(
      sport,
      statId,
      team1Stats[statId] || 0,
      team2Stats[statId] || 0
    )
    
    if (result === 1) team1Wins++
    else if (result === -1) team2Wins++
    else ties++
  }
  
  return { team1Wins, team2Wins, ties }
}

// =============================================================================
// PLATFORM STAT MAPPING HELPERS
// =============================================================================

/**
 * Map a platform-specific stat ID to our unified stat ID
 */
export function mapPlatformStatId(
  sport: SportType,
  platform: 'sleeper' | 'yahoo' | 'espn',
  platformStatId: string
): string | undefined {
  const config = getSportConfig(sport)
  const mapping = config.platformMappings[platform]
  
  if (!mapping) return undefined
  
  // Reverse lookup - find our stat ID from platform stat ID
  for (const [ourId, theirId] of Object.entries(mapping)) {
    if (theirId === platformStatId) return ourId
  }
  
  return undefined
}

/**
 * Map our unified stat ID to a platform-specific stat ID
 */
export function mapToPlatformStatId(
  sport: SportType,
  platform: 'sleeper' | 'yahoo' | 'espn',
  statId: string
): string | undefined {
  const config = getSportConfig(sport)
  const mapping = config.platformMappings[platform]
  
  if (!mapping) return undefined
  
  return mapping[statId]
}

/**
 * Convert platform stats object to unified stats object
 */
export function normalizePlatformStats(
  sport: SportType,
  platform: 'sleeper' | 'yahoo' | 'espn',
  platformStats: Record<string, number>
): Record<string, number> {
  const normalized: Record<string, number> = {}
  
  for (const [platformId, value] of Object.entries(platformStats)) {
    const unifiedId = mapPlatformStatId(sport, platform, platformId)
    if (unifiedId) {
      normalized[unifiedId] = value
    }
  }
  
  return normalized
}
