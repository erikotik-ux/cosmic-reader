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
