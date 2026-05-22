<template>
  <!--
    Friendly "we couldn't load this league" surface for the category
    demo views. Two recovery paths, both presented as primary actions:
      1. Try a different league → /demo-categories/connect (re-enter the
         leagueId or pick a different platform)
      2. Browse the demo       → /demo-categories/home (fixture-only,
         no query params — gives the visitor an immediate, working view)
    The raw error message from the adapter is preserved as sub-text so
    the user (or a support agent reading a screenshot) can tell at a
    glance whether this was an auth failure, a 404, etc.
  -->
  <div class="live-banner live-banner-error" role="alert">
    <div class="live-banner-error-text">
      <p class="live-banner-error-headline">We couldn't load this league.</p>
      <p class="live-banner-error-body">{{ message }}</p>
    </div>
    <div class="live-banner-error-actions">
      <router-link to="/demo-categories/connect" class="live-banner-action live-banner-action-primary">
        Try a different league
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M5 12h14M12 5l7 7-7 7"/>
        </svg>
      </router-link>
      <router-link to="/demo-categories/home" class="live-banner-action live-banner-action-secondary">
        Browse the demo
      </router-link>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  /** Raw error message from the adapter — surfaced as sub-text. */
  message: string
}>()
</script>

<style scoped>
/* Mirrors the existing `.live-banner` family in the views' scoped
   stylesheets so this drop-in looks identical to the inline banner
   it replaces. Kept self-contained so the component can travel
   without depending on any global stylesheet. */
.live-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  padding: 14px 16px;
  border-radius: 10px;
  border: 1px solid oklch(0.20 0.015 90);
  background: oklch(0.10 0.014 90);
  font-size: 0.92rem;
  color: var(--ink-2);
}
.live-banner-error {
  border-color: oklch(0.65 0.20 25 / 0.45);
  background: oklch(0.65 0.20 25 / 0.08);
}
.live-banner-error-text {
  flex: 1 1 260px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.live-banner-error-headline {
  margin: 0;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.86rem;
  font-weight: 800;
  letter-spacing: 0.10em;
  text-transform: uppercase;
  color: var(--accent-down);
}
.live-banner-error-body {
  margin: 0;
  font-size: 0.92rem;
  color: var(--ink-2);
  /* Long error messages from upstream APIs can run wide — break to
     keep the banner from blowing out the page layout. */
  overflow-wrap: anywhere;
}
.live-banner-error-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.live-banner-action {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.82rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  text-decoration: none;
  padding: 6px 12px;
  border-radius: 999px;
  transition: background-color 160ms cubic-bezier(0.22, 1, 0.36, 1),
              border-color 160ms cubic-bezier(0.22, 1, 0.36, 1);
}
.live-banner-action-primary {
  color: var(--ink-1);
  background: oklch(0.20 0.015 90);
  border: 1px solid oklch(0.32 0.012 90);
}
.live-banner-action-secondary {
  color: var(--ink-2);
  background: transparent;
  border: 1px solid oklch(0.28 0.012 90);
}
@media (hover: hover) and (pointer: fine) {
  .live-banner-action-primary:hover {
    background: oklch(0.26 0.015 90);
  }
  .live-banner-action-secondary:hover {
    color: var(--ink-1);
    border-color: oklch(0.40 0.012 90);
  }
}
</style>
