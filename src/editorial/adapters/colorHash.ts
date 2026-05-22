/**
 * Deterministic color hashing for adapters that don't get a brand color
 * from their source platform (Sleeper, today).
 *
 * Strategy: hash the seed to two integers, map each into a different
 * OKLCH hue family (one in 0-180, one in 180-360), then build a
 * gradient stop string matching the fixture's `avatarColor` shape:
 *
 *   "oklch(L1 C1 H1), oklch(L2 C2 H2)"
 *
 * Same input always returns the same output. No allocations beyond
 * the final string. Pure.
 */

/** Tiny FNV-1a 32-bit hash. Stable and good enough for color jitter. */
function fnv1a(input: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  // Force unsigned.
  return h >>> 0
}

/**
 * Derive an OKLCH gradient (two stops, comma-separated) from a seed.
 * Lightness and chroma stay inside the demo palette's range so the
 * synthesized colors sit alongside the hand-picked ones without
 * looking out of place.
 */
export function teamColorHash(seed: string): string {
  const h1 = fnv1a(seed)
  const h2 = fnv1a(seed + ':b')

  // First stop: hue across the full wheel, slightly brighter + chroma.
  const hue1 = h1 % 360
  const light1 = 0.62 + ((h1 >>> 9) % 12) / 100      // 0.62..0.73
  const chroma1 = 0.16 + ((h1 >>> 17) % 6) / 100     // 0.16..0.21

  // Second stop: rotate ~30deg, slightly darker + less chroma, so the
  // gradient reads as the same identity but with depth.
  const hue2 = (hue1 + 30 + (h2 % 20)) % 360
  const light2 = 0.50 + ((h2 >>> 11) % 10) / 100     // 0.50..0.59
  const chroma2 = 0.14 + ((h2 >>> 19) % 5) / 100     // 0.14..0.18

  return (
    `oklch(${light1.toFixed(2)} ${chroma1.toFixed(2)} ${hue1}), ` +
    `oklch(${light2.toFixed(2)} ${chroma2.toFixed(2)} ${hue2})`
  )
}
