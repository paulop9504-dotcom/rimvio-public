#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import { loadEnvLocal } from "../lib/test/load-env-local";
import { orchestrateUserMessage } from "../lib/action-chat/orchestrate-user-message";
import { enforceConfirmationTrigger } from "../lib/action-chat/confirm-enforcement";
import { reconcileRecommendationOrchestratorResult } from "../lib/action-chat/reconcile-recommendation-result";

loadEnvLocal();

async function main() {
  const misplaced = await reconcileRecommendationOrchestratorResult({
    message: "대전 치킨 맛집 추천",
    result: {
      summary: "대전 치킨 맛집 추천 확인",
      actions: [],
      source: "openai",
      pendingConfirm: true,
      confirmation: {
        meta: { intent: "CONFIRM" },
        persona_message: "어느 지점이에요?",
        confirm_message: "어느 지점이에요?",
        extracted_data: {
          place_name: "대전 치킨 맛집 추천",
          address: null,
          phone: null,
          datetime: null,
          url: null,
        },
        location_ux: {
          mode: "inline_pick",
          prompt: "대전 치킨 맛집 추천 — 어느 지점일까요?",
          suggestions: [
            {
              id: "bad-1",
              label: "테라스키친",
              place_name: "테라스키친",
              address: "대전 중구",
            },
          ],
        },
      },
    },
  });

  assert.equal(misplaced.confirmation, undefined);
  assert.equal(misplaced.pendingConfirm, false);
  assert.ok((misplaced.actions?.length ?? 0) > 0, "discovery cards expected");

  const pipeline = await orchestrateUserMessage({ message: "대전 치킨 맛집 추천" });
  assert.equal(pipeline.pendingConfirm, false);
  assert.equal(pipeline.confirmation?.meta?.intent, undefined);
  assert.ok((pipeline.actions?.length ?? 0) > 0, "pipeline should return discovery actions");

  const stripped = enforceConfirmationTrigger({
    message: "대전 치킨 맛집 추천",
    result: misplaced,
  });
  assert.equal(stripped.confirmation, undefined);

  console.log("test-recommendation-confirm-guard: ok");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
