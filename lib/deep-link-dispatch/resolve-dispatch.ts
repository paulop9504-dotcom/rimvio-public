import {
  extractDeepLinkParams,
  findMissingParams,
} from "@/lib/deep-link-dispatch/extract-params";
import {
  DEEP_LINK_TOOLS,
  getDeepLinkToolById,
} from "@/lib/deep-link-dispatch/tool-registry";
import type {
  DeepLinkDispatcherOutput,
  DeepLinkToolDefinition,
} from "@/lib/deep-link-dispatch/types";

function scoreTool(message: string, tool: DeepLinkToolDefinition): number {
  let score = 0;
  for (const trigger of tool.triggers) {
    if (trigger.test(message)) {
      score += 10;
    }
  }
  return score;
}

function pickTool(message: string): DeepLinkToolDefinition | null {
  let best: DeepLinkToolDefinition | null = null;
  let bestScore = 0;

  for (const tool of DEEP_LINK_TOOLS) {
    const score = scoreTool(message, tool);
    if (score > bestScore) {
      bestScore = score;
      best = tool;
    }
  }

  return bestScore > 0 ? best : null;
}

export function resolveDeepLinkDispatch(message: string): DeepLinkDispatcherOutput | null {
  const trimmed = message.trim();
  if (!trimmed) {
    return null;
  }

  const tool = pickTool(trimmed);
  if (!tool) {
    return null;
  }

  const params = extractDeepLinkParams(trimmed, tool);
  const deepLink = tool.build({ message: trimmed, params });
  const missing = findMissingParams(tool, params, deepLink);

  if (missing.length > 0 || !deepLink) {
    return {
      thought: `${tool.targetApp} 딥링크 구성 — ${missing.join(", ") || "목적지"} 파라미터 필요`,
      action: {
        intent: tool.intent,
        target_app: tool.targetApp,
        deep_link: "",
        status: "MISSING_PARAMETER",
        missing_parameter: missing.length > 0 ? missing : ["destination"],
      },
      message: tool.buildMissingMessage(missing),
    };
  }

  return {
    thought: `${tool.intent} 의도 → ${tool.targetApp} 딥링크 구성`,
    action: {
      intent: tool.intent,
      target_app: tool.targetApp,
      deep_link: deepLink,
      status: "READY_TO_EXECUTE",
    },
    message: `${tool.targetApp} 화면을 띄울까요?`,
  };
}

export function resolveDeepLinkDispatchByToolId(
  toolId: string,
  message: string,
  params: Record<string, string> = {}
): DeepLinkDispatcherOutput | null {
  const tool = getDeepLinkToolById(toolId);
  if (!tool) {
    return null;
  }

  const merged = { ...extractDeepLinkParams(message, tool), ...params };
  const deepLink = tool.build({ message, params: merged });
  const missing = findMissingParams(tool, merged, deepLink);

  if (missing.length > 0 || !deepLink) {
    return {
      thought: `${tool.targetApp} 파라미터 보완 필요`,
      action: {
        intent: tool.intent,
        target_app: tool.targetApp,
        deep_link: "",
        status: "MISSING_PARAMETER",
        missing_parameter: missing,
      },
      message: tool.buildMissingMessage(missing),
    };
  }

  return {
    thought: `${tool.targetApp} 딥링크 실행 준비`,
    action: {
      intent: tool.intent,
      target_app: tool.targetApp,
      deep_link: deepLink,
      status: "READY_TO_EXECUTE",
    },
    message: `${tool.targetApp} 화면을 띄울까요?`,
  };
}

export function isDeepLinkDispatcherOutput(value: unknown): value is DeepLinkDispatcherOutput {
  if (!value || typeof value !== "object") {
    return false;
  }
  const record = value as Record<string, unknown>;
  const action = record.action;
  if (!action || typeof action !== "object") {
    return false;
  }
  const actionRecord = action as Record<string, unknown>;
  return (
    typeof record.thought === "string" &&
    typeof record.message === "string" &&
    typeof actionRecord.intent === "string" &&
    typeof actionRecord.target_app === "string" &&
    typeof actionRecord.status === "string"
  );
}
