import React from 'react'
import { interpolate, useCurrentFrame } from 'remotion'
import type { BoardProps, BoardRow } from '../../../src/editorial/video/types'
import { Backdrop, Bug } from '../chrome'
import { theme } from '../theme'

const fade = (frame: number, start: number, len = 13) =>
  interpolate(frame, [start, start + len], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  })

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

const Row: React.FC<{ row: BoardRow; index: number }> = ({ row, index }) => {
  const frame = useCurrentFrame()
  const start = 26 + index * 3
  const o = fade(frame, start)

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 24,
      padding: '17px 0', borderBottom: '1px solid rgba(255,255,255,0.10)',
      opacity: o,
      transform: `translateY(${interpolate(o, [0, 1], [10, 0])}px)`,
      background: row.highlight
        ? 'linear-gradient(90deg, rgba(34,197,94,0.14), transparent)'
        : 'none',
      boxShadow: row.highlight ? `inset 3px 0 0 ${theme.accent}` : 'none',
      paddingLeft: row.highlight ? 18 : 0,
      marginLeft: row.highlight ? -18 : 0,
    }}>
      <span style={{
        fontFamily: theme.display, fontWeight: 900, fontSize: 40,
        opacity: 0.3, minWidth: 74,
      }}>
        {String(row.rank).padStart(2, '0')}
      </span>
      <span style={{ fontFamily: theme.display, fontWeight: 700, fontSize: 42, flex: 1 }}>
        {row.teamName}
      </span>
      <span style={{ fontFamily: theme.display, fontWeight: 700, fontSize: 34, opacity: 0.5 }}>
        {row.record}
      </span>
      <span style={{
        fontFamily: theme.display, fontWeight: 700, fontSize: 30,
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
        {rows.map((row, i) => <Row key={row.rank} row={row} index={i} />)}
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
