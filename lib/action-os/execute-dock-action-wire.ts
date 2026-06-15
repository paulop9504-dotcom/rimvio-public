import type { DockActionWire } from "@/lib/action-os/types";

type ExecuteDockActionHandlers = {
  sendPrompt: (text: string) => void;
};

/** Run a DOCK_UPDATE action — deep link, tel, http, or chat prompt. */
export function executeDockActionWire(
  action: DockActionWire,
  handlers: ExecuteDockActionHandlers
): void {
  const uri = action.execution.uri.trim();
  if (uri.startsWith("tel:")) {
    window.location.href = uri;
    return;
  }
  if (/^https?:\/\//i.test(uri)) {
    window.open(uri, "_blank", "noopener,noreferrer");
    return;
  }
  if (uri.startsWith("rimvio://")) {
    handlers.sendPrompt(uri);
    return;
  }
  handlers.sendPrompt(action.label.trim() || uri);
}
