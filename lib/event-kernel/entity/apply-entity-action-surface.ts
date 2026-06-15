import type { OrchestratorResult } from "@/lib/action-chat/orchestrator-types";
import type { EntityQuickPickWire } from "@/lib/context-resolver/discovery/entity-quick-pick-types";
import type { EntityActionSurfaceWire } from "@/lib/event-kernel/entity/entity-action-surface-types";
import type {
  EventKernelOSOutput,
  EventKernelOSResult,
} from "@/lib/event-kernel/run-event-kernel-os";
import type { KernelUiRenderModel } from "@/lib/event-kernel/render-kernel-ui";

export function entitySurfaceToQuickPickWire(
  surface: EntityActionSurfaceWire
): EntityQuickPickWire {
  return {
    entity: surface.entity,
    lead: surface.lead,
    options: surface.suggestions.map((item) => ({
      id: item.id,
      label: item.label,
      prompt: item.prompt,
    })),
  };
}

export function orchestratorResultFromEntitySurface(
  surface: EntityActionSurfaceWire
): OrchestratorResult {
  const wire = entitySurfaceToQuickPickWire(surface);
  return {
    summary: wire.lead,
    actions: [],
    source: "rules",
    confidence: surface.confidence,
    disclosure: "none",
    actionsRevealed: false,
    pendingConfirm: false,
    entityQuickPick: wire,
    presentation: { mode: "ENTITY_QUICK_PICK" },
    metadata: {
      intent: "ACTION",
      trust_level_adjustment: "NONE",
      entity_input_state: surface.state,
      entity_type_guess: surface.entityType,
    },
    thought: `entity_action_surface · ${surface.entityType} · ${surface.entity}`,
  };
}

function buildOptionsUi(surface: EntityActionSurfaceWire): KernelUiRenderModel {
  const bullets = surface.suggestions.map((s) => `• ${s.label}`).join("\n");
  return {
    kind: "options",
    sectionLabel: "👉 자주 찾는 정보",
    coreMessage: `${surface.lead}\n\n${bullets}`,
    nextActionLabel: null,
    actionCards: surface.suggestions.map((s) => ({
      id: s.id,
      label: s.label,
    })),
    decision: "CLARIFY",
  };
}

/**
 * Presentation-only overlay — kernel decision, memory, and execution plan stay unchanged.
 */
export function overlayEntityActionSurfaceOnOsResult(
  result: EventKernelOSResult,
  surface: EntityActionSurfaceWire
): EventKernelOSResult {
  const ui = buildOptionsUi(surface);
  const presentationResult = orchestratorResultFromEntitySurface(surface);

  const output: EventKernelOSOutput = {
    ...result.output,
    summary: surface.lead,
    disposition: "terminal",
    hint: "options",
    actions: surface.suggestions.map((s) => ({ id: s.id, label: s.label })),
  };

  return {
    ...result,
    output,
    ui,
    orchestratorResult: result.orchestratorResult
      ? {
          ...presentationResult,
          meta: {
            ...result.orchestratorResult.meta,
            ...presentationResult.meta,
            kernel_decision: result.kernel.committedDecision,
            entity_input_state: surface.state,
            entity_type_guess: surface.entityType,
          },
        }
      : presentationResult,
    entityActionSurface: surface,
  };
}
