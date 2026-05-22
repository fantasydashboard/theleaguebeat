/**
 * Schedule-Adjusted Strength of Schedule Service
 * 
 * Calculates how favorable NFL matchups are for fantasy players by position,
 * using league-wide position averages to determine Points Above Expectation (PAE).
 * 
 * PAE = (Points allowed by defense) - (League average for position)
 * Positive PAE = Defense allows MORE than league average = easier matchup
 * Negative PAE = Defense allows LESS than league average = harder matchup
 */

import { sleeperService } from './sleeper'

// Types
export interface PlayerGameLog {
  player_id: string
  player_name: string
  position: string
  team: string
  week: number
  opponent: string
  fantasy_points: number
}

export interface DefensePositionStats {
  team: string
  position: string
  gamesPlayed: number
  totalPointsAllowed: number
  rawPointsPerGame: number
  rawRank: number
  leagueAvgPPG: number
  adjustmentDelta: number  // PAE: difference from league average (-6 to +6 typical range)
  adjustedRank: number
  matchupGrade: string
  matchupColor: string
}

// Cache
const defenseRankingsCache = new Map<string, Map<string, DefensePositionStats[]>>()

/**
 * Fetch weekly stats for players using Sleeper GraphQL
 */
async function fetchWeeklyStats(
  season: string,
  week: number,
  playerIds: string[]
): Promise<Map<string, any>> {
  if (playerIds.length === 0) return new Map()
  
  const allStats = new Map<string, any>()
  
  // Batch into chunks of 100
  const chunks: string[][] = []
  for (let i = 0; i < playerIds.length; i += 100) {
    chunks.push(playerIds.slice(i, i + 100))
  }
  
  for (const chunk of chunks) {
    const queryKey = `nfl__regular__${season}__${week}__stat`
    const query = `
      query get_player_stats_batch {
        ${queryKey}: stats_for_players_in_week(
          sport: "nfl",
          season: "${season}",
          category: "stat",
          season_type: "regular",
          week: ${week},
          player_ids: [${chunk.map(id => `"${id}"`).join(',')}]
        ) {
          player_id
          week
          season
          team
          opponent
          stats
        }
      }
    `
    
    try {
      const response = await fetch('https://api.sleeper.app/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, operationName: 'get_player_stats_batch', variables: {} })
      })
      
      if (response.ok) {
        const data = await response.json()
        const stats = data.data?.[queryKey] || []
        stats.forEach((s: any) => {
          if (s.player_id && s.opponent) {
            allStats.set(s.player_id, s)
          }
        })
      }
    } catch (error) {
      console.error(`Error fetching week ${week} stats:`, error)
    }
  }
  
  return allStats
}

/**
 * Calculate fantasy points from raw stats (PPR scoring)
 */
function calculateFantasyPoints(stats: any): number {
  if (!stats) return 0
  
  // Use pre-calculated if available
  if (typeof stats.pts_ppr === 'number' && stats.pts_ppr > 0) return stats.pts_ppr
  if (typeof stats.pts_half_ppr === 'number' && stats.pts_half_ppr > 0) {
    return stats.pts_half_ppr + (stats.rec || 0) * 0.5
  }
  
  // Calculate from raw stats
  let points = 0
  points += (stats.pass_yd || 0) * 0.04
  points += (stats.pass_td || 0) * 4
  points += (stats.pass_int || 0) * -1
  points += (stats.rush_yd || 0) * 0.1
  points += (stats.rush_td || 0) * 6
  points += (stats.rec || 0) * 1
  points += (stats.rec_yd || 0) * 0.1
  points += (stats.rec_td || 0) * 6
  points += (stats.fum_lost || 0) * -2
  
  return points
}

/**
 * Safe number validation
 */
function safeNumber(val: any, fallback: number = 0): number {
  if (typeof val !== 'number' || !isFinite(val) || isNaN(val)) {
    return fallback
  }
  return val
}

/**
 * Build game logs for all players
 */
async function buildPlayerGameLogs(
  season: string,
  weeks: number[],
  players: Record<string, any>
): Promise<Map<string, PlayerGameLog[]>> {
  const gameLogs = new Map<string, PlayerGameLog[]>()
  
  const relevantPositions = new Set(['QB', 'RB', 'WR', 'TE'])
  const playerIds = Object.keys(players).filter(id => {
    const player = players[id]
    return relevantPositions.has(player?.position) && player?.team
  })
  
  console.log(`📊 Building game logs for ${playerIds.length} players, weeks ${weeks[0]}-${weeks[weeks.length - 1]}...`)
  
  for (const week of weeks) {
    const weekStats = await fetchWeeklyStats(season, week, playerIds)
    
    weekStats.forEach((stat, playerId) => {
      const player = players[playerId]
      if (!player || !stat.opponent) return
      
      const fantasyPoints = calculateFantasyPoints(stat.stats)
      if (fantasyPoints <= 0) return
      
      const gameLog: PlayerGameLog = {
        player_id: playerId,
        player_name: player.full_name || `${player.first_name} ${player.last_name}`,
        position: player.position,
        team: stat.team || player.team,
        week: week,
        opponent: stat.opponent,
        fantasy_points: safeNumber(fantasyPoints)
      }
      
      if (!gameLogs.has(playerId)) {
        gameLogs.set(playerId, [])
      }
      gameLogs.get(playerId)!.push(gameLog)
    })
    
    // Small delay between weeks
    await new Promise(resolve => setTimeout(resolve, 50))
  }
  
  console.log(`✅ Built game logs for ${gameLogs.size} players`)
  return gameLogs
}

/**
 * Calculate defense rankings using LEAGUE-WIDE position averages
 * This produces wider PAE ranges (-6 to +6) similar to other fantasy sites
 */
function calculateDefenseRankings(
  gameLogs: Map<string, PlayerGameLog[]>
): Map<string, DefensePositionStats[]> {
  const positions = ['QB', 'RB', 'WR', 'TE']
  const rankings = new Map<string, DefensePositionStats[]>()
  
  // Step 1: Calculate LEAGUE-WIDE average points per game for each position
  // This is the total points scored by all players at position / total games played
  const leaguePositionTotals = new Map<string, { points: number; games: number }>()
  
  positions.forEach(pos => {
    leaguePositionTotals.set(pos, { points: 0, games: 0 })
  })
  
  gameLogs.forEach((logs) => {
    logs.forEach(log => {
      const totals = leaguePositionTotals.get(log.position)
      if (totals) {
        totals.points += safeNumber(log.fantasy_points)
        totals.games++
      }
    })
  })
  
  const leagueAvgByPosition = new Map<string, number>()
  leaguePositionTotals.forEach((totals, position) => {
    const avg = totals.games > 0 ? totals.points / totals.games : 0
    leagueAvgByPosition.set(position, avg)
    console.log(`📈 ${position} league average: ${avg.toFixed(2)} PPG (${totals.games} total games)`)
  })
  
  // Step 2: For each position, calculate defense stats vs league average
  for (const position of positions) {
    const leagueAvg = leagueAvgByPosition.get(position) || 0
    
    // Collect all games against each defense for this position
    // Track TOTAL points allowed and number of player-games
    const defenseGames = new Map<string, { 
      totalPointsAllowed: number
      playerGames: number  // Number of individual player performances against this defense
    }>()
    
    gameLogs.forEach((logs) => {
      logs.filter(log => log.position === position).forEach(log => {
        const actual = safeNumber(log.fantasy_points)
        
        if (!defenseGames.has(log.opponent)) {
          defenseGames.set(log.opponent, { totalPointsAllowed: 0, playerGames: 0 })
        }
        
        const stats = defenseGames.get(log.opponent)!
        stats.totalPointsAllowed += actual
        stats.playerGames++
      })
    })
    
    // Step 3: Calculate PAE for each defense
    // PAE = (Points allowed per player-game) - (League average per player-game)
    const positionStats: DefensePositionStats[] = []
    
    defenseGames.forEach((stats, team) => {
      if (stats.playerGames === 0) return
      
      // Average points allowed per player-game by this defense
      const rawPPG = stats.totalPointsAllowed / stats.playerGames
      
      // PAE = how much above/below league average this defense allows
      const pae = rawPPG - leagueAvg
      
      positionStats.push({
        team,
        position,
        gamesPlayed: stats.playerGames,
        totalPointsAllowed: safeNumber(stats.totalPointsAllowed),
        rawPointsPerGame: safeNumber(rawPPG),
        rawRank: 0,
        leagueAvgPPG: safeNumber(leagueAvg),
        adjustmentDelta: safeNumber(pae),
        adjustedRank: 0,
        matchupGrade: '',
        matchupColor: ''
      })
    })
    
    // Step 4: Sort by PAE (highest = easiest matchup for DISPLAY purposes)
    // But we'll assign ranks where #1 = HARDEST (lowest PAE)
    positionStats.sort((a, b) => a.adjustmentDelta - b.adjustmentDelta)  // Ascending: lowest first
    
    // Step 5: Assign ranks - #1 = hardest (lowest/most negative PAE)
    positionStats.forEach((stats, idx) => {
      stats.adjustedRank = idx + 1  // #1 = hardest
      stats.matchupGrade = getMatchupGrade(idx + 1, positionStats.length)
      stats.matchupColor = getMatchupColor(idx + 1, positionStats.length)
    })
    
    // Also sort by raw for raw rank (highest PPG = rank 1 for raw)
    const byRaw = [...positionStats].sort((a, b) => b.rawPointsPerGame - a.rawPointsPerGame)
    byRaw.forEach((stats, idx) => {
      const original = positionStats.find(s => s.team === stats.team)
      if (original) original.rawRank = idx + 1
    })
    
    rankings.set(position, positionStats)
    
    // Log some stats for debugging
    const sorted = [...positionStats].sort((a, b) => b.adjustmentDelta - a.adjustmentDelta)
    console.log(`🛡️ ${position} PAE range: ${sorted[sorted.length - 1]?.adjustmentDelta.toFixed(2)} to ${sorted[0]?.adjustmentDelta.toFixed(2)}`)
  }
  
  return rankings
}

function getMatchupGrade(rank: number, total: number): string {
  const percentile = rank / total
  // Flipped: lower rank = harder = worse grade
  if (percentile <= 0.1) return 'F'
  if (percentile <= 0.2) return 'D'
  if (percentile <= 0.35) return 'C'
  if (percentile <= 0.5) return 'C+'
  if (percentile <= 0.65) return 'B'
  if (percentile <= 0.8) return 'B+'
  if (percentile <= 0.9) return 'A'
  return 'A+'
}

function getMatchupColor(rank: number, total: number): string {
  const percentile = rank / total
  // Flipped: lower rank = harder = red
  if (percentile <= 0.25) return 'text-red-400'
  if (percentile <= 0.45) return 'text-orange-400'
  if (percentile <= 0.55) return 'text-yellow-400'
  if (percentile <= 0.75) return 'text-lime-400'
  return 'text-green-400'
}

/**
 * Main entry point - get adjusted defense rankings
 */
export async function getAdjustedDefenseRankings(
  season: string,
  currentWeek: number,
  players: Record<string, any>
): Promise<Map<string, DefensePositionStats[]>> {
  const cacheKey = `${season}-${currentWeek}`
  if (defenseRankingsCache.has(cacheKey)) {
    return defenseRankingsCache.get(cacheKey)!
  }
  
  // Start from week 1 to get full season data
  const startWeek = 1
  if (currentWeek < 3) {
    console.warn('Not enough weeks for reliable schedule analysis')
    return new Map()
  }
  
  const weeks = Array.from({ length: currentWeek - startWeek + 1 }, (_, i) => startWeek + i)
  
  console.log(`🏈 Calculating league-wide position averages for ${season}, weeks ${startWeek}-${currentWeek}...`)
  
  const gameLogs = await buildPlayerGameLogs(season, weeks, players)
  
  if (gameLogs.size === 0) {
    console.warn('No game logs found - API may not have data for this season yet')
    return new Map()
  }
  
  const rankings = calculateDefenseRankings(gameLogs)
  
  console.log('✅ Rankings calculated with league-wide averages')
  defenseRankingsCache.set(cacheKey, rankings)
  
  return rankings
}

/**
 * Clear cache
 */
export function clearScheduleStrengthCache(): void {
  defenseRankingsCache.clear()
}

export default {
  getAdjustedDefenseRankings,
  clearScheduleStrengthCache
}
