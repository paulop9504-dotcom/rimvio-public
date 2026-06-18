import { notificationBlob } from "@/lib/action-chat/mention-focus/focus-notification-gate";
import type { FocusHeldItemWire } from "@/lib/action-chat/mention-focus/inline-chat-focus";
import { resolveFocusHeldAuxDeepLink } from "@/lib/action-chat/mention-focus/resolve-focus-held-deeplink";
import type { ShadowProcessedRecord } from "@/lib/notification-shadow/types";

export type FocusHeldActionKind =
  | "confirm"
  | "reply_draft"
  | "open_embedded"
  | "open_external";

export type FocusHeldActionWire = {
  id: string;
  kind: FocusHeldActionKind;
  label: string;
  tier: "MAIN" | "AUX";
  /** reply_draft: composer seed · open_*: url or deeplink */
  target?: string;
};

function extractHttpUrl(record: ShadowProcessedRecord): string | null {
  const fromActions = record.future_actions.find((action) =>
    /^https?:\/\//iu.test(action.deepLink ?? ""),
  )?.deepLink;
  if (fromActions) {
    return fromActions;
  }
  return `${record.raw.title} ${record.raw.content}`.match(/https?:\/\/\S+/u)?.[0] ?? null;
}

function buildReplyDraftSeed(record: ShadowProcessedRecord): string {
  const blob = notificationBlob(record);
  const preview = (record.raw.content || record.summary).trim().slice(0, 120);
  if (/kakaotalk|카카오톡|카톡/iu.test(blob)) {
    return `"${record.raw.title}" 메시지에 답장 초안 써줘 — ${preview}`;
  }
  if (/mail|email|gmail|outlook|메일|이메일/iu.test(blob)) {
    return `"${record.raw.title}" 메일 답장 초안 써줘 — ${preview}`;
  }
  return `"${record.raw.title}" 알림에 답장 초안 써줘 — ${preview}`;
}

function isSafeEmbedUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

export function buildFocusHeldPanelItem(record: ShadowProcessedRecord): FocusHeldItemWire {
  const httpUrl = extractHttpUrl(record);
  const aux = resolveFocusHeldAuxDeepLink(record);
  const mainActions: FocusHeldActionWire[] = [
    {
      id: `${record.id}:confirm`,
      kind: "confirm",
      label: "확인했어",
      tier: "MAIN",
    },
    {
      id: `${record.id}:reply`,
      kind: "reply_draft",
      label: /mail|email|메일|이메일/iu.test(notificationBlob(record))
        ? "답장 초안"
        : "답장 초안",
      tier: "MAIN",
      target: buildReplyDraftSeed(record),
    },
  ];

  if (httpUrl && isSafeEmbedUrl(httpUrl)) {
    mainActions.unshift({
      id: `${record.id}:embed`,
      kind: "open_embedded",
      label: "여기서 보기",
      tier: "MAIN",
      target: httpUrl,
    });
  }

  const auxAction: FocusHeldActionWire | undefined = aux.deepLink
    ? {
        id: `${record.id}:external`,
        kind: "open_external",
        label: aux.actionLabel,
        tier: "AUX",
        target: aux.deepLink,
      }
    : undefined;

  return {
    shadowId: record.id,
    sourceApp: record.source_app,
    title: record.raw.title.trim() || record.summary,
    body: record.raw.content.trim(),
    summary: record.summary,
    category: record.category,
    mainActions,
    auxAction,
    resolved: false,
  };
}

export function shadowRecordToHeldItem(record: ShadowProcessedRecord): FocusHeldItemWire {
  return buildFocusHeldPanelItem(record);
}
