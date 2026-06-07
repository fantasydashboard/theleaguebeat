/**
 * synthesizeIssue — on-demand reconstruction of a past Issue's
 * CategoryLeagueData from the adapter's per-week match history.
 *
 * WHY: The Issue's archive (league_issues table) snapshots forward
 * from the moment the table ships. Past weeks that nobody visits
 * post-publish never get snapshotted. Without reconstruction, a
 * user connecting in week 10 sees Issue 10 only — every earlier
 * issue 404s. That's the wrong experience for a magazine.
 *
 * WHAT: Given the current adapter's CategoryLeagueData and a target
 * week N (1 ≤ N < currentWeek), replay matchupsByWeek to compute
 * what the standings, streaks, and weekly state looked like at the
 * end of week N. Return a freshly-shaped CategoryLeagueData that
 * the IssueView renders the same way it renders today's snapshot.
 *
 * FIDELITY: Standings, streaks, GotW, Around the League, BIGGEST
 * JUMP / LONGEST FALL, LONGEST STREAK — all exact (reproducible
 * from match history + seasonRankHistory).
 *
 * Per-cat ownership (`ownsCount`, `bleedingCount`) is NOT
 * recoverable from match history alone — those depend on raw
 * weekly stat totals we don't preserve. Reconstructed issues set
 * both to 0 and the IssueView degrades the cellar block + adds a
 * "Reconstructed from platform data" disclaimer in the footer.
 */

import type {
  CategoryLeagueData,
  CategoryLeagueDataMatchup,
  CategoryLeagueDataStanding,
  WLT,
} from './types'

/** Returns a synthesized CategoryLeagueData for week `weekN`, or
 *  null when the data we'd need isn't available. Always pure;
 *  never mutates the source. */
export function synthesizeIssue(
  data: CategoryLeagueData,
  weekN: number,
): CategoryLeagueData | null {
  if (!Number.isFinite(weekN) || weekN < 1) return null
  if (weekN >= data.currentWeek) return null
  const byWeek = data.matchupsByWeek
  if (!byWeek) return null
  // Need at least the target week's matchups to render GotW etc.
  const targetWeekMatchups = byWeek[String(weekN)]
  if (!targetWeekMatchups || targetWeekMatchups.length === 0) return null

  // ─── REPLAY STANDINGS ──────────────────────────────────────────
  // Accumulate per-team cat W/L/T across weeks 1..weekN, plus
  // per-week W/L outcome for streak + lastSix reconstruction.
  type Accum = {
    catWins: number
    catLosses: number
    catTies: number
    weekly: { week: number; outcome: WLT }[]
  }
  const accum = new Map<string, Accum>()
  const ensureAccum = (teamId: string): Accum => {
    let a = accum.get(teamId)
    if (!a) {
      a = { catWins: 0, catLosses: 0, catTies: 0, weekly: [] }
      accum.set(teamId, a)
    }
    return a
  }

  // Initialise every known team so even teams with no recorded
  // matchups (rare data quirk) show up with zeros instead of being
  // missing from the synthesized standings.
  for (const t of data.teams) ensureAccum(t.id)

  for (let w = 1; w <= weekN; w++) {
    const matchups = byWeek[String(w)]
    if (!matchups) continue
    for (const m of matchups) {
      const home = ensureAccum(m.homeTeamId)
      const away = ensureAccum(m.awayTeamId)
      home.catWins += m.homeCatWins
      home.catLosses += m.awayCatWins
      home.catTies += m.ties
      away.catWins += m.awayCatWins
      away.catLosses += m.homeCatWins
      away.catTies += m.ties
      // Per-week outcome from each team's perspective. Ties only
      // when neither side claimed more cats. status filters keep
      // unfinalized weeks (live/upcoming) out of streak math.
      if (m.status !== 'final') continue
      const homeOutcome: WLT =
        m.homeCatWins > m.awayCatWins ? 'W'
          : m.homeCatWins < m.awayCatWins ? 'L'
          : 'T'
      const awayOutcome: WLT =
        homeOutcome === 'W' ? 'L' : homeOutcome === 'L' ? 'W' : 'T'
      home.weekly.push({ week: w, outcome: homeOutcome })
      away.weekly.push({ week: w, outcome: awayOutcome })
    }
  }

  // ─── BUILD STANDINGS ───────────────────────────────────────────
  // Sort by winPct desc, breaking ties on catWins. Identical
  // logic to live standings — keeps the rank column honest.
  type WithMeta = Accum & {
    teamId: string
    winPct: number
    streak: { type: WLT; length: number }
    lastSix: WLT[]
  }
  const teamRows: WithMeta[] = []
  for (const [teamId, a] of accum) {
    const total = a.catWins + a.catLosses + a.catTies
    const winPct = total === 0 ? 0 : (a.catWins + 0.5 * a.catTies) / total
    // Current streak — walk back from the most recent decided week.
    // Ties break the streak (consistent with how live standings
    // present streak.type — no 'T' streaks of length > 0).
    a.weekly.sort((x, y) => x.week - y.week)
    let streakType: WLT = 'T'
    let streakLength = 0
    for (let i = a.weekly.length - 1; i >= 0; i--) {
      const o = a.weekly[i].outcome
      if (i === a.weekly.length - 1) {
        streakType = o
        streakLength = o === 'T' ? 0 : 1
        if (o === 'T') break
        continue
      }
      if (o === streakType && streakType !== 'T') streakLength++
      else break
    }
    // Last six — newest first matches the live shape.
    const lastSix = a.weekly
      .slice(-6)
      .map((x) => x.outcome)
      .reverse()
    teamRows.push({
      ...a,
      teamId,
      winPct,
      streak: { type: streakType, length: streakLength },
      lastSix,
    })
  }
  teamRows.sort((a, b) => {
    if (b.winPct !== a.winPct) return b.winPct - a.winPct
    return b.catWins - a.catWins
  })

  const standings: CategoryLeagueDataStanding[] = teamRows.map((row, i) => ({
    rank: i + 1,
    teamId: row.teamId,
    catWins: row.catWins,
    catLosses: row.catLosses,
    catTies: row.catTies,
    winPct: row.winPct,
    streak: row.streak,
    lastSix: row.lastSix,
    // Unrecoverable from match history. The IssueView's cellar
    // block hides the chips + the "Trailing in N categories" line
    // when synthesized is set, so 0 here is fine.
    ownsCount: 0,
    bleedingCount: 0,
  }))

  // ─── SHAPED OUTPUT ─────────────────────────────────────────────
  // Most fields pass through unchanged (teams, categories, season
  // meta, division layout, prior-season history). The reconstructed
  // bits are standings, streaks, currentWeek, and the GotW slice.
  const filteredRankHistory = data.seasonRankHistory.filter(
    (r) => r.week <= weekN,
  )

  const synth: CategoryLeagueData = {
    ...data,
    currentWeek: weekN + 1, // so IssueView's `currentWeek - 1` formula resolves to weekN
    standings,
    seasonRankHistory: filteredRankHistory,
    // The live current-week matchups don't apply to a past issue.
    matchupsCurrentWeek: [],
    // GotW + Around the League read from matchupsPreviousWeek.
    matchupsPreviousWeek: targetWeekMatchups,
    // Per-week record kept intact so re-synthesis (e.g., snapshot
    // miss → re-snap) is idempotent.
    matchupsByWeek: byWeek,
    synthesized: true,
  }
  return synth
}

/** Lightweight feasibility check — useful for the caller to decide
 *  upfront whether to attempt synthesis or surface "not archived
 *  yet" immediately. Cheaper than the full synthesis. */
export function canSynthesizeIssue(
  data: CategoryLeagueData,
  weekN: number,
): boolean {
  if (!Number.isFinite(weekN) || weekN < 1) return false
  if (weekN >= data.currentWeek) return false
  const byWeek = data.matchupsByWeek
  if (!byWeek) return false
  return Array.isArray(byWeek[String(weekN)]) && byWeek[String(weekN)].length > 0
}
