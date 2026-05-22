/**
 * Matchups Editorial Variant Library
 *
 * Variant pool that powers every editorial moment on the Matchups page:
 * the HERO matchup-of-the-week block (eyebrow + headline + body + sub-
 * context line), the day-anchored sub-headline under the page title,
 * the WHAT TO WATCH italicized callouts inside the matchup detail
 * modal, the Season Series prose inside that same modal, and the
 * footer quick-read pills.
 *
 * Templates are functional — each is a function that receives a
 * MatchupsContext and returns a string (or null/undefined for an
 * optional self-veto when the variant isn't applicable to the
 * context). This lets variants react to magnitude, day-of-week,
 * series history, sweep state, and bubble stakes without exploding
 * into string permutations.
 *
 * Voice rules: see EDITORIAL.md at the repo root. Re-read it before
 * adding variants. The voice is the whole product.
 *
 * Variant count targets (from the editorial density plan):
 *   HERO kinds (top-clash / bubble / champ-collapse / sweep / closest):
 *     eyebrows: 8-10
 *     headlines: 25-35
 *     bodies: 20-28
 *     sub-context: 6-10
 *   WHAT-TO-WATCH kinds (flip / lock / punt / sweep-alert):
 *     eyebrows: 8-10
 *     headlines: 15-25
 *     bodies (main callout): 15-20
 *   SEASON-SERIES kinds (one-sided / even / first-meeting / recent-reversal):
 *     eyebrows: 8-10
 *     headlines: 15-25
 *     bodies (series prose): 18-25
 *   SUB-HEADLINE: 12-18 headlines (no eyebrow / body — it's a one-liner)
 *   QUICK-READ: 12-18 labels (pill text only)
 */

/* ─────────────────────────────────────────────────────────────────
   TYPES
───────────────────────────────────────────────────────────────── */

export type MatchupsKind =
  | 'hero-top-clash'              // top-of-standings collision
  | 'hero-bubble-vs-bubble'       // playoff-line collision
  | 'hero-champ-collapsing'       // defending champ in trouble
  | 'hero-sweep-in-progress'      // one team dominating most cats
  | 'hero-closest-race'           // tight contested all 11 cats
  | 'sub-headline'                // day-of-week-anchored 3-fragment
  | 'what-to-watch-flip'          // a cat could flip with X games left
  | 'what-to-watch-lock'          // a cat could lock with Y outcome
  | 'what-to-watch-punt'          // a team is conceding a cat
  | 'what-to-watch-sweep-alert'   // matchup is mathematically over
  | 'season-series-one-sided'     // one team has owned the rivalry historically
  | 'season-series-even'          // tied or close historical record
  | 'season-series-first-meeting' // first time these two have met
  | 'season-series-recent-reversal' // underdog has won recently
  | 'quick-read'                  // footer pill labels

export type CatId =
  | 'R' | 'H' | 'HR' | 'RBI' | 'SB' | 'AVG'
  | 'W' | 'SV' | 'K' | 'HLD' | 'ERA' | 'WHIP'

export type DayBucket = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun'

export type MatchupStatus = 'live' | 'coasting' | 'locked'

export type QuickReadKind =
  | 'tightest-race-today'
  | 'biggest-sweep'
  | 'bubble-watch-matchup'
  | 'biggest-punt'

export interface TeamProfile {
  name: string
  owner: string
  mascot: string           // short mascot tag, e.g. "Closers"
  catRecord: string        // pre-formatted "7-3-1"
  winProb: number          // 0..1 — projected likelihood of winning the matchup
  topCats: CatId[]         // cats this team typically owns
  bleedingCats: CatId[]    // cats this team is consistently weak in
  seedRank?: number        // current standings seed (1..N)
  isDefendingChamp?: boolean
  isOnBubble?: boolean     // playoff-line team
}

export interface SeriesEntry {
  year: number
  week: number
  winner: 'A' | 'B' | 'tie'
  catScore: string         // pre-formatted "7-4"
}

export interface MatchupsContext {
  // Pair
  teamA: TeamProfile
  teamB: TeamProfile

  // Live matchup state (this week)
  catRecord: string                 // pre-formatted "6-4-1" from A's perspective
  contestedCats: CatId[]            // cats still live
  decidedCats: CatId[]              // cats already locked
  puntedCats: CatId[]               // cats one team has stopped contesting
  status: MatchupStatus
  daysLeftInWeek: number
  currentDay: DayBucket

  // Magnitude / stakes
  isTopOfStandings?: boolean        // both teams are #1 or #2
  isBubbleClash?: boolean           // both teams on the playoff line
  weeksLeftInRegularSeason?: number

  // SEASON-SERIES context
  series?: {
    allTimeRecord: string           // pre-formatted "5-2 A"
    totalMeetings: number
    trend: string                   // "A leading 4 of last 5" / "tied" / etc.
    lastFew: SeriesEntry[]
    lastMeeting?: SeriesEntry
    isFirstMeeting?: boolean        // first meeting this season
  }

  // SUB-HEADLINE bucket counts (for the day-anchored 3-fragment line)
  dayCounts?: {
    liveCount: number
    finalCount: number
    upcomingCount: number
  }

  // WHAT-TO-WATCH context
  watch?: {
    cat: CatId
    gamesLeft: number               // games remaining tied to the flip/lock
    teamOnAttack?: 'A' | 'B'        // which team is pushing
    needed?: string                 // pre-formatted "one save" / "two K"
  }

  // QUICK-READ context
  quickRead?: {
    pillKind: QuickReadKind
    label?: string                  // optional pre-built label
    primaryCat?: CatId              // for tightest/biggest-punt context
    sweepScore?: string             // pre-formatted "9-1" / "10-0"
  }
}

/* A single variant function. Returns null/undefined if the variant
   isn't applicable to this context (template's optional self-veto). */
export type VariantFn = (ctx: MatchupsContext) => string | null | undefined

export interface MatchupsTemplate {
  kind: MatchupsKind
  eyebrows: VariantFn[]
  headlines: VariantFn[]
  bodies: VariantFn[]
  /** Optional sub-context line — used only by HERO kinds. */
  subContext?: VariantFn[]
}

/* ─────────────────────────────────────────────────────────────────
   SYNONYM DICTIONARIES (string pools used inside templates)
───────────────────────────────────────────────────────────────── */

const SYN = {
  MEETS: ['meets', 'collides with', 'runs into', 'squares off with', 'draws', 'faces'],
  CLASH: ['clash', 'collision', 'showdown', 'standoff', 'reckoning'],
  TIGHT_RACE: ['inside the margin', 'too close to call', 'all cats in play', 'going to the wire', 'a coin flip'],
  OWNS: ['owns', 'has run', 'has dominated', 'has held the floor in', 'has bullied'],
  COLLAPSE: ['cracked', 'slipped', 'unraveled', 'wobbled', 'fallen off'],
  SWEEP_VERBS: ['running it', 'cooking', 'in the driver seat', 'in control', 'doing as it pleases'],
  TIGHTENS: ['tightens', 'narrows', 'closes', 'pinches'],
  FLIPS: ['flips', 'tips', 'swings', 'changes hands'],
  LOCKS: ['locks', 'closes', 'clinches', 'puts the cat away', 'seals'],
  PUNT_VERBS: ['stopped contesting', 'conceded', 'walked away from', 'left on the table'],
  STAKES: ['stakes', 'pressure', 'weight', 'season on the line'],
  RIVALRY: ['rivalry', 'matchup', 'series', 'history'],
  REVERSE: ['reversed', 'flipped the script on', 'turned over', 'rewritten'],
  EVEN: ['even', 'level', 'tied', 'split down the middle'],
  EARLY_WEEK: ['Monday', 'Tuesday', 'Wednesday'],
  MID_WEEK: ['Thursday'],
  LATE_WEEK: ['Friday', 'Saturday', 'Sunday'],
  RESHAPING: ['reshaping the week', 'doing the heavy lifting', 'moving the math', 'setting the tone'],
  STILL_OPEN: ['still open', 'still live', 'still in play', 'still on the board'],
  PILL_TIGHT: ['Coin flip', 'Inside the margin', 'Going down to the wire', 'All cats in play'],
  PILL_SWEEP: ['Sweep watch', 'Running away', 'Total control', 'Locked'],
  PILL_BUBBLE: ['Bubble', 'Playoff line', 'Cut line', 'Must-win'],
  PILL_PUNT: ['Punt', 'Conceded', 'Left on the table', 'Walked away'],
}

/* Pick a random variant from a synonym pool. Templates call this
   inside their string returns so each render is fresh. */
function pick<T>(pool: readonly T[]): T {
  return pool[Math.floor(Math.random() * pool.length)]
}

/* Pluralize helper */
const plural = (n: number, one: string, many: string = one + 's') => `${n} ${n === 1 ? one : many}`

/* Helper — leader of the live cat record (pre-formatted "6-4-1" from A's view). */
function leaderName(ctx: MatchupsContext): string {
  const [a, b] = ctx.catRecord.split('-').map((s) => parseInt(s, 10))
  if (isNaN(a) || isNaN(b)) return ctx.teamA.name
  if (a > b) return ctx.teamA.name
  if (b > a) return ctx.teamB.name
  return ctx.teamA.name
}

function trailerName(ctx: MatchupsContext): string {
  const leader = leaderName(ctx)
  return leader === ctx.teamA.name ? ctx.teamB.name : ctx.teamA.name
}

/* ─────────────────────────────────────────────────────────────────
   KIND: HERO TOP-CLASH (top-of-standings collision)
───────────────────────────────────────────────────────────────── */

const HERO_TOP_CLASH: MatchupsTemplate = {
  kind: 'hero-top-clash',
  eyebrows: [
    () => 'MATCHUP OF THE WEEK',
    () => 'TOP OF THE STANDINGS',
    () => 'ONE VERSUS TWO',
    () => 'MAIN EVENT',
    () => 'HEAVYWEIGHT',
    () => 'THE BIG ONE',
    () => 'STANDINGS COLLISION',
    () => 'CHAMPIONSHIP TONE',
    () => 'TOP-SEED SHOWDOWN',
    (ctx) => ctx.teamA.seedRank === 1 && ctx.teamB.seedRank === 2 ? 'ONE VERSUS TWO' : 'TOP OF THE STANDINGS',
  ],
  headlines: [
    // Punchy two-name collisions
    (ctx) => `${ctx.teamA.name} ${pick(SYN.MEETS)} ${ctx.teamB.name}.`,
    (ctx) => `${ctx.teamA.name} versus ${ctx.teamB.name}. ${pick(SYN.CLASH)}.`,
    (ctx) => `${ctx.teamA.mascot} versus ${ctx.teamB.mascot}. Top of the board.`,
    (ctx) => `${ctx.teamA.name}. ${ctx.teamB.name}. The big one.`,
    (ctx) => `${ctx.teamA.name} draws ${ctx.teamB.name}.`,

    // Seed-led
    (ctx) => (ctx.teamA.seedRank && ctx.teamB.seedRank)
      ? `#${ctx.teamA.seedRank} versus #${ctx.teamB.seedRank}. ${pick(SYN.CLASH)}.`
      : null,
    (ctx) => (ctx.teamA.seedRank === 1 && ctx.teamB.seedRank === 2)
      ? `#1 ${ctx.teamA.name}. #2 ${ctx.teamB.name}. Main event.`
      : null,
    (ctx) => (ctx.teamA.seedRank === 1 && ctx.teamB.seedRank === 2)
      ? `One versus two. ${ctx.teamA.name} hosts the conversation.`
      : null,

    // Record-led
    (ctx) => `${ctx.teamA.catRecord} versus ${ctx.teamB.catRecord}. Both teams playing for seeding.`,
    (ctx) => `Two of the three best records in the league. One week to settle it.`,
    (ctx) => `Top-three records meet at the top of the bracket.`,

    // Verb-led / weight-of-the-week
    (ctx) => `${ctx.teamA.name} carries the top seed in.`,
    (ctx) => `The standings come down to this.`,
    (ctx) => `${ctx.teamA.name} and ${ctx.teamB.name} have been on this collision course for a month.`,
    (ctx) => `${ctx.teamA.mascot} and ${ctx.teamB.mascot} share the top of the standings. The tiebreaker is on the field.`,

    // Stakes-aware
    (ctx) => (ctx.weeksLeftInRegularSeason !== undefined && ctx.weeksLeftInRegularSeason <= 3)
      ? `${plural(ctx.weeksLeftInRegularSeason, 'week')} left. The top seed runs through this game.`
      : null,
    (ctx) => (ctx.weeksLeftInRegularSeason !== undefined && ctx.weeksLeftInRegularSeason <= 2)
      ? `Two weeks left. The bye lives or dies right here.`
      : null,

    // Win-prob conditional (true coin flip vs lopsided projection)
    (ctx) => (Math.abs(ctx.teamA.winProb - 0.5) < 0.05)
      ? `Coin flip on paper. The cat math will decide it.`
      : null,
    (ctx) => (ctx.teamA.winProb >= 0.6)
      ? `${ctx.teamA.name} is the projected favorite. ${ctx.teamB.name} has the easier path to a flip.`
      : null,
    (ctx) => (ctx.teamB.winProb >= 0.6)
      ? `${ctx.teamB.name} carries the projection. ${ctx.teamA.name} has the home crowd.`
      : null,

    // Mascot identity-led
    (ctx) => `${ctx.teamA.mascot} versus ${ctx.teamB.mascot}. Pick a side.`,
    (ctx) => `${ctx.teamA.mascot}. ${ctx.teamB.mascot}. The chat is going to be loud.`,

    // Three-fragment rhythm
    (ctx) => `${ctx.teamA.name}. ${ctx.teamB.name}. The top of the standings, in one game.`,
    (ctx) => `One game. Two top seeds. A real tiebreaker.`,
    (ctx) => `${ctx.teamA.name} versus ${ctx.teamB.name}. The bye is on the table.`,

    // Champ-aware
    (ctx) => ctx.teamA.isDefendingChamp ? `Defending champ ${ctx.teamA.name} draws the only team chasing it.` : null,
    (ctx) => ctx.teamB.isDefendingChamp ? `${ctx.teamA.name} gets the defending champ. ${ctx.teamB.mascot} carries the belt in.` : null,

    // Series-aware (if series exists)
    (ctx) => ctx.series && ctx.series.totalMeetings >= 4
      ? `${ctx.teamA.name} and ${ctx.teamB.name} have history. ${plural(ctx.series.totalMeetings, 'meeting')} on the books.`
      : null,
    (ctx) => ctx.series?.lastMeeting
      ? `Last meeting was decided by one cat. The rematch carries more.`
      : null,

    // Top-cat collision
    (ctx) => (ctx.teamA.topCats[0] && ctx.teamB.topCats[0] && ctx.teamA.topCats[0] !== ctx.teamB.topCats[0])
      ? `${ctx.teamA.topCats[0]} versus ${ctx.teamB.topCats[0]}. Strength against strength.`
      : null,
    (ctx) => (ctx.teamA.topCats[0] && ctx.teamA.topCats[0] === ctx.teamB.topCats[0])
      ? `Both teams own ${ctx.teamA.topCats[0]}. One of them stops being the best at it this week.`
      : null,

    // Tone-setter
    (ctx) => `The kind of game the playoffs are built on.`,
    (ctx) => `${ctx.teamA.name} and ${ctx.teamB.name} have separated themselves. Now they separate from each other.`,
  ],
  bodies: [
    // Standings framing
    (ctx) => `${ctx.teamA.catRecord} versus ${ctx.teamB.catRecord} on the year. Both teams have been carrying the top of the standings for weeks. The winner sets the tiebreaker.`,
    (ctx) => `${ctx.teamA.name} and ${ctx.teamB.name} have traded the top spot since week 4. This is the first head-to-head of the season.`,
    (ctx) => `Two top-three records. One week. The bye comes down to this matchup and the schedule.`,

    // Strength vs strength
    (ctx) => (ctx.teamA.topCats[0] && ctx.teamB.topCats[0] && ctx.teamA.topCats[0] !== ctx.teamB.topCats[0])
      ? `${ctx.teamA.name} runs ${ctx.teamA.topCats[0]}. ${ctx.teamB.name} runs ${ctx.teamB.topCats[0]}. The other nine cats decide who wins the game.`
      : null,
    (ctx) => (ctx.teamA.topCats.length >= 2)
      ? `${ctx.teamA.mascot} wins ${ctx.teamA.topCats.slice(0, 2).join(' and ')} most weeks. ${ctx.teamB.mascot} has the counter on the pitching side.`
      : null,

    // Status-aware
    (ctx) => ctx.status === 'live' ? `${ctx.contestedCats.length} cats live. Both teams still have paths to flip it.` : null,
    (ctx) => ctx.status === 'coasting' && leaderName(ctx) ? `${leaderName(ctx)} has stretched the lead. ${trailerName(ctx)} needs the weekend.` : null,
    (ctx) => ctx.status === 'locked' ? `Already decided. ${leaderName(ctx)} took the head-to-head and the tiebreaker.` : null,

    // Days-left framing
    (ctx) => ctx.daysLeftInWeek >= 4 ? `${plural(ctx.daysLeftInWeek, 'day')} left. Most of the cats are still in motion.` : null,
    (ctx) => ctx.daysLeftInWeek === 2 ? `Two days left. The cat math is the whole game from here.` : null,
    (ctx) => ctx.daysLeftInWeek === 1 ? `One day left. Late Sunday decides it.` : null,

    // Series-aware
    (ctx) => ctx.series && ctx.series.totalMeetings >= 3
      ? `${ctx.series.allTimeRecord} all-time. The history is real. The standings make this one the loudest.`
      : null,
    (ctx) => ctx.series?.lastMeeting
      ? `${ctx.teamA.name} and ${ctx.teamB.name} last met in week ${ctx.series.lastMeeting.week}. The cat score was ${ctx.series.lastMeeting.catScore}. The rematch is bigger.`
      : null,

    // Champ angle
    (ctx) => ctx.teamA.isDefendingChamp
      ? `${ctx.teamA.name} is defending the title. ${ctx.teamB.name} is the team chasing it down. The standings reflect that.`
      : null,
    (ctx) => ctx.teamB.isDefendingChamp
      ? `${ctx.teamB.name} carries the belt. ${ctx.teamA.name} has been the better team for a month. The result settles the conversation.`
      : null,

    // Weeks-left framing
    (ctx) => (ctx.weeksLeftInRegularSeason !== undefined && ctx.weeksLeftInRegularSeason <= 3)
      ? `${plural(ctx.weeksLeftInRegularSeason, 'week')} left in the regular season. The first-round bye is on the table.`
      : null,
    (ctx) => (ctx.weeksLeftInRegularSeason !== undefined && ctx.weeksLeftInRegularSeason <= 2)
      ? `Two weeks left. A loss here costs ${trailerName(ctx)} the bye. A loss the other way costs ${leaderName(ctx)} the top seed.`
      : null,

    // Voice flavor
    (ctx) => `The kind of matchup the rest of the league is going to refresh.`,
    (ctx) => `Two of the loudest rosters in the league. One game. No filler.`,
    (ctx) => `Both teams have been carrying the standings. This is the first time they have to carry it against each other.`,

    // Cat-contest framing
    (ctx) => ctx.contestedCats.length >= 5 ? `${ctx.contestedCats.length} cats contested. The matchup will be decided in the last two days.` : null,
    (ctx) => ctx.contestedCats.length <= 2 && ctx.status === 'live' ? `Two cats still live. Everything else is decided.` : null,

    // Win-prob framing
    (ctx) => Math.abs(ctx.teamA.winProb - 0.5) < 0.06 ? `The projection has it inside three points. The lineups will decide the rest.` : null,
    (ctx) => ctx.teamA.winProb >= 0.65 ? `Projection favors ${ctx.teamA.name}. ${ctx.teamB.name} needs the upset to take the seeding tiebreaker.` : null,
    (ctx) => ctx.teamB.winProb >= 0.65 ? `Projection favors ${ctx.teamB.name}. ${ctx.teamA.name} needs the head-to-head to hold the top seed.` : null,
  ],
  subContext: [
    (ctx) => `${ctx.catRecord} through ${ctx.currentDay}. ${plural(ctx.daysLeftInWeek, 'day')} left.`,
    (ctx) => `${ctx.contestedCats.length} cats still ${pick(SYN.STILL_OPEN)}.`,
    (ctx) => `Live: ${ctx.catRecord}. ${plural(ctx.contestedCats.length, 'cat')} contested.`,
    (ctx) => ctx.daysLeftInWeek <= 2 ? `Late ${pick(SYN.LATE_WEEK)} decides it.` : null,
    (ctx) => (ctx.weeksLeftInRegularSeason !== undefined && ctx.weeksLeftInRegularSeason <= 3)
      ? `${plural(ctx.weeksLeftInRegularSeason, 'week')} left. Top seed in play.`
      : null,
    (ctx) => `${ctx.teamA.catRecord} versus ${ctx.teamB.catRecord} on the year.`,
    (ctx) => `Top seed on the line.`,
    (ctx) => ctx.series ? `${ctx.series.allTimeRecord} all-time.` : null,
    (ctx) => ctx.status === 'live' ? `Cats live. The week is open.` : null,
    (ctx) => ctx.status === 'coasting' ? `${leaderName(ctx)} pulling away.` : null,
  ],
}

/* ─────────────────────────────────────────────────────────────────
   KIND: HERO BUBBLE-VS-BUBBLE (playoff-line collision)
───────────────────────────────────────────────────────────────── */

const HERO_BUBBLE: MatchupsTemplate = {
  kind: 'hero-bubble-vs-bubble',
  eyebrows: [
    () => 'PLAYOFF LINE',
    () => 'BUBBLE WATCH',
    () => 'CUT LINE',
    () => 'MUST-WIN',
    () => 'ELIMINATION TONE',
    () => 'BUBBLE COLLISION',
    () => 'THE CUTOFF',
    () => 'SEASON-DEFINING',
    () => 'PLAYOFF MATH',
    (ctx) => (ctx.weeksLeftInRegularSeason !== undefined && ctx.weeksLeftInRegularSeason <= 2) ? 'MUST-WIN' : 'BUBBLE WATCH',
  ],
  headlines: [
    // Tight collision
    (ctx) => `${ctx.teamA.name} versus ${ctx.teamB.name}. Both on the line.`,
    (ctx) => `${ctx.teamA.mascot} and ${ctx.teamB.mascot} are both fighting for the same seat.`,
    (ctx) => `${ctx.teamA.name} draws ${ctx.teamB.name}. The bubble is the whole game.`,
    (ctx) => `Two bubble teams. One playoff seat.`,
    (ctx) => `Cut-line collision. ${ctx.teamA.name} versus ${ctx.teamB.name}.`,

    // Record-led
    (ctx) => `Both at ${ctx.teamA.catRecord}. One of them moves up.`,
    (ctx) => `${ctx.teamA.catRecord} and ${ctx.teamB.catRecord}. Tied on the line.`,
    (ctx) => `${ctx.teamA.name}: ${ctx.teamA.catRecord}. ${ctx.teamB.name}: ${ctx.teamB.catRecord}. The math is brutal.`,

    // Weeks-left aware (urgent)
    (ctx) => (ctx.weeksLeftInRegularSeason !== undefined && ctx.weeksLeftInRegularSeason <= 3)
      ? `${plural(ctx.weeksLeftInRegularSeason, 'week')} left. Loser falls out of the picture.`
      : null,
    (ctx) => (ctx.weeksLeftInRegularSeason !== undefined && ctx.weeksLeftInRegularSeason === 1)
      ? `One week left after this. The playoff seat lives or dies in seven days.`
      : null,
    (ctx) => (ctx.weeksLeftInRegularSeason !== undefined && ctx.weeksLeftInRegularSeason <= 2)
      ? `Two weeks left. A loss here closes the door.`
      : null,

    // Stakes-led
    (ctx) => `The playoff seat is on the table.`,
    (ctx) => `Whoever loses this is on the outside.`,
    (ctx) => `${ctx.teamA.name} or ${ctx.teamB.name}. One of them gets the last invite.`,
    (ctx) => `One of these teams is out by Monday.`,

    // Verb-led
    (ctx) => `${ctx.teamA.mascot} and ${ctx.teamB.mascot} both need this. Neither has won three in a row all year.`,
    (ctx) => `${ctx.teamA.name} has been on the line for a month. ${ctx.teamB.name} just got here.`,
    (ctx) => `Both teams need every cat.`,

    // Three-fragment rhythm
    (ctx) => `Same record. Same seed. One survives.`,
    (ctx) => `Two teams. One seat. The math is the whole game.`,
    (ctx) => `${ctx.teamA.name}. ${ctx.teamB.name}. The bubble breaks here.`,

    // Voice flavor
    (ctx) => `The kind of matchup where the loser starts shopping for next year.`,
    (ctx) => `Bubble teams play this game differently. Every cat is a season.`,
    (ctx) => `Nobody on the bubble is comfortable. ${ctx.teamA.name} and ${ctx.teamB.name} just got the worst draw.`,

    // Cat-collision aware
    (ctx) => (ctx.teamA.topCats[0] && ctx.teamB.bleedingCats.includes(ctx.teamA.topCats[0]))
      ? `${ctx.teamA.name} runs ${ctx.teamA.topCats[0]}. ${ctx.teamB.name} bleeds it. The leverage is there.`
      : null,
    (ctx) => (ctx.teamB.topCats[0] && ctx.teamA.bleedingCats.includes(ctx.teamB.topCats[0]))
      ? `${ctx.teamB.name} runs ${ctx.teamB.topCats[0]}. ${ctx.teamA.name} bleeds it. The leverage cuts the other way.`
      : null,

    // Win-prob conditional
    (ctx) => Math.abs(ctx.teamA.winProb - 0.5) < 0.05 ? `Projection has it inside the margin. Whoever wants it more wins it.` : null,

    // History-aware
    (ctx) => ctx.series && ctx.series.totalMeetings >= 3
      ? `${ctx.teamA.name} and ${ctx.teamB.name} have history. None of it was this loud.`
      : null,

    // Quiet-honest variant
    (ctx) => `Nothing is settled until ${ctx.currentDay === 'Sun' ? 'tonight' : 'Sunday'}.`,
  ],
  bodies: [
    // Standings reality
    (ctx) => `${ctx.teamA.name} sits at ${ctx.teamA.catRecord}. ${ctx.teamB.name} sits at ${ctx.teamB.catRecord}. Both teams are inside two games of the cut line.`,
    (ctx) => `Both teams have been within a game of the playoff seat for a month. This is the head-to-head that breaks the tie.`,
    (ctx) => `${ctx.teamA.name} and ${ctx.teamB.name} have the same record and the same schedule strength. The math gives them this one game to settle it.`,

    // Weeks-left
    (ctx) => (ctx.weeksLeftInRegularSeason !== undefined && ctx.weeksLeftInRegularSeason <= 3)
      ? `${plural(ctx.weeksLeftInRegularSeason, 'week')} left in the regular season. The loser falls behind in the tiebreakers. The winner can sit on it.`
      : null,
    (ctx) => (ctx.weeksLeftInRegularSeason !== undefined && ctx.weeksLeftInRegularSeason <= 2)
      ? `Two weeks left. A loss here means winning out is the only path.`
      : null,
    (ctx) => (ctx.weeksLeftInRegularSeason !== undefined && ctx.weeksLeftInRegularSeason === 1)
      ? `The last regular-season matchup either team will play with the seat in their own hands.`
      : null,

    // Status-aware live state
    (ctx) => ctx.status === 'live' ? `${ctx.contestedCats.length} cats still live. Neither team can let one of them go.` : null,
    (ctx) => ctx.status === 'coasting' ? `${leaderName(ctx)} has separated. ${trailerName(ctx)} needs a weekend.` : null,
    (ctx) => ctx.status === 'locked' ? `Decided. ${leaderName(ctx)} took the seat for now. ${trailerName(ctx)} is on the outside.` : null,

    // Days-left
    (ctx) => ctx.daysLeftInWeek === 1 ? `One day left. The playoff seat comes down to Sunday.` : null,
    (ctx) => ctx.daysLeftInWeek === 2 ? `Two days left. Both rotations turn over once more.` : null,

    // Strength / weakness leverage
    (ctx) => (ctx.teamA.topCats[0] && ctx.teamB.bleedingCats.includes(ctx.teamA.topCats[0]))
      ? `${ctx.teamA.name} owns ${ctx.teamA.topCats[0]} and ${ctx.teamB.name} bleeds it. The path to a comfortable win is there if ${ctx.teamA.name} stacks the slot.`
      : null,
    (ctx) => (ctx.teamB.topCats[0] && ctx.teamA.bleedingCats.includes(ctx.teamB.topCats[0]))
      ? `${ctx.teamB.name} owns ${ctx.teamB.topCats[0]} and ${ctx.teamA.name} bleeds it. The leverage cuts the other way.`
      : null,

    // Series-aware
    (ctx) => ctx.series && ctx.series.totalMeetings >= 3
      ? `${ctx.series.allTimeRecord} all-time between them. None of those games carried what this one does.`
      : null,

    // Honest, quieter
    (ctx) => `Two teams that have been hanging on for weeks. One of them lets go on Sunday.`,
    (ctx) => `Nothing about either roster says lock. Everything about the standings says this is the game.`,
    (ctx) => `${ctx.teamA.name} versus ${ctx.teamB.name} is the matchup the rest of the league is rooting against. A loss for either of them clears a seat.`,

    // Win-prob
    (ctx) => Math.abs(ctx.teamA.winProb - 0.5) < 0.06 ? `The projection has it inside two points. The model agrees with the eye test.` : null,
    (ctx) => ctx.teamA.winProb >= 0.6 ? `${ctx.teamA.name} is the projected favorite. ${ctx.teamB.name} needs a cat to flip late.` : null,
    (ctx) => ctx.teamB.winProb >= 0.6 ? `${ctx.teamB.name} carries the projection. ${ctx.teamA.name} needs the weekend lineup to play up.` : null,

    // Contested cats framing
    (ctx) => ctx.contestedCats.length >= 5 ? `${ctx.contestedCats.length} cats still in play. Either team can win or lose the matchup tonight.` : null,
  ],
  subContext: [
    (ctx) => `Both at ${ctx.teamA.catRecord}.`,
    (ctx) => ctx.weeksLeftInRegularSeason !== undefined ? `${plural(ctx.weeksLeftInRegularSeason, 'week')} left.` : null,
    (ctx) => `Loser falls out.`,
    (ctx) => `Playoff seat on the line.`,
    (ctx) => `${ctx.catRecord} live. ${plural(ctx.contestedCats.length, 'cat')} ${pick(SYN.STILL_OPEN)}.`,
    (ctx) => ctx.daysLeftInWeek <= 2 ? `${pick(SYN.LATE_WEEK)} decides it.` : null,
    (ctx) => `Same record. Same need.`,
    (ctx) => `Cut line, head-to-head.`,
  ],
}

/* ─────────────────────────────────────────────────────────────────
   KIND: HERO CHAMP-COLLAPSING (defending champ in trouble)
───────────────────────────────────────────────────────────────── */

const HERO_CHAMP_COLLAPSING: MatchupsTemplate = {
  kind: 'hero-champ-collapsing',
  eyebrows: [
    () => 'CHAMP IN TROUBLE',
    () => 'THE DYNASTY CRACKS',
    () => 'CHAMP ON THE ROPES',
    () => 'TITLE WOBBLE',
    () => 'KING UNDER PRESSURE',
    () => 'CRACKS IN THE THRONE',
    () => 'CHAMP STRESS TEST',
    () => 'DYNASTY WATCH',
    () => 'BELT IN PLAY',
    (ctx) => (ctx.teamA.isDefendingChamp || ctx.teamB.isDefendingChamp) ? 'CHAMP ON THE ROPES' : 'TITLE WOBBLE',
  ],
  headlines: [
    // Champ-named
    (ctx) => ctx.teamA.isDefendingChamp ? `${ctx.teamA.name} is bleeding.` : null,
    (ctx) => ctx.teamB.isDefendingChamp ? `${ctx.teamB.name} is bleeding.` : null,
    (ctx) => ctx.teamA.isDefendingChamp ? `${ctx.teamA.name} just lost ${ctx.teamA.topCats[0] ?? 'its specialty'} two weeks running.` : null,
    (ctx) => ctx.teamB.isDefendingChamp ? `${ctx.teamB.name} just lost ${ctx.teamB.topCats[0] ?? 'its specialty'} two weeks running.` : null,

    // Generic-champ
    (ctx) => `The dynasty has ${pick(SYN.COLLAPSE)}.`,
    (ctx) => `The champ is on the ropes.`,
    (ctx) => `The belt is in play.`,
    (ctx) => `The throne is shaking.`,

    // Specialty-loss aware
    (ctx) => ctx.teamA.isDefendingChamp && ctx.teamA.topCats[0]
      ? `${ctx.teamA.name} could lose ${ctx.teamA.topCats[0]} this week. Its specialty cat. That has never happened.`
      : null,
    (ctx) => ctx.teamB.isDefendingChamp && ctx.teamB.topCats[0]
      ? `${ctx.teamB.name} could lose ${ctx.teamB.topCats[0]} this week. The cat it owned all of last year.`
      : null,
    (ctx) => ctx.teamA.isDefendingChamp && ctx.teamA.bleedingCats.length
      ? `${ctx.teamA.name} is bleeding ${ctx.teamA.bleedingCats.slice(0, 2).join(' and ')}. The cracks are real.`
      : null,

    // Seed-fall framing
    (ctx) => ctx.teamA.isDefendingChamp && (ctx.teamA.seedRank ?? 0) >= 5
      ? `${ctx.teamA.name} sits at #${ctx.teamA.seedRank}. Six spots since week 1.`
      : null,
    (ctx) => ctx.teamB.isDefendingChamp && (ctx.teamB.seedRank ?? 0) >= 5
      ? `${ctx.teamB.name} has slid to #${ctx.teamB.seedRank}. The defending champ outside the bye picture.`
      : null,

    // Punchy two-fragment
    (ctx) => `The champ is in trouble. The roster has not bailed out in three weeks.`,
    (ctx) => `From #1 to outside the bye. The belt is on the table.`,

    // Opponent-aware
    (ctx) => (ctx.teamA.isDefendingChamp && !ctx.teamB.isDefendingChamp)
      ? `${ctx.teamB.name} draws the wounded champ.`
      : null,
    (ctx) => (ctx.teamB.isDefendingChamp && !ctx.teamA.isDefendingChamp)
      ? `${ctx.teamA.name} draws the wounded champ.`
      : null,
    (ctx) => (ctx.teamA.isDefendingChamp && !ctx.teamB.isDefendingChamp)
      ? `${ctx.teamB.name} gets a shot at the title-holder at its lowest.`
      : null,

    // Standings-record framing
    (ctx) => ctx.teamA.isDefendingChamp ? `${ctx.teamA.name}: ${ctx.teamA.catRecord} on the year. That is not a champion's pace.` : null,
    (ctx) => ctx.teamB.isDefendingChamp ? `${ctx.teamB.name}: ${ctx.teamB.catRecord}. That is not a champion's pace.` : null,

    // Verb-led
    (ctx) => `The champ has slipped.`,
    (ctx) => `The dynasty looks small.`,
    (ctx) => `The throne is empty for the first time all year.`,

    // Voice flavor / honest
    (ctx) => `Last year's roster is not this year's roster.`,
    (ctx) => `The league smelled blood three weeks ago. This matchup is the kill shot.`,

    // Three-fragment rhythm
    (ctx) => `Champ. Bleeding. Drawn into the wrong matchup.`,
    (ctx) => `From the throne. To the bubble. In ten weeks.`,

    // Honest-quiet (when there's still season)
    (ctx) => (ctx.weeksLeftInRegularSeason !== undefined && ctx.weeksLeftInRegularSeason >= 4)
      ? `Still time to reset. Not after this matchup.`
      : null,
  ],
  bodies: [
    // Champ-aware opener
    (ctx) => ctx.teamA.isDefendingChamp
      ? `${ctx.teamA.name} has not looked like the champion since week 4. The record is ${ctx.teamA.catRecord}. The seed has fallen to #${ctx.teamA.seedRank ?? '?'}. ${ctx.teamB.name} gets a shot at the title-holder at its lowest.`
      : null,
    (ctx) => ctx.teamB.isDefendingChamp
      ? `${ctx.teamB.name} carried the belt in. The record reads ${ctx.teamB.catRecord}. ${ctx.teamA.name} drew the matchup nobody else wanted, against a team nobody else fears.`
      : null,

    // Specialty-cat loss
    (ctx) => ctx.teamA.isDefendingChamp && ctx.teamA.topCats[0]
      ? `${ctx.teamA.name} owned ${ctx.teamA.topCats[0]} all of last year. It could lose that cat this week. The roster has not been bailing it out.`
      : null,
    (ctx) => ctx.teamB.isDefendingChamp && ctx.teamB.topCats[0]
      ? `${ctx.teamB.name} ran ${ctx.teamB.topCats[0]} into the ground last year. This week it is conceding it. The chase tells the story.`
      : null,

    // Standings collapse framing
    (ctx) => ctx.teamA.isDefendingChamp && (ctx.teamA.seedRank ?? 0) >= 5
      ? `From #1 in week 1 to #${ctx.teamA.seedRank} this morning. Six places in eight weeks. That is a collapse.`
      : null,
    (ctx) => ctx.teamB.isDefendingChamp && (ctx.teamB.seedRank ?? 0) >= 5
      ? `${ctx.teamB.name} has slid out of the bye picture. The conversation has changed.`
      : null,

    // Live-state aware
    (ctx) => ctx.status === 'live' ? `${ctx.contestedCats.length} cats still live this week. The champ needs a weekend to keep the head above water.` : null,
    (ctx) => ctx.status === 'coasting' && (ctx.teamA.isDefendingChamp || ctx.teamB.isDefendingChamp)
      ? `${trailerName(ctx)} has been on the wrong side all week. The champ needs a flip to keep the seeding from falling further.`
      : null,
    (ctx) => ctx.status === 'locked' && (ctx.teamA.isDefendingChamp || ctx.teamB.isDefendingChamp)
      ? `Already decided. The champ took the loss. The seeding follows.`
      : null,

    // Opponent flavor
    (ctx) => (ctx.teamA.isDefendingChamp && !ctx.teamB.isDefendingChamp)
      ? `${ctx.teamB.name} is not a top-three roster. That is what makes the matchup loud. The champ is supposed to handle this lineup.`
      : null,
    (ctx) => (ctx.teamB.isDefendingChamp && !ctx.teamA.isDefendingChamp)
      ? `${ctx.teamA.name} is the matchup the champ should not be losing. It is losing anyway.`
      : null,

    // Bleeding-cats framing
    (ctx) => ctx.teamA.isDefendingChamp && ctx.teamA.bleedingCats.length >= 2
      ? `${ctx.teamA.name} is bleeding ${ctx.teamA.bleedingCats.slice(0, 2).join(' and ')}. The same cats it owned last year. The roster has not turned over enough.`
      : null,
    (ctx) => ctx.teamB.isDefendingChamp && ctx.teamB.bleedingCats.length >= 2
      ? `${ctx.teamB.name} is bleeding ${ctx.teamB.bleedingCats.slice(0, 2).join(' and ')}. The roster that won the title is not the roster that wins this week.`
      : null,

    // Weeks-left framing
    (ctx) => (ctx.weeksLeftInRegularSeason !== undefined && ctx.weeksLeftInRegularSeason <= 3)
      ? `${plural(ctx.weeksLeftInRegularSeason, 'week')} left in the regular season. The champ cannot afford another loss like this.`
      : null,
    (ctx) => (ctx.weeksLeftInRegularSeason !== undefined && ctx.weeksLeftInRegularSeason <= 2)
      ? `Two weeks left. A loss here puts the bye out of reach.`
      : null,

    // Voice flavor / honest closes
    (ctx) => `The dynasty does not look like a dynasty. The schedule does not get easier.`,
    (ctx) => `The roster looks the same. The results do not. That is the harder kind of collapse.`,
    (ctx) => `Nobody in the league is rooting for the champ. The matchup writes itself.`,

    // Contested-cats framing
    (ctx) => ctx.contestedCats.length >= 5 ? `${ctx.contestedCats.length} cats contested. The champ has a path. Not an easy one.` : null,
  ],
  subContext: [
    (ctx) => (ctx.teamA.isDefendingChamp && ctx.teamA.seedRank) ? `#1 to #${ctx.teamA.seedRank} since week 1.` : null,
    (ctx) => (ctx.teamB.isDefendingChamp && ctx.teamB.seedRank) ? `#1 to #${ctx.teamB.seedRank} since week 1.` : null,
    (ctx) => ctx.teamA.isDefendingChamp ? `${ctx.teamA.catRecord} on the year.` : null,
    (ctx) => ctx.teamB.isDefendingChamp ? `${ctx.teamB.catRecord} on the year.` : null,
    (ctx) => `Belt in play.`,
    (ctx) => `Champ on the ropes.`,
    (ctx) => ctx.weeksLeftInRegularSeason !== undefined ? `${plural(ctx.weeksLeftInRegularSeason, 'week')} left.` : null,
    (ctx) => ctx.status === 'live' ? `${plural(ctx.contestedCats.length, 'cat')} live.` : null,
    (ctx) => `The dynasty cracks.`,
  ],
}

/* ─────────────────────────────────────────────────────────────────
   KIND: HERO SWEEP-IN-PROGRESS (one team dominating most cats)
───────────────────────────────────────────────────────────────── */

const HERO_SWEEP: MatchupsTemplate = {
  kind: 'hero-sweep-in-progress',
  eyebrows: [
    () => 'SWEEP WATCH',
    () => 'RUNNING IT',
    () => 'TOTAL CONTROL',
    () => 'DOMINANT WEEK',
    () => 'NO RESISTANCE',
    () => 'BOX SCORE ART',
    () => 'CLINIC',
    () => 'LOPSIDED',
    () => 'DOING AS IT PLEASES',
    (ctx) => ctx.status === 'locked' ? 'LOCKED' : 'SWEEP WATCH',
  ],
  headlines: [
    // Score-led
    (ctx) => `${leaderName(ctx)} is ${ctx.catRecord} with ${plural(ctx.daysLeftInWeek, 'day')} left.`,
    (ctx) => `${ctx.catRecord} in favor of ${leaderName(ctx)}. ${plural(ctx.daysLeftInWeek, 'day')} to go.`,
    (ctx) => `${leaderName(ctx)} is ${pick(SYN.SWEEP_VERBS)}.`,
    (ctx) => `${leaderName(ctx)}: ${ctx.catRecord}. Lopsided.`,

    // Opponent collapse
    (ctx) => `${trailerName(ctx)} has not contested a cat since Tuesday.`,
    (ctx) => `${trailerName(ctx)} cannot find a category.`,
    (ctx) => `${leaderName(ctx)} has the box score. ${trailerName(ctx)} has none of it.`,

    // Days-left lock framing
    (ctx) => ctx.daysLeftInWeek === 1 ? `${leaderName(ctx)} runs it. One day left. The math is done.` : null,
    (ctx) => ctx.daysLeftInWeek === 2 ? `${leaderName(ctx)} is ${ctx.catRecord} with two days left. The lock is coming.` : null,
    (ctx) => ctx.daysLeftInWeek >= 3 ? `${leaderName(ctx)} is ${ctx.catRecord} with ${plural(ctx.daysLeftInWeek, 'day')} left. Already past the path.` : null,

    // Status-aware
    (ctx) => ctx.status === 'locked' ? `${leaderName(ctx)} locked it. Sweep watch the rest of the way.` : null,
    (ctx) => ctx.status === 'coasting' ? `${leaderName(ctx)} is coasting. ${trailerName(ctx)} stopped pushing.` : null,

    // Punchy fragments
    (ctx) => `${leaderName(ctx)}. Total control.`,
    (ctx) => `${leaderName(ctx)} is in the driver seat.`,
    (ctx) => `${leaderName(ctx)} owns the week.`,

    // Three-fragment rhythm
    (ctx) => `${leaderName(ctx)}. ${ctx.catRecord}. Done.`,
    (ctx) => `${leaderName(ctx)} hit. ${trailerName(ctx)} didn't answer. The week is the week.`,

    // Magnitude / standings
    (ctx) => (ctx.teamA.seedRank === 1 || ctx.teamB.seedRank === 1)
      ? `${leaderName(ctx)} is reminding the league why it is the #1 seed.`
      : null,
    (ctx) => leaderName(ctx) === ctx.teamA.name && (ctx.teamA.seedRank ?? 0) >= 7
      ? `${ctx.teamA.name} just put up the loudest week of its season. Eight cats and counting.`
      : null,

    // Contested-cat aware (only a couple still live)
    (ctx) => ctx.contestedCats.length <= 2 && ctx.status === 'live'
      ? `${plural(ctx.contestedCats.length, 'cat')} left. ${leaderName(ctx)} already has the matchup.`
      : null,
    (ctx) => ctx.contestedCats.length === 0
      ? `Every cat decided. ${leaderName(ctx)} ran it.`
      : null,

    // Specialty-amplification
    (ctx) => (leaderName(ctx) === ctx.teamA.name && ctx.teamA.topCats[0])
      ? `${ctx.teamA.name} is running ${ctx.teamA.topCats[0]} the way it always does. The rest of the cats came with it.`
      : null,
    (ctx) => (leaderName(ctx) === ctx.teamB.name && ctx.teamB.topCats[0])
      ? `${ctx.teamB.name} is running ${ctx.teamB.topCats[0]}. The rest followed.`
      : null,

    // Honest-honest
    (ctx) => `${leaderName(ctx)} did not need a hero. The whole roster showed up.`,
    (ctx) => `${trailerName(ctx)} did not pitch. ${trailerName(ctx)} did not hit. The week was over by Friday.`,

    // Voice flavor
    (ctx) => `The kind of week that pads the seeding tiebreakers.`,
    (ctx) => `${leaderName(ctx)} is going to be unbeatable on Monday morning.`,
  ],
  bodies: [
    // Score / state framing
    (ctx) => `${ctx.catRecord} in favor of ${leaderName(ctx)} with ${plural(ctx.daysLeftInWeek, 'day')} left. ${trailerName(ctx)} would need a sweep of every remaining cat to flip the matchup.`,
    (ctx) => `${leaderName(ctx)} has ${ctx.decidedCats.length} cats locked. ${trailerName(ctx)} has been chasing since Tuesday.`,
    (ctx) => `${leaderName(ctx)} took the early-week lineup, padded it in the middle, and never let ${trailerName(ctx)} pick a cat.`,

    // Days-left
    (ctx) => ctx.daysLeftInWeek === 1 ? `One day left. The math will not bend.` : null,
    (ctx) => ctx.daysLeftInWeek === 2 ? `Two days left. ${trailerName(ctx)} needs both of them and a sweep.` : null,
    (ctx) => ctx.daysLeftInWeek >= 3 ? `${plural(ctx.daysLeftInWeek, 'day')} left. The math went out the window on Wednesday.` : null,

    // Status-aware
    (ctx) => ctx.status === 'locked' ? `Already over. The matchup locked sometime before the late games.` : null,
    (ctx) => ctx.status === 'coasting' ? `${leaderName(ctx)} stopped pushing. The lead was already too big to chase.` : null,

    // Punted-cat aware
    (ctx) => ctx.puntedCats.length > 0
      ? `${trailerName(ctx)} has conceded ${ctx.puntedCats.slice(0, 2).join(' and ')}. The week's plan was already smaller than the matchup.`
      : null,

    // Specialty padding
    (ctx) => leaderName(ctx) === ctx.teamA.name && ctx.teamA.topCats.length >= 2
      ? `${ctx.teamA.name} swept its top two cats by Wednesday. The rest of the board came along for the ride.`
      : null,
    (ctx) => leaderName(ctx) === ctx.teamB.name && ctx.teamB.topCats.length >= 2
      ? `${ctx.teamB.name} owned ${ctx.teamB.topCats.slice(0, 2).join(' and ')} by midweek. The supporting cast filled in the rest.`
      : null,

    // Trailer collapse
    (ctx) => ctx.teamA.name === trailerName(ctx) && ctx.teamA.bleedingCats.length
      ? `${ctx.teamA.name} is losing the cats it bleeds. ${ctx.teamA.bleedingCats.slice(0, 2).join(' and ')} were never going to come back.`
      : null,
    (ctx) => ctx.teamB.name === trailerName(ctx) && ctx.teamB.bleedingCats.length
      ? `${ctx.teamB.name} is losing the cats it bleeds. ${ctx.teamB.bleedingCats.slice(0, 2).join(' and ')} were never going to come back.`
      : null,

    // Voice flavor
    (ctx) => `The kind of matchup that pads the seeding tiebreakers without ever feeling competitive.`,
    (ctx) => `${leaderName(ctx)} did not need a single big game. The whole roster showed up.`,
    (ctx) => `${trailerName(ctx)} needed bats and a rotation. Got neither.`,

    // Standings-aware
    (ctx) => (leaderName(ctx) === ctx.teamA.name && (ctx.teamA.seedRank ?? 99) <= 2)
      ? `${ctx.teamA.name} reminded the league why it sits at #${ctx.teamA.seedRank}. The supporting cast was the difference.`
      : null,
    (ctx) => (leaderName(ctx) === ctx.teamB.name && (ctx.teamB.seedRank ?? 99) <= 2)
      ? `${ctx.teamB.name} is playing top-seed baseball. The matchup ran out of fight by Friday.`
      : null,

    // Contested-cat closer
    (ctx) => ctx.contestedCats.length === 0
      ? `Every category decided. The matchup is the matchup.`
      : null,
    (ctx) => ctx.contestedCats.length <= 2 && ctx.status === 'live'
      ? `${plural(ctx.contestedCats.length, 'cat')} still nominally live. Neither of them changes the outcome.`
      : null,
  ],
  subContext: [
    (ctx) => `${ctx.catRecord}, ${plural(ctx.daysLeftInWeek, 'day')} left.`,
    (ctx) => `${leaderName(ctx)} running it.`,
    (ctx) => ctx.status === 'locked' ? `Matchup locked.` : null,
    (ctx) => ctx.status === 'coasting' ? `${leaderName(ctx)} coasting.` : null,
    (ctx) => `${plural(ctx.decidedCats.length, 'cat')} locked.`,
    (ctx) => ctx.puntedCats.length > 0 ? `${trailerName(ctx)} conceded ${plural(ctx.puntedCats.length, 'cat')}.` : null,
    (ctx) => `Total control.`,
    (ctx) => `Lopsided week.`,
  ],
}

/* ─────────────────────────────────────────────────────────────────
   KIND: HERO CLOSEST-RACE (tight, every cat contested)
───────────────────────────────────────────────────────────────── */

const HERO_CLOSEST_RACE: MatchupsTemplate = {
  kind: 'hero-closest-race',
  eyebrows: [
    () => 'COIN FLIP',
    () => 'INSIDE THE MARGIN',
    () => 'GOING TO THE WIRE',
    () => 'ALL CATS IN PLAY',
    () => 'CLOSEST RACE',
    () => 'NOTHING DECIDED',
    () => 'NAIL-BITER',
    () => 'NECK AND NECK',
    () => 'LATE-SUNDAY ENERGY',
    () => 'TIGHT',
  ],
  headlines: [
    // Score-led
    (ctx) => `${ctx.catRecord} with ${plural(ctx.contestedCats.length, 'cat')} contested.`,
    (ctx) => `${ctx.catRecord}. ${plural(ctx.contestedCats.length, 'cat')} still live.`,
    (ctx) => `${ctx.catRecord} and ${pick(SYN.TIGHT_RACE)}.`,

    // Coin-flip framing
    (ctx) => `Either way, it's late Sunday.`,
    (ctx) => `Neither team has separated. Neither team will.`,
    (ctx) => `${ctx.teamA.name} versus ${ctx.teamB.name}. Coin flip.`,
    (ctx) => `Inside the margin. Both teams hanging on.`,

    // Day-aware urgency
    (ctx) => ctx.daysLeftInWeek === 1 ? `One day left. ${ctx.contestedCats.length} cats live.` : null,
    (ctx) => ctx.daysLeftInWeek === 2 ? `Two days left. Nothing decided.` : null,
    (ctx) => ctx.daysLeftInWeek === 0 ? `Last lineup of the week. Whoever blinks loses.` : null,

    // Win-prob inside margin
    (ctx) => Math.abs(ctx.teamA.winProb - 0.5) < 0.04 ? `${(ctx.teamA.winProb * 100).toFixed(0)} versus ${((1 - ctx.teamA.winProb) * 100).toFixed(0)}. Projection says coin flip.` : null,

    // Contested-cats math
    (ctx) => ctx.contestedCats.length >= 6 ? `${ctx.contestedCats.length} cats still up. Every one of them moves the needle.` : null,
    (ctx) => ctx.contestedCats.length === 11 ? `Eleven cats contested. Nothing has been settled.` : null,

    // Punchy two-fragment
    (ctx) => `${ctx.teamA.name} versus ${ctx.teamB.name}. ${pick(SYN.TIGHT_RACE)}.`,
    (ctx) => `${ctx.catRecord} on Sunday morning. Anyone's matchup.`,

    // Voice flavor
    (ctx) => `The matchup nobody on either side wants to refresh.`,
    (ctx) => `${ctx.teamA.mascot} and ${ctx.teamB.mascot} keep trading cats. Nobody is in front for long.`,
    (ctx) => `Every lineup decision matters. Nothing is buffer.`,

    // Three-fragment rhythm
    (ctx) => `${ctx.teamA.name}. ${ctx.teamB.name}. ${ctx.contestedCats.length} cats and no margin.`,
    (ctx) => `Tight. Live. Sunday.`,

    // Status-aware
    (ctx) => ctx.status === 'live' ? `${ctx.catRecord} live. ${plural(ctx.contestedCats.length, 'cat')} ${pick(SYN.STILL_OPEN)}.` : null,

    // Series-aware
    (ctx) => ctx.series?.lastMeeting?.catScore
      ? `${ctx.series.lastMeeting.catScore} the last time. Tight then. Tighter now.`
      : null,
    (ctx) => ctx.series && ctx.series.trend.toLowerCase().includes('tied')
      ? `Series even. This week looks the same.`
      : null,

    // Honest-quiet
    (ctx) => `Nothing about this matchup is decided. That is the headline.`,
    (ctx) => `${ctx.teamA.name} versus ${ctx.teamB.name}. The kind of week that decides a tiebreaker.`,

    // Bubble-style
    (ctx) => (ctx.teamA.isOnBubble || ctx.teamB.isOnBubble) ? `Tight matchup. Loud stakes. Bubble teams cannot afford the wire.` : null,
  ],
  bodies: [
    // Cat-math primary
    (ctx) => `${ctx.catRecord} on the live board with ${plural(ctx.contestedCats.length, 'cat')} still contested. Both teams have weekend rotations. Both teams have bullpens. Neither team has separation.`,
    (ctx) => `${ctx.teamA.mascot} has been trading cats with ${ctx.teamB.mascot} since Wednesday. ${ctx.contestedCats.length} are still up. The lineup choices are the whole game.`,
    (ctx) => `${ctx.contestedCats.length} cats live. Inside the margin in every one of them.`,

    // Days-left
    (ctx) => ctx.daysLeftInWeek <= 2 ? `${plural(ctx.daysLeftInWeek, 'day')} left. The matchup runs through Sunday night.` : null,
    (ctx) => ctx.daysLeftInWeek === 1 ? `One day left. Whoever stacks the right starts wins the matchup.` : null,
    (ctx) => ctx.daysLeftInWeek === 0 ? `Final lineup of the week. The matchup will move with every at-bat.` : null,

    // Win-prob framing
    (ctx) => Math.abs(ctx.teamA.winProb - 0.5) < 0.05 ? `The projection has it inside two points. The model and the box score agree.` : null,
    (ctx) => Math.abs(ctx.teamA.winProb - 0.5) < 0.08 ? `Projection is inside four. Either team can win, neither team can rest.` : null,

    // Both-strong framing
    (ctx) => (ctx.teamA.topCats[0] && ctx.teamB.topCats[0] && ctx.teamA.topCats[0] !== ctx.teamB.topCats[0])
      ? `${ctx.teamA.name} owns ${ctx.teamA.topCats[0]}. ${ctx.teamB.name} owns ${ctx.teamB.topCats[0]}. The other nine cats are the matchup.`
      : null,
    (ctx) => (ctx.teamA.topCats[0] && ctx.teamA.topCats[0] === ctx.teamB.topCats[0])
      ? `Both rosters fight for ${ctx.teamA.topCats[0]}. That cat could swing the whole week.`
      : null,

    // Bubble flavor
    (ctx) => (ctx.teamA.isOnBubble && ctx.teamB.isOnBubble)
      ? `Both teams sit on the playoff line. Nothing about this matchup is comfortable.`
      : null,
    (ctx) => (ctx.teamA.isOnBubble && !ctx.teamB.isOnBubble)
      ? `${ctx.teamA.name} is fighting for the seat. ${ctx.teamB.name} is fighting for the seeding. The stakes do not match. The score does.`
      : null,

    // Series-aware
    (ctx) => ctx.series && ctx.series.totalMeetings >= 3
      ? `${ctx.series.allTimeRecord} all-time. None of the previous meetings were decided by more than a cat.`
      : null,
    (ctx) => ctx.series?.lastMeeting
      ? `Last meeting ended ${ctx.series.lastMeeting.catScore}. The rematch is the same temperature.`
      : null,

    // Voice flavor closes
    (ctx) => `The kind of matchup that gets watched in the group chat, not on the box score.`,
    (ctx) => `Nothing about this matchup is comfortable. That is the point.`,
    (ctx) => `${ctx.teamA.name} versus ${ctx.teamB.name}. Tight on paper. Tighter on the wire.`,

    // Contested-cat closer
    (ctx) => ctx.contestedCats.length === 11 ? `All eleven cats still live. The matchup has not started in earnest.` : null,
    (ctx) => ctx.contestedCats.length <= 4 ? `${plural(ctx.contestedCats.length, 'cat')} live and a tied score. Every one of them is the matchup.` : null,
  ],
  subContext: [
    (ctx) => `${ctx.catRecord}, ${plural(ctx.contestedCats.length, 'cat')} live.`,
    (ctx) => `${plural(ctx.contestedCats.length, 'cat')} ${pick(SYN.STILL_OPEN)}.`,
    (ctx) => `Inside the margin.`,
    (ctx) => `Coin flip on paper.`,
    (ctx) => ctx.daysLeftInWeek <= 2 ? `${pick(SYN.LATE_WEEK)} decides it.` : null,
    (ctx) => `Nothing settled.`,
    (ctx) => Math.abs(ctx.teamA.winProb - 0.5) < 0.05 ? `Projection: ${(ctx.teamA.winProb * 100).toFixed(0)} versus ${((1 - ctx.teamA.winProb) * 100).toFixed(0)}.` : null,
    (ctx) => `${plural(ctx.daysLeftInWeek, 'day')} left.`,
  ],
}

/* ─────────────────────────────────────────────────────────────────
   KIND: SUB-HEADLINE (day-anchored, 3-fragment, under page title)
───────────────────────────────────────────────────────────────── */

const SUB_HEADLINE: MatchupsTemplate = {
  kind: 'sub-headline',
  eyebrows: [
    () => '',
  ],
  headlines: [
    // Day-anchored, three-fragment rhythm
    (ctx) => `${ctx.currentDay} is ${pick(SYN.RESHAPING)}. Daily scores. Live cat math.`,
    (ctx) => `${ctx.currentDay} sets the tone. Live records. ${plural(ctx.dayCounts?.liveCount ?? 0, 'matchup')} on the wire.`,
    (ctx) => `${ctx.currentDay} on the board. ${plural(ctx.dayCounts?.liveCount ?? 0, 'live matchup')}. Cat math, live.`,
    (ctx) => `${ctx.currentDay} mornings move the standings. Live cats. Open week.`,
    (ctx) => `${ctx.currentDay}. ${plural(ctx.dayCounts?.liveCount ?? 0, 'matchup')} live. ${plural(ctx.dayCounts?.finalCount ?? 0, 'cat')} already decided.`,

    // Day-bucket conditional flavor
    (ctx) => (['Mon', 'Tue'].includes(ctx.currentDay))
      ? `Early-week board. ${plural(ctx.dayCounts?.liveCount ?? 0, 'matchup')} live. Most cats still open.`
      : null,
    (ctx) => ctx.currentDay === 'Wed'
      ? `Midweek. The rotations turn over. The cat math gets real.`
      : null,
    (ctx) => ctx.currentDay === 'Thu'
      ? `Thursday is reshaping the week. Daily scores. Live cat math.`
      : null,
    (ctx) => (['Fri', 'Sat'].includes(ctx.currentDay))
      ? `${ctx.currentDay} sets the weekend. ${plural(ctx.dayCounts?.liveCount ?? 0, 'matchup')} on the wire.`
      : null,
    (ctx) => ctx.currentDay === 'Sun'
      ? `Sunday decides it. Last lineups. Live cats.`
      : null,

    // Count-led
    (ctx) => (ctx.dayCounts && ctx.dayCounts.liveCount >= 4)
      ? `${ctx.dayCounts.liveCount} matchups live. ${ctx.dayCounts.finalCount} decided. Cat math, open.`
      : null,
    (ctx) => (ctx.dayCounts && ctx.dayCounts.upcomingCount > 0)
      ? `${plural(ctx.dayCounts.liveCount, 'live')}. ${plural(ctx.dayCounts.upcomingCount, 'upcoming')}. Box score art incoming.`
      : null,
    (ctx) => (ctx.dayCounts && ctx.dayCounts.finalCount === 0)
      ? `${ctx.currentDay}. Nothing decided. Everything moving.`
      : null,

    // Honest / quieter
    (ctx) => `${ctx.currentDay} board. Daily scores, live records, cat math.`,
    (ctx) => `${ctx.currentDay} matchups. Live cats. Open margins.`,
    (ctx) => `${ctx.currentDay}. Live. Loud. Open.`,
    (ctx) => `${ctx.currentDay}, by the board.`,
  ],
  bodies: [
    // Sub-headline doesn't use bodies — fallback only.
    () => '',
  ],
}

/* ─────────────────────────────────────────────────────────────────
   KIND: WHAT-TO-WATCH FLIP (a cat could flip with X games left)
───────────────────────────────────────────────────────────────── */

const WATCH_FLIP: MatchupsTemplate = {
  kind: 'what-to-watch-flip',
  eyebrows: [
    () => 'WATCH THIS',
    () => 'CAT ON A SWIVEL',
    () => 'ABOUT TO FLIP',
    () => 'ONE PITCH AWAY',
    () => 'CAT IN MOTION',
    () => 'TIPPING POINT',
    () => 'ON A WIRE',
    () => 'WATCH THE FLIP',
    () => 'SWING CAT',
  ],
  headlines: [
    // Needed-stat fragment
    (ctx) => ctx.watch ? `${ctx.watch.needed ?? 'One swing'} ${ctx.currentDay === 'Sat' || ctx.currentDay === 'Sun' ? 'this weekend' : 'tonight'} and the ${ctx.watch.cat} flips.` : null,
    (ctx) => ctx.watch ? `One ${ctx.watch.cat} swing away from a flip.` : null,
    (ctx) => ctx.watch ? `${ctx.watch.cat} ${pick(SYN.FLIPS)} with ${plural(ctx.watch.gamesLeft, 'game')} left.` : null,
    (ctx) => ctx.watch ? `${ctx.watch.needed ?? 'One'} more and ${ctx.watch.cat} ${pick(SYN.FLIPS)}.` : null,
    (ctx) => ctx.watch && ctx.watch.gamesLeft <= 2 ? `${ctx.watch.cat} on a wire. ${plural(ctx.watch.gamesLeft, 'game')} left.` : null,

    // Verb-led
    (ctx) => ctx.watch ? `${ctx.watch.cat} is one good lineup away from changing hands.` : null,
    (ctx) => ctx.watch ? `${ctx.watch.cat} ${pick(SYN.TIGHTENS)}. ${plural(ctx.watch.gamesLeft, 'game')} left to decide it.` : null,

    // Team-on-attack aware
    (ctx) => ctx.watch?.teamOnAttack === 'A' ? `${ctx.teamA.name} is pushing ${ctx.watch.cat}. ${ctx.watch.needed ?? 'One swing'} flips it.` : null,
    (ctx) => ctx.watch?.teamOnAttack === 'B' ? `${ctx.teamB.name} is pushing ${ctx.watch.cat}. ${ctx.watch.needed ?? 'One swing'} flips it.` : null,

    // Day-aware
    (ctx) => ctx.watch && ctx.currentDay === 'Sun' ? `${ctx.watch.cat} comes down to Sunday lineups.` : null,
    (ctx) => ctx.watch && ctx.currentDay === 'Sat' ? `${ctx.watch.cat} is on the weekend.` : null,

    // Numbers-up-front
    (ctx) => ctx.watch ? `${plural(ctx.watch.gamesLeft, 'game')} left. ${ctx.watch.cat} is the swing cat.` : null,
    (ctx) => ctx.watch ? `${ctx.watch.cat}, inside one swing.` : null,

    // Punchy fragments
    (ctx) => ctx.watch ? `One pitch in ${ctx.watch.cat} changes the matchup.` : null,
    (ctx) => ctx.watch ? `${ctx.watch.cat} is the cat to watch.` : null,
    (ctx) => ctx.watch ? `Watch ${ctx.watch.cat}. It moves with every at-bat.` : null,

    // Honest / quieter
    (ctx) => ctx.watch ? `${ctx.watch.cat} has been tied since Wednesday. One game breaks it.` : null,
    (ctx) => ctx.watch && ctx.watch.gamesLeft === 1 ? `${ctx.watch.cat} comes down to the last game.` : null,
  ],
  bodies: [
    // Main callout body
    (ctx) => ctx.watch ? `${ctx.watch.cat} is inside one swing. ${plural(ctx.watch.gamesLeft, 'game')} left between the two rosters. The matchup leans on it.` : null,
    (ctx) => ctx.watch ? `${ctx.watch.cat} has been moving all week. ${ctx.watch.needed ?? 'One swing'} late changes the leaderboard.` : null,
    (ctx) => ctx.watch?.teamOnAttack === 'A' ? `${ctx.teamA.name} keeps stacking ${ctx.watch.cat}. ${ctx.watch.needed ?? 'One more'} and the cat changes hands.` : null,
    (ctx) => ctx.watch?.teamOnAttack === 'B' ? `${ctx.teamB.name} keeps stacking ${ctx.watch.cat}. ${ctx.watch.needed ?? 'One more'} and the cat changes hands.` : null,

    // Day-aware
    (ctx) => ctx.watch && ctx.currentDay === 'Sun' ? `Sunday afternoon decides ${ctx.watch.cat}. The lineups are set.` : null,
    (ctx) => ctx.watch && ['Fri', 'Sat'].includes(ctx.currentDay) ? `${ctx.currentDay} into the weekend. ${ctx.watch.cat} is the cat that swings the matchup.` : null,

    // Games-left math
    (ctx) => ctx.watch && ctx.watch.gamesLeft === 1 ? `One game between either roster and ${ctx.watch.cat}. It is the whole matchup.` : null,
    (ctx) => ctx.watch && ctx.watch.gamesLeft <= 3 ? `${plural(ctx.watch.gamesLeft, 'game')} left. ${ctx.watch.cat} is the cat that doesn't have an answer yet.` : null,

    // Generic / fallback flavor
    (ctx) => ctx.watch ? `${ctx.watch.cat} has been the contested cat all week. The flip is on the table.` : null,
    (ctx) => ctx.watch ? `Both teams keep trading ${ctx.watch.cat}. The next swing is the matchup.` : null,
    (ctx) => ctx.watch ? `${ctx.watch.cat} sits at the tipping point. The lineup that runs hardest at it takes it.` : null,
    (ctx) => ctx.watch ? `${ctx.watch.cat} on a wire. The next at-bat moves it.` : null,
    (ctx) => ctx.watch ? `${ctx.watch.cat} is the swing cat. The matchup follows.` : null,
    (ctx) => ctx.watch ? `${ctx.watch.cat} is the only cat between the two records.` : null,
    (ctx) => ctx.watch ? `${ctx.watch.cat} could flip late. Sunday is the deadline.` : null,
    (ctx) => ctx.watch ? `${ctx.watch.cat} is the loud cat in this matchup. Watch it.` : null,
    (ctx) => ctx.watch ? `${ctx.watch.cat}: one big swing rewrites the matchup.` : null,

    // Honest / quieter
    (ctx) => ctx.watch ? `${ctx.watch.cat} has been tied since midweek. One game breaks the tie.` : null,
    (ctx) => ctx.watch ? `${ctx.watch.cat} keeps moving. Both teams keep answering.` : null,
  ],
}

/* ─────────────────────────────────────────────────────────────────
   KIND: WHAT-TO-WATCH LOCK (a cat could lock with Y outcome)
───────────────────────────────────────────────────────────────── */

const WATCH_LOCK: MatchupsTemplate = {
  kind: 'what-to-watch-lock',
  eyebrows: [
    () => 'ABOUT TO LOCK',
    () => 'CLINCH WATCH',
    () => 'ON THE LATCH',
    () => 'ONE MORE',
    () => 'LOCK INCOMING',
    () => 'CLINCH ALERT',
    () => 'CAT CLOSING',
    () => 'LOCKING IN',
    () => 'SHUTTING IT',
  ],
  headlines: [
    // Needed-stat fragment
    (ctx) => ctx.watch ? `${ctx.watch.needed ?? 'One more'} and ${ctx.watch.cat} ${pick(SYN.LOCKS)} for ${ctx.watch.teamOnAttack === 'A' ? ctx.teamA.name : ctx.teamB.name}.` : null,
    (ctx) => ctx.watch ? `${ctx.watch.needed ?? 'One'} more and the ${ctx.watch.cat} cat locks.` : null,
    (ctx) => ctx.watch ? `${ctx.watch.cat} clinches with ${ctx.watch.needed ?? 'one swing'}.` : null,
    (ctx) => ctx.watch && ctx.watch.gamesLeft <= 2 ? `${plural(ctx.watch.gamesLeft, 'game')} left. ${ctx.watch.cat} is one ${ctx.watch.needed ?? 'swing'} from locked.` : null,

    // Team-on-attack
    (ctx) => ctx.watch?.teamOnAttack === 'A' ? `${ctx.teamA.name} is one ${ctx.watch.needed ?? 'swing'} from locking ${ctx.watch.cat}.` : null,
    (ctx) => ctx.watch?.teamOnAttack === 'B' ? `${ctx.teamB.name} is one ${ctx.watch.needed ?? 'swing'} from locking ${ctx.watch.cat}.` : null,

    // Day-aware
    (ctx) => ctx.watch && ctx.currentDay === 'Sun' ? `${ctx.watch.cat} can lock on Sunday's lineups.` : null,
    (ctx) => ctx.watch && ['Fri', 'Sat'].includes(ctx.currentDay) ? `${ctx.watch.cat} can lock by the weekend.` : null,

    // Punchy fragments
    (ctx) => ctx.watch ? `${ctx.watch.cat} on the latch.` : null,
    (ctx) => ctx.watch ? `${ctx.watch.cat} closing fast.` : null,
    (ctx) => ctx.watch ? `${ctx.watch.cat}: ${ctx.watch.needed ?? 'one swing'} from done.` : null,
    (ctx) => ctx.watch ? `${ctx.watch.cat} is one good night from locked.` : null,

    // Numbers-up-front
    (ctx) => ctx.watch ? `${plural(ctx.watch.gamesLeft, 'game')} left. ${ctx.watch.cat} clinches with the next push.` : null,

    // Voice flavor / honest
    (ctx) => ctx.watch ? `${ctx.watch.cat} is about to be off the board.` : null,
    (ctx) => ctx.watch ? `${ctx.watch.cat} comes off the contested list this weekend.` : null,
  ],
  bodies: [
    // Main callout
    (ctx) => ctx.watch?.teamOnAttack === 'A' ? `${ctx.teamA.name} is ${ctx.watch.needed ?? 'one swing'} away from locking ${ctx.watch.cat}. ${plural(ctx.watch.gamesLeft, 'game')} left. The math is small.` : null,
    (ctx) => ctx.watch?.teamOnAttack === 'B' ? `${ctx.teamB.name} is ${ctx.watch.needed ?? 'one swing'} away from locking ${ctx.watch.cat}. ${plural(ctx.watch.gamesLeft, 'game')} left.` : null,
    (ctx) => ctx.watch ? `${ctx.watch.cat} is on the latch. ${ctx.watch.needed ?? 'One push'} and it comes off the contested list.` : null,

    // Day-aware
    (ctx) => ctx.watch && ctx.currentDay === 'Sun' ? `Sunday is the clinching day. ${ctx.watch.cat} is the next cat to come off the board.` : null,
    (ctx) => ctx.watch && ['Fri', 'Sat'].includes(ctx.currentDay) ? `${ctx.currentDay} into the weekend. The ${ctx.watch.cat} clinch is the loudest item on the board.` : null,

    // Games-left
    (ctx) => ctx.watch && ctx.watch.gamesLeft === 1 ? `One game left between the two rosters. ${ctx.watch.cat} clinches with the right outcome.` : null,
    (ctx) => ctx.watch && ctx.watch.gamesLeft <= 3 ? `${plural(ctx.watch.gamesLeft, 'game')} left. The lock can happen tonight.` : null,

    // Specialty framing
    (ctx) => (ctx.watch?.teamOnAttack === 'A' && ctx.teamA.topCats[0] === ctx.watch?.cat)
      ? `${ctx.teamA.name} owns ${ctx.watch.cat}. The clinch was always the path.`
      : null,
    (ctx) => (ctx.watch?.teamOnAttack === 'B' && ctx.teamB.topCats[0] === ctx.watch?.cat)
      ? `${ctx.teamB.name} owns ${ctx.watch.cat}. The clinch was always the path.`
      : null,

    // Voice flavor
    (ctx) => ctx.watch ? `${ctx.watch.cat} keeps padding. The cat is closing.` : null,
    (ctx) => ctx.watch ? `${ctx.watch.cat} is the next cat off the contested list. Watch the late games.` : null,
    (ctx) => ctx.watch ? `${ctx.watch.cat} on the latch. Box score art incoming.` : null,
    (ctx) => ctx.watch ? `${ctx.watch.cat} clinches with ${ctx.watch.needed ?? 'one more'}. The matchup leans on it.` : null,

    // Honest / quieter
    (ctx) => ctx.watch ? `${ctx.watch.cat} has been moving in one direction all week. The lock is the natural end.` : null,
    (ctx) => ctx.watch ? `${ctx.watch.cat} sits at clinch range. The next push closes it.` : null,
    (ctx) => ctx.watch ? `${ctx.watch.cat} is the cat that doesn't make it to Monday.` : null,
  ],
}

/* ─────────────────────────────────────────────────────────────────
   KIND: WHAT-TO-WATCH PUNT (a team is conceding a cat)
───────────────────────────────────────────────────────────────── */

const WATCH_PUNT: MatchupsTemplate = {
  kind: 'what-to-watch-punt',
  eyebrows: [
    () => 'PUNT WATCH',
    () => 'CAT CONCEDED',
    () => 'LEFT ON THE TABLE',
    () => 'WALKED AWAY',
    () => 'PUNT IN PROGRESS',
    () => 'NOT CONTESTING',
    () => 'CAT GIVEN UP',
    () => 'OFF THE BOARD',
    () => 'CONCEDED',
  ],
  headlines: [
    // Punt-led
    (ctx) => ctx.watch ? `${ctx.watch.teamOnAttack === 'A' ? ctx.teamB.name : ctx.teamA.name} has ${pick(SYN.PUNT_VERBS)} ${ctx.watch.cat}.` : null,
    (ctx) => ctx.watch ? `${ctx.watch.teamOnAttack === 'A' ? ctx.teamB.name : ctx.teamA.name} is not contesting ${ctx.watch.cat}.` : null,
    (ctx) => ctx.watch ? `${ctx.watch.cat} is off the board for ${ctx.watch.teamOnAttack === 'A' ? ctx.teamB.name : ctx.teamA.name}.` : null,
    (ctx) => ctx.watch ? `${ctx.watch.cat} conceded by ${ctx.watch.teamOnAttack === 'A' ? ctx.teamB.name : ctx.teamA.name}.` : null,

    // Difference-framing
    (ctx) => ctx.watch ? `${ctx.watch.cat} is decided. The matchup turns on the other ten.` : null,
    (ctx) => ctx.watch ? `${ctx.watch.cat} was never going to be contested. The bullpen is the difference.` : null,
    (ctx) => ctx.watch ? `${ctx.watch.cat} sits at the bottom of the lineup. The roster moved on a month ago.` : null,

    // Team-name aware
    (ctx) => (ctx.watch && ctx.teamA.bleedingCats.includes(ctx.watch.cat))
      ? `${ctx.teamA.name} bleeds ${ctx.watch.cat}. It just stopped trying.`
      : null,
    (ctx) => (ctx.watch && ctx.teamB.bleedingCats.includes(ctx.watch.cat))
      ? `${ctx.teamB.name} bleeds ${ctx.watch.cat}. The week's lineup confirms it.`
      : null,

    // Punchy
    (ctx) => ctx.watch ? `${ctx.watch.cat}. Conceded.` : null,
    (ctx) => ctx.watch ? `${ctx.watch.cat} is somebody else's cat this week.` : null,
    (ctx) => ctx.watch ? `${ctx.watch.cat} got left on the table.` : null,

    // Voice flavor / honest
    (ctx) => ctx.watch ? `Cat ten. ${ctx.watch.cat}. ${ctx.watch.teamOnAttack === 'A' ? ctx.teamB.name : ctx.teamA.name} is not playing for it.` : null,
    (ctx) => ctx.watch ? `${ctx.watch.cat}: 0 contested this week. The matchup goes through everything else.` : null,
    (ctx) => ctx.watch ? `${ctx.watch.cat} is the punt cat. The math reorganizes around it.` : null,

    // Strategy-aware
    (ctx) => ctx.watch ? `${ctx.watch.teamOnAttack === 'A' ? ctx.teamB.name : ctx.teamA.name} traded ${ctx.watch.cat} for the other ten. Now we see if the math works.` : null,
  ],
  bodies: [
    // Punt confirmation
    (ctx) => ctx.watch ? `${ctx.watch.teamOnAttack === 'A' ? ctx.teamB.name : ctx.teamA.name} has stopped contesting ${ctx.watch.cat}. The matchup runs through the other ten cats.` : null,
    (ctx) => ctx.watch ? `${ctx.watch.cat} is conceded. ${ctx.watch.teamOnAttack === 'A' ? ctx.teamA.name : ctx.teamB.name} owns it cleanly. The fight is everywhere else.` : null,
    (ctx) => ctx.watch ? `${ctx.watch.cat} is off the board for ${ctx.watch.teamOnAttack === 'A' ? ctx.teamB.name : ctx.teamA.name}. The roster moved on weeks ago. The math runs through everything else.` : null,

    // Bleeding-cat tie-in
    (ctx) => (ctx.watch && ctx.teamA.bleedingCats.includes(ctx.watch.cat))
      ? `${ctx.teamA.name} has been bleeding ${ctx.watch.cat} all year. This week it stopped pretending. The week's lineup chases the cats it can win.`
      : null,
    (ctx) => (ctx.watch && ctx.teamB.bleedingCats.includes(ctx.watch.cat))
      ? `${ctx.teamB.name} has been bleeding ${ctx.watch.cat} all year. The punt was always coming. This week confirms it.`
      : null,

    // Strategy framing
    (ctx) => ctx.watch ? `Punt strategy. ${ctx.watch.cat} for the other ten. The matchup math has changed.` : null,
    (ctx) => ctx.watch ? `${ctx.watch.teamOnAttack === 'A' ? ctx.teamB.name : ctx.teamA.name} traded ${ctx.watch.cat} for breathing room everywhere else. The pivot is real.` : null,

    // Voice flavor / honest
    (ctx) => ctx.watch ? `Nothing to watch in ${ctx.watch.cat}. Everything to watch in the other ten.` : null,
    (ctx) => ctx.watch ? `${ctx.watch.cat} is the easy cat for ${ctx.watch.teamOnAttack === 'A' ? ctx.teamA.name : ctx.teamB.name}. The hard cats are the matchup.` : null,
    (ctx) => ctx.watch ? `${ctx.watch.cat} on the punt list. The week's lineup tells the rest.` : null,
    (ctx) => ctx.watch ? `${ctx.watch.cat} is the cat one team gave up on. Now the other ten matter twice.` : null,

    // Specialty contrast
    (ctx) => (ctx.watch && ctx.watch.teamOnAttack === 'A' && ctx.teamA.topCats[0] === ctx.watch.cat)
      ? `${ctx.teamA.name} runs ${ctx.watch.cat}. ${ctx.teamB.name} walked away from the cat ${ctx.teamA.name} owns. The math agrees with that read.`
      : null,
    (ctx) => (ctx.watch && ctx.watch.teamOnAttack === 'B' && ctx.teamB.topCats[0] === ctx.watch.cat)
      ? `${ctx.teamB.name} runs ${ctx.watch.cat}. ${ctx.teamA.name} stopped fighting for it. The lineup choices confirm the pivot.`
      : null,

    // Honest / quieter
    (ctx) => ctx.watch ? `Nobody is starting a closer for ${ctx.watch.cat} this week. The cat is conceded.` : null,
    (ctx) => ctx.watch ? `${ctx.watch.cat} is the cat that does not move the matchup. The other ten do.` : null,
  ],
}

/* ─────────────────────────────────────────────────────────────────
   KIND: WHAT-TO-WATCH SWEEP-ALERT (math-is-over framing)
───────────────────────────────────────────────────────────────── */

const WATCH_SWEEP_ALERT: MatchupsTemplate = {
  kind: 'what-to-watch-sweep-alert',
  eyebrows: [
    () => 'SWEEP ALERT',
    () => 'IT IS DONE',
    () => 'MATH IS OVER',
    () => 'LOCKED',
    () => 'NO PATH',
    () => 'CALLED EARLY',
    () => 'CLINCHED',
    () => 'OFF THE BOARD',
    () => 'DECIDED',
  ],
  headlines: [
    // Score-led
    (ctx) => `${ctx.catRecord} with ${plural(ctx.daysLeftInWeek, 'day')} left. It's done.`,
    (ctx) => `${ctx.catRecord}. ${leaderName(ctx)} took the matchup.`,
    (ctx) => `${ctx.catRecord} with one game left. It is over.`,

    // Math-aware
    (ctx) => `Mathematically over. ${leaderName(ctx)} cannot lose.`,
    (ctx) => `${leaderName(ctx)} clinched. The cats are decoration from here.`,
    (ctx) => `No path for ${trailerName(ctx)}. The matchup is locked.`,

    // Days-left
    (ctx) => ctx.daysLeftInWeek === 1 ? `One day left. The math went out the window on Friday.` : null,
    (ctx) => ctx.daysLeftInWeek === 2 ? `Two days left. ${leaderName(ctx)} already won the matchup.` : null,

    // Punchy fragments
    (ctx) => `${leaderName(ctx)}. Locked.`,
    (ctx) => `${leaderName(ctx)} ran it. Matchup decided.`,
    (ctx) => `It's done. ${leaderName(ctx)} took the week.`,
    (ctx) => `${ctx.catRecord}. Over.`,

    // Voice flavor / honest
    (ctx) => `Nothing to watch. ${leaderName(ctx)} clinched.`,
    (ctx) => `${trailerName(ctx)} has no path. The cats from here are tiebreaker padding.`,
    (ctx) => `${leaderName(ctx)} closed it. The standings move.`,

    // Specialty / pad framing
    (ctx) => `${leaderName(ctx)} can pad the seeding tiebreaker from here. ${trailerName(ctx)} is playing for next week.`,
    (ctx) => `Matchup clinched. The remaining cats are practice swings.`,
    (ctx) => `The math closed at ${ctx.catRecord}. The lineups are still on the wire.`,
  ],
  bodies: [
    // Math framing
    (ctx) => `${ctx.catRecord} with ${plural(ctx.daysLeftInWeek, 'day')} left. ${trailerName(ctx)} would need to sweep every remaining cat. The math does not allow it.`,
    (ctx) => `${leaderName(ctx)} took the matchup. The remaining cats decide the seeding tiebreakers.`,
    (ctx) => `Mathematically over. ${leaderName(ctx)} clinched at ${ctx.catRecord}. ${trailerName(ctx)} cannot catch up.`,

    // Decided-cat aware
    (ctx) => ctx.decidedCats.length >= 8 ? `${ctx.decidedCats.length} cats already locked. ${trailerName(ctx)} ran out of paths.` : null,

    // Days-left
    (ctx) => ctx.daysLeftInWeek === 1 ? `One day left. ${leaderName(ctx)} can sit on the lineup.` : null,
    (ctx) => ctx.daysLeftInWeek === 2 ? `Two days left and a sweep impossible. ${trailerName(ctx)} is playing for next week's standings tiebreakers.` : null,

    // Voice flavor
    (ctx) => `Nothing to watch in the matchup. Plenty to watch in the standings tiebreakers.`,
    (ctx) => `${leaderName(ctx)} clinched. The bullpens get the rest of the week off.`,
    (ctx) => `The matchup ended sometime on Friday. The box score is still moving.`,
    (ctx) => `${trailerName(ctx)} ran out of cats to chase. The week resets on Monday.`,

    // Standings-aware
    (ctx) => leaderName(ctx) === ctx.teamA.name && (ctx.teamA.seedRank ?? 99) <= 3
      ? `${ctx.teamA.name} padded the seeding tiebreaker. The top-three position is safer.`
      : null,
    (ctx) => leaderName(ctx) === ctx.teamB.name && (ctx.teamB.seedRank ?? 99) <= 3
      ? `${ctx.teamB.name} padded the seeding tiebreaker. The top-three position is safer.`
      : null,

    // Honest / quieter
    (ctx) => `Box score still moving. Matchup not.`,
    (ctx) => `${leaderName(ctx)} sits on the lineup. ${trailerName(ctx)} runs the bench.`,
    (ctx) => `Matchup over. The chat moves to next week.`,
  ],
}

/* ─────────────────────────────────────────────────────────────────
   KIND: SEASON-SERIES ONE-SIDED
───────────────────────────────────────────────────────────────── */

const SERIES_ONE_SIDED: MatchupsTemplate = {
  kind: 'season-series-one-sided',
  eyebrows: [
    () => 'HISTORY SAYS',
    () => 'OWNED THE MATCHUP',
    () => 'ONE-SIDED RIVALRY',
    () => 'THE TREND',
    () => 'SERIES BIAS',
    () => 'HEAD-TO-HEAD HISTORY',
    () => 'THE PATTERN',
    () => 'TILTED SERIES',
    () => 'ON PAPER',
  ],
  headlines: [
    // History-led
    (ctx) => ctx.series ? `${ctx.series.trend}.` : null,
    (ctx) => ctx.series ? `${ctx.series.allTimeRecord} in this series.` : null,
    (ctx) => ctx.series ? `${ctx.teamA.name} ${pick(SYN.OWNS)} the matchup. ${ctx.series.allTimeRecord} all-time.` : null,
    (ctx) => ctx.series ? `${ctx.teamB.name} ${pick(SYN.OWNS)} the matchup. ${ctx.series.allTimeRecord} all-time.` : null,
    (ctx) => ctx.series ? `${ctx.series.trend}. The pattern is real.` : null,

    // Count-led
    (ctx) => ctx.series ? `${ctx.series.totalMeetings} meetings. ${ctx.series.trend}.` : null,
    (ctx) => (ctx.series && ctx.series.totalMeetings >= 5) ? `${ctx.series.totalMeetings} times. One team has run it.` : null,

    // Last-meeting framing
    (ctx) => ctx.series?.lastMeeting ? `Last meeting: ${ctx.series.lastMeeting.catScore}. Same script, different week.` : null,
    (ctx) => ctx.series?.lastMeeting ? `${ctx.series.lastMeeting.catScore} the last time. The matchup has been one-way for a while.` : null,

    // Punchy fragments
    (ctx) => ctx.series ? `${ctx.series.trend}. Hard to ignore.` : null,
    (ctx) => ctx.series ? `${ctx.series.allTimeRecord}. The book is written.` : null,
    (ctx) => ctx.series ? `Same matchup. Same outcome.` : null,

    // Verb-led
    (ctx) => ctx.series ? `One team has been running this matchup. Long enough that nobody is surprised.` : null,

    // Voice flavor / honest
    (ctx) => ctx.series ? `History does not always carry. In this matchup it has.` : null,
    (ctx) => ctx.series ? `${ctx.series.allTimeRecord} is not a small sample.` : null,
    (ctx) => ctx.series ? `The series has had one rhythm for two seasons.` : null,

    // Numbers-up-front
    (ctx) => ctx.series ? `${ctx.series.totalMeetings} times across two years. ${ctx.series.trend}.` : null,
    (ctx) => ctx.series ? `${ctx.series.allTimeRecord}. The matchup has a winner before lineups lock.` : null,
  ],
  bodies: [
    // History prose
    (ctx) => ctx.series ? `${ctx.series.allTimeRecord} across ${plural(ctx.series.totalMeetings, 'meeting')}. ${ctx.series.trend}. The matchup has had one tone since 2024.` : null,
    (ctx) => ctx.series ? `${ctx.series.trend}. ${plural(ctx.series.totalMeetings, 'meeting')} of evidence. The pattern is the pattern.` : null,
    (ctx) => ctx.series && ctx.series.lastFew.length >= 3
      ? `${ctx.series.lastFew.slice(0, 3).map((m) => `${m.year} W${m.week}: ${m.catScore}`).join('. ')}. Same shape every time.`
      : null,

    // Last-meeting tie-in
    (ctx) => ctx.series?.lastMeeting
      ? `${ctx.series.lastMeeting.catScore} the last time these two met, in week ${ctx.series.lastMeeting.week}. The cat split was lopsided then. The roster math has not changed.`
      : null,

    // Specialty / cat-tie-in
    (ctx) => (ctx.series && ctx.teamA.topCats[0] && ctx.teamB.bleedingCats.includes(ctx.teamA.topCats[0]))
      ? `${ctx.teamA.name} owns ${ctx.teamA.topCats[0]}. ${ctx.teamB.name} bleeds it. The series has reflected that.`
      : null,
    (ctx) => (ctx.series && ctx.teamB.topCats[0] && ctx.teamA.bleedingCats.includes(ctx.teamB.topCats[0]))
      ? `${ctx.teamB.name} owns ${ctx.teamB.topCats[0]}. ${ctx.teamA.name} bleeds it. The series has held to that shape.`
      : null,

    // Voice flavor
    (ctx) => ctx.series ? `The series has had one identity for two seasons. The rosters are different. The outcome keeps repeating.` : null,
    (ctx) => ctx.series ? `Most series stay close over time. This one has not.` : null,
    (ctx) => ctx.series ? `${ctx.series.allTimeRecord} is not noise. It is a pattern with a roster reason.` : null,

    // Sample-size honest
    (ctx) => ctx.series && ctx.series.totalMeetings <= 4
      ? `Small sample. Loud signal. ${ctx.series.trend}.`
      : null,
    (ctx) => ctx.series && ctx.series.totalMeetings >= 6
      ? `${ctx.series.totalMeetings} meetings across two years. Big sample. One pattern.`
      : null,

    // Honest / quieter
    (ctx) => ctx.series ? `History does not have to carry. In this matchup it usually does.` : null,
    (ctx) => ctx.series ? `Two years of evidence. The matchup tilts one way.` : null,
    (ctx) => ctx.series ? `The chat will mention the series. The lineups confirm it.` : null,

    // Counter-flavor
    (ctx) => ctx.series ? `Streaks end. This one has not.` : null,
    (ctx) => ctx.series ? `The road team has been the loser in ${ctx.series.totalMeetings - 1} of these. Patterns build for a reason.` : null,
  ],
}

/* ─────────────────────────────────────────────────────────────────
   KIND: SEASON-SERIES EVEN
───────────────────────────────────────────────────────────────── */

const SERIES_EVEN: MatchupsTemplate = {
  kind: 'season-series-even',
  eyebrows: [
    () => 'EVEN HISTORY',
    () => 'SPLIT DOWN THE MIDDLE',
    () => 'NO ADVANTAGE',
    () => 'BALANCED SERIES',
    () => 'TIED',
    () => 'EVEN ON PAPER',
    () => 'NO BIAS',
    () => 'TWO-WAY HISTORY',
    () => 'STRAIGHT UP',
  ],
  headlines: [
    // Even-led
    (ctx) => ctx.series ? `Even at ${Math.floor(ctx.series.totalMeetings / 2)}. The history is messy.` : null,
    (ctx) => ctx.series ? `${ctx.series.allTimeRecord}. ${pick(SYN.EVEN)}.` : null,
    (ctx) => ctx.series ? `${ctx.series.trend}.` : null,
    (ctx) => ctx.series ? `${ctx.series.totalMeetings} meetings. ${pick(SYN.EVEN)}.` : null,

    // Punchy fragments
    (ctx) => `History does not pick a side here.`,
    (ctx) => `No edge. Two even rosters.`,
    (ctx) => ctx.series ? `${ctx.series.allTimeRecord}. Straight up.` : null,
    (ctx) => `Tied series. Tighter week.`,

    // Last-meeting framing
    (ctx) => ctx.series?.lastMeeting ? `Last meeting: ${ctx.series.lastMeeting.catScore}. Even then. Even now.` : null,

    // Voice flavor / honest
    (ctx) => `Two rosters that have been close every time they meet.`,
    (ctx) => `The history has nothing to add. The lineups carry it.`,
    (ctx) => `${ctx.teamA.name} versus ${ctx.teamB.name}. The series doesn't bend.`,
    (ctx) => `Nothing in the record book points anywhere.`,

    // Numbers-up-front
    (ctx) => ctx.series ? `${ctx.series.totalMeetings} meetings. ${pick(SYN.EVEN)}.` : null,
    (ctx) => ctx.series ? `${ctx.series.allTimeRecord}. The matchup is its own story.` : null,

    // Three-fragment rhythm
    (ctx) => `Two teams. Two years. Same record.`,
    (ctx) => ctx.series ? `${ctx.series.totalMeetings}. ${ctx.series.allTimeRecord}. ${pick(SYN.EVEN)}.` : null,
  ],
  bodies: [
    // History prose
    (ctx) => ctx.series ? `${ctx.series.allTimeRecord} all-time. ${plural(ctx.series.totalMeetings, 'meeting')}. The series has stayed even across two seasons.` : null,
    (ctx) => ctx.series ? `${ctx.series.trend}. Neither roster has built a real edge.` : null,
    (ctx) => ctx.series ? `${ctx.series.totalMeetings} meetings, ${ctx.series.allTimeRecord}. The history splits straight down the middle.` : null,

    // Last-few prose
    (ctx) => ctx.series && ctx.series.lastFew.length >= 3
      ? `${ctx.series.lastFew.slice(0, 3).map((m) => `${m.year} W${m.week}: ${m.catScore}`).join('. ')}. Different weeks. Same temperature.`
      : null,
    (ctx) => ctx.series?.lastMeeting ? `Last meeting was decided by a single cat, ${ctx.series.lastMeeting.catScore}. The two before that were also tight.` : null,

    // Voice flavor
    (ctx) => ctx.series ? `The series is too small to make a real claim. The cat scores back it up.` : null,
    (ctx) => ctx.series ? `Two rosters with similar shapes. The matchup keeps coming out close.` : null,
    (ctx) => `Even series. Even projection. The lineups will decide it.`,

    // Specialty / cat collision
    (ctx) => (ctx.teamA.topCats[0] && ctx.teamB.topCats[0] && ctx.teamA.topCats[0] !== ctx.teamB.topCats[0])
      ? `${ctx.teamA.name} runs ${ctx.teamA.topCats[0]}. ${ctx.teamB.name} runs ${ctx.teamB.topCats[0]}. The other nine cats are why the series stays close.`
      : null,
    (ctx) => (ctx.teamA.topCats[0] && ctx.teamA.topCats[0] === ctx.teamB.topCats[0])
      ? `Both rosters compete in ${ctx.teamA.topCats[0]}. That cat tends to be the difference. The history confirms it.`
      : null,

    // Win-prob aware
    (ctx) => Math.abs(ctx.teamA.winProb - 0.5) < 0.06 ? `The projection is inside two points. The history agrees.` : null,
    (ctx) => Math.abs(ctx.teamA.winProb - 0.5) < 0.1 ? `Projection inside four. History inside one. Real coin flip.` : null,

    // Honest / quieter
    (ctx) => `Nothing in the history book to lean on. The week stands on its own.`,
    (ctx) => `Even on paper. Even in the games. The matchup is what makes it.`,
    (ctx) => ctx.series ? `${ctx.series.totalMeetings} meetings and no separation. The 11 cats decide it again.` : null,

    // Recent flavor
    (ctx) => ctx.series && ctx.series.lastFew.length >= 2
      ? `The last two meetings: ${ctx.series.lastFew.slice(0, 2).map((m) => m.catScore).join(' and ')}. Tight then, tight now.`
      : null,
  ],
}

/* ─────────────────────────────────────────────────────────────────
   KIND: SEASON-SERIES FIRST-MEETING
───────────────────────────────────────────────────────────────── */

const SERIES_FIRST_MEETING: MatchupsTemplate = {
  kind: 'season-series-first-meeting',
  eyebrows: [
    () => 'FIRST MEETING',
    () => 'NEW MATCHUP',
    () => 'NO HISTORY',
    () => 'OPENING ROUND',
    () => 'FRESH DRAW',
    () => 'FIRST TIME',
    () => 'BLANK SLATE',
    () => 'SCHEDULE FINALLY DREW IT',
    () => 'FIRST LOOK',
  ],
  headlines: [
    // Novelty-led
    (ctx) => `First meeting between ${ctx.teamA.name} and ${ctx.teamB.name} this year.`,
    (ctx) => `${ctx.teamA.name} versus ${ctx.teamB.name}. First time all season.`,
    (ctx) => `${ctx.teamA.mascot} and ${ctx.teamB.mascot}. The schedule finally drew it.`,
    (ctx) => `New matchup. Fresh draw.`,
    (ctx) => `${ctx.teamA.name} and ${ctx.teamB.name} have not met all year. They meet now.`,

    // Setup-led
    (ctx) => `Blank slate. Two rosters, no shared cats.`,
    (ctx) => `Nothing in the books. The setup is the whole story.`,
    (ctx) => `First-meeting matchup. Both lineups in a new room.`,

    // Last-year tie-in (if exists)
    (ctx) => ctx.series?.lastMeeting && ctx.series.lastMeeting.year < new Date().getFullYear()
      ? `First meeting since ${ctx.series.lastMeeting.year}. The roster is different. The matchup is new.`
      : null,
    (ctx) => ctx.series?.lastMeeting
      ? `Last meeting was week ${ctx.series.lastMeeting.week}, ${ctx.series.lastMeeting.year}. The rematch is finally here.`
      : null,

    // Verb-led
    (ctx) => `${ctx.teamA.name} and ${ctx.teamB.name} share a calendar slot for the first time. New tape.`,

    // Punchy fragments
    (ctx) => `First look. Fresh tape.`,
    (ctx) => `New matchup. No baseline.`,
    (ctx) => `First time these two have met. The setup is interesting.`,

    // Voice flavor / honest
    (ctx) => `Nothing to lean on. The matchup is the matchup.`,
    (ctx) => `${ctx.teamA.name} versus ${ctx.teamB.name}. No history. No script.`,
    (ctx) => `First meeting. The reads are roster-only.`,

    // Bubble-aware
    (ctx) => (ctx.teamA.isOnBubble || ctx.teamB.isOnBubble)
      ? `First meeting. Bubble stakes. Bad timing for a blind draw.`
      : null,

    // Three-fragment rhythm
    (ctx) => `${ctx.teamA.name}. ${ctx.teamB.name}. New file.`,
  ],
  bodies: [
    // Novelty prose
    (ctx) => `${ctx.teamA.name} and ${ctx.teamB.name} have not met this season. The schedule kept them apart through ${ctx.weeksLeftInRegularSeason !== undefined ? `the first ${15 - (ctx.weeksLeftInRegularSeason)} weeks` : 'the regular season'}. The matchup is finally on the board.`,
    (ctx) => `First meeting between these two all year. No shared cat history. No mid-season tape. The reads are roster-only.`,
    (ctx) => `The lineups have not been in the same room in 2026. Both rosters are different shapes than the last time they played.`,

    // Roster-shape collision
    (ctx) => (ctx.teamA.topCats[0] && ctx.teamB.topCats[0] && ctx.teamA.topCats[0] !== ctx.teamB.topCats[0])
      ? `${ctx.teamA.name} brings ${ctx.teamA.topCats[0]} into the matchup. ${ctx.teamB.name} brings ${ctx.teamB.topCats[0]}. The setup is the whole story.`
      : null,
    (ctx) => (ctx.teamA.topCats.length >= 2 && ctx.teamB.bleedingCats.length >= 1 && ctx.teamA.topCats.some((c) => ctx.teamB.bleedingCats.includes(c)))
      ? `${ctx.teamA.name} runs cats ${ctx.teamB.name} has been bleeding all year. First meeting, but the matchup leans one way on paper.`
      : null,

    // Last-year tie-in
    (ctx) => ctx.series?.lastMeeting && ctx.series.lastMeeting.year < new Date().getFullYear()
      ? `Last meeting was ${ctx.series.lastMeeting.year}, week ${ctx.series.lastMeeting.week}. ${ctx.teamA.name} won that one ${ctx.series.lastMeeting.catScore}. Different rosters now.`
      : null,
    (ctx) => ctx.series?.lastMeeting
      ? `The last time these two met was ${ctx.series.lastMeeting.year}. Both lineups have turned over since. The setup is fresh.`
      : null,

    // Win-prob framing
    (ctx) => Math.abs(ctx.teamA.winProb - 0.5) < 0.06 ? `The projection has it inside two points. No history to confirm. The matchup will set the tone.` : null,
    (ctx) => ctx.teamA.winProb >= 0.6 ? `Projection favors ${ctx.teamA.name}. With no head-to-head history, the read is roster-based.` : null,
    (ctx) => ctx.teamB.winProb >= 0.6 ? `Projection favors ${ctx.teamB.name}. The first-meeting tape is the only tape.` : null,

    // Voice flavor
    (ctx) => `First meetings are the hardest to read. No baseline. No rhythm. Roster against roster.`,
    (ctx) => `Nothing in the books. The matchup writes its own first page.`,
    (ctx) => `${ctx.teamA.name} versus ${ctx.teamB.name}. The setup is the only thing to read.`,

    // Bubble flavor
    (ctx) => (ctx.teamA.isOnBubble && ctx.teamB.isOnBubble)
      ? `Bubble teams in a blind matchup. The schedule did them no favors.`
      : null,
    (ctx) => (ctx.teamA.isOnBubble || ctx.teamB.isOnBubble)
      ? `First meeting with playoff implications. Real stakes on first look.`
      : null,

    // Honest / quieter
    (ctx) => `Nothing to lean on. The cat math will be the entire read.`,
    (ctx) => `New matchup, fresh draw. The standings still move.`,
    (ctx) => `First time these two have shared a calendar slot. The tape starts now.`,

    // Three-fragment rhythm
    (ctx) => `${ctx.teamA.name}. ${ctx.teamB.name}. Fresh tape, real stakes.`,
  ],
}

/* ─────────────────────────────────────────────────────────────────
   KIND: SEASON-SERIES RECENT-REVERSAL (underdog has won recently)
───────────────────────────────────────────────────────────────── */

const SERIES_RECENT_REVERSAL: MatchupsTemplate = {
  kind: 'season-series-recent-reversal',
  eyebrows: [
    () => 'TREND SHIFTING',
    () => 'RECENT REVERSAL',
    () => 'THE SCRIPT FLIPPED',
    () => 'NEW PATTERN',
    () => 'CHANGED HANDS',
    () => 'THE SHIFT',
    () => 'SCRIPT TURNED',
    () => 'NEW EDGE',
    () => 'PATTERN BROKEN',
  ],
  headlines: [
    // Reversal-led
    (ctx) => ctx.series ? `${ctx.series.trend}. The script has ${pick(SYN.REVERSE)}.` : null,
    (ctx) => ctx.series ? `${ctx.series.trend}. The trend is sharp.` : null,
    (ctx) => ctx.series ? `The underdog has won the last two.` : null,
    (ctx) => ctx.series ? `${ctx.series.trend}. The series turned.` : null,

    // Specific recent-run
    (ctx) => ctx.series && ctx.series.lastFew.length >= 2
      ? `Last two meetings went the other way.`
      : null,
    (ctx) => ctx.series && ctx.series.lastFew.length >= 3
      ? `Last three meetings: pattern shifted.`
      : null,

    // Punchy fragments
    (ctx) => ctx.series ? `The trend is new. The matchup follows.` : null,
    (ctx) => ctx.series ? `${ctx.series.trend}.` : null,
    (ctx) => ctx.series ? `History flipped recently.` : null,

    // Verb-led
    (ctx) => ctx.series ? `The script ${pick(SYN.REVERSE)}.` : null,
    (ctx) => ctx.series ? `The series changed hands.` : null,
    (ctx) => ctx.series ? `The underdog ${pick(SYN.OWNS)} the matchup now.` : null,

    // Voice flavor / honest
    (ctx) => ctx.series ? `The old read on this matchup does not hold anymore.` : null,
    (ctx) => ctx.series ? `Two years of one pattern. Then it flipped.` : null,
    (ctx) => ctx.series ? `${ctx.series.trend}. The roster reason is real.` : null,

    // Last-meeting framing
    (ctx) => ctx.series?.lastMeeting ? `${ctx.series.lastMeeting.catScore} the last time. The opposite of every previous meeting.` : null,

    // Numbers-up-front
    (ctx) => ctx.series ? `${ctx.series.allTimeRecord} all-time. Last two went the other way.` : null,
  ],
  bodies: [
    // Reversal prose
    (ctx) => ctx.series ? `${ctx.series.trend}. The old script does not hold. The new one is two meetings deep and sharpening.` : null,
    (ctx) => ctx.series ? `Two seasons of one pattern. The last two meetings broke it. ${ctx.series.allTimeRecord} on paper. The recent tape says something different.` : null,
    (ctx) => ctx.series && ctx.series.lastFew.length >= 3
      ? `${ctx.series.lastFew.slice(0, 3).map((m) => `${m.year} W${m.week}: ${m.catScore}`).join('. ')}. The trend is the trend.`
      : null,

    // Last-meeting tie-in
    (ctx) => ctx.series?.lastMeeting
      ? `Last meeting ended ${ctx.series.lastMeeting.catScore} in week ${ctx.series.lastMeeting.week}. The opposite of every meeting before it. The roster changes are starting to show.`
      : null,

    // Roster-reason
    (ctx) => (ctx.teamA.topCats[0] && ctx.teamB.bleedingCats.includes(ctx.teamA.topCats[0]))
      ? `${ctx.teamA.name} has built a real edge in ${ctx.teamA.topCats[0]}. That cat used to go the other way. Not anymore.`
      : null,
    (ctx) => (ctx.teamB.topCats[0] && ctx.teamA.bleedingCats.includes(ctx.teamB.topCats[0]))
      ? `${ctx.teamB.name} has flipped the ${ctx.teamB.topCats[0]} math. The series followed.`
      : null,

    // Voice flavor
    (ctx) => `Patterns do not break for no reason. The roster math is the reason.`,
    (ctx) => ctx.series ? `${ctx.series.trend}. Two meetings is a small sample. Two meetings is also two meetings.` : null,
    (ctx) => `The team that used to lose this matchup is the team that wins it now.`,

    // Honest / quieter
    (ctx) => `History tilted one way. The most recent reads tilt the other way. The matchup gets to decide which one wins.`,
    (ctx) => `The series is in motion. The script flipped.`,
    (ctx) => ctx.series ? `${ctx.series.allTimeRecord} all-time. The recent two outweigh the older five.` : null,

    // Sample-size honest
    (ctx) => ctx.series && ctx.series.lastFew.filter((m) => m.winner !== 'tie').length >= 3
      ? `Three of the last four went the new direction. Patterns build for a reason.`
      : null,
    (ctx) => ctx.series && ctx.series.totalMeetings >= 6
      ? `${ctx.series.totalMeetings} meetings across two years. The last two rewrote the read.`
      : null,

    // Verb-led
    (ctx) => `The series moves. Both rosters know it.`,
  ],
}

/* ─────────────────────────────────────────────────────────────────
   KIND: QUICK-READ (footer pill labels, ultra-compressed)
───────────────────────────────────────────────────────────────── */

const QUICK_READ: MatchupsTemplate = {
  kind: 'quick-read',
  eyebrows: [
    () => '',
  ],
  headlines: [
    // tightest-race-today
    (ctx) => ctx.quickRead?.pillKind === 'tightest-race-today' ? `Tightest race today` : null,
    (ctx) => ctx.quickRead?.pillKind === 'tightest-race-today' && ctx.quickRead.primaryCat ? `${ctx.quickRead.primaryCat} · ${pick(SYN.PILL_TIGHT)}` : null,
    (ctx) => ctx.quickRead?.pillKind === 'tightest-race-today' ? `${pick(SYN.PILL_TIGHT)}` : null,
    (ctx) => ctx.quickRead?.pillKind === 'tightest-race-today' && ctx.quickRead.label ? ctx.quickRead.label : null,
    (ctx) => ctx.quickRead?.pillKind === 'tightest-race-today' ? `Inside the margin` : null,

    // biggest-sweep
    (ctx) => ctx.quickRead?.pillKind === 'biggest-sweep' && ctx.quickRead.sweepScore ? `${ctx.quickRead.sweepScore} · Sweep watch` : null,
    (ctx) => ctx.quickRead?.pillKind === 'biggest-sweep' ? `Biggest sweep today` : null,
    (ctx) => ctx.quickRead?.pillKind === 'biggest-sweep' ? `${pick(SYN.PILL_SWEEP)}` : null,
    (ctx) => ctx.quickRead?.pillKind === 'biggest-sweep' && ctx.quickRead.label ? ctx.quickRead.label : null,
    (ctx) => ctx.quickRead?.pillKind === 'biggest-sweep' ? `Running away` : null,

    // bubble-watch-matchup
    (ctx) => ctx.quickRead?.pillKind === 'bubble-watch-matchup' ? `Bubble watch` : null,
    (ctx) => ctx.quickRead?.pillKind === 'bubble-watch-matchup' ? `${pick(SYN.PILL_BUBBLE)}` : null,
    (ctx) => ctx.quickRead?.pillKind === 'bubble-watch-matchup' ? `Playoff line` : null,
    (ctx) => ctx.quickRead?.pillKind === 'bubble-watch-matchup' && ctx.quickRead.label ? ctx.quickRead.label : null,
    (ctx) => ctx.quickRead?.pillKind === 'bubble-watch-matchup' ? `Must-win` : null,

    // biggest-punt
    (ctx) => ctx.quickRead?.pillKind === 'biggest-punt' && ctx.quickRead.primaryCat ? `${ctx.quickRead.primaryCat} · ${pick(SYN.PILL_PUNT)}` : null,
    (ctx) => ctx.quickRead?.pillKind === 'biggest-punt' ? `Biggest punt today` : null,
    (ctx) => ctx.quickRead?.pillKind === 'biggest-punt' ? `${pick(SYN.PILL_PUNT)}` : null,
    (ctx) => ctx.quickRead?.pillKind === 'biggest-punt' && ctx.quickRead.label ? ctx.quickRead.label : null,
    (ctx) => ctx.quickRead?.pillKind === 'biggest-punt' ? `Left on the table` : null,
  ],
  bodies: [
    // Quick-read pills don't render a body. Empty fallback only.
    () => '',
  ],
}

/* ─────────────────────────────────────────────────────────────────
   PUBLIC API
───────────────────────────────────────────────────────────────── */

export const matchupsTemplates: Record<MatchupsKind, MatchupsTemplate> = {
  'hero-top-clash': HERO_TOP_CLASH,
  'hero-bubble-vs-bubble': HERO_BUBBLE,
  'hero-champ-collapsing': HERO_CHAMP_COLLAPSING,
  'hero-sweep-in-progress': HERO_SWEEP,
  'hero-closest-race': HERO_CLOSEST_RACE,
  'sub-headline': SUB_HEADLINE,
  'what-to-watch-flip': WATCH_FLIP,
  'what-to-watch-lock': WATCH_LOCK,
  'what-to-watch-punt': WATCH_PUNT,
  'what-to-watch-sweep-alert': WATCH_SWEEP_ALERT,
  'season-series-one-sided': SERIES_ONE_SIDED,
  'season-series-even': SERIES_EVEN,
  'season-series-first-meeting': SERIES_FIRST_MEETING,
  'season-series-recent-reversal': SERIES_RECENT_REVERSAL,
  'quick-read': QUICK_READ,
}

/**
 * Render a matchups editorial moment. Returns eyebrow, headline,
 * body, and optional sub-context. Each piece is picked at random
 * from the variants that survive their own self-veto for the given
 * context. If nothing survives, a quiet fallback is used.
 *
 * - HERO kinds populate eyebrow + headline + body + sub-context.
 * - SUB-HEADLINE returns only `headline`.
 * - WATCH and SERIES kinds populate eyebrow + headline + body.
 * - QUICK-READ returns a single pill `headline`.
 */
export function renderMatchups(kind: MatchupsKind, ctx: MatchupsContext): {
  eyebrow: string
  headline: string
  body: string
  subContext?: string
} {
  const template = matchupsTemplates[kind]
  const out: { eyebrow: string; headline: string; body: string; subContext?: string } = {
    eyebrow: renderOne(template.eyebrows, ctx) ?? 'MATCHUPS',
    headline: renderOne(template.headlines, ctx) ?? `${ctx.teamA.name} versus ${ctx.teamB.name}.`,
    body: renderOne(template.bodies, ctx) ?? ctx.catRecord,
  }
  if (template.subContext) {
    const sub = renderOne(template.subContext, ctx)
    if (sub) out.subContext = sub
  }
  return out
}

function renderOne(variants: VariantFn[], ctx: MatchupsContext): string | undefined {
  const rendered = variants
    .map((fn) => fn(ctx))
    .filter((s): s is string => typeof s === 'string' && s.length > 0)
  if (rendered.length === 0) return undefined
  return rendered[Math.floor(Math.random() * rendered.length)]
}

/**
 * Recently-used tracker — not implemented yet. The renderer is
 * stateless. Future work: track recent picks per (kind, matchup
 * tuple) and bias away from them so the same template doesn't repeat
 * back-to-back for the same pair of teams within a single session.
 */
