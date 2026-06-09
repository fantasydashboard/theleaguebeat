/**
 * Fixture → CategoryLeagueData adapter.
 *
 * The editorial pipeline reads a single universal shape
 * (`CategoryLeagueData`). This module is the demo/fixture
 * implementation of that adapter — the same job a real Sleeper /
 * Yahoo / ESPN platform adapter will do later. Isolating it here
 * makes the swap explicit: when a real backend lands, just point
 * the views at a different `xToLeagueData()` function.
 *
 * Currently only one adapter exists: `categoriesFixtureToLeagueData()`,
 * which maps the hand-authored `categoriesLeague` fixture into the
 * universal shape (including the Wave 2 extended fields the
 * Matchups / Draft / History detectors consume).
 */
import {
  teams as fxTeams,
  categories as fxCategories,
  standings2026Week8,
  categoryRanks as fxCategoryRanks,
  seasonRankHistory,
  currentWeek,
  currentSeason,
  playoffCutoff,
  matchupsWeek8,
  seasonHistory as fxSeasonHistory,
  teamCareerStats as fxTeamCareerStats,
  h2hMatrix as fxH2HMatrix,
  draftPicks2026,
  weeklyCatsWon as fxWeeklyCatsWon,
  weeklyCatLeagueAverage as fxWeeklyCatLeagueAverage,
} from '../fixtures/categoriesLeague.ts'
import type {
  CategoryCatLineStatus,
  CategoryLeagueData,
  CategoryLeagueDataCatLine,
  CategoryLeagueDataDraft,
  CategoryLeagueDataH2HEntry,
  CategoryLeagueDataMatchup,
  CategoryLeagueDataSeasonHistory,
  CategoryLeagueDataTeamCareerStats,
} from './types.ts'

/**
 * Map the categoriesLeague demo fixture into the universal
 * `CategoryLeagueData` contract the editorial pipeline consumes.
 *
 * Pure function — every call produces the same data shape. (The
 * editorial pipeline itself contains the random variant selection;
 * this adapter is deterministic.)
 */
export function categoriesFixtureToLeagueData(): CategoryLeagueData {
  return {
    format: 'h2h-category',
    leagueId: 'demo-categories-2026',
    leagueName: 'Diamond Cuts',
    currentWeek,
    currentSeason,
    playoffCutoff,

    teams: fxTeams.map((t) => ({
      id: t.id,
      name: t.name,
      ownerName: t.ownerName,
      ownerInitials: t.ownerInitials,
      avatarUrl: t.avatarUrl,
      avatarColor: t.avatarColor,
      isMyTeam: t.isMyTeam ?? false,
    })),

    categories: fxCategories.map((c) => ({
      id: c.id,
      label: c.label,
      name: c.name,
      side: c.side,
    })),

    standings: standings2026Week8.map((s) => ({
      rank: s.rank,
      teamId: s.teamId,
      catWins: s.catWins,
      catLosses: s.catLosses,
      catTies: s.catTies,
      winPct: s.winPct,
      streak: { type: s.streak.type, length: s.streak.length },
      lastSix: [...s.lastSix],
      ownsCount: s.ownsCount,
      bleedingCount: s.bleedingCount,
    })),

    categoryRanks: fxCategoryRanks.map((r) => ({
      teamId: r.teamId,
      catRanks: { ...r.catRanks },
    })),

    seasonRankHistory: seasonRankHistory.map((w) => ({
      week: w.week,
      ranks: { ...w.ranks },
    })),

    /* ───── Extended fields ──────────────────────────────────── */

    matchupsCurrentWeek: matchupsWeek8.map<CategoryLeagueDataMatchup>((m) => ({
      id: m.id,
      homeTeamId: m.homeTeamId,
      awayTeamId: m.awayTeamId,
      status: m.status,
      homeCatWins: m.aWins,
      awayCatWins: m.bWins,
      ties: m.ties,
      contestedCount: m.contestedCount,
      catLines: m.catLines.map<CategoryLeagueDataCatLine>((line) => ({
        catId: line.catId,
        homeCurrent: line.aCurrent,
        awayCurrent: line.bCurrent,
        status: mapFixtureCatLineStatus(line.status),
      })),
      // Pass through the fixture's hand-authored projection. The demo
      // writes specific narrative numbers (e.g. 32/68 for "Strength
      // against strength"); preserving them lets the demo experience
      // stay editorial-grade while live leagues compute their own from
      // matchups-projection.ts.
      homeWinProb: m.homeWinProb / 100,
      awayWinProb: 1 - m.homeWinProb / 100,
      homeProj: m.aProj,
      awayProj: m.bProj,
      // The demo's hand-authored MON-SUN trajectory. Live adapters
      // leave this undefined until daily snapshot capture exists; the
      // view hides the trajectory chart accordingly.
      dailyTrend: m.dailyTrend.map((d, i) => ({
        day: i,
        homeWinProb: d.aWinProb / 100,
        awayWinProb: d.bWinProb / 100,
        isProjection: d.isProjection,
      })),
    })),

    seasonHistory: fxSeasonHistory.map<CategoryLeagueDataSeasonHistory>((s) => ({
      year: s.year,
      championTeamId: s.championTeamId,
      championRecord: s.championRecord,
      runnerUpTeamId: s.runnerUpTeamId,
      basementTeamId: s.basementTeamId,
    })),

    teamCareerStats: Object.fromEntries(
      Object.entries(fxTeamCareerStats).map(
        ([teamId, s]): [string, CategoryLeagueDataTeamCareerStats] => [
          teamId,
          {
            teamId: s.teamId,
            seasonsPlayed: s.seasonsPlayed,
            titles: s.titles,
            playoffApps: s.playoffApps,
            totalCatWins: s.totalCatWins,
            totalCatLosses: s.totalCatLosses,
            totalCatTies: s.totalCatTies,
            careerWinPct: s.careerWinPct,
            hitCatsWon: s.hitCatsWon,
            pitchCatsWon: s.pitchCatsWon,
            catDifferential: s.catDifferential,
          },
        ],
      ),
    ),

    h2hMatrix: fxH2HMatrix.map<CategoryLeagueDataH2HEntry>((c) => ({
      teamA: c.teamA,
      teamB: c.teamB,
      recordA: c.recordA,
      catDiffA: c.catDiffA,
      meetings: c.meetings,
    })),

    draft: {
      year: currentSeason,
      totalPicks: draftPicks2026.length,
      picks: draftPicks2026.map((p) => ({
        pickOverall: p.pickOverall,
        round: p.round,
        playerId: p.playerId,
        playerName: p.playerName,
        position: p.position,
        mlbTeam: p.mlbTeam,
        draftedByTeamId: p.draftedByTeamId,
        valueScore: p.valueScore,
      })),
    } satisfies CategoryLeagueDataDraft,

    weeklyCatsWon: Object.fromEntries(
      Object.entries(fxWeeklyCatsWon).map(([teamId, arr]) => [teamId, [...arr]]),
    ),

    weeklyLeagueAverage: [...fxWeeklyCatLeagueAverage],
  }
}

/**
 * Map the fixture's per-cat-line status enum (decided-a / decided-b /
 * punted-a / punted-b / contested — where "a" is the home team and
 * "b" is the away team) into the contract's home/away-oriented enum.
 */
function mapFixtureCatLineStatus(
  status: 'decided-a' | 'decided-b' | 'contested' | 'punted-a' | 'punted-b',
): CategoryCatLineStatus {
  switch (status) {
    case 'decided-a': return 'decided-home'
    case 'decided-b': return 'decided-away'
    case 'punted-a':  return 'punted-home'
    case 'punted-b':  return 'punted-away'
    case 'contested': return 'contested'
  }
}
