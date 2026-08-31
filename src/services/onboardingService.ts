import { supabase } from '@/lib/supabaseClient';
import type { IndonesiaTransportType } from '@/data/indonesiaTransportData';

export type OnboardingTransportType = Exclude<IndonesiaTransportType, 'other'>;
export type OnboardingProfileType = 'school' | 'travel' | 'work';

export async function saveTransportPreference(
  userId: string,
  transports: OnboardingTransportType[]
): Promise<void> {
  const { error } = await supabase
    .from('user_preferences')
    .upsert({ user_id: userId, preferred_transport: transports }, { onConflict: 'user_id' });

  if (error) throw error;
}

export async function saveProfileType(
  userId: string,
  profileType: OnboardingProfileType | null
): Promise<void> {
  const { error } = await supabase.from('user_preferences').upsert(
    {
      user_id: userId,
      profile_type: profileType,
      onboarding_completed_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  );

  if (error) throw error;
}