import { supabase } from '@/lib/supabaseClient';

/**
 * Central place for auth/session helpers used across every other service.
 * Feature-specific queries live in their own service file
 * (savedPlacesService, budgetService, etc.) — this file only holds
 * cross-cutting concerns so we don't duplicate auth logic everywhere.
 */

export async function getCurrentUserId(): Promise<string | null> {
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    console.error('getCurrentUserId error:', error.message);
    return null;
  }
  return data.user?.id ?? null;
}

export async function requireUserId(): Promise<string> {
  const id = await getCurrentUserId();
  if (!id) throw new Error('Not authenticated');
  return id;
}

export function handleSupabaseError(context: string, error: unknown): never {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[Supabase:${context}]`, message);
  throw new Error(`${context} failed: ${message}`);
}
