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
  WLT,
} from '../types'
import type {
  LeagueTransaction,
  TransactionKind,
  TransactionMovement,
} from '../transactions/types'
import { hydrateSnapshotDelta } from '../snapshots'
import { teamColorHash } from './colorHash'

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

const adapterCache = new Map<string, Promise<CategoryLeagueData>>()

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
}

export async function yahooLeagueToCategoryData(
  leagueKey: string,
  opts?: AdapterOptions,
): Promise<CategoryLeagueData> {
  if (!leagueKey || typeof leagueKey !== 'string') {
    throw new Error('Yahoo league key is required (format: "<gameKey>.l.<leagueId>")')
  }
  // Cache key includes the signed-in guid so two users on the same
  // device (rare, but possible) don't see each other's "my team" tint.
  // No guid → cache key matches the league key (single-user norm).
  const cacheToken = opts?.userIdentity?.yahooGuid
    ? `${leagueKey}::${opts.userIdentity.yahooGuid}`
    : leagueKey
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
): Promise<CategoryLeagueData> {
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
  const scoringType: string = metadata.scoring_type || 'head'   // 'head' = H2H cats; 'roto' = rotisserie
  const isRoto = scoringType === 'roto'

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
      )

  // Weekly cats-won + league average (Home page chart).
  const { weeklyCatsWon, weeklyLeagueAverage } = buildWeeklyCatTallies(
    rawStandings,
    matchupsByWeek,
    categories,
    catIdByStatId,
    isRoto,
  )

  // Multi-season history walk via `renew` chain.
  const seasonHistory = await buildSeasonHistory(metadata, leagueKey)

  // Career stats — current season + walked history.
  const teamCareerStats = buildTeamCareerStats(
    rawStandings,
    standings,
    seasonHistory,
    categories,
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

  const partialData: CategoryLeagueData = {
    leagueId: leagueKey,
    leagueName: deriveLeagueName(leagueSettingsRaw, leagueKey),
    currentWeek,
    currentSeason,
    playoffCutoff,
    regularSeasonEndWeek: metadata.endWeek,
    teams: teamList,
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
  }
  // Snapshot delta — overnight cat-tips, matchup pulse, rank shifts.
  const snapshotDelta = await hydrateSnapshotDelta(opts?.leagueRowId, partialData)

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

/* ─────────────────────────────────────────────────────────────────
   LEAGUE NAME
─────────────────────────────────────────────────────────────────── */

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
    for (const m of matchupsByWeek.get(week) ?? []) {
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
): CategoryLeagueDataMatchup[] {
  const list = matchupsByWeek.get(currentWeek) ?? []
  if (list.length === 0) return []
  const out: CategoryLeagueDataMatchup[] = []
  for (let i = 0; i < list.length; i++) {
    const m = list[i]
    if (!m.teams || m.teams.length < 2) continue
    const [home, away] = m.teams

    let homeCatWins = 0
    let awayCatWins = 0
    let ties = 0
    let decidedCount = 0
    for (const sw of m.stat_winners ?? []) {
      if (!catIdByStatId.has(String(sw.stat_id))) continue
      if (sw.is_tied) {
        ties++
        decidedCount++
      } else if (sw.winner_team_key === home.team_key) {
        homeCatWins++
        decidedCount++
      } else if (sw.winner_team_key === away.team_key) {
        awayCatWins++
        decidedCount++
      }
    }

    const contested = Math.max(0, categories.length - decidedCount)
    // Yahoo's `stat_winners` reflects the CURRENT mid-week leader per
    // cat, not the end-of-week winner. So a mid-week matchup can have
    // every cat "decided" (= someone is leading) without the matchup
    // itself being final. Use `winner_team_key` (set only after the
    // matchup closes) plus `is_tied` as the final signal.
    const isFinal = Boolean(m.winner_team_key) || m.is_tied === true
    const status: CategoryLeagueDataMatchup['status'] = isFinal
      ? 'final'
      : decidedCount > 0
      ? 'live'
      : 'upcoming'

    out.push({
      id: `wk${currentWeek}-${i}`,
      homeTeamId: home.team_key,
      awayTeamId: away.team_key,
      status,
      homeCatWins,
      awayCatWins,
      ties,
      contestedCount: contested,
      // catLines intentionally undefined — Yahoo's per-stat current
      // values are in `m.teams[i].stats[statId]` but the editorial
      // pipeline doesn't yet require the per-cat line breakout from
      // Yahoo. Follow-up: wire when consumers need it.
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

async function buildSeasonHistory(
  currentMetadata: Awaited<ReturnType<typeof yahooService.getLeagueMetadata>>,
  currentLeagueKey: string,
): Promise<CategoryLeagueDataSeasonHistory[]> {
  const out: CategoryLeagueDataSeasonHistory[] = []
  let renew = currentMetadata.renew
  let depth = 0
  const seen = new Set<string>([currentLeagueKey])

  while (renew && renew.includes('_') && depth < MAX_HISTORY_DEPTH) {
    const [gameKey, leagueId] = renew.split('_')
    const prevKey = `${gameKey}.l.${leagueId}`
    if (seen.has(prevKey)) break
    seen.add(prevKey)

    let prevStandings: any[]
    let prevMetadata: Awaited<ReturnType<typeof yahooService.getLeagueMetadata>>
    try {
      prevMetadata = await yahooService.getLeagueMetadata(prevKey)
      prevStandings = await yahooService.getStandings(prevKey)
    } catch (err) {
      console.warn(`[yahooAdapter] history walk stopped at ${prevKey}:`, err)
      break
    }
    if (!prevStandings || prevStandings.length === 0) break

    // Sort by rank ascending (1 = first place).
    const sorted = [...prevStandings].sort((a, b) => {
      const ar = a.rank ?? 999
      const br = b.rank ?? 999
      if (ar !== br) return ar - br
      return (b.wins ?? 0) - (a.wins ?? 0)
    })

    const champion = sorted[0]
    const runnerUp = sorted[1] ?? sorted[0]
    const basement = sorted[sorted.length - 1]
    if (!champion || !basement) break

    const year = parseInt(prevMetadata.season || '', 10) || (parseInt(currentMetadata.season || '', 10) || new Date().getFullYear()) - depth - 1

    out.push({
      year,
      championTeamId: champion.team_key,
      championRecord: recordString(champion),
      runnerUpTeamId: runnerUp.team_key,
      basementTeamId: basement.team_key,
    })

    renew = prevMetadata.renew
    depth++
  }

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
