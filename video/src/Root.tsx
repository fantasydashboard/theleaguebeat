import React from 'react'
import { Composition, registerRoot } from 'remotion'
import { ReelVideo, reelFrames } from './ReelVideo'
import type { Reel } from '../../src/editorial/video/types'
import fixture from '../fixtures/reel.json'
import quietFixture from '../fixtures/reel-quiet.json'
import mixedFixture from '../fixtures/reel-mixed.json'
import './fonts'

const reel = fixture as unknown as Reel
const quietReel = quietFixture as unknown as Reel
// Hand-edited copy of reel.json with the-throne's catLines changed from
// a 9-0 sweep to a 5-4 mixed result — see video/fixtures/reel-mixed.json's
// storySignature ("-mixed-hand-edited") for the tell. Not pipeline output.
const mixedReel = mixedFixture as unknown as Reel

const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="Reel"
      component={ReelVideo}
      defaultProps={{ reel }}
      durationInFrames={reelFrames(reel)}
      fps={reel.fps}
      width={reel.width}
      height={reel.height}
    />
    <Composition
      id="ReelQuiet"
      component={ReelVideo}
      defaultProps={{ reel: quietReel }}
      durationInFrames={reelFrames(quietReel)}
      fps={quietReel.fps}
      width={quietReel.width}
      height={quietReel.height}
    />
    <Composition
      id="ReelMixed"
      component={ReelVideo}
      defaultProps={{ reel: mixedReel }}
      durationInFrames={reelFrames(mixedReel)}
      fps={mixedReel.fps}
      width={mixedReel.width}
      height={mixedReel.height}
    />
  </>
)

registerRoot(RemotionRoot)
