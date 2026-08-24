import { getActiveDisruptions, subscribeToDisruptions } from './transportService';
import type { Disruption } from '@/types/database.types';

/**
 * Dedicated disruption-facing service. Currently delegates to
 * transportService's Supabase queries, but kept as its own module per the
 * requested service architecture so disruption-specific logic (e.g. future
 * push-notification triggers, severity-based filtering) has a clear home
 * without touching generic transit queries.
 */

export async function getDisruptions(): Promise<Disruption[]> {
  return getActiveDisruptions();
}

export function watchDisruptions(onChange: (disruption: Disruption) => void): () => void {
  return subscribeToDisruptions(onChange);
}

export function severityWeight(severity: Disruption['severity']): number {
  switch (severity) {
    case 'critical':
      return 4;
    case 'high':
      return 3;
    case 'moderate':
      return 2;
    case 'low':
    default:
      return 1;
  }
}

export function sortBySeverity(disruptions: Disruption[]): Disruption[] {
  return [...disruptions].sort((a, b) => severityWeight(b.severity) - severityWeight(a.severity));
}
