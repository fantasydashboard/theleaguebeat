<template>
  <div class="min-h-screen flex items-center justify-center" style="background: radial-gradient(circle at top, #1c2030, #05060a 55%);">
    <div class="text-center">
      <LoadingSpinner v-if="!error" size="lg" message="Please wait while we connect your Yahoo account." />
      <template v-else>
        <div class="text-red-500 text-5xl mb-4">⚠️</div>
        <h2 class="text-xl font-semibold text-dark-text mb-2">Connection Failed</h2>
        <p class="text-dark-textMuted">{{ error }}</p>
      </template>
      <p v-if="debugInfo" class="text-xs text-dark-textMuted mt-4 font-mono">{{ debugInfo }}</p>
      
      <button 
        v-if="error"
        @click="goHome"
        class="mt-6 px-6 py-2 bg-primary text-gray-900 rounded-lg font-semibold hover:bg-primary/90 transition-colors"
      >
        Go Home
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'
import LoadingSpinner from '@/components/LoadingSpinner.vue'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const error = ref<string | null>(null)
const debugInfo = ref<string | null>(null)

function goHome() {
  router.replace('/')
}

async function storeYahooTokens() {
  try {
    console.log('Yahoo callback - processing...')
    console.log('Query params:', route.query)
    
    // Read tokens from query params (not hash)
    const accessToken = route.query.yahoo_access_token as string
    const refreshToken = route.query.yahoo_refresh_token as string
    const expiresIn = route.query.yahoo_expires_in as string
    const yahooUserId = route.query.yahoo_user_id as string
    const returnTo = (route.query.return_to as string) || '/'

    console.log('Yahoo callback - tokens received:', { 
      hasAccessToken: !!accessToken, 
      hasRefreshToken: !!refreshToken,
      expiresIn,
      yahooUserId 
    })

    if (!accessToken || !refreshToken) {
      error.value = 'Missing tokens from Yahoo'
      return
    }

    // Wait for auth — after a full-page OAuth redirect, the session restores
    // asynchronously. Poll for up to 8 seconds before giving up.
    await authStore.initialize()
    
    if (!authStore.isAuthenticated || !authStore.user?.id) {
      // Session didn't restore immediately — wait for onAuthStateChange
      console.log('Session not ready yet, waiting for auth state change...')
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('auth_timeout')), 8000)
        const { data: { subscription } } = supabase!.auth.onAuthStateChange((event, session) => {
          if (session?.user) {
            clearTimeout(timeout)
            subscription.unsubscribe()
            resolve()
          }
        })
      }).catch(() => {
        console.log('Auth timeout — user not signed in')
      })
    }
    
    console.log('Auth state:', { 
      isAuthenticated: authStore.isAuthenticated, 
      userId: authStore.user?.id 
    })

    if (!authStore.isAuthenticated || !authStore.user?.id) {
      error.value = 'You must be logged in to connect Yahoo. Please sign in first, then try connecting Yahoo again.'
      debugInfo.value = 'Session did not restore after OAuth redirect. Try signing in again.'
      return
    }


    if (!supabase) {
      error.value = 'Database not configured'
      return
    }

    // Calculate token expiration
    const expiresAt = new Date(Date.now() + parseInt(expiresIn || '3600') * 1000).toISOString()

    console.log('Saving Yahoo tokens to database...')

    // Store directly in Supabase
    const { data, error: upsertError } = await supabase
      .from('connected_platforms')
      .upsert({
        user_id: authStore.user.id,
        platform: 'yahoo',
        platform_user_id: yahooUserId || null,
        platform_username: null,
        access_token: accessToken,
        refresh_token: refreshToken,
        token_expires_at: expiresAt,
        scopes: 'fspt-r'
      }, {
        onConflict: 'user_id,platform'
      })
      .select()
      .single()

    if (upsertError) {
      console.error('Error saving Yahoo tokens:', upsertError)
      error.value = `Failed to save: ${upsertError.message}`
      debugInfo.value = JSON.stringify(upsertError)
      return
    }

    console.log('Yahoo tokens saved successfully:', data)

    // Success! Prefer the opt-in localStorage origin (set by callers
    // like the category demo connect view) so deep flows can resume
    // exactly where they left off. Falls back to the legacy
    // `return_to` query param, then '/'.
    let destination = returnTo
    try {
      const origin = localStorage.getItem('ufd_yahoo_oauth_origin')
      if (origin) {
        destination = origin
        localStorage.removeItem('ufd_yahoo_oauth_origin')
      }
    } catch {
      // Private mode — ignore, use the query-param fallback.
    }
    router.replace(destination)
  } catch (err: any) {
    console.error('Yahoo callback error:', err)
    error.value = err.message || 'Failed to connect Yahoo account'
    debugInfo.value = err.stack || err.toString()
  }
}

onMounted(() => {
  storeYahooTokens()
})
</script>
