/**
 * Sport Store
 * 
 * Manages the currently selected sport and associated theming.
 */

import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'

export type Sport = 'football' | 'baseball' | 'basketball' | 'hockey'

interface SportConfig {
  name: string
  label: string
  icon: string
  color: string
  colorRgb: string
  logo: string
  available: boolean
}

const SPORT_CONFIGS: Record<Sport, SportConfig> = {
  football: {
    name: 'football',
    label: 'Football',
    icon: '🏈',
    color: '#22c55e', // Green
    colorRgb: '34, 197, 94',
    logo: '/logos/UFD_Football.png',
    available: true
  },
  baseball: {
    name: 'baseball',
    label: 'Baseball',
    icon: '⚾',
    color: '#3B9FE8', // Bright Blue (matching UFD Baseball logo)
    colorRgb: '59, 159, 232',
    logo: '/logos/UFD_Baseball.png',
    available: true
  },
  basketball: {
    name: 'basketball',
    label: 'Basketball',
    icon: '🏀',
    color: '#f97316', // Orange
    colorRgb: '249, 115, 22',
    logo: '/logos/UFD_Basketball.png',
    available: false // Coming soon
  },
  hockey: {
    name: 'hockey',
    label: 'Hockey',
    icon: '🏒',
    color: '#3b82f6', // Blue
    colorRgb: '59, 130, 246',
    logo: '/logos/UFD_Hockey.png',
    available: false // Coming soon
  }
}

const STORAGE_KEY = 'ufd_active_sport'

export const useSportStore = defineStore('sport', () => {
  // State
  const activeSport = ref<Sport>('football')

  // Load from localStorage
  const savedSport = localStorage.getItem(STORAGE_KEY) as Sport | null
  if (savedSport && SPORT_CONFIGS[savedSport]) {
    activeSport.value = savedSport
  }

  // Computed
  const currentConfig = computed(() => SPORT_CONFIGS[activeSport.value])
  const allSports = computed(() => Object.values(SPORT_CONFIGS))
  const availableSports = computed(() => Object.values(SPORT_CONFIGS).filter(s => s.available))
  
  const primaryColor = computed(() => currentConfig.value.color)
  const primaryColorRgb = computed(() => currentConfig.value.colorRgb)
  const sportLogo = computed(() => currentConfig.value.logo)
  const sportLabel = computed(() => currentConfig.value.label)
  const sportIcon = computed(() => currentConfig.value.icon)

  // Actions
  function setSport(sport: Sport) {
    if (SPORT_CONFIGS[sport]) {
      activeSport.value = sport
      localStorage.setItem(STORAGE_KEY, sport)
      applyTheme()
    }
  }

  function applyTheme() {
    const config = SPORT_CONFIGS[activeSport.value]
    document.documentElement.style.setProperty('--color-primary', config.color)
    document.documentElement.style.setProperty('--color-primary-rgb', config.colorRgb)
  }

  // Watch for changes and apply theme
  watch(activeSport, () => {
    applyTheme()
  }, { immediate: true })

  return {
    // State
    activeSport,
    
    // Computed
    currentConfig,
    allSports,
    availableSports,
    primaryColor,
    primaryColorRgb,
    sportLogo,
    sportLabel,
    sportIcon,
    
    // Actions
    setSport,
    applyTheme
  }
})
