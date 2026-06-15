# Rimvio routing playbook — audit checklist

> **실행:** `npm run test:playbook`  
> **구어 변형 루프 (40케이스):** `npm run test:playbook:loop`  
> **진단:** `npx tsx scripts/trace-routing-gates.ts`

Rimvio only — not Silent Ghost. Open `rimvio.code-workspace`.

---

## 카페 QA (`test:cafe-diversity`)

**버그:** `근처 카페 추천해줘` → 성심당 지점 5개  
**수정:** `filter-cafe-candidates.ts` — 브랜드당 1곳, 베이커리 체인(성심당) 최대 1곳, 커피 전문점 우선

```bash
npm run test:cafe-diversity
```

시뮬레이션 입력: 성심당 5지점 + 스타벅스/이디야/드롭탑/투썸/텐퍼센트 → **성심당 0~1 + 커피 브랜드 4+**

```
review/ocr → vitality → entity quick pick → ★ LLM router (ambiguous) → ai intent stub → meal contract → place discovery
→ kernel terminal (guard) → phase 1–3 → LLM responder
```

---

## AI 질문 유형 QA (`test:ai-intent`)

사람들이 AI에게 묻는 패턴 6종 — **이해 / 실행 / 결정** (+ 창작·상담·메타)

| 유형 | 예시 | 기대 |
|------|------|------|
| INFO (이해) | 이거 뭐야?, 차이점이 뭐야?, 예시 들어줘 | 대화 모드, generic CLARIFY 금지 |
| HOW_TO (실행) | 어떻게 해?, 단계별로 알려줘 | 안내/단계, 검색-only 금지 |
| DECISION (결정) | A vs B, 추천해줘, 위험해? | 판단·정리 톤 |
| CREATION (창작) | 이메일 써줘, 요약해줘 | 대화 모드, entity 카드 금지 |
| COUNSELING (상담) | 스트레스, 인간관계 문제 | vitality 또는 공감 톤 |
| CURIOSITY (메타) | 너는 어떻게 작동해?, GPT 차이 | Rimvio 소개·설명 |

```bash
npm run test:ai-intent
```

**37 utterances** — `lib/testing/ai-intent-playbook-banks.ts`  
**gate:** `orchestrateAiIntent` (entity quick pick 다음, meal contract 이전) — offline stub

---

## LLM router (`test:llm-router`)

애매한 intent만 **gpt-4o-mini JSON router** (temperature 0, ~220 tokens).

| 스킵 (룰 fast-path) | LLM router |
|---------------------|------------|
| `배고파`, `쿠우쿠우`, `둔산동 맛집` | `어떡하지?`, multi-intent, forbidInfo+unclear |
| entity / meal contract | DECISION / COUNSELING / HOW_TO |

```bash
npm run test:llm-router
```

- 모듈: `lib/action-chat/llm-router/*`
- 파이프라인: entity 다음 · `shouldInvokeLlmRouter` → `routeWithLlm` → rule validate → execute
- 비활성: `OPENAI_API_KEY` 없음 또는 `RIMVIO_LLM_ROUTER=false`
- MEAL executor → meal gate defer · CONVERSATION → `user_reply` 즉시 반환

---

## Routing stress (`test:routing-stress`)

**30 attack utterances × 10 checks** — INFO 오분류 집중 (FAIL 시 mutation 5회)  
Philosophy: **INFO is the most dangerous default**

Critical instant-FAIL:
- 맛집/뭐 먹지 → INFO
- 원룸 → INFO  
- A vs B → INFO
- emotion → INFO

---

```bash
npm run test:adaptive-qa
```

**17 cases × 10 checks** — mutation up to 3× on FAIL, then STOP.  
Modules: `lib/testing/deos-adaptive-qa/*`, `scripts/test-deos-adaptive-qa-runner.ts`

## HARD MODE (`test:hard-mode`)

**결정하는 시스템** 검증 — Intent Routing + Decision Engine + Fallback + Context Handler.

| 기준 | 검증 |
|------|------|
| Intent consistency | 동의어 → 동일 bucket |
| Boundary stability | `뭐하지`/`추천`/`어떡해` → INFO/CHAT 금지, DECISION/STEP/FORK |
| Multi-intent hierarchy | primary 1개, secondary는 context만 |
| Noise resistance | 잡음 섞여도 food vs schedule 분리 |
| Context continuity | `그거`/`아까`/`비슷하게` — reset 금지 |
| Determinism | 동일 input → 동일 output (10회) |

```bash
npm run test:hard-mode
```

**12 cases** — FAIL 시 mutation 10회 · `expectedBuckets`로 DECISION/FOOD 등 강제  
Philosophy: **애매하면 INFO로 도망 금지 — 반드시 결정**

---

## #1–#12 점검표

| # | 증상 | 상태 | 검증 |
|---|------|------|------|
| 1 | generic fallback | ✅ | `배고파`, `둔산동 맛집` ≠ "무엇을 도와드릴까요?" |
| 2 | 엉뚱한 entity 카드 | ✅ | vitality → ENTITY_QUICK_PICK 금지 |
| 3 | 맛집 무반응 | ✅ | `ANCHOR_DINING` + meal contract gate |
| 4 | vitality 무시 | ✅ | gate lexicon: 졸려, 스트레스 |
| 5 | 브랜드/기업 | ✅ | `known-entity-catalog` (애플, 삼성전자…) |
| 6 | LLM만 rules | ⚠️ | offline fallback 의도됨; `.env.local` OPENAI 확인 |
| 7 | API OK UI 틀림 | ✅ | `resolveAssistantDisplaySummary` |
| 8 | 회귀 | ✅ | `test-orchestrator-routing-matrix.ts` |
| 9 | 전체 감사 | ✅ | `test-playbook-routing-audit.ts` |
| 10 | gate 추가 예방 | 📋 | 새 early-return → exclusion + matrix 3케이스 |
| 11 | CI | ✅ | `npm run test:playbook` + `npm run test:playbook:loop` |
| 13 | AI 질문 6유형 | ✅ | `npm run test:ai-intent` (37 utterances) |

---

## 구어 변형 루프 (`test:playbook:loop`)

**프로토콜**

1. word bank 4세트 × **#1–#10 동시 검사** (총 40 pipeline 호출)
2. **#10 stress** 실패 또는 **연속 실패 10회** → 다음 bank로 rotate, #1부터 재시작
3. 4 bank 전부 10/10 → PASS

**bank 추가/수정:** `lib/testing/routing-playbook-banks.ts`  
**판정 로직:** `lib/testing/evaluate-playbook-category.ts`

수정 PR마다 해당 bank에 **새 구어 1–2개** 추가 권장.
| 12 | SG 경계 | ✅ | `rimvio-isolation.mdc`, SG import 0건 |

---

## 발화 매트릭스

| 발화 | 기대 | 금지 |
|------|------|------|
| 배고파, 졸려, 스트레스 | VitalityState | ENTITY_QUICK_PICK, generic CLARIFY |
| 둔산동 맛집 | MEAL / discovery | generic CLARIFY |
| 쿠우쿠우, 삼성전자 | ENTITY_QUICK_PICK | — |
| 애플, 코카콜라 | COMPANY facets | "정보" only |

---

## 버그 리포트 프롬프트 (복붙)

```
Rimvio orchestrator 라우팅 버그. LLM 프롬프트 튜닝 말고 gate 순서부터.

입력: [ ]
실제: [ ]
기대: [ ]
금지: ENTITY_QUICK_PICK / "무엇을 도와드릴까요?"

1. run-orchestrator-pipeline.ts trace
2. gate 순서 또는 exclusion guard
3. test-playbook-routing-audit.ts 케이스 추가
4. npm run test:playbook
```

---

## 핵심 파일

- `lib/action-chat/classify-ai-intent-utterance.ts`
- `lib/action-chat/orchestrate-ai-intent.ts`
- `lib/testing/ai-intent-playbook-banks.ts`
- `scripts/test-ai-intent-playbook.ts`
- `lib/action-chat/orchestrator/run-orchestrator-pipeline.ts`
- `lib/vitality-state/vitality-state-gate-lexicon.ts`
- `lib/event-kernel/entity/known-entity-catalog.ts`
- `lib/action-chat/resolve-assistant-display-summary.ts`
- `scripts/test-playbook-routing-audit.ts`
