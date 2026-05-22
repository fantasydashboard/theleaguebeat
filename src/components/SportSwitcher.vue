<template>
  <div class="relative" ref="dropdownRef">
    <!-- Trigger Button -->
    <button
      @click="isOpen = !isOpen"
      class="flex items-center gap-2 px-3 py-2 rounded-lg bg-dark-card border border-dark-border hover:border-primary/50 transition-all"
    >
      <img 
        :src="sportStore.sportLogo" 
        :alt="sportStore.sportLabel"
        class="w-8 h-8 object-contain"
      />
      <span class="text-sm font-medium text-dark-text hidden sm:inline">
        {{ sportStore.sportLabel }}
      </span>
      <svg 
        class="w-4 h-4 text-dark-textMuted transition-transform" 
        :class="{ 'rotate-180': isOpen }"
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24"
      >
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
      </svg>
    </button>

    <!-- Dropdown Menu -->
    <Transition
      enter-active-class="transition duration-100 ease-out"
      enter-from-class="transform scale-95 opacity-0"
      enter-to-class="transform scale-100 opacity-100"
      leave-active-class="transition duration-75 ease-in"
      leave-from-class="transform scale-100 opacity-100"
      leave-to-class="transform scale-95 opacity-0"
    >
      <div
        v-if="isOpen"
        class="absolute top-full left-0 mt-2 w-56 bg-dark-card border border-dark-border rounded-xl shadow-xl z-50 overflow-hidden"
      >
        <div class="p-2">
          <div class="text-xs font-semibold text-dark-textMuted uppercase px-3 py-2">
            Select Sport
          </div>
          
          <button
            v-for="sport in sportStore.allSports"
            :key="sport.name"
            @click="selectSport(sport.name as Sport)"
            :disabled="!sport.available"
            class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all"
            :class="[
              sport.available 
                ? 'hover:bg-dark-border/50 cursor-pointer' 
                : 'opacity-50 cursor-not-allowed',
              sportStore.activeSport === sport.name 
                ? 'bg-primary/20 border border-primary/30' 
                : ''
            ]"
          >
            <img 
              :src="sport.logo" 
              :alt="sport.label"
              class="w-10 h-10 object-contain"
            />
            <div class="flex-1 text-left">
              <div class="font-medium text-dark-text">{{ sport.label }}</div>
              <div v-if="!sport.available" class="text-xs text-dark-textMuted">
                Coming Soon
              </div>
            </div>
            <div 
              v-if="sportStore.activeSport === sport.name"
              class="w-2 h-2 rounded-full"
              :style="{ backgroundColor: sport.color }"
            ></div>
            <span 
              v-if="!sport.available" 
              class="text-xs px-2 py-0.5 bg-dark-border rounded-full text-dark-textMuted"
            >
              Soon
            </span>
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useSportStore, type Sport } from '@/stores/sport'

const sportStore = useSportStore()
const isOpen = ref(false)
const dropdownRef = ref<HTMLElement | null>(null)

function selectSport(sport: Sport) {
  if (sportStore.allSports.find(s => s.name === sport)?.available) {
    sportStore.setSport(sport)
    isOpen.value = false
  }
}

// Close dropdown when clicking outside
function handleClickOutside(event: MouseEvent) {
  if (dropdownRef.value && !dropdownRef.value.contains(event.target as Node)) {
    isOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>
