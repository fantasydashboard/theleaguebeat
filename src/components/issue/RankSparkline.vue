<template>
  <!--
    RANK SPARKLINE — small SVG line chart showing team rank over the
    season. Focus teams render as bold tone-colored lines with an
    endpoint dot + rank label. All other teams render as muted grey
    background lines so the focus team(s) read against the league
    context. Plays the role of "the image" on covers where we don't
    have art, by turning the story itself (rank trajectory) into
    visual proof.

    Used inline in HeroFaceoff (both teams highlighted) and HeroSolo
    (single team, when no avatar image is available). Editorial, not
    decorative — the line literally shows the story.
  -->
  <svg
    :viewBox="`0 0 ${VB_W} ${VB_H_TOTAL}`"
    :class="['rank-spark', { 'rank-spark-logos': endpointLogos }]"
    role="img"
    :aria-label="ariaLabel ?? 'Team rank trajectory'"
    preserveAspectRatio="xMidYMid meet"
  >
    <!-- Horizontal grid: #1 (top), middle, last (bottom). Dashed +
         subtle; provides reference without competing with the lines. -->
    <g class="rank-spark-grid" aria-hidden="true">
      <line :x1="PAD_X" :y1="0" :x2="VB_W - PAD_X" :y2="0"/>
      <line :x1="PAD_X" :y1="VB_H_PLOT / 2" :x2="VB_W - PAD_X" :y2="VB_H_PLOT / 2"/>
      <line :x1="PAD_X" :y1="VB_H_PLOT" :x2="VB_W - PAD_X" :y2="VB_H_PLOT"/>
    </g>

    <!-- Background lines: every non-focus team, in muted grey. Reads
         as the league context behind the highlighted teams. -->
    <path
      v-for="line in backgroundLines"
      :key="`bg-${line.id}`"
      :d="line.d"
      class="rank-spark-bg"
    />

    <!-- Focus lines: the highlighted teams, in tone color, thicker. -->
    <path
      v-for="line in focusLines"
      :key="`fg-${line.id}`"
      :d="line.d"
      :stroke="line.color"
      class="rank-spark-fg"
    />

    <!-- Circular clip paths for the endpoint logos. -->
    <defs>
      <clipPath
        v-for="(line, i) in focusLines"
        :id="`rsf-clip-${i}`"
        :key="`rsfc-${i}`"
      >
        <circle :cx="line.lastX" :cy="line.lastY" :r="FOCUS_R" />
      </clipPath>
      <template v-if="endpointLogos">
        <clipPath
          v-for="(line, i) in backgroundLines"
          :id="`rsb-clip-${i}`"
          :key="`rsbc-${i}`"
        >
          <circle :cx="line.lastX" :cy="line.lastY" :r="FIELD_R" />
        </clipPath>
      </template>
    </defs>

    <!-- Field endpoints — a small logo for every other team so the
         pack is identifiable, not anonymous. Renders under the focus
         medallions. Only when endpointLogos is on. -->
    <g v-if="endpointLogos" class="rank-spark-field-ends" aria-hidden="true">
      <g v-for="(line, i) in backgroundLines" :key="`bgend-${line.id}`">
        <circle
          :cx="line.lastX"
          :cy="line.lastY"
          :r="FIELD_R"
          fill="oklch(0.18 0.012 90)"
          stroke="oklch(0.36 0.012 90)"
          stroke-width="1"
        />
        <image
          v-if="line.avatarUrl"
          :href="line.avatarUrl"
          :x="line.lastX - FIELD_R"
          :y="line.lastY - FIELD_R"
          :width="FIELD_R * 2"
          :height="FIELD_R * 2"
          :clip-path="`url(#rsb-clip-${i})`"
          preserveAspectRatio="xMidYMid slice"
        />
        <text
          v-else
          :x="line.lastX"
          :y="line.lastY + 3"
          text-anchor="middle"
          class="rank-spark-end-initials"
        >{{ line.initials }}</text>
      </g>
    </g>

    <!-- Focus endpoints — logo medallion + tone ring + rank, or a
         plain tone dot when endpointLogos is off (hero usage). -->
    <g v-for="(line, i) in focusLines" :key="`end-${line.id}`">
      <template v-if="endpointLogos">
        <circle :cx="line.lastX" :cy="line.lastY" :r="FOCUS_R" :fill="line.color" />
        <image
          v-if="line.avatarUrl"
          :href="line.avatarUrl"
          :x="line.lastX - FOCUS_R"
          :y="line.lastY - FOCUS_R"
          :width="FOCUS_R * 2"
          :height="FOCUS_R * 2"
          :clip-path="`url(#rsf-clip-${i})`"
          preserveAspectRatio="xMidYMid slice"
        />
        <text
          v-else
          :x="line.lastX"
          :y="line.lastY + 5"
          text-anchor="middle"
          class="rank-spark-end-initials rank-spark-end-initials-focus"
        >{{ line.initials }}</text>
        <circle
          :cx="line.lastX"
          :cy="line.lastY"
          :r="FOCUS_R + 3"
          :stroke="line.color"
          stroke-width="2.5"
          fill="none"
        />
      </template>
      <template v-else>
        <circle :cx="line.lastX" :cy="line.lastY" r="7" :fill="line.color" />
        <circle :cx="line.lastX" :cy="line.lastY" r="11" :stroke="line.color" stroke-width="1.5" fill="none" opacity="0.4" />
      </template>

      <!-- Endpoint label — rank-only or full name per the labels prop. -->
      <text
        v-if="(labels ?? 'name') !== 'none'"
        :x="endpointLogos ? line.lastX + FOCUS_R + 9 : line.labelX"
        :y="line.labelY"
        :fill="line.color"
        :text-anchor="endpointLogos ? 'start' : line.labelAnchor"
        class="rank-spark-team"
      ><template v-if="(labels ?? 'name') === 'rank'">#{{ line.lastRank }}</template><template v-else>{{ line.teamName }} <tspan class="rank-spark-team-rank">#{{ line.lastRank }}</tspan></template></text>
    </g>

    <!-- Axis labels: rank scale on the left, week numbers below. -->
    <g class="rank-spark-axis" aria-hidden="true">
      <text :x="4" y="6">#1</text>
      <text :x="4" :y="VB_H_PLOT + 4">#{{ totalTeams }}</text>
      <text :x="PAD_X" :y="VB_H_TOTAL - 4">Wk {{ firstWeek }}</text>
      <text :x="VB_W - PAD_X" :y="VB_H_TOTAL - 4" text-anchor="end">Wk {{ lastWeek }}</text>
    </g>
  </svg>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { CategoryLeagueData } from '@/editorial/types'
import { smoothPath, type Point } from '@/utils/svgPath'

const props = defineProps<{
  data: CategoryLeagueData
  /** Team IDs to highlight. Others render as muted background lines. */
  focusTeamIds: string[]
  /** Colors for focus team lines, indexed by position in focusTeamIds.
   *  Defaults to up (green) → down (red) so the protagonist reads
   *  positive and the antagonist reads negative. */
  focusColors?: string[]
  ariaLabel?: string
  /** Endpoint label mode:
   *   - 'name' (default): team name + rank, used inline in the heroes
   *     where there's no separate legend.
   *   - 'rank': just "#N" in the right gutter — for surfaces that
   *     already name the teams in a legend (avoids name-on-line collision).
   *   - 'none': dots only. */
  labels?: 'name' | 'rank' | 'none'
  /** When true, draw the team logo at each line's endpoint — focus
   *  teams get a ringed medallion, the rest of the field gets a small
   *  identifying logo. Off by default (the heroes use plain dots). */
  endpointLogos?: boolean
}>()

/* Geometry constants — viewBox is a virtual canvas the SVG scales
   into; preserveAspectRatio + svg width/height in CSS handle the
   real-pixel rendering. */
const VB_W = 600
const VB_H_PLOT = 200     // plot area
const VB_H_AXIS = 22      // bottom axis area
const VB_H_TOTAL = VB_H_PLOT + VB_H_AXIS
const PAD_X = 40          // horizontal padding for axis labels
const FOCUS_R = 12        // endpoint logo radius — highlighted teams
const FIELD_R = 7         // endpoint logo radius — the rest of the field

const totalTeams = computed(() => props.data.teams.length)

const weeks = computed(() => props.data.seasonRankHistory.map((w) => w.week))
const firstWeek = computed(() =>
  weeks.value.length > 0 ? weeks.value[0] : 1,
)
const lastWeek = computed(() =>
  weeks.value.length > 0 ? weeks.value[weeks.value.length - 1] : 1,
)

function xForWeek(week: number): number {
  const min = firstWeek.value
  const max = lastWeek.value
  const range = Math.max(1, max - min)
  return PAD_X + ((week - min) / range) * (VB_W - 2 * PAD_X)
}

function yForRank(rank: number): number {
  const total = totalTeams.value
  if (total <= 1) return VB_H_PLOT / 2
  return ((rank - 1) / (total - 1)) * VB_H_PLOT
}

interface SparkLine {
  id: string
  d: string
  color: string
  lastX: number
  lastY: number
  lastRank: number
  teamName: string
  avatarUrl?: string
  initials: string
  /** Label position — auto-flipped to the left of the dot when the
   *  dot is too close to the right edge of the plot. */
  labelX: number
  labelY: number
  labelAnchor: 'start' | 'end'
}

function buildLine(
  teamId: string,
  color: string,
  teamName: string,
  labelMode: 'name' | 'rank' | 'none' = 'name',
): SparkLine | null {
  const team = props.data.teams.find((t) => t.id === teamId)
  const points: { x: number; y: number; rank: number }[] = []
  for (const week of props.data.seasonRankHistory) {
    const rank = week.ranks[teamId]
    if (typeof rank !== 'number') continue
    points.push({ x: xForWeek(week.week), y: yForRank(rank), rank })
  }
  if (points.length === 0) return null
  const last = points[points.length - 1]
  const path: Point[] = points.map((p) => ({ x: p.x, y: p.y }))

  let labelX: number
  let labelAnchor: 'start' | 'end'
  if (labelMode === 'rank') {
    // Short "#N" rides just right of the endpoint dot, in the gutter —
    // never flips back over the line field.
    labelX = last.x + 14
    labelAnchor = 'start'
  } else {
    // Name labels sit right of the dot, flipping left only when too
    // close to the right edge to fit the text.
    const FLIP_THRESHOLD = VB_W - 140
    const labelOnRight = last.x < FLIP_THRESHOLD
    labelX = labelOnRight ? last.x + 18 : last.x - 18
    labelAnchor = labelOnRight ? 'start' : 'end'
  }
  return {
    id: teamId,
    d: smoothPath(path),
    color,
    lastX: last.x,
    lastY: last.y,
    lastRank: last.rank,
    teamName,
    avatarUrl: team?.avatarUrl,
    initials: team?.ownerInitials ?? teamName.slice(0, 2).toUpperCase(),
    labelX,
    labelY: last.y + 5,
    labelAnchor,
  }
}

/* Default focus colors — first team reads positive, second negative.
   Caller can override. */
const DEFAULT_FOCUS_COLORS = [
  'oklch(0.78 0.18 92)',   // gold — primary subject
  'oklch(0.65 0.20 25)',   // red  — second subject (antagonist)
]

const focusLines = computed<SparkLine[]>(() => {
  const colors = props.focusColors ?? DEFAULT_FOCUS_COLORS
  const mode = props.labels ?? 'name'
  return props.focusTeamIds
    .map((id, i) => {
      const t = props.data.teams.find((tt) => tt.id === id)
      const name = t?.name ?? 'Team'
      return buildLine(id, colors[i % colors.length], name, mode)
    })
    .filter((l): l is SparkLine => l !== null)
})

const focusSet = computed(() => new Set(props.focusTeamIds))

const backgroundLines = computed<SparkLine[]>(() => {
  return props.data.teams
    .filter((t) => !focusSet.value.has(t.id))
    .map((t) => buildLine(t.id, 'oklch(0.32 0.012 90)', t.name))
    .filter((l): l is SparkLine => l !== null)
})
</script>

<style scoped>
.rank-spark {
  width: 100%;
  height: 100%;
  display: block;
  /* Overflow visible so axis labels can extend past the viewBox
     without getting clipped by SVG bounds. */
  overflow: visible;
}

.rank-spark-grid line {
  stroke: oklch(0.20 0.015 90);
  stroke-width: 1;
  stroke-dasharray: 2 6;
}

.rank-spark-bg {
  fill: none;
  stroke: oklch(0.36 0.012 90);
  stroke-width: 1.5;
  stroke-linecap: round;
  stroke-linejoin: round;
  opacity: 0.55;
}

.rank-spark-fg {
  fill: none;
  stroke-width: 3.5;
  stroke-linecap: round;
  stroke-linejoin: round;
  /* Subtle glow that picks up the line's own color via currentColor.
     Reads as accent depth without becoming a haze. */
  filter: drop-shadow(0 0 8px currentColor);
}

.rank-spark-axis text {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.10em;
  fill: oklch(0.50 0.010 90);
  text-transform: uppercase;
  dominant-baseline: middle;
}

.rank-spark-team {
  font-family: 'Barlow', sans-serif;
  font-size: 18px;
  font-weight: 800;
  letter-spacing: -0.01em;
}
.rank-spark-team-rank {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 700;
  font-size: 14px;
  letter-spacing: 0.04em;
  fill: oklch(0.55 0.010 90);
}

/* Initials fallback inside an endpoint medallion when a team has no
   logo (so the field is still identifiable). */
.rank-spark-end-initials {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 8px;
  font-weight: 800;
  fill: oklch(0.82 0.008 90);
  dominant-baseline: middle;
}
.rank-spark-end-initials-focus {
  font-size: 12px;
  fill: oklch(0.14 0.02 90);
}

/* In logo mode the field is the point, so lift the background lines so
   the full race reads — still subordinate to the bold focus lines. */
.rank-spark-logos .rank-spark-bg {
  opacity: 0.7;
  stroke: oklch(0.44 0.012 90);
}
</style>
