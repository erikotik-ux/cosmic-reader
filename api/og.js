// Hostnames we're willing to fetch og:image from. Restricting the allowlist
// prevents the endpoint from being abused as a generic web fetcher / SSRF
// vector (anyone could otherwise call /api/og?url=http://internal-ip/...).
// Add a publisher here when adding a new feed to NO_IMG_SRCS in app.html.
const OG_ALLOWED_HOSTS = new Set([
  // Active RSS feeds
  'spacenews.com', 'www.spacenews.com',
  'www.teslarati.com', 'teslarati.com',
  'www.planetary.org', 'planetary.org',
  'www.space.com', 'space.com',
  'www.universetoday.com', 'universetoday.com',
  'www.nasa.gov', 'nasa.gov', 'science.nasa.gov',
  'phys.org', 'www.phys.org',
  'arstechnica.com', 'www.arstechnica.com',
  // Currently blocked but historically supported (keep here in case re-enabled)
  'skyandtelescope.org', 'www.skyandtelescope.org',
]);

function isHostAllowed(hostname) {
  if (!hostname) return false;
  const h = hostname.toLowerCase();
  if (OG_ALLOWED_HOSTS.has(h)) return true;
  // Allow any subdomain of an allowed host (e.g. cdn.spacenews.com)
  for (const allowed of OG_ALLOWED_HOSTS) {
    if (h.endsWith('.' + allowed)) return true;
  }
  return false;
}

export default async function handler(req, res) {
  const { url } = req.query;

  if (!url || (!url.startsWith('http://') && !url.startsWith('https://'))) {
    return res.status(400).json({ error: 'Invalid URL', image: null });
  }

  // Reject URLs outside the allowlist — prevents the endpoint from being
  // used to fetch arbitrary internal or third-party hosts.
  let parsedUrl;
  try { parsedUrl = new URL(url); }
  catch(e) { return res.status(400).json({ error: 'Malformed URL', image: null }); }
  if (!isHostAllowed(parsedUrl.hostname)) {
    return res.status(403).json({ error: 'Host not in allowlist', image: null });
  }

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: AbortSignal.timeout(8000),
    });

    // Stream only the first 50KB — og:image is always in <head>, no need to load the full page
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let html = '';
    let bytes = 0;
    const LIMIT = 50 * 1024;

    while (bytes < LIMIT) {
      const { done, value } = await reader.read();
      if (done) break;
      html += decoder.decode(value, { stream: true });
      bytes += value.length;
      // Stop as soon as we've passed </head> or found what we need
      if (html.includes('</head>') || (html.includes('og:image') && html.indexOf('og:image') < bytes)) break;
    }
    reader.cancel().catch(() => {});

    // Extract og:image (try both attribute orderings WordPress uses)
    const m =
      html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i) ||
      html.match(/<meta[^>]+name=["']twitter:image(?::src)?["'][^>]+content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image(?::src)?["']/i);

    const image = m ? m[1].trim() : null;

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
    // ?debug=1 returns diagnostic info so we can see why an extraction failed
    if (req.query.debug) {
      // Return the slice of HTML around the first og:image occurrence so we
      // can see the exact tag format and tune the regex.
      const ogIdx = html.indexOf('og:image');
      const ogSlice = ogIdx >= 0
        ? html.substring(Math.max(0, ogIdx - 120), ogIdx + 300)
        : null;
      return res.status(200).json({
        image,
        status: response.status,
        ok: response.ok,
        bytesRead: bytes,
        hasOgImageStr: html.includes('og:image'),
        hasTwitterImageStr: html.includes('twitter:image'),
        contentType: response.headers.get('content-type'),
        ogSlice,
      });
    }
    return res.status(200).json({ image });
  } catch (error) {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ image: null, error: error.message });
  }
}
