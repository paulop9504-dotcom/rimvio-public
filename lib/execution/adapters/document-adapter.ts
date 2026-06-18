import type { ExecutionAdapter } from "@/lib/execution/adapters/adapter-contract";
import { applyExecutionUri } from "@/lib/execution/adapters/apply-uri";
import { failureResult, successResult } from "@/lib/execution/execution-result";

export const documentAdapter: ExecutionAdapter = {
  id: "document-adapter",
  capabilityIds: ["DOCUMENT", "SHEET"],
  buildPayload() {
    return {
      uri: "https://docs.google.com/document/create",
      fallbackUri: "https://docs.google.com/spreadsheets/create",
    };
  },
  execute(payload, context) {
    const uri =
      payload.inputs.sheet === "true"
        ? "https://docs.google.com/spreadsheets/create"
        : payload.uri ?? "https://docs.google.com/document/create";
    applyExecutionUri(uri, context);
    return successResult({ uri, message: "document_opened" });
  },
};
