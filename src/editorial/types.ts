/**
 * Editorial pipeline — universal data contract.
 *
 * `LeagueData` is the shape every platform adapter (Sleeper / Yahoo
 * / ESPN) must produce. Detection + rendering only read this shape,
 * so swapping the source of truth never touches the editorial layer.
 *
 * `LeagueData` is a discriminated union on `format`:
 *   - 'h2h-category' — H2H category leagues (the original surface)
 *   - 'h2h-points'   — H2H points leagues (Phase 0+ scope)
 *
 * Category-only fields (categories, categoryRanks, h2hMatrix,
 * weeklyCatsWon, weeklyLeagueAverage) live only on the category
 * variant. Points-only fields (weeklyPointsTotals,
 * projectedRemainingByTeam, topContributorsByDay) live only on
 * the points variant. The discriminator lets TypeScript narrow at
 * every detection / render site so the wrong fields can't be
 * accidentally read.
 *
 * Naming note: every existing interface keeps the `CategoryLeagueData*`
 * prefix because those types describe category-specific shapes (the
 * "Category" in the name is literal, not legacy). Only the root
 * envelope was renamed. A back-compat alias `CategoryLeagueData`
 * remains for one PR cycle so external code keeps compiling.
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

/** One day in a matchup's win-probability history. Mon=0..Sun=6. The
 *  pipeline is honest about whether the point came from a real captured
 *  snapshot or is a forward projection — adapters must set
 *  `isProjection` true for days that haven't elapsed yet. */
export interface CategoryLeagueDataMatchupDailyPoint {
  /** Day of the scoring week, 0 = Monday ... 6 = Sunday. */
  day: number
  homeWinProb: number   // 0..1
  awayWinProb: number   // 0..1
  isProjection: boolean
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
  /** Projected probability home wins the matchup, 0..1. Honest
   *  heuristic: each contested cat is treated as a coin flip and the
   *  binomial is summed for "home final cat total > away final cat
   *  total" (see matchups-projection.ts). Undefined when contestedCount
   *  is unknown or the matchup hasn't started. */
  homeWinProb?: number
  awayWinProb?: number
  /** Projected end-of-week cat totals. Best-effort: current cats won
   *  plus half of contested. Undefined when no projection is computed. */
  homeProj?: number
  awayProj?: number
  /** Day-by-day win-probability history (Mon-Sun) for this matchup.
   *  Populated by adapters that capture daily snapshots; absent on
   *  adapters that don't store history (yet). When absent the UI must
   *  hide the trajectory chart rather than fabricate one. */
  dailyTrend?: CategoryLeagueDataMatchupDailyPoint[]
}

/** Player metadata — names, positions, mlbam id when available.
 *  Optional fields because not every platform/sport surfaces every
 *  field consistently. Adapters populate what they can. */
export interface CategoryLeaguePlayer {
  /** Stable cross-source identifier. Prefer MLBAM id when available;
   *  fall back to a platform-specific id. */
  id: string
  name: string                  // "Shohei Ohtani"
  position?: string             // "DH/SP" / "OF" / "RP"
  mlbTeam?: string              // "LAA" / "NYY" — three-letter code
  photoUrl?: string             // MLB Stats API or platform-supplied
}

/** One player's stat line on a single day, as accumulated for one
 *  fantasy team. Drives HUGE_GAME (the player's day) and
 *  BENCH_BLUNDER (the bench player's day vs the starter's). */
export interface CategoryLeaguePlayerPerformance {
  playerId: string
  fantasyTeamId: string
  /** Was the player in the starting lineup for the eligible scoring
   *  period on this day? Required for bench blunder detection. */
  started: boolean
  /** YYYY-MM-DD. The implicit scoring week is the league's current
   *  or just-finished week, depending on which the adapter pulled. */
  day: string
  /** Per-cat stat line keyed by the league's category ids
   *  (R, H, HR, RBI, SB, AVG, W, SV, K, ERA, WHIP, etc.). */
  stats: Record<string, number>
}

/** Per-season summary — for the History page season list. */
export interface CategoryLeagueDataSeasonHistory {
  year: number
  championTeamId: string
  championRecord: string
  runnerUpTeamId: string
  basementTeamId: string
  /** Denormalized display fields. Past-season team keys (Yahoo mints a
   *  new key per season) won't resolve against the current league's
   *  team list, so we carry the name + logo on the record itself. */
  championName?: string
  championLogo?: string
  runnerUpName?: string
  basementName?: string
}

/** One season in a manager's career — the per-year detail behind the
 *  legacy aggregate. Drives the "across the years" trend and the
 *  record book's single-season extremes (no extra fetches: built from
 *  the same connected-season standings as the legacy totals). */
export interface ManagerSeasonPoint {
  year: number
  completed: boolean
  rank: number
  catWins: number
  catLosses: number
  catTies: number
}

/** All-time, per-manager legacy aggregation across every connected
 *  season. The cross-season key is the *manager*, not the team: Yahoo
 *  (and ESPN/Sleeper) mint a fresh team id each year, so identity has to
 *  ride on the manager guid. Each entry is self-contained for display
 *  (name/logo/color) because departed managers won't resolve against the
 *  current `teams` list; `teamId` is set only when the manager is still
 *  active in the current season. */
export interface CategoryLeagueDataManagerLegacy {
  managerGuid: string
  /** Current-season team id when the manager is still active (lets the UI
   *  resolve them against `teams` for click-through); undefined otherwise. */
  teamId?: string
  name: string                // most-recent season's team name
  logoUrl?: string
  avatarColor: string         // OKLCH gradient stops, comma-separated
  ownerInitials: string
  isMyTeam: boolean
  seasonsPlayed: number
  titles: number
  runnerUps: number
  playoffApps: number
  totalCatWins: number
  totalCatLosses: number
  totalCatTies: number
  careerWinPct: number
  /** Defined legacy score; see editorial/legacy.ts. The page shows the
   *  formula so the number is legible, not a black box. */
  legacyScore: number
  /** Per-season detail, oldest first. For trend lines + record book. */
  seasons: ManagerSeasonPoint[]
  /** 1-based rank by legacyScore. */
  rank: number
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

export interface LeagueDataH2HCategory {
  /** Discriminator literal — narrowing every consumer that handles
   *  the union form (`LeagueData`). For category-shape consumers the
   *  back-compat alias `CategoryLeagueData` points at this interface
   *  directly, so existing code keeps compiling without narrowing. */
  format: 'h2h-category'

  // Meta
  leagueId: string
  leagueName: string
  currentWeek: number
  currentSeason: number
  playoffCutoff: number       // top N make playoffs
  /** When true, this data was reconstructed from per-week
   *  history rather than snapshotted live. Consumers (currently
   *  IssueView) use it to gracefully degrade fields that aren't
   *  recoverable from match history alone — per-cat ownership,
   *  for instance — and to surface a "Reconstructed from platform
   *  data" disclaimer so readers know what they're looking at. */
  synthesized?: boolean
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
  /** Per-week matchup results, keyed by stringified week number
   *  ("1", "2", ...). Populated by adapters that retain full
   *  weekly matchup history (Yahoo, ESPN). Drives The Issue's
   *  on-demand reconstruction of past archived weeks — without
   *  it, an unarchived past issue can't be synthesized. */
  matchupsByWeek?: Record<string, CategoryLeagueDataMatchup[]>
  matchupsCurrentWeek?: CategoryLeagueDataMatchup[]

  /** Previous week's matchups in their finalized state. Drives the
   *  Monday-morning "LAST WEEK" recap beat — what happened in the just-
   *  closed week (upsets, sweeps, thrillers) so the page leads with
   *  recap content instead of an empty Day 1 strip. Empty/undefined
   *  when current week is 1 or the adapter can't fetch prior. */
  matchupsPreviousWeek?: CategoryLeagueDataMatchup[]

  /** Per-season summary across prior years. Empty for brand-new leagues. */
  seasonHistory?: CategoryLeagueDataSeasonHistory[]

  /** Player metadata for the league's rostered players. Populated by
   *  adapters that surface per-player data; undefined for leagues
   *  where the adapter hasn't been extended yet. Drives player-level
   *  beats (HUGE_GAME, BENCH_BLUNDER). */
  players?: CategoryLeaguePlayer[]

  /** Per-day stat lines for rostered players over the just-finished
   *  week (and optionally the current week). Drives HUGE_GAME and
   *  BENCH_BLUNDER detection. Empty/undefined when the adapter
   *  hasn't been extended to fetch daily stat history. */
  playerPerformances?: CategoryLeaguePlayerPerformance[]

  /** Career-level stats keyed by teamId. */
  teamCareerStats?: Record<string, CategoryLeagueDataTeamCareerStats>

  /** All-time per-manager legacy, ranked by the defined legacy score.
   *  Populated by adapters that can aggregate the user's connected prior
   *  seasons (matched by manager guid); undefined otherwise. */
  managerLegacy?: CategoryLeagueDataManagerLegacy[]

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

  /** Yesterday's IL placements + returns for rostered players. Fed
   *  by the MLB Stats API transactions endpoint; detector in
   *  detection/players.ts emits il-placement / il-return Wire
   *  cards. Optional. */
  injuryReports?: import('./players/injuries').InjuryReport[]

  /** Multi-day slump reports for rostered players. Hitters cold
   *  over last 7 days, pitchers cold over last 14. Fed by the
   *  MLB Stats API rolling-window endpoint; detector emits
   *  slump-hitter / slump-pitcher-rolling Wire cards. Optional. */
  slumpReports?: import('./players/slumps').SlumpReport[]

  /** Normalized player names on the viewer's bench (or IL slot)
   *  today. Used as a proxy for "who you sat yesterday" to detect
   *  bench-bad-beat stories — when a benched player had a notable
   *  night, that's the editorial story.
   *
   *  Limitation: today's lineup ≠ yesterday's lineup if the user
   *  moved players. Acceptable heuristic; most users don't shuffle
   *  daily lineups across days. */
  myBenchedPlayers?: Set<string>

  /** Per-team per-day roster snapshots covering the current scoring
   *  week. Populated lazily after initial render by a background
   *  fetch (see services/dailyRosters.ts). When present, the bench-
   *  blunder detector can fire CROSS-TEAM blunders ("Goof Juice
   *  benched Bichette") instead of only viewer-side ones. Optional —
   *  detector falls back to viewer-only via myBenchedPlayers when
   *  absent. */
  dailyRosters?: import('../services/dailyRosters').DailyRoster[]

  /** ESPN scoringPeriodId for "today" — used by the daily-roster
   *  hydrator to map YYYY-MM-DD calendar dates onto ESPN's
   *  sequential period numbering. Set by the ESPN adapter from
   *  league.scoringPeriodId. Other platforms ignore it. */
  espnTodayScoringPeriodId?: number
}

/* ─────────────────────────────────────────────────────────────────
   H2H POINTS VARIANT

   Phase 0 stub carried only meta + teams (the unsupported panel).
   Phase 1 (Matchups points-mode) adds the matchup shape + projection
   fields so the Matchups page can render real editorial content.
───────────────────────────────────────────────────────────────── */

/** Status of a points matchup — same vocabulary as category so
 *  cross-format detection helpers stay symmetric. */
export type PointsMatchupStatus = 'live' | 'coasting' | 'final' | 'upcoming'

/** A single H2H points matchup. Carries current totals + platform
 *  projection so the Matchups page can label "coin flip" vs
 *  "sealed" based on margin vs projected remaining. */
export interface LeagueDataPointsMatchup {
  id: string
  homeTeamId: string
  awayTeamId: string
  status: PointsMatchupStatus

  /** Current accumulated points for each side. Live during the
   *  week; final once status === 'final'. */
  homePoints: number
  awayPoints: number

  /** Total projected points for the week — platform-supplied. For
   *  upcoming/early-week matchups this is "what the side is
   *  expected to score across the whole week"; for live matchups
   *  this is the platform's updated projection given games already
   *  played. Undefined when the platform doesn't expose a
   *  projection for this matchup. */
  homeProjected?: number
  awayProjected?: number

  /** Editorial-grade win probability (0..1). Computed from
   *  current margin vs projected remaining via the same binomial
   *  approach the category side uses. Undefined when projections
   *  aren't available. */
  homeWinProb?: number
  awayWinProb?: number
}

export interface LeagueDataH2HPoints {
  /** Discriminator literal — what makes a points league a points
   *  league. Every consumer can narrow against this. */
  format: 'h2h-points'

  // Meta (mirrors the category variant so the panel + masthead can
  // reuse the same fields).
  leagueId: string
  leagueName: string
  currentWeek: number
  currentSeason: number
  playoffCutoff?: number
  regularSeasonEndWeek?: number
  synthesized?: boolean

  // Teams (universal).
  teams: CategoryLeagueDataTeam[]
  divisions?: CategoryLeagueDataDivision[]

  /** Current week's matchups. Phase 1 — populated by Yahoo / ESPN
   *  adapters when the league is h2h-points. Optional so adapters
   *  that can't yet build them (or platforms that don't expose
   *  them) degrade gracefully to the unsupported panel pattern. */
  currentWeekMatchups?: LeagueDataPointsMatchup[]

  /** Previous week's matchups in finalized state. Drives Monday-
   *  morning recap framing on the Matchups page; absent on early-
   *  season visits. */
  previousWeekMatchups?: LeagueDataPointsMatchup[]

  /** League-wide average weekly points scored — drives "averaging
   *  N points over the field" framing. Optional. */
  weeklyPointsAverage?: number

  /** Season standings derived from weekly points matchups (a "win" is
   *  the higher weekly score). Populated in Phase 2 so the cover-story
   *  arc detectors can run on points leagues. Reuses the category
   *  standing shape; `ownsCount` / `bleedingCount` are always 0 because
   *  points leagues have no per-category data. Optional so adapters
   *  that can't build it degrade gracefully. */
  standings?: CategoryLeagueDataStanding[]

  /** Per-week rank snapshots from cumulative points records. Includes
   *  only completed weeks (the live current week is excluded, matching
   *  the category contract). Drives WILD_ARC / THRONE_CHANGE. */
  seasonRankHistory?: CategoryLeagueDataWeeklyRanks[]
}

/* ─────────────────────────────────────────────────────────────────
   UNION + BACK-COMPAT ALIAS + TYPE GUARDS

   `LeagueData` is the universal envelope every adapter returns and
   every page receives. The discriminated union lets TypeScript
   narrow to either variant once code checks `data.format`.

   `CategoryLeagueData` is kept as an alias pointing at the
   h2h-category variant so the existing detection / render /
   page code keeps compiling unchanged. New code should prefer
   `LeagueData` (when handling either format) or
   `LeagueDataH2HCategory` / `LeagueDataH2HPoints` (when committed
   to one).
───────────────────────────────────────────────────────────────── */

export type LeagueData = LeagueDataH2HCategory | LeagueDataH2HPoints

/** Back-compat alias for code written before the format split. New
 *  code should prefer the explicit variant or the union. Removable
 *  in a follow-up once every consumer has narrowed explicitly. */
export type CategoryLeagueData = LeagueDataH2HCategory

/** Narrowing helper for the h2h-category variant. Use at the page
 *  boundary so the rest of the page can read category-only fields. */
export function isH2HCategory(
  d: LeagueData | null | undefined,
): d is LeagueDataH2HCategory {
  return d?.format === 'h2h-category'
}

/** Narrowing helper for the h2h-points variant. */
export function isH2HPoints(
  d: LeagueData | null | undefined,
): d is LeagueDataH2HPoints {
  return d?.format === 'h2h-points'
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
