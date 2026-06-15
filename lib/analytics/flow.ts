const FLOW_ID_KEY = "blink-analytics-flow-id";

export function startAnalyticsFlow(): string {
  if (typeof sessionStorage === "undefined") {
    return "server";
  }

  const flowId = crypto.randomUUID();
  sessionStorage.setItem(FLOW_ID_KEY, flowId);
  return flowId;
}

export function readAnalyticsFlowId(): string | null {
  if (typeof sessionStorage === "undefined") {
    return null;
  }

  return sessionStorage.getItem(FLOW_ID_KEY);
}

export function endAnalyticsFlow() {
  if (typeof sessionStorage === "undefined") {
    return;
  }

  sessionStorage.removeItem(FLOW_ID_KEY);
}
