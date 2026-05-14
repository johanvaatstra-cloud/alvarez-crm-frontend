/**
 * useTheme – global dark/light theme composable
 * Stores preference in localStorage under 'crm_theme'.
 * Applies 'theme-dark' or 'theme-light' class to <html>.
 */
import { ref, watch } from 'vue'

// Module-level singleton so every component shares the same reactive state
const _isDark = ref(localStorage.getItem('crm_theme') !== 'light')

function applyThemeClass(dark) {
  const html = document.documentElement
  if (dark) {
    html.classList.add('theme-dark')
    html.classList.remove('theme-light')
  } else {
    html.classList.add('theme-light')
    html.classList.remove('theme-dark')
  }
}

// Apply immediately when the module first loads
applyThemeClass(_isDark.value)

// Keep in sync whenever the value changes
watch(_isDark, applyThemeClass)

export function useTheme() {
  return {
    isDark: _isDark,
    toggleTheme() {
      _isDark.value = !_isDark.value
      localStorage.setItem('crm_theme', _isDark.value ? 'dark' : 'light')
    }
  }
}
