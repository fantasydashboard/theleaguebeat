/**
 * Daily Score Reconstruction Service
 * 
 * Reconstructs daily scoring data from ESPN's historical API data.
 * This allows us to generate accurate Monte Carlo simulations for past weeks
 * without needing real-time snapshots.
 * 
 * For ESPN Baseball:
 * - Each week has 7 days (Mon-Sun)
 * - ESPN stores cumulative weekly totals, not daily
 * - We can estimate daily progression using:
 *   1. Pro-rata distribution based on typical daily patterns
 *   2. Player game logs if available
 *   3. League-wide daily scoring averages
 */

import { espnService } from './espn'

export interface DailyScore {
  day: number // 0=Mon, 6=Sun
  dayName: string
  team1Points: number
  team2Points: number
  team1WinProb: number
  team2WinProb: number
  isEstimated: boolean
}

export interface ReconstructedMatchupHistory {
  matchupId: number
  week: number
  season: number
  team1Key: string
  team1Name: string
  team1FinalPoints: number
  team2Key: string
  team2Name: string
  team2FinalPoints: number
  dailyScores: DailyScore[]
  winner: 'team1' | 'team2' | 'tie'
}

// Typical daily scoring distribution for baseball (based on typical game schedules)
// Most teams play 5-6 games per week, with some rest days
const BASEBALL_DAILY_WEIGHTS = [
  0.14,  // Monday - often fewer games (some teams off from Sunday)
  0.15,  // Tuesday - full slate
  0.15,  // Wednesday - full slate
  0.14,  // Thursday - often getaway day, some day games
  0.14,  // Friday - full slate
  0.14,  // Saturday - full slate
  0.14   // Sunday - full slate, mostly day games
]

// Typical daily scoring distribution for hockey
const HOCKEY_DAILY_WEIGHTS = [
  0.10,  // Monday - light schedule
  0.15,  // Tuesday - full slate
  0.12,  // Wednesday - moderate
  0.16,  // Thursday - full slate
  0.14,  // Friday - moderate
  0.17,  // Saturday - full slate
  0.16   // Sunday - good slate
]

// Typical daily scoring distribution for basketball
const BASKETBALL_DAILY_WEIGHTS = [
  0.12,  // Monday - light
  0.14,  // Tuesday - moderate
  0.15,  // Wednesday - full
  0.14,  // Thursday - moderate
  0.15,  // Friday - full
  0.16,  // Saturday - full
  0.14   // Sunday - moderate
]

function getDailyWeights(sport: string): number[] {
  switch (sport) {
    case 'baseball':
      return BASEBALL_DAILY_WEIGHTS
    case 'hockey':
      return HOCKEY_DAILY_WEIGHTS
    case 'basketball':
      return BASKETBALL_DAILY_WEIGHTS
    default:
      return [1/7, 1/7, 1/7, 1/7, 1/7, 1/7, 1/7] // Even distribution
  }
}

/**
 * Run Monte Carlo simulation for a specific point in the week
 */
function runMonteCarlo(
  team1CurrentPoints: number,
  team2CurrentPoints: number,
  team1AvgRemaining: number,
  team1StdDev: number,
  team2AvgRemaining: number,
  team2StdDev: number,
  iterations: number = 5000
): { team1WinPct: number; team2WinPct: number } {
  if (team1AvgRemaining <= 0 && team2AvgRemaining <= 0) {
    // No remaining points - use current scores
    if (team1CurrentPoints > team2CurrentPoints) return { team1WinPct: 100, team2WinPct: 0 }
    if (team2CurrentPoints > team1CurrentPoints) return { team1WinPct: 0, team2WinPct: 100 }
    return { team1WinPct: 50, team2WinPct: 50 }
  }
  
  let team1Wins = 0
  let team2Wins = 0
  
  // Box-Muller transform for normal distribution
  function gaussianRandom(mean: number, stdDev: number): number {
    const u1 = Math.random()
    const u2 = Math.random()
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
    return Math.max(0, mean + z * stdDev)
  }
  
  for (let i = 0; i < iterations; i++) {
    const team1Final = team1CurrentPoints + gaussianRandom(team1AvgRemaining, team1StdDev)
    const team2Final = team2CurrentPoints + gaussianRandom(team2AvgRemaining, team2StdDev)
    
    if (team1Final > team2Final) team1Wins++
    else if (team2Final > team1Final) team2Wins++
    // Ties split evenly
  }
  
  const ties = iterations - team1Wins - team2Wins
  const team1WinPct = ((team1Wins + ties / 2) / iterations) * 100
  
  return {
    team1WinPct: Math.round(team1WinPct * 10) / 10,
    team2WinPct: Math.round((100 - team1WinPct) * 10) / 10
  }
}

/**
 * Reconstruct daily scores for a completed matchup
 * 
 * KEY INSIGHT: For each day, we simulate what an observer would have thought
 * at the END of that day. They know the cumulative score so far, but they'd
 * estimate remaining points based on HISTORICAL AVERAGES, not the actual future.
 * 
 * This creates realistic probability curves that converge to 100/0 on Sunday.
 */
export function reconstructDailyScores(
  team1FinalPoints: number,
  team2FinalPoints: number,
  sport: string = 'baseball',
  teamStats?: {
    team1AvgWeekly: number
    team1StdDev: number
    team2AvgWeekly: number
    team2StdDev: number
  }
): DailyScore[] {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const weights = getDailyWeights(sport)
  const dailyScores: DailyScore[] = []
  
  // Get team's historical weekly averages (or use final as fallback estimate)
  const team1AvgWeekly = teamStats?.team1AvgWeekly || team1FinalPoints
  const team2AvgWeekly = teamStats?.team2AvgWeekly || team2FinalPoints
  const team1WeeklyStdDev = teamStats?.team1StdDev || (team1AvgWeekly * 0.15)
  const team2WeeklyStdDev = teamStats?.team2StdDev || (team2AvgWeekly * 0.15)
  
  // Calculate cumulative weights for each day
  let cumulativeWeight = 0
  const cumulativeWeights: number[] = []
  for (let i = 0; i < 7; i++) {
    cumulativeWeight += weights[i]
    cumulativeWeights.push(cumulativeWeight)
  }
  
  for (let day = 0; day < 7; day++) {
    // Calculate cumulative points at end of this day (based on actual final score)
    const team1Cumulative = team1FinalPoints * cumulativeWeights[day]
    const team2Cumulative = team2FinalPoints * cumulativeWeights[day]
    
    const daysRemaining = 6 - day
    const daysCompleted = day + 1
    
    let winProb: { team1WinPct: number; team2WinPct: number }
    
    if (day === 6) {
      // SUNDAY - Final result, no more games, deterministic outcome
      if (team1FinalPoints > team2FinalPoints) {
        winProb = { team1WinPct: 100, team2WinPct: 0 }
      } else if (team2FinalPoints > team1FinalPoints) {
        winProb = { team1WinPct: 0, team2WinPct: 100 }
      } else {
        winProb = { team1WinPct: 50, team2WinPct: 50 }
      }
    } else {
      // Days Mon-Sat: Simulate what an observer would think at end of this day
      // They know current cumulative scores, but estimate remaining based on HISTORICAL AVERAGES
      
      // What fraction of the week is remaining?
      const remainingFraction = 1 - cumulativeWeights[day]
      
      // Expected remaining points based on historical average (NOT actual remaining!)
      const team1ExpectedRemaining = team1AvgWeekly * remainingFraction
      const team2ExpectedRemaining = team2AvgWeekly * remainingFraction
      
      // Variance scales with sqrt of remaining days
      const varianceScale = Math.sqrt(daysRemaining / 7)
      const team1RemainingStdDev = team1WeeklyStdDev * varianceScale
      const team2RemainingStdDev = team2WeeklyStdDev * varianceScale
      
      winProb = runMonteCarlo(
        team1Cumulative,
        team2Cumulative,
        team1ExpectedRemaining,
        team1RemainingStdDev,
        team2ExpectedRemaining,
        team2RemainingStdDev,
        5000
      )
    }
    
    dailyScores.push({
      day,
      dayName: days[day],
      team1Points: Math.round(team1Cumulative * 10) / 10,
      team2Points: Math.round(team2Cumulative * 10) / 10,
      team1WinProb: winProb.team1WinPct,
      team2WinProb: winProb.team2WinPct,
      isEstimated: true
    })
  }
  
  return dailyScores
}

/**
 * Reconstruct matchup history for a completed week
 */
export function reconstructMatchupHistory(
  matchup: {
    matchupId: number
    week: number
    season: number
    team1: { teamKey: string; name: string; points: number }
    team2: { teamKey: string; name: string; points: number }
  },
  sport: string = 'baseball',
  teamStats?: {
    team1AvgWeekly: number
    team1StdDev: number
    team2AvgWeekly: number
    team2StdDev: number
  }
): ReconstructedMatchupHistory {
  const dailyScores = reconstructDailyScores(
    matchup.team1.points,
    matchup.team2.points,
    sport,
    teamStats
  )
  
  let winner: 'team1' | 'team2' | 'tie' = 'tie'
  if (matchup.team1.points > matchup.team2.points) winner = 'team1'
  else if (matchup.team2.points > matchup.team1.points) winner = 'team2'
  
  return {
    matchupId: matchup.matchupId,
    week: matchup.week,
    season: matchup.season,
    team1Key: matchup.team1.teamKey,
    team1Name: matchup.team1.name,
    team1FinalPoints: matchup.team1.points,
    team2Key: matchup.team2.teamKey,
    team2Name: matchup.team2.name,
    team2FinalPoints: matchup.team2.points,
    dailyScores,
    winner
  }
}

/**
 * Calculate team's historical stats from past matchups
 */
export function calculateTeamHistoricalStats(
  teamKey: string,
  allMatchups: Map<number, any[]>
): { avgWeekly: number; stdDev: number } {
  const weeklyScores: number[] = []
  
  for (const [week, matchups] of allMatchups) {
    for (const matchup of matchups) {
      const teams = matchup.teams || []
      for (const team of teams) {
        if (team.team_key === teamKey && team.points > 0) {
          weeklyScores.push(team.points)
        }
      }
    }
  }
  
  if (weeklyScores.length === 0) {
    return { avgWeekly: 100, stdDev: 20 } // Default fallback
  }
  
  const avgWeekly = weeklyScores.reduce((a, b) => a + b, 0) / weeklyScores.length
  const variance = weeklyScores.reduce((sum, score) => sum + Math.pow(score - avgWeekly, 2), 0) / weeklyScores.length
  const stdDev = Math.sqrt(variance)
  
  return {
    avgWeekly,
    stdDev: Math.max(stdDev, avgWeekly * 0.1) // Minimum 10% variance
  }
}

/**
 * Generate win probability history for a matchup using reconstruction
 * This is the main function to call from the UI
 */
export function generateWinProbabilityHistory(
  matchup: {
    matchup_id: number
    team1: { team_key: string; name: string; points: number }
    team2: { team_key: string; name: string; points: number }
    status?: string
  },
  sport: string = 'baseball',
  allMatchupsHistory?: Map<number, any[]>,
  currentDayIndex?: number // 0-6, only for live matchups
): DailyScore[] {
  const isCompleted = matchup.status === 'final'
  
  // Calculate team stats from history if available
  let teamStats: { team1AvgWeekly: number; team1StdDev: number; team2AvgWeekly: number; team2StdDev: number } | undefined
  
  if (allMatchupsHistory && allMatchupsHistory.size > 0) {
    const team1Stats = calculateTeamHistoricalStats(matchup.team1.team_key, allMatchupsHistory)
    const team2Stats = calculateTeamHistoricalStats(matchup.team2.team_key, allMatchupsHistory)
    
    teamStats = {
      team1AvgWeekly: team1Stats.avgWeekly,
      team1StdDev: team1Stats.stdDev,
      team2AvgWeekly: team2Stats.avgWeekly,
      team2StdDev: team2Stats.stdDev
    }
  }
  
  if (isCompleted) {
    // For completed matchups, reconstruct the daily progression
    return reconstructDailyScores(
      matchup.team1.points,
      matchup.team2.points,
      sport,
      teamStats
    )
  }
  
  // For live matchups, we need to handle differently
  // Current points are actual, future days need Monte Carlo projection
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const dailyScores: DailyScore[] = []
  
  const today = currentDayIndex ?? (new Date().getDay() === 0 ? 6 : new Date().getDay() - 1)
  const team1CurrentPoints = matchup.team1.points || 0
  const team2CurrentPoints = matchup.team2.points || 0
  
  // Calculate expected daily averages
  const team1AvgWeekly = teamStats?.team1AvgWeekly || team1CurrentPoints * 7 / (today + 1)
  const team2AvgWeekly = teamStats?.team2AvgWeekly || team2CurrentPoints * 7 / (today + 1)
  const team1DailyAvg = team1AvgWeekly / 7
  const team2DailyAvg = team2AvgWeekly / 7
  const team1StdDev = teamStats?.team1StdDev || team1AvgWeekly * 0.15
  const team2StdDev = teamStats?.team2StdDev || team2AvgWeekly * 0.15
  
  for (let day = 0; day < 7; day++) {
    const daysRemaining = 6 - day
    
    if (day < today) {
      // Past days - interpolate from start (50%) to current
      const progress = (day + 1) / (today + 1)
      const team1Interpolated = team1CurrentPoints * progress
      const team2Interpolated = team2CurrentPoints * progress
      const total = team1Interpolated + team2Interpolated
      const prob = total > 0 ? (team1Interpolated / total) * 100 : 50
      const interpolatedProb = 50 + (prob - 50) * progress
      
      dailyScores.push({
        day,
        dayName: days[day],
        team1Points: Math.round(team1Interpolated * 10) / 10,
        team2Points: Math.round(team2Interpolated * 10) / 10,
        team1WinProb: Math.round(interpolatedProb * 10) / 10,
        team2WinProb: Math.round((100 - interpolatedProb) * 10) / 10,
        isEstimated: true
      })
    } else if (day === today) {
      // Today - use current actual scores with Monte Carlo for remaining
      const team1RemainingExpected = team1DailyAvg * daysRemaining
      const team2RemainingExpected = team2DailyAvg * daysRemaining
      const dailyStdDev1 = team1StdDev / Math.sqrt(7) * Math.sqrt(daysRemaining)
      const dailyStdDev2 = team2StdDev / Math.sqrt(7) * Math.sqrt(daysRemaining)
      
      const winProb = runMonteCarlo(
        team1CurrentPoints,
        team2CurrentPoints,
        team1RemainingExpected,
        dailyStdDev1,
        team2RemainingExpected,
        dailyStdDev2,
        5000
      )
      
      dailyScores.push({
        day,
        dayName: days[day],
        team1Points: team1CurrentPoints,
        team2Points: team2CurrentPoints,
        team1WinProb: winProb.team1WinPct,
        team2WinProb: winProb.team2WinPct,
        isEstimated: false // Today's points are real
      })
    } else {
      // Future days - project forward using Monte Carlo
      const team1ProjectedAtDay = team1CurrentPoints + team1DailyAvg * (day - today)
      const team2ProjectedAtDay = team2CurrentPoints + team2DailyAvg * (day - today)
      const team1RemainingFromDay = team1DailyAvg * daysRemaining
      const team2RemainingFromDay = team2DailyAvg * daysRemaining
      const dailyStdDev1 = team1StdDev / Math.sqrt(7) * Math.sqrt(daysRemaining)
      const dailyStdDev2 = team2StdDev / Math.sqrt(7) * Math.sqrt(daysRemaining)
      
      const winProb = runMonteCarlo(
        team1ProjectedAtDay,
        team2ProjectedAtDay,
        team1RemainingFromDay,
        dailyStdDev1,
        team2RemainingFromDay,
        dailyStdDev2,
        3000
      )
      
      dailyScores.push({
        day,
        dayName: days[day],
        team1Points: Math.round(team1ProjectedAtDay * 10) / 10,
        team2Points: Math.round(team2ProjectedAtDay * 10) / 10,
        team1WinProb: winProb.team1WinPct,
        team2WinProb: winProb.team2WinPct,
        isEstimated: true
      })
    }
  }
  
  return dailyScores
}

export const dailyScoreReconstructionService = {
  reconstructDailyScores,
  reconstructMatchupHistory,
  calculateTeamHistoricalStats,
  generateWinProbabilityHistory,
  getDailyWeights
}

export default dailyScoreReconstructionService
