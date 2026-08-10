import React from 'react'
import { Series } from 'remotion'
import type { Reel, ReelScene } from '../../src/editorial/video/types'
import { Backdrop } from './chrome'
import { theme } from './theme'

const LEAD_IN_MS = 400
const TAIL_MS = 700

export function sceneDurationMs(scene: ReelScene): number {
  const voiced = scene.voDurationMs != null
    ? LEAD_IN_MS + scene.voDurationMs + TAIL_MS
    : 0
  return Math.max(scene.minDurationMs, voiced)
}

export function reelFrames(reel: Reel): number {
  const ms = reel.scenes.reduce((t, s) => t + sceneDurationMs(s), 0)
  return Math.max(1, Math.round((ms / 1000) * reel.fps))
}

/** Placeholder until the scene components land in Tasks 9–12. */
const Placeholder: React.FC<{ scene: ReelScene }> = ({ scene }) => (
  <Backdrop>
    <div style={{
      position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
      justifyContent: 'center', fontFamily: theme.display, fontSize: 90,
      fontWeight: 900, color: theme.accent,
    }}>
      {scene.template}
    </div>
  </Backdrop>
)

export const ReelVideo: React.FC<{ reel: Reel }> = ({ reel }) => (
  <Series>
    {reel.scenes.map((scene, i) => (
      <Series.Sequence
        key={i}
        durationInFrames={Math.max(1, Math.round((sceneDurationMs(scene) / 1000) * reel.fps))}
      >
        <Placeholder scene={scene} />
      </Series.Sequence>
    ))}
  </Series>
)
