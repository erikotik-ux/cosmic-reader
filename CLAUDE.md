# Cosmic Reader — Project Context for Claude Code

## Project
Space news aggregator web app. Static HTML/CSS/JS deployed on Vercel with one serverless function.
Git remote: https://github.com/erikotik-ux/cosmic-reader.git

## Pages
- `home.html` — landing page with breaking-news teaser
- `app.html` — main app: desktop galaxy map + article panel
- `galaxy-map.html` — standalone galaxy map (homepage entry point)
- `transmissions.html` — article grid with category filter chips
- `trending.html` — trending articles view
- `api/og.js` — Vercel serverless: fetches og:image from article URLs server-side

## Active Feed Sources
Space.com, Universe Today, SpaceNews, NASA, ESA, Phys.org, Ars Technica, Teslarati, Planetary Society

**Blocked/removed:** NASASpaceFlight, Spaceflight Now, Sky & Telescope (all block Vercel IPs)

## Key Patterns

### Image Handling
- `proxyImg(url)` wraps all images through `wsrv.nl` CDN to bypass hotlink blocks
- `api/og.js` uses Chrome-like User-Agent to extract `og:image` from article pages
- Planetary Society has no RSS images — OG enrichment runs parallel `/api/og` fetches after parse
- Audio enclosure fix: check `enclosure.type` regex `/^image/i` + file extension before using as image
- `_hasRealImg` flag tracks genuine images vs fallback during enrichment

### Caching
- sessionStorage key: `cr_cache_v1`, TTL: 8 minutes
- `app.html` writes cache after fetching all feeds
- `trending.html` + `transmissions.html` read cache first for instant navigation

### Galaxy Map Layout (app.html + galaxy-map.html)
W-grid pattern. Chain: Moon(3) → Planets(0) → Frontier(1) → AI&Tech(4) → Physics(2)
Constellation pairs (DOM order): `[[0,1],[1,4],[0,3],[2,4]]`
Lines: `stroke="#00f0ff" stroke-width="0.65" stroke-opacity="0.28"`

| Planet | DOM # | CSS position |
|--------|-------|-------------|
| Planets & Exoplanets | 0 | `top:calc(28% - 88px); left:calc(27% - 88px)` |
| Space Frontier | 1 | `top:calc(64% - 120px); left:calc(44% - 120px)` |
| Physics & Cosmos | 2 | `top:calc(64% - 104px); left:calc(79% - 104px)` |
| Moon | 3 | `top:calc(64% - 72px); left:calc(12% - 72px)` |
| AI & Tech | 4 | `top:calc(22% - 80px); left:calc(61% - 80px)` |

Physics & Cosmos = bottom-right, AI & Tech = top-right (swapped from original).

## Git workflow
Always push from `D:\Business\projects\cosmic-reader` (not C:\).
Vercel auto-deploys on push to main.

## Pending
- Pinecone upserts: see `pinecone-pending-upserts.md` (data plane was unreachable last session)
- NotebookLM update
