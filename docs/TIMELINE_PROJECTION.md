# Timeline Projection (display only)

Timeline is a **read-only view** over container routes. It never writes Event SSOT, schedule, or dock state.

## One-way flow (no cycles)

```text
Event SSOT (commit-truth only)
    ↓ read
Decision stack → listDisplayRoutesFromStore() → ContainerRoute[]
    ├─→ projectTimelineDisplayFromRoutes()   (timeline UI)
    ├─→ composeDockFeed()                      (dock UI)
    └─→ composeActionProjection()            (action chips — parallel, not timeline → decision)

Schedule: projectScheduleFromTruth() — reads SSOT directly, never mutates timeline.
```

## Forbidden cycles (rejected in CI)

| Pattern | Why |
|---------|-----|
| Timeline → decision input | Display must not feed opportunity/behavior/routing |
| Schedule → timeline write | Schedule is SSOT projection only |
| Dock → schedule write | Dock is display; writes go through commit-truth only |
| Timeline → any `commit*` / `ingest*` | `test-timeline-read-only-boundary.ts` |

## Public API

Import from `@/lib/timeline-projection` only:

- `composeTimelineProjection(routes, resolveEvent, ctx)` — pure
- `projectTimelineDisplayFromRoutes(routes, resolveEvent, ctx)` — pure
- `listTimelineProjectionFromStore(ctx)` — convenience (runs decision read once)

Decision layers must use `listDisplayRoutesFromStore` from `@/lib/projection-stack` and fan out — not import timeline list helpers.

## Tests

```bash
npm run test:timeline-read-only-boundary
npm run test:write-path-boundary
npm run test:timeline-projection
```
