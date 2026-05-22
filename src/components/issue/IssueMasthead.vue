<template>
  <!-- Magazine masthead — persistent thin strip above the hero on
       every issue page. Establishes the publication framing: this
       isn't a dashboard, it's an issue of a magazine you're reading.
       Reads live issue context from useIssueStore (set by whichever
       view loaded the league); falls back to props for first-paint
       state when the store hasn't been populated yet. -->
  <div class="issue-masthead" role="banner">
    <div class="issue-masthead-inner">
      <div class="issue-masthead-rule" aria-hidden="true"></div>

      <p class="issue-masthead-brand">THE LEAGUE BEAT</p>

      <div class="issue-masthead-meta" v-if="meta">
        <span class="issue-masthead-sep" aria-hidden="true">·</span>
        <span>VOL. {{ meta.volume }}</span>
        <span class="issue-masthead-sep" aria-hidden="true">·</span>
        <span :class="{ 'issue-masthead-label': meta.issueLabel.kind === 'playoff' }">
          {{ meta.issueLabel.display }}
        </span>
        <span class="issue-masthead-sep" aria-hidden="true">·</span>
        <span>{{ meta.year }}</span>
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
import { useIssueStore } from '@/stores/issueState'

/** First-paint fallback — passed by the layout from the cached league
 *  row before the view's live adapter populates the store. */
const props = defineProps<{
  fallbackWeek?: number
  fallbackSeason?: number
  fallbackUpdated?: Date
}>()

const issueStore = useIssueStore()

const meta = computed(() => {
  // Prefer live store values; fall back to props from the layout's
  // cached league row when the view hasn't published yet.
  const week =
    issueStore.currentWeek ?? props.fallbackWeek ?? null
  const season =
    issueStore.currentSeason ??
    props.fallbackSeason ??
    new Date().getFullYear()
  const endWeek = issueStore.regularSeasonEndWeek ?? undefined
  const stage = issueStore.seasonStage ?? undefined

  if (week == null) return null

  return {
    volume: deriveVolume(season),
    year: season,
    issueLabel: deriveIssueLabel(week, endWeek, stage),
  }
})

const updatedLabel = computed(() => {
  const ts = issueStore.lastUpdated ?? props.fallbackUpdated
  if (!ts) return null
  return formatRelativeUpdated(ts)
})

/* ─────────────────────────────────────────────────────────────────
   Helpers
───────────────────────────────────────────────────────────────── */

/** Volume = season number since TLB launched (2026 = Vol. 1). */
function deriveVolume(season: number): number {
  return Math.max(1, season - 2025)
}

/** Issue label varies by season stage:
 *   - Regular season: "ISSUE 8"
 *   - Playoffs: "PLAYOFFS · ROUND 1" / "SEMIFINAL" / "CHAMPIONSHIP"
 *   - Off-season: "OFF SEASON · ISSUE 25" (continues the count)
 */
function deriveIssueLabel(
  week: number,
  endWeek: number | undefined,
  stage: string | undefined,
): { display: string; kind: 'regular' | 'playoff' | 'offseason' } {
  if (stage === 'playoffs' && endWeek != null) {
    const round = week - endWeek
    if (round === 1) return { display: 'PLAYOFFS · ROUND 1', kind: 'playoff' }
    if (round === 2) return { display: 'PLAYOFFS · SEMIFINAL', kind: 'playoff' }
    if (round >= 3) return { display: 'PLAYOFFS · CHAMPIONSHIP', kind: 'playoff' }
    return { display: `PLAYOFFS · ROUND ${round}`, kind: 'playoff' }
  }
  if (stage === 'offseason') {
    return { display: `OFF SEASON · ISSUE ${week}`, kind: 'offseason' }
  }
  return { display: `ISSUE ${week}`, kind: 'regular' }
}

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
 * Public helper — derive volume / issue / year shape from a
 * CategoryLeagueData snapshot. Same math the masthead uses
 * internally, exposed so any consumer that needs the shape can
 * call it without duplication. Useful when share cards or OG
 * images want to stamp the issue meta.
 */
import type { CategoryLeagueData } from '@/editorial/types'

export function deriveIssueMeta(data: CategoryLeagueData): {
  volume: number
  issueNumber: number
  year: number
} {
  const year = data.currentSeason || new Date().getFullYear()
  return {
    volume: Math.max(1, year - 2025),
    issueNumber: Math.max(1, data.currentWeek),
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
/* Playoff labels read magenta to flag the stage shift visually. */
.issue-masthead-label {
  color: oklch(0.70 0.27 350);
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
