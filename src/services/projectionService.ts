import { supabase } from '@/lib/supabase'

// Display-name → FanGraphs projection field. Platform-agnostic (ESPN, Yahoo,
// Sleeper all use the same human-readable category names even though their
// numeric stat_ids diverge). This is the preferred lookup path.
type FGMapper = string | ((p: any) => number | null)

const parse2B = (p: any): number => p.raw_data?.['2B'] != null ? parseInt(p.raw_data['2B']) : 0
const parse3B = (p: any): number => p.raw_data?.['3B'] != null ? parseInt(p.raw_data['3B']) : 0

export const DISPLAY_NAME_TO_FG_BATTER: Record<string, FGMapper> = {
  R: 'r',
  H: 'h',
  HR: 'hr',
  RBI: 'rbi',
  SB: 'sb',
  AVG: 'avg',
  BA: 'avg',
  OPS: 'ops',
  OBP: 'obp',
  SLG: 'slg',
  BB: 'bb',
  K: 'so',       // batter strikeouts — only reachable when the category is flagged as batting
  SO: 'so',
  TB: (p) => {
    if (p.tb != null) return p.tb
    const h = p.h ?? 0, hr = p.hr ?? 0
    const d = parse2B(p), t = parse3B(p)
    const singles = Math.max(0, h - d - t - hr)
    return singles + 2 * d + 3 * t + 4 * hr
  },
  PA: 'pa',
  AB: 'ab',
  '1B': (p) => {
    const h = p.h ?? 0, hr = p.hr ?? 0
    return Math.max(0, h - parse2B(p) - parse3B(p) - hr)
  },
  '2B': parse2B,
  '3B': parse3B,
  HBP: (p) => p.raw_data?.HBP != null ? parseInt(p.raw_data.HBP) : null,
  'R+RBI': (p) => (p.r ?? 0) + (p.rbi ?? 0),
  XBH: (p) => parse2B(p) + parse3B(p) + (p.hr ?? 0),
}

export const DISPLAY_NAME_TO_FG_PITCHER: Record<string, FGMapper> = {
  W: 'w',
  L: 'l',
  SV: 'sv',
  HLD: 'hld',
  HD: 'hld',
  'SV+HLD': (p) => (p.sv ?? 0) + (p.hld ?? 0),
  SVH: (p) => (p.sv ?? 0) + (p.hld ?? 0),
  SVHD: (p) => (p.sv ?? 0) + (p.hld ?? 0),
  K: 'so',
  SO: 'so',
  ERA: 'era',
  WHIP: 'whip',
  IP: 'ip',
  GS: 'gs',
  G: 'gp',
  GP: 'gp',
  // Pitcher counting stats that are often scored negatively in points leagues —
  // critical for ESPN points where ER/H/BB/HR penalties drive pitcher totals.
  H: 'h',   // hits allowed
  BB: 'bb', // walks allowed
  HR: 'hr', // HR allowed
  ER: 'er', // earned runs
  R: (p) => p.r ?? p.er ?? null, // runs allowed (fall back to ER if R not projected)
  HBP: (p) => p.raw_data?.HBP != null ? parseInt(p.raw_data.HBP) : null,
  'K/9': 'k9',
  'BB/9': 'bb9',
  'K/BB': (p) => p.raw_data?.['K/BB'] != null ? parseFloat(p.raw_data['K/BB']) : null,
  QS: (p) => p.raw_data?.QS != null ? parseInt(p.raw_data.QS) : null,
  BS: (p) => p.raw_data?.BS != null ? parseInt(p.raw_data.BS) : null,
  BF: (p) => p.raw_data?.TBF != null ? parseInt(p.raw_data.TBF) : null,
  TBF: (p) => p.raw_data?.TBF != null ? parseInt(p.raw_data.TBF) : null,
  FIP: 'fip',
  OBA: (p) => p.raw_data?.['OBA'] != null ? parseFloat(p.raw_data['OBA']) : null,
}

// Legacy ESPN stat-id → FanGraphs fallback, used only when display name misses.
// For stats FG doesn't project, we return null and the caller falls back to ESPN values
const ESPN_TO_FG_BATTER: Record<string, FGMapper> = {
  '0':  'ab',           // AB
  '1':  'h',            // H
  '2':  'r',            // R (batting stat_id 2 = R in some leagues)
  '3':  'hr',           // HR
  '4':  'rbi',          // RBI (stat_id 4)
  '5':  'sb',           // SB
  '6':  'bb',           // BB
  '7':  'so',           // K (batting)
  '8':  'ops',          // OPS
  '9':  'obp',          // OBP
  '10': 'slg',          // SLG
  '11': 'avg',          // AVG
  '14': (p) => p.raw_data?.['2B'] != null ? parseInt(p.raw_data['2B']) : null, // 2B
  '15': (p) => p.raw_data?.['3B'] != null ? parseInt(p.raw_data['3B']) : null, // 3B
  '17': 'pa',           // PA
  '19': 'tb',           // TB (computed in edge fn from 1B+2B*2+3B*3+HR*4)
  '23': 'rbi',          // RBI (stat_id 23 in some leagues)
  '25': (p) => p.raw_data?.HBP != null ? parseInt(p.raw_data.HBP) : null,     // HBP
  '32': 'r',            // R (alternate stat_id)
  '33': 'hr',           // HR (alternate)
  '34': 'tb',           // TB (alternate)
}

const ESPN_TO_FG_PITCHER: Record<string, FGMapper> = {
  '18': 'gp',           // G (pitching appearances)
  '35': 'w',            // W
  '36': 'l',            // L
  '37': 'sv',           // SV
  '38': 'hld',          // HD
  '39': 'ip',           // IP
  '41': 'ip',           // IP (alternate)
  '43': 'so',           // K (pitching)
  '47': 'era',          // ERA
  '48': 'whip',         // WHIP
  '53': 'gs',           // GS
  '57': (p) => p.raw_data?.BS != null ? parseInt(p.raw_data.BS) : null,  // BS
  '62': (p) => p.raw_data?.['K/BB'] != null ? parseFloat(p.raw_data['K/BB']) : null, // K/BB
  '63': (p) => p.raw_data?.QS != null ? parseInt(p.raw_data.QS) : null, // QS
  '67': (p) => p.raw_data?.TBF != null ? parseInt(p.raw_data.TBF) : null, // BF
  '71': (p) => {         // SVHD = SV + HLD
    const sv = p.sv ?? 0
    const hld = p.hld ?? 0
    return sv + hld
  },
  '83': (p) => p.raw_data?.AVG != null ? parseFloat(p.raw_data.AVG) : null, // OBA (opp batting avg)
}

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // strip accents
    .replace(/\bjr\.?\b/gi, '')
    .replace(/\bsr\.?\b/gi, '')
    .replace(/\biii\b/gi, '')
    .replace(/\bii\b/gi, '')
    .replace(/\biv\b/gi, '')
    .replace(/[^a-z ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function makeMatchKey(name: string, team?: string): string {
  return `${normalizeName(name)}|${(team || '').toUpperCase().trim()}`
}

function makeNameOnlyKey(name: string): string {
  return normalizeName(name)
}

export interface FGProjection {
  mlbam_id: number
  player_name: string
  team: string
  position: string
  player_type: 'batter' | 'pitcher'
  // Batting
  g?: number; ab?: number; pa?: number; h?: number; hr?: number; r?: number
  rbi?: number; sb?: number; bb?: number; so?: number; tb?: number
  avg?: number; obp?: number; slg?: number; ops?: number; woba?: number
  iso?: number; babip?: number; k_pct?: number; bb_pct?: number; war?: number
  // Pitching
  w?: number; l?: number; gs?: number; gp?: number; sv?: number; hld?: number
  ip?: number; era?: number; whip?: number; k9?: number; bb9?: number
  k_bb_pct?: number; fip?: number
  // Raw blob
  raw_data?: any
}

export interface StatcastData {
  mlbam_id: number
  player_name: string
  player_type: 'batter' | 'pitcher'
  // Actuals (YTD) from Baseball Savant expected_statistics endpoint.
  // For batters these are the player's own; for pitchers they are opponent-against.
  ba?: number; slg?: number; woba?: number
  xba?: number; xslg?: number; xwoba?: number; xobp?: number; xiso?: number
  xera?: number
  exit_velocity_avg?: number; launch_angle_avg?: number
  barrel_rate?: number; hard_hit_pct?: number
  k_pct?: number; bb_pct?: number; whiff_pct?: number
  sprint_speed?: number; sweet_spot_pct?: number
  pa?: number
}

export interface EnrichedProjection {
  fgProjection: FGProjection | null
  statcast: StatcastData | null
  mappedStats: Record<string, number>  // ESPN stat_id → projected value
  breakoutSignals: string[]
}

let cachedProjections: FGProjection[] | null = null
let cachedStatcast: StatcastData[] | null = null
let cacheTimestamp = 0
const CACHE_TTL = 30 * 60 * 1000 // 30 minutes

export async function loadProjectionData(): Promise<{
  projections: FGProjection[]
  statcast: StatcastData[]
}> {
  if (cachedProjections && cachedStatcast && Date.now() - cacheTimestamp < CACHE_TTL) {
    return { projections: cachedProjections, statcast: cachedStatcast }
  }

  const season = new Date().getFullYear()

  const [fgResult, scResult] = await Promise.all([
    supabase
      .from('fangraphs_projections')
      .select('*')
      .eq('season', season),
    supabase
      .from('statcast_metrics')
      .select('*')
      .eq('season', season),
  ])

  if (fgResult.error) {
    console.error('[ProjectionService] FanGraphs query error:', fgResult.error)
  }
  if (scResult.error) {
    console.error('[ProjectionService] Statcast query error:', scResult.error)
  }

  cachedProjections = (fgResult.data || []) as FGProjection[]
  cachedStatcast = (scResult.data || []) as StatcastData[]
  cacheTimestamp = Date.now()

  console.log(`[ProjectionService] Loaded ${cachedProjections.length} FG projections, ${cachedStatcast.length} Statcast metrics`)

  return { projections: cachedProjections, statcast: cachedStatcast }
}

// Build lookup maps for fast matching
function buildLookups(projections: FGProjection[], statcast: StatcastData[]) {
  const fgByNameTeam = new Map<string, FGProjection>()
  const fgByName = new Map<string, FGProjection>()
  for (const p of projections) {
    fgByNameTeam.set(makeMatchKey(p.player_name, p.team), p)
    if (!fgByName.has(makeNameOnlyKey(p.player_name))) {
      fgByName.set(makeNameOnlyKey(p.player_name), p)
    }
  }

  const scByNameTeam = new Map<string, StatcastData>()
  const scByName = new Map<string, StatcastData>()
  for (const s of statcast) {
    const nameKey = makeNameOnlyKey(s.player_name)
    if (!scByName.has(nameKey)) {
      scByName.set(nameKey, s)
    }
  }

  return { fgByNameTeam, fgByName, scByNameTeam, scByName }
}

// Match an ESPN player to FanGraphs + Statcast data
function matchPlayer(
  espnPlayer: { full_name: string; mlb_team?: string; position?: string },
  lookups: ReturnType<typeof buildLookups>
): { fg: FGProjection | null; sc: StatcastData | null } {
  const { fgByNameTeam, fgByName, scByName } = lookups

  // Try name+team first, then name-only
  let fg = fgByNameTeam.get(makeMatchKey(espnPlayer.full_name, espnPlayer.mlb_team))
  if (!fg) {
    fg = fgByName.get(makeNameOnlyKey(espnPlayer.full_name)) || null
  }

  const sc = scByName.get(makeNameOnlyKey(espnPlayer.full_name)) || null

  return { fg, sc }
}

// Map FanGraphs projection to league stat IDs for a player. Prefers display
// name (platform-agnostic) and skips categories that belong to the opposite
// player type (e.g. a pitching category on a batter's row). Falls back to the
// legacy ESPN stat_id mapping only when display_name isn't available.
function mapToEspnStats(
  fg: FGProjection,
  categories: Array<{ stat_id: string; display_name?: string; isPitching?: boolean }>
): Record<string, number> {
  const mapped: Record<string, number> = {}
  const isPitcher = fg.player_type === 'pitcher'
  const byName = isPitcher ? DISPLAY_NAME_TO_FG_PITCHER : DISPLAY_NAME_TO_FG_BATTER
  const byId = isPitcher ? ESPN_TO_FG_PITCHER : ESPN_TO_FG_BATTER

  const resolve = (mapper: FGMapper): number | null => {
    if (typeof mapper === 'string') return (fg as any)[mapper] ?? null
    return mapper(fg)
  }

  for (const cat of categories) {
    // Skip categories that belong to the opposite player type. Without this,
    // a batter's "K" column (pitching category in most leagues) would get
    // filled with the batter's strikeout projection, and Yahoo's SV stat_id
    // (32) collides with ESPN's "r" slot in the legacy fallback map.
    if (cat.isPitching !== undefined) {
      if (cat.isPitching && !isPitcher) continue
      if (!cat.isPitching && isPitcher) continue
    }

    const nameKey = (cat.display_name || '').toUpperCase().trim()
    let mapper: FGMapper | undefined = nameKey ? byName[nameKey] : undefined
    if (!mapper && !nameKey) mapper = byId[cat.stat_id]
    if (!mapper) continue

    const value = resolve(mapper)
    if (value !== null && value !== undefined) {
      mapped[cat.stat_id] = value
    }
  }

  return mapped
}

// ─── Luck / Regression analysis ────────────────────────────────────────────
// Compares a player's YTD actual rate stat against Baseball Savant's
// expected version to flag likely regression candidates.
//   direction: 'over'  = actual > expected (due to regress down — sell high)
//              'under' = actual < expected (due to improve — buy low)
//   severity:  'strong' / 'mild' / null — based on how far from expected

export type LuckDirection = 'over' | 'under' | null
export type LuckSeverity = 'strong' | 'mild' | null

export interface LuckDelta {
  direction: LuckDirection
  severity: LuckSeverity
  delta: number           // signed: actual - expected (sign of over/under depends on stat polarity)
  actual: number
  expected: number
  formatted: string       // "+24 pts", "-0.42", etc.
}

// Per-category thresholds for YTD luck detection. Keyed by uppercased
// display name. 'lowerIsBetter' flips the over/under interpretation so
// ERA < xERA becomes "overperforming" (lucky) rather than "underperforming."
const LUCK_CONFIG: Record<string, {
  xField: keyof StatcastData | 'xops'
  mild: number; strong: number
  lowerIsBetter?: boolean
  unit: 'points' | 'runs'
}> = {
  AVG:  { xField: 'xba',   mild: 0.020, strong: 0.040, unit: 'points' },
  BA:   { xField: 'xba',   mild: 0.020, strong: 0.040, unit: 'points' },
  OBP:  { xField: 'xobp',  mild: 0.020, strong: 0.040, unit: 'points' },
  SLG:  { xField: 'xslg',  mild: 0.050, strong: 0.100, unit: 'points' },
  OPS:  { xField: 'xops',  mild: 0.050, strong: 0.100, unit: 'points' },
  ISO:  { xField: 'xiso',  mild: 0.040, strong: 0.080, unit: 'points' },
  ERA:  { xField: 'xera',  mild: 0.40,  strong: 0.80,  unit: 'runs', lowerIsBetter: true },
}

export function computeLuck(
  displayName: string | undefined,
  actualRaw: number | string | null | undefined,
  statcast: StatcastData | null | undefined
): LuckDelta | null {
  if (!displayName || !statcast) return null
  const cfg = LUCK_CONFIG[displayName.toUpperCase().trim()]
  if (!cfg) return null

  const actual = typeof actualRaw === 'string' ? parseFloat(actualRaw) : actualRaw
  if (actual == null || Number.isNaN(actual)) return null

  // xOPS isn't a direct Savant field — derive from xOBP + xSLG
  const expected = cfg.xField === 'xops'
    ? (statcast.xobp != null && statcast.xslg != null ? statcast.xobp + statcast.xslg : null)
    : (statcast[cfg.xField as keyof StatcastData] as number | undefined)
  if (expected == null) return null

  const rawDelta = actual - expected
  const magnitude = Math.abs(rawDelta)

  let severity: LuckSeverity = null
  if (magnitude >= cfg.strong) severity = 'strong'
  else if (magnitude >= cfg.mild) severity = 'mild'

  let direction: LuckDirection = null
  if (severity) {
    // For positive stats: actual > expected means overperforming (lucky).
    // For lower-is-better stats (ERA): actual < expected means overperforming.
    const isOver = cfg.lowerIsBetter ? rawDelta < 0 : rawDelta > 0
    direction = isOver ? 'over' : 'under'
  }

  // Unsigned magnitude — the caller pairs this with a direction arrow so the
  // sign is already conveyed. "+12" next to ↑ reads as double-signalling.
  const magDisplay = Math.abs(rawDelta)
  const formatted = cfg.unit === 'runs'
    ? magDisplay.toFixed(2)
    : `${Math.round(magDisplay * 1000)} pts`

  return { direction, severity, delta: rawDelta, actual, expected, formatted }
}

// Detect breakout signals by comparing Statcast actuals to FG projection
function detectBreakouts(fg: FGProjection | null, sc: StatcastData | null): string[] {
  if (!fg || !sc) return []
  const signals: string[] = []

  if (sc.player_type === 'batter') {
    // Barrel rate breakout (≥3% above career-like baseline implies power surge)
    if (sc.barrel_rate != null && sc.barrel_rate >= 12) {
      signals.push(`barrel_elite:${sc.barrel_rate.toFixed(1)}%`)
    }
    // xwOBA significantly above projection wOBA
    if (sc.xwoba != null && fg.woba != null && sc.xwoba - fg.woba > 0.030) {
      signals.push(`xwoba_up:+${((sc.xwoba - fg.woba) * 1000).toFixed(0)}pts`)
    }
    if (sc.xwoba != null && fg.woba != null && fg.woba - sc.xwoba > 0.030) {
      signals.push(`xwoba_down:-${((fg.woba - sc.xwoba) * 1000).toFixed(0)}pts`)
    }
    // Hard hit elite
    if (sc.hard_hit_pct != null && sc.hard_hit_pct >= 45) {
      signals.push(`hard_hit_elite:${sc.hard_hit_pct.toFixed(1)}%`)
    }
  }

  if (sc.player_type === 'pitcher') {
    // K-BB% elite
    if (sc.k_pct != null && sc.bb_pct != null) {
      const kbb = sc.k_pct - sc.bb_pct
      if (kbb >= 20) signals.push(`kbb_elite:${kbb.toFixed(1)}%`)
    }
    // xERA significantly below projected ERA
    if (sc.xera != null && fg.era != null && fg.era - sc.xera > 0.50) {
      signals.push(`xera_up:${sc.xera.toFixed(2)}vs${fg.era.toFixed(2)}`)
    }
    if (sc.xera != null && fg.era != null && sc.xera - fg.era > 0.50) {
      signals.push(`xera_down:${sc.xera.toFixed(2)}vs${fg.era.toFixed(2)}`)
    }
    // Whiff rate elite (swinging strike indicator)
    if (sc.whiff_pct != null && sc.whiff_pct >= 30) {
      signals.push(`whiff_elite:${sc.whiff_pct.toFixed(1)}%`)
    }
  }

  return signals
}

// Compute a projected total-points value for a player from their FG projection
// and a league's scoring rules. Scoring is passed keyed by category display
// name (R, HR, SB, K, ERA, …) to stay platform-agnostic; the caller is
// responsible for translating Yahoo/Sleeper/ESPN stat_ids → display names
// using league settings.
//
// Returns 0 when no scored categories map to the player's type — callers
// should treat that as "skip this player, no FG overlay."
export function computePointsFromFG(
  fg: FGProjection,
  scoringByDisplayName: Record<string, number>
): number {
  const isPit = fg.player_type === 'pitcher'
  const mapping = isPit ? DISPLAY_NAME_TO_FG_PITCHER : DISPLAY_NAME_TO_FG_BATTER
  let total = 0
  let hits = 0
  for (const [rawName, pts] of Object.entries(scoringByDisplayName)) {
    if (!pts) continue
    const mapper = mapping[rawName.toUpperCase().trim()]
    if (!mapper) continue
    const val = typeof mapper === 'string' ? (fg as any)[mapper] : mapper(fg)
    if (val == null) continue
    total += pts * val
    hits++
  }
  return hits > 0 ? total : 0
}

// Lightweight helper for views (e.g. Points rankings) that want Statcast +
// FG data attached to players without running the full category-overlay
// logic. Returns a matcher function callers apply per-player.
export async function buildPlayerMatchers(): Promise<{
  matchFG: (player: { full_name?: string; mlb_team?: string }) => FGProjection | null
  matchStatcast: (player: { full_name?: string; mlb_team?: string }) => StatcastData | null
}> {
  const { projections, statcast } = await loadProjectionData()
  const lookups = buildLookups(projections, statcast)
  return {
    matchFG: (p) => {
      const name = p.full_name || ''
      let fg = lookups.fgByNameTeam.get(makeMatchKey(name, p.mlb_team))
      if (!fg) fg = lookups.fgByName.get(makeNameOnlyKey(name)) || null
      return fg || null
    },
    matchStatcast: (p) => {
      const name = p.full_name || ''
      return lookups.scByName.get(makeNameOnlyKey(name)) || null
    },
  }
}

// Main function: enrich platform players with FanGraphs + Statcast data.
// Accepts either the league's category objects (preferred — lets us key off
// display_name, which is consistent across ESPN/Yahoo/Sleeper) or the legacy
// string[] of stat_ids (ESPN-only fallback).
export async function enrichPlayersWithProjections(
  espnPlayers: any[],
  categoriesOrStatIds: Array<{ stat_id: string; display_name?: string; isPitching?: boolean }> | string[]
): Promise<Map<string, EnrichedProjection>> {
  const { projections, statcast } = await loadProjectionData()

  if (projections.length === 0) {
    console.warn('[ProjectionService] No FanGraphs data available — using ESPN projections only')
    return new Map()
  }

  const categories: Array<{ stat_id: string; display_name?: string; isPitching?: boolean }> =
    Array.isArray(categoriesOrStatIds) && typeof categoriesOrStatIds[0] === 'string'
      ? (categoriesOrStatIds as string[]).map(id => ({ stat_id: id }))
      : (categoriesOrStatIds as Array<{ stat_id: string; display_name?: string; isPitching?: boolean }>)

  const lookups = buildLookups(projections, statcast)
  const enriched = new Map<string, EnrichedProjection>()

  let matched = 0
  let unmatched = 0

  for (const player of espnPlayers) {
    const { fg, sc } = matchPlayer(player, lookups)
    const playerKey = player.player_key || player.player_id?.toString() || player.full_name

    if (fg) {
      matched++
      enriched.set(playerKey, {
        fgProjection: fg,
        statcast: sc,
        mappedStats: mapToEspnStats(fg, categories),
        breakoutSignals: detectBreakouts(fg, sc),
      })
    } else {
      unmatched++
    }
  }

  console.log(`[ProjectionService] Matched ${matched}/${matched + unmatched} players to FanGraphs projections`)

  return enriched
}
