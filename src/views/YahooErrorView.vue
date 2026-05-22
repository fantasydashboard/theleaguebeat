<template>
  <div class="min-h-screen flex items-center justify-center" style="background: radial-gradient(circle at top, #1c2030, #05060a 55%);">
    <div class="text-center max-w-md px-4">
      <div class="text-red-500 text-6xl mb-4">⚠️</div>
      
      <h2 class="text-2xl font-semibold text-dark-text mb-2">
        Yahoo Connection Failed
      </h2>
      <p class="text-dark-textMuted mb-6">
        {{ errorMessage }}
      </p>
      
      <div class="flex gap-4 justify-center">
        <button 
          @click="tryAgain"
          class="px-6 py-2 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-500 transition-colors"
        >
          Try Again
        </button>
        <button 
          @click="goHome"
          class="px-6 py-2 bg-dark-card border border-dark-border text-dark-text rounded-lg font-semibold hover:bg-dark-border transition-colors"
        >
          Go Home
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()

const errorMessage = computed(() => {
  const error = route.query.error as string
  
  const errorMessages: Record<string, string> = {
    'no_code': 'No authorization code received from Yahoo.',
    'token_exchange_failed': 'Failed to exchange authorization code for tokens.',
    'access_denied': 'You denied access to your Yahoo account.',
    'default': 'An unexpected error occurred while connecting to Yahoo.'
  }
  
  return errorMessages[error] || errorMessages['default']
})

function tryAgain() {
  // Redirect to Yahoo OAuth
  window.location.href = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/yahoo-auth`
}

function goHome() {
  router.replace('/')
}
</script>
