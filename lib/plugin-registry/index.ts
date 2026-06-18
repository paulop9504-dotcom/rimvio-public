export type { PluginDomain, PluginRegistryEntry } from "@/lib/plugin-registry/types";
export {
  PLUGIN_REGISTRY,
  FALLBACK_PLUGIN_ID,
  CHAT_FALLBACK_PLUGIN_ID,
  pluginIdsForDomains,
} from "@/lib/plugin-registry/catalog";
export {
  isRegisteredPlugin,
  sanitizePluginId,
  listPluginsForLlmPrompt,
} from "@/lib/plugin-registry/resolve-plugin";
