# Deferred items — Cosmic Reader

Things found during review that were consciously **not** fixed yet, with enough
context to pick up cold. Delete an entry when it ships.

---

## P2 — Settings modal has no focus trap

**Deferred:** 2026-08-14 (branch `impeccable-polish`) — explicitly flagged by Erik
to revisit later.

**What:** When the Settings modal is open, Tab moves focus out of the dialog and
into the dashboard behind it. Escape-to-close and focus-return-on-close were not
verified either.

**Why it matters:** A keyboard or screen-reader user can tab into the page behind
an open modal and interact with controls that are visually covered, with no way to
tell where they are.

**Where:** `app.html` — the Settings dialog markup and its open/close handlers.

**Sketch of the fix:**
- `role="dialog"` + `aria-modal="true"` + `aria-labelledby` on the dialog.
- On open: remember `document.activeElement`, move focus to the dialog.
- Keydown handler: cycle Tab / Shift+Tab within the dialog's focusable elements;
  Escape closes.
- On close: restore focus to the remembered element.

**Care required:** Settings is wired to Supabase (account state, sign-out). Erik's
standing constraint is to be careful with anything Supabase-connected — this fix
should touch focus management only, not any auth call or account handler.

---

## Also still open (from the 2026-08-14 critique, lower priority)

- Read-article text contrast measures **2.81:1** in 3 combinations, caused by
  cumulative ancestor `opacity: 0.5` read-dimming rather than the colour itself.
- **21 of 33** touch targets are under 44x44px.
- Mobile at 375px width was never actually measured.
- Cards have no `href`, so middle-click / open-in-new-tab does not work; reaching
  an article always costs one extra click through `#view-detail`.
- No keyboard shortcuts for primary navigation.
