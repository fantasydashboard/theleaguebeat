<template>
  <!--
    DivisionRace — two-column division comparison.
    Fires for division-race-tight, division-locked-up,
    division-rival-streak, cross-division-power-shift,
    divisional-wild-card-implication, division-lead-change.

    Layout: an eyebrow + headline at the top, then either two side-by-
    side division columns (leader + runner-up per division) or a
    single zoomed-in division. Stakes line at the bottom.

    Graceful fallback: when `data.divisions` is missing or has fewer
    than 2 entries, render an informational placeholder instead of
    crashing or pretending divisions exist.
  -->
  <section
    class="dr"
    :aria-labelledby="`dr-headline-${componentId}`"
  >
    <header class="dr-head">
      <p class="dr-eyebrow">
        <span class="dr-eyebrow-bar" aria-hidden="true"></span>
        {{ eyebrow }}
      </p>
      <h2 class="dr-headline" :id="`dr-headline-${componentId}`">{{ headline }}</h2>
    </header>

    <!-- Happy path: we have at least one division to render. -->
    <div v-if="columns.length" class="dr-columns" :class="{ 'dr-columns-single': columns.length === 1 }">
      <article
        v-for="col in columns"
        :key="col.divisionId"
        class="dr-col"
        :class="{ 'dr-col-focus': col.focus }"
      >
        <header class="dr-col-head">
          <p class="dr-col-name">{{ col.divisionName }}</p>
          <p v-if="col.label" class="dr-col-label">{{ col.label }}</p>
        </header>

        <div v-if="col.leader" class="dr-row dr-row-leader">
          <span class="dr-rank">1</span>
          <div
            class="dr-avatar"
            :style="{ background: `linear-gradient(135deg, ${col.leader.avatarColor})` }"
          >
            <img v-if="col.leader.avatarUrl" :src="col.leader.avatarUrl" class="dr-avatar-img" alt="" />
            <span v-else>{{ col.leader.ownerInitials }}</span>
          </div>
          <div class="dr-team-meta">
            <p class="dr-team-name">{{ col.leader.name }}</p>
            <p v-if="col.leaderRecord" class="dr-team-record">{{ col.leaderRecord }}</p>
          </div>
        </div>

        <div v-if="col.challenger" class="dr-row dr-row-challenger">
          <span class="dr-rank">2</span>
          <div
            class="dr-avatar dr-avatar-dim"
            :style="{ background: `linear-gradient(135deg, ${col.challenger.avatarColor})` }"
          >
            <img v-if="col.challenger.avatarUrl" :src="col.challenger.avatarUrl" class="dr-avatar-img" alt="" />
            <span v-else>{{ col.challenger.ownerInitials }}</span>
          </div>
          <div class="dr-team-meta">
            <p class="dr-team-name">{{ col.challenger.name }}</p>
            <p v-if="col.challengerRecord" class="dr-team-record">{{ col.challengerRecord }}</p>
          </div>
        </div>

        <p v-if="col.gap" class="dr-gap">{{ col.gap }}</p>
      </article>
    </div>

    <!-- Fallback: league has no division metadata. -->
    <div v-else class="dr-empty" role="note">
      <p class="dr-empty-headline">Division data unavailable for this league.</p>
      <p class="dr-empty-body">The platform did not expose divisions for this season.</p>
    </div>

    <p v-if="stakes" class="dr-stakes">{{ stakes }}</p>

    <button
      type="button"
      class="issue-section-share"
      :aria-label="`Share ${story.type} story to your league chat`"
      @click="emit('share', story)"
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
        <polyline points="16 6 12 2 8 6"/>
        <line x1="12" y1="2" x2="12" y2="15"/>
      </svg>
      Share
    </button>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { SelectedStory } from '@/editorial/detection/types'
import type {
  CategoryLeagueData,
  CategoryLeagueDataTeam,
} from '@/editorial/types'

const props = defineProps<{
  story: SelectedStory
  data?: CategoryLeagueData
}>()

const emit = defineEmits<{ (e: 'share', story: SelectedStory): void }>()

const componentId = Math.random().toString(36).slice(2, 8)

const ctx = computed(() => props.story.context as Record<string, unknown>)

const eyebrow = computed(() => {
  switch (props.story.type) {
    case 'division-race-tight':            return 'Division race'
    case 'division-locked-up':             return 'Division clinched'
    case 'division-rival-streak':          return 'Division streaks'
    case 'cross-division-power-shift':     return 'Power shift'
    case 'divisional-wild-card-implication': return 'Wild card watch'
    case 'division-lead-change':           return 'Division flip'
    default:                               return 'Division race'
  }
})

const headline = computed(() => {
  switch (props.story.type) {
    case 'division-race-tight':            return 'Two teams. One division. No daylight.'
    case 'division-locked-up':             return 'Division put away.'
    case 'division-rival-streak':          return 'Two streaks. One division.'
    case 'cross-division-power-shift':     return 'One division pulled ahead.'
    case 'divisional-wild-card-implication': return 'The wild card is in play.'
    case 'division-lead-change':           return 'New leader in the division.'
    default:                               return 'The division race tightens.'
  }
})

/** Find the team record (the standing row for the rank+record). */
function recordFor(teamId: string | undefined): string | null {
  if (!teamId) return null
  const row = props.data?.standings.find((s) => s.teamId === teamId)
  if (!row) return null
  return `${row.catWins}-${row.catLosses}-${row.catTies}`
}

function teamFor(teamId: string | undefined): CategoryLeagueDataTeam | null {
  if (!teamId) return null
  return props.data?.teams.find((t) => t.id === teamId) ?? null
}

/** A single column in the rendered grid. */
interface Column {
  divisionId: string
  divisionName: string
  label?: string                // e.g. "Leading division"
  leader: CategoryLeagueDataTeam | null
  challenger: CategoryLeagueDataTeam | null
  leaderRecord: string | null
  challengerRecord: string | null
  gap: string | null            // 1-line gap description
  focus: boolean                // true = highlight this column
}

/** Build the column set. Strategy:
 *   - If `data.divisions` exists, group standings by division and pick
 *     top two per division.
 *   - For cross-division stories, focus the leading division and
 *     include the trailing one for contrast.
 *   - For single-division stories (lead change, race-tight, etc.),
 *     focus only that division.
 *   - When divisions are missing entirely, return [] and let the
 *     template show the fallback. */
const columns = computed<Column[]>(() => {
  const data = props.data
  if (!data) return []
  const divisions = data.divisions ?? []
  if (divisions.length < 2) {
    // We require at least two divisions for the comparison to read.
    // A one-division league does not have a real "race" to show.
    return []
  }

  /** Group standings rows by their team's divisionId. */
  const teamDivision = new Map<string, string | undefined>()
  for (const t of data.teams) teamDivision.set(t.id, t.divisionId)

  const groups = new Map<string, { teamId: string; rank: number; catWins: number; catLosses: number; catTies: number; winPct: number }[]>()
  for (const s of data.standings) {
    const divId = teamDivision.get(s.teamId)
    if (!divId) continue
    if (!groups.has(divId)) groups.set(divId, [])
    groups.get(divId)!.push({
      teamId: s.teamId,
      rank: s.rank,
      catWins: s.catWins,
      catLosses: s.catLosses,
      catTies: s.catTies,
      winPct: s.winPct,
    })
  }
  // Sort each group by best record first.
  for (const rows of groups.values()) {
    rows.sort((a, b) => b.winPct - a.winPct || b.catWins - a.catWins)
  }

  /** Resolve which divisions to render. */
  const c = ctx.value
  const focusOneId = typeof c.divisionId === 'string' ? c.divisionId : null
  const leadingDivId  = typeof c.leadingDivisionId === 'string'  ? c.leadingDivisionId  : null
  const trailingDivId = typeof c.trailingDivisionId === 'string' ? c.trailingDivisionId : null

  let renderIds: string[]
  if (props.story.type === 'cross-division-power-shift' && leadingDivId && trailingDivId) {
    renderIds = [leadingDivId, trailingDivId]
  } else if (focusOneId) {
    // Single-division focus + one comparison column from the next-best
    // division so the reader has context.
    const others = divisions.map((d) => d.id).filter((id) => id !== focusOneId)
    renderIds = [focusOneId, ...others.slice(0, 1)]
  } else {
    // No specific division called out — render up to two divisions.
    renderIds = divisions.slice(0, 2).map((d) => d.id)
  }

  const cols: Column[] = []
  for (const divId of renderIds) {
    const divMeta = divisions.find((d) => d.id === divId)
    if (!divMeta) continue
    const rows = groups.get(divId) ?? []
    const leaderRow = rows[0]
    const challengerRow = rows[1]

    cols.push({
      divisionId: divId,
      divisionName: divMeta.name,
      label: labelForColumn(divId, leadingDivId, trailingDivId, focusOneId),
      leader: leaderRow ? teamFor(leaderRow.teamId) : null,
      challenger: challengerRow ? teamFor(challengerRow.teamId) : null,
      leaderRecord: leaderRow ? recordFor(leaderRow.teamId) : null,
      challengerRecord: challengerRow ? recordFor(challengerRow.teamId) : null,
      gap: gapForColumn(leaderRow, challengerRow),
      focus: divId === focusOneId || divId === leadingDivId,
    })
  }
  return cols
})

function labelForColumn(
  divId: string,
  leadingDivId: string | null,
  trailingDivId: string | null,
  focusOneId: string | null,
): string | undefined {
  if (props.story.type === 'cross-division-power-shift') {
    if (divId === leadingDivId)  return 'Leading'
    if (divId === trailingDivId) return 'Trailing'
  }
  if (focusOneId && divId === focusOneId) return 'Focus'
  return undefined
}

function gapForColumn(
  leader: { catWins: number; winPct: number } | undefined,
  challenger: { catWins: number; winPct: number } | undefined,
): string | null {
  if (!leader || !challenger) return null
  const catGap = leader.catWins - challenger.catWins
  if (catGap > 0) return `+${catGap} cat win${catGap === 1 ? '' : 's'} ahead`
  if (catGap === 0) return 'Even on cat wins'
  return null
}

/** One-line stakes summary under the columns. */
const stakes = computed<string | null>(() => {
  const c = ctx.value
  switch (props.story.type) {
    case 'division-race-tight': {
      const gap = typeof c.winPctGap === 'number' ? c.winPctGap : null
      if (gap != null) return `Win percentage gap inside .${Math.round(gap * 1000)}. Either team can take the lead this week.`
      return 'Either team can take the lead this week.'
    }
    case 'division-locked-up': {
      const surplus = typeof c.catSurplus === 'number' ? c.catSurplus : null
      const wks = typeof c.weeksRemaining === 'number' ? c.weeksRemaining : null
      if (surplus != null && wks != null) return `${surplus} cat wins ahead with ${wks} to play. The math is closed.`
      return 'The math is closed in the division.'
    }
    case 'division-rival-streak':
      return 'Two division mates running streaks at the same time.'
    case 'cross-division-power-shift': {
      const gap = typeof c.gap === 'number' ? c.gap : null
      if (gap != null) return `Win percentage gap of .${Math.round(gap * 1000)} between the leading and trailing divisions.`
      return 'One division has separated from the other.'
    }
    case 'divisional-wild-card-implication':
      return 'The non-leader inside the division is making the wild card race.'
    case 'division-lead-change':
      return 'A new team owns the top of the division this week.'
    default:
      return null
  }
})
</script>

<style scoped>
.dr {
  --ink-1: oklch(0.97 0.005 90);
  --ink-2: oklch(0.78 0.008 90);
  --ink-3: oklch(0.55 0.010 90);
  --ink-4: oklch(0.32 0.012 90);
  --accent-primary:   oklch(0.78 0.18 92);
  --accent-secondary: oklch(0.70 0.27 350);
  --accent-tertiary:  oklch(0.72 0.18 195);

  position: relative;
  padding: 26px 26px 22px;
  border: 1px solid oklch(0.20 0.015 90);
  border-radius: 20px;
  background: oklch(0.10 0.015 90);
  font-family: 'Barlow', sans-serif;
  color: var(--ink-1);
}

.dr-head { margin-bottom: 18px; }
.dr-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.74rem;
  font-weight: 800;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--accent-primary);
  margin: 0 0 10px;
}
.dr-eyebrow-bar {
  width: 22px;
  height: 1px;
  background: var(--accent-primary);
}
.dr-headline {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: clamp(1.5rem, 2.8vw, 2.05rem);
  line-height: 1.02;
  letter-spacing: -0.01em;
  color: var(--ink-1);
  margin: 0;
  overflow-wrap: anywhere;
}

.dr-columns {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}
.dr-columns-single { grid-template-columns: 1fr; }

.dr-col {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 16px 16px 14px;
  border-radius: 14px;
  background: oklch(0.13 0.015 90);
  border: 1px solid oklch(0.18 0.015 90);
}
.dr-col-focus {
  /* Subtle gold rail on the focused/leading column. */
  border-color: oklch(0.78 0.18 92 / 0.35);
  background:
    linear-gradient(180deg, oklch(0.78 0.18 92 / 0.04), transparent 70%),
    oklch(0.13 0.015 90);
}

.dr-col-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 2px;
}
.dr-col-name {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: 0.95rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--ink-1);
  margin: 0;
}
.dr-col-label {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.66rem;
  font-weight: 800;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--accent-primary);
  margin: 0;
}

.dr-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 4px;
  border-radius: 8px;
}
.dr-row-leader {
  background: oklch(0.18 0.015 90 / 0.6);
}
.dr-rank {
  width: 18px;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: 0.88rem;
  color: var(--ink-3);
  text-align: center;
}
.dr-row-leader .dr-rank { color: var(--ink-1); }

.dr-avatar {
  width: 36px;
  height: 36px;
  border-radius: 9px;
  display: grid;
  place-items: center;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: 0.76rem;
  letter-spacing: 0.02em;
  color: oklch(0.12 0.012 90);
  overflow: hidden;
  flex-shrink: 0;
}
.dr-avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.dr-avatar-dim {
  opacity: 0.7;
  filter: saturate(0.85);
}

.dr-team-meta { min-width: 0; flex: 1; }
.dr-team-name {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: 0.95rem;
  letter-spacing: 0.02em;
  color: var(--ink-1);
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.dr-team-record {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.74rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: var(--ink-3);
  margin: 0;
}

.dr-gap {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.10em;
  text-transform: uppercase;
  color: var(--ink-3);
  margin: 4px 0 0;
  text-align: right;
}

.dr-empty {
  padding: 18px 18px;
  border-radius: 12px;
  background: oklch(0.13 0.015 90);
  border: 1px dashed oklch(0.22 0.015 90);
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.dr-empty-headline {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: 0.92rem;
  letter-spacing: 0.04em;
  color: var(--ink-2);
  margin: 0;
}
.dr-empty-body {
  font-size: 0.86rem;
  line-height: 1.5;
  color: var(--ink-3);
  margin: 0;
}

.dr-stakes {
  margin: 16px 0 0;
  font-size: 0.94rem;
  line-height: 1.55;
  color: var(--ink-2);
}

@media (max-width: 540px) {
  .dr { padding: 22px 18px 18px; border-radius: 16px; }
  .dr-columns { grid-template-columns: 1fr; }
  .dr-team-name { max-width: 100%; }
}
@media (max-width: 380px) {
  .dr { padding: 18px 14px 16px; }
  .dr-col { padding: 14px 12px 12px; }
}

.issue-section-share {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  margin-top: 18px;
  border-radius: 999px;
  background: transparent;
  border: 1px solid oklch(0.32 0.012 90);
  color: oklch(0.97 0.005 90);
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.10em;
  text-transform: uppercase;
  cursor: pointer;
  transition: border-color 140ms cubic-bezier(0.22, 1, 0.36, 1),
              background-color 140ms cubic-bezier(0.22, 1, 0.36, 1);
}
@media (hover: hover) and (pointer: fine) {
  .issue-section-share:hover {
    border-color: oklch(0.55 0.010 90);
    background: oklch(0.14 0.018 90);
  }
}
.issue-section-share:active { transform: scale(0.97); }
</style>
