/**
 * Selection — ranks story candidates and picks the top N for an issue.
 *
 * Composite score:
 *   score = weight × freshness × personalizationFit × impressionDecay
 *
 * After scoring, dedup rules trim the list before slicing top N:
 *   - max 2 stories per `category` make it past dedup (don't pile up
 *     three streak stories in a row)
 *   - max 1 story per `teamId` in the top 5 (one team can't hog the
 *     top of the page)
 *
 * See docs/EDITORIAL_ARCHITECTURE.md for the full scoring rubric.
 */

import type {
  ImpressionLog,
  IssueContext,
  IssueViewer,
  SelectedStory,
  StoryCandidate,
  StoryCategory,
} from './detection/types'

/** Max stories considered for any single issue. Hero + 4 supporting +
 *  a couple of always-show sections is plenty; everything else gets
 *  pushed to the ticker or omitted. */
export const MAX_STORIES_PER_ISSUE = 8

/** Dedup caps. */
const MAX_PER_CATEGORY = 2
const MAX_PER_TEAM_IN_TOP_N = 1
const TOP_N_FOR_TEAM_DEDUP = 5

/* ─────────────────────────────────────────────────────────────────
   PUBLIC ENTRY
───────────────────────────────────────────────────────────────── */

export function selectStoriesForIssue(
  candidates: StoryCandidate[],
  context: IssueContext,
): SelectedStory[] {
  const eligible = candidates
    .filter((c) => isStageMatch(c, context))
    .filter((c) => isInWeekRange(c, context))

  const scored: SelectedStory[] = eligible.map((c) => ({
    ...c,
    score:
      c.weight *
      clamp(c.freshness, 0, 1) *
      personalizationFit(c, context.viewer) *
      impressionDecay(c, context.impressions, context.issueDate),
  }))

  scored.sort((a, b) => b.score - a.score)

  const afterCategoryDedup = dedupeByCategory(scored, MAX_PER_CATEGORY)
  const afterTeamDedup = dedupeByTeam(
    afterCategoryDedup,
    MAX_PER_TEAM_IN_TOP_N,
    TOP_N_FOR_TEAM_DEDUP,
  )

  return afterTeamDedup.slice(0, MAX_STORIES_PER_ISSUE)
}

/* ─────────────────────────────────────────────────────────────────
   FILTERS — stage + week-range gates
───────────────────────────────────────────────────────────────── */

function isStageMatch(c: StoryCandidate, ctx: IssueContext): boolean {
  return c.seasonStages.includes(ctx.seasonStage)
}

function isInWeekRange(c: StoryCandidate, ctx: IssueContext): boolean {
  if (c.validFromWeek != null && ctx.currentWeek < c.validFromWeek) return false
  if (c.validToWeek != null && ctx.currentWeek > c.validToWeek) return false
  return true
}

/* ─────────────────────────────────────────────────────────────────
   SCORING MULTIPLIERS
───────────────────────────────────────────────────────────────── */

/**
 * Personalization fit — boost stories about the viewer's team /
 * division, slightly boost stories about their most recent opponent,
 * leave league-wide stories neutral.
 *
 * No viewer (anonymous demo session) → everything is neutral.
 */
function personalizationFit(
  c: StoryCandidate,
  viewer: IssueViewer | undefined,
): number {
  if (!viewer) return 1.0

  const teamIds = c.teamIds ?? []

  if (viewer.myTeamId && teamIds.includes(viewer.myTeamId)) {
    return 1.6
  }

  // Division-fit is a soft boost — most stories don't carry a
  // divisionId today (Tier 1 doesn't have division-aware detectors
  // emitting per-team), but if the story explicitly tags the
  // viewer's division, lift it.
  if (
    viewer.myDivisionId &&
    typeof c.context.divisionId === 'string' &&
    c.context.divisionId === viewer.myDivisionId
  ) {
    return 1.3
  }

  return 1.0
}

/**
 * Impression decay — penalize stories the user has already seen
 * recently so each visit surfaces something fresh.
 *
 * No impression log (first visit, anonymous) → no penalty.
 */
function impressionDecay(
  c: StoryCandidate,
  impressions: ImpressionLog | undefined,
  now: Date,
): number {
  if (!impressions) return 1.0
  const seen = impressions.get(c.signature)
  if (!seen) return 1.0

  const hoursSince = (now.getTime() - seen.getTime()) / (1000 * 60 * 60)
  if (hoursSince <= 4) return 0.5     // same session — heavy decay
  if (hoursSince <= 24) return 0.7    // today
  if (hoursSince <= 24 * 7) return 0.9 // this week
  return 1.0                          // older — back to full weight
}

/* ─────────────────────────────────────────────────────────────────
   DEDUP — category + team caps
───────────────────────────────────────────────────────────────── */

function dedupeByCategory<T extends SelectedStory>(
  stories: T[],
  maxPerCategory: number,
): T[] {
  const counts = new Map<StoryCategory, number>()
  const out: T[] = []
  for (const s of stories) {
    const count = counts.get(s.category) ?? 0
    if (count >= maxPerCategory) continue
    counts.set(s.category, count + 1)
    out.push(s)
  }
  return out
}

function dedupeByTeam<T extends SelectedStory>(
  stories: T[],
  maxPerTeamInTopN: number,
  topN: number,
): T[] {
  const seenInTop = new Map<string, number>()
  const out: T[] = []
  for (const s of stories) {
    if (out.length < topN) {
      const teamIds = s.teamIds ?? []
      const overCap = teamIds.some(
        (tid) => (seenInTop.get(tid) ?? 0) >= maxPerTeamInTopN,
      )
      if (overCap) continue
      for (const tid of teamIds) {
        seenInTop.set(tid, (seenInTop.get(tid) ?? 0) + 1)
      }
    }
    out.push(s)
  }
  return out
}

/* ─────────────────────────────────────────────────────────────────
   UTILS
───────────────────────────────────────────────────────────────── */

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n))
}
