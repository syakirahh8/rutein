// supabase/functions/ors-proxy/index.ts
// Proxies OpenRouteService directions requests so the ORS API key stays
// server-side and the browser never has to deal with ORS's missing CORS
// headers.
//
// Called as: POST /functions/v1/ors-proxy?profile=foot-walking
//            POST /functions/v1/ors-proxy?profile=driving-car
// Body: same ORS request body (e.g. { coordinates: [[lng,lat],[lng,lat]] })
//
// Deliberately does NOT try to forward/parse the incoming request's full
// path — Supabase's edge gateway strips/rewrites path prefixes in ways
// that vary by runtime version, which made pure path-forwarding fragile.
// A profile query param + a fixed ORS path is unambiguous.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const ORS_API_KEY = Deno.env.get("ORS_API_KEY");

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const ALLOWED_PROFILES = new Set(["foot-walking", "driving-car"]);

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  if (!ORS_API_KEY) {
    return new Response(JSON.stringify({ error: "ORS_API_KEY not configured" }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  const url = new URL(req.url);
  const profile = url.searchParams.get("profile");

  if (!profile || !ALLOWED_PROFILES.has(profile)) {
    return new Response(
      JSON.stringify({ error: `Missing or invalid 'profile' query param. Allowed: ${[...ALLOWED_PROFILES].join(", ")}` }),
      { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }

  const targetUrl = `https://api.openrouteservice.org/v2/directions/${profile}/geojson`;
  const body = await req.text();

  console.log("Forwarding to:", targetUrl, "body:", body);

  const orsResponse = await fetch(targetUrl, {
    method: "POST",
    headers: {
      "Authorization": ORS_API_KEY,
      "Content-Type": "application/json",
    },
    body,
  });

  const responseBody = await orsResponse.text();
  console.log("ORS responded:", orsResponse.status, responseBody.slice(0, 300));

  return new Response(responseBody, {
    status: orsResponse.status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
});