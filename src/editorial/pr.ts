/**
 * Power Rankings — Editorial Variant Library
 *
 * Variant pool that powers the Power Rankings page editorial moments:
 *   - HERO biggest-mover card (eyebrow / headline / body / 3 stat-chip
 *     labels / kicker line)
 *   - Sub-headline (the 3-fragment rhythm under the page title)
 *   - PULSE beats (3 per week: heater / long-fall / steady-hand)
 *   - Category Dynasties beats (3 per page: hitting king / pitching
 *     king / punt kings)
 *   - Footer quick reads (4 pill labels)
 *
 * Templates are functional. Each receives a PRContext and returns a
 * string (or null/undefined for a self-veto). The renderer filters
 * out vetoes and picks at random from the survivors.
 *
 * Voice rules: see EDITORIAL.md at the repo root. Re-read before
 * adding variants. The voice is the whole product.
 *
 * Variant count targets per kind:
 *   eyebrows: 8-10
 *   headlines: 25-35 for HERO; 15-25 for pulse / dynasty / quick-read;
 *              10-15 for sub-headline
 *   bodies: 20-28 for HERO; 15-20 for pulse / dynasty
 *   chips: 5-8 per slot (HERO only)
 */

/* ─────────────────────────────────────────────────────────────────
   TYPES
───────────────────────────────────────────────────────────────── */

export type PRKind =
  | 'hero-new-throne'
  | 'hero-dynasty-rising'
  | 'hero-biggest-climber'
  | 'hero-defending-champ-falling'
  | 'hero-bubble-surprise'
  | 'hero-the-race'
  | 'hero-your-team'
  | 'pulse-heater'
  | 'pulse-long-fall'
  | 'pulse-steady-hand'
  | 'dynasty-hitting-king'
  | 'dynasty-pitching-king'
  | 'dynasty-punt-kings'
  | 'sub-headline'
  | 'quick-read'

export type PRSeasonStage = 'early' | 'mid' | 'late' | 'final-stretch' | 'playoffs'

export type PRQuickReadKind =
  | 'tightest-race'
  | 'biggest-jump'
  | 'longest-fall'
  | 'longest-streak'

export interface PRStreak {
  type: 'W' | 'L'
  length: number
}

export interface PRTeamIdentity {
  name: string         // team name as shown on logo
  owner: string        // manager's last name (or handle)
  mascotColor?: string // hex / token, optional flavor
}

export interface PRContext {
  // Protagonist team identity
  team: PRTeamIdentity

  // Rank context (this team)
  currentRank: number
  previousRank: number | null    // null if this is week 1
  weeksAtTop: number             // 0 if not currently #1
  allTimeBest: number | null     // best rank ever for this team

  // Record (category-league record)
  catWins: number
  catLosses: number
  catTies: number
  winPct: number                 // 0..1

  // Trajectory
  rankDeltaThisWeek: number      // positive = climbed, negative = fell
  rankDeltaSinceWeek1: number    // positive = climbed
  streak?: PRStreak              // current W/L streak

  // Category fingerprint
  topCats: string[]              // categories this team owns (e.g., ['HR','RBI'])
  bleedingCats: string[]         // categories slipping (e.g., ['SV','HLD'])

  // Magnitude of the editorial moment
  magnitude: 'historic' | 'huge' | 'solid' | 'minor'

  // Season-stage info
  currentWeek: number
  totalWeeks: number
  weeksUntilPlayoffs: number     // 0 if playoffs already
  totalCategories: number        // number of scoring categories in the league

  // HERO-only — protagonist + antagonist framing
  hero?: {
    protagonist: PRTeamIdentity  // usually same as ctx.team; mirrored for HERO clarity
    antagonist?: PRTeamIdentity  // the team being displaced / contrasted
    framing?: 'overtake' | 'collapse' | 'extend' | 'jump' | 'surprise'
  }

  // SUB-HEADLINE-only
  subHeadline?: {
    stage: PRSeasonStage
    climberCount?: number        // teams above .500 / on positive trajectory
    bleedingCount?: number       // teams losing 3+ straight
    bubbleCount?: number         // teams within 1 game of the playoff line
  }

  // QUICK-READ-only
  quickRead?: {
    kind: PRQuickReadKind
    teamA?: PRTeamIdentity       // primary team referenced in the pill
    teamB?: PRTeamIdentity       // secondary (e.g., the team being passed)
    statValue?: number           // streak length / spots moved / cat margin
    statLabel?: string           // pre-formatted "+8 spots" / "W4" / "7-2 in cats"
    catId?: string               // category tag (e.g., 'K', 'HR') if relevant
  }

  // Dynasty / category-king context (used by dynasty-* kinds)
  dynasty?: {
    cats: string[]               // categories this team owns this season
    weeksOwning: number          // how long they have held the cat(s)
    seasonsOwning?: number       // multi-season dynasty count
    puntedCat?: string           // for punt-kings: the cat they are punting
    puntedWeeks?: number         // weeks punting this season
    puntedSeasons?: number       // multi-season punt count
  }

  // HERO 'the-race' — the field chasing a locked-in leader. ctx.team is
  // the focal team (the club on the playoff line, or the reader's team
  // when they sit in the contested band).
  race?: {
    leaderName: string           // the entrenched #1 everyone is chasing
    leaderWeeksAtTop: number
    contenderCount: number       // teams still alive for a seat
    seatsOpen: number            // playoff seats below the locked leader
    cutlineName?: string         // team sitting exactly on the playoff line
  }

  // HERO 'your-team' — the reader's own team angle. ctx.team is the
  // reader's team. Copy stays third-person (the yellow row cue carries
  // the "you"); never address the reader as "you" here.
  yourTeam?: {
    angle: 'climb' | 'streak' | 'bubble-in' | 'bubble-out' | 'lurking' | 'steady'
    rivalName?: string           // nearest team in the reader's race
    rivalGap?: number            // cat-win gap to that rival (absolute)
  }
}

/* A single variant function. Returns null/undefined if the variant
   isn't applicable to this context (template's optional self-veto). */
export type VariantFn = (ctx: PRContext) => string | null | undefined

export interface PRTemplate {
  kind: PRKind
  eyebrows: VariantFn[]
  headlines: VariantFn[]
  bodies: VariantFn[]
  // HERO-only: each chip slot is its own pool of label variants.
  // slot 0 = SPOTS-style chip, slot 1 = STREAK-style chip,
  // slot 2 = record-stat chip.
  chips?: [VariantFn[], VariantFn[], VariantFn[]]
  // HERO-only: short closing line under the body.
  kickers?: VariantFn[]
}

/* ─────────────────────────────────────────────────────────────────
   SYNONYM DICTIONARIES (string pools used inside templates)
───────────────────────────────────────────────────────────────── */

const SYN = {
  TOOK_THRONE: ['took the throne', 'grabbed the top spot', 'unseated the leader', 'climbed to #1', 'flipped the ladder', 'owns the top line'],
  DETHRONED: ['dethroned', 'displaced', 'leapfrogged', 'overtook', 'pushed past', 'edged out'],
  CLIMBED: ['climbed', 'jumped', 'leaped', 'vaulted', 'surged', 'shot up'],
  FELL: ['fell', 'slipped', 'dropped', 'tumbled', 'slid', 'leaked'],
  OWNS: ['owns', 'holds', 'controls', 'runs', 'leads the league in', 'has all year in'],
  BLEEDS: ['bleeds', 'is bleeding', 'keeps losing', 'cannot stop hemorrhaging', 'is leaking', 'is hemorrhaging'],
  STREAK_HOT: ['on a heater', 'rolling', 'locked in', 'in a groove', 'humming', 'on a run'],
  QUIET_NICE: ['Quietly', 'Under the radar', 'Without fanfare', 'No fireworks, but', 'Low volume', 'Steady as it gets'],
  CRACKED: ['cracked', 'splintered', 'wobbled', 'shown the door', 'lost the room'],
  HOLDS_LINE: ['holds the line', 'hangs on', 'keeps showing up', 'refuses to fold', 'sits right where they sat'],
  PUNTED: ['punted', 'ignored', 'sat out', 'walked away from', 'stopped chasing'],
}

/* Pick a random variant from a synonym pool. */
function pick<T>(pool: readonly T[]): T {
  return pool[Math.floor(Math.random() * pool.length)]
}

/* Pluralize helpers */
const plural = (n: number, one: string, many: string = one + 's') => `${n} ${n === 1 ? one : many}`

/* Format a category record like "7-2" or "7-2-1" (ties only if > 0). */
function fmtRecord(w: number, l: number, t: number): string {
  return t > 0 ? `${w}-${l}-${t}` : `${w}-${l}`
}

/* Signed-spots formatter: 3 -> "+3", -2 -> "-2". */
function fmtSpots(n: number): string {
  if (n > 0) return `+${n}`
  return `${n}`
}

/* "this week" vs "in two weeks" vs etc — kept simple and grounded. */
function weeksAgo(n: number): string {
  if (n <= 1) return 'this week'
  return `in ${n} weeks`
}

/* ─────────────────────────────────────────────────────────────────
   KIND: hero-new-throne
   Triumphant but not gloating. New #1 just overtook the prior leader.
───────────────────────────────────────────────────────────────── */

const HERO_NEW_THRONE: PRTemplate = {
  kind: 'hero-new-throne',
  eyebrows: [
    () => 'NEW #1',
    () => 'THE THRONE FLIPS',
    () => 'TOP SPOT CHANGES HANDS',
    () => 'A NEW LEADER',
    () => 'CHANGING OF THE GUARD',
    () => 'THE LADDER RESETS',
    () => 'NEW TOP LINE',
    (ctx) => ctx.magnitude === 'historic' ? 'FIRST TIME EVER' : 'NEW #1',
    (ctx) => ctx.previousRank && ctx.previousRank >= 3 ? 'TWO-SPOT JUMP TO THE TOP' : 'NEW #1',
    () => 'COUP AT THE TOP',
  ],
  headlines: [
    // Punchy throne language
    (ctx) => `${ctx.team.name} just ${pick(SYN.TOOK_THRONE)}.`,
    (ctx) => `${ctx.team.name} is the new #1.`,
    (ctx) => `${ctx.team.name}: ${pick(SYN.TOOK_THRONE)}.`,
    (ctx) => `${ctx.team.name} flipped the top.`,
    (ctx) => `${ctx.team.name}. #1.`,

    // Antagonist-aware
    (ctx) => ctx.hero?.antagonist ? `${ctx.team.name} ${pick(SYN.DETHRONED)} ${ctx.hero.antagonist.name}.` : null,
    (ctx) => ctx.hero?.antagonist ? `${ctx.team.name} took it from ${ctx.hero.antagonist.name}.` : null,
    (ctx) => ctx.hero?.antagonist ? `${ctx.hero.antagonist.name} lost the top. ${ctx.team.name} took it.` : null,
    (ctx) => ctx.hero?.antagonist ? `Goodbye ${ctx.hero.antagonist.name}. Hello ${ctx.team.name}.` : null,

    // Jump-size conditionals
    (ctx) => ctx.previousRank && ctx.previousRank >= 3 ? `${ctx.team.name} ${pick(SYN.CLIMBED)} from #${ctx.previousRank} to #1.` : null,
    (ctx) => ctx.previousRank === 2 ? `One spot. ${ctx.team.name} owns it.` : null,
    (ctx) => ctx.previousRank && ctx.previousRank >= 4 ? `${ctx.previousRank}-spot jump. New leader.` : null,

    // Historic / first-time framing
    (ctx) => ctx.allTimeBest === 1 && ctx.magnitude === 'historic' ? `${ctx.team.name} is #1 for the first time ever.` : null,
    (ctx) => ctx.allTimeBest === 1 ? `${ctx.team.name}: first time at the top.` : null,
    (ctx) => ctx.magnitude === 'historic' ? `${ctx.team.name} hit #1 for the first time in two seasons.` : null,

    // Record-anchored
    (ctx) => `${ctx.team.name}: ${fmtRecord(ctx.catWins, ctx.catLosses, ctx.catTies)} and the top seed.`,
    (ctx) => `${ctx.team.name}. ${fmtRecord(ctx.catWins, ctx.catLosses, ctx.catTies)}. #1.`,

    // Three-fragment rhythm
    (ctx) => ctx.hero?.antagonist ? `${ctx.team.name} climbed. ${ctx.hero.antagonist.name} blinked. The ladder reshuffled.` : null,
    (ctx) => `New week. New leader. ${ctx.team.name}.`,
    (ctx) => `${ctx.team.name}. ${pick(SYN.TOOK_THRONE)}. About time.`,

    // Streak-aware
    (ctx) => ctx.streak?.type === 'W' && ctx.streak.length >= 3 ? `${ctx.team.name} won ${ctx.streak.length} straight and the top line.` : null,
    (ctx) => ctx.streak?.type === 'W' && ctx.streak.length >= 4 ? `Four wins, four cats apiece. ${ctx.team.name} is #1.` : null,

    // Cat-fingerprint conditionals
    (ctx) => ctx.topCats.length >= 2 ? `${ctx.team.name} ${pick(SYN.OWNS)} ${ctx.topCats[0]} and ${ctx.topCats[1]}. Top of the ladder.` : null,
    (ctx) => ctx.topCats.length >= 1 ? `${ctx.team.name} ${pick(SYN.OWNS)} ${ctx.topCats[0]}. They own the top.` : null,

    // Magnitude-conditional
    (ctx) => ctx.magnitude === 'huge' ? `${ctx.team.name} took the throne on a four-cat week.` : null,
    (ctx) => ctx.magnitude === 'solid' ? `${ctx.team.name} edged in front. Tight one.` : null,

    // Two-sentence punch
    (ctx) => ctx.hero?.antagonist ? `${ctx.team.name} ${pick(SYN.TOOK_THRONE)}. ${ctx.hero.antagonist.name} watches from #2.` : null,
    (ctx) => `The ladder flipped. ${ctx.team.name} is at the top.`,
    (ctx) => `${ctx.team.name} did the work. The seeding now reflects it.`,

    // Quietly-confident close
    (ctx) => `${ctx.team.name}: ${pick(SYN.TOOK_THRONE)}. Earned.`,
    (ctx) => `${ctx.team.name} climbed. Nobody is arguing.`,
    (ctx) => `${ctx.team.name}. The new top seed. The schedule will tell us if it sticks.`,
  ],
  bodies: [
    // Anchored on the antagonist
    (ctx) => ctx.hero?.antagonist ? `${ctx.team.name} ${pick(SYN.DETHRONED)} ${ctx.hero.antagonist.name} after ${plural(ctx.weeksAtTop || 1, 'week')} of buildup. The win-loss column finally caught the eye test.` : null,
    (ctx) => ctx.hero?.antagonist ? `${ctx.hero.antagonist.name} held the top through ${weeksAgo(ctx.currentWeek - 1)}. ${ctx.team.name} pushed through.` : null,
    (ctx) => ctx.hero?.antagonist ? `${ctx.hero.antagonist.name} loses the top line for the first time this year. ${ctx.team.name} takes it.` : null,

    // Record-led
    (ctx) => `${fmtRecord(ctx.catWins, ctx.catLosses, ctx.catTies)} on the year. ${ctx.team.name} now owns the top seed.`,
    (ctx) => `${ctx.team.name} is ${fmtRecord(ctx.catWins, ctx.catLosses, ctx.catTies)} and climbing. The schedule lines up.`,
    (ctx) => `${ctx.team.name}: ${ctx.catWins} category wins, ${ctx.catLosses} losses. New #1.`,

    // Cat-fingerprint led
    (ctx) => ctx.topCats.length >= 2 ? `${ctx.team.name} ${pick(SYN.OWNS)} ${ctx.topCats[0]} and ${ctx.topCats[1]}. That is the floor. The ceiling is the top seed.` : null,
    (ctx) => ctx.topCats.length >= 3 ? `${ctx.team.name} leads in ${ctx.topCats[0]}, ${ctx.topCats[1]}, and ${ctx.topCats[2]}. The math agrees with the ladder.` : null,

    // Jump-anchored
    (ctx) => ctx.previousRank && ctx.previousRank >= 3 ? `${ctx.previousRank}-spot climb in a single week. ${ctx.team.name} took advantage of the slate.` : null,
    (ctx) => ctx.rankDeltaThisWeek >= 2 ? `${ctx.team.name} ${pick(SYN.CLIMBED)} ${ctx.rankDeltaThisWeek} spots. The top spot was waiting.` : null,

    // Streak-anchored
    (ctx) => ctx.streak?.type === 'W' && ctx.streak.length >= 3 ? `${ctx.streak.length} straight matchup wins. The seeding caught up.` : null,
    (ctx) => ctx.streak?.type === 'W' && ctx.streak.length >= 4 ? `Four-week run. The top seed was inevitable.` : null,

    // Magnitude conditionals
    (ctx) => ctx.magnitude === 'historic' ? `First time at #1 in two years. The dynasty rebuild has a name.` : null,
    (ctx) => ctx.magnitude === 'huge' ? `The biggest single-week move into the top spot all season.` : null,
    (ctx) => ctx.magnitude === 'solid' ? `Tight at the top. ${ctx.team.name} gets the nod by a tiebreaker.` : null,

    // Season-stage conditionals
    (ctx) => ctx.currentWeek <= 5 ? `Five weeks in and the top has already changed hands. Early, but real.` : null,
    (ctx) => ctx.currentWeek >= 10 ? `Week ${ctx.currentWeek}. The top seed flips with playoff math on the table.` : null,
    (ctx) => ctx.weeksUntilPlayoffs <= 3 ? `${plural(ctx.weeksUntilPlayoffs, 'week')} until playoffs. ${ctx.team.name} just grabbed the one-seed in time.` : null,

    // Two-fragment closers
    (ctx) => ctx.hero?.antagonist ? `${ctx.team.name} owns the conversation. ${ctx.hero.antagonist.name} owns the wallpaper.` : null,
    (ctx) => `${ctx.team.name} stops asking. The trophy case starts answering.`,
    (ctx) => `${ctx.team.name} wears the crown. Sit with it.`,

    // Pure stat-led
    (ctx) => `${ctx.catWins} cat wins. ${ctx.catLosses} losses. ${ctx.team.name} sits alone at the top.`,
    (ctx) => `${ctx.team.name} is ${(ctx.winPct * 100).toFixed(0)}% across categories. Nobody else is close.`,

    // Quietly-confident
    (ctx) => `${ctx.team.name} put the week together. The ladder caught up.`,
    (ctx) => `${ctx.team.name} climbed without a hot start. The middle of the season belonged to them.`,

    // Cat + record fusion
    (ctx) => ctx.topCats.length >= 1 ? `${ctx.team.name}: ${fmtRecord(ctx.catWins, ctx.catLosses, ctx.catTies)}, ${ctx.topCats[0]} locked, new #1.` : null,

    // Owner-anchored (when owner string is set)
    (ctx) => ctx.team.owner ? `${ctx.team.owner}'s squad climbs to the top line. The owners group chat is loud.` : null,
  ],
  chips: [
    [
      // Slot 0: SPOTS chip — change in rank
      (ctx) => ctx.previousRank ? `${fmtSpots(ctx.previousRank - ctx.currentRank)} SPOTS` : '+1 SPOTS',
      (ctx) => `FROM #${ctx.previousRank ?? '?'}`,
      () => 'TOP SEED',
      (ctx) => `#${ctx.currentRank} OVERALL`,
      () => 'NEW #1',
      (ctx) => ctx.previousRank && ctx.previousRank >= 3 ? `${ctx.previousRank - ctx.currentRank}-SPOT JUMP` : 'JUMPED TO #1',
    ],
    [
      // Slot 1: STREAK chip
      (ctx) => ctx.streak?.type === 'W' ? `W${ctx.streak.length}` : 'HOT',
      (ctx) => ctx.streak?.type === 'W' && ctx.streak.length >= 3 ? `${ctx.streak.length} STRAIGHT` : 'ON A RUN',
      () => 'RIDING IT',
      (ctx) => `${ctx.weeksAtTop || 1}W AT #1`,
      (ctx) => ctx.streak ? `STREAK: ${ctx.streak.length}` : 'HEATING UP',
    ],
    [
      // Slot 2: record chip
      (ctx) => `${fmtRecord(ctx.catWins, ctx.catLosses, ctx.catTies)} IN CATS`,
      (ctx) => `${(ctx.winPct * 100).toFixed(0)}% WIN RATE`,
      (ctx) => `${ctx.catWins} CAT WINS`,
      (ctx) => ctx.topCats.length >= 1 ? `${ctx.topCats[0]} LEADER` : `${ctx.catWins}-${ctx.catLosses}`,
      (ctx) => `RECORD: ${fmtRecord(ctx.catWins, ctx.catLosses, ctx.catTies)}`,
    ],
  ],
  kickers: [
    (ctx) => `The ladder runs through ${ctx.team.name} now.`,
    (ctx) => ctx.hero?.antagonist ? `${ctx.hero.antagonist.name} has the room to respond.` : null,
    (ctx) => `Next week tells us if it sticks.`,
    (ctx) => `${ctx.weeksUntilPlayoffs > 0 ? `${plural(ctx.weeksUntilPlayoffs, 'week')} to seeding.` : 'Playoffs are next.'}`,
    () => 'The conversation just changed.',
    (ctx) => `${ctx.team.name} sets the pace.`,
  ],
}

/* ─────────────────────────────────────────────────────────────────
   KIND: hero-dynasty-rising
   Assertive, slightly inevitable. Current #1 extending streak at top.
───────────────────────────────────────────────────────────────── */

const HERO_DYNASTY_RISING: PRTemplate = {
  kind: 'hero-dynasty-rising',
  eyebrows: [
    () => 'STILL #1',
    () => 'THE STREAK CONTINUES',
    () => 'NOBODY CLOSE',
    () => 'TOP LINE LOCKED',
    () => 'EXTENDING THE RUN',
    () => 'WEEK AFTER WEEK',
    () => 'INEVITABLE',
    () => 'OWNS THE TOP',
    (ctx) => ctx.weeksAtTop >= 4 ? 'FIVE WEEKS AND COUNTING' : 'STILL #1',
    (ctx) => ctx.magnitude === 'historic' ? 'SEASON-LONG REIGN' : 'STILL #1',
  ],
  headlines: [
    // Streak-anchored leads
    (ctx) => `${ctx.team.name}. ${plural(ctx.weeksAtTop, 'week')} at #1.`,
    (ctx) => `${ctx.weeksAtTop} weeks at the top. ${ctx.team.name} is not leaving.`,
    (ctx) => `${ctx.team.name} extends the streak.`,
    (ctx) => `${ctx.team.name} stays at #1.`,
    (ctx) => `Still ${ctx.team.name}.`,

    // Inevitability framing
    (ctx) => `${ctx.team.name} is not giving the top spot back.`,
    (ctx) => `${ctx.team.name} keeps showing up. Nobody catches them.`,
    (ctx) => `Nobody is taking it from ${ctx.team.name}.`,
    (ctx) => `${ctx.team.name}: built for this.`,

    // Cat-fingerprint owned
    (ctx) => ctx.topCats.length >= 2 ? `${ctx.team.name} still ${pick(SYN.OWNS)} ${ctx.topCats[0]} and ${ctx.topCats[1]}.` : null,
    (ctx) => ctx.topCats.length >= 1 ? `${ctx.team.name} ${pick(SYN.OWNS)} ${ctx.topCats[0]}. They own #1.` : null,

    // Record-led
    (ctx) => `${ctx.team.name}: ${fmtRecord(ctx.catWins, ctx.catLosses, ctx.catTies)} and still #1.`,
    (ctx) => `${ctx.team.name} is ${(ctx.winPct * 100).toFixed(0)}% across cats. ${ctx.weeksAtTop} weeks at the top.`,

    // Magnitude conditionals
    (ctx) => ctx.weeksAtTop >= 5 ? `${ctx.weeksAtTop} straight weeks at #1. ${ctx.team.name} has the ladder by the throat.` : null,
    (ctx) => ctx.weeksAtTop >= 7 ? `Seven weeks and counting. ${ctx.team.name} is the season.` : null,
    (ctx) => ctx.weeksAtTop >= 3 && ctx.weeksAtTop < 5 ? `Three weeks running. ${ctx.team.name} owns the top.` : null,

    // Streak-aware
    (ctx) => ctx.streak?.type === 'W' && ctx.streak.length >= 4 ? `${ctx.streak.length} straight matchups. ${ctx.team.name} keeps cashing.` : null,
    (ctx) => ctx.streak?.type === 'W' && ctx.streak.length >= 3 ? `${ctx.team.name} on a ${ctx.streak.length}-game heater. The ladder reflects it.` : null,

    // Antagonist context (#2 chasing)
    (ctx) => ctx.hero?.antagonist ? `${ctx.hero.antagonist.name} chases. ${ctx.team.name} extends.` : null,
    (ctx) => ctx.hero?.antagonist ? `${ctx.hero.antagonist.name} is the only team in the same conversation. They are still chasing.` : null,
    (ctx) => ctx.hero?.antagonist ? `${ctx.team.name} over ${ctx.hero.antagonist.name}. Again.` : null,

    // Two-fragment punch
    (ctx) => `${ctx.team.name}. ${plural(ctx.weeksAtTop, 'week')} at #1 and counting.`,
    (ctx) => `${ctx.team.name} owns the ladder. The rest is jockeying for #2.`,
    (ctx) => `${ctx.team.name} stays. Everyone else moves.`,

    // Season-stage
    (ctx) => ctx.weeksUntilPlayoffs <= 3 ? `Three weeks to playoffs. ${ctx.team.name} is the one-seed.` : null,
    (ctx) => ctx.currentWeek >= 10 ? `Week ${ctx.currentWeek}. ${ctx.team.name} has not budged from #1.` : null,

    // Quiet confidence
    (ctx) => `${ctx.team.name}. Boring. Dominant. Both.`,
    (ctx) => `${ctx.team.name}: no drama at the top.`,
  ],
  bodies: [
    // Streak-led
    (ctx) => `${plural(ctx.weeksAtTop, 'week')} at #1. ${ctx.team.name} is not slowing down.`,
    (ctx) => `${ctx.team.name} extends the run to ${plural(ctx.weeksAtTop, 'week')}. The chasers are running out of weeks.`,

    // Record + cat fusion
    (ctx) => ctx.topCats.length >= 2 ? `${ctx.team.name} ${pick(SYN.OWNS)} ${ctx.topCats[0]} and ${ctx.topCats[1]}. ${fmtRecord(ctx.catWins, ctx.catLosses, ctx.catTies)} on the year.` : null,
    (ctx) => `${ctx.team.name}: ${ctx.catWins} cat wins, ${ctx.catLosses} losses, top seed unchanged.`,

    // Antagonist gap
    (ctx) => ctx.hero?.antagonist ? `${ctx.hero.antagonist.name} sits at #2. The gap is not closing.` : null,
    (ctx) => ctx.hero?.antagonist ? `${ctx.team.name} beats ${ctx.hero.antagonist.name} on every tiebreaker. The top line is locked.` : null,

    // Streak-anchored
    (ctx) => ctx.streak?.type === 'W' && ctx.streak.length >= 4 ? `${ctx.streak.length}-week matchup win streak. The top seed reflects the work.` : null,
    (ctx) => ctx.streak?.type === 'W' && ctx.streak.length >= 3 ? `${ctx.streak.length} straight matchup wins. ${ctx.team.name} keeps grinding.` : null,

    // Magnitude
    (ctx) => ctx.weeksAtTop >= 6 ? `Six-plus weeks at the top. ${ctx.team.name} is rewriting the season-long board.` : null,
    (ctx) => ctx.weeksAtTop >= 4 ? `${ctx.team.name} has held #1 for ${plural(ctx.weeksAtTop, 'week')}. The math agrees.` : null,

    // Season-stage
    (ctx) => ctx.currentWeek <= 6 ? `Six weeks in and ${ctx.team.name} has owned the top line every Monday.` : null,
    (ctx) => ctx.weeksUntilPlayoffs <= 3 ? `${plural(ctx.weeksUntilPlayoffs, 'week')} to playoffs. The one-seed is ${ctx.team.name}'s to keep.` : null,
    (ctx) => ctx.weeksUntilPlayoffs <= 1 ? `Final week before playoffs. ${ctx.team.name} clinches the one-seed.` : null,

    // Cat-fingerprint dominance
    (ctx) => ctx.topCats.length >= 3 ? `${ctx.team.name} leads the league in ${ctx.topCats[0]}, ${ctx.topCats[1]}, and ${ctx.topCats[2]}. Three categories, one team.` : null,
    (ctx) => ctx.topCats.length >= 1 && ctx.bleedingCats.length === 0 ? `${ctx.team.name} ${pick(SYN.OWNS)} ${ctx.topCats[0]} and bleeds nothing. That is the formula.` : null,

    // Quiet-confidence
    (ctx) => `${ctx.team.name} does not need a hot week. They need every week.`,
    (ctx) => `${ctx.team.name}: methodical. Five categories. Every Monday.`,

    // Pure stat
    (ctx) => `${ctx.team.name}: ${(ctx.winPct * 100).toFixed(0)}% across categories. Top seed by ${plural(2, 'game')}.`,
    (ctx) => `${ctx.catWins} cat wins. ${ctx.weeksAtTop} weeks. One conclusion.`,

    // Two-fragment closers
    (ctx) => `${ctx.team.name} owns the ladder. The rest is bookkeeping.`,
    (ctx) => `${ctx.team.name} keeps the top seed. Same story, new week.`,
    (ctx) => `${ctx.team.name} is the ceiling. Everyone else is shopping for #2.`,
  ],
  chips: [
    [
      (ctx) => `${plural(ctx.weeksAtTop, 'WK')} AT #1`,
      () => 'STILL #1',
      (ctx) => `#${ctx.currentRank}`,
      () => 'TOP SEED',
      (ctx) => ctx.weeksAtTop >= 5 ? `${ctx.weeksAtTop} STRAIGHT` : 'TOP LINE',
      () => 'LOCKED',
    ],
    [
      (ctx) => ctx.streak?.type === 'W' ? `W${ctx.streak.length}` : 'HOT',
      (ctx) => `${plural(ctx.weeksAtTop, 'WK')} RUN`,
      () => 'EXTENDING',
      (ctx) => ctx.streak ? `${ctx.streak.length} STRAIGHT` : 'RIDING IT',
      () => 'NO LOSSES',
    ],
    [
      (ctx) => `${fmtRecord(ctx.catWins, ctx.catLosses, ctx.catTies)} IN CATS`,
      (ctx) => `${(ctx.winPct * 100).toFixed(0)}% WIN RATE`,
      (ctx) => ctx.topCats.length >= 1 ? `${ctx.topCats[0]} OWNED` : `${ctx.catWins} CAT WINS`,
      (ctx) => `${ctx.catWins}W ${ctx.catLosses}L`,
      () => 'DOMINANT',
    ],
  ],
  kickers: [
    (ctx) => `Catching ${ctx.team.name} is the league's project.`,
    (ctx) => ctx.weeksUntilPlayoffs > 0 ? `${plural(ctx.weeksUntilPlayoffs, 'week')} to find an answer.` : 'Playoffs prove it or break it.',
    () => 'Same story, new Monday.',
    (ctx) => `${ctx.team.name} sets the pace.`,
    () => 'The chase continues.',
  ],
}

/* ─────────────────────────────────────────────────────────────────
   KIND: hero-biggest-climber
   Ascendant excitement. Team that gained the most spots this week.
───────────────────────────────────────────────────────────────── */

const HERO_BIGGEST_CLIMBER: PRTemplate = {
  kind: 'hero-biggest-climber',
  eyebrows: [
    () => 'BIGGEST CLIMBER',
    () => 'WEEK\'S BIGGEST JUMP',
    () => 'UP THE LADDER',
    () => 'GAINING GROUND',
    () => 'ON THE MOVE',
    () => 'CHARGING UP',
    () => 'THE WEEK\'S RISER',
    () => 'JUMP OF THE WEEK',
    (ctx) => ctx.rankDeltaSinceWeek1 >= 6 ? 'SEASON\'S BIGGEST CLIMB' : 'BIGGEST CLIMBER',
    (ctx) => ctx.magnitude === 'historic' ? 'HISTORIC RISE' : 'BIG MOVER',
  ],
  headlines: [
    // Punchy jump leads
    (ctx) => `${ctx.team.name}: ${fmtSpots(ctx.rankDeltaThisWeek)} this week.`,
    (ctx) => `${ctx.team.name} ${pick(SYN.CLIMBED)} ${ctx.rankDeltaThisWeek} spots.`,
    (ctx) => `${ctx.team.name}. ${fmtSpots(ctx.rankDeltaThisWeek)}.`,
    (ctx) => `${ctx.team.name} doubled down: ${fmtSpots(ctx.rankDeltaSinceWeek1)} since week 1.`,
    (ctx) => `${ctx.team.name} is moving up.`,

    // Season-long climb framing
    (ctx) => ctx.rankDeltaSinceWeek1 >= 5 ? `${ctx.rankDeltaSinceWeek1} spots since week 1. ${ctx.team.name} is the climber of the year.` : null,
    (ctx) => ctx.rankDeltaSinceWeek1 >= 6 ? `${ctx.team.name}: ${fmtSpots(ctx.rankDeltaSinceWeek1)} since opening Monday.` : null,
    (ctx) => ctx.rankDeltaSinceWeek1 >= 4 ? `${ctx.team.name} ${pick(SYN.CLIMBED)} ${ctx.rankDeltaSinceWeek1} spots in ${ctx.currentWeek} weeks.` : null,

    // Single-week jump framing
    (ctx) => ctx.rankDeltaThisWeek >= 3 ? `${ctx.team.name} jumped ${ctx.rankDeltaThisWeek} spots in seven days.` : null,
    (ctx) => ctx.rankDeltaThisWeek >= 4 ? `${ctx.team.name}: ${ctx.rankDeltaThisWeek}-spot week.` : null,
    (ctx) => ctx.rankDeltaThisWeek >= 2 ? `${ctx.team.name} ${pick(SYN.CLIMBED)} into the top half.` : null,

    // Rank-aware destinations
    (ctx) => ctx.currentRank <= 4 && ctx.previousRank && ctx.previousRank > 4 ? `${ctx.team.name} is in the top four for the first time this year.` : null,
    (ctx) => ctx.currentRank <= 6 && ctx.previousRank && ctx.previousRank > 6 ? `${ctx.team.name} climbed into the top six. The bubble feels different from here.` : null,
    (ctx) => ctx.currentRank <= 3 ? `${ctx.team.name} is suddenly a top-three team.` : null,

    // Streak-aware
    (ctx) => ctx.streak?.type === 'W' && ctx.streak.length >= 3 ? `${ctx.team.name}: ${ctx.streak.length} straight matchup wins. The ladder caught up.` : null,
    (ctx) => ctx.streak?.type === 'W' && ctx.streak.length >= 4 ? `Four wins, four climbs. ${ctx.team.name}.` : null,

    // Cat-fingerprint led
    (ctx) => ctx.topCats.length >= 2 ? `${ctx.team.name} found ${ctx.topCats[0]} and ${ctx.topCats[1]}. Now they are climbing.` : null,
    (ctx) => ctx.topCats.length >= 1 ? `${ctx.team.name} locked in on ${ctx.topCats[0]}. Spots followed.` : null,

    // Record-anchored
    (ctx) => `${ctx.team.name}: ${fmtRecord(ctx.catWins, ctx.catLosses, ctx.catTies)} and rising.`,
    (ctx) => `${ctx.team.name} flipped the record. ${fmtSpots(ctx.rankDeltaThisWeek)} on the ladder.`,

    // Two-fragment punch
    (ctx) => `${ctx.team.name}. From #${ctx.previousRank ?? '?'} to #${ctx.currentRank}.`,
    (ctx) => `${ctx.team.name} found a gear. Up ${ctx.rankDeltaThisWeek}.`,
    (ctx) => `${ctx.team.name}: the week is theirs.`,

    // Season-stage flavor
    (ctx) => ctx.weeksUntilPlayoffs <= 3 ? `${ctx.team.name} climbs ${ctx.rankDeltaThisWeek} with the playoffs in sight.` : null,
    (ctx) => ctx.currentWeek <= 5 ? `Five weeks in. ${ctx.team.name} is already ${fmtSpots(ctx.rankDeltaSinceWeek1)}.` : null,

    // Bubble-surprise crossover
    (ctx) => ctx.previousRank && ctx.previousRank >= 8 && ctx.currentRank <= 6 ? `${ctx.team.name} climbed out of the basement. New playoff math.` : null,

    // Quiet confidence
    (ctx) => `${ctx.team.name} took the gear up. The ladder responded.`,
    (ctx) => `${ctx.team.name} is climbing. The schedule says they keep climbing.`,
  ],
  bodies: [
    // Stat-led
    (ctx) => `${ctx.team.name} ${pick(SYN.CLIMBED)} ${ctx.rankDeltaThisWeek} spots this week. ${fmtSpots(ctx.rankDeltaSinceWeek1)} since opening Monday.`,
    (ctx) => `${ctx.team.name}: ${fmtSpots(ctx.rankDeltaSinceWeek1)} over ${ctx.currentWeek} weeks. The slowest climber loses the race.`,
    (ctx) => `From #${ctx.previousRank ?? '?'} to #${ctx.currentRank}. ${ctx.team.name} took the ${plural(ctx.rankDeltaThisWeek, 'spot')} in one slate.`,

    // Cat-fingerprint led
    (ctx) => ctx.topCats.length >= 2 ? `${ctx.team.name} locked ${ctx.topCats[0]} and ${ctx.topCats[1]}. The trajectory matches the categories.` : null,
    (ctx) => ctx.topCats.length >= 1 ? `${ctx.team.name} now ${pick(SYN.OWNS)} ${ctx.topCats[0]}. The board moved.` : null,

    // Streak-anchored
    (ctx) => ctx.streak?.type === 'W' && ctx.streak.length >= 3 ? `${ctx.streak.length} straight matchup wins. The seed is catching up to the schedule.` : null,
    (ctx) => ctx.streak?.type === 'W' && ctx.streak.length >= 4 ? `Four-week run. ${ctx.team.name} is the hottest team in the league.` : null,

    // Record-anchored
    (ctx) => `${ctx.team.name}: ${fmtRecord(ctx.catWins, ctx.catLosses, ctx.catTies)}. Half the season ago, none of this looked possible.`,
    (ctx) => `${ctx.catWins} cat wins. ${ctx.team.name} ${pick(SYN.CLIMBED)} every other week.`,

    // Rank-destination flavor
    (ctx) => ctx.currentRank <= 4 ? `Top four. ${ctx.team.name} owns a playoff bye if the season ended Monday.` : null,
    (ctx) => ctx.currentRank <= 6 ? `Top six. The bubble has new neighbors.` : null,
    (ctx) => ctx.currentRank <= 3 ? `Top three. The conversation includes ${ctx.team.name} now.` : null,

    // Magnitude
    (ctx) => ctx.magnitude === 'historic' ? `The biggest in-season climb the league has seen since the 2024 rebuild run.` : null,
    (ctx) => ctx.magnitude === 'huge' ? `The single biggest jump on the board. ${ctx.team.name} earned the chip.` : null,
    (ctx) => ctx.magnitude === 'solid' ? `Two spots up. Not a headline anywhere else. A headline here.` : null,

    // Season-stage
    (ctx) => ctx.weeksUntilPlayoffs <= 3 ? `${plural(ctx.weeksUntilPlayoffs, 'week')} to playoffs. ${ctx.team.name} climbed into a seed.` : null,
    (ctx) => ctx.currentWeek >= 10 ? `Week ${ctx.currentWeek}. The biggest mover this late is the most dangerous.` : null,
    (ctx) => ctx.currentWeek <= 5 ? `Five-week sample. ${ctx.team.name} is already ${fmtSpots(ctx.rankDeltaSinceWeek1)}.` : null,

    // Bleeding-cat recovery (climber that fixed a hole)
    (ctx) => ctx.bleedingCats.length === 0 && ctx.topCats.length >= 1 ? `${ctx.team.name} stopped bleeding. ${ctx.topCats[0]} flipped. The board flipped.` : null,

    // Quiet flavor
    (ctx) => `${ctx.team.name} did the work. The ladder caught up.`,
    (ctx) => `${ctx.team.name}: nothing flashy. Just every week, a little higher.`,

    // Two-fragment closer
    (ctx) => `${ctx.team.name} is climbing. The schedule says it continues.`,
    (ctx) => `${ctx.team.name}: ${fmtSpots(ctx.rankDeltaThisWeek)} on the week, ${fmtSpots(ctx.rankDeltaSinceWeek1)} on the year. Same direction.`,
  ],
  chips: [
    [
      (ctx) => `${fmtSpots(ctx.rankDeltaThisWeek)} SPOTS`,
      (ctx) => `FROM #${ctx.previousRank ?? '?'} TO #${ctx.currentRank}`,
      (ctx) => `${fmtSpots(ctx.rankDeltaSinceWeek1)} SINCE WK 1`,
      (ctx) => `+${ctx.rankDeltaThisWeek} THIS WEEK`,
      (ctx) => `JUMPED ${ctx.rankDeltaThisWeek}`,
      (ctx) => `#${ctx.currentRank} OVERALL`,
    ],
    [
      (ctx) => ctx.streak?.type === 'W' ? `W${ctx.streak.length}` : 'CLIMBING',
      (ctx) => ctx.streak?.type === 'W' && ctx.streak.length >= 3 ? `${ctx.streak.length} STRAIGHT` : 'ON A RUN',
      () => 'RISING',
      (ctx) => `${ctx.currentWeek}-WK CLIMB`,
      () => 'HOT',
    ],
    [
      (ctx) => `${fmtRecord(ctx.catWins, ctx.catLosses, ctx.catTies)} IN CATS`,
      (ctx) => `${(ctx.winPct * 100).toFixed(0)}% WIN RATE`,
      (ctx) => `${ctx.catWins} CAT WINS`,
      (ctx) => ctx.topCats.length >= 1 ? `${ctx.topCats[0]} LEADER` : `${ctx.catWins}-${ctx.catLosses}`,
      () => 'TRENDING UP',
    ],
  ],
  kickers: [
    (ctx) => `${ctx.team.name} keeps the gear up.`,
    () => 'The schedule rewards momentum.',
    (ctx) => ctx.weeksUntilPlayoffs > 0 ? `${plural(ctx.weeksUntilPlayoffs, 'week')} to lock a seed.` : 'Playoffs are next.',
    (ctx) => `Next week tells us if ${ctx.team.name} keeps climbing.`,
    () => 'The board says yes.',
  ],
}

/* ─────────────────────────────────────────────────────────────────
   KIND: hero-defending-champ-falling
   Dramatic, sometimes mournful. Last year's champ slipping.
───────────────────────────────────────────────────────────────── */

const HERO_DEFENDING_CHAMP_FALLING: PRTemplate = {
  kind: 'hero-defending-champ-falling',
  eyebrows: [
    () => 'THE DYNASTY CRACKS',
    () => 'CHAMP IN TROUBLE',
    () => 'THE FALL',
    () => 'LAST YEAR FEELS FAR AWAY',
    () => 'THE CROWN SLIPS',
    () => 'CHAMP\'S COLLAPSE',
    () => 'TROUBLE AT THE TOP',
    () => 'CRACKS SHOWING',
    (ctx) => ctx.magnitude === 'historic' ? 'WORST WEEK OF THE REIGN' : 'THE FALL',
    (ctx) => ctx.currentRank >= 8 ? 'BASEMENT BOUND' : 'THE DYNASTY CRACKS',
  ],
  headlines: [
    // Dramatic leads
    (ctx) => `The dynasty has ${pick(SYN.CRACKED)}.`,
    (ctx) => `${ctx.team.name} is bleeding.`,
    (ctx) => `${ctx.team.name}: from #1 to #${ctx.currentRank}.`,
    (ctx) => `${ctx.team.name} ${pick(SYN.FELL)} ${Math.abs(ctx.rankDeltaThisWeek)} spots.`,
    (ctx) => `${ctx.team.name}: the crown slips.`,

    // From-top framing
    (ctx) => ctx.previousRank === 1 && ctx.currentRank >= 4 ? `${ctx.team.name}: from #1 to #${ctx.currentRank} in one week.` : null,
    (ctx) => ctx.allTimeBest === 1 && ctx.currentRank >= 5 ? `${ctx.team.name} sits at #${ctx.currentRank}. A year ago they were lifting the trophy.` : null,
    (ctx) => ctx.rankDeltaSinceWeek1 <= -4 ? `${ctx.team.name}: ${ctx.rankDeltaSinceWeek1} spots since week 1.` : null,

    // Streak-anchored
    (ctx) => ctx.streak?.type === 'L' && ctx.streak.length >= 3 ? `${ctx.team.name} dropped ${ctx.streak.length} straight. The throne is empty.` : null,
    (ctx) => ctx.streak?.type === 'L' && ctx.streak.length >= 4 ? `Four straight losses. ${ctx.team.name} is in free fall.` : null,
    (ctx) => ctx.streak?.type === 'L' && ctx.streak.length >= 2 ? `${ctx.streak.length} losses in a row. The defending champ is wobbling.` : null,

    // Bleeding-cat led
    (ctx) => ctx.bleedingCats.length >= 2 ? `${ctx.team.name} ${pick(SYN.BLEEDS)} ${ctx.bleedingCats[0]} and ${ctx.bleedingCats[1]}.` : null,
    (ctx) => ctx.bleedingCats.length >= 1 ? `${ctx.team.name} is bleeding ${ctx.bleedingCats[0]}. The hole is widening.` : null,

    // Antagonist (the team that passed them)
    (ctx) => ctx.hero?.antagonist ? `${ctx.hero.antagonist.name} just passed ${ctx.team.name}. Few thought it would happen this week.` : null,
    (ctx) => ctx.hero?.antagonist ? `${ctx.team.name} loses ground to ${ctx.hero.antagonist.name}. The rebuild started Monday.` : null,
    (ctx) => ctx.hero?.antagonist ? `${ctx.hero.antagonist.name} on top. ${ctx.team.name} on notice.` : null,

    // Record-anchored
    (ctx) => `${ctx.team.name}: ${fmtRecord(ctx.catWins, ctx.catLosses, ctx.catTies)} and falling.`,
    (ctx) => `${ctx.team.name} is ${ctx.catLosses}-and-${ctx.catWins} the wrong way this month.`,

    // Rank-destination
    (ctx) => ctx.currentRank >= 8 ? `${ctx.team.name} is in the basement. Last year is a different league.` : null,
    (ctx) => ctx.currentRank >= 6 ? `${ctx.team.name}: bubble territory. The defending champ on the wrong side of the line.` : null,

    // Two-fragment punch
    (ctx) => `${ctx.team.name} fell. ${ctx.bleedingCats.length >= 1 ? `${ctx.bleedingCats[0]} broke first.` : 'Everything broke at once.'}`,
    (ctx) => `${ctx.team.name}: the dynasty has ${pick(SYN.CRACKED)}. Now it has to rebuild.`,
    (ctx) => `${ctx.team.name}. The crown is on the floor.`,

    // Magnitude conditionals
    (ctx) => ctx.magnitude === 'historic' ? `${ctx.team.name}: the worst week of the title defense.` : null,
    (ctx) => ctx.magnitude === 'huge' ? `${ctx.team.name} slid ${Math.abs(ctx.rankDeltaThisWeek)} spots. The biggest fall on the board.` : null,
    (ctx) => ctx.magnitude === 'solid' ? `${ctx.team.name} slipped one. It still says #${ctx.currentRank} instead of #1.` : null,

    // Season-stage
    (ctx) => ctx.weeksUntilPlayoffs <= 3 ? `${plural(ctx.weeksUntilPlayoffs, 'week')} to playoffs. ${ctx.team.name} is suddenly fighting for a seed.` : null,
    (ctx) => ctx.currentWeek >= 10 ? `Week ${ctx.currentWeek}. The champ is out of runway.` : null,

    // Mournful close
    (ctx) => `${ctx.team.name}. Last year feels far away.`,
    (ctx) => `${ctx.team.name}: every dynasty ends. This one is ending in public.`,
    (ctx) => `${ctx.team.name} is the team to beat. Apparently anyone can.`,
  ],
  bodies: [
    // The headline collapse
    (ctx) => `${ctx.team.name} ${pick(SYN.FELL)} from #${ctx.previousRank ?? 1} to #${ctx.currentRank} in a single week. The defending title is suddenly a memory.`,
    (ctx) => `${ctx.team.name}: ${ctx.rankDeltaSinceWeek1} spots since opening Monday. The reigning champ is unraveling.`,
    (ctx) => `${ctx.team.name} sits at #${ctx.currentRank}. A year ago they were lifting the trophy. The drop has been steady.`,

    // Cat-bleed led
    (ctx) => ctx.bleedingCats.length >= 2 ? `${ctx.team.name} is bleeding ${ctx.bleedingCats[0]} and ${ctx.bleedingCats[1]}. The categories that won them the title last year now lose them weeks.` : null,
    (ctx) => ctx.bleedingCats.length >= 1 ? `${ctx.bleedingCats[0]} keeps slipping. ${ctx.team.name} cannot find a stopgap.` : null,

    // Streak-anchored
    (ctx) => ctx.streak?.type === 'L' && ctx.streak.length >= 3 ? `${ctx.streak.length} straight matchup losses. The roster looks the same. The results do not.` : null,
    (ctx) => ctx.streak?.type === 'L' && ctx.streak.length >= 4 ? `Four straight Ls. The locker room is doing the math nobody wants to do.` : null,

    // Antagonist
    (ctx) => ctx.hero?.antagonist ? `${ctx.hero.antagonist.name} is the team that passed them this week. The defending champ ${pick(SYN.FELL)} on the matchup.` : null,
    (ctx) => ctx.hero?.antagonist ? `${ctx.hero.antagonist.name} sits where ${ctx.team.name} used to sit. The mantle shifted.` : null,

    // Record-anchored
    (ctx) => `${ctx.team.name}: ${fmtRecord(ctx.catWins, ctx.catLosses, ctx.catTies)}. The win-loss column does not lie.`,
    (ctx) => `${ctx.team.name} is ${(ctx.winPct * 100).toFixed(0)}% across categories. Last year they finished above 65%.`,

    // Rank-destination
    (ctx) => ctx.currentRank >= 8 ? `Basement. ${ctx.team.name} is staring at a rebuild season nobody saw coming.` : null,
    (ctx) => ctx.currentRank >= 6 ? `${ctx.team.name} is on the bubble. The defending champ is fighting for a seed.` : null,
    (ctx) => ctx.currentRank === 2 ? `${ctx.team.name} fell to #2. One week away from out of the top half.` : null,

    // Magnitude
    (ctx) => ctx.magnitude === 'historic' ? `The worst stretch of the title defense. The dynasty has officially cracked.` : null,
    (ctx) => ctx.magnitude === 'huge' ? `${Math.abs(ctx.rankDeltaThisWeek)}-spot fall. The biggest single-week drop in the league.` : null,
    (ctx) => ctx.magnitude === 'solid' ? `Quiet slide. The kind that the title defense cannot keep absorbing.` : null,

    // Season-stage
    (ctx) => ctx.weeksUntilPlayoffs <= 3 ? `${plural(ctx.weeksUntilPlayoffs, 'week')} until playoffs. ${ctx.team.name} has to find an answer in a hurry.` : null,
    (ctx) => ctx.currentWeek >= 10 ? `Week ${ctx.currentWeek}. The champ is out of weeks to fix it.` : null,
    (ctx) => ctx.currentWeek <= 5 ? `Five weeks in and the dynasty already looks different.` : null,

    // Mournful closers
    (ctx) => `${ctx.team.name} has the trophy on the shelf and a losing week on the board.`,
    (ctx) => `${ctx.team.name}: the room is quiet. The categories are loud.`,
    (ctx) => `${ctx.team.name} is not done. But it has never looked like this.`,

    // Pure stat fusion
    (ctx) => `${ctx.team.name}: ${ctx.catWins} cat wins, ${ctx.catLosses} losses, #${ctx.currentRank} on the ladder.`,
    (ctx) => `${ctx.team.name} is ${fmtSpots(ctx.rankDeltaSinceWeek1)} since week 1. The trajectory is the story.`,
  ],
  chips: [
    [
      (ctx) => `${fmtSpots(ctx.rankDeltaThisWeek)} SPOTS`,
      (ctx) => `FROM #${ctx.previousRank ?? 1} TO #${ctx.currentRank}`,
      (ctx) => `${fmtSpots(ctx.rankDeltaSinceWeek1)} SINCE WK 1`,
      () => 'FALLING',
      (ctx) => `#${ctx.currentRank} NOW`,
      () => 'CROWN SLIPS',
    ],
    [
      (ctx) => ctx.streak?.type === 'L' ? `L${ctx.streak.length}` : 'COLD',
      (ctx) => ctx.streak?.type === 'L' && ctx.streak.length >= 3 ? `${ctx.streak.length} STRAIGHT LS` : 'ON A SKID',
      () => 'BLEEDING',
      (ctx) => ctx.streak ? `${ctx.streak.length} L IN A ROW` : 'COOLED OFF',
      () => 'WOBBLING',
    ],
    [
      (ctx) => `${fmtRecord(ctx.catWins, ctx.catLosses, ctx.catTies)} IN CATS`,
      (ctx) => `${(ctx.winPct * 100).toFixed(0)}% WIN RATE`,
      (ctx) => ctx.bleedingCats.length >= 1 ? `${ctx.bleedingCats[0]} SLIPPING` : `${ctx.catWins}-${ctx.catLosses}`,
      (ctx) => `${ctx.catLosses} CAT LOSSES`,
      () => 'TRENDING DOWN',
    ],
  ],
  kickers: [
    (ctx) => `${ctx.team.name} has to find an answer.`,
    (ctx) => ctx.weeksUntilPlayoffs > 0 ? `${plural(ctx.weeksUntilPlayoffs, 'week')} to stop the bleeding.` : 'Playoffs decide the rest.',
    () => 'The room is quiet.',
    (ctx) => `${ctx.team.name} is on notice.`,
    () => 'The schedule will not soften.',
  ],
}

/* ─────────────────────────────────────────────────────────────────
   KIND: hero-bubble-surprise
   "Didn't see this coming" energy. Mid-table jump.
───────────────────────────────────────────────────────────────── */

const HERO_BUBBLE_SURPRISE: PRTemplate = {
  kind: 'hero-bubble-surprise',
  eyebrows: [
    () => 'NOBODY SAW THIS COMING',
    () => 'THE SURPRISE',
    () => 'BUBBLE BREAKER',
    () => 'OUT OF NOWHERE',
    () => 'PLAYING FOR A SEED',
    () => 'ROOM SHIFTED',
    () => 'WAIT AND SEE',
    () => 'NEW FACE IN THE TOP HALF',
    (ctx) => ctx.rankDeltaThisWeek >= 3 ? 'BIG WEEK FROM A MID-TABLE TEAM' : 'THE SURPRISE',
    () => 'NEW MATH',
  ],
  headlines: [
    // Surprise leads
    (ctx) => `${ctx.team.name} is suddenly playing for a seed.`,
    (ctx) => `${ctx.team.name}: nobody had them here.`,
    (ctx) => `${ctx.team.name} crashed the top half.`,
    (ctx) => `${ctx.team.name} flipped the bubble.`,
    (ctx) => `${ctx.team.name}. Wait, what.`,

    // Jump-rank framing
    (ctx) => ctx.rankDeltaThisWeek >= 3 ? `${ctx.team.name} ${pick(SYN.CLIMBED)} ${ctx.rankDeltaThisWeek} spots out of the basement.` : null,
    (ctx) => ctx.currentRank <= 5 && ctx.previousRank && ctx.previousRank >= 7 ? `${ctx.team.name} jumped from #${ctx.previousRank} to #${ctx.currentRank}. Top half, first time this year.` : null,
    (ctx) => ctx.rankDeltaSinceWeek1 >= 3 ? `${ctx.team.name}: ${fmtSpots(ctx.rankDeltaSinceWeek1)} since week 1.` : null,

    // Mid-table framing
    (ctx) => ctx.currentRank >= 4 && ctx.currentRank <= 6 ? `${ctx.team.name} is in the conversation. Newly.` : null,
    (ctx) => ctx.currentRank <= 6 && ctx.previousRank && ctx.previousRank >= 8 ? `${ctx.team.name} climbed off the basement floor.` : null,

    // Streak-anchored
    (ctx) => ctx.streak?.type === 'W' && ctx.streak.length >= 3 ? `${ctx.streak.length} straight wins. ${ctx.team.name} is the team nobody scouted.` : null,
    (ctx) => ctx.streak?.type === 'W' && ctx.streak.length >= 4 ? `${ctx.team.name}: four wins, zero buzz. Until now.` : null,

    // Cat-fingerprint
    (ctx) => ctx.topCats.length >= 1 ? `${ctx.team.name} found ${ctx.topCats[0]}. The board found ${ctx.team.name}.` : null,
    (ctx) => ctx.topCats.length >= 2 ? `${ctx.team.name} is winning ${ctx.topCats[0]} and ${ctx.topCats[1]}. New playoff math.` : null,

    // Record-anchored
    (ctx) => `${ctx.team.name}: ${fmtRecord(ctx.catWins, ctx.catLosses, ctx.catTies)} and climbing.`,
    (ctx) => `${ctx.team.name} flipped to .500. The bubble flipped with them.`,

    // Two-fragment punch
    (ctx) => `${ctx.team.name}: from afterthought to seed contender.`,
    (ctx) => `${ctx.team.name}. New playoff math.`,
    (ctx) => `${ctx.team.name} woke up. The ladder noticed.`,

    // Magnitude
    (ctx) => ctx.magnitude === 'historic' ? `${ctx.team.name}: the biggest mid-table surprise the league has seen in two years.` : null,
    (ctx) => ctx.magnitude === 'huge' ? `${ctx.team.name} climbed ${ctx.rankDeltaThisWeek} into the top half. Big.` : null,

    // Antagonist (the team that fell out)
    (ctx) => ctx.hero?.antagonist ? `${ctx.team.name} passed ${ctx.hero.antagonist.name}. Few had that order at draft.` : null,
    (ctx) => ctx.hero?.antagonist ? `${ctx.hero.antagonist.name} thought the seed was safe. ${ctx.team.name} disagreed.` : null,

    // Season-stage
    (ctx) => ctx.weeksUntilPlayoffs <= 3 ? `${plural(ctx.weeksUntilPlayoffs, 'week')} to playoffs. ${ctx.team.name} climbed into the picture.` : null,
    (ctx) => ctx.currentWeek <= 5 ? `Early days. ${ctx.team.name} is making noise nobody expected.` : null,

    // Quiet flavor
    (ctx) => `${ctx.team.name} is the story everyone underestimated.`,
    (ctx) => `${ctx.team.name}: the surprise is the team. The work is real.`,
  ],
  bodies: [
    // Anchor on the leap
    (ctx) => `${ctx.team.name} ${pick(SYN.CLIMBED)} from #${ctx.previousRank ?? '?'} to #${ctx.currentRank}. Nobody had them in the playoff hunt three weeks ago.`,
    (ctx) => `${ctx.team.name}: ${fmtSpots(ctx.rankDeltaSinceWeek1)} on the season, and the ones that matter all came this month.`,
    (ctx) => `${ctx.team.name} is in the top half. The draft sheets did not predict that.`,

    // Cat-fingerprint led
    (ctx) => ctx.topCats.length >= 2 ? `${ctx.team.name} locked ${ctx.topCats[0]} and ${ctx.topCats[1]}. The two categories that were holes a month ago.` : null,
    (ctx) => ctx.topCats.length >= 1 ? `${ctx.team.name} now ${pick(SYN.OWNS)} ${ctx.topCats[0]}. That category was the issue. It is not anymore.` : null,

    // Streak-anchored
    (ctx) => ctx.streak?.type === 'W' && ctx.streak.length >= 3 ? `${ctx.streak.length} straight matchup wins. The trajectory is real.` : null,
    (ctx) => ctx.streak?.type === 'W' && ctx.streak.length >= 4 ? `Four-week run. The mid-table team that turned into the dangerous team.` : null,

    // Record-anchored
    (ctx) => `${ctx.team.name}: ${fmtRecord(ctx.catWins, ctx.catLosses, ctx.catTies)}. A month ago it was the other way around.`,
    (ctx) => `${ctx.team.name} climbed to ${(ctx.winPct * 100).toFixed(0)}% across categories. The board reflects it.`,

    // Antagonist
    (ctx) => ctx.hero?.antagonist ? `${ctx.hero.antagonist.name} sits below ${ctx.team.name} for the first time this year. The seed math just changed.` : null,
    (ctx) => ctx.hero?.antagonist ? `${ctx.hero.antagonist.name} thought the seed was safe. ${ctx.team.name} has other plans.` : null,

    // Magnitude
    (ctx) => ctx.magnitude === 'historic' ? `The biggest mid-table climb in two seasons. ${ctx.team.name} is the story the analysts missed.` : null,
    (ctx) => ctx.magnitude === 'huge' ? `${Math.abs(ctx.rankDeltaThisWeek)} spots in a single week. The biggest surprise on the board.` : null,

    // Season-stage
    (ctx) => ctx.weeksUntilPlayoffs <= 3 ? `${plural(ctx.weeksUntilPlayoffs, 'week')} until playoffs. ${ctx.team.name} climbed into the seeding picture at the right time.` : null,
    (ctx) => ctx.currentWeek <= 5 ? `Five weeks in. The surprise might be a sample. It might be a thing.` : null,
    (ctx) => ctx.currentWeek >= 10 ? `Week ${ctx.currentWeek}. A late surprise is the most dangerous kind.` : null,

    // Rank-destination
    (ctx) => ctx.currentRank <= 4 ? `Top four. ${ctx.team.name} owns a bye if the season ended Monday.` : null,
    (ctx) => ctx.currentRank <= 6 ? `Top six. The bubble has a new face.` : null,

    // Two-fragment closers
    (ctx) => `${ctx.team.name} did not get the hype. They got the seed.`,
    (ctx) => `${ctx.team.name} is the surprise. The work is not.`,
    (ctx) => `${ctx.team.name}: the league has to scout them now.`,

    // Pure stat
    (ctx) => `${ctx.catWins} cat wins. ${fmtSpots(ctx.rankDeltaSinceWeek1)} on the ladder. ${ctx.team.name} is the story of the week.`,
  ],
  chips: [
    [
      (ctx) => `${fmtSpots(ctx.rankDeltaThisWeek)} SPOTS`,
      (ctx) => `FROM #${ctx.previousRank ?? '?'}`,
      (ctx) => `${fmtSpots(ctx.rankDeltaSinceWeek1)} SINCE WK 1`,
      (ctx) => `#${ctx.currentRank} OVERALL`,
      () => 'TOP HALF',
      () => 'BUBBLE BREAK',
    ],
    [
      (ctx) => ctx.streak?.type === 'W' ? `W${ctx.streak.length}` : 'RISING',
      (ctx) => ctx.streak?.type === 'W' && ctx.streak.length >= 3 ? `${ctx.streak.length} STRAIGHT` : 'ON A RUN',
      () => 'WAKING UP',
      (ctx) => ctx.streak ? `${ctx.streak.length} IN A ROW` : 'TRENDING',
      () => 'HOT',
    ],
    [
      (ctx) => `${fmtRecord(ctx.catWins, ctx.catLosses, ctx.catTies)} IN CATS`,
      (ctx) => `${(ctx.winPct * 100).toFixed(0)}% WIN RATE`,
      (ctx) => ctx.topCats.length >= 1 ? `${ctx.topCats[0]} OWNED` : `${ctx.catWins} CAT WINS`,
      (ctx) => `${ctx.catWins}-${ctx.catLosses}`,
      () => 'TRENDING UP',
    ],
  ],
  kickers: [
    (ctx) => `${ctx.team.name} is the surprise. Now they have to keep it.`,
    () => 'The seed picture just changed.',
    (ctx) => ctx.weeksUntilPlayoffs > 0 ? `${plural(ctx.weeksUntilPlayoffs, 'week')} to prove it.` : 'Playoffs decide.',
    () => 'The room is paying attention.',
    (ctx) => `${ctx.team.name} earned the look.`,
  ],
}

/* ─────────────────────────────────────────────────────────────────
   KIND: hero-the-race
   When the #1 seat is locked, the story is the scrum for the rest.
   ctx.team is the focal club (on the cutline, or the reader's team).
   All copy reads off race{} + the focal team's rank, never a weekly
   delta, so it stays accurate for a settled week.
───────────────────────────────────────────────────────────────── */

const HERO_THE_RACE: PRTemplate = {
  kind: 'hero-the-race',
  eyebrows: [
    () => 'THE REAL RACE',
    () => 'BELOW THE THRONE',
    () => 'THE SCRUM',
    () => 'SEATS UP FOR GRABS',
    () => 'THE CUTLINE',
    () => 'THE OTHER RACE',
    () => 'WHERE IT GETS DECIDED',
    () => 'THE FIELD',
  ],
  headlines: [
    // The focal team (ctx.team) is the club shown on the card (logo +
    // stats), so every headline names it; the leader is context only.
    (ctx) => `${ctx.team.name} sits on the cutline. One game decides the bracket.`,
    (ctx) => `${ctx.team.name} holds a seat by a game. The chase is real.`,
    (ctx) => ctx.race ? `${ctx.race.leaderName} is gone. ${ctx.team.name} is fighting for what's left.` : null,
    (ctx) => ctx.race ? `${ctx.team.name} is in the scrum. ${ctx.race.contenderCount} teams, ${plural(ctx.race.seatsOpen, 'seat')}.` : null,
    (ctx) => ctx.race ? `${ctx.race.leaderName} owns #1. ${ctx.team.name} owns the line that decides the rest.` : null,
    (ctx) => `${ctx.team.name}: the most contested seat in the league.`,
    (ctx) => ctx.race && ctx.race.seatsOpen >= 4 ? `One seed is settled. ${ctx.team.name} sits where the other ${ctx.race.seatsOpen} get decided.` : null,
    (ctx) => ctx.race ? `${ctx.team.name} is right on the line. ${ctx.race.contenderCount} teams want the same ${plural(ctx.race.seatsOpen, 'seat')}.` : null,
    (ctx) => `${ctx.team.name} is exactly where the season gets interesting.`,
    (ctx) => ctx.weeksUntilPlayoffs <= 4 && ctx.race ? `${plural(ctx.weeksUntilPlayoffs, 'week')} of jockeying left, and ${ctx.team.name} is on the bubble.` : null,
    (ctx) => ctx.race ? `${ctx.race.leaderName} locked the top. ${ctx.team.name} is on the seam that decides everyone else.` : null,
  ],
  bodies: [
    (ctx) => ctx.race ? `${ctx.race.leaderName} has the top line. Everything worth watching is happening below it.` : null,
    (ctx) => ctx.race ? `${ctx.race.contenderCount} teams are in range of the ${plural(ctx.race.seatsOpen, 'open seat')}. ${ctx.team.name} is one of them.` : null,
    (ctx) => `The cutline runs through ${ctx.team.name}. ${plural(ctx.weeksUntilPlayoffs, 'week')} to settle which side they finish on.`,
    (ctx) => ctx.race ? `${ctx.race.leaderName} clinched the conversation weeks ago. The rest of the field is playing for the ${plural(ctx.race.seatsOpen, 'seat')} that are still open.` : null,
    (ctx) => `${ctx.team.name}: ${fmtRecord(ctx.catWins, ctx.catLosses, ctx.catTies)}, and right on the seam that decides the bracket.`,
    (ctx) => ctx.race ? `The one-seed is set. ${ctx.race.contenderCount} teams are separated by a handful of category wins for the rest.` : null,
    (ctx) => `${ctx.team.name} is exactly where the season gets interesting. The line does not move itself.`,
  ],
  kickers: [
    () => 'The cutline is where the season lives now.',
    (ctx) => ctx.weeksUntilPlayoffs > 0 ? `${plural(ctx.weeksUntilPlayoffs, 'week')} to sort the seats.` : 'The seats get sorted now.',
    () => 'The leader is set. The drama is not.',
    (ctx) => ctx.race ? `${ctx.race.contenderCount} teams, ${plural(ctx.race.seatsOpen, 'seat')}.` : null,
    () => 'This is the race that matters.',
  ],
}

/* ─────────────────────────────────────────────────────────────────
   KIND: hero-your-team
   The reader's own team has a real angle worth the cover. ctx.team is
   the reader's team. Third-person only: the yellow row cue carries the
   "you", so this copy never says "you" or "your". Reads off the team's
   rank, season delta, streak, and cutline proximity, never a raw
   weekly delta, so it stays accurate.
───────────────────────────────────────────────────────────────── */

const HERO_YOUR_TEAM: PRTemplate = {
  kind: 'hero-your-team',
  eyebrows: [
    (ctx) => ctx.yourTeam?.angle === 'climb' ? 'ON THE RISE' : null,
    (ctx) => ctx.yourTeam?.angle === 'streak' ? 'HEATING UP' : null,
    (ctx) => ctx.yourTeam?.angle === 'bubble-in' ? 'HOLDING A SEAT' : null,
    (ctx) => ctx.yourTeam?.angle === 'bubble-out' ? 'ON THE BUBBLE' : null,
    (ctx) => ctx.yourTeam?.angle === 'lurking' ? 'QUIETLY DANGEROUS' : null,
    () => 'IN THE MIX',
    () => 'WORTH WATCHING',
    () => 'THE CHASE',
  ],
  headlines: [
    // Climb angle
    (ctx) => ctx.yourTeam?.angle === 'climb' ? `${ctx.team.name} is up ${ctx.rankDeltaSinceWeek1} since week 1. The climb is real.` : null,
    (ctx) => ctx.yourTeam?.angle === 'climb' ? `${ctx.team.name}: #${ctx.rankDeltaSinceWeek1 + ctx.currentRank} in week 1, #${ctx.currentRank} now.` : null,
    (ctx) => ctx.yourTeam?.angle === 'climb' ? `${ctx.team.name} ${pick(SYN.CLIMBED)} into #${ctx.currentRank}. The board is catching up.` : null,
    // Streak angle
    (ctx) => ctx.yourTeam?.angle === 'streak' && ctx.streak ? `${ctx.team.name} has won ${ctx.streak.length} straight. The seed is moving.` : null,
    (ctx) => ctx.yourTeam?.angle === 'streak' && ctx.streak ? `${ctx.streak.length} in a row. ${ctx.team.name} picked the right month.` : null,
    // Bubble angles
    (ctx) => ctx.yourTeam?.angle === 'bubble-in' ? `${ctx.team.name} holds the last seat. ${ctx.yourTeam.rivalName ?? 'The field'} is right behind.` : null,
    (ctx) => ctx.yourTeam?.angle === 'bubble-in' ? `${ctx.team.name} is inside the line at #${ctx.currentRank}. The cushion is thin.` : null,
    (ctx) => ctx.yourTeam?.angle === 'bubble-out' ? `${ctx.team.name} sits one spot out. ${plural(ctx.weeksUntilPlayoffs, 'week')} to fix it.` : null,
    (ctx) => ctx.yourTeam?.angle === 'bubble-out' && ctx.yourTeam.rivalName ? `${ctx.team.name} is chasing ${ctx.yourTeam.rivalName} for the last seat.` : null,
    // Lurking angle
    (ctx) => ctx.yourTeam?.angle === 'lurking' ? `${ctx.team.name} is #${ctx.currentRank} and nobody is talking about them yet.` : null,
    (ctx) => ctx.yourTeam?.angle === 'lurking' ? `${ctx.team.name} sits at #${ctx.currentRank}. The quiet contender.` : null,
    // Cat-fingerprint led (any angle)
    (ctx) => ctx.topCats.length >= 2 ? `${ctx.team.name} ${pick(SYN.OWNS)} ${ctx.topCats[0]} and ${ctx.topCats[1]}. The seed is following.` : null,
    (ctx) => ctx.topCats.length >= 1 && ctx.bleedingCats.length === 0 ? `${ctx.team.name} owns ${ctx.topCats[0]} and bleeds nothing. That plays in October.` : null,
    // Record / general
    (ctx) => `${ctx.team.name}: ${fmtRecord(ctx.catWins, ctx.catLosses, ctx.catTies)} and right in the bracket math.`,
    (ctx) => ctx.rankDeltaSinceWeek1 >= 1 ? `${ctx.team.name} has climbed to #${ctx.currentRank}. The schedule says keep going.` : null,
    (ctx) => `${ctx.team.name} is #${ctx.currentRank} with ${plural(ctx.weeksUntilPlayoffs, 'week')} to make it count.`,
  ],
  bodies: [
    (ctx) => ctx.yourTeam?.angle === 'climb' ? `${ctx.team.name} is ${fmtSpots(ctx.rankDeltaSinceWeek1)} on the season. The trajectory is the story, not the snapshot.` : null,
    (ctx) => ctx.yourTeam?.angle === 'streak' && ctx.streak ? `${ctx.streak.length} straight matchup wins. ${ctx.team.name} turned a quiet start into a seed push.` : null,
    (ctx) => ctx.yourTeam?.angle === 'bubble-in' ? `${ctx.team.name} is inside the line at #${ctx.currentRank}. ${ctx.yourTeam.rivalName ? `${ctx.yourTeam.rivalName} is the team to hold off.` : 'The cushion is one bad week.'}` : null,
    (ctx) => ctx.yourTeam?.angle === 'bubble-out' ? `${ctx.team.name} sits a game out of the bracket at #${ctx.currentRank}. ${plural(ctx.weeksUntilPlayoffs, 'week')} to close it.` : null,
    (ctx) => ctx.yourTeam?.angle === 'lurking' ? `${ctx.team.name} has quietly held #${ctx.currentRank}. ${ctx.topCats.length >= 1 ? `${ctx.topCats[0]} is theirs and nobody noticed.` : 'No drama, just position.'}` : null,
    (ctx) => `${ctx.team.name}: ${ctx.catWins} category wins, #${ctx.currentRank} on the board, ${plural(ctx.weeksUntilPlayoffs, 'week')} to play.`,
    (ctx) => ctx.topCats.length >= 1 ? `${ctx.team.name} ${pick(SYN.OWNS)} ${ctx.topCats[0]}. Build the rest around that and the seed takes care of itself.` : null,
    (ctx) => `${ctx.team.name} is in the part of the table where one week swings the whole bracket.`,
  ],
  kickers: [
    (ctx) => ctx.weeksUntilPlayoffs > 0 ? `${plural(ctx.weeksUntilPlayoffs, 'week')} to lock a seed.` : 'Playoffs settle it.',
    () => 'The bracket is within reach.',
    () => 'Next week is a tone-setter.',
    (ctx) => ctx.yourTeam?.rivalName ? `${ctx.yourTeam.rivalName} is the measuring stick.` : null,
    () => 'The window is open.',
  ],
}

/* ─────────────────────────────────────────────────────────────────
   KIND: pulse-heater (3+ game current win streak)
───────────────────────────────────────────────────────────────── */

const PULSE_HEATER: PRTemplate = {
  kind: 'pulse-heater',
  eyebrows: [
    () => 'ON A HEATER',
    () => 'WON\'T COOL OFF',
    () => 'RIDING IT',
    () => 'LOCKED IN',
    () => 'HOT',
    () => 'RUN OF THE WEEK',
    () => 'NOBODY CATCHING THEM',
    () => 'IN A GROOVE',
    (ctx) => (ctx.streak?.length ?? 0) >= 5 ? 'FIVE STRAIGHT' : 'ON A HEATER',
  ],
  headlines: [
    // Compressed leads
    (ctx) => ctx.streak ? `On a heater. W${ctx.streak.length}.` : null,
    (ctx) => `${ctx.team.name}: ${pick(SYN.STREAK_HOT)}.`,
    (ctx) => ctx.streak ? `${ctx.team.name}. ${ctx.streak.length} straight.` : null,
    (ctx) => ctx.streak ? `${ctx.team.name} won ${ctx.streak.length} in a row.` : null,
    (ctx) => `${ctx.team.name}: hot.`,

    // Number-led
    (ctx) => ctx.streak ? `W${ctx.streak.length}. ${ctx.team.name}.` : null,
    (ctx) => ctx.streak && ctx.streak.length >= 4 ? `${ctx.streak.length} straight matchups. ${ctx.team.name} keeps cashing.` : null,
    (ctx) => ctx.streak && ctx.streak.length >= 5 ? `Five straight. ${ctx.team.name} is the hottest team in the league.` : null,

    // Cat-anchored
    (ctx) => ctx.topCats.length >= 1 ? `${ctx.team.name} ${pick(SYN.OWNS)} ${ctx.topCats[0]}. Three straight, and counting.` : null,
    (ctx) => ctx.topCats.length >= 2 ? `${ctx.team.name}: ${ctx.topCats[0]} and ${ctx.topCats[1]} locked. The streak is no accident.` : null,

    // Ladder-flavor
    (ctx) => `${ctx.team.name} climbed. Now they are climbing some more.`,
    (ctx) => ctx.rankDeltaThisWeek >= 1 ? `${ctx.team.name}: ${fmtSpots(ctx.rankDeltaThisWeek)} and still riding the streak.` : null,

    // Magnitude
    (ctx) => ctx.magnitude === 'historic' ? `${ctx.team.name}: longest in-season run the league has seen all year.` : null,
    (ctx) => ctx.magnitude === 'huge' ? `${ctx.team.name} is the run of the week. The league has noticed.` : null,

    // Two-fragment
    (ctx) => `${ctx.team.name}. Running it.`,
    (ctx) => `${ctx.team.name}: hot. Stays hot.`,
    (ctx) => `${ctx.team.name} is locked in. Period.`,

    // Conversational
    (ctx) => `${ctx.team.name} cannot stop winning matchups.`,
    (ctx) => `${ctx.team.name} keeps stacking weeks.`,
    (ctx) => ctx.streak ? `${ctx.streak.length} matchups. Same ${ctx.team.name}. Same result.` : null,

    // Season-stage
    (ctx) => ctx.weeksUntilPlayoffs <= 3 ? `Right time. ${ctx.team.name} is heating into playoffs.` : null,
  ],
  bodies: [
    // Streak-led
    (ctx) => ctx.streak ? `${ctx.streak.length} matchup wins in a row. ${ctx.team.name} is the team to avoid right now.` : null,
    (ctx) => ctx.streak ? `${plural(ctx.streak.length, 'straight win')}. The schedule is the only thing slowing them down.` : null,
    (ctx) => ctx.streak ? `${ctx.team.name}: ${ctx.streak.length} weeks of cashing. The board reflects it.` : null,

    // Cat-anchored
    (ctx) => ctx.topCats.length >= 2 ? `${ctx.team.name} ${pick(SYN.OWNS)} ${ctx.topCats[0]} and ${ctx.topCats[1]}. Hard to lose to the rest of the field with those locked.` : null,
    (ctx) => ctx.topCats.length >= 1 ? `${ctx.team.name} won ${ctx.topCats[0]} in every matchup of the run.` : null,

    // Rank-anchored
    (ctx) => ctx.rankDeltaThisWeek >= 1 ? `${ctx.team.name} ${pick(SYN.CLIMBED)} ${ctx.rankDeltaThisWeek} and is not slowing.` : null,
    (ctx) => `${ctx.team.name}: ${fmtRecord(ctx.catWins, ctx.catLosses, ctx.catTies)} on the year, riding a run.`,

    // Magnitude
    (ctx) => ctx.magnitude === 'historic' ? `Longest streak any team has put together in the league this year.` : null,
    (ctx) => ctx.magnitude === 'huge' ? `One of the loudest in-season runs in a season full of noise.` : null,
    (ctx) => ctx.magnitude === 'solid' ? `${ctx.team.name} keeps winning the matchups that should be tight.` : null,

    // Season-stage
    (ctx) => ctx.weeksUntilPlayoffs <= 3 ? `Three weeks to playoffs. The hottest team in the league is the one nobody wants in the bracket.` : null,
    (ctx) => ctx.currentWeek >= 10 ? `Late-season heater. The most dangerous kind.` : null,

    // Closer
    (ctx) => `${ctx.team.name} is the team to avoid in the bracket.`,
    (ctx) => `${ctx.team.name}: nobody is cooling them off.`,
    (ctx) => `${ctx.team.name} keeps winning the matchups that should not be wins.`,

    // Pure stat
    (ctx) => ctx.streak ? `${ctx.streak.length} matchup wins. ${ctx.catWins} cat wins. One trajectory.` : null,
    (ctx) => ctx.streak && ctx.streak.length >= 4 ? `${ctx.streak.length} straight Mondays in the win column.` : null,
  ],
}

/* ─────────────────────────────────────────────────────────────────
   KIND: pulse-long-fall (cumulative rank drop)
───────────────────────────────────────────────────────────────── */

const PULSE_LONG_FALL: PRTemplate = {
  kind: 'pulse-long-fall',
  eyebrows: [
    () => 'LONG FALL',
    () => 'STILL BLEEDING',
    () => 'CAN\'T STOP IT',
    () => 'THE SLIDE',
    () => 'IN A SKID',
    () => 'TROUBLE',
    () => 'FREE FALL',
    () => 'BASEMENT BOUND',
    (ctx) => Math.abs(ctx.rankDeltaSinceWeek1) >= 5 ? 'BIGGEST FALL OF THE YEAR' : 'LONG FALL',
  ],
  headlines: [
    // Trajectory leads
    (ctx) => `${ctx.team.name}: from #${(ctx.currentRank - ctx.rankDeltaSinceWeek1) || '?'} to #${ctx.currentRank} in ${plural(ctx.currentWeek, 'week')}.`,
    (ctx) => `${ctx.team.name} ${pick(SYN.FELL)} ${Math.abs(ctx.rankDeltaSinceWeek1)} spots.`,
    (ctx) => `${ctx.team.name}. ${fmtSpots(ctx.rankDeltaSinceWeek1)}.`,
    (ctx) => `${ctx.team.name}: still ${pick(SYN.BLEEDS)}.`,

    // Number-led
    (ctx) => Math.abs(ctx.rankDeltaSinceWeek1) >= 4 ? `${ctx.team.name}: ${ctx.rankDeltaSinceWeek1} on the year.` : null,
    (ctx) => Math.abs(ctx.rankDeltaThisWeek) >= 2 ? `${ctx.team.name}: another ${Math.abs(ctx.rankDeltaThisWeek)}-spot week.` : null,

    // Streak-anchored
    (ctx) => ctx.streak?.type === 'L' && ctx.streak.length >= 3 ? `${ctx.streak.length} straight losses. ${ctx.team.name} cannot find traction.` : null,
    (ctx) => ctx.streak?.type === 'L' && ctx.streak.length >= 4 ? `Four-week slide. ${ctx.team.name}.` : null,

    // Cat-bleed led
    (ctx) => ctx.bleedingCats.length >= 1 ? `${ctx.team.name} ${pick(SYN.BLEEDS)} ${ctx.bleedingCats[0]}. The hole keeps widening.` : null,
    (ctx) => ctx.bleedingCats.length >= 2 ? `${ctx.team.name}: ${ctx.bleedingCats[0]} and ${ctx.bleedingCats[1]} both gone.` : null,

    // Rank-destination
    (ctx) => ctx.currentRank >= 8 ? `${ctx.team.name} is in the basement.` : null,
    (ctx) => ctx.currentRank >= 7 ? `${ctx.team.name}: bubble dropped out.` : null,

    // Two-fragment
    (ctx) => `${ctx.team.name}. The slide continues.`,
    (ctx) => `${ctx.team.name}: ${fmtSpots(ctx.rankDeltaThisWeek)}. Same direction.`,
    (ctx) => `${ctx.team.name}. Free fall.`,

    // Mournful
    (ctx) => `${ctx.team.name} keeps showing up. The results do not.`,
    (ctx) => `${ctx.team.name}: every week, a little lower.`,
    (ctx) => `${ctx.team.name} cannot stop the bleeding.`,
  ],
  bodies: [
    // Trajectory-led
    (ctx) => `${ctx.team.name}: ${fmtSpots(ctx.rankDeltaSinceWeek1)} over ${plural(ctx.currentWeek, 'week')}. The trajectory is the story.`,
    (ctx) => `${ctx.team.name} ${pick(SYN.FELL)} from #${(ctx.currentRank - ctx.rankDeltaSinceWeek1) || '?'} to #${ctx.currentRank}. The longest sustained drop on the board.`,
    (ctx) => `${ctx.team.name} keeps losing ground. ${plural(Math.abs(ctx.rankDeltaThisWeek), 'spot')} this week, ${Math.abs(ctx.rankDeltaSinceWeek1)} on the year.`,

    // Cat-bleed
    (ctx) => ctx.bleedingCats.length >= 1 ? `${ctx.team.name} is bleeding ${ctx.bleedingCats[0]}. The category that needs a fix is the category that does not get fixed.` : null,
    (ctx) => ctx.bleedingCats.length >= 2 ? `${ctx.bleedingCats[0]} and ${ctx.bleedingCats[1]} both went the wrong way. ${ctx.team.name} cannot win without one of them.` : null,

    // Streak-anchored
    (ctx) => ctx.streak?.type === 'L' && ctx.streak.length >= 3 ? `${ctx.streak.length} straight matchup losses. ${ctx.team.name} is in a skid.` : null,
    (ctx) => ctx.streak?.type === 'L' && ctx.streak.length >= 4 ? `Four straight losses. The roster is the same. The results are not.` : null,

    // Rank-destination
    (ctx) => ctx.currentRank >= 8 ? `Basement. ${ctx.team.name} stares at a rebuild week from week ${ctx.currentWeek} on.` : null,
    (ctx) => ctx.currentRank >= 7 ? `${ctx.team.name} dropped out of the bubble. The seed math is no longer kind.` : null,

    // Magnitude
    (ctx) => ctx.magnitude === 'historic' ? `Biggest sustained drop the league has seen this season.` : null,
    (ctx) => ctx.magnitude === 'huge' ? `${Math.abs(ctx.rankDeltaThisWeek)}-spot week. ${Math.abs(ctx.rankDeltaSinceWeek1)} on the year. Same direction.` : null,
    (ctx) => ctx.magnitude === 'solid' ? `Quiet slide. The kind that adds up to a wasted year if it does not stop.` : null,

    // Season-stage
    (ctx) => ctx.weeksUntilPlayoffs <= 3 ? `${plural(ctx.weeksUntilPlayoffs, 'week')} to playoffs. ${ctx.team.name} is running out of weeks.` : null,
    (ctx) => ctx.currentWeek >= 10 ? `Week ${ctx.currentWeek}. Late slides do not get fixed.` : null,

    // Closer
    (ctx) => `${ctx.team.name} has to find one win to stop the spiral.`,
    (ctx) => `${ctx.team.name}: every week the math gets uglier.`,
    (ctx) => `${ctx.team.name} keeps losing the categories that used to be theirs.`,

    // Pure stat
    (ctx) => `${ctx.team.name}: ${fmtRecord(ctx.catWins, ctx.catLosses, ctx.catTies)}, ${fmtSpots(ctx.rankDeltaSinceWeek1)} on the ladder.`,
  ],
}

/* ─────────────────────────────────────────────────────────────────
   KIND: pulse-steady-hand (low rank variance, stays top half)
───────────────────────────────────────────────────────────────── */

const PULSE_STEADY_HAND: PRTemplate = {
  kind: 'pulse-steady-hand',
  eyebrows: [
    () => 'STEADY HAND',
    () => 'NEVER LOUD',
    () => 'ALWAYS THERE',
    () => 'HOLDS THE LINE',
    () => 'NO NOISE',
    () => 'BORING. EFFECTIVE.',
    () => 'STILL THERE',
    () => 'LOCKED IN',
    (ctx) => ctx.currentRank <= 4 ? 'TOP FOUR. AGAIN.' : 'STEADY HAND',
  ],
  headlines: [
    // Quiet-confidence leads
    (ctx) => `Always there. Never loud.`,
    (ctx) => `${ctx.team.name}: ${pick(SYN.HOLDS_LINE)}.`,
    (ctx) => `${ctx.team.name} sits at #${ctx.currentRank}. Same as last week.`,
    (ctx) => `${ctx.team.name}: same spot, every Monday.`,
    (ctx) => `${ctx.team.name} keeps showing up.`,

    // Variance-led
    (ctx) => ctx.rankDeltaThisWeek === 0 ? `${ctx.team.name}: zero change. Top-half lock.` : null,
    (ctx) => Math.abs(ctx.rankDeltaSinceWeek1) <= 1 ? `${ctx.team.name}: same rank as week 1.` : null,
    (ctx) => Math.abs(ctx.rankDeltaThisWeek) <= 1 ? `${ctx.team.name}: another quiet, top-half week.` : null,

    // Cat-fingerprint
    (ctx) => ctx.topCats.length >= 1 ? `${ctx.team.name} ${pick(SYN.OWNS)} ${ctx.topCats[0]}. Has all year.` : null,
    (ctx) => ctx.topCats.length >= 2 ? `${ctx.team.name}: ${ctx.topCats[0]} and ${ctx.topCats[1]}. Reliable as the alarm.` : null,

    // Record-anchored
    (ctx) => `${ctx.team.name}: ${fmtRecord(ctx.catWins, ctx.catLosses, ctx.catTies)}. Same shape. New week.`,
    (ctx) => `${ctx.team.name} sits at #${ctx.currentRank}. They have sat at #${ctx.currentRank} for ${plural(3, 'week')} now.`,

    // Two-fragment
    (ctx) => `${ctx.team.name}. Steady.`,
    (ctx) => `${ctx.team.name}: no fireworks. No retreat.`,
    (ctx) => `${ctx.team.name} stays. Everyone else moves.`,

    // Appreciative deadpan
    (ctx) => `${ctx.team.name}: the boring one. The dangerous one.`,
    (ctx) => `${ctx.team.name} is not climbing. They are not falling. They are setting up the playoffs.`,
    (ctx) => `${ctx.team.name}: nobody's hot take. Everyone's headache.`,

    // Quiet flavor
    (ctx) => `${ctx.team.name}: never loud.`,
    (ctx) => `${ctx.team.name}. ${pick(SYN.QUIET_NICE)}, top half.`,

    // Top-half wayfinding
    (ctx) => ctx.currentRank <= 4 ? `${ctx.team.name}: top four. Again.` : null,
    (ctx) => ctx.currentRank <= 6 ? `${ctx.team.name}: top six. Has been all year.` : null,
  ],
  bodies: [
    // Variance-led
    (ctx) => `${ctx.team.name} has not moved more than ${plural(1, 'spot')} in any week this season. The ladder respects it.`,
    (ctx) => `${ctx.team.name}: same rank as opening Monday. The team that does not waste weeks.`,
    (ctx) => `${ctx.team.name} sits at #${ctx.currentRank}. They sat at #${ctx.currentRank} two weeks ago and three weeks ago.`,

    // Cat-fingerprint
    (ctx) => ctx.topCats.length >= 2 ? `${ctx.team.name} ${pick(SYN.OWNS)} ${ctx.topCats[0]} and ${ctx.topCats[1]}. Both since opening week.` : null,
    (ctx) => ctx.topCats.length >= 1 ? `${ctx.team.name} won ${ctx.topCats[0]} in every matchup of the run.` : null,

    // Record-anchored
    (ctx) => `${ctx.team.name}: ${fmtRecord(ctx.catWins, ctx.catLosses, ctx.catTies)}. The shape barely changes week to week.`,
    (ctx) => `${ctx.team.name} is ${(ctx.winPct * 100).toFixed(0)}% across categories. Same number for a month.`,

    // Quiet-confidence
    (ctx) => `${ctx.team.name} is not on anyone's hot take. They will be on every bracket.`,
    (ctx) => `${ctx.team.name}: the boring one. Boring teams win playoffs.`,
    (ctx) => `${ctx.team.name} does not need a hot week. They need every week.`,

    // Season-stage
    (ctx) => ctx.weeksUntilPlayoffs <= 3 ? `${plural(ctx.weeksUntilPlayoffs, 'week')} to playoffs. ${ctx.team.name} is exactly where they need to be.` : null,
    (ctx) => ctx.currentWeek >= 10 ? `Week ${ctx.currentWeek} and the seed has not budged. ${ctx.team.name} is the easiest playoff projection on the board.` : null,

    // Magnitude
    (ctx) => ctx.magnitude === 'solid' ? `The opposite of a story. ${ctx.team.name} keeps producing the win column.` : null,
    (ctx) => ctx.magnitude === 'minor' ? `Quiet week. ${ctx.team.name} still in the top half.` : null,

    // Closer
    (ctx) => `${ctx.team.name} is not the team anyone is talking about. The team everyone has to play.`,
    (ctx) => `${ctx.team.name}: the dangerous kind of consistent.`,
    (ctx) => `${ctx.team.name} keeps the line. Eventually that is the conversation.`,

    // Cat + variance fusion
    (ctx) => ctx.topCats.length >= 1 && Math.abs(ctx.rankDeltaSinceWeek1) <= 1 ? `${ctx.team.name} has owned ${ctx.topCats[0]} all year. Their rank reflects it.` : null,
  ],
}

/* ─────────────────────────────────────────────────────────────────
   KIND: dynasty-hitting-king
───────────────────────────────────────────────────────────────── */

const DYNASTY_HITTING_KING: PRTemplate = {
  kind: 'dynasty-hitting-king',
  eyebrows: [
    // Magazine-register department labels only. "BAT DEPARTMENT" read
    // too SaaS-feature-y and was the outlier voice across the pool.
    () => 'HITTING KING',
    () => 'OWNS THE BATS',
    () => 'OFFENSIVE THRONE',
    () => 'LINEUP ROYALTY',
    () => 'OFFENSE LOCKED',
    () => 'HITTING CATS',
    () => 'KING OF THE BOX',
    () => 'AT THE PLATE',
    () => 'THE OFFENSE',
    (ctx) => (ctx.dynasty?.weeksOwning ?? 0) >= 8 ? 'SEASON-LONG REIGN' : 'HITTING KING',
  ],
  headlines: [
    // Ownership leads
    (ctx) => ctx.dynasty?.cats && ctx.dynasty.cats.length >= 2 ? `${ctx.team.name} ${pick(SYN.OWNS)} ${ctx.dynasty.cats[0]}. ${pick(SYN.OWNS)} ${ctx.dynasty.cats[1]}.` : null,
    (ctx) => ctx.dynasty?.cats && ctx.dynasty.cats.length >= 3 ? `${ctx.team.name}: ${ctx.dynasty.cats[0]}, ${ctx.dynasty.cats[1]}, ${ctx.dynasty.cats[2]}. All year.` : null,
    (ctx) => ctx.dynasty?.cats && ctx.dynasty.cats.length >= 1 ? `${ctx.team.name} ${pick(SYN.OWNS)} ${ctx.dynasty.cats[0]}. Has since opening week.` : null,
    (ctx) => `${ctx.team.name}: the bats.`,
    (ctx) => `${ctx.team.name} owns the box score.`,

    // Time-anchored
    (ctx) => ctx.dynasty?.weeksOwning ? `${plural(ctx.dynasty.weeksOwning, 'week')} owning ${ctx.dynasty?.cats?.[0] ?? 'the bats'}. Still owning.` : null,
    (ctx) => ctx.dynasty?.seasonsOwning && ctx.dynasty.seasonsOwning >= 2 ? `${ctx.dynasty.seasonsOwning} seasons in a row owning HR. ${ctx.team.name}.` : null,

    // Cat-specific flavor
    (ctx) => ctx.dynasty?.cats?.includes('HR') ? `${ctx.team.name} ${pick(SYN.OWNS)} HR. Nobody is closing the gap.` : null,
    (ctx) => ctx.dynasty?.cats?.includes('RBI') ? `${ctx.team.name}: RBI department. All year.` : null,
    (ctx) => ctx.dynasty?.cats?.includes('R') ? `${ctx.team.name} ${pick(SYN.OWNS)} runs. The lineup runs the league.` : null,
    (ctx) => ctx.dynasty?.cats?.includes('SB') ? `${ctx.team.name}: stolen bases since week 1.` : null,

    // Two-fragment
    (ctx) => ctx.dynasty?.cats?.[0] ? `${ctx.team.name}. ${ctx.dynasty.cats[0]}. End of story.` : null,
    (ctx) => `${ctx.team.name}: the bats nobody is catching.`,
    (ctx) => `${ctx.team.name} hits. Everyone else chases.`,

    // Conversational
    (ctx) => `${ctx.team.name}: built around the lineup.`,
    (ctx) => `${ctx.team.name} drafted bats. The bats are paying.`,
    (ctx) => `${ctx.team.name}: the offensive ceiling in the league.`,

    // Magnitude
    (ctx) => ctx.magnitude === 'historic' ? `${ctx.team.name}: the deepest offensive hold the league has seen in two years.` : null,
  ],
  bodies: [
    // Ownership-led
    (ctx) => ctx.dynasty?.cats && ctx.dynasty.cats.length >= 2 ? `${ctx.team.name} ${pick(SYN.OWNS)} ${ctx.dynasty.cats[0]} and ${ctx.dynasty.cats[1]}. Both since opening week.` : null,
    (ctx) => ctx.dynasty?.cats && ctx.dynasty.cats.length >= 3 ? `${ctx.team.name} leads the league in ${ctx.dynasty.cats[0]}, ${ctx.dynasty.cats[1]}, and ${ctx.dynasty.cats[2]}. The offensive throne is unchallenged.` : null,

    // Time-anchored
    (ctx) => ctx.dynasty?.weeksOwning ? `${plural(ctx.dynasty.weeksOwning, 'straight week')} owning the hitting cats. ${ctx.team.name} drafted for exactly this.` : null,
    (ctx) => ctx.dynasty?.seasonsOwning && ctx.dynasty.seasonsOwning >= 2 ? `${ctx.dynasty.seasonsOwning} consecutive seasons leading the league in HR. ${ctx.team.name} is the dynasty bat shop.` : null,

    // Specific-cat flavor
    (ctx) => ctx.dynasty?.cats?.includes('HR') ? `${ctx.team.name}: HR lead since week 1. The gap is two-plus and growing.` : null,
    (ctx) => ctx.dynasty?.cats?.includes('RBI') ? `${ctx.team.name} produces RBI nobody else can match. The lineup is the system.` : null,
    (ctx) => ctx.dynasty?.cats?.includes('R') && ctx.dynasty?.cats?.includes('HR') ? `${ctx.team.name}: R and HR both locked. The two cats that travel together.` : null,

    // Record-anchored
    (ctx) => `${ctx.team.name}: ${fmtRecord(ctx.catWins, ctx.catLosses, ctx.catTies)}. The offense does the heavy lifting.`,
    (ctx) => `${ctx.team.name} is ${(ctx.winPct * 100).toFixed(0)}% across cats. The bats are the reason.`,

    // Quiet-confidence
    (ctx) => `${ctx.team.name} does not need to chase pitching. The bats win the matchup before the pitchers throw.`,
    (ctx) => `${ctx.team.name}: the league's offensive ceiling. Has been all year.`,

    // Magnitude
    (ctx) => ctx.magnitude === 'historic' ? `Longest in-season hold on the offensive cats the league has had since 2024.` : null,
    (ctx) => ctx.magnitude === 'huge' ? `${ctx.team.name} owns three offensive categories. Few teams own two.` : null,

    // Closer
    (ctx) => `${ctx.team.name} hits and ${ctx.team.name} wins. The map.`,
    (ctx) => `${ctx.team.name}: the offense is the strategy.`,

    // Conversational
    (ctx) => `${ctx.team.name} drafted for offense. The bats are returning the favor every Monday.`,
  ],
}

/* ─────────────────────────────────────────────────────────────────
   KIND: dynasty-pitching-king
───────────────────────────────────────────────────────────────── */

const DYNASTY_PITCHING_KING: PRTemplate = {
  kind: 'dynasty-pitching-king',
  eyebrows: [
    () => 'PITCHING KING',
    () => 'ARMS DEPARTMENT',
    () => 'STAFF OF THE YEAR',
    () => 'BULLPEN ROYALTY',
    () => 'OWNS THE MOUND',
    () => 'PITCHING THRONE',
    () => 'ROTATION DEPTH',
    () => 'ARM THRONE',
    (ctx) => (ctx.dynasty?.seasonsOwning ?? 0) >= 3 ? 'FIVE YEARS OWNING SV' : 'PITCHING KING',
  ],
  headlines: [
    // Ownership leads
    (ctx) => ctx.dynasty?.cats && ctx.dynasty.cats.length >= 2 ? `${ctx.team.name} ${pick(SYN.OWNS)} ${ctx.dynasty.cats[0]} and ${ctx.dynasty.cats[1]}.` : null,
    (ctx) => ctx.dynasty?.cats && ctx.dynasty.cats.length >= 3 ? `${ctx.team.name}: ${ctx.dynasty.cats[0]}, ${ctx.dynasty.cats[1]}, ${ctx.dynasty.cats[2]}. All arms.` : null,
    (ctx) => ctx.dynasty?.cats && ctx.dynasty.cats.length >= 1 ? `${ctx.team.name} ${pick(SYN.OWNS)} ${ctx.dynasty.cats[0]}. Since draft day.` : null,
    (ctx) => `${ctx.team.name} runs the pitching side.`,
    (ctx) => `${ctx.team.name} owns the mound.`,

    // Time-anchored
    (ctx) => ctx.dynasty?.weeksOwning ? `${plural(ctx.dynasty.weeksOwning, 'week')} owning ${ctx.dynasty?.cats?.[0] ?? 'the arms'}.` : null,
    (ctx) => ctx.dynasty?.seasonsOwning && ctx.dynasty.seasonsOwning >= 3 ? `${ctx.dynasty.seasonsOwning} years owning saves. Still owning them.` : null,
    (ctx) => ctx.dynasty?.seasonsOwning && ctx.dynasty.seasonsOwning >= 2 ? `${ctx.dynasty.seasonsOwning} seasons running the K column.` : null,

    // Cat-specific flavor
    (ctx) => ctx.dynasty?.cats?.includes('K') ? `${ctx.team.name}: K department. Year after year.` : null,
    (ctx) => ctx.dynasty?.cats?.includes('SV') ? `${ctx.team.name} ${pick(SYN.OWNS)} saves. The closer fund pays out.` : null,
    (ctx) => ctx.dynasty?.cats?.includes('ERA') ? `${ctx.team.name} leads the league in ERA. Has all year.` : null,
    (ctx) => ctx.dynasty?.cats?.includes('W') ? `${ctx.team.name} ${pick(SYN.OWNS)} W. Has all year.` : null,

    // Two-fragment
    (ctx) => ctx.dynasty?.cats?.[0] ? `${ctx.team.name}. ${ctx.dynasty.cats[0]}. Locked.` : null,
    (ctx) => `${ctx.team.name}: the staff nobody is catching.`,
    (ctx) => `${ctx.team.name} pitches. Everyone else chases.`,

    // Conversational
    (ctx) => `${ctx.team.name}: built around the rotation.`,
    (ctx) => `${ctx.team.name} drafted arms. The arms are paying.`,
    (ctx) => `${ctx.team.name}: the pitching ceiling in the league.`,

    // Magnitude
    (ctx) => ctx.magnitude === 'historic' ? `${ctx.team.name}: the longest pitching dynasty the league has seen.` : null,
  ],
  bodies: [
    // Ownership-led
    (ctx) => ctx.dynasty?.cats && ctx.dynasty.cats.length >= 2 ? `${ctx.team.name} ${pick(SYN.OWNS)} ${ctx.dynasty.cats[0]} and ${ctx.dynasty.cats[1]}. Two of the three pitching cats, locked all season.` : null,
    (ctx) => ctx.dynasty?.cats && ctx.dynasty.cats.length >= 3 ? `${ctx.team.name} leads the league in ${ctx.dynasty.cats[0]}, ${ctx.dynasty.cats[1]}, and ${ctx.dynasty.cats[2]}. The pitching throne sits unchallenged.` : null,

    // Time-anchored
    (ctx) => ctx.dynasty?.weeksOwning ? `${plural(ctx.dynasty.weeksOwning, 'straight week')} owning the pitching cats. The rotation is the system.` : null,
    (ctx) => ctx.dynasty?.seasonsOwning && ctx.dynasty.seasonsOwning >= 3 ? `${ctx.dynasty.seasonsOwning} consecutive seasons leading the league in saves. ${ctx.team.name} runs the closer market.` : null,
    (ctx) => ctx.dynasty?.seasonsOwning && ctx.dynasty.seasonsOwning >= 2 ? `${ctx.dynasty.seasonsOwning} years owning K. ${ctx.team.name} drafts strikeouts on purpose.` : null,

    // Cat-specific
    (ctx) => ctx.dynasty?.cats?.includes('K') ? `${ctx.team.name}: K lead since week 1. The rotation is the strategy.` : null,
    (ctx) => ctx.dynasty?.cats?.includes('SV') ? `${ctx.team.name} owns SV. Has owned SV. Will own SV.` : null,
    (ctx) => ctx.dynasty?.cats?.includes('ERA') && ctx.dynasty?.cats?.includes('WHIP') ? `${ctx.team.name} leads the league in ERA and WHIP. The only staff that owns both.` : null,

    // Record-anchored
    (ctx) => `${ctx.team.name}: ${fmtRecord(ctx.catWins, ctx.catLosses, ctx.catTies)}. The arms do the work.`,
    (ctx) => `${ctx.team.name} is ${(ctx.winPct * 100).toFixed(0)}% across cats. The rotation is the reason.`,

    // Quiet-confidence
    (ctx) => `${ctx.team.name} does not need an offensive blow-up week. The staff wins the matchup before the bats wake up.`,
    (ctx) => `${ctx.team.name}: the pitching ceiling. Has been all year.`,

    // Magnitude
    (ctx) => ctx.magnitude === 'historic' ? `Longest in-season pitching hold in league history.` : null,
    (ctx) => ctx.magnitude === 'huge' ? `${ctx.team.name} owns three pitching categories. Nobody else owns two.` : null,

    // Closer
    (ctx) => `${ctx.team.name} pitches and ${ctx.team.name} wins. The formula.`,
    (ctx) => `${ctx.team.name}: the staff is the strategy.`,

    // Conversational
    (ctx) => `${ctx.team.name} drafted for arms. The rotation is returning the favor every Monday.`,
  ],
}

/* ─────────────────────────────────────────────────────────────────
   KIND: dynasty-punt-kings
───────────────────────────────────────────────────────────────── */

const DYNASTY_PUNT_KINGS: PRTemplate = {
  kind: 'dynasty-punt-kings',
  eyebrows: [
    () => 'PUNT KINGS',
    () => 'STRATEGY PAYS',
    () => 'COMMITTED',
    () => 'NO HOLDS BARRED',
    () => 'PUNTING WITH PURPOSE',
    () => 'THE PUNT WORKS',
    () => 'IGNORING ONE COLUMN',
    () => 'BUILT THE BOAT',
    (ctx) => (ctx.dynasty?.puntedSeasons ?? 0) >= 4 ? 'FIVE SEASONS PUNTING' : 'PUNT KINGS',
  ],
  headlines: [
    // Punt-acknowledgment leads
    (ctx) => ctx.dynasty?.puntedCat && ctx.dynasty?.puntedWeeks ? `Punted ${ctx.dynasty.puntedCat} for ${plural(ctx.dynasty.puntedWeeks, 'week')}. ${ctx.team.name}.` : null,
    (ctx) => ctx.dynasty?.puntedCat && ctx.dynasty?.puntedSeasons ? `Punted ${ctx.dynasty.puntedCat} for ${plural(ctx.dynasty.puntedSeasons, 'straight season')}. Strategy still pays.` : null,
    (ctx) => ctx.dynasty?.puntedCat ? `${ctx.team.name} ${pick(SYN.PUNTED)} ${ctx.dynasty.puntedCat}. Wins everything else.` : null,
    (ctx) => `${ctx.team.name}: the punt is the plan.`,
    (ctx) => `${ctx.team.name} skips one column. Owns the rest.`,

    // Time-anchored
    (ctx) => ctx.dynasty?.puntedSeasons && ctx.dynasty.puntedSeasons >= 4 ? `${ctx.dynasty.puntedSeasons} straight seasons punting ${ctx.dynasty.puntedCat ?? 'HLD'}. Still winning.` : null,
    (ctx) => ctx.dynasty?.puntedWeeks && ctx.dynasty.puntedWeeks >= 10 ? `${ctx.dynasty.puntedWeeks} weeks punting ${ctx.dynasty.puntedCat ?? 'a cat'}. The math still works.` : null,

    // Strategy framing
    (ctx) => ctx.dynasty?.puntedCat ? `${ctx.team.name}: built around skipping ${ctx.dynasty.puntedCat}.` : null,
    (ctx) => `${ctx.team.name} sat out the one cat. They own every other.`,
    (ctx) => ctx.topCats.length >= 2 ? `${ctx.team.name} punted one. They own ${ctx.topCats[0]} and ${ctx.topCats[1]}.` : null,

    // Two-fragment
    (ctx) => ctx.dynasty?.puntedCat ? `${ctx.team.name}. ${ctx.dynasty.puntedCat}? No. Everything else? Yes.` : null,
    (ctx) => `${ctx.team.name}: the punt holds.`,
    (ctx) => `${ctx.team.name}. One cat off. Eight cats on.`,

    // Conversational
    (ctx) => `${ctx.team.name}: built the boat to sail without one oar.`,
    (ctx) => `${ctx.team.name} ignored the column. The column ignored them back.`,
    (ctx) => `${ctx.team.name}: commitment is a strategy.`,

    // Record-anchored
    (ctx) => `${ctx.team.name}: ${fmtRecord(ctx.catWins, ctx.catLosses, ctx.catTies)}. ${ctx.catLosses === ctx.dynasty?.puntedWeeks ? 'Every loss is the punt cat.' : 'The punt is paying off.'}`,
  ],
  bodies: [
    // Punt-anchored
    (ctx) => ctx.dynasty?.puntedCat && ctx.dynasty?.puntedWeeks ? `${ctx.team.name} has punted ${ctx.dynasty.puntedCat} for ${plural(ctx.dynasty.puntedWeeks, 'straight week')}. They take the L in that column and win the others.` : null,
    (ctx) => ctx.dynasty?.puntedCat && ctx.dynasty?.puntedSeasons && ctx.dynasty.puntedSeasons >= 3 ? `${ctx.dynasty.puntedSeasons} seasons running the same punt. ${ctx.team.name} is the proof that the strategy travels.` : null,

    // Cat-fingerprint contrast
    (ctx) => ctx.topCats.length >= 2 && ctx.dynasty?.puntedCat ? `${ctx.team.name}: ${ctx.topCats[0]} and ${ctx.topCats[1]} owned. ${ctx.dynasty.puntedCat} ignored. The math holds.` : null,
    (ctx) => ctx.topCats.length >= 3 ? `${ctx.team.name} owns ${ctx.topCats[0]}, ${ctx.topCats[1]}, and ${ctx.topCats[2]}. Punting one cat freed the roster for three.` : null,

    // Time-anchored
    (ctx) => ctx.dynasty?.puntedWeeks && ctx.dynasty.puntedWeeks >= 8 ? `${ctx.dynasty.puntedWeeks} weeks deep into the punt. ${ctx.team.name} is still inside the top half.` : null,
    (ctx) => ctx.dynasty?.puntedSeasons && ctx.dynasty.puntedSeasons >= 4 ? `Five-plus seasons of the same punt. The strategy outlasts the roster.` : null,

    // Record-anchored
    (ctx) => `${ctx.team.name}: ${fmtRecord(ctx.catWins, ctx.catLosses, ctx.catTies)}. ${ctx.catLosses > 0 ? 'Most of the losses are the punted column.' : 'The punt does not show up in the win column.'}`,
    (ctx) => `${ctx.team.name} is ${(ctx.winPct * 100).toFixed(0)}% across the categories they actually play.`,

    // Strategy commentary
    (ctx) => ctx.dynasty?.puntedCat ? `${ctx.team.name} drafts without ${ctx.dynasty.puntedCat} in mind. The other ${plural(Math.max(1, ctx.totalCategories - 1), 'category', 'categories')} get the attention.` : null,
    (ctx) => `${ctx.team.name}: commitment to the punt is the strategy. Half-punting is the losing move.`,

    // Magnitude
    (ctx) => ctx.magnitude === 'historic' ? `Longest sustained punt strategy in league history. ${ctx.team.name} keeps making it work.` : null,
    (ctx) => ctx.magnitude === 'huge' ? `${ctx.team.name}: nobody in the league ignores a column as hard. Nobody wins the other ones as well.` : null,

    // Closer
    (ctx) => `${ctx.team.name}: the punt is not a quirk. It is the system.`,
    (ctx) => `${ctx.team.name} keeps proving that one column can sit out and the team still finishes top half.`,
    (ctx) => ctx.dynasty?.puntedCat ? `${ctx.team.name} will not be drafting ${ctx.dynasty.puntedCat} next year either.` : null,
  ],
}

/* ─────────────────────────────────────────────────────────────────
   KIND: sub-headline (3-fragment under-title rhythm)
   Stage-aware. Football demo pattern:
     "Eight weeks in. Here's the ladder. Who's climbing, who's bleeding."
───────────────────────────────────────────────────────────────── */

const SUB_HEADLINE: PRTemplate = {
  kind: 'sub-headline',
  eyebrows: [
    () => '',  // sub-headline has no eyebrow, but the slot exists for shape parity
  ],
  headlines: [
    // Early-season variants
    (ctx) => ctx.subHeadline?.stage === 'early' ? `${plural(ctx.currentWeek, 'week')} in. Early sample. The ladder is already shifting.` : null,
    (ctx) => ctx.subHeadline?.stage === 'early' ? `${plural(ctx.currentWeek, 'week')} down. The board is loud already. Who is real, who is hot.` : null,
    (ctx) => ctx.subHeadline?.stage === 'early' ? `Opening month. Here is the ladder. Cautious reads.` : null,

    // Mid-season variants
    (ctx) => ctx.subHeadline?.stage === 'mid' ? `${plural(ctx.currentWeek, 'week')} in. Here is the ladder. Who is climbing, who is bleeding.` : null,
    (ctx) => ctx.subHeadline?.stage === 'mid' ? `${plural(ctx.currentWeek, 'week')} in. The shape of the season is forming. The top is changing.` : null,
    (ctx) => ctx.subHeadline?.stage === 'mid' ? `Halfway. The board is no longer guessing. Who keeps it, who blinks.` : null,

    // Late-season variants
    (ctx) => ctx.subHeadline?.stage === 'late' ? `${plural(ctx.currentWeek, 'week')} down. Playoff math is real. Who climbs, who bleeds, who is about to swap.` : null,
    (ctx) => ctx.subHeadline?.stage === 'late' ? `Late. The seeds are firming up. Three teams climbing, two falling, one surprise.` : null,
    (ctx) => ctx.subHeadline?.stage === 'late' ? `${plural(ctx.currentWeek, 'week')} in. The bubble teams know who they are.` : null,

    // Final-stretch variants
    (ctx) => ctx.subHeadline?.stage === 'final-stretch' ? `${plural(ctx.weeksUntilPlayoffs, 'week')} to playoffs. The ladder is the seeding. Every spot matters.` : null,
    (ctx) => ctx.subHeadline?.stage === 'final-stretch' ? `Final stretch. Top seeds locked, bubble open. Who plays in.` : null,
    (ctx) => ctx.subHeadline?.stage === 'final-stretch' ? `${plural(ctx.weeksUntilPlayoffs, 'week')} left. Seeding is the story.` : null,

    // Playoffs variants (regular season is over)
    (ctx) => ctx.subHeadline?.stage === 'playoffs' ? `The regular season is in the books. This is the final ladder.` : null,
    (ctx) => ctx.subHeadline?.stage === 'playoffs' ? `Playoff time. Seeds are set; now it is win or wait till next year.` : null,
    (ctx) => ctx.subHeadline?.stage === 'playoffs' ? `Bracket season. The board says who earned the right to be here.` : null,

    // Stat-anchored (when subHeadline has counts)
    (ctx) => ctx.subHeadline?.climberCount && ctx.subHeadline?.bleedingCount ? `${plural(ctx.currentWeek, 'week')} in. ${ctx.subHeadline.climberCount} climbing, ${ctx.subHeadline.bleedingCount} bleeding.` : null,
    (ctx) => ctx.subHeadline?.bubbleCount ? `${plural(ctx.subHeadline.bubbleCount, 'team')} on the bubble. The seeds are not safe.` : null,

    // Generic fallback — only fires when stage isn't detected. With
    // a real season stage in hand (early/mid/late/final-stretch/
    // playoffs), the variants above carry editorial color the
    // fallback lacks. Gating these on stage absence prevents the
    // random-picker from rolling the generic "Where the ladder
    // stands" variant when a more colorful mid-season line is
    // available.
    (ctx) => !ctx.subHeadline?.stage ? `${plural(ctx.currentWeek, 'week')} in. Here is the ladder.` : null,
    (ctx) => !ctx.subHeadline?.stage ? `${plural(ctx.currentWeek, 'week')} down. Who is climbing. Who is falling.` : null,
    (ctx) => !ctx.subHeadline?.stage ? `Where the ladder stands at week ${ctx.currentWeek}.` : null,
  ],
  bodies: [], // sub-headline only renders a headline
}

/* ─────────────────────────────────────────────────────────────────
   KIND: quick-read (footer pill labels)
   Ultra-compressed. Four pills per page, one per kind.
───────────────────────────────────────────────────────────────── */

const QUICK_READ: PRTemplate = {
  kind: 'quick-read',
  eyebrows: [
    (ctx) => {
      switch (ctx.quickRead?.kind) {
        case 'tightest-race': return 'TIGHTEST RACE'
        case 'biggest-jump': return 'BIGGEST JUMP'
        case 'longest-fall': return 'LONGEST FALL'
        case 'longest-streak': return 'LONGEST STREAK'
        default: return 'QUICK READ'
      }
    },
  ],
  headlines: [
    // Tightest-race variants. The race is thin by definition — copy
    // should match that. "over" implies decisive dominance and is wrong
    // for a 1-cat seam; "edges" / "by N" / "neck and neck" keep the tone
    // accurate.
    // gap === 1: only "edges by a cat" fires for tight races. The
    // generic variants below ("too close to call", "one game apart",
    // "neck and neck") are gated against gap=1 so this specific
    // framing wins every time. Two leagues both at gap=1 will read
    // the same.
    (ctx) => ctx.quickRead?.kind === 'tightest-race' && ctx.quickRead.teamA && ctx.quickRead.teamB && ctx.quickRead.statValue === 1 ? `${ctx.quickRead.teamA.name} edges ${ctx.quickRead.teamB.name} by a cat.` : null,
    // gap >= 2: "by N over" carries the specific margin.
    (ctx) => ctx.quickRead?.kind === 'tightest-race' && ctx.quickRead.teamA && ctx.quickRead.teamB && ctx.quickRead.statValue && ctx.quickRead.statValue >= 2 ? `${ctx.quickRead.teamA.name} by ${ctx.quickRead.statValue} over ${ctx.quickRead.teamB.name}.` : null,
    // Generic framings — gated against gap=1 so the specific "edges
    // by a cat" variant above wins consistently for that gap.
    (ctx) => ctx.quickRead?.kind === 'tightest-race' && ctx.quickRead.teamA && ctx.quickRead.teamB && ctx.quickRead.statValue !== 1 ? `${ctx.quickRead.teamA.name} vs ${ctx.quickRead.teamB.name}: too close to call.` : null,
    (ctx) => ctx.quickRead?.kind === 'tightest-race' && ctx.quickRead.teamA && ctx.quickRead.teamB && ctx.quickRead.statValue !== 1 ? `${ctx.quickRead.teamA.name} and ${ctx.quickRead.teamB.name}: one game apart.` : null,
    // Non-breaking spaces in "neck and neck" prevent the
    // four-word idiom from breaking mid-phrase across two lines on
    // narrow quick-read cards (saw "neck" / "and neck" split in Yahoo).
    (ctx) => ctx.quickRead?.kind === 'tightest-race' && ctx.quickRead.teamA && ctx.quickRead.teamB && ctx.quickRead.statValue !== 1 ? `${ctx.quickRead.teamA.name} and ${ctx.quickRead.teamB.name}: neck and neck.` : null,

    // Biggest-jump — locked to a single declarative variant so every
    // league reads identically. The "climbed N spots" form carries
    // the strongest active verb; the secondary "up N spots" variant
    // was dropped because the deterministic picker would land
    // different leagues on different phrasings — which the eye
    // reads as inconsistency, not editorial variety.
    (ctx) => ctx.quickRead?.kind === 'biggest-jump' && ctx.quickRead.teamA && ctx.quickRead.statValue ? `${ctx.quickRead.teamA.name} climbed ${ctx.quickRead.statValue} spots since week 1.` : null,
    (ctx) => ctx.quickRead?.kind === 'biggest-jump' && ctx.quickRead.teamA && !ctx.quickRead.statValue ? `${ctx.quickRead.teamA.name}: biggest climb of the season.` : null,

    // Longest-fall — symmetric. Single locked declarative variant.
    (ctx) => ctx.quickRead?.kind === 'longest-fall' && ctx.quickRead.teamA && ctx.quickRead.statValue ? `${ctx.quickRead.teamA.name} dropped ${ctx.quickRead.statValue} spots since week 1.` : null,
    (ctx) => ctx.quickRead?.kind === 'longest-fall' && ctx.quickRead.teamA && !ctx.quickRead.statValue ? `${ctx.quickRead.teamA.name}: longest sustained drop.` : null,

    // Longest-streak — locked to a single declarative variant so every
    // league reads with the same voice register as BIGGEST JUMP /
    // LONGEST FALL ("{Team}: N straight wins."). The earlier statLabel
    // variants ("on W6") produced cross-league voice mismatch.
    (ctx) => ctx.quickRead?.kind === 'longest-streak' && ctx.quickRead.teamA && ctx.quickRead.statValue ? `${ctx.quickRead.teamA.name}: ${ctx.quickRead.statValue} straight wins.` : null,
    (ctx) => ctx.quickRead?.kind === 'longest-streak' && ctx.quickRead.teamA && !ctx.quickRead.statValue ? `${ctx.quickRead.teamA.name}: longest active run.` : null,

    // Generic compressed (always-applicable). Tightest-race,
    // longest-streak, biggest-jump, and longest-fall are excluded —
    // each has meaning-bearing structure (two teams / streak count /
    // numeric spots delta) these fallbacks would strip. Without the
    // gate, a random pick produces "NC PALE HOSE: 4." (number with no
    // unit) or "NC PALE HOSE · +7 spots" (label-style fragment) that
    // reads as inconsistent next to peer pills. Cat-anchored variants
    // (the only category-bound quick read) are still allowed.
    (ctx) => ctx.quickRead?.kind !== 'tightest-race' && ctx.quickRead?.kind !== 'longest-streak' && ctx.quickRead?.kind !== 'biggest-jump' && ctx.quickRead?.kind !== 'longest-fall' && ctx.quickRead?.teamA && ctx.quickRead?.statLabel ? `${ctx.quickRead.teamA.name} · ${ctx.quickRead.statLabel}` : null,
    (ctx) => ctx.quickRead?.kind !== 'tightest-race' && ctx.quickRead?.kind !== 'longest-streak' && ctx.quickRead?.kind !== 'biggest-jump' && ctx.quickRead?.kind !== 'longest-fall' && ctx.quickRead?.teamA ? `${ctx.quickRead.teamA.name}.` : null,

    // Cat-anchored compressed
    (ctx) => ctx.quickRead?.catId && ctx.quickRead?.teamA && ctx.quickRead?.statValue ? `${ctx.quickRead.catId} · ${ctx.quickRead.teamA.name} · ${ctx.quickRead.statValue}` : null,
    (ctx) => ctx.quickRead?.catId && ctx.quickRead?.teamA ? `${ctx.quickRead.catId} · ${ctx.quickRead.teamA.name}` : null,

    // Numbered fragment style — same exclusions as generic compressed.
    (ctx) => ctx.quickRead?.kind !== 'tightest-race' && ctx.quickRead?.kind !== 'longest-streak' && ctx.quickRead?.kind !== 'biggest-jump' && ctx.quickRead?.kind !== 'longest-fall' && ctx.quickRead?.statValue && ctx.quickRead?.teamA ? `${ctx.quickRead.teamA.name}: ${ctx.quickRead.statValue}.` : null,
    // Bare "X over Y" fallback — gated against tightest-race so a
    // close adjacent seam never reads as "TeamA over TeamB" stripped
    // of its gap. Longest-streak already excluded above.
    (ctx) => ctx.quickRead?.kind !== 'longest-streak' && ctx.quickRead?.kind !== 'tightest-race' && ctx.quickRead?.teamA && ctx.quickRead?.teamB ? `${ctx.quickRead.teamA.name} over ${ctx.quickRead.teamB.name}` : null,
  ],
  bodies: [], // quick-read is pill-shaped: no body
}

/* ─────────────────────────────────────────────────────────────────
   PUBLIC API
───────────────────────────────────────────────────────────────── */

export const prTemplates: Record<PRKind, PRTemplate> = {
  'hero-new-throne': HERO_NEW_THRONE,
  'hero-dynasty-rising': HERO_DYNASTY_RISING,
  'hero-biggest-climber': HERO_BIGGEST_CLIMBER,
  'hero-defending-champ-falling': HERO_DEFENDING_CHAMP_FALLING,
  'hero-bubble-surprise': HERO_BUBBLE_SURPRISE,
  'hero-the-race': HERO_THE_RACE,
  'hero-your-team': HERO_YOUR_TEAM,
  'pulse-heater': PULSE_HEATER,
  'pulse-long-fall': PULSE_LONG_FALL,
  'pulse-steady-hand': PULSE_STEADY_HAND,
  'dynasty-hitting-king': DYNASTY_HITTING_KING,
  'dynasty-pitching-king': DYNASTY_PITCHING_KING,
  'dynasty-punt-kings': DYNASTY_PUNT_KINGS,
  'sub-headline': SUB_HEADLINE,
  'quick-read': QUICK_READ,
}

/**
 * Render a power-ranking editorial moment.
 *
 * HERO kinds return eyebrow, headline, body, 3 chips, and a kicker line.
 * PULSE and DYNASTY kinds return eyebrow, headline, body (no chips).
 * SUB-HEADLINE and QUICK-READ return headline only (eyebrow is empty
 * for sub-headline, label-style for quick-read).
 *
 * Variants are filtered by self-veto (`null` return) before random
 * selection. If nothing survives the filter, falls back to a safe
 * generic string so the UI never renders empty.
 */
export function renderPR(kind: PRKind, ctx: PRContext): {
  eyebrow: string
  headline: string
  body: string
  chips?: [string, string, string]
  kicker?: string
} {
  const template = prTemplates[kind]
  const eyebrow = renderOne(template.eyebrows, ctx) ?? ''
  const headline = renderOne(template.headlines, ctx) ?? `${ctx.team.name} held the line.`
  const body = template.bodies.length > 0
    ? (renderOne(template.bodies, ctx) ?? `${ctx.team.name}: ${fmtRecord(ctx.catWins, ctx.catLosses, ctx.catTies)}.`)
    : ''

  const result: {
    eyebrow: string
    headline: string
    body: string
    chips?: [string, string, string]
    kicker?: string
  } = { eyebrow, headline, body }

  if (template.chips) {
    result.chips = [
      renderOne(template.chips[0], ctx) ?? `#${ctx.currentRank}`,
      renderOne(template.chips[1], ctx) ?? 'TRENDING',
      renderOne(template.chips[2], ctx) ?? fmtRecord(ctx.catWins, ctx.catLosses, ctx.catTies),
    ]
  }
  if (template.kickers) {
    const kicker = renderOne(template.kickers, ctx)
    if (kicker) result.kicker = kicker
  }

  return result
}

function renderOne(variants: VariantFn[], ctx: PRContext): string | undefined {
  const rendered = variants
    .map((fn) => fn(ctx))
    .filter((s): s is string => typeof s === 'string' && s.length > 0)
  if (rendered.length === 0) return undefined
  return rendered[Math.floor(Math.random() * rendered.length)]
}

/**
 * Recently-used tracker — pass to renderPR's options to avoid
 * repeating the same template back-to-back for the same team/page.
 * (Not implemented yet — the renderer is stateless. Future work:
 * track recent picks per (kind, teamName) tuple and bias away.)
 */
