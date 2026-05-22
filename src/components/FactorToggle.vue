<template>
  <div 
    class="flex items-center justify-between p-2 rounded-lg transition-all"
    :class="[
      factor.enabled && !disabled ? 'bg-dark-border/50' : 'bg-transparent',
      disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-dark-border/30'
    ]"
    @click="!disabled && $emit('toggle')"
  >
    <div class="flex items-center gap-2 flex-1 min-w-0">
      <span class="text-lg">{{ factor.icon }}</span>
      <div class="flex-1 min-w-0">
        <div class="text-sm font-medium text-dark-text truncate">{{ factor.name }}</div>
        <div class="text-xs text-dark-textMuted truncate" :title="factor.description">
          {{ factor.description }}
        </div>
      </div>
    </div>
    <div class="flex items-center gap-2 ml-2">
      <!-- Weight indicator (only show if enabled and has adjustable weight) -->
      <div 
        v-if="factor.enabled && !disabled && factor.weight !== 100"
        class="flex items-center gap-1"
        @click.stop
      >
        <input
          type="range"
          :value="factor.weight"
          @input="$emit('update-weight', parseInt(($event.target as HTMLInputElement).value))"
          min="25"
          max="100"
          step="25"
          class="w-12 h-1 accent-primary cursor-pointer"
          :title="`Weight: ${factor.weight}%`"
        />
        <span class="text-[10px] text-dark-textMuted w-6">{{ factor.weight }}%</span>
      </div>
      
      <!-- Toggle Switch -->
      <div 
        class="relative w-10 h-5 rounded-full transition-colors"
        :class="factor.enabled ? 'bg-primary' : 'bg-dark-border'"
      >
        <div 
          class="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform"
          :class="factor.enabled ? 'translate-x-5' : 'translate-x-0.5'"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { RankingFactorConfig } from '@/services/rankingFactors'

defineProps<{
  factor: RankingFactorConfig
  disabled?: boolean
}>()

defineEmits<{
  (e: 'toggle'): void
  (e: 'update-weight', weight: number): void
}>()
</script>
