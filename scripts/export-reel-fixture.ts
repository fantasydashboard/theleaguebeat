/**
 * Exports a Reel built from the demo fixture league to
 * video/fixtures/reel.json, so the Remotion package has real input
 * without importing the app.
 *
 * Run: npx vite-node scripts/export-reel-fixture.ts
 */

import { writeFileSync, mkdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
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
// which selectStoriesForIssue scores and trims.
const stories = selectStoriesForIssue(detectAll(data, context), context)
const reel = buildReel(data, context, stories)

const out = resolve(process.cwd(), 'video/fixtures/reel.json')
mkdirSync(dirname(out), { recursive: true })
writeFileSync(out, JSON.stringify(reel, null, 2) + '\n')

console.log(`Wrote ${out}`)
console.log(`${reel.scenes.length} scenes:`, reel.scenes.map((s) => s.template).join(' → '))
