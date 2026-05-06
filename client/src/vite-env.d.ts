/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Absolute origin of the API when the SPA is hosted separately (e.g. Vercel → Render). */
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
