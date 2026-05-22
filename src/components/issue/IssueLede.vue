<template>
  <!-- ISSUE LEDE — the magazine's "what's in this week's issue" line.
       One declarative sentence that joins three story beats. Renders
       above the hero on every visit. The eyebrow ("TODAY") plus the
       big-typography one-liner establish the issue's pulse before
       any sectional content. -->
  <section
    v-if="ledeText"
    class="issue-lede"
    :aria-label="`This week's beats: ${ledeText}`"
  >
    <p class="issue-lede-eyebrow">
      <span class="issue-lede-eyebrow-dot" aria-hidden="true"></span>
      Today
    </p>
    <p class="issue-lede-text">{{ ledeText }}</p>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { SelectedStory, StoryType } from '@/editorial/detection/types'
import type {
  CategoryLeagueData,
  CategoryLeagueDataTeam,
} from '@/editorial/types'

const props = defineProps<{
  /** Stories the issue selected, top first. The lede pulls the first
   *  3 (with stories that lack a meaningful beat skipped) and joins
   *  them into one sentence. */
  stories: SelectedStory[]
  /** League data for team-name lookups. */
  data?: CategoryLeagueData
}>()

/* ─────────────────────────────────────────────────────────────────
   Beat phrases — short fragments (5-10 words). One per story type
   that's worth saying. Falls back to a generic phrase if a type
   isn't in the map.
───────────────────────────────────────────────────────────────── */

function beatForStory(story: SelectedStory): string | null {
  const teamId = story.teamIds?.[0]
  const opponentId = story.teamIds?.[1]
  const team = teamId ? props.data?.teams.find((t) => t.id === teamId) : undefined
  const opp = opponentId
    ? props.data?.teams.find((t) => t.id === opponentId)
    : undefined
  const name = team?.name ?? 'the leader'
  const oppName = opp?.name ?? 'the challenger'

  switch (story.type) {
    /* Standings movement */
    case 'new-throne':           return `${name} takes the throne`
    case 'dynasty-falling':      return `cracks open at the top`
    case 'dethroned-rivalry':    return `${name} and ${oppName} trade the lead`
    case 'hot-climber':          return `${name} keeps climbing`
    case 'comeback-team':        return `${name} is back in the race`
    case 'bubble-surprise':      return `the bubble shifts`
    case 'newcomer-breakout':    return `${name} breaks through`
    case 'locked-top-seed':      return `${name} locks the top seed`
    case 'mathematical-elimination': return `${name} is officially out`
    case 'first-time-playoffs':  return `${name} is in for the first time`
    case 'first-above-500':      return `${name} crosses .500`
    case 'first-below-500':      return `${name} slips under .500`
    case 'division-lead-change': return `the division lead changes hands`
    case 'wild-card-shift':      return `the wild-card race tightens`
    case 'three-way-tie-bubble': return `three teams are tied on the bubble`
    case 'spoiler-mode':         return `${name} is playing spoiler`
    case 'identity-shift':       return `${name}'s identity is changing`
    case 'quiet-day':            return `${name} holds steady`

    /* Matchups */
    case 'matchup-of-week':      return `${name} draws ${oppName}`
    case 'cat-sweep':            return `${name} swept the cat board`
    case 'cat-shutout':          return `${name} got shut out`
    case 'photo-finish':
    case 'razor-close':          return `${name} and ${oppName} go down to the wire`
    case 'comeback-win':         return `${name} clawed back from down`
    case 'blowout':              return `${name} ran away with it`
    case 'punt-success':         return `${name}'s punt is paying off`
    case 'punt-failure':         return `${name}'s punt is bleeding`
    case 'rematch':
    case 'playoff-rematch':      return `${name} and ${oppName} meet again`
    case 'division-clash':       return `${name} draws division rival ${oppName}`
    case 'stakes-week':          return `${name} faces a must-win`
    case 'spoiler-watch':        return `${name} can play spoiler this week`

    /* Streaks */
    case 'streak-built':         return `${name} is heating up`
    case 'streak-broken':        return `${name}'s run snaps`
    case 'consistency-award':    return `${name} keeps showing up`
    case 'inconsistency-award':  return `${name} can't pick a lane`
    case 'basement-streak':      return `${name} can't find the floor`
    case 'throne-streak':        return `${name} stays on top`
    case 'three-week-comeback':  return `${name} climbed three straight`
    case 'three-week-collapse':  return `${name} fell three straight`

    /* Cadence — lede beats for day-of-week framing */
    case 'monday-recap':         return `the weekend is in the books`
    case 'midweek-trade-talk':   return `the trade window is open`
    case 'friday-preview':       return `the weekend swing decides plenty`
    case 'sunday-final-push':    return `the last day decides the rest`
    case 'off-day-deep-dive':    return `the board is quiet`

    /* Future tiers — beats we'll fire once data lands */
    case 'blockbuster-trade':    return `${name} pulled the trigger on a trade`
    case 'monster-night':        return `a monster line moved the math`
    case 'three-hr-game':        return `a 3-HR night shifted the race`
    case 'twelve-k-game':        return `a 12-K start tightened the K race`

    default:                     return null
  }
}

/* ─────────────────────────────────────────────────────────────────
   Lede assembly — pick up to 3 beats from the top stories and join
   them into a single sentence. Skip stories with no beat phrase
   (placeholder types, untranslated story types) rather than padding
   with weak filler.
───────────────────────────────────────────────────────────────── */

const beats = computed<string[]>(() => {
  const out: string[] = []
  const seen = new Set<string>()
  for (const story of props.stories) {
    if (out.length >= 3) break
    const beat = beatForStory(story)
    if (!beat) continue
    // Dedup near-identical beats so we don't repeat ourselves.
    const key = beat.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(beat)
  }
  return out
})

const ledeText = computed<string>(() => {
  if (beats.value.length === 0) return ''
  if (beats.value.length === 1) return capitalize(`${beats.value[0]}.`)
  if (beats.value.length === 2) {
    return capitalize(`${beats.value[0]}, and ${beats.value[1]}.`)
  }
  const [a, b, c] = beats.value
  return capitalize(`${a}, ${b}, and ${c}.`)
})

function capitalize(s: string): string {
  if (!s) return s
  return s.charAt(0).toUpperCase() + s.slice(1)
}
</script>

<style scoped>
.issue-lede {
  margin-bottom: 36px;
  padding: 0 4px;
}
.issue-lede-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 12px;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.74rem;
  font-weight: 800;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: oklch(0.78 0.18 92);
}
.issue-lede-eyebrow-dot {
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: oklch(0.78 0.18 92);
  display: inline-block;
}
.issue-lede-text {
  margin: 0;
  font-family: 'Barlow', system-ui, sans-serif;
  font-weight: 800;
  font-size: clamp(1.4rem, 2.4vw, 1.85rem);
  letter-spacing: -0.015em;
  line-height: 1.25;
  color: oklch(0.97 0.005 90);
  max-width: 68ch;
}

@media (max-width: 720px) {
  .issue-lede { margin-bottom: 24px; }
  .issue-lede-text { font-size: 1.2rem; line-height: 1.3; }
}
</style>
