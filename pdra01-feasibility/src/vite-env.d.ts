/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_WHAT3WORDS_API_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
