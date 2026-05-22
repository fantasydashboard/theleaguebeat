<template>
  <footer class="tlb-footer" role="contentinfo">
    <div class="tlb-footer-inner">
      <div class="tlb-footer-brand">
        <router-link to="/" class="tlb-footer-mark" aria-label="The League Beat — home">
          <img
            src="/tlb-logo-primary.png"
            alt="The League Beat"
            class="tlb-footer-mark-img"
          />
        </router-link>
      </div>

      <nav class="tlb-footer-nav" aria-label="Footer navigation">
        <router-link to="/demo-categories/connect" class="tlb-footer-link">
          Connect a league
        </router-link>
        <router-link to="/settings" class="tlb-footer-link">
          Settings
        </router-link>
        <router-link to="/privacy" class="tlb-footer-link">
          Privacy
        </router-link>
      </nav>

      <p class="tlb-footer-meta">
        © {{ year }} The League Beat. The online magazine your league deserves.
      </p>
    </div>
  </footer>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const year = computed(() => new Date().getFullYear())
</script>

<style scoped>
.tlb-footer {
  background: oklch(0.06 0.014 90);
  border-top: 1px solid oklch(0.18 0.015 90);
  padding: 56px 24px 36px;
  color: oklch(0.55 0.010 90);
  font-family: 'Barlow', sans-serif;
}
.tlb-footer-inner {
  max-width: 1280px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 32px 48px;
  align-items: start;
}
.tlb-footer-brand {
  display: flex;
}
.tlb-footer-mark {
  display: inline-flex;
  text-decoration: none;
  transition: opacity 160ms cubic-bezier(0.22, 1, 0.36, 1);
}
@media (hover: hover) and (pointer: fine) {
  .tlb-footer-mark:hover { opacity: 0.85; }
}
.tlb-footer-mark-img {
  display: block;
  width: 260px;
  height: auto;
  /* The primary lockup includes its own dark backdrop; this keeps the
     edges clean against the footer's slightly different dark tone. */
  border-radius: 4px;
}

.tlb-footer-nav {
  display: flex;
  flex-wrap: wrap;
  gap: 18px 28px;
  align-items: center;
  justify-self: end;
  align-self: center;
}
.tlb-footer-link {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: 0.10em;
  text-transform: uppercase;
  color: oklch(0.78 0.008 90);
  text-decoration: none;
  transition: color 140ms cubic-bezier(0.22, 1, 0.36, 1);
}
@media (hover: hover) and (pointer: fine) {
  .tlb-footer-link:hover { color: oklch(0.97 0.005 90); }
}
.tlb-footer-link:active { transform: scale(0.97); transition-duration: 100ms; }
.tlb-footer-link:focus-visible {
  outline: 2px solid oklch(0.78 0.18 92);
  outline-offset: 2px;
  border-radius: 4px;
}

.tlb-footer-meta {
  grid-column: 1 / -1;
  margin: 0;
  padding-top: 24px;
  border-top: 1px solid oklch(0.14 0.018 90);
  font-size: 0.82rem;
  color: oklch(0.45 0.010 90);
}

@media (max-width: 720px) {
  .tlb-footer { padding: 40px 16px 24px; }
  .tlb-footer-inner {
    grid-template-columns: 1fr;
    gap: 24px;
  }
  .tlb-footer-nav { justify-self: start; }
  .tlb-footer-mark-img { width: 220px; }
}
</style>
