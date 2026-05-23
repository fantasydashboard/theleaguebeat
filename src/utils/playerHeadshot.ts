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
 * ESPN serves headshots at:
 *   https://a.espncdn.com/i/headshots/{sport}/players/full/{id}.png
 * with no auth required, CORS-friendly. The same shape works
 * across mlb / nfl / nba / nhl.
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
  return `https://a.espncdn.com/i/headshots/${sport}/players/full/0.png`
}
