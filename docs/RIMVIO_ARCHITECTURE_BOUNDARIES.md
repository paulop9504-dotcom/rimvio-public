# Rimvio Architecture Boundaries (v1)

Folder barrels define **production vs experimental** without moving legacy modules.

## `lib/core/`

**Owns:** WHAT to execute, WHEN loops fire, WHAT memory remembers.

| Module | Role |
|--------|------|
| `lib/execution/` | Execution plane, dispatch bridge |
| `lib/memory/` | Surface memory sync |
| `lib/loop-wiring/` | Behavioral loops |
| `lib/capability-registry/` | Capability catalog + provider resolve |
| `lib/learning/` | Observation ingest |
| `lib/stability/` | Anti-thrash, load control |
| `lib/surface-engine/` | Surface SSOT ranking (engine, not DOM) |
| `lib/life-read-model/` | Event/life projections |

**Entry:** `import { … } from "@/lib/core"`

## `lib/surface/`

**Owns:** HOW one decision is composed for UI (collapse + slots + MFE).

| Module | Role |
|--------|------|
| `lib/surface-composition/` | Graph, collapse, layout |

**Entry:** `import { … } from "@/lib/surface"`

**Rule:** UI components must not rank surfaces locally; use `useSurfaceComposition`.

## `lib/runtime/`

**Owns:** Orchestration across core + surface in the app process.

| Module | Role |
|--------|------|
| `lib/platform/` | Public runtime bootstrap |
| `lib/realtime/` | Continuous ticks |
| `lib/command-router/` | Composer command ingress |

**Entry:** `import { … } from "@/lib/runtime"`

## `lib/experimental/`

**Not production-guaranteed.** May change without core contract bump.

| Module | Role |
|--------|------|
| `lib/marketplace/` | Packages, plugins, monetization preview |

**Entry:** `import { … } from "@/lib/experimental"`

## UI (`components/`, `hooks/`)

Runtime shell only. No canonical ranking. Dispatches capabilities with `metadata.surfaceId`.

## Forbidden cross-boundary patterns

- UI importing `lib/marketplace/internal/*`
- Learning calling `dispatchCapability` directly
- Experimental modules writing surface memory without execution plane

See boundary tests: `scripts/test-*-boundary.ts`.
