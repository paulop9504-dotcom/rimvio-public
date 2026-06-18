import { notificationBlob } from "@/lib/action-chat/mention-focus/focus-notification-gate";
import type { ShadowProcessedRecord } from "@/lib/notification-shadow/types";

export type FocusHeldAuxLink = {
  deepLink?: string;
  actionLabel: string;
};

/** AUX — escape to native app (deeplink). */
export function resolveFocusHeldAuxDeepLink(record: ShadowProcessedRecord): FocusHeldAuxLink {
  const withLink = record.future_actions.find((action) => action.deepLink?.trim());
  if (withLink?.deepLink) {
    const link = withLink.deepLink.trim();
    if (/^https?:\/\//iu.test(link)) {
      return { actionLabel: "브라우저에서 열기", deepLink: link };
    }
    return { deepLink: link, actionLabel: withLink.label || "원본 앱에서 열기" };
  }

  const blob = notificationBlob(record);

  if (/kakaotalk|카카오톡|카톡/iu.test(blob)) {
    return { deepLink: "kakaotalk://", actionLabel: "카톡에서 열기" };
  }
  if (/outlook/iu.test(blob)) {
    return { deepLink: "ms-outlook://", actionLabel: "Outlook에서 열기" };
  }
  if (/gmail|google\s*mail/iu.test(blob)) {
    return { deepLink: "googlegmail://", actionLabel: "Gmail에서 열기" };
  }
  if (/mail|email|메일|이메일|naver\s*mail|네이버\s*메일/iu.test(blob)) {
    return { deepLink: "googlegmail://", actionLabel: "메일 앱에서 열기" };
  }

  const url = `${record.raw.title} ${record.raw.content}`.match(/https?:\/\/\S+/u)?.[0];
  if (url) {
    return { deepLink: url, actionLabel: "브라우저에서 열기" };
  }

  return { actionLabel: "원본 앱에서 열기" };
}

/** @deprecated use resolveFocusHeldAuxDeepLink */
export function resolveFocusHeldAction(record: ShadowProcessedRecord): FocusHeldAuxLink {
  return resolveFocusHeldAuxDeepLink(record);
}
