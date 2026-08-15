# Deferred items — Cosmic Reader

Things found during review that were consciously **not** fixed yet, with enough
context to pick up cold. Delete an entry when it ships.

---

## Still open (from the 2026-08-14 critique, lower priority)

- Read-article text contrast measures **2.81:1** in 3 combinations, caused by
  cumulative ancestor `opacity: 0.5` read-dimming rather than the colour itself.
- **21 of 33** touch targets are under 44x44px.
- Mobile at 375px width was never actually measured.
- Cards have no `href`, so middle-click / open-in-new-tab does not work; reaching
  an article always costs one extra click through `#view-detail`.
- No keyboard shortcuts for primary navigation.
