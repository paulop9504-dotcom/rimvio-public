import { listMentionFeatures } from "@/lib/event-kernel/action-contracts/mention-feature-registry";
import { AXIS_MENTION_SHORTCUTS } from "@/lib/action-chat/mention-axis/axis-mention-shortcuts";
import { MENTION_ACTION_ICONS } from "@/lib/action-chat/mention-actions/mention-action-inline-features";

export type FeatureMentionShortcut = {
  id: string;
  label: string;
  template: string;
  token: string;
  icon: string;
};

const FEATURE_SHORTCUTS: FeatureMentionShortcut[] = listMentionFeatures().map(
  (feature) => ({
    id: feature.featureId,
    label: feature.displayName,
    template: `@${feature.aliases[0]} `,
    token: feature.aliases[0]!,
    icon: MENTION_ACTION_ICONS[feature.featureId] ?? "📅",
  }),
);

export const FEATURE_MENTION_SHORTCUTS: FeatureMentionShortcut[] = [
  ...AXIS_MENTION_SHORTCUTS,
  ...FEATURE_SHORTCUTS,
];

const MAX_VISIBLE = 8;

export function suggestFeatureMentionShortcuts(input: string): FeatureMentionShortcut[] {
  const trimmed = input.trim();
  if (!trimmed.startsWith("@")) {
    return [];
  }
  if (/^@\S+\s+\S/u.test(trimmed)) {
    return [];
  }

  const partial = trimmed === "@" ? "" : trimmed.slice(1).trim().toLowerCase();
  const matches = FEATURE_MENTION_SHORTCUTS.filter((shortcut) => {
    if (!partial) {
      return true;
    }
    return (
      shortcut.token.toLowerCase().startsWith(partial) ||
      partial.startsWith(shortcut.token.toLowerCase()) ||
      shortcut.label.toLowerCase().includes(partial)
    );
  });

  return matches.slice(0, MAX_VISIBLE);
}

export function shouldShowFeatureMentionShortcuts(input: string): boolean {
  return suggestFeatureMentionShortcuts(input).length > 0;
}
