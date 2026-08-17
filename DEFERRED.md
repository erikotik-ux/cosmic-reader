# Deferred items — Cosmic Reader

Things found during review that were consciously **not** fixed yet, with enough
context to pick up cold. Delete an entry when it ships.

---

## Still open (from the 2026-08-14 critique, lower priority)

- Read-article text contrast measures **2.81:1** in 3 combinations, caused by
  cumulative ancestor `opacity: 0.5` read-dimming rather than the colour itself.
- **21 of 33** touch targets are under 44x44px. Measured on `home.html`; the
  same pattern is likely in `app.html` but has not been counted there.
- Cards have no `href`, so middle-click / open-in-new-tab does not work; reaching
  an article always costs one extra click through `#view-detail`.
- No keyboard shortcuts for primary navigation.

---

## Closed

- **Mobile viewports.** `home.html` measured at 320 / 375 / 390: no horizontal
  scroll, no elements past the edge, hero eyebrow on one line, nav scroll-state
  correct. `app.html` checked by Erik on device across mobile viewports
  (2026-08-16) — no issues found. The remaining touch-target item above is a
  sizing quality issue, not a layout break.
