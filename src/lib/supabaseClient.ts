import { createClient } from '@supabase/supabase-js';

// NOTE: we intentionally do NOT parameterize createClient() with a
// hand-written Database generic. supabase-js's generic typing expects a
// full generated schema (Tables + Relationships + Functions + Views) —
// a partial hand-rolled version causes every query builder call to widen
// to `never`. Row/Insert/Update shapes for app code instead come from
// the plain interfaces in `@/types/database.types`, applied at the call
// site (see each service file). Swap this for a fully generated
// `Database` type (via `supabase gen types typescript`) once the project
// is linked, and re-add the generic here for full end-to-end type safety.

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  // Fail loudly in dev rather than silently returning a broken client.
  // eslint-disable-next-line no-console
  console.error(
    'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Copy .env.example to .env and fill in your Supabase project credentials.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
