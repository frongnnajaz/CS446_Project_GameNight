/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL ของ Backend API (เว้นว่าง = /api ผ่าน Vite proxy) */
  readonly VITE_API_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
