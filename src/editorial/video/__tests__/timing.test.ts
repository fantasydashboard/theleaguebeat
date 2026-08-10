import { describe, it, expect } from 'vitest'
import {
  LEAD_IN_MS,
  TAIL_MS,
  sceneDurationMs,
  msToFrames,
  reelDurationMs,
} from '@/editorial/video/timing'

describe('sceneDurationMs', () => {
  it('falls back to the floor when there is no voice yet', () => {
    expect(sceneDurationMs({ minDurationMs: 5000 })).toBe(5000)
  })

  it('uses lead-in + voice + tail when that exceeds the floor', () => {
    const vo = 9000
    expect(sceneDurationMs({ minDurationMs: 5000, voDurationMs: vo }))
      .toBe(LEAD_IN_MS + vo + TAIL_MS)
  })

  it('keeps the floor when the voice clip is very short', () => {
    expect(sceneDurationMs({ minDurationMs: 5000, voDurationMs: 500 }))
      .toBe(5000)
  })
})

describe('msToFrames', () => {
  it('converts milliseconds to whole frames at 30fps', () => {
    expect(msToFrames(1000)).toBe(30)
    expect(msToFrames(1500)).toBe(45)
  })

  it('rounds rather than truncating', () => {
    expect(msToFrames(1016)).toBe(30)  // 30.48 → 30
    expect(msToFrames(1050)).toBe(32)  // 31.5  → 32
  })

  it('never returns a zero-length scene for a non-zero duration', () => {
    expect(msToFrames(10)).toBeGreaterThanOrEqual(1)
  })
})

describe('reelDurationMs', () => {
  it('sums the resolved duration of every scene', () => {
    const scenes = [
      { minDurationMs: 4000 },
      { minDurationMs: 5000, voDurationMs: 9000 },
    ]
    expect(reelDurationMs(scenes)).toBe(4000 + LEAD_IN_MS + 9000 + TAIL_MS)
  })

  it('is zero for an empty reel', () => {
    expect(reelDurationMs([])).toBe(0)
  })
})
