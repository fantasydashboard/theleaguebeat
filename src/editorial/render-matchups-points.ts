/**
 * Editorial render layer for H2H points Matchups.
 *
 * Mirrors the shape of `render-matchups.ts` (the category version)
 * but operates on `LeagueDataH2HPoints`. Voice and rhythm match the
 * category library so the two formats feel like one publication.
 *
 * The hero classifier is *week-phase aware*: early-week matchups
 * (lots of projected points remaining) use early-arc vocabulary
 * ("in front", "tight start"), late-week matchups use late-arc
 * vocabulary ("runaway", "comeback"). LIVE labels never imply
 * decision — that vocabulary ("sealed", "closes on") is reserved
 * for FINAL matchups so the eyebrow never contradicts itself.
 */

import type {
  LeagueDataH2HPoints,
  LeagueDataPointsMatchup,
  CategoryLeagueDataTeam,
} from './types'

export interface RenderedPointsMatchupOfWeek {
  matchupId: string
  eyebrow: string
  headline: string
  body: string
  subContext: string
}

export interface RenderedPointsMatchupLine {
  /** Editorial one-liner — "X pulls away from Y (+18.5)." */
  status: string
  /** Eyebrow chip — "LIVE · in front" / "FINAL · X +28" etc. */
  eyebrow: string
}

export interface RenderedPointsQuickRead {
  label: string
  value: string
}

export interface RenderedPointsMatchupsCopy {
  subHeadline: string
  matchupOfWeek: RenderedPointsMatchupOfWeek | null
  matchupCopy: Record<string, RenderedPointsMatchupLine>
  quickReads: RenderedPointsQuickRead[]
}

/* ─────────────────────────────────────────────────────────────────
   PUBLIC ENTRY
───────────────────────────────────────────────────────────────── */

export function renderPointsMatchupsPage(
  data: LeagueDataH2HPoints,
): RenderedPointsMatchupsCopy {
  const matchups = data.currentWeekMatchups ?? []
  const teamById = new Map<string, CategoryLeagueDataTeam>()
  for (const t of data.teams) teamById.set(t.id, t)
  const teamName = (id: string) => teamById.get(id)?.name ?? `Team ${id}`
  const leagueAvg = data.weeklyPointsAverage

  return {
    subHeadline: renderSubHeadline(matchups),
    matchupOfWeek: renderMatchupOfWeek(matchups, teamName, leagueAvg),
    matchupCopy: renderMatchupLines(matchups, teamName, leagueAvg),
    quickReads: renderQuickReads(matchups, leagueAvg),
  }
}

/* ─────────────────────────────────────────────────────────────────
   SUB-HEADLINE — page deck
───────────────────────────────────────────────────────────────── */

function renderSubHeadline(matchups: LeagueDataPointsMatchup[]): string {
  if (matchups.length === 0) {
    return 'Weekly points. Today\'s scoreboard. Coverage opens when the schedule lights up.'
  }
  const live = matchups.filter((m) => m.status === 'live').length
  if (live === 0) {
    return 'Week sealed. The scoreboard, in order — who pulled away, who was caught.'
  }
  return 'Weekly points. Today\'s scoreboard. The races still racing.'
}

/* ─────────────────────────────────────────────────────────────────
   WEEK PHASE + LIVE CLASSIFIER

   Single source of truth for "what's going on in this matchup."
   Used by both the hero and per-matchup lines so the eyebrow and
   the status sentence agree.

   weekPhase: 0..1, share of projected total already on the board.
     0.0 — week hasn't started
     0.3 — early week, lots of projected points remaining
     0.6 — mid week
     0.9+ — late week, projected mostly realized

   The classifier returns a label + an editorial sentence-builder.
   Vocabulary intentionally avoids "sealed" / "closes" for LIVE
   matchups — those words imply decision and live matchups aren't
   decided yet.
───────────────────────────────────────────────────────────────── */

type LiveLabel = 'runaway' | 'in front' | 'tight' | 'flip risk' | 'comeback'

interface LiveClassification {
  label: LiveLabel
  /** Headline form used by hero and per-matchup status. */
  sentence: (leader: string, trailer: string, margin: number) => string
  /** Hero-only body — explains the *why* with projection context. */
  body: (
    leader: string,
    trailer: string,
    margin: number,
    leaderProjRemaining: number,
    trailerProjRemaining: number,
  ) => string
}

function classifyLive(
  margin: number,
  leaderProjRemaining: number,
  trailerProjRemaining: number,
  weekPhase: number,
  leagueAvg: number | undefined,
): LiveClassification {
  // Buffer scales with the league's scoring magnitude. Falls back
  // to 25 points (a conservative default for weekly H2H baseball
  // points leagues) when no league average has been observed yet.
  const buffer = leagueAvg != null && leagueAvg > 0
    ? Math.max(15, leagueAvg * 0.05)
    : 25

  // Trailer's "catch-up potential" = how much the trailer is
  // projected to outscore the leader from here. Positive = trailer
  // expected to gain ground; negative = leader expected to widen.
  const catchUp = trailerProjRemaining - leaderProjRemaining

  // Final projected margin (from the leader's perspective).
  const finalProjMargin = margin - catchUp

  // Early week (< 25% played) — vocabulary stays neutral. No matchup
  // is "in front" or "tight" yet when 75% of the week's points are
  // still to come. Just acknowledge the lead.
  if (weekPhase < 0.25) {
    return {
      label: 'in front',
      sentence: (leader, trailer, m) =>
        `${leader} opens up on ${trailer} (+${m.toFixed(1)}).`,
      body: (leader, _trailer, m, leaderRem) =>
        `${leader} leads by ${m.toFixed(1)} with ${leaderRem.toFixed(0)} projected to go. Long week ahead.`,
    }
  }

  // Late week (> 80% played) and mathematically locked — the leader
  // has more points in hand than the trailer can reasonably score.
  // Still LIVE (not FINAL) but the editorial can use stronger
  // language because the result is essentially decided.
  if (weekPhase > 0.8 && margin > trailerProjRemaining * 0.95) {
    return {
      label: 'runaway',
      sentence: (leader, trailer, m) =>
        `${leader} runs away from ${trailer} (+${m.toFixed(1)}).`,
      body: (leader, trailer, m, _leaderRem, trailerRem) =>
        `${leader} is up ${m.toFixed(1)} with ${trailer} projected only ${trailerRem.toFixed(1)} more. The math has settled.`,
    }
  }

  // Comfortable lead — projected to widen further. "Runaway" only
  // when the margin is *big* relative to the league avg.
  if (finalProjMargin > buffer * 2 && margin > buffer) {
    return {
      label: 'runaway',
      sentence: (leader, trailer, m) =>
        `${leader} pulls away from ${trailer} (+${m.toFixed(1)}).`,
      body: (leader, _trailer, _m, leaderRem, _trailerRem) =>
        `Projections add ${leaderRem.toFixed(1)} more for ${leader} — the lead widens from here.`,
    }
  }

  // Workmanlike lead — projected to hold but contestable. The
  // editorial framing is "in front" not "leading" so it reads
  // newspaper-y, not scoreboardy.
  if (finalProjMargin > buffer / 2 && margin > 0) {
    return {
      label: 'in front',
      sentence: (leader, trailer, m) =>
        `${leader} leads ${trailer} (+${m.toFixed(1)}).`,
      body: (leader, trailer, m, _leaderRem, trailerRem) =>
        `${leader} is up ${m.toFixed(1)}. ${trailer} has ${trailerRem.toFixed(1)} to come — enough to make it interesting, not enough to flip it.`,
    }
  }

  // Tight — either margin is small or trailer's projected remaining
  // could erase it. The reader's coverage hook: this one's live.
  if (finalProjMargin > -buffer / 2) {
    return {
      label: 'tight',
      sentence: (leader, trailer, m) =>
        `${leader} edges ${trailer} (+${m.toFixed(1)}).`,
      body: (leader, trailer, _m, _leaderRem, trailerRem) =>
        `${trailer} has ${trailerRem.toFixed(1)} projected to come — about the margin ${leader} has to defend.`,
    }
  }

  // Flip risk — leader is still ahead now but the trailer is
  // projected to overtake. Editorial frames it from the trailer's
  // angle since they're the story.
  if (margin > 0) {
    return {
      label: 'flip risk',
      sentence: (leader, trailer, m) =>
        `${trailer} chases ${leader}, down ${m.toFixed(1)}.`,
      body: (_leader, trailer, _m, _leaderRem, trailerRem) =>
        `${trailer} is projected to score ${trailerRem.toFixed(1)} from here — enough to close the gap if the projection holds.`,
    }
  }

  // Comeback — current scoreline already has the trailer ahead
  // because of the way we computed margin from the score gap, but
  // the editorial frames it from whoever's behind. This branch is
  // rare in practice.
  return {
    label: 'comeback',
    sentence: (leader, trailer, m) =>
      `${trailer} chases ${leader}, down ${m.toFixed(1)}.`,
    body: (_leader, trailer, _m, _leaderRem, trailerRem) =>
      `${trailer} has ${trailerRem.toFixed(1)} projected remaining — the lead is on borrowed time.`,
  }
}

/* ─────────────────────────────────────────────────────────────────
   MATCHUP OF THE WEEK — hero

   Selection rule: the matchup the reader most wants to know
   *about*. Prefers live matchups with the highest editorial
   stakes — late-week tights and flip risks lead over runaways.
───────────────────────────────────────────────────────────────── */

function renderMatchupOfWeek(
  matchups: LeagueDataPointsMatchup[],
  teamName: (id: string) => string,
  leagueAvg: number | undefined,
): RenderedPointsMatchupOfWeek | null {
  if (matchups.length === 0) return null

  const live = matchups.filter((m) => m.status === 'live')
  const pool = live.length > 0 ? live : matchups
  const hero = pickHero(pool, leagueAvg)
  if (!hero) return null

  const homeAhead = hero.homePoints >= hero.awayPoints
  const leaderId = homeAhead ? hero.homeTeamId : hero.awayTeamId
  const trailerId = homeAhead ? hero.awayTeamId : hero.homeTeamId
  const leader = teamName(leaderId)
  const trailer = teamName(trailerId)
  const margin = Math.abs(hero.homePoints - hero.awayPoints)
  const homeName = teamName(hero.homeTeamId)
  const awayName = teamName(hero.awayTeamId)

  if (hero.status === 'final') {
    return {
      matchupId: hero.id,
      eyebrow: 'Matchup of the week · FINAL',
      headline: `${leader} closes on ${trailer} by ${margin.toFixed(1)}.`,
      body: `${leader} finishes ${margin.toFixed(1)} ahead. The book is closed on the week.`,
      subContext: `${homeName} ${hero.homePoints.toFixed(1)} — ${awayName} ${hero.awayPoints.toFixed(1)}`,
    }
  }

  const leaderProj = homeAhead ? hero.homeProjected : hero.awayProjected
  const trailerProj = homeAhead ? hero.awayProjected : hero.homeProjected
  const leaderCur = homeAhead ? hero.homePoints : hero.awayPoints
  const trailerCur = homeAhead ? hero.awayPoints : hero.homePoints

  // No projection? Fall back to a neutral "leading by" frame.
  if (leaderProj == null || trailerProj == null) {
    return {
      matchupId: hero.id,
      eyebrow: 'Matchup of the week · LIVE',
      headline: `${leader} leads ${trailer} (+${margin.toFixed(1)}).`,
      body: 'The margin is the margin until projections come in.',
      subContext: `${homeName} ${hero.homePoints.toFixed(1)} — ${awayName} ${hero.awayPoints.toFixed(1)}`,
    }
  }

  const leaderProjRemaining = Math.max(0, leaderProj - leaderCur)
  const trailerProjRemaining = Math.max(0, trailerProj - trailerCur)
  const weekPhase = computeWeekPhase(hero)
  const cls = classifyLive(margin, leaderProjRemaining, trailerProjRemaining, weekPhase, leagueAvg)

  return {
    matchupId: hero.id,
    eyebrow: `Matchup of the week · LIVE · ${cls.label}`,
    headline: cls.sentence(leader, trailer, margin),
    body: cls.body(leader, trailer, margin, leaderProjRemaining, trailerProjRemaining),
    subContext: `${homeName} ${hero.homePoints.toFixed(1)} — ${awayName} ${hero.awayPoints.toFixed(1)}`,
  }
}

function pickHero(
  pool: LeagueDataPointsMatchup[],
  leagueAvg: number | undefined,
): LeagueDataPointsMatchup | null {
  if (pool.length === 0) return null
  // Score every matchup by editorial interest. Tight + flip risk
  // beats runaway — readers come to the magazine for the races
  // that are still races.
  let best = pool[0]
  let bestScore = -Infinity
  for (const m of pool) {
    const score = matchupInterestScore(m, leagueAvg)
    if (score > bestScore) {
      best = m
      bestScore = score
    }
  }
  return best
}

function matchupInterestScore(
  m: LeagueDataPointsMatchup,
  leagueAvg: number | undefined,
): number {
  const margin = Math.abs(m.homePoints - m.awayPoints)
  const buffer = leagueAvg != null && leagueAvg > 0 ? leagueAvg * 0.05 : 25
  // Inverse-margin: tighter races score higher.
  const tightness = 100 - Math.min(100, (margin / buffer) * 20)
  // Late-week races score higher than early-week ones.
  const phase = computeWeekPhase(m)
  const lateBonus = phase > 0.5 ? (phase - 0.5) * 40 : 0
  return tightness + lateBonus
}

function computeWeekPhase(m: LeagueDataPointsMatchup): number {
  if (m.homeProjected == null || m.awayProjected == null) return 0
  const total = m.homeProjected + m.awayProjected
  const current = m.homePoints + m.awayPoints
  if (total <= 0) return 0
  return Math.max(0, Math.min(1, current / total))
}

/* ─────────────────────────────────────────────────────────────────
   PER-MATCHUP LINES — eyebrow + status under each card
───────────────────────────────────────────────────────────────── */

function renderMatchupLines(
  matchups: LeagueDataPointsMatchup[],
  teamName: (id: string) => string,
  leagueAvg: number | undefined,
): Record<string, RenderedPointsMatchupLine> {
  const out: Record<string, RenderedPointsMatchupLine> = {}
  for (const m of matchups) {
    out[m.id] = renderLine(m, teamName, leagueAvg)
  }
  return out
}

function renderLine(
  m: LeagueDataPointsMatchup,
  teamName: (id: string) => string,
  leagueAvg: number | undefined,
): RenderedPointsMatchupLine {
  const homeAhead = m.homePoints >= m.awayPoints
  const leaderId = homeAhead ? m.homeTeamId : m.awayTeamId
  const trailerId = homeAhead ? m.awayTeamId : m.homeTeamId
  const leader = teamName(leaderId)
  const trailer = teamName(trailerId)
  const margin = Math.abs(m.homePoints - m.awayPoints)

  if (m.status === 'final') {
    return {
      eyebrow: `FINAL · ${leader} +${margin.toFixed(1)}`,
      status: `${leader} closes on ${trailer} by ${margin.toFixed(1)}.`,
    }
  }

  const leaderProj = homeAhead ? m.homeProjected : m.awayProjected
  const trailerProj = homeAhead ? m.awayProjected : m.homeProjected
  const leaderCur = homeAhead ? m.homePoints : m.awayPoints
  const trailerCur = homeAhead ? m.awayPoints : m.homePoints

  if (leaderProj == null || trailerProj == null) {
    return {
      eyebrow: `LIVE · +${margin.toFixed(1)}`,
      status: `${leader} leads ${trailer} by ${margin.toFixed(1)}.`,
    }
  }

  const leaderProjRemaining = Math.max(0, leaderProj - leaderCur)
  const trailerProjRemaining = Math.max(0, trailerProj - trailerCur)
  const weekPhase = computeWeekPhase(m)
  const cls = classifyLive(margin, leaderProjRemaining, trailerProjRemaining, weekPhase, leagueAvg)

  return {
    eyebrow: `LIVE · ${cls.label}`,
    status: cls.sentence(leader, trailer, margin),
  }
}

/* ─────────────────────────────────────────────────────────────────
   QUICK READS — stat chips above the matchup list
───────────────────────────────────────────────────────────────── */

function renderQuickReads(
  matchups: LeagueDataPointsMatchup[],
  leagueAverage: number | undefined,
): RenderedPointsQuickRead[] {
  const out: RenderedPointsQuickRead[] = []
  const live = matchups.filter((m) => m.status === 'live').length
  const final = matchups.filter((m) => m.status === 'final').length
  if (live > 0) out.push({ label: 'live', value: String(live) })
  if (final > 0) out.push({ label: 'final', value: String(final) })
  if (leagueAverage != null && Number.isFinite(leagueAverage)) {
    out.push({ label: 'league avg', value: leagueAverage.toFixed(1) })
  }
  return out
}
