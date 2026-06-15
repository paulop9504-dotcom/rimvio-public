import { executeScheduledLinkReminder } from "@/lib/actions/schedule-link-execution";
import { runLinkAction, type RunLinkActionResult } from "@/lib/actions/execute-link-action";
import { BLINK_ACTION_IDS } from "@/lib/actions/blink-feature-actions";
import { isReadAloudAction } from "@/lib/actions/read-aloud-action";
import { RIMVIO } from "@/lib/brand/rimvio";
import { buildExchangeRateHref } from "@/lib/actions/search-urls";
import { getDisplayTitleForLink, sanitizeLinkTitle } from "@/lib/feed/sanitize-link-title";
import { getAppLocale } from "@/lib/i18n/locale-store";
import { ensureShareSlug } from "@/lib/rooms/client";
import { linkToShareInput } from "@/lib/share/link-to-share-input";
import { getShareDestination } from "@/lib/share/share-destinations";
import { runShareDestination, runSystemShare } from "@/lib/share/run-share-destination";
import { canSpeakText, speakText } from "@/lib/media/speak-text";
import type { ScheduleMedium } from "@/lib/preferences/schedule-medium";
import type { LinkActionItem, LinkRow } from "@/types/database";

function readPayloadString(
  payload: Record<string, unknown> | undefined,
  key: string
) {
  const value = payload?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

async function copyText(text: string) {
  if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) {
    return null;
  }

  try {
    await navigator.clipboard.writeText(text);
    return text;
  } catch {
    return null;
  }
}

function resolveLinkDisplayTitle(link: LinkRow) {
  return (
    getDisplayTitleForLink(link) ??
    sanitizeLinkTitle({
      title: link.title,
      original_url: link.original_url,
      domain: link.domain,
      source_type: link.source_type,
      category: link.category,
    })
  );
}

async function runScheduledForLink(
  link: LinkRow,
  payload: Record<string, unknown> | undefined,
  title?: string,
  medium?: ScheduleMedium
) {
  const scheduled = await executeScheduledLinkReminder({
    linkId: link.id,
    title: title ?? resolveLinkDisplayTitle(link),
    url: link.original_url,
    payload,
    medium,
  });

  return {
    copiedText: scheduled.copiedText ?? null,
    remindedAt: scheduled.remindedAt ?? null,
    scheduleMedium: scheduled.medium,
    openedCalendar: scheduled.openedCalendar ?? false,
  };
}

async function runReadAloudForLink(link: LinkRow) {
  if (!canSpeakText()) {
    return { copiedText: null, speakError: "unsupported" as const };
  }

  const response = await fetch("/api/media/read-aloud", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      url: link.original_url,
      title: resolveLinkDisplayTitle(link),
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    return { copiedText: null, speakError: "fetch_failed" as const };
  }

  const payload = (await response.json()) as { text?: string };
  const text = payload.text?.trim();
  if (!text) {
    return { copiedText: null, speakError: "empty_text" as const };
  }

  try {
    await speakText(text, getAppLocale());
    return { copiedText: null, spoke: true as const };
  } catch {
    return { copiedText: null, speakError: "speech_failed" as const };
  }
}

export async function runLinkActionForLink(
  action: LinkActionItem,
  link: LinkRow,
  options?: { scheduleMedium?: ScheduleMedium }
): Promise<
  RunLinkActionResult & {
    sharedText?: string | null;
    remindedAt?: string | null;
    scheduleMedium?: string | null;
    openedCalendar?: boolean;
    spoke?: boolean;
    speakError?: "unsupported" | "fetch_failed" | "empty_text" | "speech_failed";
  }
> {
  const blinkAction = action.payload?.blinkAction;

  if (blinkAction === BLINK_ACTION_IDS.readAloud || isReadAloudAction(action)) {
    return runReadAloudForLink(link);
  }

  if (
    blinkAction === BLINK_ACTION_IDS.directShare ||
    blinkAction === BLINK_ACTION_IDS.kakaoBeam ||
    action.label.includes("친구에게") ||
    action.label.includes("카톡")
  ) {
    const withSlug = ensureShareSlug(link);
    const input = linkToShareInput(withSlug);

    if (blinkAction === BLINK_ACTION_IDS.directShare || action.label.includes("친구에게")) {
      const shared = await runSystemShare(input);
      if (shared) {
        return { copiedText: null, sharedText: null };
      }

      const copyDest = getShareDestination("copy");
      const { copiedText } = await runShareDestination(copyDest, input);
      return { copiedText, sharedText: copiedText };
    }

    const destination = getShareDestination("kakao");
    const { copiedText } = await runShareDestination(
      destination,
      linkToShareInput(withSlug)
    );

    return { copiedText, sharedText: copiedText };
  }

  const scheduleMedium = options?.scheduleMedium;

  if (action.kind === "remind" || blinkAction === BLINK_ACTION_IDS.remindLater) {
    const payload =
      action.payload && typeof action.payload === "object"
        ? (action.payload as Record<string, unknown>)
        : undefined;

    return runScheduledForLink(link, payload, undefined, scheduleMedium);
  }

  if (action.href === "#similar-links") {
    return { copiedText: null };
  }

  const payload =
    action.payload && typeof action.payload === "object"
      ? (action.payload as Record<string, unknown>)
      : undefined;

  const displayTitle = resolveLinkDisplayTitle(link);

  if (blinkAction === BLINK_ACTION_IDS.splitBill) {
    const template = [
      `"${displayTitle}" N빵 계산`,
      "총액: ___원",
      "인원: ___명",
      "1인: ___원",
      link.original_url,
    ].join("\n");
    return { copiedText: await copyText(template) };
  }

  if (blinkAction === BLINK_ACTION_IDS.quoteTemplate) {
    const title = readPayloadString(payload, "title") ?? displayTitle;
    const template = [
      "안녕하세요,",
      `${RIMVIO.nameKo}에서 링크 보고 견적 문의드립니다.`,
      "",
      title,
      link.original_url,
    ].join("\n");
    return { copiedText: await copyText(template) };
  }

  if (blinkAction === BLINK_ACTION_IDS.mealLog) {
    const title = readPayloadString(payload, "title") ?? displayTitle;
    const template = `🥗 식단 기록 · ${new Date().toLocaleDateString("ko-KR")}\n${title}\n${link.original_url}`;
    return { copiedText: await copyText(template) };
  }

  if (
    blinkAction === BLINK_ACTION_IDS.workoutTimer ||
    blinkAction === BLINK_ACTION_IDS.deadlineRemind ||
    blinkAction === BLINK_ACTION_IDS.todoRegister ||
    blinkAction === BLINK_ACTION_IDS.studyTimer
  ) {
    const delayMinutes =
      typeof payload?.delayMinutes === "number"
        ? payload.delayMinutes
        : blinkAction === BLINK_ACTION_IDS.workoutTimer
          ? 3
          : blinkAction === BLINK_ACTION_IDS.studyTimer
            ? 25
            : blinkAction === BLINK_ACTION_IDS.todoRegister
              ? 24 * 60
              : 24 * 60 * 3;

    const title =
      blinkAction === BLINK_ACTION_IDS.workoutTimer
        ? `⏱ 운동 타이머 · ${displayTitle}`
        : blinkAction === BLINK_ACTION_IDS.studyTimer
          ? `⏱ 스터디 타이머 · ${displayTitle}`
          : blinkAction === BLINK_ACTION_IDS.deadlineRemind
            ? `⏳ ${readPayloadString(payload, "deadlineLabel") ?? "마감"} · ${displayTitle}`
            : `✅ 할 일 · ${displayTitle}`;

    return runScheduledForLink(
      link,
      {
        ...payload,
        delayMinutes,
        blinkAction,
      },
      title,
      scheduleMedium
    );
  }

  if (blinkAction === BLINK_ACTION_IDS.priceAlert) {
    const title = readPayloadString(payload, "title") ?? displayTitle;
    const template = [
      `🔔 가격 알림 · ${title}`,
      "목표가: ___원",
      "현재가: ___원",
      link.original_url,
    ].join("\n");
    return { copiedText: await copyText(template) };
  }

  if (blinkAction === BLINK_ACTION_IDS.currencyConvert) {
    const template = [
      "💱 환율 변환",
      "USD → KRW",
      "금액: ___ USD",
      "환율: ___ KRW/USD",
      "결과: ___ KRW",
      buildExchangeRateHref("USD", "KRW"),
    ].join("\n");
    return { copiedText: await copyText(template) };
  }

  if (blinkAction === BLINK_ACTION_IDS.vcardSave) {
    const title = readPayloadString(payload, "title") ?? displayTitle;
    const vcard = [
      "BEGIN:VCARD",
      "VERSION:3.0",
      `FN:${title}`,
      `URL:${link.original_url}`,
      `NOTE:${RIMVIO.nameKo}에서 저장`,
      "END:VCARD",
    ].join("\n");
    return { copiedText: await copyText(vcard) };
  }

  if (blinkAction === BLINK_ACTION_IDS.conversationTemplate) {
    const title = readPayloadString(payload, "title") ?? displayTitle;
    const template = [
      "안녕하세요,",
      `${title} 관련해서 연락드립니다.`,
      "혹시 시간 괜찮으실 때 짧게 이야기 나눌 수 있을까요?",
      link.original_url,
    ].join("\n");
    return { copiedText: await copyText(template) };
  }

  if (blinkAction === BLINK_ACTION_IDS.todoThree) {
    const template = [
      `📋 오늘의 할 일 3개 · ${new Date().toLocaleDateString("ko-KR")}`,
      "1. ___",
      "2. ___",
      "3. ___",
      "",
      `참고: ${displayTitle}`,
      link.original_url,
    ].join("\n");
    return { copiedText: await copyText(template) };
  }

  if (blinkAction === BLINK_ACTION_IDS.doneShare) {
    const title = readPayloadString(payload, "title") ?? displayTitle;
    const template = [
      "✅ Done!",
      `${title} 처리 완료했습니다.`,
      link.original_url,
    ].join("\n");
    const shared = await runSystemShare(linkToShareInput(link));
    if (shared) {
      return { copiedText: null, sharedText: template };
    }
    return { copiedText: await copyText(template), sharedText: template };
  }

  if (blinkAction === BLINK_ACTION_IDS.achievementLog) {
    const title = readPayloadString(payload, "title") ?? displayTitle;
    const template = [
      `🏆 오늘의 성취 · ${new Date().toLocaleDateString("ko-KR")}`,
      `한 일: ${title}`,
      "배운 점: ___",
      "내일 이어갈 것: ___",
      link.original_url,
    ].join("\n");
    return { copiedText: await copyText(template) };
  }

  if (blinkAction === BLINK_ACTION_IDS.morningBriefing) {
    const now = new Date();
    const nextMorning = new Date(now);
    nextMorning.setDate(nextMorning.getDate() + (now.getHours() >= 7 ? 1 : 0));
    nextMorning.setHours(7, 0, 0, 0);
    const delayMinutes = Math.max(
      1,
      Math.round((nextMorning.getTime() - now.getTime()) / 60_000)
    );

    const scheduled = await runScheduledForLink(
      link,
      {
        delayMinutes,
        blinkAction: BLINK_ACTION_IDS.morningBriefing,
      },
      `🌅 모닝 브리핑 · ${displayTitle}`,
      scheduleMedium
    );

    return {
      ...scheduled,
      remindedAt: scheduled.remindedAt ?? "내일 07:00",
    };
  }

  return runLinkAction(action);
}
