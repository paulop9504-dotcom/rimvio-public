import type { CapabilityId, CapabilityProviderId } from "@/lib/capability-registry/capability-contract";

export const EXECUTION_CONTRACT_VERSION = 1 as const;

export type ExecutionStatus =
  | "queued"
  | "ready"
  | "executing"
  | "completed"
  | "failed"
  | "cancelled";

export type ExecutionPayload = {
  label: string;
  inputs: Record<string, string>;
  uri?: string;
  fallbackUri?: string;
  mode: "deeplink" | "web" | "in_app" | "prompt";
};

export type ExecutionResult = {
  ok: boolean;
  uri?: string;
  message?: string;
  providerId?: CapabilityProviderId;
};

export type ExecutionRecord = {
  executionId: string;
  capabilityId: CapabilityId;
  providerId: CapabilityProviderId;
  payload: ExecutionPayload;
  status: ExecutionStatus;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  result?: ExecutionResult;
  error?: string;
  metadata?: Record<string, string>;
  retryCount: number;
};

export type EnqueueExecutionInput = {
  capabilityId: CapabilityId;
  providerId: CapabilityProviderId;
  inputs?: Record<string, string>;
  label?: string;
  mode?: ExecutionPayload["mode"];
  metadata?: Record<string, string>;
};

export type ExecutionDispatchResult =
  | { ok: true; execution: ExecutionRecord }
  | { ok: false; reason: string; capabilityId?: CapabilityId };
