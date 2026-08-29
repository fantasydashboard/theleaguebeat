import { describe, it, expect } from 'vitest'
import { detect as detectSeasonStage } from '@/editorial/detection/seasonStage'
import { deriveSeasonStage } from '@/editorial/detection/helpers'
import type { LeagueDataH2HPoints } from '@/editorial/types'
import type { IssueContext } from '@/editorial/detection/types'

/* Regression pin for Fix 3 (final whole-branch review): `weeksRemaining`
 * in helpers.ts hardcoded `regularSeasonEndWeek ?? 12`, while
 * `endWeekOf` in this same module (seasonStage.ts) is sport-aware (14
 * for NFL). For an NFL league with `regularSeasonEndWeek` unknown --
 * the exact `playoff_week_start: 0` case this branch handles -- the
 * two functions disagreed about how many weeks remained, so
 * `last-four-weeks` / `last-two-weeks` computed two weeks early and
 * landed on the wrong story entirely. */
describe('season-stage detectors — sport-aware weeksRemaining (Fix 3)', () => {
  const footballAt = (currentWeek: number): LeagueDataH2HPoints =>
    ({
      format: 'h2h-points',
      sport: 'nfl',
      leagueId: 'lg',
      leagueName: 'Gridiron',
      currentWeek,
      currentSeason: 2026,
      // regularSeasonEndWeek intentionally omitted -- the
      // playoff_week_start: 0 / unset case, where NFL's 14-week
      // default must be what both endWeekOf() and weeksRemaining()
      // fall back to.
      teams: [],
      standings: [],
      seasonRankHistory: [],
    }) as unknown as LeagueDataH2HPoints

  it('fires last-four-weeks (not last-two-weeks) at week 10 of an unknown-length NFL season', () => {
    // True remaining = 14 - 10 = 4. The bug's hardcoded 12 would compute
    // remaining = 2 instead, misfiring last-two-weeks two weeks early.
    const context: IssueContext = {
      currentWeek: 10,
      seasonStage: deriveSeasonStage(10, undefined, 'nfl'),
      issueDate: new Date('2026-11-10T12:00:00Z'),
    }
    const out = detectSeasonStage(footballAt(10), context).map((s) => s.type)
    expect(out).toContain('last-four-weeks')
    expect(out).not.toContain('last-two-weeks')
  })

  it('fires last-two-weeks (not final-week) at week 12 of an unknown-length NFL season', () => {
    // True remaining = 14 - 12 = 2. The bug's hardcoded 12 would compute
    // remaining = 0, misfiring final-week two weeks early.
    const context: IssueContext = {
      currentWeek: 12,
      seasonStage: deriveSeasonStage(12, undefined, 'nfl'),
      issueDate: new Date('2026-11-24T12:00:00Z'),
    }
    const out = detectSeasonStage(footballAt(12), context).map((s) => s.type)
    expect(out).toContain('last-two-weeks')
    expect(out).not.toContain('final-week')
  })

  it('still fires final-week at the true end of an unknown-length NFL season (week 14)', () => {
    const context: IssueContext = {
      currentWeek: 14,
      seasonStage: deriveSeasonStage(14, undefined, 'nfl'),
      issueDate: new Date('2026-12-08T12:00:00Z'),
    }
    const out = detectSeasonStage(footballAt(14), context).map((s) => s.type)
    expect(out).toContain('final-week')
  })

  it('baseball is unaffected: week 8 of an unknown-length MLB season still targets the 12-week fallback', () => {
    const baseball = {
      format: 'h2h-category',
      sport: 'mlb',
      leagueId: 'lg2',
      leagueName: 'Diamond Cuts',
      currentWeek: 8,
      currentSeason: 2026,
      teams: [],
      standings: [],
      seasonRankHistory: [],
      categories: [],
      categoryRanks: [],
    } as unknown as LeagueDataH2HPoints
    const context: IssueContext = {
      currentWeek: 8,
      seasonStage: deriveSeasonStage(8, undefined, 'mlb'),
      issueDate: new Date('2026-08-01T12:00:00Z'),
    }
    // 12 - 8 = 4 → last-four-weeks, exactly as it always has.
    const out = detectSeasonStage(baseball, context).map((s) => s.type)
    expect(out).toContain('last-four-weeks')
  })
})
