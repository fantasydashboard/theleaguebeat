<template>
  <!-- WEEKLY COVER — magazine-style cover that frames an entire
       issue (week). Distinct from the hero (today's lede). The cover
       is committed: it says "this is what Issue 10 was about" and
       lives there all week.

       Image-led by design. Smart per story type:
         · trades / matchups  → two-logo "duel" composition
         · single-subject     → one logo bleeds off the right
         · no usable art      → type-led cover (the cover line carries
                                 it, like a real art-less magazine cover)

       Sits between the masthead and the hero, so the page reads:
       nameplate → cover → today's lede → wire — like a real magazine. -->
  <section
    v-if="cover"
    class="cover"
    :class="[`cover-tone-${tone}`, `cover-mode-${mode}`]"
    :aria-labelledby="`cover-headline-${cover.story.signature}`"
  >
    <!-- Atmospheric backdrop + film grain (always present, set the mood). -->
    <div class="cover-backdrop" aria-hidden="true"></div>
    <div class="cover-grain" aria-hidden="true"></div>

    <!-- Oversized ghost issue numeral — only in type-led mode, so an
         art-less cover still has an editorial focal motif. -->
    <span v-if="mode === 'type'" class="cover-ghost-num" aria-hidden="true">{{ issueNumber }}</span>

    <!-- DUEL stage — two team logos pitted against each other (trades,
         matchups). Both logos guaranteed present in this mode. -->
    <div v-if="mode === 'duel'" class="cover-stage cover-stage-duel" aria-hidden="true">
      <span class="cover-duel-art cover-duel-art-b">
        <img :src="teamB?.avatarUrl" alt="" @error="errB = true" />
      </span>
      <span class="cover-duel-art cover-duel-art-a">
        <img :src="teamA?.avatarUrl" alt="" @error="errA = true" />
      </span>
      <div class="cover-vignette"></div>
    </div>

    <!-- SINGLE stage — one logo bleeds off the right edge (HeroSolo). -->
    <div v-else-if="mode === 'single'" class="cover-stage" aria-hidden="true">
      <img :src="singleTeam?.avatarUrl" class="cover-art" alt="" @error="onSingleError" />
      <div class="cover-vignette"></div>
    </div>

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

      <p v-if="mode === 'duel' && teamA && teamB" class="cover-versus">
        <span class="cover-versus-team">{{ teamA.name }}</span>
        <span class="cover-versus-x" aria-hidden="true">vs</span>
        <span class="cover-versus-team">{{ teamB.name }}</span>
      </p>
    </div>

    <footer class="cover-foot" aria-hidden="true">
      <span class="cover-foot-issue">VOL. {{ vol }} · ISSUE {{ issueNumber }}</span>
    </footer>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { SelectedStory } from '@/editorial/detection/types'
import type { CategoryLeagueData, CategoryLeagueDataTeam } from '@/editorial/types'
import { composeWeeklyCover, composeCoverHeadline, type WeeklyCover as WeeklyCoverShape } from '@/editorial/composition/weeklyCover'
import { composeHeroDeck } from '@/editorial/composition/heroDeck'
import { canShare } from '@/editorial/shareability'

const props = defineProps<{
  /** Same selected stories the home page already computes for hero
   *  + sections. The cover composer just re-ranks them with the
   *  longer-window logic. */
  stories: SelectedStory[]
  /** League data — needed for team-name + logo lookups. */
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

const story = computed<SelectedStory | null>(() => cover.value?.story ?? null)

const issueNumber = computed(() => props.issueNumber ?? 1)
const vol = computed(() => props.vol ?? 1)

const shareable = computed(() =>
  cover.value ? canShare(cover.value.story) : false,
)

/* ─────────────────────────────────────────────────────────────────
   IMAGERY — smart per story type
   Trades + matchups become a two-logo "duel"; single-subject stories
   bleed one logo off the right; anything without usable art falls to
   a type-led cover (the headline carries it).
───────────────────────────────────────────────────────────────── */

const DUEL_TYPES = new Set<string>([
  'blockbuster-trade', 'lopsided-trade',
  'matchup-of-week', 'photo-finish', 'comeback-win', 'blowout',
  'playoff-rematch', 'dethroned-rivalry',
])

function resolveTeam(id: string | undefined): CategoryLeagueDataTeam | null {
  if (!id) return null
  return props.data?.teams.find((t) => t.id === id) ?? null
}

/** The two team ids a duel cover pits against each other. Trades carry
 *  them on context.acquiredByTeam (same source the deck reads);
 *  matchups / rematches carry them on story.teamIds. */
function duelIds(s: SelectedStory): [string | undefined, string | undefined] {
  const acquired = (s.context as { acquiredByTeam?: { teamId?: string }[] }).acquiredByTeam
  if (Array.isArray(acquired) && acquired.length >= 2) {
    return [acquired[0]?.teamId, acquired[1]?.teamId]
  }
  return [s.teamIds?.[0], s.teamIds?.[1]]
}

const teamA = computed<CategoryLeagueDataTeam | null>(() => {
  const s = story.value
  if (!s) return null
  if (DUEL_TYPES.has(s.type)) return resolveTeam(duelIds(s)[0])
  const ctxId = (s.context as { teamId?: unknown }).teamId
  return resolveTeam(typeof ctxId === 'string' ? ctxId : s.teamIds?.[0])
})

const teamB = computed<CategoryLeagueDataTeam | null>(() => {
  const s = story.value
  if (!s || !DUEL_TYPES.has(s.type)) return null
  return resolveTeam(duelIds(s)[1])
})

// Reset per-side image errors when the resolved team changes, so a
// stale failure doesn't suppress a newly-valid logo after a refresh.
const errA = ref(false)
const errB = ref(false)
watch(() => teamA.value?.id, () => { errA.value = false })
watch(() => teamB.value?.id, () => { errB.value = false })

const aHasImage = computed(() => Boolean(teamA.value?.avatarUrl) && !errA.value)
const bHasImage = computed(() => Boolean(teamB.value?.avatarUrl) && !errB.value)

const mode = computed<'duel' | 'single' | 'type'>(() => {
  const s = story.value
  if (!s) return 'type'
  if (DUEL_TYPES.has(s.type) && aHasImage.value && bHasImage.value) return 'duel'
  if (aHasImage.value || bHasImage.value) return 'single'
  return 'type'
})

/** In single mode, render whichever side actually has working art. */
const singleTeam = computed<CategoryLeagueDataTeam | null>(() =>
  aHasImage.value ? teamA.value : bHasImage.value ? teamB.value : null,
)

function onSingleError() {
  if (singleTeam.value && singleTeam.value.id === teamA.value?.id) errA.value = true
  else errB.value = true
}

/* ─────────────────────────────────────────────────────────────────
   COPY
───────────────────────────────────────────────────────────────── */

/** Cover headline — shared with the archive snapshot via
 *  composeCoverHeadline so the live cover and the shelf thumbnail
 *  always render the same line. */
const headline = computed<string>(() =>
  cover.value ? composeCoverHeadline(cover.value.story) : '',
)

const deck = computed<string>(() => {
  if (!cover.value) return ''
  return composeHeroDeck(cover.value.story, props.data)
})

/** Tone drives the accent + atmospheric hue. Mirrors the per-story-type
 *  tone choices used elsewhere so the cover's color signal stays
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
</script>

<style scoped>
.cover {
  /* Magazine cover scale — taller and louder than the hero below it,
     so the hierarchy is unambiguous: this is THE story of the week. */
  position: relative;
  isolation: isolate;
  display: grid;
  grid-template-rows: auto 1fr auto;
  gap: 28px;
  min-height: 54vh;
  padding: 52px 56px 40px;
  border: 1px solid oklch(0.16 0.015 90);
  border-radius: 18px;
  overflow: hidden;
  margin-bottom: 28px;
}

/* Tone tokens — hue (drives the atmospheric wash) + accent (eyebrow,
   issue tag). Same tonal vocabulary as HeroSolo. */
.cover-tone-magenta { --cv-hue: 350; --cv-accent: oklch(0.70 0.27 350); }
.cover-tone-gold    { --cv-hue: 92;  --cv-accent: oklch(0.80 0.17 92);  }
.cover-tone-teal    { --cv-hue: 195; --cv-accent: oklch(0.72 0.18 195); }
.cover-tone-up      { --cv-hue: 145; --cv-accent: oklch(0.74 0.18 145); }
.cover-tone-down    { --cv-hue: 25;  --cv-accent: oklch(0.65 0.20 25);  }

/* ── Atmosphere ───────────────────────────────────────────────── */
.cover-backdrop {
  position: absolute;
  inset: 0;
  z-index: -2;
  pointer-events: none;
  background:
    radial-gradient(
      ellipse 80% 70% at 12% 22%,
      oklch(0.24 0.13 var(--cv-hue) / 0.55) 0%,
      transparent 62%
    ),
    radial-gradient(
      ellipse 60% 60% at 92% 98%,
      oklch(0.18 0.10 var(--cv-hue) / 0.30) 0%,
      transparent 60%
    ),
    linear-gradient(180deg, oklch(0.085 0.014 90) 0%, oklch(0.055 0.012 90) 100%);
}
.cover-grain {
  position: absolute;
  inset: 0;
  z-index: -1;
  pointer-events: none;
  opacity: 0.13;
  mix-blend-mode: overlay;
  background-image: url("data:image/svg+xml;utf8,<svg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>");
}

/* Oversized ghost issue numeral (type-led mode only). */
.cover-ghost-num {
  position: absolute;
  right: -1%;
  bottom: -14%;
  z-index: 0;
  pointer-events: none;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: clamp(14rem, 34vw, 30rem);
  line-height: 0.8;
  letter-spacing: -0.04em;
  color: oklch(0.32 0.06 var(--cv-hue) / 0.16);
}

/* ── Single image stage (one logo bleeds off the right) ───────── */
.cover-stage {
  position: absolute;
  top: -40px;
  bottom: -40px;
  right: -120px;
  width: 64%;
  max-width: 760px;
  z-index: 0;
  overflow: hidden;
}
.cover-art {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  filter: saturate(1.05) contrast(1.04);
  animation: cover-art-in 800ms cubic-bezier(0.16, 1, 0.3, 1) backwards;
}

/* ── Duel stage (two logos, trade / matchup) ──────────────────── */
.cover-stage-duel {
  top: 0;
  bottom: 0;
  right: 0;
  width: 56%;
  max-width: 680px;
}
.cover-duel-art {
  position: absolute;
  display: block;
  border-radius: 22px;
  overflow: hidden;
  border: 1px solid oklch(0.34 0.03 var(--cv-hue) / 0.45);
  box-shadow: 0 24px 70px oklch(0.02 0 0 / 0.62);
  animation: cover-art-in 800ms cubic-bezier(0.16, 1, 0.3, 1) backwards;
}
.cover-duel-art img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
/* Back plate — dimmed, upper-right, fills the top corner. */
.cover-duel-art-b {
  width: 48%;
  aspect-ratio: 1;
  top: 6%;
  right: 8%;
  transform: rotate(-3deg);
  filter: saturate(0.82) brightness(0.66);
}
/* Front plate — larger, lower, inset from the edge so it never
   clips against the viewport, overlapping the back plate diagonally. */
.cover-duel-art-a {
  width: 52%;
  aspect-ratio: 1;
  bottom: 10%;
  right: 18%;
  transform: rotate(3deg);
  z-index: 1;
}

/* Left-to-right vignette anchors the type against any logo. */
.cover-vignette {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(
      90deg,
      oklch(0.06 0.012 90) 0%,
      oklch(0.06 0.012 90 / 0.92) 22%,
      oklch(0.06 0.012 90 / 0.5) 46%,
      oklch(0.06 0.012 90 / 0.12) 66%,
      transparent 100%
    ),
    linear-gradient(180deg, transparent 55%, oklch(0.06 0.012 90 / 0.55) 100%);
}

/* ── Head: issue badge + share ────────────────────────────────── */
.cover-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  position: relative;
  z-index: 2;
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
  background: var(--cv-accent);
  color: oklch(0.12 0.02 var(--cv-hue));
}
.cover-issue-week { color: oklch(0.62 0.010 90); }

.cover-share {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 13px;
  border-radius: 999px;
  background: oklch(0.10 0.010 90 / 0.6);
  border: 1px solid oklch(0.32 0.012 90);
  color: oklch(0.95 0.005 90);
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.74rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  cursor: pointer;
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  transition:
    border-color 140ms cubic-bezier(0.22, 1, 0.36, 1),
    background-color 140ms cubic-bezier(0.22, 1, 0.36, 1);
}
@media (hover: hover) and (pointer: fine) {
  .cover-share:hover {
    border-color: oklch(0.60 0.010 90);
    background: oklch(0.14 0.018 90 / 0.85);
  }
}
.cover-share:active { transform: scale(0.97); }

/* ── Body: eyebrow + headline + deck + versus ─────────────────── */
.cover-body {
  display: flex;
  flex-direction: column;
  gap: 18px;
  position: relative;
  z-index: 2;
  align-self: center;
  max-width: min(60ch, 62%);
  padding: 12px 0;
}
.cover-mode-type .cover-body { max-width: min(74ch, 100%); }

.cover-body > * {
  animation: cover-rise 620ms cubic-bezier(0.16, 1, 0.3, 1) backwards;
}
.cover-body > *:nth-child(2) { animation-delay: 70ms; }
.cover-body > *:nth-child(3) { animation-delay: 140ms; }
.cover-body > *:nth-child(4) { animation-delay: 210ms; }

.cover-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  margin: 0;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: 0.82rem;
  letter-spacing: 0.24em;
  text-transform: uppercase;
  color: var(--cv-accent);
}
.cover-eyebrow-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--cv-accent);
  box-shadow: 0 0 14px var(--cv-accent);
}

.cover-headline {
  /* The cover line — the loudest thing on the page when it's there,
     bigger than the hero headline by design. */
  margin: 0;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: clamp(2.8rem, 5.6vw, 5.2rem);
  line-height: 0.94;
  letter-spacing: -0.02em;
  color: oklch(0.98 0.005 90);
  text-wrap: balance;
  max-width: 16ch;
}

.cover-deck {
  margin: 0;
  font-family: 'Barlow', sans-serif;
  font-weight: 500;
  font-size: 1.14rem;
  line-height: 1.5;
  color: oklch(0.84 0.008 90);
  max-width: 54ch;
}

.cover-versus {
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  margin: 4px 0 0;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: 0.9rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: oklch(0.74 0.010 90);
}
.cover-versus-x {
  color: var(--cv-accent);
  font-weight: 900;
}

/* ── Foot: small publication mark ─────────────────────────────── */
.cover-foot {
  position: relative;
  z-index: 2;
  align-self: end;
}
.cover-foot-issue {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 700;
  font-size: 0.68rem;
  letter-spacing: 0.28em;
  text-transform: uppercase;
  color: oklch(0.46 0.010 90);
}

/* ── Motion ───────────────────────────────────────────────────── */
@keyframes cover-rise {
  from { opacity: 0; transform: translateY(14px); }
  to   { opacity: 1; transform: none; }
}
@keyframes cover-art-in {
  from { opacity: 0; transform: scale(1.05); }
  to   { opacity: 1; }
}
@media (prefers-reduced-motion: reduce) {
  .cover-body > *,
  .cover-art,
  .cover-duel-art { animation: none; }
}

/* ── Responsive ───────────────────────────────────────────────── */
@media (max-width: 960px) {
  .cover {
    padding: 40px 32px 32px;
    min-height: 52vh;
    gap: 22px;
  }
  .cover-body,
  .cover-mode-type .cover-body { max-width: 80%; }
  .cover-stage { width: 56%; right: -90px; }
  .cover-stage-duel { width: 60%; }
  .cover-vignette {
    background:
      linear-gradient(
        90deg,
        oklch(0.06 0.012 90) 0%,
        oklch(0.06 0.012 90 / 0.95) 28%,
        oklch(0.06 0.012 90 / 0.6) 58%,
        transparent 100%
      );
  }
}

@media (max-width: 560px) {
  .cover {
    padding: 28px 22px 24px;
    min-height: 46vh;
    border-radius: 12px;
  }
  .cover-issue { font-size: 0.70rem; gap: 10px; }
  .cover-headline { font-size: clamp(2.2rem, 9.5vw, 3rem); max-width: none; }
  .cover-deck { font-size: 1rem; }
  .cover-body,
  .cover-mode-type .cover-body { max-width: 100%; }
  /* On phones the bleeding art crowds the type; shrink it and let the
     vignette do more of the contrast work. */
  .cover-stage { width: 70%; right: -70px; top: 0; bottom: 0; opacity: 0.55; }
  .cover-stage-duel { width: 80%; opacity: 0.6; }
  .cover-foot-issue { font-size: 0.62rem; letter-spacing: 0.22em; }
}
</style>
