import { normalizeAnchorId, TIMELINE_DOCK_ACTION_TYPES } from "@/lib/events/normalize-anchor-id";
import type { PredictiveDockAction, PredictiveDockWire } from "@/lib/predictive-dock/types";

/** Attach canonical ec-id to timeline dock actions (NAVIGATE/CALL/etc.). */
export function attachEventAnchorIds(
  wire: PredictiveDockWire,
  eventCandidateId: string | null | undefined
): PredictiveDockWire {
  const ecId = eventCandidateId ? normalizeAnchorId(eventCandidateId) : null;
  if (!ecId) {
    return wire;
  }

  const mapAction = (action: PredictiveDockAction): PredictiveDockAction => {
    if (!TIMELINE_DOCK_ACTION_TYPES.has(action.type)) {
      return action;
    }
    const existing = action.anchorId ? normalizeAnchorId(action.anchorId) : null;
    if (existing) {
      return action.anchorId === existing ? action : { ...action, anchorId: existing };
    }
    return { ...action, anchorId: ecId };
  };

  return {
    main_action: wire.main_action ? mapAction(wire.main_action) : null,
    shadow_actions: wire.shadow_actions.map(mapAction),
  };
}
