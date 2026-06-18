import type { ExecutionAdapter } from "@/lib/execution/adapters/adapter-contract";
import { applyExecutionUri } from "@/lib/execution/adapters/apply-uri";
import {
  buildNavigateGoogle,
  buildNavigateInternal,
  buildNavigateKakao,
  buildNavigateNaver,
  buildTaxiKakao,
  pickParam,
} from "@/lib/execution/adapters/internal/provider-urls";
import { failureResult, successResult } from "@/lib/execution/execution-result";

export const navigateAdapter: ExecutionAdapter = {
  id: "navigate-adapter",
  capabilityIds: ["NAVIGATE", "MAP", "CONFIRM_PLACE", "PARKING", "TAXI"],
  buildPayload(input) {
    const { capabilityId, providerId, inputs } = input;
    let uri: string | null = null;
    let fallbackUri: string | undefined;

    if (capabilityId === "TAXI") {
      uri = buildTaxiKakao(inputs);
      fallbackUri = "https://taxi.kakao.com/";
      return uri ? { uri, fallbackUri } : null;
    }

    const dest = pickParam(inputs, "destination", "dest", "query", "place") ?? "";
    if (providerId === "kakao_navi") {
      uri = buildNavigateKakao({ destination: dest });
    } else if (providerId === "naver_map") {
      uri = buildNavigateNaver({ destination: dest });
      fallbackUri = "https://map.naver.com";
    } else if (providerId === "google_maps") {
      uri = buildNavigateGoogle({ destination: dest });
    } else {
      uri = buildNavigateInternal({ destination: dest });
    }
    return uri ? { uri, fallbackUri } : null;
  },
  execute(payload, context) {
    const uri = payload.uri ?? payload.fallbackUri;
    if (!uri) {
      return failureResult("missing_navigate_uri");
    }
    applyExecutionUri(uri, context);
    return successResult({ uri, message: "navigate_opened" });
  },
};
