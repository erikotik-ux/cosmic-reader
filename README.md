# 🚀 Cosmic Reader

> *For those who look up and wonder what comes next.*

Cosmic Reader is a live space exploration news terminal built for the obsessives — the people who track every rocket launch, debate propulsion systems at dinner, and genuinely believe that humanity's greatest chapter is still being written somewhere between here and the stars.

This isn't a blog. It's a mission briefing.

---

## What It Is

Cosmic Reader pulls live signals from the world's top space journalism sources — Universe Today, SpaceNews, NASA, NASAWatch, NASASpaceFlight, and Inverse — and presents them through an immersive, space-station-inspired interface. Articles are categorized by signal type (Planets, Missions, Physics, Moon, Exoplanets), ranked in real time, and laid out as a bento-grid transmission feed rather than a scrolling list of links.

The design language takes cues from mission control dashboards and deep-space telemetry readouts: a dark starfield canvas, glowing cyan primary signals, orbital animations, a live constellation map as the home screen, and a ticker of breaking transmissions running at the bottom of every view.

Think less "news site," more "ops center for people who care about the next giant leap."

---

## Features

- **Galaxy Map** — An interactive star map where each planet node represents a news category. Click to explore.
- **Live Feed** — Real-time articles from 6 RSS sources, paginated and filterable by category.
- **Trending Signals** — The 20 most recent transmissions ranked in order across all feeds.
- **Signal Detail** — A full Discovery HUD for each article: image, excerpt, category stats, and a direct link to the original source.
- **Full Transmission** — Immersive full-article reading mode with a reading progress bar.
- **Saved Stories** — Bookmark any article and revisit it in your personal collection. Toggle to unsave.
- **Priority Signal** — A hover-reveal panel at the right edge showing the breaking story from the latest feed pull.
- **Live Ticker** — A continuous marquee of the five freshest headlines scrolling at the bottom of the screen.

---

## Tech Stack

| Layer | Tech |
|---|---|
| Structure | Vanilla HTML5 |
| Styling | Tailwind CSS v3 (compiled, no CDN) |
| Fonts | Space Grotesk + Inter (Google Fonts) |
| Icons | Material Symbols Outlined |
| Data | RSS feeds via allorigins.win CORS proxy |
| Build | `tailwindcss` CLI |

No frameworks. No bundler. No runtime dependencies. Just a single HTML file and a compiled stylesheet.

---

## Getting Started

```bash
# Clone the repo
git clone https://github.com/YOUR_USERNAME/cosmic-reader.git
cd cosmic-reader

# Install build tools (only needed if you edit Tailwind classes)
npm install

# Open the site
open index.html
```

### Rebuilding the CSS

If you add new Tailwind utility classes to `index.html`, recompile the stylesheet:

```bash
# One-time build
npm run build

# Watch mode during development
npm run build:watch
```

---

## RSS Sources

| Source | Feed |
|---|---|
| Inverse | `inverse.com/rss` |
| NASAWatch | `nasawatch.com/feed/` |
| NASASpaceFlight | `nasaspaceflight.com/feed/` |
| Universe Today | `universetoday.com/feed/` |
| SpaceNews | `spacenews.com/feed/` |
| NASA | `nasa.gov/feed/` |

Articles are fetched via the [allorigins.win](https://allorigins.win) CORS proxy and categorized automatically by keyword matching against the article title and tags.

---

## Philosophy

Space exploration is the most important long-term project our species has ever undertaken. It's engineering, science, philosophy, and ambition all compressed into rockets and robots and radio signals. Cosmic Reader exists because that story deserves to be told beautifully — not buried in an RSS reader or lost in a news feed algorithm.

If you're the kind of person who watched the first Starship integrated flight test at 3am, who knows the difference between SLS and Starship, who gets genuinely emotional about the Voyager probes still transmitting from interstellar space — this was built for you.

---

*Built with Tailwind CSS · Powered by RSS · Designed for the curious*
