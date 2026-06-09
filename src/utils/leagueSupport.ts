/**
 * Which league types The League Beat covers today.
 *
 * Supported (full or partial coverage):
 *   - H2H Categories Baseball — full pipeline (every page)
 *   - H2H Points     Baseball — partial pipeline (Phase 1: The Issue
 *                                 + Matchups page; other pages still
 *                                 surface UnsupportedFormatPanel from
 *                                 their own format check)
 *
 * Not supported yet:
 *   - Rotisserie baseball
 *   - Football (any format)
 *   - Other sports (basketball, hockey, soccer)
 *
 * The layout gate stays conservative — when in doubt, surface the
 * UnsupportedLeagueNotice rather than render half-broken pages. The
 * page-level Phase 0 format gate (UnsupportedFormatPanel) is a second
 * line of defense for pages that haven't been graduated yet.
 */

export type SupportStatus =
  | { ok: true }
  | { ok: false; kind: UnsupportedKind; sport: string; scoringType: string | null }

export type UnsupportedKind =
  | 'roto'                  // Rotisserie — no weekly matchups, different product
  | 'points'                // H2H Points — coming after football ships
  | 'football'              // Football — coming September 2026
  | 'other-sport'           // Basketball, hockey, etc. — TBD
  | 'unknown'               // Couldn't parse; defensive fallback

interface LeagueLike {
  sport?: string | null
  scoring_type?: string | null
}

/** Classify a league row by what TLB can render for it today. The
 *  decision is intentionally conservative — when in doubt, mark as
 *  unsupported and surface the notice rather than render half-broken
 *  pages. Returns a discriminated union so the notice can speak to
 *  the specific case ("Roto isn't covered yet" vs "Football lands
 *  in September"). */
export function classifyLeagueSupport(league: LeagueLike | null | undefined): SupportStatus {
  const sport = (league?.sport ?? '').toLowerCase()
  const scoringType = (league?.scoring_type ?? '').toLowerCase()

  // Football — a whole sport we haven't built yet. Even points football
  // (the dominant format) is September work.
  if (sport === 'football' || sport === 'nfl') {
    return { ok: false, kind: 'football', sport, scoringType: league?.scoring_type ?? null }
  }

  // Other sports (basketball, hockey, soccer, etc.) — not on the roadmap
  // anytime soon. Honest empty case.
  if (sport && sport !== 'baseball' && sport !== 'mlb') {
    return { ok: false, kind: 'other-sport', sport, scoringType: league?.scoring_type ?? null }
  }

  // Baseball — the focus sport. Now narrow by scoring type.
  // Roto leagues have no weekly matchups; the whole page architecture
  // (THE BEAT, AROUND THE LEAGUE, swing-cat watch) doesn't apply.
  if (scoringType === 'roto') {
    return { ok: false, kind: 'roto', sport, scoringType: league?.scoring_type ?? null }
  }

  // H2H Points baseball — Phase 1 graduates coverage on The Issue
  // (matchups section) and the Matchups page directly. Other pages
  // surface UnsupportedFormatPanel via their own format checks until
  // Phase 2+ wires them up. Yahoo flags points as `point` /
  // `headpoint` and ESPN as `h2h_points`; we keep the football-only
  // keys ('ppr', 'standard', 'half') on the unsupported path because
  // they're football scoring schemes, not baseball.
  if (
    scoringType === 'point' ||
    scoringType === 'headpoint' ||
    scoringType === 'h2h_points' ||
    scoringType === 'h2hpoints'
  ) {
    return { ok: true }
  }
  if (
    scoringType.includes('point') ||
    scoringType === 'ppr' ||
    scoringType === 'standard' ||
    scoringType === 'half'
  ) {
    return { ok: false, kind: 'points', sport, scoringType: league?.scoring_type ?? null }
  }

  // 'head' = H2H Categories per Yahoo (our supported case). Empty
  // scoring_type defaults to supported (older rows; benefit of the
  // doubt for grandfathered leagues).
  if (scoringType === '' || scoringType === 'head' || scoringType === 'cats' || scoringType === 'h2h') {
    return { ok: true }
  }

  // Anything else — unknown, surface the notice rather than break the
  // pipeline. This catches future Yahoo/ESPN values we haven't seen.
  return { ok: false, kind: 'unknown', sport, scoringType: league?.scoring_type ?? null }
}
