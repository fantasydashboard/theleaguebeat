/**
 * useShareStory — turns a story payload into a sharable PNG using
 * `html-to-image`, then triggers the platform-appropriate share
 * surface (Web Share API on mobile, download + clipboard on desktop).
 *
 * Usage:
 *
 *   const { shareStory, isSharing, shareError } = useShareStory()
 *   shareStory(story, data)
 *
 * Implementation notes:
 *
 * - We mount a `ShareCard` instance to a fixed offscreen position on
 *   the page (out of viewport, opacity 0, pointer-events none), wait
 *   for fonts + images to settle, then capture to PNG.
 * - The card is intentionally 1080×1920 (9:16). html-to-image
 *   captures it at intrinsic size; consumers can downscale via
 *   `pixelRatio` if needed.
 * - When the Web Share API is available AND the user is on a touch
 *   surface, we prefer it — it pops the iOS / Android share sheet
 *   (iMessage, WhatsApp, Discord, etc.) with the image attached.
 * - Otherwise we offer a clipboard write + download fallback.
 * - All failures are captured into `shareError` so the calling UI
 *   can show a toast; we never throw.
 */

import { createApp, h, ref, type App } from 'vue'
import { toPng } from 'html-to-image'
import CoverCard from '@/components/share/CoverCard.vue'
import type { SelectedStory } from '@/editorial/detection/types'
import type { CategoryLeagueData } from '@/editorial/types'

/** PNG dimensions — 4:5 portrait, sized to preview large in a chat
 *  bubble (the product's core "drop it in the league chat" use).
 *  Matches CoverCard's intrinsic size. */
const CARD_WIDTH = 1080
const CARD_HEIGHT = 1350

/** How long to give fonts + images to settle before capturing. */
const SETTLE_DELAY_MS = 250

interface UseShareStoryReturn {
  /** Trigger the share flow for a story. No-op if already in flight. */
  shareStory: (story: SelectedStory, data?: CategoryLeagueData) => Promise<void>
  /** True while a capture is in flight. UI can show a spinner. */
  isSharing: ReturnType<typeof ref<boolean>>
  /** Last error, if any. Cleared at the start of every shareStory(). */
  shareError: ReturnType<typeof ref<string | null>>
}

export function useShareStory(): UseShareStoryReturn {
  const isSharing = ref(false)
  const shareError = ref<string | null>(null)

  async function shareStory(
    story: SelectedStory,
    data?: CategoryLeagueData,
  ): Promise<void> {
    if (isSharing.value) {
      console.log('[useShareStory] already sharing, skip')
      return
    }
    console.log('[useShareStory] start', story.type, 'data?', !!data)
    isSharing.value = true
    shareError.value = null

    let mountedApp: App | null = null
    let mountEl: HTMLDivElement | null = null

    try {
      const png = await renderCardToPng({
        story,
        data,
        onMount: ({ app, el }) => {
          mountedApp = app
          mountEl = el
        },
      })
      console.log('[useShareStory] PNG generated', png.size, 'bytes')

      const filename = buildFilename(story)
      await shareOrDownload(png, filename, story)
      console.log('[useShareStory] shareOrDownload returned')
    } catch (err) {
      console.error('[useShareStory] failed:', err)
      shareError.value = (err as Error).message || 'Could not generate share.'
    } finally {
      if (mountedApp) {
        try { mountedApp.unmount() } catch { /* noop */ }
      }
      if (mountEl && mountEl.parentNode) {
        try { mountEl.parentNode.removeChild(mountEl) } catch { /* noop */ }
      }
      isSharing.value = false
    }
  }

  return { shareStory, isSharing, shareError }
}

/* ─────────────────────────────────────────────────────────────────
   Offscreen render → PNG
───────────────────────────────────────────────────────────────── */

async function renderCardToPng(opts: {
  story: SelectedStory
  data?: CategoryLeagueData
  onMount: (refs: { app: App; el: HTMLDivElement }) => void
}): Promise<Blob> {
  // 1. Create the offscreen host element
  const host = document.createElement('div')
  host.style.position = 'fixed'
  host.style.top = '-10000px'
  host.style.left = '-10000px'
  host.style.width = `${CARD_WIDTH}px`
  host.style.height = `${CARD_HEIGHT}px`
  host.style.pointerEvents = 'none'
  host.style.zIndex = '-1'
  document.body.appendChild(host)

  // 2. One universal card — a vertical version of the site cover —
  //    renders every story type, so the share always matches the site.
  const app = createApp({
    render() {
      return h(CoverCard, { story: opts.story, data: opts.data })
    },
  })
  app.mount(host)
  opts.onMount({ app, el: host })

  // 3. Wait for fonts + images to settle. We do two things:
  //    (a) wait for document.fonts.ready so Barlow/Barlow Condensed
  //        are loaded before capture (otherwise html-to-image
  //        captures a fallback sans-serif).
  //    (b) wait for a couple of animation frames so layout + image
  //        decoding happens.
  await Promise.all([
    document.fonts?.ready ?? Promise.resolve(),
    waitForImages(host),
  ])
  await new Promise<void>((r) => requestAnimationFrame(() => r()))
  await new Promise<void>((r) => setTimeout(r, SETTLE_DELAY_MS))

  // 4. Find the card element to capture (.cvr root), falling back to
  //    the host itself.
  const cardEl = host.querySelector<HTMLElement>('.cvr') ?? host

  // 5. html-to-image to a PNG data URL, then decode to a Blob so we
  //    can hand it to navigator.share or a download link.
  console.log('[useShareStory] capturing card element', cardEl)
  const dataUrl = await toPng(cardEl, {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    pixelRatio: 1,
    cacheBust: true,
    // Inline external resources so the capture isn't broken by CORS.
    skipFonts: false,
  })
  console.log('[useShareStory] toPng returned, length:', dataUrl.length)

  const blob = await dataUrlToBlob(dataUrl)
  return blob
}

async function waitForImages(root: HTMLElement): Promise<void> {
  const imgs = Array.from(root.querySelectorAll('img'))
  if (imgs.length === 0) return
  await Promise.all(
    imgs.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete && img.naturalWidth > 0) {
            resolve()
            return
          }
          img.addEventListener('load', () => resolve(), { once: true })
          img.addEventListener('error', () => resolve(), { once: true })
        }),
    ),
  )
}

async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const res = await fetch(dataUrl)
  return res.blob()
}

/* ─────────────────────────────────────────────────────────────────
   Share or download
───────────────────────────────────────────────────────────────── */

async function shareOrDownload(
  blob: Blob,
  filename: string,
  story: SelectedStory,
): Promise<void> {
  const file = new File([blob], filename, { type: 'image/png' })

  // Prefer the native share sheet when available + we can attach
  // a file. Mobile Safari / Chrome on iOS, Android Chrome.
  // Touch-primary check — on desktop browsers that happen to expose
  // navigator.share + canShare (Chrome on macOS 14+), the native share
  // path opens an OS dialog that's confusing and easy to miss. We only
  // want native share on actual phones / tablets. Desktop falls through
  // to download + clipboard, which is what desktop users expect.
  const isTouchPrimary =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(hover: none) and (pointer: coarse)').matches

  const canShareFile =
    isTouchPrimary &&
    typeof navigator !== 'undefined' &&
    typeof navigator.share === 'function' &&
    typeof navigator.canShare === 'function' &&
    navigator.canShare({ files: [file] })
  console.log('[useShareStory] isTouchPrimary=', isTouchPrimary, 'canShareFile=', canShareFile)

  if (canShareFile) {
    try {
      await navigator.share({
        files: [file],
        title: 'The League Beat',
        text: buildShareText(story),
      })
      return
    } catch (err) {
      // User canceled — that's fine, swallow. Other errors fall
      // through to the download path.
      if ((err as Error).name === 'AbortError') return
      console.warn('[useShareStory] navigator.share failed:', err)
    }
  }

  // Desktop fallback: trigger a download AND try to write to the
  // clipboard so power-users can paste straight into chat.
  console.log('[useShareStory] desktop fallback → downloadBlob + clipboard')
  await downloadBlob(blob, filename)
  await tryClipboardWrite(blob)
  console.log('[useShareStory] desktop fallback complete')
}

function buildShareText(story: SelectedStory): string {
  const ctx = story.context as Record<string, unknown>
  const headline = typeof ctx.headline === 'string' ? ctx.headline : null
  return headline
    ? `${headline} — via The League Beat`
    : `Read your league's beat at theleaguebeat.com`
}

function buildFilename(story: SelectedStory): string {
  const safeType = story.type.replace(/[^a-z0-9-]/gi, '-')
  const stamp = new Date().toISOString().slice(0, 10)
  return `the-league-beat-${safeType}-${stamp}.png`
}

async function downloadBlob(blob: Blob, filename: string): Promise<void> {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  // Give the browser a beat before revoking so the download actually
  // initiates in some browsers (Safari is finicky).
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

async function tryClipboardWrite(blob: Blob): Promise<void> {
  if (typeof ClipboardItem === 'undefined' || !navigator.clipboard?.write) {
    return
  }
  try {
    await navigator.clipboard.write([
      new ClipboardItem({ 'image/png': blob }),
    ])
  } catch (err) {
    // Some browsers reject silently; we don't surface this — the
    // download still worked.
    console.warn('[useShareStory] clipboard write failed:', err)
  }
}
