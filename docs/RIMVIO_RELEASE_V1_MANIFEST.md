# Rimvio Release v1 Manifest

**Release ID:** `rimvio-v1-alpha`  
**Package version:** `1.0.0-rimvio-alpha`  
**Core API version:** `1.0.0-rimvio-alpha` (`lib/core/rimvio-v1-contracts.ts`)  
**Branch:** `release/v1-rimvio-core`  
**Git tag:** `rimvio-v1-alpha`

This document is the canonical snapshot of what “Rimvio v1” means in production.

---

## What is included in v1

| Layer | Included | Path |
|-------|----------|------|
| Life read + event candidates | Yes | `lib/life-read-model/` |
| Surface Engine (rank, primary action) | Yes | `lib/surface-engine/` |
| Surface Composition (single active) | Yes | `lib/surface-composition/` |
| Capability Registry + Execution Plane | Yes | `lib/capability-registry/`, `lib/execution/` |
| Surface Memory Sync (P0-1) | Yes | `lib/memory/` |
| Surface Collapse (P0-2) | Yes | `surface-collapse-controller.ts` |
| Loop Wiring | Yes | `lib/loop-wiring/` |
| Realtime Behavioral OS | Yes | `lib/realtime/` |
| System Stability | Yes | `lib/stability/` |
| Learning Layer | Yes | `lib/learning/` |
| Platform runtime API | Yes | `lib/platform/` |
| Command Router (`@` + NL) | Yes | `lib/command-router/` |
| Feed UI runtime | Yes | `components/action-chat-feed.tsx`, `hooks/` |
| Marketplace | **Experimental** | `lib/marketplace/` → `lib/experimental/` |

---

## Architecture boundaries

```
lib/core/          → execution, loop, memory, capabilities, learning, stability (contracts)
lib/surface/       → surface-engine + surface-composition (decision UI model)
lib/runtime/       → platform bootstrap, realtime, command ingress
lib/experimental/  → marketplace and other preview modules
```

Legacy paths remain for compatibility; new imports should use boundary barrels where possible.

---

## Core modules (v1)

- `lib/execution/execution-dispatcher.ts` — enqueue + complete + memory commit
- `lib/memory/surface-memory-commit.ts` — `onActionCompleted`, `onActionDismissed`
- `lib/loop-wiring/loop-wiring-engine.ts` — post-execution loop wire
- `lib/surface-engine/surface-resolver.ts` — `resolveSurfaces`
- `lib/surface-composition/surface-collapse-controller.ts` — one active surface
- `lib/surface-composition/build-surface-graph.ts` — latent queue (not rendered)
- `lib/realtime/realtime-loop-orchestrator.ts` — continuous tick
- `lib/stability/stability-pipeline.ts` — debounce, flutter guard
- `lib/command-router/route-rimvio-command.ts` — composer ingress
- `hooks/use-surface-memory.ts` — feed memory subscription
- `hooks/use-surface-composition.ts` — frame for UI

---

## Runtime flow (text)

```
Life events (read)
    → Surface Engine (rank + primary capability)
    → Surface Collapse (argmax score → 1 active, N latent)
    → Surface Composition (MFE render)
    → User tap
    → Capability dispatch
    → Execution Plane (adapter)
    → markExecutionComplete
         ├─ ingestExecutionOutcome (learning)
         ├─ commitSurfaceMemoryFromExecution (memory)
         └─ wireLoopFromCapabilityExecution (loop)
    → useSurfaceMemory refresh
    → Next frame (travel chain / dismiss / demote)
```

Realtime path (parallel, non-destructive):

```
Device signals → processRealtimeTick → loop bias → surface override key
                      ↑
              stability pipeline (debounce, load, learning pause)
```

---

## Surface hierarchy (v1)

1. **ACTIVE** — exactly one `layout.primary` (highest `surfacePriorityScore`)
2. **LATENT** — `graph.latentSurfaces` / `collapse.latentSurfaceIds` (not rendered)
3. **MEMORY** — `completedActionIds`, `dismissedSurfaceIds` (localStorage + engine context)

Feed latent layers (prep calendar, predictive dock) render **only when** no active decision stream:

`shouldRenderLatentSuggestionLayers(frame) === true`

---

## Frozen interfaces (v1)

Re-exported from `lib/core/rimvio-v1-contracts.ts`:

| Alias | Source |
|-------|--------|
| `ExecutionResult` | `lib/execution/execution-contract.ts` |
| `SurfaceState` (`Surface`) | `lib/surface-engine/surface-contract.ts` |
| `MemoryEvent` (`SurfaceMemoryEvent`) | `lib/memory/surface-memory-contract.ts` |
| `ActionEvent` (`SurfaceAction`) | `lib/surface-engine/surface-contract.ts` |

Breaking changes require `RIMVIO_CORE_API_VERSION` bump + new git tag.

---

## Product loop (canonical)

See **`docs/RIMVIO_CANONICAL_LOOP.md`** — five layers (SENSE → REMEMBER → DECIDE → ACT → LEARN), tangled paths resolved, B2C/B2B2C/Wearable on one circuit.  
IO names: **`docs/RIMVIO_INSIDE_OUT_MAP.md`**. Code: `lib/inside-out/`.

---

## Known limitations

| ID | Severity | Description |
|----|----------|-------------|
| P1-coldstart | P1 | Onboarding panel can show above surface on first open |
| P1-ignore-ui | P1 | `observeIgnoredPrimaryAction` not wired to visibility timer in UI |
| P1-handoff | P1 | Deeplink success uses toast only; no inline “next step” on card |
| P1-loop-copy | P1 | Loop-driven primary swaps lack user-facing “why” line |
| P2-vision | P2 | Image → intent pipeline spec only (no `lib/vision` runtime) |
| P2-marketplace | P2 | Marketplace installed but experimental, not launch-critical |

No open **P0** blockers when `npm run verify:rimvio-v1` passes.

---

## Reproduce from git

```bash
git clone <rimvio-repo>
git checkout release/v1-rimvio-core
git checkout rimvio-v1-alpha   # optional annotated snapshot
npm ci
npm run verify:rimvio-v1
npm run test:rimvio-v1-core
npm run dev
```

---

## Verification

- **Gate script:** `npm run verify:rimvio-v1`
- **Core tests:** `npm run test:rimvio-v1-core`
- **Pre-commit (optional):** `npm run precommit:rimvio`

---

## Reports (reference)

- `docs/RIMVIO_LOOP_WIRING_V1_REPORT.md`
- `docs/RIMVIO_REALTIME_BEHAVIORAL_OS_V1_REPORT.md`
- `docs/RIMVIO_SYSTEM_STABILITY_V1_REPORT.md`
- `docs/RIMVIO_COMPOSABLE_SURFACE_UI_V1_REPORT.md`
- `docs/RIMVIO_PLATFORM_LAYER_V1_REPORT.md`

---

*Rimvio v1 is a decision engine, not a dashboard. One active surface. Memory remembers. Latent waits.*
