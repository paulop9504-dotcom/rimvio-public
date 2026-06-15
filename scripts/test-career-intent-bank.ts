#!/usr/bin/env npx tsx
/**
 * Career intent bank — every role × phrasing variants.
 * Feedback loop: fail → report → fix infer/recovery → re-run until green.
 */
import assert from "node:assert/strict";
import { FRUSTRATION_ESCAPE_SUMMARY } from "../lib/action-chat/adaptive-behavior/ux-guards/frustration-circuit-breaker";
import { detectFrustrationEscape } from "../lib/action-chat/adaptive-behavior/ux-guards/frustration-circuit-breaker";
import { buildFallbackRecoveryReply } from "../lib/action-chat/fallback-recovery/build-fallback-recovery-reply";
import {
  CAREER_ROLE_LEXICON,
  extractCareerRoleHint,
  isCareerAspirationMessage,
} from "../lib/action-chat/fallback-recovery/career-role-bank";
import { inferFallbackRecovery } from "../lib/action-chat/fallback-recovery/infer-fallback-recovery";
import { runOrchestratorPipeline } from "../lib/action-chat/orchestrator/run-orchestrator-pipeline";

const PHRASINGS = [
  (role: string) => `${role}가 되고싶어`,
  (role: string) => `${role}가 될꺼야`,
  (role: string) => `${role} 되고 싶어`,
  (role: string) => `${role} 할 거야`,
];

const REPEAT_HISTORY = [
  { role: "user" as const, content: "미용사가 될꺼야" },
  { role: "assistant" as const, content: FRUSTRATION_ESCAPE_SUMMARY },
  { role: "user" as const, content: "미용사가 되고싶어" },
];

const masterContext = {
  currentDate: "2026-06-06",
  trustLevel: "L1" as const,
  existingSchedule: [],
  allReminders: [],
  userGoals: [],
  activitySources: [],
  conversationMemories: [],
  activeContainers: [],
  activeChains: [],
  activeChain: null,
  userDefinedActions: [],
  mapApp: "kakao" as const,
};

const violations: string[] = [];

function fail(reason: string) {
  violations.push(reason);
}

for (const role of CAREER_ROLE_LEXICON) {
  for (const phrase of PHRASINGS) {
    const message = phrase(role);
    if (!isCareerAspirationMessage(message)) {
      fail(`not_career: ${message}`);
      continue;
    }

    const hint = extractCareerRoleHint(message);
    if (hint !== role) {
      fail(`role_hint ${message}: expected ${role}, got ${hint ?? "null"}`);
    }

    const inference = inferFallbackRecovery(message);
    if (inference.primary !== "career_planning") {
      fail(`primary ${message}: ${inference.primary}`);
    }

    const reply = buildFallbackRecoveryReply(message);
    if (!reply.includes(role)) {
      fail(`reply_missing_role ${message}`);
    }
    if (!/진로|커리어|준비/u.test(reply)) {
      fail(`reply_not_career ${message}`);
    }
    if (FRUSTRATION_ESCAPE_SUMMARY.includes(reply.slice(0, 20))) {
      fail(`frustration_reply ${message}`);
    }

    if (detectFrustrationEscape(message, REPEAT_HISTORY)) {
      fail(`frustration_escape ${message}`);
    }
  }
}

const spotlight = [
  "의사가 되고싶어",
  "미용사가 되고싶어",
  "미용사가 될꺼야",
  "개발자가 되고 싶어",
  "유튜버 할 거야",
];

async function pipelineSpotlight() {
  for (const message of spotlight) {
    const result = await runOrchestratorPipeline({ message, masterContext });
    const summary = result.summary ?? "";
    if (FRUSTRATION_ESCAPE_SUMMARY.slice(0, 24).includes(summary.slice(0, 24))) {
      fail(`pipeline_frustration: ${message}`);
    }
    if (!/진로|커리어|준비|A\)/u.test(summary)) {
      fail(`pipeline_weak: ${message} → ${summary.slice(0, 80)}`);
    }
    if (result.metadata?.routing_patch !== "FALLBACK_RECOVERY") {
      fail(`pipeline_patch: ${message} → ${String(result.metadata?.routing_patch)}`);
    }
  }
}

async function main() {
  await pipelineSpotlight();

  if (violations.length > 0) {
    console.error(
      JSON.stringify(
        {
          status: "FAIL",
          total_roles: CAREER_ROLE_LEXICON.length,
          phrasings: PHRASINGS.length,
          violations: violations.slice(0, 40),
          violation_count: violations.length,
        },
        null,
        2
      )
    );
    process.exit(1);
  }

  console.log(
    JSON.stringify({
      status: "PASS",
      cases: CAREER_ROLE_LEXICON.length * PHRASINGS.length,
      spotlight: spotlight.length,
    })
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
