import React from 'react'
import { Series } from 'remotion'
import type { Reel, ReelScene } from '../../src/editorial/video/types'
import { ColdOpen } from './scenes/ColdOpen'
import { SignOff } from './scenes/SignOff'
import { TheBoard } from './scenes/TheBoard'
import { TheClimb } from './scenes/TheClimb'
import { TheThrone } from './scenes/TheThrone'
import { sceneFrames } from './timing'

/**
 * The scene-duration formula itself lives in ./timing.ts, duplicated
 * from src/editorial/video/timing.ts on purpose: this package must
 * never take a runtime dependency on the app's module graph, so a
 * small amount of duplicated logic is the accepted cost of isolation.
 * Re-exported here so Root.tsx's existing import keeps working.
 */
export { sceneDurationMs, sceneFrames, reelFrames } from './timing'

/**
 * All five templates in `SceneTemplate` now have a component, so this
 * switch is exhaustive by construction — no `default` arm. If a new
 * template is ever added to the discriminated union without a matching
 * case here, TypeScript reports a missing return on this function
 * instead of the renderer silently falling through to a blank scene.
 */
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
    case 'the-climb':
      return <TheClimb {...scene.props} week={week} />
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
