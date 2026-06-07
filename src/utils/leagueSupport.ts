/**
 * Which league types The League Beat covers today.
 *
 * The product is sharply focused on **H2H Categories Baseball** for
 * launch. Football H2H Points lands in September 2026; everything
 * else is on hold until there's paying demand. Trying to render the
 * matchups / hero / beats pipeline on unsupported types produces
 * broken editorial (no cats, no matchups, wrong cadence), so the
 * `<MyLeagueLayout>` gates with a "not yet" notice before any view
 * renders.
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

  // H2H Points leagues are coming after football. Yahoo flags these
  // as `point` or `headpoint`; Sleeper uses 'ppr' / 'standard'. Catch
  // any scoring_type that contains 'point' or known points keywords.
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
