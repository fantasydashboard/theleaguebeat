import React from 'react'
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import type { ColdOpenProps } from '../../../src/editorial/video/types'
import { Backdrop } from '../chrome'
import { theme } from '../theme'

const fade = (frame: number, start: number, len = 14) =>
  interpolate(frame, [start, start + len], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  })

export const ColdOpen: React.FC<ColdOpenProps> = ({ leagueName, week, subtitle }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const markScale = spring({ frame: frame - 16, fps, config: { damping: 12 } })

  return (
    <Backdrop>
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '0 80px',
      }}>
        <div style={{
          width: 120, height: 120, borderRadius: 12, background: theme.accent,
          transform: `scale(${markScale})`, marginBottom: 56,
        }} />

        <div style={{
          fontSize: 34, fontWeight: 600, letterSpacing: '0.34em', opacity: fade(frame, 30),
        }}>
          THE LEAGUE BEAT
        </div>

        <div style={{
          width: '46%', height: 2, background: 'rgba(255,255,255,0.3)', margin: '34px 0',
          transform: `scaleX(${fade(frame, 40, 22)})`, transformOrigin: 'center',
        }} />

        <div style={{
          fontFamily: theme.display, fontWeight: 900, fontSize: 116, lineHeight: 1,
          opacity: fade(frame, 52),
          transform: `translateY(${interpolate(fade(frame, 52), [0, 1], [18, 0])}px)`,
        }}>
          {leagueName.toUpperCase()}
        </div>

        <div style={{ marginTop: 48, opacity: fade(frame, 68) }}>
          <div style={{
            fontFamily: theme.display, fontWeight: 700, fontSize: 32,
            letterSpacing: '0.3em', color: theme.textMuted,
          }}>
            WEEK
          </div>
          <div style={{
            fontFamily: theme.display, fontWeight: 900, fontSize: 190,
            lineHeight: 0.95, color: theme.accent,
          }}>
            {week}
          </div>
        </div>

        <div style={{
          position: 'absolute', bottom: 150, fontFamily: theme.display, fontWeight: 700,
          fontSize: 32, letterSpacing: '0.28em', opacity: fade(frame, 84),
        }}>
          {subtitle}
        </div>
      </div>
    </Backdrop>
  )
}
