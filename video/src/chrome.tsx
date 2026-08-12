import React from 'react'
import { Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from 'remotion'
import type { ReelTeam } from '../../src/editorial/video/types'
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

/**
 * Resolves a `ReelTeam.avatarUrl` to something Remotion's `<Img>` can
 * actually load. Two very different kinds of URL show up here:
 *
 *  - Absolute (`http://`/`https://`) — a live platform-hosted team
 *    logo. Passed straight through; `<Img>` fetches it directly.
 *  - Root-relative (e.g. `/demo-categories-logos/bt.jpg`) — the demo
 *    fixture's path. That path is only meaningful inside the APP's
 *    Vite dev server, which serves the app's own `public/` at that
 *    root. This Remotion package is a separate project with its own,
 *    separate `public/` and knows nothing about the app's — so a
 *    root-relative path is resolved through Remotion's `staticFile()`
 *    against a COPY of those same files checked into
 *    `video/public/demo-categories-logos/` (copied, not symlinked —
 *    Remotion's render bundler doesn't reliably follow symlinks).
 */
export const resolveAvatarSrc = (avatarUrl: string): string => {
  if (/^https?:\/\//.test(avatarUrl)) return avatarUrl
  return staticFile(avatarUrl.replace(/^\//, ''))
}

/**
 * Team identity mark, shared by every scene that draws a circular
 * team crest (The Throne, Sign-Off, The Board's rows, The Climb's
 * endpoint). Renders the team's uploaded logo when `avatarUrl` is
 * present — masked to a circle via `overflow: hidden` on a
 * `border-radius: 50%` wrapper plus `objectFit: cover`, so a
 * rectangular source jpg doesn't break the circular shape — otherwise
 * falls back to the original avatarColor gradient with the owner's
 * initials centred on it.
 *
 * Deliberately uses Remotion's `<Img>`, never a bare `<img>`: `<Img>`
 * delays Remotion's frame capture until the image has actually
 * finished loading, where a plain tag has no such guarantee — a
 * logo that hadn't finished loading yet would get captured as a
 * blank circle in some frames.
 *
 * A NOTE ON FAILURE MODE: an unreachable `avatarUrl` (404, network
 * error, ...) FAILS THE RENDER rather than silently falling back to
 * initials. That's deliberate, not an oversight — this component
 * stays a pure function of props (no state, no `onError` handling),
 * which is a standing constraint on this codebase. For Phase 0's
 * local demo assets that's a non-issue and loud failure beats a
 * silently broken video. It's a real Phase 1 concern once
 * `avatarUrl` can point at a live, remote, platform-hosted logo:
 * a transient fetch failure for one team's logo would fail an
 * otherwise-fine render. Solving that needs error-boundary-style
 * state this component intentionally doesn't have today.
 */
export const TeamCrest: React.FC<{
  team: ReelTeam
  size: number
  scale?: number
  fontSize?: number
}> = ({ team, size, scale = 1, fontSize }) => {
  const shellStyle: React.CSSProperties = {
    width: size, height: size, borderRadius: '50%', overflow: 'hidden',
    flexShrink: 0, transform: `scale(${scale})`,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  }

  if (team.avatarUrl) {
    return (
      <div style={shellStyle}>
        <Img
          src={resolveAvatarSrc(team.avatarUrl)}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </div>
    )
  }

  return (
    <div style={{
      ...shellStyle,
      background: `linear-gradient(150deg, ${team.avatarColor})`,
      fontFamily: theme.display, fontWeight: 700, color: theme.text,
      letterSpacing: '0.04em', fontSize: fontSize ?? size * 0.32,
    }}>
      {team.ownerInitials}
    </div>
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
