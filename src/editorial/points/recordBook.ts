/**
 * What is at stake in the league's own history, before a snap.
 *
 * A preseason issue is otherwise entirely forward-looking — projections,
 * a draft grade, a board. Every one of those is a guess. The record book
 * is the only part of the page that is certain, and it is the part a
 * league that has played together for years actually argues about.
 *
 * TWO KINDS OF STORY, and they are not the same shape.
 *
 * A RACE is contested: one manager close enough to another that the
 * record changes hands this season. "Sixty wins, one clear" is a race.
 * A four-hundred-win lead is a fact, and facts are not stories — so a
 * race has to be within reach of a season to qualify.
 *
 * A MILESTONE is solo: a round number a manager is walking toward
 * whether or not anybody is chasing them. Those count even when nothing
 * is contested, which is the whole reason they are here — a league can
 * have no close race at all and still have four teams about to pass a
 * number that has never been passed.
 *
 * NOTHING IS INVENTED. A first-year league has no record book and gets
 * no section; a metric nobody is near gets no row. Manufacturing a
 * chase out of an even spread is the same failure as calling a flat
 * board a tier.
 */

/** One manager's career in this league, aggregated across every season
 *  the platform will give us. */
export interface CareerRecord {
  /** Stable across seasons and renames — the platform's owner id. */
  managerId: string
  /** Current team name where they are still in the league. */
  name: string
  /** Current-season team id, when they are still active. */
  teamId?: string
  seasons: number
  wins: number
  losses: number
  ties: number
  pointsFor: number
  titles: number
  /** Seasons finished bottom of the table. */
  lasts: number
}

export type RecordKind = 'race' | 'title' | 'milestone'

/**
 * Ordered by what a league argues about, not by arithmetic.
 *
 * Sorting on imminence alone buried "two titles, and nobody has ever
 * gone back to back" under three interchangeable points milestones —
 * because points tick over every week and titles do not. A contested
 * all-time record leads, the honours answer next, and the round numbers
 * fill what is left.
 */
const KIND_ORDER: Record<RecordKind, number> = { race: 0, title: 1, milestone: 2 }

export interface RecordNote {
  kind: RecordKind
  /** Sort key: smaller is more imminent. Weeks-at-their-pace for a
   *  milestone, games for a race. */
  urgency: number
  managerId: string
  teamId?: string
  /** "60 all-time wins" — the standing itself. */
  headline: string
  /** "One clear of Gridiron Man." — why it matters now. */
  detail: string
}

/**
 * Rungs, chosen to fit how these leagues actually accumulate.
 *
 * Wins climb ~7 a season, so a 100-win ladder would be silent for a
 * decade; points climb ~1,500, so a 100-point ladder would fire for
 * everybody every week. Neither number is arbitrary — each is about a
 * season and a half of the thing it counts.
 */
const WIN_STEP = 25
const POINT_STEP = 1000

/** A season's worth of games, used to judge whether a gap is closeable
 *  rather than merely small. */
const GAMES_IN_SEASON = 14

/** Below this a "race" is two managers who happen to be adjacent. */
const MAX_RACE_GAMES = 12

/** Milestones further away than this are not being "gone for". A team
 *  three seasons from a number is not chasing it. */
const MAX_MILESTONE_SEASONS = 2

/** How many rows a record book earns. Past this it is a statistics
 *  page, and nobody forwards a statistics page. */
export const MAX_RECORD_NOTES = 4

const nextRung = (value: number, step: number) => (Math.floor(value / step) + 1) * step

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

const ORD = (n: number) => {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`
}

/**
 * Where a manager stands all-time on a metric.
 *
 * Ranked across EVERY manager in the history, including those who have
 * left — all-time means all-time, and a total does not stop counting
 * because somebody was relegated.
 */
function rankBy(
  careers: readonly CareerRecord[],
  of: (c: CareerRecord) => number,
): Map<string, number> {
  const out = new Map<string, number>()
  ;[...careers].sort((a, b) => of(b) - of(a)).forEach((c, i) => out.set(c.managerId, i + 1))
  return out
}

/**
 * Everything worth saying about this league's history, most imminent
 * first. Empty when the league has none worth saying.
 */
export function buildRecordBook(
  careers: readonly CareerRecord[],
  opts: { seasonsPlayed: number } = { seasonsPlayed: 0 },
): RecordNote[] {
  // One season is not a history. Two managers is not a league.
  if (opts.seasonsPlayed < 2 || careers.length < 2) return []

  const notes: RecordNote[] = []
  const active = careers.filter((c) => c.teamId)

  // Standing, so a milestone cannot read as a boast. "147 from 8,000"
  // sounds like a league best until it says sixth.
  const winRank = rankBy(careers, (c) => c.wins)
  const pointRank = rankBy(careers, (c) => c.pointsFor)

  /* ── Races: the all-time leads that could change hands ─────────── */

  const byWins = [...careers].sort((a, b) => b.wins - a.wins)
  if (byWins.length >= 2 && byWins[0].wins > 0) {
    const [lead, second] = byWins
    const gap = lead.wins - second.wins
    // Both still playing, or the record cannot move this year.
    if (gap <= MAX_RACE_GAMES && lead.teamId && second.teamId) {
      notes.push({
        kind: 'race',
        urgency: gap,
        managerId: lead.managerId,
        teamId: lead.teamId,
        headline: `${lead.wins} all-time wins`,
        detail:
          gap === 0
            ? `Level with ${second.name} at the top of the league's history.`
            : `${plural(gap, 'win')} clear of ${second.name}, who is right behind them.`,
      })
    }
  }

  const byPoints = [...careers].sort((a, b) => b.pointsFor - a.pointsFor)
  if (byPoints.length >= 2 && byPoints[0].pointsFor > 0) {
    const [lead, second] = byPoints
    const gap = lead.pointsFor - second.pointsFor
    const perGame = lead.seasons > 0 ? lead.pointsFor / (lead.seasons * GAMES_IN_SEASON) : 0
    const weeks = perGame > 0 ? gap / perGame : Infinity
    if (weeks <= MAX_RACE_GAMES && lead.teamId && second.teamId) {
      notes.push({
        kind: 'race',
        urgency: weeks,
        managerId: lead.managerId,
        teamId: lead.teamId,
        headline: `${Math.round(lead.pointsFor).toLocaleString()} all-time points`,
        detail:
          `${Math.round(gap).toLocaleString()} clear of ${second.name} — about ` +
          `${plural(Math.max(1, Math.round(weeks)), 'week')} of scoring.`,
      })
    }
  }

  /* ── Milestones: round numbers being walked toward ─────────────── */

  for (const c of active) {
    const perGame = c.seasons > 0 ? c.pointsFor / (c.seasons * GAMES_IN_SEASON) : 0
    const winsPerSeason = c.seasons > 0 ? c.wins / c.seasons : 0

    const winTarget = nextRung(c.wins, WIN_STEP)
    const winsAway = winTarget - c.wins
    if (winsPerSeason > 0 && winsAway <= winsPerSeason * MAX_MILESTONE_SEASONS) {
      notes.push({
        kind: 'milestone',
        urgency: winsAway,
        managerId: c.managerId,
        teamId: c.teamId,
        headline: `${winsAway} from ${winTarget} career wins`,
        detail:
          (winsAway <= winsPerSeason
            ? 'Reachable this season'
            : 'On their record, a little over a season away') +
          ` — ${ORD(winRank.get(c.managerId) ?? 0)}-most wins in the league's history.`,
      })
    }

    const pointTarget = nextRung(c.pointsFor, POINT_STEP)
    const pointsAway = pointTarget - c.pointsFor
    const weeksAway = perGame > 0 ? pointsAway / perGame : Infinity
    if (weeksAway <= GAMES_IN_SEASON * MAX_MILESTONE_SEASONS) {
      notes.push({
        kind: 'milestone',
        // Points milestones are common; nudge them behind an equally
        // imminent win milestone, which is rarer and reads bigger.
        urgency: weeksAway + 0.5,
        managerId: c.managerId,
        teamId: c.teamId,
        headline: `${Math.round(pointsAway).toLocaleString()} from ${pointTarget.toLocaleString()} career points`,
        detail:
          `About ${plural(Math.max(1, Math.round(weeksAway)), 'week')} at their pace — ` +
          `${ORD(pointRank.get(c.managerId) ?? 0)}-highest scorer in the league's history.`,
      })
    }
  }

  /* ── Titles: the one number everybody already knows ─────────────── */

  const mostTitles = Math.max(0, ...careers.map((c) => c.titles))
  if (mostTitles > 0) {
    // Counted across EVERY manager in the history, not just the ones
    // still here. Black Panther has two titles and was relegated out of
    // this tier; filtering them out first made the manager they are
    // level with read as the outright leader.
    const allHolders = careers.filter((c) => c.titles === mostTitles)
    const present = allHolders.filter((c) => c.teamId)
    for (const c of present) {
      const others = allHolders.filter((o) => o.managerId !== c.managerId)
      notes.push({
        kind: 'title',
        urgency: -c.titles,   // most titles first among holders
        managerId: c.managerId,
        teamId: c.teamId,
        headline: `${plural(c.titles, 'title')}`,
        // No claim about back-to-back: this input is career totals, and
        // whether anybody went consecutive is a question about SEASONS.
        // Asserting it from here would be a guess that reads as a fact.
        detail:
          others.length === 0
            ? 'More than anybody else in the league’s history.'
            : others.length === 1
              ? `Level with ${others[0].name}. Nobody has more.`
              : `Nobody in the league’s history has more.`,
      })
    }
  }

  // Most imminent first, and one row per manager — a team that is
  // chasing three numbers at once should say the closest, not fill the
  // section on its own.
  const seen = new Set<string>()
  return notes
    .sort((a, b) => KIND_ORDER[a.kind] - KIND_ORDER[b.kind] || a.urgency - b.urgency)
    .filter((n) => {
      if (seen.has(n.managerId)) return false
      seen.add(n.managerId)
      return true
    })
    .slice(0, MAX_RECORD_NOTES)
}
