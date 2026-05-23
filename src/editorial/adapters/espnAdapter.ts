/**
 * ESPN → CategoryLeagueData adapter.
 *
 * Pulls an ESPN baseball H2H_CATEGORY league's live shape into the
 * universal `CategoryLeagueData` contract the editorial pipeline
 * consumes. Mirrors the Sleeper adapter pattern.
 *
 * ESPN APIs consumed (all via `espnService`):
 *   - getLeague(sport, leagueId, season)        → league meta + settings
 *   - getTeams(sport, leagueId, season)         → teams (records + names)
 *   - getMembers(sport, leagueId, season)       → owner display names
 *   - getAllMatchups(sport, leagueId, season)   → per-week matchups
 *   - getCategoryStatsBreakdown(...)            → per-(team, cat) W/L/T
 *   - getDraftWithPlayers(...)                  → draft picks (optional)
 *   - getHistoricalTeams(...) (per prior year)  → season history
 *
 * Authentication:
 *   ESPN requires `espn_s2` and `swid` cookies for ANY league fetch
 *   through our Supabase proxy. Credentials come from one of:
 *     1) The UFD Chrome extension (preferred — auto-sync)
 *     2) Manual paste by user (saved via platformsStore)
 *     3) localStorage cache from a prior session
 *   When none are available we throw a clear error so the connect UI
 *   can surface the install/paste flow.
 */

import { espnService } from '@/services/espn'
import { usePlatformsStore } from '@/stores/platforms'
import { getEspnCookiesFromExtension } from '@/services/espnExtension'
import type {
  EspnLeague,
  EspnTeam,
  EspnMatchup,
  EspnMember,
} from '@/services/espn'
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
  CatSide,
  WLT,
} from '../types'
import type { LeagueTransaction, TransactionKind, TransactionMovement } from '../transactions/types'
import type { PlayerNight } from '../players/types'
import { buildPlayerNights, normalizeName } from '../players/buildPlayerNights'
import { teamColorHash } from './colorHash'

/* ─────────────────────────────────────────────────────────────────
   ESPN MLB STAT-ID → CANONICAL CAT MAPPING

   ESPN exposes stats as numeric IDs in `scoringItems` and in
   `cumulativeScore.scoreByStat`. We map each ID we care about to
   the canonical id (matches editorial `HomeCatId`). Hitting and
   pitching are tagged so editorial knows which side of the ledger
   each category lives on. `lowerIsBetter` flips the rank-sort.

   NOTE: ESPN uses multiple IDs for "same" stat (RBI=4 and =23,
   R=2 and =32, HR=3 and =33, IP=17 and =41, ER=40 and =42, etc.)
   depending on which scoring path produced the value. We map BOTH
   sides to the same canonical id and de-dupe downstream.
─────────────────────────────────────────────────────────────────*/

interface CatDef {
  id: string                // canonical id (matches editorial HomeCatId)
  label: string
  name: string
  side: CatSide
  lowerIsBetter?: boolean   // ERA / WHIP / OBA / TO / GA
}

/** Canonical baseball categories the editorial library knows. */
const CAT_DEFS: Record<string, CatDef> = {
  R:    { id: 'R',    label: 'R',    name: 'Runs',           side: 'hit' },
  H:    { id: 'H',    label: 'H',    name: 'Hits',           side: 'hit' },
  HR:   { id: 'HR',   label: 'HR',   name: 'Home Runs',      side: 'hit' },
  RBI:  { id: 'RBI',  label: 'RBI',  name: 'RBI',            side: 'hit' },
  SB:   { id: 'SB',   label: 'SB',   name: 'Stolen Bases',   side: 'hit' },
  AVG:  { id: 'AVG',  label: 'AVG',  name: 'Batting Avg',    side: 'hit' },
  OPS:  { id: 'OPS',  label: 'OPS',  name: 'OPS',            side: 'hit' },
  TB:   { id: 'TB',   label: 'TB',   name: 'Total Bases',    side: 'hit' },
  BB:   { id: 'BB',   label: 'BB',   name: 'Walks',          side: 'hit' },
  W:    { id: 'W',    label: 'W',    name: 'Wins',           side: 'pit' },
  SV:   { id: 'SV',   label: 'SV',   name: 'Saves',          side: 'pit' },
  K:    { id: 'K',    label: 'K',    name: 'Strikeouts',     side: 'pit' },
  HLD:  { id: 'HLD',  label: 'HLD',  name: 'Holds',          side: 'pit' },
  ERA:  { id: 'ERA',  label: 'ERA',  name: 'ERA',            side: 'pit', lowerIsBetter: true },
  WHIP: { id: 'WHIP', label: 'WHIP', name: 'WHIP',           side: 'pit', lowerIsBetter: true },
  QS:   { id: 'QS',   label: 'QS',   name: 'Quality Starts', side: 'pit' },
  K9:   { id: 'K9',   label: 'K/9',  name: 'K/9',            side: 'pit' },
}

/**
 * ESPN baseball numeric stat IDs → canonical cat id.
 *
 * Both batting and pitching "duplicate" IDs (e.g. RBI=4 and RBI=23,
 * HR=3 and HR=33) collapse onto the same canonical key — the
 * adapter is responsible for surface dedup later.
 */
const ESPN_STAT_TO_CAT_ID: Record<string, string> = {
  // Hitting
  '2':  'R',
  '32': 'R',
  '1':  'H',
  '3':  'HR',
  '33': 'HR',
  '4':  'RBI',
  '23': 'RBI',
  '5':  'SB',
  '6':  'BB',
  '8':  'OPS',
  '11': 'AVG',
  '19': 'TB',
  '34': 'TB',
  // Pitching
  '35': 'W',
  '37': 'SV',
  '38': 'HLD',
  '43': 'K',
  '47': 'ERA',
  '48': 'WHIP',
  '63': 'QS',
  '68': 'K9',
  '71': 'HLD',   // SV+HD bucket collapses to HLD when no separate HD stat
}

/** Standard 11-cat baseball fallback if no scoring config is exposed. */
const DEFAULT_CATS: string[] = ['R', 'H', 'HR', 'RBI', 'SB', 'AVG', 'W', 'SV', 'K', 'HLD', 'ERA']

/* ─────────────────────────────────────────────────────────────────
   SESSION CACHE — keyed by leagueId+endpoint+season+week
─────────────────────────────────────────────────────────────────*/

const sessionCache = new Map<string, unknown>()
function cacheKey(leagueId: string, endpoint: string, season?: number, week?: number): string {
  const parts = [leagueId, endpoint]
  if (season != null) parts.push(String(season))
  if (week != null) parts.push(`w${week}`)
  return parts.join(':')
}
async function withCache<T>(key: string, fn: () => Promise<T>): Promise<T> {
  if (sessionCache.has(key)) return sessionCache.get(key) as T
  const value = await fn()
  sessionCache.set(key, value)
  return value
}

/* ─────────────────────────────────────────────────────────────────
   AUTH RESOLUTION

   Try, in order:
     1) Already-set credentials on espnService (warm session)
     2) platformsStore.getEspnCredentials() — localStorage + Supabase
     3) Chrome extension via getEspnCookiesFromExtension()
   Apply the first available pair to espnService and return true.
─────────────────────────────────────────────────────────────────*/

async function ensureEspnCredentials(): Promise<boolean> {
  if (espnService.hasCredentials()) return true

  // Path 2: stored credentials (localStorage / Supabase cross-device sync).
  try {
    const platformsStore = usePlatformsStore()
    const stored = platformsStore.getEspnCredentials()
    if (stored?.espn_s2 && stored?.swid) {
      espnService.setCredentials(stored.espn_s2, stored.swid)
      return true
    }
  } catch (err) {
    // Pinia store may not be active in some test contexts — swallow.
    console.warn('[espnAdapter] platformsStore unavailable for credential lookup:', err)
  }

  // Path 3: Chrome extension cookie pull.
  try {
    const fromExt = await getEspnCookiesFromExtension()
    if (fromExt.espn_s2 && fromExt.swid) {
      espnService.setCredentials(fromExt.espn_s2, fromExt.swid)
      // Persist for next time so we don't re-prompt the extension.
      try {
        const platformsStore = usePlatformsStore()
        // Fire-and-forget; failures are non-fatal — we still have creds for this session.
        platformsStore.storeEspnCredentials({
          espn_s2: fromExt.espn_s2,
          swid: fromExt.swid,
          leagueId: '0',
          sport: 'baseball',
          season: new Date().getFullYear(),
        }).catch(() => {})
      } catch {
        // Ignore store unavailability.
      }
      return true
    }
  } catch (err) {
    console.warn('[espnAdapter] extension credential fetch failed:', err)
  }

  return false
}

/* ─────────────────────────────────────────────────────────────────
   PUBLIC API
─────────────────────────────────────────────────────────────────*/

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
}

export async function espnLeagueToCategoryData(
  leagueId: string,
  opts?: AdapterOptions,
): Promise<CategoryLeagueData> {
  // 0. Credentials are mandatory for ESPN's proxy path — even public
  //    leagues hit the auth-required Supabase edge function.
  const hasCreds = await ensureEspnCredentials()
  if (!hasCreds) {
    throw new Error(
      'ESPN credentials required. Install the UFD Chrome extension or paste your cookies.',
    )
  }

  // 1. League meta — use current season for the season-active path.
  //    ESPN keeps the same leagueId across seasons; we walk backward
  //    a year if the current season isn't accessible yet.
  const sport = 'baseball' as const
  const currentSeason = espnService.getCurrentSeason(sport)

  let league: EspnLeague | null = null
  try {
    league = await withCache(cacheKey(leagueId, 'league', currentSeason), () =>
      espnService.getLeague(sport, leagueId, currentSeason),
    )
  } catch (err) {
    const msg = (err as Error).message || ''
    if (/private league|403/i.test(msg)) {
      throw new Error(
        'ESPN credentials rejected (private league). Re-install the UFD Chrome extension or paste fresh cookies.',
      )
    }
    if (/not authenticated|401|sign in/i.test(msg)) {
      throw new Error(
        'Not signed in to Ultimate Fantasy Dashboard. Please sign in and try again.',
      )
    }
    throw new Error(
      `ESPN league ${leagueId} not found for ${sport} ${currentSeason}: ${msg}`,
    )
  }
  if (!league) {
    // Try prior season as a fallback for off-season visits.
    try {
      league = await withCache(cacheKey(leagueId, 'league', currentSeason - 1), () =>
        espnService.getLeague(sport, leagueId, currentSeason - 1),
      )
    } catch {
      league = null
    }
  }
  if (!league) {
    throw new Error(
      `ESPN league ${leagueId} not found or has no category scoring data`,
    )
  }

  const season = league.seasonId || currentSeason
  const currentWeek = clampWeek(league.status?.currentMatchupPeriod ?? 1)
  const playoffCutoff = league.settings?.playoffTeamCount || 6

  // Last week of the regular season — drives season-stage detection
  // so editorial copy like "Four weeks left to settle the bubble"
  // is anchored to the league's actual schedule rather than the
  // demo fixture's 12-week assumption. ESPN exposes the count of
  // regular-season matchup periods at
  // `settings.scheduleSettings.matchupPeriodCount` (or the
  // `regularSeasonMatchupPeriodCount` shortcut), with playoff
  // periods stacked on top.
  const regularSeasonEndWeek =
    (league.settings as any)?.scheduleSettings?.matchupPeriodCount
    ?? league.settings?.regularSeasonMatchupPeriodCount
    ?? undefined

  // 2. Teams + members in parallel.
  const [teams, members] = await Promise.all([
    withCache(cacheKey(leagueId, 'teams', season), () =>
      espnService.getTeams(sport, leagueId, season),
    ),
    withCache(cacheKey(leagueId, 'members', season), () =>
      espnService.getMembers(sport, leagueId, season),
    ),
  ])
  if (!teams || teams.length === 0) {
    throw new Error(
      `ESPN league ${leagueId} returned no teams — league may be unavailable for ${season}`,
    )
  }

  // 3. All matchups for the season (per-week map).
  const matchupsByWeek = await withCache(
    cacheKey(leagueId, 'matchups-all', season),
    () => espnService.getAllMatchups(sport, leagueId, season),
  )

  // 4. Category-stats breakdown (per-team per-cat W/L/T plus active cat list).
  //    This already handles the hard work of walking every completed
  //    week and assembling real per-(team,cat) wins from ESPN's
  //    `scoreByStat` (or ROTO fallback when scoreByStat is null).
  let breakdown: Awaited<ReturnType<typeof espnService.getCategoryStatsBreakdown>>
  try {
    breakdown = await withCache(cacheKey(leagueId, 'cat-breakdown', season), () =>
      espnService.getCategoryStatsBreakdown(sport, leagueId, season),
    )
  } catch (err) {
    console.warn('[espnAdapter] cat-breakdown failed; using empty placeholder:', err)
    breakdown = {
      categories: [],
      teamCategoryWins: new Map(),
      teamCategoryLosses: new Map(),
      teamCategoryTies: new Map(),
      teamTotalCategoryWins: new Map(),
      teamTotalCategoryLosses: new Map(),
      hasRealStatValues: false,
    }
  }

  // 5. Build the editorial-shaped category list. Use breakdown's
  //    active categories if discovered, else default 11-cat baseball.
  const categories = resolveCategories(league, breakdown)

  // 6. Teams (CategoryLeagueDataTeam shape). The caller can override
  //    the swid used for "my team" matching — useful when the platforms
  //    store has a different account loaded than espnService.
  const teamsOut = buildTeams(teams, members, opts?.userIdentity?.espnSwid)

  // 7. Standings — per-team cat W/L/T from breakdown, ordered by win%.
  const standings = buildStandings(teams, breakdown, matchupsByWeek)

  // 8. Per-category ranks across the season — from per-cat W tallies
  //    (more wins in a cat = higher rank). Ratio cats (ERA/WHIP) still
  //    rank descending by wins because ESPN already encodes "more wins
  //    means better at the cat" inside the breakdown.
  const categoryRanks = buildCategoryRanks(teams, categories, breakdown, standings)

  // 9. Season rank history — cumulative records per week.
  const seasonRankHistory = buildSeasonRankHistory(teams, matchupsByWeek)

  // 10. Current week's matchups.
  const matchupsCurrentWeek = buildCurrentWeekMatchups(
    matchupsByWeek,
    categories,
    currentWeek,
  )

  // 11. Weekly cats-won tallies (Home page chart).
  const { weeklyCatsWon, weeklyLeagueAverage } = buildWeeklyCatTallies(
    teams,
    matchupsByWeek,
    categories,
  )

  // 12. Season history walk (prior years).
  const seasonHistory = await buildSeasonHistory(leagueId, season)

  // 13. Team career stats (this season + history).
  const teamCareerStats = buildTeamCareerStats(
    teams,
    standings,
    seasonHistory,
    categories,
  )

  // 14. All-time H2H matrix (current season; prior seasons opt-in).
  const h2hMatrix = buildH2HMatrix(teams, matchupsByWeek)

  // 15. Draft (optional).
  const draft = await buildDraft(leagueId, season)

  // 16. League transactions (trades, FAAB winners, waiver claims).
  //     Failure is non-fatal — when ESPN's transactions endpoint
  //     errors or returns nothing, transaction detectors quietly
  //     skip and the rest of the page renders unchanged.
  const transactions = await buildTransactions(leagueId, season, league)

  // 17. Yesterday's player nights — match rostered players by
  //     normalized name against MLB Stats API box scores. ESPN
  //     uses its own player IDs (not MLB IDs), so name matching
  //     is our only path.
  const playerNights = await buildEspnPlayerNights(league)

  // Division metadata — drives the new division-aware detection
  // layer (division-race-tight, division-clash, divisional-wild-card,
  // etc.). Returns undefined for single-table leagues; downstream
  // detectors no-op when the field is absent.
  const divisions = buildDivisions(league)

  return {
    leagueId,
    leagueName: league.name || `ESPN League ${leagueId}`,
    currentWeek,
    currentSeason: season,
    playoffCutoff,
    regularSeasonEndWeek,
    divisions,
    teams: teamsOut,
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
  }
}

/* ─────────────────────────────────────────────────────────────────
   ESPN PLAYER NIGHTS — name-based matching

   ESPN player IDs are platform-specific; they don't map to MLB
   Stats API IDs. We build a normalized-name → teamId[] index from
   each team's roster entries, then the shared buildPlayerNights
   helper uses that for ownership matching.
─────────────────────────────────────────────────────────────────*/

async function buildEspnPlayerNights(league: EspnLeague): Promise<PlayerNight[]> {
  try {
    const rosterByName = new Map<string, string[]>()
    for (const team of league.teams ?? []) {
      const teamId = String(team.id)
      const entries = (team.roster?.entries ?? []) as any[]
      for (const e of entries) {
        const fullName = e.playerPoolEntry?.player?.fullName
        if (!fullName) continue
        const key = normalizeName(fullName)
        const existing = rosterByName.get(key)
        if (existing) existing.push(teamId)
        else rosterByName.set(key, [teamId])
      }
    }
    return await buildPlayerNights({ rosterByName, includeUnowned: true })
  } catch (err) {
    console.warn('[espnAdapter] player nights failed:', err)
    return []
  }
}

/* ─────────────────────────────────────────────────────────────────
   STEP 5 — CATEGORY RESOLUTION
─────────────────────────────────────────────────────────────────*/

function resolveCategories(
  league: EspnLeague,
  breakdown: Awaited<ReturnType<typeof espnService.getCategoryStatsBreakdown>>,
): CategoryLeagueDataCategory[] {
  const found: CategoryLeagueDataCategory[] = []
  const seen = new Set<string>()

  // Preferred path: breakdown.categories is the post-filtered active
  // category list (ESPN scoreByStat-derived for most leagues).
  for (const cat of breakdown.categories) {
    const canonical = ESPN_STAT_TO_CAT_ID[cat.stat_id]
    if (!canonical) continue
    if (seen.has(canonical)) continue
    const def = CAT_DEFS[canonical]
    if (!def) continue
    seen.add(canonical)
    found.push({ id: def.id, label: def.label, name: def.name, side: def.side })
  }

  if (found.length >= 4) return found

  // Fallback path: derive from scoringItems on the league settings.
  const scoringItems: Array<{ statId?: number; id?: number }> =
    league.settings?.scoringSettings?.scoringItems ?? []
  for (const item of scoringItems) {
    const id = String(item.statId ?? item.id ?? '')
    if (!id) continue
    const canonical = ESPN_STAT_TO_CAT_ID[id]
    if (!canonical) continue
    if (seen.has(canonical)) continue
    const def = CAT_DEFS[canonical]
    if (!def) continue
    seen.add(canonical)
    found.push({ id: def.id, label: def.label, name: def.name, side: def.side })
  }

  if (found.length >= 4) return found

  // Last resort: standard 11-cat baseball so the editorial pipeline
  // still has something to detect against.
  console.warn(
    `[espnAdapter] League ${league.id}: no recognized category scoring keys ` +
    `(breakdown=${breakdown.categories.length}, scoringItems=${scoringItems.length}). ` +
    `Falling back to standard 11-cat baseball.`,
  )
  return DEFAULT_CATS.map((id) => {
    const def = CAT_DEFS[id]!
    return { id: def.id, label: def.label, name: def.name, side: def.side }
  })
}

/* ─────────────────────────────────────────────────────────────────
   STEP 6 — TEAMS
─────────────────────────────────────────────────────────────────*/

function buildTeams(
  teams: EspnTeam[],
  members: EspnMember[],
  overrideSwid?: string,
): CategoryLeagueDataTeam[] {
  const memberById = new Map<string, EspnMember>()
  for (const m of members) memberById.set(m.id, m)

  // Resolve current "my team" via the credentials' SWID, if known.
  // Prefer the explicit overrideSwid the view passed in; fall back to
  // the swid already cached on the platforms store (the legacy path).
  const mySwid = normalizeSwid(overrideSwid ?? getSwid())

  return teams.map((t) => {
    const ownerId = t.primaryOwner || t.owners?.[0] || ''
    const member = ownerId ? memberById.get(ownerId) : undefined
    const ownerName = t.ownerName
      || (member ? `${member.firstName} ${member.lastName}`.trim() || member.displayName : '')
      || `Manager ${t.id}`
    const teamName = t.name?.trim() || `Team ${t.id}`
    const isMyTeam = mySwid
      ? (t.owners || []).some((o) => normalizeSwid(o) === mySwid)
      : false

    return {
      id: String(t.id),
      name: teamName,
      ownerName,
      ownerInitials: initialsOf(ownerName),
      // ESPN logo URLs go through our image proxy so that the
      // auth-gated mystique-api.fantasy.espn.com custom uploads
      // actually load. See proxyEspnAvatarUrl below for the rewrite
      // logic + cookie forwarding.
      avatarUrl: t.logo ? proxyEspnAvatarUrl(t.logo) : undefined,
      avatarColor: teamColorHash(`espn:${t.id}:${teamName}`),
      isMyTeam,
      // ESPN divisions: each team carries a numeric `divisionId`;
      // 0 means "no division" (single-table leagues). Editorial
      // detectors gate division stories on the presence of a
      // non-empty `divisions` array, so we leave divisionId
      // undefined when ESPN reports 0.
      divisionId:
        t.divisionId && t.divisionId > 0
          ? `espn-div-${t.divisionId}`
          : undefined,
    }
  })
}

/**
 * Surface ESPN's division metadata onto the editorial contract.
 * `settings.scheduleSettings.divisions` is an array of
 * `{ id, name, size }`; we map id → our namespaced id so it lines up
 * with each team's `divisionId`. Returns undefined for single-table
 * leagues (zero or one division).
 */
function buildDivisions(
  league: EspnLeague,
): { id: string; name: string }[] | undefined {
  const raw = (league.settings as any)?.scheduleSettings?.divisions
  if (!Array.isArray(raw) || raw.length < 2) return undefined
  return raw.map((d: any, idx: number) => ({
    id: `espn-div-${d?.id ?? idx}`,
    name: typeof d?.name === 'string' && d.name.length > 0
      ? d.name
      : `Division ${idx + 1}`,
  }))
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '??'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function getSwid(): string | null {
  // espnService doesn't expose credentials publicly; we read off the
  // platformsStore copy instead. Failure to access is non-fatal.
  try {
    const platformsStore = usePlatformsStore()
    return platformsStore.getEspnCredentials()?.swid ?? null
  } catch {
    return null
  }
}

/* ─────────────────────────────────────────────────────────────────
   AVATAR URL PROXYING
───────────────────────────────────────────────────────────────── */

/** ESPN domains that gate their image responses behind the user's
 *  espn_s2 + swid cookies. <img> tags can't pass cookies cross-
 *  origin so these always 401 when loaded directly. We rewrite them
 *  to hit /api/proxy-image instead, which adds the cookies server-
 *  side and re-serves with permissive CORS. */
const ESPN_AUTH_AVATAR_HOSTS = new Set([
  'mystique-api.fantasy.espn.com',
])

/**
 * Rewrite an ESPN team-logo URL so it loads through our image proxy.
 * No-op for URLs that don't need proxying (public ESPN CDNs work
 * fine cross-origin).
 *
 * For auth-gated hosts, we attach the user's espn_s2 + swid as
 * query params so the proxy can forward them as a Cookie header.
 * The cookies live in platformsStore; if they're not available the
 * proxy will still try without them (will 401 → transparent PNG).
 */
function proxyEspnAvatarUrl(url: string): string {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return url
  }

  if (!ESPN_AUTH_AVATAR_HOSTS.has(parsed.hostname)) {
    // Public CDN — return as-is. <img> tags load these cross-origin
    // without issue.
    return url
  }

  // Auth-gated — rewrite to proxy. Pull cookies from the platforms
  // store; if missing, the proxy will return a transparent PNG and
  // the @error handler downstream falls back to the type-led layout.
  const proxied = new URL('/api/proxy-image', window.location.origin)
  proxied.searchParams.set('url', url)

  try {
    const platformsStore = usePlatformsStore()
    const creds = platformsStore.getEspnCredentials()
    if (creds?.espn_s2 && creds?.swid) {
      proxied.searchParams.set('espn_s2', creds.espn_s2)
      proxied.searchParams.set('swid', creds.swid)
    }
  } catch {
    /* No credentials available — proxy will try without and 401. */
  }

  return proxied.toString()
}

function normalizeSwid(swid: string | null): string | null {
  if (!swid) return null
  return swid.replace(/^\{|\}$/g, '').toUpperCase()
}

/* ─────────────────────────────────────────────────────────────────
   STEP 7 — STANDINGS

   ESPN's breakdown gives us per-team total cat W/L (real for leagues
   with scoreByStat data, ROTO-derived otherwise). Streak + last-six
   come from per-week matchup outcomes; we compute those from the
   week-by-week matchup map by comparing per-week categoryWins.
─────────────────────────────────────────────────────────────────*/

function buildStandings(
  teams: EspnTeam[],
  breakdown: Awaited<ReturnType<typeof espnService.getCategoryStatsBreakdown>>,
  matchupsByWeek: Map<number, EspnMatchup[]>,
): CategoryLeagueDataStanding[] {
  const weeklyOutcomes = computeWeeklyOutcomes(matchupsByWeek)

  const rows = teams.map((t) => {
    const key = `espn_${t.id}`
    const catWins = breakdown.teamTotalCategoryWins.get(key)
      ?? t.categoryWins
      ?? 0
    const catLosses = breakdown.teamTotalCategoryLosses.get(key)
      ?? t.categoryLosses
      ?? 0
    // Sum per-cat ties since breakdown doesn't expose a total.
    const catTiesMap = breakdown.teamCategoryTies.get(key) ?? {}
    const catTies = Object.values(catTiesMap).reduce((a, b) => a + b, 0)

    const denom = catWins + catLosses + catTies
    const winPct = denom > 0 ? (catWins + catTies * 0.5) / denom : 0

    const teamOutcomes = weeklyOutcomes.get(t.id) ?? []
    const lastSix = teamOutcomes.slice(-6)
    const streak = computeStreak(teamOutcomes)

    return {
      teamId: String(t.id),
      catWins,
      catLosses,
      catTies,
      winPct,
      streak,
      lastSix,
      ownsCount: 0,         // populated in buildCategoryRanks
      bleedingCount: 0,     // populated in buildCategoryRanks
      rank: 0,
    } as CategoryLeagueDataStanding
  })

  rows.sort((a, b) => {
    if (b.winPct !== a.winPct) return b.winPct - a.winPct
    if (b.catWins !== a.catWins) return b.catWins - a.catWins
    return Number(a.teamId) - Number(b.teamId)
  })
  rows.forEach((row, idx) => (row.rank = idx + 1))
  return rows
}

function computeWeeklyOutcomes(
  matchupsByWeek: Map<number, EspnMatchup[]>,
): Map<number, WLT[]> {
  const out = new Map<number, WLT[]>()
  const weeks = [...matchupsByWeek.keys()].sort((a, b) => a - b)
  for (const week of weeks) {
    const list = matchupsByWeek.get(week) ?? []
    for (const m of list) {
      if (!m.awayTeamId) continue   // bye
      if (!m.winner || m.winner === 'UNDECIDED') continue
      let homeR: WLT = 'T'
      let awayR: WLT = 'T'
      if (m.winner === 'HOME')      { homeR = 'W'; awayR = 'L' }
      else if (m.winner === 'AWAY') { homeR = 'L'; awayR = 'W' }
      // TIE → both 'T'
      pushOutcome(out, m.homeTeamId, homeR)
      pushOutcome(out, m.awayTeamId, awayR)
    }
  }
  return out
}

function pushOutcome(map: Map<number, WLT[]>, teamId: number, r: WLT): void {
  const arr = map.get(teamId) ?? []
  arr.push(r)
  map.set(teamId, arr)
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
   STEP 8 — CATEGORY RANKS

   For each canonical cat, sort teams by their per-cat W tally
   (descending; ESPN's breakdown already inverts ERA/WHIP wins so
   "more wins" universally = "better at that cat"). Recompute
   owns/bleeding once ranks land.
─────────────────────────────────────────────────────────────────*/

function buildCategoryRanks(
  teams: EspnTeam[],
  categories: CategoryLeagueDataCategory[],
  breakdown: Awaited<ReturnType<typeof espnService.getCategoryStatsBreakdown>>,
  standings: CategoryLeagueDataStanding[],
): CategoryLeagueDataCategoryRank[] {
  const teamCount = teams.length

  // Build canonical-cat → stat-id list so we can sum across ESPN's
  // duplicated IDs (RBI=4 + 23, R=2 + 32, etc.).
  const catToStatIds = new Map<string, string[]>()
  for (const [statId, canonical] of Object.entries(ESPN_STAT_TO_CAT_ID)) {
    const arr = catToStatIds.get(canonical) ?? []
    arr.push(statId)
    catToStatIds.set(canonical, arr)
  }

  const out: CategoryLeagueDataCategoryRank[] = teams.map((t) => ({
    teamId: String(t.id),
    catRanks: {} as Record<string, number>,
  }))

  for (const cat of categories) {
    const statIds = catToStatIds.get(cat.id) ?? []
    const values: { teamId: string; wins: number }[] = []
    for (const t of teams) {
      const key = `espn_${t.id}`
      const catWins = breakdown.teamCategoryWins.get(key) ?? {}
      let wins = 0
      for (const sid of statIds) {
        wins += catWins[sid] ?? 0
      }
      values.push({ teamId: String(t.id), wins })
    }
    // Sort by wins desc, stable by teamId asc.
    values.sort((a, b) => {
      if (b.wins !== a.wins) return b.wins - a.wins
      return Number(a.teamId) - Number(b.teamId)
    })

    // If nobody has any wins recorded for this cat, leave at rank 0
    // (sentinel — editorial code treats 0 as "not applicable").
    const anyWins = values.some((v) => v.wins > 0)
    if (!anyWins) {
      for (const row of out) row.catRanks[cat.id] = 0
      continue
    }
    values.forEach((entry, idx) => {
      const row = out.find((r) => r.teamId === entry.teamId)!
      row.catRanks[cat.id] = idx + 1
    })
  }

  // Recompute owns/bleeding from real ranks. Sentinel 0s are ignored.
  for (const s of standings) {
    const ranks = out.find((r) => r.teamId === s.teamId)?.catRanks ?? {}
    const realRanks = Object.values(ranks).filter((r) => r > 0)
    s.ownsCount = realRanks.filter((r) => r <= 3).length
    s.bleedingCount = realRanks.filter((r) => r >= teamCount - 2).length
  }

  return out
}

/* ─────────────────────────────────────────────────────────────────
   STEP 9 — SEASON RANK HISTORY

   For each completed week, build the standings as of close-of-week
   using cumulative overall W/L from per-week winner field, then
   snapshot ranks. Tiebreakers match the live standings sort.
─────────────────────────────────────────────────────────────────*/

function buildSeasonRankHistory(
  teams: EspnTeam[],
  matchupsByWeek: Map<number, EspnMatchup[]>,
): CategoryLeagueDataWeeklyRanks[] {
  const weeks = [...matchupsByWeek.keys()].sort((a, b) => a - b)
  const cumulative = new Map<number, { wins: number; losses: number; ties: number }>()
  for (const t of teams) cumulative.set(t.id, { wins: 0, losses: 0, ties: 0 })

  const history: CategoryLeagueDataWeeklyRanks[] = []

  for (const week of weeks) {
    const list = matchupsByWeek.get(week) ?? []
    // Only count weeks where every non-bye matchup has been officially decided.
    const nonBye = list.filter((m) => m.awayTeamId)
    const allDecided = nonBye.length > 0 &&
      nonBye.every((m) => m.winner && m.winner !== 'UNDECIDED')
    if (!allDecided) continue

    for (const m of nonBye) {
      const hRec = cumulative.get(m.homeTeamId)
      const aRec = cumulative.get(m.awayTeamId)
      if (!hRec || !aRec) continue
      if (m.winner === 'HOME')      { hRec.wins++;   aRec.losses++ }
      else if (m.winner === 'AWAY') { hRec.losses++; aRec.wins++ }
      else if (m.winner === 'TIE')  { hRec.ties++;   aRec.ties++ }
    }

    const snapshot = teams
      .map((t) => {
        const rec = cumulative.get(t.id)!
        const played = rec.wins + rec.losses + rec.ties
        const pct = played > 0 ? rec.wins / played : 0
        return { teamId: String(t.id), pct, wins: rec.wins }
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
   STEP 10 — CURRENT-WEEK MATCHUPS

   Uses ESPN's per-matchup `homePerCategoryResults` /
   `awayPerCategoryResults` to count current cats won. Status:
     'live'     — current week with data
     'final'    — winner has been decided
     'upcoming' — current week with no data yet
─────────────────────────────────────────────────────────────────*/

function buildCurrentWeekMatchups(
  matchupsByWeek: Map<number, EspnMatchup[]>,
  categories: CategoryLeagueDataCategory[],
  currentWeek: number,
): CategoryLeagueDataMatchup[] {
  const list = matchupsByWeek.get(currentWeek) ?? []
  if (list.length === 0) return []

  const out: CategoryLeagueDataMatchup[] = []
  for (const m of list) {
    if (!m.awayTeamId) continue   // bye
    const homeCatWins = m.homeCategoryWins ?? 0
    const awayCatWins = m.awayCategoryWins ?? 0
    const ties = (m.homeCategoryTies ?? 0)
    const decidedTotal = homeCatWins + awayCatWins + ties
    const contestedCount = Math.max(0, categories.length - decidedTotal)
    const hasData = decidedTotal > 0
    let status: CategoryLeagueDataMatchup['status']
    if (m.winner && m.winner !== 'UNDECIDED') status = 'final'
    else if (hasData) status = 'live'
    else status = 'upcoming'

    out.push({
      id: `wk${currentWeek}-${m.id}`,
      homeTeamId: String(m.homeTeamId),
      awayTeamId: String(m.awayTeamId),
      status,
      homeCatWins,
      awayCatWins,
      ties,
      contestedCount,
      // catLines intentionally undefined for now — needs raw stat values
      // mapped per-canonical-cat with "decided" detection per ESPN.
    })
  }
  return out
}

/* ─────────────────────────────────────────────────────────────────
   STEP 11 — WEEKLY CATS-WON TALLIES (Home page chart)
─────────────────────────────────────────────────────────────────*/

function buildWeeklyCatTallies(
  teams: EspnTeam[],
  matchupsByWeek: Map<number, EspnMatchup[]>,
  categories: CategoryLeagueDataCategory[],
): { weeklyCatsWon: Record<string, number[]>; weeklyLeagueAverage: number[] } {
  const weeks = [...matchupsByWeek.keys()].sort((a, b) => a - b)
  const weeklyCatsWon: Record<string, number[]> = {}
  for (const t of teams) weeklyCatsWon[String(t.id)] = []
  const weeklyLeagueAverage: number[] = []

  for (const week of weeks) {
    const list = matchupsByWeek.get(week) ?? []
    // Bump every team's array first; bye weeks stay 0.
    for (const t of teams) weeklyCatsWon[String(t.id)].push(0)

    for (const m of list) {
      if (!m.awayTeamId) continue
      const homeWins = m.homeCategoryWins ?? 0
      const awayWins = m.awayCategoryWins ?? 0
      const homeArr = weeklyCatsWon[String(m.homeTeamId)]
      const awayArr = weeklyCatsWon[String(m.awayTeamId)]
      if (homeArr) homeArr[homeArr.length - 1] = homeWins
      if (awayArr) awayArr[awayArr.length - 1] = awayWins
    }
    weeklyLeagueAverage.push(categories.length / 2)
  }
  return { weeklyCatsWon, weeklyLeagueAverage }
}

/* ─────────────────────────────────────────────────────────────────
   STEP 12 — SEASON HISTORY (walk prior years)

   ESPN reuses the same leagueId across seasons, so we just call
   `getLeague(sport, leagueId, year)` for each prior year. We walk
   back up to `MAX_HISTORY_DEPTH` seasons. Champion is the top-record
   team (ESPN's playoff bracket needs extra calls; we skip for now).
─────────────────────────────────────────────────────────────────*/

const MAX_HISTORY_DEPTH = 5

async function buildSeasonHistory(
  leagueId: string,
  currentSeason: number,
): Promise<CategoryLeagueDataSeasonHistory[]> {
  const out: CategoryLeagueDataSeasonHistory[] = []
  const sport = 'baseball' as const

  for (let i = 1; i <= MAX_HISTORY_DEPTH; i++) {
    const year = currentSeason - i
    let prevTeams: EspnTeam[] = []
    try {
      prevTeams = await withCache(cacheKey(leagueId, 'hist-teams', year), () =>
        espnService.getHistoricalTeams(sport, leagueId, year),
      )
    } catch {
      break
    }
    if (!prevTeams || prevTeams.length === 0) break

    const sorted = [...prevTeams].sort((a, b) => {
      if (b.wins !== a.wins) return b.wins - a.wins
      return (a.losses) - (b.losses)
    })
    const champion = sorted[0]
    const runnerUp = sorted[1] ?? sorted[0]
    const basement = sorted[sorted.length - 1]
    if (!champion || !runnerUp || !basement) break

    out.push({
      year,
      championTeamId: String(champion.id),
      championRecord: recordString(champion),
      runnerUpTeamId: String(runnerUp.id),
      basementTeamId: String(basement.id),
    })
  }
  return out
}

function recordString(t: EspnTeam): string {
  return t.ties > 0 ? `${t.wins}-${t.losses}-${t.ties}` : `${t.wins}-${t.losses}`
}

/* ─────────────────────────────────────────────────────────────────
   STEP 13 — TEAM CAREER STATS

   Mirrors the Sleeper adapter's approximation strategy — only current
   season totals are exact; prior seasons get extrapolated from the
   current season's per-week pace and historic records.
─────────────────────────────────────────────────────────────────*/

function buildTeamCareerStats(
  teams: EspnTeam[],
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

  for (const t of teams) {
    const teamId = String(t.id)
    const s = standings.find((x) => x.teamId === teamId)
    const seasonsPlayed = 1 + seasonHistory.length
    const catWins = s?.catWins ?? 0
    const catLosses = s?.catLosses ?? 0
    const catTies = s?.catTies ?? 0
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
   STEP 14 — H2H MATRIX (current season)

   Walks the matchup map and tallies per-pair W/L/T using ESPN's
   `winner` field. Cat-diff approximates from total-cats-won deltas
   when available, otherwise falls back to ±1 per win/loss.
─────────────────────────────────────────────────────────────────*/

function buildH2HMatrix(
  teams: EspnTeam[],
  matchupsByWeek: Map<number, EspnMatchup[]>,
): CategoryLeagueDataH2HEntry[] {
  const records = new Map<
    string,
    { wins: number; losses: number; ties: number; meetings: number; catDiff: number }
  >()
  const teamIdSet = new Set(teams.map((t) => String(t.id)))

  for (const list of matchupsByWeek.values()) {
    for (const m of list) {
      if (!m.awayTeamId) continue
      if (!m.winner || m.winner === 'UNDECIDED') continue
      const aId = String(m.homeTeamId)
      const bId = String(m.awayTeamId)
      if (!teamIdSet.has(aId) || !teamIdSet.has(bId)) continue
      const teamA = aId < bId ? aId : bId
      const teamB = aId < bId ? bId : aId
      const aIsTeamA = aId === teamA
      const key = `${teamA}|${teamB}`
      const rec = records.get(key) ?? { wins: 0, losses: 0, ties: 0, meetings: 0, catDiff: 0 }
      rec.meetings++
      const hCats = m.homeCategoryWins ?? 0
      const aCats = m.awayCategoryWins ?? 0
      const homeMinusAway = hCats - aCats
      if (m.winner === 'HOME') {
        if (aIsTeamA) { rec.wins++; rec.catDiff += homeMinusAway || 1 }
        else          { rec.losses++; rec.catDiff -= homeMinusAway || 1 }
      } else if (m.winner === 'AWAY') {
        if (aIsTeamA) { rec.losses++; rec.catDiff += homeMinusAway || -1 }
        else          { rec.wins++;   rec.catDiff -= homeMinusAway || -1 }
      } else {
        rec.ties++
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
      recordA: rec.ties > 0 ? `${rec.wins}-${rec.losses}-${rec.ties}` : `${rec.wins}-${rec.losses}`,
      catDiffA: rec.catDiff,
      meetings: rec.meetings,
    })
  }
  return out
}

/* ─────────────────────────────────────────────────────────────────
   STEP 15 — DRAFT (optional)
─────────────────────────────────────────────────────────────────*/

async function buildDraft(
  leagueId: string,
  season: number,
): Promise<CategoryLeagueDataDraft | undefined> {
  try {
    const picks = await withCache(cacheKey(leagueId, 'draft', season), () =>
      espnService.getDraftWithPlayers('baseball', leagueId, season),
    )
    if (!picks || picks.length === 0) return undefined
    const out: CategoryLeagueDataDraftPick[] = picks.map((p) => ({
      pickOverall: p.overallPickNumber || 0,
      round: p.roundId || 0,
      playerId: String(p.playerId),
      playerName: p.playerName || `Player ${p.playerId}`,
      position: p.position || '',
      mlbTeam: p.proTeam || '',
      draftedByTeamId: String(p.teamId || ''),
      // valueScore omitted — requires per-player end-of-season stat ranks.
    }))
    return {
      year: season,
      totalPicks: out.length,
      picks: out,
    }
  } catch (err) {
    console.warn('[espnAdapter] draft fetch failed:', err)
    return undefined
  }
}

/* ─────────────────────────────────────────────────────────────────
   STEP 16 — LEAGUE TRANSACTIONS (trades, FAAB, waivers)
─────────────────────────────────────────────────────────────────*/

/**
 * Fetch the league's transaction history and normalize into the
 * cross-platform LeagueTransaction shape. Player names are looked
 * up from the rostered-player metadata embedded in the league
 * response (mTeam view); when a transaction references a player
 * not currently rostered, we fall back to "Player #ID".
 *
 * Non-fatal: any failure returns undefined and the rest of the
 * page renders unchanged.
 */
async function buildTransactions(
  leagueId: string,
  season: number,
  league: EspnLeague,
): Promise<LeagueTransaction[] | undefined> {
  try {
    const raw = await withCache(
      cacheKey(leagueId, 'transactions', season),
      () => espnService.getTransactions('baseball', leagueId, season),
    )
    if (!raw || raw.length === 0) return undefined

    // Build playerId → { name, position } map from current rosters.
    // ESPN's transaction items typically don't include full player
    // details, so we resolve from whatever roster data we already
    // pulled. Players who have since moved teams may still be on
    // SOMEONE's roster.
    const playerLookup = buildPlayerLookup(league)

    const txs: LeagueTransaction[] = []
    for (const t of raw) {
      const normalized = normalizeEspnTransaction(t, playerLookup)
      if (normalized) txs.push(normalized)
    }

    // Sort newest first so detectors can short-circuit on freshness.
    txs.sort((a, b) => b.timestamp - a.timestamp)
    return txs
  } catch (err) {
    console.warn('[espnAdapter] transactions fetch failed:', err)
    return undefined
  }
}

interface PlayerInfo {
  name: string
  position?: string
}

function buildPlayerLookup(league: EspnLeague): Map<string, PlayerInfo> {
  const m = new Map<string, PlayerInfo>()
  for (const team of league.teams || []) {
    const entries = (team.roster?.entries ?? []) as any[]
    for (const e of entries) {
      const ppe = e.playerPoolEntry?.player
      const id = ppe?.id ?? e.playerId
      if (id == null) continue
      const name = ppe?.fullName || `Player ${id}`
      const position = positionLabel(ppe?.defaultPositionId)
      m.set(String(id), { name, position })
    }
  }
  return m
}

/** ESPN MLB position IDs → short labels. Partial; covers the
 *  positions that show up in trade copy. */
function positionLabel(pid: number | undefined): string | undefined {
  if (pid == null) return undefined
  switch (pid) {
    case 1:  return 'C'
    case 2:  return '1B'
    case 3:  return '2B'
    case 4:  return '3B'
    case 5:  return 'SS'
    case 6:  return 'OF'
    case 9:  return 'DH'
    case 13: return 'SP'
    case 14: return 'RP'
    default: return undefined
  }
}

/**
 * Convert one ESPN transaction object into our LeagueTransaction
 * shape. Returns null when the transaction wasn't executed (still
 * pending), had no movements, or had a shape we don't handle.
 */
function normalizeEspnTransaction(
  t: any,
  playerLookup: Map<string, PlayerInfo>,
): LeagueTransaction | null {
  // Skip non-executed (cancelled, vetoed, pending).
  if (t.status && t.status !== 'EXECUTED' && t.status !== 'STANDARD') return null
  if (t.executionType && t.executionType !== 'EXECUTE') return null

  const items = (t.items ?? []) as any[]
  if (items.length === 0) return null

  const kind = classifyEspnKind(t, items)
  if (!kind) return null

  const movements: TransactionMovement[] = []
  const teamSet = new Set<string>()
  for (const it of items) {
    const playerId = String(it.playerId ?? '')
    if (!playerId) continue
    const info = playerLookup.get(playerId)
    const fromTeamId = espnTeamRef(it.fromTeamId)
    const toTeamId = espnTeamRef(it.toTeamId)
    if (fromTeamId !== 'fa' && fromTeamId !== 'waivers') teamSet.add(fromTeamId)
    if (toTeamId !== 'fa' && toTeamId !== 'waivers') teamSet.add(toTeamId)
    movements.push({
      playerId,
      playerName: info?.name ?? `Player ${playerId}`,
      position: info?.position,
      fromTeamId,
      toTeamId,
    })
  }
  if (movements.length === 0) return null

  return {
    id: String(t.id ?? `${t.processDate}-${kind}`),
    platform: 'espn',
    kind,
    timestamp: Number(t.processDate ?? t.proposedDate ?? Date.now()),
    week: Number(t.scoringPeriodId ?? 0) || 1,
    teamIds: Array.from(teamSet),
    movements,
    faabBid: typeof t.bidAmount === 'number' && t.bidAmount > 0 ? t.bidAmount : undefined,
  }
}

/** ESPN team IDs use 0 for free agency / waivers; positive integers
 *  for actual teams. The kind hint tells us which sentinel applies. */
function espnTeamRef(rawId: number | undefined): string {
  if (!rawId || rawId <= 0) return 'fa'
  return String(rawId)
}

/** Classify an ESPN transaction into our TransactionKind. ESPN's
 *  `type` field has more granularity than we use; we collapse to
 *  the editorial categories that matter. */
function classifyEspnKind(t: any, items: any[]): TransactionKind | null {
  const type = String(t.type ?? '').toUpperCase()

  // Trades have two or more teams in the items.
  if (type.includes('TRADE')) return 'trade'

  // FAAB add — non-zero bid amount.
  if (typeof t.bidAmount === 'number' && t.bidAmount > 0) return 'faab-add'

  // Waiver pickup.
  if (type.includes('WAIVER')) return 'waiver-add'

  // Free-agent add.
  if (type.includes('FREEAGENT') || type === 'FREEAGENT') return 'fa-add'

  // Standalone drop (no add half).
  if (type.includes('DROP')) {
    const hasAdd = items.some((i: any) => i.type === 'ADD')
    if (!hasAdd) return 'drop'
    return 'fa-add'
  }

  // Unknown — skip rather than mis-categorize.
  return null
}

/* ─────────────────────────────────────────────────────────────────
   UTILS
─────────────────────────────────────────────────────────────────*/

function clampWeek(n: number): number {
  if (!Number.isFinite(n) || n < 1) return 1
  if (n > 30) return 30
  return Math.floor(n)
}
