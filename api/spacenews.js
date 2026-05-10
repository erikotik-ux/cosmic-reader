// Fetches SpaceNews articles from the WordPress REST API.
// Unlike the RSS feed (which intentionally omits images), the WP API includes
// yoast_head_json.og_image[] — giving us the real featured image for each article.
export default async function handler(req, res) {
  try {
    const apiUrl =
      'https://spacenews.com/wp-json/wp/v2/posts' +
      '?per_page=15' +
      '&_fields=id,title,excerpt,link,date,yoast_head_json';

    const response = await fetch(apiUrl, {
      headers: {
        // Use a whitelisted RSS-reader UA — the CosmicReader UA was blocked by
        // SpaceNews's Cloudflare WAF, causing the WP REST API call to fail silently.
        'User-Agent': 'Feedly/1.0 (+http://www.feedly.com/fetcher.html; 50 subscribers; like FeedFetcher-Google)',
        Accept: 'application/json',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) throw new Error(`SpaceNews API returned HTTP ${response.status}`);

    const posts = await response.json();
    if (!Array.isArray(posts)) throw new Error('Unexpected response shape');

    const articles = posts.map(post => {
      const ogImages = post.yoast_head_json?.og_image || [];
      return {
        id:      post.id,
        title:   post.title?.rendered   || '',
        excerpt: post.excerpt?.rendered || '',
        link:    post.link              || '',
        date:    post.date              || '',
        image:   ogImages[0]?.url       || null,
      };
    });

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    return res.status(200).json(articles);
  } catch (error) {
    res.setHeader('Cache-Control', 'no-store');
    // Return 200 with empty array so the frontend fails gracefully
    return res.status(200).json({ error: error.message, articles: [] });
  }
}
