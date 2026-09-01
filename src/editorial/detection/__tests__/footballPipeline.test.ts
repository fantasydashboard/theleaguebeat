import { describe, it, expect } from 'vitest'
import { detectAll } from '@/editorial/detection'
import { selectStoriesForIssue } from '@/editorial/selection'
import { composeIssue } from '@/editorial/composition'
import { buildSleeperPointsData } from '@/editorial/adapters/sleeperAdapter'
import { sleeperFootballFixture } from '@/fixtures/sleeperFootball'
import { categoriesFixtureToLeagueData } from '@/editorial/fixtureAdapter'
import { deriveSeasonStage } from '@/editorial/detection/helpers'
import { sportOf } from '@/editorial/leagueCore'
import type { IssueContext } from '@/editorial/detection/types'

const raw = sleeperFootballFixture as unknown as Parameters<typeof buildSleeperPointsData>[0]
const football = buildSleeperPointsData(raw)

const context: IssueContext = {
  currentWeek: football.currentWeek,
  seasonStage: deriveSeasonStage(football.currentWeek, football.regularSeasonEndWeek, sportOf(football)),
  issueDate: new Date('2026-10-07T12:00:00Z'),
}

describe('the football pipeline', () => {
  it('detects stories for a real Sleeper league', () => {
    expect(detectAll(football, context).length).toBeGreaterThan(0)
  })

  it('survives selection and composition without throwing', () => {
    const stories = selectStoriesForIssue(detectAll(football, context), context)
    expect(() => composeIssue(stories, context)).not.toThrow()
  })

  it('produces a hero section', () => {
    const stories = selectStoriesForIssue(detectAll(football, context), context)
    const sections = composeIssue(stories, context)
    expect(sections.length).toBeGreaterThan(0)
    expect(sections[0].priority).toBeGreaterThan(0)
  })

  /* The release gate: this work is additive, and baseball must be able
   * to prove it rather than merely assert it. */
  it('does not change what the baseball fixture detects', () => {
    const baseball = categoriesFixtureToLeagueData()
    const ctx: IssueContext = {
      currentWeek: baseball.currentWeek,
      seasonStage: 'midseason',
      issueDate: new Date('2026-08-09T12:00:00Z'),
    }
    const stories = selectStoriesForIssue(detectAll(baseball, ctx), ctx)
    // Verified against the live fixture at plan time. Sliced to three
    // deliberately: the fourth story is a CADENCE story that depends on
    // the issueDate's weekday (2026-08-09 is a Sunday, so it is
    // 'sunday-final-push'). Asserting it would pin the test to a date
    // rather than to detection behaviour. Do not "improve" this by
    // asserting all four.
    expect(stories.map((s) => s.type).slice(0, 3))
      .toEqual(['dynasty-falling', 'matchup-of-week', 'trade-deadline-week'])
  })
})

/* Scoring superlatives used to be filed under `category: 'matchup'`,
 * where points-blowout outweighed them and took both per-category
 * slots — so across an entire season the high and low scores of the
 * week never once reached an issue. This asserts they can. */
describe('points story variety', () => {
  it('lets a scoring superlative reach an issue at some point in the season', () => {
    const weeks = [1, 3, 5, 8, 11, 14, 15, 17]
    const surfaced = weeks.flatMap((week) => {
      const stage = deriveSeasonStage(week, football.regularSeasonEndWeek, sportOf(football))
      const ctx: IssueContext = { currentWeek: week, seasonStage: stage, issueDate: new Date('2026-10-07T12:00:00Z') }
      const data = { ...football, currentWeek: week }
      return selectStoriesForIssue(detectAll(data, ctx), ctx).map((s) => s.type as string)
    })
    expect(surfaced.some((t) => t === 'points-high-score' || t === 'points-low-score')).toBe(true)
  })
})
