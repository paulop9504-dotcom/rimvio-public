import { BLINK_ACTION_IDS } from "@/lib/actions/blink-feature-actions";
import type { LinkActionItem, LinkRow } from "@/types/database";

export const READ_ALOUD_HREF = "#read-aloud";

const READ_ALOUD_LABEL_PATTERN = /오디오|읽어\s*주기|TTS|듣기/i;
const LEGACY_TRANSLATE_AUDIO_PATTERN =
  /translate\.google\.com\/translate|papago\.naver\.com\/website/i;

export function isReadAloudAction(action: LinkActionItem) {
  if (action.payload?.blinkAction === BLINK_ACTION_IDS.readAloud) {
    return true;
  }

  return action.href === READ_ALOUD_HREF && READ_ALOUD_LABEL_PATTERN.test(action.label);
}

export function isLegacyTranslateAudioAction(action: LinkActionItem) {
  if (!action.href || !READ_ALOUD_LABEL_PATTERN.test(action.label)) {
    return false;
  }

  return LEGACY_TRANSLATE_AUDIO_PATTERN.test(action.href);
}

export function createReadAloudAction(input: {
  sourceUrl: string;
  title?: string | null;
  id?: string;
  label?: string;
}): LinkActionItem {
  return {
    id: input.id ?? crypto.randomUUID(),
    kind: "custom",
    label: input.label ?? "🔊 오디오로 듣기",
    href: READ_ALOUD_HREF,
    payload: {
      icon: "sparkles",
      blinkAction: BLINK_ACTION_IDS.readAloud,
      copyText: input.title?.trim() || input.sourceUrl,
      sourceUrl: input.sourceUrl,
    },
  };
}

export function normalizeReadAloudAction(
  action: LinkActionItem,
  link: Pick<LinkRow, "original_url" | "title">
) {
  if (!isLegacyTranslateAudioAction(action) && !isReadAloudAction(action)) {
    return action;
  }

  if (isReadAloudAction(action) && !isLegacyTranslateAudioAction(action)) {
    return action;
  }

  return createReadAloudAction({
    id: action.id,
    sourceUrl: link.original_url,
    title: link.title,
    label: action.label.includes("읽어")
      ? "🔊 읽어주기 (TTS)"
      : action.label,
  });
}

export function normalizeLinkReadAloudActions(link: LinkRow): LinkRow {
  if (!link.actions?.length) {
    return link;
  }

  const actions = link.actions.map((action) => normalizeReadAloudAction(action, link));
  const changed = actions.some((action, index) => action !== link.actions[index]);

  return changed ? { ...link, actions } : link;
}
