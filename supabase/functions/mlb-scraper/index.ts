// =====================================================
// MLB GAMES SCRAPER - Supabase Edge Function
// =====================================================
// Purpose: Fetch live MLB games from MLB Stats API
// Schedule: Runs every 1 minute via Supabase Cron
// API: https://statsapi.mlb.com/api/v1/schedule
// =====================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// MLB API Types
interface MLBTeam {
  id: number
  name: string
  abbreviation: string
}

interface MLBGame {
  gamePk: number
  gameGuid: string
  gameDate: string // ISO timestamp
  status: {
    abstractGameState: string // "Preview", "Live", "Final"
    codedGameState: string // "P", "I", "F", "S", etc.
    detailedState: string
    statusCode: string
    startTimeTBD: boolean
  }
  teams: {
    away: {
      team: MLBTeam
      score: number
      isWinner: boolean
      leagueRecord: {
        wins: number
        losses: number
        pct: string
      }
    }
    home: {
      team: MLBTeam
      score: number
      isWinner: boolean
      leagueRecord: {
        wins: number
        losses: number
        pct: string
      }
    }
  }
  linescore?: {
    currentInning: number
    currentInningOrdinal: string // "1st", "2nd", "Bottom 9th"
    inningState: string // "Top", "Middle", "Bottom", "End"
    inningHalf: string
    scheduledInnings: number
  }
  venue: {
    id: number
    name: string
  }
  content: {
    link: string
  }
  gameType: string // "R" = Regular, "P" = Playoffs
  season: string
  dayNight: string // "day" or "night"
}

interface MLBSchedule {
  dates: Array<{
    date: string
    totalGames: number
    games: MLBGame[]
  }>
}

serve(async (req) => {
  const startTime = Date.now()
  
  try {
    console.log('⚾ MLB Scraper started')
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase credentials')
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0]
    
    // Fetch today's games from MLB API
    const mlbUrl = `https://statsapi.mlb.com/api/v1/schedule?sportId=1&date=${today}&hydrate=linescore`
    console.log(`Fetching from: ${mlbUrl}`)
    
    const response = await fetch(mlbUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    })
    
    if (!response.ok) {
      throw new Error(`MLB API returned ${response.status}: ${response.statusText}`)
    }
    
    const data: MLBSchedule = await response.json()
    
    if (!data?.dates || data.dates.length === 0) {
      console.log('⚠️ No games scheduled for today')
      return new Response(
        JSON.stringify({ success: true, games: 0, message: 'No games today' }),
        { headers: { "Content-Type": "application/json" } }
      )
    }
    
    // Flatten all games from all dates (usually just one date)
    const allGames = data.dates.flatMap(date => date.games)
    console.log(`📊 Found ${allGames.length} MLB games`)
    
    // Process each game
    const processedGames = allGames.map(game => {
      // Determine status
      let status = 'scheduled'
      const statusCode = game.status.statusCode
      
      if (statusCode === 'S' || statusCode === 'P' || statusCode === 'PW') {
        status = 'scheduled' // Scheduled, Pre-Game, Warmup
      } else if (statusCode === 'I' || statusCode === 'IR' || statusCode === 'MA' || statusCode === 'DR') {
        status = 'live' // In Progress, Instant Replay, Manager Challenge, Delayed
      } else if (statusCode === 'F' || statusCode === 'FT' || statusCode === 'FR' || statusCode === 'O') {
        status = 'final' // Final, Final (Tied), Final (Rain), Game Over
      } else if (statusCode === 'D' || statusCode === 'DI') {
        status = 'postponed' // Postponed, Delayed Start
      }
      
      // Determine period/inning display
      let period = null
      let timeRemaining = null
      
      if (game.linescore && status === 'live') {
        const inning = game.linescore.currentInningOrdinal
        const state = game.linescore.inningState
        period = inning
        timeRemaining = state // "Top", "Middle", "Bottom"
      }
      
      // Parse game time
      const gameTime = new Date(game.gameDate)
      const gameDate = gameTime.toISOString().split('T')[0]
      
      return {
        sport: 'baseball',
        game_id: `mlb_${game.gamePk}`,
        game_date: gameDate,
        game_time: game.gameDate,
        home_team: game.teams.home.team.abbreviation,
        away_team: game.teams.away.team.abbreviation,
        status: status,
        period: period,
        time_remaining: timeRemaining,
        home_score: game.teams.home.score || 0,
        away_score: game.teams.away.score || 0,
        venue: game.venue?.name || null,
        broadcast: null,
        updated_at: new Date().toISOString()
      }
    })
    
    console.log('💾 Upserting games to database...')
    
    // Upsert to database
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
        scraper_name: 'mlb_games',
        last_run: new Date().toISOString(),
        last_success: new Date().toISOString(),
        consecutive_failures: 0,
        status: 'success',
        error_message: null,
        records_updated: processedGames.length,
        records_added: 0,
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
        `${game.period || 'Scheduled'} ${game.time_remaining || ''}`
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
    console.error('❌ MLB Scraper Error:', error)
    
    const executionTime = Date.now() - startTime
    
    // Log error to database
    try {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      )
      
      const { data: currentStatus } = await supabase
        .from('scraper_status')
        .select('consecutive_failures')
        .eq('scraper_name', 'mlb_games')
        .single()
      
      const consecutiveFailures = (currentStatus?.consecutive_failures || 0) + 1
      
      await supabase
        .from('scraper_status')
        .upsert({
          scraper_name: 'mlb_games',
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
