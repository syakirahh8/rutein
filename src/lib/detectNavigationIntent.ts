export interface DetectedNavigationIntent {
  isRouteRequest: boolean;
  destinationQuery: string | null;
}

/**
 * Extracts a destination phrase from natural language messages in both
 * Indonesian and English. (e.g. "mau ke South Quarter" -> "South Quarter",
 * "naik apa ke Lotte Mart Fatmawati" -> "Lotte Mart Fatmawati", "South Quarter deh" -> "South Quarter").
 */
const ROUTE_TRIGGER_PATTERNS: RegExp[] = [
  // Indonesian patterns
  /(?:mau|ingin|rute|cara|bagaimana cara|naik apa|naik apa ke|arah)\s+(?:ke|menuju)\s+(.+)/i,
  /(?:mau|ingin|rute|cara|naik apa)\s+(.+)/i,
  /(?:ke|menuju)\s+(.+)/i,
  /(.+)\s+(?:deh|dong|ya|aja|pas)/i,

  // English patterns
  /how (?:do|can) i (?:get|reach) to\s+(.+)/i,
  /how (?:do|can) i (?:get|reach)\s+(.+)/i,
  /get me to\s+(.+)/i,
  /take me to\s+(.+)/i,
  /route to\s+(.+)/i,
  /directions to\s+(.+)/i,
  /way to\s+(.+)/i,
  /what (?:transport|transportation|should i take).*(?:to|towards)\s+(.+)/i,
  /which (?:transport|transportation).*(?:to|towards)\s+(.+)/i,
  /go to\s+(.+)/i,
];

export function detectNavigationIntent(text: string): DetectedNavigationIntent {
  const trimmed = text.trim();
  if (!trimmed) return { isRouteRequest: false, destinationQuery: null };

  for (const pattern of ROUTE_TRIGGER_PATTERNS) {
    const match = trimmed.match(pattern);

    if (match?.[1]) {
      const destinationQuery = match[1].replace(/[?.!]+$/, '').trim();

      if (destinationQuery.length > 1) {
        return { isRouteRequest: true, destinationQuery };
      }
    }
  }

  // Fallback: If user inputs a direct location query like "South Quarter" or "Lotte Mart Fatmawati"
  // (2 words or more, or noun phrase), treat it as a direct route request!
  if (trimmed.length >= 3 && !trimmed.endsWith('?')) {
    return { isRouteRequest: true, destinationQuery: trimmed };
  }

  return { isRouteRequest: false, destinationQuery: null };
}