# Context Integration — 1:1 Only (Rules + Memory → LLM Fallback)

**Status:** DESIGN → **Cloud v1 LAUNCH scope** (Pinned 5 + Context Rail)  
**Scope:** **1:1 대화만** (그룹채팅·화자 분리·정산 N인 — **배제**)  
**Deployment:** **클라우드 출시** — Pinned full log·`@친구`·Context Rail **v1 포함** (플러그인 마켓·퀀트·HFT는 이후)  
**Related:** [PLATFORM_OS_ARCHITECTURE.md](./PLATFORM_OS_ARCHITECTURE.md) · [RIMVIO_ARCHITECTURE.md](./RIMVIO_ARCHITECTURE.md) · `lib/event-kernel/memory/`

---

## 1. 한 줄

> 턴마다 **규칙 + 메모리**로 상황을 적분하고, **한계치**에 닿거나 **추론이 꼭 필요할 때만** LLM을 켠다.  
> 무엇을 보여줄지·실행할지는 여전히 **`composeDecision`만** 결정한다.

---

## 2. 범위 (v1 고정) — **친구 무제한 + AI 핀 5**

> **확정 정책:** [PEER_SOCIAL_POLICY.md](./PEER_SOCIAL_POLICY.md)  
> 친구 **무제한** 추가 · **AI 핀 5** (full log · `@import` · 렌즈) · 비핀 = 로컬 대화만.

| 포함 | 배제 |
|------|------|
| **친구 목록 무제한** + **AI 핀 5슬롯** 허브 | 카톡 클론 무한 목록 UI |
| **핀된 친구** — full log · `@이름` · 렌즈 | **단톡** (v2 — 방 AI 1명 · 방 렌즈) |
| **비핀 친구** — 로컬 대화 저장 | 비핀 `@import` · 렌즈 |
| 핀 해제 → 7일 후 대화 삭제 · **연락처 유지** | Outer·휘발 (5방 제품) |

**홈 UX:** 중앙 **나** + **5슬롯 허브**(방사형, HI-FIVE 레이아웃 참고 · **iOS 화이트톤** `#f2f2f7`) — 빈 칸 탭해 배정 · 채운 칸 탭해 방 입장. 별도 카톡 목록 없음.  
라우트: `/peers` · 방: `/peers/[peerThreadId]` · `components/peer-chat/five-peer-hub.tsx`

`lib/context/five-peer-rooms-product.ts` — `FIVE_PEER_ROOMS_PRODUCT = true`

---

## 3. 파이프라인

```
User message (1:1)
    │
    ▼
┌─────────────────────────────┐
│ A. Rule extract (always)    │  regex / dictionary / URL / date / place
│    NO LLM                   │  → slot candidates
└─────────────────────────────┘
    │
    ▼
┌─────────────────────────────┐
│ B. Memory fold (always)     │  foldKernelMemory (STM→WM→LTM)
│    read path pure           │  → EventKernelMemoryState
└─────────────────────────────┘
    │
    ▼
┌─────────────────────────────┐
│ C. Situation integrate      │  merge slots + memory → SituationSnapshot
│    rules only               │  salience, open_slots, contradictions
└─────────────────────────────┘
    │
    ├── confidence OK ──► D. Plugins proposeCandidates(snapshot)
    │                         │
    │                         ▼
    │                    E. rankCandidates + composeDecision
    │                         │
    │                         ▼
    │                    F. shouldSurfaceContextRail? (threshold)
    │                         → 0~3 icons OR nothing
    │
    └── need LLM? ──► G. LLM fallback (narrow contract)
                          → fills ONLY missing slots / disambiguation
                          → re-enter C (no bypass compose)
```

---

## 4. SituationSnapshot (read-only)

```typescript
type SituationSnapshot = {
  scopeId: string;
  clockIso: string;
  /** Integrated from last N turns — not raw log in UX */
  topic: string | null;
  entities: Array<{ kind: "place" | "date" | "activity" | "url" | "money"; value: string; weight: number }>;
  openSlots: string[];           // e.g. ["date", "budget"]
  salience: number;              // 0..1 — surface threshold input
  contradictions: string[];      // rule-detected only
  experienceMode: "MEMORY" | "EFFICIENCY" | "BALANCED";
  memoryRef: EventKernelMemoryState;
};
```

**적분:** 매 턴 `weight` 누적·감쇠(WM_DECAY).  
**꺼내기:** `salience >= SURFACE_THRESHOLD` (예: 0.55) **and** compose가 1개 이상 actionId 반환할 때만 Rail.

---

## 5. 규칙 레이어 (항상 ON)

| 신호 | 규칙 예 |
|------|---------|
| 장소 | 부산, 광안리, 역 geocoder 사전 |
| 일정 | 1박2일, N월 N일, 주말 |
| 활동 | 서핑, 맛집, 예약 |
| URL | `extractUrlsFromText` |
| 금전 | 정산, 송금, 더치, 원/₩+숫자 — **없으면 ₩ 플러그인 후보 금지** |
| 여행·친구 | `inferExperienceMode` → MEMORY (성급 추천 억제) |

규칙은 **후보 재료**와 **salience 가산**만. winner 선택 금지.

---

## 6. LLM — “한계치 + 추론 필요” 때만

### 6.1 켜는 조건 (OR)

| # | 조건 | 예 |
|---|------|-----|
| L1 | `openSlots` 비어 있지 않고 규칙으로 2턴 내 채워지지 않음 | “그때 갈 곳” (지시어) |
| L2 | `contradictions.length > 0` | 이전 “제주” vs 지금 “부산” |
| L3 | `salience` 중간대 + plugin 후보 0 | 애매한 짧은 답 |
| L4 | deictic recall 실패 (`그거`, `아까`) | memory anchor 없음 |
| L5 | unknown domain + partial scrape | Rimvio L5 fallback |

**끄는 조건:** 규칙·메모리만으로 `openSlots` 해소 + plugin ≥1 + salience ≥ threshold → **LLM 호출 없음**.

### 6.2 LLM 출력 계약 (strict)

```typescript
type ContextLlmFallbackOutput = {
  /** slot fill only — no actions[], no chips */
  filled_slots: Record<string, string>;
  disambiguation?: { question: string; options: string[] }; // max 3
  reasoning?: string;  // dev only, never UI
};
```

**금지:** `primaryAction`, `recommendedIcon`, 금액·수취인 invent, title/URL hallucination (Rimvio §2).

### 6.3 LLM 이후

1. `filled_slots` → SituationSnapshot 갱신 (규칙 검증)  
2. Plugins `proposeCandidates`  
3. `composeDecision`  
4. UI는 **compose surface만**

---

## 7. Context Rail 노출 정책

| 조건 | Rail |
|------|------|
| `salience < 0.55` | 숨김 |
| 인사·감사만 | 숨김 (₩ 포함) |
| compose `blocked` | 숨김 또는 escape 1개 |
| compose `fork` | 아이콘 ≤3 = chip과 동일 actionId |
| L3 금전 | Rail 아이콘 대신 **탭 시 Banking fork** (auto 금지) |

**지연 노출:** 링크·일정은 **해당 턴 + 1턴 지연** 가능 (스팸 방지).

---

## 8. OS 불변식 (재확인)

1. 그룹채팅 코드 경로 없음 — `scopeId`는 항상 1:1 thread.  
2. Memory fold / integrate = **read path** (SSOT·ledger 직접 변경 없음).  
3. LLM ≠ brain; **fallback brain** only.  
4. `composeDecision` + optional `envelope` veto = 유일한 결정.  
5. 실행 = `enqueueReviewExecution` after user resolve (L3/L4).

---

## 9. Cloud v1 구현 순서 (출시 필수)

**출시에 포함:** Pinned 5 + `@친구` import · **Context Rail** (맥락 적분·절정 노출)  
**출시 후:** Plugin registry 확장 · 확률장 고도화 · 퀀트/HFT

| Step | 산출 | Launch |
|------|------|--------|
| L0 | **1:1 톡** `PeerThreadLensBar` — AI 렌즈 토글 + 방 고정 (5/5) | **SHIP stub** `lib/context/` |
| L1 | `PinnedPeerRoster` + cloud `PeerMessageLog` (E2E or encrypted) | **필수** |
| L2 | `parsePinnedPeerMention` (`@지수` vs `@캘린더`) + `loadPinnedPeerContext` | **필수** |
| L3 | `integrateSituationFromTurn` + phase (발단~결말) | **필수** |
| L4 | `shouldSurfaceContextRail` + `ContextRail` UI | **필수** |
| L5 | context plugins → `composeDecision` (envelope optional) | **필수** |
| L6 | `EgressAudit` + LLM preview + 데이터 지도 | **필수** (클라우드 신뢰) |
| L7 | `evaluateLlmEscalation` + LLM adapter | 한계치만 |
| — | Outer ephemeral extract | **필수** (나머지 방) |
| — | Plugin marketplace / partner PRU | 이후 |

### 9.1 클라우드 시 Trust 조정 (§13 보완)

| 로컬-only 문구 | 클라우드 v1 |
|----------------|-------------|
| “원문이 서버에 없다” | **Pinned 5만** 암호화 저장 · tenant=user · **직원 임의 열람 금지** |
| Egress 0 기본 | 동일 + **API 경로 audit** |
| 삭제 | **서버-side wipe** + 로컬 캐시 삭제 |

**주장 가능:** “친한 5명만 클라우드에 저장, 나머지 원문 없음, AI 전송은 매번 확인.”

---

## 10. 부산 여행 1:1 시나리오 (기대 동작)

| 턴 | 규칙 적분 | LLM | Rail |
|----|-----------|-----|------|
| 부산 가고 싶다 | place weight↑ | ✗ | ✗ (아직 약함) |
| 광안리 근처 | place refine | ✗ | ✗ |
| 1박2일 | date slot | ✗ | ✗ |
| 일정 짜자 | schedule intent | ✗ | 📅 (salience↑) |
| 서핑 | activity | ✗ | 🌊 |
| 블로그 URL | url | ✗ | 🔗 (이 턴 or +1) |
| 고마워 | ack only | ✗ | **숨김** (₩ X) |

LLM 예: “**그때** 거기”만 있고 memory anchor 없음 → L4 escalation → disambiguation 질문 1개 → 사용자 답 → 규칙 재적분.

---

## 11. Pinned 5 (고정) vs 나머지 방 — 맥락만 추출

**확정 정책:**

| 구분 | 5명 (핀 고정) | 나머지 1:1 방 |
|------|----------------|----------------|
| **저장** | 대화 **전문** (MessageLog) | **원문 저장 없음** |
| **적분** | Episode + phase + Memory | **맥락만 추출** (규칙) |
| **AI `@이름`** | ✅ full link | ❌ (또는 “맥락 스냅 1줄”만, v2) |
| **재열기** | 언제든 episode·원문 | 세션/앱 종료 시 **추출분도 폐기** (기본) |

- **핀 5 = 고정 슬롯** — 6번째는 **교체**만, 자동 확장 없음.  
- **AI 렌즈**와 **방 고정**은 **독립 토글** (렌즈 OFF여도 고정·전체 저장 가능).  
- **나머지 = Outer** — 채팅 UI는 카톡 그대로; OS는 **턴 지나갈 때마다** place/date/url/intent 같은 **슬롯만 뽑고**, 원문 log는 남기지 않음.

### 11.0 5방 제품 — 렌즈만 토글 (방 안)

슬롯에 들어 있는 방 = **항상 전문 저장** (`pinned_full`). **Outer 없음.**

| AI 렌즈 (방 안) | 저장 | Rail | AI `@이름` |
|----------------|------|------|------------|
| OFF | ✅ (슬롯 방) | 없음 | ✅ |
| ON | ✅ | 있음 | ✅ |

*(레거시: 무한 채팅 + 고정/렌즈 매트릭스는 `FIVE_PEER_ROOMS_PRODUCT = false` 때만)*

그룹채팅 v1 **배제**. “방” = 1:1 DM.

### 11.1 Outer “맥락만 추출”이란

```
메시지 수신 → rule extract → ContextExtract (구조체만)
                ↓
         (원문 버림, 디스크 X)
                ↓
    현재 앱 세션 안에서만 salience / Rail 힌트 (선택)
```

**ContextExtract** 예 (저장 필드):

```typescript
type EphemeralPeerExtract = {
  peerThreadId: string;
  at: string;
  topic: string | null;
  entities: Array<{ kind: string; value: string }>;
  openSlots: string[];
  /** 원문·말풍선 텍스트 없음 */
};
```

- **금지:** Outer에 PeerMessageLog append, `@상대` full import, LLM에 outer 원문.  
- **허용:** 같은 세션에서 “부산 얘기 중” 수준 **힌트** (절정에 0~1 아이콘, 과하지 않게).  
- 앱 재시작 / 24h 후 → extract **삭제** (v1 기본).

### 11.2 Pinned 5 (Inner)

```typescript
const PINNED_PEER_SLOTS = 5 as const;

type PinnedPeerSlot = {
  slotIndex: 0 | 1 | 2 | 3 | 4;
  peerThreadId: string;
  displayName: string;
  pinnedAt: string;
  storage: "full_log";
};
```

| 동작 | Pinned |
|------|--------|
| MessageLog | ✅ append-only |
| Episode / 발단~결말 | ✅ |
| `@displayName` → AI | ✅ load full + snapshot |
| 중요 대화 | T2 기본, T3 pin |

### 11.3 한눈에

| | Pinned ×5 | Outer |
|--|-----------|-------|
| 원문 | 보관 | **안 함** |
| 맥락 | 보관 + 적분 | **추출만, 휘발** |
| `@` | ✅ | ❌ |
| LLM | 한계치 + tier | extract로도 부족할 때만, **원문 없이** |

### 11.4 `@지수` (Pinned만)

1. `resolvePinnedPeer("지수")` → slot  
2. miss → “고정된 친한 친구 5명에게만 연결할 수 있어요.”  
3. hit → `loadPinnedPeerContext(full)` → integrate → compose  

Outer 상대 이름으로 `@` → **항상 blocked** (맥락 extract는 AI로 이전 불가).

---

## 12. Trust & Egress — “AI가 프라이버시를 훔쳐 간다” 불신 대응

**원칙:** 말로 안심시키기보다 **기본 차단 + 보이는 증거 + 삭제·통제**.

### 12.1 사용자가 무서워하는 것 → 제품 답

| 불신 | 답 (기술 + UX) |
|------|----------------|
| 대화가 밖으로 새나간다 | **Egress default DENY** — allowlist만 |
| 몰래 읽는다 | **Pinned 5만** full log · Outer **원문 0** |
| 학습·광고에 쓴다 | API **no-train** · **no sell** · 정책 |
| 뭘 갖고 있는지 모른다 | **데이터 지도** · 슬롯 5/5 · 용량 |
| 회사 말만 믿음 | **로컬 audit** · (선택) E2E · 오프라인 |

### 12.2 Egress 모델 (stub)

```typescript
type EgressPolicy = {
  default: "DENY";
  allowlist: Array<
    | "llm_slot_fill"      // snapshot only, user confirmed
    | "llm_disambiguation"
    | "partner_execution" // user tapped compose action
  >;
};

type EgressAuditEntry = {
  at: string;
  kind: string;
  scopeId: string;
  bytesOut: number;
  /** never log raw message body */
  payloadDigest: string;
  userConfirmed: boolean;
};
```

- **백그라운드 업로드 없음** — 항목마다 `userConfirmed: true` 필수 (v1).  
- 설정: **“최근 7일 외부 전송 N건”** — N=0이 정상 상태 메시지.

### 12.3 UX (신뢰 MVP)

| 시점 | UI |
|------|-----|
| 온보딩 | “**5명만** 전체 저장 · 나머지 **원문 없음** · **기본 밖으로 안 보냄**” |
| Pinned 추가 | 매번 동의 + 5/5 · “학습·광고 미사용” |
| LLM 직전 | **미리보기** (토픽·슬롯·no raw) + `[ ] 이번만 전송` |
| 설정 | **데이터 지도** · Pinned 삭제 · 전체 삭제 · egress 로그 요약 |
| Outer `@` | “고정 5명만 연결 · ○○님 대화는 **저장하지 않음**” |

### 12.4 Outer extract — 프라이버시도 “0”은 아님

추출에도 place/topic 등이 남을 수 있음 → **개인=무제한 아님**.

| Outer 규칙 | |
|------------|--|
| 원문·말풍선 텍스트 | 디스크 **미저장** |
| TTL | 세션 종료 또는 24h **삭제** |
| 민감 패턴 | 계좌·주민·비밀번호 등 **마스킹·미추출** |
| AI·서버 | **기본 전송 없음** · `@` link **불가** |

### 12.5 대외 카피 (한 문장)

> **AI가 대화를 훔쳐 가지 않습니다. 밖으로 보내지 않는 게 기본이고, 진짜 친한 친구 5명만 이 기기에 전체 저장합니다. 그 외는 원문을 남기지 않으며, AI에 붙일 때는 미리보기 후 내가 허락합니다.**

---

## 13. 카톡급 프라이버시 체크리스트

**“카톡급”** = 사용자 체감 + 업계 기준선. **AI 제품**은 카톡에 없던 **egress·LLM** 항목이 추가됨.

**범례:** ✅ 설계 확정 · 🔧 구현 예정 · ⏳ v2+ · — 해당 없음/타사 대비 별도

| # | 항목 | 카톡(일반) 참고 | 우리 목표 | 상태 |
|---|------|----------------|-----------|------|
| **저장·범위** |
| K1 | 1:1 대화 저장 | 서버 보관 | **Pinned 5만 full local** | ✅ |
| K2 | 나머지 방 | 서버 보관 | **Outer 원문 미저장·extract만** | ✅ |
| K3 | 그룹채팅 | 있음 | v1 **배제** | ✅ |
| K4 | 고정 5 슬롯·교체만 | — | 5 고정·6번째 교체 확인 | ✅ |
| **통제·삭제** |
| K5 | 대화 삭제 | 가능 | Pinned **per-peer wipe** | 🔧 |
| K6 | 내 데이터 목록 | 제한적 | **데이터 지도** (용량·5명·TTL) | 🔧 |
| K7 | AI 연결 범위 | — | **`@` = Pinned만** | ✅ |
| **외부 유출** |
| K8 | 광고·프로필 판매 | 정책상 안 함 | **no sell** + 지도 | ✅ / 🔧 |
| K9 | 모델 학습 | — | **no-train** + API contract | 🔧 |
| K10 | 기본 네트워크 egress | sync 등 | **default DENY** + audit | 🔧 |
| K11 | LLM 전송 | — | **미리보기 + 이번만 확인** | 🔧 |
| K12 | 백그라운드 업로드 | — | **금지** (confirmed only) | ✅ |
| **암호·인프라** |
| K13 | 전송 중 암호화 TLS | ✅ | TLS | 🔧 |
| K14 | E2E (비밀채팅급) | 비밀채팅만 | Pinned 또는 AI 채널 **E2E** | ⏳ |
| K15 | 서버에 원문 없음 | 서버 있음 | **Pinned 5만 encrypted cloud** · Outer 원문 없음 | ✅ v1 launch |
| **AI·OS** |
| K16 | AI가 winner 선택 | — | **`composeDecision` only** | ✅ SHIP |
| K17 | 금전 auto | — | L3 **fork only** + envelope | ✅ |
| K18 | Outer 원문→LLM | — | **금지** | ✅ |
| K19 | proof/audit | — | CausalProof + **EgressAudit** | 🔧 / ✅ |
| **운영·법무** |
| K20 | 개인정보 처리방침 | 있음 | Pinned / Outer / LLM **분리 기재** | 🔧 |
| K21 | 침해 대응·고지 | 있음 | 운영 runbook | ⏳ |
| K22 | ISMS·외부 감사 | 있음 | 출시 후 로드맵 | ⏳ |

### 13.1 카톡 대비 — 말해도 되는 것 / 조심할 것

| 우리가 **같거나 강한** 말 | **조심·추가 필요** |
|---------------------------|-------------------|
| 안 고른 사람 대화 **원문 미보관** | 카톡은 서버 sync·멀티디바이스 |
| AI **기본 미전송·미리보기** | 카톡엔 해당 UX 없음 → **우리만 증명** |
| **5명만** 명시적 full consent | |
| | **E2E** 없으면 “비밀채팅급” **주장 금지** |
| | **대기업 인증** 없으면 “카톡 인프라 동급” **주장 금지** |

**권장 대외 문장:**  
“**카톡처럼 일상 대화를 쓰되, AI는 기본으로 밖에 보내지 않고, 친한 친구 5명만 기기에 전체 저장합니다.**”

### 13.2 구현 우선순위 (Cloud v1 launch)

| P | 항목 | 체크 |
|---|------|------|
| **T1** | `PinnedPeerRoster` + encrypted `PeerMessageLog` sync | K1 K4 K7 K15 |
| **T2** | `@친구` + `loadPinnedPeerContext` → compose | K7 |
| **T3** | Context Rail + situation integrate + phase | K7 + §14 |
| **T4** | Outer extract only (no peer log on server) | K2 |
| **T5** | `EgressAudit` + LLM preview + 데이터 지도 | K10 K11 K12 |
| **T6** | Policy + no-train API | K8 K9 K20 |
| T7 | E2E (Pinned at rest + transit) | K14 — **launch 강력 권장** |
| — | Plugin registry / partner | 이후 |

### 13.3 코드 맵 (예정)

| Artifact | Path |
|----------|------|
| Peer lens + pin UI | `components/peer-chat/peer-thread-lens-bar.tsx` |
| Peer policy | `lib/context/peer-thread-policy.ts` |
| Pinned roster | `lib/context/pinned-peer-roster.ts` |
| Settings store | `lib/context/peer-thread-settings-store.ts` |
| Hook | `hooks/use-peer-thread-settings.ts` |
| Test | `npx tsx scripts/test-peer-thread-settings.ts` |
| Outer extract | `lib/context/ephemeral-peer-extract.ts` (stub) |
| Egress audit | `lib/privacy/egress-audit.ts` (stub) |
| Trust copy | settings / onboarding strings |
| Risk envelope | `lib/deos/risk/` (SHIP stub) |
| Compose + envelope | `lib/deos/decision/compose-envelope-gate.ts` (SHIP) |

---

## 14. Narrative phase (발단 → 결말) — 노출 타이밍

내부 라벨만; UI를 5단계로 쪼개지 않음.

| Phase | Rail / Threadline |
|-------|-------------------|
| 발단 | 숨김 |
| 전개 | 0~1 힌트 |
| 위기 | 준비 |
| **절정** | **Rail 1~3** 또는 Threadline 1장 |
| 결말 | 숨김 · episode close |

Pinned: full log + phase. Outer: extract만, **절정도 과하지 않게**.

---

*1:1 · Pinned 5 full · Outer extract-only · Trust checklist §13*
