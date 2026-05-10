// Fetches SpaceNews articles from the WordPress REST API.
// SpaceNews intentionally strips images from its RSS feed, so we use the
// WP REST API with ?_embed=wp:featuredmedia to get the actual featured image
// for each article. Falls back to yoast og_image if embed is unavailable.
//
// Always returns a JSON array (never an object) so the frontend can safely
// check Array.isArray() without getting tripped up by error shapes.

const UA_POOL = [
  'Feedly/1.0 (+http://www.feedly.com/fetcher.html; 50 subscribers; like FeedFetcher-Google)',
  'FeedFetcher-Google; (+http://www.google.com/feedfetcher.html)',
  'NewsBlur Feed Fetcher - 200 subscribers - https://www.newsblur.com',
];

const API_URL =
  'https://spacenews.com/wp-json/wp/v2/posts' +
  '?per_page=15' +
  '&_embed=wp:featuredmedia' +
  '&_fields=id,title,excerpt,link,date,_embedded,yoast_head_json';

export default async function handler(req, res) {
  for (const ua of UA_POOL) {
    try {
      const response = await fetch(API_URL, {
        headers: {
          'User-Agent': ua,
          'Accept': 'application/json',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) continue;

      // If Cloudflare blocked us we get HTML — skip to next UA
      const ct = response.headers.get('content-type') || '';
      if (!ct.includes('application/json') && !ct.includes('application/javascript')) continue;

      const posts = await response.json();
      if (!Array.isArray(posts) || posts.length === 0) continue;

      const articles = posts.map(post => {
        // 1. WordPress featured media (most reliable — actual editorial image)
        const media = post._embedded?.['wp:featuredmedia']?.[0];
        const image =
          media?.source_url ||
          media?.media_details?.sizes?.large?.source_url ||
          media?.media_details?.sizes?.medium_large?.source_url ||
          media?.media_details?.sizes?.medium?.source_url ||
          // 2. Yoast og:image as fallback
          post.yoast_head_json?.og_image?.[0]?.url ||
          null;

        return {
          id:      post.id,
          title:   post.title?.rendered   || '',
          excerpt: post.excerpt?.rendered || '',
          link:    post.link              || '',
          date:    post.date              || '',
          image,
        };
      });

      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
      return res.status(200).json(articles);
    } catch (_) {
      // timeout or network error — try next UA
    }
  }

  // All UAs failed — return empty array so frontend degrades gracefully
  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json([]);
}
