/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_MOCK: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

interface Window {
  __APP_VERSION__: string
}
