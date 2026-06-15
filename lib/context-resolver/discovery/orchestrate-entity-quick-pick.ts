import type { OrchestratorResult } from "@/lib/action-chat/orchestrator-types";
import { buildEntityActionSurface } from "@/lib/event-kernel/entity/entity-action-surface";
import { detectEntityOnlyInput } from "@/lib/event-kernel/entity/entity-action-surface";
import { hasPendingEventReview } from "@/lib/event-kernel/review/infer-approval-action";
import { orchestratorResultFromEntitySurface } from "@/lib/event-kernel/entity/apply-entity-action-surface";
import type { EntityQuickPickWire } from "@/lib/context-resolver/discovery/entity-quick-pick-types";
import { entitySurfaceToQuickPickWire } from "@/lib/event-kernel/entity/apply-entity-action-surface";

/** True when the user message is entity-only (e.g. "쿠우쿠우", "삼성전자"). */
export function isBareBrandUtterance(message: string): boolean {
  return detectEntityOnlyInput(message) !== null;
}

export function buildEntityQuickPickWire(entity: string): EntityQuickPickWire {
  const surface = buildEntityActionSurface(entity.trim());
  if (surface) {
    return entitySurfaceToQuickPickWire(surface);
  }

  const name = entity.trim();
  return {
    entity: name,
    lead: `${name} 관련해서 많이 찾는 정보입니다.`,
    options: [
      { id: "info", label: "정보", prompt: `${name} 정보` },
    ],
  };
}

export function orchestrateEntityQuickPick(message: string): OrchestratorResult | null {
  if (hasPendingEventReview()) {
    return null;
  }

  const surface = buildEntityActionSurface(message);
  if (!surface) {
    return null;
  }

  return orchestratorResultFromEntitySurface(surface);
}
