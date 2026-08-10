/**
 * Timing — resolves how long each scene runs.
 *
 * Audio drives timing, not the other way around. A scene is built with
 * VO *text*; the real clip duration is unknown until synthesis returns.
 * Once it does, durations are written back onto the scenes and these
 * helpers resolve the final lengths. Rendering before that loop closes
 * is what produces bars that finish filling after the narrator already
 * said the number.
 *
 * In Phase 0 no scene has a voDurationMs, so every scene runs at its
 * floor. That is intentional and correct.
 */

/** Motion starts before the voice does. */
export const LEAD_IN_MS = 400
/** A beat to let the last value land before the wipe. */
export const TAIL_MS = 700

export const FPS = 30

interface Timed {
  minDurationMs: number
  voDurationMs?: number
}

export function sceneDurationMs(scene: Timed): number {
  const voiced =
    scene.voDurationMs != null
      ? LEAD_IN_MS + scene.voDurationMs + TAIL_MS
      : 0
  return Math.max(scene.minDurationMs, voiced)
}

export function msToFrames(ms: number, fps: number = FPS): number {
  if (ms <= 0) return 0
  return Math.max(1, Math.round((ms / 1000) * fps))
}

export function reelDurationMs(scenes: Timed[]): number {
  return scenes.reduce((total, s) => total + sceneDurationMs(s), 0)
}
