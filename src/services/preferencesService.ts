import { supabase } from '@/lib/supabaseClient';
import { handleSupabaseError } from './supabaseService';
import type { UserPreferences, Profile } from '@/types/database.types';

export async function getPreferences(userId: string): Promise<UserPreferences | null> {
  const { data, error } = await supabase.from('user_preferences').select('*').eq('user_id', userId).maybeSingle();
  if (error) handleSupabaseError('getPreferences', error);
  return data;
}

export async function upsertPreferences(userId: string, updates: Partial<UserPreferences>): Promise<UserPreferences> {
  const { data, error } = await supabase
    .from('user_preferences')
    .upsert({ user_id: userId, ...updates }, { onConflict: 'user_id' })
    .select()
    .single();
  if (error) handleSupabaseError('upsertPreferences', error);
  return data!;
}

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
  if (error) handleSupabaseError('getProfile', error);
  return data;
}

export async function updateProfile(userId: string, updates: Partial<Profile>): Promise<Profile> {
  const { data, error } = await supabase.from('profiles').update(updates).eq('id', userId).select().single();
  if (error) handleSupabaseError('updateProfile', error);
  return data!;
}
