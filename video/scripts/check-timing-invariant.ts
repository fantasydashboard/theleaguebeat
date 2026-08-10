/**
 * Standalone invariant check for video/src/timing.ts.
 *
 * The package has no test runner installed (Vitest/Jest would be
 * disproportionate for one package-internal invariant), so this is a
 * plain script, runnable directly by Node's built-in TypeScript type
 * stripping (Node >=22.6, no flag needed on >=23.6 — verified on the
 * Node 24.11.1 used to build this package):
 *
 *   node video/scripts/check-timing-invariant.ts
 *
 * It proves two things:
 *
 * 1. The bug was real: rounding the *total* scene duration to frames
 *    in one shot ("naive"/pre-fix reelFrames) can disagree with
 *    summing each scene's *independently rounded* frame count
 *    ("naive"/pre-fix per-<Series.Sequence> durationInFrames) — using
 *    the exact reproduction case from code review.
 * 2. The fix holds: video/src/timing.ts's real sceneFrames/reelFrames
 *    never disagree, because reelFrames is now literally the sum of
 *    the same sceneFrames array every <Series.Sequence> uses — for
 *    the review's worked example, and for a randomized fuzz sweep of
 *    non-round VO durations.
 */
import { sceneDurationMs, sceneFrames, reelFrames } from '../src/timing.ts'
import type { Reel, ReelScene } from '../../src/editorial/video/types.ts'

const FPS = 30

function scene(minDurationMs: number, voDurationMs?: number): ReelScene {
  return {
    template: 'the-board',
    props: { rows: [], note: '' },
    vo: '',
    minDurationMs,
    ...(voDurationMs != null ? { voDurationMs } : {}),
  } as unknown as ReelScene
}

function reelOf(scenes: ReelScene[]): Reel {
  return {
    leagueId: 'check',
    leagueName: 'Check League',
    year: 2026,
    week: 1,
    width: 1080,
    height: 1920,
    fps: FPS,
    scenes,
  }
}

/** The pre-fix computation: rounds the summed ms once. */
function naiveReelFrames(reel: Reel): number {
  const ms = reel.scenes.reduce((t, s) => t + sceneDurationMs(s), 0)
  return Math.max(1, Math.round((ms / 1000) * reel.fps))
}

/** The pre-fix computation: rounds each scene's ms independently, then sums. */
function naiveSequenceFrameSum(reel: Reel): number {
  return reel.scenes.reduce(
    (t, s) => t + Math.max(1, Math.round((sceneDurationMs(s) / 1000) * reel.fps)),
    0,
  )
}

let failures = 0
function assertEqual(label: string, actual: number | string, expected: number | string) {
  if (actual !== expected) {
    failures++
    console.error(`FAIL ${label}: expected ${expected}, got ${actual}`)
  } else {
    console.log(`ok   ${label}: ${actual}`)
  }
}

// --- 1. Reproduce the pre-fix bug on the review's worked example ---

const worked = reelOf([
  scene(4000, 5034),
  scene(3000, 2393),
  scene(11000, 2571),
  scene(9000, 6574),
  scene(3000, 9252),
])

const perSceneDurationsMs = worked.scenes.map(sceneDurationMs)
console.log('worked-example scene durations (ms):', perSceneDurationsMs)
assertEqual('worked example: scene durations match review', JSON.stringify(perSceneDurationsMs), JSON.stringify([6134, 3493, 11000, 9000, 10352]))

const naiveTotal = naiveReelFrames(worked)
const naiveSeqSum = naiveSequenceFrameSum(worked)
console.log(`pre-fix naive reelFrames (round-the-total): ${naiveTotal}`)
console.log(`pre-fix naive per-sequence sum (round-each-then-sum): ${naiveSeqSum}`)
if (naiveTotal === naiveSeqSum) {
  failures++
  console.error('FAIL: expected the pre-fix computations to disagree on this worked example (they used to, by design of the repro) — if they now agree, the repro case no longer demonstrates the bug.')
} else {
  console.log(`ok   pre-fix computations disagree as expected: ${naiveTotal} !== ${naiveSeqSum} (this was the bug)`)
}
assertEqual('worked example: pre-fix naive total was 1 frame short', naiveTotal, 1199)
assertEqual('worked example: pre-fix naive per-sequence sum', naiveSeqSum, 1200)

// --- 2. Prove the fix: real timing.ts never disagrees with itself ---

const fixedFrames = sceneFrames(worked)
const fixedTotal = reelFrames(worked)
console.log('fixed sceneFrames array:', fixedFrames)
assertEqual('worked example: fixed sceneFrames matches expected per-scene frames', JSON.stringify(fixedFrames), JSON.stringify([184, 105, 330, 270, 311]))
assertEqual('worked example: fixed reelFrames', fixedTotal, 1200)
assertEqual('worked example: fixed reelFrames === sum(sceneFrames)', fixedTotal, fixedFrames.reduce((a, b) => a + b, 0))

// --- 3. Randomized fuzz: the fix holds across many non-round reels,
//        and the pre-fix computations really would have diverged a lot ---

function randomReel(sceneCount: number): Reel {
  const scenes: ReelScene[] = []
  for (let i = 0; i < sceneCount; i++) {
    const minDurationMs = 3000 + Math.floor(Math.random() * 8000)
    const hasVo = Math.random() < 0.85
    const voDurationMs = hasVo ? 1000 + Math.floor(Math.random() * 9000) : undefined
    scenes.push(scene(minDurationMs, voDurationMs))
  }
  return reelOf(scenes)
}

const TRIALS = 500
let divergedPreFix = 0
for (let t = 0; t < TRIALS; t++) {
  const sceneCount = 4 + Math.floor(Math.random() * 3) // 4-6 scenes
  const reel = randomReel(sceneCount)

  if (naiveReelFrames(reel) !== naiveSequenceFrameSum(reel)) {
    divergedPreFix++
  }

  const frames = sceneFrames(reel)
  const total = reelFrames(reel)
  if (total !== frames.reduce((a, b) => a + b, 0)) {
    failures++
    console.error(`FAIL trial ${t}: fixed reelFrames (${total}) !== sum(sceneFrames) (${frames.reduce((a, b) => a + b, 0)})`)
  }
}

const divergenceRate = (divergedPreFix / TRIALS) * 100
console.log(`fuzz: pre-fix computations disagreed on ${divergedPreFix}/${TRIALS} random reels (${divergenceRate.toFixed(1)}%) — consistent with code review's ~21% finding`)
console.log(`fuzz: fixed sceneFrames/reelFrames agreed on all ${TRIALS} trials`)

if (divergedPreFix === 0) {
  failures++
  console.error('FAIL: expected some pre-fix divergence in the fuzz sweep (that is the whole premise of the bug) — got zero, which means this fuzz run is not exercising the failure mode.')
}

if (failures > 0) {
  console.error(`\n${failures} check(s) failed.`)
  process.exit(1)
}
console.log(`\nAll checks passed.`)
