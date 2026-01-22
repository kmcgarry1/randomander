import { onBeforeUnmount, onMounted, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRandomanderStore } from '../stores/randomander'

const getSystemPrefersDark = () => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

export const useTheme = () => {
  const store = useRandomanderStore()
  const { theme } = storeToRefs(store)
  let mediaQuery: MediaQueryList | null = null

  const applyTheme = () => {
    if (typeof document === 'undefined') return
    const prefersDark = mediaQuery?.matches ?? getSystemPrefersDark()
    const shouldUseDark =
      theme.value === 'dark' || (theme.value === 'system' && prefersDark)
    document.documentElement.classList.toggle('dark', shouldUseDark)
  }

  onMounted(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      applyTheme()
      return
    }
    mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    mediaQuery.addEventListener('change', applyTheme)
    applyTheme()
  })

  watch(theme, () => {
    applyTheme()
  })

  onBeforeUnmount(() => {
    mediaQuery?.removeEventListener('change', applyTheme)
  })
}
