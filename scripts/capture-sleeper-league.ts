/**
 * Captures one Sleeper league's raw API responses into a committed
 * fixture, so the adapter can be built and tested against real data.
 *
 * Sleeper's API is public and unauthenticated — no tokens, no cookies.
 *
 *   npx vite-node scripts/capture-sleeper-league.ts <leagueId> [weeks] [historyDepth]
 *
 * Captures, in one pass:
 *   - the league, its rosters, users and per-week matchups
 *   - the draft and every pick (picks carry full player metadata, so
 *     draft stories need no separate player lookup — the /players/nfl
 *     blob is ~5MB and deliberately never captured)
 *   - prior seasons, walked back through `previous_league_id`
 *   - a second league pinned purely as a playoff-edge-case fixture
 */

import { writeFileSync, mkdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const BASE = 'https://api.sleeper.app/v1'

/**
 * A second, unrelated league kept in the fixture because it has
 * `playoff_week_start: 0` alongside `playoff_teams: 6` — the real-world
 * case proving 0 means UNSET rather than "no playoffs". Pinned here so a
 * plain regeneration cannot silently drop it and take
 * `sleeperPoints.test.ts` down with it.
 */
const PLAYOFF_EDGE_CASE_LEAGUE_ID = '1268981869060296704'

const leagueId = process.argv[2]
if (!leagueId) {
  console.error('usage: npx vite-node scripts/capture-sleeper-league.ts <leagueId> [weeks] [historyDepth]')
  process.exit(1)
}
const weeks = Number(process.argv[3] ?? 4)
// Prior seasons to walk back. Each season adds its league, rosters and
// users to the fixture, so this is the main lever on fixture size.
const historyDepth = Number(process.argv[4] ?? 4)

async function get(path: string): Promise<unknown> {
  const res = await fetch(`${BASE}${path}`)
  if (!res.ok) throw new Error(`${path} → HTTP ${res.status}`)
  return res.json()
}

/** Fetches, but returns null instead of throwing — for optional pieces
 *  whose absence is a fact about the league, not a failure. */
async function tryGet(path: string): Promise<unknown | null> {
  try {
    return await get(path)
  } catch {
    return null
  }
}

const league = await get(`/league/${leagueId}`) as Record<string, unknown> | null
if (!league) {
  console.error(`No league ${leagueId}. Sleeper returns null for unknown ids.`)
  process.exit(1)
}

const rosters = await get(`/league/${leagueId}/rosters`)
const users = await get(`/league/${leagueId}/users`)

const matchupsByWeek: Record<string, unknown> = {}
for (let w = 1; w <= weeks; w++) {
  try {
    const m = await get(`/league/${leagueId}/matchups/${w}`)
    if (Array.isArray(m) && m.length > 0) matchupsByWeek[String(w)] = m
  } catch {
    // A week that has not happened yet 404s or returns empty — skip it
    // rather than inventing an entry.
  }
}

/* ── Draft ─────────────────────────────────────────────────────────
   `league.draft_id` points at the league's draft. Picks carry a
   `metadata` block with first_name/last_name/position/team, which is
   why draft copy can name players without the players blob. */
const draftId = (league as any).draft_id as string | undefined
const draft = draftId
  ? {
      info: await tryGet(`/draft/${draftId}`),
      picks: (await tryGet(`/draft/${draftId}/picks`)) ?? [],
    }
  : null

/* ── History ───────────────────────────────────────────────────────
   Sleeper links seasons with `previous_league_id`. Walk it back for the
   prior seasons' final state. Matchups are deliberately NOT captured
   per historical season: `roster.settings` already carries the final
   wins/losses/points, which is what season-level history needs, and
   per-week matchups for six seasons would multiply the fixture size for
   data nothing reads. */
type HistorySeason = {
  league: unknown
  rosters: unknown
  users: unknown
  /** Playoff bracket. The ONLY authoritative source for a season's
   *  champion and runner-up: the final match carries `w` and `l`.
   *  `metadata.latest_league_winner_roster_id` agrees where it exists
   *  but is absent on older seasons, and regular-season record is not a
   *  substitute — in this league the champion had the best record in
   *  none of the three seasons where both are known. */
  winnersBracket: unknown
}
const history: HistorySeason[] = []
const seenLeagueIds = new Set<string>([leagueId])
let cursor = (league as any).previous_league_id as string | null | undefined

for (let i = 0; i < historyDepth && cursor; i++) {
  // Guard against a cyclic or self-referential chain rather than
  // trusting the upstream data to be acyclic.
  if (seenLeagueIds.has(cursor)) break
  seenLeagueIds.add(cursor)

  const prior = await tryGet(`/league/${cursor}`) as Record<string, unknown> | null
  if (!prior) break

  history.push({
    league: prior,
    rosters: (await tryGet(`/league/${cursor}/rosters`)) ?? [],
    users: (await tryGet(`/league/${cursor}/users`)) ?? [],
    winnersBracket: (await tryGet(`/league/${cursor}/winners_bracket`)) ?? [],
  })
  cursor = (prior as any).previous_league_id as string | null | undefined
}

/* ── Playoff edge case ─────────────────────────────────────────────
   Re-fetched every run so it stays a real capture rather than a stale
   copy carried forward by hand. */
const unsetPlayoffWeekLeague = await tryGet(`/league/${PLAYOFF_EDGE_CASE_LEAGUE_ID}`)
if (!unsetPlayoffWeekLeague) {
  console.error(
    `\nWARNING: could not fetch the playoff-edge-case league ` +
    `(${PLAYOFF_EDGE_CASE_LEAGUE_ID}). sleeperPoints.test.ts depends on it. ` +
    `Aborting rather than writing a fixture without it.`,
  )
  process.exit(1)
}

const winnersBracket = (await tryGet(`/league/${leagueId}/winners_bracket`)) ?? []

const fixture = {
  league,
  rosters,
  users,
  matchupsByWeek,
  draft,
  history,
  winnersBracket,
  unsetPlayoffWeekLeague,
}

const scriptDir = dirname(fileURLToPath(import.meta.url))
const out = resolve(scriptDir, '..', 'src/fixtures/sleeperFootball.ts')
mkdirSync(dirname(out), { recursive: true })
writeFileSync(
  out,
  `/* Captured from Sleeper's public API. Regenerate with:\n` +
  ` *   npx vite-node scripts/capture-sleeper-league.ts ${leagueId} ${weeks} ${historyDepth}\n` +
  ` *\n` +
  ` * \`unsetPlayoffWeekLeague\` is a second, unrelated league's raw\n` +
  ` * /league/{id} response, kept because it has playoff_week_start: 0\n` +
  ` * with playoff_teams: 6 — proof that 0 means UNSET, not "no\n` +
  ` * playoffs". sleeperPoints.test.ts reads it.\n` +
  ` */\n\n` +
  `export const sleeperFootballFixture = ${JSON.stringify(fixture, null, 2)} as const\n`,
)

console.log(`league:  ${(league as any).name} (${(league as any).season}, ${(league as any).status})`)
console.log(`rosters: ${(rosters as unknown[]).length}`)
console.log(`weeks:   ${Object.keys(matchupsByWeek).join(', ') || 'none'}`)
console.log(`scoring: ${Object.keys((league as any).scoring_settings ?? {}).length} settings`)
console.log(`playoff_week_start: ${(league as any).settings?.playoff_week_start}`)
console.log(`draft:   ${draft ? `${(draft.picks as unknown[]).length} picks` : 'none'}`)
console.log(`bracket: ${(winnersBracket as unknown[]).length} playoff matches`)
console.log(
  `history: ${history.length} prior season(s)` +
  (history.length ? ` — ${history.map((h) => (h.league as any).season).join(', ')}` : ''),
)
console.log(`\nWrote ${out}`)
