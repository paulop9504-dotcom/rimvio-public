import fs from "node:fs";
import path from "node:path";

const root = path.join(import.meta.dirname, "..");
const src = fs
  .readFileSync(path.join(root, "scripts/_old-pipeline.ts"), "utf8")
  .replace(/\r\n/g, "\n");
const srcLines = src.split("\n");

const fnLine = srcLines.findIndex((l) =>
  l.startsWith("export async function runOrchestratorPipeline"),
);
const endLine = srcLines.findIndex(
  (l, i) =>
    i > fnLine &&
    l.includes('trace.pass(0, 0, "EventKernel")') &&
    srcLines[i - 1]?.includes("OrchestratorTrace"),
);

if (fnLine < 0 || endLine < 0) {
  console.error("markers missing", { fnLine, endLine });
  process.exit(1);
}

const earlyLine = srcLines.findIndex(
  (l, i) =>
    i > fnLine &&
    l.includes("const eventReviewDateResolution = orchestrateViaReviewExecutionQueue"),
);

let earlyBody = srcLines.slice(earlyLine, endLine).join("\n");

const replacements = [
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
  earlyBody = earlyBody.replace(from, to);
}

const out = [];
const lines = earlyBody.split("\n");
let i = 0;
let replaced = 0;

function findCloseParenLine(startIdx) {
  let depth = 0;
  for (let j = startIdx; j < lines.length; j++) {
    for (const ch of lines[j]) {
      if (ch === "(") depth++;
      if (ch === ")") depth--;
    }
    if (depth === 0 && j > startIdx) return j;
  }
  return startIdx;
}

while (i < lines.length) {
  const line = lines[i];
  if (
    line.trim() === "const trace = new OrchestratorTrace();" &&
    lines[i + 1]?.includes("trace.hit(0,")
  ) {
    const hitMatch = /trace\.hit\(0, (\d+), "([^"]+)", ?(.*)\);/.exec(lines[i + 1]);
    const termLine = lines[i + 2] ?? "";
    if (!hitMatch) {
      out.push(line);
      i++;
      continue;
    }
    const tier = hitMatch[1];
    const label = hitMatch[2];
    const detailRaw = hitMatch[3]?.trim();
    const detailLine =
      detailRaw && detailRaw.length > 0
        ? `      detail: ${detailRaw},\n`
        : "";
    const terminal = termLine.includes("KERNEL_OS") ? "KERNEL_OS" : "EARLY_RETURN";

    const finalizeIdx = lines.findIndex(
      (l, idx) => idx > i && l.includes("await shell.finalize("),
    );
    if (finalizeIdx < 0) {
      out.push(line);
      i++;
      continue;
    }
    const finalizeClose = findCloseParenLine(finalizeIdx);
    let partialText = lines.slice(finalizeIdx + 1, finalizeClose).join("\n").trim();
    partialText = partialText.replace(/,\s*$/, "");
    partialText = partialText.replace(/\s*orchestratorTrace: trace\.snapshot\(\),?\s*/g, "");

    let applyPresentation = false;
    if (partialText.startsWith("...withPresentationLayers(")) {
      applyPresentation = true;
      partialText = partialText
        .replace(/^\.\.\.withPresentationLayers\(/, "")
        .replace(/, adaptive, message\)$/, "");
    } else if (partialText.startsWith("...")) {
      partialText = partialText.replace(/^\.\.\./, "");
    }

    const returnIdx = lines.findIndex(
      (l, idx) => idx > finalizeClose && l.includes("return withKernelOSMeta"),
    );

    out.push("    return {");
    out.push(`      tier: ${tier} as const,`);
    out.push(`      label: "${label}",`);
    if (detailLine) out.push(detailLine.trimEnd());
    out.push(`      terminal: "${terminal}",`);
    if (partialText.includes("\n")) {
      out.push("      partial: {");
      for (const pl of partialText.split("\n")) {
        out.push(`        ${pl.trim()}`);
      }
      out.push("      },");
    } else {
      out.push(`      partial: ${partialText},`);
    }
    if (applyPresentation) out.push("      applyPresentation: true,");
    out.push("    };");

    replaced++;
    i = returnIdx >= 0 ? returnIdx + 1 : finalizeClose + 1;
    continue;
  }

  out.push(line);
  i++;
}

earlyBody = out.join("\n");

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
    message,
    effectiveMessage,
    routingMessage,
    context,
    adaptive,
    eventState,
    locationMemory,
  } = base;
  const { os } = eventState;

  const killSwitch = trySystemKillSwitch();
  if (killSwitch) {
    return { tier: 0 as const, label: "KillSwitch", terminal: "EARLY_RETURN", partial: killSwitch };
  }

  const piiGate = orchestratePiiSecurityGate(message);
  if (piiGate) {
    return {
      tier: 1 as const,
      label: "Security",
      detail: "PII",
      terminal: "EARLY_RETURN",
      partial: piiGate,
    };
  }

  const contentPolicy = await orchestrateContentPolicy(message);
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
    message,
    scopeId: input.sessionScopeId,
    existingSchedule: context.existingSchedule,
  });
  if (sessionCorrection) {
    return { tier: 2 as const, label: "Correction", terminal: "EARLY_RETURN", partial: sessionCorrection };
  }

`;

const footer = `
  return null;
}
`;

const resolvePath = path.join(
  root,
  "lib/action-chat/orchestrator/resolve-orchestrator-decision.ts",
);
fs.writeFileSync(resolvePath, header + earlyBody + footer);
console.log("regenerated resolve, replaced", replaced, "lines", earlyBody.split("\n").length);
