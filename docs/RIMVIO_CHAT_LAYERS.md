# Rimvio Chat Layers

## Vision

하나의 채팅 화면에서 **사람 대화**와 **AI 협업**을 함께 처리한다.  
AI 레이어와 사람 레이어는 **논리적으로 분리**된다.

## Room types

| Type | participants | `ai_mode` | AI visibility |
|------|----------------|-----------|---------------|
| **DM** | 2 | `private` | `ai_private` → 호출자만 |
| **Group** | 3+ | `shared` | `ai_shared` → 전원 (v2) |

## Message types

- `human` — 양쪽(DM) / 전원(Group) 표시
- `ai_private` — DM, 호출자만
- `ai_shared` — Group, 전원
- `system`

## DM example

```
나: 오늘 강남에서 보기로 했는데 뭐 먹지?
친구: 몰라 ㅋㅋ
나: @ai 강남역 근처 분위기 좋은 이탈리안 추천
[AI 카드 — 나만 보임]
```

`@ai` / `/ask` / `/ai` 로 같은 화면에서 AI 호출.

## Implementation (code)

- `lib/chat-room/types.ts` — visibility rules
- `lib/chat-room/parse-ai-invoke.ts` — @ai parsing
- `peer_messages.message_type` + `ai_payload`
- RLS: `018_chat_room_layers.sql`
- API: `POST /api/peers/threads/[threadId]/ai`
- UI: `PeerThreadChatPanel` + `PeerAiInlineCard`

## Group (planned)

`room_kind = group`, `ai_mode = shared` — same UI, RLS exposes `ai_shared` to all members.
