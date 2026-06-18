import type {
  CapabilityDispatchRequest,
  CapabilityDispatchResult,
} from "@/lib/capability-registry/capability-contract";
import { submitCapabilityExecution } from "@/lib/execution/submit-capability-execution";

/**
 * Capability Registry entry — WHAT only (validate + resolve + enqueue).
 * Execution Plane owns HOW (adapters, queue, run).
 */
export function dispatchCapability(
  request: CapabilityDispatchRequest,
): CapabilityDispatchResult {
  const submitted = submitCapabilityExecution(request);
  if (!submitted.ok) {
    return {
      ok: false,
      reason: submitted.reason,
      capabilityId: submitted.capabilityId ?? request.capabilityId,
    };
  }
  return {
    ok: true,
    executionId: submitted.execution.executionId,
    capabilityId: submitted.execution.capabilityId,
    providerId: submitted.execution.providerId,
  };
}
