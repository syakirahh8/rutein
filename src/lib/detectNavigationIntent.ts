export interface DetectedNavigationIntent {
  isRouteRequest: boolean;
  destinationQuery: string | null;
}

/**
 * Extracts a destination phrase from a natural-language message, e.g.
 * "how do I get to Pasar Rebo?" -> "Pasar Rebo".
 *
 * This is intentionally simple pattern matching, not NLU — it's meant to
 * catch the common phrasings from the ticket ("How do I get to X",
 * "What should I take to X", "Go to X"). Ambiguous or unmatched phrasing
 * falls through to `isRouteRequest: false` and the existing passive
 * context still applies (nearby places/transport, current route if one
 * was manually set on the map page, etc.) — this only adds a new
 * capability, it doesn't remove the old one.
 */
const ROUTE_TRIGGER_PATTERNS: RegExp[] = [
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

  for (const pattern of ROUTE_TRIGGER_PATTERNS) {
    const match = trimmed.match(pattern);

    if (match?.[1]) {
      const destinationQuery = match[1].replace(/[?.!]+$/, '').trim();

      if (destinationQuery.length > 1) {
        return { isRouteRequest: true, destinationQuery };
      }
    }
  }

  return { isRouteRequest: false, destinationQuery: null };
}