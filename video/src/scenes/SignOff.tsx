import React from 'react'
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import type { SignOffProps } from '../../../src/editorial/video/types'
import { Backdrop } from '../chrome'
import { theme } from '../theme'

const fade = (frame: number, start: number, len = 14) =>
  interpolate(frame, [start, start + len], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  })

/**
 * `ReelTeam.name` is unconstrained (see TheThrone.tsx for the full
 * rationale — same platform, same risk). Unlike Throne's bars, these
 * two 86px team names sit in normal document flow with nothing else
 * absolutely positioned to decouple from them, so a long enough name
 * doesn't garble anything by overlapping — it just wraps to 2-3 lines
 * and pushes everything below it (the "vs", the rank line, the
 * divider, the brand mark) further down the centered column. Rendered
 * and confirmed: two ~45-character names ("The Bad News Bears of
 * Southeastern Baseball" / "Absolutely Devastating Bullpen Catastrophe
 * Squad") wrap to 2-3 lines each and push the layout uncomfortably
 * close to the canvas edge — the same failure shape as Throne's bars,
 * just via reflow instead of overlap. Reusing Throne's exact
 * thresholds here rather than re-deriving new ones: same font/weight,
 * and this scene's ~920px content width (1080 minus 80px padding each
 * side) is if anything more forgiving than Throne's ~834px panel, so
 * Throne's tuning is a safe (if conservative) starting point.
 */
const NAME_BASE_CHARS = 22
const NAME_FLOOR_CHARS = 38
const NAME_MIN_SCALE = 0.4

const nameScale = (len: number) => {
  if (len <= NAME_BASE_CHARS) return 1
  const over = Math.min(len, NAME_FLOOR_CHARS) - NAME_BASE_CHARS
  return 1 - (over / (NAME_FLOOR_CHARS - NAME_BASE_CHARS)) * (1 - NAME_MIN_SCALE)
}

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
          <div style={{
            fontFamily: theme.display, fontWeight: 900,
            fontSize: 86 * nameScale(teamA.name.length), lineHeight: 1.06,
          }}>
            {teamA.name.toUpperCase()}
          </div>
          <div style={{
            fontFamily: theme.display, fontWeight: 700, fontSize: 38,
            color: theme.accent, margin: '14px 0',
          }}>
            vs
          </div>
          <div style={{
            fontFamily: theme.display, fontWeight: 900,
            fontSize: 86 * nameScale(teamB.name.length), lineHeight: 1.06,
          }}>
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
