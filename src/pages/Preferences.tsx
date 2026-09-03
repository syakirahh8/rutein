import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getPreferences, upsertPreferences } from '@/services/preferencesService';
import { listSavedPlaces } from '@/services/savedPlacesService';
import type { UserPreferences, SavedPlace, TransportMode } from '@/types/database.types';

const MODES: { value: TransportMode; label: string }[] = [
  { value: 'bus', label: 'Bus' },
  { value: 'transjakarta', label: 'TransJakarta' },
  { value: 'mrt', label: 'MRT' },
  { value: 'krl', label: 'KRL' },
  { value: 'lrt', label: 'LRT' },
];

export default function Preferences() {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<Partial<UserPreferences>>({
    preferred_transport: [],
    max_walking_distance_m: 1000,
    prioritize_cheapest: false,
    prioritize_fastest: false,
    avoid_transfers: false,
  });
  const [places, setPlaces] = useState<SavedPlace[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [existing, savedPlaces] = await Promise.all([getPreferences(user.id), listSavedPlaces(user.id)]);
      if (existing) setPrefs(existing);
      setPlaces(savedPlaces);
      setLoading(false);
    })();
  }, [user]);

  function toggleMode(mode: TransportMode) {
    setPrefs((p) => {
      const current = p.preferred_transport ?? [];
      const next = current.includes(mode) ? current.filter((m) => m !== mode) : [...current, mode];
      return { ...p, preferred_transport: next };
    });
  }

  async function handleSave() {
    if (!user) return;
    setSaving(true);
    setSaved(false);
    try {
      await upsertPreferences(user.id, prefs);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="container" style={{ paddingTop: 36 }}><p style={{ color: 'var(--color-text-muted)' }}>Loading…</p></div>;

  return (
    <div className="container" style={{ paddingTop: 28, paddingBottom: 80 }}>
      <h1 style={{ fontSize: 'clamp(26px, 4vw, 34px)', marginBottom: 6 }}>Travel preferences</h1>
      <p style={{ color: 'var(--color-text-muted)', marginTop: 0, marginBottom: 24, fontSize: 14 }}>
        These settings customize and influence how route alternatives are ranked for you.
      </p>

      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 20, background: '#FFFFFF', borderRadius: 16, padding: 24 }}>
        <div>
          <label className="label">Preferred transportation modes</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {MODES.map((m) => (
              <button
                key={m.value}
                className="btn"
                style={{
                  background: prefs.preferred_transport?.includes(m.value) ? 'var(--color-primary)' : '#FFFFFF',
                  color: prefs.preferred_transport?.includes(m.value) ? '#FFFFFF' : 'var(--color-text)',
                  border: '1.5px solid',
                  borderColor: prefs.preferred_transport?.includes(m.value) ? 'var(--color-primary)' : 'var(--color-border)',
                  borderRadius: 10,
                  fontWeight: 600,
                  padding: '8px 16px',
                }}
                onClick={() => toggleMode(m.value)}
                type="button"
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="label">Maximum walking distance ({prefs.max_walking_distance_m ?? 1000}m)</label>
          <input
            type="range"
            min={200}
            max={2500}
            step={100}
            value={prefs.max_walking_distance_m ?? 1000}
            onChange={(e) => setPrefs((p) => ({ ...p, max_walking_distance_m: parseInt(e.target.value) }))}
            style={{ width: '100%', accentColor: 'var(--color-primary)' }}
          />
        </div>

        <ToggleRow
          label="Prioritize cheapest routes"
          checked={!!prefs.prioritize_cheapest}
          onChange={(v) => setPrefs((p) => ({ ...p, prioritize_cheapest: v }))}
        />
        <ToggleRow
          label="Prioritize fastest routes"
          checked={!!prefs.prioritize_fastest}
          onChange={(v) => setPrefs((p) => ({ ...p, prioritize_fastest: v }))}
        />
        <ToggleRow
          label="Avoid excessive transfers"
          checked={!!prefs.avoid_transfers}
          onChange={(v) => setPrefs((p) => ({ ...p, avoid_transfers: v }))}
        />

        <div>
          <label className="label">Default home location</label>
          <select
            className="input"
            value={prefs.default_home_place_id ?? ''}
            onChange={(e) => setPrefs((p) => ({ ...p, default_home_place_id: e.target.value || null }))}
          >
            <option value="">None</option>
            {places.map((pl) => (
              <option key={pl.id} value={pl.id}>{pl.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">Default work/school location</label>
          <select
            className="input"
            value={prefs.default_work_place_id ?? ''}
            onChange={(e) => setPrefs((p) => ({ ...p, default_work_place_id: e.target.value || null }))}
          >
            <option value="">None</option>
            {places.map((pl) => (
              <option key={pl.id} value={pl.id}>{pl.name}</option>
            ))}
          </select>
        </div>

        <button className="btn btn-primary" onClick={handleSave} disabled={saving} style={{ padding: '12px', borderRadius: 10, marginTop: 6 }}>
          {saving ? 'Saving…' : saved ? 'Saved ✓' : 'Save preferences'}
        </button>
      </div>
    </div>
  );
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', padding: '6px 0', borderBottom: '1px solid #F3E7DC' }}>
      <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text)' }}>{label}</span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} style={{ width: 18, height: 18, accentColor: 'var(--color-primary)' }} />
    </label>
  );
}
