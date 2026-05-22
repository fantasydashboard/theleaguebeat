<template>
  <div class="bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-blue-500/10 border border-blue-500/30 rounded-xl p-4">
    <div class="flex items-start sm:items-center gap-3">
      <div class="w-9 h-9 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
        <svg class="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2 mb-0.5">
          <span class="text-xs font-bold uppercase tracking-widest text-blue-400">Beta</span>
          <span class="w-1 h-1 rounded-full bg-blue-400/50"></span>
          <span class="text-xs text-dark-textMuted">Free during beta</span>
        </div>
        <p class="text-sm text-dark-textSecondary leading-snug">
          Ultimate Tools is currently in beta — all features are <span class="text-blue-300 font-semibold">free to use</span>.
          We're actively improving accuracy and adding features. Your feedback helps!
        </p>
      </div>
      <a
        href="mailto:feedback@ultimatefantasydashboard.com"
        class="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 text-xs font-semibold transition-colors flex-shrink-0"
      >
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
        Send Feedback
      </a>
    </div>
  </div>
</template>

<script setup lang="ts">
// Props kept for backwards compatibility — no longer used functionally
defineProps<{
  isUltimateTier?: boolean
}>()
</script>
