import React from 'react';
import { Navigation, AlertTriangle, ChevronRight, Eye } from 'lucide-react';
import type { DirectionsResult } from '@/services/mapService';
import type { PlaceResult } from '@/types/domain.types';

interface MapRouteDetailBarProps {
  destination: PlaceResult | null;
  directions: DirectionsResult | null;
  loading: boolean;
  onOpenDetails?: () => void;
  onCloseRoute?: () => void;
}

function formatDuration(seconds: number): string {
  const mins = Math.round(seconds / 60);
  if (mins < 1) return '<1 min';
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h} j ${m} m` : `${h} j`;
}

function formatDistance(meters: number): string {
  return meters < 1000 ? `${Math.round(meters)} m` : `${(meters / 1000).toFixed(1)} km`;
}

export default function MapRouteDetailBar({
  destination,
  directions,
  loading,
  onOpenDetails,
  onCloseRoute,
}: MapRouteDetailBarProps) {
  if (!destination) return null;

  return (
    <div style={cardWrapperStyle}>
      <div style={headerRowStyle}>
        <div style={destinationLabelGroup}>
          <Navigation size={16} color="#DA362A" />
          <span style={destinationTitleStyle}>via Jl. Tol Pelabuhan (Menuju {destination.label})</span>
        </div>
        {onCloseRoute && (
          <button onClick={onCloseRoute} style={closeBtnStyle}>
            ✕
          </button>
        )}
      </div>

      {loading ? (
        <div style={statusTextStyle}>Menghitung rute perjalanan...</div>
      ) : directions ? (
        <>
          <div style={metricsRowStyle}>
            <span style={durationBadgeStyle}>{formatDuration(directions.durationS)}</span>
            <span style={distanceTextStyle}>{formatDistance(directions.distanceM)}</span>
          </div>

          <div style={warningNoticeStyle}>
            <AlertTriangle size={13} color="#F5A623" />
            <span>Rute ini memiliki tol / lintasan berbayar.</span>
          </div>

          <div style={actionsRowStyle}>
            <button onClick={onOpenDetails} style={detailsBtnStyle}>
              Details
            </button>
            <button onClick={onOpenDetails} style={previewBtnStyle}>
              <Eye size={14} />
              <span>Preview</span>
            </button>
          </div>
        </>
      ) : (
        <div style={statusTextStyle}>Pilih lokasi awal untuk melihat rute lengkap.</div>
      )}
    </div>
  );
}

// STYLES
const cardWrapperStyle: React.CSSProperties = {
  position: 'absolute',
  bottom: 20,
  left: 20,
  zIndex: 'var(--z-panel)',
  width: 360,
  maxWidth: 'calc(100vw - 120px)',
  background: '#FFFFFF',
  borderRadius: 16,
  padding: 16,
  boxShadow: 'var(--shadow-floating)',
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
};

const headerRowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
};

const destinationLabelGroup: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
};

const destinationTitleStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 700,
  color: '#1E1E1E',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  maxWidth: 280,
};

const closeBtnStyle: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  fontSize: 12,
  color: '#888',
  cursor: 'pointer',
};

const metricsRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'baseline',
  gap: 10,
};

const durationBadgeStyle: React.CSSProperties = {
  fontSize: 20,
  fontWeight: 800,
  color: '#16A34A',
};

const distanceTextStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  color: '#666666',
};

const warningNoticeStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  fontSize: 11,
  color: '#D97706',
  background: 'rgba(245, 166, 35, 0.1)',
  padding: '4px 8px',
  borderRadius: 6,
};

const actionsRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: 8,
  marginTop: 2,
};

const detailsBtnStyle: React.CSSProperties = {
  flex: 1,
  padding: '8px 14px',
  borderRadius: 8,
  border: '1px solid #E5E5E5',
  background: '#F9F9F9',
  color: '#1E1E1E',
  fontSize: 12,
  fontWeight: 600,
  cursor: 'pointer',
};

const previewBtnStyle: React.CSSProperties = {
  flex: 1,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  padding: '8px 14px',
  borderRadius: 8,
  border: 'none',
  background: '#DA362A',
  color: '#FFFFFF',
  fontSize: 12,
  fontWeight: 700,
  cursor: 'pointer',
};

const statusTextStyle: React.CSSProperties = {
  fontSize: 12,
  color: '#666666',
  fontStyle: 'italic',
};
