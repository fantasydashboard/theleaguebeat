/**
 * Yahoo Fantasy API Service
 * 
 * Handles all interactions with Yahoo Fantasy Sports API.
 * Supports Football, Baseball, Basketball, and Hockey.
 * 
 * All requests go through the yahoo-api Edge Function proxy
 * to avoid CORS issues.
 */

import { supabase } from '@/lib/supabase'
import type { Sport } from '@/types/supabase'
import { cache, CACHE_TTL, CACHE_KEYS } from './cache'

// Yahoo sport keys
const SPORT_KEYS: Record<Sport, string> = {
  football: 'nfl',
  baseball: 'mlb',
  basketball: 'nba',
  hockey: 'nhl'
}

// Game keys by sport and year - EXPORTED for use in history views
// These change each season - format is typically a 3-digit number
// Keys are confirmed from Yahoo's API - new seasons get new keys
export const GAME_KEYS: Record<Sport, Record<number, string>> = {
  football: {
    // NFL seasons (September - February)
    2025: '449',  // NFL 2025 (current season - playoffs starting)
    2024: '423',  
    2023: '414',
    2022: '390',
    2021: '371',
    2020: '399',
    2019: '380',
    2018: '359',
    2017: '348',
    2016: '331',
    2015: '314',
    2014: '299',
    2013: '273',
    2012: '257',
    2011: '242',
    2010: '222'
  },
  baseball: {
    // MLB seasons (March - October)
    // NOTE: Keys were off by 1 year - corrected mapping below
    2025: '458',  // MLB 2025 - verify this key when league becomes available
    2024: '431',  // MLB 2024
    2023: '422',  // MLB 2023
    2022: '412',  // MLB 2022
    2021: '404',  // MLB 2021
    2020: '398',  // MLB 2020
    2019: '388',  // MLB 2019
    2018: '378',  // MLB 2018
    2017: '370',  // MLB 2017
    2016: '357',  // MLB 2016
    2015: '346',  // MLB 2015
    2014: '328',  // MLB 2014
    2013: '308',  // MLB 2013
    2012: '283',  // MLB 2012
    2011: '268',  // MLB 2011
    2010: '253',  // MLB 2010
  },
  basketball: {
    // NBA seasons (October - June, spans 2 years)
    // Note: 2025 key TBD - Yahoo hasn't published it yet
    2024: '428',  // 2024-25 season (current)
    2023: '418',
    2022: '410',
    2021: '402',
    2020: '395',
    2019: '385',
    2018: '375',
    2017: '364',
    2016: '353',
    2015: '340',
    2014: '322',
    2013: '304',
    2012: '282',
    2011: '265',
    2010: '249'
  },
  hockey: {
    // NHL seasons (October - June, spans 2 years)
    // Note: 2025 key TBD - Yahoo hasn't published it yet
    2024: '427',  // 2024-25 season (current)
    2023: '419',
    2022: '411',
    2021: '403',
    2020: '396',
    2019: '386',
    2018: '376',
    2017: '365',
    2016: '354',
    2015: '341',
    2014: '321',
    2013: '303',
    2012: '281',
    2011: '263',
    2010: '248'
  }
}

// Get game keys for recent seasons
function getRecentGameKeys(sport: Sport, numYears: number = 16): string[] {
  const sportKeys = GAME_KEYS[sport]
  const currentYear = new Date().getFullYear()
  const keys: string[] = []
  
  // Start from current year and go back
  for (let year = currentYear; year >= currentYear - numYears; year--) {
    if (sportKeys[year]) {
      keys.push(sportKeys[year])
    }
  }
  
  return keys
}

interface YahooLeague {
  league_key: string
  league_id: string
  name: string
  season: string
  num_teams: number
  scoring_type: string
  league_type: string
  current_week: number
  start_week: number
  end_week: number
  is_finished: boolean
}

interface YahooTeam {
  team_key: string
  team_id: string
  name: string
  managers: { manager: { nickname: string; guid: string; is_current_login?: boolean } }[]
  roster?: YahooPlayer[]
  points?: number
  logo_url?: string
  wins?: number
  losses?: number
  ties?: number
  points_for?: number
  points_against?: number
  rank?: number
  projected_points?: number
  is_my_team?: boolean
}

interface YahooPlayer {
  player_key: string
  player_id: string
  name: { full: string; first: string; last: string }
  team_abbr: string
  position: string
  status: string
}

interface YahooMatchup {
  week: number
  matchup_id: number
  teams: YahooTeam[]
  is_playoffs: boolean
  is_consolation: boolean
  winner_team_key?: string
  is_tied?: boolean
}

export class YahooFantasyService {
  private userId: string | null = null
  private supabaseUrl: string

  constructor() {
    this.supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
  }

  /**
   * Initialize the service with user ID
   */
  async initialize(userId: string): Promise<boolean> {
    this.userId = userId
    
    if (!supabase) {
      console.error('Supabase not configured')
      return false
    }

    // Verify Yahoo is connected
    const { data, error } = await supabase
      .from('connected_platforms')
      .select('*')
      .eq('user_id', userId)
      .eq('platform', 'yahoo')
      .single()

    if (error || !data) {
      console.error('Yahoo not connected:', error)
      return false
    }

    return true
  }

  /**
   * Make an authenticated request to Yahoo Fantasy API via proxy
   */
  private async apiRequest(endpoint: string): Promise<any> {
    // Get access token from localStorage (Supabase getSession can hang)
    let accessToken: string | null = null
    
    try {
      const storageKey = 'sb-ergxtydfgffqgkddclvr-auth-token'
      const stored = localStorage.getItem(storageKey)
      if (stored) {
        const parsed = JSON.parse(stored)
        accessToken = parsed?.access_token
      }
    } catch (e) {
      console.error('[Yahoo] Failed to get session from localStorage:', e)
    }
    
    if (!accessToken) {
      throw new Error('Not authenticated - no session found')
    }

    const proxyUrl = `${this.supabaseUrl}/functions/v1/yahoo-api`
    
    const response = await fetch(proxyUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ endpoint })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
      console.error('Yahoo API proxy error:', response.status, errorData)
      throw new Error(errorData.error || `Yahoo API error: ${response.status}`)
    }

    return response.json()
  }

  /**
   * Get all leagues for the current user across recent seasons
   */
  async getLeagues(sport: Sport): Promise<YahooLeague[]> {
    const sportCode = SPORT_KEYS[sport] // nfl, mlb, nba, nhl
    
    try {
      // First, try to get leagues using game_codes (gets current + recent seasons automatically)
      console.log(`Fetching Yahoo leagues for ${sport} using game_code: ${sportCode}`)
      
      const data = await this.apiRequest(
        `/users;use_login=1/games;game_codes=${sportCode}/leagues?format=json`
      )

      const leagues: YahooLeague[] = []
      
      // Parse the nested Yahoo response structure
      const fantasyContent = data.fantasy_content
      if (!fantasyContent?.users?.[0]?.user?.[1]?.games) {
        console.log('No games found in response for', sport)
        return leagues
      }

      const games = fantasyContent.users[0].user[1].games
      
      // Iterate through all games (seasons)
      for (const game of Object.values(games) as any[]) {
        if (typeof game !== 'object' || !game.game) continue
        
        const gameData = game.game[0]
        const leaguesData = game.game[1]?.leagues
        if (!leaguesData) continue

        for (const leagueWrapper of Object.values(leaguesData) as any[]) {
          if (typeof leagueWrapper !== 'object' || !leagueWrapper.league) continue
          
          const league = leagueWrapper.league[0]
          leagues.push({
            league_key: league.league_key,
            league_id: league.league_id,
            name: league.name,
            season: league.season,
            num_teams: parseInt(league.num_teams),
            scoring_type: league.scoring_type,
            league_type: league.league_type,
            current_week: parseInt(league.current_week || '1'),
            start_week: parseInt(league.start_week || '1'),
            end_week: parseInt(league.end_week || '17'),
            is_finished: league.is_finished === '1'
          })
        }
      }

      // Sort by season (newest first)
      leagues.sort((a, b) => parseInt(b.season) - parseInt(a.season))

      return leagues
    } catch (error) {
      console.error('Error fetching Yahoo leagues:', error)
      throw error
    }
  }

  /**
   * Get league details including settings
   */
  async getLeagueDetails(leagueKey: string): Promise<any> {
    const data = await this.apiRequest(
      `/league/${leagueKey};out=settings,standings,scoreboard?format=json`
    )
    
    return data.fantasy_content?.league
  }

  /**
   * Get current week and league metadata
   */
  async getLeagueMetadata(leagueKey: string): Promise<{ currentWeek: number; startWeek: number; endWeek: number; isFinished: boolean; scoring_type?: string; renew?: string; season?: string; draft_status?: string }> {
    // Check cache first
    const cached = cache.get<{ currentWeek: number; startWeek: number; endWeek: number; isFinished: boolean; scoring_type?: string; renew?: string; season?: string; draft_status?: string }>(
      CACHE_KEYS.YAHOO_METADATA, leagueKey
    )
    
    // If cached data exists but is missing scoring_type or draft_status, we need to refetch
    if (cached && cached.scoring_type && cached.season && cached.draft_status !== undefined) {
      console.log(`[Cache HIT] League metadata for ${leagueKey} scoring_type=${cached.scoring_type} draft_status=${cached.draft_status}`)
      return cached
    } else if (cached) {
      console.log(`[Cache STALE] League metadata for ${leagueKey} missing fields, refetching...`)
    }
    
    const data = await this.apiRequest(
      `/league/${leagueKey}/metadata?format=json`
    )
    
    const league = data.fantasy_content?.league?.[0]
    
    const result = {
      currentWeek: parseInt(league?.current_week || '1'),
      startWeek: parseInt(league?.start_week || '1'),
      endWeek: parseInt(league?.end_week || '16'),
      isFinished: league?.is_finished === '1' || league?.is_finished === 1,
      scoring_type: league?.scoring_type,
      renew: league?.renew,
      season: league?.season,
      draft_status: league?.draft_status  // 'predraft' | 'drafting' | 'postdraft'
    }
    
    console.log(`[Cache MISS] League metadata for ${leagueKey}: scoring_type=${result.scoring_type}`)
    
    // Cache with appropriate TTL based on season status
    const ttl = result.isFinished ? CACHE_TTL.COMPLETED : CACHE_TTL.METADATA
    cache.set(CACHE_KEYS.YAHOO_METADATA, result, ttl, leagueKey)
    
    return result
  }

  /**
   * Get all teams in a league with full details
   */
  async getTeams(leagueKey: string): Promise<YahooTeam[]> {
    // Check cache first
    const cached = cache.get<YahooTeam[]>(CACHE_KEYS.YAHOO_TEAMS, leagueKey)
    if (cached) {
      console.log(`[Cache HIT] Teams for ${leagueKey}`, cached.length > 0 ? `First team: ${cached[0].name}, wins=${cached[0].wins}, pf=${cached[0].points_for}` : 'empty')
      return cached
    }
    
    console.log(`[Cache MISS] Fetching teams for ${leagueKey}`)
    const data = await this.apiRequest(
      `/league/${leagueKey}/teams;out=standings?format=json`
    )
    
    // Log raw response structure for debugging
    console.log('Raw teams API response keys:', Object.keys(data.fantasy_content?.league?.[1] || {}))

    const teams: YahooTeam[] = []
    const teamsData = data.fantasy_content?.league?.[1]?.teams

    if (!teamsData) {
      console.log('No teamsData found in response. Full league data:', JSON.stringify(data.fantasy_content?.league).substring(0, 500))
      return teams
    }

    for (const teamWrapper of Object.values(teamsData) as any[]) {
      if (typeof teamWrapper !== 'object' || !teamWrapper.team) continue
      
      const teamInfo = teamWrapper.team[0]
      const teamArray = teamWrapper.team
      
      // Search for team_standings and team_points in ALL elements (not just index 1)
      let teamStandings: any = null
      let teamPoints: any = null
      
      for (let i = 1; i < teamArray.length; i++) {
        const element = teamArray[i]
        if (element?.team_standings) {
          teamStandings = element.team_standings
        }
        if (element?.team_points) {
          teamPoints = element.team_points
        }
      }
      
      // Get team info by iterating (positions vary when is_owned_by_current_login is injected)
      let logoUrl = ''
      let teamKey = ''
      let teamId = ''
      let teamName = 'Unknown'
      if (Array.isArray(teamInfo)) {
        for (const item of teamInfo) {
          if (item?.team_key) teamKey = item.team_key
          if (item?.team_id) teamId = item.team_id
          if (item?.name) teamName = item.name
          if (item?.team_logos) {
            logoUrl = item.team_logos[0]?.team_logo?.url || ''
          }
        }
      }
      
      // Check if this is the current user's team - search for managers more robustly
      let managers: any[] = []
      let isMyTeam = false
      
      // Try different possible locations for managers
      if (Array.isArray(teamInfo)) {
        for (const item of teamInfo) {
          if (item?.managers && Array.isArray(item.managers)) {
            managers = item.managers
            break
          }
        }
      }
      
      // Fallback to legacy positions
      if (managers.length === 0) {
        managers = teamInfo[19]?.managers || teamInfo.managers || []
      }
      
      // Check all managers for is_current_login
      for (const m of managers) {
        if (m.manager?.is_current_login === '1' || m.manager?.is_current_login === 1) {
          isMyTeam = true
          console.log('Found current login team:', teamName, 'via manager:', m.manager?.nickname)
          break
        }
      }
      
      // Parse points - try team_standings first, then team_points
      const points_for = parseFloat(teamStandings?.points_for || teamPoints?.total || '0')
      const points_against = parseFloat(teamStandings?.points_against || '0')
      
      console.log(`getTeams: ${teamName} - wins=${teamStandings?.outcome_totals?.wins}, pf=${points_for}, pa=${points_against}`)
      
      teams.push({
        team_key: teamKey,
        team_id: teamId,
        name: teamName,
        logo_url: logoUrl,
        managers: managers,
        is_my_team: isMyTeam,
        wins: parseInt(teamStandings?.outcome_totals?.wins || '0'),
        losses: parseInt(teamStandings?.outcome_totals?.losses || '0'),
        ties: parseInt(teamStandings?.outcome_totals?.ties || '0'),
        points_for,
        points_against,
        rank: parseInt(teamStandings?.rank || '0')
      })
    }

    // Cache teams
    cache.set(CACHE_KEYS.YAHOO_TEAMS, teams, CACHE_TTL.STANDINGS, leagueKey)
    
    return teams
  }

  /**
   * Get user's team in a specific league
   */
  async getMyTeam(leagueKey: string): Promise<YahooTeam | null> {
    try {
      // Use Yahoo's special "me" syntax to get current user's team
      const data = await this.apiRequest(
        `/league/${leagueKey}/teams;team_keys=${leagueKey}.t.me?format=json`
      )
      
      console.log('getMyTeam response:', JSON.stringify(data, null, 2).substring(0, 1000))
      
      const teamData = data.fantasy_content?.league?.[1]?.teams?.[0]?.team
      if (!teamData) {
        console.log('No team data in getMyTeam response')
        return null
      }

      const teamInfo = teamData[0]
      
      // Parse team info array
      let teamKey = ''
      let teamId = ''
      let teamName = ''
      let managers: any[] = []
      
      if (Array.isArray(teamInfo)) {
        for (const item of teamInfo) {
          if (item?.team_key) teamKey = item.team_key
          if (item?.team_id) teamId = item.team_id
          if (item?.name) teamName = item.name
          if (item?.managers) managers = item.managers
        }
      }
      
      console.log('Parsed my team:', { teamKey, teamId, teamName })
      
      return {
        team_key: teamKey,
        team_id: teamId,
        name: teamName,
        managers: managers,
        is_my_team: true
      }
    } catch (error) {
      console.error('Error fetching my team:', error)
      return null
    }
  }

  /**
   * Get roster for a team
   */
  async getRoster(teamKey: string): Promise<YahooPlayer[]> {
    const data = await this.apiRequest(
      `/team/${teamKey}/roster?format=json`
    )

    const players: YahooPlayer[] = []
    const rosterData = data.fantasy_content?.team?.[1]?.roster?.[0]?.players

    if (!rosterData) return players

    for (const playerWrapper of Object.values(rosterData) as any[]) {
      if (typeof playerWrapper !== 'object' || !playerWrapper.player) continue
      
      const playerInfo = playerWrapper.player[0]
      players.push({
        player_key: playerInfo[0]?.player_key,
        player_id: playerInfo[1]?.player_id,
        name: {
          full: playerInfo[2]?.name?.full,
          first: playerInfo[2]?.name?.first,
          last: playerInfo[2]?.name?.last
        },
        team_abbr: playerInfo[6]?.editorial_team_abbr,
        position: playerInfo[9]?.display_position,
        status: playerInfo[10]?.status || ''
      })
    }

    return players
  }

  /**
   * Get league standings
   */
  async getStandings(leagueKey: string): Promise<any[]> {
    // Check cache first
    const cached = cache.get<any[]>(CACHE_KEYS.YAHOO_STANDINGS, leagueKey)
    if (cached) {
      console.log(`[Cache HIT] Standings for ${leagueKey}`)
      return cached
    }
    
    const data = await this.apiRequest(
      `/league/${leagueKey}/standings?format=json`
    )

    console.log('Raw standings response (full):', JSON.stringify(data, null, 2))

    const standings: any[] = []
    const teamsData = data.fantasy_content?.league?.[1]?.standings?.[0]?.teams

    if (!teamsData) {
      console.log('No teamsData found in standings response')
      return standings
    }

    for (const teamWrapper of Object.values(teamsData) as any[]) {
      if (typeof teamWrapper !== 'object' || !teamWrapper.team) continue
      
      const teamArray = teamWrapper.team
      
      // Extract team info from the first element (array of objects)
      let team_key = ''
      let team_id = ''
      let name = ''
      let logo_url = ''
      let manager_guid = ''
      
      const teamInfoArray = teamArray[0]
      if (Array.isArray(teamInfoArray)) {
        for (const item of teamInfoArray) {
          if (item?.team_key) team_key = item.team_key
          if (item?.team_id) team_id = item.team_id
          if (item?.name) name = item.name
          if (item?.team_logos) logo_url = item.team_logos[0]?.team_logo?.url || ''
          if (item?.managers) {
            const primaryManager = item.managers[0]?.manager
            if (primaryManager?.guid) manager_guid = primaryManager.guid
          }
        }
      }
      
      // Look for team_standings, team_points, and team_stats in ALL elements of teamArray
      let teamStandings: any = null
      let teamPoints: any = null
      let teamStats: any = null
      
      for (let i = 1; i < teamArray.length; i++) {
        const element = teamArray[i]
        if (element?.team_standings) {
          teamStandings = element.team_standings
          console.log(`Found team_standings at index ${i} for ${name}:`, JSON.stringify(teamStandings))
        }
        if (element?.team_points) {
          teamPoints = element.team_points
          console.log(`Found team_points at index ${i} for ${name}:`, JSON.stringify(teamPoints))
        }
        if (element?.team_stats) {
          teamStats = element.team_stats
          console.log(`Found team_stats at index ${i} for ${name}:`, JSON.stringify(teamStats))
        }
      }
      
      // If still no team_standings, log what we have
      if (!teamStandings) {
        console.log(`No team_standings found for ${name}. Full teamArray:`, JSON.stringify(teamArray))
      }
      
      // Parse standings data
      const rank = parseInt(teamStandings?.rank || '0')
      const wins = parseInt(teamStandings?.outcome_totals?.wins || '0')
      const losses = parseInt(teamStandings?.outcome_totals?.losses || '0')
      const ties = parseInt(teamStandings?.outcome_totals?.ties || '0')
      
      // For points_for, check multiple sources:
      // 1. team_standings.points_for (H2H points leagues)
      // 2. team_points.total (some configurations)
      // 3. team_points.season (cumulative season points)
      // 4. team_stats.coverage_value (sometimes contains points)
      let points_for = 0
      if (teamStandings?.points_for) {
        points_for = parseFloat(teamStandings.points_for)
        console.log(`${name}: Using team_standings.points_for = ${points_for}`)
      } else if (teamPoints?.total) {
        points_for = parseFloat(teamPoints.total)
        console.log(`${name}: Using team_points.total = ${points_for}`)
      } else if (teamPoints?.season) {
        points_for = parseFloat(teamPoints.season)
        console.log(`${name}: Using team_points.season = ${points_for}`)
      } else if (teamStats?.coverage_value) {
        points_for = parseFloat(teamStats.coverage_value)
        console.log(`${name}: Using team_stats.coverage_value = ${points_for}`)
      }
      
      const points_against = parseFloat(teamStandings?.points_against || '0')
      
      console.log(`Final parsed ${name}: rank=${rank}, wins=${wins}, losses=${losses}, pf=${points_for}`)
      
      standings.push({
        team_key,
        team_id,
        name,
        logo_url,
        manager_guid,
        rank,
        wins,
        losses,
        ties,
        points_for,
        points_against
      })
    }

    const result = standings.sort((a, b) => a.rank - b.rank)
    
    // Cache standings
    cache.set(CACHE_KEYS.YAHOO_STANDINGS, result, CACHE_TTL.STANDINGS, leagueKey)
    
    return result
  }

  /**
   * Get matchups for a specific week
   */
  async getMatchups(leagueKey: string, week: number): Promise<YahooMatchup[]> {
    // Check cache first
    const cached = cache.get<YahooMatchup[]>(CACHE_KEYS.YAHOO_MATCHUPS, leagueKey, week)
    if (cached) {
      console.log(`[Cache HIT] Matchups for ${leagueKey} week ${week}`)
      return cached
    }
    
    const data = await this.apiRequest(
      `/league/${leagueKey}/scoreboard;week=${week}?format=json`
    )

    const matchups: YahooMatchup[] = []
    const scoreboardData = data.fantasy_content?.league?.[1]?.scoreboard?.[0]?.matchups

    if (!scoreboardData) return matchups

    let matchupId = 1
    for (const matchupWrapper of Object.values(scoreboardData) as any[]) {
      if (typeof matchupWrapper !== 'object' || !matchupWrapper.matchup) continue
      
      const matchupInfo = matchupWrapper.matchup
      const teams = matchupInfo[0]?.teams || []
      
      const parsedTeams: YahooTeam[] = []
      for (const teamWrapper of Object.values(teams) as any[]) {
        if (typeof teamWrapper !== 'object' || !teamWrapper.team) continue
        
        const teamArray = teamWrapper.team
        const teamInfo = teamArray[0]
        
        // Search all indices for team_points and team_projected_points (Yahoo's structure varies)
        let teamPoints: any = null
        let teamProjected: any = null
        
        for (let i = 1; i < teamArray.length; i++) {
          const element = teamArray[i]
          if (element?.team_points) {
            teamPoints = element.team_points
          }
          if (element?.team_projected_points) {
            teamProjected = element.team_projected_points
          }
        }
        
        // Get team logo
        let logoUrl = ''
        let teamKey = ''
        let teamId = ''
        let teamName = ''
        for (const item of teamInfo) {
          if (item?.team_key) teamKey = item.team_key
          if (item?.team_id) teamId = item.team_id
          if (item?.name) teamName = item.name
          if (item?.team_logos) {
            logoUrl = item.team_logos[0]?.team_logo?.url || ''
          }
        }
        
        // Check if my team - search for managers in multiple locations
        let managers: any[] = []
        for (const item of teamInfo) {
          if (item?.managers) {
            managers = item.managers
            break
          }
        }
        const isMyTeam = managers.some((m: any) => m.manager?.is_current_login === '1')
        
        const points = parseFloat(teamPoints?.total || '0')
        const projectedPoints = parseFloat(teamProjected?.total || '0')
        
        parsedTeams.push({
          team_key: teamKey,
          team_id: teamId,
          name: teamName,
          logo_url: logoUrl,
          managers: managers,
          points: points,
          projected_points: projectedPoints,
          is_my_team: isMyTeam,
          // Also store team_points object for debugging
          team_points: teamPoints
        })
      }

      matchups.push({
        week,
        matchup_id: matchupId++,
        teams: parsedTeams,
        is_playoffs: matchupInfo.is_playoffs === '1',
        is_consolation: matchupInfo.is_consolation === '1',
        winner_team_key: matchupInfo.winner_team_key,
        is_tied: matchupInfo.is_tied === '1'
      })
    }
    
    // Log first matchup for debugging
    if (matchups.length > 0 && matchups[0].teams.length >= 2) {
      console.log(`Week ${week} matchup sample:`, {
        team1: matchups[0].teams[0].name,
        team1Points: matchups[0].teams[0].points,
        team2: matchups[0].teams[1].name,
        team2Points: matchups[0].teams[1].points
      })
    }

    // Cache matchups - completed weeks get longer TTL
    const metadata = await this.getLeagueMetadata(leagueKey)
    const isCompletedWeek = week < metadata.currentWeek || metadata.isFinished
    const ttl = isCompletedWeek ? CACHE_TTL.COMPLETED : CACHE_TTL.CURRENT
    cache.set(CACHE_KEYS.YAHOO_MATCHUPS, matchups, ttl, leagueKey, week)

    return matchups
  }

  /**
   * Get detailed matchup data including stat winners for H2H Category leagues
   * This returns which team won each category in each matchup
   */
  async getCategoryMatchups(leagueKey: string, week: number): Promise<any[]> {
    // Check cache first
    const cached = cache.get<any[]>(CACHE_KEYS.YAHOO_CATEGORY_MATCHUPS, leagueKey, week)
    if (cached) {
      console.log(`[Cache HIT] Category matchups for ${leagueKey} week ${week}`)
      return cached
    }
    
    // Get scoring settings to know which stats are actual scoring categories
    // vs display-only stats (like GP, H/AB, IP) that Yahoo includes in stat_winners
    let scoringStatIds: Set<string> | null = null
    try {
      const settings = await this.getLeagueScoringSettings(leagueKey)
      if (settings?.stat_categories) {
        const scoringCats = settings.stat_categories
          .filter((c: any) => {
            const isDisplay = c.stat?.is_only_display_stat || c.is_only_display_stat
            return isDisplay !== '1' && isDisplay !== 1
          })
        scoringStatIds = new Set(scoringCats.map((c: any) => String(c.stat?.stat_id || c.stat_id)))
        console.log(`[Yahoo Matchups] Scoring stat IDs (${scoringStatIds.size}):`, [...scoringStatIds])
      }
    } catch (e) {
      console.log('[Yahoo Matchups] Could not load scoring settings, will include all stat_winners')
    }
    
    const data = await this.apiRequest(
      `/league/${leagueKey}/scoreboard;week=${week}?format=json`
    )
    
    console.log(`Week ${week} scoreboard raw:`, JSON.stringify(data).substring(0, 2000))
    
    const matchups: any[] = []
    const scoreboardData = data.fantasy_content?.league?.[1]?.scoreboard?.[0]?.matchups
    
    if (!scoreboardData) {
      console.log(`No scoreboard data for week ${week}`)
      return matchups
    }
    
    for (const matchupWrapper of Object.values(scoreboardData) as any[]) {
      if (typeof matchupWrapper !== 'object' || !matchupWrapper.matchup) continue
      
      const matchupInfo = matchupWrapper.matchup
      
      // Get stat_winners - this contains which team won each category
      const statWinners = matchupInfo.stat_winners || []
      
      // Get teams with their stats
      const teams = matchupInfo[0]?.teams || {}
      const parsedTeams: any[] = []
      
      for (const teamWrapper of Object.values(teams) as any[]) {
        if (typeof teamWrapper !== 'object' || !teamWrapper.team) continue
        
        const teamData = teamWrapper.team
        const teamInfo = teamData[0] || []
        const teamStats = teamData[1]?.team_stats?.stats || []
        
        // Parse team info
        let teamKey = '', teamName = '', logoUrl = ''
        for (const item of teamInfo) {
          if (item?.team_key) teamKey = item.team_key
          if (item?.name) teamName = item.name
          if (item?.team_logos) logoUrl = item.team_logos[0]?.team_logo?.url || ''
        }
        
        // Parse stats into a map
        const stats: Record<string, string> = {}
        for (const statWrapper of teamStats) {
          if (statWrapper?.stat) {
            stats[statWrapper.stat.stat_id] = statWrapper.stat.value
          }
        }
        
        parsedTeams.push({
          team_key: teamKey,
          name: teamName,
          logo_url: logoUrl,
          stats
        })
      }
      
      // Parse stat winners - filter out display-only stats
      const categoryResults: any[] = []
      let filteredCount = 0
      for (const sw of statWinners) {
        if (sw?.stat_winner) {
          const statId = String(sw.stat_winner.stat_id)
          
          // Skip display-only stats (not actual scoring categories)
          if (scoringStatIds && !scoringStatIds.has(statId)) {
            filteredCount++
            continue
          }
          
          categoryResults.push({
            stat_id: sw.stat_winner.stat_id,
            winner_team_key: sw.stat_winner.winner_team_key,
            is_tied: sw.stat_winner.is_tied === '1'
          })
        }
      }
      
      if (filteredCount > 0) {
        console.log(`[Yahoo Matchups] Week ${week}: filtered ${filteredCount} display-only stats from stat_winners (${statWinners.length} → ${categoryResults.length})`)
      }
      
      matchups.push({
        week,
        teams: parsedTeams,
        stat_winners: categoryResults,
        winner_team_key: matchupInfo.winner_team_key,
        is_tied: matchupInfo.is_tied === '1'
      })
    }
    
    console.log(`Week ${week}: ${matchups.length} matchups, first has ${matchups[0]?.stat_winners?.length || 0} stat winners`)
    
    // Cache category matchups - completed weeks get longer TTL
    const metadata = await this.getLeagueMetadata(leagueKey)
    const isCompletedWeek = week < metadata.currentWeek || metadata.isFinished
    const ttl = isCompletedWeek ? CACHE_TTL.COMPLETED : CACHE_TTL.CURRENT
    cache.set(CACHE_KEYS.YAHOO_CATEGORY_MATCHUPS, matchups, ttl, leagueKey, week)
    
    return matchups
  }

  /**
   * Get league settings including scoring type, divisions, etc.
   */
  async getLeagueSettings(leagueKey: string): Promise<any> {
    const data = await this.apiRequest(
      `/league/${leagueKey}/settings?format=json`
    )
    
    const settings = data.fantasy_content?.league?.[1]?.settings?.[0]
    return settings
  }

  /**
   * Get transactions for a league
   */
  async getTransactions(leagueKey: string): Promise<any[]> {
    try {
      const data = await this.apiRequest(
        `/league/${leagueKey}/transactions?format=json`
      )
      
      const transactions: any[] = []
      const transData = data.fantasy_content?.league?.[1]?.transactions
      
      if (!transData) return transactions
      
      for (const transWrapper of Object.values(transData) as any[]) {
        if (typeof transWrapper !== 'object' || !transWrapper.transaction) continue
        
        const trans = transWrapper.transaction[0]
        transactions.push({
          transaction_key: trans.transaction_key,
          type: trans.type,
          status: trans.status,
          timestamp: trans.timestamp
        })
      }
      
      return transactions
    } catch (e) {
      console.error('Error fetching transactions:', e)
      return []
    }
  }

  /**
   * Get transaction counts per team
   */
  async getTransactionCounts(leagueKey: string): Promise<Map<string, number>> {
    try {
      // Use the standings endpoint which includes transaction data
      const data = await this.apiRequest(
        `/league/${leagueKey}/standings?format=json`
      )
      
      const counts = new Map<string, number>()
      const teamsData = data.fantasy_content?.league?.[1]?.standings?.[0]?.teams
      
      if (!teamsData) {
        console.log('No teams data found for transactions')
        return counts
      }
      
      for (const teamWrapper of Object.values(teamsData) as any[]) {
        if (typeof teamWrapper !== 'object' || !teamWrapper.team) continue
        
        const teamInfo = teamWrapper.team[0]
        let teamKey = ''
        for (const item of teamInfo) {
          if (item?.team_key) { teamKey = item.team_key; break }
        }
        
        // Look for number_of_moves and number_of_trades in the team info array
        let moves = 0
        let trades = 0
        
        for (const item of teamInfo) {
          if (item?.number_of_moves !== undefined) {
            moves = parseInt(item.number_of_moves) || 0
          }
          if (item?.number_of_trades !== undefined) {
            trades = parseInt(item.number_of_trades) || 0
          }
        }
        
        counts.set(teamKey, moves + trades)
        console.log(`Team ${teamKey}: ${moves} moves, ${trades} trades = ${moves + trades} total`)
      }
      
      return counts
    } catch (e) {
      console.error('Error fetching transaction counts:', e)
      return new Map()
    }
  }

  /**
   * Get all matchups for multiple weeks (for calculating all-play and standings over time)
   */
  async getAllMatchups(leagueKey: string, startWeek: number, endWeek: number): Promise<Map<number, any[]>> {
    const allMatchups = new Map<number, any[]>()
    
    for (let week = startWeek; week <= endWeek; week++) {
      try {
        const matchups = await this.getMatchups(leagueKey, week)
        if (matchups.length > 0) {
          allMatchups.set(week, matchups)
        }
      } catch (e) {
        console.error(`Error fetching week ${week} matchups:`, e)
      }
    }
    
    return allMatchups
  }

  /**
   * Get draft results for a league
   */
  async getDraftResults(leagueKey: string): Promise<any> {
    try {
      const data = await this.apiRequest(
        `/league/${leagueKey}/draftresults?format=json`
      )
      
      console.log('Draft results response:', JSON.stringify(data, null, 2).substring(0, 3000))
      
      const draftResults: any[] = []
      const resultsData = data.fantasy_content?.league?.[1]?.draft_results
      
      // Get league info (contains renew field for previous season)
      const leagueInfo = data.fantasy_content?.league?.[0] || {}
      const draftType = leagueInfo.draft_status || 'unknown'
      const renew = leagueInfo.renew || '' // Format: "431_136233" for previous season
      
      if (!resultsData) {
        console.log('No draft_results found in response')
        return { picks: [], type: 'unknown', renew }
      }
      
      for (const resultWrapper of Object.values(resultsData) as any[]) {
        if (typeof resultWrapper !== 'object' || !resultWrapper.draft_result) continue
        
        const result = resultWrapper.draft_result
        draftResults.push({
          pick: parseInt(result.pick || '0'),
          round: parseInt(result.round || '0'),
          team_key: result.team_key,
          player_key: result.player_key,
          // Note: Player details need separate API call
        })
      }
      
      return {
        picks: draftResults.sort((a, b) => a.pick - b.pick),
        type: draftType,
        renew // Include renew field so views can fall back to previous season
      }
    } catch (e) {
      console.error('Error fetching draft results:', e)
      return { picks: [], type: 'unknown', renew: '' }
    }
  }

  /**
   * Get player details for multiple player keys
   */
  async getPlayers(playerKeys: string[], leagueKey?: string): Promise<Map<string, any>> {
    const players = new Map<string, any>()
    
    // Yahoo API limits to 25 players per request
    const chunks: string[][] = []
    for (let i = 0; i < playerKeys.length; i += 25) {
      chunks.push(playerKeys.slice(i, i + 25))
    }
    
    for (const chunk of chunks) {
      try {
        const keysParam = chunk.join(',')
        
        // Try league-based endpoint first if leagueKey provided
        let data: any
        if (leagueKey) {
          try {
            data = await this.apiRequest(
              `/league/${leagueKey}/players;player_keys=${keysParam}?format=json`
            )
            console.log('getPlayers (league-based) response sample:', JSON.stringify(data, null, 2).substring(0, 1500))
            
            const playersData = data.fantasy_content?.league?.[1]?.players
            if (playersData) {
              for (const playerWrapper of Object.values(playersData) as any[]) {
                if (typeof playerWrapper !== 'object' || !playerWrapper.player) continue
                
                const playerInfo = playerWrapper.player[0]
                if (!Array.isArray(playerInfo)) continue
                
                let player_key = ''
                let player_id = ''
                let name = ''
                let team = ''
                let position = ''
                let headshot = ''
                let status = ''
                let injury_note = ''
                
                for (const item of playerInfo) {
                  if (item?.player_key) player_key = item.player_key
                  if (item?.player_id) player_id = item.player_id
                  if (item?.name) name = item.name.full || (item.name.first + ' ' + item.name.last)
                  if (item?.editorial_team_abbr) team = item.editorial_team_abbr
                  if (item?.display_position) position = item.display_position
                  if (item?.headshot) headshot = item.headshot.url || ''
                  if (item?.status) status = item.status
                  if (item?.status_full) status = item.status_full || status
                  if (item?.injury_note) injury_note = item.injury_note
                }
                
                if (player_key && name) {
                  players.set(player_key, {
                    player_key,
                    player_id,
                    name,
                    team,
                    position,
                    headshot,
                    status,
                    injury_note
                  })
                }
              }
              continue // Successfully got data from league endpoint
            }
          } catch (e) {
            console.log('League-based player fetch failed, trying direct endpoint')
          }
        }
        
        // Fallback to direct players endpoint
        data = await this.apiRequest(
          `/players;player_keys=${keysParam}?format=json`
        )
        
        console.log('getPlayers (direct) response sample:', JSON.stringify(data, null, 2).substring(0, 1500))
        
        const playersData = data.fantasy_content?.players
        if (!playersData) {
          console.log('No playersData found in response')
          continue
        }
        
        for (const playerWrapper of Object.values(playersData) as any[]) {
          if (typeof playerWrapper !== 'object' || !playerWrapper.player) continue
          
          const playerInfo = playerWrapper.player[0]
          if (!Array.isArray(playerInfo)) continue
          
          let player_key = ''
          let player_id = ''
          let name = ''
          let team = ''
          let position = ''
          let headshot = ''
          let status = ''
          let injury_note = ''
          
          for (const item of playerInfo) {
            if (item?.player_key) player_key = item.player_key
            if (item?.player_id) player_id = item.player_id
            if (item?.name) name = item.name.full || (item.name.first + ' ' + item.name.last)
            if (item?.editorial_team_abbr) team = item.editorial_team_abbr
            if (item?.display_position) position = item.display_position
            if (item?.headshot) headshot = item.headshot.url || ''
            if (item?.status) status = item.status
            if (item?.status_full) status = item.status_full || status
            if (item?.injury_note) injury_note = item.injury_note
          }
          
          if (player_key && name) {
            players.set(player_key, {
              player_key,
              player_id,
              name,
              team,
              position,
              headshot,
              status,
              injury_note
            })
          }
        }
      } catch (e) {
        console.error('Error fetching player chunk:', e)
      }
    }
    
    console.log(`getPlayers returned ${players.size} players`)
    return players
  }

  /**
   * Get player season stats for draft analysis
   * For baseball, this would be batting/pitching stats with fantasy points
   */
  async getPlayerStats(leagueKey: string, playerKeys: string[]): Promise<Map<string, any>> {
    const stats = new Map<string, any>()
    
    // Yahoo API limits to 25 players per request
    const chunks: string[][] = []
    for (let i = 0; i < playerKeys.length; i += 25) {
      chunks.push(playerKeys.slice(i, i + 25))
    }
    
    console.log(`Fetching player stats for ${playerKeys.length} players in ${chunks.length} chunks`)
    
    for (const chunk of chunks) {
      try {
        const keysParam = chunk.join(',')
        // Use league context to get fantasy points, not just raw stats
        const data = await this.apiRequest(
          `/league/${leagueKey}/players;player_keys=${keysParam}/stats?format=json`
        )
        
        console.log('Player stats response sample:', JSON.stringify(data, null, 2).substring(0, 2000))
        
        const playersData = data.fantasy_content?.league?.[1]?.players
        if (!playersData) {
          console.log('No players data in response')
          continue
        }
        
        for (const playerWrapper of Object.values(playersData) as any[]) {
          if (typeof playerWrapper !== 'object' || !playerWrapper.player) continue
          
          const playerArray = playerWrapper.player
          const playerInfo = playerArray[0]
          const playerStats = playerArray[1]?.player_stats
          const playerPoints = playerArray[1]?.player_points
          
          if (!Array.isArray(playerInfo)) continue
          
          let player_key = ''
          for (const item of playerInfo) {
            if (item?.player_key) player_key = item.player_key
          }
          
          // Parse stats
          const statValues: Record<string, number> = {}
          if (playerStats?.stats) {
            for (const stat of playerStats.stats) {
              if (stat?.stat) {
                statValues[stat.stat.stat_id] = parseFloat(stat.stat.value || '0')
              }
            }
          }
          
          // Get total fantasy points - check both player_stats.total and player_points.total
          const totalPoints = parseFloat(playerPoints?.total || playerStats?.total || '0')
          
          stats.set(player_key, {
            player_key,
            stats: statValues,
            total_points: totalPoints
          })
          
          if (stats.size <= 3) {
            console.log(`Player ${player_key} stats:`, { totalPoints, hasPlayerPoints: !!playerPoints, hasPlayerStats: !!playerStats })
          }
        }
      } catch (e) {
        console.error('Error fetching player stats chunk:', e)
      }
    }
    
    console.log(`Got stats for ${stats.size} players`)
    return stats
  }

  /**
   * Get all rostered players across all teams in a league with their stats
   * Returns player info, ownership, and season stats
   */
  async getAllRosteredPlayers(leagueKey: string): Promise<any[]> {
    const allPlayers: any[] = []
    const playerOwnership = new Map<string, { teamKey: string; teamName: string; managerName: string }>()
    
    try {
      // First get all teams and their rosters
      const teamsData = await this.apiRequest(
        `/league/${leagueKey}/teams/roster?format=json`
      )
      
      console.log('Teams roster response:', JSON.stringify(teamsData, null, 2).substring(0, 2000))
      
      const teams = teamsData.fantasy_content?.league?.[1]?.teams
      if (!teams) {
        console.log('No teams found')
        return allPlayers
      }
      
      const playerKeys: string[] = []
      
      // Extract all player keys and build ownership map
      for (const teamWrapper of Object.values(teams) as any[]) {
        if (typeof teamWrapper !== 'object' || !teamWrapper.team) continue
        
        const teamArray = teamWrapper.team
        const teamInfo = teamArray[0]
        const rosterData = teamArray[1]?.roster?.[0]?.players
        
        // Get team details
        let teamKey = ''
        let teamName = ''
        let managerName = ''
        
        if (Array.isArray(teamInfo)) {
          for (const item of teamInfo) {
            if (item?.team_key) teamKey = item.team_key
            if (item?.name) teamName = item.name
            if (item?.managers?.[0]?.manager?.nickname) {
              managerName = item.managers[0].manager.nickname
            }
          }
        }
        
        if (!rosterData) continue
        
        for (const playerWrapper of Object.values(rosterData) as any[]) {
          if (typeof playerWrapper !== 'object' || !playerWrapper.player) continue
          
          const playerInfo = playerWrapper.player[0]
          if (!Array.isArray(playerInfo)) continue
          
          let playerKey = ''
          for (const item of playerInfo) {
            if (item?.player_key) playerKey = item.player_key
          }
          
          if (playerKey) {
            playerKeys.push(playerKey)
            playerOwnership.set(playerKey, { teamKey, teamName, managerName })
          }
        }
      }
      
      console.log(`Found ${playerKeys.length} rostered players across all teams`)
      
      // Now get detailed stats for all players
      const playerStats = await this.getPlayerStats(leagueKey, playerKeys)
      const playerDetails = await this.getPlayers(playerKeys)
      
      // Combine all data
      for (const playerKey of playerKeys) {
        const details = playerDetails.get(playerKey)
        const stats = playerStats.get(playerKey)
        const ownership = playerOwnership.get(playerKey)
        
        if (details) {
          allPlayers.push({
            player_key: playerKey,
            player_id: details.player_id,
            full_name: details.name,
            position: details.position,
            mlb_team: details.team,
            headshot: details.headshot,
            total_points: stats?.total_points || 0,
            stats: stats?.stats || {},
            fantasy_team: ownership?.teamName || null,
            fantasy_team_key: ownership?.teamKey || null,
            manager_name: ownership?.managerName || null,
            status: details.status || '',
            injury_note: details.injury_note || ''
          })
        }
      }
      
      return allPlayers
      
    } catch (e) {
      console.error('Error fetching all rostered players:', e)
      return allPlayers
    }
  }

  /**
   * Get top available free agents in a league
   */
  async getTopFreeAgents(leagueKey: string, count: number = 100): Promise<any[]> {
    const freeAgents: any[] = []
    
    try {
      // Get free agents sorted by percent owned (most owned first)
      const data = await this.apiRequest(
        `/league/${leagueKey}/players;status=FA;sort=OR;count=${count}?format=json`
      )
      
      console.log('Free agents response:', JSON.stringify(data, null, 2).substring(0, 2000))
      
      const playersData = data.fantasy_content?.league?.[1]?.players
      if (!playersData) return freeAgents
      
      const playerKeys: string[] = []
      
      for (const playerWrapper of Object.values(playersData) as any[]) {
        if (typeof playerWrapper !== 'object' || !playerWrapper.player) continue
        
        const playerInfo = playerWrapper.player[0]
        if (!Array.isArray(playerInfo)) continue
        
        let playerKey = ''
        let playerId = ''
        let name = ''
        let team = ''
        let position = ''
        let headshot = ''
        let percentOwned = 0
        let percentDelta = 0
        let status = ''
        let injury_note = ''

        for (const item of playerInfo) {
          if (item?.player_key) playerKey = item.player_key
          if (item?.player_id) playerId = item.player_id
          if (item?.name) name = item.name.full || `${item.name.first} ${item.name.last}`
          if (item?.editorial_team_abbr) team = item.editorial_team_abbr
          if (item?.display_position) position = item.display_position
          if (item?.headshot) headshot = item.headshot.url || ''
          if (item?.percent_owned) {
            percentOwned = parseFloat(item.percent_owned.value || '0')
            percentDelta = parseFloat(item.percent_owned.delta || '0')
          }
          if (item?.status) status = item.status
          if (item?.status_full) status = item.status_full || status
          if (item?.injury_note) injury_note = item.injury_note
        }

        if (playerKey) {
          playerKeys.push(playerKey)
          freeAgents.push({
            player_key: playerKey,
            player_id: playerId,
            full_name: name,
            position,
            mlb_team: team,
            headshot,
            percent_owned: percentOwned,
            percent_change: percentDelta,
            fantasy_team: null,
            fantasy_team_key: null,
            manager_name: null,
            status,
            injury_note
          })
        }
      }
      
      // Get stats for free agents
      if (playerKeys.length > 0) {
        const playerStats = await this.getPlayerStats(leagueKey, playerKeys)
        
        for (const player of freeAgents) {
          const stats = playerStats.get(player.player_key)
          player.total_points = stats?.total_points || 0
          player.stats = stats?.stats || {}
        }
      }
      
      return freeAgents
      
    } catch (e) {
      console.error('Error fetching free agents:', e)
      return freeAgents
    }
  }

  /**
   * Get player weekly stats for multiple weeks (for calculating recent performance)
   */
  async getPlayerWeeklyStats(leagueKey: string, playerKey: string, weeks: number[]): Promise<Map<number, any>> {
    const weeklyStats = new Map<number, any>()
    
    for (const week of weeks) {
      try {
        const data = await this.apiRequest(
          `/league/${leagueKey}/players;player_keys=${playerKey}/stats;type=week;week=${week}?format=json`
        )
        
        const playerData = data.fantasy_content?.league?.[1]?.players?.[0]?.player
        if (!playerData) continue
        
        const statsData = playerData[1]?.player_stats
        const pointsData = playerData[1]?.player_points
        
        weeklyStats.set(week, {
          week,
          points: parseFloat(pointsData?.total || statsData?.total || '0'),
          stats: statsData?.stats || []
        })
      } catch (e) {
        console.error(`Error fetching week ${week} stats for ${playerKey}:`, e)
      }
    }
    
    return weeklyStats
  }

  /**
   * Get league scoring settings to understand point values
   */
  async getLeagueScoringSettings(leagueKey: string): Promise<any> {
    // Check cache first - settings rarely change
    const cached = cache.get<any>(CACHE_KEYS.YAHOO_SETTINGS, leagueKey)
    if (cached) {
      // Older cache entries stored stat_modifiers as a Map, which JSON-
      // serialized down to `{}` — every cache hit after that returned empty
      // modifiers. Only points leagues are supposed to have modifiers, so
      // when we see a points league with zero of them, treat it as stale.
      const mods = cached.stat_modifiers
      const hasMods = mods && typeof mods === 'object' && Object.keys(mods).length > 0
      const isPointsLeague = cached.scoring_type === 'headpoint' || cached.scoring_type === 'point'
      if (!isPointsLeague || hasMods) {
        console.log(`[Cache HIT] Scoring settings for ${leagueKey}`)
        return cached
      }
      console.log(`[Cache STALE] Scoring settings for ${leagueKey} has empty stat_modifiers for a points league — refetching`)
    }
    
    try {
      const data = await this.apiRequest(
        `/league/${leagueKey}/settings?format=json`
      )
      
      const settings = data.fantasy_content?.league?.[1]?.settings?.[0]
      
      // Extract stat categories and their point values
      const statCategories = settings?.stat_categories?.stats || []
      const statModifiers = settings?.stat_modifiers?.stats || []

      // Build a stat_id → point value map. Stored as a plain object because
      // this settings blob gets JSON-serialized into the cache, and JSON
      // turns a Map into {} (silently dropping every entry on any cache hit).
      const scoringMap: Record<string, number> = {}
      for (const mod of statModifiers) {
        if (mod?.stat?.stat_id != null) {
          scoringMap[String(mod.stat.stat_id)] = parseFloat(mod.stat.value ?? '0')
        }
      }

      const result = {
        scoring_type: settings?.scoring_type,
        stat_categories: statCategories,
        stat_modifiers: scoringMap,
        roster_positions: settings?.roster_positions || []
      }
      
      // Cache settings - they rarely change
      cache.set(CACHE_KEYS.YAHOO_SETTINGS, result, CACHE_TTL.SETTINGS, leagueKey)
      
      return result
    } catch (e) {
      console.error('Error fetching league settings:', e)
      return null
    }
  }
  
  /**
   * Clear all Yahoo-related caches for a specific league
   * Useful for forcing a refresh of data
   */
  clearLeagueCache(leagueKey: string): void {
    console.log(`Clearing cache for league: ${leagueKey}`)
    cache.clear(CACHE_KEYS.YAHOO_TEAMS, leagueKey)
    cache.clear(CACHE_KEYS.YAHOO_STANDINGS, leagueKey)
    cache.clear(CACHE_KEYS.YAHOO_METADATA, leagueKey)
    cache.clear(CACHE_KEYS.YAHOO_SETTINGS, leagueKey)
    // Clear matchups for all weeks
    for (let week = 1; week <= 30; week++) {
      cache.clear(CACHE_KEYS.YAHOO_MATCHUPS, leagueKey, week)
      cache.clear(CACHE_KEYS.YAHOO_CATEGORY_MATCHUPS, leagueKey, week)
    }
    console.log('Cache cleared for league')
  }
  
  /**
   * Get a team's stats for a specific date (e.g., "2026-02-10")
   * Returns stats map like { "60": "123", "7": "45", ... }
   */
  /**
   * Get a team's season-cumulative stats keyed by stat_id.
   * Used by the category Power Rankings "Outlook" factor for Yahoo leagues.
   * Returns numeric values (parsed from the string-format Yahoo returns).
   */
  async getTeamSeasonStats(teamKey: string): Promise<Record<string, number>> {
    const cacheKey = 'yahoo_team_season_stats'
    const cached = cache.get<Record<string, number>>(cacheKey, teamKey)
    if (cached) {
      return cached
    }

    const data = await this.apiRequest(
      `/team/${teamKey}/stats;type=season?format=json`
    )

    const stats: Record<string, number> = {}
    const teamStats = data.fantasy_content?.team?.[1]?.team_stats?.stats || []
    for (const statWrapper of teamStats) {
      if (statWrapper?.stat) {
        const id = String(statWrapper.stat.stat_id)
        const v = parseFloat(statWrapper.stat.value || '0')
        if (!isNaN(v)) stats[id] = v
      }
    }

    cache.set(cacheKey, stats, CACHE_TTL.STANDINGS, teamKey)
    return stats
  }

  async getTeamDailyStats(teamKey: string, date: string): Promise<Record<string, string>> {
    const cacheKey = 'yahoo_daily_stats'
    const cached = cache.get<Record<string, string>>(cacheKey, teamKey, date)
    if (cached) {
      return cached
    }
    
    console.log(`[Yahoo] Fetching daily stats for ${teamKey} on ${date}`)
    
    const data = await this.apiRequest(
      `/team/${teamKey}/stats;type=date;date=${date}?format=json`
    )
    
    const stats: Record<string, string> = {}
    const teamStats = data.fantasy_content?.team?.[1]?.team_stats?.stats || []
    for (const statWrapper of teamStats) {
      if (statWrapper?.stat) {
        stats[String(statWrapper.stat.stat_id)] = statWrapper.stat.value
      }
    }
    
    // Past dates cached for 24h, today gets short TTL
    const today = new Date().toISOString().split('T')[0]
    const ttl = date < today ? CACHE_TTL.COMPLETED : CACHE_TTL.CURRENT
    cache.set(cacheKey, stats, ttl, teamKey, date)
    
    return stats
  }

  /**
   * Get game week dates for the sport/season (start/end dates for each matchup week)
   * Returns array of { week: number, start: string, end: string }
   */
  async getGameWeeks(leagueKey: string): Promise<{ week: number, start: string, end: string }[]> {
    const gameKey = leagueKey.split('.')[0]
    const cacheKey = 'yahoo_game_weeks'
    const cached = cache.get<{ week: number, start: string, end: string }[]>(cacheKey, gameKey)
    if (cached) {
      console.log(`[Cache HIT] Game weeks for ${gameKey}`)
      return cached
    }
    
    console.log(`[Yahoo] Fetching game weeks for game ${gameKey}`)
    
    const data = await this.apiRequest(
      `/game/${gameKey}/game_weeks?format=json`
    )
    
    const weeks: { week: number, start: string, end: string }[] = []
    const gameWeeks = data.fantasy_content?.game?.[1]?.game_weeks || []
    for (const gw of gameWeeks) {
      if (gw?.game_week) {
        weeks.push({
          week: parseInt(gw.game_week.week) || 0,
          start: gw.game_week.start || '',
          end: gw.game_week.end || ''
        })
      }
    }
    
    console.log(`[Yahoo] Got ${weeks.length} game weeks for ${gameKey}`)
    
    // Cache for 24 hours - game weeks rarely change (only during breaks)
    cache.set(cacheKey, weeks, CACHE_TTL.COMPLETED, gameKey)
    
    return weeks
  }

  /**
   * Clear all Yahoo caches
   */
  clearAllCache(): void {
    console.log('Clearing all Yahoo caches')
    cache.clearAll()
    console.log('All caches cleared')
  }
}

// Export singleton instance
export const yahooService = new YahooFantasyService()
