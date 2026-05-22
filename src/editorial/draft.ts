/**
 * Draft Page — Editorial Variant Library
 *
 * Variant pool that powers the post-draft editorial moments on the
 * Draft page: the BEST DRAFT hero, STEAL / BUST cards, per-team grade
 * narratives, punt-strategy beats, category-king callouts, by-the-round
 * summaries, and footer quick-read pills.
 *
 * This is a LOWER-frequency library than swings.ts — most beats fire
 * once per season after the draft completes, plus a handful that
 * surface during the season as retrospective context. Density still
 * matters because every team gets a grade narrative and the variant
 * pool needs to cover 12 grade tiers without repeating.
 *
 * Templates are functional — each receives a DraftContext and returns
 * a string (or null to self-veto when the variant doesn't fit).
 *
 * Voice rules: see EDITORIAL.md at the repo root. Re-read before
 * adding variants. Active voice, specific numbers, no em dashes,
 * no emojis, last-names-only.
 *
 * Variant count targets per kind:
 *   eyebrows: 6-8 per kind
 *   headlines: 15-25 per kind
 *   bodies / narratives: 15-22 per kind
 *   team-grade-narrative: 8-12 per grade letter (A+ through F)
 *
 * Total target: ~600-800 variants.
 */

/* ─────────────────────────────────────────────────────────────────
   TYPES
───────────────────────────────────────────────────────────────── */

export type DraftKind =
  | 'best-draft-hero'              // the team that drafted best
  | 'steal-of-draft'               // the most-positive-value pick
  | 'bust-of-draft'                // the most-negative-value pick
  | 'team-grade-narrative'         // per-team draft autopsy
  | 'punt-success'                 // team punted and won other cats
  | 'punt-failure'                 // team punted and lost everything
  | 'punt-balanced'                // team did not punt anything
  | 'category-king-five-tool'      // player delivering across many cats
  | 'category-king-late-round-gem' // late-round breakout king of a cat
  | 'category-king-broken-cat'     // first-round bust who broke a cat
  | 'by-the-round-summary'         // per-round hits/misses narrative
  | 'quick-read'                   // footer pill labels

export type GradeLetter =
  | 'A+' | 'A' | 'A-'
  | 'B+' | 'B' | 'B-'
  | 'C+' | 'C' | 'C-'
  | 'D+' | 'D'
  | 'F'

export type CatId =
  | 'R' | 'H' | 'HR' | 'RBI' | 'SB' | 'AVG'
  | 'W' | 'SV' | 'K' | 'HLD' | 'ERA' | 'WHIP'

export type Position = 'C' | '1B' | '2B' | '3B' | 'SS' | 'OF' | 'DH' | 'SP' | 'RP'

export type QuickReadKind =
  | 'highest-value-pick'
  | 'biggest-bust'
  | 'best-late-round'
  | 'most-categories-delivered'

export interface DraftContext {
  /* ───── Player identity (when the beat is about a single player) ───── */
  playerFirstName?: string
  playerLastName?: string
  playerFullName?: string
  position?: Position
  mlbTeam?: string         // 3-letter abbrev

  /* ───── Pick context ───── */
  draftPick?: number       // overall pick number, e.g. 23
  draftRound?: number      // round number, e.g. 2
  valueScore?: number      // signed value vs ADP, e.g. +60 / -110
  valueLabel?: string      // pre-formatted "+60" / "-110"
  playerTier?: 'elite-ADP' | 'mid-ADP' | 'late-round' | 'waiver-wire'

  /* ───── Team identity (the team being graded / discussed) ───── */
  teamName: string
  teamOwner: string
  teamMascot?: string
  gradeLetter?: GradeLetter
  gradeRank?: number        // 1-10, where 1 = best draft in the league

  /* ───── Draft summary ───── */
  stealsCount?: number      // picks with value >= +30
  hitsCount?: number        // picks that hit ADP
  missesCount?: number      // picks with value <= -20
  bustsCount?: number       // picks with value <= -50
  earlyHitRatePct?: number  // % of R1-R5 picks that hit

  /* ───── Per-team profile ───── */
  categoriesStrong?: CatId[]     // categories the team drafted strong in
  categoriesPunted?: CatId[]     // categories the team intentionally punted
  notablePicks?: string[]        // last names of notable picks
  surprisePicks?: string[]       // reach/surprise picks

  /* ───── Punt context (for punt-* kinds) ───── */
  puntedCat?: CatId              // the punted category
  puntedCatRank?: number         // current rank in that cat (1-10, 10 = last)
  alternateCatsWon?: number      // # of other cats the team is winning
  alternateCatsLost?: number     // # of other cats the team is losing

  /* ───── Category-king context ───── */
  categoryKingCat?: CatId        // which cat this player is king of
  categoryKingCatsCovered?: number  // for five-tool, how many cats covered
  brokenCatPlayerName?: string   // last name of the bust who broke a cat
  brokenCat?: CatId              // the cat that got broken

  /* ───── Round context (for by-the-round-summary) ───── */
  roundNumber?: number           // which round, 1-25
  roundHitCount?: number         // # of hits in that round
  roundMissCount?: number        // # of misses in that round
  roundAvgValue?: number         // average value score for that round
  roundTopPlayerLastName?: string  // best pick of that round
  roundBustPlayerLastName?: string // worst pick of that round
  roundDominantPosition?: Position // most-drafted position in the round

  /* ───── Quick-read pill ───── */
  quickReadKind?: QuickReadKind
}

/* A single variant function. Returns null/undefined if the variant
   isn't applicable to this context (template's optional self-veto). */
export type VariantFn = (ctx: DraftContext) => string | null | undefined

export interface DraftTemplate {
  kind: DraftKind
  eyebrows: VariantFn[]
  headlines: VariantFn[]
  bodies: VariantFn[]
}

/* ─────────────────────────────────────────────────────────────────
   SYNONYM DICTIONARIES (string pools used inside templates)
───────────────────────────────────────────────────────────────── */

const SYN = {
  DRAFTED_WELL: [
    'drafted clean',
    'drafted with intent',
    'drafted for balance',
    'drafted the board',
    'built the roster right',
    'nailed the board',
    'read the room',
    'worked the value',
  ],
  DRAFTED_POORLY: [
    'left value on the board',
    'reached',
    'chased names',
    'lost the room',
    'misread the tier',
    'paid up at the wrong slots',
    'drafted by feel',
    'forgot the late rounds existed',
  ],
  STEAL_VERBS: [
    'stole',
    'pocketed',
    'walked off with',
    'cashed',
    'lifted',
    'picked the lock on',
    'lifted off the wire of the draft room',
  ],
  BUST_VERBS: [
    'burned',
    'whiffed on',
    'sank',
    'paid up for',
    'reached on',
    'ate the cost of',
    'mortgaged the round for',
  ],
  GREAT_GRADE_WORDS: [
    'masterclass',
    'clinic',
    'blueprint',
    'showcase',
    'showpiece',
    'the gold standard',
    'a draft to teach from',
  ],
  POOR_GRADE_WORDS: [
    'rough',
    'a clinic in misreads',
    'a tough sit',
    'one to forget',
    'a mess',
    'the kind of board the league rewinds for',
  ],
  PUNT_VERBS: [
    'punted',
    'zeroed out',
    'ignored',
    'left blank',
    'crossed off',
    'walked away from',
  ],
  WON_THE: [
    'won the',
    'took the',
    'ran the',
    'locked the',
    'cleaned up in',
    'closed out the',
  ],
  LOST_THE: [
    'lost the',
    'bled the',
    'gave up the',
    'punted the',
    'ceded the',
  ],
  DELIVERED: [
    'delivered',
    'cashed',
    'paid out',
    'showed up',
    'held up the end',
    'came through',
  ],
  COLLAPSED: [
    'collapsed',
    'cratered',
    'vanished',
    'broke down',
    'fizzled',
    'never showed up',
  ],
  EARNED: [
    'earned it',
    'banked it',
    'pocketed it',
    'walked away with it',
    'has the receipts',
  ],
  ROUND_HIT: [
    'a hit',
    'a strong round',
    'a clean round',
    'where the draft was won',
    'the round that built the roster',
  ],
  ROUND_MISS: [
    'a graveyard',
    'where the draft was lost',
    'a wash',
    'the round that hurts',
    'a row of misses',
  ],
}

/* Pick a random variant from a synonym pool. */
function pick<T>(pool: readonly T[]): T {
  return pool[Math.floor(Math.random() * pool.length)]
}

/* Pluralize helper */
const plural = (n: number, one: string, many: string = one + 's') =>
  `${n} ${n === 1 ? one : many}`

/* Pretty-format a value score with sign */
function fmtValue(v: number | undefined): string {
  if (v === undefined) return ''
  return v >= 0 ? `+${v}` : `${v}`
}

/* Grade buckets used by many templates */
function isTopGrade(g: GradeLetter | undefined): boolean {
  return g === 'A+' || g === 'A' || g === 'A-'
}
function isMidGrade(g: GradeLetter | undefined): boolean {
  return g === 'B+' || g === 'B' || g === 'B-' || g === 'C+'
}
function isBottomGrade(g: GradeLetter | undefined): boolean {
  return g === 'C-' || g === 'D+' || g === 'D' || g === 'F'
}

/* ─────────────────────────────────────────────────────────────────
   KIND: BEST-DRAFT-HERO
   The team that drafted best. Confident, retrospective-vindicated.
───────────────────────────────────────────────────────────────── */

const BEST_DRAFT_HERO: DraftTemplate = {
  kind: 'best-draft-hero',
  eyebrows: [
    () => 'BEST DRAFT OF THE YEAR',
    () => 'THE BOARD WAS THEIRS',
    () => 'CLINIC',
    () => 'NUMBER-ONE GRADE',
    () => 'DRAFT-DAY WINNER',
    () => 'BLUEPRINT',
    () => 'THE A+ DRAFT',
    (ctx) => (ctx.stealsCount ?? 0) >= 4 ? 'STEAL FACTORY' : 'BEST DRAFT OF THE YEAR',
  ],
  headlines: [
    (ctx) => `${ctx.teamName} ${pick(SYN.DRAFTED_WELL)}.`,
    (ctx) => `${ctx.teamName} drafted for balance. They got dominance.`,
    (ctx) => `${ctx.teamName}: the cleanest board in the league.`,
    (ctx) => `${ctx.teamName} ran the draft.`,
    (ctx) => `${ctx.teamName}. ${pick(SYN.GREAT_GRADE_WORDS).replace(/^./, (c) => c.toUpperCase())}.`,
    (ctx) => `${ctx.teamName} drafted like the host.`,
    (ctx) => `${ctx.teamName} pocketed value at every turn.`,
    (ctx) => ctx.stealsCount ? `${plural(ctx.stealsCount, 'steal')}. Zero reaches. ${ctx.teamName}.` : null,
    (ctx) => ctx.earlyHitRatePct !== undefined && ctx.earlyHitRatePct >= 80 ? `${ctx.earlyHitRatePct}% hit rate in the first five rounds. ${ctx.teamName}.` : null,
    (ctx) => ctx.gradeLetter === 'A+' ? `${ctx.teamName}: A+. Nobody else got close.` : null,
    (ctx) => `Top grade in the league. ${ctx.teamName} ${pick(SYN.EARNED)}.`,
    (ctx) => `${ctx.teamName}: a draft to teach from.`,
    (ctx) => ctx.notablePicks && ctx.notablePicks.length >= 2 ? `${ctx.notablePicks[0]}, ${ctx.notablePicks[1]}, and they were still picking. ${ctx.teamName}.` : null,
    (ctx) => `${ctx.teamName} drafted depth. They got stars.`,
    (ctx) => `${ctx.teamName} read every tier.`,
    (ctx) => ctx.stealsCount && ctx.stealsCount >= 3 ? `${ctx.teamName} got ${plural(ctx.stealsCount, 'steal')}. The league got the bill.` : null,
    (ctx) => `${ctx.teamName} walked out with the roster the league wanted.`,
    (ctx) => `${ctx.teamName}. Best draft in the room.`,
    (ctx) => ctx.bustsCount === 0 ? `Zero busts. ${ctx.teamName} did not miss.` : null,
    (ctx) => `${ctx.teamName} drafted the way the analysts said to draft.`,
    (ctx) => `${ctx.teamName}: the board fell, they cashed.`,
    (ctx) => `${ctx.teamName} ${pick(SYN.WON_THE)} draft.`,
  ],
  bodies: [
    (ctx) => ctx.stealsCount !== undefined && ctx.hitsCount !== undefined ? `${plural(ctx.stealsCount, 'steal')}, ${plural(ctx.hitsCount, 'hit')}, and a roster the league cannot match. ${ctx.teamName} owns the post-draft conversation.` : null,
    (ctx) => `${ctx.teamName} did not reach. They did not panic. They worked the board for fifteen rounds and walked out with the best roster.`,
    (ctx) => ctx.earlyHitRatePct !== undefined ? `${ctx.earlyHitRatePct}% hit rate in rounds one through five. The foundation is set.` : null,
    (ctx) => ctx.notablePicks && ctx.notablePicks.length >= 3 ? `${ctx.notablePicks.slice(0, 3).join(', ')}. Three picks, three locks. The rest of the board followed.` : null,
    (ctx) => ctx.gradeLetter === 'A+' ? `A+ grade. The only one in the league. ${ctx.teamName} drafted with intent and the intent paid out.` : null,
    (ctx) => `${ctx.teamName} stacked categories in the middle rounds. Closed the gaps in the late rounds. The roster has no holes.`,
    (ctx) => ctx.categoriesStrong && ctx.categoriesStrong.length >= 3 ? `Strong in ${ctx.categoriesStrong.slice(0, 3).join(', ')}. The cats are built in.` : null,
    (ctx) => `Every pick had a reason. Every reason held up. ${ctx.teamName} graded out at the top.`,
    (ctx) => ctx.bustsCount === 0 ? `Zero busts on the board. The owner who studies tape just got rewarded.` : null,
    (ctx) => `The league spent fifteen rounds reaching for upside. ${ctx.teamName} took the value every time.`,
    (ctx) => ctx.stealsCount && ctx.stealsCount >= 4 ? `${plural(ctx.stealsCount, 'pick')} graded as steals. Four-plus is a clinic.` : null,
    (ctx) => `${ctx.teamName} built the roster the analysts will use as the model board.`,
    (ctx) => ctx.notablePicks && ctx.notablePicks.length >= 2 ? `${ctx.notablePicks[0]} in the early rounds. ${ctx.notablePicks[1]} in the middle. The depth is uncatchable.` : null,
    (ctx) => `The board fell, ${ctx.teamName} pocketed it.`,
    (ctx) => `Best draft in the league. The numbers say it. The roster says it louder.`,
    (ctx) => ctx.categoriesPunted && ctx.categoriesPunted.length === 0 ? `Did not punt a single cat. Built for every column.` : null,
    (ctx) => `${ctx.teamName} drafted balance and got dominance. That is the trade every owner wants.`,
    (ctx) => `Top grade in the league. ${ctx.teamName} ${pick(SYN.EARNED)} on every pick.`,
  ],
}

/* ─────────────────────────────────────────────────────────────────
   KIND: STEAL-OF-DRAFT
   The +60 value pick. Incredulous-but-earned.
───────────────────────────────────────────────────────────────── */

const STEAL_OF_DRAFT: DraftTemplate = {
  kind: 'steal-of-draft',
  eyebrows: [
    () => 'STEAL OF THE DRAFT',
    () => 'THE LATE-ROUND LOCK',
    () => 'PURE VALUE',
    () => 'THE PICK THE LEAGUE MISSED',
    () => 'FREE MONEY',
    () => 'BARGAIN BIN',
    () => 'WIRE-LEVEL VALUE',
    (ctx) => (ctx.valueScore ?? 0) >= 80 ? 'THE BIGGEST STEAL OF THE YEAR' : 'STEAL OF THE DRAFT',
  ],
  headlines: [
    (ctx) => ctx.playerLastName && ctx.draftRound ? `${ctx.playerLastName} at R${ctx.draftRound}.` : null,
    (ctx) => ctx.playerLastName && ctx.valueLabel ? `${ctx.playerLastName}: ${ctx.valueLabel} value.` : null,
    (ctx) => ctx.playerLastName ? `${ctx.teamName} ${pick(SYN.STEAL_VERBS)} ${ctx.playerLastName}.` : null,
    (ctx) => ctx.playerLastName && ctx.draftPick ? `Pick ${ctx.draftPick}: ${ctx.playerLastName}. Highway robbery.` : null,
    (ctx) => ctx.playerLastName && ctx.draftRound ? `${ctx.playerLastName} fell to R${ctx.draftRound}. ${ctx.teamName} cashed.` : null,
    (ctx) => ctx.playerLastName ? `${ctx.teamName} got ${ctx.playerLastName} for free.` : null,
    (ctx) => ctx.playerLastName && ctx.valueScore !== undefined ? `${ctx.playerLastName}: ${fmtValue(ctx.valueScore)} vs ADP. Steal of the year.` : null,
    (ctx) => ctx.playerLastName ? `${ctx.playerLastName} should not have lasted that long.` : null,
    (ctx) => ctx.playerLastName ? `${ctx.teamName} pocketed ${ctx.playerLastName}.` : null,
    (ctx) => ctx.playerLastName && ctx.draftRound ? `R${ctx.draftRound}, ${ctx.playerLastName}. The league blinked.` : null,
    (ctx) => ctx.playerLastName && ctx.categoryKingCat ? `${ctx.playerLastName} finished as the league's top ${ctx.categoryKingCat} bat.` : null,
    (ctx) => ctx.playerLastName ? `${ctx.playerLastName}: late-round, top-tier result.` : null,
    (ctx) => ctx.playerLastName && ctx.position && ctx.draftRound ? `${ctx.playerLastName} (${ctx.position}) in R${ctx.draftRound}. Finished top-ten at the position.` : null,
    (ctx) => ctx.playerLastName ? `${ctx.playerLastName}: the pick the league talked themselves out of.` : null,
    (ctx) => ctx.playerLastName ? `${ctx.teamName} ${pick(SYN.STEAL_VERBS)} ${ctx.playerLastName}. The grade goes up because of him.` : null,
    (ctx) => ctx.playerLastName ? `${ctx.playerLastName}. Best value on the board.` : null,
    (ctx) => ctx.valueScore && ctx.valueScore >= 80 ? `${ctx.valueLabel ?? fmtValue(ctx.valueScore)} value. The biggest steal of the year.` : null,
    (ctx) => ctx.playerLastName ? `${ctx.teamName} drafted ${ctx.playerLastName} and the league nodded.` : null,
  ],
  bodies: [
    (ctx) => ctx.playerLastName && ctx.draftRound && ctx.categoryKingCat ? `${ctx.playerLastName} at R${ctx.draftRound}. Finished as the league's top ${ctx.categoryKingCat} contributor. ${ctx.teamName} grades out higher because of one pick.` : null,
    (ctx) => ctx.playerLastName && ctx.valueLabel ? `${ctx.valueLabel} vs ADP. ${ctx.playerLastName} is the reason ${ctx.teamName} graded where they did.` : null,
    (ctx) => ctx.playerLastName && ctx.draftPick ? `Pick ${ctx.draftPick} of the draft. ${ctx.playerLastName}. The other nine owners passed.` : null,
    (ctx) => ctx.playerLastName && ctx.draftRound ? `Fell to R${ctx.draftRound}. ${ctx.teamName} did not blink. The pick built the season.` : null,
    (ctx) => ctx.playerLastName && ctx.position ? `${ctx.playerLastName} graded as a top-ten ${ctx.position} on the year. He was drafted as a back-end pick.` : null,
    (ctx) => ctx.playerLastName ? `${ctx.teamName} got the pick the projections agreed on. The board did not.` : null,
    (ctx) => ctx.playerLastName ? `One pick can change a draft grade. ${ctx.playerLastName} did that for ${ctx.teamName}.` : null,
    (ctx) => ctx.playerLastName && ctx.draftRound && ctx.draftRound >= 15 ? `R${ctx.draftRound} pick. Production of a R4 bat. The math is not subtle.` : null,
    (ctx) => ctx.playerLastName ? `${ctx.playerLastName}: the kind of late-round lock that wins seasons.` : null,
    (ctx) => ctx.valueScore !== undefined && ctx.valueScore >= 60 ? `${fmtValue(ctx.valueScore)} value over ADP. The largest single-pick swing in the league.` : null,
    (ctx) => ctx.playerLastName ? `${ctx.teamName} did the homework. ${ctx.playerLastName} paid the homework back.` : null,
    (ctx) => ctx.playerLastName && ctx.categoryKingCat ? `${ctx.playerLastName} finished number-one in the league in ${ctx.categoryKingCat}. He was the eleventh pick at his position.` : null,
    (ctx) => ctx.playerLastName ? `The pick the analysts circled before the draft. The pick the room let slide. ${ctx.teamName} took it.` : null,
    (ctx) => ctx.playerLastName && ctx.draftRound ? `Drafted in R${ctx.draftRound}. Produced like a R3 bat. That is the definition of a steal.` : null,
    (ctx) => ctx.playerLastName ? `${ctx.teamName} ${pick(SYN.STEAL_VERBS)} ${ctx.playerLastName} and never looked back.` : null,
    (ctx) => ctx.playerLastName ? `${ctx.playerLastName}: the pick that made the grade. ${ctx.teamName} got the value the board printed.` : null,
  ],
}

/* ─────────────────────────────────────────────────────────────────
   KIND: BUST-OF-DRAFT
   The -110 value pick. Dry, factual disappointment.
───────────────────────────────────────────────────────────────── */

const BUST_OF_DRAFT: DraftTemplate = {
  kind: 'bust-of-draft',
  eyebrows: [
    () => 'BUST OF THE DRAFT',
    () => 'THE EARLY-ROUND MISS',
    () => 'THE PICK THAT HURT',
    () => 'DEAD WEIGHT',
    () => 'COST OF DOING BUSINESS',
    () => 'THE ONE THAT GOT AWAY',
    () => 'EARLY-ROUND CASUALTY',
    (ctx) => (ctx.valueScore ?? 0) <= -100 ? 'THE WORST PICK OF THE YEAR' : 'BUST OF THE DRAFT',
  ],
  headlines: [
    (ctx) => ctx.playerLastName && ctx.draftRound ? `${ctx.playerLastName} at R${ctx.draftRound}.` : null,
    (ctx) => ctx.playerLastName && ctx.valueLabel ? `${ctx.playerLastName}: ${ctx.valueLabel} value.` : null,
    (ctx) => ctx.playerLastName ? `${ctx.teamName} ${pick(SYN.BUST_VERBS)} ${ctx.playerLastName}.` : null,
    (ctx) => ctx.playerLastName && ctx.draftPick ? `Pick ${ctx.draftPick}: ${ctx.playerLastName}. Year-long slump.` : null,
    (ctx) => ctx.playerLastName ? `${ctx.playerLastName} never showed up.` : null,
    (ctx) => ctx.playerLastName ? `${ctx.teamName} drafted ${ctx.playerLastName} early. He vanished.` : null,
    (ctx) => ctx.playerLastName && ctx.draftRound ? `${ctx.playerLastName} in R${ctx.draftRound}. The grade dropped a tier.` : null,
    (ctx) => ctx.playerLastName ? `${ctx.playerLastName}: the pick that hurts the most.` : null,
    (ctx) => ctx.playerLastName ? `${ctx.teamName} mortgaged the round for ${ctx.playerLastName}.` : null,
    (ctx) => ctx.playerLastName && ctx.valueScore !== undefined ? `${ctx.playerLastName}: ${fmtValue(ctx.valueScore)} vs ADP. Biggest miss of the year.` : null,
    (ctx) => ctx.playerLastName ? `${ctx.playerLastName}. The kind of pick a grade never recovers from.` : null,
    (ctx) => ctx.playerLastName && ctx.draftRound && ctx.draftRound <= 3 ? `R${ctx.draftRound} pick. Bench production. ${ctx.teamName} ate the cost.` : null,
    (ctx) => ctx.playerLastName ? `${ctx.playerLastName}: drafted as a cornerstone. Played like a flier.` : null,
    (ctx) => ctx.playerLastName ? `${ctx.teamName} got nothing from ${ctx.playerLastName}.` : null,
    (ctx) => ctx.playerLastName ? `${ctx.playerLastName} was the biggest reach on the board.` : null,
    (ctx) => ctx.playerLastName && ctx.position ? `${ctx.playerLastName} (${ctx.position}) finished outside the top-fifty at the position.` : null,
    (ctx) => ctx.playerLastName ? `One pick can sink a draft grade. ${ctx.playerLastName} did that.` : null,
    (ctx) => ctx.playerLastName ? `${ctx.playerLastName}: drafted high, never delivered.` : null,
    (ctx) => ctx.playerLastName ? `${ctx.teamName} paid up. ${ctx.playerLastName} did not.` : null,
  ],
  bodies: [
    (ctx) => ctx.playerLastName && ctx.draftRound && ctx.position ? `${ctx.playerLastName} at R${ctx.draftRound}. Finished outside the top-fifty at ${ctx.position}. ${ctx.teamName} grades out lower because of one pick.` : null,
    (ctx) => ctx.playerLastName && ctx.valueLabel ? `${ctx.valueLabel} vs ADP. ${ctx.playerLastName} is the reason ${ctx.teamName} fell a grade tier.` : null,
    (ctx) => ctx.playerLastName && ctx.draftPick ? `Pick ${ctx.draftPick} of the draft. ${ctx.playerLastName}. Year-long slump from there.` : null,
    (ctx) => ctx.playerLastName ? `${ctx.teamName} took the chalk. The chalk did not pay.` : null,
    (ctx) => ctx.playerLastName ? `One pick can break a draft grade. ${ctx.playerLastName} did that for ${ctx.teamName}.` : null,
    (ctx) => ctx.playerLastName && ctx.draftRound && ctx.draftRound <= 3 ? `R${ctx.draftRound} pick. Replacement-level production. The hole at the top of the lineup never filled.` : null,
    (ctx) => ctx.playerLastName ? `Injuries, slumps, or both. The output never showed up. ${ctx.teamName} ate the cost.` : null,
    (ctx) => ctx.valueScore !== undefined && ctx.valueScore <= -80 ? `${fmtValue(ctx.valueScore)} value over ADP. The largest negative swing in the league.` : null,
    (ctx) => ctx.playerLastName ? `${ctx.playerLastName}: the pick the analysts warned about. The pick that went anyway.` : null,
    (ctx) => ctx.playerLastName ? `${ctx.teamName} drafted ${ctx.playerLastName} as the cornerstone. The cornerstone cracked.` : null,
    (ctx) => ctx.playerLastName && ctx.brokenCat ? `${ctx.playerLastName}'s collapse took ${ctx.brokenCat} off the table for ${ctx.teamName}. The cat never recovered.` : null,
    (ctx) => ctx.playerLastName ? `${ctx.teamName} bet on the name. The name did not show up.` : null,
    (ctx) => ctx.playerLastName && ctx.draftRound ? `Drafted in R${ctx.draftRound}. Produced at a R20 level. That is the definition of a bust.` : null,
    (ctx) => ctx.playerLastName ? `${ctx.playerLastName}: the pick that turned a B-grade draft into a C.` : null,
    (ctx) => ctx.playerLastName ? `${ctx.teamName} got hurt by one pick. ${ctx.playerLastName}. The rest of the board did its job.` : null,
    (ctx) => ctx.playerLastName ? `The kind of miss that stays on the draft sheet all year. ${ctx.playerLastName} was that for ${ctx.teamName}.` : null,
  ],
}

/* ─────────────────────────────────────────────────────────────────
   KIND: TEAM-GRADE-NARRATIVE
   Per-team draft autopsy. Tone modulates with grade tier.
   Every team gets one — variant pool needs to cover A+ through F
   with at least 8-12 templates per tier. We use grade-conditional
   self-vetos to route the right tone to the right team.
───────────────────────────────────────────────────────────────── */

const TEAM_GRADE_NARRATIVE: DraftTemplate = {
  kind: 'team-grade-narrative',
  eyebrows: [
    (ctx) => ctx.gradeLetter ? `GRADE: ${ctx.gradeLetter}` : 'DRAFT GRADE',
    () => 'DRAFT AUTOPSY',
    () => 'THE BOARD, REVIEWED',
    () => 'POST-DRAFT',
    () => 'THE GRADE',
    (ctx) => ctx.gradeRank ? `RANK ${ctx.gradeRank} OF 10` : 'DRAFT GRADE',
    () => 'WHAT THE BOARD SAID',
    () => 'GRADED OUT',
  ],

  /* ─── HEADLINES ─── per-tier conditionals ─── */
  headlines: [
    /* ===== A+ tier ===== */
    (ctx) => ctx.gradeLetter === 'A+' ? `${ctx.teamName}: A+. The host drafted like the host.` : null,
    (ctx) => ctx.gradeLetter === 'A+' ? `${ctx.teamName} ran the board.` : null,
    (ctx) => ctx.gradeLetter === 'A+' ? `${ctx.teamName}. ${pick(SYN.GREAT_GRADE_WORDS).replace(/^./, (c) => c.toUpperCase())}.` : null,
    (ctx) => ctx.gradeLetter === 'A+' ? `${ctx.teamName}: nobody else came close.` : null,
    (ctx) => ctx.gradeLetter === 'A+' ? `${ctx.teamName} drafted with intent. The intent paid.` : null,
    (ctx) => ctx.gradeLetter === 'A+' ? `${ctx.teamName} read every tier.` : null,
    (ctx) => ctx.gradeLetter === 'A+' ? `${ctx.teamName} pocketed value at every turn.` : null,
    (ctx) => ctx.gradeLetter === 'A+' ? `A+ in a room of B-pluses. ${ctx.teamName}.` : null,
    (ctx) => ctx.gradeLetter === 'A+' ? `${ctx.teamName} drafted the cleanest board in the league.` : null,

    /* ===== A tier ===== */
    (ctx) => ctx.gradeLetter === 'A' ? `${ctx.teamName}: A. The roster is loaded.` : null,
    (ctx) => ctx.gradeLetter === 'A' ? `${ctx.teamName} ${pick(SYN.DRAFTED_WELL)}.` : null,
    (ctx) => ctx.gradeLetter === 'A' ? `${ctx.teamName}: top-three grade. Built to contend.` : null,
    (ctx) => ctx.gradeLetter === 'A' ? `${ctx.teamName} did not reach. They did not panic.` : null,
    (ctx) => ctx.gradeLetter === 'A' ? `${ctx.teamName}: clean board, deep roster.` : null,
    (ctx) => ctx.gradeLetter === 'A' ? `${ctx.teamName} worked the value rounds.` : null,
    (ctx) => ctx.gradeLetter === 'A' ? `${ctx.teamName}: top-tier draft, top-tier roster.` : null,
    (ctx) => ctx.gradeLetter === 'A' ? `${ctx.teamName} drafted balance. They got balance.` : null,
    (ctx) => ctx.gradeLetter === 'A' ? `${ctx.teamName}: the kind of draft that makes a contender.` : null,

    /* ===== A- tier ===== */
    (ctx) => ctx.gradeLetter === 'A-' ? `${ctx.teamName}: A-. One reach away from the top.` : null,
    (ctx) => ctx.gradeLetter === 'A-' ? `${ctx.teamName} drafted well. One pick wobbled.` : null,
    (ctx) => ctx.gradeLetter === 'A-' ? `${ctx.teamName}: deep roster, one early miss.` : null,
    (ctx) => ctx.gradeLetter === 'A-' ? `${ctx.teamName} hit on nine of ten early picks.` : null,
    (ctx) => ctx.gradeLetter === 'A-' ? `${ctx.teamName} graded just outside the top tier.` : null,
    (ctx) => ctx.gradeLetter === 'A-' ? `${ctx.teamName}: strong board, one ding.` : null,
    (ctx) => ctx.gradeLetter === 'A-' ? `${ctx.teamName} earned the top half. One miss kept them from the peak.` : null,
    (ctx) => ctx.gradeLetter === 'A-' ? `${ctx.teamName}: A-minus draft, A-level roster.` : null,
    (ctx) => ctx.gradeLetter === 'A-' ? `${ctx.teamName} drafted like a contender. With one footnote.` : null,

    /* ===== B+ tier ===== */
    (ctx) => ctx.gradeLetter === 'B+' ? `${ctx.teamName}: B+. Solid board, one big swing.` : null,
    (ctx) => ctx.gradeLetter === 'B+' ? `${ctx.teamName} built a contender. Two misses do not change that.` : null,
    (ctx) => ctx.gradeLetter === 'B+' ? `${ctx.teamName}: above-average draft, deep middle rounds.` : null,
    (ctx) => ctx.gradeLetter === 'B+' ? `${ctx.teamName} read the middle of the board.` : null,
    (ctx) => ctx.gradeLetter === 'B+' ? `${ctx.teamName}: clean middle rounds, one early ding.` : null,
    (ctx) => ctx.gradeLetter === 'B+' ? `${ctx.teamName}. Good draft, room to grow.` : null,
    (ctx) => ctx.gradeLetter === 'B+' ? `${ctx.teamName}: B-plus. Built for a playoff push.` : null,
    (ctx) => ctx.gradeLetter === 'B+' ? `${ctx.teamName} drafted with a plan. The plan mostly worked.` : null,

    /* ===== B tier ===== */
    (ctx) => ctx.gradeLetter === 'B' ? `${ctx.teamName}: B. The board did its job.` : null,
    (ctx) => ctx.gradeLetter === 'B' ? `${ctx.teamName} drafted a roster. A roster shows up.` : null,
    (ctx) => ctx.gradeLetter === 'B' ? `${ctx.teamName}: average grade, above-average ceiling.` : null,
    (ctx) => ctx.gradeLetter === 'B' ? `${ctx.teamName} did the work. The grade reflects it.` : null,
    (ctx) => ctx.gradeLetter === 'B' ? `${ctx.teamName}: middle-of-the-road draft, middle-of-the-road roster.` : null,
    (ctx) => ctx.gradeLetter === 'B' ? `${ctx.teamName} got value. They also got their share of misses.` : null,
    (ctx) => ctx.gradeLetter === 'B' ? `${ctx.teamName}: B. The middle rounds carried it.` : null,
    (ctx) => ctx.gradeLetter === 'B' ? `${ctx.teamName} drafted a playoff team. Not a contender.` : null,

    /* ===== B- tier ===== */
    (ctx) => ctx.gradeLetter === 'B-' ? `${ctx.teamName}: B-. The early rounds wobbled.` : null,
    (ctx) => ctx.gradeLetter === 'B-' ? `${ctx.teamName} drafted upside. The upside has not paid yet.` : null,
    (ctx) => ctx.gradeLetter === 'B-' ? `${ctx.teamName}: below-average board, above-average middle rounds.` : null,
    (ctx) => ctx.gradeLetter === 'B-' ? `${ctx.teamName} hit on six of ten early picks.` : null,
    (ctx) => ctx.gradeLetter === 'B-' ? `${ctx.teamName}: B-minus. The bench is thin.` : null,
    (ctx) => ctx.gradeLetter === 'B-' ? `${ctx.teamName} drafted a roster with a ceiling. Not a floor.` : null,
    (ctx) => ctx.gradeLetter === 'B-' ? `${ctx.teamName}: middle of the league. The waiver wire is going to matter.` : null,
    (ctx) => ctx.gradeLetter === 'B-' ? `${ctx.teamName} drafted okay. The draft does not lift them.` : null,

    /* ===== C+ tier ===== */
    (ctx) => ctx.gradeLetter === 'C+' ? `${ctx.teamName}: C+. Lukewarm. The middle rounds carried it.` : null,
    (ctx) => ctx.gradeLetter === 'C+' ? `${ctx.teamName} drafted with a plan. The plan needed work.` : null,
    (ctx) => ctx.gradeLetter === 'C+' ? `${ctx.teamName}: average grade, average roster.` : null,
    (ctx) => ctx.gradeLetter === 'C+' ? `${ctx.teamName} got their share of value. Got their share of misses too.` : null,
    (ctx) => ctx.gradeLetter === 'C+' ? `${ctx.teamName}: middle-of-the-pack grade.` : null,
    (ctx) => ctx.gradeLetter === 'C+' ? `${ctx.teamName} drafted a roster the waiver wire will reshape.` : null,
    (ctx) => ctx.gradeLetter === 'C+' ? `${ctx.teamName}: C-plus. Not a contender. Not a basement team.` : null,
    (ctx) => ctx.gradeLetter === 'C+' ? `${ctx.teamName} drafted by feel. The feel was inconsistent.` : null,

    /* ===== C tier ===== */
    (ctx) => ctx.gradeLetter === 'C' ? `${ctx.teamName}: C. Middle of the pack.` : null,
    (ctx) => ctx.gradeLetter === 'C' ? `${ctx.teamName} ${pick(SYN.DRAFTED_POORLY)}.` : null,
    (ctx) => ctx.gradeLetter === 'C' ? `${ctx.teamName}: average grade. Two early misses.` : null,
    (ctx) => ctx.gradeLetter === 'C' ? `${ctx.teamName} drafted a roster the waiver wire will need to fix.` : null,
    (ctx) => ctx.gradeLetter === 'C' ? `${ctx.teamName}: C-grade draft. The bench is thin.` : null,
    (ctx) => ctx.gradeLetter === 'C' ? `${ctx.teamName} reached early. Missed late.` : null,
    (ctx) => ctx.gradeLetter === 'C' ? `${ctx.teamName}: middle-of-the-board draft, bottom-half roster.` : null,
    (ctx) => ctx.gradeLetter === 'C' ? `${ctx.teamName} drafted by feel. The feel was off.` : null,
    (ctx) => ctx.gradeLetter === 'C' ? `${ctx.teamName}: C. The draft does not carry them.` : null,

    /* ===== C- tier ===== */
    (ctx) => ctx.gradeLetter === 'C-' ? `${ctx.teamName}: C-. The board got away.` : null,
    (ctx) => ctx.gradeLetter === 'C-' ? `${ctx.teamName} ${pick(SYN.DRAFTED_POORLY)}.` : null,
    (ctx) => ctx.gradeLetter === 'C-' ? `${ctx.teamName}: below-average grade, below-average roster.` : null,
    (ctx) => ctx.gradeLetter === 'C-' ? `${ctx.teamName} took the chalk. The chalk did not pay.` : null,
    (ctx) => ctx.gradeLetter === 'C-' ? `${ctx.teamName}: C-minus. The bench is empty.` : null,
    (ctx) => ctx.gradeLetter === 'C-' ? `${ctx.teamName} reached on three of the first six picks.` : null,
    (ctx) => ctx.gradeLetter === 'C-' ? `${ctx.teamName}: rough board, rough start.` : null,
    (ctx) => ctx.gradeLetter === 'C-' ? `${ctx.teamName} drafted the names. The names did not show up.` : null,

    /* ===== D+ tier ===== */
    (ctx) => ctx.gradeLetter === 'D+' ? `${ctx.teamName}: D+. ${pick(SYN.POOR_GRADE_WORDS).replace(/^./, (c) => c.toUpperCase())}.` : null,
    (ctx) => ctx.gradeLetter === 'D+' ? `${ctx.teamName} ${pick(SYN.DRAFTED_POORLY)}.` : null,
    (ctx) => ctx.gradeLetter === 'D+' ? `${ctx.teamName}: D-plus. The roster is going to need help.` : null,
    (ctx) => ctx.gradeLetter === 'D+' ? `${ctx.teamName} reached. Missed. Reached again.` : null,
    (ctx) => ctx.gradeLetter === 'D+' ? `${ctx.teamName}: bottom-three grade. The waiver wire is the lifeline.` : null,
    (ctx) => ctx.gradeLetter === 'D+' ? `${ctx.teamName} chased names. The names did not show up.` : null,
    (ctx) => ctx.gradeLetter === 'D+' ? `${ctx.teamName}: D+. One steal saved the grade from worse.` : null,
    (ctx) => ctx.gradeLetter === 'D+' ? `${ctx.teamName} drafted with intent. The intent was wrong.` : null,

    /* ===== D tier ===== */
    (ctx) => ctx.gradeLetter === 'D' ? `${ctx.teamName}: D. Rough day.` : null,
    (ctx) => ctx.gradeLetter === 'D' ? `${ctx.teamName} ${pick(SYN.DRAFTED_POORLY)}.` : null,
    (ctx) => ctx.gradeLetter === 'D' ? `${ctx.teamName}: bottom-two grade. The bench has nothing.` : null,
    (ctx) => ctx.gradeLetter === 'D' ? `${ctx.teamName} reached. Reached. Reached.` : null,
    (ctx) => ctx.gradeLetter === 'D' ? `${ctx.teamName}: D. The autopilot would have done better.` : null,
    (ctx) => ctx.gradeLetter === 'D' ? `${ctx.teamName} chased the names. Walked away with empty rounds.` : null,
    (ctx) => ctx.gradeLetter === 'D' ? `${ctx.teamName}: D-grade draft, basement roster.` : null,
    (ctx) => ctx.gradeLetter === 'D' ? `${ctx.teamName} drafted by feel. The feel never showed up.` : null,

    /* ===== F tier ===== */
    (ctx) => ctx.gradeLetter === 'F' ? `${ctx.teamName}: F. Autodraft would have done better.` : null,
    (ctx) => ctx.gradeLetter === 'F' ? `${ctx.teamName}: F-grade. The board ran them over.` : null,
    (ctx) => ctx.gradeLetter === 'F' ? `${ctx.teamName} ${pick(SYN.DRAFTED_POORLY)}.` : null,
    (ctx) => ctx.gradeLetter === 'F' ? `${ctx.teamName}: F. The bottom of the league.` : null,
    (ctx) => ctx.gradeLetter === 'F' ? `${ctx.teamName} reached on every other pick.` : null,
    (ctx) => ctx.gradeLetter === 'F' ? `${ctx.teamName}: F. The kind of board the league rewinds for.` : null,
    (ctx) => ctx.gradeLetter === 'F' ? `${ctx.teamName} drafted blind. The roster shows it.` : null,
    (ctx) => ctx.gradeLetter === 'F' ? `${ctx.teamName}: rock bottom. The waiver wire is the season now.` : null,

    /* ===== generic fallbacks (any grade) ===== */
    (ctx) => `${ctx.teamName}. The grade is in.`,
    (ctx) => ctx.gradeLetter ? `${ctx.teamName}: ${ctx.gradeLetter}.` : null,
    (ctx) => ctx.gradeRank ? `${ctx.teamName}: ${ctx.gradeRank} of 10.` : null,
  ],

  /* ─── BODIES ─── per-tier conditionals ─── */
  bodies: [
    /* ===== A+ tier ===== */
    (ctx) => ctx.gradeLetter === 'A+' && ctx.stealsCount ? `${plural(ctx.stealsCount, 'steal')}, zero busts. ${ctx.teamName} drafted with intent and the intent paid out.` : null,
    (ctx) => ctx.gradeLetter === 'A+' ? `Top grade in the league. ${ctx.teamName} ${pick(SYN.EARNED)} on every pick.` : null,
    (ctx) => ctx.gradeLetter === 'A+' && ctx.notablePicks && ctx.notablePicks.length >= 2 ? `${ctx.notablePicks[0]} in the early rounds. ${ctx.notablePicks[1]} in the middle. The depth is uncatchable.` : null,
    (ctx) => ctx.gradeLetter === 'A+' && ctx.categoriesStrong && ctx.categoriesStrong.length >= 3 ? `Strong in ${ctx.categoriesStrong.slice(0, 3).join(', ')}. The cats are built in.` : null,
    (ctx) => ctx.gradeLetter === 'A+' ? `The board fell, ${ctx.teamName} pocketed it. Every round.` : null,
    (ctx) => ctx.gradeLetter === 'A+' ? `Best draft in the league. The numbers say it. The roster says it louder.` : null,
    (ctx) => ctx.gradeLetter === 'A+' ? `${ctx.teamName} drafted balance and got dominance.` : null,
    (ctx) => ctx.gradeLetter === 'A+' ? `Every pick had a reason. Every reason held up.` : null,

    /* ===== A tier ===== */
    (ctx) => ctx.gradeLetter === 'A' && ctx.stealsCount ? `${plural(ctx.stealsCount, 'steal')} and zero early-round busts. ${ctx.teamName} drafted a contender.` : null,
    (ctx) => ctx.gradeLetter === 'A' ? `${ctx.teamName} worked the value rounds. The roster has no holes.` : null,
    (ctx) => ctx.gradeLetter === 'A' && ctx.notablePicks && ctx.notablePicks.length >= 2 ? `${ctx.notablePicks[0]} and ${ctx.notablePicks[1]} anchor the lineup. The depth fills in around them.` : null,
    (ctx) => ctx.gradeLetter === 'A' ? `A-grade draft, top-three roster. The league has to plan around them.` : null,
    (ctx) => ctx.gradeLetter === 'A' && ctx.earlyHitRatePct ? `${ctx.earlyHitRatePct}% hit rate in the first five rounds. That is how contenders get built.` : null,
    (ctx) => ctx.gradeLetter === 'A' ? `${ctx.teamName} did not chase. They worked the tiers and let the board come to them.` : null,
    (ctx) => ctx.gradeLetter === 'A' && ctx.categoriesStrong && ctx.categoriesStrong.length >= 2 ? `Built strong in ${ctx.categoriesStrong.slice(0, 2).join(' and ')}. The cats are locked.` : null,
    (ctx) => ctx.gradeLetter === 'A' ? `A-grade. Solid roof, solid floor. Built to last sixteen weeks.` : null,

    /* ===== A- tier ===== */
    (ctx) => ctx.gradeLetter === 'A-' ? `One pick away from an A. ${ctx.teamName} drafted a contender with a footnote.` : null,
    (ctx) => ctx.gradeLetter === 'A-' && ctx.notablePicks && ctx.notablePicks.length >= 1 ? `${ctx.notablePicks[0]} anchors the roster. The rest of the board fills in clean.` : null,
    (ctx) => ctx.gradeLetter === 'A-' ? `Top half of the league. ${ctx.teamName} read the board and drafted depth.` : null,
    (ctx) => ctx.gradeLetter === 'A-' && ctx.stealsCount ? `${plural(ctx.stealsCount, 'steal')} on the board. One early miss kept the grade off the peak.` : null,
    (ctx) => ctx.gradeLetter === 'A-' ? `A-minus draft. The middle rounds did the heavy lifting.` : null,
    (ctx) => ctx.gradeLetter === 'A-' ? `${ctx.teamName} drafted a contender. With one pick the owner will rethink.` : null,
    (ctx) => ctx.gradeLetter === 'A-' ? `Strong board, one ding. ${ctx.teamName} graded just outside the top tier.` : null,
    (ctx) => ctx.gradeLetter === 'A-' ? `A-minus grade, A-level roster. The grade will catch up.` : null,

    /* ===== B+ tier ===== */
    (ctx) => ctx.gradeLetter === 'B+' ? `${ctx.teamName} built a playoff roster. The early rounds did most of the work.` : null,
    (ctx) => ctx.gradeLetter === 'B+' && ctx.notablePicks && ctx.notablePicks.length >= 2 ? `${ctx.notablePicks[0]} and ${ctx.notablePicks[1]} carry the lineup. The middle of the roster will need to settle.` : null,
    (ctx) => ctx.gradeLetter === 'B+' ? `B-plus draft, B-plus roster. Built for a playoff push.` : null,
    (ctx) => ctx.gradeLetter === 'B+' ? `${ctx.teamName} drafted with a plan. The plan mostly worked.` : null,
    (ctx) => ctx.gradeLetter === 'B+' && ctx.missesCount && ctx.missesCount <= 2 ? `${plural(ctx.missesCount, 'miss')} on the board. The rest of the picks held up.` : null,
    (ctx) => ctx.gradeLetter === 'B+' ? `Clean middle rounds, one early-round ding. ${ctx.teamName} is in the conversation.` : null,
    (ctx) => ctx.gradeLetter === 'B+' ? `B-plus. Solid floor, room to grow. The waiver wire will help.` : null,

    /* ===== B tier ===== */
    (ctx) => ctx.gradeLetter === 'B' ? `${ctx.teamName} drafted a roster. A roster shows up week-in-week-out.` : null,
    (ctx) => ctx.gradeLetter === 'B' && ctx.missesCount ? `${plural(ctx.missesCount, 'miss')} on the board. ${ctx.hitsCount ?? 0} hits. The grade is fair.` : null,
    (ctx) => ctx.gradeLetter === 'B' ? `B-grade draft, middle-of-the-league roster. The waiver wire is the swing factor.` : null,
    (ctx) => ctx.gradeLetter === 'B' ? `${ctx.teamName} got value. They also got their share of misses. The grade is a B for a reason.` : null,
    (ctx) => ctx.gradeLetter === 'B' && ctx.categoriesStrong && ctx.categoriesStrong.length >= 1 ? `Built strong in ${ctx.categoriesStrong[0]}. The other columns are open.` : null,
    (ctx) => ctx.gradeLetter === 'B' ? `B-grade. The middle rounds carried it. The bench is thin but workable.` : null,
    (ctx) => ctx.gradeLetter === 'B' ? `${ctx.teamName} drafted a playoff team. Not a contender. The work is on the wire now.` : null,

    /* ===== B- tier ===== */
    (ctx) => ctx.gradeLetter === 'B-' ? `${ctx.teamName} drafted upside. The upside has not paid yet. The grade is provisional.` : null,
    (ctx) => ctx.gradeLetter === 'B-' && ctx.missesCount ? `${plural(ctx.missesCount, 'early-round miss', 'early-round misses')}. The grade dropped a tier.` : null,
    (ctx) => ctx.gradeLetter === 'B-' ? `B-minus draft. The bench is thin and the waiver wire will need to fill it.` : null,
    (ctx) => ctx.gradeLetter === 'B-' ? `${ctx.teamName} hit on six of ten early picks. The other four cost a tier.` : null,
    (ctx) => ctx.gradeLetter === 'B-' ? `B-minus. The roster has a ceiling. The floor will need work.` : null,
    (ctx) => ctx.gradeLetter === 'B-' ? `${ctx.teamName} drafted okay. The draft does not lift them. The waiver wire might.` : null,

    /* ===== C+ tier ===== */
    (ctx) => ctx.gradeLetter === 'C+' ? `${ctx.teamName} drafted with a plan. The plan needed work. The middle rounds carried the grade.` : null,
    (ctx) => ctx.gradeLetter === 'C+' ? `C-plus draft. Average roster. Average ceiling. The waiver wire is the swing factor.` : null,
    (ctx) => ctx.gradeLetter === 'C+' && ctx.missesCount ? `${plural(ctx.missesCount, 'miss')} on the early board. The middle rounds saved the grade.` : null,
    (ctx) => ctx.gradeLetter === 'C+' ? `${ctx.teamName} got their share of value. Got their share of misses too.` : null,
    (ctx) => ctx.gradeLetter === 'C+' ? `C-plus grade. Middle-of-the-pack roster. The wire is going to matter.` : null,
    (ctx) => ctx.gradeLetter === 'C+' ? `${ctx.teamName} drafted by feel. The feel was inconsistent. The grade reflects it.` : null,

    /* ===== C tier ===== */
    (ctx) => ctx.gradeLetter === 'C' ? `${ctx.teamName} ${pick(SYN.DRAFTED_POORLY)}. The grade is a C for a reason.` : null,
    (ctx) => ctx.gradeLetter === 'C' && ctx.missesCount ? `${plural(ctx.missesCount, 'miss')} on the board. The roster has holes.` : null,
    (ctx) => ctx.gradeLetter === 'C' ? `C-grade draft. The bench is empty and the early rounds left value on the board.` : null,
    (ctx) => ctx.gradeLetter === 'C' ? `${ctx.teamName} reached early. Missed late. The draft does not carry them.` : null,
    (ctx) => ctx.gradeLetter === 'C' && ctx.categoriesPunted && ctx.categoriesPunted.length >= 1 ? `Punted ${ctx.categoriesPunted[0]}. The other columns are open too.` : null,
    (ctx) => ctx.gradeLetter === 'C' ? `C. Middle of the pack. The waiver wire is going to do the season's work.` : null,
    (ctx) => ctx.gradeLetter === 'C' ? `${ctx.teamName} drafted a roster the waiver wire will need to fix. The grade is honest.` : null,

    /* ===== C- tier ===== */
    (ctx) => ctx.gradeLetter === 'C-' ? `${ctx.teamName} ${pick(SYN.DRAFTED_POORLY)}. The grade dropped a tier from feel.` : null,
    (ctx) => ctx.gradeLetter === 'C-' && ctx.missesCount ? `${plural(ctx.missesCount, 'miss')} on the early board. The roster has more holes than depth.` : null,
    (ctx) => ctx.gradeLetter === 'C-' ? `C-minus draft. The bench is thin and the early rounds did not deliver.` : null,
    (ctx) => ctx.gradeLetter === 'C-' ? `${ctx.teamName} took the chalk. The chalk did not pay. The grade reflects it.` : null,
    (ctx) => ctx.gradeLetter === 'C-' ? `C-minus. Below-average draft, bottom-half roster. The wire is the season now.` : null,
    (ctx) => ctx.gradeLetter === 'C-' ? `${ctx.teamName} reached on three of the first six picks. The early misses cost two grade tiers.` : null,

    /* ===== D+ tier ===== */
    (ctx) => ctx.gradeLetter === 'D+' ? `${ctx.teamName} drafted with intent. The intent was wrong. The grade is a D+.` : null,
    (ctx) => ctx.gradeLetter === 'D+' && ctx.bustsCount ? `${plural(ctx.bustsCount, 'bust')} on the board. The waiver wire is the lifeline now.` : null,
    (ctx) => ctx.gradeLetter === 'D+' ? `D-plus draft. The roster is going to need help. A lot of help.` : null,
    (ctx) => ctx.gradeLetter === 'D+' ? `${ctx.teamName} chased names. The names did not show up. The grade is honest.` : null,
    (ctx) => ctx.gradeLetter === 'D+' ? `One steal saved the grade from worse. The rest of the board ran them over.` : null,
    (ctx) => ctx.gradeLetter === 'D+' ? `D-plus. Bottom-three grade. The wire is the season now.` : null,

    /* ===== D tier ===== */
    (ctx) => ctx.gradeLetter === 'D' ? `${ctx.teamName} ${pick(SYN.DRAFTED_POORLY)}. The roster shows it.` : null,
    (ctx) => ctx.gradeLetter === 'D' && ctx.bustsCount ? `${plural(ctx.bustsCount, 'bust')} on the early board. The grade is a D.` : null,
    (ctx) => ctx.gradeLetter === 'D' ? `D-grade draft. The bench has nothing and the early rounds were a clinic in misreads.` : null,
    (ctx) => ctx.gradeLetter === 'D' ? `${ctx.teamName} drafted by feel. The feel never showed up. Autodraft would have done better.` : null,
    (ctx) => ctx.gradeLetter === 'D' ? `D. Bottom-two grade. The wire is the lifeline. The lifeline is going to need to be a star.` : null,
    (ctx) => ctx.gradeLetter === 'D' ? `${ctx.teamName} chased the names. Walked away with empty rounds.` : null,

    /* ===== F tier ===== */
    (ctx) => ctx.gradeLetter === 'F' ? `${ctx.teamName} drafted blind. The roster shows it. The grade is an F.` : null,
    (ctx) => ctx.gradeLetter === 'F' && ctx.bustsCount ? `${plural(ctx.bustsCount, 'bust')} on the board. The early rounds were a graveyard.` : null,
    (ctx) => ctx.gradeLetter === 'F' ? `F. Rock bottom. The waiver wire is the season now. And the season is long.` : null,
    (ctx) => ctx.gradeLetter === 'F' ? `${ctx.teamName} reached on every other pick. The board ran them over.` : null,
    (ctx) => ctx.gradeLetter === 'F' ? `F-grade. The kind of board the league rewinds for. The owner already has next year's plan drafted.` : null,
    (ctx) => ctx.gradeLetter === 'F' ? `Autodraft would have done better. The numbers say it. The grade says it louder.` : null,

    /* ===== generic fallbacks (any grade) ===== */
    (ctx) => ctx.gradeLetter && ctx.gradeRank ? `${ctx.gradeLetter} grade. Rank ${ctx.gradeRank} of 10. The board has been graded.` : null,
    (ctx) => `${ctx.teamName}. The grade is in. The roster will do the talking.`,
  ],
}

/* ─────────────────────────────────────────────────────────────────
   KIND: PUNT-SUCCESS
   Team punted and won other cats. Strategic-vindicated.
───────────────────────────────────────────────────────────────── */

const PUNT_SUCCESS: DraftTemplate = {
  kind: 'punt-success',
  eyebrows: [
    () => 'PUNT IT, WIN THE REST',
    () => 'STRATEGIC PUNT',
    () => 'PUNT STRATEGY WORKED',
    () => 'ZERO IN ONE, WIN EIGHT',
    () => 'PUNT MASTERCLASS',
    () => 'THE PUNT PAID',
    (ctx) => (ctx.alternateCatsWon ?? 0) >= 6 ? 'PUNT BLUEPRINT' : 'STRATEGIC PUNT',
  ],
  headlines: [
    (ctx) => ctx.puntedCat ? `${ctx.teamName} punted ${ctx.puntedCat}. They still won the rest.` : null,
    (ctx) => ctx.puntedCat ? `${ctx.teamName} ${pick(SYN.PUNT_VERBS)} ${ctx.puntedCat}. The other cats followed.` : null,
    (ctx) => ctx.puntedCat ? `Punt-${ctx.puntedCat} strategy. ${ctx.teamName} ran with it.` : null,
    (ctx) => ctx.puntedCat ? `${ctx.teamName} zeroed out ${ctx.puntedCat}. Built a contender anyway.` : null,
    (ctx) => ctx.puntedCat && ctx.alternateCatsWon ? `Punt ${ctx.puntedCat}. Win ${ctx.alternateCatsWon} of the rest.` : null,
    (ctx) => ctx.puntedCat ? `${ctx.teamName}: gave up ${ctx.puntedCat}, took everything else.` : null,
    (ctx) => ctx.puntedCat ? `${ctx.puntedCat}: ignored on purpose. The rest of the board is loud.` : null,
    (ctx) => ctx.puntedCat ? `${ctx.teamName} punted ${ctx.puntedCat} in R1. The strategy paid in week three.` : null,
    (ctx) => ctx.puntedCat ? `${ctx.teamName}: punt-${ctx.puntedCat} blueprint.` : null,
    (ctx) => ctx.puntedCat && ctx.alternateCatsWon && ctx.alternateCatsWon >= 7 ? `Win ${ctx.alternateCatsWon} cats. Lose ${ctx.puntedCat}. ${ctx.teamName} drafted exactly that.` : null,
    (ctx) => ctx.puntedCat ? `${ctx.teamName} drafted around ${ctx.puntedCat}. The other categories cashed.` : null,
    (ctx) => ctx.puntedCat ? `Punted ${ctx.puntedCat}. Won the matchup anyway. ${ctx.teamName}.` : null,
    (ctx) => ctx.puntedCat ? `${ctx.teamName}: ${ctx.puntedCat} dead last, everything else top three.` : null,
    (ctx) => ctx.puntedCat ? `${ctx.teamName} took the punt seriously. The punt took them to first.` : null,
    (ctx) => ctx.puntedCat ? `The ${ctx.puntedCat} column is empty. The standings column is full.` : null,
  ],
  bodies: [
    (ctx) => ctx.puntedCat && ctx.puntedCatRank && ctx.alternateCatsWon ? `${ctx.teamName} ranks last in ${ctx.puntedCat}. They rank in the top three in ${ctx.alternateCatsWon} other cats. The strategy is working.` : null,
    (ctx) => ctx.puntedCat ? `Punt-${ctx.puntedCat} is the hardest build in fantasy. ${ctx.teamName} did it.` : null,
    (ctx) => ctx.puntedCat && ctx.alternateCatsWon ? `Punted ${ctx.puntedCat} on draft day. Winning ${ctx.alternateCatsWon} of the remaining eleven cats. That math wins matchups.` : null,
    (ctx) => ctx.puntedCat ? `${ctx.teamName} did not buy a single ${ctx.puntedCat} contributor. The rest of the board was the focus and the focus paid.` : null,
    (ctx) => ctx.puntedCat ? `Punting ${ctx.puntedCat} freed up rounds for everything else. ${ctx.teamName} stacked the cats they did want.` : null,
    (ctx) => ctx.puntedCat ? `${ctx.teamName}: the cleanest punt strategy in the league. The grade reflects it.` : null,
    (ctx) => ctx.puntedCat && ctx.alternateCatsWon && ctx.alternateCatsWon >= 6 ? `Six-plus cats locked. ${ctx.puntedCat} left in the dust. The trade was always worth it.` : null,
    (ctx) => ctx.puntedCat ? `Strategic-punt drafts get judged on the other cats. ${ctx.teamName} aced the other cats.` : null,
    (ctx) => ctx.puntedCat ? `${ctx.teamName} ${pick(SYN.PUNT_VERBS)} ${ctx.puntedCat} early. Spent every late-round pick on the categories that mattered.` : null,
    (ctx) => ctx.puntedCat ? `The ${ctx.puntedCat} column shows last place. The standings show top three. That is a successful punt.` : null,
    (ctx) => ctx.puntedCat ? `${ctx.teamName} drafted a roster with one hole. The hole is on purpose. The roster is a contender.` : null,
    (ctx) => ctx.puntedCat ? `${ctx.teamName} did not waste a single pick on ${ctx.puntedCat}. Every round counted for the cats they wanted.` : null,
    (ctx) => ctx.puntedCat ? `${ctx.teamName}: punt strategies work when the rest of the board pays. The rest of the board paid.` : null,
    (ctx) => ctx.puntedCat ? `Punt-${ctx.puntedCat} is a tier of strategy. ${ctx.teamName} executed it.` : null,
    (ctx) => ctx.puntedCat ? `${ctx.teamName} owners are fine. The cat sheet shows a zero. The standings sheet shows a one.` : null,
  ],
}

/* ─────────────────────────────────────────────────────────────────
   KIND: PUNT-FAILURE
   Team punted and lost everything. Strategic-bust.
───────────────────────────────────────────────────────────────── */

const PUNT_FAILURE: DraftTemplate = {
  kind: 'punt-failure',
  eyebrows: [
    () => 'PUNT BACKFIRED',
    () => 'PUNT, LOSE EVERYTHING',
    () => 'STRATEGIC BUST',
    () => 'THE PUNT THAT BROKE',
    () => 'PUNT WITHOUT A PLAN',
    () => 'DOUBLE-DOWN ON ZERO',
    () => 'WRONG PUNT, WRONG YEAR',
  ],
  headlines: [
    (ctx) => ctx.puntedCat ? `${ctx.teamName} punted ${ctx.puntedCat}. They lost everything else.` : null,
    (ctx) => ctx.puntedCat ? `${ctx.teamName}: punted ${ctx.puntedCat}, did not win a single other cat.` : null,
    (ctx) => ctx.puntedCat ? `Punt-${ctx.puntedCat} strategy. ${ctx.teamName} got nothing back.` : null,
    (ctx) => ctx.puntedCat ? `${ctx.teamName} ${pick(SYN.PUNT_VERBS)} ${ctx.puntedCat}. The rest of the board punted them.` : null,
    (ctx) => ctx.puntedCat && ctx.alternateCatsLost ? `Lost ${ctx.puntedCat}. Lost ${ctx.alternateCatsLost} other cats too.` : null,
    (ctx) => ctx.puntedCat ? `${ctx.teamName}: the punt nobody asked for.` : null,
    (ctx) => ctx.puntedCat ? `${ctx.puntedCat} dead. The rest of the cats dead too.` : null,
    (ctx) => ctx.puntedCat ? `${ctx.teamName} drafted to punt ${ctx.puntedCat}. The roster punted everything.` : null,
    (ctx) => ctx.puntedCat ? `Punt-${ctx.puntedCat} requires a plan. ${ctx.teamName} did not have one.` : null,
    (ctx) => ctx.puntedCat && ctx.alternateCatsLost && ctx.alternateCatsLost >= 6 ? `Lose ${ctx.alternateCatsLost} cats on top of the punt. ${ctx.teamName} is bottom-two.` : null,
    (ctx) => ctx.puntedCat ? `${ctx.teamName} drafted around ${ctx.puntedCat}. Nobody else showed up either.` : null,
    (ctx) => ctx.puntedCat ? `${ctx.teamName}: ${ctx.puntedCat} dead last, everything else bottom four.` : null,
    (ctx) => ctx.puntedCat ? `The ${ctx.puntedCat} column is empty. The standings column is too.` : null,
    (ctx) => ctx.puntedCat ? `${ctx.teamName} took the punt seriously. The punt took the season.` : null,
  ],
  bodies: [
    (ctx) => ctx.puntedCat && ctx.puntedCatRank && ctx.alternateCatsLost ? `${ctx.teamName} ranks last in ${ctx.puntedCat}. They rank bottom-four in ${ctx.alternateCatsLost} other cats. The strategy did not pay.` : null,
    (ctx) => ctx.puntedCat ? `Punt-${ctx.puntedCat} requires the other rounds to pay. The other rounds did not pay.` : null,
    (ctx) => ctx.puntedCat && ctx.alternateCatsLost ? `Punted ${ctx.puntedCat} on draft day. Losing ${ctx.alternateCatsLost} of the remaining eleven cats. That math loses matchups.` : null,
    (ctx) => ctx.puntedCat ? `${ctx.teamName} did not buy a single ${ctx.puntedCat} contributor. The rest of the picks did not buy them anything either.` : null,
    (ctx) => ctx.puntedCat ? `Punting ${ctx.puntedCat} should have freed up rounds for everything else. The rounds were wasted.` : null,
    (ctx) => ctx.puntedCat ? `${ctx.teamName}: the punt was the plan. The plan needed everything else to work. It did not.` : null,
    (ctx) => ctx.puntedCat && ctx.alternateCatsLost && ctx.alternateCatsLost >= 5 ? `Five-plus cats lost. ${ctx.puntedCat} dead last. The trade was never going to pay.` : null,
    (ctx) => ctx.puntedCat ? `Strategic-punt drafts get judged on the other cats. ${ctx.teamName} lost the other cats.` : null,
    (ctx) => ctx.puntedCat ? `${ctx.teamName} ${pick(SYN.PUNT_VERBS)} ${ctx.puntedCat} early. Spent every late-round pick on the cats that did not deliver.` : null,
    (ctx) => ctx.puntedCat ? `The ${ctx.puntedCat} column shows last place. The standings show bottom-three. That is a failed punt.` : null,
    (ctx) => ctx.puntedCat ? `${ctx.teamName} drafted a roster with one hole on purpose. The hole spread to every other cat.` : null,
    (ctx) => ctx.puntedCat ? `${ctx.teamName} did not waste a pick on ${ctx.puntedCat}. The rest of the picks did the wasting.` : null,
    (ctx) => ctx.puntedCat ? `${ctx.teamName}: punt strategies work when the rest of the board pays. The rest of the board did not.` : null,
    (ctx) => ctx.puntedCat ? `Punt-${ctx.puntedCat} is a tier of strategy. ${ctx.teamName} did not execute it.` : null,
    (ctx) => ctx.puntedCat ? `${ctx.teamName} owners are not fine. The cat sheet shows a zero. The standings sheet shows a nine.` : null,
  ],
}

/* ─────────────────────────────────────────────────────────────────
   KIND: PUNT-BALANCED
   Didn't-need-to-punt framing.
───────────────────────────────────────────────────────────────── */

const PUNT_BALANCED: DraftTemplate = {
  kind: 'punt-balanced',
  eyebrows: [
    () => 'NO PUNTS',
    () => 'BUILT FOR EVERY CAT',
    () => 'BALANCED BOARD',
    () => 'NOTHING ZEROED OUT',
    () => 'COMPLETE ROSTER',
    () => 'EVERY COLUMN COVERED',
    () => 'NO HOLES',
  ],
  headlines: [
    (ctx) => `${ctx.teamName} did not punt anything. They did not have to.`,
    (ctx) => `${ctx.teamName}: zero punts. Twelve cats in play.`,
    (ctx) => `${ctx.teamName} drafted for every column.`,
    (ctx) => `No holes. ${ctx.teamName}.`,
    (ctx) => `${ctx.teamName} built complete. Every cat in play.`,
    (ctx) => `${ctx.teamName}: no punts, no excuses.`,
    (ctx) => `${ctx.teamName} drafted balanced. They have the depth to keep it that way.`,
    (ctx) => `${ctx.teamName}: every column on the board.`,
    (ctx) => `Zero categories zeroed out. ${ctx.teamName}.`,
    (ctx) => `${ctx.teamName}: the most complete roster in the league.`,
    (ctx) => `${ctx.teamName} drafted for sixteen weeks. Built to win cats nobody else can.`,
    (ctx) => `${ctx.teamName}: balance is the strategy.`,
    (ctx) => `${ctx.teamName} did not give up a cat. The roster gives them all twelve.`,
    (ctx) => `${ctx.teamName}: top six in nine of twelve cats. No bottom-three finishes.`,
    (ctx) => `${ctx.teamName} drafted depth. The depth covers every column.`,
  ],
  bodies: [
    (ctx) => `${ctx.teamName} drafted with every category in mind. The roster is the proof.`,
    (ctx) => `Zero punts. Zero zeroed-out columns. ${ctx.teamName} built complete.`,
    (ctx) => `${ctx.teamName}: not the highest ceiling in any one cat. The deepest floor in every cat.`,
    (ctx) => ctx.categoriesStrong && ctx.categoriesStrong.length >= 3 ? `Strong in ${ctx.categoriesStrong.slice(0, 3).join(', ')}. Decent everywhere else. No holes.` : null,
    (ctx) => `${ctx.teamName} drafted for breadth, not peaks. The strategy is paying.`,
    (ctx) => `Balanced rosters win matchups by inches, not by miles. ${ctx.teamName} drafted exactly that.`,
    (ctx) => `${ctx.teamName}: nothing zeroed out, nothing reached for. The cleanest balanced board in the league.`,
    (ctx) => `${ctx.teamName} did not chase punt-strategy bonuses. They drafted twelve cats and the roster is the proof.`,
    (ctx) => `${ctx.teamName}: top-six in nine of twelve cats. No bottom-three finishes in any.`,
    (ctx) => `The roster has no holes. ${ctx.teamName} drafted for that and the strategy worked.`,
    (ctx) => `${ctx.teamName} drafted balance the way the league drafts upside. The grade is balanced too.`,
    (ctx) => `${ctx.teamName} ${pick(SYN.DRAFTED_WELL)}. Every column is on the board.`,
    (ctx) => `${ctx.teamName}: balanced roster, balanced grade, balanced standings. Built to last.`,
    (ctx) => `${ctx.teamName} owners are fine. Every cat is in play. Every week.`,
    (ctx) => `Balance is harder than it looks. ${ctx.teamName} made it look easy.`,
  ],
}

/* ─────────────────────────────────────────────────────────────────
   KIND: CATEGORY-KING-FIVE-TOOL
   Player delivering across many cats. Rare-as-a-unicorn praise.
───────────────────────────────────────────────────────────────── */

const CATEGORY_KING_FIVE_TOOL: DraftTemplate = {
  kind: 'category-king-five-tool',
  eyebrows: [
    () => 'FIVE-TOOL SEASON',
    () => 'EVERY COLUMN',
    () => 'TOP-FIVE IN FIVE CATS',
    () => 'THE UNICORN',
    () => 'CATEGORY KING',
    () => 'COMPLETE BAT',
    (ctx) => (ctx.categoryKingCatsCovered ?? 0) >= 6 ? 'SIX-TOOL SEASON' : 'FIVE-TOOL SEASON',
  ],
  headlines: [
    (ctx) => ctx.playerLastName && ctx.categoryKingCatsCovered ? `${ctx.playerLastName} ${pick(SYN.DELIVERED)} in ${plural(ctx.categoryKingCatsCovered, 'cat')}.` : null,
    (ctx) => ctx.playerLastName ? `${ctx.playerLastName}: every column on the sheet.` : null,
    (ctx) => ctx.playerLastName && ctx.categoryKingCatsCovered ? `${ctx.playerLastName}: top-five in ${ctx.categoryKingCatsCovered} cats.` : null,
    (ctx) => ctx.playerLastName ? `${ctx.playerLastName} is the five-tool player every owner wants.` : null,
    (ctx) => ctx.playerLastName ? `${ctx.playerLastName} ${pick(SYN.DELIVERED)} across the board.` : null,
    (ctx) => ctx.playerLastName ? `${ctx.playerLastName}: HR, R, RBI, SB, AVG. Every box.` : null,
    (ctx) => ctx.playerLastName ? `${ctx.playerLastName}: roster cheat code.` : null,
    (ctx) => ctx.playerLastName ? `${ctx.playerLastName} is the bat the league pays the most for. ${ctx.teamName} got him.` : null,
    (ctx) => ctx.playerLastName ? `${ctx.playerLastName}: the rare bat that does not skip a column.` : null,
    (ctx) => ctx.playerLastName ? `${ctx.teamName}: ${ctx.playerLastName} is the engine.` : null,
    (ctx) => ctx.playerLastName ? `${ctx.playerLastName}: top-ten in five different cats. Nobody else is doing that.` : null,
    (ctx) => ctx.playerLastName && ctx.position ? `${ctx.playerLastName} (${ctx.position}) at every column. Five-tool from the slot.` : null,
    (ctx) => ctx.playerLastName ? `${ctx.playerLastName} carries five cats by himself.` : null,
    (ctx) => ctx.playerLastName ? `${ctx.playerLastName}: the unicorn of the year.` : null,
    (ctx) => ctx.playerLastName ? `${ctx.teamName} drafted ${ctx.playerLastName}. The roster runs on him.` : null,
  ],
  bodies: [
    (ctx) => ctx.playerLastName && ctx.categoryKingCatsCovered ? `${ctx.playerLastName} ranks top-ten in ${plural(ctx.categoryKingCatsCovered, 'cat')}. There is nobody else in fantasy who is doing that.` : null,
    (ctx) => ctx.playerLastName ? `${ctx.playerLastName}: the kind of bat that pays the first-round tax and then some.` : null,
    (ctx) => ctx.playerLastName ? `Five-tool seasons are rare. ${ctx.playerLastName} is having one and ${ctx.teamName} drafted him.` : null,
    (ctx) => ctx.playerLastName && ctx.position ? `${ctx.position} production at this level is a cheat code. ${ctx.playerLastName} is the cheat code.` : null,
    (ctx) => ctx.playerLastName ? `${ctx.playerLastName} fills the HR column, the SB column, and the average column. Three cats nobody else fills together.` : null,
    (ctx) => ctx.playerLastName ? `${ctx.teamName} drafted the rarest bat in the league. The roster is built around him.` : null,
    (ctx) => ctx.playerLastName ? `${ctx.playerLastName}: the kind of player who turns a B-grade draft into an A.` : null,
    (ctx) => ctx.playerLastName ? `Every category, every week. ${ctx.playerLastName} is the engine and the engine does not skip.` : null,
    (ctx) => ctx.playerLastName ? `${ctx.playerLastName} is doing what the projections said one bat in the league might do. He is the one.` : null,
    (ctx) => ctx.playerLastName ? `${ctx.teamName} took the chalk in the first round. The chalk paid in every cat.` : null,
    (ctx) => ctx.playerLastName ? `${ctx.playerLastName}: top-five in HR. Top-ten in SB. Top-twenty in average. The rarest combination on the board.` : null,
    (ctx) => ctx.playerLastName ? `Five-tool bats are why first-round picks matter. ${ctx.playerLastName} is the proof.` : null,
    (ctx) => ctx.playerLastName ? `${ctx.teamName}: ${ctx.playerLastName} is the player the analysts use as the model bat. Every cat on the board.` : null,
    (ctx) => ctx.playerLastName ? `${ctx.playerLastName}. The bat that makes the draft grade.` : null,
  ],
}

/* ─────────────────────────────────────────────────────────────────
   KIND: CATEGORY-KING-LATE-ROUND-GEM
   Late-round breakout king of a cat. Discovery framing.
───────────────────────────────────────────────────────────────── */

const CATEGORY_KING_LATE_ROUND_GEM: DraftTemplate = {
  kind: 'category-king-late-round-gem',
  eyebrows: [
    () => 'LATE-ROUND CAT KING',
    () => 'THE GEM',
    () => 'OUT OF NOWHERE',
    () => 'WIRE-LEVEL CAT KING',
    () => 'THE PICK THAT MOVED THE CAT',
    () => 'LATE-ROUND COLUMN CARRIER',
  ],
  headlines: [
    (ctx) => ctx.playerLastName && ctx.draftRound && ctx.categoryKingCat ? `${ctx.playerLastName} out of R${ctx.draftRound} became the ${ctx.categoryKingCat} king.` : null,
    (ctx) => ctx.playerLastName && ctx.categoryKingCat ? `${ctx.playerLastName}: late-round, ${ctx.categoryKingCat} leader.` : null,
    (ctx) => ctx.playerLastName && ctx.draftRound ? `${ctx.playerLastName} at R${ctx.draftRound}. Top of the column.` : null,
    (ctx) => ctx.playerLastName && ctx.categoryKingCat ? `${ctx.playerLastName} runs ${ctx.categoryKingCat} in the league.` : null,
    (ctx) => ctx.playerLastName ? `${ctx.playerLastName}: the late-round king nobody saw coming.` : null,
    (ctx) => ctx.playerLastName && ctx.categoryKingCat ? `${ctx.teamName} got the ${ctx.categoryKingCat} leader in R${ctx.draftRound ?? 'the late rounds'}.` : null,
    (ctx) => ctx.playerLastName ? `${ctx.playerLastName} cashed the late-round bet.` : null,
    (ctx) => ctx.playerLastName && ctx.categoryKingCat ? `${ctx.playerLastName}: #1 in ${ctx.categoryKingCat}. Drafted at the wire.` : null,
    (ctx) => ctx.playerLastName ? `${ctx.playerLastName}: the gem that built a category.` : null,
    (ctx) => ctx.playerLastName ? `${ctx.teamName} pocketed ${ctx.playerLastName}. The cat is theirs.` : null,
    (ctx) => ctx.playerLastName && ctx.categoryKingCat ? `${ctx.categoryKingCat} king came out of R${ctx.draftRound ?? 'the late rounds'}. ${ctx.playerLastName}.` : null,
    (ctx) => ctx.playerLastName ? `${ctx.playerLastName}: nobody drafted him to do this. He is doing it anyway.` : null,
    (ctx) => ctx.playerLastName && ctx.categoryKingCat ? `${ctx.playerLastName}: top of the ${ctx.categoryKingCat} sheet. Late-round price tag.` : null,
    (ctx) => ctx.playerLastName ? `${ctx.playerLastName}. The pick the projections circled. The pick the room let slide.` : null,
  ],
  bodies: [
    (ctx) => ctx.playerLastName && ctx.draftRound && ctx.categoryKingCat ? `${ctx.playerLastName} was drafted in R${ctx.draftRound}. He leads the league in ${ctx.categoryKingCat}. That is the definition of a late-round gem.` : null,
    (ctx) => ctx.playerLastName && ctx.categoryKingCat ? `${ctx.playerLastName} is the #1 contributor to ${ctx.teamName}'s ${ctx.categoryKingCat} column. He cost a late-round pick.` : null,
    (ctx) => ctx.playerLastName ? `${ctx.teamName} got the cat for free. ${ctx.playerLastName} did the rest.` : null,
    (ctx) => ctx.playerLastName && ctx.categoryKingCat ? `One pick can build a category. ${ctx.playerLastName} built ${ctx.categoryKingCat} for ${ctx.teamName}.` : null,
    (ctx) => ctx.playerLastName && ctx.draftRound && ctx.draftRound >= 15 ? `R${ctx.draftRound} pick. Top-of-the-league production in his cat. Nobody else got that kind of late-round value.` : null,
    (ctx) => ctx.playerLastName ? `${ctx.playerLastName}: the player who turned a B-grade draft into an A by himself.` : null,
    (ctx) => ctx.playerLastName ? `${ctx.teamName} drafted ${ctx.playerLastName} as a flier. The flier became the cat king.` : null,
    (ctx) => ctx.playerLastName && ctx.categoryKingCat ? `${ctx.categoryKingCat} is the deepest cat in the league. ${ctx.playerLastName} runs it from a R-${ctx.draftRound ?? 'late'} ADP.` : null,
    (ctx) => ctx.playerLastName ? `${ctx.teamName} did the homework. ${ctx.playerLastName} paid the homework back with the column.` : null,
    (ctx) => ctx.playerLastName ? `Late-round gems are what win drafts. ${ctx.playerLastName} is that gem.` : null,
    (ctx) => ctx.playerLastName ? `${ctx.playerLastName}: the kind of pick that gets clipped and shared in every Sunday recap.` : null,
    (ctx) => ctx.playerLastName && ctx.categoryKingCat ? `${ctx.playerLastName} accounts for nearly a quarter of ${ctx.teamName}'s ${ctx.categoryKingCat} production. One late-round bat.` : null,
    (ctx) => ctx.playerLastName ? `${ctx.teamName} drafted depth. The depth turned into a category leader.` : null,
    (ctx) => ctx.playerLastName ? `${ctx.playerLastName}. The pick the league talked themselves out of. The pick that built a cat.` : null,
  ],
}

/* ─────────────────────────────────────────────────────────────────
   KIND: CATEGORY-KING-BROKEN-CAT
   First-round bust whose collapse broke a category. Cause-and-effect.
───────────────────────────────────────────────────────────────── */

const CATEGORY_KING_BROKEN_CAT: DraftTemplate = {
  kind: 'category-king-broken-cat',
  eyebrows: [
    () => 'THE BROKEN CATEGORY',
    () => 'ONE PICK, ONE BROKEN COLUMN',
    () => 'THE CAT THAT NEVER RECOVERED',
    () => 'EARLY-ROUND COLLAPSE',
    () => 'THE BUST THAT BROKE A CAT',
    () => 'COLUMN COLLAPSE',
  ],
  headlines: [
    (ctx) => ctx.brokenCatPlayerName && ctx.brokenCat ? `${ctx.brokenCatPlayerName}'s collapse took ${ctx.brokenCat} off the table for ${ctx.teamName}.` : null,
    (ctx) => ctx.brokenCatPlayerName ? `${ctx.brokenCatPlayerName} cratered. The cat went with him.` : null,
    (ctx) => ctx.brokenCatPlayerName && ctx.brokenCat ? `${ctx.brokenCatPlayerName} ${pick(SYN.COLLAPSED)}. ${ctx.brokenCat} broke.` : null,
    (ctx) => ctx.brokenCatPlayerName ? `${ctx.brokenCatPlayerName} disappeared. ${ctx.teamName} lost the cat with him.` : null,
    (ctx) => ctx.brokenCatPlayerName && ctx.brokenCat ? `${ctx.teamName}: ${ctx.brokenCatPlayerName} fell, ${ctx.brokenCat} fell too.` : null,
    (ctx) => ctx.brokenCatPlayerName ? `${ctx.brokenCatPlayerName}: the pick that took a category with him.` : null,
    (ctx) => ctx.brokenCatPlayerName && ctx.brokenCat ? `${ctx.brokenCatPlayerName} was ${ctx.brokenCat}. There is no ${ctx.brokenCat} now.` : null,
    (ctx) => ctx.brokenCatPlayerName ? `${ctx.brokenCatPlayerName} ${pick(SYN.COLLAPSED)}. The roster has a hole.` : null,
    (ctx) => ctx.brokenCatPlayerName && ctx.brokenCat ? `One bust broke ${ctx.brokenCat} for ${ctx.teamName}. ${ctx.brokenCatPlayerName}.` : null,
    (ctx) => ctx.brokenCatPlayerName ? `${ctx.teamName} drafted ${ctx.brokenCatPlayerName} as the anchor. The anchor sank.` : null,
    (ctx) => ctx.brokenCatPlayerName && ctx.brokenCat ? `${ctx.brokenCatPlayerName}'s year-long slump is the reason ${ctx.brokenCat} is dead.` : null,
    (ctx) => ctx.brokenCatPlayerName ? `${ctx.brokenCatPlayerName} did not show up. The cat did not show up with him.` : null,
    (ctx) => ctx.brokenCatPlayerName && ctx.brokenCat ? `${ctx.teamName}: ${ctx.brokenCat} is broken. ${ctx.brokenCatPlayerName} broke it.` : null,
  ],
  bodies: [
    (ctx) => ctx.brokenCatPlayerName && ctx.brokenCat ? `${ctx.brokenCatPlayerName} was drafted to anchor ${ctx.brokenCat}. He did not. The cat is dead last in the league for ${ctx.teamName}.` : null,
    (ctx) => ctx.brokenCatPlayerName && ctx.brokenCat ? `${ctx.brokenCat} was supposed to be ${ctx.teamName}'s easy cat. ${ctx.brokenCatPlayerName} took that off the table.` : null,
    (ctx) => ctx.brokenCatPlayerName ? `One early-round bust can break a category. ${ctx.brokenCatPlayerName} did exactly that for ${ctx.teamName}.` : null,
    (ctx) => ctx.brokenCatPlayerName && ctx.brokenCat ? `${ctx.teamName} drafted ${ctx.brokenCatPlayerName} in the early rounds for ${ctx.brokenCat} production. There is no ${ctx.brokenCat} production.` : null,
    (ctx) => ctx.brokenCatPlayerName ? `${ctx.brokenCatPlayerName} ${pick(SYN.COLLAPSED)} in May. The cat has not recovered since.` : null,
    (ctx) => ctx.brokenCatPlayerName && ctx.brokenCat ? `${ctx.teamName} is bottom-three in ${ctx.brokenCat} because of one pick. ${ctx.brokenCatPlayerName}.` : null,
    (ctx) => ctx.brokenCatPlayerName ? `Injuries, slumps, both. The category never recovered. ${ctx.brokenCatPlayerName} was the foundation and the foundation cracked.` : null,
    (ctx) => ctx.brokenCatPlayerName && ctx.brokenCat ? `${ctx.brokenCatPlayerName} was a top-three ${ctx.brokenCat} bat last year. He has been outside the top-fifty this year. ${ctx.teamName} drafted last year's projections.` : null,
    (ctx) => ctx.brokenCatPlayerName ? `${ctx.teamName} cannot replace ${ctx.brokenCatPlayerName} on the wire. The cat is going to stay broken.` : null,
    (ctx) => ctx.brokenCatPlayerName && ctx.brokenCat ? `${ctx.brokenCat} is the cat the entire draft was built around. ${ctx.brokenCatPlayerName}'s collapse undid the build.` : null,
    (ctx) => ctx.brokenCatPlayerName ? `${ctx.teamName} bet on the name. The name did not show up. The category did not either.` : null,
    (ctx) => ctx.brokenCatPlayerName && ctx.brokenCat ? `${ctx.brokenCatPlayerName} was twenty percent of the projected ${ctx.brokenCat} production. He has been zero percent of the actual.` : null,
    (ctx) => ctx.brokenCatPlayerName ? `One pick can sink a category for a season. ${ctx.brokenCatPlayerName} sank one.` : null,
  ],
}

/* ─────────────────────────────────────────────────────────────────
   KIND: BY-THE-ROUND-SUMMARY
   Round-by-round narrative sentences.
───────────────────────────────────────────────────────────────── */

const BY_THE_ROUND_SUMMARY: DraftTemplate = {
  kind: 'by-the-round-summary',
  eyebrows: [
    (ctx) => ctx.roundNumber ? `ROUND ${ctx.roundNumber}` : 'BY THE ROUND',
    () => 'ROUND-BY-ROUND',
    () => 'THE ROUND, GRADED',
    () => 'THE ROUND, REVIEWED',
    (ctx) => ctx.roundNumber && ctx.roundNumber <= 5 ? 'THE EARLY ROUNDS' : ctx.roundNumber && ctx.roundNumber >= 15 ? 'THE LATE ROUNDS' : 'THE MIDDLE ROUNDS',
    () => 'POST-DRAFT BREAKDOWN',
  ],
  headlines: [
    /* hit-led */
    (ctx) => ctx.roundNumber && ctx.roundHitCount && ctx.roundHitCount >= 7 ? `Round ${ctx.roundNumber} was ${pick(SYN.ROUND_HIT)}.` : null,
    (ctx) => ctx.roundNumber && ctx.roundHitCount && ctx.roundHitCount >= 7 ? `Round ${ctx.roundNumber}: ${plural(ctx.roundHitCount, 'hit')} out of ten.` : null,
    (ctx) => ctx.roundNumber && ctx.roundTopPlayerLastName ? `Round ${ctx.roundNumber}: ${ctx.roundTopPlayerLastName} was the steal.` : null,
    (ctx) => ctx.roundNumber && ctx.roundHitCount && ctx.roundHitCount >= 8 ? `Round ${ctx.roundNumber} ${pick(SYN.DELIVERED)}.` : null,

    /* miss-led */
    (ctx) => ctx.roundNumber && ctx.roundMissCount && ctx.roundMissCount >= 6 ? `Round ${ctx.roundNumber} was ${pick(SYN.ROUND_MISS)}.` : null,
    (ctx) => ctx.roundNumber && ctx.roundMissCount && ctx.roundMissCount >= 6 ? `Round ${ctx.roundNumber}: ${plural(ctx.roundMissCount, 'miss', 'misses')} out of ten.` : null,
    (ctx) => ctx.roundNumber && ctx.roundBustPlayerLastName ? `Round ${ctx.roundNumber}: ${ctx.roundBustPlayerLastName} was the bust.` : null,
    (ctx) => ctx.roundNumber && ctx.roundMissCount && ctx.roundMissCount >= 7 ? `Round ${ctx.roundNumber} ${pick(SYN.COLLAPSED)}.` : null,

    /* mixed / balanced */
    (ctx) => ctx.roundNumber ? `Round ${ctx.roundNumber}: mixed bag.` : null,
    (ctx) => ctx.roundNumber && ctx.roundHitCount && ctx.roundMissCount ? `Round ${ctx.roundNumber}: ${ctx.roundHitCount} hits, ${ctx.roundMissCount} misses.` : null,
    (ctx) => ctx.roundNumber ? `Round ${ctx.roundNumber} held the line.` : null,
    (ctx) => ctx.roundNumber && ctx.roundAvgValue !== undefined ? `Round ${ctx.roundNumber}: ${fmtValue(ctx.roundAvgValue)} avg value.` : null,

    /* round-specific framings */
    (ctx) => ctx.roundNumber === 1 ? `Round 1: the foundation.` : null,
    (ctx) => ctx.roundNumber === 1 && ctx.roundHitCount && ctx.roundHitCount >= 8 ? `Round 1 was clean. Almost every pick has paid.` : null,
    (ctx) => ctx.roundNumber === 1 && ctx.roundMissCount && ctx.roundMissCount >= 3 ? `Round 1: three early-round busts. The league grade dropped.` : null,
    (ctx) => ctx.roundNumber === 2 && ctx.roundHitCount && ctx.roundHitCount >= 7 ? `Round 2 held up. The picks did the work.` : null,
    (ctx) => ctx.roundNumber === 2 ? `Round 2: the round that separates contenders from the rest.` : null,
    (ctx) => ctx.roundNumber === 3 ? `Round 3: the round that built lineups.` : null,
    (ctx) => ctx.roundNumber === 4 && ctx.roundMissCount && ctx.roundMissCount >= 5 ? `Round 4 was a graveyard.` : null,
    (ctx) => ctx.roundNumber === 5 ? `Round 5: the depth round.` : null,
    (ctx) => ctx.roundNumber && ctx.roundNumber >= 6 && ctx.roundNumber <= 10 ? `Round ${ctx.roundNumber}: the middle. The middle pays the bills.` : null,
    (ctx) => ctx.roundNumber && ctx.roundNumber >= 11 && ctx.roundNumber <= 14 ? `Round ${ctx.roundNumber}: the late-middle. This is where bench bats come from.` : null,
    (ctx) => ctx.roundNumber && ctx.roundNumber >= 15 ? `Round ${ctx.roundNumber}: late. The fliers live here.` : null,
    (ctx) => ctx.roundNumber && ctx.roundNumber >= 18 ? `Round ${ctx.roundNumber}: deep. The wire was already calling.` : null,

    /* position-flavor */
    (ctx) => ctx.roundNumber && ctx.roundDominantPosition === 'SP' ? `Round ${ctx.roundNumber}: the SP run.` : null,
    (ctx) => ctx.roundNumber && ctx.roundDominantPosition === 'C' ? `Round ${ctx.roundNumber}: the catcher run.` : null,
    (ctx) => ctx.roundNumber && ctx.roundDominantPosition === 'RP' ? `Round ${ctx.roundNumber}: the closer run.` : null,

    /* two-fragment */
    (ctx) => ctx.roundNumber && ctx.roundTopPlayerLastName && ctx.roundBustPlayerLastName ? `Round ${ctx.roundNumber}: ${ctx.roundTopPlayerLastName} cashed. ${ctx.roundBustPlayerLastName} burned.` : null,
    (ctx) => ctx.roundNumber === 1 ? `Round 1 set the tone. The tone has held.` : null,
  ],
  bodies: [
    (ctx) => ctx.roundNumber && ctx.roundHitCount && ctx.roundMissCount ? `Round ${ctx.roundNumber}: ${plural(ctx.roundHitCount, 'hit')} and ${plural(ctx.roundMissCount, 'miss', 'misses')}. The round graded out fair.` : null,
    (ctx) => ctx.roundNumber && ctx.roundAvgValue !== undefined ? `Round ${ctx.roundNumber}: ${fmtValue(ctx.roundAvgValue)} average value across ten picks.` : null,
    (ctx) => ctx.roundNumber && ctx.roundTopPlayerLastName && ctx.roundBustPlayerLastName ? `Round ${ctx.roundNumber} had the year's biggest steal in ${ctx.roundTopPlayerLastName}. It also had ${ctx.roundBustPlayerLastName}, who never showed up.` : null,
    (ctx) => ctx.roundNumber === 1 ? `Round 1 sets the tone for every roster. ${ctx.roundHitCount ?? 'Most'} of the ten picks paid this year.` : null,
    (ctx) => ctx.roundNumber === 2 && ctx.roundMissCount && ctx.roundMissCount >= 4 ? `Round 2 hurt the league. Four-plus misses out of ten and the early-round busts are the conversation.` : null,
    (ctx) => ctx.roundNumber === 3 && ctx.roundHitCount && ctx.roundHitCount >= 7 ? `Round 3 was the round that built lineups. Seven of ten picks landed.` : null,
    (ctx) => ctx.roundNumber === 4 && ctx.roundMissCount && ctx.roundMissCount >= 5 ? `Round 4 was a graveyard. Half the picks have not produced. The owners who hit here are leading.` : null,
    (ctx) => ctx.roundNumber === 5 ? `Round 5 is the depth round. The teams that hit here have benches. The teams that did not are running thin.` : null,
    (ctx) => ctx.roundNumber && ctx.roundNumber >= 6 && ctx.roundNumber <= 10 ? `The middle of the draft is where the season gets won and lost. Round ${ctx.roundNumber} was ${ctx.roundHitCount && ctx.roundHitCount >= 5 ? 'a winner' : 'a coin flip'}.` : null,
    (ctx) => ctx.roundNumber && ctx.roundNumber >= 15 ? `By round ${ctx.roundNumber} the owners were taking fliers. Most fliers do not pay. A few did.` : null,
    (ctx) => ctx.roundNumber && ctx.roundTopPlayerLastName ? `${ctx.roundTopPlayerLastName} was the round-${ctx.roundNumber} steal. The kind of pick that wins drafts.` : null,
    (ctx) => ctx.roundNumber && ctx.roundBustPlayerLastName ? `${ctx.roundBustPlayerLastName} was the round-${ctx.roundNumber} bust. The kind of pick that sinks grades.` : null,
    (ctx) => ctx.roundNumber && ctx.roundDominantPosition === 'SP' ? `Round ${ctx.roundNumber} was the SP run. Six of ten picks were starting pitchers. The arms moved as a tier.` : null,
    (ctx) => ctx.roundNumber && ctx.roundDominantPosition === 'C' ? `Round ${ctx.roundNumber} was the catcher run. Five of ten picks were behind the plate. The position thinned fast.` : null,
    (ctx) => ctx.roundNumber && ctx.roundDominantPosition === 'RP' ? `Round ${ctx.roundNumber} was the closer run. Saves are the hardest cat to draft and the room knew it.` : null,
    (ctx) => ctx.roundNumber && ctx.roundAvgValue !== undefined && ctx.roundAvgValue >= 10 ? `Round ${ctx.roundNumber}: average value of ${fmtValue(ctx.roundAvgValue)}. The board cooperated.` : null,
    (ctx) => ctx.roundNumber && ctx.roundAvgValue !== undefined && ctx.roundAvgValue <= -10 ? `Round ${ctx.roundNumber}: average value of ${fmtValue(ctx.roundAvgValue)}. The board did not cooperate.` : null,
    (ctx) => ctx.roundNumber ? `Round ${ctx.roundNumber} graded out as expected. The shape of the round held.` : null,
  ],
}

/* ─────────────────────────────────────────────────────────────────
   KIND: QUICK-READ
   Ultra-compressed footer pill labels.
───────────────────────────────────────────────────────────────── */

const QUICK_READ: DraftTemplate = {
  kind: 'quick-read',
  eyebrows: [
    () => 'QUICK READ',
    () => 'AT A GLANCE',
    () => 'THE QUICK HITS',
    () => 'POST-DRAFT NOTES',
    () => 'IN A LINE',
    () => 'THE TAKEAWAY',
  ],
  headlines: [
    /* highest-value-pick */
    (ctx) => ctx.quickReadKind === 'highest-value-pick' && ctx.playerLastName && ctx.valueLabel ? `Best value: ${ctx.playerLastName} ${ctx.valueLabel}.` : null,
    (ctx) => ctx.quickReadKind === 'highest-value-pick' && ctx.playerLastName ? `Best pick: ${ctx.playerLastName}.` : null,
    (ctx) => ctx.quickReadKind === 'highest-value-pick' && ctx.playerLastName && ctx.draftRound ? `${ctx.playerLastName} at R${ctx.draftRound}: steal.` : null,
    (ctx) => ctx.quickReadKind === 'highest-value-pick' && ctx.playerLastName ? `Steal of the draft: ${ctx.playerLastName}.` : null,
    (ctx) => ctx.quickReadKind === 'highest-value-pick' ? `Best value pick of the draft.` : null,

    /* biggest-bust */
    (ctx) => ctx.quickReadKind === 'biggest-bust' && ctx.playerLastName && ctx.valueLabel ? `Worst pick: ${ctx.playerLastName} ${ctx.valueLabel}.` : null,
    (ctx) => ctx.quickReadKind === 'biggest-bust' && ctx.playerLastName ? `Biggest bust: ${ctx.playerLastName}.` : null,
    (ctx) => ctx.quickReadKind === 'biggest-bust' && ctx.playerLastName && ctx.draftRound ? `${ctx.playerLastName} at R${ctx.draftRound}: bust.` : null,
    (ctx) => ctx.quickReadKind === 'biggest-bust' && ctx.playerLastName ? `Bust of the draft: ${ctx.playerLastName}.` : null,
    (ctx) => ctx.quickReadKind === 'biggest-bust' ? `Worst value pick of the draft.` : null,

    /* best-late-round */
    (ctx) => ctx.quickReadKind === 'best-late-round' && ctx.playerLastName && ctx.valueLabel ? `Best late-round: ${ctx.playerLastName} ${ctx.valueLabel}.` : null,
    (ctx) => ctx.quickReadKind === 'best-late-round' && ctx.playerLastName ? `Late-round king: ${ctx.playerLastName}.` : null,
    (ctx) => ctx.quickReadKind === 'best-late-round' && ctx.playerLastName && ctx.draftRound ? `${ctx.playerLastName} (R${ctx.draftRound}): the gem.` : null,
    (ctx) => ctx.quickReadKind === 'best-late-round' && ctx.playerLastName ? `Best late-round pick: ${ctx.playerLastName}.` : null,
    (ctx) => ctx.quickReadKind === 'best-late-round' ? `Best late-round bet of the draft.` : null,

    /* most-categories-delivered */
    (ctx) => ctx.quickReadKind === 'most-categories-delivered' && ctx.playerLastName && ctx.categoryKingCatsCovered ? `${ctx.playerLastName}: ${ctx.categoryKingCatsCovered} cats.` : null,
    (ctx) => ctx.quickReadKind === 'most-categories-delivered' && ctx.playerLastName ? `Most cats: ${ctx.playerLastName}.` : null,
    (ctx) => ctx.quickReadKind === 'most-categories-delivered' && ctx.playerLastName ? `${ctx.playerLastName}: five-tool.` : null,
    (ctx) => ctx.quickReadKind === 'most-categories-delivered' && ctx.playerLastName ? `Category king: ${ctx.playerLastName}.` : null,
    (ctx) => ctx.quickReadKind === 'most-categories-delivered' ? `Most categories delivered.` : null,
  ],
  bodies: [
    /* highest-value-pick */
    (ctx) => ctx.quickReadKind === 'highest-value-pick' && ctx.playerLastName && ctx.draftRound && ctx.teamName ? `${ctx.playerLastName} in R${ctx.draftRound}. ${ctx.teamName} pocketed the steal.` : null,
    (ctx) => ctx.quickReadKind === 'highest-value-pick' && ctx.playerLastName && ctx.valueLabel ? `${ctx.valueLabel} vs ADP. ${ctx.playerLastName}.` : null,
    (ctx) => ctx.quickReadKind === 'highest-value-pick' && ctx.teamName ? `${ctx.teamName} got the steal of the year.` : null,

    /* biggest-bust */
    (ctx) => ctx.quickReadKind === 'biggest-bust' && ctx.playerLastName && ctx.draftRound && ctx.teamName ? `${ctx.playerLastName} in R${ctx.draftRound}. ${ctx.teamName} ate the cost.` : null,
    (ctx) => ctx.quickReadKind === 'biggest-bust' && ctx.playerLastName && ctx.valueLabel ? `${ctx.valueLabel} vs ADP. ${ctx.playerLastName}.` : null,
    (ctx) => ctx.quickReadKind === 'biggest-bust' && ctx.teamName ? `${ctx.teamName} took the year's biggest bust.` : null,

    /* best-late-round */
    (ctx) => ctx.quickReadKind === 'best-late-round' && ctx.playerLastName && ctx.draftRound && ctx.teamName ? `${ctx.playerLastName} in R${ctx.draftRound}. ${ctx.teamName} cashed the late-round flier.` : null,
    (ctx) => ctx.quickReadKind === 'best-late-round' && ctx.playerLastName && ctx.categoryKingCat ? `${ctx.playerLastName}: late-round ${ctx.categoryKingCat} leader.` : null,
    (ctx) => ctx.quickReadKind === 'best-late-round' && ctx.teamName ? `${ctx.teamName} found the late-round gem.` : null,

    /* most-categories-delivered */
    (ctx) => ctx.quickReadKind === 'most-categories-delivered' && ctx.playerLastName && ctx.categoryKingCatsCovered ? `${ctx.playerLastName}: top-ten in ${plural(ctx.categoryKingCatsCovered, 'cat')}.` : null,
    (ctx) => ctx.quickReadKind === 'most-categories-delivered' && ctx.playerLastName ? `${ctx.playerLastName}: every column on the sheet.` : null,
    (ctx) => ctx.quickReadKind === 'most-categories-delivered' && ctx.teamName ? `${ctx.teamName} drafted the unicorn.` : null,
  ],
}

/* ─────────────────────────────────────────────────────────────────
   PUBLIC API
───────────────────────────────────────────────────────────────── */

export const draftTemplates: Record<DraftKind, DraftTemplate> = {
  'best-draft-hero': BEST_DRAFT_HERO,
  'steal-of-draft': STEAL_OF_DRAFT,
  'bust-of-draft': BUST_OF_DRAFT,
  'team-grade-narrative': TEAM_GRADE_NARRATIVE,
  'punt-success': PUNT_SUCCESS,
  'punt-failure': PUNT_FAILURE,
  'punt-balanced': PUNT_BALANCED,
  'category-king-five-tool': CATEGORY_KING_FIVE_TOOL,
  'category-king-late-round-gem': CATEGORY_KING_LATE_ROUND_GEM,
  'category-king-broken-cat': CATEGORY_KING_BROKEN_CAT,
  'by-the-round-summary': BY_THE_ROUND_SUMMARY,
  'quick-read': QUICK_READ,
}

/**
 * Render a draft beat — returns the eyebrow, headline, and body strings.
 *
 * Filters templates by their self-veto (`fn` returns null) before
 * picking a random one from the surviving pool. If nothing survives
 * the filter, falls back to a safe default string.
 */
export function renderDraft(kind: DraftKind, ctx: DraftContext): {
  eyebrow: string
  headline: string
  body: string
} {
  const template = draftTemplates[kind]
  return {
    eyebrow: renderOne(template.eyebrows, ctx) ?? 'DRAFT',
    headline: renderOne(template.headlines, ctx) ?? `${ctx.teamName}. Draft graded.`,
    body: renderOne(template.bodies, ctx) ?? `The grade is in.`,
  }
}

function renderOne(variants: VariantFn[], ctx: DraftContext): string | undefined {
  const rendered = variants
    .map((fn) => fn(ctx))
    .filter((s): s is string => typeof s === 'string' && s.length > 0)
  if (rendered.length === 0) return undefined
  return rendered[Math.floor(Math.random() * rendered.length)]
}

/* Re-export the synonym pool key list for tests / introspection. */
export const draftSynonymKeys = Object.keys(SYN)

/* Use markers to satisfy the linter on unused helpers when this file
   is consumed by a build that tree-shakes aggressively. The helpers
   are referenced by templates above but the bucket helpers below are
   kept as exports for downstream filters (e.g., a future "headlines
   only for top-grade teams" picker). */
export const draftGradeBuckets = {
  isTopGrade,
  isMidGrade,
  isBottomGrade,
}
