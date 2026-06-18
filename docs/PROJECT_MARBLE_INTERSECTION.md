# Project Marble — 교집합 분석 & 과감한 제거

**원칙:** PM 3축(수익·루프·신뢰) 교집합에 **반드시 잘라내야 하는 것**은 NL 오케스트레이터 한 줄로 흡수하고, @ 프로토콜은 **돈·예약·이동·톡**만 남긴다.

## 한 줄 루프 (유지)

```
입력 → marble(SSOT) → 1-Card Surface → 실행 → synapse/memory 학습
```

## 교집합 — 유지 (22 @ 토큰)

| 축 | 토큰 |
|---|---|
| 이동·OTA | 길찾기, 네비, 역, 주유, 택시, 주차 |
| 일정·알림 | 알림, 일정정리, 할일, 캘린더 |
| 돈·결제 | 송금, 더치, 영수증 |
| 음식 | 식사, 배달, 픽업 |
| 링크·도구 | 링크, 링크시트, 설명서, 검색 |
| 소셜 | 톡, 대화끝, 친추 |

## 교집합 — 과감히 제거 (NL / `@검색`으로만)

**유틸 @ 중복** — 시간은 `@알림` 하나로 통합:

- 타이머, 점심, 출근, 퇴근, 물, 방해금지, 집중, 지금, 다시

**검색·위젯형 @** — 오케스트레이터 + 외부 링크:

- 날씨, 가격, 쿠폰, 팁, 환율, 우산, 번역, 메모, 운동, 전화, 캡처, 택배

## 코드에서 실제로 끊은 경로

| 제거 | 대체 |
|---|---|
| `dispatch-local-mention-turn` timer/focus | NL → orchestrator |
| `resolve-client-turn-route` focus_confirm/cancel | (신규 @집중 없음) |
| `build-mention-action-wire` 20+ dead switch | slim 13케이스만 |
| `mention-feature-registry` 40+ → 21 | `slim-command-protocol.ts` |
| `route-rimvio-command` 출근/타이머 NL 규칙 | `@알림` / `@네비` |

## 아직 파일만 남은 것 (P2 — 삭제 후보)

- `lib/action-chat/mention-timer/` — dispatch 끊김, 테스트·구 chip 렌더만
- `lib/action-chat/mention-focus/` — chip UI·기존 메시지 read-only

삭제 전: `inline-chat-focus-chip` 히스토리 렌더 정책 결정.

## 검증

```bash
npm run test:slim-protocol
npm run test:rimvio-v1-core
npm run test:inside-out-p0
```
