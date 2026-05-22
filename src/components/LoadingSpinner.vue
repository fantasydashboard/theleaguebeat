<template>
  <div class="loading-spinner-container" :class="containerClass">
    <div class="badge-flipper" :style="{ width: computedSizeOuter, height: computedSize }">
      <div class="badge-inner">
        <img 
          src="/tlb-favicon.png"
          alt="Loading..." 
          class="badge-image"
          :style="{ width: computedSize, height: 'auto' }"
        />
      </div>
    </div>
    <p v-if="message" class="loading-message" :class="messageClass">{{ message }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  size?: 'sm' | 'md' | 'lg' | 'xl' | number
  message?: string
  centered?: boolean
}>(), {
  size: 'md',
  centered: true
})

const computedSize = computed(() => {
  if (typeof props.size === 'number') return `${props.size}px`
  const sizes = { sm: '32px', md: '48px', lg: '64px', xl: '96px' }
  return sizes[props.size] || sizes.md
})

const computedSizeOuter = computed(() => {
  if (typeof props.size === 'number') return `${props.size * 1.5}px`
  const sizes = { sm: '48px', md: '72px', lg: '96px', xl: '144px' }
  return sizes[props.size] || sizes.md
})

const containerClass = computed(() => ({ 'centered': props.centered }))

const messageClass = computed(() => {
  const sizeClasses = { sm: 'text-xs', md: 'text-sm', lg: 'text-base', xl: 'text-lg' }
  return typeof props.size === 'string' ? sizeClasses[props.size] : 'text-sm'
})
</script>

<style scoped>
.loading-spinner-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.loading-spinner-container.centered {
  justify-content: center;
}

.badge-flipper {
  perspective: 800px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: visible;
}

.badge-inner {
  width: 100%;
  height: 100%;
  position: relative;
  transform-style: preserve-3d;
  animation: badge-flip-3d 2s ease-in-out infinite;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: visible;
}

.badge-image {
  backface-visibility: visible;
  filter: drop-shadow(0 8px 16px rgba(0, 0, 0, 0.4));
  display: block;
}

@keyframes badge-flip-3d {
  0%   { transform: rotateY(0deg)   scale(1);   }
  25%  { transform: rotateY(90deg)  scale(0.9); }
  50%  { transform: rotateY(180deg) scale(1);   }
  75%  { transform: rotateY(270deg) scale(0.9); }
  100% { transform: rotateY(360deg) scale(1);   }
}

.loading-message {
  color: #9CA3AF;
  font-weight: 500;
  text-align: center;
}
</style>
