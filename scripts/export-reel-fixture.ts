/**
 * Exports a Reel built from the demo fixture league to
 * video/fixtures/reel.json, so the Remotion package has real input
 * without importing the app.
 *
 * Run: npx vite-node scripts/export-reel-fixture.ts
 */

import { writeFileSync, mkdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { categoriesFixtureToLeagueData } from '../src/editorial/fixtureAdapter'
import { buildReel } from '../src/editorial/video/buildReel'
import { detectAll } from '../src/editorial/detection'
import { selectStoriesForIssue } from '../src/editorial/selection'
import type { IssueContext } from '../src/editorial/detection/types'

// The fixture module exports its pieces individually (teams, standings,
// seasonRankHistory, …). fixtureAdapter assembles them into the real
// CategoryLeagueData contract — use it rather than hand-building one.
const data = categoriesFixtureToLeagueData()

const context: IssueContext = {
  currentWeek: data.currentWeek,
  seasonStage: 'midseason',
  issueDate: new Date('2026-08-09T12:00:00Z'),
}

// detectAll is the detection orchestrator; it returns raw candidates,
// which selectStoriesForIssue scores and trims. --quiet skips detection
// entirely and hands buildReel an empty stories array, so the reel that
// comes out is only the fixed spine (cold-open, the-board, sign-off if
// eligible) — this is the quiet-week gate, not a fabricated slow week.
const quiet = process.argv.includes('--quiet')
const stories = quiet
  ? []
  : selectStoriesForIssue(detectAll(data, context), context)
const reel = buildReel(data, context, stories)

const outFile = quiet ? 'video/fixtures/reel-quiet.json' : 'video/fixtures/reel.json'

// Resolved relative to this file, not the shell's cwd, so running the
// script from a subdirectory can't write the fixture somewhere else.
const scriptDir = dirname(fileURLToPath(import.meta.url))
const out = resolve(scriptDir, '..', outFile)
mkdirSync(dirname(out), { recursive: true })
writeFileSync(out, JSON.stringify(reel, null, 2) + '\n')

console.log(`Wrote ${out}`)
console.log(`${reel.scenes.length} scenes:`, reel.scenes.map((s) => s.template).join(' → '))
