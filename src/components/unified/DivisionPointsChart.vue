<template>
  <div>
    <!-- Legend -->
    <div class="flex flex-wrap gap-3 mb-4">
      <div
        v-for="(entry, i) in entries"
        :key="entry.team.teamId"
        class="flex items-center gap-1.5"
      >
        <div class="w-3 h-3 rounded-full flex-shrink-0" :style="{ background: teamColor(i) }"></div>
        <span
          class="text-xs truncate max-w-[120px]"
          :class="entry.team.teamId === myTeamId ? 'text-primary font-semibold' : 'text-dark-textMuted'"
        >
          {{ entry.team.name }}
        </span>
      </div>
    </div>

    <!-- SVG Chart -->
    <div class="relative w-full overflow-x-auto">
      <svg
        :viewBox="`0 0 ${svgW} ${svgH}`"
        class="w-full"
        :style="{ minWidth: '280px', height: `${svgH}px` }"
        preserveAspectRatio="xMidYMid meet"
      >
        <!-- Y-axis gridlines + labels -->
        <g v-for="tick in yTicks" :key="'y-' + tick">
          <line
            :x1="padL"
            :y1="yScale(tick)"
            :x2="svgW - padR"
            :y2="yScale(tick)"
            stroke="#2a2d3a"
            stroke-width="1"
          />
          <text
            :x="padL - 6"
            :y="yScale(tick) + 4"
            text-anchor="end"
            class="text-[10px]"
            fill="#6b7280"
            font-size="10"
          >{{ tick }}</text>
        </g>

        <!-- X-axis week labels -->
        <g v-for="w in weeks" :key="'x-' + w">
          <text
            :x="xScale(w)"
            :y="svgH - padB + 14"
            text-anchor="middle"
            fill="#6b7280"
            font-size="10"
          >W{{ w }}</text>
        </g>

        <!-- Lines per team -->
        <g v-for="(entry, i) in entries" :key="'line-' + entry.team.teamId">
          <polyline
            :points="teamPolyline(entry.team.teamId)"
            fill="none"
            :stroke="teamColor(i)"
            :stroke-width="entry.team.teamId === myTeamId ? 2.5 : 1.5"
            stroke-linejoin="round"
            stroke-linecap="round"
            :opacity="entry.team.teamId === myTeamId ? 1 : 0.65"
          />
          <!-- Dot at last week -->
          <circle
            v-if="lastPoint(entry.team.teamId)"
            :cx="lastPoint(entry.team.teamId)!.x"
            :cy="lastPoint(entry.team.teamId)!.y"
            :r="entry.team.teamId === myTeamId ? 4 : 3"
            :fill="teamColor(i)"
          />
        </g>

        <!-- Axes -->
        <line :x1="padL" :y1="padT" :x2="padL" :y2="svgH - padB" stroke="#374151" stroke-width="1" />
        <line :x1="padL" :y1="svgH - padB" :x2="svgW - padR" :y2="svgH - padB" stroke="#374151" stroke-width="1" />
      </svg>
    </div>

    <!-- No data fallback -->
    <div v-if="weeks.length === 0" class="text-center py-6 text-dark-textMuted text-sm">
      No weekly scoring data available yet
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { UnifiedStandingsEntry } from '@/config/sports'

const props = defineProps<{
  entries: UnifiedStandingsEntry[]
  weeklyTeamPoints: Map<string, number[]>
  currentWeek: number
  myTeamId?: string
}>()

// Chart dimensions
const svgW = 600
const svgH = 220
const padL = 42
const padR = 16
const padT = 14
const padB = 28

// Distinct palette — works on dark background
const COLORS = [
  '#6366f1', '#22d3ee', '#f59e0b', '#10b981', '#f43f5e',
  '#a78bfa', '#34d399', '#fb923c', '#60a5fa', '#e879f9',
  '#facc15', '#4ade80'
]

function teamColor(i: number): string {
  return COLORS[i % COLORS.length]
}

// Build a list of week numbers present in the data for teams in this division
const weeks = computed((): number[] => {
  const set = new Set<number>()
  for (const entry of props.entries) {
    const pts = props.weeklyTeamPoints.get(entry.team.teamId)
    if (pts) pts.forEach((_, i) => set.add(i + 1))
  }
  return Array.from(set).sort((a, b) => a - b)
})

// Min/max points across all teams in this division
const allPoints = computed((): number[] => {
  const vals: number[] = []
  for (const entry of props.entries) {
    const pts = props.weeklyTeamPoints.get(entry.team.teamId) || []
    vals.push(...pts.filter(p => p > 0))
  }
  return vals
})

const minPts = computed(() => Math.max(0, Math.floor((Math.min(...(allPoints.value.length ? allPoints.value : [0])) * 0.9) / 10) * 10))
const maxPts = computed(() => Math.ceil((Math.max(...(allPoints.value.length ? allPoints.value : [100])) * 1.05) / 10) * 10)

const yTicks = computed((): number[] => {
  const range = maxPts.value - minPts.value
  const step = range <= 50 ? 10 : range <= 150 ? 25 : range <= 300 ? 50 : 100
  const ticks: number[] = []
  for (let v = minPts.value; v <= maxPts.value; v += step) ticks.push(v)
  return ticks
})

function xScale(week: number): number {
  const wks = weeks.value
  if (wks.length <= 1) return padL + (svgW - padL - padR) / 2
  const idx = wks.indexOf(week)
  return padL + (idx / (wks.length - 1)) * (svgW - padL - padR)
}

function yScale(pts: number): number {
  const range = maxPts.value - minPts.value || 1
  return padT + (1 - (pts - minPts.value) / range) * (svgH - padT - padB)
}

function teamPolyline(teamId: string): string {
  const pts = props.weeklyTeamPoints.get(teamId) || []
  return weeks.value
    .map((w, i) => {
      const val = pts[i] ?? null
      if (val === null || val === 0) return null
      return `${xScale(w)},${yScale(val)}`
    })
    .filter(Boolean)
    .join(' ')
}

function lastPoint(teamId: string): { x: number; y: number } | null {
  const pts = props.weeklyTeamPoints.get(teamId) || []
  const wks = weeks.value
  // Find last non-zero week
  for (let i = wks.length - 1; i >= 0; i--) {
    const val = pts[i]
    if (val && val > 0) return { x: xScale(wks[i]), y: yScale(val) }
  }
  return null
}
</script>
