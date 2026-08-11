import React from 'react'
import { interpolate, useCurrentFrame } from 'remotion'
import type { ClimbProps } from '../../../src/editorial/video/types'
import { Backdrop, Bug } from '../chrome'
import { theme } from '../theme'

const fade = (frame: number, start: number, len = 13) =>
  interpolate(frame, [start, start + len], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  })

const VB = { w: 900, h: 560 }

/**
 * Colour by meaning, not by default. The brief this scene was drafted
 * from hardcoded the line, dot, and stat figure to `theme.accent`
 * (green) regardless of direction — which means a team that collapsed
 * out of first place got the same celebratory treatment as a team that
 * climbed into it. A rank arc's colour has to say what happened:
 * climbed (rank number went DOWN, e.g. 6 -> 1) reads as good news and
 * gets `theme.accent`; slid (rank number went UP) reads as bad news and
 * gets `theme.down`; held (unchanged) is neither and gets a muted
 * `theme.neutral` rather than defaulting to green. Same idea as the
 * app-side "polish(your-column): cats matchup viz, smarter arc axis,
 * color by meaning" commit.
 */
const arcColor = (fromRank: number, toRank: number) => {
  if (toRank < fromRank) return theme.accent
  if (toRank > fromRank) return theme.down
  return theme.neutral
}

export const TheClimb: React.FC<ClimbProps & { week: number }> = ({
  team, points, fromRank, toRank, spanWeeks, footnote, week,
}) => {
  const frame = useCurrentFrame()
  const color = arcColor(fromRank, toRank)

  const ranks = points.map((p) => p.rank)
  const best = Math.min(...ranks)
  const worst = Math.max(...ranks)
  // Guards the case buildClimb can legitimately emit: a team that never
  // moved, where best === worst. Without the floor, (rank - best) / span
  // divides by zero and every y coordinate becomes NaN, which SVG
  // silently drops (an invisible polyline). With it, a held-rank team
  // gets a flat line pinned to the top of the chart (y = 0 for every
  // point) instead of a blank one.
  const span = Math.max(1, worst - best)

  // Rank 1 sits at the top, so y is inverted: the best (lowest) rank
  // number maps to y = 0.
  const xy = points.map((p, i) => ({
    x: (i / Math.max(1, points.length - 1)) * VB.w,
    y: ((p.rank - best) / span) * VB.h,
  }))
  const path = xy.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  const last = xy[xy.length - 1]

  // The brief's draft used a fixed LINE_LENGTH=3000 "safely longer than
  // any path we draw" for the stroke-dasharray sweep. That's only true
  // for short, gentle arcs: `points` comes straight from
  // `seasonRankHistory` with no cap, so a late-season reel can carry
  // 20+ weeks, and a volatile team swinging several ranks a week over
  // that many points can rack up a total path length well past 3000 —
  // the dasharray pattern would then repeat, drawing a second dash/gap
  // cycle over the tail of the line instead of leaving it solid.
  // Measuring the actual polyline length removes the assumption
  // instead of hoping the constant stays ahead of it.
  const pathLength = xy.reduce((total, p, i) => {
    if (i === 0) return total
    const prev = xy[i - 1]
    return total + Math.hypot(p.x - prev.x, p.y - prev.y)
  }, 0)
  const dashLength = Math.max(1, pathLength)

  const draw = fade(frame, 34, 76)
  const statStart = 118

  return (
    <Backdrop>
      <Bug week={week} />

      <div style={{
        position: 'absolute', top: 200, left: 64,
        fontFamily: theme.display, fontWeight: 700, fontSize: 30,
        letterSpacing: '0.24em', color: theme.accent, opacity: fade(frame, 14),
      }}>
        SEASON ARC
      </div>

      <div style={{
        position: 'absolute', top: 244, left: 64, right: 64,
        fontFamily: theme.display, fontWeight: 900, fontSize: 100, lineHeight: 1,
        opacity: fade(frame, 20),
        transform: `translateY(${interpolate(fade(frame, 20), [0, 1], [12, 0])}px)`,
      }}>
        {team.name.toUpperCase()}
      </div>

      <svg
        viewBox={`-10 -10 ${VB.w + 20} ${VB.h + 20}`}
        style={{ position: 'absolute', top: 430, left: 64, width: 952, height: 600 }}
      >
        {[0, 0.33, 0.66, 1].map((f, i) => (
          <line
            key={i}
            x1={0} x2={VB.w} y1={f * VB.h} y2={f * VB.h}
            stroke={theme.hairline} strokeWidth={2}
            style={{ opacity: fade(frame, 26) }}
          />
        ))}
        <polyline
          points={path}
          fill="none" stroke={color} strokeWidth={9}
          strokeLinecap="round" strokeLinejoin="round"
          strokeDasharray={dashLength}
          strokeDashoffset={dashLength * (1 - draw)}
          style={{ filter: `drop-shadow(0 0 14px ${color})` }}
        />
        <circle
          cx={last.x} cy={last.y} r={14} fill={color}
          style={{ opacity: fade(frame, 110) }}
        />
      </svg>

      <div style={{
        position: 'absolute', top: 1060, left: 64, right: 64,
        display: 'flex', justifyContent: 'space-between',
        fontFamily: theme.display, fontWeight: 700, fontSize: 26,
        letterSpacing: '0.14em', opacity: fade(frame, 30),
      }}>
        <span style={{ opacity: 0.4 }}>W{points[0].week}</span>
        <span style={{ opacity: 0.4 }}>W{points[points.length - 1].week}</span>
      </div>

      <div style={{
        position: 'absolute', bottom: 300, left: 64, right: 64,
        opacity: fade(frame, statStart),
        transform: `scale(${interpolate(fade(frame, statStart), [0, 1], [1.06, 1])})`,
      }}>
        <div style={{
          fontFamily: theme.display, fontWeight: 900, fontSize: 128,
          lineHeight: 0.95, color,
        }}>
          {fromRank} → {toRank}
        </div>
        <div style={{
          fontFamily: theme.display, fontWeight: 700, fontSize: 32,
          letterSpacing: '0.2em', opacity: 0.65, marginTop: 10,
        }}>
          {footnote}
        </div>
      </div>

      <div style={{
        position: 'absolute', bottom: 150, left: 64, right: 64,
        fontSize: 32, opacity: fade(frame, statStart + 24),
      }}>
        Across {spanWeeks} weeks
      </div>
    </Backdrop>
  )
}
