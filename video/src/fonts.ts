/**
 * Font loading. Remotion renders in headless Chrome, which has neither
 * Barlow nor Barlow Condensed installed, so without this every scene
 * silently falls back to a generic sans-serif — invisible in a quick
 * look, but wrong for a brand whose display identity IS Barlow
 * Condensed 900. Imported once from Root.tsx so no scene can forget
 * to load these before Remotion captures its first frame.
 *
 * Weights loaded are exactly the ones theme.ts and the scene
 * components use, not the whole family:
 *   - Barlow: 400 (default body weight, e.g. SignOff's "line" text),
 *     600 (THE LEAGUE BEAT wordmark, the corner bug) — the only two
 *     Barlow weights any component references today.
 *   - Barlow Condensed: 700/900 (display type — headlines, scores)
 */
import { cancelRender, continueRender, delayRender } from 'remotion'
import { loadFont as loadBarlow } from '@remotion/google-fonts/Barlow'
import { loadFont as loadBarlowCondensed } from '@remotion/google-fonts/BarlowCondensed'

const barlow = loadBarlow('normal', { weights: ['400', '600'] })
const barlowCondensed = loadBarlowCondensed('normal', { weights: ['700', '900'] })

const handle = delayRender('Loading Barlow + Barlow Condensed')

Promise.all([barlow.waitUntilDone(), barlowCondensed.waitUntilDone()])
  .then(() => continueRender(handle))
  .catch((err) => {
    // continueRender only takes a handle — it can't carry an error, so
    // a font-fetch failure here would otherwise surface 28s later as
    // Remotion's generic "delayRender was not cleared" timeout with no
    // indication it was a font problem. cancelRender fails the render
    // immediately with the real error instead.
    cancelRender(err)
  })
