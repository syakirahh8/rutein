import { INDONESIA_TRANSPORT_DATA, IndonesiaTransportLocation } from './indonesiaTransportData';

export interface TransportSchedule {
  id: string;
  locationId: string;
  date: string;       // Format: YYYY-MM-DD
  time: string;       // Format: HH:mm
  lineName: string;
  status: 'on-time' | 'delayed' | 'cancelled';
}

/**
 * Generates a mock schedule for all transportation locations.
 * @param locations The array of transportation locations
 * @param daysToGenerate How many days of schedule to generate (default: 7)
 * @param intervalMinutes The gap between each transport arrival (default: 30 mins)
 */
export function generateSchedulesForDays(
  locations: IndonesiaTransportLocation[],
  daysToGenerate: number = 7,
  intervalMinutes: number = 30
): TransportSchedule[] {
  const schedules: TransportSchedule[] = [];
  
  // Start from today at 00:00
  const startDate = new Date();
  startDate.setHours(0, 0, 0, 0);

  let seq = 1;

  for (let d = 0; d < daysToGenerate; d++) {
    // Calculate the date string (YYYY-MM-DD)
    const currentDate = new Date(startDate.getTime() + d * 24 * 60 * 60 * 1000);
    const dateStr = currentDate.toISOString().split('T')[0];

    for (const loc of locations) {
      // Set different operating hours based on the transport type
      let startHour = 5;  // Default: 05:00
      let endHour = 22;   // Default: 22:00 (10 PM)

      if (loc.type === 'krl' || loc.type === 'train' || loc.type === 'airport_rail') {
        startHour = 4; // Trains usually start earlier
        endHour = 23;  // and end later
      } else if (loc.type === 'ferry') {
        startHour = 0; // Ferries often run 24 hours
        endHour = 23;
      }

      // Loop through the day by the given interval
      for (let h = startHour; h <= endHour; h++) {
        for (let m = 0; m < 60; m += intervalMinutes) {
          // Format time as HH:mm
          const timeStr = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
          
          // Simulate some realistic statuses (85% on time, 10% delayed, 5% cancelled)
          const rand = Math.random();
          let status: 'on-time' | 'delayed' | 'cancelled' = 'on-time';
          if (rand > 0.95) status = 'cancelled';
          else if (rand > 0.85) status = 'delayed';

          schedules.push({
            id: `sch-${seq++}`,
            locationId: loc.id,
            date: dateStr,
            time: timeStr,
            lineName: loc.line || 'Default Route',
            status: status
          });
        }
      }
    }
  }

  return schedules;
}

// Export the generated schedules so your Map or Table component can consume them directly
export const TRANSPORT_SCHEDULES = generateSchedulesForDays(INDONESIA_TRANSPORT_DATA, 7, 30);