/**
 * THE BEAT — H2H points wire.
 *
 * Points-league sibling of detect-beat.ts + render-beat.ts. Produces the
 * same `RenderedBeat` (days of `BeatItem`) the category Beat does, so
 * BeatFeedView renders both with one template. Reuses `groupByDay` (which
 * also marks the featured lead per day).
 *
 * Event kinds that port from the category Beat (matchup / standings /
 * rank driven): FINAL, STREAK, THRONE, CELLAR, RACE, BRIEFING, LIVE,
 * ISSUE. The player-driven kinds (HUGE_GAME, BENCH_BLUNDER, FREE_AGENT)
 * need per-player data the points adapters don't fetch yet, so they're
 * absent here until that data lands.
 *
 * All copy stays in points / record / wins language. No "cats".
 *
 * Timestamps are synthetic (no event log in V0): finals on Sunday night,
 * streak / throne / cellar / issue Monday morning, race continuous,
 * briefing + live keyed to today. Same editorial shape as the category
 * Beat so the two feel like one publication.
 */

import type {
  LeagueDataH2HPoints,
  LeagueDataPointsMatchup,
  CategoryLeagueDataStanding,
} from './types'
import type { BeatItem, RenderedBeat } from './render-beat'
import { groupByDay } from './render-beat'
import { stripEmojiForEditorial } from './detect-lede'
import { sportOf , hasPlayedGames } from './leagueCore'
import { footballFinalHeadlines, footballFinalBodies, footballStreakLines, type FinalArgs } from './football'

/* ─────────────────────────────────────────────────────────────────
   SMALL HELPERS — deterministic hashing + synthetic timestamps.
   Kept local so the points wire is self-contained; the only shared
   import is groupByDay (day bucketing + featured marking).
───────────────────────────────────────────────────────────────── */

function hashString(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h = (h ^ s.charCodeAt(i)) >>> 0
    h = Math.imul(h, 16777619) >>> 0
  }
  return h >>> 0
}

/** Deterministic minute offset in [min, max], stable per key. */
function hashStagger(key: string, min: number, max: number): number {
  if (max <= min) return min
  return min + (hashString(key) % (max - min + 1))
}

/** Deterministic pick from a candidate list, stable per key. Empty /
 *  null candidates are filtered first so optional variants can opt out. */
function pick(key: string, candidates: Array<string | null | undefined>): string {
  const real = candidates.filter((c): c is string => typeof c === 'string' && c.length > 0)
  if (real.length === 0) return ''
  return real[hashString(key) % real.length]
}

function lastSundayNight(now: Date): Date {
  const d = new Date(now)
  const day = d.getDay()
  const back = day === 0 ? 7 : day
  d.setDate(d.getDate() - back)
  d.setHours(23, 55, 0, 0)
  return d
}

function lastMonday(now: Date, hour: number, minute: number): Date {
  const d = new Date(now)
  const day = d.getDay()
  const back = day === 0 ? 6 : day - 1
  d.setDate(d.getDate() - back)
  d.setHours(hour, minute, 0, 0)
  return d
}

/* ─────────────────────────────────────────────────────────────────
   SHARED CONTEXT
───────────────────────────────────────────────────────────────── */

interface Ctx {
  teamName: (id: string) => string
  standingById: Map<string, CategoryLeagueDataStanding>
  /** League weekly scoring average — scales the "rout vs squeaker"
   *  bands so thresholds aren't hard-coded to one league's magnitude. */
  leagueAvg: number
  currentWeek: number
}

function recordOf(s: CategoryLeagueDataStanding | undefined): string | undefined {
  if (!s) return undefined
  return s.catTies > 0 ? `${s.catWins}-${s.catLosses}-${s.catTies}` : `${s.catWins}-${s.catLosses}`
}

/** Current scoreboard margin — drives "how close is this" for BRIEFING +
 *  LIVE. Deliberately NOT projection-based: a team up 117 now but
 *  "projected even" still reads as a blowout on screen, so closeness has
 *  to track the number the reader actually sees. */
function liveMargin(m: LeagueDataPointsMatchup): number {
  return Math.abs(m.homePoints - m.awayPoints)
}

/** English ordinal: 1 -> "1st", 2 -> "2nd", 3 -> "3rd", 11 -> "11th". */
function ordinal(n: number): string {
  const v = n % 100
  if (v >= 11 && v <= 13) return `${n}th`
  switch (n % 10) {
    case 1: return `${n}st`
    case 2: return `${n}nd`
    case 3: return `${n}rd`
    default: return `${n}th`
  }
}

/* ─────────────────────────────────────────────────────────────────
   PUBLIC ENTRY
───────────────────────────────────────────────────────────────── */

export function renderBeatPoints(
  data: LeagueDataH2HPoints,
  now: Date = new Date(),
): RenderedBeat {
  const nameMap = new Map<string, string>()
  for (const t of data.teams) {
    nameMap.set(t.id, stripEmojiForEditorial(t.name) || t.name)
  }
  const standingById = new Map<string, CategoryLeagueDataStanding>()
  for (const s of data.standings ?? []) standingById.set(s.teamId, s)

  const ctx: Ctx = {
    teamName: (id) => nameMap.get(id) ?? id,
    standingById,
    leagueAvg: data.weeklyPointsAverage && data.weeklyPointsAverage > 0
      ? data.weeklyPointsAverage
      : 80,
    currentWeek: data.currentWeek,
  }

  const items: BeatItem[] = [
    ...detectFinals(data, ctx, now),
    ...detectStreaks(data, ctx, now),
    ...detectThrone(data, ctx, now),
    ...detectCellar(data, ctx, now),
    ...detectRace(data, ctx, now),
    ...detectIssue(data, ctx, now),
    ...detectBriefing(data, ctx, now),
    ...detectLive(data, ctx, now),
  ]

  const days = groupByDay(items, now)
  return { days, items }
}

/* ─────────────────────────────────────────────────────────────────
   FINAL — last week's results, by points. Sunday night.
───────────────────────────────────────────────────────────────── */

function detectFinals(data: LeagueDataH2HPoints, ctx: Ctx, now: Date): BeatItem[] {
  const prev = data.previousWeekMatchups ?? []
  if (prev.length === 0) return []
  const isFootball = sportOf(data) === 'nfl'
  const base = lastSundayNight(now)
  const out: BeatItem[] = []
  for (const m of prev) {
    if (m.status !== 'final') continue
    if (m.homePoints === 0 && m.awayPoints === 0) continue // unplayed artifact
    if (m.homePoints === m.awayPoints) continue // exact tie — no winner to crown
    const homeWin = m.homePoints > m.awayPoints
    const winnerId = homeWin ? m.homeTeamId : m.awayTeamId
    const loserId = homeWin ? m.awayTeamId : m.homeTeamId
    const wPts = homeWin ? m.homePoints : m.awayPoints
    const lPts = homeWin ? m.awayPoints : m.homePoints
    const margin = wPts - lPts
    const winner = ctx.teamName(winnerId)
    const loser = ctx.teamName(loserId)
    const importance = margin >= ctx.leagueAvg * 0.35 ? 'high'
      : margin >= ctx.leagueAvg * 0.15 ? 'med' : 'low'
    const key = `FINAL:${m.id}`
    const ws = ctx.standingById.get(winnerId)
    const finalArgs: FinalArgs = {
      winner, loser, winnerPts: wPts, loserPts: lPts,
      leagueAvg: ctx.leagueAvg,
      winnerStreak: ws?.streak,
      winnerRecord: recordOf(ws),
      week: Math.max(1, ctx.currentWeek - 1),
    }
    const headline = pick(key, isFootball
      ? footballFinalHeadlines(finalArgs)
      : [
          margin >= ctx.leagueAvg * 0.35 ? `${winner} ran past ${loser}, ${wPts.toFixed(1)}-${lPts.toFixed(1)}.` : null,
          margin <= ctx.leagueAvg * 0.06 ? `${winner} edged ${loser}, ${wPts.toFixed(1)}-${lPts.toFixed(1)}.` : null,
          `${winner} beat ${loser}, ${wPts.toFixed(1)}-${lPts.toFixed(1)}.`,
          `${winner} took down ${loser}, ${wPts.toFixed(1)}-${lPts.toFixed(1)}.`,
          `Final: ${winner} ${wPts.toFixed(1)}, ${loser} ${lPts.toFixed(1)}.`,
        ])
    // Body: lean on the winner's streak/record for real context.
    let body: string | undefined
    if (isFootball) {
      body = pick(`${key}:body`, footballFinalBodies(finalArgs)) || undefined
    } else if (ws && ws.streak.type === 'W' && ws.streak.length >= 3) {
      body = `${possessive(winner)} ${ordinal(ws.streak.length)} straight.`
    } else if (margin <= ctx.leagueAvg * 0.06) {
      body = `Decided by the slimmest of margins.`
    } else {
      const rec = recordOf(ws)
      body = rec ? `${winner} now ${rec} on the year.` : undefined
    }
    out.push({
      id: key,
      category: 'FINAL',
      categoryLabel: 'FINAL',
      timestamp: new Date(base.getTime() - hashStagger(m.id, 0, 30) * 60_000),
      importance,
      headline,
      body,
      widget: { kind: 'two-logos', teamIds: [winnerId, loserId] },
      isFeatured: false,
    })
  }
  return out
}

/* ─────────────────────────────────────────────────────────────────
   STREAK — milestone crossings from standings. Monday morning.
───────────────────────────────────────────────────────────────── */

const WIN_MILESTONES = [10, 7, 5]
const LOSS_MILESTONES = [8, 5]

function detectStreaks(data: LeagueDataH2HPoints, ctx: Ctx, now: Date): BeatItem[] {
  const isFootball = sportOf(data) === 'nfl'
  const base = lastMonday(now, 7, 0)
  const out: BeatItem[] = []
  for (const s of data.standings ?? []) {
    if (s.streak.type === 'T' || s.streak.length === 0) continue
    const ladder = s.streak.type === 'W' ? WIN_MILESTONES : LOSS_MILESTONES
    const milestone = ladder.find((m) => s.streak.length >= m)
    if (!milestone) continue
    const team = ctx.teamName(s.teamId)
    const len = s.streak.length
    const importance = milestone >= 8 ? 'high' : milestone >= 5 ? 'med' : 'low'
    const key = `STREAK:${s.teamId}:${s.streak.type}${milestone}`
    const neutralBody = s.streak.type === 'W' ? `The ladder reflects the work.` : `The slide isn't slowing.`
    const headline = isFootball
      ? pick(key, footballStreakLines(team, s.streak.type, len))
      : s.streak.type === 'W'
        ? pick(key, [
            len >= 10 ? `Ten in a row for ${team}.` : null,
            `${team}: ${len} straight wins.`,
            `${team} keeps rolling. W${len}.`,
          ])
        : pick(key, [
            `${team}: L${len}. ${len} deep.`,
            `${team} can't stop the bleeding. L${len}.`,
            `${len} straight losses for ${team}.`,
          ])
    const body = isFootball
      ? pick(`${key}:body`, footballStreakLines(team, s.streak.type, len)) || neutralBody
      : neutralBody
    out.push({
      id: key,
      category: 'STREAK',
      categoryLabel: 'STREAK',
      timestamp: new Date(base.getTime() + hashStagger(key, 0, 26) * 60_000),
      importance,
      headline,
      body,
      widget: { kind: 'streak-chip', teamIds: [s.teamId], text: `${s.streak.type}${len}`, tone: s.streak.type === 'W' ? 'win' : 'loss' },
      isFeatured: false,
    })
  }
  return out
}

/* ─────────────────────────────────────────────────────────────────
   THRONE — new #1 vs last week. Monday 7:15.
───────────────────────────────────────────────────────────────── */

function findRankOne(ranks: Record<string, number>): string | undefined {
  for (const [id, r] of Object.entries(ranks)) if (r === 1) return id
  return undefined
}

function detectThrone(data: LeagueDataH2HPoints, ctx: Ctx, now: Date): BeatItem[] {
  const hist = data.seasonRankHistory ?? []
  if (hist.length < 2) return []
  const isFootball = sportOf(data) === 'nfl'
  const top = findRankOne(hist[hist.length - 1].ranks)
  const prevTop = findRankOne(hist[hist.length - 2].ranks)
  if (!top || !prevTop || top === prevTop) return []
  let held = 0
  for (let i = hist.length - 2; i >= 0; i--) {
    if (findRankOne(hist[i].ranks) === prevTop) held++
    else break
  }
  const newName = ctx.teamName(top)
  const oldName = ctx.teamName(prevTop)
  const key = `THRONE:${top}:over:${prevTop}`
  const headline = pick(key, [
    held >= 5 ? `${newName} ends ${possessive(oldName)} reign.` : null,
    `${newName} takes the top from ${oldName}.`,
    `New #1: ${newName}.`,
  ])
  // Football: if the new #1 is riding a real win streak, that's the more
  // honest story than the deposed team's reign length (which this engine
  // cannot attribute to anything the new leader did). Falls through to
  // the neutral "reign ended" body when there's no qualifying streak —
  // footballStreakLines returns [] below its own three-game minimum.
  const newLeaderStreak = ctx.standingById.get(top)?.streak
  const footballBody = isFootball && newLeaderStreak && newLeaderStreak.type === 'W'
    ? pick(`${key}:streak`, footballStreakLines(newName, 'W', newLeaderStreak.length))
    : ''
  const body = footballBody
    || (held >= 1 ? `Week ${ctx.currentWeek - 1}. A ${held}-week run at the top, over.` : `The ladder has a new leader.`)
  return [{
    id: key,
    category: 'THRONE',
    categoryLabel: 'THRONE',
    timestamp: lastMonday(now, 7, 15),
    importance: held >= 4 ? 'high' : 'med',
    headline,
    body,
    widget: { kind: 'two-logos', teamIds: [top, prevTop] },
    isFeatured: false,
  }]
}

function possessive(name: string): string {
  return /s$/i.test(name) ? `${name}'` : `${name}'s`
}

/* ─────────────────────────────────────────────────────────────────
   CELLAR — bottom team in a real slide. Monday 7:40. Points-native:
   no per-category ownership, so it fires on a losing streak alone.
───────────────────────────────────────────────────────────────── */

function detectCellar(data: LeagueDataH2HPoints, ctx: Ctx, now: Date): BeatItem[] {
  const standings = data.standings ?? []
  if (standings.length < 4) return []
  const last = [...standings].sort((a, b) => b.rank - a.rank)[0]
  const lStreak = last.streak.type === 'L' ? last.streak.length : 0
  if (lStreak < 4) return []
  const team = ctx.teamName(last.teamId)
  const key = `CELLAR:${last.teamId}`
  const headline = pick(key, [
    `${team} can't find the floor.`,
    `${team}: ${lStreak} straight losses at the bottom.`,
    `${team} is stuck in the cellar.`,
  ])
  return [{
    id: key,
    category: 'CELLAR',
    categoryLabel: 'CELLAR',
    timestamp: lastMonday(now, 7, 40),
    importance: lStreak >= 6 ? 'high' : 'med',
    headline,
    body: `${lStreak} weeks deep in the cold. The slide hasn't stopped.`,
    widget: { kind: 'team-logo', teamIds: [last.teamId] },
    isFeatured: false,
  }]
}

/* ─────────────────────────────────────────────────────────────────
   RACE — tightest adjacent record gap, weighted toward the cutline.
───────────────────────────────────────────────────────────────── */

function detectRace(data: LeagueDataH2HPoints, ctx: Ctx, now: Date): BeatItem[] {
  const standings = data.standings ?? []
  if (standings.length < 2) return []
  // Before kickoff every team is 0-0, so "adjacent in the standings" and
  // "a seat from the cutoff" describe an arbitrary sort order rather
  // than anything that happened. Say nothing instead.
  if (!hasPlayedGames(data)) return []
  const cutoff = data.playoffCutoff || Math.max(1, Math.floor(data.teams.length / 2))
  const byRank = [...standings].sort((a, b) => a.rank - b.rank)
  let best: { a: CategoryLeagueDataStanding; b: CategoryLeagueDataStanding; gap: number; dist: number } | null = null
  let bestScore = Infinity
  for (let i = 0; i < byRank.length - 1; i++) {
    const a = byRank[i]
    const b = byRank[i + 1]
    const gap = Math.abs(a.catWins - b.catWins)
    const dist = Math.abs((a.rank + 0.5) - (cutoff + 0.5))
    const score = gap + dist * 0.8
    if (score < bestScore) { bestScore = score; best = { a, b, gap, dist } }
  }
  if (!best || best.gap > 1) return []
  const aName = ctx.teamName(best.a.teamId)
  const bName = ctx.teamName(best.b.teamId)
  const key = `RACE:${best.a.teamId}:${best.b.teamId}`
  const headline = best.gap === 0
    ? pick(key, [`${aName} and ${bName}, dead even.`, `${aName} and ${bName}: level on the ladder.`])
    : pick(key, [`${aName} holds a one-game edge on ${bName}.`, `${aName} and ${bName}: one game apart.`])
  return [{
    id: key,
    category: 'RACE',
    categoryLabel: 'RACE',
    timestamp: new Date(now.getTime() - 2 * 60 * 60 * 1000),
    importance: best.gap === 0 ? 'high' : 'med',
    headline,
    body: best.dist <= 1 ? `Adjacent in the standings, a seat from the cutoff.` : `Adjacent in the standings.`,
    widget: { kind: 'two-logos', teamIds: [best.a.teamId, best.b.teamId] },
    isFeatured: false,
  }]
}

/* ─────────────────────────────────────────────────────────────────
   ISSUE — Monday 11 AM recap marker.
───────────────────────────────────────────────────────────────── */

function detectIssue(data: LeagueDataH2HPoints, ctx: Ctx, now: Date): BeatItem[] {
  const issueNumber = data.currentWeek - 1
  if (issueNumber < 1) return []
  const ts = lastMonday(now, 11, 0)
  if (ts.getTime() > now.getTime()) return []
  const leader = (data.standings ?? []).find((s) => s.rank === 1)
  const leaderName = leader ? ctx.teamName(leader.teamId) : undefined
  return [{
    id: `ISSUE:${issueNumber}`,
    category: 'ISSUE',
    categoryLabel: 'ISSUE',
    timestamp: ts,
    importance: 'med',
    headline: `Issue ${issueNumber}: the latest edition is live.`,
    body: leaderName ? `${leaderName} anchors the recap.` : undefined,
    widget: leader ? { kind: 'team-logo', teamIds: [leader.teamId] } : undefined,
    isFeatured: false,
  }]
}

/* ─────────────────────────────────────────────────────────────────
   BRIEFING — 7 AM preview of today's slate.
───────────────────────────────────────────────────────────────── */

function detectBriefing(data: LeagueDataH2HPoints, ctx: Ctx, now: Date): BeatItem[] {
  const current = data.currentWeekMatchups ?? []
  if (current.length === 0) return []
  const ts = new Date(now)
  ts.setHours(7, 0, 0, 0)
  if (ts.getTime() > now.getTime()) return []
  const live = current.filter((m) => m.status === 'live')
  if (live.length === 0) return []
  // Marquee = the closest matchup on the live scoreboard.
  let marquee = live[0]
  let closest = liveMargin(live[0])
  for (const m of live) {
    const pm = liveMargin(m)
    if (pm < closest) { closest = pm; marquee = m }
  }
  const tightCount = live.filter((m) => liveMargin(m) <= ctx.leagueAvg * 0.05).length
  const a = ctx.teamName(marquee.homeTeamId)
  const b = ctx.teamName(marquee.awayTeamId)
  return [{
    id: `BRIEFING:${ts.getFullYear()}-${ts.getMonth()}-${ts.getDate()}`,
    category: 'BRIEFING',
    categoryLabel: 'BRIEFING',
    timestamp: ts,
    importance: tightCount >= 3 ? 'med' : 'low',
    headline: `${live.length} ${live.length === 1 ? 'matchup' : 'matchups'} in motion today.`,
    body: `${a} vs ${b} is the closest one to watch.`,
    widget: undefined,
    isFeatured: false,
  }]
}

/* ─────────────────────────────────────────────────────────────────
   LIVE — close in-progress matchups, midday.
───────────────────────────────────────────────────────────────── */

function detectLive(data: LeagueDataH2HPoints, ctx: Ctx, now: Date): BeatItem[] {
  const current = data.currentWeekMatchups ?? []
  if (current.length === 0) return []
  const base = new Date(now)
  base.setHours(12, 30, 0, 0)
  if (base.getTime() > now.getTime()) return []
  // "Close enough to surface" tracks the LIVE scoreboard, scaled to the
  // league's weekly magnitude. A genuinely tight game uses "edges"; the
  // wider end of the band uses "leads" so the verb never overstates.
  const closeThreshold = Math.max(ctx.leagueAvg * 0.05, 5)
  const tightThreshold = Math.max(ctx.leagueAvg * 0.015, 2)
  const out: BeatItem[] = []
  for (const m of current) {
    if (m.status !== 'live') continue
    const curMargin = liveMargin(m)
    // Only surface matchups that are actually close on the scoreboard.
    // Lopsided games (even if projected to tighten) aren't "live drama".
    if (curMargin > closeThreshold) continue
    const homeLeads = m.homePoints >= m.awayPoints
    const leaderId = homeLeads ? m.homeTeamId : m.awayTeamId
    const trailerId = homeLeads ? m.awayTeamId : m.homeTeamId
    const leaderPts = homeLeads ? m.homePoints : m.awayPoints
    const trailerPts = homeLeads ? m.awayPoints : m.homePoints
    const leader = ctx.teamName(leaderId)
    const trailer = ctx.teamName(trailerId)
    const key = `LIVE:${m.id}`
    const headline = curMargin <= Math.max(ctx.leagueAvg * 0.005, 0.5)
      ? pick(key, [`${leader} and ${trailer}, level at ${leaderPts.toFixed(1)}.`, `Dead heat: ${leader} and ${trailer}.`])
      : curMargin <= tightThreshold
        ? pick(key, [`${leader} edges ${trailer}, ${leaderPts.toFixed(1)}-${trailerPts.toFixed(1)}.`, `${leader} by a hair on ${trailer}, ${leaderPts.toFixed(1)}-${trailerPts.toFixed(1)}.`])
        : pick(key, [`${leader} leads ${trailer}, ${leaderPts.toFixed(1)}-${trailerPts.toFixed(1)}.`, `${leader} ahead of ${trailer} by ${curMargin.toFixed(1)}.`])
    const body = pick(`${key}:b`, [`Still anyone's.`, `Tight on the scoreboard.`, `A coin flip from here.`])
    out.push({
      id: key,
      category: 'LIVE',
      categoryLabel: 'LIVE',
      timestamp: new Date(base.getTime() + hashStagger(m.id, 0, 75) * 60_000),
      importance: curMargin <= tightThreshold ? 'med' : 'low',
      headline,
      body,
      widget: { kind: 'two-logos', teamIds: [leaderId, trailerId] },
      isFeatured: false,
    })
  }
  return out
}
