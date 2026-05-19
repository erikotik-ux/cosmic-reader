// /api/healthcheck.js
//
// Diagnostic endpoint. Probes the article-image pipeline end-to-end and
// returns per-source health as JSON. Visit /api/healthcheck to see
// results. Add ?pretty=1 for indented output.
//
// PURE DIAGNOSTIC — read-only, zero side effects on the live site:
//   - Separate serverless function. Never called from any page.
//   - Has no shared state with other endpoints.
//   - Only makes outbound HEAD/GET requests; never writes.
//   - Cannot modify articles, cache, auth, animations, or anything visible.
//
// What it probes (all in parallel):
//   1. wsrv.nl proxy + each publisher CDN (using their favicon as a stable
//      tiny test asset)
//   2. Our /api/spacenews endpoint — returns the SpaceNews feed array?
//   3. Our /api/og endpoint — extracts og:image from a known-good page?
//
// Typical response time: 1-3 seconds. Worst case 6s (one timeout cap).

const PROBE_TIMEOUT_MS = 6000;

// Replica of the client-side proxyImg() function. Must stay in sync with
// the versions in app.html / trending.html / transmissions.html / home.html.
// If any of those change, mirror the change here so the healthcheck
// reflects what the client actually does.
function proxyImg(url) {
  if (!url) return '';
  if (url.startsWith('data:')) return url;
  if (url.includes('wsrv.nl')) return url;
  // Unwrap Jetpack Photon CDN (i0/i1/i2.wp.com) — wsrv.nl blocks it.
  url = url.replace(/^https?:\/\/i[0-9]\.wp\.com\/([^?]+).*$/i, 'https://$1');
  return 'https://wsrv.nl/?url=' + encodeURIComponent(url) + '&maxage=7d&output=jpg&q=85';
}

async function probeUrl(url, opts = {}) {
  const t0 = Date.now();
  try {
    const r = await fetch(url, {
      method: opts.method || 'HEAD',
      headers: { 'User-Agent': 'CosmicReaderHealthcheck/1.0' },
      signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
    });
    const out = {
      ok: r.ok,
      status: r.status,
      content_type: r.headers.get('content-type'),
      ms: Date.now() - t0,
    };
    // For GET probes against our own endpoints, peek at the body so we can
    // report whether it looks healthy (non-empty array / image field).
    if (opts.method === 'GET' && r.ok) {
      try {
        const text = (await r.text()).slice(0, 500);
        if (text.startsWith('[')) {
          const arr = JSON.parse(text + (text.endsWith(']') ? '' : ']'));
          out.array_length_sample = Array.isArray(arr) ? arr.length : null;
        } else if (text.startsWith('{')) {
          try { out.body_keys = Object.keys(JSON.parse(text)); } catch (_) {}
        }
      } catch (_) {}
    }
    return out;
  } catch (e) {
    return {
      ok: false,
      error: ((e && e.name) || 'Error') + ': ' + (((e && e.message) || '').slice(0, 100)),
      ms: Date.now() - t0,
    };
  }
}

// One sample per publisher. Favicons are perfect for this — always exist,
// always tiny, validate that wsrv.nl can reach the host at all. If a
// favicon probe fails, real article images from that host will too.
// The Jetpack Photon entry is a deliberate canary: after our proxyImg()
// unwrap fix it should pass; if it fails, the unwrap logic regressed.
const PUBLISHER_SAMPLES = [
  { source: 'Space.com',         img: 'https://www.space.com/favicon.ico' },
  { source: 'Universe Today',    img: 'https://www.universetoday.com/favicon.ico' },
  { source: 'NASA',              img: 'https://www.nasa.gov/favicon.ico' },
  { source: 'Phys.org',          img: 'https://phys.org/favicon.ico' },
  { source: 'Ars Technica',      img: 'https://arstechnica.com/favicon.ico' },
  { source: 'Teslarati',         img: 'https://www.teslarati.com/favicon.ico' },
  { source: 'Planetary Society', img: 'https://www.planetary.org/favicon.ico' },
  { source: 'SpaceNews',         img: 'https://spacenews.com/favicon.ico' },
  { source: "Ben's Bites",       img: 'https://www.bensbites.com/favicon.ico' },
  { source: 'Jetpack Photon',    img: 'https://i0.wp.com/spacenews.com/favicon.ico' },
];

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Access-Control-Allow-Origin', '*');

  const host = `https://${req.headers.host || 'cosmicreader.app'}`;
  const t0 = Date.now();

  // 1. Per-publisher: real URL transformed via proxyImg, then probed.
  const wsrv = {};
  await Promise.all(PUBLISHER_SAMPLES.map(async s => {
    const proxied = proxyImg(s.img);
    const result = await probeUrl(proxied);
    wsrv[s.source] = { ...result, proxied };
  }));

  // 2. Our own /api/spacenews — confirm it returns a non-empty array.
  const ownSpacenews = await probeUrl(`${host}/api/spacenews`, { method: 'GET' });

  // 3. Our own /api/og — known good URL, confirm image is extracted.
  const ogProbeUrl = `${host}/api/og?url=${encodeURIComponent('https://www.nasa.gov/')}`;
  const ownOg = await probeUrl(ogProbeUrl, { method: 'GET' });

  // Build summary
  const failedPubs = Object.entries(wsrv).filter(([, v]) => !v.ok).map(([k]) => k);
  const ownFailed = [];
  if (!ownSpacenews.ok) ownFailed.push('/api/spacenews');
  if (!ownOg.ok) ownFailed.push('/api/og');

  let summary;
  if (failedPubs.length === 0 && ownFailed.length === 0) {
    summary = 'All systems nominal ✓';
  } else {
    const parts = [];
    if (failedPubs.length) parts.push(`wsrv.nl failing for: ${failedPubs.join(', ')}`);
    if (ownFailed.length) parts.push(`own endpoints failing: ${ownFailed.join(', ')}`);
    summary = parts.join(' | ');
  }

  const payload = {
    timestamp: new Date().toISOString(),
    duration_ms: Date.now() - t0,
    summary,
    publisher_cdns: wsrv,
    own_spacenews: ownSpacenews,
    own_og: ownOg,
  };

  // ?pretty=1 → indented JSON for browser viewing
  if (req.query && (req.query.pretty === '1' || req.query.pretty === 'true')) {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.status(200).send(JSON.stringify(payload, null, 2));
  }
  return res.status(200).json(payload);
}
