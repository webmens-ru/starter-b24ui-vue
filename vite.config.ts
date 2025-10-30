import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import bitrix24UIPluginVite  from '@bitrix24/b24ui-nuxt/vite'

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    port: 3000
  },
  plugins: [
    vue(),
    bitrix24UIPluginVite ({
      colorMode: false
    })
  ]
})
