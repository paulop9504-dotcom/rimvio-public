# GOAL Engine — Context & Architecture



This document is the **verification baseline** for all GOAL-related code changes.

Implementation must not violate these rules.



## Purpose



GOAL Engine is **not** a new brain. It is a thin **read-only aggregation layer** (constitution) that:



1. Builds one **GoalSnapshot** per orchestrator turn (output only)

2. Scores action candidates (`scoreActionAlignment`)

3. Emits routing hints (`deriveGoalPriorityHint`)



Execution stays in existing tiers, dock, meal flow, and schedule-intelligence.



---



## §5 Relationship with Global Brain & Goal Roadmap



### Stack (after GOAL integration)



```text

Goal Roadmap

       ↓

Global Brain

       ↓

GOAL Engine          ← aggregation only (GoalSnapshot)

       ↓

Tier Router (Phase 1)

       ↓

Predictive Dock / Meal / Slot Collect (read snapshot + hint)

```



GOAL Engine does **not** replace Goal Roadmap or Global Brain. It **summarizes** them once per turn.



### Ownership



| Module | Owns | GOAL Engine may |

|--------|------|-----------------|

| **Goal Roadmap** (`lib/goal-roadmap/*`) | User goals, goal progress, goal priority, `orchestrateGoalAlignment()`, `scoreDailyProductivity()` | **Read** via build input / productivity score only |

| **Global Brain** (`lib/global-brain/*`) | Context assembly only (`assembleGlobalBrainContext`, prompt block) | **Read** assembled snapshot in prompts only |
| **Event Horizon** (`lib/event-horizon/*`) | `detectEventHorizon()`, `buildLifeContextSnapshot()` | **Read** via snapshot fields only |
| **Vitality** (`lib/vitality-state/*`) | Emotion/status classification | **Never** inside goal-engine |

| **Schedule Intelligence** (`lib/schedule-intelligence/*`) | Slot optimization, time planning, schedule recommendations | **Never** create slots or schedules |



### Forbidden inside `goal-engine/`



- Reimplement `orchestrateGoalAlignment()`, `calculateGoalProgress()`, `detectEventHorizon()`, `calculateVitality()`

- Call `generateSlots()`, `recommendSchedule()`, or any schedule write path

- Write to goal-roadmap stores, global-brain stores, or canonical schedule state



### Allowed data flow



```text

goal-roadmap (userGoals)     ──► GoalSnapshot

global-brain (horizon, etc.) ──► GoalSnapshot

vitality / status            ──► GoalSnapshot (via global-brain snapshot build)

```



### Forbidden data flow



```text

GoalSnapshot ──► goal-roadmap write     ❌

GoalSnapshot ──► global-brain write     ❌

GoalSnapshot ──► schedule creation      ❌

```



**GoalSnapshot is an output (constitution view), not an input source of truth.**



### Dependency rule (no cycles)



| Allowed | Forbidden |

|---------|-----------|

| `goal-engine` → `goal-roadmap` | `goal-roadmap` → `goal-engine` |

| `goal-engine` → `global-brain` | `global-brain` → `goal-engine` |

| `goal-engine` → `schedule-intelligence` types only (no writes) | `schedule-intelligence` → `goal-engine` |



Verified: no imports of `@/lib/goal-engine` from `lib/goal-roadmap/` or `lib/global-brain/`.



### Context injection (`build-context-injection-block.ts`)



When `goalSnapshot` is passed from the pipeline (Phase 2 middleware), enriched `GLOBAL_BRAIN_SNAPSHOT` JSON may include:



```json

{

  "user_goals": [...],

  "goal_snapshot": {

    "primaryFocus": "certification",

    "weekFocusLabel": "시험 준비",

    "eventHorizonSummary": { "severity": "high", "summary": "..." },

    "sourceRevision": "goal_…",

    "read_only": true

  },

  "event_horizon": [...]

}

```



- LLM may **read** `goal_snapshot` for tone and prioritization.

- LLM must **not** treat `goal_snapshot` as writable state.

- **`event_horizon` truth remains Global Brain** — GOAL’s `eventHorizonSummary` is a single-line projection only.



Global Brain protocol note: see `GLOBAL_BRAIN_PROTOCOL` Context Ingestion step 1.



---



## Existing modules (do not redesign or move)



| Module | Path | GOAL may |

|--------|------|----------|

| goal-roadmap | `lib/goal-roadmap/*` | Read goals; reuse `scoreDailyProductivity` |

| global-brain | `lib/global-brain/*` | Read horizon + vitality |

| schedule-intelligence | `lib/schedule-intelligence/*` | No schedule writes from GOAL |

| orchestrator | `lib/action-chat/orchestrator/run-orchestrator-pipeline.ts` | **Only** snapshot build site |



## Public API (`lib/goal-engine/index.ts`)



Exactly three exports:



- `buildGoalSnapshot()`

- `scoreActionAlignment()`

- `deriveGoalPriorityHint()`



No additional public APIs.



Internal (not in index): hooks (`apply-tier-goal-policy`, `apply-meal-goal-policy`, `rank-dock-by-goal`), `goal-snapshot-session`, `map-master-context-to-snapshot-input`, `project-goal-snapshot-for-context`.



Hook A: `buildGoalSnapshot(` / `deriveGoalPriorityHint(` production calls — **only** `run-orchestrator-pipeline.ts` (tests excepted).



## Data flow (per turn)



```text

goal-roadmap ──┐

global-brain ──┼──► buildGoalSnapshot() ──► GoalSnapshot (1×)

               │              │

               │              ├── deriveGoalPriorityHint()

               │              │

run-orchestrator-pipeline      ├── ctx.goalSnapshot / ctx.goalPriorityHint

       │                       ├── Phase 2 → goal_snapshot in GLOBAL_BRAIN_SNAPSHOT (read-only)

       │                       ├── Tier 5 goal policy (rank/nudge, no block)

       │                       ├── Meal / slot-collect (rerank/nudge, no block)

       └──► response.goalSnapshot ──► client ──► predictive dock (readLastGoalSnapshot)

```



## Snapshot ownership



| Rule | Value |

|------|--------|

| Author | `run-orchestrator-pipeline` only |

| Frequency | **1 turn = 1 snapshot** |

| Tier / meal / dock | Read `ctx` or session — never rebuild |

| Forbidden | `buildGoalSnapshot` in tier, dock, slot-collect, meal modules |



## Design constraints (read-only layer)



**Forbidden:** DB writes, API calls, network, mutating external module state, event append.



**Allowed:** Aggregate, normalize, summarize, deterministic score math.



## GoalSnapshot (§2.1)



Defined in `lib/goal-engine/types.ts` — see `validateGoalSnapshot()` at build time.



## Implementation map



| File | Role |

|------|------|

| `lib/goal-engine/build-goal-snapshot.ts` | Aggregates roadmap + global-brain (read-only) |

| `lib/goal-engine/project-goal-snapshot-for-context.ts` | LLM read-only projection |

| `lib/goal-engine/score-action-alignment.ts` | Dock / alignment scoring |

| `lib/goal-engine/derive-priority-hint.ts` | Tier/dock/meal hints |

| `lib/goal-engine/apply-tier-goal-policy.ts` | Hook B |

| `lib/goal-engine/apply-meal-goal-policy.ts` | Hook D |

| `lib/goal-engine/rank-dock-by-goal.ts` | Hook C |

| `lib/global-brain/build-context-injection-block.ts` | Injects `goal_snapshot` when provided |
| `lib/goal-engine/serialize-goal-snapshot-wire.ts` | §6 API wire (`read_only: true`) |
| `lib/goal-engine/goal-snapshot-session.ts` | Client last-turn read + revision echo |

## §6 Client & API integration

### Single builder

| Allowed | Forbidden |
|---------|-----------|
| `buildGoalSnapshot()` in `run-orchestrator-pipeline.ts` only | `clientBuildGoalSnapshot`, `serverBuildGoalSnapshot`, API route calling `buildGoalSnapshot` |

Entry chain: `POST /api/chat/orchestrate` → `orchestrateUserMessage` → `runOrchestratorPipeline` → **one** `buildGoalSnapshot`.

### Client master context

`serializeMasterContextForApi(context, { chatScopeId })` may include:

```ts
goalSnapshotRevision: "goal_9f4ab1" // from readLastGoalSnapshotRevision — change detection only
```

- Client does **not** need to persist full `GoalSnapshot` in React state.
- `goalSnapshotRevision` on the request is **ignored** for rebuild (`mapMasterContextToSnapshotInput`).
- After each turn: `publishGoalSnapshotFromTurn(scopeId, payload.goalSnapshot)` (session cache for dock).

### API response wire

`stampGoalEngineMetadata` attaches:

- `goalSnapshot` — `serializeGoalSnapshotWire()` with `read_only: true` (no `editable`)
- `metadata.goal_snapshot_revision` — same as `sourceRevision`

### Predictive dock

- Uses `readLastGoalSnapshot(scopeId)` only.
- Forbidden: `fetchGoalSnapshot()`, client rebuild, API re-fetch for snapshot.

### Truth vs derivative

| Source of truth | Derivative (output) |
|-----------------|---------------------|
| goal-roadmap, global-brain | `GoalSnapshot` per turn |

## Compliance checklist (PR review)



- [ ] No logic moved out of goal-roadmap / global-brain / schedule-intelligence

- [ ] No second `buildGoalSnapshot` in tier, dock, or slot-collect

- [ ] No circular imports (roadmap/brain → goal-engine)

- [ ] GoalSnapshot never written back to roadmap/brain/schedule

- [ ] §6: API route does not call `buildGoalSnapshot`; wire has `read_only: true`
- [ ] §6: `goalSnapshotRevision` echoed on client request, not used to rebuild
- [ ] Tests: `npm run test:goal-engine`, `npx tsx scripts/test-global-brain.ts`, `npm run test:slot-collect`

