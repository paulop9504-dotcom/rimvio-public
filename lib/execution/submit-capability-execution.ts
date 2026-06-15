import type { CapabilityDispatchRequest } from "@/lib/capability-registry/capability-contract";
import { getCapability } from "@/lib/capability-registry/capability-registry";
import { resolveCapabilityProvider } from "@/lib/capability-registry/capability-resolver";
import { enqueueExecution } from "@/lib/execution/execution-dispatcher";
import type { ExecutionDispatchResult } from "@/lib/execution/execution-contract";

function pickParam(inputs: Record<string, string>, ...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = inputs[key]?.trim();
    if (value) {
      return value;
    }
  }
  return undefined;
}

function validateCapabilityInputs(
  request: CapabilityDispatchRequest,
): string | null {
  const capability = getCapability(request.capabilityId);
  if (!capability) {
    return "unknown_capability";
  }
  const inputs = request.inputs ?? {};
  for (const field of capability.inputSchema.fields) {
    if (field.required && !pickParam(inputs, field.key)) {
      return `missing_${field.key}`;
    }
  }
  return null;
}

/**
 * Bridge: Capability Registry (WHAT) → Execution Plane (HOW).
 * Resolves provider in registry; enqueues job in execution plane only.
 */
export function submitCapabilityExecution(
  request: CapabilityDispatchRequest,
): ExecutionDispatchResult {
  const validationError = validateCapabilityInputs(request);
  if (validationError) {
    return { ok: false, reason: validationError, capabilityId: request.capabilityId };
  }

  const resolved = resolveCapabilityProvider({
    capabilityId: request.capabilityId,
    platform: request.platform,
    preferredProviderId: request.providerId,
  });
  if (!resolved) {
    return { ok: false, reason: "no_provider", capabilityId: request.capabilityId };
  }

  const capability = getCapability(request.capabilityId)!;
  return enqueueExecution({
    capabilityId: resolved.capabilityId,
    providerId: resolved.providerId,
    inputs: request.inputs,
    label: capability.name,
    mode: capability.executionMode,
    metadata: request.metadata,
  });
}
