// Add this method to yahoo.ts after getPlayerWeeklyStats

/**
 * Get player stats for specific dates (MLB, NBA, NHL only - not NFL)
 * Used for showing recent game-by-game performance
 */
async getPlayerDailyStats(leagueKey: string, playerKey: string, dates: string[]): Promise<Map<string, any>> {
  const dailyStats = new Map<string, any>()
  
  for (const date of dates) {
    try {
      // Format: /league/{league_key}/players;player_keys={player_key}/stats;type=date;date=YYYY-MM-DD
      const data = await this.apiRequest(
        `/league/${leagueKey}/players;player_keys=${playerKey}/stats;type=date;date=${date}?format=json`
      )
      
      const playerData = data.fantasy_content?.league?.[1]?.players?.[0]?.player
      if (!playerData) continue
      
      const statsData = playerData[1]?.player_stats
      const pointsData = playerData[1]?.player_points
      
      // Parse stats array into a map by stat_id
      const statsById: Record<string, number> = {}
      const statsArray = statsData?.stats || []
      statsArray.forEach((s: any) => {
        if (s.stat) {
          statsById[s.stat.stat_id] = parseFloat(s.stat.value || '0')
        }
      })
      
      dailyStats.set(date, {
        date,
        points: parseFloat(pointsData?.total || statsData?.total || '0'),
        stats: statsById,
        rawStats: statsArray
      })
    } catch (e) {
      console.error(`Error fetching date ${date} stats for ${playerKey}:`, e)
    }
  }
  
  return dailyStats
}

/**
 * Get league average stats for specific dates
 * Calculates the average across all rostered players for each date
 */
async getLeagueAverageDailyStats(leagueKey: string, dates: string[], statId: string, isPitching: boolean): Promise<Map<string, number>> {
  const leagueAvgByDate = new Map<string, number>()
  
  try {
    // Get all rostered players first
    const players = await this.getAllRosteredPlayers(leagueKey)
    
    // Filter to relevant player type (pitchers vs hitters)
    const relevantPlayers = players.filter((p: any) => {
      const pos = p.position || ''
      const isPitcher = pos.includes('SP') || pos.includes('RP') || pos === 'P'
      return isPitching ? isPitcher : !isPitcher
    })
    
    // Sample a subset of players to avoid too many API calls (top 20)
    const samplePlayers = relevantPlayers.slice(0, 20)
    
    for (const date of dates) {
      let totalValue = 0
      let playerCount = 0
      
      for (const player of samplePlayers) {
        try {
          const data = await this.apiRequest(
            `/league/${leagueKey}/players;player_keys=${player.player_key}/stats;type=date;date=${date}?format=json`
          )
          
          const playerData = data.fantasy_content?.league?.[1]?.players?.[0]?.player
          if (!playerData) continue
          
          const statsData = playerData[1]?.player_stats
          const statsArray = statsData?.stats || []
          
          // Find the specific stat
          const stat = statsArray.find((s: any) => s.stat?.stat_id === statId)
          if (stat && stat.stat?.value) {
            const value = parseFloat(stat.stat.value)
            if (value > 0) { // Only count games where player actually played
              totalValue += value
              playerCount++
            }
          }
        } catch (e) {
          // Skip individual player errors
        }
      }
      
      leagueAvgByDate.set(date, playerCount > 0 ? totalValue / playerCount : 0)
    }
  } catch (e) {
    console.error('Error calculating league average:', e)
  }
  
  return leagueAvgByDate
}

/**
 * Get recent game dates for a player (dates they actually played)
 * Returns the last N dates where the player had non-zero stats
 */
async getPlayerRecentGameDates(leagueKey: string, playerKey: string, numGames: number = 5): Promise<string[]> {
  const gameDates: string[] = []
  const today = new Date()
  let daysBack = 1
  const maxDaysToCheck = 30 // Don't look back more than 30 days
  
  while (gameDates.length < numGames && daysBack <= maxDaysToCheck) {
    const checkDate = new Date(today)
    checkDate.setDate(today.getDate() - daysBack)
    const dateStr = checkDate.toISOString().split('T')[0] // YYYY-MM-DD format
    
    try {
      const data = await this.apiRequest(
        `/league/${leagueKey}/players;player_keys=${playerKey}/stats;type=date;date=${dateStr}?format=json`
      )
      
      const playerData = data.fantasy_content?.league?.[1]?.players?.[0]?.player
      if (playerData) {
        const statsData = playerData[1]?.player_stats
        const statsArray = statsData?.stats || []
        
        // Check if player had any non-zero stats (meaning they played)
        const hasStats = statsArray.some((s: any) => {
          const val = parseFloat(s.stat?.value || '0')
          return val > 0
        })
        
        if (hasStats) {
          gameDates.push(dateStr)
        }
      }
    } catch (e) {
      // Skip errors for individual dates
    }
    
    daysBack++
  }
  
  return gameDates
}
