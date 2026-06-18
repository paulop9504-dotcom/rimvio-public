# Rimvio Source of Truth



## One life-state SSOT



**Event Candidate store** — `lib/events/event-store.ts` (`rimvio-event-candidates.v1`)



All schedule, timeline, predictive-dock anchors, and orchestrator `existingSchedule` / `allReminders` **project from this store**.



```

write → lib/source-of-truth/commit-truth.ts only

        └─ event-store (storage)

read  → listEventCandidates → projections

```



Public facade: `lib/source-of-truth/index.ts`



## Layer rules (write path removed / narrowed)



| Layer | Allowed | Forbidden |

|-------|---------|-----------|

| **commit-truth** | `commitEventUpsert`, `commitEventLifecycle`, `commitEventWireFromApi` | — |

| **Ingest adapters** | Call commit-truth (`event-ingest-pipeline`, `link-reminder-ingest`, `chat-scheduled-ingest`, `notification-ingest`, `event-lifecycle-runner`, `action-event-store`) | Direct `event-store` upsert/transition |

| **schedule** | `projectScheduleFromTruth`, `readExistingSchedule` (pure) | `upsert*`, ingest on read |

| **timeline-projection** | Display only — `projectTimelineDisplayFromRoutes`, `composeTimelineProjection` ([TIMELINE_PROJECTION.md](./TIMELINE_PROJECTION.md)) | Any SSOT write; decision/schedule/dock must not import timeline |

| **goal-engine** | `buildGoalSnapshot`, `publishGoalSnapshotFromTurn` (turn cache) | Event/roadmap/brain writes |



Boundary test: `npx tsx scripts/test-write-path-boundary.ts`

Schema lock (event / edges / mutations): `npm run test:event-kernel-schema-lock` — see `docs/EVENT_KERNEL_SCHEMA_LOCK.md`

Timeline display boundary: `npm run test:timeline-read-only-boundary` — see [TIMELINE_PROJECTION.md](./TIMELINE_PROJECTION.md)



## API convergence



| Layer | Rule |

|-------|------|

| Client | `serializeTruthForMasterContext()` → `syncLinkRemindersToEventStore()` then embed `eventCandidates[]` |

| Server | `resolveMasterContextFromTruth()` hydrates memory SSOT, **ignores** client `existingSchedule` when `eventCandidates` present |

| Orchestrator | `masterContextFromApiPayload()` → truth resolver only |



## Write paths (allowed)



1. **`commit-truth.ts`** — sole exported write API

2. **Ingest adapters** — schedule signals, link reminders, chat-scheduled, notifications, lifecycle runner, action events

3. **Client apply** — `commitEventWireFromApi` after orchestrate (or deprecated `applyEventCandidateUpsertFromApi`)

4. **Satellite sync** — `syncLinkRemindersToEventStore()` before API serialize only



## Not life-state SSOT (satellite)



| Domain | Store | Role |

|--------|-------|------|

| Chat UI messages | `lib/action-chat/chat-store.ts` (sessionStorage) | Conversation transcript |

| User goals | `lib/goal-roadmap/goal-roadmap-store.ts` | Preferences / roadmap |

| User status | `lib/global-brain/user-status-store.ts` | Vitality / status |

| GoalSnapshot | `lib/goal-engine/` | **Derived** constitution per turn |



Satellites must not define calendar truth; they may inform hints only.



## Goal Engine



`GoalSnapshot` remains a **read-only aggregate** (see `docs/GOAL_ENGINE_ARCHITECTURE.md`). Schedule input for `buildGoalSnapshot` comes from truth projections in master context, not parallel schedule arrays.

