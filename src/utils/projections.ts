/**
 * Projection Utilities
 * Helper functions for calculating optimal lineups and projections
 */

export interface PlayerProjection {
  player_id: string
  stats: {
    pts_ppr?: number
    pts_half_ppr?: number
    pts_std?: number
    [key: string]: number | undefined
  }
}

/**
 * Get optimal lineup projection for a roster
 */
export function getOptimalLineupProjection(
  roster: string[],
  projections: Map<string, PlayerProjection>,
  players: Record<string, any>,
  rosterPositions: string[],
  scoringType: 'pts_ppr' | 'pts_half_ppr' | 'pts_std' = 'pts_ppr'
): number {
  // Group players by position with their projections
  const playersByPosition = new Map<string, Array<{ playerId: string; projection: number }>>()

  roster.forEach(playerId => {
    const projection = projections.get(playerId)
    const player = players[playerId]
    
    if (!projection?.stats || !player) return

    const points = projection.stats[scoringType] || 0
    const position = player.position || 'UNKNOWN'

    if (!playersByPosition.has(position)) {
      playersByPosition.set(position, [])
    }
    playersByPosition.get(position)!.push({ playerId, projection: points })
  })

  // Sort each position by projection (highest first)
  playersByPosition.forEach(players => {
    players.sort((a, b) => b.projection - a.projection)
  })

  const usedPlayers = new Set<string>()
  let totalProjection = 0

  // Count required starters by position
  const positionCounts = new Map<string, number>()
  rosterPositions.forEach(pos => {
    if (pos === 'BN' || pos === 'IR') return
    positionCounts.set(pos, (positionCounts.get(pos) || 0) + 1)
  })

  // Fill specific positions first
  const specificPositions = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF']
  specificPositions.forEach(position => {
    const needed = positionCounts.get(position) || 0
    const available = playersByPosition.get(position) || []

    for (let i = 0; i < needed && i < available.length; i++) {
      const player = available[i]
      if (!usedPlayers.has(player.playerId)) {
        totalProjection += player.projection
        usedPlayers.add(player.playerId)
      }
    }
  })

  // Fill FLEX positions
  const flexCount = positionCounts.get('FLEX') || 0
  const flexEligible: Array<{ playerId: string; projection: number }> = []

  ;['RB', 'WR', 'TE'].forEach(position => {
    const players = playersByPosition.get(position) || []
    players.forEach(player => {
      if (!usedPlayers.has(player.playerId)) {
        flexEligible.push(player)
      }
    })
  })

  flexEligible.sort((a, b) => b.projection - a.projection)

  for (let i = 0; i < flexCount && i < flexEligible.length; i++) {
    const player = flexEligible[i]
    totalProjection += player.projection
    usedPlayers.add(player.playerId)
  }

  // Fill SUPER_FLEX if exists
  const superFlexCount = positionCounts.get('SUPER_FLEX') || 0
  if (superFlexCount > 0) {
    const superFlexEligible: Array<{ playerId: string; projection: number }> = []

    ;['QB', 'RB', 'WR', 'TE'].forEach(position => {
      const players = playersByPosition.get(position) || []
      players.forEach(player => {
        if (!usedPlayers.has(player.playerId)) {
          superFlexEligible.push(player)
        }
      })
    })

    superFlexEligible.sort((a, b) => b.projection - a.projection)

    for (let i = 0; i < superFlexCount && i < superFlexEligible.length; i++) {
      const player = superFlexEligible[i]
      totalProjection += player.projection
    }
  }

  return totalProjection
}

/**
 * Calculate average projected points across multiple weeks
 */
export function calculateAverageProjection(
  roster: string[],
  weekProjections: Map<number, Map<string, PlayerProjection>>,
  players: Record<string, any>,
  rosterPositions: string[],
  scoringType: 'pts_ppr' | 'pts_half_ppr' | 'pts_std' = 'pts_ppr'
): number {
  const weeks = Array.from(weekProjections.keys())
  if (weeks.length === 0) return 0

  let totalProjection = 0
  weeks.forEach(week => {
    const projections = weekProjections.get(week)!
    const weekProjection = getOptimalLineupProjection(
      roster,
      projections,
      players,
      rosterPositions,
      scoringType
    )
    totalProjection += weekProjection
  })

  return totalProjection / weeks.length
}

/**
 * Get position-specific projections for rest of season
 */
export function getPositionProjections(
  roster: string[],
  weekProjections: Map<number, Map<string, PlayerProjection>>,
  players: Record<string, any>,
  rosterPositions: string[],
  scoringType: 'pts_ppr' | 'pts_half_ppr' | 'pts_std' = 'pts_ppr'
): Record<string, number> {
  const positionTotals: Record<string, number> = {
    QB: 0,
    RB: 0,
    WR: 0,
    TE: 0,
    FLEX: 0
  }

  const weeks = Array.from(weekProjections.keys())
  if (weeks.length === 0) return positionTotals

  weeks.forEach(week => {
    const projections = weekProjections.get(week)!
    const weekPositions = calculateWeekPositionProjections(
      roster,
      projections,
      players,
      rosterPositions,
      scoringType
    )

    Object.keys(weekPositions).forEach(position => {
      if (positionTotals[position] !== undefined) {
        positionTotals[position] += weekPositions[position]
      }
    })
  })

  return positionTotals
}

/**
 * Calculate position projections for a single week
 */
function calculateWeekPositionProjections(
  roster: string[],
  projections: Map<string, PlayerProjection>,
  players: Record<string, any>,
  rosterPositions: string[],
  scoringType: 'pts_ppr' | 'pts_half_ppr' | 'pts_std' = 'pts_ppr'
): Record<string, number> {
  const positionTotals: Record<string, number> = {
    QB: 0,
    RB: 0,
    WR: 0,
    TE: 0,
    FLEX: 0
  }

  // Group players by position with their projections
  const playersByPosition = new Map<string, Array<{ playerId: string; projection: number }>>()

  roster.forEach(playerId => {
    const projection = projections.get(playerId)
    const player = players[playerId]
    
    if (!projection?.stats || !player) return

    const points = projection.stats[scoringType] || 0
    const position = player.position || 'UNKNOWN'

    if (!playersByPosition.has(position)) {
      playersByPosition.set(position, [])
    }
    playersByPosition.get(position)!.push({ playerId, projection: points })
  })

  // Sort each position by projection
  playersByPosition.forEach(players => {
    players.sort((a, b) => b.projection - a.projection)
  })

  const usedPlayers = new Set<string>()

  // Count required starters
  const positionCounts = new Map<string, number>()
  rosterPositions.forEach(pos => {
    if (pos === 'BN' || pos === 'IR') return
    positionCounts.set(pos, (positionCounts.get(pos) || 0) + 1)
  })

  // Fill specific positions
  const specificPositions = ['QB', 'RB', 'WR', 'TE']
  specificPositions.forEach(position => {
    const needed = positionCounts.get(position) || 0
    const available = playersByPosition.get(position) || []

    for (let i = 0; i < needed && i < available.length; i++) {
      const player = available[i]
      if (!usedPlayers.has(player.playerId)) {
        positionTotals[position] += player.projection
        usedPlayers.add(player.playerId)
      }
    }
  })

  // Fill FLEX
  const flexCount = positionCounts.get('FLEX') || 0
  const flexEligible: Array<{ playerId: string; projection: number; position: string }> = []

  ;['RB', 'WR', 'TE'].forEach(position => {
    const players = playersByPosition.get(position) || []
    players.forEach(player => {
      if (!usedPlayers.has(player.playerId)) {
        flexEligible.push({ ...player, position })
      }
    })
  })

  flexEligible.sort((a, b) => b.projection - a.projection)

  for (let i = 0; i < flexCount && i < flexEligible.length; i++) {
    const player = flexEligible[i]
    positionTotals.FLEX += player.projection
    usedPlayers.add(player.playerId)
  }

  return positionTotals
}

export interface DetailedPlayerProjection {
  playerId: string
  name: string
  position: string
  team: string
  rosProjection: number
  weeklyAvg: number
  weeksRemaining: number
  isStarter: boolean
  slotPosition: string // QB, RB1, RB2, WR1, WR2, TE, FLEX, etc.
  headshot?: string
  age?: number
  yearsExp?: number
  injuryStatus?: string
  positionRank?: number // Rank among all players at this position on the team
}

export interface DetailedPositionProjections {
  starters: DetailedPlayerProjection[]
  bench: DetailedPlayerProjection[]
  byPosition: Record<string, DetailedPlayerProjection[]>
  totals: Record<string, number>
  allPlayers: DetailedPlayerProjection[] // All players sorted by projection
}

/**
 * Get detailed player-level projections for rest of season
 */
export function getDetailedPositionProjections(
  roster: string[],
  weekProjections: Map<number, Map<string, PlayerProjection>>,
  players: Record<string, any>,
  rosterPositions: string[],
  scoringType: 'pts_ppr' | 'pts_half_ppr' | 'pts_std' = 'pts_ppr'
): DetailedPositionProjections {
  const weeks = Array.from(weekProjections.keys())
  const weeksRemaining = weeks.length
  
  // Default roster positions if not provided
  const defaultRosterPositions = ['QB', 'RB', 'RB', 'WR', 'WR', 'TE', 'FLEX', 'FLEX', 'BN', 'BN', 'BN', 'BN', 'BN', 'BN']
  const effectiveRosterPositions = rosterPositions && rosterPositions.length > 0 ? rosterPositions : defaultRosterPositions
  
  // Calculate total ROS projection per player
  const playerProjections = new Map<string, number>()
  
  roster.forEach(playerId => {
    let totalProjection = 0
    weeks.forEach(week => {
      const weekProj = weekProjections.get(week)
      const proj = weekProj?.get(playerId)
      if (proj?.stats) {
        totalProjection += proj.stats[scoringType] || 0
      }
    })
    playerProjections.set(playerId, totalProjection)
  })
  
  // Group players by position
  const playersByPosition = new Map<string, Array<{ playerId: string; projection: number; player: any }>>()
  
  roster.forEach(playerId => {
    const player = players[playerId]
    const projection = playerProjections.get(playerId) || 0
    
    if (!player) return
    
    const position = player.position || 'UNKNOWN'
    
    if (!playersByPosition.has(position)) {
      playersByPosition.set(position, [])
    }
    playersByPosition.get(position)!.push({ playerId, projection, player })
  })
  
  // Sort each position by projection
  playersByPosition.forEach(players => {
    players.sort((a, b) => b.projection - a.projection)
  })
  
  // Count required starters by position
  const positionCounts = new Map<string, number>()
  effectiveRosterPositions.forEach(pos => {
    if (pos === 'BN' || pos === 'IR') return
    positionCounts.set(pos, (positionCounts.get(pos) || 0) + 1)
  })
  
  const usedPlayers = new Set<string>()
  const starters: DetailedPlayerProjection[] = []
  const bench: DetailedPlayerProjection[] = []
  const byPosition: Record<string, DetailedPlayerProjection[]> = {
    QB: [], RB: [], WR: [], TE: [], FLEX: []
  }
  const totals: Record<string, number> = {
    QB: 0, RB: 0, WR: 0, TE: 0, FLEX: 0
  }
  
  const createPlayerDetail = (
    playerId: string,
    player: any, 
    projection: number, 
    isStarter: boolean,
    slotPosition: string
  ): DetailedPlayerProjection => ({
    playerId,
    name: player.full_name || (player.first_name && player.last_name ? player.first_name + ' ' + player.last_name : 'Unknown'),
    position: player.position || 'UNKNOWN',
    team: player.team || 'FA',
    rosProjection: Math.round(projection * 10) / 10,
    weeklyAvg: weeksRemaining > 0 ? Math.round((projection / weeksRemaining) * 10) / 10 : 0,
    weeksRemaining,
    isStarter,
    slotPosition,
    headshot: playerId ? `https://sleepercdn.com/content/nfl/players/thumb/${playerId}.jpg` : undefined,
    age: player.age,
    yearsExp: player.years_exp,
    injuryStatus: player.injury_status
  })
  
  // Fill specific positions first
  const specificPositions = ['QB', 'RB', 'WR', 'TE']
  specificPositions.forEach(position => {
    const needed = positionCounts.get(position) || 0
    const available = playersByPosition.get(position) || []
    
    for (let i = 0; i < available.length; i++) {
      const { playerId, projection, player } = available[i]
      const isStarter = i < needed && !usedPlayers.has(playerId)
      const slotPosition = isStarter ? `${position}${needed > 1 ? i + 1 : ''}` : 'BN'
      
      if (isStarter) {
        usedPlayers.add(playerId)
        totals[position] = (totals[position] || 0) + projection
      }
      
      const detail = createPlayerDetail(playerId, player, projection, isStarter, slotPosition)
      
      if (isStarter) {
        starters.push(detail)
      }
      
      if (!byPosition[position]) byPosition[position] = []
      byPosition[position].push(detail)
    }
  })
  
  // Fill FLEX positions
  const flexCount = positionCounts.get('FLEX') || 0
  const flexEligible: Array<{ playerId: string; projection: number; player: any; position: string }> = []
  
  ;['RB', 'WR', 'TE'].forEach(position => {
    const available = playersByPosition.get(position) || []
    available.forEach(({ playerId, projection, player }) => {
      if (!usedPlayers.has(playerId)) {
        flexEligible.push({ playerId, projection, player, position })
      }
    })
  })
  
  flexEligible.sort((a, b) => b.projection - a.projection)
  
  for (let i = 0; i < flexCount && i < flexEligible.length; i++) {
    const { playerId, projection, player, position } = flexEligible[i]
    usedPlayers.add(playerId)
    totals.FLEX += projection
    
    const detail = createPlayerDetail(playerId, player, projection, true, 'FLEX')
    starters.push(detail)
    
    if (!byPosition.FLEX) byPosition.FLEX = []
    byPosition.FLEX.push(detail)
  }
  
  // Remaining players go to bench
  roster.forEach(playerId => {
    if (usedPlayers.has(playerId)) return
    
    const player = players[playerId]
    if (!player) return
    
    const projection = playerProjections.get(playerId) || 0
    const detail = createPlayerDetail(playerId, player, projection, false, 'BN')
    bench.push(detail)
  })
  
  // Sort bench by projection
  bench.sort((a, b) => b.rosProjection - a.rosProjection)
  
  // Create allPlayers list sorted by projection (for ranking)
  const allPlayers = [...starters, ...bench].sort((a, b) => b.rosProjection - a.rosProjection)
  
  // Calculate position ranks for all players
  const positionRankCounters: Record<string, number> = {}
  
  // Group all players by position and sort by projection
  const allPlayersByPosition: Record<string, DetailedPlayerProjection[]> = {}
  allPlayers.forEach(player => {
    const pos = player.position
    if (!allPlayersByPosition[pos]) allPlayersByPosition[pos] = []
    allPlayersByPosition[pos].push(player)
  })
  
  // Assign position ranks
  Object.keys(allPlayersByPosition).forEach(pos => {
    allPlayersByPosition[pos].sort((a, b) => b.rosProjection - a.rosProjection)
    allPlayersByPosition[pos].forEach((player, idx) => {
      player.positionRank = idx + 1
    })
  })
  
  return { starters, bench, byPosition, totals, allPlayers }
}
