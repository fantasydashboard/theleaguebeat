/**
 * Leagues Store
 * 
 * Manages fantasy leagues across all platforms and sports.
 * Handles league syncing, selection, and persistence.
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from './auth'
import { usePlatformsStore } from './platforms'
import type { League, LeagueInsert, Sport, Platform } from '@/types/supabase'

export const useLeaguesStore = defineStore('leagues', () => {
  // State
  const leagues = ref<League[]>([])
  const activeLeagueId = ref<string | null>(null)
  const activeSport = ref<Sport>('football')
  const loading = ref(false)
  const syncing = ref(false)
  const error = ref<string | null>(null)

  // Computed
  const activeLeague = computed(() => 
    leagues.value.find(l => l.id === activeLeagueId.value)
  )

  const leaguesBySport = computed(() => {
    const grouped: Record<Sport, League[]> = {
      football: [],
      baseball: [],
      basketball: [],
      hockey: []
    }
    
    leagues.value.forEach(league => {
      if (league.is_active) {
        grouped[league.sport].push(league)
      }
    })
    
    return grouped
  })

  const activeLeagues = computed(() => 
    leagues.value.filter(l => l.is_active && l.sport === activeSport.value)
  )

  const hasSportLeagues = (sport: Sport) => 
    leagues.value.some(l => l.sport === sport && l.is_active)

  // Fetch all leagues for the current user
  async function fetchLeagues() {
    const authStore = useAuthStore()
    if (!supabase || !authStore.user) return

    try {
      loading.value = true
      error.value = null

      const { data, error: fetchError } = await supabase
        .from('leagues')
        .select('*')
        .eq('user_id', authStore.user.id)
        .order('is_primary', { ascending: false })
        .order('league_name', { ascending: true })

      if (fetchError) throw fetchError

      leagues.value = data || []

      // Set active league if not set
      if (!activeLeagueId.value && leagues.value.length > 0) {
        const primaryLeague = leagues.value.find(l => l.is_primary && l.sport === activeSport.value)
        const firstLeague = leagues.value.find(l => l.sport === activeSport.value)
        activeLeagueId.value = primaryLeague?.id || firstLeague?.id || null
      }
    } catch (err: any) {
      console.error('Error fetching leagues:', err)
      error.value = err.message
    } finally {
      loading.value = false
    }
  }

  // Add a new league
  async function addLeague(league: Omit<LeagueInsert, 'user_id'>) {
    const authStore = useAuthStore()
    if (!supabase || !authStore.user) {
      return { success: false, error: 'Not authenticated' }
    }

    try {
      loading.value = true
      error.value = null

      const { data, error: insertError } = await supabase
        .from('leagues')
        .insert({
          ...league,
          user_id: authStore.user.id
        })
        .select()
        .single()

      if (insertError) throw insertError

      leagues.value.push(data)

      // If this is the first league for this sport, make it primary
      const sportLeagues = leagues.value.filter(l => l.sport === league.sport)
      if (sportLeagues.length === 1) {
        await setPrimaryLeague(data.id)
      }

      return { success: true, data }
    } catch (err: any) {
      console.error('Error adding league:', err)
      error.value = err.message
      return { success: false, error: err.message }
    } finally {
      loading.value = false
    }
  }

  // Remove a league
  async function removeLeague(leagueId: string) {
    const authStore = useAuthStore()
    if (!supabase || !authStore.user) {
      return { success: false, error: 'Not authenticated' }
    }

    try {
      loading.value = true
      error.value = null

      const { error: deleteError } = await supabase
        .from('leagues')
        .delete()
        .eq('id', leagueId)
        .eq('user_id', authStore.user.id)

      if (deleteError) throw deleteError

      leagues.value = leagues.value.filter(l => l.id !== leagueId)

      // If we deleted the active league, select another
      if (activeLeagueId.value === leagueId) {
        const nextLeague = leagues.value.find(l => l.sport === activeSport.value)
        activeLeagueId.value = nextLeague?.id || null
      }

      return { success: true }
    } catch (err: any) {
      console.error('Error removing league:', err)
      error.value = err.message
      return { success: false, error: err.message }
    } finally {
      loading.value = false
    }
  }

  // Set a league as primary for its sport
  async function setPrimaryLeague(leagueId: string) {
    const authStore = useAuthStore()
    if (!supabase || !authStore.user) {
      return { success: false, error: 'Not authenticated' }
    }

    const league = leagues.value.find(l => l.id === leagueId)
    if (!league) {
      return { success: false, error: 'League not found' }
    }

    try {
      // First, unset primary for all leagues of this sport
      await supabase
        .from('leagues')
        .update({ is_primary: false })
        .eq('user_id', authStore.user.id)
        .eq('sport', league.sport)

      // Then set this league as primary
      const { error: updateError } = await supabase
        .from('leagues')
        .update({ is_primary: true })
        .eq('id', leagueId)

      if (updateError) throw updateError

      // Update local state
      leagues.value.forEach(l => {
        if (l.sport === league.sport) {
          l.is_primary = l.id === leagueId
        }
      })

      return { success: true }
    } catch (err: any) {
      console.error('Error setting primary league:', err)
      error.value = err.message
      return { success: false, error: err.message }
    }
  }

  // Sync leagues from a platform
  async function syncLeaguesFromPlatform(platform: Platform, sport: Sport) {
    const authStore = useAuthStore()
    const platformsStore = usePlatformsStore()
    
    if (!authStore.user) {
      return { success: false, error: 'Not authenticated' }
    }

    try {
      syncing.value = true
      error.value = null

      let fetchedLeagues: any[] = []

      if (platform === 'sleeper') {
        const connection = platformsStore.getConnection('sleeper')
        if (!connection?.platform_user_id) {
          throw new Error('Sleeper account not connected')
        }

        // Fetch leagues from Sleeper API
        const response = await fetch(
          `https://api.sleeper.app/v1/user/${connection.platform_user_id}/leagues/${sport}/2024`
        )
        
        if (!response.ok) {
          throw new Error('Failed to fetch Sleeper leagues')
        }

        fetchedLeagues = await response.json()
      } else if (platform === 'yahoo') {
        const accessToken = await platformsStore.getYahooAccessToken()
        if (!accessToken) {
          throw new Error('Yahoo account not connected or token expired')
        }

        // Yahoo API call would go through our backend proxy
        const response = await fetch(`/api/yahoo/leagues?sport=${sport}`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        })

        if (!response.ok) {
          throw new Error('Failed to fetch Yahoo leagues')
        }

        fetchedLeagues = await response.json()
      }

      // Upsert leagues to database
      for (const fetchedLeague of fetchedLeagues) {
        const leagueData: Omit<LeagueInsert, 'user_id'> = {
          platform,
          sport,
          platform_league_id: fetchedLeague.league_id || fetchedLeague.league_key,
          league_name: fetchedLeague.name,
          season: fetchedLeague.season || '2024',
          team_name: fetchedLeague.team_name || null,
          team_id: fetchedLeague.roster_id?.toString() || fetchedLeague.team_key || null,
          scoring_type: fetchedLeague.scoring_settings?.rec >= 1 ? 'ppr' : 
                        fetchedLeague.scoring_settings?.rec >= 0.5 ? 'half_ppr' : 'std',
          league_size: fetchedLeague.total_rosters || fetchedLeague.num_teams || null,
          is_active: true,
          last_synced_at: new Date().toISOString(),
          settings: fetchedLeague.settings || {}
        }

        await addLeague(leagueData)
      }

      // Refresh leagues
      await fetchLeagues()

      return { success: true, count: fetchedLeagues.length }
    } catch (err: any) {
      console.error('Error syncing leagues:', err)
      error.value = err.message
      return { success: false, error: err.message }
    } finally {
      syncing.value = false
    }
  }

  // Set active sport
  function setActiveSport(sport: Sport) {
    activeSport.value = sport
    
    // Update active league to one from this sport
    const sportLeagues = leagues.value.filter(l => l.sport === sport && l.is_active)
    const primaryLeague = sportLeagues.find(l => l.is_primary)
    activeLeagueId.value = primaryLeague?.id || sportLeagues[0]?.id || null
  }

  // Set active league
  function setActiveLeague(leagueId: string) {
    const league = leagues.value.find(l => l.id === leagueId)
    if (league) {
      activeLeagueId.value = leagueId
      activeSport.value = league.sport
    }
  }

  // Clear state (on logout)
  function clearState() {
    leagues.value = []
    activeLeagueId.value = null
    activeSport.value = 'football'
    error.value = null
  }

  return {
    // State
    leagues,
    activeLeagueId,
    activeSport,
    loading,
    syncing,
    error,

    // Computed
    activeLeague,
    leaguesBySport,
    activeLeagues,
    hasSportLeagues,

    // Actions
    fetchLeagues,
    addLeague,
    removeLeague,
    setPrimaryLeague,
    syncLeaguesFromPlatform,
    setActiveSport,
    setActiveLeague,
    clearState
  }
})
