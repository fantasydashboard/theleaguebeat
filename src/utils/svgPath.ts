export interface Point { x: number; y: number }

/**
 * Generate a smooth cubic-Bezier path through the given points using a
 * tangent-of-thirds derivation (mirrors ppwSmooth in DemoHomeView).
 * Returns an SVG `d` attribute string.
 *
 * Canonical implementation for: DemoHomeView ppwSmooth/rowSparkPath,
 * DemoPowerRankingsView pathForTeam/rowSparkPath, DemoMatchupsView heroChartPath,
 * TeamSeasonModal smoothPath, MatchupDetailModal pathFor, DemoHistoryView (linear variant).
 */
export function smoothPath(points: Point[]): string {
  if (points.length === 0) return ''
  if (points.length === 1) return `M ${points[0].x.toFixed(2)},${points[0].y.toFixed(2)}`
  let d = `M ${points[0].x.toFixed(2)},${points[0].y.toFixed(2)}`
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1]
    const curr = points[i]
    const dx = (curr.x - prev.x) / 3
    d += ` C ${(prev.x + dx).toFixed(2)},${prev.y.toFixed(2)} ${(curr.x - dx).toFixed(2)},${curr.y.toFixed(2)} ${curr.x.toFixed(2)},${curr.y.toFixed(2)}`
  }
  return d
}

/**
 * Generate a straight-line polyline path through points (no smoothing).
 */
export function linearPath(points: Point[]): string {
  if (points.length === 0) return ''
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
}
