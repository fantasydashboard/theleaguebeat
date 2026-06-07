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
          v-if="freshnessLabel"
          class="issue-masthead-meta-dim"
        >
          <span class="issue-masthead-sep" aria-hidden="true">·</span>
          <span>{{ freshnessLabel }}</span>
        </span>
      </div>

      <div class="issue-masthead-rule" aria-hidden="true"></div>

      <!-- Page-level share — single button that hands the recipient
           the whole issue, not just one story. Only renders for
           live league routes (where a /i/:uuid URL exists). -->
      <button
        v-if="shareUrl"
        type="button"
        class="issue-masthead-share"
        :class="{ 'issue-masthead-share-copied': copied }"
        :aria-label="copied ? 'Issue link copied' : 'Share this issue'"
        @click="onShareIssue"
      >
        <svg
          v-if="!copied"
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.4"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
          <polyline points="16 6 12 2 8 6"/>
          <line x1="12" y1="2" x2="12" y2="15"/>
        </svg>
        <svg
          v-else
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="3"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <polyline points="20 6 9 17 4 12"/>
        </svg>
        {{ copied ? 'Link copied' : 'Share issue' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useIssueStore } from '@/stores/issueState'

/** First-paint fallback — passed by the layout from the cached league
 *  row before the view's live adapter populates the store. */
const props = defineProps<{
  fallbackWeek?: number
  fallbackSeason?: number
  fallbackUpdated?: Date
  /** Earliest known season for this league — drives the volume
   *  number. Pre-computed in the layout from the leaguesStore so
   *  the masthead reads correctly before any view publishes. */
  fallbackFoundedSeason?: number
  /** Supabase `leagues.id` UUID for the active league. Drives the
   *  page-level share URL. When omitted (demo route, unauthenticated
   *  visitor) the share button is hidden. */
  leagueId?: string
  /** When true, the masthead displays the most-recently-PUBLISHED
   *  issue (the in-progress week minus 1) rather than the in-progress
   *  week itself. The new Issue page sets this so the masthead and
   *  the page title agree. Other routes leave it false. */
  showPublishedIssue?: boolean
}>()

const issueStore = useIssueStore()
const route = useRoute()

const meta = computed(() => {
  // Prefer live store; fall back to props from the layout's cached
  // league row when the view hasn't published yet. When
  // `showPublishedIssue` is set, subtract 1 — the new Issue page
  // displays the just-published issue (currentWeek - 1), not the
  // in-progress week. When the URL specifies an explicit archived
  // issue (`/the-issue/:weekNumber`), trust that over the computed
  // latest so the masthead agrees with the page being read.
  const rawWeek =
    issueStore.currentWeek ?? props.fallbackWeek ?? null
  let week: number | null
  if (rawWeek == null) {
    week = null
  } else if (props.showPublishedIssue) {
    const archived = route.params.weekNumber
    if (typeof archived === 'string' && archived.length > 0) {
      const parsed = parseInt(archived, 10)
      week = Number.isFinite(parsed) && parsed >= 1
        ? parsed
        : Math.max(1, rawWeek - 1)
    } else {
      week = Math.max(1, rawWeek - 1)
    }
  } else {
    week = rawWeek
  }
  const season =
    issueStore.currentSeason ??
    props.fallbackSeason ??
    new Date().getFullYear()
  const endWeek = issueStore.regularSeasonEndWeek ?? undefined
  const stage = issueStore.seasonStage ?? undefined
  // Founded season — earliest known season for this league. When
  // unknown, defaults to current season (giving Vol. 1).
  const founded =
    issueStore.leagueFoundedSeason ??
    props.fallbackFoundedSeason ??
    season

  if (week == null) return null

  return {
    volume: deriveVolume(season, founded),
    year: season,
    issueLabel: deriveIssueLabel(week, endWeek, stage),
  }
})

const updatedLabel = computed(() => {
  const ts = issueStore.lastUpdated ?? props.fallbackUpdated
  if (!ts) return null
  return formatRelativeUpdated(ts)
})

/** The freshness label respects the surface's metabolism. The Issue
 *  is a frozen, weekly artifact — "PUBLISHED MON, MMM D" is honest
 *  *and* specific. The Beat and other live surfaces use the relative
 *  "UPDATED X AGO" timestamp.
 *
 *  Publish day for the most-recently-published issue is "the Monday
 *  on or before now". Derived rather than stored, since V0 doesn't
 *  yet persist real publish timestamps. */
const PUBLISHED_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
function mostRecentMonday(now: Date): Date {
  const d = new Date(now)
  const day = d.getDay()
  const back = day === 0 ? 6 : day - 1
  d.setDate(d.getDate() - back)
  d.setHours(11, 0, 0, 0)
  return d
}
const freshnessLabel = computed<string | null>(() => {
  if (props.showPublishedIssue) {
    const publishDate = mostRecentMonday(new Date())
    const m = PUBLISHED_MONTHS[publishDate.getMonth()]
    const d = publishDate.getDate()
    return `PUBLISHED MON, ${m.toUpperCase()} ${d}`
  }
  if (!updatedLabel.value) return null
  return `UPDATED ${updatedLabel.value}`
})

/* ─────────────────────────────────────────────────────────────────
   Page-level share — builds the public /i/:uuid URL and tries the
   native share sheet first, falling back to clipboard copy with a
   transient "Link copied" confirmation on the button.
───────────────────────────────────────────────────────────────── */

const copied = ref(false)

const shareUrl = computed(() => {
  if (!props.leagueId || typeof window === 'undefined') return null
  return `${window.location.origin}/i/${props.leagueId}`
})

async function onShareIssue() {
  const url = shareUrl.value
  if (!url) return

  const shareData = {
    title: 'The League Beat',
    text: "This week's issue of our league magazine.",
    url,
  }

  // Prefer the native share sheet — pops the iOS/Android sheet so
  // recipients land in iMessage/WhatsApp/Discord in two taps.
  if (
    typeof navigator !== 'undefined' &&
    typeof navigator.share === 'function'
  ) {
    try {
      await navigator.share(shareData)
      return
    } catch (err) {
      // User canceled — treat as success, don't fall through to
      // the clipboard copy. Other errors do fall through.
      if ((err as Error).name === 'AbortError') return
      console.warn('[IssueMasthead] navigator.share failed:', err)
    }
  }

  // Desktop / fallback: copy the URL + show the "Link copied"
  // confirmation. Auto-revert after 1.8s.
  try {
    await navigator.clipboard.writeText(url)
    copied.value = true
    setTimeout(() => { copied.value = false }, 1800)
  } catch (err) {
    console.warn('[IssueMasthead] clipboard write failed:', err)
  }
}

/* ─────────────────────────────────────────────────────────────────
   Helpers
───────────────────────────────────────────────────────────────── */

/** Volume = number of seasons this league has run in TLB. Vol. 1 in
 *  the league's first known season; increments by one each subsequent
 *  season we have data for. Only counts seasons the user has actually
 *  connected — we understate rather than fabricate league age. */
function deriveVolume(season: number, founded: number): number {
  return Math.max(1, season - founded + 1)
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

export function deriveIssueMeta(
  data: CategoryLeagueData,
  /** Optional earliest known season for the league. Defaults to
   *  the data's currentSeason if unknown (Vol. 1). */
  foundedSeason?: number,
): {
  volume: number
  issueNumber: number
  year: number
} {
  const year = data.currentSeason || new Date().getFullYear()
  const founded = foundedSeason ?? year
  return {
    volume: Math.max(1, year - founded + 1),
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

/* Share-this-issue button — hugs the right edge of the masthead. */
.issue-masthead-share {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 999px;
  background: transparent;
  border: 1px solid oklch(0.32 0.012 90);
  color: oklch(0.97 0.005 90);
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.74rem;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
  transition: border-color 140ms cubic-bezier(0.22, 1, 0.36, 1),
              background-color 140ms cubic-bezier(0.22, 1, 0.36, 1),
              color 140ms cubic-bezier(0.22, 1, 0.36, 1);
}
@media (hover: hover) and (pointer: fine) {
  .issue-masthead-share:hover {
    border-color: oklch(0.78 0.18 92);
    color: oklch(0.78 0.18 92);
  }
}
.issue-masthead-share:active { transform: scale(0.97); }
.issue-masthead-share-copied {
  border-color: oklch(0.74 0.18 145);
  color: oklch(0.74 0.18 145);
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
