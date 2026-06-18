import type { CapabilityId } from "@/lib/capability-registry/capability-contract";
import type { ExecutionAdapter } from "@/lib/execution/adapters/adapter-contract";
import { alarmAdapter } from "@/lib/execution/adapters/alarm-adapter";
import { callAdapter } from "@/lib/execution/adapters/call-adapter";
import { documentAdapter } from "@/lib/execution/adapters/document-adapter";
import { navigateAdapter } from "@/lib/execution/adapters/navigate-adapter";

const ADAPTERS: ExecutionAdapter[] = [
  navigateAdapter,
  callAdapter,
  alarmAdapter,
  documentAdapter,
];

const BY_CAPABILITY = new Map<CapabilityId, ExecutionAdapter>();

for (const adapter of ADAPTERS) {
  for (const capabilityId of adapter.capabilityIds) {
    BY_CAPABILITY.set(capabilityId, adapter);
  }
}

export function getAdapterForCapability(
  capabilityId: CapabilityId,
): ExecutionAdapter | null {
  return BY_CAPABILITY.get(capabilityId) ?? null;
}

export function listExecutionAdapters(): readonly ExecutionAdapter[] {
  return ADAPTERS;
}
