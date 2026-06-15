import { listStandardTemplates } from "@/lib/action-template/standard-templates";
import type { ActionTemplateSchema } from "@/lib/action-template/types";

function matchesContext(template: ActionTemplateSchema, message: string): boolean {
  const pattern = new RegExp(template.context_key, "iu");
  return pattern.test(message);
}

/** Step 1 — Load: match user input to standard template(s). */
export function loadMatchingTemplates(message: string): ActionTemplateSchema[] {
  const trimmed = message.trim();
  if (!trimmed) {
    return [];
  }

  const hits = listStandardTemplates().filter((template) =>
    matchesContext(template, trimmed)
  );

  if (hits.length === 0) {
    return [];
  }

  // 출장 = trip + work inheritance
  if (/(?:출장|business\s*trip|biz\s*trip)/iu.test(trimmed)) {
    const trip = listStandardTemplates().find((t) => t.template_id === "trip_basic_001");
    const work = listStandardTemplates().find((t) => t.template_id === "work_basic_001");
    const merged: ActionTemplateSchema[] = [];
    if (trip) {
      merged.push(trip);
    }
    if (work && !merged.some((t) => t.template_id === work.template_id)) {
      merged.push(work);
    }
    for (const hit of hits) {
      if (!merged.some((t) => t.template_id === hit.template_id)) {
        merged.push(hit);
      }
    }
    return merged;
  }

  return hits;
}

export function resolvePrimaryTemplate(message: string): ActionTemplateSchema | null {
  const loaded = loadMatchingTemplates(message);
  return loaded[0] ?? null;
}
