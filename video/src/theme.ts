/** Brand tokens, copied verbatim from CoverCard.vue so the video and
 *  the share card are unmistakably the same publication. */
export const theme = {
  bg: 'oklch(0.055 0.012 90)',
  text: 'oklch(0.97 0.005 90)',
  textMuted: 'oklch(0.62 0.010 90)',
  accent: '#22c55e',
  down: '#f0663f',
  neutral: '#7c8496',
  display: "'Barlow Condensed', sans-serif",
  body: "'Barlow', system-ui, sans-serif",
} as const

/** Design canvas. Scene components lay out against these numbers so a
 *  change of output resolution never means re-tuning every scene. */
export const CANVAS = { width: 1080, height: 1920 } as const
