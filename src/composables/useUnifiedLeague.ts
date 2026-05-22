/**
 * useUnifiedLeague Composable
 * 
 * A unified composable for loading and managing league data
 * across all platforms (Sleeper, Yahoo, ESPN) and sports.
 * 
 * This abstracts away platform-specific logic and provides
 * a consistent interface for components.
 */

import { ref, computed, watch } from 'vue'
import { useLeagueStore } from '@/stores/league'
import type { 
  UnifiedMatchup, 
  UnifiedStandingsEntry, 
  UnifiedTeam,
  SportType, 
  LeagueType 
} from '@/config/sports'
import { getLeagueType, getSportConfig } from '@/config/sports'
import {
  normalizeMatchups,
  normalizeStandings,
  type AdapterOptions
} from '@/services/adapters'

export interface UseUnifiedLeagueOptions {
  autoLoad?: boolean
}

export function useUnifiedLeague(options: UseUnifiedLeagueOptions = {}) {
  const leagueStore = useLeagueStore()
  
  // State
  const loading = ref(false)
  const error = ref<string | null>(null)
  const matchups = ref<UnifiedMatchup[]>([])
  const standings = ref<UnifiedStandingsEntry[]>([])
  const currentWeek = ref(1)
  
  // Computed - League Info
  const currentLeague = computed(() => leagueStore.currentLeague)
  const leagueId = computed(() => leagueStore.activeLeagueId)
  
  const platform = computed((): 'sleeper' | 'yahoo' | 'espn' => {
    const id = leagueId.value || ''
    if (id.startsWith('espn_')) return 'espn'
    if (id.includes('.l.')) return 'yahoo'
    return 'sleeper'
  })
  
  const sport = computed((): SportType => {
    const league = leagueStore.savedLeagues.find(l => l.league_id === leagueId.value)
    return (league?.sport as SportType) || 'football'
  })
  
  const leagueType = computed((): LeagueType => {
    const league = leagueStore.savedLeagues.find(l => l.league_id === leagueId.value)
    return getLeagueType(league?.scoring_type)
  })
  
  const sportConfig = computed(() => getSportConfig(sport.value))
  
  const isPointsLeague = computed(() => leagueType.value === 'points')
  const isCategoryLeague = computed(() => leagueType.value === 'categories' || leagueType.value === 'roto')
  const isRotoLeague = computed(() => leagueType.value === 'roto')
  
  const adapterOptions = computed((): AdapterOptions => ({
    sport: sport.value,
    platform: platform.value,
    leagueType: leagueType.value
  }))
  
  // My team detection
  const myTeamId = computed((): string | undefined => {
    // This would need to be determined based on the platform
    // For now, return the first roster ID as a placeholder
    if (standings.value.length > 0) {
      // Try to find a team marked as "mine" or use roster 1
      return standings.value[0]?.team.teamId
    }
    return undefined
  })
  
  // Season info
  const season = computed(() => {
    const league = leagueStore.savedLeagues.find(l => l.league_id === leagueId.value)
    return league?.season || new Date().getFullYear().toString()
  })
  
  const leagueName = computed(() => {
    const league = leagueStore.savedLeagues.find(l => l.league_id === leagueId.value)
    return league?.league_name || currentLeague.value?.name || 'League'
  })
  
  // Methods
  async function loadMatchups(week?: number): Promise<void> {
    if (!leagueId.value) {
      error.value = 'No league selected'
      return
    }
    
    loading.value = true
    error.value = null
    
    try {
      const targetWeek = week || currentWeek.value
      
      // Get raw data from the appropriate platform
      const rawData = await fetchRawMatchupData(targetWeek)
      
      if (rawData) {
        matchups.value = normalizeMatchups(rawData, adapterOptions.value, targetWeek)
      }
    } catch (e) {
      console.error('[useUnifiedLeague] Error loading matchups:', e)
      error.value = e instanceof Error ? e.message : 'Failed to load matchups'
    } finally {
      loading.value = false
    }
  }
  
  async function loadStandings(): Promise<void> {
    if (!leagueId.value) {
      error.value = 'No league selected'
      return
    }
    
    loading.value = true
    error.value = null
    
    try {
      const rawData = await fetchRawStandingsData()
      
      if (rawData) {
        standings.value = normalizeStandings(rawData, adapterOptions.value)
      }
    } catch (e) {
      console.error('[useUnifiedLeague] Error loading standings:', e)
      error.value = e instanceof Error ? e.message : 'Failed to load standings'
    } finally {
      loading.value = false
    }
  }
  
  async function loadAll(week?: number): Promise<void> {
    await Promise.all([
      loadMatchups(week),
      loadStandings()
    ])
  }
  
  function setWeek(week: number): void {
    currentWeek.value = week
  }
  
  // Platform-specific data fetching (internal)
  async function fetchRawMatchupData(week: number): Promise<any> {
    // This would call the appropriate platform service
    // For now, return data from the league store
    
    switch (platform.value) {
      case 'sleeper':
        return {
          matchups: leagueStore.leagueMatchups || [],
          rosters: leagueStore.leagueRosters || [],
          users: leagueStore.leagueUsers || {},
          leagueUsers: leagueStore.leagueUsersArray || []
        }
      
      case 'yahoo':
        return {
          matchups: leagueStore.yahooMatchups || [],
          teams: leagueStore.yahooStandings || []
        }
      
      case 'espn':
        return {
          schedule: leagueStore.espnSchedule || [],
          teams: leagueStore.espnTeams || [],
          members: leagueStore.espnMembers || []
        }
      
      default:
        return null
    }
  }
  
  async function fetchRawStandingsData(): Promise<any> {
    switch (platform.value) {
      case 'sleeper':
        return {
          rosters: leagueStore.leagueRosters || [],
          users: leagueStore.leagueUsers || {},
          leagueUsers: leagueStore.leagueUsersArray || []
        }
      
      case 'yahoo':
        return {
          teams: leagueStore.yahooStandings || []
        }
      
      case 'espn':
        return {
          teams: leagueStore.espnTeams || [],
          members: leagueStore.espnMembers || []
        }
      
      default:
        return null
    }
  }
  
  // Auto-load on league change
  if (options.autoLoad) {
    watch(leagueId, (newId) => {
      if (newId) {
        loadAll()
      }
    }, { immediate: true })
  }
  
  return {
    // State
    loading,
    error,
    matchups,
    standings,
    currentWeek,
    
    // League info
    leagueId,
    leagueName,
    platform,
    sport,
    leagueType,
    season,
    sportConfig,
    myTeamId,
    
    // Booleans
    isPointsLeague,
    isCategoryLeague,
    isRotoLeague,
    
    // Methods
    loadMatchups,
    loadStandings,
    loadAll,
    setWeek,
  }
}

export default useUnifiedLeague
