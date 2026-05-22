/**
 * Connected Platforms Store
 * 
 * Manages connections to fantasy platforms (Sleeper, Yahoo, ESPN, Fantrax).
 * Handles OAuth tokens and platform-specific user data.
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from './auth'
import { yahooService } from '@/services/yahoo'
import { espnService } from '@/services/espn'
import type { ConnectedPlatform, Platform, Sport, LeagueInsert } from '@/types/supabase'

export const usePlatformsStore = defineStore('platforms', () => {
  // State
  const connectedPlatforms = ref<ConnectedPlatform[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Computed
  const isSleeperConnected = computed(() => 
    connectedPlatforms.value.some(p => p.platform === 'sleeper')
  )
  
  const isYahooConnected = computed(() => 
    connectedPlatforms.value.some(p => p.platform === 'yahoo')
  )
  
  const isEspnConnected = computed(() => 
    connectedPlatforms.value.some(p => p.platform === 'espn')
  )

  const getConnection = (platform: Platform) => 
    connectedPlatforms.value.find(p => p.platform === platform)

  // Fetch all connected platforms for the current user
  async function fetchConnectedPlatforms() {
    const authStore = useAuthStore()
    if (!supabase || !authStore.user) return

    try {
      loading.value = true
      error.value = null

      const { data, error: fetchError } = await supabase
        .from('connected_platforms')
        .select('*')
        .eq('user_id', authStore.user.id)

      if (fetchError) throw fetchError

      connectedPlatforms.value = data || []
    } catch (err: any) {
      console.error('Error fetching connected platforms:', err)
      error.value = err.message
    } finally {
      loading.value = false
    }
  }

  // Connect Sleeper account (no OAuth needed - just username lookup)
  async function connectSleeper(username: string) {
    const authStore = useAuthStore()
    if (!supabase || !authStore.user) {
      return { success: false, error: 'Not authenticated' }
    }

    try {
      loading.value = true
      error.value = null

      // Fetch Sleeper user ID from their API
      const response = await fetch(`https://api.sleeper.app/v1/user/${username}`)
      if (!response.ok) {
        throw new Error('Sleeper username not found')
      }
      
      const sleeperUser = await response.json()
      if (!sleeperUser?.user_id) {
        throw new Error('Invalid Sleeper user data')
      }

      // Upsert the connection
      const { data, error: upsertError } = await supabase
        .from('connected_platforms')
        .upsert({
          user_id: authStore.user.id,
          platform: 'sleeper' as Platform,
          platform_user_id: sleeperUser.user_id,
          platform_username: sleeperUser.username || username,
          // Sleeper doesn't need OAuth tokens
          access_token: null,
          refresh_token: null,
          token_expires_at: null
        }, {
          onConflict: 'user_id,platform'
        })
        .select()
        .single()

      if (upsertError) throw upsertError

      // Also update the profile's sleeper_user_id for backwards compatibility
      await authStore.updateProfile({ sleeper_user_id: sleeperUser.user_id })

      // Refresh the list
      await fetchConnectedPlatforms()

      return { success: true, data }
    } catch (err: any) {
      console.error('Error connecting Sleeper:', err)
      error.value = err.message
      return { success: false, error: err.message }
    } finally {
      loading.value = false
    }
  }

  // Initiate Yahoo OAuth flow
  function connectYahoo() {
    // Redirect to Yahoo OAuth Edge Function
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
    window.location.href = `${supabaseUrl}/functions/v1/yahoo-auth`
  }

  // Store Yahoo tokens after OAuth callback (called by the callback handler)
  async function storeYahooTokens(tokens: {
    access_token: string
    refresh_token: string
    expires_in: number
    yahoo_user_id?: string
    yahoo_username?: string
  }) {
    const authStore = useAuthStore()
    if (!supabase || !authStore.user) {
      return { success: false, error: 'Not authenticated' }
    }

    try {
      const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

      const { data, error: upsertError } = await supabase
        .from('connected_platforms')
        .upsert({
          user_id: authStore.user.id,
          platform: 'yahoo' as Platform,
          platform_user_id: tokens.yahoo_user_id || null,
          platform_username: tokens.yahoo_username || null,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          token_expires_at: expiresAt,
          scopes: 'fspt-r' // Yahoo Fantasy Sports read scope
        }, {
          onConflict: 'user_id,platform'
        })
        .select()
        .single()

      if (upsertError) throw upsertError

      await fetchConnectedPlatforms()

      return { success: true, data }
    } catch (err: any) {
      console.error('Error storing Yahoo tokens:', err)
      error.value = err.message
      return { success: false, error: err.message }
    }
  }

  // Fetch Yahoo leagues and save to database
  async function syncYahooLeagues(sport: Sport) {
    const authStore = useAuthStore()
    if (!supabase || !authStore.user) {
      return { success: false, error: 'Not authenticated', leagues: [] }
    }

    try {
      loading.value = true
      error.value = null

      // Initialize Yahoo service
      const initialized = await yahooService.initialize(authStore.user.id)
      if (!initialized) {
        throw new Error('Failed to initialize Yahoo connection')
      }

      // Fetch leagues from Yahoo
      const yahooLeagues = await yahooService.getLeagues(sport)
      console.log(`Found ${yahooLeagues.length} Yahoo ${sport} leagues`)

      const savedLeagues: any[] = []

      // Save each league to database
      for (const league of yahooLeagues) {
        // Get user's team in this league
        const myTeam = await yahooService.getMyTeam(league.league_key)

        const leagueData: LeagueInsert = {
          user_id: authStore.user.id,
          platform: 'yahoo',
          sport,
          platform_league_id: league.league_key,
          league_name: league.name,
          season: league.season,
          team_name: myTeam?.name || null,
          team_id: myTeam?.team_key || null,
          scoring_type: league.scoring_type,
          league_size: league.num_teams,
          is_active: !league.is_finished,
          last_synced_at: new Date().toISOString(),
          settings: {
            league_type: league.league_type,
            current_week: league.current_week,
            start_week: league.start_week,
            end_week: league.end_week
          }
        }

        const { data, error: upsertError } = await supabase
          .from('leagues')
          .upsert(leagueData, {
            onConflict: 'user_id,platform,platform_league_id,season'
          })
          .select()
          .single()

        if (upsertError) {
          console.error('Error saving league:', upsertError)
        } else {
          savedLeagues.push(data)
        }
      }

      return { success: true, leagues: savedLeagues }
    } catch (err: any) {
      console.error('Error syncing Yahoo leagues:', err)
      error.value = err.message
      return { success: false, error: err.message, leagues: [] }
    } finally {
      loading.value = false
    }
  }

  // Disconnect a platform
  async function disconnectPlatform(platform: Platform) {
    const authStore = useAuthStore()
    if (!supabase || !authStore.user) {
      return { success: false, error: 'Not authenticated' }
    }

    try {
      loading.value = true
      error.value = null

      const { error: deleteError } = await supabase
        .from('connected_platforms')
        .delete()
        .eq('user_id', authStore.user.id)
        .eq('platform', platform)

      if (deleteError) throw deleteError

      // If disconnecting Sleeper, also clear from profile
      if (platform === 'sleeper') {
        await authStore.updateProfile({ sleeper_user_id: null })
      }

      await fetchConnectedPlatforms()

      return { success: true }
    } catch (err: any) {
      console.error('Error disconnecting platform:', err)
      error.value = err.message
      return { success: false, error: err.message }
    } finally {
      loading.value = false
    }
  }

  // Check if Yahoo token needs refresh
  function isYahooTokenExpired(): boolean {
    const yahooConnection = getConnection('yahoo')
    if (!yahooConnection?.token_expires_at) return true
    
    // Consider expired if less than 5 minutes remaining
    const expiresAt = new Date(yahooConnection.token_expires_at)
    const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000)
    
    return expiresAt < fiveMinutesFromNow
  }

  // Get valid Yahoo access token (refreshing if needed)
  async function getYahooAccessToken(): Promise<string | null> {
    const yahooConnection = getConnection('yahoo')
    if (!yahooConnection) return null

    if (isYahooTokenExpired() && yahooConnection.refresh_token) {
      // Call backend to refresh token
      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
        const response = await fetch(`${supabaseUrl}/functions/v1/yahoo-refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            refresh_token: yahooConnection.refresh_token 
          })
        })

        if (!response.ok) {
          throw new Error('Failed to refresh Yahoo token')
        }

        const tokens = await response.json()
        await storeYahooTokens(tokens)
        
        return tokens.access_token
      } catch (err) {
        console.error('Error refreshing Yahoo token:', err)
        return null
      }
    }

    return yahooConnection.access_token
  }

  // Clear all state (on logout)
  function clearState() {
    connectedPlatforms.value = []
    error.value = null
  }

  // ============================================
  // ESPN Methods
  // ============================================

  /**
   * Store ESPN credentials (cookies) for private leagues
   * These are stored in localStorage since they're user-specific cookies
   */
  async function storeEspnCredentials(data: {
    espn_s2: string
    swid: string
    leagueId: string
    sport: Sport
    season: number
  }): Promise<{ success: boolean; error?: string }> {
    try {
      const { espn_s2, swid, leagueId, sport, season } = data
      
      // Store credentials in localStorage (for this device)
      const credentials = { espn_s2, swid, stored_at: Date.now() }
      localStorage.setItem('espn_credentials', JSON.stringify(credentials))
      console.log('[ESPN] Credentials stored in localStorage')

      // Apply credentials to service
      espnService.setCredentials(espn_s2, swid)

      // Validate the league is accessible with these credentials
      const validation = await espnService.validateLeague(sport, leagueId, season)
      if (!validation.valid) {
        return { success: false, error: validation.error || 'Invalid credentials' }
      }

      // Sync credentials to Supabase so other devices (e.g. mobile) can use them
      const authStore = useAuthStore()
      if (supabase && authStore.user) {
        try {
          await supabase
            .from('connected_platforms')
            .upsert({
              user_id: authStore.user.id,
              platform: 'espn' as Platform,
              platform_user_id: null,
              platform_username: null,
              access_token: espn_s2,   // espn_s2 stored as access_token
              refresh_token: swid,      // swid stored as refresh_token
              token_expires_at: null,
            }, { onConflict: 'user_id,platform' })
            .select()
          console.log('[ESPN] Credentials synced to Supabase for cross-device access')
        } catch (syncErr) {
          // Non-fatal — credentials still work on this device via localStorage
          console.warn('[ESPN] Could not sync credentials to Supabase:', syncErr)
        }
      }

      return { success: true }
    } catch (err: any) {
      console.error('Failed to store ESPN credentials:', err)
      return { success: false, error: err.message || 'Failed to store credentials' }
    }
  }

  /**
   * Get stored ESPN credentials
   */
  function getEspnCredentials(): { espn_s2: string; swid: string } | null {
    try {
      // Check localStorage first (fastest, works offline)
      const stored = localStorage.getItem('espn_credentials')
      if (stored) {
        const credentials = JSON.parse(stored)
        const age = Date.now() - (credentials.stored_at || 0)
        const oneMonth = 30 * 24 * 60 * 60 * 1000
        if (age > oneMonth) {
          console.warn('[ESPN] Stored credentials are over a month old, may need refresh')
        }
        return { espn_s2: credentials.espn_s2, swid: credentials.swid }
      }

      // Fall back to connectedPlatforms (loaded from Supabase on app init)
      // This is how mobile devices get credentials set up on desktop
      const espnPlatform = connectedPlatforms.value.find(p => p.platform === 'espn')
      if (espnPlatform?.access_token && espnPlatform?.refresh_token) {
        console.log('[ESPN] Credentials loaded from Supabase (cross-device)')
        // Cache in localStorage for future use
        const credentials = {
          espn_s2: espnPlatform.access_token,
          swid: espnPlatform.refresh_token,
          stored_at: Date.now()
        }
        localStorage.setItem('espn_credentials', JSON.stringify(credentials))
        return { espn_s2: espnPlatform.access_token, swid: espnPlatform.refresh_token }
      }

      return null
    } catch (err) {
      console.error('Failed to get ESPN credentials:', err)
      return null
    }
  }

  /**
   * Clear ESPN credentials
   */
  function clearEspnCredentials() {
    localStorage.removeItem('espn_credentials')
    console.log('[ESPN] Credentials cleared')
  }

  /**
   * Check if ESPN credentials are stored
   */
  const hasEspnCredentials = computed(() => {
    return !!getEspnCredentials()
  })

  /**
   * Sync an ESPN league to the database. Mirrors syncYahooLeagues' upsert
   * pattern. team_name/team_id are left null — populated separately if/when
   * an espnService.getMyTeam() equivalent exists.
   */
  async function syncEspnLeague(
    leagueId: string,
    sport: Sport,
    season: number,
    leagueInfo?: { name: string; size: number; scoringType?: string }
  ): Promise<{ success: boolean; leagueRowId?: string; error?: string }> {
    const authStore = useAuthStore()
    if (!supabase || !authStore.user) {
      return { success: false, error: 'Not authenticated' }
    }

    const leagueData: LeagueInsert = {
      user_id: authStore.user.id,
      platform: 'espn',
      sport,
      platform_league_id: leagueId,
      league_name: leagueInfo?.name ?? `ESPN ${sport} League ${leagueId}`,
      season,
      team_name: null,
      team_id: null,
      scoring_type: leagueInfo?.scoringType ?? null,
      league_size: leagueInfo?.size ?? null,
      is_active: true,
      last_synced_at: new Date().toISOString(),
    }

    // `.select().single()` so we get the row back — callers need the
    // Supabase UUID to navigate to /leagues/:leagueId/...
    const { data, error: upsertError } = await supabase
      .from('leagues')
      .upsert(leagueData, {
        onConflict: 'user_id,platform,platform_league_id,season',
      })
      .select()
      .single()

    if (upsertError) {
      console.error('[ESPN] Error saving league:', upsertError)
      return { success: false, error: upsertError.message }
    }

    return { success: true, leagueRowId: data?.id }
  }

  /**
   * Sync a Sleeper league to the database. Mirrors the Yahoo/ESPN pattern.
   * team_name/team_id/scoring_type left null — would need a Sleeper API call
   * to populate (the user's roster within the league).
   */
  async function syncSleeperLeague(
    league: { league_id: string; name: string; season: string; total_rosters?: number },
    sport: Sport
  ): Promise<{ success: boolean; leagueRowId?: string; error?: string }> {
    const authStore = useAuthStore()
    if (!supabase || !authStore.user) {
      return { success: false, error: 'Not authenticated' }
    }

    const seasonNum = parseInt(league.season, 10) || new Date().getFullYear()

    const leagueData: LeagueInsert = {
      user_id: authStore.user.id,
      platform: 'sleeper',
      sport,
      platform_league_id: league.league_id,
      league_name: league.name,
      season: seasonNum,
      team_name: null,
      team_id: null,
      scoring_type: null,
      league_size: league.total_rosters ?? null,
      is_active: true,
      last_synced_at: new Date().toISOString(),
    }

    const { data, error: upsertError } = await supabase
      .from('leagues')
      .upsert(leagueData, {
        onConflict: 'user_id,platform,platform_league_id,season',
      })
      .select()
      .single()

    if (upsertError) {
      console.error('[Sleeper] Error saving league:', upsertError)
      return { success: false, error: upsertError.message }
    }

    return { success: true, leagueRowId: data?.id }
  }

  return {
    // State
    connectedPlatforms,
    loading,
    error,

    // Computed
    isSleeperConnected,
    isYahooConnected,
    isEspnConnected,
    getConnection,

    // Actions
    fetchConnectedPlatforms,
    connectSleeper,
    connectYahoo,
    storeYahooTokens,
    syncYahooLeagues,
    disconnectPlatform,
    isYahooTokenExpired,
    getYahooAccessToken,
    clearState,

    // Sleeper
    syncSleeperLeague,

    // ESPN
    storeEspnCredentials,
    getEspnCredentials,
    clearEspnCredentials,
    hasEspnCredentials,
    syncEspnLeague
  }
})
