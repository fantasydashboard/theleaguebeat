/**
 * Draft storylines for points leagues, derived from the picks alone.
 *
 * Deliberately makes NO judgement about pick value. Grading a pick
 * requires a projection model, and that model is Ultimate Fantasy
 * Dashboard's — the paid product. When UFD publishes value to the
 * shared Supabase, it can enrich what is here; nothing in this file
 * needs restructuring to accept it, because everything here is a fact
 * about what happened rather than an opinion about whether it was
 * good.
 *
 * What IS derivable from a pick list, and is what people argue about
 * in the hours after a draft:
 *   - positional runs (four running backs inside six picks)
 *   - who loaded up on a position, and how early
 *   - when the first quarterback went, and when a position dried up
 *
 * Every function is pure and returns only what the data supports.
 */
import type { CategoryLeagueDataDraftPick } from '../types'

/** A stretch of consecutive picks dominated by one position. */
export interface PositionRun {
  position: string
  count: number
  fromPick: number
  toPick: number
}

export interface DraftFirstAtPosition {
  position: string
  pickOverall: number
  round: number
  playerName: string
  teamId: string
}

export interface DraftConcentration {
  teamId: string
  position: string
  count: number
}

export interface DraftStoryFacts {
  totalPicks: number
  rounds: number
  teamCount: number
  firstPick?: CategoryLeagueDataDraftPick
  runs: PositionRun[]
  firstAtPosition: DraftFirstAtPosition[]
  /** Teams that took an unusual number of one position. */
  concentrations: DraftConcentration[]
  positionCounts: { position: string; count: number }[]
}

/**
 * A "run" is RUN_MIN or more picks at one position inside a window of
 * RUN_WINDOW consecutive picks. Three-in-five is the point at which a
 * draft room starts reacting to each other rather than to their board,
 * which is what makes it worth writing about.
 */
const RUN_MIN = 3
const RUN_WINDOW = 5

export function findPositionRuns(
  picks: CategoryLeagueDataDraftPick[],
): PositionRun[] {
  const ordered = [...picks]
    .filter((p) => p.position)
    .sort((a, b) => a.pickOverall - b.pickOverall)
  const runs: PositionRun[] = []

  for (let i = 0; i < ordered.length; i++) {
    const counts = new Map<string, CategoryLeagueDataDraftPick[]>()
    for (let j = i; j < ordered.length; j++) {
      if (ordered[j].pickOverall - ordered[i].pickOverall >= RUN_WINDOW) break
      const list = counts.get(ordered[j].position) ?? []
      list.push(ordered[j])
      counts.set(ordered[j].position, list)
    }
    for (const [position, list] of counts) {
      if (list.length < RUN_MIN) continue
      runs.push({
        position,
        count: list.length,
        fromPick: list[0].pickOverall,
        toPick: list[list.length - 1].pickOverall,
      })
    }
  }

  // Overlapping windows report the same run repeatedly. Keep the
  // biggest, earliest instance of each and drop anything contained by
  // an already-kept run.
  runs.sort((a, b) => b.count - a.count || a.fromPick - b.fromPick)
  const kept: PositionRun[] = []
  for (const r of runs) {
    const overlaps = kept.some(
      (k) => k.position === r.position && r.fromPick <= k.toPick && r.toPick >= k.fromPick,
    )
    if (!overlaps) kept.push(r)
  }
  return kept.sort((a, b) => a.fromPick - b.fromPick)
}

/** The first player taken at each position, and where. */
export function findFirstAtPosition(
  picks: CategoryLeagueDataDraftPick[],
): DraftFirstAtPosition[] {
  const seen = new Map<string, DraftFirstAtPosition>()
  for (const p of [...picks].sort((a, b) => a.pickOverall - b.pickOverall)) {
    if (!p.position || seen.has(p.position)) continue
    seen.set(p.position, {
      position: p.position,
      pickOverall: p.pickOverall,
      round: p.round,
      playerName: p.playerName,
      teamId: p.draftedByTeamId,
    })
  }
  return [...seen.values()].sort((a, b) => a.pickOverall - b.pickOverall)
}

/**
 * Teams that took notably more of one position than the league norm.
 *
 * The bar is relative to what every other team did at that position,
 * never an absolute count: five running backs is heavy in a
 * two-RB league and ordinary in a deep-flex one, and the same absolute
 * threshold would misfire across formats the way an absolute points
 * threshold would.
 */
export function findConcentrations(
  picks: CategoryLeagueDataDraftPick[],
): DraftConcentration[] {
  const byTeamPos = new Map<string, number>()
  const teams = new Set<string>()
  const positions = new Set<string>()
  for (const p of picks) {
    if (!p.position) continue
    teams.add(p.draftedByTeamId)
    positions.add(p.position)
    const key = `${p.draftedByTeamId}|${p.position}`
    byTeamPos.set(key, (byTeamPos.get(key) ?? 0) + 1)
  }
  if (teams.size === 0) return []

  const out: DraftConcentration[] = []
  for (const position of positions) {
    const counts = [...teams].map((teamId) => ({
      teamId,
      count: byTeamPos.get(`${teamId}|${position}`) ?? 0,
    }))
    const mean = counts.reduce((s, c) => s + c.count, 0) / counts.length
    for (const c of counts) {
      // At least two clear of the league's own average, and more than
      // one — "took two kickers" is only a story if everyone else took
      // fewer than that.
      if (c.count >= mean + 2 && c.count > 1) {
        out.push({ teamId: c.teamId, position, count: c.count })
      }
    }
  }
  return out.sort((a, b) => b.count - a.count)
}

export function buildDraftStoryFacts(
  picks: CategoryLeagueDataDraftPick[],
): DraftStoryFacts | null {
  if (picks.length === 0) return null
  const ordered = [...picks].sort((a, b) => a.pickOverall - b.pickOverall)
  const counts = new Map<string, number>()
  for (const p of ordered) {
    if (!p.position) continue
    counts.set(p.position, (counts.get(p.position) ?? 0) + 1)
  }
  return {
    totalPicks: ordered.length,
    rounds: Math.max(...ordered.map((p) => p.round), 0),
    teamCount: new Set(ordered.map((p) => p.draftedByTeamId)).size,
    firstPick: ordered[0],
    runs: findPositionRuns(ordered),
    firstAtPosition: findFirstAtPosition(ordered),
    concentrations: findConcentrations(ordered),
    positionCounts: [...counts.entries()]
      .map(([position, count]) => ({ position, count }))
      .sort((a, b) => b.count - a.count || a.position.localeCompare(b.position)),
  }
}

/** Positions read as words in prose. "5 RB came off the board" is a
 *  stat line; "Five running backs came off the board" is a sentence.
 *  Unknown codes fall through unchanged rather than being guessed at. */
const POSITION_WORDS: Record<string, { one: string; many: string }> = {
  QB:  { one: 'quarterback',   many: 'quarterbacks' },
  RB:  { one: 'running back',  many: 'running backs' },
  WR:  { one: 'wide receiver', many: 'wide receivers' },
  TE:  { one: 'tight end',     many: 'tight ends' },
  K:   { one: 'kicker',        many: 'kickers' },
  DEF: { one: 'defense',       many: 'defenses' },
  DST: { one: 'defense',       many: 'defenses' },
}

export function positionWord(code: string, count: number): string {
  const entry = POSITION_WORDS[code?.toUpperCase()]
  if (!entry) return code
  return count === 1 ? entry.one : entry.many
}

/** Small numbers read as words in a sentence; larger ones stay numeric.
 *  Ten is the usual boundary in a house style and it is the boundary
 *  the rest of this engine's copy already uses. */
const NUMBER_WORDS = [
  'zero', 'one', 'two', 'three', 'four', 'five',
  'six', 'seven', 'eight', 'nine', 'ten',
]

export function numberWord(n: number): string {
  return n >= 0 && n < NUMBER_WORDS.length ? NUMBER_WORDS[n] : String(n)
}

function sentenceCase(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/**
 * One sentence of draft copy, in the magazine register.
 *
 * `teamName` resolves a team id to its display name; the caller owns
 * that lookup because past seasons and live leagues resolve names
 * differently. Returns null when nothing is worth saying, which is
 * better than a sentence that says nothing.
 */
export function draftLede(
  facts: DraftStoryFacts | null,
  teamName: (teamId: string) => string,
): string | null {
  if (!facts) return null

  const biggestRun = facts.runs.slice().sort((a, b) => b.count - a.count)[0]
  if (biggestRun && biggestRun.count >= RUN_MIN) {
    return sentenceCase(
      `${numberWord(biggestRun.count)} ${positionWord(biggestRun.position, biggestRun.count)} ` +
      `came off the board between picks ${biggestRun.fromPick} and ${biggestRun.toPick}.`,
    )
  }

  const top = facts.concentrations[0]
  if (top) {
    return (
      `${teamName(top.teamId)} came out of the draft with ` +
      `${numberWord(top.count)} ${positionWord(top.position, top.count)}.`
    )
  }

  if (facts.firstPick) {
    return (
      `${teamName(facts.firstPick.draftedByTeamId)} opened the draft with ` +
      `${facts.firstPick.playerName}.`
    )
  }
  return null
}
