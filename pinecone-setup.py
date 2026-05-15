"""
Pinecone upsert script for Cosmic Reader.
Run from PowerShell: python pinecone-setup.py
Requires: pip install pinecone sentence-transformers
"""

import time
from pinecone import Pinecone, ServerlessSpec
from sentence_transformers import SentenceTransformer

API_KEY    = "pcsk_4c9Wsn_Gpr7qcZtG88MzifHznebWSFJMkJDkw1muZKL7ksxhcwG1eRW1AroQCM6HkUiYrN"
INDEX_NAME = "cosmic-reader"

ENTRIES = [
    {
        "id": "skill-logo-transformation",
        "text": "Logo Transformation Technique: Combine SVG logo with high-res planet PNG/WebP using HTML/CSS layering. Two layers in one container: bottom = planet image (position absolute, z-index 1), top = SVG logo (position relative, z-index 2). Four animation patterns: 1. Planet rotation: @keyframes planet-rotate, translate(-50%,-50%) rotate(360deg), 40s linear infinite. 2. Glow pulse: @keyframes logo-glow, drop-shadow 0 0 6px to 18px rgba(0,240,255), 5s ease-in-out. 3. Float drift: @keyframes logo-float, translateY 0 to -8px, 6s ease-in-out. 4. Combined (recommended): wrapper floats, planet rotates, SVG glows all independently. Advanced: SVG clipPath masking makes planet texture visible through the logo shape. Assets: SVG must have transparent background. Planet PNG/WebP minimum 1024x1024px. Responsive: use clamp(180px, 30vw, 400px) on wrapper. Always add prefers-reduced-motion fallback. Performance: animate only transform and opacity (GPU accelerated).",
        "metadata": {"type": "skill", "title": "Logo Transformation — SVG + Planet PNG Animation", "tags": ["logo", "animation", "svg", "css"], "project": "reusable", "created": "2026-05-04"}
    },
    {
        "id": "project-cosmic-reader-overview",
        "text": "Cosmic Reader is a space-themed AI news reader web app built with vanilla HTML/CSS/JS and Tailwind CSS. Tech stack: HTML, Tailwind CSS v3, vanilla JS, Vercel deployment, /api/rss proxy endpoint. Pages: index.html (landing/home), home.html, app.html (main dashboard), galaxy-map.html, transmissions.html, trending.html. Design language: dark space aesthetic, cyan accent (#00f0ff), Material Symbols icons, Orbitron + Space Grotesk fonts, gravitational wave canvas animations. Nav: CSS grid 1fr auto 1fr for true centering. RSS: fetches via /api/rss Vercel proxy, fallback to rss2json.com. Categorizes by keyword matching. Galaxy map: 5 planets (AI&Tech, Space, Climate, Health, Markets), orbital animations, constellation lines, gravitational wave canvas, article overlay on planet click.",
        "metadata": {"type": "project", "title": "Cosmic Reader — Project Overview", "tags": ["cosmic-reader", "web-app", "html", "tailwind", "vercel"], "project": "cosmic-reader", "created": "2026-05-04"}
    },
    {
        "id": "project-cosmic-reader-spacenews-fix",
        "text": "Cosmic Reader — SpaceNews Image Fix (May 2026). Problem: SpaceNews RSS feed intentionally strips images from all posts. Previous approach /api/og.js scraped og:image but returned null because SpaceNews requires JavaScript rendering. Solution: Created /api/spacenews.js fetching from WordPress REST API: https://spacenews.com/wp-json/wp/v2/posts?per_page=15&_fields=id,title,excerpt,link,date,yoast_head_json. The yoast_head_json.og_image[0].url field returns real featured image URLs server-side. app.html changes: removed SpaceNews from FEEDS array, added fetchSpaceNewsFeed() calling /api/spacenews, updated loadLiveFeeds() with Promise.all, SpaceNews added as separate bucket in round-robin interleaver. Key insight: WordPress REST API includes Yoast SEO metadata server-side; RSS is intentionally stripped. Always use WP REST API for og:image on WordPress sites.",
        "metadata": {"type": "project", "title": "Cosmic Reader — SpaceNews WP REST API Fix", "tags": ["cosmic-reader", "spacenews", "wordpress-api", "images"], "project": "cosmic-reader", "created": "2026-05-07"}
    },
    {
        "id": "project-cosmic-reader-image-fixes-2026-05",
        "text": "Cosmic Reader image fix techniques May 2026. Sky and Telescope removed from FEEDS array entirely because Cloudflare WAF blocks Vercel server IPs so /api/og always returns null. Planetary Society RSS enclosures are podcast MP3 files not images — fixed by checking enclosure.type with regex /^image/i and file extension (jpg/jpeg/png/webp/gif) before using as image URL. OG enrichment: for sources with no RSS images (Planetary Society), run parallel /api/og fetches after RSS parse to extract og:image meta tags from article pages. _hasRealImg flag tracks whether an article got a genuine image vs fallback. api/og.js updated to use Chrome-like User-Agent (Mozilla/5.0 Windows NT 10.0 Win64 x64 AppleWebKit/537.36 Chrome/124.0.0.0) to avoid bot detection. wsrv.nl used as image proxy for all images to bypass hotlink and Cloudflare blocks. OG fetch timeout reduced from 5s to 3s. proxyImg() helper wraps image URLs through wsrv.nl CDN.",
        "metadata": {"type": "project", "title": "Cosmic Reader — Image Fix Techniques", "tags": ["cosmic-reader", "images", "og", "wsrv", "planetary-society"], "project": "cosmic-reader", "created": "2026-05-10"}
    },
    {
        "id": "project-cosmic-reader-performance-cache-2026-05",
        "text": "Cosmic Reader sessionStorage caching pattern May 2026. Key: cr_cache_v1, TTL: 8 minutes (8 * 60 * 1000 ms). app.html writes cache after fetching all feeds: sessionStorage.setItem('cr_cache_v1', JSON.stringify({ ts: Date.now(), articles: merged })). trending.html and transmissions.html read the cache first as a fast path — if cache is fresh, skip all feed fetching and render immediately. This makes page-to-page navigation near-instant after the first load. Cache read pattern: const c = JSON.parse(sessionStorage.getItem('cr_cache_v1') || '{}'); if (c.ts && Date.now() - c.ts < TTL && c.articles?.length) { use cache and return; }",
        "metadata": {"type": "project", "title": "Cosmic Reader — sessionStorage Cache Pattern", "tags": ["cosmic-reader", "cache", "performance", "sessionstorage"], "project": "cosmic-reader", "created": "2026-05-10"}
    },
    {
        "id": "project-cosmic-reader-homepage-breaking-news-2026-05",
        "text": "Cosmic Reader homepage breaking news rewrite May 2026. loadBreakingNews() function completely rewritten. Removed NASASpaceFlight from feed list (blocks Vercel). Added proxyImg() helper using wsrv.nl. Fast path: checks cr_cache_v1 sessionStorage, picks first article without wikimedia.org image. Slow path: tries feeds in order — Space.com, Universe Today, SpaceNews, Phys.org, Ars Technica, Teslarati. For each feed, scans first 6 items for one with a real image, skipping audio enclosures. populate() helper fills headline, body, tag, link, image DOM elements. Breaking news teaser now reliably shows a real article with image from active sources.",
        "metadata": {"type": "project", "title": "Cosmic Reader — Homepage Breaking News Rewrite", "tags": ["cosmic-reader", "homepage", "breaking-news", "feeds"], "project": "cosmic-reader", "created": "2026-05-10"}
    },
    {
        "id": "project-cosmic-reader-planet-swap-2026-05",
        "text": "Cosmic Reader galaxy map planet swap May 2026. Physics & Cosmos and AI & Tech planets swapped positions in app.html and galaxy-map.html. Physics moved from top-right to bottom-right. AI & Tech moved from bottom-right to top-right. Only the style position attributes were swapped on the planet-node divs — DOM order unchanged. Constellation line pair [1,2] changed to [1,4] so the diagonal line from SpaceFrontier still connects to the top-right planet (now AI & Tech instead of Physics). The [2,4] pair connecting the two right-side planets stays the same — it runs in reverse direction but looks visually identical.",
        "metadata": {"type": "project", "title": "Cosmic Reader — Galaxy Map Planet Swap", "tags": ["cosmic-reader", "galaxy-map", "layout", "constellation"], "project": "cosmic-reader", "created": "2026-05-10"}
    },
    {
        "id": "project-cosmic-reader-galaxy-map-layout-2026-05",
        "text": "Cosmic Reader galaxy map W-grid layout May 2026. All 5 planets repositioned to a clean W-pattern for equal constellation line lengths and good edge margins. The 5 planets form a chain: Moon → Planets → Frontier → AI&Tech → Physics (pairs [0,3], [0,1], [1,4], [2,4]). W-pattern grid: top row at 28% vertical (Planets, AI&Tech), bottom row at 64% vertical (Moon, Frontier, Physics). Horizontal positions: Moon 12%, Planets 27%, Frontier 44%, AI&Tech 61%, Physics 79%. CSS formula: top:calc(Y% - halfPx); left:calc(X% - halfPx) where halfPx is half the planet sphere diameter. Planet sphere sizes: Planets 176px (half 88px), Frontier 240px (half 120px), Physics 208px (half 104px), Moon 144px (half 72px), AI&Tech 160px (half 80px). Constellation lines: stroke-width 0.65, stroke-opacity 0.28, color #00f0ff. This creates ~44 grid-unit equal distances between all 4 connected pairs and 12%+ edge margins on all sides. Applied identically to both app.html and galaxy-map.html.",
        "metadata": {"type": "project", "title": "Cosmic Reader — Galaxy Map W-Grid Layout", "tags": ["cosmic-reader", "galaxy-map", "layout", "w-grid", "planets"], "project": "cosmic-reader", "created": "2026-05-10"}
    },
    {
        "id": "project-cosmic-reader-feeds-added-2026-05",
        "text": "Cosmic Reader feed sources update May 2026. Removed: NASASpaceFlight (blocks Vercel via kinsta.cloud CDN), Spaceflight Now (blocks Vercel), Sky & Telescope (Cloudflare WAF blocks server-side OG fetching). Added: Teslarati (space/SpaceX coverage), Planetary Society (with OG enrichment for images), Phys.org (science news), Ars Technica (tech/space). Remaining active feeds: Space.com, Universe Today, SpaceNews, NASA, ESA, Phys.org, Ars Technica, Teslarati, Planetary Society. wsrv.nl proxy used for all feed images to handle hotlink protection.",
        "metadata": {"type": "project", "title": "Cosmic Reader — Feed Sources Update", "tags": ["cosmic-reader", "feeds", "rss", "sources"], "project": "cosmic-reader", "created": "2026-05-10"}
    },
]

def main():
    print("Connecting to Pinecone...")
    pc = Pinecone(api_key=API_KEY)

    existing = [idx.name for idx in pc.list_indexes()]
    if INDEX_NAME not in existing:
        print(f"Creating index '{INDEX_NAME}'...")
        pc.create_index(name=INDEX_NAME, dimension=384, metric="cosine",
                        spec=ServerlessSpec(cloud="aws", region="us-east-1"))
        time.sleep(10)

    print("Loading embedding model...")
    model = SentenceTransformer("all-MiniLM-L6-v2")
    index = pc.Index(INDEX_NAME)

    vectors = []
    for entry in ENTRIES:
        print(f"  Embedding: {entry['id']}")
        embedding = model.encode(entry["text"]).tolist()
        meta = {**entry["metadata"], "content": entry["text"][:1000]}
        vectors.append({"id": entry["id"], "values": embedding, "metadata": meta})

    print(f"Upserting {len(vectors)} entries...")
    index.upsert(vectors=vectors)

    stats = index.describe_index_stats()
    print(f"\nDone! {stats['total_vector_count']} vectors in index.")

if __name__ == "__main__":
    main()
