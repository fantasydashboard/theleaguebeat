import React from 'react'
import { Series } from 'remotion'
import type { Reel, ReelScene } from '../../src/editorial/video/types'
import { Backdrop } from './chrome'
import { ColdOpen } from './scenes/ColdOpen'
import { SignOff } from './scenes/SignOff'
import { TheBoard } from './scenes/TheBoard'
import { TheThrone } from './scenes/TheThrone'
import { theme } from './theme'
import { sceneFrames } from './timing'

/**
 * The scene-duration formula itself lives in ./timing.ts, duplicated
 * from src/editorial/video/timing.ts on purpose: this package must
 * never take a runtime dependency on the app's module graph, so a
 * small amount of duplicated logic is the accepted cost of isolation.
 * Re-exported here so Root.tsx's existing import keeps working.
 */
export { sceneDurationMs, sceneFrames, reelFrames } from './timing'

/** Placeholder until the remaining scene components land in Tasks 10–12. */
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

const SceneSwitch: React.FC<{ scene: ReelScene; week: number }> = ({ scene, week }) => {
  switch (scene.template) {
    case 'cold-open':
      return <ColdOpen {...scene.props} />
    case 'sign-off':
      return <SignOff {...scene.props} />
    case 'the-board':
      return <TheBoard {...scene.props} week={week} />
    case 'the-throne':
      return <TheThrone {...scene.props} week={week} />
    default:
      return <Placeholder scene={scene} />
  }
}

export const ReelVideo: React.FC<{ reel: Reel }> = ({ reel }) => {
  const frames = sceneFrames(reel)
  return (
    <Series>
      {reel.scenes.map((scene, i) => (
        <Series.Sequence key={i} durationInFrames={frames[i]}>
          <SceneSwitch scene={scene} week={reel.week} />
        </Series.Sequence>
      ))}
    </Series>
  )
}
