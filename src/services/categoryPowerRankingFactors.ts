/**
 * Category Power Rankings Factors Service
 * 
 * Provides customizable power ranking factors specifically designed for
 * H2H Category leagues (baseball, etc.)
 */

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface CategoryPowerFactor {
  id: string
  name: string
  description: string
  enabled: boolean
  weight: number // 0-100 percentage
  icon: string
  color: string
}

export interface CategoryPowerPreset {
  id: string
  name: string
  description: string
  icon: string
  factors: Record<string, { enabled: boolean; weight: number }>
}

export interface TeamCategoryStats {
  team_key: string
  name: string
  logo_url: string
  is_my_team: boolean
  
  // Core stats from Yahoo
  totalCatWins: number
  totalCatLosses: number
  totalCatTies: number
  catWinPct: number
  
  // Per-category performance
  categoryWins: Record<string, number>
  categoryLosses: Record<string, number>
  categoryRanks: Record<string, number> // 1 = best in league for that category
  
  // Derived metrics
  dominantCategories: number // Categories where team ranks 1-3
  weakCategories: number // Categories where team ranks bottom 3
  categoryBalance: number // 0-100, higher = more balanced
  avgCatsWonPerMatchup: number
  
  // Batting vs Pitching (for baseball)
  battingCatWins: number
  pitchingCatWins: number
  battingStrength: number // 0-100
  pitchingStrength: number // 0-100
  
  // Recent form
  recentCatWins: number
  recentCatLosses: number
  recentCatWinPct: number
  
  // Matchup record (actual H2H matchups won/lost)
  matchupWins: number
  matchupLosses: number
  matchupTies: number
  
  // Calculated
  powerScore: number
  change: number
  prevRank: number
}

// ============================================================================
// DEFAULT FACTOR CONFIGURATIONS FOR CATEGORY LEAGUES
// ============================================================================

export const DEFAULT_CATEGORY_FACTORS: CategoryPowerFactor[] = [
  {
    id: 'catWinPct',
    name: 'Category Win %',
    description: 'Overall category win percentage - the core measure of H2H category success',
    enabled: true,
    weight: 30,
    icon: '🏆',
    color: '#22c55e'
  },
  {
    id: 'dominantCategories',
    name: 'Category Dominance',
    description: 'Number of categories where team ranks top 3 in the league',
    enabled: true,
    weight: 20,
    icon: '💪',
    color: '#f5c451'
  },
  {
    id: 'categoryBalance',
    name: 'Category Balance',
    description: 'How evenly wins are distributed across all categories - balanced teams are harder to beat',
    enabled: true,
    weight: 15,
    icon: '⚖️',
    color: '#3b82f6'
  },
  {
    id: 'avgCatsPerMatchup',
    name: 'H2H Dominance',
    description: 'Average categories won per head-to-head matchup',
    enabled: true,
    weight: 15,
    icon: '⚔️',
    color: '#a855f7'
  },
  {
    id: 'recentForm',
    name: 'Recent Form (Last 3)',
    description: 'Category win percentage over the last 3 weeks - captures momentum',
    enabled: true,
    weight: 10,
    icon: '🔥',
    color: '#ef4444'
  },
  {
    id: 'weakCategories',
    name: 'Weak Spots',
    description: 'Fewer weak categories (bottom 3 rankings) = higher score',
    enabled: true,
    weight: 10,
    icon: '🛡️',
    color: '#06b6d4'
  },
  {
    id: 'battingStrength',
    name: 'Batting Categories',
    description: 'Performance in batting/hitting categories (R, HR, RBI, SB, AVG, OBP, etc.)',
    enabled: false,
    weight: 15,
    icon: '🏏',
    color: '#ec4899'
  },
  {
    id: 'pitchingStrength',
    name: 'Pitching Categories',
    description: 'Performance in pitching categories (W, K, ERA, WHIP, SV, etc.)',
    enabled: false,
    weight: 15,
    icon: '⚾',
    color: '#10b981'
  },
  {
    id: 'matchupRecord',
    name: 'Matchup Record',
    description: 'Actual head-to-head matchup wins/losses (not category wins)',
    enabled: false,
    weight: 20,
    icon: '📊',
    color: '#f97316'
  }
]

// ============================================================================
// PRESET CONFIGURATIONS FOR CATEGORY LEAGUES
// ============================================================================

export const CATEGORY_POWER_PRESETS: CategoryPowerPreset[] = [
  {
    id: 'balanced',
    name: 'Balanced',
    description: 'Default balanced approach for H2H category leagues',
    icon: '⚖️',
    factors: {
      catWinPct: { enabled: true, weight: 30 },
      dominantCategories: { enabled: true, weight: 20 },
      categoryBalance: { enabled: true, weight: 15 },
      avgCatsPerMatchup: { enabled: true, weight: 15 },
      recentForm: { enabled: true, weight: 10 },
      weakCategories: { enabled: true, weight: 10 },
      battingStrength: { enabled: false, weight: 0 },
      pitchingStrength: { enabled: false, weight: 0 },
      matchupRecord: { enabled: false, weight: 0 }
    }
  },
  {
    id: 'dominator',
    name: 'Category Dominator',
    description: 'Prioritize teams that dominate specific categories',
    icon: '💪',
    factors: {
      catWinPct: { enabled: true, weight: 25 },
      dominantCategories: { enabled: true, weight: 40 },
      categoryBalance: { enabled: false, weight: 0 },
      avgCatsPerMatchup: { enabled: true, weight: 20 },
      recentForm: { enabled: true, weight: 10 },
      weakCategories: { enabled: true, weight: 5 },
      battingStrength: { enabled: false, weight: 0 },
      pitchingStrength: { enabled: false, weight: 0 },
      matchupRecord: { enabled: false, weight: 0 }
    }
  },
  {
    id: 'wellRounded',
    name: 'Well-Rounded',
    description: 'Favor teams with balanced production across all categories',
    icon: '🎯',
    factors: {
      catWinPct: { enabled: true, weight: 25 },
      dominantCategories: { enabled: true, weight: 10 },
      categoryBalance: { enabled: true, weight: 35 },
      avgCatsPerMatchup: { enabled: true, weight: 10 },
      recentForm: { enabled: true, weight: 10 },
      weakCategories: { enabled: true, weight: 10 },
      battingStrength: { enabled: false, weight: 0 },
      pitchingStrength: { enabled: false, weight: 0 },
      matchupRecord: { enabled: false, weight: 0 }
    }
  },
  {
    id: 'momentum',
    name: 'Hot Streak',
    description: 'Weight recent performance heavily - who is winning NOW',
    icon: '🔥',
    factors: {
      catWinPct: { enabled: true, weight: 20 },
      dominantCategories: { enabled: true, weight: 10 },
      categoryBalance: { enabled: true, weight: 10 },
      avgCatsPerMatchup: { enabled: true, weight: 15 },
      recentForm: { enabled: true, weight: 40 },
      weakCategories: { enabled: true, weight: 5 },
      battingStrength: { enabled: false, weight: 0 },
      pitchingStrength: { enabled: false, weight: 0 },
      matchupRecord: { enabled: false, weight: 0 }
    }
  },
  {
    id: 'matchupFocused',
    name: 'Matchup Wins',
    description: 'Focus on actual H2H matchup record, not just category totals',
    icon: '🏆',
    factors: {
      catWinPct: { enabled: true, weight: 20 },
      dominantCategories: { enabled: true, weight: 10 },
      categoryBalance: { enabled: true, weight: 10 },
      avgCatsPerMatchup: { enabled: true, weight: 20 },
      recentForm: { enabled: true, weight: 10 },
      weakCategories: { enabled: true, weight: 5 },
      battingStrength: { enabled: false, weight: 0 },
      pitchingStrength: { enabled: false, weight: 0 },
      matchupRecord: { enabled: true, weight: 25 }
    }
  },
  {
    id: 'battingHeavy',
    name: 'Batting Focus',
    description: 'Emphasize batting category performance',
    icon: '🏏',
    factors: {
      catWinPct: { enabled: true, weight: 20 },
      dominantCategories: { enabled: true, weight: 15 },
      categoryBalance: { enabled: true, weight: 10 },
      avgCatsPerMatchup: { enabled: true, weight: 10 },
      recentForm: { enabled: true, weight: 10 },
      weakCategories: { enabled: true, weight: 5 },
      battingStrength: { enabled: true, weight: 25 },
      pitchingStrength: { enabled: false, weight: 0 },
      matchupRecord: { enabled: true, weight: 5 }
    }
  },
  {
    id: 'pitchingHeavy',
    name: 'Pitching Focus',
    description: 'Emphasize pitching category performance',
    icon: '⚾',
    factors: {
      catWinPct: { enabled: true, weight: 20 },
      dominantCategories: { enabled: true, weight: 15 },
      categoryBalance: { enabled: true, weight: 10 },
      avgCatsPerMatchup: { enabled: true, weight: 10 },
      recentForm: { enabled: true, weight: 10 },
      weakCategories: { enabled: true, weight: 5 },
      battingStrength: { enabled: false, weight: 0 },
      pitchingStrength: { enabled: true, weight: 25 },
      matchupRecord: { enabled: true, weight: 5 }
    }
  }
]

// Baseball batting stat IDs (Yahoo)
export const BATTING_STAT_IDS = ['7', '12', '13', '16', '3', '55', '8', '9', '10', '18'] // R, HR, RBI, SB, AVG, OBP, H, 2B, 3B, BB
export const PITCHING_STAT_IDS = ['28', '32', '26', '27', '42', '48', '29', '50'] // W, K, ERA, WHIP, SV, HLD, SO, QS

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Normalize weights to ensure they sum to 100%
 */
export function normalizeWeights(factors: CategoryPowerFactor[]): CategoryPowerFactor[] {
  const enabledFactors = factors.filter(f => f.enabled)
  const totalWeight = enabledFactors.reduce((sum, f) => sum + f.weight, 0)
  
  if (totalWeight === 0) return factors
  
  return factors.map(f => ({
    ...f,
    weight: f.enabled ? Math.round((f.weight / totalWeight) * 100) : 0
  }))
}

/**
 * Calculate category balance score (0-100)
 * Higher = more evenly distributed wins across categories
 */
export function calculateCategoryBalance(categoryWins: Record<string, number>): number {
  const wins = Object.values(categoryWins)
  if (wins.length === 0) return 0
  
  const total = wins.reduce((a, b) => a + b, 0)
  if (total === 0) return 0
  
  const avg = total / wins.length
  const variance = wins.reduce((sum, w) => sum + Math.pow(w - avg, 2), 0) / wins.length
  const stdDev = Math.sqrt(variance)
  
  // Convert to 0-100 score (lower stdDev = higher balance)
  const maxStdDev = avg // Max possible stdDev when all wins in one category
  const balanceScore = maxStdDev > 0 ? Math.max(0, 100 - (stdDev / maxStdDev) * 100) : 50
  
  return balanceScore
}

/**
 * Calculate power score using category-specific factors
 */
export function calculateCategoryPowerScore(
  team: TeamCategoryStats,
  allTeams: TeamCategoryStats[],
  factors: CategoryPowerFactor[]
): number {
  const enabledFactors = factors.filter(f => f.enabled)
  if (enabledFactors.length === 0) return 0
  
  const totalWeight = enabledFactors.reduce((sum, f) => sum + f.weight, 0)
  if (totalWeight === 0) return 0
  
  let score = 0
  
  // Calculate max values for normalization
  const maxCatWinPct = Math.max(...allTeams.map(t => t.catWinPct), 0.01)
  const maxDominant = Math.max(...allTeams.map(t => t.dominantCategories), 1)
  const maxAvgCats = Math.max(...allTeams.map(t => t.avgCatsWonPerMatchup), 1)
  const maxRecentPct = Math.max(...allTeams.map(t => t.recentCatWinPct), 0.01)
  const numCategories = Object.keys(team.categoryWins).length || 12
  const numTeams = allTeams.length
  const maxMatchupWins = Math.max(...allTeams.map(t => t.matchupWins), 1)
  
  enabledFactors.forEach(factor => {
    const normalizedWeight = factor.weight / totalWeight
    let componentScore = 0
    
    switch (factor.id) {
      case 'catWinPct':
        componentScore = (team.catWinPct / maxCatWinPct) * 100
        break
        
      case 'dominantCategories':
        componentScore = (team.dominantCategories / maxDominant) * 100
        break
        
      case 'categoryBalance':
        componentScore = team.categoryBalance
        break
        
      case 'avgCatsPerMatchup':
        componentScore = (team.avgCatsWonPerMatchup / maxAvgCats) * 100
        break
        
      case 'recentForm':
        componentScore = (team.recentCatWinPct / maxRecentPct) * 100
        break
        
      case 'weakCategories':
        // Fewer weak categories = higher score
        const maxWeak = Math.floor(numCategories / 2) // Theoretical max weak categories
        componentScore = ((maxWeak - team.weakCategories) / maxWeak) * 100
        break
        
      case 'battingStrength':
        componentScore = team.battingStrength
        break
        
      case 'pitchingStrength':
        componentScore = team.pitchingStrength
        break
        
      case 'matchupRecord':
        const matchupTotal = team.matchupWins + team.matchupLosses + team.matchupTies
        const matchupPct = matchupTotal > 0 ? (team.matchupWins + team.matchupTies * 0.5) / matchupTotal : 0
        componentScore = matchupPct * 100
        break
    }
    
    score += componentScore * normalizedWeight
  })
  
  return Math.min(100, Math.max(0, score))
}

// ============================================================================
// SERVICE EXPORT
// ============================================================================

export const categoryPowerRankingService = {
  DEFAULT_CATEGORY_FACTORS,
  CATEGORY_POWER_PRESETS,
  BATTING_STAT_IDS,
  PITCHING_STAT_IDS,
  normalizeWeights,
  calculateCategoryBalance,
  calculateCategoryPowerScore
}

export default categoryPowerRankingService
