/**
 * Issue state — tiny store that lets ANY view publish the current
 * issue context (week, season, stage, last-sync timestamp) so the
 * layout-level masthead can read it without doing its own adapter
 * fetch.
 *
 * The layout shows the masthead. The view loads live league data.
 * Vue doesn't let children provide data up to parents, so we use a
 * pinia store as the shared bus.
 *
 * Pattern:
 *   1. Home view (or PR/matchups/etc) computes liveData via adapter
 *   2. On load, calls issueStore.setIssue({ currentWeek, currentSeason, ... })
 *   3. Masthead reads from store; if empty, falls back to props
 *      derived from the cached league row in the layout
 */

import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { SeasonStage } from '@/editorial/detection/types'

interface IssuePayload {
  currentWeek: number
  currentSeason: number
  regularSeasonEndWeek?: number
  seasonStage?: SeasonStage
  lastUpdated?: Date
}

export const useIssueStore = defineStore('issue', () => {
  const currentWeek = ref<number | null>(null)
  const currentSeason = ref<number | null>(null)
  const regularSeasonEndWeek = ref<number | null>(null)
  const seasonStage = ref<SeasonStage | null>(null)
  const lastUpdated = ref<Date | null>(null)

  /** Views call this on adapter load to publish what week/season the
   *  user is reading. The masthead reactively picks it up. */
  function setIssue(payload: IssuePayload) {
    currentWeek.value = payload.currentWeek
    currentSeason.value = payload.currentSeason
    regularSeasonEndWeek.value = payload.regularSeasonEndWeek ?? null
    seasonStage.value = payload.seasonStage ?? null
    lastUpdated.value = payload.lastUpdated ?? new Date()
  }

  /** Reset on logout / league change. */
  function clearIssue() {
    currentWeek.value = null
    currentSeason.value = null
    regularSeasonEndWeek.value = null
    seasonStage.value = null
    lastUpdated.value = null
  }

  return {
    currentWeek,
    currentSeason,
    regularSeasonEndWeek,
    seasonStage,
    lastUpdated,
    setIssue,
    clearIssue,
  }
})
