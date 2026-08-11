import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { inject } from '@vercel/analytics'
import './style.css'
import App from './App.vue'
import { shouldEnableAnalytics } from './lib/privacy'

const privacyNavigator = navigator as Navigator & {
  globalPrivacyControl?: boolean
  msDoNotTrack?: string | null
}

if (
  shouldEnableAnalytics({
    production: import.meta.env.PROD,
    enabledFlag: import.meta.env.VITE_ENABLE_ANALYTICS,
    doNotTrack:
      privacyNavigator.doNotTrack ?? privacyNavigator.msDoNotTrack ?? null,
    globalPrivacyControl: privacyNavigator.globalPrivacyControl,
  })
) {
  inject()
}

const app = createApp(App)
app.use(createPinia())
app.mount('#app')
