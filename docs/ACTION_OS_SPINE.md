# Action OS Spine — Active Focus & Frozen Backlog

> **Status:** locked 2026-06-02  
> **Rule:** `.cursor/rules/action-os-spine.mdc`

---

## One spine (only this loop)

```
Context (calendar · notification · chat · link)
    → @ Action Contract Registry (intent lock)
        → Proactive prep surface (MAIN 1 + AUX)
            → Archive fold + telemetry
                → Learning rollup → MAIN ranking
```

All active work must fit this loop. Nothing else ships until the vertical slice is end-to-end.

---

## Active pillars (in order)

| # | Pillar | Scope | Key modules |
|---|--------|-------|-------------|
| 1 | **@ = Action Contract Registry** | App Intents–style feature units: `featureId`, slots, MAIN resolver, `sourceRef`, confirm copy | Extend `lib/event-kernel/action-contracts/`, new `@` mention registry + chat ingress |
| 2 | **Proactive = prep surface SSOT** | Sharpen domain + MAIN on existing prep/calendar — no new suggestion surfaces | `lib/calendar/build-action-calendar.ts`, `build-tiered-event-overlay-actions.ts`, prep surface |
| 3 | **Context (fixed axes)** | Maintain only: calendar, notification, chat, link ingest | `link-reminder-ingest`, `notification-ingest`, `chat-scheduled-ingest`, `readExistingSchedule` |
| 4 | **Archive → ranking loop** | Fold → rollup → affects next MAIN order | `lib/archive/*`, hook rollup into MAIN resolver |

### Phase 6 entry (next build)

1. `@` mention registry schema + chat `@` parser — **done** (`mention-feature-registry`, `parse-action-mention`)
2. `@featureId` → action contract / EventCandidate ingress — **done** (`resolveContractActionFromMessage`, contract gate)
3. Rollup `scoreDelta` read in MAIN resolver — **done** (`resolve-rollup-history-weight`, prep surface chain)

---

## Frozen backlog (do not start)

Push back until spine vertical slice ships:

| Item | Notes |
|------|--------|
| **Life Replay / archive UI** | Archive store exists; no past-view UI or replay timeline |
| **Server-side archive sync** | Client-only archive/rollup for now |
| **Screen ambient / vision context** | No Astra-style screen reading |
| **New ingest path (5th axis)** | Four context axes are enough — no new `sourceRef` families |
| **Domain LLM action candidate expansion** | Freeze until `@` registry maps `featureId` → contract |
| **Silent Ghost / Figma bridge** | Separate repo — see `rimvio-isolation.mdc` |

---

## Non-overlap rules

1. **Single ingress SSOT** — `@` or NL chat both land on EventCandidate + action contract; no parallel event stores.
2. **No fifth context axis** — calendar / notification / chat / link only; extend existing ingest, do not add new families.
3. **Proactive = prep surface only** — sharpen MAIN/AUX on existing calendar overlay; no new “suggestion” panels or feeds.
4. **Ranking reads rollup on MAIN resolve only** — `lib/archive/learning-rollup-store` is the ranking input; do not duplicate stats elsewhere.
5. **Registry before LLM expansion** — no new `generateActionCandidatesSync` domains until `@` registry lists the feature.
6. **Archive write path only for fold** — UI does not read archive for live suggestions; live = EventCandidate + rollup scores.
7. **Separate repos stay separate** — no Ghost/Figma patterns imported into Rimvio.

---

## What stays (substrate — do not cut)

- EventCandidate SSOT + lifecycle + fold gate  
- Confirm / slot collect (`contract-gated-execution`)  
- Telemetry 4 kinds (shown / clicked / executed / dismissed)  
- NL ingress fallback (same contract as `@`)  
- Existing `/archive` route — no Life Replay redesign

---

## Out of scope checklist (reject in review)

- [ ] New ingest `sourceRef` beyond the four axes  
- [ ] Archive or Life Replay UI work  
- [ ] Server sync for archive/telemetry  
- [ ] Vision / screen / ambient context modules  
- [ ] New LLM action domains before `@` registry  
- [ ] Cross-repo Ghost/Figma integration  
- [ ] Second proactive surface (feed/stack/now suggestion redesign)
