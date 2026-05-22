<template>
  <div class="card bg-gradient-to-br from-dark-card to-dark-border/30 border border-primary/20">
    <div class="card-header cursor-pointer" @click="isExpanded = !isExpanded">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <span class="text-2xl">🎛️</span>
          <div>
            <h2 class="card-title text-lg">Customize Your Rankings</h2>
            <p class="text-sm text-dark-textMuted">
              {{ enabledFactorCount }} factors enabled • {{ activePreset?.name || 'Custom' }} preset
            </p>
          </div>
        </div>
        <div class="flex items-center gap-3">
          <div class="flex gap-1">
            <button
              v-for="preset in presets.slice(0, 4)"
              :key="preset.id"
              @click.stop="applyPreset(preset)"
              :class="activePresetId === preset.id ? 'bg-primary text-gray-900' : 'bg-dark-border/50 text-dark-textMuted hover:bg-dark-border'"
              class="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              :title="preset.description"
            >
              {{ preset.icon }} {{ preset.name }}
            </button>
          </div>
          <svg 
            class="w-5 h-5 text-dark-textMuted transition-transform" 
            :class="{ 'rotate-180': isExpanded }"
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
    </div>
    
    <div v-if="isExpanded" class="card-body pt-0 space-y-6">
      <!-- Presets Row -->
      <div class="flex flex-wrap gap-2">
        <button
          v-for="preset in presets"
          :key="preset.id"
          @click="applyPreset(preset)"
          :class="activePresetId === preset.id 
            ? 'bg-primary text-gray-900 ring-2 ring-primary/50' 
            : 'bg-dark-border/30 text-dark-textMuted hover:bg-dark-border/50'"
          class="px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2"
        >
          <span>{{ preset.icon }}</span>
          <span>{{ preset.name }}</span>
        </button>
      </div>

      <!-- Factor Categories Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <!-- Core Factors -->
        <div class="bg-dark-bg/50 rounded-xl p-4">
          <h3 class="font-semibold text-dark-text mb-3 flex items-center gap-2">
            <span class="w-2 h-2 rounded-full bg-green-500"></span>
            Core
          </h3>
          <div class="space-y-2">
            <FactorToggle
              v-for="factor in coreFactors"
              :key="factor.id"
              :factor="factor"
              :disabled="factor.id === 'baseProjection'"
              @toggle="toggleFactor(factor.id)"
              @update-weight="(w) => updateWeight(factor.id, w)"
            />
          </div>
        </div>

        <!-- Performance Factors -->
        <div class="bg-dark-bg/50 rounded-xl p-4">
          <h3 class="font-semibold text-dark-text mb-3 flex items-center gap-2">
            <span class="w-2 h-2 rounded-full bg-blue-500"></span>
            Performance
          </h3>
          <div class="space-y-2">
            <FactorToggle
              v-for="factor in performanceFactors"
              :key="factor.id"
              :factor="factor"
              @toggle="toggleFactor(factor.id)"
              @update-weight="(w) => updateWeight(factor.id, w)"
            />
          </div>
        </div>

        <!-- Schedule Factors -->
        <div class="bg-dark-bg/50 rounded-xl p-4">
          <h3 class="font-semibold text-dark-text mb-3 flex items-center gap-2">
            <span class="w-2 h-2 rounded-full bg-yellow-500"></span>
            Schedule
          </h3>
          <div class="space-y-2">
            <FactorToggle
              v-for="factor in scheduleFactors"
              :key="factor.id"
              :factor="factor"
              @toggle="toggleFactor(factor.id)"
              @update-weight="(w) => updateWeight(factor.id, w)"
            />
          </div>
        </div>

        <!-- Context Factors -->
        <div class="bg-dark-bg/50 rounded-xl p-4">
          <h3 class="font-semibold text-dark-text mb-3 flex items-center gap-2">
            <span class="w-2 h-2 rounded-full bg-orange-500"></span>
            Context
          </h3>
          <div class="space-y-2">
            <FactorToggle
              v-for="factor in contextFactors"
              :key="factor.id"
              :factor="factor"
              @toggle="toggleFactor(factor.id)"
              @update-weight="(w) => updateWeight(factor.id, w)"
            />
          </div>
        </div>
      </div>

      <!-- Advanced Factors (Beta) -->
      <div class="bg-dark-bg/50 rounded-xl p-4 opacity-60">
        <h3 class="font-semibold text-dark-text mb-3 flex items-center gap-2">
          <span class="w-2 h-2 rounded-full bg-red-500"></span>
          Advanced (Coming Soon)
          <span class="text-xs px-2 py-0.5 rounded bg-red-500/20 text-red-400">Beta</span>
        </h3>
        <div class="grid grid-cols-3 gap-4">
          <FactorToggle
            v-for="factor in advancedFactors"
            :key="factor.id"
            :factor="factor"
            :disabled="true"
            @toggle="toggleFactor(factor.id)"
          />
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="flex items-center justify-between pt-2 border-t border-dark-border/30">
        <div class="text-sm text-dark-textMuted">
          <span class="text-primary font-semibold">{{ enabledFactorCount }}</span> factors will influence rankings
        </div>
        <div class="flex items-center gap-3">
          <button
            @click="resetToDefault"
            class="px-4 py-2 rounded-lg bg-dark-border/30 text-dark-textMuted hover:bg-dark-border/50 transition-colors text-sm"
          >
            Reset to Default
          </button>
          <button
            @click="applyChanges"
            class="px-6 py-2 rounded-lg bg-primary text-gray-900 font-semibold hover:bg-primary/90 transition-colors text-sm flex items-center gap-2"
          >
            <span>Apply Changes</span>
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import FactorToggle from './FactorToggle.vue'
import { 
  DEFAULT_FACTORS, 
  RANKING_PRESETS,
  type RankingFactorConfig,
  type RankingPreset 
} from '@/services/rankingFactors'

// Props
const props = defineProps<{
  modelValue: RankingFactorConfig[]
}>()

// Emits
const emit = defineEmits<{
  (e: 'update:modelValue', factors: RankingFactorConfig[]): void
  (e: 'apply'): void
}>()

// Local state
const isExpanded = ref(false)
const localFactors = ref<RankingFactorConfig[]>([...props.modelValue])
const activePresetId = ref<string>('standard')

// Watch for external changes
watch(() => props.modelValue, (newFactors) => {
  localFactors.value = [...newFactors]
  detectActivePreset()
}, { deep: true })

// Presets
const presets = RANKING_PRESETS

// Get active preset
const activePreset = computed(() => presets.find(p => p.id === activePresetId.value))

// Factor categories
const coreFactors = computed(() => localFactors.value.filter(f => f.category === 'core'))
const performanceFactors = computed(() => localFactors.value.filter(f => f.category === 'performance'))
const scheduleFactors = computed(() => localFactors.value.filter(f => f.category === 'schedule'))
const contextFactors = computed(() => localFactors.value.filter(f => f.category === 'context'))
const advancedFactors = computed(() => localFactors.value.filter(f => f.category === 'advanced'))

// Enabled count
const enabledFactorCount = computed(() => localFactors.value.filter(f => f.enabled).length)

// Toggle factor
function toggleFactor(factorId: string) {
  const factor = localFactors.value.find(f => f.id === factorId)
  if (!factor || factorId === 'baseProjection') return
  
  // Handle mutually exclusive factors
  if (factorId === 'ceilingMode' && !factor.enabled) {
    const floorMode = localFactors.value.find(f => f.id === 'floorMode')
    if (floorMode) floorMode.enabled = false
  }
  if (factorId === 'floorMode' && !factor.enabled) {
    const ceilingMode = localFactors.value.find(f => f.id === 'ceilingMode')
    if (ceilingMode) ceilingMode.enabled = false
  }
  
  factor.enabled = !factor.enabled
  activePresetId.value = '' // Mark as custom
  emit('update:modelValue', localFactors.value)
}

// Update weight
function updateWeight(factorId: string, weight: number) {
  const factor = localFactors.value.find(f => f.id === factorId)
  if (!factor) return
  
  factor.weight = weight
  activePresetId.value = '' // Mark as custom
  emit('update:modelValue', localFactors.value)
}

// Apply preset
function applyPreset(preset: RankingPreset) {
  localFactors.value.forEach(factor => {
    factor.enabled = preset.factors[factor.id] ?? factor.enabled
  })
  activePresetId.value = preset.id
  emit('update:modelValue', localFactors.value)
}

// Detect which preset matches current config
function detectActivePreset() {
  for (const preset of presets) {
    const matches = localFactors.value.every(factor => {
      const presetEnabled = preset.factors[factor.id]
      if (presetEnabled === undefined) return true
      return factor.enabled === presetEnabled
    })
    if (matches) {
      activePresetId.value = preset.id
      return
    }
  }
  activePresetId.value = '' // Custom
}

// Reset to default
function resetToDefault() {
  localFactors.value = JSON.parse(JSON.stringify(DEFAULT_FACTORS))
  activePresetId.value = 'standard'
  emit('update:modelValue', localFactors.value)
}

// Apply changes
function applyChanges() {
  emit('apply')
}

// Initialize
detectActivePreset()
</script>
