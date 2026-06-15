import { applyDisclosureToOrchestratorResult } from "@/lib/action-chat/action-confidence";
import type { OrchestratorResult } from "@/lib/action-chat/orchestrator-types";
import { dispatcherOutputToLinkActions } from "@/lib/deep-link-dispatch/dispatch-to-link-action";
import { resolveDeepLinkDispatch } from "@/lib/deep-link-dispatch/resolve-dispatch";
import { DEEP_LINK_TOOLS } from "@/lib/deep-link-dispatch/tool-registry";
import { extractDeepLinkParams } from "@/lib/deep-link-dispatch/extract-params";
import { orchestrateKoreanServiceRouter } from "@/lib/korean-service-router/orchestrate-korean-service-router";

function trimSummary(text: string) {
  return text.replace(/\s+/g, " ").trim().slice(0, 40);
}

function findMatchedToolId(message: string): string | undefined {
  for (const tool of DEEP_LINK_TOOLS) {
    if (tool.triggers.some((trigger) => trigger.test(message))) {
      return tool.id;
    }
  }
  return undefined;
}

export function orchestrateDeepLinkDispatch(input: {
  message: string;
}): OrchestratorResult | null {
  const dispatch = resolveDeepLinkDispatch(input.message);
  if (!dispatch) {
    return null;
  }

  const toolId = findMatchedToolId(input.message);
  const summary = trimSummary(dispatch.message);

  if (dispatch.action.status === "MISSING_PARAMETER") {
    return applyDisclosureToOrchestratorResult(
      {
        summary,
        actions: [],
        source: "rules",
        confidence: 0.82,
        metadata: { intent: "ACTION", trust_level_adjustment: "NONE" },
        actionsRevealed: true,
        pendingConfirm: true,
        thought: dispatch.thought,
      },
      0.82
    );
  }

  const actions = dispatcherOutputToLinkActions(dispatch, toolId);
  if (actions.length === 0) {
    return null;
  }

  return applyDisclosureToOrchestratorResult(
    {
      summary,
      actions,
      source: "rules",
      confidence: 0.93,
      metadata: { intent: "ACTION", trust_level_adjustment: "NONE" },
      actionsRevealed: true,
      pendingConfirm: false,
      thought: dispatch.thought,
    },
    0.93
  );
}

/** Detect pasted deep-link URIs in user message */
export function orchestratePastedDeepLink(input: {
  message: string;
}): OrchestratorResult | null {
  const match = input.message.trim().match(/\b([a-z][a-z0-9+.-]*:\/\/[^\s]+)/i);
  if (!match?.[1]) {
    return null;
  }

  const href = match[1].trim();
  if (/^https?:\/\//i.test(href)) {
    return null;
  }

  const tool = DEEP_LINK_TOOLS.find((entry) =>
    entry.triggers.some((trigger) => trigger.test(href))
  );

  const dispatch = {
    thought: "메시지에 포함된 딥링크 URI 감지",
    action: {
      intent: tool?.intent ?? ("MEDIA_SYSTEM" as const),
      target_app: tool?.targetApp ?? "App",
      deep_link: href,
      status: "READY_TO_EXECUTE" as const,
    },
    message: "딥링크를 실행할까요?",
  };

  const actions = dispatcherOutputToLinkActions(dispatch, tool?.id);
  if (actions.length === 0) {
    return null;
  }

  return applyDisclosureToOrchestratorResult(
    {
      summary: trimSummary(dispatch.message),
      actions,
      source: "rules",
      confidence: 0.9,
      metadata: { intent: "ACTION", trust_level_adjustment: "NONE" },
      actionsRevealed: true,
      pendingConfirm: false,
      thought: dispatch.thought,
    },
    0.9
  );
}

export function tryDeepLinkDispatchOrchestration(input: {
  message: string;
}): OrchestratorResult | null {
  return (
    orchestratePastedDeepLink(input) ??
    orchestrateDeepLinkDispatch(input) ??
    orchestrateKoreanServiceRouter(input)
  );
}

// re-export for tests
export { extractDeepLinkParams };
