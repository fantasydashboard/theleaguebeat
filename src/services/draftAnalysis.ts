/**
 * Draft Analysis Service - Comprehensive Edition
 * 
 * Uses Value-Based Drafting (VBD) concepts to properly evaluate draft picks:
 * - Expected value curves based on draft slot (logarithmic decay)
 * - Position-adjusted scoring (positional scarcity)
 * - ELITE TIER BONUS: Finishing as a top player is worth more
 * - Round-weighted value (early picks matter more)
 * - League-size aware grading
 */

import type { SleeperDraft, SleeperDraftPick, SleeperMatchup } from '@/types/sleeper'

export interface PlayerSeasonStats {
  player_id: string
  totalPoints: number
  gamesPlayed: number
  avgPPG: number
  positionRank: number
  overallRank: number
  position: string
  weeklyPoints: number[]
}

export interface DraftPickAnalysis {
  pick_no: number
  round: number
  draft_slot: number
  player_id: string
  player_name: string
  position: string
  roster_id: number
  team_name: string
  
  // Performance metrics
  totalPoints: number
  avgPPG: number
  gamesPlayed: number
  positionRank: number
  overallRank: number
  
  // VBD-style value metrics
  expectedPoints: number        // Expected points based on draft slot
  actualPoints: number          // Actual points scored
  valueAdded: number            // Actual - Expected (positive = outperformed)
  positionExpectedRank: number  // Expected rank at position based on draft order
  positionValueDiff: number     // Expected position rank - actual position rank (raw)
  adjustedScore: number         // NEW: Position-weighted score (elite finishes worth more)
  
  // Legacy metrics (for compatibility)
  expectedRank: number
  valueOverExpected: number
  isSteal: boolean
  isReach: boolean
  isBust: boolean
  isHit: boolean
  
  // Grade
  pickGrade: string
  pickGradeScore: number  // Numeric score for sorting
}

export interface RoundAnalysis {
  round: number
  bestPick: DraftPickAnalysis | null
  worstPick: DraftPickAnalysis | null
  avgValue: number
  totalValue: number
  avgExpectedPoints: number
  avgActualPoints: number
}

export interface TeamDraftGrade {
  roster_id: number
  team_name: string
  overallGrade: string
  gradeScore: number
  totalValueAdded: number
  totalAdjustedScore: number  // NEW: Sum of adjusted scores
  avgValuePerPick: number
  expectedPoints: number
  actualPoints: number
  bestPick: DraftPickAnalysis | null
  worstPick: DraftPickAnalysis | null
  steals: DraftPickAnalysis[]
  reaches: DraftPickAnalysis[]
  hits: DraftPickAnalysis[]
  busts: DraftPickAnalysis[]
  roundGrades: { round: number; grade: string; value: number }[]
}

export interface PlayerTransaction {
  type: 'trade' | 'add' | 'drop' | 'waiver'
  week: number
  timestamp: number
  fromTeam?: string
  toTeam?: string
  fromRosterId?: number
  toRosterId?: number
  details?: string
}

export interface PlayerDraftHistory {
  player_id: string
  player_name: string
  position: string
  pick: DraftPickAnalysis
  transactions: PlayerTransaction[]
  weeklyPerformance: { week: number; points: number; started: boolean }[]
  seasonSummary: {
    totalPoints: number
    gamesPlayed: number
    avgPPG: number
    bestWeek: { week: number; points: number }
    worstWeek: { week: number; points: number }
  }
}

/**
 * Calculate positional value multiplier based on finish rank
 * 
 * The KEY INSIGHT: Finishing as RB1 is way more valuable than RB32
 * This creates a multiplier that increases the value of elite finishes
 * 
 * For a 12-team league:
 * - Rank 1-3 (Elite): 2.5x multiplier
 * - Rank 4-6 (Starter 1): 2.0x multiplier  
 * - Rank 7-12 (Starter 1): 1.5x multiplier
 * - Rank 13-24 (Starter 2): 1.0x multiplier (baseline)
 * - Rank 25-36 (Flex): 0.7x multiplier
 * - Rank 37+ (Bench): 0.4x multiplier
 */
function getPositionalValueMultiplier(finishRank: number, numTeams: number): number {
  const eliteThreshold = Math.ceil(numTeams * 0.25)      // Top 25% = Elite
  const starter1Threshold = numTeams                     // Top N = Starter 1
  const starter2Threshold = numTeams * 2                 // N to 2N = Starter 2
  const flexThreshold = numTeams * 3                     // 2N to 3N = Flex
  
  if (finishRank <= eliteThreshold) return 2.5           // Elite tier
  if (finishRank <= Math.ceil(numTeams * 0.5)) return 2.0 // Upper starter 1
  if (finishRank <= starter1Threshold) return 1.5        // Starter 1
  if (finishRank <= starter2Threshold) return 1.0        // Starter 2 (baseline)
  if (finishRank <= flexThreshold) return 0.7            // Flex
  return 0.4                                             // Bench (almost worthless)
}

/**
 * Calculate ADJUSTED score that weights elite finishes more heavily
 * 
 * Formula: adjustedScore = rawDiff * positionMultiplier * roundMultiplier
 * 
 * Example (12-team league):
 * - Drafted RB12, finished RB2: rawDiff = +10, multiplier = 2.5x → adjustedScore = +25
 * - Drafted RB12, finished RB22: rawDiff = -10, multiplier = 1.0x → adjustedScore = -10
 * - Drafted RB36, finished RB26: rawDiff = +10, multiplier = 0.7x → adjustedScore = +7
 */
function calculateAdjustedScore(
  draftedRank: number,
  finishRank: number,
  round: number,
  numTeams: number
): number {
  // If player didn't play (rank 999), heavy penalty
  if (finishRank >= 900) {
    return -15 * (round <= 5 ? 1.5 : 1.0) // Heavier penalty for early round busts
  }
  
  // Raw difference (positive = outperformed)
  const rawDiff = draftedRank - finishRank
  
  // Get positional value multiplier based on WHERE they finished
  const positionMultiplier = getPositionalValueMultiplier(finishRank, numTeams)
  
  // Round multiplier - late round hits get bonus, early busts get penalty
  let roundMultiplier = 1.0
  if (rawDiff > 0) {
    // Outperformed - late round picks get bonus
    if (round >= 10) roundMultiplier = 1.4
    else if (round >= 7) roundMultiplier = 1.2
    else if (round >= 4) roundMultiplier = 1.1
  } else {
    // Underperformed - early round picks penalized more
    if (round <= 2) roundMultiplier = 1.3
    else if (round <= 4) roundMultiplier = 1.15
  }
  
  // Calculate adjusted score
  let adjustedScore = rawDiff * positionMultiplier * roundMultiplier
  
  // Bonus for finishing in elite tier regardless of where drafted
  // Even if you drafted RB3 and he finished RB1, that's still elite value
  if (finishRank <= Math.ceil(numTeams * 0.25)) {
    adjustedScore += 3 // Elite tier bonus
  }
  
  return adjustedScore
}

/**
 * Calculate player season statistics from matchup data
 */
export function calculatePlayerSeasonStats(
  matchupsByWeek: Map<number, SleeperMatchup[]>,
  playoffWeekStart: number,
  playerPositions?: Map<string, string>
): Map<string, PlayerSeasonStats> {
  const playerStats = new Map<string, { points: number[]; position: string; weeklyPoints: number[] }>()
  
  // Aggregate all player scores
  matchupsByWeek.forEach((weekMatchups, week) => {
    if (week >= playoffWeekStart) return // Only regular season
    
    weekMatchups.forEach(matchup => {
      if (!matchup.players_points) return
      
      Object.entries(matchup.players_points).forEach(([playerId, points]) => {
        if (!playerStats.has(playerId)) {
          const position = playerPositions?.get(playerId) || ''
          playerStats.set(playerId, { points: [], position, weeklyPoints: Array(playoffWeekStart - 1).fill(0) })
        }
        
        const stats = playerStats.get(playerId)!
        stats.points.push(points)
        if (week < playoffWeekStart) {
          stats.weeklyPoints[week - 1] = points
        }
      })
    })
  })
  
  // Calculate stats and overall ranks
  const allPlayers: PlayerSeasonStats[] = []
  
  playerStats.forEach((data, playerId) => {
    const totalPoints = data.points.reduce((a, b) => a + b, 0)
    const gamesPlayed = data.points.filter(p => p > 0).length
    const avgPPG = gamesPlayed > 0 ? totalPoints / gamesPlayed : 0
    
    allPlayers.push({
      player_id: playerId,
      totalPoints,
      gamesPlayed,
      avgPPG,
      positionRank: 0,
      overallRank: 0,
      position: data.position || 'FLEX',
      weeklyPoints: data.weeklyPoints
    })
  })
  
  // Sort by total points for overall rank
  allPlayers.sort((a, b) => b.totalPoints - a.totalPoints)
  allPlayers.forEach((player, idx) => {
    player.overallRank = idx + 1
  })
  
  // Calculate position ranks
  const byPosition = new Map<string, PlayerSeasonStats[]>()
  allPlayers.forEach(player => {
    if (!byPosition.has(player.position)) {
      byPosition.set(player.position, [])
    }
    byPosition.get(player.position)!.push(player)
  })
  
  byPosition.forEach(players => {
    players.sort((a, b) => b.totalPoints - a.totalPoints)
    players.forEach((player, idx) => {
      player.positionRank = idx + 1
    })
  })
  
  // Convert to map
  const seasonStats = new Map<string, PlayerSeasonStats>()
  allPlayers.forEach(player => {
    seasonStats.set(player.player_id, player)
  })
  
  return seasonStats
}

/**
 * Calculate pick grade based on adjusted score
 */
function calculatePickGrade(
  adjustedScore: number,
  gamesPlayed: number
): { grade: string; score: number } {
  // If player didn't play much, can't really grade them
  if (gamesPlayed < 3) {
    return { grade: 'INC', score: 0 }
  }
  
  // Convert adjusted score to grade
  // These thresholds are calibrated for the new scoring system
  let grade: string
  if (adjustedScore >= 20) grade = 'A+'
  else if (adjustedScore >= 15) grade = 'A'
  else if (adjustedScore >= 10) grade = 'A-'
  else if (adjustedScore >= 6) grade = 'B+'
  else if (adjustedScore >= 3) grade = 'B'
  else if (adjustedScore >= 0) grade = 'B-'
  else if (adjustedScore >= -3) grade = 'C+'
  else if (adjustedScore >= -6) grade = 'C'
  else if (adjustedScore >= -10) grade = 'C-'
  else if (adjustedScore >= -15) grade = 'D'
  else grade = 'F'
  
  return { grade, score: adjustedScore }
}

/**
 * Analyze all draft picks with comprehensive VBD-style metrics
 */
export function analyzeDraftPicks(
  picks: SleeperDraftPick[],
  playerStats: Map<string, PlayerSeasonStats>,
  playerNames: Map<string, string>,
  teamNames: Map<number, string>,
  numTeams: number = 12
): DraftPickAnalysis[] {
  const analyzed: DraftPickAnalysis[] = []
  
  // Sort picks by pick number
  const sortedPicks = [...picks].sort((a, b) => a.pick_no - b.pick_no)
  
  // Track position draft order
  const positionDraftOrder: Record<string, number> = { QB: 0, RB: 0, WR: 0, TE: 0, K: 0, DEF: 0 }
  
  sortedPicks.forEach(pick => {
    const position = pick.metadata?.position || 'FLEX'
    const stats = playerStats.get(pick.player_id)
    const playerName = playerNames.get(pick.player_id) || `Player ${pick.player_id}`
    const teamName = teamNames.get(pick.roster_id) || `Team ${pick.roster_id}`
    
    // Track when this player was drafted at their position
    positionDraftOrder[position] = (positionDraftOrder[position] || 0) + 1
    const positionExpectedRank = positionDraftOrder[position]
    
    // Get actual position rank
    const actualPositionRank = stats?.positionRank || 999
    
    // Calculate raw position rank differential
    const positionValueDiff = positionExpectedRank - actualPositionRank
    
    // Calculate ADJUSTED score with elite tier weighting
    const adjustedScore = calculateAdjustedScore(
      positionExpectedRank,
      actualPositionRank,
      pick.round,
      numTeams
    )
    
    // Legacy metrics
    const overallRank = stats?.overallRank || 999
    const valueOverExpected = pick.pick_no - overallRank
    const expectedPoints = 0 // Not using points-based anymore
    const actualPoints = stats?.totalPoints || 0
    const valueAdded = actualPoints - expectedPoints
    
    // Determine steal/reach/hit/bust based on adjusted score
    const isSteal = adjustedScore >= 15
    const isReach = adjustedScore <= -10
    const isHit = adjustedScore >= 6
    const isBust = adjustedScore <= -10 || (pick.round <= 5 && actualPositionRank > numTeams * 3)
    
    // Calculate grade
    const { grade, score } = calculatePickGrade(adjustedScore, stats?.gamesPlayed || 0)
    
    analyzed.push({
      pick_no: pick.pick_no,
      round: pick.round,
      draft_slot: pick.draft_slot,
      player_id: pick.player_id,
      player_name: playerName,
      position,
      roster_id: pick.roster_id,
      team_name: teamName,
      
      totalPoints: actualPoints,
      avgPPG: stats?.avgPPG || 0,
      gamesPlayed: stats?.gamesPlayed || 0,
      positionRank: actualPositionRank,
      overallRank,
      
      expectedPoints,
      actualPoints,
      valueAdded,
      positionExpectedRank,
      positionValueDiff,
      adjustedScore,
      
      expectedRank: pick.pick_no,
      valueOverExpected,
      isSteal,
      isReach,
      isHit,
      isBust,
      
      pickGrade: grade,
      pickGradeScore: score
    })
  })
  
  return analyzed
}

/**
 * Analyze each round of the draft
 */
export function analyzeRounds(picks: DraftPickAnalysis[]): RoundAnalysis[] {
  const rounds = new Map<number, DraftPickAnalysis[]>()
  
  picks.forEach(pick => {
    if (!rounds.has(pick.round)) {
      rounds.set(pick.round, [])
    }
    rounds.get(pick.round)!.push(pick)
  })
  
  const roundAnalyses: RoundAnalysis[] = []
  
  rounds.forEach((roundPicks, round) => {
    // Filter out incomplete grades
    const validPicks = roundPicks.filter(p => p.pickGrade !== 'INC')
    
    if (validPicks.length === 0) {
      roundAnalyses.push({
        round,
        bestPick: null,
        worstPick: null,
        avgValue: 0,
        totalValue: 0,
        avgExpectedPoints: 0,
        avgActualPoints: 0
      })
      return
    }
    
    // Sort by adjusted score
    const sorted = [...validPicks].sort((a, b) => b.adjustedScore - a.adjustedScore)
    
    const bestPick = sorted[0]
    const worstPick = sorted[sorted.length - 1]
    
    const totalValue = validPicks.reduce((sum, p) => sum + p.adjustedScore, 0)
    const avgValue = totalValue / validPicks.length
    
    const avgExpectedPoints = 0
    const avgActualPoints = validPicks.reduce((sum, p) => sum + p.actualPoints, 0) / validPicks.length
    
    roundAnalyses.push({
      round,
      bestPick,
      worstPick,
      avgValue,
      totalValue,
      avgExpectedPoints,
      avgActualPoints
    })
  })
  
  return roundAnalyses.sort((a, b) => a.round - b.round)
}

/**
 * Calculate comprehensive draft grade for each team
 */
export function calculateTeamDraftGrades(
  picks: DraftPickAnalysis[],
  teamNames: Map<number, string>,
  numTeams: number = 12
): TeamDraftGrade[] {
  const byTeam = new Map<number, DraftPickAnalysis[]>()
  
  picks.forEach(pick => {
    if (!byTeam.has(pick.roster_id)) {
      byTeam.set(pick.roster_id, [])
    }
    byTeam.get(pick.roster_id)!.push(pick)
  })
  
  const grades: TeamDraftGrade[] = []
  
  byTeam.forEach((teamPicks, rosterId) => {
    const teamName = teamNames.get(rosterId) || `Team ${rosterId}`
    
    // Filter to valid picks
    const validPicks = teamPicks.filter(p => p.pickGrade !== 'INC' && p.gamesPlayed >= 3)
    
    if (validPicks.length === 0) {
      grades.push({
        roster_id: rosterId,
        team_name: teamName,
        overallGrade: 'N/A',
        gradeScore: 0,
        totalValueAdded: 0,
        totalAdjustedScore: 0,
        avgValuePerPick: 0,
        expectedPoints: 0,
        actualPoints: 0,
        bestPick: null,
        worstPick: null,
        steals: [],
        reaches: [],
        hits: [],
        busts: [],
        roundGrades: []
      })
      return
    }
    
    // Calculate totals using ADJUSTED scores
    const totalAdjustedScore = validPicks.reduce((sum, p) => sum + p.adjustedScore, 0)
    const avgValuePerPick = totalAdjustedScore / validPicks.length
    const totalValueAdded = validPicks.reduce((sum, p) => sum + p.positionValueDiff, 0)
    const expectedPoints = 0
    const actualPoints = validPicks.reduce((sum, p) => sum + p.actualPoints, 0)
    
    // Calculate weighted grade score (early picks weighted more)
    let weightedScore = 0
    let totalWeight = 0
    
    validPicks.forEach(pick => {
      // Weight: Round 1 = 4, Round 2-3 = 3, Round 4-6 = 2, Later = 1
      const weight = pick.round <= 1 ? 4 : pick.round <= 3 ? 3 : pick.round <= 6 ? 2 : 1
      weightedScore += pick.adjustedScore * weight
      totalWeight += weight
    })
    
    const gradeScore = totalWeight > 0 ? weightedScore / totalWeight : 0
    
    // Convert to letter grade using adjusted score thresholds
    let overallGrade: string
    if (gradeScore >= 15) overallGrade = 'A+'
    else if (gradeScore >= 10) overallGrade = 'A'
    else if (gradeScore >= 6) overallGrade = 'A-'
    else if (gradeScore >= 4) overallGrade = 'B+'
    else if (gradeScore >= 2) overallGrade = 'B'
    else if (gradeScore >= 0) overallGrade = 'B-'
    else if (gradeScore >= -2) overallGrade = 'C+'
    else if (gradeScore >= -4) overallGrade = 'C'
    else if (gradeScore >= -6) overallGrade = 'C-'
    else if (gradeScore >= -10) overallGrade = 'D'
    else overallGrade = 'F'
    
    // Find best/worst picks by adjusted score
    const sorted = [...validPicks].sort((a, b) => b.adjustedScore - a.adjustedScore)
    const bestPick = sorted[0]
    const worstPick = sorted[sorted.length - 1]
    
    // Categorize picks
    const steals = validPicks.filter(p => p.isSteal).sort((a, b) => b.adjustedScore - a.adjustedScore)
    const reaches = validPicks.filter(p => p.isReach).sort((a, b) => a.adjustedScore - b.adjustedScore)
    const hits = validPicks.filter(p => p.isHit && !p.isSteal).sort((a, b) => b.adjustedScore - a.adjustedScore)
    const busts = validPicks.filter(p => p.isBust && !p.isReach).sort((a, b) => a.adjustedScore - b.adjustedScore)
    
    // Calculate round grades
    const roundGrades: { round: number; grade: string; value: number }[] = []
    const byRound = new Map<number, DraftPickAnalysis[]>()
    
    validPicks.forEach(pick => {
      if (!byRound.has(pick.round)) {
        byRound.set(pick.round, [])
      }
      byRound.get(pick.round)!.push(pick)
    })
    
    byRound.forEach((roundPicks, round) => {
      const roundValue = roundPicks.reduce((sum, p) => sum + p.adjustedScore, 0) / roundPicks.length
      
      let roundGrade: string
      if (roundValue >= 10) roundGrade = 'A'
      else if (roundValue >= 5) roundGrade = 'B+'
      else if (roundValue >= 2) roundGrade = 'B'
      else if (roundValue >= 0) roundGrade = 'B-'
      else if (roundValue >= -5) roundGrade = 'C'
      else if (roundValue >= -10) roundGrade = 'D'
      else roundGrade = 'F'
      
      roundGrades.push({ round, grade: roundGrade, value: roundValue })
    })
    
    grades.push({
      roster_id: rosterId,
      team_name: teamName,
      overallGrade,
      gradeScore,
      totalValueAdded,
      totalAdjustedScore,
      avgValuePerPick,
      expectedPoints,
      actualPoints,
      bestPick,
      worstPick,
      steals,
      reaches,
      hits,
      busts,
      roundGrades: roundGrades.sort((a, b) => a.round - b.round)
    })
  })
  
  return grades.sort((a, b) => b.gradeScore - a.gradeScore)
}

/**
 * Fetch transactions for a league from Sleeper API
 */
export async function fetchLeagueTransactions(
  leagueId: string,
  maxWeek: number = 17
): Promise<Map<string, PlayerTransaction[]>> {
  const playerTransactions = new Map<string, PlayerTransaction[]>()
  
  for (let week = 1; week <= maxWeek; week++) {
    try {
      const response = await fetch(`https://api.sleeper.app/v1/league/${leagueId}/transactions/${week}`)
      if (!response.ok) continue
      
      const transactions = await response.json()
      
      transactions.forEach((tx: any) => {
        const baseTransaction = {
          week: tx.leg || week,
          timestamp: tx.created,
          type: tx.type as 'trade' | 'add' | 'drop' | 'waiver'
        }
        
        // Process adds
        if (tx.adds) {
          Object.entries(tx.adds).forEach(([playerId, rosterId]) => {
            if (!playerTransactions.has(playerId)) {
              playerTransactions.set(playerId, [])
            }
            playerTransactions.get(playerId)!.push({
              ...baseTransaction,
              type: tx.type === 'trade' ? 'trade' : (tx.type === 'waiver' ? 'waiver' : 'add'),
              toRosterId: rosterId as number
            })
          })
        }
        
        // Process drops
        if (tx.drops) {
          Object.entries(tx.drops).forEach(([playerId, rosterId]) => {
            if (!playerTransactions.has(playerId)) {
              playerTransactions.set(playerId, [])
            }
            playerTransactions.get(playerId)!.push({
              ...baseTransaction,
              type: tx.type === 'trade' ? 'trade' : 'drop',
              fromRosterId: rosterId as number
            })
          })
        }
      })
    } catch (error) {
      console.warn(`Failed to fetch transactions for week ${week}:`, error)
    }
  }
  
  // Sort each player's transactions by timestamp
  playerTransactions.forEach(txs => {
    txs.sort((a, b) => a.timestamp - b.timestamp)
  })
  
  return playerTransactions
}

/**
 * Get complete history for a drafted player
 */
export function getPlayerDraftHistory(
  pick: DraftPickAnalysis,
  playerStats: Map<string, PlayerSeasonStats>,
  transactions: Map<string, PlayerTransaction[]>,
  teamNames: Map<number, string>
): PlayerDraftHistory {
  const stats = playerStats.get(pick.player_id)
  const playerTxs = transactions.get(pick.player_id) || []
  
  // Add team names to transactions
  const enrichedTxs = playerTxs.map(tx => ({
    ...tx,
    fromTeam: tx.fromRosterId ? teamNames.get(tx.fromRosterId) : undefined,
    toTeam: tx.toRosterId ? teamNames.get(tx.toRosterId) : undefined
  }))
  
  // Build weekly performance
  const weeklyPerformance = (stats?.weeklyPoints || []).map((points, idx) => ({
    week: idx + 1,
    points,
    started: points > 0
  }))
  
  // Calculate season summary
  const validWeeks = weeklyPerformance.filter(w => w.points > 0)
  const bestWeek = validWeeks.length > 0 
    ? validWeeks.reduce((best, w) => w.points > best.points ? w : best)
    : { week: 0, points: 0 }
  const worstWeek = validWeeks.length > 0
    ? validWeeks.reduce((worst, w) => w.points < worst.points ? w : worst)
    : { week: 0, points: 0 }
  
  return {
    player_id: pick.player_id,
    player_name: pick.player_name,
    position: pick.position,
    pick,
    transactions: enrichedTxs,
    weeklyPerformance,
    seasonSummary: {
      totalPoints: stats?.totalPoints || 0,
      gamesPlayed: stats?.gamesPlayed || 0,
      avgPPG: stats?.avgPPG || 0,
      bestWeek,
      worstWeek
    }
  }
}

export const draftAnalysisService = {
  calculatePlayerSeasonStats,
  analyzeDraftPicks,
  analyzeRounds,
  calculateTeamDraftGrades,
  fetchLeagueTransactions,
  getPlayerDraftHistory,
  getPositionalValueMultiplier,
  calculateAdjustedScore
}

export default draftAnalysisService
