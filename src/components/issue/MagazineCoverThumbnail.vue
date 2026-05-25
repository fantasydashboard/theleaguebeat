<template>
  <!-- MAGAZINE COVER THUMBNAIL — designed to feel like a physical
       magazine cover you'd hold, not a data tile.

       Composition rules ported from real-magazine covers:
         - 3:4 portrait aspect ratio (Time, SI, Newsweek standard)
         - Masthead at the very top, full width
         - Cover line dominates the lower half in big condensed type
         - Issue number + date stamped at the bottom edge
         - Tone-colored field acts as the cover's "art" until we
           wire image-led variants
         - Subtle paper-shadow + edge highlight so each cover reads
           as an object, not a card

       The component is purely visual — claim/missed/locked state
       comes through the `state` prop, not from looking at storage. -->
  <article
    class="mc"
    :class="[`mc-tone-${cover.tone}`, `mc-state-${state}`]"
    :aria-label="`Issue ${cover.issueWeek}, ${cover.headline}`"
  >
    <!-- Masthead — slim brand lockup at the top of every cover.
         Same nameplate as the live masthead, scaled down. The user
         sees this and immediately knows it's a TLB cover. -->
    <header class="mc-mast">
      <span class="mc-mast-brand">THE LEAGUE BEAT</span>
      <span class="mc-mast-vol">VOL. {{ vol }}</span>
    </header>

    <!-- Tone-color field that acts as the cover "art." Two subtle
         radial gradients pulled from the tone color, plus a thin
         accent rail. Reads as a designed cover rather than a
         text-only card. -->
    <div class="mc-field" aria-hidden="true">
      <span class="mc-rail"></span>
      <span class="mc-corner-glow"></span>
    </div>

    <!-- Cover headline — the editorial line. Dominates the lower
         two-thirds of the cover. Same condensed display type as
         the rest of the magazine, just scaled to the thumbnail. -->
    <div class="mc-body">
      <p class="mc-kicker">
        <span class="mc-kicker-dot" aria-hidden="true"></span>
        Cover story
      </p>
      <h3 class="mc-headline">{{ cover.headline }}</h3>
    </div>

    <!-- Foot — issue stamp + date. Anchored to the bottom edge
         like a magazine's bottom-corner UPC + date block. -->
    <footer class="mc-foot">
      <span class="mc-foot-issue">ISSUE {{ cover.issueWeek }}</span>
      <span v-if="dateLabel" class="mc-foot-sep" aria-hidden="true">·</span>
      <span v-if="dateLabel" class="mc-foot-date">{{ dateLabel }}</span>
    </footer>

    <!-- State overlay — "MISSED" stamp on unclaimed past issues.
         Renders as a diagonal sash; doesn't hide the cover, just
         marks ownership state. -->
    <span v-if="state === 'missed'" class="mc-stamp mc-stamp-missed" aria-hidden="true">
      Missed
    </span>
    <span v-else-if="state === 'live'" class="mc-stamp mc-stamp-live" aria-hidden="true">
      <span class="mc-stamp-dot"></span> Live now
    </span>
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ArchivedCover } from '@/services/coverArchive'

/** State drives the overlay treatment.
 *  - claimed: user has the issue. Renders clean.
 *  - missed:  past issue, user wasn't there. Faded + "Missed" stamp.
 *  - live:    current issue is in flight. "Live now" pip.
 *  - locked:  future issue, hasn't published yet. Currently unused. */
type CoverState = 'claimed' | 'missed' | 'live' | 'locked'

const props = defineProps<{
  cover: ArchivedCover
  state: CoverState
  /** Magazine volume number, for the masthead lockup. */
  vol: number
}>()

/** Format the publishedAt timestamp into a date stamp the cover
 *  can wear. "MAY 25" style. */
const dateLabel = computed<string>(() => {
  if (!props.cover.publishedAt) return ''
  return new Date(props.cover.publishedAt)
    .toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    .toUpperCase()
})
</script>

<style scoped>
.mc {
  /* 3:4 portrait — the canonical magazine cover aspect. The
     thumbnail width is set by the parent layout (grid column,
     scroll-row child width). Aspect ratio handles the height. */
  position: relative;
  aspect-ratio: 3 / 4;
  width: 100%;
  display: grid;
  grid-template-rows: auto 1fr auto auto;
  background: oklch(0.10 0.012 90);
  border: 1px solid oklch(0.20 0.015 90);
  border-radius: 6px;
  overflow: hidden;
  box-shadow:
    0 6px 16px oklch(0 0 0 / 0.32),
    0 1px 2px oklch(0 0 0 / 0.20),
    inset 0 1px 0 oklch(1 0 0 / 0.04);  /* subtle top-edge sheen */
  transition:
    transform 200ms cubic-bezier(0.22, 1, 0.36, 1),
    box-shadow 200ms cubic-bezier(0.22, 1, 0.36, 1);
}

@media (hover: hover) and (pointer: fine) {
  .mc:hover {
    transform: translateY(-2px);
    box-shadow:
      0 12px 24px oklch(0 0 0 / 0.38),
      0 2px 4px oklch(0 0 0 / 0.22),
      inset 0 1px 0 oklch(1 0 0 / 0.06);
  }
}

/* Tone tokens — drive both the rail and the corner-glow color. */
.mc-tone-magenta { --mc-accent: oklch(0.70 0.27 350); }
.mc-tone-gold    { --mc-accent: oklch(0.78 0.18 92);  }
.mc-tone-teal    { --mc-accent: oklch(0.72 0.18 195); }
.mc-tone-up      { --mc-accent: oklch(0.74 0.18 145); }
.mc-tone-down    { --mc-accent: oklch(0.65 0.20 25);  }

/* ── Masthead — slim, full-width across the top ────────────── */
.mc-mast {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 10px 6px;
  border-bottom: 1px solid oklch(0.18 0.015 90);
  position: relative;
  z-index: 2;
  background: oklch(0.06 0.012 90);
}
.mc-mast-brand {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 0.62rem;
  letter-spacing: 0.16em;
  color: oklch(0.92 0.005 90);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.mc-mast-vol {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 700;
  font-size: 0.54rem;
  letter-spacing: 0.16em;
  color: oklch(0.55 0.010 90);
  white-space: nowrap;
}

/* ── Field — the tone-colored "cover art" backdrop ─────────── */
.mc-field {
  position: absolute;
  inset: 30px 0 0 0;  /* below the masthead */
  background:
    radial-gradient(
      circle at 70% 25%,
      oklch(0.14 0.012 90) 0%,
      oklch(0.08 0.012 90) 60%
    );
  pointer-events: none;
}
.mc-rail {
  position: absolute;
  top: 12px;
  bottom: 12px;
  left: 8px;
  width: 2px;
  background: var(--mc-accent);
  border-radius: 999px;
}
.mc-corner-glow {
  position: absolute;
  top: -40px;
  right: -40px;
  width: 140px;
  height: 140px;
  background: radial-gradient(circle, var(--mc-accent), transparent 60%);
  opacity: 0.22;
}

/* ── Body — kicker + cover headline ────────────────────────── */
.mc-body {
  position: relative;
  z-index: 1;
  padding: 14px 12px 6px 18px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-self: end;  /* anchor toward the bottom */
}
.mc-kicker {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin: 0;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: 0.56rem;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--mc-accent);
}
.mc-kicker-dot {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--mc-accent);
}
.mc-headline {
  margin: 0;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: clamp(0.95rem, 1.7vw, 1.2rem);
  line-height: 1.02;
  letter-spacing: -0.012em;
  color: oklch(0.97 0.005 90);
  text-wrap: balance;
  /* Cap to ~3 lines so even long covers don't overflow. */
  display: -webkit-box;
  -webkit-line-clamp: 4;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* ── Foot — issue stamp at the bottom edge ─────────────────── */
.mc-foot {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px 10px 18px;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: 0.54rem;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: oklch(0.50 0.010 90);
}
.mc-foot-sep { color: oklch(0.30 0.010 90); }

/* ── State overlays ────────────────────────────────────────── */
.mc-stamp {
  position: absolute;
  z-index: 3;
  padding: 4px 10px;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

/* Missed: faded cover + diagonal "Missed" stamp on the corner */
.mc-state-missed { opacity: 0.55; }
.mc-state-missed:hover { opacity: 0.75; }
.mc-stamp-missed {
  top: 14px;
  right: -28px;
  transform: rotate(28deg);
  background: oklch(0.65 0.20 25 / 0.85);
  color: oklch(0.98 0.005 90);
  font-size: 0.62rem;
  border-radius: 2px;
  padding: 3px 36px;
  box-shadow: 0 1px 3px oklch(0 0 0 / 0.4);
}

/* Live now: small green pip in the bottom-right */
.mc-stamp-live {
  bottom: 12px;
  right: 10px;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: oklch(0.74 0.18 145 / 0.18);
  color: oklch(0.78 0.18 145);
  border: 1px solid oklch(0.74 0.18 145 / 0.50);
  border-radius: 999px;
  font-size: 0.50rem;
  padding: 2px 7px;
}
.mc-stamp-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: oklch(0.74 0.18 145);
  animation: mc-pulse 2s infinite cubic-bezier(0.4, 0, 0.6, 1);
}
@keyframes mc-pulse {
  0%, 50%, 100% { opacity: 1; }
  25% { opacity: 0.35; }
}
@media (prefers-reduced-motion: reduce) {
  .mc-stamp-dot { animation: none; }
}
</style>
