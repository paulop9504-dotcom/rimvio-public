# Event Kernel schema lock

Frozen OS contracts — **do not extend enums or fields without bumping `EVENT_KERNEL_SCHEMA_LOCK_VERSION` and a migration plan.**

## Version

| Constant | Value |
|----------|--------|
| `EVENT_KERNEL_SCHEMA_LOCK_VERSION` | `1.0.0` |
| Event SSOT schema | `event-candidate.v1` |
| Kernel output | `event-kernel-output.v1` |
| Causal trace graph | `causal-trace-graph.v1` |

Module: `lib/event-kernel/schema-lock/`

## 1. Event schema (life-state SSOT)

| Field | Rule |
|-------|------|
| Categories | `schedule`, `travel`, `finance`, `food`, `work`, `social`, `custom` |
| Sources | `message`, `notification`, `system` |
| Lifecycles | `mentioned` → `candidate` → `confirmed` → `scheduled` → `active` → `completed` → `archived` |
| Wire | Validated in `commitEventWireFromApi` via `validateEventCandidateWire` |

Canonical keys: `LOCKED_EVENT_CANONICAL_KEYS`  
Wire keys: `LOCKED_EVENT_WIRE_KEYS`

## 2. Edge types

### Execution graph (versioned proofs)

Relations: `CAUSES`, `BLOCKS`, `TRIGGERS`  
Validated on every `validateGraphVersioning()` result.

### Causal trace graph (read model)

Nodes: `UI_Button`, `Candidate_State`, `Validation_Layer`, `Event_SSOT`, `Timeline`, `Action_Projection`, `UI_Layer`  
Edges: `LOCKED_CAUSAL_TRACE_EDGES` (labels frozen)

## 3. Mutation rules

| Rule | Enforcement |
|------|-------------|
| Lifecycle forward-only | `assertAllowedLifecycleMutation` in `event-store.transitionEventLifecycle` |
| SSOT writes | Only `commit-truth.ts` exports (`LOCKED_SSOT_WRITE_APIS`) |
| Store internal | `event-store` — no direct app imports |

Boundary scan: `npm run test:write-path-boundary`  
Schema lock: `npm run test:event-kernel-schema-lock`

## Change process

1. Edit `lib/event-kernel/schema-lock/*` constants  
2. Bump `EVENT_KERNEL_SCHEMA_LOCK_VERSION`  
3. Update golden hashes / replay tests if graph or proof shape changes  
4. Document migration in this file
