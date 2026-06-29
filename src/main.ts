import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import b24UiPlugin from '@bitrix24/b24ui-nuxt/vue-plugin'
import { router } from './app/router'
import App from './App.vue'

declare const __APP_VERSION__: string
window.__APP_VERSION__ = __APP_VERSION__

console.log('[app] version:', __APP_VERSION__)
console.log('[app] init', {
  DEV: import.meta.env.DEV,
  _PARAMS_: window._PARAMS_,
})

const app = createApp(App)

app.use(createPinia())
app.use(b24UiPlugin)
app.use(router)

if (!import.meta.env.DEV) {
  const path = window._PARAMS_?.placementOptions?.path
  console.log('[app] prod navigate to:', path)

  if (path) {
    const result = await router.replace({ path })
    console.log('[app] navigate result:', result)
  } else {
    console.warn('[app] path is empty, staying on /')
  }
}

console.log('[app] currentRoute before mount:', router.currentRoute.value.fullPath)
app.mount('#app')
console.log('[app] mounted')
