<template>
  <!-- WEEKLY COVER — magazine-style cover that frames an entire
       issue (week). Distinct from the hero (which is the current
       lede, updates as data shifts). The cover is committed: it
       says "this is what Issue 10 was about" and lives there all
       week.

       Type-led design. No image dependency — works for every league
       on day one. Image-led + player-led variants can ship later.

       Sits between the masthead and the hero in the home view, so
       the page reads: nameplate → cover → today's lede → wire → etc.
       — same flow as a real magazine. -->
  <section v-if="cover" class="cover" :class="`cover-tone-${tone}`" :aria-labelledby="`cover-headline-${cover.story.signature}`">
    <!-- Tone-colored accent rail along the left edge. The single
         brand-color signal that anchors the cover visually without
         a busy backdrop. -->
    <div class="cover-rail" aria-hidden="true"></div>

    <header class="cover-head">
      <p class="cover-issue">
        <span class="cover-issue-tag">Issue {{ issueNumber }}</span>
        <span v-if="weekOf" class="cover-issue-week">Week of {{ weekOf }}</span>
      </p>
      <button
        v-if="shareable"
        type="button"
        class="cover-share"
        :aria-label="`Share Issue ${issueNumber}'s cover`"
        @click="emit('share', cover.story)"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
          <polyline points="16 6 12 2 8 6"/>
          <line x1="12" y1="2" x2="12" y2="15"/>
        </svg>
        Share
      </button>
    </header>

    <div class="cover-body">
      <p class="cover-eyebrow">
        <span class="cover-eyebrow-dot" aria-hidden="true"></span>
        Cover story
      </p>

      <h1 class="cover-headline" :id="`cover-headline-${cover.story.signature}`">
        {{ headline }}
      </h1>

      <p v-if="deck" class="cover-deck">{{ deck }}</p>
    </div>

    <footer class="cover-foot" aria-hidden="true">
      <span class="cover-foot-mark">THE LEAGUE BEAT</span>
      <span class="cover-foot-sep">·</span>
      <span class="cover-foot-issue">VOL. {{ vol }} · ISSUE {{ issueNumber }}</span>
    </footer>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { SelectedStory } from '@/editorial/detection/types'
import type { CategoryLeagueData } from '@/editorial/types'
import { composeWeeklyCover, type WeeklyCover as WeeklyCoverShape } from '@/editorial/composition/weeklyCover'
import { composeHeroDeck } from '@/editorial/composition/heroDeck'
import { canShare } from '@/editorial/shareability'

const props = defineProps<{
  /** Same selected stories the home page already computes for hero
   *  + sections. The cover composer just re-ranks them with the
   *  longer-window logic. */
  stories: SelectedStory[]
  /** League data — needed for team-name lookups in the deck. */
  data?: CategoryLeagueData
  /** Issue number — usually data.currentWeek (the masthead uses
   *  this too). Falls back to 1. */
  issueNumber?: number
  /** Magazine volume number (years the league has existed). */
  vol?: number
  /** Week-of date string for the issue, e.g. "May 25". Computed
   *  outside so the same formatting drives the masthead. */
  weekOf?: string
}>()

const emit = defineEmits<{ (e: 'share', story: SelectedStory): void }>()

const cover = computed<WeeklyCoverShape | null>(() =>
  composeWeeklyCover(props.stories, { currentWeek: props.issueNumber }),
)

const issueNumber = computed(() => props.issueNumber ?? 1)
const vol = computed(() => props.vol ?? 1)

const shareable = computed(() =>
  cover.value ? canShare(cover.value.story) : false,
)

/** Cover headline. Prefers the detector-set context.headline (for
 *  player nights, trades, etc.) over a generic fallback. Magazine
 *  covers reward strong specific lines, not "Goof Juice is the
 *  story this week." */
const headline = computed<string>(() => {
  if (!cover.value) return ''
  const ctx = cover.value.story.context as Record<string, unknown>
  const explicit = typeof ctx.headline === 'string' ? ctx.headline.trim() : ''
  if (explicit) return explicit
  // Fallback: derive a sensible cover line from the story type.
  return fallbackHeadline(cover.value.story.type, ctx)
})

const deck = computed<string>(() => {
  if (!cover.value) return ''
  return composeHeroDeck(cover.value.story, props.data)
})

/** Tone drives the accent rail color. Mirrors the per-story-type
 *  tone choices used elsewhere so the cover's color signal is
 *  consistent with how that story appears in the Wire and hero. */
const tone = computed<'magenta' | 'gold' | 'teal' | 'up' | 'down'>(() => {
  if (!cover.value) return 'magenta'
  const type = cover.value.story.type
  if (type === 'blockbuster-trade' || type === 'lopsided-trade') return 'gold'
  if (type === 'new-throne' || type === 'dynasty-falling' || type === 'dethroned-rivalry') return 'magenta'
  if (type === 'monster-night' || type === 'three-hr-game' || type === 'twelve-k-game' || type === 'no-hitter') return 'gold'
  if (type === 'comeback-team' || type === 'hot-climber' || type === 'streak-built' || type === 'three-week-comeback') return 'up'
  if (type === 'streak-broken' || type === 'three-week-collapse') return 'down'
  if (type === 'photo-finish' || type === 'comeback-win') return 'teal'
  return 'magenta'
})

function fallbackHeadline(type: string, ctx: Record<string, unknown>): string {
  const teamName = typeof ctx.teamName === 'string' ? ctx.teamName : ''
  switch (type) {
    case 'blockbuster-trade':    return 'The trade that reshaped the week.'
    case 'new-throne':           return teamName ? `${teamName} takes the throne.` : 'A new leader.'
    case 'dynasty-falling':      return teamName ? `${teamName}, no longer.` : 'The reign ends.'
    case 'monster-night':
    case 'three-hr-game':
    case 'twelve-k-game':        return 'The night that bent the standings.'
    case 'comeback-team':        return teamName ? `${teamName} is back.` : 'The comeback is real.'
    case 'streak-broken':        return teamName ? `The ${teamName} streak ends.` : 'A streak ends.'
    case 'photo-finish':         return 'A photo finish.'
    default:                     return 'This week, in your league.'
  }
}
</script>

<style scoped>
.cover {
  /* Magazine cover scale — substantial but not full-screen. Daily
     users can scroll past it; lean-back readers get a real cover
     moment. */
  position: relative;
  display: grid;
  grid-template-rows: auto 1fr auto;
  gap: 28px;
  min-height: 56vh;
  padding: 48px 48px 36px 64px;  /* extra left padding for the rail */
  background:
    radial-gradient(
      circle at 80% 20%,
      oklch(0.11 0.012 90) 0%,
      oklch(0.06 0.012 90) 60%
    );
  border: 1px solid oklch(0.16 0.015 90);
  border-radius: 18px;
  overflow: hidden;
  margin-bottom: 28px;
}

/* Tone tokens — drives the rail color + a faint tinted edge so the
   cover has a brand-color signal without a busy backdrop. */
.cover-tone-magenta { --cover-accent: oklch(0.70 0.27 350); }
.cover-tone-gold    { --cover-accent: oklch(0.78 0.18 92); }
.cover-tone-teal    { --cover-accent: oklch(0.72 0.18 195); }
.cover-tone-up      { --cover-accent: oklch(0.74 0.18 145); }
.cover-tone-down    { --cover-accent: oklch(0.65 0.20 25); }

/* Subtle accent glow at the top-right corner, picks up the tone. */
.cover::after {
  content: '';
  position: absolute;
  top: -120px;
  right: -120px;
  width: 360px;
  height: 360px;
  background: radial-gradient(circle, var(--cover-accent), transparent 60%);
  opacity: 0.18;
  pointer-events: none;
}

.cover-rail {
  position: absolute;
  top: 24px;
  bottom: 24px;
  left: 24px;
  width: 3px;
  background: var(--cover-accent);
  border-radius: 999px;
}

/* ── Head: issue badge + share ────────────────────────────── */
.cover-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  position: relative;
  z-index: 1;
}

.cover-issue {
  display: inline-flex;
  align-items: center;
  gap: 14px;
  margin: 0;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: 0.78rem;
  letter-spacing: 0.22em;
  text-transform: uppercase;
}
.cover-issue-tag {
  padding: 4px 10px;
  border-radius: 4px;
  background: var(--cover-accent);
  color: oklch(0.10 0.012 90);
}
.cover-issue-week {
  color: oklch(0.55 0.010 90);
}

.cover-share {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 13px;
  border-radius: 999px;
  background: transparent;
  border: 1px solid oklch(0.32 0.012 90);
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
  .cover-share:hover {
    border-color: oklch(0.60 0.010 90);
    background: oklch(0.14 0.018 90);
  }
}
.cover-share:active { transform: scale(0.97); }

/* ── Body: eyebrow + headline + deck ──────────────────────── */
.cover-body {
  display: flex;
  flex-direction: column;
  gap: 18px;
  position: relative;
  z-index: 1;
  max-width: min(880px, 100%);
  /* Vertical centering within the grid's 1fr row. */
  align-self: center;
  padding: 12px 0;
}

.cover-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  margin: 0;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: 0.80rem;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--cover-accent);
}
.cover-eyebrow-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--cover-accent);
}

.cover-headline {
  /* Massive — this is the cover line. Bigger than the hero
     headline by design; the cover is the loudest thing on the
     page when it's there. */
  margin: 0;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: clamp(2.6rem, 5.4vw, 4.6rem);
  line-height: 0.98;
  letter-spacing: -0.018em;
  color: oklch(0.97 0.005 90);
  text-wrap: balance;
  max-width: 16ch;
}

.cover-deck {
  margin: 0;
  font-family: 'Barlow', sans-serif;
  font-size: 1.10rem;
  line-height: 1.55;
  color: oklch(0.82 0.008 90);
  max-width: 62ch;
}

/* ── Foot: small publication mark ─────────────────────────── */
.cover-foot {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 700;
  font-size: 0.66rem;
  letter-spacing: 0.28em;
  text-transform: uppercase;
  color: oklch(0.42 0.010 90);
  position: relative;
  z-index: 1;
}
.cover-foot-sep { color: oklch(0.30 0.010 90); }

/* ── Responsive ──────────────────────────────────────────── */
@media (max-width: 960px) {
  .cover {
    padding: 36px 28px 28px 40px;
    min-height: 48vh;
    gap: 22px;
  }
  .cover-headline { font-size: clamp(2.2rem, 8vw, 3.4rem); }
}

@media (max-width: 560px) {
  .cover {
    padding: 28px 20px 24px 32px;
    min-height: 40vh;
    border-radius: 12px;
  }
  .cover-rail { left: 16px; }
  .cover-issue { font-size: 0.70rem; gap: 10px; }
  .cover-headline { font-size: clamp(2.0rem, 9vw, 2.8rem); }
  .cover-deck { font-size: 1.0rem; }
  .cover-foot { font-size: 0.60rem; letter-spacing: 0.22em; }
}
</style>
