import { supabase } from '@/lib/supabaseClient';
import type { GeoPoint } from '@/types/domain.types';
import type { Disruption, UserPreferences } from '@/types/database.types';

/**
 * Confused Mode — AI chat is NOT implemented yet (per project scope).
 * This service defines the contract the frontend already talks to, so
 * wiring in a real LLM later is a one-file change inside the Edge Function
 * (supabase/functions/confused-mode/index.ts) — no frontend changes needed.
 *
 * Architecture:
 *   Frontend (ConfusedModeChat component)
 *     -> confusedModeService.sendMessage()
 *     -> Supabase Edge Function "confused-mode"
 *     -> [future] LLM provider
 */

export interface ConfusedModeContext {
  currentLocation?: GeoPoint;
  destination?: GeoPoint;
  availableDisruptions?: Disruption[];
  preferences?: UserPreferences | null;
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

/**
 * Sends a message + context to the confused-mode Edge Function.
 * Currently the Edge Function returns a NOT_IMPLEMENTED placeholder —
 * this call is safe to wire into the UI now and will "just work" once
 * the Edge Function is updated to call a real LLM provider.
 */
export async function sendConfusedModeMessage(
  messages: ConfusedModeMessage[],
  context: ConfusedModeContext
): Promise<{ reply: string; implemented: boolean }> {
  const { data, error } = await supabase.functions.invoke('confused-mode', {
    body: { messages, context },
  });

  if (error) {
    return {
      reply: "Confused Mode's assistant isn't connected yet. This screen is ready for it — an LLM just needs to be wired into the confused-mode Edge Function.",
      implemented: false,
    };
  }

  return { reply: data.reply, implemented: data.implemented ?? false };
}
