import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import LiveGpsModal from '@/components/LiveGpsModal';
import type { PlaceResult, RouteOption } from '@/types/domain.types';

const MODE_ICON: Record<string, string> = {
  walk: '🚶',
  bus: '🚌',
  transjakarta: '🚍',
  mrt: '🚇',
  krl: '🚆',
  lrt: '🚈',
  ojek: '🛵',
  other: '🚏',
};

function formatDuration(seconds: number): string {
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m}m`;
}

function formatCost(idr: number): string {
  return idr === 0 ? 'Free' : `Rp${idr.toLocaleString('id-ID')}`;
}

function legModeLabel(mode: string): string {
  switch (mode) {
    case 'walk': return 'Walk';
    case 'ojek': return 'Ojek online';
    default: return mode;
  }
}
export default function RouteDetail() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as { origin?: PlaceResult; destination?: PlaceResult; option?: RouteOption } | null;
  const [showGpsModal, setShowGpsModal] = useState(false);

  if (!state?.option) {
    return (
      <div className="container">
        <h1>Route not found</h1>
        <p style={{ color: 'var(--color-text-muted)' }}>
          This route's details aren't available directly by link yet — go back to Route Comparison and select a route again.
        </p>
        <button className="btn btn-primary" onClick={() => navigate('/routes')}>
          Back to Route Comparison
        </button>
      </div>
    );
  }

  const { origin, destination, option } = state;
  const now = new Date();
  const arrival = new Date(now.getTime() + option.totalDurationS * 1000);

  // Waypoints for live tracking: the "to" point of every leg (i.e. every
  // stop/transfer/destination along the journey, in order).
  const waypoints = option.legs.map((leg, i) => ({
    lat: leg.to.lat,
    lng: leg.to.lng,
    label: 'label' in leg.to ? leg.to.label : `Stop ${i + 1}`,
  }));

  return (
    <div className="container">
      <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: 'var(--color-primary)', marginBottom: 12, fontSize: 13 }}>
        ← Back
      </button>

      <h1>Route summary</h1>
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>From</span>
          <strong style={{ fontSize: 13 }}>{origin?.label ?? 'Origin'}</strong>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
          <span style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>To</span>
          <strong style={{ fontSize: 13 }}>{destination?.label ?? 'Destination'}</strong>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, textAlign: 'center' }}>
          <Stat label="Duration" value={formatDuration(option.totalDurationS)} />
          <Stat label="Cost" value={formatCost(option.totalCostIdr)} />
          <Stat label="Transfers" value={String(option.transfers)} />
        </div>
        <p style={{ marginTop: 14, marginBottom: 0, fontSize: 13, color: 'var(--color-text-muted)' }}>
          Estimated arrival: {arrival.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>

      <h3>Step-by-step directions</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {option.legs.map((leg, i) => (
          <div key={i} style={{ display: 'flex', gap: 14 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={stepDot}>{MODE_ICON[leg.mode] ?? '🚏'}</div>
              {i < option.legs.length - 1 && <div style={stepLine} />}
            </div>
            <div className="card" style={{ flex: 1, marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <strong style={{ fontSize: 14 }}>{leg.routeLabel ?? legModeLabel(leg.mode)}</strong>
                <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{formatDuration(leg.durationS)}</span>
              </div>
              <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--color-text-muted)' }}>{leg.instructions}</p>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 12 }}>
                <span>{Math.round(leg.distanceM)}m</span>
                <span>{formatCost(leg.estimatedCostIdr)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <button className="btn btn-primary" style={{ width: '100%', marginTop: 8 }} onClick={() => setShowGpsModal(true)}>
        Track this journey live
      </button>

      {showGpsModal && <LiveGpsModal waypoints={waypoints} onClose={() => setShowGpsModal(false)} />}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 16, fontWeight: 700 }}>{value}</div>
      <div style={{ fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>{label}</div>
    </div>
  );
}

const stepDot: React.CSSProperties = {
  width: 34,
  height: 34,
  borderRadius: '50%',
  background: 'var(--color-surface-raised)',
  border: '1px solid var(--color-border)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 16,
};

const stepLine: React.CSSProperties = {
  width: 2,
  flex: 1,
  background: 'var(--color-border)',
  minHeight: 14,
};
