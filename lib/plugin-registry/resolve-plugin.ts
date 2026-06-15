import {
  CHAT_FALLBACK_PLUGIN_ID,
  FALLBACK_PLUGIN_ID,
  PLUGIN_REGISTRY,
} from "@/lib/plugin-registry/catalog";
import type { PluginDomain } from "@/lib/plugin-registry/types";

export function isRegisteredPlugin(plugin: string | null | undefined): boolean {
  if (!plugin?.trim()) {
    return false;
  }
  return PLUGIN_REGISTRY.some((entry) => entry.id === plugin.trim());
}

export function sanitizePluginId(
  plugin: string | null | undefined,
  domain: PluginDomain = "generic",
): string {
  const trimmed = plugin?.trim();
  if (trimmed && isRegisteredPlugin(trimmed)) {
    const entry = PLUGIN_REGISTRY.find((item) => item.id === trimmed);
    if (entry?.domains.includes(domain) || entry?.domains.includes("generic")) {
      return trimmed;
    }
  }

  if (domain === "travel" || domain === "work") {
    return FALLBACK_PLUGIN_ID;
  }
  return CHAT_FALLBACK_PLUGIN_ID;
}

export function listPluginsForLlmPrompt(domains: PluginDomain[]): string {
  const ids = new Set<string>();
  for (const entry of PLUGIN_REGISTRY) {
    if (entry.domains.some((d) => domains.includes(d) || d === "generic")) {
      ids.add(entry.id);
    }
  }
  return [...ids].join(", ");
}
