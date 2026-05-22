<template>
  <!-- Magazine masthead — persistent thin strip above the hero on
       every issue page. Establishes the publication framing: this
       isn't a dashboard, it's an issue of a magazine you're reading.
       Renders inside the layout so it persists across home / power
       rankings / matchups / draft / history. -->
  <div class="issue-masthead" role="banner">
    <div class="issue-masthead-inner">
      <div class="issue-masthead-rule" aria-hidden="true"></div>

      <p class="issue-masthead-brand">THE LEAGUE BEAT</p>

      <div class="issue-masthead-meta" v-if="issue">
        <span class="issue-masthead-sep" aria-hidden="true">·</span>
        <span>VOL. {{ issue.volume }}</span>
        <span class="issue-masthead-sep" aria-hidden="true">·</span>
        <span>ISSUE {{ issue.issueNumber }}</span>
        <span class="issue-masthead-sep" aria-hidden="true">·</span>
        <span>WEEK {{ issue.weekNumber }}</span>
        <span class="issue-masthead-sep" aria-hidden="true">·</span>
        <span>{{ issue.year }}</span>
        <span
          v-if="updatedLabel"
          class="issue-masthead-meta-dim"
        >
          <span class="issue-masthead-sep" aria-hidden="true">·</span>
          <span>UPDATED {{ updatedLabel }}</span>
        </span>
      </div>

      <div class="issue-masthead-rule" aria-hidden="true"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

/**
 * Issue metadata for the masthead. All fields are derived from the
 * league + season state — see the helper `deriveIssueMeta` exported
 * below so any layout/view can produce the same shape.
 */
export interface IssueMeta {
  /** Year-of-publication relative to the brand epoch (TLB started
   *  shipping in 2026 → that's Vol 1). */
  volume: number
  /** Sequential issue number within this volume — equals the current
   *  matchup week of the active league. */
  issueNumber: number
  /** Matchup week for the active league, shown alongside the issue
   *  number for sports-context legibility. */
  weekNumber: number
  /** Calendar year of the season. */
  year: number
}

const props = defineProps<{
  /** Pre-computed issue metadata. Layouts derive this from their
   *  active league and pass it down. */
  issue?: IssueMeta
  /** Optional last-updated timestamp for the "UPDATED X AGO" line.
   *  If omitted the meta line skips the updated chunk entirely. */
  lastUpdated?: Date
}>()

const updatedLabel = computed(() => {
  if (!props.lastUpdated) return null
  return formatRelativeUpdated(props.lastUpdated)
})

/** Format "1 MIN AGO" / "11 MIN AGO" / "3 HRS AGO" / "TODAY" /
 *  "YESTERDAY" — short, all-caps, magazine register. */
function formatRelativeUpdated(date: Date): string {
  const now = Date.now()
  const diffMs = now - date.getTime()
  const diffMin = Math.round(diffMs / (1000 * 60))
  if (diffMin < 1) return 'JUST NOW'
  if (diffMin < 60) return `${diffMin} MIN AGO`
  const diffHr = Math.round(diffMin / 60)
  if (diffHr < 24) return `${diffHr} HR AGO`
  const diffDay = Math.round(diffHr / 24)
  if (diffDay === 1) return 'YESTERDAY'
  if (diffDay < 7) return `${diffDay} DAYS AGO`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase()
}
</script>

<script lang="ts">
/**
 * Pure helper — derive issue metadata from a CategoryLeagueData
 * snapshot. Lives alongside the component so both the layout and
 * any view that needs the same shape can call it without duplicating
 * the math.
 *
 * Volume math: 2026 is Vol 1; each subsequent year increments by 1.
 */
import type { CategoryLeagueData } from '@/editorial/types'

export function deriveIssueMeta(data: CategoryLeagueData): {
  volume: number
  issueNumber: number
  weekNumber: number
  year: number
} {
  const year = data.currentSeason || new Date().getFullYear()
  return {
    volume: Math.max(1, year - 2025),
    issueNumber: Math.max(1, data.currentWeek),
    weekNumber: Math.max(1, data.currentWeek),
    year,
  }
}
</script>

<style scoped>
.issue-masthead {
  background: oklch(0.06 0.014 90);
  border-bottom: 1px solid oklch(0.16 0.015 90);
  padding: 12px 24px;
}
.issue-masthead-inner {
  max-width: 1280px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  gap: 14px;
  font-family: 'Barlow Condensed', sans-serif;
}
.issue-masthead-rule {
  flex: 1;
  height: 1px;
  background: linear-gradient(
    90deg,
    transparent,
    oklch(0.78 0.18 92 / 0.45) 30%,
    oklch(0.78 0.18 92 / 0.45) 70%,
    transparent
  );
  min-width: 24px;
}
.issue-masthead-brand {
  margin: 0;
  font-family: 'Barlow', sans-serif;
  font-weight: 900;
  font-size: 0.95rem;
  letter-spacing: 0.06em;
  color: oklch(0.97 0.005 90);
  white-space: nowrap;
}
.issue-masthead-meta {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: oklch(0.55 0.010 90);
  white-space: nowrap;
}
.issue-masthead-meta-dim {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: oklch(0.45 0.010 90);
}
.issue-masthead-sep {
  color: oklch(0.78 0.18 92 / 0.55);
}

@media (max-width: 720px) {
  .issue-masthead { padding: 10px 16px; }
  .issue-masthead-meta {
    font-size: 0.72rem;
    letter-spacing: 0.12em;
    gap: 6px;
  }
  /* On mobile, drop the dim "updated X ago" chunk so the masthead
     stays on a single line. */
  .issue-masthead-meta-dim { display: none; }
  .issue-masthead-rule { display: none; }
}
</style>
