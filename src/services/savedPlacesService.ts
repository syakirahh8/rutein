import { supabase } from '@/lib/supabaseClient';
import { handleSupabaseError } from './supabaseService';
import type { PlaceCategory, SavedPlace } from '@/types/database.types';

export async function listSavedPlaces(userId: string): Promise<SavedPlace[]> {
  const { data, error } = await supabase
    .from('saved_places')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) handleSupabaseError('listSavedPlaces', error);
  return data ?? [];
}

export async function createSavedPlace(params: {
  userId: string;
  name: string;
  category: PlaceCategory;
  address?: string;
  latitude: number;
  longitude: number;
  notes?: string;
}): Promise<SavedPlace> {
  const { data, error } = await supabase
    .from('saved_places')
    .insert({
      user_id: params.userId,
      name: params.name,
      category: params.category,
      address: params.address ?? null,
      latitude: params.latitude,
      longitude: params.longitude,
      notes: params.notes ?? null,
    })
    .select()
    .single();
  if (error) handleSupabaseError('createSavedPlace', error);
  return data!;
}

export async function updateSavedPlace(id: string, updates: Partial<SavedPlace>): Promise<SavedPlace> {
  const { data, error } = await supabase.from('saved_places').update(updates).eq('id', id).select().single();
  if (error) handleSupabaseError('updateSavedPlace', error);
  return data!;
}

export async function deleteSavedPlace(id: string): Promise<void> {
  const { error } = await supabase.from('saved_places').delete().eq('id', id);
  if (error) handleSupabaseError('deleteSavedPlace', error);
}

export async function addRecentDestination(userId: string, label: string, lat: number, lng: number, address?: string) {
  const { error } = await supabase.from('recent_destinations').insert({
    user_id: userId,
    label,
    address: address ?? null,
    latitude: lat,
    longitude: lng,
  });
  if (error) handleSupabaseError('addRecentDestination', error);
}

export async function listRecentDestinations(userId: string, limit = 5) {
  const { data, error } = await supabase
    .from('recent_destinations')
    .select('*')
    .eq('user_id', userId)
    .order('searched_at', { ascending: false })
    .limit(limit);
  if (error) handleSupabaseError('listRecentDestinations', error);
  return data ?? [];
}
