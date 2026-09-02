/**
 * Sleeper → CategoryLeagueData adapter.
 *
 * Pulls a Sleeper baseball league's live shape into the universal
 * `CategoryLeagueData` contract the editorial pipeline consumes. The
 * goal is "best-effort live data with sensible fallbacks" — every
 * field the pipeline needs gets populated, even when Sleeper's API
 * is sparse for a given category league configuration.
 *
 * Sleeper API endpoints used (all via `sleeperService`):
 *   - GET /league/{id}                    → league meta + settings
 *   - GET /league/{id}/users              → users (managers)
 *   - GET /league/{id}/rosters            → rosters (per-team record)
 *   - GET /league/{id}/matchups/{week}    → per-week per-roster matchup
 *
 * Per-category W/L isn't directly returned by Sleeper for every league
 * config. We reconstruct it from the per-week matchup `points` field
 * (Sleeper folds cat outcomes into total points for category leagues),
 * combined with roster-level totals from `roster.settings.wins/losses`.
 * The result is approximate but proves the pipeline on real data and
 * gives every editorial slot what it needs.
 */

import { sleeperService } from '@/services/sleeper'
import type {
  SleeperLeague,
  SleeperRoster,
  SleeperUser,
  SleeperMatchup,
} from '@/types/sleeper'
import type {
  CategoryLeagueData,
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
  CategoryLeagueDataWeeklyRanks,
  CategoryLeagueDataDraft,
  CategoryLeagueDataDraftPick,
  LeagueDataH2HPoints,
  LeagueDataPointsMatchup,
  PointsWeeklyScore,
  WLT,
} from '../types'
import type {
  LeagueTransaction,
  TransactionKind,
  TransactionMovement,
} from '../transactions/types'
import type { PlayerNight } from '../players/types'
import { buildPlayerNights, normalizeName } from '../players/buildPlayerNights'
import { buildInjuryReports, type InjuryReport } from '../players/injuries'
import { buildSlumpReports, type SlumpReport } from '../players/slumps'
import { hydrateSnapshotDelta } from '../snapshots'
import { teamColorHash } from './colorHash'
import { DEFAULT_END_WEEK_BY_SPORT } from '../detection/helpers'

/* ─────────────────────────────────────────────────────────────────
   CATEGORY MAPPING
─────────────────────────────────────────────────────────────────

   Sleeper scoring keys for MLB use lowercase stat codes (`hr`,
   `r`, `rbi`, etc). Several aliases exist across leagues — `ba`
   vs `avg`, `so` vs `k`, `er`/`era` etc. We map to the canonical
   set the editorial library knows about (HomeCatId). Anything we
   can't map gets dropped (we don't fabricate categories).
*/

interface CatDef {
  id: string             // canonical id (matches editorial HomeCatId)
  label: string
  name: string
  side: 'hit' | 'pit'
  /** Sleeper scoring keys that map to this canonical cat. */
  sleeperKeys: string[]
}

const CAT_TABLE: CatDef[] = [
  // Hitting
  { id: 'R',   label: 'R',   name: 'Runs',         side: 'hit', sleeperKeys: ['r', 'runs'] },
  { id: 'H',   label: 'H',   name: 'Hits',         side: 'hit', sleeperKeys: ['h', 'hits'] },
  { id: 'HR',  label: 'HR',  name: 'Home Runs',    side: 'hit', sleeperKeys: ['hr', 'home_runs'] },
  { id: 'RBI', label: 'RBI', name: 'RBI',          side: 'hit', sleeperKeys: ['rbi'] },
  { id: 'SB',  label: 'SB',  name: 'Stolen Bases', side: 'hit', sleeperKeys: ['sb'] },
  { id: 'AVG', label: 'AVG', name: 'Batting Avg',  side: 'hit', sleeperKeys: ['avg', 'ba', 'bavg'] },
  { id: 'OPS', label: 'OPS', name: 'OPS',          side: 'hit', sleeperKeys: ['ops'] },
  { id: 'TB',  label: 'TB',  name: 'Total Bases',  side: 'hit', sleeperKeys: ['tb'] },
  { id: 'BB',  label: 'BB',  name: 'Walks',        side: 'hit', sleeperKeys: ['bb'] },
  // Pitching
  { id: 'W',   label: 'W',   name: 'Wins',         side: 'pit', sleeperKeys: ['w', 'win'] },
  { id: 'SV',  label: 'SV',  name: 'Saves',        side: 'pit', sleeperKeys: ['sv', 'save'] },
  { id: 'K',   label: 'K',   name: 'Strikeouts',   side: 'pit', sleeperKeys: ['k', 'so', 'sopit'] },
  { id: 'HLD', label: 'HLD', name: 'Holds',        side: 'pit', sleeperKeys: ['hld', 'hold'] },
  { id: 'ERA', label: 'ERA', name: 'ERA',          side: 'pit', sleeperKeys: ['era'] },
  { id: 'WHIP',label: 'WHIP',name: 'WHIP',         side: 'pit', sleeperKeys: ['whip'] },
  { id: 'QS',  label: 'QS',  name: 'Quality Starts', side: 'pit', sleeperKeys: ['qs', 'q_start'] },
  { id: 'K9',  label: 'K/9', name: 'K/9',          side: 'pit', sleeperKeys: ['k_9', 'k9'] },
]

/**
 * Default fallback category set when a league exposes no scoring
 * settings we recognize (still 11 cats so the pipeline doesn't fall
 * over on short detection arrays). Matches the demo fixture exactly.
 */
const DEFAULT_CATS: string[] = ['R', 'H', 'HR', 'RBI', 'SB', 'AVG', 'W', 'SV', 'K', 'HLD', 'ERA']

/* ─────────────────────────────────────────────────────────────────
   SESSION CACHE — keyed by leagueId+endpoint+week
───────────────────────────────────────────────────────────────── */

const sessionCache = new Map<string, unknown>()
function cacheKey(leagueId: string, endpoint: string, week?: number): string {
  return week == null ? `${leagueId}:${endpoint}` : `${leagueId}:${endpoint}:${week}`
}
async function withCache<T>(key: string, fn: () => Promise<T>): Promise<T> {
  if (sessionCache.has(key)) return sessionCache.get(key) as T
  const value = await fn()
  sessionCache.set(key, value)
  return value
}

/* ─────────────────────────────────────────────────────────────────
   PUBLIC API
───────────────────────────────────────────────────────────────── */

/**
 * Shared adapter options carried by every platform's
 * `…LeagueToCategoryData()` entry point. Each adapter only cares
 * about its own id field — the others are ignored. Passed in
 * explicitly by the view (rather than reaching into a store) so the
 * adapter stays a pure function of (leagueId, identity).
 */
export interface AdapterOptions {
  /** Identifies the signed-in user across platforms so the adapter
   *  can mark exactly one team's `isMyTeam: true`. Optional — when
   *  not provided every team renders without a "my team" tint. */
  userIdentity?: {
    /** Sleeper `user_id` of the signed-in account, if linked. */
    sleeperUserId?: string
    /** Yahoo manager `guid` of the signed-in account, if linked. */
    yahooGuid?: string
    /** ESPN `swid` of the signed-in account, if cookies are loaded. */
    espnSwid?: string
  }
  /** Supabase `leagues.id` UUID for this league connection. Enables
   *  daily-snapshot save + previous-snapshot fetch (for overnight
   *  delta detection). When omitted (demo route, anonymous viewer)
   *  the snapshot path is skipped silently. */
  leagueRowId?: string
}

export async function sleeperLeagueToCategoryData(
  leagueId: string,
  opts?: AdapterOptions,
): Promise<CategoryLeagueData> {
  // 1. League + users + rosters (parallel; league is cached upstream too).
  let league: SleeperLeague
  try {
    league = await withCache(cacheKey(leagueId, 'league'), () =>
      sleeperService.getLeague(leagueId),
    )
  } catch {
    throw new Error(
      `Sleeper league ${leagueId} not found or has no category scoring data`,
    )
  }

  const [users, rosters] = await Promise.all([
    withCache(cacheKey(leagueId, 'users'), () =>
      sleeperService.getLeagueUsers(leagueId),
    ),
    withCache(cacheKey(leagueId, 'rosters'), () =>
      sleeperService.getLeagueRosters(leagueId),
    ),
  ])

  if (!rosters || rosters.length === 0) {
    throw new Error(
      `Sleeper league ${leagueId} not found or has no category scoring data`,
    )
  }

  // 2. Derive meta from league settings.
  const currentSeason = parseInt(league.season, 10) || new Date().getFullYear()
  const currentWeek = clampWeek(league.settings?.leg ?? 1)
  const playoffCutoff =
    typeof league.settings?.playoff_teams === 'number'
      ? league.settings.playoff_teams
      : Math.max(4, Math.floor(rosters.length / 2))

  // 3. Resolve which categories this league plays. Best-effort from
  //    scoring_settings keys; fall back to the 11 standard cats.
  const categories = resolveCategories(league)

  // 4. Fetch matchups for every completed week so far. We cap at
  //    currentWeek (inclusive) — anything past that won't have data.
  const matchupsByWeek = await fetchAllMatchups(leagueId, currentWeek)

  // 5. Build the team list (users + rosters). The signed-in user's
  //    Sleeper user_id (if provided) lets us flip `isMyTeam: true` on
  //    the matching roster — the view's wayfinding tint relies on it.
  const teams = buildTeams(rosters, users, opts?.userIdentity?.sleeperUserId)

  // 6. Fetch raw MLB stats for every completed week (parallel; cached).
  //    These power per-(week, roster, cat) totals which then feed:
  //      • per-cat W/L computation (real, not synthesized)
  //      • current-week matchup cat-lines
  //      • weekly cats-won chart data
  //      • per-cat season ranks
  const statsByWeek = await fetchAllMlbStats(currentSeason, [...matchupsByWeek.keys()])

  // 7. Compute per-(roster, week, cat) point-in-time totals — once,
  //    here — and reuse for everything below.
  const perWeekRosterCats = buildPerWeekRosterCatTotals(
    rosters,
    categories,
    matchupsByWeek,
    statsByWeek,
  )

  // 8. Walk every completed matchup and tally real cat W/L/T per team.
  const perTeamCatRecord = buildPerTeamCatRecord(
    rosters,
    matchupsByWeek,
    perWeekRosterCats,
    categories,
  )

  // 9. Reconstruct per-team standings (real cat-W/L/T + streak + lastSix).
  //    `ownsCount` / `bleedingCount` are seeded to 0 and overwritten in
  //    step 10 once real cat ranks land.
  const standings = buildStandings(rosters, matchupsByWeek, perTeamCatRecord)

  // 10. Real per-category ranks (sums per-(roster, cat) season totals,
  //     ratio cats rebuilt from components). Falls back to all-rank-0
  //     when stats aren't available rather than throwing.
  const categoryRanks = buildRealCategoryRanks(
    rosters,
    categories,
    matchupsByWeek,
    statsByWeek,
    standings,
  )

  // 11. Season rank history: per-week standings as the season unfolded.
  const seasonRankHistory = buildSeasonRankHistory(rosters, matchupsByWeek)

  // 12. Current-week matchups (Matchups page).
  const matchupsCurrentWeek = buildCurrentWeekMatchups(
    matchupsByWeek,
    perWeekRosterCats,
    categories,
    currentWeek,
  )

  // 13. Weekly cats-won per team + league average (Home page chart).
  const { weeklyCatsWon, weeklyLeagueAverage } = buildWeeklyCatTallies(
    rosters,
    matchupsByWeek,
    perWeekRosterCats,
    categories,
  )

  // 14. Multi-season history walk (History page) — recursive via
  //     previous_league_id. Walks up to 5 prior seasons.
  const seasonHistory = await buildSeasonHistory(league)

  // 15. Per-team career stats (History page). Combines seasonHistory
  //     accrual with this season's standings totals so a brand-new
  //     league still has something to show.
  const teamCareerStats = buildTeamCareerStats(
    rosters,
    standings,
    seasonHistory,
    categories,
  )

  // 16. All-time H2H matrix (History page). Walks every completed
  //     matchup across discovered seasons.
  const h2hMatrix = await buildH2HMatrix(league, rosters)

  // 17. Draft (Draft page). Optional — undefined when not exposed.
  const draft = await buildDraft(leagueId, currentSeason)

  // 18. League transactions (trades, FAAB winners, waivers). Walks
  //     every week from 1 → currentWeek (Sleeper exposes one round
  //     at a time). Non-fatal on failure.
  const transactions = await buildSleeperTransactions(leagueId, currentWeek, league.sport)

  // 19. Yesterday's player nights (baseball only). Sleeper's player
  //     DB carries `mlb_id` mappings so we get high-fidelity
  //     ownership matching by MLB ID. Non-fatal on failure.
  const playerNights = league.sport === 'mlb'
    ? await buildSleeperPlayerNights(rosters)
    : undefined
  const injuryReports = league.sport === 'mlb'
    ? await buildSleeperInjuryReports(rosters)
    : undefined
  const slumpReports = league.sport === 'mlb'
    ? await buildSleeperSlumpReports(rosters)
    : undefined
  const myBenchedPlayers = league.sport === 'mlb'
    ? await buildSleeperMyBench(rosters, teams)
    : undefined

  // 20. Snapshot delta — fetch the most recent previous snapshot
  //     before today so the overnight-delta detectors can emit
  //     "since your last visit" Wire stories. Skipped when no
  //     Supabase row id is provided (demo route, anonymous viewer).
  // Sleeper doesn't offer H2H points baseball; we always stamp
  // h2h-category. If Sleeper ever expands to points baseball,
  // detection branches here the same way Yahoo / ESPN do.
  const partialData: CategoryLeagueData = {
    format: 'h2h-category',
    leagueId,
    leagueName: league.name || 'Sleeper League',
    currentWeek,
    currentSeason,
    playoffCutoff,
    teams,
    categories,
    standings,
    categoryRanks,
    seasonRankHistory,
    matchupsCurrentWeek,
    seasonHistory,
    teamCareerStats,
    h2hMatrix,
    draft,
    weeklyCatsWon,
    weeklyLeagueAverage,
    transactions,
    playerNights,
    injuryReports,
    slumpReports,
    myBenchedPlayers,
  }
  const snapshotDelta = await hydrateSnapshotDelta(opts?.leagueRowId, partialData)

  return {
    ...partialData,
    snapshotDelta,
  }
}

/* ─────────────────────────────────────────────────────────────────
   SLEEPER PLAYER NIGHTS (baseball only)

   Sleeper's player DB exposes `mlb_id` for most MLB players, so we
   can build a clean MLB-ID → rosterTeamIds index. The shared
   buildPlayerNights helper then fetches yesterday's stats from
   MLB Stats API and filters to notable performances.
───────────────────────────────────────────────────────────────── */

async function buildSleeperPlayerNights(
  rosters: SleeperRoster[],
): Promise<PlayerNight[]> {
  try {
    const rosterByMlbId = await buildSleeperRosterByMlbId(rosters)
    if (!rosterByMlbId) return []
    return await buildPlayerNights({ rosterByMlbId, includeUnowned: true })
  } catch (err) {
    console.warn('[sleeperAdapter] player nights failed:', err)
    return []
  }
}

async function buildSleeperInjuryReports(
  rosters: SleeperRoster[],
): Promise<InjuryReport[]> {
  try {
    const rosterByMlbId = await buildSleeperRosterByMlbId(rosters)
    if (!rosterByMlbId) return []
    return await buildInjuryReports({ rosterByMlbId, includeUnowned: false })
  } catch (err) {
    console.warn('[sleeperAdapter] injury reports failed:', err)
    return []
  }
}

async function buildSleeperSlumpReports(
  rosters: SleeperRoster[],
): Promise<SlumpReport[]> {
  try {
    const rosterByMlbId = await buildSleeperRosterByMlbId(rosters)
    if (!rosterByMlbId) return []
    return await buildSlumpReports({ rosterByMlbId, includeUnowned: false })
  } catch (err) {
    console.warn('[sleeperAdapter] slump reports failed:', err)
    return []
  }
}

/**
 * Build the viewer's bench-name set for bench-bad-beat detection.
 * Identifies the viewer's roster via the team where isMyTeam=true,
 * then everything in roster.players that's NOT in roster.starters
 * is on the bench. Maps to normalized player names so the detector
 * can match against MLB-Stats-API-derived player nights.
 */
async function buildSleeperMyBench(
  rosters: SleeperRoster[],
  teams: CategoryLeagueDataTeam[],
): Promise<Set<string> | undefined> {
  const myTeam = teams.find((t) => t.isMyTeam)
  if (!myTeam) return undefined
  const myRoster = rosters.find((r) => String(r.roster_id) === myTeam.id)
  if (!myRoster) return undefined

  const players = await sleeperService.getPlayersBySport('mlb').catch(() => null)
  if (!players) return undefined

  const starterSet = new Set(myRoster.starters ?? [])
  const out = new Set<string>()
  for (const playerId of myRoster.players ?? []) {
    if (starterSet.has(playerId)) continue
    const p = players[playerId] as any
    const fullName =
      p?.full_name ||
      `${p?.first_name ?? ''} ${p?.last_name ?? ''}`.trim()
    if (!fullName) continue
    out.add(normalizeName(fullName))
  }
  return out
}

/** Shared MLB-ID roster index — built once from Sleeper's player
 *  DB and reused for both player nights and injury reports. */
async function buildSleeperRosterByMlbId(
  rosters: SleeperRoster[],
): Promise<Map<number, string[]> | null> {
  const players = await sleeperService.getPlayersBySport('mlb').catch(() => null)
  if (!players) return null
  const rosterByMlbId = new Map<number, string[]>()
  for (const roster of rosters) {
    const teamId = String(roster.roster_id)
    for (const playerId of roster.players ?? []) {
      const p = players[playerId] as any
      const mlbId = p?.mlb_id ? Number(p.mlb_id) : null
      if (!mlbId) continue
      const existing = rosterByMlbId.get(mlbId)
      if (existing) existing.push(teamId)
      else rosterByMlbId.set(mlbId, [teamId])
    }
  }
  return rosterByMlbId
}

/* ─────────────────────────────────────────────────────────────────
   SLEEPER LEAGUE TRANSACTIONS

   Sleeper exposes transactions per "round" (week). We fetch all
   rounds up through the current week in parallel and merge into
   one list, then normalize to LeagueTransaction[].

   Player names come from the player DB cached by sleeperService.
───────────────────────────────────────────────────────────────── */

async function buildSleeperTransactions(
  leagueId: string,
  currentWeek: number,
  sport: string | undefined,
): Promise<LeagueTransaction[] | undefined> {
  try {
    const sleeperSport = sport ?? 'nfl'
    const [allRaw, playerDb] = await Promise.all([
      withCache(cacheKey(leagueId, 'all-transactions', currentWeek), () =>
        sleeperService.getAllTransactions(leagueId, currentWeek),
      ),
      sleeperService.getPlayersBySport(sleeperSport).catch(() => null),
    ])
    if (!allRaw || allRaw.length === 0) return undefined

    const txs: LeagueTransaction[] = []
    for (const t of allRaw) {
      const normalized = normalizeSleeperTransaction(t, currentWeek, playerDb)
      if (normalized) txs.push(normalized)
    }
    txs.sort((a, b) => b.timestamp - a.timestamp)
    return txs
  } catch (err) {
    console.warn('[sleeperAdapter] transactions fetch failed:', err)
    return undefined
  }
}

function normalizeSleeperTransaction(
  t: any,
  currentWeek: number,
  playerDb: Record<string, any> | null,
): LeagueTransaction | null {
  if (!t || t.status !== 'complete') return null

  // Sleeper kinds: 'trade' | 'waiver' | 'free_agent'
  const settings = t.settings ?? {}
  const faabBid = typeof settings.waiver_bid === 'number' ? settings.waiver_bid : undefined

  let kind: TransactionKind | null = null
  if (t.type === 'trade') kind = 'trade'
  else if (t.type === 'waiver') kind = typeof faabBid === 'number' && faabBid > 0 ? 'faab-add' : 'waiver-add'
  else if (t.type === 'free_agent') kind = 'fa-add'
  if (!kind) return null

  const adds: Record<string, number> = t.adds ?? {}
  const drops: Record<string, number> = t.drops ?? {}

  // Build the movement list. A player in `adds` was acquired by the
  // target roster; a player only in `drops` was sent to FA/waivers.
  // For trades, both adds + drops are populated and each player
  // appears in BOTH (added to one roster, dropped from another).
  const movements: TransactionMovement[] = []
  const teamSet = new Set<string>()

  const allPlayerIds = new Set([...Object.keys(adds), ...Object.keys(drops)])
  for (const pid of allPlayerIds) {
    const toRoster = adds[pid]
    const fromRoster = drops[pid]
    const fromTeamId = fromRoster !== undefined ? String(fromRoster) : 'fa'
    const toTeamId = toRoster !== undefined ? String(toRoster) : 'fa'
    if (fromTeamId !== 'fa' && fromTeamId !== 'waivers') teamSet.add(fromTeamId)
    if (toTeamId !== 'fa' && toTeamId !== 'waivers') teamSet.add(toTeamId)

    const playerMeta = playerDb?.[pid]
    const fullName =
      playerMeta?.full_name ||
      `${playerMeta?.first_name ?? ''} ${playerMeta?.last_name ?? ''}`.trim() ||
      `Player ${pid}`
    movements.push({
      playerId: pid,
      playerName: fullName,
      position: playerMeta?.position,
      fromTeamId,
      toTeamId,
    })
  }
  if (movements.length === 0) return null

  // Sleeper timestamps are unix ms.
  const timestamp = Number(t.created ?? t.status_updated ?? Date.now())
  const week = clampWeek(t.leg ?? currentWeek)

  return {
    id: String(t.transaction_id ?? `${t.created}-${kind}`),
    platform: 'sleeper',
    kind,
    timestamp,
    week,
    teamIds: Array.from(teamSet),
    movements,
    faabBid,
    waiverPriority: typeof settings.waiver_priority === 'number'
      ? settings.waiver_priority
      : undefined,
  }
}

/* ─────────────────────────────────────────────────────────────────
   STEP 3 — CATEGORY RESOLUTION
───────────────────────────────────────────────────────────────── */

function resolveCategories(league: SleeperLeague): CategoryLeagueDataCategory[] {
  const scoring = league.scoring_settings ?? {}
  const present = new Set<string>(Object.keys(scoring).map((k) => k.toLowerCase()))
  const found: CategoryLeagueDataCategory[] = []

  for (const def of CAT_TABLE) {
    if (def.sleeperKeys.some((k) => present.has(k))) {
      found.push({ id: def.id, label: def.label, name: def.name, side: def.side })
    }
  }

  if (found.length >= 4) return found

  // Fallback — no recognizable category scoring config exposed. Warn
  // and seed with the standard 11-cat baseball set so the editorial
  // pipeline still has a category list to reason about. This is a
  // best-effort path; detection downstream just treats the cats as
  // present without per-cat stat totals.
  console.warn(
    `[sleeperAdapter] League ${league.league_id}: no recognized category ` +
    `scoring keys (got ${Object.keys(scoring).slice(0, 6).join(', ') || 'none'}). ` +
    `Falling back to the standard 11-cat baseball set.`,
  )
  return DEFAULT_CATS.map((id) => {
    const def = CAT_TABLE.find((c) => c.id === id)!
    return { id: def.id, label: def.label, name: def.name, side: def.side }
  })
}

/* ─────────────────────────────────────────────────────────────────
   STEP 4 — MATCHUP FETCH
───────────────────────────────────────────────────────────────── */

async function fetchAllMatchups(
  leagueId: string,
  upToWeek: number,
): Promise<Map<number, SleeperMatchup[]>> {
  const out = new Map<number, SleeperMatchup[]>()
  for (let w = 1; w <= upToWeek; w++) {
    try {
      const data = await withCache(cacheKey(leagueId, 'matchups', w), () =>
        sleeperService.getMatchups(leagueId, w),
      )
      if (Array.isArray(data) && data.length > 0) out.set(w, data)
    } catch {
      // Week not yet started or 404 — stop walking forward.
      break
    }
  }
  return out
}

/* ─────────────────────────────────────────────────────────────────
   STEP 5 — TEAMS
───────────────────────────────────────────────────────────────── */

function buildTeams(
  rosters: SleeperRoster[],
  users: SleeperUser[],
  sleeperUserId?: string,
): CategoryLeagueDataTeam[] {
  const userById = new Map(users.map((u) => [u.user_id, u]))
  return rosters.map((r) => {
    const user = userById.get(r.owner_id)
    const teamName = sleeperService.getTeamName(r, user)
    const ownerName = user?.display_name || user?.username || `Manager ${r.roster_id}`
    const ownerInitials = initialsOf(ownerName)
    // Sleeper avatar service throws 404s for missing users; the
    // existing `getAvatarUrl` helper already falls back to a default.
    let avatarUrl: string | undefined
    try {
      avatarUrl = sleeperService.getAvatarUrl(r, user, { avatar: '' } as SleeperLeague)
    } catch {
      avatarUrl = undefined
    }
    // "My team" = the roster owned by the signed-in Sleeper account.
    // When no identity is passed in (no user signed in, or no Sleeper
    // link on the profile), every team renders without the wayfinding
    // tint — which is the intended demo experience.
    const isMyTeam =
      !!sleeperUserId && r.owner_id === sleeperUserId
    return {
      id: String(r.roster_id),
      name: teamName,
      ownerName,
      ownerInitials,
      avatarUrl,
      avatarColor: teamColorHash(`${r.roster_id}:${teamName}`),
      isMyTeam,
    }
  })
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '??'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

/* ─────────────────────────────────────────────────────────────────
   STEP 9 — STANDINGS

   Real per-cat W/L/T comes from `perTeamCatRecord` (computed by
   walking every completed week's cat-line and tallying who won each
   cat in each matchup). Streak + lastSix come from the H2H matchup
   point totals.
───────────────────────────────────────────────────────────────── */

function buildStandings(
  rosters: SleeperRoster[],
  matchupsByWeek: Map<number, SleeperMatchup[]>,
  perTeamCatRecord: Map<number, { wins: number; losses: number; ties: number }>,
): CategoryLeagueDataStanding[] {
  // Per-team weekly outcomes (W/L/T) drawn from `points` comparisons.
  const weeklyOutcomes = computeWeeklyOutcomes(matchupsByWeek)

  const rows = rosters.map((r) => {
    const rec = perTeamCatRecord.get(r.roster_id) ?? { wins: 0, losses: 0, ties: 0 }
    const catWins = rec.wins
    const catLosses = rec.losses
    const catTies = rec.ties
    const denom = catWins + catLosses + catTies
    const winPct = denom > 0 ? (catWins + catTies * 0.5) / denom : 0

    // Streak + lastSix from outcome history.
    const teamOutcomes = weeklyOutcomes.get(r.roster_id) ?? []
    const lastSix = teamOutcomes.slice(-6)
    const streak = computeStreak(teamOutcomes)

    return {
      teamId: String(r.roster_id),
      catWins,
      catLosses,
      catTies,
      winPct,
      streak,
      lastSix,
      // ownsCount / bleedingCount are computed once ranks are known
      // (see buildCategoryRanks below). Filled in here as 0 and
      // re-injected after rank synthesis.
      ownsCount: 0,
      bleedingCount: 0,
      // rank gets assigned after sort.
      rank: 0,
    } as CategoryLeagueDataStanding
  })

  // Sort by winPct desc → catWins desc → roster_id asc as tiebreaker.
  rows.sort((a, b) => {
    if (b.winPct !== a.winPct) return b.winPct - a.winPct
    if (b.catWins !== a.catWins) return b.catWins - a.catWins
    return Number(a.teamId) - Number(b.teamId)
  })
  rows.forEach((row, idx) => (row.rank = idx + 1))
  return rows
}

function computeWeeklyOutcomes(
  matchupsByWeek: Map<number, SleeperMatchup[]>,
): Map<number, WLT[]> {
  const out = new Map<number, WLT[]>()
  const weeks = [...matchupsByWeek.keys()].sort((a, b) => a - b)
  for (const week of weeks) {
    const list = matchupsByWeek.get(week) ?? []
    // Group by matchup_id; compare points within each pair. Key is
    // `number | null` -- matching the real Sleeper shape (a bye or
    // out-of-bracket entry carries `matchup_id: null`) -- but this is
    // a type-only widening: a JS Map already accepts a null key at
    // runtime, so grouping behavior here (including the pre-existing,
    // deliberately-untouched null-collision case -- see
    // `pairSleeperMatchups`'s doc comment) is unchanged. Category-only;
    // baseball's fix is a separate, later change.
    const byMatchupId = new Map<number | null, SleeperMatchup[]>()
    for (const m of list) {
      const arr = byMatchupId.get(m.matchup_id) ?? []
      arr.push(m)
      byMatchupId.set(m.matchup_id, arr)
    }
    for (const pair of byMatchupId.values()) {
      if (pair.length !== 2) continue   // bye or malformed
      const [a, b] = pair
      const ap = a.points ?? 0
      const bp = b.points ?? 0
      let aResult: WLT = 'T'
      let bResult: WLT = 'T'
      if (ap > bp) { aResult = 'W'; bResult = 'L' }
      else if (ap < bp) { aResult = 'L'; bResult = 'W' }
      pushOutcome(out, a.roster_id, aResult)
      pushOutcome(out, b.roster_id, bResult)
    }
  }
  return out
}

function pushOutcome(map: Map<number, WLT[]>, rosterId: number, r: WLT): void {
  const arr = map.get(rosterId) ?? []
  arr.push(r)
  map.set(rosterId, arr)
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
   STEP 7 — REAL CATEGORY RANKS

   Aggregates raw MLB stats from Sleeper's stats endpoint across every
   completed week, attributing each player's stat line to the roster
   that STARTED them that week. Ratio cats (AVG, ERA, WHIP) are
   rebuilt from their components (H/AB, ER/IP, BB+H/IP) rather than
   averaged across weeks — that's the only correct way to compute
   them under fantasy accounting. All other cats are summed.

   Once season totals exist per (roster, cat), rosters are sorted per
   cat (descending for "more is better" cats; ascending for ERA/WHIP)
   and assigned rank 1..N. `ownsCount` / `bleedingCount` on standings
   are then recomputed from the real ranks.
───────────────────────────────────────────────────────────────── */

/**
 * Shape of a Sleeper MLB per-player weekly stat line. Field names
 * use Sleeper's lowercase codes; pitcher fields suffixed `_p` to
 * disambiguate from batter fields of the same letter (`h` vs `h_p`).
 *
 * Only fields the editorial pipeline reads are typed; everything
 * else is left as an indexed `number | undefined` so unexpected keys
 * don't break the build.
 */
interface SleeperMlbStatLine {
  // Batting
  r?: number          // runs
  h?: number          // batter hits
  hr?: number         // home runs
  rbi?: number        // runs batted in
  sb?: number         // stolen bases
  ab?: number         // at-bats
  bb?: number         // batter walks
  tb?: number         // total bases
  ops?: number        // OPS (per-week; we naive-sum across weeks)
  // Pitching
  w?: number          // pitcher wins
  sv?: number         // saves
  k?: number          // strikeouts (some leagues use `so`)
  so?: number
  hld?: number        // holds
  er?: number         // earned runs (for ERA)
  ip?: number         // innings pitched (for ERA + WHIP)
  bb_p?: number       // pitcher walks (for WHIP)
  h_p?: number        // hits allowed (for WHIP)
  qs?: number         // quality starts
  [key: string]: number | undefined
}

/** Per-roster aggregated season totals across STARTED weeks. */
interface RosterStatAccumulator {
  // count cats — naive sum
  r: number
  h: number
  hr: number
  rbi: number
  sb: number
  ab: number
  bb: number
  tb: number
  ops: number
  w: number
  sv: number
  k: number
  hld: number
  qs: number
  // ratio-cat components — must aggregate then divide
  er: number
  ip: number
  bb_p: number
  h_p: number
}

function emptyAccumulator(): RosterStatAccumulator {
  return {
    r: 0, h: 0, hr: 0, rbi: 0, sb: 0, ab: 0, bb: 0, tb: 0, ops: 0,
    w: 0, sv: 0, k: 0, hld: 0, qs: 0,
    er: 0, ip: 0, bb_p: 0, h_p: 0,
  }
}

/** Best-effort numeric coercion — Sleeper occasionally returns strings. */
function num(v: unknown): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string') {
    const n = parseFloat(v)
    if (Number.isFinite(n)) return n
  }
  return 0
}

/**
 * Fetch raw MLB stats for every provided week in parallel. Weeks
 * with no data (Sleeper returns 404 or empty) contribute an empty
 * object so the downstream aggregator gracefully skips them.
 */
async function fetchAllMlbStats(
  season: number,
  weeks: number[],
): Promise<Map<number, Record<string, SleeperMlbStatLine>>> {
  const out = new Map<number, Record<string, SleeperMlbStatLine>>()
  if (weeks.length === 0) return out

  // Parallelize — module-level cache inside sleeperService handles
  // dedup across repeated adapter invocations.
  const results = await Promise.all(
    weeks
      .filter((w) => w > 0)
      .map((w) =>
        sleeperService
          .getMlbStats(season, w)
          .then((data) => ({ week: w, data: data as Record<string, SleeperMlbStatLine> }))
          .catch((err: unknown) => {
            console.warn(
              `[sleeperAdapter] MLB stats fetch failed for week ${w}:`,
              err,
            )
            return { week: w, data: {} as Record<string, SleeperMlbStatLine> }
          }),
      ),
  )

  for (const { week, data } of results) out.set(week, data)
  return out
}

/**
 * One-time warning bookkeeping — keyed by cat id so we don't spam
 * the console with the same missing-key warning every render.
 */
const warnedMissingCats = new Set<string>()
function warnMissingCat(catId: string, msg: string): void {
  if (warnedMissingCats.has(catId)) return
  warnedMissingCats.add(catId)
  console.warn(`[sleeperAdapter] ${msg}`)
}

function buildRealCategoryRanks(
  rosters: SleeperRoster[],
  categories: CategoryLeagueDataCategory[],
  matchupsByWeek: Map<number, SleeperMatchup[]>,
  statsByWeek: Map<number, Record<string, SleeperMlbStatLine>>,
  standings: CategoryLeagueDataStanding[],
): CategoryLeagueDataCategoryRank[] {
  const teamCount = rosters.length

  // 1. Accumulate season totals per roster from started players.
  const accumulators = new Map<number, RosterStatAccumulator>()
  for (const r of rosters) accumulators.set(r.roster_id, emptyAccumulator())

  const weeks = [...matchupsByWeek.keys()].sort((a, b) => a - b)
  for (const week of weeks) {
    const stats = statsByWeek.get(week) ?? {}
    if (!stats || Object.keys(stats).length === 0) continue

    const matchups = matchupsByWeek.get(week) ?? []
    for (const m of matchups) {
      const acc = accumulators.get(m.roster_id)
      if (!acc) continue
      const starters = m.starters ?? []
      for (const playerId of starters) {
        if (!playerId || playerId === '0') continue
        const line = stats[playerId]
        if (!line) continue   // MiLB / DTD / out — skip silently
        // Count cats
        acc.r   += num(line.r)
        acc.h   += num(line.h)
        acc.hr  += num(line.hr)
        acc.rbi += num(line.rbi)
        acc.sb  += num(line.sb)
        acc.ab  += num(line.ab)
        acc.bb  += num(line.bb)
        acc.tb  += num(line.tb)
        acc.ops += num(line.ops)
        acc.w   += num(line.w)
        acc.sv  += num(line.sv)
        // Sleeper uses both `k` and `so` for strikeouts across sports.
        // Prefer `k` when present, otherwise fall back to `so`.
        acc.k   += num(line.k ?? line.so)
        acc.hld += num(line.hld)
        acc.qs  += num(line.qs)
        // Ratio-cat components
        acc.er   += num(line.er)
        acc.ip   += num(line.ip)
        acc.bb_p += num(line.bb_p)
        acc.h_p  += num(line.h_p)
      }
    }
  }

  // 2. Resolve season totals per (roster, cat). `value` is the
  //    quantity ranked; `direction` tells the sort which way "good"
  //    points. `undefined` value means we couldn't compute this cat
  //    for this roster (e.g., missing stat key) — those rosters get
  //    a sentinel rank of 0 left in place.
  type CatValue = { value: number | undefined; direction: 'desc' | 'asc' }
  const valuesByCat = new Map<string, Map<string, CatValue>>()

  for (const cat of categories) {
    const map = new Map<string, CatValue>()
    for (const r of rosters) {
      const acc = accumulators.get(r.roster_id)!
      map.set(String(r.roster_id), resolveCatValue(cat.id, acc))
    }
    valuesByCat.set(cat.id, map)
  }

  // 3. Build the rank table. Empty stats → all values are 0/undefined,
  //    so ranks come out as a stable tiebroken permutation rather than
  //    throwing.
  const out: CategoryLeagueDataCategoryRank[] = rosters.map((r) => ({
    teamId: String(r.roster_id),
    catRanks: {} as Record<string, number>,
  }))

  for (const cat of categories) {
    const values = valuesByCat.get(cat.id)!
    // Split: rosters with a real numeric value get ranked; rosters
    // whose cat couldn't be computed are left at rank 0.
    const rankable: { teamId: string; value: number; direction: 'desc' | 'asc' }[] = []
    const unranked: string[] = []
    for (const row of out) {
      const v = values.get(row.teamId)!
      if (v.value === undefined || !Number.isFinite(v.value)) {
        unranked.push(row.teamId)
      } else {
        rankable.push({ teamId: row.teamId, value: v.value, direction: v.direction })
      }
    }

    if (rankable.length === 0) {
      // Couldn't compute this cat for anyone — leave at 0 and warn
      // once so the bug is visible without spamming.
      warnMissingCat(cat.id, `cat "${cat.id}" could not be computed for any roster (no stats data?)`)
      for (const row of out) row.catRanks[cat.id] = 0
      continue
    }

    const direction = rankable[0].direction
    rankable.sort((a, b) => {
      if (a.value === b.value) {
        // Stable tiebreak by roster_id so ranks are deterministic.
        return Number(a.teamId) - Number(b.teamId)
      }
      return direction === 'desc' ? b.value - a.value : a.value - b.value
    })

    rankable.forEach((entry, idx) => {
      const row = out.find((o) => o.teamId === entry.teamId)!
      row.catRanks[cat.id] = idx + 1
    })
    // Unranked rosters keep rank 0 (sentinel — editorial code already
    // treats 0/missing ranks as "not applicable").
    for (const teamId of unranked) {
      const row = out.find((o) => o.teamId === teamId)!
      row.catRanks[cat.id] = 0
    }
  }

  // 4. Recompute ownsCount / bleedingCount from real ranks. Skip rank
  //    0 (sentinel) — only real ranks count toward owns/bleeding.
  for (const s of standings) {
    const ranks = out.find((r) => r.teamId === s.teamId)?.catRanks ?? {}
    const realRanks = Object.values(ranks).filter((r) => r > 0)
    s.ownsCount = realRanks.filter((r) => r <= 3).length
    s.bleedingCount = realRanks.filter((r) => r >= teamCount - 2).length
  }

  return out
}

/**
 * Convert a single cat id + roster accumulator into a sortable
 * value + direction. Returns `value: undefined` when the cat can't
 * be computed (e.g., AVG with 0 AB).
 */
function resolveCatValue(
  catId: string,
  acc: RosterStatAccumulator,
): { value: number | undefined; direction: 'desc' | 'asc' } {
  switch (catId) {
    case 'R':   return { value: acc.r,   direction: 'desc' }
    case 'H':   return { value: acc.h,   direction: 'desc' }
    case 'HR':  return { value: acc.hr,  direction: 'desc' }
    case 'RBI': return { value: acc.rbi, direction: 'desc' }
    case 'SB':  return { value: acc.sb,  direction: 'desc' }
    case 'BB':  return { value: acc.bb,  direction: 'desc' }
    case 'TB':  return { value: acc.tb,  direction: 'desc' }
    case 'OPS': return { value: acc.ops, direction: 'desc' }
    case 'W':   return { value: acc.w,   direction: 'desc' }
    case 'SV':  return { value: acc.sv,  direction: 'desc' }
    case 'K':   return { value: acc.k,   direction: 'desc' }
    case 'HLD': return { value: acc.hld, direction: 'desc' }
    case 'QS':  return { value: acc.qs,  direction: 'desc' }
    case 'AVG':
      return { value: acc.ab > 0 ? acc.h / acc.ab : undefined, direction: 'desc' }
    case 'ERA':
      return { value: acc.ip > 0 ? (acc.er * 9) / acc.ip : undefined, direction: 'asc' }
    case 'WHIP':
      return { value: acc.ip > 0 ? (acc.bb_p + acc.h_p) / acc.ip : undefined, direction: 'asc' }
    case 'K9':
      return { value: acc.ip > 0 ? (acc.k * 9) / acc.ip : undefined, direction: 'desc' }
    default:
      warnMissingCat(catId, `unknown cat id "${catId}" — leaving unranked`)
      return { value: undefined, direction: 'desc' }
  }
}

/* ─────────────────────────────────────────────────────────────────
   STEP 8 — SEASON RANK HISTORY

   For each week up through `currentWeek`, build the standings as
   they would have looked at the close of that week (cumulative
   record), then assign rank 1..N. Same tiebreakers as live
   standings.
───────────────────────────────────────────────────────────────── */

function buildSeasonRankHistory(
  rosters: SleeperRoster[],
  matchupsByWeek: Map<number, SleeperMatchup[]>,
): CategoryLeagueDataWeeklyRanks[] {
  const weeks = [...matchupsByWeek.keys()].sort((a, b) => a - b)
  const cumulative = new Map<number, { wins: number; losses: number; ties: number }>()
  for (const r of rosters) cumulative.set(r.roster_id, { wins: 0, losses: 0, ties: 0 })

  const history: CategoryLeagueDataWeeklyRanks[] = []

  for (const week of weeks) {
    const list = matchupsByWeek.get(week) ?? []
    // Type-only widening -- see the identical comment in
    // computeWeeklyOutcomes above. Category-only.
    const byMatchupId = new Map<number | null, SleeperMatchup[]>()
    for (const m of list) {
      const arr = byMatchupId.get(m.matchup_id) ?? []
      arr.push(m)
      byMatchupId.set(m.matchup_id, arr)
    }
    for (const pair of byMatchupId.values()) {
      if (pair.length !== 2) continue
      const [a, b] = pair
      const aRec = cumulative.get(a.roster_id)
      const bRec = cumulative.get(b.roster_id)
      if (!aRec || !bRec) continue
      const ap = a.points ?? 0
      const bp = b.points ?? 0
      if (ap > bp) { aRec.wins++; bRec.losses++ }
      else if (ap < bp) { aRec.losses++; bRec.wins++ }
      else { aRec.ties++; bRec.ties++ }
    }

    // Snapshot ranks.
    const snapshot = rosters
      .map((r) => {
        const rec = cumulative.get(r.roster_id)!
        const played = rec.wins + rec.losses + rec.ties
        const pct = played > 0 ? rec.wins / played : 0
        return { teamId: String(r.roster_id), pct, wins: rec.wins }
      })
      .sort((a, b) => {
        if (b.pct !== a.pct) return b.pct - a.pct
        if (b.wins !== a.wins) return b.wins - a.wins
        return Number(a.teamId) - Number(b.teamId)
      })

    const ranks: Record<string, number> = {}
    snapshot.forEach((row, idx) => (ranks[row.teamId] = idx + 1))
    history.push({ week, ranks })
  }

  return history
}

/* ─────────────────────────────────────────────────────────────────
   STEP 7 — PER-(ROSTER, WEEK, CAT) TOTALS

   For every completed week, attribute each STARTED player's stat
   line to the rostering team and bucket per-cat. Ratio cats are
   kept as { components } so each consumer can rebuild them under
   fantasy accounting rules (sum components first, then divide).
   This single intermediate replaces three earlier ad-hoc walks
   (ranks, current-week cat-lines, weekly cats-won).
───────────────────────────────────────────────────────────────── */

/** Per (rosterId, week, catId) computed value used by every downstream consumer. */
type PerWeekRosterCatTotals = Map<
  number,                              // rosterId
  Map<
    number,                            // week
    {
      catValues: Record<string, number | undefined>
      // Raw components per ratio cat — for matchup cat-line comparison.
      ab: number
      hits: number
      er: number
      ip: number
      bb_p: number
      h_p: number
    }
  >
>

function buildPerWeekRosterCatTotals(
  rosters: SleeperRoster[],
  categories: CategoryLeagueDataCategory[],
  matchupsByWeek: Map<number, SleeperMatchup[]>,
  statsByWeek: Map<number, Record<string, SleeperMlbStatLine>>,
): PerWeekRosterCatTotals {
  const out: PerWeekRosterCatTotals = new Map()
  for (const r of rosters) out.set(r.roster_id, new Map())

  for (const [week, matchups] of matchupsByWeek) {
    const stats = statsByWeek.get(week) ?? {}
    for (const m of matchups) {
      const acc = emptyAccumulator()
      const starters = m.starters ?? []
      for (const playerId of starters) {
        if (!playerId || playerId === '0') continue
        const line = stats[playerId]
        if (!line) continue
        acc.r   += num(line.r)
        acc.h   += num(line.h)
        acc.hr  += num(line.hr)
        acc.rbi += num(line.rbi)
        acc.sb  += num(line.sb)
        acc.ab  += num(line.ab)
        acc.bb  += num(line.bb)
        acc.tb  += num(line.tb)
        acc.ops += num(line.ops)
        acc.w   += num(line.w)
        acc.sv  += num(line.sv)
        acc.k   += num(line.k ?? line.so)
        acc.hld += num(line.hld)
        acc.qs  += num(line.qs)
        acc.er   += num(line.er)
        acc.ip   += num(line.ip)
        acc.bb_p += num(line.bb_p)
        acc.h_p  += num(line.h_p)
      }
      const catValues: Record<string, number | undefined> = {}
      for (const cat of categories) {
        catValues[cat.id] = resolveCatValue(cat.id, acc).value
      }
      const teamMap = out.get(m.roster_id)
      if (!teamMap) continue
      teamMap.set(week, {
        catValues,
        ab: acc.ab,
        hits: acc.h,
        er: acc.er,
        ip: acc.ip,
        bb_p: acc.bb_p,
        h_p: acc.h_p,
      })
    }
  }
  return out
}

/* ─────────────────────────────────────────────────────────────────
   STEP 8 — PER-TEAM CAT-W/L/T RECORD (real, not synthesized)

   For every completed matchup, compare each cat between the pair
   of rosters. Higher value wins (lower wins for ERA/WHIP); equal
   non-zero values tie. Tally per-team across all weeks. Bye weeks
   (single roster in a matchup_id bucket) contribute nothing.

   When neither side has any stat data for a cat (both undefined or
   both 0/0 ratio), we skip — that cat wasn't contested for that
   week. This avoids inflating tie counts before the season starts.
───────────────────────────────────────────────────────────────── */

function buildPerTeamCatRecord(
  rosters: SleeperRoster[],
  matchupsByWeek: Map<number, SleeperMatchup[]>,
  perWeek: PerWeekRosterCatTotals,
  categories: CategoryLeagueDataCategory[],
): Map<number, { wins: number; losses: number; ties: number }> {
  const out = new Map<number, { wins: number; losses: number; ties: number }>()
  for (const r of rosters) out.set(r.roster_id, { wins: 0, losses: 0, ties: 0 })

  for (const [week, matchups] of matchupsByWeek) {
    const byMatchupId = groupByMatchupId(matchups)
    for (const pair of byMatchupId.values()) {
      if (pair.length !== 2) continue
      const [a, b] = pair
      const aWeek = perWeek.get(a.roster_id)?.get(week)
      const bWeek = perWeek.get(b.roster_id)?.get(week)
      if (!aWeek || !bWeek) continue
      const aRec = out.get(a.roster_id)!
      const bRec = out.get(b.roster_id)!
      for (const cat of categories) {
        const aVal = aWeek.catValues[cat.id]
        const bVal = bWeek.catValues[cat.id]
        if (aVal === undefined && bVal === undefined) continue
        const aResolved = aVal ?? 0
        const bResolved = bVal ?? 0
        const lowerWins = cat.id === 'ERA' || cat.id === 'WHIP'
        if (aResolved === bResolved) {
          if (aResolved === 0 && bResolved === 0) continue   // not contested
          aRec.ties++
          bRec.ties++
        } else if ((lowerWins && aResolved < bResolved) || (!lowerWins && aResolved > bResolved)) {
          aRec.wins++
          bRec.losses++
        } else {
          aRec.losses++
          bRec.wins++
        }
      }
    }
  }
  return out
}

/** Shared by the category path (unfiltered -- carries the same latent
 *  null-matchup_id phantom-pair bug baseball has always had, not
 *  touched here) and `pairSleeperMatchups` (pre-filters nulls before
 *  calling, so the `null` key branch below is never reached from that
 *  caller). Key type is `number | null` to match the real Sleeper
 *  shape; purely type-level, a JS Map already accepted a null key at
 *  runtime before this widening. */
function groupByMatchupId(matchups: SleeperMatchup[]): Map<number | null, SleeperMatchup[]> {
  const byMatchupId = new Map<number | null, SleeperMatchup[]>()
  for (const m of matchups) {
    const arr = byMatchupId.get(m.matchup_id) ?? []
    arr.push(m)
    byMatchupId.set(m.matchup_id, arr)
  }
  return byMatchupId
}

/* ─────────────────────────────────────────────────────────────────
   STEP 12 — CURRENT-WEEK MATCHUPS

   Pairs rosters by `matchup_id` for the current week and computes
   the current cat-record + per-cat lines. Status:
     'live'     — matchup in progress (has data, but is current week)
     'final'    — past week (all cats decided)
     'upcoming' — current week with no data yet
   The 'coasting' status is left to a follow-up — needs a notion of
   "decided enough that the outcome won't change" which depends on
   schedule/innings remaining.
───────────────────────────────────────────────────────────────── */

function buildCurrentWeekMatchups(
  matchupsByWeek: Map<number, SleeperMatchup[]>,
  perWeek: PerWeekRosterCatTotals,
  categories: CategoryLeagueDataCategory[],
  currentWeek: number,
): CategoryLeagueDataMatchup[] {
  const list = matchupsByWeek.get(currentWeek) ?? []
  if (list.length === 0) return []
  const byMatchupId = groupByMatchupId(list)
  const out: CategoryLeagueDataMatchup[] = []
  for (const [mid, pair] of byMatchupId) {
    if (pair.length !== 2) continue   // bye — skip
    const [home, away] = pair          // Sleeper has no canonical home/away, so we pick first
    const aWeek = perWeek.get(home.roster_id)?.get(currentWeek)
    const bWeek = perWeek.get(away.roster_id)?.get(currentWeek)
    let homeCatWins = 0
    let awayCatWins = 0
    let ties = 0
    let contested = 0
    const hasData = !!(aWeek || bWeek)
    const status: CategoryLeagueDataMatchup['status'] = hasData ? 'live' : 'upcoming'
    if (aWeek && bWeek) {
      for (const cat of categories) {
        const aVal = aWeek.catValues[cat.id]
        const bVal = bWeek.catValues[cat.id]
        if (aVal === undefined && bVal === undefined) {
          contested++
          continue
        }
        const aResolved = aVal ?? 0
        const bResolved = bVal ?? 0
        const lowerWins = cat.id === 'ERA' || cat.id === 'WHIP'
        if (aResolved === bResolved) {
          if (aResolved === 0 && bResolved === 0) contested++
          else ties++
        } else if ((lowerWins && aResolved < bResolved) || (!lowerWins && aResolved > bResolved)) {
          homeCatWins++
        } else {
          awayCatWins++
        }
      }
    } else {
      contested = categories.length
    }
    // TODO: catLines field still undefined — wire in follow-up once
    // we know which cats are "decided" (need schedule/innings-left).
    out.push({
      id: `wk${currentWeek}-${mid}`,
      homeTeamId: String(home.roster_id),
      awayTeamId: String(away.roster_id),
      status,
      homeCatWins,
      awayCatWins,
      ties,
      contestedCount: contested,
      // catLines intentionally undefined for now.
    })
  }
  return out
}

/* ─────────────────────────────────────────────────────────────────
   STEP 13 — WEEKLY CATS-WON TALLIES (Home page chart)

   For each completed week × each roster, count how many cats they
   won in their matchup that week. League average is the
   mathematical zero-sum constant (categories.length / 2) when no
   cats tie — emit per week so the chart matches the played weeks.
───────────────────────────────────────────────────────────────── */

function buildWeeklyCatTallies(
  rosters: SleeperRoster[],
  matchupsByWeek: Map<number, SleeperMatchup[]>,
  perWeek: PerWeekRosterCatTotals,
  categories: CategoryLeagueDataCategory[],
): { weeklyCatsWon: Record<string, number[]>; weeklyLeagueAverage: number[] } {
  const weeks = [...matchupsByWeek.keys()].sort((a, b) => a - b)
  const weeklyCatsWon: Record<string, number[]> = {}
  for (const r of rosters) weeklyCatsWon[String(r.roster_id)] = []
  const weeklyLeagueAverage: number[] = []

  for (const week of weeks) {
    const list = matchupsByWeek.get(week) ?? []
    const byMatchupId = groupByMatchupId(list)
    // Default to 0 for every team this week — bye weeks stay 0.
    for (const r of rosters) weeklyCatsWon[String(r.roster_id)].push(0)
    for (const pair of byMatchupId.values()) {
      if (pair.length !== 2) continue
      const [a, b] = pair
      const aWeek = perWeek.get(a.roster_id)?.get(week)
      const bWeek = perWeek.get(b.roster_id)?.get(week)
      if (!aWeek || !bWeek) continue
      let aWins = 0
      let bWins = 0
      for (const cat of categories) {
        const aVal = aWeek.catValues[cat.id]
        const bVal = bWeek.catValues[cat.id]
        if (aVal === undefined && bVal === undefined) continue
        const aResolved = aVal ?? 0
        const bResolved = bVal ?? 0
        const lowerWins = cat.id === 'ERA' || cat.id === 'WHIP'
        if (aResolved === bResolved) continue
        if ((lowerWins && aResolved < bResolved) || (!lowerWins && aResolved > bResolved)) aWins++
        else bWins++
      }
      const aIdx = weeklyCatsWon[String(a.roster_id)].length - 1
      weeklyCatsWon[String(a.roster_id)][aIdx] = aWins
      const bIdx = weeklyCatsWon[String(b.roster_id)].length - 1
      weeklyCatsWon[String(b.roster_id)][bIdx] = bWins
    }
    // Mathematical mean: each contested cat contributes 1 W somewhere
    // and is split across (rosters.length) teams. Punt cats / ties
    // slightly reduce this, but average is bounded by cats.length / 2.
    weeklyLeagueAverage.push(categories.length / 2)
  }
  return { weeklyCatsWon, weeklyLeagueAverage }
}

/* ─────────────────────────────────────────────────────────────────
   STEP 14 — SEASON HISTORY (multi-year walk)

   Sleeper exposes `previous_league_id` as a chain. We recurse up to
   5 hops back. For each past season we fetch the league, rosters
   (final standings via `roster.settings.wins/losses`) and the
   winners bracket to identify the champion (preferred over
   highest-record team). Basement is the lowest-record roster.
───────────────────────────────────────────────────────────────── */

const MAX_HISTORY_DEPTH = 5

async function buildSeasonHistory(
  currentLeague: SleeperLeague,
): Promise<CategoryLeagueDataSeasonHistory[]> {
  const out: CategoryLeagueDataSeasonHistory[] = []
  let prevId = currentLeague.previous_league_id
  let depth = 0
  const seen = new Set<string>([currentLeague.league_id])
  while (prevId && depth < MAX_HISTORY_DEPTH) {
    if (seen.has(prevId)) break
    seen.add(prevId)
    let prevLeague: SleeperLeague
    let prevRosters: SleeperRoster[]
    try {
      prevLeague = await withCache(cacheKey(prevId, 'league'), () =>
        sleeperService.getLeague(prevId!),
      )
      prevRosters = await withCache(cacheKey(prevId, 'rosters'), () =>
        sleeperService.getLeagueRosters(prevId!),
      )
    } catch {
      break   // chain broke (deleted / archived)
    }
    if (!prevRosters || prevRosters.length === 0) break

    // Sort by record desc for runner-up / basement.
    const sorted = [...prevRosters].sort((a, b) => {
      const aw = a.settings?.wins ?? 0
      const bw = b.settings?.wins ?? 0
      if (bw !== aw) return bw - aw
      const al = a.settings?.losses ?? 0
      const bl = b.settings?.losses ?? 0
      return al - bl
    })

    // Champion: prefer winners bracket; fall back to top-record roster.
    let championRosterId: number | null = null
    try {
      const bracket = await sleeperService.getWinnersBracket(prevId)
      championRosterId = sleeperService.getChampionFromBracket(bracket)
    } catch {
      championRosterId = null
    }
    if (!championRosterId) championRosterId = sorted[0]?.roster_id ?? null
    const championRoster = sorted.find((r) => r.roster_id === championRosterId) ?? sorted[0]
    const runnerUp = sorted.find((r) => r.roster_id !== championRosterId) ?? sorted[1]
    const basement = sorted[sorted.length - 1]
    if (!championRoster || !runnerUp || !basement) break

    const year = parseInt(prevLeague.season, 10) || (currentLeague.season ? parseInt(currentLeague.season, 10) - depth - 1 : new Date().getFullYear() - depth - 1)
    out.push({
      year,
      championTeamId: String(championRoster.roster_id),
      championRecord: recordString(championRoster),
      runnerUpTeamId: String(runnerUp.roster_id),
      basementTeamId: String(basement.roster_id),
    })
    prevId = prevLeague.previous_league_id
    depth++
  }
  return out
}

function recordString(r: SleeperRoster): string {
  const w = r.settings?.wins ?? 0
  const l = r.settings?.losses ?? 0
  const t = r.settings?.ties ?? 0
  return t > 0 ? `${w}-${l}-${t}` : `${w}-${l}`
}

/* ─────────────────────────────────────────────────────────────────
   STEP 15 — TEAM CAREER STATS

   Aggregate from current season + walked seasonHistory. For a
   brand-new league with no prior seasons, this is just the current
   year. Titles / playoff apps come from seasonHistory champion +
   runner-up + (heuristic) finishes for legacy.

   NOTE: a fully accurate career hitCatsWon/pitchCatsWon breakdown
   needs per-cat W/L per season — we approximate by splitting the
   current season's hit vs pit ratio across the career total. TODO:
   replay prior seasons' weekly stats to get true per-cat splits.
───────────────────────────────────────────────────────────────── */

function buildTeamCareerStats(
  rosters: SleeperRoster[],
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
  const hitRatio = (hitCats + pitCats) > 0 ? hitCats / (hitCats + pitCats) : 0.5
  for (const r of rosters) {
    const teamId = String(r.roster_id)
    const s = standings.find((x) => x.teamId === teamId)
    const seasonsPlayed = 1 + seasonHistory.length
    const catWins = s?.catWins ?? 0
    const catLosses = s?.catLosses ?? 0
    const catTies = s?.catTies ?? 0
    // Heuristically extrapolate prior seasons by averaging the current
    // season's per-week pace. Better than 0 when history is shallow.
    const priorFactor = seasonHistory.length   // careful: don't double-count current
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
   STEP 16 — H2H MATRIX (all-time)

   Walks every completed matchup across discovered seasons (current
   + history) and tallies W-L-T plus a signed cat differential from
   roster.settings.fpts as a coarse proxy (we don't replay full
   per-cat history for prior seasons; that's TODO).

   For the current season we use real overall outcomes; for prior
   seasons we walk roster_id pairings from each week's matchups and
   tally by `points` comparison.
───────────────────────────────────────────────────────────────── */

async function buildH2HMatrix(
  currentLeague: SleeperLeague,
  currentRosters: SleeperRoster[],
): Promise<CategoryLeagueDataH2HEntry[]> {
  const pairKey = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`)
  const records = new Map<string, { wins: number; losses: number; ties: number; meetings: number; catDiff: number }>()

  const walkLeague = async (league: SleeperLeague) => {
    const upTo = clampWeek(league.settings?.leg ?? 18)
    for (let w = 1; w <= upTo; w++) {
      let list: SleeperMatchup[]
      try {
        list = await withCache(cacheKey(league.league_id, 'matchups', w), () =>
          sleeperService.getMatchups(league.league_id, w),
        )
      } catch {
        break
      }
      if (!Array.isArray(list) || list.length === 0) break
      const byMatchupId = groupByMatchupId(list)
      for (const pair of byMatchupId.values()) {
        if (pair.length !== 2) continue
        const [a, b] = pair
        const aId = String(a.roster_id)
        const bId = String(b.roster_id)
        const teamA = aId < bId ? aId : bId
        const teamB = aId < bId ? bId : aId
        const ap = a.points ?? 0
        const bp = b.points ?? 0
        const key = pairKey(aId, bId)
        const rec = records.get(key) ?? { wins: 0, losses: 0, ties: 0, meetings: 0, catDiff: 0 }
        rec.meetings++
        const aIsTeamA = aId === teamA
        if (ap > bp) {
          if (aIsTeamA) rec.wins++; else rec.losses++
          rec.catDiff += aIsTeamA ? 1 : -1
        } else if (ap < bp) {
          if (aIsTeamA) rec.losses++; else rec.wins++
          rec.catDiff -= aIsTeamA ? 1 : -1
        } else {
          rec.ties++
        }
        records.set(key, rec)
      }
    }
  }

  await walkLeague(currentLeague)
  let prevId = currentLeague.previous_league_id
  let depth = 0
  const seen = new Set<string>([currentLeague.league_id])
  while (prevId && depth < MAX_HISTORY_DEPTH) {
    if (seen.has(prevId)) break
    seen.add(prevId)
    let prev: SleeperLeague
    try {
      prev = await withCache(cacheKey(prevId, 'league'), () =>
        sleeperService.getLeague(prevId!),
      )
    } catch {
      break
    }
    await walkLeague(prev)
    prevId = prev.previous_league_id
    depth++
  }

  // Map back to entries keyed by alphabetized pair.
  const out: CategoryLeagueDataH2HEntry[] = []
  // We need to recover (teamA, teamB) from the records — the key
  // already encodes it.
  for (const [key, rec] of records) {
    const [teamA, teamB] = key.split('|')
    // Defensive: skip pairs that include rosters not in the current league.
    if (!currentRosters.some((r) => String(r.roster_id) === teamA) ||
        !currentRosters.some((r) => String(r.roster_id) === teamB)) continue
    out.push({
      teamA,
      teamB,
      recordA: rec.ties > 0 ? `${rec.wins}-${rec.losses}-${rec.ties}` : `${rec.wins}-${rec.losses}`,
      catDiffA: rec.catDiff,
      meetings: rec.meetings,
    })
  }
  return out
}

/* ─────────────────────────────────────────────────────────────────
   STEP 17 — DRAFT

   `sleeperService.getDraftData(leagueId)` already wraps both the
   draft + picks endpoints. We translate its raw pick shape into the
   contract's `CategoryLeagueDataDraft`. `valueScore` requires
   per-player end-of-season stats — skipped for now; a follow-up
   can compute pickOverall minus rank-of-player-by-stats.
───────────────────────────────────────────────────────────────── */

async function buildDraft(
  leagueId: string,
  currentSeason: number,
): Promise<CategoryLeagueDataDraft | undefined> {
  let raw: { picks?: unknown[]; draft_order?: Record<string, unknown> } | null
  try {
    raw = await sleeperService.getDraftData(leagueId)
  } catch {
    return undefined
  }
  if (!raw || !Array.isArray(raw.picks) || raw.picks.length === 0) return undefined

  // Sleeper player metadata: we'd need the players DB for full names.
  // Best-effort: pull the players DB once, fall back to the pick's
  // embedded metadata when present (Sleeper inlines first/last/pos in
  // the pick object's `metadata` field for drafts).
  const picks: CategoryLeagueDataDraftPick[] = raw.picks.map((rawPick: any) => {
    const meta = rawPick.metadata ?? {}
    const firstName = meta.first_name ?? ''
    const lastName = meta.last_name ?? ''
    const fullName = `${firstName} ${lastName}`.trim() || `Player ${rawPick.player_id}`
    return {
      pickOverall: Number(rawPick.pick_no) || 0,
      round: Number(rawPick.round) || 0,
      playerId: String(rawPick.player_id ?? ''),
      playerName: fullName,
      position: String(meta.position ?? ''),
      mlbTeam: String(meta.team ?? ''),
      draftedByTeamId: String(rawPick.roster_id ?? ''),
      // TODO: valueScore requires player season stats — skip for now.
    }
  })
  return {
    year: currentSeason,
    totalPicks: picks.length,
    picks,
  }
}

/* ─────────────────────────────────────────────────────────────────
   UTILS
───────────────────────────────────────────────────────────────── */

function clampWeek(n: number): number {
  if (!Number.isFinite(n) || n < 1) return 1
  if (n > 30) return 30
  return Math.floor(n)
}

/* ─────────────────────────────────────────────────────────────────
   SLEEPER → LeagueDataH2HPoints (football, H2H points)

   Split from the category adapter above rather than sharing steps
   with it: a points league has no per-category data, so the "real
   cat records" machinery above doesn't apply. Reuses `buildTeams`
   (naming + avatar) and `groupByMatchupId` from the category path —
   both are format-agnostic.

   `buildSleeperPointsData` is a PURE function of its `raw` argument:
   no I/O, no clock, no randomness. `sleeperLeagueToPointsData` is the
   only piece that talks to the network; it fetches then delegates.
───────────────────────────────────────────────────────────────── */

/**
 * Sleeper splits point totals into an integer part and hundredths:
 * `{ fpts: 1807, fpts_decimal: 6 }` means **1807.06**, not 1807 + 6.
 * The same encoding applies to `fpts_against` and `ppts`, which this
 * adapter doesn't consume yet. Exported for direct unit testing.
 */
export function sleeperPoints(intPart?: number, hundredths?: number): number {
  return (intPart ?? 0) + (hundredths ?? 0) / 100
}

/** The shape `buildSleeperPointsData` consumes — identical to the
 *  fixture's top-level shape, so the fixture is a valid test input
 *  with zero adaptation. `matchupsByWeek` is a plain object keyed by
 *  week number as a string (Sleeper's own `/matchups/{week}` calls
 *  are one week at a time; this is how the results get assembled). */
export interface SleeperPointsRaw {
  league: SleeperLeague
  rosters: SleeperRoster[]
  users: SleeperUser[]
  matchupsByWeek: Record<string, SleeperMatchup[]>
  /** Draft and its picks. Optional: a league can exist without a draft
   *  (imported rosters, orphaned leagues), and that is a fact about the
   *  league rather than a capture failure. */
  draft?: { info?: unknown; picks?: SleeperDraftPick[] } | null
}

/** A Sleeper draft pick. `metadata` carries the player's name,
 *  position and pro team, which is why draft copy needs no separate
 *  player lookup — the /players/nfl blob is ~5MB and never fetched. */
export interface SleeperDraftPick {
  round?: number
  pick_no?: number
  roster_id?: number | null
  player_id?: string
  is_keeper?: boolean | null
  metadata?: {
    first_name?: string
    last_name?: string
    position?: string
    team?: string
  } | null
}

/**
 * Maps Sleeper draft picks onto the Draft page's contract.
 *
 * Picks with no resolvable roster are dropped: a pick belongs to a team
 * by definition, and one attributed to nobody would render as an
 * orphaned row on the board. Picks whose metadata is missing keep their
 * slot — losing a round-3 pick would silently renumber the draft — and
 * fall back to the player id, which is true, rather than a placeholder
 * name, which would not be.
 */
function buildSleeperDraft(
  raw: SleeperPointsRaw,
  season: number,
): CategoryLeagueDataDraft | undefined {
  const picks = raw.draft?.picks
  if (!Array.isArray(picks) || picks.length === 0) return undefined

  const mapped: CategoryLeagueDataDraftPick[] = []
  for (const p of picks) {
    if (p.roster_id == null) continue
    const first = p.metadata?.first_name?.trim() ?? ''
    const last = p.metadata?.last_name?.trim() ?? ''
    const name = `${first} ${last}`.trim()
    mapped.push({
      pickOverall: typeof p.pick_no === 'number' ? p.pick_no : mapped.length + 1,
      round: typeof p.round === 'number' ? p.round : 0,
      playerId: p.player_id ?? '',
      playerName: name || (p.player_id ? `Player ${p.player_id}` : 'Unknown player'),
      position: p.metadata?.position ?? '',
      mlbTeam: p.metadata?.team ?? '',
      draftedByTeamId: String(p.roster_id),
    })
  }
  if (mapped.length === 0) return undefined

  mapped.sort((a, b) => a.pickOverall - b.pickOverall)
  return { year: season, totalPicks: mapped.length, picks: mapped }
}

/**
 * Pairs a week's raw Sleeper matchup entries into two-sided games.
 *
 * A `matchup_id` of `null` means "not part of a paired game this
 * week" (e.g., a team that finished outside the playoff bracket).
 * Filtering those out has to happen BEFORE grouping-by-id: grouping
 * first is unsafe two ways. Either every null entry gets lumped into
 * one oversized bucket (harmless — the length check below drops it),
 * or — the dangerous case — exactly two null entries in some week
 * would satisfy the length-2 check and get reported as a real game
 * between two teams that were never actually matched up. Verified
 * against the real captured league: week 17 has 6 of 10 entries with
 * `matchup_id: null`, which must yield zero phantom games, not one.
 */
function pairSleeperMatchups(list: SleeperMatchup[]): [SleeperMatchup, SleeperMatchup][] {
  const paired = list.filter((m) => m.matchup_id != null)
  const byId = groupByMatchupId(paired)
  const out: [SleeperMatchup, SleeperMatchup][] = []
  for (const group of byId.values()) {
    if (group.length !== 2) continue
    out.push([group[0], group[1]])
  }
  return out
}

/**
 * A week where every entry has `points === 0` hasn't actually been
 * played yet — Sleeper returns zeroed entries for the upcoming week
 * from Tuesday until kickoff. Treat it as absent rather than as a
 * real (and league-wide impossible) 0-0 result; otherwise every
 * team's streak collapses to a fake tie and any average that sums
 * over it gets diluted by weeks that haven't happened.
 */
function weekHasBeenPlayed(list: SleeperMatchup[]): boolean {
  return list.some((m) => (m.points ?? 0) !== 0)
}

/**
 * Per-roster chronological W/L/T sequence, derived from head-to-head
 * `points` comparisons across completed regular-season weeks only
 * (weeks 1..`maxWeek`, skipping any week that hasn't been played).
 * Powers streak / lastSix on the standings row.
 *
 * `maxWeek` matters: Sleeper's own `roster.settings.wins/losses/ties`
 * — and its cached `metadata.record`/`metadata.streak` — never include
 * playoff weeks (verified against the real capture: `record` is 14
 * characters long because the regular season is 14 weeks, not because
 * the field is stale). Walking past `maxWeek` would tally playoff
 * results into a "record" that Sleeper's own data never does, putting
 * this walk's streak/lastSix out of sync with the row's own catWins/
 * catLosses (which do come from `roster.settings`) on the exact same
 * standings row.
 *
 * This walk is also deliberately NOT the source of the season W/L/T
 * totals — those come from `roster.settings` (see
 * `buildSleeperPointsStandings` below), which is Sleeper's
 * authoritative record and can include extra wins a league-average
 * scoring rule grants that a pure head-to-head walk can't see. This
 * walk is a recent-form signal only, bounded to agree with the totals
 * rather than to reproduce them independently.
 */
export function pointsWeeklyOutcomes(
  matchupsByWeek: Record<string, SleeperMatchup[]>,
  maxWeek: number,
): Map<number, WLT[]> {
  const out = new Map<number, WLT[]>()
  const weeks = Object.keys(matchupsByWeek)
    .map(Number)
    .filter((w) => w <= maxWeek)
    .sort((a, b) => a - b)
  for (const week of weeks) {
    const list = matchupsByWeek[String(week)] ?? []
    if (!weekHasBeenPlayed(list)) continue
    const pairs = pairSleeperMatchups(list)
    for (const [a, b] of pairs) {
      const ap = a.points ?? 0
      const bp = b.points ?? 0
      let aResult: WLT = 'T'
      let bResult: WLT = 'T'
      if (ap > bp) { aResult = 'W'; bResult = 'L' }
      else if (ap < bp) { aResult = 'L'; bResult = 'W' }
      pushOutcome(out, a.roster_id, aResult)
      pushOutcome(out, b.roster_id, bResult)
    }
  }
  return out
}

/**
 * Every roster's own score for each completed regular-season week.
 *
 * Reads each matchup ENTRY directly rather than pairing them. Sleeper
 * returns one entry per roster per week, each carrying that roster's own
 * points, so no pairing is needed — which is the point: this survives
 * byes, odd roster counts, `matchup_id: null` and median-match leagues
 * (`league_average_match: 1`, where a week holds more results than it
 * holds games) without any of the logic that pairing needs to get right.
 *
 * Only weeks that have actually been played are included; an unplayed
 * week reports every roster at 0, which would read as a league-wide
 * shutout rather than as an absence.
 */
function buildSleeperWeeklyScores(
  matchupsByWeek: Record<string, SleeperMatchup[]>,
  regularSeasonBoundWeek: number,
): PointsWeeklyScore[] {
  const out: PointsWeeklyScore[] = []
  const weeks = Object.keys(matchupsByWeek)
    .map(Number)
    .filter((w) => Number.isFinite(w) && w <= regularSeasonBoundWeek)
    .sort((a, b) => a - b)

  for (const week of weeks) {
    const list = matchupsByWeek[String(week)] ?? []
    if (!weekHasBeenPlayed(list)) continue
    for (const entry of list) {
      const points = entry.points
      if (typeof points !== 'number' || !Number.isFinite(points)) continue
      out.push({ teamId: String(entry.roster_id), week, points })
    }
  }
  return out
}

/**
 * Standings from `roster.settings` — Sleeper's authoritative season
 * record — not a matchup-by-matchup replay. Ranking sorts on win%
 * (wins + half of ties, so a 9-4-1 team doesn't rank below a plain
 * 9-5 team), then season points desc, dense 1..N — matching the
 * category path's own tiebreak order.
 */
function buildSleeperPointsStandings(
  rosters: SleeperRoster[],
  matchupsByWeek: Record<string, SleeperMatchup[]>,
  regularSeasonBoundWeek: number,
): CategoryLeagueDataStanding[] {
  const outcomesByRoster = pointsWeeklyOutcomes(matchupsByWeek, regularSeasonBoundWeek)

  const rows = rosters.map((r) => ({
    rosterId: r.roster_id,
    wins: r.settings?.wins ?? 0,
    losses: r.settings?.losses ?? 0,
    ties: r.settings?.ties ?? 0,
    fpts: sleeperPoints(r.settings?.fpts, r.settings?.fpts_decimal),
  }))

  rows.sort((a, b) => {
    const aScore = a.wins + 0.5 * a.ties
    const bScore = b.wins + 0.5 * b.ties
    if (bScore !== aScore) return bScore - aScore
    if (b.fpts !== a.fpts) return b.fpts - a.fpts
    return a.rosterId - b.rosterId
  })

  return rows.map((row, idx) => {
    const outcomes = outcomesByRoster.get(row.rosterId) ?? []
    const denom = row.wins + row.losses + row.ties
    return {
      rank: idx + 1,
      teamId: String(row.rosterId),
      // catWins/catLosses/catTies hold MATCHUP wins/losses/ties here —
      // a points league has no categories. Naming wart shared with the
      // Yahoo / ESPN points adapters; kept for consistency rather than
      // introducing a third name for the same concept.
      catWins: row.wins,
      catLosses: row.losses,
      catTies: row.ties,
      winPct: denom > 0 ? (row.wins + row.ties * 0.5) / denom : 0,
      streak: computeStreak(outcomes),
      lastSix: outcomes.slice(-6),
      ownsCount: 0,
      bleedingCount: 0,
    }
  })
}

/**
 * Season rank history: per-week standings as the season unfolded,
 * from cumulative head-to-head record, bounded to the same completed
 * regular-season weeks as `buildSleeperPointsStandings` (see
 * `pointsWeeklyOutcomes` for why this is a separate walk from the
 * final standings' win totals). Using the same bound + the same
 * win%-based ordering as the standings sort means the two can't
 * disagree about who's in third place the way an unbounded,
 * wins-only version could.
 */
function buildSleeperSeasonRankHistory(
  rosters: SleeperRoster[],
  matchupsByWeek: Record<string, SleeperMatchup[]>,
  regularSeasonBoundWeek: number,
): CategoryLeagueDataWeeklyRanks[] {
  const weeks = Object.keys(matchupsByWeek)
    .map(Number)
    .filter((w) => w <= regularSeasonBoundWeek)
    .sort((a, b) => a - b)
  const cumulative = new Map<number, { wins: number; ties: number; points: number }>()
  for (const r of rosters) cumulative.set(r.roster_id, { wins: 0, ties: 0, points: 0 })

  const history: CategoryLeagueDataWeeklyRanks[] = []
  for (const week of weeks) {
    const list = matchupsByWeek[String(week)] ?? []
    if (!weekHasBeenPlayed(list)) continue
    const pairs = pairSleeperMatchups(list)
    for (const [a, b] of pairs) {
      const aRec = cumulative.get(a.roster_id)
      const bRec = cumulative.get(b.roster_id)
      if (!aRec || !bRec) continue
      const ap = a.points ?? 0
      const bp = b.points ?? 0
      aRec.points += ap
      bRec.points += bp
      if (ap > bp) aRec.wins++
      else if (bp > ap) bRec.wins++
      else { aRec.ties++; bRec.ties++ }
    }

    const snapshot = rosters
      .map((r) => {
        const rec = cumulative.get(r.roster_id)!
        return {
          teamId: String(r.roster_id),
          score: rec.wins + 0.5 * rec.ties,
          points: rec.points,
        }
      })
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score
        if (b.points !== a.points) return b.points - a.points
        return Number(a.teamId) - Number(b.teamId)
      })

    const ranks: Record<string, number> = {}
    snapshot.forEach((row, idx) => (ranks[row.teamId] = idx + 1))
    history.push({ week, ranks })
  }
  return history
}

/**
 * Status is a per-WEEK property, not a per-LEAGUE one. `league.status`
 * ('pre_draft' | 'drafting' | 'in_season' | 'complete') tells you where
 * the SEASON is, not whether THIS week's games have been played and
 * closed out — during the entire `in_season` phase (i.e. the whole time
 * anyone is reading the magazine), the old `seasonComplete ? 'final' :
 * 'live'` mapping marked every current-week matchup 'live' forever,
 * which starved every points detector (they only look at 'final'
 * games) for the entire season.
 *
 * A tempting "fix" is to call the week closed once every roster has
 * scored something nonzero. That's wrong: Sleeper points ACCUMULATE
 * LIVE all game day, so "everyone has scored" is true within minutes
 * of the Sunday 1pm slate kicking off — from then until Tuesday
 * rollover (including the entire Monday delivery window, before
 * Monday Night Football) that heuristic would stamp the live week
 * 'final' and print a closed scoreboard over a game still being
 * played. Worse, `list.every(...)` is league-wide, so a single
 * abandoned 0-point roster pins the WHOLE league at 'live' forever —
 * the original bug in miniature. "Everyone has scored something" is
 * simply not a closure signal, so it plays no part here.
 *
 *  - No scoring at all yet (`weekHasBeenPlayed` false) → 'upcoming'.
 *  - The season itself is marked complete → 'final' (a genuinely
 *    closed season really is over, current week included).
 *  - Otherwise → 'live'. The current week is ALWAYS live while the
 *    season is in_season — closure for the current week is not
 *    something this function can honestly determine from Sleeper's
 *    per-roster point totals alone. Callers that need a genuinely
 *    finished week should look at the PREVIOUS week instead (see
 *    `buildSleeperPreviousWeekMatchups`), which is unambiguously over.
 */
function weekMatchupStatus(
  list: SleeperMatchup[],
  seasonComplete: boolean,
): LeagueDataPointsMatchup['status'] {
  if (!weekHasBeenPlayed(list)) return 'upcoming'
  return seasonComplete ? 'final' : 'live'
}

/** Current week's matchups for the Matchups page. Status comes from
 *  `weekMatchupStatus`: 'upcoming' when nobody has scored yet,
 *  otherwise 'final' exactly when the league-level `seasonComplete`
 *  flag says so and 'live' the rest of the time — the current week
 *  can never be honestly called closed from per-roster point totals
 *  alone (see `weekMatchupStatus`'s doc comment). */
function buildSleeperCurrentWeekMatchups(
  matchupsByWeek: Record<string, SleeperMatchup[]>,
  currentWeek: number,
  seasonComplete: boolean,
): LeagueDataPointsMatchup[] {
  const list = matchupsByWeek[String(currentWeek)] ?? []
  const pairs = pairSleeperMatchups(list)
  const status = weekMatchupStatus(list, seasonComplete)
  return pairs.map(([a, b]) => ({
    id: `wk${currentWeek}-${a.matchup_id}`,
    homeTeamId: String(a.roster_id),
    awayTeamId: String(b.roster_id),
    status,
    homePoints: a.points ?? 0,
    awayPoints: b.points ?? 0,
  }))
}

/**
 * Previous week's matchups, unconditionally stamped 'final'. Unlike
 * the current week (which can't be honestly called closed from
 * per-roster point totals — see `weekMatchupStatus` above), a
 * completed PRIOR week genuinely is final: Sleeper only moves
 * `leg`/the current week forward once the prior week's games are
 * done. Mirrors the Yahoo (`yahooAdapter.ts`) / ESPN
 * (`espnAdapter.ts`) adapters' `previousWeekMatchups` pattern, which
 * is what the football points detectors (`detection/points.ts`) and
 * the Beat's Monday recap (`render-beat-points.ts`) are built around:
 * a Monday recap is about the week that FINISHED, not the one still
 * in progress.
 *
 * Returns `[]` when there is no prior week (`currentWeek <= 1`) or
 * Sleeper hasn't returned that week's data yet (early-season visits) —
 * never fabricated.
 */
function buildSleeperPreviousWeekMatchups(
  matchupsByWeek: Record<string, SleeperMatchup[]>,
  currentWeek: number,
): LeagueDataPointsMatchup[] {
  const previousWeek = currentWeek - 1
  if (previousWeek < 1) return []
  const list = matchupsByWeek[String(previousWeek)] ?? []
  if (!weekHasBeenPlayed(list)) return []
  const pairs = pairSleeperMatchups(list)
  return pairs.map(([a, b]) => ({
    id: `wk${previousWeek}-${a.matchup_id}`,
    homeTeamId: String(a.roster_id),
    awayTeamId: String(b.roster_id),
    status: 'final' as const,
    homePoints: a.points ?? 0,
    awayPoints: b.points ?? 0,
  }))
}

/** Mean points scored across every captured team-week that has
 *  actually been played (see `weekHasBeenPlayed` — a week where every
 *  entry is still zeroed hasn't happened yet and would silently drag
 *  the average down). Not bounded to the regular season: playoff
 *  weeks are real scoring weeks too, and this is a league-wide
 *  scoring-pace stat, not a record. `undefined` when no weeks have
 *  been captured — never fabricated as 0. */
function computeWeeklyPointsAverage(
  matchupsByWeek: Record<string, SleeperMatchup[]>,
): number | undefined {
  let sum = 0
  let count = 0
  for (const week of Object.keys(matchupsByWeek)) {
    const list = matchupsByWeek[week] ?? []
    if (!weekHasBeenPlayed(list)) continue
    for (const m of list) {
      if (typeof m.points === 'number') {
        sum += m.points
        count++
      }
    }
  }
  return count > 0 ? sum / count : undefined
}

/**
 * Pure transform: raw Sleeper league/rosters/users/matchups → the
 * universal points-league contract. No I/O — see
 * `sleeperLeagueToPointsData` for the fetching counterpart.
 */
export function buildSleeperPointsData(raw: SleeperPointsRaw): LeagueDataH2HPoints {
  const { league, rosters, users, matchupsByWeek } = raw

  // No clock fallback here -- this function is documented PURE (see
  // the section header above: "no I/O, no clock, no randomness").
  // `league.season` is always present on real Sleeper data; if it's
  // ever missing or unparseable, Number(...) would silently resolve
  // to NaN, which then poisons every story signature downstream
  // (`NaN` joined into a string is the literal text "NaN"). Since a
  // `new Date()` clock read is off the table for a function documented
  // pure, fail loudly instead of smuggling NaN through.
  const seasonNum = Number(league.season)
  if (!Number.isFinite(seasonNum)) {
    throw new Error(
      `buildSleeperPointsData: league.season "${league.season}" did not parse to a finite number`,
    )
  }
  const currentSeason = seasonNum
  const currentWeek = clampWeek(league.settings?.leg ?? 1)

  // Sleeper returns 0 for playoff_week_start when the commissioner
  // never configured playoffs — that means "not configured", not "no
  // playoffs" (verified against the real captured league The
  // Megalabowl, which has playoff_week_start: 0 alongside a real
  // playoff_teams: 6 and a fully played-out season). A naive `- 1`
  // yields -1, which would stage the entire season as offseason.
  // Leave it undefined and let deriveSeasonStage's NFL fallback (14)
  // supply it — that fallback belongs in exactly one place.
  const pws = league.settings?.playoff_week_start
  const regularSeasonEndWeek = typeof pws === 'number' && pws > 0 ? pws - 1 : undefined

  const playoffCutoff =
    typeof league.settings?.playoff_teams === 'number' ? league.settings.playoff_teams : undefined

  // Reuse the category adapter's team-naming + avatar helper as-is —
  // it already implements the three-tier fallback this format needs
  // (metadata.team_name → display_name/username → `Team <roster_id>`)
  // and already resolves to a non-empty name for orphaned rosters
  // (owner_id: null → no user match → falls straight to the id form).
  const teams = buildTeams(rosters, users)

  // Both the standings walk (streak/lastSix) and the season rank
  // history must stop where Sleeper's own settings.wins/losses/ties
  // stop — the regular season — or they silently disagree with each
  // other and with the row's own catWins/catLosses. When the league
  // never configured playoffs (regularSeasonEndWeek undefined), fall
  // back to the NFL default rather than walking the entire capture.
  const regularSeasonBoundWeek = regularSeasonEndWeek ?? DEFAULT_END_WEEK_BY_SPORT.nfl

  const standings = buildSleeperPointsStandings(rosters, matchupsByWeek, regularSeasonBoundWeek)
  const seasonRankHistory = buildSleeperSeasonRankHistory(
    rosters,
    matchupsByWeek,
    regularSeasonBoundWeek,
  )
  const currentWeekMatchups = buildSleeperCurrentWeekMatchups(
    matchupsByWeek,
    currentWeek,
    league.status === 'complete',
  )
  const previousWeekMatchups = buildSleeperPreviousWeekMatchups(matchupsByWeek, currentWeek)
  const weeklyPointsAverage = computeWeeklyPointsAverage(matchupsByWeek)
  const weeklyScores = buildSleeperWeeklyScores(matchupsByWeek, regularSeasonBoundWeek)
  const draft = buildSleeperDraft(raw, currentSeason)

  return {
    format: 'h2h-points',
    sport: 'nfl',
    leagueId: league.league_id,
    leagueName: league.name || 'Sleeper League',
    currentWeek,
    currentSeason,
    playoffCutoff,
    regularSeasonEndWeek,
    teams,
    currentWeekMatchups,
    previousWeekMatchups,
    weeklyPointsAverage,
    standings,
    seasonRankHistory,
    weeklyScores,
    draft,
  }
}

/**
 * Fetch a Sleeper league's raw shapes and delegate to the pure
 * builder above. All I/O lives here; `buildSleeperPointsData` never
 * touches the network.
 */
export async function sleeperLeagueToPointsData(
  leagueId: string,
): Promise<LeagueDataH2HPoints> {
  let league: SleeperLeague
  try {
    league = await withCache(cacheKey(leagueId, 'league'), () =>
      sleeperService.getLeague(leagueId),
    )
  } catch {
    throw new Error(`Sleeper league ${leagueId} not found`)
  }

  const [users, rosters] = await Promise.all([
    withCache(cacheKey(leagueId, 'users'), () =>
      sleeperService.getLeagueUsers(leagueId),
    ),
    withCache(cacheKey(leagueId, 'rosters'), () =>
      sleeperService.getLeagueRosters(leagueId),
    ),
  ])

  if (!rosters || rosters.length === 0) {
    throw new Error(`Sleeper league ${leagueId} not found or has no rosters`)
  }

  const currentWeek = clampWeek(league.settings?.leg ?? 1)
  const matchupsByWeek = await fetchAllMatchupsAsRecord(leagueId, currentWeek)

  return buildSleeperPointsData({ league, rosters, users, matchupsByWeek })
}

/** Same fetch-with-cache-and-stop-on-404 behavior as `fetchAllMatchups`
 *  above, just returned as a plain object keyed by week — the shape
 *  `buildSleeperPointsData` (and the fixture) use. */
async function fetchAllMatchupsAsRecord(
  leagueId: string,
  upToWeek: number,
): Promise<Record<string, SleeperMatchup[]>> {
  const map = await fetchAllMatchups(leagueId, upToWeek)
  const out: Record<string, SleeperMatchup[]> = {}
  for (const [week, list] of map) out[String(week)] = list
  return out
}
