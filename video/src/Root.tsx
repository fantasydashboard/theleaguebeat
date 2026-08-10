import React from 'react'
import { Composition, registerRoot } from 'remotion'
import { ReelVideo, reelFrames } from './ReelVideo'
import type { Reel } from '../../src/editorial/video/types'
import fixture from '../fixtures/reel.json'

const reel = fixture as unknown as Reel

const RemotionRoot: React.FC = () => (
  <Composition
    id="Reel"
    component={ReelVideo}
    defaultProps={{ reel }}
    durationInFrames={reelFrames(reel)}
    fps={reel.fps}
    width={reel.width}
    height={reel.height}
  />
)

registerRoot(RemotionRoot)
