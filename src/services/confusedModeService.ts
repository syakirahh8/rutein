import { supabase } from '@/lib/supabaseClient';
import type { GeoPoint } from '@/types/domain.types';
import type {
  Disruption,
  UserPreferences,
} from '@/types/database.types';

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

export interface ConfusedModeContext {
  currentLocation?: ConfusedModeLocation;

  destination?: unknown;

  selectedMapPlace?: unknown;

  nearbyPlaces?: unknown[];

  nearbyTransport?: unknown[];

  currentRoute?: unknown;

  availableDisruptions?: Disruption[];

  preferences?: UserPreferences | null;

  mapProvider?: string;

  locationSource?: string;

  nearbySearchRadiusMeters?: number;
}

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
  context: ConfusedModeContext
): Promise<{
  reply: string;
  implemented: boolean;
}> {
  const { data, error } =
    await supabase.functions.invoke(
      'confused-mode',
      {
        body: {
          messages,
          context,
        },
      }
    );

  if (error) {
    console.error(
      'Confused Mode error:',
      error
    );

    try {
      const errorData =
        await error.context.json();

      return {
        reply:
          errorData.reply ??
          errorData.error ??
          'The AI assistant encountered a server error.',

        implemented: false,
      };
    } catch {
      return {
        reply:
          'The AI assistant encountered a server error.',

        implemented: false,
      };
    }
  }

  return {
    reply:
      data?.reply ??
      'No response received from the assistant.',

    implemented:
      data?.implemented ?? true,
  };
}