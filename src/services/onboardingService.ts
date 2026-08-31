import { supabase } from '@/lib/supabaseClient';
import type { IndonesiaTransportType } from '@/data/indonesiaTransportData';

export type OnboardingTransportType = Exclude<IndonesiaTransportType, 'other'>;
export type OnboardingProfileType = 'school' | 'travel' | 'work';

export interface OnboardingStatus {
  completed: boolean;
}

/**
 * Source of truth for "has this user already done onboarding?" —
 * reads `user_preferences.onboarding_completed_at` directly rather than
 * `auth.users.user_metadata`, since nothing in the app ever writes that
 * metadata flag. `finish()` in ProfileSelect sets this timestamp on
 * every completion path (even "Nanti saja"/skip), so its presence alone
 * is enough to know the flow is done.
 */
export async function getOnboardingStatus(userId: string): Promise<OnboardingStatus> {
  const { data, error } = await supabase
    .from('user_preferences')
    .select('onboarding_completed_at')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.warn('getOnboardingStatus failed:', error.message);
    // Fail open toward "not completed" is wrong here — failing open
    // toward "completed" would silently skip onboarding on a transient
    // error. Safer to let the user through to onboarding again than to
    // block them from the app entirely.
    return { completed: false };
  }

  return { completed: !!data?.onboarding_completed_at };
}

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