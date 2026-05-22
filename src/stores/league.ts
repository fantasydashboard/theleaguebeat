import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { sleeperService } from '@/services/sleeper'
import { supabase } from '@/lib/supabase'
import type {
  SleeperLeague,
  SleeperRoster,
  SleeperUser,
  SleeperMatchup,
  SleeperPlayer
} from '@/types/sleeper'

// Saved league interface - supports both Sleeper and Yahoo
interface SavedLeague {
  id?: string
  user_id?: string
  league_id: string
  league_name: string
  platform: 'sleeper' | 'yahoo' | 'espn'
  sport: 'football' | 'baseball' | 'basketball' | 'hockey'
  season: string
  sleeper_username?: string
  yahoo_league_key?: string
  yahoo_historical_seasons?: Array<{ league_key: string; season: string }>
  is_primary: boolean
  league_type?: number // 0 = redraft, 1 = keeper, 2 = dynasty
  num_teams?: number
  scoring_type?: string
}

// Cache interface for storing league data
interface LeagueCache {
  league: SleeperLeague
  rosters: SleeperRoster[]
  users: SleeperUser[]
  historicalSeasons: SleeperLeague[]
  historicalRosters: Map<string, SleeperRoster[]>
  historicalUsers: Map<string, SleeperUser[]>
  historicalMatchups: Map<string, Map<number, SleeperMatchup[]>>
  historicalDrafts: Map<string, any>
  historicalBrackets: Map<string, any[]>
  loadedAt: number
}

// LocalStorage keys
const STORAGE_KEYS = {
  SAVED_LEAGUES: 'fd_saved_leagues',
  LEAGUE_CACHE: 'fd_league_cache',
  CURRENT_USERNAME: 'fd_current_username',
  ACTIVE_LEAGUE: 'fd_active_league',
  ACTIVE_PLATFORM: 'fd_active_platform',
  ACTIVE_SPORT: 'fd_active_sport'
}

export const useLeagueStore = defineStore('league', () => {
  // State
  const activeLeagueId = ref<string | null>(null)
  const activePlatform = ref<'sleeper' | 'yahoo' | 'espn'>('sleeper')
  const leagues = ref<SleeperLeague[]>([])
  const savedLeagues = ref<SavedLeague[]>([])
  const currentLeague = ref<SleeperLeague | null>(null)
  const rosters = ref<SleeperRoster[]>([])
  const users = ref<SleeperUser[]>([])
  const players = ref<Record<string, SleeperPlayer>>({})
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const isDemoMode = ref(false)
  
  // Yahoo-specific state
  const yahooLeague = ref<any>(null)
  const yahooTeams = ref<any[]>([])
  const yahooStandings = ref<any[]>([])
  const yahooMatchups = ref<any[]>([])

  // Historical data
  const historicalSeasons = ref<SleeperLeague[]>([])
  const historicalRosters = ref<Map<string, SleeperRoster[]>>(new Map())
  const historicalUsers = ref<Map<string, SleeperUser[]>>(new Map())
  const historicalMatchups = ref<Map<string, Map<number, SleeperMatchup[]>>>(new Map())
  const historicalDrafts = ref<Map<string, any>>(new Map())
  const historicalBrackets = ref<Map<string, any[]>>(new Map())

  // Cache for multiple leagues (in memory)
  const leagueCache = ref<Map<string, LeagueCache>>(new Map())

  // Computed
  const currentSeason = computed(() => currentLeague.value?.season || new Date().getFullYear().toString())
  const playoffWeekStart = computed(() => currentLeague.value?.settings?.playoff_week_start || 15)
  const currentWeek = computed(() => currentLeague.value?.settings?.leg || 1)
  
  // Current user info
  const currentUserId = ref<string | null>(null)
  const currentUsername = ref<string | null>(null)
  
  // Active sport for filtering (will be synced from sport store)
  const activeSport = ref<'football' | 'baseball' | 'basketball' | 'hockey'>('football')

  // Check if user has any saved leagues
  const hasSavedLeagues = computed(() => savedLeagues.value.length > 0)
  
  // Alias for savedLeagues for easier template access
  const allLeagues = computed(() => savedLeagues.value)
  
  // Filter saved leagues by active sport
  const filteredLeaguesBySport = computed(() => {
    return savedLeagues.value.filter(league => {
      // If league doesn't have sport set, assume football for backwards compatibility
      const leagueSport = league.sport || 'football'
      return leagueSport === activeSport.value
    })
  })
  
  // Set active sport (called from App.vue when sport changes)
  function setActiveSport(sport: 'football' | 'baseball' | 'basketball' | 'hockey') {
    activeSport.value = sport
    saveToLocalStorage()
  }

  // ============================================
  // LOCAL STORAGE FUNCTIONS
  // ============================================

  function saveToLocalStorage() {
    try {
      localStorage.setItem(STORAGE_KEYS.SAVED_LEAGUES, JSON.stringify(savedLeagues.value))
      if (currentUsername.value) {
        localStorage.setItem(STORAGE_KEYS.CURRENT_USERNAME, currentUsername.value)
      }
      if (activeLeagueId.value) {
        localStorage.setItem(STORAGE_KEYS.ACTIVE_LEAGUE, activeLeagueId.value)
      }
      if (currentUserId.value) {
        localStorage.setItem('ufd_current_user_id', currentUserId.value)
      }
      // Save active platform and sport
      localStorage.setItem(STORAGE_KEYS.ACTIVE_PLATFORM, activePlatform.value)
      localStorage.setItem(STORAGE_KEYS.ACTIVE_SPORT, activeSport.value)
    } catch (e) {
      console.warn('Failed to save to localStorage:', e)
    }
  }

  function loadFromLocalStorage() {
    try {
      const savedLeaguesData = localStorage.getItem(STORAGE_KEYS.SAVED_LEAGUES)
      if (savedLeaguesData) {
        savedLeagues.value = JSON.parse(savedLeaguesData)
      }
      
      const username = localStorage.getItem(STORAGE_KEYS.CURRENT_USERNAME)
      if (username) {
        currentUsername.value = username
      }
      
      const activeLeague = localStorage.getItem(STORAGE_KEYS.ACTIVE_LEAGUE)
      if (activeLeague) {
        activeLeagueId.value = activeLeague
      }
      
      const userId = localStorage.getItem('ufd_current_user_id')
      if (userId) {
        currentUserId.value = userId
      }
      
      // Restore active platform and sport
      const platform = localStorage.getItem(STORAGE_KEYS.ACTIVE_PLATFORM) as 'sleeper' | 'yahoo' | null
      if (platform) {
        activePlatform.value = platform
      }
      
      const sport = localStorage.getItem(STORAGE_KEYS.ACTIVE_SPORT) as 'football' | 'baseball' | 'basketball' | 'hockey' | null
      if (sport) {
        activeSport.value = sport
      }
    } catch (e) {
      console.warn('Failed to load from localStorage:', e)
    }
  }

  function saveCacheToLocalStorage(leagueId: string, cache: LeagueCache) {
    try {
      // Convert Maps to arrays for JSON serialization
      const serializable = {
        league: cache.league,
        rosters: cache.rosters,
        users: cache.users,
        historicalSeasons: cache.historicalSeasons,
        historicalRosters: Array.from(cache.historicalRosters.entries()),
        historicalUsers: Array.from(cache.historicalUsers.entries()),
        historicalMatchups: Array.from(cache.historicalMatchups.entries()).map(([k, v]) => [k, Array.from(v.entries())]),
        historicalDrafts: Array.from(cache.historicalDrafts.entries()),
        historicalBrackets: Array.from(cache.historicalBrackets.entries()),
        loadedAt: cache.loadedAt
      }
      localStorage.setItem(`${STORAGE_KEYS.LEAGUE_CACHE}_${leagueId}`, JSON.stringify(serializable))
    } catch (e) {
      console.warn('Failed to save cache to localStorage:', e)
    }
  }

  function loadCacheFromLocalStorage(leagueId: string): LeagueCache | null {
    try {
      const data = localStorage.getItem(`${STORAGE_KEYS.LEAGUE_CACHE}_${leagueId}`)
      if (!data) return null
      
      const parsed = JSON.parse(data)
      
      // Check if cache is still valid (24 hours)
      if (Date.now() - parsed.loadedAt > 24 * 60 * 60 * 1000) {
        localStorage.removeItem(`${STORAGE_KEYS.LEAGUE_CACHE}_${leagueId}`)
        return null
      }
      
      // Convert arrays back to Maps
      return {
        league: parsed.league,
        rosters: parsed.rosters,
        users: parsed.users,
        historicalSeasons: parsed.historicalSeasons,
        historicalRosters: new Map(parsed.historicalRosters),
        historicalUsers: new Map(parsed.historicalUsers),
        historicalMatchups: new Map(parsed.historicalMatchups.map(([k, v]: [string, any]) => [k, new Map(v)])),
        historicalDrafts: new Map(parsed.historicalDrafts),
        historicalBrackets: new Map(parsed.historicalBrackets),
        loadedAt: parsed.loadedAt
      }
    } catch (e) {
      console.warn('Failed to load cache from localStorage:', e)
      return null
    }
  }

  // ============================================
  // SUPABASE SYNC FUNCTIONS
  // ============================================

  async function loadSavedLeagues(userId: string) {
    // First, load from localStorage for instant display
    loadFromLocalStorage()
    
    if (!supabase) return
    
    try {
      const { data, error: fetchError } = await supabase
        .from('user_leagues')
        .select('*')
        .eq('user_id', userId)
        .order('is_primary', { ascending: false })
      
      if (fetchError) throw fetchError
      
      if (data && data.length > 0) {
        // MERGE Supabase leagues with localStorage leagues instead of replacing
        // This preserves local-only leagues (like ESPN leagues that don't sync to Supabase)
        const localLeagues = savedLeagues.value
        const supabaseLeagueIds = new Set(data.map(l => l.league_id))
        
        // Keep local leagues that aren't in Supabase (local-only leagues)
        const localOnlyLeagues = localLeagues.filter(l => !supabaseLeagueIds.has(l.league_id))
        
        // Merge: Supabase leagues (source of truth) + local-only leagues
        savedLeagues.value = [...data, ...localOnlyLeagues]
        
        console.log(`[League Store] Merged ${data.length} Supabase leagues + ${localOnlyLeagues.length} local-only leagues`)
        saveToLocalStorage()
      }
      
      // If there's a primary league and no active league, load it
      const primaryLeague = savedLeagues.value.find(l => l.is_primary)
      if (primaryLeague && !activeLeagueId.value) {
        currentUsername.value = primaryLeague.sleeper_username
        await setActiveLeague(primaryLeague.league_id)
      } else if (activeLeagueId.value) {
        // Load the previously active league
        await setActiveLeague(activeLeagueId.value)
      }
    } catch (e) {
      console.error('Failed to load saved leagues from Supabase:', e)
    }
  }

  async function saveLeague(league: SleeperLeague, username: string, userId: string, sport: 'football' | 'baseball' | 'basketball' | 'hockey' = 'football'): Promise<SavedLeague | undefined> {
    // Check if this league is already saved
    const existing = savedLeagues.value.find(l => l.league_id === league.league_id)
    if (existing) return existing
    
    const isPrimary = savedLeagues.value.length === 0
    
    const newLeague: SavedLeague = {
      league_id: league.league_id,
      league_name: league.name,
      platform: 'sleeper',
      sport: sport,
      season: league.season,
      sleeper_username: username,
      is_primary: isPrimary,
      league_type: league.settings?.type ?? 0, // 0 = redraft, 1 = keeper, 2 = dynasty
      num_teams: league.total_rosters || league.settings?.num_teams
    }
    
    // Add to local state immediately
    savedLeagues.value.push(newLeague)
    saveToLocalStorage()
    
    // Sync to Supabase in background
    if (supabase) {
      try {
        const { data, error: saveError } = await supabase
          .from('user_leagues')
          .insert({
            user_id: userId,
            ...newLeague
          })
          .select()
          .single()
        
        if (saveError) throw saveError
        
        // Update with server ID
        const index = savedLeagues.value.findIndex(l => l.league_id === league.league_id)
        if (index !== -1 && data) {
          savedLeagues.value[index] = data
          saveToLocalStorage()
        }
        
        return data
      } catch (e) {
        console.error('Failed to save league to Supabase:', e)
      }
    }
    
    return newLeague
  }

  async function saveYahooLeague(league: any, userId: string, sport: 'football' | 'baseball' | 'basketball' | 'hockey'): Promise<SavedLeague | undefined> {
    // Use the league name as a more stable identifier for grouping
    // Check if this league is already saved by name
    const existingIndex = savedLeagues.value.findIndex(l => 
      l.platform === 'yahoo' && 
      l.league_name === league.name
    )
    
    // If exists, check if incoming season is newer and update it
    if (existingIndex !== -1) {
      const existing = savedLeagues.value[existingIndex]
      const existingSeason = parseInt(existing.season || '0')
      const newSeason = parseInt(league.season || '0')
      
      // If the new season is newer (or same but different key), update the league
      if (newSeason > existingSeason || (newSeason === existingSeason && existing.league_id !== league.league_key)) {
        console.log(`Updating Yahoo league "${league.name}" from season ${existingSeason} to ${newSeason}`)
        
        // Build updated historical seasons
        const existingHistorical = existing.yahoo_historical_seasons || []
        const newHistorical = league.all_seasons || [{ league_key: league.league_key, season: league.season }]
        
        // Merge historical seasons, avoiding duplicates
        const mergedHistorical = [...existingHistorical]
        for (const season of newHistorical) {
          if (!mergedHistorical.some(s => s.league_key === season.league_key)) {
            mergedHistorical.push(season)
          }
        }
        // Sort by season descending
        mergedHistorical.sort((a, b) => parseInt(b.season) - parseInt(a.season))
        
        // Update the existing league
        savedLeagues.value[existingIndex] = {
          ...existing,
          league_id: league.league_key, // Update to new season's key
          season: league.season,
          yahoo_league_key: league.league_key,
          yahoo_historical_seasons: mergedHistorical,
          num_teams: league.num_teams,
          scoring_type: league.scoring_type
        }
        saveToLocalStorage()
        
        // Update in Supabase
        if (supabase && existing.id) {
          try {
            await supabase
              .from('user_leagues')
              .update({
                league_id: league.league_key,
                season: league.season,
                yahoo_league_key: league.league_key,
                num_teams: league.num_teams,
                scoring_type: league.scoring_type
              })
              .eq('id', existing.id)
          } catch (e) {
            console.error('Failed to update Yahoo league in Supabase:', e)
          }
        }
        
        return savedLeagues.value[existingIndex]
      }
      
      // Existing league is same or newer season, return it as-is
      return existing
    }
    
    const isPrimary = savedLeagues.value.length === 0
    
    // league.all_seasons contains all historical season keys for this league
    const historicalSeasons = league.all_seasons || [{ league_key: league.league_key, season: league.season }]
    
    const newLeague: SavedLeague = {
      league_id: league.league_key, // Most recent season's key
      league_name: league.name,
      platform: 'yahoo',
      sport: sport,
      season: league.season, // Most recent season
      yahoo_league_key: league.league_key,
      yahoo_historical_seasons: historicalSeasons,
      is_primary: isPrimary,
      num_teams: league.num_teams,
      scoring_type: league.scoring_type
    }
    
    // Add to local state immediately
    savedLeagues.value.push(newLeague)
    saveToLocalStorage()
    
    // Sync to Supabase in background (store historical seasons as JSON)
    if (supabase) {
      try {
        const { data, error: saveError } = await supabase
          .from('user_leagues')
          .insert({
            user_id: userId,
            league_id: newLeague.league_id,
            league_name: newLeague.league_name,
            platform: newLeague.platform,
            sport: newLeague.sport,
            season: newLeague.season,
            yahoo_league_key: newLeague.yahoo_league_key,
            is_primary: newLeague.is_primary,
            num_teams: newLeague.num_teams,
            scoring_type: newLeague.scoring_type
            // Note: yahoo_historical_seasons stored in localStorage only for now
          })
          .select()
          .single()
        
        if (saveError) throw saveError
        
        // Update with server ID but keep historical seasons
        const index = savedLeagues.value.findIndex(l => l.league_id === league.league_key)
        if (index !== -1 && data) {
          savedLeagues.value[index] = {
            ...data,
            yahoo_historical_seasons: historicalSeasons
          }
          saveToLocalStorage()
        }
        
        return savedLeagues.value[index]
      } catch (e) {
        console.error('Failed to save Yahoo league to Supabase:', e)
      }
    }
    
    return newLeague
  }

  /**
   * Save an ESPN league to local state and Supabase
   * ESPN data is fetched live from API, we just store the reference
   */
  async function saveEspnLeague(leagueId: string, leagueName: string, sport: 'football' | 'baseball' | 'basketball' | 'hockey', season: number, numTeams?: number, scoringType?: string): Promise<SavedLeague> {
    // Create league key (format: espn_{sport}_{leagueId}_{season})
    const leagueKey = `espn_${sport}_${leagueId}_${season}`
    
    // Check if already exists
    const existing = savedLeagues.value.find(l => l.league_id === leagueKey)
    if (existing) {
      console.log('[ESPN] League already saved:', leagueKey)
      return existing
    }
    
    const isPrimary = savedLeagues.value.length === 0
    
    const newLeague: SavedLeague = {
      league_id: leagueKey,
      league_name: leagueName,
      platform: 'espn',
      sport: sport,
      season: season.toString(),
      is_primary: isPrimary,
      num_teams: numTeams,
      scoring_type: scoringType
    }
    
    // Add to local state
    savedLeagues.value.push(newLeague)
    saveToLocalStorage()
    
    console.log('[ESPN] League saved to local state:', newLeague)
    
    // Sync to Supabase in background
    if (supabase && currentUserId.value) {
      try {
        const { data, error: saveError } = await supabase
          .from('user_leagues')
          .insert({
            user_id: currentUserId.value,
            league_id: leagueKey,
            league_name: leagueName,
            platform: 'espn',
            sport: sport,
            season: season.toString(),
            is_primary: isPrimary,
            num_teams: numTeams,
            scoring_type: scoringType
          })
          .select()
          .single()
        
        if (saveError) {
          console.error('Failed to save ESPN league to Supabase:', saveError)
        } else if (data) {
          // Update local state with the Supabase record (which has id)
          const index = savedLeagues.value.findIndex(l => l.league_id === leagueKey)
          if (index !== -1) {
            savedLeagues.value[index] = data
            saveToLocalStorage()
          }
          console.log('[ESPN] League synced to Supabase:', data)
        }
      } catch (e) {
        console.error('Failed to sync ESPN league to Supabase:', e)
      }
    }
    
    return newLeague
  }

  async function removeLeague(leagueId: string, userId?: string) {
    // Remove from local state immediately
    savedLeagues.value = savedLeagues.value.filter(l => l.league_id !== leagueId)
    saveToLocalStorage()
    
    // Remove from localStorage cache
    localStorage.removeItem(`${STORAGE_KEYS.LEAGUE_CACHE}_${leagueId}`)
    
    // Clear memory cache
    leagueCache.value.delete(leagueId)
    
    // If we removed the active league, clear it
    if (activeLeagueId.value === leagueId) {
      activeLeagueId.value = null
      currentLeague.value = null
      localStorage.removeItem(STORAGE_KEYS.ACTIVE_LEAGUE)
      
      // Switch to another league or demo mode
      if (savedLeagues.value.length > 0) {
        await setActiveLeague(savedLeagues.value[0].league_id)
      } else {
        enableDemoMode()
      }
    }
    
    // Sync to Supabase in background
    if (supabase && userId) {
      try {
        await supabase
          .from('user_leagues')
          .delete()
          .eq('user_id', userId)
          .eq('league_id', leagueId)
      } catch (e) {
        console.error('Failed to remove league from Supabase:', e)
      }
    }
  }

  async function setPrimaryLeague(leagueId: string, userId?: string) {
    // Update local state immediately
    savedLeagues.value = savedLeagues.value.map(l => ({
      ...l,
      is_primary: l.league_id === leagueId
    }))
    saveToLocalStorage()
    
    // Sync to Supabase in background
    if (supabase && userId) {
      try {
        await supabase
          .from('user_leagues')
          .update({ is_primary: false })
          .eq('user_id', userId)
        
        await supabase
          .from('user_leagues')
          .update({ is_primary: true })
          .eq('user_id', userId)
          .eq('league_id', leagueId)
      } catch (e) {
        console.error('Failed to set primary league in Supabase:', e)
      }
    }
  }

  // ============================================
  // LEAGUE DATA FUNCTIONS
  // ============================================

  async function fetchUserLeagues(username: string) {
    isLoading.value = true
    error.value = null
    try {
      const user = await sleeperService.getUser(username)
      currentUserId.value = user.user_id
      currentUsername.value = username
      saveToLocalStorage()
      
      const fetchedLeagues = await sleeperService.getUserLeagues(user.user_id, currentSeason.value)
      
      // Merge with saved leagues (avoid duplicates)
      const savedIds = new Set(savedLeagues.value.map(l => l.league_id))
      const newLeagues = fetchedLeagues.filter(l => !savedIds.has(l.league_id))
      
      leagues.value = [
        ...savedLeagues.value.map(sl => ({
          league_id: sl.league_id,
          name: sl.league_name,
          season: sl.season,
          status: 'in_season',
          sport: sl.sport || 'nfl',
          settings: {},
          scoring_settings: {},
          roster_positions: [],
          total_rosters: 12
        } as SleeperLeague)),
        ...newLeagues
      ]
      
      return fetchedLeagues
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch leagues'
      throw e
    } finally {
      isLoading.value = false
    }
  }

  async function setActiveLeague(leagueId: string) {
    isLoading.value = true
    error.value = null
    activeLeagueId.value = leagueId
    isDemoMode.value = false
    
    // Check if this is a saved league
    const savedLeague = savedLeagues.value.find(l => l.league_id === leagueId)
    
    // Set sport from saved league if available
    if (savedLeague?.sport) {
      activeSport.value = savedLeague.sport as 'football' | 'baseball' | 'basketball' | 'hockey'
    }
    
    saveToLocalStorage()
    
    // Detect ESPN league by ID format (e.g., "espn_baseball_12345_2024")
    const isEspnLeagueId = leagueId.startsWith('espn_')
    
    if (savedLeague?.platform === 'espn' || isEspnLeagueId) {
      // Handle ESPN league
      activePlatform.value = 'espn'
      saveToLocalStorage()
      await loadEspnLeagueData(leagueId)
      return
    }
    
    // Detect Yahoo league by ID format (e.g., "431.l.136233" or "nfl.l.123456")
    const isYahooLeagueId = /^\d+\.l\.\d+$/.test(leagueId) || /^[a-z]+\.l\.\d+$/.test(leagueId)
    
    if (savedLeague?.platform === 'yahoo' || isYahooLeagueId) {
      // Handle Yahoo league
      activePlatform.value = 'yahoo'
      saveToLocalStorage()
      await loadYahooLeagueData(leagueId)
      return
    }
    
    // Handle Sleeper league (existing logic)
    activePlatform.value = 'sleeper'
    saveToLocalStorage()
    
    try {
      // Get the saved league to find the username
      if (savedLeague?.sleeper_username && !currentUserId.value) {
        // Fetch the Sleeper user ID if we don't have it
        try {
          const user = await sleeperService.getUser(savedLeague.sleeper_username)
          currentUserId.value = user.user_id
          currentUsername.value = savedLeague.sleeper_username
        } catch (e) {
          console.warn('Failed to fetch Sleeper user ID:', e)
        }
      }
      
      // First, check localStorage cache for instant loading
      const localCache = loadCacheFromLocalStorage(leagueId)
      
      // Then check memory cache
      const memCache = leagueCache.value.get(leagueId)
      const cacheAge = memCache ? Date.now() - memCache.loadedAt : Infinity
      const memCacheValid = cacheAge < 5 * 60 * 1000 // 5 minutes for memory cache
      
      if (localCache && !memCache) {
        // Use localStorage cache immediately
        console.log(`Loading league ${leagueId} from localStorage cache`)
        currentLeague.value = localCache.league
        rosters.value = localCache.rosters
        users.value = localCache.users
        historicalSeasons.value = localCache.historicalSeasons
        historicalRosters.value = localCache.historicalRosters
        historicalUsers.value = localCache.historicalUsers
        historicalMatchups.value = localCache.historicalMatchups
        historicalDrafts.value = localCache.historicalDrafts
        historicalBrackets.value = localCache.historicalBrackets
        
        // Store in memory cache too
        leagueCache.value.set(leagueId, localCache)
        
        // Load players if needed
        if (Object.keys(players.value).length === 0) {
          players.value = await sleeperService.getPlayers()
        }
        
        isLoading.value = false
        
        // Refresh data in background
        refreshLeagueData(leagueId)
        return
      }
      
      if (memCache && memCacheValid) {
        console.log(`Loading league ${leagueId} from memory cache`)
        currentLeague.value = memCache.league
        rosters.value = memCache.rosters
        users.value = memCache.users
        historicalSeasons.value = memCache.historicalSeasons
        historicalRosters.value = memCache.historicalRosters
        historicalUsers.value = memCache.historicalUsers
        historicalMatchups.value = memCache.historicalMatchups
        historicalDrafts.value = memCache.historicalDrafts
        historicalBrackets.value = memCache.historicalBrackets
        
        if (Object.keys(players.value).length === 0) {
          players.value = await sleeperService.getPlayers()
        }
        
        return
      }
      
      // No valid cache, fetch fresh data
      console.log(`Fetching fresh data for league ${leagueId}`)
      await loadFreshLeagueData(leagueId)
      
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to load league'
      throw e
    } finally {
      isLoading.value = false
    }
  }

  async function loadFreshLeagueData(leagueId: string) {
    const [league, leagueRosters, leagueUsers, playersData] = await Promise.all([
      sleeperService.getLeague(leagueId),
      sleeperService.getLeagueRosters(leagueId),
      sleeperService.getLeagueUsers(leagueId),
      sleeperService.getPlayers()
    ])

    currentLeague.value = league
    rosters.value = leagueRosters
    users.value = leagueUsers
    players.value = playersData

    // Transform Sleeper data to Yahoo-compatible format for unified views
    transformSleeperToYahooFormat(league, leagueRosters, leagueUsers)

    // Fetch historical data
    await fetchHistoricalData(leagueId)
    
    // Cache this league's data
    const cache: LeagueCache = {
      league,
      rosters: leagueRosters,
      users: leagueUsers,
      historicalSeasons: historicalSeasons.value,
      historicalRosters: historicalRosters.value,
      historicalUsers: historicalUsers.value,
      historicalMatchups: historicalMatchups.value,
      historicalDrafts: historicalDrafts.value,
      historicalBrackets: historicalBrackets.value,
      loadedAt: Date.now()
    }
    
    leagueCache.value.set(leagueId, cache)
    saveCacheToLocalStorage(leagueId, cache)
  }

  async function refreshLeagueData(leagueId: string) {
    try {
      // Background refresh - don't set loading state
      const [league, leagueRosters, leagueUsers] = await Promise.all([
        sleeperService.getLeague(leagueId),
        sleeperService.getLeagueRosters(leagueId),
        sleeperService.getLeagueUsers(leagueId)
      ])
      
      // Only update if this is still the active league
      if (activeLeagueId.value === leagueId) {
        currentLeague.value = league
        rosters.value = leagueRosters
        users.value = leagueUsers
        
        // Transform to Yahoo format for unified views
        transformSleeperToYahooFormat(league, leagueRosters, leagueUsers)
        
        // Update cache
        const existingCache = leagueCache.value.get(leagueId)
        if (existingCache) {
          const updatedCache = {
            ...existingCache,
            league,
            rosters: leagueRosters,
            users: leagueUsers,
            loadedAt: Date.now()
          }
          leagueCache.value.set(leagueId, updatedCache)
          saveCacheToLocalStorage(leagueId, updatedCache)
        }
      }
    } catch (e) {
      console.warn('Background refresh failed:', e)
    }
  }

  async function fetchHistoricalData(leagueId: string) {
    try {
      const histData = await sleeperService.getHistoricalData(leagueId)
      historicalSeasons.value = histData.seasons
      historicalRosters.value = histData.rosters
      historicalUsers.value = histData.users
      historicalMatchups.value = histData.matchups
      historicalDrafts.value = histData.drafts || new Map()
      
      // Fetch brackets for each season
      const brackets = new Map<string, any[]>()
      for (const season of histData.seasons) {
        try {
          const bracket = await sleeperService.getWinnersBracket(season.league_id)
          brackets.set(season.season, bracket)
        } catch (e) {
          console.warn(`Could not fetch bracket for ${season.season}`)
        }
      }
      historicalBrackets.value = brackets
    } catch (e) {
      console.error('Failed to load historical data:', e)
    }
  }

  function getTeamInfo(roster: SleeperRoster) {
    const user = users.value.find(u => u.user_id === roster.owner_id)
    return {
      name: sleeperService.getTeamName(roster, user),
      avatar: sleeperService.getAvatarUrl(roster, user, currentLeague.value!),
      user
    }
  }

  // ============================================
  // DEMO MODE FUNCTIONS
  // ============================================

  function enableDemoMode() {
    isDemoMode.value = true
    activeLeagueId.value = null
    currentLeague.value = null
  }

  function disableDemoMode() {
    isDemoMode.value = false
  }

  // ============================================
  // RESET FUNCTION
  // ============================================

  function reset() {
    activeLeagueId.value = null
    leagues.value = []
    savedLeagues.value = []
    currentLeague.value = null
    rosters.value = []
    users.value = []
    players.value = {}
    historicalSeasons.value = []
    historicalRosters.value = new Map()
    historicalUsers.value = new Map()
    historicalMatchups.value = new Map()
    historicalDrafts.value = new Map()
    historicalBrackets.value = new Map()
    error.value = null
    isDemoMode.value = false
    
    // Clear Yahoo state
    yahooLeague.value = null
    yahooTeams.value = []
    yahooStandings.value = []
    yahooMatchups.value = []
    
    // Clear localStorage
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key)
    })
    
    // Clear all league caches
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith(STORAGE_KEYS.LEAGUE_CACHE)) {
        localStorage.removeItem(key)
      }
    }
  }
  
  // Transform Sleeper data to Yahoo-compatible format for unified views
  function transformSleeperToYahooFormat(league: any, leagueRosters: any[], leagueUsers: any[]) {
    console.log('[Sleeper] Transforming to Yahoo format for unified views')
    
    // Create a map of user_id to user data for quick lookup
    const userMap = new Map<string, any>()
    leagueUsers.forEach(user => {
      userMap.set(user.user_id, user)
    })
    
    // Transform rosters to yahooTeams format
    yahooTeams.value = leagueRosters.map((roster, index) => {
      const user = userMap.get(roster.owner_id)
      const teamName = user?.metadata?.team_name || user?.display_name || `Team ${roster.roster_id}`
      
      // Generate avatar URL - prioritize league-specific avatar over account avatar
      let logoUrl = ''
      if (user?.metadata?.avatar) {
        // League-specific avatar (set per-league in Sleeper) - already a full URL
        logoUrl = user.metadata.avatar.startsWith('http') 
          ? user.metadata.avatar 
          : `https://sleepercdn.com/avatars/thumbs/${user.metadata.avatar}`
      } else if (roster.metadata?.avatar) {
        // Roster metadata avatar
        logoUrl = `https://sleepercdn.com/avatars/thumbs/${roster.metadata.avatar}`
      } else if (user?.avatar) {
        // User's account avatar (fallback)
        logoUrl = `https://sleepercdn.com/avatars/thumbs/${user.avatar}`
      } else {
        logoUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(teamName)}&background=random&color=fff&size=64`
      }
      
      // Calculate points (Sleeper stores as fpts which is points * 100 for decimal precision in some cases)
      const pointsFor = roster.settings?.fpts || 0
      const pointsAgainst = roster.settings?.fpts_against || 0
      
      return {
        team_key: `sleeper_${roster.roster_id}`,
        team_id: roster.roster_id.toString(),
        name: teamName,
        logo_url: logoUrl,
        wins: roster.settings?.wins || 0,
        losses: roster.settings?.losses || 0,
        ties: roster.settings?.ties || 0,
        points_for: pointsFor,
        points_against: pointsAgainst,
        rank: index + 1, // Will be sorted below
        is_my_team: !!(currentUserId.value && roster.owner_id === currentUserId.value),
        transactions: roster.settings?.total_moves || 0,
        roster_id: roster.roster_id,
        owner_id: roster.owner_id,
        user_display_name: user?.display_name
      }
    })
    
    // Sort by wins (desc), then points_for (desc)
    yahooTeams.value.sort((a, b) => {
      if (b.wins !== a.wins) return b.wins - a.wins
      return b.points_for - a.points_for
    })
    
    // Update ranks after sorting
    yahooTeams.value.forEach((team, idx) => {
      team.rank = idx + 1
    })
    
    // Set yahooStandings to same as yahooTeams
    yahooStandings.value = yahooTeams.value
    
    // Transform league info
    yahooLeague.value = [{
      league_key: league.league_id,
      league_id: league.league_id,
      name: league.name,
      season: league.season,
      scoring_type: league.scoring_settings?.rec ? 'headpoint' : 'headpoint', // Sleeper is always points-based
      current_week: league.settings?.leg || 1,
      start_week: 1,
      end_week: league.settings?.playoff_week_start || 14,
      num_teams: league.total_rosters || leagueRosters.length
    }]
    
    console.log('[Sleeper] Transformed teams:', yahooTeams.value.length)
  }
  
  // Load Yahoo league data
  async function loadYahooLeagueData(leagueKey: string) {
    isLoading.value = true
    error.value = null
    
    try {
      // Import Yahoo service dynamically to avoid circular dependencies
      const { yahooService } = await import('@/services/yahoo')
      const { useAuthStore } = await import('@/stores/auth')
      const authStore = useAuthStore()
      
      if (!authStore.user?.id) {
        throw new Error('Not authenticated')
      }
      
      // Initialize Yahoo service
      const initialized = await yahooService.initialize(authStore.user.id)
      if (!initialized) {
        throw new Error('Failed to initialize Yahoo connection')
      }
      
      // Fetch league metadata (includes current week)
      const metadata = await yahooService.getLeagueMetadata(leagueKey)
      
      // Fetch league details
      const leagueDetails = await yahooService.getLeagueDetails(leagueKey)
      yahooLeague.value = leagueDetails
      
      // Fetch teams with standings info
      let teams = await yahooService.getTeams(leagueKey)
      
      // Check if this league has actual data (not a renewed but unplayed league).
      // A league that has completed its draft (draft_status === 'postdraft') is considered
      // active even if no games have been played yet — do NOT fall back to the previous
      // season or we'll show stale standings + the offseason banner.
      const hasDrafted = metadata.draft_status === 'postdraft' || metadata.draft_status === 'drafting'
      const hasData = hasDrafted || teams.some(t => (t.wins || 0) > 0 || (t.losses || 0) > 0 || (t.points_for || 0) > 0)

      if (hasDrafted) {
        console.log(`[Yahoo] draft_status="${metadata.draft_status}" — active season, skipping previous-season fallback`)
      }

      // If no data, check for a previous season to load instead
      if (!hasData) {
        console.log('League has no data, checking for previous season...')
        
        // Check if there's a "renew" field in the league details pointing to previous season
        const renewField = leagueDetails?.[0]?.renew
        if (renewField) {
          // renew format is "gamekey_leagueid" like "431_136233"
          const [prevGameKey, prevLeagueId] = renewField.split('_')
          const previousLeagueKey = `${prevGameKey}.l.${prevLeagueId}`
          
          console.log(`Found previous season: ${previousLeagueKey}, trying to load that instead...`)
          
          try {
            // Try loading the previous season
            const prevTeams = await yahooService.getTeams(previousLeagueKey)
            const prevHasData = prevTeams.some(t => (t.wins || 0) > 0 || (t.losses || 0) > 0 || (t.points_for || 0) > 0)
            
            if (prevHasData) {
              console.log('Previous season has data! Using that instead.')
              
              // Update to use previous season data
              teams = prevTeams
              yahooTeams.value = teams
              
              // Update league details and metadata for previous season
              const prevLeagueDetails = await yahooService.getLeagueDetails(previousLeagueKey)
              yahooLeague.value = prevLeagueDetails
              
              const prevMetadata = await yahooService.getLeagueMetadata(previousLeagueKey)
              
              // Fetch standings for previous season
              const standings = await yahooService.getStandings(previousLeagueKey)
              yahooStandings.value = standings
              
              // Check if this is a category league for previous season
              const savedLeague = savedLeagues.value.find(l => l.league_id === leagueKey)
              const scoringType = savedLeague?.scoring_type || prevLeagueDetails?.[0]?.scoring_type || ''
              const isCategoryLeague = scoringType === 'head' || scoringType === 'headone' || scoringType === 'roto'
              
              // Fetch matchups for previous season - use getCategoryMatchups for category leagues
              let matchups: any[]
              if (isCategoryLeague) {
                const categoryMatchups = await yahooService.getCategoryMatchups(previousLeagueKey, prevMetadata.currentWeek)
                matchups = categoryMatchups.map((m, idx) => {
                  const team1 = m.teams?.[0]
                  const team2 = m.teams?.[1]
                  const team1Key = team1?.team_key
                  const team2Key = team2?.team_key
                  
                  let team1Wins = 0
                  let team2Wins = 0
                  let ties = 0
                  
                  for (const sw of (m.stat_winners || [])) {
                    if (sw.is_tied) ties++
                    else if (sw.winner_team_key === team1Key) team1Wins++
                    else if (sw.winner_team_key === team2Key) team2Wins++
                  }
                  
                  return {
                    matchup_id: idx + 1,
                    week: m.week,
                    teams: [
                      { ...team1, team_id: team1Key?.split('.').pop(), win_count: team1Wins },
                      { ...team2, team_id: team2Key?.split('.').pop(), win_count: team2Wins }
                    ],
                    team1_wins: team1Wins,
                    team2_wins: team2Wins,
                    ties,
                    is_category_league: true,
                    stat_winners: m.stat_winners
                  }
                })
              } else {
                matchups = await yahooService.getMatchups(previousLeagueKey, prevMetadata.currentWeek)
              }
              yahooMatchups.value = matchups
              
              // Create a currentLeague object that's compatible with the UI
              const prevSeason = prevLeagueDetails?.[0]?.season || (parseInt(savedLeague?.season || '2025') - 1).toString()
              
              currentLeague.value = {
                league_id: previousLeagueKey, // Use previous season's key
                name: savedLeague?.league_name || prevLeagueDetails?.[0]?.name || 'Yahoo League',
                season: prevSeason,
                status: prevMetadata.isFinished ? 'complete' : 'in_season',
                sport: savedLeague?.sport || 'nfl',
                settings: {
                  leg: prevMetadata.currentWeek,
                  playoff_week_start: 15,
                  start_week: prevMetadata.startWeek,
                  end_week: prevMetadata.endWeek
                },
                scoring_settings: {},
                roster_positions: [],
                total_rosters: savedLeague?.num_teams || teams.length || 12
              } as any
              
              console.log('Yahoo league loaded (previous season):', {
                metadata: prevMetadata,
                league: yahooLeague.value,
                teams: yahooTeams.value,
                standings: yahooStandings.value,
                matchups: yahooMatchups.value
              })
              
              return // Exit early, we loaded previous season successfully
            }
          } catch (prevError) {
            console.warn('Failed to load previous season:', prevError)
            // Continue with current (empty) data
          }
        }
        
        // Also check saved league for historical seasons
        const savedLeague = savedLeagues.value.find(l => l.league_id === leagueKey)
        if (savedLeague?.yahoo_historical_seasons?.length) {
          // Find a historical season that might have data
          for (const historicalSeason of savedLeague.yahoo_historical_seasons) {
            if (historicalSeason.league_key === leagueKey) continue // Skip current
            
            try {
              console.log(`Trying historical season: ${historicalSeason.league_key} (${historicalSeason.season})`)
              const histTeams = await yahooService.getTeams(historicalSeason.league_key)
              const histHasData = histTeams.some(t => (t.wins || 0) > 0 || (t.losses || 0) > 0 || (t.points_for || 0) > 0)
              
              if (histHasData) {
                console.log('Historical season has data! Using that.')
                teams = histTeams
                // Similar logic to load historical season...
                break
              }
            } catch (histError) {
              console.warn(`Failed to load historical season ${historicalSeason.league_key}:`, histError)
            }
          }
        }
      }
      
      yahooTeams.value = teams
      
      // Fetch standings
      const standings = await yahooService.getStandings(leagueKey)
      yahooStandings.value = standings
      
      // Check if this is a category league
      const savedLeague = savedLeagues.value.find(l => l.league_id === leagueKey)
      const scoringType = savedLeague?.scoring_type || leagueDetails?.[0]?.scoring_type || ''
      const isRoto = scoringType === 'roto'
      const isCategoryLeague = scoringType === 'head' || scoringType === 'headone' || scoringType === 'roto'

      console.log('[Yahoo] Loading matchups, scoring_type:', scoringType, 'isCategoryLeague:', isCategoryLeague, 'isRoto:', isRoto)

      // Fetch current week matchups - use getCategoryMatchups for H2H category leagues
      // Roto leagues have NO weekly matchups, so skip getCategoryMatchups entirely
      let matchups: any[]
      if (isCategoryLeague && !isRoto) {
        let weekToLoad = metadata.currentWeek
        
        // If season is finished, start from end week instead of current week
        if (metadata.isFinished && metadata.endWeek) {
          weekToLoad = metadata.endWeek
        }
        
        let categoryMatchups = await yahooService.getCategoryMatchups(leagueKey, weekToLoad)
        
        // If current week has no matchups with stat_winners (playoffs/season over),
        // try a few previous weeks to find one with data
        if (categoryMatchups.every(m => !m.stat_winners?.length)) {
          console.log(`[Yahoo] Week ${weekToLoad} has no matchup data, searching backwards...`)
          const minWeek = Math.max(1, weekToLoad - 5) // Only go back 5 weeks max
          for (let w = weekToLoad - 1; w >= minWeek; w--) {
            const weekMatchups = await yahooService.getCategoryMatchups(leagueKey, w)
            if (weekMatchups.some(m => m.stat_winners?.length > 0)) {
              console.log(`[Yahoo] Found active week: ${w}`)
              categoryMatchups = weekMatchups
              weekToLoad = w
              break
            }
          }
        }
        
        // Transform category matchups to include win counts
        matchups = categoryMatchups.map((m, idx) => {
          const team1 = m.teams?.[0]
          const team2 = m.teams?.[1]
          const team1Key = team1?.team_key
          const team2Key = team2?.team_key
          
          // Count wins from stat_winners
          let team1Wins = 0
          let team2Wins = 0
          let ties = 0
          
          // Debug: log stat_winners for first matchup
          if (idx === 0) {
            console.log(`[Yahoo] First matchup stat_winners (${m.stat_winners?.length || 0}):`, 
              m.stat_winners?.slice(0, 3)?.map((sw: any) => ({
                stat_id: sw.stat_id,
                winner: sw.winner_team_key,
                is_tied: sw.is_tied
              }))
            )
          }
          
          for (const sw of (m.stat_winners || [])) {
            // is_tied can be boolean true or string '1'
            if (sw.is_tied === true || sw.is_tied === '1') {
              ties++
            } else if (sw.winner_team_key === team1Key) {
              team1Wins++
            } else if (sw.winner_team_key === team2Key) {
              team2Wins++
            }
          }
          
          console.log(`[Yahoo] Matchup ${idx + 1}: ${team1?.name} vs ${team2?.name} = ${team1Wins}-${team2Wins}-${ties}`)
          
          return {
            matchup_id: idx + 1,
            week: m.week,
            teams: [
              {
                ...team1,
                team_id: team1Key?.split('.').pop(),
                win_count: team1Wins
              },
              {
                ...team2,
                team_id: team2Key?.split('.').pop(),
                win_count: team2Wins
              }
            ],
            team1_wins: team1Wins,
            team2_wins: team2Wins,
            ties: ties,
            is_category_league: true,
            stat_winners: m.stat_winners,
            winner_team_key: m.winner_team_key,
            is_tied: m.is_tied
          }
        })
        console.log('[Yahoo] Transformed category matchups:', matchups.map(m => ({
          team1: m.teams?.[0]?.name,
          team2: m.teams?.[1]?.name,
          wins: `${m.team1_wins}-${m.team2_wins}-${m.ties}`
        })))
      } else if (isRoto) {
        // Roto leagues have no weekly matchups — pass empty array
        console.log('[Yahoo] Roto league — skipping matchup fetch (no weekly matchups in roto)')
        matchups = []
      } else {
        matchups = await yahooService.getMatchups(leagueKey, metadata.currentWeek)
      }
      yahooMatchups.value = matchups
      
      // Create a currentLeague object that's compatible with the UI
      currentLeague.value = {
        league_id: leagueKey,
        name: savedLeague?.league_name || leagueDetails?.[0]?.name || 'Yahoo League',
        season: savedLeague?.season || new Date().getFullYear().toString(),
        status: metadata.isFinished ? 'complete' : 'in_season',
        sport: savedLeague?.sport || 'nfl',
        settings: {
          leg: metadata.currentWeek,
          playoff_week_start: 15, // TODO: Get from Yahoo settings
          start_week: metadata.startWeek,
          end_week: metadata.endWeek
        },
        scoring_settings: {},
        roster_positions: [],
        total_rosters: savedLeague?.num_teams || teams.length || 12
      } as any
      
      console.log('Yahoo league loaded:', {
        metadata,
        league: yahooLeague.value,
        teams: yahooTeams.value,
        standings: yahooStandings.value,
        matchups: yahooMatchups.value
      })
      
    } catch (e) {
      console.error('Failed to load Yahoo league data:', e)
      error.value = e instanceof Error ? e.message : 'Failed to load Yahoo league'
    } finally {
      isLoading.value = false
    }
  }

  // Load ESPN league data
  async function loadEspnLeagueData(leagueKey: string) {
    isLoading.value = true
    error.value = null
    
    try {
      // Import ESPN service dynamically
      const { espnService } = await import('@/services/espn')
      const { useAuthStore } = await import('@/stores/auth')
      const { usePlatformsStore } = await import('@/stores/platforms')
      const authStore = useAuthStore()
      const platformsStore = usePlatformsStore()
      
      if (!authStore.user?.id) {
        throw new Error('Not authenticated')
      }
      
      // Initialize ESPN service
      await espnService.initialize(authStore.user.id)
      
      // Apply stored credentials if available
      const credentials = platformsStore.getEspnCredentials()
      if (credentials) {
        espnService.setCredentials(credentials.espn_s2, credentials.swid)
      }
      
      // Parse ESPN league key (format: espn_{sport}_{leagueId}_{season})
      const parts = leagueKey.split('_')
      if (parts.length < 4 || parts[0] !== 'espn') {
        throw new Error('Invalid ESPN league key format')
      }
      
      const sport = parts[1] as 'football' | 'baseball' | 'basketball' | 'hockey'
      const espnLeagueId = parts[2]
      const season = parseInt(parts[3])
      
      console.log(`[ESPN] Loading league: ${espnLeagueId}, sport: ${sport}, season: ${season}`)
      
      // Fetch league info
      const league = await espnService.getLeague(sport, espnLeagueId, season)
      if (!league) {
        throw new Error('Could not fetch ESPN league')
      }
      
      // Update saved league with correct scoring_type if it's missing or different
      const existingSavedLeague = savedLeagues.value.find(l => l.league_id === leagueKey)
      if (existingSavedLeague && league.scoringType) {
        const espnScoringType = league.scoringType // e.g., 'H2H_POINTS', 'H2H_CATEGORY'
        if (existingSavedLeague.scoring_type !== espnScoringType) {
          console.log(`[ESPN] Updating saved league scoring_type: ${existingSavedLeague.scoring_type} -> ${espnScoringType}`)
          existingSavedLeague.scoring_type = espnScoringType
          saveToLocalStorage()
          
          // Also update in Supabase if authenticated
          if (supabase && currentUserId.value) {
            supabase
              .from('user_leagues')
              .update({ scoring_type: espnScoringType })
              .eq('user_id', currentUserId.value)
              .eq('league_id', leagueKey)
              .then(({ error }) => {
                if (error) console.error('[ESPN] Failed to update scoring_type in Supabase:', error)
                else console.log('[ESPN] Updated scoring_type in Supabase')
              })
          }
        }
      }
      
      // Get teams with standings - use getStandings for better category league support
      // VERSION: 2026-01-30-fix-basketball-category-v2
      const isCategoryLeague = league.scoringType === 'H2H_CATEGORY'
      console.log('[ESPN] League scoringType:', league.scoringType, 'isCategoryLeague:', isCategoryLeague)
      console.log('[ESPN] VERSION CHECK - If you see this, league.ts is updated!')
      let espnTeams = isCategoryLeague 
        ? await espnService.getStandings(sport, espnLeagueId, season)
        : await espnService.getTeams(sport, espnLeagueId, season)
      
      // FALLBACK: If category league still has all zero records, calculate directly from matchups
      // This uses the same approach as Power Rankings which works correctly
      if (isCategoryLeague && espnTeams.every(t => t.wins === 0 && t.losses === 0)) {
        // ESPN's official standings show 0-0-0 for all teams.
        // This is the correct answer when:
        //   (a) The season just started and no week has officially completed
        //   (b) The first week is extended (matchup period rolled over but week isn't settled)
        //
        // In both cases, we trust ESPN's official standing of 0-0-0.
        // We verify by checking matchups — if Week 1 matchups are all UNDECIDED,
        // the week is genuinely in progress and we must show zeros.
        // If some matchups DO have decided winners, we fall through to compute.

        const fallbackCurrentWeek = league.status?.currentMatchupPeriod || 1
        const regularSeasonWeeks = league.settings?.regularSeasonMatchupPeriodCount || 25
        const fallbackIsActive = league.status?.isActive ?? true
        const completedWeeks = !fallbackIsActive ? regularSeasonWeeks : Math.min(fallbackCurrentWeek - 1, regularSeasonWeeks)

        // Check if Week 1 ALL non-bye matchups have officially decided results.
        // We require ALL to be decided (not just "some are not UNDECIDED") because
        // ESPN can return live/preliminary winners for in-progress matchups, making
        // the weaker "any decided" check fire prematurely.
        let hasAllWeek1Decided = false
        if (completedWeeks >= 1) {
          try {
            const week1Matchups = await espnService.getMatchups(sport, espnLeagueId, season, 1, false)
            const nonByeWeek1 = week1Matchups.filter(m => m.awayTeamId)
            hasAllWeek1Decided = nonByeWeek1.length > 0 &&
              nonByeWeek1.every(m => m.winner && m.winner !== 'UNDECIDED')
            console.log('[ESPN FALLBACK] Week 1 check: hasAllWeek1Decided =', hasAllWeek1Decided,
              '| winners:', week1Matchups.map(m => m.winner).join(', '))
          } catch (e) {
            console.warn('[ESPN FALLBACK] Could not check Week 1 matchups:', e)
          }
        }

        if (!hasAllWeek1Decided) {
          console.log('[ESPN FALLBACK] Week 1 not all officially decided — trusting ESPN 0-0-0 standings (week in progress or not started)')
          // Keep espnTeams as-is with 0-0-0 — do NOT compute from matchups
        } else {
        
        console.log('[ESPN FALLBACK] getStandings returned all zeros but matchups have decided results, calculating from weekly matchups...')
        console.log('[ESPN FALLBACK] Will process', completedWeeks, 'completed weeks')
        
        // Initialize team stats
        const teamStats = new Map<number, { wins: number; losses: number; ties: number; catWins: number; catLosses: number }>()
        espnTeams.forEach(t => {
          teamStats.set(t.id, { wins: 0, losses: 0, ties: 0, catWins: 0, catLosses: 0 })
        })
        
        // Fetch each week's matchups and count category wins
        for (let week = 1; week <= completedWeeks; week++) {
          try {
            const matchups = await espnService.getMatchups(sport, espnLeagueId, season, week, true)
            console.log(`[ESPN FALLBACK] Week ${week}: Got ${matchups.length} matchups`)

            // Only count this week when ALL non-bye matchups have officially decided winners
            const nonByeMatchups = matchups.filter(m => m.awayTeamId)
            const allDecided = nonByeMatchups.length > 0 &&
              nonByeMatchups.every(m => m.winner && m.winner !== 'UNDECIDED')
            if (!allDecided) {
              console.log(`[ESPN FALLBACK] Week ${week}: not all matchups officially decided — skipping (in-progress or extended week)`)
              continue
            }
            
            for (const matchup of matchups) {
              if (!matchup.awayTeamId) continue
              
              const homeStats = teamStats.get(matchup.homeTeamId)
              const awayStats = teamStats.get(matchup.awayTeamId)
              if (!homeStats || !awayStats) continue
              
              let homeCatWins = 0
              let awayCatWins = 0
              
              // Method 1: Use per-category results (best method)
              if (matchup.homePerCategoryResults && Object.keys(matchup.homePerCategoryResults).length > 0) {
                for (const result of Object.values(matchup.homePerCategoryResults)) {
                  if (result === 'WIN') homeCatWins++
                  else if (result === 'LOSS') awayCatWins++
                }
                if (week === 1) {
                  console.log(`[ESPN FALLBACK] Week ${week}: Using homePerCategoryResults, home=${homeCatWins} away=${awayCatWins}`)
                }
              }
              // Method 2: Use cumulativeScore category wins
              else if ((matchup.homeCategoryWins || 0) > 0 || (matchup.awayCategoryWins || 0) > 0) {
                homeCatWins = matchup.homeCategoryWins || 0
                awayCatWins = matchup.awayCategoryWins || 0
                if (week === 1) {
                  console.log(`[ESPN FALLBACK] Week ${week}: Using homeCategoryWins, home=${homeCatWins} away=${awayCatWins}`)
                }
              }
              
              // Track category totals
              homeStats.catWins += homeCatWins
              homeStats.catLosses += awayCatWins
              awayStats.catWins += awayCatWins
              awayStats.catLosses += homeCatWins
              
              // Determine matchup winner
              if (homeCatWins > awayCatWins) {
                homeStats.wins++
                awayStats.losses++
              } else if (awayCatWins > homeCatWins) {
                awayStats.wins++
                homeStats.losses++
              } else if (homeCatWins > 0 || awayCatWins > 0) {
                homeStats.ties++
                awayStats.ties++
              }
            }
          } catch (weekErr) {
            console.warn(`[ESPN FALLBACK] Error fetching week ${week}:`, weekErr)
          }
        }
        
        // Update espnTeams with calculated stats
        espnTeams = espnTeams.map(team => {
          const stats = teamStats.get(team.id)
          if (stats) {
            console.log(`[ESPN FALLBACK] ${team.name}: ${stats.wins}-${stats.losses} (Cat: ${stats.catWins}-${stats.catLosses})`)
            return {
              ...team,
              wins: stats.wins,
              losses: stats.losses,
              ties: stats.ties,
              categoryWins: stats.catWins,
              categoryLosses: stats.catLosses
            }
          }
          return team
        })
        
        console.log('[ESPN FALLBACK] Calculation complete')
        } // end else (completedWeeks >= 1)
      }
      
      // Get user's team ID for highlighting
      let myTeamId: number | null = null
      try {
        const myTeam = await espnService.getMyTeam(sport, espnLeagueId, season)
        if (myTeam) {
          myTeamId = myTeam.id
          console.log('[ESPN] Found my team:', myTeam.name, 'ID:', myTeamId)
        } else {
          console.log('[ESPN] Could not identify user team - no credentials or no match')
        }
      } catch (e) {
        console.log('[ESPN] Error getting my team:', e)
      }
      
      // Get current week matchups
      // For completed seasons, currentMatchupPeriod may reset to 1 (offseason)
      // Use regularSeasonMatchupPeriodCount as the effective last week instead
      const isSeasonActive = league.status?.isActive ?? true
      const regularSeasonWeeks = league.settings?.regularSeasonMatchupPeriodCount || 25
      const rawCurrentWeek = league.status?.currentMatchupPeriod || 1
      const currentWeek = !isSeasonActive ? regularSeasonWeeks : rawCurrentWeek
      
      console.log('[ESPN] Week calculation:', {
        isSeasonActive,
        rawCurrentWeek,
        regularSeasonWeeks,
        effectiveCurrentWeek: currentWeek
      })
      
      const espnMatchups = await espnService.getMatchups(sport, espnLeagueId, season, Math.min(currentWeek, regularSeasonWeeks))
      
      // Map ESPN teams to Yahoo-compatible format
      // Use local variable first to avoid triggering watchers prematurely
      // (if season has no data, we'll fallback to previous season instead)
      let mappedTeams = espnTeams.map(team => {
        // Debug: log what we're receiving from ESPN
        console.log('[ESPN] Mapping team:', {
          id: team.id,
          name: team.name,
          wins: team.wins,
          losses: team.losses,
          pointsFor: team.pointsFor,
          record: team.record,
          logo: team.logo,
          transactionCounter: team.transactionCounter
        })
        
        // Use team's logo if available, otherwise use ui-avatars.com as fallback
        let logoUrl = team.logo
        if (!logoUrl || logoUrl === '') {
          logoUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(team.name)}&background=3a3d52&color=fff&size=64`
        }
        
        return {
          team_key: `espn_${espnLeagueId}_${season}_${team.id}`,
          team_id: team.id.toString(),
          name: team.name,
          logo_url: logoUrl,
          wins: team.wins || team.record?.overall?.wins || 0,
          losses: team.losses || team.record?.overall?.losses || 0,
          ties: team.ties || team.record?.overall?.ties || 0,
          points_for: team.pointsFor || team.record?.overall?.pointsFor || 0,
          points_against: team.pointsAgainst || team.record?.overall?.pointsAgainst || 0,
          rank: team.playoffSeed || team.rank || 0,
          is_my_team: myTeamId !== null && team.id === myTeamId,
          transactionCounter: team.transactionCounter || 0,
          transactions: team.transactionCounter || 0,
          totalMoves: team.totalMoves || 0,  // Pre-calculated transaction total
          // Category league specific fields
          category_wins: (team as any).categoryWins || 0,
          category_losses: (team as any).categoryLosses || 0
        }
      })
      
      // Sort teams - for category leagues, sort by wins then category win percentage
      const sortedByWins = [...mappedTeams].sort((a, b) => {
        // First by wins
        if (b.wins !== a.wins) return b.wins - a.wins
        // Then by ties
        if ((b.ties || 0) !== (a.ties || 0)) return (b.ties || 0) - (a.ties || 0)
        // For category leagues, use category win percentage as tiebreaker
        const aCatTotal = (a.category_wins || 0) + (a.category_losses || 0) || 1
        const bCatTotal = (b.category_wins || 0) + (b.category_losses || 0) || 1
        const aCatPct = (a.category_wins || 0) / aCatTotal
        const bCatPct = (b.category_wins || 0) / bCatTotal
        if (bCatPct !== aCatPct) return bCatPct - aCatPct
        // Finally by points for
        return (b.points_for || 0) - (a.points_for || 0)
      })
      
      // If teams have rank from ESPN, use that; otherwise use calculated order
      if (sortedByWins.some(t => t.rank > 0)) {
        mappedTeams.sort((a, b) => (a.rank || 99) - (b.rank || 99))
      } else {
        // Assign ranks based on sorted order
        sortedByWins.forEach((team, idx) => {
          const original = mappedTeams.find(t => t.team_id === team.team_id)
          if (original) {
            original.rank = idx + 1
          }
        })
        mappedTeams = sortedByWins
      }
      
      // Log final mapped teams
      console.log('[ESPN] Final mapped teams:', mappedTeams.map(t => ({
        name: t.name,
        wins: t.wins,
        losses: t.losses,
        category_wins: t.category_wins,
        category_losses: t.category_losses,
        points_for: t.points_for,
        rank: t.rank
      })))
      
      // Check if this league has actual data (all zeros means season hasn't started).
      //
      // STRATEGY: Compare the season year we're loading to the current calendar year.
      // If they match (or the season is newer), this IS the live season — the draft has
      // happened and games are either pending or in progress. Never fall back to last year
      // just because teams show zero wins/losses at the very start of the season.
      //
      // For football: currentYear is the fall semester year (2025 season = loaded as 2025).
      // For baseball:  currentYear === season year (2026 season = 2026).
      // We also check ESPN's status fields as secondary signals.
      const now = new Date()
      const currentCalendarYear = now.getFullYear()
      // For sports where the season spans two calendar years (football, basketball, hockey),
      // the ESPN season ID is the year the season *started*. In Sept 2025 the NFL season is
      // 2025, in Feb 2026 we'd still be in the 2025 NFL season. So season >= currentYear-1
      // is a safe "this is a current or recent season" guard.
      const isCurrentOrRecentSeason = season >= currentCalendarYear - 1
      
      const latestPeriod = league.status?.latestScoringPeriod || 0
      const currentPeriod = league.status?.currentMatchupPeriod || league.currentMatchupPeriod || 0
      const scoringPeriod = (league as any).scoringPeriodId || 0
      const espnApiSaysLive = latestPeriod >= 1 || currentPeriod >= 1 || scoringPeriod >= 1

      // Treat as live if the season year matches (primary) OR ESPN signals activity (secondary)
      const espnSeasonIsLive = isCurrentOrRecentSeason || espnApiSaysLive
      const espnHasData = espnSeasonIsLive || mappedTeams.some(t => 
        (t.wins || 0) > 0 || (t.losses || 0) > 0 || (t.points_for || 0) > 0 || (t.category_wins || 0) > 0
      )
      
      if (espnSeasonIsLive) {
        console.log('[ESPN] Season', season, 'is current/live (currentYear:', currentCalendarYear, ', latestPeriod:', latestPeriod, ') — skipping previous-season fallback')
      }

      if (!espnHasData && season > 2020) {
        console.log('[ESPN] Current season has no data, trying previous season...')
        const prevSeason = season - 1
        try {
          const prevLeague = await espnService.getLeague(sport, espnLeagueId, prevSeason)
          if (prevLeague) {
            const prevIsCategoryLeague = prevLeague.scoringType === 'H2H_CATEGORY'
            
            // Use getStandings for category leagues (same as normal path)
            let prevTeams = prevIsCategoryLeague
              ? await espnService.getStandings(sport, espnLeagueId, prevSeason)
              : await espnService.getTeams(sport, espnLeagueId, prevSeason)
            
            // For category leagues with zero standings, calculate from matchups (same as normal path)
            if (prevIsCategoryLeague && prevTeams.every(t => t.wins === 0 && t.losses === 0)) {
              console.log('[ESPN Fallback] getStandings returned all zeros, calculating from weekly matchups...')
              
              const prevRegWeeks = prevLeague.settings?.regularSeasonMatchupPeriodCount || 25
              const prevIsActiveCalc = prevLeague.status?.isActive ?? true
              const prevCompletedWeeks = !prevIsActiveCalc ? prevRegWeeks : Math.min((prevLeague.status?.currentMatchupPeriod || 1) - 1, prevRegWeeks)
              
              const teamStats = new Map<number, { wins: number; losses: number; ties: number; catWins: number; catLosses: number }>()
              prevTeams.forEach(t => teamStats.set(t.id, { wins: 0, losses: 0, ties: 0, catWins: 0, catLosses: 0 }))
              
              for (let week = 1; week <= prevCompletedWeeks; week++) {
                try {
                  const matchups = await espnService.getMatchups(sport, espnLeagueId, prevSeason, week, true)
                  for (const matchup of matchups) {
                    if (!matchup.awayTeamId) continue
                    const homeStats = teamStats.get(matchup.homeTeamId)
                    const awayStats = teamStats.get(matchup.awayTeamId)
                    if (!homeStats || !awayStats) continue
                    
                    let homeCatWins = 0, awayCatWins = 0
                    if (matchup.homePerCategoryResults && Object.keys(matchup.homePerCategoryResults).length > 0) {
                      for (const result of Object.values(matchup.homePerCategoryResults)) {
                        if (result === 'WIN') homeCatWins++
                        else if (result === 'LOSS') awayCatWins++
                      }
                    } else if ((matchup.homeCategoryWins || 0) > 0 || (matchup.awayCategoryWins || 0) > 0) {
                      homeCatWins = matchup.homeCategoryWins || 0
                      awayCatWins = matchup.awayCategoryWins || 0
                    }
                    
                    homeStats.catWins += homeCatWins
                    homeStats.catLosses += awayCatWins
                    awayStats.catWins += awayCatWins
                    awayStats.catLosses += homeCatWins
                    
                    if (homeCatWins > awayCatWins) { homeStats.wins++; awayStats.losses++ }
                    else if (awayCatWins > homeCatWins) { awayStats.wins++; homeStats.losses++ }
                    else if (homeCatWins > 0 || awayCatWins > 0) { homeStats.ties++; awayStats.ties++ }
                  }
                } catch (weekErr) {
                  console.warn(`[ESPN Fallback] Error fetching week ${week}:`, weekErr)
                }
              }
              
              prevTeams = prevTeams.map(team => {
                const stats = teamStats.get(team.id)
                if (stats) {
                  console.log(`[ESPN Fallback] ${team.name}: ${stats.wins}-${stats.losses} (Cat: ${stats.catWins}-${stats.catLosses})`)
                  return { ...team, wins: stats.wins, losses: stats.losses, ties: stats.ties, categoryWins: stats.catWins, categoryLosses: stats.catLosses }
                }
                return team
              })
            }
            
            const prevHasData = prevTeams.some(t => 
              (t.wins || 0) > 0 || (t.losses || 0) > 0 || (t.pointsFor || 0) > 0 || ((t as any).categoryWins || 0) > 0
            )
            
            if (prevHasData) {
              console.log('[ESPN] Previous season has data! Using that instead.')
              
              // Get my team from previous season
              let prevMyTeamId: number | null = null
              try {
                const prevMyTeam = await espnService.getMyTeam(sport, espnLeagueId, prevSeason)
                if (prevMyTeam) prevMyTeamId = prevMyTeam.id
              } catch (e) { /* ignore */ }
              
              const prevRegularSeasonWeeks = prevLeague.settings?.regularSeasonMatchupPeriodCount || 25
              const prevIsActive = prevLeague.status?.isActive ?? true
              const prevCurrentWeek = !prevIsActive ? prevRegularSeasonWeeks : (prevLeague.status?.currentMatchupPeriod || 1)
              
              // Re-map teams from previous season (local variable first)
              let prevMappedTeams = prevTeams.map(team => {
                let logoUrl = team.logo
                if (!logoUrl || logoUrl === '') {
                  logoUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(team.name)}&background=3a3d52&color=fff&size=64`
                }
                return {
                  team_key: `espn_${espnLeagueId}_${prevSeason}_${team.id}`,
                  team_id: team.id.toString(),
                  name: team.name,
                  logo_url: logoUrl,
                  wins: team.wins || team.record?.overall?.wins || 0,
                  losses: team.losses || team.record?.overall?.losses || 0,
                  ties: team.ties || team.record?.overall?.ties || 0,
                  points_for: team.pointsFor || team.record?.overall?.pointsFor || 0,
                  points_against: team.pointsAgainst || team.record?.overall?.pointsAgainst || 0,
                  rank: team.playoffSeed || team.rank || 0,
                  is_my_team: prevMyTeamId !== null && team.id === prevMyTeamId,
                  transactionCounter: team.transactionCounter || 0,
                  transactions: team.transactionCounter || 0,
                  totalMoves: team.totalMoves || 0,
                  category_wins: (team as any).categoryWins || 0,
                  category_losses: (team as any).categoryLosses || 0
                }
              })
              
              // Sort by wins
              prevMappedTeams.sort((a, b) => {
                if (b.wins !== a.wins) return b.wins - a.wins
                return (b.points_for || 0) - (a.points_for || 0)
              })
              prevMappedTeams.forEach((t, idx) => { t.rank = idx + 1 })
              
              // Get matchups from previous season (use local array for lookups)
              const prevMatchups = await espnService.getMatchups(sport, espnLeagueId, prevSeason, Math.min(prevCurrentWeek, prevRegularSeasonWeeks))
              
              const prevMappedMatchups = prevMatchups.map(matchup => {
                const homeTeam = prevMappedTeams.find(t => t.team_id === matchup.homeTeamId?.toString())
                const awayTeam = prevMappedTeams.find(t => t.team_id === matchup.awayTeamId?.toString())
                return {
                  matchup_id: matchup.id,
                  week: prevCurrentWeek,
                  team1: homeTeam ? { ...homeTeam, points: matchup.homeScore || 0 } : null,
                  team2: awayTeam ? { ...awayTeam, points: matchup.awayScore || 0 } : null,
                  teams: [homeTeam, awayTeam].filter(Boolean).map((t, i) => ({
                    ...t,
                    points: i === 0 ? (matchup.homeScore || 0) : (matchup.awayScore || 0)
                  })),
                  is_category_league: prevIsCategoryLeague,
                  home_category_wins: matchup.homeCategoryWins,
                  away_category_wins: matchup.awayCategoryWins,
                  home_category_losses: matchup.homeCategoryLosses,
                  away_category_losses: matchup.awayCategoryLosses
                }
              })
              
              // CRITICAL: Set currentLeague BEFORE yahooTeams
              // because yahooTeams triggers watchers that need currentLeague context
              const prevLeagueKey = `espn_${sport}_${espnLeagueId}_${prevSeason}`
              const scoringTypeMap2: Record<string, string> = {
                'H2H_POINTS': 'headpoint', 'H2H_CATEGORY': 'head', 'ROTO': 'roto', 'TOTAL_POINTS': 'point'
              }
              
              yahooLeague.value = [{
                name: prevLeague.name,
                season: prevSeason.toString(),
                scoring_type: scoringTypeMap2[prevLeague.scoringType || 'H2H_POINTS'] || 'head',
                start_week: 1,
                end_week: prevRegularSeasonWeeks,
                current_week: prevCurrentWeek,
                is_finished: 1
              }]
              
              const savedLeague = savedLeagues.value.find(l => l.league_id === leagueKey)
              currentLeague.value = {
                league_id: prevLeagueKey,
                name: savedLeague?.league_name || prevLeague.name || 'ESPN League',
                season: prevSeason.toString(),
                status: 'complete',
                sport: sport,
                settings: {
                  leg: prevCurrentWeek,
                  playoff_week_start: (prevRegularSeasonWeeks || 14) + 1,
                  start_week: 1,
                  end_week: prevRegularSeasonWeeks
                },
                scoring_settings: {},
                roster_positions: [],
                total_rosters: savedLeague?.num_teams || prevTeams.length || 12,
                scoring_type: scoringTypeMap2[prevLeague.scoringType || 'H2H_POINTS'] || 'head'
              } as any
              
              // NOW assign reactive refs (triggers watchers with correct currentLeague)
              yahooTeams.value = prevMappedTeams
              yahooMatchups.value = prevMappedMatchups
              yahooStandings.value = yahooTeams.value
              
              console.log('[ESPN] Loaded previous season:', prevSeason, 'teams:', yahooTeams.value.length)
              isLoading.value = false
              return // Exit early - loaded previous season
            }
          }
        } catch (prevError) {
          console.warn('[ESPN] Failed to load previous season:', prevError)
        }
      }
      
      // Build matchups using local mappedTeams (before triggering reactive watchers)
      const mappedMatchups = espnMatchups.map(matchup => {
        const homeTeam = mappedTeams.find(t => t.team_id === matchup.homeTeamId?.toString())
        const awayTeam = mappedTeams.find(t => t.team_id === matchup.awayTeamId?.toString())
        
        console.log('[ESPN] Mapping matchup:', {
          homeTeamId: matchup.homeTeamId,
          awayTeamId: matchup.awayTeamId,
          homeTeamFound: homeTeam?.name,
          awayTeamFound: awayTeam?.name,
          isCategoryLeague: matchup.isCategoryLeague,
          homeCategoryWins: matchup.homeCategoryWins,
          awayCategoryWins: matchup.awayCategoryWins
        })
        
        // Build teams array with category win data for category leagues
        const team1Data = homeTeam ? { 
          ...homeTeam, 
          points: matchup.homeScore || 0,
          category_wins: isCategoryLeague ? (matchup.homeCategoryWins || 0) : undefined,
          category_losses: isCategoryLeague ? (matchup.homeCategoryLosses || 0) : undefined
        } : null
        
        const team2Data = awayTeam ? { 
          ...awayTeam, 
          points: matchup.awayScore || 0,
          category_wins: isCategoryLeague ? (matchup.awayCategoryWins || 0) : undefined,
          category_losses: isCategoryLeague ? (matchup.awayCategoryLosses || 0) : undefined
        } : null
        
        return {
          matchup_id: matchup.id,
          week: currentWeek,
          team1: team1Data,
          team2: team2Data,
          teams: [team1Data, team2Data].filter(Boolean),
          is_category_league: isCategoryLeague,
          home_category_wins: matchup.homeCategoryWins,
          away_category_wins: matchup.awayCategoryWins,
          home_category_losses: matchup.homeCategoryLosses,
          away_category_losses: matchup.awayCategoryLosses
        }
      })
      
      // Map ESPN league to Yahoo-compatible format
      const scoringTypeMap: Record<string, string> = {
        'H2H_POINTS': 'headpoint',
        'H2H_CATEGORY': 'head',
        'ROTO': 'roto',
        'TOTAL_POINTS': 'point'
      }
      
      // CRITICAL: Set yahooLeague and currentLeague BEFORE yahooTeams
      // because yahooTeams triggers watchers that need currentLeague to be correct
      yahooLeague.value = [{
        name: league.name,
        season: season.toString(),
        scoring_type: scoringTypeMap[league.scoringType || 'H2H_POINTS'] || 'head',
        start_week: 1,
        end_week: league.settings?.regularSeasonMatchupPeriodCount || 25,
        current_week: currentWeek
      }]
      
      const savedLeague = savedLeagues.value.find(l => l.league_id === leagueKey)
      currentLeague.value = {
        league_id: leagueKey,
        name: savedLeague?.league_name || league.name || 'ESPN League',
        season: season.toString(),
        status: league.status?.isActive ? 'in_season' : 'complete',
        sport: sport,
        settings: {
          leg: currentWeek,
          playoff_week_start: league.settings?.playoffMatchupPeriodLength ? 
            (league.settings.regularSeasonMatchupPeriodCount || 14) + 1 : 15,
          start_week: 1,
          end_week: league.settings?.regularSeasonMatchupPeriodCount || 25
        },
        scoring_settings: {},
        roster_positions: [],
        total_rosters: savedLeague?.num_teams || espnTeams.length || 12,
        scoring_type: scoringTypeMap[league.scoringType || 'H2H_POINTS'] || 'head'
      } as any
      
      // NOW assign reactive refs (triggers watchers with correct currentLeague context)
      yahooTeams.value = mappedTeams
      yahooMatchups.value = mappedMatchups
      yahooStandings.value = yahooTeams.value
      
      console.log('[ESPN] League loaded:', {
        league: yahooLeague.value,
        teams: yahooTeams.value.length,
        matchups: yahooMatchups.value.length,
        currentWeek
      })
      
    } catch (e) {
      console.error('Failed to load ESPN league data:', e)
      error.value = e instanceof Error ? e.message : 'Failed to load ESPN league'
    } finally {
      isLoading.value = false
    }
  }

  // Refresh all saved Yahoo leagues to ensure they have the latest season
  async function refreshYahooLeagues(userId: string) {
    try {
      const { yahooService } = await import('@/services/yahoo')
      
      const initialized = await yahooService.initialize(userId)
      if (!initialized) {
        console.warn('Yahoo not connected, skipping league refresh')
        return
      }
      
      // Get saved Yahoo leagues
      const yahooLeagues = savedLeagues.value.filter(l => l.platform === 'yahoo')
      if (yahooLeagues.length === 0) {
        console.log('No saved Yahoo leagues to refresh')
        return
      }
      
      console.log(`Found ${yahooLeagues.length} saved Yahoo leagues to check:`, yahooLeagues.map(l => `${l.league_name} (${l.league_id}, sport: ${l.sport})`))
      
      // Always check both baseball and football
      // We fetch leagues from Yahoo for these sports regardless of what's saved
      const sportsToCheck: Array<'football' | 'baseball' | 'basketball' | 'hockey'> = ['baseball', 'football', 'basketball', 'hockey']
      
      console.log('Will check sports:', sportsToCheck)
      
      // Fetch all current leagues from Yahoo for each sport using Promise.all for speed
      const results = await Promise.allSettled(
        sportsToCheck.map(async sport => {
          console.log(`Fetching ${sport} leagues from Yahoo...`)
          const leagues = await yahooService.getLeagues(sport)
          console.log(`Found ${leagues.length} ${sport} leagues`)
          return { sport, leagues }
        })
      )
      
      const allCurrentLeagues: any[] = []
      for (const result of results) {
        if (result.status === 'fulfilled') {
          allCurrentLeagues.push(...result.value.leagues)
        } else {
          console.warn('Failed to fetch leagues:', result.reason)
        }
      }
      
      console.log(`Total leagues fetched from Yahoo: ${allCurrentLeagues.length}`)
      
      if (allCurrentLeagues.length === 0) {
        console.log('No leagues found from Yahoo API')
        return
      }
      
      // Group by league name to find the latest season for each
      const latestByName = new Map<string, any>()
      for (const league of allCurrentLeagues) {
        const existing = latestByName.get(league.name)
        if (!existing || parseInt(league.season) > parseInt(existing.season)) {
          latestByName.set(league.name, league)
        }
      }
      
      console.log('Latest leagues by name:', Array.from(latestByName.entries()).map(([name, l]) => `${name}: ${l.season} (${l.league_key})`))
      
      // Update saved leagues if needed
      let updatedCount = 0
      for (const savedLeague of savedLeagues.value) {
        if (savedLeague.platform !== 'yahoo') continue
        
        const latest = latestByName.get(savedLeague.league_name)
        if (!latest) {
          console.log(`No matching Yahoo league found for "${savedLeague.league_name}"`)
          continue
        }
        
        const savedSeason = parseInt(savedLeague.season || '0')
        const latestSeason = parseInt(latest.season || '0')
        
        console.log(`Checking "${savedLeague.league_name}": saved=${savedSeason} (${savedLeague.league_id}), latest=${latestSeason} (${latest.league_key})`)
        
        if (latestSeason > savedSeason || savedLeague.league_id !== latest.league_key) {
          console.log(`🔄 Auto-updating "${savedLeague.league_name}" from ${savedSeason} (${savedLeague.league_id}) to ${latestSeason} (${latest.league_key})`)
          
          // Update the saved league
          savedLeague.league_id = latest.league_key
          savedLeague.season = latest.season
          savedLeague.yahoo_league_key = latest.league_key
          savedLeague.num_teams = latest.num_teams
          savedLeague.scoring_type = latest.scoring_type
          updatedCount++
          
          // Update Supabase if we have an ID
          if (supabase && savedLeague.id) {
            try {
              await supabase
                .from('user_leagues')
                .update({
                  league_id: latest.league_key,
                  season: latest.season,
                  yahoo_league_key: latest.league_key,
                  num_teams: latest.num_teams,
                  scoring_type: latest.scoring_type
                })
                .eq('id', savedLeague.id)
            } catch (e) {
              console.error('Failed to update league in Supabase:', e)
            }
          }
        }
      }
      
      // Save any newly discovered leagues not yet in savedLeagues (e.g. basketball/hockey on first mobile load)
      const savedNames = new Set(savedLeagues.value.filter(l => l.platform === 'yahoo').map(l => l.league_name))
      for (const result of results) {
        if (result.status !== 'fulfilled') continue
        const { sport, leagues: sportLeagues } = (result as any).value
        for (const league of sportLeagues) {
          if (!savedNames.has(league.name) && userId) {
            console.log(`[Yahoo Refresh] New league found: "${league.name}" (${sport}) — saving to Supabase`)
            await saveYahooLeague(league, userId, sport)
            savedNames.add(league.name)
          }
        }
      }

      if (updatedCount > 0) {
        console.log(`✅ Updated ${updatedCount} Yahoo league(s) to latest season`)
        saveToLocalStorage()
        
        // If the active league was updated, reload its data
        if (activeLeagueId.value && activePlatform.value === 'yahoo') {
          const activeLeague = savedLeagues.value.find(l => l.league_name === savedLeagues.value.find(sl => sl.league_id === activeLeagueId.value)?.league_name)
          if (activeLeague && activeLeague.league_id !== activeLeagueId.value) {
            console.log('Active league was updated, reloading data...')
            activeLeagueId.value = activeLeague.league_id
            await loadYahooLeagueData(activeLeague.league_id)
          }
        }
      } else {
        console.log('All Yahoo leagues are already up to date')
      }
      
    } catch (e) {
      console.error('Failed to refresh Yahoo leagues:', e)
    }
  }

  // Initialize from localStorage on store creation
  loadFromLocalStorage()

  return {
    // State
    activeLeagueId,
    activePlatform,
    activeSport,
    leagues,
    savedLeagues,
    currentLeague,
    rosters,
    users,
    players,
    isLoading,
    error,
    isDemoMode,
    historicalSeasons,
    historicalRosters,
    historicalUsers,
    historicalMatchups,
    historicalDrafts,
    historicalBrackets,
    currentUserId,
    currentUsername,
    
    // Sleeper aliases for backward compatibility
    leagueRosters: rosters,
    leagueUsers: users,
    leagueUsersArray: users,
    leagueMatchups: computed(() => {
      // For Sleeper, matchups are stored in historicalMatchups by week
      const currentWeekValue = currentWeek.value
      const currentLeagueId = currentLeague.value?.league_id
      if (currentLeagueId && historicalMatchups.value.has(currentLeagueId)) {
        const leagueMatchups = historicalMatchups.value.get(currentLeagueId)
        if (leagueMatchups?.has(currentWeekValue)) {
          return leagueMatchups.get(currentWeekValue) || []
        }
      }
      return []
    }),
    
    // Yahoo state
    yahooLeague,
    yahooTeams,
    yahooStandings,
    yahooMatchups,
    
    // Computed
    currentSeason,
    playoffWeekStart,
    currentWeek,
    hasSavedLeagues,
    allLeagues,
    filteredLeaguesBySport,
    
    // Actions
    loadSavedLeagues,
    saveLeague,
    saveYahooLeague,
    saveEspnLeague,
    removeLeague,
    setPrimaryLeague,
    fetchUserLeagues,
    setActiveLeague,
    setActiveSport,
    loadYahooLeagueData,
    loadEspnLeagueData,
    refreshYahooLeagues,
    getTeamInfo,
    reset,
    enableDemoMode,
    disableDemoMode,
    setCurrentUsername: (username: string) => {
      currentUsername.value = username
      saveToLocalStorage()
    }
  }
})
