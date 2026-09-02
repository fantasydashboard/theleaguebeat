/**
 * Collapse the flat league rows into one entry per league, with its
 * prior seasons attached.
 *
 * A league is one row per SEASON (the upsert key is user_id + platform
 * + platform_league_id + season), and platforms mint a fresh id every
 * year — Yahoo's `league_key` changes each season — so
 * `platform_league_id` alone cannot join them.
 *
 * Two signals do the joining, unioned together:
 *   1. Exact lineage, where the platform reports it. Sleeper's league
 *      payload carries `previous_league_id`, which the adapter persists.
 *   2. Name + platform + sport, for everything else.
 *
 * Signal 2 alone splits a league renamed between seasons — the honest
 * failure, two real rows rather than one wrong merge — and signal 1
 * removes that failure wherever a platform supports it.
 *
 * Lives here rather than in a view because the connect screen and the
 * in-app league switcher both need the same answer, and two
 * implementations of "which rows are the same league" would drift.
 */
import type { League } from '@/types/supabase'

export interface LeagueGroup {
  key: string
  /** Most recent season. */
  current: League
  /** Earlier seasons, most recent first. */
  past: League[]
}

const seasonOf = (l: League) => Number(l.season) || 0

export function groupLeaguesBySeason(rows: readonly League[]): LeagueGroup[] {
  // Union-find over two independent signals. Exact lineage merges what
  // it can; the name heuristic catches the rest. Running both means a
  // platform that reports lineage never depends on names matching, and
  // one that doesn't still groups.
  const parent = new Map<string, string>()
  const find = (x: string): string => {
    // Self-seed unknown ids: without this, `parent.get(x)` is undefined,
    // never equals `x`, and the walk below spins forever — an infinite
    // loop that would lock the tab rather than fail loudly.
    if (!parent.has(x)) parent.set(x, x)
    let root = x
    while (parent.get(root) !== root) root = parent.get(root)!
    let cur = x
    while (cur !== root) {
      const next = parent.get(cur)!
      parent.set(cur, root)
      cur = next
    }
    return root
  }
  const union = (a: string, b: string) => {
    const ra = find(a)
    const rb = find(b)
    if (ra !== rb) parent.set(ra, rb)
  }

  for (const l of rows) parent.set(l.id, l.id)

  // Signal 1 — name identity, within one platform and sport.
  const byName = new Map<string, string>()
  for (const l of rows) {
    const key = [l.platform, l.sport, (l.league_name ?? '').trim().toLowerCase()].join('|')
    const seen = byName.get(key)
    if (seen) union(l.id, seen)
    else byName.set(key, l.id)
  }

  // Signal 2 — exact season lineage.
  const byPlatformId = new Map<string, string>()
  for (const l of rows) {
    byPlatformId.set(`${l.platform}|${l.platform_league_id}`, l.id)
  }
  for (const l of rows) {
    const prev = (l.settings as Record<string, unknown> | null)?.previous_league_id
    if (!prev) continue
    const prevRowId = byPlatformId.get(`${l.platform}|${String(prev)}`)
    if (prevRowId) union(l.id, prevRowId)
  }

  const buckets = new Map<string, League[]>()
  for (const l of rows) {
    const root = find(l.id)
    const bucket = buckets.get(root)
    if (bucket) bucket.push(l)
    else buckets.set(root, [l])
  }

  const groups: LeagueGroup[] = []
  for (const [key, bucket] of buckets) {
    const sorted = [...bucket].sort((a, b) => seasonOf(b) - seasonOf(a))
    groups.push({ key, current: sorted[0], past: sorted.slice(1) })
  }

  // Most recent season first so the live league is at the top, then
  // alphabetical. A name-only order scatters old archives among this
  // year's leagues.
  return groups.sort((a, b) => {
    const bySeason = seasonOf(b.current) - seasonOf(a.current)
    if (bySeason !== 0) return bySeason
    return (a.current.league_name ?? '').localeCompare(b.current.league_name ?? '')
  })
}

/** The platform's own mark. Falls back to the TLB monogram so an
 *  unknown platform renders a box rather than a broken image. */
export function platformLogo(platform: string): string {
  if (platform === 'espn') return '/platform/espn.png'
  if (platform === 'yahoo') return '/platform/yahoo.png'
  if (platform === 'sleeper') return '/platform/sleeper.svg'
  return '/tlb-favicon.png'
}

/**
 * Human label for a league's scoring format.
 *
 * Values differ per platform: Yahoo sends lowercase (`head`,
 * `headpoint`, `point`, `roto`), ESPN sends screaming snake
 * (`H2H_CATEGORY`, `H2H_POINTS`, `TOTAL_POINTS`, `ROTO`), and Sleeper
 * is derived by the adapter. Returns null for anything unrecognised —
 * callers omit the field rather than print a raw enum or guess, since a
 * wrong "H2H points" badge on a category league would undermine every
 * number on the page it links to.
 */
export function scoringLabel(raw: string | null | undefined): string | null {
  if (!raw) return null
  switch (String(raw).toLowerCase()) {
    case 'head':
    case 'h2h_category':
      return 'H2H categories'
    case 'headpoint':
    case 'h2h_points':
      return 'H2H points'
    case 'point':
    case 'total_points':
      return 'Total points'
    case 'roto':
      return 'Roto'
    case 'best_ball':
      return 'Best ball'
    default:
      return null
  }
}
