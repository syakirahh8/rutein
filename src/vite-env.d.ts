/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_GEOCODING_PROVIDER?: string;
  readonly VITE_GEOCODING_API_KEY?: string;
  readonly VITE_ROUTING_PROVIDER?: string;
  readonly VITE_ORS_API_KEY?: string;
  readonly VITE_MAP_TILE_PROVIDER?: string;
  readonly VITE_MAPTILER_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
