/**
 * Awards Calculation Service
 * Handles complex calculations for all-time, season, and weekly awards
 */

import { sleeperService } from './sleeper'
import type { SleeperRoster, SleeperMatchup, SleeperTransaction, SleeperPlayer } from '@/types/sleeper'

export interface AwardWinner {
  team_name: string
  owner_id: string
  avatar: string
  value: number
  details: string
  season?: string
  week?: number
}

export interface TradeAward {
  team_name: string
  owner_id: string
  avatar: string
  players: string[]
  value: number
  details: string
  season: string
  week: number
}

export interface WaiverAward {
  team_name: string
  owner_id: string
  avatar: string
  player_name: string
  position: string
  avg_rank: number
  details: string
  season: string
  week: number
}

/**
 * Calculate all-play record for a team in a season
 */
export function calculateAllPlayRecord(
  rosterId: number,
  matchupsByWeek: Map<number, SleeperMatchup[]>,
  playoffStart: number
): { wins: number; losses: number; ties: number } {
  let wins = 0
  let losses = 0
  let ties = 0

  matchupsByWeek.forEach((matchups, week) => {
    if (week >= playoffStart) return

    const myMatchup = matchups.find(m => m.roster_id === rosterId)
    if (!myMatchup) return

    const myPoints = myMatchup.points || 0

    matchups.forEach(opponent => {
      if (opponent.roster_id === rosterId) return
      const oppPoints = opponent.points || 0

      if (myPoints > oppPoints) wins++
      else if (myPoints < oppPoints) losses++
      else ties++
    })
  })

  return { wins, losses, ties }
}

/**
 * Find team with most points in a season
 */
export function findMostPointsSeason(
  rosters: SleeperRoster[],
  users: any[],
  matchupsByWeek: Map<number, SleeperMatchup[]>,
  league: any,
  playoffStart: number
): AwardWinner | null {
  let maxPoints = 0
  let winner: AwardWinner | null = null

  rosters.forEach(roster => {
    let totalPoints = 0
    let games = 0

    matchupsByWeek.forEach((matchups, week) => {
      if (week >= playoffStart) return
      const myMatch = matchups.find(m => m.roster_id === roster.roster_id)
      if (myMatch) {
        totalPoints += myMatch.points || 0
        games++
      }
    })

    if (totalPoints > maxPoints && games > 0) {
      maxPoints = totalPoints
      const user = users.find(u => u.user_id === roster.owner_id)
      winner = {
        team_name: sleeperService.getTeamName(roster, user),
        owner_id: roster.owner_id || '',
        avatar: sleeperService.getAvatarUrl(roster, user, league),
        value: totalPoints,
        details: `${totalPoints.toFixed(1)} points in ${games} games (${(totalPoints / games).toFixed(1)} PPG)`
      }
    }
  })

  return winner
}

/**
 * Find team with least points in a season
 */
export function findLeastPointsSeason(
  rosters: SleeperRoster[],
  users: any[],
  matchupsByWeek: Map<number, SleeperMatchup[]>,
  league: any,
  playoffStart: number
): AwardWinner | null {
  let minPoints = Infinity
  let winner: AwardWinner | null = null

  rosters.forEach(roster => {
    let totalPoints = 0
    let games = 0

    matchupsByWeek.forEach((matchups, week) => {
      if (week >= playoffStart) return
      const myMatch = matchups.find(m => m.roster_id === roster.roster_id)
      if (myMatch) {
        totalPoints += myMatch.points || 0
        games++
      }
    })

    if (totalPoints < minPoints && games > 0) {
      minPoints = totalPoints
      const user = users.find(u => u.user_id === roster.owner_id)
      winner = {
        team_name: sleeperService.getTeamName(roster, user),
        owner_id: roster.owner_id || '',
        avatar: sleeperService.getAvatarUrl(roster, user, league),
        value: totalPoints,
        details: `${totalPoints.toFixed(1)} points in ${games} games (${(totalPoints / games).toFixed(1)} PPG)`
      }
    }
  })

  return winner
}

/**
 * Find highest scoring week
 */
export function findMostPointsWeek(
  rosters: SleeperRoster[],
  users: any[],
  matchupsByWeek: Map<number, SleeperMatchup[]>,
  league: any,
  playoffStart: number
): AwardWinner | null {
  let maxPoints = 0
  let winner: AwardWinner | null = null

  matchupsByWeek.forEach((matchups, week) => {
    if (week >= playoffStart) return

    matchups.forEach(matchup => {
      const points = matchup.points || 0
      if (points > maxPoints) {
        maxPoints = points
        const roster = rosters.find(r => r.roster_id === matchup.roster_id)
        const user = users.find(u => u.user_id === roster?.owner_id)

        winner = {
          team_name: sleeperService.getTeamName(roster!, user),
          owner_id: roster?.owner_id || '',
          avatar: sleeperService.getAvatarUrl(roster!, user, league),
          value: maxPoints,
          details: `Week ${week}`,
          week
        }
      }
    })
  })

  return winner
}

/**
 * Find lowest scoring week
 */
export function findLeastPointsWeek(
  rosters: SleeperRoster[],
  users: any[],
  matchupsByWeek: Map<number, SleeperMatchup[]>,
  league: any,
  playoffStart: number
): AwardWinner | null {
  let minPoints = Infinity
  let winner: AwardWinner | null = null

  matchupsByWeek.forEach((matchups, week) => {
    if (week >= playoffStart) return

    matchups.forEach(matchup => {
      const points = matchup.points || 0
      if (points < minPoints && points > 0) {
        minPoints = points
        const roster = rosters.find(r => r.roster_id === matchup.roster_id)
        const user = users.find(u => u.user_id === roster?.owner_id)

        winner = {
          team_name: sleeperService.getTeamName(roster!, user),
          owner_id: roster?.owner_id || '',
          avatar: sleeperService.getAvatarUrl(roster!, user, league),
          value: minPoints,
          details: `Week ${week}`,
          week
        }
      }
    })
  })

  return winner
}

/**
 * Find biggest blowout in a season
 */
export function findBiggestBlowout(
  matchupsByWeek: Map<number, SleeperMatchup[]>,
  rosters: SleeperRoster[],
  users: any[],
  league: any,
  playoffStart: number
): AwardWinner | null {
  let maxMargin = 0
  let winner: AwardWinner | null = null

  matchupsByWeek.forEach((matchups, week) => {
    if (week >= playoffStart) return

    const matchupGroups = new Map<number, SleeperMatchup[]>()
    matchups.forEach(m => {
      if (!m.matchup_id) return
      if (!matchupGroups.has(m.matchup_id)) matchupGroups.set(m.matchup_id, [])
      matchupGroups.get(m.matchup_id)!.push(m)
    })

    matchupGroups.forEach(matchup => {
      if (matchup.length !== 2) return
      const [team1, team2] = matchup
      const margin = Math.abs((team1.points || 0) - (team2.points || 0))

      if (margin > maxMargin) {
        maxMargin = margin
        const winningTeam = (team1.points || 0) > (team2.points || 0) ? team1 : team2
        const losingTeam = (team1.points || 0) > (team2.points || 0) ? team2 : team1
        const roster = rosters.find(r => r.roster_id === winningTeam.roster_id)
        const user = users.find(u => u.user_id === roster?.owner_id)

        winner = {
          team_name: sleeperService.getTeamName(roster!, user),
          owner_id: roster?.owner_id || '',
          avatar: sleeperService.getAvatarUrl(roster!, user, league),
          value: maxMargin,
          details: `${(winningTeam.points || 0).toFixed(1)} - ${(losingTeam.points || 0).toFixed(1)} (Week ${week})`,
          week
        }
      }
    })
  })

  return winner
}

/**
 * Find biggest loss in a season
 */
export function findBiggestLoss(
  matchupsByWeek: Map<number, SleeperMatchup[]>,
  rosters: SleeperRoster[],
  users: any[],
  league: any,
  playoffStart: number
): AwardWinner | null {
  let maxMargin = 0
  let loser: AwardWinner | null = null

  matchupsByWeek.forEach((matchups, week) => {
    if (week >= playoffStart) return

    const matchupGroups = new Map<number, SleeperMatchup[]>()
    matchups.forEach(m => {
      if (!m.matchup_id) return
      if (!matchupGroups.has(m.matchup_id)) matchupGroups.set(m.matchup_id, [])
      matchupGroups.get(m.matchup_id)!.push(m)
    })

    matchupGroups.forEach(matchup => {
      if (matchup.length !== 2) return
      const [team1, team2] = matchup
      const margin = Math.abs((team1.points || 0) - (team2.points || 0))

      if (margin > maxMargin) {
        maxMargin = margin
        const losingTeam = (team1.points || 0) < (team2.points || 0) ? team1 : team2
        const winningTeam = (team1.points || 0) > (team2.points || 0) ? team1 : team2
        const roster = rosters.find(r => r.roster_id === losingTeam.roster_id)
        const user = users.find(u => u.user_id === roster?.owner_id)

        loser = {
          team_name: sleeperService.getTeamName(roster!, user),
          owner_id: roster?.owner_id || '',
          avatar: sleeperService.getAvatarUrl(roster!, user, league),
          value: maxMargin,
          details: `${(losingTeam.points || 0).toFixed(1)} - ${(winningTeam.points || 0).toFixed(1)} (Week ${week})`,
          week
        }
      }
    })
  })

  return loser
}

/**
 * Find luckiest team (best record with worst all-play)
 */
export function findLuckiestTeam(
  rosters: SleeperRoster[],
  users: any[],
  matchupsByWeek: Map<number, SleeperMatchup[]>,
  league: any,
  playoffStart: number
): AwardWinner | null {
  let maxLuckScore = -Infinity
  let luckiest: AwardWinner | null = null

  rosters.forEach(roster => {
    let actualWins = 0
    let actualLosses = 0
    
    matchupsByWeek.forEach((matchups, week) => {
      if (week >= playoffStart) return
      const myMatch = matchups.find(m => m.roster_id === roster.roster_id)
      if (!myMatch?.matchup_id) return
      const opponent = matchups.find(m => m.matchup_id === myMatch.matchup_id && m.roster_id !== roster.roster_id)
      if (opponent) {
        if ((myMatch.points || 0) > (opponent.points || 0)) actualWins++
        else if ((myMatch.points || 0) < (opponent.points || 0)) actualLosses++
      }
    })

    const allPlay = calculateAllPlayRecord(roster.roster_id, matchupsByWeek, playoffStart)
    const totalGames = actualWins + actualLosses
    const allPlayGames = allPlay.wins + allPlay.losses

    if (totalGames === 0 || allPlayGames === 0) return

    const actualWinPct = actualWins / totalGames
    const allPlayWinPct = allPlay.wins / allPlayGames
    const luckScore = actualWinPct - allPlayWinPct

    if (luckScore > maxLuckScore) {
      maxLuckScore = luckScore
      const user = users.find(u => u.user_id === roster.owner_id)
      luckiest = {
        team_name: sleeperService.getTeamName(roster, user),
        owner_id: roster.owner_id || '',
        avatar: sleeperService.getAvatarUrl(roster, user, league),
        value: luckScore * 100,
        details: `${actualWins}-${actualLosses} record vs ${allPlay.wins}-${allPlay.losses} all-play (+${(luckScore * 100).toFixed(1)}%)`
      }
    }
  })

  return luckiest
}

/**
 * Find unluckiest team (worst record with best all-play)
 */
export function findUnluckiestTeam(
  rosters: SleeperRoster[],
  users: any[],
  matchupsByWeek: Map<number, SleeperMatchup[]>,
  league: any,
  playoffStart: number
): AwardWinner | null {
  let minLuckScore = Infinity
  let unluckiest: AwardWinner | null = null

  rosters.forEach(roster => {
    let actualWins = 0
    let actualLosses = 0
    
    matchupsByWeek.forEach((matchups, week) => {
      if (week >= playoffStart) return
      const myMatch = matchups.find(m => m.roster_id === roster.roster_id)
      if (!myMatch?.matchup_id) return
      const opponent = matchups.find(m => m.matchup_id === myMatch.matchup_id && m.roster_id !== roster.roster_id)
      if (opponent) {
        if ((myMatch.points || 0) > (opponent.points || 0)) actualWins++
        else if ((myMatch.points || 0) < (opponent.points || 0)) actualLosses++
      }
    })

    const allPlay = calculateAllPlayRecord(roster.roster_id, matchupsByWeek, playoffStart)
    const totalGames = actualWins + actualLosses
    const allPlayGames = allPlay.wins + allPlay.losses

    if (totalGames === 0 || allPlayGames === 0) return

    const actualWinPct = actualWins / totalGames
    const allPlayWinPct = allPlay.wins / allPlayGames
    const luckScore = actualWinPct - allPlayWinPct

    if (luckScore < minLuckScore) {
      minLuckScore = luckScore
      const user = users.find(u => u.user_id === roster.owner_id)
      unluckiest = {
        team_name: sleeperService.getTeamName(roster, user),
        owner_id: roster.owner_id || '',
        avatar: sleeperService.getAvatarUrl(roster, user, league),
        value: Math.abs(luckScore * 100),
        details: `${actualWins}-${actualLosses} record vs ${allPlay.wins}-${allPlay.losses} all-play (${(luckScore * 100).toFixed(1)}%)`
      }
    }
  })

  return unluckiest
}

/**
 * Calculate average positional ranking for a player after acquisition
 */
export async function calculatePlayerValueAfterAcquisition(
  playerId: string,
  acquisitionWeek: number,
  season: string,
  matchupsByWeek: Map<number, SleeperMatchup[]>,
  allPlayers: Record<string, SleeperPlayer>
): Promise<number> {
  const player = allPlayers[playerId]
  if (!player?.position) return 999

  const position = player.position
  const weeks = Array.from(matchupsByWeek.keys()).filter(w => w > acquisitionWeek).sort((a, b) => a - b)
  
  if (weeks.length === 0) return 999

  let totalRank = 0
  let validWeeks = 0

  for (const week of weeks) {
    const weekMatchups = matchupsByWeek.get(week) || []
    
    // Get all players at this position who played this week
    const positionScores: { playerId: string; points: number }[] = []

    weekMatchups.forEach(matchup => {
      if (!matchup.players_points) return
      Object.entries(matchup.players_points).forEach(([pid, points]) => {
        const p = allPlayers[pid]
        if (p?.position === position && points > 0) {
          positionScores.push({ playerId: pid, points: points as number })
        }
      })
    })

    // Sort by points descending
    positionScores.sort((a, b) => b.points - a.points)

    // Find our player's rank
    const rank = positionScores.findIndex(p => p.playerId === playerId)
    if (rank !== -1 && rank < 999) {
      totalRank += rank + 1
      validWeeks++
    }
  }

  return validWeeks > 0 ? totalRank / validWeeks : 999
}

/**
 * Find best waiver pickup by position
 */
export async function findBestWaiverPickup(
  position: string,
  season: string,
  leagueId: string,
  transactions: SleeperTransaction[],
  matchupsByWeek: Map<number, SleeperMatchup[]>,
  rosters: SleeperRoster[],
  users: any[],
  league: any,
  allPlayers: Record<string, SleeperPlayer>
): Promise<WaiverAward | null> {
  const waiverPickups: Array<{
    playerId: string
    playerName: string
    rosterId: number
    week: number
    avgRank: number
  }> = []

  // Find all waiver pickups for this position
  for (const tx of transactions) {
    if (tx.type !== 'waiver') continue
    if (!tx.adds || !tx.roster_ids?.[0]) continue

    const pickupWeek = tx.leg || 1

    for (const playerId of Object.keys(tx.adds)) {
      const player = allPlayers[playerId]
      if (player?.position !== position) continue

      // Calculate average ranking after pickup
      const avgRank = await calculatePlayerValueAfterAcquisition(
        playerId,
        pickupWeek,
        season,
        matchupsByWeek,
        allPlayers
      )

      if (avgRank < 999) {
        waiverPickups.push({
          playerId,
          playerName: player.full_name || 'Unknown',
          rosterId: tx.roster_ids[0],
          week: pickupWeek,
          avgRank
        })
      }
    }
  }

  if (waiverPickups.length === 0) return null

  // Find best (lowest average rank)
  const best = waiverPickups.reduce((a, b) => a.avgRank < b.avgRank ? a : b)
  const roster = rosters.find(r => r.roster_id === best.rosterId)
  const user = users.find(u => u.user_id === roster?.owner_id)

  return {
    team_name: sleeperService.getTeamName(roster!, user),
    owner_id: roster?.owner_id || '',
    avatar: sleeperService.getAvatarUrl(roster!, user, league),
    player_name: best.playerName,
    position,
    avg_rank: best.avgRank,
    details: `Averaged #${Math.round(best.avgRank)} ${position} after Week ${best.week} pickup`,
    season,
    week: best.week
  }
}

/**
 * Find best trade based on player performance after trade
 */
export async function findBestTrade(
  season: string,
  leagueId: string,
  transactions: SleeperTransaction[],
  matchupsByWeek: Map<number, SleeperMatchup[]>,
  rosters: SleeperRoster[],
  users: any[],
  league: any,
  allPlayers: Record<string, SleeperPlayer>
): Promise<TradeAward | null> {
  const tradeAnalysis: Array<{
    rosterId: number
    players: string[]
    avgRank: number
    week: number
    details: string
  }> = []

  // Analyze all trades
  for (const tx of transactions) {
    if (tx.type !== 'trade') continue
    if (!tx.adds || !tx.roster_ids) continue

    const tradeWeek = tx.leg || 1

    // Analyze what each team got
    for (let i = 0; i < tx.roster_ids.length; i++) {
      const rosterId = tx.roster_ids[i]
      const playersAdded = Object.keys(tx.adds).filter(
        (playerId) => tx.adds![playerId] === rosterId
      )

      if (playersAdded.length === 0) continue

      // Calculate average value of all players acquired
      let totalRank = 0
      let validPlayers = 0
      const playerNames: string[] = []

      for (const playerId of playersAdded) {
        const player = allPlayers[playerId]
        if (!player) continue

        playerNames.push(player.full_name || playerId)

        const avgRank = await calculatePlayerValueAfterAcquisition(
          playerId,
          tradeWeek,
          season,
          matchupsByWeek,
          allPlayers
        )

        if (avgRank < 999) {
          totalRank += avgRank
          validPlayers++
        }
      }

      if (validPlayers > 0) {
        const avgTradeRank = totalRank / validPlayers
        tradeAnalysis.push({
          rosterId,
          players: playerNames,
          avgRank: avgTradeRank,
          week: tradeWeek,
          details: playerNames.join(', ')
        })
      }
    }
  }

  if (tradeAnalysis.length === 0) return null

  // Find best trade (lowest average rank = best players)
  const best = tradeAnalysis.reduce((a, b) => a.avgRank < b.avgRank ? a : b)
  const roster = rosters.find(r => r.roster_id === best.rosterId)
  const user = users.find(u => u.user_id === roster?.owner_id)

  return {
    team_name: sleeperService.getTeamName(roster!, user),
    owner_id: roster?.owner_id || '',
    avatar: sleeperService.getAvatarUrl(roster!, user, league),
    players: best.players,
    value: best.avgRank,
    details: `Acquired ${best.details} - Avg rank ${Math.round(best.avgRank)}`,
    season,
    week: best.week
  }
}

export const awardsService = {
  calculateAllPlayRecord,
  findMostPointsSeason,
  findLeastPointsSeason,
  findMostPointsWeek,
  findLeastPointsWeek,
  findBiggestBlowout,
  findBiggestLoss,
  findLuckiestTeam,
  findUnluckiestTeam,
  calculatePlayerValueAfterAcquisition,
  findBestWaiverPickup,
  findBestTrade
}
