/**
 * Dataset terstruktur mengenai gangguan lalu lintas jalan di Indonesia —
 * digunakan oleh halaman Peta (Map) dan Peringatan Lalu Lintas (Alerts)
 * untuk menampilkan banner peringatan, sorotan rute, dan penanda pada peta.
 *
 * Scenarios ini merefleksikan situasi nyata jalan raya Indonesia
 * berdasarkan pola pelaporan Korlantas Polri, Jasa Marga, dan TMC Polda Metro.
 */

export type RoadType = 
  | 'toll_road'       // Jalan Tol (Tol Dalam Kota, Cipali, MBZ, Jagorawi)
  | 'national_road'   // Jalan Nasional (Jalur Pantura, Lintas Sumatera)
  | 'provincial_road' // Jalan Provinsi
  | 'city_street'     // Jalan Perkotaan (Jl. Sudirman, Jl. Daan Mogot)
  | 'other';

export type DisruptionSeverity = 
  | 'low'      // Gangguan ringan, perlambatan minor
  | 'medium'   // Kepadatan terasa, ada rekayasa lajur/contraflow
  | 'high'     // Kemacetan parah, penyempitan lajur signifikan, waktu tempuh bertambah
  | 'critical'; // Penutupan jalan total, banjir tak bisa dilalui, evakuasi kecelakaan besar

export type DisruptionCause = 
  | 'weather'      // Cuaca buruk, banjir, genangan air, pohon tumbang
  | 'maintenance'  // Pekerjaan perbaikan jalan, pengecoran, perbaikan jembatan
  | 'traffic'      // Lonjakan volume kendaraan tinggi (jam sibuk, libur panjang)
  | 'event'        // Aksi unjuk rasa, pawai, maraton, pengawalan VIP
  | 'accident'     // Kecelakaan, kendaraan mogok/terguling
  | 'policy'       // Rekayasa lalu lintas (Contraflow, One Way, Ganjil-Genap)
  | 'other';

export interface IndonesiaRoadDisruption {
  id: string;
  title: string;
  description: string;
  cause: DisruptionCause;
  severity: DisruptionSeverity;
  roadType: RoadType;
  /** Nama jalan atau nomor KM yang terdampak */
  affectedRoads: string[];
  /** Titik koordinat episentrum insiden */
  latitude?: number;
  longitude?: number;
  isActive: boolean;
  reportedAt: string; // ISO-8601 string
}

export const DISRUPTION_SEVERITY_LABELS: Record<DisruptionSeverity, string> = {
  low: 'Rendah',
  medium: 'Sedang',
  high: 'Tinggi',
  critical: 'Kritis',
};

export const DISRUPTION_CAUSE_LABELS: Record<DisruptionCause, string> = {
  weather: 'Cuaca & Banjir',
  maintenance: 'Pemeliharaan Jalan',
  traffic: 'Kepadatan Arus',
  event: 'Kegiatan Publik / Aksi',
  accident: 'Kecelakaan Lalu Lintas',
  policy: 'Rekayasa Lalu Lintas',
  other: 'Lainnya',
};

export const ROAD_TYPE_LABELS: Record<RoadType, string> = {
  toll_road: 'Jalan Tol',
  national_road: 'Jalan Nasional',
  provincial_road: 'Jalan Provinsi',
  city_street: 'Jalan Perkotaan',
  other: 'Jalan Umum',
};

function recentIso(minutesAgo: number): string {
  const d = new Date(Date.now() - minutesAgo * 60 * 1000);
  return d.toISOString();
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
  minutesAgo: number,
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
    reportedAt: recentIso(minutesAgo), 
    latitude, 
    longitude 
  };
}

export const INDONESIA_ROAD_DISRUPTIONS: IndonesiaRoadDisruption[] = [
  // ------------------------------------------------------------
  // 1. Pemeliharaan Jalan Tol - Jakarta-Tangerang
  // ------------------------------------------------------------
  roadAlert(
    'Rekonstruksi Perkerasan Jalan Tol Jakarta-Tangerang',
    'Pekerjaan rekonstruksi perkerasan beton di lajur 1 dan bahu luar. Terjadi penyempitan lajur dan antrean kendaraan dari Kebon Jeruk hingga Karang Tengah pada jam sibuk.',
    'maintenance',
    'high',
    'toll_road',
    ['Tol Jakarta-Tangerang KM 03 - KM 09'],
    true,
    35, // 35 menit lalu
    -6.1925, 
    106.7441
  ),

  // ------------------------------------------------------------
  // 2. Cuaca / Genangan Banjir - Jalan Perkotaan
  // ------------------------------------------------------------
  roadAlert(
    'Genangan Air di Simpang Jalan Daan Mogot',
    'Hujan intensitas tinggi menyebabkan genangan air setinggi 30-40 cm di sekitar simpang Rawa Buaya. Ruas jalan tidak disarankan bagi sepeda motor dan sedan. Pengendara dialihkan melintasi Tol JORR W1.',
    'weather',
    'critical',
    'city_street',
    ['Jl. Daan Mogot', 'Simpang Cengkareng / Rawa Buaya'],
    true,
    70, // 1 jam 10 menit lalu
    -6.1531, 
    106.7350
  ),

  // ------------------------------------------------------------
  // 3. Lonjakan Volume Kendaraan - Tol Layang MBZ
  // ------------------------------------------------------------
  roadAlert(
    'Kepadatan Volume Lalu Lintas: Tol Layang MBZ',
    'Volume kendaraan menuju arah Cikampek dan Bandung meningkat signifikan. Terpantau antrean kendaraan dan laju tersendat (kecepatan rata-rata 15-20 km/jam). Diimbau memilih jalur bawah Tol Jakarta-Cikampek.',
    'traffic',
    'high',
    'toll_road',
    ['Jalan Layang Sheikh Mohamed Bin Zayed (MBZ)'],
    true,
    120, // 2 jam lalu
    -6.2625, 
    107.0345
  ),

  // ------------------------------------------------------------
  // 4. Aksi Publik / Penutupan Jalan - Jakarta Pusat
  // ------------------------------------------------------------
  roadAlert(
    'Pengalihan Arus Lalu Lintas Sekitar Patung Kuda / Monas',
    'Penutupan jalan sementara diberlakukan di seputar Bundaran Patung Kuda Arjuna Wijaya karena kegiatan penyampaian pendapat. Jl. Medan Merdeka Barat steril dari kendaraan umum dan dialihkan ke Jl. Budi Kemuliaan.',
    'event',
    'high',
    'city_street',
    ['Jl. Medan Merdeka Barat', 'Kawasan Patung Kuda Monas'],
    true,
    180, // 3 jam lalu
    -6.1818, 
    106.8220
  ),

  // ------------------------------------------------------------
  // 5. Rekayasa Lalu Lintas - Contraflow Tol Jagorawi
  // ------------------------------------------------------------
  roadAlert(
    'Pemberlakuan Sistem Contraflow: Tol Jagorawi',
    'Guna mengurai kepadatan arus komuter keluar Jakarta pada sore hari, lajur contraflow diberlakukan mulai KM 17 (Cimanggis) hingga KM 28 (Ciawi). Tetap patuhi rambu dan arahan petugas.',
    'policy',
    'medium',
    'toll_road',
    ['Tol Jagorawi KM 17 - KM 28'],
    true,
    210, // 3.5 jam lalu
    -6.4250, 
    106.8741
  ),

  // ------------------------------------------------------------
  // 6. Kecelakaan Lalu Lintas - Tol Cipularang
  // ------------------------------------------------------------
  roadAlert(
    'Penanganan Truk Terguling di Tol Cipularang KM 92',
    'Evakuasi kendaraan logistik terguling di KM 92 arah Jakarta telah berhasil diselesaikan oleh petugas gabungan Jasa Marga dan PJR. Seluruh lajur telah kembali dibuka normal.',
    'accident',
    'critical',
    'toll_road',
    ['Tol Cipularang KM 92'],
    false, // Status: Selesai
    420, // 7 jam lalu
    -6.5891, 
    107.4111
  )
];

/** Lookup warna status keparahan gangguan */
export const SEVERITY_COLORS: Record<DisruptionSeverity, string> = {
  low: '#F59E0B',      // Amber
  medium: '#F97316',   // Orange
  high: '#EF4444',     // Red
  critical: '#B91C1C'  // Deep Crimson Red
};