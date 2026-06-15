import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const oldPath = path.join(root, "scripts/_old-pipeline.ts");
const outPath = path.join(
  root,
  "lib/action-chat/orchestrator/resolve-orchestrator-decision.ts",
);

let lines = fs.readFileSync(oldPath, "utf8").replace(/\r\n/g, "\n").split("\n");

// Drop corrupted regex line if present
lines = lines.filter(
  (line) => !line.includes("癒?") && !line.includes("諛곌퀬"),
);

const fnLine = lines.findIndex((l) =>
  l.startsWith("export async function runOrchestratorPipeline"),
);
const endLine = lines.findIndex(
  (l) =>
    l.includes('trace.pass(0, 0, "EventKernel")') &&
    lines[lines.indexOf(l) - 1]?.includes("new OrchestratorTrace"),
);

if (fnLine < 0 || endLine < 0) {
  console.error("markers missing", { fnLine, endLine });
  process.exit(1);
}

let body = lines.slice(fnLine + 1, endLine).join("\n");
// Remove function-local setup through route= (keep only early-return chain)
const earlyStart = body.indexOf(
  "const eventReviewDateResolution = orchestrateViaReviewExecutionQueue",
);
if (earlyStart < 0) {
  console.error("early chain missing");
  process.exit(1);
}
body = body.slice(earlyStart);

const replacements = [
  [/\bpipelineInput\b/g, "base.pipelineInput"],
  [/\binput\b/g, "base.input"],
  [/\bmessage\b/g, "base.message"],
  [/\beffectiveMessage\b/g, "base.effectiveMessage"],
  [/\broutingMessage\b/g, "base.routingMessage"],
  [/\bcontext\b/g, "base.context"],
  [/\badaptive\b/g, "base.adaptive"],
  [/\broute\b/g, "base.route"],
  [/\bkernel\b/g, "base.kernel"],
  [/\blocationMemory\b/g, "base.locationMemory"],
  [/\buserDefinedActions\b/g, "base.userDefinedActions"],
  [/\bmemoryOutput\b/g, "base.memoryOutput"],
  [/\bsearchPlan\b/g, "base.searchPlan"],
  [/\beventState\.os\b/g, "base.eventState.os"],
  [/\bos\b/g, "base.eventState.os"],
  [/\bskipAiIntentStub\b/g, "base.flags.skipAiIntentStub"],
];

for (const [from, to] of replacements) {
  body = body.replace(from, to);
}

// Strip shell/finalize blocks → EarlyOrchestratorDecision returns
body = body.replace(
  /if \(([\s\S]*?)\) \{\s*const trace = new OrchestratorTrace\(\);\s*trace\.hit\(([\s\S]*?)\);\s*trace\.terminal\(([\s\S]*?)\);[\s\S]*?return withKernelOSMeta\([\s\S]*?\);\s*\}/g,
  (match, cond, hitArgs, terminal) => {
    const hit = /trace\.hit\(0, (\d+), "([^"]+)"(?:, ?([^)]*))?\)/.exec(
      `trace.hit(${hitArgs})`,
    );
    if (!hit) {
      return match;
    }
    const tier = hit[1];
    const label = hit[2];
    const detail = hit[3]?.trim();
    const term = terminal.includes("KERNEL_OS") ? "KERNEL_OS" : "EARLY_RETURN";
    const partialName = cond.match(/const (\w+) =/)?.[1];
    const partial = partialName ? `partial: ${partialName},` : "partial: {},";
    const detailLine = detail ? `detail: ${detail.replace(/['"]/g, "")},` : "";
    return `if (${cond}) {
    return {
      tier: ${tier} as const,
      label: "${label}",
      ${detailLine}
      terminal: "${term}",
      ${partial}
    };
  }`;
  },
);

const header = `import type { OrchestratorResult } from "@/lib/action-chat/orchestrator-types";
import { trySystemKillSwitch } from "@/lib/action-chat/orchestrator/try-system-kill-switch";
import { tryOrchestrateSessionCorrection } from "@/lib/action-chat/orchestrator/try-orchestrate-session-correction";
import { orchestrateContentPolicy } from "@/lib/policy/orchestrate-content-policy";
import { orchestratePiiSecurityGate } from "@/lib/safety/pii-security-gate";
import { enrichPlaceDiscoveryMessage } from "@/lib/context-resolver/discovery/enrich-place-discovery-message";
import { orchestrateEntityFacet } from "@/lib/context-resolver/discovery/orchestrate-entity-facet";
import { orchestrateEntityQuickPick } from "@/lib/context-resolver/discovery/orchestrate-entity-quick-pick";
import { parseFindPlaceIntent } from "@/lib/context-resolver/discovery/parse-find-place-intent";
import { orchestratePlaceRecommendation } from "@/lib/context-resolver/discovery/orchestrate-place-recommendation";
import { toMealDiscoveryQuery } from "@/lib/event-kernel/execution-planner/to-meal-discovery-query";
import { orchestrateContextualMealRecommendation } from "@/lib/event-os/contextual-recommendation/orchestrate-contextual-meal";
import { orchestrateOcrScheduleCandidates } from "@/lib/events/orchestrate-ocr-schedule-candidates";
import { orchestrateViaReviewExecutionQueue } from "@/lib/event-os/resolve-review-execution-orchestrator";
import { eventKernelOSIsTerminal } from "@/lib/event-kernel";
import { resolveContractActionFromMessage } from "@/lib/event-kernel/slot-filling/resolve-contract-action-from-message";
import { orchestrateVitalityStateIntent } from "@/lib/vitality-state/orchestrate-vitality-state-intent";
import { isAiIntentUtterance } from "@/lib/action-chat/classify-ai-intent-utterance";
import { orchestrateAiIntent } from "@/lib/action-chat/orchestrate-ai-intent";
import { isVitalityStateUtterance } from "@/lib/vitality-state/classify-vitality-state-intent";
import { routeWithLlm, shouldInvokeLlmRouter } from "@/lib/action-chat/llm-router";
import {
  expandTikiTakaChoiceReply,
  isTikiTakaChoiceReply,
} from "@/lib/action-chat/tiki-taka-choice-reply";
import {
  orchestrateDecisionPriorityOverride,
} from "@/lib/action-chat/routing-patches/decision-priority-override";
import {
  buildContextDriftClarifyResult,
  isContextDriftInput,
  resolveContextDrift,
} from "@/lib/action-chat/routing-patches/context-drift-resolver";
import {
  isGlobalReplanInput,
  orchestrateGlobalReplan,
} from "@/lib/action-chat/routing-patches/scheduling-global-replan";
import { tryChatAxisEarlyRoute } from "@/lib/action-chat/routing-patches/chat-axis-router";
import { orchestrateAdaptiveSimplifyRoute } from "@/lib/action-chat/adaptive-behavior/orchestrate-adaptive-behavior";
import { buildSimplifyContextClarify } from "@/lib/action-chat/adaptive-behavior/build-simplify-reply";
import { adaptiveMetadataFields } from "@/lib/action-chat/adaptive-behavior/resolve-adaptive-behavior";
import {
  orchestrateFrustrationEscape,
  orchestrateActiveListeningRoute,
  orchestrateImpossibleConstraintRoute,
  orchestrateProactiveAssumptionRoute,
} from "@/lib/action-chat/adaptive-behavior/ux-guards/orchestrate-ux-guards";
import {
  inferFallbackRecovery,
  type FallbackRecoveryCandidate,
} from "@/lib/action-chat/fallback-recovery/infer-fallback-recovery";
import { orchestrateFallbackRecovery } from "@/lib/action-chat/fallback-recovery/apply-fallback-recovery";
import {
  orchestrateContextualPivotRoute,
  orchestrateCrossDomainCraftRoute,
} from "@/lib/action-chat/conversation-craft/orchestrate-conversation-craft";
import { orchestrateEventCommitGate } from "@/lib/event-commit-gate/orchestrate-event-commit-gate";
import { orchestrateSlotCollectContinuation } from "@/lib/event-commit-gate/resolve-slot-collect-reply";
import {
  isTravelTripAnnouncement,
  tryTravelTripAnnouncement,
} from "@/lib/action-chat/try-travel-trip-announcement";
import { orchestrateStudyContext } from "@/lib/contextual-aux/study/orchestrate-study-context";
import type {
  EarlyOrchestratorDecision,
  OrchestratorPipelineBase,
} from "@/lib/action-chat/orchestrator/orchestrator-pipeline-base";

const MEAL_OR_VITALITY = /(?:먹|맛집|배고|카페|피곤|힘들|지쳤|쉬고)/iu;

const RECOVERY_PRIMARY_SKIP_VITALITY = new Set<FallbackRecoveryCandidate>([
  "career_planning",
  "education_planning",
]);

function shouldSkipVitalityForRecovery(message: string): boolean {
  return RECOVERY_PRIMARY_SKIP_VITALITY.has(inferFallbackRecovery(message).primary);
}

export async function resolveOrchestratorEarlyDecision(
  base: OrchestratorPipelineBase,
): Promise<EarlyOrchestratorDecision | null> {
  const {
    input,
    pipelineInput,
    message,
    effectiveMessage,
    routingMessage,
    context,
    adaptive,
    route,
    kernel,
    eventState,
    locationMemory,
    userDefinedActions,
  } = base;
  const { os } = eventState;

  const killSwitch = trySystemKillSwitch();
  if (killSwitch) {
    return {
      tier: 0 as const,
      label: "KillSwitch",
      terminal: "EARLY_RETURN",
      partial: killSwitch,
    };
  }

  const piiGate = orchestratePiiSecurityGate(base.message);
  if (piiGate) {
    return {
      tier: 1 as const,
      label: "Security",
      detail: "PII",
      terminal: "EARLY_RETURN",
      partial: piiGate,
    };
  }

  const contentPolicy = await orchestrateContentPolicy(base.message);
  if (contentPolicy) {
    return {
      tier: 1 as const,
      label: "Security",
      detail: "ContentPolicy",
      terminal: "EARLY_RETURN",
      partial: contentPolicy,
    };
  }

  const sessionCorrection = tryOrchestrateSessionCorrection({
    message: base.message,
    scopeId: base.input.sessionScopeId,
    existingSchedule: base.context.existingSchedule,
  });
  if (sessionCorrection) {
    return {
      tier: 2 as const,
      label: "Correction",
      terminal: "EARLY_RETURN",
      partial: sessionCorrection,
    };
  }

`;

const footer = `
  return null;
}
`;

fs.writeFileSync(outPath, header + body + footer);
console.log("restore-resolve: wrote", outPath, "body chars", body.length);
