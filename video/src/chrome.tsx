import React from 'react'
import { interpolate, useCurrentFrame, useVideoConfig } from 'remotion'
import { theme } from './theme'

/** Persistent corner bug. Present on every scene but the bookends. */
export const Bug: React.FC<{ week: number }> = ({ week }) => {
  const frame = useCurrentFrame()
  const opacity = interpolate(frame, [8, 20], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  })
  return (
    <div style={{
      position: 'absolute', top: 72, left: 64, display: 'flex',
      alignItems: 'center', gap: 12, opacity,
      fontFamily: theme.body, fontSize: 26, fontWeight: 600,
      letterSpacing: '0.15em', color: theme.text,
    }}>
      <span style={{ width: 22, height: 22, borderRadius: 4, background: theme.accent }} />
      THE LEAGUE BEAT
      <span style={{ fontFamily: theme.display, opacity: 0.5, letterSpacing: '0.12em' }}>
        WK {week}
      </span>
    </div>
  )
}

/** Green wipe that opens every scene. Runs over the first 26 frames. */
export const Wipe: React.FC = () => {
  const frame = useCurrentFrame()
  const x = interpolate(frame, [0, 11, 26], [-101, 0, 101], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  })
  if (frame > 26) return null
  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 20,
      transform: `translateX(${x}%)`,
      background: `linear-gradient(115deg, ${theme.accent} 0%, ${theme.accentDeep} 100%)`,
    }} />
  )
}

/** Paper grain, matching the share card's texture. */
export const Grain: React.FC = () => {
  const { width, height } = useVideoConfig()
  return (
    <svg width={width} height={height}
      style={{ position: 'absolute', inset: 0, opacity: 0.15, mixBlendMode: 'overlay', pointerEvents: 'none' }}>
      <filter id="grain">
        <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves={3} />
      </filter>
      <rect width={width} height={height} filter="url(#grain)" opacity={0.5} />
    </svg>
  )
}

/** Full-bleed scene background. */
export const Backdrop: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{
    position: 'absolute', inset: 0, background: theme.bg, color: theme.text,
    fontFamily: theme.body, overflow: 'hidden',
  }}>
    {children}
    <Grain />
    <Wipe />
  </div>
)
