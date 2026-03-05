import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import bitrix24UIPluginVite  from '@bitrix24/b24ui-nuxt/vite'

// https://vitejs.dev/config/
export default defineConfig({
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
    bitrix24UIPluginVite ({
      colorMode: false
    })
  ]
})
