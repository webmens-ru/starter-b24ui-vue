import './assets/main.css'

import { createApp } from 'vue'
import b24UiPlugin from '@bitrix24/b24ui-nuxt/vue-plugin'
import { router } from './app/router'
import App from './App.vue'

const app = createApp(App)

app.use(b24UiPlugin)
app.use(router)

if (window._PARAMS_.placementOptions.path && router.hasRoute(window._PARAMS_.placementOptions.path)) {
  router.replace({ path: window._PARAMS_.placementOptions.path })
}

app.mount('#app')
