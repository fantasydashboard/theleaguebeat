/**
 * Detection layer types — the shape every detector emits and every
 * consumer downstream (selection, composition, rendering) reads.
 *
 * Design rules:
 *   - Detectors are pure functions. Same input → same output.
 *   - Detectors never throw. They return empty arrays when data is
 *     missing or insufficient.
 *   - Every candidate carries the context payload its render path
 *     needs, so the renderer doesn't need to re-derive anything.
 *
 * See docs/EDITORIAL_ARCHITECTURE.md for the full spec.
 */

/* ─────────────────────────────────────────────────────────────────
   STORY CATEGORIES
   Buckets that detection modules group into. Used for dedup
   ("don't show 3 streak stories in a row").
───────────────────────────────────────────────────────────────── */

export type StoryCategory =
  | 'standings'
  | 'matchup'
  | 'streak'
  | 'category'
  | 'transaction'
  | 'player'
  | 'seasonStage'
  | 'cadence'
  | 'personalization'
  | 'anniversary'
  | 'commissioner'
  | 'absence'
  | 'division'

/* ─────────────────────────────────────────────────────────────────
   STORY TYPES
   The full taxonomy. Adding a new one means adding it here and
   implementing a detector in the matching category file.
───────────────────────────────────────────────────────────────── */

export type StoryType =
  /* A. Standings */
  | 'new-throne'
  | 'dynasty-falling'
  | 'hot-climber'
  | 'bubble-surprise'
  | 'comeback-team'
  | 'identity-shift'
  | 'quiet-day'
  | 'newcomer-breakout'
  | 'locked-top-seed'
  | 'mathematical-elimination'
  | 'first-time-playoffs'
  | 'first-above-500'
  | 'first-below-500'
  | 'division-lead-change'
  | 'wild-card-shift'
  | 'three-way-tie-bubble'
  | 'spoiler-mode'
  | 'dethroned-rivalry'

  /* B. Matchups */
  | 'cat-sweep'
  | 'cat-shutout'
  | 'photo-finish'
  | 'comeback-win'
  | 'blowout'
  | 'punt-success'
  | 'punt-failure'
  | 'matchup-of-week'
  | 'worst-matchup'
  | 'razor-close'
  | 'rematch'
  | 'playoff-rematch'
  | 'division-clash'
  | 'stakes-week'
  | 'spoiler-watch'
  | 'lineup-mistake'

  /* C. Streaks */
  | 'streak-broken'
  | 'streak-built'
  | 'consistency-award'
  | 'inconsistency-award'
  | 'basement-streak'
  | 'throne-streak'
  | 'three-week-comeback'
  | 'three-week-collapse'

  /* D. Categories */
  | 'cat-king-change'
  | 'cat-sweep-streak'
  | 'cat-collapse'
  | 'cat-parity'
  | 'cat-domination'
  | 'cat-blowout-race'
  | 'cat-punt-vindicated'
  | 'cat-balance-paradox'
  | 'cat-extreme-profile'

  /* E. Transactions (future) */
  | 'blockbuster-trade'
  | 'lopsided-trade'
  | 'trade-deadline-approaching'
  | 'waiver-winner'
  | 'waiver-desperation'
  | 'faab-blowout'
  | 'cut-alert'
  | 'il-placement'
  | 'il-return'
  | 'drop-and-pickup-redemption'

  /* F. Players (future) */
  | 'monster-night'
  | 'three-hr-game'
  | 'twelve-k-game'
  | 'no-hitter'
  | 'hat-trick'
  | 'comeback-by-one-player'
  | 'quietly-great-week'
  | 'ownership-spike'
  | 'hot-streak-alert'
  | 'slump-alert'
  | 'surprise-rookie'
  | 'real-mlb-trade-impact'

  /* G. Season stage */
  | 'opening-week'
  | 'post-draft-autopsy'
  | 'quarter-pole'
  | 'all-star-break'
  | 'trade-deadline-week'
  | 'halfway-point'
  | 'three-quarter-mark'
  | 'last-four-weeks'
  | 'last-two-weeks'
  | 'final-week'
  | 'playoff-opener'
  | 'semifinal-week'
  | 'championship-week'

  /* H. Cadence */
  | 'monday-recap'
  | 'midweek-trade-talk'
  | 'friday-preview'
  | 'sunday-final-push'
  | 'off-day-deep-dive'

  /* H2. Overnight delta (snapshot-driven) */
  | 'matchup-tipped'        // your matchup flipped sides overnight
  | 'matchup-pulse-up'      // your matchup score improved
  | 'matchup-pulse-down'    // your matchup score worsened
  | 'rank-shift-up'         // a team climbed ≥2 ranks overnight
  | 'rank-shift-down'       // a team fell ≥2 ranks overnight

  /* H3. Bad beats (you sat the right guy) */
  | 'bench-bad-beat'        // a player you benched had a notable night

  /* H4. Wire intel (actionable add, owned-disaster) */
  | 'streamer-of-day'       // unowned pitcher gem from yesterday — go grab them
  | 'pitcher-blowup'        // your pitcher got shelled yesterday — single-game pain
  | 'slump-hitter'          // owned hitter cold over the last 7 days
  | 'slump-pitcher-rolling' // owned pitcher cold over the last 14 days

  /* I. Personalization (future) */
  | 'your-team-first-feature'
  | 'your-rivals-hot-streak'
  | 'your-bubble-status'
  | 'your-team-eliminated'
  | 'your-team-clinched'
  | 'your-key-matchup'
  | 'welcome-back-after-absence'
  | 'your-best-week'
  | 'your-worst-week'

  /* J. Anniversary (future) */
  | 'one-year-since-championship'
  | 'one-year-since-loss'
  | 'league-anniversary'
  | 'repeating-pattern'
  | 'same-matchup-as-last-year'

  /* K. Commissioner (future) */
  | 'commissioner-change'
  | 'rule-change'
  | 'settings-updated'
  | 'new-member'
  | 'league-rename'

  /* L. Absences */
  | 'lineup-not-set'
  | 'empty-roster-spot'
  | 'pending-trade-expiring'
  | 'waiver-claims-due'

  /* M. Division */
  | 'division-race-tight'
  | 'division-locked-up'
  | 'division-rival-streak'
  | 'cross-division-power-shift'
  | 'divisional-wild-card-implication'

/* ─────────────────────────────────────────────────────────────────
   SEASON STAGES
   Time-of-season buckets. Most detectors gate on these.
───────────────────────────────────────────────────────────────── */

export type SeasonStage =
  | 'preseason'   // before week 1
  | 'opening'     // weeks 1-3
  | 'settling'    // weeks 4-7
  | 'midseason'   // weeks 8 → end-8
  | 'stretch'     // last 5 weeks of regular season
  | 'final'       // last 2 weeks of regular season
  | 'playoffs'    // postseason
  | 'offseason'   // after playoffs

/** Every stage but `preseason` and `offseason` — useful for detectors
 *  that fire across the entire active season. */
export const ALL_ACTIVE_STAGES: SeasonStage[] = [
  'opening',
  'settling',
  'midseason',
  'stretch',
  'final',
  'playoffs',
]

/* ─────────────────────────────────────────────────────────────────
   STORY SCOPE
   What the story is "about" — used by personalization scoring.
───────────────────────────────────────────────────────────────── */

export type StoryScope = 'league' | 'team' | 'player' | 'matchup'

/* ─────────────────────────────────────────────────────────────────
   STORY CANDIDATE
   The atomic unit emitted by detectors and consumed by selection.
───────────────────────────────────────────────────────────────── */

export interface StoryCandidate {
  /** Story type — drives both selection and which section component
   *  renders this story. */
  type: StoryType

  /** Category — used for dedup ("don't show 3 streak stories"). */
  category: StoryCategory

  /** Baseline importance, 0-100. Detectors assign by gut. See
   *  EDITORIAL_ARCHITECTURE.md for the rubric. */
  weight: number

  /** Recency multiplier, 0-1. 1.0 = the triggering event happened
   *  today; 0.3 = within a week; below that the detector shouldn't
   *  emit at all. */
  freshness: number

  /** What this story is about — affects personalization scoring. */
  scope: StoryScope

  /** Teams featured in this story. Used for dedup and personalization. */
  teamIds?: string[]

  /** Players featured (for player-level stories). */
  playerIds?: string[]

  /** Which season stages this story is valid in. The selector
   *  filters by this. */
  seasonStages: SeasonStage[]

  /** Optional week-range gate. If set, the story only fires
   *  inside this inclusive range. */
  validFromWeek?: number
  validToWeek?: number

  /** Payload the matching section component needs to render. Shape
   *  is per-story-type — section components destructure this. */
  context: Record<string, unknown>

  /** Stable fingerprint of (type, teamIds, week) used for impression
   *  tracking and dedup. Detectors must set this so the same event
   *  fires the same signature on repeat detections. */
  signature: string
}

/* ─────────────────────────────────────────────────────────────────
   ISSUE CONTEXT
   Per-issue runtime context passed to selection + composition.
───────────────────────────────────────────────────────────────── */

export interface IssueContext {
  /** Current week of the league (from `data.currentWeek`). */
  currentWeek: number

  /** Derived from currentWeek + regularSeasonEndWeek. */
  seasonStage: SeasonStage

  /** Server-side issue date — usually today, but exposed so the
   *  preview script can backdate for testing. */
  issueDate: Date

  /** The viewing user (if signed in). Used for personalization
   *  scoring. Optional — anonymous demo visitors don't have one. */
  viewer?: IssueViewer

  /** Impression log for this user × league. Empty when not signed
   *  in or when no prior impressions exist. */
  impressions?: ImpressionLog
}

export interface IssueViewer {
  /** Supabase user id. */
  userId: string
  /** This user's team id within the current league (if any). */
  myTeamId?: string
  /** This user's division id within the current league (if any). */
  myDivisionId?: string
}

/** Per-user-per-league record of what stories the user has already
 *  seen. Keyed by `StoryCandidate.signature`. Value is the most
 *  recent seen timestamp. */
export type ImpressionLog = Map<string, Date>

/* ─────────────────────────────────────────────────────────────────
   SELECTED STORY
   A StoryCandidate that survived selection + scoring.
───────────────────────────────────────────────────────────────── */

export interface SelectedStory extends StoryCandidate {
  /** Final composite score after weight × freshness × personalization
   *  × impression decay. Higher = more important to show. */
  score: number
}

/* ─────────────────────────────────────────────────────────────────
   DETECTOR FUNCTION SHAPE
   Every detector module exports a single `detect()` function with
   this signature. The orchestrator calls each in parallel.
───────────────────────────────────────────────────────────────── */

export type DetectFn = (
  data: import('../types').CategoryLeagueData,
  context: IssueContext,
) => StoryCandidate[]
