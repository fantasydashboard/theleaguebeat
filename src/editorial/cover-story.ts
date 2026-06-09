/**
 * Cover-story detector for THE ISSUE.
 *
 * The Issue's cover is the single most editorially-loaded sentence
 * of the week's recap. The previous V0 used the LADDER margin-aware
 * empty-hero unconditionally — which produces a credible "leader
 * holds" cover but never surfaces the bigger stories: a throne
 * change, a cellar that bottomed out, a team that lived a wild arc,
 * a cutline race coming to a head.
 *
 * This module scores every candidate cover-story signal and picks
 * the winner. The signals it considers:
 *
 *   - THRONE_CHANGE   — current #1 differs from last week's #1
 *   - DYNASTY_LOCK    — leader has held #1 for many weeks (5+)
 *   - WILD_ARC        — a team's rank range this season is huge
 *   - CELLAR_LOCK     — bottom team has 0 owns + deep L-streak
 *   - RACE_FINALE     — cutoff seam is tight in the final stretch
 *   - LEADER_HOLD     — fallback: steady leader (the LADDER hero)
 *
 * Each signal returns null when not present, or a scored candidate.
 * The highest-weight candidate wins the cover. The renderer (called
 * from the Issue view) is responsible for translating the winner into
 * eyebrow + headline + body + stat chips.
 */

import type { CategoryLeagueData, LeagueDataH2HPoints } from './types.ts'
import { stripEmojiForEditorial } from './detect-lede.ts'

export type CoverStoryKind =
  | 'THRONE_CHANGE'
  | 'DYNASTY_LOCK'
  | 'WILD_ARC'
  | 'CELLAR_LOCK'
  | 'RACE_FINALE'
  | 'LEADER_HOLD'

export interface CoverStoryCandidate {
  kind: CoverStoryKind
  weight: number
  /** The primary team the cover is about. Drives the cover portrait. */
  teamId: string
  /** Opponent / antagonist where applicable (throne, race). */
  opponentTeamId?: string
  /** Pre-built editorial pieces ready to render. */
  eyebrow: string
  headline: string
  body: string
  /** Three stat chips. Each chip is `[value, label]`. */
  chips: [[string, string], [string, string], [string, string]]
  signal: string
}

/* ─────────────────────────────────────────────────────────────────
   PUBLIC ENTRY
───────────────────────────────────────────────────────────────── */

type CoverDetector = (data: CategoryLeagueData) => CoverStoryCandidate | null

/** Run a set of detectors and return the highest-weight candidate. */
function pickFrom(data: CategoryLeagueData, detectors: CoverDetector[]): CoverStoryCandidate | null {
  const candidates = detectors
    .map((d) => d(data))
    .filter((c): c is CoverStoryCandidate => c != null)
  if (candidates.length === 0) return null
  candidates.sort((a, b) => b.weight - a.weight)
  return candidates[0]
}

export function detectCoverStory(data: CategoryLeagueData): CoverStoryCandidate | null {
  return pickFrom(data, [
    detectThroneChange,
    detectWildArc,
    detectCellarLock,
    detectRaceFinale,
    detectDynastyLock,
    detectLeaderHold,
  ])
}

/**
 * Points-league cover story. Only the rank-movement arcs port cleanly:
 * THRONE_CHANGE, DYNASTY_LOCK, WILD_ARC speak in weeks-at-#1 / season-arc /
 * reign language with no category vocabulary. RACE_FINALE and LEADER_HOLD
 * say "cats" (and CELLAR_LOCK needs per-category `ownsCount`), so they're
 * excluded — a points league with no arc returns null here and the Issue
 * falls back to its matchup-of-the-week hero.
 *
 * The detectors read only teams / standings / seasonRankHistory /
 * currentWeek, all of which the points contract now carries; the cast
 * exposes exactly that subset under the shared `CategoryLeagueData` shape.
 */
export function detectPointsCoverStory(points: LeagueDataH2HPoints): CoverStoryCandidate | null {
  if (!points.standings?.length || !points.seasonRankHistory?.length) return null
  const view = {
    teams: points.teams,
    standings: points.standings,
    seasonRankHistory: points.seasonRankHistory,
    currentWeek: points.currentWeek,
    playoffCutoff: points.playoffCutoff,
    regularSeasonEndWeek: points.regularSeasonEndWeek,
  } as unknown as CategoryLeagueData
  return pickFrom(view, [detectThroneChange, detectWildArc, detectDynastyLock])
}

/* ─────────────────────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────────────────────── */

function teamName(data: CategoryLeagueData, teamId: string): string {
  const t = data.teams.find((x) => x.id === teamId)
  if (!t) return 'A team'
  return stripEmojiForEditorial(t.name) || t.name
}

/** English possessive that handles plural-form team names. "The
 *  Queens Bombers" → "The Queens Bombers'" (not "Bombers's"); "Jazz
 *  on my TittyWittys" → "TittyWittys'"; "Chaplao" → "Chaplao's".
 *  Heuristic: names ending in s/S take a trailing apostrophe only. */
function possessive(name: string): string {
  return /s$/i.test(name) ? `${name}'` : `${name}'s`
}

function standingFor(data: CategoryLeagueData, teamId: string) {
  return data.standings.find((s) => s.teamId === teamId)
}

function findTopOne(week: { ranks: Record<string, number> }): string | undefined {
  for (const [id, r] of Object.entries(week.ranks)) {
    if (r === 1) return id
  }
  return undefined
}

function fmtRecord(s: { catWins: number; catLosses: number; catTies: number } | undefined): string {
  if (!s) return '—'
  return s.catTies > 0 ? `${s.catWins}-${s.catLosses}-${s.catTies}` : `${s.catWins}-${s.catLosses}`
}

/* ─────────────────────────────────────────────────────────────────
   DETECTORS — one per cover-story candidate kind
───────────────────────────────────────────────────────────────── */

function detectThroneChange(data: CategoryLeagueData): CoverStoryCandidate | null {
  const hist = data.seasonRankHistory
  if (hist.length < 2) return null
  const last = hist[hist.length - 1]
  const prev = hist[hist.length - 2]
  const top = findTopOne(last)
  const prevTop = findTopOne(prev)
  if (!top || !prevTop || top === prevTop) return null
  // How many weeks did the displaced team hold #1?
  let held = 0
  for (let i = hist.length - 2; i >= 0; i--) {
    if (findTopOne(hist[i]) === prevTop) held++
    else break
  }
  const winnerName = teamName(data, top)
  const loserName = teamName(data, prevTop)
  const winnerStanding = standingFor(data, top)
  const loserStanding = standingFor(data, prevTop)
  const eyebrow = held >= 5 ? 'THE THRONE CHANGES' : 'NEW #1'
  const headline = held >= 5
    ? `${winnerName} ends ${possessive(loserName)} reign.`
    : `${winnerName} takes the top.`
  const body = held >= 5
    ? `Week ${data.currentWeek - 1}. ${winnerName} unseats a ${held}-week champion. The ladder has a new leader.`
    : `Week ${data.currentWeek - 1}. ${winnerName} takes #1 from ${loserName}.`
  return {
    kind: 'THRONE_CHANGE',
    // High weight — a throne change is almost always the biggest
    // editorial story of the week, especially after a long reign.
    weight: 90 + Math.min(10, held),
    teamId: top,
    opponentTeamId: prevTop,
    eyebrow,
    headline,
    body,
    chips: [
      [held > 0 ? `${held}` : '—', held > 0 ? 'WEEKS UNSEATED' : 'NEW REIGN'],
      [winnerStanding ? `${winnerStanding.streak.type}${winnerStanding.streak.length}` : '—', 'STREAK'],
      [fmtRecord(winnerStanding), 'THIS SEASON'],
    ],
    signal: `throne: ${top} over ${prevTop} (held ${held}w)`,
  }
}

function detectDynastyLock(data: CategoryLeagueData): CoverStoryCandidate | null {
  const hist = data.seasonRankHistory
  if (hist.length < 5) return null
  const top = findTopOne(hist[hist.length - 1])
  if (!top) return null
  // Count consecutive weeks at #1.
  let run = 0
  for (let i = hist.length - 1; i >= 0; i--) {
    if (findTopOne(hist[i]) === top) run++
    else break
  }
  if (run < 5) return null
  const name = teamName(data, top)
  const standing = standingFor(data, top)
  const winStreak = standing?.streak.type === 'W' ? standing.streak.length : 0
  // The dynasty story decays as the reign drags on — a 5-7 week
  // dynasty is a fresh story; a 12-week dynasty is wallpaper.
  const freshness = Math.max(40, 80 - Math.max(0, run - 5) * 4)
  // Body acknowledges any gap between weeks-at-#1 and matchup streak.
  // Previously the cover said "5 consecutive weeks at #1. On a W10
  // matchup run." with no acknowledgement of the math, which read as
  // contradictory. The new framing makes the relationship explicit.
  let body: string
  if (winStreak === 0) {
    body = `${run} consecutive weeks at #1. The chasers haven't closed the gap.`
  } else if (winStreak > run) {
    const before = winStreak - run
    body = before === 1
      ? `${run} consecutive weeks at #1, riding a W${winStreak} matchup run — the streak started a week before the climb.`
      : `${run} consecutive weeks at #1, riding a W${winStreak} matchup run — ${before} of those wins came before the climb.`
  } else if (winStreak === run) {
    body = `${run} consecutive weeks at #1. ${run} straight matchup wins. Symmetry.`
  } else {
    body = `${run} consecutive weeks at #1. Currently on a W${winStreak} matchup run.`
  }
  // Eyebrow / headline escalate with the length of the reign so a
  // multi-week dynasty doesn't read identically every issue. The
  // freshness tax (defined above) already penalizes the weight, but
  // the framing should change too — "STILL ON TOP" reads as news in
  // week 5 and as a yawn in week 10.
  let eyebrow: string
  let headline: string
  if (run >= 10) {
    eyebrow = 'A CORONATION'
    headline = `${name} is no longer the story — they're the season.`
  } else if (run >= 8) {
    eyebrow = 'SEASON-LONG REIGN'
    headline = `${name} owns the season.`
  } else if (run >= 6) {
    eyebrow = 'THE LONG REIGN'
    headline = `${name} settles in at the top.`
  } else {
    eyebrow = 'STILL ON TOP'
    headline = `${name} holds the top. Again.`
  }
  return {
    kind: 'DYNASTY_LOCK',
    weight: freshness,
    teamId: top,
    eyebrow,
    headline,
    body,
    chips: [
      [`${run}`, 'WEEKS AT #1'],
      [standing && standing.streak.type !== 'T' ? `${standing.streak.type}${standing.streak.length}` : '—', 'STREAK'],
      [fmtRecord(standing), 'THIS SEASON'],
    ],
    signal: `dynasty: ${top} held #1 for ${run}w (streak ${winStreak})`,
  }
}

export function detectWildArc(data: CategoryLeagueData): CoverStoryCandidate | null {
  const hist = data.seasonRankHistory
  if (hist.length < 5) return null
  const teamCount = data.teams.length || 10

  // Find the team with the widest rank range this season, tracking its
  // chronological start and end ranks (not just min/max). The end rank
  // is what the team IS now; rendering min → max as if it were a
  // trajectory misreads as a fall for a team that actually climbed.
  let widest:
    | { teamId: string; range: number; min: number; max: number; start: number; end: number }
    | null = null
  for (const team of data.teams) {
    const series: number[] = []
    for (const w of hist) {
      const r = w.ranks[team.id]
      if (r != null) series.push(r)
    }
    if (series.length === 0) continue
    const min = Math.min(...series)
    const max = Math.max(...series)
    const range = max - min
    if (!widest || range > widest.range) {
      widest = { teamId: team.id, range, min, max, start: series[0], end: series[series.length - 1] }
    }
  }
  if (!widest) return null
  // Only counts when the range spans >= 60% of the league — half the
  // standings is "lived the arc" territory.
  if (widest.range < Math.ceil(teamCount * 0.6)) return null

  const { start, end, min, max } = widest
  const name = teamName(data, widest.teamId)
  const standing = standingFor(data, widest.teamId)

  // Classify the shape. A team that ended at (or next to) its best rank
  // climbed; one that ended at its worst slid; anything that went out and
  // came back is a genuine arc. Direction is chronological start → end.
  const climbed = start - end // positive = moved up the board
  let eyebrow: string
  let headline: string
  let body: string
  let arcLabel: string
  if (climbed > 0 && end <= min + 1) {
    eyebrow = 'THE CLIMB'
    headline = end <= 1 ? `${name} climbed to the top.` : `${name} is the climber of the season.`
    body = `From #${start} to #${end} this season. The biggest rise on the board.`
    arcLabel = 'CLIMBED'
  } else if (climbed < 0 && end >= max - 1) {
    eyebrow = 'THE SLIDE'
    headline = `${name} slid down the board.`
    body = `From #${start} to #${end} this season. The hardest fall on the board.`
    arcLabel = 'SLID'
  } else {
    eyebrow = 'THE WILDEST ARC'
    headline = `${name} lived the whole season.`
    body = `Ranged from #${min} to #${max} this season, now #${end}. A parabola with ${possessive(name)} name on it.`
    arcLabel = 'SEASON ARC'
  }

  return {
    kind: 'WILD_ARC',
    weight: 70 + Math.min(15, widest.range),
    teamId: widest.teamId,
    eyebrow,
    headline,
    body,
    chips: [
      [`#${start} → #${end}`, arcLabel],
      [standing && standing.streak.type !== 'T' ? `${standing.streak.type}${standing.streak.length}` : '—', 'STREAK'],
      [fmtRecord(standing), 'THIS SEASON'],
    ],
    signal: `wild arc: ${widest.teamId} #${start}→#${end} (range ${widest.range}, min ${min}, max ${max})`,
  }
}

function detectCellarLock(data: CategoryLeagueData): CoverStoryCandidate | null {
  if (data.standings.length < 4) return null
  const sorted = [...data.standings].sort((a, b) => b.rank - a.rank)
  const last = sorted[0]
  const lStreak = last.streak.type === 'L' ? last.streak.length : 0
  // Cover-grade cellar requires more than a soft slide — needs deep
  // streak AND zero owns to be the story of the week.
  if (lStreak < 6 || last.ownsCount > 0) return null
  const name = teamName(data, last.teamId)
  return {
    kind: 'CELLAR_LOCK',
    weight: 75 + Math.min(10, lStreak - 6),
    teamId: last.teamId,
    eyebrow: 'THE BASEMENT, FILLED IN',
    headline: `${name} runs out of road.`,
    body: `Week ${data.currentWeek - 1}. ${lStreak} weeks deep in the cold, ${last.bleedingCount} cats bleeding, zero categories owned. The math has run out of patience.`,
    chips: [
      [`L${last.streak.length}`, 'STREAK'],
      [`${last.bleedingCount}`, 'CATS BLEEDING'],
      [fmtRecord(last), 'THIS SEASON'],
    ],
    signal: `cellar: ${last.teamId} L${lStreak} owns=${last.ownsCount} bleeds=${last.bleedingCount}`,
  }
}

function detectRaceFinale(data: CategoryLeagueData): CoverStoryCandidate | null {
  const cutoff = data.playoffCutoff || Math.max(1, Math.floor(data.teams.length / 2))
  const endWeek = data.regularSeasonEndWeek ?? 22
  const weeksLeft = endWeek - data.currentWeek
  // Only a "race finale" when we're inside the final stretch.
  if (weeksLeft > 3) return null
  // Find the tightest cutline seam — adjacent teams at rank=cutoff
  // and rank=cutoff+1.
  const sorted = [...data.standings].sort((a, b) => a.rank - b.rank)
  const inside = sorted.find((s) => s.rank === cutoff)
  const outside = sorted.find((s) => s.rank === cutoff + 1)
  if (!inside || !outside) return null
  const gap = Math.abs(inside.catWins - outside.catWins)
  if (gap > 3) return null
  const insideName = teamName(data, inside.teamId)
  const outsideName = teamName(data, outside.teamId)
  return {
    kind: 'RACE_FINALE',
    weight: 80 + Math.max(0, 3 - gap) * 3,
    teamId: inside.teamId,
    opponentTeamId: outside.teamId,
    eyebrow: 'THE LINE',
    headline: gap === 0
      ? `${insideName} and ${outsideName}, dead even on the cutline.`
      : `${insideName} vs ${outsideName}, ${gap} cats from the line.`,
    body: `${weeksLeft} ${weeksLeft === 1 ? 'week' : 'weeks'} left. The playoff seam comes down to these two.`,
    chips: [
      [`${gap}`, 'CAT GAP'],
      [`#${cutoff}`, 'PLAYOFF LINE'],
      [`${weeksLeft}`, 'WEEKS LEFT'],
    ],
    signal: `race-finale: ${inside.teamId} vs ${outside.teamId} (gap ${gap}, ${weeksLeft} left)`,
  }
}

function detectLeaderHold(data: CategoryLeagueData): CoverStoryCandidate | null {
  const sorted = [...data.standings].sort((a, b) => a.rank - b.rank)
  const top = sorted[0]
  const second = sorted[1]
  if (!top) return null
  const name = teamName(data, top.teamId)
  const gap = second ? top.catWins - second.catWins : 0
  const winStreak = top.streak.type === 'W' ? top.streak.length : 0
  let eyebrow: string
  let headline: string
  let body: string
  if (gap >= 20) {
    eyebrow = 'NOBODY CLOSE'
    headline = `${name} is the season.`
    body = winStreak >= 7
      ? `Week ${data.currentWeek - 1}. ${winStreak} straight matchup wins. The chase pack has run out of weeks to close the gap.`
      : `Week ${data.currentWeek - 1}. A ${gap}-cat margin on #2. The gap is no longer a race; it's a margin.`
  } else if (gap >= 8) {
    eyebrow = 'STILL ON TOP'
    headline = `${name} keeps it.`
    body = winStreak >= 5
      ? `Week ${data.currentWeek - 1}. ${winStreak} straight wins and a ${gap}-cat cushion on #2. The chasers stay close, not closer.`
      : `Week ${data.currentWeek - 1}. ${gap}-cat cushion on #2. Enough margin to survive a bad week.`
  } else {
    eyebrow = 'BY A HAIR'
    headline = `${name} clings to it.`
    body = `Week ${data.currentWeek - 1}. ${gap}-cat lead on #2. The top spot is one swing away from flipping — pressure's on.`
  }
  // Leader hold is the baseline. Weighted low so any genuine story
  // (throne, race, cellar, wild arc) beats it.
  const weight = gap >= 20 ? 50 : gap >= 8 ? 40 : 30
  return {
    kind: 'LEADER_HOLD',
    weight,
    teamId: top.teamId,
    opponentTeamId: second?.teamId,
    eyebrow,
    headline,
    body,
    chips: [
      [gap > 0 ? `+${gap}` : '0', gap > 0 ? 'CATS OVER #2' : 'SPOTS'],
      [top.streak.type !== 'T' && top.streak.length > 0 ? `${top.streak.type}${top.streak.length}` : '—', 'STREAK'],
      [fmtRecord(top), 'THIS SEASON'],
    ],
    signal: `leader-hold: ${top.teamId} gap=${gap} streak=${top.streak.type}${top.streak.length}`,
  }
}
