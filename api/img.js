// Vercel serverless image proxy — fetches article images server-side using
// whitelisted user-agents to bypass Cloudflare hotlink/WAF protection on
// publisher CDNs (kinsta.cloud for NASASpaceFlight, Spaceflight Now, etc.)
// Responses are cached at Vercel's edge CDN for 24 hours (stale 7 days)
// so repeated loads are instant and don't count against function quota.

const UA_POOL = [
  // Googlebot Image crawler — universally whitelisted for media
  'Googlebot-Image/1.0',
  // Feedly — whitelisted by most publishers
  'Feedly/1.0 (+http://www.feedly.com/fetcher.html; 50 subscribers; like FeedFetcher-Google)',
  // Google FeedFetcher
  'FeedFetcher-Google; (+http://www.google.com/feedfetcher.html)',
  // Generic Google crawler
  'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
];

// Only proxy images from known publisher / space-news domains.
// This prevents the endpoint from being used as an open image relay.
const ALLOWED_HOSTNAMES = [
  // Space.com (replaces NASASpaceFlight)
  'space.com',
  'cdn.mos.cms.futurecdn.net',  // Space.com / Future PLC CDN
  'vanilla.futurecdn.net',
  // Phys.org (replaces Spaceflight Now)
  'phys.org',
  'scx2.b-cdn.net',             // Phys.org image CDN
  // Universe Today
  'universetoday.com',
  // SpaceNews (images come from their WordPress media CDN)
  'spacenews.com',
  'mgtvkpho.cdn.imgeng.in',     // SpaceNews image CDN
  // NASA
  'nasa.gov',
  'blogs.nasa.gov',
  'images.nasa.gov',
  // Ars Technica
  'arstechnica.com',
  'arstechnica.net',
  'cdn.arstechnica.net',
  // Teslarati
  'teslarati.com',
  // The Planetary Society
  'planetary.org',
  'images.planetary.org',
  // Sky & Telescope
  'skyandtelescope.org',
  'skyandtelescope.com',
  // WordPress Jetpack image CDN (used by many space blogs)
  'i0.wp.com',
  'i1.wp.com',
  'i2.wp.com',
  'i3.wp.com',
  // Yahoo CDN used by some feeds
  's.yimg.com',
  // Wikimedia (direct, but allow proxy too just in case)
  'upload.wikimedia.org',
];

function isAllowed(url) {
  try {
    const h = new URL(url).hostname.toLowerCase();
    return ALLOWED_HOSTNAMES.some(d => h === d || h.endsWith('.' + d));
  } catch (_) {
    return false;
  }
}

export default async function handler(req, res) {
  const { url } = req.query;

  if (!url) return res.status(400).end();
  if (!url.startsWith('http://') && !url.startsWith('https://')) return res.status(400).end();
  if (!isAllowed(url)) return res.status(403).end();

  // Derive the publisher origin for a realistic Referer header
  let referer = url;
  try { referer = new URL(url).origin + '/'; } catch (_) {}

  for (const ua of UA_POOL) {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': ua,
          'Accept': 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'Referer': referer,
          'Sec-Fetch-Dest': 'image',
          'Sec-Fetch-Mode': 'no-cors',
          'Sec-Fetch-Site': 'cross-site',
        },
        signal: AbortSignal.timeout(10000),
        redirect: 'follow',
      });

      const ct = response.headers.get('content-type') || '';

      // If we got an HTML response, Cloudflare challenged us — try next UA
      if (ct.includes('text/html') || ct.includes('text/plain')) continue;
      if (!response.ok) continue;

      const buffer = await response.arrayBuffer();
      if (buffer.byteLength < 512) continue; // suspiciously small — likely an error page

      res.setHeader('Content-Type', ct || 'image/jpeg');
      res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=604800');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('X-Proxied-By', 'CosmicReader/img');
      return res.status(200).send(Buffer.from(buffer));
    } catch (_) {
      // timeout or network error — try next UA
    }
  }

  // All UAs failed — return 502 so onerror fallback fires in the browser
  res.status(502).end();
}
