/**
 * Story detection — THE BEAT (daily news wire).
 *
 * The Beat is the live, chronological feed of league events. Each
 * detector produces one or more `BeatItemSeed`s — pure data records
 * keyed off discrete events (a matchup finalizing, a streak crossing
 * a threshold, a throne change). The renderer (render-beat.ts) takes
 * the seeds, picks variant copy from per-category pools, and emits
 * the final `BeatItem`s the view consumes.
 *
 * V0 is **stateless**: timestamps are derived from the data (week
 * boundary, current time) rather than persisted from a real event log.
 * That's enough to ship a credible feed for the current week without
 * adding a Supabase events table. V1 will replace derived timestamps
 * with real "fired at" timestamps from a persistence layer.
 */

import type {
  CategoryLeagueData,
  CategoryLeagueDataStanding,
} from './types.ts'
import { normalizeName } from './players/buildPlayerNights.ts'
import { formatNightStats } from './players/formatNightStats'
import { playerHeadshotUrl } from '@/utils/playerHeadshot'

/* ─────────────────────────────────────────────────────────────────
   PUBLIC TYPES
───────────────────────────────────────────────────────────────── */

export type BeatCategory =
  | 'FINAL'         // matchup finalized
  | 'STREAK'        // streak crossed a milestone
  | 'THRONE'        // new #1
  | 'CELLAR'        // bottom team's slide confirms
  | 'RACE'          // tightest race tracker
  | 'ISSUE'         // weekly issue published
  | 'BRIEFING'      // daily 7 AM morning summary
  | 'LIVE'          // in-progress close matchup tracker
  | 'HUGE_GAME'     // single player's standout day cleared a threshold
  | 'BENCH_BLUNDER' // benched player would have qualified as HUGE_GAME
  | 'FREE_AGENT'    // unowned player cleared a HIGH threshold — waiver-wire heads-up

export type BeatImportance = 'high' | 'med' | 'low'

export interface BeatWidget {
  kind: 'team-logo' | 'two-logos' | 'streak-chip' | 'score-chip' | 'player-photo'
  teamIds?: string[]
  text?: string
  tone?: 'win' | 'loss' | 'neutral'
  /** Player-photo widget extras — name, photo URL, optional stat line. */
  playerName?: string
  photoUrl?: string
  statLine?: string
}

/**
 * A detected event before the variant renderer has chosen copy. The
 * `signal` field is for debugging only — never user-facing.
 */
export interface BeatItemSeed {
  /** Stable id for keying. Format: `{category}:{key}` */
  id: string
  category: BeatCategory
  /** When the event happened. Derived from data in V0. */
  timestamp: Date
  importance: BeatImportance
  /** Structured payload the renderer uses to fill variant slots. */
  payload: BeatPayload
  signal: string
}

/** Discriminated union — one payload shape per category. The render
 *  pipeline narrows on `category` and pulls only what it needs. */
export type BeatPayload =
  | FinalPayload
  | StreakPayload
  | ThronePayload
  | CellarPayload
  | RacePayload
  | IssuePayload
  | BriefingPayload
  | LivePayload
  | HugeGamePayload
  | BenchBlunderPayload
  | FreeAgentPayload

export interface FinalPayload {
  category: 'FINAL'
  winnerTeamId: string
  loserTeamId: string
  winnerCats: number
  loserCats: number
  ties: number
  margin: number
  // Post-matchup context — drives the editorial body line so it can
  // carry real information ("Funk's third straight", "Drops Goof to
  // 60-53 on the year") instead of generic platitudes. Optional
  // because some adapters may not surface every field for every team.
  winnerStreakType?: 'W' | 'L' | 'T'
  winnerStreakLength?: number
  loserStreakType?: 'W' | 'L' | 'T'
  loserStreakLength?: number
  winnerSeasonRecord?: string  // "83-32" or "83-32-1" formatted
  loserSeasonRecord?: string
  winnerRank?: number
  loserRank?: number
}

export interface StreakPayload {
  category: 'STREAK'
  teamId: string
  streakType: 'W' | 'L'
  length: number
  /** The milestone band this crossing belongs to (3, 5, 7, 10 / 3, 5, 8). */
  milestone: number
}

export interface ThronePayload {
  category: 'THRONE'
  newLeaderTeamId: string
  displacedTeamId: string
  /** Weeks the displaced team held #1 before being knocked off. */
  heldFor: number
}

export interface CellarPayload {
  category: 'CELLAR'
  teamId: string
  ownsCount: number
  bleedingCount: number
  streakLength: number
  streakType: 'W' | 'L' | 'T'
}

export interface RacePayload {
  category: 'RACE'
  teamAId: string
  teamBId: string
  gap: number
  /** Distance from playoff cutline — 0 means at the seam. */
  distanceFromCutline: number
}

export interface IssuePayload {
  category: 'ISSUE'
  issueNumber: number
  week: number
  /** The team that anchored the recap — the issue's cover story team.
   *  V0 uses the recap-week's rank-1 team (the dominant story is
   *  almost always the leader). V1 swaps in a wider cover-story
   *  detector. Optional because Week 1 has no recap context. */
  coverTeamId?: string
  coverTeamName?: string
  /** Pre-stripped editorial name (emoji-clean) so render-beat doesn't
   *  have to depend on the team-name lookup. */
  coverTeamNameClean?: string
}

export interface BriefingPayload {
  category: 'BRIEFING'
  /** Day of week, 0 = Sunday ... 6 = Saturday. Drives copy variants
   *  ("Heading into Tuesday's slate" / "Final day of the week", etc.) */
  weekday: number
  /** Number of matchups currently live (status === 'live' or 'coasting'). */
  liveCount: number
  /** Number of matchups within a 1-cat / 10-pct-projection coin-flip
   *  band. The headline-grade number for a morning briefing. */
  coinFlipCount: number
  /** The closest live matchup, when available — surfaced as the
   *  "marquee" line in the body. */
  marqueeHomeTeamId?: string
  marqueeAwayTeamId?: string
}

export interface LivePayload {
  category: 'LIVE'
  homeTeamId: string
  awayTeamId: string
  /** Current cat-record at this snapshot. */
  homeCats: number
  awayCats: number
  /** Categories still in play. */
  contestedCount: number
  /** Projected win probability for home (0..1) — narrows the gap and
   *  drives the editorial framing ("coin flip" vs "slight edge"). */
  homeWinProb?: number
}

export interface HugeGamePayload {
  category: 'HUGE_GAME'
  playerId: string
  playerName: string
  position?: string
  mlbTeam?: string
  photoUrl?: string
  fantasyTeamId: string
  /** What triggered the threshold — drives variant copy. */
  trigger: 'multi-hr' | 'big-rbi' | 'cycle' | 'big-k' | 'no-hitter' | 'big-sv' | 'multi-cat' | 'multi-hit'
  day: string
  /** Display-ready stat line ("4-for-5, 2 HR, 6 RBI"). */
  headlineStats: string
  /** Raw stats for fine-grained body lines. */
  stats: Record<string, number>
}

export interface FreeAgentPayload {
  category: 'FREE_AGENT'
  playerId: string
  playerName: string
  position?: string
  mlbTeam?: string
  photoUrl?: string
  /** Same trigger taxonomy as HugeGame — drives variant copy. */
  trigger: HugeGamePayload['trigger']
  day: string
  headlineStats: string
  stats: Record<string, number>
}

export interface BenchBlunderPayload {
  category: 'BENCH_BLUNDER'
  playerId: string
  playerName: string
  position?: string
  mlbTeam?: string
  photoUrl?: string
  fantasyTeamId: string
  day: string
  /** Display-ready stat line of the benched player. */
  benchedStats: string
  /** The starter the manager used instead (may be unknown). */
  startedPlayerId?: string
  startedPlayerName?: string
  startedStats?: string
  /** Categories where the bench player out-produced the starter. */
  costSummary?: string
}

/* ─────────────────────────────────────────────────────────────────
   TIMESTAMP DERIVATION
   V0 has no event log, so we assign times that match the editorial
   shape of a week: matchup finals on Sunday night, throne / streak
   crossings Monday morning, race tracker / cellar continuous. The
   reader sees a coherent chronological feed even without persistence.
───────────────────────────────────────────────────────────────── */

const HOURS_BEFORE_MS = (h: number) => h * 60 * 60 * 1000
const DAYS_BEFORE_MS = (d: number) => d * 24 * 60 * 60 * 1000

function lastSundayNight(now: Date): Date {
  // Most fantasy weeks lock end-of-day Sunday. Use the *most recently
  // past* Sunday at 11:55 PM as the canonical "matchup final" time.
  const d = new Date(now)
  const day = d.getDay()              // 0 = Sun, 1 = Mon, ..., 6 = Sat
  const back = day === 0 ? 7 : day    // if Sunday, the *previous* one
  d.setDate(d.getDate() - back)
  d.setHours(23, 55, 0, 0)
  return d
}

function lastMonday(now: Date, hour: number, minute: number): Date {
  // The most recent Monday at the given hh:mm. Useful for "Monday
  // morning" rituals like Issue publish + Throne change.
  const d = new Date(now)
  const day = d.getDay()
  // Days back to reach Monday: Sun=6, Mon=0 (use 7 to mean "last week's
  // Monday" if today already past the hour we want), Tue=1, etc.
  const back = day === 0 ? 6 : day - 1
  d.setDate(d.getDate() - back)
  d.setHours(hour, minute, 0, 0)
  return d
}

/* ─────────────────────────────────────────────────────────────────
   DETECTORS
───────────────────────────────────────────────────────────────── */

/**
 * MATCHUP FINAL — one item per matchup in the prior week with
 * status='final'. Score the importance by margin: a sweep gets `high`,
 * a 1-cat win gets `low`.
 */
export function detectFinals(
  data: CategoryLeagueData,
  now: Date = new Date(),
): BeatItemSeed[] {
  const prev = data.matchupsPreviousWeek
  if (!prev || prev.length === 0) return []
  const ts = lastSundayNight(now)
  const out: BeatItemSeed[] = []
  const standingById = new Map<string, CategoryLeagueDataStanding>()
  for (const s of data.standings) standingById.set(s.teamId, s)

  for (const m of prev) {
    if (m.status !== 'final') continue
    // Pick winner from cat totals; skip if the matchup is a true tie.
    const homeWin = m.homeCatWins > m.awayCatWins
    const awayWin = m.awayCatWins > m.homeCatWins
    if (!homeWin && !awayWin) continue
    const winnerTeamId = homeWin ? m.homeTeamId : m.awayTeamId
    const loserTeamId = homeWin ? m.awayTeamId : m.homeTeamId
    const winnerCats = homeWin ? m.homeCatWins : m.awayCatWins
    const loserCats = homeWin ? m.awayCatWins : m.homeCatWins
    const margin = winnerCats - loserCats
    const importance: BeatImportance =
      margin >= 6 ? 'high' : margin >= 3 ? 'med' : 'low'
    // Stagger Sunday-night times by matchup id hash so the feed reads
    // chronologically rather than all-at-11:55 PM.
    const staggerMinutes = hashStagger(m.id, 0, 30)
    const itemTime = new Date(ts.getTime() - staggerMinutes * 60 * 1000)
    // Pull post-matchup context from standings so editorial bodies can
    // cite real facts (streak length, season record, current rank)
    // instead of leaning on generic platitudes.
    const winnerStanding = standingById.get(winnerTeamId)
    const loserStanding = standingById.get(loserTeamId)
    out.push({
      id: `FINAL:${m.id}`,
      category: 'FINAL',
      timestamp: itemTime,
      importance,
      payload: {
        category: 'FINAL',
        winnerTeamId,
        loserTeamId,
        winnerCats,
        loserCats,
        ties: m.ties,
        margin,
        winnerStreakType: winnerStanding?.streak.type,
        winnerStreakLength: winnerStanding?.streak.length,
        loserStreakType: loserStanding?.streak.type,
        loserStreakLength: loserStanding?.streak.length,
        winnerSeasonRecord: winnerStanding ? formatRecord(winnerStanding) : undefined,
        loserSeasonRecord: loserStanding ? formatRecord(loserStanding) : undefined,
        winnerRank: winnerStanding?.rank,
        loserRank: loserStanding?.rank,
      },
      signal: `final: ${winnerTeamId} ${winnerCats}-${loserCats} over ${loserTeamId}`,
    })
  }
  return out
}

function formatRecord(s: CategoryLeagueDataStanding): string {
  return s.catTies > 0
    ? `${s.catWins}-${s.catLosses}-${s.catTies}`
    : `${s.catWins}-${s.catLosses}`
}

/**
 * STREAK MILESTONE — fire when a standing's streak length crosses one
 * of the editorial thresholds (3, 5, 7, 10 for W; 3, 5, 8 for L). V0
 * fires the *current* milestone band — i.e. a team on W10 gets one
 * STREAK item now (for the 10 band). When persistence lands in V1 we'll
 * fire one event per crossing as they happen.
 */
// Streak milestones — only crossings that read as headline-worthy.
// Below W5 / L5 most teams in a typical 10-12 team league have an
// active streak at any moment, so a W3/L3 floor would crowd the feed
// with low-stakes signal. Raised so the Beat only flags genuinely
// notable runs.
const WIN_MILESTONES = [10, 7, 5]
const LOSS_MILESTONES = [8, 5]

export function detectStreaks(
  data: CategoryLeagueData,
  now: Date = new Date(),
): BeatItemSeed[] {
  const baseTs = lastMonday(now, 7, 0)
  const out: BeatItemSeed[] = []
  for (const s of data.standings) {
    if (s.streak.type === 'T' || s.streak.length === 0) continue
    const ladder = s.streak.type === 'W' ? WIN_MILESTONES : LOSS_MILESTONES
    const milestone = ladder.find((m) => s.streak.length >= m)
    if (!milestone) continue
    const importance: BeatImportance =
      milestone >= 8 ? 'high' : milestone >= 5 ? 'med' : 'low'
    // Stagger across 7:00-7:25 AM so multiple crossings read as a
    // sequence of events rather than a clump at one minute. The hash
    // keys off the seed id so the order is stable across re-renders.
    const seedKey = `STREAK:${s.teamId}:${s.streak.type}${milestone}`
    const offsetMinutes = hashStagger(seedKey, 0, 26)
    const itemTime = new Date(baseTs.getTime() + offsetMinutes * 60 * 1000)
    out.push({
      id: seedKey,
      category: 'STREAK',
      timestamp: itemTime,
      importance,
      payload: {
        category: 'STREAK',
        teamId: s.teamId,
        streakType: s.streak.type,
        length: s.streak.length,
        milestone,
      },
      signal: `streak: ${s.teamId} ${s.streak.type}${s.streak.length} (band ${milestone})`,
    })
  }
  return out
}

/**
 * THRONE CHANGE — fire when this week's #1 differs from last week's #1.
 * Uses seasonRankHistory's last two weeks. Heldfor = consecutive weeks
 * the displaced team held #1 before the change.
 */
export function detectThrone(
  data: CategoryLeagueData,
  now: Date = new Date(),
): BeatItemSeed[] {
  const hist = data.seasonRankHistory
  if (hist.length < 2) return []
  const lastWeek = hist[hist.length - 1]
  const prevWeek = hist[hist.length - 2]
  const currentTop = findRankOne(lastWeek.ranks)
  const previousTop = findRankOne(prevWeek.ranks)
  if (!currentTop || !previousTop || currentTop === previousTop) return []
  // Count back: how many weeks did the displaced team hold #1?
  let heldFor = 0
  for (let i = hist.length - 2; i >= 0; i--) {
    if (findRankOne(hist[i].ranks) === previousTop) heldFor++
    else break
  }
  const ts = lastMonday(now, 7, 15)
  return [{
    id: `THRONE:${currentTop}:over:${previousTop}`,
    category: 'THRONE',
    timestamp: ts,
    importance: heldFor >= 4 ? 'high' : 'med',
    payload: {
      category: 'THRONE',
      newLeaderTeamId: currentTop,
      displacedTeamId: previousTop,
      heldFor,
    },
    signal: `throne change: ${currentTop} takes top from ${previousTop} (held ${heldFor}w)`,
  }]
}

/**
 * CELLAR LOCK — bottom team has zero owns OR a multi-week losing streak
 * OR a deep bleed count. Same logic as the Issue's cellar callout, but
 * surfaced as a daily Beat item when the slide is genuine.
 */
export function detectCellar(
  data: CategoryLeagueData,
  now: Date = new Date(),
): BeatItemSeed[] {
  if (data.standings.length < 4) return []
  const sorted = [...data.standings].sort((a, b) => b.rank - a.rank)
  const last = sorted[0]
  const lStreak = last.streak.type === 'L' ? last.streak.length : 0
  const cold = last.ownsCount === 0 || lStreak >= 4 || last.bleedingCount >= 5
  if (!cold) return []
  // Cellar at 7:40 AM — after streak crossings (7:00-7:25) so the
  // chronology reads streaks-first, cellar-as-recap.
  const ts = lastMonday(now, 7, 40)
  return [{
    id: `CELLAR:${last.teamId}`,
    category: 'CELLAR',
    timestamp: ts,
    importance: lStreak >= 6 || last.bleedingCount >= 7 ? 'high' : 'med',
    payload: {
      category: 'CELLAR',
      teamId: last.teamId,
      ownsCount: last.ownsCount,
      bleedingCount: last.bleedingCount,
      streakLength: last.streak.length,
      streakType: last.streak.type,
    },
    signal: `cellar lock: ${last.teamId} (${lStreak} L-streak, ${last.bleedingCount} bleeds, ${last.ownsCount} owns)`,
  }]
}

/**
 * TIGHTEST RACE TRACKER — adjacent standings within a thin cat margin,
 * weighted toward seams near the playoff cutoff. Mirrors the Issue's
 * quick-reads detector so a tight race surfaces in both surfaces.
 */
export function detectRace(
  data: CategoryLeagueData,
  now: Date = new Date(),
): BeatItemSeed[] {
  if (data.standings.length < 2) return []
  const cutoff = data.playoffCutoff || Math.max(1, Math.floor(data.teams.length / 2))
  const byRank = [...data.standings].sort((a, b) => a.rank - b.rank)
  let best: { a: CategoryLeagueDataStanding; b: CategoryLeagueDataStanding; gap: number; dist: number } | null = null
  let bestScore = Infinity
  for (let i = 0; i < byRank.length - 1; i++) {
    const a = byRank[i]
    const b = byRank[i + 1]
    const gap = Math.abs(a.catWins - b.catWins)
    const dist = Math.abs((a.rank + 0.5) - (cutoff + 0.5))
    const score = gap + dist * 0.8
    if (score < bestScore) {
      bestScore = score
      best = { a, b, gap, dist }
    }
  }
  if (!best) return []
  // Only worth surfacing as a Beat item if the race is genuinely tight.
  if (best.gap > 2) return []
  // Race tracker is "now" — fires continuously, not at the week boundary.
  return [{
    id: `RACE:${best.a.teamId}:${best.b.teamId}`,
    category: 'RACE',
    timestamp: new Date(now.getTime() - HOURS_BEFORE_MS(2)),
    importance: best.gap === 0 ? 'high' : 'med',
    payload: {
      category: 'RACE',
      teamAId: best.a.teamId,
      teamBId: best.b.teamId,
      gap: best.gap,
      distanceFromCutline: best.dist,
    },
    signal: `race: ${best.a.teamId} vs ${best.b.teamId} (gap ${best.gap}, cutline-dist ${best.dist.toFixed(1)})`,
  }]
}

/**
 * ISSUE PUBLISHED — a deterministic "the latest issue dropped" marker
 * at Monday 11 AM. V0 always emits one for the current week; V1 will
 * read from the persisted issue archive so a missed Monday doesn't lie.
 */
export function detectIssue(
  data: CategoryLeagueData,
  now: Date = new Date(),
): BeatItemSeed[] {
  // The Monday issue is a RECAP of the just-finished week, so the
  // number that appears on the cover is currentWeek - 1. (Without
  // the subtract, the Beat would announce "Issue 11 published" while
  // Week 11 is still in progress — publishing an issue about an
  // unfinished week.) Skip when the league is in week 1 (no prior
  // week to recap yet).
  const issueNumber = data.currentWeek - 1
  if (issueNumber < 1) return []
  const ts = lastMonday(now, 11, 0)
  // If "last Monday" is in the future relative to now (i.e. today IS
  // Monday before 11 AM), skip the item — the issue hasn't dropped yet.
  if (ts.getTime() > now.getTime()) return []
  // Cover team = the standings leader at issue-publish time. This is
  // the dominant editorial angle in most weeks (a leader extending,
  // or a leader who just took over). V1 will swap in a wider
  // cover-story detector that also surfaces throne changes, wild
  // arcs, etc.
  const leader = data.standings.find((s) => s.rank === 1)
  const leaderTeam = leader ? data.teams.find((t) => t.id === leader.teamId) : undefined
  const coverTeamName = leaderTeam?.name
  const coverTeamNameClean = coverTeamName
    ? (stripEmojiForEditorialLite(coverTeamName) || coverTeamName)
    : undefined
  return [{
    id: `ISSUE:${issueNumber}`,
    category: 'ISSUE',
    timestamp: ts,
    importance: 'med',
    payload: {
      category: 'ISSUE',
      issueNumber,
      week: issueNumber,
      coverTeamId: leader?.teamId,
      coverTeamName,
      coverTeamNameClean,
    },
    signal: `issue published: #${issueNumber}, cover=${leaderTeam?.id ?? 'none'}`,
  }]
}

/** Minimal emoji strip, copied here to avoid importing render layer
 *  from detect layer. Mirrors stripEmojiForEditorial behavior. */
function stripEmojiForEditorialLite(s: string): string {
  if (!s) return s
  try {
    return s.replace(/\p{Extended_Pictographic}/gu, '').replace(/\s+/g, ' ').trim()
  } catch {
    return s
  }
}

/**
 * MORNING BRIEFING — fires daily at 7:00 AM with a one-line preview
 * of the day's slate. Skipped on Monday because Monday already runs
 * heavy with Issue + Streak + Throne items; the briefing would compete
 * with content the reader actually wants.
 *
 * The body reads from `matchupsCurrentWeek` to count live matchups
 * and coin-flip-band ones. With no current-week matchup data, no
 * briefing fires (better silent than empty).
 */
export function detectBriefing(
  data: CategoryLeagueData,
  now: Date = new Date(),
): BeatItemSeed[] {
  const current = data.matchupsCurrentWeek
  if (!current || current.length === 0) return []
  // Brief at 7:00 AM today. Skip if it's still pre-briefing morning.
  const ts = new Date(now)
  ts.setHours(7, 0, 0, 0)
  if (ts.getTime() > now.getTime()) return []
  const isMondayMorning = ts.getDay() === 1
  // Count live, coin-flip, and upcoming matchups.
  let liveCount = 0
  let coinFlipCount = 0
  let upcomingCount = 0
  let closestMatchup: typeof current[number] | null = null
  let closestDistance = Infinity
  for (const m of current) {
    if (m.status === 'live' || m.status === 'coasting') liveCount++
    if (m.status === 'upcoming') upcomingCount++
    const prob = m.homeWinProb
    if (typeof prob === 'number') {
      const dist = Math.abs(prob - 0.5)
      if (dist <= 0.12) coinFlipCount++
      if (dist < closestDistance) {
        closestDistance = dist
        closestMatchup = m
      }
    } else {
      // No projection — use raw cat-margin as a rough proxy.
      const margin = Math.abs(m.homeCatWins - m.awayCatWins)
      if (margin <= 1 && m.status !== 'final') coinFlipCount++
    }
  }
  // Decide whether to fire:
  //   - Monday morning with an upcoming slate → fire the "slate is
  //     set" briefing (gives the wire a real opening item on slow-
  //     start days instead of just STREAK/CELLAR carryover).
  //   - Any weekday with live or coin-flip matchups → existing
  //     live-action briefing.
  //   - Otherwise nothing to brief about — silent.
  const fireMondaySlate = isMondayMorning && upcomingCount > 0 && liveCount === 0
  const fireLive = liveCount > 0 || coinFlipCount > 0
  if (!fireMondaySlate && !fireLive) return []
  // Importance: live action with multiple coin flips bumps to med;
  // everything else stays low so it sits below the editorial items.
  const importance: BeatImportance =
    coinFlipCount >= 3 ? 'med' : 'low'
  return [{
    id: `BRIEFING:${dayKeyForBriefing(ts)}`,
    category: 'BRIEFING',
    timestamp: ts,
    importance,
    payload: {
      category: 'BRIEFING',
      weekday: ts.getDay(),
      liveCount,
      coinFlipCount,
      marqueeHomeTeamId: closestMatchup?.homeTeamId,
      marqueeAwayTeamId: closestMatchup?.awayTeamId,
    },
    signal: `briefing: ${liveCount} live, ${coinFlipCount} coin flips, ${upcomingCount} upcoming, marquee ${closestMatchup?.id ?? 'none'}`,
  }]
}

/**
 * LIVE TRACKER — surfaces in-progress matchups that are close enough
 * to be interesting. Fires one item per close matchup, timestamped
 * around midday so it sits between the morning briefing and any
 * evening result. Skips matchups already final.
 */
export function detectLive(
  data: CategoryLeagueData,
  now: Date = new Date(),
): BeatItemSeed[] {
  const current = data.matchupsCurrentWeek
  if (!current || current.length === 0) return []
  // Midday today; stagger per matchup so multiple live items read
  // as a sequence (12:30-1:45 PM range).
  const baseTs = new Date(now)
  baseTs.setHours(12, 30, 0, 0)
  // Don't surface live items before midday (the morning briefing
  // already covers the upcoming slate).
  if (baseTs.getTime() > now.getTime()) return []
  const out: BeatItemSeed[] = []
  for (const m of current) {
    if (m.status === 'final' || m.status === 'upcoming') continue
    const margin = Math.abs(m.homeCatWins - m.awayCatWins)
    const probDist =
      typeof m.homeWinProb === 'number'
        ? Math.abs(m.homeWinProb - 0.5)
        : 0.5
    // Only surface genuinely close matchups — within 2 cats AND the
    // projection is in coin-flip territory (or no projection available).
    if (margin > 2 || probDist > 0.18) continue
    const offsetMinutes = hashStagger(m.id, 0, 75)
    const itemTime = new Date(baseTs.getTime() + offsetMinutes * 60 * 1000)
    // Surface from the leader's POV so the headline names "edge" not "tie".
    const homeLeads = m.homeCatWins >= m.awayCatWins
    const homeCats = homeLeads ? m.homeCatWins : m.awayCatWins
    const awayCats = homeLeads ? m.awayCatWins : m.homeCatWins
    const homeTeamId = homeLeads ? m.homeTeamId : m.awayTeamId
    const awayTeamId = homeLeads ? m.awayTeamId : m.homeTeamId
    const homeWinProb =
      typeof m.homeWinProb === 'number'
        ? homeLeads
          ? m.homeWinProb
          : 1 - m.homeWinProb
        : undefined
    out.push({
      id: `LIVE:${m.id}`,
      category: 'LIVE',
      timestamp: itemTime,
      importance: probDist <= 0.05 ? 'med' : 'low',
      payload: {
        category: 'LIVE',
        homeTeamId,
        awayTeamId,
        homeCats,
        awayCats,
        contestedCount: m.contestedCount,
        homeWinProb,
      },
      signal: `live: ${homeTeamId} ${homeCats}-${awayCats} vs ${awayTeamId} (${m.contestedCount} contested)`,
    })
  }
  return out
}

function dayKeyForBriefing(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

/* ─────────────────────────────────────────────────────────────────
   PLAYER EVENTS — HUGE_GAME + BENCH_BLUNDER

   Phase 1 wiring: these detectors consume `data.playerNights[]`
   (populated by the MLB Stats API pipeline in buildPlayerNights —
   already live for Yahoo + ESPN + Sleeper). The earlier scope doc
   imagined a brand-new `playerPerformances` shape that would need a
   custom Yahoo per-day-roster fetch (13-16hr spike). The shortcut:
   PlayerNight already carries everything HUGE_GAME needs, plus
   `myBenchedPlayers` already tracks the viewer's bench, so we get
   the viewer-side BENCH_BLUNDER for free.

   What's still deferred to Phase 2 (the full spike): cross-league
   bench blunders ("Goof Juice benched Bichette"). That requires
   per-team per-day roster fetches we don't have yet. The detector
   skips that case until the data lands.
───────────────────────────────────────────────────────────────── */

/** Classify the editorial trigger + importance from a PlayerNight. */
function classifyNight(
  n: NonNullable<CategoryLeagueData['playerNights']>[number],
): { trigger: HugeGamePayload['trigger']; importance: BeatImportance } | null {
  if (n.pitching) {
    const p = n.pitching
    if (p.noHitter || p.perfectGame) return { trigger: 'no-hitter', importance: 'high' }
    // Complete games are rare enough in modern baseball to be
    // headline-worthy on their own, even without a K threshold.
    if (p.completeGame) return { trigger: 'big-k', importance: 'high' }
    if (p.strikeouts >= 13) return { trigger: 'big-k', importance: 'high' }
    if (p.strikeouts >= 10) return { trigger: 'big-k', importance: 'high' }
    // Saves were firing on every closer outing — a 1-IP / 1-K save is
    // the closer's normal day, not a HUGE GAME. Tighten to multi-K
    // dominant closes OR a multi-inning hold of the lead (rare).
    if (p.decision === 'S' && (p.strikeouts >= 3 || p.inningsPitched >= 2)) {
      return { trigger: 'big-sv', importance: 'med' }
    }
    return null
  }
  if (n.hitting) {
    const h = n.hitting
    if (h.homeRuns >= 2 && h.rbi >= 5) return { trigger: 'multi-cat', importance: 'high' }
    if (h.homeRuns >= 3) return { trigger: 'multi-hr', importance: 'high' }
    if (h.homeRuns >= 2) return { trigger: 'multi-hr', importance: 'med' }
    if (h.rbi >= 5) return { trigger: 'big-rbi', importance: 'med' }
    if (h.hits >= 4) return { trigger: 'multi-hit', importance: 'med' }
    return null
  }
  return null
}

/** Project a PlayerNight's stats into the flat Record<string, number>
 *  shape HugeGamePayload uses, so the renderer's variant pool can
 *  read `stats.HR`, `stats.K`, etc. without knowing about the night
 *  shape. Hitting-only and pitching-only nights map cleanly; two-way
 *  nights (Ohtani) merge both. */
function nightToStatRecord(
  n: NonNullable<CategoryLeagueData['playerNights']>[number],
): Record<string, number> {
  const out: Record<string, number> = {}
  if (n.hitting) {
    out.AB = n.hitting.atBats
    out.H = n.hitting.hits
    out.HR = n.hitting.homeRuns
    out.RBI = n.hitting.rbi
    out.R = n.hitting.runs
    out.SB = n.hitting.stolenBases
    out.BB = n.hitting.walks
  }
  if (n.pitching) {
    out.IP = n.pitching.inningsPitched
    out.K = n.pitching.strikeouts
    out.ER = n.pitching.earnedRuns
    out.HA = n.pitching.hits
    out.BB = (out.BB ?? 0) + n.pitching.walks
    if (n.pitching.decision === 'S') out.SV = 1
    if (n.pitching.decision === 'W') out.W = 1
  }
  return out
}

/**
 * HUGE GAME — fires per (notable PlayerNight × team that owns the
 * player). One night with two fantasy owners produces two items so
 * each owning manager sees their own copy in the wire.
 *
 * Silent when no playerNights are present (non-MLB or pre-spike
 * adapter). Free agents (unowned notable performers) are intentionally
 * skipped — the wire prioritizes "your guy did X" over league gossip.
 */
export function detectHugeGames(
  data: CategoryLeagueData,
  now: Date = new Date(),
): BeatItemSeed[] {
  const nights = data.playerNights
  if (!nights || nights.length === 0) return []
  const myTeamId = data.teams.find((t) => t.isMyTeam)?.id
  const benchedKeys = data.myBenchedPlayers
  const dailyRosters = data.dailyRosters
  // Phase 2 dedupe index: (teamId:day) → set of benched normalized
  // names from the actual game day. This is the precise signal —
  // a player benched yesterday by Team X covers Team X's HUGE_GAME
  // for that night. The earlier code only checked today's
  // myBenchedPlayers, which silently suppressed HUGE_GAMEs for
  // players moved between bench-and-starter across days. Bug
  // surface: Duran started yesterday but on viewer's bench today
  // → no BLUNDER (started yesterday), no HUGE_GAME (suppressed by
  // today's bench check). Both items lost.
  const benchIndexByTeamDay = new Map<string, Set<string>>()
  if (dailyRosters && dailyRosters.length > 0) {
    for (const r of dailyRosters) {
      benchIndexByTeamDay.set(`${r.teamId}:${r.day}`, new Set(r.benched))
    }
  }
  const out: BeatItemSeed[] = []
  for (const night of nights) {
    const verdict = classifyNight(night)
    if (!verdict) continue
    // Skip free agents — playerNights includes them for league-wide
    // gossip surfaces (the Wire's standalone player cards), but The
    // Beat is league-rostered ownership. No owner means no fantasy
    // story to tell.
    if (night.ownedByTeamIds.length === 0) continue
    const stats = nightToStatRecord(night)
    const headlineStats = formatNightStats(night)
    const photoUrl = playerHeadshotUrl({
      platform: 'espn', // MLB branch in playerHeadshotUrl ignores platform
      sport: 'mlb',
      playerId: night.mlbId,
    }) ?? undefined
    // 8 PM local on the game day, hash-staggered per (player,team) so
    // multiple HUGE_GAMEs in one night don't stack at the same minute.
    const day = new Date(`${night.gameDate}T20:00:00`)
    const tsBase = isNaN(day.getTime()) ? now : day
    const nameKey = normalizeName(night.name)
    for (const teamId of night.ownedByTeamIds) {
      // Dedup: if BENCH_BLUNDER will fire for this exact
      // (team, player, night), skip the HUGE_GAME to avoid two
      // items about the same story. Two paths:
      //   - Phase 2 (cross-team): consult the precise per-team
      //     per-day bench from dailyRosters.
      //   - Phase 1 (viewer-only fallback): consult today's
      //     myBenchedPlayers, restricted to the viewer's team.
      let willFireBenchBlunder = false
      if (benchIndexByTeamDay.size > 0) {
        const benchSet = benchIndexByTeamDay.get(`${teamId}:${night.gameDate}`)
        willFireBenchBlunder = benchSet?.has(nameKey) === true
      } else if (
        teamId === myTeamId &&
        benchedKeys != null &&
        benchedKeys.has(nameKey)
      ) {
        willFireBenchBlunder = true
      }
      if (willFireBenchBlunder) continue
      const offsetMinutes = hashStagger(`${night.mlbId}:${teamId}`, 0, 90)
      const ts = new Date(tsBase.getTime() - offsetMinutes * 60 * 1000)
      out.push({
        id: `HUGE_GAME:${teamId}:${night.mlbId}:${night.gameDate}`,
        category: 'HUGE_GAME',
        timestamp: ts,
        importance: verdict.importance,
        payload: {
          category: 'HUGE_GAME',
          playerId: String(night.mlbId),
          playerName: night.name,
          position: night.position,
          mlbTeam: night.mlbTeam,
          photoUrl,
          fantasyTeamId: teamId,
          trigger: verdict.trigger,
          day: night.gameDate,
          headlineStats,
          stats,
        },
        signal: `huge game: ${night.name} for ${teamId} (${verdict.trigger})`,
      })
    }
  }
  return out
}

/**
 * FREE AGENT — fires per UNOWNED PlayerNight that clears the HIGH
 * importance threshold (3+ HR, 12+ K, no-hitter, multi-cat). The
 * editorial story is "a guy on waivers just did something rare —
 * heads up." We deliberately keep the bar high so the wire doesn't
 * drown in routine FA notable nights (4-hit games, single saves).
 *
 * Silent when no playerNights are present. No team attribution
 * (fantasyTeamId is omitted) — the widget renders just the player
 * photo with no owning-team avatar.
 */
export function detectFreeAgents(
  data: CategoryLeagueData,
  now: Date = new Date(),
): BeatItemSeed[] {
  const nights = data.playerNights
  if (!nights || nights.length === 0) return []
  const out: BeatItemSeed[] = []
  for (const night of nights) {
    // Owned players go through HUGE_GAME / BENCH_BLUNDER. Free
    // agents only reach this path.
    if (night.ownedByTeamIds.length > 0) continue
    const verdict = classifyNight(night)
    if (!verdict) continue
    // Strict gate: only HIGH importance gets a FREE_AGENT item.
    // That keeps the bar at no-hitters, 3+ HR games, 12+ K starts,
    // and the 2 HR + 5 RBI multi-cat lines. A 4-hit FA day stays
    // off the wire — those happen too often to be news.
    if (verdict.importance !== 'high') continue
    const stats = nightToStatRecord(night)
    const headlineStats = formatNightStats(night)
    const photoUrl = playerHeadshotUrl({
      platform: 'espn', // MLB branch in playerHeadshotUrl ignores platform
      sport: 'mlb',
      playerId: night.mlbId,
    }) ?? undefined
    // 8 PM local on the game day, hash-staggered per player so
    // multiple FA stories on the same night don't clump.
    const day = new Date(`${night.gameDate}T20:00:00`)
    const tsBase = isNaN(day.getTime()) ? now : day
    const offsetMinutes = hashStagger(`fa:${night.mlbId}`, 0, 90)
    const ts = new Date(tsBase.getTime() - offsetMinutes * 60 * 1000)
    out.push({
      id: `FREE_AGENT:${night.mlbId}:${night.gameDate}`,
      category: 'FREE_AGENT',
      timestamp: ts,
      // Cap at 'med' — even a no-hitter by a FA is news, not a
      // story about anyone's team. Keeps FA items out of the
      // day's featured-lead slot (reserved for owned-player drama
      // and decisive matchups).
      importance: 'med',
      payload: {
        category: 'FREE_AGENT',
        playerId: String(night.mlbId),
        playerName: night.name,
        position: night.position,
        mlbTeam: night.mlbTeam,
        photoUrl,
        trigger: verdict.trigger,
        day: night.gameDate,
        headlineStats,
        stats,
      },
      signal: `free agent: ${night.name} (${verdict.trigger})`,
    })
  }
  return out
}

/**
 * BENCH BLUNDER — fires when a notable performance came from a
 * player who was benched on the responsible team that game day.
 *
 * Two paths depending on data availability:
 *
 * CROSS-TEAM (Phase 2): when data.dailyRosters has per-team per-day
 * snapshots for the current week, fires for every team in the
 * league. "Goof Juice benched Bichette: 3-for-4, 2 HR, 6 RBI."
 *
 * VIEWER-ONLY (Phase 1 fallback): when daily rosters aren't loaded
 * yet, only the viewer's own bench is checked via
 * data.myBenchedPlayers. Lazy background fetch swaps to cross-team
 * mid-session when it completes.
 *
 * Silent when no PlayerNights are present at all.
 */
export function detectBenchBlunders(
  data: CategoryLeagueData,
  _now: Date = new Date(),
): BeatItemSeed[] {
  const nights = data.playerNights
  if (!nights || nights.length === 0) return []
  const dailyRosters = data.dailyRosters
  if (dailyRosters && dailyRosters.length > 0) {
    return detectCrossTeamBenchBlunders(data, nights, dailyRosters)
  }
  return detectViewerBenchBlunders(data, nights)
}

/** Phase 1 path: viewer-side only via myBenchedPlayers. */
function detectViewerBenchBlunders(
  data: CategoryLeagueData,
  nights: NonNullable<CategoryLeagueData['playerNights']>,
): BeatItemSeed[] {
  const benchedKeys = data.myBenchedPlayers
  if (!benchedKeys || benchedKeys.size === 0) return []
  const myTeamId = data.teams.find((t) => t.isMyTeam)?.id
  if (!myTeamId) return []
  const out: BeatItemSeed[] = []
  for (const night of nights) {
    const verdict = classifyNight(night)
    if (!verdict) continue
    if (!night.ownedByTeamIds.includes(myTeamId)) continue
    const nameKey = normalizeName(night.name)
    if (!benchedKeys.has(nameKey)) continue
    out.push(makeBenchBlunderSeed(night, verdict, myTeamId))
  }
  return out
}

/** Phase 2 path: cross-team via daily roster snapshots. For each
 *  (team, day) pair in the cache, find benched players who had
 *  notable nights. Emit one BENCH_BLUNDER per (team, player, day).
 *
 *  Cap the daily volume so the wire doesn't drown when many teams
 *  bench notable performers on the same day — keep the top 5
 *  blunders per day ranked by importance + trigger weight. */
function detectCrossTeamBenchBlunders(
  data: CategoryLeagueData,
  nights: NonNullable<CategoryLeagueData['playerNights']>,
  rosters: NonNullable<CategoryLeagueData['dailyRosters']>,
): BeatItemSeed[] {
  // Build a (team, day) → bench-name-set index for fast lookups.
  const benchIndex = new Map<string, Set<string>>()
  const starterIndex = new Map<string, Set<string>>()
  for (const r of rosters) {
    const key = `${r.teamId}:${r.day}`
    benchIndex.set(key, new Set(r.benched))
    starterIndex.set(key, new Set(r.started))
  }
  // Candidate seeds before per-day capping.
  type Candidate = {
    seed: BeatItemSeed
    triggerWeight: number
  }
  const candidates: Candidate[] = []
  for (const night of nights) {
    const verdict = classifyNight(night)
    if (!verdict) continue
    const nameKey = normalizeName(night.name)
    // Check every team that owns the player. With cross-team data
    // we don't restrict to the viewer's team. A player owned by
    // multiple teams (free-agent edge case) wouldn't happen in a
    // normal league, but the loop handles it correctly.
    for (const teamId of night.ownedByTeamIds) {
      const key = `${teamId}:${night.gameDate}`
      const benchSet = benchIndex.get(key)
      // No daily-roster row for this team/day yet — skip rather than
      // false-fire. Background fetch may fill it on next refresh.
      if (!benchSet) continue
      if (!benchSet.has(nameKey)) continue
      // Edge case: same player listed in both started and benched
      // (data quality issue). Skip — can't tell which side fired.
      const starterSet = starterIndex.get(key)
      if (starterSet?.has(nameKey)) continue
      const seed = makeBenchBlunderSeed(night, verdict, teamId)
      candidates.push({ seed, triggerWeight: triggerWeight(verdict.trigger) })
    }
  }
  // Cap to 5 per day, ranked by importance band + trigger weight.
  // Without this cap, a big Sunday slate could surface 15 bench-
  // blunders and crowd out everything else.
  const byDay = new Map<string, Candidate[]>()
  for (const c of candidates) {
    const day = c.seed.timestamp.toISOString().slice(0, 10)
    const arr = byDay.get(day) ?? []
    arr.push(c)
    byDay.set(day, arr)
  }
  const out: BeatItemSeed[] = []
  for (const [, arr] of byDay) {
    arr.sort((a, b) => {
      const ai = a.seed.importance === 'high' ? 2 : a.seed.importance === 'med' ? 1 : 0
      const bi = b.seed.importance === 'high' ? 2 : b.seed.importance === 'med' ? 1 : 0
      if (bi !== ai) return bi - ai
      return b.triggerWeight - a.triggerWeight
    })
    for (const c of arr.slice(0, 5)) out.push(c.seed)
  }
  return out
}

/** Trigger rarity weighting used by the cross-team cap to keep the
 *  best stories on the wire. No-hitters and multi-HR games beat
 *  4-hit days when we have to drop items. */
function triggerWeight(t: HugeGamePayload['trigger']): number {
  switch (t) {
    case 'no-hitter':  return 100
    case 'multi-cat':  return 90
    case 'multi-hr':   return 80
    case 'big-k':      return 70
    case 'big-rbi':    return 50
    case 'multi-hit':  return 40
    case 'big-sv':     return 30
    case 'cycle':      return 95
    default:           return 10
  }
}

/** Build a BENCH_BLUNDER seed for the given (night, team) combo.
 *  Shared by viewer-only and cross-team paths so the payload shape
 *  stays consistent. */
function makeBenchBlunderSeed(
  night: NonNullable<CategoryLeagueData['playerNights']>[number],
  verdict: { trigger: HugeGamePayload['trigger']; importance: BeatImportance },
  fantasyTeamId: string,
): BeatItemSeed {
  const stats = nightToStatRecord(night)
  const benchedStats = formatNightStats(night)
  // Importance: bench-blunder framing makes the story feel bigger
  // than a vanilla HUGE_GAME — bump med-importance multi-HRs to
  // high when 3+ HR.
  const importance: BeatImportance =
    verdict.importance === 'high' || (night.hitting?.homeRuns ?? 0) >= 3
      ? 'high'
      : 'med'
  const day = new Date(`${night.gameDate}T22:00:00`)
  const ts = isNaN(day.getTime()) ? new Date() : day
  const photoUrl = playerHeadshotUrl({
    platform: 'espn', // MLB branch in playerHeadshotUrl ignores platform
    sport: 'mlb',
    playerId: night.mlbId,
  }) ?? undefined
  return {
    id: `BENCH_BLUNDER:${fantasyTeamId}:${night.mlbId}:${night.gameDate}`,
    category: 'BENCH_BLUNDER',
    timestamp: ts,
    importance,
    payload: {
      category: 'BENCH_BLUNDER',
      playerId: String(night.mlbId),
      playerName: night.name,
      position: night.position,
      mlbTeam: night.mlbTeam,
      photoUrl,
      fantasyTeamId,
      day: night.gameDate,
      benchedStats,
      // Phase 2 future: pull the actual starter at the same
      // position from startersByPosition. For now leave undefined —
      // the variant pool gates "started X over Y" on presence.
      startedPlayerId: undefined,
      startedPlayerName: undefined,
      startedStats: undefined,
      costSummary: deriveCostSummary(stats),
    },
    signal: `bench blunder: ${night.name} on ${fantasyTeamId} bench (${verdict.trigger})`,
  }
}

/** A compact stat-line cost summary for the BENCH_BLUNDER body line.
 *  Phase 1 reads only from the bench player's actual stats since we
 *  don't have the starter's line yet. Phase 2 will subtract starter
 *  production for a true "cost" delta. */
function deriveCostSummary(stats: Record<string, number>): string | undefined {
  const pieces: string[] = []
  if ((stats.HR ?? 0) > 0) pieces.push(`${stats.HR} HR`)
  if ((stats.RBI ?? 0) >= 3) pieces.push(`${stats.RBI} RBI`)
  if ((stats.SB ?? 0) >= 2) pieces.push(`${stats.SB} SB`)
  if ((stats.K ?? 0) >= 8) pieces.push(`${stats.K} K`)
  if (pieces.length === 0) return undefined
  return `Cost: ${pieces.join(', ')}`
}


/* ─────────────────────────────────────────────────────────────────
   COMPOSITION
───────────────────────────────────────────────────────────────── */

/**
 * Run every detector against the league data and return all seeds
 * sorted by timestamp descending (newest first). The renderer takes
 * over from here.
 */
export function detectBeat(
  data: CategoryLeagueData,
  now: Date = new Date(),
): BeatItemSeed[] {
  const all: BeatItemSeed[] = [
    ...detectFinals(data, now),
    ...detectStreaks(data, now),
    ...detectThrone(data, now),
    ...detectCellar(data, now),
    ...detectRace(data, now),
    ...detectIssue(data, now),
    ...detectBriefing(data, now),
    ...detectLive(data, now),
    ...detectHugeGames(data, now),
    ...detectBenchBlunders(data, now),
    ...detectFreeAgents(data, now),
  ]
  return all.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
}

/* ─────────────────────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────────────────────── */

function findRankOne(ranks: Record<string, number>): string | undefined {
  for (const [teamId, r] of Object.entries(ranks)) {
    if (r === 1) return teamId
  }
  return undefined
}

/**
 * Small deterministic hash of a string -> integer in [min, max). Used
 * to stagger same-timestamp events (e.g. multiple matchup finals on
 * the same Sunday night) so the feed reads as a sequence rather than
 * a clump.
 */
function hashStagger(seed: string, min: number, max: number): number {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) {
    h = (h ^ seed.charCodeAt(i)) >>> 0
    h = Math.imul(h, 16777619) >>> 0
  }
  const range = max - min
  return min + (h % range)
}

