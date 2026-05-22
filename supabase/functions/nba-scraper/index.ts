// =====================================================
// NBA GAMES SCRAPER - Supabase Edge Function
// =====================================================
// Purpose: Fetch live NBA games from NBA.com API
// Schedule: Runs every 1 minute via Supabase Cron
// API: https://cdn.nba.com/static/json/liveData/scoreboard/todaysScoreboard_00.json
// =====================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// NBA API Types
interface NBATeam {
  teamId: number
  teamName: string
  teamCity: string
  teamTricode: string // e.g., "LAL", "BOS"
  score: number
  wins: number
  losses: number
}

interface NBAGame {
  gameId: string
  gameCode: string
  gameStatus: number // 1=scheduled, 2=live, 3=final
  gameStatusText: string
  period: number // 0=pregame, 1-4=quarters, 5+=OT
  gameClock: string // "12:00" or "PT" or ""
  gameTimeUTC: string // ISO timestamp
  gameEt: string // ET time
  regulationPeriods: number
  ifNecessary: boolean
  seriesGameNumber: string
  seriesText: string
  homeTeam: NBATeam
  awayTeam: NBATeam
  gameLeaders: any
  pbOdds: any
}

interface NBAScoreboard {
  scoreboard: {
    gameDate: string
    leagueId: string
    leagueName: string
    games: NBAGame[]
  }
}

serve(async (req) => {
  const startTime = Date.now()
  
  try {
    console.log('🏀 NBA Scraper started')
    
    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase credentials')
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    // Fetch today's games from NBA.com
    const nbaUrl = 'https://cdn.nba.com/static/json/liveData/scoreboard/todaysScoreboard_00.json'
    console.log(`Fetching from: ${nbaUrl}`)
    
    const response = await fetch(nbaUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    })
    
    if (!response.ok) {
      throw new Error(`NBA API returned ${response.status}: ${response.statusText}`)
    }
    
    const data: NBAScoreboard = await response.json()
    
    if (!data?.scoreboard?.games) {
      console.log('⚠️ No games data in response')
      return new Response(
        JSON.stringify({ success: true, games: 0, message: 'No games today' }),
        { headers: { "Content-Type": "application/json" } }
      )
    }
    
    const games = data.scoreboard.games
    console.log(`📊 Found ${games.length} NBA games`)
    
    // Process each game
    const processedGames = games.map(game => {
      // Determine status
      let status = 'scheduled'
      if (game.gameStatus === 2) {
        status = 'live'
      } else if (game.gameStatus === 3) {
        status = 'final'
      }
      
      // Determine period display
      let period = null
      if (game.period > 0) {
        if (game.period <= 4) {
          period = `Q${game.period}`
        } else {
          period = `OT${game.period - 4}` // OT1, OT2, etc.
        }
      }
      
      // Parse game time
      const gameTime = new Date(game.gameTimeUTC)
      const gameDate = gameTime.toISOString().split('T')[0]
      
      return {
        sport: 'basketball',
        game_id: `nba_${game.gameId}`,
        game_date: gameDate,
        game_time: game.gameTimeUTC,
        home_team: game.homeTeam.teamTricode,
        away_team: game.awayTeam.teamTricode,
        status: status,
        period: period,
        time_remaining: game.gameClock || null,
        home_score: game.homeTeam.score || 0,
        away_score: game.awayTeam.score || 0,
        venue: null, // Can add venue data if needed from different endpoint
        broadcast: null,
        updated_at: new Date().toISOString()
      }
    })
    
    console.log('💾 Upserting games to database...')
    
    // Upsert to database (insert or update if exists)
    const { data: upserted, error: upsertError } = await supabase
      .from('games_schedule')
      .upsert(processedGames, { 
        onConflict: 'game_id',
        ignoreDuplicates: false 
      })
      .select()
    
    if (upsertError) {
      console.error('❌ Database upsert error:', upsertError)
      throw upsertError
    }
    
    console.log(`✅ Upserted ${processedGames.length} games`)
    
    // Calculate execution time
    const executionTime = Date.now() - startTime
    
    // Update scraper status
    const { error: statusError } = await supabase
      .from('scraper_status')
      .upsert({
        scraper_name: 'nba_games',
        last_run: new Date().toISOString(),
        last_success: new Date().toISOString(),
        consecutive_failures: 0,
        status: 'success',
        error_message: null,
        records_updated: processedGames.length,
        records_added: 0, // Could track this separately if needed
        execution_time_ms: executionTime,
        updated_at: new Date().toISOString()
      }, { onConflict: 'scraper_name' })
    
    if (statusError) {
      console.error('⚠️ Failed to update scraper status:', statusError)
    }
    
    // Log game summaries
    processedGames.forEach(game => {
      const liveIndicator = game.status === 'live' ? '🔴 LIVE' : game.status === 'final' ? '✅' : '⏰'
      console.log(
        `${liveIndicator} ${game.away_team} @ ${game.home_team} | ` +
        `${game.away_score}-${game.home_score} | ` +
        `${game.period || 'Pregame'} ${game.time_remaining || ''}`
      )
    })
    
    return new Response(
      JSON.stringify({
        success: true,
        games: processedGames.length,
        execution_time_ms: executionTime,
        data: processedGames.map(g => ({
          game_id: g.game_id,
          matchup: `${g.away_team} @ ${g.home_team}`,
          score: `${g.away_score}-${g.home_score}`,
          status: g.status,
          period: g.period
        }))
      }),
      { 
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        } 
      }
    )
    
  } catch (error) {
    console.error('❌ NBA Scraper Error:', error)
    
    const executionTime = Date.now() - startTime
    
    // Log error to database
    try {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      )
      
      // Get current consecutive failures
      const { data: currentStatus } = await supabase
        .from('scraper_status')
        .select('consecutive_failures')
        .eq('scraper_name', 'nba_games')
        .single()
      
      const consecutiveFailures = (currentStatus?.consecutive_failures || 0) + 1
      
      await supabase
        .from('scraper_status')
        .upsert({
          scraper_name: 'nba_games',
          last_run: new Date().toISOString(),
          consecutive_failures: consecutiveFailures,
          status: 'error',
          error_message: error.message,
          execution_time_ms: executionTime,
          updated_at: new Date().toISOString()
        }, { onConflict: 'scraper_name' })
    } catch (dbError) {
      console.error('Failed to log error to database:', dbError)
    }
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        execution_time_ms: executionTime
      }),
      { 
        status: 500,
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        } 
      }
    )
  }
})
