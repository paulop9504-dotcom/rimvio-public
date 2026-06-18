# Rimvio Architecture — Locked Decisions

> **Status:** 설계 리뷰 완료 · 구현 진행 중
>
> **관련:** [RIMVIO_PRODUCT.md](./RIMVIO_PRODUCT.md) · [RIMVIO_HANDOFF.md](./RIMVIO_HANDOFF.md)

---

## 1. 한 줄 정의

> **Rimvio = deterministic action system + AI fallback**
>
> LLM은 OS brain이 아니라 **예외 처리기(fallback brain)**.

---

## 2. 시스템 경계 (확정)

| 레이어 | 책임 | LLM? | 현재 상태 |
|--------|------|------|-----------|
| **Code Enricher (1st)** | YouTube / GitHub / Map / OG scrape / regex | ❌ | ⚠️ YouTube + generic만 |
| **LLM Intent Kernel (2nd)** | unknown URL · ambiguous intent only | ✅ | ❌ 미구현 |
| **Action Resolver** | installedApps · deep link · final href | ❌ | ⚠️ kakaomap만 (`rank-actions.ts`) |
| **Intent Rank** | context bin · CTR/skip reorder | ❌ | ✅ v1 |
| **UI** | actions[]만 렌더 | ❌ | ✅ |

### 금지

- ❌ LLM이 title/image/description hallucinate
- ❌ LLM이 deep link schema invent
- ❌ 알려진 도메인을 LLM에 맡기기 (YouTube, GitHub, Map)
- ❌ prod 응답에 `reasoning` 노출

---

## 3. 파이프라인 (Production Target)

```
URL + Context
    │
    ▼
┌─────────────────────────────────────┐
│ 1. CODE ENRICHER (deterministic)    │
│    resolveEnricher(domain)          │
│    youtube · github · map · generic │
│    + fetchPageMetadata (og head)    │
│    + extractUrlsFromText (regex)    │
└─────────────────────────────────────┘
    │
    │ confidence OK? ──yes──► Action Resolver ──► Intent Rank ──► UI
    │
    no / ambiguous
    ▼
┌─────────────────────────────────────┐
│ 2. LLM INTENT KERNEL (fallback)     │
│    unknown domain only              │
│    input: url + partial scrape      │
│    output: actions[] ONLY           │
│    debug.reasoning → dev only       │
└─────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────┐
│ 3. ACTION RESOLVER (code)           │
│    installedApps → native vs web    │
│    known deep link schemas          │
│    fallback: web URL always works   │
└─────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────┐
│ 4. INTENT RANK (code)               │
│    context bin + bin stats          │
│    pin domain primary (e.g. YT ▶)   │
└─────────────────────────────────────┘
    │
    ▼
   UI (Now / Feed)
```

---

## 4. Context Schema (확정)

```typescript
type EnricherContext = {
  hour: number;                    // 0–23, client clock
  installedApps: string[];         // "kakaomap" | "youtube" | ...
  locationCategory: "commute" | "home" | "office" | "unknown";
};
```

**규칙:**

- `locationCategory`는 **클라이언트/서버가 계산**. LLM이 추측하지 않음.
- v1: `hour` → `commute` (7–9), `night` (22–6), else `day`/`unknown`
- `installedApps` v1: mock `["kakaomap"]` → 추후 User-Agent / PWA detection

---

## 5. Output Schema (Rimvio native)

LLM / enricher 공통 출력 → `EnrichedLink`:

```typescript
type EnrichedLink = {
  url: string;
  domain: string;
  title: string;           // scrape pass-through; LLM 금지
  image: string | null;    // scrape pass-through; LLM 금지
  description: string | null;
  actions: LinkActionItem[];  // max 5 (LLM fallback: max 3)
  enricher_id: string;
  source_type: "generic" | "youtube" | "github" | "map" | "commerce" | "kakao" | "llm";
  fallback: EnricherFallback;
};

type LinkActionItem = {
  id: string;
  label: string;
  kind: "open" | "save" | "share" | "remind" | "copy" | "custom";
  href?: string;
  payload?: { icon?: string; ... };
};
```

---

## 6. 폴더 구조 (Target)

```
lib/enrichers/
  types.ts
  registry.ts              ← orchestrator: enricher → fallback? → resolver → rank
  fetch-page-metadata.ts
  extract-urls.ts
  context.ts
  generic.ts               ← OG + URL regex (Phase 1)
  youtube.ts               ← path + oEmbed (Phase 2)
  github.ts                ← /pull/, /issues/, repo (NEW)
  map.ts                   ← naver/kakao/google maps (NEW)
  commerce.ts              ← yo-go 등 (Phase 3)
  kakao.ts                 ← open.kakao.com (Phase 3)
  llm-fallback.ts          ← unknown only (L5)
  persist.ts

lib/resolvers/             ← NEW: deep link + installedApps
  index.ts                 ← resolveActions(actions, context, sourceUrl)
  deep-links.ts            ← kakaomap, youtube app, etc.
  schemas.ts               ← known app URL → native scheme

lib/intent/
  context-bin.ts           ← uses locationCategory
  rank-actions.ts
  store.ts
  track-client.ts
```

---

## 7. Domain Enricher 책임 분리

| Enricher | Path intelligence | Metadata source | Primary action |
|----------|-------------------|-----------------|----------------|
| **youtube** | `/shorts/`, `watch?v=`, youtu.be | oEmbed API | ▶️ 영상 바로 재생 |
| **github** | `/pull/`, `/issues/`, `/tree/` | og + path | 🔍 Review PR / View Issue |
| **map** | naver, kakao, google maps | og + place detect | 📍 Open Map |
| **commerce** | product path, sale params | og + price regex | 🛒 Open Product |
| **kakao** | open.kakao.com | og | 💬 Join Open Chat |
| **generic** | none | og head | 원본 열기 + desc URLs |
| **llm-fallback** | model infers | scrape partial only | 📖 Open Link (safe default) |

---

## 8. LLM Fallback Contract

**Trigger:** `genericEnricher` returns low confidence OR only "원본 열기" with empty metadata.

**Input:**

```json
{
  "url": "https://...",
  "scrape": { "title": "...", "description": "..." },
  "context": { "hour": 8, "installedApps": ["kakaomap"], "locationCategory": "commute" }
}
```

**Output (prod):**

```json
{
  "payload": {
    "actions": [
      { "label": "📖 Open Link", "kind": "open", "href": "..." }
    ]
  }
}
```

**Output (dev, `DEBUG_INTENT=1`):**

```json
{
  "payload": { "actions": [...] },
  "debug": { "reasoning": "...", "inferredIntent": "read" }
}
```

**Constraints:**

- Max 3 actions
- Never output title/image (use scrape)
- Prefer `"📖 Open Link"` over hallucination
- Deterministic > creative

---

## 9. Action Resolver Contract

```typescript
resolveActions(
  actions: LinkActionItem[],
  context: EnricherContext,
  sourceUrl: string
): LinkActionItem[]
```

**Examples:**

| Condition | Input action | Resolved |
|-----------|--------------|----------|
| kakaomap installed + place URL | Open Map (web) | 카카오맵 바로 열기 (deep link) |
| kakaomap not installed | Open Map | web URL (unchanged) |
| youtube app installed | ▶ Watch Video | youtube:// or intent (TBD) |
| unknown app | any | web URL fallback |

Deep link schema는 **resolver 코드에만** 존재. LLM은 web URL만 반환.

---

## 10. 현재 코드 vs Target Gap

| 항목 | 현재 | Target |
|------|------|--------|
| Domain enrichers | youtube, generic | + github, map, commerce, kakao |
| YouTube metadata | og scrape (실패) | oEmbed API |
| Action resolver | inline in generic/rank-actions | `lib/resolvers/` |
| LLM fallback | 없음 | `llm-fallback.ts` |
| locationCategory | 없음 | EnricherContext 확장 |
| reasoning in prod | N/A | 금지 (debug only) |

---

## 11. 구현 순서 (ROI)

```
Phase A — Code only (no LLM)
  1. EnricherContext + locationCategory
  2. lib/resolvers/ (kakaomap deep link 통합)
  3. youtube oEmbed
  4. github.ts path enricher
  5. map.ts path enricher

Phase B — LLM fallback
  6. llm-fallback.ts + confidence gate in registry
  7. DEBUG_INTENT debug.reasoning

Phase C — Commerce / Kakao
  8. commerce.ts, kakao.ts
```

---

## 12. Locked Product Decisions

1. **Share → Now → Done** — LLM latency가 Now UX를 깨면 fallback skip
2. **3초 목표** — code enricher < 1s; LLM only when needed
3. **SaaS moat** — domain enricher = pluggable module, LLM = commodity fallback
4. **Rimvio 철학** — LLM은 사용자에게 보이지 않음. 버튼만 보임.

---

*2026-05-25 — Architecture locked after design review*
