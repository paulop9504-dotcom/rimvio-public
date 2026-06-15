# MVP: OpenClaw ↔ Cursor 자동 검수 루프

목표: **OpenClaw(기획·PM·모니터)** 와 **Cursor(구현)** 가 같은 레포에서 **티키타카 + 작동 검수**를 반복.

## 역할 분담

| 역할 | 담당 | 하는 일 |
|------|------|---------|
| **검수 (기계)** | `npm run test:mvp` | 경계 테스트 묶음 → `reports/mvp-verify-latest.json` |
| **판단 (사람급)** | OpenClaw agent | 리포트 읽고 → 이슈 정리, 다음 지시, Slack/메모 |
| **수정** | Cursor (IDE 또는 SDK) | 실패 스텝/로그 기준 패치 |
| **재검수** | 다시 `test:mvp` | green 될 때까지 루프 |

Cursor IDE 채팅(Auto)과 OpenClaw는 **한 프로세스로 합쳐지지 않음**.  
**JSON 리포트 + git + Skill/webhook** 이 핸드오프 계약.

## 1. 로컬 / CI 검수

```bash
cd new-project
npm run test:mvp
```

성공 시 `reports/mvp-verify-latest.json` 에 `ok: true`.  
실패 시 `steps[].stderr` / `stdout` tail 이 들어감.

## 2. OpenClaw Skill (권장)

OpenClaw agent workspace에 Skill 추가 (이름 예: `rimvio-mvp-verify`):

```markdown
---
name: rimvio-mvp-verify
description: Run Rimvio MVP boundary tests and summarize the JSON report.
---

When asked to verify Rimvio MVP:

1. Run in the project root: `npm run test:mvp`
2. Read `reports/mvp-verify-latest.json`
3. Reply with: overall ok, failed step ids, one-line fix hints per failure
4. If ok, suggest optional `npm run test:playbook` for deeper routing audit
5. Never commit secrets; do not skip failing steps
```

Gateway cron 예: 매일 1회 `npm run test:mvp` 후 결과를 세션에 post.

## 3. OpenClaw → 사람/ Cursor 지시 템플릿

검수 실패 시 OpenClaw가 남길 메시지 형식:

```
[Rimvio MVP verify FAILED]
steps: ux-guards, turn-os-boundary
report: reports/mvp-verify-latest.json

Cursor task:
- Fix regressions in lib/action-chat/orchestrator/resolve-orchestrator-decision.ts
- Re-run npm run test:mvp until ok
```

## 4. Cursor SDK (선택, Phase 2)

`CURSOR_API_KEY` 있으면 스크립트에서 구현 에이전트 1회 호출 가능:

```typescript
import { Agent } from "@cursor/sdk";

const report = fs.readFileSync("reports/mvp-verify-latest.json", "utf8");
await Agent.prompt(
  `Rimvio MVP verify failed. Report:\n${report}\nFix minimal diff, then explain test command.`,
  { apiKey: process.env.CURSOR_API_KEY!, model: { id: "composer-2.5" }, local: { cwd: process.cwd() } },
);
```

- **로컬 런타임**: 같은 `new-project` 폴더에서 패치
- **클라우드 런타임**: PR 브랜치에서 돌리기 좋음

OpenClaw Skill에서 `cursor-sdk` CLI 래퍼를 호출해도 됨 (동일 계약).

## 5. Silent Ghost (ghostsilence) 와의 관계

`ghostsilence-programmer` 는 Slack Request Changes → OpenClaw webhook (`docs/OPENCLAW_SETUP.md`) 이 이미 있음.  
**Rimvio MVP 루프는 별도 Skill** — 같은 Gateway, 다른 `agentId` / sessionKey 권장.

## 6. 루프 다이어그램

```
[코드 변경]
    → npm run test:mvp
    → reports/mvp-verify-latest.json
         ├─ ok → OpenClaw: "ship checklist"
         └─ fail → OpenClaw: triage 메시지
                → Cursor: 패치
                → test:mvp (반복)
```

## 7. 확장

| 단계 | 추가 |
|------|------|
| MVP+ | `test:feed-composer-touch`, `test:timeline-display` 를 `MVP_STEPS` 에 넣기 |
| Staging | Playwright `test:e2e` 서브셋 |
| 알림 | OpenClaw `deliver: true` + Slack webhook |
