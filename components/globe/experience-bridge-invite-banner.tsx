"use client";

import { useState } from "react";
import { Users, X } from "lucide-react";
import { toast } from "sonner";
import { copy } from "@/lib/copy/human-ko";
import { completeBridgeInviteAccept } from "@/lib/experience-bridge/complete-bridge-invite-accept";
import {
  acceptExperienceBridgeRemote,
  declineExperienceBridgeRemote,
} from "@/lib/experience-bridge/experience-bridge-client";
import { writeLocalBridgeState } from "@/lib/experience-bridge/local-bridge-store";
import type { PendingBridgeInvite } from "@/hooks/use-pending-bridge-invites";
import { cn } from "@/lib/utils";

export type ExperienceBridgeInviteBannerProps = {
  invites: readonly PendingBridgeInvite[];
  onAccepted?: (eventId: string) => void;
  onDismiss?: (eventId: string) => void;
  className?: string;
};

/** Globe home — pending shared experience invite (accept / decline). */
export function ExperienceBridgeInviteBanner({
  invites,
  onAccepted,
  onDismiss,
  className,
}: ExperienceBridgeInviteBannerProps) {
  const [busyEventId, setBusyEventId] = useState<string | null>(null);

  if (invites.length === 0) {
    return null;
  }

  const primary = invites[0]!;
  const { bridge } = primary.state;
  const host = primary.state.participants.find((row) => row.role === "host");
  const hostName = host?.displayName?.trim() || copy.globe.bridgeInviteHostFallback;
  const overflow = invites.length - 1;

  const handleAccept = async () => {
    setBusyEventId(bridge.eventId);
    try {
      const data = await acceptExperienceBridgeRemote(bridge.eventId);
      await completeBridgeInviteAccept({
        state: data.state,
        peerThreadId: data.pinSpec.peerThreadId,
      });
      toast.success(copy.globe.bridgeInviteAccepted);
      onAccepted?.(bridge.eventId);
      onDismiss?.(bridge.eventId);
    } catch (caught) {
      toast.error(
        caught instanceof Error ? caught.message : copy.globe.bridgeInviteAcceptFail,
      );
    } finally {
      setBusyEventId(null);
    }
  };

  const handleDecline = async () => {
    setBusyEventId(bridge.eventId);
    try {
      const data = await declineExperienceBridgeRemote(bridge.eventId);
      writeLocalBridgeState(data.state);
      toast.message(copy.globe.bridgeInviteDeclined);
      onDismiss?.(bridge.eventId);
    } catch (caught) {
      toast.error(
        caught instanceof Error ? caught.message : copy.globe.bridgeInviteDeclineFail,
      );
    } finally {
      setBusyEventId(null);
    }
  };

  const busy = busyEventId === bridge.eventId;

  return (
    <div
      className={cn(
        "rounded-[1.15rem] border border-border bg-card/95 p-3.5 shadow-sm ring-1 ring-black/5 backdrop-blur-md",
        className,
      )}
      data-experience-bridge-invite-banner
      role="status"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-primary">
            {copy.globe.bridgeInviteEyebrow}
          </p>
          <p className="mt-0.5 text-[14px] font-semibold text-foreground">
            {copy.globe.bridgeInviteTitle(hostName, bridge.title)}
          </p>
          <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
            {copy.globe.bridgeInviteBody}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-foreground">
              <Users className="size-3" aria-hidden />
              {bridge.placeLabel || copy.globe.bridgeInvitePlaceFallback}
            </span>
            {overflow > 0 ? (
              <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                {copy.globe.bridgeInviteOverflow(overflow)}
              </span>
            ) : null}
          </div>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleAccept()}
              className="flex-1 rounded-xl bg-foreground px-3 py-2.5 text-[13px] font-semibold text-background shadow-sm disabled:opacity-60"
            >
              {copy.globe.bridgeInviteAcceptCta}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleDecline()}
              className="rounded-xl px-3 py-2.5 text-[13px] font-medium text-muted-foreground disabled:opacity-60"
            >
              {copy.globe.bridgeInviteDeclineCta}
            </button>
          </div>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() => onDismiss?.(bridge.eventId)}
          className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted/80 text-muted-foreground active:scale-95 disabled:opacity-60"
          aria-label={copy.globe.bridgeInviteDismissAria}
        >
          <X className="size-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}
