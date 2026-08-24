import React, { useEffect, useState } from 'react';
import { getAllRoutes, getSchedulesForRoute, subscribeToScheduleUpdates } from '@/services/transportService';
import type { TransportRoute, TransportSchedule } from '@/types/database.types';

export default function Schedule() {
  const [routes, setRoutes] = useState<TransportRoute[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [schedules, setSchedules] = useState<TransportSchedule[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAllRoutes()
      .then((r) => {
        setRoutes(r);
        if (r.length > 0) setSelectedRouteId(r[0].id);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedRouteId) return;
    getSchedulesForRoute(selectedRouteId).then(setSchedules);
    const unsubscribe = subscribeToScheduleUpdates(selectedRouteId, (updated) => {
      setSchedules((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    });
    return unsubscribe;
  }, [selectedRouteId]);

  const selectedRoute = routes.find((r) => r.id === selectedRouteId);

  return (
    <div className="container">
      <h1>Transport schedule</h1>
      <p style={{ color: 'var(--color-text-muted)', marginTop: 0 }}>
        Departures and live status by route.
      </p>

      {loading && <p style={{ color: 'var(--color-text-muted)' }}>Loading routes…</p>}

      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 8, marginBottom: 16 }}>
        {routes.map((r) => (
          <button
            key={r.id}
            className="btn"
            style={{
              whiteSpace: 'nowrap',
              background: selectedRouteId === r.id ? 'var(--color-primary)' : 'var(--color-surface-raised)',
              color: selectedRouteId === r.id ? '#071023' : 'var(--color-text)',
            }}
            onClick={() => setSelectedRouteId(r.id)}
          >
            {r.route_name}
          </button>
        ))}
      </div>

      {selectedRoute && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <strong>{selectedRoute.route_name}</strong>
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{selectedRoute.operator}</div>
            </div>
            <span className={`badge ${routeSourceBadgeClass(selectedRoute.source)}`}>
              {routeSourceLabel(selectedRoute.source)}
            </span>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {schedules.map((s) => (
          <div key={s.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600 }}>
                {s.scheduled_departure ?? (s.estimated_departure ? new Date(s.estimated_departure).toLocaleTimeString() : '—')}
              </div>
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                Updated {new Date(s.last_updated).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <StatusPill status={s.status} />
              {s.is_fallback && <span className="badge badge-fallback">Demo</span>}
            </div>
          </div>
        ))}
        {!loading && schedules.length === 0 && (
          <p style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>No schedule data for this route yet.</p>
        )}
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const colors: Record<string, string> = {
    on_time: 'var(--color-success)',
    delayed: 'var(--color-amber)',
    cancelled: 'var(--color-danger)',
    unknown: 'var(--color-text-muted)',
  };
  return (
    <span style={{ fontSize: 12, fontWeight: 700, color: colors[status] ?? colors.unknown, textTransform: 'capitalize' }}>
      {status.replace('_', ' ')}
    </span>
  );
}

function routeSourceBadgeClass(source: string): string {
  switch (source) {
    case 'official': return 'badge-live';
    case 'curated': return 'badge-moderate';
    default: return 'badge-fallback';
  }
}

function routeSourceLabel(source: string): string {
  switch (source) {
    case 'official': return 'Official live feed';
    case 'curated': return 'Real stations, curated';
    default: return 'Demo data';
  }
}
