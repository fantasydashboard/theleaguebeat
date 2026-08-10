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
  display: "'Barlow Condensed', sans-serif",
  body: "'Barlow', system-ui, sans-serif",
} as const

/** Design canvas. Scene components lay out against these numbers so a
 *  change of output resolution never means re-tuning every scene. */
export const CANVAS = { width: 1080, height: 1920 } as const
