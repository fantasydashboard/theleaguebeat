/**
 * Editorial pipeline — universal data contract.
 *
 * `CategoryLeagueData` is the shape every platform adapter
 * (Sleeper / Yahoo / ESPN) must produce. Detection + rendering only
 * read this shape, so swapping the source of truth never touches
 * the editorial layer.
 *
 * Scope: only the fields the current `categoriesLeague` fixture
 * already exposes. Speculative fields belong in a follow-up — the
 * pipeline ships when the fixture proves it end-to-end.
 */

/* ─────────────────────────────────────────────────────────────────
   PRIMITIVES
───────────────────────────────────────────────────────────────── */

export type WLT = 'W' | 'L' | 'T'

export type CatSide = 'hit' | 'pit'

/* ─────────────────────────────────────────────────────────────────
   CORE LEAGUE DATA
───────────────────────────────────────────────────────────────── */

export interface CategoryLeagueDataTeam {
  id: string
  name: string
  ownerName: string
  ownerInitials: string
  avatarUrl?: string
  avatarColor: string         // OKLCH gradient stops, comma-separated
  isMyTeam: boolean
  /** Division id, if the league is divisional. Maps to one of the
   *  entries in `CategoryLeagueData.divisions`. */
  divisionId?: string
  /** Optional descriptive label rendered next to the team name in
   *  the standings ("Pitching-pure", "Speed and patience", etc.). */
  profileDescriptor?: string
}

/** A division in a divisional league (typical for ESPN setups —
 *  N/S or E/W). Leagues without divisions just omit this. */
export interface CategoryLeagueDataDivision {
  id: string
  name: string
}

export interface CategoryLeagueDataCategory {
  id: string
  label: string
  name: string
  side: CatSide
}

export interface CategoryLeagueDataStanding {
  rank: number
  teamId: string
  catWins: number
  catLosses: number
  catTies: number
  winPct: number
  streak: { type: WLT; length: number }
  lastSix: WLT[]
  ownsCount: number           // top-3 in this many cats
  bleedingCount: number       // bottom-3 in this many cats
}

export interface CategoryLeagueDataCategoryRank {
  teamId: string
  catRanks: Record<string, number>
}

export interface CategoryLeagueDataWeeklyRanks {
  week: number
  ranks: Record<string, number>
}

/* ─────────────────────────────────────────────────────────────────
   EXTENDED DATA — fields beyond the Home page's minimum, consumed
   by the secondary pages (Matchups, Power Rankings, Draft, History).

   Every one is optional or "may be empty array" because not every
   platform exposes the underlying data. Detection / rendering on
   the consumer side must degrade gracefully when a field is missing.
───────────────────────────────────────────────────────────────── */

export type CategoryMatchupStatus = 'live' | 'coasting' | 'final' | 'upcoming'

export type CategoryCatLineStatus =
  | 'decided-home'
  | 'decided-away'
  | 'contested'
  | 'punted-home'
  | 'punted-away'

export interface CategoryLeagueDataCatLine {
  catId: string
  homeCurrent: number
  awayCurrent: number
  status: CategoryCatLineStatus
}

/** Current week's matchups — for the Matchups page. */
export interface CategoryLeagueDataMatchup {
  id: string
  homeTeamId: string
  awayTeamId: string
  status: CategoryMatchupStatus
  homeCatWins: number       // current cats won
  awayCatWins: number
  ties: number
  contestedCount: number    // cats still in play
  // Per-cat current state. `undefined` when stats not yet available.
  catLines?: CategoryLeagueDataCatLine[]
}

/** Per-season summary — for the History page season list. */
export interface CategoryLeagueDataSeasonHistory {
  year: number
  championTeamId: string
  championRecord: string
  runnerUpTeamId: string
  basementTeamId: string
}

/** Per-team aggregated career stats — for the History page. */
export interface CategoryLeagueDataTeamCareerStats {
  teamId: string
  seasonsPlayed: number
  titles: number
  playoffApps: number
  totalCatWins: number
  totalCatLosses: number
  totalCatTies: number
  careerWinPct: number
  hitCatsWon: number
  pitchCatsWon: number
  catDifferential: number
}

/** All-time head-to-head matrix entry, alphabetized to dedupe. */
export interface CategoryLeagueDataH2HEntry {
  teamA: string            // alphabetized teamId order
  teamB: string
  recordA: string          // "5-4-1" from A's perspective
  catDiffA: number
  meetings: number
}

/** Single draft pick — for the Draft page. */
export interface CategoryLeagueDataDraftPick {
  pickOverall: number
  round: number
  playerId: string
  playerName: string
  position: string
  mlbTeam: string
  draftedByTeamId: string
  valueScore?: number      // optional — only if we can compute it
}

/** Draft summary — for the Draft page. Optional because not every
 *  league has draft data exposed (orphan leagues, platforms with no
 *  draft API, etc.). */
export interface CategoryLeagueDataDraft {
  year: number
  totalPicks: number
  picks: CategoryLeagueDataDraftPick[]
}

export interface CategoryLeagueData {
  // Meta
  leagueId: string
  leagueName: string
  currentWeek: number
  currentSeason: number
  playoffCutoff: number       // top N make playoffs
  /**
   * Last week of the regular season (the bubble closes after this).
   * Adapters populate from the platform's schedule (Yahoo
   * `end_week`, ESPN settings, Sleeper `playoff_week_start - 1`).
   * Optional because legacy fixtures and older adapter versions may
   * not set it. Consumers should fall back to a sport-aware default
   * (e.g. 12 for the demo category baseball league) when missing.
   */
  regularSeasonEndWeek?: number

  /**
   * League division metadata. Many ESPN leagues are split into 2+
   * divisions (e.g. North/South); each team carries a divisionId
   * referencing one of these entries. Optional because Sleeper +
   * Yahoo leagues are typically division-less, and the demo fixture
   * is too.
   */
  divisions?: CategoryLeagueDataDivision[]

  // Teams
  teams: CategoryLeagueDataTeam[]

  // Categories
  categories: CategoryLeagueDataCategory[]

  // Standings — current week
  standings: CategoryLeagueDataStanding[]

  // Category ranks — per team × per cat
  categoryRanks: CategoryLeagueDataCategoryRank[]

  // Season rank history — for trajectory detection
  seasonRankHistory: CategoryLeagueDataWeeklyRanks[]

  /* ───── Extended fields (Wave 2 detection consumers) ───────── */

  /** Current week's matchups — populated when adapter can group them. */
  matchupsCurrentWeek?: CategoryLeagueDataMatchup[]

  /** Per-season summary across prior years. Empty for brand-new leagues. */
  seasonHistory?: CategoryLeagueDataSeasonHistory[]

  /** Career-level stats keyed by teamId. */
  teamCareerStats?: Record<string, CategoryLeagueDataTeamCareerStats>

  /** All-time H2H matrix; one entry per alphabetized team pair. */
  h2hMatrix?: CategoryLeagueDataH2HEntry[]

  /** Draft data — undefined for leagues with no draft exposed. */
  draft?: CategoryLeagueDataDraft

  /** Per-team weekly cats-won counts. `teamId → week-1-indexed array`. */
  weeklyCatsWon?: Record<string, number[]>

  /** Mathematical league average per week (constant 5.5 for an 11-cat
   *  10-team league with no ties — zero-sum across team-pairs). */
  weeklyLeagueAverage?: number[]

  /** Normalized league transactions — trades, adds, drops, FAAB +
   *  waiver claims. Adapters populate from each platform's native
   *  transactions endpoint; detectors in detection/transactions.ts
   *  consume to emit blockbuster-trade, faab-blowout, etc.
   *
   *  Sorted newest-first by `timestamp` so detectors can short-
   *  circuit on freshness. Optional — when undefined, transaction
   *  detectors are skipped (no error, just no Wire stories from
   *  trades). */
  transactions?: import('./transactions/types').LeagueTransaction[]

  /** Yesterday's MLB player stat lines, filtered to rostered players
   *  (or notable league-wide performances). Adapters populate via
   *  the MLB Stats API; detectors in detection/players.ts consume
   *  to emit 3-HR-game, 12-K-game, monster-night, etc.
   *
   *  Each entry carries `ownedByTeamIds` so detectors can flag
   *  "MY guys" stories vs generic league-wide gossip. Optional —
   *  player detectors no-op when missing. */
  playerNights?: import('./players/types').PlayerNight[]

  /** Snapshot delta vs the previous saved snapshot for this league
   *  (typically yesterday's first-visit snapshot). Drives The Wire's
   *  "since your last visit" stories: cat-tipped, matchup-pulse,
   *  rank-shift-overnight. Adapters compute via the snapshots
   *  helper; detectors in detection/overnight.ts consume.
   *
   *  Optional — null when no prior snapshot exists (first visit
   *  ever to this league) or when supabase isn't reachable. */
  snapshotDelta?: import('./snapshots/types').SnapshotDelta | null
}

/* ─────────────────────────────────────────────────────────────────
   STORY DETECTION TYPES
───────────────────────────────────────────────────────────────── */

/**
 * A single detected story possibility. `kind` is constrained to the
 * template-key union of whichever library the slot will render with
 * (typically `HomeKind` from `home.ts`). `weight` lets the selection
 * stage rank competing candidates; `context` is the unrendered slot
 * data that `render.ts` will shape into a `HomeContext` (or whatever
 * the target library expects) before calling its `renderX(kind, ctx)`.
 *
 * Weight scale (informal):
 *   100  — load-bearing front-page lead
 *    80  — strong feature
 *    60  — solid secondary
 *    40  — ticker-grade beat
 *    20  — quiet-day fallback
 */
export interface StoryCandidate<TKind extends string = string, TContext = unknown> {
  kind: TKind
  weight: number
  context: TContext
}

/**
 * Output of detection for one page render. Each slot holds either
 * the winning candidate (after selection) or null when no candidate
 * cleared the threshold for that slot.
 */
export interface StoryBundle<TKind extends string = string, TContext = unknown> {
  hero: StoryCandidate<TKind, TContext> | null
  playoffPush: StoryCandidate<TKind, TContext> | null
  ticker: Array<StoryCandidate<TKind, TContext>>
  quickReads: Array<StoryCandidate<TKind, TContext>>
}
