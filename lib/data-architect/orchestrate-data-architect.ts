import { isMessyPlaceDump } from "@/lib/action-chat/clean-entity-text";
import type { OrchestratorResult } from "@/lib/action-chat/orchestrator-types";
import { ingestData } from "@/lib/data-architect/ingest-data";
import { formatArchitectSummary } from "@/lib/data-architect/persist-architect-assignment";
import type { DataArchitectInput, DataArchitectWire } from "@/lib/data-architect/types";
import type { LinkActionItem } from "@/types/database";

const ARCHITECT_HINT = /(?:컨테이너|분류|정리|저장|보관|아카이브|데이터\s*넣)/iu;
const URL_PATTERN = /\bhttps?:\/\/[^\s<>"']+/i;

export function isDataArchitectCandidate(message: string): boolean {
  const trimmed = message.trim();
  if (!trimmed || isMessyPlaceDump(trimmed)) return false;
  if (ARCHITECT_HINT.test(trimmed)) return true;
  if (trimmed.length < 12) return false;
  if (URL_PATTERN.test(trimmed) && trimmed.length >= 24) return true;
  return trimmed.length >= 80 && !/[?？]$/.test(trimmed);
}

function architectActions(wire: DataArchitectWire): LinkActionItem[] {
  if (wire.action === "UNCATEGORIZED") {
    return [{
      id: "architect-confirm",
      label: "컨테이너 확인하기",
      kind: "custom",
      payload: { dataArchitect: true, step: "confirm_container", action: wire.action },
    }];
  }
  return [{
    id: "architect-open",
    label: `${wire.container_title} 열기`,
    kind: "custom",
    payload: { dataArchitect: true, container_id: wire.container_id, action: wire.action, step: "open_container" },
  }];
}

export async function classifyAndPersistInput(input: DataArchitectInput) {
  return ingestData(input);
}

export async function orchestrateDataArchitect(input: DataArchitectInput & { message?: string }): Promise<OrchestratorResult | null> {
  const probe = (input.message ?? input.rawInput).trim();
  if (!isDataArchitectCandidate(probe)) return null;

  const enrichedRaw = [input.rawInput.trim(), input.linkUrl ? `링크: ${input.linkUrl}` : null, input.linkTitle ? `제목: ${input.linkTitle}` : null].filter(Boolean).join("\n");
  const wire = await ingestData({ rawInput: enrichedRaw, linkTitle: input.linkTitle, linkUrl: input.linkUrl });

  return {
    summary: formatArchitectSummary(wire),
    actions: architectActions(wire),
    source: "rules",
    confidence: wire.action === "UNCATEGORIZED" ? 0.72 : wire.action === "CREATE_NEW" ? 0.86 : 0.92,
    disclosure: wire.action === "UNCATEGORIZED" ? "high" : "none",
    actionsRevealed: true,
    pendingConfirm: wire.action === "UNCATEGORIZED",
    metadata: { intent: "CONTAINER_MGMT", trust_level_adjustment: "NONE" },
    container: {
      action: wire.action === "CREATE_NEW" ? "CREATE" : wire.action === "APPEND" ? "UPDATE" : "NONE",
      title: wire.container_title,
      should_save: wire.action !== "UNCATEGORIZED",
    },
    dataArchitect: wire,
    thought: `DataArchitect ${wire.action} → ${wire.container_id}`,
  };
}
