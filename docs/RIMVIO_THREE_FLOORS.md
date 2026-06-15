# Rimvio Three Floors (UI Stack)

> **SSOT:** Main-screen architecture — **Replay → Context → Action**. Not search-first, not chat-first.
>
> **Related:** [RIMVIO_EXPERIENCE_LAYERS.md](./RIMVIO_EXPERIENCE_LAYERS.md) (data intelligence) · [RIMVIO_CONSTITUTION.md](./RIMVIO_CONSTITUTION.md)

---

## Why three floors

The market has plenty of:

| Category | Examples |
|----------|----------|
| **Execution apps** | Maps, delivery, booking |
| **Photo apps** | Camera roll, albums |
| **AI chatbots** | Generic Q&A, recommendations |

Almost nobody ships:

> **Replay my experience → explore its context → act only if I want**

Rimvio's moat is not `@길찾기`. It is **life replay + context exploration** that compounds over time.

**Competitive frame (mature):** Not vs ChatGPT or KakaoMap — vs **the user's own memory**. SNS, calendar, and notes become inputs; the product is *"where my life stacks up and plays again."*

---

## The stack (immutable top → bottom on Feed)

```text
┌─────────────────────────────────────┐
│  1층 REPLAY   — Feed hero           │
│  🌍 핑 · ▶ 쇼츠 · 한 줄 캡션         │
├─────────────────────────────────────┤
│  2층 CONTEXT  — explore, don't chat │
│  사람 · 경험 · 장소 · 시간            │
├─────────────────────────────────────┤
│  3층 ACTION   — weak until invited  │
│  길찾기 · 일정 · 공유 · @            │
└─────────────────────────────────────┘
```

**Law:** User must **feel Floor 1 before Floor 3**. Action without replay = generic assistant ("박명수").

---

## Floor 1 — Replay (Feed)

**User feels:** *"내 삶이 다시 재생된다."*

| Element | Role |
|---------|------|
| **🌍 Globe pins** | Classified FACT on map — photo · video · GPS · dwell |
| **▶ Shorts** | Insta/Reels-ratio playback of saved photo/video |
| **한 줄 캡션** | FACT-only line — e.g. `2026년 여름에 민수랑 제주` |

**Not the hero (future main screen):**

- ❌ Search box as home
- ❌ Chat thread as home
- ❌ Generic recommendation list as home

**Ingress stays secondary:** Search tab = **수집** (capture). ROOM = chat + execute-on-tap. Neither replaces Floor 1.

**Code (2026-06):** `FeedExperienceRecallHero` · `SpatialGlobeStage` + `classifiedPins` · `ExperienceRecallShortsStage` · `buildExperienceRecallCaption`

**Maturity:** ✓ MVP path shipped — demo + uploaded media

---

## Floor 2 — Context (explore)

**User feels:** *"그 경험의 맥락을 탐험한다."*

| Axis | Question |
|------|----------|
| **사람** | Who was I with? |
| **경험** | What situation / trip? |
| **장소** | Where on the map? |
| **시간** | When — season, day, gap-since |

**UX:** Compact summary + tiny buttons (`사람 N` · `경험 N`) → inline related experience list. Tap → switch recall on Floor 1.

**Timing law:** Context surfaces on Feed and before trip / `@` — not spammed inside casual ROOM chat.

**Code (2026-06):** `FeedRelatedContextStrip` · `resolve-slot-related-context` · Search `context_search` (optional active lookup) · `splitContextSearchQuery` (people vs experience)

**Maturity:** ✓ People · Experience axes · △ Place/time as first-class chips · △ MEANING labels

---

## Floor 3 — Action (when ready)

**User feels:** *"필요하면 행동까지 이어진다."*

| Action | When |
|--------|------|
| **길찾기** | After experience selected + verify (where required) |
| **일정 만들기** | Plan proximity, peer context |
| **공유** | Experience node handoff |
| **@** | Context-gated — `run=mention`, not generic Search AI |

**Law:** Floor 3 is **thin and replaceable**. Providers (Kakao, calendar) swap; Floors 1–2 are the asset.

**Code (2026-06):** `FeedExperienceRunChips` · `feed-verify-recommendation-gate` · `run=mention` Search path

**Maturity:** ✓ Context-gated @ — UI must stay visually **below** replay, not above

---

## Future main screen (north star UI)

As MEANING + RECALL compound, `/feed` approaches:

| Present | Absent as hero |
|---------|----------------|
| ⭕ Globe pins | ❌ Search-first |
| ⭕ Shorts | ❌ Chat-first |
| ⭕ One-line caption | ❌ Recommendation feed |
| ⭕ Related context (Floor 2) | ❌ Generic AI suggestions |

User category shift:

```text
생산성 앱 / AI 앱  →  "내 삶이 쌓여서 다시 재생되는 곳"
```

---

## Map: Three Floors ↔ Experience Layers

| UI Floor | Data layers consumed |
|----------|----------------------|
| **1 Replay** | FACT → EXPERIENCE → RECALL (expression) |
| **2 Context** | EXPERIENCE → MEANING (partial) · peer/place/time projection |
| **3 Action** | ACTION (orchestrator · capabilities) |

Data stack order remains `FACT → … → ACTION`. UI floors are **how the user climbs** that stack — never skip Floor 1.

---

## PR / review law

| Change | Must answer |
|--------|-------------|
| New Feed hero UI | Which floor? Default = **1 Replay** |
| New suggestion surface | Reject if it replaces Shorts/Globe as hero |
| New chat on Feed | Reject — chat is ROOM ingress |
| New generic AI on Search | Reject — Search = 수집 |
| Action button prominence | OK only **after** recall + context visible |

**Final test:**

> Does this help the user **replay and explore** before asking them to **act**?

- **No** → wrong floor.
- **Yes** → ship.
