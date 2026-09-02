/**
 * Power score for h2h-points leagues.
 *
 * The category board blends category record, cats owned, cats not bled
 * and recent form. None of those exist in a points league, so this is a
 * separate formula rather than a reskin of that one.
 *
 * The centrepiece is ALL-PLAY: the record a team would hold if it played
 * every other team every week. A points league's actual W-L is heavily
 * schedule-dependent — the highest scorer in the league can sit at 5-5
 * purely because of who it drew — and all-play is the standard way to
 * strip that luck out. It is also honest: it is computed from scores
 * that really happened, not a projection.
 *
 * Everything here is pure and derived from data the contract carries.
 * When the inputs are absent (week one, an adapter that cannot build
 * weekly scores), it returns an empty array rather than inventing a
 * ranking — a fabricated power score would be indistinguishable from a
 * real one on the page.
 */
import type { LeagueDataH2HPoints, PointsWeeklyScore } from '../types'

/** Blend weights. They sum to 1, so the result is directly a 0-1
 *  fraction before scaling. Kept here so the formula is auditable at a
 *  glance, and so the prose that explains the board can name them. */
export const POWER_WEIGHTS = {
  allPlay: 0.35,
  scoring: 0.25,
  record: 0.20,
  recent: 0.20,
} as const

/** Weeks counted as "recent" for the form component. */
const RECENT_WEEKS = 3

export interface PointsPowerComponents {
  /** Fraction of all head-to-head comparisons won across the season. */
  allPlay: number
  /** League-relative scoring strength, 0-1, centred on 0.5. */
  scoring: number
  /** Actual win percentage, ties counting half. */
  record: number
  /** All-play across the most recent weeks only. */
  recent: number
}

export interface PointsPowerRow {
  teamId: string
  /** 0-100, one decimal. */
  score: number
  components: PointsPowerComponents
  /** All-play tallies, for copy that wants to state them outright. */
  allPlayWins: number
  allPlayLosses: number
  allPlayTies: number
  /** Mean points per completed week. */
  pointsPerWeek: number
  weeksPlayed: number
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0
  return n < 0 ? 0 : n > 1 ? 1 : n
}

/**
 * Groups scores by week, dropping weeks with fewer than two teams — a
 * single score has nobody to compare against, so it contributes no
 * all-play information and would skew a mean.
 *
 * Non-positive scores are dropped as ABSENCES, not performances. A
 * roster that posts exactly 0.00 has not played: it is eliminated, on a
 * bye, or the week has not been scored yet. Real leagues make this
 * unmissable — a captured Guillotine league (`settings.type: 3`) has
 * seven of ten rosters at 0 in one week, and counting those would make
 * every eliminated team "tie" every other eliminated team and "lose" to
 * everyone still alive, which is fiction on both counts. An active
 * fantasy roster cannot realistically score 0.00; kickers and defences
 * alone put points on the board.
 */
function scoresByWeek(scores: PointsWeeklyScore[]): Map<number, PointsWeeklyScore[]> {
  const byWeek = new Map<number, PointsWeeklyScore[]>()
  for (const s of scores) {
    if (!Number.isFinite(s.points) || s.points <= 0) continue
    const bucket = byWeek.get(s.week)
    if (bucket) bucket.push(s)
    else byWeek.set(s.week, [s])
  }
  for (const [week, list] of byWeek) {
    if (list.length < 2) byWeek.delete(week)
  }
  return byWeek
}

/**
 * All-play tallies per team over the given weeks.
 *
 * Each week, every team is compared against every other team that
 * played that week. Equal scores count as a tie for both, which matters
 * more than it sounds: some leagues round to whole points and produce
 * genuine ties regularly.
 */
export function buildAllPlay(
  scores: PointsWeeklyScore[],
  weekFilter?: (week: number) => boolean,
): Map<string, { wins: number; losses: number; ties: number }> {
  const out = new Map<string, { wins: number; losses: number; ties: number }>()
  const byWeek = scoresByWeek(scores)

  for (const [week, list] of byWeek) {
    if (weekFilter && !weekFilter(week)) continue
    for (const a of list) {
      let row = out.get(a.teamId)
      if (!row) {
        row = { wins: 0, losses: 0, ties: 0 }
        out.set(a.teamId, row)
      }
      for (const b of list) {
        if (b.teamId === a.teamId) continue
        if (a.points > b.points) row.wins++
        else if (a.points < b.points) row.losses++
        else row.ties++
      }
    }
  }
  return out
}

/** Win fraction with ties counting half. Returns 0.5 for no games —
 *  neutral rather than zero, so an unplayed team is not ranked last by
 *  an accident of arithmetic. */
function pct(wins: number, losses: number, ties: number): number {
  const total = wins + losses + ties
  if (total <= 0) return 0.5
  return (wins + ties / 2) / total
}

/**
 * Power scores for every team with weekly scores, ranked highest first.
 *
 * Returns `[]` when the league has no usable weekly scores — before any
 * week has completed there is nothing to rank, and a placeholder board
 * would read exactly like a real one.
 */
export function computePointsPowerScores(data: LeagueDataH2HPoints): PointsPowerRow[] {
  const scores = data.weeklyScores ?? []
  const byWeek = scoresByWeek(scores)
  if (byWeek.size === 0) return []

  const playedWeeks = [...byWeek.keys()].sort((a, b) => a - b)
  const recentCutoff = playedWeeks[Math.max(0, playedWeeks.length - RECENT_WEEKS)]

  const allPlay = buildAllPlay(scores)
  const recentAllPlay = buildAllPlay(scores, (w) => w >= recentCutoff)

  // Per-team mean score across the weeks they actually played, so a
  // team that joined late or missed a week is not punished for the
  // weeks it has no score in.
  const totals = new Map<string, { sum: number; count: number }>()
  for (const list of byWeek.values()) {
    for (const s of list) {
      const t = totals.get(s.teamId) ?? { sum: 0, count: 0 }
      t.sum += s.points
      t.count += 1
      totals.set(s.teamId, t)
    }
  }

  const means = [...totals.entries()].map(([teamId, t]) => ({
    teamId,
    mean: t.count > 0 ? t.sum / t.count : 0,
    weeks: t.count,
  }))

  // League-relative scoring, as a z-score mapped onto 0-1. Absolute
  // point values are meaningless across leagues — a 90-point week is
  // strong in one league and poor in a superflex PPR one — so scoring
  // strength has to be measured against this league's own spread.
  const leagueMean = means.reduce((sum, m) => sum + m.mean, 0) / means.length
  const variance =
    means.reduce((sum, m) => sum + (m.mean - leagueMean) ** 2, 0) / means.length
  const stdev = Math.sqrt(variance)

  const standingByTeam = new Map(
    (data.standings ?? []).map((s) => [s.teamId, s]),
  )

  const rows: PointsPowerRow[] = means.map(({ teamId, mean, weeks }) => {
    const ap = allPlay.get(teamId) ?? { wins: 0, losses: 0, ties: 0 }
    const rp = recentAllPlay.get(teamId) ?? { wins: 0, losses: 0, ties: 0 }

    // With every team averaging the same, nobody is stronger — 0.5 for
    // all, rather than a divide-by-zero.
    const scoring =
      stdev > 0 ? clamp01(0.5 + (mean - leagueMean) / (4 * stdev)) : 0.5

    // A standing can exist and still carry no record. Guillotine
    // leagues (`settings.type: 3`) report every roster as 0-0-0 because
    // teams are eliminated rather than beaten — trusting `winPct` there
    // hands every team a record of 0 and silently drags the whole board
    // down by the full weight of this component. Zero games played means
    // "no record to read", not "lost everything", so fall back to
    // all-play exactly as if the standing were absent.
    const standing = standingByTeam.get(teamId)
    const gamesPlayed = standing
      ? standing.catWins + standing.catLosses + standing.catTies
      : 0
    const record =
      standing && gamesPlayed > 0
        ? clamp01(standing.winPct)
        : pct(ap.wins, ap.losses, ap.ties)

    const components: PointsPowerComponents = {
      allPlay: pct(ap.wins, ap.losses, ap.ties),
      scoring,
      record,
      recent: pct(rp.wins, rp.losses, rp.ties),
    }

    const blend =
      POWER_WEIGHTS.allPlay * components.allPlay +
      POWER_WEIGHTS.scoring * components.scoring +
      POWER_WEIGHTS.record * components.record +
      POWER_WEIGHTS.recent * components.recent

    return {
      teamId,
      score: Math.round(clamp01(blend) * 1000) / 10,
      components,
      allPlayWins: ap.wins,
      allPlayLosses: ap.losses,
      allPlayTies: ap.ties,
      pointsPerWeek: Math.round(mean * 10) / 10,
      weeksPlayed: weeks,
    }
  })

  // Highest power first; ties broken by scoring so the order is stable
  // and never depends on Map insertion order.
  return rows.sort((a, b) => b.score - a.score || b.pointsPerWeek - a.pointsPerWeek)
}
