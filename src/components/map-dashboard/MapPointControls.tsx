import React from 'react';
import { Plus, Minus, Layers, Navigation, PlusCircle, ArrowLeftRight, HelpCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface MapPointControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onToggleMapStyle: () => void;
  onReCenterUserLocation: () => void;
  onAddStop?: () => void;
  onToggleRoute?: () => void;
  baseLayer: 'street' | 'satellite';
}

export default function MapPointControls({
  onZoomIn,
  onZoomOut,
  onToggleMapStyle,
  onReCenterUserLocation,
  onAddStop,
  onToggleRoute,
  baseLayer,
}: MapPointControlsProps) {
  const navigate = useNavigate();

  return (
    <div style={controlsContainerStyle}>
      {/* 1. Confused Mode (Icon Merpati / Dove) */}
      <button
        onClick={() => navigate('/confused')}
        style={{ ...btnStyle, background: 'linear-gradient(135deg, #DA362A, #FF6B6B)', color: '#FFF' }}
        title="Confused Mode (Butuh Bantuan Rute?)"
      >
        <span style={{ fontSize: 16 }}>🕊️</span>
      </button>

      <div style={dividerStyle} />

      {/* 2. Zoom In (+ ) */}
      <button onClick={onZoomIn} style={btnStyle} title="Zoom In">
        <Plus size={18} color="#1E1E1E" />
      </button>

      {/* 3. Zoom Out (-) */}
      <button onClick={onZoomOut} style={btnStyle} title="Zoom Out">
        <Minus size={18} color="#1E1E1E" />
      </button>

      <div style={dividerStyle} />

      {/* 4. Map Style Switch */}
      <button onClick={onToggleMapStyle} style={btnStyle} title={`Switch to ${baseLayer === 'street' ? 'Satellite' : 'Streets'}`}>
        <Layers size={18} color={baseLayer === 'satellite' ? '#DA362A' : '#1E1E1E'} />
      </button>

      {/* 5. My Location (GPS) */}
      <button onClick={onReCenterUserLocation} style={btnStyle} title="Posisiku (GPS)">
        <Navigation size={18} color="#2563EB" />
      </button>

      {/* 6. Add Stop */}
      <button onClick={onAddStop} style={btnStyle} title="Tambah Hentian (Add Stop)">
        <PlusCircle size={18} color="#1E1E1E" />
      </button>

      {/* 7. Route Button */}
      <button onClick={onToggleRoute} style={btnStyle} title="Hitung Rute">
        <ArrowLeftRight size={18} color="#DA362A" />
      </button>
    </div>
  );
}

// STYLES
const controlsContainerStyle: React.CSSProperties = {
  position: 'absolute',
  top: '50%',
  right: 16,
  transform: 'translateY(-50%)',
  zIndex: 'var(--z-map-controls)',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  background: '#FFFFFF',
  borderRadius: 24,
  padding: '8px 6px',
  boxShadow: 'var(--shadow-floating)',
  gap: 4,
};

const btnStyle: React.CSSProperties = {
  width: 40,
  height: 40,
  borderRadius: '50%',
  border: 'none',
  background: 'transparent',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  transition: 'background-color 0.15s ease',
};

const dividerStyle: React.CSSProperties = {
  width: 24,
  height: 1,
  background: '#E5E5E5',
  margin: '2px 0',
};
