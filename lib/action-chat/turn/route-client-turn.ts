import type { ParsedTurnIntent } from "@/lib/action-chat/turn/parse-turn-intent";
import {
  resolveClientTurnRoute,
  type ClientTurnRouteResolveInput,
} from "@/lib/action-chat/turn/resolve-client-turn-route";

export type { ClientTurnRouteResolveInput };

/** Discriminated client routes — hook executes; this type documents the turn OS surface. */
export type ClientTurnRoute =
  | { kind: "noop"; reason: "empty" | "sending" }
  | { kind: "peer_talk" }
  | { kind: "parking_photo" }
  | { kind: "local_mention_early" }
  | { kind: "mention_axis_hint" }
  | { kind: "lecture_url" }
  | { kind: "study_label" }
  | { kind: "command_os" }
  | { kind: "ocr_review_dates" }
  | { kind: "review_approval" }
  | { kind: "orchestrate_api" };

export type ClientTurnRouteContext = ClientTurnRouteResolveInput;

/** Legacy test shape — `intent` alias for `turnIntent`. */
export type LegacyClientTurnRouteContext = {
  sending: boolean;
  intent: ParsedTurnIntent;
};

function normalizeClientTurnRouteContext(
  ctx: ClientTurnRouteContext | LegacyClientTurnRouteContext,
): ClientTurnRouteResolveInput {
  if ("turnIntent" in ctx) {
    return ctx;
  }
  return {
    sending: ctx.sending,
    turnIntent: ctx.intent,
    pendingAttachments: ctx.intent.pendingAttachments,
    messages: [],
    routeToFeedPeerTalk: false,
    reviewGatePhase: null,
  };
}

/** Route label for logging/tests — same order as `use-action-chat` handlers. */
export function describeClientTurnRoute(
  ctx: ClientTurnRouteContext | LegacyClientTurnRouteContext,
): ClientTurnRoute["kind"] {
  return resolveClientTurnRoute(normalizeClientTurnRouteContext(ctx)).kind;
}

export { resolveClientTurnRoute };
