<template>
  <!-- `note` — an aside in the body copy. Used where the section is
       time-critical and anything larger is an obstruction. -->
  <p v-if="handoff.tone === 'note'" class="ufd-note">
    {{ handoff.body }}
    <a :href="href" target="_blank" rel="noopener">{{ handoff.cta }} →</a>
  </p>

  <!-- `card` — unambiguously a promo. Earned only where the pitch is
       specific enough to need a sentence of its own. -->
  <div v-else class="ufd-card">
    <span class="ufd-copy">
      <span class="ufd-who">Ultimate Fantasy Dashboard</span>
      {{ handoff.body }}
    </span>
    <a :href="href" class="ufd-cta" target="_blank" rel="noopener">{{ handoff.cta }}</a>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { handoffHref, type Handoff } from '@/editorial/issue/handoff'

const props = defineProps<{ handoff: Handoff }>()
const href = computed(() => handoffHref(props.handoff))
</script>

<style scoped>
/**
 * UFD's brand lime, used as OUTLINE AND TEXT ONLY — never a fill.
 *
 * The League Beat fills with gold, and a filled lime button sitting
 * under a gold Present pill reads as a second control of the same
 * kind: the eye cannot tell which product owns which. Weight does the
 * separating, so the colour is free to do the branding.
 */
.ufd-lime { color: #c6ff3a; }

.ufd-note {
  margin: 16px 0 0;
  padding-left: 15px;
  border-left: 2px solid #c6ff3a;
  font-size: 0.94rem;
  line-height: 1.55;
  color: oklch(0.72 0.01 90);
  max-width: 62ch;
}
.ufd-note a {
  color: #c6ff3a;
  text-decoration: none;
  font-weight: 700;
  white-space: nowrap;
}
.ufd-note a:hover { text-decoration: underline; }

.ufd-card {
  margin-top: 16px;
  display: flex;
  align-items: center;
  gap: 18px;
  padding: 15px 18px;
  border-radius: 12px;
  /* Neutral card, matching the section rows around it. The lime lives
     on the label and the outlined button, nowhere else. */
  border: 1px solid oklch(0.18 0.015 90);
  background: oklch(0.09 0.012 90);
}
.ufd-copy {
  flex: 1;
  font-size: 0.92rem;
  line-height: 1.5;
  color: oklch(0.72 0.01 90);
  max-width: 56ch;
}
.ufd-who {
  display: block;
  margin-bottom: 5px;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.63rem;
  font-weight: 800;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: #c6ff3a;
}
.ufd-cta {
  flex: none;
  font-size: 0.8rem;
  font-weight: 800;
  padding: 9px 16px;
  border-radius: 999px;
  text-decoration: none;
  white-space: nowrap;
  border: 1px solid #c6ff3a;
  color: #c6ff3a;
  background: transparent;
}
.ufd-cta:hover { background: #c6ff3a; color: #12200a; }

@media (max-width: 640px) {
  .ufd-card { flex-direction: column; align-items: flex-start; gap: 12px; }
  .ufd-cta { align-self: stretch; text-align: center; }
}
</style>
