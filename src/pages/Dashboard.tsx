import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import PlaceSearchInput from '@/components/PlaceSearchInput';
import { listRecentDestinations, listSavedPlaces, addRecentDestination } from '@/services/savedPlacesService';
import { getActiveDisruptions } from '@/services/transportService';
import type { SavedPlace, RecentDestination, Disruption } from '@/types/database.types';
import type { PlaceResult } from '@/types/domain.types';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [savedPlaces, setSavedPlaces] = useState<SavedPlace[]>([]);
  const [recentDestinations, setRecentDestinations] = useState<RecentDestination[]>([]);
  const [disruptions, setDisruptions] = useState<Disruption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let mounted = true;
    (async () => {
      try {
        const [places, recents, activeDisruptions] = await Promise.all([
          listSavedPlaces(user.id),
          listRecentDestinations(user.id, 4),
          getActiveDisruptions(),
        ]);
        if (!mounted) return;
        setSavedPlaces(places);
        setRecentDestinations(recents);
        setDisruptions(activeDisruptions.slice(0, 3));
      } catch (err) {
        if (mounted) setError(err instanceof Error ? err.message : 'Failed to load dashboard data.');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [user]);

  async function handleDestinationSelect(place: PlaceResult) {
    if (user) {
      await addRecentDestination(user.id, place.label, place.lat, place.lng, place.address).catch(() => {});
    }
    navigate('/routes', { state: { destination: place } });
  }

  return (
    <div className="container">
      <h1>Where are we headed?</h1>
      <p style={{ color: 'var(--color-text-muted)', marginTop: 0 }}>
        Search a destination, or pick up where you left off.
      </p>

      <div className="card" style={{ marginBottom: 24 }}>
        <label className="label">Search destination</label>
        <PlaceSearchInput placeholder="Where do you want to go?" onSelect={handleDestinationSelect} />
      </div>

      <div style={quickGrid}>
        <QuickAction label="Route Comparison" icon="⇄" onClick={() => navigate('/routes')} />
        <QuickAction label="Budget Planner" icon="฿" onClick={() => navigate('/budget')} />
        <QuickAction label="Live Map" icon="⌖" onClick={() => navigate('/map')} />
        <QuickAction label="Confused Mode" icon="?" onClick={() => navigate('/confused')} />
      </div>

      {error && <p style={{ color: 'var(--color-danger)' }}>{error}</p>}

      {disruptions.length > 0 && (
        <Section title="Disruption alerts" action={{ label: 'View all', onClick: () => navigate('/disruptions') }}>
          {disruptions.map((d) => (
            <div key={d.id} className="card" style={{ marginBottom: 10, borderColor: severityColor(d.severity) }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                <strong style={{ fontSize: 14 }}>{d.title}</strong>
                {d.is_fallback && <span className="badge badge-fallback">Demo data</span>}
              </div>
              <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--color-text-muted)' }}>{d.description}</p>
            </div>
          ))}
        </Section>
      )}

      <Section title="Recent searches">
        {loading && <p style={{ color: 'var(--color-text-muted)' }}>Loading…</p>}
        {!loading && recentDestinations.length === 0 && (
          <p style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>No searches yet — try the box above.</p>
        )}
        <div style={chipRow}>
          {recentDestinations.map((r) => (
            <button
              key={r.id}
              className="btn btn-outline"
              onClick={() =>
                handleDestinationSelect({ lat: r.latitude, lng: r.longitude, label: r.label, address: r.address ?? r.label })
              }
            >
              {r.label}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Saved places" action={{ label: 'Manage', onClick: () => navigate('/places') }}>
        {!loading && savedPlaces.length === 0 && (
          <p style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>
            No saved places yet. Add Home or School to jump straight into route planning.
          </p>
        )}
        <div style={chipRow}>
          {savedPlaces.map((p) => (
            <button
              key={p.id}
              className="btn btn-outline"
              onClick={() =>
                handleDestinationSelect({ lat: p.latitude, lng: p.longitude, label: p.name, address: p.address ?? p.name })
              }
            >
              {categoryIcon(p.category)} {p.name}
            </button>
          ))}
        </div>
      </Section>
    </div>
  );
}

function QuickAction({ label, icon, onClick }: { label: string; icon: string; onClick: () => void }) {
  return (
    <button className="card" style={quickCard} onClick={onClick}>
      <div style={{ fontSize: 26 }}>{icon}</div>
      <div style={{ fontSize: 13, fontWeight: 600, marginTop: 6 }}>{label}</div>
    </button>
  );
}

function Section({ title, action, children }: { title: string; action?: { label: string; onClick: () => void }; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 style={{ margin: 0, fontSize: 16 }}>{title}</h3>
        {action && (
          <button onClick={action.onClick} style={{ background: 'none', border: 'none', color: 'var(--color-primary)', fontSize: 13, fontWeight: 600 }}>
            {action.label}
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

function categoryIcon(category: string) {
  switch (category) {
    case 'home': return '🏠';
    case 'school': return '🎓';
    case 'workplace': return '💼';
    default: return '📍';
  }
}

function severityColor(severity: string) {
  switch (severity) {
    case 'critical': return 'var(--color-danger)';
    case 'high': return 'var(--color-danger)';
    case 'moderate': return 'var(--color-amber)';
    default: return 'var(--color-border)';
  }
}

const quickGrid: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
  gap: 12,
  marginBottom: 28,
};

const quickCard: React.CSSProperties = {
  textAlign: 'center',
  border: '1px solid var(--color-border)',
  background: 'var(--color-surface)',
};

const chipRow: React.CSSProperties = {
  display: 'flex',
  gap: 10,
  flexWrap: 'wrap',
};
