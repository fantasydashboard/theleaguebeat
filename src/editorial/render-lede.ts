/**
 * THE LEDE pipeline — detector + renderer in one entry point.
 *
 * Mirrors render-matchups.ts: runs detection, picks the highest-
 * weight candidate, calls the matching template's render. Returns
 * the column copy (eyebrow + headline + body) plus the meta the
 * view layer needs to render the chrome around it.
 */

import type { CategoryLeagueData, StoryCandidate } from './types.ts'
import { detectLedeCandidates } from './detect-lede.ts'
import { renderLede, type LedeKind, type LedeContext, type RenderedLedeCopy } from './lede.ts'

export interface RenderedLede {
  /** The winning Kind for the day. */
  kind: LedeKind
  /** Magazine-voiced eyebrow ("THE STREAK", "MAIN EVENT", etc.). */
  eyebrow: string
  /** Headline — one sentence, position-y, named teams. */
  headline: string
  /** Body — 2-3 sentences, ~40-60 words. */
  body: string
  /** Detection signal (debugging / instrumentation). */
  signal: string
  /** Winning candidate weight (for telemetry / "why did we pick this"). */
  weight: number
  /** Subject team identity for the inline portrait next to the
   *  headline. Always populated when a candidate wins (every Kind
   *  has a subject). The renderer pulls it off the winning context
   *  so TheLede.vue doesn't need to know about LedeContext shape. */
  subject?: {
    name: string
    rank: number
    avatarUrl?: string
    avatarColor?: string
    ownerInitials?: string
  }
}

/** Public entry: build the day's Lede from the league's data. Returns
 *  null only when no Kind fired AND no fallback was wired — which
 *  should be a rare developer-error case once all Kinds are shipped. */
export function renderLedePage(data: CategoryLeagueData): RenderedLede | null {
  const candidates = detectLedeCandidates(data)
  if (candidates.length === 0) return null

  // Pick highest-weight. Ties stay with first encountered.
  const winner = candidates.reduce<StoryCandidate<LedeKind, LedeContext>>(
    (best, c) => (c.weight > best.weight ? c : best),
    candidates[0],
  )

  const copy: RenderedLedeCopy | null = renderLede(winner.kind, winner.context)
  if (!copy) {
    // Fact-gating produced no viable variant. Try the next-highest
    // candidate as a fallback. (Most Kinds are gated softly enough
    // that this shouldn't fire in practice.)
    const sortedFallbacks = [...candidates]
      .filter((c) => c !== winner)
      .sort((a, b) => b.weight - a.weight)
    for (const fb of sortedFallbacks) {
      const fbCopy = renderLede(fb.kind, fb.context)
      if (fbCopy) {
        return {
          kind: fb.kind,
          eyebrow: fbCopy.eyebrow,
          headline: fbCopy.headline,
          body: fbCopy.body,
          signal: `lede-fallback-from-${winner.kind}`,
          weight: fb.weight,
          subject: {
            name: fb.context.subject.name,
            rank: fb.context.subject.rank,
            avatarUrl: fb.context.subject.avatarUrl,
            avatarColor: fb.context.subject.avatarColor,
            ownerInitials: fb.context.subject.ownerInitials,
          },
        }
      }
    }
    return null
  }

  return {
    kind: winner.kind,
    eyebrow: copy.eyebrow,
    headline: copy.headline,
    body: copy.body,
    signal: `lede-pick:${winner.kind} w=${winner.weight}`,
    weight: winner.weight,
    subject: {
      name: winner.context.subject.name,
      rank: winner.context.subject.rank,
      avatarUrl: winner.context.subject.avatarUrl,
      avatarColor: winner.context.subject.avatarColor,
      ownerInitials: winner.context.subject.ownerInitials,
    },
  }
}
