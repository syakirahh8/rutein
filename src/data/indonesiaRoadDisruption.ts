/**
 * A structured, client-side dataset of active or historical road disruptions
 * in Indonesia — used by the Map or Traffic Alerts page to render warning
 * banners, route path highlights, or marker badges.
 *
 * PROVENANCE: This static file serves as realistic mock data or fallback seed 
 * data to test the UI for handling road closures, heavy congestion, and 
 * traffic engineering policies (rekayasa lalu lintas). The scenarios reflect 
 * highly typical real-world Indonesian traffic issues based on data from 
 * Jasa Marga, Korlantas Polri, and local transport agencies.
 * * In a fully productionized environment, this data would ideally stream 
 * from live APIs, Waze/Google Maps traffic feeds, or scraped alerts from 
 * @PTJASAMARGA / @TMCPoldaMetro.
 */

export type RoadType = 
  | 'toll_road'       // e.g., Tol Dalam Kota, Tol Cipali, Tol MBZ
  | 'national_road'   // e.g., Jalur Pantura
  | 'provincial_road' // State/Province managed highways
  | 'city_street'     // e.g., Jl. Sudirman, Jl. Daan Mogot
  | 'other';

export type DisruptionSeverity = 
  | 'low'      // Minor slowdowns, normal driving mostly unaffected
  | 'medium'   // Noticeable congestion, contraflow policies active
  | 'high'     // Severe gridlock, single lane closures, high delays
  | 'critical'; // Complete road closure, impassable floods, major accidents

export type DisruptionCause = 
  | 'weather'      // Banjir (floods), landslides, heavy storms
  | 'maintenance'  // Road reconstruction, pothole patching, bridge repairs
  | 'traffic'      // Extreme volume surges (e.g., long weekends, mudik)
  | 'event'        // Demonstrations, marathons, VIP motorcades
  | 'accident'     // Collisions, overturned trucks
  | 'policy'       // One-way, Contraflow, Ganjil-Genap expansions
  | 'other';

export interface IndonesiaRoadDisruption {
  id: string;
  title: string;
  description: string;
  cause: DisruptionCause;
  severity: DisruptionSeverity;
  roadType: RoadType;
  /** Specific road names, toll gates, or km markers impacted */
  affectedRoads: string[];
  /** Approximate geolocation of the incident epicenter (optional) */
  latitude?: number;
  longitude?: number;
  isActive: boolean;
  reportedAt: string; // ISO-8601 string
}

let _disSeq = 0;
function roadAlert(
  title: string,
  description: string,
  cause: DisruptionCause,
  severity: DisruptionSeverity,
  roadType: RoadType,
  affectedRoads: string[],
  isActive: boolean,
  reportedAt: string,
  latitude?: number,
  longitude?: number
): IndonesiaRoadDisruption {
  _disSeq += 1;
  return { 
    id: `road-alert-idn-${_disSeq}`, 
    title, 
    description, 
    cause, 
    severity, 
    roadType,
    affectedRoads, 
    isActive, 
    reportedAt, 
    latitude, 
    longitude 
  };
}

export const INDONESIA_ROAD_DISRUPTIONS: IndonesiaRoadDisruption[] = [
  // ------------------------------------------------------------
  // Toll Road Maintenance - Jakarta-Tangerang
  // ------------------------------------------------------------
  roadAlert(
    'Routine Reconstruction on Jakarta-Tangerang Toll',
    'Heavy equipment deployed for concrete reconstruction in the left lane. Expect severe bottlenecking between Kebon Jeruk and Karang Tengah during peak hours.',
    'maintenance',
    'high',
    'toll_road',
    ['Tol Jakarta-Tangerang KM 03 - KM 09'],
    true,
    '2026-08-27T06:00:00+07:00',
    -6.1925, 
    106.7441
  ),

  // ------------------------------------------------------------
  // Weather / Flooding - City Streets
  // ------------------------------------------------------------
  roadAlert(
    'Impassable Flooding on Jalan Daan Mogot',
    'Intense overnight rainfall has caused 40-50cm of flooding near Rawa Buaya. The road is currently impassable for sedans and motorcycles. Use Tol JORR as an alternative.',
    'weather',
    'critical',
    'city_street',
    ['Jl. Daan Mogot', 'Simpang Cengkareng'],
    true,
    '2026-08-27T04:30:00+07:00',
    -6.1531, 
    106.7350
  ),

  // ------------------------------------------------------------
  // Traffic Volume Surge - MBZ Elevated Toll Road
  // ------------------------------------------------------------
  roadAlert(
    'Long Weekend Surge: MBZ Elevated Toll',
    'Traffic volume heading towards Cikampek/Bandung has surged by 75%. Vehicles are experiencing stop-and-go conditions. Jasa Marga advises taking the lower lane (Tol Jakarta-Cikampek) if possible.',
    'traffic',
    'high',
    'toll_road',
    ['Jalan Layang MBZ (Mohammed Bin Zayed)'],
    true,
    '2026-08-27T15:15:00+07:00',
    -6.2625, 
    107.0345
  ),

  // ------------------------------------------------------------
  // Event / Demonstration - Central Jakarta
  // ------------------------------------------------------------
  roadAlert(
    'Traffic Diversion around Patung Kuda / Monas',
    'Road closures are in effect around the Arjuna Wijaya Chariot statue due to a large public demonstration. Jl. Medan Merdeka Barat is closed to all civilian traffic.',
    'event',
    'high',
    'city_street',
    ['Jl. Medan Merdeka Barat', 'Jl. MH Thamrin (Northbound)'],
    true,
    '2026-08-27T10:00:00+07:00',
    -6.1818, 
    106.8220
  ),

  // ------------------------------------------------------------
  // Traffic Engineering Policy - Contraflow
  // ------------------------------------------------------------
  roadAlert(
    'Contraflow Active: Tol Jagorawi',
    'To alleviate afternoon commuter traffic heading out of Jakarta, a single-lane contraflow is active from KM 17 (Cimanggis) to KM 28 (Ciawi).',
    'policy',
    'medium',
    'toll_road',
    ['Tol Jagorawi KM 17 - KM 28'],
    true,
    '2026-08-27T16:00:00+07:00',
    -6.4250, 
    106.8741
  ),

  // ------------------------------------------------------------
  // Major Accident - Tol Cipularang
  // ------------------------------------------------------------
  roadAlert(
    'Overturned Truck on Tol Cipularang KM 92',
    'A logistics truck has overturned at KM 92 (heading towards Jakarta). All right lanes are blocked. Evacuation is underway; expect delays of up to 2 hours.',
    'accident',
    'critical',
    'toll_road',
    ['Tol Cipularang KM 92'],
    false, // Marking as resolved
    '2026-08-26T18:45:00+07:00',
    -6.5891, 
    107.4111
  )
];

/** Lookup used by UI components to style disruption badges/banners appropriately. */
export const SEVERITY_COLORS: Record<DisruptionSeverity, string> = {
  low: '#FBBF24',      // Amber/Yellow
  medium: '#F97316',   // Orange
  high: '#EF4444',     // Red
  critical: '#7F1D1D'  // Dark Red / Crimson
};