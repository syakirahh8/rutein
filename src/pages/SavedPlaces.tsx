import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import PlaceSearchInput from '@/components/PlaceSearchInput';
import { listSavedPlaces, createSavedPlace, updateSavedPlace, deleteSavedPlace } from '@/services/savedPlacesService';
import type { SavedPlace, PlaceCategory } from '@/types/database.types';
import type { PlaceResult } from '@/types/domain.types';

const CATEGORIES: { value: PlaceCategory; label: string; icon: string }[] = [
  { value: 'home', label: 'Home', icon: '🏠' },
  { value: 'school', label: 'School', icon: '🎓' },
  { value: 'workplace', label: 'Workplace', icon: '💼' },
  { value: 'custom', label: 'Custom', icon: '📍' },
];

export default function SavedPlaces() {
  const { user } = useAuth();
  const [places, setPlaces] = useState<SavedPlace[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [category, setCategory] = useState<PlaceCategory>('custom');
  const [notes, setNotes] = useState('');
  const [pickedPlace, setPickedPlace] = useState<PlaceResult | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function refresh() {
    if (!user) return;
    setLoading(true);
    const data = await listSavedPlaces(user.id);
    setPlaces(data);
    setLoading(false);
  }

  async function handleCreate() {
    if (!user || !pickedPlace || !name.trim()) {
      setError('Give it a name and pick a location on the map search.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await createSavedPlace({
        userId: user.id,
        name,
        category,
        address: pickedPlace.address,
        latitude: pickedPlace.lat,
        longitude: pickedPlace.lng,
        notes: notes || undefined,
      });
      setName('');
      setNotes('');
      setPickedPlace(null);
      setCategory('custom');
      setShowForm(false);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save place.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    await deleteSavedPlace(id);
    await refresh();
  }

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Saved places</h1>
        <button className="btn btn-primary" onClick={() => setShowForm((v) => !v)}>
          {showForm ? 'Cancel' : '+ Add place'}
        </button>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label className="label">Name</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Home, Office" />
          </div>
          <div>
            <label className="label">Category</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {CATEGORIES.map((c) => (
                <button
                  key={c.value}
                  className="btn"
                  style={{
                    flex: 1,
                    background: category === c.value ? 'var(--color-primary)' : 'var(--color-surface-raised)',
                    color: category === c.value ? '#071023' : 'var(--color-text)',
                  }}
                  onClick={() => setCategory(c.value)}
                  type="button"
                >
                  {c.icon} {c.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label">Location</label>
            <PlaceSearchInput placeholder="Search the address…" onSelect={setPickedPlace} />
          </div>
          <div>
            <label className="label">Notes (optional)</label>
            <input className="input" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Gate code, entrance to use" />
          </div>
          {error && <p style={{ color: 'var(--color-danger)', margin: 0 }}>{error}</p>}
          <button className="btn btn-primary" onClick={handleCreate} disabled={saving}>
            {saving ? 'Saving…' : 'Save place'}
          </button>
        </div>
      )}

      {loading && <p style={{ color: 'var(--color-text-muted)' }}>Loading…</p>}
      {!loading && places.length === 0 && <p style={{ color: 'var(--color-text-muted)' }}>No saved places yet.</p>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {places.map((p) => (
          <div key={p.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <strong>
                {CATEGORIES.find((c) => c.value === p.category)?.icon} {p.name}
              </strong>
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{p.address}</div>
              {p.notes && <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>📝 {p.notes}</div>}
            </div>
            <button className="btn btn-danger" onClick={() => handleDelete(p.id)}>
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
