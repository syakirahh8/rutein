import React, { useMemo, useState } from 'react';
import { INDONESIA_TRANSPORT_DATA, TRANSPORT_TYPE_LABELS, type IndonesiaTransportType } from '@/data/indonesiaTransportData';
import {
  TRANSPORT_ROUTES,
  FARE_ESTIMATE,
  getRouteForStation,
  getUpcomingDepartures,
  getFullDaySchedule,
  groupScheduleByDirectionAndHour,
  type DepartureStatus,
} from '@/data/transportationScheduledata';

const TYPE_ORDER: IndonesiaTransportType[] = ['transjakarta', 'mrt', 'lrt', 'krl', 'bus', 'airport_rail', 'train', 'ferry', 'terminal'];

export default function Schedule() {
  const [selectedType, setSelectedType] = useState<IndonesiaTransportType | 'all'>('all');
  const [selectedStationId, setSelectedStationId] = useState<string | null>(null);

  const presentTypes = useMemo(() => TYPE_ORDER.filter((t) => TRANSPORT_ROUTES.some((r) => r.type === t)), []);

  const routesForType = useMemo(
    () => TRANSPORT_ROUTES.filter((r) => selectedType === 'all' || r.type === selectedType).sort((a, b) => a.line.localeCompare(b.line)),
    [selectedType]
  );

  const selectedStation = selectedStationId ? INDONESIA_TRANSPORT_DATA.find((s) => s.id === selectedStationId) ?? null : null;
  const selectedRoute = selectedStationId ? getRouteForStation(selectedStationId) : null;
  const upcoming = selectedStationId ? getUpcomingDepartures(selectedStationId) : [];
  const fullDayGrouped = selectedStationId ? groupScheduleByDirectionAndHour(getFullDaySchedule(selectedStationId)) : null;

  return (
    <div className="container">
      <h1>Transport Schedule</h1>
      <p style={{ color: 'var(--color-text-muted)', marginTop: 0 }}>
        Browse by transport type, pick a station, and see its route and today's departures.
      </p>

      {/* Type tabs */}
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 8, marginBottom: 16 }}>
        <TypeTab label="All" active={selectedType === 'all'} onClick={() => { setSelectedType('all'); setSelectedStationId(null); }} />
        {presentTypes.map((t) => (
          <TypeTab
            key={t}
            label={TRANSPORT_TYPE_LABELS[t]}
            active={selectedType === t}
            onClick={() => { setSelectedType(t); setSelectedStationId(null); }}
          />
        ))}
      </div>

      {/* Route list for the selected type */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
        {routesForType.map((route) => (
          <div key={route.key} className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
              <strong style={{ fontSize: 15 }}>{route.line}</strong>
              <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                {TRANSPORT_TYPE_LABELS[route.type]} · {route.stops.length} stop{route.stops.length === 1 ? '' : 's'}
              </span>
            </div>
            {route.hasDirections && (
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 8 }}>
                {route.originLabel} ↔ {route.destinationLabel}
              </div>
            )}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {route.stops.map((stop) => (
                <button
                  key={stop.id}
                  type="button"
                  onClick={() => setSelectedStationId(stop.id)}
                  style={{
                    padding: '5px 10px',
                    borderRadius: 14,
                    border: '1px solid var(--color-border)',
                    background: selectedStationId === stop.id ? 'var(--color-primary)' : 'var(--color-surface-raised)',
                    color: selectedStationId === stop.id ? '#fff' : 'var(--color-text)',
                    fontSize: 12,
                    cursor: 'pointer',
                  }}
                >
                  {stop.name}
                </button>
              ))}
            </div>
          </div>
        ))}
        {routesForType.length === 0 && (
          <p style={{ color: 'var(--color-text-muted)' }}>No routes for this type.</p>
        )}
      </div>

      {/* Station detail */}
      {selectedStation && selectedRoute && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <div>
              <strong style={{ fontSize: 18, display: 'block' }}>{selectedStation.name}</strong>
              <div style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 4 }}>
                {selectedRoute.line} · {selectedStation.city}, {selectedStation.province}
              </div>
            </div>
            <span
              style={{
                background: 'var(--color-surface-raised)',
                border: '1px solid var(--color-border)',
                padding: '4px 8px',
                borderRadius: 4,
                fontSize: 11,
                fontWeight: 700,
                color: 'var(--color-text-muted)',
              }}
            >
              {TRANSPORT_TYPE_LABELS[selectedStation.type]}
            </span>
          </div>

          <div style={{ fontSize: 13, marginBottom: 16 }}>
            <span style={{ color: 'var(--color-text-muted)' }}>Estimated fare: </span>
            <strong>{FARE_ESTIMATE[selectedStation.type]}</strong>
          </div>

          {/* Route context */}
          {selectedRoute.hasDirections ? (
            <div style={{ marginBottom: 16 }}>
              <h4 style={{ marginBottom: 8 }}>Route</h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
                {selectedRoute.stops.map((stop, i) => (
                  <React.Fragment key={stop.id}>
                    <span
                      style={{
                        fontSize: 12,
                        padding: '3px 8px',
                        borderRadius: 10,
                        background: stop.id === selectedStation.id ? 'var(--color-primary)' : 'transparent',
                        color: stop.id === selectedStation.id ? '#fff' : 'var(--color-text-muted)',
                        fontWeight: stop.id === selectedStation.id ? 700 : 400,
                      }}
                    >
                      {stop.name}
                    </span>
                    {i < selectedRoute.stops.length - 1 && <span style={{ color: 'var(--color-text-muted)' }}>›</span>}
                  </React.Fragment>
                ))}
              </div>
            </div>
          ) : (
            <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 16 }}>
              Single point of service — no directional schedule to show.
            </p>
          )}

          {/* Upcoming departures */}
          {selectedRoute.hasDirections && (
            <div style={{ marginBottom: 16 }}>
              <h4 style={{ marginBottom: 8 }}>Upcoming departures</h4>
              {upcoming.length === 0 ? (
                <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>No more departures today.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {upcoming.map((dep) => (
                    <div
                      key={dep.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '8px 10px',
                        border: '1px solid var(--color-border)',
                        borderRadius: 6,
                      }}
                    >
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600 }}>
                          {dep.time} WIB <span style={{ fontWeight: 400, color: 'var(--color-text-muted)' }}>· {dep.directionLabel}</span>
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{dep.humanText}</div>
                      </div>
                      <StatusPill status={dep.status} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Full day schedule, collapsible, grouped by hour to stay compact */}
          {selectedRoute.hasDirections && fullDayGrouped && (
            <details>
              <summary style={{ cursor: 'pointer', fontSize: 13, color: 'var(--color-primary)', marginBottom: 8 }}>
                Full day schedule
              </summary>
              {(['outbound', 'inbound'] as const).map((dir) => {
                const hours = fullDayGrouped[dir];
                const label = dir === 'outbound' ? `Toward ${selectedRoute.destinationLabel}` : `Toward ${selectedRoute.originLabel}`;
                return (
                  <div key={dir} style={{ marginTop: 10 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>{label}</div>
                    {Object.keys(hours)
                      .sort()
                      .map((hour) => (
                        <div key={hour} style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 2 }}>
                          <strong style={{ color: 'var(--color-text)' }}>{hour}:00</strong> — {hours[hour].map((e) => e.time.slice(3)).join(', ')}
                        </div>
                      ))}
                  </div>
                );
              })}
            </details>
          )}
        </div>
      )}
    </div>
  );
}

function TypeTab({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '8px 16px',
        border: 'none',
        borderRadius: 20,
        cursor: 'pointer',
        fontWeight: 600,
        whiteSpace: 'nowrap',
        fontSize: 13,
        background: active ? 'var(--color-primary)' : 'var(--color-surface-raised)',
        color: active ? '#fff' : 'var(--color-text)',
        border: '1px solid var(--color-border)',
      }}
    >
      {label}
    </button>
  );
}

function StatusPill({ status }: { status: DepartureStatus }) {
  const styles: Record<DepartureStatus, { bg: string; text: string; label: string }> = {
    on_time: { bg: 'rgba(0,166,90,0.15)', text: '#00A65A', label: 'On time' },
    delayed: { bg: 'rgba(255,171,0,0.15)', text: '#FFAB00', label: 'Delayed' },
    cancelled: { bg: 'rgba(222,53,11,0.15)', text: '#DE350B', label: 'Cancelled' },
  };
  const current = styles[status];
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 700,
        backgroundColor: current.bg,
        color: current.text,
        padding: '4px 10px',
        borderRadius: 12,
        whiteSpace: 'nowrap',
      }}
    >
      {current.label}
    </span>
  );
}