# Cosmic Reader — Project Notes

## What We're Building

**Cosmic Reader** is a space-exploration news reader web app. It pulls live articles from Universe Today and SpaceNews and presents them in a cinematic, dark "deep space" UI inspired by a Stitch design system. The deliverable is a single self-contained `index.html` file — no server, no build step, just open and it works.

---

## Origin & Context

The project started as a Next.js 14 app with a Supabase backend, using a black/gold theme (Orbitron/Montserrat fonts). The user asked for a complete visual redesign to match a Stitch design system mockup. Rather than rework the Next.js source (which requires a dev server to view), we rebuilt it as a standalone HTML file that can be opened directly in any browser.

---

## Design System (Stitch)

- **Background:** `#131313` (near-black)
- **Primary:** `#dbfcff` / `#00f0ff` (cyan)
- **Secondary:** `#ffb5a0` (salmon/coral)
- **Tertiary:** `#fcf2ff` (soft purple)
- **Fonts:** Space Grotesk (headlines) + Inter (body)
- **Border radius override:** `borderRadius.full = "0.75rem"` — this means `rounded-full` in Tailwind gives 12px corners, NOT circles. Planet spheres need explicit `style="border-radius:50%"` to appear circular.
- **Tailwind CDN** loaded with `darkMode: "class"` and the full color token set from the Stitch design

---

## App Structure: 6 Views (Single-Page)

The app is a multi-view SPA inside one HTML file. Only one view is visible at a time, controlled by toggling a CSS class.

| View ID | Name | Description |
|---|---|---|
| `view-map` | Galaxy Map | Interactive star map with clickable planet nodes |
| `view-feed` | My Feed | Bento grid of articles with category filters |
| `view-detail` | Article Detail | Full-bleed image HUD with article summary |
| `view-reading` | Full Reading | Long-form article reader with scroll progress bar |
| `view-saved` | Saved Stories | Placeholder for bookmarked articles |
| `view-trending` | Trending | Placeholder for trending content |

### View Switching CSS (Critical)

```css
.view { display: none !important; }
.view.active { display: flex !important; }
#view-feed.active, #view-detail.active, #view-reading.active,
#view-saved.active, #view-trending.active {
  flex-direction: column;
}
```

The `!important` is required to override Tailwind's inline display utilities. The `flex-direction: column` rule is required so inner `flex-1 min-h-0 overflow-y-auto` children can scroll.

---

## Key Architecture Decisions

### Scrolling Fix (Critical Bug That Was Fixed)

All scrollable views use this pattern:
```html
<main id="view-feed" class="view h-screen w-full overflow-hidden">
  <div class="flex-1 min-h-0 overflow-y-auto pl-16 md:pl-64 pt-20 pb-10">
```

The `min-h-0` on the flex child is **essential**. Without it, flex items default to `min-height: auto`, which makes the child grow to its content height and ignores the parent's `h-screen` constraint — meaning `overflow-y-auto` never activates and the view can't scroll. This was the main "still broken" bug.

### Planet Circles Fix

The Tailwind config overrides `borderRadius.full` to `0.75rem` (12px). To get actual circles, every planet sphere needs:
```html
<div class="planet-sphere ..." style="border-radius:50%; background:radial-gradient(...)">
  <img class="..." style="border-radius:50%;" src="..."/>
</div>
```
Planet images use `mix-blend-screen` over a dark radial gradient background — this makes the dark edges of space photos blend into the background, creating the illusion of spherical planets.

### Planet Node Positioning

Planet nodes on the Galaxy Map are `absolute` positioned inside a `relative` container. The sidebar is `w-16` (64px) on mobile and `w-64` (256px) on desktop, with `z-40`. Planets positioned at `left: 10%` or `left: 22%` on a 1280px viewport fall behind the sidebar and become unclickable. Fix: keep all planets at `left: 28%` or higher, or use `right:` positioning.

### Category Filtering

Each article card has a `data-category` attribute (Planets, Physics, Moon, Missions, Exoplanets). The filter JS reads this:
```js
const cat = art.dataset.category || '';
art.style.display = (cat.toLowerCase() === category.toLowerCase()) ? '' : 'none';
```
Previously used a fragile `span[class*="uppercase"]` text match that failed because display labels ("Lunar Ops", "Physics Report") didn't match filter names ("Moon", "Physics").

---

## Live RSS Feed Integration

The app fetches live articles from two RSS feeds on every page load:

- **Universe Today:** `https://www.universetoday.com/feed/`
- **SpaceNews:** `https://spacenews.com/feed/`

Fetched via CORS proxy: `https://api.allorigins.win/raw?url=<encoded_feed_url>`

Articles are interleaved (UT, SN, UT, SN...) up to 24 total. The hardcoded fallback articles display instantly while the RSS fetch runs in the background. On success, the bento grid re-renders with live content.

### Category Auto-Detection

Categories are inferred by keyword matching on title + RSS `<category>` tags:

| Category | Keywords |
|---|---|
| Exoplanets | exoplanet, habitable zone, jwst, red dwarf, transit spectrum |
| Moon | moon, lunar, artemis, south pole crater |
| Planets | mars, jupiter, saturn, venus, asteroid belt, planet |
| Missions | nasa, esa, spacex, rocket, starship, launch, spacecraft |
| Physics | black hole, gravitational wave, ligo, dark matter, galaxy, nebula |

### Image Extraction Order

1. `<media:content url>` (Yahoo Media RSS namespace)
2. `<enclosure url>`
3. `<img src>` regex match inside `<description>` HTML
4. Category fallback image (hardcoded Google-hosted URLs)

---

## Priority Signal Panel

A "breaking news" card that lives on the Galaxy Map. It's hidden by default off the right edge of the screen and slides in when hovered:

```css
.priority-panel {
  transform: translateX(calc(100% - 14px));
  transition: transform 0.45s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}
.priority-panel:hover { transform: translateX(0); }
```

A small salmon-colored pull tab (14px wide) stays visible at the right edge as the trigger. The panel is populated with the latest article from the live RSS feed.

---

## Bento Grid Layout

The My Feed view uses a CSS grid layout (`grid-cols-12`) with these slot assignments:

| Index | Columns | Style |
|---|---|---|
| 0 | col-span-8 | Large hero with full-bleed image (360px tall) |
| 1 | col-span-4 | Small card (text only, category icon) |
| 2 | col-span-4 | Small card |
| 3 | col-span-8 | Medium card (image left, text right) |
| 4 | col-span-4 | Small card |
| 5+ | col-span-12 | Data row (thumbnail + title + source + read button) |

The grid is dynamically rendered via `renderFeed(articles)` JS function each time articles load.

---

## Fallback Articles (6 Hardcoded)

Used instantly on load before RSS arrives, and as fallback if RSS fails:

1. **LIGO's Primordial Black Hole Detection** — Physics — Universe Today
2. **Hunting Moon Water With Neutrons** — Moon — Universe Today
3. **Hera Aces Massive Engine Burn to Didymos** — Missions — Universe Today
4. **Jupiter's Lightning Is Up To 1 Million Times More Powerful** — Planets — Universe Today
5. **How Did Venus Become a Hellscape? 234,000 Simulations** — Planets — Universe Today
6. **Exoplanet Discovered in Habitable Zone of Nearby Red Dwarf** — Exoplanets — SpaceNews

---

## Navigation JS

```js
function navigate(viewName) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById('view-' + viewName)?.classList.add('active');
  document.querySelectorAll('[id^="nav-"]').forEach(n => {
    n.classList.remove('active');
    n.classList.add('text-white/40');
  });
  const navEl = document.getElementById('nav-' + viewName);
  if (navEl) { navEl.classList.add('active'); navEl.classList.remove('text-white/40'); }
  currentView = viewName;
  if (viewName === 'reading') setupReadingProgress();
}
```

---

## File Location

- **File:** `index.html`
- **Folder:** `cosmic-reader/` (the user's selected workspace folder)
- **Size:** ~1,400 lines, fully self-contained
- **Dependencies (CDN):** Tailwind CSS, Google Fonts (Space Grotesk + Inter), Material Symbols

---

## Remaining Ideas / Future Work

- Add a real search bar (currently decorative)
- Populate Saved Stories view with bookmark functionality (localStorage)
- Populate Trending view with most-clicked articles
- Add more planet nodes to the Galaxy Map tied to live feed categories
- Animate the planet nodes to pulse/glow when a new article loads in their category
- Make the ticker at the bottom update with live RSS headlines (already implemented)
- Consider a service worker for offline caching of last-fetched articles
- Add smooth page transition animations between views
