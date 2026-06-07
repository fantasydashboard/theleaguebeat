/**
 * THE LEDE — the magazine's daily byline.
 *
 * One editorial story per day, picked from a scored hierarchy of
 * candidate Kinds (streak-watch, sweep-in-progress, bubble-drama,
 * standings-shift, history, week-preview). Two-to-three sentences
 * (~40-60 words), team names not "you," position-y voice without
 * over-editorializing.
 *
 * The pipeline mirrors matchups.ts → detect-matchups.ts → render-
 * matchups.ts at the LEAGUE-day level (not the matchup level). The
 * detector scores every Kind on the current data and a day-of-week
 * bias; renderer picks variant copy from a Kind-specific pool with
 * fact-gating so the column never claims something the data doesn't
 * support.
 *
 * This file is the variant library. Detector lives in
 * detect-lede.ts; pipeline lives in render-lede.ts.
 */

/* ─────────────────────────────────────────────────────────────────
   KIND UNION
───────────────────────────────────────────────────────────────── */

export type LedeKind =
  | 'lede-streak-watch'         // notable active winning or losing streak
  | 'lede-sweep-in-progress'    // a matchup is mathematically locking
  | 'lede-bubble-drama'         // playoff-line matchups in motion
  | 'lede-standings-shift'      // rank changes worth a column
  | 'lede-history'              // historical resonance — anniversaries, records
  | 'lede-week-preview'         // Monday-only setup hero when nothing dramatic rises
  | 'lede-closer'               // Sunday-only closer voice
  | 'lede-quiet-day'            // honest fallback when nothing rises above noise

/* ─────────────────────────────────────────────────────────────────
   CONTEXT — what the templates read from
───────────────────────────────────────────────────────────────── */

export type LedeDayBucket = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun'

export interface LedeTeamSnapshot {
  id: string
  name: string
  rank: number
  catRecord: string                    // "77-27" or "77-27-0"
  winPctSeason: number                 // 0..1
  streakType: 'W' | 'L' | 'T'
  streakLength: number                 // current active streak length
  isDefendingChamp?: boolean           // historical context, when known
  /** Visual identity for the inline subject avatar in THE LEDE.
   *  The column shows a portrait-style avatar to the side of the
   *  headline; these fields back that render. Undefined fields are
   *  tolerated — the avatar falls back to a colored block with
   *  owner initials. */
  avatarUrl?: string
  avatarColor?: string
  ownerInitials?: string
}

export interface LedeMatchupSnapshot {
  matchupId: string
  homeTeamId: string
  awayTeamId: string
  homeName: string
  awayName: string
  homeCatWins: number
  awayCatWins: number
  contestedCount: number
  homeWinProb?: number                 // 0..1, from the live projection
  awayWinProb?: number
}

/** Single-shot context passed to every Lede template. Kept narrow —
 *  detectors must thread only what THIS Kind needs. */
export interface LedeContext {
  currentDay: LedeDayBucket
  currentWeek: number
  daysLeftInWeek: number                       // including today; 1..7

  /** The subject team (the team the Lede is about). Always populated. */
  subject: LedeTeamSnapshot

  /** The team's current-week matchup, when relevant to the Kind. */
  subjectMatchup?: LedeMatchupSnapshot

  /** A foil team — the contrast piece in the column (the opponent,
   *  the team also on a streak, etc.). */
  foil?: LedeTeamSnapshot
  foilMatchup?: LedeMatchupSnapshot

  /** League-level facts for body context. */
  totalTeams: number
  playoffCutoff: number

  /** Kind-specific fields. */
  streak?: {
    length: number
    isLongestActive: boolean             // longest active in the league
    isSeasonHigh: boolean                // best streak this team has had this season
    /** Second-best active streak length in the same direction. When
     *  the subject's streak is #1 in the league, this is the gap to
     *  beat. Bodies and headlines use it to anchor "nobody else has
     *  more than N" framing. Undefined when no other team has any
     *  active streak. */
    nextLongestSameType?: number
  }
  /** Standings context for body framing. Populated when the subject
   *  is at or near the top of the field — lets the column reference
   *  the gap as a fact instead of vague phrases like "loudest." */
  standings?: {
    /** Games ahead of the next-ranked team. Computed from cat W-L:
     *  ((leader_wins - other_wins) + (other_losses - leader_losses)) / 2.
     *  Only set when the subject is the #1 seed. */
    gamesAheadOfSecond?: number
  }
  sweep?: {
    leaderCatWins: number
    trailerCatWins: number
    contestedCount: number
    isFunctionallyOver: boolean
  }
  bubble?: {
    /** How far the subject is from the cutoff seed (positive = above
     *  the line, negative = below, zero = sitting on it). Bodies use
     *  the sign to choose between "clinging to the cut" and "one win
     *  from climbing back in." */
    subjectDistanceToLine: number
    /** Total teams within 2 spots of the cutoff. Bodies use this for
     *  "four teams within two games of the line" framing. */
    bubbleTeamCount: number
    /** What triggered the candidacy. 'matchup' = a bubble-vs-bubble
     *  draw is on this week (loudest); 'crossing' = a team moved
     *  across the line overnight; 'standing' = no acute trigger,
     *  just bubble pressure. */
    framing: 'matchup' | 'crossing' | 'standing'
  }
  /** Weeks remaining in the regular season (excluding the current
   *  week). Cross-Kind context — bodies that lean on "N weeks left"
   *  read this. Undefined when the platform doesn't expose the end
   *  week. */
  weeksRemaining?: number
}

/* ─────────────────────────────────────────────────────────────────
   TEMPLATE SHAPE
───────────────────────────────────────────────────────────────── */

export interface LedeTemplate {
  kind: LedeKind
  eyebrows: Array<(ctx: LedeContext) => string | null>
  headlines: Array<(ctx: LedeContext) => string | null>
  /** Bodies are 2-3 sentences total. The function returns the FULL
   *  body string; we don't chain sentence-by-sentence at the renderer
   *  layer because magazine rhythm needs to be authored together. */
  bodies: Array<(ctx: LedeContext) => string | null>
}

/* ─────────────────────────────────────────────────────────────────
   HELPERS — shared across templates
───────────────────────────────────────────────────────────────── */

/** Calendar-day key — same value across all reloads within one day,
 *  changes at local midnight. Drives the deterministic Lede pick so
 *  the magazine commits to its editorial choice for the day instead
 *  of re-rolling on every refresh. */
function getDayKey(now: Date = new Date()): number {
  return now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate()
}

/** Pool fingerprint — a cheap stable hash of the pool's identity so
 *  adjacent calls (eyebrow vs headline vs body) don't collapse onto
 *  the same modular index. Uses the pool length + the first item's
 *  string representation (function source for variant arrays). */
function poolFingerprint<T>(pool: readonly T[]): number {
  if (pool.length === 0) return 0
  const seed = String(pool[0] ?? '').slice(0, 32)
  let h = pool.length * 5381
  for (let i = 0; i < seed.length; i++) {
    h = ((h << 5) - h + seed.charCodeAt(i)) | 0
  }
  return h >>> 0
}

/** Date-seeded pick — the same pool on the same calendar day always
 *  returns the same item. Different pools on the same day return
 *  independent items (via the fingerprint salt). New day = fresh roll
 *  across every pool.
 *
 *  Magazine voice rationale: a column shouldn't reshuffle every time
 *  the reader hits refresh. Commit to the editorial pick for the day;
 *  let tomorrow be a different read. */
function pick<T>(pool: readonly T[]): T {
  if (pool.length === 0) {
    throw new Error('pick: cannot select from empty pool')
  }
  const dayKey = getDayKey()
  const fp = poolFingerprint(pool)
  // Knuth multiplicative hash — fast, well-distributed, no deps.
  const hashed = ((dayKey * 2654435761) ^ fp) >>> 0
  return pool[hashed % pool.length]
}

function plural(n: number, one: string, many: string = one + 's'): string {
  return n === 1 ? `${n} ${one}` : `${n} ${many}`
}

function rankPhrase(rank: number): string {
  if (rank === 1) return 'the top seed'
  if (rank === 2) return 'the #2 seed'
  if (rank === 3) return 'the #3 seed'
  return `the #${rank} seed`
}

/* ─────────────────────────────────────────────────────────────────
   KIND: STREAK-WATCH
───────────────────────────────────────────────────────────────── */

const STREAK_WATCH: LedeTemplate = {
  kind: 'lede-streak-watch',
  eyebrows: [
    () => 'THE STREAK',
    () => 'RUN OF FORM',
    () => 'HEATER',
    () => 'WINNING IT',
    (ctx) => ctx.subject.streakType === 'L' ? 'THE SLUMP' : 'THE RUN',
    (ctx) => (ctx.streak?.length ?? 0) >= 8 ? 'WHAT A RUN' : null,
    (ctx) => (ctx.streak?.length ?? 0) >= 10 ? 'TEN AND COUNTING' : null,
  ],
  headlines: [
    // Longest-active framing — fact-led, no irony. A team HAS a
    // streak; a team isn't a streak. Subtle grammatical thing that
    // matters for column voice.
    (ctx) => ctx.subject.streakType === 'W' && (ctx.streak?.isLongestActive ?? false) && (ctx.streak?.length ?? 0) >= 6
      ? `${ctx.subject.name} has the league's longest active streak. ${ctx.streak!.length} games and climbing.`
      : null,
    (ctx) => ctx.subject.streakType === 'W' && (ctx.streak?.isLongestActive ?? false) && (ctx.streak?.length ?? 0) >= 8
      ? `${ctx.subject.name} hasn't lost a matchup in ${ctx.streak!.length} weeks. No one else in the league has come close.`
      : null,

    // Standard W-streak framings. When we know the next-longest run
    // in the league, the headline closes with a fact instead of a
    // slogan ("paying attention"). Falls back to a tighter framing
    // when the comparison isn't available.
    (ctx) => ctx.subject.streakType === 'W' && (ctx.streak?.length ?? 0) >= 5 && (ctx.streak?.nextLongestSameType ?? 0) >= 1
      ? `${ctx.subject.name} has won ${ctx.streak!.length} straight. Next-longest active run: ${ctx.streak!.nextLongestSameType}.`
      : null,
    (ctx) => ctx.subject.streakType === 'W' && (ctx.streak?.length ?? 0) >= 5
      ? `${ctx.subject.name} has won ${ctx.streak!.length} straight. The rest of the league is chasing.`
      : null,
    (ctx) => ctx.subject.streakType === 'W' && (ctx.streak?.length ?? 0) >= 5 && ctx.subjectMatchup
      ? `${ctx.subject.name} is on a ${ctx.streak!.length}-game heater. ${otherName(ctx.subjectMatchup, ctx.subject.id)} draws them this week.`
      : null,
    (ctx) => ctx.subject.streakType === 'W' && (ctx.streak?.length ?? 0) >= 8
      ? `${ctx.subject.name} hasn't lost in ${ctx.streak!.length} weeks. ${rankPhrase(ctx.subject.rank).replace(/^the /, 'The ')} is the comparison everyone else is chasing.`
      : null,

    // Defending-champ flavor
    (ctx) => ctx.subject.isDefendingChamp && ctx.subject.streakType === 'W' && (ctx.streak?.length ?? 0) >= 6
      ? `The defending champ has won ${ctx.streak!.length} in a row. The window is closing on the rest of the league.`
      : null,

    // L-streak framings
    (ctx) => ctx.subject.streakType === 'L' && (ctx.streak?.length ?? 0) >= 4
      ? `${ctx.subject.name} has dropped ${ctx.streak!.length} straight. The room is starting to talk about it.`
      : null,
    (ctx) => ctx.subject.streakType === 'L' && (ctx.streak?.length ?? 0) >= 5 && ctx.subject.rank <= 4
      ? `${ctx.subject.name} entered the season a contender. ${ctx.streak!.length} losses later, the contender talk is on hold.`
      : null,
  ],
  bodies: [
    // Win-streak body — leans on rank + record + the matchup framing
    (ctx) => ctx.subject.streakType === 'W' && (ctx.streak?.length ?? 0) >= 6
      ? buildStreakWinBody(ctx)
      : null,
    // Lose-streak body — slump framing
    (ctx) => ctx.subject.streakType === 'L' && (ctx.streak?.length ?? 0) >= 4
      ? buildStreakLossBody(ctx)
      : null,
  ],
}

function otherName(matchup: LedeMatchupSnapshot, subjectId: string): string {
  return matchup.homeTeamId === subjectId ? matchup.awayName : matchup.homeName
}

/** Hyphenated adjective form: "10-game", "3-game". Magazine voice
 *  for adjectival use; reserve `plural()` for noun phrases. */
function hyphenGame(n: number): string {
  return `${n}-game`
}

/** Capitalize first letter — for sentence-leading rank phrases. */
function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/** Games-back phrase. 1 game = "a game"; otherwise "N games". Used
 *  in body sentences where "16 games clear of second" reads tighter
 *  than "16-games ahead." Negative values (subject not actually
 *  ahead) collapse to "tied" — defensive against edge cases. */
function gameLeadPhrase(games: number): string {
  if (games <= 0) return 'tied with the field'
  if (games === 1) return 'a game'
  return `${games} games`
}

/** Win-streak body — picks among multiple variants for daily
 *  freshness. Avoids possessive forms ("Jazz on my TittyWittys's
 *  run") which read awkwardly with plural-ending names; restructures
 *  sentences to bypass the apostrophe-s entirely. */
function buildStreakWinBody(ctx: LedeContext): string | null {
  const s = ctx.subject
  const opp = ctx.subjectMatchup ? otherName(ctx.subjectMatchup, s.id) : null
  const projection = ctx.subjectMatchup?.homeWinProb !== undefined
    ? (ctx.subjectMatchup.homeTeamId === s.id
        ? Math.round(ctx.subjectMatchup.homeWinProb * 100)
        : Math.round((ctx.subjectMatchup.awayWinProb ?? (1 - ctx.subjectMatchup.homeWinProb)) * 100))
    : null
  const foilOnSlump = ctx.foil && ctx.foil.streakType === 'L'
  const len = ctx.streak!.length

  const variants: string[] = []

  // V1 + V2 are projection-led — they read as "the subject is the
  // favorite this week." Both fact-gate on projection >= 55: when
  // the subject is an underdog (which can happen even on a long
  // streak if cats moved against them this week), saying "tilted
  // their way" or showing 47/53 framed as a subject-perspective stat
  // contradicts the streak narrative. Drop these variants; V3, V5a,
  // and V6 still carry the column without claiming favor that isn't
  // there.
  const subjectIsFavorite = projection !== null && projection >= 55

  // V1: standings-anchored, foil-on-slump pivot
  if (opp && subjectIsFavorite && foilOnSlump && ctx.foil) {
    variants.push(
      `At ${s.catRecord} and ${rankPhrase(s.rank)}, ${s.name} is on the league's loudest active stretch. Their week ${ctx.currentWeek} draw is ${opp}, on a ${hyphenGame(ctx.foil.streakLength)} skid of their own. The math has the matchup at ${projection}/${100 - projection!}.`,
    )
  }

  // V2: matchup-first, projection-led
  if (opp && subjectIsFavorite) {
    variants.push(
      `Week ${ctx.currentWeek} pulls ${opp} into the path of the league's hottest team. ${s.name} enters at ${s.catRecord} on a ${hyphenGame(len)} run; the projection has it tilted their way at ${projection}/${100 - projection!}.`,
    )
  }

  // V3: longest-active framing, dynasty tone. When we know the
  // actual next-longest streak, name it; otherwise fall back to a
  // softer comparison so we don't claim "more than four" when the
  // real number is three.
  if ((ctx.streak?.isLongestActive ?? false) && len >= 8) {
    const nextLongest = ctx.streak?.nextLongestSameType
    const comparison = nextLongest !== undefined
      ? `No other team in the league has put together more than a ${hyphenGame(nextLongest)} run this season`
      : `No other team in the league has built anything close`
    variants.push(
      `The streak now sits at ${s.catRecord} and ${rankPhrase(s.rank)}. ${comparison}; ${s.name} has built a stretch the rest of the standings is just trying to keep pace with.`,
    )
  }

  // V4: opponent-only (no projection available)
  if (opp && projection === null) {
    variants.push(
      `At ${s.catRecord}, ${s.name} sits ${rankPhrase(s.rank)} on a ${hyphenGame(len)} run. ${opp} draws them this week. The rest of the league is playing for second seed and the math knows it.`,
    )
  }

  // V5a: rank + gap + next-longest streak — the fact-led "ideal"
  // when all three numbers are known. Avoids re-naming the team in
  // the body (the headline already names them) by referring back as
  // "the streak" / "the run."
  //
  // When V5a fires, V5b and V5c are SUPPRESSED — they're just
  // thinner versions of the same framing, and picking one of them
  // randomly over V5a would waste the data we have. V1/V2/V3/V6
  // remain in the pool for daily variance (different framings, not
  // just different data densities).
  const v5aEligible =
    ctx.standings?.gamesAheadOfSecond !== undefined &&
    (ctx.streak?.nextLongestSameType ?? 0) >= 1
  if (v5aEligible) {
    variants.push(
      `The run sits at ${s.catRecord}, ${gameLeadPhrase(ctx.standings!.gamesAheadOfSecond!)} clear of second${opp ? ` and drawing ${opp} this week` : ''}. The next-longest active streak in the league is ${ctx.streak!.nextLongestSameType}.`,
    )
  } else if (ctx.standings?.gamesAheadOfSecond !== undefined) {
    // V5b: rank + gap only (no next-longest streak data)
    variants.push(
      `${cap(rankPhrase(s.rank))} sits at ${s.catRecord}, ${gameLeadPhrase(ctx.standings.gamesAheadOfSecond)} clear of second${opp ? `. ${opp} draws them this week` : ''}.`,
    )
  } else {
    // V5c: minimum-data fallback — only fires when neither gap nor
    // next-longest is known, to keep the pool from collapsing to a
    // null when other context is also sparse.
    variants.push(
      `${cap(rankPhrase(s.rank))} sits at ${s.catRecord} on a ${hyphenGame(len)} run${opp ? `, with ${opp} on the schedule this week` : ''}.`,
    )
  }

  // V6: high-streak emphasis (length >= 10) — the season-arc voice.
  // Editorially distinct from V5a (which is pure facts); V6 leans on
  // "look back at how the year started" framing. Same discipline as
  // the rest of the pool: references the subject as "the run" on
  // second mention, drops the emoji, uses the real nextLongestSameType
  // when available instead of the old "no other roster has matched"
  // slogan.
  if (len >= 10) {
    const nextLongest = ctx.streak?.nextLongestSameType
    const tail = nextLongest !== undefined
      ? `nobody else in the league has more than ${plural(nextLongest, 'straight win')} active`
      : `nobody else in the league has built anything close`
    variants.push(
      `${plural(len, 'week')} ago the season was a question. The run now sits at ${s.catRecord} and ${rankPhrase(s.rank)}, and ${tail}.`,
    )
  }

  return pick(variants)
}

/** Lose-streak body — slump framing, multiple variants. Same
 *  possessive-avoidance discipline as the win-streak body. */
function buildStreakLossBody(ctx: LedeContext): string | null {
  const s = ctx.subject
  const opp = ctx.subjectMatchup ? otherName(ctx.subjectMatchup, s.id) : null
  const len = ctx.streak!.length
  const variants: string[] = []

  if (opp) {
    variants.push(
      `At ${s.catRecord} after ${plural(len, 'straight loss', 'straight losses')}, ${s.name} draws ${opp} this week. A win starts the rebuild; another loss pushes the playoff math from tight to bad.`,
    )
    variants.push(
      `The slide has ${s.name} at ${s.catRecord} and ${rankPhrase(s.rank)}. The matchup with ${opp} is the obvious circuit-breaker; the alternative is week ${ctx.currentWeek + 1} starting with the slump still alive.`,
    )
  } else {
    variants.push(
      `At ${s.catRecord} on a ${hyphenGame(len)} losing run, ${s.name} sits ${rankPhrase(s.rank)} and on the wrong trajectory. A win this week starts the rebuild; another loss pushes the playoff math from tight to bad.`,
    )
  }

  return pick(variants)
}

/* ─────────────────────────────────────────────────────────────────
   KIND: SWEEP-IN-PROGRESS

   Fires when a current-week matchup is mathematically locked or
   heading toward a clean sweep. "The math is settled" is the core
   editorial frame — a magazine reader showing up Thursday or Friday
   wants to know which weeks ended early and which are still alive.

   Detector populates ctx.subjectMatchup (the locked matchup),
   ctx.subject (the leader), ctx.foil (the trailer), and ctx.sweep
   with the numbers.
───────────────────────────────────────────────────────────────── */

const SWEEP_IN_PROGRESS: LedeTemplate = {
  kind: 'lede-sweep-in-progress',
  eyebrows: [
    () => 'THE LOCK',
    () => 'MATH IS SETTLED',
    () => 'ALREADY OVER',
    () => 'SWEEP WATCH',
    (ctx) => ctx.sweep?.isFunctionallyOver ? 'CLINCHED' : null,
    (ctx) => ctx.currentDay === 'Thu' || ctx.currentDay === 'Fri' ? 'WEEK CALLED EARLY' : null,
    (ctx) => (ctx.sweep?.leaderCatWins ?? 0) - (ctx.sweep?.trailerCatWins ?? 0) >= 7 ? 'THE BLOWOUT' : null,
  ],
  headlines: [
    // Locked + leader-named — the strongest framing when both names
    // are known and the math is mathematically over.
    (ctx) => ctx.sweep?.isFunctionallyOver && ctx.foil
      ? `${ctx.subject.name} has clinched against ${ctx.foil.name}. ${ctx.sweep!.leaderCatWins}-${ctx.sweep!.trailerCatWins} with ${ctx.sweep!.contestedCount} in play.`
      : null,

    // Locked, opponent-anchored. Shorter than the previous version
    // (which read as two sentences and wrapped 4-5 lines on the
    // home page). The "every cat left" math now lives in the body
    // via buildSweepLockedBody's V2 variant.
    (ctx) => ctx.sweep?.isFunctionallyOver && ctx.foil
      ? `Math says ${ctx.subject.name} can't lose this week.`
      : null,

    // Sweeping-style framing (big margin even without strict lock)
    (ctx) => (ctx.sweep?.leaderCatWins ?? 0) - (ctx.sweep?.trailerCatWins ?? 0) >= 6 && ctx.foil
      ? `${ctx.subject.name} is sweeping ${ctx.foil.name}. ${ctx.sweep!.leaderCatWins}-${ctx.sweep!.trailerCatWins} and the room knows it.`
      : null,

    // Day-of-week landing for Thu/Fri — the "week called early" voice
    (ctx) => ctx.sweep?.isFunctionallyOver && (ctx.currentDay === 'Thu' || ctx.currentDay === 'Fri')
      ? `${ctx.subject.name} closed the week before the weekend. ${ctx.sweep!.leaderCatWins}-${ctx.sweep!.trailerCatWins} and nothing left to decide.`
      : null,

    // Generic clinch when the foil isn't named (defensive)
    (ctx) => ctx.sweep?.isFunctionallyOver
      ? `${ctx.subject.name} has already won the week. The math closed at ${ctx.sweep!.leaderCatWins}-${ctx.sweep!.trailerCatWins}.`
      : null,

    // Heading-toward-sweep, not strictly locked yet — softer voice
    (ctx) => !ctx.sweep?.isFunctionallyOver && (ctx.sweep?.leaderCatWins ?? 0) - (ctx.sweep?.trailerCatWins ?? 0) >= 5 && ctx.foil
      ? `${ctx.subject.name} is closing in on a sweep of ${ctx.foil.name}. ${ctx.sweep!.leaderCatWins}-${ctx.sweep!.trailerCatWins} with ${ctx.sweep!.contestedCount} still moving.`
      : null,
  ],
  bodies: [
    (ctx) => ctx.sweep?.isFunctionallyOver ? buildSweepLockedBody(ctx) : null,
    (ctx) => !ctx.sweep?.isFunctionallyOver && (ctx.sweep?.leaderCatWins ?? 0) - (ctx.sweep?.trailerCatWins ?? 0) >= 5
      ? buildSweepHeadingBody(ctx)
      : null,
  ],
}

/** Locked-matchup body. The headline already announced the lock;
 *  the body adds context: what it means for the standings, what the
 *  leader's roster gets to do with the rest of the week, what the
 *  trailer needed and didn't get. */
function buildSweepLockedBody(ctx: LedeContext): string | null {
  const s = ctx.subject
  const f = ctx.foil
  const sw = ctx.sweep!
  const margin = sw.leaderCatWins - sw.trailerCatWins
  const variants: string[] = []

  // V1: rank-aware, names what it means for the standings
  if (f && s.rank <= 4) {
    variants.push(
      `${rankPhrase(s.rank)} adds another week to the ledger without a roster move. ${f.name} threw what was left at it; the margin only widened. ${cap(rankPhrase(s.rank))} now has ${s.catRecord} on the season.`,
    )
  }

  // V2: contrast — leader can rest, trailer can't recover this week
  if (f && sw.contestedCount > 0) {
    variants.push(
      `The remaining ${plural(sw.contestedCount, 'cat')} can't change the result. ${s.name} gets to play the rest of the week for streak stats; ${f.name} plays it for next week.`,
    )
  }

  // V3: zero contested left — totally closed, comment on margin.
  // Old version named the foil twice ("a ${margin}-cat margin against
  // ${f.name}. The standings update with the loss on ${f.name}'s
  // record..."). New version names the foil once and references back
  // as "the loss" so the body doesn't repeat the name.
  if (f && sw.contestedCount === 0) {
    variants.push(
      `Every cat is in. ${s.name} closed it ${sw.leaderCatWins}-${sw.trailerCatWins} against ${f.name}, a ${margin}-cat margin. The loss hits the standings before the weekend.`,
    )
  }

  // V4: blowout flavor (margin >= 7). Old version overclaimed
  // ("swept the categories X usually owns") — TLB doesn't have
  // per-team category strength data, and it repeated the foil
  // name in the trailing clause. New version drops the unsupported
  // claim and references back as "the rebuild list there" so the
  // body doesn't name the foil twice.
  if (f && margin >= 7) {
    variants.push(
      `A ${margin}-cat gap is the kind of week that costs a roster spot. ${s.name} swept categories all over the board; the rebuild list there just got longer.`,
    )
  }

  // V5: generic, always available
  variants.push(
    `The week reads ${sw.leaderCatWins}-${sw.trailerCatWins} with ${sw.contestedCount} ${plural(sw.contestedCount, 'cat', 'cats')} still in play. None of it can flip the outcome. ${s.name} banks the win; the rest of the matchups carry the week from here.`,
  )

  return pick(variants)
}

/** Heading-toward-sweep body. Less certain than locked — the
 *  matchup isn't over, but the margin is so wide that the framing
 *  is "the trailer would need a miracle." */
function buildSweepHeadingBody(ctx: LedeContext): string | null {
  const s = ctx.subject
  const f = ctx.foil
  const sw = ctx.sweep!
  const margin = sw.leaderCatWins - sw.trailerCatWins
  const variants: string[] = []

  if (f) {
    variants.push(
      `${s.name} sits ${margin} cats up with ${sw.contestedCount} still moving. ${f.name} would need to sweep what's left and split a tiebreaker — the kind of weekend that doesn't usually happen.`,
    )
    variants.push(
      `At ${sw.leaderCatWins}-${sw.trailerCatWins}, the matchup isn't mathematically closed, but the path for ${f.name} narrows every box score. ${s.name} just needs one cat from the remaining ${sw.contestedCount}.`,
    )
  } else {
    variants.push(
      `A ${margin}-cat lead with ${sw.contestedCount} still moving. The math is tilted hard; the trailer would need to sweep what's left to force a tie.`,
    )
  }

  return pick(variants)
}

/* ─────────────────────────────────────────────────────────────────
   KIND: BUBBLE-DRAMA

   Fires when playoff-line teams are in motion. Three flavors set by
   the detector via ctx.bubble.framing:
     - 'matchup'  — a bubble-vs-bubble draw is on the schedule THIS
       week. Loudest because the win/loss decides seeding directly.
     - 'crossing' — a team moved across the cutoff line overnight.
       Uses snapshotDelta; the headline names the climb / fall.
     - 'standing' — no acute trigger, just a tightly-packed bubble.
       Quieter — fires when nothing else rises, but still relevant
       late-season.

   Body voice leans on weeksRemaining + bubbleTeamCount + the cutoff
   seed number to anchor the column in concrete numbers, not "the
   race is heating up" filler.
───────────────────────────────────────────────────────────────── */

const BUBBLE_DRAMA: LedeTemplate = {
  kind: 'lede-bubble-drama',
  eyebrows: [
    () => 'THE BUBBLE',
    () => 'THE LINE',
    () => 'PLAYOFF MATH',
    (ctx) => ctx.bubble?.framing === 'matchup' ? 'THE BUBBLE BATTLE' : null,
    (ctx) => ctx.bubble?.framing === 'crossing'
      ? (ctx.bubble.subjectDistanceToLine >= 0 ? 'CLIMBING IN' : 'FALLING OUT')
      : null,
    (ctx) => (ctx.weeksRemaining ?? 99) <= 3 ? 'CRUNCH TIME' : null,
    (ctx) => (ctx.bubble?.bubbleTeamCount ?? 0) >= 4 ? 'THE LOG JAM' : null,
  ],
  headlines: [
    // Bubble-vs-bubble matchup — the strongest framing
    (ctx) => ctx.bubble?.framing === 'matchup' && ctx.foil
      ? `${ctx.subject.name} draws ${ctx.foil.name} with the ${rankPhrase(ctx.playoffCutoff)} on the line.`
      : null,
    (ctx) => ctx.bubble?.framing === 'matchup' && ctx.foil
      ? `The bubble decides itself this week. ${ctx.subject.name} and ${ctx.foil.name} draw each other with the cut at stake.`
      : null,

    // Overnight crossing — climb-in flavor
    (ctx) => ctx.bubble?.framing === 'crossing' && ctx.bubble.subjectDistanceToLine >= 0
      ? `${ctx.subject.name} climbed into the cut overnight. ${cap(rankPhrase(ctx.subject.rank))} now, ${plural(ctx.weeksRemaining ?? 0, 'week')} left to defend it.`
      : null,
    // Overnight crossing — fall-out flavor
    (ctx) => ctx.bubble?.framing === 'crossing' && ctx.bubble.subjectDistanceToLine < 0
      ? `${ctx.subject.name} dropped out of the cut overnight. ${cap(rankPhrase(ctx.subject.rank))} now, with ${plural(ctx.weeksRemaining ?? 0, 'week')} to climb back in.`
      : null,

    // Pure standings pressure — quieter framing, names the cluster
    (ctx) => ctx.bubble?.framing === 'standing' && (ctx.bubble.bubbleTeamCount ?? 0) >= 3
      ? `${ctx.bubble.bubbleTeamCount} teams sit within two games of the cutoff. ${ctx.subject.name} is the one drawing the toughest matchup this week.`
      : null,

    // Crunch-time variant (weeksRemaining ≤ 3)
    (ctx) => (ctx.weeksRemaining ?? 99) <= 3 && ctx.bubble
      ? `${plural(ctx.weeksRemaining!, 'week')} left and ${ctx.subject.name} sits ${distancePhrase(ctx.bubble.subjectDistanceToLine)} the cut.`
      : null,
  ],
  bodies: [
    (ctx) => ctx.bubble?.framing === 'matchup' ? buildBubbleMatchupBody(ctx) : null,
    (ctx) => ctx.bubble?.framing === 'crossing' ? buildBubbleCrossingBody(ctx) : null,
    (ctx) => ctx.bubble?.framing === 'standing' ? buildBubbleStandingBody(ctx) : null,
  ],
}

/** Render a "1 spot above the cut" / "2 games below" phrase that
 *  reads naturally inside a sentence. */
function distancePhrase(distance: number): string {
  if (distance === 0) return 'on the cut line'
  const abs = Math.abs(distance)
  const direction = distance > 0 ? 'above' : 'below'
  return `${abs} ${plural(abs, 'spot')} ${direction} the cut line`.replace(/(\d+) spots? /, `$1 ${abs === 1 ? 'spot' : 'spots'} `)
}

/** Matchup-framing body — the strongest case, names both sides and
 *  ties to the standings impact. */
function buildBubbleMatchupBody(ctx: LedeContext): string | null {
  const s = ctx.subject
  const f = ctx.foil
  const remaining = ctx.weeksRemaining ?? 0
  if (!f) return null
  const variants: string[] = []

  // V1: weeks-anchored, names what the matchup decides
  if (remaining > 0) {
    variants.push(
      `${s.name} at ${s.catRecord}, ${f.name} at ${f.catRecord}. Both are ${distancePhrase(ctx.bubble!.subjectDistanceToLine)}; the winner walks out of week ${ctx.currentWeek} inside the cut, the loser walks out with ${plural(remaining, 'week')} to fix it.`,
    )
  }

  // V2: standings-cluster context
  if ((ctx.bubble?.bubbleTeamCount ?? 0) >= 3) {
    variants.push(
      `With ${ctx.bubble!.bubbleTeamCount} teams crammed inside two games of the line, head-to-heads matter more than ever. ${s.name} and ${f.name} are the matchup that decides itself this week.`,
    )
  }

  // V3: minimum-data fallback
  variants.push(
    `${s.name} and ${f.name} are both ${distancePhrase(ctx.bubble!.subjectDistanceToLine)} the cut. Whoever wins the matchup walks out ahead of the other; whoever loses spends next week trying to recover the spot.`,
  )

  return pick(variants)
}

/** Overnight-crossing body — names the rank shift and what it
 *  means with the time left. */
function buildBubbleCrossingBody(ctx: LedeContext): string | null {
  const s = ctx.subject
  const remaining = ctx.weeksRemaining ?? 0
  const distAbs = Math.abs(ctx.bubble!.subjectDistanceToLine)
  const variants: string[] = []

  if (ctx.bubble!.subjectDistanceToLine >= 0) {
    // Just climbed in
    variants.push(
      `${s.name} sits at ${s.catRecord} after the rank shift. With ${plural(remaining, 'week')} left and ${ctx.bubble!.bubbleTeamCount} teams within two games of the line, the seat is rented, not owned.`,
    )
    variants.push(
      `The climb covers a single rank spot, not a margin. ${s.name} needs ${remaining > 1 ? 'another four-to-five weeks like this one' : 'one more'} to make the move stick.`,
    )
  } else {
    // Just fell out
    variants.push(
      `${s.name} at ${s.catRecord}, ${distancePhrase(ctx.bubble!.subjectDistanceToLine)}. ${plural(remaining, 'week')} left to make the climb back. Each one matters more than the last.`,
    )
    variants.push(
      `A ${distAbs}-spot slip the wrong way of the cut. ${s.name} has ${plural(remaining, 'week')} to put together the run that puts them back inside.`,
    )
  }

  return pick(variants)
}

/** Standings-only body — quietest framing, leans on the cluster
 *  count and weeks remaining instead of a single trigger event. */
function buildBubbleStandingBody(ctx: LedeContext): string | null {
  const s = ctx.subject
  const remaining = ctx.weeksRemaining ?? 0
  const count = ctx.bubble!.bubbleTeamCount
  const variants: string[] = []

  if (count >= 4) {
    variants.push(
      `Four teams within two games of the cutoff, ${plural(remaining, 'week')} left. ${s.name} at ${s.catRecord} is the one with the schedule still in front of them — every matchup from here picks a side.`,
    )
  }

  variants.push(
    `${s.name} sits at ${s.catRecord}, ${distancePhrase(ctx.bubble!.subjectDistanceToLine)}. ${cap(plural(remaining, 'week'))} left to settle a top-${ctx.playoffCutoff} that's anything but settled.`,
  )

  return pick(variants)
}

/* ─────────────────────────────────────────────────────────────────
   KIND MAP — extended as we add Kinds
───────────────────────────────────────────────────────────────── */

/* ─────────────────────────────────────────────────────────────────
   KIND: QUIET-DAY

   The honest fallback. Fires at score floor when nothing else
   rose — every team is in the middle of the pack, no streaks above
   noise, no locks coming, the season's still calm. Body doesn't
   pretend a story is there; it tells the reader why no story is
   there, then points them at the standings or the matchups.

   Detector always emits this at low weight (35) so the column
   never goes dark. Higher-weight Kinds beat it whenever they're
   viable; quiet-day wins by default on truly slow days.
───────────────────────────────────────────────────────────────── */

const QUIET_DAY: LedeTemplate = {
  kind: 'lede-quiet-day',
  eyebrows: [
    () => 'OFF DAY',
    () => 'NOTHING DOING',
    () => 'A QUIET BOARD',
    () => 'SLOW MORNING',
    (ctx) => ctx.currentDay === 'Mon' ? "MONDAY'S LOOK" : null,
    (ctx) => ctx.currentDay === 'Sun' ? "SUNDAY'S READ" : null,
  ],
  headlines: [
    // Generic — works any day, any league state
    () => `Nothing dramatic on the board today. A good day to read the standings.`,
    () => `A quiet morning for the magazine. The league's middle is still being argued out.`,
    () => `No alarms, no surprises. The season keeps its shape another day.`,

    // Mid-pack pack framing — fires when no team is loud enough
    (ctx) => ctx.totalTeams >= 8
      ? `${ctx.totalTeams} teams, no one running away with anything. The middle of the league is doing the talking right now.`
      : null,

    // Monday-specific
    (ctx) => ctx.currentDay === 'Mon'
      ? `Monday. The slate's in, no one ran the board. The week opens with the standings shaped like they were before.`
      : null,

    // Sunday-specific — different cadence, less "off day" more "settled"
    (ctx) => ctx.currentDay === 'Sun'
      ? `Sunday. The week closes the way it opened — no team broke loose, no team collapsed. The standings sit.`
      : null,

    // Week-context aware — leans on currentWeek for grounding
    (ctx) => ctx.currentWeek >= 1
      ? `Week ${ctx.currentWeek}. The headlines are quiet today; the games will pick what's next.`
      : null,
  ],
  bodies: [
    // Generic — always available, points at the standings
    () => `The matchups are mid-week and contested. The streaks are short. The lead is unchanged. The magazine's job on a day like this is to keep the lights on and the standings honest until something loud happens.`,

    // Standings-pointer — names what the reader could look at
    (ctx) => ctx.totalTeams >= 4
      ? `The top of the table is the same as yesterday and the bottom is the same as last week. The interesting reading is in the middle, where ${ctx.totalTeams - 4} teams sit close enough to swap places before the weekend.`
      : null,

    // Honest cadence framing
    () => `Fantasy seasons are mostly weeks like this — the standings hold, the matchups quietly work themselves out, the box scores accumulate. The column will be louder when the league earns it.`,

    // Monday-specific
    (ctx) => ctx.currentDay === 'Mon'
      ? `Mondays are for re-reading what just settled. Nothing new is on the board yet; the box scores from the weekend already shaped the table you're looking at.`
      : null,
  ],
}

const KIND_TO_TEMPLATE: Record<LedeKind, LedeTemplate | null> = {
  'lede-streak-watch':       STREAK_WATCH,
  'lede-sweep-in-progress':  SWEEP_IN_PROGRESS,
  'lede-bubble-drama':       BUBBLE_DRAMA,
  'lede-standings-shift':    null,
  'lede-history':            null,
  'lede-week-preview':       null,
  'lede-closer':             null,
  'lede-quiet-day':          QUIET_DAY,
}

/* ─────────────────────────────────────────────────────────────────
   PUBLIC RENDER — pick a variant from each pool, assemble.
───────────────────────────────────────────────────────────────── */

export interface RenderedLedeCopy {
  eyebrow: string
  headline: string
  body: string
}

/** Render a Lede for a chosen Kind + context. Selection of *which*
 *  Kind is the detector's job; this function just runs the template
 *  pool and assembles. Returns null when no variant fits the data
 *  (fact-gating produced an empty pool) — the caller should fall
 *  back to the next Kind or to `lede-quiet-day`. */
export function renderLede(kind: LedeKind, ctx: LedeContext): RenderedLedeCopy | null {
  const tpl = KIND_TO_TEMPLATE[kind]
  if (!tpl) return null
  const eyebrow = pickViable(tpl.eyebrows, ctx) ?? ''
  const headline = pickViable(tpl.headlines, ctx)
  const body = pickViable(tpl.bodies, ctx)
  if (!headline || !body) return null
  return { eyebrow, headline, body }
}

/** Pick a variant whose function returns a non-null string. Filters
 *  the pool first, then random-samples among survivors. */
function pickViable<T>(pool: Array<(ctx: LedeContext) => T | null>, ctx: LedeContext): T | null {
  const viable = pool.map((fn) => fn(ctx)).filter((v): v is T => v !== null && v !== '')
  if (viable.length === 0) return null
  return pick(viable)
}
