import { instantiateTemplate } from "@/lib/action-template/instantiate-template";
import { loadMatchingTemplates } from "@/lib/action-template/match-template";
import { mergeTemplatesWithLlm } from "@/lib/action-template/merge-template-llm";
import { saveTemplateInstance } from "@/lib/action-template/template-instance-store";
import type { TemplateInstance, TemplateMergeResult } from "@/lib/action-template/types";
import type {
  PredictiveDockAction,
  PredictiveDockWire,
  PredictiveActionType,
} from "@/lib/predictive-dock/types";

/** Load → Transform → Instantiate pipeline. */
export async function runTemplateMergePipeline(input: {
  message: string;
}): Promise<TemplateMergeResult | null> {
  const templates = loadMatchingTemplates(input.message);
  if (!templates.length) {
    return null;
  }

  const { merged, strategy } = await mergeTemplatesWithLlm({
    templates,
    message: input.message,
  });

  const instance = instantiateTemplate({
    templates,
    merged,
    message: input.message,
  });

  saveTemplateInstance(instance);

  return {
    instance,
    merged_wire: merged,
    strategy,
  };
}

const ACTION_TYPE_MAP: Record<string, PredictiveActionType> = {
  CHECKLIST: "LIST",
  LINK: "LINK",
  SAVE: "SAVE",
  CALL: "CALL",
  NAVIGATE: "NAVIGATE",
  ZOOM: "ZOOM",
  INFO: "INFO",
  CHECK: "CHECK",
};

const ICON: Record<PredictiveActionType, string> = {
  NAVIGATE: "🧭",
  CALL: "📞",
  INFO: "ℹ️",
  TRANSIT: "🚇",
  TAXI: "🚕",
  ZOOM: "📹",
  PARKING: "🅿️",
  EXPENSE: "🧾",
  NEXT: "📅",
  REST: "☕",
  SAVE: "💾",
  CHECK: "✅",
  LIST: "📋",
  SHARE: "📍",
  TICKET_QR: "🎫",
  LINK: "🔗",
};

function toDockAction(
  action: TemplateInstance["actions"][number],
  index: number,
  state: "ACTIVE" | "WARM",
  score: number
): PredictiveDockAction {
  const type = ACTION_TYPE_MAP[action.type] ?? "INFO";
  return {
    id: `tpl-${action.id}`,
    type,
    label: action.label,
    icon: ICON[type],
    score,
    state,
    prompt: action.prompt ?? action.url ?? action.label,
    templateId: action.id,
    strategyApplied: "MANUAL_CORE",
  };
}

/** Step 3 output → Action Dock wire. */
export function instanceToDockWire(instance: TemplateInstance): PredictiveDockWire {
  const checklist = instance.actions.find((action) => action.type === "CHECKLIST");
  const others = instance.actions.filter((action) => action.type !== "CHECKLIST");

  const main_action = checklist
    ? toDockAction(checklist, 0, "ACTIVE", 95)
    : others[0]
      ? toDockAction(others[0], 0, "ACTIVE", 90)
      : null;

  const shadow_actions = others
    .filter((action) => action.id !== main_action?.templateId)
    .slice(0, 4)
    .map((action, index) => toDockAction(action, index + 1, "WARM", 78 - index * 3));

  return { main_action, shadow_actions };
}

export function instanceToPackingWire(instance: TemplateInstance) {
  return {
    tripId: instance.instance_id,
    destinationLabel: instance.name,
    list: instance.items.map((item) => ({
      id: item.id,
      item: item.item,
      checked: item.checked,
    })),
  };
}
