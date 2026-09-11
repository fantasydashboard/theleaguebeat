/**
 * One section → one image somebody pastes into their league chat.
 *
 * This is a different job from present mode, which exports a FOLDER of
 * vertical frames for a video edit. Here the whole point is a single
 * file that survives being dropped into iMessage, WhatsApp, Discord or
 * a group text and still reads at preview size, without the sender
 * having to explain what they are looking at.
 *
 * SO THE CARD IS SELF-CONTAINED. League name, what this is, the whole
 * list, and the URL. A reader who has never heard of The League Beat
 * sees eleven other managers' teams ranked and a place to go — which
 * is the entire distribution loop. An image that needs the page it
 * came from is a screenshot, and people can already take those.
 *
 * 4:5 because that is what chat apps preview large. A 9:16 frame gets
 * letterboxed into something nobody taps.
 */
import type { IssueSection, IssueRow } from '@/editorial/issue/types'

/** Chat-friendly portrait, in CSS pixels. */
export const CARD_W = 1080
export const CARD_H = 1350

/** Below this a "list" is a statement with a bullet, and the card is
 *  mostly empty space. */
const MIN_ROWS = 2

/**
 * Twelve, because that is the largest league either tier runs and it is
 * also the most that fit above MIN_ROW once the header and footer have
 * taken their share. Past this the card truncates and says how many it
 * left off, rather than shrinking until the bottom half is unreadable.
 */
export const MAX_ROWS = 12

/** A row of the shareable card, flattened from either shape a section
 *  can carry. The card renders one thing; the section can be two. */
export interface ShareRow {
  lead?: string
  label: string
  sub?: string
  value?: string
  logoUrl?: string
  logoColor?: string
  logoInitials?: string
}

/**
 * Sections worth an image are the ones carrying a LIST.
 *
 * A pure statement — "Scuttlebucs won the draft and don't have the
 * best team" — is a headline. Rendering it 1080 wide with a footer
 * makes a poster of a sentence, and nobody forwards that. The bar is
 * structural rather than editorial so a new section earns a button
 * without anyone remembering to add it to a list.
 */
export function isShareable(sec: IssueSection): boolean {
  return rowCount(sec) >= MIN_ROWS
}

function rowCount(sec: IssueSection): number {
  return sec.cards?.length ?? sec.rows?.length ?? 0
}

/**
 * Flatten a section into rows the card can render.
 *
 * Cards carry a rank and a stat; rows carry a lead and a value. Both
 * become the same four slots, so the card has one layout rather than
 * two that drift apart.
 */
export function shareRows(sec: IssueSection): ShareRow[] {
  if (sec.cards?.length) {
    return sec.cards.slice(0, MAX_ROWS).map((c) => ({
      lead: String(c.rank),
      label: c.teamName,
      // The note is the reason this team is where it is. Without it a
      // ranking is a list of numbers the league already has.
      sub: c.notes?.[0],
      value: c.statValue,
      logoUrl: c.logoUrl,
      logoColor: c.logoColor,
      logoInitials: c.logoInitials,
    }))
  }
  return (sec.rows ?? []).slice(0, MAX_ROWS).map((r: IssueRow) => ({
    lead: r.lead,
    label: r.label,
    sub: r.sub,
    value: r.value,
    logoUrl: r.logoUrl,
    logoColor: r.logoColor,
    logoInitials: r.logoInitials,
  }))
}

/** How many the card had to leave off, so it can say so. */
export function omittedCount(sec: IssueSection): number {
  return Math.max(0, rowCount(sec) - MAX_ROWS)
}

/** Vertical padding the card reserves, top plus bottom. */
export const PAD_Y = 118

/** Never smaller than this: below it a crest is a smudge and the name
 *  is unreadable at chat preview size, which defeats the whole card. */
const MIN_ROW = 62
/** Never larger than this: three rows should not become three posters.
 *  Raised from 118 once the sub-line was allowed to wrap — a four-row
 *  card was leaving ~430px empty while clipping the very sentence that
 *  explains the number. */
const MAX_ROW = 168

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

/**
 * Fit N rows into the height the header and footer actually left.
 *
 * Returns CSS custom properties rather than classes because the answer
 * is continuous: the headline is editorial copy and wraps to one line
 * or three depending on the week, so the leftover height is not one of
 * three known cases. Fixed density buckets were the first attempt and
 * they overflowed the footer at ten rows.
 *
 * The sub-line is DROPPED rather than shrunk once rows get tight. A
 * name at a readable size with no note beats a name and a note that
 * are both too small to read on a phone.
 */
export function rowScale(available: number, count: number): Record<string, string> {
  const raw = count > 0 ? available / count : MAX_ROW
  const h = clamp(Math.floor(raw), MIN_ROW, MAX_ROW)
  // 78 rather than 84 so a twelve-team board keeps its notes: the FFL
  // runs twelve and the League of Record ten, and the two cards looking
  // different is a worse outcome than a slightly smaller note.
  const showSub = h >= 78
  // Two lines once a row is tall enough to hold them. The record book's
  // detail — the distance AND the all-time rank — does not fit on one,
  // and truncating it removes the part that stops a round number
  // reading as a league best.
  const subLines = h >= 120 ? 2 : 1
  return {
    '--row-h': `${h}px`,
    '--gap': `${Math.round(clamp(h * 0.26, 16, 28))}px`,
    '--lead-w': `${Math.round(clamp(h * 0.62, 42, 66))}px`,
    '--lead': `${Math.round(clamp(h * 0.52, 30, 54))}px`,
    '--mark': `${Math.round(clamp(h - 26, 40, 86))}px`,
    '--name': `${Math.round(clamp(h * (showSub ? 0.36 : 0.44), 24, 44))}px`,
    '--sub': `${Math.round(clamp(h * 0.23, 18, 27))}px`,
    '--value': `${Math.round(clamp(h * (showSub ? 0.35 : 0.42), 24, 42))}px`,
    '--sub-display': showSub ? '-webkit-box' : 'none',
    '--sub-lines': String(subLines),
    '--sub-wrap': subLines > 1 ? 'normal' : 'nowrap',
  }
}

/**
 * What to call a section ON THE CARD.
 *
 * The issue names its sections for a reader scrolling a page, where
 * "The field" sits under a Power rankings story and the pair reads as
 * one idea. Alone in a group chat that context is gone, and a list of
 * ten teams ranked by projection labelled "The field" is a card whose
 * own headline does not say what it is.
 *
 * The page keeps its names; only the shareable image gets these.
 */
const SHARE_LABELS: Record<string, string> = {
  'the-field': 'Power rankings',
}

export function shareLabelFor(sec: IssueSection): string {
  return SHARE_LABELS[sec.id] || sec.eyebrow || sec.id
}

/** `league-of-record-power-rankings.png` — recognisable in a camera
 *  roll a week later, which is where these end up. */
export function shareFilename(leagueName: string, sec: IssueSection): string {
  const slug = (s: string) =>
    (s || '')
      .toLowerCase()
      .replace(/['’]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40)
  // The same label the card shows, so the file and the image agree.
  const parts = [slug(leagueName), slug(shareLabelFor(sec))].filter(Boolean)
  return `${parts.join('-') || 'the-league-beat'}.png`
}

/* ─────────────────────────────────────────────────────────────────
   Getting it off the device
───────────────────────────────────────────────────────────────── */

export type ShareOutcome = 'shared' | 'downloaded' | 'dismissed'

type ShareNavigator = Navigator & {
  canShare?: (data: { files?: File[] }) => boolean
  share?: (data: { files?: File[]; title?: string; text?: string }) => Promise<void>
}

/**
 * Is the OS share sheet a better destination than a download?
 *
 * Only on a touch device. macOS advertises the Web Share API and will
 * happily open a sheet full of AirDrop targets and contacts — but
 * somebody on a laptop pressed a button labelled "image" and expects a
 * file, not a contact picker. On a phone the sheet IS the feature: the
 * league chat is one tap away and a download would bury the PNG in
 * Files.
 *
 * Pointer coarseness is the honest split. Trackpads and mice report
 * `fine`; touchscreens report `coarse`, including iPadOS, which
 * otherwise identifies itself as a Mac and defeats user-agent sniffing.
 *
 * The matcher is injectable so the rule can be tested without a DOM.
 */
export function prefersShareSheet(
  match?: (query: string) => { matches: boolean },
): boolean {
  const m = match ?? (typeof matchMedia === 'function' ? matchMedia : undefined)
  if (!m) return false
  try {
    return m('(pointer: coarse)').matches
  } catch {
    return false
  }
}

/**
 * Hand the image to the OS share sheet, or fall back to a download.
 *
 * `canShare` is checked with the real file: Safari and Chrome both
 * advertise `share` while refusing file payloads in some contexts, so
 * feature-detecting the method alone throws at the worst moment.
 *
 * A dismissed share sheet is not a failure. The user changed their
 * mind; falling back to a download there would leave them with a file
 * they just declined to send.
 */
export async function shareOrDownload(
  blob: Blob,
  filename: string,
  title: string,
  useShareSheet = prefersShareSheet(),
): Promise<ShareOutcome> {
  const nav = navigator as ShareNavigator
  const file = new File([blob], filename, { type: 'image/png' })

  if (useShareSheet && nav.canShare?.({ files: [file] }) && nav.share) {
    try {
      await nav.share({ files: [file], title })
      return 'shared'
    } catch (err) {
      if ((err as DOMException)?.name === 'AbortError') return 'dismissed'
      // Anything else — a share target that rejected the payload — is
      // worth recovering from, so the image still reaches the user.
    }
  }

  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
  return 'downloaded'
}
