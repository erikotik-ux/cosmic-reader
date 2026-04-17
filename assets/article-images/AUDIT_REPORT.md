# Image Audit Report — Cosmic Reader Dashboard
**Date:** April 17, 2026  
**Auditor:** Automated scan + manual review  
**Scope:** All 6 static article cards + JS articles[] data + FALLBACK_POOL

---

## Summary

| # | Article | Status Before | Action |
|---|---------|---------------|--------|
| 0 | LIGO Primordial Black Hole Detection | ❌ Wrong — Pillars of Creation | ✅ Replaced |
| 1 | Hunting Moon Water With Neutrons | ✅ Correct — NASA Supermoon | Kept |
| 2 | Hera Aces Engine Burn to Didymos | ❌ Wrong — Carina Nebula | ✅ Replaced |
| 3 | Jupiter's Lightning 1M Times More Powerful | ❌ Wrong — Andromeda Galaxy | ✅ Replaced |
| 4 | How Did Venus Become a Hellscape? | ❌ Wrong — Butterfly Nebula | ✅ Replaced |
| 5 | AI Models Reach Human Expert Level | ✅ Correct — AI/Tech Flickr image | Kept |

**FALLBACK_POOL:** Fully rebuilt — removed unrelated galaxies/nebulae from Planets and Moon pools, added topically correct images.

---

## Article-by-Article Detail

### Article [0] — LIGO's Primordial Black Hole Detection
- **Category:** Physics
- **Problem:** Image was `opo9821a.jpg` (Pillars of Creation, 1995) — entirely unrelated to gravitational waves or black holes
- **Also fixed:** Static HTML hero card was using an expiring Google LH3 `aida-public/` URL
- **Replacement:** `heic1706b.jpg`
- **Source:** ESA/Hubble — "Gravitational waves eject supermassive black hole from galactic core" (2017, heic1706)
- **Why:** Directly shows a black hole ejected by gravitational waves — the exact phenomena described in the article
- **CDN URL:** `https://cdn.spacetelescope.org/archives/images/publicationjpg/heic1706b.jpg`

---

### Article [1] — Hunting Moon Water With Neutrons
- **Category:** Moon
- **Image:** `live.staticflickr.com/5588/30866406122_4c0cdf45c2_b.jpg` (NASA Supermoon 2016)
- **Status:** ✅ KEPT — relevant, clean, professional NASA Flickr image of the Moon

---

### Article [2] — Hera Aces Massive Engine Burn to Didymos
- **Category:** Missions
- **Problem:** Image was `heic0709a.jpg` (Carina Nebula) — completely unrelated to asteroid deflection missions
- **Also fixed:** Static HTML card was using an expiring Google LH3 `aida-public/` URL
- **Replacement:** `heic2213a.jpg`
- **Source:** ESA/Hubble — "Hubble images ejecta from DART's asteroid impact on Dimorphos" (Oct 2022, heic2213)
- **Why:** Directly depicts the Didymos/Dimorphos system — the exact destination of the Hera mission following up on DART's impact. Scientifically authoritative and mission-accurate.
- **CDN URL:** `https://cdn.spacetelescope.org/archives/images/publicationjpg/heic2213a.jpg`
- **Note:** If heic2213a fails, the Missions FALLBACK_POOL now leads with heic2213a and falls back to SpaceX Starship imagery. The onerror imgChain handler provides SVG fallback as final safety net.

---

### Article [3] — Jupiter's Lightning Is Up To 1 Million Times More Powerful
- **Category:** Planets
- **Problem:** Image was `heic1501a.jpg` (Andromeda Galaxy, 2015) — completely wrong, shows a different galaxy
- **Also fixed:** Static HTML row card was using an expiring Google LH3 `aida-public/` URL
- **Replacement:** `heic1914a.jpg`
- **Source:** ESA/Hubble — "Hubble's New Portrait of Jupiter" (Aug 2019, heic1914) — taken by Wide Field Camera 3 on June 27, 2019
- **Why:** Sharp, iconic, high-resolution Hubble portrait of Jupiter showing cloud bands and Great Red Spot — directly matches the article subject
- **CDN URL:** `https://cdn.spacetelescope.org/archives/images/publicationjpg/heic1914a.jpg`

---

### Article [4] — How Did Venus Become a Hellscape?
- **Category:** Planets
- **Problem:** Image was `heic0712a.jpg` (Butterfly Nebula) — a nebula, completely wrong for a Venus climate article
- **Replacement:** `opo9516g.jpg`
- **Source:** ESA/Hubble — "Venus cloud tops viewed by Hubble" (1995, opo9516g) — Hubble UV observation of Venus
- **Why:** The only Hubble image of Venus in the ESA archive; shows the planet's thick cloud atmosphere in ultraviolet — directly relevant to an article about Venus's catastrophic atmospheric evolution
- **CDN URL:** `https://cdn.spacetelescope.org/archives/images/publicationjpg/opo9516g.jpg`

---

### Article [5] — AI Models Reach New Frontier
- **Category:** AI & Tech
- **Image:** `live.staticflickr.com/65535/50703878421_40f681155b_b.jpg`
- **Status:** ✅ KEPT — suitable tech/space visualization, stable Flickr CDN URL

---

## FALLBACK_POOL Changes

### Before → After per category

**Planets (before):** All galaxies and nebulae — Centaurus A, Andromeda, Pillars of Creation, UDF, Whirlpool, Carina, Butterfly — zero actual planets  
**Planets (after):** Now leads with Jupiter (heic1914a), Saturn (heic1917a), Venus (opo9516g), then generic deep-space backfills

**Moon (before):** NASA Supermoon + 6 galaxies/nebulae  
**Moon (after):** NASA Supermoon + reduced pool of 4 (generic deep-space aesthetics only)

**Missions (before):** SpaceX Starship + 6 nebulae/galaxies  
**Missions (after):** Leads with heic2213a (DART impact on Dimorphos) + SpaceX Starship + mission-adjacent imagery

**Physics (before):** All generic nebulae  
**Physics (after):** Now leads with heic1706b (gravitational waves/black hole) — directly matches Physics topics

---

## Image Storage

All images are served from permanent public CDNs:
- `cdn.spacetelescope.org` — ESA/Hubble archive (Creative Commons Attribution 4.0)
- `live.staticflickr.com` — NASA public Flickr albums

Network restrictions in the build environment prevented downloading images to local `assets/article-images/` paths. Images are loaded externally via CDN at runtime. The `imgChain()` onerror handler provides 2-step fallback: pool URL → SVG data-URI, ensuring something always renders even if CDN is temporarily unreachable.

If local copies are required, download from the CDN URLs above and update `src` attributes to `assets/article-images/{filename}.jpg`.

---

## Unresolved / Watch Items

| Item | Status |
|------|--------|
| heic2213a (DART ejecta) | ID inferred from release sequence; confirm at esahubble.org/news/heic2213/ |
| Venus local image | No locally stored copy — served from ESA CDN |
| Moon FALLBACK_POOL | Only 1 genuinely Moon-specific image (supermoon); would benefit from more lunar photography |
| Article [4] Venus static card | Article uses a text-only card layout (no `<img>` tag in static HTML) — only JS-rendered version benefits from this fix |
