# Project Marble — slim cut log

**Applied:** intersection "must remove" — aggressive registry + dispatch trim.

## Removed from user @ protocol (NL → orchestrator or `@검색`)

`타이머` `점심` `출근` `퇴근` `가격` `쿠폰` `팁` `환율` `날씨` `다시` `메모` `물` `방해금지` `번역` `복붙` `우산` `운동` `전화` `지금` `집중` `캡처` `택배`

**Time utilities** → single path: `@알림` / NL relative time → reminder engine.  
**Focus** → NL only (orchestrator); `@집중` local express lane removed.

## Kept @ protocol (22 tokens)

`길찾기` `네비` `역` `주유` `택시` `알림` `일정정리` `식사` `할일` `캘린더` `송금` `더치` `영수증` `배달` `픽업` `링크` `링크시트` `주차` `톡` `대화끝` `친추` `설명서` `검색`

## Code

- `lib/inside-out/slim-command-protocol.ts` — source of truth
- `mention-feature-registry.ts` — 21 features (was 40+)
- `dispatch-local-mention-turn.ts` — no timer/focus handlers
- `route-rimvio-command.ts` — slim NL rules
- `build-mention-action-wire.ts` — dead utility switch cases removed (~400 lines)
- `resolve-client-turn-route.ts` — focus_confirm/cancel routing removed
- `build-mention-manual-catalog.ts` — deprecated example tokens removed

See also **`docs/PROJECT_MARBLE_INTERSECTION.md`**.

## Verify

```bash
npm run test:command-router
npm run test:mention-registry
npm run test:canonical-loop
```
