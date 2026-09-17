/**
 * Why this game matters, before it is played.
 *
 * The matchup cards printed "X vs. Y. Kickoff hasn't happened yet."
 * five times — the absence of a story, set in the same type as a
 * story. Everything needed to replace it was already on the contract
 * and unread: the all-time series, career records, the board, last
 * week's scores, and a `streak` field nothing consumed.
 *
 * A LADDER, NOT A LIST. Every matchup can be described several ways
 * and most of those ways are dull. The rungs are ordered by how much
 * a reader cares, the best one leads, and a second only appears when
 * it says something the first did not. Two good lines beat five
 * true ones.
 *
 * SILENCE IS AN OPTION. A game between two mid-table teams who have
 * never met and are on no run has no storyline, and inventing one
 * ("both will want to bounce back") is the thing this whole layer
 * exists to avoid. It returns nothing and the card shows the teams.
 */

/** Lower leads. Gaps left between rungs so one can be inserted. */
export const RUNG = {
  record: 10,        // an all-time record changes hands on this result
  topOfBoard: 25,    // two of the best three teams in the league
  series: 30,        // the all-time head-to-head
  firstMeeting: 35,  // rarer than it sounds, and a real hook
  basement: 45,      // the bottom of the table, with something at stake
  bothUnbeaten: 50,
  bothWinless: 52,
  streak: 55,        // somebody is on a run
  scoring: 60,       // best offence against worst
} as const

export interface Storyline {
  kind: keyof typeof RUNG
  rung: number
  text: string
}

export interface StorylineTeam {
  teamId: string
  name: string
  /** Power-board position, 1 = best. */
  rank?: number
  wins: number
  losses: number
  ties: number
  /** Consecutive results of the same kind, from the standings. */
  streak?: { type: 'W' | 'L' | 'T'; length: number }
  /** Points per week this season. */
  perWeek?: number
  /** Points scored in the most recent closed week. */
  lastWeekPoints?: number
  /** All-time regular-season wins, across every season connected. */
  careerWins?: number
}

export interface StorylineMatchup {
  matchupId: string
  home: StorylineTeam
  away: StorylineTeam
  /** The all-time series as a sentence, from `describeSeries`, already
   *  written from the HOME team's side. Null when they have never met
   *  or have met only once. */
  series?: string | null
  /** True when the two have genuinely never met. Distinct from a null
   *  `series`, which also covers a single meeting. */
  neverMet?: boolean
}

export interface StorylineInput {
  matchups: readonly StorylineMatchup[]
  fieldSize: number
  /** The all-time wins leader, and the total, for the record rung. */
  winsRecord?: { holders: string[]; wins: number }
}

export interface MatchupStory {
  matchupId: string
  /** Up to two lines, best first. Empty when the game has no story. */
  lines: string[]
  /** The best rung reached. Infinity when there is no story — used to
   *  order the section and to pick the match of the week. */
  rung: number
}

const plural = (n: number, one: string) => `${n} ${one}${n === 1 ? '' : 's'}`
const rec = (t: StorylineTeam) =>
  t.ties > 0 ? `${t.wins}-${t.losses}-${t.ties}` : `${t.wins}-${t.losses}`

/** Both teams, in the order they should be named. */
const sides = (m: StorylineMatchup) => [m.home, m.away] as const

function recordLine(m: StorylineMatchup, input: StorylineInput): Storyline | null {
  const r = input.winsRecord
  if (!r || r.wins <= 0) return null
  for (const t of sides(m)) {
    if (t.careerWins === undefined) continue
    const other = r.holders.filter((h) => h !== t.teamId)
    if (t.careerWins === r.wins && r.holders.includes(t.teamId)) {
      // Sharing the record: a win breaks the tie. With no one to share
      // it with there is nothing at stake, so say nothing.
      if (other.length === 0) continue
      return {
        kind: 'record', rung: RUNG.record,
        text: `${t.name} is level on ${plural(r.wins, 'career win')}, the league record. A win takes it outright.`,
      }
    }
    if (t.careerWins === r.wins - 1) {
      return {
        kind: 'record', rung: RUNG.record,
        text: `${t.name} is one career win off the league record of ${r.wins}. A win draws level.`,
      }
    }
  }
  return null
}

function boardLine(m: StorylineMatchup, input: StorylineInput): Storyline | null {
  const [h, a] = sides(m)
  if (h.rank === undefined || a.rank === undefined) return null
  const best = Math.max(h.rank, a.rank)
  const worst = Math.min(h.rank, a.rank)
  if (best <= 3) {
    return {
      kind: 'topOfBoard', rung: RUNG.topOfBoard,
      text: `No. ${h.rank} against No. ${a.rank} — two of the best three teams in the league.`,
    }
  }
  // The bottom only counts as a story in a league with somewhere to
  // fall; in a ten-team league the last two is still the last two.
  if (worst >= input.fieldSize - 2) {
    return {
      kind: 'basement', rung: RUNG.basement,
      text: `No. ${h.rank} against No. ${a.rank}. The bottom of the board, and somebody has to win.`,
    }
  }
  return null
}

function formLine(m: StorylineMatchup): Storyline | null {
  const [h, a] = sides(m)
  const played = (t: StorylineTeam) => t.wins + t.losses + t.ties
  if (played(h) > 0 && played(a) > 0) {
    if (h.losses === 0 && a.losses === 0 && h.wins > 0 && a.wins > 0) {
      return {
        kind: 'bothUnbeaten', rung: RUNG.bothUnbeaten,
        text: `Both unbeaten. ${h.name} ${rec(h)}, ${a.name} ${rec(a)} — one of them will not be.`,
      }
    }
    if (h.wins === 0 && a.wins === 0) {
      return {
        kind: 'bothWinless', rung: RUNG.bothWinless,
        text: `Neither has won yet. Somebody gets off the mark.`,
      }
    }
  }
  const runs = sides(m)
    .filter((t) => (t.streak?.length ?? 0) >= 3 && t.streak?.type !== 'T')
    .sort((x, y) => (y.streak!.length - x.streak!.length))
  const run = runs[0]
  if (run) {
    return {
      kind: 'streak', rung: RUNG.streak,
      text: run.streak!.type === 'W'
        ? `${run.name} arrives on ${plural(run.streak!.length, 'straight win')}.`
        : `${run.name} has lost ${plural(run.streak!.length, 'straight')}.`,
    }
  }
  return null
}

function scoringLine(m: StorylineMatchup, input: StorylineInput): Storyline | null {
  const [h, a] = sides(m)
  if (h.lastWeekPoints === undefined || a.lastWeekPoints === undefined) return null
  // Only worth saying when both were at an extreme of the same week.
  const all = input.matchups
    .flatMap((x) => [x.home, x.away])
    .map((t) => t.lastWeekPoints)
    .filter((p): p is number => p !== undefined)
    .sort((x, y) => y - x)
  if (all.length < 4) return null
  const top2 = new Set(all.slice(0, 2))
  const bottom2 = new Set(all.slice(-2))
  if (top2.has(h.lastWeekPoints) && top2.has(a.lastWeekPoints)) {
    return {
      kind: 'scoring', rung: RUNG.scoring,
      text: `The two highest scores of last week, in the same game.`,
    }
  }
  if (bottom2.has(h.lastWeekPoints) && bottom2.has(a.lastWeekPoints)) {
    return {
      kind: 'scoring', rung: RUNG.scoring,
      text: `The two lowest scores of last week, in the same game.`,
    }
  }
  return null
}

/**
 * Up to two lines per matchup, and a rung for ordering the section.
 *
 * The second line has to come from a different rung than the first,
 * so a card never says the same thing twice in two registers.
 */
export function buildMatchupStorylines(input: StorylineInput): MatchupStory[] {
  return input.matchups.map((m) => {
    const found: Storyline[] = []
    const push = (s: Storyline | null) => { if (s) found.push(s) }

    push(recordLine(m, input))
    push(boardLine(m, input))
    if (m.series) push({ kind: 'series', rung: RUNG.series, text: `${m.series}.` })
    else if (m.neverMet) {
      push({ kind: 'firstMeeting', rung: RUNG.firstMeeting, text: 'They have never met.' })
    }
    push(formLine(m))
    push(scoringLine(m, input))

    // Best first, and at most two. Each generator above returns one
    // storyline at most, so the rungs in `found` are already distinct
    // and there is nothing to de-duplicate — a guard for that would
    // imply a case that cannot happen.
    found.sort((x, y) => x.rung - y.rung)
    return {
      matchupId: m.matchupId,
      lines: found.slice(0, 2).map((s) => s.text),
      rung: found[0]?.rung ?? Infinity,
    }
  })
}

/**
 * The match of the week: the best story, not the closest score.
 *
 * Null when nothing on the card cleared a rung — better no billing
 * than billing an arbitrary game as the one to watch.
 */
export function matchOfTheWeek(stories: readonly MatchupStory[]): MatchupStory | null {
  const ranked = [...stories].filter((s) => Number.isFinite(s.rung)).sort((a, b) => a.rung - b.rung)
  return ranked[0] ?? null
}
