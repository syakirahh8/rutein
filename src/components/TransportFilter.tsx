import React from 'react';
import { TRANSPORT_TYPE_LABELS, type IndonesiaTransportType } from '@/data/indonesiaTransportData';
import { TRANSPORT_TYPE_COLOR } from './transportMarkerIcon';

interface Props {
  activeTypes: Set<IndonesiaTransportType>;
  onToggle: (type: IndonesiaTransportType) => void;
  onShowAll: () => void;
  open: boolean;
  onClose: () => void;
}

const ALL_TYPES = Object.keys(TRANSPORT_TYPE_LABELS) as IndonesiaTransportType[];

export default function TransportFilter({ activeTypes, onToggle, onShowAll, open, onClose }: Props) {
  if (!open) return null;

  return (
    <div style={panel} className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <strong style={{ fontSize: 13 }}>Show on map</strong>
        <button onClick={onClose} style={closeBtn}>✕</button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 260, overflowY: 'auto' }}>
        {ALL_TYPES.map((type) => (
          <label key={type} style={row}>
            <input
              type="checkbox"
              checked={activeTypes.has(type)}
              onChange={() => onToggle(type)}
              style={{ width: 16, height: 16 }}
            />
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: TRANSPORT_TYPE_COLOR[type], flexShrink: 0 }} />
            <span style={{ fontSize: 13 }}>{TRANSPORT_TYPE_LABELS[type]}</span>
          </label>
        ))}
      </div>

      <button className="btn btn-outline" style={{ width: '100%', marginTop: 10, fontSize: 12, padding: '6px 10px' }} onClick={onShowAll}>
        Show all
      </button>
    </div>
  );
}

const panel: React.CSSProperties = {
  position: 'absolute',
  top: 50,
  left: 10,
  zIndex: 10,
  width: 210,
  padding: 14,
  background: '#FFFFFF',
  border: '1.5px solid var(--color-border)',
  borderRadius: 'var(--radius-md)',
  boxShadow: 'var(--shadow-card)',
};

const row: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  cursor: 'pointer',
  padding: '3px 0',
};

const closeBtn: React.CSSProperties = {
  background: 'var(--color-surface-raised)',
  border: '1px solid var(--color-border)',
  borderRadius: 6,
  width: 22,
  height: 22,
  fontSize: 11,
  color: 'var(--color-text)',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};