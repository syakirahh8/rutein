import React, { useEffect, useState } from 'react';
import { getDisruptions, watchDisruptions, sortBySeverity } from '@/services/disruptionService';
import type { Disruption } from '@/types/database.types';

export default function Disruptions() {
  const [disruptions, setDisruptions] = useState<Disruption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDisruptions()
      .then((d) => setDisruptions(sortBySeverity(d)))
      .finally(() => setLoading(false));

    const unsubscribe = watchDisruptions((updated) => {
      setDisruptions((prev) => {
        const exists = prev.some((d) => d.id === updated.id);
        const next = exists ? prev.map((d) => (d.id === updated.id ? updated : d)) : [updated, ...prev];
        return sortBySeverity(next.filter((d) => d.status !== 'resolved'));
      });
    });
    return unsubscribe;
  }, []);

  return (
    <div className="container">
      <h1>Disruption alerts</h1>
      <p style={{ color: 'var(--color-text-muted)', marginTop: 0 }}>
        Active delays, closures, and service interruptions. Updates live when a real feed is connected.
      </p>

      {loading && <p style={{ color: 'var(--color-text-muted)' }}>Checking for disruptions…</p>}
      {!loading && disruptions.length === 0 && (
        <div className="card">
          <p style={{ margin: 0, color: 'var(--color-success)' }}>✓ No active disruptions right now.</p>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {disruptions.map((d) => (
          <div key={d.id} className="card" style={{ borderColor: severityColor(d.severity) }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
              <strong style={{ fontSize: 15 }}>{d.title}</strong>
              <div style={{ display: 'flex', gap: 6 }}>
                <span style={{ ...severityBadge, background: severityColor(d.severity) + '22', color: severityColor(d.severity) }}>
                  {d.severity}
                </span>
                {d.is_fallback && <span className="badge badge-fallback">Demo data</span>}
              </div>
            </div>
            {d.description && <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--color-text-muted)' }}>{d.description}</p>}
            {d.affected_route_labels.length > 0 && (
              <p style={{ margin: '8px 0 0', fontSize: 12 }}>
                <strong>Affects:</strong> {d.affected_route_labels.join(', ')}
              </p>
            )}
            {d.affected_locations.length > 0 && (
              <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--color-text-muted)' }}>
                📍 {d.affected_locations.join(', ')}
              </p>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, fontSize: 11, color: 'var(--color-text-muted)' }}>
              <span>Status: {d.status}</span>
              <span>Updated {new Date(d.last_updated).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function severityColor(severity: string) {
  switch (severity) {
    case 'critical': return '#F0475A';
    case 'high': return '#F0475A';
    case 'moderate': return '#F5A623';
    default: return '#90A0BE';
  }
}

const severityBadge: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  textTransform: 'uppercase',
  padding: '3px 9px',
  borderRadius: 999,
};
