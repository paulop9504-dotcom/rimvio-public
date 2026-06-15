import type { LinkActionItem } from "@/types/database";

function stripEmoji(label: string) {
  return label
    .replace(/^[\s\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]+/u, "")
    .trim();
}

export function rotateActionOffer(actions: LinkActionItem[]) {
  if (actions.length <= 1) {
    return actions;
  }

  const [first, ...rest] = actions;
  return [...rest, first].map((action, index) => ({
    ...action,
    payload: {
      ...action.payload,
      domainPrimary: index === 0,
      universalPrimary: index === 0,
      entityPrimary: index === 0,
    },
  }));
}

export function buildAlternateOfferSummary(primaryLabel: string) {
  const label = stripEmoji(primaryLabel) || "다른 액션";
  return `그럼 ${label}을(를) 먼저 보여드릴게요.`;
}

export function applyAlternateActionOffer(input: {
  actions: LinkActionItem[];
  summary?: string;
}) {
  const rotated = rotateActionOffer(input.actions);
  const nextPrimary = rotated[0];
  return {
    actions: rotated,
    summary: nextPrimary?.label
      ? buildAlternateOfferSummary(nextPrimary.label)
      : input.summary,
  };
}
