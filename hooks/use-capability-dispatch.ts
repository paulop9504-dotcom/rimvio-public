"use client";

import { useCallback } from "react";
import type { CapabilityDispatchRequest } from "@/lib/capability-registry";
import { dispatchCapability } from "@/lib/capability-registry";
import type { ExecutionRecord } from "@/lib/execution/execution-contract";
import { runExecutionJob } from "@/lib/execution";

/**
 * UI dispatch — capability id only; execution via Execution Plane.
 */
export function useCapabilityDispatch(handlers?: { sendPrompt?: (text: string) => void }) {
  const dispatch = useCallback(
    (request: CapabilityDispatchRequest) => {
      const result = dispatchCapability(request);
      if (result.ok) {
        runExecutionJob(result.executionId, handlers);
      }
      return result;
    },
    [handlers],
  );

  const dispatchAndRecord = useCallback(
    (request: CapabilityDispatchRequest): {
      result: ReturnType<typeof dispatchCapability>;
      record: ExecutionRecord | null;
    } => {
      const result = dispatchCapability(request);
      if (!result.ok) {
        return { result, record: null };
      }
      const record = runExecutionJob(result.executionId, handlers);
      return { result, record };
    },
    [handlers],
  );

  return { dispatch, dispatchAndRecord };
}
