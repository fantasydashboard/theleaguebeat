<template>
  <!--
    HeroQuiet — the magazine's "calm column" hero.
    Renders when the issue's lead story is the fallback `quiet-day`,
    or when composition is missing a hero story entirely. Reads
    intentional, not empty: top team's current rank + a short
    sentence acknowledging the lull.
  -->
  <section class="hero-quiet" :aria-labelledby="`hero-quiet-headline-${componentId}`">
    <div class="hero-quiet-copy">
      <p class="hero-quiet-eyebrow">
        <span class="hero-quiet-eyebrow-bar" aria-hidden="true"></span>
        Quiet week
        <span class="issue-cadence issue-cadence-teal" aria-label="Updates weekly">WEEKLY</span>
      </p>
      <h1 class="hero-quiet-headline" :id="`hero-quiet-headline-${componentId}`">
        {{ headline }}
      </h1>
      <p class="hero-quiet-body">{{ body }}</p>
      <p v-if="byline" class="issue-byline">
        <span class="issue-byline-tag">THE BEAT</span>
        <span>{{ byline }}</span>
      </p>
    </div>

    <aside v-if="topTeam" class="hero-quiet-card">
      <div
        class="hero-quiet-avatar"
        :style="{ background: `linear-gradient(135deg, ${topTeam.avatarColor})` }"
      >
        <img
          v-if="topTeam.avatarUrl && !imgErrored"
          :src="topTeam.avatarUrl"
          class="hero-quiet-avatar-img"
          alt=""
          @error="imgErrored = true"
        />
        <span v-else>{{ topTeam.ownerInitials }}</span>
      </div>
      <div class="hero-quiet-card-meta">
        <p class="hero-quiet-card-eyebrow">Number one</p>
        <p class="hero-quiet-card-name">{{ topTeam.name }}</p>
        <p v-if="topRecord" class="hero-quiet-card-record">{{ topRecord }}</p>
      </div>
    </aside>

    <button
      v-if="story && shareable"
      type="button"
      class="issue-section-share"
      :aria-label="`Share ${story.type} story to your league chat`"
      @click="story && emit('share', story)"
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
import { computed, ref } from 'vue'
import type { SelectedStory } from '@/editorial/detection/types'
import type { CategoryLeagueData, CategoryLeagueDataTeam } from '@/editorial/types'
import { canShare } from '@/editorial/shareability'

/** Image-error fallback for ESPN custom-uploaded logos that 401. */
const imgErrored = ref(false)

const props = defineProps<{
  /** Story is optional — composition emits a hero-quiet even without
   *  a story when no candidates cleared selection. */
  story?: SelectedStory
  data?: CategoryLeagueData
}>()

const emit = defineEmits<{ (e: 'share', story: SelectedStory): void }>()

const componentId = Math.random().toString(36).slice(2, 8)

/** Editorial gate — Tier C stories (quiet-day, identity-shift, etc)
 *  return false from canShare, hiding the button entirely. */
const shareable = computed(() =>
  props.story ? canShare(props.story) : false,
)

/** The team at rank 1 in the current standings, if we have it.
 *  Falls back to whichever team the story attached to, otherwise null. */
const topTeam = computed<CategoryLeagueDataTeam | null>(() => {
  const data = props.data
  if (data) {
    const top = data.standings.find((s) => s.rank === 1)
    if (top) {
      const t = data.teams.find((tt) => tt.id === top.teamId)
      if (t) return t
    }
    // Composition sometimes attaches the rank-1 team id to the story.
    const ctxId = (props.story?.context as { teamId?: unknown } | undefined)?.teamId
    if (typeof ctxId === 'string') {
      const t = data.teams.find((tt) => tt.id === ctxId)
      if (t) return t
    }
  }
  return null
})

/** Current week's W-L-T for the rank-1 team. */
const topRecord = computed<string | null>(() => {
  const data = props.data
  const team = topTeam.value
  if (!data || !team) return null
  const row = data.standings.find((s) => s.teamId === team.id)
  if (!row) return null
  return `${row.catWins}-${row.catLosses}-${row.catTies}`
})

const headline = computed(() => {
  // If we have a confident #1, lead with their name. If not, lean on
  // the calm-week framing.
  if (topTeam.value) return `${topTeam.value.name} holds steady.`
  return 'Nothing changed this week.'
})

const body = computed(() => {
  // Body acknowledges the lull without manufacturing drama. Per
  // EDITORIAL.md: when there is no story, the voice contracts, but
  // does not disappear.
  if (topTeam.value && topRecord.value) {
    return `${topRecord.value} on the season. The board did not move. Sometimes that is the story.`
  }
  if (topTeam.value) {
    return `The lead stays at the top. No big shake-ups in the standings this week.`
  }
  return 'No new throne. No collapses. Sometimes the week passes without one.'
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
.hero-quiet {
  --ink-1: oklch(0.97 0.005 90);
  --ink-2: oklch(0.78 0.008 90);
  --ink-3: oklch(0.55 0.010 90);
  --ink-4: oklch(0.32 0.012 90);

  display: grid;
  grid-template-columns: 1.2fr 1fr;
  gap: 48px;
  padding: 24px 0 48px;
  align-items: center;
  font-family: 'Barlow', sans-serif;
  color: var(--ink-1);
}

.hero-quiet-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.74rem;
  font-weight: 800;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--ink-3);
  margin: 0 0 14px;
}
.hero-quiet-eyebrow-bar {
  width: 22px;
  height: 1px;
  background: var(--ink-4);
}

.hero-quiet-headline {
  font-family: 'Barlow', sans-serif;
  font-weight: 900;
  /* Bumped substantially. Still less aggressive than HeroSolo
     since the calm tone earns restraint, but no longer dwarfed
     by the section labels downstream. */
  font-size: clamp(2.6rem, 5.6vw, 5rem);
  line-height: 0.96;
  letter-spacing: -0.025em;
  color: var(--ink-1);
  margin: 0 0 18px;
  max-width: 16ch;
  overflow-wrap: anywhere;
}

.hero-quiet-body {
  font-size: 1.15rem;
  line-height: 1.5;
  color: oklch(0.85 0.008 90);
  margin: 0;
  max-width: 40ch;
  font-weight: 500;
}

.hero-quiet-card {
  display: flex;
  align-items: center;
  gap: 20px;
  /* Strip the inner card chrome — the avatar carries the visual,
     and the page background unifies the section. */
}
.hero-quiet-avatar {
  width: 144px;
  height: 144px;
  border-radius: 28px;
  display: grid;
  place-items: center;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 2.4rem;
  letter-spacing: 0.02em;
  color: oklch(0.12 0.012 90);
  overflow: hidden;
  flex-shrink: 0;
}
.hero-quiet-avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.hero-quiet-card-meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.hero-quiet-card-eyebrow {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.66rem;
  font-weight: 800;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--ink-3);
  margin: 0;
}
.hero-quiet-card-name {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: 1.05rem;
  letter-spacing: 0.02em;
  color: var(--ink-1);
  margin: 0;
}
.hero-quiet-card-record {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.85rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: var(--ink-3);
  margin: 0;
}

@media (max-width: 720px) {
  .hero-quiet {
    grid-template-columns: 1fr;
    padding: 24px 20px 22px;
    gap: 22px;
  }
}
@media (max-width: 380px) {
  .hero-quiet {
    padding: 20px 16px 20px;
    border-radius: 16px;
  }
  .hero-quiet-headline { font-size: clamp(1.7rem, 8vw, 2.2rem); }
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
