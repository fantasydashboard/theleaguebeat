/**
 * Hero deck composer — produces a 2-3 sentence magazine "deck" for
 * the story carrying the cover.
 *
 * A deck is the elaboration under the headline that makes a reader
 * care: stakes, context, the "why this matters." Without it, the
 * cover reads like a notification, not a story.
 *
 * Design rules:
 *   - Many variants per story type so consecutive issues don't feel
 *     repetitive. Pick deterministically from signature hash so the
 *     same story always renders the same deck (no flicker on
 *     re-render, no surprise across visits).
 *   - Each variant uses the story's actual data (player names,
 *     team names, stats, ranks) — no boilerplate.
 *   - Voice: declarative, present tense, no em dashes, no
 *     exclamation, no rhetorical questions, no "fans are buzzing."
 *   - 2-3 sentences, ~50-80 words total. Long enough to land,
 *     short enough not to bury the headline.
 *
 * Adding a story type: define a `DeckBuilder[]` and add to
 * VARIANTS. The composer falls back gracefully when no variant
 * matches — returns empty string, hero suppresses the deck slot.
 */

import type { StoryType, SelectedStory } from '../detection/types'
import type { CategoryLeagueData } from '../types'

/* ─────────────────────────────────────────────────────────────────
   PUBLIC API
───────────────────────────────────────────────────────────────── */

/**
 * Compose the hero deck for a story. Returns empty string when no
 * variants exist for the story type — caller should hide the deck
 * slot rather than render nothing.
 */
export function composeHeroDeck(
  story: SelectedStory,
  data?: CategoryLeagueData,
): string {
  const builders = VARIANTS[story.type]
  if (!builders || builders.length === 0) return ''

  const ctx = buildDeckContext(story, data)
  const builder = pickVariant(builders, story.signature)
  try {
    return builder(ctx).trim()
  } catch {
    return ''
  }
}

/* ─────────────────────────────────────────────────────────────────
   CONTEXT — what every variant has access to
───────────────────────────────────────────────────────────────── */

interface DeckContext {
  story: SelectedStory
  data?: CategoryLeagueData
  /** Primary team name (story.teamIds[0] or context.teamName). */
  teamName: string
  /** All team names referenced by the story. */
  teamNames: string[]
  /** True when story.context.isMyGuy is true. */
  isMyGuy: boolean
  /** Raw context for ad-hoc field access. */
  c: Record<string, unknown>
}

function buildDeckContext(story: SelectedStory, data?: CategoryLeagueData): DeckContext {
  const c = (story.context ?? {}) as Record<string, unknown>
  const teamNameFromCtx = typeof c.teamName === 'string' ? c.teamName : ''
  const teamFromIds = story.teamIds && story.teamIds.length > 0
    ? (data?.teams.find((t) => t.id === story.teamIds![0])?.name ?? '')
    : ''
  const teamName = teamNameFromCtx || teamFromIds || 'A team'

  const teamNames = (story.teamIds ?? [])
    .map((id) => data?.teams.find((t) => t.id === id)?.name ?? '')
    .filter(Boolean)
  if (teamNames.length === 0 && teamName) teamNames.push(teamName)

  const isMyGuy = c.isMyGuy === true

  return { story, data, teamName, teamNames, isMyGuy, c }
}

/* ─────────────────────────────────────────────────────────────────
   VARIANT PICKER — deterministic from signature
───────────────────────────────────────────────────────────────── */

function pickVariant<T>(variants: T[], signature: string): T {
  let h = 5381
  for (let i = 0; i < signature.length; i++) {
    h = (h * 33) ^ signature.charCodeAt(i)
  }
  const idx = Math.abs(h) % variants.length
  return variants[idx]
}

/* ─────────────────────────────────────────────────────────────────
   FORMATTING HELPERS
───────────────────────────────────────────────────────────────── */

function num(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null
}
function str(v: unknown): string {
  return typeof v === 'string' ? v : ''
}
function pluralize(n: number, one: string, many?: string): string {
  return n === 1 ? one : (many ?? `${one}s`)
}
function formatIp(ip: number): string {
  const whole = Math.floor(ip)
  const outs = Math.round((ip - whole) * 3)
  return `${whole}.${outs}`
}

/** "A and B"; "A, B and C"; truncates at cap with "and N more." */
function joinNames(names: string[], cap = 3): string {
  if (names.length === 0) return ''
  if (names.length === 1) return names[0]
  if (names.length === 2) return `${names[0]} and ${names[1]}`
  if (names.length <= cap) {
    return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
  }
  return `${names.slice(0, cap).join(', ')} and ${names.length - cap} more`
}

/* ─────────────────────────────────────────────────────────────────
   PLAYER-NIGHT BUILDERS (hitter + pitcher)
───────────────────────────────────────────────────────────────── */

type DeckBuilder = (ctx: DeckContext) => string

interface HitterLine {
  atBats: number; hits: number; runs: number; rbi: number
  homeRuns: number; doubles: number; triples: number
  walks: number; strikeouts: number; stolenBases: number
}

interface PitcherLine {
  inningsPitched: number; hits: number; runs: number; earnedRuns: number
  walks: number; strikeouts: number
  decision?: string; completeGame?: boolean; noHitter?: boolean; perfectGame?: boolean
}

function readHitterLine(ctx: DeckContext): HitterLine | null {
  const line = ctx.c.line as Partial<HitterLine> | undefined
  if (!line || typeof line.atBats !== 'number') return null
  return {
    atBats: line.atBats ?? 0,
    hits: line.hits ?? 0,
    runs: line.runs ?? 0,
    rbi: line.rbi ?? 0,
    homeRuns: line.homeRuns ?? 0,
    doubles: line.doubles ?? 0,
    triples: line.triples ?? 0,
    walks: line.walks ?? 0,
    strikeouts: line.strikeouts ?? 0,
    stolenBases: line.stolenBases ?? 0,
  }
}

function readPitcherLine(ctx: DeckContext): PitcherLine | null {
  const line = ctx.c.line as Partial<PitcherLine> | undefined
  if (!line || typeof line.inningsPitched !== 'number') return null
  return {
    inningsPitched: line.inningsPitched ?? 0,
    hits: line.hits ?? 0,
    runs: line.runs ?? 0,
    earnedRuns: line.earnedRuns ?? 0,
    walks: line.walks ?? 0,
    strikeouts: line.strikeouts ?? 0,
    decision: line.decision,
    completeGame: line.completeGame,
    noHitter: line.noHitter,
    perfectGame: line.perfectGame,
  }
}

function readPlayer(ctx: DeckContext): { name: string; ownerName: string; position: string; mlbTeam: string; isMyGuy: boolean } {
  const owners = Array.isArray(ctx.c.ownedByTeamNames) ? (ctx.c.ownedByTeamNames as string[]) : []
  return {
    name: str(ctx.c.playerName) || 'The hitter',
    ownerName: owners[0] || '',
    position: str(ctx.c.position),
    mlbTeam: str(ctx.c.mlbTeam),
    isMyGuy: ctx.isMyGuy,
  }
}

const MONSTER_NIGHT_HITTER: DeckBuilder[] = [
  (ctx) => {
    const line = readHitterLine(ctx); if (!line) return ''
    const p = readPlayer(ctx)
    const owner = p.isMyGuy ? 'your roster' : (p.ownerName ? `${p.ownerName}'s roster` : 'whoever held him')
    return `${line.hits} hits, ${line.homeRuns} ${pluralize(line.homeRuns, 'homer')}, ${line.rbi} RBI on a single night. The kind of line that doesn't move a category race so much as it ends a conversation. ${owner.charAt(0).toUpperCase()}${owner.slice(1)} just got the spike that reshapes a week.`
  },
  (ctx) => {
    const line = readHitterLine(ctx); if (!line) return ''
    const p = readPlayer(ctx)
    const lead = p.isMyGuy ? `You held ${p.name}.` : (p.ownerName ? `${p.ownerName} held ${p.name}.` : `Someone held ${p.name}.`)
    return `${lead} On most nights that meant a quiet box-score check. Last night it meant ${line.hits}-for-${line.atBats}, ${line.homeRuns} HR, ${line.rbi} RBI, and a power-category swing that nobody else in the league matched.`
  },
  (ctx) => {
    const line = readHitterLine(ctx); if (!line) return ''
    const p = readPlayer(ctx)
    return `${p.name} is the kind of bat that goes quiet for two weeks and then puts up a line you remember all season. ${line.hits}-for-${line.atBats}, ${line.homeRuns} HR, ${line.rbi} RBI, ${line.runs} R. ${p.isMyGuy ? 'On your roster.' : (p.ownerName ? `On ${p.ownerName}'s roster.` : 'On someone\'s roster.')}`
  },
  (ctx) => {
    const line = readHitterLine(ctx); if (!line) return ''
    const p = readPlayer(ctx)
    return `On a night when the rest of the slate was quiet, ${p.name} did the heavy lifting alone. ${line.homeRuns} ${pluralize(line.homeRuns, 'home run')}, ${line.rbi} runs driven in, ${line.runs} scored. The category math just shifted in ${p.isMyGuy ? 'your' : 'one'} direction.`
  },
  (ctx) => {
    const line = readHitterLine(ctx); if (!line) return ''
    const p = readPlayer(ctx)
    return `${line.hits}-for-${line.atBats}, ${line.homeRuns} HR, ${line.rbi} RBI. The line reads like a fantasy preview sheet, not a real-life box score. ${p.isMyGuy ? `That was your night.` : `That was ${p.ownerName || 'their'} night.`}`
  },
]

const MONSTER_NIGHT_PITCHER: DeckBuilder[] = [
  (ctx) => {
    const line = readPitcherLine(ctx); if (!line) return ''
    const p = readPlayer(ctx)
    if (line.perfectGame) return `27 up, 27 down. ${p.name} did what every starting pitcher dreams about and almost none ever do. ${p.isMyGuy ? 'On your roster, no less.' : (p.ownerName ? `${p.ownerName} happens to own him.` : 'Free agent owners, take note.')}`
    if (line.noHitter) return `Nine innings, zero hits allowed. ${p.name} threw a no-hitter on a Tuesday night and the rest of the slate became background noise. ${p.isMyGuy ? 'Your ratios just got a gift.' : (p.ownerName ? `${p.ownerName}'s ratios just got a gift.` : 'Somebody is having a good morning.')}`
    return `${formatIp(line.inningsPitched)} innings, ${line.strikeouts} strikeouts, ${line.earnedRuns} earned runs. ${p.name} delivered the kind of start that anchors a pitching staff for a month. ${p.isMyGuy ? 'On your team.' : (p.ownerName ? `On ${p.ownerName}'s team.` : '')}`
  },
  (ctx) => {
    const line = readPitcherLine(ctx); if (!line) return ''
    const p = readPlayer(ctx)
    return `${p.name} carved through ${line.strikeouts} batters across ${formatIp(line.inningsPitched)} innings. The K column is up, the ERA column behaved, and ${p.isMyGuy ? 'your' : (p.ownerName ? `${p.ownerName}'s` : 'the')} pitching ratios got a real boost. The kind of start owners draft him for in March.`
  },
  (ctx) => {
    const line = readPitcherLine(ctx); if (!line) return ''
    const p = readPlayer(ctx)
    return `On a slate of 15 games, ${p.name}'s line was the loudest one in the league. ${formatIp(line.inningsPitched)} IP, ${line.strikeouts} K, ${line.earnedRuns} ER${line.decision ? `, ${line.decision}` : ''}. ${p.isMyGuy ? 'Your week just got easier.' : 'Hold him.'}`
  },
  (ctx) => {
    const line = readPitcherLine(ctx); if (!line) return ''
    const p = readPlayer(ctx)
    return `${formatIp(line.inningsPitched)} innings of work, ${line.strikeouts} strikeouts, and the kind of clean line that doesn't show up on most box-score days. ${p.name} ${p.isMyGuy ? 'just gave your staff a real night.' : (p.ownerName ? `gave ${p.ownerName} a real night.` : 'put up the start of the week.')}`
  },
]

/* ─────────────────────────────────────────────────────────────────
   3-HR + 12-K GAMES (subsets of monster-night, more specific)
───────────────────────────────────────────────────────────────── */

const THREE_HR_GAME: DeckBuilder[] = [
  (ctx) => {
    const line = readHitterLine(ctx); if (!line) return ''
    const p = readPlayer(ctx)
    return `Three home runs in a single game. ${p.name} did something fewer than 10 hitters do all season. ${p.isMyGuy ? 'And he was in your lineup.' : (p.ownerName ? `${p.ownerName} happens to own him.` : 'Free agent. Go grab him.')}`
  },
  (ctx) => {
    const line = readHitterLine(ctx); if (!line) return ''
    const p = readPlayer(ctx)
    return `${p.name} cleared the wall three times in nine innings. ${line.rbi} RBI, ${line.runs} runs scored, ${line.hits}-for-${line.atBats}. The kind of line that decides a power-category race in a single Tuesday.`
  },
  (ctx) => {
    const p = readPlayer(ctx)
    return `Three over the fence. That's it, that's the story. ${p.name} just delivered the loudest single game in the league this week, and ${p.isMyGuy ? 'you' : (p.ownerName ? p.ownerName : 'someone')} caught the entire arc.`
  },
  (ctx) => {
    const line = readHitterLine(ctx); if (!line) return ''
    const p = readPlayer(ctx)
    return `${p.name} put 12 total bases on the board in a night when most hitters around him had two. Three home runs, ${line.rbi} RBI, ${line.runs} runs. The category sheet doesn't lie.`
  },
]

const TWELVE_K_GAME: DeckBuilder[] = [
  (ctx) => {
    const line = readPitcherLine(ctx); if (!line) return ''
    const p = readPlayer(ctx)
    return `${line.strikeouts} strikeouts across ${formatIp(line.inningsPitched)} innings. ${p.name} carved through the order three times and then some, and ${p.isMyGuy ? 'your' : (p.ownerName ? `${p.ownerName}'s` : 'the')} K column will feel it all week.`
  },
  (ctx) => {
    const line = readPitcherLine(ctx); if (!line) return ''
    const p = readPlayer(ctx)
    return `Double-digit punch-outs are routine for a handful of starters. Triple-digits in a season is not. ${p.name} just turned in ${line.strikeouts} K on ${formatIp(line.inningsPitched)} IP, ${line.earnedRuns} ER. ${p.isMyGuy ? 'Hold him forever.' : 'Hold him.'}`
  },
  (ctx) => {
    const line = readPitcherLine(ctx); if (!line) return ''
    const p = readPlayer(ctx)
    return `${formatIp(line.inningsPitched)} IP, ${line.strikeouts} K. ${p.name} did to opposing hitters what nobody else in the league did this week. The K race just got reshaped by a single start.`
  },
  (ctx) => {
    const line = readPitcherLine(ctx); if (!line) return ''
    const p = readPlayer(ctx)
    return `Twelve strikeouts is a stat that decides a category by itself. ${p.name} got there on ${formatIp(line.inningsPitched)} IP with ${line.earnedRuns} ER. ${p.isMyGuy ? 'You\'re holding a stat-cheat.' : 'Someone is holding a stat-cheat.'}`
  },
]

/* ─────────────────────────────────────────────────────────────────
   TRADE BUILDERS
───────────────────────────────────────────────────────────────── */

interface TradeSide {
  teamId: string; teamName: string
  players: { playerName: string; position?: string }[]
}

/** Strip trailing position parentheticals platforms tack onto player
 *  names ("Shohei Ohtani (Pitcher)" → "Shohei Ohtani"). Yahoo lists
 *  two-way players this way; it reads as un-edited in magazine copy. */
function cleanPlayerName(name: string): string {
  return name.replace(/\s*\([^)]*\)\s*$/, '').trim()
}

function readTradeSides(ctx: DeckContext): TradeSide[] {
  const acquired = ctx.c.acquiredByTeam as TradeSide[] | undefined
  if (!Array.isArray(acquired)) return []
  return acquired.map((side) => ({
    ...side,
    players: side.players.map((p) => ({ ...p, playerName: cleanPlayerName(p.playerName) })),
  }))
}

const BLOCKBUSTER_TRADE: DeckBuilder[] = [
  (ctx) => {
    const sides = readTradeSides(ctx)
    if (sides.length < 2) return ''
    const a = sides[0], b = sides[1]
    const aGot = joinNames(a.players.map((p) => p.playerName))
    const bGot = joinNames(b.players.map((p) => p.playerName))
    return `${a.teamName} sent ${joinNames(b.players.map((p) => p.playerName))} out the door to get ${aGot}. ${b.teamName} got back ${bGot}. Both rosters look different this morning, and the standings will too in two weeks.`
  },
  (ctx) => {
    const sides = readTradeSides(ctx)
    const count = num(ctx.c.playerCount) ?? sides.reduce((n, s) => n + s.players.length, 0)
    const teams = joinNames(sides.map((s) => s.teamName))
    return `${count} ${pluralize(count, 'player')} moved across ${sides.length} ${pluralize(sides.length, 'roster')} overnight. ${teams} ran the math and decided the upgrade was worth the price. Categories don't lie; the standings will catch up.`
  },
  (ctx) => {
    const sides = readTradeSides(ctx)
    if (sides.length === 0) return ''
    const lead = sides[0]
    const got = joinNames(lead.players.map((p) => p.playerName))
    return `${lead.teamName} pulled the trigger. Out went depth; in came ${got}. A trade like this only happens when one side is convinced they're closer to the title than the other side thinks they are.`
  },
  (ctx) => {
    const sides = readTradeSides(ctx)
    if (sides.length < 2) return ''
    const a = sides[0], b = sides[1]
    return `${a.teamName} and ${b.teamName} were quiet all year and then made one of the loudest deals of the season. ${joinNames(a.players.map((p) => p.playerName))} change hands one way; ${joinNames(b.players.map((p) => p.playerName))} go the other. Read the rosters; read the message.`
  },
]

const LOPSIDED_TRADE: DeckBuilder[] = [
  (ctx) => {
    const sides = readTradeSides(ctx)
    if (sides.length < 2) return ''
    const a = sides[0], b = sides[1]
    return `${a.teamName} got ${joinNames(a.players.map((p) => p.playerName))}. ${b.teamName} got ${joinNames(b.players.map((p) => p.playerName))}. A trade clears, both sides took the bet. The league chat will spend the weekend deciding who won.`
  },
  (ctx) => {
    const sides = readTradeSides(ctx)
    if (sides.length < 2) return ''
    const a = sides[0], b = sides[1]
    return `Not a blockbuster, but the kind of move that quietly shifts a category. ${a.teamName} added ${joinNames(a.players.map((p) => p.playerName))}; ${b.teamName} added ${joinNames(b.players.map((p) => p.playerName))}.`
  },
  (ctx) => {
    const sides = readTradeSides(ctx)
    if (sides.length === 0) return ''
    const teams = joinNames(sides.map((s) => s.teamName))
    return `${teams} swung a deal. Small in shape, real in consequence. Both sides identified what they were missing and went and got it. That is how good seasons get made.`
  },
]

/* ─────────────────────────────────────────────────────────────────
   STANDINGS / STREAK BUILDERS
───────────────────────────────────────────────────────────────── */

const HOT_CLIMBER: DeckBuilder[] = [
  (ctx) => {
    const from = num(ctx.c.fromRank); const to = num(ctx.c.toRank)
    if (from && to) return `From #${from} in week one to #${to} today. ${ctx.teamName} didn't make headlines doing it. The board just kept reshuffling, and they kept moving up.`
    return `${ctx.teamName} keeps climbing. Not a single big week did it, just steady gains that the table can no longer ignore.`
  },
  (ctx) => {
    const spots = num(ctx.c.spotsClimbed)
    if (spots) return `${spots} spots gained since week one. ${ctx.teamName} is doing the slow-burn season — no signature win, no signature trade, just compounding category margins. The league is starting to notice.`
    return `${ctx.teamName} is in the middle of the kind of climb that decides playoff seedings, not headlines.`
  },
  (ctx) => `Three weeks ago ${ctx.teamName} was a footnote. Today they're a problem. The category sheet shows them gaining ground in five of the last six weeks and the schedule still favors them.`,
  (ctx) => {
    const to = num(ctx.c.toRank)
    if (to) return `${ctx.teamName} sits at #${to} this morning. They were nowhere near it a month ago. The math says they belong; the rest of the league hasn't adjusted to it yet.`
    return `${ctx.teamName} keeps gaining. The slow climbers always look like flukes until they don't.`
  },
]

const COMEBACK_TEAM: DeckBuilder[] = [
  (ctx) => {
    const from = num(ctx.c.fromRank); const to = num(ctx.c.toRank)
    if (from && to) return `Sat at #${from} three weeks ago. Now #${to}. ${ctx.teamName} found something — a hot bat, a healthy arm, a closer they finally trust. Whatever it is, it's working.`
    return `${ctx.teamName} is out of the basement and back in the conversation. The kind of arc that decides a season.`
  },
  (ctx) => `${ctx.teamName} was a coin-flip to make playoffs two weeks ago. Today they're a coin-flip to win the whole thing. The category math always tells the truth eventually.`,
  (ctx) => `Nothing dramatic, just steady wins. ${ctx.teamName} has crawled out of a hole the rest of the league had already buried them in. The schedule helps. The roster does too.`,
]

const STREAK_BUILT: DeckBuilder[] = [
  (ctx) => {
    const len = num(ctx.c.streakLength)
    if (len) return `${len} straight wins. ${ctx.teamName} isn't catching breaks anymore — they're making them. The shape of the standings is shifting around this run.`
    return `${ctx.teamName} keeps winning. The shape of the standings is shifting around this run.`
  },
  (ctx) => {
    const len = num(ctx.c.streakLength)
    if (len && len >= 4) return `Four-plus straight wins. ${ctx.teamName} found whatever it was missing in March and the league is paying for it now. Streaks this long don't happen by accident.`
    return `${ctx.teamName} is on a streak the rest of the league has to plan around. Quiet at first; loud now.`
  },
  (ctx) => `${ctx.teamName} won again. Then again. Then again after that. The pattern is the story now, not the wins themselves.`,
]

const STREAK_BROKEN: DeckBuilder[] = [
  (ctx) => `${ctx.teamName} took a loss after a long run of wins. The board resets. What was inevitable now feels mortal, and the rest of the league has license to attack again.`,
  (ctx) => `The streak ends. ${ctx.teamName} held it together for weeks; this week the math finally caught up. Bigger question now: was it the run that was real, or the result?`,
  (ctx) => `${ctx.teamName}'s win streak hit the wall. One loss doesn't undo what they built, but it changes how the next three weeks feel. The hunters are back in range.`,
]

/* ─────────────────────────────────────────────────────────────────
   MATCHUP BUILDERS
───────────────────────────────────────────────────────────────── */

const PHOTO_FINISH: DeckBuilder[] = [
  (ctx) => `One cat decided the whole thing. ${ctx.teamName} won the week on the slimmest margin available, and the loser will spend the next 24 hours wondering which lineup decision they could have made differently.`,
  (ctx) => `${ctx.teamName} got it by the smallest margin in the league this week. The kind of result that doesn't change the standings much but rewires how both managers think about the rest of the season.`,
  (ctx) => `A week that came down to the final at-bat. ${ctx.teamName} held on, the other side will replay every bench decision for a week, and the standings barely move. That's the league, sometimes.`,
]

const RAZOR_CLOSE: DeckBuilder[] = [
  (ctx) => `Down to the final cat. ${ctx.teamName} won by exactly one, and the post-mortem in their league chat will go all weekend. Decided by the kind of margin you can't game-plan around.`,
  (ctx) => `One cat. That's the whole story. ${ctx.teamName} took it, but the loser had four different paths to flip the result and missed all of them.`,
]

const COMEBACK_WIN: DeckBuilder[] = [
  (ctx) => `Down by seven cats by Friday. Closed by Sunday. ${ctx.teamName} pulled off the kind of week that gets retold in the league chat for a month. The other side managed it perfectly until Friday night.`,
  (ctx) => `${ctx.teamName} was buried at the midweek mark. Then they weren't. The category sheet flipped two at a time, and by Sunday it was decided in their favor. Read the box scores; the comeback is real.`,
  (ctx) => `A week most managers would have conceded by Thursday. ${ctx.teamName} didn't. They worked the wire, set the lineup, and won the cats that mattered. That's how seasons get built.`,
]

const BLOWOUT: DeckBuilder[] = [
  (ctx) => `Not a contest, a coronation. ${ctx.teamName} ran away with every meaningful cat by Wednesday, then coasted. The category gap was double-digits across the board.`,
  (ctx) => `${ctx.teamName} won going away. The kind of week where the box scores stop mattering after Thursday because the math is already decided. A statement, if anyone was listening.`,
]

const CAT_SWEEP: DeckBuilder[] = [
  (ctx) => `Every decided cat fell one way. ${ctx.teamName} ran the table this week, no splits, no holdouts. The opposing manager spent Sunday watching games knowing none of them would help.`,
  (ctx) => `A clean week. ${ctx.teamName} took every category that resolved and left nothing for the other side. The kind of result that builds tiebreakers for the rest of the season.`,
  (ctx) => `${ctx.teamName} got the sweep. Every cat, no negotiation. Weeks like this are why category leagues exist — the math is brutal and beautiful in the same direction.`,
]

const CAT_SHUTOUT: DeckBuilder[] = [
  (ctx) => `${ctx.teamName} took the zero. Every cat fell the other way and the box score wasn't close enough to argue with. A week to forget; the standings won't.`,
  (ctx) => `Bad weeks happen to good rosters. ${ctx.teamName} just had the worst possible version of one — every category, gone. The good news: it counts the same as any other loss.`,
]

const NEW_THRONE: DeckBuilder[] = [
  (ctx) => `${ctx.teamName} sits at the top of the table this morning. A run of category dominance, a few healthy rosters, and one week's worth of luck got them there. The whole league shifts around this.`,
  (ctx) => `New leader. ${ctx.teamName} climbed past the field with the kind of week that doesn't have a single highlight — just a clean sweep of the math. The seat is theirs until someone takes it.`,
  (ctx) => `The throne changed hands. ${ctx.teamName} earned it on the back of three consecutive strong weeks, and the field is going to have to recalibrate. Power in this league is fluid; for now, it belongs to them.`,
]

const DYNASTY_FALLING: DeckBuilder[] = [
  (ctx) => `${ctx.teamName} held the top spot for what felt like the whole season. Not anymore. The category math finally turned, the field finally caught up, and the seat at the top of the table is changing hands.`,
  (ctx) => `The reign is over. ${ctx.teamName} ruled the standings for stretches that felt permanent. Today they're chasing instead of being chased. The math behind the slide is real.`,
]

const MATCHUP_OF_WEEK: DeckBuilder[] = [
  (ctx) => `The marquee matchup of the week. ${joinNames(ctx.teamNames)} are within a hair of each other in the standings, and this is the kind of week where the loser feels every cat for a month.`,
  (ctx) => `Two teams, similar records, divergent paths from here. ${joinNames(ctx.teamNames)} square off in the kind of matchup that decides playoff seeding before anyone realizes it did.`,
]

/* ─────────────────────────────────────────────────────────────────
   STREAMER + BLOW-UP + SLUMP — for the new Wire types if hero
───────────────────────────────────────────────────────────────── */

const STREAMER_OF_DAY: DeckBuilder[] = [
  (ctx) => {
    const line = readPitcherLine(ctx); if (!line) return ''
    const p = readPlayer(ctx)
    return `${p.name} is sitting on waivers in your league this morning. He just turned in ${formatIp(line.inningsPitched)} IP, ${line.strikeouts} K, ${line.earnedRuns} ER. The kind of free agent line that decides a category for whoever moves first.`
  },
  (ctx) => {
    const line = readPitcherLine(ctx); if (!line) return ''
    const p = readPlayer(ctx)
    return `Unowned. Until this morning. ${p.name} put up ${formatIp(line.inningsPitched)} innings of ${line.strikeouts}-K work and is still available in every league he was in yesterday. The race is to the wire.`
  },
]

const PITCHER_BLOWUP: DeckBuilder[] = [
  (ctx) => {
    const line = readPitcherLine(ctx); if (!line) return ''
    const p = readPlayer(ctx)
    return `${line.earnedRuns} earned runs across ${formatIp(line.inningsPitched)} innings. ${p.name} just torched ${p.isMyGuy ? 'your' : (p.ownerName ? `${p.ownerName}'s` : 'someone\'s')} ratios in a single start. ERA and WHIP both took the hit, and there's no recovering it this week.`
  },
  (ctx) => {
    const line = readPitcherLine(ctx); if (!line) return ''
    const p = readPlayer(ctx)
    return `A start that fell apart in the second. ${p.name} gave up ${line.earnedRuns} ER on ${formatIp(line.inningsPitched)} IP, and ${p.isMyGuy ? 'your week' : 'someone\'s week'} just got harder. Hold or drop? That's the conversation.`
  },
]

const SLUMP_HITTER: DeckBuilder[] = [
  (ctx) => {
    const ab = num(ctx.c.summary && (ctx.c.summary as any).atBats)
    const ba = num(ctx.c.summary && (ctx.c.summary as any).battingAverage)
    const days = num(ctx.c.windowDays) ?? 7
    const p = readPlayer(ctx)
    if (ab != null && ba != null) {
      return `${p.name} has been quiet for ${days} days. ${ba.toFixed(3).replace(/^0/, '')} across ${ab} at-bats. ${p.isMyGuy ? 'Your' : 'The'} lineup decision gets harder every game he plays.`
    }
    return `${p.name} can't find a hit. The cold stretch is real and it's been going long enough to count as a trend. ${p.isMyGuy ? 'Your' : 'A'} bench bat is starting to look more useful.`
  },
]

const SLUMP_PITCHER_ROLLING: DeckBuilder[] = [
  (ctx) => {
    const ip = num(ctx.c.summary && (ctx.c.summary as any).inningsPitched)
    const era = num(ctx.c.summary && (ctx.c.summary as any).era)
    const days = num(ctx.c.windowDays) ?? 14
    const p = readPlayer(ctx)
    if (ip != null && era != null) {
      return `${era.toFixed(2)} ERA across ${ip.toFixed(1)} innings over the last ${days} days. ${p.name} has been ${p.isMyGuy ? 'wrecking your' : 'wrecking somebody\'s'} ratios start after start. The drop conversation is on the table.`
    }
    return `${p.name} can't get outs. Multiple starts deep, the line keeps reading the same. ${p.isMyGuy ? 'Your' : 'Someone\'s'} ratios are paying for it.`
  },
]

/* ─────────────────────────────────────────────────────────────────
   LOOKUP TABLE
───────────────────────────────────────────────────────────────── */

const VARIANTS: Partial<Record<StoryType, DeckBuilder[]>> = {
  'monster-night': [...MONSTER_NIGHT_HITTER, ...MONSTER_NIGHT_PITCHER],
  'three-hr-game': THREE_HR_GAME,
  'twelve-k-game': TWELVE_K_GAME,
  'blockbuster-trade': BLOCKBUSTER_TRADE,
  'lopsided-trade': LOPSIDED_TRADE,
  'hot-climber': HOT_CLIMBER,
  'comeback-team': COMEBACK_TEAM,
  'streak-built': STREAK_BUILT,
  'streak-broken': STREAK_BROKEN,
  'photo-finish': PHOTO_FINISH,
  'razor-close': RAZOR_CLOSE,
  'comeback-win': COMEBACK_WIN,
  'blowout': BLOWOUT,
  'cat-sweep': CAT_SWEEP,
  'cat-shutout': CAT_SHUTOUT,
  'new-throne': NEW_THRONE,
  'dynasty-falling': DYNASTY_FALLING,
  'matchup-of-week': MATCHUP_OF_WEEK,
  'streamer-of-day': STREAMER_OF_DAY,
  'pitcher-blowup': PITCHER_BLOWUP,
  'slump-hitter': SLUMP_HITTER,
  'slump-pitcher-rolling': SLUMP_PITCHER_ROLLING,
}
