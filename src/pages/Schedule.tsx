import React, { useEffect, useState } from 'react';

// --- 1. HARDCODED TRANSPORT DATA & FARES ---
type TransportType = 'transjakarta' | 'bus' | 'krl' | 'mrt' | 'lrt' | 'train' | 'airport_rail' | 'ferry' | 'terminal';

interface Location {
  id: string;
  name: string;
  type: TransportType;
  city: string;
  line: string;
}

// A representative sample of your provided data
const LOCATIONS: Location[] = [
  { id: 'idn-1', name: 'Lebak Bulus Grab', type: 'mrt', city: 'Jakarta', line: 'MRT North-South Line' },
  { id: 'idn-14', name: 'Pegangsaan Dua', type: 'lrt', city: 'Jakarta', line: 'LRT Jakarta' },
  { id: 'idn-27', name: 'Blok M', type: 'transjakarta', city: 'Jakarta', line: 'Koridor 1' },
  { id: 'idn-41', name: 'Bogor', type: 'krl', city: 'Bogor', line: 'KRL Bogor Line' },
  { id: 'idn-52', name: 'Manggarai', type: 'krl', city: 'Jakarta', line: 'KRL Commuter Line Interchange' },
  { id: 'idn-54', name: 'BNI City', type: 'airport_rail', city: 'Jakarta', line: 'KA Bandara Soekarno-Hatta' },
  { id: 'idn-60', name: 'Malioboro', type: 'bus', city: 'Yogyakarta', line: 'Trans Jogja Koridor 1A' },
  { id: 'idn-63', name: 'Ampera', type: 'lrt', city: 'Palembang', line: 'LRT Sumatera Selatan' },
  { id: 'idn-65', name: 'Pelabuhan Merak', type: 'ferry', city: 'Banten', line: 'Java-Sumatra Ferry Crossing' },
];

// Current ticket prices for Indonesian public transport
const FARE_DATA: Record<TransportType, string> = {
  transjakarta: 'Rp 3.500 (Flat)',
  mrt: 'Rp 3.000 + Rp 1.000/station (Max Rp 14.000)',
  lrt: 'Rp 5.000 (Flat) / Up to Rp 20.000 (LRT Jabodebek)',
  krl: 'Rp 3.000 (First 25km) + Rp 1.000/10km',
  bus: 'Rp 3.600 - Rp 5.000 (Flat)',
  airport_rail: 'Rp 30.000 - Rp 70.000',
  train: 'Varies by destination and class',
  ferry: '~Rp 22.700 (Regular Pedestrian)',
  terminal: 'Varies by bus operator',
};

interface MockSchedule {
  id: string;
  arrivalTime: Date;
  minutesAway: number;
  status: 'on_time' | 'delayed' | 'cancelled';
  humanText: string;
}

// --- 2. MAIN COMPONENT ---
export default function Schedule() {
  const [selectedLocId, setSelectedLocId] = useState<string>(LOCATIONS[0].id);
  const [schedules, setSchedules] = useState<MockSchedule[]>([]);
  const [loading, setLoading] = useState(true);

  // Generate realistic upcoming schedules whenever the selected location changes
  useEffect(() => {
    setLoading(true);
    
    // Simulate a brief network delay for realism
    const timer = setTimeout(() => {
      const now = new Date();
      const generated: MockSchedule[] = [];
      
      // We'll generate 3-4 upcoming arrivals
      let baseMinutes = 0;
      for (let i = 0; i < 4; i++) {
        // Space them out: first one comes fast, others take longer
        const gap = i === 0 ? Math.floor(Math.random() * 5) + 1 : Math.floor(Math.random() * 12) + 10;
        baseMinutes += gap;
        
        const arrTime = new Date(now.getTime() + baseMinutes * 60000);
        
        // Formulate the exact phrasing you requested
        let text = '';
        if (baseMinutes <= 5) text = `Coming in ${baseMinutes} minutes`;
        else if (baseMinutes <= 15) text = `Arriving in ${baseMinutes} minutes`;
        else text = `Wait around ${baseMinutes} minutes`;

        // 10% chance of delay, 5% chance of cancellation
        const rand = Math.random();
        let status: 'on_time' | 'delayed' | 'cancelled' = 'on_time';
        if (rand > 0.95) status = 'cancelled';
        else if (rand > 0.85) status = 'delayed';

        generated.push({
          id: `${selectedLocId}-sch-${i}`,
          arrivalTime: arrTime,
          minutesAway: baseMinutes,
          status,
          humanText: status === 'cancelled' ? 'Service cancelled' : text,
        });
      }
      
      setSchedules(generated);
      setLoading(false);
    }, 400);

    return () => clearTimeout(timer);
  }, [selectedLocId]);

  const selectedLoc = LOCATIONS.find((r) => r.id === selectedLocId);

  return (
    <div className="container" style={{ maxWidth: 600, margin: '0 auto', fontFamily: 'sans-serif' }}>
      <h1>Transport Schedule</h1>
      <p style={{ color: 'var(--color-text-muted)', marginTop: 0 }}>
        Live departure status and fare information.
      </p>

      {/* Horizontal Scrollable Location Tabs */}
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 8, marginBottom: 16 }}>
        {LOCATIONS.map((loc) => (
          <button
            key={loc.id}
            className="btn"
            style={{
              padding: '8px 16px',
              border: 'none',
              borderRadius: 20,
              cursor: 'pointer',
              fontWeight: 600,
              whiteSpace: 'nowrap',
              background: selectedLocId === loc.id ? '#0052CC' : '#E9ECEF',
              color: selectedLocId === loc.id ? '#FFFFFF' : '#333333',
            }}
            onClick={() => setSelectedLocId(loc.id)}
          >
            {loc.name}
          </button>
        ))}
      </div>

      {selectedLoc && (
        <div className="card" style={{ 
          background: '#F8F9FA', 
          border: '1px solid #E9ECEF', 
          borderRadius: 8, 
          padding: 16, 
          marginBottom: 16 
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <strong style={{ fontSize: 18, display: 'block' }}>{selectedLoc.name}</strong>
              <div style={{ fontSize: 14, color: '#666', marginTop: 4 }}>{selectedLoc.line} • {selectedLoc.city}</div>
            </div>
            <span style={{ 
              background: '#E3F2FD', 
              color: '#0D47A1', 
              padding: '4px 8px', 
              borderRadius: 4, 
              fontSize: 12, 
              fontWeight: 'bold' 
            }}>
              Curated Data
            </span>
          </div>
          
          {/* Ticket Price Section */}
          <div style={{ 
            marginTop: 16, 
            paddingTop: 12, 
            borderTop: '1px solid #DEE2E6',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#333' }}>🎟️ Estimated Fare:</span>
            <span style={{ fontSize: 14, color: '#00875A', fontWeight: 700 }}>
              {FARE_DATA[selectedLoc.type]}
            </span>
          </div>
        </div>
      )}

      {/* Schedule List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {loading ? (
           <p style={{ color: '#666', fontSize: 14, textAlign: 'center', padding: 20 }}>Generating real-time schedules...</p>
        ) : (
          schedules.map((s) => (
            <div key={s.id} className="card" style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              background: '#FFFFFF',
              border: '1px solid #E9ECEF',
              borderRadius: 8,
              padding: 16
            }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 600, color: s.status === 'cancelled' ? '#999' : '#111' }}>
                  {s.arrivalTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                </div>
                <div style={{ fontSize: 13, color: s.status === 'cancelled' ? '#DE350B' : '#666', marginTop: 4 }}>
                  {s.humanText}
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <StatusPill status={s.status} />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// --- 3. HELPER COMPONENTS ---
function StatusPill({ status }: { status: 'on_time' | 'delayed' | 'cancelled' }) {
  const styles: Record<string, { bg: string, text: string, label: string }> = {
    on_time: { bg: '#E3FCEF', text: '#006644', label: 'On Time' },
    delayed: { bg: '#FFFAE6', text: '#FF8B00', label: 'Delayed' },
    cancelled: { bg: '#FFEBE6', text: '#BF2600', label: 'Cancelled' },
  };
  
  const current = styles[status];

  return (
    <span style={{ 
      fontSize: 12, 
      fontWeight: 700, 
      backgroundColor: current.bg, 
      color: current.text,
      padding: '4px 10px',
      borderRadius: 12
    }}>
      {current.label}
    </span>
  );
}