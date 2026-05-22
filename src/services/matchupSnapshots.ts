/**
 * Matchup Snapshots Service
 * 
 * Handles storing and retrieving daily matchup snapshots for historical accuracy.
 * This ensures win probability charts show REAL data, not simulations, for past weeks.
 */

import { supabase } from '@/lib/supabase'

export interface MatchupSnapshot {
  id?: string
  league_key: string
  platform: 'yahoo' | 'sleeper'
  sport: string
  season: string
  week: number
  matchup_id: number
  snapshot_date: string // YYYY-MM-DD
  day_of_week: number // 0=Mon, 6=Sun
  
  team1_key: string
  team1_name: string
  team1_points: number
  team1_projected: number
  
  team2_key: string
  team2_name: string
  team2_points: number
  team2_projected: number
  
  team1_win_prob: number
  team2_win_prob: number
  
  is_final: boolean
  created_at?: string
  updated_at?: string
}

export interface MatchupSnapshotInput {
  league_key: string
  platform: 'yahoo' | 'sleeper'
  sport: string
  season: string
  week: number
  matchup_id: number
  
  team1_key: string
  team1_name: string
  team1_points: number
  team1_projected: number
  
  team2_key: string
  team2_name: string
  team2_points: number
  team2_projected: number
  
  is_final?: boolean
}

class MatchupSnapshotsService {
  /**
   * Calculate win probability based on current and projected points
   */
  calculateWinProbability(
    team1Points: number,
    team1Projected: number,
    team2Points: number,
    team2Projected: number,
    isFinal: boolean
  ): { team1: number; team2: number } {
    // For final results, use 100/0
    if (isFinal) {
      if (team1Points > team2Points) return { team1: 100, team2: 0 }
      if (team2Points > team1Points) return { team1: 0, team2: 100 }
      return { team1: 50, team2: 50 } // Tie
    }
    
    // For live matchups, blend current points with projected
    // Weight current points more as the week progresses
    const currentTotal = team1Points + team2Points
    const projectedTotal = team1Projected + team2Projected
    
    if (currentTotal === 0 && projectedTotal === 0) {
      return { team1: 50, team2: 50 }
    }
    
    // Calculate probability based on projected final scores
    const team1Expected = team1Projected > 0 ? team1Projected : team1Points
    const team2Expected = team2Projected > 0 ? team2Projected : team2Points
    const expectedTotal = team1Expected + team2Expected
    
    if (expectedTotal === 0) return { team1: 50, team2: 50 }
    
    let team1Prob = (team1Expected / expectedTotal) * 100
    
    // Clamp between 5% and 95% for non-final matchups (uncertainty)
    team1Prob = Math.min(95, Math.max(5, team1Prob))
    
    return {
      team1: Math.round(team1Prob * 100) / 100,
      team2: Math.round((100 - team1Prob) * 100) / 100
    }
  }
  
  /**
   * Get today's date info
   */
  getTodayInfo(): { date: string; dayOfWeek: number } {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    
    // Convert JS day (0=Sun) to our format (0=Mon, 6=Sun)
    const jsDay = now.getDay()
    const dayOfWeek = jsDay === 0 ? 6 : jsDay - 1
    
    return {
      date: `${year}-${month}-${day}`,
      dayOfWeek
    }
  }
  
  /**
   * Take a snapshot of current matchup state
   */
  async takeSnapshot(input: MatchupSnapshotInput): Promise<MatchupSnapshot | null> {
    if (!supabase) {
      console.warn('Supabase not available, cannot take snapshot')
      return null
    }
    
    const { date, dayOfWeek } = this.getTodayInfo()
    const isFinal = input.is_final || dayOfWeek === 6 // Sunday = final
    
    const winProb = this.calculateWinProbability(
      input.team1_points,
      input.team1_projected,
      input.team2_points,
      input.team2_projected,
      isFinal
    )
    
    const snapshot: Omit<MatchupSnapshot, 'id' | 'created_at' | 'updated_at'> = {
      league_key: input.league_key,
      platform: input.platform,
      sport: input.sport,
      season: input.season,
      week: input.week,
      matchup_id: input.matchup_id,
      snapshot_date: date,
      day_of_week: dayOfWeek,
      
      team1_key: input.team1_key,
      team1_name: input.team1_name,
      team1_points: input.team1_points,
      team1_projected: input.team1_projected,
      
      team2_key: input.team2_key,
      team2_name: input.team2_name,
      team2_points: input.team2_points,
      team2_projected: input.team2_projected,
      
      team1_win_prob: winProb.team1,
      team2_win_prob: winProb.team2,
      
      is_final: isFinal
    }
    
    try {
      // Use upsert to handle duplicate days (update if exists)
      const { data, error } = await supabase
        .from('matchup_snapshots')
        .upsert(snapshot, {
          onConflict: 'league_key,week,matchup_id,snapshot_date',
          ignoreDuplicates: false
        })
        .select()
        .single()
      
      if (error) {
        console.error('Failed to save snapshot:', error)
        return null
      }
      
      console.log(`Snapshot saved for ${input.league_key} week ${input.week} matchup ${input.matchup_id} (${date})`)
      return data
    } catch (e) {
      console.error('Error taking snapshot:', e)
      return null
    }
  }
  
  /**
   * Take snapshots for all matchups in a week
   */
  async takeWeekSnapshots(
    leagueKey: string,
    platform: 'yahoo' | 'sleeper',
    sport: string,
    season: string,
    week: number,
    matchups: Array<{
      matchup_id: number
      team1: { team_key: string; name: string; points: number; projected_points?: number }
      team2: { team_key: string; name: string; points: number; projected_points?: number }
      status?: string
    }>
  ): Promise<number> {
    let savedCount = 0
    
    for (const matchup of matchups) {
      const snapshot = await this.takeSnapshot({
        league_key: leagueKey,
        platform,
        sport,
        season,
        week,
        matchup_id: matchup.matchup_id,
        team1_key: matchup.team1.team_key,
        team1_name: matchup.team1.name,
        team1_points: matchup.team1.points || 0,
        team1_projected: matchup.team1.projected_points || 0,
        team2_key: matchup.team2.team_key,
        team2_name: matchup.team2.name,
        team2_points: matchup.team2.points || 0,
        team2_projected: matchup.team2.projected_points || 0,
        is_final: matchup.status === 'final'
      })
      
      if (snapshot) savedCount++
    }
    
    console.log(`Saved ${savedCount}/${matchups.length} snapshots for week ${week}`)
    return savedCount
  }
  
  /**
   * Get all snapshots for a specific matchup
   */
  async getMatchupSnapshots(
    leagueKey: string,
    week: number,
    matchupId: number
  ): Promise<MatchupSnapshot[]> {
    if (!supabase) {
      console.warn('Supabase not available')
      return []
    }
    
    try {
      const { data, error } = await supabase
        .from('matchup_snapshots')
        .select('*')
        .eq('league_key', leagueKey)
        .eq('week', week)
        .eq('matchup_id', matchupId)
        .order('day_of_week', { ascending: true })
      
      if (error) {
        console.error('Failed to fetch snapshots:', error)
        return []
      }
      
      return data || []
    } catch (e) {
      console.error('Error fetching snapshots:', e)
      return []
    }
  }
  
  /**
   * Get all snapshots for a week (all matchups)
   */
  async getWeekSnapshots(
    leagueKey: string,
    week: number,
    season?: string
  ): Promise<Map<number, MatchupSnapshot[]>> {
    if (!supabase) {
      console.warn('Supabase not available')
      return new Map()
    }
    
    try {
      let query = supabase
        .from('matchup_snapshots')
        .select('*')
        .eq('league_key', leagueKey)
        .eq('week', week)
        .order('matchup_id', { ascending: true })
        .order('day_of_week', { ascending: true })
      
      if (season) {
        query = query.eq('season', season)
      }
      
      const { data, error } = await query
      
      if (error) {
        console.error('Failed to fetch week snapshots:', error)
        return new Map()
      }
      
      // Group by matchup_id
      const grouped = new Map<number, MatchupSnapshot[]>()
      for (const snapshot of data || []) {
        const existing = grouped.get(snapshot.matchup_id) || []
        existing.push(snapshot)
        grouped.set(snapshot.matchup_id, existing)
      }
      
      return grouped
    } catch (e) {
      console.error('Error fetching week snapshots:', e)
      return new Map()
    }
  }
  
  /**
   * Check if we have snapshots for a given week
   */
  async hasSnapshots(leagueKey: string, week: number): Promise<boolean> {
    if (!supabase) return false
    
    try {
      const { count, error } = await supabase
        .from('matchup_snapshots')
        .select('*', { count: 'exact', head: true })
        .eq('league_key', leagueKey)
        .eq('week', week)
      
      if (error) return false
      return (count || 0) > 0
    } catch (e) {
      return false
    }
  }
  
  /**
   * Check if today's snapshot already exists
   */
  async hasTodaySnapshot(leagueKey: string, week: number, matchupId: number): Promise<boolean> {
    if (!supabase) return false
    
    const { date } = this.getTodayInfo()
    
    try {
      const { count, error } = await supabase
        .from('matchup_snapshots')
        .select('*', { count: 'exact', head: true })
        .eq('league_key', leagueKey)
        .eq('week', week)
        .eq('matchup_id', matchupId)
        .eq('snapshot_date', date)
      
      if (error) return false
      return (count || 0) > 0
    } catch (e) {
      return false
    }
  }
}

export const matchupSnapshotsService = new MatchupSnapshotsService()
