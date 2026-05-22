/**
 * Ranking Factors Service
 * 
 * Provides customizable ranking factors that users can toggle on/off
 * to create personalized player rankings based on their preferences.
 */

import type { SleeperMatchup } from '@/types/sleeper'

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface RankingFactorConfig {
  id: string
  name: string
  description: string
  category: 'core' | 'performance' | 'schedule' | 'context' | 'advanced'
  enabled: boolean
  weight: number // 0-100, how much this factor influences final score
  requiresExternalAPI: boolean
  icon: string
}

export interface RankingPreset {
  id: string
  name: string
  description: string
  icon: string
  factors: Record<string, boolean>
}

export interface PlayerRankingData {
  player_id: string
  
  // Base metrics
  baseProjection: number       // Sleeper's projection
  seasonPPG: number            // Season average PPG
  
  // Performance metrics
  recentPPG: number            // Last 4 weeks average
  trendMultiplier: number      // recentPPG / seasonPPG
  consistency: number          // Lower = more consistent (std dev)
  weeklyScores: number[]       // All weekly scores
  ceiling: number              // 75th percentile performance
  floor: number                // 25th percentile performance
  
  // Schedule metrics
  rosSOS: number               // Rest of season SOS (-1 to 1, positive = easy)
  next4SOS: number             // Next 4 weeks SOS
  playoffSOS: number           // Weeks 15-17 SOS
  
  // Context metrics
  teamPace: number             // Plays per game relative to league avg
  passRatio: number            // Team pass/run ratio
  redZoneShare: number         // Red zone opportunities
  garbageTimeBoost: number     // Boost for teams often trailing
  
  // Advanced metrics (external API)
  vegasImpliedTotal: number    // Expected team points from Vegas
  vegasSpread: number          // Point spread
  weatherImpact: number        // Weather penalty (wind/rain)
  
  // Status
  injuryStatus: string | null
  byeWeek: number | null
  gamesRemaining: number
}

export interface CalculatedRanking {
  player_id: string
  full_name: string
  position: string
  team: string
  
  // Final scores
  finalScore: number
  baseScore: number
  
  // Factor contributions (for transparency)
  factorBreakdown: {
    factor: string
    contribution: number
    multiplier: number
  }[]
  
  // Rankings
  overallRank: number
  positionRank: number
  
  // Display helpers
  trendIndicator: 'hot' | 'cold' | 'neutral'
  consistencyRating: 'elite' | 'stable' | 'volatile' | 'boom-bust'
  injuryStatus: string | null
  
  // Raw data for tooltips
  rawData: PlayerRankingData
}

// ============================================================================
// DEFAULT FACTOR CONFIGURATIONS
// ============================================================================

export const DEFAULT_FACTORS: RankingFactorConfig[] = [
  // CORE FACTORS (Always calculated, some always on)
  {
    id: 'baseProjection',
    name: 'Base Projections',
    description: "Sleeper's weekly PPR projections averaged for remaining season",
    category: 'core',
    enabled: true,
    weight: 100,
    requiresExternalAPI: false,
    icon: '📊'
  },
  {
    id: 'vor',
    name: 'Value Over Replacement',
    description: 'Points above replacement-level player at each position',
    category: 'core',
    enabled: true,
    weight: 100,
    requiresExternalAPI: false,
    icon: '📈'
  },
  {
    id: 'positionalScarcity',
    name: 'Positional Scarcity',
    description: 'RB/TE weighted higher due to shallower talent pools',
    category: 'core',
    enabled: true,
    weight: 50,
    requiresExternalAPI: false,
    icon: '⚖️'
  },
  {
    id: 'gamesRemaining',
    name: 'Games Remaining',
    description: 'Accounts for bye weeks reducing total output',
    category: 'core',
    enabled: true,
    weight: 100,
    requiresExternalAPI: false,
    icon: '📅'
  },
  
  // PERFORMANCE FACTORS
  {
    id: 'recentTrend',
    name: 'Recent Trend (Hot/Cold)',
    description: 'Last 4 weeks performance vs season average - rewards hot streaks',
    category: 'performance',
    enabled: false,
    weight: 75,
    requiresExternalAPI: false,
    icon: '🔥'
  },
  {
    id: 'consistency',
    name: 'Consistency Bonus',
    description: 'Rewards players with steady week-to-week production',
    category: 'performance',
    enabled: false,
    weight: 50,
    requiresExternalAPI: false,
    icon: '🎯'
  },
  {
    id: 'ceilingMode',
    name: 'Ceiling Mode',
    description: 'Prioritize boom potential over safe floor',
    category: 'performance',
    enabled: false,
    weight: 75,
    requiresExternalAPI: false,
    icon: '🚀'
  },
  {
    id: 'floorMode',
    name: 'Floor Mode',
    description: 'Prioritize safe floor over boom potential',
    category: 'performance',
    enabled: false,
    weight: 75,
    requiresExternalAPI: false,
    icon: '🛡️'
  },
  {
    id: 'injuryDiscount',
    name: 'Injury Discount',
    description: 'Reduce projections for players with injury designations',
    category: 'performance',
    enabled: false,
    weight: 100,
    requiresExternalAPI: false,
    icon: '🏥'
  },
  
  // SCHEDULE FACTORS
  {
    id: 'rosSOS',
    name: 'ROS Strength of Schedule',
    description: 'Average remaining matchup difficulty for the season',
    category: 'schedule',
    enabled: false,
    weight: 50,
    requiresExternalAPI: false,
    icon: '📆'
  },
  {
    id: 'next4SOS',
    name: 'Next 4 Weeks SOS',
    description: 'Short-term schedule focus for immediate value',
    category: 'schedule',
    enabled: false,
    weight: 50,
    requiresExternalAPI: false,
    icon: '4️⃣'
  },
  {
    id: 'playoffSOS',
    name: 'Playoff Schedule (Wk 15-17)',
    description: 'Only considers championship week matchups',
    category: 'schedule',
    enabled: false,
    weight: 75,
    requiresExternalAPI: false,
    icon: '🏆'
  },
  
  // CONTEXT FACTORS
  {
    id: 'teamPace',
    name: 'Team Pace',
    description: 'High-pace offenses create more fantasy opportunities',
    category: 'context',
    enabled: false,
    weight: 25,
    requiresExternalAPI: false,
    icon: '⚡'
  },
  {
    id: 'passRunRatio',
    name: 'Pass/Run Ratio',
    description: 'Pass-heavy helps WR/TE, run-heavy helps RB',
    category: 'context',
    enabled: false,
    weight: 25,
    requiresExternalAPI: false,
    icon: '🏈'
  },
  {
    id: 'redZoneOpportunity',
    name: 'Red Zone Opportunity',
    description: 'Teams with more red zone trips boost TD-dependent players',
    category: 'context',
    enabled: false,
    weight: 25,
    requiresExternalAPI: false,
    icon: '🎯'
  },
  {
    id: 'garbageTime',
    name: 'Garbage Time Factor',
    description: 'Teams often trailing get more passing volume',
    category: 'context',
    enabled: false,
    weight: 25,
    requiresExternalAPI: false,
    icon: '🗑️'
  },
  
  // ADVANCED FACTORS (External API)
  {
    id: 'vegasImplied',
    name: 'Vegas Implied Total',
    description: 'Game over/under predicts scoring environment',
    category: 'advanced',
    enabled: false,
    weight: 50,
    requiresExternalAPI: true,
    icon: '🎰'
  },
  {
    id: 'vegasSpread',
    name: 'Vegas Spread Impact',
    description: 'Big underdogs get garbage time passing boost',
    category: 'advanced',
    enabled: false,
    weight: 25,
    requiresExternalAPI: true,
    icon: '📉'
  },
  {
    id: 'weather',
    name: 'Weather Impact',
    description: 'Wind and rain reduce passing efficiency',
    category: 'advanced',
    enabled: false,
    weight: 25,
    requiresExternalAPI: true,
    icon: '🌧️'
  }
]

// ============================================================================
// PRESET CONFIGURATIONS
// ============================================================================

export const RANKING_PRESETS: RankingPreset[] = [
  {
    id: 'standard',
    name: 'Standard',
    description: 'Balanced approach using core metrics',
    icon: '⚖️',
    factors: {
      baseProjection: true,
      vor: true,
      positionalScarcity: true,
      gamesRemaining: true,
      recentTrend: false,
      consistency: false,
      ceilingMode: false,
      floorMode: false,
      injuryDiscount: false,
      rosSOS: false,
      next4SOS: false,
      playoffSOS: false,
      teamPace: false,
      passRunRatio: false,
      redZoneOpportunity: false,
      garbageTime: false,
      vegasImplied: false,
      vegasSpread: false,
      weather: false
    }
  },
  {
    id: 'upside',
    name: 'Upside Hunter',
    description: 'Maximize ceiling - for when you need to swing for the fences',
    icon: '🚀',
    factors: {
      baseProjection: true,
      vor: true,
      positionalScarcity: true,
      gamesRemaining: true,
      recentTrend: true,
      consistency: false,
      ceilingMode: true,
      floorMode: false,
      injuryDiscount: false,
      rosSOS: false,
      next4SOS: false,
      playoffSOS: false,
      teamPace: true,
      passRunRatio: false,
      redZoneOpportunity: true,
      garbageTime: false,
      vegasImplied: false,
      vegasSpread: false,
      weather: false
    }
  },
  {
    id: 'safe',
    name: 'Safe Floor',
    description: 'Minimize risk - consistent producers with low variance',
    icon: '🛡️',
    factors: {
      baseProjection: true,
      vor: true,
      positionalScarcity: true,
      gamesRemaining: true,
      recentTrend: false,
      consistency: true,
      ceilingMode: false,
      floorMode: true,
      injuryDiscount: true,
      rosSOS: false,
      next4SOS: false,
      playoffSOS: false,
      teamPace: false,
      passRunRatio: false,
      redZoneOpportunity: false,
      garbageTime: false,
      vegasImplied: false,
      vegasSpread: false,
      weather: false
    }
  },
  {
    id: 'playoff',
    name: 'Playoff Focused',
    description: 'Optimize for championship weeks 15-17',
    icon: '🏆',
    factors: {
      baseProjection: true,
      vor: true,
      positionalScarcity: true,
      gamesRemaining: true,
      recentTrend: true,
      consistency: false,
      ceilingMode: false,
      floorMode: false,
      injuryDiscount: true,
      rosSOS: false,
      next4SOS: false,
      playoffSOS: true,
      teamPace: false,
      passRunRatio: false,
      redZoneOpportunity: false,
      garbageTime: false,
      vegasImplied: false,
      vegasSpread: false,
      weather: false
    }
  },
  {
    id: 'trendy',
    name: 'Ride the Wave',
    description: 'Heavy weight on recent performance and momentum',
    icon: '🌊',
    factors: {
      baseProjection: true,
      vor: true,
      positionalScarcity: true,
      gamesRemaining: true,
      recentTrend: true,
      consistency: false,
      ceilingMode: false,
      floorMode: false,
      injuryDiscount: true,
      rosSOS: true,
      next4SOS: true,
      playoffSOS: false,
      teamPace: false,
      passRunRatio: false,
      redZoneOpportunity: false,
      garbageTime: false,
      vegasImplied: false,
      vegasSpread: false,
      weather: false
    }
  },
  {
    id: 'kitchen_sink',
    name: 'Kitchen Sink',
    description: 'Every available factor enabled',
    icon: '🍳',
    factors: {
      baseProjection: true,
      vor: true,
      positionalScarcity: true,
      gamesRemaining: true,
      recentTrend: true,
      consistency: true,
      ceilingMode: false,
      floorMode: false,
      injuryDiscount: true,
      rosSOS: true,
      next4SOS: true,
      playoffSOS: false,
      teamPace: true,
      passRunRatio: true,
      redZoneOpportunity: true,
      garbageTime: true,
      vegasImplied: false,
      vegasSpread: false,
      weather: false
    }
  }
]

// ============================================================================
// TEAM CONTEXT DATA (2024 Season Estimates)
// ============================================================================

// Team pace: plays per game relative to league average (1.0 = average)
export const TEAM_PACE: Record<string, number> = {
  MIA: 1.12, BUF: 1.08, PHI: 1.06, SF: 1.05, DAL: 1.04, DET: 1.04,
  CIN: 1.03, LAC: 1.02, JAX: 1.01, KC: 1.01, GB: 1.00, MIN: 1.00,
  SEA: 0.99, ATL: 0.99, LAR: 0.98, NYJ: 0.98, LV: 0.97, NO: 0.97,
  ARI: 0.96, CHI: 0.96, IND: 0.96, WAS: 0.95, HOU: 0.95, TB: 0.95,
  DEN: 0.94, CLE: 0.94, PIT: 0.93, BAL: 0.93, TEN: 0.92, NE: 0.91,
  NYG: 0.90, CAR: 0.89
}

// Pass ratio: percentage of plays that are passes (league avg ~60%)
export const TEAM_PASS_RATIO: Record<string, number> = {
  MIA: 0.65, TB: 0.64, NYJ: 0.63, LAC: 0.62, BUF: 0.62, CIN: 0.61,
  MIN: 0.61, ATL: 0.60, KC: 0.60, LV: 0.60, JAX: 0.59, PHI: 0.59,
  ARI: 0.59, SEA: 0.58, NO: 0.58, LAR: 0.58, GB: 0.57, DAL: 0.57,
  IND: 0.57, WAS: 0.56, HOU: 0.56, DEN: 0.55, PIT: 0.55, DET: 0.54,
  NYG: 0.54, CHI: 0.53, NE: 0.52, CLE: 0.51, TEN: 0.50, SF: 0.49,
  BAL: 0.47, CAR: 0.46
}

// Red zone efficiency: TDs per red zone trip (league avg ~55%)
export const TEAM_RED_ZONE_EFFICIENCY: Record<string, number> = {
  SF: 0.68, MIA: 0.65, DAL: 0.64, DET: 0.63, BUF: 0.62, KC: 0.61,
  PHI: 0.60, CIN: 0.59, JAX: 0.58, SEA: 0.57, LAR: 0.57, GB: 0.56,
  MIN: 0.55, ATL: 0.55, NO: 0.54, LAC: 0.54, TB: 0.53, HOU: 0.53,
  IND: 0.52, BAL: 0.52, PIT: 0.51, CLE: 0.50, DEN: 0.49, LV: 0.48,
  NYJ: 0.47, WAS: 0.46, ARI: 0.45, TEN: 0.44, CHI: 0.43, NE: 0.42,
  NYG: 0.41, CAR: 0.40
}

// Teams likely to be trailing (negative game script) - good for garbage time
export const TEAM_GARBAGE_TIME_FACTOR: Record<string, number> = {
  CAR: 1.20, NE: 1.18, NYG: 1.15, CHI: 1.12, ARI: 1.10, WAS: 1.08,
  TEN: 1.06, DEN: 1.04, LV: 1.02, NYJ: 1.00, IND: 0.98, JAX: 0.96,
  CLE: 0.95, PIT: 0.94, LAC: 0.93, NO: 0.92, ATL: 0.91, TB: 0.90,
  HOU: 0.89, GB: 0.88, MIN: 0.87, SEA: 0.86, LAR: 0.85, CIN: 0.84,
  DET: 0.82, DAL: 0.80, BUF: 0.78, PHI: 0.76, KC: 0.74, MIA: 0.72,
  SF: 0.70, BAL: 0.68
}

// ============================================================================
// CALCULATION FUNCTIONS
// ============================================================================

/**
 * Calculate player's weekly scores from matchup data
 */
export function getPlayerWeeklyScores(
  playerId: string,
  matchupsByWeek: Map<number, SleeperMatchup[]>,
  maxWeek: number
): number[] {
  const scores: number[] = []
  
  for (let week = 1; week <= maxWeek; week++) {
    const weekMatchups = matchupsByWeek.get(week)
    if (!weekMatchups) {
      scores.push(0)
      continue
    }
    
    let found = false
    for (const matchup of weekMatchups) {
      if (matchup.players_points && matchup.players_points[playerId] !== undefined) {
        scores.push(matchup.players_points[playerId])
        found = true
        break
      }
    }
    
    if (!found) scores.push(0)
  }
  
  return scores
}

/**
 * Calculate recent PPG (last N weeks)
 */
export function calculateRecentPPG(weeklyScores: number[], lastNWeeks: number = 4): number {
  const validScores = weeklyScores.filter(s => s > 0)
  if (validScores.length === 0) return 0
  
  const recent = validScores.slice(-lastNWeeks)
  return recent.reduce((sum, s) => sum + s, 0) / recent.length
}

/**
 * Calculate season PPG
 */
export function calculateSeasonPPG(weeklyScores: number[]): number {
  const validScores = weeklyScores.filter(s => s > 0)
  if (validScores.length === 0) return 0
  
  return validScores.reduce((sum, s) => sum + s, 0) / validScores.length
}

/**
 * Calculate trend multiplier (recent / season)
 */
export function calculateTrendMultiplier(recentPPG: number, seasonPPG: number): number {
  if (seasonPPG <= 0) return 1.0
  
  const rawTrend = recentPPG / seasonPPG
  
  // Cap the multiplier between 0.7 and 1.3 to prevent extreme swings
  return Math.max(0.7, Math.min(1.3, rawTrend))
}

/**
 * Calculate consistency (standard deviation)
 * Lower = more consistent
 */
export function calculateConsistency(weeklyScores: number[]): number {
  const validScores = weeklyScores.filter(s => s > 0)
  if (validScores.length < 2) return 0
  
  const mean = validScores.reduce((sum, s) => sum + s, 0) / validScores.length
  const squaredDiffs = validScores.map(s => Math.pow(s - mean, 2))
  const variance = squaredDiffs.reduce((sum, d) => sum + d, 0) / validScores.length
  
  return Math.sqrt(variance)
}

/**
 * Calculate ceiling (75th percentile)
 */
export function calculateCeiling(weeklyScores: number[]): number {
  const validScores = weeklyScores.filter(s => s > 0).sort((a, b) => a - b)
  if (validScores.length === 0) return 0
  
  const index = Math.floor(validScores.length * 0.75)
  return validScores[Math.min(index, validScores.length - 1)]
}

/**
 * Calculate floor (25th percentile)
 */
export function calculateFloor(weeklyScores: number[]): number {
  const validScores = weeklyScores.filter(s => s > 0).sort((a, b) => a - b)
  if (validScores.length === 0) return 0
  
  const index = Math.floor(validScores.length * 0.25)
  return validScores[index]
}

/**
 * Get injury multiplier based on status
 */
export function getInjuryMultiplier(injuryStatus: string | null): number {
  if (!injuryStatus) return 1.0
  
  const status = injuryStatus.toLowerCase()
  
  if (status === 'out' || status === 'ir') return 0
  if (status === 'doubtful') return 0.25
  if (status === 'questionable') return 0.85
  if (status === 'probable') return 0.95
  
  return 1.0
}

/**
 * Get positional scarcity multiplier
 */
export function getScarcityMultiplier(position: string): number {
  const multipliers: Record<string, number> = {
    QB: 0.95,
    RB: 1.08,
    WR: 1.00,
    TE: 1.12
  }
  
  return multipliers[position] || 1.0
}

/**
 * Get consistency rating label
 */
export function getConsistencyRating(stdDev: number, ppg: number): 'elite' | 'stable' | 'volatile' | 'boom-bust' {
  if (ppg <= 0) return 'stable'
  
  const cv = stdDev / ppg // Coefficient of variation
  
  if (cv < 0.25) return 'elite'
  if (cv < 0.40) return 'stable'
  if (cv < 0.55) return 'volatile'
  return 'boom-bust'
}

/**
 * Get trend indicator
 */
export function getTrendIndicator(trendMultiplier: number): 'hot' | 'cold' | 'neutral' {
  if (trendMultiplier >= 1.15) return 'hot'
  if (trendMultiplier <= 0.85) return 'cold'
  return 'neutral'
}

/**
 * Calculate the final ranking score with all enabled factors
 */
export function calculateFinalScore(
  playerData: PlayerRankingData,
  factors: RankingFactorConfig[],
  replacementPPG: number
): { score: number; breakdown: { factor: string; contribution: number; multiplier: number }[] } {
  const breakdown: { factor: string; contribution: number; multiplier: number }[] = []
  
  // Start with base projection
  let baseScore = playerData.baseProjection
  let multiplier = 1.0
  
  // Core factors
  const vorFactor = factors.find(f => f.id === 'vor')
  if (vorFactor?.enabled) {
    const vor = playerData.seasonPPG - replacementPPG
    baseScore = Math.max(0, vor)
    breakdown.push({ factor: 'VOR', contribution: vor, multiplier: 1.0 })
  }
  
  const scarcityFactor = factors.find(f => f.id === 'positionalScarcity')
  if (scarcityFactor?.enabled && scarcityFactor.weight > 0) {
    // Scarcity is applied elsewhere via position
    breakdown.push({ factor: 'Scarcity', contribution: 0, multiplier: 1.0 })
  }
  
  // Performance factors
  const trendFactor = factors.find(f => f.id === 'recentTrend')
  if (trendFactor?.enabled && trendFactor.weight > 0) {
    const trendWeight = trendFactor.weight / 100
    const trendEffect = (playerData.trendMultiplier - 1) * trendWeight + 1
    multiplier *= trendEffect
    breakdown.push({ 
      factor: 'Recent Trend', 
      contribution: (trendEffect - 1) * baseScore,
      multiplier: trendEffect 
    })
  }
  
  const consistencyFactor = factors.find(f => f.id === 'consistency')
  if (consistencyFactor?.enabled && consistencyFactor.weight > 0) {
    const consistencyWeight = consistencyFactor.weight / 100
    // Lower std dev = bonus, higher = penalty
    const avgConsistency = 5 // Approximate average std dev
    const consistencyEffect = 1 + ((avgConsistency - playerData.consistency) / avgConsistency) * 0.1 * consistencyWeight
    multiplier *= Math.max(0.9, Math.min(1.1, consistencyEffect))
    breakdown.push({
      factor: 'Consistency',
      contribution: (consistencyEffect - 1) * baseScore,
      multiplier: consistencyEffect
    })
  }
  
  const ceilingFactor = factors.find(f => f.id === 'ceilingMode')
  if (ceilingFactor?.enabled && ceilingFactor.weight > 0) {
    const ceilingWeight = ceilingFactor.weight / 100
    // Blend in ceiling instead of average
    const ceilingBonus = (playerData.ceiling - playerData.seasonPPG) * ceilingWeight * 0.3
    baseScore += ceilingBonus
    breakdown.push({
      factor: 'Ceiling Mode',
      contribution: ceilingBonus,
      multiplier: 1.0
    })
  }
  
  const floorFactor = factors.find(f => f.id === 'floorMode')
  if (floorFactor?.enabled && floorFactor.weight > 0) {
    const floorWeight = floorFactor.weight / 100
    // Blend in floor instead of average
    const floorPenalty = (playerData.floor - playerData.seasonPPG) * floorWeight * 0.3
    baseScore += floorPenalty
    breakdown.push({
      factor: 'Floor Mode',
      contribution: floorPenalty,
      multiplier: 1.0
    })
  }
  
  const injuryFactor = factors.find(f => f.id === 'injuryDiscount')
  if (injuryFactor?.enabled && injuryFactor.weight > 0 && playerData.injuryStatus) {
    const injuryMult = getInjuryMultiplier(playerData.injuryStatus)
    const injuryWeight = injuryFactor.weight / 100
    const injuryEffect = 1 - ((1 - injuryMult) * injuryWeight)
    multiplier *= injuryEffect
    breakdown.push({
      factor: 'Injury Discount',
      contribution: (injuryEffect - 1) * baseScore,
      multiplier: injuryEffect
    })
  }
  
  // Schedule factors
  const sosRosFactor = factors.find(f => f.id === 'rosSOS')
  if (sosRosFactor?.enabled && sosRosFactor.weight > 0) {
    const sosWeight = sosRosFactor.weight / 100
    const sosEffect = 1 + (playerData.rosSOS * 0.15 * sosWeight)
    multiplier *= sosEffect
    breakdown.push({
      factor: 'ROS SOS',
      contribution: (sosEffect - 1) * baseScore,
      multiplier: sosEffect
    })
  }
  
  const sosNext4Factor = factors.find(f => f.id === 'next4SOS')
  if (sosNext4Factor?.enabled && sosNext4Factor.weight > 0) {
    const sosWeight = sosNext4Factor.weight / 100
    const sosEffect = 1 + (playerData.next4SOS * 0.15 * sosWeight)
    multiplier *= sosEffect
    breakdown.push({
      factor: 'Next 4 SOS',
      contribution: (sosEffect - 1) * baseScore,
      multiplier: sosEffect
    })
  }
  
  const playoffSosFactor = factors.find(f => f.id === 'playoffSOS')
  if (playoffSosFactor?.enabled && playoffSosFactor.weight > 0) {
    const sosWeight = playoffSosFactor.weight / 100
    const sosEffect = 1 + (playerData.playoffSOS * 0.20 * sosWeight)
    multiplier *= sosEffect
    breakdown.push({
      factor: 'Playoff SOS',
      contribution: (sosEffect - 1) * baseScore,
      multiplier: sosEffect
    })
  }
  
  // Context factors
  const paceFactor = factors.find(f => f.id === 'teamPace')
  if (paceFactor?.enabled && paceFactor.weight > 0) {
    const paceWeight = paceFactor.weight / 100
    const paceEffect = 1 + ((playerData.teamPace - 1) * paceWeight)
    multiplier *= paceEffect
    breakdown.push({
      factor: 'Team Pace',
      contribution: (paceEffect - 1) * baseScore,
      multiplier: paceEffect
    })
  }
  
  const passRunFactor = factors.find(f => f.id === 'passRunRatio')
  if (passRunFactor?.enabled && passRunFactor.weight > 0) {
    const prWeight = passRunFactor.weight / 100
    // This would need position context - simplified for now
    const prEffect = 1 + ((playerData.passRatio - 0.58) * prWeight)
    multiplier *= Math.max(0.95, Math.min(1.05, prEffect))
    breakdown.push({
      factor: 'Pass/Run Ratio',
      contribution: (prEffect - 1) * baseScore,
      multiplier: prEffect
    })
  }
  
  const rzFactor = factors.find(f => f.id === 'redZoneOpportunity')
  if (rzFactor?.enabled && rzFactor.weight > 0) {
    const rzWeight = rzFactor.weight / 100
    const rzEffect = 1 + ((playerData.redZoneShare - 0.55) * rzWeight * 0.5)
    multiplier *= Math.max(0.95, Math.min(1.05, rzEffect))
    breakdown.push({
      factor: 'Red Zone',
      contribution: (rzEffect - 1) * baseScore,
      multiplier: rzEffect
    })
  }
  
  const garbageFactor = factors.find(f => f.id === 'garbageTime')
  if (garbageFactor?.enabled && garbageFactor.weight > 0) {
    const gtWeight = garbageFactor.weight / 100
    const gtEffect = 1 + ((playerData.garbageTimeBoost - 1) * gtWeight * 0.1)
    multiplier *= Math.max(0.95, Math.min(1.10, gtEffect))
    breakdown.push({
      factor: 'Garbage Time',
      contribution: (gtEffect - 1) * baseScore,
      multiplier: gtEffect
    })
  }
  
  // Games remaining
  const gamesFactor = factors.find(f => f.id === 'gamesRemaining')
  if (gamesFactor?.enabled) {
    baseScore *= playerData.gamesRemaining
    breakdown.push({
      factor: 'Games Remaining',
      contribution: 0,
      multiplier: playerData.gamesRemaining
    })
  }
  
  const finalScore = baseScore * multiplier
  
  return { score: finalScore, breakdown }
}

/**
 * Build complete player ranking data from available sources
 */
export function buildPlayerRankingData(
  playerId: string,
  baseProjection: number,
  weeklyScores: number[],
  team: string,
  injuryStatus: string | null,
  byeWeek: number | null,
  currentWeek: number,
  rosSOS: number = 0,
  next4SOS: number = 0,
  playoffSOS: number = 0
): PlayerRankingData {
  const seasonPPG = calculateSeasonPPG(weeklyScores)
  const recentPPG = calculateRecentPPG(weeklyScores, 4)
  const consistency = calculateConsistency(weeklyScores)
  const ceiling = calculateCeiling(weeklyScores)
  const floor = calculateFloor(weeklyScores)
  
  // Calculate games remaining (17 weeks - current week - 1 if bye is remaining)
  const totalWeeks = 17
  let gamesRemaining = totalWeeks - currentWeek + 1
  if (byeWeek && byeWeek >= currentWeek) {
    gamesRemaining -= 1
  }
  
  return {
    player_id: playerId,
    baseProjection,
    seasonPPG,
    recentPPG,
    trendMultiplier: calculateTrendMultiplier(recentPPG, seasonPPG),
    consistency,
    weeklyScores,
    ceiling,
    floor,
    rosSOS,
    next4SOS,
    playoffSOS,
    teamPace: TEAM_PACE[team] || 1.0,
    passRatio: TEAM_PASS_RATIO[team] || 0.58,
    redZoneShare: TEAM_RED_ZONE_EFFICIENCY[team] || 0.55,
    garbageTimeBoost: TEAM_GARBAGE_TIME_FACTOR[team] || 1.0,
    vegasImpliedTotal: 0, // External API needed
    vegasSpread: 0,       // External API needed
    weatherImpact: 1.0,   // External API needed
    injuryStatus,
    byeWeek,
    gamesRemaining: Math.max(0, gamesRemaining)
  }
}

// ============================================================================
// WEEKLY RANKING FACTORS (For "This Week" tab)
// ============================================================================

export interface WeeklyFactorConfig {
  id: string
  name: string
  description: string
  category: 'matchup' | 'recent' | 'situational' | 'advanced'
  enabled: boolean
  weight: number
  requiresExternalAPI: boolean
  icon: string
}

export const DEFAULT_WEEKLY_FACTORS: WeeklyFactorConfig[] = [
  // MATCHUP FACTORS
  {
    id: 'weeklyProjection',
    name: 'Weekly Projection',
    description: "Sleeper's projection for this specific week",
    category: 'matchup',
    enabled: true,
    weight: 100,
    requiresExternalAPI: false,
    icon: '📊'
  },
  {
    id: 'matchupDifficulty',
    name: 'Matchup Difficulty',
    description: 'Defense ranking against this position this week',
    category: 'matchup',
    enabled: true,
    weight: 75,
    requiresExternalAPI: false,
    icon: '🎯'
  },
  {
    id: 'homeAway',
    name: 'Home/Away Boost',
    description: 'Slight boost for home games',
    category: 'matchup',
    enabled: false,
    weight: 25,
    requiresExternalAPI: false,
    icon: '🏟️'
  },
  
  // RECENT PERFORMANCE
  {
    id: 'last3Games',
    name: 'Last 3 Games Trend',
    description: 'Weight recent performance heavily',
    category: 'recent',
    enabled: true,
    weight: 75,
    requiresExternalAPI: false,
    icon: '📈'
  },
  {
    id: 'targetTrend',
    name: 'Target/Touch Trend',
    description: 'Increasing targets/touches = positive sign (WR/RB)',
    category: 'recent',
    enabled: false,
    weight: 50,
    requiresExternalAPI: false,
    icon: '🎯'
  },
  {
    id: 'snapCount',
    name: 'Snap Count Trend',
    description: 'Players with increasing snap % get boost',
    category: 'recent',
    enabled: false,
    weight: 50,
    requiresExternalAPI: false,
    icon: '👟'
  },
  
  // SITUATIONAL
  {
    id: 'injuryAdjust',
    name: 'Injury Status',
    description: 'Reduce projection for questionable/doubtful',
    category: 'situational',
    enabled: true,
    weight: 100,
    requiresExternalAPI: false,
    icon: '🏥'
  },
  {
    id: 'byeWeekFilter',
    name: 'Bye Week Filter',
    description: 'Hide/deprioritize players on bye',
    category: 'situational',
    enabled: true,
    weight: 100,
    requiresExternalAPI: false,
    icon: '🚫'
  },
  {
    id: 'restAdvantage',
    name: 'Rest Advantage',
    description: 'Boost for players coming off bye/TNF rest',
    category: 'situational',
    enabled: false,
    weight: 25,
    requiresExternalAPI: false,
    icon: '😴'
  },
  
  // ADVANCED (External API)
  {
    id: 'vegasTotal',
    name: 'Vegas Over/Under',
    description: 'High-scoring game = more fantasy points',
    category: 'advanced',
    enabled: false,
    weight: 50,
    requiresExternalAPI: true,
    icon: '🎰'
  },
  {
    id: 'vegasSpread',
    name: 'Vegas Spread',
    description: 'Underdogs get garbage time boost',
    category: 'advanced',
    enabled: false,
    weight: 25,
    requiresExternalAPI: true,
    icon: '📉'
  },
  {
    id: 'weatherFactor',
    name: 'Weather Impact',
    description: 'Wind/rain reduces passing efficiency',
    category: 'advanced',
    enabled: false,
    weight: 25,
    requiresExternalAPI: true,
    icon: '🌧️'
  }
]

export const WEEKLY_PRESETS: RankingPreset[] = [
  {
    id: 'standard',
    name: 'Standard',
    description: 'Projection + Matchup + Recent Form',
    icon: '⚖️',
    factors: {
      weeklyProjection: true,
      matchupDifficulty: true,
      homeAway: false,
      last3Games: true,
      targetTrend: false,
      snapCount: false,
      injuryAdjust: true,
      byeWeekFilter: true,
      restAdvantage: false,
      vegasTotal: false,
      vegasSpread: false,
      weatherFactor: false
    }
  },
  {
    id: 'matchup',
    name: 'Matchup Heavy',
    description: 'Prioritize favorable matchups',
    icon: '🎯',
    factors: {
      weeklyProjection: true,
      matchupDifficulty: true,
      homeAway: true,
      last3Games: false,
      targetTrend: false,
      snapCount: false,
      injuryAdjust: true,
      byeWeekFilter: true,
      restAdvantage: true,
      vegasTotal: false,
      vegasSpread: false,
      weatherFactor: false
    }
  },
  {
    id: 'hotHand',
    name: 'Hot Hand',
    description: 'Ride recent performers',
    icon: '🔥',
    factors: {
      weeklyProjection: true,
      matchupDifficulty: false,
      homeAway: false,
      last3Games: true,
      targetTrend: true,
      snapCount: true,
      injuryAdjust: true,
      byeWeekFilter: true,
      restAdvantage: false,
      vegasTotal: false,
      vegasSpread: false,
      weatherFactor: false
    }
  },
  {
    id: 'safe',
    name: 'Safe Floor',
    description: 'Consistent + healthy players only',
    icon: '🛡️',
    factors: {
      weeklyProjection: true,
      matchupDifficulty: true,
      homeAway: false,
      last3Games: true,
      targetTrend: false,
      snapCount: false,
      injuryAdjust: true,
      byeWeekFilter: true,
      restAdvantage: false,
      vegasTotal: false,
      vegasSpread: false,
      weatherFactor: false
    }
  }
]

/**
 * Calculate weekly ranking score
 */
export function calculateWeeklyScore(
  player: {
    weeklyProjection: number
    matchupSOS: number
    isHome: boolean
    last3Avg: number
    seasonAvg: number
    injuryStatus: string | null
    isOnBye: boolean
  },
  factors: WeeklyFactorConfig[]
): { score: number; breakdown: { factor: string; contribution: number }[] } {
  const breakdown: { factor: string; contribution: number }[] = []
  let score = 0
  
  // Weekly Projection (base)
  const projFactor = factors.find(f => f.id === 'weeklyProjection')
  if (projFactor?.enabled) {
    score = player.weeklyProjection
    breakdown.push({ factor: 'Weekly Projection', contribution: player.weeklyProjection })
  }
  
  // Matchup Difficulty
  const matchupFactor = factors.find(f => f.id === 'matchupDifficulty')
  if (matchupFactor?.enabled && matchupFactor.weight > 0) {
    const matchupBoost = player.matchupSOS * (matchupFactor.weight / 100) * 0.15 * score
    score += matchupBoost
    breakdown.push({ factor: 'Matchup', contribution: matchupBoost })
  }
  
  // Home/Away
  const homeFactor = factors.find(f => f.id === 'homeAway')
  if (homeFactor?.enabled && player.isHome) {
    const homeBoost = score * 0.03 * (homeFactor.weight / 100)
    score += homeBoost
    breakdown.push({ factor: 'Home Game', contribution: homeBoost })
  }
  
  // Last 3 Games Trend
  const trendFactor = factors.find(f => f.id === 'last3Games')
  if (trendFactor?.enabled && player.seasonAvg > 0) {
    const trendRatio = player.last3Avg / player.seasonAvg
    const trendBoost = (trendRatio - 1) * (trendFactor.weight / 100) * score * 0.2
    score += trendBoost
    breakdown.push({ factor: 'Recent Trend', contribution: trendBoost })
  }
  
  // Injury Adjustment
  const injuryFactor = factors.find(f => f.id === 'injuryAdjust')
  if (injuryFactor?.enabled && player.injuryStatus) {
    const injuryMult = getInjuryMultiplier(player.injuryStatus)
    const injuryPenalty = score * (1 - injuryMult)
    score -= injuryPenalty
    breakdown.push({ factor: 'Injury', contribution: -injuryPenalty })
  }
  
  // Bye Week Filter
  const byeFactor = factors.find(f => f.id === 'byeWeekFilter')
  if (byeFactor?.enabled && player.isOnBye) {
    score = 0
    breakdown.push({ factor: 'On Bye', contribution: -score })
  }
  
  return { score, breakdown }
}

// ============================================================================
// SERVICE EXPORT
// ============================================================================

export const rankingFactorsService = {
  DEFAULT_FACTORS,
  RANKING_PRESETS,
  DEFAULT_WEEKLY_FACTORS,
  WEEKLY_PRESETS,
  TEAM_PACE,
  TEAM_PASS_RATIO,
  TEAM_RED_ZONE_EFFICIENCY,
  TEAM_GARBAGE_TIME_FACTOR,
  getPlayerWeeklyScores,
  calculateRecentPPG,
  calculateSeasonPPG,
  calculateTrendMultiplier,
  calculateConsistency,
  calculateCeiling,
  calculateFloor,
  getInjuryMultiplier,
  getScarcityMultiplier,
  getConsistencyRating,
  getTrendIndicator,
  calculateFinalScore,
  calculateWeeklyScore,
  buildPlayerRankingData
}

export default rankingFactorsService
