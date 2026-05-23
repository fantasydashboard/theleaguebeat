<template>
  <!--
    EDITORIAL BREAK — magazine-style section divider. Date stamp +
    tone-colored rule + optional kicker. Inserted between major
    sections of the home page so the scroll feels like flipping
    pages, not stacking cards.

    Three sizes:
      - "small"  : just a thin rule (smallest break)
      - "stamp"  : date / kicker + rule (default)
      - "feature": large kicker, dramatic rule (between major shifts)
  -->
  <div
    class="editorial-break"
    :class="[`editorial-break-${size}`, `editorial-break-${tone}`]"
    role="separator"
    :aria-label="ariaLabel"
  >
    <div v-if="size !== 'small'" class="editorial-break-meta">
      <p v-if="kicker" class="editorial-break-kicker">
        <span class="editorial-break-dot" aria-hidden="true"></span>
        {{ kicker }}
      </p>
      <p v-if="dateStamp" class="editorial-break-date">{{ dateStamp }}</p>
    </div>
    <div class="editorial-break-rule" aria-hidden="true"></div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  /** Small kicker line — "TODAY", "THIS WEEK", "THE SEASON" */
  kicker?: string
  /** Date stamp shown on the right side of the meta row. Pass a
   *  Date for auto-format, or a string for custom text. */
  date?: Date | string
  /** Visual weight of the break. "stamp" is default. */
  size?: 'small' | 'stamp' | 'feature'
  /** Tone of the rule. Matches the rest of the design tokens. */
  tone?: 'gold' | 'teal' | 'magenta' | 'up' | 'down' | 'neutral'
}>(), {
  size: 'stamp',
  tone: 'neutral',
})

const dateStamp = computed<string | null>(() => {
  if (!props.date) return null
  if (typeof props.date === 'string') return props.date.toUpperCase()
  return formatDate(props.date)
})

const ariaLabel = computed(() => {
  const parts: string[] = []
  if (props.kicker) parts.push(props.kicker)
  if (dateStamp.value) parts.push(dateStamp.value)
  return parts.join(' · ') || 'Section break'
})

function formatDate(d: Date): string {
  // "FRIDAY · MAY 22" — newspaper dateline format
  const day = d.toLocaleDateString('en-US', { weekday: 'long' })
  const md  = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return `${day} · ${md}`.toUpperCase()
}
</script>

<style scoped>
.editorial-break {
  display: flex;
  flex-direction: column;
  gap: 10px;
  /* Tightened from 48/28 → 24/16 so the breaks no longer add a
     screen of dead space between sections. The hero's own bottom
     margin + the next section's top padding already provide some
     breathing room; the break is just the editorial signature. */
  margin: 24px 0 16px;
}

/* Tone tokens — picks up the canonical accent palette. */
.editorial-break-neutral { --eb-accent: oklch(0.78 0.18 92);  }
.editorial-break-gold    { --eb-accent: oklch(0.78 0.18 92);  }
.editorial-break-teal    { --eb-accent: oklch(0.72 0.18 195); }
.editorial-break-magenta { --eb-accent: oklch(0.70 0.27 350); }
.editorial-break-up      { --eb-accent: oklch(0.74 0.18 145); }
.editorial-break-down    { --eb-accent: oklch(0.65 0.20 25);  }

/* Meta row — kicker on left, date stamp on right. */
.editorial-break-meta {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}
.editorial-break-kicker {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  margin: 0;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: 0.78rem;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--eb-accent);
}
.editorial-break-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--eb-accent);
}
.editorial-break-date {
  margin: 0;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 700;
  font-size: 0.74rem;
  letter-spacing: 0.20em;
  text-transform: uppercase;
  color: oklch(0.55 0.010 90);
}

/* Rule — varies by size. The tone-colored stub at the left edge
   is the editorial signature; the rest of the line fades to nothing
   so the rule sits in negative space rather than walling things off. */
.editorial-break-rule {
  height: 1px;
  background: linear-gradient(
    90deg,
    var(--eb-accent) 0%,
    var(--eb-accent) 48px,
    oklch(0.20 0.015 90) 48px,
    oklch(0.20 0.015 90) 80%,
    transparent 100%
  );
}

/* Small — used between rapid sections where a full date stamp
   would be too much. */
.editorial-break-small {
  margin: 16px 0 12px;
}
.editorial-break-small .editorial-break-rule {
  background: oklch(0.20 0.015 90);
}

/* Feature — used between major shifts (weekly → daily, daily →
   season-cumulative). The rule is heavier; the kicker is bigger. */
.editorial-break-feature {
  margin: 36px 0 24px;
}
.editorial-break-feature .editorial-break-kicker {
  font-size: 0.96rem;
  letter-spacing: 0.24em;
}
.editorial-break-feature .editorial-break-rule {
  height: 2px;
  background: linear-gradient(
    90deg,
    var(--eb-accent) 0%,
    var(--eb-accent) 88px,
    oklch(0.20 0.015 90) 88px,
    oklch(0.20 0.015 90) 60%,
    transparent 100%
  );
}

@media (max-width: 720px) {
  .editorial-break { margin: 32px 0 20px; }
  .editorial-break-small { margin: 20px 0 14px; }
  .editorial-break-feature { margin: 44px 0 24px; }
  .editorial-break-kicker { font-size: 0.72rem; }
  .editorial-break-date { font-size: 0.68rem; letter-spacing: 0.16em; }
}
</style>
