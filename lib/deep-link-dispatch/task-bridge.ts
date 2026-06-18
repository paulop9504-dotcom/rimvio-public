import type { ActionAgentTaskResult } from "@/lib/action-chat/action-agent-types";
import { dispatcherOutputToLinkActions } from "@/lib/deep-link-dispatch/dispatch-to-link-action";
import { resolveDeepLinkDispatch } from "@/lib/deep-link-dispatch/resolve-dispatch";
import { DEEP_LINK_TOOLS } from "@/lib/deep-link-dispatch/tool-registry";
import type { DeepLinkDispatcherOutput } from "@/lib/deep-link-dispatch/types";

function emptyExtracted(): ActionAgentTaskResult["extracted_data"] {
  return {
    address: null,
    phone: null,
    datetime: null,
    place_name: null,
    url: null,
    schedule_note: null,
  };
}

function findToolId(message: string): string | undefined {
  for (const tool of DEEP_LINK_TOOLS) {
    if (tool.triggers.some((trigger) => trigger.test(message))) {
      return tool.id;
    }
  }
  return undefined;
}

function actionLabelFor(output: DeepLinkDispatcherOutput): string {
  const app = output.action.target_app;
  switch (output.action.intent) {
    case "FINANCE":
      return app === "Toss" ? "토스 송금" : `${app} 송금`;
    case "MOBILITY":
      return app === "KakaoT" ? "택시 호출" : `${app} 호출`;
    case "NAVIGATION":
      return "길 찾기";
    case "COMMUNICATION":
      if (output.action.deep_link.startsWith("tel:")) {
        return "전화 걸기";
      }
      if (output.action.deep_link.startsWith("sms:")) {
        return "문자 작성";
      }
      return `${app} 열기`;
    case "SHOPPING":
      return "배송 조회";
    default:
      return `${app} 열기`;
  }
}

/** Fragment or full message → Action-Agent task (multi-intent path) */
export function deepLinkDispatchToTaskResult(
  snippet: string
): ActionAgentTaskResult | null {
  const dispatch = resolveDeepLinkDispatch(snippet.trim());
  if (!dispatch || dispatch.action.status !== "READY_TO_EXECUTE") {
    return null;
  }

  return {
    type: "DEEP_LINK",
    extracted_data: {
      ...emptyExtracted(),
      schedule_note: dispatch.message,
      url: dispatch.action.deep_link,
    },
    actions: [
      {
        label: actionLabelFor(dispatch),
        url: dispatch.action.deep_link,
        icon: "link",
      },
    ],
  };
}

export function deepLinkDispatchToLinkActions(snippet: string) {
  const dispatch = resolveDeepLinkDispatch(snippet.trim());
  if (!dispatch || dispatch.action.status !== "READY_TO_EXECUTE") {
    return [];
  }
  return dispatcherOutputToLinkActions(dispatch, findToolId(snippet));
}

export function deepLinkDispatchMissingResult(
  snippet: string
): DeepLinkDispatcherOutput | null {
  const dispatch = resolveDeepLinkDispatch(snippet.trim());
  if (!dispatch || dispatch.action.status !== "MISSING_PARAMETER") {
    return null;
  }
  return dispatch;
}
