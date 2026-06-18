# Rimvio tab architecture (4-tab shell)

| Tab | Route | Layer | UI |
|-----|-------|-------|-----|
| **피드** | `/feed` | DECIDE | 슬롯 카드 1 + 보조 2~3 · composer 없음 |
| **검색** | `/search` | SENSE + ACT | 빈 허브 + composer · `rimvio:search` scope |
| **친구** | `/peers` | H2H ROOM | 기존 유지 |
| **설정** | `/welcome` | — | 기존 유지 |

## Code

- `components/app-nav.tsx` — 4-tab bottom bar
- `components/action-chat-feed.tsx` — `variant: slot | conversation`
- `components/search/action-search-hub.tsx` — search tab entry
- `lib/action-chat/chat-store.ts` — `ActionChatScopeKind` + `rimvio:search`

## Verify

```bash
npm run test:rimvio-v1-core
npm run test:client-turn-route
```
