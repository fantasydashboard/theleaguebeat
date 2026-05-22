import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

export const useDarkModeStore = defineStore('darkMode', () => {
  const isDark = ref(true) // Default to dark mode

  // Initialize from localStorage
  function init() {
    const saved = localStorage.getItem('darkMode')
    if (saved !== null) {
      isDark.value = saved === 'true'
    }
    applyTheme()
  }

  // Apply theme to document
  function applyTheme() {
    if (isDark.value) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  // Toggle dark mode
  function toggle() {
    isDark.value = !isDark.value
    localStorage.setItem('darkMode', isDark.value.toString())
    applyTheme()
  }

  // Watch for changes
  watch(isDark, () => {
    applyTheme()
  })

  return {
    isDark,
    init,
    toggle
  }
})
