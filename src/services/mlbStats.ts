/**
 * MLB Stats API client — fetches yesterday's hitter + pitcher box-
 * score stats from statsapi.mlb.com. Free, public, no auth.
 *
 * Used by the player-night pipeline to detect 3-HR games, 12-K
 * starts, no-hitters, monster lines, etc. Editorial output is the
 * Wire's "Player Watch" cards.
 *
 * Caching: per-date, 30-minute TTL on yesterday's data (it gets
 * updated as late games complete), 24-hour TTL on anything older
 * (immutable once games are final).
 */

const BASE_URL = 'https://statsapi.mlb.com/api/v1'

/* ─────────────────────────────────────────────────────────────────
   PUBLIC SHAPES — what callers consume.
───────────────────────────────────────────────────────────────── */

export interface MlbHitterStat {
  mlbId: number
  name: string
  position?: string
  mlbTeam?: string
  gameDate: string
  atBats: number
  hits: number
  runs: number
  rbi: number
  homeRuns: number
  doubles: number
  triples: number
  walks: number
  strikeouts: number
  stolenBases: number
  hitByPitch: number
}

export interface MlbPitcherStat {
  mlbId: number
  name: string
  position?: string
  mlbTeam?: string
  gameDate: string
  inningsPitched: number
  hits: number
  runs: number
  earnedRuns: number
  walks: number
  strikeouts: number
  homeRunsAllowed: number
  decision?: 'W' | 'L' | 'S' | 'H' | 'BS' | 'ND'
  gamesStarted: number
  battersFaced: number
  completeGame: boolean
  noHitter: boolean
  perfectGame: boolean
  qualityStart: boolean
}

export interface MlbDayStats {
  date: string
  hitters: MlbHitterStat[]
  pitchers: MlbPitcherStat[]
}

/* ─────────────────────────────────────────────────────────────────
   ROLLING-WINDOW SHAPES
   Used by slump-watch: aggregated stats over a multi-day span,
   not a single date.
───────────────────────────────────────────────────────────────── */

export interface MlbRollingHitter {
  mlbId: number
  name: string
  position?: string
  mlbTeam?: string
  games: number
  atBats: number
  hits: number
  homeRuns: number
  rbi: number
  runs: number
  walks: number
  strikeouts: number
  stolenBases: number
  /** Batting average, 0.000-1.000. */
  battingAverage: number
  /** On-base plus slugging, 0.000-x. */
  ops: number
}

export interface MlbRollingPitcher {
  mlbId: number
  name: string
  position?: string
  mlbTeam?: string
  games: number
  gamesStarted: number
  inningsPitched: number
  earnedRuns: number
  hits: number
  walks: number
  strikeouts: number
  era: number
  whip: number
}

export interface MlbRollingStats {
  startDate: string
  endDate: string
  hitters: MlbRollingHitter[]
  pitchers: MlbRollingPitcher[]
}

/* ─────────────────────────────────────────────────────────────────
   IN-MEMORY CACHE
───────────────────────────────────────────────────────────────── */

interface CacheEntry {
  data: MlbDayStats
  fetchedAt: number
  ttlMs: number
}
const cache = new Map<string, CacheEntry>()

function cacheGet(date: string): MlbDayStats | null {
  const entry = cache.get(date)
  if (!entry) return null
  if (Date.now() - entry.fetchedAt > entry.ttlMs) {
    cache.delete(date)
    return null
  }
  return entry.data
}

function cacheSet(date: string, data: MlbDayStats, ttlMs: number): void {
  cache.set(date, { data, fetchedAt: Date.now(), ttlMs })
}

/* ─────────────────────────────────────────────────────────────────
   PUBLIC API
───────────────────────────────────────────────────────────────── */

/**
 * Fetch every hitter + pitcher stat line for a given date.
 *
 * The MLB Stats API exposes a `byDateRange` stats endpoint that
 * returns ALL players who played in the date range — much more
 * efficient than walking each game's box score one at a time.
 *
 * Returns empty arrays when no games ran that day (off days,
 * pre/post-season gaps).
 */
export async function getDayStats(date: string): Promise<MlbDayStats> {
  const cached = cacheGet(date)
  if (cached) return cached

  try {
    const [hitters, pitchers] = await Promise.all([
      fetchGroup('hitting', date),
      fetchGroup('pitching', date),
    ])

    const data: MlbDayStats = { date, hitters: hitters as MlbHitterStat[], pitchers: pitchers as MlbPitcherStat[] }

    // Yesterday's data may still be updating (West Coast late games);
    // give it a 30-min TTL. Older data is immutable.
    const ttlMs = isYesterday(date) ? 30 * 60 * 1000 : 24 * 60 * 60 * 1000
    cacheSet(date, data, ttlMs)
    return data
  } catch (err) {
    console.warn('[mlbStats] getDayStats failed:', err)
    return { date, hitters: [], pitchers: [] }
  }
}

/**
 * Real-life MLB transaction (IL placement, callup, DFA, etc.). One
 * entry per transaction; players may have multiple per day.
 */
export interface MlbTransaction {
  id: number
  mlbId: number              // player ID
  playerName: string
  date: string               // YYYY-MM-DD
  /** MLB's typeCode — "SC" = status change (IL moves), "TR" = trade,
   *  "DFA" = designated for assignment, "SE" = sent to minors, etc. */
  typeCode: string
  /** Human description (e.g., "OF Mike Trout placed on the 10-day
   *  injured list, retroactive to May 19"). We parse this for the
   *  story type — IL placement, IL return, etc. */
  description: string
  /** True when this is an IL placement (10-day or 60-day). */
  isIlPlacement: boolean
  /** True when this is an IL activation / return. */
  isIlReturn: boolean
}

/**
 * Fetch all MLB transactions for a date range. Used by the injury
 * detector to surface IL placements + returns in The Wire.
 */
export async function getDayTransactions(date: string): Promise<MlbTransaction[]> {
  try {
    const url =
      `${BASE_URL}/transactions` +
      `?startDate=${encodeURIComponent(date)}` +
      `&endDate=${encodeURIComponent(date)}` +
      `&sportId=1`
    const resp = await fetch(url)
    if (!resp.ok) throw new Error(`MLB Stats API ${resp.status}`)
    const data = await resp.json()
    const raw = (data?.transactions ?? []) as any[]
    return raw.map(parseTransaction).filter((t): t is MlbTransaction => t !== null)
  } catch (err) {
    console.warn('[mlbStats] getDayTransactions failed:', err)
    return []
  }
}

function parseTransaction(t: any): MlbTransaction | null {
  const personId = t?.person?.id
  if (typeof personId !== 'number') return null
  const description = String(t.description ?? '').trim()
  const desc = description.toLowerCase()
  const isIlPlacement =
    /placed on the .*injured list/.test(desc) ||
    /transferred to the 60-day injured list/.test(desc)
  const isIlReturn = /reinstated from the .*injured list/.test(desc)
  return {
    id: Number(t.id ?? 0),
    mlbId: personId,
    playerName: t.person?.fullName ?? `Player ${personId}`,
    date: t.date ?? '',
    typeCode: String(t.typeCode ?? ''),
    description,
    isIlPlacement,
    isIlReturn,
  }
}

/* ─────────────────────────────────────────────────────────────────
   ROLLING STATS — for slump-watch
───────────────────────────────────────────────────────────────── */

const rollingCache = new Map<string, { data: MlbRollingStats; fetchedAt: number; ttlMs: number }>()

/**
 * Fetch aggregated hitter + pitcher stats across a multi-day window.
 *
 * Same byDateRange endpoint as getDayStats, but the date span is
 * wider, so the response aggregates each player's totals across
 * the window. Used by slump detection to find owned players cold
 * over the last 7-14 days.
 *
 * Caching: 12 hours per (start, end) pair. Rolling windows are
 * stable until the next fantasy-day rollover.
 */
export async function getRollingStats(
  startDate: string,
  endDate: string,
): Promise<MlbRollingStats> {
  const cacheKey = `${startDate}__${endDate}`
  const hit = rollingCache.get(cacheKey)
  if (hit && Date.now() - hit.fetchedAt < hit.ttlMs) return hit.data

  try {
    const [hitters, pitchers] = await Promise.all([
      fetchRollingGroup('hitting', startDate, endDate),
      fetchRollingGroup('pitching', startDate, endDate),
    ])
    const data: MlbRollingStats = {
      startDate,
      endDate,
      hitters: hitters as MlbRollingHitter[],
      pitchers: pitchers as MlbRollingPitcher[],
    }
    rollingCache.set(cacheKey, {
      data,
      fetchedAt: Date.now(),
      ttlMs: 12 * 60 * 60 * 1000,
    })
    return data
  } catch (err) {
    console.warn('[mlbStats] getRollingStats failed:', err)
    return { startDate, endDate, hitters: [], pitchers: [] }
  }
}

/** Date N days before `endDate`, as YYYY-MM-DD. Used to compute the
 *  rolling-window start (e.g., 7 days back from yesterday). */
export function dateNDaysBefore(endDate: string, n: number): string {
  const d = new Date(endDate + 'T12:00:00')
  d.setDate(d.getDate() - n)
  return formatYMD(d)
}

/**
 * "Yesterday" in US/Eastern (where MLB games conclude). Returns
 * YYYY-MM-DD. Useful default for the wire — the most recent
 * complete day of games.
 */
export function yesterdayDate(): string {
  // ET is UTC-5 standard / UTC-4 daylight. The "fantasy day" rollover
  // is usually 4am ET (after all West Coast late games are final).
  // We approximate by taking now, subtracting 4 hours, then taking
  // the resulting date's "yesterday."
  const now = new Date()
  now.setHours(now.getHours() - 4) // shift past late games
  now.setDate(now.getDate() - 1)
  return formatYMD(now)
}

/* ─────────────────────────────────────────────────────────────────
   INTERNAL
───────────────────────────────────────────────────────────────── */

async function fetchGroup(
  group: 'hitting' | 'pitching',
  date: string,
): Promise<(MlbHitterStat | MlbPitcherStat)[]> {
  // statType=byDateRange + start=end is one day. Paginate up to a
  // reasonable cap — a heavy day has ~250 hitters across 15 games.
  const url =
    `${BASE_URL}/stats?stats=byDateRange` +
    `&startDate=${encodeURIComponent(date)}` +
    `&endDate=${encodeURIComponent(date)}` +
    `&group=${group}` +
    `&sportId=1` +
    `&limit=400`

  const resp = await fetch(url)
  if (!resp.ok) throw new Error(`MLB Stats API ${resp.status}`)
  const data = await resp.json()

  const splits = data?.stats?.[0]?.splits ?? []
  if (group === 'hitting') {
    return splits.map(parseHitter).filter((x: MlbHitterStat | null): x is MlbHitterStat => x !== null)
  }
  return splits.map(parsePitcher).filter((x: MlbPitcherStat | null): x is MlbPitcherStat => x !== null)
}

function parseHitter(split: any): MlbHitterStat | null {
  const player = split?.player
  const stat = split?.stat
  if (!player || !stat) return null
  return {
    mlbId: Number(player.id),
    name: player.fullName || `${player.firstName ?? ''} ${player.lastName ?? ''}`.trim(),
    position: split.position?.abbreviation,
    mlbTeam: split.team?.abbreviation,
    gameDate: split.date || split.season || '',
    atBats: numField(stat.atBats),
    hits: numField(stat.hits),
    runs: numField(stat.runs),
    rbi: numField(stat.rbi),
    homeRuns: numField(stat.homeRuns),
    doubles: numField(stat.doubles),
    triples: numField(stat.triples),
    walks: numField(stat.baseOnBalls),
    strikeouts: numField(stat.strikeOuts),
    stolenBases: numField(stat.stolenBases),
    hitByPitch: numField(stat.hitByPitch),
  }
}

function parsePitcher(split: any): MlbPitcherStat | null {
  const player = split?.player
  const stat = split?.stat
  if (!player || !stat) return null

  const ip = parseInningsPitched(stat.inningsPitched)
  const gs = numField(stat.gamesStarted)
  const er = numField(stat.earnedRuns)
  const hits = numField(stat.hits)
  const walks = numField(stat.baseOnBalls)

  // Heuristic flags — quality start, complete game, no-hitter,
  // perfect game. The API doesn't always flag these directly.
  const completeGame = numField(stat.completeGames) > 0 || ip >= 9
  const noHitter = completeGame && hits === 0
  const perfectGame = noHitter && walks === 0 && numField(stat.hitByPitch) === 0
  const qualityStart = gs > 0 && ip >= 6 && er <= 3

  // Decision — derived from W/L/S/H/BS columns.
  let decision: MlbPitcherStat['decision'] = 'ND'
  if (numField(stat.wins) > 0) decision = 'W'
  else if (numField(stat.losses) > 0) decision = 'L'
  else if (numField(stat.saves) > 0) decision = 'S'
  else if (numField(stat.holds) > 0) decision = 'H'
  else if (numField(stat.blownSaves) > 0) decision = 'BS'

  return {
    mlbId: Number(player.id),
    name: player.fullName || `${player.firstName ?? ''} ${player.lastName ?? ''}`.trim(),
    position: split.position?.abbreviation,
    mlbTeam: split.team?.abbreviation,
    gameDate: split.date || split.season || '',
    inningsPitched: ip,
    hits,
    runs: numField(stat.runs),
    earnedRuns: er,
    walks,
    strikeouts: numField(stat.strikeOuts),
    homeRunsAllowed: numField(stat.homeRuns),
    decision,
    gamesStarted: gs,
    battersFaced: numField(stat.battersFaced),
    completeGame,
    noHitter,
    perfectGame,
    qualityStart,
  }
}

async function fetchRollingGroup(
  group: 'hitting' | 'pitching',
  startDate: string,
  endDate: string,
): Promise<(MlbRollingHitter | MlbRollingPitcher)[]> {
  const url =
    `${BASE_URL}/stats?stats=byDateRange` +
    `&startDate=${encodeURIComponent(startDate)}` +
    `&endDate=${encodeURIComponent(endDate)}` +
    `&group=${group}` +
    `&sportId=1` +
    `&limit=1500`

  const resp = await fetch(url)
  if (!resp.ok) throw new Error(`MLB Stats API ${resp.status}`)
  const data = await resp.json()
  const splits = data?.stats?.[0]?.splits ?? []
  if (group === 'hitting') {
    return splits
      .map(parseRollingHitter)
      .filter((x: MlbRollingHitter | null): x is MlbRollingHitter => x !== null)
  }
  return splits
    .map(parseRollingPitcher)
    .filter((x: MlbRollingPitcher | null): x is MlbRollingPitcher => x !== null)
}

function parseRollingHitter(split: any): MlbRollingHitter | null {
  const player = split?.player
  const stat = split?.stat
  if (!player || !stat) return null
  const atBats = numField(stat.atBats)
  const hits = numField(stat.hits)
  // Prefer API-supplied avg/ops when present (stringified). Compute
  // from totals as a fallback for the slump filter to stay reliable.
  const avg = parseFloatField(stat.avg) ?? (atBats > 0 ? hits / atBats : 0)
  const ops = parseFloatField(stat.ops) ?? 0
  return {
    mlbId: Number(player.id),
    name: player.fullName || `${player.firstName ?? ''} ${player.lastName ?? ''}`.trim(),
    position: split.position?.abbreviation,
    mlbTeam: split.team?.abbreviation,
    games: numField(stat.gamesPlayed),
    atBats,
    hits,
    homeRuns: numField(stat.homeRuns),
    rbi: numField(stat.rbi),
    runs: numField(stat.runs),
    walks: numField(stat.baseOnBalls),
    strikeouts: numField(stat.strikeOuts),
    stolenBases: numField(stat.stolenBases),
    battingAverage: avg,
    ops,
  }
}

function parseRollingPitcher(split: any): MlbRollingPitcher | null {
  const player = split?.player
  const stat = split?.stat
  if (!player || !stat) return null
  const ip = parseInningsPitched(stat.inningsPitched)
  const er = numField(stat.earnedRuns)
  const hits = numField(stat.hits)
  const walks = numField(stat.baseOnBalls)
  const era = parseFloatField(stat.era) ?? (ip > 0 ? (er * 9) / ip : 0)
  const whip = parseFloatField(stat.whip) ?? (ip > 0 ? (hits + walks) / ip : 0)
  return {
    mlbId: Number(player.id),
    name: player.fullName || `${player.firstName ?? ''} ${player.lastName ?? ''}`.trim(),
    position: split.position?.abbreviation,
    mlbTeam: split.team?.abbreviation,
    games: numField(stat.gamesPlayed),
    gamesStarted: numField(stat.gamesStarted),
    inningsPitched: ip,
    earnedRuns: er,
    hits,
    walks,
    strikeouts: numField(stat.strikeOuts),
    era,
    whip,
  }
}

/** Parse a numeric string field that may include ".000" formatting.
 *  MLB API returns rate stats as strings ("0.230"). */
function parseFloatField(v: unknown): number | null {
  if (typeof v === 'number') return v
  if (typeof v === 'string') {
    const n = parseFloat(v)
    if (!Number.isNaN(n)) return n
  }
  return null
}

function numField(v: unknown): number {
  if (typeof v === 'number') return v
  if (typeof v === 'string') {
    const n = parseFloat(v)
    if (!Number.isNaN(n)) return n
  }
  return 0
}

/** MLB IP format is "6.2" meaning 6 IP + 2 outs (NOT 6.2 actual
 *  innings). We convert to decimal innings: 6.2 → 6.667. */
function parseInningsPitched(raw: unknown): number {
  if (typeof raw === 'number') return raw
  if (typeof raw !== 'string') return 0
  const [wholeStr, fracStr] = raw.split('.')
  const whole = parseInt(wholeStr ?? '0', 10) || 0
  const outs = parseInt(fracStr ?? '0', 10) || 0
  return whole + outs / 3
}

function formatYMD(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function isYesterday(date: string): boolean {
  return date === yesterdayDate()
}
