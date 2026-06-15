import type { CafeDiscoveryWire } from "@/lib/context-resolver/places/types";
import type { PredictiveDockAction } from "@/lib/predictive-dock/types";
import type { ConversationIntentDomain } from "@/lib/predictive-dock/action-opportunity-types";

const ICON: Record<string, string> = {
  NAVIGATE: "📍",
  SAVE: "⭐",
  CALL: "📞",
  SHARE: "🔗",
};

function chip(
  input: Omit<PredictiveDockAction, "icon" | "state"> & {
    state?: PredictiveDockAction["state"];
  }
): PredictiveDockAction {
  return {
    ...input,
    icon: ICON[input.type] ?? "✨",
    state: input.state ?? "WARM",
    intentDomain: "dining_discovery" satisfies ConversationIntentDomain,
  };
}

/**
 * After place recommendation — follow-up opportunities (not Main Action).
 * 📍 지도 · ⭐ 저장 · 📞 전화
 */
export function opportunitiesFromPlaceDiscovery(
  wire: CafeDiscoveryWire
): PredictiveDockAction[] {
  const top = wire.options[0];
  if (!top) {
    return [];
  }

  const place = top.name;
  const items: PredictiveDockAction[] = [
    chip({
      id: `dining:${place}:map`,
      type: "NAVIGATE",
      label: "지도",
      score: 88,
      prompt: `${place} 길찾기`,
      contextKey: "dining_discovery",
    }),
    chip({
      id: `dining:${place}:save`,
      type: "SAVE",
      label: "저장",
      score: 76,
      prompt: `${place} 장소 저장해줘`,
      contextKey: "dining_discovery",
    }),
  ];

  const phone = top.action_buttons.find((action) => /전화|tel/i.test(action.label));
  if (phone?.href) {
    items.push(
      chip({
        id: `dining:${place}:call`,
        type: "CALL",
        label: "전화",
        score: 68,
        prompt: phone.href.startsWith("tel:") ? phone.href : `${place} 전화번호 찾아줘`,
        contextKey: "dining_discovery",
      })
    );
  }

  return items;
}
