import React from 'react'
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import type { SignOffProps } from '../../../src/editorial/video/types'
import { Backdrop } from '../chrome'
import { theme } from '../theme'

const fade = (frame: number, start: number, len = 14) =>
  interpolate(frame, [start, start + len], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  })

const Crest: React.FC<{ colors: string; scale: number }> = ({ colors, scale }) => (
  <div style={{
    width: 190, height: 190, borderRadius: '50%',
    background: `linear-gradient(150deg, ${colors})`,
    transform: `scale(${scale})`,
  }} />
)

export const SignOff: React.FC<SignOffProps> = ({ teamA, teamB, line, brandUrl }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  return (
    <Backdrop>
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '0 80px',
      }}>
        <div style={{
          fontFamily: theme.display, fontWeight: 700, fontSize: 34,
          letterSpacing: '0.32em', opacity: fade(frame, 16), marginBottom: 56,
        }}>
          NEXT WEEK
        </div>

        <div style={{ display: 'flex', gap: 72, marginBottom: 64 }}>
          <Crest colors={teamA.avatarColor} scale={spring({ frame: frame - 26, fps, config: { damping: 12 } })} />
          <Crest colors={teamB.avatarColor} scale={spring({ frame: frame - 32, fps, config: { damping: 12 } })} />
        </div>

        <div style={{ opacity: fade(frame, 42) }}>
          <div style={{ fontFamily: theme.display, fontWeight: 900, fontSize: 86, lineHeight: 1.06 }}>
            {teamA.name.toUpperCase()}
          </div>
          <div style={{
            fontFamily: theme.display, fontWeight: 700, fontSize: 38,
            color: theme.accent, margin: '14px 0',
          }}>
            vs
          </div>
          <div style={{ fontFamily: theme.display, fontWeight: 900, fontSize: 86, lineHeight: 1.06 }}>
            {teamB.name.toUpperCase()}
          </div>
        </div>

        <div style={{ marginTop: 44, fontSize: 36, opacity: fade(frame, 58) }}>{line}</div>

        <div style={{
          width: '40%', height: 2, background: theme.divider, margin: '58px 0 34px',
          transform: `scaleX(${fade(frame, 70, 22)})`,
        }} />

        <div style={{ fontSize: 34, fontWeight: 600, letterSpacing: '0.3em', opacity: fade(frame, 82) }}>
          <span style={{
            display: 'inline-block', width: 26, height: 26, borderRadius: 5,
            background: theme.accent, marginRight: 18, verticalAlign: 'middle',
          }} />
          THE LEAGUE BEAT
        </div>

        <div style={{
          position: 'absolute', bottom: 150, fontFamily: theme.display, fontWeight: 700,
          fontSize: 32, letterSpacing: '0.2em', opacity: fade(frame, 94),
        }}>
          {brandUrl}
        </div>
      </div>
    </Backdrop>
  )
}
