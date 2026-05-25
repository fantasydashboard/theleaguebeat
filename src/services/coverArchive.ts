/**
 * Cover archive — local persistence for the "magazine collection"
 * retention mechanic. Snapshots each issue's cover when the user
 * visits during that issue's week, and remembers which issues a
 * user has "claimed" (visited during their live window).
 *
 * v1 is localStorage-only. v2 will sync to Supabase so claims
 * persist across devices and a user with leagues on multiple
 * platforms sees a unified shelf.
 *
 * Why snapshot at all: the cover composer picks the week's
 * defining story from live data. If we recomputed past-week covers
 * later, the result would shift (data ages, new events fire, the
 * "defining story of week 8" might change three weeks later).
 * Snapshots preserve the editorial decision the moment it was made.
 *
 * Two storage keys, keyed by league:
 *   tlb:covers:{leagueId}  → ArchivedCover[]
 *   tlb:claims:{leagueId}  → ClaimRecord[]   (anon claims; auth users will mirror to Supabase)
 */

import type { WeeklyCover } from '@/editorial/composition/weeklyCover'

const COVERS_KEY = (leagueId: string) => `tlb:covers:${leagueId}`
const CLAIMS_KEY = (leagueId: string) => `tlb:claims:${leagueId}`

/* ─────────────────────────────────────────────────────────────────
   SHAPES
───────────────────────────────────────────────────────────────── */

export interface ArchivedCover {
  /** Composite key — `${season}-${issueWeek}` per league. */
  id: string
  leagueId: string
  issueWeek: number
  season: number
  storyType: string
  storySignature: string
  headline: string
  deck?: string
  tone: 'magenta' | 'gold' | 'teal' | 'up' | 'down'
  /** Epoch ms the snapshot was first written. */
  publishedAt: number
}

export interface ClaimRecord {
  /** Same composite key as ArchivedCover.id. */
  id: string
  leagueId: string
  issueWeek: number
  season: number
  /** Epoch ms the user first visited during this issue's window. */
  claimedAt: number
}

/* ─────────────────────────────────────────────────────────────────
   SNAPSHOTS — write once, idempotent on (league, season, week)
───────────────────────────────────────────────────────────────── */

/**
 * Snapshot the current cover for this issue. Idempotent: if a
 * snapshot already exists for (leagueId, season, week) it returns
 * the existing one unchanged. This is the "the editorial decision
 * was made on day X" record — never overwritten.
 *
 * Returns the stored cover (existing or freshly written).
 */
export function snapshotCover(
  leagueId: string,
  cover: WeeklyCover,
  issueWeek: number,
  season: number,
  tone: ArchivedCover['tone'],
): ArchivedCover | null {
  if (!isStorageAvailable()) return null
  const id = `${season}-${issueWeek}`
  const all = readCovers(leagueId)
  const existing = all.find((c) => c.id === id)
  if (existing) return existing

  const ctx = cover.story.context as Record<string, unknown>
  const headline = typeof ctx.headline === 'string' ? ctx.headline : 'Cover story'
  const deck = typeof ctx.summaryLine === 'string' ? ctx.summaryLine : undefined

  const fresh: ArchivedCover = {
    id,
    leagueId,
    issueWeek,
    season,
    storyType: cover.story.type,
    storySignature: cover.story.signature,
    headline,
    deck,
    tone,
    publishedAt: Date.now(),
  }

  all.push(fresh)
  // Keep the array sorted by season+week for stable archive rendering.
  all.sort((a, b) => a.season - b.season || a.issueWeek - b.issueWeek)
  writeCovers(leagueId, all)
  return fresh
}

export function getArchivedCovers(leagueId: string): ArchivedCover[] {
  return readCovers(leagueId)
}

/* ─────────────────────────────────────────────────────────────────
   CLAIMS — record that this user visited during the issue's window
───────────────────────────────────────────────────────────────── */

/**
 * Record a claim for the current issue. Idempotent on (leagueId,
 * season, issueWeek). The mental model: by visiting during the
 * week the issue is live, you "claim" your copy of it.
 */
export function claimIssue(
  leagueId: string,
  issueWeek: number,
  season: number,
): ClaimRecord | null {
  if (!isStorageAvailable()) return null
  const id = `${season}-${issueWeek}`
  const all = readClaims(leagueId)
  const existing = all.find((c) => c.id === id)
  if (existing) return existing

  const fresh: ClaimRecord = {
    id,
    leagueId,
    issueWeek,
    season,
    claimedAt: Date.now(),
  }
  all.push(fresh)
  all.sort((a, b) => a.season - b.season || a.issueWeek - b.issueWeek)
  writeClaims(leagueId, all)
  return fresh
}

export function getClaimedIssues(leagueId: string): ClaimRecord[] {
  return readClaims(leagueId)
}

export function isClaimedIssue(
  leagueId: string,
  issueWeek: number,
  season: number,
): boolean {
  const id = `${season}-${issueWeek}`
  return readClaims(leagueId).some((c) => c.id === id)
}

/** Total number of issues this user has claimed for this league.
 *  Drives the "9-issue collection" counter on the masthead. */
export function claimCount(leagueId: string): number {
  return readClaims(leagueId).length
}

/* ─────────────────────────────────────────────────────────────────
   INTERNAL — localStorage I/O, defensive against quota / SSR
───────────────────────────────────────────────────────────────── */

function isStorageAvailable(): boolean {
  try {
    return typeof window !== 'undefined' && !!window.localStorage
  } catch {
    return false
  }
}

function readCovers(leagueId: string): ArchivedCover[] {
  if (!isStorageAvailable()) return []
  try {
    const raw = window.localStorage.getItem(COVERS_KEY(leagueId))
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeCovers(leagueId: string, covers: ArchivedCover[]): void {
  if (!isStorageAvailable()) return
  try {
    window.localStorage.setItem(COVERS_KEY(leagueId), JSON.stringify(covers))
  } catch {
    // Quota exceeded or storage disabled — silently no-op.
  }
}

function readClaims(leagueId: string): ClaimRecord[] {
  if (!isStorageAvailable()) return []
  try {
    const raw = window.localStorage.getItem(CLAIMS_KEY(leagueId))
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeClaims(leagueId: string, claims: ClaimRecord[]): void {
  if (!isStorageAvailable()) return
  try {
    window.localStorage.setItem(CLAIMS_KEY(leagueId), JSON.stringify(claims))
  } catch {
    // Same as above — fail quietly.
  }
}
