// Vercel serverless RSS proxy — used as the primary fetch path for feeds
// that Cloudflare blocks from public CORS proxies (NASASpaceFlight, Spaceflight Now, etc.)
// Rotates through UA strings to avoid bot-detection fingerprinting.

const UA_POOL = [
  // Feedly is explicitly whitelisted by most publishers
  'Feedly/1.0 (+http://www.feedly.com/fetcher.html; 50 subscribers; like FeedFetcher-Google)',
  // Google's RSS fetcher — nearly universally whitelisted
  'FeedFetcher-Google; (+http://www.google.com/feedfetcher.html)',
  // NewsBlur — another well-known RSS reader
  'NewsBlur Feed Fetcher - 200 subscribers - https://www.newsblur.com',
];

export default async function handler(req, res) {
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: 'Missing url parameter' });
  }

  // Only allow http/https URLs
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return res.status(400).json({ error: 'Invalid URL' });
  }

  // Try each user-agent in rotation until one succeeds
  for (const ua of UA_POOL) {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': ua,
          'Accept': 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
        },
        signal: AbortSignal.timeout(10000),
        redirect: 'follow',
      });

      const text = await response.text();

      // Cloudflare challenge pages start with <!DOCTYPE html> and contain "cf-browser-verification"
      // or "Just a moment..." — if we got one, try next UA
      if (
        !text.includes('<item') &&
        !text.includes('<entry') &&
        (text.includes('cf-browser-verification') ||
          text.includes('Just a moment') ||
          text.includes('challenge-platform') ||
          (text.startsWith('<!') && !text.includes('<rss') && !text.includes('<feed')))
      ) {
        continue; // try next user-agent
      }

      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Content-Type', 'application/xml; charset=utf-8');
      res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
      return res.status(200).send(text);
    } catch (_) {
      // timeout or network error — try next UA
    }
  }

  // All user-agents failed
  res.status(502).json({ error: 'Feed unreachable after all attempts' });
}
