// supabase/functions/confused-mode/index.ts
//
// PLACEHOLDER Edge Function for Confused Mode.
// The AI/LLM integration is intentionally NOT implemented here — this
// function exists so the frontend architecture is complete and the
// request/response contract is fixed. To add a real LLM later:
//
//   1. Add your provider's API key as a secret:
//        supabase secrets set FUTURE_LLM_API_KEY=sk-...
//   2. Replace the TODO block below with a fetch() call to that provider,
//      passing `messages` and `context` as the prompt.
//   3. Return { reply: string, implemented: true }.
//
// Nothing on the frontend needs to change — confusedModeService.ts already
// calls this function and handles both the placeholder and real responses.

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

interface ConfusedModeRequest {
  messages: { role: 'user' | 'assistant'; content: string }[];
  context: {
    currentLocation?: { lat: number; lng: number };
    destination?: { lat: number; lng: number };
    availableDisruptions?: unknown[];
    preferences?: unknown;
  };
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = (await req.json()) as ConfusedModeRequest;

    // TODO: replace with a real LLM call, e.g.:
    // const llmRes = await fetch('https://api.anthropic.com/v1/messages', {
    //   method: 'POST',
    //   headers: {
    //     'x-api-key': Deno.env.get('FUTURE_LLM_API_KEY')!,
    //     'content-type': 'application/json',
    //   },
    //   body: JSON.stringify({
    //     model: 'claude-sonnet-4-6',
    //     max_tokens: 500,
    //     system: buildSystemPrompt(body.context),
    //     messages: body.messages,
    //   }),
    // });
    // const llmData = await llmRes.json();

    return new Response(
      JSON.stringify({
        reply:
          "Confused Mode's AI assistant hasn't been connected yet — this is a placeholder response. " +
          'The chat UI, conversation history, and location/route context are fully wired and ready ' +
          'for a real LLM to be plugged in here.',
        implemented: false,
        receivedContext: body.context ?? null,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// function buildSystemPrompt(context: ConfusedModeRequest['context']): string {
//   return `You are Rutein's travel assistant helping a possibly lost or
// overwhelmed public-transit user in Jakarta. Context: ${JSON.stringify(context)}`;
// }
