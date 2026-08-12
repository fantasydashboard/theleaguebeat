import React from 'react'
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import type { ThroneCatLine, ThroneProps } from '../../../src/editorial/video/types'
import { Backdrop, Bug, TeamCrest } from '../chrome'
import { theme, CANVAS } from '../theme'

const fade = (frame: number, start: number, len = 13) =>
  interpolate(frame, [start, start + len], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  })

/**
 * The fixture this scene was designed against has 9 category lines, but
 * ESPN category leagues commonly run 10-12 categories, and Yahoo custom
 * leagues have no platform cap at all — unlike TheBoard's 20-team ceiling
 * (a real ESPN/Yahoo limit, so unreachable), a category count has no
 * upper bound to design against.
 *
 * `densityScale` is therefore derived from available GEOMETRY rather
 * than clamped against a magic constant pair: it computes how much
 * vertical room actually sits between the bar block's top (`BAR_TOP`)
 * and the kicker headline (reserving `KICKER_RESERVE` px for the
 * kicker itself plus `BOTTOM_GAP` breathing room), then picks the
 * largest scale — capped at 1 — under which `catCount` rows at
 * `ROW_HEIGHT` each still fit inside it. Because the scale is always
 * solved FOR the available space, every bar lands between the bar
 * block's top and the kicker for ANY category count — there is no
 * count past which this silently overflows, which is what made the
 * previous MAX_CATS/MIN_SCALE clamp pair reachable (~26 categories
 * collided with the kicker; ~30 ran off the 1920px canvas outright).
 *
 * At `catCount <= BASE_CATS` this returns exactly 1 — the 9-category
 * fixture must look pixel-identical to the original design.
 */
const BASE_CATS = 9
const BAR_TOP = 920
const ROW_HEIGHT = 60 // 30px bar + 30px margin, matches CatBar below
const KICKER_RESERVE = 180 // room for up to ~2 lines of the 68px kicker
const KICKER_BOTTOM = 120 // matches the kicker's own `bottom` offset
const BOTTOM_GAP = 40 // breathing room between the last bar and the kicker

const densityScale = (catCount: number) => {
  if (catCount <= 0) return 1
  const availableHeight =
    CANVAS.height - KICKER_BOTTOM - KICKER_RESERVE - BAR_TOP - BOTTOM_GAP
  return Math.min(1, availableHeight / (catCount * ROW_HEIGHT))
}

/**
 * `ReelTeam.name` is a plain, unconstrained string — fantasy team names
 * are user-chosen and routinely run 30+ characters, often much longer
 * (jokey league names are the norm, not the exception). Rendered at a
 * fixed font size, a long enough name wraps to 2-3 lines in the
 * lower-third panel, and because the category-bar block below it is a
 * separately absolutely-positioned element (not normal document flow),
 * the panel growing taller doesn't push the bars down — the two just
 * overlap, producing literally garbled text. `nameScale` shrinks a
 * name's font size as its character count grows, keeping it on ONE
 * line at any realistic length instead of wrapping — same pattern as
 * `densityScale` above, just keyed off name length instead of category
 * count. Combined with the lower-third's fixed `height` below (which
 * decouples the bars' position from the panel's content entirely),
 * this removes the collision at the source instead of reacting to it.
 *
 * Tuned by rendering (see task-11 report continuation), not arithmetic:
 * `NAME_BASE_CHARS` is the longest name that still renders on one line
 * at full size against the panel's ~822px content width; beyond
 * `NAME_FLOOR_CHARS` further shrinking stops helping — a name that
 * long is deliberately left to sit tight rather than shrunk into
 * illegibility (see the report for the exact character count where
 * that trade-off was hit).
 */
const NAME_BASE_CHARS = 22
const NAME_FLOOR_CHARS = 38
const NAME_MIN_SCALE = 0.4

const nameScale = (len: number) => {
  if (len <= NAME_BASE_CHARS) return 1
  const over = Math.min(len, NAME_FLOOR_CHARS) - NAME_BASE_CHARS
  return 1 - (over / (NAME_FLOOR_CHARS - NAME_BASE_CHARS)) * (1 - NAME_MIN_SCALE)
}

const CatBar: React.FC<{ line: ThroneCatLine; index: number; scale: number }> = ({ line, index, scale }) => {
  const frame = useCurrentFrame()
  const grow = fade(frame, 74 + index * 4, 11)
  const won = line.winner === 'a'

  return (
    <div style={{ position: 'relative', height: 30 * scale, marginBottom: 30 * scale }}>
      <span style={{
        position: 'absolute', left: 0, top: -26 * scale,
        fontFamily: theme.display, fontWeight: 700, fontSize: 22 * scale,
        letterSpacing: '0.11em', opacity: 0.45,
      }}>
        {line.label}
      </span>
      <div style={{
        position: 'absolute', inset: 0, background: theme.trackWash, borderRadius: 4,
      }} />
      <div style={{
        position: 'absolute', top: 0, bottom: 0, borderRadius: 4,
        [won ? 'left' : 'right']: 0,
        width: `${line.share * 100 * grow}%`,
        background: won ? theme.accent : theme.neutral,
      }} />
    </div>
  )
}

export const TheThrone: React.FC<ThroneProps & { week: number }> = ({
  teamA, teamB, eyebrow, headline, catLines, kicker, isFinal, week,
}) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const l3 = interpolate(spring({ frame: frame - 40, fps, config: { damping: 14 } }), [0, 1], [-104, 0])
  const kickerStart = 74 + catLines.length * 4 + 16
  const scale = densityScale(catLines.length)

  return (
    <Backdrop>
      <Bug week={week} />

      <div style={{
        position: 'absolute', top: 190, left: 0, right: 0,
        display: 'flex', justifyContent: 'center', gap: 96,
      }}>
        <TeamCrest team={teamA} size={180} scale={spring({ frame: frame - 20, fps, config: { damping: 12 } })} />
        <TeamCrest team={teamB} size={180} scale={spring({ frame: frame - 26, fps, config: { damping: 12 } })} />
      </div>

      <div style={{
        position: 'absolute', top: 620, left: 0, right: 150, height: 220,
        boxSizing: 'border-box',
        padding: '24px 32px 26px 64px', borderLeft: `12px solid ${theme.accent}`,
        background: `linear-gradient(90deg, ${theme.scrimStrong} 62%, ${theme.scrimSoft})`,
        transform: `translateX(${l3}%)`,
      }}>
        <div style={{
          fontFamily: theme.display, fontWeight: 700, fontSize: 28,
          letterSpacing: '0.2em', color: theme.accent, marginBottom: 6,
        }}>
          {eyebrow}
        </div>
        <div style={{
          fontFamily: theme.display, fontWeight: 900,
          fontSize: 78 * nameScale(teamA.name.length), lineHeight: 1,
        }}>
          {teamA.name.toUpperCase()}
        </div>
        <div style={{
          fontFamily: theme.display, fontWeight: 700,
          fontSize: 38 * nameScale(teamB.name.length), opacity: 0.55, marginTop: 6,
        }}>
          {isFinal ? 'def.' : 'leads'} {teamB.name.toUpperCase()} &nbsp;{headline}
        </div>
      </div>

      <div style={{ position: 'absolute', top: BAR_TOP, left: 64, right: 64 }}>
        {catLines.map((line, i) => <CatBar key={line.label} line={line} index={i} scale={scale} />)}
      </div>

      <div style={{
        position: 'absolute', bottom: KICKER_BOTTOM, left: 64, right: 64,
        fontFamily: theme.display, fontWeight: 900, fontSize: 68, lineHeight: 1.05,
        opacity: fade(frame, kickerStart),
        transform: `scale(${interpolate(fade(frame, kickerStart), [0, 1], [1.07, 1])})`,
      }}>
        {kicker}
      </div>
    </Backdrop>
  )
}
