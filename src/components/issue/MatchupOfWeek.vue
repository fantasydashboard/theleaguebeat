<template>
  <!--
    MatchupOfWeek — two-team callout for the matchup-driven story
    types: matchup-of-week, photo-finish, razor-close, division-clash,
    rematch, playoff-rematch, spoiler-watch.

    This is a curated EDITORIAL callout. It is intentionally distinct
    from the row-style matchup-feed below it so the page does not
    repeat itself.
  -->
  <section class="mow" :aria-labelledby="`mow-headline-${componentId}`">
    <header class="mow-head">
      <p class="mow-eyebrow">
        <span class="mow-eyebrow-bar" aria-hidden="true"></span>
        {{ eyebrow }}
        <span class="issue-cadence issue-cadence-teal" aria-label="Updates weekly">WEEKLY</span>
      </p>
      <h2 class="mow-headline" :id="`mow-headline-${componentId}`">{{ headline }}</h2>
      <p class="issue-byline">
        <span class="issue-byline-tag">THE BEAT</span>
        <span>{{ byline }}</span>
      </p>
    </header>

    <div class="mow-pair" :aria-label="`${home.name} versus ${away.name}`">
      <article class="mow-side mow-side-home">
        <div
          class="mow-avatar"
          :style="{ background: `linear-gradient(135deg, ${home.avatarColor})` }"
          :class="{ 'mow-avatar-placeholder': !hasHome }"
        >
          <img
            v-if="home.avatarUrl && !homeImgErrored"
            :src="home.avatarUrl"
            class="mow-avatar-img"
            alt=""
            @error="homeImgErrored = true"
          />
          <span v-else>{{ home.ownerInitials }}</span>
        </div>
        <div class="mow-side-meta">
          <p class="mow-side-name">{{ home.name }}</p>
          <p v-if="homeRank" class="mow-side-rank">#{{ homeRank }}</p>
          <p v-if="homeCats != null" class="mow-side-score">{{ homeCats }}</p>
        </div>
      </article>

      <div class="mow-vs" aria-hidden="true">
        <span class="mow-vs-line"></span>
        <span class="mow-vs-word">VS</span>
        <span class="mow-vs-line"></span>
      </div>

      <article class="mow-side mow-side-away">
        <div
          class="mow-avatar"
          :style="{ background: `linear-gradient(135deg, ${away.avatarColor})` }"
          :class="{ 'mow-avatar-placeholder': !hasAway }"
        >
          <img
            v-if="away.avatarUrl && !awayImgErrored"
            :src="away.avatarUrl"
            class="mow-avatar-img"
            alt=""
            @error="awayImgErrored = true"
          />
          <span v-else>{{ away.ownerInitials }}</span>
        </div>
        <div class="mow-side-meta">
          <p class="mow-side-name">{{ away.name }}</p>
          <p v-if="awayRank" class="mow-side-rank">#{{ awayRank }}</p>
          <p v-if="awayCats != null" class="mow-side-score">{{ awayCats }}</p>
        </div>
      </article>
    </div>

    <p class="mow-stakes">{{ stakes }}</p>

    <button
      v-if="shareable"
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
import { computed, ref } from 'vue'
import type { SelectedStory } from '@/editorial/detection/types'
import type { CategoryLeagueData, CategoryLeagueDataTeam } from '@/editorial/types'
import { canShare } from '@/editorial/shareability'

/** Image-error fallbacks for ESPN custom-uploaded logos that 401. */
const homeImgErrored = ref(false)
const awayImgErrored = ref(false)

const props = defineProps<{
  story: SelectedStory
  data?: CategoryLeagueData
}>()

const emit = defineEmits<{ (e: 'share', story: SelectedStory): void }>()

const shareable = computed(() => canShare(props.story))

const componentId = Math.random().toString(36).slice(2, 8)

/** Placeholder team shape — keeps the layout intact when a teamId
 *  cannot be resolved against `props.data`. */
function placeholder(label = 'Team'): CategoryLeagueDataTeam {
  return {
    id: 'unknown',
    name: label,
    ownerName: '',
    ownerInitials: '??',
    avatarColor: 'oklch(0.32 0.012 90), oklch(0.20 0.015 90)',
    isMyTeam: false,
  }
}

function lookupTeam(id: string | undefined, label: string): CategoryLeagueDataTeam {
  if (!id) return placeholder(label)
  return props.data?.teams.find((t) => t.id === id) ?? placeholder(label)
}

/** Pull team ids from context.homeTeamId/awayTeamId if available, else
 *  fall back to teamIds[0] and teamIds[1]. */
const homeTeamId = computed<string | undefined>(() => {
  const ctx = props.story.context as { homeTeamId?: unknown }
  if (typeof ctx.homeTeamId === 'string') return ctx.homeTeamId
  return props.story.teamIds?.[0]
})
const awayTeamId = computed<string | undefined>(() => {
  const ctx = props.story.context as { awayTeamId?: unknown }
  if (typeof ctx.awayTeamId === 'string') return ctx.awayTeamId
  return props.story.teamIds?.[1]
})

const home = computed(() => lookupTeam(homeTeamId.value, 'Home'))
const away = computed(() => lookupTeam(awayTeamId.value, 'Away'))
const hasHome = computed(() => home.value.id !== 'unknown')
const hasAway = computed(() => away.value.id !== 'unknown')

/** Optional rank labels off either context or current standings. */
function rankFor(teamId: string | undefined): number | null {
  if (!teamId) return null
  const row = props.data?.standings.find((s) => s.teamId === teamId)
  return row?.rank ?? null
}
const homeRank = computed(() => {
  const ctx = props.story.context as { homeRank?: unknown }
  if (typeof ctx.homeRank === 'number') return ctx.homeRank
  return rankFor(homeTeamId.value)
})
const awayRank = computed(() => {
  const ctx = props.story.context as { awayRank?: unknown }
  if (typeof ctx.awayRank === 'number') return ctx.awayRank
  return rankFor(awayTeamId.value)
})

/** Cat-wins so far, if the story carries them (matchup detectors do). */
const homeCats = computed<number | null>(() => {
  const v = (props.story.context as { homeCatWins?: unknown }).homeCatWins
  return typeof v === 'number' ? v : null
})
const awayCats = computed<number | null>(() => {
  const v = (props.story.context as { awayCatWins?: unknown }).awayCatWins
  return typeof v === 'number' ? v : null
})

const eyebrow = computed(() => {
  switch (props.story.type) {
    case 'matchup-of-week':   return 'Matchup of the week'
    case 'photo-finish':      return 'Photo finish'
    case 'razor-close':       return 'Razor close'
    case 'division-clash':    return 'Division clash'
    case 'rematch':           return 'Rematch'
    case 'playoff-rematch':   return 'Playoff rematch'
    case 'spoiler-watch':     return 'Spoiler watch'
    case 'stakes-week':       return 'Stakes week'
    default:                  return 'Featured matchup'
  }
})

const headline = computed(() => {
  const h = home.value.name || 'Home'
  const a = away.value.name || 'Away'
  switch (props.story.type) {
    case 'matchup-of-week':
      if (homeRank.value && awayRank.value) {
        return `${h} draws ${a}. Seeds ${homeRank.value} and ${awayRank.value}.`
      }
      return `${h} draws ${a}.`
    case 'photo-finish':
      return `${h} and ${a}. One cat decides it.`
    case 'razor-close':
      return `${h} and ${a} are inside a cat.`
    case 'division-clash':
      return `${h} hosts ${a}. Division stakes.`
    case 'rematch':
      return `${h} sees ${a} again.`
    case 'playoff-rematch':
      return `${h} and ${a}. The playoff rematch.`
    case 'spoiler-watch':
      return `${h} hosts ${a}. Eliminated meets contender.`
    case 'stakes-week':
      return `${h} versus ${a}. Stakes week.`
    default:
      return `${h} versus ${a}.`
  }
})

/** Stakes line — one sentence under the pair. Specific where we can be. */
const stakes = computed(() => {
  const ctx = props.story.context as Record<string, unknown>
  const hCats = homeCats.value
  const aCats = awayCats.value
  const contested = typeof ctx.contestedCount === 'number' ? ctx.contestedCount : null
  const status = typeof ctx.status === 'string' ? ctx.status : null

  switch (props.story.type) {
    case 'matchup-of-week':
      if (hCats != null && aCats != null) return `${hCats}-${aCats} on the scoreboard${contested != null ? `, ${contested} cats still in play.` : '.'}`
      if (homeRank.value && awayRank.value) return `Top of the slate. The two highest seeds drew each other.`
      return 'Top of the slate this week.'
    case 'photo-finish':
      if (contested != null) return `${contested} cats unresolved. The split decides it.`
      return 'A one-cat margin going into the final hours.'
    case 'razor-close':
      if (hCats != null && aCats != null) return `${hCats}-${aCats} with cats still live. Margin: one.`
      return 'Inside a single category. Either side can flip it.'
    case 'division-clash':
      return 'Same division. The winner clears air in the bubble.'
    case 'rematch':
      return 'Same two teams from earlier in the year. Different shape this time.'
    case 'playoff-rematch':
      return 'A bracket rerun. The first meeting set the tone.'
    case 'spoiler-watch':
      return 'A team with nothing to lose can take the contender down a peg.'
    case 'stakes-week':
      return 'Both seeds need this one.'
    default:
      if (status === 'live') return 'Live now. The cats are still moving.'
      return 'A matchup worth the click this week.'
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
.mow {
  --ink-1: oklch(0.97 0.005 90);
  --ink-2: oklch(0.78 0.008 90);
  --ink-3: oklch(0.55 0.010 90);
  --ink-4: oklch(0.32 0.012 90);
  --accent-primary:   oklch(0.78 0.18 92);
  --accent-secondary: oklch(0.70 0.27 350);
  --accent-tertiary:  oklch(0.72 0.18 195);

  /* Card-stripped layout: no rounded container, no fill. The
     section bleeds against the page background. A short tone-
     colored accent rule along the top edge replaces the container
     as the visual signature. */
  position: relative;
  padding: 36px 0 32px;
  font-family: 'Barlow', sans-serif;
  color: var(--ink-1);
}
.mow::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 72px;
  height: 3px;
  background: var(--accent-tertiary);
}

.mow-head { margin-bottom: 22px; }
.mow-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.74rem;
  font-weight: 800;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--accent-tertiary);
  margin: 0 0 10px;
}
.mow-eyebrow-bar {
  width: 22px;
  height: 1px;
  background: var(--accent-tertiary);
}
.mow-headline {
  font-family: 'Barlow', sans-serif;
  font-weight: 900;
  /* Capped at 3.6rem so long real-data matchup headlines (with two
     team names + seed callout) don't crowd into the avatar pair. */
  font-size: clamp(2rem, 4.4vw, 3.6rem);
  line-height: 0.98;
  letter-spacing: -0.022em;
  color: var(--ink-1);
  margin: 0;
  max-width: min(28ch, 100%);
  overflow-wrap: anywhere;
}

.mow-pair {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 32px;
  align-items: center;
  margin: 28px 0 32px;
}

.mow-side {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  text-align: center;
}

.mow-avatar {
  /* Feature-spread scale matching HeroFaceoff. Smaller radius reads
     as editorial photo, not app icon; subtler shadow without the
     inner highlight ring. */
  width: 280px;
  height: 280px;
  border-radius: 18px;
  display: grid;
  place-items: center;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 4.4rem;
  letter-spacing: 0.04em;
  color: oklch(0.12 0.012 90);
  box-shadow: 0 30px 80px oklch(0 0 0 / 0.55);
  overflow: hidden;
}
.mow-avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.mow-avatar-placeholder {
  opacity: 0.65;
  color: var(--ink-3);
}

.mow-side-meta {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}
.mow-side-name {
  font-family: 'Barlow', sans-serif;
  font-weight: 800;
  font-size: 1.5rem;
  letter-spacing: -0.005em;
  color: var(--ink-1);
  margin: 0;
  max-width: 16ch;
  overflow-wrap: anywhere;
  text-align: center;
}
.mow-side-rank {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: var(--ink-3);
  margin: 0;
}
.mow-side-score {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 1.6rem;
  line-height: 1;
  color: var(--ink-1);
  margin: 2px 0 0;
}

.mow-vs {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  min-width: 56px;
}
.mow-vs-line {
  width: 1px;
  height: 22px;
  background: oklch(0.30 0.015 90);
}
.mow-vs-word {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.22em;
  color: var(--ink-3);
}

.mow-stakes {
  font-size: 0.98rem;
  line-height: 1.55;
  color: var(--ink-2);
  margin: 0;
  text-align: center;
  max-width: 56ch;
  margin-inline: auto;
}

@media (max-width: 520px) {
  .mow { padding: 22px 18px 22px; border-radius: 18px; }
  .mow-pair { gap: 8px; }
  .mow-avatar { width: 60px; height: 60px; border-radius: 14px; font-size: 1.05rem; }
  .mow-side-score { font-size: 1.25rem; }
  .mow-vs { min-width: 40px; }
  .mow-vs-word { font-size: 0.7rem; letter-spacing: 0.18em; }
  .mow-stakes { font-size: 0.92rem; text-align: left; }
}
@media (max-width: 380px) {
  .mow { padding: 18px 14px 18px; }
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
