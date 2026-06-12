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
  const body = streak
    ? s!.streak.type === 'W'
      ? `Riding a ${streak} run.`
      : `Stuck on a ${streak} slide.`
    : undefined
  return {
    label: 'Your season',
    eyebrow: 'YOUR COLUMN',
    headline,
    body,
    chips: s
      ? [{ value: `#${s.rank}`, label: 'RANK' }, { value: record, label: 'RECORD' }]
      : [],
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
    return {
      label: 'Your matchup',
      eyebrow: 'LIVE',
      headline: `${name} ${verb} ${oppName}, ${mine.toFixed(1)}-${opp.toFixed(1)}.`,
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
    return {
      label: 'Your Rival',
      eyebrow: 'THE GRUDGE',
      headline: `${name} ${verb} ${record} all-time.`,
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
  let headline: string
  if (start - end > 0 && end <= min + 1)
    headline =
      end <= 1
        ? `${name} climbed to the top.`
        : `${name} climbed the board, #${start} to #${end}.`
  else if (start - end < 0 && end >= max - 1)
    headline = `${name} slid from #${start} to #${end}.`
  else headline = `${possessive(name)} season ranged from #${min} to #${max}.`
  return {
    label: 'Your arc',
    eyebrow: 'YOUR ARC',
    headline,
    chips: [{ value: `#${start} → #${end}`, label: 'SEASON' }],
    teamIds: [teamId],
  }
}
