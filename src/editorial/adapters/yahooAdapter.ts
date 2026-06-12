/**
 * Yahoo → CategoryLeagueData adapter.
 *
 * Pulls a Yahoo H2H Category baseball league's live shape into the
 * universal `CategoryLeagueData` contract the editorial pipeline
 * consumes. Mirrors `sleeperAdapter.ts` in shape and intent — the
 * implementation differs because Yahoo's API gives us things Sleeper
 * doesn't (per-stat winners per matchup), and lacks things Sleeper
 * does (a simple `previous_league_id` chain — Yahoo uses the
 * `renew` field instead, format `"<gameKey>_<leagueId>"`).
 *
 * Yahoo endpoints used (all via `yahooService`):
 *   - getLeagueMetadata     → currentWeek, season, scoring_type, renew
 *   - getLeagueScoringSettings → stat_categories, scoring_type
 *   - getLeagueSettings     → num_playoff_teams
 *   - getStandings          → per-team W-L-T + rank
 *   - getTeams              → manager nicknames, team logos, is_my_team
 *   - getCategoryMatchups   → per-week per-cat stat_winners + team stats
 *   - getTeamSeasonStats    → per-team cumulative cat values (for ranks)
 *   - getDraftResults       → draft picks (player_keys → names via getPlayers)
 *
 * Per-category W/L is REAL here (not approximated like Sleeper) —
 * `getCategoryMatchups` returns `stat_winners`, which is Yahoo's
 * authoritative call on who won each cat in each matchup. We walk
 * every completed week and tally.
 *
 * Roto leagues: Yahoo H2H category leagues are the primary target,
 * but if the league is roto we still return a valid shape: standings
 * come from the roto rank, `matchupsCurrentWeek` is empty, and
 * `seasonRankHistory` collapses to one snapshot (current).
 */

import { yahooService } from '@/services/yahoo'
import type {
  CategoryLeagueData,
  LeagueData,
  LeagueDataH2HPoints,
  LeagueDataPointsMatchup,
  CategoryLeagueDataCatLine,
  CategoryLeagueDataCategory,
  CategoryLeagueDataCategoryRank,
  CategoryLeagueDataDraft,
  CategoryLeagueDataDraftPick,
  CategoryLeagueDataH2HEntry,
  CategoryLeagueDataMatchup,
  CategoryLeagueDataSeasonHistory,
  CategoryLeagueDataStanding,
  CategoryLeagueDataTeam,
  CategoryLeagueDataTeamCareerStats,
  CategoryLeagueDataManagerLegacy,
  ManagerSeasonPoint,
  CategoryLeagueDataWeeklyRanks,
  WLT,
} from '../types'
import type {
  LeagueTransaction,
  TransactionKind,
  TransactionMovement,
} from '../transactions/types'
import type { PlayerNight } from '../players/types'
import { buildPlayerNights, normalizeName } from '../players/buildPlayerNights'
import { buildPointsStandings } from './pointsStandings'
import { buildInjuryReports, type InjuryReport } from '../players/injuries'
import { buildSlumpReports, type SlumpReport } from '../players/slumps'
import { hydrateSnapshotDelta, hydrateMatchupDailyTrends } from '../snapshots'
import { teamColorHash } from './colorHash'
import { computeLegacyScore } from '../legacy'
import {
  buildProjectionFromCatLines,
  daysInCurrentWeek,
  seasonStrengthPrior,
} from '../matchups-projection'
import { buildH2H } from '../h2h/buildH2H'
import type { H2HGame } from '../h2h/buildH2H'

/* ─────────────────────────────────────────────────────────────────
   CATEGORY MAPPING — Yahoo MLB stat_id → editorial canonical id

   Yahoo uses numeric stat_ids. The MLB mapping below covers the
   standard 11-cat (and a few extras) — unrecognized ids are logged
   once and dropped, never fabricated.

   Notes on Yahoo MLB stat_ids:
     7  = R (runs)
     8  = H (hits)
     12 = HR (home runs)
     13 = RBI (runs batted in)
     16 = SB (stolen bases)
     3  = AVG (batting average)
     55 = OPS
     50 = TB (total bases) — varies by league config
     23 = BB (walks)
     28 = W (pitcher wins)
     32 = SV (saves)
     42 = K (strikeouts)
     60 = HLD (holds) — frequently overlapped by other ids
     26 = ERA
     27 = WHIP
     83 = QS (quality starts)
     85 = K/9
─────────────────────────────────────────────────────────────────── */

interface YahooCatDef {
  id: string                 // canonical id (matches editorial HomeCatId)
  label: string
  name: string
  side: 'hit' | 'pit'
  /** Yahoo stat_ids known to map to this canonical cat. */
  statIds: string[]
  /** `false` for cats where lower is better (ERA, WHIP). */
  higherIsBetter: boolean
}

export const YAHOO_MLB_STAT_MAP: YahooCatDef[] = [
  // Hitting
  { id: 'R',   label: 'R',   name: 'Runs',         side: 'hit', statIds: ['7'],       higherIsBetter: true  },
  { id: 'H',   label: 'H',   name: 'Hits',         side: 'hit', statIds: ['8'],       higherIsBetter: true  },
  { id: 'HR',  label: 'HR',  name: 'Home Runs',    side: 'hit', statIds: ['12'],      higherIsBetter: true  },
  { id: 'RBI', label: 'RBI', name: 'RBI',          side: 'hit', statIds: ['13'],      higherIsBetter: true  },
  { id: 'SB',  label: 'SB',  name: 'Stolen Bases', side: 'hit', statIds: ['16'],      higherIsBetter: true  },
  { id: 'AVG', label: 'AVG', name: 'Batting Avg',  side: 'hit', statIds: ['3'],       higherIsBetter: true  },
  { id: 'OPS', label: 'OPS', name: 'OPS',          side: 'hit', statIds: ['55'],      higherIsBetter: true  },
  { id: 'TB',  label: 'TB',  name: 'Total Bases',  side: 'hit', statIds: ['50'],      higherIsBetter: true  },
  { id: 'BB',  label: 'BB',  name: 'Walks',        side: 'hit', statIds: ['23'],      higherIsBetter: true  },
  // Pitching
  { id: 'W',   label: 'W',   name: 'Wins',         side: 'pit', statIds: ['28'],      higherIsBetter: true  },
  { id: 'SV',  label: 'SV',  name: 'Saves',        side: 'pit', statIds: ['32'],      higherIsBetter: true  },
  { id: 'K',   label: 'K',   name: 'Strikeouts',   side: 'pit', statIds: ['42'],      higherIsBetter: true  },
  { id: 'HLD', label: 'HLD', name: 'Holds',        side: 'pit', statIds: ['60'],      higherIsBetter: true  },
  { id: 'ERA', label: 'ERA', name: 'ERA',          side: 'pit', statIds: ['26'],      higherIsBetter: false },
  { id: 'WHIP',label: 'WHIP',name: 'WHIP',         side: 'pit', statIds: ['27'],      higherIsBetter: false },
  { id: 'QS',  label: 'QS',  name: 'Quality Starts', side: 'pit', statIds: ['83'],    higherIsBetter: true  },
  { id: 'K9',  label: 'K/9', name: 'K/9',          side: 'pit', statIds: ['85'],      higherIsBetter: true  },
]

/** Build a stat_id → CatDef lookup for fast resolution. */
function buildStatIdLookup(): Map<string, YahooCatDef> {
  const out = new Map<string, YahooCatDef>()
  for (const def of YAHOO_MLB_STAT_MAP) {
    for (const sid of def.statIds) out.set(sid, def)
  }
  return out
}

/* ─────────────────────────────────────────────────────────────────
   MODULE-LEVEL CACHE — keyed by leagueKey

   Avoids re-walking the entire season every time a different view
   imports the adapter. League data is stable enough that a single
   page session can reuse one snapshot.
─────────────────────────────────────────────────────────────────── */

const adapterCache = new Map<string, Promise<LeagueData>>()

/** Manually invalidate the adapter cache for a league. */
export function invalidateYahooAdapterCache(leagueKey?: string): void {
  if (leagueKey) adapterCache.delete(leagueKey)
  else adapterCache.clear()
}

/* ─────────────────────────────────────────────────────────────────
   PUBLIC API
─────────────────────────────────────────────────────────────────── */

/**
 * Shared adapter options. See `sleeperAdapter.ts` for the canonical
 * docstring — re-exported here so callers can import either symbol.
 */
export interface AdapterOptions {
  userIdentity?: {
    sleeperUserId?: string
    yahooGuid?: string
    espnSwid?: string
  }
  /** Supabase `leagues.id` UUID — enables daily-snapshot delta
   *  detection. Skipped when omitted. */
  leagueRowId?: string
  /** Platform league keys for the SAME league's prior seasons, supplied
   *  by the view from the user's connected leagues (matched by name +
   *  platform + sport). Used to build real multi-season history when
   *  Yahoo's `renew` chain is empty (a fresh league each year). */
  priorSeasonKeys?: string[]
}

export async function yahooLeagueToCategoryData(
  leagueKey: string,
  opts?: AdapterOptions,
): Promise<LeagueData> {
  if (!leagueKey || typeof leagueKey !== 'string') {
    throw new Error('Yahoo league key is required (format: "<gameKey>.l.<leagueId>")')
  }
  // Cache key includes the signed-in guid so two users on the same
  // device (rare, but possible) don't see each other's "my team" tint.
  // No guid → cache key matches the league key (single-user norm).
  // Include the connected prior-season keys in the cache token so that
  // changing the history set busts a warm entry (otherwise the cache
  // serves stale data that ignores the new keys).
  const priorHash = (opts?.priorSeasonKeys ?? []).slice().sort().join(',')
  const baseToken = opts?.userIdentity?.yahooGuid
    ? `${leagueKey}::${opts.userIdentity.yahooGuid}`
    : leagueKey
  const cacheToken = priorHash ? `${baseToken}::ph:${priorHash}` : baseToken
  const existing = adapterCache.get(cacheToken)
  if (existing) return existing
  const promise = buildYahooLeagueData(leagueKey, opts).catch((err) => {
    // Don't poison the cache on failure — let the next attempt retry.
    adapterCache.delete(cacheToken)
    throw err
  })
  adapterCache.set(cacheToken, promise)
  return promise
}

async function buildYahooLeagueData(
  leagueKey: string,
  opts?: AdapterOptions,
): Promise<LeagueData> {
  // Yahoo proxy throws "Not authenticated" when no Supabase session is
  // present. Translate that into a clearer signal for the caller's UI.
  let metadata: Awaited<ReturnType<typeof yahooService.getLeagueMetadata>>
  try {
    metadata = await yahooService.getLeagueMetadata(leagueKey)
  } catch (err) {
    const msg = (err as Error).message || ''
    if (msg.includes('Not authenticated') || msg.includes('no session')) {
      throw new Error(
        'Yahoo authentication required. Please connect your Yahoo account first.',
      )
    }
    throw new Error(
      `Yahoo league ${leagueKey} not found or unavailable: ${msg}`,
    )
  }

  const currentSeason = parseInt(metadata.season || '', 10) || new Date().getFullYear()
  const currentWeek = clampWeek(metadata.currentWeek || 1)
  const scoringType: string = metadata.scoring_type || 'head'   // 'head' = H2H cats; 'roto' = rotisserie; 'headpoint'/'point' = points
  const isRoto = scoringType === 'roto'
  const isPoints = scoringType === 'headpoint' || scoringType === 'point'

  // ── H2H Points: Phase 1 — Matchups points-mode ────────────────
  // Fetches teams + settings + current-week matchups so the Matchups
  // page can render real editorial content. Other pages still route
  // to the UnsupportedFormatPanel (gated by the seven page-level
  // format checks); they'll get progressively wired up in
  // Phase 2 → 5.
  if (isPoints) {
    // Phase 2: also pull every completed week so we can build standings
    // + season rank history. The previous week is derived from this same
    // map, so there's no separate prev-week fetch. raw standings +
    // prior seasons feed Chronicles (season history + manager legacy):
    // both builders read final-standings W/L/T + rank, which is the
    // matchup record in a points league, so they're reused as-is.
    const pointsPriorKeys = Array.from(
      new Set((opts?.priorSeasonKeys ?? []).filter((k) => k && k !== leagueKey)),
    )
    const [pointsTeams, pointsSettingsRaw, pointsMatchupsRaw, allPointsWeeks, pointsRawStandings, pointsPriorSeasons] = await Promise.all([
      yahooService.getTeams(leagueKey).catch(() => [] as any[]),
      yahooService.getLeagueSettings(leagueKey).catch(() => null),
      yahooService.getMatchups(leagueKey, currentWeek).catch(() => [] as any[]),
      fetchAllPointsMatchups(leagueKey, currentWeek - 1),
      yahooService.getStandings(leagueKey).catch(() => [] as any[]),
      pointsPriorKeys.length
        ? fetchPriorSeasons(pointsPriorKeys, leagueKey)
        : Promise.resolve([] as PriorSeasonData[]),
    ])
    const myGuid = opts?.userIdentity?.yahooGuid?.trim() || null
    const teamList: CategoryLeagueDataTeam[] = pointsTeams.map((t: any) => {
      // getTeams nests manager info under managers[0].manager and exposes
      // is_my_team (from Yahoo's is_current_login flag). The points branch
      // formerly read flat t.manager_guid / t.manager_nickname — fields
      // getTeams never sets — so "my team" never resolved and owner names
      // came back blank. Mirror the proven category path: prefer the
      // is_current_login signal, fall back to a guid match.
      const mgr = t.managers?.[0]?.manager
      const ownerName: string = mgr?.nickname || mgr?.name || ''
      const teamGuid = typeof mgr?.guid === 'string' ? mgr.guid : null
      return {
        id: t.team_key,
        name: t.name || `Team ${t.team_id}`,
        ownerName,
        ownerInitials: initialsOf(ownerName || t.name || '?'),
        avatarUrl: t.logo_url || undefined,
        avatarColor: 'oklch(0.62 0.18 200), oklch(0.42 0.18 220)',
        isMyTeam: t.is_my_team === true || (myGuid != null && teamGuid === myGuid),
      }
    })

    const currentWeekMatchups = mapYahooPointsMatchups(pointsMatchupsRaw, /*isFinal=*/ false)
    const previousWeekMatchups = allPointsWeeks.get(currentWeek - 1) ?? []

    // Derive league average from previous week's finalized scores
    // when available (current week is mid-stream and biased toward
    // teams that have played more games already).
    const weeklyPointsAverage = previousWeekMatchups.length > 0
      ? avgPointsAcrossMatchups(previousWeekMatchups)
      : undefined

    const { standings, seasonRankHistory } = buildPointsStandings(teamList, allPointsWeeks)

    // Chronicles: champions + all-time manager legacy. The category
    // builders are format-agnostic (champion = final rank 1; legacy sums
    // standings W/L/T, which is the matchup record for points).
    const playoffCutoff = readPlayoffCutoff(pointsSettingsRaw, teamList.length)
    const seasonHistory = await buildSeasonHistory(
      metadata,
      leagueKey,
      pointsPriorSeasons,
      pointsPriorKeys.length > 0,
    )
    const managerLegacy = buildManagerLegacy(
      metadata,
      pointsRawStandings,
      teamList,
      playoffCutoff,
      myGuid,
      pointsPriorSeasons,
    )

    const pointsGames: H2HGame[] = []
    for (const weekMatchups of allPointsWeeks.values()) {
      for (const m of weekMatchups) {
        if (m.status !== 'final') continue
        if (m.homePoints === 0 && m.awayPoints === 0) continue
        pointsGames.push({
          a: m.homeTeamId,
          b: m.awayTeamId,
          winner: m.homePoints > m.awayPoints ? 'a' : m.awayPoints > m.homePoints ? 'b' : 'tie',
        })
      }
    }
    const h2hRecords = buildH2H(pointsGames)

    // Daily player nights for Your Players — mirror the cats path: build a
    // name->teamKey roster index from the standings, then fetch nights.
    // ownedByTeamIds end up keyed by team_key, matching teamList[].id.
    const myTeamKeyPoints = teamList.find((t) => t.isMyTeam)?.id
    const pointsRoster = await fetchYahooRostersOnce(pointsRawStandings, myTeamKeyPoints).catch(
      () => ({ rosterByName: new Map<string, string[]>(), myBenchedPlayers: undefined as Set<string> | undefined }),
    )
    const pointsPlayerNights = await buildPlayerNights({
      rosterByName: pointsRoster.rosterByName,
      includeUnowned: true,
    }).catch(() => [] as PlayerNight[])

    const out: LeagueDataH2HPoints = {
      format: 'h2h-points',
      leagueId: leagueKey,
      leagueName: deriveLeagueName(pointsSettingsRaw, leagueKey),
      currentWeek,
      currentSeason,
      playoffCutoff,
      teams: teamList,
      currentWeekMatchups,
      previousWeekMatchups,
      weeklyPointsAverage,
      standings,
      seasonRankHistory,
      seasonHistory,
      managerLegacy,
      h2hRecords,
      playerNights: pointsPlayerNights,
    }
    return out
  }

  // Parallelize the three independent fetches.
  const [scoringSettings, leagueSettingsRaw, rawStandings, teams] = await Promise.all([
    yahooService.getLeagueScoringSettings(leagueKey).catch(() => null),
    yahooService.getLeagueSettings(leagueKey).catch(() => null),
    yahooService.getStandings(leagueKey).catch(() => [] as any[]),
    yahooService.getTeams(leagueKey).catch(() => [] as any[]),
  ])

  if (!rawStandings || rawStandings.length === 0) {
    throw new Error(
      `Yahoo league ${leagueKey} returned no team standings (league may not have started)`,
    )
  }

  // Manager nicknames + logos come from getTeams; standings carry the
  // record + rank. Merge by team_key.
  const teamMetaByKey = new Map<string, any>()
  for (const t of teams) teamMetaByKey.set(t.team_key, t)

  const myGuid = opts?.userIdentity?.yahooGuid?.trim() || null
  const teamList: CategoryLeagueDataTeam[] = rawStandings.map((s: any) => {
    const meta = teamMetaByKey.get(s.team_key) ?? {}
    const ownerName: string =
      meta.managers?.[0]?.manager?.nickname ||
      meta.managers?.[0]?.manager?.name ||
      'Manager'
    // Two converging signals for "my team":
    //   1. yahooService.getTeams already detects `is_current_login` and
    //      sets `is_my_team` — use it when present (no auth context
    //      required, works whenever Yahoo's session cookies are warm).
    //   2. If the caller passed in the signed-in user's manager guid,
    //      match against the standings row's `manager_guid` (more
    //      reliable when getTeams' detection is flaky, e.g., across
    //      proxied requests).
    const isMyTeam =
      (meta.is_my_team === true) ||
      (!!myGuid && typeof s.manager_guid === 'string' && s.manager_guid === myGuid)
    return {
      id: s.team_key,
      name: s.name || meta.name || 'Team',
      ownerName,
      ownerInitials: initialsOf(ownerName),
      avatarUrl: s.logo_url || meta.logo_url || undefined,
      avatarColor: teamColorHash(`${s.team_key}:${s.name || ''}`),
      isMyTeam,
    }
  })

  // Resolve which categories this league plays.
  const { categories, statIdByCatId, catIdByStatId } = resolveCategories(
    scoringSettings,
    leagueKey,
  )

  // Playoff cutoff from settings; fall back to half the league.
  const playoffCutoff = readPlayoffCutoff(leagueSettingsRaw, teamList.length)

  // Regular-season end week. Yahoo's `metadata.endWeek` is the END
  // of the entire league (regular + playoffs); for "weeks left in
  // the regular season" we want the week BEFORE playoffs start.
  // `playoff_start_week` is on the settings object.
  const regularSeasonEndWeek = readRegularSeasonEndWeek(leagueSettingsRaw, metadata.endWeek)

  // Walk every completed week's category matchups in parallel.
  const matchupsByWeek = await fetchAllCategoryMatchups(leagueKey, currentWeek)

  // Per-team season-cumulative cat stats (used for categoryRanks).
  // For roto leagues this is the entire basis of standings; for H2H
  // it's the per-cat rank readout.
  const teamSeasonStats = await fetchTeamSeasonStats(rawStandings)

  // Per-team cat W/L/T from real stat_winners across walked weeks.
  const perTeamCatRecord = buildPerTeamCatRecord(
    rawStandings,
    matchupsByWeek,
    catIdByStatId,
    isRoto,
  )

  // Build standings — REAL cat-record for H2H, fall-through to
  // Yahoo's stored rank for roto.
  const standings = buildStandings(
    rawStandings,
    perTeamCatRecord,
    matchupsByWeek,
    isRoto,
  )

  // Per-cat ranks from season-cumulative stats. AVG/ERA/WHIP rebuilt
  // from raw values rather than averaged (Yahoo already returns the
  // composite, so we use it directly).
  const categoryRanks = buildCategoryRanks(
    rawStandings,
    categories,
    statIdByCatId,
    teamSeasonStats,
    standings,
  )

  // Season rank history: walk each completed week and snapshot ranks
  // as of the close of that week.
  const seasonRankHistory = isRoto
    ? buildRotoSeasonRankHistory(rawStandings, currentWeek)
    : buildSeasonRankHistory(rawStandings, matchupsByWeek)

  // Current-week matchups.
  const matchupsCurrentWeek = isRoto
    ? []
    : buildCurrentWeekMatchups(
        matchupsByWeek,
        currentWeek,
        categories,
        catIdByStatId,
        standings,
      )

  // Previous-week matchups — finalized state. Drives the Monday LAST
  // WEEK recap beat. Same builder; Yahoo's winner_team_key is set on
  // closed matchups so status comes back as 'final'.
  const matchupsPreviousWeek = isRoto || currentWeek <= 1
    ? []
    : buildCurrentWeekMatchups(
        matchupsByWeek,
        currentWeek - 1,
        categories,
        catIdByStatId,
        standings,
      )

  // Per-week matchups — required for The Issue's reconstruction of
  // archived weeks. Roto leagues skip (no per-week matchup concept).
  // For everyone else, decode every week we have raw matchups for.
  const matchupsByWeekDecoded: Record<string, CategoryLeagueDataMatchup[]> = {}
  if (!isRoto) {
    for (const w of matchupsByWeek.keys()) {
      if (w < 1) continue
      matchupsByWeekDecoded[String(w)] = buildCurrentWeekMatchups(
        matchupsByWeek,
        w,
        categories,
        catIdByStatId,
        standings,
      )
    }
  }

  // Weekly cats-won + league average (Home page chart).
  const { weeklyCatsWon, weeklyLeagueAverage } = buildWeeklyCatTallies(
    rawStandings,
    matchupsByWeek,
    categories,
    catIdByStatId,
    isRoto,
  )

  // Connected prior seasons — fetched ONCE, in parallel, then shared by
  // both season-history and the legacy aggregation below.
  const priorKeys = Array.from(
    new Set((opts?.priorSeasonKeys ?? []).filter((k) => k && k !== leagueKey)),
  )
  const priorSeasons = priorKeys.length
    ? await fetchPriorSeasons(priorKeys, leagueKey)
    : []

  // Multi-season history — prefer the user's connected prior seasons,
  // fall back to the `renew` chain when none are connected.
  const seasonHistory = await buildSeasonHistory(
    metadata,
    leagueKey,
    priorSeasons,
    priorKeys.length > 0,
  )

  // Career stats — current season + walked history.
  const teamCareerStats = buildTeamCareerStats(
    rawStandings,
    standings,
    seasonHistory,
    categories,
  )

  // All-time legacy — real per-manager aggregation across connected
  // seasons (synchronous; reuses the shared prior-season fetch).
  const managerLegacy = buildManagerLegacy(
    metadata,
    rawStandings,
    teamList,
    playoffCutoff,
    myGuid,
    priorSeasons,
  )

  // All-time H2H matrix (current season only — walking prior seasons
  // requires renormalizing team_keys to manager GUIDs, which is the
  // CategoryHistoryView approach; we omit here to ship the adapter
  // and revisit in a follow-up).
  const h2hMatrix = buildH2HMatrix(rawStandings, matchupsByWeek)

  // Draft (optional).
  const draft = await buildDraft(leagueKey, currentSeason)

  // League transactions — trades, FAAB winners, waiver claims.
  // Non-fatal: returns undefined when Yahoo's transactions endpoint
  // errors. Transaction detectors quietly no-op when missing.
  const transactions = await buildYahooTransactions(leagueKey, metadata.currentWeek)

  // Player nights + injury reports — fetch every team's roster
  // ONCE in parallel, then reuse the same name index for both
  // detectors. Yahoo doesn't bundle rosters with the league fetch
  // so this is an N+1 (one fetch per team). Acceptable for 10-12
  // team leagues; one shared fetch keeps the cost honest.
  const myTeamKey = teamList.find((t) => t.isMyTeam)?.id
  const yahooRosterResult = await fetchYahooRostersOnce(
    rawStandings,
    myTeamKey,
  ).catch(() => ({
    rosterByName: new Map<string, string[]>(),
    myBenchedPlayers: undefined as Set<string> | undefined,
  }))
  const yahooRosterByName = yahooRosterResult.rosterByName
  const myBenchedPlayers = yahooRosterResult.myBenchedPlayers
  const [playerNights, injuryReports, slumpReports] = await Promise.all([
    buildPlayerNights({ rosterByName: yahooRosterByName, includeUnowned: true })
      .catch(() => [] as PlayerNight[]),
    buildInjuryReports({ rosterByName: yahooRosterByName, includeUnowned: false })
      .catch(() => [] as InjuryReport[]),
    buildSlumpReports({ rosterByName: yahooRosterByName, includeUnowned: false })
      .catch(() => [] as SlumpReport[]),
  ])

  const catGames: H2HGame[] = []
  if (!isRoto) {
    for (const weekMatchups of matchupsByWeek.values()) {
      for (const m of weekMatchups) {
        if (!m.teams || m.teams.length < 2) continue
        const [home, away] = m.teams
        const isFinal =
          (m.winner_team_key !== undefined && m.winner_team_key !== null) ||
          m.is_tied === true
        if (!isFinal) continue
        let homeCatWins = 0
        let awayCatWins = 0
        for (const sw of m.stat_winners ?? []) {
          if (sw.is_tied) continue
          if (sw.winner_team_key === home.team_key) homeCatWins++
          else if (sw.winner_team_key === away.team_key) awayCatWins++
        }
        catGames.push({
          a: home.team_key,
          b: away.team_key,
          winner:
            homeCatWins > awayCatWins ? 'a'
            : awayCatWins > homeCatWins ? 'b'
            : 'tie',
        })
      }
    }
  }
  const h2hRecordsCat = buildH2H(catGames)

  const partialData: CategoryLeagueData = {
    format: 'h2h-category',
    leagueId: leagueKey,
    leagueName: deriveLeagueName(leagueSettingsRaw, leagueKey),
    currentWeek,
    currentSeason,
    playoffCutoff,
    regularSeasonEndWeek,
    teams: teamList,
    categories,
    standings,
    categoryRanks,
    seasonRankHistory,
    matchupsCurrentWeek,
    matchupsPreviousWeek,
    matchupsByWeek: matchupsByWeekDecoded,
    seasonHistory,
    teamCareerStats,
    managerLegacy,
    h2hMatrix,
    draft,
    weeklyCatsWon,
    weeklyLeagueAverage,
    transactions,
    playerNights,
    injuryReports,
    slumpReports,
    myBenchedPlayers,
    h2hRecords: h2hRecordsCat,
  }
  // Snapshot delta — overnight cat-tips, matchup pulse, rank shifts.
  const snapshotDelta = await hydrateSnapshotDelta(opts?.leagueRowId, partialData)

  // Matchup daily trajectory — reads this-week snapshots + current
  // projection to populate dailyTrend on each matchup. Mutates in
  // place. Non-fatal on any error; chart simply stays hidden.
  await hydrateMatchupDailyTrends(opts?.leagueRowId, partialData)

  return {
    ...partialData,
    snapshotDelta,
  }
}

/* ─────────────────────────────────────────────────────────────────
   YAHOO LEAGUE TRANSACTIONS

   yahooService.getTransactions returns rich shape (player movements
   + bid amounts). We normalize to LeagueTransaction[] for cross-
   platform detection.

   Yahoo team_keys look like "458.l.12345.t.7" — we keep the trailing
   "t.7" → "7" form for matching against CategoryLeagueDataTeam.id
   which Yahoo adapters set to the team_key's full string.
───────────────────────────────────────────────────────────────── */

async function buildYahooTransactions(
  leagueKey: string,
  currentWeek: number,
): Promise<LeagueTransaction[] | undefined> {
  try {
    const raw = await yahooService.getTransactions(leagueKey)
    if (!raw || raw.length === 0) return undefined

    const txs: LeagueTransaction[] = []
    for (const t of raw) {
      const normalized = normalizeYahooTransaction(t, currentWeek)
      if (normalized) txs.push(normalized)
    }
    txs.sort((a, b) => b.timestamp - a.timestamp)
    return txs
  } catch (err) {
    console.warn('[yahooAdapter] transactions fetch failed:', err)
    return undefined
  }
}

function normalizeYahooTransaction(
  t: any,
  currentWeek: number,
): LeagueTransaction | null {
  if (!t || t.status !== 'successful') return null

  const kind = classifyYahooKind(t.type, t.faab_bid)
  if (!kind) return null

  const movements: TransactionMovement[] = []
  const teamSet = new Set<string>()
  for (const m of (t.movements ?? []) as any[]) {
    const fromTeamId = yahooTeamRef(m.source_type, m.source_team_key)
    const toTeamId = yahooTeamRef(m.destination_type, m.destination_team_key)
    if (fromTeamId !== 'fa' && fromTeamId !== 'waivers') teamSet.add(fromTeamId)
    if (toTeamId !== 'fa' && toTeamId !== 'waivers') teamSet.add(toTeamId)
    movements.push({
      playerId: m.player_id || m.player_key || '',
      playerName: m.player_name || 'Unknown player',
      position: m.position,
      fromTeamId,
      toTeamId,
    })
  }
  if (movements.length === 0) return null

  // Yahoo timestamps are unix SECONDS — convert to ms.
  const timestampMs = t.timestamp ? t.timestamp * 1000 : Date.now()

  // Fantasy week — Yahoo doesn't directly tag transactions with a
  // week. Approximate from the timestamp using the current week as
  // the "now" anchor and assuming a 7-day week. Good enough for
  // freshness math; not load-bearing.
  const daysAgo = Math.floor((Date.now() - timestampMs) / (1000 * 60 * 60 * 24))
  const week = Math.max(1, currentWeek - Math.floor(daysAgo / 7))

  return {
    id: String(t.transaction_key ?? t.transaction_id ?? `${t.timestamp}-${kind}`),
    platform: 'yahoo',
    kind,
    timestamp: timestampMs,
    week,
    teamIds: Array.from(teamSet),
    movements,
    faabBid: t.faab_bid && t.faab_bid > 0 ? t.faab_bid : undefined,
    waiverPriority: t.waiver_priority,
  }
}

function classifyYahooKind(
  type: string | undefined,
  faabBid: number | undefined,
): TransactionKind | null {
  if (!type) return null
  switch (type) {
    case 'trade':                return 'trade'
    case 'add':                  return typeof faabBid === 'number' && faabBid > 0 ? 'faab-add' : 'fa-add'
    case 'drop':                 return 'drop'
    case 'add/drop':             return typeof faabBid === 'number' && faabBid > 0 ? 'faab-add' : 'fa-add'
    case 'commish':              return null
    case 'pending_trade':        return null
    case 'waiver':               return 'waiver-add'
    default:                     return null
  }
}

/** Map Yahoo source/destination type + team_key to our team ref
 *  sentinel ('fa', 'waivers', or a team_key string). */
function yahooTeamRef(type: string, teamKey: string | undefined): string {
  if (type === 'freeagents') return 'fa'
  if (type === 'waivers') return 'waivers'
  if (type === 'team' || type === 'trade') return teamKey ?? 'fa'
  return teamKey ?? 'fa'
}

/* ─────────────────────────────────────────────────────────────────
   CATEGORY RESOLUTION
─────────────────────────────────────────────────────────────────── */

function resolveCategories(
  scoringSettings: any,
  leagueKey: string,
): {
  categories: CategoryLeagueDataCategory[]
  statIdByCatId: Map<string, string>
  catIdByStatId: Map<string, YahooCatDef>
} {
  const lookup = buildStatIdLookup()
  const categories: CategoryLeagueDataCategory[] = []
  const statIdByCatId = new Map<string, string>()
  const catIdByStatId = new Map<string, YahooCatDef>()
  const seen = new Set<string>()

  const rawCats: any[] = scoringSettings?.stat_categories ?? []
  for (const raw of rawCats) {
    const stat = raw?.stat ?? raw
    const statId = String(stat?.stat_id ?? '')
    if (!statId) continue
    // Display-only stats (GP, IP, H/AB) are NOT scoring cats.
    const isDisplay =
      stat?.is_only_display_stat === '1' || stat?.is_only_display_stat === 1
    if (isDisplay) continue
    const def = lookup.get(statId)
    if (!def) {
      warnUnknown(
        `[yahooAdapter] league ${leagueKey}: unknown stat_id ${statId} (` +
          `name="${stat?.display_name || stat?.name || '?'}") — skipping`,
      )
      continue
    }
    if (seen.has(def.id)) continue
    seen.add(def.id)
    categories.push({ id: def.id, label: def.label, name: def.name, side: def.side })
    statIdByCatId.set(def.id, statId)
    catIdByStatId.set(statId, def)
  }

  if (categories.length === 0) {
    // No scoring settings exposed at all — fall back to the standard
    // 11-cat baseball set so the editorial pipeline still renders.
    console.warn(
      `[yahooAdapter] league ${leagueKey}: no recognized scoring cats; ` +
        'falling back to standard 11-cat baseball.',
    )
    const DEFAULTS = ['R', 'H', 'HR', 'RBI', 'SB', 'AVG', 'W', 'SV', 'K', 'HLD', 'ERA']
    for (const id of DEFAULTS) {
      const def = YAHOO_MLB_STAT_MAP.find((d) => d.id === id)
      if (!def) continue
      categories.push({ id: def.id, label: def.label, name: def.name, side: def.side })
      statIdByCatId.set(def.id, def.statIds[0])
      catIdByStatId.set(def.statIds[0], def)
    }
  }

  return { categories, statIdByCatId, catIdByStatId }
}

const _warnedUnknown = new Set<string>()
function warnUnknown(msg: string): void {
  if (_warnedUnknown.has(msg)) return
  _warnedUnknown.add(msg)
  console.warn(msg)
}

/* ─────────────────────────────────────────────────────────────────
   PLAYOFF CUTOFF
─────────────────────────────────────────────────────────────────── */

function readPlayoffCutoff(rawSettings: any, teamCount: number): number {
  const n = parseInt(rawSettings?.num_playoff_teams ?? '', 10)
  if (Number.isFinite(n) && n > 0 && n <= teamCount) return n
  return Math.max(4, Math.floor(teamCount / 2))
}

/** Last week of the REGULAR season. Yahoo's `playoff_start_week` is
 *  the first playoff week; one less is the last regular week. When
 *  the setting isn't exposed, fall back to `endWeek - 3` (typical
 *  3-week H2H playoff length) so "weeks left" doesn't claim playoff
 *  weeks as regular ones. */
function readRegularSeasonEndWeek(rawSettings: any, endWeek: number): number {
  const psw = parseInt(rawSettings?.playoff_start_week ?? '', 10)
  if (Number.isFinite(psw) && psw > 1) return psw - 1
  return Math.max(1, endWeek - 3)
}

/* ─────────────────────────────────────────────────────────────────
   LEAGUE NAME
─────────────────────────────────────────────────────────────────── */

/** Map Yahoo's matchup payload (YahooMatchup[]) to the editorial-side
 *  LeagueDataPointsMatchup shape. Status detection:
 *  - 'final'    when winner_team_key is present (matchup decided)
 *  - 'live'     when forceFinal is false and no winner yet
 *  Yahoo doesn't distinguish 'upcoming' vs 'live' on a points
 *  scoreboard read; we treat any non-winner matchup as live during
 *  the current week. Past weeks are forced to 'final'. */
function mapYahooPointsMatchups(raw: any[], forceFinal: boolean): LeagueDataPointsMatchup[] {
  if (!raw || raw.length === 0) return []
  const out: LeagueDataPointsMatchup[] = []
  for (const m of raw) {
    const teams = m?.teams ?? []
    if (teams.length < 2) continue
    const home = teams[0]
    const away = teams[1]
    const decided = !!m.winner_team_key || forceFinal
    const homePoints = Number(home.points ?? 0)
    const awayPoints = Number(away.points ?? 0)
    const homeProjected = Number.isFinite(home.projected_points)
      ? Number(home.projected_points)
      : undefined
    const awayProjected = Number.isFinite(away.projected_points)
      ? Number(away.projected_points)
      : undefined
    out.push({
      id: String(m.matchup_id ?? `${home.team_key}-${away.team_key}-${m.week}`),
      homeTeamId: home.team_key,
      awayTeamId: away.team_key,
      status: decided ? 'final' : 'live',
      homePoints,
      awayPoints,
      homeProjected,
      awayProjected,
    })
  }
  return out
}

/** Mean of every team's points across an array of matchups. Drives
 *  the league-average editorial framing ("averaging X over the
 *  field"). Returns undefined when there's no signal. */
function avgPointsAcrossMatchups(matchups: LeagueDataPointsMatchup[]): number | undefined {
  const all: number[] = []
  for (const m of matchups) {
    if (Number.isFinite(m.homePoints)) all.push(m.homePoints)
    if (Number.isFinite(m.awayPoints)) all.push(m.awayPoints)
  }
  if (all.length === 0) return undefined
  return all.reduce((a, b) => a + b, 0) / all.length
}

function deriveLeagueName(rawSettings: any, leagueKey: string): string {
  // getLeagueSettings doesn't reliably return the league name — Yahoo
  // returns it in the league-level metadata block. Fall through a
  // few options before defaulting.
  const fromSettings = rawSettings?.name
  if (typeof fromSettings === 'string' && fromSettings.trim()) return fromSettings
  return `Yahoo League ${leagueKey}`
}

/* ─────────────────────────────────────────────────────────────────
   MATCHUP FETCH
─────────────────────────────────────────────────────────────────── */

interface YahooCatMatchup {
  week: number
  teams: Array<{ team_key: string; name: string; logo_url?: string; stats: Record<string, string> }>
  stat_winners: Array<{ stat_id: string; winner_team_key: string; is_tied: boolean }>
  winner_team_key?: string
  is_tied?: boolean
}

async function fetchAllCategoryMatchups(
  leagueKey: string,
  upToWeek: number,
): Promise<Map<number, YahooCatMatchup[]>> {
  const out = new Map<number, YahooCatMatchup[]>()
  if (upToWeek < 1) return out

  const tasks: Promise<{ week: number; data: YahooCatMatchup[] | null }>[] = []
  for (let w = 1; w <= upToWeek; w++) {
    tasks.push(
      yahooService
        .getCategoryMatchups(leagueKey, w)
        .then((data) => ({ week: w, data: (data as YahooCatMatchup[]) ?? null }))
        .catch((err: unknown) => {
          console.warn(
            `[yahooAdapter] failed to fetch matchups for week ${w}:`,
            err,
          )
          return { week: w, data: null }
        }),
    )
  }
  const results = await Promise.all(tasks)
  for (const { week, data } of results) {
    if (Array.isArray(data) && data.length > 0) out.set(week, data)
  }
  return out
}

/** Fetch every completed week's points matchups (weeks 1..upToWeek) and
 *  map them to the neutral `LeagueDataPointsMatchup` shape, marked final.
 *  Mirrors `fetchAllCategoryMatchups` but for the points scoreboard
 *  endpoint. Drives points standings + season rank history. */
async function fetchAllPointsMatchups(
  leagueKey: string,
  upToWeek: number,
): Promise<Map<number, LeagueDataPointsMatchup[]>> {
  const out = new Map<number, LeagueDataPointsMatchup[]>()
  if (upToWeek < 1) return out

  const tasks: Promise<{ week: number; data: LeagueDataPointsMatchup[] }>[] = []
  for (let w = 1; w <= upToWeek; w++) {
    tasks.push(
      yahooService
        .getMatchups(leagueKey, w)
        .then((raw) => ({
          week: w,
          data: mapYahooPointsMatchups((raw as any[]) ?? [], /*forceFinal=*/ true),
        }))
        .catch((err: unknown) => {
          console.warn(
            `[yahooAdapter] failed to fetch points matchups for week ${w}:`,
            err,
          )
          return { week: w, data: [] as LeagueDataPointsMatchup[] }
        }),
    )
  }
  const results = await Promise.all(tasks)
  for (const { week, data } of results) {
    if (data.length > 0) out.set(week, data)
  }
  return out
}

async function fetchTeamSeasonStats(
  rawStandings: any[],
): Promise<Map<string, Record<string, number>>> {
  const out = new Map<string, Record<string, number>>()
  const tasks = rawStandings.map((s) =>
    yahooService
      .getTeamSeasonStats(s.team_key)
      .then((stats) => ({ teamKey: s.team_key, stats }))
      .catch(() => ({ teamKey: s.team_key, stats: {} as Record<string, number> })),
  )
  const results = await Promise.all(tasks)
  for (const { teamKey, stats } of results) out.set(teamKey, stats)
  return out
}

/* ─────────────────────────────────────────────────────────────────
   PER-TEAM CAT W/L/T RECORD (from real stat_winners)
─────────────────────────────────────────────────────────────────── */

function buildPerTeamCatRecord(
  rawStandings: any[],
  matchupsByWeek: Map<number, YahooCatMatchup[]>,
  catIdByStatId: Map<string, YahooCatDef>,
  isRoto: boolean,
): Map<string, { wins: number; losses: number; ties: number }> {
  const out = new Map<string, { wins: number; losses: number; ties: number }>()
  for (const s of rawStandings) {
    out.set(s.team_key, { wins: 0, losses: 0, ties: 0 })
  }
  if (isRoto) return out   // roto doesn't have per-cat matchup tallies

  for (const matchups of matchupsByWeek.values()) {
    for (const m of matchups) {
      if (!m.teams || m.teams.length < 2) continue
      const [a, b] = m.teams
      const aRec = out.get(a.team_key)
      const bRec = out.get(b.team_key)
      if (!aRec || !bRec) continue
      for (const sw of m.stat_winners ?? []) {
        const def = catIdByStatId.get(String(sw.stat_id))
        if (!def) continue   // unknown / display-only stat
        if (sw.is_tied) {
          aRec.ties++
          bRec.ties++
        } else if (sw.winner_team_key === a.team_key) {
          aRec.wins++
          bRec.losses++
        } else if (sw.winner_team_key === b.team_key) {
          aRec.losses++
          bRec.wins++
        }
        // No winner_team_key and not tied → skip (cat not contested).
      }
    }
  }
  return out
}

/* ─────────────────────────────────────────────────────────────────
   STANDINGS
─────────────────────────────────────────────────────────────────── */

function buildStandings(
  rawStandings: any[],
  perTeamCatRecord: Map<string, { wins: number; losses: number; ties: number }>,
  matchupsByWeek: Map<number, YahooCatMatchup[]>,
  isRoto: boolean,
): CategoryLeagueDataStanding[] {
  const weeklyOutcomes = buildWeeklyOutcomes(matchupsByWeek)

  const rows: CategoryLeagueDataStanding[] = rawStandings.map((s) => {
    const rec = perTeamCatRecord.get(s.team_key) ?? { wins: 0, losses: 0, ties: 0 }
    let catWins = rec.wins
    let catLosses = rec.losses
    let catTies = rec.ties

    // For roto leagues we don't have per-cat W/L; substitute the overall
    // record so downstream consumers still get something meaningful.
    if (isRoto) {
      catWins = parseInt(s.wins ?? '0', 10) || 0
      catLosses = parseInt(s.losses ?? '0', 10) || 0
      catTies = parseInt(s.ties ?? '0', 10) || 0
    }

    const denom = catWins + catLosses + catTies
    const winPct = denom > 0 ? (catWins + catTies * 0.5) / denom : 0

    const teamOutcomes = weeklyOutcomes.get(s.team_key) ?? []
    const lastSix = teamOutcomes.slice(-6)
    const streak = computeStreak(teamOutcomes)

    return {
      teamId: s.team_key,
      catWins,
      catLosses,
      catTies,
      winPct,
      streak,
      lastSix,
      ownsCount: 0,
      bleedingCount: 0,
      rank: 0,
    }
  })

  // Sort by Yahoo's rank when present (Yahoo already computed it);
  // fall back to winPct desc when rank is 0.
  rows.sort((a, b) => {
    const aRow = rawStandings.find((s) => s.team_key === a.teamId)
    const bRow = rawStandings.find((s) => s.team_key === b.teamId)
    const aRank = aRow?.rank ?? 0
    const bRank = bRow?.rank ?? 0
    if (aRank > 0 && bRank > 0 && aRank !== bRank) return aRank - bRank
    if (b.winPct !== a.winPct) return b.winPct - a.winPct
    return a.teamId.localeCompare(b.teamId)
  })
  rows.forEach((row, idx) => (row.rank = idx + 1))
  return rows
}

function buildWeeklyOutcomes(
  matchupsByWeek: Map<number, YahooCatMatchup[]>,
): Map<string, WLT[]> {
  const out = new Map<string, WLT[]>()
  const weeks = [...matchupsByWeek.keys()].sort((a, b) => a - b)
  for (const week of weeks) {
    for (const m of matchupsByWeek.get(week) ?? []) {
      if (!m.teams || m.teams.length < 2) continue
      const [a, b] = m.teams
      let aResult: WLT
      let bResult: WLT
      if (m.is_tied) {
        aResult = 'T'
        bResult = 'T'
      } else if (m.winner_team_key === a.team_key) {
        aResult = 'W'
        bResult = 'L'
      } else if (m.winner_team_key === b.team_key) {
        aResult = 'L'
        bResult = 'W'
      } else {
        // No winner yet — skip.
        continue
      }
      pushOutcome(out, a.team_key, aResult)
      pushOutcome(out, b.team_key, bResult)
    }
  }
  return out
}

function pushOutcome(map: Map<string, WLT[]>, teamKey: string, r: WLT): void {
  const arr = map.get(teamKey) ?? []
  arr.push(r)
  map.set(teamKey, arr)
}

function computeStreak(outcomes: WLT[]): { type: WLT; length: number } {
  if (outcomes.length === 0) return { type: 'T', length: 0 }
  const last = outcomes[outcomes.length - 1]
  let length = 1
  for (let i = outcomes.length - 2; i >= 0; i--) {
    if (outcomes[i] === last) length++
    else break
  }
  return { type: last, length }
}

/* ─────────────────────────────────────────────────────────────────
   CATEGORY RANKS — from season-cumulative team stats
─────────────────────────────────────────────────────────────────── */

function buildCategoryRanks(
  rawStandings: any[],
  categories: CategoryLeagueDataCategory[],
  statIdByCatId: Map<string, string>,
  teamSeasonStats: Map<string, Record<string, number>>,
  standings: CategoryLeagueDataStanding[],
): CategoryLeagueDataCategoryRank[] {
  const teamCount = rawStandings.length

  const out: CategoryLeagueDataCategoryRank[] = rawStandings.map((s) => ({
    teamId: s.team_key,
    catRanks: {} as Record<string, number>,
  }))

  for (const cat of categories) {
    const def = YAHOO_MLB_STAT_MAP.find((d) => d.id === cat.id)
    const statId = statIdByCatId.get(cat.id)
    if (!def || !statId) {
      for (const row of out) row.catRanks[cat.id] = 0
      continue
    }

    const rankable: { teamId: string; value: number }[] = []
    for (const row of out) {
      const stats = teamSeasonStats.get(row.teamId)
      const raw = stats?.[statId]
      if (typeof raw !== 'number' || !Number.isFinite(raw)) continue
      rankable.push({ teamId: row.teamId, value: raw })
    }

    if (rankable.length === 0) {
      for (const row of out) row.catRanks[cat.id] = 0
      continue
    }

    rankable.sort((a, b) => {
      if (a.value === b.value) return a.teamId.localeCompare(b.teamId)
      return def.higherIsBetter ? b.value - a.value : a.value - b.value
    })

    rankable.forEach((entry, idx) => {
      const row = out.find((o) => o.teamId === entry.teamId)
      if (row) row.catRanks[cat.id] = idx + 1
    })
    // Unranked teams get sentinel 0.
    for (const row of out) {
      if (row.catRanks[cat.id] == null) row.catRanks[cat.id] = 0
    }
  }

  // Recompute ownsCount / bleedingCount from real ranks.
  for (const s of standings) {
    const ranks = out.find((r) => r.teamId === s.teamId)?.catRanks ?? {}
    const realRanks = Object.values(ranks).filter((r) => r > 0)
    s.ownsCount = realRanks.filter((r) => r <= 3).length
    s.bleedingCount = realRanks.filter((r) => r >= teamCount - 2).length
  }

  return out
}

/* ─────────────────────────────────────────────────────────────────
   SEASON RANK HISTORY
─────────────────────────────────────────────────────────────────── */

function buildSeasonRankHistory(
  rawStandings: any[],
  matchupsByWeek: Map<number, YahooCatMatchup[]>,
): CategoryLeagueDataWeeklyRanks[] {
  const weeks = [...matchupsByWeek.keys()].sort((a, b) => a - b)
  const cumulative = new Map<string, { wins: number; losses: number; ties: number }>()
  for (const s of rawStandings) {
    cumulative.set(s.team_key, { wins: 0, losses: 0, ties: 0 })
  }

  const history: CategoryLeagueDataWeeklyRanks[] = []

  for (const week of weeks) {
    const weekMatchups = matchupsByWeek.get(week) ?? []
    // A week is "final" only when every matchup in it has a resolved
    // outcome (winner_team_key set, or is_tied true). If even one
    // matchup is still mid-week, we skip pushing a snapshot for it —
    // the cumulative records are stale for that week and the chart
    // endpoint would mis-label partial data as end-of-week ranks.
    //
    // This mirrors ESPN's behavior (the ESPN adapter only emits
    // weeks where every matchup was decided) and CLAUDE.md's note
    // about Yahoo's seasonRankHistory needing a similar filter.
    const isFinalWeek = weekMatchups.length > 0 && weekMatchups.every(
      (m) => m.is_tied === true || (m.winner_team_key !== undefined && m.winner_team_key !== null),
    )

    for (const m of weekMatchups) {
      if (!m.teams || m.teams.length < 2) continue
      const [a, b] = m.teams
      const aRec = cumulative.get(a.team_key)
      const bRec = cumulative.get(b.team_key)
      if (!aRec || !bRec) continue
      if (m.is_tied) {
        aRec.ties++
        bRec.ties++
      } else if (m.winner_team_key === a.team_key) {
        aRec.wins++
        bRec.losses++
      } else if (m.winner_team_key === b.team_key) {
        aRec.losses++
        bRec.wins++
      }
    }

    if (!isFinalWeek) continue

    const snapshot = rawStandings
      .map((s) => {
        const rec = cumulative.get(s.team_key)!
        const played = rec.wins + rec.losses + rec.ties
        const pct = played > 0 ? rec.wins / played : 0
        return { teamId: s.team_key, pct, wins: rec.wins }
      })
      .sort((a, b) => {
        if (b.pct !== a.pct) return b.pct - a.pct
        if (b.wins !== a.wins) return b.wins - a.wins
        return a.teamId.localeCompare(b.teamId)
      })

    const ranks: Record<string, number> = {}
    snapshot.forEach((row, idx) => (ranks[row.teamId] = idx + 1))
    history.push({ week, ranks })
  }

  return history
}

/** Roto leagues don't expose weekly H2H outcomes — return a single
 *  snapshot using Yahoo's stored rank so the editorial pipeline still
 *  has a trajectory array (length 1). */
function buildRotoSeasonRankHistory(
  rawStandings: any[],
  currentWeek: number,
): CategoryLeagueDataWeeklyRanks[] {
  const sorted = [...rawStandings].sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999))
  const ranks: Record<string, number> = {}
  sorted.forEach((s, idx) => (ranks[s.team_key] = s.rank > 0 ? s.rank : idx + 1))
  return [{ week: currentWeek, ranks }]
}

/* ─────────────────────────────────────────────────────────────────
   CURRENT-WEEK MATCHUPS
─────────────────────────────────────────────────────────────────── */

function buildCurrentWeekMatchups(
  matchupsByWeek: Map<number, YahooCatMatchup[]>,
  currentWeek: number,
  categories: CategoryLeagueDataCategory[],
  catIdByStatId: Map<string, YahooCatDef>,
  standings: CategoryLeagueDataStanding[],
): CategoryLeagueDataMatchup[] {
  const list = matchupsByWeek.get(currentWeek) ?? []
  if (list.length === 0) return []

  // Build the lower-better cat set + statId→catDef-with-canonical-id
  // lookup once. catIdByStatId already maps stat_id → YahooCatDef.
  const lowerBetterCatIds = new Set<string>()
  for (const def of catIdByStatId.values()) {
    if (!def.higherIsBetter) lowerBetterCatIds.add(def.id)
  }

  // For each canonical cat, pick a representative stat_id (the first
  // one Yahoo defined for it). Used to read the per-team current value.
  const primaryStatIdByCatId = new Map<string, string>()
  for (const def of catIdByStatId.values()) {
    if (!primaryStatIdByCatId.has(def.id) && def.statIds.length > 0) {
      primaryStatIdByCatId.set(def.id, def.statIds[0])
    }
  }

  const daysIn = daysInCurrentWeek()
  const out: CategoryLeagueDataMatchup[] = []
  for (let i = 0; i < list.length; i++) {
    const m = list[i]
    if (!m.teams || m.teams.length < 2) continue
    const [home, away] = m.teams

    // Mid-week leader tally — what the UI displays as "5-2 cats".
    let homeCatWins = 0
    let awayCatWins = 0
    let ties = 0
    let decidedCount = 0
    const winnerByCatId = new Map<string, 'home' | 'away' | 'tied'>()
    for (const sw of m.stat_winners ?? []) {
      const def = catIdByStatId.get(String(sw.stat_id))
      if (!def) continue
      if (sw.is_tied) {
        ties++
        decidedCount++
        winnerByCatId.set(def.id, 'tied')
      } else if (sw.winner_team_key === home.team_key) {
        homeCatWins++
        decidedCount++
        winnerByCatId.set(def.id, 'home')
      } else if (sw.winner_team_key === away.team_key) {
        awayCatWins++
        decidedCount++
        winnerByCatId.set(def.id, 'away')
      }
    }

    const isFinal = Boolean(m.winner_team_key) || m.is_tied === true
    const status: CategoryLeagueDataMatchup['status'] = isFinal
      ? 'final'
      : decidedCount > 0
      ? 'live'
      : 'upcoming'

    // Per-cat lines — current values from each team's stats, status
    // reflects LOCK state (decided-X only after finalization).
    const catLines: CategoryLeagueDataMatchup['catLines'] = []
    for (const cat of categories) {
      const statId = primaryStatIdByCatId.get(cat.id)
      const homeRaw = statId ? home.stats?.[statId] : undefined
      const awayRaw = statId ? away.stats?.[statId] : undefined
      const homeCurrent = homeRaw != null && homeRaw !== '' ? parseFloat(homeRaw) : 0
      const awayCurrent = awayRaw != null && awayRaw !== '' ? parseFloat(awayRaw) : 0
      const direction = winnerByCatId.get(cat.id)
      let lineStatus: CategoryLeagueDataCatLine['status'] = 'contested'
      if (isFinal) {
        if (direction === 'home') lineStatus = 'decided-home'
        else if (direction === 'away') lineStatus = 'decided-away'
        // (tied at final → still contested in the data; rare and benign)
      }
      catLines.push({
        catId: cat.id,
        homeCurrent: Number.isFinite(homeCurrent) ? homeCurrent : 0,
        awayCurrent: Number.isFinite(awayCurrent) ? awayCurrent : 0,
        status: lineStatus,
      })
    }

    // Contested cats during a live week ≈ all non-locked, non-punted
    // cats. Yahoo's mid-week "decided" cats are still in play, so the
    // count is categories.length minus actually-locked cats only.
    const lockedHomeOrAway = catLines.filter(
      (l) => l.status === 'decided-home' || l.status === 'decided-away',
    ).length
    const contested = Math.max(0, categories.length - lockedHomeOrAway)

    // Season-strength prior — Bradley-Terry from the standings'
    // winPcts. Without this every Monday matchup reads 50/50 because
    // no cats have moved yet; with it, the #1 team is the favorite
    // over the #12 team even before the week's first pitch.
    const homeStanding = standings.find((s) => s.teamId === home.team_key)
    const awayStanding = standings.find((s) => s.teamId === away.team_key)
    const homePrior = seasonStrengthPrior(homeStanding?.winPct, awayStanding?.winPct)

    // Honest projection: per-cat probabilities weighted by current
    // direction + days into the scoring week, blended with the
    // season-strength prior so early-week reads carry real signal.
    const projection = buildProjectionFromCatLines({
      catLines,
      lowerBetterCats: lowerBetterCatIds,
      daysInWeek: daysIn,
      weekLength: 7,
      isFinal,
      homePrior,
    })

    out.push({
      id: `wk${currentWeek}-${i}`,
      homeTeamId: home.team_key,
      awayTeamId: away.team_key,
      status,
      homeCatWins,
      awayCatWins,
      ties,
      contestedCount: contested,
      catLines,
      homeWinProb: projection.homeWinProb,
      awayWinProb: projection.awayWinProb,
      homeProj: projection.homeProj,
      awayProj: projection.awayProj,
    })
  }
  return out
}

/* ─────────────────────────────────────────────────────────────────
   WEEKLY CATS-WON TALLIES (Home page chart)
─────────────────────────────────────────────────────────────────── */

function buildWeeklyCatTallies(
  rawStandings: any[],
  matchupsByWeek: Map<number, YahooCatMatchup[]>,
  categories: CategoryLeagueDataCategory[],
  catIdByStatId: Map<string, YahooCatDef>,
  isRoto: boolean,
): { weeklyCatsWon: Record<string, number[]>; weeklyLeagueAverage: number[] } {
  const weeklyCatsWon: Record<string, number[]> = {}
  for (const s of rawStandings) weeklyCatsWon[s.team_key] = []
  const weeklyLeagueAverage: number[] = []

  if (isRoto) return { weeklyCatsWon, weeklyLeagueAverage }

  const weeks = [...matchupsByWeek.keys()].sort((a, b) => a - b)
  for (const week of weeks) {
    // Default to 0 for every team this week (handles bye weeks).
    for (const s of rawStandings) weeklyCatsWon[s.team_key].push(0)

    for (const m of matchupsByWeek.get(week) ?? []) {
      if (!m.teams || m.teams.length < 2) continue
      const [a, b] = m.teams
      let aWins = 0
      let bWins = 0
      for (const sw of m.stat_winners ?? []) {
        if (!catIdByStatId.has(String(sw.stat_id))) continue
        if (sw.is_tied) continue
        if (sw.winner_team_key === a.team_key) aWins++
        else if (sw.winner_team_key === b.team_key) bWins++
      }
      weeklyCatsWon[a.team_key][weeklyCatsWon[a.team_key].length - 1] = aWins
      weeklyCatsWon[b.team_key][weeklyCatsWon[b.team_key].length - 1] = bWins
    }
    weeklyLeagueAverage.push(categories.length / 2)
  }
  return { weeklyCatsWon, weeklyLeagueAverage }
}

/* ─────────────────────────────────────────────────────────────────
   SEASON HISTORY — walks the `renew` chain
─────────────────────────────────────────────────────────────────── */

const MAX_HISTORY_DEPTH = 5

/** One connected prior season, fetched ONCE and shared by both the
 *  season-history record builder and the manager-legacy aggregator —
 *  so we never hit the same season's endpoints twice (which serialized
 *  the History load and could stall it). */
interface PriorSeasonData {
  key: string
  meta: Awaited<ReturnType<typeof yahooService.getLeagueMetadata>>
  standings: any[]
}

/** Per-prior-season fetch budget. A stuck old league (Yahoo proxy can
 *  hang on dormant leagues) must not stall the whole History page — past
 *  this, we drop that season and render with whatever resolved. */
const PRIOR_SEASON_TIMEOUT_MS = 15000

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms),
    ),
  ])
}

/** Fetch every connected prior season's metadata + standings, all in
 *  parallel and each on a timeout budget. Resilient: a season that fails
 *  or stalls is dropped, never fatal — and never blocks the whole load. */
async function fetchPriorSeasons(
  priorSeasonKeys: string[],
  currentLeagueKey: string,
): Promise<PriorSeasonData[]> {
  const keys = Array.from(
    new Set(priorSeasonKeys.filter((k) => k && k !== currentLeagueKey)),
  )
  if (keys.length === 0) return []
  const results = await Promise.all(
    keys.map(async (key): Promise<PriorSeasonData | null> => {
      try {
        const [meta, standings] = await withTimeout(
          Promise.all([
            yahooService.getLeagueMetadata(key),
            yahooService.getStandings(key),
          ]),
          PRIOR_SEASON_TIMEOUT_MS,
          `prior season ${key}`,
        )
        if (!standings || standings.length === 0) return null
        return { key, meta, standings }
      } catch (err) {
        console.warn(`[yahooAdapter] prior-season fetch dropped for ${key}:`, err)
        return null
      }
    }),
  )
  return results.filter((r): r is PriorSeasonData => r !== null)
}

/** Build one season-history record (champion / runner-up / basement,
 *  names + logos denormalized) from already-fetched standings. */
function seasonRecordFromStandings(
  meta: Awaited<ReturnType<typeof yahooService.getLeagueMetadata>>,
  standings: any[],
  currentMetadata: Awaited<ReturnType<typeof yahooService.getLeagueMetadata>>,
): CategoryLeagueDataSeasonHistory | null {
  if (!standings || standings.length === 0) return null
  // Sort by rank ascending (1 = first place).
  const sorted = [...standings].sort((a, b) => {
    const ar = a.rank ?? 999
    const br = b.rank ?? 999
    if (ar !== br) return ar - br
    return (b.wins ?? 0) - (a.wins ?? 0)
  })
  const champion = sorted[0]
  const runnerUp = sorted[1] ?? sorted[0]
  const basement = sorted[sorted.length - 1]
  if (!champion || !basement) return null

  // The fallback chain previously included `currentMetadata.season`,
  // which silently re-tagged a missing prior-year metadata record as
  // the CURRENT year — inflating Vol because the masthead's "Vol N"
  // math treats every history entry as a prior season. The current
  // year is never a "prior season" by definition, so we now drop
  // the record when we can't resolve a real prior year.
  const parsedYear = parseInt(meta.season || '', 10)
  if (!Number.isFinite(parsedYear) || parsedYear <= 0) return null
  const currentYear = parseInt(currentMetadata.season || '', 10)
  if (Number.isFinite(currentYear) && parsedYear >= currentYear) return null

  return {
    year: parsedYear,
    championTeamId: champion.team_key,
    championRecord: recordString(champion),
    runnerUpTeamId: runnerUp.team_key,
    basementTeamId: basement.team_key,
    championName: champion.name,
    championLogo: champion.logo_url || undefined,
    runnerUpName: runnerUp.name,
    basementName: basement.name,
  }
}

async function buildSeasonHistory(
  currentMetadata: Awaited<ReturnType<typeof yahooService.getLeagueMetadata>>,
  currentLeagueKey: string,
  priorSeasons: PriorSeasonData[],
  hasPriorKeys: boolean,
): Promise<CategoryLeagueDataSeasonHistory[]> {
  const out: CategoryLeagueDataSeasonHistory[] = []

  if (hasPriorKeys) {
    // Preferred: the user's connected prior-season leagues, already
    // fetched in parallel. Works even when Yahoo's renew chain is empty
    // (the common case — Yahoo mints a fresh league each year).
    for (const ps of priorSeasons) {
      const rec = seasonRecordFromStandings(ps.meta, ps.standings, currentMetadata)
      if (rec) out.push(rec)
    }
  } else {
    // Fallback: walk the `renew` chain (only when each season was
    // renewed from the prior one in Yahoo). Rare; fetches inline.
    const seen = new Set<string>([currentLeagueKey])
    let renew = currentMetadata.renew
    let depth = 0
    while (renew && renew.includes('_') && depth < MAX_HISTORY_DEPTH) {
      const [gameKey, leagueId] = renew.split('_')
      const prevKey = `${gameKey}.l.${leagueId}`
      if (seen.has(prevKey)) break
      seen.add(prevKey)
      let prevMeta: Awaited<ReturnType<typeof yahooService.getLeagueMetadata>>
      let standings: any[]
      try {
        prevMeta = await yahooService.getLeagueMetadata(prevKey)
        standings = await yahooService.getStandings(prevKey)
      } catch (err) {
        console.warn(`[yahooAdapter] history walk stopped at ${prevKey}:`, err)
        break
      }
      const rec = seasonRecordFromStandings(prevMeta, standings, currentMetadata)
      if (!rec) break
      out.push(rec)
      renew = prevMeta.renew
      depth++
    }
  }

  // Newest → oldest for display.
  out.sort((a, b) => b.year - a.year)
  return out
}

function recordString(s: any): string {
  const w = parseInt(s?.wins ?? '0', 10) || 0
  const l = parseInt(s?.losses ?? '0', 10) || 0
  const t = parseInt(s?.ties ?? '0', 10) || 0
  return t > 0 ? `${w}-${l}-${t}` : `${w}-${l}`
}

/* ─────────────────────────────────────────────────────────────────
   TEAM CAREER STATS
─────────────────────────────────────────────────────────────────── */

function buildTeamCareerStats(
  rawStandings: any[],
  standings: CategoryLeagueDataStanding[],
  seasonHistory: CategoryLeagueDataSeasonHistory[],
  categories: CategoryLeagueDataCategory[],
): Record<string, CategoryLeagueDataTeamCareerStats> {
  const out: Record<string, CategoryLeagueDataTeamCareerStats> = {}
  const titlesByTeam = new Map<string, number>()
  const playoffsByTeam = new Map<string, number>()
  for (const s of seasonHistory) {
    titlesByTeam.set(s.championTeamId, (titlesByTeam.get(s.championTeamId) ?? 0) + 1)
    playoffsByTeam.set(s.championTeamId, (playoffsByTeam.get(s.championTeamId) ?? 0) + 1)
    playoffsByTeam.set(s.runnerUpTeamId, (playoffsByTeam.get(s.runnerUpTeamId) ?? 0) + 1)
  }
  const hitCats = categories.filter((c) => c.side === 'hit').length
  const pitCats = categories.filter((c) => c.side === 'pit').length
  const hitRatio = hitCats + pitCats > 0 ? hitCats / (hitCats + pitCats) : 0.5

  for (const raw of rawStandings) {
    const teamId = raw.team_key
    const s = standings.find((x) => x.teamId === teamId)
    const seasonsPlayed = 1 + seasonHistory.length
    const catWins = s?.catWins ?? 0
    const catLosses = s?.catLosses ?? 0
    const catTies = s?.catTies ?? 0

    // Extrapolate prior seasons by 0.9x of the current season's pace.
    const priorFactor = seasonHistory.length
    const totalCatWins = catWins * (1 + priorFactor * 0.9)
    const totalCatLosses = catLosses * (1 + priorFactor * 0.9)
    const totalCatTies = catTies * (1 + priorFactor * 0.9)
    const denom = totalCatWins + totalCatLosses + totalCatTies
    const careerWinPct = denom > 0 ? (totalCatWins + totalCatTies * 0.5) / denom : 0

    out[teamId] = {
      teamId,
      seasonsPlayed,
      titles: titlesByTeam.get(teamId) ?? 0,
      playoffApps: playoffsByTeam.get(teamId) ?? 0,
      totalCatWins: Math.round(totalCatWins),
      totalCatLosses: Math.round(totalCatLosses),
      totalCatTies: Math.round(totalCatTies),
      careerWinPct,
      hitCatsWon: Math.round(totalCatWins * hitRatio),
      pitchCatsWon: Math.round(totalCatWins * (1 - hitRatio)),
      catDifferential: Math.round(totalCatWins - totalCatLosses),
    }
  }
  return out
}

/* ─────────────────────────────────────────────────────────────────
   ALL-TIME MANAGER LEGACY (real cross-season aggregation)

   Yahoo mints a new team_key every season, so career stats can't key on
   the team — they key on the *manager guid*, which is stable year to
   year. We fetch each connected season's standings once and fold them
   together: titles + runner-ups + playoff berths from completed seasons,
   cat W/L/T summed across every season (including the live one to date).
   The current in-progress season contributes cats but not honors (no
   title for a season nobody has won yet).
─────────────────────────────────────────────────────────────────── */

function buildManagerLegacy(
  currentMetadata: Awaited<ReturnType<typeof yahooService.getLeagueMetadata>>,
  currentRawStandings: any[],
  teamList: CategoryLeagueDataTeam[],
  playoffCutoff: number,
  myGuid: string | null,
  priorSeasons: PriorSeasonData[],
): CategoryLeagueDataManagerLegacy[] {
  const currentYear =
    parseInt(currentMetadata.season || '', 10) || new Date().getFullYear()

  type SeasonStd = { year: number; completed: boolean; rows: any[] }
  const seasons: SeasonStd[] = [
    { year: currentYear, completed: false, rows: currentRawStandings },
  ]

  // Fold in every connected prior season (already fetched once, shared
  // with buildSeasonHistory — no extra round-trips here). A season older
  // than the current one is decided, so its rank-1 is a real champion;
  // the current season is still live and contributes cats but no honors.
  for (const ps of priorSeasons) {
    const y = parseInt(ps.meta.season || '', 10) || 0
    seasons.push({ year: y, completed: y > 0 && y < currentYear, rows: ps.standings })
  }

  type Acc = {
    guid: string
    name: string
    logo?: string
    latestYear: number
    seasonsPlayed: number
    titles: number
    runnerUps: number
    playoffApps: number
    catW: number
    catL: number
    catT: number
    isMe: boolean
    seasons: ManagerSeasonPoint[]
  }
  const byGuid = new Map<string, Acc>()
  for (const s of seasons) {
    for (const row of s.rows) {
      const guid: string =
        (typeof row.manager_guid === 'string' && row.manager_guid) || row.team_key
      if (!guid) continue
      let acc = byGuid.get(guid)
      if (!acc) {
        acc = {
          guid,
          name: row.name || 'Manager',
          logo: row.logo_url || undefined,
          latestYear: s.year,
          seasonsPlayed: 0,
          titles: 0,
          runnerUps: 0,
          playoffApps: 0,
          catW: 0,
          catL: 0,
          catT: 0,
          isMe: !!myGuid && guid === myGuid,
          seasons: [],
        }
        byGuid.set(guid, acc)
      }
      // Teams get renamed across seasons — the most recent name wins.
      if (s.year >= acc.latestYear) {
        acc.latestYear = s.year
        if (row.name) acc.name = row.name
        if (row.logo_url) acc.logo = row.logo_url
      }
      const w = Number(row.wins) || 0
      const l = Number(row.losses) || 0
      const t = Number(row.ties) || 0
      const rank = Number(row.rank) || 999
      acc.seasonsPlayed++
      acc.catW += w
      acc.catL += l
      acc.catT += t
      acc.seasons.push({
        year: s.year,
        completed: s.completed,
        rank,
        catWins: w,
        catLosses: l,
        catTies: t,
      })
      if (s.completed) {
        if (rank === 1) acc.titles++
        else if (rank === 2) acc.runnerUps++
        if (rank <= playoffCutoff) acc.playoffApps++
      }
    }
  }

  // Map manager guid → current-season team id + color, so still-active
  // managers stay click-through-able and reuse their live avatar color.
  const currentTeamByGuid = new Map<string, string>()
  for (const row of currentRawStandings) {
    if (typeof row.manager_guid === 'string' && row.manager_guid) {
      currentTeamByGuid.set(row.manager_guid, row.team_key)
    }
  }
  const colorByTeamId = new Map(teamList.map((t) => [t.id, t.avatarColor]))

  const out: CategoryLeagueDataManagerLegacy[] = []
  for (const acc of byGuid.values()) {
    const denom = acc.catW + acc.catL + acc.catT
    const careerWinPct = denom > 0 ? (acc.catW + acc.catT * 0.5) / denom : 0
    const teamId = currentTeamByGuid.get(acc.guid)
    // "Me" detection: reuse the team list's (which already combines
    // Yahoo's is_current_login with the signed-in guid), falling back to
    // a direct guid match for managers no longer in the current season.
    const activeTeam = teamId ? teamList.find((t) => t.id === teamId) : undefined
    out.push({
      managerGuid: acc.guid,
      teamId,
      name: acc.name,
      logoUrl: acc.logo,
      avatarColor:
        (teamId && colorByTeamId.get(teamId)) ||
        teamColorHash(`${acc.guid}:${acc.name}`),
      ownerInitials: initialsOf(acc.name),
      isMyTeam: activeTeam?.isMyTeam || acc.isMe,
      seasonsPlayed: acc.seasonsPlayed,
      titles: acc.titles,
      runnerUps: acc.runnerUps,
      playoffApps: acc.playoffApps,
      totalCatWins: acc.catW,
      totalCatLosses: acc.catL,
      totalCatTies: acc.catT,
      careerWinPct,
      legacyScore: computeLegacyScore({
        titles: acc.titles,
        playoffApps: acc.playoffApps,
        careerWinPct,
        totalCatWins: acc.catW,
      }),
      seasons: acc.seasons.sort((a, b) => a.year - b.year),
      rank: 0,
    })
  }
  out.sort(
    (a, b) =>
      b.legacyScore - a.legacyScore ||
      b.titles - a.titles ||
      b.totalCatWins - a.totalCatWins,
  )
  out.forEach((e, i) => (e.rank = i + 1))
  return out
}

/* ─────────────────────────────────────────────────────────────────
   H2H MATRIX (current season only)
─────────────────────────────────────────────────────────────────── */

function buildH2HMatrix(
  rawStandings: any[],
  matchupsByWeek: Map<number, YahooCatMatchup[]>,
): CategoryLeagueDataH2HEntry[] {
  const pairKey = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`)
  const records = new Map<
    string,
    { wins: number; losses: number; ties: number; meetings: number; catDiff: number }
  >()
  const valid = new Set(rawStandings.map((s) => s.team_key))

  for (const matchups of matchupsByWeek.values()) {
    for (const m of matchups) {
      if (!m.teams || m.teams.length < 2) continue
      const [a, b] = m.teams
      if (!valid.has(a.team_key) || !valid.has(b.team_key)) continue
      const teamA = a.team_key < b.team_key ? a.team_key : b.team_key
      const teamB = a.team_key < b.team_key ? b.team_key : a.team_key
      const aIsTeamA = a.team_key === teamA
      const key = pairKey(teamA, teamB)
      const rec = records.get(key) ?? {
        wins: 0, losses: 0, ties: 0, meetings: 0, catDiff: 0,
      }
      rec.meetings++

      // Per-cat differential — proxies cat strength head-to-head.
      for (const sw of m.stat_winners ?? []) {
        if (sw.is_tied) continue
        if (sw.winner_team_key === teamA) rec.catDiff++
        else if (sw.winner_team_key === teamB) rec.catDiff--
      }

      if (m.is_tied) {
        rec.ties++
      } else if (m.winner_team_key === a.team_key) {
        if (aIsTeamA) rec.wins++
        else rec.losses++
      } else if (m.winner_team_key === b.team_key) {
        if (aIsTeamA) rec.losses++
        else rec.wins++
      }
      records.set(key, rec)
    }
  }

  const out: CategoryLeagueDataH2HEntry[] = []
  for (const [key, rec] of records) {
    const [teamA, teamB] = key.split('|')
    out.push({
      teamA,
      teamB,
      recordA:
        rec.ties > 0
          ? `${rec.wins}-${rec.losses}-${rec.ties}`
          : `${rec.wins}-${rec.losses}`,
      catDiffA: rec.catDiff,
      meetings: rec.meetings,
    })
  }
  return out
}

/* ─────────────────────────────────────────────────────────────────
   DRAFT
─────────────────────────────────────────────────────────────────── */

async function buildDraft(
  leagueKey: string,
  currentSeason: number,
): Promise<CategoryLeagueDataDraft | undefined> {
  let draftRaw: { picks?: any[]; type?: string; renew?: string } | null
  try {
    draftRaw = await yahooService.getDraftResults(leagueKey)
  } catch {
    return undefined
  }
  if (!draftRaw || !Array.isArray(draftRaw.picks) || draftRaw.picks.length === 0) {
    return undefined
  }

  // Fetch player metadata in chunks (the service handles batching).
  const playerKeys = draftRaw.picks.map((p: any) => p.player_key).filter(Boolean)
  let playerMap = new Map<string, any>()
  try {
    playerMap = await yahooService.getPlayers(playerKeys, leagueKey)
  } catch (err) {
    console.warn('[yahooAdapter] failed to enrich draft picks with player names:', err)
  }

  const picks: CategoryLeagueDataDraftPick[] = draftRaw.picks.map((raw: any) => {
    const meta = playerMap.get(raw.player_key)
    return {
      pickOverall: parseInt(raw.pick ?? '0', 10) || 0,
      round: parseInt(raw.round ?? '0', 10) || 0,
      playerId: String(raw.player_key ?? ''),
      playerName: meta?.name || `Player ${raw.player_key}`,
      position: String(meta?.position ?? ''),
      mlbTeam: String(meta?.team ?? ''),
      draftedByTeamId: String(raw.team_key ?? ''),
    }
  })

  return {
    year: currentSeason,
    totalPicks: picks.length,
    picks,
  }
}

/* ─────────────────────────────────────────────────────────────────
   YAHOO PLAYER NIGHTS + INJURY REPORTS

   Yahoo doesn't bundle rosters with the league fetch — we have to
   pull each team's roster individually. N+1 endpoint hits per
   league refresh, but parallelized via Promise.all so the wall
   time is ~one roster-fetch RTT (~500ms) for 10-12 team leagues.

   Names come from Yahoo's player records via the roster fetch;
   we don't have Yahoo→MLB id mapping built so we fall back to
   normalized-name matching against MLB Stats API output.
───────────────────────────────────────────────────────────────── */

/**
 * Single pass over every team's roster — returns the name index
 * (for player-night ownership matching) AND the viewer's bench set
 * (for bench-bad-beat detection) in one parallel fetch. Avoids
 * hitting Yahoo's roster endpoint N times for each downstream
 * consumer.
 */
async function fetchYahooRostersOnce(
  rawStandings: any[],
  myTeamKey: string | undefined,
): Promise<{
  rosterByName: Map<string, string[]>
  myBenchedPlayers: Set<string> | undefined
}> {
  const teamKeys: string[] = rawStandings
    .map((s: any) => s.team_key)
    .filter((k: any): k is string => typeof k === 'string')

  // Fetch every team's roster in parallel. Tolerate per-team failures
  // (one bad fetch shouldn't kill the whole index).
  const rosters = await Promise.all(
    teamKeys.map((teamKey) =>
      yahooService.getRoster(teamKey)
        .then((players) => ({ teamKey, players }))
        .catch(() => ({ teamKey, players: [] })),
    ),
  )

  const rosterByName = new Map<string, string[]>()
  let myBenchedPlayers: Set<string> | undefined = myTeamKey ? new Set() : undefined

  // Yahoo bench slot codes: "BN" = bench, "IL" = injured list, "NA" =
  // not-active minors slot. Everything else is a positional starter.
  const BENCH_CODES = new Set(['BN', 'IL', 'NA'])

  for (const { teamKey, players } of rosters) {
    const isMyTeam = teamKey === myTeamKey
    for (const p of players) {
      const name = p.name?.full
      if (!name) continue
      const key = normalizeName(name)
      const existing = rosterByName.get(key)
      if (existing) existing.push(teamKey)
      else rosterByName.set(key, [teamKey])

      if (isMyTeam && myBenchedPlayers && p.selected_position && BENCH_CODES.has(p.selected_position)) {
        myBenchedPlayers.add(key)
      }
    }
  }

  // If the viewer's team key wasn't in any roster (orphan), return undefined.
  if (myBenchedPlayers && myBenchedPlayers.size === 0) {
    myBenchedPlayers = undefined
  }

  return { rosterByName, myBenchedPlayers }
}

/* ─────────────────────────────────────────────────────────────────
   UTILS
─────────────────────────────────────────────────────────────────── */

function clampWeek(n: number): number {
  if (!Number.isFinite(n) || n < 1) return 1
  if (n > 30) return 30
  return Math.floor(n)
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '??'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}
