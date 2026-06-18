# Peer & Group Social Policy (LOCKED)

**Status:** LOCKED (product policy)  
**Related:** [CONTEXT_INTEGRATION_1V1.md](./CONTEXT_INTEGRATION_1V1.md) · `lib/context/`

---

## 1. 1:1 친구 (확정)

| 레이어 | 정책 |
|--------|------|
| **친구 추가** | **무제한** (`PeerContact` 목록) |
| **AI 핀 (깊이 5)** | 최대 **5명** — full log · `@이름` import · AI 렌즈 가능 |
| **비핀 친구** | 대화 **로컬 저장** · AI `@import` **불가** · 렌즈 **불가** |
| **핀 해제** | 7일 후 **대화 삭제** · **연락처는 유지** · ROOM 슬롯 vacant |

```
친구 목록 (무제한)          AI 핀 허브 (5슬롯)
├── 지수  [핀됨]      ←→    ROOM 1 · 지수
├── 민수                 ROOM 2 · (빈칸)
├── 동료A                ...
└── ...                  ROOM 5
```

---

## 2. 단톡 (확정 — v2 구현)

| 레이어 | 정책 |
|--------|------|
| **방 참여** | 목록 무제한 (별도 `GroupRoom`) |
| **AI** | **방당 1명** (그룹 scope) |
| **렌즈** | **방 단위 1개** — ON/OFF는 방 공통 (분석 opt-out 혼합 **금지**) |
| **AI 핀** | 통합 예산 **5슬롯** — 1:1 + 단톡 mix (방 1개 = 1슬롯) |
| **개인 설정** | Rail 표시 · 알림 · `@Rimvio` — **내 UI만** |

---

## 3. 함께하기 `/r/` (별도)

링크 협업 방 — 단톡·1:1 핀 정책과 **분리**. (`MAX_ROOMS` 등 기존 유지)

---

## 4. 코드 매핑

| 정책 | 모듈 |
|------|------|
| 무제한 친구 | `lib/context/peer-contact-store.ts` |
| 핀 5 | `lib/context/pinned-peer-roster.ts` |
| 저장·렌즈·@import | `lib/context/peer-thread-policy.ts` |
| 1:1 UI | `/peers` · `components/peer-chat/` |

---

*Locked 2026-06-02*
