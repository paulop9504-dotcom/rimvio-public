import { listManualCoreTemplates } from "@/lib/action-registry/manual-templates";
import { listPromotedTemplates } from "@/lib/action-registry/action-registry-store";
import type {
  ActionArchitectWire,
  ActionRegistryEntry,
  ActionStrategyTier,
  ActionTemplateMatch,
} from "@/lib/action-registry/types";
import type { PredictiveDockWire } from "@/lib/predictive-dock/types";
import type { PredictiveActionType } from "@/lib/predictive-dock/types";

const DOCK_ICONS: Record<PredictiveActionType, string> = {
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

function toPredictiveType(raw: string): PredictiveActionType {
  const upper = raw.toUpperCase();
  if (upper in DOCK_ICONS) {
    return upper as PredictiveActionType;
  }
  if (/NAV|MAP/i.test(raw)) {
    return "NAVIGATE";
  }
  if (/CALL|PHONE/i.test(raw)) {
    return "CALL";
  }
  return "INFO";
}

function matchesContext(template: ActionRegistryEntry, blob: string): boolean {
  const pattern = new RegExp(template.contextKey, "iu");
  return pattern.test(blob);
}

function registryToArchitectWire(
  template: ActionRegistryEntry,
  tier: ActionStrategyTier,
  message: string
): ActionArchitectWire {
  return {
    thought: `ActionArchitect · ${tier} · template=${template.id}`,
    strategy_applied: tier,
    template_id: template.id,
    message,
    main_action: template.main_action
      ? {
          type: template.main_action.type,
          label: template.main_action.label,
          priority: template.main_action.priority ?? 95,
          prompt: template.main_action.prompt,
        }
      : null,
    shadow_actions: template.shadow_actions.map((item) => ({
      type: item.type,
      label: item.label,
      score: item.score ?? 70,
      prompt: item.prompt,
    })),
  };
}

export function matchActionTemplate(input: {
  message: string;
  placeName?: string | null;
  task?: string | null;
  minutesUntil?: number | null;
}): ActionTemplateMatch | null {
  const blob = `${input.message} ${input.placeName ?? ""} ${input.task ?? ""}`.trim();

  for (const template of listManualCoreTemplates()) {
    if (matchesContext(template, blob)) {
      return { tier: "MANUAL_CORE", template };
    }
  }

  for (const template of listPromotedTemplates()) {
    if (matchesContext(template, blob)) {
      return { tier: "LEARNED_TEMPLATE", template };
    }
  }

  return null;
}

export function buildArchitectWireFromTemplate(
  match: ActionTemplateMatch,
  message: string,
  minutesUntil?: number | null
): ActionArchitectWire {
  let wire = registryToArchitectWire(match.template, match.tier, message);

  if (minutesUntil != null && minutesUntil <= 60 && wire.main_action) {
    const exec = wire.shadow_actions.find((item) =>
      /NAVIGATE|CALL|TAXI|TRANSIT|ZOOM/i.test(item.type)
    );
    if (exec) {
      wire = {
        ...wire,
        message:
          minutesUntil <= 60
            ? `곧 ${wire.main_action.label} 시간이에요. 실행 위주로 준비할게요.`
            : wire.message,
        main_action: {
          type: exec.type,
          label: exec.label,
          priority: 99,
          prompt: exec.prompt,
        },
        shadow_actions: wire.shadow_actions.filter((item) => item.label !== exec.label),
      };
    }
  }

  return wire;
}

export function architectWireToDockWire(wire: ActionArchitectWire): PredictiveDockWire {
  const templateId = wire.template_id ?? null;
  const strategyApplied = wire.strategy_applied;
  const contextKey =
    strategyApplied === "DYNAMIC_INFERENCE" ? wire.message.slice(0, 80) : undefined;

  return {
    main_action: wire.main_action
      ? {
          id: `architect-main-${templateId ?? "dynamic"}`,
          type: toPredictiveType(wire.main_action.type),
          label: wire.main_action.label,
          icon: DOCK_ICONS[toPredictiveType(wire.main_action.type)],
          score: wire.main_action.priority,
          state: wire.main_action.priority >= 80 ? "ACTIVE" : "WARM",
          prompt: wire.main_action.prompt ?? wire.main_action.label,
          templateId,
          strategyApplied,
          contextKey,
        }
      : null,
    shadow_actions: wire.shadow_actions.slice(0, 4).map((item, index) => ({
      id: `architect-shadow-${index}`,
      type: toPredictiveType(item.type),
      label: item.label,
      icon: DOCK_ICONS[toPredictiveType(item.type)],
      score: item.score,
      state: "WARM" as const,
      prompt: item.prompt ?? item.label,
      templateId,
      strategyApplied,
      contextKey,
    })),
  };
}

export function buildAvailableTemplatesMarkdown(
  promoted: ActionRegistryEntry[]
): string {
  const manual = listManualCoreTemplates();
  const learned = promoted.filter((item) => item.strategy_source !== "MANUAL_CORE");

  const lines = ["# [AVAILABLE TEMPLATES]"];

  for (const item of [...manual, ...learned]) {
    const actions = [
      item.main_action?.label,
      ...item.shadow_actions.map((shadow) => shadow.label),
    ]
      .filter(Boolean)
      .join(", ");
    lines.push(`- ID: ${item.id} | Actions: [${actions}]`);
  }

  if (lines.length === 1) {
    lines.push("- (none promoted yet — use DYNAMIC_INFERENCE when no Tier 1 match)");
  }

  return lines.join("\n");
}
