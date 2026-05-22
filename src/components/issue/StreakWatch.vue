<template>
  <!--
    StreakWatch — compact streak callout.
    Fires for throne-streak, consistency-award, basement-streak,
    three-week-comeback, three-week-collapse, streak-built,
    streak-broken, inconsistency-award.

    Pattern: eyebrow tag → short headline → team chip → dots row →
    one-line description. Designed to slot between hero and feed.
  -->
  <section class="sw" :class="`sw-tone-${tone}`" :aria-labelledby="`sw-headline-${componentId}`">
    <header class="sw-head">
      <p class="sw-eyebrow">
        <span class="sw-eyebrow-bar" aria-hidden="true"></span>
        {{ eyebrow }}
        <span class="issue-cadence issue-cadence-teal" aria-label="Updates weekly">WEEKLY</span>
      </p>
      <h2 class="sw-headline" :id="`sw-headline-${componentId}`">{{ headline }}</h2>
      <p class="issue-byline">
        <span class="issue-byline-tag">THE BEAT</span>
        <span>{{ byline }}</span>
      </p>
    </header>

    <div class="sw-body">
      <div class="sw-team">
        <div
          class="sw-avatar"
          :style="{ background: `linear-gradient(135deg, ${team.avatarColor})` }"
          :class="{ 'sw-avatar-placeholder': !hasTeam }"
        >
          <img v-if="team.avatarUrl" :src="team.avatarUrl" class="sw-avatar-img" alt="" />
          <span v-else>{{ team.ownerInitials }}</span>
        </div>
        <div class="sw-team-meta">
          <p class="sw-team-name">{{ team.name }}</p>
          <p v-if="team.ownerName" class="sw-team-owner">{{ team.ownerName }}</p>
        </div>
      </div>

      <div class="sw-indicator">
        <p class="sw-stat" v-if="streakStat">
          <span class="sw-stat-num">{{ streakStat.num }}</span>
          <span class="sw-stat-unit">{{ streakStat.unit }}</span>
        </p>
        <ul
          v-if="lastSix.length"
          class="sw-dots"
          role="list"
          :aria-label="`Last ${lastSix.length} results: ${lastSix.join(', ')}`"
        >
          <li
            v-for="(r, i) in lastSix"
            :key="i"
            class="sw-dot"
            :class="r === 'W' ? 'sw-dot-w' : r === 'L' ? 'sw-dot-l' : 'sw-dot-t'"
            :title="r"
            aria-hidden="true"
          ></li>
        </ul>
      </div>
    </div>

    <p class="sw-desc">{{ description }}</p>

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
  WLT,
} from '@/editorial/types'

const props = defineProps<{
  story: SelectedStory
  data?: CategoryLeagueData
}>()

const emit = defineEmits<{ (e: 'share', story: SelectedStory): void }>()

const componentId = Math.random().toString(36).slice(2, 8)

const PLACEHOLDER: CategoryLeagueDataTeam = {
  id: 'unknown',
  name: 'Team unknown',
  ownerName: '',
  ownerInitials: '??',
  avatarColor: 'oklch(0.32 0.012 90), oklch(0.20 0.015 90)',
  isMyTeam: false,
}

const teamId = computed<string | undefined>(() => {
  const ctxId = (props.story.context as { teamId?: unknown }).teamId
  if (typeof ctxId === 'string') return ctxId
  return props.story.teamIds?.[0]
})

const team = computed<CategoryLeagueDataTeam>(() => {
  const id = teamId.value
  if (!id) return PLACEHOLDER
  return props.data?.teams.find((t) => t.id === id) ?? PLACEHOLDER
})

const hasTeam = computed(() => team.value.id !== 'unknown')

/** Pull lastSix from story.context first, then fall back to the team's
 *  current standings row. Empty array if neither is available. */
const lastSix = computed<WLT[]>(() => {
  const ctxLast = (props.story.context as { lastSix?: unknown }).lastSix
  if (Array.isArray(ctxLast) && ctxLast.every((x) => x === 'W' || x === 'L' || x === 'T')) {
    return ctxLast as WLT[]
  }
  const id = teamId.value
  if (!id) return []
  const row = props.data?.standings.find((s) => s.teamId === id)
  return row?.lastSix ?? []
})

/** Headline streak number — pulled from whichever context field the
 *  detector populated. */
const streakStat = computed<{ num: string; unit: string } | null>(() => {
  const ctx = props.story.context as Record<string, unknown>
  const type = props.story.type
  const streakLength = typeof ctx.streakLength === 'number' ? ctx.streakLength : null
  const brokenStreakLength = typeof ctx.brokenStreakLength === 'number' ? ctx.brokenStreakLength : null
  const weeks = typeof ctx.weeks === 'number' ? ctx.weeks : null
  const wins = typeof ctx.wins === 'number' ? ctx.wins : null
  const ranks = Array.isArray(ctx.ranks) ? ctx.ranks as number[] : null

  if (type === 'streak-built' && streakLength) return { num: String(streakLength), unit: 'W' }
  if (type === 'streak-broken' && brokenStreakLength) return { num: String(brokenStreakLength), unit: 'broken' }
  if (type === 'throne-streak' && weeks) return { num: String(weeks), unit: 'wks #1' }
  if (type === 'basement-streak' && weeks) return { num: String(weeks), unit: 'wks low' }
  if (type === 'consistency-award' && wins != null) return { num: `${wins}/6`, unit: 'W' }
  if ((type === 'three-week-comeback' || type === 'three-week-collapse') && ranks && ranks.length >= 2) {
    const delta = ranks[0] - ranks[ranks.length - 1]
    const sign = delta >= 0 ? '+' : ''
    return { num: `${sign}${delta}`, unit: 'spots' }
  }
  if (type === 'inconsistency-award') return { num: '3-3', unit: 'flip' }
  return null
})

const eyebrow = computed(() => {
  switch (props.story.type) {
    case 'throne-streak':         return 'Throne streak'
    case 'streak-built':          return 'Hot streak'
    case 'streak-broken':         return 'Streak broken'
    case 'consistency-award':     return 'Quiet consistency'
    case 'inconsistency-award':   return 'Coin flip'
    case 'basement-streak':       return 'Basement watch'
    case 'three-week-comeback':   return 'Three weeks up'
    case 'three-week-collapse':   return 'Three weeks down'
    default:                      return 'Streak watch'
  }
})

const headline = computed(() => {
  const name = team.value.name || 'This team'
  const ctx = props.story.context as Record<string, unknown>
  const streakLength = typeof ctx.streakLength === 'number' ? ctx.streakLength : null
  const brokenStreakLength = typeof ctx.brokenStreakLength === 'number' ? ctx.brokenStreakLength : null
  const weeks = typeof ctx.weeks === 'number' ? ctx.weeks : null

  switch (props.story.type) {
    case 'throne-streak':
      if (weeks) return `${name} sits on the throne. ${weeks} weeks running.`
      return `${name} sits on the throne.`
    case 'streak-built':
      if (streakLength) return `${name} ran it to ${streakLength}.`
      return `${name} is on a tear.`
    case 'streak-broken':
      if (brokenStreakLength && brokenStreakLength >= 3) return `${brokenStreakLength}-week run snapped.`
      return `${name} took the loss.`
    case 'consistency-award':
      return `${name} keeps showing up.`
    case 'inconsistency-award':
      return `${name} cannot pick a lane.`
    case 'basement-streak':
      if (weeks) return `${name} sits in the basement. ${weeks} straight.`
      return `${name} cannot escape the bottom.`
    case 'three-week-comeback':
      return `${name} climbed three weeks in a row.`
    case 'three-week-collapse':
      return `${name} slid three weeks in a row.`
    default:
      return `${name} on the watch list.`
  }
})

const description = computed(() => {
  const ctx = props.story.context as Record<string, unknown>
  const streakLength = typeof ctx.streakLength === 'number' ? ctx.streakLength : null
  const brokenStreakLength = typeof ctx.brokenStreakLength === 'number' ? ctx.brokenStreakLength : null
  const weeks = typeof ctx.weeks === 'number' ? ctx.weeks : null
  const wins = typeof ctx.wins === 'number' ? ctx.wins : null
  const ties = typeof ctx.ties === 'number' ? ctx.ties : null

  switch (props.story.type) {
    case 'throne-streak':
      return 'Nobody has closed the gap on the lead.'
    case 'streak-built':
      if (streakLength === 3) return 'Three straight wins. The shape is changing.'
      if (streakLength && streakLength >= 5) return `${streakLength} straight. The board is bending around them.`
      return 'The wins are stacking.'
    case 'streak-broken':
      if (brokenStreakLength) return `The ${brokenStreakLength}-week run ends. Time to see what comes next.`
      return 'A long run ends with a quiet loss.'
    case 'consistency-award':
      if (wins != null && ties != null) return `${wins} wins and ${ties} ties over the last six. Steady is the look.`
      return 'Four of six. Hard to bet against.'
    case 'inconsistency-award':
      return 'Alternating wins and losses for six straight weeks.'
    case 'basement-streak':
      if (weeks) return `${weeks} weeks pinned at the bottom. The slide is real.`
      return 'A long stay in the basement.'
    case 'three-week-comeback':
      return 'Steady improvement, week over week. Quiet, but it counts.'
    case 'three-week-collapse':
      return 'A slow leak. Each week worse than the last.'
    default:
      return 'A streak the board should be watching.'
  }
})

/** Tone hints at the streak's direction. Drives eyebrow color + dot
 *  emphasis. */
const tone = computed<'green' | 'red' | 'gold' | 'magenta'>(() => {
  switch (props.story.type) {
    case 'throne-streak':
    case 'consistency-award':
      return 'gold'
    case 'streak-built':
    case 'three-week-comeback':
      return 'green'
    case 'streak-broken':
    case 'basement-streak':
    case 'three-week-collapse':
      return 'red'
    case 'inconsistency-award':
    default:
      return 'magenta'
  }
})

const byline = computed(() => {
  if (!props.story) return ''
  // Freshness is 0-1; convert to a rough "X hours ago" feel.
  const minutesAgo = Math.max(5, Math.round((1 - props.story.freshness) * 60 * 6))
  if (minutesAgo < 60) return `FILED · ${minutesAgo} MIN AGO`
  const hr = Math.round(minutesAgo / 60)
  if (hr < 24) return `FILED · ${hr} HR AGO`
  const d = Math.round(hr / 24)
  return `FILED · ${d} DAY${d === 1 ? '' : 'S'} AGO`
})
</script>

<style scoped>
.sw {
  --ink-1: oklch(0.97 0.005 90);
  --ink-2: oklch(0.78 0.008 90);
  --ink-3: oklch(0.55 0.010 90);
  --ink-4: oklch(0.32 0.012 90);
  --accent-primary:   oklch(0.78 0.18 92);
  --accent-secondary: oklch(0.70 0.27 350);
  --accent-tertiary:  oklch(0.72 0.18 195);
  --accent-up:        oklch(0.74 0.18 145);
  --accent-down:      oklch(0.65 0.20 25);

  position: relative;
  padding: 24px 24px 22px;
  border: 1px solid oklch(0.20 0.015 90);
  border-radius: 18px;
  background: oklch(0.10 0.015 90);
  font-family: 'Barlow', sans-serif;
  color: var(--ink-1);
}

.sw-tone-gold    { --tone: var(--accent-primary); }
.sw-tone-green   { --tone: var(--accent-up); }
.sw-tone-red     { --tone: var(--accent-down); }
.sw-tone-magenta { --tone: var(--accent-secondary); }

.sw-head { margin-bottom: 16px; }
.sw-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--tone);
  margin: 0 0 8px;
}
.sw-eyebrow-bar {
  width: 20px;
  height: 1px;
  background: var(--tone);
}
.sw-headline {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: clamp(1.4rem, 2.6vw, 1.95rem);
  line-height: 1;
  letter-spacing: -0.01em;
  color: var(--ink-1);
  margin: 0;
  overflow-wrap: anywhere;
}

.sw-body {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  margin: 12px 0 14px;
  padding: 12px 14px;
  border-radius: 12px;
  background: oklch(0.13 0.015 90);
  border: 1px solid oklch(0.18 0.015 90);
}

.sw-team {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}
.sw-avatar {
  width: 42px;
  height: 42px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: 0.88rem;
  letter-spacing: 0.02em;
  color: oklch(0.12 0.012 90);
  flex-shrink: 0;
  overflow: hidden;
}
.sw-avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.sw-avatar-placeholder { opacity: 0.65; color: var(--ink-3); }

.sw-team-meta { min-width: 0; }
.sw-team-name {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: 0.98rem;
  letter-spacing: 0.02em;
  color: var(--ink-1);
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 22ch;
}
.sw-team-owner {
  font-size: 0.74rem;
  color: var(--ink-3);
  margin: 0;
}

.sw-indicator {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6px;
  flex-shrink: 0;
}
.sw-stat {
  display: inline-flex;
  align-items: baseline;
  gap: 4px;
  margin: 0;
  font-family: 'Barlow Condensed', sans-serif;
  color: var(--tone);
}
.sw-stat-num {
  font-weight: 900;
  font-size: 1.5rem;
  line-height: 1;
  letter-spacing: -0.01em;
}
.sw-stat-unit {
  font-weight: 700;
  font-size: 0.72rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--ink-3);
}

.sw-dots {
  display: inline-flex;
  gap: 4px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.sw-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  display: block;
  background: oklch(0.30 0.015 90);
}
.sw-dot-w { background: var(--accent-up); }
.sw-dot-l { background: var(--accent-down); }
.sw-dot-t { background: oklch(0.50 0.015 90); }

.sw-desc {
  font-size: 0.94rem;
  line-height: 1.55;
  color: var(--ink-2);
  margin: 0;
  max-width: 56ch;
}

@media (max-width: 480px) {
  .sw { padding: 20px 18px 18px; border-radius: 16px; }
  .sw-body { flex-direction: column; align-items: stretch; gap: 10px; }
  .sw-indicator { flex-direction: row; justify-content: space-between; align-items: center; }
}
@media (max-width: 380px) {
  .sw { padding: 16px 14px 16px; }
  .sw-team-name { max-width: 16ch; }
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

.issue-cadence {
  display: inline-block;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.62rem;
  font-weight: 800;
  letter-spacing: 0.16em;
  padding: 2px 7px;
  border-radius: 999px;
  margin-left: 6px;
}
.issue-cadence-teal { background: oklch(0.72 0.18 195 / 0.14); color: oklch(0.72 0.18 195); }
.issue-cadence-gold { background: oklch(0.78 0.18 92 / 0.14); color: oklch(0.78 0.18 92); }
.issue-cadence-up   { background: oklch(0.74 0.18 145 / 0.14); color: oklch(0.74 0.18 145); }

.issue-byline {
  margin: 14px 0 0;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: oklch(0.45 0.010 90);
}
.issue-byline-tag {
  padding: 2px 6px;
  background: oklch(0.20 0.015 90);
  border-radius: 4px;
  color: oklch(0.78 0.008 90);
}
</style>
