<template>
  <!--
    Editorial-voiced panel rendered when a connected league's format
    isn't on the wire yet. Phase 0 surfaces H2H points leagues here
    until Phase 1+ wires per-page points-mode coverage.

    Voice rule: third-person, no "your league". Treats the panel as
    an editorial note from the masthead rather than an apology.
  -->
  <section class="unsupported" role="status" aria-live="polite">
    <div class="unsupported-mark" aria-hidden="true">
      <img src="/tlb-favicon.png" alt="" class="unsupported-mark-img" />
    </div>

    <header class="unsupported-head">
      <p class="unsupported-eyebrow">
        <span class="unsupported-eyebrow-bar" aria-hidden="true"></span>
        Coverage note
      </p>
      <h1 class="unsupported-headline">{{ headline }}</h1>
      <p class="unsupported-deck">{{ deck }}</p>
    </header>

    <dl class="unsupported-meta">
      <div class="unsupported-meta-row">
        <dt>League</dt>
        <dd>{{ leagueName || 'Unnamed league' }}</dd>
      </div>
      <div v-if="platformLabel" class="unsupported-meta-row">
        <dt>Platform</dt>
        <dd>{{ platformLabel }}</dd>
      </div>
      <div class="unsupported-meta-row">
        <dt>Format</dt>
        <dd>{{ formatLabel }}</dd>
      </div>
    </dl>

    <p class="unsupported-footnote">
      We cover H2H category leagues across baseball today.
      H2H points is queued for the next coverage expansion.
    </p>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  /** Connected league name — surfaced so the panel feels addressed
   *  to this specific league, not a generic placeholder. */
  leagueName?: string
  /** Detected format that triggered the panel. Phase 0 only routes
   *  `h2h-points` here, but the prop is open for future formats. */
  format: 'h2h-points' | 'h2h-roto' | 'h2h-total-points' | string
  /** Platform key ('yahoo' / 'espn' / 'sleeper') — drives the
   *  display label. */
  platform?: string
}>()

const platformLabel = computed(() => {
  const p = props.platform?.toLowerCase()
  if (p === 'yahoo')   return 'Yahoo'
  if (p === 'espn')    return 'ESPN'
  if (p === 'sleeper') return 'Sleeper'
  return null
})

const formatLabel = computed(() => {
  switch (props.format) {
    case 'h2h-points':       return 'H2H Points'
    case 'h2h-roto':         return 'Rotisserie'
    case 'h2h-total-points': return 'Season Total Points'
    default:                 return props.format
  }
})

const headline = computed(() => {
  if (props.format === 'h2h-points') {
    return 'This league’s format isn’t on the wire yet.'
  }
  return 'This league’s format isn’t on the wire yet.'
})

const deck = computed(() => {
  if (props.format === 'h2h-points') {
    return 'H2H points coverage is in the works. The masthead has it queued for the next expansion — check back as the issues roll out.'
  }
  return 'The masthead doesn’t cover this format yet. Check back as coverage expands.'
})
</script>

<style scoped>
.unsupported {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 28px;
  padding: 80px 24px;
  min-height: 60vh;
  font-family: 'Barlow', sans-serif;
  color: var(--ink-1);

  /* Same soft brand glow as the loading state so the publication
     atmosphere carries even when no story is being told. */
  background:
    radial-gradient(
      ellipse 600px 400px at 50% 35%,
      oklch(0.66 0.22 0 / 0.08),
      transparent 70%
    ),
    radial-gradient(
      ellipse 700px 400px at 50% 95%,
      oklch(0.78 0.18 92 / 0.05),
      transparent 70%
    );
  border-radius: 24px;
}

.unsupported-mark {
  width: 64px;
  height: 64px;
  border-radius: 14px;
  filter: drop-shadow(0 12px 28px oklch(0 0 0 / 0.40));
}
.unsupported-mark-img {
  width: 100%;
  height: 100%;
  display: block;
  border-radius: 14px;
}

.unsupported-head {
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-width: 560px;
}
.unsupported-eyebrow {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin: 0;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.20em;
  text-transform: uppercase;
  color: var(--accent-secondary);
}
.unsupported-eyebrow-bar {
  display: inline-block;
  width: 24px;
  height: 1px;
  background: var(--accent-secondary);
}
.unsupported-headline {
  margin: 0;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: clamp(1.8rem, 3.6vw, 2.8rem);
  line-height: 1.04;
  letter-spacing: -0.014em;
  color: var(--ink-1);
}
.unsupported-deck {
  margin: 0;
  font-size: 1rem;
  line-height: 1.55;
  color: var(--ink-3);
}

.unsupported-meta {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 16px;
  width: 100%;
  max-width: 640px;
  margin: 0;
  padding: 20px 24px;
  border-top: 1px solid oklch(0.20 0.015 90);
  border-bottom: 1px solid oklch(0.20 0.015 90);
}
.unsupported-meta-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: center;
}
.unsupported-meta-row dt {
  margin: 0;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.74rem;
  font-weight: 800;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--ink-4, var(--ink-3));
}
.unsupported-meta-row dd {
  margin: 0;
  font-size: 0.96rem;
  font-weight: 600;
  color: var(--ink-1);
}

.unsupported-footnote {
  margin: 0;
  max-width: 460px;
  font-size: 0.86rem;
  font-style: italic;
  color: var(--ink-3);
  line-height: 1.5;
}

@media (prefers-reduced-motion: reduce) {
  .unsupported { animation: none; }
}
</style>
