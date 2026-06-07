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
  // Brief at 7:00 AM today. Skip if it's still pre-briefing morning,
  // or if today is Monday (heavy day already).
  const ts = new Date(now)
  ts.setHours(7, 0, 0, 0)
  if (ts.getTime() > now.getTime()) return []
  if (ts.getDay() === 1) return []
  // Count the live and coin-flip matchups.
  let liveCount = 0
  let coinFlipCount = 0
  let closestMatchup: typeof current[number] | null = null
  let closestDistance = Infinity
  for (const m of current) {
    if (m.status === 'live' || m.status === 'coasting') liveCount++
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
  // Only fire if there's something to brief about. An empty wire would
  // be worse than no item.
  if (liveCount === 0 && coinFlipCount === 0) return []
  return [{
    id: `BRIEFING:${dayKeyForBriefing(ts)}`,
    category: 'BRIEFING',
    timestamp: ts,
    importance: coinFlipCount >= 3 ? 'med' : 'low',
    payload: {
      category: 'BRIEFING',
      weekday: ts.getDay(),
      liveCount,
      coinFlipCount,
      marqueeHomeTeamId: closestMatchup?.homeTeamId,
      marqueeAwayTeamId: closestMatchup?.awayTeamId,
    },
    signal: `briefing: ${liveCount} live, ${coinFlipCount} coin flips, marquee ${closestMatchup?.id ?? 'none'}`,
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
   These detectors need adapter data the V0 platform integrations
   don't yet surface (see docs/player-events-scope.md for the spike
   plan). When `players` + `playerPerformances` are absent, the
   detectors return [] silently — the Beat feed renders the rest of
   the categories unaffected.
───────────────────────────────────────────────────────────────── */

/** Thresholds for editorial "huge game" classification per stat. The
 *  bar is set high enough that league-wide it's a once-per-week-ish
 *  event for any given team — too noisy at lower thresholds. */
const HUGE_GAME_THRESHOLDS = {
  HR: 3,           // 3+ HR = headline territory
  RBI: 5,          // 5+ RBI = "went off"
  H: 5,            // 5+ hits = monster day
  K: 10,           // 10+ K (pitcher) = dominant start
  SV: 3,           // 3+ SV (closer's day-of-action)
  SB: 4,           // 4+ SB = burner day
  W: 1,            // pitcher: 1 W with 10+ K is multi-cat
} as const

function classifyHugeGame(
  stats: Record<string, number>,
): { trigger: HugeGamePayload['trigger']; importance: BeatImportance } | null {
  const hr = stats.HR ?? 0
  const rbi = stats.RBI ?? 0
  const h = stats.H ?? 0
  const k = stats.K ?? 0
  const sv = stats.SV ?? 0
  // Cycle = at least 1 of each: 1B, 2B, 3B, HR. Since we only carry
  // category-level stats, infer from H + HR + extra-base totals; if
  // those aren't surfaced, cycle detection sits out until adapters
  // populate per-hit-type counts.
  // Multi-cat: 2+ HR AND 5+ RBI in the same game.
  if (hr >= 2 && rbi >= 5) return { trigger: 'multi-cat', importance: 'high' }
  if (hr >= HUGE_GAME_THRESHOLDS.HR) return { trigger: 'multi-hr', importance: 'high' }
  if (rbi >= HUGE_GAME_THRESHOLDS.RBI) return { trigger: 'big-rbi', importance: 'med' }
  if (h >= HUGE_GAME_THRESHOLDS.H) return { trigger: 'multi-hit', importance: 'med' }
  if (k >= HUGE_GAME_THRESHOLDS.K) return { trigger: 'big-k', importance: 'high' }
  if (sv >= HUGE_GAME_THRESHOLDS.SV) return { trigger: 'big-sv', importance: 'med' }
  return null
}

function formatStatLine(stats: Record<string, number>): string {
  // Build an editorial-ready stat line. Pitching and hitting stats
  // surface differently — a pitcher's day reads "7 IP, 11 K, 0 ER";
  // a hitter's reads "4-for-5, 2 HR, 6 RBI". Heuristic: if K + IP
  // dominate, it's a pitcher's day.
  const hasPitchingDay = (stats.K ?? 0) >= 4 || (stats.IP ?? 0) >= 3 || (stats.SV ?? 0) >= 1
  const pieces: string[] = []
  if (hasPitchingDay) {
    if (stats.IP) pieces.push(`${stats.IP} IP`)
    if (stats.K) pieces.push(`${stats.K} K`)
    if (stats.SV) pieces.push(`${stats.SV} SV`)
    if (stats.W) pieces.push(`${stats.W} W`)
    if (typeof stats.ER === 'number') pieces.push(`${stats.ER} ER`)
  } else {
    // Hitting day. "X-for-Y" requires AB; if absent, fall back to hit
    // totals + the extras.
    if (typeof stats.H === 'number' && typeof stats.AB === 'number') {
      pieces.push(`${stats.H}-for-${stats.AB}`)
    } else if (stats.H) {
      pieces.push(`${stats.H} H`)
    }
    if (stats.HR) pieces.push(`${stats.HR} HR`)
    if (stats.RBI) pieces.push(`${stats.RBI} RBI`)
    if (stats.SB) pieces.push(`${stats.SB} SB`)
  }
  return pieces.length > 0 ? pieces.join(', ') : 'big day'
}

/**
 * HUGE GAME — fires per player-day that clears a threshold. Silent
 * when adapter hasn't populated playerPerformances.
 */
export function detectHugeGames(
  data: CategoryLeagueData,
  now: Date = new Date(),
): BeatItemSeed[] {
  const perfs = data.playerPerformances
  if (!perfs || perfs.length === 0) return []
  const playerById = new Map<string, NonNullable<CategoryLeagueData['players']>[number]>()
  for (const p of data.players ?? []) playerById.set(p.id, p)
  const out: BeatItemSeed[] = []
  for (const perf of perfs) {
    const verdict = classifyHugeGame(perf.stats)
    if (!verdict) continue
    const player = playerById.get(perf.playerId)
    const playerName = player?.name ?? `Player ${perf.playerId}`
    const day = new Date(`${perf.day}T20:00:00`)
    // If the day stamp is invalid, fall back to "now" minus an
    // arbitrary hash-staggered minutes window so the feed orders OK.
    const ts = isNaN(day.getTime())
      ? new Date(now.getTime() - hashStagger(perf.playerId, 0, 720) * 60 * 1000)
      : day
    out.push({
      id: `HUGE_GAME:${perf.fantasyTeamId}:${perf.playerId}:${perf.day}`,
      category: 'HUGE_GAME',
      timestamp: ts,
      importance: verdict.importance,
      payload: {
        category: 'HUGE_GAME',
        playerId: perf.playerId,
        playerName,
        position: player?.position,
        mlbTeam: player?.mlbTeam,
        photoUrl: player?.photoUrl,
        fantasyTeamId: perf.fantasyTeamId,
        trigger: verdict.trigger,
        day: perf.day,
        headlineStats: formatStatLine(perf.stats),
        stats: perf.stats,
      },
      signal: `huge game: ${perf.playerId} for ${perf.fantasyTeamId} (${verdict.trigger})`,
    })
  }
  return out
}

/** Cat-impact score — sums up the "did this player out-produce the
 *  starter in this cat" margin across the cats that matter most. */
function compareStatLines(
  bench: Record<string, number>,
  starter: Record<string, number>,
): number {
  const cats: Array<keyof typeof HUGE_GAME_THRESHOLDS> = ['HR', 'RBI', 'H', 'K', 'SV', 'SB', 'W']
  let cost = 0
  for (const c of cats) {
    const b = bench[c] ?? 0
    const s = starter[c] ?? 0
    if (b > s) cost += b - s
  }
  return cost
}

/**
 * BENCH BLUNDER — fires when a benched player had a HUGE_GAME-tier
 * day AND a same-team starter at any roster slot posted clearly
 * lower stats. The cost summary captures what the manager left on
 * the bench.
 *
 * Silent when adapter doesn't populate playerPerformances or no
 * benched player qualifies.
 */
export function detectBenchBlunders(
  data: CategoryLeagueData,
  now: Date = new Date(),
): BeatItemSeed[] {
  const perfs = data.playerPerformances
  if (!perfs || perfs.length === 0) return []
  const playerById = new Map<string, NonNullable<CategoryLeagueData['players']>[number]>()
  for (const p of data.players ?? []) playerById.set(p.id, p)
  // Group performances by fantasy team + day so the comparison is
  // cheap: "what did this team's starters do on this day vs their
  // bench."
  const byTeamDay = new Map<string, { bench: typeof perfs; starters: typeof perfs }>()
  for (const perf of perfs) {
    const key = `${perf.fantasyTeamId}:${perf.day}`
    let bucket = byTeamDay.get(key)
    if (!bucket) {
      bucket = { bench: [], starters: [] }
      byTeamDay.set(key, bucket)
    }
    if (perf.started) bucket.starters.push(perf)
    else bucket.bench.push(perf)
  }
  const out: BeatItemSeed[] = []
  for (const [, bucket] of byTeamDay) {
    for (const benchPerf of bucket.bench) {
      const verdict = classifyHugeGame(benchPerf.stats)
      if (!verdict) continue
      // Find the starter whose stats are most cleanly out-produced
      // by this bench player. Threshold: cost ≥ 3 cats summed.
      let bestComparison: { starter: typeof benchPerf; cost: number } | null = null
      for (const starterPerf of bucket.starters) {
        const cost = compareStatLines(benchPerf.stats, starterPerf.stats)
        if (cost < 3) continue
        if (!bestComparison || cost > bestComparison.cost) {
          bestComparison = { starter: starterPerf, cost }
        }
      }
      if (!bestComparison) continue
      const starterPlayer = playerById.get(bestComparison.starter.playerId)
      const benchPlayer = playerById.get(benchPerf.playerId)
      const day = new Date(`${benchPerf.day}T22:00:00`)
      const ts = isNaN(day.getTime())
        ? new Date(now.getTime() - hashStagger(benchPerf.playerId, 0, 240) * 60 * 1000)
        : day
      out.push({
        id: `BENCH_BLUNDER:${benchPerf.fantasyTeamId}:${benchPerf.playerId}:${benchPerf.day}`,
        category: 'BENCH_BLUNDER',
        timestamp: ts,
        importance: bestComparison.cost >= 8 ? 'high' : 'med',
        payload: {
          category: 'BENCH_BLUNDER',
          playerId: benchPerf.playerId,
          playerName: benchPlayer?.name ?? `Player ${benchPerf.playerId}`,
          position: benchPlayer?.position,
          mlbTeam: benchPlayer?.mlbTeam,
          photoUrl: benchPlayer?.photoUrl,
          fantasyTeamId: benchPerf.fantasyTeamId,
          day: benchPerf.day,
          benchedStats: formatStatLine(benchPerf.stats),
          startedPlayerId: bestComparison.starter.playerId,
          startedPlayerName: starterPlayer?.name,
          startedStats: formatStatLine(bestComparison.starter.stats),
          costSummary: `Cost: ${bestComparison.cost} cats`,
        },
        signal: `bench blunder: ${benchPerf.playerId} for ${benchPerf.fantasyTeamId} (cost ${bestComparison.cost})`,
      })
    }
  }
  return out
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

