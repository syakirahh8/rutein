import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getProfile, updateProfile } from '@/services/preferencesService';
import { listSavedPlaces } from '@/services/savedPlacesService';
import { listBudgetPlans } from '@/services/budgetService';
import type { Profile as ProfileType, SavedPlace, BudgetPlan } from '@/types/database.types';

export default function Profile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<ProfileType | null>(null);
  const [places, setPlaces] = useState<SavedPlace[]>([]);
  const [plans, setPlans] = useState<BudgetPlan[]>([]);
  const [fullName, setFullName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [p, savedPlaces, budgetPlans] = await Promise.all([
        getProfile(user.id),
        listSavedPlaces(user.id),
        listBudgetPlans(user.id),
      ]);
      if (p) {
        setProfile(p);
        setFullName(p.full_name ?? '');
        setAvatarUrl(p.avatar_url ?? '');
      }
      setPlaces(savedPlaces);
      setPlans(budgetPlans);
      setLoading(false);
    })();
  }, [user]);

  async function handleSave() {
    if (!user) return;
    setSaving(true);
    setSaved(false);
    try {
      const updated = await updateProfile(user.id, { full_name: fullName, avatar_url: avatarUrl || null });
      setProfile(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="container"><p style={{ color: 'var(--color-text-muted)' }}>Loading…</p></div>;

  return (
    <div className="container">
      <h1>Profile</h1>

      <div className="card" style={{ marginBottom: 20, display: 'flex', gap: 16, alignItems: 'center' }}>
        <div style={avatarCircle}>
          {avatarUrl ? (
            <img src={avatarUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
          ) : (
            <span style={{ fontSize: 24 }}>{(fullName || profile?.email || '?').charAt(0).toUpperCase()}</span>
          )}
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 16 }}>{fullName || 'Unnamed traveler'}</div>
          <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>{profile?.email}</div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <label className="label">Full name</label>
          <input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </div>
        <div>
          <label className="label">Avatar URL</label>
          <input className="input" value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} placeholder="https://…" />
        </div>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : saved ? 'Saved ✓' : 'Save profile'}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 22, fontWeight: 700 }}>{places.length}</div>
          <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Saved places</div>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 22, fontWeight: 700 }}>{plans.length}</div>
          <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Budget plans</div>
        </div>
      </div>
    </div>
  );
}

const avatarCircle: React.CSSProperties = {
  width: 64,
  height: 64,
  borderRadius: '50%',
  background: 'var(--color-surface-raised)',
  border: '1px solid var(--color-border)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  overflow: 'hidden',
  flexShrink: 0,
};
