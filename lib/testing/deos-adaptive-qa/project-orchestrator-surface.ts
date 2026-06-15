import {
  classifyAiIntentUtterance,
  type AiIntentCategory,
} from "@/lib/action-chat/classify-ai-intent-utterance";
import type { OrchestratorResult } from "@/lib/action-chat/orchestrator-types";
import { parseFindPlaceIntent } from "@/lib/context-resolver/discovery/parse-find-place-intent";
import type { AdaptiveTestCategory } from "@/lib/testing/deos-adaptive-qa/test-case-banks";

/** UX shell kinds — Threadline / Feed projection layer. */
export type ProjectedSurfaceKind =
  | "INFO"
  | "STEP"
  | "FORK"
  | "DECISION"
  | "REFLECT"
  | "ARTIFACT"
  | "AUTO"
  | "BLOCKED";

export type InferredPlugin =
  | "map"
  | "calendar"
  | "message"
  | "search"
  | "conversation"
  | "vitality"
  | "entity"
  | "none";

export type AdaptiveSimulation = {
  input: string;
  category: AdaptiveTestCategory;
  orchestrator: OrchestratorResult;
  projectedKind: ProjectedSurfaceKind;
  plugins: InferredPlugin[];
  forkCount: number;
  cardState: "WAITING" | "WORKING" | "DONE" | "DEFERRED" | "N/A";
  outputSummary: string;
  because: string;
  causalTrace: string[];
  aiIntent: AiIntentCategory | null;
};

const GENERIC_CLARIFY = "무엇을 도와드릴까요?";

function inferPlugins(
  input: string,
  result: OrchestratorResult
): InferredPlugin[] {
  const plugins = new Set<InferredPlugin>();
  const summary = result.summary ?? "";
  const actions = result.actions ?? [];

  if (result.cafeDiscovery?.options?.length || parseFindPlaceIntent(input)) {
    plugins.add("map");
  }
  if (result.entityQuickPick) {
    plugins.add("entity");
  }
  if (result.experienceChoice) {
    plugins.add("vitality");
  }
  if (
    actions.some((action) => /일정|calendar|캘린더/i.test(action.label ?? "")) ||
    /일정|스케줄|약속/i.test(input)
  ) {
    plugins.add("calendar");
  }
  if (
    actions.some((action) => /검색|search|map|지도/i.test(action.label ?? ""))
  ) {
    plugins.add("search");
  }
  if (
    result.source === "conversation" ||
    result.presentation?.mode === "conversation" ||
    classifyAiIntentUtterance(input)
  ) {
    plugins.add("conversation");
  }
  if (/답장|말\s*해도|메시지|카톡/i.test(input)) {
    plugins.add("message");
  }
  if (plugins.size === 0 && summary && summary !== GENERIC_CLARIFY) {
    plugins.add("conversation");
  }
  if (plugins.size === 0) {
    plugins.add("none");
  }

  return [...plugins];
}

function countForkOptions(result: OrchestratorResult): number {
  if (result.cafeDiscovery?.options?.length) {
    return result.cafeDiscovery.options.length;
  }
  if (result.entityQuickPick?.options?.length) {
    return result.entityQuickPick.options.length;
  }
  if (result.experienceChoice?.options?.length) {
    return result.experienceChoice.options.length;
  }
  const meta = result.metadata as
    | { semantic_reason?: string; event_intent?: string }
    | undefined;
  if (
    meta?.semantic_reason === "commit_gate_slot_collect" &&
    meta?.event_intent === "meal" &&
    (result.actions?.length ?? 0) >= 2
  ) {
    return result.actions!.length;
  }
  return 0;
}

function projectKind(
  input: string,
  category: AdaptiveTestCategory,
  result: OrchestratorResult
): ProjectedSurfaceKind {
  const summary = result.summary?.trim() ?? "";
  if (summary === GENERIC_CLARIFY && !result.actions?.length) {
    return "BLOCKED";
  }

  const forkCount = countForkOptions(result);
  if (forkCount > 0) {
    return "FORK";
  }

  const aiIntent = classifyAiIntentUtterance(input);
  if (aiIntent === "INFO" || aiIntent === "CURIOSITY") {
    return "INFO";
  }
  if (aiIntent === "HOW_TO") {
    return "STEP";
  }
  if (aiIntent === "DECISION") {
    return "DECISION";
  }
  if (aiIntent === "CREATION") {
    return "ARTIFACT";
  }
  if (aiIntent === "COUNSELING" || result.experienceChoice) {
    return "REFLECT";
  }

  if (category === "EMOTION" || /힘들|스트레스|잘\s*하고/i.test(input)) {
    return "REFLECT";
  }
  if (category === "FOOD" && /맛|먹|식|배달/i.test(summary + input)) {
    return result.actions?.length ? "AUTO" : "FORK";
  }
  if (category === "PLANNING" && result.actions?.length) {
    return "AUTO";
  }
  if (
    result.source === "conversation" ||
    result.presentation?.mode === "conversation"
  ) {
    return category === "INFO" || category === "TECH" ? "INFO" : "STEP";
  }
  if (result.actions?.length) {
    return "AUTO";
  }

  return "BLOCKED";
}

function inferCardState(result: OrchestratorResult): AdaptiveSimulation["cardState"] {
  if (result.experienceChoice || result.entityQuickPick || result.cafeDiscovery) {
    return "WAITING";
  }
  if (result.pendingConfirm) {
    return "WAITING";
  }
  if (result.actions?.length && result.actionsRevealed) {
    return "WORKING";
  }
  if (result.source === "conversation") {
    return "DONE";
  }
  return "N/A";
}

function buildBecause(result: OrchestratorResult, plugins: InferredPlugin[]): string {
  if (result.experienceChoice?.headline) {
    return result.experienceChoice.headline;
  }
  if (result.entityQuickPick?.lead) {
    return result.entityQuickPick.lead;
  }
  if (result.cafeDiscovery?.headline) {
    return result.cafeDiscovery.headline;
  }
  const summary = result.summary?.trim();
  if (summary && summary !== GENERIC_CLARIFY) {
    return summary.slice(0, 120);
  }
  return `plugins:${plugins.join(",")};source:${result.source ?? "unknown"}`;
}

export function simulateAdaptiveTest(input: {
  message: string;
  category: AdaptiveTestCategory;
  orchestrator: OrchestratorResult;
}): AdaptiveSimulation {
  const plugins = inferPlugins(input.message, input.orchestrator);
  const projectedKind = projectKind(
    input.message,
    input.category,
    input.orchestrator
  );
  const forkCount = countForkOptions(input.orchestrator);
  const because = buildBecause(input.orchestrator, plugins);

  const causalTrace = [
    `source=${input.orchestrator.source ?? "unknown"}`,
    `projected=${projectedKind}`,
    `plugins=${plugins.join("+")}`,
    ...(input.orchestrator.orchestratorTrace?.hits?.slice(-3).map((hit) => hit.detail) ?? []),
  ].filter(Boolean);

  return {
    input: input.message,
    category: input.category,
    orchestrator: input.orchestrator,
    projectedKind,
    plugins,
    forkCount,
    cardState: inferCardState(input.orchestrator),
    outputSummary: (input.orchestrator.summary ?? "").slice(0, 160),
    because,
    causalTrace,
    aiIntent: classifyAiIntentUtterance(input.message),
  };
}

/** Category → acceptable projected surface kinds. */
export const EXPECTED_SURFACES: Record<
  AdaptiveTestCategory,
  readonly ProjectedSurfaceKind[]
> = {
  FOOD: ["FORK", "AUTO", "STEP"],
  DECISION: ["DECISION", "FORK", "INFO", "STEP"],
  PLANNING: ["AUTO", "FORK", "STEP", "ARTIFACT"],
  SOCIAL: ["DECISION", "REFLECT", "ARTIFACT", "STEP", "INFO"],
  LIFE: ["DECISION", "FORK", "INFO", "AUTO", "STEP"],
  INFO: ["INFO", "STEP"],
  EMOTION: ["REFLECT", "INFO", "STEP"],
  TECH: ["INFO", "STEP"],
};

/** Category → required plugin (at least one must match). */
export const EXPECTED_PLUGINS: Record<
  AdaptiveTestCategory,
  readonly InferredPlugin[]
> = {
  FOOD: ["map", "search", "conversation"],
  DECISION: ["conversation"],
  PLANNING: ["calendar", "conversation", "search"],
  SOCIAL: ["conversation", "message"],
  LIFE: ["conversation", "search", "map"],
  INFO: ["conversation"],
  EMOTION: ["conversation", "vitality"],
  TECH: ["conversation"],
};
