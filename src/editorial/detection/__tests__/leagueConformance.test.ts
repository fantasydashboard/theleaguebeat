/**
 * Structural conformance across real, differently-shaped leagues.
 *
 * The football engine was built against one league. This walks several
 * real leagues that differ on the axes that actually vary — roster
 * count, unset playoff weeks, absent playoff_teams, median-match
 * scoring, dynasty vs redraft, divisions present or not — and asserts
 * the invariants that must hold for ALL of them.
 *
 * These are deliberately invariants rather than golden values: a golden
 * assertion pinned to one league's numbers is how single-league
 * assumptions get baked in, which is the exact failure this file exists
 * to prevent. Every assertion here should read as "this must be true of
 * any league", never "this is true of League of Record".
 */
import { describe, it, expect } from 'vitest'
import { detectAll } from '@/editorial/detection'
import { selectStoriesForIssue } from '@/editorial/selection'
import { composeIssue } from '@/editorial/composition'
import { buildSleeperPointsData } from '@/editorial/adapters/sleeperAdapter'
import { sleeperLeagueSuite } from '@/fixtures/sleeperLeagueSuite'
import { deriveSeasonStage } from '@/editorial/detection/helpers'
import { sportOf } from '@/editorial/leagueCore'
import type { IssueContext } from '@/editorial/detection/types'

type RawLeague = Parameters<typeof buildSleeperPointsData>[0]

const leagues = sleeperLeagueSuite.map((entry) => ({
  name: String((entry.league as { name?: unknown }).name ?? 'unnamed'),
  raw: entry as unknown as RawLeague,
}))

/** Every finite number a story or section carries must be a real
 *  number. NaN and Infinity are how a bad divisor reaches print. */
function assertNoBadNumbers(label: string, value: unknown, path = ''): void {
  if (typeof value === 'number') {
    expect(Number.isFinite(value), `${label}: non-finite number at ${path}`).toBe(true)
    return
  }
  if (Array.isArray(value)) {
    value.forEach((v, i) => assertNoBadNumbers(label, v, `${path}[${i}]`))
    return
  }
  if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) {
      // Dates are objects full of nothing we care about here.
      if (v instanceof Date) continue
      assertNoBadNumbers(label, v, path ? `${path}.${k}` : k)
    }
  }
}

describe('league conformance (real leagues, varied shapes)', () => {
  it('captured a structurally varied suite', () => {
    // Guards the fixture itself: if a regeneration quietly collapses the
    // suite to one shape, this file stops testing what it claims to.
    expect(leagues.length).toBeGreaterThanOrEqual(3)
    const rosterCounts = new Set(
      leagues.map((l) => (l.raw as { league: { total_rosters?: number } }).league.total_rosters),
    )
    expect(rosterCounts.size, 'suite should contain more than one roster count').toBeGreaterThan(1)
  })

  for (const { name, raw } of leagues) {
    describe(name, () => {
      it('adapts without throwing and reports a coherent shape', () => {
        const data = buildSleeperPointsData(raw)
        expect(data.format).toBe('h2h-points')
        expect(data.leagueName.length).toBeGreaterThan(0)

        // Every team needs a name. Sleeper rosters can be orphaned
        // (owner_id null), so the adapter must fall back rather than
        // emit an empty string a headline would then print.
        for (const t of data.teams) {
          expect(t.name.trim().length, `team ${t.id} has no usable name`).toBeGreaterThan(0)
        }

        // Standings must cover the league, not a subset — an orphaned or
        // unpaired roster silently dropped here becomes a league that
        // reads as smaller than it is.
        const rosterCount = (raw as unknown as { rosters: unknown[] }).rosters.length
        expect(data.standings.length).toBe(rosterCount)
        expect(data.teams.length).toBe(rosterCount)
      })

      it('never invents a matchup', () => {
        const data = buildSleeperPointsData(raw)
        for (const m of data.currentWeekMatchups ?? []) {
          // Sleeper gives `matchup_id: null` for byes and non-bracket
          // teams. Grouping without filtering those invents games
          // between unrelated rosters.
          expect(m.homeTeamId, 'matchup with no home team').toBeTruthy()
          expect(m.awayTeamId, 'matchup with no away team').toBeTruthy()
          expect(m.homeTeamId, 'team paired against itself').not.toBe(m.awayTeamId)
        }

        // A week cannot hold more games than the league has pairs.
        const maxPairs = Math.floor(data.teams.length / 2)
        expect((data.currentWeekMatchups ?? []).length).toBeLessThanOrEqual(maxPairs)
      })

      it('runs the whole pipeline at every season stage', () => {
        const data = buildSleeperPointsData(raw)
        for (const week of [1, 8, 14, 15, 17]) {
          const stage = deriveSeasonStage(week, data.regularSeasonEndWeek, sportOf(data))
          const ctx: IssueContext = {
            currentWeek: week,
            seasonStage: stage,
            issueDate: new Date('2026-10-07T12:00:00Z'),
          }
          const scoped = { ...data, currentWeek: week }

          const detected = detectAll(scoped, ctx)
          expect(Array.isArray(detected)).toBe(true)

          const selected = selectStoriesForIssue(detected, ctx)
          const sections = composeIssue(selected, ctx)

          // A reader always gets a page. An issue that composes to
          // nothing is a blank screen in production.
          expect(sections.length, `${name} week ${week} composed no sections`).toBeGreaterThan(0)

          assertNoBadNumbers(`${name} w${week}`, detected)
          assertNoBadNumbers(`${name} w${week}`, sections)
        }
      })

      it('stages the season sanely even when playoff_week_start is unset', () => {
        const data = buildSleeperPointsData(raw)

        // `regularSeasonEndWeek` is legitimately `undefined` when
        // Sleeper reports `playoff_week_start: 0` (UNSET, not "no
        // playoffs"). The adapter leaves it undefined on purpose so the
        // per-sport default lives in exactly one place —
        // `deriveSeasonStage`. So the contract to test is the STAGING,
        // not whether the field is populated: asserting the field is a
        // number would just pin the test to today's implementation.
        if (data.regularSeasonEndWeek !== undefined) {
          expect(data.regularSeasonEndWeek).toBeGreaterThan(0)
          expect(data.regularSeasonEndWeek).toBeLessThanOrEqual(25)
        }

        const stageAt = (w: number) =>
          deriveSeasonStage(w, data.regularSeasonEndWeek, sportOf(data))

        // Week 1 is the start of a season in every league that exists.
        // Staging it as offseason would suppress every in-season story.
        expect(stageAt(1), `${name}: week 1 staged as ${stageAt(1)}`).toBe('opening')

        // Mid-season must be in-season. This is what would break if the
        // fallback were ever wrong (or a `- 1` produced -1): the whole
        // year stages as offseason and the league reads as dormant.
        for (const w of [5, 8, 10]) {
          expect(['settling', 'midseason', 'stretch', 'final'], `${name}: week ${w}`)
            .toContain(stageAt(w))
        }

        // Stages must advance monotonically through the season rather
        // than oscillate.
        const order = [
          'preseason', 'opening', 'settling', 'midseason',
          'stretch', 'final', 'playoffs', 'offseason',
        ]
        const walk = [1, 5, 8, 12, 15, 17].map((w) => order.indexOf(stageAt(w)))
        for (let i = 1; i < walk.length; i++) {
          expect(walk[i], `${name}: stage went backwards between samples`)
            .toBeGreaterThanOrEqual(walk[i - 1])
        }
      })
    })
  }
})
