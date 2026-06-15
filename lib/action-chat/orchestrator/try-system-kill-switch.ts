import type { OrchestratorResult } from "@/lib/action-chat/orchestrator-types";

/** Phase 1 · Tier 0 — maintenance / account lock / feature kill. */
export function trySystemKillSwitch(): OrchestratorResult | null {
  if (process.env.RIMVIO_KILL_SWITCH === "1") {
    return {
      summary: "점검 중입니다. 잠시 후 다시 시도해 주세요.",
      actions: [],
      source: "rules",
      confidence: 1,
      disclosure: "none",
      actionsRevealed: false,
      pendingConfirm: false,
      metadata: { intent: "ACTION", trust_level_adjustment: "NONE" },
    };
  }
  return null;
}
