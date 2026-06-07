<template>
  <article v-if="lede" class="lede" :aria-labelledby="`lede-headline-${lede.kind}`">
    <!-- Cover image — full-bleed to the right edge of the section,
         filling the full height. The image's left edge fades into
         the colored backdrop via mask gradient, so the photo
         dissolves rather than sitting on color as a hard rectangle.
         Vanity-Fair-style spread: photo dominates the right half,
         text owns the left. -->
    <div
      v-if="lede.subject"
      class="lede-cover"
      :style="portraitStyle(lede.subject)"
      :aria-label="`Subject: ${lede.subject.name}, ranked #${lede.subject.rank}`"
    >
      <img
        v-if="lede.subject.avatarUrl"
        :src="lede.subject.avatarUrl"
        class="lede-cover-img-asset"
        :alt="`${lede.subject.name} avatar`"
      />
      <span v-else class="lede-cover-initials" aria-hidden="true">
        {{ lede.subject.ownerInitials || initialsFor(lede.subject.name) }}
      </span>
    </div>

    <!-- Editorial content. Constrained max-width keeps the left
         column readable; padding-left aligns with the page content
         gutter so the headline starts at the same edge as TODAY'S
         BEATS and the other sections. -->
    <div class="lede-content">
      <header class="lede-head">
        <p class="lede-tag">
          <span class="lede-tag-bar" aria-hidden="true"></span>
          Today's column
        </p>
        <p class="lede-tag-sep" aria-hidden="true">·</p>
        <p class="lede-date">{{ dayLabel }} · {{ formattedDate }}</p>
      </header>

      <p class="lede-eyebrow">{{ lede.eyebrow }}</p>

      <h1 :id="`lede-headline-${lede.kind}`" class="lede-headline">
        {{ lede.headline }}
      </h1>

      <p class="lede-body">{{ lede.body }}</p>

      <footer class="lede-foot">
        <span class="lede-byline">The League Beat</span>
        <span class="lede-sep" aria-hidden="true">·</span>
        <span class="lede-time">Filed {{ filedLabel }}</span>
        <span v-if="showSignal" class="lede-signal" :title="lede.signal">
          {{ lede.kind }}
        </span>
      </footer>
    </div>

    <!-- Photo credit — deliberate magazine-style position at the
         bottom-right of the spread, attached to the cover image. -->
    <div
      v-if="lede.subject"
      class="lede-credit"
      aria-hidden="true"
    >
      <p class="lede-credit-name">{{ lede.subject.name }}</p>
      <p class="lede-credit-rank">{{ rankCaption(lede.subject.rank) }}</p>
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { RenderedLede } from '@/editorial/render-lede'

const props = defineProps<{
  /** The day's editorial column. When null, the component renders
   *  nothing — a quiet-day scenario where no Kind cleared the floor
   *  should be handled by the caller (typically falling back to the
   *  existing cover-story slot). */
  lede: RenderedLede | null
  /** When true, surfaces the underlying Kind tag next to the byline.
   *  Helpful in dev for instrumentation; off by default in production. */
  showSignal?: boolean
}>()

const dayLabel = computed(() => {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  return days[new Date().getDay()]
})

const formattedDate = computed(() => {
  const months = ['January', 'February', 'March', 'April', 'May', 'June',
                  'July', 'August', 'September', 'October', 'November', 'December']
  const d = new Date()
  return `${months[d.getMonth()]} ${d.getDate()}`
})

const filedLabel = computed(() => {
  // The Lede is date-seeded, so "filed" is the start of today (local
  // time). We render it as "this morning" for cadence — a reader who
  // lands at 8pm shouldn't see "filed 14 hours ago."
  const d = new Date()
  const h = d.getHours()
  if (h < 12) return 'this morning'
  if (h < 17) return 'this afternoon'
  return 'today'
})

/** Style the avatar block. When a logo URL is present, the wrapper
 *  is just the rounded clip; when not, we paint the colored fallback
 *  via the team's `avatarColor` gradient (Yahoo + ESPN adapters
 *  generate hash-derived two-stop gradients for colored placeholders). */
function portraitStyle(
  subject: NonNullable<typeof props.lede>['subject'],
): Record<string, string> {
  if (!subject) return {}
  if (subject.avatarUrl) return {}
  if (subject.avatarColor) {
    return { background: `linear-gradient(135deg, ${subject.avatarColor})` }
  }
  return { background: 'oklch(0.28 0.05 90)' }
}

/** Two-letter fallback initials when the team has no logo and no
 *  pre-computed ownerInitials. Takes the first letter of the first
 *  two space-separated words in the team name. */
function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '??'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

/** Caption text under the subject's name in the cover portrait
 *  block. Rank 1 reads as "the top seed"; ranks 2-4 read with
 *  ordinal framing ("the #2 seed"); deeper ranks just print "#N".
 *  Keeps the caption editorial without padding for cases where
 *  the subject isn't actually at the top. */
function rankCaption(rank: number): string {
  if (rank === 1) return 'Top seed · #1'
  if (rank <= 4) return `The #${rank} seed`
  return `#${rank} in the league`
}

</script>

<style scoped>
/* Full-width cover spread. Section is compact — sized to share the
   above-the-fold view with ON YOUR LINE, not eat the entire viewport.
   The image fades directly to the page background (no colored
   backdrop) so the LEDE reads as "photo dissolving into the page,"
   not "photo on a colored panel." */
.lede {
  position: relative;
  margin: 0 0 40px;
  padding: 32px 0 36px;
  min-height: 320px;
  color: var(--ink-1);
  font-family: 'Barlow', sans-serif;
  overflow: hidden;
}

/* Cover image — bleeds to the right edge of the section, fades
   directly to the page background on the left via mask gradient.
   No colored backdrop behind it; the photo dissolves into the dark
   page itself. */
.lede-cover {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: 48%;
  z-index: 1;
  pointer-events: none;
  overflow: hidden;
  /* Soft left-edge fade. Tight enough that the visible photo area
     is meaningful, not a thin slice. */
  -webkit-mask-image: linear-gradient(
    to right,
    transparent 0%,
    transparent 5%,
    black 40%,
    black 100%
  );
  mask-image: linear-gradient(
    to right,
    transparent 0%,
    transparent 5%,
    black 40%,
    black 100%
  );
}
.lede-cover-img-asset {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
  display: block;
}
/* Composition overlay — sits on top of the image, inside the
   masked cover bounds. Darkens the BOTTOM (so the caption can
   read against a tinted area instead of whatever pixels happen
   to be at the bottom of the photo) and the LEFT EDGE (so logos
   with solid white backgrounds — Yahoo's Chipmunks — don't render
   as a hard rectangle of white where the fade should be working).
   Stacked gradients are blended via background-blend-mode so the
   left + bottom darkening composite cleanly. */
.lede-cover::after {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    linear-gradient(to top, oklch(0.06 0.014 90 / 0.65) 0%, transparent 32%),
    linear-gradient(to left, transparent 55%, oklch(0.06 0.014 90 / 0.55) 100%);
}
.lede-cover-initials {
  position: absolute;
  top: 50%;
  right: 8%;
  transform: translateY(-50%);
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 8rem;
  font-weight: 800;
  letter-spacing: 0.02em;
  color: var(--ink-1);
  text-transform: uppercase;
  opacity: 0.85;
}

/* Photo credit — deliberate magazine-style position at the bottom-
   right of the spread. Aligns with the page content gutter on the
   right side, reads as the photo's attribution line. */
.lede-credit {
  position: absolute;
  bottom: 28px;
  right: 32px;
  z-index: 3;
  text-align: right;
  display: flex;
  flex-direction: column;
  gap: 2px;
  /* Subtle text shadow lifts the credit off the photo for legibility
     regardless of which part of the image it sits on. */
  text-shadow: 0 2px 8px oklch(0 0 0 / 0.65);
}
.lede-credit-name {
  margin: 0;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 1.1rem;
  font-weight: 800;
  letter-spacing: 0.01em;
  line-height: 1.15;
  color: var(--ink-1);
}
.lede-credit-rank {
  margin: 0;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.74rem;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: oklch(0.85 0.005 90);
}

/* Content owns the LEFT half of the spread. Max-width constrains
   the text column to magazine-readable width; padding-left matches
   the page content gutter so the headline starts at the same edge
   as the other editorial sections. */
.lede-content {
  position: relative;
  z-index: 2;
  max-width: 640px;
  padding: 0 0 0 0;
}
.lede-head,
.lede-eyebrow,
.lede-headline,
.lede-body,
.lede-foot {
  position: relative;
  z-index: 2;
}
/* Head row — masthead-style horizontal: "TODAY'S COLUMN · WED · JUN 3"
   all inline at the top of the content column. Date is no longer
   floating in colored space on the right. */
.lede-head {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 20px;
}
.lede-tag {
  margin: 0;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--accent-tertiary);
}
.lede-tag-bar {
  width: 24px; height: 2px;
  background: var(--accent-tertiary);
  display: inline-block;
}
.lede-tag-sep {
  margin: 0;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.78rem;
  color: var(--ink-5);
}
.lede-date {
  margin: 0;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.76rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--ink-3);
}
.lede-eyebrow {
  margin: 0 0 14px;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.88rem;
  font-weight: 900;
  letter-spacing: 0.20em;
  text-transform: uppercase;
  color: var(--accent-secondary);
}
.lede-headline {
  margin: 0 0 18px;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: clamp(1.8rem, 3.6vw, 2.6rem);
  line-height: 1.04;
  letter-spacing: -0.018em;
  color: var(--ink-1);
  max-width: 18ch;
}
.lede-body {
  margin: 0 0 22px;
  font-size: 1rem;
  line-height: 1.55;
  color: var(--ink-2);
  max-width: 42ch;
  font-weight: 400;
}
.lede-foot {
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.74rem;
  letter-spacing: 0.08em;
  color: var(--ink-3);
}
.lede-byline {
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--ink-2);
}
.lede-sep {
  color: var(--ink-5);
}
.lede-time {
  font-weight: 600;
  letter-spacing: 0.06em;
  color: var(--ink-3);
}
.lede-signal {
  margin-left: auto;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.66rem;
  color: var(--ink-4);
  padding: 2px 8px;
  border-radius: 4px;
  background: oklch(0.13 0.015 90);
  text-transform: lowercase;
  letter-spacing: 0;
}

/* Tablet — slightly narrower cover keeps the spread balanced. */
@media (max-width: 1100px) {
  .lede-cover {
    width: 44%;
  }
  .lede-cover-initials {
    font-size: 5rem;
  }
  .lede-content {
    max-width: 500px;
  }
  .lede-headline {
    font-size: clamp(1.7rem, 3.4vw, 2.3rem);
  }
}

@media (max-width: 860px) {
  .lede {
    padding: 28px 0 36px;
    margin-bottom: 32px;
    min-height: 0;
  }
  .lede-head {
    flex-direction: row;
    align-items: center;
    gap: 8px;
  }
  .lede-headline {
    font-size: clamp(1.7rem, 6vw, 2.2rem);
    max-width: none;
  }
  .lede-body {
    font-size: 1rem;
    max-width: none;
  }
  /* On phones the cover becomes a top hero — full width, fades to
     the page background at the bottom, with the text content stacked
     below. */
  .lede-cover {
    position: relative;
    top: auto;
    right: auto;
    bottom: auto;
    width: 100%;
    height: 220px;
    margin: 0 0 20px;
    z-index: 2;
    -webkit-mask-image: linear-gradient(
      to bottom,
      black 0%,
      black 65%,
      transparent 100%
    );
    mask-image: linear-gradient(
      to bottom,
      black 0%,
      black 65%,
      transparent 100%
    );
  }
  .lede-cover-initials {
    font-size: 3.4rem;
    right: auto;
    left: 50%;
    transform: translate(-50%, -50%);
  }
  /* Caption moves to bottom-left, below the body, instead of
     bottom-right (which would clip with the page edge). */
  .lede-credit {
    position: relative;
    bottom: auto;
    right: auto;
    text-align: left;
    margin-top: 12px;
    padding: 0 22px;
    text-shadow: none;
  }
  .lede-content {
    padding: 0 22px;
  }
}
</style>
