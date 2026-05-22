<template>
  <section class="hero" :aria-labelledby="`hero-headline-${story.signature}`">
    <div class="hero-copy">
      <p class="hero-eyebrow">
        <span class="hero-eyebrow-bar" aria-hidden="true"></span>
        {{ eyebrow }}
      </p>
      <h1 class="hero-headline" :id="`hero-headline-${story.signature}`">{{ headline }}</h1>
      <p v-if="body" class="hero-body">{{ body }}</p>
      <button
        type="button"
        class="hero-share"
        :aria-label="`Share ${headline} to your league chat`"
        @click="emit('share', story)"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
          <polyline points="16 6 12 2 8 6"/>
          <line x1="12" y1="2" x2="12" y2="15"/>
        </svg>
        Share this story
      </button>
    </div>

    <div
      class="hero-faceoff"
      :class="{ 'hero-faceoff-solo': !antagonist }"
      :aria-label="antagonist
        ? `${protagonist?.name} overtaking ${antagonist.name}`
        : `${protagonist?.name} feature`"
    >
      <article v-if="protagonist" class="faceoff-team faceoff-rise">
        <div class="faceoff-avatar" :style="{ background: `linear-gradient(135deg, ${protagonist.avatarColor})` }">
          <img v-if="protagonist.avatarUrl" :src="protagonist.avatarUrl" class="avatar-image" alt="" />
          <span v-else>{{ protagonist.ownerInitials }}</span>
        </div>
        <div class="faceoff-meta">
          <p class="faceoff-name">{{ protagonist.name }}</p>
          <p class="faceoff-owner">{{ protagonist.ownerName }}</p>
          <div class="faceoff-rankrow">
            <span class="faceoff-rankchip faceoff-rankchip-now">#{{ protagonistRank }}</span>
            <span
              v-if="protagonistDelta !== 0"
              class="faceoff-trend"
              :class="protagonistDelta > 0 ? 'faceoff-trend-up' : 'faceoff-trend-down'"
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <polyline v-if="protagonistDelta > 0" points="6 15 12 9 18 15"/>
                <polyline v-else points="6 9 12 15 18 9"/>
              </svg>
              {{ protagonistDelta > 0 ? '+' : '' }}{{ protagonistDelta }}
            </span>
          </div>
        </div>
      </article>

      <div v-if="antagonist" class="faceoff-verb" aria-hidden="true">
        <span class="faceoff-verb-line"></span>
        <span class="faceoff-verb-word">{{ verb }}</span>
        <span class="faceoff-verb-line"></span>
      </div>

      <article v-if="antagonist" class="faceoff-team faceoff-fall">
        <div class="faceoff-avatar faceoff-avatar-dim" :style="{ background: `linear-gradient(135deg, ${antagonist.avatarColor})` }">
          <img v-if="antagonist.avatarUrl" :src="antagonist.avatarUrl" class="avatar-image" alt="" />
          <span v-else>{{ antagonist.ownerInitials }}</span>
        </div>
        <div class="faceoff-meta">
          <p class="faceoff-name">{{ antagonist.name }}</p>
          <p class="faceoff-owner">{{ antagonist.ownerName }}</p>
          <div class="faceoff-rankrow">
            <span class="faceoff-rankchip faceoff-rankchip-fell">#{{ antagonistRank }}</span>
            <span
              v-if="antagonistDelta !== 0"
              class="faceoff-trend"
              :class="antagonistDelta > 0 ? 'faceoff-trend-up' : 'faceoff-trend-down'"
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <polyline v-if="antagonistDelta > 0" points="6 15 12 9 18 15"/>
                <polyline v-else points="6 9 12 15 18 9"/>
              </svg>
              {{ antagonistDelta > 0 ? '+' : '' }}{{ antagonistDelta }}
            </span>
          </div>
        </div>
      </article>
    </div>
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

/* ─────────────────────────────────────────────────────────────────
   Eyebrow / headline / body / verb — driven by the story type so
   the hero copy actually matches the underlying detection signal.
───────────────────────────────────────────────────────────────── */

const eyebrow = computed(() => {
  switch (props.story.type) {
    case 'new-throne':              return 'New throne'
    case 'dynasty-falling':         return 'Top spot slipping'
    case 'dethroned-rivalry':       return 'Throne in motion'
    case 'division-lead-change':    return 'Division lead changes'
    case 'matchup-of-week':         return 'Matchup of the week'
    case 'photo-finish':            return 'Photo finish'
    case 'razor-close':             return 'Razor close'
    case 'playoff-rematch':         return 'Playoff rematch'
    case 'rematch':                 return 'Rematch'
    case 'division-clash':          return 'Division clash'
    case 'spoiler-watch':           return 'Spoiler watch'
    default:                        return 'Top of the slate'
  }
})

const headline = computed<string>(() => {
  const ctx = props.story.context as Record<string, unknown>
  const explicit = typeof ctx.headline === 'string' ? ctx.headline : null
  if (explicit) return explicit

  const pName = protagonist.value?.name ?? 'The leader'
  const aName = antagonist.value?.name ?? 'the challenger'

  switch (props.story.type) {
    case 'new-throne':
      return `${pName} takes the throne.`
    case 'dynasty-falling':
      return `Cracks in ${pName}. Real ones.`
    case 'dethroned-rivalry':
      return `${pName} and ${aName} keep trading the lead.`
    case 'division-lead-change':
      return `${pName} takes over the division.`
    case 'matchup-of-week':
      return `${pName} draws ${aName}.`
    case 'photo-finish':
    case 'razor-close':
      return `${pName} and ${aName}. Decided by a hair.`
    case 'playoff-rematch':
      return `${pName} and ${aName}. Round two.`
    case 'rematch':
      return `${pName} and ${aName} meet again.`
    case 'division-clash':
      return `${pName} draws ${aName}. Division stakes.`
    case 'spoiler-watch':
      return `${pName} is playing spoiler.`
    default:
      return `${pName} vs ${aName}.`
  }
})

const body = computed<string>(() => {
  const ctx = props.story.context as Record<string, unknown>
  const explicit = typeof ctx.body === 'string' ? ctx.body : null
  if (explicit) return explicit

  const pName = protagonist.value?.name ?? 'The leader'
  const aName = antagonist.value?.name ?? 'The challenger'

  switch (props.story.type) {
    case 'dynasty-falling':
      return `The ${pName} – ${aName} gap closed in a week. Now it's flipped.`
    case 'new-throne':
      return `${pName} crossed the bar. The conversation just changed.`
    case 'matchup-of-week':
      return `Top of the slate. The two highest seeds drew each other.`
    case 'photo-finish':
    case 'razor-close':
      return `Decided by one cat. The kind of margin that defines a season.`
    case 'rematch':
    case 'playoff-rematch':
      return `Same teams, second time. The board will remember the result.`
    case 'division-clash':
      return `Same division, every win counts twice.`
    case 'spoiler-watch':
      return `${pName} is out of the race. ${aName} still has everything to lose.`
    default:
      return ''
  }
})

const verb = computed(() => {
  switch (props.story.type) {
    case 'new-throne':         return 'overtakes'
    case 'dynasty-falling':    return 'overtakes'
    case 'dethroned-rivalry':  return 'trades with'
    case 'matchup-of-week':    return 'draws'
    case 'rematch':
    case 'playoff-rematch':    return 'meets'
    case 'division-clash':     return 'draws'
    case 'spoiler-watch':      return 'plays spoiler against'
    case 'photo-finish':
    case 'razor-close':        return 'edges'
    default:                   return 'vs'
  }
})

/* ─────────────────────────────────────────────────────────────────
   Team lookups + ranks
───────────────────────────────────────────────────────────────── */

const teamIds = computed(() => props.story.teamIds ?? [])

const protagonist = computed<CategoryLeagueDataTeam | undefined>(() => {
  const id = teamIds.value[0]
  if (!id || !props.data) return undefined
  return props.data.teams.find((t) => t.id === id)
})

const antagonist = computed<CategoryLeagueDataTeam | undefined>(() => {
  const id = teamIds.value[1]
  if (!id || !props.data) return undefined
  return props.data.teams.find((t) => t.id === id)
})

function rankForTeam(teamId: string | undefined): number | undefined {
  if (!teamId || !props.data) return undefined
  return props.data.standings.find((s) => s.teamId === teamId)?.rank
}

const protagonistRank = computed(() => rankForTeam(protagonist.value?.id) ?? 1)
const antagonistRank = computed(() => rankForTeam(antagonist.value?.id) ?? 2)

/** Rank delta vs week 1 (positive = climbed). */
function week1Rank(teamId: string | undefined): number | undefined {
  if (!teamId || !props.data) return undefined
  const wk1 = props.data.seasonRankHistory.find((w) => w.week === 1)
  return wk1?.ranks[teamId]
}

const protagonistDelta = computed(() => {
  const w1 = week1Rank(protagonist.value?.id)
  if (typeof w1 !== 'number') {
    // For matchup heroes (where protagonist is just the higher seed),
    // no delta is meaningful — return 0 to hide the trend chip.
    return 0
  }
  return w1 - protagonistRank.value
})

const antagonistDelta = computed(() => {
  const w1 = week1Rank(antagonist.value?.id)
  if (typeof w1 !== 'number') return 0
  return w1 - antagonistRank.value
})
</script>

<style scoped>
/* These styles mirror the legacy inline hero face-off in
   CategoryDemoHomeView. Keeping them scoped to the component so
   removing the inline version doesn't break this rendering. */

.hero {
  position: relative;
  overflow: hidden;
  background: oklch(0.10 0.015 90);
  border: 1px solid oklch(0.20 0.015 90);
  border-radius: 18px;
  padding: 48px 56px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 56px;
  align-items: center;
  margin-bottom: 48px;
}
.hero::before {
  content: '';
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse at 0% 0%, oklch(0.70 0.27 350 / 0.10), transparent 55%),
    radial-gradient(ellipse at 100% 100%, oklch(0.72 0.18 195 / 0.06), transparent 55%);
  pointer-events: none;
}

.hero-copy { position: relative; max-width: 60ch; }
.hero-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  margin: 0 0 18px;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: oklch(0.70 0.27 350);
}
.hero-eyebrow-bar {
  display: inline-block;
  width: 28px;
  height: 2px;
  background: currentColor;
}
.hero-headline {
  margin: 0 0 16px;
  font-family: 'Barlow', sans-serif;
  font-weight: 900;
  font-size: clamp(2.8rem, 6vw, 5.2rem);
  letter-spacing: -0.03em;
  line-height: 0.96;
  color: oklch(0.97 0.005 90);
}
.hero-body {
  margin: 0 0 24px;
  font-size: 1.05rem;
  line-height: 1.55;
  color: oklch(0.78 0.008 90);
  max-width: 48ch;
}

.hero-share {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 9px 16px;
  border-radius: 999px;
  background: transparent;
  border: 1px solid oklch(0.32 0.012 90);
  color: oklch(0.97 0.005 90);
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.82rem;
  font-weight: 800;
  letter-spacing: 0.10em;
  text-transform: uppercase;
  cursor: pointer;
  transition: border-color 140ms cubic-bezier(0.22, 1, 0.36, 1),
              background-color 140ms cubic-bezier(0.22, 1, 0.36, 1);
}
@media (hover: hover) and (pointer: fine) {
  .hero-share:hover { border-color: oklch(0.55 0.010 90); background: oklch(0.14 0.018 90); }
}
.hero-share:active { transform: scale(0.97); }

.hero-faceoff {
  position: relative;
  display: grid;
  grid-template-columns: auto auto auto;
  gap: 36px;
  align-items: center;
  justify-content: end;
}
.hero-faceoff-solo {
  grid-template-columns: auto;
}

.faceoff-team {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  text-align: center;
}
.faceoff-avatar {
  width: 96px;
  height: 96px;
  border-radius: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Barlow', sans-serif;
  font-weight: 900;
  font-size: 1.8rem;
  color: oklch(0.10 0.012 90);
  overflow: hidden;
}
.faceoff-avatar-dim {
  opacity: 0.62;
  filter: saturate(0.8);
}
.avatar-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  border-radius: inherit;
}
.faceoff-meta {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}
.faceoff-name {
  margin: 0;
  font-family: 'Barlow', sans-serif;
  font-weight: 800;
  font-size: 1rem;
  letter-spacing: -0.005em;
  color: oklch(0.97 0.005 90);
}
.faceoff-owner {
  margin: 0;
  font-family: 'Barlow', sans-serif;
  font-size: 0.85rem;
  color: oklch(0.55 0.010 90);
}
.faceoff-rankrow {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-top: 2px;
}
.faceoff-rankchip {
  display: inline-flex;
  align-items: center;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.82rem;
  font-weight: 800;
  letter-spacing: 0.06em;
  padding: 2px 8px;
  border-radius: 6px;
}
.faceoff-rankchip-now {
  background: oklch(0.70 0.27 350 / 0.18);
  color: oklch(0.85 0.20 350);
}
.faceoff-rankchip-fell {
  background: oklch(0.20 0.015 90);
  color: oklch(0.55 0.010 90);
}
.faceoff-trend {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.82rem;
  font-weight: 800;
  letter-spacing: 0.04em;
}
.faceoff-trend-up   { color: oklch(0.74 0.18 145); }
.faceoff-trend-down { color: oklch(0.65 0.20 25); }

.faceoff-verb {
  display: flex;
  align-items: center;
  gap: 8px;
  color: oklch(0.55 0.010 90);
}
.faceoff-verb-line {
  width: 1px;
  height: 56px;
  background: oklch(0.20 0.015 90);
}
.faceoff-verb-word {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

@media (max-width: 960px) {
  .hero {
    grid-template-columns: 1fr;
    gap: 28px;
    padding: 32px 24px;
  }
  .hero-faceoff { justify-content: center; }
}
@media (max-width: 540px) {
  .hero-faceoff { grid-template-columns: 1fr; gap: 20px; }
  .hero-faceoff-solo { grid-template-columns: 1fr; }
  .faceoff-verb { flex-direction: row; }
  .faceoff-verb-line { width: 40px; height: 1px; }
  .faceoff-avatar { width: 80px; height: 80px; font-size: 1.5rem; }
}
</style>
