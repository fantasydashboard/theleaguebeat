/**
 * buildYourColumn -- selects the magazine's coverage down to one team.
 * Pure (no I/O). Voice: personal LABELS, third-person SENTENCES (the team
 * is named, never "you"), so blocks forward cleanly to the whole chat.
 */
import type { LeagueData, H2HRecord } from '@/editorial/types'
import { detectCoverStory, detectPointsCoverStory } from '@/editorial/cover-story'
import { buildYourPlayers, type YourPlayersBlock } from '@/editorial/yourColumn/buildYourPlayers'

/** Optional visualization a block can render. The view draws these; the
 *  builder just hands over the shaped data. */
export type YourColumnViz =
  | {
      kind: 'rankLine'
      series: number[]
      teamCount: number
      start: number
      end: number
      best: number // best (lowest) rank reached — top of the chart
      worst: number // worst (highest) rank — bottom of the chart
      tone: 'up' | 'down' | 'flat' // climb / slide / ranged, drives the line color
    }
  | {
      kind: 'scoreBar'
      myName: string
      oppName: string
      mine: number
      opp: number
      myProj?: number
      oppProj?: number
    }

export interface YourColumnBlock {
  label: string
  eyebrow?: string
  headline: string
  body?: string
  chips?: { value: string; label: string }[]
  viz?: YourColumnViz
  teamIds: string[]
}
export interface YourColumn {
  hero: YourColumnBlock
  matchup?: YourColumnBlock
  players?: YourPlayersBlock
  rival?: YourColumnBlock
  arc?: YourColumnBlock
}

const nameOf = (data: LeagueData, id: string) => data.teams.find((t) => t.id === id)?.name ?? id
const ordinal = (n: number) => {
  const v = n % 100
  if (v >= 11 && v <= 13) return `${n}th`
  switch (n % 10) {
    case 1: return `${n}st`
    case 2: return `${n}nd`
    case 3: return `${n}rd`
    default: return `${n}th`
  }
}
// Inner blocks elide the viewer's team name (the hero header already names
// them, and the team is in teamIds for share cards). Capitalize the verb so
// the elided sentence still reads as a headline.
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
// Keep a score like "12-7" or "376.5-441.1" from breaking across lines
// (the hyphen would otherwise let "12-" and "7" split). U+2011 is a
// non-breaking hyphen — a hyphen, not an em dash, so the voice rule holds.
const nbScore = (s: string) => s.replace(/-/g, '‑')

export function buildYourColumn(data: LeagueData, teamId: string): YourColumn {
  return {
    hero: buildHero(data, teamId),
    matchup: buildMatchup(data, teamId),
    players: buildYourPlayers(data.playerNights ?? [], teamId),
    rival: buildRival(data, teamId),
    arc: buildArc(data, teamId),
  }
}

function buildHero(data: LeagueData, teamId: string): YourColumnBlock {
  const cover =
    data.format === 'h2h-points' ? detectPointsCoverStory(data) : detectCoverStory(data)
  const name = nameOf(data, teamId)
  if (cover && cover.teamId === teamId) {
    return {
      label: 'Your headline',
      eyebrow: cover.eyebrow,
      headline: cover.headline,
      body: cover.body,
      // chips is [[value, label], [value, label], [value, label]] tuples
      chips: cover.chips.map(([value, label]) => ({ value, label })),
      teamIds: [teamId],
    }
  }
  // Quiet-week fallback: your standing.
  const s = (data.standings ?? []).find((x) => x.teamId === teamId)
  const record = s
    ? s.catTies > 0
      ? `${s.catWins}-${s.catLosses}-${s.catTies}`
      : `${s.catWins}-${s.catLosses}`
    : ''
  const streak = s && s.streak.type !== 'T' ? `${s.streak.type}${s.streak.length}` : ''
  const headline = s ? `Sits ${ordinal(s.rank)}, ${record}.` : `${name} this week.`
  // Chips carry facts the headline DIDN'T (streak, win pct) — never an
  // echo of the rank/record already in the sentence.
  const chips: { value: string; label: string }[] = []
  if (s) {
    if (streak) chips.push({ value: streak, label: 'STREAK' })
    chips.push({
      value: `.${Math.round(s.winPct * 1000).toString().padStart(3, '0')}`,
      label: 'WIN PCT',
    })
  }
  return {
    label: 'Your season',
    eyebrow: 'STANDINGS',
    headline,
    chips,
    teamIds: [teamId],
  }
}

function buildMatchup(data: LeagueData, teamId: string): YourColumnBlock | undefined {
  const name = nameOf(data, teamId)
  if (data.format === 'h2h-points') {
    const m = (data.currentWeekMatchups ?? []).find(
      (x) => x.homeTeamId === teamId || x.awayTeamId === teamId,
    )
    if (!m) return undefined
    const mine = m.homeTeamId === teamId ? m.homePoints : m.awayPoints
    const oppId = m.homeTeamId === teamId ? m.awayTeamId : m.homeTeamId
    const opp = m.homeTeamId === teamId ? m.awayPoints : m.homePoints
    const oppName = nameOf(data, oppId)
    const verbPhrase =
      mine > opp ? `leads ${oppName}` : mine < opp ? `trails ${oppName}` : `level with ${oppName}`
    // Chips carry what the score line can't: the live gap, and where the
    // week projects to land. Never an echo of the two numbers above.
    const myProj = m.homeTeamId === teamId ? m.homeProjected : m.awayProjected
    const oppProj = m.homeTeamId === teamId ? m.awayProjected : m.homeProjected
    const chips: { value: string; label: string }[] = [
      { value: Math.abs(mine - opp).toFixed(1), label: mine >= opp ? 'AHEAD' : 'BACK' },
    ]
    if (myProj != null && oppProj != null) {
      chips.push({
        value: Math.abs(myProj - oppProj).toFixed(1),
        label: myProj >= oppProj ? 'PROJ AHEAD' : 'PROJ BACK',
      })
    }
    return {
      label: 'Your matchup',
      eyebrow: 'LIVE',
      headline: `${cap(verbPhrase)}, ${nbScore(`${mine.toFixed(1)}-${opp.toFixed(1)}`)}.`,
      chips,
      viz: { kind: 'scoreBar', myName: name, oppName, mine, opp, myProj: myProj ?? undefined, oppProj: oppProj ?? undefined },
      teamIds: [teamId, oppId],
    }
  }
  const m = (data.matchupsCurrentWeek ?? []).find(
    (x) => x.homeTeamId === teamId || x.awayTeamId === teamId,
  )
  if (!m) return undefined
  const mine = m.homeTeamId === teamId ? m.homeCatWins : m.awayCatWins
  const oppId = m.homeTeamId === teamId ? m.awayTeamId : m.homeTeamId
  const opp = m.homeTeamId === teamId ? m.awayCatWins : m.homeCatWins
  const oppName = nameOf(data, oppId)
  const verbPhrase =
    mine > opp ? `leads ${oppName}` : mine < opp ? `trails ${oppName}` : `tied with ${oppName}`
  // A category split bar gives the cats matchup the same visual weight as
  // points. The margin chip is skipped on a tie (0 reads oddly).
  const catChips =
    mine === opp
      ? undefined
      : [{ value: String(Math.abs(mine - opp)), label: mine > opp ? 'AHEAD' : 'BACK' }]
  return {
    label: 'Your matchup',
    eyebrow: 'LIVE',
    headline: `${cap(verbPhrase)}, ${nbScore(`${mine}-${opp}`)}.`,
    chips: catChips,
    viz: { kind: 'scoreBar', myName: name, oppName, mine, opp },
    teamIds: [teamId, oppId],
  }
}

function buildRival(data: LeagueData, teamId: string): YourColumnBlock | undefined {
  const currentOppId = buildMatchup(data, teamId)?.teamIds[1]
  // A rival is a recurring foe, not whoever you happen to face this week.
  // Require at least two meetings, and skip this week's opponent unless
  // they're a real nemesis (4+ meetings) — otherwise the rival block just
  // echoes the matchup block. Below the bar: omit, never invent.
  const records = (data.h2hRecords ?? []).filter(
    (r: H2HRecord) =>
      r.teamId === teamId &&
      r.meetings >= 2 &&
      (r.opponentId !== currentOppId || r.meetings >= 4),
  )
  if (records.length === 0) return undefined
  // Most-played, tie-broken by closest record (smallest |wins-losses|).
  records.sort(
    (a, b) =>
      b.meetings - a.meetings || Math.abs(a.wins - a.losses) - Math.abs(b.wins - b.losses),
  )
  const r = records[0]
  const oppName = nameOf(data, r.opponentId)
  const verbPhrase =
    r.wins > r.losses
      ? `leads ${oppName}`
      : r.wins < r.losses
        ? `trails ${oppName}`
        : `even with ${oppName}`
  const record = r.ties > 0 ? `${r.wins}-${r.losses}-${r.ties}` : `${r.wins}-${r.losses}`
  // (Records are this season's meetings, not cross-season — so the copy
  // says "head to head", never "all-time".)
  const isGrudge = r.meetings >= 4
  return {
    label: 'Your Rival',
    eyebrow: isGrudge ? 'THE GRUDGE' : 'HEAD TO HEAD',
    headline: `${cap(verbPhrase)}, ${record}.`,
    body: `${r.meetings} meeting${r.meetings === 1 ? '' : 's'} and counting.`,
    teamIds: [teamId, r.opponentId],
  }
}

function buildArc(data: LeagueData, teamId: string): YourColumnBlock | undefined {
  const hist = data.seasonRankHistory ?? []
  const series: number[] = []
  for (const w of hist) {
    const rk = w.ranks[teamId]
    if (rk != null) series.push(rk)
  }
  // seasonRankHistory can stop at the last fully-decided week, which may
  // disagree with where the team sits right now (e.g. Yahoo cats: history
  // ends #6 while the live standing is #9). Append the current rank so the
  // arc ends on the same number the season block shows — no contradiction.
  const currentRank = (data.standings ?? []).find((s) => s.teamId === teamId)?.rank
  if (currentRank != null && series[series.length - 1] !== currentRank) series.push(currentRank)
  if (series.length < 2) return undefined
  const start = series[0]
  const end = series[series.length - 1]
  const min = Math.min(...series)
  const max = Math.max(...series)
  // A team that never moved has no arc to report — omit rather than
  // print "ranged from #3 to #3" (omit, never invent).
  if (start === end && min === max) return undefined
  // The kicker matches the shape of the move (never echoes the "Your arc"
  // label) — so a climber reads THE CLIMB, a faller THE SLIDE.
  let headline: string
  let eyebrow: string
  let tone: 'up' | 'down' | 'flat'
  if (start - end > 0 && end <= min + 1) {
    eyebrow = 'THE CLIMB'
    tone = 'up'
    headline =
      end <= 1
        ? `Climbed to the top of the board.`
        : `Climbed the board, #${start} to #${end}.`
  } else if (start - end < 0 && end >= max - 1) {
    eyebrow = 'THE SLIDE'
    tone = 'down'
    headline = `Slid from #${start} to #${end}.`
  } else {
    eyebrow = 'THE ARC'
    tone = 'flat'
    headline = `Ranged from #${min} to #${max} on the season.`
  }
  return {
    label: 'Your arc',
    eyebrow,
    headline,
    chips: [{ value: `#${start} → #${end}`, label: 'SEASON' }],
    viz: {
      kind: 'rankLine',
      series,
      teamCount: data.teams.length,
      start,
      end,
      best: min,
      worst: max,
      tone,
    },
    teamIds: [teamId],
  }
}
