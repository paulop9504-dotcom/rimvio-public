import type { ContextRemoteState } from "@/lib/remote/resolve-context-remote";
import {
  locateChipToAction,
  LOCATE_LOADING_SIGNAL,
} from "@/lib/locate/locate-chip-actions";
import type { LocateActionResult } from "@/lib/locate/types";

export function resolveLocateRemoteLoading(): ContextRemoteState {
  return {
    visible: true,
    expanded: false,
    confidence: 0.72,
    packId: "place",
    signalLine: LOCATE_LOADING_SIGNAL,
    primary: null,
    secondary: [],
  };
}

export function resolveLocateRemoteFromResult(
  result: LocateActionResult
): ContextRemoteState {
  const primary = locateChipToAction(result.primary_action, "map");
  const secondary = result.secondary_actions.map((action) =>
    locateChipToAction(action, action.href === "#copy-text" ? "copy" : "link")
  );

  return {
    visible: true,
    expanded: true,
    confidence: 0.92,
    packId: "place",
    signalLine: result.context_signal,
    primary,
    secondary,
  };
}