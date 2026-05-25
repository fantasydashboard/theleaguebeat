<template>
  <!--
    HERO SOLO — image-led magazine cover when a real team image is
    available; type-led fallback (matching HeroFaceoff) when it isn't.
    The team avatar bleeds off the right edge at hero scale and a
    left-to-right vignette anchors the typography for contrast.

    Why two modes: the "gradient + initials" fallback that worked at
    avatar scale looks like an app-icon placeholder at hero scale.
    When we don't have a real image, type carries the whole cover —
    that's how real magazines handle stories without art.
  -->
  <section
    class="hero"
    :class="[`hero-tone-${tone}`, { 'hero-no-image': !hasImage }]"
    :aria-labelledby="`hero-headline-${componentId}`"
  >
    <!-- Atmospheric backdrop (always present, drives mood) -->
    <div class="hero-backdrop" aria-hidden="true"></div>
    <div class="hero-grain" aria-hidden="true"></div>

    <!-- Image stage — only when we have a real avatar image to lean
         on. Bleeds off the right edge; left-to-right vignette
         maintains type contrast against any logo. -->
    <div v-if="hasImage" class="hero-stage" aria-hidden="true">
      <img
        :src="team.avatarUrl"
        class="hero-art"
        alt=""
        @error="imgErrored = true"
      />
      <div class="hero-vignette"></div>
    </div>

    <!-- Content grid. In image-led mode it's a single column anchored
         left (the image sits absolutely beside it). In no-image mode
         it's a 2-column grid with the sparkline filling the right
         column so the section never looks half-empty. -->
    <div class="hero-grid" :class="{ 'hero-grid-no-image': !hasImage }">
      <div class="hero-copy">
        <p class="hero-eyebrow">
          <span class="hero-eyebrow-bar" aria-hidden="true"></span>
          {{ eyebrow }}
        </p>

        <h1 class="hero-headline" :id="`hero-headline-${componentId}`">
          {{ headline }}
        </h1>

        <p v-if="body" class="hero-body">{{ body }}</p>

        <div v-if="hasTeam" class="hero-meta">
          <span class="hero-meta-team">{{ team.name }}</span>
          <span v-if="team.ownerName" class="hero-meta-sep" aria-hidden="true">·</span>
          <span v-if="team.ownerName" class="hero-meta-owner">{{ team.ownerName }}</span>
          <span v-if="rankBadge" class="hero-meta-rank">
            #{{ rankBadge.now }}
            <span
              v-if="rankBadge.delta !== 0"
              class="hero-meta-delta"
              :class="rankBadge.delta > 0 ? 'hero-meta-delta-up' : 'hero-meta-delta-down'"
            >
              {{ rankBadge.delta > 0 ? '↑' : '↓' }} {{ Math.abs(rankBadge.delta) }}
            </span>
          </span>
        </div>

        <!-- Byline sits IN the copy column, right under the meta.
             Magazine convention: byline anchors the story, not a
             separate footer. Compact, no "THE BEAT" tag (the
             masthead already says "The League Beat"). -->
        <p class="hero-byline-inline">{{ byline }}</p>
      </div>

      <aside
        v-if="!hasImage && hasRankHistory"
        class="hero-spark"
        aria-label="Rank trajectory"
      >
        <p class="hero-spark-label">RANK · LAST {{ historyWeeks }} WEEKS</p>
        <RankSparkline
          :data="data!"
          :focus-team-ids="focusTeamIds"
          :focus-colors="focusColors"
          :aria-label="`Rank trajectory for ${team.name}`"
        />
      </aside>
    </div>

    <!-- Share button absolutely positioned at the top-right, small
         and unobtrusive. Per-story share is meaningful but doesn't
         need a full footer row. -->
    <button
      v-if="shareable"
      type="button"
      class="hero-share-floating"
      :aria-label="`Share ${headline} to your league chat`"
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
import { composeHeroDeck } from '@/editorial/composition/heroDeck'
import RankSparkline from '@/components/issue/RankSparkline.vue'

/** Image-error fallback. ESPN custom-uploaded logos 401 from their
 *  CDN; when that fires we switch to the type-led no-image layout
 *  rather than show a broken-image icon or fall back to a gradient
 *  placeholder that reads as a UI element. */
const imgErrored = ref(false)

const props = defineProps<{
  story: SelectedStory
  data?: CategoryLeagueData
}>()

const emit = defineEmits<{ (e: 'share', story: SelectedStory): void }>()

const shareable = computed(() => canShare(props.story))

const componentId = Math.random().toString(36).slice(2, 8)

const teamId = computed<string | undefined>(() => {
  const ctxId = (props.story.context as { teamId?: unknown }).teamId
  if (typeof ctxId === 'string') return ctxId
  return props.story.teamIds?.[0]
})

const PLACEHOLDER_TEAM: CategoryLeagueDataTeam = {
  id: 'unknown',
  name: 'Team unknown',
  ownerName: '',
  ownerInitials: '??',
  avatarColor: 'oklch(0.32 0.012 90), oklch(0.20 0.015 90)',
  isMyTeam: false,
}

const team = computed<CategoryLeagueDataTeam>(() => {
  const id = teamId.value
  if (!id) return PLACEHOLDER_TEAM
  return props.data?.teams.find((t) => t.id === id) ?? PLACEHOLDER_TEAM
})

const hasTeam = computed(() => team.value.id !== 'unknown')

/** Switch to image-led layout only when we have a real, working
 *  avatar image. Otherwise the cover renders type-led. */
const hasImage = computed(
  () => Boolean(team.value.avatarUrl) && !imgErrored.value,
)

const rankBadge = computed<{ now: number; delta: number } | null>(() => {
  const ctx = props.story.context as {
    fromRank?: unknown
    toRank?: unknown
  }
  const from = typeof ctx.fromRank === 'number' ? ctx.fromRank : undefined
  const to = typeof ctx.toRank === 'number' ? ctx.toRank : undefined
  if (to == null) return null
  const delta = from != null ? from - to : 0
  return { now: to, delta }
})

const tone = computed<'magenta' | 'gold' | 'teal' | 'green' | 'red'>(() => {
  switch (props.story.type) {
    case 'locked-top-seed':
    case 'throne-streak':
    case 'first-above-500':
      return 'gold'
    case 'hot-climber':
    case 'comeback-team':
    case 'three-week-comeback':
    case 'streak-built':
    case 'consistency-award':
    case 'first-time-playoffs':
    case 'newcomer-breakout':
    case 'cat-sweep':
      return 'green'
    case 'three-week-collapse':
    case 'streak-broken':
    case 'mathematical-elimination':
    case 'first-below-500':
    case 'basement-streak':
    case 'cat-shutout':
    case 'blowout':
      return 'red'
    case 'identity-shift':
    case 'cat-king-change':
    case 'cat-domination':
      return 'teal'
    default:
      return 'magenta'
  }
})

const eyebrow = computed(() => eyebrowFor(props.story.type))

function eyebrowFor(type: string): string {
  switch (type) {
    case 'hot-climber':           return 'Hot climber'
    case 'comeback-team':         return 'Comeback'
    case 'three-week-comeback':   return 'Three weeks up'
    case 'three-week-collapse':   return 'Three weeks down'
    case 'throne-streak':         return 'Throne held'
    case 'locked-top-seed':       return 'Top seed locked'
    case 'streak-built':          return 'Hot streak'
    case 'streak-broken':         return 'Streak broken'
    case 'consistency-award':     return 'Quiet consistency'
    case 'inconsistency-award':   return 'Up and down'
    case 'basement-streak':       return 'Basement watch'
    case 'mathematical-elimination': return 'Eliminated'
    case 'first-time-playoffs':   return 'Into the bubble'
    case 'first-above-500':       return 'Above .500'
    case 'first-below-500':       return 'Below .500'
    case 'newcomer-breakout':     return 'Breakout week'
    case 'bubble-surprise':       return 'Bubble surprise'
    case 'identity-shift':        return 'New identity'
    case 'cat-sweep':             return 'Sweep'
    case 'cat-shutout':           return 'Shutout'
    case 'blowout':               return 'Blowout'
    case 'punt-success':          return 'Punt vindicated'
    case 'punt-failure':          return 'Punt collapse'
    case 'wild-card-shift':       return 'Wild card shift'
    case 'spoiler-mode':          return 'Spoiler mode'
    default:                      return 'This week'
  }
}

/** Prefer the detector-set headline when present. Detectors for
 *  player nights, trades, IL events, and snapshot deltas ship a
 *  rich subject-specific headline ("Jordan Walker hit three.")
 *  that beats the team-centric fallback ("X is the story this
 *  week.") for those story types. */
const headline = computed(() => {
  const ctx = props.story.context as Record<string, unknown>
  const explicit = typeof ctx.headline === 'string' ? ctx.headline.trim() : ''
  if (explicit) return explicit
  return headlineFor(props.story.type, team.value.name, ctx)
})

function headlineFor(type: string, name: string, ctx: Record<string, unknown>): string {
  const safeName = name || 'This team'
  const spotsClimbed = typeof ctx.spotsClimbed === 'number' ? ctx.spotsClimbed : null
  const weeksAtTop  = typeof ctx.weeks === 'number' ? ctx.weeks : (typeof ctx.weeksAtTop === 'number' ? ctx.weeksAtTop : null)
  const streakLength = typeof ctx.streakLength === 'number' ? ctx.streakLength : (typeof ctx.brokenStreakLength === 'number' ? ctx.brokenStreakLength : null)
  const weeks = typeof ctx.weeks === 'number' ? ctx.weeks : null
  const fromRank = typeof ctx.fromRank === 'number' ? ctx.fromRank : null
  const toRank   = typeof ctx.toRank === 'number' ? ctx.toRank : null

  switch (type) {
    case 'hot-climber':
      if (spotsClimbed && spotsClimbed >= 4) return `${safeName} climbed ${spellOut(spotsClimbed)} spots.`
      return `${safeName} climbs the board.`
    case 'comeback-team':
      return `${safeName} is back.`
    case 'three-week-comeback':
      return 'Three weeks of gains.'
    case 'three-week-collapse':
      return 'Three weeks of slide.'
    case 'throne-streak':
      if (weeksAtTop && weeksAtTop >= 2) return `${safeName} holds the throne. ${capitalize(spellOut(weeksAtTop))} weeks running.`
      return `${safeName} holds the throne.`
    case 'locked-top-seed':
      return `${safeName} locked in number one.`
    case 'streak-built':
      if (streakLength) return `${safeName} ran it to ${streakLength}.`
      return `${safeName} is on a tear.`
    case 'streak-broken':
      if (streakLength && streakLength >= 3) return `${spellOut(streakLength)}-game run snapped.`
      return 'The streak ends.'
    case 'consistency-award':
      return `${safeName} holds the line.`
    case 'inconsistency-award':
      return `${safeName} can't pick a lane.`
    case 'basement-streak':
      if (weeks && weeks >= 3) return `${safeName} sits in the basement. ${capitalize(spellOut(weeks))} weeks running.`
      return `${safeName} can't climb out.`
    case 'mathematical-elimination':
      return `${safeName} is out.`
    case 'first-time-playoffs':
      return `${safeName} cracks the bubble.`
    case 'first-above-500':
      return `${safeName} crossed .500.`
    case 'first-below-500':
      return `${safeName} slipped to .500.`
    case 'newcomer-breakout':
      return `${safeName} cooked.`
    case 'bubble-surprise':
      return `${safeName} crashed the bubble.`
    case 'identity-shift':
      return `${safeName} flipped the script.`
    case 'cat-sweep':
      return `${safeName} swept the week.`
    case 'cat-shutout':
      return `${safeName} got shut out.`
    case 'blowout':
      return `${safeName} ran away with it.`
    case 'punt-success':
      return `${safeName} punted and won.`
    case 'punt-failure':
      return `${safeName} punted and paid.`
    case 'wild-card-shift':
      if (toRank && fromRank) return `${safeName} moved to seed ${toRank}.`
      return `${safeName} shifted the wild card race.`
    case 'spoiler-mode':
      return `${safeName} plays spoiler.`
    default:
      return `${safeName} is the story this week.`
  }
}

/** Prefer the rich multi-sentence deck from the composer. Falls
 *  back to the single-line bodyFor map when the deck composer has
 *  no variants for this story type yet. */
const body = computed(() => {
  const deck = composeHeroDeck(props.story, props.data)
  if (deck) return deck
  return bodyFor(props.story.type, team.value.name, props.story.context)
})

function bodyFor(type: string, name: string, ctx: Record<string, unknown>): string {
  const safeName = name || 'This team'
  const spotsClimbed = typeof ctx.spotsClimbed === 'number' ? ctx.spotsClimbed : null
  const fromRank = typeof ctx.fromRank === 'number' ? ctx.fromRank : null
  const toRank   = typeof ctx.toRank === 'number' ? ctx.toRank : null
  const weeks    = typeof ctx.weeks === 'number' ? ctx.weeks : null
  const weeksAtTop = typeof ctx.weeksAtTop === 'number' ? ctx.weeksAtTop : null
  const streakLength = typeof ctx.streakLength === 'number' ? ctx.streakLength : null
  const gamesAhead = typeof ctx.gamesAhead === 'number' ? ctx.gamesAhead : null
  const weeksRemaining = typeof ctx.weeksRemaining === 'number' ? ctx.weeksRemaining : null

  switch (type) {
    case 'hot-climber':
      if (fromRank && toRank) return `From #${fromRank} in week one to #${toRank} today.`
      if (spotsClimbed) return `${spotsClimbed} spots since week one. The board reshuffled around them.`
      return 'The board reshuffled.'
    case 'comeback-team':
      if (fromRank && toRank) return `Sat at #${fromRank} three weeks ago. Now #${toRank}.`
      return 'Out of the basement and back in the conversation.'
    case 'three-week-comeback':
      return `${safeName} climbed in each of the last three weeks. Nothing flashy, just steady.`
    case 'three-week-collapse':
      return `${safeName} slipped in each of the last three weeks. The slide is real.`
    case 'throne-streak':
      if (weeksAtTop) return `${weeksAtTop} straight weeks at number one. Nobody has cracked the lead.`
      return 'The seat at the top has not moved.'
    case 'locked-top-seed':
      if (gamesAhead && weeksRemaining) return `${gamesAhead} cat wins ahead with ${weeksRemaining} to play. The math is closed.`
      return 'The math is closed. The top seed belongs to them.'
    case 'streak-built':
      if (streakLength) return `${streakLength} straight wins. The shape of the standings is shifting.`
      return 'Wins are stacking.'
    case 'streak-broken':
      return `${safeName} took a loss after a long run. The board resets.`
    case 'consistency-award':
      return `${safeName} won four of six. Quiet, steady, hard to bet against.`
    case 'inconsistency-award':
      return `Three wins, three losses, alternating. Read the next result anyway.`
    case 'basement-streak':
      if (weeks) return `${weeks} straight weeks near the bottom. Draft season is starting to feel close.`
      return 'A long stay at the bottom.'
    case 'mathematical-elimination':
      return `${safeName} cannot reach the cut line. Playing for next year now.`
    case 'first-time-playoffs':
      return 'First time above the bubble all year. The schedule still has games.'
    case 'first-above-500':
      return `${safeName} pushed over .500 for the first time this season.`
    case 'first-below-500':
      return `${safeName} dropped under .500. The first time it has happened this year.`
    case 'newcomer-breakout':
      return 'A team under .500 just lit up the week. The board notices.'
    case 'bubble-surprise':
      return 'Two weeks ago they were nowhere near it. Now they sit on the line.'
    case 'identity-shift':
      return 'The category profile has flipped. What worked last month does not work now.'
    case 'cat-sweep':
      return 'Every category. No splits. A clean week.'
    case 'cat-shutout':
      return `${safeName} took the zero. A loud week and not the good kind.`
    case 'blowout':
      return 'A category beating that closed early. Coast mode kicked in.'
    case 'punt-success':
      return 'The punted category did not matter. The rest of the slate did.'
    case 'punt-failure':
      return 'The punted category came back to bite.'
    case 'wild-card-shift':
      return 'The middle of the standings just moved.'
    case 'spoiler-mode':
      return 'An eliminated team is taking points from a contender. Stakes shift.'
    default:
      return `${safeName} is the team carrying this week.`
  }
}

function capitalize(s: string): string {
  if (!s) return s
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function spellOut(n: number): string {
  const words = ['zero','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve']
  return words[n] ?? String(n)
}

const byline = computed(() => {
  if (!props.story) return ''
  const minutesAgo = Math.max(5, Math.round((1 - props.story.freshness) * 60 * 6))
  if (minutesAgo < 60) return `FILED · ${minutesAgo} MIN AGO`
  const hr = Math.round(minutesAgo / 60)
  if (hr < 24) return `FILED · ${hr} HR AGO`
  const d = Math.round(hr / 24)
  return `FILED · ${d} DAY${d === 1 ? '' : 'S'} AGO`
})

/* ─────────────────────────────────────────────────────────────────
   Sparkline data — single focus team. Tone drives the line color
   (green for climbs, red for falls, gold for steady-at-top).
───────────────────────────────────────────────────────────────── */

const hasRankHistory = computed(
  () => (props.data?.seasonRankHistory.length ?? 0) >= 2,
)

const historyWeeks = computed(
  () => props.data?.seasonRankHistory.length ?? 0,
)

const focusTeamIds = computed(() => {
  return hasTeam.value ? [team.value.id] : []
})

const focusColors = computed<string[]>(() => {
  switch (tone.value) {
    case 'green': return ['oklch(0.74 0.18 145)']
    case 'red':   return ['oklch(0.65 0.20 25)']
    case 'gold':  return ['oklch(0.78 0.18 92)']
    case 'teal':  return ['oklch(0.72 0.18 195)']
    default:      return ['oklch(0.70 0.27 350)']
  }
})
</script>

<style scoped>
/* ─────────────────────────────────────────────────────────────────
   HERO SOLO — image-led when art is available, type-led otherwise.
   Same tonal vocabulary as HeroFaceoff so the page reads as one
   coherent magazine voice.
───────────────────────────────────────────────────────────────── */

.hero {
  position: relative;
  padding: 48px 0;
  isolation: isolate;
  margin-bottom: 24px;
  overflow: hidden;
}

/* Content grid. Default single-column for image-led mode (image
   bleeds beside via absolute positioning). In no-image mode the
   grid splits 2fr/1fr so the sparkline fills the right column. */
.hero-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 32px;
  align-items: start;
}
.hero-grid-no-image {
  grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
  gap: 56px;
}

.hero-tone-magenta { --hero-hue: 350; --hero-accent: oklch(0.70 0.27 350); }
.hero-tone-gold    { --hero-hue: 92;  --hero-accent: oklch(0.78 0.18 92);  }
.hero-tone-teal    { --hero-hue: 195; --hero-accent: oklch(0.72 0.18 195); }
.hero-tone-green   { --hero-hue: 145; --hero-accent: oklch(0.74 0.18 145); }
.hero-tone-red     { --hero-hue: 25;  --hero-accent: oklch(0.65 0.20 25);  }

/* Atmospheric backdrop — layered radial washes. */
.hero-backdrop {
  position: absolute;
  inset: -80px -100px;
  z-index: -2;
  background:
    radial-gradient(
      ellipse 70% 60% at 15% 30%,
      oklch(0.22 0.14 var(--hero-hue) / 0.50) 0%,
      transparent 60%
    ),
    radial-gradient(
      ellipse 50% 50% at 90% 100%,
      oklch(0.18 0.10 var(--hero-hue) / 0.25) 0%,
      transparent 60%
    ),
    linear-gradient(180deg, oklch(0.07 0.014 90) 0%, oklch(0.05 0.012 90) 100%);
  pointer-events: none;
}

/* Film grain — bumped to 0.14 opacity so it actually registers as
   editorial texture against the dark background. */
.hero-grain {
  position: absolute;
  inset: 0;
  z-index: -1;
  pointer-events: none;
  opacity: 0.14;
  mix-blend-mode: overlay;
  background-image: url("data:image/svg+xml;utf8,<svg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");
}

/* ── Image stage (image-led mode only) ─────────────────────── */
.hero-stage {
  position: absolute;
  top: -40px;
  bottom: -40px;
  right: -160px;
  width: 780px;
  z-index: 0;
  overflow: hidden;
}
.hero-art {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  filter: saturate(1.05) contrast(1.05);
}
/* Left-to-right vignette anchors typography against any logo. */
.hero-vignette {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(
      90deg,
      oklch(0.05 0.012 90) 0%,
      oklch(0.05 0.012 90 / 0.92) 18%,
      oklch(0.05 0.012 90 / 0.55) 38%,
      oklch(0.05 0.012 90 / 0.15) 60%,
      transparent 100%
    ),
    /* Bottom shadow ensures footer-area legibility. */
    linear-gradient(
      180deg,
      transparent 60%,
      oklch(0.05 0.012 90 / 0.6) 100%
    );
}

/* ── Copy column ──────────────────────────────────────────── */
.hero-copy {
  position: relative;
  z-index: 1;
}

/* In image-led mode the image bleeds beside the copy column, so
   we cap the copy width to the left half. The grid layout handles
   constraint in no-image mode. */
.hero:not(.hero-no-image) .hero-copy { max-width: 58ch; }

.hero-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 14px;
  margin: 0 0 32px;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: 0.88rem;
  letter-spacing: 0.24em;
  text-transform: uppercase;
  color: var(--hero-accent);
}
.hero-eyebrow-bar {
  display: inline-block;
  width: 36px;
  height: 2px;
  background: currentColor;
}
.hero-cadence {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 999px;
  background: oklch(0.10 0.015 90 / 0.85);
  border: 1px solid oklch(0.20 0.015 90);
  color: oklch(0.65 0.010 90);
  font-size: 0.66rem;
  letter-spacing: 0.18em;
  font-weight: 700;
  margin-left: 4px;
  backdrop-filter: blur(8px);
}

/* ── Headline ─────────────────────────────────────────────────
   3.6rem cap matches HeroFaceoff. Crisp edges, no drop shadow. */
.hero-headline {
  margin: 0 0 24px;
  font-family: 'Barlow', sans-serif;
  font-weight: 900;
  font-size: clamp(2rem, 4.2vw, 3.6rem);
  line-height: 0.98;
  letter-spacing: -0.03em;
  color: oklch(0.97 0.005 90);
  text-wrap: balance;
}

.hero-body {
  margin: 0 0 28px;
  font-family: 'Barlow', sans-serif;
  font-weight: 500;
  font-size: 1.3rem;
  line-height: 1.4;
  color: oklch(0.85 0.008 90);
  max-width: 52ch;
}

/* ── Sparkline aside (no-image fallback only) ────────────── */
.hero-spark {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 240px;
}
.hero-spark-label {
  margin: 0;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 700;
  font-size: 0.72rem;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: oklch(0.50 0.010 90);
}

/* ── Team meta strip ──────────────────────────────────────── */
.hero-meta {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  margin: 0 0 36px;
  padding: 8px 16px;
  background: oklch(0.08 0.015 90 / 0.75);
  border: 1px solid oklch(0.18 0.015 90);
  border-radius: 999px;
  backdrop-filter: blur(8px);
  flex-wrap: wrap;
}
.hero-meta-team {
  font-family: 'Barlow', sans-serif;
  font-weight: 800;
  font-size: 1.05rem;
  color: oklch(0.97 0.005 90);
  letter-spacing: -0.005em;
}
.hero-meta-sep { color: oklch(0.32 0.012 90); }
.hero-meta-owner {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 600;
  font-size: 0.86rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: oklch(0.65 0.010 90);
}
.hero-meta-rank {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 0.92rem;
  letter-spacing: 0.04em;
  padding: 3px 9px;
  border-radius: 6px;
  background: oklch(var(--hero-hue-bg, 0.78) 0.18 var(--hero-hue) / 0.20);
  color: var(--hero-accent);
}
.hero-meta-delta {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: 0.76rem;
}
.hero-meta-delta-up   { color: oklch(0.74 0.18 145); }
.hero-meta-delta-down { color: oklch(0.65 0.20 25); }

/* ── Byline (inline, under the meta) ──────────────────────── */
/* Sits in the copy column right under .hero-meta. No prefix tag
   (the masthead already establishes the publication slot). Just
   "Filed N min ago" treated as the byline. */
.hero-byline-inline {
  margin: 14px 0 0;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 700;
  font-size: 0.72rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: oklch(0.50 0.010 90);
}

/* ── Floating share (top-right, unobtrusive) ──────────────── */
.hero-share-floating {
  position: absolute;
  top: 24px;
  right: 24px;
  z-index: 4;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 13px;
  border-radius: 999px;
  background: oklch(0.10 0.010 90 / 0.75);
  border: 1px solid oklch(0.30 0.010 90 / 0.65);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  color: oklch(0.95 0.005 90);
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.74rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  cursor: pointer;
  transition:
    border-color 140ms cubic-bezier(0.22, 1, 0.36, 1),
    background-color 140ms cubic-bezier(0.22, 1, 0.36, 1);
}
@media (hover: hover) and (pointer: fine) {
  .hero-share-floating:hover {
    border-color: oklch(0.60 0.010 90);
    background: oklch(0.14 0.018 90 / 0.85);
  }
}
.hero-share-floating:active { transform: scale(0.97); }
@media (max-width: 720px) {
  .hero-share-floating { top: 16px; right: 16px; padding: 6px 11px; font-size: 0.70rem; }
}

@media (max-width: 960px) {
  /* On narrower screens the bleeding image gets cramped against the
     copy. Pull it tighter and reduce its size so the cover still
     reads. The vignette stretches further left to keep contrast. */
  .hero-stage { width: 460px; right: -100px; }
  .hero-vignette {
    background:
      linear-gradient(
        90deg,
        oklch(0.05 0.012 90) 0%,
        oklch(0.05 0.012 90 / 0.95) 25%,
        oklch(0.05 0.012 90 / 0.6) 55%,
        transparent 100%
      );
  }
}

@media (max-width: 720px) {
  .hero { padding: 36px 0; min-height: 420px; }
  .hero-headline { font-size: clamp(2.6rem, 10vw, 4rem); margin-bottom: 20px; }
  .hero-body { font-size: 1.05rem; }
  .hero-meta { padding: 6px 12px; gap: 8px; }
  .hero-meta-team { font-size: 0.95rem; }
  /* On phones the image takes too much space; shrink and let the
     vignette do more lifting. */
  .hero-stage { width: 320px; right: -80px; top: 0; bottom: 0; }
}
</style>
