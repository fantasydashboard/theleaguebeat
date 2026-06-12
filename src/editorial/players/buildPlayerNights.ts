/**
 * buildPlayerNights — shared adapter helper that turns yesterday's
 * MLB box-score stats into the PlayerNight[] shape, filtered to
 * editorially-interesting performances and tagged with which
 * league teams roster each player.
 *
 * Used by all three baseball adapters (ESPN, Yahoo, Sleeper) so
 * the matching + filtering logic lives in one place. Each adapter
 * passes its rostered-player map (mlbId → leagueTeamId[]) and
 * gets back PlayerNight[].
 *
 * Editorial filter: we only return performances worth a Wire card.
 * A 1-for-4, 1 K start isn't a story. Cuts the noise from ~300
 * daily stat lines down to ~5-20 actual stories per night.
 */

import { getDayStats, yesterdayDate } from '@/services/mlbStats'
import type {
  HitterStats,
  PitcherStats,
  PlayerNight,
} from './types'

/**
 * Roster index — maps an MLB player ID to the league-team IDs that
 * roster the player. Built by adapters from their own roster data
 * (ESPN/Yahoo platform IDs are mapped to MLB IDs by player name).
 */
export type RosterIndex = Map<number, string[]>

/**
 * Optional name-based roster index for adapters that don't have
 * MLB IDs handy. Maps normalized "first last" → league-team IDs.
 * Less reliable than MLB ID matching but works as a fallback.
 */
export type NameRosterIndex = Map<string, string[]>

export interface BuildPlayerNightsOpts {
  /** Date to fetch (YYYY-MM-DD). Defaults to yesterday in US/Eastern. */
  date?: string
  /** mlbId → ownedByTeamIds. Use this when the adapter can resolve
   *  MLB IDs from its platform player IDs. */
  rosterByMlbId?: RosterIndex
  /** Lowercased "first last" → ownedByTeamIds. Fallback when the
   *  adapter only has player names (Yahoo + ESPN typically). */
  rosterByName?: NameRosterIndex
  /** When true, include performances by free agents too (for
   *  league-wide gossip). Default true — the user wants to know
   *  Ohtani went off even if nobody owns him. */
  includeUnowned?: boolean
}

/**
 * Fetch + filter + match. Returns PlayerNight[] ready to drop on
 * CategoryLeagueData.playerNights.
 *
 * Non-fatal: any failure returns an empty array and the rest of
 * the page renders unchanged.
 */
export async function buildPlayerNights(
  opts: BuildPlayerNightsOpts,
): Promise<PlayerNight[]> {
  try {
    const date = opts.date ?? yesterdayDate()
    const { hitters, pitchers } = await getDayStats(date)
    const includeUnowned = opts.includeUnowned !== false

    const out: PlayerNight[] = []

    for (const h of hitters) {
      const owned = ownersFor(h.mlbId, h.name, opts)
      if (!keepNight(owned.length > 0, includeUnowned, isNotableHitterLine(h))) continue
      out.push({
        mlbId: h.mlbId,
        name: h.name,
        position: h.position,
        mlbTeam: h.mlbTeam,
        gameDate: date,
        hitting: {
          atBats: h.atBats,
          hits: h.hits,
          runs: h.runs,
          rbi: h.rbi,
          homeRuns: h.homeRuns,
          doubles: h.doubles,
          triples: h.triples,
          walks: h.walks,
          strikeouts: h.strikeouts,
          stolenBases: h.stolenBases,
          hitByPitch: h.hitByPitch,
        },
        ownedByTeamIds: owned,
      })
    }

    for (const p of pitchers) {
      const owned = ownersFor(p.mlbId, p.name, opts)
      if (!keepNight(owned.length > 0, includeUnowned, isNotablePitcherLine(p))) continue
      const pitching: PitcherStats = {
        inningsPitched: p.inningsPitched,
        hits: p.hits,
        runs: p.runs,
        earnedRuns: p.earnedRuns,
        walks: p.walks,
        strikeouts: p.strikeouts,
        homeRunsAllowed: p.homeRunsAllowed,
        decision: p.decision,
        completeGame: p.completeGame,
        noHitter: p.noHitter,
        perfectGame: p.perfectGame,
        qualityStart: p.qualityStart,
      }
      out.push({
        mlbId: p.mlbId,
        name: p.name,
        position: p.position,
        mlbTeam: p.mlbTeam,
        gameDate: date,
        pitching,
        ownedByTeamIds: owned,
      })
    }

    return out
  } catch (err) {
    console.warn('[buildPlayerNights] failed:', err)
    return []
  }
}

/* ─────────────────────────────────────────────────────────────────
   FILTERS — what counts as "notable enough for the Wire"
───────────────────────────────────────────────────────────────── */

/**
 * Decide whether a night makes the cut. Owned players are ALWAYS kept —
 * their manager wants the quiet and the rough nights too (Your Players
 * surfaces a roster's standouts AND duds), not just the loud ones. Unowned
 * players must clear the league-wide notability bar, and only when
 * includeUnowned, or the set balloons to hundreds of lines a day.
 */
export function keepNight(owned: boolean, includeUnowned: boolean, notable: boolean): boolean {
  if (owned) return true
  return includeUnowned && notable
}

/**
 * Threshold: hitter performance worth surfacing. A 1-for-4 isn't a
 * story; a 4-for-5 with 2 HR is. We're filtering aggressively here
 * because the unfiltered set is hundreds of lines per day.
 */
function isNotableHitterLine(h: {
  hits: number
  homeRuns: number
  rbi: number
  runs: number
  stolenBases: number
  atBats: number
  doubles: number
  triples: number
}): boolean {
  if (h.homeRuns >= 2) return true              // multi-HR night
  if (h.hits >= 4) return true                  // 4+ hits
  if (h.rbi >= 5) return true                   // 5+ RBI
  if (h.runs >= 4) return true                  // 4+ R
  if (h.stolenBases >= 3) return true           // 3+ SB
  if (h.doubles + h.triples + h.homeRuns >= 3) return true  // 3+ XBH
  // The cycle = 1 of each + at least one extra hit, or just hit-for-cycle
  if (h.doubles >= 1 && h.triples >= 1 && h.homeRuns >= 1 && h.hits >= 4) return true
  return false
}

/**
 * Threshold: pitcher performance worth surfacing. Bullpen IPs of
 * 1.0 with 1 K aren't stories; complete games, K monsters, and
 * blow-ups are.
 */
function isNotablePitcherLine(p: {
  inningsPitched: number
  strikeouts: number
  earnedRuns: number
  decision?: string
  completeGame: boolean
  noHitter: boolean
  perfectGame: boolean
  gamesStarted: number
}): boolean {
  if (p.noHitter || p.perfectGame) return true
  if (p.completeGame) return true
  if (p.strikeouts >= 10) return true                       // double-digit K
  if (p.gamesStarted > 0 && p.inningsPitched >= 7 && p.earnedRuns === 0) return true  // 7+ shutout
  if (p.gamesStarted > 0 && p.earnedRuns >= 7) return true  // blow-up start (bad-beat angle)
  if (p.decision === 'S') return true                       // any save (closer-watch angle)
  if (p.decision === 'BS') return true                      // blown save (bad-beat angle)
  return false
}

/* ─────────────────────────────────────────────────────────────────
   ROSTER MATCHING
───────────────────────────────────────────────────────────────── */

function ownersFor(
  mlbId: number,
  name: string,
  opts: BuildPlayerNightsOpts,
): string[] {
  // Prefer MLB-ID match (reliable). Fall back to normalized name match.
  if (opts.rosterByMlbId) {
    const direct = opts.rosterByMlbId.get(mlbId)
    if (direct && direct.length > 0) return direct
  }
  if (opts.rosterByName) {
    const key = normalizeName(name)
    const byName = opts.rosterByName.get(key)
    if (byName && byName.length > 0) return byName
  }
  return []
}

/**
 * Normalize a name for fuzzy matching. Lowercase, strip accents,
 * drop common suffixes (Jr., Sr., II, III), collapse whitespace.
 *
 *   "José Ramírez" → "jose ramirez"
 *   "Ronald Acuña Jr." → "ronald acuna"
 *   "Vladimir Guerrero Jr." → "vladimir guerrero"
 */
export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')  // strip diacritics
    .replace(/[.,]/g, '')              // drop punctuation
    .replace(/\b(jr|sr|i{2,3}|iv)\b/g, '') // drop suffixes
    .replace(/\s+/g, ' ')
    .trim()
}
