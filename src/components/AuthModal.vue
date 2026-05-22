<template>
  <Teleport to="body">
    <div 
      v-if="isOpen" 
      class="fixed inset-0 z-50 flex items-center justify-center p-4"
      @click.self="$emit('close')"
    >
      <!-- Backdrop -->
      <div class="absolute inset-0 bg-black/70 backdrop-blur-sm"></div>
      
      <!-- Modal -->
      <div class="relative bg-dark-card rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-dark-border/50">
        <!-- Header -->
        <div class="p-6 text-center border-b border-dark-border/30">
          <img src="/tlb-favicon.png" alt="The League Beat" class="w-16 mx-auto mb-2" style="height:auto;" />
          <h2 class="text-2xl font-bold text-dark-text">
            {{ mode === 'login' ? 'Welcome Back' : 'Create Account' }}
          </h2>
          <p class="text-sm text-dark-textMuted mt-1">
            {{ mode === 'login' ? 'Sign in to access your leagues' : 'Start dominating your fantasy leagues' }}
          </p>
        </div>

        <!-- Body -->
        <div class="p-6 space-y-4">
          <!-- OAuth Buttons -->
          <div class="space-y-3">
            <button
              @click="handleOAuth('google')"
              :disabled="loading"
              class="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl bg-white text-gray-900 font-medium hover:bg-gray-100 transition-colors disabled:opacity-50"
            >
              <svg class="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </button>

          </div>

          <!-- Divider -->
          <div class="relative">
            <div class="absolute inset-0 flex items-center">
              <div class="w-full border-t border-dark-border/50"></div>
            </div>
            <div class="relative flex justify-center text-sm">
              <span class="px-2 bg-dark-card text-dark-textMuted">or continue with email</span>
            </div>
          </div>

          <!-- Email Form -->
          <div class="space-y-4">
            <div v-if="mode === 'signup'">
              <label class="block text-sm font-medium text-dark-textMuted mb-1">Full Name</label>
              <input
                v-model="fullName"
                type="text"
                class="w-full px-4 py-3 rounded-xl bg-dark-bg border border-dark-border/50 text-dark-text placeholder-dark-textMuted focus:border-primary focus:outline-none"
                placeholder="John Smith"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-dark-textMuted mb-1">Email</label>
              <input
                v-model="email"
                type="email"
                required
                class="w-full px-4 py-3 rounded-xl bg-dark-bg border border-dark-border/50 text-dark-text placeholder-dark-textMuted focus:border-primary focus:outline-none"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-dark-textMuted mb-1">Password</label>
              <input
                v-model="password"
                type="password"
                required
                minlength="6"
                @keyup.enter="handleSubmit"
                class="w-full px-4 py-3 rounded-xl bg-dark-bg border border-dark-border/50 text-dark-text placeholder-dark-textMuted focus:border-primary focus:outline-none"
                placeholder="••••••••"
              />
            </div>

            <!-- Error Message -->
            <div v-if="errorMessage" class="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
              <p class="text-sm text-red-400">{{ errorMessage }}</p>
            </div>

            <!-- Success Message -->
            <div v-if="successMessage" class="p-3 rounded-lg bg-green-500/10 border border-green-500/30">
              <p class="text-sm text-green-400">{{ successMessage }}</p>
            </div>

            <button
              type="button"
              @click="handleSubmit"
              :disabled="loading"
              class="w-full px-4 py-3 rounded-xl bg-primary text-gray-900 font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <span v-if="loading" class="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-900"></span>
              <span v-else>{{ mode === 'login' ? 'Sign In' : 'Create Account' }}</span>
            </button>
          </div>

          <!-- Forgot Password -->
          <div v-if="mode === 'login'" class="text-center">
            <button 
              @click="handleForgotPassword"
              class="text-sm text-primary hover:underline"
            >
              Forgot your password?
            </button>
          </div>
        </div>

        <!-- Footer -->
        <div class="px-6 py-4 bg-dark-bg/50 border-t border-dark-border/30 text-center">
          <p class="text-sm text-dark-textMuted">
            {{ mode === 'login' ? "Don't have an account?" : 'Already have an account?' }}
            <button 
              @click="toggleMode"
              class="text-primary font-medium hover:underline ml-1"
            >
              {{ mode === 'login' ? 'Sign up' : 'Sign in' }}
            </button>
          </p>
        </div>

        <!-- Close Button -->
        <button
          @click="$emit('close')"
          class="absolute top-4 right-4 p-2 rounded-lg hover:bg-dark-border/50 transition-colors"
        >
          <svg class="w-5 h-5 text-dark-textMuted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'

const props = defineProps<{
  isOpen: boolean
  initialMode?: 'login' | 'signup'
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'success'): void
}>()

const authStore = useAuthStore()

// Form state
const mode = ref<'login' | 'signup'>(props.initialMode || 'login')
const email = ref('')
const password = ref('')
const fullName = ref('')
const loading = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

// Watch for initialMode changes
watch(() => props.initialMode, (newMode) => {
  if (newMode) {
    mode.value = newMode
  }
})

// Reset form when modal opens
watch(() => props.isOpen, (isOpen) => {
  if (isOpen) {
    if (props.initialMode) {
      mode.value = props.initialMode
    }
    errorMessage.value = ''
    successMessage.value = ''
  }
})

function toggleMode() {
  mode.value = mode.value === 'login' ? 'signup' : 'login'
  errorMessage.value = ''
  successMessage.value = ''
}

async function handleSubmit() {
  errorMessage.value = ''
  successMessage.value = ''
  loading.value = true

  try {
    if (mode.value === 'login') {
      const result = await authStore.signIn(email.value, password.value)
      if (result.success) {
        emit('success')
        emit('close')
      } else {
        errorMessage.value = result.error || 'Sign in failed'
      }
    } else {
      const result = await authStore.signUp(email.value, password.value, fullName.value)
      if (result.success) {
        successMessage.value = "Check your email for a confirmation link! If you don't see it, check your spam folder."
      } else {
        errorMessage.value = result.error || 'Sign up failed'
      }
    }
  } finally {
    loading.value = false
  }
}

async function handleOAuth(provider: 'google') {
  loading.value = true
  errorMessage.value = ''

  try {
    const result = await authStore.signInWithOAuth(provider)
    if (!result.success) {
      errorMessage.value = result.error || 'OAuth sign in failed'
    }
  } catch (err) {
    errorMessage.value = 'Sign in failed. Please try again.'
  } finally {
    loading.value = false
  }
}

async function handleForgotPassword() {
  if (!email.value) {
    errorMessage.value = 'Please enter your email address first'
    return
  }

  loading.value = true
  errorMessage.value = ''

  const result = await authStore.resetPassword(email.value)
  if (result.success) {
    successMessage.value = 'Check your email for a password reset link!'
  } else {
    errorMessage.value = result.error || 'Password reset failed'
  }

  loading.value = false
}
</script>
