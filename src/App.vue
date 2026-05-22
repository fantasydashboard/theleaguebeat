<template>
  <div id="tlb-root">
    <router-view @open-signup="onOpenSignup" />

    <!-- Auth modal — surfaced from any route that requests sign-in.
         Each route opens it by emitting `open-signup`. -->
    <AuthModal
      v-if="authModalOpen"
      :open="authModalOpen"
      @close="authModalOpen = false"
      @signed-in="onSignedIn"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { usePlatformsStore } from '@/stores/platforms'
import { useLeaguesStore } from '@/stores/leaguesNew'
import AuthModal from '@/components/AuthModal.vue'

const authStore = useAuthStore()
const platformsStore = usePlatformsStore()
const leaguesStore = useLeaguesStore()

const authModalOpen = ref(false)

function onOpenSignup() {
  authModalOpen.value = true
}

async function onSignedIn() {
  authModalOpen.value = false
  // Hydrate platforms + leagues so the rest of the app reads from the
  // stores without per-page fetches. All failures are non-fatal.
  try {
    await Promise.all([
      platformsStore.fetchConnectedPlatforms(),
      leaguesStore.fetchLeagues(),
    ])
  } catch (err) {
    console.warn('[App] post-signin hydration failed:', err)
  }
}

onMounted(async () => {
  try {
    await authStore.checkAuth()
    if (authStore.isAuthenticated) {
      await Promise.all([
        platformsStore.fetchConnectedPlatforms(),
        leaguesStore.fetchLeagues(),
      ])
    }
  } catch (err) {
    console.warn('[App] initial hydration failed:', err)
  }
})
</script>

<style>
/* Global resets + font face hookup. Per-layout chrome lives inside
   CategoryDemoLayout / MyLeagueLayout. */
@import url('https://fonts.googleapis.com/css2?family=Barlow:ital,wght@0,400;0,500;0,600;0,700;0,800;0,900;1,700;1,900&family=Barlow+Condensed:wght@400;500;600;700;800;900&display=swap');

html, body, #app, #tlb-root {
  margin: 0;
  padding: 0;
  min-height: 100vh;
  background: oklch(0.08 0.014 90);
  color: oklch(0.97 0.005 90);
  font-family: 'Barlow', system-ui, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

* { box-sizing: border-box; }

a { color: inherit; }

.avatar-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  border-radius: inherit;
}
</style>
