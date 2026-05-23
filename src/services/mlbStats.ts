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
