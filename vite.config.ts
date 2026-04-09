import { createRequire } from 'node:module'
import { defineConfig } from 'vite'
import { fileURLToPath, pathToFileURL } from 'node:url'
import vue from '@vitejs/plugin-vue'
import bitrix24UIPluginVite from '@bitrix24/b24ui-nuxt/vite'

// Явный root — чтобы при сборке из разных cwd пути не ломались (rollup fileName)
const __dirname = fileURLToPath(new URL('.', import.meta.url))

/** reka-ui импортирует `toValue` из `@vueuse/core`, а VueUse 14+ не реэкспортирует его из входа (берёт из `vue` внутри). */
const VUEUSE_CORE_VIRTUAL = '\0virtual:vueuse-core-with-tovalue'
const require = createRequire(import.meta.url)
const vueuseCoreEntry = pathToFileURL(require.resolve('@vueuse/core')).href

const vueuseCoreToValuePlugin = {
  name: 'vueuse-core-tovalue',
  enforce: 'pre' as const,
  resolveId(id: string) {
    if (id === VUEUSE_CORE_VIRTUAL) {
      return id
    }
    return undefined
  },
  load(id: string) {
    if (id !== VUEUSE_CORE_VIRTUAL) {
      return undefined
    }
    return `export { toValue } from 'vue'\nexport * from ${JSON.stringify(vueuseCoreEntry)}\n`
  },
}

// https://vitejs.dev/config/
export default defineConfig({
  root: __dirname,
  resolve: {
    // `frontend/` в этом репозитории может быть symlink на другой каталог — без этого Vitest
    // резолвит realpath и ищет тесты не в рабочей копии.
    preserveSymlinks: true,
    // Только точное `@vueuse/core` → виртуальный модуль (reka-ui + toValue). Подпути `@vueuse/core/...` не трогаем.
    alias: [{ find: /^@vueuse\/core$/, replacement: VUEUSE_CORE_VIRTUAL }],
  },
  test: {
    // Синхронно с `root` — иначе Vitest при symlink на `node_modules` берёт чужой project root.
    root: __dirname,
    globals: true,
    environment: 'happy-dom',
    include: ['**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,vue}'],
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'https://test-lk.doorhan-krd.ru',
        changeOrigin: true,
        secure: false,
      },
      '/address': {
        target: 'https://test-lk.doorhan-krd.ru',
        changeOrigin: true,
        secure: false,
      },
      '/client': {
        target: 'https://test-lk.doorhan-krd.ru',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  plugins: [
    vueuseCoreToValuePlugin,
    vue(),
    bitrix24UIPluginVite({
      colorMode: false
    }),
  ],
})
