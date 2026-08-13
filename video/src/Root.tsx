import React from 'react'
import { Composition, registerRoot } from 'remotion'
import type { CalculateMetadataFunction } from 'remotion'
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

/**
 * Derives duration/fps/width/height from whatever `reel` is in the
 * RESOLVED props, not from the statically-imported fixture used for
 * `defaultProps`. This is what makes `--props=<file>.json` render a
 * different reel at the correct length: Remotion calls this after
 * merging CLI-supplied props over `defaultProps`, so `props.reel` here
 * is the one actually being rendered.
 */
const calculateReelMetadata: CalculateMetadataFunction<{ reel: Reel }> = ({ props }) => ({
  durationInFrames: reelFrames(props.reel),
  fps: props.reel.fps,
  width: props.reel.width,
  height: props.reel.height,
})

const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="Reel"
      component={ReelVideo}
      defaultProps={{ reel }}
      calculateMetadata={calculateReelMetadata}
    />
    <Composition
      id="ReelQuiet"
      component={ReelVideo}
      defaultProps={{ reel: quietReel }}
      calculateMetadata={calculateReelMetadata}
    />
    <Composition
      id="ReelMixed"
      component={ReelVideo}
      defaultProps={{ reel: mixedReel }}
      calculateMetadata={calculateReelMetadata}
    />
  </>
)

registerRoot(RemotionRoot)
