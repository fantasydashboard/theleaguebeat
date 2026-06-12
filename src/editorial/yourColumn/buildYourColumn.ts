/**
 * buildYourColumn -- selects the magazine's coverage down to one team.
 * Pure (no I/O). Voice: personal LABELS, third-person SENTENCES (the team
 * is named, never "you"), so blocks forward cleanly to the whole chat.
 */
import type { LeagueData, H2HRecord } from '@/editorial/types'
import { detectCoverStory, detectPointsCoverStory } from '@/editorial/cover-story'

export interface YourColumnBlock {
  label: string
  eyebrow?: string
  headline: string
  body?: string
  chips?: { value: string; label: string }[]
  teamIds: string[]
}
export interface YourColumn {
  hero: YourColumnBlock
  matchup?: YourColumnBlock
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
const possessive = (s: string) => (/s$/i.test(s) ? `${s}'` : `${s}'s`)

export function buildYourColumn(data: LeagueData, teamId: string): YourColumn {
  return {
    hero: buildHero(data, teamId),
    matchup: buildMatchup(data, teamId),
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
  const headline = s
    ? `${name} sits ${ordinal(s.rank)}, ${record}.`
    : `${name} this week.`
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
    const verb = mine > opp ? 'leads' : mine < opp ? 'trails' : 'is level with'
    // Chips carry what the score line can't: the live gap, and where the
    // week projects to land. Never an echo of the two numbers above.
    const chips: { value: string; label: string }[] = [
      { value: Math.abs(mine - opp).toFixed(1), label: mine >= opp ? 'AHEAD' : 'BACK' },
    ]
    if (m.homeProjected != null && m.awayProjected != null) {
      const myProj = m.homeTeamId === teamId ? m.homeProjected : m.awayProjected
      const oppProj = m.homeTeamId === teamId ? m.awayProjected : m.homeProjected
      chips.push({
        value: Math.abs(myProj - oppProj).toFixed(1),
        label: myProj >= oppProj ? 'PROJ AHEAD' : 'PROJ BACK',
      })
    }
    return {
      label: 'Your matchup',
      eyebrow: 'LIVE',
      headline: `${name} ${verb} ${oppName}, ${mine.toFixed(1)}-${opp.toFixed(1)}.`,
      chips,
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
  const verb = mine > opp ? 'leads' : mine < opp ? 'trails' : 'is tied with'
  return {
    label: 'Your matchup',
    eyebrow: 'LIVE',
    headline: `${name} ${verb} ${oppName}, ${mine}-${opp}.`,
    teamIds: [teamId, oppId],
  }
}

function buildRival(data: LeagueData, teamId: string): YourColumnBlock | undefined {
  const name = nameOf(data, teamId)
  const records = (data.h2hRecords ?? []).filter(
    (r: H2HRecord) => r.teamId === teamId && r.meetings > 0,
  )
  if (records.length > 0) {
    // Most-played, tie-broken by closest record (smallest |wins-losses|).
    records.sort(
      (a, b) =>
        b.meetings - a.meetings ||
        Math.abs(a.wins - a.losses) - Math.abs(b.wins - b.losses),
    )
    const r = records[0]
    const oppName = nameOf(data, r.opponentId)
    const verb =
      r.wins > r.losses
        ? `leads ${oppName}`
        : r.wins < r.losses
          ? `trails ${oppName}`
          : `is even with ${oppName}`
    const record = r.ties > 0 ? `${r.wins}-${r.losses}-${r.ties}` : `${r.wins}-${r.losses}`
    // "Grudge" has to be earned: a 1-1 over two games isn't one. Below the
    // threshold it's just head-to-head. (Records are this season's meetings,
    // not cross-season — so the copy says "head-to-head", never "all-time".)
    const isGrudge = r.meetings >= 4
    return {
      label: 'Your Rival',
      eyebrow: isGrudge ? 'THE GRUDGE' : 'HEAD TO HEAD',
      headline: `${name} ${verb}, ${record}.`,
      body: `${r.meetings} meetings and counting.`,
      teamIds: [teamId, r.opponentId],
    }
  }
  // Fallback: this week's opponent.
  const mu = buildMatchup(data, teamId)
  if (!mu) return undefined
  const oppId = mu.teamIds[1]
  return {
    label: 'Your Rival',
    eyebrow: 'THIS WEEK',
    headline: `${name} faces ${nameOf(data, oppId)} this week.`,
    body: `A rivalry starts somewhere.`,
    teamIds: [teamId, oppId],
  }
}

function buildArc(data: LeagueData, teamId: string): YourColumnBlock | undefined {
  const hist = data.seasonRankHistory ?? []
  const series: number[] = []
  for (const w of hist) {
    const rk = w.ranks[teamId]
    if (rk != null) series.push(rk)
  }
  if (series.length < 2) return undefined
  const name = nameOf(data, teamId)
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
  if (start - end > 0 && end <= min + 1) {
    eyebrow = 'THE CLIMB'
    headline =
      end <= 1
        ? `${name} climbed to the top.`
        : `${name} climbed the board, #${start} to #${end}.`
  } else if (start - end < 0 && end >= max - 1) {
    eyebrow = 'THE SLIDE'
    headline = `${name} slid from #${start} to #${end}.`
  } else {
    eyebrow = 'THE ARC'
    headline = `${possessive(name)} season ranged from #${min} to #${max}.`
  }
  return {
    label: 'Your arc',
    eyebrow,
    headline,
    chips: [{ value: `#${start} → #${end}`, label: 'SEASON' }],
    teamIds: [teamId],
  }
}
