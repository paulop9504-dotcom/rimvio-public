import type {
  ActionTemplateSchema,
  MergedTemplateWire,
  TemplateBaseAction,
  TemplateBaseItem,
} from "@/lib/action-template/types";

const CONTEXT_ADDITIONS: Array<{
  match: RegExp;
  items: string[];
  actions?: TemplateBaseAction[];
}> = [
  {
    match: /(?:도쿄|tokyo|일본|japan)/iu,
    items: ["돼지코(멀티탭)", "엔화/카드", "포켓 와이파이", "우산"],
  },
  {
    match: /(?:3박|4일|장기)/iu,
    items: ["세탁용품", "여벌 옷"],
  },
  {
    match: /(?:출장|business)/iu,
    items: ["명함", "노트북"],
    actions: [
      {
        type: "SAVE",
        label: "경비 기록",
        id: "expense",
        prompt: "출장 경비 기록해줘",
      },
    ],
  },
  {
    match: /(?:보안\s*회의|security)/iu,
    items: ["녹음기"],
    actions: [
      {
        type: "INFO",
        label: "녹음기 준비",
        id: "recorder",
        prompt: "회의 녹음 준비해줘",
      },
    ],
  },
  {
    match: /(?:병원|치과|clinic)/iu,
    items: [],
    actions: [
      {
        type: "INFO",
        label: "약국 전송",
        id: "pharmacy_send",
        prompt: "처방전 약국 전송 방법 알려줘",
      },
    ],
  },
];

function dedupeItems(items: TemplateBaseItem[]): TemplateBaseItem[] {
  const seen = new Set<string>();
  const result: TemplateBaseItem[] = [];
  for (const entry of items) {
    const key = entry.item.trim().toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(entry);
  }
  return result;
}

function dedupeActions(actions: TemplateBaseAction[]): TemplateBaseAction[] {
  const seen = new Set<string>();
  const result: TemplateBaseAction[] = [];
  for (const entry of actions) {
    if (seen.has(entry.id)) {
      continue;
    }
    seen.add(entry.id);
    result.push(entry);
  }
  return result;
}

/** Step 2a — Rule-based merge (offline / deterministic). */
export function mergeTemplatesRuleBased(input: {
  templates: ActionTemplateSchema[];
  message: string;
}): MergedTemplateWire {
  const message = input.message.trim();
  let baseItems: TemplateBaseItem[] = [];
  let baseActions: TemplateBaseAction[] = [];
  const sourceIds: string[] = [];

  for (const template of input.templates) {
    sourceIds.push(template.template_id);
    baseItems = dedupeItems([...baseItems, ...template.base_items]);
    baseActions = dedupeActions([...baseActions, ...template.base_actions]);
  }

  const added_items: MergedTemplateWire["added_items"] = [];
  const added_actions: MergedTemplateWire["added_actions"] = [];

  for (const rule of CONTEXT_ADDITIONS) {
    if (!rule.match.test(message)) {
      continue;
    }
    for (const item of rule.items) {
      if (!baseItems.some((entry) => entry.item === item)) {
        added_items.push({ item, reason: "context_match" });
        baseItems.push({ item, mandatory: false });
      }
    }
    for (const action of rule.actions ?? []) {
      if (!baseActions.some((entry) => entry.id === action.id)) {
        added_actions.push({ ...action, reason: "context_match" });
        baseActions.push(action);
      }
    }
  }

  const primary = input.templates[0];
  const name =
    input.templates.length > 1
      ? `${input.templates.map((t) => t.name).join(" + ")}`
      : (primary?.name ?? "맞춤 템플릿");

  return {
    template_id: sourceIds.join("+") || "dynamic",
    name,
    added_items,
    added_actions,
    thought: `Rule merge · templates=[${sourceIds.join(", ")}] · +${added_items.length} items · +${added_actions.length} actions`,
  };
}

export function applyMergedWireToBase(input: {
  templates: ActionTemplateSchema[];
  merged: MergedTemplateWire;
}): { actions: TemplateBaseAction[]; items: TemplateBaseItem[] } {
  let items: TemplateBaseItem[] = [];
  let actions: TemplateBaseAction[] = [];

  for (const template of input.templates) {
    items = dedupeItems([...items, ...template.base_items]);
    actions = dedupeActions([...actions, ...template.base_actions]);
  }

  const lockedMandatory = new Set(
    items.filter((item) => item.mandatory).map((item) => item.item.trim().toLowerCase())
  );

  for (const added of input.merged.added_items) {
    if (!items.some((item) => item.item === added.item)) {
      items.push({
        item: added.item,
        mandatory: lockedMandatory.has(added.item.trim().toLowerCase()),
      });
    }
  }

  for (const added of input.merged.added_actions) {
    if (!actions.some((action) => action.id === added.id)) {
      actions.push({
        type: added.type,
        label: added.label,
        id: added.id,
        prompt: added.reason,
      });
    }
  }

  // mandatory_lock — never remove mandatory items
  if (input.templates.some((t) => t.ai_modification_policy.mandatory_lock)) {
    for (const template of input.templates) {
      for (const mandatory of template.base_items.filter((item) => item.mandatory)) {
        if (!items.some((item) => item.item === mandatory.item)) {
          items.push(mandatory);
        }
      }
    }
  }

  return { actions: dedupeActions(actions), items: dedupeItems(items) };
}
