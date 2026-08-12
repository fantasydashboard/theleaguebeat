import React from 'react'
import { interpolate, useCurrentFrame } from 'remotion'
import type { BoardProps, BoardRow } from '../../../src/editorial/video/types'
import { Backdrop, Bug, TeamCrest } from '../chrome'
import { theme } from '../theme'

const fade = (frame: number, start: number, len = 13) =>
  interpolate(frame, [start, start + len], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  })

/**
 * ESPN and Yahoo both support H2H category leagues up to 20 teams, but
 * the row block's original sizing (17px vertical padding, 40/42/34/30px
 * type) was only ever tuned against the 10-row fixture. Left alone,
 * rows past ~16-17 collide with the note or run off the 1920px canvas
 * entirely — silently, since nothing clips or errors, they just aren't
 * drawn. `densityScale` compresses row padding and type size once a
 * league is bigger than the sizing was designed for, so every row
 * always lands between `top: 470` and the note.
 *
 * At `rows.length <= BASE_ROWS` this returns exactly 1 — the row block
 * must look pixel-identical to the original 10-row design, and only
 * larger leagues should ever look different.
 */
const BASE_ROWS = 10
const MAX_ROWS = 20
const MIN_SCALE = 0.62

const densityScale = (rowCount: number) => {
  if (rowCount <= BASE_ROWS) return 1
  const over = Math.min(rowCount, MAX_ROWS) - BASE_ROWS // 0..10
  return 1 - (over / (MAX_ROWS - BASE_ROWS)) * (1 - MIN_SCALE)
}

/** A null delta means we have no history to compare against. Render a
 *  dash — never a zero, which would claim the team held its rank. */
const Delta: React.FC<{ delta: number | null }> = ({ delta }) => {
  if (delta == null) return <span style={{ opacity: 0.28 }}>—</span>
  if (delta === 0) return <span style={{ opacity: 0.28 }}>—</span>
  const up = delta > 0
  return (
    <span style={{ color: up ? theme.accent : theme.down }}>
      {up ? '▲' : '▼'}{Math.abs(delta)}
    </span>
  )
}

const Row: React.FC<{ row: BoardRow; index: number; scale: number }> = ({ row, index, scale }) => {
  const frame = useCurrentFrame()
  const start = 26 + index * 3
  const o = fade(frame, start)

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 24,
      padding: `${17 * scale}px 0`, borderBottom: `1px solid ${theme.hairline}`,
      opacity: o,
      transform: `translateY(${interpolate(o, [0, 1], [10, 0])}px)`,
      background: row.highlight
        ? `linear-gradient(90deg, ${theme.accentWash}, transparent)`
        : 'none',
      boxShadow: row.highlight ? `inset 3px 0 0 ${theme.accent}` : 'none',
      paddingLeft: row.highlight ? 18 : 0,
      marginLeft: row.highlight ? -18 : 0,
    }}>
      <span style={{
        fontFamily: theme.display, fontWeight: 900, fontSize: 40 * scale,
        opacity: 0.3, minWidth: 74,
      }}>
        {String(row.rank).padStart(2, '0')}
      </span>
      <TeamCrest team={row.team} size={64 * scale} />
      <span style={{
        fontFamily: theme.display, fontWeight: 700, fontSize: 42 * scale, flex: 1,
        minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {row.team.name}
      </span>
      <span style={{ fontFamily: theme.display, fontWeight: 700, fontSize: 34 * scale, opacity: 0.5 }}>
        {row.record}
      </span>
      <span style={{
        fontFamily: theme.display, fontWeight: 700, fontSize: 30 * scale,
        minWidth: 78, textAlign: 'right',
      }}>
        <Delta delta={row.delta} />
      </span>
    </div>
  )
}

export const TheBoard: React.FC<BoardProps & { week: number }> = ({ rows, note, week }) => {
  const frame = useCurrentFrame()
  const noteStart = 26 + rows.length * 3 + 20
  const scale = densityScale(rows.length)

  return (
    <Backdrop>
      <Bug week={week} />

      <div style={{
        position: 'absolute', top: 200, left: 64,
        fontFamily: theme.display, fontWeight: 900, fontSize: 100, lineHeight: 0.92,
        opacity: fade(frame, 14),
        transform: `translateY(${interpolate(fade(frame, 14), [0, 1], [12, 0])}px)`,
      }}>
        THE<br />BOARD
      </div>

      <div style={{ position: 'absolute', top: 470, left: 64, right: 64 }}>
        {rows.map((row, i) => <Row key={row.rank} row={row} index={i} scale={scale} />)}
      </div>

      {note ? (
        <div style={{
          position: 'absolute', bottom: 120, left: 64, right: 64,
          fontFamily: theme.display, fontWeight: 900, fontSize: 42,
          letterSpacing: '0.05em', color: theme.accent,
          opacity: fade(frame, noteStart),
        }}>
          {note}
        </div>
      ) : null}
    </Backdrop>
  )
}
