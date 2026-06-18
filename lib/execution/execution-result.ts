import type { ExecutionResult } from "@/lib/execution/execution-contract";

export function successResult(input: {
  uri?: string;
  message?: string;
  providerId?: ExecutionResult["providerId"];
}): ExecutionResult {
  return {
    ok: true,
    uri: input.uri,
    message: input.message,
    providerId: input.providerId,
  };
}

export function failureResult(message: string): ExecutionResult {
  return { ok: false, message };
}
