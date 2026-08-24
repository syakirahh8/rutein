import React from 'react';
import type { RouteOption } from '@/types/domain.types';

interface Props {
  option: RouteOption;
  onSelect?: () => void;
  selected?: boolean;
}

const MODE_ICON: Record<string, string> = {
  walk: '🚶',
  bus: '🚌',
  transjakarta: '🚍',
  mrt: '🚇',
  krl: '🚆',
  lrt: '🚈',
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
  if (idr === 0) return 'Free';
  return `Rp${idr.toLocaleString('id-ID')}`;
}

export default function RouteOptionCard({ option, onSelect, selected }: Props) {
  return (
    <div
      className="card"
      style={{
        borderColor: selected ? 'var(--color-primary)' : 'var(--color-border)',
        cursor: onSelect ? 'pointer' : 'default',
      }}
      onClick={onSelect}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {option.category && (
            <span className={`badge badge-${option.category}`}>{option.category}</span>
          )}
        </div>
        <div style={{ fontWeight: 700, fontSize: 16 }}>{formatCost(option.totalCostIdr)}</div>
      </div>

      <div style={{ display: 'flex', gap: 6, fontSize: 20, marginBottom: 10 }}>
        {option.legs.map((leg, i) => (
          <React.Fragment key={i}>
            <span title={leg.mode}>{MODE_ICON[leg.mode] ?? '🚏'}</span>
            {i < option.legs.length - 1 && <span style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>›</span>}
          </React.Fragment>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 16, fontSize: 13, color: 'var(--color-text-muted)', flexWrap: 'wrap' }}>
        <span>⏱ {formatDuration(option.totalDurationS)}</span>
        <span>⇄ {option.transfers} transfer{option.transfers === 1 ? '' : 's'}</span>
        <span>🚶 {Math.round(option.walkingDistanceM)}m walking</span>
      </div>
    </div>
  );
}
