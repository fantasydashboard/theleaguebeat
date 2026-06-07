<template>
  <section class="unsup" aria-labelledby="unsup-headline">
    <header class="unsup-head">
      <p class="unsup-eyebrow">
        <span class="unsup-eyebrow-bar" aria-hidden="true"></span>
        Coverage note
      </p>
      <h1 id="unsup-headline" class="unsup-headline">{{ headline }}</h1>
      <p class="unsup-sub">{{ subhead }}</p>
    </header>

    <div class="unsup-body">
      <p class="unsup-body-line">{{ body }}</p>
      <p class="unsup-body-line">
        The League Beat is focused on
        <strong class="unsup-strong">H2H Categories baseball</strong>
        for launch — the deepest editorial surface we can build
        right now. Other formats will follow on a schedule we can
        actually keep.
      </p>
    </div>

    <ul class="unsup-roadmap" role="list">
      <li class="unsup-row unsup-row-now">
        <span class="unsup-row-tag">Now</span>
        <span class="unsup-row-text">H2H Categories — baseball</span>
      </li>
      <li class="unsup-row unsup-row-soon">
        <span class="unsup-row-tag">September 2026</span>
        <span class="unsup-row-text">H2H Points — football</span>
      </li>
      <li class="unsup-row unsup-row-later">
        <span class="unsup-row-tag">After football</span>
        <span class="unsup-row-text">H2H Points — baseball</span>
      </li>
      <li class="unsup-row unsup-row-tbd">
        <span class="unsup-row-tag">TBD</span>
        <span class="unsup-row-text">Rotisserie — evaluating demand</span>
      </li>
    </ul>

    <footer class="unsup-foot">
      <button
        type="button"
        class="unsup-cta"
        @click="onSignupClick"
      >
        Email me when this lands
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M5 12h14M12 5l7 7-7 7"/>
        </svg>
      </button>
      <router-link to="/" class="unsup-secondary">
        Back to homepage
      </router-link>
    </footer>

    <p v-if="leagueLabel" class="unsup-meta">
      League detected as <span class="unsup-meta-mono">{{ leagueLabel }}</span>.
    </p>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { UnsupportedKind } from '@/utils/leagueSupport'

const props = defineProps<{
  kind: UnsupportedKind
  sport?: string
  scoringType?: string | null
}>()

const emit = defineEmits<{ (e: 'open-signup'): void }>()

/** When the user clicks the CTA, stash WHICH format they were asking
 *  about in localStorage. App.vue's post-signin hook reads this and
 *  writes a `format_interest` row so we have real demand data to
 *  prioritize the roadmap. Failures are non-fatal — we never block
 *  the signup flow on a localStorage write. */
function onSignupClick() {
  try {
    const pending = {
      requested_kind: props.kind,
      sport: props.sport ?? null,
      scoring_type: props.scoringType ?? null,
      source: 'unsupported-league-notice',
      stored_at: new Date().toISOString(),
    }
    window.localStorage.setItem('tlb_pending_format_interest', JSON.stringify(pending))
  } catch {
    // Private browsing / quota / SSR — ignore. We still open the signup.
  }
  emit('open-signup')
}

const headline = computed(() => {
  switch (props.kind) {
    case 'roto':        return 'Rotisserie leagues aren\'t covered yet.'
    case 'points':      return 'H2H Points leagues aren\'t covered yet.'
    case 'football':    return 'Football coverage lands in September.'
    case 'other-sport': return 'This sport isn\'t covered yet.'
    case 'unknown':     return 'We don\'t recognize this league type yet.'
  }
})

const subhead = computed(() => {
  switch (props.kind) {
    case 'roto':
      return 'Roto is its own product — different drama, different daily beats.'
    case 'points':
      return 'H2H Points is on the schedule, just not first.'
    case 'football':
      return 'Football launches when the NFL kicks off — September 2026.'
    case 'other-sport':
      return 'TLB is focused on baseball and football. Other sports aren\'t on the roadmap right now.'
    case 'unknown':
      return 'We couldn\'t classify the scoring format reliably.'
  }
})

const body = computed(() => {
  switch (props.kind) {
    case 'roto':
      return 'Rotisserie leagues don\'t play weekly matchups — the whole magazine cadence (daily beats, matchup-of-the-week, swing cats) is shaped around H2H. Roto needs its own pages and its own narrative engine, and we\'d rather build it right than half-fit it.'
    case 'points':
      return 'Points leagues replace cat-by-cat drama with total-point drama. The editorial pipeline (Big Night detection, swing-cat watch, lock detection) reads against cats today. Points is a clean extension after football ships.'
    case 'football':
      return 'Football brings a different cadence (Sunday-heavy), different lineup mechanics (start/sit decisions matter more), and a different sport adapter. We\'re holding the football build for an August sprint so it launches with the NFL season.'
    case 'other-sport':
      return 'Basketball, hockey, and other sports have their own data sources, their own editorial vocabulary, and their own scoring formats. We\'ll evaluate them after baseball and football prove the magazine model.'
    case 'unknown':
      return 'This is usually because the platform returned a scoring format we haven\'t mapped yet. If you think this league should be supported, the team can take a look.'
  }
})

const leagueLabel = computed(() => {
  if (!props.sport && !props.scoringType) return null
  const parts = []
  if (props.sport) parts.push(props.sport)
  if (props.scoringType) parts.push(`scoring_type: ${props.scoringType}`)
  return parts.join(' · ')
})
</script>

<style scoped>
.unsup {
  max-width: 720px;
  margin: 64px auto 96px;
  padding: 32px 36px 28px;
  border: 1px solid oklch(0.20 0.015 90);
  border-radius: 18px;
  background:
    radial-gradient(80% 60% at 50% 0%, oklch(0.78 0.18 92 / 0.04) 0%, transparent 70%),
    oklch(0.10 0.015 90 / 0.7);
  color: var(--ink-1);
  font-family: 'Barlow', sans-serif;
}
.unsup-head { margin-bottom: 24px; }
.unsup-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  margin: 0 0 10px;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.74rem;
  font-weight: 800;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--accent-secondary);
}
.unsup-eyebrow-bar {
  width: 22px; height: 2px;
  background: var(--accent-secondary);
  display: inline-block;
}
.unsup-headline {
  margin: 0 0 8px;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: clamp(1.7rem, 3.6vw, 2.3rem);
  line-height: 1.05;
  letter-spacing: -0.014em;
  color: var(--ink-1);
  max-width: 28ch;
}
.unsup-sub {
  margin: 0;
  font-size: 1rem;
  line-height: 1.45;
  color: var(--ink-2);
  max-width: 52ch;
}
.unsup-body {
  margin-bottom: 22px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.unsup-body-line {
  margin: 0;
  font-size: 0.96rem;
  line-height: 1.55;
  color: var(--ink-2);
  max-width: 60ch;
}
.unsup-strong {
  color: var(--ink-1);
  font-weight: 700;
}
.unsup-roadmap {
  list-style: none;
  margin: 22px 0 26px;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.unsup-row {
  display: grid;
  grid-template-columns: 140px 1fr;
  align-items: baseline;
  gap: 14px;
  padding: 10px 14px;
  border: 1px solid oklch(0.18 0.015 90);
  border-radius: 10px;
  background: oklch(0.11 0.015 90 / 0.6);
}
.unsup-row-tag {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.10em;
  text-transform: uppercase;
  color: var(--ink-3);
}
.unsup-row-now .unsup-row-tag    { color: oklch(0.74 0.18 145); }
.unsup-row-soon .unsup-row-tag   { color: oklch(0.78 0.18 92);  }
.unsup-row-later .unsup-row-tag  { color: oklch(0.72 0.18 195); }
.unsup-row-tbd .unsup-row-tag    { color: var(--ink-4); }
.unsup-row-text {
  font-size: 0.94rem;
  color: var(--ink-1);
  font-weight: 500;
}
.unsup-row-now {
  border-color: oklch(0.74 0.18 145 / 0.30);
  background: linear-gradient(135deg, oklch(0.74 0.18 145 / 0.06), oklch(0.11 0.015 90 / 0.5) 75%);
}
.unsup-foot {
  display: flex;
  align-items: center;
  gap: 18px;
  flex-wrap: wrap;
  padding-top: 18px;
  border-top: 1px solid oklch(0.16 0.018 90);
}
.unsup-cta {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: oklch(0.78 0.18 92);
  color: oklch(0.10 0.012 90);
  border: none;
  padding: 11px 18px;
  border-radius: 999px;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.88rem;
  font-weight: 900;
  letter-spacing: 0.06em;
  cursor: pointer;
  transition: transform 160ms cubic-bezier(0.22, 1, 0.36, 1),
              background-color 160ms cubic-bezier(0.22, 1, 0.36, 1);
}
@media (hover: hover) and (pointer: fine) {
  .unsup-cta:hover { transform: translateY(-1px); }
}
.unsup-cta:active {
  transform: scale(0.97);
  transition-duration: 100ms;
}
.unsup-cta:focus-visible {
  outline: 2px solid oklch(0.97 0.005 90);
  outline-offset: 2px;
}
.unsup-secondary {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.84rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  color: var(--ink-2);
  text-decoration: none;
  padding: 6px 4px;
  border-bottom: 1px solid transparent;
  transition: color 160ms cubic-bezier(0.22, 1, 0.36, 1),
              border-color 160ms cubic-bezier(0.22, 1, 0.36, 1);
}
@media (hover: hover) and (pointer: fine) {
  .unsup-secondary:hover {
    color: var(--ink-1);
    border-color: oklch(0.36 0.015 90);
  }
}
.unsup-meta {
  margin: 18px 0 0;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.72rem;
  letter-spacing: 0.06em;
  color: var(--ink-4);
}
.unsup-meta-mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.74rem;
  color: var(--ink-3);
  padding: 1px 6px;
  border-radius: 4px;
  background: oklch(0.13 0.015 90);
}

@media (max-width: 600px) {
  .unsup {
    margin: 32px 16px 64px;
    padding: 24px 22px 22px;
    border-radius: 14px;
  }
  .unsup-row {
    grid-template-columns: 1fr;
    gap: 4px;
  }
}
</style>
