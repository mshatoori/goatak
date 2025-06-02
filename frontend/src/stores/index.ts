import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useAppStore = defineStore('app', () => {
  // State
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const theme = ref<'light' | 'dark'>('light')
  const direction = ref<'rtl' | 'ltr'>('rtl')
  const language = ref<'fa' | 'en'>('fa')

  // Getters
  const isDark = computed(() => theme.value === 'dark')
  const isRtl = computed(() => direction.value === 'rtl')
  const isPersian = computed(() => language.value === 'fa')

  // Actions
  const setLoading = (loading: boolean) => {
    isLoading.value = loading
  }

  const setError = (errorMessage: string | null) => {
    error.value = errorMessage
  }

  const toggleTheme = () => {
    theme.value = theme.value === 'light' ? 'dark' : 'light'
  }

  const toggleDirection = () => {
    direction.value = direction.value === 'rtl' ? 'ltr' : 'rtl'
    language.value = direction.value === 'rtl' ? 'fa' : 'en'
  }

  const setLanguage = (lang: 'fa' | 'en') => {
    language.value = lang
    direction.value = lang === 'fa' ? 'rtl' : 'ltr'
  }

  return {
    // State
    isLoading,
    error,
    theme,
    direction,
    language,
    // Getters
    isDark,
    isRtl,
    isPersian,
    // Actions
    setLoading,
    setError,
    toggleTheme,
    toggleDirection,
    setLanguage,
  }
})