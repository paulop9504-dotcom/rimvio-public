import type { RoutingSurface } from "@/lib/action-chat/classify-semantic-routing-surface";
import { analyzeSemanticRouting } from "@/lib/action-chat/classify-semantic-routing-surface";
import type { OrchestrateHistoryTurn } from "@/lib/action-chat/orchestrator-types";
import type { OrchestratorResult } from "@/lib/action-chat/orchestrator-types";
import { resolveHonestRoutingSurface } from "@/lib/testing/routing-stress/resolve-honest-routing-surface";

/** Collapsed routing bucket for HARD MODE comparison. */
export type HardModeBucket =
  | "FOOD"
  | "DECISION"
  | "STEP"
  | "FORK"
  | "REFLECT"
  | "SCHEDULE"
  | "INFO"
  | "BLOCKED";

export type HardModeRun = {
  input: string;
  surface: RoutingSurface;
  bucket: HardModeBucket;
  summary: string;
  primaryIntent: string;
  secondaryIntents: string[];
};

const GENERIC = "무엇을 도와드릴까요?";

export function resolveHardModeBucket(
  message: string,
  surface: RoutingSurface
): HardModeBucket {
  const semantic = analyzeSemanticRouting(message);
  if (surface === "FORK") return "FORK";
  if (surface === "REFLECT") return "REFLECT";
  if (surface === "DECISION") return "DECISION";
  if (surface === "STEP") {
    return semantic.domain === "schedule" || semantic.domain === "travel"
      ? "SCHEDULE"
      : "STEP";
  }
  if (surface === "INFO") return "INFO";
  if (surface === "BLOCKED" || surface === "ARTIFACT") {
    return semantic.domain === "food" ? "FOOD" : "BLOCKED";
  }
  if (semantic.domain === "food") return "FOOD";
  return "BLOCKED";
}

export function inferPrimarySecondaryIntents(
  message: string,
  history?: readonly OrchestrateHistoryTurn[]
): {
  primary: string;
  secondary: string[];
} {
  const semantic = analyzeSemanticRouting(message);
  const secondary: string[] = [];
  let primary = semantic.domain;

  if (/^(?:그거|비슷|아까|저\s*거)/iu.test(message.trim()) && history?.length) {
    for (let index = history.length - 1; index >= 0; index -= 1) {
      const turn = history[index];
      if (turn.role !== "user") continue;
      const prior = turn.content;
      if (/맛집|식당|먹|배고/u.test(prior)) return { primary: "food", secondary: [] };
      if (/원룸|월세|살/u.test(prior)) return { primary: "housing", secondary: [] };
      if (/일정|스케줄/u.test(prior)) return { primary: "schedule", secondary: [] };
    }
  }

  if (/먹|맛집|배고|배달/u.test(message)) secondary.push("food");
  if (/일정|스케줄|약속/u.test(message)) secondary.push("schedule");
  if (/피곤|힘들|스트레스/u.test(message)) secondary.push("emotion");

  if (secondary.length > 1) {
    if (/먹|맛집|배고/u.test(message)) primary = "food";
    else if (/일정|스케줄/u.test(message)) primary = "schedule";
    else if (/피곤|힘들/u.test(message)) primary = "emotion";
    return {
      primary,
      secondary: secondary.filter((item) => item !== primary),
    };
  }

  return { primary: semantic.domain, secondary };
}

export function toHardModeRun(
  message: string,
  result: OrchestratorResult,
  history?: readonly OrchestrateHistoryTurn[]
): HardModeRun {
  const surface = resolveHonestRoutingSurface(message, result);
  const { primary, secondary } = inferPrimarySecondaryIntents(message, history);
  return {
    input: message,
    surface,
    bucket: resolveHardModeBucket(message, surface),
    summary: (result.summary ?? "").slice(0, 120),
    primaryIntent: primary,
    secondaryIntents: secondary,
  };
}

export function isInfoFallbackAbuse(run: HardModeRun): boolean {
  const semantic = analyzeSemanticRouting(run.input);
  if (semantic.forbidInfo && run.surface === "INFO") return true;
  if (run.summary === GENERIC) return true;
  return false;
}

export function isRandomChatOnly(run: HardModeRun): boolean {
  return (
    run.surface === "INFO" &&
    run.bucket === "INFO" &&
    !/AI|GPT|뭐야|설명|차이/u.test(run.input) &&
    analyzeSemanticRouting(run.input).forbidInfo
  );
}
