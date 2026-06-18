"use client";

import { getPersonalizationSessionId } from "@/lib/personalization/client-store";
import {
  buildUserActionMetadata,
  type UserActionEventKind,
  type UserActionMetadata,
} from "@/lib/personalization/action-metadata";
import type { ActionFamily, DomainFamily } from "@/lib/personalization/types";
import type { LinkRow } from "@/types/database";

export type TrackUserActionInput = {
  event: UserActionEventKind;
  link: LinkRow;
  actionKey: string;
  actionFamily: ActionFamily;
  domainFamily: DomainFamily;
  contextBin: string;
  routeMode?: string | null;
  metadata?: Partial<Omit<UserActionMetadata, "inferred" | "kernel_snapshot">>;
  updateProfile?: boolean;
};

function flushUserAction(body: Record<string, unknown>) {
  void fetch("/api/personalization/event", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    keepalive: true,
  }).catch(() => {
    // Non-blocking.
  });
}

export function trackUserAction(input: TrackUserActionInput) {
  const metadata = buildUserActionMetadata(input.link, input.metadata);

  flushUserAction({
    sessionId: getPersonalizationSessionId(),
    event: input.event,
    linkId: input.link.id,
    actionKey: input.actionKey,
    actionFamily: input.actionFamily,
    domain: input.link.domain,
    domainFamily: input.domainFamily,
    linkCategory: input.link.category,
    contextBin: input.contextBin,
    routeMode: input.routeMode ?? null,
    metadata,
    updateProfile: input.updateProfile ?? input.event === "click",
  });
}

export function trackReceiptDefer(input: {
  link: LinkRow;
  domainFamily: DomainFamily;
  contextBin: string;
  dwell_time_ms: number;
  time_to_action_ms: number;
}) {
  trackUserAction({
    event: "defer",
    link: input.link,
    actionKey: "receipt:true_cost",
    actionFamily: "done_close",
    domainFamily: input.domainFamily,
    contextBin: input.contextBin,
    metadata: {
      chip_id: "true_cost_receipt",
      dwell_time_ms: input.dwell_time_ms,
      time_to_action_ms: input.time_to_action_ms,
      receipt_visible: true,
      disposition: "defer",
    },
  });
}
