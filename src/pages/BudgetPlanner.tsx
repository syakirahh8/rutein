import React, { useEffect, useState } from 'react';
import PlaceSearchInput from '@/components/PlaceSearchInput';
import { useAuth } from '@/contexts/AuthContext';
import { getCurrentPosition } from '@/services/locationService';
import { reverseGeocode } from '@/services/geocodingService';
import { planAndCompareRoutes } from '@/services/routeService';
import { calculateBudget, createBudgetPlan, listBudgetPlans, deleteBudgetPlan } from '@/services/budgetService';
import type { PlaceResult } from '@/types/domain.types';
import type { RouteComparisonResult } from '@/types/domain.types';
import type { BudgetPlan, RouteType, TravelPeriod } from '@/types/database.types';

export default function BudgetPlanner() {
  const { user } = useAuth();
  const [origin, setOrigin] = useState<PlaceResult | null>(null);
  const [destination, setDestination] = useState<PlaceResult | null>(null);
  const [travelPeriod, setTravelPeriod] = useState<TravelPeriod>('daily');
  const [tripsPerPeriod, setTripsPerPeriod] = useState(2);
  const [routeType, setRouteType] = useState<RouteType>('balanced');
  const [comparison, setComparison] = useState<RouteComparisonResult | null>(null);
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
    routeType === 'cheapest' ? comparison?.cheapest : routeType === 'fastest' ? comparison?.fastest : comparison?.moderate;

  const calc = selectedOption
    ? calculateBudget({ travelPeriod, tripsPerPeriod, routeOption: selectedOption })
    : null;

  async function handleSavePlan() {
    if (!user || !destination || !calc || !selectedOption) return;
    setSaving(true);
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
        preferredRouteType: routeType,
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
    <div className="container">
      <h1>Budget Planner</h1>
      <p style={{ color: 'var(--color-text-muted)', marginTop: 0 }}>
        Plan how much your commute will actually cost — by day, week, or month.
      </p>

      <div className="card" style={{ marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <label className="label">From</label>
          <PlaceSearchInput value={origin?.label} placeholder="Origin" onSelect={setOrigin} />
        </div>
        <div>
          <label className="label">Destination</label>
          <PlaceSearchInput value={destination?.label} placeholder="Where do you travel to regularly?" onSelect={setDestination} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label className="label">Travel period</label>
            <select className="input" value={travelPeriod} onChange={(e) => setTravelPeriod(e.target.value as TravelPeriod)}>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
          <div>
            <label className="label">Trips per {travelPeriod === 'daily' ? 'day' : travelPeriod === 'weekly' ? 'week' : 'month'}</label>
            <input
              className="input"
              type="number"
              min={1}
              value={tripsPerPeriod}
              onChange={(e) => setTripsPerPeriod(Math.max(1, parseInt(e.target.value) || 1))}
            />
          </div>
        </div>

        <div>
          <label className="label">Preferred route type</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {(['cheapest', 'fastest', 'balanced'] as RouteType[]).map((t) => (
              <button
                key={t}
                type="button"
                className="btn"
                style={{
                  flex: 1,
                  background: routeType === t ? 'var(--color-primary)' : 'var(--color-surface-raised)',
                  color: routeType === t ? '#071023' : 'var(--color-text)',
                }}
                onClick={() => setRouteType(t)}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <button className="btn btn-primary" onClick={handleCalculate} disabled={loading}>
          {loading ? 'Calculating…' : 'Calculate cost'}
        </button>
        {error && <p style={{ color: 'var(--color-danger)', margin: 0 }}>{error}</p>}
      </div>

      {calc && (
        <div className="card" style={{ marginBottom: 24 }}>
          <h3 style={{ marginTop: 0 }}>Estimated spending</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, textAlign: 'center' }}>
            <Stat label="Per trip" value={`Rp${calc.costPerTrip.toLocaleString('id-ID')}`} />
            <Stat label="Weekly" value={`Rp${calc.weeklyCost.toLocaleString('id-ID')}`} />
            <Stat label="Monthly" value={`Rp${calc.monthlyCost.toLocaleString('id-ID')}`} />
          </div>
          <button className="btn btn-primary" style={{ width: '100%', marginTop: 16 }} onClick={handleSavePlan} disabled={saving || !user}>
            {saving ? 'Saving…' : 'Save this plan'}
          </button>
        </div>
      )}

      <h3>Saved budget plans</h3>
      {plans.length === 0 && <p style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>No plans saved yet.</p>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {plans.map((p) => (
          <div key={p.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <strong style={{ fontSize: 14 }}>{p.name}</strong>
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                Rp{Number(p.estimated_monthly_cost ?? 0).toLocaleString('id-ID')} / month · {p.preferred_route_type}
              </div>
            </div>
            <button className="btn btn-danger" onClick={() => handleDeletePlan(p.id)}>
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 15, fontWeight: 700 }}>{value}</div>
      <div style={{ fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>{label}</div>
    </div>
  );
}
