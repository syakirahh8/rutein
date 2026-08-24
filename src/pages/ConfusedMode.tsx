import React, { useEffect, useState } from 'react';
import { sendConfusedModeMessage, SUGGESTED_EMERGENCY_QUESTIONS, type ConfusedModeMessage } from '@/services/confusedModeService';
import { getCurrentPosition } from '@/services/locationService';
import { getActiveDisruptions } from '@/services/transportService';
import type { GeoPoint } from '@/types/domain.types';
import type { Disruption } from '@/types/database.types';

export default function ConfusedMode() {
  const [messages, setMessages] = useState<ConfusedModeMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [location, setLocation] = useState<GeoPoint | null>(null);
  const [disruptions, setDisruptions] = useState<Disruption[]>([]);

  useEffect(() => {
    getCurrentPosition().then(setLocation).catch(() => {});
    getActiveDisruptions().then(setDisruptions).catch(() => {});
  }, []);

  async function handleSend(text: string) {
    if (!text.trim()) return;
    const userMessage: ConfusedModeMessage = { role: 'user', content: text };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setSending(true);
    try {
      const { reply } = await sendConfusedModeMessage([...messages, userMessage], {
        currentLocation: location ?? undefined,
        availableDisruptions: disruptions,
      });
      setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="container" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 70px)' }}>
      <h1>Confused Mode</h1>
      <p style={{ color: 'var(--color-text-muted)', marginTop: 0, marginBottom: 8 }}>
        Ask anything about where you are or what to do next.
      </p>
      <div style={{ marginBottom: 12 }}>
        <span className="badge badge-fallback">AI assistant not yet connected</span>
      </div>

      <div style={{ display: 'flex', gap: 12, fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 16 }}>
        <span>{location ? '📍 Location detected' : '📍 Location unavailable'}</span>
        <span>⚠ {disruptions.length} active disruption{disruptions.length === 1 ? '' : 's'}</span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
        {messages.length === 0 && (
          <div>
            <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 10 }}>Try asking:</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {SUGGESTED_EMERGENCY_QUESTIONS.map((q) => (
                <button key={q} className="btn btn-outline" style={{ textAlign: 'left' }} onClick={() => handleSend(q)}>
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div
            key={i}
            className="card"
            style={{
              maxWidth: '85%',
              alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
              background: m.role === 'user' ? 'var(--color-primary-dim)' : 'var(--color-surface)',
            }}
          >
            <p style={{ margin: 0, fontSize: 14 }}>{m.content}</p>
          </div>
        ))}
        {sending && <p style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>Thinking…</p>}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend(input);
        }}
        style={{ display: 'flex', gap: 8 }}
      >
        <input className="input" placeholder="Type your question…" value={input} onChange={(e) => setInput(e.target.value)} />
        <button className="btn btn-primary" type="submit" disabled={sending}>
          Send
        </button>
      </form>
    </div>
  );
}
