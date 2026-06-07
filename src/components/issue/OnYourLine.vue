<template>
  <article v-if="view" class="on-your-line" aria-labelledby="oyl-eyebrow">
    <header class="oyl-head">
      <p id="oyl-eyebrow" class="oyl-eyebrow">
        <span class="oyl-eyebrow-bar" aria-hidden="true"></span>
        On your line
      </p>
      <p class="oyl-week">Wk {{ view.currentWeek }} · {{ view.dayLabel }}</p>
    </header>

    <div class="oyl-strip">
      <!-- Column 1: identity / rank -->
      <section class="oyl-cell oyl-cell-team" aria-label="Your team position">
        <p class="oyl-cell-label">Your team</p>
        <p class="oyl-cell-name">{{ view.teamName }}</p>
        <p class="oyl-cell-meta">
          <span class="oyl-rank">#{{ view.rank }}</span>
          <span class="oyl-sep">·</span>
          <span class="oyl-record">{{ view.record }}</span>
          <template v-if="view.streakLength > 0">
            <span class="oyl-sep">·</span>
            <span
              class="oyl-streak"
              :class="streakClass(view.streakType)"
            >{{ view.streakType }}{{ view.streakLength }}</span>
          </template>
        </p>
      </section>

      <!-- Column 2: this week's matchup -->
      <section v-if="view.matchup" class="oyl-cell oyl-cell-matchup" aria-label="This week's matchup">
        <p class="oyl-cell-label">This week</p>
        <p class="oyl-cell-name">vs {{ view.matchup.opponentName }}</p>
        <p class="oyl-cell-meta">
          <span class="oyl-score">{{ view.matchup.score }}</span>
          <span class="oyl-sep">·</span>
          <span class="oyl-projection" :class="projectionClass(view.matchup.winProbPct)">
            {{ view.matchup.winProbPct }}% to win
          </span>
        </p>
      </section>
      <section v-else class="oyl-cell oyl-cell-matchup oyl-cell-empty" aria-label="No active matchup">
        <p class="oyl-cell-label">This week</p>
        <p class="oyl-cell-name">No active matchup.</p>
        <p class="oyl-cell-meta oyl-meta-faint">The schedule resets soon.</p>
      </section>

      <!-- Column 3: what's at stake -->
      <section class="oyl-cell oyl-cell-stake" aria-label="What's at stake today">
        <p class="oyl-cell-label">At stake</p>
        <p class="oyl-cell-name">{{ view.stakeHeadline }}</p>
        <p class="oyl-cell-meta">{{ view.stakeDetail }}</p>
      </section>
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { CategoryLeagueData } from '@/editorial/types'

const props = defineProps<{
  /** Live league data. When null, the component renders nothing —
   *  the parent should not show ON YOUR LINE before data arrives. */
  data: CategoryLeagueData | null
}>()

interface OnYourLineView {
  currentWeek: number
  dayLabel: string
  teamName: string
  rank: number
  record: string
  streakType: 'W' | 'L' | 'T'
  streakLength: number
  matchup: {
    opponentName: string
    score: string
    winProbPct: number
    contestedCount: number
  } | null
  stakeHeadline: string
  stakeDetail: string
}

const view = computed<OnYourLineView | null>(() => {
  const data = props.data
  if (!data) return null

  const myTeam = data.teams.find((t) => t.isMyTeam)
  if (!myTeam) return null

  const myStanding = data.standings.find((s) => s.teamId === myTeam.id)
  if (!myStanding) return null

  // Day label — short, magazine-y. Mon · Jun 2 style.
  const now = new Date()
  const weekday = now.toLocaleDateString('en-US', { weekday: 'short' })
  const month = now.toLocaleDateString('en-US', { month: 'short' })
  const dayLabel = `${weekday} · ${month} ${now.getDate()}`

  const record = myStanding.catTies > 0
    ? `${myStanding.catWins}-${myStanding.catLosses}-${myStanding.catTies}`
    : `${myStanding.catWins}-${myStanding.catLosses}`

  // Current matchup
  const currentMatchup = (data.matchupsCurrentWeek ?? []).find(
    (m) => m.homeTeamId === myTeam.id || m.awayTeamId === myTeam.id,
  )

  let matchup: OnYourLineView['matchup'] = null
  if (currentMatchup) {
    const iAmHome = currentMatchup.homeTeamId === myTeam.id
    const opponentId = iAmHome ? currentMatchup.awayTeamId : currentMatchup.homeTeamId
    const opponent = data.teams.find((t) => t.id === opponentId)
    const myCats = iAmHome ? currentMatchup.homeCatWins : currentMatchup.awayCatWins
    const oppCats = iAmHome ? currentMatchup.awayCatWins : currentMatchup.homeCatWins
    const myProb = iAmHome ? currentMatchup.homeWinProb : currentMatchup.awayWinProb
    matchup = {
      opponentName: opponent?.name ?? 'opponent',
      score: `${myCats}-${oppCats}`,
      winProbPct: typeof myProb === 'number' ? Math.round(myProb * 100) : 50,
      contestedCount: currentMatchup.contestedCount,
    }
  }

  // Compute what's at stake — context-sensitive
  const cutoff = data.playoffCutoff ?? 0
  const distToCut = myStanding.rank - cutoff   // positive = below, negative = above
  const aboveCut = distToCut < 0
  const onCut = distToCut === 0
  const farBelowCut = distToCut > 2

  let stakeHeadline: string
  let stakeDetail: string

  if (matchup && matchup.winProbPct >= 90 && matchup.contestedCount === 0) {
    // Mathematically locked — no cats left to flip the result.
    stakeHeadline = "It's done."
    stakeDetail = `Locked at ${matchup.score}. The standings catch up Monday.`
  } else if (matchup && matchup.winProbPct >= 90) {
    stakeHeadline = 'Close it out.'
    stakeDetail = `The math has you at ${matchup.winProbPct}%. ${oppNameOrEm(matchup.opponentName)} needs a sweep of what's left to flip it.`
  } else if (matchup && matchup.winProbPct <= 25) {
    stakeHeadline = "You're chasing."
    stakeDetail = `Down to ${matchup.winProbPct}% on the projection. Win cats fast or the loss locks in.`
  } else if (matchup && Math.abs(matchup.winProbPct - 50) <= 10) {
    stakeHeadline = 'A coin flip.'
    stakeDetail = `${matchup.winProbPct}/${100 - matchup.winProbPct} on the projection. Every contested cat decides.`
  } else if (matchup && matchup.winProbPct > 50) {
    stakeHeadline = "You're in front."
    stakeDetail = `${matchup.winProbPct}% on the projection, but not put away. Hold the lead through the weekend.`
  } else if (matchup) {
    stakeHeadline = "Behind, but in it."
    stakeDetail = `${matchup.winProbPct}% on the projection. A two-cat swing puts the matchup back on the table.`
  } else if (myStanding.rank === 1) {
    stakeHeadline = "The top seed."
    stakeDetail = "No matchup live today. The lead's yours until somebody takes it."
  } else if (aboveCut) {
    stakeHeadline = "Holding the seat."
    stakeDetail = `${Math.abs(distToCut)} ${plural(Math.abs(distToCut), 'spot')} above the cut, with no active matchup.`
  } else if (onCut) {
    stakeHeadline = "On the cut line."
    stakeDetail = "Sitting right on the playoff line. Every cat next week matters."
  } else if (farBelowCut) {
    stakeHeadline = "Long way back."
    stakeDetail = `${distToCut} ${plural(distToCut, 'spot')} below the cut. The math gets tighter every week.`
  } else {
    stakeHeadline = "One spot from the cut."
    stakeDetail = "One climb up the standings reseats you inside the playoff line."
  }

  return {
    currentWeek: data.currentWeek,
    dayLabel,
    teamName: myTeam.name,
    rank: myStanding.rank,
    record,
    streakType: myStanding.streak.type,
    streakLength: myStanding.streak.length,
    matchup,
    stakeHeadline,
    stakeDetail,
  }
})

function plural(n: number, word: string): string {
  return n === 1 ? word : `${word}s`
}

/** Returns the opponent name unmodified — placeholder for future
 *  shortening logic (e.g., "the EH! Team" → "the EH!"). Right now
 *  Yahoo names are kept as-is. */
function oppNameOrEm(name: string): string {
  return name
}

function streakClass(type: 'W' | 'L' | 'T'): string {
  if (type === 'W') return 'oyl-streak-w'
  if (type === 'L') return 'oyl-streak-l'
  return 'oyl-streak-t'
}

function projectionClass(pct: number): string {
  if (pct >= 70) return 'oyl-projection-favored'
  if (pct <= 30) return 'oyl-projection-dog'
  return 'oyl-projection-even'
}
</script>

<style scoped>
/* No card frame — the "your team" zone reads as editorial real
 * estate inside the BEAT stack, not a recessed dashboard widget.
 * A top hairline anchors it; the three cells then carry the rhythm
 * with vertical dividers between them.
 *
 * Fills the full page content width (no internal max-width) so the
 * left edge aligns with the other editorial sections (TODAY'S BEATS,
 * STANDINGS, etc.) — the column rhythm of the magazine spread. */
.on-your-line {
  margin: 0 0 36px;
  padding: 22px 0 28px;
  border-top: 1px solid oklch(0.18 0.014 90);
  font-family: 'Barlow', sans-serif;
  color: var(--ink-1);
}

.oyl-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 14px;
}

/* Gold eyebrow — same hue as the "your team" star pin in standings,
 * so ON YOUR LINE reads visually as "your row, expanded." This is
 * also the cleanest way to differentiate it from the three magenta
 * eyebrows surrounding it (LEDE topic, STANDINGS, etc.). */
.oyl-eyebrow {
  margin: 0;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.74rem;
  font-weight: 800;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--accent-primary);
}
.oyl-eyebrow-bar {
  width: 22px; height: 2px;
  background: var(--accent-primary);
  display: inline-block;
}

.oyl-week {
  margin: 0;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.10em;
  text-transform: uppercase;
  color: var(--ink-4);
}

.oyl-strip {
  display: grid;
  grid-template-columns: 1fr 1.2fr 1.2fr;
  gap: 0;
  align-items: start;
}

.oyl-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 4px 24px;
}
/* First cell sits flush left; trailing cells get a vertical hairline
   on the leading edge so the three columns read as a magazine grid. */
.oyl-cell + .oyl-cell {
  border-left: 1px solid oklch(0.16 0.013 90);
}
.oyl-cell:first-child {
  padding-left: 0;
}
.oyl-cell:last-child {
  padding-right: 0;
}

.oyl-cell-label {
  margin: 0;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.66rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--ink-4);
}

.oyl-cell-name {
  margin: 0;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 1.05rem;
  font-weight: 700;
  letter-spacing: -0.005em;
  color: var(--ink-1);
}

.oyl-cell-meta {
  margin: 0;
  font-size: 0.86rem;
  font-weight: 500;
  color: var(--ink-3);
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.oyl-meta-faint {
  color: var(--ink-4);
}

.oyl-sep {
  color: var(--ink-5);
}

.oyl-rank {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  color: var(--ink-2);
  letter-spacing: -0.01em;
}

.oyl-record {
  font-variant-numeric: tabular-nums;
  color: var(--ink-2);
}

.oyl-streak {
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 0.74rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.02em;
}
.oyl-streak-w { background: oklch(0.32 0.10 145); color: oklch(0.92 0.04 145); }
.oyl-streak-l { background: oklch(0.32 0.08 25);  color: oklch(0.92 0.04 25);  }
.oyl-streak-t { background: oklch(0.30 0.02 90);  color: oklch(0.86 0.02 90);  }

.oyl-score {
  font-variant-numeric: tabular-nums;
  font-weight: 700;
  color: var(--ink-2);
}

.oyl-projection {
  font-variant-numeric: tabular-nums;
  font-weight: 600;
}
.oyl-projection-favored { color: oklch(0.80 0.12 145); }
.oyl-projection-dog     { color: oklch(0.75 0.10 25);  }
.oyl-projection-even    { color: var(--ink-3); }

.oyl-cell-empty .oyl-cell-name {
  color: var(--ink-3);
}

@media (max-width: 760px) {
  .oyl-strip {
    grid-template-columns: 1fr;
    gap: 14px;
  }
  .on-your-line {
    padding: 18px 0 22px;
  }
  /* On stacked single-column mobile, swap the vertical dividers for
     horizontal hairlines between cells. */
  .oyl-cell {
    padding: 12px 0 0;
  }
  .oyl-cell + .oyl-cell {
    border-left: 0;
    border-top: 1px solid oklch(0.16 0.013 90);
  }
  .oyl-cell:first-child {
    padding-left: 0;
    padding-top: 4px;
  }
  .oyl-cell:last-child {
    padding-right: 0;
  }
  .oyl-head {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }
}
</style>
