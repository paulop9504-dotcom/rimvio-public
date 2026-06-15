# Orchestrator & client turn OS layers

Monolith files were split into **intent → routing → execution** (not a single “brain” file).

## Server (`lib/action-chat/orchestrator/`)

| Layer | Module | Role |
|--------|--------|------|
| **Entry** | `run-orchestrator-pipeline.ts` | Build base → early decision → standard pipeline |
| **Routing** | `resolve-orchestrator-decision.ts` | Pre-pipeline tree; first match wins |
| **Execution** | `run-orchestrator-standard-pipeline.ts`, `orchestrator-pipeline-base.ts` | Shell finalize, presentation layers, kernel meta |
| **Intent (local)** | `parse-find-place-intent`, classifiers, contract action | Used inside routing branches |

`routing/` holds probe types and a re-export stub; probe files will move behind `PRE_PIPELINE_PROBE_ORDER` once split is stable.

## Client (`lib/action-chat/turn/` + `hooks/use-action-chat.ts`)

| Layer | Module | Role |
|--------|--------|------|
| **Intent** | `turn/parse-turn-intent.ts` | Trim text, attachments, chat axis |
| **Routing** | `turn/route-client-turn.ts` | Route kinds (hook still dispatches; types document surface) |
| **Execution** | `turn/execute-orchestrate-turn.ts` | POST `/api/chat/orchestrate` + apply payload |

Early exits (peer talk, focus, command OS, review, mentions) remain in `sendMessage` until moved into `route-client-turn` handlers.

## Tests

- `npx tsx scripts/test-routing-patches.ts`
- `npx tsx scripts/test-ux-guards.ts`
- `npx tsx scripts/test-chat-three-axis.ts`
