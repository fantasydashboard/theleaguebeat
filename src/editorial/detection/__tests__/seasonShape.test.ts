import { describe, it, expect } from 'vitest'
import { deriveSeasonStage } from '@/editorial/detection/helpers'
import { detectOvernightStories } from '@/editorial/detection/overnight'
import type { LeagueDataH2HPoints } from '@/editorial/types'
import type { IssueContext } from '@/editorial/detection/types'

describe('deriveSeasonStage', () => {
  it('keeps the baseball fallback when no sport is given', () => {
    // endWeek falls back to 12; week 13 is past it → playoffs
    expect(deriveSeasonStage(13, undefined)).toBe('playoffs')
  })

  it('uses a 14-week regular season for football when end week is unknown', () => {
    // Football's regular season runs to 14, so week 13 is still in it.
    expect(deriveSeasonStage(13, undefined, 'nfl')).toBe('final')
    expect(deriveSeasonStage(15, undefined, 'nfl')).toBe('playoffs')
  })

  it('always prefers the platform-supplied end week over the sport default', () => {
    // A 17-week football league. With the supplied end week, week 15 is the
    // last-two-weeks 'final' stage. If the override were ignored and the nfl
    // default of 14 were used instead, week 15 would fall past the regular
    // season entirely and stage as 'playoffs' — so this assertion fails loudly
    // if the platform value stops winning.
    expect(deriveSeasonStage(15, 17, 'nfl')).toBe('final')
  })

  it('stages a typical football season sensibly', () => {
    const stage = (w: number) => deriveSeasonStage(w, 14, 'nfl')
    expect(stage(1)).toBe('opening')
    expect(stage(5)).toBe('settling')
    expect(stage(8)).toBe('midseason')
    expect(stage(13)).toBe('final')
    expect(stage(16)).toBe('playoffs')
  })
})

describe('overnight stories', () => {
  const context: IssueContext = {
    currentWeek: 5, seasonStage: 'settling',
    issueDate: new Date('2026-10-07T12:00:00Z'),
  }

  const football = {
    format: 'h2h-points', sport: 'nfl',
    leagueId: 'lg', leagueName: 'Gridiron', currentWeek: 5, currentSeason: 2026,
    teams: [], standings: [], seasonRankHistory: [],
  } as unknown as LeagueDataH2HPoints

  /* Football plays once a week. "What changed overnight" is a baseball
   * question; firing it Tuesday through Saturday would restate Sunday. */
  it('emits nothing for a football league', () => {
    expect(detectOvernightStories(football, context)).toEqual([])
  })
})
