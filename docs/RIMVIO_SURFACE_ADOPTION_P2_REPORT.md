# Rimvio Surface Adoption P2 — Report

**Date:** 2026-06-04  
**Prerequisite:** Surface Engine V1 (`lib/surface-engine/`)  
**Constitution:** [RIMVIO_CONSTITUTION.md](./RIMVIO_CONSTITUTION.md)

---

## 1. Surface Adoption Coverage

| Target | Status | Integration |
|--------|--------|-------------|
| **Feed** | Adopted | `action-chat-feed.tsx` → `useSurfaceEngine` + `SurfaceFeedStrip` |
| **Chat / Dock** | Adopted | `use-predictive-dock.ts` → FEED surfaces → `surfacesToPredictiveDockWire` |
| **Calendar** | Adopted | `use-action-calendar.ts` → `buildCalendarSnapshotFromSurfaces` |
| **Event OS calendars** | Adopted | `use-event-os-calendars.ts` → CALENDAR channel adapters |
| **Peer views** | Partial | Peer talk remains input/social; no local surface compose added |
| **Timeline (threadline)** | Deferred | Proof/OCR cards remain orchestrator-driven (Input), not situation surfaces |
| **Narration cards** | Engine-owned | Narration merged in `resolveSurfaces` / resolver |
| **Action cards (link feed)** | Partial | Link-centric cards unchanged; life surfaces shown above thread |

---

## 2. Remaining Violations

| Area | Violation | Plan |
|------|-----------|------|
| `use-threadline` | `composeThreadlineFromProof` in hook | P3: map proof → surface or ingress-only |
| `buildPrepSurface` + LLM candidates | Prep strip still augments overlay in calendar hook | P3: optional LLM as capability behind surface secondary actions |
| `buildActionCalendar` tiered enrich | Still used if other callers import directly | P3: route all calendar reads through surface adapter |
| Link feed cards | `primaryActionLabel` on link enrichers | Out of scope — link product cards ≠ life surfaces |
| `computePredictiveDock` | Still in `lib/predictive-dock` for tests/legacy | Keep lib; **hooks/components forbidden** (CI) |

---

## 3. Ownership Map

```text
Event SSOT (write)     → commit-truth / event-store
Life Read Facade       → readLifeProjections, readSurfaceDependencies
Surface Engine         → build, rank, route, primary action, narration
Adapters               → surface-to-dock-wire, surface-to-calendar
Hooks                  → useSurfaceEngine (subscribe + resolveSurfaces)
UI                     → SurfaceCard, SurfaceFeedStrip, PredictiveActionDock (layout only)
Execution              → dispatch @surface intents (chat send)
```

---

## 4. Migration Diff (high level)

| File | Change |
|------|--------|
| `hooks/use-surface-engine.ts` | **New** — canonical UI subscription |
| `hooks/use-predictive-dock.ts` | Removed `computePredictiveDock`; uses surface wire adapter |
| `hooks/use-action-calendar.ts` | `buildCalendarSnapshotFromSurfaces` |
| `hooks/use-event-os-calendars.ts` | CALENDAR channel chips |
| `components/action-chat-feed.tsx` | `SurfaceFeedStrip` |
| `components/surface/*` | **New** render-only components |
| `lib/surface-engine/adapters/*` | **New** dock + calendar mapping |
| `components/action-chat/predictive-action-dock.tsx` | Rename partition → layout (tier from engine) |

---

## 5. Runtime Flow

```text
EVENT_CANDIDATES_UPDATED
        ↓
useSurfaceEngine()
        ↓
resolveSurfaces() ── readLifeProjections + readSurfaceDependencies
        ↓
routes: FEED | CHAT | CALENDAR
        ↓
┌──────────────────┬─────────────────────┬────────────────────────┐
│ SurfaceFeedStrip │ surfacesToDockWire  │ buildCalendarSnapshot  │
│ (render)         │ → PredictiveDock    │ → CalendarBoard rows   │
└──────────────────┴─────────────────────┴────────────────────────┘
        ↓
User tap → dispatch intent (chat / execution) — no re-rank in UI
```

---

## 6. Technical Debt Removed

- `computePredictiveDock` removed from **dock hook** (900+ LOC bypass for primary actions)
- `listEventCalendarRows` removed from **calendar hook path**
- `buildActionCalendar` + tiered overlay removed from **useActionCalendar** hot path
- UI no longer calls `rankSurfaces` / `buildSurfacesFromLife` / `selectPrimaryAction`

---

## 7. Production Readiness Score

| Criterion | Score | Notes |
|-----------|-------|-------|
| Feed adoption | 8/10 | Surface strip in feed; link cards coexist |
| Chat/Dock adoption | 8/10 | Primary from surface; goal blend in adapter |
| Calendar adoption | 7/10 | Overlay from surface; LLM prep strip remains |
| CI enforcement | 9/10 | `test:surface-adoption` + MVP step |
| Peer / threadline | 4/10 | Not situation surfaces yet |
| Engineer clarity | 8/10 | UI reads `useSurfaceEngine` + render components |

**Overall: 7.5 / 10** — Surface Engine is the default for Feed/Chat dock/Calendar; threadline and link feed are the main gaps.

---

## Tests

```bash
npm run test:surface-adoption
npm run test:surface-engine
npm run test:mvp
```

**Boundary:** scans `components/` + `hooks/` for forbidden compose/rank imports.  
**Integration:** feed wire, chat route, calendar snapshot from fixtures.

---

## Success Condition Check

> A new engineer reading UI code should not see how surfaces are created.

**Met for:** `action-chat-feed`, `use-predictive-dock`, `use-action-calendar`, `components/surface/*`.  
**Not yet met for:** `use-threadline`, link-based feed insight cards.
