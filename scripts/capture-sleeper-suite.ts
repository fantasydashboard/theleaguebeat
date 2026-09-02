/**
 * Captures SEVERAL structurally different Sleeper leagues into one
 * conformance fixture.
 *
 *   npx vite-node scripts/capture-sleeper-suite.ts <id> [<id> ...]
 *
 * `sleeperFootball.ts` is one league captured in depth — draft, history,
 * every week — and it is what the adapter was built against. The risk of
 * building against a single league is that its shape silently becomes
 * the assumed shape. This suite exists to break that: a handful of real
 * leagues that differ on the axes that actually vary.
 *
 * Axes worth covering (all observed in real leagues, none invented):
 *   - roster count (10 vs 12, and odd counts, which create byes)
 *   - `playoff_week_start: 0`, which means UNSET, not "no playoffs"
 *   - `playoff_teams` absent entirely
 *   - `league_average_match: 1` — every team ALSO plays the league
 *     median each week, so a week holds more results than games
 *   - `settings.type` 0/1/2/3 (redraft / keeper / dynasty / other)
 *   - divisions present, zero, or absent
 *
 * Only a few weeks are captured per league — enough to exercise opening,
 * midseason, the regular-season close and the playoffs — because the
 * point here is structural variety across leagues, not depth within one.
 */

import { writeFileSync, mkdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const BASE = 'https://api.sleeper.app/v1'

/** Weeks that exercise the interesting transitions without capturing
 *  a full season for every league. */
const SAMPLE_WEEKS = [1, 8, 14, 15, 16, 17]

const leagueIds = process.argv.slice(2)
if (leagueIds.length === 0) {
  console.error('usage: npx vite-node scripts/capture-sleeper-suite.ts <id> [<id> ...]')
  process.exit(1)
}

async function tryGet(path: string): Promise<unknown | null> {
  try {
    const res = await fetch(`${BASE}${path}`)
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

type Captured = {
  league: Record<string, unknown>
  rosters: unknown
  users: unknown
  matchupsByWeek: Record<string, unknown>
}

const leagues: Captured[] = []

for (const id of leagueIds) {
  const league = (await tryGet(`/league/${id}`)) as Record<string, unknown> | null
  if (!league) {
    console.error(`  skip ${id} — Sleeper returned null`)
    continue
  }

  const matchupsByWeek: Record<string, unknown> = {}
  for (const w of SAMPLE_WEEKS) {
    const m = await tryGet(`/league/${id}/matchups/${w}`)
    if (Array.isArray(m) && m.length > 0) matchupsByWeek[String(w)] = m
  }

  leagues.push({
    league,
    rosters: (await tryGet(`/league/${id}/rosters`)) ?? [],
    users: (await tryGet(`/league/${id}/users`)) ?? [],
    matchupsByWeek,
  })

  const s = (league as any).settings ?? {}
  console.log(
    `  ${String((league as any).name).slice(0, 26).padEnd(26)} ` +
    `teams=${String((league as any).total_rosters).padEnd(3)} ` +
    `pw=${String(s.playoff_week_start).padEnd(3)} ` +
    `pt=${String(s.playoff_teams).padEnd(5)} ` +
    `type=${s.type} avg=${s.league_average_match} div=${s.divisions} ` +
    `weeks=${Object.keys(matchupsByWeek).length}`,
  )
}

if (leagues.length === 0) {
  console.error('No leagues captured — refusing to write an empty fixture.')
  process.exit(1)
}

const scriptDir = dirname(fileURLToPath(import.meta.url))
const out = resolve(scriptDir, '..', 'src/fixtures/sleeperLeagueSuite.ts')
mkdirSync(dirname(out), { recursive: true })
writeFileSync(
  out,
  `/* Structural conformance fixture — several real Sleeper leagues that\n` +
  ` * differ on the axes that actually vary between leagues. Regenerate:\n` +
  ` *   npx vite-node scripts/capture-sleeper-suite.ts ${leagueIds.join(' ')}\n` +
  ` *\n` +
  ` * Do NOT trim this to the shapes the code currently handles — its\n` +
  ` * whole job is to contain leagues the code might not.\n` +
  ` */\n\n` +
  `export const sleeperLeagueSuite = ${JSON.stringify(leagues, null, 2)} as const\n`,
)

console.log(`\nCaptured ${leagues.length} leagues → ${out}`)
