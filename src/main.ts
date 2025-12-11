import './assets/main.css'

import { createApp } from 'vue'
import b24UiPlugin from '@bitrix24/b24ui-nuxt/vue-plugin'
import { router } from './app/router'
import App from './App.vue'

const app = createApp(App)

app.use(b24UiPlugin)
app.use(router)

const pathFromParams = typeof window !== 'undefined' ? (window as any)._PARAMS_?.placementOptions?.path : undefined

if (pathFromParams) {
  // path из параметров имеет приоритет, если соответствующий маршрут существует
  const normalizedPath = pathFromParams.startsWith('/') ? pathFromParams : `/${pathFromParams}`
  const routeExists = router.getRoutes().some(route => route.path === normalizedPath)
  router.replace(routeExists ? normalizedPath : '/')
}

app.mount('#app')
