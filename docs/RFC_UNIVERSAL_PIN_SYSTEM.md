# RFC — Universal Pin System

> **Status:** accepted 2026-06 · **Ship phase:** P3 (`PIN_DOMAIN_SHIP_PHASE = 3`)  
> **Code:** `lib/globe/pin-entity.ts` · `lib/globe/pin-domain-registry.ts`  
> **Story Layer:** user says *흔적* (L1); code says `PinEntity` (L3)

---

## Thesis

Rimvio is **not** merging marketplace, travel, property, and meetup apps.

Rimvio is an **Experience OS** that expresses the physical world through one **Universal Pin** substrate.  
Markets and verticals are **domain projections** on the same pin — not separate data models or form apps.

**Emotional ship order:** memory → discovery → together → trade → life infrastructure.

---

## Non-negotiables

1. **Truth SSOT = `EventCandidate`** (+ feed captures). Pin is **projection**, not root truth.
2. **Globe = renderer.** Pins = spatial read model indexed by `eventId`.
3. **One composer ingress** — ingest bar + create sheet → same commit path.
4. **Deterministic domain classify first**, LLM gap-fill second (Action OS spine).
5. **Domain + scope ship on product phases P1–P5** — see roadmap below.
6. **Default scope = `internal`** until P2 (`globeContextVisibility: private`).

---

## Product phases P1–P5 (canonical)

| Phase | `domainId` | `scope` | User feels | Story (L0) |
|-------|------------|---------|------------|------------|
| **P1** ✓ now | `experience` | **internal** | 내 흔적 | You were here. And it mattered. |
| **P2** | `experience` | **external** | 타인 흔적 **발견** | Every place has a story… |
| **P3** | `gathering` | external (+ invite) | 같이 가기 · 번개 · 동행 | 함께 남기기 |
| **P4** | `market` | external | 거래 | (no 「중고 앱」 hero) |
| **P5** | `service` · `property` · `job` | external | 생활 OS slots | domain cards only |

### Critical distinctions

- **P2 is not a new domain** — same `experience`, flip `scope` to external read/discovery.
- **P3 is the first new active domain** after experience.
- **`travel` is not a product phase** — trip legs stay `experience` + trip metadata overlay.
- **Inferred stubs** (e.g. market text in P1) → metadata only; stub card OK; no marketplace UI until that phase.

### Phase gates (code)

```ts
PIN_DOMAIN_SHIP_PHASE = 1   // bump at P2 scope, P3 gathering, …

resolveActivePinDomainId(inferred)  // domain commit gate
resolveActivePinScope(requested)    // external gate: P2+
```

When shipping a phase:

1. Bump `PIN_DOMAIN_SHIP_PHASE`
2. Flip registry `phase: "active"` for new domain(s)
3. Enable scope/features in RFC checklist — no vertical form apps

---

## Layer model

```text
FACT (capture · GPS · photo · memo)
  → EventCandidate (truth node)
    → PinEntity (unified spatial projection)
      → Domain card (experience · gathering · market · …)
        → @ actions (registry)
```

| Layer | Type | Role |
|-------|------|------|
| Truth | `EventCandidate` | Lifecycle, title, place, datetime, metadata |
| Spatial | `PinEntity` | lat/lng, domainId, scope, slots, media counts |
| Globe UI | `PinCluster` / `ClassifiedGlobePin` | Render adapter (wrap PinEntity) |
| Feed | Same `eventId` | Time-ordered replay — not a competing store |

---

## PinEntity (canonical projection)

```ts
PinEntity {
  id: string              // pinId
  eventId: string         // required FK to truth
  domainId: PinDomainId   // registry key
  scope: PinScope         // internal | external
  title: string
  content?: string
  location: { lat, lng, placeLabel }
  author: { userId?, displayName? }
  media: { photoCount, videoCount }
  createdAtIso: string
  startedAtIso?: string
  slots: Record<string, unknown>
  recallLine?: string
}
```

**Not pin types:** `person`, `place` — context axes (people filter, place label, datetime).

---

## Domain registry

| domainId | activatesAt | Phase | Notes |
|----------|-------------|-------|-------|
| `experience` | P1 | **active** | Trace, recall, MEANING |
| `gathering` | P3 | stub → active | Meetup, flash, companion |
| `market` | P4 | stub → active | Price slots, `@중고` |
| `service` | P5 | stub → active | Local services |
| `property` | P5 | stub → active | Rent/deposit slots |
| `job` | P5 | stub → active | Hiring/gig slots |
| `travel` | — | **overlay only** | Never `pinDomainId`; trip metadata on experience |

Adding category #500 = **new registry row**, not new app schema.

---

## Metadata keys (on EventCandidate)

| Key | Purpose |
|-----|---------|
| `pinDomainId` | Active domain (gated by ship phase) |
| `pinInferredDomainId` | Future stub domain when classified early |
| `pinSlots` | Extracted domain slots |
| `globeContextVisibility` | `private` (internal) · `external` from P2 |

---

## Composer flow (production)

```text
User text / photo / memo
  → classifyPinDomain (deterministic)
  → resolveActivePinDomainId + resolveActivePinScope
  → extractPinSlots
  → commit EventCandidate + stamp metadata
  → sync personal pin → project PinEntity → Globe
```

**No** category picker. **No** vertical forms.

Example `"아이폰 17 팔아요. 70만원"` in **P1–P3**:

- `pinInferredDomainId: market`, slots with price
- **committed** as `domainId: experience`, `scope: internal`
- L1: *흔적 남기기* — not 「중고 등록」

---

## Per-phase deliverables

### P1 ✓ (shipped)

- PinEntity projection · domain registry · classify · stamp
- experience + internal only
- Ingest bar · stack picker · inferred stub card (quiet)
- `@market` mention → toast stub (no UI)

### P2 — experience + external ✓ (2026-06 slice)

- [x] `PIN_DOMAIN_SHIP_PHASE = 2` · `resolveActivePinScope` external write
- [x] Migration `036_external_globe_traces.sql` · RLS read external
- [x] `GET /api/globe/external-traces` · merge on globe hub
- [x] **흔적 공개하기** toggle on pin sheet
- [x] External stack/card copy · read-only external tap
- [x] Pioneer cell hint on first publish
- [ ] Author display name on external traces (profile join)
- [ ] Tile/cell index at scale
- [ ] ❌ marketplace · like counts · public feed scroll

### P3 — gathering

- [x] `gathering` registry `active` · `PIN_DOMAIN_SHIP_PHASE = 3`
- [x] `@모임` contract · gathering-compose ingest · slot extract (time · headcount)
- [x] Light lineage (`pinLineageParentEventId`) when attaching to open context
- [x] Gathering trace hint card (no RSVP)
- [ ] ❌ RSVP lists · chat replacement

### P4 — market

- [ ] `market` registry `active`
- [ ] `@중고` action contract · price/condition confirm
- [ ] External listing read on map
- [ ] ❌ payment · escrow · star ratings

### P5 — service · property · job

- [ ] Registry activate P5 domains one-by-one
- [ ] Slot confirm UI per schema
- [ ] ❌ vertical form apps

---

## Globe ↔ Pin ↔ Feed

| Surface | Reads | Writes |
|---------|-------|--------|
| Globe hub | `buildPersonalPinProjectionIndex` → PinEntity | — |
| Platform API | `GET /api/globe/pins?bbox=` | sync index rows |
| Stack picker | PinCluster adapter | — |
| Ingest bar | — | composer + stamp |
| Feed replay | `eventId` | captures |
| `@` | domain + action registry | contracts |

---

## Scale (100M)

- Single EventCandidate write path
- **PinProjectionIndex** — materialized read model (`lib/globe/pin-projection-index-*`)
- **`GET /api/globe/pins`** — bbox · near · personal + `includeExternal` layer
- Domain = registry plugin
- External = scope + ACL on same PinEntity
- Migration **037** — owner geo index + `cell_key` on `personal_globe_pins`

---

## PR checklist

- [ ] Write path uses universal pin stamp
- [ ] `eventId` required on every PinEntity
- [ ] No vertical form components
- [ ] Domain classify tested · phase gate respected
- [ ] L1 copy (Story Layer) — no 「중고 앱」「소셜」 onboarding
- [ ] Phase bump updates `PIN_DOMAIN_SHIP_PHASE` + registry `active`

---

## Related

- `docs/RIMVIO_CONSTITUTION.md`
- `docs/RIMVIO_STORY_LAYER.md`
- `docs/ACTION_OS_SPINE.md`
- `.cursor/rules/rimvio-story-layer.mdc`
