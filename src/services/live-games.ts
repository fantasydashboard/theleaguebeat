// =====================================================
// LIVE GAMES SERVICE - Frontend Integration
// =====================================================
// Purpose: Consume live games data from Supabase
// Location: src/services/live-games.ts
// =====================================================

import { supabase } from '@/lib/supabase'
import type { Sport } from '@/types/supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'

export interface LiveGame {
  gameId: string
  sport: Sport
  homeTeam: string
  awayTeam: string
  homeScore: number
  awayScore: number
  status: 'scheduled' | 'live' | 'final' | 'postponed' | 'cancelled'
  period: string | null
  timeRemaining: string | null
  gameTime: string
  gameDate: string
  venue: string | null
}

export interface PlayerGameInfo {
  hasGame: boolean
  opponent: string | null
  isHome: boolean
  gameTime: string | null
  status: 'scheduled' | 'live' | 'final' | null
  period: string | null
  timeRemaining: string | null
  score: string | null
  isLive: boolean
  gameId: string | null
}

export interface GamesSummary {
  total: number
  live: number
  scheduled: number
  final: number
}

// =====================================================
// ESPN PUBLIC API FALLBACK
// =====================================================
// Fetches schedule from ESPN's free public scoreboard
// API when Supabase returns no games for a date.
// No auth required.
// =====================================================

const ESPN_SPORT_PATHS: Record<string, string> = {
  basketball: 'basketball/nba',
  hockey: 'hockey/nhl',
  baseball: 'baseball/mlb',
  football: 'football/nfl',
}

async function fetchEspnGames(sport: Sport, localDate: Date): Promise<LiveGame[]> {
  const path = ESPN_SPORT_PATHS[sport]
  if (!path) return []

  // ESPN uses YYYYMMDD format for the dates param
  const y = localDate.getFullYear()
  const m = String(localDate.getMonth() + 1).padStart(2, '0')
  const d = String(localDate.getDate()).padStart(2, '0')
  const dateStr = `${y}${m}${d}`

  const url = `https://site.api.espn.com/apis/site/v2/sports/${path}/scoreboard?dates=${dateStr}`
  console.log(`[LiveGames][ESPN Fallback] Fetching: ${url}`)

  try {
    const resp = await fetch(url)
    if (!resp.ok) {
      console.warn(`[LiveGames][ESPN Fallback] HTTP ${resp.status} for ${url}`)
      return []
    }
    const data = await resp.json()
    const events: any[] = data.events || []
    console.log(`[LiveGames][ESPN Fallback] Got ${events.length} events for ${sport} on ${dateStr}`)

    const games: LiveGame[] = []
    for (const event of events) {
      const competition = event.competitions?.[0]
      if (!competition) continue

      const homeComp = competition.competitors?.find((c: any) => c.homeAway === 'home')
      const awayComp = competition.competitors?.find((c: any) => c.homeAway === 'away')
      if (!homeComp || !awayComp) continue

      const homeTeam: string = (homeComp.team?.abbreviation || '').toUpperCase()
      const awayTeam: string = (awayComp.team?.abbreviation || '').toUpperCase()

      const espnStatus = competition.status?.type?.name || ''
      let status: LiveGame['status'] = 'scheduled'
      if (espnStatus === 'STATUS_IN_PROGRESS') status = 'live'
      else if (espnStatus === 'STATUS_FINAL' || espnStatus === 'STATUS_FINAL_OT' || espnStatus === 'STATUS_FINAL_SHOOTOUT') status = 'final'
      else if (espnStatus === 'STATUS_POSTPONED') status = 'postponed'
      else if (espnStatus === 'STATUS_CANCELLED') status = 'cancelled'

      const period = competition.status?.period
        ? `${competition.status.period > 4 && sport === 'basketball' ? 'OT' : 'Q'}${competition.status.period}`
        : null
      const clock = competition.status?.displayClock || null

      games.push({
        gameId: `espn_${event.id}`,
        sport,
        homeTeam,
        awayTeam,
        homeScore: parseInt(homeComp.score || '0', 10),
        awayScore: parseInt(awayComp.score || '0', 10),
        status,
        period: status === 'live' ? period : null,
        timeRemaining: status === 'live' ? clock : null,
        gameTime: event.date || '',
        gameDate: `${y}-${m}-${d}`,
        venue: competition.venue?.fullName || null,
      })
    }
    return games
  } catch (err) {
    console.error('[LiveGames][ESPN Fallback] Error:', err)
    return []
  }
}

class LiveGamesService {
  
  /**
   * Get today's games for a specific sport
   */
  async getTodaysGames(sport: Sport): Promise<LiveGame[]> {
    const today = new Date().toISOString().split('T')[0]
    
    const { data, error } = await supabase
      .from('games_schedule')
      .select('*')
      .eq('sport', this.mapSportToDbValue(sport))
      .eq('game_date', today)
      .order('game_time', { ascending: true })
    
    if (error) {
      console.error('Error fetching today\'s games:', error)
      throw error
    }
    
    return (data || []).map(this.mapDbGameToLiveGame)
  }
  
  /**
   * Get tomorrow's games for a specific sport
   */
  async getTomorrowsGames(sport: Sport): Promise<LiveGame[]> {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const dateStr = tomorrow.toISOString().split('T')[0]
    
    const { data, error } = await supabase
      .from('games_schedule')
      .select('*')
      .eq('sport', this.mapSportToDbValue(sport))
      .eq('game_date', dateStr)
      .order('game_time', { ascending: true })
    
    if (error) {
      console.error('Error fetching tomorrow\'s games:', error)
      throw error
    }
    
    return (data || []).map(this.mapDbGameToLiveGame)
  }
  
  /**
   * Get games for a specific date
   */
  async getGamesByDate(sport: Sport, date: Date): Promise<LiveGame[]> {
    // Use local date string to avoid UTC timezone shift causing wrong day queries
    const dateStr = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`
    
    const { data, error } = await supabase
      .from('games_schedule')
      .select('*')
      .eq('sport', this.mapSportToDbValue(sport))
      .eq('game_date', dateStr)
      .order('game_time', { ascending: true })
    
    if (error) {
      console.error('Error fetching games by date:', error)
      throw error
    }
    
    return (data || []).map(this.mapDbGameToLiveGame)
  }

  /**
   * Get games for a LOCAL calendar date, handling UTC storage offset.
   *
   * Primary source: Supabase games_schedule table (scraped data).
   * Fallback: ESPN public scoreboard API (no auth required).
   *
   * The fallback kicks in when Supabase returns 0 games, which can happen
   * if the scraper is down, hasn't run yet today, or is behind on data.
   */
  async getGamesForLocalDate(sport: Sport, localDate: Date): Promise<LiveGame[]> {
    const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
    const localDateStr = fmt(localDate)
    const nextDay = new Date(localDate.getTime() + 86400000)
    const nextDateStr = fmt(nextDay)

    // Fetch both dates in parallel
    const [r1, r2] = await Promise.all([
      supabase.from('games_schedule').select('*')
        .eq('sport', this.mapSportToDbValue(sport)).eq('game_date', localDateStr)
        .order('game_time', { ascending: true }),
      supabase.from('games_schedule').select('*')
        .eq('sport', this.mapSportToDbValue(sport)).eq('game_date', nextDateStr)
        .order('game_time', { ascending: true })
    ])

    const allRows = [...(r1.data || []), ...(r2.data || [])]
    
    // Define the valid window: local midnight  -2h  to  local midnight +26h
    const localMidnight = new Date(localDate.getFullYear(), localDate.getMonth(), localDate.getDate(), 0, 0, 0)
    const windowStart = localMidnight.getTime() - 2 * 3600 * 1000
    const windowEnd   = localMidnight.getTime() + 26 * 3600 * 1000

    const supabaseGames = allRows
      .map(this.mapDbGameToLiveGame)
      .filter((g, idx, arr) => !g.gameId || arr.findIndex(x => x.gameId === g.gameId) === idx)
      .filter(g => {
        if (!g.gameTime) return true
        const t = new Date(g.gameTime).getTime()
        return t >= windowStart && t <= windowEnd
      })
      .sort((a, b) => {
        if (!a.gameTime) return 1
        if (!b.gameTime) return -1
        return new Date(a.gameTime).getTime() - new Date(b.gameTime).getTime()
      })

    console.log(`[LiveGames] getGamesForLocalDate(${localDateStr}): Supabase found ${allRows.length} raw → ${supabaseGames.length} in window`)

    // ── FALLBACK: If Supabase returned no games, hit ESPN directly ──
    if (supabaseGames.length === 0) {
      console.warn(`[LiveGames] ⚠️ Supabase returned 0 games for ${sport} on ${localDateStr} — falling back to ESPN API`)
      const espnGames = await fetchEspnGames(sport, localDate)
      console.log(`[LiveGames][ESPN Fallback] Got ${espnGames.length} games for ${sport} on ${localDateStr}`)
      return espnGames
    }

    return supabaseGames
  }
  
  /**
   * Get all live games across all sports
   */
  async getAllLiveGames(): Promise<LiveGame[]> {
    const { data, error } = await supabase
      .from('games_schedule')
      .select('*')
      .eq('status', 'live')
      .order('game_time', { ascending: true })
    
    if (error) {
      console.error('Error fetching live games:', error)
      throw error
    }
    
    return (data || []).map(this.mapDbGameToLiveGame)
  }
  
  /**
   * Get summary stats for games
   */
  getGamesSummary(games: LiveGame[]): GamesSummary {
    return {
      total: games.length,
      live: games.filter(g => g.status === 'live').length,
      scheduled: games.filter(g => g.status === 'scheduled').length,
      final: games.filter(g => g.status === 'final').length
    }
  }
  
  /**
   * Check if a player has a game and get game info
   * @param playerTeam - Team abbreviation (e.g., "LAL", "BOS", "TOR")
   * @param games - Array of games to search through
   */
  getPlayerGameInfo(playerTeam: string, games: LiveGame[]): PlayerGameInfo {
    if (!playerTeam) {
      return this.noGameInfo()
    }
    
    // Always compare uppercase - Yahoo returns mixed case like "Wpg", "Tor", "TB"
    const upper = playerTeam.toUpperCase()
    const normalized = this.normalizeTeamAbbr(upper)
    // Also try the reverse mapping (e.g. if Yahoo gives "GS" but ESPN stores "GSW")
    const reversedNorm = this.normalizeTeamAbbr(normalized)
    
    const now = Date.now()
    const FIVE_HOURS = 5 * 60 * 60 * 1000
    const game = games.find(g => {
      const home = (g.homeTeam || '').toUpperCase()
      const away = (g.awayTeam || '').toUpperCase()
      const teamMatches = 
        home === upper || away === upper ||
        home === normalized || away === normalized ||
        home === reversedNorm || away === reversedNorm
      if (!teamMatches) return false
      if (g.status === 'final' && g.gameTime) {
        const gameStart = new Date(g.gameTime).getTime()
        if (now - gameStart > FIVE_HOURS) return false
      }
      return true
    })
    
    if (!game) {
      return this.noGameInfo()
    }
    
    const homeUpper = (game.homeTeam || '').toUpperCase()
    const isHome = homeUpper === upper || homeUpper === normalized || homeUpper === reversedNorm
    const opponent = isHome ? game.awayTeam : game.homeTeam
    const myScore = isHome ? game.homeScore : game.awayScore
    const oppScore = isHome ? game.awayScore : game.homeScore
    
    const opponentStr = `${isHome ? 'vs' : '@'} ${opponent}`
    
    let scoreStr = null
    if (game.status === 'live' || game.status === 'final') {
      scoreStr = `${myScore}-${oppScore}`
    }
    
    return {
      hasGame: true,
      opponent: opponentStr,
      isHome,
      gameTime: game.gameTime,
      status: game.status,
      period: game.period,
      timeRemaining: game.timeRemaining,
      score: scoreStr,
      isLive: game.status === 'live',
      gameId: game.gameId
    }
  }
  
  /**
   * Subscribe to live game updates using Supabase Realtime
   * Returns unsubscribe function
   */
  subscribeToLiveGames(
    sport: Sport, 
    date: Date,
    callback: (games: LiveGame[]) => void
  ): RealtimeChannel {
    const dateStr = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`
    const sportStr = this.mapSportToDbValue(sport)
    
    console.log(`[LiveGames] Subscribing to ${sport} games on ${dateStr}`)
    
    const channel = supabase
      .channel(`live-games-${sport}-${dateStr}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'games_schedule',
          filter: `sport=eq.${sportStr},game_date=eq.${dateStr}`
        },
        async (payload) => {
          console.log(`[LiveGames] Game update received:`, payload)
          const games = await this.getGamesForLocalDate(sport, date)
          callback(games)
        }
      )
      .subscribe((status) => {
        console.log(`[LiveGames] Subscription status:`, status)
      })
    
    return channel
  }
  
  /**
   * Get formatted game time
   */
  formatGameTime(gameTime: string): string {
    const date = new Date(gameTime)
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      timeZoneName: 'short'
    })
  }
  
  /**
   * Get game status display text
   */
  getGameStatusText(game: LiveGame): string {
    if (game.status === 'live') {
      let text = '🔴 LIVE'
      if (game.period) {
        text += ` - ${game.period}`
      }
      if (game.timeRemaining) {
        text += ` ${game.timeRemaining}`
      }
      return text
    }
    
    if (game.status === 'final') {
      return '✅ FINAL'
    }
    
    if (game.status === 'postponed') {
      return '⏸️ PPD'
    }
    
    if (game.status === 'cancelled') {
      return '❌ CANCELLED'
    }
    
    return `⏰ ${this.formatGameTime(game.gameTime)}`
  }
  
  /**
   * Check if scraper is healthy
   */
  async checkScraperHealth(scraperName: string): Promise<{
    isHealthy: boolean
    lastSuccess: string | null
    minutesSinceSuccess: number | null
    status: string | null
    errorMessage: string | null
  }> {
    const { data, error } = await supabase
      .from('scraper_status')
      .select('*')
      .eq('scraper_name', scraperName)
      .single()
    
    if (error || !data) {
      return {
        isHealthy: false,
        lastSuccess: null,
        minutesSinceSuccess: null,
        status: 'unknown',
        errorMessage: error?.message || 'Scraper not found'
      }
    }
    
    const lastSuccess = data.last_success ? new Date(data.last_success) : null
    const now = new Date()
    const minutesSinceSuccess = lastSuccess 
      ? Math.floor((now.getTime() - lastSuccess.getTime()) / 1000 / 60)
      : null
    
    const isHealthy = minutesSinceSuccess !== null && minutesSinceSuccess < 10
    
    return {
      isHealthy,
      lastSuccess: data.last_success,
      minutesSinceSuccess,
      status: data.status,
      errorMessage: data.error_message
    }
  }
  
  /**
   * Get all scraper health statuses
   */
  async getAllScraperHealth(): Promise<Record<string, any>> {
    const scrapers = ['nba_games', 'nhl_games', 'mlb_games']
    const results: Record<string, any> = {}
    
    for (const scraper of scrapers) {
      results[scraper] = await this.checkScraperHealth(scraper)
    }
    
    return results
  }
  
  // ==================== PRIVATE HELPERS ====================
  
  private mapSportToDbValue(sport: Sport): string {
    const mapping: Record<Sport, string> = {
      'basketball': 'basketball',
      'hockey': 'hockey',
      'baseball': 'baseball',
      'football': 'football'
    }
    return mapping[sport] || sport
  }
  
  /**
   * Normalize team abbreviations across platforms.
   * Yahoo, ESPN, Supabase scrapers may use different formats.
   * All inputs should already be uppercase.
   */
  private normalizeTeamAbbr(team: string): string {
    const MAP: Record<string, string> = {
      // NHL alternates (Yahoo uses these)
      'TB': 'TBL', 'NJ': 'NJD', 'LA': 'LAK', 'SJ': 'SJS',
      'VGS': 'VGK', 'PHX': 'ARI', 'ATL': 'WPG',
      // NHL reverse (if DB uses short form)
      'TBL': 'TB', 'NJD': 'NJ', 'LAK': 'LA', 'SJS': 'SJ', 'VGK': 'VGS',
      // NBA alternates (Yahoo vs ESPN vs DB)
      'GS': 'GSW', 'NY': 'NYK', 'NO': 'NOP', 'SA': 'SAS', 'UTAH': 'UTA',
      'GS WARRIORS': 'GSW', 'NETS': 'BKN', 'KNICKS': 'NYK',
      'PHO': 'PHX',   // Phoenix - Yahoo uses PHX, ESPN uses PHO
      'UTA': 'UTAH', // Utah
      'NOP': 'NO',                   // New Orleans
      // NBA reverse
      'GSW': 'GS', 'NYK': 'NY', 'SAS': 'SA',
      // MLB alternates
      'CWS': 'CHW', 'CHW': 'CWS', 'KC': 'KCR', 'KCR': 'KC',
      'TBR': 'TB', 'WSH': 'WAS', 'WAS': 'WSH',
      'SD': 'SDP', 'SDP': 'SD', 'SF': 'SFG', 'SFG': 'SF',
    }
    return MAP[team] || team
  }

  private mapDbGameToLiveGame(dbGame: any): LiveGame {
    return {
      gameId: dbGame.game_id,
      sport: dbGame.sport as Sport,
      homeTeam: dbGame.home_team,
      awayTeam: dbGame.away_team,
      homeScore: dbGame.home_score || 0,
      awayScore: dbGame.away_score || 0,
      status: dbGame.status,
      period: dbGame.period,
      timeRemaining: dbGame.time_remaining,
      gameTime: dbGame.game_time,
      gameDate: dbGame.game_date,
      venue: dbGame.venue
    }
  }
  
  private noGameInfo(): PlayerGameInfo {
    return {
      hasGame: false,
      opponent: null,
      isHome: false,
      gameTime: null,
      status: null,
      period: null,
      timeRemaining: null,
      score: null,
      isLive: false,
      gameId: null
    }
  }
}

// Export singleton instance
export const liveGamesService = new LiveGamesService()

// Export types
export type { LiveGame, PlayerGameInfo, GamesSummary }
