<template>
  <footer class="border-t border-dark-border mt-16" style="background: linear-gradient(135deg, rgba(10, 12, 20, 0.98), rgba(5, 6, 10, 0.98));">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <!-- Main Footer Content -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
        <!-- Brand Column -->
        <div class="lg:col-span-1">
          <div class="flex items-center gap-3 mb-4">
            <img src="/UFD_V8.png" alt="UFD Logo" class="h-10 object-contain" />
            <div>
              <h3 class="text-lg font-bold text-dark-text">Ultimate Fantasy Dashboard</h3>
            </div>
          </div>
          <p class="text-sm text-dark-textMuted leading-relaxed mb-4">
            Your all-in-one fantasy sports analytics platform. Power rankings, projections, history, and more.
          </p>

        </div>

        <!-- Resources -->
        <div>
          <h4 class="text-sm font-semibold text-dark-text uppercase tracking-wider mb-4">Resources</h4>
          <ul class="space-y-2">
            <li><a href="/powerrankings" class="text-sm text-dark-textMuted hover:text-primary transition-colors">Power Rankings</a></li>
            <li><a href="/matchups-info" class="text-sm text-dark-textMuted hover:text-primary transition-colors">Matchups</a></li>
            <li><a href="/draft-info" class="text-sm text-dark-textMuted hover:text-primary transition-colors">Draft Tools</a></li>
            <li><a href="/history-info" class="text-sm text-dark-textMuted hover:text-primary transition-colors">League History</a></li>
          </ul>
        </div>

        <!-- Sports -->
        <div>
          <h4 class="text-sm font-semibold text-dark-text uppercase tracking-wider mb-4">Sports</h4>
          <ul class="space-y-2">
            <li><a href="#" class="text-sm text-dark-textMuted hover:text-primary transition-colors">Football</a></li>
            <li><a href="#" class="text-sm text-dark-textMuted hover:text-primary transition-colors">Baseball</a></li>
            <li><a href="#" class="text-sm text-dark-textMuted hover:text-primary transition-colors">Basketball</a></li>
            <li><a href="#" class="text-sm text-dark-textMuted hover:text-primary transition-colors">Hockey</a></li>
          </ul>
        </div>

        <!-- Feedback -->
        <div>
          <h4 class="text-sm font-semibold text-dark-text uppercase tracking-wider mb-4">Feedback</h4>
          <p class="text-sm text-dark-textMuted mb-1">Help us improve! Let us know what you think.</p>
          <p class="text-xs text-dark-textMuted/60 italic mb-4">Built by fantasy managers, for fantasy managers.</p>
          <div class="flex flex-col gap-2">
            <button 
              @click="openFeatureModal"
              class="w-full px-4 py-2.5 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-sm font-medium hover:bg-yellow-500/20 transition-colors flex items-center justify-center gap-2"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              Request Feature
            </button>
            <button 
              @click="openBugModal"
              class="w-full px-4 py-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-medium hover:bg-red-500/20 transition-colors flex items-center justify-center gap-2"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Report Bug
            </button>
          </div>
        </div>
      </div>

      <!-- Bottom Bar -->
      <div class="pt-8 border-t border-dark-border/50">
        <div class="flex flex-col sm:flex-row items-center justify-between gap-4">
          <p class="text-sm text-dark-textMuted">
            © {{ currentYear }} Ultimate Fantasy Dashboard. All rights reserved.
          </p>
          <p class="text-xs text-dark-textMuted">
            Not affiliated with Sleeper, ESPN, or Yahoo
          </p>
        </div>
      </div>
    </div>

    <!-- Feature Request Modal -->
    <Teleport to="body">
      <div 
        v-if="showFeatureModal" 
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
        @click.self="closeModals"
      >
        <div class="absolute inset-0 bg-black/70 backdrop-blur-sm"></div>
        <div class="relative bg-dark-elevated rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-dark-border">
          <!-- Header -->
          <div class="px-6 py-4 border-b border-dark-border flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <svg class="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <div>
                <h3 class="text-lg font-bold text-dark-text">Request a Feature</h3>
                <p class="text-xs text-dark-textMuted">Tell us what you'd like to see</p>
              </div>
            </div>
            <button @click="closeModals" class="p-2 rounded-lg hover:bg-dark-border/50 transition-colors">
              <svg class="w-5 h-5 text-dark-textMuted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- Form -->
          <form @submit.prevent="submitFeatureRequest" class="p-6 space-y-4">
            <!-- User Info (auto-filled) -->
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-xs text-dark-textMuted mb-1">Name</label>
                <input 
                  type="text" 
                  v-model="featureForm.name" 
                  class="w-full px-3 py-2 rounded-lg bg-dark-border/50 border border-dark-border text-dark-text text-sm focus:border-primary focus:outline-none"
                  readonly
                />
              </div>
              <div>
                <label class="block text-xs text-dark-textMuted mb-1">Email</label>
                <input 
                  type="email" 
                  v-model="featureForm.email" 
                  class="w-full px-3 py-2 rounded-lg bg-dark-border/50 border border-dark-border text-dark-text text-sm focus:border-primary focus:outline-none"
                  readonly
                />
              </div>
            </div>

            <!-- Feature Title -->
            <div>
              <label class="block text-xs text-dark-textMuted mb-1">Feature Title *</label>
              <input 
                type="text" 
                v-model="featureForm.title" 
                placeholder="Brief title for your feature"
                class="w-full px-3 py-2 rounded-lg bg-dark-bg border border-dark-border text-dark-text text-sm focus:border-primary focus:outline-none placeholder-dark-textMuted"
                required
              />
            </div>

            <!-- Description -->
            <div>
              <label class="block text-xs text-dark-textMuted mb-1">Description *</label>
              <textarea 
                v-model="featureForm.description" 
                placeholder="Describe the feature you'd like to see..."
                rows="4"
                class="w-full px-3 py-2 rounded-lg bg-dark-bg border border-dark-border text-dark-text text-sm focus:border-primary focus:outline-none placeholder-dark-textMuted resize-none"
                required
              ></textarea>
            </div>

            <!-- Submit -->
            <button 
              type="submit"
              :disabled="isSubmitting"
              class="w-full py-3 rounded-lg bg-primary text-dark-bg font-semibold hover:bg-yellow-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {{ isSubmitting ? 'Submitting...' : 'Submit Feature Request' }}
            </button>
          </form>
        </div>
      </div>
    </Teleport>

    <!-- Bug Report Modal -->
    <Teleport to="body">
      <div 
        v-if="showBugModal" 
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
        @click.self="closeModals"
      >
        <div class="absolute inset-0 bg-black/70 backdrop-blur-sm"></div>
        <div class="relative bg-dark-elevated rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-dark-border">
          <!-- Header -->
          <div class="px-6 py-4 border-b border-dark-border flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                <svg class="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h3 class="text-lg font-bold text-dark-text">Report a Bug</h3>
                <p class="text-xs text-dark-textMuted">Help us squash bugs</p>
              </div>
            </div>
            <button @click="closeModals" class="p-2 rounded-lg hover:bg-dark-border/50 transition-colors">
              <svg class="w-5 h-5 text-dark-textMuted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- Form -->
          <form @submit.prevent="submitBugReport" class="p-6 space-y-4">
            <!-- User Info (auto-filled) -->
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-xs text-dark-textMuted mb-1">Name</label>
                <input 
                  type="text" 
                  v-model="bugForm.name" 
                  class="w-full px-3 py-2 rounded-lg bg-dark-border/50 border border-dark-border text-dark-text text-sm focus:border-primary focus:outline-none"
                  readonly
                />
              </div>
              <div>
                <label class="block text-xs text-dark-textMuted mb-1">Email</label>
                <input 
                  type="email" 
                  v-model="bugForm.email" 
                  class="w-full px-3 py-2 rounded-lg bg-dark-border/50 border border-dark-border text-dark-text text-sm focus:border-primary focus:outline-none"
                  readonly
                />
              </div>
            </div>

            <!-- Device Type -->
            <div>
              <label class="block text-xs text-dark-textMuted mb-1">Device Type *</label>
              <div class="flex gap-3">
                <label class="flex-1">
                  <input type="radio" v-model="bugForm.device" value="desktop" class="sr-only peer" />
                  <div class="px-4 py-2.5 rounded-lg border border-dark-border text-center cursor-pointer peer-checked:border-primary peer-checked:bg-primary/10 peer-checked:text-primary text-dark-textMuted text-sm font-medium transition-colors">
                    💻 Desktop
                  </div>
                </label>
                <label class="flex-1">
                  <input type="radio" v-model="bugForm.device" value="mobile" class="sr-only peer" />
                  <div class="px-4 py-2.5 rounded-lg border border-dark-border text-center cursor-pointer peer-checked:border-primary peer-checked:bg-primary/10 peer-checked:text-primary text-dark-textMuted text-sm font-medium transition-colors">
                    📱 Mobile
                  </div>
                </label>
              </div>
            </div>

            <!-- Page -->
            <div>
              <label class="block text-xs text-dark-textMuted mb-1">Page Where Bug Occurred *</label>
              <select 
                v-model="bugForm.page"
                class="w-full px-3 py-2 rounded-lg bg-dark-bg border border-dark-border text-dark-text text-sm focus:border-primary focus:outline-none"
                required
              >
                <option value="" disabled>Select a page</option>
                <option value="home">Home</option>
                <option value="power-rankings">Power Rankings</option>
                <option value="matchups">Matchups</option>
                <option value="projections">Projections</option>
                <option value="history">History</option>
                <option value="draft">Draft</option>
                <option value="tools">Tools</option>
                <option value="settings">Settings</option>
                <option value="other">Other</option>
              </select>
            </div>

            <!-- Bug Title -->
            <div>
              <label class="block text-xs text-dark-textMuted mb-1">Bug Summary *</label>
              <input 
                type="text" 
                v-model="bugForm.title" 
                placeholder="Brief description of the bug"
                class="w-full px-3 py-2 rounded-lg bg-dark-bg border border-dark-border text-dark-text text-sm focus:border-primary focus:outline-none placeholder-dark-textMuted"
                required
              />
            </div>

            <!-- Description -->
            <div>
              <label class="block text-xs text-dark-textMuted mb-1">Steps to Reproduce *</label>
              <textarea 
                v-model="bugForm.description" 
                placeholder="What were you doing when the bug occurred?"
                rows="3"
                class="w-full px-3 py-2 rounded-lg bg-dark-bg border border-dark-border text-dark-text text-sm focus:border-primary focus:outline-none placeholder-dark-textMuted resize-none"
                required
              ></textarea>
            </div>

            <!-- Submit -->
            <button 
              type="submit"
              :disabled="isSubmitting"
              class="w-full py-3 rounded-lg bg-red-500 text-white font-semibold hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {{ isSubmitting ? 'Submitting...' : 'Submit Bug Report' }}
            </button>
          </form>
        </div>
      </div>
    </Teleport>

    <!-- Success Toast -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition ease-out duration-300"
        enter-from-class="transform translate-y-4 opacity-0"
        enter-to-class="transform translate-y-0 opacity-100"
        leave-active-class="transition ease-in duration-200"
        leave-from-class="transform translate-y-0 opacity-100"
        leave-to-class="transform translate-y-4 opacity-0"
      >
        <div 
          v-if="showSuccessToast" 
          class="fixed bottom-6 right-6 z-50 bg-green-500 text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-3"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
          <span class="font-medium">{{ successMessage }}</span>
        </div>
      </Transition>
    </Teleport>

    <!-- Privacy / Legal bar -->
    <div style="background:#080a10;border-top:1px solid #0f1017;padding:14px 24px;display:flex;align-items:center;justify-content:center;gap:24px;flex-wrap:wrap;">
      <span style="font-size:12px;color:#374151;">© {{ new Date().getFullYear() }} Ultimate Fantasy Dashboard</span>
      <router-link to="/privacy" style="font-size:12px;color:#374151;text-decoration:none;" @mouseenter="$event.target.style.color='#22c55e'" @mouseleave="$event.target.style.color='#374151'">Privacy Policy</router-link>
      <a href="mailto:support@ultimatefantasydashboard.com" style="font-size:12px;color:#374151;text-decoration:none;" @mouseenter="$event.target.style.color='#22c55e'" @mouseleave="$event.target.style.color='#374151'">Contact</a>
    </div>
  </footer>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { supabase } from '@/lib/supabase'

const authStore = useAuthStore()

const currentYear = new Date().getFullYear()

// Modal state
const showFeatureModal = ref(false)
const showBugModal = ref(false)
const showSuccessToast = ref(false)
const successMessage = ref('')
const isSubmitting = ref(false)

// Form data
const featureForm = ref({
  name: '',
  email: '',
  title: '',
  description: ''
})

const bugForm = ref({
  name: '',
  email: '',
  device: 'desktop',
  page: '',
  title: '',
  description: ''
})

// Get user info
const userName = computed(() => authStore.profile?.full_name || authStore.user?.email?.split('@')[0] || 'Anonymous')
const userEmail = computed(() => authStore.user?.email || '')

function openFeatureModal() {
  featureForm.value = {
    name: userName.value,
    email: userEmail.value,
    title: '',
    description: ''
  }
  showFeatureModal.value = true
}

function openBugModal() {
  bugForm.value = {
    name: userName.value,
    email: userEmail.value,
    device: 'desktop',
    page: '',
    title: '',
    description: ''
  }
  showBugModal.value = true
}

function closeModals() {
  showFeatureModal.value = false
  showBugModal.value = false
}

function showToast(message: string) {
  successMessage.value = message
  showSuccessToast.value = true
  setTimeout(() => {
    showSuccessToast.value = false
  }, 3000)
}

async function submitFeatureRequest() {
  if (!featureForm.value.title || !featureForm.value.description) return
  
  isSubmitting.value = true
  
  try {
    const payload = {
      user_id: authStore.user?.id || null,
      name: featureForm.value.name,
      email: featureForm.value.email,
      title: featureForm.value.title,
      description: featureForm.value.description
    }

    const { error } = await supabase
      .from('feature_requests')
      .insert(payload)
    
    if (error) throw error

    // Send email notification (fire-and-forget — don't block on failure)
    fetch('/api/notify-submission', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'feature_request', data: payload })
    }).catch(e => console.warn('[AppFooter] notify-submission failed:', e))
    
    closeModals()
    showToast('Feature request submitted! Thank you!')
  } catch (err) {
    console.error('Error submitting feature request:', err)
    alert('Failed to submit. Please try again.')
  } finally {
    isSubmitting.value = false
  }
}

async function submitBugReport() {
  if (!bugForm.value.title || !bugForm.value.description || !bugForm.value.page) return
  
  isSubmitting.value = true
  
  try {
    const payload = {
      user_id: authStore.user?.id || null,
      name: bugForm.value.name,
      email: bugForm.value.email,
      device: bugForm.value.device,
      page: bugForm.value.page,
      title: bugForm.value.title,
      description: bugForm.value.description
    }

    const { error } = await supabase
      .from('bug_reports')
      .insert(payload)
    
    if (error) throw error

    // Send email notification (fire-and-forget — don't block on failure)
    fetch('/api/notify-submission', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'bug_report', data: payload })
    }).catch(e => console.warn('[AppFooter] notify-submission failed:', e))
    
    closeModals()
    showToast('Bug report submitted! Thank you!')
  } catch (err) {
    console.error('Error submitting bug report:', err)
    alert('Failed to submit. Please try again.')
  } finally {
    isSubmitting.value = false
  }
}
</script>
