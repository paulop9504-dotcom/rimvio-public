import type { AdapterExecuteContext } from "@/lib/execution/adapters/adapter-contract";

/** Browser-side URI open — execution adapters call this. */
export function applyExecutionUri(
  uri: string,
  context: AdapterExecuteContext = {},
): void {
  if (typeof window === "undefined") {
    return;
  }
  const trimmed = uri.trim();
  if (trimmed.startsWith("tel:") || trimmed.startsWith("mailto:") || trimmed.startsWith("sms:")) {
    window.location.href = trimmed;
    return;
  }
  if (/^https?:\/\//i.test(trimmed)) {
    window.open(trimmed, "_blank", "noopener,noreferrer");
    return;
  }
  if (trimmed.startsWith("rimvio://") && context.sendPrompt) {
    context.sendPrompt(trimmed);
    return;
  }
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) {
    window.location.href = trimmed;
    return;
  }
  context.sendPrompt?.(trimmed);
}
