# Rimvio canonical loop — untangled & reassembled

**Version:** `canonical-loop.v1`  
**Companion:** [RIMVIO_INSIDE_OUT_MAP.md](./RIMVIO_INSIDE_OUT_MAP.md) (Inside Out names)  
**Code:** `lib/inside-out/canonical-loop.ts`, `marble-commit.ts`, `marble-ingest.ts`

This doc **untangles** parallel paths that felt like one product but were **five half-loops**, then **reassembles** them into a single circuit aligned with **B2C Life Log + B2B2C Talk Assistant + Wearable (future)**.

---

## 1. What was tangled (꼬임)

| # | Symptom | Cause |
|---|---------|--------|
| T1 | 피드에 「오늘 일정 확인」 + 채팅 + 톡이 각자 “다음 행동” 제안 | **3개 본부** — fallback Surface, orchestrator bubbles, peer talk UI |
| T2 | 대화했는데 피드 카드가 안 바뀜 | **SENSE 분리** — 톡은 SSOT 안 타고, 채팅만 orchestrator wire |
| T3 | `@알림` 했는데 Surface도 뜸 | **Express lane vs HQ** 경계 없음 |
| T4 | 기억이 여러 개인 것 같음 | **3 stores** — Event SSOT, Surface Memory (action keys), Learning obs + Synapse |
| T5 | 눌렀는데 학습이 이상함 | **Plasticity 분산** — UI가 learning 직접 import (금지), 일부만 bridge |
| T6 | B2C/B2B2C/웨어러블이 한 제품인지 불명 | **비즈 3축**이 코드 레이어에 안 매핑됨 |

None of these are “wrong modules” — they were **missing layer order**.

---

## 2. Reassembled: one loop, five layers

```mermaid
flowchart TB
  subgraph sense [SENSE — 구슬만 쓴다]
    PT[Peer talk send]
    OR[Orchestrator wire]
    FC[feed_chat detect — P1]
    PT --> MI[ingestPeerTalkMarble / ingestMarbleWire]
    OR --> MI
    MI --> CM[commitMarbleWire]
    CM --> SSOT[(Event SSOT)]
  end

  subgraph remember [REMEMBER — read only]
    SSOT --> LIFE[readLifeProjections]
    LIFE --> TL[Threadline / calendar projection]
  end

  subgraph decide [DECIDE — 본부 1개]
    LIFE --> SE[Surface Engine + collapse]
    MEM[Surface Memory read] --> SE
    SYN[Synapse read] --> SE
    LR[Learning weights read] --> SE
    SE --> HQ[FEED Primary 1 CTA]
  end

  subgraph act [ACT]
    HQ -->|tap| EX[execution-dispatcher]
    EL[@ express lane] --> LOC[local mention turn]
  end

  subgraph learn [LEARN — write after ACT]
    EX --> PL[memory + learning + synapse]
    HQ -->|ignore timer| SB[surface-ignore-bridge]
    SB --> PL
    PL --> SSOT
  end
```

### Layer rules (hard)

| Layer | May write | May NOT |
|-------|-----------|---------|
| **SENSE** | `commitMarbleWire` only | Surface rank, synapse, UI selection |
| **REMEMBER** | SSOT via SENSE only | Ad-hoc `upsertEventCandidate` from UI |
| **DECIDE** | — (pure read + collapse) | Append memory, call learning |
| **ACT** | Enqueue execution / express lane UI | Change Event lifecycle without truth commit |
| **LEARN** | memory, learning ingest, synapse | Re-rank surfaces on read |

---

## 3. Business 3-axis → one loop (제조립)

| Business | Layer emphasis | Rimvio today |
|----------|----------------|--------------|
| **B2C Life Log** | SENSE + REMEMBER + LEARN (islands) | Event SSOT, threadline, patterns — **루틴 태그·주간 코치 알림 P1** |
| **B2B2C Talk Assistant** | SENSE (`peer_talk`) + DECIDE + ACT | Peer marble ingest, user core label, HQ card — **파트너 예약 P2** |
| **Wearable / hands-free** | SENSE ingress slot | `MarbleIngressChannel` + `voice` **reserved P2** — same `commitMarbleWire` |

All three share **the same loop**; only **ingress channel** and **downstream commerce** differ.

---

## 4. Ingress routing (composer / feed)

```
User input
  ├─ Peer talk session active & not @  → SENSE peer_talk (no orchestrator)
  ├─ @알림 @타이머 …                    → ACT express lane (skip HQ)
  ├─ Orchestrator response + wire       → SENSE orchestrator
  └─ else                               → chat UI only until wire/marble exists
```

Functions: `shouldRouteToPeerTalkIngress`, `isExpressLaneTurn` in `canonical-loop.ts`.

**Headquarters:** `hasActiveDecisionStream` — no `surface:rimvio:*` fallback on feed.

---

## 5. Three “memories” — one role each

| Store | IO name | Role |
|-------|---------|------|
| **Event SSOT** | 구슬 → 핵심 | What happened / was said (life log source) |
| **Surface Memory** | 야간 정리 (action) | Which HQ actions finished or dismissed |
| **Synapse + Learning** | 섬 + 가소성 | What to promote or demote next time |

Do not merge stores. **REMEMBER** reads SSOT; **LEARN** updates action/synapse stores after **ACT**.

---

## 6. Joy vs Sadness (product policy)

| | Joy | Sadness |
|--|-----|---------|
| **Engine** | primary CTA, execute success | ignore, dismiss, `learningPaused` |
| **Copy** | success phase, core label | “나중에 다시 꺼낼 수 있어요” |
| **Rule** | Never delete marble on ignore | Demote score / weaken synapse only (P1-2) |

---

## 7. Code map (after reassembly)

| Path | Entry |
|------|--------|
| Peer talk marble | `sendFeedPeerTalkInFeed` → `ingestPeerTalkMarble` |
| Orchestrator marble | `applyEventCandidateUpsertFromApi` → `ingestMarbleWire(channel: orchestrator)` |
| Detect + commit | `ingestConversationMarble` (peer_talk \| feed_chat) |
| HQ render | `useRealtimeSurfaceComposition` → `hasActiveDecisionStream` |
| Plasticity | `execution-dispatcher`, `surface-ignore-bridge` |

---

## 8. P0 done / P1 queue

| ID | Status |
|----|--------|
| Single marble write (`commitMarbleWire`) | **Done** |
| Peer talk → SSOT | **Done** |
| User core CTA label | **Done** |
| Sadness-toned ignore | **Done** |
| HQ hides fallback | **Done** |
| feed_chat SENSE without orchestrator | P1 |
| Main chat duplicate-safe marble | P1 |
| Island labels in UI | P1 |
| Wearable ingress channel | P2 |

---

## 9. Slim cut (applied)

See **`docs/PROJECT_MARBLE_SLIM_CUT.md`** — 40+ @ tokens → 22; timer/focus/utilities removed from dispatch.

## 10. Verify

```bash
npm run test:slim-protocol
npm run test:inside-out-p0
npm run test:rimvio-v1-core
```

---

## 10. Mental model (one sentence)

**말과 행동은 구슬(SSOT)로만 들어오고, 피드 본부는 기억을 읽어 행동 하나만 내밀며, 누르거나 무시하면 그때만 학습한다 — 채팅 @명령은 본부 옆 고속도로다.**
