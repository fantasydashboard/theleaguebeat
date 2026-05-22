/**
 * Power Rankings Factors Service
 * 
 * Provides customizable power ranking factors that users can toggle on/off
 * and adjust weights to create personalized team power rankings.
 */

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface PowerRankingFactorConfig {
  id: string
  name: string
  description: string
  enabled: boolean
  weight: number // 0-100 percentage
  icon: string
  color: string
}

export interface PowerRankingPreset {
  id: string
  name: string
  description: string
  icon: string
  factors: Record<string, { enabled: boolean; weight: number }>
}

// ============================================================================
// DEFAULT FACTOR CONFIGURATIONS
// ============================================================================

export const DEFAULT_POWER_FACTORS: PowerRankingFactorConfig[] = [
  {
    id: 'record',
    name: 'Win-Loss Record',
    description: 'Team record and winning percentage - the most straightforward measure of success',
    enabled: true,
    weight: 30,
    icon: '🏆',
    color: '#22c55e'
  },
  {
    id: 'pointsFor',
    name: 'Total Points Scored',
    description: 'Total points for the season - measures offensive firepower',
    enabled: true,
    weight: 20,
    icon: '📊',
    color: '#f5c451'
  },
  {
    id: 'allPlay',
    name: 'All-Play Record',
    description: 'Record if you played every team every week - removes schedule luck',
    enabled: true,
    weight: 18,
    icon: '⚔️',
    color: '#3b82f6'
  },
  {
    id: 'recentForm',
    name: 'Recent Form (Last 3 Weeks)',
    description: 'Average points over last 3 weeks - captures momentum and hot streaks',
    enabled: true,
    weight: 12,
    icon: '🔥',
    color: '#a855f7'
  },
  {
    id: 'projectedStrength',
    name: 'Projected ROS Strength',
    description: 'Rest-of-season projected PPG based on roster - measures future potential',
    enabled: true,
    weight: 15,
    icon: '🔮',
    color: '#06b6d4'
  },
  {
    id: 'consistency',
    name: 'Consistency',
    description: 'Lower standard deviation = more reliable weekly production',
    enabled: true,
    weight: 5,
    icon: '🎯',
    color: '#ec4899'
  },
  {
    id: 'pointsAgainst',
    name: 'Points Against (Luck)',
    description: 'Lower points against can indicate schedule luck - use to adjust for it',
    enabled: false,
    weight: 10,
    icon: '🍀',
    color: '#10b981'
  },
  {
    id: 'strengthOfSchedule',
    name: 'Strength of Schedule',
    description: 'Difficulty of opponents faced - rewards teams with tough schedules',
    enabled: false,
    weight: 10,
    icon: '📅',
    color: '#f97316'
  }
]

// ============================================================================
// PRESET CONFIGURATIONS
// ============================================================================

export const POWER_RANKING_PRESETS: PowerRankingPreset[] = [
  {
    id: 'balanced',
    name: 'Balanced',
    description: 'Default balanced approach weighing all key factors',
    icon: '⚖️',
    factors: {
      record: { enabled: true, weight: 30 },
      pointsFor: { enabled: true, weight: 20 },
      allPlay: { enabled: true, weight: 18 },
      recentForm: { enabled: true, weight: 12 },
      projectedStrength: { enabled: true, weight: 15 },
      consistency: { enabled: true, weight: 5 },
      pointsAgainst: { enabled: false, weight: 0 },
      strengthOfSchedule: { enabled: false, weight: 0 }
    }
  },
  {
    id: 'winsMatter',
    name: 'Wins Matter Most',
    description: 'Heavy emphasis on actual wins and losses',
    icon: '🏆',
    factors: {
      record: { enabled: true, weight: 50 },
      pointsFor: { enabled: true, weight: 15 },
      allPlay: { enabled: true, weight: 15 },
      recentForm: { enabled: true, weight: 10 },
      projectedStrength: { enabled: true, weight: 10 },
      consistency: { enabled: false, weight: 0 },
      pointsAgainst: { enabled: false, weight: 0 },
      strengthOfSchedule: { enabled: false, weight: 0 }
    }
  },
  {
    id: 'trueStrength',
    name: 'True Strength',
    description: 'Focus on points and all-play to remove luck',
    icon: '💪',
    factors: {
      record: { enabled: true, weight: 15 },
      pointsFor: { enabled: true, weight: 30 },
      allPlay: { enabled: true, weight: 30 },
      recentForm: { enabled: true, weight: 10 },
      projectedStrength: { enabled: true, weight: 10 },
      consistency: { enabled: true, weight: 5 },
      pointsAgainst: { enabled: false, weight: 0 },
      strengthOfSchedule: { enabled: false, weight: 0 }
    }
  },
  {
    id: 'hotHand',
    name: 'Hot Hand',
    description: 'Prioritize recent performance and momentum',
    icon: '🔥',
    factors: {
      record: { enabled: true, weight: 20 },
      pointsFor: { enabled: true, weight: 15 },
      allPlay: { enabled: true, weight: 10 },
      recentForm: { enabled: true, weight: 35 },
      projectedStrength: { enabled: true, weight: 15 },
      consistency: { enabled: true, weight: 5 },
      pointsAgainst: { enabled: false, weight: 0 },
      strengthOfSchedule: { enabled: false, weight: 0 }
    }
  },
  {
    id: 'futureValue',
    name: 'Future Value',
    description: 'Weight projections heavily for playoff push',
    icon: '🔮',
    factors: {
      record: { enabled: true, weight: 20 },
      pointsFor: { enabled: true, weight: 15 },
      allPlay: { enabled: true, weight: 10 },
      recentForm: { enabled: true, weight: 15 },
      projectedStrength: { enabled: true, weight: 35 },
      consistency: { enabled: true, weight: 5 },
      pointsAgainst: { enabled: false, weight: 0 },
      strengthOfSchedule: { enabled: false, weight: 0 }
    }
  },
  {
    id: 'luckAdjusted',
    name: 'Luck Adjusted',
    description: 'Include points against and SOS to adjust for luck',
    icon: '🍀',
    factors: {
      record: { enabled: true, weight: 20 },
      pointsFor: { enabled: true, weight: 20 },
      allPlay: { enabled: true, weight: 20 },
      recentForm: { enabled: true, weight: 10 },
      projectedStrength: { enabled: true, weight: 10 },
      consistency: { enabled: true, weight: 5 },
      pointsAgainst: { enabled: true, weight: 10 },
      strengthOfSchedule: { enabled: true, weight: 5 }
    }
  }
]

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Normalize weights to ensure they sum to 100%
 */
export function normalizeWeights(factors: PowerRankingFactorConfig[]): PowerRankingFactorConfig[] {
  const enabledFactors = factors.filter(f => f.enabled)
  const totalWeight = enabledFactors.reduce((sum, f) => sum + f.weight, 0)
  
  if (totalWeight === 0) return factors
  
  return factors.map(f => ({
    ...f,
    weight: f.enabled ? Math.round((f.weight / totalWeight) * 100) : 0
  }))
}

/**
 * Calculate power score using custom factors
 */
export function calculateCustomPowerScore(
  team: {
    wins: number
    losses: number
    ties: number
    totalPointsFor: number
    pointsAgainst?: number
    allPlayWins: number
    allPlayLosses: number
    recentAvg: number
    projectedPPG?: number
    stdDev: number
  },
  allTeams: any[],
  factors: PowerRankingFactorConfig[]
): number {
  const enabledFactors = factors.filter(f => f.enabled)
  if (enabledFactors.length === 0) return 0
  
  // Normalize weights
  const totalWeight = enabledFactors.reduce((sum, f) => sum + f.weight, 0)
  if (totalWeight === 0) return 0
  
  let score = 0
  
  // Calculate max values for normalization
  const maxPointsFor = Math.max(...allTeams.map(t => t.totalPointsFor))
  const maxRecentAvg = Math.max(...allTeams.map(t => t.recentAvg))
  const maxStdDev = Math.max(...allTeams.map(t => t.stdDev))
  const maxProjected = Math.max(...allTeams.map(t => t.projectedPPG || 0))
  const maxPointsAgainst = Math.max(...allTeams.map(t => t.pointsAgainst || 0))
  const minPointsAgainst = Math.min(...allTeams.map(t => t.pointsAgainst || 0))
  
  enabledFactors.forEach(factor => {
    const normalizedWeight = factor.weight / totalWeight
    let componentScore = 0
    
    switch (factor.id) {
      case 'record': {
        const totalGames = team.wins + team.losses + team.ties
        const winPct = totalGames > 0 ? (team.wins + team.ties * 0.5) / totalGames : 0
        componentScore = winPct * 100
        break
      }
      case 'pointsFor': {
        componentScore = maxPointsFor > 0 ? (team.totalPointsFor / maxPointsFor) * 100 : 0
        break
      }
      case 'allPlay': {
        const allPlayTotal = team.allPlayWins + team.allPlayLosses
        const allPlayPct = allPlayTotal > 0 ? team.allPlayWins / allPlayTotal : 0
        componentScore = allPlayPct * 100
        break
      }
      case 'recentForm': {
        componentScore = maxRecentAvg > 0 ? (team.recentAvg / maxRecentAvg) * 100 : 0
        break
      }
      case 'projectedStrength': {
        componentScore = maxProjected > 0 && team.projectedPPG 
          ? (team.projectedPPG / maxProjected) * 100 
          : 0
        break
      }
      case 'consistency': {
        // Lower stdDev is better
        componentScore = maxStdDev > 0 ? ((maxStdDev - team.stdDev) / maxStdDev) * 100 : 50
        break
      }
      case 'pointsAgainst': {
        // Lower points against is better (luckier schedule)
        const range = maxPointsAgainst - minPointsAgainst
        if (range > 0 && team.pointsAgainst !== undefined) {
          componentScore = ((maxPointsAgainst - team.pointsAgainst) / range) * 100
        }
        break
      }
      case 'strengthOfSchedule': {
        // This would need opponent data - placeholder for now
        componentScore = 50 // Neutral if not available
        break
      }
    }
    
    score += componentScore * normalizedWeight
  })
  
  return score
}

// ============================================================================
// SERVICE EXPORT
// ============================================================================

export const powerRankingFactorsService = {
  DEFAULT_POWER_FACTORS,
  POWER_RANKING_PRESETS,
  normalizeWeights,
  calculateCustomPowerScore
}

export default powerRankingFactorsService
