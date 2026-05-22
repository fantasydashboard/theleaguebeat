<template>
  <div class="min-h-[60vh] flex items-center justify-center p-4">
    <div class="max-w-lg w-full text-center">
      <!-- Lock Icon -->
      <div class="mb-6">
        <div class="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-yellow-500/20 to-orange-500/20 flex items-center justify-center">
          <svg class="w-10 h-10 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
      </div>

      <!-- Title -->
      <h2 class="text-2xl font-bold text-dark-text mb-2">
        {{ title }}
      </h2>

      <!-- Description -->
      <p class="text-dark-textMuted mb-6">
        {{ description }}
      </p>

      <!-- Feature List -->
      <div v-if="features.length > 0" class="bg-dark-card/50 rounded-xl p-4 mb-6 text-left">
        <div class="text-sm font-medium text-dark-text mb-3">What you'll unlock:</div>
        <ul class="space-y-2">
          <li v-for="feature in features" :key="feature" class="flex items-start gap-2 text-sm text-dark-textMuted">
            <svg class="w-5 h-5 text-primary flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            <span>{{ feature }}</span>
          </li>
        </ul>
      </div>

      <!-- Pricing -->
      <div class="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border border-yellow-500/30 rounded-xl p-6 mb-6">
        <div class="text-sm text-yellow-400 font-medium mb-1">{{ tierName }}</div>
        <div class="text-3xl font-bold text-dark-text mb-1">
          {{ price }}
          <span v-if="priceSubtext" class="text-base font-normal text-dark-textMuted">{{ priceSubtext }}</span>
        </div>
        <div v-if="priceNote" class="text-xs text-dark-textMuted">{{ priceNote }}</div>
      </div>

      <!-- CTA Buttons -->
      <div class="flex flex-col sm:flex-row gap-3 justify-center">
        <button
          @click="$emit('upgrade')"
          class="px-6 py-3 rounded-xl bg-gradient-to-r from-yellow-500 to-orange-500 text-gray-900 font-bold hover:from-yellow-400 hover:to-orange-400 transition-all shadow-lg"
        >
          {{ ctaText }}
        </button>
        <button
          v-if="showLearnMore"
          @click="$emit('learn-more')"
          class="px-6 py-3 rounded-xl bg-dark-card border border-dark-border text-dark-text font-medium hover:bg-dark-border/50 transition-colors"
        >
          Learn More
        </button>
      </div>

      <!-- Footer Note -->
      <p v-if="footerNote" class="text-xs text-dark-textMuted mt-4">
        {{ footerNote }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title: string
  description: string
  features?: string[]
  tierName: string
  price: string
  priceSubtext?: string
  priceNote?: string
  ctaText: string
  showLearnMore?: boolean
  footerNote?: string
}>()

defineEmits<{
  (e: 'upgrade'): void
  (e: 'learn-more'): void
}>()
</script>
