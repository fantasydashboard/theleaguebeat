<template>
  <!--
    HERO — type-led magazine cover. The headline carries the entire
    composition. Eyebrow at top, massive headline spans the section
    full width, body line beneath, then a compact "featuring" row
    at the bottom shows the involved teams as small chips alongside
    the byline + share button.

    This is the editorial answer to "icon next to text dashboard
    cards." The avatars don't compete with the headline for cover
    real estate; they sit at the bottom as bylines do in a real
    magazine spread.
  -->
  <section
    class="hero"
    :class="[`hero-tone-${tone}`, { 'hero-no-image': !hasImage }]"
    :aria-labelledby="`hero-headline-${story.signature}`"
  >
    <!-- Atmospheric backdrop layers — washes + grain -->
    <div class="hero-backdrop" aria-hidden="true"></div>
    <div class="hero-grain" aria-hidden="true"></div>

    <!-- Image stage — only when the protagonist has a real avatar.
         The image bleeds off the right edge; a left-to-right
         vignette ensures the headline keeps contrast. When the
         image 401s the @error handler flips hasImage and we fall
         back to the sparkline treatment. -->
    <div v-if="hasImage" class="hero-stage" aria-hidden="true">
      <img
        :src="protagonist!.avatarUrl"
        class="hero-art"
        alt=""
        @error="protagonistImgErrored = true"
      />
      <div class="hero-vignette"></div>
    </div>

    <!-- Combined meta pill — image-led mode only. Consolidates the
         antagonist photo caption + byline + share button into one
         bottom-right pill anchored to the image area. Cleaner than
         having the antagonist caption AND a separate full-width
         footer fighting the image for space. -->
    <div v-if="hasImage" class="hero-image-meta" aria-label="Story meta">
      <!-- Antagonist segment (only when one exists) -->
      <template v-if="antagonist">
        <span class="hero-image-meta-vs">VS</span>
        <div
          class="hero-image-meta-avatar"
          :style="{ background: `linear-gradient(135deg, ${antagonist.avatarColor})` }"
        >
          <img
            v-if="antagonist.avatarUrl && !antagonistImgErrored"
            :src="antagonist.avatarUrl"
            class="hero-image-meta-avatar-img"
            alt=""
            @error="antagonistImgErrored = true"
          />
          <span v-else>{{ antagonist.ownerInitials }}</span>
        </div>
        <span class="hero-image-meta-name">{{ antagonist.name }}</span>
        <span class="hero-image-meta-rank">#{{ antagonistRank }}</span>
        <span class="hero-image-meta-sep" aria-hidden="true">·</span>
      </template>

      <!-- Byline -->
      <span class="hero-image-meta-byline">{{ bylineCompact }}</span>

      <!-- Share -->
      <button
        v-if="shareable"
        type="button"
        class="hero-image-meta-share"
        :aria-label="`Share ${headline} to your league chat`"
        @click="emit('share', story)"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
          <polyline points="16 6 12 2 8 6"/>
          <line x1="12" y1="2" x2="12" y2="15"/>
        </svg>
        Share
      </button>
    </div>

    <div class="hero-grid" :class="{ 'hero-grid-no-image': !hasImage }">
      <header class="hero-head">
        <p class="hero-eyebrow">
          <span class="hero-eyebrow-bar" aria-hidden="true"></span>
          {{ eyebrow }}
        </p>

        <h1 class="hero-headline" :id="`hero-headline-${story.signature}`">
          {{ headline }}
        </h1>

        <p v-if="body" class="hero-body">{{ body }}</p>
      </header>

      <!-- Rank-trajectory sparkline. Only renders in no-image mode —
           when the protagonist's image carries the cover, the spark
           would compete with it visually. -->
      <aside v-if="!hasImage && data && hasRankHistory" class="hero-spark" aria-label="Rank trajectory">
        <p class="hero-spark-label">RANK · LAST {{ historyWeeks }} WEEKS</p>
        <RankSparkline
          :data="data"
          :focus-team-ids="focusTeamIds"
          :focus-colors="focusColors"
          :aria-label="`Rank trajectory: ${protagonist?.name ?? 'leader'} vs ${antagonist?.name ?? 'challenger'}`"
        />
      </aside>
    </div>

    <!-- Footer: byline + share. Only renders in no-image / type-led
         mode. In image-led mode the byline + share are consolidated
         into the .hero-image-meta pill that sits over the image. -->
    <footer v-if="!hasImage" class="hero-foot">
      <p class="hero-byline">
        <span class="hero-byline-tag">THE BEAT</span>
        <span>{{ byline }}</span>
      </p>
      <button
        v-if="shareable"
        type="button"
        class="hero-share"
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
    </footer>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { SelectedStory } from '@/editorial/detection/types'
import type {
  CategoryLeagueData,
  CategoryLeagueDataTeam,
} from '@/editorial/types'
import { canShare } from '@/editorial/shareability'
import { composeHeroDeck } from '@/editorial/composition/heroDeck'
import RankSparkline from '@/components/issue/RankSparkline.vue'

const protagonistImgErrored = ref(false)
const antagonistImgErrored = ref(false)

const props = defineProps<{
  story: SelectedStory
  data?: CategoryLeagueData
}>()

const emit = defineEmits<{ (e: 'share', story: SelectedStory): void }>()

const shareable = computed(() => canShare(props.story))

/* ─────────────────────────────────────────────────────────────────
   Tone — drives the atmospheric backdrop. Each story type picks a
   color palette that gives the cover mood without imagery.
───────────────────────────────────────────────────────────────── */

type Tone = 'magenta' | 'down' | 'up' | 'teal' | 'gold'

const tone = computed<Tone>(() => {
  switch (props.story.type) {
    case 'dynasty-falling':
    case 'spoiler-watch':
      return 'down'
    case 'new-throne':
    case 'division-lead-change':
      return 'up'
    case 'matchup-of-week':
    case 'rematch':
    case 'playoff-rematch':
    case 'division-clash':
    case 'photo-finish':
    case 'razor-close':
      return 'teal'
    case 'dethroned-rivalry':
      return 'gold'
    default:
      return 'magenta'
  }
})

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
  // Prefer the rich multi-sentence deck from the composer. Falls
  // through to the existing per-type switch when the composer has
  // no variants registered for this story type yet.
  const deck = composeHeroDeck(props.story, props.data)
  if (deck) return deck

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
    case 'dynasty-falling':    return 'falls to'
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

const byline = computed(() => {
  if (!props.story) return ''
  const minutesAgo = Math.max(5, Math.round((1 - props.story.freshness) * 60 * 6))
  if (minutesAgo < 60) return `FILED · ${minutesAgo} MIN AGO`
  const hr = Math.round(minutesAgo / 60)
  if (hr < 24) return `FILED · ${hr} HR AGO`
  const d = Math.round(hr / 24)
  return `FILED · ${d} DAY${d === 1 ? '' : 'S'} AGO`
})

/** Compact byline used inside the image-led meta pill — drops the
 *  "FILED" prefix to save horizontal space, but keeps the unit
 *  written out ("MIN" / "HR" / "DAY") so the timestamp scans at a
 *  glance instead of needing to parse "5M". */
const bylineCompact = computed(() => {
  if (!props.story) return ''
  const minutesAgo = Math.max(5, Math.round((1 - props.story.freshness) * 60 * 6))
  if (minutesAgo < 60) return `THE BEAT · ${minutesAgo} MIN AGO`
  const hr = Math.round(minutesAgo / 60)
  if (hr < 24) return `THE BEAT · ${hr} HR AGO`
  const d = Math.round(hr / 24)
  return `THE BEAT · ${d} DAY${d === 1 ? '' : 'S'} AGO`
})

/* ─────────────────────────────────────────────────────────────────
   Sparkline data — protagonist + antagonist team IDs and tone-
   appropriate colors. The "up" story types color the protagonist
   green and the antagonist red; "down" stories invert that.
───────────────────────────────────────────────────────────────── */

const hasRankHistory = computed(
  () => (props.data?.seasonRankHistory.length ?? 0) >= 2,
)

/** Switch to image-led layout when the protagonist has a real
 *  working avatar image. Otherwise the section falls back to the
 *  type-led + sparkline treatment. Mirrors HeroSolo's pattern so
 *  the visual language is consistent across hero types. */
const hasImage = computed(
  () => Boolean(protagonist.value?.avatarUrl) && !protagonistImgErrored.value,
)

const historyWeeks = computed(
  () => props.data?.seasonRankHistory.length ?? 0,
)

const focusTeamIds = computed(() => {
  const ids: string[] = []
  if (protagonist.value) ids.push(protagonist.value.id)
  if (antagonist.value) ids.push(antagonist.value.id)
  return ids
})

/** Pair the two focus lines with colors that map to the story.
 *  - new-throne: protagonist climbing (green), antagonist falling (red)
 *  - dynasty-falling: protagonist falling (red), antagonist climbing (green)
 *  - matchup/rematch/division-clash: gold + magenta (no value judgment) */
const focusColors = computed<string[]>(() => {
  switch (props.story.type) {
    case 'new-throne':
    case 'division-lead-change':
      return ['oklch(0.74 0.18 145)', 'oklch(0.65 0.20 25)']
    case 'dynasty-falling':
    case 'spoiler-watch':
      return ['oklch(0.65 0.20 25)', 'oklch(0.74 0.18 145)']
    default:
      return ['oklch(0.78 0.18 92)', 'oklch(0.70 0.27 350)']
  }
})
</script>

<style scoped>
/* ─────────────────────────────────────────────────────────────────
   HERO — type-led cover. Layout flows top to bottom: eyebrow,
   massive headline, body, then a compact featuring + byline row.
   No grid columns competing for space; the headline owns the page.
───────────────────────────────────────────────────────────────── */

.hero {
  position: relative;
  padding: 48px 0;
  isolation: isolate;
  /* No bottom margin — the next section's EditorialBreak provides
     all the spacing needed. Adding margin here stacked with the
     break's top margin created the "screen of dead space" gap. */
  margin-bottom: 0;
  overflow: hidden;
  border: none;
  border-radius: 0;
}

/* Content grid. Default single-column for image-led mode (the
   image sits absolutely positioned beside via .hero-stage). In
   no-image mode the grid splits 2fr/1fr so the sparkline fills
   the right column. */
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

/* In image-led mode the copy column is capped to the left half so
   the image has room to breathe on the right. */
.hero:not(.hero-no-image) .hero-head { max-width: 56ch; }

/* ── Image stage (image-led mode only) ─────────────────────
   The protagonist's avatar bleeds off the right edge of the
   section. A multi-stop left-to-right vignette + bottom shadow
   keeps the headline legible regardless of how light or dark
   the underlying image is. */
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
    linear-gradient(
      180deg,
      transparent 60%,
      oklch(0.05 0.012 90 / 0.6) 100%
    );
}

/* Copy + footer sit above the image stage. */
.hero-head { position: relative; z-index: 1; }
.hero-foot { position: relative; z-index: 1; }

/* ── Image-led meta pill ─────────────────────────────────────
   Consolidates antagonist photo caption + byline + share button
   into one bottom-right pill anchored to the image area. Replaces
   the awkward "footer floating over the image" layout that the
   old separate footer + photo-caption combo produced. */
.hero-image-meta {
  position: absolute;
  z-index: 2;
  bottom: 24px;
  right: 32px;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 6px 6px 6px 14px;
  background: oklch(0.06 0.014 90 / 0.75);
  backdrop-filter: blur(10px);
  border: 1px solid oklch(0.97 0.005 90 / 0.12);
  border-radius: 999px;
  font-family: 'Barlow Condensed', sans-serif;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  max-width: calc(100% - 64px);
}

/* Antagonist segment */
.hero-image-meta-vs {
  font-weight: 800;
  font-size: 0.72rem;
  color: oklch(0.78 0.18 92);
  letter-spacing: 0.22em;
}
.hero-image-meta-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 0.74rem;
  color: oklch(0.10 0.012 90);
  overflow: hidden;
  flex-shrink: 0;
}
.hero-image-meta-avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.hero-image-meta-name {
  font-family: 'Barlow', sans-serif;
  font-weight: 700;
  font-size: 0.82rem;
  letter-spacing: 0.01em;
  text-transform: none;
  color: oklch(0.97 0.005 90);
  white-space: nowrap;
  max-width: 16ch;
  overflow: hidden;
  text-overflow: ellipsis;
}
.hero-image-meta-rank {
  font-weight: 800;
  font-size: 0.7rem;
  color: oklch(0.65 0.010 90);
  padding: 2px 7px;
  border-radius: 6px;
  background: oklch(0.97 0.005 90 / 0.08);
  letter-spacing: 0.04em;
}
.hero-image-meta-sep {
  color: oklch(0.40 0.010 90);
  font-size: 0.9rem;
  padding: 0 4px;
}

/* Byline */
.hero-image-meta-byline {
  font-weight: 700;
  font-size: 0.7rem;
  color: oklch(0.55 0.010 90);
  letter-spacing: 0.16em;
  white-space: nowrap;
}

/* Share button — sits inside the pill so it reads as part of the
   meta cluster, not a separate floating CTA. */
.hero-image-meta-share {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 999px;
  background: oklch(0.14 0.018 90);
  border: 1px solid oklch(0.97 0.005 90 / 0.15);
  color: oklch(0.97 0.005 90);
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: 0.72rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  cursor: pointer;
  margin-left: 4px;
  transition: background-color 140ms cubic-bezier(0.22, 1, 0.36, 1),
              border-color 140ms cubic-bezier(0.22, 1, 0.36, 1);
}
@media (hover: hover) and (pointer: fine) {
  .hero-image-meta-share:hover {
    background: oklch(0.20 0.015 90);
    border-color: oklch(0.97 0.005 90 / 0.3);
  }
}
.hero-image-meta-share:active { transform: scale(0.97); }

@media (max-width: 720px) {
  .hero-image-meta {
    bottom: 16px;
    right: 16px;
    padding: 5px 5px 5px 10px;
    gap: 6px;
  }
  .hero-image-meta-avatar { width: 22px; height: 22px; font-size: 0.66rem; }
  .hero-image-meta-name { font-size: 0.74rem; max-width: 10ch; }
  .hero-image-meta-vs { font-size: 0.66rem; }
  .hero-image-meta-rank { font-size: 0.62rem; padding: 1px 5px; }
  .hero-image-meta-byline { display: none; }
  .hero-image-meta-share { padding: 4px 9px; font-size: 0.66rem; }
}

/* Tone variables drive the atmospheric backdrop palette. */
.hero-tone-magenta { --hero-hue: 350; --hero-accent: oklch(0.70 0.27 350); }
.hero-tone-down    { --hero-hue: 25;  --hero-accent: oklch(0.65 0.20 25);  }
.hero-tone-up      { --hero-hue: 145; --hero-accent: oklch(0.74 0.18 145); }
.hero-tone-teal    { --hero-hue: 195; --hero-accent: oklch(0.72 0.18 195); }
.hero-tone-gold    { --hero-hue: 92;  --hero-accent: oklch(0.78 0.18 92);  }

/* Atmospheric backdrop — layered radial washes in the story's tone.
   Anchored at the corners; sits behind everything. Bleeds past the
   parent padding so the wash reads as a full-bleed page treatment,
   not a "background of a section." */
.hero-backdrop {
  position: absolute;
  inset: -80px -100px;
  z-index: -2;
  background:
    radial-gradient(
      ellipse 70% 60% at 15% 30%,
      oklch(0.22 0.14 var(--hero-hue) / 0.55) 0%,
      transparent 60%
    ),
    radial-gradient(
      ellipse 50% 50% at 90% 100%,
      oklch(0.18 0.10 var(--hero-hue) / 0.30) 0%,
      transparent 60%
    ),
    linear-gradient(180deg, oklch(0.07 0.014 90) 0%, oklch(0.05 0.012 90) 100%);
  pointer-events: none;
}

/* Subtle film grain for editorial texture. SVG fractal noise inlined
   so it works offline + doesn't trigger network requests. */
.hero-grain {
  position: absolute;
  inset: 0;
  z-index: -1;
  pointer-events: none;
  /* Bumped from 0.07 to 0.14 so the grain actually registers as
     editorial texture instead of being invisible against the dark
     background. */
  opacity: 0.14;
  mix-blend-mode: overlay;
  background-image: url("data:image/svg+xml;utf8,<svg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");
}

/* ── Eyebrow ──────────────────────────────────────────────── */
.hero-head { margin-bottom: 48px; }

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
  background: oklch(0.10 0.015 90);
  border: 1px solid oklch(0.20 0.015 90);
  color: oklch(0.65 0.010 90);
  font-size: 0.66rem;
  letter-spacing: 0.18em;
  font-weight: 700;
  margin-left: 4px;
}

/* ── Headline — feature scale ─────────────────────────────
   3.6rem cap is the sweet spot for category-league team names.
   At this size + a 2fr column width, "Cracks in Port Angeles
   Roughriders. Real ones." reads as 2-3 lines (not 6). */
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

/* ── Body ─────────────────────────────────────────────────── */
.hero-body {
  margin: 0;
  font-family: 'Barlow', sans-serif;
  font-weight: 500;
  font-size: 1.35rem;
  line-height: 1.4;
  color: oklch(0.85 0.008 90);
  max-width: 58ch;
}

/* ── Sparkline aside (right column) ─────────────────────── */
.hero-spark {
  align-self: end;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-bottom: 8px;
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

/* ── Footer: byline + share, full width below the grid ───── */
.hero-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 28px;
  padding-top: 28px;
  margin-top: 32px;
  border-top: 1px solid oklch(0.18 0.015 90);
  flex-wrap: wrap;
}

.hero-byline {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 700;
  font-size: 0.74rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: oklch(0.55 0.010 90);
}
.hero-byline-tag {
  background: oklch(0.14 0.018 90);
  color: oklch(0.78 0.008 90);
  padding: 3px 8px;
  border-radius: 4px;
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
  transition:
    border-color 140ms cubic-bezier(0.22, 1, 0.36, 1),
    background-color 140ms cubic-bezier(0.22, 1, 0.36, 1);
}
@media (hover: hover) and (pointer: fine) {
  .hero-share:hover {
    border-color: oklch(0.55 0.010 90);
    background: oklch(0.14 0.018 90);
  }
}
.hero-share:active { transform: scale(0.97); }

@media (max-width: 960px) {
  /* Stack the type + sparkline so the headline gets the full width
     and the sparkline drops below at compressed height. */
  .hero-grid-no-image {
    grid-template-columns: 1fr;
    gap: 36px;
  }
  .hero-spark { min-height: 180px; }
  /* Image-led: shrink the bleeding image so it doesn't crowd the
     headline column on narrower screens. */
  .hero-stage { width: 480px; right: -100px; }
}

@media (max-width: 720px) {
  /* Phones: image gets smallest, vignette stretches further to
     keep the headline readable against the compressed image. */
  .hero-stage { width: 320px; right: -80px; top: 0; bottom: 0; }
  .hero:not(.hero-no-image) .hero-head { max-width: 100%; }
}

@media (max-width: 720px) {
  .hero { padding: 36px 0; }
  .hero-head { margin-bottom: 28px; }
  .hero-headline {
    font-size: clamp(2.2rem, 9vw, 3.4rem);
    margin-bottom: 18px;
  }
  .hero-body { font-size: 1.05rem; }
  .hero-spark { min-height: 160px; }
  .hero-foot { gap: 16px; padding-top: 20px; flex-direction: column; align-items: flex-start; }
}
</style>
