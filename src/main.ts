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

if (import.meta.env.DEV) {
  const qs = new URLSearchParams(window.location.search)
  const orderId = qs.get('orderId')
  const modelId = qs.get('modelId') ?? '1'

  if (!window._ACCESS_TOKEN_ && qs.get('token')) {
    window._ACCESS_TOKEN_ = qs.get('token')!
  }

  window._HOSTNAME_ = ''

  window._PARAMS_ = {
    placement: 'DEFAULT',
    placementOptions: {
      type: 'openApplication',
      path: orderId ? `/wicket/type${modelId}` : '/add-product',
      updateOnCloseSlider: true,
      ...(orderId ? { id: orderId, modelId } : {}),
    },
  }

  console.log('[app] DEV mode — orderId:', orderId, 'modelId:', modelId)

  const devPath = window._PARAMS_?.placementOptions?.path
  if (devPath) {
    const result = await router.replace({ path: devPath })
    console.log('[app] DEV navigate result:', result)
  }
} else {
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
