import React, { useEffect, useState, useMemo } from 'react';
import { 
  INDONESIA_ROAD_DISRUPTIONS, 
  SEVERITY_COLORS, 
  DISRUPTION_SEVERITY_LABELS,
  DISRUPTION_CAUSE_LABELS,
  ROAD_TYPE_LABELS,
  IndonesiaRoadDisruption 
} from '../data/indonesiaRoadDisruption';

type FilterTab = 'semua' | 'aktif' | 'kritis' | 'tol';

function formatWaktuLaporan(isoString: string): string {
  const diffMs = Date.now() - new Date(isoString).getTime();
  const diffMins = Math.max(0, Math.floor(diffMs / (1000 * 60)));
  if (diffMins < 1) return 'Baru saja';
  if (diffMins < 60) return `${diffMins} menit lalu`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} jam lalu`;
  return new Date(isoString).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function Disruptions() {
  const [disruptions, setDisruptions] = useState<IndonesiaRoadDisruption[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterTab>('aktif');

  useEffect(() => {
    // Simulasi pemuatan feed peringatan lalu lintas
    const timer = setTimeout(() => {
      // Urutkan berdasarkan tingkat keparahan (Kritis -> Tinggi -> Sedang -> Rendah)
      const severityWeight: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };
      const sorted = [...INDONESIA_ROAD_DISRUPTIONS].sort((a, b) => severityWeight[b.severity] - severityWeight[a.severity]);
      
      setDisruptions(sorted);
      setLoading(false);
    }, 300);

    return () => clearTimeout(timer);
  }, []);

  const filteredDisruptions = useMemo(() => {
    switch (filter) {
      case 'aktif':
        return disruptions.filter((d) => d.isActive);
      case 'kritis':
        return disruptions.filter((d) => d.severity === 'critical');
      case 'tol':
        return disruptions.filter((d) => d.roadType === 'toll_road');
      case 'semua':
      default:
        return disruptions;
    }
  }, [disruptions, filter]);

  return (
    <div className="container" style={{ paddingTop: 28, paddingBottom: 80 }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 'clamp(26px, 4vw, 34px)', marginBottom: 6 }}>Peringatan Lalu Lintas & Rute</h1>
        <p style={{ color: 'var(--color-text-muted)', marginTop: 0, fontSize: 14 }}>
          Informasi situasi insiden, penundaan, rekayasa contraflow, dan penutupan jalan terkini di area perjalananmu.
        </p>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {[
          { key: 'aktif', label: 'Sedang Aktif' },
          { key: 'kritis', label: 'Prioritas Kritis' },
          { key: 'tol', label: 'Jalur Tol' },
          { key: 'semua', label: 'Semua Laporan' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key as FilterTab)}
            style={{
              padding: '7px 16px',
              borderRadius: 999,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              border: '1.5px solid',
              borderColor: filter === tab.key ? 'var(--color-primary)' : 'var(--color-border)',
              background: filter === tab.key ? 'var(--color-primary)' : '#FFFFFF',
              color: filter === tab.key ? '#FFFFFF' : 'var(--color-text)',
              transition: 'all 0.15s ease',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading && <p style={{ color: 'var(--color-text-muted)' }}>Memeriksa laporan gangguan lalu lintas…</p>}
      {!loading && filteredDisruptions.length === 0 && (
        <div className="card" style={{ background: '#FFFFFF', borderRadius: 14, textAlign: 'center', padding: '32px 20px' }}>
          <p style={{ margin: 0, color: 'var(--color-success)', fontWeight: 600, fontSize: 15 }}>
            ✓ Tidak ada laporan gangguan lalu lintas untuk filter ini.
          </p>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {filteredDisruptions.map((d) => (
          <div
            key={d.id}
            className="card hover-lift-card"
            style={{
              background: '#FFFFFF',
              borderRadius: 14,
              borderLeft: `4px solid ${SEVERITY_COLORS[d.severity]}`,
              padding: '18px 20px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
              <strong style={{ fontSize: 16, color: 'var(--color-text)', lineHeight: 1.3 }}>{d.title}</strong>
              <span
                style={{ 
                  ...severityBadge, 
                  background: SEVERITY_COLORS[d.severity] + '1A', 
                  color: SEVERITY_COLORS[d.severity],
                  border: `1px solid ${SEVERITY_COLORS[d.severity]}40`,
                }}
              >
                {DISRUPTION_SEVERITY_LABELS[d.severity] ?? d.severity}
              </span>
            </div>
            
            {d.description && (
              <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
                {d.description}
              </p>
            )}
            
            {d.affectedRoads.length > 0 && (
              <p style={{ margin: '10px 0 0', fontSize: 12, color: 'var(--color-text)' }}>
                <strong>Ruas terdampak:</strong> {d.affectedRoads.join(', ')}
              </p>
            )}
            
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, margin: '8px 0 0', fontSize: 12, color: 'var(--color-text-muted)' }}>
              <span>📍 {ROAD_TYPE_LABELS[d.roadType] ?? d.roadType}</span>
              <span>• Kategori: {DISRUPTION_CAUSE_LABELS[d.cause] ?? d.cause}</span>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 10, borderTop: '1px solid #F3E7DC', fontSize: 11, color: 'var(--color-text-muted)' }}>
              <span style={{ fontWeight: 600, color: d.isActive ? '#B91C1C' : '#16A34A' }}>
                Status: {d.isActive ? '● Sedang Berlangsung' : '✓ Telah Ditangani'}
              </span>
              <span>Dilaporkan {formatWaktuLaporan(d.reportedAt)}</span>
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
  letterSpacing: '0.04em',
  padding: '3px 10px',
  borderRadius: 999,
  whiteSpace: 'nowrap',
};