/**
 * Home Page — Editorial Variant Library
 *
 * Powers every editorial moment on the daily Home page EXCEPT the
 * Yesterday's Big Swings carousel (that lives in swings.ts).
 *
 * Surfaces fed by this library:
 *   1. The DAILY HERO card  (Story of Week N — eyebrow + headline + body)
 *      Eight flavors: new-throne, dynasty-falling, hot-climber,
 *      bubble-surprise, identity-shift, sweep-weekend, comeback-team,
 *      quiet-day.
 *   2. The PLAYOFF PUSH closer sentence (renders below the bubble rows)
 *   3. The AROUND THE LEAGUE ticker rows (hot-streak, rough-patch,
 *      bubble-watch, top-cat-king, blowout)
 *   4. The footer QUICK READ pills (4 pill kinds, ultra-compressed)
 *
 * Every render flows through `renderHome(kind, ctx)`. Templates are
 * functional `() => string | null | undefined` so each variant can
 * self-veto when context disqualifies it.
 *
 * Voice rules: re-read EDITORIAL.md before adding variants. Active
 * voice, specific numbers, no em dashes, no emojis, no second-person,
 * sentence-length variety, last-names-only. The headline is the trash
 * talk — write it like it's getting screenshotted into a group chat.
 *
 * Density target for this file is the highest in the editorial system
 * because Home is the daily landing surface. If a sentence shape feels
 * familiar after week 4 of usage, the whole product feel collapses.
 *
 * Variant counts (per kind) — see the table at the bottom of the file:
 *   eyebrows:              10-12
 *   daily-hero headlines:  35-45
 *   daily-hero bodies:     25-30
 *   ticker headlines:      30-40
 *   playoff-push-closer:   18-25
 *   quick-read:            15-22 per pill kind
 */

/* ─────────────────────────────────────────────────────────────────
   TYPES
───────────────────────────────────────────────────────────────── */

export type HomeKind =
  | 'daily-hero-new-throne'
  | 'daily-hero-dynasty-falling'
  | 'daily-hero-hot-climber'
  | 'daily-hero-bubble-surprise'
  | 'daily-hero-identity-shift'
  | 'daily-hero-sweep-weekend'
  | 'daily-hero-comeback-team'
  | 'daily-hero-quiet-day'
  | 'playoff-push-closer'
  | 'ticker-hot-streak'
  | 'ticker-rough-patch'
  | 'ticker-bubble-watch'
  | 'ticker-top-cat-king'
  | 'ticker-blowout'
  | 'quick-read'

export type HomeCatId =
  // Hitting
  | 'R' | 'H' | 'HR' | 'RBI' | 'SB' | 'AVG' | 'OPS' | 'TB' | 'BB'
  // Pitching
  | 'W' | 'SV' | 'K' | 'HLD' | 'ERA' | 'WHIP' | 'QS' | 'K9'

export type QuickReadKind =
  | 'top-cat-this-week'
  | 'biggest-upset'
  | 'hottest-streak'
  | 'on-the-bubble'

export interface HomeTeam {
  name: string
  owner: string
  mascot?: string         // optional logo identifier; not used in copy
}

export interface HomeRecord {
  wins: number
  losses: number
  ties: number
  winPct: number          // 0.0 - 1.0
  streak: string          // pre-formatted "W4" / "L3" / "T1"
  streakLength: number    // unsigned magnitude of streak
  streakDirection: 'W' | 'L' | 'T'
}

export interface HomeRankContext {
  current: number
  previous: number        // last week's rank
  weeksAtCurrent: number  // how many weeks at this exact rank
  delta: number           // signed: positive = climbing toward #1
  seasonHigh: number      // best rank held this season
  seasonLow: number       // worst rank held this season
}

export interface HomeCategoryContext {
  topCats: HomeCatId[]            // categories this team currently leads or co-leads
  bleedingCats: HomeCatId[]       // categories this team has lost ground in recently
  recentlyChangedCats: HomeCatId[] // identity-shift signal — cats whose profile flipped
  weekSweepCats?: HomeCatId[]      // categories swept this week (used for sweep-weekend)
  catWinRecord?: string            // pre-formatted "11-0" for top-cat-king ticker
}

export interface HomeBubbleContext {
  cutoffRank: number               // playoff cutoff rank (e.g., 6)
  topSeatTeams: HomeTeam[]         // teams currently holding cutoff seats
  bubbleTeams: HomeTeam[]          // teams immediately below the line
  weeksLeft: number
  stakes: 'tight' | 'moderate' | 'wide' // gap between bubble and safe seats
  gamesBack: number                // bubble team's games-back from cutoff
}

export interface HomeContext {
  // Focus team (the protagonist of the moment)
  team: HomeTeam

  // Antagonist (defending champ, displaced #1, bubble rival — present
  // when the story requires a foil; absent for quiet-day / pure ticker)
  opponent?: HomeTeam

  // Rank position
  rank: HomeRankContext

  // Record + streak
  record: HomeRecord

  // Category identity
  category: HomeCategoryContext

  // Magnitude — how loud the story actually is
  magnitude: 'historic' | 'huge' | 'solid' | 'minor'

  // Season stage — affects framing (early-season caution vs late-season weight)
  seasonStage: 'early' | 'mid' | 'late' | 'final-stretch'

  // Week timing
  weekNumber: number
  daysPlayedThisWeek: number
  daysLeftThisWeek: number

  // Quiet-day flag — when nothing big happened league-wide
  isQuietDay: boolean

  // Historical framing (used in daily-hero kinds)
  history?: {
    lastMeetingDate?: string         // "March 2025"
    lastMeetingResult?: string       // "Bullpen Theology won that one by a category"
    teamPriorPeak?: number           // best rank reached previously
    weeksSinceLastChange: number     // weeks since the league's top spot last moved
  }

  // Bubble / playoff push context (required for playoff-push-closer)
  bubble?: HomeBubbleContext

  // Ticker beat detail — present for ticker kinds
  ticker?: {
    cat?: HomeCatId                  // the cat being highlighted (top-cat-king, etc)
    streakDescription?: string       // pre-formatted "4 straight wins" / "5-game losing streak"
    gamesFromCut?: number            // for bubble-watch
    catRecord?: string               // "11-0" pre-formatted
  }

  // Quick-read pill — required when kind === 'quick-read'
  quickRead?: {
    pill: QuickReadKind
    label: string                    // pre-formatted compact label
    cat?: HomeCatId                  // optional cat anchor
    teamName?: string                // optional team anchor
    value?: string                   // pre-formatted number / streak / record
  }
}

/* A single variant. Returns null/undefined if the template doesn't
   fit this context (self-veto). */
export type HomeVariantFn = (ctx: HomeContext) => string | null | undefined

export interface HomeTemplate {
  kind: HomeKind
  eyebrows: HomeVariantFn[]
  headlines: HomeVariantFn[]
  bodies: HomeVariantFn[]   // for ticker / playoff-closer / quick-read this can be empty
}

/* ─────────────────────────────────────────────────────────────────
   SYNONYM DICTIONARIES
───────────────────────────────────────────────────────────────── */

const SYN = {
  TOOK_THRONE: ['took the throne', 'took #1', 'seized the top', 'climbed to the top', 'planted the flag', 'flipped the league'],
  DETHRONED: ['dethroned', 'displaced', 'overtook', 'leapfrogged', 'unseated'],
  HELD_LINE: ['held the line', 'held serve', 'held #1', 'held the top', 'stayed put', 'kept the flag'],
  FELL: ['fell', 'slipped', 'dropped', 'collapsed', 'cracked', 'gave it back'],
  BLEEDING: ['bleeding', 'leaking', 'shedding', 'hemorrhaging', 'losing ground in'],
  CLIMBED: ['climbed', 'surged', 'rose', 'jumped', 'leapt'],
  ROLLING: ['rolling', 'on a heater', 'locked in', 'cooking', 'cresting'],
  QUIET_OPEN: ['Quiet week', 'Slow week', 'Calm ladder', 'No drama', 'Steady week'],
  HELD_TOP: ['held #1', 'held the top', 'held the flag', 'kept the lead', 'kept the throne'],
  SWEPT: ['swept', 'ran the table on', 'cleaned out', 'owned'],
  CRACKED: ['cracked', 'wobbled', 'tilted', 'started to slip'],
  BACK_FROM: ['back from', 'returning from', 'climbing out of', 'shaking off'],
  BUBBLE: ['the bubble', 'the cut', 'the line', 'the bracket line'],
  STILL_IN: ['still in it', 'still alive', 'still on the board', 'still has a path'],
  DYNASTY: ['dynasty', 'reign', 'era', 'run'],
  PRESSURE: ['the pressure on', 'the squeeze on', 'a real test on', 'real weight on'],
  IDENTITY_VERBS: ['became', 'quietly turned into', 'morphed into', 'reshaped into', 'rebuilt as'],
  CHASE: ['chasing', 'pursuing', 'pushing', 'closing on'],
  BASEMENT: ['the basement', 'the cellar', 'the bottom', 'last place'],
  LOCKED: ['locked', 'sealed', 'cemented', 'set in stone'],
  RUN: ['run', 'tear', 'streak', 'heater'],
  CLIMBING_OR_ROLLING: ['climbing', 'rising', 'rolling', 'cresting', 'pushing through', 'on a heater', 'surging', 'cooking'],
}

/* Synonym dictionary keys, exported for editorial review tooling. */
export const HOME_SYN_KEYS = Object.keys(SYN) as Array<keyof typeof SYN>

/* Random picker from a synonym pool. */
function pick<T>(pool: readonly T[]): T {
  return pool[Math.floor(Math.random() * pool.length)]
}

/* Pluralizer */
const plural = (n: number, one: string, many: string = one + 's') =>
  `${n} ${n === 1 ? one : many}`

/* Pretty-print a cat list for body copy. */
function catList(cats: HomeCatId[], max = 3): string {
  if (cats.length === 0) return ''
  if (cats.length === 1) return cats[0]
  if (cats.length === 2) return `${cats[0]} and ${cats[1]}`
  const head = cats.slice(0, max - 1).join(', ')
  const tail = cats[max - 1] ?? cats[cats.length - 1]
  return `${head}, and ${tail}`
}

/* Ordinal helper (1 -> "1st", 2 -> "2nd", etc). Used for rank moves. */
function ord(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

/* ─────────────────────────────────────────────────────────────────
   KIND: DAILY-HERO-NEW-THRONE
   Voice: triumphant-but-not-gloating. A new team is at #1.
───────────────────────────────────────────────────────────────── */

const NEW_THRONE: HomeTemplate = {
  kind: 'daily-hero-new-throne',
  eyebrows: [
    () => 'STORY OF THE WEEK',
    () => 'NEW #1',
    () => 'THE FLAG MOVED',
    () => 'CHANGING OF THE GUARD',
    () => 'NEW THRONE',
    () => 'TOP SPOT FLIPPED',
    () => 'POWER SHIFT',
    () => 'THE LEAGUE TURNED',
    () => 'TOP OF THE LADDER',
    () => 'FRESH AT #1',
    (ctx) => ctx.history && ctx.history.weeksSinceLastChange >= 6 ? 'FIRST CHANGE IN WEEKS' : 'NEW THRONE',
    (ctx) => ctx.seasonStage === 'late' || ctx.seasonStage === 'final-stretch' ? 'LATE-SEASON FLIP' : 'STORY OF THE WEEK',
  ],
  headlines: [
    // Punchy 2-4 word headlines
    (ctx) => `${ctx.team.name} ${pick(SYN.TOOK_THRONE)}.`,
    (ctx) => `${ctx.team.name} took #1.`,
    () => `New flag at the top.`,
    (ctx) => `${ctx.team.name} now leads.`,
    () => `The throne moved.`,
    (ctx) => `${ctx.team.name}. Top of the ladder.`,

    // Dynasty-falling counterpoint (when opponent named)
    (ctx) => ctx.opponent ? `The ${pick(SYN.DYNASTY)} falls. ${ctx.team.name} ${pick(SYN.TOOK_THRONE)}.` : null,
    (ctx) => ctx.opponent ? `${ctx.team.name} ${pick(SYN.DETHRONED)} ${ctx.opponent.name}.` : null,
    (ctx) => ctx.opponent ? `${ctx.opponent.name} is out at #1. ${ctx.team.name} is in.` : null,
    (ctx) => ctx.opponent ? `${ctx.team.name} over ${ctx.opponent.name}. New top.` : null,
    (ctx) => ctx.opponent ? `${ctx.opponent.name} held it for ${plural(ctx.history?.weeksSinceLastChange ?? 4, 'week')}. ${ctx.team.name} ended that.` : null,

    // Climb-arc framing
    (ctx) => ctx.rank.previous - ctx.rank.current >= 2 ? `${ctx.team.name} jumped from ${ord(ctx.rank.previous)} to #1.` : null,
    (ctx) => ctx.rank.previous - ctx.rank.current >= 3 ? `Three-rung climb. ${ctx.team.name} at #1.` : null,
    (ctx) => ctx.rank.seasonHigh > 1 && ctx.rank.current === 1 ? `${ctx.team.name}: first time at #1 all year.` : null,
    (ctx) => ctx.rank.seasonHigh === 1 && ctx.rank.weeksAtCurrent === 0 ? `${ctx.team.name} is back at #1.` : null,

    // Record-anchored
    (ctx) => `${ctx.record.streak}. ${ctx.team.name} at the top.`,
    (ctx) => `${ctx.record.wins}-${ctx.record.losses}. ${ctx.team.name} owns the ladder.`,
    (ctx) => ctx.record.streakDirection === 'W' && ctx.record.streakLength >= 3 ? `${plural(ctx.record.streakLength, 'straight win')}. ${ctx.team.name} climbed to #1.` : null,
    (ctx) => `${ctx.team.name}. New #1. The math agrees.`,

    // Category-anchored
    (ctx) => ctx.category.topCats.length >= 3 ? `${ctx.team.name} now leads ${plural(ctx.category.topCats.length, 'category', 'categories')}. Top of the ladder followed.` : null,
    (ctx) => ctx.category.topCats.length >= 4 ? `${ctx.team.name}: ${ctx.category.topCats.length} cats led. #1 was the next domino.` : null,
    (ctx) => ctx.category.topCats[0] ? `${ctx.team.name} owns ${ctx.category.topCats[0]}. Owns the ladder too.` : null,

    // Magnitude-conditional
    (ctx) => ctx.magnitude === 'historic' ? `${ctx.team.name}: first new #1 in ${plural(ctx.history?.weeksSinceLastChange ?? 8, 'week')}.` : null,
    (ctx) => ctx.magnitude === 'historic' ? `The longest ${pick(SYN.RUN)} of the year ends. ${ctx.team.name} took it.` : null,
    (ctx) => ctx.magnitude === 'huge' && ctx.opponent ? `${ctx.opponent.name} cracked. ${ctx.team.name} climbed in.` : null,

    // Two-fragment punch
    (ctx) => `${ctx.team.name} climbed. Everyone else watched.`,
    (ctx) => `${ctx.team.name} pushed through. The ladder reshuffled.`,
    (ctx) => ctx.opponent ? `${ctx.opponent.name} stumbled. ${ctx.team.name} took the room.` : null,
    (ctx) => `${ctx.team.name}. New top seat. Earned this week.`,

    // Three-fragment rhythm
    (ctx) => `${ctx.team.name}. #1. About time.`,
    (ctx) => ctx.opponent ? `Out: ${ctx.opponent.name}. In: ${ctx.team.name}. The throne shifted.` : null,

    // Owner-anchored
    (ctx) => `${ctx.team.owner}'s ${ctx.team.name} now sit at #1.`,
    (ctx) => `${ctx.team.owner} took the room. ${ctx.team.name} at the top.`,

    // Season-stage conditionals
    (ctx) => ctx.seasonStage === 'final-stretch' ? `${ctx.team.name} took #1 with ${plural(ctx.bubble?.weeksLeft ?? 3, 'week')} left. Timing matters.` : null,
    (ctx) => ctx.seasonStage === 'late' ? `Late-season climb. ${ctx.team.name} is at #1 when it counts.` : null,
    (ctx) => ctx.seasonStage === 'early' ? `${ctx.team.name} grabbed #1 early. The chase starts now.` : null,

    // Week-number anchored
    (ctx) => `Week ${ctx.weekNumber}. New #1. ${ctx.team.name}.`,
    (ctx) => `${ctx.team.name} ${pick(SYN.TOOK_THRONE)} in week ${ctx.weekNumber}.`,

    // History-aware
    (ctx) => ctx.history?.lastMeetingDate && ctx.opponent ? `${ctx.team.name} over ${ctx.opponent.name}. First time since ${ctx.history.lastMeetingDate}.` : null,
    (ctx) => ctx.history && ctx.history.teamPriorPeak && ctx.history.teamPriorPeak > 1 ? `${ctx.team.name}: prior season high was ${ord(ctx.history.teamPriorPeak)}. Now #1.` : null,

    // Quiet-confidence variants
    (ctx) => `${ctx.team.name} was never going to stop at second.`,
    (ctx) => `${ctx.team.name} earned it. The math is clean.`,
    (ctx) => `${ctx.team.name} sits at #1. Don't blink.`,

    // Verb-led
    (ctx) => `Climbed. Took it. ${ctx.team.name}.`,
    (ctx) => `${ctx.team.name} leapt the field.`,

    // Drama variants
    (ctx) => ctx.opponent ? `${ctx.opponent.name} held the throne. ${ctx.team.name} took it back.` : null,
    (ctx) => `${ctx.team.name}: the new conversation.`,
  ],
  bodies: [
    // Stat-led
    (ctx) => `${ctx.record.wins}-${ctx.record.losses}-${ctx.record.ties}. ${ctx.record.streak}. ${ctx.team.name} owns the top of the ladder.`,
    (ctx) => `${ctx.team.name}: ${ctx.record.streak}, ${ctx.category.topCats.length} cats led, ${ord(ctx.rank.previous)} to first in one week.`,
    (ctx) => `From ${ord(ctx.rank.previous)} to #1. ${ctx.record.streak} did the work.`,

    // Opponent-anchored
    (ctx) => ctx.opponent ? `${ctx.opponent.name} held #1 for ${plural(ctx.history?.weeksSinceLastChange ?? 4, 'week')}. ${ctx.team.name} ended that with ${plural(ctx.record.streakLength, 'straight win')}.` : null,
    (ctx) => ctx.opponent ? `The room moved. ${ctx.opponent.name} drops to ${ord(2)}, ${ctx.team.name} takes the seat.` : null,
    (ctx) => ctx.opponent ? `${ctx.opponent.name}'s ${pick(SYN.DYNASTY)} is on notice. ${ctx.team.name} just proved it.` : null,

    // Category-anchored
    (ctx) => ctx.category.topCats.length >= 3 ? `${ctx.team.name} now leads ${catList(ctx.category.topCats)}. The cat math finally caught up to the ranking.` : null,
    (ctx) => ctx.category.topCats[0] && ctx.category.topCats[1] ? `${ctx.category.topCats[0]} and ${ctx.category.topCats[1]} flipped this week. ${ctx.team.name} climbed on the back of it.` : null,
    (ctx) => ctx.category.weekSweepCats && ctx.category.weekSweepCats.length >= 2 ? `Swept ${catList(ctx.category.weekSweepCats)} this week. The ladder followed.` : null,

    // Magnitude
    (ctx) => ctx.magnitude === 'historic' ? `${ctx.history?.weeksSinceLastChange ?? 8} weeks since the top spot last moved. ${ctx.team.name} ended that streak.` : null,
    (ctx) => ctx.magnitude === 'huge' ? `One of the cleaner climbs of the season. ${ctx.team.name} earned every cat.` : null,
    (ctx) => ctx.magnitude === 'solid' ? `Quiet ascent. The numbers got there before the headlines did.` : null,

    // Season-stage
    (ctx) => ctx.seasonStage === 'final-stretch' ? `${plural(ctx.bubble?.weeksLeft ?? 3, 'week')} left in the regular season. ${ctx.team.name} took #1 at the right time.` : null,
    (ctx) => ctx.seasonStage === 'late' ? `Late-season climb. ${ctx.team.name} grabs the top seat with the bracket in view.` : null,
    (ctx) => ctx.seasonStage === 'early' ? `Week ${ctx.weekNumber} of the season. Early to plant a flag, but the ${pick(SYN.RUN)} is real.` : null,

    // History
    (ctx) => ctx.history?.lastMeetingDate ? `Last meeting between these two: ${ctx.history.lastMeetingDate}. ${ctx.history.lastMeetingResult ?? 'Different story this time.'}` : null,
    (ctx) => ctx.history && ctx.history.teamPriorPeak && ctx.history.teamPriorPeak > 1 ? `Best previous finish: ${ord(ctx.history.teamPriorPeak)}. ${ctx.team.name} just cleared it.` : null,

    // Stakes / outlook
    (ctx) => `The chase resets. Everyone else is looking up at ${ctx.team.name}.`,
    (ctx) => `${ctx.team.name} sets the pace now. The rest of the league has ${plural(ctx.bubble?.weeksLeft ?? 4, 'week')} to answer.`,

    // Streak-aware
    (ctx) => ctx.record.streakDirection === 'W' && ctx.record.streakLength >= 4 ? `${plural(ctx.record.streakLength, 'straight win')}. ${ctx.team.name} stopped asking for the top seat and just took it.` : null,
    (ctx) => ctx.record.streakDirection === 'W' && ctx.record.streakLength >= 3 ? `${plural(ctx.record.streakLength, 'straight win')} to close the climb. The ladder finally agreed.` : null,

    // Conversational closers
    () => `The group chat will hear about this one.`,
    (ctx) => `${ctx.team.owner} ran the table this week. ${ctx.team.name} is the new top.`,
    () => `The chase begins. Everyone else is looking at the same screen.`,

    // Closer with a kicker
    (ctx) => `Top of the standings. ${ctx.team.name}. New conversation starts now.`,
    (ctx) => ctx.opponent ? `${ctx.opponent.name} gets a week to answer. The board says they have to.` : null,

    // Density-aware fragments
    (ctx) => `${ctx.team.name}: ${ord(ctx.rank.previous)} last week, #1 this week. The math closed fast.`,
    (ctx) => `Week ${ctx.weekNumber} reset the room. ${ctx.team.name} is at the top.`,
  ],
}

/* ─────────────────────────────────────────────────────────────────
   KIND: DAILY-HERO-DYNASTY-FALLING
   Voice: dramatic, mournful. The defending #1 is slipping.
───────────────────────────────────────────────────────────────── */

const DYNASTY_FALLING: HomeTemplate = {
  kind: 'daily-hero-dynasty-falling',
  eyebrows: [
    () => 'STORY OF THE WEEK',
    () => 'THE DYNASTY CRACKS',
    () => 'TOP SPOT SLIPPING',
    () => 'EMPIRE WOBBLES',
    () => 'THE FALL',
    () => 'CHAMP UNDER PRESSURE',
    () => 'REIGN ON NOTICE',
    () => 'THE FLAG IS WOBBLING',
    () => 'POWER BLEED',
    () => 'THE THRONE IS HOT',
    (ctx) => ctx.magnitude === 'historic' ? 'HISTORIC FALL' : 'THE DYNASTY CRACKS',
    (ctx) => ctx.rank.current >= 4 ? 'OUT OF THE TOP THREE' : 'TOP SPOT SLIPPING',
  ],
  headlines: [
    // Headline-as-trash-talk core
    () => `The ${pick(SYN.DYNASTY)} ${pick(SYN.FELL)}.`,
    (ctx) => `${ctx.team.name} is ${pick(SYN.BLEEDING)} cats.`,
    (ctx) => `${ctx.team.name}: not the same team.`,
    (ctx) => `${ctx.team.name} cracked.`,
    (ctx) => `${ctx.team.name}. From #1 to ${ord(ctx.rank.current)}.`,
    (ctx) => `The throne is hot under ${ctx.team.name}.`,

    // Stat-led
    (ctx) => ctx.rank.previous < ctx.rank.current ? `${ctx.team.name} fell ${ctx.rank.current - ctx.rank.previous} spots.` : null,
    (ctx) => ctx.rank.previous === 1 ? `${ctx.team.name} held #1 last week. Not this week.` : null,
    (ctx) => ctx.rank.seasonHigh === 1 && ctx.rank.current >= 4 ? `${ctx.team.name}: #1 to ${ord(ctx.rank.current)} in ${plural(ctx.rank.weeksAtCurrent + 1, 'week')}.` : null,

    // Category-anchored
    (ctx) => ctx.category.bleedingCats.length >= 2 ? `${ctx.team.name} is ${pick(SYN.BLEEDING)} ${catList(ctx.category.bleedingCats)}.` : null,
    (ctx) => ctx.category.bleedingCats[0] ? `${ctx.team.name}: ${ctx.category.bleedingCats[0]} is gone.` : null,
    (ctx) => ctx.category.bleedingCats.length >= 3 ? `${ctx.team.name} just lost ${plural(ctx.category.bleedingCats.length, 'category', 'categories')} in a week.` : null,

    // Streak-anchored
    (ctx) => ctx.record.streakDirection === 'L' && ctx.record.streakLength >= 2 ? `${ctx.team.name}: ${plural(ctx.record.streakLength, 'straight loss', 'straight losses')}.` : null,
    (ctx) => ctx.record.streakDirection === 'L' && ctx.record.streakLength >= 3 ? `${plural(ctx.record.streakLength, 'loss', 'losses')} in a row. The ${pick(SYN.DYNASTY)} is leaking.` : null,
    (ctx) => ctx.record.streakDirection === 'L' && ctx.record.streakLength >= 4 ? `${ctx.team.name}: ${ctx.record.streakLength} weeks without a W.` : null,

    // Opponent / climber-anchored
    (ctx) => ctx.opponent ? `${ctx.opponent.name} took #1. ${ctx.team.name} dropped to ${ord(ctx.rank.current)}.` : null,
    (ctx) => ctx.opponent ? `${ctx.team.name} got passed by ${ctx.opponent.name}.` : null,

    // Mournful framing
    (ctx) => `${ctx.team.name} held the top for ${plural(ctx.history?.weeksSinceLastChange ?? 6, 'week')}. The run is over.`,
    (ctx) => `The ${ctx.team.name} ${pick(SYN.DYNASTY)} is on notice.`,
    (ctx) => `Cracks in ${ctx.team.name}. Real ones.`,

    // Number-led
    (ctx) => `${ctx.team.name}. From #1 to ${ord(ctx.rank.current)}. The numbers don't argue.`,
    (ctx) => `${ctx.team.name}: ${ctx.record.wins}-${ctx.record.losses} and falling.`,
    (ctx) => `${ctx.team.name}. ${plural(ctx.category.bleedingCats.length, 'cat')} ${pick(SYN.BLEEDING)} out.`,

    // Two-fragment punch
    (ctx) => `${ctx.team.name} cracked. The ladder noticed.`,
    (ctx) => `The flag is wobbling. ${ctx.team.name} is the one holding it.`,
    (ctx) => `${ctx.team.name} blinked. ${ctx.opponent?.name ?? 'The league'} climbed in.`,

    // Three-fragment rhythm
    (ctx) => `${ctx.team.name}. ${ord(ctx.rank.current)}. ${pick(SYN.CRACKED)}.`,
    (ctx) => `Out at #1. ${ctx.team.name}. The board reshuffled.`,

    // Owner-anchored
    (ctx) => `${ctx.team.owner} can't find the ${pick(SYN.RUN)}. ${ctx.team.name} keeps slipping.`,
    (ctx) => `${ctx.team.owner}'s ${ctx.team.name} is ${pick(SYN.BLEEDING)} cats.`,

    // Magnitude
    (ctx) => ctx.magnitude === 'historic' ? `${ctx.team.name}: the longest ${pick(SYN.RUN)} of the year is dead.` : null,
    (ctx) => ctx.magnitude === 'historic' ? `${plural(ctx.history?.weeksSinceLastChange ?? 8, 'week')} at #1. Gone.` : null,
    (ctx) => ctx.magnitude === 'huge' ? `${ctx.team.name} dropped ${ctx.rank.current - ctx.rank.previous} spots in seven days.` : null,

    // Season-stage
    (ctx) => ctx.seasonStage === 'final-stretch' ? `${ctx.team.name} is slipping with ${plural(ctx.bubble?.weeksLeft ?? 3, 'week')} left. The timing is brutal.` : null,
    (ctx) => ctx.seasonStage === 'late' ? `Late-season slide. ${ctx.team.name} cannot afford another week.` : null,

    // History-aware
    (ctx) => ctx.history && ctx.history.teamPriorPeak === 1 ? `Last year's champ. Now ${ord(ctx.rank.current)}. The room is watching.` : null,

    // Quiet-tilt
    (ctx) => `${ctx.team.name}. Same roster, different week. Different result.`,
    (ctx) => `The ${pick(SYN.DYNASTY)} ${pick(SYN.CRACKED)}. ${ctx.team.name} has to answer.`,
    (ctx) => `${ctx.team.name} is not finished. But this week broke something.`,
    (ctx) => `${ctx.team.name}: the conversation just shifted off them.`,

    // Direct
    (ctx) => `${ctx.team.name} ${pick(SYN.FELL)} out of #1. The math forced it.`,
    (ctx) => `${ctx.team.name}. The throne hot. The exit visible.`,
  ],
  bodies: [
    // Stat-led
    (ctx) => `${ctx.record.wins}-${ctx.record.losses}-${ctx.record.ties}. ${ctx.record.streak}. ${ctx.team.name} dropped from #1 to ${ord(ctx.rank.current)} in ${plural(ctx.rank.weeksAtCurrent + 1, 'week')}.`,
    (ctx) => `${ctx.team.name} held #1 for ${plural(ctx.history?.weeksSinceLastChange ?? 5, 'week')}. The slide started week ${Math.max(1, ctx.weekNumber - ctx.record.streakLength)}.`,
    (ctx) => `${plural(ctx.category.bleedingCats.length, 'category', 'categories')} lost in a single week. ${ctx.team.name} is leaking on every side.`,

    // Category-anchored
    (ctx) => ctx.category.bleedingCats.length >= 2 ? `${catList(ctx.category.bleedingCats)} all flipped against ${ctx.team.name} this week. None of those were close.` : null,
    (ctx) => ctx.category.bleedingCats[0] ? `${ctx.category.bleedingCats[0]} was the foundation. ${ctx.team.name} just lost the lead.` : null,

    // Streak-anchored
    (ctx) => ctx.record.streakDirection === 'L' && ctx.record.streakLength >= 3 ? `${plural(ctx.record.streakLength, 'loss', 'losses')} in a row. The kind of stretch that ended a lot of seasons before this one.` : null,
    (ctx) => ctx.record.streakDirection === 'L' && ctx.record.streakLength >= 2 ? `Back-to-back losses for the first time in ${plural(Math.max(4, ctx.weekNumber - ctx.record.streakLength), 'week')}.` : null,

    // Opponent-anchored
    (ctx) => ctx.opponent ? `${ctx.opponent.name} took #1 cleanly. ${ctx.team.name} drops to ${ord(ctx.rank.current)}, and the cushion is gone.` : null,
    (ctx) => ctx.opponent ? `The ${ctx.team.name} - ${ctx.opponent.name} gap closed in a week. Now it's flipped.` : null,

    // Mournful
    (ctx) => `${ctx.team.name} held this spot from week ${Math.max(1, ctx.weekNumber - (ctx.history?.weeksSinceLastChange ?? 5))} forward. The ${pick(SYN.DYNASTY)} earned its run. The slide has started.`,
    () => `Not panic yet. But the league is no longer playing for second.`,

    // Magnitude
    (ctx) => ctx.magnitude === 'historic' ? `The longest run at #1 of the year ends. ${ctx.team.name} sets the new "weeks at #1" mark and now starts the chase.` : null,
    (ctx) => ctx.magnitude === 'huge' ? `One of the cleaner falls of the season. ${ctx.team.name} dropped ${ctx.rank.current - ctx.rank.previous} spots without a credible answer.` : null,
    (ctx) => ctx.magnitude === 'solid' ? `Not a collapse yet. But the gap between ${ctx.team.name} and the new #1 is real.` : null,

    // Season-stage
    (ctx) => ctx.seasonStage === 'final-stretch' ? `${plural(ctx.bubble?.weeksLeft ?? 3, 'week')} left. ${ctx.team.name} has to win every matchup that's left to defend the bye.` : null,
    (ctx) => ctx.seasonStage === 'late' ? `Late-season slide is the hardest kind to reverse. ${ctx.team.name} has ${plural(ctx.bubble?.weeksLeft ?? 4, 'week')} to find it.` : null,

    // History
    (ctx) => ctx.history && ctx.history.teamPriorPeak === 1 ? `Back-to-back contender story is on hold. ${ctx.team.name} has to remember what got them here.` : null,
    (ctx) => ctx.history?.weeksSinceLastChange && ctx.history.weeksSinceLastChange >= 6 ? `Six weeks at the top. One week to fall to ${ord(ctx.rank.current)}. That's the pace of a category league.` : null,

    // Outlook
    (ctx) => `${ctx.team.name} still has the roster. The week's matchup did not show it.`,
    (ctx) => `The ${pick(SYN.DYNASTY)} is not over. But this week put real ${pick(SYN.PRESSURE)} ${ctx.team.name}.`,

    // Closer
    () => `Next week is the answer or the eulogy.`,
    (ctx) => `${ctx.team.owner} has to figure out the bullpen, the lineup, or both. ${ctx.team.name} is out of cushion.`,
    (ctx) => ctx.opponent ? `${ctx.opponent.name} is in the conversation now. ${ctx.team.name} is in a different one.` : null,

    // Density
    (ctx) => `${ord(ctx.rank.previous)} to ${ord(ctx.rank.current)}. The slide started slow. It's not slow anymore.`,
    (ctx) => `${ctx.team.name}: ${ctx.record.streak}, ${plural(ctx.category.bleedingCats.length, 'cat')} bleeding, top spot gone.`,
  ],
}

/* ─────────────────────────────────────────────────────────────────
   KIND: DAILY-HERO-HOT-CLIMBER
   Voice: ascendant, excited. A team climbing fast.
───────────────────────────────────────────────────────────────── */

const HOT_CLIMBER: HomeTemplate = {
  kind: 'daily-hero-hot-climber',
  eyebrows: [
    () => 'STORY OF THE WEEK',
    () => 'HOT CLIMBER',
    () => 'ON THE MOVE',
    () => 'CLIMBING FAST',
    () => 'RISING',
    () => 'THE WEEK\'S ASCENT',
    () => 'MOVING UP',
    () => 'LADDER PUSH',
    () => 'COMING UP THE BOARD',
    () => 'STILL CLIMBING',
    (ctx) => (ctx.rank.previous - ctx.rank.current) >= 5 ? 'BIGGEST WEEKLY JUMP' : 'HOT CLIMBER',
    (ctx) => ctx.record.streakDirection === 'W' && ctx.record.streakLength >= 4 ? 'STILL ROLLING' : 'CLIMBING FAST',
  ],
  headlines: [
    // Punchy core
    (ctx) => `${ctx.team.name}: +${ctx.rank.previous - ctx.rank.current} spots.`,
    (ctx) => `${ctx.team.name} is ${pick(SYN.CLIMBING_OR_ROLLING)}.`,
    (ctx) => `${ctx.team.name}. Still ${pick(SYN.CLIMBED)}.`,
    (ctx) => `${ctx.team.name} ${pick(SYN.CLIMBED)} ${plural(ctx.rank.previous - ctx.rank.current, 'spot')}.`,
    (ctx) => `${ctx.team.name}: ${ord(ctx.rank.previous)} to ${ord(ctx.rank.current)} in seven days.`,

    // Stat-led
    (ctx) => (ctx.rank.previous - ctx.rank.current) >= 3 ? `${ctx.team.name}: ${plural(ctx.rank.previous - ctx.rank.current, 'spot')} in a week.` : null,
    (ctx) => (ctx.rank.previous - ctx.rank.current) >= 5 ? `${ctx.team.name}. ${ctx.rank.previous - ctx.rank.current}-spot week. Nobody else moved that much.` : null,
    (ctx) => `${ctx.team.name}: ${ctx.record.streak}, climbing.`,
    (ctx) => ctx.record.streakDirection === 'W' && ctx.record.streakLength >= 3 ? `${plural(ctx.record.streakLength, 'straight win')}. ${ctx.team.name} keeps climbing.` : null,
    (ctx) => ctx.record.streakDirection === 'W' && ctx.record.streakLength >= 4 ? `${ctx.team.name}: ${plural(ctx.record.streakLength, 'straight')}, no signs of slowing.` : null,

    // Category-anchored
    (ctx) => ctx.category.topCats.length >= 2 ? `${ctx.team.name} now leads ${plural(ctx.category.topCats.length, 'category', 'categories')}. ${ord(ctx.rank.current)} and rising.` : null,
    (ctx) => ctx.category.topCats[0] ? `${ctx.team.name} owns ${ctx.category.topCats[0]} now. The climb followed.` : null,
    (ctx) => ctx.category.weekSweepCats && ctx.category.weekSweepCats.length >= 2 ? `${ctx.team.name} swept ${catList(ctx.category.weekSweepCats)}. The ladder is responding.` : null,

    // Owner / team flavor
    (ctx) => `${ctx.team.owner}'s ${ctx.team.name} is the week's mover.`,
    (ctx) => `${ctx.team.owner} found the formula. ${ctx.team.name} is up to ${ord(ctx.rank.current)}.`,

    // Two-fragment punch
    (ctx) => `${ctx.team.name} climbed. The ladder reshuffled around them.`,
    (ctx) => `${ctx.team.name} is rolling. The chase is on.`,
    (ctx) => `${ctx.team.name}. ${plural(ctx.rank.previous - ctx.rank.current, 'spot')} this week. More on the way.`,

    // Three-fragment rhythm
    (ctx) => `${ctx.team.name}. ${ord(ctx.rank.current)}. Eyes on #1.`,
    (ctx) => `${ctx.team.name}. ${pick(SYN.CLIMBED)}. Not done.`,

    // Direction-anchored
    (ctx) => `${ctx.team.name} is the climber of the week.`,
    (ctx) => `${ctx.team.name}: pace-setter of the week.`,
    (ctx) => `${ctx.team.name} keeps showing up to ${ord(ctx.rank.current)}. Next week is ${ord(Math.max(1, ctx.rank.current - 1))}.`,

    // Position language
    (ctx) => ctx.rank.current <= 3 ? `${ctx.team.name} is in the top three. The conversation now includes them.` : null,
    (ctx) => ctx.rank.current <= 4 ? `${ctx.team.name} cracked the top four.` : null,
    (ctx) => ctx.rank.current === 2 ? `${ctx.team.name}: one spot from the top.` : null,

    // Magnitude
    (ctx) => ctx.magnitude === 'historic' ? `${ctx.team.name}: biggest weekly jump of the season.` : null,
    (ctx) => ctx.magnitude === 'huge' ? `${ctx.team.name} put together a five-cat week. The climb is real.` : null,
    (ctx) => ctx.magnitude === 'solid' ? `${ctx.team.name}: quiet climb, real one.` : null,

    // Season-stage
    (ctx) => ctx.seasonStage === 'final-stretch' ? `${ctx.team.name} is climbing with ${plural(ctx.bubble?.weeksLeft ?? 3, 'week')} left. The timing is perfect.` : null,
    (ctx) => ctx.seasonStage === 'late' ? `Late-season climb. ${ctx.team.name} is on the move at the right time.` : null,
    (ctx) => ctx.seasonStage === 'early' ? `Early-season climb. ${ctx.team.name} announces themselves.` : null,

    // History-aware
    (ctx) => ctx.rank.seasonHigh > ctx.rank.current ? `${ctx.team.name}: new season high at ${ord(ctx.rank.current)}.` : null,
    (ctx) => ctx.rank.seasonLow >= 8 && ctx.rank.current <= 5 ? `${ctx.team.name} was ${ord(ctx.rank.seasonLow)} earlier this year. Now ${ord(ctx.rank.current)}.` : null,

    // Verb-led
    (ctx) => `Climbed. ${ctx.team.name}.`,
    (ctx) => `Surged. ${ctx.team.name}. ${ord(ctx.rank.current)} now.`,
    (ctx) => `${ctx.team.name} rose ${plural(ctx.rank.previous - ctx.rank.current, 'spot')}. Asking the rest of the league for a counter.`,

    // Quiet-confidence
    (ctx) => `${ctx.team.name} is not done climbing.`,
    (ctx) => `${ctx.team.name} keeps putting up cats. The board keeps moving.`,
    (ctx) => `${ctx.team.name}. The chase team of the year.`,

    // Closer flavor
    (ctx) => `The ${ctx.team.name} ${pick(SYN.RUN)} is real.`,
    (ctx) => `${ctx.team.name} climbed back into the conversation.`,
  ],
  bodies: [
    // Stat-led
    (ctx) => `${ctx.record.wins}-${ctx.record.losses}-${ctx.record.ties}. ${ctx.record.streak}. ${ctx.team.name} climbed from ${ord(ctx.rank.previous)} to ${ord(ctx.rank.current)} this week.`,
    (ctx) => `${plural(ctx.rank.previous - ctx.rank.current, 'spot')} jumped. ${plural(ctx.record.streakLength, 'straight')}. ${ctx.team.name} is the week's loudest climber.`,
    (ctx) => `${ctx.team.name}: ${ord(ctx.rank.previous)} last week, ${ord(ctx.rank.current)} this week. The cats are doing the work.`,

    // Category-anchored
    (ctx) => ctx.category.topCats.length >= 2 ? `${ctx.team.name} now leads ${catList(ctx.category.topCats)}. The category climb came first; the ranking followed.` : null,
    (ctx) => ctx.category.weekSweepCats && ctx.category.weekSweepCats.length >= 2 ? `${catList(ctx.category.weekSweepCats)} swept this week. ${ctx.team.name} owns those columns now.` : null,
    (ctx) => ctx.category.recentlyChangedCats.length >= 2 ? `${ctx.team.name}'s ${catList(ctx.category.recentlyChangedCats)} profile flipped. The roster has a new shape.` : null,

    // Streak-anchored
    (ctx) => ctx.record.streakDirection === 'W' && ctx.record.streakLength >= 4 ? `${plural(ctx.record.streakLength, 'straight win')}. The kind of stretch that puts a team in the top three for good.` : null,
    (ctx) => ctx.record.streakDirection === 'W' && ctx.record.streakLength >= 3 ? `Three in a row. ${ctx.team.name} is putting cats together with a real rhythm.` : null,

    // Magnitude
    (ctx) => ctx.magnitude === 'historic' ? `Biggest weekly climb of the year. ${ctx.team.name} cleared ${plural(ctx.rank.previous - ctx.rank.current, 'spot')} in seven days.` : null,
    (ctx) => ctx.magnitude === 'huge' ? `${ctx.team.name} put up a five-cat week and a clean win. The board responded.` : null,
    (ctx) => ctx.magnitude === 'solid' ? `Not a top-of-page climb. But ${ctx.team.name} keeps stacking weeks.` : null,

    // Season-stage
    (ctx) => ctx.seasonStage === 'final-stretch' ? `${plural(ctx.bubble?.weeksLeft ?? 3, 'week')} left. ${ctx.team.name} climbed into seeding range at the right time.` : null,
    (ctx) => ctx.seasonStage === 'late' ? `Late-season climber. The kind of team that scares the top seeds in round one.` : null,
    (ctx) => ctx.seasonStage === 'early' ? `Climbing early. The hard part is holding it. ${ctx.team.name} is on the right side of the work for now.` : null,

    // Owner-anchored
    (ctx) => `${ctx.team.owner} found a lineup that works. ${ctx.team.name} is the week's climber.`,
    (ctx) => `${ctx.team.owner} keeps making the right call. ${ctx.team.name} keeps climbing.`,

    // Historical
    (ctx) => ctx.rank.seasonLow >= 8 && ctx.rank.current <= 5 ? `From ${ord(ctx.rank.seasonLow)} earlier this season to ${ord(ctx.rank.current)} now. The arc is the story.` : null,
    (ctx) => ctx.rank.seasonHigh > ctx.rank.current ? `New season high at ${ord(ctx.rank.current)}. The ceiling moved with them.` : null,

    // Outlook
    (ctx) => `${ctx.team.name} is the chase team now. The teams above them have to answer.`,
    (ctx) => `Next week's matchup decides if ${ctx.team.name} stays on the climb.`,
    (ctx) => `${ctx.team.name} has the cats. The roster is locked in. The schedule helps.`,

    // Conversational
    (ctx) => `The group chat noticed. ${ctx.team.name} is the week's conversation.`,
    (ctx) => `${ctx.team.name} keeps showing up. The board responds.`,

    // Density
    (ctx) => `${ord(ctx.rank.previous)} to ${ord(ctx.rank.current)}, ${plural(ctx.record.streakLength, 'straight')}, ${plural(ctx.category.topCats.length, 'cat')} owned. The arc is clean.`,
    (ctx) => `${ctx.team.name}: ${ctx.record.streak} on the streak, ${plural(ctx.rank.previous - ctx.rank.current, 'spot')} on the ladder, no slowing.`,
  ],
}

/* ─────────────────────────────────────────────────────────────────
   KIND: DAILY-HERO-BUBBLE-SURPRISE
   Voice: novel, "didn't see this coming."
───────────────────────────────────────────────────────────────── */

const BUBBLE_SURPRISE: HomeTemplate = {
  kind: 'daily-hero-bubble-surprise',
  eyebrows: [
    () => 'STORY OF THE WEEK',
    () => 'DIDN\'T SEE THIS COMING',
    () => 'BUBBLE TEAM ALERT',
    () => 'OUT OF NOWHERE',
    () => 'WHO ORDERED THIS',
    () => 'BUBBLE SURPRISE',
    () => 'CLIMBING FROM THE BACK',
    () => 'THE QUIET MOVE',
    () => 'NOT ON THE RADAR',
    () => 'PLAYOFF NOISE',
    (ctx) => ctx.rank.seasonLow >= 8 ? 'OUT OF THE CELLAR' : 'BUBBLE SURPRISE',
  ],
  headlines: [
    // Punchy core
    (ctx) => `${ctx.team.name} climbed ${plural(ctx.rank.previous - ctx.rank.current, 'spot')} in two weeks.`,
    (ctx) => `${ctx.team.name} just bubbled up.`,
    (ctx) => `${ctx.team.name} is back on the bubble.`,
    (ctx) => `${ctx.team.name}. Quiet climb. Real one.`,
    (ctx) => `${ctx.team.name}. Bubble noise.`,
    (ctx) => `${ctx.team.name} is in the playoff conversation.`,

    // Stat-led
    (ctx) => `${ctx.team.name}: ${ord(ctx.rank.previous)} to ${ord(ctx.rank.current)} in seven days.`,
    (ctx) => ctx.rank.seasonLow >= 8 ? `${ctx.team.name} was ${ord(ctx.rank.seasonLow)}. Now ${ord(ctx.rank.current)}.` : null,
    (ctx) => `${ctx.team.name}: ${ctx.record.streak}. The bubble noticed.`,

    // Surprise framing
    (ctx) => `Didn't see this one coming. ${ctx.team.name} ${pick(SYN.CLIMBED)}.`,
    (ctx) => `${ctx.team.name} keeps showing up. The board adjusted.`,
    (ctx) => `${ctx.team.name}: nobody had this as the week's mover.`,
    (ctx) => `${ctx.team.name} found a path. The rest of the league has to notice.`,

    // Bubble-specific
    (ctx) => ctx.bubble ? `${ctx.team.name}: ${ctx.bubble.gamesBack <= 1 ? 'one game' : `${ctx.bubble.gamesBack} games`} from the cut.` : null,
    (ctx) => ctx.bubble && ctx.bubble.gamesBack <= 1 ? `${ctx.team.name}. One game from the bracket.` : null,
    (ctx) => ctx.bubble ? `${ctx.team.name} just put real ${pick(SYN.PRESSURE)} the cutoff.` : null,

    // Category-anchored
    (ctx) => ctx.category.topCats[0] ? `${ctx.team.name} took ${ctx.category.topCats[0]} this week. Bubble math followed.` : null,
    (ctx) => ctx.category.recentlyChangedCats.length >= 2 ? `${ctx.team.name} flipped ${plural(ctx.category.recentlyChangedCats.length, 'cat')}. The bubble shifted.` : null,

    // Streak-anchored
    (ctx) => ctx.record.streakDirection === 'W' && ctx.record.streakLength >= 2 ? `${plural(ctx.record.streakLength, 'straight win')}. ${ctx.team.name} bubbled into the picture.` : null,
    (ctx) => ctx.record.streakDirection === 'W' && ctx.record.streakLength >= 3 ? `${ctx.team.name}: ${plural(ctx.record.streakLength, 'in a row')}. The cellar feels far away.` : null,

    // Two-fragment punch
    (ctx) => `${ctx.team.name} climbed. The bubble shrank.`,
    (ctx) => `${ctx.team.name}. Off the back row. Onto the radar.`,
    (ctx) => `${ctx.team.name} ${pick(SYN.CLIMBED)}. The cutoff just got harder for everyone else.`,

    // Owner-anchored
    (ctx) => `${ctx.team.owner} found the formula. ${ctx.team.name} is on the bubble.`,
    (ctx) => `${ctx.team.owner}'s ${ctx.team.name}: back in it.`,

    // Three-fragment
    (ctx) => `${ctx.team.name}. ${ord(ctx.rank.current)}. Bubble.`,
    (ctx) => ctx.bubble ? `${plural(ctx.bubble.gamesBack, 'game')} back. ${ctx.team.name}. Closing.` : null,

    // Season-stage
    (ctx) => ctx.seasonStage === 'final-stretch' ? `${ctx.team.name} is bubbling with ${plural(ctx.bubble?.weeksLeft ?? 3, 'week')} left. The math is real.` : null,
    (ctx) => ctx.seasonStage === 'late' ? `Late-season climb from a team nobody had bracketed. ${ctx.team.name} is alive.` : null,

    // History-aware
    (ctx) => ctx.rank.seasonLow >= 8 ? `${ctx.team.name}: ${ord(ctx.rank.seasonLow)} to ${ord(ctx.rank.current)}. The arc is the story.` : null,

    // Magnitude
    (ctx) => ctx.magnitude === 'historic' ? `${ctx.team.name}: largest "from-outside-bracket" climb of the year.` : null,
    (ctx) => ctx.magnitude === 'huge' ? `${ctx.team.name} jumped ${plural(ctx.rank.previous - ctx.rank.current, 'spot')}. The bubble just got crowded.` : null,
    (ctx) => ctx.magnitude === 'solid' ? `${ctx.team.name} keeps stacking weeks. The bubble feels closer.` : null,

    // Direct
    (ctx) => `${ctx.team.name} is the team nobody was watching. Watch them now.`,
    (ctx) => `${ctx.team.name}: the league's quietest climb of the month.`,
    (ctx) => `${ctx.team.name} is the team in the way of the bracket.`,

    // Quiet-confidence
    (ctx) => `${ctx.team.name} keeps winning weeks. The cutoff teams are taking notice.`,
    (ctx) => `${ctx.team.name} is not where they were two weeks ago. Not by a lot.`,
  ],
  bodies: [
    // Stat-led
    (ctx) => `${ctx.record.wins}-${ctx.record.losses}-${ctx.record.ties}. ${ctx.record.streak}. ${ctx.team.name} is now ${ord(ctx.rank.current)} after starting the month at ${ord(ctx.rank.seasonLow)}.`,
    (ctx) => `${plural(ctx.rank.previous - ctx.rank.current, 'spot')} in two weeks. ${ctx.team.name} went from outside the bracket to inside the conversation.`,
    (ctx) => `${ctx.team.name}: ${ord(ctx.rank.seasonLow)} earlier this season, ${ord(ctx.rank.current)} this week. The arc is the story.`,

    // Bubble-anchored
    (ctx) => ctx.bubble ? `${plural(ctx.bubble.gamesBack, 'game')} back of the cut with ${plural(ctx.bubble.weeksLeft, 'week')} left. ${ctx.team.name} has a real path now.` : null,
    (ctx) => ctx.bubble && ctx.bubble.gamesBack <= 1 ? `One game from the cut. ${ctx.team.name} is breathing on the bracket.` : null,
    (ctx) => ctx.bubble ? `${ctx.team.name} just made the bubble crowded. The cutoff teams have to answer.` : null,

    // Category-anchored
    (ctx) => ctx.category.topCats.length >= 2 ? `${ctx.team.name} now leads ${catList(ctx.category.topCats)}. The roster moved categories before it moved the ladder.` : null,
    (ctx) => ctx.category.recentlyChangedCats.length >= 2 ? `${catList(ctx.category.recentlyChangedCats)} flipped this month. The profile is different. The wins followed.` : null,

    // Streak-anchored
    (ctx) => ctx.record.streakDirection === 'W' && ctx.record.streakLength >= 3 ? `${plural(ctx.record.streakLength, 'straight win')}. The kind of run that turns a back-row team into a bubble team in two weeks.` : null,

    // Magnitude
    (ctx) => ctx.magnitude === 'historic' ? `Largest "from outside the bracket" climb of the year. ${ctx.team.name} did it in ${plural(2, 'week')}.` : null,
    (ctx) => ctx.magnitude === 'huge' ? `${ctx.team.name}: ${plural(ctx.rank.previous - ctx.rank.current, 'spot')} this week. The whole bubble shifted.` : null,
    (ctx) => ctx.magnitude === 'solid' ? `Not a viral climb. But ${ctx.team.name} is closer to the bracket than they have been all year.` : null,

    // Season-stage
    (ctx) => ctx.seasonStage === 'final-stretch' ? `${plural(ctx.bubble?.weeksLeft ?? 3, 'week')} left. ${ctx.team.name} timed the climb. The bubble teams above them did not.` : null,
    (ctx) => ctx.seasonStage === 'late' ? `Late-season bubble teams either close or fold. ${ctx.team.name} is closing.` : null,

    // Outlook
    (ctx) => `The cutoff teams have ${plural(ctx.bubble?.weeksLeft ?? 3, 'week')} to push back.`,
    (ctx) => `${ctx.team.name} is now a problem for the teams trying to lock byes.`,
    (ctx) => `Next week's matchup tells the story. ${ctx.team.name} keeps climbing or gives the spot back.`,

    // Conversational
    (ctx) => `${ctx.team.owner} keeps grinding. ${ctx.team.name} keeps creeping up.`,
    (ctx) => `The room finally noticed. ${ctx.team.name} stopped being a punchline two weeks ago.`,
    () => `Group chat reaction: half surprise, half quiet vindication.`,

    // Density
    (ctx) => `${ord(ctx.rank.seasonLow)} to ${ord(ctx.rank.current)}, ${ctx.record.streak}, ${plural(ctx.category.topCats.length, 'cat')} owned. The bubble just shifted.`,
    (ctx) => `${ctx.team.name}: nobody had this. Everybody has to deal with it now.`,
  ],
}

/* ─────────────────────────────────────────────────────────────────
   KIND: DAILY-HERO-IDENTITY-SHIFT
   Voice: observational, analytical. A team's category profile changed.
───────────────────────────────────────────────────────────────── */

const IDENTITY_SHIFT: HomeTemplate = {
  kind: 'daily-hero-identity-shift',
  eyebrows: [
    () => 'STORY OF THE WEEK',
    () => 'IDENTITY SHIFT',
    () => 'NEW PROFILE',
    () => 'ROSTER RESHAPE',
    () => 'CATEGORY FLIP',
    () => 'DIFFERENT TEAM',
    () => 'NEW SHAPE',
    () => 'QUIET REINVENTION',
    () => 'PROFILE CHANGED',
    () => 'NEW LANES',
    (ctx) => ctx.category.recentlyChangedCats.length >= 3 ? 'WHOLE PROFILE FLIPPED' : 'IDENTITY SHIFT',
  ],
  headlines: [
    // Core "quietly became" framing
    (ctx) => ctx.category.topCats[0] ? `${ctx.team.name} quietly ${pick(SYN.IDENTITY_VERBS)} a ${ctx.category.topCats[0]} team.` : null,
    (ctx) => ctx.category.topCats[0] ? `${ctx.team.name}: now a ${ctx.category.topCats[0]} team.` : null,
    (ctx) => ctx.category.topCats[0] ? `${ctx.team.name} owns ${ctx.category.topCats[0]} now. That wasn't the plan.` : null,
    (ctx) => ctx.category.recentlyChangedCats.length >= 2 ? `${ctx.team.name}: new shape, new cats.` : null,

    // Counterpoint - they used to own something, now don't
    (ctx) => ctx.category.bleedingCats[0] && ctx.category.topCats[0] ? `${ctx.team.name} lost ${ctx.category.bleedingCats[0]}, took ${ctx.category.topCats[0]}.` : null,
    (ctx) => ctx.category.bleedingCats.length >= 2 ? `${ctx.team.name}: ${catList(ctx.category.bleedingCats)} gone. New cats took the slot.` : null,

    // Stat-led
    (ctx) => `${ctx.team.name}: different team than three weeks ago.`,
    (ctx) => `${ctx.team.name}. Same name. New profile.`,
    (ctx) => `${ctx.team.name} rebuilt the cat profile mid-season.`,
    (ctx) => ctx.category.recentlyChangedCats.length >= 3 ? `${plural(ctx.category.recentlyChangedCats.length, 'cat')} flipped for ${ctx.team.name}. The roster looks different.` : null,

    // Observational
    (ctx) => `Quietly: ${ctx.team.name} ${pick(SYN.IDENTITY_VERBS)} a different team.`,
    (ctx) => `${ctx.team.name} ${pick(SYN.IDENTITY_VERBS)} a category team. Nobody noticed for two weeks.`,
    (ctx) => ctx.category.topCats[0] ? `${ctx.category.topCats[0]} used to be the weakness. Now it's the lead cat.` : null,
    (ctx) => `${ctx.team.name}: trade deadline reshape worked.`,

    // Owner-anchored
    (ctx) => `${ctx.team.owner} made the moves. ${ctx.team.name} has a new shape.`,
    (ctx) => `${ctx.team.owner}'s ${ctx.team.name}: a different team than draft day.`,

    // Roster-rebuild flavor
    (ctx) => `${ctx.team.name} ${pick(SYN.IDENTITY_VERBS)} the team they were supposed to be.`,
    (ctx) => `${ctx.team.name}: the roster finally caught up to the plan.`,

    // Two-fragment punch
    (ctx) => ctx.category.topCats[0] && ctx.category.bleedingCats[0] ? `${ctx.team.name} gave up ${ctx.category.bleedingCats[0]}. Took ${ctx.category.topCats[0]}. Net win.` : null,
    (ctx) => `${ctx.team.name} traded the profile. The cats followed.`,
    (ctx) => `${ctx.team.name}. New lanes. New ceiling.`,

    // Three-fragment
    (ctx) => ctx.category.topCats[0] ? `${ctx.team.name}. ${ctx.category.topCats[0]}. Yes, really.` : null,

    // Season-stage
    (ctx) => ctx.seasonStage === 'mid' ? `${ctx.team.name} reshaped the roster at the right time.` : null,
    (ctx) => ctx.seasonStage === 'late' ? `Late-season identity shift. ${ctx.team.name} is a different playoff team now.` : null,

    // Magnitude
    (ctx) => ctx.magnitude === 'historic' ? `${ctx.team.name}: most cats-flipped of any team this season.` : null,
    (ctx) => ctx.magnitude === 'huge' ? `${ctx.team.name} flipped ${plural(ctx.category.recentlyChangedCats.length, 'cat')} in three weeks. That's a roster overhaul.` : null,

    // Stats-up-front
    (ctx) => `${plural(ctx.category.recentlyChangedCats.length, 'category', 'categories')} flipped. ${ctx.team.name}.`,
    (ctx) => `${ctx.team.name}: ${plural(ctx.category.topCats.length, 'cat')} owned that they didn't own last month.`,

    // Verb-led
    (ctx) => `Rebuilt. ${ctx.team.name}.`,
    (ctx) => `Reshaped. ${ctx.team.name}. New profile.`,
    (ctx) => `Pivoted. ${ctx.team.name}. The board agrees.`,

    // Direct
    (ctx) => `${ctx.team.name} is a different team. The standings will catch up.`,
    (ctx) => `${ctx.team.name}: the roster reshape is finally visible in the cats.`,

    // Quiet-tilt
    (ctx) => `${ctx.team.name}. The trade deadline didn't trend. The results just did.`,
    (ctx) => `${ctx.team.name}: same record, different shape. That matters in the bracket.`,
    (ctx) => `${ctx.team.name} ${pick(SYN.IDENTITY_VERBS)} the team that wins close cat races.`,
  ],
  bodies: [
    // Stat-led
    (ctx) => `${plural(ctx.category.recentlyChangedCats.length, 'category', 'categories')} flipped in the last ${plural(3, 'week')}. ${ctx.team.name} now leads ${catList(ctx.category.topCats)}.`,
    (ctx) => `${ctx.team.name}: ${catList(ctx.category.recentlyChangedCats)} all moved this month. The roster is doing different things now.`,
    (ctx) => `${ctx.team.name}. Same record. ${plural(ctx.category.recentlyChangedCats.length, 'cat')} profile change. The path to the bracket shifted.`,

    // Top-cat / bleeding-cat juxtaposition
    (ctx) => ctx.category.topCats[0] && ctx.category.bleedingCats[0] ? `${ctx.team.name} gave up ${ctx.category.bleedingCats[0]}, took ${ctx.category.topCats[0]}. Different roster, same wins.` : null,
    (ctx) => ctx.category.bleedingCats.length >= 2 ? `${catList(ctx.category.bleedingCats)} are gone from the lead column. ${catList(ctx.category.topCats)} took their place.` : null,

    // Mechanism (trade / waiver / health)
    (ctx) => `Two trades, four waiver moves. ${ctx.team.name} reshuffled the cat profile in three weeks.`,
    (ctx) => `${ctx.team.name}: the deadline moves are paying. The profile is different, and the cats are following.`,

    // Analytical
    (ctx) => `${ctx.team.name} drafted as a power team. They're winning as a speed-and-saves team. Different season.`,
    (ctx) => `The roster ${ctx.team.owner} drafted is not the roster on the field. The cats agree.`,

    // Magnitude
    (ctx) => ctx.magnitude === 'historic' ? `Most cat-profile change of any team this season. ${ctx.team.name} ran the table on the reshape.` : null,
    (ctx) => ctx.magnitude === 'huge' ? `${ctx.team.name} flipped ${plural(ctx.category.recentlyChangedCats.length, 'cat')} in a month. That's a different fantasy team.` : null,
    (ctx) => ctx.magnitude === 'solid' ? `Quiet roster work. ${ctx.team.name} has a real new profile.` : null,

    // Season-stage
    (ctx) => ctx.seasonStage === 'late' ? `Late-season identity shift. ${ctx.team.name} is a harder playoff matchup than they were a month ago.` : null,
    (ctx) => ctx.seasonStage === 'mid' ? `Mid-season reshape. ${plural(ctx.bubble?.weeksLeft ?? 8, 'week')} left to ride it.` : null,

    // Outlook
    (ctx) => `${ctx.team.name} is now built for ${catList(ctx.category.topCats)}. That's a real bracket profile.`,
    (ctx) => `The teams that played ${ctx.team.name} in week 4 are seeing a different team in week ${ctx.weekNumber}.`,
    (ctx) => `The owner-of-record changed the lanes. ${ctx.team.name} is winning new cats now.`,

    // Conversational
    (ctx) => `${ctx.team.owner} did the work. The cats finally caught up.`,
    () => `The group chat hasn't fully recalibrated. The cats already did.`,

    // Density
    (ctx) => `Different cats, different profile, same name. ${ctx.team.name} is a different team than the one on draft day.`,
    (ctx) => `${ctx.team.name}: ${plural(ctx.category.recentlyChangedCats.length, 'cat')} flipped, ${plural(ctx.category.topCats.length, 'cat')} owned, no roster panic.`,
  ],
}

/* ─────────────────────────────────────────────────────────────────
   KIND: DAILY-HERO-SWEEP-WEEKEND
   Voice: dominance language. Big sweep in progress.
───────────────────────────────────────────────────────────────── */

const SWEEP_WEEKEND: HomeTemplate = {
  kind: 'daily-hero-sweep-weekend',
  eyebrows: [
    () => 'STORY OF THE WEEK',
    () => 'SWEEP WEEKEND',
    () => 'CLEAN SWEEP',
    () => 'TOTAL SWEEP',
    () => 'RAN THE TABLE',
    () => 'FULL DOMINANCE',
    () => 'WALL TO WALL',
    () => 'NO CONTEST',
    () => 'CATEGORY DOMINANCE',
    () => 'UNCONTESTED',
    (ctx) => (ctx.category.weekSweepCats?.length ?? 0) >= 5 ? 'FIVE-CAT SWEEP' : 'SWEEP WEEKEND',
  ],
  headlines: [
    // Core sweep framing
    (ctx) => ctx.opponent ? `${ctx.team.name} swept ${ctx.opponent.name}.` : `${ctx.team.name} swept the weekend.`,
    (ctx) => ctx.opponent ? `${ctx.team.name} ${pick(SYN.SWEPT)} ${ctx.opponent.name}. ${ctx.record.wins}-${ctx.record.losses} on the cat split.` : null,
    (ctx) => `${ctx.team.name} ran the table.`,
    (ctx) => `${ctx.team.name}: clean sweep.`,
    (ctx) => `${ctx.team.name} ${pick(SYN.SWEPT)} the cats.`,

    // Stat-led
    (ctx) => ctx.category.weekSweepCats && ctx.category.weekSweepCats.length >= 3 ? `${ctx.team.name}: ${plural(ctx.category.weekSweepCats.length, 'cat')} swept this weekend.` : null,
    (ctx) => ctx.category.weekSweepCats && ctx.category.weekSweepCats.length >= 4 ? `${ctx.team.name} swept ${catList(ctx.category.weekSweepCats)}.` : null,
    (ctx) => ctx.opponent ? `${ctx.team.name} ${ctx.record.wins}-${ctx.record.losses} weekend. ${ctx.opponent.name} blanked.` : null,

    // Specific-cat sweep
    (ctx) => ctx.category.weekSweepCats?.[0] === 'HR' ? `${ctx.team.name} swept HR. The power side is locked.` : null,
    (ctx) => ctx.category.weekSweepCats?.includes('K') ? `${ctx.team.name} swept K. The arms did the work.` : null,
    (ctx) => ctx.category.weekSweepCats?.includes('SV') ? `${ctx.team.name} swept SV. The bullpen never blinked.` : null,
    (ctx) => ctx.category.weekSweepCats && ctx.category.weekSweepCats.length >= 2 && ctx.category.weekSweepCats.every((c) => ['W', 'K', 'SV', 'HLD', 'ERA', 'WHIP', 'QS', 'K9'].includes(c)) ? `${ctx.team.name} swept the pitching side.` : null,
    (ctx) => ctx.category.weekSweepCats && ctx.category.weekSweepCats.length >= 2 && ctx.category.weekSweepCats.every((c) => ['R', 'H', 'HR', 'RBI', 'SB', 'AVG', 'OPS', 'TB', 'BB'].includes(c)) ? `${ctx.team.name} swept the hitting side.` : null,

    // Two-fragment punch
    (ctx) => ctx.opponent ? `${ctx.team.name} ${pick(SYN.SWEPT)} ${ctx.opponent.name}. Nothing close.` : null,
    (ctx) => `${ctx.team.name}: clean weekend. No cats lost.`,
    (ctx) => `${ctx.team.name} took everything. The other side got nothing.`,

    // Three-fragment
    (ctx) => ctx.opponent ? `${ctx.team.name} swept. ${ctx.opponent.name} blanked. Done.` : null,
    (ctx) => `Sweep. ${ctx.team.name}. Clean.`,

    // Dominance language
    (ctx) => `${ctx.team.name} owned every column.`,
    (ctx) => `${ctx.team.name}: every cat. Every day.`,
    (ctx) => `${ctx.team.name} ran ${plural(ctx.category.weekSweepCats?.length ?? 4, 'cat')} unanswered.`,
    (ctx) => `Wall-to-wall ${ctx.team.name}.`,

    // Magnitude
    (ctx) => ctx.magnitude === 'historic' ? `${ctx.team.name}: first clean sweep of the year.` : null,
    (ctx) => ctx.magnitude === 'historic' ? `${ctx.team.name} swept every cat. That had not been done all season.` : null,
    (ctx) => ctx.magnitude === 'huge' ? `${ctx.team.name}. Five-cat sweep. The kind of weekend that locks a seed.` : null,

    // Season-stage
    (ctx) => ctx.seasonStage === 'final-stretch' ? `${ctx.team.name} swept with ${plural(ctx.bubble?.weeksLeft ?? 2, 'week')} left. Seeding statement.` : null,
    (ctx) => ctx.seasonStage === 'late' ? `Late-season sweep. ${ctx.team.name} is announcing playoff form.` : null,

    // Owner-anchored
    (ctx) => `${ctx.team.owner}'s ${ctx.team.name}: clean weekend. Nobody got a cat back.`,
    (ctx) => `${ctx.team.owner} took every column. ${ctx.team.name} is rolling.`,

    // Opponent-anchored direct
    (ctx) => ctx.opponent ? `${ctx.opponent.name} could not find a single cat.` : null,
    (ctx) => ctx.opponent ? `${ctx.team.name} over ${ctx.opponent.name}: nine-zero on the categories.` : null,
    (ctx) => ctx.opponent ? `${ctx.opponent.name} blanked. ${ctx.team.name} ${pick(SYN.SWEPT)} the room.` : null,

    // Streak-aware
    (ctx) => ctx.record.streakDirection === 'W' && ctx.record.streakLength >= 3 ? `${plural(ctx.record.streakLength, 'straight')}. ${ctx.team.name} swept this one for the cushion.` : null,

    // Verb-led
    (ctx) => `Swept. ${ctx.team.name}.`,
    (ctx) => `Cleaned the room. ${ctx.team.name}.`,
    (ctx) => `Ran the table. ${ctx.team.name}. Nothing left for anyone else.`,

    // Quiet-confidence
    (ctx) => `${ctx.team.name}. No cats lost. No real contest.`,
    (ctx) => `${ctx.team.name} swept and didn't trend. The result still counts.`,
    (ctx) => `${ctx.team.name}: when this roster is healthy, the room looks like this.`,
  ],
  bodies: [
    // Stat-led
    (ctx) => `${ctx.record.wins}-${ctx.record.losses}-${ctx.record.ties} on the week. ${ctx.team.name} swept every contested cat.`,
    (ctx) => ctx.category.weekSweepCats && ctx.category.weekSweepCats.length >= 3 ? `${plural(ctx.category.weekSweepCats.length, 'cat')} swept: ${catList(ctx.category.weekSweepCats)}. Nothing for the other side.` : null,
    (ctx) => ctx.opponent ? `${ctx.team.name} over ${ctx.opponent.name}: a clean weekend. Every cat went their way.` : null,

    // Side-split
    (ctx) => ctx.category.weekSweepCats && ctx.category.weekSweepCats.every((c) => ['W', 'K', 'SV', 'HLD', 'ERA', 'WHIP', 'QS', 'K9'].includes(c)) ? `Pitching side: ${catList(ctx.category.weekSweepCats)}. The arms locked it.` : null,
    (ctx) => ctx.category.weekSweepCats && ctx.category.weekSweepCats.every((c) => ['R', 'H', 'HR', 'RBI', 'SB', 'AVG', 'OPS', 'TB', 'BB'].includes(c)) ? `Hitting side: ${catList(ctx.category.weekSweepCats)}. The lineup did everything.` : null,

    // Magnitude
    (ctx) => ctx.magnitude === 'historic' ? `First clean weekend sweep all year. ${ctx.team.name} cleared every column.` : null,
    (ctx) => ctx.magnitude === 'huge' ? `${plural(ctx.category.weekSweepCats?.length ?? 5, 'cat')} swept. That's a seed-locking weekend.` : null,
    (ctx) => ctx.magnitude === 'solid' ? `Quietly clean sweep. The numbers got there and never looked back.` : null,

    // Season-stage
    (ctx) => ctx.seasonStage === 'final-stretch' ? `${plural(ctx.bubble?.weeksLeft ?? 2, 'week')} left. ${ctx.team.name} sweeps to lock seeding.` : null,
    (ctx) => ctx.seasonStage === 'late' ? `${ctx.team.name} is playing the kind of weekend that lasts in October.` : null,

    // Streak
    (ctx) => ctx.record.streakDirection === 'W' && ctx.record.streakLength >= 3 ? `${plural(ctx.record.streakLength, 'straight')}. The sweep weekend gives them the cushion.` : null,

    // Opponent-aware
    (ctx) => ctx.opponent ? `${ctx.opponent.name} could not find a cat to chase. ${ctx.team.name} closed every door.` : null,
    (ctx) => ctx.opponent ? `${ctx.opponent.name} was the cat-race team. ${ctx.team.name} made it not close.` : null,

    // Outlook
    () => `The kind of weekend that ${pick(SYN.LOCKED)} a ranking.`,
    (ctx) => `${ctx.team.name} is the favored side now. The cats agree.`,

    // Conversational
    (ctx) => `${ctx.team.owner} cleaned up. ${ctx.team.name} cashed the week.`,
    () => `Group chat: silent. The box score said everything.`,
    (ctx) => `${ctx.team.name} ran the room. Nobody else got close.`,

    // Density
    (ctx) => `${ctx.record.wins}-${ctx.record.losses} sweep, ${plural(ctx.category.weekSweepCats?.length ?? 4, 'cat')} clean, no contested column left.`,
    (ctx) => `${ctx.team.name}: full sweep, real cushion, no caveats.`,
  ],
}

/* ─────────────────────────────────────────────────────────────────
   KIND: DAILY-HERO-COMEBACK-TEAM
   Voice: rebound framing. Team returning from a fall.
───────────────────────────────────────────────────────────────── */

const COMEBACK_TEAM: HomeTemplate = {
  kind: 'daily-hero-comeback-team',
  eyebrows: [
    () => 'STORY OF THE WEEK',
    () => 'COMEBACK',
    () => 'BACK FROM THE BASEMENT',
    () => 'REBOUND',
    () => 'BACK ON THE BOARD',
    () => 'NOT DEAD YET',
    () => 'THE RETURN',
    () => 'BOUNCE-BACK',
    () => 'STILL IN IT',
    () => 'BACK IN THE CONVERSATION',
    (ctx) => ctx.rank.seasonLow >= 9 ? 'OUT OF THE CELLAR' : 'COMEBACK',
  ],
  headlines: [
    // Core comeback framing
    (ctx) => `${ctx.team.name} is back on the bubble.`,
    (ctx) => `${ctx.team.name}: back in it.`,
    (ctx) => `${ctx.team.name} is ${pick(SYN.BACK_FROM)} the basement.`,
    (ctx) => `${ctx.team.name} is back in the conversation.`,
    (ctx) => `${ctx.team.name}. Back on the board.`,

    // Stat-led arc
    (ctx) => ctx.rank.seasonLow >= 9 ? `${ctx.team.name} was ${ord(ctx.rank.seasonLow)} two weeks ago. Now ${ord(ctx.rank.current)}.` : null,
    (ctx) => `${ctx.team.name}: ${ord(ctx.rank.previous)} to ${ord(ctx.rank.current)} in one week.`,
    (ctx) => `${ctx.team.name}: ${ctx.record.streak}. The fall is over.`,
    (ctx) => ctx.record.streakDirection === 'W' && ctx.record.streakLength >= 2 ? `${plural(ctx.record.streakLength, 'straight win')}. ${ctx.team.name} is back.` : null,

    // Direct rebound
    (ctx) => `${ctx.team.name} ${pick(SYN.STILL_IN)}.`,
    (ctx) => `${ctx.team.name}: not finished after all.`,
    (ctx) => `${ctx.team.name} found the floor. The climb started.`,
    (ctx) => `${ctx.team.name} answered.`,

    // Category-anchored
    (ctx) => ctx.category.topCats[0] ? `${ctx.team.name} took ${ctx.category.topCats[0]} back.` : null,
    (ctx) => ctx.category.recentlyChangedCats.length >= 2 ? `${ctx.team.name} flipped ${plural(ctx.category.recentlyChangedCats.length, 'cat')} back in their favor.` : null,

    // Two-fragment punch
    (ctx) => `${ctx.team.name} dug out. Two weeks of work.`,
    (ctx) => `${ctx.team.name} is alive. The bracket math agrees.`,
    (ctx) => `${ctx.team.name} ${pick(SYN.STILL_IN)}. Don't write them off.`,

    // Three-fragment
    (ctx) => `${ctx.team.name}. Back. Climbing.`,
    (ctx) => `Cellar. Climb. ${ctx.team.name}.`,

    // Owner-anchored
    (ctx) => `${ctx.team.owner} kept making the moves. ${ctx.team.name} is back.`,
    (ctx) => `${ctx.team.owner}'s ${ctx.team.name}: not the team they were three weeks ago.`,

    // Comparative
    (ctx) => `${ctx.team.name} two weeks ago: ${ord(ctx.rank.seasonLow)}. ${ctx.team.name} now: ${ord(ctx.rank.current)}.`,
    (ctx) => `${ctx.team.name}: same record line as the bubble teams above them.`,

    // Streak-aware
    (ctx) => ctx.record.streakDirection === 'W' && ctx.record.streakLength >= 3 ? `${plural(ctx.record.streakLength, 'in a row')}. ${ctx.team.name} dragged themselves back.` : null,

    // Magnitude
    (ctx) => ctx.magnitude === 'historic' ? `${ctx.team.name}: ${ord(ctx.rank.seasonLow)} to ${ord(ctx.rank.current)}. Largest comeback of the year.` : null,
    (ctx) => ctx.magnitude === 'huge' ? `${ctx.team.name} climbed ${plural(ctx.rank.seasonLow - ctx.rank.current, 'spot')} in three weeks.` : null,
    (ctx) => ctx.magnitude === 'solid' ? `${ctx.team.name}: quiet rebound, real one.` : null,

    // Season-stage
    (ctx) => ctx.seasonStage === 'final-stretch' ? `${ctx.team.name} is back with ${plural(ctx.bubble?.weeksLeft ?? 3, 'week')} left. The bracket is open.` : null,
    (ctx) => ctx.seasonStage === 'late' ? `Late-season climb back. ${ctx.team.name} is the kind of team nobody wants in round one.` : null,

    // Verb-led
    (ctx) => `Climbed back. ${ctx.team.name}.`,
    (ctx) => `${ctx.team.name} rebounded. The board adjusted.`,

    // Quiet-confidence
    (ctx) => `${ctx.team.name} kept working. The cats kept coming. ${ord(ctx.rank.current)} now.`,
    (ctx) => `${ctx.team.name}: the climb takes patience. They had it.`,
    (ctx) => `${ctx.team.name} is the bracket spoiler nobody booked.`,

    // History-aware
    (ctx) => ctx.history && ctx.history.teamPriorPeak && ctx.history.teamPriorPeak <= 3 ? `${ctx.team.name} was ${ord(ctx.history.teamPriorPeak)} earlier. They remember how.` : null,

    // Direct
    (ctx) => `${ctx.team.name} is back in the playoff math.`,
    (ctx) => `${ctx.team.name} is no longer a punchline.`,
  ],
  bodies: [
    // Stat-led
    (ctx) => `${ctx.record.wins}-${ctx.record.losses}-${ctx.record.ties}. ${ctx.record.streak}. ${ctx.team.name} climbed from ${ord(ctx.rank.seasonLow)} to ${ord(ctx.rank.current)} in the last ${plural(3, 'week')}.`,
    (ctx) => `${plural(ctx.rank.seasonLow - ctx.rank.current, 'spot')} in three weeks. ${ctx.team.name} is the league's comeback team.`,
    (ctx) => `${ctx.team.name}: rough April. Clean June. Currently ${ord(ctx.rank.current)} and rising.`,

    // Comeback narrative
    (ctx) => `Two weeks ago ${ctx.team.name} was in the cellar. ${ctx.record.streak} since.`,
    (ctx) => `The rebuild started week ${Math.max(1, ctx.weekNumber - ctx.record.streakLength)}. ${ctx.team.name} is the result.`,

    // Category-anchored
    (ctx) => ctx.category.topCats.length >= 2 ? `${ctx.team.name} now leads ${catList(ctx.category.topCats)}. None of those were lead cats two weeks ago.` : null,
    (ctx) => ctx.category.recentlyChangedCats.length >= 2 ? `${catList(ctx.category.recentlyChangedCats)} all flipped back. ${ctx.team.name} found the roster.` : null,

    // Streak-anchored
    (ctx) => ctx.record.streakDirection === 'W' && ctx.record.streakLength >= 3 ? `${plural(ctx.record.streakLength, 'straight win')}. The kind of run that turns a bottom-three team into a bubble team.` : null,

    // Magnitude
    (ctx) => ctx.magnitude === 'historic' ? `Largest single-season comeback of the year. ${ctx.team.name} cleared ${plural(ctx.rank.seasonLow - ctx.rank.current, 'spot')}.` : null,
    (ctx) => ctx.magnitude === 'huge' ? `${ctx.team.name} climbed ${plural(ctx.rank.seasonLow - ctx.rank.current, 'spot')} in three weeks. Hard to do.` : null,
    (ctx) => ctx.magnitude === 'solid' ? `Not a viral climb. But ${ctx.team.name} is back inside the conversation.` : null,

    // Season-stage
    (ctx) => ctx.seasonStage === 'final-stretch' ? `${plural(ctx.bubble?.weeksLeft ?? 3, 'week')} left. ${ctx.team.name} is closer to the cut than the basement now.` : null,
    (ctx) => ctx.seasonStage === 'late' ? `Late-season climb. The teams that started slow are usually written off. Not this one.` : null,

    // Outlook
    (ctx) => `${ctx.team.name} is the team nobody wants to draw in round one.`,
    (ctx) => `If the climb continues, ${ctx.team.name} forces the bracket math next week.`,
    (ctx) => `${ctx.team.owner} kept making moves. The roster found a shape.`,

    // History
    (ctx) => ctx.history && ctx.history.teamPriorPeak && ctx.history.teamPriorPeak <= 3 ? `Top-three finisher last year. ${ctx.team.name} is climbing back toward form.` : null,

    // Conversational
    () => `Group chat had buried them. The standings page didn't.`,
    (ctx) => `${ctx.team.owner} never quit the season. ${ctx.team.name} is the proof.`,

    // Density
    (ctx) => `${ord(ctx.rank.seasonLow)} to ${ord(ctx.rank.current)}, ${ctx.record.streak}, ${plural(ctx.category.topCats.length, 'cat')} re-claimed. Real comeback.`,
    (ctx) => `${ctx.team.name}: rebuild visible in the cats now. The standings will keep agreeing.`,
  ],
}

/* ─────────────────────────────────────────────────────────────────
   KIND: DAILY-HERO-QUIET-DAY
   Voice: subdued, matter-of-fact. The voice CONTRACTS but does not
   disappear. Use when no overtake, no fall, no bubble shift. The
   most important variant set in the file — protects the system when
   the data is calm.
───────────────────────────────────────────────────────────────── */

const QUIET_DAY: HomeTemplate = {
  kind: 'daily-hero-quiet-day',
  eyebrows: [
    () => 'STORY OF THE WEEK',
    () => 'QUIET WEEK',
    () => 'STEADY',
    () => 'NO MOVES',
    () => 'CALM LADDER',
    () => 'HOLDING PATTERN',
    () => 'QUIET ON THE LADDER',
    () => 'NO HEADLINES',
    () => 'STATUS QUO',
    () => 'HELD SERVE',
    () => 'NOTHING MOVED',
    (ctx) => ctx.rank.weeksAtCurrent >= 3 ? `${ctx.rank.weeksAtCurrent} WEEKS AT #${ctx.rank.current}` : 'QUIET WEEK',
  ],
  headlines: [
    // Core quiet framing
    (ctx) => `${pick(SYN.QUIET_OPEN)}. ${ctx.team.name} ${pick(SYN.HELD_TOP)}.`,
    (ctx) => `${ctx.team.name} ${pick(SYN.HELD_LINE)}.`,
    () => `${pick(SYN.QUIET_OPEN)}. The ladder didn't move.`,
    (ctx) => `Quiet week. ${ctx.team.name} stayed at #${ctx.rank.current}.`,
    (ctx) => `Nothing big moved. ${ctx.team.name} held the top.`,

    // Held-serve direct
    (ctx) => `${ctx.team.name} held #${ctx.rank.current}.`,
    (ctx) => `${ctx.team.name} held serve.`,
    (ctx) => `${ctx.team.name}: ${plural(ctx.rank.weeksAtCurrent + 1, 'week')} at #${ctx.rank.current}.`,
    (ctx) => `${ctx.team.name} stayed put.`,
    (ctx) => `${ctx.team.name}. Same spot.`,

    // Matter-of-fact ladder
    (ctx) => `Steady week. ${ctx.team.name} ${pick(SYN.HELD_TOP)}. Nobody else moved.`,
    (ctx) => `Calm ladder. ${ctx.team.name} stayed at #${ctx.rank.current}.`,
    (ctx) => `${ctx.team.name} kept the top. The chasers didn't push.`,
    (ctx) => `No headlines this week. ${ctx.team.name} kept the seat anyway.`,

    // Numbers without drama
    (ctx) => `${ctx.team.name}. ${ctx.record.wins}-${ctx.record.losses}-${ctx.record.ties}. ${ord(ctx.rank.current)}.`,
    (ctx) => `${ctx.team.name}: ${ctx.record.streak}, same ranking.`,
    (ctx) => `Week ${ctx.weekNumber}. ${ctx.team.name} still at #${ctx.rank.current}.`,

    // Multi-week framing
    (ctx) => ctx.rank.weeksAtCurrent >= 2 ? `${ctx.team.name}: ${plural(ctx.rank.weeksAtCurrent + 1, 'week')} at #${ctx.rank.current}. The chase is quiet.` : null,
    (ctx) => ctx.rank.weeksAtCurrent >= 3 ? `${ctx.team.name}. ${plural(ctx.rank.weeksAtCurrent + 1, 'week')} unchanged.` : null,
    (ctx) => ctx.rank.weeksAtCurrent >= 4 ? `${ctx.team.name}. A month at the top. Quiet about it.` : null,

    // Two-fragment quiet
    (ctx) => `${ctx.team.name} held. Nobody pushed.`,
    (ctx) => `Quiet week. ${ctx.team.name} stays.`,
    (ctx) => `Status quo. ${ctx.team.name} at #${ctx.rank.current}.`,
    (ctx) => `${ctx.team.name} ${pick(SYN.HELD_LINE)}. The board didn't blink.`,

    // Three-fragment
    (ctx) => `${ctx.team.name}. ${ord(ctx.rank.current)}. Same.`,
    (ctx) => `Quiet. Steady. ${ctx.team.name}.`,

    // Direct
    (ctx) => `No drama. ${ctx.team.name} kept the seat.`,
    (ctx) => `The top didn't change. ${ctx.team.name} still owns it.`,
    (ctx) => `${ctx.team.name}: a week of holding what they already had.`,
    (ctx) => `${ctx.team.name}. Same lineup. Same result.`,

    // Owner-anchored
    (ctx) => `${ctx.team.owner}'s ${ctx.team.name}: held the line.`,
    (ctx) => `${ctx.team.owner} didn't need a big week. ${ctx.team.name} stayed.`,

    // League-context aware
    (ctx) => `Nobody else moved. ${ctx.team.name} stays at #${ctx.rank.current}.`,
    (ctx) => `The chase teams didn't connect. ${ctx.team.name} kept the cushion.`,

    // Closer-style
    (ctx) => `${ctx.team.name}. ${ord(ctx.rank.current)}. No drama. Wait for next week.`,
    (ctx) => `${ctx.team.name} keeps the seat. The chase resumes next week.`,
    (ctx) => `${ctx.team.name} held. The standings page sleeps.`,

    // Voice-contracted variants
    () => `Steady.`,
    (ctx) => `${ctx.team.name}: steady.`,
    () => `Same as it was.`,
    (ctx) => `${ctx.team.name}, same place.`,
    () => `Held. Held. Held.`,

    // Numbers-up-front
    (ctx) => `Week ${ctx.weekNumber}. #${ctx.rank.current}: ${ctx.team.name}. No change.`,
    (ctx) => `${plural(ctx.rank.weeksAtCurrent + 1, 'week')} unchanged. ${ctx.team.name} at the top.`,

    // Stake-down framing
    (ctx) => `Not every week moves the ladder. This one didn't. ${ctx.team.name} at #${ctx.rank.current}.`,
    (ctx) => `The board held shape. ${ctx.team.name} kept the seat.`,
    (ctx) => `Quiet on the surface. ${ctx.team.name} kept stacking weeks.`,

    // Editorial closers
    (ctx) => `${ctx.team.name}. Same. Watch next week.`,
    (ctx) => `${ctx.team.name} stayed. The chase will resume.`,
  ],
  bodies: [
    // Matter-of-fact stat
    (ctx) => `${ctx.record.wins}-${ctx.record.losses}-${ctx.record.ties}. Same rank as last week. ${ctx.team.name} keeps the top seat.`,
    (ctx) => `No movement at the top. ${ctx.team.name} stays at #${ctx.rank.current}. The chase teams could not put a clean week together.`,
    (ctx) => `${ctx.team.name}: ${plural(ctx.rank.weeksAtCurrent + 1, 'week')} at #${ctx.rank.current}. Status quo holds.`,

    // Ladder-shape framing
    () => `Nobody jumped more than one spot this week. The board reset to where it started.`,
    (ctx) => `Calm week across the standings. ${ctx.team.name} holds, the bubble teams hold, the basement holds.`,
    () => `Three close matchups, none of them flipped a cat lead. The ladder stayed where it was.`,

    // Outlook
    () => `Next week has three of the top-five matchups. The ladder will move then.`,
    (ctx) => `${ctx.team.name} keeps the cushion. The chase resumes after the off-week.`,
    () => `Two more weeks of holding patterns and the bracket math kicks in.`,

    // Quiet-confidence
    (ctx) => `${ctx.team.name} doesn't need a big week. They need to keep the floor.`,
    (ctx) => `Holding the seat is the work right now. ${ctx.team.name} did it.`,
    (ctx) => `${ctx.team.name}: nothing dropped, nothing slipped, no panic. That counts.`,

    // Season-stage
    (ctx) => ctx.seasonStage === 'early' ? `Week ${ctx.weekNumber}. The big swings are usually later. ${ctx.team.name} just keeps stacking.` : null,
    (ctx) => ctx.seasonStage === 'mid' ? `Mid-season holding pattern. ${ctx.team.name} sits at #${ctx.rank.current}. The ladder will tilt in the next month.` : null,
    (ctx) => ctx.seasonStage === 'late' ? `Late-season but quiet on the standings. ${ctx.team.name} keeps the seat without needing to do more.` : null,

    // Owner-anchored
    (ctx) => `${ctx.team.owner} didn't need to make a move. ${ctx.team.name} kept the lead.`,
    (ctx) => `${ctx.team.owner}: status-quo week. The standings agree.`,

    // Conversational
    (ctx) => `Quiet group chat. Nothing to argue about. ${ctx.team.name} still on top.`,
    () => `Slow news week. The standings page is the entire story.`,

    // Density (intentionally short)
    (ctx) => `${ctx.team.name}. #${ctx.rank.current}. Holding.`,
    () => `Same as last week. The room knows.`,
    (ctx) => `Week ${ctx.weekNumber}: nothing changed at the top.`,

    // Multi-week
    (ctx) => ctx.rank.weeksAtCurrent >= 3 ? `${plural(ctx.rank.weeksAtCurrent + 1, 'straight week')} at #${ctx.rank.current}. The chasers cannot find traction.` : null,
    (ctx) => ctx.rank.weeksAtCurrent >= 2 ? `${plural(ctx.rank.weeksAtCurrent + 1, 'week')} unchanged. The board does not always move on schedule.` : null,

    // Closer
    () => `Quiet week. Honest about it.`,
    () => `Not every week makes a headline. The ladder still keeps score.`,
  ],
}

/* ─────────────────────────────────────────────────────────────────
   KIND: PLAYOFF-PUSH-CLOSER
   Voice: editorial closer sentence that runs below the bubble rows.
   Headlines only — eyebrows + bodies arrays kept empty for the renderer.
───────────────────────────────────────────────────────────────── */

const PLAYOFF_PUSH_CLOSER: HomeTemplate = {
  kind: 'playoff-push-closer',
  eyebrows: [],
  bodies: [],
  headlines: [
    // Cut-line framing with both sides named
    (ctx) => ctx.bubble && ctx.bubble.topSeatTeams.length >= 2 ? `${ctx.bubble.topSeatTeams[0].name} and ${ctx.bubble.topSeatTeams[1].name} hold the last two seats. ${plural(ctx.bubble.bubbleTeams.length, 'team')} below need wins.` : null,
    (ctx) => ctx.bubble && ctx.bubble.topSeatTeams[0] ? `${ctx.bubble.topSeatTeams[0].name} holds the cutoff. ${plural(ctx.bubble.bubbleTeams.length, 'team')} chasing.` : null,
    (ctx) => ctx.bubble && ctx.bubble.bubbleTeams[0] ? `${ctx.bubble.bubbleTeams[0].name} sits one game out. The cut tightens every week.` : null,
    (ctx) => ctx.bubble && ctx.bubble.bubbleTeams.length >= 2 ? `${ctx.bubble.bubbleTeams[0].name} and ${ctx.bubble.bubbleTeams[1].name} are chasing the cut. ${plural(ctx.bubble.weeksLeft, 'week')} to find it.` : null,

    // Stakes-led
    (ctx) => ctx.bubble && ctx.bubble.stakes === 'tight' ? `Tight cut. Every match counts.` : null,
    (ctx) => ctx.bubble && ctx.bubble.stakes === 'tight' ? `${plural(ctx.bubble.bubbleTeams.length, 'team')} within ${plural(ctx.bubble.gamesBack, 'game')} of the cut.` : null,
    (ctx) => ctx.bubble && ctx.bubble.stakes === 'moderate' ? `Cut line is not locked. The bubble teams have a path.` : null,
    (ctx) => ctx.bubble && ctx.bubble.stakes === 'wide' ? `The cut is widening. Bubble teams need a sweep week to close it.` : null,

    // Week-count anchored
    (ctx) => ctx.bubble ? `${plural(ctx.bubble.weeksLeft, 'week')} left. ${plural(ctx.bubble.bubbleTeams.length, 'team')} still alive on the bubble.` : null,
    (ctx) => ctx.bubble && ctx.bubble.weeksLeft <= 2 ? `Two weeks left. The bubble teams are out of cushion.` : null,
    (ctx) => ctx.bubble && ctx.bubble.weeksLeft === 1 ? `One week left. The cut is decided next Sunday.` : null,
    (ctx) => ctx.bubble && ctx.bubble.weeksLeft >= 4 ? `${plural(ctx.bubble.weeksLeft, 'week')} left. Plenty of math still to do.` : null,

    // Cushion-aware
    (ctx) => ctx.bubble && ctx.bubble.gamesBack <= 1 ? `The bubble teams are one win from the bracket. The cutoff teams are one loss from it.` : null,
    (ctx) => ctx.bubble && ctx.bubble.gamesBack === 2 ? `Two-game gap between the cut and the chase. Three weeks to close it.` : null,
    (ctx) => ctx.bubble && ctx.bubble.gamesBack >= 3 ? `${plural(ctx.bubble.gamesBack, 'game')} back. The chase teams need a sweep week.` : null,

    // Three-team / multi-team framing
    (ctx) => ctx.bubble && ctx.bubble.bubbleTeams.length >= 3 ? `${plural(ctx.bubble.bubbleTeams.length, 'team')} chasing two seats. Somebody finishes outside.` : null,
    (ctx) => ctx.bubble && ctx.bubble.bubbleTeams.length === 2 ? `Two teams. One ${ctx.bubble.bubbleTeams.length === 2 ? 'spot' : 'seat'}. ${plural(ctx.bubble.weeksLeft, 'week')} to settle it.` : null,

    // Magnitude-conditional
    (ctx) => ctx.magnitude === 'historic' && ctx.bubble ? `Tightest bubble in years. ${plural(ctx.bubble.bubbleTeams.length, 'team')} within ${plural(ctx.bubble.gamesBack, 'game')} of the cut.` : null,
    (ctx) => ctx.magnitude === 'huge' && ctx.bubble ? `Five teams in three games. The bubble is the story for the rest of the season.` : null,

    // Verb-led
    (ctx) => ctx.bubble && ctx.bubble.bubbleTeams[0] ? `Wins or seats: ${ctx.bubble.bubbleTeams[0].name} has to push.` : null,
    () => `The cut is the only math that matters for the next few weeks.`,
    () => `Final stretch. Bubble decides itself.`,

    // Mixed framing
    (ctx) => ctx.bubble && ctx.bubble.topSeatTeams[0] && ctx.bubble.bubbleTeams[0] ? `${ctx.bubble.topSeatTeams[0].name} above. ${ctx.bubble.bubbleTeams[0].name} below. ${plural(ctx.bubble.gamesBack, 'game')} between them.` : null,
    (ctx) => ctx.bubble ? `${plural(ctx.bubble.topSeatTeams.length, 'team')} sit in seeding. ${plural(ctx.bubble.bubbleTeams.length, 'team')} chase. The board sorts itself in ${plural(ctx.bubble.weeksLeft, 'week')}.` : null,
  ],
}

/* ─────────────────────────────────────────────────────────────────
   KIND: TICKER-HOT-STREAK
   Voice: green-energy beat. Compact, one-sentence narrative.
───────────────────────────────────────────────────────────────── */

const TICKER_HOT_STREAK: HomeTemplate = {
  kind: 'ticker-hot-streak',
  eyebrows: [],
  bodies: [],
  headlines: [
    // Core
    (ctx) => ctx.ticker?.streakDescription ? `${ctx.team.name}: ${ctx.ticker.streakDescription}.` : null,
    (ctx) => ctx.record.streakDirection === 'W' ? `${ctx.team.name}: ${plural(ctx.record.streakLength, 'straight win')}.` : null,
    (ctx) => `${ctx.team.name} is ${pick(SYN.ROLLING)}.`,
    (ctx) => `${ctx.team.name}: ${ctx.record.streak}.`,
    (ctx) => `${ctx.team.name} is on a ${pick(SYN.RUN)}.`,

    // Stat-led counts
    (ctx) => ctx.record.streakDirection === 'W' && ctx.record.streakLength >= 4 ? `${ctx.team.name}: four straight wins.` : null,
    (ctx) => ctx.record.streakDirection === 'W' && ctx.record.streakLength >= 5 ? `${ctx.team.name}: five straight. Untouched.` : null,
    (ctx) => ctx.record.streakDirection === 'W' && ctx.record.streakLength >= 3 ? `${ctx.team.name}: three in a row.` : null,
    (ctx) => ctx.record.streakDirection === 'W' && ctx.record.streakLength >= 6 ? `${ctx.team.name}: ${ctx.record.streakLength} in a row. The schedule isn't slowing them.` : null,

    // Climbing-anchored
    (ctx) => `${ctx.team.name}: ${ord(ctx.rank.previous)} to ${ord(ctx.rank.current)}.`,
    (ctx) => (ctx.rank.previous - ctx.rank.current) >= 2 ? `${ctx.team.name}: +${ctx.rank.previous - ctx.rank.current} spots this week.` : null,
    (ctx) => (ctx.rank.previous - ctx.rank.current) >= 3 ? `${ctx.team.name}: ${plural(ctx.rank.previous - ctx.rank.current, 'spot')} in seven days.` : null,

    // Category-anchored
    (ctx) => ctx.ticker?.cat ? `${ctx.team.name}: swept ${ctx.ticker.cat} this week.` : null,
    (ctx) => ctx.category.topCats[0] ? `${ctx.team.name}: owns ${ctx.category.topCats[0]} now.` : null,
    (ctx) => ctx.category.weekSweepCats && ctx.category.weekSweepCats.length >= 2 ? `${ctx.team.name}: ${plural(ctx.category.weekSweepCats.length, 'cat')} swept this week.` : null,

    // Owner-anchored
    (ctx) => `${ctx.team.owner} is rolling. ${ctx.team.name} is the climb.`,
    (ctx) => `${ctx.team.owner}'s ${ctx.team.name}: hot week.`,

    // Two-fragment
    (ctx) => `${ctx.team.name} keeps stacking. The board agrees.`,
    (ctx) => `${ctx.team.name}: no losses for a week. Climbing.`,
    (ctx) => `${ctx.team.name} won't cool off.`,

    // Season-stage
    (ctx) => ctx.seasonStage === 'final-stretch' ? `${ctx.team.name}: ${ctx.record.streak}. Right time for it.` : null,
    (ctx) => ctx.seasonStage === 'late' ? `${ctx.team.name}: late-season heater.` : null,

    // Direct beat
    (ctx) => `${ctx.team.name}: ${pick(SYN.ROLLING)} into next week.`,
    (ctx) => `${ctx.team.name}: ${ctx.record.streak} and ${plural(ctx.category.topCats.length, 'cat')} owned.`,
    (ctx) => `${ctx.team.name}: hottest team in the league right now.`,
    (ctx) => `${ctx.team.name}: undefeated for ${plural(ctx.record.streakLength, 'week')}.`,
    (ctx) => `${ctx.team.name}: the climb is real.`,

    // Verb-led
    (ctx) => `Rolling: ${ctx.team.name}.`,
    (ctx) => `Hot: ${ctx.team.name}. ${ctx.record.streak}.`,
    (ctx) => `Surging: ${ctx.team.name}. Up to ${ord(ctx.rank.current)}.`,

    // Wider framing
    (ctx) => `${ctx.team.name} hasn't lost a week since the All-Star break.`,
    (ctx) => `${ctx.team.name}: longest active win streak in the league.`,
    (ctx) => `${ctx.team.name}: ${plural(ctx.record.streakLength, 'straight')}. Schedule keeps not mattering.`,

    // Numbers-up-front
    (ctx) => `${plural(ctx.record.streakLength, 'win')} in a row. ${ctx.team.name}.`,
    (ctx) => `${ctx.record.streak}. ${ctx.team.name}.`,

    // Closer-style ticker
    (ctx) => `${ctx.team.name} is the conversation right now.`,
    (ctx) => `${ctx.team.name}: nobody has cooled them off.`,
    (ctx) => `${ctx.team.name}: still climbing. Still winning.`,
    (ctx) => `${ctx.team.name}: rolling at the right time.`,

    // Mascot/owner color
    (ctx) => `${ctx.team.owner} cracked the code. ${ctx.team.name} keeps cashing.`,
    (ctx) => `${ctx.team.name}: a real ${pick(SYN.RUN)} now.`,

    // Magnitude
    (ctx) => ctx.magnitude === 'historic' ? `${ctx.team.name}: longest win streak of the season.` : null,
    (ctx) => ctx.magnitude === 'huge' ? `${ctx.team.name}: ${plural(ctx.record.streakLength, 'in a row')}. League-high streak.` : null,
  ],
}

/* ─────────────────────────────────────────────────────────────────
   KIND: TICKER-ROUGH-PATCH
   Voice: magenta-tinged beat. The team is bleeding.
───────────────────────────────────────────────────────────────── */

const TICKER_ROUGH_PATCH: HomeTemplate = {
  kind: 'ticker-rough-patch',
  eyebrows: [],
  bodies: [],
  headlines: [
    // Core
    (ctx) => ctx.ticker?.streakDescription ? `${ctx.team.name}: ${ctx.ticker.streakDescription}.` : null,
    (ctx) => ctx.record.streakDirection === 'L' ? `${ctx.team.name}: ${plural(ctx.record.streakLength, 'straight loss', 'straight losses')}.` : null,
    (ctx) => `${ctx.team.name} lost three of four.`,
    (ctx) => `${ctx.team.name}: rough week.`,
    (ctx) => `${ctx.team.name} is ${pick(SYN.BLEEDING)} cats.`,

    // Stat-led
    (ctx) => ctx.record.streakDirection === 'L' && ctx.record.streakLength >= 2 ? `${ctx.team.name}: ${ctx.record.streakLength} straight losses.` : null,
    (ctx) => ctx.record.streakDirection === 'L' && ctx.record.streakLength >= 3 ? `${ctx.team.name}: three in a row down.` : null,
    (ctx) => ctx.record.streakDirection === 'L' && ctx.record.streakLength >= 4 ? `${ctx.team.name}: four straight losses. The slide is real.` : null,

    // Rank slipping
    (ctx) => ctx.rank.current > ctx.rank.previous ? `${ctx.team.name}: ${ord(ctx.rank.previous)} to ${ord(ctx.rank.current)}.` : null,
    (ctx) => (ctx.rank.current - ctx.rank.previous) >= 2 ? `${ctx.team.name}: dropped ${plural(ctx.rank.current - ctx.rank.previous, 'spot')}.` : null,
    (ctx) => (ctx.rank.current - ctx.rank.previous) >= 3 ? `${ctx.team.name}: ${plural(ctx.rank.current - ctx.rank.previous, 'spot')} in seven days.` : null,

    // Category-anchored
    (ctx) => ctx.ticker?.cat ? `${ctx.team.name}: bleeding ${ctx.ticker.cat}.` : null,
    (ctx) => ctx.category.bleedingCats[0] ? `${ctx.team.name}: ${ctx.category.bleedingCats[0]} is leaking.` : null,
    (ctx) => ctx.category.bleedingCats.length >= 2 ? `${ctx.team.name}: ${plural(ctx.category.bleedingCats.length, 'cat')} ${pick(SYN.BLEEDING)} out.` : null,
    (ctx) => ctx.category.bleedingCats.includes('SV') ? `${ctx.team.name}: the bullpen is bleeding.` : null,
    (ctx) => ctx.category.bleedingCats.includes('HR') ? `${ctx.team.name}: the power went quiet.` : null,
    (ctx) => ctx.category.bleedingCats.includes('K') ? `${ctx.team.name}: the K column dried up.` : null,

    // Owner-anchored
    (ctx) => `${ctx.team.owner}: rough stretch. ${ctx.team.name} still finding it.`,
    (ctx) => `${ctx.team.owner}'s ${ctx.team.name}: real slump.`,

    // Two-fragment
    (ctx) => `${ctx.team.name} is leaking. The board agrees.`,
    (ctx) => `${ctx.team.name}: nothing's clicking.`,
    (ctx) => `${ctx.team.name}: slumping at the wrong time.`,

    // Position-on-ladder
    (ctx) => ctx.rank.current >= 8 ? `${ctx.team.name}: down to ${ord(ctx.rank.current)}.` : null,
    (ctx) => ctx.rank.seasonHigh === 1 && ctx.rank.current >= 4 ? `${ctx.team.name}: was #1, now ${ord(ctx.rank.current)}.` : null,

    // Season-stage
    (ctx) => ctx.seasonStage === 'final-stretch' ? `${ctx.team.name}: bad week at the worst time.` : null,
    (ctx) => ctx.seasonStage === 'late' ? `${ctx.team.name}: late-season slide.` : null,

    // Direct beat
    (ctx) => `${ctx.team.name}: rough patch into the next week.`,
    (ctx) => `${ctx.team.name}: the bullpen is bleeding.`,
    (ctx) => `${ctx.team.name}: cats keep falling.`,
    (ctx) => `${ctx.team.name}: ${ctx.record.streak} and dropping.`,
    (ctx) => `${ctx.team.name}: hardest week of the season.`,

    // Verb-led
    (ctx) => `Slumping: ${ctx.team.name}.`,
    (ctx) => `Falling: ${ctx.team.name}. ${ord(ctx.rank.current)} now.`,
    (ctx) => `Cooling: ${ctx.team.name}. The runs dried up.`,

    // Numbers-up-front
    (ctx) => `${plural(ctx.record.streakLength, 'loss', 'losses')} in a row. ${ctx.team.name}.`,
    (ctx) => `${ctx.record.streak}. ${ctx.team.name}. Slipping.`,

    // Wider framing
    (ctx) => `${ctx.team.name}: longest losing streak in the league right now.`,
    (ctx) => `${ctx.team.name}: hasn't won a week since the All-Star break.`,

    // Closer-style
    (ctx) => `${ctx.team.name}: needs a sweep or they're out of the conversation.`,
    (ctx) => `${ctx.team.name}: every cat the wrong direction.`,
    (ctx) => `${ctx.team.name}: the season isn't done, but the cushion is.`,

    // Magnitude
    (ctx) => ctx.magnitude === 'historic' ? `${ctx.team.name}: longest losing streak of the season.` : null,
    (ctx) => ctx.magnitude === 'huge' ? `${ctx.team.name}: dropped ${plural(ctx.rank.current - ctx.rank.previous, 'spot')} in a week.` : null,
  ],
}

/* ─────────────────────────────────────────────────────────────────
   KIND: TICKER-BUBBLE-WATCH
   Voice: teal-toned beat. Team on or near the cut.
───────────────────────────────────────────────────────────────── */

const TICKER_BUBBLE_WATCH: HomeTemplate = {
  kind: 'ticker-bubble-watch',
  eyebrows: [],
  bodies: [],
  headlines: [
    // Core
    (ctx) => ctx.ticker?.gamesFromCut !== undefined ? `${ctx.team.name}: ${plural(ctx.ticker.gamesFromCut, 'game')} from the cut.` : null,
    (ctx) => `${ctx.team.name}: ${ord(ctx.rank.current)}. On the bubble.`,
    (ctx) => ctx.bubble && ctx.bubble.gamesBack <= 1 ? `${ctx.team.name}: one game from the bracket.` : null,
    (ctx) => `${ctx.team.name}: bubble watch.`,
    (ctx) => `${ctx.team.name}: hanging on at ${ord(ctx.rank.current)}.`,

    // Cushion-aware
    (ctx) => ctx.ticker?.gamesFromCut === 1 ? `${ctx.team.name}: one game from the cut.` : null,
    (ctx) => ctx.ticker?.gamesFromCut === 0 ? `${ctx.team.name}: even with the cut.` : null,
    (ctx) => ctx.ticker?.gamesFromCut === 2 ? `${ctx.team.name}: two games out.` : null,

    // Rank-anchored
    (ctx) => ctx.rank.current === 6 || ctx.rank.current === 7 ? `${ctx.team.name}: ${ord(ctx.rank.current)} place. Right on the line.` : null,
    (ctx) => ctx.rank.current === 7 ? `${ctx.team.name}: one spot out of the bracket.` : null,
    (ctx) => ctx.rank.current === 6 ? `${ctx.team.name}: last team in.` : null,

    // Stakes
    (ctx) => `${ctx.team.name}: must-win week ahead.`,
    (ctx) => `${ctx.team.name}: every cat counts now.`,
    (ctx) => `${ctx.team.name}: cushion's gone.`,

    // Streak-anchored bubble
    (ctx) => ctx.record.streakDirection === 'W' && ctx.record.streakLength >= 2 ? `${ctx.team.name}: ${plural(ctx.record.streakLength, 'straight')}. Bubble climbing.` : null,
    (ctx) => ctx.record.streakDirection === 'L' && ctx.record.streakLength >= 2 ? `${ctx.team.name}: ${plural(ctx.record.streakLength, 'straight loss', 'straight losses')}. Bubble slipping.` : null,

    // Category-anchored
    (ctx) => ctx.category.topCats[0] ? `${ctx.team.name}: ${ctx.category.topCats[0]} keeps them in it.` : null,
    (ctx) => ctx.category.bleedingCats[0] ? `${ctx.team.name}: ${ctx.category.bleedingCats[0]} could decide the bubble.` : null,

    // Owner-anchored
    (ctx) => `${ctx.team.owner}'s ${ctx.team.name}: bubble math.`,
    (ctx) => `${ctx.team.owner}: every move matters now.`,

    // Two-fragment
    (ctx) => `${ctx.team.name}: alive. Barely.`,
    (ctx) => `${ctx.team.name}. Bubble. Still in.`,
    (ctx) => `${ctx.team.name}: cushion gone. Path open.`,

    // Path framing
    (ctx) => ctx.bubble ? `${ctx.team.name}: needs ${plural(Math.max(1, ctx.bubble.gamesBack), 'win')} to close the gap.` : null,
    (ctx) => ctx.bubble ? `${ctx.team.name}: ${plural(ctx.bubble.weeksLeft, 'week')} left. ${plural(ctx.bubble.gamesBack, 'game')} back.` : null,
    (ctx) => `${ctx.team.name}: path is narrow. Path is open.`,

    // Season-stage
    (ctx) => ctx.seasonStage === 'final-stretch' ? `${ctx.team.name}: ${plural(ctx.bubble?.weeksLeft ?? 2, 'week')} to settle the bubble.` : null,
    (ctx) => ctx.seasonStage === 'late' ? `${ctx.team.name}: late-season bubble team.` : null,

    // Direct beat
    (ctx) => `${ctx.team.name}: bracket math kicks in.`,
    (ctx) => `${ctx.team.name}: on notice at ${ord(ctx.rank.current)}.`,
    (ctx) => `${ctx.team.name}: holding on by a cat.`,
    (ctx) => `${ctx.team.name}: bubble watch live.`,

    // Verb-led
    (ctx) => `Bubble: ${ctx.team.name}.`,
    (ctx) => `Hanging on: ${ctx.team.name}. ${ord(ctx.rank.current)}.`,
    (ctx) => `Chasing: ${ctx.team.name}. ${plural(ctx.bubble?.gamesBack ?? 1, 'game')} back.`,

    // Numbers-up-front
    (ctx) => `${ord(ctx.rank.current)}: ${ctx.team.name}. Cut line.`,
    (ctx) => `${plural(ctx.bubble?.gamesBack ?? 1, 'game')} back: ${ctx.team.name}.`,

    // Multi-cat
    (ctx) => `${ctx.team.name}: ${plural(ctx.category.topCats.length, 'cat')} owned. Need ${plural(2, 'more')} to stay in.`,
    (ctx) => `${ctx.team.name}: cats are doing the work. The cushion isn't there.`,

    // Closer-style
    (ctx) => `${ctx.team.name}: next week is everything.`,
    (ctx) => `${ctx.team.name}: still has a path. Has to take it.`,
    (ctx) => `${ctx.team.name}: bubble life suits them.`,

    // Magnitude
    (ctx) => ctx.magnitude === 'historic' ? `${ctx.team.name}: tightest bubble race in years.` : null,
    (ctx) => ctx.magnitude === 'huge' ? `${ctx.team.name}: closest to the cut in either direction.` : null,
  ],
}

/* ─────────────────────────────────────────────────────────────────
   KIND: TICKER-TOP-CAT-KING
   Voice: ownership beat. Dominated one cat.
───────────────────────────────────────────────────────────────── */

const TICKER_TOP_CAT_KING: HomeTemplate = {
  kind: 'ticker-top-cat-king',
  eyebrows: [],
  bodies: [],
  headlines: [
    // Core
    (ctx) => ctx.ticker?.cat && ctx.ticker?.catRecord ? `${ctx.team.name}: swept ${ctx.ticker.cat} last week. ${ctx.ticker.catRecord} in ${ctx.ticker.cat}.` : null,
    (ctx) => ctx.ticker?.cat ? `${ctx.team.name}: owns ${ctx.ticker.cat} this season.` : null,
    (ctx) => ctx.ticker?.cat ? `${ctx.team.name}: ${ctx.ticker.cat} king.` : null,
    (ctx) => ctx.category.topCats[0] ? `${ctx.team.name}: ${ctx.category.topCats[0]} is locked.` : null,

    // Record-anchored
    (ctx) => ctx.ticker?.catRecord && ctx.ticker?.cat ? `${ctx.team.name}: ${ctx.ticker.catRecord} in ${ctx.ticker.cat}.` : null,
    (ctx) => ctx.ticker?.catRecord && ctx.ticker?.cat ? `${ctx.ticker.catRecord} in ${ctx.ticker.cat}: ${ctx.team.name}.` : null,
    (ctx) => ctx.ticker?.cat ? `${ctx.team.name}: undefeated in ${ctx.ticker.cat} this month.` : null,

    // Specific cat flavor
    (ctx) => ctx.ticker?.cat === 'HR' ? `${ctx.team.name}: power kings. ${ctx.ticker.catRecord ?? '11-0'} in HR.` : null,
    (ctx) => ctx.ticker?.cat === 'K' ? `${ctx.team.name}: K factory. Nobody catches them in strikeouts.` : null,
    (ctx) => ctx.ticker?.cat === 'SV' ? `${ctx.team.name}: bullpen owns SV.` : null,
    (ctx) => ctx.ticker?.cat === 'SB' ? `${ctx.team.name}: speed and saves. SB is locked.` : null,
    (ctx) => ctx.ticker?.cat === 'AVG' ? `${ctx.team.name}: contact king. AVG is locked.` : null,
    (ctx) => ctx.ticker?.cat === 'ERA' ? `${ctx.team.name}: ERA leader. Pitching staff is the engine.` : null,
    (ctx) => ctx.ticker?.cat === 'WHIP' ? `${ctx.team.name}: nobody touches their WHIP.` : null,
    (ctx) => ctx.ticker?.cat === 'RBI' ? `${ctx.team.name}: lineup eats. RBI king.` : null,

    // Owner-anchored
    (ctx) => `${ctx.team.owner}: drafted the right cat. ${ctx.team.name} owns ${ctx.ticker?.cat ?? ctx.category.topCats[0] ?? 'the column'}.`,
    (ctx) => `${ctx.team.owner}'s ${ctx.team.name}: ${ctx.ticker?.cat ?? 'category'} dominance.`,

    // Two-fragment
    (ctx) => ctx.ticker?.cat ? `${ctx.team.name}: ${ctx.ticker.cat}. Nobody close.` : null,
    (ctx) => `${ctx.team.name}: built around the cat. Built well.`,
    (ctx) => `${ctx.team.name}: one cat. Total ownership.`,

    // Cat-list framing
    (ctx) => ctx.category.topCats.length >= 2 ? `${ctx.team.name}: leads ${catList(ctx.category.topCats)}. Multi-cat king.` : null,

    // Streak-anchored
    (ctx) => ctx.ticker?.cat ? `${ctx.team.name}: ${plural(4, 'week')} sweeping ${ctx.ticker.cat}.` : null,

    // Direct beat
    (ctx) => ctx.ticker?.cat ? `${ctx.team.name}: nobody catches them in ${ctx.ticker.cat}.` : null,
    (ctx) => ctx.ticker?.cat ? `${ctx.team.name}: the ${ctx.ticker.cat} race is over.` : null,
    (ctx) => ctx.ticker?.cat ? `${ctx.team.name}: ${ctx.ticker.cat} is locked through October.` : null,
    (ctx) => `${ctx.team.name}: dominant in their lead cat.`,

    // Verb-led
    (ctx) => ctx.ticker?.cat ? `Owns ${ctx.ticker.cat}: ${ctx.team.name}.` : null,
    (ctx) => ctx.ticker?.cat ? `Locked ${ctx.ticker.cat}: ${ctx.team.name}.` : null,
    (ctx) => ctx.ticker?.cat ? `Sweeping ${ctx.ticker.cat}: ${ctx.team.name}. Multiple weeks running.` : null,

    // Numbers-up-front
    (ctx) => ctx.ticker?.catRecord ? `${ctx.ticker.catRecord}: ${ctx.team.name} in ${ctx.ticker.cat ?? 'category'}.` : null,
    (ctx) => ctx.ticker?.cat ? `One cat. ${ctx.team.name}. ${ctx.ticker.cat}.` : null,

    // Season-stage
    (ctx) => ctx.seasonStage === 'final-stretch' && ctx.ticker?.cat ? `${ctx.team.name}: ${ctx.ticker.cat} is the seeding lock.` : null,
    (ctx) => ctx.seasonStage === 'late' && ctx.ticker?.cat ? `${ctx.team.name}: late-season ${ctx.ticker.cat} dominance.` : null,

    // Closer-style
    (ctx) => ctx.ticker?.cat ? `${ctx.team.name}: ${ctx.ticker.cat}. Avoid that draft target next year.` : null,
    (ctx) => `${ctx.team.name}: built a team around one column. It's working.`,
    (ctx) => `${ctx.team.name}: category-leader of the year.`,
    (ctx) => `${ctx.team.name}: roster shape pays off in the cat.`,

    // Magnitude
    (ctx) => ctx.magnitude === 'historic' && ctx.ticker?.cat ? `${ctx.team.name}: ${ctx.ticker.cat} record might not be broken this season.` : null,
    (ctx) => ctx.magnitude === 'huge' && ctx.ticker?.catRecord ? `${ctx.team.name}: ${ctx.ticker.catRecord} in ${ctx.ticker.cat ?? 'cat'}. Untouchable.` : null,
  ],
}

/* ─────────────────────────────────────────────────────────────────
   KIND: TICKER-BLOWOUT
   Voice: basement beat. Long losing streak / locked-in last place.
───────────────────────────────────────────────────────────────── */

const TICKER_BLOWOUT: HomeTemplate = {
  kind: 'ticker-blowout',
  eyebrows: [],
  bodies: [],
  headlines: [
    // Core
    (ctx) => ctx.ticker?.streakDescription ? `${ctx.team.name}: ${ctx.ticker.streakDescription}.` : null,
    (ctx) => ctx.record.streakDirection === 'L' ? `${ctx.team.name}: ${plural(ctx.record.streakLength, 'game losing streak')}.` : null,
    (ctx) => `${ctx.team.name}: ${pick(SYN.BASEMENT)} is ${pick(SYN.LOCKED)}.`,
    (ctx) => `${ctx.team.name}: last place feels permanent.`,
    (ctx) => `${ctx.team.name}: cellar.`,

    // Stat-led
    (ctx) => ctx.record.streakDirection === 'L' && ctx.record.streakLength >= 5 ? `${ctx.team.name}: five-game losing streak.` : null,
    (ctx) => ctx.record.streakDirection === 'L' && ctx.record.streakLength >= 6 ? `${ctx.team.name}: ${ctx.record.streakLength}-game skid.` : null,
    (ctx) => ctx.record.streakDirection === 'L' && ctx.record.streakLength >= 4 ? `${ctx.team.name}: four-week skid.` : null,
    (ctx) => ctx.rank.current >= 11 ? `${ctx.team.name}: ${ord(ctx.rank.current)} place. Buried.` : null,
    (ctx) => ctx.rank.current === 12 ? `${ctx.team.name}: last.` : null,

    // Cellar framing
    (ctx) => `${ctx.team.name}: ${pick(SYN.BASEMENT)}.`,
    (ctx) => `${ctx.team.name}: ${pick(SYN.BASEMENT)} is calling. ${ctx.team.name} answered.`,
    (ctx) => `${ctx.team.name}: lockstep with the basement.`,
    (ctx) => `${ctx.team.name}: even the bubble teams aren't worried.`,

    // Owner-anchored
    (ctx) => `${ctx.team.owner}'s ${ctx.team.name}: a real bottom-of-the-board season.`,
    (ctx) => `${ctx.team.owner}: hard to find a win lately.`,
    (ctx) => `${ctx.team.owner}: rough year, real one.`,

    // Two-fragment
    (ctx) => `${ctx.team.name}: nothing's working.`,
    (ctx) => `${ctx.team.name}: still ${ord(ctx.rank.current)}. Still falling.`,
    (ctx) => `${ctx.team.name}: lottery position locked.`,

    // Magnitude
    (ctx) => ctx.record.streakLength >= 8 ? `${ctx.team.name}: eight in a row down.` : null,
    (ctx) => ctx.magnitude === 'historic' ? `${ctx.team.name}: longest losing streak of the season.` : null,

    // Category-anchored
    (ctx) => ctx.category.bleedingCats.length >= 3 ? `${ctx.team.name}: ${plural(ctx.category.bleedingCats.length, 'category', 'categories')} bleeding.` : null,
    (ctx) => ctx.category.topCats.length === 0 ? `${ctx.team.name}: doesn't lead a single cat.` : null,
    (ctx) => `${ctx.team.name}: cats keep falling.`,

    // Season-stage
    (ctx) => ctx.seasonStage === 'late' ? `${ctx.team.name}: late-season fade.` : null,
    (ctx) => ctx.seasonStage === 'final-stretch' ? `${ctx.team.name}: playing for next year.` : null,

    // Direct
    (ctx) => `${ctx.team.name}: long way back from here.`,
    (ctx) => `${ctx.team.name}: needs a sweep just to feel competitive.`,
    (ctx) => `${ctx.team.name}: building for next year, honestly.`,
    (ctx) => `${ctx.team.name}: lottery team.`,
    (ctx) => `${ctx.team.name}: rebuild season.`,

    // Verb-led
    (ctx) => `Sinking: ${ctx.team.name}.`,
    (ctx) => `Locked: ${ctx.team.name}. ${pick(SYN.BASEMENT)}.`,
    (ctx) => `Buried: ${ctx.team.name}. ${ord(ctx.rank.current)}.`,
    (ctx) => `Falling: ${ctx.team.name}. ${ctx.record.streak}.`,

    // Numbers-up-front
    (ctx) => `${ctx.record.streak}. ${ctx.team.name}. Still falling.`,
    (ctx) => `${plural(ctx.record.streakLength, 'loss', 'losses')} in a row. ${ctx.team.name}.`,
    (ctx) => `${ord(ctx.rank.current)}: ${ctx.team.name}. Hard to climb out.`,

    // Closer-style
    (ctx) => `${ctx.team.name}: not playing for this season anymore.`,
    (ctx) => `${ctx.team.name}: trade-deadline sellers if there was one.`,
    (ctx) => `${ctx.team.name}: next year is the year.`,
    (ctx) => `${ctx.team.name}: cellar dweller status.`,
    (ctx) => `${ctx.team.name}: gravity has them.`,

    // Wider framing
    (ctx) => `${ctx.team.name}: needs three weeks of work to look competitive.`,
    (ctx) => `${ctx.team.name}: lowest cat total in the league this week.`,

    // Owner-honest
    (ctx) => `${ctx.team.owner} has the patience. ${ctx.team.name} will need it.`,
    (ctx) => `${ctx.team.owner}: bad year. Comes around.`,
  ],
}

/* ─────────────────────────────────────────────────────────────────
   KIND: QUICK-READ (footer pill labels — ultra-compressed)
   Voice: tightest in the file. Pre-formatted label dominates;
   templates add a tiny editorial frame.
───────────────────────────────────────────────────────────────── */

const QUICK_READ: HomeTemplate = {
  kind: 'quick-read',
  eyebrows: [],
  bodies: [],
  headlines: [
    /* ── PILL: top-cat-this-week ── */
    (ctx) => ctx.quickRead?.pill === 'top-cat-this-week' && ctx.quickRead.cat && ctx.quickRead.teamName ? `${ctx.quickRead.cat} · ${ctx.quickRead.teamName} · ${ctx.quickRead.value ?? 'sweep'}.` : null,
    (ctx) => ctx.quickRead?.pill === 'top-cat-this-week' && ctx.quickRead.cat ? `${ctx.quickRead.cat} king: ${ctx.quickRead.teamName ?? ctx.team.name}.` : null,
    (ctx) => ctx.quickRead?.pill === 'top-cat-this-week' ? `Cat of the week: ${ctx.quickRead.cat ?? ctx.category.topCats[0] ?? 'HR'}.` : null,
    (ctx) => ctx.quickRead?.pill === 'top-cat-this-week' && ctx.quickRead.cat ? `${ctx.quickRead.cat}. Swept.` : null,
    (ctx) => ctx.quickRead?.pill === 'top-cat-this-week' && ctx.quickRead.cat && ctx.quickRead.teamName ? `${ctx.quickRead.teamName} swept ${ctx.quickRead.cat}.` : null,
    (ctx) => ctx.quickRead?.pill === 'top-cat-this-week' && ctx.quickRead.cat && ctx.quickRead.value ? `${ctx.quickRead.cat}: ${ctx.quickRead.value}.` : null,
    (ctx) => ctx.quickRead?.pill === 'top-cat-this-week' ? `Top column: ${ctx.quickRead.cat ?? ctx.category.topCats[0] ?? 'K'}.` : null,
    (ctx) => ctx.quickRead?.pill === 'top-cat-this-week' && ctx.quickRead.cat ? `${ctx.quickRead.cat} owned.` : null,
    (ctx) => ctx.quickRead?.pill === 'top-cat-this-week' ? `Lead cat: ${ctx.quickRead.label}.` : null,
    (ctx) => ctx.quickRead?.pill === 'top-cat-this-week' ? `Hot cat: ${ctx.quickRead.label}.` : null,
    (ctx) => ctx.quickRead?.pill === 'top-cat-this-week' ? `Most-swept: ${ctx.quickRead.label}.` : null,
    (ctx) => ctx.quickRead?.pill === 'top-cat-this-week' ? `Week's cat: ${ctx.quickRead.label}.` : null,
    (ctx) => ctx.quickRead?.pill === 'top-cat-this-week' && ctx.quickRead.cat && ctx.quickRead.value ? `${ctx.quickRead.cat} · ${ctx.quickRead.value}.` : null,
    (ctx) => ctx.quickRead?.pill === 'top-cat-this-week' && ctx.quickRead.teamName && ctx.quickRead.cat ? `${ctx.quickRead.teamName}: ${ctx.quickRead.cat} sweep.` : null,
    (ctx) => ctx.quickRead?.pill === 'top-cat-this-week' ? `${ctx.quickRead.label} · this week's lock.` : null,
    (ctx) => ctx.quickRead?.pill === 'top-cat-this-week' && ctx.quickRead.cat ? `${ctx.quickRead.cat} · uncontested.` : null,
    (ctx) => ctx.quickRead?.pill === 'top-cat-this-week' && ctx.quickRead.teamName ? `${ctx.quickRead.teamName}: cat of the week.` : null,
    (ctx) => ctx.quickRead?.pill === 'top-cat-this-week' && ctx.quickRead.cat && ctx.quickRead.value ? `${ctx.quickRead.value} in ${ctx.quickRead.cat}.` : null,

    /* ── PILL: biggest-upset ── */
    (ctx) => ctx.quickRead?.pill === 'biggest-upset' && ctx.opponent ? `Upset: ${ctx.team.name} over ${ctx.opponent.name}.` : null,
    (ctx) => ctx.quickRead?.pill === 'biggest-upset' ? `Upset: ${ctx.team.name}.` : null,
    (ctx) => ctx.quickRead?.pill === 'biggest-upset' && ctx.opponent ? `${ctx.team.name} took down ${ctx.opponent.name}.` : null,
    (ctx) => ctx.quickRead?.pill === 'biggest-upset' && ctx.quickRead.value ? `Upset of the week: ${ctx.quickRead.value}.` : null,
    (ctx) => ctx.quickRead?.pill === 'biggest-upset' ? `${ctx.quickRead.label}.` : null,
    (ctx) => ctx.quickRead?.pill === 'biggest-upset' && ctx.opponent ? `${ctx.team.name}: beat ${ctx.opponent.name}.` : null,
    (ctx) => ctx.quickRead?.pill === 'biggest-upset' ? `Biggest upset.` : null,
    (ctx) => ctx.quickRead?.pill === 'biggest-upset' && ctx.opponent ? `${ord(ctx.opponent.name === ctx.opponent.name ? ctx.rank.previous : 1)} over ${ord(1)}: ${ctx.opponent.name}.` : null,
    (ctx) => ctx.quickRead?.pill === 'biggest-upset' ? `Surprise: ${ctx.team.name}.` : null,
    (ctx) => ctx.quickRead?.pill === 'biggest-upset' && ctx.opponent ? `${ctx.opponent.name} got got. ${ctx.team.name}.` : null,
    (ctx) => ctx.quickRead?.pill === 'biggest-upset' && ctx.opponent ? `${ctx.team.name} stole one. ${ctx.opponent.name}.` : null,
    (ctx) => ctx.quickRead?.pill === 'biggest-upset' ? `Underdog won: ${ctx.team.name}.` : null,
    (ctx) => ctx.quickRead?.pill === 'biggest-upset' && ctx.quickRead.value ? `Upset · ${ctx.quickRead.value}.` : null,
    (ctx) => ctx.quickRead?.pill === 'biggest-upset' ? `Week's surprise.` : null,
    (ctx) => ctx.quickRead?.pill === 'biggest-upset' && ctx.opponent ? `${ctx.team.name} beats ${ctx.opponent.name}. Didn't see it.` : null,
    (ctx) => ctx.quickRead?.pill === 'biggest-upset' && ctx.team ? `${ctx.team.name}: upset special.` : null,
    (ctx) => ctx.quickRead?.pill === 'biggest-upset' ? `${ctx.quickRead.label} · this week.` : null,
    (ctx) => ctx.quickRead?.pill === 'biggest-upset' ? `Upset alert.` : null,

    /* ── PILL: hottest-streak ── */
    (ctx) => ctx.quickRead?.pill === 'hottest-streak' && ctx.quickRead.value ? `Hottest: ${ctx.team.name} · ${ctx.quickRead.value}.` : null,
    (ctx) => ctx.quickRead?.pill === 'hottest-streak' ? `Hottest team: ${ctx.team.name}.` : null,
    (ctx) => ctx.quickRead?.pill === 'hottest-streak' && ctx.quickRead.value ? `${ctx.team.name}: ${ctx.quickRead.value}.` : null,
    (ctx) => ctx.quickRead?.pill === 'hottest-streak' ? `Streak: ${ctx.team.name}.` : null,
    (ctx) => ctx.quickRead?.pill === 'hottest-streak' ? `${ctx.team.name}: ${ctx.record.streak}.` : null,
    (ctx) => ctx.quickRead?.pill === 'hottest-streak' ? `On a heater: ${ctx.team.name}.` : null,
    (ctx) => ctx.quickRead?.pill === 'hottest-streak' ? `Rolling: ${ctx.team.name}.` : null,
    (ctx) => ctx.quickRead?.pill === 'hottest-streak' && ctx.record.streakLength ? `${plural(ctx.record.streakLength, 'in a row')}: ${ctx.team.name}.` : null,
    (ctx) => ctx.quickRead?.pill === 'hottest-streak' ? `${ctx.quickRead.label}.` : null,
    (ctx) => ctx.quickRead?.pill === 'hottest-streak' && ctx.quickRead.value ? `Hot streak · ${ctx.quickRead.value}.` : null,
    (ctx) => ctx.quickRead?.pill === 'hottest-streak' ? `${ctx.team.name}: untouched.` : null,
    (ctx) => ctx.quickRead?.pill === 'hottest-streak' ? `Streak king: ${ctx.team.name}.` : null,
    (ctx) => ctx.quickRead?.pill === 'hottest-streak' ? `${ctx.team.name}: longest active.` : null,
    (ctx) => ctx.quickRead?.pill === 'hottest-streak' && ctx.record.streakLength >= 4 ? `${ctx.team.name}: ${plural(ctx.record.streakLength, 'straight')}.` : null,
    (ctx) => ctx.quickRead?.pill === 'hottest-streak' ? `Riding it: ${ctx.team.name}.` : null,
    (ctx) => ctx.quickRead?.pill === 'hottest-streak' ? `Heater: ${ctx.team.name}.` : null,
    (ctx) => ctx.quickRead?.pill === 'hottest-streak' && ctx.quickRead.value ? `${ctx.team.name}: ${ctx.quickRead.value} streak.` : null,
    (ctx) => ctx.quickRead?.pill === 'hottest-streak' ? `${ctx.team.name} keeps winning.` : null,

    /* ── PILL: on-the-bubble ── */
    (ctx) => ctx.quickRead?.pill === 'on-the-bubble' && ctx.quickRead.value ? `On the bubble: ${ctx.team.name} · ${ctx.quickRead.value}.` : null,
    (ctx) => ctx.quickRead?.pill === 'on-the-bubble' ? `Bubble: ${ctx.team.name}.` : null,
    (ctx) => ctx.quickRead?.pill === 'on-the-bubble' && ctx.bubble ? `${ctx.team.name}: ${plural(ctx.bubble.gamesBack, 'game')} back.` : null,
    (ctx) => ctx.quickRead?.pill === 'on-the-bubble' ? `Cut line: ${ctx.team.name}.` : null,
    (ctx) => ctx.quickRead?.pill === 'on-the-bubble' ? `${ctx.team.name}: bubble.` : null,
    (ctx) => ctx.quickRead?.pill === 'on-the-bubble' ? `${ctx.team.name}: one out from in.` : null,
    (ctx) => ctx.quickRead?.pill === 'on-the-bubble' ? `${ctx.team.name}: ${ord(ctx.rank.current)} place.` : null,
    (ctx) => ctx.quickRead?.pill === 'on-the-bubble' ? `${ctx.quickRead.label}.` : null,
    (ctx) => ctx.quickRead?.pill === 'on-the-bubble' && ctx.quickRead.value ? `Bubble · ${ctx.quickRead.value}.` : null,
    (ctx) => ctx.quickRead?.pill === 'on-the-bubble' ? `Hanging on: ${ctx.team.name}.` : null,
    (ctx) => ctx.quickRead?.pill === 'on-the-bubble' && ctx.bubble && ctx.bubble.gamesBack <= 1 ? `${ctx.team.name}: one game from the cut.` : null,
    (ctx) => ctx.quickRead?.pill === 'on-the-bubble' ? `${ctx.team.name}: bubble watch.` : null,
    (ctx) => ctx.quickRead?.pill === 'on-the-bubble' ? `${ctx.team.name}: still alive.` : null,
    (ctx) => ctx.quickRead?.pill === 'on-the-bubble' ? `Bracket line: ${ctx.team.name}.` : null,
    (ctx) => ctx.quickRead?.pill === 'on-the-bubble' && ctx.bubble ? `${ctx.team.name} · ${plural(ctx.bubble.weeksLeft, 'week')} left.` : null,
    (ctx) => ctx.quickRead?.pill === 'on-the-bubble' ? `${ctx.team.name}: cushion gone.` : null,
    (ctx) => ctx.quickRead?.pill === 'on-the-bubble' ? `Last in: ${ctx.team.name}.` : null,
    (ctx) => ctx.quickRead?.pill === 'on-the-bubble' ? `First out: ${ctx.team.name}.` : null,
  ],
}

/* ─────────────────────────────────────────────────────────────────
   PUBLIC API
───────────────────────────────────────────────────────────────── */

export const homeTemplates: Record<HomeKind, HomeTemplate> = {
  'daily-hero-new-throne': NEW_THRONE,
  'daily-hero-dynasty-falling': DYNASTY_FALLING,
  'daily-hero-hot-climber': HOT_CLIMBER,
  'daily-hero-bubble-surprise': BUBBLE_SURPRISE,
  'daily-hero-identity-shift': IDENTITY_SHIFT,
  'daily-hero-sweep-weekend': SWEEP_WEEKEND,
  'daily-hero-comeback-team': COMEBACK_TEAM,
  'daily-hero-quiet-day': QUIET_DAY,
  'playoff-push-closer': PLAYOFF_PUSH_CLOSER,
  'ticker-hot-streak': TICKER_HOT_STREAK,
  'ticker-rough-patch': TICKER_ROUGH_PATCH,
  'ticker-bubble-watch': TICKER_BUBBLE_WATCH,
  'ticker-top-cat-king': TICKER_TOP_CAT_KING,
  'ticker-blowout': TICKER_BLOWOUT,
  'quick-read': QUICK_READ,
}

/**
 * Render a home editorial moment — returns the eyebrow + headline +
 * body strings for the requested kind.
 *
 * Ticker, playoff-push-closer, and quick-read templates use only the
 * headlines array. For those kinds, eyebrow / body fall back to the
 * empty string. The Vue render layer should branch on `kind` and use
 * only the fields the surface needs.
 *
 * Filters templates by their self-veto (`fn` returns null) before
 * picking a random one from the surviving pool. If nothing survives
 * the filter, returns sensible plain-text fallbacks.
 */
export function renderHome(kind: HomeKind, ctx: HomeContext): {
  eyebrow: string
  headline: string
  body: string
} {
  const template = homeTemplates[kind]
  return {
    eyebrow: renderOne(template.eyebrows, ctx) ?? defaultEyebrow(kind),
    headline: renderOne(template.headlines, ctx) ?? defaultHeadline(kind, ctx),
    body: renderOne(template.bodies, ctx) ?? defaultBody(kind, ctx),
  }
}

function renderOne(variants: HomeVariantFn[], ctx: HomeContext): string | undefined {
  if (variants.length === 0) return undefined
  const rendered = variants
    .map((fn) => fn(ctx))
    .filter((s): s is string => typeof s === 'string' && s.length > 0)
  if (rendered.length === 0) return undefined
  return rendered[Math.floor(Math.random() * rendered.length)]
}

function defaultEyebrow(kind: HomeKind): string {
  switch (kind) {
    case 'daily-hero-new-throne': return 'STORY OF THE WEEK'
    case 'daily-hero-dynasty-falling': return 'STORY OF THE WEEK'
    case 'daily-hero-hot-climber': return 'STORY OF THE WEEK'
    case 'daily-hero-bubble-surprise': return 'STORY OF THE WEEK'
    case 'daily-hero-identity-shift': return 'STORY OF THE WEEK'
    case 'daily-hero-sweep-weekend': return 'STORY OF THE WEEK'
    case 'daily-hero-comeback-team': return 'STORY OF THE WEEK'
    case 'daily-hero-quiet-day': return 'STORY OF THE WEEK'
    default: return ''
  }
}

function defaultHeadline(kind: HomeKind, ctx: HomeContext): string {
  switch (kind) {
    case 'daily-hero-new-throne': return `${ctx.team.name} took #1.`
    case 'daily-hero-dynasty-falling': return `${ctx.team.name} slipped to ${ord(ctx.rank.current)}.`
    case 'daily-hero-hot-climber': return `${ctx.team.name} climbed.`
    case 'daily-hero-bubble-surprise': return `${ctx.team.name} is back on the bubble.`
    case 'daily-hero-identity-shift': return `${ctx.team.name}: different team.`
    case 'daily-hero-sweep-weekend': return `${ctx.team.name} swept the week.`
    case 'daily-hero-comeback-team': return `${ctx.team.name} is back.`
    case 'daily-hero-quiet-day': return `${ctx.team.name} held #${ctx.rank.current}.`
    case 'playoff-push-closer': return `The bubble is the conversation.`
    case 'ticker-hot-streak': return `${ctx.team.name}: ${ctx.record.streak}.`
    case 'ticker-rough-patch': return `${ctx.team.name}: rough week.`
    case 'ticker-bubble-watch': return `${ctx.team.name}: bubble watch.`
    case 'ticker-top-cat-king': return `${ctx.team.name}: cat leader.`
    case 'ticker-blowout': return `${ctx.team.name}: ${pick(['cellar', 'basement', 'last'])}.`
    case 'quick-read': return ctx.quickRead?.label ?? `${ctx.team.name}.`
  }
}

function defaultBody(kind: HomeKind, ctx: HomeContext): string {
  switch (kind) {
    case 'daily-hero-new-throne':
    case 'daily-hero-dynasty-falling':
    case 'daily-hero-hot-climber':
    case 'daily-hero-bubble-surprise':
    case 'daily-hero-identity-shift':
    case 'daily-hero-sweep-weekend':
    case 'daily-hero-comeback-team':
    case 'daily-hero-quiet-day':
      return `${ctx.team.name}. ${ctx.record.wins}-${ctx.record.losses}-${ctx.record.ties}. ${ord(ctx.rank.current)}.`
    default:
      return ''
  }
}

/* ─────────────────────────────────────────────────────────────────
   VARIANT COUNT TABLE  (for editorial review)
   Live counts in this file. Self-veto means runtime pool is usually
   smaller than the raw count.

   Kind                                 Eyebrows  Headlines  Bodies
   ─────────────────────────────────── ────────  ─────────  ──────
   daily-hero-new-throne                  12         47        28
   daily-hero-dynasty-falling             12         42        25
   daily-hero-hot-climber                 12         42        25
   daily-hero-bubble-surprise             11         38        22
   daily-hero-identity-shift              11         36        21
   daily-hero-sweep-weekend               11         39        20
   daily-hero-comeback-team               11         38        21
   daily-hero-quiet-day                   12         49        26
   playoff-push-closer                     0         24         0
   ticker-hot-streak                       0         43         0
   ticker-rough-patch                      0         43         0
   ticker-bubble-watch                     0         44         0
   ticker-top-cat-king                     0         39         0
   ticker-blowout                          0         48         0
   quick-read (4 pills × ~18 ea)           0         72         0
   ─────────────────────────────────── ────────  ─────────  ──────
   Totals                                 92        644       188
                                                              =====
                                                  Grand total: 924
─────────────────────────────────────────────────────────────────── */

/* ─────────────────────────────────────────────────────────────────
   FUTURE WORK
   - Recently-used tracker (matches swings.ts deferred work). Track
     last-rendered template per (kind, team) tuple so the same shape
     does not show two days in a row.
   - Daypart-aware variants (morning vs evening tone shifts).
   - League-type flavoring (baseball-specific cat list above; will
     need football and basketball cat overlays when those leagues
     ship the Home page treatment.)
───────────────────────────────────────────────────────────────── */
