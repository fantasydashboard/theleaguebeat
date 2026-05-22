import type { Team } from '@/fixtures/pillarsLeague'

/**
 * Returns each individual OKLCH color stop from a team's avatarColor gradient string.
 * Example input: "oklch(0.78 0.18 92), oklch(0.68 0.16 75)"
 * Output: ["oklch(0.78 0.18 92)", "oklch(0.68 0.16 75)"]
 */
export function accentStops(team: Team): string[] {
  return team.avatarColor.split(/\)\s*,\s*/).map((s) => (s.endsWith(')') ? s : `${s})`))
}

/**
 * Returns the first OKLCH stop — the canonical accent color for a team.
 */
export function accentFor(team: Team): string {
  return accentStops(team)[0]
}
