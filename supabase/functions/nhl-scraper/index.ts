// =====================================================
// NHL GAMES SCRAPER - Supabase Edge Function
// =====================================================
// Purpose: Fetch live NHL games from NHL.com API
// Schedule: Runs every 1 minute via Supabase Cron
// API: https://api-web.nhle.com/v1/score/now
// =====================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// NHL API Types
interface NHLTeam {
  id: number
  abbrev: string // "TOR", "BOS", "MTL"
  logo: string
  darkLogo: string
  score: number
  sog: number // Shots on goal
}

interface NHLGame {
  id: number
  season: number
  gameType: number
  gameDate: string // "2025-01-24"
  venue: {
    default: string
  }
  neutralSite: boolean
  startTimeUTC: string
  easternUTCOffset: string
  venueUTCOffset: string
  tvBroadcasts: any[]
  gameState: string // "FUT", "LIVE", "OFF", "FINAL", "CRIT"
  gameScheduleState: string
  period: number
  periodDescriptor: {
    number: number
    periodType: string // "REG", "OT", "SO"
  }
  awayTeam: NHLTeam
  homeTeam: NHLTeam
  clock: {
    timeRemaining: string // "05:23"
    secondsRemaining: number
    running: boolean
    inIntermission: boolean
  }
  goals: any[]
}

interface NHLScoreboard {
  games: NHLGame[]
}

serve(async (req) => {
  const startTime = Date.now()
  
  try {
    console.log('🏒 NHL Scraper started')
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase credentials')
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    // Fetch today's games from NHL API
    const nhlUrl = 'https://api-web.nhle.com/v1/score/now'
    console.log(`Fetching from: ${nhlUrl}`)
    
    const response = await fetch(nhlUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    })
    
    if (!response.ok) {
      throw new Error(`NHL API returned ${response.status}: ${response.statusText}`)
    }
    
    const data: NHLScoreboard = await response.json()
    
    if (!data?.games || data.games.length === 0) {
      console.log('⚠️ No games data in response')
      return new Response(
        JSON.stringify({ success: true, games: 0, message: 'No games today' }),
        { headers: { "Content-Type": "application/json" } }
      )
    }
    
    const games = data.games
    console.log(`📊 Found ${games.length} NHL games`)
    
    // Process each game
    const processedGames = games.map(game => {
      // Determine status
      let status = 'scheduled'
      if (game.gameState === 'FUT') {
        status = 'scheduled'
      } else if (game.gameState === 'LIVE' || game.gameState === 'CRIT' || game.gameState === 'OFF') {
        status = 'live'
      } else if (game.gameState === 'FINAL') {
        status = 'final'
      }
      
      // Determine period display
      let period = null
      if (game.period > 0) {
        if (game.periodDescriptor.periodType === 'REG') {
          period = `P${game.period}` // P1, P2, P3
        } else if (game.periodDescriptor.periodType === 'OT') {
          period = 'OT'
        } else if (game.periodDescriptor.periodType === 'SO') {
          period = 'SO' // Shootout
        }
      }
      
      // Parse game time
      const gameTime = new Date(game.startTimeUTC)
      const gameDate = game.gameDate
      
      return {
        sport: 'hockey',
        game_id: `nhl_${game.id}`,
        game_date: gameDate,
        game_time: game.startTimeUTC,
        home_team: game.homeTeam.abbrev,
        away_team: game.awayTeam.abbrev,
        status: status,
        period: period,
        time_remaining: game.clock?.timeRemaining || null,
        home_score: game.homeTeam.score || 0,
        away_score: game.awayTeam.score || 0,
        venue: game.venue?.default || null,
        broadcast: null, // Can add TV info if needed
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
        scraper_name: 'nhl_games',
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
    console.error('❌ NHL Scraper Error:', error)
    
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
        .eq('scraper_name', 'nhl_games')
        .single()
      
      const consecutiveFailures = (currentStatus?.consecutive_failures || 0) + 1
      
      await supabase
        .from('scraper_status')
        .upsert({
          scraper_name: 'nhl_games',
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
