import { HEADERS, VEHICLES_URL, parseVehicles, type VehicleEntry } from '@/app/anttra/busroutes/api/Departure/api';

// Proxy for Entur's vehicle positions (their feed has no CORS headers, so browsers can't call it).
// Entur blocks clients that poll more often than every 25 s, so every visitor shares one cached
// upstream call: in memory per server instance, plus a CDN cache via the Cache-Control header.
export const dynamic = 'force-dynamic'; // never pre-render at build time: positions are live

const TTL_MS = 25_000;
let cached: { at: number; vehicles: VehicleEntry[] } | null = null;
let inFlight: Promise<VehicleEntry[]> | null = null;

async function loadVehicles(): Promise<VehicleEntry[]> {
  const res = await fetch(VEHICLES_URL, {
    headers: { 'ET-Client-Name': HEADERS['ET-Client-Name'] },
    cache: 'no-store',
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`Entur ${res.status}`);
  return parseVehicles(await res.text());
}

export async function GET() {
  const age = cached ? Date.now() - cached.at : Infinity;
  if (age >= TTL_MS) {
    // One upstream call at a time, however many visitors arrive together.
    inFlight ??= loadVehicles()
      .then(vehicles => { cached = { at: Date.now(), vehicles }; return vehicles; })
      .finally(() => { inFlight = null; });
    try {
      await inFlight;
    } catch {
      if (!cached) return Response.json({ error: 'Vehicle feed unavailable' }, { status: 502 });
      // Upstream failed: serve the last good positions rather than nothing.
    }
  }
  const maxAge = Math.max(0, Math.ceil((TTL_MS - (Date.now() - cached!.at)) / 1000));
  return Response.json(cached!.vehicles, {
    headers: { 'Cache-Control': `public, s-maxage=${maxAge}, stale-while-revalidate=5` },
  });
}
