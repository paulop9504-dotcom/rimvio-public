import {
  CHAT_AXIS_CONFIG,
  CHAT_AXIS_ORDER,
  type ChatAxis,
} from "@/lib/action-chat/chat-three-axis";
import type { FeatureMentionShortcut } from "@/lib/event-kernel/action-contracts/mention-feature-shortcuts";

const AXIS_ICONS: Record<ChatAxis, string> = {
  decision: "🤔",
  meal: "🍽",
  schedule: "📅",
};

export const AXIS_MENTION_SHORTCUTS: FeatureMentionShortcut[] = CHAT_AXIS_ORDER.map(
  (axis) => ({
    id: `axis-${axis}`,
    label: CHAT_AXIS_CONFIG[axis].label,
    template: `@${CHAT_AXIS_CONFIG[axis].label} `,
    token: CHAT_AXIS_CONFIG[axis].label,
    icon: AXIS_ICONS[axis],
  }),
);
