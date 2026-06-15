import {
  applyMergedWireToBase,
} from "@/lib/action-template/merge-template-rule";
import type {
  ActionTemplateSchema,
  MergedTemplateWire,
  TemplateInstance,
} from "@/lib/action-template/types";

function slugInstanceId(message: string): string {
  const stamp = Date.now().toString(36);
  const hint = message
    .trim()
    .slice(0, 12)
    .replace(/\s+/g, "_")
    .replace(/[^\w가-힣]/gu, "");
  return `user_${hint || "trip"}_${stamp}`;
}

/** Step 3 — Instantiate: merged template → user-specific instance. */
export function instantiateTemplate(input: {
  templates: ActionTemplateSchema[];
  merged: MergedTemplateWire;
  message: string;
}): TemplateInstance {
  const { actions, items } = applyMergedWireToBase({
    templates: input.templates,
    merged: input.merged,
  });

  const now = new Date().toISOString();
  const primary = input.templates[0];

  return {
    instance_id: slugInstanceId(input.message),
    source_template_ids: input.templates.map((template) => template.template_id),
    name: input.merged.name || primary?.name || "맞춤 템플릿",
    category: primary?.category ?? "Generic",
    user_context: input.message.trim(),
    actions,
    items: items.map((item, index) => ({
      ...item,
      id: `item-${index}-${item.item.replace(/\s+/g, "-").slice(0, 16)}`,
      checked: false,
    })),
    createdAt: now,
    updatedAt: now,
  };
}
