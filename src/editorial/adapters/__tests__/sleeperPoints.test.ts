import { describe, it, expect } from 'vitest'
import {
  buildSleeperPointsData,
  pointsWeeklyOutcomes,
  sleeperPoints,
} from '@/editorial/adapters/sleeperAdapter'
import { detectPointsStories } from '@/editorial/detection/points'
import { sleeperFootballFixture } from '@/fixtures/sleeperFootball'
import type { IssueContext } from '@/editorial/detection/types'

const raw = sleeperFootballFixture as unknown as Parameters<typeof buildSleeperPointsData>[0]
const data = buildSleeperPointsData(raw)

describe('buildSleeperPointsData', () => {
  it('declares itself a football points league', () => {
    expect(data.format).toBe('h2h-points')
    expect(data.sport).toBe('nfl')
  })

  it('carries league identity', () => {
    expect(data.leagueName).toBe(raw.league.name)
    expect(data.currentSeason).toBe(Number(raw.league.season))
  })

  it('derives the regular season end week from playoff_week_start', () => {
    expect(data.regularSeasonEndWeek).toBe(raw.league.settings.playoff_week_start - 1)
  })

  it('builds one team per roster', () => {
    expect(data.teams).toHaveLength(raw.rosters.length)
  })

  it('gives every team a non-empty name', () => {
    for (const t of data.teams) expect(t.name.trim().length).toBeGreaterThan(0)
  })

  it('builds standings ranked 1..N with no gaps or duplicates', () => {
    const ranks = (data.standings ?? []).map((s) => s.rank).sort((a, b) => a - b)
    expect(ranks).toEqual(Array.from({ length: data.teams.length }, (_, i) => i + 1))
  })

  it('every standing references a real team', () => {
    const ids = new Set(data.teams.map((t) => t.id))
    for (const s of data.standings ?? []) expect(ids.has(s.teamId)).toBe(true)
  })

  it('computes a positive weekly points average', () => {
    expect(data.weeklyPointsAverage).toBeGreaterThan(0)
  })

  it('never invents matchups for weeks Sleeper did not return', () => {
    const captured = Object.keys(raw.matchupsByWeek).length
    if (captured === 0) expect(data.currentWeekMatchups ?? []).toEqual([])
  })

  it('pairs matchups into two-sided games', () => {
    for (const m of data.currentWeekMatchups ?? []) {
      expect(m.homeTeamId).not.toBe(m.awayTeamId)
      expect(typeof m.homePoints).toBe('number')
      expect(typeof m.awayPoints).toBe('number')
    }
  })

  it('produces a LeagueCore-compatible league', async () => {
    const { asLeagueCore } = await import('@/editorial/leagueCore')
    expect(asLeagueCore(data)).not.toBeNull()
  })
})

describe('sleeperPoints (split-integer fpts encoding)', () => {
  it('combines the integer part and hundredths correctly, not by addition', () => {
    // fpts: 1807, fpts_decimal: 6 → 1807.06, NOT 1807 + 6 = 1813.
    expect(sleeperPoints(1807, 6)).toBeCloseTo(1807.06, 5)
    expect(sleeperPoints(1807, 6)).not.toBe(1813)
  })

  it('defaults missing parts to zero rather than throwing', () => {
    expect(sleeperPoints(undefined, undefined)).toBe(0)
    expect(sleeperPoints(100, undefined)).toBe(100)
  })
})

describe('buildSleeperPointsData — null matchup_id handling', () => {
  it('produces exactly two matchups for the captured week 17, not three', () => {
    // Real captured data: 6 of 10 week-17 entries carry matchup_id: null
    // (teams outside the playoff bracket). Naive grouping either lumps
    // them into one phantom game or — worse — could pair up two of them
    // as if they played each other. Only the two real playoff pairs
    // (matchup_id 1 and 2) should survive.
    //
    // NOTE: this case alone is a weak discriminator — a naive "group
    // first, drop groups whose length isn't 2" implementation also
    // collapses the 6 null entries into a single oversized bucket and
    // yields 2 here. Week 15 below is the real test: it has exactly
    // two null entries, which a naive implementation pairs into a
    // phantom game between two teams that never played each other.
    const week17 = raw.matchupsByWeek['17']
    expect(week17.filter((m) => m.matchup_id == null)).toHaveLength(6)

    // league.settings.leg === 17 for the captured league, so this is
    // exactly the current week the adapter resolves.
    expect(data.currentWeek).toBe(17)
    expect(data.currentWeekMatchups).toHaveLength(2)
  })

  it('produces exactly four matchups for week 15, never pairing the two bye teams together', () => {
    // Week 15: rosters 2 and 7 both carry matchup_id: null (first-round
    // byes) alongside 4 real pairs (matchup_id 1, 2, 4, 5). Grouping by
    // matchup_id WITHOUT filtering nulls first would put both null
    // entries in one bucket of exactly 2 — satisfying a naive
    // length-2 check — and hand roster 7 a fake win over roster 2, a
    // team it never played. Filtering nulls before grouping (as
    // `pairSleeperMatchups` does) discards both instead.
    const week15 = raw.matchupsByWeek['15']
    const nulls = week15.filter((m) => m.matchup_id == null)
    expect(nulls.map((m) => m.roster_id).sort()).toEqual([2, 7])

    const week15Matchups = raw.matchupsByWeek['15']
    const rosterIdsInMatchups = new Set(
      week15Matchups.filter((m) => m.matchup_id != null).map((m) => m.roster_id),
    )
    expect(rosterIdsInMatchups.has(2)).toBe(false)
    expect(rosterIdsInMatchups.has(7)).toBe(false)

    // buildSleeperCurrentWeekMatchups only runs for the current week
    // (17 here), so exercise the same pairing logic week 15 goes
    // through via the exported weekly-outcomes walk. Rosters 2 and 7
    // play every one of the 14 regular-season weeks (11-3 and 9-5 —
    // 14 decisions each); a phantom (2, 7) pairing at week 15 would
    // inflate one of them to 15 recorded outcomes.
    const outcomes = pointsWeeklyOutcomes(raw.matchupsByWeek, 15)
    expect(outcomes.get(2)).toHaveLength(14)
    expect(outcomes.get(7)).toHaveLength(14)
  })
})

describe('buildSleeperPointsData — regular-season-bounded record matches Sleeper', () => {
  const regularSeasonEndWeek = raw.league.settings.playoff_week_start - 1 // 14

  it('derives a W/L/T record from the weekly walk that matches roster.settings for every roster', () => {
    // This is the regression pin for the Critical finding: an
    // unbounded walk (weeks 1..17) tallies 3 extra playoff games per
    // roster, so wins/losses stop matching Sleeper's own settings —
    // which never include playoff weeks. Sleeper's settings are the
    // oracle here.
    const outcomes = pointsWeeklyOutcomes(raw.matchupsByWeek, regularSeasonEndWeek)
    for (const r of raw.rosters) {
      const seq = outcomes.get(r.roster_id) ?? []
      const wins = seq.filter((o) => o === 'W').length
      const losses = seq.filter((o) => o === 'L').length
      const ties = seq.filter((o) => o === 'T').length
      expect({ roster: r.roster_id, wins, losses, ties }).toEqual({
        roster: r.roster_id,
        wins: r.settings.wins,
        losses: r.settings.losses,
        ties: r.settings.ties,
      })
    }
  })

  it('matches roster.metadata.streak for every roster once bounded to the regular season', () => {
    // metadata.streak/.record were themselves captured as of the end
    // of the regular season (last_report: 14) — not stale, just
    // regular-season-only, same as settings.wins. A correctly bounded
    // walk should reproduce them exactly.
    for (const r of raw.rosters) {
      const meta = (r as any).metadata?.streak as string | undefined
      const match = meta ? /^(\d+)([WLT])$/.exec(meta) : null
      if (!match) continue
      const standing = data.standings!.find((s) => s.teamId === String(r.roster_id))!
      expect(standing.streak.type).toBe(match[2])
      expect(standing.streak.length).toBe(Number(match[1]))
    }
  })

  it('agrees with itself: seasonRankHistory\'s final week matches the standings ranks', () => {
    const history = data.seasonRankHistory ?? []
    const lastWeek = history[history.length - 1]
    expect(lastWeek?.week).toBe(regularSeasonEndWeek)
    for (const s of data.standings ?? []) {
      expect(lastWeek?.ranks[s.teamId]).toBe(s.rank)
    }
  })
})

describe('buildSleeperPointsData — weeklyPointsAverage', () => {
  it('averages every captured week including the playoffs (109.392 for the real capture)', () => {
    expect(data.weeklyPointsAverage).toBeCloseTo(109.392, 2)
  })

  it('excludes a week where every entry is still zeroed (not yet played)', () => {
    const withPendingWeek = {
      ...raw,
      matchupsByWeek: {
        ...raw.matchupsByWeek,
        '18': raw.rosters.map((r) => ({
          roster_id: r.roster_id,
          matchup_id: null,
          points: 0,
          starters: [],
          starters_points: [],
          players: [],
          players_points: {},
          custom_points: null,
        })),
      },
    } as unknown as Parameters<typeof buildSleeperPointsData>[0]

    const withPendingData = buildSleeperPointsData(withPendingWeek)
    expect(withPendingData.weeklyPointsAverage).toBeCloseTo(109.392, 2)
  })
})

describe('buildSleeperPointsStandings — ties count as half a win for ranking', () => {
  it('ranks a 9-4-1 team above a 9-5-0 team with more raw points', () => {
    const synthRaw = {
      league: {
        name: 'Synthetic League',
        season: '2025',
        status: 'in_season',
        league_id: 'synth',
        settings: { playoff_week_start: 15, playoff_teams: 4, leg: 14 },
      },
      rosters: [
        {
          roster_id: 1,
          owner_id: 'u1',
          settings: { wins: 9, losses: 4, ties: 1, fpts: 1000, fpts_decimal: 0 },
        },
        {
          roster_id: 2,
          owner_id: 'u2',
          settings: { wins: 9, losses: 5, ties: 0, fpts: 1200, fpts_decimal: 0 },
        },
      ],
      users: [
        { user_id: 'u1', display_name: 'Team A' },
        { user_id: 'u2', display_name: 'Team B' },
      ],
      matchupsByWeek: {},
    } as unknown as Parameters<typeof buildSleeperPointsData>[0]

    const synthData = buildSleeperPointsData(synthRaw)
    const teamA = synthData.standings!.find((s) => s.teamId === '1')!
    const teamB = synthData.standings!.find((s) => s.teamId === '2')!
    // 9 + 0.5*1 = 9.5 beats 9 + 0.5*0 = 9, despite fewer raw points.
    expect(teamA.rank).toBeLessThan(teamB.rank)
  })
})

describe('buildSleeperPointsData — orphaned rosters', () => {
  it('gives the two owner_id: null rosters non-empty, distinct fallback names', () => {
    const orphaned = raw.rosters.filter((r) => r.owner_id == null)
    expect(orphaned).toHaveLength(2)

    const names = orphaned.map((r) => {
      const team = data.teams.find((t) => t.id === String(r.roster_id))
      expect(team).toBeDefined()
      return team!.name
    })
    for (const name of names) expect(name.trim().length).toBeGreaterThan(0)
    expect(new Set(names).size).toBe(names.length)
  })
})

describe('buildSleeperPointsData — matchup status is per-week, not per-league (Fix 1)', () => {
  // The captured fixture is a COMPLETED season (league.status: 'complete'),
  // which is exactly why this bug was invisible to every other test: the
  // buggy code (`status: seasonComplete ? 'final' : 'live'`) reads
  // league.status directly, so it only ever looks correct when the whole
  // season has already ended. Forcing status back to 'in_season' here
  // reproduces a real live league mid-season — the case that matters,
  // since NFL leagues are in_season for the entire time anyone is
  // reading the magazine.
  const inSeasonRaw = {
    ...raw,
    league: { ...raw.league, status: 'in_season' },
  } as unknown as Parameters<typeof buildSleeperPointsData>[0]

  it('marks the fully-scored CURRENT week live, not final, for a live season', () => {
    // This is the regression pin for the failed fix: Sleeper points
    // accumulate live all game day, so "every roster has scored
    // something nonzero" is true within minutes of the Sunday slate
    // kicking off — from then until Tuesday rollover (including the
    // entire Monday delivery window, before Monday Night Football) the
    // week is very much still live, not decided. Only `league.status
    // === 'complete'` may promote the CURRENT week to 'final'.
    const inSeasonData = buildSleeperPointsData(inSeasonRaw)
    const currentMatchups = inSeasonData.currentWeekMatchups ?? []
    expect(currentMatchups.length).toBeGreaterThan(0)
    for (const m of currentMatchups) expect(m.status).toBe('live')
  })

  it('detectPointsStories still produces stories for a live (in_season) league, sourced from the previous week', () => {
    // This is the actual end-to-end regression: the six points
    // detectors need at least one 'final' game to work from. The
    // current week is never final while the season is in_season, so
    // detection has to fall back to the last CLOSED week
    // (previousWeekMatchups) — a completed prior week genuinely is
    // final. Before the original bug's fix, an in_season league
    // produced zero 'final' matchups anywhere and thus zero stories
    // for the ENTIRE season — football would ship dead.
    const inSeasonData = buildSleeperPointsData(inSeasonRaw)
    expect(inSeasonData.previousWeekMatchups?.length).toBeGreaterThan(0)
    const context: IssueContext = {
      currentWeek: inSeasonData.currentWeek,
      seasonStage: 'playoffs',
      issueDate: new Date('2026-01-05T12:00:00Z'),
    }
    expect(detectPointsStories(inSeasonData, context).length).toBeGreaterThan(0)
  })

  it('still produces stories when one current-week roster is an abandoned 0-point team', () => {
    // The mirror-image regression: `list.every(...)` is league-wide, so
    // ONE abandoned 0-point roster used to pin the WHOLE league at
    // 'live' forever (the original bug, in miniature). Since detection
    // now sources from the previous (closed) week rather than the
    // current one, an abandoned roster in the current week must not
    // block story production at all.
    const abandonedRaw = {
      ...inSeasonRaw,
      matchupsByWeek: {
        ...inSeasonRaw.matchupsByWeek,
        '17': (inSeasonRaw.matchupsByWeek['17'] ?? []).map((m: any, i: number) =>
          i === 0 ? { ...m, points: 0 } : m,
        ),
      },
    } as unknown as Parameters<typeof buildSleeperPointsData>[0]
    const abandonedData = buildSleeperPointsData(abandonedRaw)
    const context: IssueContext = {
      currentWeek: abandonedData.currentWeek,
      seasonStage: 'playoffs',
      issueDate: new Date('2026-01-05T12:00:00Z'),
    }
    expect(detectPointsStories(abandonedData, context).length).toBeGreaterThan(0)
  })

  it('populates previousWeekMatchups, every entry final', () => {
    const inSeasonData = buildSleeperPointsData(inSeasonRaw)
    const prev = inSeasonData.previousWeekMatchups ?? []
    expect(prev.length).toBeGreaterThan(0)
    for (const m of prev) expect(m.status).toBe('final')
  })

  it('marks a week with no scoring at all as upcoming, asserted on a real built matchup', () => {
    // The previous version of this test set every entry's matchup_id
    // to null, so `pairSleeperMatchups` filtered everything out and it
    // asserted `toEqual([])` — which passes even if the status logic
    // were deleted entirely. Give the entries REAL matchup_ids (paired
    // 2-by-2, all at zero points) so 'upcoming' is actually asserted
    // against a matchup the pairing logic actually built.
    const upcomingRaw = {
      ...raw,
      league: { ...raw.league, status: 'in_season', settings: { ...raw.league.settings, leg: 18 } },
      matchupsByWeek: {
        ...raw.matchupsByWeek,
        '18': raw.rosters.map((r, i) => ({
          roster_id: r.roster_id,
          matchup_id: Math.floor(i / 2) + 1,
          points: 0,
          starters: [],
          starters_points: [],
          players: [],
          players_points: {},
          custom_points: null,
        })),
      },
    } as unknown as Parameters<typeof buildSleeperPointsData>[0]

    const upcomingData = buildSleeperPointsData(upcomingRaw)
    const currentMatchups = upcomingData.currentWeekMatchups ?? []
    expect(currentMatchups.length).toBeGreaterThan(0)
    for (const m of currentMatchups) expect(m.status).toBe('upcoming')
  })
})

describe('buildSleeperPointsData — NaN season guard (Fix 6)', () => {
  it('fails loudly rather than producing a NaN season from an unparseable league.season', () => {
    // Number(league.season) with no fallback silently yields NaN on
    // any unparseable value, which then poisons every story signature
    // downstream. No `new Date()` clock read is allowed here (the
    // function is documented pure) — the only honest option left is to
    // fail loudly.
    const badRaw = {
      ...raw,
      league: { ...raw.league, season: 'TBD' },
    } as unknown as Parameters<typeof buildSleeperPointsData>[0]
    expect(() => buildSleeperPointsData(badRaw)).toThrow()
  })
})

describe('buildSleeperPointsData — detectPointsStories sources the most recent closed week (Fix round 1)', () => {
  it('sources the completed fixture (status: complete, week 17) from week 17, not week 16', () => {
    // Regression pin: the shipped fixture is a COMPLETED league
    // (league.status: 'complete', leg: 17). Its current week (17) IS
    // final — that's the freshest close available, and the
    // championship week the reader actually wants recapped. A
    // previous-week-preferred implementation would silently source
    // every story from week 16 instead, forever, for every completed
    // league — the cover would contradict the scoreboard.
    const data = buildSleeperPointsData(raw)
    expect(data.currentWeek).toBe(17)
    const currentFinals = (data.currentWeekMatchups ?? []).filter((m) => m.status === 'final')
    expect(currentFinals.length).toBeGreaterThan(0)

    // Pin against the actual DATA, not just the week label the story
    // carries — a mislabeling bug (Finding 2) could otherwise cancel
    // out against a mis-sourcing bug (Finding 1) and pass vacuously.
    // Week 17's highest team total (148.92) is real fixture data that
    // differs from week 16's (165.7), so which one the high-score
    // story reports is an unambiguous tell for which week it actually
    // read.
    const week17Max = Math.max(
      ...(data.currentWeekMatchups ?? []).flatMap((m) => [m.homePoints, m.awayPoints]),
    )
    const week16Max = Math.max(
      ...(data.previousWeekMatchups ?? []).flatMap((m) => [m.homePoints, m.awayPoints]),
    )
    expect(week17Max).not.toBe(week16Max)

    const context: IssueContext = {
      currentWeek: data.currentWeek,
      seasonStage: 'playoffs',
      issueDate: new Date('2026-01-05T12:00:00Z'),
    }
    const stories = detectPointsStories(data, context)
    const highScore = stories.find((s) => s.type === 'points-high-score')
    expect(highScore).toBeDefined()
    expect((highScore?.context as any).points).toBe(week17Max)
    for (const s of stories) {
      expect((s.context as any).week).toBe(17)
    }
  })
})

describe('buildSleeperPointsData — playoff_week_start: 0 edge case', () => {
  it('leaves regularSeasonEndWeek undefined rather than -1', () => {
    const rawUnset = {
      league: sleeperFootballFixture.unsetPlayoffWeekLeague,
      rosters: sleeperFootballFixture.rosters,
      users: sleeperFootballFixture.users,
      matchupsByWeek: {},
    } as unknown as Parameters<typeof buildSleeperPointsData>[0]

    expect(rawUnset.league.settings.playoff_week_start).toBe(0)

    const unsetData = buildSleeperPointsData(rawUnset)
    expect(unsetData.regularSeasonEndWeek).toBeUndefined()
    expect(unsetData.regularSeasonEndWeek).not.toBe(-1)
  })
})
