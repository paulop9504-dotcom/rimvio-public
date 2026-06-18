import type { PeerMessage } from "@/lib/context/peer-message-types";
import { parseLensDateFromText } from "@/lib/peer-chat/ai-lens/parse-lens-date";
import { parseLensTimeFromText } from "@/lib/peer-chat/ai-lens/parse-lens-time";
import type { LensIntentKind, LensThreadContext } from "@/lib/peer-chat/ai-lens/types";

const URL_RE = /https?:\/\/[^\s]+/gi;
const MEETING_RE =
  /(?:보자|만나|약속|일정|모이|갈래|가자|예약|미팅|회의|식사|밥|점심|저녁|브런치)/iu;
const PLACE_RE =
  /(?:CGV|메가박스|롯데시네마|치킨|카페|식당|맛집|역|동\s|로\s|구\s|멕시카나|스타벅스|이마트|병원|학교)/iu;
const TRANSFER_RE = /(?:계좌|송금|이체|보내줘|입금|송금해)/iu;
const MOVIE_RE = /(?:CGV|영화|메가박스|롯데시네마|상영)/iu;
const PLACE_QUERY_RE =
  /([가-힣a-zA-Z0-9]+(?:동|역|점|집|카페|식당|CGV|치킨|멕시카나)[가-힣a-zA-Z0-9\s]{0,24})/u;
const TRAVEL_SIGNAL =
  /(?:여행|출국|제주|오사카|해외|trip|flight|호텔|숙소)/iu;

export function emptyLensThreadContext(): LensThreadContext {
  return {
    intents: new Set(),
    dateKey: null,
    dateLabel: null,
    timeText: null,
    placeText: null,
    titleHint: null,
    urls: [],
    transferHint: false,
    movieHint: false,
    lastPeerBody: null,
    anchorMessageId: null,
  };
}

function extractPlaceCandidate(text: string): string | null {
  const trimmed = text.trim();
  if (!trimmed || trimmed.length < 2) {
    return null;
  }
  if (PLACE_RE.test(trimmed)) {
    const m = PLACE_QUERY_RE.exec(trimmed);
    if (m?.[1]) {
      return m[1].trim();
    }
    return trimmed.slice(0, 32);
  }
  if (/[가-힣]{2,}(?:동|역|점)/u.test(trimmed)) {
    return trimmed.slice(0, 32);
  }
  return null;
}

function applyMessageToContext(
  ctx: LensThreadContext,
  message: PeerMessage,
  referenceDate: Date,
): LensThreadContext {
  const body = message.body.trim();
  if (!body || message.messageType !== "human") {
    return ctx;
  }

  const next: LensThreadContext = {
    ...ctx,
    intents: new Set(ctx.intents),
    urls: [...ctx.urls],
  };

  if (message.author === "peer") {
    next.lastPeerBody = body;
  }

  for (const url of body.match(URL_RE) ?? []) {
    next.urls.push(url.replace(/[),.]+$/, ""));
    next.intents.add("link");
  }

  if (MEETING_RE.test(body)) {
    next.intents.add("meeting");
  }

  const parsedDate = parseLensDateFromText(body, referenceDate);
  if (parsedDate) {
    next.intents.add("time");
    next.dateKey = parsedDate.dateKey;
    next.dateLabel = parsedDate.label;
  }

  const time = parseLensTimeFromText(body);
  if (time) {
    next.intents.add("time");
    next.timeText = time;
  }

  const place = extractPlaceCandidate(body);
  const scheduleLike =
    MEETING_RE.test(body) || Boolean(parsedDate) || Boolean(time);
  if (place) {
    next.intents.add("place");
    next.placeText = place;
    if (scheduleLike || !next.titleHint) {
      next.titleHint = place.includes("약속") ? place : `${place} 약속`;
    }
  } else if (MEETING_RE.test(body) && !next.placeText) {
    next.intents.add("place_pending");
  }

  if (TRAVEL_SIGNAL.test(body) && (parsedDate || time || /여행/u.test(body))) {
    next.intents.add("meeting");
    const dest = body.match(/([가-힣a-zA-Z]{2,10}(?:도|시)?)\s*여행/u)?.[1];
    if (dest) {
      next.titleHint = `${dest} 여행`;
      if (!next.placeText) {
        next.placeText = dest;
      }
    } else if (!next.titleHint) {
      next.titleHint = "여행";
    }
  }

  if (TRANSFER_RE.test(body)) {
    next.transferHint = true;
    next.intents.add("transfer");
  }

  if (MOVIE_RE.test(body)) {
    next.movieHint = true;
    next.intents.add("movie");
    if (!next.titleHint) {
      next.titleHint = "영화 약속";
    }
  }

  return next;
}

/** Single-message lens context — avoids bleeding place/title from older turns. */
export function detectLensMessageContext(
  message: PeerMessage,
  referenceDate: Date = new Date(),
): LensThreadContext {
  let ctx = emptyLensThreadContext();
  ctx = applyMessageToContext(ctx, message, referenceDate);
  if (message.messageType === "human" && hasActionableLensIntent(ctx)) {
    ctx = { ...ctx, anchorMessageId: message.id };
  }
  return ctx;
}

/** @deprecated Prefer per-message analysis in analyzePeerThreadForLens. */
export function detectLensThreadContext(
  messages: readonly PeerMessage[],
  windowSize = 12,
  referenceDate: Date = new Date(),
): LensThreadContext {
  const slice = messages.slice(-windowSize);
  let latest: LensThreadContext = emptyLensThreadContext();
  for (const message of slice) {
    const ctx = detectLensMessageContext(message, referenceDate);
    if (ctx.anchorMessageId) {
      latest = ctx;
    }
  }
  return latest;
}

export function hasActionableLensIntent(ctx: LensThreadContext): boolean {
  return (
    ctx.transferHint ||
    ctx.urls.length > 0 ||
    (ctx.intents.has("meeting") &&
      (ctx.intents.has("time") || Boolean(ctx.dateKey))) ||
    Boolean(ctx.placeText) ||
    ctx.movieHint ||
    (ctx.intents.has("meeting") && ctx.intents.has("place_pending"))
  );
}

export function listDetectedIntents(ctx: LensThreadContext): LensIntentKind[] {
  return [...ctx.intents];
}
