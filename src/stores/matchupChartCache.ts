import { reactive } from 'vue'

export interface CachedWeekMatchup {
  matchupId: string | number
  team1Name: string
  team2Name: string
  team1Logo: string
  team2Logo: string
  team1WinProb: number
  team2WinProb: number
  d1: number[]
  d2: number[]
  labels: string[]
}

const currentWeekMatchups = reactive<CachedWeekMatchup[]>([])

export const matchupChartCache = {
  setWeekMatchups(matchups: CachedWeekMatchup[]) {
    currentWeekMatchups.splice(0, currentWeekMatchups.length, ...matchups)
  },
  getWeekMatchups(): CachedWeekMatchup[] {
    return currentWeekMatchups
  },
  hasData(): boolean {
    return currentWeekMatchups.length > 0
  }
}
