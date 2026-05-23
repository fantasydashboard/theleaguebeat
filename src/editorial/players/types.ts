/**
 * Player-night model — cross-platform shape for "what a player did
 * yesterday in real life." Populated by adapters via the MLB Stats
 * API; consumed by detectors in src/editorial/detection/players.ts.
 *
 * Two stat shapes — one for hitters, one for pitchers — that share
 * the common envelope (player identity + ownership info). Detectors
 * pattern-match on which fields are present.
 *
 * Editorial purpose: powers the "yesterday's player nights" wire
 * cards — 3-HR games, 12-K starts, monster lines, etc. — plus the
 * "MY guys did X" personalization layer.
 */

/**
 * One player's stat line for a single game day. Either `hitting` or
 * `pitching` (or both, for two-way players like Ohtani) is populated.
 */
export interface PlayerNight {
  /** MLB player ID (from MLB Stats API). Stable across years. */
  mlbId: number
  /** Full name as MLB lists it (e.g. "Aaron Judge"). */
  name: string
  /** Position(s) — "OF", "SP", "DH", "OF/DH" for two-way. */
  position?: string
  /** MLB team abbreviation (e.g. "NYY"). */
  mlbTeam?: string

  /** Date the games happened (YYYY-MM-DD, in US/Eastern). */
  gameDate: string

  /** Game IDs the player appeared in (some players play
   *  doubleheaders or sub-into both ends). */
  gamePks?: number[]

  /** Hitter stat line — present if the player batted. */
  hitting?: HitterStats

  /** Pitcher stat line — present if the player pitched. */
  pitching?: PitcherStats

  /** Ownership context — which TEAMS in the user's league have
   *  this player on their roster. Populated by the adapter
   *  after pulling rosters. Empty array when nobody owns him
   *  (free agent → still surface for "monster night" gossip). */
  ownedByTeamIds: string[]
}

export interface HitterStats {
  atBats: number
  hits: number
  runs: number
  rbi: number
  homeRuns: number
  doubles: number
  triples: number
  walks: number
  strikeouts: number
  stolenBases: number
  hitByPitch: number
  /** Batting average for the day's games combined. */
  avg?: number
  /** OPS for the day's games combined — when available. */
  ops?: number
}

export interface PitcherStats {
  /** Innings pitched as decimal (e.g. 6.2 = 6 IP + 2 outs). */
  inningsPitched: number
  hits: number
  runs: number
  earnedRuns: number
  walks: number
  strikeouts: number
  homeRunsAllowed: number
  /** W/L/S/H/BS — capital letter. */
  decision?: 'W' | 'L' | 'S' | 'H' | 'BS' | 'ND'
  /** Earned run average for the day's start. Undefined for relievers. */
  era?: number
  /** True when the pitcher recorded all 27 outs. */
  completeGame?: boolean
  /** True when 9+ innings with no hits allowed. */
  noHitter?: boolean
  /** True when 9+ innings, no hits, no walks, no errors. */
  perfectGame?: boolean
  /** Pitched 6+ IP with 3 or fewer ER — common "quality start" def. */
  qualityStart?: boolean
}

/**
 * Helper — true if the player has ANY ownership in the league.
 * Used by detectors to skip pure FA performances (sometimes we
 * still want them — Ohtani off-week — but most editors want
 * roster-relevance).
 */
export function isOwned(night: PlayerNight): boolean {
  return night.ownedByTeamIds.length > 0
}
