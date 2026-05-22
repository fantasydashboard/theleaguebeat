/**
 * Story detection engine — History page.
 *
 * Pure functions that read `CategoryLeagueData` (specifically the
 * extended `seasonHistory`, `teamCareerStats`, and `h2hMatrix` fields)
 * and emit `StoryCandidate[]` per slot. No rendering, no globals, no
 * I/O. Selection + rendering happens in `render-history.ts`.
 *
 * History detection is structurally different from Home:
 *   - Most beats render exactly one winner per slot (no scoring race).
 *     Weight is still surfaced so the renderer can choose between
 *     alternatives where they exist (e.g. multiple candidates for a
 *     single record-book entry).
 *   - Year-card kinds emit one candidate PER YEAR — the renderer
 *     iterates the resulting array, not a single winner.
 *   - Rivalry kinds emit one candidate PER PAIR — marquee for the
 *     hand-picked notable pairings, procedural for everything else.
 *
 * Every detector degrades gracefully when underlying data is missing.
 * For a brand-new league (`seasonHistory` empty or single-season) most
 * detectors return [], and the renderer falls back to "league is new,
 * no history yet" copy on the page itself.
 */

import type {
  CategoryLeagueData,
  CategoryLeagueDataSeasonHistory,
  CategoryLeagueDataTeamCareerStats,
  CategoryLeagueDataH2HEntry,
  StoryCandidate,
} from './types.ts'
import type { HistoryKind, EraHint, RecordType } from './history.ts'

/* ─────────────────────────────────────────────────────────────────
   PER-DETECTOR CONTEXT SHAPES
───────────────────────────────────────────────────────────────── */

export interface YearCardDetectionContext {
  year: number
  championTeamId: string
  runnerUpTeamId: string
  basementTeamId: string
  championRecord: string
  era: EraHint
  championStreakLen: number      // 1 = no streak; 2 = back-to-back; 3+ = three-peat
  championshipCatMargin?: string // "6-5" / "8-3" from the championRecord-aware proxy
  signal: string
}

export interface AllTimeLegacyDetectionContext {
  teamId: string
  totalLegacyScore: number       // proxy = totalCatWins + titles*100 + playoffApps*20
  titlesCount: number
  playoffAppearances: number
  seasonsPlayed: number
  legacyEra: 'first-name-on-cup' | 'multi-time-winner' | 'consistent-contender'
  legacyLeadMargin: number       // gap to the #2 team in legacy score
  signal: string
}

export interface DynastyDetectionContext {
  teamId: string
  catWinTotal: number            // hitCatsWon or pitchCatsWon depending on kind
  cats?: string[]                // best cats (hitting / pitching) — proxy from teamCareerStats
  dynastyYears: number           // proxy = seasonsPlayed
  signal: string
}

export interface RecordBookDetectionContext {
  recordType: RecordType
  teamId: string
  recordValue: string
  recordNumber: number
  recordYearSpan: string
  recordMargin: number           // gap to next team
  signal: string
}

export interface RivalryDetectionContext {
  teamAId: string                // alphabetized order
  teamBId: string
  allTimeRecord: string          // teamA's POV, "5-4-1" or "5-4"
  meetings: number
  catMarginNet: number           // teamA POV; positive = teamA ahead
  trend: 'one-sided' | 'split' | 'recent-reversal' | 'first-meeting'
  isMarquee: boolean
  signal: string
}

export interface FootnoteDetectionContext {
  teamId: string
  opponentTeamId?: string        // for biggest-blowout
  value: string                  // pre-formatted, "2 straight in 2024-2025"
  yearSpan?: string
  year?: number
  signal: string
}

/* ─────────────────────────────────────────────────────────────────
   SHARED HELPERS (pure)
───────────────────────────────────────────────────────────────── */

function teamExists(data: CategoryLeagueData, teamId: string): boolean {
  return data.teams.some((t) => t.id === teamId)
}

function sortedSeasonsAsc(data: CategoryLeagueData): CategoryLeagueDataSeasonHistory[] {
  return [...(data.seasonHistory ?? [])].sort((a, b) => a.year - b.year)
}

/** "144-72-9" -> { wins: 144, losses: 72, ties: 9 }. Returns null on shape mismatch. */
function parseCatRecord(rec: string): { wins: number; losses: number; ties: number } | null {
  const m = rec.match(/^(\d+)-(\d+)-(\d+)$/)
  if (!m) return null
  return { wins: parseInt(m[1], 10), losses: parseInt(m[2], 10), ties: parseInt(m[3], 10) }
}

/** "5-4-1" with teamA's POV -> { aWins, bWins, ties }. */
function parseH2HRecord(rec: string): { aWins: number; bWins: number; ties: number } | null {
  const m = rec.match(/^(\d+)-(\d+)-(\d+)$/)
  if (!m) return null
  return { aWins: parseInt(m[1], 10), bWins: parseInt(m[2], 10), ties: parseInt(m[3], 10) }
}

/** Format a year range from a single year or a span. */
function formatYearSpan(start: number, end: number): string {
  return start === end ? `${start}` : `${start}-${end}`
}

/* ─────────────────────────────────────────────────────────────────
   YEAR-CARD DETECTION
   One pair of candidates (era-label + headline) per season in
   seasonHistory. Era is computed from the surrounding context.
───────────────────────────────────────────────────────────────── */

export function detectYearCards(
  data: CategoryLeagueData,
): Array<StoryCandidate<HistoryKind, YearCardDetectionContext>> {
  const seasons = sortedSeasonsAsc(data)
  if (seasons.length === 0) return []

  const out: Array<StoryCandidate<HistoryKind, YearCardDetectionContext>> = []

  /* Build a quick lookup: which seasons each team won as champion. */
  const championYearsByTeam = new Map<string, number[]>()
  for (const s of seasons) {
    const arr = championYearsByTeam.get(s.championTeamId) ?? []
    arr.push(s.year)
    championYearsByTeam.set(s.championTeamId, arr)
  }

  for (let i = 0; i < seasons.length; i++) {
    const s = seasons[i]
    const prev = i > 0 ? seasons[i - 1] : null
    const next = i < seasons.length - 1 ? seasons[i + 1] : null

    /* Streak length: this season + any prior consecutive ones won by
       the same team. */
    let streak = 1
    for (let j = i - 1; j >= 0; j--) {
      if (seasons[j].championTeamId === s.championTeamId) streak++
      else break
    }

    /* Era classification.
       - founding: first season in the dataset
       - dynasty:  champion same as prev (streak >= 2)
       - collapse: prev champion finishes basement this season
       - reset:    year AFTER a dynasty ended (prev champ different from
                   prev-prev champ AND prev-prev was a dynasty); also
                   fires when a brand-new champ takes a previously-stale
                   throne
       - parity:   close championship record (catWins - catLosses gap
                   small) — fallback when nothing else fires
    */
    let era: EraHint = 'parity'
    if (i === 0) {
      era = 'founding'
    } else if (streak >= 2) {
      era = 'dynasty'
    } else if (prev && prev.championTeamId === s.basementTeamId) {
      era = 'collapse'
    } else {
      // Look back for "year after a dynasty ended".
      const prevPrev = i >= 2 ? seasons[i - 2] : null
      if (
        prev &&
        prevPrev &&
        prev.championTeamId === prevPrev.championTeamId &&
        prev.championTeamId !== s.championTeamId
      ) {
        era = 'reset'
      } else {
        // Parity is the soft default — only assert it when the championship
        // record looks competitive (under .700 cat-win rate).
        const parsed = parseCatRecord(s.championRecord)
        if (parsed && parsed.wins + parsed.losses + parsed.ties > 0) {
          const wp = parsed.wins / (parsed.wins + parsed.losses + parsed.ties)
          era = wp < 0.66 ? 'parity' : 'reset'
        } else {
          era = 'reset'
        }
      }
    }

    /* championshipCatMargin proxy — derived from championRecord.
       We don't have a per-final cat-record on CategoryLeagueData yet,
       so we surface a tight-final cue when the regular-season cat-win
       rate suggests a competitive year (under .68). The renderer
       treats this as optional and most variants ignore it. */
    let championshipCatMargin: string | undefined
    const parsed = parseCatRecord(s.championRecord)
    if (parsed) {
      const total = parsed.wins + parsed.losses + parsed.ties
      if (total > 0) {
        const wp = parsed.wins / total
        if (wp < 0.62) championshipCatMargin = '6-5'
        else if (wp < 0.68) championshipCatMargin = '7-4'
        else if (wp < 0.74) championshipCatMargin = '8-3'
      }
    }

    /* Use a bookkeeping suppress on `next` to avoid lint warnings — it's
       intentionally available for future detectors. */
    void next

    /* Emit the era-label candidate. Eyebrow-only. */
    out.push({
      kind: 'year-card-era-label',
      weight: 100,
      context: {
        year: s.year,
        championTeamId: s.championTeamId,
        runnerUpTeamId: s.runnerUpTeamId,
        basementTeamId: s.basementTeamId,
        championRecord: s.championRecord,
        era,
        championStreakLen: streak,
        championshipCatMargin,
        signal: `${s.year} era=${era} streak=${streak}`,
      },
    })

    /* Emit the headline candidate (same context, different kind). */
    out.push({
      kind: 'year-card-headline',
      weight: 100,
      context: {
        year: s.year,
        championTeamId: s.championTeamId,
        runnerUpTeamId: s.runnerUpTeamId,
        basementTeamId: s.basementTeamId,
        championRecord: s.championRecord,
        era,
        championStreakLen: streak,
        championshipCatMargin,
        signal: `${s.year} champion=${s.championTeamId} runner-up=${s.runnerUpTeamId}`,
      },
    })
  }

  return out
}

/* ─────────────────────────────────────────────────────────────────
   ALL-TIME LEGACY HERO DETECTION
   Single rendering for the #1 ranked team. Score proxy: totalCatWins
   + titles*100 + playoffApps*20.
───────────────────────────────────────────────────────────────── */

function legacyScoreFor(s: CategoryLeagueDataTeamCareerStats): number {
  return s.totalCatWins + s.titles * 100 + s.playoffApps * 20
}

export function detectAllTimeLegacyHero(
  data: CategoryLeagueData,
): Array<StoryCandidate<HistoryKind, AllTimeLegacyDetectionContext>> {
  const career = data.teamCareerStats
  if (!career) return []
  const entries = Object.values(career).filter((s) => teamExists(data, s.teamId))
  if (entries.length === 0) return []

  const ranked = entries
    .map((s) => ({ s, score: legacyScoreFor(s) }))
    .sort((a, b) => b.score - a.score)

  const top = ranked[0]
  if (!top) return []

  let legacyEra: AllTimeLegacyDetectionContext['legacyEra']
  if (top.s.titles >= 2) legacyEra = 'multi-time-winner'
  else if (top.s.titles === 1) legacyEra = 'first-name-on-cup'
  else legacyEra = 'consistent-contender'

  const margin = ranked.length >= 2 ? top.score - ranked[1].score : top.score

  return [{
    kind: 'all-time-legacy-hero',
    weight: 100,
    context: {
      teamId: top.s.teamId,
      totalLegacyScore: top.score,
      titlesCount: top.s.titles,
      playoffAppearances: top.s.playoffApps,
      seasonsPlayed: top.s.seasonsPlayed,
      legacyEra,
      legacyLeadMargin: margin,
      signal: `legacy #1: ${top.s.teamId} score=${top.score} era=${legacyEra}`,
    },
  }]
}

/* ─────────────────────────────────────────────────────────────────
   DYNASTY BEAT DETECTION (hitting / pitching / punt-kings)
───────────────────────────────────────────────────────────────── */

export function detectDynastyHitting(
  data: CategoryLeagueData,
): Array<StoryCandidate<HistoryKind, DynastyDetectionContext>> {
  const career = data.teamCareerStats
  if (!career) return []
  const entries = Object.values(career).filter((s) => teamExists(data, s.teamId))
  if (entries.length === 0) return []
  const top = entries.reduce((best, s) => (s.hitCatsWon > best.hitCatsWon ? s : best))
  if (top.hitCatsWon <= 0) return []
  return [{
    kind: 'dynasty-hitting',
    weight: 100,
    context: {
      teamId: top.teamId,
      catWinTotal: top.hitCatsWon,
      dynastyYears: top.seasonsPlayed,
      cats: undefined,  // per-cat hitting history not exposed on the universal shape
      signal: `hitting dynasty: ${top.teamId} ${top.hitCatsWon} cats`,
    },
  }]
}

export function detectDynastyPitching(
  data: CategoryLeagueData,
): Array<StoryCandidate<HistoryKind, DynastyDetectionContext>> {
  const career = data.teamCareerStats
  if (!career) return []
  const entries = Object.values(career).filter((s) => teamExists(data, s.teamId))
  if (entries.length === 0) return []
  const top = entries.reduce((best, s) => (s.pitchCatsWon > best.pitchCatsWon ? s : best))
  if (top.pitchCatsWon <= 0) return []
  return [{
    kind: 'dynasty-pitching',
    weight: 100,
    context: {
      teamId: top.teamId,
      catWinTotal: top.pitchCatsWon,
      dynastyYears: top.seasonsPlayed,
      cats: undefined,
      signal: `pitching dynasty: ${top.teamId} ${top.pitchCatsWon} cats`,
    },
  }]
}

/* Punt-kings detection needs per-year per-cat finish data which the
   universal CategoryLeagueData does not expose today. SKIP the detector
   — the renderer surfaces a hand-friendly "no punt dynasty in the
   data" outcome and the History view will fall back to its existing
   fixture-driven copy for that one slot. */
export function detectDynastyPuntKings(
  _data: CategoryLeagueData,
): Array<StoryCandidate<HistoryKind, DynastyDetectionContext>> {
  // TODO: needs per-year per-cat finish data. Re-enable when adapters
  // populate a per-year cat-finish table on CategoryLeagueData.
  return []
}

/* ─────────────────────────────────────────────────────────────────
   RECORD BOOK DETECTION (Fame + Shame)
───────────────────────────────────────────────────────────────── */

function buildRecordCandidate(
  data: CategoryLeagueData,
  recordType: RecordType,
  picker: (s: CategoryLeagueDataTeamCareerStats) => number,
  best: 'high' | 'low',
  format: (n: number) => string,
): StoryCandidate<HistoryKind, RecordBookDetectionContext> | null {
  const career = data.teamCareerStats
  if (!career) return null
  const entries = Object.values(career).filter((s) => teamExists(data, s.teamId))
  if (entries.length === 0) return null
  const sorted = [...entries].sort((a, b) => {
    const va = picker(a)
    const vb = picker(b)
    return best === 'high' ? vb - va : va - vb
  })
  const winner = sorted[0]
  if (!winner) return null
  const winnerVal = picker(winner)
  const runnerUp = sorted[1]
  const margin = runnerUp ? Math.abs(winnerVal - picker(runnerUp)) : winnerVal

  // Year span: full league history when the record is career-wide.
  const seasons = sortedSeasonsAsc(data)
  const yearSpan = seasons.length > 0
    ? formatYearSpan(seasons[0].year, seasons[seasons.length - 1].year)
    : `${data.currentSeason}`

  const kind: HistoryKind =
    recordType === 'most-wins' || recordType === 'highest-ppw' ||
    recordType === 'best-season-pct' || recordType === 'most-categories' ||
    recordType === 'most-championships' || recordType === 'longest-playoff-streak' ||
    recordType === 'most-top-3-finishes'
      ? 'record-book-fame'
      : 'record-book-shame'

  return {
    kind,
    weight: 100,
    context: {
      recordType,
      teamId: winner.teamId,
      recordValue: format(winnerVal),
      recordNumber: winnerVal,
      recordYearSpan: yearSpan,
      recordMargin: margin,
      signal: `${recordType}: ${winner.teamId} ${format(winnerVal)} (+${margin})`,
    },
  }
}

export function detectRecordBookFame(
  data: CategoryLeagueData,
): Array<StoryCandidate<HistoryKind, RecordBookDetectionContext>> {
  const out: Array<StoryCandidate<HistoryKind, RecordBookDetectionContext>> = []

  // most-wins (career cat wins)
  const mostWins = buildRecordCandidate(
    data, 'most-wins',
    (s) => s.totalCatWins,
    'high',
    (n) => `${n} cat wins`,
  )
  if (mostWins) out.push(mostWins)

  // most-championships
  const mostChamps = buildRecordCandidate(
    data, 'most-championships',
    (s) => s.titles,
    'high',
    (n) => n === 1 ? '1 title' : `${n} titles`,
  )
  // Suppress when nobody has a title yet — pill would say "0 titles".
  if (mostChamps && mostChamps.context.recordNumber > 0) out.push(mostChamps)

  // best-season-pct (we treat careerWinPct as the proxy for "best win pct")
  const bestPct = buildRecordCandidate(
    data, 'best-season-pct',
    (s) => s.careerWinPct,
    'high',
    (n) => `.${Math.round(n * 1000).toString().padStart(3, '0')}`,
  )
  if (bestPct) out.push(bestPct)

  // most-top-3-finishes (proxy: playoff apps — we lack per-year ranks)
  const topThree = buildRecordCandidate(
    data, 'most-top-3-finishes',
    (s) => s.playoffApps,
    'high',
    (n) => `${n} playoff apps`,
  )
  if (topThree) out.push(topThree)

  return out
}

export function detectRecordBookShame(
  data: CategoryLeagueData,
): Array<StoryCandidate<HistoryKind, RecordBookDetectionContext>> {
  const out: Array<StoryCandidate<HistoryKind, RecordBookDetectionContext>> = []

  // most-losses
  const mostLosses = buildRecordCandidate(
    data, 'most-losses',
    (s) => s.totalCatLosses,
    'high',
    (n) => `${n} cat losses`,
  )
  if (mostLosses) out.push(mostLosses)

  // worst-season-pct (lowest careerWinPct)
  const worstPct = buildRecordCandidate(
    data, 'worst-season-pct',
    (s) => s.careerWinPct,
    'low',
    (n) => `.${Math.round(n * 1000).toString().padStart(3, '0')}`,
  )
  if (worstPct) out.push(worstPct)

  // most-categories-lost (cat differential, lowest)
  const worstDiff = buildRecordCandidate(
    data, 'most-categories-lost',
    (s) => s.catDifferential,
    'low',
    (n) => n >= 0 ? `+${n} cat diff` : `${n} cat diff`,
  )
  if (worstDiff) out.push(worstDiff)

  // most-cellar-finishes (proxy: lowest playoffApps -> most years at the back)
  const mostCellar = buildRecordCandidate(
    data, 'most-cellar-finishes',
    (s) => s.seasonsPlayed - s.playoffApps,
    'high',
    (n) => `${n} non-playoff seasons`,
  )
  if (mostCellar && mostCellar.context.recordNumber > 0) out.push(mostCellar)

  return out
}

/* ─────────────────────────────────────────────────────────────────
   RIVALRY DETECTION
   - Marquee: top N by total meetings + cat-diff magnitude.
   - Procedural: any other pair the caller asks about (modal click).

   The detector emits ALL pairs as marquee OR procedural based on
   selection rules below. The renderer keys results by alphabetized
   pair id so the modal can look them up on click.
───────────────────────────────────────────────────────────────── */

export function detectRivalryProfiles(
  data: CategoryLeagueData,
  marqueeLimit = 5,
): Array<StoryCandidate<HistoryKind, RivalryDetectionContext>> {
  const matrix = data.h2hMatrix
  if (!matrix || matrix.length === 0) return []

  const ranked = [...matrix]
    .filter((e) => teamExists(data, e.teamA) && teamExists(data, e.teamB))
    .map((e) => ({
      e,
      // Marquee rank score: weighted by meeting count + cat-diff magnitude.
      score: e.meetings * 10 + Math.abs(e.catDiffA),
    }))
    .sort((a, b) => b.score - a.score)

  const marqueeKeys = new Set(
    ranked.slice(0, marqueeLimit).map((r) => keyForPair(r.e.teamA, r.e.teamB)),
  )

  return ranked.map(({ e }): StoryCandidate<HistoryKind, RivalryDetectionContext> => {
    const parsed = parseH2HRecord(e.recordA)
    const aWins = parsed?.aWins ?? 0
    const bWins = parsed?.bWins ?? 0
    const trend = classifyRivalryTrend(e, aWins, bWins)
    const isMarquee = marqueeKeys.has(keyForPair(e.teamA, e.teamB))
    return {
      kind: isMarquee ? 'rivalry-profile-marquee' : 'rivalry-profile-procedural',
      weight: isMarquee ? 100 : 60,
      context: {
        teamAId: e.teamA,
        teamBId: e.teamB,
        allTimeRecord: e.recordA,
        meetings: e.meetings,
        catMarginNet: e.catDiffA,
        trend,
        isMarquee,
        signal: `${e.teamA}-${e.teamB} meetings=${e.meetings} trend=${trend}`,
      },
    }
  })
}

function keyForPair(a: string, b: string): string {
  return a < b ? `${a}-${b}` : `${b}-${a}`
}

function classifyRivalryTrend(
  e: CategoryLeagueDataH2HEntry,
  aWins: number,
  bWins: number,
): 'one-sided' | 'split' | 'recent-reversal' | 'first-meeting' {
  if (e.meetings === 0) return 'first-meeting'
  const total = aWins + bWins
  if (total === 0) return 'split'
  const diff = Math.abs(aWins - bWins)
  // Heuristic: one-sided when leader holds >= 65% of decisions.
  if (diff / total >= 0.30) return 'one-sided'
  return 'split'
}

/* ─────────────────────────────────────────────────────────────────
   FOOTNOTE DETECTION (5 pills)
───────────────────────────────────────────────────────────────── */

export function detectFootnoteLongestDynasty(
  data: CategoryLeagueData,
): Array<StoryCandidate<HistoryKind, FootnoteDetectionContext>> {
  const seasons = sortedSeasonsAsc(data)
  if (seasons.length === 0) return []

  // Scan for the longest consecutive run of identical champion ids.
  let bestRun = { teamId: '', length: 1, startYear: seasons[0].year, endYear: seasons[0].year }
  let curRun = { teamId: seasons[0].championTeamId, length: 1, startYear: seasons[0].year, endYear: seasons[0].year }
  bestRun = { ...curRun }

  for (let i = 1; i < seasons.length; i++) {
    if (seasons[i].championTeamId === curRun.teamId) {
      curRun.length++
      curRun.endYear = seasons[i].year
    } else {
      curRun = { teamId: seasons[i].championTeamId, length: 1, startYear: seasons[i].year, endYear: seasons[i].year }
    }
    if (curRun.length > bestRun.length) bestRun = { ...curRun }
  }

  if (bestRun.length < 2) return []   // no streak worth a pill

  return [{
    kind: 'footnote-longest-dynasty',
    weight: 100,
    context: {
      teamId: bestRun.teamId,
      value: `${bestRun.length} straight in ${formatYearSpan(bestRun.startYear, bestRun.endYear)}`,
      yearSpan: formatYearSpan(bestRun.startYear, bestRun.endYear),
      signal: `longest dynasty: ${bestRun.teamId} ${bestRun.length} straight`,
    },
  }]
}

export function detectFootnoteBiggestBlowout(
  data: CategoryLeagueData,
): Array<StoryCandidate<HistoryKind, FootnoteDetectionContext>> {
  const matrix = data.h2hMatrix
  if (!matrix || matrix.length === 0) return []

  // Single-meeting blowout magnitude isn't exposed; use the largest
  // |catDiffA| across the matrix as the proxy — the team-pair whose
  // history is most lopsided.
  const sorted = [...matrix]
    .filter((e) => teamExists(data, e.teamA) && teamExists(data, e.teamB))
    .sort((a, b) => Math.abs(b.catDiffA) - Math.abs(a.catDiffA))
  const top = sorted[0]
  if (!top || Math.abs(top.catDiffA) < 4) return []

  // The winning side is whichever held the positive cat-diff.
  const winnerId = top.catDiffA >= 0 ? top.teamA : top.teamB
  const loserId  = top.catDiffA >= 0 ? top.teamB : top.teamA
  return [{
    kind: 'footnote-biggest-blowout',
    weight: 100,
    context: {
      teamId: winnerId,
      opponentTeamId: loserId,
      value: `${Math.abs(top.catDiffA)} cat margin over the series`,
      signal: `biggest blowout: ${winnerId} vs ${loserId} +${Math.abs(top.catDiffA)} cats`,
    },
  }]
}

export function detectFootnoteClosestChampionship(
  data: CategoryLeagueData,
): Array<StoryCandidate<HistoryKind, FootnoteDetectionContext>> {
  const seasons = sortedSeasonsAsc(data)
  if (seasons.length === 0) return []

  // We don't have per-final cat-record on the universal shape, so we
  // proxy "closest" with the lowest cat-win rate of any champion. The
  // bumpy years (champion barely crossed the line) make the better
  // candidates. Tie-break to the most recent year.
  let best: { season: CategoryLeagueDataSeasonHistory; wp: number } | null = null
  for (const s of seasons) {
    const parsed = parseCatRecord(s.championRecord)
    if (!parsed) continue
    const total = parsed.wins + parsed.losses + parsed.ties
    if (total === 0) continue
    const wp = parsed.wins / total
    if (!best || wp < best.wp || (wp === best.wp && s.year > best.season.year)) {
      best = { season: s, wp }
    }
  }
  if (!best) return []

  return [{
    kind: 'footnote-closest-championship',
    weight: 100,
    context: {
      teamId: best.season.championTeamId,
      opponentTeamId: best.season.runnerUpTeamId,
      value: `${best.season.year} over ${getTeamName(data, best.season.runnerUpTeamId)}`,
      year: best.season.year,
      signal: `closest championship: ${best.season.year} ${best.season.championTeamId} wp=${best.wp.toFixed(3)}`,
    },
  }]
}

export function detectFootnoteMostConsistent(
  data: CategoryLeagueData,
): Array<StoryCandidate<HistoryKind, FootnoteDetectionContext>> {
  const career = data.teamCareerStats
  if (!career) return []
  const entries = Object.values(career).filter((s) => teamExists(data, s.teamId))
  if (entries.length === 0) return []

  // Proxy for "lowest rank variance": highest playoffApps / seasonsPlayed
  // ratio AMONG teams without a championship. The "always there, never
  // wins it" team is the canonical consistent-contender pill.
  const candidates = entries
    .filter((s) => s.seasonsPlayed > 0)
    .map((s) => ({
      s,
      ratio: s.playoffApps / s.seasonsPlayed,
    }))
    .sort((a, b) => b.ratio - a.ratio)

  // Prefer titles == 0 with high playoff ratio; fall back to the
  // overall highest ratio when nobody fits the prefer-bucket.
  const preferred = candidates.find((c) => c.s.titles === 0 && c.ratio >= 0.6) ?? candidates[0]
  if (!preferred) return []

  return [{
    kind: 'footnote-most-consistent',
    weight: 100,
    context: {
      teamId: preferred.s.teamId,
      value: `${preferred.s.playoffApps} playoff apps in ${preferred.s.seasonsPlayed} seasons`,
      signal: `most consistent: ${preferred.s.teamId} ${preferred.s.playoffApps}/${preferred.s.seasonsPlayed}`,
    },
  }]
}

export function detectFootnoteMostVolatile(
  data: CategoryLeagueData,
): Array<StoryCandidate<HistoryKind, FootnoteDetectionContext>> {
  const career = data.teamCareerStats
  if (!career) return []
  const entries = Object.values(career).filter((s) => teamExists(data, s.teamId))
  if (entries.length === 0) return []

  // Proxy for "highest rank variance": the team with the widest
  // hitCatsWon vs pitchCatsWon imbalance — a one-side identity that
  // boom/busts the standings between cat-friendly weeks. We exclude
  // the legacy #1 team because volatility is interesting away from
  // the dynasty.
  const legacyTop = [...entries].sort((a, b) => legacyScoreFor(b) - legacyScoreFor(a))[0]
  const pool = entries.filter((s) => s.teamId !== legacyTop?.teamId)
  if (pool.length === 0) return []

  const sorted = [...pool].sort((a, b) => {
    const imbA = Math.abs(a.hitCatsWon - a.pitchCatsWon)
    const imbB = Math.abs(b.hitCatsWon - b.pitchCatsWon)
    return imbB - imbA
  })
  const top = sorted[0]
  if (!top) return []
  const imbalance = Math.abs(top.hitCatsWon - top.pitchCatsWon)

  return [{
    kind: 'footnote-most-volatile',
    weight: 100,
    context: {
      teamId: top.teamId,
      value: `${imbalance} cat imbalance between hitting and pitching`,
      signal: `most volatile: ${top.teamId} imbalance=${imbalance}`,
    },
  }]
}

/* ─────────────────────────────────────────────────────────────────
   SHARED HELPER: TEAM NAME LOOKUP
───────────────────────────────────────────────────────────────── */

function getTeamName(data: CategoryLeagueData, teamId: string): string {
  return data.teams.find((t) => t.id === teamId)?.name ?? teamId
}
