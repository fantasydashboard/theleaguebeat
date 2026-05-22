/**
 * Matchup detectors — 16 story types covering single-week matchup
 * drama: sweeps, shutouts, comebacks, blowouts, rivalries, division
 * clashes, stakes-week showdowns, and spoiler watches.
 *
 * Every detector here keys off `data.matchupsCurrentWeek`. If that
 * field is missing or empty we early-out in the orchestrator so no
 * detector has to defend against it.
 *
 * Design rules (per detection/types.ts):
 *   - Pure functions. Same input → same output.
 *   - Never throw. Return `[]` when data is missing.
 *   - Signature uses `signature([type, teamIds.sort().join('+'),
 *     currentWeek])` so the same matchup re-fires the same signature
 *     on repeat detections.
 */
import type {
  CategoryLeagueData,
  CategoryLeagueDataMatchup,
} from '../types'
import { ALL_ACTIVE_STAGES, type IssueContext, type SeasonStage, type StoryCandidate } from './types'
import {
  freshnessForWeekAge,
  isMathematicallyEliminated,
  signature,
  standingFor,
} from './helpers'

/* ─────────────────────────────────────────────────────────────────
   WEIGHTS
   Tuned per the architecture rubric (cat-sweep ~80, fallback ~20).
   Comments lock in the relative scoring story-to-story.
───────────────────────────────────────────────────────────────── */

const W = {
  catSweep:       80,   // dominant week — sweep-rare so worth featuring
  catShutout:     65,   // flip side; slightly quieter angle
  photoFinish:    70,   // tied final = high drama
  comebackWin:    75,   // underdog win — proxy detection
  blowout:        60,   // common-ish; not always lead-worthy
  puntSuccess:    60,   // strategic-narrative angle
  puntFailure:    50,   // duller angle than success
  matchupOfWeek:  85,   // top-2 head to head — anchor story
  worstMatchup:   30,   // quiet-humor angle, low priority
  razorClose:    70,   // 1-cat decisions are reliably gripping
  rematch:        55,   // mid — depends on context
  playoffRematch: 75,   // strong angle when available
  divisionClash:  65,   // good seasonal-arc angle
  stakesWeek:     80,   // late-season must-win
  spoilerWatch:   60,   // niche but evocative
  lineupMistake:  40,   // coarse proxy — kept low
} as const

/* ─────────────────────────────────────────────────────────────────
   LOCAL HELPERS
   These are shared by multiple matchup detectors but too specific
   to live in detection/helpers.ts.
───────────────────────────────────────────────────────────────── */

/** Stages where regular-season matchup stories make sense. We exclude
 *  `preseason` and `offseason` — there are no matchups to talk about
 *  in those windows. */
const IN_SEASON_STAGES: SeasonStage[] = ALL_ACTIVE_STAGES

/** Matchups treated as "decided" by the post-mortem detectors. Only
 *  `final` matchups carry a definitive winner; live/coasting/upcoming
 *  matchups are mid-week and shouldn't fire sweeps, shutouts, etc. */
function isFinal(m: CategoryLeagueDataMatchup): boolean {
  return m.status === 'final'
}

/** Which side won (by cat-wins). Returns 'tie' when the cat-win counts
 *  are equal. Pure-math view — does not consult `status`. */
function winnerSide(m: CategoryLeagueDataMatchup): 'home' | 'away' | 'tie' {
  if (m.homeCatWins > m.awayCatWins) return 'home'
  if (m.awayCatWins > m.homeCatWins) return 'away'
  return 'tie'
}

function winnerTeamId(m: CategoryLeagueDataMatchup): string | undefined {
  const side = winnerSide(m)
  if (side === 'home') return m.homeTeamId
  if (side === 'away') return m.awayTeamId
  return undefined
}

function loserTeamId(m: CategoryLeagueDataMatchup): string | undefined {
  const side = winnerSide(m)
  if (side === 'home') return m.awayTeamId
  if (side === 'away') return m.homeTeamId
  return undefined
}

/** Sorted, ascii-comparable concatenation of two team ids — used in
 *  both the signature and the h2h matrix lookup. */
function pairKey(a: string, b: string): string {
  return [a, b].sort().join('+')
}

/** Look up the all-time H2H entry between two teams. The matrix
 *  alphabetizes the pair, so we mirror that on lookup. */
function h2hEntry(data: CategoryLeagueData, teamA: string, teamB: string) {
  if (!data.h2hMatrix) return undefined
  const [a, b] = [teamA, teamB].sort()
  return data.h2hMatrix.find((e) => e.teamA === a && e.teamB === b)
}

/* ─────────────────────────────────────────────────────────────────
   1. CAT-SWEEP
   A team won every cat (allowing for ties). Tested by checking the
   winner's catWins against `categories.length - ties`.
───────────────────────────────────────────────────────────────── */

function detectCatSweep(
  data: CategoryLeagueData,
  context: IssueContext,
): StoryCandidate[] {
  const out: StoryCandidate[] = []
  const totalCats = data.categories.length
  if (totalCats === 0) return out

  for (const m of data.matchupsCurrentWeek ?? []) {
    if (!isFinal(m)) continue

    const decidable = totalCats - m.ties
    // Need at least 2 decidable cats to call something a sweep.
    if (decidable < 2) continue

    let winnerId: string | undefined
    if (m.homeCatWins === decidable && m.awayCatWins === 0) {
      winnerId = m.homeTeamId
    } else if (m.awayCatWins === decidable && m.homeCatWins === 0) {
      winnerId = m.awayTeamId
    }
    if (!winnerId) continue

    const loserId = winnerId === m.homeTeamId ? m.awayTeamId : m.homeTeamId

    out.push({
      type: 'cat-sweep',
      category: 'matchup',
      weight: W.catSweep,
      freshness: freshnessForWeekAge(0),
      scope: 'matchup',
      teamIds: [winnerId],
      seasonStages: IN_SEASON_STAGES,
      context: {
        matchupId: m.id,
        winnerTeamId: winnerId,
        loserTeamId: loserId,
        catWins: decidable,
        ties: m.ties,
        week: context.currentWeek,
      },
      signature: signature([
        'cat-sweep',
        [winnerId].sort().join('+'),
        context.currentWeek,
      ]),
    })
  }
  return out
}

/* ─────────────────────────────────────────────────────────────────
   2. CAT-SHUTOUT
   The losing side of a sweep. Same matchup as cat-sweep, framed
   from the loser's perspective. Lower weight — quieter angle.
───────────────────────────────────────────────────────────────── */

function detectCatShutout(
  data: CategoryLeagueData,
  context: IssueContext,
): StoryCandidate[] {
  const out: StoryCandidate[] = []
  const totalCats = data.categories.length
  if (totalCats === 0) return out

  for (const m of data.matchupsCurrentWeek ?? []) {
    if (!isFinal(m)) continue

    const decidable = totalCats - m.ties
    if (decidable < 2) continue

    let loserId: string | undefined
    let winnerId: string | undefined
    if (m.homeCatWins === decidable && m.awayCatWins === 0) {
      loserId = m.awayTeamId
      winnerId = m.homeTeamId
    } else if (m.awayCatWins === decidable && m.homeCatWins === 0) {
      loserId = m.homeTeamId
      winnerId = m.awayTeamId
    }
    if (!loserId || !winnerId) continue

    out.push({
      type: 'cat-shutout',
      category: 'matchup',
      weight: W.catShutout,
      freshness: freshnessForWeekAge(0),
      scope: 'matchup',
      teamIds: [loserId],
      seasonStages: IN_SEASON_STAGES,
      context: {
        matchupId: m.id,
        loserTeamId: loserId,
        winnerTeamId: winnerId,
        catLosses: decidable,
        ties: m.ties,
        week: context.currentWeek,
      },
      signature: signature([
        'cat-shutout',
        [loserId].sort().join('+'),
        context.currentWeek,
      ]),
    })
  }
  return out
}

/* ─────────────────────────────────────────────────────────────────
   3. PHOTO-FINISH
   A final matchup where both sides ended with the same cat-wins.
───────────────────────────────────────────────────────────────── */

function detectPhotoFinish(
  data: CategoryLeagueData,
  context: IssueContext,
): StoryCandidate[] {
  const out: StoryCandidate[] = []
  for (const m of data.matchupsCurrentWeek ?? []) {
    if (!isFinal(m)) continue
    if (m.homeCatWins !== m.awayCatWins) continue

    const pair = [m.homeTeamId, m.awayTeamId]
    out.push({
      type: 'photo-finish',
      category: 'matchup',
      weight: W.photoFinish,
      freshness: freshnessForWeekAge(0),
      scope: 'matchup',
      teamIds: pair,
      seasonStages: IN_SEASON_STAGES,
      context: {
        matchupId: m.id,
        homeTeamId: m.homeTeamId,
        awayTeamId: m.awayTeamId,
        catWinsEach: m.homeCatWins,
        ties: m.ties,
        week: context.currentWeek,
      },
      signature: signature([
        'photo-finish',
        pair.sort().join('+'),
        context.currentWeek,
      ]),
    })
  }
  return out
}

/* ─────────────────────────────────────────────────────────────────
   4. COMEBACK-WIN
   We can't see mid-week trajectories from the current contract, so
   approximate "comeback" two ways:
     a) Low-ownsCount team wins their week decisively (7+ cats), or
     b) Rank-8+ team wins their week 7+ cats.
   Both proxies frame an underdog-overcomes-odds narrative.
───────────────────────────────────────────────────────────────── */

function detectComebackWin(
  data: CategoryLeagueData,
  context: IssueContext,
): StoryCandidate[] {
  const out: StoryCandidate[] = []
  for (const m of data.matchupsCurrentWeek ?? []) {
    if (!isFinal(m)) continue

    const winnerId = winnerTeamId(m)
    const loserId = loserTeamId(m)
    if (!winnerId || !loserId) continue

    const winnerCatWins =
      winnerId === m.homeTeamId ? m.homeCatWins : m.awayCatWins

    // Proxy threshold: a decisive win is 7+ cats out of (typically) 11.
    if (winnerCatWins < 7) continue

    const winnerStanding = standingFor(data, winnerId)
    if (!winnerStanding) continue

    const looksLikeUnderdog =
      winnerStanding.ownsCount <= 2 || winnerStanding.rank >= 8

    if (!looksLikeUnderdog) continue

    out.push({
      type: 'comeback-win',
      category: 'matchup',
      weight: W.comebackWin,
      freshness: freshnessForWeekAge(0),
      scope: 'matchup',
      teamIds: [winnerId, loserId],
      seasonStages: IN_SEASON_STAGES,
      context: {
        matchupId: m.id,
        winnerTeamId: winnerId,
        loserTeamId: loserId,
        winnerRank: winnerStanding.rank,
        winnerOwnsCount: winnerStanding.ownsCount,
        catWins: winnerCatWins,
        week: context.currentWeek,
      },
      signature: signature([
        'comeback-win',
        [winnerId, loserId].sort().join('+'),
        context.currentWeek,
      ]),
    })
  }
  return out
}

/* ─────────────────────────────────────────────────────────────────
   5. BLOWOUT
   The cat-win disparity is ≥80% of the decidable cats. For an 11-cat
   league with no ties that's 9-2 or worse; for 10 decidable cats
   (one tie) it'd be 8-2 or worse.
   Excluded from cat-sweep — a sweep also satisfies blowout, and we
   want both detectors to be able to fire (selection layer dedupes by
   category).
───────────────────────────────────────────────────────────────── */

function detectBlowout(
  data: CategoryLeagueData,
  context: IssueContext,
): StoryCandidate[] {
  const out: StoryCandidate[] = []
  const totalCats = data.categories.length
  if (totalCats === 0) return out

  for (const m of data.matchupsCurrentWeek ?? []) {
    if (!isFinal(m)) continue

    const decidable = totalCats - m.ties
    if (decidable < 5) continue

    const winnerCats = Math.max(m.homeCatWins, m.awayCatWins)
    const ratio = winnerCats / decidable
    if (ratio < 0.8) continue

    const winnerId = winnerTeamId(m)
    const loserId = loserTeamId(m)
    if (!winnerId || !loserId) continue

    out.push({
      type: 'blowout',
      category: 'matchup',
      weight: W.blowout,
      freshness: freshnessForWeekAge(0),
      scope: 'matchup',
      teamIds: [winnerId, loserId],
      seasonStages: IN_SEASON_STAGES,
      context: {
        matchupId: m.id,
        winnerTeamId: winnerId,
        loserTeamId: loserId,
        winnerCatWins: winnerCats,
        loserCatWins: decidable - winnerCats,
        ties: m.ties,
        week: context.currentWeek,
      },
      signature: signature([
        'blowout',
        [winnerId, loserId].sort().join('+'),
        context.currentWeek,
      ]),
    })
  }
  return out
}

/* ─────────────────────────────────────────────────────────────────
   6. PUNT-SUCCESS
   A team carrying 3+ "bleeding" cats (bottom-3 in three or more cats
   = treated as punted) WINS their week with 7+ cats. The narrative
   angle: their punt strategy paid off this week.
───────────────────────────────────────────────────────────────── */

function detectPuntSuccess(
  data: CategoryLeagueData,
  context: IssueContext,
): StoryCandidate[] {
  const out: StoryCandidate[] = []
  for (const m of data.matchupsCurrentWeek ?? []) {
    if (!isFinal(m)) continue

    const winnerId = winnerTeamId(m)
    if (!winnerId) continue
    const winnerStanding = standingFor(data, winnerId)
    if (!winnerStanding) continue
    if (winnerStanding.bleedingCount < 3) continue

    const winnerCatWins =
      winnerId === m.homeTeamId ? m.homeCatWins : m.awayCatWins
    if (winnerCatWins < 7) continue

    out.push({
      type: 'punt-success',
      category: 'matchup',
      weight: W.puntSuccess,
      freshness: freshnessForWeekAge(0),
      scope: 'team',
      teamIds: [winnerId],
      // Punt-strategy stories need enough season for "bleeding" to
      // mean something — gate to midseason+.
      seasonStages: ['midseason', 'stretch', 'final'],
      context: {
        matchupId: m.id,
        teamId: winnerId,
        bleedingCount: winnerStanding.bleedingCount,
        ownsCount: winnerStanding.ownsCount,
        catWins: winnerCatWins,
        week: context.currentWeek,
      },
      signature: signature([
        'punt-success',
        [winnerId].sort().join('+'),
        context.currentWeek,
      ]),
    })
  }
  return out
}

/* ─────────────────────────────────────────────────────────────────
   7. PUNT-FAILURE
   The unhappy mirror: a team with 3+ bleeding cats LOSES their week
   with 4+ cats lost. The punt didn't pay this week.
───────────────────────────────────────────────────────────────── */

function detectPuntFailure(
  data: CategoryLeagueData,
  context: IssueContext,
): StoryCandidate[] {
  const out: StoryCandidate[] = []
  for (const m of data.matchupsCurrentWeek ?? []) {
    if (!isFinal(m)) continue

    const loserId = loserTeamId(m)
    if (!loserId) continue
    const loserStanding = standingFor(data, loserId)
    if (!loserStanding) continue
    if (loserStanding.bleedingCount < 3) continue

    const loserCatLosses =
      loserId === m.homeTeamId ? m.awayCatWins : m.homeCatWins
    if (loserCatLosses < 4) continue

    out.push({
      type: 'punt-failure',
      category: 'matchup',
      weight: W.puntFailure,
      freshness: freshnessForWeekAge(0),
      scope: 'team',
      teamIds: [loserId],
      seasonStages: ['midseason', 'stretch', 'final'],
      context: {
        matchupId: m.id,
        teamId: loserId,
        bleedingCount: loserStanding.bleedingCount,
        ownsCount: loserStanding.ownsCount,
        catLosses: loserCatLosses,
        week: context.currentWeek,
      },
      signature: signature([
        'punt-failure',
        [loserId].sort().join('+'),
        context.currentWeek,
      ]),
    })
  }
  return out
}

/* ─────────────────────────────────────────────────────────────────
   8. MATCHUP-OF-WEEK
   The current-week matchup pairing the two highest-ranked teams.
   We rank by `standing.rank` (1 = best). Only one fires per week.
───────────────────────────────────────────────────────────────── */

function detectMatchupOfWeek(
  data: CategoryLeagueData,
  context: IssueContext,
): StoryCandidate[] {
  const matchups = data.matchupsCurrentWeek ?? []
  if (matchups.length === 0) return []

  // Combined-rank score per matchup; smaller is better.
  let best: { m: CategoryLeagueDataMatchup; sum: number } | undefined
  for (const m of matchups) {
    const h = standingFor(data, m.homeTeamId)?.rank
    const a = standingFor(data, m.awayTeamId)?.rank
    if (h == null || a == null) continue
    const sum = h + a
    if (!best || sum < best.sum) best = { m, sum }
  }
  if (!best) return []

  const pair = [best.m.homeTeamId, best.m.awayTeamId]
  return [
    {
      type: 'matchup-of-week',
      category: 'matchup',
      weight: W.matchupOfWeek,
      freshness: freshnessForWeekAge(0),
      scope: 'matchup',
      teamIds: pair,
      seasonStages: IN_SEASON_STAGES,
      context: {
        matchupId: best.m.id,
        homeTeamId: best.m.homeTeamId,
        awayTeamId: best.m.awayTeamId,
        homeRank: standingFor(data, best.m.homeTeamId)?.rank,
        awayRank: standingFor(data, best.m.awayTeamId)?.rank,
        status: best.m.status,
        week: context.currentWeek,
      },
      signature: signature([
        'matchup-of-week',
        pair.sort().join('+'),
        context.currentWeek,
      ]),
    },
  ]
}

/* ─────────────────────────────────────────────────────────────────
   9. WORST-MATCHUP
   The mirror of matchup-of-week — two lowest-ranked teams playing
   each other. Quiet-humor angle, low weight; the editorial voice
   gives this story its tone, not the data.
───────────────────────────────────────────────────────────────── */

function detectWorstMatchup(
  data: CategoryLeagueData,
  context: IssueContext,
): StoryCandidate[] {
  const matchups = data.matchupsCurrentWeek ?? []
  if (matchups.length === 0) return []

  // Largest combined rank = both teams near the basement.
  let worst: { m: CategoryLeagueDataMatchup; sum: number } | undefined
  for (const m of matchups) {
    const h = standingFor(data, m.homeTeamId)?.rank
    const a = standingFor(data, m.awayTeamId)?.rank
    if (h == null || a == null) continue
    const sum = h + a
    if (!worst || sum > worst.sum) worst = { m, sum }
  }
  if (!worst) return []

  const pair = [worst.m.homeTeamId, worst.m.awayTeamId]
  return [
    {
      type: 'worst-matchup',
      category: 'matchup',
      weight: W.worstMatchup,
      freshness: freshnessForWeekAge(0),
      scope: 'matchup',
      teamIds: pair,
      seasonStages: IN_SEASON_STAGES,
      context: {
        matchupId: worst.m.id,
        homeTeamId: worst.m.homeTeamId,
        awayTeamId: worst.m.awayTeamId,
        homeRank: standingFor(data, worst.m.homeTeamId)?.rank,
        awayRank: standingFor(data, worst.m.awayTeamId)?.rank,
        status: worst.m.status,
        week: context.currentWeek,
      },
      signature: signature([
        'worst-matchup',
        pair.sort().join('+'),
        context.currentWeek,
      ]),
    },
  ]
}

/* ─────────────────────────────────────────────────────────────────
   10. RAZOR-CLOSE
   A final matchup decided by exactly one cat-win.
───────────────────────────────────────────────────────────────── */

function detectRazorClose(
  data: CategoryLeagueData,
  context: IssueContext,
): StoryCandidate[] {
  const out: StoryCandidate[] = []
  for (const m of data.matchupsCurrentWeek ?? []) {
    if (!isFinal(m)) continue
    const diff = Math.abs(m.homeCatWins - m.awayCatWins)
    if (diff !== 1) continue

    const winnerId = winnerTeamId(m)
    const loserId = loserTeamId(m)
    if (!winnerId || !loserId) continue

    const pair = [winnerId, loserId]
    out.push({
      type: 'razor-close',
      category: 'matchup',
      weight: W.razorClose,
      freshness: freshnessForWeekAge(0),
      scope: 'matchup',
      teamIds: pair,
      seasonStages: IN_SEASON_STAGES,
      context: {
        matchupId: m.id,
        winnerTeamId: winnerId,
        loserTeamId: loserId,
        winnerCatWins: Math.max(m.homeCatWins, m.awayCatWins),
        loserCatWins: Math.min(m.homeCatWins, m.awayCatWins),
        ties: m.ties,
        week: context.currentWeek,
      },
      signature: signature([
        'razor-close',
        pair.sort().join('+'),
        context.currentWeek,
      ]),
    })
  }
  return out
}

/* ─────────────────────────────────────────────────────────────────
   11. REMATCH
   Two teams playing this week who have already met earlier this
   season. We approximate "met earlier" by h2hMatrix.meetings > 0;
   the matrix is all-time, so this also catches cross-season rematches
   in returning leagues, which is fine editorially.
───────────────────────────────────────────────────────────────── */

function detectRematch(
  data: CategoryLeagueData,
  context: IssueContext,
): StoryCandidate[] {
  const out: StoryCandidate[] = []
  if (!data.h2hMatrix || data.h2hMatrix.length === 0) return out

  for (const m of data.matchupsCurrentWeek ?? []) {
    const entry = h2hEntry(data, m.homeTeamId, m.awayTeamId)
    if (!entry || entry.meetings <= 0) continue

    const pair = [m.homeTeamId, m.awayTeamId]
    out.push({
      type: 'rematch',
      category: 'matchup',
      weight: W.rematch,
      freshness: freshnessForWeekAge(0),
      scope: 'matchup',
      teamIds: pair,
      seasonStages: IN_SEASON_STAGES,
      context: {
        matchupId: m.id,
        homeTeamId: m.homeTeamId,
        awayTeamId: m.awayTeamId,
        priorMeetings: entry.meetings,
        priorRecord: entry.recordA,
        priorCatDiff: entry.catDiffA,
        week: context.currentWeek,
      },
      signature: signature([
        'rematch',
        pair.sort().join('+'),
        context.currentWeek,
      ]),
    })
  }
  return out
}

/* ─────────────────────────────────────────────────────────────────
   12. PLAYOFF-REMATCH
   Two teams meeting this week who previously met in the playoffs.
   The current h2h matrix has no playoff-meeting count, so this
   detector returns empty until that field lands. Kept as a stub so
   the orchestrator wiring stays stable.
───────────────────────────────────────────────────────────────── */

function detectPlayoffRematch(
  _data: CategoryLeagueData,
  _context: IssueContext,
): StoryCandidate[] {
  // TODO: when `CategoryLeagueDataH2HEntry` (or seasonHistory) starts
  // carrying playoff-meeting counts, swap this to real detection:
  //   - find this-week pairings
  //   - look up playoffMeetings > 0
  //   - emit candidate at W.playoffRematch with
  //     seasonStages: ['stretch','final','playoffs']
  return []
}

/* ─────────────────────────────────────────────────────────────────
   13. DIVISION-CLASH
   Two same-division teams playing this week. Requires the optional
   `divisions` array plus `team.divisionId`. Skips silently when the
   league has no divisions.
───────────────────────────────────────────────────────────────── */

function detectDivisionClash(
  data: CategoryLeagueData,
  context: IssueContext,
): StoryCandidate[] {
  const out: StoryCandidate[] = []
  if (!data.divisions || data.divisions.length === 0) return out

  const teamDiv = new Map<string, string | undefined>()
  for (const t of data.teams) teamDiv.set(t.id, t.divisionId)

  for (const m of data.matchupsCurrentWeek ?? []) {
    const hDiv = teamDiv.get(m.homeTeamId)
    const aDiv = teamDiv.get(m.awayTeamId)
    if (!hDiv || !aDiv || hDiv !== aDiv) continue

    const division = data.divisions.find((d) => d.id === hDiv)
    const pair = [m.homeTeamId, m.awayTeamId]
    out.push({
      type: 'division-clash',
      category: 'matchup',
      weight: W.divisionClash,
      freshness: freshnessForWeekAge(0),
      scope: 'matchup',
      teamIds: pair,
      seasonStages: IN_SEASON_STAGES,
      context: {
        matchupId: m.id,
        homeTeamId: m.homeTeamId,
        awayTeamId: m.awayTeamId,
        divisionId: hDiv,
        divisionName: division?.name,
        status: m.status,
        week: context.currentWeek,
      },
      signature: signature([
        'division-clash',
        pair.sort().join('+'),
        context.currentWeek,
      ]),
    })
  }
  return out
}

/* ─────────────────────────────────────────────────────────────────
   14. STAKES-WEEK
   A team within 2 ranks of the playoff cutoff (in either direction)
   has a matchup — late-season must-win framing. Emits one candidate
   per qualifying matchup.
───────────────────────────────────────────────────────────────── */

function detectStakesWeek(
  data: CategoryLeagueData,
  context: IssueContext,
): StoryCandidate[] {
  const out: StoryCandidate[] = []
  const cut = data.playoffCutoff
  if (!cut || cut <= 0) return out

  const seen = new Set<string>()
  for (const m of data.matchupsCurrentWeek ?? []) {
    const h = standingFor(data, m.homeTeamId)?.rank
    const a = standingFor(data, m.awayTeamId)?.rank
    if (h == null || a == null) continue

    // Either team within 2 of the cutoff line counts as "stakes".
    const homeNear = Math.abs(h - cut) <= 2 || Math.abs(h - (cut + 1)) <= 2
    const awayNear = Math.abs(a - cut) <= 2 || Math.abs(a - (cut + 1)) <= 2
    if (!homeNear && !awayNear) continue

    const pair = [m.homeTeamId, m.awayTeamId]
    const sig = pair.sort().join('+')
    if (seen.has(sig)) continue
    seen.add(sig)

    out.push({
      type: 'stakes-week',
      category: 'matchup',
      weight: W.stakesWeek,
      freshness: freshnessForWeekAge(0),
      scope: 'matchup',
      teamIds: pair,
      // Only meaningful in the back half of the regular season.
      seasonStages: ['stretch', 'final'],
      context: {
        matchupId: m.id,
        homeTeamId: m.homeTeamId,
        awayTeamId: m.awayTeamId,
        homeRank: h,
        awayRank: a,
        playoffCutoff: cut,
        status: m.status,
        week: context.currentWeek,
      },
      signature: signature([
        'stakes-week',
        sig,
        context.currentWeek,
      ]),
    })
  }
  return out
}

/* ─────────────────────────────────────────────────────────────────
   15. SPOILER-WATCH
   A mathematically-eliminated team has a matchup against a contender
   (rank ≤ playoffCutoff). The spoiler angle — "they can ruin
   someone's playoff push tonight." Only fires in `final`.
───────────────────────────────────────────────────────────────── */

function detectSpoilerWatch(
  data: CategoryLeagueData,
  context: IssueContext,
): StoryCandidate[] {
  const out: StoryCandidate[] = []
  const cut = data.playoffCutoff
  if (!cut || cut <= 0) return out

  for (const m of data.matchupsCurrentWeek ?? []) {
    const hRank = standingFor(data, m.homeTeamId)?.rank
    const aRank = standingFor(data, m.awayTeamId)?.rank
    if (hRank == null || aRank == null) continue

    const homeEliminated = isMathematicallyEliminated(data, m.homeTeamId)
    const awayEliminated = isMathematicallyEliminated(data, m.awayTeamId)

    let spoilerId: string | undefined
    let contenderId: string | undefined
    if (homeEliminated && !awayEliminated && aRank <= cut) {
      spoilerId = m.homeTeamId
      contenderId = m.awayTeamId
    } else if (awayEliminated && !homeEliminated && hRank <= cut) {
      spoilerId = m.awayTeamId
      contenderId = m.homeTeamId
    }
    if (!spoilerId || !contenderId) continue

    const pair = [spoilerId, contenderId]
    out.push({
      type: 'spoiler-watch',
      category: 'matchup',
      weight: W.spoilerWatch,
      freshness: freshnessForWeekAge(0),
      scope: 'matchup',
      teamIds: pair,
      seasonStages: ['final'],
      context: {
        matchupId: m.id,
        spoilerTeamId: spoilerId,
        contenderTeamId: contenderId,
        contenderRank:
          contenderId === m.homeTeamId ? hRank : aRank,
        playoffCutoff: cut,
        status: m.status,
        week: context.currentWeek,
      },
      signature: signature([
        'spoiler-watch',
        pair.sort().join('+'),
        context.currentWeek,
      ]),
    })
  }
  return out
}

/* ─────────────────────────────────────────────────────────────────
   16. LINEUP-MISTAKE  (coarse proxy)
   A real implementation needs daily roster snapshots so we can flag
   benched-but-eligible players. We don't have those yet. Proxy:
   a team that LOST by exactly 1 cat AND has 3+ "bleeding" cats —
   the narrative angle being "those bleeds plus a tighter lineup
   could've flipped the result." Low weight, marked accordingly.
───────────────────────────────────────────────────────────────── */

function detectLineupMistake(
  data: CategoryLeagueData,
  context: IssueContext,
): StoryCandidate[] {
  const out: StoryCandidate[] = []
  for (const m of data.matchupsCurrentWeek ?? []) {
    if (!isFinal(m)) continue
    if (Math.abs(m.homeCatWins - m.awayCatWins) !== 1) continue

    const loserId = loserTeamId(m)
    if (!loserId) continue
    const loserStanding = standingFor(data, loserId)
    if (!loserStanding) continue
    if (loserStanding.bleedingCount < 3) continue

    out.push({
      type: 'lineup-mistake',
      category: 'matchup',
      weight: W.lineupMistake,
      freshness: freshnessForWeekAge(0),
      scope: 'team',
      teamIds: [loserId],
      seasonStages: IN_SEASON_STAGES,
      context: {
        matchupId: m.id,
        teamId: loserId,
        bleedingCount: loserStanding.bleedingCount,
        marginCats: 1,
        week: context.currentWeek,
        proxy: true,
        proxyNote:
          'Coarse proxy — true detection requires roster snapshots.',
      },
      signature: signature([
        'lineup-mistake',
        [loserId].sort().join('+'),
        context.currentWeek,
      ]),
    })
  }
  return out
}

/* ─────────────────────────────────────────────────────────────────
   ORCHESTRATOR
───────────────────────────────────────────────────────────────── */

export function detect(
  data: CategoryLeagueData,
  context: IssueContext,
): StoryCandidate[] {
  // Every detector here requires at least one matchup to evaluate.
  if (!data.matchupsCurrentWeek || data.matchupsCurrentWeek.length === 0) {
    return []
  }
  return [
    ...detectCatSweep(data, context),
    ...detectCatShutout(data, context),
    ...detectPhotoFinish(data, context),
    ...detectComebackWin(data, context),
    ...detectBlowout(data, context),
    ...detectPuntSuccess(data, context),
    ...detectPuntFailure(data, context),
    ...detectMatchupOfWeek(data, context),
    ...detectWorstMatchup(data, context),
    ...detectRazorClose(data, context),
    ...detectRematch(data, context),
    ...detectPlayoffRematch(data, context),
    ...detectDivisionClash(data, context),
    ...detectStakesWeek(data, context),
    ...detectSpoilerWatch(data, context),
    ...detectLineupMistake(data, context),
  ]
}
