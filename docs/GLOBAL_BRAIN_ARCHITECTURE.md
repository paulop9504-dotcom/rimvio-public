# Global Brain architecture

Global Brain is **context assembler only**. It does not own time decisions, vitality classification, event-horizon detection, or orchestrator routing.

## Responsibilities

| Module | Owns |
|--------|------|
| `lib/global-brain/assemble-global-brain-context.ts` | `shouldEnrich` + `assembleGlobalBrainContext` → prompt block |
| `lib/global-brain/build-context-injection-block.ts` | Stitch protocols + snapshot JSON for LLM |
| `lib/global-brain/gather-turn-context.ts` | **Orchestration only** — calls specialists, returns `TurnContextGatherResult` |
| `lib/global-brain/run-global-brain-middleware.ts` | `gatherTurnContext` → `assembleGlobalBrainContext` |

## Not Global Brain (moved out)

| Concern | Module |
|---------|--------|
| Event horizon insights | `lib/event-horizon/build-life-context-snapshot.ts` |
| Proactive horizon nudge | `lib/event-horizon/orchestrate-proactive-nudge.ts` |
| Vitality / emotion | `lib/vitality-state/*` |
| Time expression | `lib/time/temporal-resolver.ts` |
| Context resolver (JIT blocks) | `lib/context-resolver/*` |
| Time decision prompt | `lib/time-decision/*` |

## Turn flow

```text
gatherTurnContext()
  ├─ vitality-state (LLM classify)
  ├─ temporal-resolver
  ├─ event-horizon (snapshot + detectEventHorizon)
  ├─ preference / nexus / action-event extract
  └─ optional proactive nudge (event-horizon)

assembleGlobalBrainContext()
  └─ buildGlobalBrainContextBlock()  ← only assembly
```

## GOAL Engine

`build-goal-snapshot.ts` reads `buildLifeContextSnapshot` from event-horizon. GOAL must not reimplement horizon detection.
