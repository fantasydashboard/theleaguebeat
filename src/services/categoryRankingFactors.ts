/**
 * Category Ranking Factors Service
 * 
 * Provides customizable ranking factors specifically for category league
 * Rest of Season (ROS) projections. These factors help users prioritize
 * players based on their league strategy (punt categories, balance, etc.)
 */

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface CategoryRankingFactor {
  id: string
  name: string
  description: string
  category: 'core' | 'performance' | 'scarcity' | 'advanced'
  enabled: boolean
  weight: number // 0-100
  icon: string
  color: string
  requiresHistory?: boolean // Needs historical data to calculate
}

export interface CategoryRankingPreset {
  id: string
  name: string
  description: string
  icon: string
  factors: Record<string, { enabled: boolean; weight: number }>
}

export interface PlayerCategoryMetrics {
  player_id: string
  
  // Core metrics
  categoryRank: number          // Rank in selected category
  projectedValue: number        // ROS projected stat value
  currentValue: number          // Season-to-date stat value
  
  // Multi-category value
  categoriesContributing: number // How many categories player helps
  multiCategoryScore: number    // 0-100, higher = helps more categories
  eliteCategories: number       // Categories where player is top 20%
  
  // Position scarcity
  positionDepth: number         // How many quality options at position
  scarcityBoost: number         // Multiplier for thin positions (C, SS, RP)
  
  // Performance metrics
  consistency: number           // 0-100, higher = more consistent
  recentTrend: number           // -1 to 1, positive = trending up
  ceiling: number               // 90th percentile performance
  floor: number                 // 10th percentile performance
  
  // Advanced metrics
  categoryCorrelation: number   // Does this player's production correlate with others?
  puntValue: number             // Value if punting certain categories
  streamingValue: number        // Value for streaming (pitchers)
  platoonRisk: number           // Risk of lost playing time
  injuryRisk: number            // Based on history/status
}

// ============================================================================
// DEFAULT FACTOR CONFIGURATIONS
// ============================================================================

export const DEFAULT_CATEGORY_ROS_FACTORS: CategoryRankingFactor[] = [
  // CORE FACTORS
  {
    id: 'categoryRank',
    name: 'Category Rank',
    description: 'How the player ranks in the selected category based on ROS projections',
    category: 'core',
    enabled: true,
    weight: 35,
    icon: '📊',
    color: '#facc15' // yellow-400
  },
  {
    id: 'projectedVolume',
    name: 'Projected Volume',
    description: 'Total projected production for rest of season - counting stats benefit from more games',
    category: 'core',
    enabled: true,
    weight: 25,
    icon: '📈',
    color: '#22c55e' // green-500
  },
  {
    id: 'multiCategory',
    name: 'Multi-Category Value',
    description: 'Contribution across multiple scoring categories - rewards versatile players',
    category: 'core',
    enabled: true,
    weight: 20,
    icon: '🎯',
    color: '#3b82f6' // blue-500
  },
  
  // SCARCITY FACTORS
  {
    id: 'positionScarcity',
    name: 'Position Scarcity',
    description: 'Value boost for positions with fewer quality options (C, SS, 2B, RP)',
    category: 'scarcity',
    enabled: true,
    weight: 15,
    icon: '💎',
    color: '#06b6d4' // cyan-500
  },
  {
    id: 'categoryScarcity',
    name: 'Category Scarcity',
    description: 'Boost for categories with fewer elite contributors (SB, Saves, Holds)',
    category: 'scarcity',
    enabled: false,
    weight: 10,
    icon: '🏆',
    color: '#8b5cf6' // violet-500
  },
  {
    id: 'eliteStatus',
    name: 'Elite Tier Bonus',
    description: 'Extra weight for top 5% performers - the truly elite are worth more',
    category: 'scarcity',
    enabled: false,
    weight: 10,
    icon: '👑',
    color: '#f59e0b' // amber-500
  },
  
  // PERFORMANCE FACTORS
  {
    id: 'consistency',
    name: 'Consistency',
    description: 'How reliable and consistent the player\'s production has been week-to-week',
    category: 'performance',
    enabled: true,
    weight: 5,
    icon: '📉',
    color: '#a855f7' // purple-500
  },
  {
    id: 'recentTrend',
    name: 'Recent Trend (Hot/Cold)',
    description: 'Last 2-4 weeks performance vs season average - captures momentum',
    category: 'performance',
    enabled: false,
    weight: 10,
    icon: '🔥',
    color: '#ef4444' // red-500
  },
  {
    id: 'ceilingMode',
    name: 'Ceiling Mode',
    description: 'Prioritize boom potential - great for chasing upside',
    category: 'performance',
    enabled: false,
    weight: 15,
    icon: '🚀',
    color: '#f97316' // orange-500
  },
  {
    id: 'floorMode',
    name: 'Floor Mode',
    description: 'Prioritize safe, consistent production - minimize variance',
    category: 'performance',
    enabled: false,
    weight: 15,
    icon: '🛡️',
    color: '#14b8a6' // teal-500
  },
  
  // ADVANCED FACTORS (Baseball-Specific)
  {
    id: 'parkFactors',
    name: 'Park Factors',
    description: 'Coors Field boost, pitcher park penalties - adjusts for home ballpark effects on HR, R, ERA',
    category: 'advanced',
    enabled: false,
    weight: 10,
    icon: '🏟️',
    color: '#78716c' // stone-500
  },
  {
    id: 'platoonSplits',
    name: 'Platoon Splits',
    description: 'Performance vs LHP/RHP - identifies hitters who crush one side but struggle against the other',
    category: 'advanced',
    enabled: false,
    weight: 10,
    icon: '⚾',
    color: '#8b5cf6' // violet-500
  },
  {
    id: 'babipRegression',
    name: 'BABIP Regression',
    description: 'Luck-adjusted batting average - high BABIP players due for regression, low BABIP due for bounce back',
    category: 'advanced',
    enabled: false,
    weight: 10,
    icon: '🎲',
    color: '#f43f5e' // rose-500
  },
  {
    id: 'xStats',
    name: 'Statcast xStats',
    description: 'Expected stats (xBA, xERA, xWOBA) based on quality of contact - better predictor than actual stats',
    category: 'advanced',
    enabled: false,
    weight: 15,
    icon: '📊',
    color: '#0ea5e9' // sky-500
  },
  {
    id: 'scheduleDensity',
    name: 'Schedule Density',
    description: 'Games remaining, double-headers, off-days - more games = more counting stat opportunities',
    category: 'advanced',
    enabled: false,
    weight: 10,
    icon: '📅',
    color: '#6366f1' // indigo-500
  },
  {
    id: 'ilRisk',
    name: 'IL Risk',
    description: 'Injury history and fragility - discount players with recurring injuries or high workload concerns',
    category: 'advanced',
    enabled: false,
    weight: 10,
    icon: '🏥',
    color: '#ef4444' // red-500
  },
  {
    id: 'streamingValue',
    name: 'Streaming Potential',
    description: 'For pitchers: matchup-based value for weekly streaming - favorable opponents boost ranking',
    category: 'advanced',
    enabled: false,
    weight: 10,
    icon: '🌊',
    color: '#14b8a6' // teal-500
  },
  {
    id: 'puntStrategy',
    name: 'Punt Strategy Fit',
    description: 'Value players that dominate specific categories - great for punt builds ignoring AVG/ERA',
    category: 'advanced',
    enabled: false,
    weight: 15,
    icon: '🎳',
    color: '#ec4899' // pink-500
  }
]

// ============================================================================
// PRESET CONFIGURATIONS
// ============================================================================

export const CATEGORY_ROS_PRESETS: CategoryRankingPreset[] = [
  {
    id: 'balanced',
    name: 'Balanced',
    description: 'Default balanced approach - good for most leagues',
    icon: '⚖️',
    factors: {
      categoryRank: { enabled: true, weight: 35 },
      projectedVolume: { enabled: true, weight: 25 },
      multiCategory: { enabled: true, weight: 20 },
      positionScarcity: { enabled: true, weight: 15 },
      categoryScarcity: { enabled: false, weight: 0 },
      eliteStatus: { enabled: false, weight: 0 },
      consistency: { enabled: true, weight: 5 },
      recentTrend: { enabled: false, weight: 0 },
      ceilingMode: { enabled: false, weight: 0 },
      floorMode: { enabled: false, weight: 0 },
      parkFactors: { enabled: false, weight: 0 },
      platoonSplits: { enabled: false, weight: 0 },
      babipRegression: { enabled: false, weight: 0 },
      xStats: { enabled: false, weight: 0 },
      scheduleDensity: { enabled: false, weight: 0 },
      ilRisk: { enabled: false, weight: 0 },
      streamingValue: { enabled: false, weight: 0 },
      puntStrategy: { enabled: false, weight: 0 }
    }
  },
  {
    id: 'categoryFocused',
    name: 'Category Specialist',
    description: 'Prioritize dominance in the selected category',
    icon: '🎯',
    factors: {
      categoryRank: { enabled: true, weight: 60 },
      projectedVolume: { enabled: true, weight: 20 },
      multiCategory: { enabled: false, weight: 0 },
      positionScarcity: { enabled: true, weight: 10 },
      categoryScarcity: { enabled: true, weight: 5 },
      eliteStatus: { enabled: true, weight: 5 },
      consistency: { enabled: false, weight: 0 },
      recentTrend: { enabled: false, weight: 0 },
      ceilingMode: { enabled: false, weight: 0 },
      floorMode: { enabled: false, weight: 0 },
      parkFactors: { enabled: false, weight: 0 },
      platoonSplits: { enabled: false, weight: 0 },
      babipRegression: { enabled: false, weight: 0 },
      xStats: { enabled: false, weight: 0 },
      scheduleDensity: { enabled: false, weight: 0 },
      ilRisk: { enabled: false, weight: 0 },
      streamingValue: { enabled: false, weight: 0 },
      puntStrategy: { enabled: false, weight: 0 }
    }
  },
  {
    id: 'versatile',
    name: '5-Tool Player',
    description: 'Favor players who contribute everywhere - build balance',
    icon: '🌟',
    factors: {
      categoryRank: { enabled: true, weight: 20 },
      projectedVolume: { enabled: true, weight: 15 },
      multiCategory: { enabled: true, weight: 45 },
      positionScarcity: { enabled: true, weight: 15 },
      categoryScarcity: { enabled: false, weight: 0 },
      eliteStatus: { enabled: false, weight: 0 },
      consistency: { enabled: true, weight: 5 },
      recentTrend: { enabled: false, weight: 0 },
      ceilingMode: { enabled: false, weight: 0 },
      floorMode: { enabled: false, weight: 0 },
      parkFactors: { enabled: false, weight: 0 },
      platoonSplits: { enabled: false, weight: 0 },
      babipRegression: { enabled: false, weight: 0 },
      xStats: { enabled: false, weight: 0 },
      scheduleDensity: { enabled: false, weight: 0 },
      ilRisk: { enabled: false, weight: 0 },
      streamingValue: { enabled: false, weight: 0 },
      puntStrategy: { enabled: false, weight: 0 }
    }
  },
  {
    id: 'scarcityHunter',
    name: 'Scarcity Hunter',
    description: 'Find value at thin positions and rare categories',
    icon: '💎',
    factors: {
      categoryRank: { enabled: true, weight: 25 },
      projectedVolume: { enabled: true, weight: 15 },
      multiCategory: { enabled: true, weight: 10 },
      positionScarcity: { enabled: true, weight: 30 },
      categoryScarcity: { enabled: true, weight: 15 },
      eliteStatus: { enabled: true, weight: 5 },
      consistency: { enabled: false, weight: 0 },
      recentTrend: { enabled: false, weight: 0 },
      ceilingMode: { enabled: false, weight: 0 },
      floorMode: { enabled: false, weight: 0 },
      parkFactors: { enabled: false, weight: 0 },
      platoonSplits: { enabled: false, weight: 0 },
      babipRegression: { enabled: false, weight: 0 },
      xStats: { enabled: false, weight: 0 },
      scheduleDensity: { enabled: false, weight: 0 },
      ilRisk: { enabled: false, weight: 0 },
      streamingValue: { enabled: false, weight: 0 },
      puntStrategy: { enabled: false, weight: 0 }
    }
  },
  {
    id: 'hotStreak',
    name: 'Hot Streak',
    description: 'Chase momentum - prioritize players trending up NOW',
    icon: '🔥',
    factors: {
      categoryRank: { enabled: true, weight: 25 },
      projectedVolume: { enabled: true, weight: 15 },
      multiCategory: { enabled: true, weight: 15 },
      positionScarcity: { enabled: true, weight: 10 },
      categoryScarcity: { enabled: false, weight: 0 },
      eliteStatus: { enabled: false, weight: 0 },
      consistency: { enabled: false, weight: 0 },
      recentTrend: { enabled: true, weight: 30 },
      ceilingMode: { enabled: true, weight: 5 },
      floorMode: { enabled: false, weight: 0 },
      parkFactors: { enabled: false, weight: 0 },
      platoonSplits: { enabled: false, weight: 0 },
      babipRegression: { enabled: false, weight: 0 },
      xStats: { enabled: false, weight: 0 },
      scheduleDensity: { enabled: false, weight: 0 },
      ilRisk: { enabled: false, weight: 0 },
      streamingValue: { enabled: false, weight: 0 },
      puntStrategy: { enabled: false, weight: 0 }
    }
  },
  {
    id: 'safeFloor',
    name: 'Safe Floor',
    description: 'Minimize risk with consistent, reliable production',
    icon: '🛡️',
    factors: {
      categoryRank: { enabled: true, weight: 25 },
      projectedVolume: { enabled: true, weight: 20 },
      multiCategory: { enabled: true, weight: 15 },
      positionScarcity: { enabled: true, weight: 10 },
      categoryScarcity: { enabled: false, weight: 0 },
      eliteStatus: { enabled: false, weight: 0 },
      consistency: { enabled: true, weight: 15 },
      recentTrend: { enabled: false, weight: 0 },
      ceilingMode: { enabled: false, weight: 0 },
      floorMode: { enabled: true, weight: 10 },
      parkFactors: { enabled: false, weight: 0 },
      platoonSplits: { enabled: false, weight: 0 },
      babipRegression: { enabled: false, weight: 0 },
      xStats: { enabled: false, weight: 0 },
      scheduleDensity: { enabled: false, weight: 0 },
      ilRisk: { enabled: true, weight: 5 },
      streamingValue: { enabled: false, weight: 0 },
      puntStrategy: { enabled: false, weight: 0 }
    }
  },
  {
    id: 'upside',
    name: 'Boom Chaser',
    description: 'Swing for the fences - maximize ceiling potential',
    icon: '🚀',
    factors: {
      categoryRank: { enabled: true, weight: 20 },
      projectedVolume: { enabled: true, weight: 15 },
      multiCategory: { enabled: true, weight: 10 },
      positionScarcity: { enabled: true, weight: 10 },
      categoryScarcity: { enabled: false, weight: 0 },
      eliteStatus: { enabled: true, weight: 10 },
      consistency: { enabled: false, weight: 0 },
      recentTrend: { enabled: true, weight: 15 },
      ceilingMode: { enabled: true, weight: 20 },
      floorMode: { enabled: false, weight: 0 },
      parkFactors: { enabled: false, weight: 0 },
      platoonSplits: { enabled: false, weight: 0 },
      babipRegression: { enabled: false, weight: 0 },
      xStats: { enabled: false, weight: 0 },
      scheduleDensity: { enabled: false, weight: 0 },
      ilRisk: { enabled: false, weight: 0 },
      streamingValue: { enabled: false, weight: 0 },
      puntStrategy: { enabled: false, weight: 0 }
    }
  },
  {
    id: 'puntBuild',
    name: 'Punt Build',
    description: 'Optimize for punt strategies - dominate select categories',
    icon: '🎳',
    factors: {
      categoryRank: { enabled: true, weight: 30 },
      projectedVolume: { enabled: true, weight: 15 },
      multiCategory: { enabled: false, weight: 0 },
      positionScarcity: { enabled: true, weight: 15 },
      categoryScarcity: { enabled: true, weight: 15 },
      eliteStatus: { enabled: true, weight: 10 },
      consistency: { enabled: false, weight: 0 },
      recentTrend: { enabled: false, weight: 0 },
      ceilingMode: { enabled: false, weight: 0 },
      floorMode: { enabled: false, weight: 0 },
      parkFactors: { enabled: false, weight: 0 },
      platoonSplits: { enabled: false, weight: 0 },
      babipRegression: { enabled: false, weight: 0 },
      xStats: { enabled: false, weight: 0 },
      scheduleDensity: { enabled: false, weight: 0 },
      ilRisk: { enabled: false, weight: 0 },
      streamingValue: { enabled: false, weight: 0 },
      puntStrategy: { enabled: true, weight: 15 }
    }
  },
  {
    id: 'statcast',
    name: 'Statcast Believer',
    description: 'Trust the advanced metrics - xStats, BABIP regression, park factors',
    icon: '📊',
    factors: {
      categoryRank: { enabled: true, weight: 20 },
      projectedVolume: { enabled: true, weight: 15 },
      multiCategory: { enabled: true, weight: 10 },
      positionScarcity: { enabled: true, weight: 10 },
      categoryScarcity: { enabled: false, weight: 0 },
      eliteStatus: { enabled: false, weight: 0 },
      consistency: { enabled: false, weight: 0 },
      recentTrend: { enabled: false, weight: 0 },
      ceilingMode: { enabled: false, weight: 0 },
      floorMode: { enabled: false, weight: 0 },
      parkFactors: { enabled: true, weight: 10 },
      platoonSplits: { enabled: true, weight: 5 },
      babipRegression: { enabled: true, weight: 10 },
      xStats: { enabled: true, weight: 20 },
      scheduleDensity: { enabled: false, weight: 0 },
      ilRisk: { enabled: false, weight: 0 },
      streamingValue: { enabled: false, weight: 0 },
      puntStrategy: { enabled: false, weight: 0 }
    }
  },
  {
    id: 'simple',
    name: 'Simple Rank',
    description: 'Pure category ranking - no adjustments',
    icon: '📋',
    factors: {
      categoryRank: { enabled: true, weight: 100 },
      projectedVolume: { enabled: false, weight: 0 },
      multiCategory: { enabled: false, weight: 0 },
      positionScarcity: { enabled: false, weight: 0 },
      categoryScarcity: { enabled: false, weight: 0 },
      eliteStatus: { enabled: false, weight: 0 },
      consistency: { enabled: false, weight: 0 },
      recentTrend: { enabled: false, weight: 0 },
      ceilingMode: { enabled: false, weight: 0 },
      floorMode: { enabled: false, weight: 0 },
      parkFactors: { enabled: false, weight: 0 },
      platoonSplits: { enabled: false, weight: 0 },
      babipRegression: { enabled: false, weight: 0 },
      xStats: { enabled: false, weight: 0 },
      scheduleDensity: { enabled: false, weight: 0 },
      ilRisk: { enabled: false, weight: 0 },
      streamingValue: { enabled: false, weight: 0 },
      puntStrategy: { enabled: false, weight: 0 }
    }
  }
]

// ============================================================================
// POSITION SCARCITY VALUES (Baseball)
// ============================================================================

export const POSITION_SCARCITY_MULTIPLIERS: Record<string, number> = {
  // Very scarce positions (1.2-1.3x)
  'C': 1.25,
  'SS': 1.15,
  '2B': 1.10,
  'RP': 1.20,
  'CL': 1.25,
  
  // Moderate scarcity (1.0-1.1x)
  '3B': 1.05,
  'OF': 1.0,
  'LF': 1.0,
  'CF': 1.0,
  'RF': 1.0,
  'SP': 1.0,
  
  // Deep positions (0.95-1.0x)
  '1B': 0.95,
  'DH': 0.90,
  'UTIL': 0.85,
  
  // Multi-position (slight boost for flexibility)
  'CI': 1.0,  // Corner infield
  'MI': 1.05, // Middle infield
  'IF': 1.0,
  'P': 1.0
}

// ============================================================================
// CATEGORY SCARCITY VALUES (Baseball)
// ============================================================================

export const CATEGORY_SCARCITY_MULTIPLIERS: Record<string, number> = {
  // Very scarce categories
  'SB': 1.25,     // Stolen bases
  'SV': 1.30,     // Saves
  'HLD': 1.20,    // Holds
  'SV+H': 1.25,   // Saves + Holds
  
  // Moderately scarce
  'HR': 1.0,
  'W': 1.10,      // Wins harder to get in modern game
  'QS': 1.05,     // Quality starts
  
  // Common categories
  'R': 1.0,
  'RBI': 1.0,
  'K': 0.95,      // Strikeouts very common
  'H': 0.95,
  
  // Ratio stats (different scale)
  'AVG': 1.0,
  'OBP': 1.0,
  'SLG': 1.0,
  'OPS': 1.0,
  'ERA': 1.0,
  'WHIP': 1.0,
  'K/9': 1.0,
  'BB/9': 1.0
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Normalize weights to ensure they sum to 100%
 */
export function normalizeWeights(factors: CategoryRankingFactor[]): CategoryRankingFactor[] {
  const enabledFactors = factors.filter(f => f.enabled)
  const totalWeight = enabledFactors.reduce((sum, f) => sum + f.weight, 0)
  
  if (totalWeight === 0 || totalWeight === 100) return factors
  
  return factors.map(f => ({
    ...f,
    weight: f.enabled ? Math.round((f.weight / totalWeight) * 100) : f.weight
  }))
}

/**
 * Calculate total weight of enabled factors
 */
export function getTotalWeight(factors: CategoryRankingFactor[]): number {
  return factors.filter(f => f.enabled).reduce((sum, f) => sum + f.weight, 0)
}

/**
 * Get position scarcity multiplier
 */
export function getPositionScarcity(position: string): number {
  return POSITION_SCARCITY_MULTIPLIERS[position?.toUpperCase()] || 1.0
}

/**
 * Get category scarcity multiplier
 */
export function getCategoryScarcity(categoryId: string): number {
  return CATEGORY_SCARCITY_MULTIPLIERS[categoryId?.toUpperCase()] || 1.0
}

/**
 * Calculate player's multi-category score (0-100)
 * Based on how many categories they contribute to and at what level
 */
export function calculateMultiCategoryScore(
  playerStats: Record<string, number>,
  allPlayersStats: Record<string, number>[],
  statIds: string[]
): number {
  if (statIds.length === 0) return 0
  
  let categoriesContributing = 0
  let totalPercentileSum = 0
  
  for (const statId of statIds) {
    const playerValue = playerStats[statId] || 0
    if (playerValue === 0) continue
    
    // Calculate percentile rank for this stat
    const allValues = allPlayersStats
      .map(p => p[statId] || 0)
      .filter(v => v > 0)
      .sort((a, b) => b - a)
    
    if (allValues.length === 0) continue
    
    const rank = allValues.findIndex(v => playerValue >= v) + 1
    const percentile = 1 - (rank / allValues.length)
    
    // Count as contributing if in top 60%
    if (percentile >= 0.4) {
      categoriesContributing++
      totalPercentileSum += percentile
    }
  }
  
  // Score based on both breadth and quality of contribution
  const breadthScore = (categoriesContributing / statIds.length) * 50
  const qualityScore = (totalPercentileSum / statIds.length) * 50
  
  return Math.min(100, breadthScore + qualityScore)
}

/**
 * Calculate consistency score (0-100)
 * Based on coefficient of variation of weekly stats
 */
export function calculateConsistency(weeklyValues: number[]): number {
  if (weeklyValues.length < 3) return 50 // Not enough data
  
  const validValues = weeklyValues.filter(v => v > 0)
  if (validValues.length < 3) return 50
  
  const mean = validValues.reduce((a, b) => a + b, 0) / validValues.length
  if (mean === 0) return 50
  
  const variance = validValues.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / validValues.length
  const stdDev = Math.sqrt(variance)
  const cv = stdDev / mean // Coefficient of variation
  
  // Convert to 0-100 score (lower CV = higher consistency)
  // CV of 0.5 or higher = very inconsistent, CV of 0.1 or lower = very consistent
  const consistencyScore = Math.max(0, Math.min(100, (1 - cv * 2) * 100))
  
  return consistencyScore
}

/**
 * Calculate recent trend (-1 to 1)
 * Positive = trending up, negative = trending down
 */
export function calculateRecentTrend(weeklyValues: number[], recentWeeks: number = 4): number {
  if (weeklyValues.length < recentWeeks + 2) return 0 // Not enough data
  
  const recent = weeklyValues.slice(-recentWeeks).filter(v => v > 0)
  const earlier = weeklyValues.slice(0, -recentWeeks).filter(v => v > 0)
  
  if (recent.length === 0 || earlier.length === 0) return 0
  
  const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length
  const earlierAvg = earlier.reduce((a, b) => a + b, 0) / earlier.length
  
  if (earlierAvg === 0) return recentAvg > 0 ? 1 : 0
  
  const trend = (recentAvg - earlierAvg) / earlierAvg
  
  // Clamp to -1 to 1
  return Math.max(-1, Math.min(1, trend))
}

// ============================================================================
// SERVICE EXPORT
// ============================================================================

export const categoryRankingFactorsService = {
  DEFAULT_FACTORS: DEFAULT_CATEGORY_ROS_FACTORS,
  PRESETS: CATEGORY_ROS_PRESETS,
  POSITION_SCARCITY: POSITION_SCARCITY_MULTIPLIERS,
  CATEGORY_SCARCITY: CATEGORY_SCARCITY_MULTIPLIERS,
  normalizeWeights,
  getTotalWeight,
  getPositionScarcity,
  getCategoryScarcity,
  calculateMultiCategoryScore,
  calculateConsistency,
  calculateRecentTrend
}

export default categoryRankingFactorsService
