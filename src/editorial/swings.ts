/**
 * Yesterday's Big Swings — Editorial Variant Library
 *
 * Variant pool that powers the daily Home-page player-impact carousel
 * on the category demo. Each "swing kind" (monster bat, ace start,
 * closer save, breakout, gem, bust, comeback, hot week) has its own
 * collection of eyebrow tags, headline templates, and body templates.
 *
 * Templates are functional — each is a function that receives a
 * SwingContext and returns a string. This lets variants react to
 * context (magnitude, player tier, matchup state, first-time vs
 * repeat) without exploding into string permutations.
 *
 * Voice rules: see EDITORIAL.md at the repo root. Re-read it before
 * adding variants. The voice is the whole product.
 *
 * Variant count targets per kind (from the editorial density plan):
 *   eyebrows: 8-10 variants
 *   headlines: 30-40 variants
 *   bodies: 25-30 variants
 *
 * Current state: All 8 kinds fully written at MONSTER-equivalent
 * density (~10 eyebrows / ~30 headlines / ~22 bodies each).
 */

/* ─────────────────────────────────────────────────────────────────
   TYPES
───────────────────────────────────────────────────────────────── */

export type SwingKind =
  | 'monster'   // hitter with multi-cat impact (HR + R + RBI + maybe SB)
  | 'ace'       // pitcher with K + W + ERA impact
  | 'closer'    // relief pitcher with SV
  | 'breakout'  // late-round / waiver-wire player having a moment
  | 'gem'       // setup pitcher with HLD or under-the-radar contributor
  | 'bust'      // highly-owned player flop
  | 'comeback'  // player returning from IL or recent slump
  | 'hot-week'  // cumulative week-running leader (multi-day stretch)

export type CatId =
  | 'R' | 'H' | 'HR' | 'RBI' | 'SB' | 'AVG'
  | 'W' | 'SV' | 'K' | 'HLD' | 'ERA' | 'WHIP'

export interface SwingContext {
  // Player identity
  playerFirstName: string
  playerLastName: string
  playerFullName: string
  position: 'C' | '1B' | '2B' | '3B' | 'SS' | 'OF' | 'DH' | 'SP' | 'RP'
  mlbTeam: string  // 3-letter abbrev

  // Performance numbers (cat-specific deltas this player contributed)
  primaryCat: CatId           // the headline-driving cat
  primaryDelta: number        // signed delta (e.g., +2 HR, +12 K)
  primaryDeltaLabel: string   // pre-formatted "+2 HR" / "+12 K" / "+1 SV"

  // Optional secondary stat slots for body copy
  secondaryDeltas: Array<{ cat: CatId; deltaLabel: string }>

  // Raw stat line as a pre-formatted string ("3-FOR-4 · 2 HR · SB · 4 RBI · 3 R")
  // — fully formatted by the data adapter; templates just slot it in.
  statLine: string

  // Magnitude — how big this performance was, on a 4-tier scale
  magnitude: 'historic' | 'huge' | 'solid' | 'minor'

  // Player tier — informs the framing (a Witt going off is normal;
  // a R18 pick going off is "the breakout"; reframe accordingly)
  playerTier: 'elite-ADP' | 'mid-ADP' | 'late-round' | 'waiver-wire'

  // Player history flags
  isFirstBigGame: boolean   // first time this season this player did this
  hasRecentStreak: boolean  // performance is part of a multi-day run
  streakLength?: number     // if hasRecentStreak, how many days

  // Fantasy team context
  fantasyTeamName: string
  fantasyTeamOwner: string
  isUserTeam: boolean       // wayfinding only — does NOT change voice

  // Matchup state (optional — present when the impact ties to a live matchup)
  matchupImpact?: {
    opponentTeamName: string
    opponentTeamOwner: string
    catBefore: string       // pre-game cat record from this team's perspective, "4-3"
    catAfter: string        // post-game cat record, "5-2"
    catFlipped: boolean     // did the team's overall cat lead flip?
    matchupNowLocked: boolean  // is the matchup now mathematically over?
    contestedCatsRemaining: number
  }
}

/* A single variant function. Returns null/undefined if the variant
   isn't applicable to this context (template's optional self-veto). */
export type VariantFn = (ctx: SwingContext) => string | null | undefined

export interface SwingTemplate {
  kind: SwingKind
  eyebrows: VariantFn[]
  headlines: VariantFn[]
  bodies: VariantFn[]
}

/* ─────────────────────────────────────────────────────────────────
   SYNONYM DICTIONARIES (string pools used inside templates)
───────────────────────────────────────────────────────────────── */

const SYN = {
  WENT_OFF: ['went off', 'dropped a monster', 'put on a show', 'broke out the lumber', 'erupted', 'cooked', 'unloaded', 'crushed it'],
  TOOK_OVER: ['took the lead', 'flipped the cat', 'closed the gap', 'pulled even', 'punched through', 'changed the math'],
  ACE_NIGHT: ['was the ace', 'painted', 'dealt', 'cruised', 'spun a gem', 'pitched to contact for nine'],
  STRUCK_OUT: ['struck out', 'punched out', 'froze', 'whiffed', 'set down'],
  COLLAPSE: ['vanished', 'no-showed', 'went missing', 'disappeared', 'left runners stranded', 'left the bat on his shoulder'],
  HEATER: ['on a heater', 'rolling', 'scorching', 'in a groove', 'untouchable right now'],
  CLOSER_LOCK: ['slammed the door', 'locked it down', 'sealed it', 'hammered it home', 'got the save'],
  BARELY: ['barely', 'just', 'in the end', 'late'],
  EARLY_RETURN: ['the league saw it coming', 'this was always the path', 'the projections agreed', 'no surprise here'],
  PITCH_VERBS: ['dealt', 'painted', 'carved', 'twirled', 'smothered', 'dotted', 'attacked', 'mowed', 'cruised'],
  CLOSE_VERBS: ['slammed the door', 'locked it', 'sealed it', 'hammered it home', 'finished it', 'nailed it'],
  BREAKOUT_VERBS: ['arrived', 'broke out', 'paid off', 'cashed', 'popped', 'announced himself', 'showed up'],
  QUIET: ['Quietly', 'Under the radar', 'Without fanfare', 'No headlines, but'],
  COMEBACK_VERBS: ['woke up', 'snapped back', 'came alive', 'broke the slump', 'shook off the rust', 'found it'],
  SUSTAINED: ["won't cool off", 'is rolling', 'is running it', 'is on a tear', 'is locked in'],
  ZERO: ['0-for-4', '0-fer', 'nothing', 'a goose egg', 'a donut', 'a blank'],
}

/* Pick a random variant from a synonym pool. Templates call this
   inside their string returns so each render is fresh. */
function pick<T>(pool: readonly T[]): T {
  return pool[Math.floor(Math.random() * pool.length)]
}

/* Pluralize helpers */
const plural = (n: number, one: string, many: string = one + 's') => `${n} ${n === 1 ? one : many}`

/* ─────────────────────────────────────────────────────────────────
   KIND: MONSTER (hitter with multi-cat impact night)
   Fully fleshed out — sets the pattern for the other 7 kinds.
───────────────────────────────────────────────────────────────── */

const MONSTER: SwingTemplate = {
  kind: 'monster',
  eyebrows: [
    () => 'MONSTER NIGHT',
    () => 'BIG SWING',
    () => 'EXPLOSION',
    () => 'HE OWNS THE NIGHT',
    () => 'BAT SPEAK',
    () => 'CARRIED THE LINEUP',
    () => 'STAT SHEET STUFFER',
    () => 'GAMEBREAKER',
    () => 'THUNDER',
    (ctx) => ctx.magnitude === 'historic' ? 'CAREER NIGHT' : 'MONSTER NIGHT',
  ],
  headlines: [
    // Punchy 2-3 word headlines
    (ctx) => `${ctx.playerLastName} ${pick(SYN.WENT_OFF)}.`,
    (ctx) => `${ctx.playerLastName} dropped ${plural(ctx.primaryDelta, 'HR')}.`,
    (ctx) => `${ctx.playerLastName} unloaded.`,
    (ctx) => `${ctx.playerLastName} carried it.`,
    (ctx) => `${ctx.playerLastName} cooked.`,

    // Stat-led
    (ctx) => `${ctx.primaryDeltaLabel}. ${ctx.playerLastName}.`,
    (ctx) => `${ctx.playerLastName}: ${ctx.primaryDeltaLabel}.`,
    (ctx) => ctx.primaryDelta >= 2 ? `${plural(ctx.primaryDelta, 'home run')} from ${ctx.playerLastName}.` : null,

    // Context-conditional (player tier)
    (ctx) => ctx.playerTier === 'elite-ADP' ? `${ctx.playerLastName} reminded us why he went R1.` : null,
    (ctx) => ctx.playerTier === 'elite-ADP' ? `${ctx.playerLastName} paid the first-round tax back.` : null,
    (ctx) => ctx.playerTier === 'late-round' ? `${ctx.playerLastName} just changed his ADP forever.` : null,
    (ctx) => ctx.playerTier === 'waiver-wire' ? `Waiver-wire ${ctx.playerLastName} just stole the day.` : null,

    // Context-conditional (magnitude)
    (ctx) => ctx.magnitude === 'historic' ? `${ctx.playerLastName}: career night.` : null,
    (ctx) => ctx.magnitude === 'historic' ? `${ctx.playerLastName} did something nobody else has done this year.` : null,
    (ctx) => ctx.magnitude === 'huge' ? `${ctx.playerLastName} cleared the entire stat sheet.` : null,

    // Context-conditional (matchup flipped)
    (ctx) => ctx.matchupImpact?.catFlipped ? `${ctx.playerLastName} ${pick(SYN.TOOK_OVER)} ${ctx.primaryCat}.` : null,
    (ctx) => ctx.matchupImpact?.matchupNowLocked ? `${ctx.playerLastName} locked the matchup.` : null,
    (ctx) => ctx.matchupImpact?.catFlipped ? `${ctx.fantasyTeamName} now leads ${ctx.primaryCat}. ${ctx.playerLastName} did that.` : null,

    // Numbers-up-front
    (ctx) => ctx.primaryDelta >= 3 ? `${plural(ctx.primaryDelta, 'HR')}. One night.` : null,
    (ctx) => ctx.primaryDelta >= 2 && ctx.secondaryDeltas.length >= 2 ? `${ctx.primaryDeltaLabel}, ${ctx.secondaryDeltas[0].deltaLabel}, ${ctx.secondaryDeltas[1].deltaLabel}. ${ctx.playerLastName}.` : null,

    // Position-flavor
    (ctx) => ['SS', '2B', '3B'].includes(ctx.position) ? `${ctx.playerLastName} hit like a corner.` : null,
    (ctx) => ctx.position === 'C' ? `${ctx.playerLastName}: catcher production you can't draft.` : null,

    // Two-sentence punch
    (ctx) => `${ctx.playerLastName} ${pick(SYN.WENT_OFF)}. The lineup followed.`,
    (ctx) => `${plural(ctx.primaryDelta, 'home run')}. The night was his.`,
    (ctx) => `${ctx.playerLastName} got loose. ${ctx.fantasyTeamName} got the cats.`,

    // Three-fragment rhythm
    (ctx) => `${ctx.playerLastName}. ${ctx.primaryDeltaLabel}. Done.`,
    (ctx) => ctx.matchupImpact ? `${ctx.playerLastName} hit. ${ctx.fantasyTeamName} won the cat. ${ctx.matchupImpact.opponentTeamName} blinked.` : null,

    // Streak-aware
    (ctx) => ctx.hasRecentStreak && ctx.streakLength ? `${ctx.playerLastName} is ${pick(SYN.HEATER)}. Day ${ctx.streakLength} of it.` : null,
    (ctx) => ctx.isFirstBigGame ? `${ctx.playerLastName}'s first real game of the year.` : null,

    // Quiet-confidence flavor
    (ctx) => `Quiet day around the league. Not ${ctx.playerLastName}.`,
    (ctx) => `${ctx.playerLastName} answered the bell.`,
  ],
  bodies: [
    // Stat-line led
    (ctx) => `${ctx.statLine}. ${ctx.matchupImpact ? `${ctx.fantasyTeamName} now leads ${ctx.primaryCat} over ${ctx.matchupImpact.opponentTeamName}.` : ''}`,
    (ctx) => `${ctx.statLine}.`,
    (ctx) => `Stat line: ${ctx.statLine}.`,

    // Matchup-impact framing
    (ctx) => ctx.matchupImpact ? `${ctx.fantasyTeamName} now leads ${ctx.primaryCat} over ${ctx.matchupImpact.opponentTeamName}. ${ctx.matchupImpact.contestedCatsRemaining} cats still up for grabs.` : null,
    (ctx) => ctx.matchupImpact?.matchupNowLocked ? `That locks the matchup. ${ctx.fantasyTeamName} clinches.` : null,
    (ctx) => ctx.matchupImpact?.catFlipped ? `The cat flipped on one swing. ${ctx.fantasyTeamName} ${pick(SYN.TOOK_OVER)} ${ctx.primaryCat}.` : null,
    (ctx) => ctx.matchupImpact && !ctx.matchupImpact.catFlipped ? `Padded the ${ctx.primaryCat} lead. The cat was already going their way.` : null,

    // Tier-conditional context
    (ctx) => ctx.playerTier === 'elite-ADP' ? `This is what the first-round bat looks like when it shows up. ${ctx.fantasyTeamName} drafted him to do exactly this.` : null,
    (ctx) => ctx.playerTier === 'late-round' ? `Drafted in the late teens. Producing like a top-50 bat for two weeks now.` : null,
    (ctx) => ctx.playerTier === 'waiver-wire' ? `Off the wire last Tuesday. Already paid for himself.` : null,

    // Magnitude-conditional
    (ctx) => ctx.magnitude === 'historic' ? `Career game. Nobody else in fantasy baseball did what he did tonight.` : null,
    (ctx) => ctx.magnitude === 'huge' ? `One of the loudest single-game lines of the season.` : null,
    (ctx) => ctx.magnitude === 'solid' ? `Quiet enough that the box score won't trend. Loud enough that ${ctx.fantasyTeamName} took the cat.` : null,

    // Streak-aware
    (ctx) => ctx.hasRecentStreak && ctx.streakLength ? `${ctx.streakLength} days into the run now. ${ctx.fantasyTeamName} is riding it.` : null,
    (ctx) => ctx.hasRecentStreak ? `Two-week tear continuing. The lineup spot is locked.` : null,

    // First-time-this-year
    (ctx) => ctx.isFirstBigGame ? `First real game of the year. The owners who held through April just got their reward.` : null,

    // Punchy two-fragment
    (ctx) => `${ctx.statLine}. That's the kind of night that wins matchups.`,
    (ctx) => `${ctx.statLine}. Box score art.`,

    // Position-flavor
    (ctx) => ctx.position === 'SS' ? `Shortstop production at a corner-bat clip. Roster cheat code.` : null,
    (ctx) => ctx.position === 'C' ? `From the catcher slot. The hardest position to get cats from. ${ctx.fantasyTeamName} just did.` : null,
    (ctx) => ctx.position === 'OF' ? `Outfield depth is hard to find. ${ctx.playerLastName} keeps showing up.` : null,

    // Conversational closers
    (ctx) => `${ctx.fantasyTeamName} owners are fine.`,
    (ctx) => `The group chat is going to hear about it.`,
    (ctx) => ctx.matchupImpact ? `${ctx.matchupImpact.opponentTeamName} needs a counter tomorrow.` : null,
  ],
}

/* ─────────────────────────────────────────────────────────────────
   KIND: ACE (pitcher with K + W + ERA impact)
   SEED — 8 headlines + 7 bodies + 6 eyebrows. Expand to 30+ each.
───────────────────────────────────────────────────────────────── */

const ACE: SwingTemplate = {
  kind: 'ace',
  eyebrows: [
    () => 'ACE NIGHT',
    () => 'DOMINANT START',
    () => 'CY-YOUNG LOOK',
    () => 'PAINTED THE CORNERS',
    () => 'PUNCHED OUT THE LINEUP',
    () => 'ROTATION ANCHOR',
    () => 'TEN-YARD STARE',
    () => 'NOBODY TOUCHED IT',
    () => 'K-MACHINE',
    (ctx) => ctx.magnitude === 'historic' ? 'CAREER-BEST START' : 'ACE NIGHT',
  ],
  headlines: [
    // Existing seed
    (ctx) => `${ctx.playerLastName} ${pick(SYN.STRUCK_OUT)} ${ctx.primaryDelta}.`,
    (ctx) => `${ctx.playerLastName} dealt.`,
    (ctx) => `${ctx.primaryDelta} K. ${ctx.playerLastName}.`,
    (ctx) => `${ctx.playerLastName} ${pick(SYN.ACE_NIGHT)}.`,
    (ctx) => ctx.primaryDelta >= 12 ? `${ctx.playerLastName} hit double-digit K.` : null,
    (ctx) => ctx.matchupImpact?.matchupNowLocked ? `${ctx.playerLastName} locked the K race.` : null,
    (ctx) => `${ctx.playerLastName}: ${ctx.statLine.split(' · ').slice(0, 2).join(' · ')}.`,
    (ctx) => ctx.magnitude === 'historic' ? `${ctx.playerLastName}: career-best K night.` : null,

    // Pitching-verb led
    (ctx) => `${ctx.playerLastName} ${pick(SYN.PITCH_VERBS)}.`,
    (ctx) => `${ctx.playerLastName} painted the corners.`,
    (ctx) => `${ctx.playerLastName} carved through the order.`,
    (ctx) => `${ctx.playerLastName} twirled a gem.`,
    (ctx) => `${ctx.playerLastName} smothered the lineup.`,

    // Short, punchy fragments
    (ctx) => `${ctx.primaryDelta} K, zero earned.`,
    (ctx) => `Six innings. Two hits. Nobody touched it.`,
    (ctx) => `${ctx.playerLastName}. Spotless.`,

    // K-count conditionals
    (ctx) => ctx.primaryDelta >= 10 ? `${ctx.primaryDelta} K. The K race just closed.` : null,
    (ctx) => ctx.primaryDelta >= 14 ? `${ctx.playerLastName} punched out ${ctx.primaryDelta}. That is a season.` : null,
    (ctx) => ctx.primaryDelta >= 8 && ctx.primaryDelta < 12 ? `${ctx.playerLastName}: ${ctx.primaryDelta} K, no traffic.` : null,

    // Stat-first
    (ctx) => `${ctx.primaryDeltaLabel}. ${ctx.playerLastName} ${pick(SYN.PITCH_VERBS)}.`,
    (ctx) => `${ctx.primaryDeltaLabel}. Bullpen got the day off.`,

    // Matchup-conditional
    (ctx) => ctx.matchupImpact?.catFlipped ? `${ctx.playerLastName} flipped the K race for ${ctx.fantasyTeamName}.` : null,
    (ctx) => ctx.matchupImpact?.matchupNowLocked ? `K and ERA locked. ${ctx.playerLastName} did that.` : null,
    (ctx) => ctx.matchupImpact && ctx.matchupImpact.contestedCatsRemaining <= 2 ? `${ctx.playerLastName} closed the pitching side.` : null,

    // Tier / streak conditionals
    (ctx) => ctx.playerTier === 'elite-ADP' ? `${ctx.playerLastName} pitched like the SP1 he was drafted as.` : null,
    (ctx) => ctx.playerTier === 'late-round' ? `Late-round ${ctx.playerLastName}. ${ctx.primaryDelta} K and a W.` : null,
    (ctx) => ctx.playerTier === 'waiver-wire' ? `Wire-pickup ${ctx.playerLastName}. Spun seven scoreless.` : null,
    (ctx) => ctx.hasRecentStreak && (ctx.streakLength ?? 0) >= 3 ? `${ctx.playerLastName}: third straight start under two earned.` : null,
    (ctx) => ctx.isFirstBigGame ? `${ctx.playerLastName}'s first complete start of the year.` : null,

    // Two-fragment punch
    (ctx) => `${ctx.playerLastName} attacked. The lineup never settled in.`,
    (ctx) => `${ctx.primaryDelta} K. One walk. Business.`,
    (ctx) => `${ctx.playerLastName} cruised. ${ctx.fantasyTeamName} cashed.`,
  ],
  bodies: [
    // Existing seed
    (ctx) => `${ctx.statLine}. ${ctx.matchupImpact ? `${ctx.fantasyTeamName}'s K lead just got uncatchable.` : ''}`,
    (ctx) => ctx.matchupImpact?.matchupNowLocked ? `Locks K for ${ctx.fantasyTeamName} for the week. ERA followed.` : null,
    (ctx) => `${ctx.statLine}. Two starts left for ${ctx.fantasyTeamName} this week. This was the cushion.`,
    (ctx) => ctx.playerTier === 'elite-ADP' ? `The arm that justified the early-round pick. ${ctx.fantasyTeamName} drafted for exactly this.` : null,
    (ctx) => ctx.hasRecentStreak ? `Third straight quality start. ${ctx.playerLastName} is locked in.` : null,
    (ctx) => `Eight innings of work. The bullpen got the day off.`,
    (ctx) => ctx.matchupImpact?.catFlipped ? `Flipped W and K in the same start. ${ctx.fantasyTeamName} now owns the pitching side.` : null,

    // Stat-line led
    (ctx) => `${ctx.statLine}. Box score art.`,
    (ctx) => `${ctx.statLine}. ERA dropped. WHIP dropped. K column moved.`,
    (ctx) => `${ctx.statLine}. The kind of start that drags a rotation back to the surface.`,

    // Magnitude conditionals
    (ctx) => ctx.magnitude === 'historic' ? `Career-best K total. The arm just rewrote his own ceiling.` : null,
    (ctx) => ctx.magnitude === 'huge' ? `One of the loudest pitching lines of the week. ${ctx.fantasyTeamName} owns the W.` : null,
    (ctx) => ctx.magnitude === 'solid' ? `Quietly clean. Four-hit ball, two walks, the K column got fed.` : null,

    // Matchup-aware
    (ctx) => ctx.matchupImpact && ctx.matchupImpact.catFlipped ? `${ctx.fantasyTeamName} now leads K and ERA over ${ctx.matchupImpact.opponentTeamName}. The start did that on its own.` : null,
    (ctx) => ctx.matchupImpact && !ctx.matchupImpact.catFlipped ? `Padded the K and W columns. The pitching side was already going their way.` : null,
    (ctx) => ctx.matchupImpact ? `${ctx.matchupImpact.contestedCatsRemaining} cats still up for grabs. The pitching side just got harder to chase.` : null,

    // Streak / tier
    (ctx) => ctx.hasRecentStreak && ctx.streakLength ? `${ctx.streakLength} straight starts with double-digit K. The arm is locked in.` : null,
    (ctx) => ctx.playerTier === 'late-round' ? `Drafted as a back-end SP. Pitching like a top-20 arm for a month now.` : null,
    (ctx) => ctx.playerTier === 'waiver-wire' ? `Off the wire two weeks ago. The K column has not been the same since.` : null,
    (ctx) => ctx.isFirstBigGame ? `First complete start of the year. The owners who held through the rough April just got paid.` : null,

    // Closers / quiet
    (ctx) => `Spotless line. The bullpen sat. ${ctx.fantasyTeamName} got six innings of cushion.`,
    (ctx) => `${ctx.playerLastName} pitched to contact when he wanted, struck out the side when he needed. Complete outing.`,
    (ctx) => `Seven innings, one run, ${ctx.primaryDelta} K. The shape of an ace.`,
  ],
}

/* ─────────────────────────────────────────────────────────────────
   KIND: CLOSER (relief pitcher with SV)
   SEED — 7 headlines + 6 bodies + 6 eyebrows.
───────────────────────────────────────────────────────────────── */

const CLOSER: SwingTemplate = {
  kind: 'closer',
  eyebrows: [
    () => 'ANOTHER ONE',
    () => 'SLAMMED THE DOOR',
    () => 'NINTH-INNING WORK',
    () => 'SAVE LOCKED',
    () => 'CLOSE-OUT',
    () => 'BULLPEN BUSINESS',
    () => 'DOOR SLAMMED',
    () => 'NINE PITCHES',
    () => 'LEAD HELD',
    (ctx) => (ctx.streakLength ?? 0) >= 3 ? 'SAVE STREAK' : 'SAVE LOCKED',
  ],
  headlines: [
    // Existing seed
    (ctx) => `${ctx.playerLastName} ${pick(SYN.CLOSER_LOCK)}.`,
    (ctx) => `${ctx.playerLastName} got the save.`,
    (ctx) => `${ctx.primaryDeltaLabel}. ${ctx.playerLastName}.`,
    (ctx) => `${ctx.playerLastName} got the call.`,
    (ctx) => `${ctx.playerLastName}: nine pitches, three outs.`,
    (ctx) => ctx.hasRecentStreak && (ctx.streakLength ?? 0) >= 3 ? `${ctx.playerLastName}: ${plural(ctx.streakLength!, 'save')} in ${ctx.streakLength} days.` : null,
    (ctx) => ctx.matchupImpact?.catFlipped ? `SV flipped. ${ctx.fantasyTeamName} ${pick(SYN.TOOK_OVER)}.` : null,

    // Short, business-like fragments
    (ctx) => `${ctx.playerLastName} ${pick(SYN.CLOSE_VERBS)}.`,
    (ctx) => `Save locked. Holds the lead.`,
    (ctx) => `Ninth-inning business. Door slammed.`,
    (ctx) => `${ctx.playerLastName}. Three up, three down.`,
    (ctx) => `Two pitches, one ball, one out. Routine.`,

    // Number-of-pitches flex
    (ctx) => `${ctx.playerLastName}: eleven pitches, save locked.`,
    (ctx) => `${ctx.playerLastName}: thirteen pitches for the ninth.`,
    (ctx) => `One inning, no traffic. ${ctx.playerLastName}.`,
    (ctx) => `Strike one, strike two, ground out. ${ctx.playerLastName}.`,

    // Numbers-first
    (ctx) => `${ctx.primaryDeltaLabel}. Door shut.`,
    (ctx) => `${ctx.primaryDeltaLabel}. ${ctx.playerLastName} ${pick(SYN.CLOSE_VERBS)}.`,

    // Streak conditionals
    (ctx) => (ctx.streakLength ?? 0) >= 4 ? `${ctx.streakLength} saves in ${ctx.streakLength} days. ${ctx.playerLastName} owns the ninth.` : null,
    (ctx) => (ctx.streakLength ?? 0) >= 2 ? `Back-to-back saves for ${ctx.playerLastName}.` : null,
    (ctx) => ctx.hasRecentStreak ? `${ctx.playerLastName} is rolling. The role is settled.` : null,

    // Matchup conditionals
    (ctx) => ctx.matchupImpact?.matchupNowLocked ? `That locks SV for ${ctx.fantasyTeamName}.` : null,
    (ctx) => ctx.matchupImpact?.catFlipped ? `${ctx.playerLastName} flipped SV for ${ctx.fantasyTeamName}.` : null,
    (ctx) => ctx.matchupImpact && !ctx.matchupImpact.catFlipped ? `Pads the SV lead. ${ctx.fantasyTeamName} keeps the cushion.` : null,
    (ctx) => ctx.matchupImpact && ctx.matchupImpact.contestedCatsRemaining <= 2 ? `Save in. The matchup tightens around two cats.` : null,

    // Tier
    (ctx) => ctx.playerTier === 'waiver-wire' ? `Wire-pickup ${ctx.playerLastName}. Save number ${ctx.primaryDelta} of the season.` : null,
    (ctx) => ctx.playerTier === 'late-round' ? `Late-round closer. The bet is paying.` : null,
    (ctx) => ctx.playerTier === 'elite-ADP' ? `${ctx.playerLastName}: drafted to close. Doing exactly that.` : null,

    // Drama / tension
    (ctx) => `Runners on. Lead by one. ${ctx.playerLastName} ${pick(SYN.CLOSE_VERBS)}.`,
    (ctx) => `Tying run at the plate. ${ctx.playerLastName} got the strikeout.`,
    (ctx) => `${ctx.playerLastName}. Cool head, hot fastball.`,
    (ctx) => `${ctx.playerLastName} finished it.`,
  ],
  bodies: [
    // Existing seed
    (ctx) => `${ctx.statLine}. ${ctx.fantasyTeamName} ${ctx.matchupImpact?.catFlipped ? `takes the SV lead` : `pads the SV race`}${ctx.matchupImpact ? ` over ${ctx.matchupImpact.opponentTeamName}` : ''}.`,
    (ctx) => ctx.matchupImpact ? `${ctx.fantasyTeamName} keeps the SV race alive. Still ${ctx.matchupImpact.catAfter} this week.` : null,
    (ctx) => `Clean ninth. ${ctx.fantasyTeamName} owners breathe out.`,
    (ctx) => ctx.matchupImpact?.matchupNowLocked ? `That locks SV for ${ctx.fantasyTeamName}.` : null,
    (ctx) => ctx.playerTier === 'waiver-wire' ? `Off the wire two weeks ago. Already turned into save volume.` : null,
    (ctx) => `The bullpen role is locked. ${ctx.playerLastName} owns ninth innings.`,

    // Stat-line led
    (ctx) => `${ctx.statLine}. The ninth never felt close.`,
    (ctx) => `${ctx.statLine}. ${ctx.fantasyTeamName} cashes the save column.`,
    (ctx) => `${ctx.statLine}. One-two-three.`,

    // Magnitude
    (ctx) => ctx.magnitude === 'historic' ? `That ties him for the league lead in saves. ${ctx.fantasyTeamName} drafted the right one.` : null,
    (ctx) => ctx.magnitude === 'huge' ? `Save number ${ctx.primaryDelta} on the year. The ninth-inning role is uncontested.` : null,
    (ctx) => ctx.magnitude === 'solid' ? `Routine save. The kind that does not trend. The kind that wins the cat.` : null,

    // Matchup-aware
    (ctx) => ctx.matchupImpact?.catFlipped ? `${ctx.fantasyTeamName} now leads SV over ${ctx.matchupImpact.opponentTeamName}. One pitch, one inning, one cat.` : null,
    (ctx) => ctx.matchupImpact && !ctx.matchupImpact.catFlipped ? `Padded the SV column. The cushion grows.` : null,
    (ctx) => ctx.matchupImpact ? `${ctx.matchupImpact.contestedCatsRemaining} cats still live. Saves is no longer one of them.` : null,

    // Streak / volume
    (ctx) => (ctx.streakLength ?? 0) >= 3 ? `${ctx.streakLength} saves in ${ctx.streakLength} nights. The bullpen role is locked.` : null,
    (ctx) => ctx.hasRecentStreak ? `Six saves in the last ten days. ${ctx.playerLastName} is in form.` : null,

    // Drama / tier
    (ctx) => `Inherited a one-run lead. Left it where he found it.`,
    (ctx) => ctx.playerTier === 'late-round' ? `Late-round closer pick. The owner who waited just got rewarded.` : null,
    (ctx) => ctx.playerTier === 'elite-ADP' ? `Top-five closer ADP. Pitching like it.` : null,
    (ctx) => ctx.isFirstBigGame ? `First save of the year. The role is officially his.` : null,

    // Conversational closers
    (ctx) => `Manager trusts him in the ninth. That trust pays a cat a week.`,
    (ctx) => `${ctx.fantasyTeamName} drafted volume. ${ctx.playerLastName} keeps delivering it.`,
  ],
}

/* ─────────────────────────────────────────────────────────────────
   KIND: BREAKOUT (late-round / waiver-wire having a moment)
   SEED.
───────────────────────────────────────────────────────────────── */

const BREAKOUT: SwingTemplate = {
  kind: 'breakout',
  eyebrows: [
    () => 'BREAKOUT',
    () => 'JUST CHANGED HIS ADP',
    () => 'WAIVER-WIRE GOLD',
    () => 'THE STEAL IS BREATHING',
    () => 'LATE-ROUND PAYOFF',
    () => 'DRAFT-DAY WINNER',
    () => 'HE ARRIVED',
    () => 'OFF THE WIRE',
    () => 'ADP MOVER',
    (ctx) => ctx.playerTier === 'waiver-wire' ? 'WAIVER POP' : 'BREAKOUT',
  ],
  headlines: [
    // Existing seed
    (ctx) => `${ctx.playerLastName} arrived.`,
    (ctx) => `${ctx.playerLastName} broke out.`,
    (ctx) => ctx.playerTier === 'late-round' ? `Late-round ${ctx.playerLastName}. Loud night.` : null,
    (ctx) => ctx.playerTier === 'waiver-wire' ? `${ctx.playerLastName} off the wire. Going off.` : null,
    (ctx) => `${ctx.playerLastName} reminded the league he exists.`,
    (ctx) => `${ctx.primaryDeltaLabel}. ${ctx.playerLastName} ${ctx.playerTier === 'waiver-wire' ? 'off the wire' : 'in the late rounds'}.`,
    (ctx) => `${ctx.playerLastName}: the kind of game that ${pick(['gets you a contract', 'wins waiver wars', 'gets clipped Sunday'])}.`,

    // Verb-led, breakout register
    (ctx) => `${ctx.playerLastName} ${pick(SYN.BREAKOUT_VERBS)}.`,
    (ctx) => `${ctx.playerLastName} cashed.`,
    (ctx) => `${ctx.playerLastName} announced himself.`,
    (ctx) => `${ctx.playerLastName} popped.`,
    (ctx) => `${ctx.playerLastName} paid off.`,

    // Specific-game framing
    (ctx) => `${ctx.playerLastName}: two-run shot, four hits.`,
    (ctx) => `${ctx.playerLastName}. The headline of the night.`,
    (ctx) => `The bat is real. ${ctx.playerLastName}.`,

    // Tier conditionals — late round / waiver
    (ctx) => ctx.playerTier === 'waiver-wire' ? `Off the wire Tuesday. Already paid for himself.` : null,
    (ctx) => ctx.playerTier === 'waiver-wire' ? `${ctx.playerLastName}: wire pickup, monster line.` : null,
    (ctx) => ctx.playerTier === 'late-round' ? `R18 pick. Playing like R6.` : null,
    (ctx) => ctx.playerTier === 'late-round' ? `${ctx.playerLastName} just paid the late-round flier back.` : null,
    (ctx) => ctx.playerTier === 'mid-ADP' ? `${ctx.playerLastName}: the mid-round bet just popped.` : null,

    // Magnitude conditionals
    (ctx) => ctx.magnitude === 'historic' ? `${ctx.playerLastName}: the loudest unranked night of the season.` : null,
    (ctx) => ctx.magnitude === 'huge' ? `${ctx.playerLastName} did it on the biggest stage of his year.` : null,

    // Matchup conditionals
    (ctx) => ctx.matchupImpact?.catFlipped ? `${ctx.playerLastName} flipped ${ctx.primaryCat} on a late-round bat.` : null,
    (ctx) => ctx.matchupImpact?.matchupNowLocked ? `${ctx.playerLastName} locked the matchup. Nobody saw that on draft day.` : null,

    // Streak / first-time
    (ctx) => ctx.isFirstBigGame ? `${ctx.playerLastName}'s first real game. The kind that changes the rest of his year.` : null,
    (ctx) => ctx.hasRecentStreak && (ctx.streakLength ?? 0) >= 3 ? `${ctx.playerLastName}: ${ctx.streakLength} straight. The breakout has shape.` : null,
    (ctx) => ctx.hasRecentStreak ? `${ctx.playerLastName} is rolling. The wire is going to bid Monday.` : null,

    // Two-fragment punch
    (ctx) => `${ctx.playerLastName} arrived. ${ctx.fantasyTeamName} gets the cats.`,
    (ctx) => `Late-round bat. Loud-room result.`,
    (ctx) => `${ctx.playerLastName} ${pick(SYN.BREAKOUT_VERBS)}. The waiver list updates Monday.`,
    (ctx) => `${ctx.primaryDeltaLabel}. The owner who held him just smiled.`,
  ],
  bodies: [
    // Existing seed (with bug fixed — the malformed draftPick template removed)
    (ctx) => `${ctx.statLine}. ${ctx.fantasyTeamName} grabbed him ${ctx.playerTier === 'waiver-wire' ? 'on waivers' : 'in the late rounds'}. Already paid for himself.`,
    (ctx) => `${ctx.statLine}. The owner who took the late-round flier just looks smart.`,
    (ctx) => ctx.matchupImpact?.catFlipped ? `Flipped ${ctx.primaryCat} on a late-round bat. ${ctx.fantasyTeamName} ${pick(SYN.TOOK_OVER)}.` : null,
    (ctx) => ctx.hasRecentStreak ? `Third straight game with a home run. The breakout is real.` : null,
    (ctx) => `Roster percentage is about to spike. The owner who already has him just gets the cats.`,
    (ctx) => `${ctx.statLine}. The shape of this season's late-round winner.`,

    // Stat-line led
    (ctx) => `${ctx.statLine}. The wire is going to bid for him on Monday.`,
    (ctx) => `${ctx.statLine}. Five-tool line on a five-percent-rostered bat.`,
    (ctx) => `${ctx.statLine}. The night that announces a player.`,

    // Tier-conditional
    (ctx) => ctx.playerTier === 'waiver-wire' ? `Picked up off waivers a week ago. Already top-30 at his position over the stretch.` : null,
    (ctx) => ctx.playerTier === 'late-round' ? `Drafted in the late teens. Producing like a top-50 bat over two weeks now.` : null,
    (ctx) => ctx.playerTier === 'mid-ADP' ? `Mid-round bet. The owner who took him over the safer name just got paid.` : null,

    // Magnitude
    (ctx) => ctx.magnitude === 'historic' ? `Career game. From a player nobody had ranked. ${ctx.fantasyTeamName} cashes the breakout.` : null,
    (ctx) => ctx.magnitude === 'huge' ? `One of the loudest single-game lines of the week. From a bat the league was sleeping on.` : null,

    // Matchup
    (ctx) => ctx.matchupImpact?.catFlipped ? `${ctx.fantasyTeamName} now leads ${ctx.primaryCat} over ${ctx.matchupImpact.opponentTeamName}. The bat the league forgot did that.` : null,
    (ctx) => ctx.matchupImpact?.matchupNowLocked ? `Matchup locked. ${ctx.playerLastName} did the work the early-round bats were supposed to.` : null,

    // Streak
    (ctx) => ctx.hasRecentStreak && ctx.streakLength ? `${ctx.streakLength} straight games with extra-base contact. The shape is real.` : null,
    (ctx) => ctx.hasRecentStreak ? `Two weeks of climbing. The waiver percentage will follow.` : null,

    // First-time framing
    (ctx) => ctx.isFirstBigGame ? `First real game of the year. The kind of night that gets every owner in the league refreshing the wire.` : null,

    // Conversational closers
    (ctx) => `The owner who held through April just got the payoff. The rest of the league is bidding Monday.`,
    (ctx) => `Roster rate spikes from here. ${ctx.fantasyTeamName} got there first.`,
    (ctx) => `${ctx.statLine}. The next two weeks decide if this is a moment or a season.`,
  ],
}

/* ─────────────────────────────────────────────────────────────────
   KIND: GEM (setup pitcher with HLD or under-the-radar contributor)
   SEED.
───────────────────────────────────────────────────────────────── */

const GEM: SwingTemplate = {
  kind: 'gem',
  eyebrows: [
    () => 'STEALTH GEM',
    () => 'UNDER-THE-RADAR',
    () => 'EIGHTH-INNING WORK',
    () => 'HOLD SPECIALIST',
    () => 'QUIET PRODUCTION',
    () => 'CAT-SPECIFIC',
    () => 'NO HEADLINES',
    () => 'SETUP-MAN VOLUME',
    () => 'CAT-BOARD MOVER',
    (ctx) => ctx.primaryCat === 'HLD' ? 'HOLDS PILE UP' : 'QUIETLY',
  ],
  headlines: [
    // Existing seed
    (ctx) => `${ctx.playerLastName} has ${plural(ctx.primaryDelta, 'HLD')} this week.`,
    (ctx) => `${ctx.playerLastName}: setup-man volume.`,
    (ctx) => `Quietly: ${ctx.playerLastName}.`,
    (ctx) => `${ctx.playerLastName} keeps showing up.`,
    (ctx) => `${ctx.primaryDeltaLabel}. ${ctx.playerLastName}.`,
    (ctx) => `${ctx.fantasyTeamName}'s ${ctx.primaryCat} engine has a name. ${ctx.playerLastName}.`,

    // Quiet-appreciation register
    (ctx) => `${pick(SYN.QUIET)}: ${ctx.playerLastName} has ${ctx.primaryDelta} this week.`,
    (ctx) => `${pick(SYN.QUIET)}, ${ctx.playerLastName} just padded ${ctx.primaryCat} again.`,
    (ctx) => `${ctx.playerLastName} quietly padded ${ctx.primaryCat}.`,
    (ctx) => `${ctx.playerLastName} ground out another one.`,
    (ctx) => `${ctx.playerLastName}. Same job. Done again.`,

    // Three-fragment specific
    (ctx) => `Setup-man volume. The cat lead grows. ${ctx.playerLastName}.`,
    (ctx) => `${ctx.playerLastName}: another hold, another night.`,
    (ctx) => `The cat-specific role player. Just keeps showing up.`,
    (ctx) => `Box score won't trend. The cat board did.`,

    // Numbers-first
    (ctx) => `${ctx.primaryDeltaLabel}. The cat moved.`,
    (ctx) => `${ctx.primaryDeltaLabel}. Nobody noticed. ${ctx.fantasyTeamName} did.`,

    // Streak conditionals
    (ctx) => (ctx.streakLength ?? 0) >= 3 ? `${ctx.playerLastName}: ${ctx.streakLength} clean appearances in a row.` : null,
    (ctx) => ctx.hasRecentStreak ? `${ctx.playerLastName} keeps stacking ${ctx.primaryCat}.` : null,

    // Matchup conditionals
    (ctx) => ctx.matchupImpact?.catFlipped ? `${ctx.playerLastName} flipped ${ctx.primaryCat}. The quiet ones do that.` : null,
    (ctx) => ctx.matchupImpact?.matchupNowLocked ? `${ctx.primaryCat} locked. Nobody saw who did it.` : null,
    (ctx) => ctx.matchupImpact && !ctx.matchupImpact.catFlipped ? `${ctx.playerLastName} padded the ${ctx.primaryCat} lead. Quietly.` : null,
    (ctx) => ctx.matchupImpact && ctx.matchupImpact.contestedCatsRemaining <= 2 ? `${ctx.playerLastName} ran the ${ctx.primaryCat} cushion to safe.` : null,

    // Tier conditionals
    (ctx) => ctx.playerTier === 'waiver-wire' ? `Off-wire ${ctx.playerLastName}: ${ctx.primaryDelta} ${ctx.primaryCat} this week.` : null,
    (ctx) => ctx.playerTier === 'late-round' ? `Late-round ${ctx.playerLastName}. The cat-specific bet pays.` : null,

    // Position-flavor
    (ctx) => ctx.position === 'RP' ? `${ctx.playerLastName}: eighth-inning work. ${ctx.primaryDelta} holds this week.` : null,
    (ctx) => ctx.position === 'C' ? `${ctx.playerLastName} from the catcher slot. The hardest cat-specific stat to fill.` : null,

    // Two-fragment quiet
    (ctx) => `${ctx.playerLastName}. ${ctx.primaryDeltaLabel}. Done.`,
    (ctx) => `${ctx.playerLastName} got the call. ${ctx.fantasyTeamName} got the cat.`,
    (ctx) => `No fanfare. ${ctx.primaryDeltaLabel}.`,
  ],
  bodies: [
    // Existing seed
    (ctx) => `${ctx.statLine}. ${ctx.fantasyTeamName} now leads ${ctx.primaryCat}${ctx.matchupImpact ? ` over ${ctx.matchupImpact.opponentTeamName}` : ''}.`,
    (ctx) => `Nobody talks about him. ${ctx.fantasyTeamName} just keeps winning ${ctx.primaryCat}.`,
    (ctx) => ctx.matchupImpact?.matchupNowLocked ? `That locks ${ctx.primaryCat}. The cat was always going to come down to this.` : null,
    (ctx) => `The cat-specific role player. The reason ${ctx.fantasyTeamName} doesn't bleed ${ctx.primaryCat}.`,
    (ctx) => ctx.hasRecentStreak ? `Three appearances, three holds. The bullpen role is locked.` : null,
    (ctx) => `${ctx.statLine}. Box score won't trend. Cat board will.`,

    // Stat-line led
    (ctx) => `${ctx.statLine}. ${pick(SYN.QUIET)}, the cat lead grows.`,
    (ctx) => `${ctx.statLine}. A line that does not trend and a cat that does.`,
    (ctx) => `${ctx.statLine}. The reason ${ctx.fantasyTeamName} sits where it sits.`,

    // Magnitude — these tend smaller, register stays quiet
    (ctx) => ctx.magnitude === 'historic' ? `Career month for the setup man. ${ctx.fantasyTeamName} found the right one.` : null,
    (ctx) => ctx.magnitude === 'huge' ? `One of the league leaders in ${ctx.primaryCat} now. From a player nobody drafted.` : null,
    (ctx) => ctx.magnitude === 'solid' ? `Another quiet contribution. The kind that decides cats over the long run.` : null,

    // Matchup-aware
    (ctx) => ctx.matchupImpact?.catFlipped ? `${ctx.primaryCat} flipped on a contribution nobody saw coming. ${ctx.fantasyTeamName} now leads.` : null,
    (ctx) => ctx.matchupImpact && !ctx.matchupImpact.catFlipped ? `Padded the ${ctx.primaryCat} cushion. The opponent has fewer paths every day.` : null,
    (ctx) => ctx.matchupImpact ? `${ctx.matchupImpact.contestedCatsRemaining} cats still up. ${ctx.primaryCat} is not one of them anymore.` : null,

    // Streak / tier
    (ctx) => (ctx.streakLength ?? 0) >= 4 ? `${ctx.streakLength} appearances, ${ctx.streakLength} holds. The bullpen slot is settled.` : null,
    (ctx) => ctx.playerTier === 'waiver-wire' ? `Picked up because the role opened up. Stayed because the cat moved.` : null,
    (ctx) => ctx.playerTier === 'late-round' ? `Drafted as a cat-specific bet. Paying the bet, week after week.` : null,

    // Quiet-appreciation closers
    (ctx) => `Box score art. The deadpan kind.`,
    (ctx) => `${ctx.playerLastName} will not be the player anyone talks about Monday. ${ctx.fantasyTeamName} will be.`,
    (ctx) => `${ctx.statLine}. The cat board moves a little. The kind of move that wins seasons.`,
    (ctx) => `${ctx.playerLastName} accumulated. Game by game. The cat lead is the receipt.`,
  ],
}

/* ─────────────────────────────────────────────────────────────────
   KIND: BUST (highly-owned player flop)
   SEED.
───────────────────────────────────────────────────────────────── */

const BUST: SwingTemplate = {
  kind: 'bust',
  eyebrows: [
    () => 'COLD NIGHT',
    () => 'NO-SHOW',
    () => 'BAT LEFT AT THE HOTEL',
    () => 'GHOSTED',
    () => 'OWNER PAIN',
    () => 'BAT FLIPPED THE WRONG WAY',
    () => 'ANOTHER ZERO',
    () => 'NOTHING DOING',
    () => 'BAT WENT QUIET',
    (ctx) => ctx.playerTier === 'elite-ADP' ? 'R1 PAIN' : 'OWNER PAIN',
  ],
  headlines: [
    // Existing seed
    (ctx) => `${ctx.playerLastName} ${pick(SYN.COLLAPSE)}.`,
    (ctx) => `${ctx.playerLastName}: 0-for-4.`,
    (ctx) => `${ctx.playerLastName} did nothing.`,
    (ctx) => ctx.playerTier === 'elite-ADP' ? `${ctx.playerLastName} owes the first-round tax.` : null,
    (ctx) => `${ctx.playerLastName} took the night off.`,
    (ctx) => ctx.matchupImpact?.catFlipped ? `${ctx.playerLastName}'s 0-fer flipped ${ctx.primaryCat} the wrong way.` : null,

    // Honest, dry, owner-pain register
    (ctx) => `${ctx.playerLastName} went ${pick(SYN.ZERO)}.`,
    (ctx) => `${ctx.playerLastName}: another donut.`,
    (ctx) => `${ctx.playerLastName} left the bat at home.`,
    (ctx) => `${ctx.playerLastName} faded.`,
    (ctx) => `${ctx.playerLastName} ghosted the lineup.`,

    // Three-fragment punch
    (ctx) => `${ctx.playerLastName}. ${pick(SYN.ZERO)}. Again.`,
    (ctx) => `${ctx.playerLastName}: no hits, no walks, no story.`,
    (ctx) => `Bat off. Lineup quiet. ${ctx.playerLastName}.`,

    // Streak / pattern conditionals
    (ctx) => (ctx.streakLength ?? 0) >= 3 ? `${ctx.playerLastName}: third straight 0-fer.` : null,
    (ctx) => (ctx.streakLength ?? 0) >= 5 ? `${ctx.playerLastName}: ${ctx.streakLength} games, no extra-base contact.` : null,
    (ctx) => ctx.hasRecentStreak ? `${ctx.playerLastName} is in a real slump.` : null,

    // Tier conditionals — owner expectation
    (ctx) => ctx.playerTier === 'elite-ADP' ? `R1 pick. Three weeks of nothing.` : null,
    (ctx) => ctx.playerTier === 'elite-ADP' ? `${ctx.playerLastName} drafted top-twelve. Producing like R20.` : null,
    (ctx) => ctx.playerTier === 'mid-ADP' ? `${ctx.playerLastName}: the mid-round name on a long cold streak.` : null,

    // Matchup conditionals
    (ctx) => ctx.matchupImpact?.catFlipped ? `${ctx.fantasyTeamName} just lost ${ctx.primaryCat}. ${ctx.playerLastName}'s zero did that.` : null,
    (ctx) => ctx.matchupImpact && !ctx.matchupImpact.catFlipped ? `${ctx.playerLastName}'s ${pick(SYN.ZERO)}. The ${ctx.primaryCat} lead got thin.` : null,
    (ctx) => ctx.matchupImpact?.matchupNowLocked ? `Matchup gone. ${ctx.playerLastName} did not show.` : null,

    // Quiet honest
    (ctx) => `The bat left town. The owners are calling around.`,
    (ctx) => `Cold night. ${ctx.playerLastName}.`,
    (ctx) => `${ctx.playerLastName} no-showed again.`,
    (ctx) => `${ctx.playerLastName}: bat on the shoulder, twice.`,

    // Position-flavor
    (ctx) => ctx.position === 'C' ? `Catcher cats are hard enough. ${ctx.playerLastName} did not help.` : null,
    (ctx) => ['SS', '2B'].includes(ctx.position) ? `Middle-infield production gone for a night. ${ctx.playerLastName}.` : null,
    (ctx) => `${ctx.playerLastName}. Bat left town. Owners calling around.`,
  ],
  bodies: [
    // Existing seed
    (ctx) => `${ctx.statLine}. ${ctx.fantasyTeamName} needed a real game from him. Didn't get one.`,
    (ctx) => ctx.playerTier === 'elite-ADP' ? `R1 pick. Three weeks of this now. The owner is starting to ask questions.` : null,
    (ctx) => ctx.matchupImpact?.catFlipped ? `${ctx.fantasyTeamName} now trails ${ctx.primaryCat} over ${ctx.matchupImpact.opponentTeamName}.` : null,
    (ctx) => `The kind of zero that costs you the cat.`,
    (ctx) => `Cold streaks happen. This one is happening at the worst time for ${ctx.fantasyTeamName}.`,
    (ctx) => `Three games, two hits, no power. The bat needs to wake up.`,

    // Stat-line led
    (ctx) => `${ctx.statLine}. The bat just is not there.`,
    (ctx) => `${ctx.statLine}. Two weeks of this shape now.`,
    (ctx) => `${ctx.statLine}. The kind of zero that drags the average.`,

    // Magnitude — bust is rarely "historic" but pattern is
    (ctx) => ctx.magnitude === 'huge' ? `One of the worst lines from a top-15 ADP bat this week.` : null,
    (ctx) => ctx.magnitude === 'solid' ? `Not a disaster. Just another quiet night when the lineup needed one.` : null,

    // Streak / pattern
    (ctx) => (ctx.streakLength ?? 0) >= 4 ? `${ctx.streakLength} games, ${ctx.streakLength} cold lines. The shape is real.` : null,
    (ctx) => (ctx.streakLength ?? 0) >= 7 ? `A full week of nothing. The bat is in a real hole.` : null,
    (ctx) => ctx.hasRecentStreak ? `Two-week slide. The lineup spot is starting to feel risky.` : null,

    // Tier
    (ctx) => ctx.playerTier === 'elite-ADP' ? `Top-round pick. The numbers are top-100 over the last month. The math has stopped working.` : null,
    (ctx) => ctx.playerTier === 'mid-ADP' ? `Mid-round bat. The expected contribution has not arrived.` : null,

    // Matchup
    (ctx) => ctx.matchupImpact?.catFlipped ? `The ${ctx.primaryCat} lead flipped. ${ctx.fantasyTeamName} now needs help from the rest of the lineup.` : null,
    (ctx) => ctx.matchupImpact && !ctx.matchupImpact.catFlipped ? `Cushion shrinks. ${ctx.matchupImpact.contestedCatsRemaining} cats still up, fewer paths to most of them.` : null,
    (ctx) => ctx.matchupImpact?.matchupNowLocked ? `Matchup is gone. ${ctx.playerLastName}'s line was not the only reason. It was a reason.` : null,

    // Conversational closers
    (ctx) => `${ctx.fantasyTeamName} owners are starting to ask if the lineup spot is the right one.`,
    (ctx) => `The trade-block whispers start after weeks that look like this.`,
    (ctx) => `${ctx.statLine}. Slumps end. This one has not yet.`,
  ],
}

/* ─────────────────────────────────────────────────────────────────
   KIND: COMEBACK (player returning from IL or recent slump)
   SEED.
───────────────────────────────────────────────────────────────── */

const COMEBACK: SwingTemplate = {
  kind: 'comeback',
  eyebrows: [
    () => 'WELCOME BACK',
    () => 'FIRST GAME OFF THE IL',
    () => 'SLUMP-BREAKER',
    () => 'BACK IN THE LINEUP',
    () => 'RUST OFF',
    () => 'STARTED HOT',
    () => 'BAT IS BACK',
    () => 'RETURN GAME',
    () => 'SLATE WIPED',
    (ctx) => ctx.isFirstBigGame ? 'WELCOME BACK' : 'SLUMP BROKEN',
  ],
  headlines: [
    // Existing seed
    (ctx) => `${ctx.playerLastName} is back.`,
    (ctx) => `${ctx.playerLastName}: first game back, ${ctx.primaryDeltaLabel}.`,
    (ctx) => `${ctx.playerLastName} broke the slump.`,
    (ctx) => `The bat woke up. ${ctx.playerLastName}.`,
    (ctx) => `${ctx.playerLastName} reminded the league.`,

    // Generous "welcome back" register
    (ctx) => `${ctx.playerLastName} ${pick(SYN.COMEBACK_VERBS)}.`,
    (ctx) => `${ctx.playerLastName} found it.`,
    (ctx) => `${ctx.playerLastName} snapped back.`,
    (ctx) => `${ctx.playerLastName} came alive.`,
    (ctx) => `Slump-breaker. ${ctx.playerLastName} woke up tonight.`,

    // Two-fragment punch
    (ctx) => `Rust off. The bat looks like the bat.`,
    (ctx) => `Two weeks of zero. One night that wipes it.`,
    (ctx) => `${ctx.playerLastName} returned. ${ctx.fantasyTeamName} cashed.`,
    (ctx) => `${ctx.playerLastName} got a hit. Then another. Then another.`,

    // Numbers-first
    (ctx) => `${ctx.primaryDeltaLabel}. First game back.`,
    (ctx) => `${ctx.primaryDeltaLabel}. The bat is the bat again.`,

    // IL-specific (first big game flag)
    (ctx) => ctx.isFirstBigGame ? `${ctx.playerLastName}: three hits in his first game off the IL.` : null,
    (ctx) => ctx.isFirstBigGame ? `First game back. ${ctx.primaryDeltaLabel}. Hello again.` : null,
    (ctx) => ctx.isFirstBigGame ? `${ctx.playerLastName}. Welcome back. ${ctx.primaryDeltaLabel}.` : null,

    // Streak-context (slump breaker)
    (ctx) => (ctx.streakLength ?? 0) >= 4 ? `${ctx.playerLastName}: ${ctx.streakLength} cold games, one loud one.` : null,
    (ctx) => ctx.hasRecentStreak ? `${ctx.playerLastName} broke a real cold stretch.` : null,
    (ctx) => `${ctx.playerLastName} shook off the rust.`,

    // Matchup conditionals
    (ctx) => ctx.matchupImpact?.catFlipped ? `${ctx.playerLastName} returns. ${ctx.primaryCat} flips.` : null,
    (ctx) => ctx.matchupImpact?.matchupNowLocked ? `${ctx.playerLastName} came back to lock the matchup.` : null,
    (ctx) => ctx.matchupImpact ? `${ctx.playerLastName}: back in time to swing ${ctx.primaryCat}.` : null,

    // Tier conditionals
    (ctx) => ctx.playerTier === 'elite-ADP' ? `${ctx.playerLastName} returns. The first-round bat is the first-round bat again.` : null,
    (ctx) => ctx.playerTier === 'mid-ADP' ? `${ctx.playerLastName} broke through. The mid-round patience pays.` : null,

    // Quiet warm
    (ctx) => `Welcome back. ${ctx.playerLastName}.`,
    (ctx) => `${ctx.playerLastName}. Bat back.`,
    (ctx) => `One swing. Rust gone.`,
  ],
  bodies: [
    // Existing seed
    (ctx) => `${ctx.statLine}. First real night since the IL stint. ${ctx.fantasyTeamName} owners exhale.`,
    (ctx) => `Two weeks of nothing. One night that wipes the slate.`,
    (ctx) => `${ctx.statLine}. The shape of the bat returning to form.`,
    (ctx) => ctx.matchupImpact?.catFlipped ? `Returns to flip ${ctx.primaryCat} for ${ctx.fantasyTeamName}. Timing matters.` : null,
    (ctx) => `Owners who held through the IL stint just got paid.`,

    // Stat-line led
    (ctx) => `${ctx.statLine}. The first night that looks like the player the owner drafted.`,
    (ctx) => `${ctx.statLine}. Rust off, bat back.`,
    (ctx) => `${ctx.statLine}. The shape of a slump ending.`,

    // IL framing
    (ctx) => ctx.isFirstBigGame ? `First game off the IL. Three hits, a walk, the bat looks healthy.` : null,
    (ctx) => ctx.isFirstBigGame ? `Owners stashed him through the stint. The patience pays right out of the gate.` : null,

    // Magnitude
    (ctx) => ctx.magnitude === 'historic' ? `Loudest comeback game of the week. From a player who was off the field two days ago.` : null,
    (ctx) => ctx.magnitude === 'huge' ? `The kind of return game that erases a cold month in one line.` : null,
    (ctx) => ctx.magnitude === 'solid' ? `Quiet but clean. The bat is finding the right swings again.` : null,

    // Slump framing
    (ctx) => (ctx.streakLength ?? 0) >= 5 ? `${ctx.streakLength} games of cold contact. One loud night that wipes the average.` : null,
    (ctx) => ctx.hasRecentStreak ? `Two-week slump. Broken in one game.` : null,

    // Matchup-aware
    (ctx) => ctx.matchupImpact?.catFlipped ? `${ctx.fantasyTeamName} now leads ${ctx.primaryCat}. The return game arrived right on time.` : null,
    (ctx) => ctx.matchupImpact && !ctx.matchupImpact.catFlipped ? `Padded the ${ctx.primaryCat} cushion. The bat is back when the cushion needed it.` : null,
    (ctx) => ctx.matchupImpact?.matchupNowLocked ? `Matchup locked. ${ctx.playerLastName} came back and finished it.` : null,

    // Tier
    (ctx) => ctx.playerTier === 'elite-ADP' ? `First-round bat. Looked like one tonight. That has not been true for weeks.` : null,
    (ctx) => ctx.playerTier === 'late-round' ? `Late-round name. One loud night does a lot of work for a late-round bat.` : null,

    // Warm closers
    (ctx) => `Owners who held through the cold stretch just got the payoff.`,
    (ctx) => `${ctx.fantasyTeamName} kept faith. Faith paid.`,
    (ctx) => `${ctx.statLine}. The bat looks like the bat. That is the headline.`,
  ],
}

/* ─────────────────────────────────────────────────────────────────
   KIND: HOT-WEEK (cumulative week-running leader)
   SEED.
───────────────────────────────────────────────────────────────── */

const HOT_WEEK: SwingTemplate = {
  kind: 'hot-week',
  eyebrows: [
    () => 'WEEK-LONG TEAR',
    () => "CAN'T COOL HIM OFF",
    () => 'BEST BAT THIS WEEK',
    () => 'RUNNING IT',
    () => "WEEK'S MVP CANDIDATE",
    () => 'HOT SINCE MONDAY',
    () => 'STILL ROLLING',
    () => 'LOCKED IN',
    () => 'WON THE WEEK',
    (ctx) => (ctx.streakLength ?? 0) >= 5 ? 'FIVE STRAIGHT' : 'WEEK-LONG TEAR',
  ],
  headlines: [
    // Existing seed
    (ctx) => `${ctx.playerLastName} won't cool off.`,
    (ctx) => `${ctx.playerLastName}: ${ctx.streakLength ? `${ctx.streakLength} games, every one` : 'every game this week'} a hit.`,
    (ctx) => `${ctx.playerLastName} ${pick(SYN.HEATER)}.`,
    (ctx) => `${ctx.primaryDeltaLabel} this week from ${ctx.playerLastName}.`,
    (ctx) => `${ctx.playerLastName}: best week of his season.`,

    // Sustained / time-anchored register
    (ctx) => `${ctx.playerLastName} ${pick(SYN.SUSTAINED)}.`,
    (ctx) => `${ctx.playerLastName} is locked in.`,
    (ctx) => `${ctx.playerLastName} is on a tear.`,
    (ctx) => `${ctx.playerLastName} is running it.`,
    (ctx) => `${ctx.playerLastName} hot since Monday.`,

    // Time-anchored fragments
    (ctx) => `Since Tuesday: ${ctx.statLine}.`,
    (ctx) => (ctx.streakLength ?? 0) >= 3 ? `${ctx.streakLength} straight. ${ctx.playerLastName} ${pick(SYN.SUSTAINED)}.` : null,
    (ctx) => (ctx.streakLength ?? 0) >= 5 ? `Five straight games with extra bases. ${ctx.playerLastName}.` : null,
    (ctx) => (ctx.streakLength ?? 0) >= 4 ? `${ctx.streakLength} in a row. Nobody is cooling him off.` : null,

    // Numbers-first
    (ctx) => `${ctx.primaryDeltaLabel} this week. Hands down.`,
    (ctx) => `${ctx.primaryDeltaLabel}. The week is his.`,

    // Two-fragment punch
    (ctx) => `${ctx.playerLastName}. Best week of his year.`,
    (ctx) => `The week's MVP. Hands down.`,
    (ctx) => `${ctx.playerLastName} is making the matchup by himself.`,
    (ctx) => `${ctx.playerLastName}: another hit, another night.`,

    // Matchup conditionals
    (ctx) => ctx.matchupImpact?.matchupNowLocked ? `${ctx.playerLastName} locked the matchup. By himself.` : null,
    (ctx) => ctx.matchupImpact?.catFlipped ? `${ctx.playerLastName} flipped ${ctx.primaryCat}. The week did it.` : null,
    (ctx) => ctx.matchupImpact && ctx.matchupImpact.contestedCatsRemaining <= 2 ? `${ctx.playerLastName} ran the week. ${ctx.fantasyTeamName} cashes.` : null,

    // Tier / magnitude
    (ctx) => ctx.playerTier === 'elite-ADP' ? `${ctx.playerLastName} is playing like the player the league pays for.` : null,
    (ctx) => ctx.playerTier === 'waiver-wire' ? `Off-the-wire ${ctx.playerLastName}: the best bat in fantasy this week.` : null,
    (ctx) => ctx.magnitude === 'historic' ? `${ctx.playerLastName}: loudest week of his career.` : null,
    (ctx) => ctx.magnitude === 'huge' ? `${ctx.playerLastName} is the story of the week.` : null,

    // Verb-led
    (ctx) => `Rolling. ${ctx.playerLastName} won't slow down.`,
    (ctx) => `${ctx.playerLastName}. Five days, five lines.`,
    (ctx) => `${ctx.playerLastName} just keeps stacking nights.`,
  ],
  bodies: [
    // Existing seed
    (ctx) => ctx.streakLength ? `${ctx.streakLength} straight games with a hit. ${ctx.fantasyTeamName} owners are riding it.` : null,
    (ctx) => `${ctx.statLine}. Cumulative through ${ctx.streakLength ?? 'mid'} week.`,
    (ctx) => `The kind of week that wins a matchup by itself.`,
    (ctx) => ctx.matchupImpact ? `${ctx.fantasyTeamName} is leading ${ctx.matchupImpact.contestedCatsRemaining > 2 ? 'most' : 'every'} cat. The bat is the difference.` : null,
    (ctx) => `Heater since Tuesday. Cools off when he wants to.`,

    // Stat-line led
    (ctx) => `${ctx.statLine}. Cumulative for the week. ${ctx.fantasyTeamName} is riding it.`,
    (ctx) => `${ctx.statLine}. The week's stat-leader at his position.`,
    (ctx) => `${ctx.statLine}. The kind of seven-day stretch that decides cats.`,

    // Time-anchored bodies
    (ctx) => `Since Tuesday: nine hits, three home runs, eight RBI. ${ctx.playerLastName} is running it.`,
    (ctx) => (ctx.streakLength ?? 0) >= 5 ? `${ctx.streakLength} straight games with extra-base contact. Nobody is cooling him off.` : null,
    (ctx) => (ctx.streakLength ?? 0) >= 7 ? `A full week of production. The lineup spot is locked.` : null,

    // Magnitude
    (ctx) => ctx.magnitude === 'historic' ? `Loudest week from any bat in fantasy. ${ctx.fantasyTeamName} drafted the right one.` : null,
    (ctx) => ctx.magnitude === 'huge' ? `One of the best seven-day stretches anyone is putting up right now.` : null,
    (ctx) => ctx.magnitude === 'solid' ? `Quiet on a per-night basis. Loud cumulatively.` : null,

    // Matchup-aware
    (ctx) => ctx.matchupImpact?.matchupNowLocked ? `Matchup locked. ${ctx.playerLastName} made it look uncontested.` : null,
    (ctx) => ctx.matchupImpact?.catFlipped ? `${ctx.fantasyTeamName} now leads ${ctx.primaryCat} over ${ctx.matchupImpact.opponentTeamName}. The week's bat made the difference.` : null,
    (ctx) => ctx.matchupImpact && !ctx.matchupImpact.catFlipped ? `Padded every column. ${ctx.matchupImpact.contestedCatsRemaining} cats still up. Fewer paths for the opponent.` : null,

    // Tier
    (ctx) => ctx.playerTier === 'elite-ADP' ? `Top-round bat playing top-round baseball. Three weeks running.` : null,
    (ctx) => ctx.playerTier === 'late-round' ? `Drafted in the late teens. Top-five at the position over the last week.` : null,
    (ctx) => ctx.playerTier === 'waiver-wire' ? `Off the wire two weeks ago. The week's best bat. Hard to lose to that.` : null,

    // Admiring closers
    (ctx) => `${ctx.fantasyTeamName} owners are screenshotting the box score.`,
    (ctx) => `The kind of week that gets a player on the Sunday morning column.`,
    (ctx) => `${ctx.playerLastName} cools off eventually. Not this week.`,
  ],
}

/* ─────────────────────────────────────────────────────────────────
   PUBLIC API
───────────────────────────────────────────────────────────────── */

export const swingTemplates: Record<SwingKind, SwingTemplate> = {
  monster: MONSTER,
  ace: ACE,
  closer: CLOSER,
  breakout: BREAKOUT,
  gem: GEM,
  bust: BUST,
  comeback: COMEBACK,
  'hot-week': HOT_WEEK,
}

/**
 * Render a swing — returns the eyebrow, headline, and body strings.
 *
 * Filters templates by their self-veto (`when` returns null) before
 * picking a random one from the surviving pool. If nothing survives
 * the filter, falls back to the first non-conditional variant.
 */
export function renderSwing(kind: SwingKind, ctx: SwingContext): {
  eyebrow: string
  headline: string
  body: string
} {
  const template = swingTemplates[kind]
  return {
    eyebrow: renderOne(template.eyebrows, ctx) ?? 'BIG SWING',
    headline: renderOne(template.headlines, ctx) ?? `${ctx.playerLastName} delivered.`,
    body: renderOne(template.bodies, ctx) ?? ctx.statLine,
  }
}

function renderOne(variants: VariantFn[], ctx: SwingContext): string | undefined {
  const rendered = variants
    .map((fn) => fn(ctx))
    .filter((s): s is string => typeof s === 'string' && s.length > 0)
  if (rendered.length === 0) return undefined
  return rendered[Math.floor(Math.random() * rendered.length)]
}

/**
 * Recently-used tracker — pass to renderSwing's options to avoid
 * repeating the same template back-to-back for the same player.
 * (Not implemented yet — the renderer is stateless. Future work:
 * track recent picks per (kind, player) tuple and bias away from them.)
 */
