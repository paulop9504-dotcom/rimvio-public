import { combineLensDateAndTime } from "@/lib/peer-chat/ai-lens/parse-lens-date";
import type {
  DeepLinkBubbleCandidate,
  LensThreadContext,
} from "@/lib/peer-chat/ai-lens/types";
import {
  hasActionableLensIntent,
} from "@/lib/peer-chat/ai-lens/detect-thread-context";

function baseCandidate(
  input: Omit<DeepLinkBubbleCandidate, "id" | "score"> & { score?: number },
): DeepLinkBubbleCandidate {
  return {
    id: `lens-${input.actionType}-${input.label}`,
    score: input.score ?? input.confidence,
    ...input,
  };
}

/** Build suggest-only bubbles from lens context — no side effects. */
export function buildDeepLinkBubbleCandidates(
  ctx: LensThreadContext,
): DeepLinkBubbleCandidate[] {
  if (!hasActionableLensIntent(ctx)) {
    return [];
  }

  const out: DeepLinkBubbleCandidate[] = [];
  const title =
    ctx.titleHint?.trim() ||
    (ctx.placeText ? `${ctx.placeText} 약속` : "약속");

  const scheduleIso =
    ctx.dateKey && ctx.timeText
      ? combineLensDateAndTime(ctx.dateKey, ctx.timeText)
      : ctx.dateKey
        ? combineLensDateAndTime(ctx.dateKey, ctx.timeText ?? "12:00")
        : undefined;

  const hasScheduleSignals =
    (ctx.intents.has("meeting") || ctx.movieHint) &&
    (ctx.timeText || ctx.dateKey || ctx.placeText || ctx.intents.has("place_pending"));

  if (hasScheduleSignals && !ctx.movieHint) {
    const confidence =
      ctx.timeText && ctx.placeText && ctx.dateKey
        ? 0.91
        : ctx.dateKey && ctx.timeText
          ? 0.88
          : 0.78;
    out.push(
      baseCandidate({
        actionType: "schedule",
        label: "📅 일정 등록",
        confidence,
        reason: ctx.dateLabel
          ? `약속 · ${ctx.dateLabel}`
          : "약속·시간·장소 맥락",
        deepLink: "rimvio://action/schedule",
        payload: {
          title,
          datetime: scheduleIso,
          place: ctx.placeText ?? undefined,
          category: "schedule",
        },
      }),
    );
  }

  if (ctx.movieHint) {
    out.push(
      baseCandidate({
        actionType: "movie_schedule",
        label: "🎟 영화 일정",
        confidence: 0.86,
        reason: "영화·상영 맥락",
        deepLink: "rimvio://action/schedule",
        payload: {
          title: ctx.titleHint ?? "영화 약속",
          datetime: scheduleIso,
          place: ctx.placeText ?? undefined,
          category: "entertainment",
        },
      }),
    );
  }

  if (ctx.placeText) {
    const q = encodeURIComponent(ctx.placeText);
    out.push(
      baseCandidate({
        actionType: "navigate",
        label: "🧭 길찾기",
        confidence: 0.95,
        reason: "장소 감지",
        deepLink: `rimvio://action/navigate?q=${q}`,
        payload: { place: ctx.placeText },
        score: 0.95,
      }),
    );
  }

  if (ctx.transferHint) {
    out.push(
      baseCandidate({
        actionType: "transfer",
        label: "💸 송금",
        confidence: 0.82,
        reason: "송금·계좌 맥락",
        deepLink: "rimvio://action/transfer",
      }),
    );
  }

  for (const url of ctx.urls.slice(0, 1)) {
    out.push(
      baseCandidate({
        actionType: "save_resource",
        label: "📎 리소스 저장",
        confidence: 0.84,
        reason: "링크 공유",
        deepLink: `rimvio://action/save-link?url=${encodeURIComponent(url)}`,
        payload: { url },
      }),
      baseCandidate({
        actionType: "open_link",
        label: "📖 열기",
        confidence: 0.8,
        reason: "링크 공유",
        deepLink: url,
        payload: { url },
      }),
    );
  }

  return out;
}
