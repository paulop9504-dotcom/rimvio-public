import type { ExecutionAdapter } from "@/lib/execution/adapters/adapter-contract";
import { applyExecutionUri } from "@/lib/execution/adapters/apply-uri";
import {
  buildCallTel,
  buildKakaoTalkOpen,
  buildMessageSms,
} from "@/lib/execution/adapters/internal/provider-urls";
import { failureResult, successResult } from "@/lib/execution/execution-result";

export const callAdapter: ExecutionAdapter = {
  id: "call-adapter",
  capabilityIds: ["CALL", "MESSAGE", "EMAIL"],
  buildPayload(input) {
    const { capabilityId, providerId, inputs } = input;
    if (capabilityId === "CALL") {
      const uri = buildCallTel(inputs);
      return uri ? { uri } : null;
    }
    if (capabilityId === "MESSAGE") {
      const uri = providerId === "kakao_talk" ? buildKakaoTalkOpen() : buildMessageSms(inputs);
      return uri ? { uri } : null;
    }
    const to = inputs.to?.trim();
    return { uri: to ? `mailto:${to}` : "mailto:" };
  },
  execute(payload, context) {
    const uri = payload.uri;
    if (!uri) {
      return failureResult("missing_call_uri");
    }
    applyExecutionUri(uri, context);
    return successResult({ uri, message: "communication_opened" });
  },
};
