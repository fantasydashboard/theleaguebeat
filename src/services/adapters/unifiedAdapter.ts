/**
 * Unified Data Adapter
 * 
 * Transforms platform-specific data (Sleeper, Yahoo, ESPN) into 
 * unified data structures that can be used by any component.
 */

import type { 
  UnifiedMatchup, 
  UnifiedTeam, 
  UnifiedPlayer,
  UnifiedStandingsEntry,
  SportType,
  LeagueType 
} from '@/config/sports'
import { getSportConfig, getLeagueType } from '@/config/sports'

// =============================================================================
// TEAM ADAPTERS
// =============================================================================

/**
 * Normalize a Sleeper team/roster to unified format
 */
export function normalizeSleeperTeam(
  roster: any,
  users: Record<string, any>,
  leagueUsers: any[]
): UnifiedTeam {
  const owner = leagueUsers.find(u => u.roster_id === roster.roster_id)
  const userData = owner ? users[owner.user_id] : null
  
  return {
    teamId: String(roster.roster_id),
    name: userData?.metadata?.team_name || userData?.display_name || `Team ${roster.roster_id}`,
    owner: userData?.display_name,
    avatar: userData?.avatar 
      ? `https://sleepercdn.com/avatars/thumbs/${userData.avatar}`
      : undefined,
    record: {
      wins: roster.settings?.wins || 0,
      losses: roster.settings?.losses || 0,
      ties: roster.settings?.ties || 0,
    },
    pointsFor: roster.settings?.fpts || 0,
    pointsAgainst: roster.settings?.fpts_against || 0,
  }
}

/**
 * Normalize a Yahoo team to unified format
 */
export function normalizeYahooTeam(team: any): UnifiedTeam {
  const standings = team.team_standings || {}
  
  return {
    teamId: String(team.team_id || team.team_key?.split('.').pop() || team.team_key),
    name: team.name || team.team_name || `Team ${team.team_id}`,
    owner: team.managers?.[0]?.nickname || team.manager?.nickname,
    avatar: team.team_logos?.[0]?.url || team.logo || team.logo_url,
    record: {
      wins: parseInt(standings.outcome_totals?.wins || team.wins || 0),
      losses: parseInt(standings.outcome_totals?.losses || team.losses || 0),
      ties: parseInt(standings.outcome_totals?.ties || team.ties || 0),
    },
    pointsFor: parseFloat(standings.points_for || team.points_for || 0),
    pointsAgainst: parseFloat(standings.points_against || team.points_against || 0),
  }
}

/**
 * Normalize an ESPN team to unified format
 */
export function normalizeEspnTeam(team: any, members?: any[]): UnifiedTeam {
  const record = team.record?.overall || {}
  const owner = members?.find(m => m.id === team.primaryOwner)
  
  return {
    teamId: String(team.id),
    name: team.name || team.teamName || `Team ${team.id}`,
    owner: owner?.displayName || team.owners?.[0],
    avatar: team.logo || (team.id ? `https://g.espncdn.com/lm-static/ffl/images/default_team_logo.svg` : undefined),
    record: {
      wins: record.wins || 0,
      losses: record.losses || 0,
      ties: record.ties || 0,
    },
    pointsFor: record.pointsFor || team.points || 0,
    pointsAgainst: record.pointsAgainst || 0,
  }
}

// =============================================================================
// MATCHUP ADAPTERS
// =============================================================================

/**
 * Normalize Sleeper matchups to unified format
 */
export function normalizeSleeperMatchups(
  matchups: any[],
  rosters: any[],
  users: Record<string, any>,
  leagueUsers: any[],
  week: number
): UnifiedMatchup[] {
  // Group matchups by matchup_id
  const matchupGroups = new Map<number, any[]>()
  
  for (const m of matchups) {
    if (!matchupGroups.has(m.matchup_id)) {
      matchupGroups.set(m.matchup_id, [])
    }
    matchupGroups.get(m.matchup_id)!.push(m)
  }
  
  const unified: UnifiedMatchup[] = []
  
  for (const [matchupId, teams] of matchupGroups) {
    if (teams.length !== 2) continue
    
    const roster1 = rosters.find(r => r.roster_id === teams[0].roster_id)
    const roster2 = rosters.find(r => r.roster_id === teams[1].roster_id)
    
    unified.push({
      matchupId: String(matchupId),
      week,
      team1: normalizeSleeperTeam(roster1 || { roster_id: teams[0].roster_id }, users, leagueUsers),
      team2: normalizeSleeperTeam(roster2 || { roster_id: teams[1].roster_id }, users, leagueUsers),
      team1Score: teams[0].points || 0,
      team2Score: teams[1].points || 0,
      team1Projected: teams[0].projected_points,
      team2Projected: teams[1].projected_points,
      isCompleted: (teams[0].points || 0) > 0 || (teams[1].points || 0) > 0,
    })
  }
  
  return unified
}

/**
 * Normalize Yahoo matchups to unified format (Points league)
 */
export function normalizeYahooPointsMatchups(
  matchups: any[],
  week: number
): UnifiedMatchup[] {
  return matchups.map((m, idx) => ({
    matchupId: String(m.matchup_id || idx),
    week,
    team1: normalizeYahooTeam(m.teams?.[0] || m.team1 || {}),
    team2: normalizeYahooTeam(m.teams?.[1] || m.team2 || {}),
    team1Score: parseFloat(m.teams?.[0]?.team_points?.total || m.team1_points || 0),
    team2Score: parseFloat(m.teams?.[1]?.team_points?.total || m.team2_points || 0),
    team1Projected: parseFloat(m.teams?.[0]?.team_projected_points?.total || 0),
    team2Projected: parseFloat(m.teams?.[1]?.team_projected_points?.total || 0),
    isCompleted: m.status === 'postevent' || m.is_completed,
  }))
}

/**
 * Normalize Yahoo matchups to unified format (Category league)
 */
export function normalizeYahooCategoryMatchups(
  matchups: any[],
  week: number
): UnifiedMatchup[] {
  return matchups.map((m, idx) => {
    const team1Stats: Record<string, number> = {}
    const team2Stats: Record<string, number> = {}
    
    // Extract category stats from Yahoo format
    // Try multiple possible locations for stats
    const team1StatsList = m.teams?.[0]?.team_stats?.stats || []
    const team2StatsList = m.teams?.[1]?.team_stats?.stats || []
    
    // Old format with nested stats array
    for (const stat of team1StatsList) {
      team1Stats[String(stat.stat_id)] = parseFloat(stat.value) || 0
    }
    for (const stat of team2StatsList) {
      team2Stats[String(stat.stat_id)] = parseFloat(stat.value) || 0
    }
    
    // New format with flat stats object from getCategoryMatchups
    const team1StatsObj = m.teams?.[0]?.stats || {}
    const team2StatsObj = m.teams?.[1]?.stats || {}
    
    for (const [statId, value] of Object.entries(team1StatsObj)) {
      team1Stats[statId] = parseFloat(value as string) || 0
    }
    for (const [statId, value] of Object.entries(team2StatsObj)) {
      team2Stats[statId] = parseFloat(value as string) || 0
    }
    
    // Get wins - try multiple sources
    const team1Wins = m.team1_wins ?? parseInt(m.teams?.[0]?.team_stats?.wins || m.teams?.[0]?.win_count || '0')
    const team2Wins = m.team2_wins ?? parseInt(m.teams?.[1]?.team_stats?.wins || m.teams?.[1]?.win_count || '0')
    const ties = m.ties ?? parseInt(m.teams?.[0]?.team_stats?.ties || m.tie_count || '0')
    
    return {
      matchupId: String(m.matchup_id || idx),
      week,
      team1: normalizeYahooTeam(m.teams?.[0] || {}),
      team2: normalizeYahooTeam(m.teams?.[1] || {}),
      team1Categories: team1Stats,
      team2Categories: team2Stats,
      team1Wins,
      team2Wins,
      ties,
      isCompleted: m.status === 'postevent' || m.is_completed || (team1Wins + team2Wins + ties) > 0,
    }
  })
}

/**
 * Normalize ESPN matchups to unified format (Points league)
 */
export function normalizeEspnPointsMatchups(
  schedule: any[],
  teams: any[],
  members: any[],
  week: number
): UnifiedMatchup[] {
  const weekMatchups = schedule.filter(m => m.matchupPeriodId === week)
  const teamMap = new Map(teams.map(t => [t.id, t]))
  
  // Group by matchup (home/away pairs)
  const matchupPairs = new Map<number, any[]>()
  
  for (const m of weekMatchups) {
    const key = Math.min(m.home?.teamId || 0, m.away?.teamId || 0) * 1000 + 
                Math.max(m.home?.teamId || 0, m.away?.teamId || 0)
    if (!matchupPairs.has(key)) {
      matchupPairs.set(key, [])
    }
    matchupPairs.get(key)!.push(m)
  }
  
  const unified: UnifiedMatchup[] = []
  let matchupIdx = 0
  
  for (const [_, matches] of matchupPairs) {
    const m = matches[0]
    if (!m.home || !m.away) continue
    
    const homeTeam = teamMap.get(m.home.teamId)
    const awayTeam = teamMap.get(m.away.teamId)
    
    unified.push({
      matchupId: String(matchupIdx++),
      week,
      team1: normalizeEspnTeam(homeTeam || { id: m.home.teamId }, members),
      team2: normalizeEspnTeam(awayTeam || { id: m.away.teamId }, members),
      team1Score: m.home.totalPoints || 0,
      team2Score: m.away.totalPoints || 0,
      isCompleted: m.winner !== 'UNDECIDED',
    })
  }
  
  return unified
}

/**
 * Normalize ESPN matchups to unified format (Category league)
 */
export function normalizeEspnCategoryMatchups(
  schedule: any[],
  teams: any[],
  members: any[],
  week: number,
  sport: SportType
): UnifiedMatchup[] {
  const weekMatchups = schedule.filter(m => m.matchupPeriodId === week)
  const teamMap = new Map(teams.map(t => [t.id, t]))
  
  const unified: UnifiedMatchup[] = []
  let matchupIdx = 0
  
  // Process unique matchups
  const seen = new Set<string>()
  
  for (const m of weekMatchups) {
    if (!m.home || !m.away) continue
    
    const key = `${Math.min(m.home.teamId, m.away.teamId)}-${Math.max(m.home.teamId, m.away.teamId)}`
    if (seen.has(key)) continue
    seen.add(key)
    
    const homeTeam = teamMap.get(m.home.teamId)
    const awayTeam = teamMap.get(m.away.teamId)
    
    // Extract category stats
    const team1Stats: Record<string, number> = {}
    const team2Stats: Record<string, number> = {}
    
    if (m.home.cumulativeScore?.scoreByStat) {
      for (const [statId, data] of Object.entries(m.home.cumulativeScore.scoreByStat)) {
        team1Stats[statId] = (data as any).score || 0
      }
    }
    if (m.away.cumulativeScore?.scoreByStat) {
      for (const [statId, data] of Object.entries(m.away.cumulativeScore.scoreByStat)) {
        team2Stats[statId] = (data as any).score || 0
      }
    }
    
    unified.push({
      matchupId: String(matchupIdx++),
      week,
      team1: normalizeEspnTeam(homeTeam || { id: m.home.teamId }, members),
      team2: normalizeEspnTeam(awayTeam || { id: m.away.teamId }, members),
      team1Categories: team1Stats,
      team2Categories: team2Stats,
      team1Wins: m.home.cumulativeScore?.wins || 0,
      team2Wins: m.away.cumulativeScore?.wins || 0,
      ties: m.home.cumulativeScore?.ties || 0,
      isCompleted: m.winner !== 'UNDECIDED',
    })
  }
  
  return unified
}

// =============================================================================
// STANDINGS ADAPTERS
// =============================================================================

/**
 * Normalize Sleeper standings to unified format
 */
export function normalizeSleeperStandings(
  rosters: any[],
  users: Record<string, any>,
  leagueUsers: any[]
): UnifiedStandingsEntry[] {
  return rosters
    .map(roster => {
      const team = normalizeSleeperTeam(roster, users, leagueUsers)
      const wins = roster.settings?.wins || 0
      const losses = roster.settings?.losses || 0
      const ties = roster.settings?.ties || 0
      const totalGames = wins + losses + ties
      
      return {
        team,
        rank: 0, // Will be calculated after sorting
        wins,
        losses,
        ties,
        pointsFor: roster.settings?.fpts || 0,
        pointsAgainst: roster.settings?.fpts_against || 0,
        winPercentage: totalGames > 0 ? wins / totalGames : 0,
      }
    })
    .sort((a, b) => {
      // Sort by wins, then by points for
      if (b.wins !== a.wins) return b.wins - a.wins
      return b.pointsFor - a.pointsFor
    })
    .map((entry, idx) => ({ ...entry, rank: idx + 1 }))
}

/**
 * Normalize Yahoo standings to unified format
 */
export function normalizeYahooStandings(
  teams: any[],
  leagueType: LeagueType
): UnifiedStandingsEntry[] {
  return teams
    .map(team => {
      const unified = normalizeYahooTeam(team)
      const standings = team.team_standings || {}
      const wins = unified.record?.wins || 0
      const losses = unified.record?.losses || 0
      const ties = unified.record?.ties || 0
      const totalGames = wins + losses + ties
      
      const entry: UnifiedStandingsEntry = {
        team: unified,
        rank: parseInt(standings.rank || team.rank || 0),
        wins,
        losses,
        ties,
        pointsFor: unified.pointsFor || 0,
        pointsAgainst: unified.pointsAgainst || 0,
        winPercentage: totalGames > 0 ? wins / totalGames : 0,
        gamesBack: parseFloat(standings.games_back || 0),
        streak: standings.streak?.value ? `${standings.streak.type === 'win' ? 'W' : 'L'}${standings.streak.value}` : undefined,
      }
      
      // Add category-specific fields
      if (leagueType === 'categories') {
        const catWins = parseInt(standings.outcome_totals?.stat_wins || 0)
        const catLosses = parseInt(standings.outcome_totals?.stat_losses || 0)
        const catTies = parseInt(standings.outcome_totals?.stat_ties || 0)

        entry.categoryWins = catWins
        entry.categoryLosses = catLosses
        entry.categoryTies = catTies
      }

      // For roto, pointsFor holds roto points — wins/losses are not meaningful
      if (leagueType === 'roto') {
        // Yahoo roto: outcome_totals may not have meaningful wins/losses
        // pointsFor is the total roto points from Yahoo standings
        entry.wins = 0
        entry.losses = 0
        entry.ties = 0
        entry.winPercentage = 0
      }
      
      return entry
    })
    .sort((a, b) => a.rank - b.rank)
}

/**
 * Normalize ESPN standings to unified format
 */
export function normalizeEspnStandings(
  teams: any[],
  members: any[],
  leagueType: LeagueType
): UnifiedStandingsEntry[] {
  return teams
    .map(team => {
      const unified = normalizeEspnTeam(team, members)
      const record = team.record?.overall || {}
      const wins = record.wins || 0
      const losses = record.losses || 0
      const ties = record.ties || 0
      const totalGames = wins + losses + ties
      
      const entry: UnifiedStandingsEntry = {
        team: unified,
        rank: team.playoffSeed || team.rankCalculatedFinal || 0,
        wins,
        losses,
        ties,
        pointsFor: record.pointsFor || 0,
        pointsAgainst: record.pointsAgainst || 0,
        winPercentage: record.percentage || (totalGames > 0 ? wins / totalGames : 0),
        gamesBack: record.gamesBack,
        streak: record.streakLength ? `${record.streakType === 'WIN' ? 'W' : 'L'}${record.streakLength}` : undefined,
        playoffSeed: team.playoffSeed,
      }
      
      return entry
    })
    .sort((a, b) => a.rank - b.rank)
}

// =============================================================================
// PLAYER ADAPTERS
// =============================================================================

/**
 * Normalize a Sleeper player to unified format
 */
export function normalizeSleeperPlayer(
  player: any,
  stats?: any,
  projections?: any
): UnifiedPlayer {
  return {
    playerId: player.player_id,
    name: player.full_name || `${player.first_name} ${player.last_name}`,
    position: player.position || player.fantasy_positions?.[0] || 'UNKNOWN',
    team: player.team,
    avatar: player.player_id 
      ? `https://sleepercdn.com/content/nfl/players/thumb/${player.player_id}.jpg`
      : undefined,
    stats: stats || undefined,
    points: stats?.pts_ppr || stats?.pts_std,
    projected: projections?.pts_ppr || projections?.pts_std,
  }
}

/**
 * Normalize a Yahoo player to unified format
 */
export function normalizeYahooPlayer(
  player: any,
  sport: SportType
): UnifiedPlayer {
  const stats: Record<string, number> = {}
  
  if (player.player_stats?.stats) {
    for (const stat of player.player_stats.stats) {
      stats[String(stat.stat_id)] = parseFloat(stat.value) || 0
    }
  }
  
  return {
    playerId: player.player_id || player.player_key,
    name: player.name?.full || player.name || 'Unknown',
    position: player.primary_position || player.display_position || player.eligible_positions?.[0] || 'UNKNOWN',
    team: player.editorial_team_abbr || player.team,
    avatar: player.headshot?.url || player.image_url,
    stats: Object.keys(stats).length > 0 ? stats : undefined,
    points: player.player_points?.total,
    projected: player.player_stats?.projected_points,
  }
}

/**
 * Normalize an ESPN player to unified format
 */
export function normalizeEspnPlayer(
  player: any,
  sport: SportType
): UnifiedPlayer {
  const playerInfo = player.playerPoolEntry?.player || player.player || player
  const stats: Record<string, number> = {}
  
  // ESPN stats are in a different structure
  if (playerInfo.stats) {
    for (const statLine of playerInfo.stats) {
      if (statLine.stats) {
        for (const [statId, value] of Object.entries(statLine.stats)) {
          stats[statId] = value as number
        }
      }
    }
  }
  
  return {
    playerId: String(playerInfo.id),
    name: playerInfo.fullName || playerInfo.name || 'Unknown',
    position: playerInfo.defaultPositionId ? getEspnPosition(playerInfo.defaultPositionId, sport) : 'UNKNOWN',
    team: playerInfo.proTeamId ? getEspnTeamAbbr(playerInfo.proTeamId, sport) : undefined,
    avatar: playerInfo.id 
      ? `https://a.espncdn.com/combiner/i?img=/i/headshots/${sport === 'football' ? 'nfl' : sport === 'baseball' ? 'mlb' : sport === 'basketball' ? 'nba' : 'nhl'}/players/full/${playerInfo.id}.png&w=96&h=70&cb=1`
      : undefined,
    stats: Object.keys(stats).length > 0 ? stats : undefined,
    points: player.appliedStatTotal,
    projected: player.projectedStatTotal,
  }
}

// =============================================================================
// ESPN HELPER MAPPINGS
// =============================================================================

function getEspnPosition(positionId: number, sport: SportType): string {
  const positionMaps: Record<SportType, Record<number, string>> = {
    football: {
      1: 'QB', 2: 'RB', 3: 'WR', 4: 'TE', 5: 'K', 16: 'DEF',
      6: 'DL', 7: 'LB', 8: 'DB',
    },
    baseball: {
      0: 'C', 1: '1B', 2: '2B', 3: '3B', 4: 'SS', 5: 'OF',
      6: 'LF', 7: 'CF', 8: 'RF', 9: 'DH', 10: 'P', 11: 'SP', 12: 'RP',
    },
    basketball: {
      1: 'PG', 2: 'SG', 3: 'SF', 4: 'PF', 5: 'C',
    },
    hockey: {
      1: 'C', 2: 'LW', 3: 'RW', 4: 'D', 5: 'G',
    },
  }
  
  return positionMaps[sport]?.[positionId] || 'UNKNOWN'
}

function getEspnTeamAbbr(teamId: number, sport: SportType): string {
  // This would need full team mappings - abbreviated for now
  // In production, you'd have complete mappings per sport
  return String(teamId)
}

// =============================================================================
// UNIVERSAL ADAPTER
// =============================================================================

export interface AdapterOptions {
  sport: SportType
  platform: 'sleeper' | 'yahoo' | 'espn'
  leagueType: LeagueType
}

/**
 * Universal function to normalize matchups from any platform
 */
export function normalizeMatchups(
  rawData: any,
  options: AdapterOptions,
  week: number
): UnifiedMatchup[] {
  const { sport, platform, leagueType } = options
  
  switch (platform) {
    case 'sleeper':
      return normalizeSleeperMatchups(
        rawData.matchups,
        rawData.rosters,
        rawData.users,
        rawData.leagueUsers,
        week
      )
    
    case 'yahoo':
      if (leagueType === 'points') {
        return normalizeYahooPointsMatchups(rawData.matchups, week)
      } else {
        return normalizeYahooCategoryMatchups(rawData.matchups, week)
      }
    
    case 'espn':
      if (leagueType === 'points') {
        return normalizeEspnPointsMatchups(rawData.schedule, rawData.teams, rawData.members, week)
      } else {
        return normalizeEspnCategoryMatchups(rawData.schedule, rawData.teams, rawData.members, week, sport)
      }
    
    default:
      console.warn(`Unknown platform: ${platform}`)
      return []
  }
}

/**
 * Universal function to normalize standings from any platform
 */
export function normalizeStandings(
  rawData: any,
  options: AdapterOptions
): UnifiedStandingsEntry[] {
  const { platform, leagueType } = options
  
  switch (platform) {
    case 'sleeper':
      return normalizeSleeperStandings(rawData.rosters, rawData.users, rawData.leagueUsers)
    
    case 'yahoo':
      return normalizeYahooStandings(rawData.teams, leagueType)
    
    case 'espn':
      return normalizeEspnStandings(rawData.teams, rawData.members, leagueType)
    
    default:
      console.warn(`Unknown platform: ${platform}`)
      return []
  }
}
