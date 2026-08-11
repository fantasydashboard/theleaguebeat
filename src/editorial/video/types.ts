/**
 * The Reel contract — the only thing shared between the editorial
 * pipeline (which builds a Reel) and the Remotion renderer (which
 * turns one into an MP4). Keeping this a plain data type is what lets
 * either half be tested without the other.
 *
 * See docs/superpowers/specs/2026-08-09-league-video-reel-design.md
 */

export type SceneTemplate =
  | 'cold-open'
  | 'the-throne'
  | 'the-climb'
  | 'the-board'
  | 'sign-off'

/** The minimum a scene component needs to draw a team. */
export interface ReelTeam {
  id: string
  name: string
  /** OKLCH gradient stops, comma-separated. Straight from the adapter. */
  avatarColor: string
  ownerInitials: string
}

export interface ColdOpenProps {
  leagueName: string
  week: number
  subtitle: string
}

export interface ThroneCatLine {
  /** Short category label, e.g. "HR". */
  label: string
  winner: 'a' | 'b'
  /** 0–1 fraction of the bar width — how decisively the cat was won. */
  share: number
}

export interface ThroneProps {
  teamA: ReelTeam
  teamB: ReelTeam
  eyebrow: string
  headline: string
  catLines: ThroneCatLine[]
  kicker: string
  /** Whether teamA's category lead is a final result or still live.
   *  Drives tense in both the VO and the renderer's connector word
   *  ("def." when decided, "leads" when the week is still in play). */
  isFinal: boolean
}

export interface ClimbPoint {
  week: number
  rank: number
}

export interface ClimbProps {
  team: ReelTeam
  points: ClimbPoint[]
  fromRank: number
  toRank: number
  spanWeeks: number
  footnote: string
}

export interface BoardRow {
  rank: number
  teamName: string
  /** Pre-formatted category record, e.g. "62–38" or "62–38–2". */
  record: string
  /** Rank change vs the most recent history week. + climbed, - fell,
   *  0 flat, null when no history exists to compare against. */
  delta: number | null
  highlight: boolean
}

export interface BoardProps {
  rows: BoardRow[]
  note: string
}

export interface SignOffProps {
  teamA: ReelTeam
  teamB: ReelTeam
  line: string
  brandUrl: string
}

/** Discriminated on `template` so the renderer's switch is exhaustive. */
export type SceneBody =
  | { template: 'cold-open'; props: ColdOpenProps }
  | { template: 'the-throne'; props: ThroneProps }
  | { template: 'the-climb'; props: ClimbProps }
  | { template: 'the-board'; props: BoardProps }
  | { template: 'sign-off'; props: SignOffProps }

export type ReelScene = SceneBody & {
  /** Narration script. Deterministic output of the variant libraries. */
  vo: string
  /** Floor duration, independent of audio. */
  minDurationMs: number
  /** Filled in by the voice phase (not Phase 0). */
  voDurationMs?: number
  /** Storage path of the synthesized clip (not Phase 0). */
  voPath?: string
  /** Story that drove this scene. Absent for fixed scenes. */
  storySignature?: string
}

export interface Reel {
  leagueId: string
  leagueName: string
  year: number
  week: number
  width: 1080
  height: 1920
  fps: 30
  scenes: ReelScene[]
  /** Filled in by the voice phase (not Phase 0). */
  totalDurationMs?: number
}
