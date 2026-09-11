/**
 * Slides out as PNG files, rather than a deck somebody clicks through.
 *
 * The presenter never wanted a presentation. They wanted a folder of
 * vertical images to drop into a video edit — so the deck is rendered
 * once at full size and every slide is written out as a file.
 *
 * WHY IMAGES HAVE TO BE PROXIED. Rasterising a slide means reading
 * pixels back off a canvas, and a canvas holding ANY cross-origin
 * image without CORS headers is tainted: the read throws instead of
 * returning data. Sleeper's CDN sends no `Access-Control-Allow-Origin`
 * on avatars, uploads or player headshots, so every crest and face has
 * to arrive through our own origin or the export fails outright — not
 * a missing logo, no file at all.
 */
import { toBlob } from 'html-to-image'

/** Full width of a vertical frame, in CSS pixels. */
export const FRAME_W = 1080
export const FRAME_H = 1920

/**
 * Rewrite a remote image URL to come through our own origin.
 *
 * Anything already same-origin, a data URI, or a relative path is left
 * alone — proxying those would be a pointless round trip.
 */
export function proxied(url: string | undefined | null): string | undefined {
  if (!url) return undefined
  if (url.startsWith('data:') || url.startsWith('blob:')) return url
  if (url.startsWith('/')) return url
  try {
    const u = new URL(url, location.href)
    if (u.origin === location.origin) return url
    return `/api/proxy-image?url=${encodeURIComponent(u.href)}`
  } catch {
    return url
  }
}

/** Slugify a deck or slide label into something safe for a filename. */
function slug(s: string): string {
  return (s || '')
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'slide'
}

/** `03-power-rankings-mighty-mallards.png` — ordered, and readable in a
 *  Finder window without opening anything. */
export function slideFilename(index: number, total: number, label: string): string {
  const width = String(total).length
  return `${String(index + 1).padStart(width, '0')}-${slug(label)}.png`
}

/**
 * Wait for every image inside a frame to settle.
 *
 * A frame captured mid-load renders the alt text or nothing at all,
 * and `html-to-image` will not wait on its own. Errors resolve too —
 * one dead headshot should not stall the whole export.
 */
export async function waitForImages(root: HTMLElement): Promise<void> {
  const imgs = Array.from(root.querySelectorAll('img'))
  await Promise.all(
    imgs.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete) return resolve()
          img.addEventListener('load', () => resolve(), { once: true })
          img.addEventListener('error', () => resolve(), { once: true })
        }),
    ),
  )
  // Fonts too: capturing before Barlow lands renders the whole deck in
  // a fallback face, which is not obviously wrong until it is on screen.
  if (document.fonts?.ready) await document.fonts.ready
}

/**
 * Any element → a PNG blob at exactly the size asked for.
 *
 * Sized explicitly rather than from the element, because callers render
 * off-screen or CSS-scaled to fit a window, and a capture that inherits
 * that comes out at preview size.
 */
export async function elementToPng(
  el: HTMLElement,
  width: number,
  height: number,
  scale = 2,
): Promise<Blob> {
  await waitForImages(el)
  const blob = await toBlob(el, {
    width,
    height,
    pixelRatio: scale,
    cacheBust: true,
    // EVERY proxied image shares one path — `/api/proxy-image` — and is
    // told apart only by `?url=`. html-to-image's resource cache strips
    // the query unless this is set, so all ten crests collapsed onto a
    // single entry and rendered whichever one was fetched first. The
    // record-book card went out with three teams in a fourth team's
    // colours; a deck would have put one player's face on every slide.
    // `cacheBust` does not cover it — the cache is read before the
    // busting parameter is appended.
    includeQueryParams: true,
    style: { transform: 'none', margin: '0' },
  })
  if (!blob) throw new Error('The browser returned no image for this card.')
  return blob
}

/** One vertical frame → one PNG blob, at true 1080x1920. */
export function frameToPng(el: HTMLElement, scale = 2): Promise<Blob> {
  return elementToPng(el, FRAME_W, FRAME_H, scale)
}

/* ─────────────────────────────────────────────────────────────────
   Writing the files out
───────────────────────────────────────────────────────────────── */

export interface SaveTarget {
  /** Human label for the UI: a folder name, or "Downloads". */
  label: string
  write: (name: string, blob: Blob) => Promise<void>
}

type PickerWindow = Window & {
  showDirectoryPicker?: (o?: { mode?: string }) => Promise<FileSystemDirectoryHandle>
}

/**
 * Ask for somewhere to put the files.
 *
 * A real folder when the browser allows it — Chrome's directory picker
 * writes the images straight where the presenter wants them, which is
 * the whole point of the feature. Everything else falls back to
 * ordinary downloads, which land in one pile but still land.
 *
 * @returns null when the user dismisses the picker.
 */
export async function chooseTarget(): Promise<SaveTarget | null> {
  const w = window as PickerWindow
  if (typeof w.showDirectoryPicker === 'function') {
    let dir: FileSystemDirectoryHandle
    try {
      dir = await w.showDirectoryPicker({ mode: 'readwrite' })
    } catch {
      return null // dismissed — not an error worth reporting
    }
    return {
      label: dir.name,
      write: async (name, blob) => {
        const file = await dir.getFileHandle(name, { create: true })
        const stream = await file.createWritable()
        await stream.write(blob)
        await stream.close()
      },
    }
  }
  return {
    label: 'Downloads',
    write: async (name, blob) => {
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = name
      document.body.appendChild(a)
      a.click()
      a.remove()
      // Revoking immediately can cancel the download on some browsers.
      setTimeout(() => URL.revokeObjectURL(url), 10_000)
    },
  }
}
