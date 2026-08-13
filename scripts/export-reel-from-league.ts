/**
 * Builds a Reel from a REAL league's captured data, so the video can be
 * exercised against something other than the demo fixture.
 *
 * The input is a `CategoryLeagueData` JSON blob — exactly what
 * `league_issues.data` stores. Capture it from the browser (where your
 * Supabase session already exists) rather than wiring service-role
 * credentials into a local script; see docs/REAL_LEAGUE_CAPTURE.md.
 *
 *   npx vite-node scripts/export-reel-from-league.ts <path-to-league.json>
 *
 * Writes video/fixtures/reel-live.json and prints the resulting shot
 * list. Nothing here touches the committed demo fixtures.
 */

import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildReel } from '../src/editorial/video/buildReel'
import { detectAll } from '../src/editorial/detection'
import { selectStoriesForIssue } from '../src/editorial/selection'
import type { IssueContext, SeasonStage } from '../src/editorial/detection/types'
import type { CategoryLeagueData } from '../src/editorial/types'

const inputArg = process.argv[2]
if (!inputArg) {
  console.error('usage: npx vite-node scripts/export-reel-from-league.ts <path-to-league.json>')
  process.exit(1)
}

const inputPath = resolve(process.cwd(), inputArg)
if (!existsSync(inputPath)) {
  console.error(`no such file: ${inputPath}`)
  process.exit(1)
}

const data = JSON.parse(readFileSync(inputPath, 'utf8')) as CategoryLeagueData

/* Fail loudly and specifically on the wrong shape. A half-right blob
 * would otherwise produce a reel that looks plausible and is wrong. */
const missing: string[] = []
if (data.format !== 'h2h-category') missing.push(`format must be 'h2h-category' (got ${String(data.format)})`)
for (const key of ['leagueId', 'leagueName', 'currentWeek', 'currentSeason'] as const) {
  if (data[key] == null) missing.push(`missing ${key}`)
}
for (const key of ['teams', 'standings', 'categories', 'seasonRankHistory'] as const) {
  if (!Array.isArray(data[key])) missing.push(`missing or non-array ${key}`)
}
if (missing.length) {
  console.error('This does not look like CategoryLeagueData:')
  for (const m of missing) console.error('  - ' + m)
  process.exit(1)
}

/** Mirrors the app's own staging: the season's shape drives which
 *  stories are even eligible, so getting this wrong silently changes
 *  the shot list. Override with --stage=<stage> when the default
 *  guess is wrong for the league you captured. */
function inferStage(d: CategoryLeagueData): SeasonStage {
  const end = d.regularSeasonEndWeek ?? 22
  const w = d.currentWeek
  if (w <= 2) return 'opening'
  if (w > end) return 'playoffs'
  if (w >= end - 1) return 'final'
  if (w >= end - 4) return 'stretch'
  return 'midseason'
}

const stageArg = process.argv.find((a) => a.startsWith('--stage='))?.split('=')[1] as SeasonStage | undefined
const seasonStage = stageArg ?? inferStage(data)

const context: IssueContext = {
  currentWeek: data.currentWeek,
  seasonStage,
  issueDate: new Date(),
}

const stories = selectStoriesForIssue(detectAll(data, context), context)
const reel = buildReel(data, context, stories)

const scriptDir = dirname(fileURLToPath(import.meta.url))
const out = resolve(scriptDir, '..', 'video/fixtures/reel-live.json')
mkdirSync(dirname(out), { recursive: true })
/* Wrapped as `{ reel }`, NOT the bare Reel object like the committed
 * fixtures. Remotion's `--props` merges the parsed JSON's top-level
 * keys into the composition's defaultProps ({ reel }), so a bare Reel
 * blob here would silently leave defaultProps.reel untouched and
 * render the baked-in demo fixture at the baked-in demo length — the
 * exact failure calculateMetadata was introduced to prevent. */
writeFileSync(out, JSON.stringify({ reel }, null, 2) + '\n')

/* ── What actually happened, so a thin reel is diagnosable ── */
console.log(`\n${data.leagueName} — week ${data.currentWeek}, ${data.currentSeason} (${seasonStage})`)
console.log(`${data.teams.length} teams · ${data.categories.length} categories · ${data.seasonRankHistory.length} weeks of history`)
console.log(`logos: ${data.teams.filter((t) => t.avatarUrl).length}/${data.teams.length} teams have avatarUrl`)
console.log(`matchupsCurrentWeek: ${data.matchupsCurrentWeek?.length ?? 0} · matchupsByWeek keys: ${Object.keys(data.matchupsByWeek ?? {}).join(', ') || 'none'}`)

console.log(`\ndetected ${stories.length} stories:`)
for (const s of stories) console.log(`  ${s.type.padEnd(28)} teams=${(s.teamIds ?? []).length} score=${s.score.toFixed(1)}`)

console.log(`\n${reel.scenes.length} scenes:`)
for (const s of reel.scenes) console.log(`  ${s.template.padEnd(12)} "${s.vo}"`)

const secs = reel.scenes.reduce((t, s) => t + s.minDurationMs, 0) / 1000
console.log(`\nWrote ${out} (${secs}s)`)
console.log('Render:  cd video && npx remotion render src/Root.tsx Reel out/reel-live.mp4 --props=../video/fixtures/reel-live.json')
