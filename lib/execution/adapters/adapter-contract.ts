import type { CapabilityId, CapabilityProviderId } from "@/lib/capability-registry/capability-contract";
import type { ExecutionPayload, ExecutionResult } from "@/lib/execution/execution-contract";

export type AdapterBuildInput = {
  capabilityId: CapabilityId;
  providerId: CapabilityProviderId;
  inputs: Record<string, string>;
  label: string;
  mode: ExecutionPayload["mode"];
};

export type AdapterBuildOutput = {
  uri: string;
  fallbackUri?: string;
};

export type AdapterExecuteContext = {
  sendPrompt?: (text: string) => void;
};

export type ExecutionAdapter = {
  id: string;
  capabilityIds: readonly CapabilityId[];
  buildPayload(input: AdapterBuildInput): AdapterBuildOutput | null;
  execute(
    payload: ExecutionPayload,
    context?: AdapterExecuteContext,
  ): ExecutionResult;
};
