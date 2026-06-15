import { validateLinkAction } from "@/lib/actions/action-validator";
import { createOpenAction } from "@/lib/enrichers/action-factory";
import { resolveWebFallbackForTool } from "@/lib/deep-link-dispatch/tool-registry";
import type { DeepLinkActionWire, DeepLinkDispatcherOutput } from "@/lib/deep-link-dispatch/types";
import type { LinkActionItem } from "@/types/database";

export function deepLinkActionToLinkItem(
  action: DeepLinkActionWire,
  toolId?: string,
  labelOverride?: string
): LinkActionItem | null {
  if (action.status !== "READY_TO_EXECUTE" || !action.deep_link.trim()) {
    return null;
  }

  const label =
    labelOverride ??
    (action.intent === "FINANCE" && action.target_app === "Toss"
      ? "토스 송금"
      : action.intent === "MOBILITY" && action.target_app === "KakaoT"
        ? "택시 호출"
        : `${action.target_app} 열기`);

  const open = createOpenAction({
    label,
    href: action.deep_link.trim(),
    icon: "link",
    copyText: action.deep_link.trim(),
    payload: {
      deepLinkDispatch: true,
      dispatchIntent: action.intent,
      dispatchTargetApp: action.target_app,
      dispatchStatus: action.status,
      dispatchToolId: toolId ?? null,
      fallbackHref: toolId
        ? resolveWebFallbackForTool(toolId, action.deep_link.trim())
        : null,
    },
  });

  return validateLinkAction(open);
}

export function dispatcherOutputToLinkActions(
  output: DeepLinkDispatcherOutput,
  toolId?: string
): LinkActionItem[] {
  const item = deepLinkActionToLinkItem(output.action, toolId);
  return item ? [item] : [];
}
