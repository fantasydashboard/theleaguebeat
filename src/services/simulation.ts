/**
 * Playoff Simulation Service
 * Handles Monte Carlo simulations for playoff probabilities
 */

import type { SleeperMatchup } from '@/types/sleeper'

export interface TeamStrength {
  roster_id: number
  avgPPG: number
  stdDev: number
  wins: number
  losses: number
  ties: number
  pointsFor: number
}

export interface RemainingGame {
  week: number
  team1: number
  team2: number
}

export interface SimulationResult {
  roster_id: number
  playoffAppearances: number
  totalWins: number
  totalLosses: number
  clinchCount: number
}

export interface PlayoffSettings {
  format: 'top_overall' | 'top_per_division'
  playoffTeams: number
  numDivisions: number
  playoffWeekStart: number
  currentWeek: number
  divisionAssignments: number[][]
}

/**
 * Calculate team strength metrics from historical data
 */
export function calculateTeamStrength(
  rosterId: number,
  matchupsByWeek: Map<number, SleeperMatchup[]>,
  currentWeek: number
): TeamStrength {
  const scores: number[] = []
  let wins = 0
  let losses = 0
  let ties = 0
  
  matchupsByWeek.forEach((weekMatchups, week) => {
    if (week >= currentWeek) return
    
    const myMatch = weekMatchups.find(m => m.roster_id === rosterId)
    if (!myMatch?.matchup_id) return
    
    const opponent = weekMatchups.find(m => 
      m.matchup_id === myMatch.matchup_id && m.roster_id !== rosterId
    )
    
    if (myMatch.points !== undefined) {
      scores.push(myMatch.points)
    }
    
    if (opponent) {
      const myPoints = myMatch.points || 0
      const oppPoints = opponent.points || 0
      
      if (myPoints > oppPoints) wins++
      else if (myPoints < oppPoints) losses++
      else ties++
    }
  })
  
  const avgPPG = scores.length > 0 
    ? scores.reduce((a, b) => a + b, 0) / scores.length 
    : 0
  
  const variance = scores.length > 0
    ? scores.reduce((sum, score) => sum + Math.pow(score - avgPPG, 2), 0) / scores.length
    : 0
  
  const stdDev = Math.sqrt(variance)
  
  return {
    roster_id: rosterId,
    avgPPG,
    stdDev: Math.max(stdDev, 10), // Minimum variance
    wins,
    losses,
    ties,
    pointsFor: scores.reduce((a, b) => a + b, 0)
  }
}

/**
 * Generate remaining schedule from matchups
 */
export function generateRemainingSchedule(
  matchupsByWeek: Map<number, SleeperMatchup[]>,
  currentWeek: number,
  playoffWeekStart: number
): RemainingGame[] {
  const games: RemainingGame[] = []
  
  matchupsByWeek.forEach((weekMatchups, week) => {
    if (week < currentWeek || week >= playoffWeekStart) return
    
    const processed = new Set<number>()
    
    weekMatchups.forEach(matchup => {
      if (!matchup.matchup_id || processed.has(matchup.matchup_id)) return
      
      const opponent = weekMatchups.find(m => 
        m.matchup_id === matchup.matchup_id && m.roster_id !== matchup.roster_id
      )
      
      if (opponent) {
        games.push({
          week,
          team1: matchup.roster_id,
          team2: opponent.roster_id
        })
        processed.add(matchup.matchup_id)
      }
    })
  })
  
  return games
}

/**
 * Simulate a single game between two teams
 */
function simulateGame(team1: TeamStrength, team2: TeamStrength): 'team1' | 'team2' | 'tie' {
  // Generate scores based on normal distribution
  const team1Score = Math.max(0, team1.avgPPG + (Math.random() - 0.5) * 2 * team1.stdDev)
  const team2Score = Math.max(0, team2.avgPPG + (Math.random() - 0.5) * 2 * team2.stdDev)
  
  const diff = Math.abs(team1Score - team2Score)
  
  // Ties are rare in fantasy (within 0.1 points)
  if (diff < 0.1) return 'tie'
  
  return team1Score > team2Score ? 'team1' : 'team2'
}

/**
 * Determine playoff teams based on final standings
 */
function determinePlayoffTeams(
  standings: Map<number, { wins: number; losses: number; ties: number; pointsFor: number }>,
  settings: PlayoffSettings
): Set<number> {
  const playoffTeams = new Set<number>()
  
  if (settings.format === 'top_overall') {
    // Sort all teams by record
    const sorted = Array.from(standings.entries()).sort((a, b) => {
      const [, statsA] = a
      const [, statsB] = b
      
      // Compare wins
      if (statsB.wins !== statsA.wins) return statsB.wins - statsA.wins
      
      // Tiebreaker: points for
      return statsB.pointsFor - statsA.pointsFor
    })
    
    // Take top N
    sorted.slice(0, settings.playoffTeams).forEach(([rosterId]) => {
      playoffTeams.add(rosterId)
    })
  } else {
    // Division-based playoffs
    const divisionStandings: Map<number, Array<[number, any]>> = new Map()
    
    // Group teams by division
    settings.divisionAssignments.forEach((teams, divIdx) => {
      const divTeams = Array.from(standings.entries())
        .filter(([rosterId]) => teams.includes(rosterId))
        .sort((a, b) => {
          const [, statsA] = a
          const [, statsB] = b
          
          if (statsB.wins !== statsA.wins) return statsB.wins - statsA.wins
          return statsB.pointsFor - statsA.pointsFor
        })
      
      divisionStandings.set(divIdx, divTeams)
    })
    
    // Take top N from each division
    divisionStandings.forEach(divTeams => {
      divTeams.slice(0, settings.playoffTeams).forEach(([rosterId]) => {
        playoffTeams.add(rosterId)
      })
    })
  }
  
  return playoffTeams
}

/**
 * Run Monte Carlo simulation
 */
export function runMonteCarloSimulation(
  teamStrengths: Map<number, TeamStrength>,
  remainingGames: RemainingGame[],
  settings: PlayoffSettings,
  iterations: number = 10000
): Map<number, SimulationResult> {
  const results = new Map<number, SimulationResult>()
  
  // Initialize results
  teamStrengths.forEach((strength, rosterId) => {
    results.set(rosterId, {
      roster_id: rosterId,
      playoffAppearances: 0,
      totalWins: 0,
      totalLosses: 0,
      clinchCount: 0
    })
  })
  
  // Run simulations
  for (let i = 0; i < iterations; i++) {
    // Initialize season records from current standings
    const seasonRecords = new Map<number, { wins: number; losses: number; ties: number; pointsFor: number }>()
    
    teamStrengths.forEach((strength, rosterId) => {
      seasonRecords.set(rosterId, {
        wins: strength.wins,
        losses: strength.losses,
        ties: strength.ties,
        pointsFor: strength.pointsFor
      })
    })
    
    // Simulate remaining games
    remainingGames.forEach(game => {
      const team1Strength = teamStrengths.get(game.team1)
      const team2Strength = teamStrengths.get(game.team2)
      
      if (!team1Strength || !team2Strength) return
      
      const outcome = simulateGame(team1Strength, team2Strength)
      
      const team1Record = seasonRecords.get(game.team1)!
      const team2Record = seasonRecords.get(game.team2)!
      
      if (outcome === 'team1') {
        team1Record.wins++
        team2Record.losses++
      } else if (outcome === 'team2') {
        team2Record.wins++
        team1Record.losses++
      } else {
        team1Record.ties++
        team2Record.ties++
      }
    })
    
    // Determine playoff teams
    const playoffTeams = determinePlayoffTeams(seasonRecords, settings)
    
    // Update results
    seasonRecords.forEach((record, rosterId) => {
      const result = results.get(rosterId)!
      
      result.totalWins += record.wins
      result.totalLosses += record.losses
      
      if (playoffTeams.has(rosterId)) {
        result.playoffAppearances++
      }
    })
  }
  
  return results
}

/**
 * Calculate magic number for a team
 */
export function calculateMagicNumber(
  rosterId: number,
  currentStandings: Map<number, { wins: number; losses: number; pointsFor: number }>,
  remainingGames: RemainingGame[],
  settings: PlayoffSettings
): number | null {
  const myRecord = currentStandings.get(rosterId)
  if (!myRecord) return null
  
  const myRemainingGames = remainingGames.filter(g => 
    g.team1 === rosterId || g.team2 === rosterId
  ).length
  
  // Try each number of additional wins
  for (let additionalWins = 0; additionalWins <= myRemainingGames; additionalWins++) {
    const projectedWins = myRecord.wins + additionalWins
    
    // Check if this guarantees playoff spot
    let guaranteed = true
    
    if (settings.format === 'top_overall') {
      // Count how many teams could potentially beat this record
      let teamsThatCouldBeat = 0
      
      currentStandings.forEach((record, otherId) => {
        if (otherId === rosterId) return
        
        const theirRemaining = remainingGames.filter(g => 
          g.team1 === otherId || g.team2 === otherId
        ).length
        
        const maxPossibleWins = record.wins + theirRemaining
        
        // Could they beat or tie our projected record?
        if (maxPossibleWins >= projectedWins) {
          teamsThatCouldBeat++
        }
      })
      
      // If fewer than playoffTeams could beat us, we're guaranteed
      guaranteed = teamsThatCouldBeat < settings.playoffTeams
    } else {
      // Division-based: only need to beat teams in our division
      const myDivision = settings.divisionAssignments.findIndex(teams => 
        teams.includes(rosterId)
      )
      
      if (myDivision === -1) return null
      
      const divisionTeams = settings.divisionAssignments[myDivision]
      let teamsThatCouldBeat = 0
      
      divisionTeams.forEach(otherId => {
        if (otherId === rosterId) return
        
        const record = currentStandings.get(otherId)
        if (!record) return
        
        const theirRemaining = remainingGames.filter(g => 
          g.team1 === otherId || g.team2 === otherId
        ).length
        
        const maxPossibleWins = record.wins + theirRemaining
        
        if (maxPossibleWins >= projectedWins) {
          teamsThatCouldBeat++
        }
      })
      
      guaranteed = teamsThatCouldBeat < settings.playoffTeams
    }
    
    if (guaranteed) {
      return additionalWins
    }
  }
  
  return null // Must win out
}

/**
 * Calculate elimination number for a team
 */
export function calculateEliminationNumber(
  rosterId: number,
  currentStandings: Map<number, { wins: number; losses: number; pointsFor: number }>,
  remainingGames: RemainingGame[],
  settings: PlayoffSettings
): number | null {
  const myRecord = currentStandings.get(rosterId)
  if (!myRecord) return null
  
  const myRemainingGames = remainingGames.filter(g => 
    g.team1 === rosterId || g.team2 === rosterId
  ).length
  
  const maxPossibleWins = myRecord.wins + myRemainingGames
  
  // Try each number of additional losses
  for (let additionalLosses = 0; additionalLosses <= myRemainingGames; additionalLosses++) {
    const projectedLosses = myRecord.losses + additionalLosses
    const projectedWins = myRecord.wins + (myRemainingGames - additionalLosses)
    
    // Check if this eliminates us
    let eliminated = true
    
    if (settings.format === 'top_overall') {
      // Count how many teams will definitely finish ahead
      let teamsGuaranteedAhead = 0
      
      currentStandings.forEach((record, otherId) => {
        if (otherId === rosterId) return
        
        // Their minimum possible wins (if they lose out)
        const minPossibleWins = record.wins
        
        // If their floor is better than our ceiling, they're guaranteed ahead
        if (minPossibleWins > projectedWins) {
          teamsGuaranteedAhead++
        }
      })
      
      // If playoffTeams or more are guaranteed ahead, we're eliminated
      eliminated = teamsGuaranteedAhead >= settings.playoffTeams
    } else {
      // Division-based
      const myDivision = settings.divisionAssignments.findIndex(teams => 
        teams.includes(rosterId)
      )
      
      if (myDivision === -1) return null
      
      const divisionTeams = settings.divisionAssignments[myDivision]
      let teamsGuaranteedAhead = 0
      
      divisionTeams.forEach(otherId => {
        if (otherId === rosterId) return
        
        const record = currentStandings.get(otherId)
        if (!record) return
        
        if (record.wins > projectedWins) {
          teamsGuaranteedAhead++
        }
      })
      
      eliminated = teamsGuaranteedAhead >= settings.playoffTeams
    }
    
    if (eliminated) {
      return additionalLosses
    }
  }
  
  return null // Can't be eliminated
}

export const simulationService = {
  calculateTeamStrength,
  generateRemainingSchedule,
  runMonteCarloSimulation,
  calculateMagicNumber,
  calculateEliminationNumber
}
