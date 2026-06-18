import { createOpenAction } from "@/lib/enrichers/action-factory";
import { runRemoteAction } from "@/lib/remote/run-remote-action";
import type { LocateActionResult } from "@/lib/locate/types";
import type { LinkActionItem, LinkRow } from "@/types/database";

export function locateChipToAction(
  chip: {
    label: string;
    href: string;
    copyText?: string;
    fallbackHref?: string;
  },
  icon: string
): LinkActionItem {
  if (chip.href === "#copy-text") {
    return {
      id: crypto.randomUUID(),
      kind: "open",
      label: chip.label,
      href: chip.href,
      payload: chip.copyText ? { copyText: chip.copyText, icon } : { icon },
    };
  }

  return createOpenAction({
    label: chip.label,
    href: chip.href,
    icon,
    copyText: chip.copyText,
    fallbackHref: chip.fallbackHref,
  });
}

export function locateResultToFeedPanel(result: LocateActionResult) {
  return {
    signalLine: result.context_signal,
    title: result.formatted_address
      ? `${result.place_name} · ${result.formatted_address}`
      : result.place_name,
    primary: locateChipToAction(result.primary_action, "map"),
    secondary: result.secondary_actions.map((action) =>
      locateChipToAction(action, action.href === "#copy-text" ? "copy" : "link")
    ),
  };
}

export async function runLocateFeedAction(
  action: LinkActionItem,
  link: LinkRow | null
) {
  await runRemoteAction(action, link);
}

export const LOCATE_LOADING_SIGNAL = "📷 사진에서 가게 이름 찾는 중…";
