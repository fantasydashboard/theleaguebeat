import { computed } from 'vue'
import { useLeagueStore } from '@/stores/league'

interface TeamCustomization {
  name: string
  avatar: string
}

/**
 * Composable for accessing and applying team customizations
 */
export function useTeamCustomizations() {
  const leagueStore = useLeagueStore()

  // Get customizations from localStorage
  const getCustomizations = (): Record<number, TeamCustomization> => {
    if (!leagueStore.activeLeagueId) return {}
    
    const key = `team_customizations_${leagueStore.activeLeagueId}`
    const saved = localStorage.getItem(key)
    
    if (saved) {
      try {
        return JSON.parse(saved)
      } catch (e) {
        console.error('Failed to load customizations:', e)
        return {}
      }
    }
    
    return {}
  }

  // Get custom name for a team (or return original)
  const getTeamName = (rosterId: number, originalName: string): string => {
    const customizations = getCustomizations()
    const customName = customizations[rosterId]?.name
    return customName || originalName
  }

  // Get custom avatar for a team (or return original)
  const getTeamAvatar = (rosterId: number, originalAvatar: string): string => {
    const customizations = getCustomizations()
    const customAvatar = customizations[rosterId]?.avatar
    return customAvatar || originalAvatar
  }

  // Get full team info with customizations applied
  const getCustomizedTeamInfo = (rosterId: number) => {
    const roster = leagueStore.rosters.find(r => r.roster_id === rosterId)
    if (!roster) return null

    const teamInfo = leagueStore.getTeamInfo(roster)
    const customizations = getCustomizations()
    const custom = customizations[rosterId]

    return {
      ...teamInfo,
      name: custom?.name || teamInfo.name,
      avatar: custom?.avatar || teamInfo.avatar,
      originalName: teamInfo.name,
      originalAvatar: teamInfo.avatar,
      isCustomized: !!(custom?.name || custom?.avatar)
    }
  }

  // Apply customizations to a team object
  const applyCustomizations = (team: any) => {
    if (!team || !team.roster_id) return team

    const customizations = getCustomizations()
    const custom = customizations[team.roster_id]

    if (custom) {
      return {
        ...team,
        team_name: custom.name || team.team_name,
        avatar_url: custom.avatar || team.avatar_url
      }
    }

    return team
  }

  // Apply customizations to an array of teams
  const applyCustomizationsToTeams = (teams: any[]) => {
    return teams.map(team => applyCustomizations(team))
  }

  return {
    getCustomizations,
    getTeamName,
    getTeamAvatar,
    getCustomizedTeamInfo,
    applyCustomizations,
    applyCustomizationsToTeams
  }
}
