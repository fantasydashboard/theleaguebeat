/**
 * Real ADP — average draft position from actual drafts.
 *
 * WHY THIS EXISTS. The draft slides originally measured steals and
 * reaches against Sleeper's `search_rank`, because Sleeper publishes no
 * ADP and `search_rank` is the only ordering it has. It is a
 * prominence ordering: static, format-blind, and full of ties. Measured
 * against a real 140-pick draft it correlates at 0.54 and carries 37
 * duplicate values. Real ADP over the same draft correlates at 0.91
 * with 8 duplicates. That gap is the whole reason for this module.
 *
 * THE SOURCE. Fantasy Football Calculator aggregates ADP from mock and
 * real drafts run on its site — currently ~8,000 drafts a week in
 * season. It is a genuine consensus of what drafters do, not an
 * editorial ranking, and critically it is published PER SCORING FORMAT,
 * so a half-PPR league is measured against half-PPR drafters. It sends
 * no CORS headers, so it is reached through `/api/adp`.
 *
 * WHAT IT STILL IS NOT. ADP is where players go, not how they finish —
 * a consensus can be wrong about a player and this measures agreement
 * with the crowd, not correctness. It is also a snapshot: for a draft
 * held weeks ago, today's ADP has absorbed news that drafters did not
 * have. Absolute value grades need projections, which remains UFD's
 * model. What this fixes is the BASELINE, not the claim.
 */

/** One player's ADP as published. */
export interface AdpPlayer {
  name: string
  position: string
  /** NFL team abbreviation. Disambiguates same-named players and is the
   *  only way to identify a team defense. */
  team: string
  /** Average pick across the drafts in the sample. */
  adp: number
}

export interface AdpData {
  /** Human label for the format sampled, e.g. "Half-PPR". */
  format: string
  /** League size the sample was drafted at. ADP is only comparable
   *  across league sizes once scaled by this — see `buildAdpLookup`. */
  teams: number
  /** How many drafts the average is over. Shown to the reader, because
   *  a baseline drawn from 8,000 drafts earns more trust than one
   *  drawn from 40 — and the reader deserves to judge that. */
  totalDrafts: number
  players: AdpPlayer[]
}

/** The formats Fantasy Football Calculator publishes. */
export type AdpFormat = 'standard' | 'half-ppr' | 'ppr' | '2qb'

/**
 * Strip a name to something two sources can agree on.
 *
 * Accents, punctuation and generational suffixes are where name
 * matching actually fails: "Ja'Marr" vs "JaMarr", "D.J." vs "DJ",
 * "Marvin Harrison Jr." vs "Marvin Harrison". Verified against a real
 * draft, this normalizer plus position matching resolves every player
 * both sources carry.
 */
export function normalizeName(raw: string): string {
  return raw
    .normalize('NFKD')
    // Combining marks left behind by the decomposition above.
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[.'’]/g, '')
    .replace(/-/g, ' ')
    .replace(/\b(jr|sr|ii|iii|iv|v)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Which ADP table matches this league's scoring.
 *
 * Reading the league's own settings is the entire point — a half-PPR
 * league graded against PPR ADP misvalues every receiver on the board,
 * which is exactly the class of error `search_rank` made unavoidable.
 *
 * Superflex is checked FIRST and wins outright: a second startable
 * quarterback moves quarterbacks so far up the board that reception
 * scoring is a rounding error beside it.
 */
export function adpFormatFor(
  scoring: Record<string, unknown> | null | undefined,
  rosterPositions?: readonly string[] | null,
): AdpFormat {
  const slots = (rosterPositions ?? []).map((s) => String(s).toUpperCase())
  const superflex =
    slots.includes('SUPER_FLEX') || slots.filter((s) => s === 'QB').length >= 2
  if (superflex) return '2qb'

  const rec = scoring?.rec
  if (typeof rec !== 'number' || rec <= 0) return 'standard'
  if (rec >= 0.75) return 'ppr'
  return 'half-ppr'
}

/** What a resolved ADP lookup can tell the draft slides. */
export interface AdpLookup {
  /**
   * Where this league would have been expected to take the player,
   * as an overall pick number. Undefined for players the sample does
   * not cover — they are excluded from the read rather than assumed
   * to be undrafted, which would report every late flier as a reach.
   */
  expectedPickOf: (playerName: string, position: string, team: string) => number | undefined
  /** Human label for the basis, e.g. "half-PPR ADP over 8,007 drafts". */
  basis: string
  format: string
  totalDrafts: number
}

/**
 * Resolve ADP against a league of a given size.
 *
 * SCALING, AND WHY IT IS NOT OPTIONAL. ADP is published at a fixed
 * league size (12 teams). Draft position does not transfer between
 * league sizes as an absolute pick number — it transfers as a ROUND
 * position. The 24th player off the board is a round-two pick in a
 * 12-team league and a late-round-two pick in a 10-team one.
 *
 * Checked rather than assumed: regressing real pick number on ADP for
 * a 10-team league against 12-team ADP gives a slope of 0.838, against
 * a team ratio of 10/12 = 0.833. The scaling is what the data does.
 */
export function buildAdpLookup(data: AdpData, leagueTeams: number): AdpLookup {
  const byNamePos = new Map<string, number>()
  const byDefTeam = new Map<string, number>()

  for (const p of data.players) {
    const position = p.position.toUpperCase()
    if (position === 'DEF') {
      // Sources name defenses differently ("Seattle Defense" vs
      // "Seahawks"), but both agree on the NFL team abbreviation.
      byDefTeam.set(p.team.toUpperCase(), p.adp)
      continue
    }
    byNamePos.set(`${normalizeName(p.name)}|${position}`, p.adp)
  }

  // A malformed or missing team count would silently zero every
  // expectation, so fall back to the sample's own size — that makes
  // the scaling a no-op instead of a divide-by-zero.
  const adpTeams = data.teams > 0 ? data.teams : 12
  const scale = leagueTeams > 0 ? leagueTeams / adpTeams : 1

  return {
    expectedPickOf(playerName, position, team) {
      const pos = (position || '').toUpperCase()
      const raw =
        pos === 'DEF'
          ? byDefTeam.get((team || '').toUpperCase())
          : byNamePos.get(`${normalizeName(playerName)}|${pos}`)
      if (raw === undefined) return undefined
      // Never round to zero: pick 1 is the earliest pick that exists.
      return Math.max(1, raw * scale)
    },
    basis: `${data.format} ADP over ${data.totalDrafts.toLocaleString()} drafts`,
    format: data.format,
    totalDrafts: data.totalDrafts,
  }
}

/** Shape Fantasy Football Calculator returns, as far as we rely on it. */
interface RawAdpResponse {
  meta?: { type?: unknown; teams?: unknown; total_drafts?: unknown }
  players?: unknown
}

/**
 * Parse the upstream payload into `AdpData`.
 *
 * Returns null rather than a partial structure when the response does
 * not carry a usable player list. The draft deck treats a null ADP as
 * "no baseline available" and omits the value slides, which is the
 * correct outcome for an upstream that changed shape — far better than
 * publishing steals computed from a half-read payload.
 */
export function parseAdpResponse(raw: unknown): AdpData | null {
  if (!raw || typeof raw !== 'object') return null
  const body = raw as RawAdpResponse
  if (!Array.isArray(body.players) || body.players.length === 0) return null

  const players: AdpPlayer[] = []
  for (const entry of body.players) {
    if (!entry || typeof entry !== 'object') continue
    const p = entry as Record<string, unknown>
    const name = typeof p.name === 'string' ? p.name : ''
    const position = typeof p.position === 'string' ? p.position : ''
    const adp = typeof p.adp === 'number' ? p.adp : Number(p.adp)
    if (!name || !position || !Number.isFinite(adp) || adp <= 0) continue
    players.push({
      name,
      position,
      team: typeof p.team === 'string' ? p.team : '',
      adp,
    })
  }
  if (players.length === 0) return null

  const meta = body.meta ?? {}
  const teams = Number(meta.teams)
  const totalDrafts = Number(meta.total_drafts)
  return {
    format: typeof meta.type === 'string' ? meta.type : 'ADP',
    teams: Number.isFinite(teams) && teams > 0 ? teams : 12,
    totalDrafts: Number.isFinite(totalDrafts) && totalDrafts > 0 ? totalDrafts : 0,
    players,
  }
}
