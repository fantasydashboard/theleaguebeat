/** Brand tokens for the video, matching the share card so the video
 *  and the share card are unmistakably the same publication. `bg` and
 *  `text` are copied verbatim from CoverCard.vue's base oklch values
 *  (src/components/share/CoverCard.vue:161-162); `accent`, `down`, and
 *  `neutral` are the app's standing brand colors but aren't literal
 *  values in that file — they're specified here directly per the
 *  design brief. */
export const theme = {
  bg: 'oklch(0.055 0.012 90)',
  text: 'oklch(0.97 0.005 90)',
  textMuted: 'oklch(0.62 0.010 90)',
  accent: '#22c55e',
  down: '#f0663f',
  neutral: '#7c8496',
  /** Divider rules on the bookend scenes. One alpha for both — they're
   *  visually the same element (a thin rule against theme.bg) and had
   *  drifted to two different values before this token existed. */
  divider: 'rgba(255,255,255,0.3)',
  /** Row hairlines (The Board's row-separator rules). Deliberately its
   *  own token rather than reusing `divider` at 0.3 — that alpha is
   *  tuned for a single rule on an otherwise-empty bookend scene, and
   *  is too heavy repeated 10-20 times down a dense table. Kept at the
   *  original 0.10 the row rules were designed at. */
  hairline: 'rgba(255,255,255,0.10)',
  /** `accent` (#22c55e) unpacked to rgba so an alpha can be applied in
   *  a CSS gradient/background — a hex literal can't carry one. Used
   *  for The Board's highlighted-row wash. Keep the RGB triple in sync
   *  with `accent` above if that ever changes. */
  accentWash: 'rgba(34,197,94,0.14)',
  /** Unfilled track behind each category bar in the throne scene — a
   *  filled block, not a 1px rule like `hairline`, so it gets its own
   *  token at a distinct alpha rather than reusing that one. */
  trackWash: 'rgba(255,255,255,0.07)',
  /** `bg`'s oklch triple with alpha added, for the throne scene's
   *  lower-third scrim (a two-stop fading panel behind the winning
   *  team's name). Same unpacking technique as `accentWash`, just two
   *  alphas for a two-stop gradient instead of one. Keep the L C H
   *  values in sync with `bg` above if that ever changes. */
  scrimStrong: 'oklch(0.055 0.012 90 / 97%)',
  scrimSoft: 'oklch(0.055 0.012 90 / 75%)',
  display: "'Barlow Condensed', sans-serif",
  body: "'Barlow', system-ui, sans-serif",
} as const

/** Design canvas. Scene components lay out against these numbers so a
 *  change of output resolution never means re-tuning every scene. */
export const CANVAS = { width: 1080, height: 1920 } as const
