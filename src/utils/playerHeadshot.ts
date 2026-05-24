/**
 * playerHeadshot — derives a public CDN URL for a player's
 * headshot given platform + sport + player ID. Used when stories
 * about individual performances (monster nights, 3-HR games, 12-K
 * starts) want to lead with a real human face.
 *
 * Why this matters: fantasy magazines that put player faces on
 * the page feel dramatically more like real publications than
 * those that only show team avatars. Faces magnetize attention.
 *
 * Each platform exposes a different CDN path. ESPN is the most
 * forgiving (no auth, predictable path); Sleeper has a thumb
 * variant; Yahoo's player CDN is less stable and not mapped here.
 *
 * Returns null when we can't construct a reliable URL. Callers
 * should fall back to a placeholder or hide the headshot block.
 */

export type HeadshotSport = 'mlb' | 'nfl' | 'nba' | 'nhl'
export type HeadshotPlatform = 'espn' | 'sleeper' | 'yahoo' | 'fantrax'

export interface HeadshotInput {
  platform: HeadshotPlatform
  sport: HeadshotSport
  /** Platform-specific player id. ESPN: numeric. Sleeper: string. */
  playerId: string | number | null | undefined
}

/**
 * Build a public CDN URL for a player headshot.
 *
 * MLB players use MLB's own canonical CDN keyed by the player's
 * universal MLB ID (the same ID the MLB Stats API returns). This
 * matters because ESPN's CDN expects ESPN's internal player IDs,
 * which DON'T match MLB Stats API IDs — using the ESPN URL with
 * an MLB ID 404s on every player.
 *
 * MLB serves headshots at:
 *   https://midfield.mlbstatic.com/v1/people/{mlbId}/spots/120
 * No auth required, CORS-friendly, stable.
 *
 * ESPN serves headshots for NFL / NBA / NHL at:
 *   https://a.espncdn.com/i/headshots/{sport}/players/full/{id}.png
 * but only when the id IS an ESPN player id. Since our adapters
 * are name-matching against external stat feeds (which return
 * sport-canonical ids, not ESPN ids), ESPN's CDN is unreliable
 * for non-baseball sports too. Sport-canonical CDNs should be
 * added per sport as those data pipelines come online.
 *
 * Sleeper serves a thumb at:
 *   https://sleepercdn.com/content/nfl/players/thumb/{id}.jpg
 * Sleeper is NFL-only so we constrain to that sport.
 *
 * Yahoo headshots require their internal img.yahoo.com tokens
 * and are not stable enough to bake into a URL. Returning null
 * for Yahoo until a server-side proxy is wired up.
 */
export function playerHeadshotUrl(input: HeadshotInput): string | null {
  const { platform, sport, playerId } = input
  if (playerId == null || playerId === '') return null
  const id = String(playerId)

  // MLB is a special case: the id passed in is always the canonical
  // MLB Stats API id (set by buildPlayerNights from the MLB feed),
  // regardless of which fantasy platform owns the league. MLB's own
  // CDN is the only one that resolves that id.
  if (sport === 'mlb') {
    return `https://midfield.mlbstatic.com/v1/people/${id}/spots/120`
  }

  if (platform === 'espn') {
    return `https://a.espncdn.com/i/headshots/${sport}/players/full/${id}.png`
  }

  if (platform === 'sleeper') {
    // Sleeper exposes thumbnails for NFL players only. Other sports
    // return 404 from the same path.
    if (sport !== 'nfl') return null
    return `https://sleepercdn.com/content/nfl/players/thumb/${id}.jpg`
  }

  // Yahoo + Fantrax — no reliable public CDN path. Future: a server
  // proxy can fetch + cache via the user's OAuth session.
  return null
}

/**
 * Build a default fallback URL — a generic silhouette — used as
 * the <img> `src` when we know we'll fail. ESPN's "0" silhouette
 * works as a universal placeholder for their sports.
 */
export function playerHeadshotFallback(sport: HeadshotSport): string {
  if (sport === 'mlb') {
    // MLB's generic silhouette (id 0 returns a transparent PNG).
    return `https://midfield.mlbstatic.com/v1/people/0/spots/120`
  }
  return `https://a.espncdn.com/i/headshots/${sport}/players/full/0.png`
}
