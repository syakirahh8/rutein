import { useState } from 'react';
import { sendConfusedModeMessage, type ConfusedModeMessage } from '@/services/confusedModeService';
import type { ConfusedModeAIContext } from '@/types/confusedMode.types';

export interface UseConfusedModeChatResult {
  messages: ConfusedModeMessage[];
  sending: boolean;
  sendMessage: (text: string, context: ConfusedModeAIContext) => Promise<void>;
}

/**
 * Owns chat message state and the request/response cycle with the
 * Confused Mode Edge Function. Doesn't know anything about location,
 * nearby places, or how the AI context was built — it just sends
 * whatever context object it's given.
 *
 * NOTE: `confusedModeService.ts` wasn't available when this was
 * written, so `sendConfusedModeMessage`'s context parameter type is
 * assumed to accept this shape structurally. If it's typed narrower
 * (or as `any`), it's worth tightening it to `ConfusedModeAIContext`
 * for end-to-end type safety.
 */
export function useConfusedModeChat(): UseConfusedModeChatResult {
  const [messages, setMessages] = useState<ConfusedModeMessage[]>([]);
  const [sending, setSending] = useState(false);

  async function sendMessage(text: string, context: ConfusedModeAIContext) {
    const trimmedText = text.trim();

    if (!trimmedText || sending) {
      return;
    }

    const userMessage: ConfusedModeMessage = { role: 'user', content: trimmedText };
    const updatedMessages = [...messages, userMessage];

    setMessages(updatedMessages);
    setSending(true);

    try {
      const { reply } = await sendConfusedModeMessage(updatedMessages, context);

      setMessages((previousMessages) => [
        ...previousMessages,
        { role: 'assistant', content: reply },
      ]);
    } catch (error) {
      console.error('Failed to send Confused Mode message:', error);

      setMessages((previousMessages) => [
        ...previousMessages,
        {
          role: 'assistant',
          content: "I could not connect to Rutein's assistant right now. Please try again.",
        },
      ]);
    } finally {
      setSending(false);
    }
  }

  return { messages, sending, sendMessage };
}