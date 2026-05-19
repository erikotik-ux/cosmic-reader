// /api/launches.js — Upcoming rocket launches proxy.
//
// Pulls from The Space Devs' Launch Library 2 API (free, no API key).
// Returns a slim JSON array of upcoming launches with everything we
// need to render a live-countdown widget on the dashboard.
//
// Aggressive edge cache (15min) because launch metadata barely changes
// once scheduled. Free, public, no auth — perfect for a dashboard
// widget.
//
// Read-only proxy. Cannot affect anything on the live site.

const LL2_URL = 'https://ll.thespacedevs.com/2.2.0/launch/upcoming/?limit=8&hide_recent_previous=true&mode=list';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  let upstream;
  try {
    upstream = await fetch(LL2_URL, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'CosmicReader/1.0 (https://cosmicreader.app)',
      },
      signal: AbortSignal.timeout(8000),
    });
  } catch (e) {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(502).json({ error: 'Upstream timeout', launches: [] });
  }

  if (!upstream.ok) {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(502).json({ error: 'Upstream ' + upstream.status, launches: [] });
  }

  let data;
  try { data = await upstream.json(); }
  catch (e) {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(502).json({ error: 'Bad upstream JSON', launches: [] });
  }

  // Slim down the response — we only need a handful of fields for the
  // widget. Keeps payload tiny and the API surface stable even if
  // Launch Library 2 changes their schema later.
  const results = Array.isArray(data.results) ? data.results : [];
  const launches = results.map(r => ({
    id:        r.id || null,
    name:      (r.name || '').slice(0, 160),
    // ISO date of T-0 (UTC). null if not yet scheduled.
    net:       r.net || null,
    // Launch status (e.g. 'Go', 'TBD', 'In Flight', 'Hold')
    status:    (r.status && r.status.abbrev) || (r.status && r.status.name) || null,
    statusFull:(r.status && r.status.name) || null,
    // Mission / provider names
    mission:   (r.mission && r.mission.name) || null,
    provider:  (r.launch_service_provider && r.launch_service_provider.name) || null,
    // Pad info — useful for "from Kennedy Space Center"
    padName:   (r.pad && r.pad.name) || null,
    padLocation: (r.pad && r.pad.location && r.pad.location.name) || null,
    // Image (often null on LL2 free tier; fine, we have category fallbacks)
    image:     r.image || null,
    // Full URL to LL2's launch page (or upstream)
    url:       r.url || null,
  })).filter(l => l.name && l.net);

  res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate=3600');
  return res.status(200).json({
    count: launches.length,
    fetched_at: new Date().toISOString(),
    launches,
  });
}
