/**
 * Rendering pipeline — THE BEAT (daily news wire).
 *
 * Reads the detected `BeatItemSeed[]` from detect-beat.ts and turns
 * them into final `BeatItem`s the view consumes. Each category has a
 * variant pool (3-5 phrasings) so the feed doesn't read like an
 * automated alert script.
 *
 * Variant selection is deterministic per (seed.id + week) so the
 * Beat looks stable across re-renders within the same week — the
 * reader who refreshes the page sees the same wording, not a fresh
 * random pull every time.
 */

import type { CategoryLeagueData } from './types.ts'
import type {
  BeatCategory,
  BeatItemSeed,
  BeatPayload,
  BeatWidget,
  FinalPayload,
  StreakPayload,
  ThronePayload,
  CellarPayload,
  RacePayload,
  IssuePayload,
  BriefingPayload,
  LivePayload,
  HugeGamePayload,
  BenchBlunderPayload,
  FreeAgentPayload,
} from './detect-beat.ts'
import { detectBeat } from './detect-beat.ts'
import { stripEmojiForEditorial } from './detect-lede.ts'

/* ─────────────────────────────────────────────────────────────────
   PUBLIC OUTPUT TYPES
───────────────────────────────────────────────────────────────── */

export interface BeatItem {
  id: string
  category: BeatCategory
  categoryLabel: string         // display label: "FINAL", "STREAK", etc.
  timestamp: Date
  importance: 'high' | 'med' | 'low'
  headline: string
  body?: string
  widget?: BeatWidget
  /**
   * Exactly one item per day is marked featured — the highest-importance
   * item, tie-broken by recency. Drives the magazine-style lead layout
   * (bigger avatar, larger headline, body always rendered).
   */
  isFeatured: boolean
}

export interface BeatDay {
  label: string                  // "TODAY · TUESDAY, JUN 4", "YESTERDAY · MONDAY, JUN 3"
  date: Date
  items: BeatItem[]
}

export interface RenderedBeat {
  /** All items grouped by day, days descending. */
  days: BeatDay[]
  /** Flat list, also descending. Useful for sharing/searching. */
  items: BeatItem[]
}

/* ─────────────────────────────────────────────────────────────────
   PUBLIC ENTRY
───────────────────────────────────────────────────────────────── */

export function renderBeat(
  data: CategoryLeagueData,
  now: Date = new Date(),
): RenderedBeat {
  const seeds = detectBeat(data, now)
  const teamName = makeTeamNameLookup(data)
  const items = seeds.map((seed) => renderSeed(seed, teamName))
  const days = groupByDay(items, now)
  return { days, items }
}

/* ─────────────────────────────────────────────────────────────────
   SEED -> ITEM
───────────────────────────────────────────────────────────────── */

function renderSeed(
  seed: BeatItemSeed,
  teamName: (id: string) => string,
): BeatItem {
  const ctx: RenderCtx = { teamName, seed }
  const headline = renderHeadline(seed.payload, ctx)
  const body = renderBody(seed.payload, ctx)
  const widget = renderWidget(seed.payload)
  return {
    id: seed.id,
    category: seed.category,
    categoryLabel: categoryLabel(seed.category),
    timestamp: seed.timestamp,
    importance: seed.importance,
    headline,
    body,
    widget,
    isFeatured: false,  // mutated by markFeaturedPerDay()
  }
}

function categoryLabel(c: BeatCategory): string {
  switch (c) {
    case 'FINAL':         return 'Final'
    case 'STREAK':        return 'Streak'
    case 'THRONE':        return 'New #1'
    case 'CELLAR':        return 'Cellar'
    case 'RACE':          return 'Race'
    case 'ISSUE':         return 'Issue'
    case 'BRIEFING':      return 'Briefing'
    case 'LIVE':          return 'Live'
    case 'HUGE_GAME':     return 'Huge Game'
    // Shortened from "Bench Blunder" so the pill fits in the
    // fixed 80px category column without overflowing into the
    // headline. The viewer-side framing ("Your bench had…")
    // already names the surface, so "Blunder" alone reads clear.
    case 'BENCH_BLUNDER': return 'Blunder'
    // "Wire" — short, editorial ("the waiver wire"), fits the
    // 80px pill column. "Free Agent" / "FA" both alternatives
    // but "Wire" reads more publication-voice.
    case 'FREE_AGENT':    return 'Wire'
  }
}

/* ─────────────────────────────────────────────────────────────────
   VARIANT POOLS — HEADLINES

   Each category pool is an array of functions; the first to return a
   non-null string for the given payload becomes a candidate. The
   deterministic picker (`pickStable`) selects one based on a hash of
   the seed id, so the rendered text is stable across re-renders of
   the same event.
───────────────────────────────────────────────────────────────── */

interface RenderCtx {
  teamName: (id: string) => string
  seed: BeatItemSeed
}

type VariantFn<P extends BeatPayload> = (p: P, ctx: RenderCtx) => string | null

function renderHeadline(payload: BeatPayload, ctx: RenderCtx): string {
  switch (payload.category) {
    case 'FINAL':         return pickStable(ctx.seed.id, FINAL_HEADLINES, payload, ctx)
    case 'STREAK':        return pickStable(ctx.seed.id, STREAK_HEADLINES, payload, ctx)
    case 'THRONE':        return pickStable(ctx.seed.id, THRONE_HEADLINES, payload, ctx)
    case 'CELLAR':        return pickStable(ctx.seed.id, CELLAR_HEADLINES, payload, ctx)
    case 'RACE':          return pickStable(ctx.seed.id, RACE_HEADLINES, payload, ctx)
    case 'ISSUE':         return pickStable(ctx.seed.id, ISSUE_HEADLINES, payload, ctx)
    case 'BRIEFING':      return pickStable(ctx.seed.id, BRIEFING_HEADLINES, payload, ctx)
    case 'LIVE':          return pickStable(ctx.seed.id, LIVE_HEADLINES, payload, ctx)
    case 'HUGE_GAME':     return pickStable(ctx.seed.id, HUGE_GAME_HEADLINES, payload, ctx)
    case 'BENCH_BLUNDER': return pickStable(ctx.seed.id, BENCH_BLUNDER_HEADLINES, payload, ctx)
    case 'FREE_AGENT':    return pickStable(ctx.seed.id, FREE_AGENT_HEADLINES, payload, ctx)
  }
}

function renderBody(payload: BeatPayload, ctx: RenderCtx): string | undefined {
  switch (payload.category) {
    case 'FINAL':         return pickStableOptional(ctx.seed.id + ':body', FINAL_BODIES, payload, ctx)
    case 'STREAK':        return pickStableOptional(ctx.seed.id + ':body', STREAK_BODIES, payload, ctx)
    case 'THRONE':        return pickStableOptional(ctx.seed.id + ':body', THRONE_BODIES, payload, ctx)
    case 'CELLAR':        return pickStableOptional(ctx.seed.id + ':body', CELLAR_BODIES, payload, ctx)
    case 'RACE':          return pickStableOptional(ctx.seed.id + ':body', RACE_BODIES, payload, ctx)
    case 'ISSUE':         return pickStableOptional(ctx.seed.id + ':body', ISSUE_BODIES, payload, ctx)
    case 'BRIEFING':      return pickStableOptional(ctx.seed.id + ':body', BRIEFING_BODIES, payload, ctx)
    case 'LIVE':          return pickStableOptional(ctx.seed.id + ':body', LIVE_BODIES, payload, ctx)
    case 'HUGE_GAME':     return pickStableOptional(ctx.seed.id + ':body', HUGE_GAME_BODIES, payload, ctx)
    case 'BENCH_BLUNDER': return pickStableOptional(ctx.seed.id + ':body', BENCH_BLUNDER_BODIES, payload, ctx)
    case 'FREE_AGENT':    return pickStableOptional(ctx.seed.id + ':body', FREE_AGENT_BODIES, payload, ctx)
  }
}

// All variants use past tense or verbless constructions so plural-
// sounding team names ("The Queens Bombers", "Kingslayers") read
// clean. Present-tense verbs ("takes", "closes") would imply singular
// subject and read awkwardly with those names.
const FINAL_HEADLINES: VariantFn<FinalPayload>[] = [
  (p, c) => p.margin >= 6 ? `${c.teamName(p.winnerTeamId)} swept ${c.teamName(p.loserTeamId)}, ${p.winnerCats}-${p.loserCats}.` : null,
  (p, c) => p.margin === 1 ? `${c.teamName(p.winnerTeamId)} edged ${c.teamName(p.loserTeamId)}, ${p.winnerCats}-${p.loserCats}.` : null,
  (p, c) => `${c.teamName(p.winnerTeamId)} ${p.winnerCats}-${p.loserCats} over ${c.teamName(p.loserTeamId)}.`,
  (p, c) => `Final: ${c.teamName(p.winnerTeamId)} ${p.winnerCats}-${p.loserCats}.`,
  (p, c) => `${c.teamName(p.winnerTeamId)} closed out ${c.teamName(p.loserTeamId)}, ${p.winnerCats}-${p.loserCats}.`,
  (p, c) => p.margin >= 4 ? `${c.teamName(p.winnerTeamId)} handled ${c.teamName(p.loserTeamId)}, ${p.winnerCats}-${p.loserCats}.` : null,
]

// Bodies carry REAL POST-MATCHUP CONTEXT, not generic platitudes. Each
// variant reads from the payload's standing data (winner/loser streak,
// season record, rank) and produces a fact the reader couldn't
// otherwise see in the headline.
//
// Thriller priority: when margin === 1, the data-driven variants are
// suppressed in favor of the dramatic "down to the last cat" framing.
// A one-cat thriller is *about* the drama, not the bookkeeping; the
// loser's record + streak can stand on the headline alone.
const FINAL_BODIES: VariantFn<FinalPayload>[] = [
  // Thriller-only variants (margin === 1). These dominate the pool
  // for one-cat matchups.
  (p, _c) => p.margin === 1 ? `Down to the last cat.` : null,
  (p, _c) => p.margin === 1 ? `One cat away from a tie.` : null,
  (p, _c) => p.margin === 1 ? `Decided in the final innings.` : null,
  (p, _c) => p.margin === 1 ? `Came down to the closer.` : null,

  // Streak context for the winner — most editorially loaded angle.
  // Suppressed on thrillers so the drama variants get the slot.
  (p, c) => p.margin !== 1 && p.winnerStreakType === 'W' && (p.winnerStreakLength ?? 0) >= 5
    ? `${c.teamName(p.winnerTeamId)}'s ${p.winnerStreakLength}-game win streak holds.`
    : null,
  (p, c) => p.margin !== 1 && p.winnerStreakType === 'W' && (p.winnerStreakLength ?? 0) >= 3 && (p.winnerStreakLength ?? 0) < 5
    ? `${c.teamName(p.winnerTeamId)} now on a ${p.winnerStreakLength}-game run.`
    : null,
  (p, _c) => p.margin !== 1 && p.winnerStreakType === 'W' && p.winnerStreakLength === 2
    ? `Back-to-back wins.`
    : null,

  // Streak context for the loser — the slide angle.
  (p, c) => p.margin !== 1 && p.loserStreakType === 'L' && (p.loserStreakLength ?? 0) >= 5
    ? `${c.teamName(p.loserTeamId)} now ${p.loserStreakLength} weeks deep in the cold.`
    : null,
  (p, c) => p.margin !== 1 && p.loserStreakType === 'L' && (p.loserStreakLength ?? 0) >= 3 && (p.loserStreakLength ?? 0) < 5
    ? `${c.teamName(p.loserTeamId)} drops to L${p.loserStreakLength}.`
    : null,

  // Record context — how this matchup moved the season ledger.
  (p, c) => p.margin !== 1 && p.loserSeasonRecord
    ? `Drops ${c.teamName(p.loserTeamId)} to ${p.loserSeasonRecord} on the year.`
    : null,
  (p, c) => p.margin !== 1 && p.winnerSeasonRecord && p.margin >= 6
    ? `${c.teamName(p.winnerTeamId)} now ${p.winnerSeasonRecord} on the year.`
    : null,

  // Rank context — the standings position after the matchup.
  (p, c) => p.margin !== 1 && p.winnerRank === 1
    ? `Keeps ${c.teamName(p.winnerTeamId)} at #1.`
    : null,
  (p, c) => p.margin !== 1 && p.winnerRank && p.winnerRank <= 3 && p.winnerRank > 1
    ? `Holds ${c.teamName(p.winnerTeamId)} in the top three.`
    : null,

  // Sweep-only flavor (extreme margins).
  (p, _c) => p.margin >= 8 ? `Total domination.` : null,

  // Default: no body for medium-margin matchups with no notable context.
  (_p, _c) => null,
]

// Past-tense / verbless constructions throughout so plural-sounding
// team names ("Queens Bombers", "Kingslayers") read clean. "Hits" /
// "extends" assume singular subject and stumble on plural names.
const STREAK_HEADLINES: VariantFn<StreakPayload>[] = [
  // W10+ — historic territory, full phrasing.
  (p, c) => p.streakType === 'W' && p.milestone === 10 ? `${c.teamName(p.teamId)}: W${p.length}. Ten straight.` : null,
  (p, c) => p.streakType === 'W' && p.milestone === 10 ? `Ten in a row for ${c.teamName(p.teamId)}.` : null,
  // W7+
  (p, c) => p.streakType === 'W' && p.milestone === 7 ? `${c.teamName(p.teamId)} up to W${p.length}.` : null,
  (p, c) => p.streakType === 'W' && p.milestone === 7 ? `${c.teamName(p.teamId)}: ${p.length}-game win streak.` : null,
  // W5+
  (p, c) => p.streakType === 'W' && p.milestone === 5 ? `${c.teamName(p.teamId)}: W${p.length}. Five-game run.` : null,
  (p, c) => p.streakType === 'W' && p.milestone === 5 ? `Five straight for ${c.teamName(p.teamId)}.` : null,

  // L8+ — deep cellar territory.
  (p, c) => p.streakType === 'L' && p.milestone === 8 ? `${c.teamName(p.teamId)}: L${p.length}. Eight deep.` : null,
  (p, c) => p.streakType === 'L' && p.milestone === 8 ? `${c.teamName(p.teamId)} now ${p.length} losses deep.` : null,
  // L5+
  (p, c) => p.streakType === 'L' && p.milestone === 5 ? `${c.teamName(p.teamId)} down to L${p.length}.` : null,
  (p, c) => p.streakType === 'L' && p.milestone === 5 ? `${c.teamName(p.teamId)}: ${p.length}-game cold spell.` : null,
]

const STREAK_BODIES: VariantFn<StreakPayload>[] = [
  (p, _c) => p.streakType === 'W' && p.length >= 7 ? `The ladder reflects the work.` : null,
  (p, _c) => p.streakType === 'L' && p.length >= 5 ? `The slide isn't slowing.` : null,
  (_p, _c) => null,
]

const THRONE_HEADLINES: VariantFn<ThronePayload>[] = [
  (p, c) => p.heldFor >= 6 ? `${c.teamName(p.newLeaderTeamId)} took #1 from ${c.teamName(p.displacedTeamId)} after ${p.heldFor} weeks at the top.` : null,
  (p, c) => p.heldFor >= 3 ? `${c.teamName(p.newLeaderTeamId)} ended ${c.teamName(p.displacedTeamId)}'s ${p.heldFor}-week reign.` : null,
  (p, c) => `${c.teamName(p.newLeaderTeamId)} took the top spot from ${c.teamName(p.displacedTeamId)}.`,
  (p, c) => `New #1: ${c.teamName(p.newLeaderTeamId)}.`,
]

const THRONE_BODIES: VariantFn<ThronePayload>[] = [
  (p, _c) => p.heldFor >= 6 ? `The longest reign of the season ends.` : null,
  (_p, _c) => null,
]

const CELLAR_HEADLINES: VariantFn<CellarPayload>[] = [
  (p, c) => p.ownsCount === 0 && p.bleedingCount >= 5 ? `${c.teamName(p.teamId)} owns nothing. ${p.bleedingCount} cats running cold.` : null,
  (p, c) => p.streakType === 'L' && p.streakLength >= 6 ? `${c.teamName(p.teamId)} down to L${p.streakLength}. The slide deepens.` : null,
  (p, c) => p.streakType === 'L' && p.streakLength >= 4 ? `${c.teamName(p.teamId)} sitting at L${p.streakLength}. ${p.bleedingCount} cats bleeding.` : null,
  (p, c) => p.ownsCount === 0 ? `${c.teamName(p.teamId)} still owns nothing.` : null,
  (p, c) => `${c.teamName(p.teamId)} bleeding in ${p.bleedingCount} categories.`,
]

const CELLAR_BODIES: VariantFn<CellarPayload>[] = [
  (p, _c) => p.streakLength >= 6 ? `The math has run out of patience.` : null,
  (_p, _c) => null,
]

const RACE_HEADLINES: VariantFn<RacePayload>[] = [
  (p, c) => p.gap === 0 ? `${c.teamName(p.teamAId)} and ${c.teamName(p.teamBId)} are dead even.` : null,
  (p, c) => p.gap === 1 ? `${c.teamName(p.teamAId)} clings to a 1-cat lead over ${c.teamName(p.teamBId)}.` : null,
  (p, c) => p.gap === 2 ? `${c.teamName(p.teamAId)} sits 2 cats ahead of ${c.teamName(p.teamBId)}.` : null,
  (p, c) => `${c.teamName(p.teamAId)} and ${c.teamName(p.teamBId)}: ${p.gap}-cat gap.`,
]

// Race body adds standings context. The Beat detector iterates
// standings rank, not power-rank — so the two race teams may appear
// rows apart on THE BOARD (which is power-sorted). Body lines name
// the playoff stake so the reader doesn't have to translate.
const RACE_BODIES: VariantFn<RacePayload>[] = [
  // Tied at the seam — the most dramatic race + playoff stakes.
  (p, _c) => p.gap === 0 && p.distanceFromCutline <= 0.5 ? `Tied in the standings — and on the playoff line.` : null,
  (p, _c) => p.gap === 0 && p.distanceFromCutline <= 1.5 ? `Tied in the standings, a seat from the cutoff.` : null,
  (p, _c) => p.gap === 0 ? `Dead even in the standings.` : null,
  // Right at the cutline — the playoff seam itself.
  (p, _c) => p.distanceFromCutline <= 0.5 ? `Adjacent in the standings — and on the playoff line.` : null,
  (p, _c) => p.distanceFromCutline <= 0.5 ? `The seam at the playoff cutoff.` : null,
  // One seat off the cutline.
  (p, _c) => p.distanceFromCutline > 0.5 && p.distanceFromCutline <= 1.5 ? `One seat off the playoff cutoff in the standings.` : null,
  (p, _c) => p.distanceFromCutline > 0.5 && p.distanceFromCutline <= 1.5 ? `Adjacent in the standings, a seat from the cutoff.` : null,
  // Deeper in the field — still adjacent in standings but well away from the cutline.
  (p, _c) => p.distanceFromCutline > 1.5 ? `Adjacent in the standings, well off the playoff line.` : null,
  (_p, _c) => null,
]

const ISSUE_HEADLINES: VariantFn<IssuePayload>[] = [
  (p, _c) => `Issue ${p.issueNumber}: the latest edition is live.`,
  (p, _c) => `Issue ${p.issueNumber} published. Week ${p.week} chronicled.`,
  (p, _c) => `The Issue dropped: Week ${p.week} is on the page.`,
  (p, _c) => `Issue ${p.issueNumber}: Week ${p.week} in the books.`,
]

// Body lines for the ISSUE item. When a cover team is known, the body
// names it — turning the wire's "issue published" notice into a real
// cross-link to the recap's editorial angle. Without a cover team
// (Week 1 edge), the body falls through to a generic line.
const ISSUE_BODIES: VariantFn<IssuePayload>[] = [
  (p, _c) => p.coverTeamNameClean
    ? `Cover: ${p.coverTeamNameClean} holds the line. Read the issue →`
    : null,
  (p, _c) => p.coverTeamNameClean
    ? `Cover story: ${p.coverTeamNameClean}.`
    : null,
  (p, _c) => p.coverTeamNameClean
    ? `${p.coverTeamNameClean} anchors the recap.`
    : null,
  (_p, _c) => `Read the recap of the week.`,
]

const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

// Timeless framing — the BRIEFING fires at 7 AM but the reader sees
// it at any point during the day. "Heading into Thursday's slate"
// reads stale if the reader visits at 2 PM after games have started.
// New variants describe state without implying a time anchor.
const BRIEFING_HEADLINES: VariantFn<BriefingPayload>[] = [
  // Monday-morning kickoff variants — fire when the week's slate
  // exists but nothing's live yet. Gives the wire a real opening
  // headline instead of nothing on the slow-start day. Gated on
  // weekday === 1 (Monday) AND liveCount === 0 so they don't leak
  // into mid-week states.
  (p, _c) => p.weekday === 1 && p.liveCount === 0
    ? `The slate is set for the week.`
    : null,
  (p, _c) => p.weekday === 1 && p.liveCount === 0
    ? `New week, new scoreboard.`
    : null,
  (p, _c) => p.weekday === 1 && p.liveCount === 0
    ? `Monday: the wire opens on a fresh slate.`
    : null,
  // Active-day variants (live games in progress).
  (p, _c) => p.coinFlipCount >= 3
    ? `${p.coinFlipCount} coin flips on the ${WEEKDAY_NAMES[p.weekday]} slate.`
    : null,
  (p, _c) => p.coinFlipCount === 2
    ? `Two coin flips on the ${WEEKDAY_NAMES[p.weekday]} slate.`
    : null,
  (p, _c) => p.coinFlipCount === 1
    ? `One coin flip on the ${WEEKDAY_NAMES[p.weekday]} slate.`
    : null,
  (p, _c) => p.liveCount > 0 ? `${p.liveCount} matchups in motion today.` : null,
  (p, _c) => p.liveCount > 0 ? `${WEEKDAY_NAMES[p.weekday]}'s slate: ${p.liveCount} live, ${p.coinFlipCount} on the bubble.` : null,
]

const BRIEFING_BODIES: VariantFn<BriefingPayload>[] = [
  // Use " vs " as the team joiner. The previous "–" produced
  // "Team-Jazz" — visually a hyphenated compound — when team names
  // were multi-word.
  (p, c) => p.marqueeHomeTeamId && p.marqueeAwayTeamId
    ? `${c.teamName(p.marqueeHomeTeamId)} vs ${c.teamName(p.marqueeAwayTeamId)} is the closest one to watch.`
    : null,
  // Monday body variants — anchor the slate-set framing.
  (p, _c) => p.weekday === 1 && p.liveCount === 0
    ? `Six days of category trading ahead.`
    : null,
  (p, _c) => p.weekday === 1 && p.liveCount === 0
    ? `Lineups locking in. Final cuts at first pitch.`
    : null,
  (p, _c) => p.weekday === 0
    ? `Last day of the scoring week.`
    : null,
  (p, _c) => p.weekday === 6
    ? `Saturday sets the table for Sunday's finals.`
    : null,
  (_p, _c) => null,
]

const LIVE_HEADLINES: VariantFn<LivePayload>[] = [
  (p, c) => p.homeCats === p.awayCats
    ? `${c.teamName(p.homeTeamId)} and ${c.teamName(p.awayTeamId)} tied ${p.homeCats}-${p.awayCats} live.`
    : null,
  (p, c) => p.homeCats - p.awayCats === 1
    ? `${c.teamName(p.homeTeamId)} edging ${c.teamName(p.awayTeamId)}, ${p.homeCats}-${p.awayCats}.`
    : null,
  (p, c) => `${c.teamName(p.homeTeamId)} ${p.homeCats}-${p.awayCats} over ${c.teamName(p.awayTeamId)} with ${p.contestedCount} contested.`,
  (p, c) => `${c.teamName(p.homeTeamId)}–${c.teamName(p.awayTeamId)}: ${p.homeCats}-${p.awayCats}, ${p.contestedCount} cats live.`,
]

/* ─────────────────────────────────────────────────────────────────
   HUGE GAME — a player's standout day. Headlines lead with the
   player, name the team, and carry the stat line as the proof.
───────────────────────────────────────────────────────────────── */

const HUGE_GAME_HEADLINES: VariantFn<HugeGamePayload>[] = [
  (p, c) => p.trigger === 'multi-cat'
    ? `${p.playerName}: ${p.headlineStats} for ${c.teamName(p.fantasyTeamId)}.`
    : null,
  (p, c) => p.trigger === 'multi-hr'
    ? `${p.playerName} went off for ${c.teamName(p.fantasyTeamId)}: ${p.headlineStats}.`
    : null,
  (p, c) => p.trigger === 'big-k'
    ? `${p.playerName} dominated for ${c.teamName(p.fantasyTeamId)}: ${p.headlineStats}.`
    : null,
  (p, c) => p.trigger === 'no-hitter'
    ? `No-hitter: ${p.playerName} for ${c.teamName(p.fantasyTeamId)}. ${p.headlineStats}.`
    : null,
  (p, c) => p.trigger === 'multi-hit'
    ? `${p.playerName} on base all day for ${c.teamName(p.fantasyTeamId)}: ${p.headlineStats}.`
    : null,
  (p, c) => p.trigger === 'big-rbi'
    ? `${p.playerName} drove them in for ${c.teamName(p.fantasyTeamId)}: ${p.headlineStats}.`
    : null,
  (p, c) => p.trigger === 'big-sv'
    ? `${p.playerName} locked it down for ${c.teamName(p.fantasyTeamId)}: ${p.headlineStats}.`
    : null,
  // Fallback — generic huge-game framing when the trigger is unusual.
  (p, c) => `${p.playerName}: ${p.headlineStats} for ${c.teamName(p.fantasyTeamId)}.`,
]

const HUGE_GAME_BODIES: VariantFn<HugeGamePayload>[] = [
  (p, _c) => p.trigger === 'multi-hr' && (p.stats.HR ?? 0) >= 4
    ? `Four-bomb day. Once-a-season territory.`
    : null,
  (p, _c) => p.trigger === 'multi-hr'
    ? `${p.stats.HR}-homer day. The kind of stat-line that swings a category.`
    : null,
  (p, _c) => p.trigger === 'big-k' && (p.stats.K ?? 0) >= 13
    ? `${p.stats.K} K's in a single start — single-day high for the rotation.`
    : null,
  (p, _c) => p.trigger === 'multi-cat'
    ? `Hit it, drove it in, scored it. Cross-category windfall.`
    : null,
  (p, c) => p.position && p.mlbTeam
    ? `${p.position} for ${p.mlbTeam}. Picked up the slack for ${c.teamName(p.fantasyTeamId)}.`
    : null,
  (_p, _c) => null,
]

/* ─────────────────────────────────────────────────────────────────
   BENCH BLUNDER — the player you didn't start, who went off.
   Tone discipline (per scope doc): cheeky, not mean. The manager
   already knows. The Beat is the friend at the bar pointing it
   out, not the columnist writing a takedown.
───────────────────────────────────────────────────────────────── */

// Viewer-side framing: in Phase 1, every BENCH_BLUNDER attaches to
// the viewer's own team (myBenchedPlayers only resolves their bench).
// So the copy reads in the second person — "you benched Bichette" —
// not third person. This is the friend at the bar pointing it out,
// not the columnist writing about someone else.
const BENCH_BLUNDER_HEADLINES: VariantFn<BenchBlunderPayload>[] = [
  (p, _c) => `Tough bench: ${p.playerName} went ${p.benchedStats}.`,
  (p, _c) => `${p.playerName} sat on your bench and went ${p.benchedStats}.`,
  (p, _c) => `Your bench had ${p.playerName} for ${p.benchedStats}.`,
  (p, _c) => `${p.playerName}, on your bench: ${p.benchedStats}.`,
  // Phase 2 variants — fire when the starter comparison data lands.
  (p, _c) => p.startedPlayerName && p.startedStats
    ? `Started ${p.startedPlayerName} (${p.startedStats}) over ${p.playerName} (${p.benchedStats}).`
    : null,
]

const BENCH_BLUNDER_BODIES: VariantFn<BenchBlunderPayload>[] = [
  (p, _c) => p.costSummary
    ? `${p.costSummary}. Sometimes it's like that.`
    : null,
  (_p, _c) => `Sometimes the lineup decisions don't break your way.`,
  (p, _c) => p.startedPlayerName
    ? `${p.startedPlayerName} got the slot, the production stayed on the bench.`
    : null,
  (_p, _c) => null,
]

/* ─────────────────────────────────────────────────────────────────
   FREE AGENT — waiver-wire heads-up. An unowned player cleared a
   HIGH-importance threshold. Tone is editorial / informational —
   "here's a story, here's the opportunity." Not breathless.
───────────────────────────────────────────────────────────────── */

const FREE_AGENT_HEADLINES: VariantFn<FreeAgentPayload>[] = [
  // No-hitter is the rarest possible story — leads with the act.
  (p, _c) => p.trigger === 'no-hitter'
    ? `No-hitter on waivers: ${p.playerName}. ${p.headlineStats}.`
    : null,
  // Multi-cat (2+ HR + 5+ RBI) — cross-category windfall.
  (p, _c) => p.trigger === 'multi-cat'
    ? `Free agent went off: ${p.playerName}, ${p.headlineStats}.`
    : null,
  // Multi-HR (3+ HR).
  (p, _c) => p.trigger === 'multi-hr'
    ? `Multi-HR on waivers: ${p.playerName}, ${p.headlineStats}.`
    : null,
  // Big K (10+ K start).
  (p, _c) => p.trigger === 'big-k'
    ? `Free agent K-fest: ${p.playerName}, ${p.headlineStats}.`
    : null,
  // Generic FA framings — pool-bottom defaults.
  (p, _c) => `On waivers: ${p.playerName} went ${p.headlineStats}.`,
  (p, _c) => `Free agent watch: ${p.playerName}, ${p.headlineStats}.`,
  (p, _c) => `Sitting on waivers: ${p.playerName}, ${p.headlineStats}.`,
]

const FREE_AGENT_BODIES: VariantFn<FreeAgentPayload>[] = [
  (p, _c) => p.trigger === 'no-hitter'
    ? `One of the rarest stat lines in baseball — and currently unowned.`
    : null,
  (p, _c) => p.trigger === 'multi-cat' || p.trigger === 'multi-hr'
    ? `Pickup-of-the-week material.`
    : null,
  (p, _c) => p.trigger === 'big-k'
    ? `Streamer-of-the-week material.`
    : null,
  (_p, _c) => `Available in your league.`,
  (_p, _c) => `Unowned across the league this week.`,
  (_p, _c) => null,
]

const LIVE_BODIES: VariantFn<LivePayload>[] = [
  (p, _c) => typeof p.homeWinProb === 'number' && p.homeWinProb >= 0.6 && p.homeWinProb < 0.75
    ? `Projection has it ${Math.round(p.homeWinProb * 100)}-${Math.round((1 - p.homeWinProb) * 100)}.`
    : null,
  (p, _c) => typeof p.homeWinProb === 'number' && p.homeWinProb >= 0.45 && p.homeWinProb < 0.55
    ? `Projection: dead heat.`
    : null,
  // "Still in play" implied tied/undecided, which clashed with a
  // visible 6-5 score. "Still scoring" is the accurate frame.
  (p, _c) => p.contestedCount >= 7
    ? `All ${p.contestedCount} still scoring.`
    : null,
  (p, _c) => p.contestedCount >= 4 && p.contestedCount < 7
    ? `${p.contestedCount} categories still scoring.`
    : null,
  (p, _c) => p.contestedCount <= 2
    ? `Down to ${p.contestedCount} contested.`
    : null,
  (p, _c) => p.contestedCount === 0
    ? `Nothing locked yet — final tallies pending.`
    : null,
  (_p, _c) => null,
]

/* ─────────────────────────────────────────────────────────────────
   WIDGETS
───────────────────────────────────────────────────────────────── */

function renderWidget(payload: BeatPayload): BeatWidget | undefined {
  switch (payload.category) {
    case 'FINAL':
      // Two team avatars instead of a score chip. The score already
      // lives in the headline; a duplicate chip on the right was
      // visual redundancy that pulled the eye sideways.
      return {
        kind: 'two-logos',
        teamIds: [payload.winnerTeamId, payload.loserTeamId],
      }
    case 'STREAK':
      return {
        kind: 'streak-chip',
        teamIds: [payload.teamId],
        text: `${payload.streakType}${payload.length}`,
        tone: payload.streakType === 'W' ? 'win' : 'loss',
      }
    case 'THRONE':
      return {
        kind: 'two-logos',
        teamIds: [payload.newLeaderTeamId, payload.displacedTeamId],
      }
    case 'CELLAR':
      return {
        kind: 'team-logo',
        teamIds: [payload.teamId],
      }
    case 'RACE':
      return {
        kind: 'two-logos',
        teamIds: [payload.teamAId, payload.teamBId],
      }
    case 'ISSUE':
      return undefined
    case 'BRIEFING':
      // No widget. BRIEFING is a meta-summary of the day's slate,
      // not a matchup. Two team logos here implied the briefing was
      // about those specific teams — wrong scope. The body line
      // names the marquee matchup with proper text instead.
      return undefined
    case 'LIVE':
      return {
        kind: 'two-logos',
        teamIds: [payload.homeTeamId, payload.awayTeamId],
      }
    case 'HUGE_GAME':
      return {
        kind: 'player-photo',
        teamIds: [payload.fantasyTeamId],
        playerName: payload.playerName,
        photoUrl: payload.photoUrl,
        statLine: payload.headlineStats,
      }
    case 'BENCH_BLUNDER':
      return {
        kind: 'player-photo',
        teamIds: [payload.fantasyTeamId],
        playerName: payload.playerName,
        photoUrl: payload.photoUrl,
        statLine: payload.benchedStats,
      }
    case 'FREE_AGENT':
      // No team attribution — the player has no owner. teamIds is
      // left empty so the view's featured + non-featured layouts
      // skip the owning-team avatar block (both branches gate on
      // teamIds.length > 0).
      return {
        kind: 'player-photo',
        teamIds: [],
        playerName: payload.playerName,
        photoUrl: payload.photoUrl,
        statLine: payload.headlineStats,
      }
  }
}

/* ─────────────────────────────────────────────────────────────────
   DAY GROUPING
───────────────────────────────────────────────────────────────── */

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function groupByDay(items: BeatItem[], now: Date): BeatDay[] {
  const buckets = new Map<string, BeatItem[]>()
  for (const item of items) {
    const key = dayKey(item.timestamp)
    const arr = buckets.get(key) ?? []
    arr.push(item)
    buckets.set(key, arr)
  }
  const days: BeatDay[] = []
  for (const [key, arr] of buckets) {
    const date = new Date(key)
    days.push({
      label: dayLabel(date, now),
      date,
      items: markFeaturedPerDay(arr),
    })
  }
  // Days descending — newest first.
  days.sort((a, b) => b.date.getTime() - a.date.getTime())
  return days
}

/**
 * Mark exactly one item per day as the "featured" lead. Picks the
 * highest-importance item; ties broken by recency (newest first).
 * Featured drives the magazine-style layout in the view — big avatar,
 * larger headline, body always rendered. Without this, the wire reads
 * as a flat list with no focal point.
 */
function markFeaturedPerDay(items: BeatItem[]): BeatItem[] {
  if (items.length === 0) return items
  // Editorial weight = importance band × 10 + category bonus.
  // Player events (a 3-HR game, a bench blunder) lead the day at
  // the same importance as a sweep FINAL because they're the
  // memorable single-name stories. A magazine cover doesn't lead
  // with "Team X beat Team Y 16-4"; it leads with "Player Z did
  // something rare." The +2 bonus puts HUGE_GAME / BENCH_BLUNDER
  // ahead of FINAL when both are 'high'. THRONE gets +1 — it's a
  // named story too but less personal.
  const importanceWeight = (i: BeatItem) => {
    const base = i.importance === 'high' ? 30 : i.importance === 'med' ? 20 : 10
    const bonus =
      i.category === 'HUGE_GAME' ? 2
      : i.category === 'BENCH_BLUNDER' ? 2
      : i.category === 'THRONE' ? 1
      : 0
    return base + bonus
  }
  let leader = items[0]
  let leaderWeight = importanceWeight(leader)
  for (const item of items.slice(1)) {
    const w = importanceWeight(item)
    if (w > leaderWeight) {
      leader = item
      leaderWeight = w
    } else if (w === leaderWeight && item.timestamp.getTime() > leader.timestamp.getTime()) {
      leader = item
    }
  }
  // Items in the bucket are already chronologically ordered; rebuild
  // the array marking the leader without changing position.
  return items.map((i) => i.id === leader.id ? { ...i, isFeatured: true } : i)
}

function dayKey(d: Date): string {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString()
}

function dayLabel(date: Date, now: Date): string {
  const todayKey = dayKey(now)
  const yesterdayKey = dayKey(new Date(now.getTime() - 24 * 60 * 60 * 1000))
  const dKey = dayKey(date)
  const weekday = WEEKDAYS[date.getDay()].toUpperCase()
  const month = MONTHS[date.getMonth()].toUpperCase()
  const day = date.getDate()
  if (dKey === todayKey)     return `TODAY · ${weekday}, ${month} ${day}`
  if (dKey === yesterdayKey) return `YESTERDAY · ${weekday}, ${month} ${day}`
  return `${weekday}, ${month} ${day}`
}

/* ─────────────────────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────────────────────── */

function makeTeamNameLookup(data: CategoryLeagueData): (id: string) => string {
  const map = new Map<string, string>()
  for (const t of data.teams) {
    const clean = stripEmojiForEditorial(t.name) || t.name
    map.set(t.id, clean)
  }
  return (id) => map.get(id) ?? id
}

/**
 * Deterministic variant picker. Hashes the seed key to pick from the
 * candidates that returned non-null — same seed key always returns the
 * same copy across re-renders. Throws (returns first candidate) if no
 * variant matches; rare, since pools end with an unconditional default.
 */
function pickStable<P extends BeatPayload>(
  seedKey: string,
  pool: VariantFn<P>[],
  payload: P,
  ctx: RenderCtx,
): string {
  const candidates: string[] = []
  for (const fn of pool) {
    const out = fn(payload, ctx)
    if (typeof out === 'string' && out.length > 0) candidates.push(out)
  }
  if (candidates.length === 0) return ''
  const h = hashString(seedKey)
  return candidates[h % candidates.length]
}

function pickStableOptional<P extends BeatPayload>(
  seedKey: string,
  pool: VariantFn<P>[],
  payload: P,
  ctx: RenderCtx,
): string | undefined {
  const out = pickStable(seedKey, pool, payload, ctx)
  return out.length > 0 ? out : undefined
}

function hashString(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h = (h ^ s.charCodeAt(i)) >>> 0
    h = Math.imul(h, 16777619) >>> 0
  }
  return h
}
