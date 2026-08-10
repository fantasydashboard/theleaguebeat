import type { Reel, ReelScene } from '../../src/editorial/video/types'

/**
 * Duplicated from src/editorial/video/timing.ts by design — this
 * package must never take a runtime dependency on the app's module
 * graph. See video/src/ReelVideo.tsx for the note on why.
 */
const LEAD_IN_MS = 400
const TAIL_MS = 700

export function sceneDurationMs(scene: ReelScene): number {
  const voiced = scene.voDurationMs != null
    ? LEAD_IN_MS + scene.voDurationMs + TAIL_MS
    : 0
  return Math.max(scene.minDurationMs, voiced)
}

/**
 * Per-scene frame counts, computed once. The composition's total
 * duration and each scene's <Series.Sequence> length are both derived
 * from this same array so they can never disagree — rounding each
 * scene's ms to frames independently in two places (once for the
 * total, once per sequence) drifts by 1-2 frames whenever scene
 * durations aren't exact multiples of one frame, which real (non-round)
 * VO durations will not be.
 */
export function sceneFrames(reel: Reel): number[] {
  return reel.scenes.map((s) =>
    Math.max(1, Math.round((sceneDurationMs(s) / 1000) * reel.fps)),
  )
}

export function reelFrames(reel: Reel): number {
  return sceneFrames(reel).reduce((a, b) => a + b, 0)
}
