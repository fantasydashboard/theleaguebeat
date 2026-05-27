/**
 * Weekly cover composer — picks the single story that defines an
 * entire week of the league. Distinct from the hero (which picks
 * the lede of the current MOMENT and updates whenever the data
 * shifts).
 *
 * A magazine cover is COMMITTED. It says "this is what Issue 10
 * was about." The cover doesn't change three times a day — it gets
 * decided when the new issue drops and lives with that choice for
 * the full week.
 *
 * Logic:
 *   1. Apply the same tier system as pickHero (Tier 1 always beats
 *      Tier 2 regardless of raw score).
 *   2. Within a tier, weight × cadence-boost decides — but freshness
 *      is NOT applied. The biggest blockbuster trade of the week
 *      stays on the cover all week; it doesn't decay to make room
 *      for yesterday's monster night.
 *   3. Returns null when no story warrants a real cover. Caller
 *      should hide the cover slot rather than render a placeholder.
 */

import type {
  SelectedStory,
  StoryType,
} from '../detection/types'
import type { CategoryLeagueDataTeam } from '../types'

/* ─────────────────────────────────────────────────────────────────
   PUBLIC API
───────────────────────────────────────────────────────────────── */

export interface WeeklyCover {
  /** The story carrying the cover. */
  story: SelectedStory
  /** Pre-computed "issue number" for this cover — week of season. */
  issueWeek?: number
  /** Whether the cover qualifies as a real cover-story event
   *  (Tier 1 or 2). When false, the page can choose to suppress
   *  the cover slot entirely on quiet weeks. */
  isHeadlineWorthy: boolean
}

/**
 * Compose the weekly cover from a story list. Returns null when
 * no story warrants the slot (true quiet week).
 *
 * Pass the SAME `selectedStories` array the hero uses — the cover
 * just reweights it for the longer time window. No new detection
 * pipeline needed.
 */
export function composeWeeklyCover(
  stories: SelectedStory[] | undefined | null,
  opts?: { currentWeek?: number },
): WeeklyCover | null {
  if (!stories || !Array.isArray(stories) || stories.length === 0) return null

  const ranked = stories
    .slice(0, 12)  // wider net than the hero (which considers 6)
    .map((s) => ({
      story: s,
      tier: coverTier(s.type),
      // Re-weight: ignore the per-day freshness decay. A blockbuster
      // trade from Tuesday is the cover all week.
      coverScore: (s.weight ?? 0) * coverBoostFor(s.type),
    }))
    .sort((a, b) => {
      if (a.tier !== b.tier) return a.tier - b.tier
      return b.coverScore - a.coverScore
    })

  const top = ranked[0]
  if (!top) return null

  return {
    story: top.story,
    issueWeek: opts?.currentWeek,
    isHeadlineWorthy: top.tier <= 3,
  }
}

/* ─────────────────────────────────────────────────────────────────
   COVER TIER — what kind of story belongs on the cover
   Similar to heroTier but with cover-specific weighting (a player
   night is less of a "cover" than a blockbuster trade).
───────────────────────────────────────────────────────────────── */

function coverTier(type: StoryType): number {
  switch (type) {
    /* ── Tier 1: Stop-the-presses cover events ───────────────── */
    case 'mathematical-elimination':
    case 'locked-top-seed':
    case 'first-time-playoffs':
    case 'blockbuster-trade':
      return 1

    /* ── Tier 2: Major league-shifting events ────────────────── */
    case 'new-throne':
    case 'dynasty-falling':
    case 'dethroned-rivalry':
    case 'three-week-comeback':
    case 'three-week-collapse':
    case 'cat-king-change':
      return 2

    /* ── Tier 3: Strong cover candidates ─────────────────────── */
    case 'monster-night':
    case 'three-hr-game':
    case 'twelve-k-game':
    case 'no-hitter':
    case 'hat-trick':
    case 'matchup-of-week':
    case 'photo-finish':
    case 'comeback-win':
    case 'blowout':
    case 'cat-sweep':
    case 'cat-shutout':
    case 'streak-broken':
    case 'throne-streak':
    case 'lopsided-trade':
      return 3

    /* ── Tier 4: Acceptable when nothing bigger fires ────────── */
    case 'comeback-team':
    case 'hot-climber':
    case 'streak-built':
    case 'division-lead-change':
    case 'playoff-rematch':
    case 'spoiler-mode':
    case 'spoiler-watch':
      return 4

    /* ── Tier 5+: Never the cover ────────────────────────────── */
    default:
      return 6
  }
}

/** Per-type boost within a tier. Blockbuster trades and throne
 *  changes get an extra push since they're naturally cover-shaped
 *  even at the same tier as other Tier-1 events. */
function coverBoostFor(type: StoryType): number {
  switch (type) {
    case 'blockbuster-trade':
    case 'new-throne':
    case 'dynasty-falling':
      return 1.25
    case 'no-hitter':
    case 'three-hr-game':
      return 1.15
    default:
      return 1.0
  }
}

/* ─────────────────────────────────────────────────────────────────
   COVER HEADLINE — the big forwardable line the cover (and its
   archived thumbnail) render. Shared so the live cover and the shelf
   thumbnail always agree on the same words.
───────────────────────────────────────────────────────────────── */

/** Story types whose detector headline is a verbose factual line
 *  ("X got Player. Y got Player.") — fine for a Wire item, wrong for a
 *  cover line. For these the forwardable cover line wins; the deck
 *  carries the who/what specifics. */
const COVER_LINE_TYPES = new Set<string>(['blockbuster-trade', 'lopsided-trade'])

/**
 * The cover line for a story. Prefers the detector-set headline for
 * most types, but swaps in a punchy forwardable line for verbose
 * headline types (trades). Used by both WeeklyCover.vue and the
 * archive snapshot so the live cover and the shelf never diverge.
 */
export function composeCoverHeadline(story: SelectedStory): string {
  const ctx = (story.context ?? {}) as Record<string, unknown>
  if (!COVER_LINE_TYPES.has(story.type)) {
    const explicit = typeof ctx.headline === 'string' ? ctx.headline.trim() : ''
    if (explicit) return explicit
  }
  return coverFallbackHeadline(story.type, ctx)
}

/** The primary subject team for a cover — the front team in a duel
 *  (trade / matchup), else the story's main team. Drives the single
 *  hero image on the archive thumbnail. */
export function coverPrimaryTeamId(story: SelectedStory): string | undefined {
  const acquired = (story.context as { acquiredByTeam?: { teamId?: string }[] }).acquiredByTeam
  if (Array.isArray(acquired) && acquired[0]?.teamId) return acquired[0].teamId
  const ctxId = (story.context as { teamId?: unknown }).teamId
  if (typeof ctxId === 'string') return ctxId
  return story.teamIds?.[0]
}

/** Resolve the cover's hero image url from a team list. Returns
 *  undefined when the subject team has no logo, so the caller falls
 *  back to the type-led treatment. */
export function resolveCoverImageUrl(
  story: SelectedStory,
  teams: ReadonlyArray<{ id: string; avatarUrl?: string }> | undefined,
): string | undefined {
  const id = coverPrimaryTeamId(story)
  if (!id || !teams) return undefined
  return teams.find((t) => t.id === id)?.avatarUrl
}

/** Story types that get a two-logo "duel" cover (a trade or matchup
 *  between two teams). Everything else is single-subject. */
const COVER_DUEL_TYPES = new Set<string>([
  'blockbuster-trade', 'lopsided-trade',
  'matchup-of-week', 'photo-finish', 'comeback-win', 'blowout',
  'playoff-rematch', 'dethroned-rivalry',
])

export type CoverArt =
  | { mode: 'duel'; teamA: CategoryLeagueDataTeam; teamB: CategoryLeagueDataTeam }
  | { mode: 'single'; team: CategoryLeagueDataTeam }
  | { mode: 'type' }

/** Resolve the cover imagery for a story — the SAME logic the home
 *  cover uses, shared so the cover and the share card never diverge:
 *  a two-logo duel for trades / matchups, a single bleeding logo for
 *  single-subject stories, type-led fallback when no usable logo. */
export function resolveCoverArt(
  story: SelectedStory,
  teams: CategoryLeagueDataTeam[] | undefined,
): CoverArt {
  const find = (id: string | undefined): CategoryLeagueDataTeam | null =>
    (id && teams?.find((t) => t.id === id)) || null

  if (COVER_DUEL_TYPES.has(story.type)) {
    const acquired = (story.context as { acquiredByTeam?: { teamId?: string }[] }).acquiredByTeam
    const [aId, bId] =
      Array.isArray(acquired) && acquired.length >= 2
        ? [acquired[0]?.teamId, acquired[1]?.teamId]
        : [story.teamIds?.[0], story.teamIds?.[1]]
    const a = find(aId)
    const b = find(bId)
    if (a?.avatarUrl && b?.avatarUrl) return { mode: 'duel', teamA: a, teamB: b }
    const single = a?.avatarUrl ? a : b?.avatarUrl ? b : null
    if (single) return { mode: 'single', team: single }
    return { mode: 'type' }
  }

  const t = find(coverPrimaryTeamId(story))
  if (t?.avatarUrl) return { mode: 'single', team: t }
  return { mode: 'type' }
}

function coverFallbackHeadline(type: string, ctx: Record<string, unknown>): string {
  const teamName = typeof ctx.teamName === 'string' ? ctx.teamName : ''
  switch (type) {
    case 'blockbuster-trade':    return 'The trade that moves the standings.'
    case 'lopsided-trade':       return 'The trade that splits the league.'
    case 'new-throne':           return teamName ? `${teamName} takes the throne.` : 'A new leader.'
    case 'dynasty-falling':      return teamName ? `${teamName}, no longer.` : 'The reign ends.'
    case 'monster-night':
    case 'three-hr-game':
    case 'twelve-k-game':        return 'The night that bent the standings.'
    case 'comeback-team':        return teamName ? `${teamName} is back.` : 'The comeback is real.'
    case 'streak-broken':        return teamName ? `The ${teamName} streak ends.` : 'A streak ends.'
    case 'photo-finish':         return 'A photo finish.'
    default:                     return 'This week, in your league.'
  }
}
