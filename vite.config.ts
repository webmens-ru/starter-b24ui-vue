import { defineConfig } from 'vite'
import { fileURLToPath } from 'node:url'
import vue from '@vitejs/plugin-vue'
import bitrix24UIPluginVite from '@bitrix24/b24ui-nuxt/vite'

// Явный root — чтобы при сборке из разных cwd пути не ломались (rollup fileName)
const __dirname = fileURLToPath(new URL('.', import.meta.url))

// https://vitejs.dev/config/
export default defineConfig({
  root: __dirname,
  test: {
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
    vue(),
    bitrix24UIPluginVite({
      colorMode: false
    }),
  ],
})
