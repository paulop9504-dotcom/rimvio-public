import { deepLinkActionToLinkItem } from "@/lib/deep-link-dispatch/dispatch-to-link-action";
import { applyDisclosureToOrchestratorResult } from "@/lib/action-chat/action-confidence";
import type { OrchestratorResult } from "@/lib/action-chat/orchestrator-types";
import {
  compileShadowDashboard,
  formatShadowDashboardText,
  isShadowDashboardQuery,
} from "@/lib/notification-shadow/compile-dashboard";
import type { FutureActionWire } from "@/lib/notification-shadow/types";
import type { LinkActionItem } from "@/types/database";

function futureActionToLinkItem(action: FutureActionWire): LinkActionItem | null {
  if (!action.deepLink && !action.label) {
    return null;
  }
  return deepLinkActionToLinkItem(
    {
      intent: "MEDIA_SYSTEM",
      target_app: action.label,
      deep_link: action.deepLink ?? "",
      status: action.deepLink ? "READY_TO_EXECUTE" : "MISSING_PARAMETER",
    },
    undefined,
    action.label
  );
}

/** Phase 1 · Tier 5 — explicit dashboard query only (deterministic early return). */
export function orchestrateShadowDashboard(message: string): OrchestratorResult | null {
  if (!isShadowDashboardQuery(message)) {
    return null;
  }

  return buildShadowDashboardResult();
}

export function buildShadowDashboardResult(): OrchestratorResult {
  const dashboard = compileShadowDashboard();
  const summary = formatShadowDashboardText(dashboard).slice(0, 800);
  const actions: LinkActionItem[] = [];

  for (const section of [dashboard.now, dashboard.work, dashboard.topics]) {
    for (const action of section.actions) {
      const item = futureActionToLinkItem({
        type: "OPEN_LINK",
        label: action.label,
        deepLink: action.deepLink,
        confidence: 0.9,
      });
      if (item) {
        actions.push(item);
      }
    }
  }

  return applyDisclosureToOrchestratorResult(
    {
      summary,
      actions: actions.slice(0, 4),
      source: "rules",
      confidence: 0.92,
      metadata: { intent: "ACTION", trust_level_adjustment: "NONE" },
      actionsRevealed: true,
      pendingConfirm: false,
      thought: "Shadow Store → Action Dashboard",
    },
    0.92
  );
}

export { isShadowDashboardQuery };
