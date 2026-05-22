<template>
  <!-- 9:16 vertical share card — designed for iMessage / IG Story /
       group-chat screenshots. Renders any story payload into a
       phone-screen-shaped poster with hero copy + team logos + TLB
       footer mark. Used by useShareStory: mounted offscreen, captured
       to PNG via html-to-image, then unmounted. -->
  <div
    class="share-card"
    :class="`tone-${tone}`"
    :style="cardStyle"
    role="img"
    :aria-label="`Share card: ${headline}`"
  >
    <!-- Masthead bar with TLB logo + issue date -->
    <header class="share-card-mast">
      <img
        src="/tlb-favicon.png"
        alt=""
        class="share-card-mast-mark"
      />
      <div class="share-card-mast-text">
        <span class="share-card-mast-brand">THE LEAGUE BEAT</span>
        <span v-if="meta" class="share-card-mast-meta">{{ meta }}</span>
      </div>
    </header>

    <!-- Eyebrow tag -->
    <p class="share-card-eyebrow">
      <span class="share-card-eyebrow-bar" aria-hidden="true"></span>
      {{ eyebrow }}
    </p>

    <!-- Headline — magazine-cover scale -->
    <h1 class="share-card-headline">{{ headline }}</h1>

    <!-- Body line — supporting detail -->
    <p v-if="body" class="share-card-body">{{ body }}</p>

    <!-- Team(s) — visual proof of the story -->
    <div v-if="teamPair" class="share-card-teams share-card-teams-pair">
      <div class="share-card-team">
        <div
          class="share-card-avatar"
          :style="{ background: `linear-gradient(135deg, ${teamPair[0].avatarColor})` }"
        >
          <img
            v-if="teamPair[0].avatarUrl"
            :src="teamPair[0].avatarUrl"
            alt=""
            class="share-card-avatar-img"
          />
          <span v-else>{{ teamPair[0].ownerInitials }}</span>
        </div>
        <p class="share-card-team-name">{{ teamPair[0].name }}</p>
      </div>
      <span class="share-card-vs" aria-hidden="true">VS</span>
      <div class="share-card-team">
        <div
          class="share-card-avatar"
          :style="{ background: `linear-gradient(135deg, ${teamPair[1].avatarColor})` }"
        >
          <img
            v-if="teamPair[1].avatarUrl"
            :src="teamPair[1].avatarUrl"
            alt=""
            class="share-card-avatar-img"
          />
          <span v-else>{{ teamPair[1].ownerInitials }}</span>
        </div>
        <p class="share-card-team-name">{{ teamPair[1].name }}</p>
      </div>
    </div>

    <div v-else-if="soloTeam" class="share-card-teams share-card-teams-solo">
      <div
        class="share-card-avatar share-card-avatar-lg"
        :style="{ background: `linear-gradient(135deg, ${soloTeam.avatarColor})` }"
      >
        <img
          v-if="soloTeam.avatarUrl"
          :src="soloTeam.avatarUrl"
          alt=""
          class="share-card-avatar-img"
        />
        <span v-else>{{ soloTeam.ownerInitials }}</span>
      </div>
      <p class="share-card-team-name share-card-team-name-lg">{{ soloTeam.name }}</p>
      <p v-if="soloTeam.ownerName" class="share-card-team-owner">{{ soloTeam.ownerName }}</p>
    </div>

    <!-- Spacer pushes the footer down so it sits at the bottom of
         the 9:16 frame regardless of how much body content there is -->
    <div class="share-card-spacer" aria-hidden="true"></div>

    <!-- Footer with full lockup + tagline + URL -->
    <footer class="share-card-foot">
      <div class="share-card-foot-line"></div>
      <div class="share-card-foot-row">
        <p class="share-card-foot-brand">THE LEAGUE BEAT</p>
        <p class="share-card-foot-url">theleaguebeat.com</p>
      </div>
      <p class="share-card-foot-tagline">Your league story, chronicled.</p>
    </footer>
  </div>
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
  /** Optional override for the issue meta line (e.g. "WEEK 8 · 2026").
   *  Falls back to deriving from data.currentWeek + currentSeason. */
  metaOverride?: string
}>()

/* ─────────────────────────────────────────────────────────────────
   Tone — drives the accent color so each story type renders with a
   distinct visual register. Matches the eyebrow tones used in the
   in-page section components for consistency.
───────────────────────────────────────────────────────────────── */

type Tone = 'magenta' | 'gold' | 'teal' | 'up' | 'down' | 'neutral'

const tone = computed<Tone>(() => {
  switch (props.story.type) {
    case 'new-throne':
    case 'locked-top-seed':
    case 'first-time-playoffs':
    case 'three-week-comeback':
    case 'comeback-team':
    case 'cat-sweep':
    case 'streak-built':
    case 'throne-streak':
      return 'up'

    case 'dynasty-falling':
    case 'mathematical-elimination':
    case 'streak-broken':
    case 'three-week-collapse':
    case 'basement-streak':
    case 'cat-shutout':
    case 'blowout':
      return 'down'

    case 'matchup-of-week':
    case 'photo-finish':
    case 'razor-close':
    case 'division-clash':
    case 'rematch':
    case 'playoff-rematch':
      return 'teal'

    case 'newcomer-breakout':
    case 'punt-success':
    case 'identity-shift':
    case 'cat-king-change':
      return 'gold'

    case 'quiet-day':
      return 'neutral'

    default:
      return 'magenta'
  }
})

/* ─────────────────────────────────────────────────────────────────
   Copy — same derivation logic as the in-page section components.
   Headline > body > eyebrow per story type.
───────────────────────────────────────────────────────────────── */

const eyebrow = computed(() => {
  const ctx = props.story.context as Record<string, unknown>
  const explicit = typeof ctx.eyebrow === 'string' ? ctx.eyebrow : null
  if (explicit) return explicit.toUpperCase()

  switch (props.story.type) {
    case 'new-throne':              return 'NEW THRONE'
    case 'dynasty-falling':         return 'TOP SPOT SLIPPING'
    case 'matchup-of-week':         return 'MATCHUP OF THE WEEK'
    case 'cat-sweep':               return 'CAT SWEEP'
    case 'cat-shutout':             return 'CAT SHUTOUT'
    case 'photo-finish':            return 'PHOTO FINISH'
    case 'razor-close':             return 'RAZOR CLOSE'
    case 'comeback-win':            return 'COMEBACK WIN'
    case 'blowout':                 return 'BLOWOUT'
    case 'streak-broken':           return 'STREAK BROKEN'
    case 'streak-built':            return 'HOT STREAK'
    case 'throne-streak':           return 'STILL ON TOP'
    case 'consistency-award':       return 'QUIET CONSISTENCY'
    case 'basement-streak':         return 'BASEMENT WATCH'
    case 'three-week-comeback':     return 'CLIMBING'
    case 'three-week-collapse':     return 'FALLING'
    case 'newcomer-breakout':       return 'NEWCOMER BREAKOUT'
    case 'locked-top-seed':         return 'TOP SEED LOCKED'
    case 'mathematical-elimination':return 'ELIMINATED'
    case 'first-time-playoffs':     return 'INTO THE FIELD'
    case 'division-lead-change':    return 'NEW DIVISION LEAD'
    case 'division-clash':          return 'DIVISION CLASH'
    case 'spoiler-watch':           return 'SPOILER WATCH'
    case 'quiet-day':               return 'QUIET WEEK'
    default:                        return 'THIS WEEK'
  }
})

const headline = computed<string>(() => {
  const ctx = props.story.context as Record<string, unknown>
  const explicit = typeof ctx.headline === 'string' ? ctx.headline : null
  if (explicit) return explicit

  const p = teamPair.value?.[0] ?? soloTeam.value
  const a = teamPair.value?.[1]
  const pName = p?.name ?? 'The leader'
  const aName = a?.name ?? 'the challenger'

  switch (props.story.type) {
    case 'new-throne':           return `${pName} takes the throne.`
    case 'dynasty-falling':      return `Cracks in ${pName}.`
    case 'matchup-of-week':      return `${pName} draws ${aName}.`
    case 'photo-finish':
    case 'razor-close':          return `${pName} edges ${aName}.`
    case 'cat-sweep':            return `${pName} swept the week.`
    case 'cat-shutout':          return `${pName} got swept.`
    case 'comeback-win':         return `${pName} clawed it back.`
    case 'blowout':              return `${pName} ran ${aName} off the field.`
    case 'streak-broken':        return `${pName}'s run ends.`
    case 'streak-built':         return `${pName} is heating up.`
    case 'throne-streak':        return `${pName} holds the throne.`
    case 'consistency-award':    return `${pName} keeps showing up.`
    case 'basement-streak':      return `${pName} can't find the floor.`
    case 'three-week-comeback':  return `${pName} is climbing.`
    case 'three-week-collapse':  return `${pName} keeps falling.`
    case 'newcomer-breakout':    return `${pName} broke through.`
    case 'locked-top-seed':      return `${pName} locked in the top seed.`
    case 'first-time-playoffs':  return `${pName} is in.`
    case 'division-clash':       return `${pName} draws ${aName}.`
    case 'spoiler-watch':        return `${pName} plays spoiler.`
    case 'quiet-day':            return `${pName} holds steady.`
    default:                     return pName
  }
})

const body = computed<string>(() => {
  const ctx = props.story.context as Record<string, unknown>
  const explicit = typeof ctx.body === 'string' ? ctx.body : null
  if (explicit) return explicit
  return ''
})

const meta = computed(() => {
  if (props.metaOverride) return props.metaOverride
  if (!props.data) return ''
  return `WEEK ${props.data.currentWeek} · ${props.data.currentSeason}`
})

/* ─────────────────────────────────────────────────────────────────
   Teams — derive from story.teamIds + data.teams.
───────────────────────────────────────────────────────────────── */

const teamPair = computed<[CategoryLeagueDataTeam, CategoryLeagueDataTeam] | null>(() => {
  const ids = props.story.teamIds ?? []
  if (ids.length < 2 || !props.data) return null
  const a = props.data.teams.find((t) => t.id === ids[0])
  const b = props.data.teams.find((t) => t.id === ids[1])
  if (!a || !b) return null
  return [a, b]
})

const soloTeam = computed<CategoryLeagueDataTeam | null>(() => {
  if (teamPair.value) return null
  const id = props.story.teamIds?.[0]
  if (!id || !props.data) return null
  return props.data.teams.find((t) => t.id === id) ?? null
})

/* ─────────────────────────────────────────────────────────────────
   Card sizing — fixed 1080×1920 (9:16) for high-DPI shareable
   output. Rendered at scale 1 here; html-to-image captures at the
   intrinsic dimensions and the host caller can downscale if needed.
───────────────────────────────────────────────────────────────── */

const cardStyle = computed(() => ({
  width: '1080px',
  height: '1920px',
}))
</script>

<style scoped>
/* All sizing is intentionally absolute (px) because this card is
   captured at a fixed dimension for image export. No fluid scaling. */

.share-card {
  /* Local tokens — duplicated from the demo shell so the card
     renders correctly when mounted outside any layout. */
  --ink-1: oklch(0.97 0.005 90);
  --ink-2: oklch(0.78 0.008 90);
  --ink-3: oklch(0.55 0.010 90);
  --ink-5: oklch(0.20 0.015 90);
  --ink-7: oklch(0.10 0.015 90);
  --ink-8: oklch(0.08 0.014 90);
  --accent-gold:    oklch(0.78 0.18 92);
  --accent-magenta: oklch(0.70 0.27 350);
  --accent-teal:    oklch(0.72 0.18 195);
  --accent-up:      oklch(0.74 0.18 145);
  --accent-down:    oklch(0.65 0.20 25);
  --tone-color: var(--accent-magenta);

  position: relative;
  display: flex;
  flex-direction: column;
  padding: 80px 72px 64px;
  background:
    radial-gradient(ellipse at 0% 0%, color-mix(in oklch, var(--tone-color) 18%, transparent), transparent 55%),
    radial-gradient(ellipse at 100% 100%, oklch(0.72 0.18 195 / 0.10), transparent 55%),
    var(--ink-8);
  color: var(--ink-1);
  font-family: 'Barlow', system-ui, sans-serif;
  overflow: hidden;
  isolation: isolate;
}

.tone-up      { --tone-color: var(--accent-up); }
.tone-down    { --tone-color: var(--accent-down); }
.tone-gold    { --tone-color: var(--accent-gold); }
.tone-teal    { --tone-color: var(--accent-teal); }
.tone-magenta { --tone-color: var(--accent-magenta); }
.tone-neutral { --tone-color: var(--ink-3); }

/* Masthead bar */
.share-card-mast {
  display: flex;
  align-items: center;
  gap: 20px;
  padding-bottom: 32px;
  border-bottom: 1px solid var(--ink-5);
}
.share-card-mast-mark {
  width: 56px;
  height: 56px;
  border-radius: 8px;
}
.share-card-mast-text { display: flex; flex-direction: column; gap: 4px; }
.share-card-mast-brand {
  font-family: 'Barlow', system-ui, sans-serif;
  font-weight: 900;
  font-size: 24px;
  letter-spacing: 0.02em;
}
.share-card-mast-meta {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 18px;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--ink-3);
}

/* Eyebrow */
.share-card-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 16px;
  margin: 60px 0 28px;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 28px;
  font-weight: 800;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--tone-color);
}
.share-card-eyebrow-bar {
  display: inline-block;
  width: 40px;
  height: 3px;
  background: currentColor;
}

/* Headline */
.share-card-headline {
  margin: 0 0 32px;
  font-family: 'Barlow', system-ui, sans-serif;
  font-weight: 900;
  font-size: 128px;
  line-height: 0.96;
  letter-spacing: -0.035em;
  color: var(--ink-1);
}

/* Body */
.share-card-body {
  margin: 0 0 48px;
  font-size: 36px;
  line-height: 1.4;
  color: var(--ink-2);
  max-width: 24ch;
}

/* Teams — pair layout */
.share-card-teams { margin-top: 48px; }
.share-card-teams-pair {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 48px;
}
.share-card-team {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
  text-align: center;
}
.share-card-avatar {
  width: 200px;
  height: 200px;
  border-radius: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Barlow', system-ui, sans-serif;
  font-weight: 900;
  font-size: 64px;
  color: oklch(0.10 0.012 90);
  overflow: hidden;
}
.share-card-avatar-lg {
  width: 280px;
  height: 280px;
  border-radius: 40px;
  font-size: 96px;
}
.share-card-avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  border-radius: inherit;
}
.share-card-team-name {
  margin: 0;
  font-family: 'Barlow', system-ui, sans-serif;
  font-weight: 800;
  font-size: 32px;
  letter-spacing: -0.005em;
  color: var(--ink-1);
  max-width: 14ch;
}
.share-card-team-name-lg {
  font-size: 48px;
  max-width: 16ch;
}
.share-card-team-owner {
  margin: 8px 0 0;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 22px;
  font-weight: 700;
  letter-spacing: 0.10em;
  text-transform: uppercase;
  color: var(--ink-3);
}
.share-card-vs {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 36px;
  font-weight: 800;
  letter-spacing: 0.20em;
  color: var(--ink-3);
}

.share-card-teams-solo {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 32px;
  margin-top: 64px;
}

/* Spacer eats remaining vertical space */
.share-card-spacer { flex: 1; }

/* Footer */
.share-card-foot {
  margin-top: 64px;
}
.share-card-foot-line {
  width: 100%;
  height: 1px;
  background: var(--ink-5);
  margin-bottom: 28px;
}
.share-card-foot-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 24px;
}
.share-card-foot-brand {
  margin: 0;
  font-family: 'Barlow', system-ui, sans-serif;
  font-weight: 900;
  font-size: 36px;
  letter-spacing: 0.04em;
  color: var(--ink-1);
}
.share-card-foot-url {
  margin: 0;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 22px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--tone-color);
}
.share-card-foot-tagline {
  margin: 12px 0 0;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 20px;
  font-weight: 600;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--ink-3);
}
</style>
