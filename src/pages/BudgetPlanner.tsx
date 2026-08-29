import React, { useEffect, useState } from 'react';
import { Wallet, MapPin, Calculator, Trash2, Calendar, Route, Navigation2 } from 'lucide-react';
import PlaceSearchInput from '@/components/PlaceSearchInput';
import { useAuth } from '@/contexts/AuthContext';
import { getCurrentPosition } from '@/services/locationService';
import { reverseGeocode } from '@/services/geocodingService';
import { planAndCompareRoutes } from '@/services/routeService';
import { calculateBudget, createBudgetPlan, listBudgetPlans, deleteBudgetPlan } from '@/services/budgetService';
import type { PlaceResult } from '@/types/domain.types';
import type { LogicalRouteComparisonResult } from '@/services/routeService';
import type { BudgetPlan, RouteType, TravelPeriod } from '@/types/database.types';

type LogicalCategory = 'efficient' | 'cheapest' | 'hurry';

export default function BudgetPlanner() {
  const { user } = useAuth();
  const [origin, setOrigin] = useState<PlaceResult | null>(null);
  const [destination, setDestination] = useState<PlaceResult | null>(null);
  const [travelPeriod, setTravelPeriod] = useState<TravelPeriod>('daily');
  const [tripsPerPeriod, setTripsPerPeriod] = useState(2);
  const [routePref, setRoutePref] = useState<LogicalCategory>('efficient');
  const [comparison, setComparison] = useState<LogicalRouteComparisonResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [plans, setPlans] = useState<BudgetPlan[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getCurrentPosition()
      .then(async (point) => {
        const place = await reverseGeocode(point.lat, point.lng);
        setOrigin(place ?? { ...point, label: 'Current location', address: 'Current location' });
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (user) refreshPlans();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function refreshPlans() {
    if (!user) return;
    const data = await listBudgetPlans(user.id);
    setPlans(data);
  }

  async function handleCalculate() {
    if (!origin || !destination) {
      setError('Choose both an origin and a destination first.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await planAndCompareRoutes(origin, destination);
      setComparison(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not calculate routes.');
    } finally {
      setLoading(false);
    }
  }

  const selectedOption =
    routePref === 'cheapest' ? comparison?.cheapest : routePref === 'efficient' ? comparison?.efficient : comparison?.hurry;

  const calc = selectedOption
    ? calculateBudget({ travelPeriod, tripsPerPeriod, routeOption: selectedOption })
    : null;

  async function handleSavePlan() {
    if (!user || !destination || !calc || !selectedOption) return;
    setSaving(true);
    
    // Map logical categories to DB ENUM (assuming db still uses cheapest/fastest/balanced)
    const dbRouteType: RouteType = routePref === 'efficient' ? 'balanced' : routePref === 'hurry' ? 'fastest' : 'cheapest';

    try {
      await createBudgetPlan({
        userId: user.id,
        name: `${destination.label} (${travelPeriod})`,
        destinationLabel: destination.label,
        destinationLat: destination.lat,
        destinationLng: destination.lng,
        originLabel: origin?.label,
        originLat: origin?.lat,
        originLng: origin?.lng,
        travelPeriod,
        tripsPerPeriod,
        preferredRouteType: dbRouteType,
        calculation: calc,
        selectedRoute: selectedOption,
      });
      await refreshPlans();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save budget plan.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeletePlan(id: string) {
    await deleteBudgetPlan(id);
    await refreshPlans();
  }

  return (
    <div className="container" style={{ paddingBottom: 40 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
        <div style={{ padding: 8, background: '#4F46E5', borderRadius: 12 }}>
          <Wallet size={24} color="#fff" />
        </div>
        <h1 style={{ margin: 0 }}>Budget Planner</h1>
      </div>
      <p style={{ color: 'var(--color-text-muted)', marginTop: 0, marginBottom: 24, fontSize: 14 }}>
        Track your transit spending psychology and set reliable commute budgets.
      </p>

      <div className="card" style={{ marginBottom: 24, display: 'flex', flexDirection: 'column', gap: 16, border: '1px solid #1E293B', background: '#0F172A' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label className="label" style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#94A3B8' }}>
              <Navigation2 size={14} color="#3B82F6" /> From
            </label>
            <PlaceSearchInput value={origin?.label} placeholder="Origin" onSelect={setOrigin} />
          </div>
          <div>
            <label className="label" style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#94A3B8' }}>
              <MapPin size={14} color="#F97316" /> Destination
            </label>
            <PlaceSearchInput value={destination?.label} placeholder="Where do you travel to regularly?" onSelect={setDestination} />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 4 }}>
          <div>
            <label className="label" style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#94A3B8' }}>
              <Calendar size={14} color="#6366F1" /> Travel period
            </label>
            <select className="input" style={{ background: '#1E293B', border: '1px solid #334155', color: '#F8FAFC' }} value={travelPeriod} onChange={(e) => setTravelPeriod(e.target.value as TravelPeriod)}>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
          <div>
            <label className="label" style={{ color: '#94A3B8' }}>Trips per {travelPeriod === 'daily' ? 'day' : travelPeriod === 'weekly' ? 'week' : 'month'}</label>
            <input
              className="input"
              type="number"
              min={1}
              style={{ background: '#1E293B', border: '1px solid #334155', color: '#F8FAFC' }}
              value={tripsPerPeriod}
              onChange={(e) => setTripsPerPeriod(Math.max(1, parseInt(e.target.value) || 1))}
            />
          </div>
        </div>

        <div style={{ marginTop: 4 }}>
          <label className="label" style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#94A3B8' }}>
            <Route size={14} color="#3B82F6" /> Preferred route logic
          </label>
          <div style={{ display: 'flex', gap: 8, background: '#1E293B', padding: 4, borderRadius: 8 }}>
            {(['efficient', 'cheapest', 'hurry'] as LogicalCategory[]).map((t) => {
              const isActive = routePref === t;
              return (
                <button
                  key={t}
                  type="button"
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: 6,
                    border: 'none',
                    fontSize: 13,
                    fontWeight: isActive ? 600 : 500,
                    textTransform: 'capitalize',
                    background: isActive ? '#4F46E5' : 'transparent',
                    color: isActive ? '#FFFFFF' : '#94A3B8',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onClick={() => setRoutePref(t)}
                >
                  {t}
                </button>
              );
            })}
          </div>
        </div>

        <button 
          className="btn" 
          style={{ 
            marginTop: 8, 
            background: 'linear-gradient(135deg, #4F46E5 0%, #3B82F6 100%)', 
            color: '#fff', 
            border: 'none', 
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8
          }} 
          onClick={handleCalculate} 
          disabled={loading}
        >
          {loading ? 'Analyzing Routes…' : <><Calculator size={16} /> Calculate Cost</>}
        </button>
        {error && <p style={{ color: '#EF4444', margin: 0, fontSize: 13 }}>{error}</p>}
      </div>

      {calc && (
        <div className="card" style={{ 
          marginBottom: 32, 
          background: '#0F172A',
          border: '1px solid #334155',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Subtle gradient accent bar at the top */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg, #F97316, #4F46E5, #3B82F6)' }} />
          
          <h3 style={{ marginTop: 8, color: '#F8FAFC' }}>Estimated Projection</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, textAlign: 'center', marginTop: 16 }}>
            <Stat label="Per Trip" value={`Rp ${calc.costPerTrip.toLocaleString('id-ID')}`} accent="#3B82F6" />
            <Stat label="Weekly" value={`Rp ${calc.weeklyCost.toLocaleString('id-ID')}`} accent="#4F46E5" />
            <Stat label="Monthly" value={`Rp ${calc.monthlyCost.toLocaleString('id-ID')}`} accent="#F97316" highlight />
          </div>
          
          <button 
            className="btn" 
            style={{ 
              width: '100%', 
              marginTop: 24, 
              background: '#1E293B', 
              color: '#F8FAFC',
              border: '1px solid #334155',
              fontWeight: 600
            }} 
            onClick={handleSavePlan} 
            disabled={saving || !user}
          >
            {saving ? 'Saving Profile…' : 'Save this budget plan'}
          </button>
        </div>
      )}

      <h3 style={{ color: '#F8FAFC' }}>Saved Portfolios</h3>
      {plans.length === 0 && <p style={{ color: '#94A3B8', fontSize: 14 }}>No budget plans saved yet.</p>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {plans.map((p) => {
          // Reverse map DB enum back to UI labels
          const displayLabel = p.preferred_route_type === 'balanced' ? 'Efficient' : p.preferred_route_type === 'fastest' ? 'Hurry' : 'Cheapest';
          
          return (
            <div key={p.id} className="card" style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              background: '#0F172A',
              border: '1px solid #1E293B'
            }}>
              <div>
                <strong style={{ fontSize: 15, color: '#F8FAFC' }}>{p.name}</strong>
                <div style={{ fontSize: 13, color: '#94A3B8', marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ color: '#F97316', fontWeight: 600 }}>Rp {Number(p.estimated_monthly_cost ?? 0).toLocaleString('id-ID')}</span> 
                  <span>/ mo</span>
                  <span style={{ opacity: 0.5 }}>•</span>
                  <span style={{ textTransform: 'capitalize', color: '#3B82F6' }}>{displayLabel}</span>
                </div>
              </div>
              <button 
                style={{ 
                  background: 'transparent', 
                  border: 'none', 
                  padding: 8, 
                  cursor: 'pointer',
                  color: '#EF4444',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 8
                }} 
                onClick={() => handleDeletePlan(p.id)}
                title="Delete Plan"
              >
                <Trash2 size={18} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Stat({ label, value, highlight = false, accent }: { label: string; value: string, highlight?: boolean, accent: string }) {
  return (
    <div style={{ 
      background: highlight ? '#1E293B' : 'transparent',
      padding: highlight ? '12px 8px' : '12px 8px',
      borderRadius: 8,
      border: highlight ? `1px solid ${accent}40` : '1px solid transparent'
    }}>
      <div style={{ fontSize: highlight ? 18 : 15, fontWeight: 700, color: highlight ? accent : '#F8FAFC' }}>{value}</div>
      <div style={{ fontSize: 11, color: '#94A3B8', textTransform: 'uppercase', marginTop: 4, fontWeight: 600 }}>{label}</div>
    </div>
  );
}