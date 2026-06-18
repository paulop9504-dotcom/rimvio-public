import {
  FORBIDDEN_PLUGIN_PERMISSIONS,
  type ForbiddenPluginPermission,
  type PluginManifest,
  type PluginPermission,
  type RegisteredPlugin,
} from "@/lib/platform/plugin-contract";

const PLUGIN_ID_PATTERN = /^[a-z][a-z0-9-]{1,48}$/;

const PERMISSIONS_BY_TYPE: Record<PluginManifest["type"], readonly PluginPermission[]> = {
  surface: ["read_surfaces", "register_surface"],
  capability: ["dispatch_capability"],
  signal: ["emit_signal"],
  loop: ["observe_loop"],
  adapter: ["read_surfaces", "emit_signal", "observe_loop"],
};

export type PluginValidationResult =
  | { ok: true }
  | { ok: false; reason: string };

function hasForbiddenPermission(manifest: PluginManifest): ForbiddenPluginPermission | null {
  for (const permission of manifest.permissions) {
    if ((FORBIDDEN_PLUGIN_PERMISSIONS as readonly string[]).includes(permission)) {
      return permission as ForbiddenPluginPermission;
    }
  }
  return null;
}

export function validatePluginManifest(manifest: PluginManifest): PluginValidationResult {
  if (!PLUGIN_ID_PATTERN.test(manifest.id)) {
    return { ok: false, reason: "invalid_plugin_id" };
  }
  if (!manifest.name.trim()) {
    return { ok: false, reason: "missing_plugin_name" };
  }
  if (!manifest.version.trim()) {
    return { ok: false, reason: "missing_plugin_version" };
  }

  const forbidden = hasForbiddenPermission(manifest);
  if (forbidden) {
    return { ok: false, reason: `forbidden_permission:${forbidden}` };
  }

  const allowed = PERMISSIONS_BY_TYPE[manifest.type];
  for (const permission of manifest.permissions) {
    if (!allowed.includes(permission)) {
      return { ok: false, reason: `permission_not_allowed_for_type:${permission}` };
    }
  }

  if (manifest.type === "capability" && !manifest.permissions.includes("dispatch_capability")) {
    return { ok: false, reason: "capability_plugin_requires_dispatch_permission" };
  }

  for (const capabilityId of manifest.capabilityIds ?? []) {
    if (!capabilityId.startsWith(`PLUGIN:${manifest.id}:`)) {
      return { ok: false, reason: "capability_id_namespace_mismatch" };
    }
  }

  return { ok: true };
}

export function validateRegisteredPlugin(plugin: RegisteredPlugin): PluginValidationResult {
  const manifestResult = validatePluginManifest(plugin.manifest);
  if (!manifestResult.ok) {
    return manifestResult;
  }
  if (plugin.manifest.type === "capability" && !plugin.capabilityHandler) {
    return { ok: false, reason: "capability_handler_required" };
  }
  return { ok: true };
}
