import { resolvePluginDeeplink } from "@/lib/action-spawn/resolve-plugin-deeplink";
import {
  LIFE_DOMAIN_BY_KEY,
  LIFE_DOMAIN_CATALOG,
} from "@/lib/life-domain-actions/catalog";
import type { LifeDomainActionDef, LifeDomainKey } from "@/lib/life-domain-actions/types";
import { createOpenAction } from "@/lib/enrichers/action-factory";
import type { LinkActionItem } from "@/types/database";

function toLinkAction(domain: LifeDomainKey, def: LifeDomainActionDef): LinkActionItem {
  const href =
    resolvePluginDeeplink(def.plugin, { label: def.label }) ??
    `rimvio://chat/followup?q=${encodeURIComponent(def.label)}`;

  return createOpenAction({
    label: def.label,
    href,
    icon: def.icon,
    payload: {
      plugin: def.plugin,
      action_tier: def.tier,
      life_domain: domain,
      lifeDomainActionId: def.id,
      domainPrimary: def.tier === "MAIN",
    },
  });
}

export function buildLifeDomainActions(domain: LifeDomainKey): LinkActionItem[] {
  return LIFE_DOMAIN_BY_KEY[domain].actions.map((def) => toLinkAction(domain, def));
}

export function buildAllLifeDomainActions(): LinkActionItem[] {
  return LIFE_DOMAIN_CATALOG.flatMap((entry) =>
    entry.actions.map((def) => toLinkAction(entry.key, def)),
  );
}

export function buildLifeDomainActionById(actionId: string): LinkActionItem | null {
  for (const entry of LIFE_DOMAIN_CATALOG) {
    const def = entry.actions.find((item) => item.id === actionId);
    if (def) {
      return toLinkAction(entry.key, def);
    }
  }
  return null;
}
