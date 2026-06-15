import type { PluginManifest, RegisteredPlugin } from "@/lib/platform/plugin-contract";
import {
  validatePluginManifest,
  validateRegisteredPlugin,
  type PluginValidationResult,
} from "@/lib/platform/plugin-validator";

const plugins = new Map<string, RegisteredPlugin>();

export function registerPlugin(plugin: RegisteredPlugin): PluginValidationResult {
  const validation = validateRegisteredPlugin(plugin);
  if (!validation.ok) {
    return validation;
  }
  if (plugins.has(plugin.manifest.id)) {
    return { ok: false, reason: "plugin_already_registered" };
  }
  plugins.set(plugin.manifest.id, plugin);
  return { ok: true };
}

export function unregisterPlugin(pluginId: string): boolean {
  return plugins.delete(pluginId);
}

export function getPlugin(pluginId: string): RegisteredPlugin | null {
  return plugins.get(pluginId) ?? null;
}

export function listPlugins(): readonly RegisteredPlugin[] {
  return [...plugins.values()];
}

export function listPluginManifests(): readonly PluginManifest[] {
  return listPlugins().map((row) => row.manifest);
}

export function resolvePluginCapability(
  capabilityId: string,
): { plugin: RegisteredPlugin; action: string } | null {
  if (!capabilityId.startsWith("PLUGIN:")) {
    return null;
  }
  const parts = capabilityId.split(":");
  const pluginId = parts[1];
  const action = parts.slice(2).join(":");
  if (!pluginId || !action) {
    return null;
  }
  const plugin = plugins.get(pluginId);
  if (!plugin) {
    return null;
  }
  return { plugin, action };
}

export function resetExtensionRegistryForTests(): void {
  plugins.clear();
}
