import { supabase } from '@/lib/supabaseClient';
import type { ConfusedModeAIContext } from '@/types/confusedMode.types';
import type { Disruption, UserPreferences } from '@/types/database.types';
import type { GeoPoint } from '@/types/domain.types';

// ------------------------------------------------------------------
// LEGACY TYPES — kept exported for backward compatibility in case any
// other file in the app still imports them (not confirmed either way,
// since I only have visibility into the Confused Mode call chain). They
// are no longer used by sendConfusedModeMessage below — the actual
// context contract is now ConfusedModeAIContext from
// @/types/confusedMode.types.ts, which is what
// buildConfusedModeAIContext() produces and what the Edge Function now
// parses. If you find another caller building a context object shaped
// like these, it needs to move to ConfusedModeAIContext too — worth a
// project-wide grep for `sendConfusedModeMessage` to confirm there isn't
// one.
// ------------------------------------------------------------------

export interface ConfusedModeLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
  address?: string;
}

export interface ConfusedModeMapPlace {
  name: string;
  location: GeoPoint;
}

export interface ConfusedModeDestination {
  name?: string;
  location: GeoPoint;
}

export interface NearbyTransport {
  type: string;
  name: string;
  distance?: number;
  latitude?: number;
  longitude?: number;
}

/** @deprecated superseded by ConfusedModeAIContext — kept as a type alias for compatibility. */
export type ConfusedModeContext = ConfusedModeAIContext;

export interface ConfusedModeMessage {
  role: 'user' | 'assistant';
  content: string;
}

export const SUGGESTED_EMERGENCY_QUESTIONS: string[] = [
  "I don't know where I am.",
  'Which transportation should I take?',
  'How do I get home?',
  'I missed my bus.',
  "I'm lost.",
];

export async function sendConfusedModeMessage(
  messages: ConfusedModeMessage[],
  context: ConfusedModeAIContext
): Promise<{
  reply: string;
  implemented: boolean;
}> {
  const { data, error } = await supabase.functions.invoke('confused-mode', {
    body: {
      messages,
      context,
    },
  });

  if (error) {
    console.error('Confused Mode error:', error);

    try {
      const errorData = await error.context.json();

      return {
        reply:
          errorData.reply ?? errorData.error ?? 'The AI assistant encountered a server error.',
        implemented: false,
      };
    } catch {
      return {
        reply: 'The AI assistant encountered a server error.',
        implemented: false,
      };
    }
  }

  return {
    reply: data?.reply ?? 'No response received from the assistant.',
    implemented: data?.implemented ?? true,
  };
}