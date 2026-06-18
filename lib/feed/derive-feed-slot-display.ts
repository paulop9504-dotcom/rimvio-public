import { humanizeFeedHeadline } from "@/lib/feed/humanize-feed-headline";
import type { RankedSurface, SurfaceAction } from "@/lib/surface-engine/surface-contract";

const SLOT_ACTION_CAPS = [
  "NAVIGATE",
  "CALL",
  "MESSAGE",
  "CALENDAR",
  "DISMISS_SURFACE",
] as const;

/** Card headline — human sentence first (e.g. 내일 1시 스타벅스…). */
export function deriveFeedSlotHeadline(surface: RankedSurface): string {
  const description = surface.description?.trim();
  if (description) {
    return humanizeFeedHeadline(description);
  }
  const summary = surface.narration?.summary?.trim();
  if (summary) {
    return humanizeFeedHeadline(summary);
  }
  return humanizeFeedHeadline(surface.title);
}

/** Smaller context line above headline when title differs. */
export function deriveFeedSlotContext(surface: RankedSurface): string | null {
  const headline = deriveFeedSlotHeadline(surface);
  const title = surface.title?.trim();
  if (!title || title === headline) {
    return null;
  }
  return title;
}

export function normalizeFeedSlotActionLabel(label: string): string {
  const stripped = label.replace(/^[^\p{L}\p{N}]+/u, "").trim();
  return stripped || label.trim();
}

/** Up to 3 pill actions — 길찾기 · 연락하기 · 나중에 pattern. */
export function deriveFeedSlotActions(surface: RankedSurface): SurfaceAction[] {
  const picked: SurfaceAction[] = [];
  const seen = new Set<string>();

  const tryPick = (action: SurfaceAction | undefined) => {
    if (!action || picked.length >= 3 || seen.has(action.id)) {
      return;
    }
    seen.add(action.id);
    picked.push(action);
  };

  for (const cap of SLOT_ACTION_CAPS) {
    tryPick(surface.secondaryActions.find((row) => row.capabilityId === cap));
  }

  for (const action of surface.secondaryActions) {
    tryPick(action);
  }

  if (picked.length === 0) {
    tryPick(surface.primaryAction);
  }

  return picked;
}
