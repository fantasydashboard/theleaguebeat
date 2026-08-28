/**
 * Captures one Sleeper league's raw API responses into a committed
 * fixture, so the adapter can be built and tested against real data.
 *
 * Sleeper's API is public and unauthenticated — no tokens, no cookies.
 *
 *   npx vite-node scripts/capture-sleeper-league.ts <leagueId> [weeks]
 */

import { writeFileSync, mkdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const BASE = 'https://api.sleeper.app/v1'

const leagueId = process.argv[2]
if (!leagueId) {
  console.error('usage: npx vite-node scripts/capture-sleeper-league.ts <leagueId> [weeks]')
  process.exit(1)
}
const weeks = Number(process.argv[3] ?? 4)

async function get(path: string): Promise<unknown> {
  const res = await fetch(`${BASE}${path}`)
  if (!res.ok) throw new Error(`${path} → HTTP ${res.status}`)
  return res.json()
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

const fixture = { league, rosters, users, matchupsByWeek }

const scriptDir = dirname(fileURLToPath(import.meta.url))
const out = resolve(scriptDir, '..', 'src/fixtures/sleeperFootball.ts')
mkdirSync(dirname(out), { recursive: true })
writeFileSync(
  out,
  `/* Captured from Sleeper's public API. Regenerate with:\n` +
  ` *   npx vite-node scripts/capture-sleeper-league.ts ${leagueId} ${weeks}\n` +
  ` */\n\n` +
  `export const sleeperFootballFixture = ${JSON.stringify(fixture, null, 2)} as const\n`,
)

console.log(`league:  ${(league as any).name} (${(league as any).season}, ${(league as any).status})`)
console.log(`rosters: ${(rosters as unknown[]).length}`)
console.log(`weeks:   ${Object.keys(matchupsByWeek).join(', ') || 'none'}`)
console.log(`scoring: ${Object.keys((league as any).scoring_settings ?? {}).length} settings`)
console.log(`playoff_week_start: ${(league as any).settings?.playoff_week_start}`)
console.log(`\nWrote ${out}`)
