import React, { useEffect, useState } from 'react';
import { 
  INDONESIA_ROAD_DISRUPTIONS, 
  SEVERITY_COLORS, 
  IndonesiaRoadDisruption 
} from '../data/indonesiaRoadDisruption';

export default function Disruptions() {
  const [disruptions, setDisruptions] = useState<IndonesiaRoadDisruption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate a brief network load for UI realism
    const timer = setTimeout(() => {
      // Filter for active disruptions only
      const active = INDONESIA_ROAD_DISRUPTIONS.filter((d) => d.isActive);
      
      // Sort by severity (Critical -> High -> Medium -> Low)
      const severityWeight: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };
      active.sort((a, b) => severityWeight[b.severity] - severityWeight[a.severity]);
      
      setDisruptions(active);
      setLoading(false);
    }, 400);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="container">
      <h1>Road Traffic Alerts</h1>
      <p style={{ color: 'var(--color-text-muted)', marginTop: 0 }}>
        Active delays, closures, and traffic engineering updates. Updates live when a real feed is connected.
      </p>

      {loading && <p style={{ color: 'var(--color-text-muted)' }}>Checking for road disruptions…</p>}
      {!loading && disruptions.length === 0 && (
        <div className="card">
          <p style={{ margin: 0, color: 'var(--color-success)' }}>✓ No active road disruptions right now.</p>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {disruptions.map((d) => (
          <div key={d.id} className="card" style={{ borderColor: SEVERITY_COLORS[d.severity] }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
              <strong style={{ fontSize: 15 }}>{d.title}</strong>
              <div style={{ display: 'flex', gap: 6 }}>
                <span style={{ 
                  ...severityBadge, 
                  background: SEVERITY_COLORS[d.severity] + '22', 
                  color: SEVERITY_COLORS[d.severity] 
                }}>
                  {d.severity}
                </span>
              
              </div>
            </div>
            
            {d.description && (
              <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--color-text-muted)' }}>
                {d.description}
              </p>
            )}
            
            {d.affectedRoads.length > 0 && (
              <p style={{ margin: '8px 0 0', fontSize: 12 }}>
                <strong>Affects:</strong> {d.affectedRoads.join(', ')}
              </p>
            )}
            
            <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--color-text-muted)', textTransform: 'capitalize' }}>
              📍 {d.roadType.replace('_', ' ')} • Cause: {d.cause}
            </p>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, fontSize: 11, color: 'var(--color-text-muted)' }}>
              <span>Status: {d.isActive ? 'Active' : 'Resolved'}</span>
              <span>Reported {new Date(d.reportedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const severityBadge: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  textTransform: 'uppercase',
  padding: '3px 9px',
  borderRadius: 999,
  whiteSpace: 'nowrap',
};