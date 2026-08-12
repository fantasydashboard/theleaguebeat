import React from 'react'
import { interpolate, useCurrentFrame } from 'remotion'
import type { ClimbPoint, ClimbProps } from '../../../src/editorial/video/types'
import { Backdrop, Bug, TeamCrest } from '../chrome'
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

/** Screen geometry the chart svg is placed at (see the <svg> below) —
 *  needed outside the svg too, to convert an endpoint's viewBox-space
 *  coordinate into a real pixel position for the HTML crest that sits
 *  on top of it (an <svg> viewBox doesn't apply to sibling HTML). */
const SVG_LEFT = 64
const SVG_TOP = 430
const SVG_WIDTH = 952
const SVG_HEIGHT = 600
const VIEWBOX_PAD = 10
const scaleX = SVG_WIDTH / (VB.w + VIEWBOX_PAD * 2)
const scaleY = SVG_HEIGHT / (VB.h + VIEWBOX_PAD * 2)
const toScreen = (p: { x: number; y: number }) => ({
  x: SVG_LEFT + (p.x + VIEWBOX_PAD) * scaleX,
  y: SVG_TOP + (p.y + VIEWBOX_PAD) * scaleY,
})

/** Ghost arcs read as texture, not competition — thin stroke, low
 *  opacity, `theme.neutral` (this scene's existing "no direction to
 *  report" colour) rather than the focus line's directional accent. */
const GHOST_STROKE_WIDTH = 3
const GHOST_OPACITY = 0.22

/** Endpoint crest sizing. `CREST_GAP` sits the crest ABOVE the
 *  endpoint dot (bottom-anchored to the point) rather than centring
 *  it on the point — see the size comment at the JSX below for why
 *  that anchoring, not the size, is what keeps it clear of the W{n}
 *  axis labels at any rank. */
const CREST_SIZE = 76
const CREST_GAP = 18
const CREST_RING = 4

export const TheClimb: React.FC<ClimbProps & { week: number }> = ({
  team, points, otherArcs, fromRank, toRank, spanWeeks, footnote, week,
}) => {
  const frame = useCurrentFrame()
  const color = arcColor(fromRank, toRank)

  // The chart's x-axis domain is the focus team's own week list — every
  // ghost arc maps its points onto these SAME x positions by week
  // number (not by array index: otherArcs points can have individual
  // weeks omitted per-team, per buildClimb, so index and week diverge).
  const weeks = points.map((p) => p.week)
  const weekToX = (weekNum: number) => {
    const idx = weeks.indexOf(weekNum)
    return (idx / Math.max(1, weeks.length - 1)) * VB.w
  }

  // The y-axis must cover the full rank range across the focus team
  // AND every ghost arc, not just the focus team's own best/worst.
  // Normalising against only `points` (the original, pre-ghost-arc
  // behaviour) would map any other team's rank outside the focus
  // team's own range to a y coordinate outside [0, VB.h] — e.g. a team
  // that spent the season around 10th would draw far below the plot
  // area if the focus team only ever ranged 1-6.
  const allRanks = [
    ...points.map((p) => p.rank),
    ...otherArcs.flatMap((arc) => arc.points.map((p) => p.rank)),
  ]
  const best = Math.min(...allRanks)
  const worst = Math.max(...allRanks)
  // Guards the case buildClimb can legitimately emit: a team that never
  // moved, where best === worst. Without the floor, (rank - best) / span
  // divides by zero and every y coordinate becomes NaN, which SVG
  // silently drops (an invisible polyline). With it, a held-rank team
  // gets a flat line pinned to the top of the chart (y = 0 for every
  // point) instead of a blank one.
  const span = Math.max(1, worst - best)

  // Rank 1 sits at the top, so y is inverted: the best (lowest) rank
  // number maps to y = 0.
  const toXY = (pts: ClimbPoint[]) => pts.map((p) => ({
    x: weekToX(p.week),
    y: ((p.rank - best) / span) * VB.h,
  }))

  const xy = toXY(points)
  const path = xy.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  const last = xy[xy.length - 1]
  const lastScreen = toScreen(last)

  const ghostArcs = otherArcs
    .map((arc) => ({ teamId: arc.teamId, xy: toXY(arc.points.filter((p) => weeks.includes(p.week))) }))
    .filter((arc) => arc.xy.length >= 2)

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

        {/* Ghost arcs render FIRST (before the focus polyline below) so
         *  the focus line always paints on top of them in SVG's
         *  document-order stacking — texture behind, story in front. */}
        {ghostArcs.map((arc) => (
          <polyline
            key={arc.teamId}
            points={arc.xy.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')}
            fill="none" stroke={theme.neutral} strokeWidth={GHOST_STROKE_WIDTH}
            strokeLinecap="round" strokeLinejoin="round"
            style={{ opacity: GHOST_OPACITY * fade(frame, 26) }}
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

      {/* The focus team's crest, so the arc has an owner — bottom-anchored
       *  ABOVE the endpoint dot (not centred on it) rather than sized to
       *  fit: a point at the very top of the chart (best rank across the
       *  whole league) can't push the crest off-canvas since it only
       *  grows upward, and a point at the very bottom can't reach the
       *  W{n} axis labels below the chart since the crest never extends
       *  past the point itself. Positioned in real pixel space (`toScreen`)
       *  rather than inside the svg's viewBox, since <Img> inside an SVG
       *  viewBox scales oddly across browsers — plain HTML avoids that. */}
      <div style={{
        position: 'absolute',
        left: lastScreen.x - CREST_SIZE / 2,
        top: lastScreen.y - CREST_GAP - CREST_SIZE,
        width: CREST_SIZE, height: CREST_SIZE, borderRadius: '50%',
        boxShadow: `0 0 0 ${CREST_RING}px ${color}, 0 0 16px ${color}`,
        opacity: fade(frame, 110),
      }}>
        <TeamCrest team={team} size={CREST_SIZE} />
      </div>

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
