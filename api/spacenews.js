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
        'User-Agent':
          'Mozilla/5.0 (compatible; CosmicReader/1.0; +https://cosmic-reader.vercel.app)',
        Accept: 'application/json',
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
