<template>
  <div class="demo-shell">
    <!-- Sticky top bar -->
    <header class="demo-bar" role="banner">
      <div class="demo-bar-inner">
        <div class="demo-bar-left">
          <!-- Masthead — same monogram as the live-league layout so the
               brand is consistent across demo and product. -->
          <router-link to="/" class="demo-bar-brand" aria-label="The League Beat — back to home">
            <img src="/tlb-favicon.png" alt="The League Beat" class="demo-bar-brand-mark" />
          </router-link>
          <span class="demo-bar-pill" aria-label="You are exploring a category-league demo">
            <span class="demo-bar-dot" aria-hidden="true"></span>
            Category league demo
          </span>
          <span class="demo-bar-name">Diamond Cuts. 10-team H2H category baseball.</span>
        </div>
        <div class="demo-bar-right">
          <router-link to="/" class="demo-bar-back">Back to homepage</router-link>
          <router-link to="/demo-categories/connect" class="demo-bar-cta demo-bar-cta-link">
            Connect a league
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </router-link>
        </div>
      </div>
    </header>

    <!-- Magazine masthead nav. Same 3-section model as the live
         league layout — THE BEAT (daily home), THE ISSUE (weekly
         analysis: power rankings, matchups, draft), CHRONICLES
         (history, archive). A sub-nav row appears when the user is
         inside ISSUE or CHRONICLES.

         Each link preserves the current `?leagueId=&platform=` query
         so the live-data context survives navigation. -->
    <nav class="demo-nav" aria-label="Demo sections">
      <div class="demo-nav-inner">
        <router-link
          class="demo-nav-tab"
          :to="{ path: '/demo-categories/home', query: $route.query }"
          :class="{ 'demo-nav-tab-active': activeSection === 'beat' }"
        >The Beat</router-link>
        <router-link
          class="demo-nav-tab"
          :to="{ path: '/demo-categories/power-rankings', query: $route.query }"
          :class="{ 'demo-nav-tab-active': activeSection === 'issue' }"
        >The Issue</router-link>
        <router-link
          class="demo-nav-tab"
          :to="{ path: '/demo-categories/history', query: $route.query }"
          :class="{ 'demo-nav-tab-active': activeSection === 'chronicles' }"
        >Chronicles</router-link>
      </div>
    </nav>

    <nav
      v-if="subNav.length > 0"
      class="demo-subnav"
      :aria-label="`${activeSection === 'issue' ? 'The Issue' : 'Chronicles'} pages`"
    >
      <div class="demo-subnav-inner">
        <router-link
          v-for="tab in subNav"
          :key="tab.path"
          class="demo-subnav-tab"
          :to="{ path: `/demo-categories/${tab.path}`, query: $route.query }"
          active-class="demo-subnav-tab-active"
        >{{ tab.label }}</router-link>
      </div>
    </nav>

    <!-- Magazine masthead — reads live issue context from
         useIssueStore (each demo view publishes its fixture's week
         on mount). Fallback props supply the demo's current week
         for first-paint state before a view mounts. -->
    <IssueMasthead
      :fallback-week="demoFallback.week"
      :fallback-season="demoFallback.season"
    />

    <main class="demo-main">
      <router-view @open-signup="$emit('open-signup')" />
    </main>

    <TLBFooter />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import TLBFooter from '@/components/TLBFooter.vue'
import IssueMasthead from '@/components/issue/IssueMasthead.vue'
import { currentWeek as fixtureWeek } from '@/fixtures/categoriesLeague'

defineEmits<{ (e: 'open-signup'): void }>()

const route = useRoute()

/** First-paint fallback so the masthead reads consistently with
 *  the rest of the demo content before a child view publishes the
 *  live values via the issue store. */
const demoFallback = computed(() => ({
  week: fixtureWeek,
  season: new Date().getFullYear(),
}))

/* ─────────────────────────────────────────────────────────────────
   3-section nav model. Mirrors MyLeagueLayout's logic — top tabs
   map to THE BEAT / THE ISSUE / CHRONICLES, sub-nav row surfaces
   the leaf pages of the current section.
───────────────────────────────────────────────────────────────── */

type SectionKey = 'beat' | 'issue' | 'chronicles'

const ISSUE_PATHS = ['power-rankings', 'matchups', 'draft'] as const
const CHRONICLES_PATHS = ['history', 'archive'] as const

const activeSection = computed<SectionKey>(() => {
  const p = route.path
  if (ISSUE_PATHS.some((slug) => p.endsWith(`/${slug}`))) return 'issue'
  if (CHRONICLES_PATHS.some((slug) => p.endsWith(`/${slug}`))) return 'chronicles'
  return 'beat'
})

const subNav = computed<Array<{ path: string; label: string }>>(() => {
  if (activeSection.value === 'issue') {
    return [
      { path: 'power-rankings', label: 'Power Rankings' },
      { path: 'matchups',       label: 'Matchups'       },
      { path: 'draft',          label: 'Draft'          },
    ]
  }
  if (activeSection.value === 'chronicles') {
    return [
      { path: 'history', label: 'History' },
      { path: 'archive', label: 'Archive' },
    ]
  }
  return []
})
</script>

<style scoped>
.demo-shell {
  /* Canonical OKLCH design tokens for the category demo experience.
     Mirrors DemoLayout. Children inherit via the CSS cascade. */
  --ink-1: oklch(0.97 0.005 90);
  --ink-2: oklch(0.78 0.008 90);
  --ink-3: oklch(0.55 0.010 90);
  --ink-4: oklch(0.48 0.012 90);   /* tertiary text (captions, deck, owner names, week labels) — ~5:1 contrast on L=0.08 bg, distinct from --ink-3 */
  --ink-5: oklch(0.20 0.015 90);
  --ink-6: oklch(0.14 0.018 90);
  --ink-7: oklch(0.10 0.015 90);
  --ink-8: oklch(0.08 0.014 90);
  --accent-primary:   oklch(0.78 0.18 92);   /* gold — my-team / primary CTA */
  --accent-secondary: oklch(0.70 0.27 350);  /* magenta — story / negative */
  --accent-tertiary:  oklch(0.72 0.18 195);  /* teal — neutral accent (this demo's pill tint) */
  --accent-up:        oklch(0.74 0.18 145);  /* green — wins / positive */
  --accent-down:      oklch(0.65 0.20 25);   /* red — losses */

  min-height: 100vh;
  background: oklch(0.08 0.014 90);
  color: var(--ink-1);
  font-family: 'Barlow', sans-serif;
}
.demo-bar {
  position: sticky;
  top: 0;
  z-index: 100;
  background: oklch(0.06 0.014 90 / 0.96);
  border-bottom: 1px solid oklch(0.20 0.015 90);
  backdrop-filter: blur(6px);
}
.demo-bar-inner {
  max-width: 1280px;
  margin: 0 auto;
  padding: 12px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}
.demo-bar-left, .demo-bar-right { display: inline-flex; align-items: center; gap: 14px; }

/* Masthead — small monogram, persistent across every product page. */
.demo-bar-brand {
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
  text-decoration: none;
  border-radius: 8px;
  padding: 2px;
  transition: opacity 140ms cubic-bezier(0.22, 1, 0.36, 1);
}
@media (hover: hover) and (pointer: fine) {
  .demo-bar-brand:hover { opacity: 0.85; }
}
.demo-bar-brand:active { transform: scale(0.97); transition-duration: 100ms; }
.demo-bar-brand:focus-visible {
  outline: 2px solid var(--accent-primary);
  outline-offset: 2px;
}
.demo-bar-brand-mark {
  width: 32px;
  height: 32px;
  display: block;
  border-radius: 6px;
}

/* Teal pill so this demo differentiates from /demo (which uses magenta). */
.demo-bar-pill {
  display: inline-flex; align-items: center; gap: 6px;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.72rem; font-weight: 800;
  letter-spacing: 0.10em; text-transform: uppercase;
  color: var(--accent-tertiary);
  background: oklch(0.72 0.18 195 / 0.10);
  border: 1px solid oklch(0.72 0.18 195 / 0.35);
  padding: 4px 10px;
  border-radius: 999px;
}
.demo-bar-dot {
  width: 6px; height: 6px; border-radius: 50%;
  background: var(--accent-tertiary);
}
@media (prefers-reduced-motion: no-preference) {
  @keyframes demo-pulse {
    0%, 60%, 100% { opacity: 1; transform: scale(1); }
    30% { opacity: 0.4; transform: scale(1.4); }
  }
  .demo-bar-dot { animation: demo-pulse 2.4s infinite cubic-bezier(0.22, 1, 0.36, 1); }
}
.demo-bar-name {
  font-size: 0.82rem;
  color: oklch(0.78 0.008 90);
  font-weight: 600;
}
.demo-bar-back {
  font-size: 0.82rem;
  color: oklch(0.55 0.010 90);
  text-decoration: none;
  font-weight: 600;
  transition: color 160ms cubic-bezier(0.22, 1, 0.36, 1);
}
@media (hover: hover) and (pointer: fine) {
  .demo-bar-back:hover { color: oklch(0.78 0.008 90); }
}
.demo-bar-back:active {
  transform: scale(0.97);
  transition-duration: 100ms;
}
.demo-bar-back:focus-visible {
  outline: 2px solid oklch(0.78 0.18 92);
  outline-offset: 2px;
  border-radius: 4px;
}
.demo-bar-cta {
  display: inline-flex; align-items: center; gap: 6px;
  background: oklch(0.78 0.18 92);
  color: oklch(0.10 0.012 90);
  border: none;
  padding: 8px 14px;
  border-radius: 999px;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.84rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  cursor: pointer;
  transition: transform 180ms cubic-bezier(0.22, 1, 0.36, 1), background-color 180ms cubic-bezier(0.22, 1, 0.36, 1);
}
/* router-link variant — strip default anchor decoration. */
.demo-bar-cta-link { text-decoration: none; }
@media (prefers-reduced-motion: no-preference) {
  .demo-bar-cta:hover { transform: translateY(-1px); }
}
.demo-bar-cta:active {
  transform: scale(0.97);
  transition-duration: 100ms;
}
.demo-bar-cta:focus-visible {
  outline: 2px solid oklch(0.97 0.005 90);
  outline-offset: 2px;
}
.demo-main {
  max-width: 1280px;
  margin: 0 auto;
  padding: 36px 24px 80px;
}

/* ─── Secondary nav: demo page tabs ───────────────────────────── */
.demo-nav {
  position: sticky;
  top: 49px;
  z-index: 90;
  background: oklch(0.07 0.014 90 / 0.94);
  border-bottom: 1px solid oklch(0.18 0.015 90);
  backdrop-filter: blur(6px);
}
.demo-nav-inner {
  max-width: 1280px;
  margin: 0 auto;
  padding: 0 24px;
  display: flex;
  align-items: stretch;
  gap: 24px;
  overflow-x: auto;
  scrollbar-width: none;
}
.demo-nav-inner::-webkit-scrollbar { display: none; }
.demo-nav-tab {
  position: relative;
  display: inline-flex;
  align-items: center;
  padding: 12px 2px 11px;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: 0.10em;
  text-transform: uppercase;
  color: oklch(0.55 0.010 90);
  text-decoration: none;
  white-space: nowrap;
  border-bottom: 2px solid transparent;
  transition: color 160ms cubic-bezier(0.22, 1, 0.36, 1), border-color 160ms cubic-bezier(0.22, 1, 0.36, 1);
  cursor: pointer;
}
@media (hover: hover) and (pointer: fine) {
  .demo-nav-tab:hover:not(.is-disabled):not(.demo-nav-tab-active) {
    color: oklch(0.78 0.008 90);
  }
}
.demo-nav-tab-active {
  color: oklch(0.97 0.005 90);
  border-bottom-color: var(--accent-tertiary);
}
.demo-nav-tab:focus-visible {
  outline: 2px solid oklch(0.78 0.18 92);
  outline-offset: 2px;
  border-radius: 4px;
}
.demo-nav-tab.is-disabled {
  color: oklch(0.36 0.010 90);
  cursor: not-allowed;
  opacity: 0.55;
  pointer-events: none;
}

/* Sub-nav row — same hierarchy story as the live layout. Quieter
   than the primary nav so it reads as department-level, not as a
   competing tab strip. */
.demo-subnav {
  position: sticky;
  top: 96px;
  z-index: 89;
  background: oklch(0.06 0.012 90 / 0.96);
  border-bottom: 1px solid oklch(0.16 0.013 90);
  backdrop-filter: blur(6px);
}
.demo-subnav-inner {
  max-width: 1280px;
  margin: 0 auto;
  padding: 0 24px;
  display: flex;
  align-items: stretch;
  gap: 18px;
  overflow-x: auto;
  scrollbar-width: none;
}
.demo-subnav-inner::-webkit-scrollbar { display: none; }
.demo-subnav-tab {
  position: relative;
  display: inline-flex;
  align-items: center;
  padding: 8px 2px 7px;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.74rem;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: oklch(0.50 0.010 90);
  text-decoration: none;
  white-space: nowrap;
  border-bottom: 2px solid transparent;
  transition: color 160ms cubic-bezier(0.22, 1, 0.36, 1), border-color 160ms cubic-bezier(0.22, 1, 0.36, 1);
}
@media (hover: hover) and (pointer: fine) {
  .demo-subnav-tab:hover:not(.demo-subnav-tab-active) {
    color: oklch(0.78 0.008 90);
  }
}
.demo-subnav-tab-active {
  color: oklch(0.97 0.005 90);
  border-bottom-color: var(--accent-secondary);
}
.demo-subnav-tab:focus-visible {
  outline: 2px solid oklch(0.78 0.18 92);
  outline-offset: 2px;
  border-radius: 4px;
}

@media (max-width: 720px) {
  .demo-bar-inner { padding: 10px 16px; gap: 10px; }
  .demo-bar-name { display: none; }
  .demo-bar-back { display: none; }
  .demo-main { padding: 24px 16px 60px; }
  .demo-nav-inner { padding: 0 16px; gap: 18px; }
  .demo-nav-tab { font-size: 0.76rem; padding: 10px 2px 9px; }
  .demo-nav { top: 45px; }
  .demo-subnav { top: 86px; }
  .demo-subnav-inner { padding: 0 16px; gap: 14px; }
  .demo-subnav-tab { font-size: 0.68rem; padding: 7px 2px 6px; }
}
</style>
