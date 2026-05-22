<template>
  <div class="min-h-screen flex items-center justify-center" style="background: radial-gradient(circle at top, #1c2030, #05060a 55%);">
    <div class="text-center">
      <LoadingSpinner v-if="!error" size="lg" message="Completing sign in…" />
      <template v-else>
        <div class="text-red-500 text-5xl mb-4">⚠️</div>
        <h2 class="text-xl font-semibold text-dark-text mb-2">Sign In Failed</h2>
        <p class="text-dark-textMuted">{{ error }}</p>
        <button
          @click="router.replace('/')"
          class="mt-6 px-6 py-2 bg-primary text-gray-900 rounded-lg font-semibold hover:bg-primary/90 transition-colors"
        >
          Go Home
        </button>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '@/lib/supabase'
import LoadingSpinner from '@/components/LoadingSpinner.vue'

const router = useRouter()
const error = ref<string | null>(null)

onMounted(() => {
  console.log('[AuthCallback] Processing auth callback...')
  console.log('[AuthCallback] URL hash:', window.location.hash ? 'present' : 'none')

  // Set up the listener IMMEDIATELY before anything else
  // so we don't miss the SIGNED_IN event that Supabase fires
  // when it processes the hash tokens from implicit flow
  const { data: { subscription } } = supabase!.auth.onAuthStateChange((event, session) => {
    console.log('[AuthCallback] Auth event:', event, session?.user?.email || '')
    if (event === 'SIGNED_IN' && session) {
      subscription.unsubscribe()
      console.log('[AuthCallback] SIGNED_IN — redirecting')
      window.location.href = '/'
    }
  })

  // Also check if session is already available (hash may have been processed
  // synchronously before onMounted fired)
  supabase!.auth.getSession().then(({ data: { session } }) => {
    console.log('[AuthCallback] Immediate getSession:', session?.user?.email || 'none')
    if (session) {
      subscription.unsubscribe()
      window.location.href = '/'
    }
  })

  // Timeout fallback
  setTimeout(() => {
    subscription.unsubscribe()
    console.error('[AuthCallback] No session after 10s')
    error.value = 'Sign in timed out. Please try again.'
  }, 10000)
})
</script>
