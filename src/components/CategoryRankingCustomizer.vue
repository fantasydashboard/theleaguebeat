<template>
  <div class="card bg-gradient-to-br from-dark-card to-dark-border/30 border border-yellow-400/20">
    <!-- Header - Always Visible -->
    <div class="card-header cursor-pointer" @click="isExpanded = !isExpanded">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <span class="text-2xl">🎛️</span>
          <div>
            <h2 class="card-title text-lg">Customize Rankings</h2>
            <p class="text-sm text-dark-textMuted">
              {{ enabledFactorCount }} factors • {{ activePreset?.name || 'Custom' }} preset
            </p>
          </div>
        </div>
        <div class="flex items-center gap-3">
          <!-- Quick preset buttons -->
          <div class="hidden sm:flex gap-1">
            <button
              v-for="preset in quickPresets"
              :key="preset.id"
              @click.stop="applyPreset(preset)"
              :class="currentPresetId === preset.id ? 'bg-yellow-400 text-gray-900' : 'bg-dark-border/50 text-dark-textMuted hover:bg-dark-border'"
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
    
    <!-- Expanded Content -->
    <Transition name="expand">
      <div v-if="isExpanded" class="card-body pt-0 space-y-6">
        <!-- All Presets Row -->
        <div>
          <h4 class="text-xs font-semibold text-dark-textMuted uppercase tracking-wider mb-3">Quick Presets</h4>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="preset in allPresets"
              :key="preset.id"
              @click="applyPreset(preset)"
              :class="currentPresetId === preset.id 
                ? 'bg-yellow-400 text-gray-900 ring-2 ring-yellow-400/50' 
                : 'bg-dark-border/30 text-dark-textMuted hover:bg-dark-border/50'"
              class="px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2"
            >
              <span>{{ preset.icon }}</span>
              <span>{{ preset.name }}</span>
            </button>
          </div>
        </div>

        <!-- Factor Categories Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <!-- Core Factors -->
          <div class="bg-dark-bg/50 rounded-xl p-4">
            <h3 class="font-semibold text-dark-text mb-3 flex items-center gap-2">
              <span class="w-2 h-2 rounded-full bg-yellow-500"></span>
              Core
            </h3>
            <div class="space-y-2">
              <FactorItem
                v-for="factor in coreFactors"
                :key="factor.id"
                :factor="factor"
                @toggle="toggleFactor(factor.id)"
                @update-weight="(w) => updateWeight(factor.id, w)"
              />
            </div>
          </div>

          <!-- Scarcity Factors -->
          <div class="bg-dark-bg/50 rounded-xl p-4">
            <h3 class="font-semibold text-dark-text mb-3 flex items-center gap-2">
              <span class="w-2 h-2 rounded-full bg-cyan-500"></span>
              Scarcity
            </h3>
            <div class="space-y-2">
              <FactorItem
                v-for="factor in scarcityFactors"
                :key="factor.id"
                :factor="factor"
                @toggle="toggleFactor(factor.id)"
                @update-weight="(w) => updateWeight(factor.id, w)"
              />
            </div>
          </div>

          <!-- Performance Factors -->
          <div class="bg-dark-bg/50 rounded-xl p-4">
            <h3 class="font-semibold text-dark-text mb-3 flex items-center gap-2">
              <span class="w-2 h-2 rounded-full bg-purple-500"></span>
              Performance
            </h3>
            <div class="space-y-2">
              <FactorItem
                v-for="factor in performanceFactors"
                :key="factor.id"
                :factor="factor"
                @toggle="toggleFactor(factor.id)"
                @update-weight="(w) => updateWeight(factor.id, w)"
              />
            </div>
          </div>

          <!-- Advanced Factors -->
          <div class="bg-dark-bg/50 rounded-xl p-4">
            <h3 class="font-semibold text-dark-text mb-3 flex items-center gap-2">
              <span class="w-2 h-2 rounded-full bg-pink-500"></span>
              Advanced
              <span class="text-xs px-1.5 py-0.5 rounded bg-pink-500/20 text-pink-400">Pro</span>
            </h3>
            <div class="space-y-2">
              <FactorItem
                v-for="factor in advancedFactors"
                :key="factor.id"
                :factor="factor"
                @toggle="toggleFactor(factor.id)"
                @update-weight="(w) => updateWeight(factor.id, w)"
              />
            </div>
          </div>
        </div>

        <!-- Weight Summary -->
        <div class="flex items-center justify-between p-4 bg-dark-bg/30 rounded-xl">
          <div class="flex items-center gap-4">
            <div class="text-sm text-dark-textMuted">
              <span class="text-yellow-400 font-semibold">{{ enabledFactorCount }}</span> factors enabled
            </div>
            <div class="text-sm" :class="totalWeight === 100 ? 'text-green-400' : 'text-yellow-400'">
              Total weight: <span class="font-semibold">{{ totalWeight }}%</span>
              <span v-if="totalWeight !== 100" class="text-xs ml-1">(will normalize to 100%)</span>
            </div>
          </div>
          <div class="flex items-center gap-3">
            <button
              @click="resetToDefault"
              class="px-4 py-2 rounded-lg bg-dark-border/30 text-dark-textMuted hover:bg-dark-border/50 transition-colors text-sm"
            >
              Reset
            </button>
            <button
              @click="applyChanges"
              class="px-6 py-2 rounded-lg bg-yellow-400 text-gray-900 font-semibold hover:bg-yellow-300 transition-colors text-sm flex items-center gap-2"
            >
              <span>Apply</span>
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, defineComponent, h } from 'vue'
import { 
  DEFAULT_CATEGORY_ROS_FACTORS, 
  CATEGORY_ROS_PRESETS,
  type CategoryRankingFactor,
  type CategoryRankingPreset 
} from '@/services/categoryRankingFactors'

// ============================================================================
// FACTOR ITEM SUB-COMPONENT (inline)
// ============================================================================
const FactorItem = defineComponent({
  props: {
    factor: { type: Object as () => CategoryRankingFactor, required: true }
  },
  emits: ['toggle', 'update-weight'],
  setup(props, { emit }) {
    const showSlider = ref(false)
    
    return () => h('div', { 
      class: 'group',
      onMouseenter: () => showSlider.value = true,
      onMouseleave: () => showSlider.value = false
    }, [
      // Main row
      h('div', { class: 'flex items-center justify-between py-1.5' }, [
        // Left: checkbox + name
        h('label', { class: 'flex items-center gap-2 cursor-pointer flex-1 min-w-0' }, [
          h('input', {
            type: 'checkbox',
            checked: props.factor.enabled,
            onChange: () => emit('toggle'),
            class: 'w-4 h-4 rounded border-dark-border bg-dark-bg text-yellow-400 focus:ring-yellow-400 focus:ring-offset-0 cursor-pointer'
          }),
          h('span', { class: 'text-lg flex-shrink-0' }, props.factor.icon),
          h('div', { class: 'flex-1 min-w-0' }, [
            h('div', { 
              class: ['text-sm font-medium truncate', props.factor.enabled ? 'text-dark-text' : 'text-dark-textMuted']
            }, props.factor.name),
          ])
        ]),
        // Right: weight badge
        props.factor.enabled ? h('div', {
          class: 'px-2 py-0.5 rounded text-xs font-semibold',
          style: { backgroundColor: props.factor.color + '20', color: props.factor.color }
        }, props.factor.weight + '%') : null
      ]),
      // Description (on hover or when enabled)
      (showSlider.value || props.factor.enabled) ? h('div', { 
        class: 'text-xs text-dark-textMuted mt-1 ml-6 leading-relaxed'
      }, props.factor.description) : null,
      // Weight slider (when enabled)
      props.factor.enabled ? h('div', { class: 'flex items-center gap-3 mt-2 ml-6' }, [
        h('input', {
          type: 'range',
          value: props.factor.weight,
          min: 5,
          max: 100,
          step: 5,
          onInput: (e: Event) => emit('update-weight', parseInt((e.target as HTMLInputElement).value)),
          class: 'flex-1 h-1.5 bg-dark-border rounded-lg appearance-none cursor-pointer accent-yellow-400'
        }),
        h('input', {
          type: 'number',
          value: props.factor.weight,
          min: 5,
          max: 100,
          onInput: (e: Event) => emit('update-weight', parseInt((e.target as HTMLInputElement).value) || 5),
          class: 'w-14 px-2 py-1 rounded bg-dark-bg border border-dark-border text-dark-text text-xs text-center'
        })
      ]) : null
    ])
  }
})

// ============================================================================
// PROPS & EMITS
// ============================================================================
const props = defineProps<{
  modelValue: CategoryRankingFactor[]
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', factors: CategoryRankingFactor[]): void
  (e: 'apply'): void
}>()

// ============================================================================
// STATE
// ============================================================================
const isExpanded = ref(false)
const localFactors = ref<CategoryRankingFactor[]>(JSON.parse(JSON.stringify(props.modelValue)))
const currentPresetId = ref<string | null>('balanced')

// ============================================================================
// COMPUTED
// ============================================================================
const allPresets = computed(() => CATEGORY_ROS_PRESETS)
const quickPresets = computed(() => CATEGORY_ROS_PRESETS.slice(0, 4))
const activePreset = computed(() => allPresets.value.find(p => p.id === currentPresetId.value))

const coreFactors = computed(() => localFactors.value.filter(f => f.category === 'core'))
const scarcityFactors = computed(() => localFactors.value.filter(f => f.category === 'scarcity'))
const performanceFactors = computed(() => localFactors.value.filter(f => f.category === 'performance'))
const advancedFactors = computed(() => localFactors.value.filter(f => f.category === 'advanced'))

const enabledFactorCount = computed(() => localFactors.value.filter(f => f.enabled).length)
const totalWeight = computed(() => localFactors.value.filter(f => f.enabled).reduce((sum, f) => sum + f.weight, 0))

// ============================================================================
// WATCHERS
// ============================================================================
watch(() => props.modelValue, (newFactors) => {
  localFactors.value = JSON.parse(JSON.stringify(newFactors))
  detectActivePreset()
}, { deep: true })

// ============================================================================
// METHODS
// ============================================================================
function toggleFactor(factorId: string) {
  const factor = localFactors.value.find(f => f.id === factorId)
  if (!factor) return
  
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
  currentPresetId.value = null // Mark as custom
  emit('update:modelValue', localFactors.value)
}

function updateWeight(factorId: string, weight: number) {
  const factor = localFactors.value.find(f => f.id === factorId)
  if (!factor) return
  
  factor.weight = Math.max(5, Math.min(100, weight))
  currentPresetId.value = null // Mark as custom
  emit('update:modelValue', localFactors.value)
}

function applyPreset(preset: CategoryRankingPreset) {
  localFactors.value.forEach(factor => {
    const presetConfig = preset.factors[factor.id]
    if (presetConfig) {
      factor.enabled = presetConfig.enabled
      factor.weight = presetConfig.weight
    }
  })
  currentPresetId.value = preset.id
  emit('update:modelValue', localFactors.value)
}

function detectActivePreset() {
  for (const preset of allPresets.value) {
    const matches = localFactors.value.every(factor => {
      const presetConfig = preset.factors[factor.id]
      if (!presetConfig) return true
      return factor.enabled === presetConfig.enabled && 
             (!factor.enabled || factor.weight === presetConfig.weight)
    })
    if (matches) {
      currentPresetId.value = preset.id
      return
    }
  }
  currentPresetId.value = null // Custom
}

function resetToDefault() {
  localFactors.value = JSON.parse(JSON.stringify(DEFAULT_CATEGORY_ROS_FACTORS))
  currentPresetId.value = 'balanced'
  emit('update:modelValue', localFactors.value)
}

function applyChanges() {
  emit('apply')
}

// Initialize
detectActivePreset()
</script>

<style scoped>
.expand-enter-active,
.expand-leave-active {
  transition: all 0.3s ease;
  overflow: hidden;
}

.expand-enter-from,
.expand-leave-to {
  opacity: 0;
  max-height: 0;
}

.expand-enter-to,
.expand-leave-from {
  max-height: 1000px;
}

/* Custom range slider styling */
input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #facc15;
  cursor: pointer;
  border: 2px solid #1a1b26;
}

input[type="range"]::-moz-range-thumb {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #facc15;
  cursor: pointer;
  border: 2px solid #1a1b26;
}
</style>
