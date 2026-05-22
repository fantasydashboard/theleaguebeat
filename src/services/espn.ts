/**
 * ESPN Fantasy API Service
 * 
 * Handles all interactions with ESPN's unofficial Fantasy API (v3).
 * Supports Football, Baseball, Basketball, and Hockey.
 * 
 * IMPORTANT: ESPN does not have an official public API. This service
 * uses the community-documented v3 API endpoints.
 * 
 * Authentication:
 * - Public leagues: No auth needed, just league ID
 * - Private leagues: Requires espn_s2 and SWID cookies from user's browser
 * 
 * All requests go through Supabase Edge Function proxy to avoid CORS.
 */

import { supabase } from '@/lib/supabase'
import type { Sport } from '@/types/supabase'
import { cache, CACHE_TTL, CACHE_KEYS } from './cache'

// ESPN sport codes (different from Yahoo)
const ESPN_SPORT_CODES: Record<Sport, string> = {
  football: 'ffl',
  baseball: 'flb',
  basketball: 'fba',
  hockey: 'fhl'
}

// ESPN sport IDs (used in some API responses)
const ESPN_SPORT_IDS: Record<Sport, number> = {
  football: 1,
  baseball: 2,
  basketball: 3,
  hockey: 4
}

// View parameters for different data requests
const ESPN_VIEWS = {
  // Core views
  SETTINGS: 'mSettings',
  TEAM: 'mTeam',
  ROSTER: 'mRoster',
  MATCHUP: 'mMatchup',
  MATCHUP_SCORE: 'mMatchupScore',
  SCOREBOARD: 'mScoreboard',
  STANDINGS: 'mStandings',
  BOXSCORE: 'mBoxscore',
  NAV: 'mNav',
  
  // Draft views
  DRAFT_DETAIL: 'mDraftDetail',
  
  // Transaction views
  TRANSACTIONS: 'mTransactions2',
  PENDING_TRANSACTIONS: 'mPendingTransactions',
  
  // Player views
  PLAYERS: 'players_wl',
  PLAYER_INFO: 'kona_player_info',
  
  // Scoring views  
  LIVE_SCORING: 'mLiveScoring',
  POSITIONAL_RATINGS: 'mPositionalRatings',
  
  // Navigation/metadata
  STATUS: 'mStatus',
  MODULAR: 'modular'
} as const

// Lineup slot IDs (ESPN uses numeric IDs)
const LINEUP_SLOTS: Record<number, string> = {
  0: 'QB',
  1: 'TQB',   // Team QB
  2: 'RB',
  3: 'RB/WR',
  4: 'WR',
  5: 'WR/TE',
  6: 'TE',
  7: 'OP',    // Offensive Player
  8: 'DT',
  9: 'DE',
  10: 'LB',
  11: 'DL',
  12: 'CB',
  13: 'S',
  14: 'DB',
  15: 'DP',   // Defensive Player
  16: 'D/ST',
  17: 'K',
  18: 'P',
  19: 'HC',   // Head Coach
  20: 'BE',   // Bench
  21: 'IR',
  23: 'FLEX',
  24: 'ER',   // Edge Rusher
  25: 'Rookie' // For dynasty
}

// Baseball lineup slots (for eligibleSlots conversion)
const BASEBALL_LINEUP_SLOTS: Record<number, string> = {
  0: 'C',
  1: '1B',
  2: '2B',
  3: '3B',
  4: 'SS',
  5: 'LF',
  6: 'CF',
  7: 'RF',
  8: 'DH',
  9: 'UTIL',
  10: 'MI',    // Middle Infield (2B/SS)
  11: 'CI',    // Corner Infield (1B/3B)
  12: 'OF',
  13: 'SP',
  14: 'RP',
  15: 'P',
  16: 'BE',    // Bench
  17: 'IL',    // Injured List
  18: 'IL+',   // IL+
  19: 'NA'     // Not Active (minors)
}

// Pro team IDs to abbreviations (NFL)
const PRO_TEAMS: Record<number, string> = {
  0: 'FA',
  1: 'ATL', 2: 'BUF', 3: 'CHI', 4: 'CIN', 5: 'CLE',
  6: 'DAL', 7: 'DEN', 8: 'DET', 9: 'GB', 10: 'TEN',
  11: 'IND', 12: 'KC', 13: 'OAK', 14: 'LAR', 15: 'MIA',
  16: 'MIN', 17: 'NE', 18: 'NO', 19: 'NYG', 20: 'NYJ',
  21: 'PHI', 22: 'ARI', 23: 'PIT', 24: 'LAC', 25: 'SF',
  26: 'SEA', 27: 'TB', 28: 'WAS', 29: 'CAR', 30: 'JAX',
  33: 'BAL', 34: 'HOU'
}

// NHL Pro team IDs to abbreviations (ESPN proTeamId mapping for hockey)
const NHL_TEAMS: Record<number, string> = {
  0: 'FA',
  1: 'ANA', 2: 'ARI', 3: 'BOS', 4: 'BUF', 5: 'CGY',
  6: 'CAR', 7: 'CHI', 8: 'COL', 9: 'CBJ', 10: 'DAL',
  11: 'DET', 12: 'EDM', 13: 'FLA', 14: 'LAK', 15: 'MIN',
  16: 'MTL', 17: 'NSH', 18: 'NJD', 19: 'NYI', 20: 'NYR',
  21: 'OTT', 22: 'PHI', 23: 'PIT', 24: 'STL', 25: 'SJS',
  26: 'TBL', 27: 'TOR', 28: 'VAN', 29: 'WSH', 30: 'WPG',
  31: 'VGK', 32: 'SEA', 33: 'UTA'
}

// NBA Pro team IDs to abbreviations (ESPN proTeamId mapping for basketball)
const NBA_TEAMS: Record<number, string> = {
  0: 'FA',
  1: 'ATL', 2: 'BOS', 3: 'NOP', 4: 'CHI', 5: 'CLE',
  6: 'DAL', 7: 'DEN', 8: 'DET', 9: 'GSW', 10: 'HOU',
  11: 'IND', 12: 'LAC', 13: 'LAL', 14: 'MIA', 15: 'MIL',
  16: 'MIN', 17: 'BKN', 18: 'NYK', 19: 'ORL', 20: 'PHI',
  21: 'PHX', 22: 'POR', 23: 'SAC', 24: 'SAS', 25: 'OKC',
  26: 'UTA', 27: 'WAS', 28: 'TOR', 29: 'MEM', 30: 'CHA'
}

// MLB Pro team IDs to abbreviations
const MLB_TEAMS: Record<number, string> = {
  0: 'FA',
  1: 'BAL', 2: 'BOS', 3: 'LAA', 4: 'CWS', 5: 'CLE',
  6: 'DET', 7: 'KC', 8: 'MIL', 9: 'MIN', 10: 'NYY',
  11: 'OAK', 12: 'SEA', 13: 'TEX', 14: 'TOR', 15: 'ATL',
  16: 'CHC', 17: 'CIN', 18: 'HOU', 19: 'LAD', 20: 'WSH',
  21: 'NYM', 22: 'PHI', 23: 'PIT', 24: 'STL', 25: 'SD',
  26: 'SF', 27: 'COL', 28: 'MIA', 29: 'ARI', 30: 'TB'
}

// ============================================================
// Type Definitions
// ============================================================

export interface EspnCredentials {
  visibleToPublic: boolean
  espn_s2?: string
  swid?: string
}

export interface EspnLeague {
  id: number
  seasonId: number
  scoringPeriodId: number
  segmentId: number
  name: string
  size: number
  isPublic: boolean
  scoringType: 'H2H_POINTS' | 'H2H_CATEGORY' | 'ROTO' | 'TOTAL_POINTS'
  currentMatchupPeriod: number
  status: {
    currentMatchupPeriod: number
    isActive: boolean
    isFinished: boolean
    latestScoringPeriod: number
    finalScoringPeriod: number
    finalMatchupPeriod: number
    firstScoringPeriod: number
  }
  settings: {
    name: string
    playoffMatchupPeriodLength: number
    playoffSeedingRule: string
    playoffTeamCount: number
    regularSeasonMatchupPeriodCount: number
    rosterSettings: any
    scheduleSettings: any
    scoringSettings: any
    tradeSettings: any
  }
}

export interface EspnTeam {
  id: number
  abbrev: string
  name: string
  location: string  // First part of team name
  nickname: string  // Second part of team name
  logo: string
  owners: string[]
  primaryOwner: string
  ownerName?: string  // Display name of primary owner
  points: number
  pointsFor: number
  pointsAgainst: number
  wins: number
  losses: number
  ties: number
  rank: number
  playoffSeed: number
  divisionId: number
  transactionCounter?: number | { acquisitions?: number; drops?: number; trades?: number; moveToIR?: number; moveToActive?: number; misc?: number }  // Transaction details object or count
  totalMoves?: number  // Pre-calculated total transactions (acquisitions + drops + trades)
  categoryWins?: number  // For H2H_CATEGORY leagues - total category wins across all matchups
  categoryLosses?: number  // For H2H_CATEGORY leagues - total category losses across all matchups
  roster?: EspnPlayer[]
  record?: {
    overall: { wins: number; losses: number; ties: number; percentage: number }
    home: { wins: number; losses: number; ties: number }
    away: { wins: number; losses: number; ties: number }
    division: { wins: number; losses: number; ties: number }
  }
  // Raw stat values for category leagues (stat ID -> value)
  valuesByStat?: Record<string, number> | null
  // Calculated roto-style points when ESPN doesn't provide category win/loss data
  rotoPoints?: number
}

export interface EspnPlayer {
  id: number
  playerId: number
  fullName: string
  firstName: string
  lastName: string
  proTeam: string
  proTeamId: number
  position: string
  positionId: number
  lineupSlotId: number
  lineupSlot: string
  injuryStatus: string
  projectedPoints: number
  actualPoints: number
  percentOwned: number
  percentStarted: number
  stats: Record<string, number>
  projectedStats?: Record<string, number>  // Per-stat projections (used by category outlook)
}

export interface EspnMatchup {
  id: number
  matchupPeriodId: number
  homeTeamId: number
  awayTeamId: number
  homeTeam?: EspnTeam
  awayTeam?: EspnTeam
  homeScore: number
  awayScore: number
  // Category league specific fields
  homeCategoryWins?: number
  awayCategoryWins?: number
  homeCategoryLosses?: number
  awayCategoryLosses?: number
  homeCategoryTies?: number
  awayCategoryTies?: number
  // Per-category results (WIN/LOSS/TIE for each stat ID)
  homePerCategoryResults?: Record<string, 'WIN' | 'LOSS' | 'TIE'>
  awayPerCategoryResults?: Record<string, 'WIN' | 'LOSS' | 'TIE'>
  // Raw stat values per category (for matchups page display)
  homeScoreByStat?: Record<string, { result?: string | null; score: number }>
  awayScoreByStat?: Record<string, { result?: string | null; score: number }>
  // Match-level valuesByStat (matchup-period cumulative stats, uses GLOBAL stat IDs)
  homeValuesByStat?: Record<string, number>
  awayValuesByStat?: Record<string, number>
  // Roster data for matchup period (player-level stats for aggregation)
  homeRosterEntries?: any[]
  awayRosterEntries?: any[]
  isCategoryLeague?: boolean
  homeProjectedPoints?: number
  awayProjectedPoints?: number
  winner: 'HOME' | 'AWAY' | 'TIE' | 'UNDECIDED'
  playoffTierType: string
}

export interface EspnDraftPick {
  id: number
  roundId: number
  roundPickNumber: number
  overallPickNumber: number
  playerId: number
  playerName: string
  position?: string
  positionId?: number
  eligiblePositions?: string[]  // Array of positions this player can fill
  proTeam?: string
  teamId: number
  keeper: boolean
  bidAmount?: number
}

export interface EspnMember {
  id: string
  displayName: string
  firstName: string
  lastName: string
  isLeagueManager: boolean
}

// ============================================================
// ESPN Fantasy Service Class
// ============================================================

export class EspnFantasyService {
  private userId: string | null = null
  private supabaseUrl: string
  private credentials: EspnCredentials | null = null

  constructor() {
    this.supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
  }

  /**
   * Initialize the service with user ID and load stored credentials
   */
  async initialize(userId: string): Promise<boolean> {
    this.userId = userId
    console.log('[ESPN] Service initialized for user:', userId)
    // Credentials are loaded from localStorage via platformsStore.getEspnCredentials()
    // No need to query Supabase here (which can hang)
    return true
  }

  /**
   * Set credentials for private league access
   */
  setCredentials(espn_s2: string, swid: string): void {
    this.credentials = {
      visibleToPublic: false,
      espn_s2,
      swid
    }
  }

  /**
   * Clear credentials
   */
  clearCredentials(): void {
    this.credentials = null
  }

  /**
   * Check if we have credentials for private leagues
   */
  hasCredentials(): boolean {
    return !!(this.credentials?.espn_s2 && this.credentials?.swid)
  }

  // ============================================================
  // User Leagues — fetches all leagues for authenticated user
  // ============================================================

  /**
   * Get all leagues for the currently authenticated user across all sports.
   * Uses the existing Supabase proxy so espn_s2/SWID are sent server-side.
   * Call setCredentials() before calling this.
   */
  async getUserLeagues(): Promise<Array<{
    id: string
    name: string
    size: number
    sport: import('@/types/supabase').Sport
    season: number
    scoringType: string
  }>> {
    if (!this.credentials?.espn_s2 || !this.credentials?.swid) {
      throw new Error('ESPN credentials required to fetch user leagues')
    }

    const SPORT_CONFIGS: Array<{ gameId: string; sport: import('@/types/supabase').Sport }> = [
      { gameId: 'ffl', sport: 'football'   },
      { gameId: 'flb', sport: 'baseball'   },
      { gameId: 'fba', sport: 'basketball' },
      { gameId: 'fhl', sport: 'hockey'     },
    ]

    const getSeasonYear = (sport: string) => {
      const now = new Date()
      const y = now.getFullYear()
      const m = now.getMonth()
      const starts: Record<string, number> = {
        football: 8, baseball: 2, basketball: 9, hockey: 9
      }
      return m < (starts[sport] ?? 8) ? y - 1 : y
    }

    // Get access token for proxy auth
    let accessToken: string | null = null
    try {
      const keys = Object.keys(localStorage)
      const authKey = keys.find(k => k.startsWith('sb-') && k.endsWith('-auth-token'))
      if (authKey) {
        const parsed = JSON.parse(localStorage.getItem(authKey) || '{}')
        accessToken = parsed?.access_token || null
      }
    } catch {}

    const proxyUrl = `${this.supabaseUrl}/functions/v1/espn-api`
    const allLeagues: Array<any> = []

    const results = await Promise.allSettled(
      SPORT_CONFIGS.map(async ({ gameId, sport }) => {
        const season = getSeasonYear(sport)
        const endpoint = `/apis/v3/games/${gameId}/seasons/${season}?view=mUserLeagues`

        console.log(`[ESPN getUserLeagues] Fetching ${sport} ${season} via proxy...`)

        const resp = await fetch(proxyUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            endpoint,
            espn_s2: this.credentials!.espn_s2,
            swid: this.credentials!.swid,
            fantasySource: 'kona',
          })
        })

        if (!resp.ok) {
          console.warn(`[ESPN getUserLeagues] ${sport} proxy error:`, resp.status)
          return []
        }

        const data = await resp.json()
        console.log(`[ESPN getUserLeagues] ${sport} response keys:`, Object.keys(data))

        // ESPN returns user leagues under 'preferences' when authenticated
        const prefs: any[] = data?.preferences || []
        console.log(`[ESPN getUserLeagues] ${sport}: ${prefs.length} preferences`)

        return prefs
          .filter((p: any) => p?.id && p?.metaData?.entry)
          .map((p: any) => {
            const entry = p.metaData.entry
            return {
              id: String(p.id),
              name: entry.name || entry.abbrev || `League ${p.id}`,
              size: entry.size || entry.teams || 0,
              sport,
              season,
              scoringType: entry.scoringSettings?.scoringType
                || entry.settings?.scoringSettings?.scoringType
                || 'H2H_POINTS',
            }
          })
      })
    )

    for (const r of results) {
      if (r.status === 'fulfilled') allLeagues.push(...r.value)
    }

    console.log(`[ESPN getUserLeagues] Total:`, allLeagues.length)
    return allLeagues
  }

  // ============================================================
  // Core API Request Method
  // ============================================================

  /**
   * Make a request to ESPN Fantasy API via proxy
   * 
   * @param sport - Sport type
   * @param leagueId - ESPN league ID
   * @param season - Season year
   * @param views - Array of view parameters to request
   * @param scoringPeriod - Optional scoring period (week)
   * @param historical - If true, use leagueHistory endpoint (for pre-2018)
   * @param fantasyFilter - Optional x-fantasy-filter JSON object for filtering
   */
  private async apiRequest(
    sport: Sport,
    leagueId: string | number,
    season: number,
    views: string[] = [],
    scoringPeriod?: number,
    historical: boolean = false,
    fantasyFilter?: object
  ): Promise<any> {
    // Get access token - try multiple methods
    let accessToken: string | null = null
    
    // Method 1: Try localStorage (fast)
    try {
      const keys = Object.keys(localStorage)
      const authKey = keys.find(k => k.startsWith('sb-') && k.endsWith('-auth-token'))
      
      if (authKey) {
        const stored = localStorage.getItem(authKey)
        if (stored) {
          const parsed = JSON.parse(stored)
          accessToken = parsed?.access_token
          if (accessToken) {
            console.log('[ESPN] Got token from localStorage')
          }
        }
      }
    } catch (e) {
      console.warn('[ESPN] localStorage access failed:', e)
    }
    
    // Method 2: Try Supabase client (slower but more reliable)
    if (!accessToken) {
      try {
        const { supabase } = await import('@/lib/supabase')
        if (supabase) {
          const { data: { session } } = await supabase.auth.getSession()
          accessToken = session?.access_token || null
          if (accessToken) {
            console.log('[ESPN] Got token from Supabase client')
          }
        }
      } catch (e) {
        console.warn('[ESPN] Supabase getSession failed:', e)
      }
    }
    
    if (!accessToken) {
      console.error('[ESPN] No access token found')
      throw new Error('Not authenticated - please sign in')
    }

    const sportCode = ESPN_SPORT_CODES[sport]
    
    // Build endpoint URL
    let endpoint: string
    if (historical || season < 2018) {
      // Historical endpoint for older seasons
      endpoint = `/games/${sportCode}/leagueHistory/${leagueId}?seasonId=${season}`
    } else {
      // Current endpoint for 2018+
      endpoint = `/games/${sportCode}/seasons/${season}/segments/0/leagues/${leagueId}`
    }

    // Add view parameters
    if (views.length > 0) {
      const viewParams = views.map(v => `view=${v}`).join('&')
      endpoint += endpoint.includes('?') ? `&${viewParams}` : `?${viewParams}`
    }

    // Add scoring period if specified
    if (scoringPeriod !== undefined) {
      endpoint += endpoint.includes('?') ? `&scoringPeriodId=${scoringPeriod}` : `?scoringPeriodId=${scoringPeriod}`
    }
    
    // Add platformVersion - ESPN's website includes this and it may be required for scoreByStat
    endpoint += endpoint.includes('?') ? '&platformVersion=0d7e8ddda4e6030cd7f20ef03de89ed9b1c71848' : '?platformVersion=0d7e8ddda4e6030cd7f20ef03de89ed9b1c71848'

    const proxyUrl = `${this.supabaseUrl}/functions/v1/espn-api`
    
    const requestBody: any = { endpoint }
    
    // Include credentials for private leagues
    if (this.credentials?.espn_s2 && this.credentials?.swid) {
      requestBody.espn_s2 = this.credentials.espn_s2
      requestBody.swid = this.credentials.swid
    }
    
    // Include x-fantasy-filter if provided (for filtering matchups by week, etc.)
    if (fantasyFilter) {
      requestBody.fantasyFilter = JSON.stringify(fantasyFilter)
      console.log('[ESPN] Using x-fantasy-filter:', requestBody.fantasyFilter)
    }
    
    // CRITICAL: These headers are required for ESPN to return scoreByStat data
    // Without them, category leagues get scoreByStat: null
    requestBody.fantasyPlatform = 'espn-fantasy-web'
    requestBody.fantasySource = 'kona'

    // Add timeout to prevent hanging
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15000) // 15 second timeout

    try {
      const response = await fetch(proxyUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        console.error('ESPN API proxy error:', response.status, errorData)
        console.error('ESPN API proxy request was:', { endpoint: endpoint.substring(0, 100), sport: endpoint.match(/games\/(\w+)/)?.[1] })
        
        // Provide helpful error messages
        if (response.status === 401) {
          throw new Error('ESPN proxy auth failed (401). Session may have expired - try signing out and back in.')
        } else if (response.status === 404) {
          throw new Error(`League not found (404) for endpoint: ${endpoint.substring(0, 80)}`)
        } else if (response.status === 403) {
          throw new Error('This is a private league (403). Please provide ESPN cookies (espn_s2 and SWID).')
        }
        
        throw new Error(errorData.error || `ESPN API error: ${response.status} - ${JSON.stringify(errorData).substring(0, 200)}`)
      }

      return response.json()
    } catch (error: any) {
      clearTimeout(timeoutId)
      if (error.name === 'AbortError') {
        throw new Error('Request timed out. ESPN API may be slow or unavailable.')
      }
      throw error
    }
  }

  // ============================================================
  // League Methods
  // ============================================================

  /**
   * Fetch basic league information
   */
  async getLeague(sport: Sport, leagueId: string | number, season: number): Promise<EspnLeague | null> {
    const cacheKey = `espn_league_${sport}_${leagueId}_${season}`
    const cached = cache.get<EspnLeague>('espn_league', cacheKey)
    if (cached) {
      console.log(`[Cache HIT] ESPN league ${leagueId}`)
      return cached
    }

    try {
      const data = await this.apiRequest(sport, leagueId, season, [ESPN_VIEWS.SETTINGS, ESPN_VIEWS.STATUS])
      
      // Log the response structure for debugging
      console.log(`[ESPN getLeague] Response keys for ${sport} ${leagueId} ${season}:`, Object.keys(data || {}))
      if (data?.settings) {
        console.log(`[ESPN getLeague] Settings keys:`, Object.keys(data.settings))
        console.log(`[ESPN getLeague] Settings name:`, data.settings?.name)
      }
      
      // Validate that ESPN returned actual league data
      // If the sport/league combo is wrong, ESPN returns minimal data without settings.name or teams
      if (!data.settings?.name && (!data.teams || data.teams.length === 0)) {
        console.log(`[ESPN getLeague] Invalid response for ${sport} ${leagueId} ${season} - no name and no teams. Full response keys: ${JSON.stringify(Object.keys(data || {}))}`)
        return null
      }
      
      const league = this.parseLeague(data, sport)
      
      // Cache for metadata duration
      cache.set('espn_league', league, CACHE_TTL.METADATA, cacheKey)
      
      return league
    } catch (error) {
      console.error('Error fetching ESPN league:', error)
      throw error
    }
  }

  /**
   * Validate a league ID (check if accessible)
   */
  async validateLeague(sport: Sport, leagueId: string | number, season: number): Promise<{
    valid: boolean
    isPrivate: boolean
    league?: EspnLeague
    error?: string
  }> {
    try {
      const league = await this.getLeague(sport, leagueId, season)
      return {
        valid: true,
        isPrivate: !league?.isPublic,
        league: league || undefined
      }
    } catch (error: any) {
      const message = error.message || 'Unknown error'
      
      if (message.includes('private league') || message.includes('403')) {
        return {
          valid: true,
          isPrivate: true,
          error: 'This league is private. Please provide ESPN cookies.'
        }
      }
      
      return {
        valid: false,
        isPrivate: false,
        error: message
      }
    }
  }

  // ============================================================
  // Team Methods
  // ============================================================

  /**
   * Get all teams in a league
   */
  async getTeams(sport: Sport, leagueId: string | number, season: number): Promise<EspnTeam[]> {
    const cacheKey = `espn_teams_${sport}_${leagueId}_${season}`
    const cached = cache.get<EspnTeam[]>('espn_teams', cacheKey)
    if (cached) {
      console.log(`[Cache HIT] ESPN teams for ${leagueId}`)
      return cached
    }

    try {
      const data = await this.apiRequest(sport, leagueId, season, [ESPN_VIEWS.TEAM, ESPN_VIEWS.STANDINGS])
      
      // Debug: Log API response keys to find stat data
      console.log('[ESPN getTeams] API response top-level keys:', Object.keys(data))
      
      const teams = this.parseTeams(data)
      
      cache.set('espn_teams', teams, CACHE_TTL.STANDINGS, cacheKey)
      
      return teams
    } catch (error) {
      console.error('Error fetching ESPN teams:', error)
      throw error
    }
  }

  /**
   * Calculate roto-style standings from team stats when ESPN doesn't provide category win/loss data.
   * This is a fallback for category leagues where scoreByStat returns null.
   * 
   * For each stat category, teams are ranked and awarded points based on position.
   * In a 10-team league: 1st place gets 10 points, 2nd gets 9, etc.
   */
  calculateRotoStandings(teams: EspnTeam[], sport: Sport): EspnTeam[] {
    // Filter teams that have valuesByStat data
    const teamsWithStats = teams.filter(t => t.valuesByStat && Object.keys(t.valuesByStat).length > 0)
    
    if (teamsWithStats.length === 0) {
      console.log('[ESPN calculateRotoStandings] No teams with valuesByStat data')
      return teams
    }
    
    const numTeams = teamsWithStats.length
    console.log(`[ESPN calculateRotoStandings] Calculating for ${numTeams} teams`)
    
    // Get all stat categories from the first team
    const statIds = Object.keys(teamsWithStats[0].valuesByStat!)
    console.log(`[ESPN calculateRotoStandings] Stat categories:`, statIds)
    
    // Stats where LOWER is better (turnovers)
    // ESPN stat ID 11 = turnovers for basketball
    // ESPN stat ID 17 = goals against for hockey
    const lowerIsBetter: Record<Sport, string[]> = {
      football: [],
      basketball: ['11'], // Turnovers
      baseball: ['26', '27'], // ERA, WHIP
      hockey: ['17'] // Goals Against
    }
    
    const reversedStats = lowerIsBetter[sport] || []
    
    // Initialize roto points for each team
    const rotoPoints: Record<number, number> = {}
    teamsWithStats.forEach(t => { rotoPoints[t.id] = 0 })
    
    // For each stat category, rank teams and award points
    for (const statId of statIds) {
      // Get all teams' values for this stat
      const teamValues = teamsWithStats.map(t => ({
        teamId: t.id,
        value: t.valuesByStat![statId] ?? 0
      }))
      
      // Sort by value (descending for most stats, ascending for "lower is better" stats)
      const isReversed = reversedStats.includes(statId)
      teamValues.sort((a, b) => isReversed ? a.value - b.value : b.value - a.value)
      
      // Award points based on rank (1st place = numTeams points, last = 1 point)
      teamValues.forEach((tv, index) => {
        const points = numTeams - index
        rotoPoints[tv.teamId] += points
      })
    }
    
    console.log('[ESPN calculateRotoStandings] Roto points:', rotoPoints)
    
    // Return teams with rotoPoints populated
    return teams.map(t => ({
      ...t,
      rotoPoints: rotoPoints[t.id] || 0
    }))
  }

  /**
   * Get teams for a historical season - tries both regular and leagueHistory endpoints
   */
  async getHistoricalTeams(sport: Sport, leagueId: string | number, season: number): Promise<EspnTeam[]> {
    const cacheKey = `espn_hist_teams_${sport}_${leagueId}_${season}`
    const cached = cache.get<EspnTeam[]>('espn_teams', cacheKey)
    if (cached) {
      console.log(`[Cache HIT] ESPN historical teams for ${leagueId} ${season}`)
      return cached
    }

    // Try regular endpoint first
    try {
      console.log(`[ESPN] Trying regular endpoint for ${season}...`)
      const data = await this.apiRequest(sport, leagueId, season, [ESPN_VIEWS.TEAM, ESPN_VIEWS.STANDINGS])
      
      if (data && data.teams && data.teams.length > 0) {
        const teams = this.parseTeams(data)
        cache.set('espn_teams', teams, CACHE_TTL.STANDINGS, cacheKey)
        console.log(`[ESPN] Regular endpoint worked for ${season}`)
        return teams
      }
    } catch (error: any) {
      console.log(`[ESPN] Regular endpoint failed for ${season}:`, error?.message)
    }

    // Try leagueHistory endpoint
    try {
      console.log(`[ESPN] Trying leagueHistory endpoint for ${season}...`)
      const data = await this.apiRequest(sport, leagueId, season, [ESPN_VIEWS.TEAM, ESPN_VIEWS.STANDINGS], undefined, true)
      
      if (data && data.teams && data.teams.length > 0) {
        const teams = this.parseTeams(data)
        cache.set('espn_teams', teams, CACHE_TTL.STANDINGS, cacheKey)
        console.log(`[ESPN] leagueHistory endpoint worked for ${season}`)
        return teams
      }
      
      // leagueHistory returns array format
      if (Array.isArray(data) && data.length > 0 && data[0].teams) {
        const teams = this.parseTeams(data[0])
        cache.set('espn_teams', teams, CACHE_TTL.STANDINGS, cacheKey)
        console.log(`[ESPN] leagueHistory endpoint (array) worked for ${season}`)
        return teams
      }
    } catch (error: any) {
      console.log(`[ESPN] leagueHistory endpoint failed for ${season}:`, error?.message)
    }

    console.log(`[ESPN] No data available for ${season}`)
    return []
  }

  /**
   * Get teams with full rosters
   */
  async getTeamsWithRosters(sport: Sport, leagueId: string | number, season: number, week?: number): Promise<EspnTeam[]> {
    try {
      const views = [ESPN_VIEWS.TEAM, ESPN_VIEWS.ROSTER]
      const data = await this.apiRequest(sport, leagueId, season, views, week)

      return this.parseTeamsWithRosters(data, sport)
    } catch (error) {
      console.error('Error fetching ESPN teams with rosters:', error)
      throw error
    }
  }

  /**
   * Get teams with rosters that include per-stat PROJECTIONS for each player.
   * Used by the category Power Rankings "Outlook" factor.
   * Adds a kona_player_info filter to ensure projection split (statSourceId=1) is in the response.
   */
  async getTeamsWithProjectedStats(
    sport: Sport,
    leagueId: string | number,
    season: number
  ): Promise<EspnTeam[]> {
    const cacheKey = `espn_teams_proj_${sport}_${leagueId}_${season}`
    const cached = cache.get<EspnTeam[]>('espn_teams_proj', cacheKey)
    if (cached && Array.isArray(cached) && cached.length > 0) {
      console.log('[ESPN getTeamsWithProjectedStats] Cache HIT')
      return cached
    }

    try {
      // Use TEAM + ROSTER + PLAYER_INFO views together with a stat filter that
      // forces ESPN to return both actual (sourceId=0) and projected (sourceId=1)
      // season-total splits (splitTypeId=0) for every rostered player.
      const views = [ESPN_VIEWS.TEAM, ESPN_VIEWS.ROSTER, ESPN_VIEWS.PLAYER_INFO]
      const filterObj = {
        players: {
          filterStatsForCurrentSeasonOnly: { value: true },
          filterStatsForSplitTypeIds: { value: [0] },        // 0 = full season
          filterStatsForSourceIds: { value: [0, 1] },         // 0 = actual, 1 = projected
          filterStatsForSeasonId: { value: season }
        }
      }

      const data = await this.apiRequestWithFilter(sport, leagueId, season, views, filterObj)
      const teams = this.parseTeamsWithRosters(data, sport)

      if (teams.length > 0) {
        cache.set('espn_teams_proj', teams, CACHE_TTL.STANDINGS, cacheKey)
      }
      console.log(`[ESPN getTeamsWithProjectedStats] Loaded ${teams.length} teams with projected stats`)
      return teams
    } catch (error) {
      console.error('[ESPN getTeamsWithProjectedStats] Error:', error)
      // Fallback: return regular rosters so caller can still attempt — projectedStats will be empty
      try {
        return await this.getTeamsWithRosters(sport, leagueId, season)
      } catch {
        return []
      }
    }
  }

  /**
   * Get the current user's team in a league
   */
  async getMyTeam(sport: Sport, leagueId: string | number, season: number): Promise<EspnTeam | null> {
    console.log(`[ESPN getMyTeam] Starting for sport=${sport}, leagueId=${leagueId}, season=${season}`)
    
    if (!this.credentials?.swid) {
      console.log('[ESPN getMyTeam] No SWID available to identify user team')
      return null
    }

    // Normalize SWID - remove braces if present for comparison
    const rawSwid = this.credentials.swid
    const normalizedSwid = rawSwid.replace(/^\{|\}$/g, '') // Remove leading { and trailing }
    const swidWithBraces = `{${normalizedSwid}}`
    
    console.log('[ESPN getMyTeam] Credential SWID:', rawSwid)
    console.log('[ESPN getMyTeam] Normalized SWID:', normalizedSwid)
    console.log('[ESPN getMyTeam] SWID with braces:', swidWithBraces)

    try {
      const teams = await this.getTeams(sport, leagueId, season)
      console.log(`[ESPN getMyTeam] Loaded ${teams.length} teams`)
      
      // Log owner format from first team for debugging
      if (teams.length > 0 && teams[0].owners?.length > 0) {
        console.log('[ESPN getMyTeam] Sample owner IDs from first team:', teams[0].owners)
      }
      
      // Try multiple matching strategies
      const myTeam = teams.find(team => {
        if (!team.owners || team.owners.length === 0) return false
        
        return team.owners.some(owner => {
          // Normalize owner ID too
          const normalizedOwner = owner.replace(/^\{|\}$/g, '')
          
          const match = owner === swidWithBraces || 
                        owner === normalizedSwid ||
                        normalizedOwner === normalizedSwid
          
          if (match) {
            console.log(`[ESPN getMyTeam] MATCH FOUND! Owner: ${owner}, Team: ${team.name}`)
          }
          return match
        })
      })
      
      if (myTeam) {
        console.log(`[ESPN getMyTeam] Found my team: ${myTeam.name} (ID: ${myTeam.id})`)
      } else {
        console.log('[ESPN getMyTeam] No matching team found')
        // Log all teams and their owners for debugging
        console.log('[ESPN getMyTeam] All teams and owners:')
        teams.forEach(t => {
          console.log(`  - ${t.name}: owners=${JSON.stringify(t.owners)}`)
        })
      }
      
      return myTeam || null
    } catch (error) {
      console.error('[ESPN getMyTeam] Error finding user team:', error)
      return null
    }
  }

  // ============================================================
  // Matchup Methods
  // ============================================================

  /**
   * Get matchups for a specific week
   * @param forceRefresh - If true, bypass cache and fetch fresh data
   */
  async getMatchups(sport: Sport, leagueId: string | number, season: number, week: number, forceRefresh: boolean = false): Promise<EspnMatchup[]> {
    const cacheKey = `espn_matchups_v2_${sport}_${leagueId}_${season}_${week}`
    
    // Get league scoring type first to check if it's a category league
    const league = await this.getLeague(sport, leagueId, season)
    const scoringType = league?.scoringType
    const isCategoryLeague = scoringType === 'H2H_CATEGORY'
    
    if (!forceRefresh) {
      const cached = cache.get<EspnMatchup[]>('espn_matchups', cacheKey)
      if (cached && cached.length > 0) {
        // For category leagues, check if cached data has per-category results with actual data
        if (isCategoryLeague) {
          const firstMatchup = cached[0]
          const hasNewFormat = firstMatchup.homePerCategoryResults && 
            Object.keys(firstMatchup.homePerCategoryResults).length > 0
          if (!hasNewFormat) {
            console.log(`[Cache STALE] ESPN matchups for ${leagueId} week ${week} - old format without per-category data, refreshing`)
            // Don't return - fall through to fetch fresh data
          } else {
            console.log(`[Cache HIT] ESPN matchups for ${leagueId} week ${week} (with per-category data)`)
            return cached
          }
        } else {
          console.log(`[Cache HIT] ESPN matchups for ${leagueId} week ${week}`)
          return cached
        }
      }
    }

    try {
      console.log(`[ESPN getMatchups] League scoring type: ${scoringType}`)
      
      // Determine current week from league status
      const currentWeek = league?.status?.currentMatchupPeriod || 1
      const isSeasonActive = league?.status?.isActive ?? true
      // For completed seasons, never use filterCurrentMatchupPeriod (it may point to next season)
      const isCurrentWeek = isSeasonActive && week === currentWeek
      
      // ESPN website uses different filter formats:
      // - Current week: filterCurrentMatchupPeriod: true
      // - Historical weeks: filterMatchupPeriodIds: [week]
      // The current week filter is more reliable for getting scoreByStat data
      let fantasyFilter: any
      if (isCurrentWeek) {
        fantasyFilter = {
          schedule: {
            filterCurrentMatchupPeriod: { value: true }
          }
        }
        console.log(`[ESPN getMatchups] Using filterCurrentMatchupPeriod for current week ${week}`)
      } else {
        fantasyFilter = {
          schedule: {
            filterMatchupPeriodIds: { value: [week] }
          }
        }
        console.log(`[ESPN getMatchups] Using filterMatchupPeriodIds for historical week ${week}`)
      }
      
      // Request all views ESPN website uses for category stats
      // Include mMatchup and mBoxscore which may contain per-stat data when mMatchupScore doesn't
      const data = await this.apiRequest(
        sport, 
        leagueId, 
        season, 
        [ESPN_VIEWS.MATCHUP, ESPN_VIEWS.MATCHUP_SCORE, ESPN_VIEWS.SCOREBOARD, ESPN_VIEWS.BOXSCORE, ESPN_VIEWS.TEAM, ESPN_VIEWS.MODULAR, ESPN_VIEWS.SETTINGS],
        week,
        false, // not historical
        fantasyFilter // pass the filter!
      )
      
      // Pass scoring type to parseMatchups for category league handling
      const matchups = this.parseMatchups(data, week, scoringType, sport)
      
      // Determine cache TTL based on week status
      // For completed seasons, all weeks are completed
      const isCompletedWeek = !isSeasonActive || week < currentWeek
      const ttl = isCompletedWeek ? CACHE_TTL.COMPLETED : CACHE_TTL.CURRENT
      
      cache.set('espn_matchups', matchups, ttl, cacheKey)
      
      return matchups
    } catch (error) {
      console.error('Error fetching ESPN matchups:', error)
      throw error
    }
  }

  /**
   * Get matchups for a historical season - tries both regular and leagueHistory endpoints
   */
  async getHistoricalMatchups(sport: Sport, leagueId: string | number, season: number, week: number): Promise<EspnMatchup[]> {
    const cacheKey = `espn_hist_matchups_${sport}_${leagueId}_${season}_${week}`
    const cached = cache.get<EspnMatchup[]>('espn_matchups', cacheKey)
    if (cached) {
      return cached
    }

    // Build x-fantasy-filter for category leagues
    const fantasyFilter = {
      schedule: {
        filterMatchupPeriodIds: { value: [week] }
      }
    }

    // Try regular endpoint first
    try {
      const data = await this.apiRequest(
        sport, 
        leagueId, 
        season, 
        [ESPN_VIEWS.MATCHUP_SCORE, ESPN_VIEWS.SCOREBOARD],
        week,
        false, // not historical
        fantasyFilter
      )
      
      const matchups = this.parseMatchups(data, week, undefined, sport)
      if (matchups.length > 0) {
        cache.set('espn_matchups', matchups, CACHE_TTL.COMPLETED, cacheKey)
        return matchups
      }
    } catch (error: any) {
      // Silent fail, try historical endpoint
    }

    // Try leagueHistory endpoint
    try {
      const data = await this.apiRequest(
        sport, 
        leagueId, 
        season, 
        [ESPN_VIEWS.MATCHUP_SCORE, ESPN_VIEWS.SCOREBOARD],
        week,
        true, // historical flag
        fantasyFilter
      )
      
      // leagueHistory returns array format
      const scheduleData = Array.isArray(data) ? data[0] : data
      const matchups = this.parseMatchups(scheduleData, week, undefined, sport)
      
      if (matchups.length > 0) {
        cache.set('espn_matchups', matchups, CACHE_TTL.COMPLETED, cacheKey)
        return matchups
      }
    } catch (error: any) {
      // Silent fail
    }

    return []
  }

  /**
   * Get all matchups for the season
   */
  async getAllMatchups(sport: Sport, leagueId: string | number, season: number): Promise<Map<number, EspnMatchup[]>> {
    const league = await this.getLeague(sport, leagueId, season)
    if (!league) throw new Error('Could not fetch league info')

    const totalWeeks = league.settings.regularSeasonMatchupPeriodCount + 
                       (league.settings.playoffTeamCount > 0 ? 3 : 0)
    
    const allMatchups = new Map<number, EspnMatchup[]>()
    
    for (let week = 1; week <= totalWeeks; week++) {
      try {
        const weekMatchups = await this.getMatchups(sport, leagueId, season, week)
        allMatchups.set(week, weekMatchups)
      } catch (error) {
        console.warn(`Could not fetch matchups for week ${week}`)
        break
      }
    }
    
    return allMatchups
  }

  /**
   * Get raw schedule data with winner field and cumulativeScore
   * This is better for historical matchup analysis than getAllMatchups
   * because it returns the raw ESPN data with winner determination
   */
  async getRawSchedule(sport: Sport, leagueId: string | number, season: number): Promise<any[]> {
    try {
      const data = await this.apiRequest(sport, leagueId, season, [ESPN_VIEWS.MATCHUP, ESPN_VIEWS.MATCHUP_SCORE])
      return data.schedule || []
    } catch (error) {
      console.error('[ESPN getRawSchedule] Error:', error)
      return []
    }
  }

  // ============================================================
  // Standings Methods
  // ============================================================

  /**
   * Get current standings
   */
  // VERSION: 2026-01-30-fix-basketball-category-v2
  async getStandings(sport: Sport, leagueId: string | number, season: number): Promise<EspnTeam[]> {
    console.log('[ESPN getStandings] Called for sport:', sport, 'league:', leagueId, 'season:', season)
    console.log('[ESPN getStandings] VERSION CHECK - If you see this, new code is deployed!')
    
    const teams = await this.getTeams(sport, leagueId, season)
    const league = await this.getLeague(sport, leagueId, season)
    
    console.log('[ESPN getStandings] League scoringType:', league?.scoringType)
    console.log('[ESPN getStandings] Teams records:', teams.map(t => ({ name: t.name, wins: t.wins, losses: t.losses })))
    
    // Check if this is a category league with all zero records
    const isCategoryLeague = league?.scoringType === 'H2H_CATEGORY'
    const allZeroRecords = teams.every(t => t.wins === 0 && t.losses === 0)
    
    console.log('[ESPN getStandings] isCategoryLeague:', isCategoryLeague, 'allZeroRecords:', allZeroRecords)
    
    // For category leagues with zero records, try to calculate from matchup history
    if (isCategoryLeague && allZeroRecords && league) {
      console.log('[ESPN getStandings] Category league with zero records - calculating from matchup history')
      const calculatedStandings = await this.calculateStandingsFromMatchupHistory(sport, leagueId, season, league, teams)
      if (calculatedStandings) {
        return calculatedStandings
      }
    }
    
    // Sort by rank or calculate from record
    return teams.sort((a, b) => {
      // First by wins
      if (b.wins !== a.wins) return b.wins - a.wins
      // Then by points for
      return b.pointsFor - a.pointsFor
    })
  }

  /**
   * Calculate standings from matchup history for category leagues
   * This is used when ESPN returns all zeros in team records
   */
  private async calculateStandingsFromMatchupHistory(
    sport: Sport, 
    leagueId: string | number, 
    season: number,
    league: EspnLeague,
    teams: EspnTeam[]
  ): Promise<EspnTeam[] | null> {
    try {
      console.log('[ESPN calculateStandingsFromMatchupHistory] Starting calculation...')
      
      // Track wins/losses for each team
      const teamStats = new Map<number, { wins: number; losses: number; ties: number; categoryWins: number; categoryLosses: number }>()
      teams.forEach(t => {
        teamStats.set(t.id, { wins: 0, losses: 0, ties: 0, categoryWins: 0, categoryLosses: 0 })
      })
      
      // Current week to know which matchups are completed
      const currentWeek = league.status?.currentMatchupPeriod || 1
      const regularSeasonWeeks = league.settings?.regularSeasonMatchupPeriodCount || 25
      const isSeasonActive = league.status?.isActive ?? true
      // For completed seasons, all regular season weeks are completed
      const completedWeeks = !isSeasonActive ? regularSeasonWeeks : Math.min(currentWeek - 1, regularSeasonWeeks)
      
      console.log('[ESPN calculateStandingsFromMatchupHistory] currentWeek:', currentWeek, 'completedWeeks:', completedWeeks)
      
      if (completedWeeks < 1) {
        console.log('[ESPN calculateStandingsFromMatchupHistory] No completed weeks yet')
        return null
      }
      
      // Fetch each week's matchups using getMatchups (which includes SCOREBOARD/BOXSCORE views)
      // This is the same approach Power Rankings uses
      let totalMatchupsProcessed = 0
      
      for (let week = 1; week <= completedWeeks; week++) {
        try {
          // Force refresh to ensure we get per-category data
          const matchups = await this.getMatchups(sport, leagueId, season, week, true)

          // Only count a week when EVERY non-bye matchup has an officially decided winner.
          // ESPN can return live/preliminary winners for in-progress matchups, so
          // "not all UNDECIDED" is too loose — we need all to be decided.
          const nonByeMatchups = matchups.filter(m => m.awayTeamId)
          const allDecided = nonByeMatchups.length > 0 &&
            nonByeMatchups.every(m => m.winner && m.winner !== 'UNDECIDED')
          if (!allDecided) {
            console.log(`[ESPN calculateStandings] Week ${week}: not all matchups officially decided — skipping`)
            continue
          }
          
          for (const matchup of matchups) {
            if (!matchup.awayTeamId) continue // Skip bye weeks
            
            const homeStats = teamStats.get(matchup.homeTeamId)
            const awayStats = teamStats.get(matchup.awayTeamId)
            
            if (!homeStats || !awayStats) continue
            
            totalMatchupsProcessed++
            
            // Method 1: Use per-category results (best - from SCOREBOARD/BOXSCORE views)
            if (matchup.homePerCategoryResults && Object.keys(matchup.homePerCategoryResults).length > 0) {
              let homeCatWins = 0
              let awayCatWins = 0
              
              for (const [statId, result] of Object.entries(matchup.homePerCategoryResults)) {
                if (result === 'WIN') {
                  homeCatWins++
                } else if (result === 'LOSS') {
                  awayCatWins++ // Home loss = Away win
                }
              }
              
              // Track category totals
              homeStats.categoryWins += homeCatWins
              homeStats.categoryLosses += awayCatWins
              awayStats.categoryWins += awayCatWins
              awayStats.categoryLosses += homeCatWins
              
              // Determine matchup winner
              if (homeCatWins > awayCatWins) {
                homeStats.wins++
                awayStats.losses++
              } else if (awayCatWins > homeCatWins) {
                awayStats.wins++
                homeStats.losses++
              } else {
                homeStats.ties++
                awayStats.ties++
              }
              
              if (week === 1) {
                console.log(`[ESPN] Week ${week}: Home ${homeCatWins} cats, Away ${awayCatWins} cats (per-category)`)
              }
            }
            // Method 2: Use category wins from matchup
            else if ((matchup.homeCategoryWins || 0) > 0 || (matchup.awayCategoryWins || 0) > 0) {
              const homeCatWins = matchup.homeCategoryWins || 0
              const awayCatWins = matchup.awayCategoryWins || 0
              
              homeStats.categoryWins += homeCatWins
              homeStats.categoryLosses += matchup.homeCategoryLosses || 0
              awayStats.categoryWins += awayCatWins
              awayStats.categoryLosses += matchup.awayCategoryLosses || 0
              
              if (homeCatWins > awayCatWins) {
                homeStats.wins++
                awayStats.losses++
              } else if (awayCatWins > homeCatWins) {
                awayStats.wins++
                homeStats.losses++
              } else {
                homeStats.ties++
                awayStats.ties++
              }
              
              if (week === 1) {
                console.log(`[ESPN] Week ${week}: Home ${homeCatWins} cats, Away ${awayCatWins} cats (cumulativeScore)`)
              }
            }
            // Method 3: Use winner field
            else if (matchup.winner && matchup.winner !== 'UNDECIDED') {
              if (matchup.winner === 'HOME') {
                homeStats.wins++
                awayStats.losses++
              } else if (matchup.winner === 'AWAY') {
                awayStats.wins++
                homeStats.losses++
              } else if (matchup.winner === 'TIE') {
                homeStats.ties++
                awayStats.ties++
              }
              
              if (week === 1) {
                console.log(`[ESPN] Week ${week}: Winner field = ${matchup.winner}`)
              }
            }
            // Method 4: Use scores as fallback
            else if ((matchup.homeScore || 0) > 0 || (matchup.awayScore || 0) > 0) {
              if (matchup.homeScore > matchup.awayScore) {
                homeStats.wins++
                awayStats.losses++
              } else if (matchup.awayScore > matchup.homeScore) {
                awayStats.wins++
                homeStats.losses++
              } else {
                homeStats.ties++
                awayStats.ties++
              }
              
              if (week === 1) {
                console.log(`[ESPN] Week ${week}: Using scores ${matchup.homeScore}-${matchup.awayScore}`)
              }
            }
          }
        } catch (weekErr) {
          console.warn(`[ESPN calculateStandingsFromMatchupHistory] Error fetching week ${week}:`, weekErr)
        }
      }
      
      console.log('[ESPN calculateStandingsFromMatchupHistory] Processed', totalMatchupsProcessed, 'matchups')
      
      // Apply calculated stats to teams
      const updatedTeams = teams.map(team => {
        const stats = teamStats.get(team.id)
        if (stats) {
          console.log(`[ESPN] Final standings for ${team.name}: ${stats.wins}-${stats.losses}-${stats.ties} (Cat: ${stats.categoryWins}-${stats.categoryLosses})`)
          return {
            ...team,
            wins: stats.wins,
            losses: stats.losses,
            ties: stats.ties,
            categoryWins: stats.categoryWins,
            categoryLosses: stats.categoryLosses
          }
        }
        return team
      })
      
      // Sort by wins, then by category win percentage
      return updatedTeams.sort((a, b) => {
        if (b.wins !== a.wins) return b.wins - a.wins
        if ((b.ties || 0) !== (a.ties || 0)) return (b.ties || 0) - (a.ties || 0)
        const aCatTotal = ((a as any).categoryWins || 0) + ((a as any).categoryLosses || 0) || 1
        const bCatTotal = ((b as any).categoryWins || 0) + ((b as any).categoryLosses || 0) || 1
        const aCatPct = ((a as any).categoryWins || 0) / aCatTotal
        const bCatPct = ((b as any).categoryWins || 0) / bCatTotal
        return bCatPct - aCatPct
      })
    } catch (error) {
      console.error('[ESPN calculateStandingsFromMatchupHistory] Error:', error)
      return null
    }
  }

  // ============================================================
  // Draft Methods
  // ============================================================

  /**
   * Get draft results
   */
  async getDraft(sport: Sport, leagueId: string | number, season: number): Promise<EspnDraftPick[]> {
    const cacheKey = `espn_draft_${sport}_${leagueId}_${season}_v6`
    const cached = cache.get<EspnDraftPick[]>('espn_draft', cacheKey)
    if (cached) {
      console.log(`[Cache HIT] ESPN draft for ${leagueId}`)
      return cached
    }

    try {
      // First, get just the draft detail to get player IDs
      const draftData = await this.apiRequest(sport, leagueId, season, [ESPN_VIEWS.DRAFT_DETAIL])
      
      console.log('[ESPN getDraft] Response keys:', Object.keys(draftData))
      
      const rawPicks = draftData.draftDetail?.picks || []
      console.log('[ESPN getDraft] Raw draft picks count:', rawPicks.length)
      
      if (rawPicks.length === 0) {
        return []
      }
      
      // Extract player IDs from draft picks
      const playerIds = rawPicks.map((p: any) => p.playerId).filter(Boolean)
      console.log('[ESPN getDraft] Player IDs to fetch:', playerIds.length)
      
      // Fetch player info in BATCHES of 50 (ESPN API limit)
      const allPlayers: any[] = []
      const chunkSize = 50
      
      for (let i = 0; i < playerIds.length; i += chunkSize) {
        const chunk = playerIds.slice(i, i + chunkSize)
        console.log(`[ESPN getDraft] Fetching player chunk ${Math.floor(i/chunkSize) + 1}/${Math.ceil(playerIds.length/chunkSize)} (${chunk.length} players)`)
        
        try {
          const filterObj = {
            players: {
              filterIds: {
                value: chunk
              }
            }
          }
          const chunkData = await this.apiRequestWithFilter(sport, leagueId, season, [ESPN_VIEWS.PLAYER_INFO], filterObj)
          const chunkPlayers = chunkData.players || []
          console.log(`[ESPN getDraft] Chunk ${Math.floor(i/chunkSize) + 1} returned ${chunkPlayers.length} players`)
          allPlayers.push(...chunkPlayers)
        } catch (e) {
          console.log(`[ESPN getDraft] Chunk ${Math.floor(i/chunkSize) + 1} failed:`, e)
        }
      }
      
      console.log('[ESPN getDraft] Total players fetched across all chunks:', allPlayers.length)
      
      // Combine draft data with player data for parsing
      const combinedData = {
        draftDetail: draftData.draftDetail,
        players: allPlayers
      }
      
      const picks = this.parseDraft(combinedData, sport)
      
      // Log resolution rate
      const resolved = picks.filter(p => !p.playerName.startsWith('Player '))
      console.log('[ESPN getDraft] Resolved', resolved.length, 'of', picks.length, 'players in initial parse')
      
      // Draft data is permanent
      cache.set('espn_draft', picks, CACHE_TTL.PERMANENT, cacheKey)
      
      return picks
    } catch (error) {
      console.error('Error fetching ESPN draft:', error)
      throw error
    }
  }
  
  /**
   * Get draft picks with player names resolved
   * This combines draft data with player info lookup using multiple fallback methods
   */
  async getDraftWithPlayers(sport: Sport, leagueId: string | number, season: number): Promise<EspnDraftPick[]> {
    const cacheKey = `espn_draft_full_${sport}_${leagueId}_${season}_v6`
    const cached = cache.get<EspnDraftPick[]>('espn_draft_full', cacheKey)
    if (cached) {
      console.log(`[Cache HIT] ESPN draft with players for ${leagueId}`)
      return cached
    }

    try {
      // Get basic draft picks
      const picks = await this.getDraft(sport, leagueId, season)
      
      // Get team mapping based on sport
      const teamMapping = sport === 'baseball' ? MLB_TEAMS : sport === 'hockey' ? NHL_TEAMS : sport === 'basketball' ? NBA_TEAMS : PRO_TEAMS
      
      // Extract all player IDs
      const playerIds = picks.map(p => p.playerId)
      console.log('[ESPN getDraftWithPlayers] Need to resolve', playerIds.length, 'players')
      
      // Build a master player map using multiple methods
      const playerMap = new Map<number, { name: string; position: string; team: string }>()
      
      // METHOD 1: Try kona_player_info (works for most current players)
      try {
        const result = await this.getPlayersByIds(sport, leagueId, season, playerIds)
        for (const [id, info] of result) {
          playerMap.set(id, info)
        }
        console.log('[ESPN getDraftWithPlayers] Method 1 (kona_player_info): resolved', playerMap.size, 'players')
      } catch (e) {
        console.log('[ESPN getDraftWithPlayers] Method 1 failed:', e)
      }
      
      // Find still-unresolved players
      let unresolvedIds = playerIds.filter(id => !playerMap.has(id) || playerMap.get(id)?.name.startsWith('Player '))
      console.log('[ESPN getDraftWithPlayers] Still unresolved after method 1:', unresolvedIds.length)
      
      // METHOD 2: Try roster data (gets currently rostered players with full info)
      if (unresolvedIds.length > 0) {
        try {
          const teamsWithRosters = await this.getTeamsWithRosters(sport, leagueId, season)
          for (const team of teamsWithRosters) {
            if (team.roster) {
              for (const player of team.roster) {
                if (!playerMap.has(player.playerId) || playerMap.get(player.playerId)?.name.startsWith('Player ')) {
                  playerMap.set(player.playerId, {
                    name: player.fullName || `Player ${player.playerId}`,
                    position: player.position || 'Unknown',
                    team: player.proTeam || teamMapping[player.proTeamId] || 'FA'
                  })
                }
              }
            }
          }
          unresolvedIds = playerIds.filter(id => !playerMap.has(id) || playerMap.get(id)?.name.startsWith('Player '))
          console.log('[ESPN getDraftWithPlayers] Method 2 (rosters): now have', playerMap.size, 'players, still unresolved:', unresolvedIds.length)
        } catch (e) {
          console.log('[ESPN getDraftWithPlayers] Method 2 failed:', e)
        }
      }
      
      // METHOD 3: Try players_wl view for unresolved players (broader player pool)
      if (unresolvedIds.length > 0) {
        try {
          console.log('[ESPN getDraftWithPlayers] Method 3: Trying players_wl for', unresolvedIds.length, 'unresolved players')
          const playersWlData = await this.getPlayersFromWaiverList(sport, leagueId, season, unresolvedIds)
          for (const [id, info] of playersWlData) {
            if (!playerMap.has(id) || playerMap.get(id)?.name.startsWith('Player ')) {
              playerMap.set(id, info)
            }
          }
          unresolvedIds = playerIds.filter(id => !playerMap.has(id) || playerMap.get(id)?.name.startsWith('Player '))
          console.log('[ESPN getDraftWithPlayers] Method 3 (players_wl): now have', playerMap.size, 'players, still unresolved:', unresolvedIds.length)
        } catch (e) {
          console.log('[ESPN getDraftWithPlayers] Method 3 failed:', e)
        }
      }
      
      // METHOD 4: Try fetching each unresolved player individually via league API
      if (unresolvedIds.length > 0) {
        console.log('[ESPN getDraftWithPlayers] Method 4: Individual league lookup for', unresolvedIds.length, 'players:', unresolvedIds)
        for (const playerId of unresolvedIds) {
          try {
            const playerInfo = await this.getPlayerById(sport, leagueId, season, playerId)
            if (playerInfo && !playerInfo.name.startsWith('Player ')) {
              playerMap.set(playerId, playerInfo)
            }
          } catch (e) {
            // Silent fail for individual lookups
          }
        }
        unresolvedIds = playerIds.filter(id => !playerMap.has(id) || playerMap.get(id)?.name.startsWith('Player '))
        console.log('[ESPN getDraftWithPlayers] After method 4: still unresolved:', unresolvedIds.length)
      }
      
      // METHOD 5: Try ESPN's public athlete API (works for historical/inactive players)
      if (unresolvedIds.length > 0) {
        console.log('[ESPN getDraftWithPlayers] Method 5: Public athlete API for', unresolvedIds.length, 'players:', unresolvedIds)
        for (const playerId of unresolvedIds) {
          try {
            const playerInfo = await this.getPlayerFromPublicAPI(sport, playerId)
            if (playerInfo && !playerInfo.name.startsWith('Player ')) {
              playerMap.set(playerId, playerInfo)
              console.log(`[ESPN Method 5] Resolved player ${playerId}: ${playerInfo.name}`)
            }
          } catch (e) {
            console.log(`[ESPN Method 5] Failed for player ${playerId}:`, e)
          }
        }
        unresolvedIds = playerIds.filter(id => !playerMap.has(id) || playerMap.get(id)?.name.startsWith('Player '))
        console.log('[ESPN getDraftWithPlayers] After method 5: still unresolved:', unresolvedIds.length)
      }
      
      // Log final unresolved players for debugging
      if (unresolvedIds.length > 0) {
        console.log('[ESPN getDraftWithPlayers] FINAL UNRESOLVED player IDs:', unresolvedIds)
        console.log('[ESPN getDraftWithPlayers] Try looking these up manually at: https://www.espn.com/mlb/player/_/id/PLAYER_ID')
      }
      
      // Enrich picks with player info
      const enrichedPicks = picks.map(pick => {
        const playerInfo = playerMap.get(pick.playerId)
        if (playerInfo && !playerInfo.name.startsWith('Player ')) {
          return {
            ...pick,
            playerName: playerInfo.name,
            position: playerInfo.position || pick.position || 'Unknown',
            proTeam: playerInfo.team
          }
        }
        return pick
      })
      
      // Cache the enriched data
      cache.set('espn_draft_full', enrichedPicks, CACHE_TTL.PERMANENT, cacheKey)
      
      return enrichedPicks
    } catch (error) {
      console.error('Error fetching ESPN draft with players:', error)
      throw error
    }
  }

  /**
   * Get top free agents (unowned players) from the league
   * @param limit - Number of free agents to return (default 100)
   */
  async getFreeAgents(sport: Sport, leagueId: string | number, season: number, limit: number = 100): Promise<EspnPlayer[]> {
    const cacheKey = `espn_free_agents_${sport}_${leagueId}_${season}_${limit}`
    const cached = cache.get<EspnPlayer[]>('espn_free_agents', cacheKey)
    if (cached) {
      console.log(`[Cache HIT] ESPN free agents for ${leagueId}`)
      return cached
    }

    const teamMapping = sport === 'baseball' ? MLB_TEAMS : sport === 'hockey' ? NHL_TEAMS : sport === 'basketball' ? NBA_TEAMS : PRO_TEAMS
    const freeAgents: EspnPlayer[] = []
    
    try {
      // Request players_wl view filtered to show only unowned players
      const filterObj = {
        players: {
          filterStatus: {
            value: ['FREEAGENT', 'WAIVERS']  // Only free agents and waiver players
          },
          filterSlotIds: {
            value: []  // All positions
          },
          limit: limit,
          sortPercOwned: {
            sortPriority: 1,
            sortAsc: false  // Most owned first (popular free agents)
          }
        }
      }
      
      const data = await this.apiRequestWithFilter(sport, leagueId, season, [ESPN_VIEWS.PLAYERS], filterObj)
      const players = data.players || []
      
      console.log('[ESPN getFreeAgents] Got', players.length, 'free agents from players_wl')
      
      for (const entry of players) {
        const player = entry.player || entry
        if (!player.id) continue
        
        // Get stats from player data
        const statsArray = player.stats || []
        const seasonStats = statsArray.find((s: any) => s.statSourceId === 0 && s.statSplitTypeId === 0) ||
                           statsArray.find((s: any) => s.statSourceId === 0) || {}
        
        freeAgents.push({
          id: player.id,
          playerId: player.id,
          fullName: player.fullName || `${player.firstName || ''} ${player.lastName || ''}`.trim() || `Player ${player.id}`,
          firstName: player.firstName || '',
          lastName: player.lastName || '',
          proTeam: teamMapping[player.proTeamId] || 'FA',
          proTeamId: player.proTeamId || 0,
          position: this.getPositionName(player.defaultPositionId, sport),
          positionId: player.defaultPositionId || 0,
          lineupSlotId: 0,
          lineupSlot: 'FA',
          injuryStatus: player.injuryStatus || 'ACTIVE',
          projectedPoints: 0,
          actualPoints: seasonStats.appliedTotal || 0,
          percentOwned: entry.player?.ownership?.percentOwned || player.ownership?.percentOwned || 0,
          percentStarted: entry.player?.ownership?.percentStarted || player.ownership?.percentStarted || 0,
          percentChange: entry.player?.ownership?.percentChange || player.ownership?.percentChange || 0,
          averageDraftPosition: entry.player?.ownership?.averageDraftPosition || player.ownership?.averageDraftPosition || 0,
          stats: this.flattenStats(seasonStats.stats || {})
        })
      }
      
      cache.set('espn_free_agents', freeAgents, CACHE_TTL.STANDINGS, cacheKey)
      return freeAgents
      
    } catch (e) {
      console.error('[ESPN getFreeAgents] Error:', e)
      return []
    }
  }
  
  /**
   * Get players from the waiver/free agent list view (broader player pool)
   */
  private async getPlayersFromWaiverList(sport: Sport, leagueId: string | number, season: number, playerIds: number[]): Promise<Map<number, { name: string; position: string; team: string }>> {
    const teamMapping = sport === 'baseball' ? MLB_TEAMS : sport === 'hockey' ? NHL_TEAMS : sport === 'basketball' ? NBA_TEAMS : PRO_TEAMS
    const playerMap = new Map<number, { name: string; position: string; team: string }>()
    
    try {
      // Request players_wl view with filter for specific player IDs
      const filterObj = {
        players: {
          filterIds: {
            value: playerIds
          },
          filterSlotIds: {
            value: [] // Empty = all slots
          },
          limit: playerIds.length + 10,
          sortPercOwned: {
            sortPriority: 1,
            sortAsc: false
          }
        }
      }
      
      const data = await this.apiRequestWithFilter(sport, leagueId, season, [ESPN_VIEWS.PLAYERS], filterObj)
      const players = data.players || []
      
      console.log('[ESPN getPlayersFromWaiverList] Got', players.length, 'players from players_wl')
      
      for (const entry of players) {
        const player = entry.player || entry
        if (player.id && playerIds.includes(player.id)) {
          playerMap.set(player.id, {
            name: player.fullName || `${player.firstName || ''} ${player.lastName || ''}`.trim() || `Player ${player.id}`,
            position: this.getPositionName(player.defaultPositionId, sport),
            team: teamMapping[player.proTeamId] || 'FA'
          })
        }
      }
    } catch (e) {
      console.error('[ESPN getPlayersFromWaiverList] Error:', e)
    }
    
    return playerMap
  }
  
  /**
   * Get a single player's info by ID (fallback method)
   */
  private async getPlayerById(sport: Sport, leagueId: string | number, season: number, playerId: number): Promise<{ name: string; position: string; team: string } | null> {
    const teamMapping = sport === 'baseball' ? MLB_TEAMS : sport === 'hockey' ? NHL_TEAMS : sport === 'basketball' ? NBA_TEAMS : PRO_TEAMS
    
    try {
      const filterObj = {
        players: {
          filterIds: {
            value: [playerId]
          }
        }
      }
      
      const data = await this.apiRequestWithFilter(sport, leagueId, season, [ESPN_VIEWS.PLAYER_INFO], filterObj)
      const players = data.players || []
      
      if (players.length > 0) {
        const player = players[0].player || players[0]
        return {
          name: player.fullName || `${player.firstName || ''} ${player.lastName || ''}`.trim() || `Player ${playerId}`,
          position: this.getPositionName(player.defaultPositionId, sport),
          team: teamMapping[player.proTeamId] || 'FA'
        }
      }
    } catch (e) {
      // Silent fail
    }
    
    return null
  }
  
  /**
   * Get player info from ESPN's public athlete API (works for historical/inactive players)
   * This endpoint doesn't require authentication and has broader player coverage
   */
  private async getPlayerFromPublicAPI(sport: Sport, playerId: number): Promise<{ name: string; position: string; team: string } | null> {
    // Map our sport names to ESPN's sport/league format
    const sportMapping: Record<Sport, { sport: string; league: string }> = {
      baseball: { sport: 'baseball', league: 'mlb' },
      football: { sport: 'football', league: 'nfl' },
      basketball: { sport: 'basketball', league: 'nba' },
      hockey: { sport: 'hockey', league: 'nhl' }
    }
    
    const { sport: espnSport, league } = sportMapping[sport]
    
    // ESPN's public athlete API endpoint
    const endpoint = `/apis/common/v3/sports/${espnSport}/${league}/athletes/${playerId}`
    
    // Get access token for proxy
    let accessToken: string | null = null
    try {
      const keys = Object.keys(localStorage)
      const authKey = keys.find(k => k.startsWith('sb-') && k.endsWith('-auth-token'))
      if (authKey) {
        const stored = localStorage.getItem(authKey)
        if (stored) {
          const parsed = JSON.parse(stored)
          accessToken = parsed?.access_token
        }
      }
    } catch (e) {
      // Silent fail
    }
    
    if (!accessToken) {
      try {
        const { supabase } = await import('@/lib/supabase')
        if (supabase) {
          const { data: { session } } = await supabase.auth.getSession()
          accessToken = session?.access_token || null
        }
      } catch (e) {
        // Silent fail
      }
    }
    
    if (!accessToken) {
      return null
    }
    
    try {
      // Use the proxy with the public API endpoint
      const proxyUrl = `${this.supabaseUrl}/functions/v1/espn-api`
      
      const response = await fetch(proxyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          endpoint,
          isPublicApi: true // Flag to tell proxy to use public API base URL
        })
      })
      
      if (!response.ok) {
        // Try direct fetch as fallback (might work for some deployments)
        const directUrl = `https://site.api.espn.com${endpoint}`
        const directResponse = await fetch(directUrl, {
          method: 'GET',
          headers: { 'Accept': 'application/json' }
        })
        
        if (directResponse.ok) {
          const data = await directResponse.json()
          const fullName = data.athlete?.fullName || data.displayName || data.fullName
          const position = data.athlete?.position?.abbreviation || data.position?.abbreviation || 'Unknown'
          const team = data.athlete?.team?.abbreviation || data.team?.abbreviation || 'FA'
          
          if (fullName && !fullName.startsWith('Player ')) {
            return { name: fullName, position, team }
          }
        }
        return null
      }
      
      const data = await response.json()
      
      // Extract player info from response
      const fullName = data.athlete?.fullName || data.displayName || data.fullName
      const position = data.athlete?.position?.abbreviation || data.position?.abbreviation || 'Unknown'
      const team = data.athlete?.team?.abbreviation || data.team?.abbreviation || 'FA'
      
      if (fullName && !fullName.startsWith('Player ')) {
        return { name: fullName, position, team }
      }
    } catch (e) {
      console.log(`[ESPN Public API] Error for player ${playerId}:`, e)
    }
    
    return null
  }

  /**
   * Get player season stats from ESPN's public athlete statistics API
   * This endpoint has full season stats for all MLB players
   */
  async getPlayerStatsFromPublicAPI(sport: Sport, playerId: number, season: number): Promise<Record<string, number> | null> {
    const sportMapping: Record<Sport, { sport: string; league: string }> = {
      baseball: { sport: 'baseball', league: 'mlb' },
      football: { sport: 'football', league: 'nfl' },
      basketball: { sport: 'basketball', league: 'nba' },
      hockey: { sport: 'hockey', league: 'nhl' }
    }
    
    const { sport: espnSport, league } = sportMapping[sport]
    
    // ESPN's public athlete statistics endpoint with season filter
    const endpoint = `/apis/common/v3/sports/${espnSport}/${league}/athletes/${playerId}/statistics?season=${season}`
    
    // Get access token for proxy
    let accessToken: string | null = null
    try {
      const keys = Object.keys(localStorage)
      const authKey = keys.find(k => k.startsWith('sb-') && k.endsWith('-auth-token'))
      if (authKey) {
        const stored = localStorage.getItem(authKey)
        if (stored) {
          const parsed = JSON.parse(stored)
          accessToken = parsed?.access_token
        }
      }
    } catch (e) {
      // Silent fail
    }
    
    if (!accessToken) {
      try {
        const { supabase } = await import('@/lib/supabase')
        if (supabase) {
          const { data: { session } } = await supabase.auth.getSession()
          accessToken = session?.access_token || null
        }
      } catch (e) {
        // Silent fail
      }
    }
    
    try {
      // Try proxy first
      if (accessToken) {
        const proxyUrl = `${this.supabaseUrl}/functions/v1/espn-api`
        
        const response = await fetch(proxyUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
          },
          body: JSON.stringify({
            endpoint,
            isPublicApi: true
          })
        })
        
        if (response.ok) {
          const data = await response.json()
          return this.parsePublicAPIStats(data, sport)
        }
      }
      
      // Try direct fetch as fallback
      const directUrl = `https://site.api.espn.com${endpoint}`
      const directResponse = await fetch(directUrl, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      })
      
      if (directResponse.ok) {
        const data = await directResponse.json()
        return this.parsePublicAPIStats(data, sport)
      }
    } catch (e) {
      // Silent fail - will return null
    }
    
    return null
  }

  /**
   * Parse stats from ESPN's public API response into our stat format
   */
  private parsePublicAPIStats(data: any, sport: Sport): Record<string, number> | null {
    const stats: Record<string, number> = {}
    
    // ESPN public API returns stats in a different format
    // Look for season totals in the response
    const categories = data.statistics?.splits?.categories || 
                       data.splits?.categories || 
                       data.categories || 
                       []
    
    if (categories.length === 0) {
      // Try alternate structure
      const splits = data.statistics?.splits || data.splits || []
      for (const split of splits) {
        if (split.type === 'total' || split.displayName === 'Total') {
          const splitStats = split.stats || []
          for (const stat of splitStats) {
            if (stat.name && stat.value !== undefined) {
              // Map ESPN stat names to our stat IDs
              const statId = this.mapPublicStatNameToId(stat.name, sport)
              if (statId !== null) {
                stats[statId.toString()] = parseFloat(stat.value) || 0
              }
            }
          }
        }
      }
    } else {
      // Parse categories structure
      for (const category of categories) {
        const categoryStats = category.stats || []
        for (const stat of categoryStats) {
          if (stat.name && stat.value !== undefined) {
            const statId = this.mapPublicStatNameToId(stat.name, sport)
            if (statId !== null) {
              stats[statId.toString()] = parseFloat(stat.value) || 0
            }
          }
        }
      }
    }
    
    return Object.keys(stats).length > 0 ? stats : null
  }

  /**
   * Map ESPN public API stat names to fantasy stat IDs
   */
  private mapPublicStatNameToId(statName: string, sport: Sport): number | null {
    if (sport !== 'baseball') return null
    
    // ESPN public API uses full stat names, map to fantasy stat IDs
    const mapping: Record<string, number> = {
      // Hitting
      'atBats': 0, 'AB': 0,
      'hits': 1, 'H': 1,
      'runs': 2, 'R': 2,
      'homeRuns': 3, 'HR': 3,
      'RBIs': 4, 'RBI': 4,
      'stolenBases': 5, 'SB': 5,
      'walks': 6, 'BB': 6,
      'strikeouts': 7, 'SO': 7, 'K': 7,
      'avg': 8, 'AVG': 8, 'battingAverage': 8,
      'OBP': 9, 'onBasePercentage': 9,
      'SLG': 10, 'sluggingPercentage': 10,
      'OPS': 11,
      'doubles': 41, '2B': 41,
      'triples': 42, '3B': 42,
      'totalBases': 40, 'TB': 40,
      // Pitching
      'inningsPitched': 17, 'IP': 17,
      'ERA': 18, 'earnedRunAverage': 18,
      'WHIP': 19,
      'pitchingStrikeouts': 20, 'strikeoutsThrown': 20,
      'walksAllowed': 21,
      'wins': 32, 'W': 32,
      'losses': 33, 'L': 33,
      'saves': 34, 'SV': 34,
      'qualityStarts': 35, 'QS': 35,
      'completeGames': 37, 'CG': 37,
      'holds': 50, 'HLD': 50,
      'blownSaves': 51, 'BS': 51
    }
    
    return mapping[statName] ?? null
  }

  /**
   * Get stats for multiple players from ESPN's public API
   * Returns a map of playerId -> stats
   */
  async getPlayersStatsFromPublicAPI(sport: Sport, playerIds: number[], season: number, onProgress?: (current: number, total: number) => void): Promise<Map<number, Record<string, number>>> {
    const results = new Map<number, Record<string, number>>()
    
    console.log(`[ESPN Public Stats] Fetching stats for ${playerIds.length} players, season ${season}`)
    
    for (let i = 0; i < playerIds.length; i++) {
      const playerId = playerIds[i]
      
      if (onProgress && i % 10 === 0) {
        onProgress(i, playerIds.length)
      }
      
      try {
        const stats = await this.getPlayerStatsFromPublicAPI(sport, playerId, season)
        if (stats && Object.keys(stats).length > 0) {
          results.set(playerId, stats)
        }
      } catch (e) {
        // Skip failed players
      }
      
      // Small delay to avoid rate limiting
      if (i > 0 && i % 5 === 0) {
        await new Promise(resolve => setTimeout(resolve, 50))
      }
    }
    
    console.log(`[ESPN Public Stats] Got stats for ${results.size}/${playerIds.length} players`)
    return results
  }

  /**
   * Get player info by player IDs
   * Uses the kona_player_info view with a filter to get player details
   */
  async getPlayersByIds(sport: Sport, leagueId: string | number, season: number, playerIds: number[]): Promise<Map<number, { name: string; position: string; team: string }>> {
    if (playerIds.length === 0) {
      return new Map()
    }

    const cacheKey = `espn_players_${sport}_${leagueId}_${season}_${playerIds.slice(0, 5).join('_')}_v3`
    // Cache stores plain objects, not Maps (JSON doesn't support Maps)
    const cached = cache.get<Record<string, { name: string; position: string; team: string }>>('espn_players', cacheKey)
    if (cached && typeof cached === 'object' && Object.keys(cached).length > 0) {
      console.log(`[Cache HIT] ESPN players for ${leagueId}`)
      // Convert plain object back to Map
      const map = new Map<number, { name: string; position: string; team: string }>()
      for (const [key, value] of Object.entries(cached)) {
        map.set(parseInt(key), value)
      }
      return map
    }

    // Get correct team mapping based on sport
    const teamMapping = sport === 'baseball' ? MLB_TEAMS : sport === 'hockey' ? NHL_TEAMS : sport === 'basketball' ? NBA_TEAMS : PRO_TEAMS

    try {
      // Batch player IDs into chunks of 50 to avoid URL length limits
      const playerMap = new Map<number, { name: string; position: string; team: string }>()
      const chunkSize = 50
      
      for (let i = 0; i < playerIds.length; i += chunkSize) {
        const chunk = playerIds.slice(i, i + chunkSize)
        
        // Use kona_player_info view with filter
        // ESPN requires the filter to be passed as x-fantasy-filter header (handled by proxy)
        const filterObj = {
          players: {
            filterIds: {
              value: chunk
            }
          }
        }
        
        console.log(`[ESPN getPlayersByIds] Requesting chunk ${Math.floor(i/chunkSize) + 1} with ${chunk.length} player IDs`)
        
        try {
          const data = await this.apiRequestWithFilter(sport, leagueId, season, [ESPN_VIEWS.PLAYER_INFO], filterObj)
          
          // Parse player data from response
          const players = data.players || []
          console.log(`[ESPN getPlayersByIds] Got ${players.length} players in chunk ${Math.floor(i/chunkSize) + 1}`)
          
          // Debug: log first player structure
          if (players.length > 0 && i === 0) {
            console.log('[ESPN getPlayersByIds] First player structure:', JSON.stringify(players[0]).slice(0, 500))
          }
          
          for (const entry of players) {
            const player = entry.player || entry
            if (player.id) {
              playerMap.set(player.id, {
                name: player.fullName || `${player.firstName || ''} ${player.lastName || ''}`.trim() || `Player ${player.id}`,
                position: this.getPositionName(player.defaultPositionId, sport),
                team: teamMapping[player.proTeamId] || `Team${player.proTeamId}`
              })
            }
          }
        } catch (chunkError) {
          console.error(`[ESPN getPlayersByIds] Error in chunk ${Math.floor(i/chunkSize) + 1}:`, chunkError)
          // Continue with next chunk even if this one fails
        }
      }
      
      console.log(`[ESPN getPlayersByIds] Total: resolved ${playerMap.size} of ${playerIds.length} players`)
      
      // Convert Map to plain object for caching (JSON doesn't support Maps)
      const cacheObj: Record<string, { name: string; position: string; team: string }> = {}
      for (const [key, value] of playerMap.entries()) {
        cacheObj[key.toString()] = value
      }
      
      // Cache for a long time since player names don't change
      if (playerMap.size > 0) {
        cache.set('espn_players', cacheObj, CACHE_TTL.PERMANENT, cacheKey)
      }
      
      return playerMap
    } catch (error) {
      console.error('Error fetching ESPN players by IDs:', error)
      return new Map()
    }
  }

  /**
   * Fetch actual stats for a specific time period.
   * statSplitTypeId: 0=season, 1=last7, 2=last15, 3=last30
   * ESPN's split type IDs vary by sport/league. We request ALL split types
   * and pick the best match, logging what's available for debugging.
   */
  async getPlayersStatsByPeriod(
    sport: Sport, leagueId: string | number, season: number,
    playerIds: number[], statSplitTypeId: number = 0
  ): Promise<Map<number, Record<string, number>>> {
    if (playerIds.length === 0) return new Map()

    const result = new Map<number, Record<string, number>>()
    const chunkSize = 50
    let loggedSplitTypes = false

    for (let i = 0; i < playerIds.length; i += chunkSize) {
      const chunk = playerIds.slice(i, i + chunkSize)
      try {
        const filterObj = {
          players: {
            filterIds: { value: chunk },
            filterStatsForSplitTypeIds: { value: [0, 1, 2, 3, 4, 5] },
            filterStatsForSourceIds: { value: [0] },
            filterStatsForSeasonId: { value: season }
          }
        }

        const data = await this.apiRequestWithFilter(sport, leagueId, season, [ESPN_VIEWS.PLAYER_INFO], filterObj)
        for (const entry of (data.players || [])) {
          const player = entry.player || entry
          if (!player.id) continue
          const statsArray = player.stats || []

          // Log all available split types for the first player to help debug
          if (!loggedSplitTypes && statsArray.length > 0) {
            const available = statsArray.map((s: any) => ({
              sourceId: s.statSourceId,
              splitTypeId: s.statSplitTypeId,
              seasonId: s.seasonId,
              numStats: s.stats ? Object.keys(s.stats).length : 0,
              id: s.id
            }))
            console.log(`[ESPN getPlayersStatsByPeriod] Available stat entries for player ${player.fullName || player.id}:`, JSON.stringify(available))
            loggedSplitTypes = true
          }

          // Find stats matching requested split type (actuals only)
          const match = statsArray.find((s: any) =>
            s.statSourceId === 0 &&
            s.statSplitTypeId === statSplitTypeId &&
            s.stats && Object.keys(s.stats).length > 0
          )
          if (match?.stats) {
            result.set(player.id, match.stats)
          }
        }
      } catch (e) {
        console.error(`[ESPN getPlayersStatsByPeriod] chunk error:`, e)
      }
    }

    console.log(`[ESPN getPlayersStatsByPeriod] split=${statSplitTypeId}: got stats for ${result.size}/${playerIds.length} players`)
    return result
  }

  /**
   * Get players with full stats (including season totals) for draft analysis
   * Tries multiple ESPN API approaches to maximize stat coverage
   */
  async getPlayersWithStats(sport: Sport, leagueId: string | number, season: number, playerIds: number[]): Promise<Map<number, { name: string; position: string; team: string; stats: Record<string, number> }>> {
    if (playerIds.length === 0) {
      return new Map()
    }

    const cacheKey = `espn_players_stats_${sport}_${leagueId}_${season}_${playerIds.length}_v3`
    const cached = cache.get<Record<string, any>>('espn_players_stats', cacheKey)
    if (cached && typeof cached === 'object' && Object.keys(cached).length > 0) {
      console.log(`[Cache HIT] ESPN players with stats for ${leagueId}`)
      const map = new Map<number, { name: string; position: string; team: string; stats: Record<string, number> }>()
      for (const [key, value] of Object.entries(cached)) {
        map.set(parseInt(key), value)
      }
      return map
    }

    const teamMapping = sport === 'baseball' ? MLB_TEAMS : sport === 'hockey' ? NHL_TEAMS : sport === 'basketball' ? NBA_TEAMS : PRO_TEAMS
    const playerMap = new Map<number, { name: string; position: string; team: string; stats: Record<string, number> }>()
    
    console.log(`[ESPN getPlayersWithStats] Fetching stats for ${playerIds.length} players, season ${season}`)

    // METHOD 1: Try kona_player_info with stats filters
    try {
      const chunkSize = 50
      for (let i = 0; i < playerIds.length; i += chunkSize) {
        const chunk = playerIds.slice(i, i + chunkSize)
        
        // Try with season-specific stats filter
        const filterObj = {
          players: {
            filterIds: { value: chunk },
            filterStatsForCurrentSeasonOnly: { value: false },  // Get historical seasons too
            filterStatsForSplitTypeIds: { value: [0, 1, 5] },  // 0=total, 1=projected, 5=last7/30
            filterStatsForSourceIds: { value: [0, 1] },  // 0=actual, 1=projected
            filterStatsForSeasonId: { value: season }  // Specific season
          }
        }
        
        console.log(`[ESPN Method 1] Chunk ${Math.floor(i/chunkSize) + 1}/${Math.ceil(playerIds.length/chunkSize)}`)
        
        try {
          const data = await this.apiRequestWithFilter(sport, leagueId, season, [ESPN_VIEWS.PLAYER_INFO], filterObj)
          const players = data.players || []
          
          for (const entry of players) {
            const player = entry.player || entry
            if (!player.id) continue
            
            const statsArray = player.stats || []
            // Find season stats - prioritize actual stats (statSourceId=0)
            const seasonStats = statsArray.find((s: any) => 
              s.statSourceId === 0 && 
              (s.seasonId === season || s.statSplitTypeId === 0) &&
              s.stats && Object.keys(s.stats).length > 5
            ) || statsArray.find((s: any) => 
              s.statSourceId === 0 && s.stats && Object.keys(s.stats).length > 0
            ) || {}
            
            const stats = seasonStats.stats || {}
            
            if (Object.keys(stats).length > 0 || !playerMap.has(player.id)) {
              playerMap.set(player.id, {
                name: player.fullName || `Player ${player.id}`,
                position: this.getPositionName(player.defaultPositionId, sport),
                team: teamMapping[player.proTeamId] || 'FA',
                stats: stats
              })
            }
          }
        } catch (e) {
          console.log(`[ESPN Method 1] Chunk ${Math.floor(i/chunkSize) + 1} failed:`, e)
        }
      }
    } catch (e) {
      console.log('[ESPN Method 1] Failed:', e)
    }
    
    // Count how many have stats
    let withStats = 0
    for (const p of playerMap.values()) {
      if (Object.keys(p.stats).length > 5) withStats++
    }
    console.log(`[ESPN Method 1] Got stats for ${withStats}/${playerMap.size} players`)
    
    // METHOD 2: Try players_wl view which sometimes has more stats
    if (withStats < playerIds.length * 0.5) {
      console.log('[ESPN Method 2] Trying players_wl view...')
      const missingIds = playerIds.filter(id => {
        const p = playerMap.get(id)
        return !p || Object.keys(p.stats).length <= 5
      })
      
      try {
        const filterObj = {
          players: {
            filterIds: { value: missingIds.slice(0, 100) },
            filterStatsForSplitTypeIds: { value: [0] },
            sortPercOwned: { sortPriority: 1, sortAsc: false },
            limit: 100
          }
        }
        
        const data = await this.apiRequestWithFilter(sport, leagueId, season, [ESPN_VIEWS.PLAYERS], filterObj)
        const players = data.players || []
        
        console.log(`[ESPN Method 2] Got ${players.length} players from players_wl`)
        
        for (const entry of players) {
          const player = entry.player || entry
          if (!player.id) continue
          
          const statsArray = player.stats || []
          const seasonStats = statsArray.find((s: any) => s.statSourceId === 0) || {}
          const stats = seasonStats.stats || {}
          
          if (Object.keys(stats).length > 0) {
            const existing = playerMap.get(player.id)
            if (!existing || Object.keys(existing.stats).length < Object.keys(stats).length) {
              playerMap.set(player.id, {
                name: player.fullName || existing?.name || `Player ${player.id}`,
                position: this.getPositionName(player.defaultPositionId, sport) || existing?.position || 'Unknown',
                team: teamMapping[player.proTeamId] || existing?.team || 'FA',
                stats: stats
              })
            }
          }
        }
      } catch (e) {
        console.log('[ESPN Method 2] Failed:', e)
      }
    }
    
    // METHOD 3: Get stats from league's historical data if available
    withStats = 0
    for (const p of playerMap.values()) {
      if (Object.keys(p.stats).length > 5) withStats++
    }
    
    if (withStats < playerIds.length * 0.5) {
      console.log('[ESPN Method 3] Trying league rosters...')
      try {
        const teamsWithRosters = await this.getTeamsWithRosters(sport, leagueId, season)
        
        for (const team of teamsWithRosters) {
          if (team.roster) {
            for (const player of team.roster) {
              if (player.stats && Object.keys(player.stats).length > 0) {
                const existing = playerMap.get(player.playerId)
                if (!existing || Object.keys(existing.stats).length < Object.keys(player.stats).length) {
                  playerMap.set(player.playerId, {
                    name: player.fullName || existing?.name || `Player ${player.playerId}`,
                    position: player.position || existing?.position || 'Unknown',
                    team: player.proTeam || existing?.team || 'FA',
                    stats: player.stats
                  })
                }
              }
            }
          }
        }
      } catch (e) {
        console.log('[ESPN Method 3] Failed:', e)
      }
    }
    
    // METHOD 4: Use ESPN's public statistics API for players still missing stats
    withStats = 0
    for (const p of playerMap.values()) {
      if (Object.keys(p.stats).length > 5) withStats++
    }
    
    if (withStats < playerIds.length * 0.5) {
      console.log('[ESPN Method 4] Trying ESPN public statistics API...')
      const missingStatIds = playerIds.filter(id => {
        const p = playerMap.get(id)
        return !p || Object.keys(p.stats).length <= 5
      })
      
      console.log(`[ESPN Method 4] Fetching stats for ${missingStatIds.length} players from public API`)
      
      try {
        const publicStats = await this.getPlayersStatsFromPublicAPI(
          sport, 
          missingStatIds.slice(0, 100), // Limit to avoid too many requests
          season,
          (current, total) => {
            if (current % 20 === 0) {
              console.log(`[ESPN Method 4] Progress: ${current}/${total}`)
            }
          }
        )
        
        console.log(`[ESPN Method 4] Got stats for ${publicStats.size} players from public API`)
        
        for (const [playerId, stats] of publicStats.entries()) {
          const existing = playerMap.get(playerId)
          if (Object.keys(stats).length > 0) {
            if (!existing || Object.keys(existing.stats).length < Object.keys(stats).length) {
              playerMap.set(playerId, {
                name: existing?.name || `Player ${playerId}`,
                position: existing?.position || 'Unknown',
                team: existing?.team || 'FA',
                stats: stats
              })
            }
          }
        }
      } catch (e) {
        console.log('[ESPN Method 4] Failed:', e)
      }
    }
    
    // Final count
    withStats = 0
    let totalStatKeys = 0
    for (const player of playerMap.values()) {
      const keyCount = Object.keys(player.stats).length
      if (keyCount > 0) {
        withStats++
        totalStatKeys += keyCount
      }
    }
    console.log(`[ESPN getPlayersWithStats] Final: ${withStats}/${playerMap.size} players with stats, avg ${withStats > 0 ? Math.round(totalStatKeys/withStats) : 0} stat keys`)
    
    // Log sample of stats we got
    let sampleCount = 0
    for (const [id, player] of playerMap.entries()) {
      if (sampleCount < 3 && Object.keys(player.stats).length > 5) {
        console.log(`[ESPN Stats Sample] ${player.name}: ${Object.keys(player.stats).length} stats`)
        console.log('  Stats:', Object.entries(player.stats).slice(0, 10))
        sampleCount++
      }
    }

    // Cache the results
    if (playerMap.size > 0) {
      const cacheObj: Record<string, any> = {}
      for (const [key, value] of playerMap.entries()) {
        cacheObj[key.toString()] = value
      }
      cache.set('espn_players_stats', cacheObj, CACHE_TTL.LONG, cacheKey)
    }
    
    return playerMap
  }

  /**
   * Make an API request with a filter header (for player info requests)
   */
  private async apiRequestWithFilter(
    sport: Sport,
    leagueId: string | number,
    season: number,
    views: string[] = [],
    filter?: any
  ): Promise<any> {
    // Get access token
    let accessToken: string | null = null
    
    try {
      const keys = Object.keys(localStorage)
      const authKey = keys.find(k => k.startsWith('sb-') && k.endsWith('-auth-token'))
      if (authKey) {
        const stored = localStorage.getItem(authKey)
        if (stored) {
          const parsed = JSON.parse(stored)
          accessToken = parsed?.access_token
        }
      }
    } catch (e) {
      // Try Supabase client
    }
    
    if (!accessToken) {
      try {
        const { supabase } = await import('@/lib/supabase')
        if (supabase) {
          const { data: { session } } = await supabase.auth.getSession()
          accessToken = session?.access_token || null
        }
      } catch (e) {
        // Silent fail
      }
    }
    
    if (!accessToken) {
      throw new Error('Not authenticated - please sign in')
    }

    const sportCode = ESPN_SPORT_CODES[sport]
    let endpoint = `/games/${sportCode}/seasons/${season}/segments/0/leagues/${leagueId}`
    
    if (views.length > 0) {
      const viewParams = views.map(v => `view=${v}`).join('&')
      endpoint += `?${viewParams}`
    }

    const proxyUrl = `${this.supabaseUrl}/functions/v1/espn-api`
    
    const requestBody: any = { 
      endpoint,
      filter: filter ? JSON.stringify(filter) : undefined
    }
    
    if (this.credentials?.espn_s2 && this.credentials?.swid) {
      requestBody.espn_s2 = this.credentials.espn_s2
      requestBody.swid = this.credentials.swid
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 20000)

    try {
      const response = await fetch(proxyUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(errorData.error || `ESPN API error: ${response.status}`)
      }

      return response.json()
    } catch (error: any) {
      clearTimeout(timeoutId)
      if (error.name === 'AbortError') {
        throw new Error('Request timed out.')
      }
      throw error
    }
  }

  // ============================================================
  // Scoring & Stats Methods
  // ============================================================

  /**
   * Get stat ID → display name mapping for a given sport
   * Used by history pages to resolve ESPN stat IDs to human-readable names
   */
  getStatDisplayNames(sport: Sport): Record<string, string> {
    const hockey: Record<number, string> = {
      0: 'G', 1: 'A', 2: 'PTS', 3: '+/-', 4: 'PIM', 5: 'PPG', 6: 'PPA', 7: 'PPP',
      8: 'SHG', 9: 'SHA', 10: 'SHP', 11: 'GWG', 12: 'SOG', 13: 'SH%', 14: 'FOW',
      15: 'FOL', 16: 'HIT', 17: 'BLK', 18: 'TK', 19: 'W', 20: 'L', 21: 'GA',
      22: 'GAA', 23: 'SV', 24: 'SV%', 25: 'SHO', 26: 'OTL', 27: 'GS', 28: 'GV',
      29: 'ATOI', 30: 'GP', 31: 'HAT', 32: 'DEF', 33: 'STP', 34: 'FO%', 35: 'MIN',
      36: 'SH', 37: 'GW', 38: 'SA', 39: 'GSAA'
    }
    const basketball: Record<number, string> = {
      0: 'PTS', 1: 'BLK', 2: 'STL', 3: 'AST', 4: 'OREB', 5: 'DREB', 6: 'REB',
      7: 'EJ', 8: 'FF', 9: 'PF', 10: 'TF', 11: 'TO', 12: 'DQ', 13: 'FGM',
      14: 'FGA', 15: 'FTM', 16: 'FTA', 17: '3PM', 18: '3PA', 19: 'FG%', 20: 'FT%',
      21: '3P%', 37: 'DD', 38: 'TD', 40: 'GP', 41: 'MIN', 42: 'GS'
    }
    const baseball: Record<number, string> = {
      0: 'AB', 1: 'H', 2: 'R', 3: 'HR', 4: 'RBI', 5: 'SB', 6: 'BB', 7: 'K',
      8: 'AVG', 9: 'OBP', 10: 'SLG', 11: 'OPS', 12: 'CS', 13: 'NSB', 14: 'GDP',
      15: 'HBP', 16: 'SAC', 17: 'IP', 18: 'ERA', 19: 'WHIP', 20: 'Ks', 21: 'BBs',
      22: 'HA', 23: 'HD', 24: 'BS', 32: 'W', 33: 'L', 34: 'SV', 35: 'QS',
      36: 'SHO', 37: 'CG', 40: 'TB', 41: '2B', 42: '3B', 43: '1B', 45: 'E', 99: 'GP'
    }
    
    const map = sport === 'hockey' ? hockey : sport === 'basketball' ? basketball : baseball
    const result: Record<string, string> = {}
    for (const [id, name] of Object.entries(map)) {
      result[String(id)] = name
    }
    return result
  }

  /**
   * Get scoring settings for the league
   */
  async getScoringSettings(sport: Sport, leagueId: string | number, season: number): Promise<any> {
    const cacheKey = `espn_scoring_v5_${sport}_${leagueId}_${season}`
    const cached = cache.get<any>('espn_scoring', cacheKey)
    if (cached) {
      console.log(`[Cache HIT] ESPN scoring settings for ${leagueId}`)
      return cached
    }

    try {
      const data = await this.apiRequest(sport, leagueId, season, [ESPN_VIEWS.SETTINGS])
      
      // Log FULL settings structure to discover category-related fields
      const allSettings = data.settings || {}
      console.log('[ESPN getScoringSettings] ALL settings keys:', Object.keys(allSettings))
      
      const scoringSettings = allSettings.scoringSettings || {}
      console.log('[ESPN getScoringSettings] scoringSettings keys:', Object.keys(scoringSettings))
      
      // Log schedule settings for extended matchup detection
      if (allSettings.scheduleSettings) {
        console.log('[ESPN getScoringSettings] scheduleSettings:', JSON.stringify(allSettings.scheduleSettings))
      }
      
      // Attach schedule settings and full settings keys for CategoryMatchupsView to use
      scoringSettings._scheduleSettings = allSettings.scheduleSettings
      scoringSettings._allSettingsKeys = Object.keys(allSettings)
      scoringSettings._fullSettings = allSettings
      
      // Capture proTeams - ESPN returns this at BOTH top-level (data.proTeams)
      // AND inside settings (data.settings.proTeams) depending on the sport/view.
      // We check both locations and store whichever has data.
      const proTeamsData = data.proTeams || allSettings.proTeams || []
      if (proTeamsData.length > 0) {
        scoringSettings._proTeams = proTeamsData
        console.log('[ESPN getScoringSettings] Found proTeams array:', proTeamsData.length, 'entries')
        console.log('[ESPN getScoringSettings] Sample proTeams:', JSON.stringify(proTeamsData.slice(0, 5)))
      } else {
        console.warn('[ESPN getScoringSettings] proTeams not found in response - will use static mapping')
        console.log('[ESPN getScoringSettings] Top-level data keys:', Object.keys(data || {}))
      }
      
      // Log first scoringItem FULLY to see all available fields
      if (scoringSettings.scoringItems?.length > 0) {
        console.log('[ESPN getScoringSettings] First scoringItem FULL:', JSON.stringify(scoringSettings.scoringItems[0]))
        console.log('[ESPN getScoringSettings] scoringItems count:', scoringSettings.scoringItems.length)
        // Log ALL items with key fields
        console.log('[ESPN getScoringSettings] ALL scoringItems:', scoringSettings.scoringItems.map((item: any, i: number) => {
          return `[${i}] statId=${item.statId} src=${item.statSourceId ?? '?'} pts=${item.pointsOverride ?? '?'} isReverse=${item.isReverseItem ?? '?'}`
        }).join(' | '))
      }
      
      cache.set('espn_scoring', scoringSettings, CACHE_TTL.SETTINGS, cacheKey)
      
      return scoringSettings
    } catch (error) {
      console.error('Error fetching ESPN scoring settings:', error)
      throw error
    }
  }

  /**
   * Get a mapping of ESPN proTeamId -> team abbreviation for this sport/league.
   * Uses the proTeams array from the ESPN settings API response, which is the ONLY
   * reliable source since ESPN uses different non-sequential IDs per sport.
   * Falls back to hardcoded static maps if settings don't include proTeams.
   */
  async getProTeamMap(sport: Sport, leagueId: string | number, season: number): Promise<Record<number, string>> {
    try {
      const scoringSettings = await this.getScoringSettings(sport, leagueId, season)
      const proTeamsArray: any[] = scoringSettings?._proTeams || []
      
      if (proTeamsArray.length > 0) {
        const map: Record<number, string> = {}
        proTeamsArray.forEach((t: any) => {
          if (t.id != null && t.abbrev && t.abbrev !== 'None' && t.abbrev !== 'FA') {
            map[t.id] = t.abbrev
          }
        })
        if (Object.keys(map).length > 0) {
          console.log(`[ESPN getProTeamMap] Built from API: ${Object.keys(map).length} teams for ${sport}`)
          return map
        }
      }
      
      // Fallback to static maps (may have wrong IDs but better than nothing)
      console.warn(`[ESPN getProTeamMap] No API proTeams for ${sport} - using static fallback`)
      return sport === 'baseball' ? MLB_TEAMS :
             sport === 'hockey' ? NHL_TEAMS :
             sport === 'basketball' ? NBA_TEAMS : PRO_TEAMS
    } catch (e) {
      console.error('[ESPN getProTeamMap] Error:', e)
      return {}
    }
  }

  /**
   * Get live scoring for current week
   */
  async getLiveScoring(sport: Sport, leagueId: string | number, season: number, week: number): Promise<any> {
    try {
      const data = await this.apiRequest(
        sport,
        leagueId,
        season,
        [ESPN_VIEWS.LIVE_SCORING, ESPN_VIEWS.SCOREBOARD],
        week
      )
      
      return data
    } catch (error) {
      console.error('Error fetching ESPN live scoring:', error)
      throw error
    }
  }

  // ============================================================
  // Transaction Methods
  // ============================================================

  /**
   * Get transactions for the league
   */
  async getTransactions(sport: Sport, leagueId: string | number, season: number): Promise<any[]> {
    try {
      const data = await this.apiRequest(sport, leagueId, season, [ESPN_VIEWS.TRANSACTIONS])
      
      console.log('[ESPN getTransactions] Response keys:', Object.keys(data))
      console.log('[ESPN getTransactions] Has transactions:', !!data.transactions)
      console.log('[ESPN getTransactions] Transaction count:', data.transactions?.length || 0)
      
      // Debug: Check for alternative transaction locations
      if (!data.transactions && data.communication) {
        console.log('[ESPN getTransactions] Found communication object instead')
      }
      
      return data.transactions || []
    } catch (error) {
      console.error('Error fetching ESPN transactions:', error)
      return []
    }
  }

  // ============================================================
  // Historical Data Methods
  // ============================================================

  /**
   * Get historical data for a league (previous seasons)
   * Note: ESPN keeps the same league ID across seasons
   */
  async getHistoricalSeasons(sport: Sport, leagueId: string | number, fromYear: number, toYear: number): Promise<Map<number, EspnLeague>> {
    const seasons = new Map<number, EspnLeague>()
    
    for (let year = toYear; year >= fromYear; year--) {
      try {
        const league = await this.getLeague(sport, leagueId, year)
        if (league) {
          seasons.set(year, league)
        }
      } catch (error) {
        console.warn(`Could not fetch data for ${year}`)
      }
    }
    
    return seasons
  }

  /**
   * Auto-detect sport for a league by trying each sport code
   * Returns the sport and league info if found
   */
  async detectLeagueSport(leagueId: string | number, season?: number): Promise<{
    sport: Sport
    league: EspnLeague
    error?: string
  } | null> {
    const currentYear = new Date().getFullYear()
    const currentMonth = new Date().getMonth() + 1 // 1-12
    
    // Determine seasons to try based on time of year
    // For sports that haven't started their new season yet, check previous year first
    const seasonsToTry = season ? [season] : [currentYear, currentYear - 1, currentYear - 2]
    
    const sports: Sport[] = ['football', 'baseball', 'basketball', 'hockey']
    
    console.log(`[ESPN] Detecting sport for league ${leagueId}, trying seasons: ${seasonsToTry.join(', ')}...`)
    
    let lastError: string = ''
    let authErrorCount = 0
    let totalAttempts = 0
    let proxyErrorCount = 0
    
    for (const targetSeason of seasonsToTry) {
      for (const sport of sports) {
        totalAttempts++
        try {
          console.log(`[ESPN] Trying ${sport} ${targetSeason}...`)
          const league = await this.getLeague(sport, leagueId, targetSeason)
          if (league) {
            console.log(`[ESPN] SUCCESS - Found league as ${sport} ${targetSeason}: ${league.name}`)
            return { sport, league }
          }
        } catch (error: any) {
          const errorMsg = error.message || ''
          lastError = errorMsg
          console.log(`[ESPN] ${sport} ${targetSeason} error:`, errorMsg)
          
          // 403 means private league in that sport - we found it!
          if (errorMsg.includes('403') || errorMsg.includes('private')) {
            console.log(`[ESPN] League ${leagueId} exists as ${sport} ${targetSeason} but is private`)
            return { 
              sport, 
              league: {
                id: Number(leagueId),
                seasonId: targetSeason,
                scoringPeriodId: 1,
                segmentId: 0,
                name: `Private League ${leagueId}`,
                size: 0,
                isPublic: false,
                scoringType: 'H2H_POINTS',
                currentMatchupPeriod: 1,
                status: {
                  currentMatchupPeriod: 1,
                  isActive: true,
                  latestScoringPeriod: 1,
                  finalScoringPeriod: 17,
                  firstScoringPeriod: 1
                },
                settings: {} as any
              } as EspnLeague
            }
          }
          
          // Track auth/global errors - these affect ALL attempts
          if (errorMsg.includes('Not authenticated') || errorMsg.includes('sign in')) {
            authErrorCount++
            // Fail fast - no point trying more combos if we can't authenticate
            console.error(`[ESPN] Authentication failed - stopping detection. Error: ${errorMsg}`)
            throw new Error('Not authenticated - please sign in to add ESPN leagues.')
          }
          
          if (errorMsg.includes('401') || errorMsg.includes('credentials expired')) {
            authErrorCount++
            // After 2 consecutive auth failures, bail out
            if (authErrorCount >= 2) {
              console.error(`[ESPN] Repeated auth errors (${authErrorCount}) - stopping detection.`)
              throw new Error('ESPN authentication failed. Your session may have expired - please try signing out and back in.')
            }
          }
          
          if (errorMsg.includes('timed out') || errorMsg.includes('AbortError') || errorMsg.includes('Failed to fetch') || errorMsg.includes('NetworkError') || errorMsg.includes('fetch')) {
            proxyErrorCount++
            // After 3 consecutive network errors, bail out
            if (proxyErrorCount >= 3) {
              console.error(`[ESPN] Repeated network/proxy errors (${proxyErrorCount}) - stopping detection.`)
              throw new Error('Unable to reach ESPN API. The proxy service may be down or ESPN may be blocking requests. Please try again in a few minutes.')
            }
          }
          
          // If it's a proxy/server error (500), also track
          if (errorMsg.includes('500') || errorMsg.includes('502') || errorMsg.includes('503')) {
            proxyErrorCount++
            if (proxyErrorCount >= 3) {
              console.error(`[ESPN] Repeated server errors - stopping detection.`)
              throw new Error('ESPN API proxy is returning server errors. Please try again later.')
            }
          }
          
          // 404 or other errors - keep trying
          console.log(`[ESPN] ${sport} ${targetSeason}: not found (${errorMsg})`)
        }
      }
    }
    
    console.log(`[ESPN] Could not find league ${leagueId} in any sport/season combination (tried ${totalAttempts}). Last error: ${lastError}`)
    console.log(`[ESPN] Error summary: auth errors=${authErrorCount}, proxy errors=${proxyErrorCount}`)
    return null
  }

  /**
   * Discover all available seasons for a league
   * Fetches ALL years from current back to 2003 (ESPN fantasy football started ~2004)
   * This gets the full league history regardless of when the user joined
   * Uses parallel batching for speed
   */
  async discoverAllSeasons(sport: Sport, leagueId: string | number): Promise<Array<{
    season: number
    league: EspnLeague
  }>> {
    const currentYear = new Date().getFullYear()
    const seasons: Array<{ season: number; league: EspnLeague }> = []
    
    // ESPN fantasy started around 2003-2004 for football, later for other sports
    const minYear = 2003
    
    console.log(`[ESPN] Discovering all seasons for league ${leagueId} (${currentYear} to ${minYear})...`)
    
    // Build array of years to check
    const yearsToCheck: number[] = []
    for (let year = currentYear; year >= minYear; year--) {
      yearsToCheck.push(year)
    }
    
    // Fetch in parallel batches of 5 for speed (don't overwhelm API)
    const batchSize = 5
    for (let i = 0; i < yearsToCheck.length; i += batchSize) {
      const batch = yearsToCheck.slice(i, i + batchSize)
      
      const results = await Promise.allSettled(
        batch.map(async (year) => {
          try {
            const league = await this.getLeague(sport, leagueId, year)
            return league ? { season: year, league } : null
          } catch {
            return null
          }
        })
      )
      
      // Collect successful results
      for (const result of results) {
        if (result.status === 'fulfilled' && result.value) {
          seasons.push(result.value)
          console.log(`[ESPN] Found season ${result.value.season}: ${result.value.league.name}`)
        }
      }
    }
    
    // Sort by season descending (most recent first)
    seasons.sort((a, b) => b.season - a.season)
    
    console.log(`[ESPN] Discovery complete: found ${seasons.length} seasons`)
    return seasons
  }

  /**
   * Quick discovery - just validate league exists and get current + recent seasons
   * Use this for fast initial add, then call discoverAllSeasons in background
   */
  async quickDiscoverLeague(leagueId: string | number): Promise<{
    sport: Sport
    leagueId: string
    name: string
    isPublic: boolean
    seasons: Array<{
      season: number
      league: EspnLeague
    }>
  } | null> {
    // First detect the sport
    const detected = await this.detectLeagueSport(leagueId)
    if (!detected) {
      return null
    }
    
    const { sport, league } = detected
    const currentYear = new Date().getFullYear()
    
    // If private and we don't have credentials, return minimal info
    if (!league.isPublic && !this.hasCredentials()) {
      return {
        sport,
        leagueId: String(leagueId),
        name: league.name,
        isPublic: false,
        seasons: [{
          season: league.seasonId || currentYear,
          league
        }]
      }
    }
    
    // Quick check: just get last 3 years in parallel (fast!)
    const recentYears = [currentYear, currentYear - 1, currentYear - 2]
    const results = await Promise.allSettled(
      recentYears.map(async (year) => {
        try {
          const l = await this.getLeague(sport, leagueId, year)
          return l ? { season: year, league: l } : null
        } catch {
          return null
        }
      })
    )
    
    const seasons: Array<{ season: number; league: EspnLeague }> = []
    for (const result of results) {
      if (result.status === 'fulfilled' && result.value) {
        seasons.push(result.value)
      }
    }
    
    // Sort by season descending
    seasons.sort((a, b) => b.season - a.season)
    
    // Use most recent season's name
    const name = seasons.length > 0 ? seasons[0].league.name : league.name
    
    return {
      sport,
      leagueId: String(leagueId),
      name,
      isPublic: league.isPublic,
      seasons
    }
  }

  /**
   * Quick discovery - just validate league exists and get basic info
   * This is FAST - only 1 API call per sport until we find it
   */
  async discoverLeague(leagueId: string | number): Promise<{
    sport: Sport
    leagueId: string
    name: string
    isPublic: boolean
    size: number
    currentSeason: number
  } | null> {
    // detectLeagueSport now throws on auth/network errors instead of swallowing them
    // Let those errors propagate up to the caller for proper error messaging
    const detected = await this.detectLeagueSport(leagueId)
    if (!detected) {
      return null
    }
    
    const { sport, league } = detected
    
    return {
      sport,
      leagueId: String(leagueId),
      name: league.name,
      isPublic: league.isPublic,
      size: league.size || 0,
      currentSeason: league.seasonId || new Date().getFullYear()
    }
  }

  /**
   * Full history discovery - call this when loading a league for viewing
   * This runs while the loading spinner is shown
   */
  async discoverFullHistory(sport: Sport, leagueId: string | number): Promise<Array<{
    season: number
    league: EspnLeague
  }>> {
    console.log(`[ESPN] Loading full history for league ${leagueId}...`)
    return this.discoverAllSeasons(sport, leagueId)
  }

  // ============================================================
  // Member/Owner Methods
  // ============================================================

  /**
   * Get league members
   */
  async getMembers(sport: Sport, leagueId: string | number, season: number): Promise<EspnMember[]> {
    try {
      const data = await this.apiRequest(sport, leagueId, season, [ESPN_VIEWS.SETTINGS])
      
      const members: EspnMember[] = (data.members || []).map((m: any) => ({
        id: m.id,
        displayName: m.displayName || 'Unknown',
        firstName: m.firstName || '',
        lastName: m.lastName || '',
        isLeagueManager: m.isLeagueManager || false
      }))
      
      return members
    } catch (error) {
      console.error('Error fetching ESPN members:', error)
      return []
    }
  }

  // ============================================================
  // Parse Methods (Transform ESPN response to our types)
  // ============================================================

  private parseLeague(data: any, sport: Sport): EspnLeague {
    const settings = data.settings || {}
    const status = data.status || {}
    
    // Determine if season is finished
    // ESPN marks seasons as inactive when finished, or we can compare current period to final period
    const finalPeriod = status.finalScoringPeriod || settings.scheduleSettings?.matchupPeriodCount || 25
    const currentPeriod = status.currentMatchupPeriod || 1
    const isActive = status.isActive ?? true
    const isFinished = !isActive || (currentPeriod >= finalPeriod && status.latestScoringPeriod >= finalPeriod)
    
    return {
      id: data.id,
      seasonId: data.seasonId,
      scoringPeriodId: data.scoringPeriodId,
      segmentId: data.segmentId || 0,
      name: settings.name || `League ${data.id}`,
      size: settings.size || data.teams?.length || 0,
      isPublic: settings.isPublic ?? true,
      scoringType: this.mapScoringType(settings.scoringSettings?.scoringType),
      currentMatchupPeriod: status.currentMatchupPeriod || 1,
      status: {
        currentMatchupPeriod: status.currentMatchupPeriod || 1,
        isActive: isActive,
        isFinished: isFinished,
        latestScoringPeriod: status.latestScoringPeriod || 1,
        finalScoringPeriod: finalPeriod,
        finalMatchupPeriod: finalPeriod,
        firstScoringPeriod: status.firstScoringPeriod || 1
      },
      settings: {
        name: settings.name,
        playoffMatchupPeriodLength: settings.scheduleSettings?.playoffMatchupPeriodLength || 1,
        playoffSeedingRule: settings.scheduleSettings?.playoffSeedingRule || 'TOTAL_POINTS_SCORED',
        playoffTeamCount: settings.scheduleSettings?.playoffTeamCount || 6,
        regularSeasonMatchupPeriodCount: settings.scheduleSettings?.matchupPeriodCount || 14,
        rosterSettings: settings.rosterSettings,
        scheduleSettings: settings.scheduleSettings,
        scoringSettings: settings.scoringSettings,
        tradeSettings: settings.tradeSettings
      }
    }
  }

  private parseTeams(data: any): EspnTeam[] {
    const teams = data.teams || []
    const members = data.members || []
    
    // Create member lookup
    const memberMap = new Map<string, any>()
    members.forEach((m: any) => memberMap.set(m.id, m))
    
    console.log('[ESPN parseTeams] Raw teams count:', teams.length)
    console.log('[ESPN parseTeams] Raw members count:', members.length)
    
    // Log first raw team to see structure - look for stat data
    if (teams.length > 0) {
      const firstTeam = teams[0]
      console.log('[ESPN parseTeams] FIRST RAW TEAM KEYS:', Object.keys(firstTeam))
      console.log('[ESPN parseTeams] FIRST RAW TEAM:', JSON.stringify(firstTeam).slice(0, 3000))
      
      // Check for stat-related fields
      if (firstTeam.valuesByStat) {
        console.log('[ESPN parseTeams] FOUND valuesByStat:', JSON.stringify(firstTeam.valuesByStat))
      }
      if (firstTeam.record?.statsByStat) {
        console.log('[ESPN parseTeams] FOUND record.statsByStat:', JSON.stringify(firstTeam.record.statsByStat))
      }
      if (firstTeam.currentSimulationResults) {
        console.log('[ESPN parseTeams] FOUND currentSimulationResults:', JSON.stringify(firstTeam.currentSimulationResults).slice(0, 500))
      }
    }
    
    return teams.map((team: any) => {
      const record = team.record?.overall || {}
      
      // Debug: log record data for each team
      console.log(`[ESPN Team ${team.id}] record:`, team.record)
      console.log(`[ESPN Team ${team.id}] record.overall:`, record)
      console.log(`[ESPN Team ${team.id}] wins=${record.wins}, losses=${record.losses}, pointsFor=${record.pointsFor}, points=${team.points}`)
      
      // Debug: log all available name-related fields
      console.log(`[ESPN Team ${team.id}] Raw data:`, {
        name: team.name,
        location: team.location,
        nickname: team.nickname,
        abbrev: team.abbrev,
        primaryOwner: team.primaryOwner,
        owners: team.owners,
        transactionCounter: team.transactionCounter
      })
      
      // Get team name - ESPN uses different fields for different sports
      // Try multiple approaches to get the team name
      let teamName = ''
      
      // Approach 1: Use 'name' field directly (some ESPN sports use this)
      if (team.name && team.name !== 'undefined' && team.name.trim()) {
        teamName = team.name.trim()
      }
      
      // Approach 2: Combine location + nickname (common for football)
      if (!teamName && (team.location || team.nickname)) {
        const combined = `${team.location || ''} ${team.nickname || ''}`.trim()
        if (combined && combined !== 'undefined undefined') {
          teamName = combined
        }
      }
      
      // Approach 3: Use abbreviation as fallback
      if (!teamName && team.abbrev && team.abbrev !== `T${team.id}`) {
        teamName = team.abbrev
      }
      
      // Approach 4: Use owner's display name
      let ownerName = ''
      const ownerId = team.primaryOwner || team.owners?.[0]
      if (ownerId) {
        const owner = memberMap.get(ownerId)
        if (owner?.displayName) {
          ownerName = owner.displayName
          if (!teamName) {
            teamName = `${owner.displayName}'s Team`
          }
        }
      }
      
      // Final fallback
      if (!teamName) {
        teamName = `Team ${team.id}`
      }
      
      console.log(`[ESPN Team ${team.id}] Final name: "${teamName}", owner: "${ownerName}"`)
      
      // Store the full transactionCounter object (has acquisitions, drops, trades, etc.)
      // or fall back to various locations where it might be stored
      let txCounter = team.transactionCounter || null
      if (!txCounter && team.transactionStatus?.transactionCounter) {
        txCounter = team.transactionStatus.transactionCounter
      }
      if (!txCounter && team.roster?.transactionCounter) {
        txCounter = team.roster.transactionCounter
      }
      
      // Calculate total moves from the object if available
      let totalMoves = 0
      if (txCounter && typeof txCounter === 'object') {
        totalMoves = (txCounter.acquisitions || 0) + (txCounter.drops || 0) + (txCounter.trades || 0)
      } else if (typeof txCounter === 'number') {
        totalMoves = txCounter
      }
      
      console.log(`[ESPN Team ${team.id}] transactionCounter:`, txCounter, 'totalMoves:', totalMoves)
      
      return {
        id: team.id,
        abbrev: team.abbrev || `T${team.id}`,
        name: teamName,
        location: team.location || '',
        nickname: team.nickname || '',
        logo: team.logo || '',
        owners: team.owners || [],
        primaryOwner: team.primaryOwner || team.owners?.[0] || '',
        ownerName: ownerName, // Add owner display name
        points: team.points || 0,
        pointsFor: team.record?.overall?.pointsFor || record.pointsFor || 0,
        pointsAgainst: team.record?.overall?.pointsAgainst || record.pointsAgainst || 0,
        wins: record.wins || 0,
        losses: record.losses || 0,
        ties: record.ties || 0,
        rank: team.playoffSeed || team.rankCalculatedFinal || 0,
        playoffSeed: team.playoffSeed || 0,
        divisionId: team.divisionId || 0,
        transactionCounter: txCounter,
        totalMoves: totalMoves,  // Pre-calculated total for convenience
        record: team.record ? {
          overall: team.record.overall,
          home: team.record.home,
          away: team.record.away,
          division: team.record.division
        } : undefined,
        // Store raw stat values for category league calculations
        valuesByStat: team.valuesByStat || null
      }
    })
  }

  private parseTeamsWithRosters(data: any, sport?: Sport): EspnTeam[] {
    const teams = this.parseTeams(data)
    const rawTeams = data.teams || []
    
    // Add roster data
    teams.forEach((team, index) => {
      const rawTeam = rawTeams[index]
      if (rawTeam?.roster?.entries) {
        team.roster = rawTeam.roster.entries.map((entry: any) => this.parsePlayer(entry, sport))
      }
    })
    
    return teams
  }

  private parsePlayer(entry: any, sport?: Sport): EspnPlayer {
    const playerPoolEntry = entry.playerPoolEntry || {}
    const player = playerPoolEntry.player || {}
    const stats = player.stats || []
    
    // Debug: log available stats structures
    if (stats.length > 0) {
      console.log(`[ESPN parsePlayer] Player ${player.fullName} has ${stats.length} stat entries`)
      stats.forEach((s: any, i: number) => {
        console.log(`  [${i}] statSourceId=${s.statSourceId}, statSplitTypeId=${s.statSplitTypeId}, appliedTotal=${s.appliedTotal}`)
      })
    }
    
    // Find season total stats (statSplitTypeId = 0 is full season, statSourceId = 0 is actual)
    // Try multiple approaches to find the best stats
    const seasonStats = stats.find((s: any) => s.statSourceId === 0 && s.statSplitTypeId === 0) || 
                        stats.find((s: any) => s.statSourceId === 0 && s.appliedTotal > 0) ||
                        stats.find((s: any) => s.statSourceId === 0) || {}
    const projectedStats = stats.find((s: any) => s.statSourceId === 1) || {}
    
    // Get correct team mapping based on sport
    const teamMapping = sport === 'baseball' ? MLB_TEAMS : sport === 'hockey' ? NHL_TEAMS : sport === 'basketball' ? NBA_TEAMS : PRO_TEAMS
    
    return {
      id: entry.playerId,
      playerId: entry.playerId,
      fullName: player.fullName || 'Unknown',
      firstName: player.firstName || '',
      lastName: player.lastName || '',
      proTeam: teamMapping[player.proTeamId] || `Team${player.proTeamId}`,
      proTeamId: player.proTeamId || 0,
      position: this.getPositionName(player.defaultPositionId, sport),
      positionId: player.defaultPositionId || 0,
      lineupSlotId: entry.lineupSlotId,
      lineupSlot: LINEUP_SLOTS[entry.lineupSlotId] || 'Unknown',
      injuryStatus: player.injuryStatus || 'ACTIVE',
      projectedPoints: projectedStats.appliedTotal || 0,
      actualPoints: seasonStats.appliedTotal || 0,
      percentOwned: playerPoolEntry.player?.ownership?.percentOwned || 0,
      percentStarted: playerPoolEntry.player?.ownership?.percentStarted || 0,
      percentChange: playerPoolEntry.player?.ownership?.percentChange || 0,
      averageDraftPosition: playerPoolEntry.player?.ownership?.averageDraftPosition || 0,
      stats: this.flattenStats(seasonStats.stats || {}),
      projectedStats: this.flattenStats(projectedStats.stats || {})
    }
  }

  private parseMatchups(data: any, week: number, scoringType?: string, sport?: Sport): EspnMatchup[] {
    const schedule = data.schedule || []
    console.log('[ESPN parseMatchups] Raw schedule length:', schedule.length, 'for week:', week)
    console.log('[ESPN parseMatchups] Scoring type:', scoringType)
    
    // DEBUG: Log ALL top-level keys in the API response
    console.log('[ESPN parseMatchups] API response top-level keys:', Object.keys(data))
    
    // Check for scoreboard data
    if (data.scoreboard) {
      console.log('[ESPN DEBUG] Found scoreboard data:', JSON.stringify(data.scoreboard).slice(0, 1000))
    }
    
    // Check for teams array with stats
    if (data.teams) {
      console.log('[ESPN DEBUG] Found teams array, length:', data.teams.length)
      if (data.teams[0]) {
        console.log('[ESPN DEBUG] First team keys:', Object.keys(data.teams[0]))
        if (data.teams[0].valuesByStat) {
          console.log('[ESPN DEBUG] First team valuesByStat:', JSON.stringify(data.teams[0].valuesByStat))
        }
      }
    }
    
    // Detect if this is a category league
    // If scoringType is explicitly provided, use it. Otherwise, auto-detect from data.
    let isCategoryLeague = scoringType === 'H2H_CATEGORY'
    
    // Auto-detect: if any matchup has scoreByStat with result fields, it's a category league
    if (!isCategoryLeague && !scoringType && schedule.length > 0) {
      const firstMatch = schedule[0]
      const scoreByStat = firstMatch?.home?.cumulativeScore?.scoreByStat
      if (scoreByStat) {
        const firstStat = Object.values(scoreByStat)[0] as any
        if (firstStat?.result !== undefined) {
          isCategoryLeague = true
          console.log('[ESPN parseMatchups] Auto-detected category league from scoreByStat result fields')
        }
      }
    }
    console.log('[ESPN parseMatchups] Is category league:', isCategoryLeague)
    
    if (schedule.length > 0) {
      console.log('[ESPN parseMatchups] First schedule item:', JSON.stringify(schedule[0]).slice(0, 2000))
      console.log('[ESPN parseMatchups] matchupPeriodIds in data:', [...new Set(schedule.map((m: any) => m.matchupPeriodId))])
      
      // Log category-specific fields if present
      const firstMatch = schedule[0]
      if (firstMatch?.home) {
        console.log('[ESPN parseMatchups] Home team data keys:', Object.keys(firstMatch.home))
        if (firstMatch.home.cumulativeScore) {
          console.log('[ESPN parseMatchups] Home cumulativeScore:', JSON.stringify(firstMatch.home.cumulativeScore))
        }
        if (firstMatch.home.totalWins !== undefined) {
          console.log('[ESPN parseMatchups] Home totalWins:', firstMatch.home.totalWins, 'totalLosses:', firstMatch.home.totalLosses)
        }
        // DEBUG: Check for stat values
        if (firstMatch.home.rosterForMatchupPeriod) {
          console.log('[ESPN DEBUG] home.rosterForMatchupPeriod keys:', Object.keys(firstMatch.home.rosterForMatchupPeriod))
        }
        if (firstMatch.home.rosterForCurrentScoringPeriod) {
          console.log('[ESPN DEBUG] home.rosterForCurrentScoringPeriod keys:', Object.keys(firstMatch.home.rosterForCurrentScoringPeriod))
        }
        if (firstMatch.home.valuesByStat) {
          console.log('[ESPN DEBUG] home.valuesByStat:', JSON.stringify(firstMatch.home.valuesByStat))
        }
        if (firstMatch.home.stats) {
          console.log('[ESPN DEBUG] home.stats:', JSON.stringify(firstMatch.home.stats).slice(0, 500))
        }
      }
      if (firstMatch?.away) {
        console.log('[ESPN parseMatchups] Away team data keys:', Object.keys(firstMatch.away))
        if (firstMatch.away.valuesByStat) {
          console.log('[ESPN DEBUG] away.valuesByStat:', JSON.stringify(firstMatch.away.valuesByStat))
        }
        if (firstMatch.away.stats) {
          console.log('[ESPN DEBUG] away.stats:', JSON.stringify(firstMatch.away.stats).slice(0, 500))
        }
      }
      
      // Log ALL keys on home and away to find where stat values might be hiding
      console.log('[ESPN DEBUG] === FULL HOME OBJECT KEYS ===')
      console.log('[ESPN DEBUG] home keys:', Object.keys(firstMatch.home || {}))
      console.log('[ESPN DEBUG] home full:', JSON.stringify(firstMatch.home, null, 2).slice(0, 2000))
      
      console.log('[ESPN DEBUG] === FULL AWAY OBJECT KEYS ===')  
      console.log('[ESPN DEBUG] away keys:', Object.keys(firstMatch.away || {}))
      console.log('[ESPN DEBUG] away full:', JSON.stringify(firstMatch.away, null, 2).slice(0, 2000))
    }
    
    const teams = this.parseTeams(data)
    const teamMap = new Map(teams.map(t => [t.id, t]))
    
    const filteredSchedule = schedule.filter((match: any) => match.matchupPeriodId === week)
    console.log('[ESPN parseMatchups] Filtered to', filteredSchedule.length, 'matchups for week', week)
    
    // Deduplicate matchups by ID (ESPN sometimes returns duplicates)
    const seenIds = new Set<number>()
    const uniqueMatchups = filteredSchedule.filter((match: any) => {
      if (seenIds.has(match.id)) {
        return false
      }
      seenIds.add(match.id)
      return true
    })
    console.log('[ESPN parseMatchups] After dedup:', uniqueMatchups.length, 'unique matchups')
    
    return uniqueMatchups
      .map((match: any) => {
        // For H2H Category leagues, extract category wins/losses
        // ESPN stores these in various places depending on the response
        let homeCategoryWins = 0
        let awayCategoryWins = 0
        let homeCategoryLosses = 0
        let awayCategoryLosses = 0
        let homeCategoryTies = 0
        let awayCategoryTies = 0
        
        // Store per-category results for real category tracking
        let homePerCategoryResults: Record<string, 'WIN' | 'LOSS' | 'TIE'> = {}
        let awayPerCategoryResults: Record<string, 'WIN' | 'LOSS' | 'TIE'> = {}
        
        if (isCategoryLeague) {
          // BEST METHOD: cumulativeScore.scoreByStat has per-category results!
          // Each stat has: { result: "WIN" | "LOSS" | "TIE" | null, score: number }
          if (match.home?.cumulativeScore?.scoreByStat) {
            const scoreByStat = match.home.cumulativeScore.scoreByStat
            console.log('[ESPN parseMatchups] Found scoreByStat for home team, processing', Object.keys(scoreByStat).length, 'stats')
            for (const [statId, statData] of Object.entries(scoreByStat)) {
              const data = statData as { result: string | null; score: number }
              if (data.result === 'WIN') {
                homeCategoryWins++
                homePerCategoryResults[statId] = 'WIN'
              } else if (data.result === 'LOSS') {
                homeCategoryLosses++
                homePerCategoryResults[statId] = 'LOSS'
              } else if (data.result === 'TIE') {
                homeCategoryTies++
                homePerCategoryResults[statId] = 'TIE'
              }
            }
            console.log('[ESPN parseMatchups] Extracted homePerCategoryResults:', Object.keys(homePerCategoryResults).length, 'categories with results')
          }
          
          if (match.away?.cumulativeScore?.scoreByStat) {
            const scoreByStat = match.away.cumulativeScore.scoreByStat
            for (const [statId, statData] of Object.entries(scoreByStat)) {
              const data = statData as { result: string | null; score: number }
              if (data.result === 'WIN') {
                awayCategoryWins++
                awayPerCategoryResults[statId] = 'WIN'
              } else if (data.result === 'LOSS') {
                awayCategoryLosses++
                awayPerCategoryResults[statId] = 'LOSS'
              } else if (data.result === 'TIE') {
                awayCategoryTies++
                awayPerCategoryResults[statId] = 'TIE'
              }
            }
          }
          
          // Fallback: Check for totalWins/totalLosses directly on home/away
          if (homeCategoryWins === 0 && match.home?.totalWins !== undefined) {
            homeCategoryWins = match.home.totalWins || 0
            homeCategoryLosses = match.home.totalLosses || 0
            homeCategoryTies = match.home.totalTies || 0
          }
          if (awayCategoryWins === 0 && match.away?.totalWins !== undefined) {
            awayCategoryWins = match.away.totalWins || 0
            awayCategoryLosses = match.away.totalLosses || 0
            awayCategoryTies = match.away.totalTies || 0
          }
          
          // Fallback: Check cumulativeScore.wins/losses (old method)
          if (homeCategoryWins === 0 && match.home?.cumulativeScore?.wins !== undefined) {
            homeCategoryWins = match.home.cumulativeScore.wins || 0
            homeCategoryLosses = match.home.cumulativeScore.losses || 0
            homeCategoryTies = match.home.cumulativeScore.ties || 0
          }
          if (awayCategoryWins === 0 && match.away?.cumulativeScore?.wins !== undefined) {
            awayCategoryWins = match.away.cumulativeScore.wins || 0
            awayCategoryLosses = match.away.cumulativeScore.losses || 0
            awayCategoryTies = match.away.cumulativeScore.ties || 0
          }
          
          console.log(`[ESPN parseMatchups] Category matchup: Home ${homeCategoryWins}-${homeCategoryLosses}-${homeCategoryTies}, Away ${awayCategoryWins}-${awayCategoryLosses}-${awayCategoryTies}`)
          if (Object.keys(homePerCategoryResults).length > 0) {
            console.log(`[ESPN parseMatchups] Per-category results found! Home wins in:`, 
              Object.entries(homePerCategoryResults).filter(([_, r]) => r === 'WIN').map(([id]) => id))
          }
        }
        
        // Extract stat values from all available sources
        const homeValuesByStat = match.home?.valuesByStat || null
        const awayValuesByStat = match.away?.valuesByStat || null
        
        // Get roster entries for player-level stat aggregation (fallback)
        const homeRosterEntries = match.home?.rosterForMatchupPeriod?.entries || 
                                   match.home?.rosterForCurrentScoringPeriod?.entries || null
        const awayRosterEntries = match.away?.rosterForMatchupPeriod?.entries ||
                                   match.away?.rosterForCurrentScoringPeriod?.entries || null
        
        if (isCategoryLeague) {
          console.log(`[ESPN parseMatchups] Matchup ${match.home?.teamId} vs ${match.away?.teamId}:`,
            `scoreByStat=${match.home?.cumulativeScore?.scoreByStat ? 'YES' : 'null'},`,
            `homeValuesByStat=${homeValuesByStat ? Object.keys(homeValuesByStat).length + ' stats' : 'null'},`,
            `homeRoster=${homeRosterEntries ? homeRosterEntries.length + ' entries' : 'null'}`)
        }
        
        // Calculate projected points for points leagues
        // Primary source: ESPN's team-level projected points (most reliable)
        // Fallback: sum projected points from individual roster entries
        const homeProjectedRaw = match.home?.totalProjectedPointsLive
        const awayProjectedRaw = match.away?.totalProjectedPointsLive
        
        let homeProjectedPoints = typeof homeProjectedRaw === 'number' ? homeProjectedRaw : 0
        let awayProjectedPoints = typeof awayProjectedRaw === 'number' ? awayProjectedRaw : 0
        
        // If no team-level projections, calculate from roster entries
        if (!homeProjectedPoints && homeRosterEntries) {
          homeProjectedPoints = this.sumProjectedPointsFromRoster(homeRosterEntries, sport)
        }
        if (!awayProjectedPoints && awayRosterEntries) {
          awayProjectedPoints = this.sumProjectedPointsFromRoster(awayRosterEntries, sport)
        }
        
        return {
          id: match.id,
          matchupPeriodId: match.matchupPeriodId,
          homeTeamId: match.home?.teamId || 0,
          awayTeamId: match.away?.teamId || 0,
          homeTeam: teamMap.get(match.home?.teamId),
          awayTeam: teamMap.get(match.away?.teamId),
          homeScore: match.home?.totalPoints || 0,
          awayScore: match.away?.totalPoints || 0,
          // Category league specific
          homeCategoryWins: isCategoryLeague ? homeCategoryWins : undefined,
          awayCategoryWins: isCategoryLeague ? awayCategoryWins : undefined,
          homeCategoryLosses: isCategoryLeague ? homeCategoryLosses : undefined,
          awayCategoryLosses: isCategoryLeague ? awayCategoryLosses : undefined,
          homeCategoryTies: isCategoryLeague ? homeCategoryTies : undefined,
          awayCategoryTies: isCategoryLeague ? awayCategoryTies : undefined,
          // Per-category results (WIN/LOSS/TIE for each stat ID)
          homePerCategoryResults: Object.keys(homePerCategoryResults).length > 0 ? homePerCategoryResults : undefined,
          awayPerCategoryResults: Object.keys(awayPerCategoryResults).length > 0 ? awayPerCategoryResults : undefined,
          // Raw stat values (for display in matchups page)
          homeScoreByStat: match.home?.cumulativeScore?.scoreByStat,
          awayScoreByStat: match.away?.cumulativeScore?.scoreByStat,
          // Match-level valuesByStat (matchup period cumulative stats)
          homeValuesByStat: homeValuesByStat,
          awayValuesByStat: awayValuesByStat,
          // Roster entries for player-level aggregation
          homeRosterEntries: homeRosterEntries,
          awayRosterEntries: awayRosterEntries,
          isCategoryLeague,
          homeProjectedPoints: homeProjectedPoints || undefined,
          awayProjectedPoints: awayProjectedPoints || undefined,
          winner: this.determineWinner(match),
          playoffTierType: match.playoffTierType || 'NONE'
        }
      })
  }

  // Sum projected fantasy points from roster entries (starters only, excluding bench/IR)
  private sumProjectedPointsFromRoster(entries: any[], sport?: Sport): number {
    if (!entries || entries.length === 0) return 0
    
    // Inactive/bench slot names across all sports
    const INACTIVE_SLOTS = new Set(['BE', 'Bench', 'IR', 'IL', 'IL+', 'NA', 'DL'])
    const slotMapping = sport === 'baseball' ? BASEBALL_LINEUP_SLOTS : LINEUP_SLOTS
    
    let total = 0
    for (const entry of entries) {
      const slotName = slotMapping[entry.lineupSlotId] || ''
      if (INACTIVE_SLOTS.has(slotName)) continue
      
      const player = entry.playerPoolEntry?.player
      if (!player?.stats) continue
      
      // Find projected stats (statSourceId === 1) for the current period
      // Prefer matchup-period projection, fall back to any projection
      const projStats = player.stats.find((s: any) => s.statSourceId === 1 && s.appliedTotal > 0) ||
                        player.stats.find((s: any) => s.statSourceId === 1)
      if (projStats?.appliedTotal) {
        total += projStats.appliedTotal
      }
    }
    return Math.round(total * 100) / 100
  }

  private parseDraft(data: any, sport?: string): EspnDraftPick[] {
    const draftDetail = data.draftDetail || {}
    const picks = draftDetail.picks || []
    const teamMapping = sport === 'baseball' ? MLB_TEAMS : sport === 'hockey' ? NHL_TEAMS : sport === 'basketball' ? NBA_TEAMS : PRO_TEAMS
    
    // Build player lookup from players array if available (from PLAYER_INFO view)
    const playerLookup = new Map<number, { name: string; position: string; team: string; eligiblePositions: string[] }>()
    if (data.players && Array.isArray(data.players)) {
      console.log('[ESPN parseDraft] Found', data.players.length, 'players in response')
      for (const entry of data.players) {
        const player = entry.player || entry
        if (player.id) {
          // Get eligible positions from eligibleSlots array
          const eligibleSlots = player.eligibleSlots || []
          const slotMapping = sport === 'baseball' ? BASEBALL_LINEUP_SLOTS : LINEUP_SLOTS
          
          // Convert slot IDs to position names, filtering out bench/IR/utility slots for the main eligibility list
          const excludedSlots = ['BE', 'IR', 'IL', 'IL+', 'NA', 'UTIL', 'FLEX', 'OP', 'Rookie']
          const eligiblePositions = eligibleSlots
            .map((slotId: number) => slotMapping[slotId])
            .filter((pos: string | undefined) => pos && !excludedSlots.includes(pos))
          
          // Remove duplicates
          const uniquePositions = [...new Set(eligiblePositions)] as string[]
          
          playerLookup.set(player.id, {
            name: player.fullName || `${player.firstName || ''} ${player.lastName || ''}`.trim() || `Player ${player.id}`,
            position: this.getPositionName(player.defaultPositionId, sport),
            team: teamMapping[player.proTeamId] || 'FA',
            eligiblePositions: uniquePositions.length > 0 ? uniquePositions : [this.getPositionName(player.defaultPositionId, sport)]
          })
        }
      }
      console.log('[ESPN parseDraft] Built player lookup with', playerLookup.size, 'players')
    }
    
    // Log first pick to see structure
    if (picks.length > 0) {
      console.log('[ESPN parseDraft] First raw pick:', JSON.stringify(picks[0]).slice(0, 300))
      console.log('[ESPN parseDraft] Total picks:', picks.length)
    }
    
    return picks.map((pick: any) => {
      // Try multiple sources for player info
      let playerName = `Player ${pick.playerId}`
      let position = 'Unknown'
      let positionId = 0
      let proTeam = ''
      let eligiblePositions: string[] = []
      
      // Source 1: Check player lookup from response
      const lookupInfo = playerLookup.get(pick.playerId)
      if (lookupInfo) {
        playerName = lookupInfo.name
        position = lookupInfo.position
        proTeam = lookupInfo.team
        eligiblePositions = lookupInfo.eligiblePositions || []
      }
      
      // Source 2: Check if pick has playerName directly
      if (pick.playerName && !pick.playerName.startsWith('Player ')) {
        playerName = pick.playerName
      }
      
      // Source 3: Check if pick has nested player object
      if (pick.player) {
        if (pick.player.fullName) {
          playerName = pick.player.fullName
        }
        positionId = pick.player.defaultPositionId || 0
        position = this.getPositionName(positionId, sport)
        proTeam = teamMapping[pick.player.proTeamId] || proTeam
        
        // Also check for eligibleSlots in the nested player object
        if (pick.player.eligibleSlots && pick.player.eligibleSlots.length > 0) {
          const slotMapping = sport === 'baseball' ? BASEBALL_LINEUP_SLOTS : LINEUP_SLOTS
          const excludedSlots = ['BE', 'IR', 'IL', 'IL+', 'NA', 'UTIL', 'FLEX', 'OP', 'Rookie']
          const positions = pick.player.eligibleSlots
            .map((slotId: number) => slotMapping[slotId])
            .filter((pos: string | undefined) => pos && !excludedSlots.includes(pos))
          eligiblePositions = [...new Set(positions)] as string[]
        }
      }
      
      // Source 4: Check direct properties on pick
      if (pick.defaultPositionId && position === 'Unknown') {
        positionId = pick.defaultPositionId
        position = this.getPositionName(positionId, sport)
      }
      
      // Fallback: if no eligible positions found, use the default position
      if (eligiblePositions.length === 0 && position !== 'Unknown') {
        eligiblePositions = [position]
      }
      
      return {
        id: pick.id,
        roundId: pick.roundId,
        roundPickNumber: pick.roundPickNumber,
        overallPickNumber: pick.overallPickNumber,
        playerId: pick.playerId,
        playerName,
        position,
        positionId,
        eligiblePositions,
        proTeam,
        teamId: pick.teamId,
        keeper: pick.keeper || false,
        bidAmount: pick.bidAmount
      }
    })
  }

  // ============================================================
  // Helper Methods
  // ============================================================

  private mapScoringType(type: string): EspnLeague['scoringType'] {
    switch (type) {
      case 'H2H_POINTS':
        return 'H2H_POINTS'
      case 'H2H_CATEGORY':
        return 'H2H_CATEGORY'
      case 'ROTO':
        return 'ROTO'
      case 'TOTAL_POINTS':
        return 'TOTAL_POINTS'
      default:
        return 'H2H_POINTS'
    }
  }

  private getPositionName(positionId: number, sport?: string): string {
    // Football positions
    const footballPositions: Record<number, string> = {
      1: 'QB', 2: 'RB', 3: 'WR', 4: 'TE', 5: 'K',
      6: 'P', 7: 'HC', 8: 'DT', 9: 'DE', 10: 'LB',
      11: 'CB', 12: 'S', 13: 'DB', 14: 'DP', 15: 'DL',
      16: 'D/ST', 17: 'K', 18: 'P', 19: 'HC'
    }
    
    // Baseball positions
    const baseballPositions: Record<number, string> = {
      1: 'SP', 2: 'C', 3: '1B', 4: '2B', 5: '3B',
      6: 'SS', 7: 'LF', 8: 'CF', 9: 'RF', 10: 'DH',
      11: 'RP', 12: 'P', 13: 'OF', 14: 'UTIL'
    }
    
    // Basketball positions
    const basketballPositions: Record<number, string> = {
      1: 'PG', 2: 'SG', 3: 'SF', 4: 'PF', 5: 'C',
      6: 'G', 7: 'F', 8: 'SG/SF', 9: 'G/F', 10: 'PF/C',
      11: 'F/C', 12: 'UTIL'
    }
    
    // Hockey positions
    const hockeyPositions: Record<number, string> = {
      1: 'C', 2: 'LW', 3: 'RW', 4: 'D', 5: 'G',
      6: 'F', 7: 'UTIL'
    }
    
    // Return based on sport context or try all
    if (sport === 'baseball' || sport === 'flb') {
      return baseballPositions[positionId] || 'Unknown'
    } else if (sport === 'basketball' || sport === 'fba') {
      return basketballPositions[positionId] || 'Unknown'
    } else if (sport === 'hockey' || sport === 'fhl') {
      return hockeyPositions[positionId] || 'Unknown'
    } else if (sport === 'football' || sport === 'ffl') {
      return footballPositions[positionId] || 'Unknown'
    }
    
    // Try to match from any sport if no sport specified
    return footballPositions[positionId] || baseballPositions[positionId] || 'Unknown'
  }

  private determineWinner(match: any): EspnMatchup['winner'] {
    // Method 1: ESPN's direct winner field is the most reliable — always trust it first
    if (match.winner) {
      const winner = match.winner.toString().toUpperCase()
      if (winner === 'HOME') return 'HOME'
      if (winner === 'AWAY') return 'AWAY'
      if (winner === 'TIE') return 'TIE'
      if (winner === 'UNDECIDED') return 'UNDECIDED'
    }

    // Method 2: cumulativeScore — only use when matchup is definitively finished.
    // ESPN populates cumulativeScore.wins during in-progress matchups too (e.g. extended
    // first weeks), so we must NOT use this unless ESPN has already decided a winner.
    // Since Method 1 already returned if a winner was decided, reaching here means
    // ESPN says UNDECIDED or no winner field — treat as in progress.
    
    // Method 3: totalPoints for points leagues — but only if both sides have scored
    // AND the matchup looks complete (non-zero scores on both sides suggest in-progress)
    // For category leagues, skip this to avoid false results mid-week
    const homeScore = match.home?.totalPoints || 0
    const awayScore = match.away?.totalPoints || 0

    // If both sides have zero, definitely undecided
    if (homeScore === 0 && awayScore === 0) return 'UNDECIDED'

    // Check if this looks like a points league matchup that is complete
    // For category leagues totalPoints is often 0 so this won't fire incorrectly
    if (homeScore > 0 || awayScore > 0) {
      // Only use points to determine winner if ESPN hasn't given us cumulativeScore
      // (which would indicate a category league with an in-progress matchup)
      const hasCumulativeScore = match.home?.cumulativeScore !== undefined
      if (!hasCumulativeScore) {
        if (homeScore > awayScore) return 'HOME'
        if (awayScore > homeScore) return 'AWAY'
        return 'TIE'
      }
    }

    // Default: undecided — ESPN hasn't settled this matchup yet
    return 'UNDECIDED'
  }

  private flattenStats(stats: Record<string, number>): Record<string, number> {
    // ESPN returns stats as { "0": 123, "1": 456 } where keys are stat IDs
    // We keep them as-is for now, can map to names if needed
    return stats
  }

  // ============================================================
  // Category League Methods
  // ============================================================

  /**
   * Get detailed matchup data with stat-by-stat breakdown for category leagues
   * Uses mBoxscore view to get individual stat values for comparison
   */
  async getMatchupWithStats(sport: Sport, leagueId: string | number, season: number, week: number): Promise<any> {
    try {
      // Request matchup with scoreboard, live scoring for stat details
      const data = await this.apiRequest(
        sport,
        leagueId,
        season,
        [ESPN_VIEWS.MATCHUP, ESPN_VIEWS.MATCHUP_SCORE, ESPN_VIEWS.SCOREBOARD, ESPN_VIEWS.LIVE_SCORING],
        week
      )
      
      // Debug: Log all available data to find stat values
      console.log('[ESPN getMatchupWithStats] Week', week, 'API response keys:', Object.keys(data))
      
      // Check teams array for stat data
      if (data.teams && data.teams.length > 0) {
        const firstTeam = data.teams[0]
        console.log('[ESPN getMatchupWithStats] First team keys:', Object.keys(firstTeam))
        if (firstTeam.valuesByStat) {
          console.log('[ESPN getMatchupWithStats] FOUND team valuesByStat:', JSON.stringify(firstTeam.valuesByStat))
        }
      }
      
      // Check schedule for stat data
      if (data.schedule && data.schedule.length > 0) {
        const firstMatch = data.schedule[0]
        console.log('[ESPN getMatchupWithStats] First schedule item keys:', Object.keys(firstMatch))
        if (firstMatch.home) {
          console.log('[ESPN getMatchupWithStats] home keys:', Object.keys(firstMatch.home))
          // Look for any stat-related fields
          for (const key of Object.keys(firstMatch.home)) {
            if (key.toLowerCase().includes('stat') || key.toLowerCase().includes('value') || key.toLowerCase().includes('score')) {
              console.log(`[ESPN getMatchupWithStats] home.${key}:`, JSON.stringify(firstMatch.home[key]).slice(0, 500))
            }
          }
        }
      }
      
      return data
    } catch (error) {
      console.error('[ESPN] Error fetching matchup with stats:', error)
      throw error
    }
  }
  
  /**
   * Get team stats for a specific week - tries to find actual stat values
   */
  async getTeamStatsForWeek(sport: Sport, leagueId: string | number, season: number, week: number): Promise<Map<number, Record<string, number>>> {
    const teamStats = new Map<number, Record<string, number>>()
    
    try {
      // Try fetching with mLiveScoring which should have stat values
      const data = await this.apiRequest(
        sport,
        leagueId,
        season,
        [ESPN_VIEWS.TEAM, ESPN_VIEWS.LIVE_SCORING, ESPN_VIEWS.SCOREBOARD],
        week
      )
      
      console.log('[ESPN getTeamStatsForWeek] Week', week, 'response keys:', Object.keys(data))
      
      // Check for teams with stats
      if (data.teams) {
        for (const team of data.teams) {
          if (team.valuesByStat) {
            console.log(`[ESPN getTeamStatsForWeek] Team ${team.id} has valuesByStat:`, JSON.stringify(team.valuesByStat).slice(0, 200))
            teamStats.set(team.id, team.valuesByStat)
          }
        }
      }
      
      // Also check schedule for team stats
      if (data.schedule) {
        for (const match of data.schedule) {
          if (match.home?.valuesByStat) {
            console.log(`[ESPN getTeamStatsForWeek] Match home team has valuesByStat`)
            teamStats.set(match.home.teamId, match.home.valuesByStat)
          }
          if (match.away?.valuesByStat) {
            console.log(`[ESPN getTeamStatsForWeek] Match away team has valuesByStat`)
            teamStats.set(match.away.teamId, match.away.valuesByStat)
          }
        }
      }
      
      return teamStats
    } catch (error) {
      console.error('[ESPN getTeamStatsForWeek] Error:', error)
      return teamStats
    }
  }

  /**
   * Get category stats breakdown for H2H Category leagues
   * Aggregates category wins per team across all completed matchups
   * Now calculates REAL per-category wins by comparing stat values
   */
  async getCategoryStatsBreakdown(sport: Sport, leagueId: string | number, season: number): Promise<{
    categories: Array<{ stat_id: string; name: string; display_name: string; is_negative?: boolean }>;
    teamCategoryWins: Map<string, Record<string, number>>;
    teamCategoryLosses: Map<string, Record<string, number>>;
    teamCategoryTies: Map<string, Record<string, number>>;
    teamTotalCategoryWins: Map<string, number>;
    teamTotalCategoryLosses: Map<string, number>;
    hasRealStatValues: boolean;
  }> {
    console.log('[ESPN getCategoryStatsBreakdown] Starting for league', leagueId, 'sport:', sport)
    
    // Get league info to determine scoring type and total weeks
    const league = await this.getLeague(sport, leagueId, season)
    if (!league) {
      throw new Error('Could not fetch league info')
    }
    
    // Verify this is a category league
    if (league.scoringType !== 'H2H_CATEGORY') {
      console.warn('[ESPN getCategoryStatsBreakdown] Not a category league, scoringType:', league.scoringType)
    }
    
    // Get scoring settings for stat categories
    const scoringSettings = await this.getScoringSettings(sport, leagueId, season)
    
    // Extract stat categories from scoring settings
    // ESPN stores these in scoringItems array
    const scoringItems = scoringSettings?.scoringItems || []
    console.log('[ESPN getCategoryStatsBreakdown] Scoring items count:', scoringItems.length)
    
    // Map ESPN stat IDs to names - Baseball (comprehensive list)
    const espnBaseballStatNames: Record<number, { name: string; display: string; isNegative?: boolean }> = {
      // Batting stats
      0: { name: 'At Bats', display: 'AB' },
      1: { name: 'Hits', display: 'H' },
      2: { name: 'Runs', display: 'R' },
      3: { name: 'Home Runs', display: 'HR' },
      4: { name: 'RBI', display: 'RBI' },
      5: { name: 'Stolen Bases', display: 'SB' },
      6: { name: 'Walks (Batting)', display: 'BB' },
      7: { name: 'Strikeouts (Batting)', display: 'K', isNegative: true },
      8: { name: 'OPS', display: 'OPS' },
      9: { name: 'On Base Percentage', display: 'OBP' },
      10: { name: 'Slugging Percentage', display: 'SLG' },
      11: { name: 'Batting Average', display: 'AVG' },
      12: { name: 'Grounded Into DP', display: 'GIDP', isNegative: true },
      13: { name: 'Singles', display: '1B' },
      14: { name: 'Doubles', display: '2B' },
      15: { name: 'Triples', display: '3B' },
      16: { name: 'Extra Base Hits', display: 'XBH' },
      17: { name: 'Plate Appearances', display: 'PA' },
      18: { name: 'Games', display: 'G' },
      19: { name: 'Total Bases', display: 'TB' },
      20: { name: "Fielder's Choice", display: 'FC' },
      21: { name: 'Fielding Percentage', display: 'FPCT' },
      22: { name: 'Sac Bunts', display: 'SAC' },
      23: { name: 'RBI', display: 'RBI' },
      24: { name: 'Errors', display: 'E', isNegative: true },
      25: { name: 'Hit By Pitch', display: 'HBP' },
      26: { name: 'Intentional Walks', display: 'IBB' },
      27: { name: 'Outfield Assists', display: 'OFAST' },
      28: { name: 'Double Plays Turned', display: 'DP' },
      29: { name: 'Putouts', display: 'PO' },
      30: { name: 'Assists', display: 'A' },
      31: { name: 'Total Chances', display: 'TC' },
      32: { name: 'Runs', display: 'R' },
      33: { name: 'Home Runs', display: 'HR' },
      34: { name: 'Total Bases', display: 'TB' },
      // Pitching stats
      35: { name: 'Wins', display: 'W' },
      36: { name: 'Losses', display: 'L', isNegative: true },
      37: { name: 'Saves', display: 'SV' },
      38: { name: 'Holds', display: 'HD' },
      39: { name: 'Innings Pitched', display: 'IP' },
      40: { name: 'Earned Runs', display: 'ER', isNegative: true },
      41: { name: 'Innings Pitched', display: 'IP' },
      42: { name: 'Earned Runs', display: 'ER', isNegative: true },
      43: { name: 'Strikeouts (Pitching)', display: 'K' },
      44: { name: 'Complete Games', display: 'CG' },
      45: { name: 'Shutouts', display: 'SHO' },
      46: { name: 'No Hitters', display: 'NH' },
      47: { name: 'ERA', display: 'ERA', isNegative: true },
      48: { name: 'WHIP', display: 'WHIP', isNegative: true },
      49: { name: 'Hits Allowed', display: 'HA', isNegative: true },
      50: { name: 'Runs Allowed', display: 'RA', isNegative: true },
      51: { name: 'Home Runs Allowed', display: 'HRA', isNegative: true },
      52: { name: 'Walks Allowed', display: 'BBI', isNegative: true },
      53: { name: 'Games Started', display: 'GS' },
      54: { name: 'Pitches Thrown', display: 'PC' },
      55: { name: 'Pickoffs', display: 'PKO' },
      56: { name: 'Wild Pitches', display: 'WP', isNegative: true },
      57: { name: 'Blown Saves', display: 'BS', isNegative: true },
      58: { name: 'Relief Wins', display: 'RW' },
      59: { name: 'Relief Losses', display: 'RL', isNegative: true },
      60: { name: 'Save Opportunities', display: 'SVO' },
      61: { name: 'Inherited Runners Scored', display: 'IRS', isNegative: true },
      62: { name: 'Strikeout to Walk Ratio', display: 'K/BB' },
      63: { name: 'Quality Starts', display: 'QS' },
      64: { name: 'Hit Batters', display: 'HB', isNegative: true },
      65: { name: 'Balks', display: 'BK', isNegative: true },
      66: { name: 'Ground Outs', display: 'GO' },
      67: { name: 'Batters Faced', display: 'BF' },
      68: { name: 'K/9', display: 'K/9' },
      69: { name: 'BB/9', display: 'BB/9', isNegative: true },
      70: { name: 'H/9', display: 'H/9', isNegative: true },
      71: { name: 'Saves + Holds', display: 'SVHD' },
      72: { name: 'Relief Appearances', display: 'RAPP' },
      73: { name: 'Total Bases Allowed', display: 'TBA', isNegative: true },
      74: { name: 'Win Percentage', display: 'W%' },
      75: { name: 'Losses (Pitching)', display: 'L', isNegative: true },
      76: { name: 'BABIP', display: 'BABIP' },
      77: { name: 'FIP', display: 'FIP', isNegative: true },
      78: { name: 'xFIP', display: 'xFIP', isNegative: true },
      79: { name: 'WAR (Batting)', display: 'WAR' },
      80: { name: 'WAR (Pitching)', display: 'WAR' },
      81: { name: 'wOBA', display: 'wOBA' },
      82: { name: 'wRC+', display: 'wRC+' },
      83: { name: 'Opponent Batting Avg', display: 'OBA', isNegative: true },
      99: { name: 'Games Pitched', display: 'GP' }
    }
    
    // Map ESPN stat IDs to names - Hockey
    const espnHockeyStatNames: Record<number, { name: string; display: string; isNegative?: boolean }> = {
      0: { name: 'Goals', display: 'G' },
      1: { name: 'Assists', display: 'A' },
      2: { name: 'Points', display: 'PTS' },
      3: { name: 'Plus/Minus', display: '+/-' },
      4: { name: 'Penalty Minutes', display: 'PIM' },
      5: { name: 'Powerplay Goals', display: 'PPG' },
      6: { name: 'Powerplay Assists', display: 'PPA' },
      7: { name: 'Powerplay Points', display: 'PPP' },
      8: { name: 'Shorthanded Goals', display: 'SHG' },
      9: { name: 'Shorthanded Assists', display: 'SHA' },
      10: { name: 'Shorthanded Points', display: 'SHP' },
      11: { name: 'Game-Winning Goals', display: 'GWG' },
      12: { name: 'Shots on Goal', display: 'SOG' },
      13: { name: 'Shooting Percentage', display: 'SH%' },
      14: { name: 'Faceoffs Won', display: 'FOW' },
      15: { name: 'Faceoffs Lost', display: 'FOL', isNegative: true },
      16: { name: 'Hits', display: 'HIT' },
      17: { name: 'Blocks', display: 'BLK' },
      18: { name: 'Takeaways', display: 'TK' },
      19: { name: 'Wins', display: 'W' },
      20: { name: 'Losses', display: 'L', isNegative: true },
      21: { name: 'Goals Against', display: 'GA', isNegative: true },
      22: { name: 'Goals Against Average', display: 'GAA', isNegative: true },
      23: { name: 'Saves', display: 'SV' },
      24: { name: 'Save Percentage', display: 'SV%' },
      25: { name: 'Shutouts', display: 'SHO' },
      26: { name: 'Overtime Losses', display: 'OTL' },
      27: { name: 'Games Started', display: 'GS' },
      28: { name: 'Giveaways', display: 'GV', isNegative: true },
      29: { name: 'Avg Time on Ice', display: 'ATOI' },
      30: { name: 'Games Played', display: 'GP' },
      31: { name: 'Hat Tricks', display: 'HAT' },
      32: { name: 'Defensemen Points', display: 'DEF' },
      33: { name: 'Special Teams Points', display: 'STP' },
      34: { name: 'Faceoff Win Pct', display: 'FO%' },
      35: { name: 'Minutes', display: 'MIN' },
      36: { name: 'Shots', display: 'SH' },
      37: { name: 'Goalie Wins', display: 'GW' },
      38: { name: 'Shots Against', display: 'SA' },
      39: { name: 'Goals Saved Above Avg', display: 'GSAA' }
    }
    
    // Map ESPN stat IDs to names - Basketball
    // These IDs match ESPN's Fantasy Basketball API stat IDs
    const espnBasketballStatNames: Record<number, { name: string; display: string; isNegative?: boolean }> = {
      0: { name: 'Points', display: 'PTS' },
      1: { name: 'Blocks', display: 'BLK' },
      2: { name: 'Steals', display: 'STL' },
      3: { name: 'Assists', display: 'AST' },
      4: { name: 'Offensive Rebounds', display: 'OREB' },
      5: { name: 'Defensive Rebounds', display: 'DREB' },
      6: { name: 'Rebounds', display: 'REB' },
      7: { name: 'Ejections', display: 'EJ', isNegative: true },
      8: { name: 'Flagrant Fouls', display: 'FF', isNegative: true },
      9: { name: 'Personal Fouls', display: 'PF', isNegative: true },
      10: { name: 'Technical Fouls', display: 'TF', isNegative: true },
      11: { name: 'Turnovers', display: 'TO', isNegative: true },
      12: { name: 'Disqualifications', display: 'DQ', isNegative: true },
      13: { name: 'Field Goals Made', display: 'FGM' },
      14: { name: 'Field Goals Attempted', display: 'FGA' },
      15: { name: 'Free Throws Made', display: 'FTM' },
      16: { name: 'Free Throws Attempted', display: 'FTA' },
      17: { name: '3-Pointers Made', display: '3PM' },
      18: { name: '3-Pointers Attempted', display: '3PA' },
      19: { name: 'Field Goal Pct', display: 'FG%' },
      20: { name: 'Free Throw Pct', display: 'FT%' },
      21: { name: '3-Point Pct', display: '3P%' },
      37: { name: 'Double-Doubles', display: 'DD' },
      38: { name: 'Triple-Doubles', display: 'TD' },
      40: { name: 'Games Played', display: 'GP' },
      41: { name: 'Minutes', display: 'MIN' },
      42: { name: 'Games Started', display: 'GS' }
    }
    
    // Select the appropriate stat names based on sport
    const statNames = sport === 'hockey' ? espnHockeyStatNames 
      : sport === 'basketball' ? espnBasketballStatNames 
      : espnBaseballStatNames
    
    // Build categories array from scoring items
    // NOTE: scoringItems already use GLOBAL stat IDs (e.g., hockey W=19, GAA=22, SV%=24).
    // statSourceId is metadata only, NOT an offset to apply.
    // The offset is only needed for PLAYER-LEVEL stats (rosterForMatchupPeriod).
    const categories: Array<{ stat_id: string; name: string; display_name: string; is_negative?: boolean }> = []
    const categoryStatIds: string[] = []
    for (const item of scoringItems) {
      const statId = item.statId ?? item.id ?? 0
      const statIdStr = String(statId)
      
      if (statIdStr) {
        categoryStatIds.push(statIdStr)
        
        const statInfo = statNames[statId] || {
          name: `Stat ${statId}`,
          display: `S${statId}`
        }
        
        console.log(`[ESPN] scoringItem: statId=${statId} source=${item.statSourceId ?? '?'} → ${statInfo.display}`)
        
        categories.push({
          stat_id: statIdStr,
          name: statInfo.name,
          display_name: statInfo.display,
          is_negative: statInfo.isNegative
        })
      }
    }
    console.log('[ESPN getCategoryStatsBreakdown] Found', categories.length, 'initial categories from scoringItems:', categoryStatIds)
    
    // CRITICAL: scoringItems returns ALL stats with scoring weights, but category leagues 
    // only use a subset as actual H2H categories. The ground truth is scoreByStat from 
    // real matchup data — it only contains the active category stat IDs.
    // We'll discover active categories from the first week that has scoreByStat data,
    // then filter our categories list down to only the real ones.
    let activeStatIds: Set<string> | null = null
    
    // Get teams
    const teams = await this.getTeams(sport, leagueId, season)
    
    // Initialize maps for tracking category wins per team
    const teamTotalCategoryWins = new Map<string, number>()
    const teamTotalCategoryLosses = new Map<string, number>()
    const teamCategoryWins = new Map<string, Record<string, number>>()
    const teamCategoryLosses = new Map<string, Record<string, number>>()
    const teamCategoryTies = new Map<string, Record<string, number>>()
    
    // Initialize all teams with zero counts
    for (const team of teams) {
      const teamKey = `espn_${team.id}`
      teamTotalCategoryWins.set(teamKey, 0)
      teamTotalCategoryLosses.set(teamKey, 0)
      teamCategoryWins.set(teamKey, {})
      teamCategoryLosses.set(teamKey, {})
      teamCategoryTies.set(teamKey, {})
    }
    
    // Calculate how many weeks to fetch (completed weeks only)
    const currentWeek = league.status?.currentMatchupPeriod || 1
    const regularSeasonWeeks = league.settings?.regularSeasonMatchupPeriodCount || 25
    const isSeasonActive = league.status?.isActive ?? true
    const completedWeeks = !isSeasonActive ? regularSeasonWeeks : Math.min(currentWeek - 1, regularSeasonWeeks)
    
    // Before computing, verify that at least one week has officially decided matchups.
    // If ESPN shows 0-0-0 in their standings AND Week 1 matchups are all UNDECIDED,
    // the week is extended/in-progress — return zeros immediately.
    if (completedWeeks >= 1) {
      const week1Check = await this.getMatchups(sport, leagueId, season, 1)
      const nonByeWeek1 = week1Check.filter(m => m.awayTeamId)
      const week1AllDecided = nonByeWeek1.length > 0 &&
        nonByeWeek1.every(m => m.winner && m.winner !== 'UNDECIDED')
      if (!week1AllDecided) {
        console.log('[ESPN getCategoryStatsBreakdown] Week 1 not all officially decided — returning empty results (in-progress or extended week)')
        return {
          categories: [],
          teamCategoryWins: new Map(),
          teamCategoryLosses: new Map(),
          teamCategoryTies: new Map(),
          teamTotalCategoryWins: new Map(),
          teamTotalCategoryLosses: new Map(),
          hasRealStatValues: false,
        }
      }
    }

    console.log('[ESPN getCategoryStatsBreakdown] Fetching', completedWeeks, 'weeks of matchups')
    
    // Fetch all completed matchups and aggregate category wins
    // Track whether we found real stat values for per-category calculation
    let hasRealStatValues = false
    let weeksWithRealData = 0
    let weeksProcessed = 0
    
    for (let week = 1; week <= completedWeeks; week++) {
      console.log(`[ESPN getCategoryStatsBreakdown] Processing week ${week}/${completedWeeks}...`)
      let weekHasRealData = false
      weeksProcessed++
      try {
        // The cache will auto-refresh if it detects stale data missing per-category results
        const weekMatchups = await this.getMatchups(sport, leagueId, season, week)

        // Only count this week when ALL non-bye matchups have officially decided winners
        const nonByeWeek = weekMatchups.filter(m => m.awayTeamId)
        const weekAllDecided = nonByeWeek.length > 0 &&
          nonByeWeek.every(m => m.winner && m.winner !== 'UNDECIDED')
        if (!weekAllDecided) {
          console.log(`[ESPN getCategoryStatsBreakdown] Week ${week}: not all matchups officially decided — skipping`)
          weeksProcessed--
          continue
        }
        
        for (const matchup of weekMatchups) {
          // Skip bye weeks (no away team)
          if (!matchup.awayTeamId) continue
          
          const homeKey = `espn_${matchup.homeTeamId}`
          const awayKey = `espn_${matchup.awayTeamId}`
          
          // Log what we have for debugging
          if (week === 1) {
            console.log('[ESPN getCategoryStatsBreakdown] Week 1 matchup check:', {
              homeTeamId: matchup.homeTeamId,
              awayTeamId: matchup.awayTeamId,
              hasHomePerCategoryResults: !!matchup.homePerCategoryResults,
              homePerCategoryResultsCount: matchup.homePerCategoryResults ? Object.keys(matchup.homePerCategoryResults).length : 0,
              homePerCategoryResults: matchup.homePerCategoryResults
            })
          }
          
          // Check if we have per-category results from ESPN (scoreByStat.result)
          if (matchup.homePerCategoryResults && Object.keys(matchup.homePerCategoryResults).length > 0) {
            if (!hasRealStatValues) {
              console.log('[ESPN getCategoryStatsBreakdown] Setting hasRealStatValues = true!')
            }
            hasRealStatValues = true
            weekHasRealData = true
            
            // The ground truth for active H2H categories is homePerCategoryResults —
            // ESPN only includes real scoring categories there. scoringItems (used to
            // build the initial categories list) can contain extra stats (e.g. AVG, PA,
            // HBP, IBB) that have a weight in the scoring settings but are NOT actual
            // H2H categories. On first discovery we FILTER categories to activeStatIds,
            // then add any ids from real matchup data not already present.
            if (!activeStatIds) {
              activeStatIds = new Set(Object.keys(matchup.homePerCategoryResults))

              // Filter to only active categories, preserving scoringItems order
              const filtered = categories.filter(c => activeStatIds!.has(c.stat_id))

              // Add any real matchup stat IDs not already covered
              for (const statId of activeStatIds) {
                if (!filtered.some(c => c.stat_id === statId)) {
                  const statInfo = statNames[parseInt(statId)] || { name: `Stat ${statId}`, display: `S${statId}` }
                  filtered.push({
                    stat_id: statId,
                    name: statInfo.name,
                    display_name: statInfo.display,
                    is_negative: statInfo.isNegative
                  })
                }
              }

              // Replace categories in-place so downstream references stay valid
              categories.length = 0
              categories.push(...filtered)
              categoryStatIds.length = 0
              categoryStatIds.push(...filtered.map(c => c.stat_id))

              // Sort into ESPN's standard display order: batting stats first, then pitching
              // This matches the order shown on ESPN's scoreboard page
              const espnBaseballDisplayOrder = [
                '0',  // AB
                '1',  // H
                '32', // R
                '33', // HR
                '34', // TB
                '23', // RBI
                '5',  // SB
                '8',  // OPS
                '20', // FC
                '21', // FPCT
                '18', // G
                '53', // GS
                '41', // IP
                '43', // K
                '67', // BF
                '35', // W
                '47', // ERA
                '83', // OBA
                '48', // WHIP
                '71', // SVHD
              ]
              // For baseball, sort by preferred display order; unknown IDs go at end
              if (sport === 'baseball') {
                categories.sort((a, b) => {
                  const ai = espnBaseballDisplayOrder.indexOf(a.stat_id)
                  const bi = espnBaseballDisplayOrder.indexOf(b.stat_id)
                  if (ai === -1 && bi === -1) return 0
                  if (ai === -1) return 1
                  if (bi === -1) return -1
                  return ai - bi
                })
              }

              console.log(`[ESPN getCategoryStatsBreakdown] Active categories (${categories.length}):`, categories.map(c => c.display_name))
            }
            
            // Process home team per-category results
            for (const [statId, result] of Object.entries(matchup.homePerCategoryResults)) {
              const homeCatWins = teamCategoryWins.get(homeKey) || {}
              const homeCatLosses = teamCategoryLosses.get(homeKey) || {}
              const homeCatTies = teamCategoryTies.get(homeKey) || {}
              
              if (result === 'WIN') {
                homeCatWins[statId] = (homeCatWins[statId] || 0) + 1
              } else if (result === 'LOSS') {
                homeCatLosses[statId] = (homeCatLosses[statId] || 0) + 1
              } else if (result === 'TIE') {
                homeCatTies[statId] = (homeCatTies[statId] || 0) + 1
              }
              
              teamCategoryWins.set(homeKey, homeCatWins)
              teamCategoryLosses.set(homeKey, homeCatLosses)
              teamCategoryTies.set(homeKey, homeCatTies)
            }
          }
          
          if (matchup.awayPerCategoryResults && Object.keys(matchup.awayPerCategoryResults).length > 0) {
            // Process away team per-category results
            for (const [statId, result] of Object.entries(matchup.awayPerCategoryResults)) {
              const awayCatWins = teamCategoryWins.get(awayKey) || {}
              const awayCatLosses = teamCategoryLosses.get(awayKey) || {}
              const awayCatTies = teamCategoryTies.get(awayKey) || {}
              
              if (result === 'WIN') {
                awayCatWins[statId] = (awayCatWins[statId] || 0) + 1
              } else if (result === 'LOSS') {
                awayCatLosses[statId] = (awayCatLosses[statId] || 0) + 1
              } else if (result === 'TIE') {
                awayCatTies[statId] = (awayCatTies[statId] || 0) + 1
              }
              
              teamCategoryWins.set(awayKey, awayCatWins)
              teamCategoryLosses.set(awayKey, awayCatLosses)
              teamCategoryTies.set(awayKey, awayCatTies)
            }
          }
          
          // Always aggregate total category wins/losses from matchup
          const homeCatWinsTotal = matchup.homeCategoryWins || 0
          const homeCatLossesTotal = matchup.homeCategoryLosses || 0
          const awayCatWinsTotal = matchup.awayCategoryWins || 0
          const awayCatLossesTotal = matchup.awayCategoryLosses || 0
          
          // Update totals
          teamTotalCategoryWins.set(homeKey, (teamTotalCategoryWins.get(homeKey) || 0) + homeCatWinsTotal)
          teamTotalCategoryLosses.set(homeKey, (teamTotalCategoryLosses.get(homeKey) || 0) + homeCatLossesTotal)
          teamTotalCategoryWins.set(awayKey, (teamTotalCategoryWins.get(awayKey) || 0) + awayCatWinsTotal)
          teamTotalCategoryLosses.set(awayKey, (teamTotalCategoryLosses.get(awayKey) || 0) + awayCatLossesTotal)
        }
      } catch (error) {
        console.warn(`[ESPN getCategoryStatsBreakdown] Error fetching week ${week}:`, error)
      }
      
      if (weekHasRealData) {
        weeksWithRealData++
      }
    }
    
    console.log('[ESPN getCategoryStatsBreakdown] Finished fetching all weeks. hasRealStatValues:', hasRealStatValues, 'weeksWithRealData:', weeksWithRealData, '/', weeksProcessed)
    
    // CRITICAL: For H2H Each Category leagues, team.wins/losses are CATEGORY totals, not matchup weeks
    // e.g., 8-0 means won 8 categories in 1 week (with 8 categories), NOT 8 matchup weeks
    // Calculate actual matchup weeks: max(W+L+T) / numCategories
    const numCategories = categories.length || 1
    const maxRecord = Math.max(1, ...teams.map(t => {
      const teamKey = `espn_${t.id}`
      const catW = teamTotalCategoryWins.get(teamKey) || t.wins || 0
      const catL = teamTotalCategoryLosses.get(teamKey) || t.losses || 0
      return catW + catL + (t.ties || 0)
    }))
    const actualWeeksPlayed = Math.max(1, Math.round(maxRecord / numCategories))
    
    // Compare real data coverage against ACTUAL weeks played, not ESPN's matchup period count
    const realDataCoverage = actualWeeksPlayed > 0 ? weeksWithRealData / actualWeeksPlayed : 0
    const trustRealData = hasRealStatValues && realDataCoverage >= 0.75
    
    console.log('[ESPN getCategoryStatsBreakdown] numCategories:', numCategories, 'maxRecord:', maxRecord, 'actualWeeksPlayed:', actualWeeksPlayed)
    console.log('[ESPN getCategoryStatsBreakdown] Real data coverage:', Math.round(realDataCoverage * 100) + '% (' + weeksWithRealData + '/' + actualWeeksPlayed + ' actual weeks)', 'trustRealData:', trustRealData)
    
    // Log sample of per-category wins for debugging
    if (trustRealData) {
      const sampleTeamKey = [...teamCategoryWins.keys()][0]
      if (sampleTeamKey) {
        console.log('[ESPN getCategoryStatsBreakdown] Sample per-category wins:', sampleTeamKey, teamCategoryWins.get(sampleTeamKey))
      }
    }
    
    // Only use real per-category data if we got it for most weeks
    // Otherwise, fall back to ROTO calculation from season totals.
    // IMPORTANT: Never run ROTO when completedWeeks === 0 — that means no week has
    // officially concluded yet and valuesByStat only reflects live in-progress stats.
    // Doing ROTO on live data produces premature standings at the start of the season.
    if (!trustRealData && completedWeeks === 0) {
      console.log('[ESPN getCategoryStatsBreakdown] completedWeeks = 0 — skipping ROTO fallback, no officially completed weeks yet')
      return {
        categories,
        teamCategoryWins: new Map(),
        teamCategoryLosses: new Map(),
        teamCategoryTies: new Map(),
        teamTotalCategoryWins: new Map(),
        teamTotalCategoryLosses: new Map(),
        hasRealStatValues: false,
      }
    }

    if (!trustRealData) {
      // Clear any partial per-category data that was accumulated from incomplete weeks
      teamCategoryWins.clear()
      teamCategoryLosses.clear()
      teamCategoryTies.clear()
      teamTotalCategoryWins.clear()
      teamTotalCategoryLosses.clear()
      
      console.log('[ESPN getCategoryStatsBreakdown] Insufficient real data (' + weeksWithRealData + '/' + weeksProcessed + ' weeks) - using ROTO calculation from valuesByStat')
      
      // Fetch teams with valuesByStat
      const teams = await this.getTeams(sport, leagueId, season)
      const teamsWithStats = teams.filter(t => t.valuesByStat && Object.keys(t.valuesByStat).length > 0)
      
      if (teamsWithStats.length > 0) {
        console.log('[ESPN getCategoryStatsBreakdown] Found', teamsWithStats.length, 'teams with valuesByStat')
        
        const numTeams = teamsWithStats.length
        
        // Calculate ACTUAL matchup weeks from team records and number of categories
        // For H2H Each Category: W+L = total category results, NOT matchup weeks
        // actualWeeksPlayed = max(W+L) / numCategories
        const maxTeamRecord = Math.max(1, ...teamsWithStats.map(t => {
          return (t.wins || 0) + (t.losses || 0) + (t.ties || 0)
        }))
        const weeksToUse = Math.max(1, Math.round(maxTeamRecord / numCategories))
        console.log('[ESPN getCategoryStatsBreakdown] ROTO using weeksToUse:', weeksToUse, '(maxRecord:', maxTeamRecord, '/ numCategories:', numCategories, ', vs completedWeeks:', completedWeeks + ')')
        
        // For each category, rank teams and calculate "roto points" (simulated wins)
        for (const category of categories) {
          const statId = category.stat_id
          
          // Get all teams' values for this stat
          const teamValues = teamsWithStats.map(t => ({
            teamKey: `espn_${t.id}`,
            value: t.valuesByStat?.[statId] ?? 0
          }))
          
          // Determine if lower is better for this stat (turnovers, etc)
          const lowerIsBetterStats = ['11', '17'] // TO, Goals Against
          const isReversed = lowerIsBetterStats.includes(statId)
          
          // Sort by value (descending for most stats, ascending for "lower is better")
          teamValues.sort((a, b) => isReversed ? a.value - b.value : b.value - a.value)
          
          // Award "wins" based on rank (using actual matchup periods, not ESPN's completedWeeks)
          teamValues.forEach((tv, index) => {
            const winsForThisCat = Math.round((numTeams - 1 - index) * weeksToUse / (numTeams - 1))
            const lossesForThisCat = Math.round(index * weeksToUse / (numTeams - 1))
            
            const existingCatWins = teamCategoryWins.get(tv.teamKey) || {}
            const existingCatLosses = teamCategoryLosses.get(tv.teamKey) || {}
            const existingCatTies = teamCategoryTies.get(tv.teamKey) || {}
            
            existingCatWins[statId] = winsForThisCat
            existingCatLosses[statId] = lossesForThisCat
            existingCatTies[statId] = 0
            
            teamCategoryWins.set(tv.teamKey, existingCatWins)
            teamCategoryLosses.set(tv.teamKey, existingCatLosses)
            teamCategoryTies.set(tv.teamKey, existingCatTies)
            
            const currentTotalWins = teamTotalCategoryWins.get(tv.teamKey) || 0
            const currentTotalLosses = teamTotalCategoryLosses.get(tv.teamKey) || 0
            teamTotalCategoryWins.set(tv.teamKey, currentTotalWins + winsForThisCat)
            teamTotalCategoryLosses.set(tv.teamKey, currentTotalLosses + lossesForThisCat)
          })
        }
        
        console.log('[ESPN getCategoryStatsBreakdown] ROTO calculation complete. Sample team:', [...teamTotalCategoryWins.entries()][0])
        
        // Mark that we have real stat values (calculated via ROTO)
        hasRealStatValues = true
      } else {
        console.log('[ESPN getCategoryStatsBreakdown] No teams with valuesByStat found')
      }
    } else {
      console.log('[ESPN getCategoryStatsBreakdown] Using real per-category wins from', weeksWithRealData, 'weeks of data')
      // Initialize ties for all teams/categories
      for (const [teamKey] of teamTotalCategoryWins) {
        const catTies: Record<string, number> = {}
        categories.forEach(cat => {
          catTies[cat.stat_id] = 0
        })
        teamCategoryTies.set(teamKey, catTies)
      }
    }
    
    console.log('[ESPN getCategoryStatsBreakdown] Complete. Teams processed:', teamTotalCategoryWins.size)
    
    return {
      categories,
      teamCategoryWins,
      teamCategoryLosses,
      teamCategoryTies,
      teamTotalCategoryWins,
      teamTotalCategoryLosses,
      hasRealStatValues
    }
  }

  // ============================================================
  // Utility Methods
  // ============================================================

  /**
   * Get the current NFL season year
   */
  getCurrentSeason(sport: Sport = 'football'): number {
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth() // 0-indexed
    
    // Different sports have different season start months
    const seasonStartMonth: Record<Sport, number> = {
      football: 8,   // September
      baseball: 2,   // March
      basketball: 9, // October
      hockey: 9      // October
    }
    
    return month < seasonStartMonth[sport] ? year - 1 : year
  }

  /**
   * Get avatar/logo URL for a team
   */
  getTeamLogo(team: EspnTeam): string {
    if (team.logo) return team.logo
    // Fallback to ui-avatars.com
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(team.name || 'Team')}&background=3a3d52&color=fff&size=64`
  }

  /**
   * Clear all ESPN-related caches for a specific league
   */
  clearLeagueCache(leagueId: string | number, sport: Sport, season: number): void {
    const prefix = `espn_${sport}_${leagueId}_${season}`
    console.log(`Clearing cache for ESPN league: ${prefix}`)
    // Clear various cache keys
    cache.clear('espn_league', `espn_league_${sport}_${leagueId}_${season}`)
    cache.clear('espn_teams', `espn_teams_${sport}_${leagueId}_${season}`)
    cache.clear('espn_draft', `espn_draft_${sport}_${leagueId}_${season}`)
    cache.clear('espn_scoring', `espn_scoring_${sport}_${leagueId}_${season}`)
    // Clear matchups for all weeks
    for (let week = 1; week <= 25; week++) {
      cache.clear('espn_matchups', `espn_matchups_${sport}_${leagueId}_${season}_${week}`)
    }
  }
}

// Export singleton instance
export const espnService = new EspnFantasyService()
