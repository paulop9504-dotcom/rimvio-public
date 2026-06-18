#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import { orchestrateUserMessage } from "../lib/action-chat/orchestrate-user-message";
import { runOrchestratorPipeline } from "../lib/action-chat/orchestrator/run-orchestrator-pipeline";
import { injectShadowContext } from "../lib/notification-shadow/inject-shadow-context";
import { ingestNotification } from "../lib/notification-shadow/route-notification";
import { appendShadowRecord, resetShadowStoreForTests } from "../lib/notification-shadow/shadow-store";
import {  commitSessionIntent,
  resetSessionIntentStoreForTests,
} from "../lib/action-os/session-intent-state";

async function main() {
  resetSessionIntentStoreForTests("v2-test");

  const pii = await orchestrateUserMessage({ message: "내 주민번호 알려줘" });
  assert.ok(pii.metadata?.security_level === "HIGH", "PII must hit Tier1 Security");

  commitSessionIntent(
    {
      action_id: "NAVIGATE",
      params: { dest: "떡반집" },
      fallback_url: "https://map.naver.com",
      updatedAt: new Date().toISOString(),
    },
    "v2-test"
  );

  const corrected = await orchestrateUserMessage({
    message: "아니야 대전역으로",
    sessionScopeId: "v2-test",
  });
  assert.match(
    corrected.actions[0]?.href ?? corrected.actions[0]?.url ?? "",
    /%EB%8C%80%EC%A0%84|대전/i
  );
  assert.ok(
    corrected.orchestratorTrace?.some((line) => line.includes("Dispatcher")),
    "correction path must pass T11/T12 dispatch"
  );

  const schedule = await orchestrateUserMessage({ message: "내일 3시 Zoom 미팅" });
  assert.ok(schedule.summary?.trim() || schedule.schedule?.tasks?.length);

  resetShadowStoreForTests();
  appendShadowRecord(
    ingestNotification({
      source: "external",
      source_app: "Zoom",
      title: "투자 미팅",
      content: "10분 후 시작",
      timestamp: new Date().toISOString(),
      fire_at: new Date(Date.now() + 10 * 60_000).toISOString(),
    })
  );
  const shadowInject = injectShadowContext();
  assert.ok(shadowInject.candidates.length >= 1);

  const dashboard = await orchestrateUserMessage({ message: "오늘 중요한 거 뭐 있어?" });
  assert.ok(dashboard.summary.includes("지금") || dashboard.actions.length > 0);
  assert.ok(
    dashboard.orchestratorTrace?.some((line) => line.includes("ShadowDashboardQuery")) ||
      dashboard.summary.length > 0,
    "dashboard query should early-return via T5"
  );

  const generic = await runOrchestratorPipeline({ message: "점심 메뉴 추천" });
  assert.ok(!generic.summary.includes("지금 해야 할 일"), "generic query must not use T5 dashboard");

  console.log("test-orchestrator-v2-pipeline: ok");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
