// Team Correction Service
// Fixes incorrect team codes from ESPN/Yahoo APIs

import { nbaPlayerTeamMappings, playerNameAliases, teamCodeCorrections } from './nbaTeamMappings'

export class TeamCorrectionService {
  /**
   * Get the correct NBA team code for a player
   * @param playerName - Full name of the player
   * @param currentTeamCode - Team code from API (might be wrong)
   * @param sport - Sport type (basketball, baseball, hockey)
   * @returns Corrected team code or original if no correction needed
   */
  getCorrectTeamCode(playerName: string, currentTeamCode: string | undefined, sport: string): string | null {
    // Only correct for basketball
    if (sport !== 'basketball') {
      return currentTeamCode || null
    }
    
    // Normalize player name (remove accents, handle variations)
    const normalizedName = this.normalizePlayerName(playerName)
    
    // Check if we have a mapping for this player
    if (nbaPlayerTeamMappings[normalizedName]) {
      const correctTeam = nbaPlayerTeamMappings[normalizedName]
      
      // Log correction if different from API
      if (currentTeamCode && currentTeamCode !== correctTeam) {
        console.log(`[TeamCorrection] Fixed ${playerName}: ${currentTeamCode} -> ${correctTeam}`)
      }
      
      return correctTeam
    }
    
    // Check if current team code is obviously wrong (NFL/MLB code)
    if (currentTeamCode && this.isInvalidNBATeamCode(currentTeamCode)) {
      console.warn(`[TeamCorrection] Invalid NBA code for ${playerName}: ${currentTeamCode} (no correction available)`)
      return null
    }
    
    // Check for team code corrections (abbreviation variations)
    if (currentTeamCode && teamCodeCorrections[currentTeamCode] !== undefined) {
      const corrected = teamCodeCorrections[currentTeamCode]
      if (corrected !== currentTeamCode) {
        console.log(`[TeamCorrection] Corrected abbreviation ${playerName}: ${currentTeamCode} -> ${corrected}`)
      }
      return corrected
    }
    
    // No correction needed, return original
    return currentTeamCode || null
  }
  
  /**
   * Normalize player name for matching
   */
  private normalizePlayerName(name: string): string {
    // Check aliases first
    if (playerNameAliases[name]) {
      return playerNameAliases[name]
    }
    
    // Remove accents and special characters
    return name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
  }
  
  /**
   * Check if a team code is obviously wrong for NBA
   */
  private isInvalidNBATeamCode(code: string): boolean {
    const invalidCodes = [
      'PIT', 'TEN', 'CAR', 'NE', 'FA', 'GB', 'KC', 'BAL', 'CIN', 
      'JAX', 'HOU', 'IND', 'DEN', 'TB', 'ARI', 'SEA', 'LAR'
    ]
    
    // Check if it's in the invalid list
    if (invalidCodes.includes(code)) {
      return true
    }
    
    // Check if it's 3+ characters (NBA uses 2-3 char codes)
    if (code.length > 3) {
      return true
    }
    
    return false
  }
  
  /**
   * Apply team correction to a player object
   */
  correctPlayerTeam(player: any, sport: string): any {
    if (!player || sport !== 'basketball') {
      return player
    }
    
    // Get all possible team codes from player
    const currentTeamCode = player.mlb_team || player.nba_team || player.nhl_team || 
                           player.editorial_team_abbr || player.team_abbr
    
    // Get corrected team code
    const correctedCode = this.getCorrectTeamCode(
      player.full_name || player.name,
      currentTeamCode,
      sport
    )
    
    // Apply correction - set nba_team as primary for basketball
    if (correctedCode) {
      return {
        ...player,
        nba_team: correctedCode,
        mlb_team: undefined, // Clear wrong sport codes
        nhl_team: undefined,
        correctedTeam: true // Flag that this was corrected
      }
    }
    
    return player
  }
  
  /**
   * Bulk correct an array of players
   */
  correctPlayerTeams(players: any[], sport: string): any[] {
    if (sport !== 'basketball') {
      return players
    }
    
    return players.map(p => this.correctPlayerTeam(p, sport))
  }
}

// Export singleton instance
export const teamCorrectionService = new TeamCorrectionService()
